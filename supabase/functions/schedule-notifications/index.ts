/**
 * schedule-notifications — Supabase Edge Function
 * LOG-26: API + notification scheduling
 *
 * Invocation methods:
 *   A) Supabase Database Webhook on INSERT/UPDATE/DELETE of `contacts` or `life_events`
 *      (configure via Supabase Dashboard → Database → Webhooks, or via SQL below)
 *   B) Direct call from the mobile app after saving an entity
 *
 * Expected request body (Database Webhook format):
 * {
 *   type: "INSERT" | "UPDATE" | "DELETE",
 *   table: "contacts" | "life_events",
 *   record: { ... } | null,   // new row (null on DELETE)
 *   old_record: { ... } | null // old row (null on INSERT)
 * }
 *
 * On INSERT/UPDATE: compute slots, upsert rows into scheduled_notifications.
 * On DELETE:        cancel all pending scheduled_notifications for the entity.
 *
 * SQL to register webhooks (run once in Supabase SQL editor):
 * ─────────────────────────────────────────────────────────────────────────────
 *   select supabase_functions.http_request(
 *     'http://supabase_functions_relay:9000/schedule-notifications',
 *     'POST', '{"Content-Type":"application/json"}', '{}', '5000'
 *   );
 * Use the Supabase Dashboard Webhooks UI instead for production:
 *   Table: contacts  — events: insert, update, delete
 *   Table: life_events — events: insert, update, delete
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  contactNotificationSlots,
  lifeEventNotificationSlots,
  nextAnnualOccurrence,
  type ScheduledSlot,
} from "../_shared/notification-times.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: {
    type: "INSERT" | "UPDATE" | "DELETE";
    table: "contacts" | "life_events";
    record: Record<string, unknown> | null;
    old_record: Record<string, unknown> | null;
  };

  try {
    payload = await req.json();
  } catch {
    return new Response("Bad Request: invalid JSON", { status: 400 });
  }

  const { type, table, record, old_record } = payload;

  if (!["contacts", "life_events"].includes(table)) {
    return new Response("Ignored: unrecognised table", { status: 200 });
  }

  try {
    if (type === "DELETE") {
      const entityId = (old_record?.id ?? record?.id) as string;
      if (entityId) await cancelNotifications(entityId, table);
    } else {
      // INSERT or UPDATE — (re-)schedule notifications
      if (!record) return new Response("Missing record", { status: 400 });
      await scheduleForEntity(table, record);
    }
  } catch (err) {
    console.error("[schedule-notifications] error:", err);
    return new Response(`Internal error: ${(err as Error).message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

async function cancelNotifications(
  linkedId: string,
  table: "contacts" | "life_events",
): Promise<void> {
  const linkedType = table === "contacts" ? "contact_birthday" : "life_event";
  const { error } = await supabase
    .from("scheduled_notifications")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("linked_id", linkedId)
    .eq("linked_type", linkedType)
    .is("sent_at", null)
    .is("cancelled_at", null);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

async function scheduleForEntity(
  table: "contacts" | "life_events",
  record: Record<string, unknown>,
): Promise<void> {
  const userId = record.user_id as string;
  const entityId = record.id as string;

  // Fetch user's notification preferences (quiet hours + enabled flags)
  const { data: prefs, error: prefsErr } = await supabase
    .from("notification_preferences")
    .select("birthdays_enabled, life_events_enabled, quiet_hours_start, quiet_hours_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (prefsErr) throw prefsErr;

  const quietStart = (prefs?.quiet_hours_start as string) ?? null;
  const quietEnd = (prefs?.quiet_hours_end as string) ?? null;

  // Fetch user's push token from user_preferences
  const { data: userPrefs, error: upErr } = await supabase
    .from("user_preferences")
    .select("push_token")
    .eq("user_id", userId)
    .maybeSingle();

  if (upErr) throw upErr;
  const pushToken = (userPrefs?.push_token as string) ?? null;

  let slots: ScheduledSlot[];
  let linkedType: string;
  let baseTitle: string;

  if (table === "contacts") {
    const enabled = prefs?.birthdays_enabled ?? true;
    if (!enabled) {
      // Preferences say no — cancel any existing and skip
      await cancelNotifications(entityId, table);
      return;
    }

    const birthday = record.birthday as string | null;
    if (!birthday) return; // No birthday set yet

    const nextOccurrence = nextAnnualOccurrence(birthday);
    const contactName = record.name as string;
    linkedType = "contact_birthday";
    baseTitle = `${contactName}'s Birthday`;

    slots = contactNotificationSlots({
      birthday: nextOccurrence,
      quietStart,
      quietEnd,
    });
  } else {
    // life_events
    const enabled = prefs?.life_events_enabled ?? true;
    if (!enabled) {
      await cancelNotifications(entityId, table);
      return;
    }

    const eventDate = record.event_date as string;
    if (!eventDate) return;

    // For recurring events, use next annual occurrence; otherwise use the event date as-is
    const recurring = record.recurring as boolean;
    const nextOccurrence = recurring
      ? nextAnnualOccurrence(eventDate)
      : eventDate;

    // Only schedule if the event is in the future
    if (new Date(`${nextOccurrence}T00:00:00Z`) <= new Date()) {
      await cancelNotifications(entityId, table);
      return;
    }

    linkedType = "life_event";
    baseTitle = record.title as string;

    slots = lifeEventNotificationSlots({
      eventDate: nextOccurrence,
      notify1Month: (record.notify_1_month as boolean) ?? false,
      notify1Week: (record.notify_1_week as boolean) ?? true,
      notify1Day: (record.notify_1_day as boolean) ?? true,
      quietStart,
      quietEnd,
    });
  }

  if (slots.length === 0) {
    // All slots in the past — cancel stale rows
    await cancelNotifications(entityId, table);
    return;
  }

  // First, cancel rows whose labels are no longer in the new slot list
  // (handles edit that disables a toggle or shifts the date)
  const newLabels = slots.map((s) => s.label);
  const { error: cancelOldErr } = await supabase
    .from("scheduled_notifications")
    .update({ cancelled_at: new Date().toISOString() })
    .eq("linked_id", entityId)
    .eq("linked_type", linkedType)
    .not("label", "in", `(${newLabels.join(",")})`)
    .is("sent_at", null)
    .is("cancelled_at", null);

  if (cancelOldErr) throw cancelOldErr;

  // Upsert active slots
  const rows = slots.map((slot) => ({
    user_id: userId,
    linked_type: linkedType,
    linked_id: entityId,
    label: slot.label,
    title: baseTitle,
    body: labelToBody(slot.label, baseTitle),
    scheduled_for: slot.scheduledFor.toISOString(),
    push_token: pushToken,
    cancelled_at: null,   // un-cancel if previously cancelled and re-created
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertErr } = await supabase
    .from("scheduled_notifications")
    .upsert(rows, { onConflict: "linked_id,label" });

  if (upsertErr) throw upsertErr;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function labelToBody(label: string, title: string): string {
  switch (label) {
    case "T-1month": return `${title} is one month away.`;
    case "T-7d": return `${title} is one week away.`;
    case "T-1d": return `${title} is tomorrow.`;
    case "day-of": return `Today is ${title}!`;
    default: return title;
  }
}
