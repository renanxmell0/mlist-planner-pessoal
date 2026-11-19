export type ID = string;
export interface Base { id: ID; createdAt: number; updatedAt: number; demo?: boolean }
export type Priority = "baixa" | "media" | "alta";
export type TaskStatus = "pendente" | "concluida";
export interface Task extends Base { title: string; notes?: string; date?: string; time?: string; priority: Priority; status: TaskStatus; categoryId?: ID }
export interface CalEvent extends Base { title: string; date: string; start?: string; end?: string; notes?: string; categoryId?: ID }
export type RoutineTemplate = "dias-uteis" | "sabado" | "domingo" | "personalizado";
export interface RoutineOverride { title?: string; start?: string; end?: string; skipped?: boolean }
export interface Routine extends Base { title: string; description?: string; start: string; end: string; weekdays: number[]; template: RoutineTemplate; categoryId?: ID; startDate?: string; endDate?: string; overrides: Record<string, RoutineOverride> }
export interface RoutineLog extends Base { routineId: ID; date: string }
export interface Habit extends Base { name: string; weekdays: number[]; categoryId?: ID; goal?: string; archived?: boolean }
export interface HabitLog extends Base { habitId: ID; date: string }
export type GoalStatus = "nao-iniciada" | "em-andamento" | "concluida";
export interface GoalStep { id: ID; title: string; done: boolean }
export interface Goal extends Base { title: string; description?: string; categoryId?: ID; deadline?: string; steps: GoalStep[]; status: GoalStatus; manualProgress?: number }
export type PlanStatus = "planejado" | "em-andamento" | "concluido" | "pausado";
export interface StudyPlan extends Base { title: string; description?: string; startDate: string; endDate: string; subjects: string[]; status: PlanStatus; deadline?: string }
export interface StudySession extends Base { planId: ID; subject: string; date: string; start: string; end: string; done: boolean; notes?: string }
export interface EncPayload { iv: string; data: string }
export interface JournalEntry extends Base { date: string; title: string; content: string; private: boolean; enc?: EncPayload }
export type MoodValue = 5 | 4 | 3 | 2 | 1;
export interface MoodEntry extends Base { date: string; value: MoodValue; note?: string }
export interface Reminder extends Base { title: string; at: string; done: boolean; fired: boolean }
export type CategoryKind = "geral" | "rotina" | "estudos" | "habitos" | "metas";
export interface Category extends Base { name: string; color: string }
export interface Setting { key: string; value: unknown }
export const MOODS: { value: MoodValue; emoji: string; label: string }[] = [
  { value: 5, emoji: "😊", label: "Ótimo" }, { value: 4, emoji: "🙂", label: "Bem" },
  { value: 3, emoji: "😐", label: "Normal" }, { value: 2, emoji: "😔", label: "Triste" },
  { value: 1, emoji: "😣", label: "Difícil" },
];
export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const PRIORITY_LABEL: Record<Priority, string> = { baixa: "Baixa", media: "Média", alta: "Alta" };
export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = { "nao-iniciada": "Não iniciada", "em-andamento": "Em andamento", concluida: "Concluída" };
export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = { planejado: "Planejado", "em-andamento": "Em andamento", concluido: "Concluído", pausado: "Pausado" };
export const TEMPLATE_LABEL: Record<RoutineTemplate, string> = { "dias-uteis": "Dias úteis", sabado: "Sábado", domingo: "Domingo", personalizado: "Personalizado" };
export const TEMPLATE_DAYS: Record<RoutineTemplate, number[]> = { "dias-uteis": [1, 2, 3, 4, 5], sabado: [6], domingo: [0], personalizado: [] };
