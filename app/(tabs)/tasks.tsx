import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { useCompanyStore } from '../../stores/companyStore';
import { useActiveCompanyStore } from '../../stores/activeCompanyStore';
import { Task, TaskPriority } from '../../types';

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

const DUE_FILTERS = [
  { key: 'all',           label: 'All dates' },
  { key: 'due_today',     label: 'Today' },
  { key: 'overdue',       label: 'Overdue' },
  { key: 'due_this_week', label: 'This week' },
  { key: 'no_due_date',   label: 'No date' },
] as const;

type DueFilterKey = typeof DUE_FILTERS[number]['key'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function isOverdue(task: Task) {
  return (
    task.due_date !== null &&
    task.due_date < todayStr() &&
    task.status !== 'done' &&
    task.status !== 'cancelled'
  );
}

function dueDateLabel(dateStr: string): string {
  const today = todayStr();
  if (dateStr === today) return 'Today';
  const diff = Math.ceil(
    (new Date(dateStr).getTime() - new Date(today).getTime()) / 86_400_000
  );
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 1) return 'Tomorrow';
  if (diff <= 6) return `${diff}d`;
  return dateStr.slice(5).replace('-', '/');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const { user } = useAuthStore();
  const { tasks, loading, inboxCount, fetch, refreshInboxCount, create } = useTaskStore();
  const { companies, fetch: fetchCompanies } = useCompanyStore();
  const { activeCompanyId, setActiveCompanyId } = useActiveCompanyStore();
  const router = useRouter();

  // Tab: 'all' | 'inbox'
  const [activeTab, setActiveTab] = useState<'all' | 'inbox'>('all');
  // Filters
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | null>(null);
  const [dueFilter, setDueFilter] = useState<DueFilterKey>('all');
  // Quick-capture sheet
  const [showCapture, setShowCapture] = useState(false);
  const [captureTitle, setCaptureTitle] = useState('');
  const [captureSaving, setCaptureSaving] = useState(false);

  // Sync activeCompanyId from persistent store into task store on mount
  const taskStore = useTaskStore();
  useEffect(() => {
    taskStore.setActiveCompany(activeCompanyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      fetchCompanies(user.id);
      taskStore.setActiveCompany(activeCompanyId);
      fetch();
      refreshInboxCount();
    }, [user, activeCompanyId])
  );

  // ── Company switcher ──────────────────────────────────────────────────────

  function handleSelectCompany(id: string | null) {
    setActiveCompanyId(id);
    taskStore.setActiveCompany(id);
    fetch({ company_id: id ?? undefined });
  }

  // ── Filtered task list ────────────────────────────────────────────────────

  const displayTasks = tasks.filter((t) => {
    if (activeTab === 'inbox') return t.status === 'inbox';
    if (t.status === 'inbox' || t.status === 'cancelled') return false;

    if (priorityFilter && t.priority !== priorityFilter) return false;

    if (dueFilter === 'due_today') {
      if (t.due_date !== todayStr()) return false;
    } else if (dueFilter === 'overdue') {
      if (!isOverdue(t)) return false;
    } else if (dueFilter === 'due_this_week') {
      const today = todayStr();
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndS = weekEnd.toISOString().split('T')[0];
      if (!t.due_date || t.due_date < today || t.due_date > weekEndS) return false;
    } else if (dueFilter === 'no_due_date') {
      if (t.due_date !== null) return false;
    }

    return true;
  });

  // Sort: priority desc, due_date asc (nulls last), created_at desc
  const PRIO_RANK: Record<TaskPriority, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const sorted = [...displayTasks].sort((a, b) => {
    const pd = PRIO_RANK[b.priority] - PRIO_RANK[a.priority];
    if (pd !== 0) return pd;
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;
    return b.created_at.localeCompare(a.created_at);
  });

  // ── Quick-capture ─────────────────────────────────────────────────────────

  async function handleCapture() {
    if (!captureTitle.trim() || !user || captureSaving) return;
    setCaptureSaving(true);
    try {
      await create({
        title: captureTitle.trim(),
        user_id: user.id,
        created_by: user.id,
        status: 'inbox',
        priority: 'medium',
        company_id: activeCompanyId,
      });
      setCaptureTitle('');
      setShowCapture(false);
    } finally {
      setCaptureSaving(false);
    }
  }

  // ── Triage (inbox → todo) ─────────────────────────────────────────────────

  function handleTaskPress(task: Task) {
    router.push(`/tasks/${task.id}`);
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  const activeCompany = companies.find((c) => c.id === activeCompanyId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Company Switcher ─────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.companySwitcher}
        contentContainerStyle={styles.companySwitcherContent}
      >
        <TouchableOpacity
          style={[styles.companyChip, !activeCompanyId && styles.companyChipActive]}
          onPress={() => handleSelectCompany(null)}
        >
          <Text style={[styles.companyChipText, !activeCompanyId && styles.companyChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {companies.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.companyChip, activeCompanyId === c.id && styles.companyChipActive]}
            onPress={() => handleSelectCompany(c.id)}
          >
            {c.icon ? <Text style={styles.companyIcon}>{c.icon}</Text> : null}
            <Text
              style={[
                styles.companyChipText,
                activeCompanyId === c.id && styles.companyChipTextActive,
              ]}
            >
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {activeCompany ? activeCompany.name : 'Tasks'}
        </Text>
      </View>

      {/* ── Tabs: All / Inbox ─────────────────────────────────────────── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inbox' && styles.tabActive]}
          onPress={() => setActiveTab('inbox')}
        >
          <Text style={[styles.tabText, activeTab === 'inbox' && styles.tabTextActive]}>
            Inbox
          </Text>
          {inboxCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{inboxCount > 99 ? '99+' : inboxCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Filter row (All tab only) ─────────────────────────────────── */}
      {activeTab === 'all' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterRowContent}
        >
          {/* Priority filters */}
          {PRIORITY_ORDER.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.filterChip, priorityFilter === p && { backgroundColor: PRIORITY_DOT[p] + '22', borderColor: PRIORITY_DOT[p] }]}
              onPress={() => setPriorityFilter(priorityFilter === p ? null : p)}
            >
              <View style={[styles.priorityDot, { backgroundColor: PRIORITY_DOT[p] }]} />
              <Text style={[styles.filterChipText, priorityFilter === p && { color: PRIORITY_DOT[p] }]}>
                {PRIORITY_LABEL[p]}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.filterDivider} />
          {/* Due date filters */}
          {DUE_FILTERS.filter((f) => f.key !== 'all').map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, dueFilter === f.key && styles.filterChipActive]}
              onPress={() => setDueFilter(dueFilter === f.key ? 'all' : f.key)}
            >
              <Text style={[styles.filterChipText, dueFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Task List ─────────────────────────────────────────────────── */}
      <FlatList
        data={sorted}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <TaskRow task={item} onPress={handleTaskPress} />}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.empty}>Loading…</Text>
          ) : (
            <Text style={styles.empty}>
              {activeTab === 'inbox' ? 'Inbox is empty.' : 'No tasks. Tap + to add one.'}
            </Text>
          )
        }
      />

      {/* ── FAB ──────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowCapture(true)} activeOpacity={0.85}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* ── Quick-Capture Sheet ───────────────────────────────────────── */}
      <Modal visible={showCapture} transparent animationType="slide" onRequestClose={() => setShowCapture(false)}>
        <KeyboardAvoidingView
          style={styles.sheetOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setShowCapture(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Quick Capture</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="What needs to be done?"
              placeholderTextColor="#9ca3af"
              value={captureTitle}
              onChangeText={setCaptureTitle}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCapture}
              multiline={false}
            />
            {activeCompany && (
              <View style={styles.sheetContext}>
                <Text style={styles.sheetContextText}>
                  {activeCompany.icon ? `${activeCompany.icon} ` : ''}{activeCompany.name}
                </Text>
              </View>
            )}
            <View style={styles.sheetActions}>
              <TouchableOpacity onPress={() => { setShowCapture(false); setCaptureTitle(''); }}>
                <Text style={styles.cancelBtn}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!captureTitle.trim() || captureSaving) && styles.saveBtnDisabled]}
                onPress={handleCapture}
                disabled={!captureTitle.trim() || captureSaving}
              >
                <Text style={styles.saveBtnText}>{captureSaving ? 'Saving…' : 'Add to Inbox'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onPress }: { task: Task; onPress: (t: Task) => void }) {
  const overdue = isOverdue(task);

  return (
    <TouchableOpacity style={styles.taskCard} onPress={() => onPress(task)} activeOpacity={0.75}>
      {/* Priority dot */}
      <View style={[styles.priorityDot, { backgroundColor: PRIORITY_DOT[task.priority] }]} />

      {/* Content */}
      <View style={styles.taskBody}>
        <Text
          style={[styles.taskTitle, task.status === 'done' && styles.taskTitleDone]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <View style={styles.taskMeta}>
          {task.due_date && (
            <View style={[styles.dueBadge, overdue && styles.dueBadgeOverdue]}>
              <Text style={[styles.dueText, overdue && styles.dueTextOverdue]}>
                {dueDateLabel(task.due_date)}
              </Text>
            </View>
          )}
          {task.project && (
            <Text style={styles.projectLabel} numberOfLines={1}>
              {task.project.icon ? `${task.project.icon} ` : ''}{task.project.name}
            </Text>
          )}
          {task.status === 'inbox' && (
            <View style={styles.inboxChip}>
              <Text style={styles.inboxChipText}>Inbox</Text>
            </View>
          )}
        </View>
      </View>

      {/* Status indicator */}
      <View style={[styles.statusDot, task.status === 'done' && styles.statusDotDone]}>
        {task.status === 'done' && <Text style={styles.statusCheck}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  // Company switcher
  companySwitcher: { maxHeight: 48, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  companySwitcherContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  companyChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  companyChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  companyChipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  companyChipTextActive: { color: '#fff' },
  companyIcon: { fontSize: 14 },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#1f2937' },

  // Tabs
  tabRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, gap: 20 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#6366f1' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#6366f1' },
  tabBadge: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  tabBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Filters
  filterRow: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  filterRowContent: { paddingHorizontal: 16, paddingVertical: 6, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff' },
  filterChipActive: { backgroundColor: '#ede9fe', borderColor: '#6366f1' },
  filterChipText: { fontSize: 12, fontWeight: '500', color: '#6b7280' },
  filterChipTextActive: { color: '#6366f1' },
  filterDivider: { width: 1, height: 20, backgroundColor: '#e5e7eb', marginHorizontal: 2 },

  // List
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb', gap: 12 },
  priorityDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  taskBody: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '500', color: '#1f2937', marginBottom: 4 },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
  taskMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  dueBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#f3f4f6' },
  dueBadgeOverdue: { backgroundColor: '#fee2e2' },
  dueText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  dueTextOverdue: { color: '#dc2626' },
  projectLabel: { fontSize: 11, color: '#9ca3af' },
  inboxChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: '#ede9fe' },
  inboxChipText: { fontSize: 11, fontWeight: '600', color: '#6366f1' },
  statusDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statusDotDone: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  statusCheck: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Empty
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 14, fontStyle: 'italic' },

  // FAB
  fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  fabIcon: { fontSize: 28, color: '#fff', lineHeight: 30, marginTop: -2 },

  // Quick-capture sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb', alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 16 },
  sheetInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 14, padding: 14, fontSize: 16, color: '#1f2937', marginBottom: 12 },
  sheetContext: { backgroundColor: '#ede9fe', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 20 },
  sheetContextText: { fontSize: 13, fontWeight: '500', color: '#6366f1' },
  sheetActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelBtn: { fontSize: 16, color: '#9ca3af' },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  saveBtnDisabled: { backgroundColor: '#c7d2fe' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
