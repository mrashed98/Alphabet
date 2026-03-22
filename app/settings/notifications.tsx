import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationPreferencesStore } from '../../stores/notificationPreferencesStore';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function hourLabel(h: number): string {
  if (h === 0) return '12 am';
  if (h === 12) return '12 pm';
  return h < 12 ? `${h} am` : `${h - 12} pm`;
}

function HourPicker({ value, onChange }: { value: number; onChange: (h: number) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourPicker}>
      {HOURS.map((h) => (
        <TouchableOpacity
          key={h}
          style={[styles.hourChip, value === h && styles.hourChipActive]}
          onPress={() => onChange(h)}
        >
          <Text style={[styles.hourChipText, value === h && styles.hourChipTextActive]}>
            {hourLabel(h)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

export default function NotificationSettingsScreen() {
  const { user } = useAuthStore();
  const { prefs, loading, fetch, save } = useNotificationPreferencesStore();

  const [permGranted, setPermGranted] = useState<boolean | null>(null);
  const [birthdaysEnabled, setBirthdaysEnabled] = useState(true);
  const [lifeEventsEnabled, setLifeEventsEnabled] = useState(true);
  const [tasksEnabled, setTasksEnabled] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(8);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetch(user.id);
    Notifications.getPermissionsAsync().then(({ status }) => setPermGranted(status === 'granted'));
  }, [user]);

  // Hydrate from store once loaded
  useEffect(() => {
    if (!prefs) return;
    setBirthdaysEnabled(prefs.birthdays_enabled);
    setLifeEventsEnabled(prefs.life_events_enabled);
    setTasksEnabled(prefs.tasks_enabled);
    if (prefs.quiet_hours_start) {
      setQuietHoursEnabled(true);
      setQuietStart(parseInt(prefs.quiet_hours_start.split(':')[0], 10));
    }
    if (prefs.quiet_hours_end) {
      setQuietEnd(parseInt(prefs.quiet_hours_end.split(':')[0], 10));
    }
  }, [prefs]);

  const handleRequestPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setPermGranted(status === 'granted');
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Enable notifications in your device Settings to receive reminders.');
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await save(user.id, {
      birthdays_enabled: birthdaysEnabled,
      life_events_enabled: lifeEventsEnabled,
      tasks_enabled: tasksEnabled,
      quiet_hours_start: quietHoursEnabled ? `${quietStart.toString().padStart(2, '0')}:00` : null,
      quiet_hours_end: quietHoursEnabled ? `${quietEnd.toString().padStart(2, '0')}:00` : null,
    });
    setSaving(false);
  };

  if (loading && !prefs) {
    return (
      <>
        <Stack.Screen options={{ title: 'Notifications' }} />
        <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Permission banner */}
          {permGranted === false && (
            <TouchableOpacity style={styles.permBanner} onPress={handleRequestPermission}>
              <Text style={styles.permBannerIcon}>🔔</Text>
              <View style={styles.permBannerText}>
                <Text style={styles.permBannerTitle}>Notifications disabled</Text>
                <Text style={styles.permBannerSub}>Tap to enable so reminders can reach you.</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Notification types */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Notify me about</Text>
            <View style={styles.card}>
              <ToggleRow
                icon="🎂"
                label="Birthdays"
                sub="Get reminded before contacts' birthdays"
                value={birthdaysEnabled}
                onChange={setBirthdaysEnabled}
              />
              <ToggleRow
                icon="🎉"
                label="Life Events"
                sub="Weddings, anniversaries, and more"
                value={lifeEventsEnabled}
                onChange={setLifeEventsEnabled}
              />
              <ToggleRow
                icon="✅"
                label="Task Due Dates"
                sub="Remind me when tasks are due"
                value={tasksEnabled}
                onChange={setTasksEnabled}
                isLast
              />
            </View>
          </View>

          {/* Quiet hours */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Quiet Hours</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowIcon}>🌙</Text>
                  <View>
                    <Text style={styles.rowLabel}>Enable quiet hours</Text>
                    <Text style={styles.rowSub}>No notifications during this window</Text>
                  </View>
                </View>
                <Switch
                  value={quietHoursEnabled}
                  onValueChange={setQuietHoursEnabled}
                  trackColor={{ false: '#d1d5db', true: '#818cf8' }}
                  thumbColor={quietHoursEnabled ? '#6366f1' : '#f3f4f6'}
                />
              </View>

              {quietHoursEnabled && (
                <>
                  <View style={styles.cardDivider} />
                  <View style={styles.cardPadded}>
                    <Text style={styles.pickerLabel}>Start time</Text>
                    <HourPicker value={quietStart} onChange={setQuietStart} />
                    <Text style={[styles.pickerLabel, { marginTop: 12 }]}>End time</Text>
                    <HourPicker value={quietEnd} onChange={setQuietEnd} />
                  </View>
                </>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function ToggleRow({
  icon, label, sub, value, onChange, isLast = false,
}: {
  icon: string;
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.cardRow, !isLast && styles.cardRowBorder]}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.rowSub}>{sub}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#d1d5db', true: '#818cf8' }}
        thumbColor={value ? '#6366f1' : '#f3f4f6'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 40 },

  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    borderLeftWidth: 4,
    borderLeftColor: '#f97316',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  permBannerIcon: { fontSize: 24 },
  permBannerText: { flex: 1 },
  permBannerTitle: { fontSize: 14, fontWeight: '600', color: '#92400e' },
  permBannerSub: { fontSize: 12, color: '#b45309', marginTop: 2 },

  section: { marginTop: 24, marginHorizontal: 16 },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  cardRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f4f6' },
  cardDivider: { height: StyleSheet.hairlineWidth, backgroundColor: '#f3f4f6' },
  cardPadded: { padding: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowIcon: { fontSize: 20 },
  rowLabel: { fontSize: 15, color: '#1f2937', fontWeight: '500' },
  rowSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  pickerLabel: { fontSize: 12, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  hourPicker: { gap: 6, paddingBottom: 4 },
  hourChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f3f4f6' },
  hourChipActive: { backgroundColor: '#6366f1' },
  hourChipText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  hourChipTextActive: { color: '#fff', fontWeight: '600' },

  saveButton: { margin: 16, marginTop: 28, backgroundColor: '#6366f1', borderRadius: 14, padding: 16, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
