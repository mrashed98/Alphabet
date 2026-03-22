// Core LifeOS data model types

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type HabitFrequency = 'daily' | 'weekly';
export type LifeEventType = 'birthday' | 'anniversary' | 'wedding' | 'holiday' | 'custom';
export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type LinkedType = 'task' | 'event' | 'habit' | 'life_event';

export interface Company {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  created_at: string;
}

export interface TaskTag {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  company: string | null;   // legacy text field
  company_id: string | null;
  color: string | null;
  icon: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: string | null;
  company_id: string | null;
  parent_task_id: string | null;
  recurring_rule: string | null; // iCal RRULE string
  created_at: string;
  updated_at: string;
  // joined
  project?: Project;
  tags?: TaskTag[];
}

export interface Event {
  id: string;
  user_id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  notes: string | null;
  created_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  frequency: HabitFrequency;
  target_days: number[] | null; // 0=Sun..6=Sat for weekly habits
  created_at: string;
  // computed
  streak?: number;
  completedToday?: boolean;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: string;
  date: string; // YYYY-MM-DD
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  linked_task_id: string | null;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  remind_at: string;
  recurrence: ReminderRecurrence;
  linked_id: string | null;
  linked_type: LinkedType | null;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  birthday: string | null; // MM-DD or YYYY-MM-DD
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface LifeEvent {
  id: string;
  user_id: string;
  title: string;
  event_type: LifeEventType;
  event_date: string; // YYYY-MM-DD
  advance_days: number; // days before to notify
  created_at: string;
}
