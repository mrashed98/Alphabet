import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useHabitStore } from '../../stores/habitStore';
import { HabitFrequency } from '../../types';

const EMOJI_OPTIONS = ['⭐', '🏃', '💪', '📚', '🧘', '💧', '🍎', '😴', '✍️', '🎯', '🎸', '🌿'];
const COLOR_OPTIONS = [
  '#6366f1', '#ec4899', '#f97316', '#22c55e', '#14b8a6',
  '#3b82f6', '#a855f7', '#ef4444', '#84cc16', '#f59e0b',
];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function HabitCreateScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { habits, createHabit, updateHabit } = useHabitStore();

  const existing = isEditing ? habits.find((h) => h.id === id) : null;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [frequency, setFrequency] = useState<HabitFrequency>(existing?.frequency ?? 'daily');
  const [targetDays, setTargetDays] = useState<number[]>(existing?.target_days ?? [1, 2, 3, 4, 5]);
  const [icon, setIcon] = useState(existing?.icon ?? '⭐');
  const [color, setColor] = useState(existing?.color ?? '#6366f1');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Habit' : 'New Habit' });
  }, [isEditing]);

  function toggleDay(day: number) {
    setTargetDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Name required', 'Please give your habit a name.');
      return;
    }
    if (!user) return;
    setSaving(true);

    const data = {
      title: title.trim(),
      description: description.trim() || null,
      frequency,
      target_days: frequency === 'weekly' ? targetDays : null,
      icon,
      color,
    };

    if (isEditing && id) {
      await updateHabit(id, data);
      router.back();
    } else {
      const created = await createHabit(user.id, data);
      if (created) {
        router.replace(`/habits/${created.id}`);
      } else {
        Alert.alert('Error', 'Could not create habit. Please try again.');
      }
    }
    setSaving(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Name */}
      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Meditate, Exercise, Read"
        placeholderTextColor="#9ca3af"
        value={title}
        onChangeText={setTitle}
        autoFocus={!isEditing}
        maxLength={60}
      />

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.inputMulti]}
        placeholder="Optional — what is this habit for?"
        placeholderTextColor="#9ca3af"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        maxLength={200}
      />

      {/* Frequency */}
      <Text style={styles.label}>Frequency</Text>
      <View style={styles.segmented}>
        <TouchableOpacity
          style={[styles.segBtn, frequency === 'daily' && styles.segBtnActive]}
          onPress={() => setFrequency('daily')}
        >
          <Text style={[styles.segBtnText, frequency === 'daily' && styles.segBtnTextActive]}>
            Daily
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, frequency === 'weekly' && styles.segBtnActive]}
          onPress={() => setFrequency('weekly')}
        >
          <Text style={[styles.segBtnText, frequency === 'weekly' && styles.segBtnTextActive]}>
            Weekly
          </Text>
        </TouchableOpacity>
      </View>

      {/* Target days (weekly only) */}
      {frequency === 'weekly' && (
        <>
          <Text style={styles.label}>Target Days</Text>
          <View style={styles.dayRow}>
            {DAY_NAMES.map((name, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dayBtn, targetDays.includes(i) && styles.dayBtnActive]}
                onPress={() => toggleDay(i)}
              >
                <Text style={[styles.dayBtnText, targetDays.includes(i) && styles.dayBtnTextActive]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Icon picker */}
      <Text style={styles.label}>Icon</Text>
      <View style={styles.emojiGrid}>
        {EMOJI_OPTIONS.map((e) => (
          <TouchableOpacity
            key={e}
            style={[styles.emojiBtn, icon === e && styles.emojiBtnActive]}
            onPress={() => setIcon(e)}
          >
            <Text style={styles.emojiText}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Color picker */}
      <Text style={styles.label}>Color</Text>
      <View style={styles.colorRow}>
        {COLOR_OPTIONS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[
              styles.colorDot,
              { backgroundColor: c },
              color === c && styles.colorDotActive,
            ]}
            onPress={() => setColor(c)}
          />
        ))}
      </View>

      {/* Preview */}
      <View style={[styles.preview, { borderColor: color }]}>
        <View style={[styles.previewIcon, { backgroundColor: color }]}>
          <Text style={{ fontSize: 24 }}>{icon}</Text>
        </View>
        <Text style={styles.previewTitle}>{title || 'Habit name'}</Text>
      </View>

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: color }, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Habit'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 48 },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 20 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },

  segmented: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 3,
  },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  segBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  segBtnText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  segBtnTextActive: { color: '#1f2937', fontWeight: '700' },

  dayRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  dayBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dayBtnActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  dayBtnText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  dayBtnTextActive: { color: '#fff' },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emojiBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiBtnActive: { borderColor: '#6366f1', backgroundColor: '#eef2ff' },
  emojiText: { fontSize: 24 },

  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: { borderColor: '#1f2937', transform: [{ scale: 1.2 }] },

  preview: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  previewIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', flex: 1 },

  saveBtn: {
    marginTop: 24,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
