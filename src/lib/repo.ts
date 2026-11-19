import { db, DATA_TABLES, type DataTable } from "./db";
import type { Base } from "./types";

export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

type Input<T extends Base> = Omit<T, "id" | "createdAt" | "updatedAt"> & Partial<Pick<T, "id">>;
// Repositório genérico: toda escrita passa por aqui para manter id/createdAt/updatedAt consistentes.
export function repo<T extends Base>(name: DataTable) {
  const table = () => db.table<T, string>(name);
  return {
    async create(data: Input<T>) { const now = Date.now(); const rec = { ...data, id: data.id ?? uid(), createdAt: now, updatedAt: now } as T; await table().put(rec); return rec; },
    async update(id: string, patch: Partial<T>) { await table().update(id, { ...patch, updatedAt: Date.now() } as never); },
    async remove(id: string) { await table().delete(id); },
    get: (id: string) => table().get(id),
    all: () => table().toArray(),
  };
}
export async function getSetting<T>(key: string, fallback: T): Promise<T> { const s = await db.settings.get(key); return (s?.value as T) ?? fallback; }
export const setSetting = (key: string, value: unknown) => db.settings.put({ key, value });

export async function clearAll() { await db.transaction("rw", DATA_TABLES.map((t) => db.table(t)), async () => { for (const t of DATA_TABLES) await db.table(t).clear(); }); }
export async function clearDemo() { await db.transaction("rw", DATA_TABLES.map((t) => db.table(t)), async () => { for (const t of DATA_TABLES) await db.table(t).filter((r: Base) => !!r.demo).delete(); }); }
