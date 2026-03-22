import { format, isToday, isTomorrow, isPast } from 'date-fns';

export function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isPast(date)) return `Overdue · ${format(date, 'MMM d')}`;
  return format(date, 'MMM d');
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}
