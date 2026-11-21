import { describe, it, expect } from "vitest";
import { habitDueOn, habitsDueOn, occurrencesOn, routineDayProgress, routineOccurrence, validateRoutine } from "./calc";
import type { Routine } from "./types";

const r = (p: Partial<Routine> = {}): Routine => ({ id: "r", createdAt: 0, updatedAt: 0, title: "Academia", start: "07:00", end: "08:00", weekdays: [1, 3, 5], template: "personalizado", overrides: {}, ...p });

describe("rotina", () => {
  it("aparece só nos dias da semana escolhidos", () => {
    expect(routineOccurrence(r(), "2026-11-16")).not.toBeNull(); // segunda
    expect(routineOccurrence(r(), "2026-11-17")).toBeNull(); // terça
  });
  it("respeita período de vigência", () => {
    expect(routineOccurrence(r({ startDate: "2026-11-20" }), "2026-11-18")).toBeNull();
    expect(routineOccurrence(r({ endDate: "2026-11-17" }), "2026-11-18")).toBeNull();
  });
  it("ajuste de um dia muda só aquele dia", () => {
    const x = r({ overrides: { "2026-11-16": { start: "09:00", end: "10:00" } } });
    expect(routineOccurrence(x, "2026-11-16")?.start).toBe("09:00");
    expect(routineOccurrence(x, "2026-11-18")?.start).toBe("07:00");
  });
  it("dia pulado não aparece", () => expect(routineOccurrence(r({ overrides: { "2026-11-16": { skipped: true } } }), "2026-11-16")).toBeNull());
  it("ordena por horário", () => {
    const list = occurrencesOn([r({ id: "a", start: "10:00", end: "11:00" }), r({ id: "b" })], "2026-11-16");
    expect(list.map((o) => o.routine.id)).toEqual(["b", "a"]);
  });
  it("progresso do dia conta concluídas", () => {
    const occ = occurrencesOn([r({ id: "a" }), r({ id: "b" })], "2026-11-16");
    expect(routineDayProgress(occ, [{ routineId: "a", date: "2026-11-16" }, { routineId: "a", date: "2026-11-18" }])).toEqual({ total: 2, done: 1, pct: 50 });
  });
  it("validação", () => {
    expect(validateRoutine({ title: "", start: "07:00", end: "08:00", weekdays: [1] })).toBe("Informe um título.");
    expect(validateRoutine({ title: "a", start: "08:00", end: "07:00", weekdays: [1] })).toMatch(/fim/);
    expect(validateRoutine({ title: "a", start: "07:00", end: "08:00", weekdays: [] })).toMatch(/dia/);
    expect(validateRoutine({ title: "a", start: "07:00", end: "08:00", weekdays: [1] })).toBeNull();
  });
});

describe("hábitos", () => {
  it("sem dias escolhidos = todo dia", () => expect(habitDueOn({ weekdays: [] }, "2026-11-17")).toBe(true));
  it("arquivados não aparecem no dia", () => {
    expect(habitsDueOn([{ weekdays: [], archived: true }, { weekdays: [2] }, { weekdays: [1] }], "2026-11-17")).toHaveLength(1);
  });
});
