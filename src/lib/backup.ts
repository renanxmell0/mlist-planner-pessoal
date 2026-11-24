import { z } from "zod";
import { db, DATA_TABLES, REMOVED_SETTINGS, type DataTable } from "./db";

export const BACKUP_VERSION = 1;
const isRemovedSetting = (k: string) => (REMOVED_SETTINGS as readonly string[]).includes(k);
/** Seções de backups antigos (Diário, Hábitos, Humor) são ignoradas na importação. */
const base = z.object({ id: z.string().min(1), createdAt: z.number(), updatedAt: z.number() }).passthrough();
const withDate = base.extend({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
const schemas: Record<DataTable, z.ZodTypeAny> = {
  tasks: base.extend({ title: z.string() }), events: withDate.extend({ title: z.string() }),
  routines: base.extend({ title: z.string(), weekdays: z.array(z.number().int().min(0).max(6)), start: z.string(), end: z.string() }),
  routineLogs: withDate.extend({ routineId: z.string() }),
  goals: base.extend({ title: z.string(), steps: z.array(z.any()) }),
  studyPlans: base.extend({ title: z.string() }), studySessions: withDate.extend({ planId: z.string() }),
  reminders: base.extend({ title: z.string(), at: z.string() }), categories: base.extend({ name: z.string() }),
};

export interface BackupFile { app: "MList"; version: number; exportedAt: string; data: Record<DataTable, unknown[]>; settings?: { key: string; value: unknown }[] }
export interface ValidationResult { ok: boolean; errors: string[]; counts: Record<string, number>; skipped: number; data?: Record<DataTable, unknown[]>; settings?: { key: string; value: unknown }[] }

/** Migrações de versões antigas para a atual. Adicione um passo por versão. */
export function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let v = Number(raw.version ?? 0);
  let out = { ...raw };
  if (v < 1) { out = { ...out, data: out.data ?? {}, version: 1 }; v = 1; }
  return out;
}

export function validateBackup(input: unknown): ValidationResult {
  const errors: string[] = []; const counts: Record<string, number> = {}; let skipped = 0;
  if (!input || typeof input !== "object") return { ok: false, errors: ["Arquivo não é um JSON de objeto válido."], counts, skipped };
  const raw = input as Record<string, unknown>;
  if (raw.app !== "MList") return { ok: false, errors: ["Este arquivo não parece ser um backup do MList."], counts, skipped };
  if (typeof raw.version !== "number") return { ok: false, errors: ["Versão do backup ausente."], counts, skipped };
  if (raw.version > BACKUP_VERSION) return { ok: false, errors: [`Backup criado em versão mais nova (${raw.version}). Atualize o app.`], counts, skipped };
  const m = migrate(raw);
  const dataIn = m.data as Record<string, unknown> | undefined;
  if (!dataIn || typeof dataIn !== "object") return { ok: false, errors: ["Seção de dados ausente."], counts, skipped };
  const data = {} as Record<DataTable, unknown[]>;
  for (const t of DATA_TABLES) {
    const arr = dataIn[t]; const seen = new Set<string>(); data[t] = [];
    if (arr === undefined) { counts[t] = 0; continue; }
    if (!Array.isArray(arr)) { errors.push(`"${t}" deveria ser uma lista.`); continue; }
    for (const item of arr) {
      const r = schemas[t].safeParse(item);
      if (!r.success || seen.has((r.data as { id: string }).id)) { skipped++; continue; }
      seen.add((r.data as { id: string }).id); data[t].push(r.data);
    }
    counts[t] = data[t].length;
  }
  const settings = Array.isArray(m.settings) ? (m.settings as { key: string; value: unknown }[]).filter((s) => s && typeof s.key === "string" && !isRemovedSetting(s.key)) : [];
  return { ok: errors.length === 0, errors, counts, skipped, data, settings };
}

export async function exportBackup(): Promise<BackupFile> {
  const data = {} as Record<DataTable, unknown[]>;
  for (const t of DATA_TABLES) data[t] = await db.table(t).toArray();
  const settings = (await db.settings.toArray()).filter((s) => !isRemovedSetting(s.key));
  return { app: "MList", version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data, settings };
}

export async function applyBackup(v: ValidationResult) {
  if (!v.ok || !v.data) throw new Error("Backup inválido");
  await db.transaction("rw", [...DATA_TABLES.map((t) => db.table(t)), db.settings], async () => {
    for (const t of DATA_TABLES) { await db.table(t).clear(); await db.table(t).bulkPut(v.data![t]); }
    for (const s of v.settings ?? []) await db.settings.put(s);
  });
}
