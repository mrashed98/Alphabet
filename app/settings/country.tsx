import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useUserPreferencesStore } from '../../stores/userPreferencesStore';
import { COUNTRIES } from '../../lib/countries';

export default function CountryPickerScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { prefs, setCountry } = useUserPreferencesStore();
  const [saving, setSaving] = useState<string | null>(null); // code being saved

  const handleSelect = async (code: string) => {
    if (!user || saving || prefs?.country_code === code) return;
    setSaving(code);
    await setCountry(user.id, code);
    setSaving(null);
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Holiday Country' }} />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Text style={styles.subtitle}>
          Choose your country to show public holidays on the calendar.
        </Text>
        <FlatList
          data={COUNTRIES}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isSelected = prefs?.country_code === item.code;
            const isSaving = saving === item.code;
            return (
              <TouchableOpacity
                style={[styles.countryRow, isSelected && styles.countryRowSelected]}
                onPress={() => handleSelect(item.code)}
                activeOpacity={0.7}
                disabled={!!saving}
              >
                <Text style={styles.flag}>{item.flag}</Text>
                <View style={styles.countryText}>
                  <Text style={[styles.countryName, isSelected && styles.countryNameSelected]}>
                    {item.name}
                  </Text>
                  <Text style={styles.countryCode}>{item.code}</Text>
                </View>
                {isSaving ? (
                  <ActivityIndicator size="small" color="#6366f1" />
                ) : isSelected ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : null}
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  subtitle: { fontSize: 14, color: '#6b7280', marginHorizontal: 16, marginTop: 12, marginBottom: 8, lineHeight: 20 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  countryRowSelected: { backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#6366f1' },
  flag: { fontSize: 28 },
  countryText: { flex: 1 },
  countryName: { fontSize: 16, fontWeight: '500', color: '#1f2937' },
  countryNameSelected: { color: '#6366f1', fontWeight: '600' },
  countryCode: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  checkmark: { fontSize: 18, color: '#6366f1', fontWeight: '700' },
  separator: { height: 8 },
});
