import { addDays, format, parseISO, startOfWeek } from "date-fns";
import type { Goal, Routine, RoutineLog, StudySession, Task } from "./types";
import { goalProgress, occurrencesOn, percent, studyHours } from "./calc";
const ymd = (d: Date) => format(d, "yyyy-MM-dd");
export const weekDates = (anyDay: string) => { const s = startOfWeek(parseISO(anyDay), { weekStartsOn: 1 }); return Array.from({ length: 7 }, (_, i) => ymd(addDays(s, i))); };
export interface WeekStats { tasksDone: number; tasksTotal: number; routineDone: number; routinePlanned: number; studyHours: number }
/** Estatísticas de uma semana (seg–dom), calculadas só dos dados salvos. */
export function weekStats(days: string[], d: { tasks: Pick<Task, "date" | "status">[]; routines: Routine[]; logs: Pick<RoutineLog, "routineId" | "date">[]; sessions: Pick<StudySession, "date" | "start" | "end" | "done">[] }): WeekStats {
  const set = new Set(days); const tasks = d.tasks.filter((t) => t.date && set.has(t.date));
  let planned = 0, done = 0;
  for (const day of days) for (const o of occurrencesOn(d.routines, day)) { planned++; if (d.logs.some((l) => l.routineId === o.routine.id && l.date === day)) done++; }
  return { tasksDone: tasks.filter((t) => t.status === "concluida").length, tasksTotal: tasks.length, routineDone: done, routinePlanned: planned, studyHours: studyHours(d.sessions.filter((s) => set.has(s.date))) };
}
export function goalsSummary(goals: Pick<Goal, "steps" | "status" | "manualProgress">[]) {
  const done = goals.filter((g) => g.status === "concluida").length;
  const avg = goals.length ? Math.round(goals.reduce((a, g) => a + goalProgress(g), 0) / goals.length) : 0;
  return { total: goals.length, done, avg, pct: percent(done, goals.length) };
}
