import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { useHabitStore } from '../../stores/habitStore';

export default function TodayScreen() {
  const { user } = useAuthStore();
  const { tasks, fetch: fetchTasks } = useTaskStore();
  const { habits, fetch: fetchHabits, logCompletion, undoCompletion } = useHabitStore();

  useEffect(() => {
    if (user) {
      fetchTasks(user.id);
      fetchHabits(user.id);
    }
  }, [user]);

  const todayTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    const today = new Date().toISOString().split('T')[0];
    return t.due_date.startsWith(today) && t.status !== 'done';
  });

  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    const today = new Date().toISOString().split('T')[0];
    return t.due_date < today && t.status !== 'done';
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
          <Text style={styles.greeting}>Good {getTimeOfDay()}, {user?.email?.split('@')[0]}</Text>
        </View>

        {/* Habits */}
        <Section title="Habits">
          {habits.length === 0 ? (
            <EmptyState text="No habits yet. Add one in the Habits tab." />
          ) : (
            habits.map((h) => (
              <TouchableOpacity
                key={h.id}
                style={[styles.habitRow, h.completedToday && styles.habitDone]}
                onPress={() =>
                  h.completedToday
                    ? undoCompletion(h.id, user!.id)
                    : logCompletion(h.id, user!.id)
                }
              >
                <View style={styles.habitCheck}>
                  <Text style={styles.habitCheckText}>{h.completedToday ? '✓' : ''}</Text>
                </View>
                <Text style={[styles.habitTitle, h.completedToday && styles.habitTitleDone]}>
                  {h.title}
                </Text>
                {(h.streak ?? 0) > 0 && (
                  <Text style={styles.streak}>🔥 {h.streak}</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </Section>

        {/* Today's Tasks */}
        <Section title={`Today's Tasks (${todayTasks.length})`}>
          {todayTasks.length === 0 ? (
            <EmptyState text="No tasks due today." />
          ) : (
            todayTasks.map((t) => (
              <View key={t.id} style={styles.taskRow}>
                <View style={[styles.priorityDot, priorityColor(t.priority)]} />
                <Text style={styles.taskTitle}>{t.title}</Text>
              </View>
            ))
          )}
        </Section>

        {/* Overdue */}
        {overdueTasks.length > 0 && (
          <Section title={`Overdue (${overdueTasks.length})`}>
            {overdueTasks.map((t) => (
              <View key={t.id} style={[styles.taskRow, styles.overdueRow]}>
                <View style={[styles.priorityDot, priorityColor(t.priority)]} />
                <Text style={styles.taskTitle}>{t.title}</Text>
              </View>
            ))}
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function priorityColor(priority: string) {
  const colors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  };
  return { backgroundColor: colors[priority] ?? '#9ca3af' };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { paddingBottom: 32 },
  header: { padding: 24, paddingBottom: 8 },
  date: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  greeting: { fontSize: 26, fontWeight: '700', color: '#1f2937', marginTop: 4 },
  section: { marginHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  habitDone: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  habitCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  habitCheckText: { color: '#6366f1', fontSize: 13, fontWeight: '700' },
  habitTitle: { flex: 1, fontSize: 15, color: '#374151' },
  habitTitleDone: { color: '#16a34a' },
  streak: { fontSize: 13, fontWeight: '600', color: '#f97316' },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  overdueRow: { backgroundColor: '#fff7f7', borderColor: '#fecaca' },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  taskTitle: { fontSize: 15, color: '#374151', flex: 1 },
  emptyText: { fontSize: 14, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },
});
