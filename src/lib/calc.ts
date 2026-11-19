import { addDays, parseISO, subDays, format } from "date-fns";
import type { Goal, Habit, HabitLog, Routine, RoutineOverride, StudySession, Task } from "./types";
import { minutes } from "./dates";
const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export const percent = (done: number, total: number) => (total <= 0 ? 0 : Math.round((done / total) * 100));

export function goalProgress(g: Pick<Goal, "steps" | "status" | "manualProgress">): number {
  if (g.status === "concluida") return 100;
  if (g.steps.length) return percent(g.steps.filter((s) => s.done).length, g.steps.length);
  return Math.max(0, Math.min(100, g.manualProgress ?? 0));
}

export const habitDueOn = (h: Pick<Habit, "weekdays">, date: string) => h.weekdays.length === 0 || h.weekdays.includes(parseISO(date).getDay());

/** Sequência atual: dias devidos consecutivos concluídos até hoje (hoje pendente não quebra). */
export function habitStreak(h: Pick<Habit, "weekdays" | "id">, logs: Pick<HabitLog, "habitId" | "date">[], today: string): number {
  const done = new Set(logs.filter((l) => l.habitId === h.id).map((l) => l.date));
  let d = parseISO(today); let streak = 0;
  if (!done.has(today)) d = subDays(d, 1);
  for (let i = 0; i < 730; i++) {
    const key = ymd(d);
    if (habitDueOn(h, key)) { if (done.has(key)) streak++; else break; }
    d = subDays(d, 1);
  }
  return streak;
}

export function habitConsistency(h: Pick<Habit, "weekdays" | "id">, logs: Pick<HabitLog, "habitId" | "date">[], today: string, days = 30): number {
  const done = new Set(logs.filter((l) => l.habitId === h.id).map((l) => l.date));
  let due = 0, hit = 0;
  for (let i = 0; i < days; i++) { const key = ymd(subDays(parseISO(today), i)); if (habitDueOn(h, key)) { due++; if (done.has(key)) hit++; } }
  return percent(hit, due);
}

export interface Occurrence { routine: Routine; date: string; title: string; start: string; end: string }
export function routineOccurrence(r: Routine, date: string): Occurrence | null {
  if (r.startDate && date < r.startDate) return null;
  if (r.endDate && date > r.endDate) return null;
  if (!r.weekdays.includes(parseISO(date).getDay())) return null;
  const o: RoutineOverride = r.overrides?.[date] ?? {};
  if (o.skipped) return null;
  return { routine: r, date, title: o.title ?? r.title, start: o.start ?? r.start, end: o.end ?? r.end };
}
export const occurrencesOn = (rs: Routine[], date: string) => rs.map((r) => routineOccurrence(r, date)).filter((o): o is Occurrence => !!o).sort((a, b) => a.start.localeCompare(b.start));

export const sessionHours = (s: Pick<StudySession, "start" | "end">) => Math.max(0, minutes(s.end) - minutes(s.start)) / 60;
export const studyHours = (ss: Pick<StudySession, "start" | "end" | "done">[]) => Math.round(ss.filter((s) => s.done).reduce((a, s) => a + sessionHours(s), 0) * 10) / 10;

export function taskSummary(tasks: Pick<Task, "status" | "date">[], date: string) {
  const day = tasks.filter((t) => t.date === date); const done = day.filter((t) => t.status === "concluida").length;
  return { total: day.length, done, pct: percent(done, day.length) };
}

export const lastNDays = (today: string, n: number) => Array.from({ length: n }, (_, i) => ymd(addDays(subDays(parseISO(today), n - 1), i)));
