import type { JournalEntry, MoodEntry, MoodValue } from "./types";
import { MOODS } from "./types";
import { db } from "./db";
import { repo } from "./repo";
import { decryptWith, encryptWith, getKey } from "./crypto";

export const journalRepo = repo<JournalEntry>("journal");
export interface Draft { date: string; title: string; content: string; private: boolean }

/** Salva a entrada; entradas privadas são criptografadas (AES-GCM) e o texto puro não fica salvo. */
export async function saveEntry(d: Draft, id?: string) {
  let data: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">;
  if (d.private) {
    const key = getKey(); if (!key) throw new Error("Desbloqueie o diário para salvar entradas privadas.");
    data = { date: d.date, title: "", content: "", private: true, enc: await encryptWith(key, JSON.stringify({ title: d.title, content: d.content })) };
  } else data = { date: d.date, title: d.title, content: d.content, private: false, enc: undefined };
  if (id) { await journalRepo.update(id, data); return id; }
  return (await journalRepo.create(data)).id;
}
export async function readEntry(e: JournalEntry): Promise<Draft | null> {
  if (!e.enc) return { date: e.date, title: e.title, content: e.content, private: e.private };
  const key = getKey(); if (!key) return null;
  try { const { title, content } = JSON.parse(await decryptWith(key, e.enc)); return { date: e.date, title, content, private: true }; } catch { return null; }
}
/** Busca só em entradas não criptografadas. */
export function searchEntries(list: JournalEntry[], q: string) {
  const s = q.trim().toLowerCase();
  const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  if (!s) return sorted;
  return sorted.filter((e) => !e.enc && (e.title.toLowerCase().includes(s) || e.content.toLowerCase().includes(s)));
}
export const deleteEntry = (id: string) => db.journal.delete(id);

export function moodStats(list: MoodEntry[]) {
  const counts = Object.fromEntries(MOODS.map((m) => [m.value, 0])) as Record<MoodValue, number>;
  for (const m of list) counts[m.value]++;
  const avg = list.length ? Math.round((list.reduce((s, m) => s + m.value, 0) / list.length) * 10) / 10 : 0;
  return { counts, avg, total: list.length };
}
