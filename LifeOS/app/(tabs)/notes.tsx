import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useNoteStore } from '../../stores/noteStore';
import { useHabitStore } from '../../stores/habitStore';
import { Note } from '../../types';

export default function NotesScreen() {
  const { user } = useAuthStore();
  const { notes, loading, fetch, togglePin, remove } = useNoteStore();
  const { habits } = useHabitStore();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [habitFilter, setHabitFilter] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user) fetch(user.id, habitFilter);
    }, [user, habitFilter, fetch])
  );

  const filtered = notes.filter((n) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || (n.body ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  function habitName(habitId: string | null): string | null {
    if (!habitId) return null;
    return habits.find((h) => h.id === habitId)?.title ?? null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notes</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push({ pathname: '/notes/[id]', params: { id: 'new' } })}
        >
          <Text style={styles.addBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes…"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Habit filter chips */}
      {habits.length > 0 && (
        <FlatList
          horizontal
          data={[null, ...habits.map((h) => h.id)]}
          keyExtractor={(item) => item ?? '__all__'}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          renderItem={({ item }) => {
            const label = item === null ? 'All' : (habitName(item) ?? item);
            const active = habitFilter === item;
            return (
              <TouchableOpacity
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setHabitFilter(item)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <FlatList
        data={filtered}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            habitLabel={habitName(item.habit_id)}
            onPress={() => router.push({ pathname: '/notes/[id]', params: { id: item.id } })}
            onPin={() => togglePin(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>{loading ? 'Loading…' : 'No notes yet'}</Text>
            {!loading && (
              <Text style={styles.emptySub}>{'Tap "+ New" to write your first note'}</Text>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

function NoteCard({
  note,
  habitLabel,
  onPress,
  onPin,
}: {
  note: Note;
  habitLabel: string | null;
  onPress: () => void;
  onPin: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {note.title || 'Untitled'}
        </Text>
        <TouchableOpacity onPress={onPin} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.pinIcon, note.pinned && styles.pinIconActive]}>📌</Text>
        </TouchableOpacity>
      </View>
      {note.body ? (
        <Text style={styles.cardBody} numberOfLines={2}>{note.body}</Text>
      ) : null}
      <View style={styles.cardMeta}>
        {habitLabel ? (
          <View style={styles.habitChip}>
            <Text style={styles.habitChipText}>🔥 {habitLabel}</Text>
          </View>
        ) : null}
        <Text style={styles.cardDate}>{formatDate(note.updated_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1f2937' },
  addBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  searchRow: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1f2937',
  },

  chips: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  chipTextActive: { color: '#6366f1', fontWeight: '700' },

  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937', flex: 1, marginRight: 8 },
  pinIcon: { fontSize: 16, opacity: 0.3 },
  pinIconActive: { opacity: 1 },
  cardBody: { fontSize: 13, color: '#6b7280', lineHeight: 18, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  habitChip: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  habitChipText: { fontSize: 11, color: '#92400e', fontWeight: '600' },
  cardDate: { fontSize: 11, color: '#9ca3af' },

  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});
