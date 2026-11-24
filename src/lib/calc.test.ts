import { describe, it, expect } from "vitest";
import { goalProgress, routineOccurrence, studyHours, taskSummary, percent } from "./calc";
import type { Routine } from "./types";

describe("cálculos", () => {
  it("percentual com total zero é 0", () => expect(percent(0, 0)).toBe(0));
  it("progresso de meta usa etapas", () => expect(goalProgress({ status: "em-andamento", steps: [{ id: "1", title: "a", done: true }, { id: "2", title: "b", done: false }] })).toBe(50));
  it("meta concluída é 100%", () => expect(goalProgress({ status: "concluida", steps: [] })).toBe(100));
  it("ocorrência de rotina respeita exceção e fim", () => {
    const r: Routine = { id: "r", createdAt: 0, updatedAt: 0, title: "Yoga", start: "07:00", end: "08:00", weekdays: [4], template: "personalizado", overrides: { "2026-11-26": { skipped: true } }, endDate: "2026-12-31" };
    expect(routineOccurrence(r, "2026-11-19")?.title).toBe("Yoga");
    expect(routineOccurrence(r, "2026-11-26")).toBeNull();
    expect(routineOccurrence(r, "2027-01-07")).toBeNull();
  });
  it("horas de estudo somam só sessões concluídas", () => expect(studyHours([{ start: "08:00", end: "09:30", done: true }, { start: "10:00", end: "11:00", done: false }])).toBe(1.5));
  it("resumo de tarefas do dia", () => expect(taskSummary([{ date: "d", status: "concluida" }, { date: "d", status: "pendente" }, { date: "x", status: "pendente" }], "d")).toEqual({ total: 2, done: 1, pct: 50 }));
});
