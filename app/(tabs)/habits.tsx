import { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useHabitStore } from '../../stores/habitStore';
import { Habit } from '../../types';

export default function HabitsScreen() {
  const { user } = useAuthStore();
  const { habits, loading, fetch, logCompletion, undoCompletion } = useHabitStore();
  const router = useRouter();

  useEffect(() => {
    if (user) fetch(user.id);
  }, [user]);

  function toggleHabit(item: Habit) {
    if (!user) return;
    if (item.completedToday) {
      undoCompletion(item.id, user.id);
    } else {
      logCompletion(item.id, user.id);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Habits</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/habits/create')}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={habits}
        keyExtractor={(h) => h.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, item.completedToday && styles.cardDone]}
            onPress={() => router.push(`/habits/${item.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.cardLeft}>
              <TouchableOpacity
                style={[styles.circle, item.completedToday && styles.circleDone]}
                onPress={() => toggleHabit(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {item.completedToday && <Text style={styles.circleCheck}>✓</Text>}
              </TouchableOpacity>
              <View style={styles.habitInfo}>
                <Text style={styles.habitIcon}>{item.icon ?? '⭐'}</Text>
                <Text
                  style={[styles.habitName, item.completedToday && styles.habitNameDone]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
              </View>
            </View>
            <View style={styles.streakBox}>
              <Text style={styles.streakNum}>{item.streak ?? 0}</Text>
              <Text style={styles.streakLabel}>🔥 streak</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyTitle}>
              {loading ? 'Loading…' : 'No habits yet'}
            </Text>
            {!loading && (
              <Text style={styles.emptySub}>{'Tap "+ Add" to create your first habit'}</Text>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1f2937' },
  addBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardDone: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  circleDone: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  circleCheck: { color: '#fff', fontWeight: '800', fontSize: 16 },
  habitInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  habitIcon: { fontSize: 20 },
  habitName: { fontSize: 16, fontWeight: '500', color: '#374151', flex: 1 },
  habitNameDone: { color: '#16a34a' },
  streakBox: { alignItems: 'center', minWidth: 48 },
  streakNum: { fontSize: 20, fontWeight: '700', color: '#f97316' },
  streakLabel: { fontSize: 11, color: '#9ca3af' },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});
