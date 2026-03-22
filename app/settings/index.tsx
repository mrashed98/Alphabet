import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useUserPreferencesStore } from '../../stores/userPreferencesStore';
import { COUNTRIES } from '../../lib/countries';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { prefs } = useUserPreferencesStore();

  const countryName = prefs?.country_code
    ? COUNTRIES.find((c) => c.code === prefs.country_code)?.name ?? prefs.country_code
    : 'Not set';

  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Account */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Account</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Email</Text>
                <Text style={styles.rowValue}>{user?.email ?? '—'}</Text>
              </View>
            </View>
          </View>

          {/* Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Notifications</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.row, styles.rowTappable]}
                onPress={() => router.push('/settings/notifications' as never)}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowIcon}>🔔</Text>
                  <Text style={styles.rowLabel}>Notification Preferences</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Calendar */}
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Calendar</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.row, styles.rowTappable]}
                onPress={() => router.push('/settings/country' as never)}
              >
                <View style={styles.rowLeft}>
                  <Text style={styles.rowIcon}>🌍</Text>
                  <Text style={styles.rowLabel}>Holiday Country</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowValue}>{countryName}</Text>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign out */}
          <View style={styles.section}>
            <View style={styles.card}>
              <TouchableOpacity style={[styles.row, styles.rowTappable]} onPress={signOut}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowIcon}>🚪</Text>
                  <Text style={[styles.rowLabel, styles.dangerText]}>Sign Out</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { paddingBottom: 40 },
  section: { marginTop: 24, marginHorizontal: 16 },
  sectionHeader: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f4f6' },
  rowTappable: { activeOpacity: 0.7 } as never,
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowIcon: { fontSize: 20 },
  rowLabel: { fontSize: 15, color: '#1f2937' },
  rowValue: { fontSize: 14, color: '#6b7280' },
  chevron: { fontSize: 20, color: '#d1d5db', fontWeight: '300' },
  dangerText: { color: '#ef4444' },
});
