import { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useContactStore, daysUntilBirthday } from '../../stores/contactStore';
import { useAuthStore } from '../../stores/authStore';
import { Contact } from '../../types';

function DaysChip({ days }: { days: number | null }) {
  if (days === null) return null;
  const label = days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `${days}d`;
  const urgent = days <= 7;
  return (
    <View style={[styles.chip, urgent && styles.chipUrgent]}>
      <Text style={[styles.chipText, urgent && styles.chipTextUrgent]}>{label}</Text>
    </View>
  );
}

function ContactRow({ contact, onPress }: { contact: Contact; onPress: () => void }) {
  const days = daysUntilBirthday(contact.birthday);
  const initials = contact.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        {contact.photo_url ? (
          <Image source={{ uri: contact.photo_url }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{initials}</Text>
        )}
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{contact.name}</Text>
        {contact.birthday && (
          <Text style={styles.rowBirthday}>
            🎂 {formatBirthday(contact.birthday)}
          </Text>
        )}
      </View>
      <DaysChip days={days} />
    </TouchableOpacity>
  );
}

function formatBirthday(bday: string): string {
  const parts = bday.split('-');
  const month = parseInt(parts.length === 3 ? parts[1] : parts[0], 10);
  const day = parseInt(parts.length === 3 ? parts[2] : parts[1], 10);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${day}`;
}

export default function ContactsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { contacts, loading, fetch } = useContactStore();

  useEffect(() => {
    if (user) fetch(user.id);
  }, [user]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contacts</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/contacts/new')}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading && contacts.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyTitle}>No contacts yet</Text>
          <Text style={styles.emptySub}>Add a contact to track birthdays and life events.</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/contacts/new')}
          >
            <Text style={styles.emptyButtonText}>Add Contact</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            <ContactRow
              contact={item}
              onPress={() => router.push(`/contacts/${item.id}`)}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 44;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1f2937' },
  addButton: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#374151', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  avatarImage: { width: AVATAR_SIZE, height: AVATAR_SIZE },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#6366f1' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  rowBirthday: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  chip: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipUrgent: { backgroundColor: '#fef3c7' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  chipTextUrgent: { color: '#d97706' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#e5e7eb', marginLeft: 72 },
});
