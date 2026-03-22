import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useProjectStore } from '../../stores/projectStore';
import { Task, TaskPriority, TaskStatus } from '../../types';

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_ORDER: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

const PRIORITY_DOT: Record<TaskPriority, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
};

const STATUS_OPTIONS: TaskStatus[] = ['inbox', 'todo', 'in_progress', 'done', 'cancelled'];

const STATUS_LABEL: Record<TaskStatus, string> = {
  inbox:       'Inbox',
  todo:        'To Do',
  in_progress: 'In Progress',
  done:        'Done',
  cancelled:   'Cancelled',
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  inbox:       '#6366f1',
  todo:        '#6b7280',
  in_progress: '#f97316',
  done:        '#22c55e',
  cancelled:   '#ef4444',
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/** Format YYYY-MM-DD for display */
function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m,10)-1]} ${day}, ${y}`;
}

/** Build an array of YYYY-MM-DD strings for the next N days */
function buildDateOptions(days = 30): string[] {
  const result: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    result.push(d.toISOString().split('T')[0]);
  }
  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { tasks, getById, update, remove, triage } = useTaskStore();
  const { companies, fetch: fetchCompanies } = useCompanyStore();
  const { projects, fetch: fetchProjects } = useProjectStore();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');

  // Pickers
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  // Load task on focus (picks up edits made from list)
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      fetchCompanies(user.id);
      fetchProjects(user.id);

      // Check Zustand cache first
      const cached = tasks.find((t) => t.id === id);
      if (cached) {
        setTask(cached);
        setLoading(false);
      } else {
        setLoading(true);
        getById(id!).then((t) => {
          setTask(t);
          setLoading(false);
        });
      }
    }, [id, user])
  );

  // ── Field updaters ────────────────────────────────────────────────────────

  async function patchField(updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>) {
    if (!task) return;
    try {
      const updated = await update(task.id, updates);
      setTask(updated);
    } catch (e) {
      Alert.alert('Error', 'Failed to update task. Please try again.');
    }
  }

  async function saveTitle() {
    setEditingTitle(false);
    if (titleDraft.trim() && titleDraft.trim() !== task?.title) {
      await patchField({ title: titleDraft.trim() });
    }
  }

  async function saveDesc() {
    setEditingDesc(false);
    if (descDraft !== (task?.description ?? '')) {
      await patchField({ description: descDraft || null });
    }
  }

  async function handleDelete() {
    Alert.alert('Delete Task', 'This task will be removed. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(task!.id);
          router.back();
        },
      },
    ]);
  }

  // ── Triage action ─────────────────────────────────────────────────────────

  async function handleTriage() {
    if (!task) return;
    const triaged = await triage(task.id, { status: 'todo', priority: task.priority });
    setTask(triaged);
  }

  // ── Loading / not-found ───────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  if (!task) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Task not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOverdue =
    task.due_date !== null &&
    task.due_date < todayStr() &&
    task.status !== 'done' &&
    task.status !== 'cancelled';

  const filteredProjects = task.company_id
    ? projects.filter((p) => p.company_id === task.company_id)
    : projects;

  const dateOptions = buildDateOptions(90);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Nav bar ───────────────────────────────────────────────────── */}
      <View style={styles.navbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {/* ── Title ─────────────────────────────────────────────────── */}
          {editingTitle ? (
            <TextInput
              style={styles.titleInput}
              value={titleDraft}
              onChangeText={setTitleDraft}
              autoFocus
              multiline
              onBlur={saveTitle}
              returnKeyType="done"
              blurOnSubmit
            />
          ) : (
            <TouchableOpacity onPress={() => { setTitleDraft(task.title); setEditingTitle(true); }}>
              <Text style={styles.taskTitle}>{task.title}</Text>
            </TouchableOpacity>
          )}

          {/* ── Triage CTA (inbox only) ───────────────────────────────── */}
          {task.status === 'inbox' && (
            <TouchableOpacity style={styles.triageCta} onPress={handleTriage}>
              <Text style={styles.trageCtaText}>Move to To Do →</Text>
            </TouchableOpacity>
          )}

          {/* ── Description ───────────────────────────────────────────── */}
          {editingDesc ? (
            <TextInput
              style={styles.descInput}
              value={descDraft}
              onChangeText={setDescDraft}
              autoFocus
              multiline
              onBlur={saveDesc}
              placeholder="Add a description…"
              placeholderTextColor="#9ca3af"
            />
          ) : (
            <TouchableOpacity
              onPress={() => { setDescDraft(task.description ?? ''); setEditingDesc(true); }}
              style={styles.descWrapper}
            >
              <Text style={task.description ? styles.desc : styles.descPlaceholder}>
                {task.description ?? 'Add a description…'}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          {/* ── Fields grid ───────────────────────────────────────────── */}
          <View style={styles.fieldsGrid}>
            {/* Status */}
            <FieldRow
              label="Status"
              onPress={() => setShowStatusPicker(true)}
              value={
                <View style={[styles.statusChip, { backgroundColor: STATUS_COLOR[task.status] + '22' }]}>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[task.status] }]} />
                  <Text style={[styles.statusChipText, { color: STATUS_COLOR[task.status] }]}>
                    {STATUS_LABEL[task.status]}
                  </Text>
                </View>
              }
            />

            {/* Priority */}
            <FieldRow
              label="Priority"
              onPress={() => setShowPriorityPicker(true)}
              value={
                <View style={styles.priorityRow}>
                  <View style={[styles.priorityDot, { backgroundColor: PRIORITY_DOT[task.priority] }]} />
                  <Text style={styles.fieldValue}>{PRIORITY_LABEL[task.priority]}</Text>
                </View>
              }
            />

            {/* Due date */}
            <FieldRow
              label="Due date"
              onPress={() => setShowDatePicker(true)}
              value={
                task.due_date ? (
                  <Text style={[styles.fieldValue, isOverdue && styles.fieldValueOverdue]}>
                    {formatDate(task.due_date)}
                  </Text>
                ) : (
                  <Text style={styles.fieldValueEmpty}>None</Text>
                )
              }
            />

            {/* Company */}
            <FieldRow
              label="Company"
              onPress={() => setShowCompanyPicker(true)}
              value={
                task.company_id ? (
                  <Text style={styles.fieldValue}>
                    {companies.find((c) => c.id === task.company_id)?.name ?? '—'}
                  </Text>
                ) : (
                  <Text style={styles.fieldValueEmpty}>None</Text>
                )
              }
            />

            {/* Project */}
            <FieldRow
              label="Project"
              onPress={() => setShowProjectPicker(true)}
              value={
                task.project_id ? (
                  <Text style={styles.fieldValue}>
                    {projects.find((p) => p.id === task.project_id)?.name ?? '—'}
                  </Text>
                ) : (
                  <Text style={styles.fieldValueEmpty}>None</Text>
                )
              }
            />
          </View>

          {/* ── Metadata ─────────────────────────────────────────────── */}
          <View style={styles.meta}>
            <Text style={styles.metaText}>
              Created {new Date(task.created_at).toLocaleDateString()}
            </Text>
            {task.completed_at && (
              <Text style={styles.metaText}>
                Completed {new Date(task.completed_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Priority picker ─────────────────────────────────────────── */}
      <OptionSheet
        visible={showPriorityPicker}
        title="Priority"
        onClose={() => setShowPriorityPicker(false)}
      >
        {PRIORITY_ORDER.map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.optionRow, task.priority === p && styles.optionRowSelected]}
            onPress={() => { patchField({ priority: p }); setShowPriorityPicker(false); }}
          >
            <View style={[styles.priorityDot, { backgroundColor: PRIORITY_DOT[p] }]} />
            <Text style={[styles.optionText, task.priority === p && styles.optionTextSelected]}>
              {PRIORITY_LABEL[p]}
            </Text>
            {task.priority === p && <Text style={styles.optionCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </OptionSheet>

      {/* ── Status picker ──────────────────────────────────────────── */}
      <OptionSheet
        visible={showStatusPicker}
        title="Status"
        onClose={() => setShowStatusPicker(false)}
      >
        {STATUS_OPTIONS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.optionRow, task.status === s && styles.optionRowSelected]}
            onPress={() => { patchField({ status: s }); setShowStatusPicker(false); }}
          >
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[s] }]} />
            <Text style={[styles.optionText, task.status === s && styles.optionTextSelected]}>
              {STATUS_LABEL[s]}
            </Text>
            {task.status === s && <Text style={styles.optionCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </OptionSheet>

      {/* ── Date picker ────────────────────────────────────────────── */}
      <OptionSheet
        visible={showDatePicker}
        title="Due Date"
        onClose={() => setShowDatePicker(false)}
        scrollable
      >
        <TouchableOpacity
          style={[styles.optionRow, !task.due_date && styles.optionRowSelected]}
          onPress={() => { patchField({ due_date: null }); setShowDatePicker(false); }}
        >
          <Text style={[styles.optionText, !task.due_date && styles.optionTextSelected]}>No date</Text>
          {!task.due_date && <Text style={styles.optionCheck}>✓</Text>}
        </TouchableOpacity>
        {dateOptions.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.optionRow, task.due_date === d && styles.optionRowSelected]}
            onPress={() => { patchField({ due_date: d }); setShowDatePicker(false); }}
          >
            <Text style={[styles.optionText, task.due_date === d && styles.optionTextSelected]}>
              {formatDate(d)}
            </Text>
            {task.due_date === d && <Text style={styles.optionCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </OptionSheet>

      {/* ── Company picker ─────────────────────────────────────────── */}
      <OptionSheet
        visible={showCompanyPicker}
        title="Company"
        onClose={() => setShowCompanyPicker(false)}
        scrollable
      >
        <TouchableOpacity
          style={[styles.optionRow, !task.company_id && styles.optionRowSelected]}
          onPress={() => { patchField({ company_id: null, project_id: null }); setShowCompanyPicker(false); }}
        >
          <Text style={[styles.optionText, !task.company_id && styles.optionTextSelected]}>None</Text>
          {!task.company_id && <Text style={styles.optionCheck}>✓</Text>}
        </TouchableOpacity>
        {companies.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.optionRow, task.company_id === c.id && styles.optionRowSelected]}
            onPress={() => {
              patchField({ company_id: c.id, project_id: null });
              setShowCompanyPicker(false);
            }}
          >
            <Text style={styles.optionText}>{c.icon ? `${c.icon} ` : ''}{c.name}</Text>
            {task.company_id === c.id && <Text style={styles.optionCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </OptionSheet>

      {/* ── Project picker ─────────────────────────────────────────── */}
      <OptionSheet
        visible={showProjectPicker}
        title="Project"
        onClose={() => setShowProjectPicker(false)}
        scrollable
      >
        <TouchableOpacity
          style={[styles.optionRow, !task.project_id && styles.optionRowSelected]}
          onPress={() => { patchField({ project_id: null }); setShowProjectPicker(false); }}
        >
          <Text style={[styles.optionText, !task.project_id && styles.optionTextSelected]}>None</Text>
          {!task.project_id && <Text style={styles.optionCheck}>✓</Text>}
        </TouchableOpacity>
        {filteredProjects.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.optionRow, task.project_id === p.id && styles.optionRowSelected]}
            onPress={() => { patchField({ project_id: p.id }); setShowProjectPicker(false); }}
          >
            <Text style={styles.optionText}>{p.icon ? `${p.icon} ` : ''}{p.name}</Text>
            {task.project_id === p.id && <Text style={styles.optionCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </OptionSheet>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.fieldRow} onPress={onPress}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldValueWrapper}>{value}</View>
      <Text style={styles.fieldChevron}>›</Text>
    </TouchableOpacity>
  );
}

function OptionSheet({
  visible,
  title,
  onClose,
  children,
  scrollable,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  scrollable?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{title}</Text>
          {scrollable ? (
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            <View>{children}</View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFound: { fontSize: 16, color: '#6b7280' },
  backLink: { fontSize: 15, color: '#6366f1' },

  // Navbar
  navbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backBtnText: { fontSize: 16, color: '#6366f1', fontWeight: '500' },
  deleteBtn: { paddingVertical: 4, paddingLeft: 8 },
  deleteBtnText: { fontSize: 15, color: '#ef4444' },

  // Content
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  taskTitle: { fontSize: 22, fontWeight: '700', color: '#1f2937', lineHeight: 30, marginBottom: 12 },
  titleInput: { fontSize: 22, fontWeight: '700', color: '#1f2937', lineHeight: 30, marginBottom: 12, borderBottomWidth: 2, borderBottomColor: '#6366f1', paddingBottom: 4 },

  // Triage CTA
  triageCta: { backgroundColor: '#ede9fe', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start', marginBottom: 16 },
  trageCtaText: { fontSize: 14, fontWeight: '600', color: '#6366f1' },

  // Description
  descWrapper: { marginBottom: 8 },
  desc: { fontSize: 15, color: '#374151', lineHeight: 22 },
  descPlaceholder: { fontSize: 15, color: '#9ca3af', fontStyle: 'italic', lineHeight: 22 },
  descInput: { fontSize: 15, color: '#374151', lineHeight: 22, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 8, minHeight: 80, textAlignVertical: 'top' },

  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 16 },

  // Fields grid
  fieldsGrid: { gap: 2 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  fieldLabel: { fontSize: 14, color: '#6b7280', fontWeight: '500', width: 80 },
  fieldValueWrapper: { flex: 1 },
  fieldValue: { fontSize: 15, color: '#1f2937', fontWeight: '500' },
  fieldValueOverdue: { color: '#dc2626' },
  fieldValueEmpty: { fontSize: 15, color: '#d1d5db' },
  fieldChevron: { fontSize: 20, color: '#d1d5db' },

  // Status chip
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusChipText: { fontSize: 13, fontWeight: '600' },

  // Priority row
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },

  // Meta
  meta: { marginTop: 24, gap: 4 },
  metaText: { fontSize: 12, color: '#9ca3af' },

  // Option sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f9fafb', gap: 12 },
  optionRowSelected: { backgroundColor: '#f5f3ff', borderRadius: 10, paddingHorizontal: 8, marginHorizontal: -8 },
  optionText: { flex: 1, fontSize: 15, color: '#374151' },
  optionTextSelected: { color: '#6366f1', fontWeight: '600' },
  optionCheck: { fontSize: 16, color: '#6366f1', fontWeight: '700' },
});
