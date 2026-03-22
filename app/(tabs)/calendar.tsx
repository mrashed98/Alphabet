import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import { useTaskStore } from '../../stores/taskStore';
import { useHabitStore } from '../../stores/habitStore';
import { useLifeEventStore } from '../../stores/lifeEventStore';
import { useContactStore, daysUntilBirthday } from '../../stores/contactStore';
import { useUserPreferencesStore } from '../../stores/userPreferencesStore';
import { CalendarEntry, CalendarEntryType } from '../../types';

type ViewMode = 'month' | 'week' | 'day';

const TYPE_COLOR: Record<CalendarEntryType, string> = {
  task: '#3b82f6',
  habit: '#22c55e',
  life_event: '#8b5cf6',
  birthday: '#ec4899',
  holiday: '#9ca3af',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_CELL_SIZE = Math.floor((SCREEN_WIDTH - 32) / 7);

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function parseKey(key: string): Date {
  return new Date(key + 'T00:00:00');
}

/** Build a contact birthday CalendarEntry for a given year. */
function birthdayEntry(contactId: string, name: string, birthday: string, year: number): CalendarEntry | null {
  const parts = birthday.split('-');
  let month: string, day: string;
  if (parts.length === 3) {
    [, month, day] = parts;
  } else {
    [month, day] = parts;
  }
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  return { id: `bday-${contactId}`, title: `${name}'s Birthday`, type: 'birthday', date, allDay: true, navigateTo: `/contacts/${contactId}` };
}

// ── useCalendarEntries ────────────────────────────────────────────────────────

function useCalendarEntries(): Map<string, CalendarEntry[]> {
  const { tasks } = useTaskStore();
  const { habits } = useHabitStore();
  const { lifeEvents } = useLifeEventStore();
  const { contacts } = useContactStore();
  const { holidays } = useUserPreferencesStore();

  return useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();

    function add(entry: CalendarEntry) {
      const list = map.get(entry.date) ?? [];
      list.push(entry);
      map.set(entry.date, list);
    }

    // Tasks with due_date
    for (const task of tasks) {
      if (task.due_date && task.status !== 'done' && task.status !== 'cancelled') {
        const date = task.due_date.split('T')[0];
        add({ id: task.id, title: task.title, type: 'task', date, allDay: false, navigateTo: `/tasks` });
      }
    }

    // Habits — show on today for daily, on scheduled days for weekly
    const today = toDateKey(new Date());
    for (const habit of habits) {
      if (habit.is_archived) continue;
      if (habit.frequency === 'daily') {
        // Show for next 60 days
        for (let i = 0; i < 60; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          add({ id: `habit-${habit.id}-${i}`, title: habit.title, type: 'habit', date: toDateKey(d), allDay: true });
        }
      } else if (habit.frequency === 'weekly' && habit.target_days) {
        // Show for next 60 days on matching weekdays
        for (let i = 0; i < 60; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          if (habit.target_days.includes(d.getDay())) {
            add({ id: `habit-${habit.id}-${i}`, title: habit.title, type: 'habit', date: toDateKey(d), allDay: true });
          }
        }
      }
    }

    // Life events (current year + next)
    const thisYear = new Date().getFullYear();
    for (const event of lifeEvents) {
      for (const yr of [thisYear, thisYear + 1]) {
        const [, m, d] = event.event_date.split('-');
        const date = `${yr}-${m}-${d}`;
        add({ id: `le-${event.id}-${yr}`, title: event.title, type: 'life_event', date, allDay: true, navigateTo: `/events/${event.id}` });
        if (!event.recurring) break; // only first year if not recurring
      }
    }

    // Birthdays (current year + next)
    for (const contact of contacts) {
      if (!contact.birthday) continue;
      for (const yr of [thisYear, thisYear + 1]) {
        const entry = birthdayEntry(contact.id, contact.name, contact.birthday, yr);
        if (entry) add(entry);
      }
    }

    // Holidays
    for (const h of holidays) {
      add({ id: `holiday-${h.id}`, title: h.name, type: 'holiday', date: h.date, allDay: true });
    }

    return map;
  }, [tasks, habits, lifeEvents, contacts, holidays]);
}

// ── DotRow ────────────────────────────────────────────────────────────────────

const DotRow = ({ entries }: { entries: CalendarEntry[] }) => {
  const types = [...new Set(entries.map((e) => e.type))].slice(0, 4);
  return (
    <View style={styles.dotRow}>
      {types.map((t) => (
        <View key={t} style={[styles.dot, { backgroundColor: TYPE_COLOR[t] }]} />
      ))}
    </View>
  );
};

// ── MonthView ─────────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  selectedDate,
  onSelectDate,
  entries,
}: {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  entries: Map<string, CalendarEntry[]>;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();

  return (
    <View>
      {/* Weekday headers */}
      <View style={styles.weekdayRow}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <Text key={d} style={styles.weekdayLabel}>{d}</Text>
        ))}
      </View>
      {/* Grid */}
      <View style={styles.monthGrid}>
        {days.map((day) => {
          const key = toDateKey(day);
          const dayEntries = entries.get(key) ?? [];
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          return (
            <TouchableOpacity
              key={key}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
              onPress={() => onSelectDate(day)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dayNumber,
                !isCurrentMonth && styles.dayNumberFaded,
                isToday && styles.dayNumberToday,
                isSelected && styles.dayNumberSelected,
              ]}>
                {day.getDate()}
              </Text>
              <DotRow entries={dayEntries} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── EventChip ─────────────────────────────────────────────────────────────────

function EventChip({ entry, onPress }: { entry: CalendarEntry; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.eventChip, { backgroundColor: TYPE_COLOR[entry.type] + '22', borderLeftColor: TYPE_COLOR[entry.type] }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.eventChipText, { color: TYPE_COLOR[entry.type] }]} numberOfLines={1}>
        {entry.allDay ? '' : (entry.time ? entry.time + ' ' : '')}{entry.title}
      </Text>
    </TouchableOpacity>
  );
}

// ── DayEventList ──────────────────────────────────────────────────────────────

function DayEventList({ date, entries, router }: { date: Date; entries: Map<string, CalendarEntry[]>; router: ReturnType<typeof useRouter> }) {
  const key = toDateKey(date);
  const dayEntries = entries.get(key) ?? [];
  if (dayEntries.length === 0) {
    return <Text style={styles.emptyDay}>No events</Text>;
  }
  return (
    <View>
      {dayEntries.map((e) => (
        <EventChip
          key={e.id}
          entry={e}
          onPress={() => e.navigateTo ? router.push(e.navigateTo as never) : undefined}
        />
      ))}
    </View>
  );
}

// ── WeekView ──────────────────────────────────────────────────────────────────

function WeekView({
  currentDate,
  entries,
  router,
}: {
  currentDate: Date;
  entries: Map<string, CalendarEntry[]>;
  router: ReturnType<typeof useRouter>;
}) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.weekGrid}>
        {weekDays.map((day) => {
          const key = toDateKey(day);
          const dayEntries = entries.get(key) ?? [];
          const isToday = isSameDay(day, today);
          return (
            <View key={key} style={[styles.weekDayCol, { width: (SCREEN_WIDTH - 32) / 7 }]}>
              <View style={[styles.weekDayHeader, isToday && styles.weekDayHeaderToday]}>
                <Text style={[styles.weekDayLabel, isToday && styles.weekDayLabelToday]}>
                  {format(day, 'EEE')}
                </Text>
                <Text style={[styles.weekDayNum, isToday && styles.weekDayNumToday]}>
                  {day.getDate()}
                </Text>
              </View>
              {dayEntries.slice(0, 4).map((e) => (
                <TouchableOpacity
                  key={e.id}
                  style={[styles.weekEventChip, { backgroundColor: TYPE_COLOR[e.type] }]}
                  onPress={() => e.navigateTo ? router.push(e.navigateTo as never) : undefined}
                  activeOpacity={0.8}
                >
                  <Text style={styles.weekEventText} numberOfLines={1}>{e.title}</Text>
                </TouchableOpacity>
              ))}
              {dayEntries.length > 4 && (
                <Text style={styles.moreEvents}>+{dayEntries.length - 4} more</Text>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ── DayView ───────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6am–11pm

function DayView({ currentDate, entries, router }: { currentDate: Date; entries: Map<string, CalendarEntry[]>; router: ReturnType<typeof useRouter> }) {
  const key = toDateKey(currentDate);
  const dayEntries = entries.get(key) ?? [];
  const allDayEntries = dayEntries.filter((e) => e.allDay);
  const timedEntries = dayEntries.filter((e) => !e.allDay && e.time);
  const untimedEntries = dayEntries.filter((e) => !e.allDay && !e.time);

  return (
    <ScrollView style={styles.dayScrollView}>
      {/* All-day section */}
      {allDayEntries.length > 0 && (
        <View style={styles.allDaySection}>
          <Text style={styles.allDayLabel}>All Day</Text>
          {allDayEntries.map((e) => (
            <EventChip key={e.id} entry={e} onPress={() => e.navigateTo ? router.push(e.navigateTo as never) : undefined} />
          ))}
        </View>
      )}

      {/* Untimed events */}
      {untimedEntries.length > 0 && (
        <View style={styles.allDaySection}>
          {untimedEntries.map((e) => (
            <EventChip key={e.id} entry={e} onPress={() => e.navigateTo ? router.push(e.navigateTo as never) : undefined} />
          ))}
        </View>
      )}

      {/* Time slots */}
      {HOURS.map((hour) => {
        const hourStr = `${hour.toString().padStart(2, '0')}:00`;
        const slotEntries = timedEntries.filter((e) => e.time?.startsWith(hour.toString().padStart(2, '0')));
        return (
          <View key={hour} style={styles.timeSlotRow}>
            <Text style={styles.timeLabel}>{hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`}</Text>
            <View style={styles.timeSlotContent}>
              {slotEntries.map((e) => (
                <EventChip key={e.id} entry={e} onPress={() => e.navigateTo ? router.push(e.navigateTo as never) : undefined} />
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  const items: [CalendarEntryType, string][] = [
    ['task', 'Tasks'],
    ['habit', 'Habits'],
    ['life_event', 'Life Events'],
    ['birthday', 'Birthdays'],
    ['holiday', 'Holidays'],
  ];
  return (
    <View style={styles.legend}>
      {items.map(([type, label]) => (
        <View key={type} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: TYPE_COLOR[type] }]} />
          <Text style={styles.legendLabel}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

// ── CalendarScreen ─────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { fetch: fetchTasks } = useTaskStore();
  const { fetch: fetchHabits } = useHabitStore();
  const { fetch: fetchLifeEvents } = useLifeEventStore();
  const { fetch: fetchContacts } = useContactStore();
  const { fetch: fetchPrefs } = useUserPreferencesStore();

  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (!user) return;
    fetchTasks();
    fetchHabits(user.id);
    fetchLifeEvents(user.id);
    fetchContacts(user.id);
    fetchPrefs(user.id);
  }, [user]);

  const entries = useCalendarEntries();

  const navigatePrev = useCallback(() => {
    if (viewMode === 'month') setCurrentDate((d) => subMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  }, [viewMode]);

  const navigateNext = useCallback(() => {
    if (viewMode === 'month') setCurrentDate((d) => addMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  }, [viewMode]);

  const goToday = useCallback(() => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  }, []);

  const periodLabel = useMemo(() => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'EEEE, MMM d');
  }, [viewMode, currentDate]);

  const selectedDayEntries = entries.get(toDateKey(selectedDate)) ?? [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Calendar</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.todayBtn} onPress={goToday}>
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings' as never)}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* View mode switcher */}
        <View style={styles.viewSwitcher}>
          {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[styles.viewTab, viewMode === mode && styles.viewTabActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.viewTabText, viewMode === mode && styles.viewTabTextActive]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Navigation */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={navigatePrev}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.periodLabel}>{periodLabel}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={navigateNext}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Calendar grid */}
        <View style={styles.calendarCard}>
          {viewMode === 'month' && (
            <MonthView
              currentDate={currentDate}
              selectedDate={selectedDate}
              onSelectDate={(d) => { setSelectedDate(d); setCurrentDate(d); }}
              entries={entries}
            />
          )}
          {viewMode === 'week' && (
            <WeekView currentDate={currentDate} entries={entries} router={router} />
          )}
          {viewMode === 'day' && (
            <DayView currentDate={currentDate} entries={entries} router={router} />
          )}
        </View>

        {/* Selected day events (month view only) */}
        {viewMode === 'month' && (
          <View style={styles.selectedDaySection}>
            <Text style={styles.selectedDayTitle}>{format(selectedDate, 'EEEE, MMMM d')}</Text>
            {selectedDayEntries.length === 0 ? (
              <Text style={styles.emptyDay}>Nothing scheduled</Text>
            ) : (
              selectedDayEntries.map((e) => (
                <EventChip
                  key={e.id}
                  entry={e}
                  onPress={() => e.navigateTo ? router.push(e.navigateTo as never) : undefined}
                />
              ))
            )}
          </View>
        )}

        {/* Legend */}
        <Legend />
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#1f2937' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  todayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#eef2ff' },
  todayBtnText: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
  settingsBtn: { padding: 6 },
  settingsIcon: { fontSize: 20 },

  viewSwitcher: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 10, padding: 3, marginBottom: 12 },
  viewTab: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 8 },
  viewTabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  viewTabText: { fontSize: 13, fontWeight: '500', color: '#6b7280' },
  viewTabTextActive: { color: '#1f2937', fontWeight: '600' },

  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 },
  navBtn: { padding: 8 },
  navArrow: { fontSize: 24, color: '#6366f1', fontWeight: '300' },
  periodLabel: { fontSize: 15, fontWeight: '600', color: '#1f2937' },

  body: { flex: 1 },
  calendarCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },

  // Month grid
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekdayLabel: { width: DAY_CELL_SIZE, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: DAY_CELL_SIZE, height: DAY_CELL_SIZE, alignItems: 'center', paddingTop: 4, borderRadius: 8 },
  dayCellSelected: { backgroundColor: '#eef2ff' },
  dayNumber: { fontSize: 13, color: '#374151', fontWeight: '500' },
  dayNumberFaded: { color: '#d1d5db' },
  dayNumberToday: { color: '#6366f1', fontWeight: '700' },
  dayNumberSelected: { color: '#6366f1' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2, justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 2.5 },

  // Week grid
  weekGrid: { flexDirection: 'row' },
  weekDayCol: { paddingHorizontal: 2 },
  weekDayHeader: { alignItems: 'center', paddingVertical: 6, borderRadius: 8, marginBottom: 4 },
  weekDayHeaderToday: { backgroundColor: '#eef2ff' },
  weekDayLabel: { fontSize: 10, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase' },
  weekDayLabelToday: { color: '#6366f1' },
  weekDayNum: { fontSize: 15, fontWeight: '600', color: '#374151', marginTop: 2 },
  weekDayNumToday: { color: '#6366f1' },
  weekEventChip: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, marginBottom: 2 },
  weekEventText: { fontSize: 9, color: '#fff', fontWeight: '500' },
  moreEvents: { fontSize: 9, color: '#9ca3af', textAlign: 'center', marginTop: 2 },

  // Day view
  dayScrollView: { maxHeight: 400 },
  allDaySection: { paddingHorizontal: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', marginBottom: 4 },
  allDayLabel: { fontSize: 10, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 },
  timeSlotRow: { flexDirection: 'row', minHeight: 36, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#f3f4f6' },
  timeLabel: { width: 44, fontSize: 11, color: '#9ca3af', paddingTop: 4, paddingLeft: 4 },
  timeSlotContent: { flex: 1, paddingLeft: 4 },

  // Event chips
  eventChip: { borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 3 },
  eventChipText: { fontSize: 12, fontWeight: '500' },
  emptyDay: { fontSize: 13, color: '#9ca3af', fontStyle: 'italic', textAlign: 'center', paddingVertical: 12 },

  // Selected day
  selectedDaySection: { marginHorizontal: 16, marginTop: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  selectedDayTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 10 },

  // Legend
  legend: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, marginTop: 12, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: '#6b7280' },
});
