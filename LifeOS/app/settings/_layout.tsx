import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#6366f1',
        headerTitleStyle: { fontWeight: '600', color: '#1f2937' },
      }}
    />
  );
}
