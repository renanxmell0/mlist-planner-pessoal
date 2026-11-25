import { describe, it, expect } from "vitest";
import { weekDates, weekStats, goalsSummary } from "./progress";
describe("progresso", () => {
  it("semana começa na segunda", () => expect(weekDates("2026-11-19")[0]).toBe("2026-11-16"));
  it("conta só dados da semana", () => {
    const days = weekDates("2026-11-19");
    const r = weekStats(days, { tasks: [{ date: "2026-11-17", status: "concluida" }, { date: "2026-11-18", status: "pendente" }, { date: "2026-11-30", status: "concluida" }], routines: [{ id: "r", createdAt: 0, updatedAt: 0, title: "Y", start: "07:00", end: "08:00", weekdays: [1, 3], template: "personalizado", overrides: {} }], logs: [{ routineId: "r", date: "2026-11-16" }], sessions: [{ date: "2026-11-20", start: "08:00", end: "10:00", done: true }, { date: "2026-12-01", start: "08:00", end: "10:00", done: true }] });
    expect(r).toEqual({ tasksDone: 1, tasksTotal: 2, routineDone: 1, routinePlanned: 2, studyHours: 2 });
  });
  it("sem metas tudo é zero", () => expect(goalsSummary([])).toEqual({ total: 0, done: 0, avg: 0, pct: 0 }));
  it("média de metas", () => expect(goalsSummary([{ status: "concluida", steps: [] }, { status: "em-andamento", steps: [], manualProgress: 50 }]).avg).toBe(75));
});
