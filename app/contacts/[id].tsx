import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useContactStore, daysUntilBirthday } from '../../stores/contactStore';
import { useLifeEventStore } from '../../stores/lifeEventStore';
import { useAuthStore } from '../../stores/authStore';
import { LifeEvent } from '../../types';

function LifeEventRow({ event, onPress }: { event: LifeEvent; onPress: () => void }) {
  const typeEmoji: Record<string, string> = {
    birthday: '🎂', anniversary: '💍', wedding: '💒', holiday: '🌴', custom: '⭐',
  };
  return (
    <TouchableOpacity style={styles.eventRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.eventEmoji}>{typeEmoji[event.event_type] ?? '⭐'}</Text>
      <View style={styles.eventInfo}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventDate}>{formatDate(event.event_date)}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { contacts, update, remove } = useContactStore();
  const { lifeEvents, fetch: fetchEvents } = useLifeEventStore();

  const contact = contacts.find((c) => c.id === id);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(contact?.name ?? '');
  const [birthday, setBirthday] = useState(contact?.birthday ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchEvents(user.id);
  }, [user]);

  if (!contact) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  const days = daysUntilBirthday(contact.birthday);
  const initials = contact.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await update(id, {
      name: name.trim(),
      birthday: birthday.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
    });
    setSaving(false);
    setEditing(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Contact', `Remove ${contact.name}?`, [
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
          title: contact.name,
          headerRight: () => (
            <TouchableOpacity onPress={editing ? handleSave : () => setEditing(true)}>
              <Text style={styles.headerAction}>{editing ? (saving ? 'Saving…' : 'Save') : 'Edit'}</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarLarge}>
            {contact.photo_url ? (
              <Image source={{ uri: contact.photo_url }} style={styles.avatarLargeImage} />
            ) : (
              <Text style={styles.avatarLargeText}>{initials}</Text>
            )}
          </View>
          {days !== null && (
            <View style={[styles.chip, days <= 7 && styles.chipUrgent]}>
              <Text style={[styles.chipText, days <= 7 && styles.chipTextUrgent]}>
                {days === 0 ? '🎂 Birthday today!' : days === 1 ? '🎂 Birthday tomorrow!' : `🎂 Birthday in ${days} days`}
              </Text>
            </View>
          )}
        </View>

        {/* Fields */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Name</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              autoFocus
            />
          ) : (
            <Text style={styles.fieldValue}>{contact.name}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Birthday</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={birthday}
              onChangeText={setBirthday}
              placeholder="MM-DD or YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
          ) : (
            <Text style={styles.fieldValue}>
              {contact.birthday ? formatBirthdayDisplay(contact.birthday) : '—'}
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Email</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          ) : (
            <Text style={styles.fieldValue}>{contact.email ?? '—'}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Phone</Text>
          {editing ? (
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555 000 0000"
              keyboardType="phone-pad"
            />
          ) : (
            <Text style={styles.fieldValue}>{contact.phone ?? '—'}</Text>
          )}
        </View>

        {/* Life events for this contact (matching by name prefix as best-effort) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>Life Events</Text>
            <TouchableOpacity onPress={() => router.push('/events/new')}>
              <Text style={styles.sectionAdd}>+ Add</Text>
            </TouchableOpacity>
          </View>
          {lifeEvents.length === 0 ? (
            <Text style={styles.emptyText}>No life events yet.</Text>
          ) : (
            lifeEvents.map((e) => (
              <LifeEventRow key={e.id} event={e} onPress={() => router.push(`/events/${e.id}`)} />
            ))
          )}
        </View>

        {/* Delete */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Contact</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

function formatBirthdayDisplay(bday: string): string {
  const parts = bday.split('-');
  const month = parseInt(parts.length === 3 ? parts[1] : parts[0], 10);
  const day = parseInt(parts.length === 3 ? parts[2] : parts[1], 10);
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[month - 1]} ${day}`;
}

const AVATAR_LARGE = 80;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerAction: { color: '#6366f1', fontSize: 16, fontWeight: '600', marginRight: 4 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#fff', marginBottom: 8 },
  avatarLarge: {
    width: AVATAR_LARGE,
    height: AVATAR_LARGE,
    borderRadius: AVATAR_LARGE / 2,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatarLargeImage: { width: AVATAR_LARGE, height: AVATAR_LARGE },
  avatarLargeText: { fontSize: 28, fontWeight: '700', color: '#6366f1' },
  chip: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  chipUrgent: { backgroundColor: '#fef3c7' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  chipTextUrgent: { color: '#d97706' },
  section: { backgroundColor: '#fff', padding: 16, marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  sectionAdd: { color: '#6366f1', fontSize: 14, fontWeight: '600' },
  fieldValue: { fontSize: 16, color: '#1f2937' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  emptyText: { fontSize: 14, color: '#9ca3af' },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  eventEmoji: { fontSize: 20, marginRight: 10 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  eventDate: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  chevron: { fontSize: 20, color: '#d1d5db' },
  deleteButton: {
    margin: 16,
    padding: 14,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
