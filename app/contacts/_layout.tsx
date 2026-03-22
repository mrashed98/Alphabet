import { Stack } from 'expo-router';

export default function ContactsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#6366f1',
        headerTitleStyle: { fontWeight: '600', color: '#1f2937' },
        headerBackTitle: 'Contacts',
      }}
    />
  );
}
