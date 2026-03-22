import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useHabitStore } from '../../stores/habitStore';
import { supabase } from '../../lib/supabase';

export default function HabitsScreen() {
  const { user } = useAuthStore();
  const { habits, loading, fetch, logCompletion, undoCompletion } = useHabitStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    if (user) fetch(user.id);
  }, [user]);

  async function addHabit() {
    if (!newTitle.trim() || !user) return;
    await supabase.from('habits').insert({ user_id: user.id, title: newTitle.trim(), frequency: 'daily' });
    setNewTitle('');
    setShowAdd(false);
    fetch(user.id);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Habits</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
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
            onPress={() =>
              item.completedToday
                ? undoCompletion(item.id, user!.id)
                : logCompletion(item.id, user!.id)
            }
          >
            <View style={styles.cardLeft}>
              <View style={[styles.circle, item.completedToday && styles.circleDone]}>
                {item.completedToday && <Text style={styles.circleCheck}>✓</Text>}
              </View>
              <Text style={[styles.habitName, item.completedToday && styles.habitNameDone]}>
                {item.title}
              </Text>
            </View>
            <View style={styles.streakBox}>
              <Text style={styles.streakNum}>{item.streak ?? 0}</Text>
              <Text style={styles.streakLabel}>🔥 streak</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Loading…' : 'No habits yet. Add your first habit!'}
          </Text>
        }
      />

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New Habit</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Meditate, Exercise, Read"
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
              onSubmitEditing={addHabit}
            />
            <View style={styles.sheetButtons}>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Text style={styles.cancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.save} onPress={addHabit}>
                <Text style={styles.saveText}>Add Habit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#1f2937' },
  addBtn: { backgroundColor: '#6366f1', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  cardDone: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  circle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  circleDone: { backgroundColor: '#6366f1' },
  circleCheck: { color: '#fff', fontWeight: '800', fontSize: 16 },
  habitName: { fontSize: 16, fontWeight: '500', color: '#374151' },
  habitNameDone: { color: '#16a34a' },
  streakBox: { alignItems: 'center' },
  streakNum: { fontSize: 20, fontWeight: '700', color: '#f97316' },
  streakLabel: { fontSize: 11, color: '#9ca3af' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 14, fontStyle: 'italic' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#1f2937' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  sheetButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancel: { color: '#6b7280', fontSize: 16 },
  save: { backgroundColor: '#6366f1', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  saveText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
