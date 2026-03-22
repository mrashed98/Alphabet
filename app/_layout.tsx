import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

const PERM_ASKED_KEY = 'lifeos_notification_permission_asked';

export default function RootLayout() {
  const { session, loading, setSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const [showPermModal, setShowPermModal] = useState(false);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Navigation guard
  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  // First-launch notification permission prompt
  useEffect(() => {
    if (!session) return;
    (async () => {
      const alreadyAsked = await AsyncStorage.getItem(PERM_ASKED_KEY);
      if (alreadyAsked) return;
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        setShowPermModal(true);
      } else {
        await AsyncStorage.setItem(PERM_ASKED_KEY, 'true');
        await setupAndroidChannels();
      }
    })();
  }, [session]);

  // Deep-link handler: notification tap → navigate to correct detail screen
  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (!data) return;
      if (data.type === 'life_event' && data.id) {
        router.push(`/events/${data.id}`);
      } else if (data.type === 'contact' && data.id) {
        router.push(`/contacts/${data.id}`);
      }
    });
    return () => responseListener.current?.remove();
  }, []);

  const handleRequestPermission = async () => {
    await setupAndroidChannels();
    const { status } = await Notifications.requestPermissionsAsync();
    await AsyncStorage.setItem(PERM_ASKED_KEY, 'true');
    setShowPermModal(false);
    // Graceful degradation: app continues regardless of permission outcome
  };

  const handleSkipPermission = async () => {
    await AsyncStorage.setItem(PERM_ASKED_KEY, 'true');
    setShowPermModal(false);
  };

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />

      {/* First-launch notification permission modal */}
      <Modal
        visible={showPermModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🔔</Text>
            <Text style={styles.modalTitle}>Stay on top of what matters</Text>
            <Text style={styles.modalBody}>
              LifeOS can remind you about birthdays, anniversaries, and life events—so you never miss a moment.
            </Text>
            <TouchableOpacity style={styles.modalPrimary} onPress={handleRequestPermission}>
              <Text style={styles.modalPrimaryText}>Enable Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSecondary} onPress={handleSkipPermission}>
              <Text style={styles.modalSecondaryText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

async function setupAndroidChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('birthdays', {
    name: 'Birthdays',
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync('life-events', {
    name: 'Life Events',
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.setNotificationChannelAsync('tasks', {
    name: 'Tasks',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalEmoji: { fontSize: 52, marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1f2937', textAlign: 'center', marginBottom: 10 },
  modalBody: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  modalPrimary: {
    width: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  modalPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalSecondary: { padding: 10 },
  modalSecondaryText: { color: '#9ca3af', fontSize: 15 },
});
