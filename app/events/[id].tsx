import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useLifeEventStore } from '../../stores/lifeEventStore';
import { useAuthStore } from '../../stores/authStore';
import { LifeEventType } from '../../types';
import {
  scheduleLocalNotification,
  cancelNotification,
} from '../../hooks/useNotifications';

const EVENT_TYPES: { value: LifeEventType; label: string; emoji: string }[] = [
  { value: 'wedding', label: 'Wedding', emoji: '💒' },
  { value: 'anniversary', label: 'Anniversary', emoji: '💍' },
  { value: 'birthday', label: 'Birthday', emoji: '🎂' },
  { value: 'graduation', label: 'Graduation', emoji: '🎓' },
  { value: 'holiday', label: 'Holiday', emoji: '🌴' },
  { value: 'custom', label: 'Custom', emoji: '⭐' },
];

export default function LifeEventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { lifeEvents, update, remove } = useLifeEventStore();

  const event = lifeEvents.find((e) => e.id === id);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState<LifeEventType>('custom');
  const [recurring, setRecurring] = useState(false);
  const [notes, setNotes] = useState('');
  const [notify1Month, setNotify1Month] = useState(false);
  const [notify1Week, setNotify1Week] = useState(true);
  const [notify1Day, setNotify1Day] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setEventDate(event.event_date);
      setEventType(event.event_type);
      setRecurring(event.recurring);
      setNotes(event.notes ?? '');
      setNotify1Month(event.notify_1_month);
      setNotify1Week(event.notify_1_week);
      setNotify1Day(event.notify_1_day);
    }
  }, [event]);

  if (!event) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const typeInfo = EVENT_TYPES.find((t) => t.value === event.event_type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];

  const handleSave = async () => {
    if (!title.trim() || !eventDate.trim()) return;
    setSaving(true);
    await update(id, {
      title: title.trim(),
      event_date: eventDate.trim(),
      event_type: eventType,
      recurring,
      notes: notes.trim() || null,
      notify_1_month: notify1Month,
      notify_1_week: notify1Week,
      notify_1_day: notify1Day,
    });
    // Reschedule notifications
    await rescheduleNotifications(
      id,
      title.trim(),
      eventDate.trim(),
      notify1Month,
      notify1Week,
      notify1Day
    );
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Event', `Remove "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(id);
          router.back();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: event.title,
          headerRight: () => (
            <TouchableOpacity onPress={editing ? handleSave : () => setEditing(true)}>
              <Text style={styles.headerAction}>
                {editing ? (saving ? 'Saving…' : 'Save') : 'Edit'}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>{typeInfo.emoji}</Text>
            {!editing && (
              <>
                <Text style={styles.heroTitle}>{event.title}</Text>
                <Text style={styles.heroDate}>{formatDate(event.event_date)}</Text>
                {event.recurring && <Text style={styles.recurBadge}>↻ Recurring yearly</Text>}
              </>
            )}
          </View>

          {editing && (
            <>
              <View style={styles.section}>
                <Text style={styles.label}>Title</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Event title" autoFocus />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={eventDate}
                  onChangeText={setEventDate}
                  placeholder="YYYY-MM-DD"
                  keyboardType="numbers-and-punctuation"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.typeGrid}>
                  {EVENT_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.value}
                      style={[styles.typeChip, eventType === t.value && styles.typeChipSelected]}
                      onPress={() => setEventType(t.value)}
                    >
                      <Text style={styles.typeEmoji}>{t.emoji}</Text>
                      <Text style={[styles.typeLabel, eventType === t.value && styles.typeLabelSelected]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.row}>
                  <Text style={styles.rowLabel}>Recurring (yearly)</Text>
                  <Switch
                    value={recurring}
                    onValueChange={setRecurring}
                    trackColor={{ false: '#d1d5db', true: '#818cf8' }}
                    thumbColor={recurring ? '#6366f1' : '#f3f4f6'}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional notes…"
                  multiline
                />
              </View>
            </>
          )}

          {/* Notification toggles — visible in both view and edit */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>1 month before</Text>
              <Switch
                value={editing ? notify1Month : event.notify_1_month}
                onValueChange={editing ? setNotify1Month : undefined}
                disabled={!editing}
                trackColor={{ false: '#d1d5db', true: '#818cf8' }}
                thumbColor={(editing ? notify1Month : event.notify_1_month) ? '#6366f1' : '#f3f4f6'}
              />
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>1 week before</Text>
              <Switch
                value={editing ? notify1Week : event.notify_1_week}
                onValueChange={editing ? setNotify1Week : undefined}
                disabled={!editing}
                trackColor={{ false: '#d1d5db', true: '#818cf8' }}
                thumbColor={(editing ? notify1Week : event.notify_1_week) ? '#6366f1' : '#f3f4f6'}
              />
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>1 day before</Text>
              <Switch
                value={editing ? notify1Day : event.notify_1_day}
                onValueChange={editing ? setNotify1Day : undefined}
                disabled={!editing}
                trackColor={{ false: '#d1d5db', true: '#818cf8' }}
                thumbColor={(editing ? notify1Day : event.notify_1_day) ? '#6366f1' : '#f3f4f6'}
              />
            </View>
          </View>

          {!editing && event.notes && (
            <View style={styles.section}>
              <Text style={styles.label}>Notes</Text>
              <Text style={styles.notesText}>{event.notes}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete Event</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

/** Schedule (or reschedule) local notifications for a life event. */
async function rescheduleNotifications(
  eventId: string,
  title: string,
  dateStr: string,
  notify1Month: boolean,
  notify1Week: boolean,
  notify1Day: boolean
) {
  const eventDate = new Date(dateStr + 'T09:00:00');
  if (isNaN(eventDate.getTime())) return;

  const schedule = async (offsetDays: number, label: string) => {
    const trigger = new Date(eventDate);
    trigger.setDate(trigger.getDate() - offsetDays);
    if (trigger > new Date()) {
      await scheduleLocalNotification(
        title,
        label,
        trigger
      );
    }
  };

  if (notify1Month) await schedule(30, `Coming up in 1 month: ${title}`);
  if (notify1Week) await schedule(7, `Coming up in 1 week: ${title}`);
  if (notify1Day) await schedule(1, `Tomorrow: ${title}`);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerAction: { color: '#6366f1', fontSize: 16, fontWeight: '600', marginRight: 4 },
  hero: { alignItems: 'center', padding: 28, backgroundColor: '#fff', marginBottom: 8 },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#1f2937', textAlign: 'center' },
  heroDate: { fontSize: 15, color: '#6b7280', marginTop: 4 },
  recurBadge: { marginTop: 8, fontSize: 13, color: '#6366f1', fontWeight: '500' },
  section: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
  },
  typeChipSelected: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  typeEmoji: { fontSize: 16, marginRight: 4 },
  typeLabel: { fontSize: 13, color: '#6b7280' },
  typeLabelSelected: { color: '#6366f1', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb', marginTop: 2 },
  rowLabel: { fontSize: 15, color: '#374151' },
  notesText: { fontSize: 15, color: '#374151', lineHeight: 22 },
  deleteButton: {
    margin: 16,
    padding: 14,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
