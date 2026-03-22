import { supabase } from './supabase';
import { Task, TaskStatus, TaskPriority } from '../types';

// Joined select used across all task queries
const TASK_SELECT = `
  *,
  project:projects(id, name, color, icon),
  tags:task_tag_assignments(tag:task_tags(id, name, color))
`;

// ============================================================
// Types
// ============================================================

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  company_id?: string | null;
  project_id?: string | null;
  due_date_from?: string;
  due_date_to?: string;
  /** Shortcut due-date filters */
  due_filter?: 'due_today' | 'overdue' | 'no_due_date' | 'due_this_week';
}

export interface TaskListParams extends TaskFilters {
  limit?: number;
  offset?: number;
}

export interface CreateTaskInput {
  title: string;
  user_id: string;
  created_by: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  company_id?: string | null;
  project_id?: string | null;
  assigned_to?: string | null;
  parent_task_id?: string | null;
  recurring_rule?: string | null;
}

// ============================================================
// Helpers
// ============================================================

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function weekEndStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

/** Flatten Supabase join shape `tags:[{tag:{...}}]` → `tags:[{...}]` */
function normalizeTask(row: Record<string, unknown>): Task {
  const rawTags = row.tags as Array<{ tag: unknown }> | null;
  const tags = (rawTags ?? []).map((a) => a.tag).filter(Boolean);
  return { ...row, tags } as unknown as Task;
}

function applyFilters(
  query: ReturnType<typeof supabase.from>,
  filters: TaskFilters,
): ReturnType<typeof supabase.from> {
  const {
    status,
    priority,
    company_id,
    project_id,
    due_date_from,
    due_date_to,
    due_filter,
  } = filters;

  if (status) {
    if (Array.isArray(status)) {
      query = (query as any).in('status', status);
    } else {
      query = (query as any).eq('status', status);
    }
  }
  if (priority) {
    if (Array.isArray(priority)) {
      query = (query as any).in('priority', priority);
    } else {
      query = (query as any).eq('priority', priority);
    }
  }
  if (company_id !== undefined) {
    if (company_id === null) {
      query = (query as any).is('company_id', null);
    } else {
      query = (query as any).eq('company_id', company_id);
    }
  }
  if (project_id !== undefined) {
    if (project_id === null) {
      query = (query as any).is('project_id', null);
    } else {
      query = (query as any).eq('project_id', project_id);
    }
  }
  if (due_date_from) query = (query as any).gte('due_date', due_date_from);
  if (due_date_to) query = (query as any).lte('due_date', due_date_to);

  const today = todayStr();
  if (due_filter === 'due_today') {
    query = (query as any).eq('due_date', today);
  } else if (due_filter === 'overdue') {
    query = (query as any)
      .lt('due_date', today)
      .not('status', 'in', '(done,cancelled)');
  } else if (due_filter === 'no_due_date') {
    query = (query as any).is('due_date', null);
  } else if (due_filter === 'due_this_week') {
    query = (query as any).gte('due_date', today).lte('due_date', weekEndStr());
  }

  return query;
}

// ============================================================
// API
// ============================================================

/**
 * List tasks with optional filters, sorted by priority desc then due_date asc.
 * Uses offset pagination (default limit: 50).
 */
export async function listTasks(params: TaskListParams = {}): Promise<Task[]> {
  const { limit = 50, offset = 0, ...filters } = params;

  let query = supabase
    .from('tasks')
    .select(TASK_SELECT)
    // priority enum order in DB: low < medium < high < critical → descending = critical first
    .order('priority', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  query = applyFilters(query as any, filters) as any;

  const { data, error } = await (query as any);
  if (error) throw error;
  return (data ?? []).map(normalizeTask);
}

/** Fetch a single task with joined project and tags. */
export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data ? normalizeTask(data as Record<string, unknown>) : null;
}

/**
 * Create a task. Omitting `status` defaults to `inbox` (quick-capture).
 * Omitting `priority` defaults to `medium`.
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  const payload = {
    ...input,
    status: input.status ?? 'inbox',
    priority: input.priority ?? 'medium',
  };
  const { data, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select(TASK_SELECT)
    .single();
  if (error) throw error;
  return normalizeTask(data as Record<string, unknown>);
}

/** Update any field on a task. */
export async function updateTask(
  id: string,
  updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select(TASK_SELECT)
    .single();
  if (error) throw error;
  return normalizeTask(data as Record<string, unknown>);
}

/**
 * Delete a task.
 * @param hard - if true, hard-deletes the row; otherwise soft-deletes (status → cancelled).
 */
export async function deleteTask(id: string, hard = false): Promise<void> {
  if (hard) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
  } else {
    await updateTask(id, { status: 'cancelled' });
  }
}

/**
 * Triage an inbox task: promote it to todo and optionally set priority/project.
 */
export async function triageTask(
  id: string,
  updates: {
    status?: Exclude<TaskStatus, 'inbox'>;
    priority?: TaskPriority;
    project_id?: string | null;
    company_id?: string | null;
  },
): Promise<Task> {
  return updateTask(id, { status: 'todo', ...updates });
}

/**
 * Count inbox tasks for a user (for badge display).
 */
export async function countInboxTasks(): Promise<number> {
  const { count, error } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'inbox');
  if (error) throw error;
  return count ?? 0;
}
