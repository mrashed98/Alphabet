/**
 * send-due-notifications — Supabase Edge Function
 * LOG-26: API + notification scheduling
 *
 * Triggered by a pg_cron job every 5 minutes (see migration
 * 20260322060000_cron_send_due_notifications.sql).
 *
 * Responsibilities:
 *   1. Query scheduled_notifications for rows due (scheduled_for <= now()),
 *      not yet sent, not cancelled.
 *   2. Batch-send to Expo Push API.
 *   3. Mark sent rows with sent_at + expo_ticket_id.
 *   4. Log any Expo-level errors back to the row (stored in expo_ticket_id as
 *      "error:<message>" for easy debugging without a separate column).
 *
 * Invocation (manual or via pg_cron net.http_post):
 *   POST /send-due-notifications
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *
 * Environment variables required:
 *   SUPABASE_URL               — auto-injected
 *   SUPABASE_SERVICE_ROLE_KEY  — auto-injected
 *   EXPO_ACCESS_TOKEN          — optional; set in Supabase secrets if using
 *                                Expo's enhanced push security
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Supabase client (service role — bypasses RLS)
// ---------------------------------------------------------------------------
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScheduledNotification {
  id: string;
  user_id: string;
  linked_type: string;
  linked_id: string;
  label: string;
  title: string;
  body: string;
  scheduled_for: string;
  push_token: string | null;
}

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
  sound: "default";
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;      // present when status === "ok"
  message?: string; // present when status === "error"
  details?: { error?: string };
}

interface ExpoPushResponse {
  data: ExpoTicket[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Expo recommends max 100 messages per request. */
const EXPO_BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const sent = await sendDueNotifications();
    return new Response(
      JSON.stringify({ ok: true, sent }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[send-due-notifications] fatal error:", err);
    return new Response(
      `Internal error: ${(err as Error).message}`,
      { status: 500 },
    );
  }
});

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

async function sendDueNotifications(): Promise<number> {
  // Fetch all due, unsent, uncancelled notifications that have a push token
  const { data: rows, error } = await supabase
    .from("scheduled_notifications")
    .select("id, user_id, linked_type, linked_id, label, title, body, scheduled_for, push_token")
    .lte("scheduled_for", new Date().toISOString())
    .is("sent_at", null)
    .is("cancelled_at", null)
    .not("push_token", "is", null);

  if (error) throw error;
  if (!rows || rows.length === 0) return 0;

  const notifications = rows as ScheduledNotification[];
  console.log(`[send-due-notifications] ${notifications.length} notification(s) due.`);

  // Split into Expo-sized batches
  let totalSent = 0;
  for (let i = 0; i < notifications.length; i += EXPO_BATCH_SIZE) {
    const batch = notifications.slice(i, i + EXPO_BATCH_SIZE);
    totalSent += await processBatch(batch);
  }

  return totalSent;
}

async function processBatch(batch: ScheduledNotification[]): Promise<number> {
  // Build Expo messages
  const messages: ExpoMessage[] = batch.map((n) => ({
    to: n.push_token!,
    title: n.title,
    body: n.body,
    sound: "default",
    data: {
      linked_type: n.linked_type,
      linked_id: n.linked_id,
      label: n.label,
    },
  }));

  // Call Expo Push API
  const expoHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Accept-Encoding": "gzip, deflate",
  };

  const expoToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (expoToken) expoHeaders["Authorization"] = `Bearer ${expoToken}`;

  const expoRes = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: expoHeaders,
    body: JSON.stringify(messages),
  });

  if (!expoRes.ok) {
    const text = await expoRes.text();
    throw new Error(`Expo API HTTP ${expoRes.status}: ${text}`);
  }

  const { data: tickets }: ExpoPushResponse = await expoRes.json();

  // Update each row based on its ticket
  const now = new Date().toISOString();
  let sentCount = 0;

  const updates = tickets.map((ticket, idx) => {
    const notification = batch[idx];
    if (ticket.status === "ok") {
      sentCount++;
      return supabase
        .from("scheduled_notifications")
        .update({
          sent_at: now,
          expo_ticket_id: ticket.id ?? null,
          updated_at: now,
        })
        .eq("id", notification.id);
    } else {
      // Record the error in expo_ticket_id for observability
      const errMsg = ticket.message ?? ticket.details?.error ?? "unknown";
      console.warn(
        `[send-due-notifications] Expo error for notification ${notification.id}: ${errMsg}`,
      );
      return supabase
        .from("scheduled_notifications")
        .update({
          expo_ticket_id: `error:${errMsg}`,
          updated_at: now,
        })
        .eq("id", notification.id);
    }
  });

  // Run all updates in parallel — individual failures are non-fatal
  const results = await Promise.allSettled(updates.map((u) => u));
  results.forEach((result, idx) => {
    if (result.status === "rejected") {
      console.error(
        `[send-due-notifications] DB update failed for notification ${batch[idx].id}:`,
        result.reason,
      );
    }
  });

  return sentCount;
}
