import { addDays, format } from "date-fns";
import { db } from "./db";
import { uid } from "./repo";

const d = (n: number) => format(addDays(new Date(), n), "yyyy-MM-dd");
export async function seedDemo() {
  const now = Date.now(); const b = () => ({ id: uid(), createdAt: now, updatedAt: now, demo: true });
  const cat = { estudos: { ...b(), name: "Estudos", color: "oklch(0.62 0.09 250)" }, saude: { ...b(), name: "Saúde", color: "oklch(0.65 0.1 150)" }, pessoal: { ...b(), name: "Pessoal", color: "oklch(0.64 0.1 10)" } };
  await db.categories.bulkPut(Object.values(cat));
  await db.tasks.bulkPut([
    { ...b(), title: "Revisar anotações de Biologia", date: d(0), time: "15:00", priority: "alta", status: "pendente", categoryId: cat.estudos.id },
    { ...b(), title: "Comprar frutas na feira", date: d(0), priority: "media", status: "concluida", categoryId: cat.pessoal.id },
    { ...b(), title: "Ligar para a vovó", date: d(1), priority: "baixa", status: "pendente", categoryId: cat.pessoal.id },
  ]);
  await db.events.bulkPut([{ ...b(), title: "Consulta no dentista", date: d(2), start: "10:00", end: "11:00" }]);
  await db.routines.bulkPut([
    { ...b(), title: "Café da manhã", start: "07:00", end: "07:30", weekdays: [1, 2, 3, 4, 5], template: "dias-uteis", overrides: {}, categoryId: cat.saude.id },
    { ...b(), title: "Aula online", start: "08:00", end: "11:30", weekdays: [1, 2, 3, 4, 5], template: "dias-uteis", overrides: {}, categoryId: cat.estudos.id },
    { ...b(), title: "Caminhada no parque", start: "09:00", end: "10:00", weekdays: [6], template: "sabado", overrides: {}, categoryId: cat.saude.id },
  ]);
  await db.goals.bulkPut([{ ...b(), title: "Aprender o básico de espanhol", categoryId: cat.estudos.id, deadline: d(60), status: "em-andamento", steps: [{ id: uid(), title: "Escolher um curso", done: true }, { id: uid(), title: "Concluir módulo 1", done: false }, { id: uid(), title: "Conversar 10 min", done: false }] }]);
  const plan = { ...b(), title: "Preparação ENEM", startDate: d(-7), endDate: d(90), subjects: ["Matemática", "Redação", "Química"], status: "em-andamento" as const };
  await db.studyPlans.bulkPut([plan]);
  await db.studySessions.bulkPut([
    { ...b(), planId: plan.id, subject: "Matemática", date: d(-1), start: "14:00", end: "15:30", done: true },
    { ...b(), planId: plan.id, subject: "Redação", date: d(0), start: "16:00", end: "17:00", done: false },
  ]);
}
