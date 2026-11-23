import { describe, expect, it } from "vitest";
import { moodStats, searchEntries } from "./journal";
import { encryptWith, decryptWith } from "./crypto";
import type { JournalEntry, MoodEntry } from "./types";

const e = (id: string, date: string, title: string, content: string, enc?: boolean): JournalEntry => ({ id, date, title, content, private: !!enc, enc: enc ? { iv: "x", data: "y" } : undefined, createdAt: 0, updatedAt: 0 });
describe("diário", () => {
  it("busca ignora entradas privadas e ordena por data desc", () => {
    const list = [e("1", "2026-01-01", "Praia", "sol"), e("2", "2026-02-01", "", "", true), e("3", "2026-03-01", "Trabalho", "praia amanhã")];
    expect(searchEntries(list, "praia").map((x) => x.id)).toEqual(["3", "1"]);
    expect(searchEntries(list, "").map((x) => x.id)).toEqual(["3", "2", "1"]);
  });
  it("criptografia ida e volta", async () => {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    const p = await encryptWith(key, "segredo");
    expect(p.data).not.toContain("segredo");
    expect(await decryptWith(key, p)).toBe("segredo");
  });
});
describe("humor", () => {
  it("conta estados e calcula média", () => {
    const m = (v: 1 | 2 | 3 | 4 | 5): MoodEntry => ({ id: String(v) + Math.random(), date: "2026-01-01", value: v, createdAt: 0, updatedAt: 0 });
    const s = moodStats([m(5), m(4), m(4), m(1)]);
    expect(s.counts[4]).toBe(2); expect(s.counts[3]).toBe(0); expect(s.avg).toBe(3.5); expect(s.total).toBe(4);
  });
});
