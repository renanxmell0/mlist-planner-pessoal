import { addDays, parseISO, subDays, format } from "date-fns";
import type { Goal, Routine, RoutineLog, RoutineOverride, StudySession, Task } from "./types";
import { minutes } from "./dates";
const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export const percent = (done: number, total: number) => (total <= 0 ? 0 : Math.round((done / total) * 100));

export function goalProgress(g: Pick<Goal, "steps" | "status" | "manualProgress">): number {
  if (g.status === "concluida") return 100;
  if (g.steps.length) return percent(g.steps.filter((s) => s.done).length, g.steps.length);
  return Math.max(0, Math.min(100, g.manualProgress ?? 0));
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

/** Progresso da rotina num dia: ocorrências concluídas / ocorrências previstas. */
export function routineDayProgress(occs: Pick<Occurrence, "routine" | "date">[], logs: Pick<RoutineLog, "routineId" | "date">[]) {
  const done = occs.filter((o) => logs.some((l) => l.routineId === o.routine.id && l.date === o.date)).length;
  return { total: occs.length, done, pct: percent(done, occs.length) };
}

/** Valida dados de uma rotina; retorna mensagem de erro ou null. */
export function validateRoutine(r: { title: string; start: string; end: string; weekdays: number[]; startDate?: string; endDate?: string }): string | null {
  if (!r.title.trim()) return "Informe um título.";
  if (!r.start || !r.end) return "Informe início e fim.";
  if (minutes(r.end) <= minutes(r.start)) return "O fim deve ser depois do início.";
  if (r.weekdays.length === 0) return "Escolha pelo menos um dia da semana.";
  if (r.startDate && r.endDate && r.endDate < r.startDate) return "A data final deve ser depois da inicial.";
  return null;
}

/** Progresso de um cronograma: sessões concluídas / sessões planejadas. */
export function planProgress(planId: string, ss: Pick<StudySession, "planId" | "done" | "start" | "end">[]) {
  const mine = ss.filter((s) => s.planId === planId); const done = mine.filter((s) => s.done).length;
  return { total: mine.length, done, pct: percent(done, mine.length), hours: studyHours(mine) };
}
export function validatePlan(p: { title: string; startDate: string; endDate: string }): string | null {
  if (!p.title.trim()) return "Informe um título.";
  if (!p.startDate || !p.endDate) return "Informe início e fim.";
  if (p.endDate < p.startDate) return "A data final deve ser depois da inicial.";
  return null;
}
export function validateSession(s: { subject: string; date: string; start: string; end: string }): string | null {
  if (!s.subject.trim()) return "Informe a matéria.";
  if (!s.date || !s.start || !s.end) return "Informe data, início e fim.";
  if (minutes(s.end) <= minutes(s.start)) return "O fim deve ser depois do início.";
  return null;
}
