import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { Task, TaskStatus } from '../../types';

export default function TasksScreen() {
  const { user } = useAuthStore();
  const { tasks, loading, fetch, create, update } = useTaskStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    if (user) fetch(user.id);
  }, [user]);

  async function addTask() {
    if (!newTitle.trim() || !user) return;
    await create({ user_id: user.id, title: newTitle.trim(), status: 'todo', priority: 'medium', description: null, due_date: null, project_id: null, company_id: null });
    setNewTitle('');
    setShowAdd(false);
  }

  async function toggleDone(task: Task) {
    await update(task.id, { status: task.status === 'done' ? 'todo' : 'done' });
  }

  const active = tasks.filter((t) => t.status !== 'done');
  const done = tasks.filter((t) => t.status === 'done');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[...active, ...done]}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.taskCard} onPress={() => toggleDone(item)}>
            <View style={[styles.checkbox, item.status === 'done' && styles.checkboxDone]}>
              {item.status === 'done' && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={styles.taskContent}>
              <Text style={[styles.taskTitle, item.status === 'done' && styles.taskTitleDone]}>
                {item.title}
              </Text>
              {item.due_date && (
                <Text style={styles.taskMeta}>Due {item.due_date.split('T')[0]}</Text>
              )}
            </View>
            <View style={[styles.priorityBadge, priorityBg(item.priority)]}>
              <Text style={styles.priorityText}>{item.priority}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? <Text style={styles.empty}>Loading…</Text> : <Text style={styles.empty}>No tasks yet. Hit "+ Add" to create one.</Text>
        }
      />

      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Task</Text>
            <TextInput
              style={styles.input}
              placeholder="Task title"
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
              onSubmitEditing={addTask}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelBtn}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addTask}>
                <Text style={styles.saveBtnText}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function priorityBg(priority: string) {
  const colors: Record<string, string> = {
    critical: '#fee2e2', high: '#fed7aa', medium: '#fef9c3', low: '#dcfce7',
  };
  return { backgroundColor: colors[priority] ?? '#f3f4f6' };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#1f2937' },
  addBtn: { backgroundColor: '#6366f1', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxDone: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: 15, color: '#374151', fontWeight: '500' },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
  taskMeta: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  priorityBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  priorityText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 14, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#1f2937' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelBtn: { color: '#6b7280', fontSize: 16 },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
