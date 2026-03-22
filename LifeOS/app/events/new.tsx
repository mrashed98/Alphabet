import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useLifeEventStore } from '../../stores/lifeEventStore';
import { useAuthStore } from '../../stores/authStore';
import { LifeEventType } from '../../types';
import { scheduleLocalNotification } from '../../hooks/useNotifications';

const EVENT_TYPES: { value: LifeEventType; label: string; emoji: string }[] = [
  { value: 'wedding', label: 'Wedding', emoji: '💒' },
  { value: 'anniversary', label: 'Anniversary', emoji: '💍' },
  { value: 'birthday', label: 'Birthday', emoji: '🎂' },
  { value: 'graduation', label: 'Graduation', emoji: '🎓' },
  { value: 'holiday', label: 'Holiday', emoji: '🌴' },
  { value: 'custom', label: 'Custom', emoji: '⭐' },
];

export default function NewLifeEventScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { create } = useLifeEventStore();

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventType, setEventType] = useState<LifeEventType>('custom');
  const [recurring, setRecurring] = useState(false);
  const [notes, setNotes] = useState('');
  const [notify1Month, setNotify1Month] = useState(false);
  const [notify1Week, setNotify1Week] = useState(true);
  const [notify1Day, setNotify1Day] = useState(true);
  const [saving, setSaving] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [dateError, setDateError] = useState('');

  const validate = (): boolean => {
    let valid = true;
    if (!title.trim()) { setTitleError('Title is required'); valid = false; }
    if (!eventDate.trim()) { setDateError('Date is required'); valid = false; }
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate.trim())) {
      setDateError('Use YYYY-MM-DD format');
      valid = false;
    }
    return valid;
  };

  const handleSave = async () => {
    if (!validate() || !user) return;
    setSaving(true);
    const newEvent = await create({
      user_id: user.id,
      title: title.trim(),
      event_date: eventDate.trim(),
      event_type: eventType,
      advance_days: notify1Week ? 7 : notify1Day ? 1 : 0,
      recurring,
      notes: notes.trim() || null,
      notify_1_month: notify1Month,
      notify_1_week: notify1Week,
      notify_1_day: notify1Day,
    });

    if (newEvent) {
      await scheduleNotificationsForEvent(newEvent.id, title.trim(), eventDate.trim(), notify1Month, notify1Week, notify1Day);
    }

    setSaving(false);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New Life Event' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
          <View style={styles.section}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={[styles.input, !!titleError && styles.inputError]}
              value={title}
              onChangeText={(v) => { setTitle(v); setTitleError(''); }}
              placeholder="e.g. Sarah & Tom's Wedding"
              autoFocus
            />
            {!!titleError && <Text style={styles.errorText}>{titleError}</Text>}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Date *</Text>
            <TextInput
              style={[styles.input, !!dateError && styles.inputError]}
              value={eventDate}
              onChangeText={(v) => { setEventDate(v); setDateError(''); }}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
            {!!dateError && <Text style={styles.errorText}>{dateError}</Text>}
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
              <View style={styles.rowTextGroup}>
                <Text style={styles.rowLabel}>Recurring (yearly)</Text>
                <Text style={styles.rowSub}>Auto-reschedule each year</Text>
              </View>
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Remind me</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>1 month before</Text>
              <Switch
                value={notify1Month}
                onValueChange={setNotify1Month}
                trackColor={{ false: '#d1d5db', true: '#818cf8' }}
                thumbColor={notify1Month ? '#6366f1' : '#f3f4f6'}
              />
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>1 week before</Text>
              <Switch
                value={notify1Week}
                onValueChange={setNotify1Week}
                trackColor={{ false: '#d1d5db', true: '#818cf8' }}
                thumbColor={notify1Week ? '#6366f1' : '#f3f4f6'}
              />
            </View>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>1 day before</Text>
              <Switch
                value={notify1Day}
                onValueChange={setNotify1Day}
                trackColor={{ false: '#d1d5db', true: '#818cf8' }}
                thumbColor={notify1Day ? '#6366f1' : '#f3f4f6'}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, (!title.trim() || !eventDate.trim() || saving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!title.trim() || !eventDate.trim() || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Event</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

async function scheduleNotificationsForEvent(
  eventId: string,
  title: string,
  dateStr: string,
  notify1Month: boolean,
  notify1Week: boolean,
  notify1Day: boolean
) {
  const eventDate = new Date(dateStr + 'T09:00:00');
  if (isNaN(eventDate.getTime())) return;

  const schedule = async (offsetDays: number, body: string) => {
    const trigger = new Date(eventDate);
    trigger.setDate(trigger.getDate() - offsetDays);
    if (trigger > new Date()) {
      await scheduleLocalNotification(title, body, trigger);
    }
  };

  if (notify1Month) await schedule(30, `Coming up in 1 month: ${title}`);
  if (notify1Week) await schedule(7, `Coming up in 1 week: ${title}`);
  if (notify1Day) await schedule(1, `Tomorrow: ${title}`);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
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
  inputError: { borderColor: '#ef4444' },
  errorText: { marginTop: 4, fontSize: 13, color: '#ef4444' },
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
  rowTextGroup: { flex: 1 },
  rowLabel: { fontSize: 15, color: '#374151' },
  rowSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  saveButton: {
    margin: 16,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
