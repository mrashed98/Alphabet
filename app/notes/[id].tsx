import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useNoteStore } from '../../stores/noteStore';
import { useHabitStore } from '../../stores/habitStore';

const FORMATTING_ACTIONS = [
  { label: 'B', wrap: '**', style: { fontWeight: '700' as const } },
  { label: 'I', wrap: '_', style: { fontStyle: 'italic' as const } },
  { label: '•', prefix: '- ', style: {} },
];

export default function NoteEditorScreen() {
  const { id, habitId: initHabitId } = useLocalSearchParams<{ id: string; habitId?: string }>();
  const isNew = id === 'new';
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { notes, create, update, remove } = useNoteStore();
  const { habits } = useHabitStore();

  const existing = isNew ? null : notes.find((n) => n.id === id);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [habitId, setHabitId] = useState<string | null>(
    existing?.habit_id ?? initHabitId ?? null
  );
  const [showHabitPicker, setShowHabitPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bodyRef, setBodyRef] = useState<TextInput | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: isNew ? 'New Note' : 'Edit Note' });
  }, [isNew]);

  async function handleSave() {
    if (!user) return;
    if (!title.trim() && !body.trim()) return;
    setSaving(true);

    if (isNew) {
      const created = await create({
        user_id: user.id,
        title: title.trim() || 'Untitled',
        body: body || null,
        habit_id: habitId,
        pinned: false,
        linked_task_id: null,
      });
      if (created) {
        router.replace({ pathname: '/notes/[id]', params: { id: created.id } });
      }
    } else {
      await update(id!, { title: title.trim() || 'Untitled', body: body || null, habit_id: habitId });
    }
    setSaving(false);
  }

  // Auto-save on back for editing
  useEffect(() => {
    if (!isNew && existing) {
      return navigation.addListener('beforeRemove', () => {
        handleSave();
      }) as () => void;
    }
  }, [title, body, habitId, isNew, handleSave, navigation, existing]);

  function handleDelete() {
    Alert.alert('Delete Note', 'This note will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!isNew && id) await remove(id);
          router.back();
        },
      },
    ]);
  }

  function insertFormatting(wrap: string, prefix?: string) {
    if (prefix) {
      setBody((b) => b + (b.endsWith('\n') || b === '' ? '' : '\n') + prefix);
    } else {
      setBody((b) => b + wrap + wrap);
    }
    bodyRef?.focus();
  }

  const linkedHabit = habits.find((h) => h.id === habitId);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <TextInput
          style={styles.titleInput}
          placeholder="Title"
          placeholderTextColor="#9ca3af"
          value={title}
          onChangeText={setTitle}
          returnKeyType="next"
          onSubmitEditing={() => bodyRef?.focus()}
          maxLength={120}
        />

        {/* Body */}
        <View style={styles.toolbar}>
          {FORMATTING_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.toolbarBtn}
              onPress={() => insertFormatting(action.wrap ?? '', action.prefix)}
            >
              <Text style={[styles.toolbarBtnText, action.style]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.toolbarSep} />
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => setShowHabitPicker(!showHabitPicker)}
          >
            <Text style={styles.toolbarBtnText}>🔥</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          ref={setBodyRef}
          style={styles.bodyInput}
          placeholder="Write your note…"
          placeholderTextColor="#9ca3af"
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
        />

        {/* Habit link */}
        {showHabitPicker && (
          <View style={styles.habitPicker}>
            <Text style={styles.habitPickerTitle}>Link to Habit</Text>
            <TouchableOpacity
              style={[styles.habitOption, habitId === null && styles.habitOptionActive]}
              onPress={() => { setHabitId(null); setShowHabitPicker(false); }}
            >
              <Text style={styles.habitOptionText}>None</Text>
            </TouchableOpacity>
            {habits.map((h) => (
              <TouchableOpacity
                key={h.id}
                style={[styles.habitOption, habitId === h.id && styles.habitOptionActive]}
                onPress={() => { setHabitId(h.id); setShowHabitPicker(false); }}
              >
                <Text style={styles.habitOptionText}>{h.icon ?? '⭐'} {h.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {linkedHabit && (
          <View style={styles.habitBadge}>
            <Text style={styles.habitBadgeText}>
              🔥 Linked to: {linkedHabit.icon ?? ''} {linkedHabit.title}
            </Text>
            <TouchableOpacity onPress={() => setHabitId(null)}>
              <Text style={styles.habitBadgeRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
          {!isNew && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Markdown hint */}
        <Text style={styles.hint}>
          Supports **bold**, _italic_, and - bullet lists
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 48 },

  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  toolbar: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
    gap: 4,
    alignItems: 'center',
  },
  toolbarBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  toolbarBtnText: { fontSize: 14, color: '#374151' },
  toolbarSep: { flex: 1 },

  bodyInput: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
    minHeight: 200,
  },

  habitPicker: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  habitPickerTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  habitOption: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  habitOptionActive: { backgroundColor: '#eef2ff' },
  habitOptionText: { fontSize: 14, color: '#1f2937' },

  habitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  habitBadgeText: { fontSize: 13, color: '#92400e', fontWeight: '600', flex: 1 },
  habitBadgeRemove: { color: '#92400e', fontSize: 16, paddingLeft: 8 },

  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  saveBtn: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteBtn: {
    flex: 1,
    backgroundColor: '#fee2e2',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 15 },

  hint: { fontSize: 11, color: '#d1d5db', textAlign: 'center', marginTop: 16 },
});
