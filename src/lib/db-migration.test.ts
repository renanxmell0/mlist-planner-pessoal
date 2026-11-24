import "fake-indexeddb/auto";
import Dexie from "dexie";
import { describe, expect, it } from "vitest";
import { MListDB } from "./db";

describe("migração v2", () => {
  it("apaga Diário, Hábitos, Humor e a senha, preservando o resto", async () => {
    const name = "mlist-mig-test";
    const old = new Dexie(name);
    old.version(1).stores({ tasks: "id", goals: "id", habits: "id", habitLogs: "id", journal: "id", moods: "id", settings: "key" });
    await old.open();
    await old.table("tasks").put({ id: "t1" }); await old.table("goals").put({ id: "g1" });
    await old.table("habits").put({ id: "h" }); await old.table("habitLogs").put({ id: "hl" });
    await old.table("journal").put({ id: "j" }); await old.table("moods").put({ id: "m" });
    await old.table("settings").bulkPut([{ key: "lock", value: 1 }, { key: "webauthn", value: 1 }, { key: "tema", value: 2 }]);
    old.close();
    const db = new MListDB(name); await db.open();
    const names = db.tables.map((t) => t.name);
    for (const t of ["journal", "habits", "habitLogs", "moods"]) expect(names).not.toContain(t);
    expect(await db.tasks.count()).toBe(1); expect(await db.goals.count()).toBe(1);
    expect((await db.settings.toArray()).map((s) => s.key)).toEqual(["tema"]);
    db.close();
    const raw = new Dexie(name); await raw.open();
    expect(raw.tables.map((t) => t.name)).not.toContain("journal"); raw.close();
  });
});
