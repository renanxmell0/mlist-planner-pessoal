import { describe, it, expect } from "vitest";
import { goalProgress, planProgress, validatePlan, validateSession } from "./calc";

describe("estudos e metas", () => {
  it("progresso do cronograma conta só sessões do plano", () => {
    const ss = [{ planId: "a", done: true, start: "08:00", end: "09:00" }, { planId: "a", done: false, start: "10:00", end: "11:00" }, { planId: "b", done: true, start: "08:00", end: "10:00" }];
    expect(planProgress("a", ss)).toEqual({ total: 2, done: 1, pct: 50, hours: 1 });
  });
  it("plano com fim antes do início é inválido", () => expect(validatePlan({ title: "X", startDate: "2026-12-10", endDate: "2026-12-01" })).not.toBeNull());
  it("sessão com fim antes do início é inválida", () => expect(validateSession({ subject: "Mat", date: "2026-12-01", start: "10:00", end: "09:00" })).not.toBeNull());
  it("sessão válida", () => expect(validateSession({ subject: "Mat", date: "2026-12-01", start: "09:00", end: "10:00" })).toBeNull());
  it("meta sem etapas usa progresso manual limitado a 100", () => expect(goalProgress({ status: "em-andamento", steps: [], manualProgress: 150 })).toBe(100));
});
