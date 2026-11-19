import { describe, it, expect } from "vitest";
import { validateBackup } from "./backup";

const ok = { app: "MList", version: 1, exportedAt: "", data: { tasks: [{ id: "a", createdAt: 1, updatedAt: 1, title: "T" }] } };
describe("validação de backup", () => {
  it("aceita backup válido", () => { const r = validateBackup(ok); expect(r.ok).toBe(true); expect(r.counts.tasks).toBe(1); });
  it("rejeita arquivo de outro app", () => expect(validateBackup({ ...ok, app: "X" }).ok).toBe(false));
  it("rejeita versão futura", () => expect(validateBackup({ ...ok, version: 99 }).ok).toBe(false));
  it("ignora duplicados e inválidos", () => {
    const r = validateBackup({ ...ok, data: { tasks: [ok.data.tasks[0], ok.data.tasks[0], { id: "b" }], moods: [{ id: "m", createdAt: 1, updatedAt: 1, date: "2026-11-19", value: 9 }] } });
    expect(r.counts.tasks).toBe(1); expect(r.counts.moods).toBe(0); expect(r.skipped).toBe(3);
  });
  it("rejeita lista malformada", () => expect(validateBackup({ ...ok, data: { tasks: "x" } }).ok).toBe(false));
  it("nunca importa configuração de bloqueio", () => expect(validateBackup({ ...ok, settings: [{ key: "lock", value: 1 }, { key: "tema", value: 2 }] }).settings).toEqual([{ key: "tema", value: 2 }]));
});
