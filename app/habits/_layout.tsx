import { Stack } from 'expo-router';

export default function HabitsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#6366f1',
        headerTitleStyle: { fontWeight: '700', color: '#1f2937' },
        headerShadowVisible: false,
      }}
    />
  );
}
