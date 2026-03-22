import { create } from 'zustand';
import { Task, TaskStatus, TaskPriority } from '../types';
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  triageTask,
  countInboxTasks,
  TaskFilters,
  CreateTaskInput,
} from '../lib/tasks';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  inboxCount: number;
  /** Active company context — null means "All Companies" */
  activeCompanyId: string | null;

  // Data fetching
  fetch: (filters?: TaskFilters) => Promise<void>;
  fetchMore: (filters?: TaskFilters) => Promise<boolean>;
  refreshInboxCount: () => Promise<void>;
  getById: (id: string) => Promise<Task | null>;

  // CRUD
  create: (input: CreateTaskInput) => Promise<Task>;
  update: (id: string, updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>) => Promise<Task>;
  remove: (id: string, hard?: boolean) => Promise<void>;

  // Inbox / triage
  triage: (
    id: string,
    updates: {
      status?: Exclude<TaskStatus, 'inbox'>;
      priority?: TaskPriority;
      project_id?: string | null;
      company_id?: string | null;
    },
  ) => Promise<Task>;

  // Context
  setActiveCompany: (companyId: string | null) => void;
}

const PAGE_SIZE = 50;

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  inboxCount: 0,
  activeCompanyId: null,

  fetch: async (filters = {}) => {
    set({ loading: true });
    const effectiveFilters: TaskFilters = {
      company_id: get().activeCompanyId ?? undefined,
      ...filters,
    };
    const data = await listTasks({ ...effectiveFilters, limit: PAGE_SIZE, offset: 0 });
    set({ tasks: data, loading: false });
  },

  fetchMore: async (filters = {}) => {
    const currentCount = get().tasks.length;
    const effectiveFilters: TaskFilters = {
      company_id: get().activeCompanyId ?? undefined,
      ...filters,
    };
    const data = await listTasks({
      ...effectiveFilters,
      limit: PAGE_SIZE,
      offset: currentCount,
    });
    if (data.length === 0) return false;
    set({ tasks: [...get().tasks, ...data] });
    return data.length === PAGE_SIZE;
  },

  refreshInboxCount: async () => {
    const count = await countInboxTasks();
    set({ inboxCount: count });
  },

  getById: async (id) => {
    return getTask(id);
  },

  create: async (input) => {
    const task = await createTask(input);
    set({ tasks: [task, ...get().tasks] });
    if (task.status === 'inbox') {
      set({ inboxCount: get().inboxCount + 1 });
    }
    return task;
  },

  update: async (id, updates) => {
    const prevTasks = get().tasks;
    const prev = prevTasks.find((t) => t.id === id);

    const updated = await updateTask(id, updates);

    // Adjust inbox count when status crosses the inbox boundary
    if (prev) {
      const wasInbox = prev.status === 'inbox';
      const isInbox = updated.status === 'inbox';
      if (wasInbox && !isInbox) set({ inboxCount: Math.max(0, get().inboxCount - 1) });
      if (!wasInbox && isInbox) set({ inboxCount: get().inboxCount + 1 });
    }

    set({ tasks: prevTasks.map((t) => (t.id === id ? updated : t)) });
    return updated;
  },

  remove: async (id, hard = false) => {
    const prev = get().tasks.find((t) => t.id === id);
    await deleteTask(id, hard);
    if (prev?.status === 'inbox') {
      set({ inboxCount: Math.max(0, get().inboxCount - 1) });
    }
    set({ tasks: get().tasks.filter((t) => t.id !== id) });
  },

  triage: async (id, updates) => {
    const triaged = await triageTask(id, updates);
    // Triaging always moves out of inbox
    set({
      inboxCount: Math.max(0, get().inboxCount - 1),
      tasks: get().tasks.map((t) => (t.id === id ? triaged : t)),
    });
    return triaged;
  },

  setActiveCompany: (companyId) => {
    set({ activeCompanyId: companyId });
  },
}));
