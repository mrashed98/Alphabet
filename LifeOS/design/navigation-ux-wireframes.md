# LifeOS — Navigation & UX Wireframes
**Designer:** Tasks Designer · **Date:** 2026-03-22 · **Issue:** LOG-9

---

## 1. Design Tokens

| Token | Value | Usage |
|---|---|---|
| `primary` | `#6366f1` | Active tab, CTAs, checkboxes, focus rings |
| `primary-light` | `#eef2ff` | Pill backgrounds, selected chip |
| `surface` | `#ffffff` | Cards, sheets, modals |
| `background` | `#f9fafb` | Screen background |
| `border` | `#e5e7eb` | Card borders, dividers |
| `text-primary` | `#1f2937` | Headings, body copy |
| `text-secondary` | `#6b7280` | Labels, meta |
| `text-muted` | `#9ca3af` | Empty states, placeholders |
| `success` | `#22c55e` | Done state, streaks |
| `success-bg` | `#f0fdf4` | Done-state card fill |
| `warning` | `#f97316` | Streak counter, overdue accent |
| `danger` | `#ef4444` | Critical priority, destructive |
| `priority-critical` | `#ef4444` | — |
| `priority-high` | `#f97316` | — |
| `priority-medium` | `#eab308` | — |
| `priority-low` | `#22c55e` | — |

**Typography**
- Screen title: `fontSize 28, fontWeight 700, color text-primary`
- Section label: `fontSize 12, fontWeight 700, color text-secondary, textTransform uppercase, letterSpacing 0.8`
- Body: `fontSize 15, fontWeight 500, color text-primary`
- Meta: `fontSize 12, color text-muted`

**Radii & spacing**
- Card: `borderRadius 12` · Large card/sheet: `borderRadius 16` · Chip: `borderRadius 20`
- Touch target minimum: 44pt height (per iOS HIG / Material)
- Horizontal screen padding: `16`

---

## 2. Global Navigation — Tab Bar

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   (screen content)                                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│ ──────────── bottom safe area ────────────────────  │
│  ☀️      ✅      🔥      📅      📝               │
│ Today  Tasks  Habits  Calendar  Notes               │
└─────────────────────────────────────────────────────┘
```

**Tab bar spec**
- `backgroundColor: #ffffff`
- `borderTopWidth: 1, borderTopColor: #f3f4f6`
- `height: 60` + safe-area bottom inset
- `paddingBottom: 8`
- Active icon/label: `#6366f1`
- Inactive icon/label: `#9ca3af, opacity 0.5`
- Label: `fontSize 12, fontWeight 500`
- Icon font size: `22`

**Order:** Today · Tasks · Habits · Calendar · Notes (fixed, no reorder)

---

## 3. Today View

```
┌─────────────────────────────────────────────────────┐
│ Sunday, March 22          [🔔 notification bell]   │
│ Good morning, Alex                                  │
│                                                     │
│ ─── HABITS ─────────────────────────────────────── │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ( )  Meditate                          🔥 7    │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ (✓)  Exercise                          🔥 14   │ │  ← done: green bg
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ─── TODAY'S TASKS (3) ──────────────────────────── │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ● Review PR #42         [medium] [Acme Corp]   │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ● Submit invoice        [high]   [Freelance]   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ─── OVERDUE (1) ─────────────────────────────────── │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ● Fix login bug         [critical][Startup]     │ │  ← red bg tint
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ─── UPCOMING REMINDERS ─────────────────────────── │
│  🎂  Mom's birthday in 3 days                      │
│  💍  Wedding anniversary — Apr 2                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Component specs

**Header**
- Date line: `fontSize 14, color text-secondary, fontWeight 500`
- Greeting: `fontSize 26, fontWeight 700, color text-primary`
- Notification bell icon (top-right): 44×44 touch target, badge dot when unread

**Habit row** (`height ≥ 56`)
- Circle checkbox: `22×22, borderRadius 11, borderWidth 2, borderColor primary`
  - Done state: filled `primary`, white checkmark
- Title: body text
- Streak badge: `🔥 {n}`, `fontSize 13, fontWeight 600, color #f97316`
- Done state: card `backgroundColor: success-bg, borderColor: #86efac`
- Tap = toggle completion (optimistic update)

**Task row** (`height ≥ 52`)
- Priority dot: `8×8, borderRadius 4` using priority color
- Title: body text, `flex 1`
- Context chip (project/company): pill, `fontSize 11, borderRadius 10, paddingH 8, paddingV 3`
  - Background: hashed from project color or gray `#f3f4f6`
- Overdue row: `backgroundColor: #fff7f7, borderColor: #fecaca`

**Upcoming reminders** (new section)
- Each row: icon emoji + label string
- `fontSize 14, color text-secondary`
- Max 3 shown; "See all" link to Calendar

**Empty state (no tasks/habits)**
```
        🌅
   All clear for today!
   Add a task in the Tasks tab.
```
- Icon `fontSize 48`
- Message `fontSize 16, fontWeight 600, color text-primary`
- Sub `fontSize 14, color text-muted`

---

## 4. Tasks View

```
┌─────────────────────────────────────────────────────┐
│ Tasks                               [🔍] [+ Add]   │
│                                                     │
│  ┌─ Context switcher ───────────────────────────┐  │
│  │  All  │ Acme Corp  │ Freelance  │ Personal    │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ─ Active (8) ────────────────────────────────────  │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ( ) Review PR #42              medium  3/22    │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ( ) Submit invoice             high    3/23    │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ( ) Fix login bug (overdue)  critical  3/20  ⚠ │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  ─ Done (5)  [show ▾] ─────────────────────────────  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Context switcher (company/project filter)

```
┌────────────────────────────────────────────┐
│  All  │ Acme Corp  │ Freelance  │ Personal  │
└────────────────────────────────────────────┘
```
- Horizontal scroll row of chips
- Chip: `height 34, borderRadius 17, paddingH 14`
- **Selected:** `backgroundColor: primary, color #fff`
- **Unselected:** `backgroundColor: #f3f4f6, color text-secondary`
- Chips sourced from all distinct `project.company` values + "All" sentinel
- Tapping a chip filters the task list below

### Task card spec

```
┌──────────────────────────────────────────────────┐
│  ( )  Task title                   [badge] [date] │
│       Project name · Company                      │
└──────────────────────────────────────────────────┘
```
- Checkbox: `24×24, borderRadius 12, borderWidth 2, borderColor #d1d5db`
  - Tap → toggle done (optimistic, strikethrough + gray)
  - Done: `backgroundColor primary, borderColor primary`, white checkmark
- Title row: body text, `flex 1`
- Subtitle: `fontSize 12, color text-muted` — project + company if set
- Priority badge: colored pill `fontSize 11`
- Due date: `fontSize 12, color text-muted`
  - Overdue: `color danger (#ef4444), fontWeight 600`
  - ⚠ icon shown for overdue
- Long-press → context menu: Edit / Move to project / Set priority / Delete

### "Done" section
- Collapsible; collapsed by default when ≥ 3 done items
- Header shows count; chevron toggles
- Done items shown with strikethrough title, opacity 0.5

### "+ Add" quick-capture flow

1. Tap `+ Add` → bottom sheet slides up
2. Sheet content:

```
┌─────────────────────────────────────────────────┐
│  New Task                              [✕]       │
│  ┌──────────────────────────────────────────┐   │
│  │  Task title…                             │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  Priority:  [low] [medium●] [high] [critical]  │
│                                                 │
│  Due date:  [No date ▸]                        │
│                                                 │
│  Project:   [None ▸]                           │
│                                                 │
│  ────────────────────────────────────────────   │
│              [Cancel]     [Add Task]            │
└─────────────────────────────────────────────────┘
```
- Title input: autoFocus, `returnKeyType="done"` triggers save
- Priority selector: segmented row of 4 labeled pills, default medium
- Due date: taps into native date picker
- Project: taps into project picker sheet (list of projects with company grouping)
- `Add Task` button: `backgroundColor primary, borderRadius 12`
- Keyboard pushes sheet up (KeyboardAvoidingView)

### Task detail / edit view (pushed screen)

```
┌────────────────────────────────────────────────────┐
│ ← Back                             [Delete 🗑]    │
│                                                    │
│  [ Task title (editable inline) ]                 │
│                                                    │
│  ─ Details ──────────────────────────────────────  │
│  Status     ○ Todo   ● In Progress  ○ Done        │
│  Priority   ○ Low    ● Medium       ○ High  ○ Crit │
│  Due date   Mar 23, 2026                          │
│  Project    Acme Corp / Sprint 4                  │
│                                                    │
│  ─ Description ──────────────────────────────────  │
│  [ multiline text area, placeholder "Add notes…" ] │
│                                                    │
└────────────────────────────────────────────────────┘
```
- Changes auto-save on blur (no explicit Save button)
- Swipe-left on list row → quick Delete with confirmation alert

---

## 5. Habits View

```
┌─────────────────────────────────────────────────────┐
│ Habits                                  [+ Add]    │
│                                                     │
│  Today's progress  ──────────── 2 / 4  [50%]      │
│  ████████░░░░░░░░  (progress bar, primary fill)    │
│                                                     │
│  ┌─────────────────────────────────────────────────┐ │
│  │  ◯  Meditate              streak  7 🔥         │ │
│  │     Daily · Mon–Sun       ─────────────────     │ │
│  │     M  T  W  T  F  S  S                        │ │
│  │     ✓  ✓  ✓  ✓  ✓  ✗  ─                        │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │  ◉  Exercise              streak  14 🔥        │ │  ← done: green
│  │     Daily · Mon–Sun       ─────────────────     │ │
│  │     M  T  W  T  F  S  S                        │ │
│  │     ✓  ✓  ✓  ✓  ✓  ✓  ✓                        │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Progress bar
- Full-width horizontal bar, `height 8, borderRadius 4`
- Fill: `primary` color, width = `completedToday / total * 100%`
- Label: `{completed} / {total}` right-aligned, `fontSize 13, fontWeight 600`

### Habit card spec
- Circle toggle: `32×32, borderRadius 16, borderWidth 2, borderColor primary`
  - Done: filled primary, white checkmark `fontSize 16`
- Name: `fontSize 16, fontWeight 500`
  - Done: `color success (#16a34a)`
- Streak: right side — number `fontSize 20, fontWeight 700, color #f97316` + `🔥 streak` label `fontSize 11, color text-muted`
- Mini week grid (last 7 days): 7 cells, `✓` = completed, `✗` = missed, `─` = future/scheduled off
  - Cell size: `20×20`, `fontSize 11`
  - Completed cell: `color primary, fontWeight 700`
  - Missed: `color danger`
  - Off-day: `color text-muted`
- Card done state: `backgroundColor success-bg, borderColor #86efac`
- Long-press → Edit / Set frequency / Delete

### Add Habit sheet

```
┌────────────────────────────────────────────────┐
│  New Habit                          [✕]        │
│  ┌──────────────────────────────────────────┐  │
│  │  e.g. Meditate, Exercise, Read…          │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Frequency:  [Daily●]  [Weekly]               │
│                                                │
│  (Weekly shows day-of-week toggles:)           │
│   M  T  W  T  F  S  S                         │
│  [✓][✓][✓][✓][✓][ ][ ]                        │
│                                                │
│  ───────────────────────────────────────────   │
│           [Cancel]    [Add Habit]             │
└────────────────────────────────────────────────┘
```

---

## 6. Calendar View

```
┌─────────────────────────────────────────────────────┐
│ Calendar                       [< March 2026 >]    │
│                                                     │
│  Su  Mo  Tu  We  Th  Fr  Sa                        │
│   1   2   3   4   5   6   7                        │
│   8   9  10  11  12  13  14                        │
│  15  16  17  18  19  20  21                        │
│ [22] 23  24  25  26  27  28   ← today = highlighted │
│  29  30  31                                        │
│                                                     │
│  ─── Events · March 22 ──────────────────────────  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 09:00  Standup               [Work]          │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ All day  Review PR #42 (task)  [Acme Corp]  │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🎂  Mom's birthday              (reminder)   │  │
│  └──────────────────────────────────────────────┘  │
│                                          [+ Event] │
└─────────────────────────────────────────────────────┘
```

### Month grid
- 7-column grid, row height `44`, cell width = screen width / 7
- Today: circle badge, `backgroundColor primary, color #fff`
- Selected day: `backgroundColor primary-light (#eef2ff), color primary`
- Dot indicators below date number (max 3):
  - Blue dot = event
  - Indigo dot = task due
  - Orange dot = reminder/life-event
- Prev/next month: `<` `>` chevron buttons, `40×40` touch target

### Day event list
- Appears below calendar grid
- Sorted: all-day first, then by start time
- Event row: `time | title | context chip`
  - Time column: `fontSize 12, color text-secondary, width 48`
  - Title: body text, `flex 1`
  - Context chip: project or category tag

**Event types in unified list:**
| Type | Icon | Color accent |
|---|---|---|
| Calendar event | — | blue left border |
| Task due | ✅ | indigo left border |
| Habit reminder | 🔥 | orange left border |
| Birthday / life event | 🎂 🎉 | pink left border |
| Anniversary | 💍 | rose left border |
| Holiday | 🎌 | teal left border |

**Left border spec:** `width 3, borderRadius 2, height '80%'`, vertically centered

### Add Event sheet
```
┌────────────────────────────────────────────────┐
│  New Event                          [✕]        │
│  Title ────────────────────────────────────    │
│  ┌──────────────────────────────────────────┐  │
│  │  Event title…                            │  │
│  └──────────────────────────────────────────┘  │
│  All day  [toggle]                             │
│  Start    Mar 22, 2026  09:00                 │
│  End      Mar 22, 2026  10:00                 │
│  Location ─────────────────────────────────    │
│  Notes    ─────────────────────────────────    │
│  ──────────────────────────────────────────    │
│          [Cancel]      [Add Event]            │
└────────────────────────────────────────────────┘
```

---

## 7. Notes View

```
┌─────────────────────────────────────────────────────┐
│ Notes                        [🔍 Search]  [+ New]  │
│                                                     │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Sprint planning notes                          │ │
│  │ Updated Mar 21 · Linked: Fix login bug          │ │
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Weekly goals                                   │ │
│  │ Updated Mar 19                                 │ │
│  └─────────────────────────────────────────────────┘ │
│                                                     │
│  (empty state when no notes)                       │
│         📝                                         │
│    No notes yet                                    │
│    Tap + New to capture a thought.                 │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Note card
- Title: `fontSize 16, fontWeight 600, color text-primary`
- Subtitle: `fontSize 12, color text-muted` — "Updated {date}" + linked task if set
- `borderRadius 12, backgroundColor surface, borderWidth 1, borderColor border`
- Tap → Note editor (pushed screen)

### Note editor (pushed screen)
```
┌────────────────────────────────────────────────────┐
│ ← Notes                        [Link task] [🗑]   │
│                                                    │
│  [ Title (large, editable) ]                      │
│                                                    │
│  [ Body — multiline, plain text, autogrows ]      │
│                                                    │
│  ─ Linked Task ─────────────────────────────────   │
│  ┌──────────────────────────────────────────────┐  │
│  │  ✅  Fix login bug  (tap to view)            │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```
- Title: `fontSize 22, fontWeight 700` inline edit
- Body: `fontSize 16, lineHeight 24` multiline text area, no border styling
- Auto-save on text change (debounced 500 ms)
- "Link task" button → task picker sheet
- Keyboard toolbar: Bold / List (future phase)

---

## 8. Global Patterns

### Quick-capture FAB (future — Phase 2)
When implemented:
- Fixed `+` button, bottom-right, `56×56, borderRadius 28, backgroundColor primary`
- Tap → bottom sheet with type picker: Task / Event / Note / Reminder

### Bottom sheet pattern
```
┌─────────────────────────────────────────────────────┐
│                  ── handle ──                       │
│                                                     │
│  Sheet title                            [✕]        │
│                                                     │
│  (content)                                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```
- Drag handle: `40×4, borderRadius 2, backgroundColor #d1d5db`, centered top
- Top corners: `borderTopLeftRadius 20, borderTopRightRadius 20`
- Backdrop: `rgba(0,0,0,0.4)`, tap closes
- `animationType="slide"` (React Native Modal)

### Loading state
```
┌──────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────┐  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  │  ← skeleton pulse
│  └─────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────┐  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░                  │  │
│  └─────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```
- Skeleton shimmer: `backgroundColor #f3f4f6`, animated opacity 0.4–1 loop, `duration 800ms`
- Show skeleton after 200 ms delay (prevent flash for fast loads)

### Empty state pattern
```
          [Icon — 48pt emoji or SF Symbol]
          [Primary message — 16pt semibold]
          [Secondary hint — 14pt muted]
          [CTA button — if applicable]
```
All centered, `paddingTop: 80`

| Screen | Icon | Primary | Secondary | CTA |
|---|---|---|---|---|
| Tasks (all) | ✅ | "No tasks yet" | "Tap + Add to get started." | — |
| Tasks (filtered) | 🔍 | "No tasks here" | "Try a different filter." | — |
| Habits | 🔥 | "No habits yet" | "Add your first habit!" | — |
| Calendar day | 📅 | "Nothing on this day" | "Tap + Event to add one." | — |
| Notes | 📝 | "No notes yet" | "Tap + New to capture a thought." | — |
| Today habits | ✨ | "All habits done!" | "Great work today." | — |
| Today tasks | 🌅 | "All clear!" | "No tasks due today." | — |

### Context chip component
```
  ┌─────────┐
  │ Acme Co │
  └─────────┘
```
- `height 22, borderRadius 11, paddingH 8`
- `fontSize 11, fontWeight 600`
- Background: derived from project color (6 preset palette: `#dbeafe, #fce7f3, #d1fae5, #fef3c7, #ede9fe, #fee2e2`)
- Text color: darkened 30% from background hue

---

## 9. Navigation Flow Map

```
                    ┌─── Tab Bar ───────────────────────────────────┐
                    │                                               │
                 Today        Tasks        Habits    Calendar    Notes
                    │            │                      │            │
                    │     ┌──────┴────────┐             │     ┌──────┴──────┐
                    │     │ Task Detail   │             │     │ Note Editor │
                    │     │ (push)        │             │     │ (push)      │
                    │     └──────┬────────┘             │     └─────────────┘
                    │            │ Back                 │
                    │     ┌──────┴────────┐         ┌───┴──────────────────┐
                    │     │ Project Picker│         │ Event Add/Edit Sheet │
                    │     │ (sheet)       │         └─────────────────────┘
                    │     └──────────────┘
                    │
              ┌─────┴────────────────┐
              │ All-up notification  │
              │ bell → Reminders     │
              │ list (push)          │
              └──────────────────────┘
```

**Screen transitions:**
- Push (detail views): horizontal slide (React Navigation stack default)
- Sheets (add/edit quick actions): `animationType="slide"` from bottom
- Tab switch: instant (no animation)

---

## 10. Accessibility

- All interactive elements: `accessibilityLabel` + `accessibilityRole`
- Touch targets: minimum `44×44pt`
- Checkboxes: announce "checked" / "unchecked" state changes
- Color is never the only information carrier — icons or text always accompany color (priority dot + badge label, streak icon + number)
- Text contrast ratios: `text-primary (#1f2937)` on `surface (#fff)` = 16.8:1 ✓; `text-secondary (#6b7280)` on `surface` = 5.8:1 ✓ (both pass AA)

---

*End of specification. Delivered to Tasks Mobile Engineer for implementation.*
