import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) {
        setExpoPushToken(token);
        setPermissionGranted(true);
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Notification received while app is in foreground — handle if needed
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      // User tapped notification — handle deep link navigation if needed
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return { expoPushToken, permissionGranted };
}

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

/** Schedule a local notification at a given date. Returns the notification ID. */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Date
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
  });
}

/** Cancel a previously scheduled notification by ID. */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
