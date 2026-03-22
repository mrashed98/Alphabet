import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useHabitStore } from '../../stores/habitStore';
import { useNoteStore } from '../../stores/noteStore';
import { HeatmapDay } from '../../types';

const CELL_SIZE = 11;
const CELL_GAP = 2;

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { habits, logCompletion, undoCompletion, archiveHabit, fetchHeatmap } = useHabitStore();
  const { notes, fetch: fetchNotes } = useNoteStore();

  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(true);

  const habit = habits.find((h) => h.id === id);

  useFocusEffect(
    useCallback(() => {
      if (user && id) {
        fetchNotes(user.id, id);
        setHeatmapLoading(true);
        fetchHeatmap(id, user.id).then((days) => {
          setHeatmap(days);
          setHeatmapLoading(false);
        });
      }
    }, [user, id, fetchNotes, fetchHeatmap])
  );

  function handleToggle() {
    if (!user || !habit) return;
    if (habit.completedToday) {
      undoCompletion(habit.id, user.id);
    } else {
      logCompletion(habit.id, user.id);
    }
  }

  function handleArchive() {
    Alert.alert('Archive Habit', 'This habit will be hidden from your list. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          await archiveHabit(id!);
          router.back();
        },
      },
    ]);
  }

  if (!habit) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6366f1" />
      </View>
    );
  }

  const linkedNotes = notes.filter((n) => n.habit_id === id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.heroCard}>
        <View style={[styles.iconBadge, { backgroundColor: habit.color ?? '#6366f1' }]}>
          <Text style={styles.iconText}>{habit.icon ?? '⭐'}</Text>
        </View>
        <Text style={styles.habitTitle}>{habit.title}</Text>
        {habit.description ? (
          <Text style={styles.habitDesc}>{habit.description}</Text>
        ) : null}
        <Text style={styles.habitFreq}>
          {habit.frequency === 'daily'
            ? 'Every day'
            : `Weekly — ${formatTargetDays(habit.target_days)}`}
        </Text>

        {/* Check-in button */}
        <TouchableOpacity
          style={[styles.checkBtn, habit.completedToday && styles.checkBtnDone]}
          onPress={handleToggle}
        >
          <Text style={styles.checkBtnText}>
            {habit.completedToday ? '✓ Completed today' : 'Mark done today'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Streak stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{habit.streak ?? 0}</Text>
          <Text style={styles.statLabel}>🔥 Current streak</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{habit.longest_streak ?? 0}</Text>
          <Text style={styles.statLabel}>🏆 Longest streak</Text>
        </View>
      </View>

      {/* Heatmap */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last 52 Weeks</Text>
        {heatmapLoading ? (
          <ActivityIndicator color="#6366f1" style={{ marginTop: 12 }} />
        ) : (
          <HeatmapGrid days={heatmap} />
        )}
        <View style={styles.legend}>
          <View style={[styles.legendDot, { backgroundColor: '#e5e7eb' }]} />
          <Text style={styles.legendText}>None</Text>
          <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.legendText}>Done</Text>
          <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
          <Text style={styles.legendText}>Missed</Text>
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/notes/[id]', params: { id: 'new', habitId: id } })}
          >
            <Text style={styles.addNoteBtn}>+ Add</Text>
          </TouchableOpacity>
        </View>
        {linkedNotes.length === 0 ? (
          <Text style={styles.noNotes}>No notes linked to this habit yet.</Text>
        ) : (
          linkedNotes.map((note) => (
            <TouchableOpacity
              key={note.id}
              style={styles.noteCard}
              onPress={() => router.push({ pathname: '/notes/[id]', params: { id: note.id } })}
            >
              <Text style={styles.noteTitle} numberOfLines={1}>{note.title || 'Untitled'}</Text>
              {note.body ? (
                <Text style={styles.noteBody} numberOfLines={2}>{note.body}</Text>
              ) : null}
              <Text style={styles.noteDate}>{formatDate(note.updated_at)}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push({ pathname: '/habits/create', params: { id: habit.id } })}
        >
          <Text style={styles.editBtnText}>Edit Habit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.archiveBtn} onPress={handleArchive}>
          <Text style={styles.archiveBtnText}>Archive</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function HeatmapGrid({ days }: { days: HeatmapDay[] }) {
  // Build 52 columns × 7 rows
  const totalDays = days.length;
  const startDow = totalDays > 0 ? new Date(days[0].date).getDay() : 0;

  const cells: (HeatmapDay | null)[] = [
    ...Array(startDow).fill(null),
    ...days,
  ];

  const columns: (HeatmapDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    columns.push(cells.slice(i, i + 7));
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.heatmapScroll}>
      <View style={styles.heatmapGrid}>
        {columns.map((col, ci) => (
          <View key={ci} style={styles.heatmapCol}>
            {Array.from({ length: 7 }).map((_, ri) => {
              const cell = col[ri] ?? null;
              return (
                <View
                  key={ri}
                  style={[styles.heatmapCell, { backgroundColor: cellColor(cell?.status) }]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function cellColor(status?: string): string {
  if (status === 'completed') return '#22c55e';
  if (status === 'missed') return '#f97316';
  return '#e5e7eb';
}

function formatTargetDays(days: number[] | null): string {
  if (!days || days.length === 0) return 'All days';
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days.map((d) => names[d]).join(', ');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: { fontSize: 32 },
  habitTitle: { fontSize: 22, fontWeight: '700', color: '#1f2937', marginBottom: 6, textAlign: 'center' },
  habitDesc: { fontSize: 14, color: '#6b7280', marginBottom: 6, textAlign: 'center' },
  habitFreq: { fontSize: 13, color: '#9ca3af', marginBottom: 16 },
  checkBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  checkBtnDone: { backgroundColor: '#22c55e' },
  checkBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statNum: { fontSize: 32, fontWeight: '800', color: '#1f2937' },
  statLabel: { fontSize: 12, color: '#9ca3af', marginTop: 4, textAlign: 'center' },

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1f2937', marginBottom: 12 },
  addNoteBtn: { color: '#6366f1', fontWeight: '600', fontSize: 14 },

  heatmapScroll: { marginTop: 4 },
  heatmapGrid: { flexDirection: 'row', gap: CELL_GAP },
  heatmapCol: { flexDirection: 'column', gap: CELL_GAP },
  heatmapCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
  },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 11, color: '#6b7280', marginRight: 8 },

  noNotes: { color: '#9ca3af', fontSize: 14, fontStyle: 'italic' },
  noteCard: {
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  noteTitle: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 2 },
  noteBody: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  noteDate: { fontSize: 11, color: '#9ca3af' },

  actions: { flexDirection: 'row', gap: 12 },
  editBtn: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  editBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  archiveBtn: {
    flex: 1,
    backgroundColor: '#fee2e2',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  archiveBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },
});
