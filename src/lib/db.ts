import Dexie, { type Table } from "dexie";
import type { Task, CalEvent, Routine, RoutineLog, Goal, StudyPlan, StudySession, Reminder, Category, Setting } from "./types";

/** Tabelas e configurações de funções removidas (Diário, Hábitos, Humor, bloqueio). */
export const REMOVED_TABLES = ["journal", "habits", "habitLogs", "moods"] as const;
export const REMOVED_SETTINGS = ["lock", "webauthn"] as const;

export class MListDB extends Dexie {
  tasks!: Table<Task, string>; events!: Table<CalEvent, string>; routines!: Table<Routine, string>;
  routineLogs!: Table<RoutineLog, string>;
  goals!: Table<Goal, string>; studyPlans!: Table<StudyPlan, string>; studySessions!: Table<StudySession, string>;
  reminders!: Table<Reminder, string>;
  categories!: Table<Category, string>; settings!: Table<Setting, string>;
  constructor(name = "mlist") {
    super(name);
    this.version(1).stores({
      tasks: "id, date, status, priority, categoryId", events: "id, date", routines: "id",
      routineLogs: "id, routineId, date, [routineId+date]", habits: "id", habitLogs: "id, habitId, date, [habitId+date]",
      goals: "id, status", studyPlans: "id, status", studySessions: "id, planId, date",
      journal: "id, date", moods: "id, date", reminders: "id, at", categories: "id", settings: "key",
    });
    // v2: apaga de verdade os dados de Diário, Hábitos e Humor e a senha/biometria do diário.
    this.version(2).stores({ journal: null, habits: null, habitLogs: null, moods: null })
      .upgrade((tx) => tx.table("settings").bulkDelete([...REMOVED_SETTINGS]));
    // v3: adiciona índice para pesquisar categorias pelo nome.
    this.version(3).stores({
      categories: "id, name",
    });
  }
}
export const db = new MListDB();
export const DATA_TABLES = ["tasks", "events", "routines", "routineLogs", "goals", "studyPlans", "studySessions", "reminders", "categories"] as const;
export type DataTable = (typeof DATA_TABLES)[number];
