import Dexie, { type Table } from "dexie";
import type { Task, CalEvent, Routine, RoutineLog, Habit, HabitLog, Goal, StudyPlan, StudySession, JournalEntry, MoodEntry, Reminder, Category, Setting } from "./types";

export class MListDB extends Dexie {
  tasks!: Table<Task, string>; events!: Table<CalEvent, string>; routines!: Table<Routine, string>;
  routineLogs!: Table<RoutineLog, string>; habits!: Table<Habit, string>; habitLogs!: Table<HabitLog, string>;
  goals!: Table<Goal, string>; studyPlans!: Table<StudyPlan, string>; studySessions!: Table<StudySession, string>;
  journal!: Table<JournalEntry, string>; moods!: Table<MoodEntry, string>; reminders!: Table<Reminder, string>;
  categories!: Table<Category, string>; settings!: Table<Setting, string>;
  constructor() {
    super("mlist");
    this.version(1).stores({
      tasks: "id, date, status, priority, categoryId", events: "id, date", routines: "id",
      routineLogs: "id, routineId, date, [routineId+date]", habits: "id", habitLogs: "id, habitId, date, [habitId+date]",
      goals: "id, status", studyPlans: "id, status", studySessions: "id, planId, date",
      journal: "id, date", moods: "id, date", reminders: "id, at", categories: "id", settings: "key",
    });
  }
}
export const db = new MListDB();
export const DATA_TABLES = ["tasks", "events", "routines", "routineLogs", "habits", "habitLogs", "goals", "studyPlans", "studySessions", "journal", "moods", "reminders", "categories"] as const;
export type DataTable = (typeof DATA_TABLES)[number];
