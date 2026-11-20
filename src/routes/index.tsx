import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState, Flower, ProgressBar, Section } from "@/components/app/common";
import { MoodPicker, saveMood, TaskDialog, tasksRepo } from "@/components/app/forms";
import { db } from "@/lib/db";
import { fmt, ymd } from "@/lib/dates";
import { goalProgress, habitDueOn, occurrencesOn, taskSummary } from "@/lib/calc";
import { repo } from "@/lib/repo";
import type { HabitLog } from "@/lib/types";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/")({ head: pageHead("Início", "Seu dia no MList: tarefas, rotina, hábitos, humor e metas em um só lugar."), component: Dashboard });

function Dashboard() {
  const today = ymd(); const [newTask, setNewTask] = useState(false);
  const d = useLiveQuery(async () => ({
    tasks: await db.tasks.toArray(), routines: await db.routines.toArray(), habits: (await db.habits.toArray()).filter((h) => !h.archived),
    hlogs: await db.habitLogs.where("date").equals(today).toArray(), mood: await db.moods.where("date").equals(today).first(),
    goals: (await db.goals.toArray()).filter((g) => g.status !== "concluida"), events: await db.events.where("date").equals(today).toArray(),
    reminders: (await db.reminders.toArray()).filter((r) => !r.done && r.at.slice(0, 10) === today),
    sessions: await db.studySessions.where("date").equals(today).toArray(),
  }), [today]);
  if (!d) return null;
  const sum = taskSummary(d.tasks, today); const todayTasks = d.tasks.filter((t) => t.date === today).sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99"));
  const occ = occurrencesOn(d.routines, today); const dueHabits = d.habits.filter((h) => habitDueOn(h, today));
  const hour = new Date().getHours(); const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const toggleHabit = async (id: string) => { const l = d.hlogs.find((x) => x.habitId === id); if (l) await db.habitLogs.delete(l.id); else await repo<HabitLog>("habitLogs").create({ habitId: id, date: today }); };
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm capitalize text-muted-foreground">{fmt(today, "EEEE, d 'de' MMMM")}</p><h1 className="flex items-center gap-2 text-3xl font-semibold md:text-4xl">{greet}! <Flower /></h1></div>
        <Button className="h-11" onClick={() => setNewTask(true)}><Plus /> Nova tarefa</Button>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Tarefas de hoje" action={<Link to="/tarefas" className="text-sm text-primary">Ver todas</Link>}>
          <div className="mb-3 flex items-center gap-3"><ProgressBar value={sum.pct} /><span className="shrink-0 text-sm text-muted-foreground">{sum.done}/{sum.total} · {sum.pct}%</span></div>
          {todayTasks.length === 0 ? <EmptyState title="Nenhuma tarefa para hoje" text="Aproveite ou adicione algo." /> :
            <ul className="space-y-1">{todayTasks.slice(0, 7).map((t) => <li key={t.id} className="flex min-h-11 items-center gap-3"><Checkbox className="size-5" checked={t.status === "concluida"} onCheckedChange={(c) => tasksRepo.update(t.id, { status: c ? "concluida" : "pendente" })} aria-label={t.title} /><span className={t.status === "concluida" ? "text-muted-foreground line-through" : ""}>{t.title}</span>{t.time && <span className="ml-auto text-xs text-muted-foreground">{t.time}</span>}</li>)}</ul>}
        </Section>
        <Section title="Rotina de hoje" action={<Link to="/rotina" className="text-sm text-primary">Abrir</Link>}>
          {occ.length === 0 && d.events.length === 0 && d.sessions.length === 0 ? <EmptyState title="Agenda livre" /> :
            <ul className="space-y-2">
              {[...occ.map((o) => ({ k: o.routine.id, t: o.start, e: o.end, title: o.title, kind: "Rotina" })), ...d.events.map((e) => ({ k: e.id, t: e.start ?? "", e: e.end ?? "", title: e.title, kind: "Evento" })), ...d.sessions.map((s) => ({ k: s.id, t: s.start, e: s.end, title: s.subject, kind: "Estudo" }))].sort((a, b) => a.t.localeCompare(b.t)).map((x) =>
                <li key={x.k} className="flex items-center gap-3 rounded-xl bg-secondary/60 px-3 py-2"><span className="w-24 shrink-0 text-sm tabular-nums text-muted-foreground">{x.t}{x.e && `–${x.e}`}</span><span className="flex-1">{x.title}</span><span className="text-xs text-muted-foreground">{x.kind}</span></li>)}
            </ul>}
        </Section>
        <Section title="Hábitos de hoje" action={<Link to="/habitos" className="text-sm text-primary">Gerenciar</Link>}>
          {dueHabits.length === 0 ? <EmptyState title="Sem hábitos para hoje" /> :
            <div className="flex flex-wrap gap-2">{dueHabits.map((h) => { const done = d.hlogs.some((l) => l.habitId === h.id); return <button key={h.id} aria-pressed={done} onClick={() => toggleHabit(h.id)} className={`min-h-11 rounded-full border px-4 text-sm ${done ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:bg-accent"}`}>{done ? "✓ " : ""}{h.name}</button>; })}</div>}
        </Section>
        <Section title="Como você está?">
          <MoodPicker value={d.mood?.value} onPick={(v) => saveMood(today, v)} />
        </Section>
        <Section title="Metas em andamento" action={<Link to="/metas" className="text-sm text-primary">Ver metas</Link>}>
          {d.goals.length === 0 ? <EmptyState title="Nenhuma meta ativa" /> : <ul className="space-y-3">{d.goals.slice(0, 4).map((g) => { const p = goalProgress(g); return <li key={g.id}><div className="mb-1 flex justify-between text-sm"><span>{g.title}</span><span className="text-muted-foreground">{p}%</span></div><ProgressBar value={p} /></li>; })}</ul>}
        </Section>
        <Section title="Lembretes de hoje">
          {d.reminders.length === 0 ? <EmptyState icon={<Bell className="h-7 w-7" />} title="Nenhum lembrete" text="Use o botão Novo no topo para criar." /> :
            <ul className="space-y-1">{d.reminders.map((r) => <li key={r.id} className="flex min-h-11 items-center gap-3"><Checkbox className="size-5" checked={r.done} onCheckedChange={() => db.reminders.update(r.id, { done: true })} aria-label={r.title} /><span>{r.title}</span><span className="ml-auto text-xs text-muted-foreground">{r.at.slice(11)}</span></li>)}</ul>}
        </Section>
      </div>
      <TaskDialog open={newTask} onOpenChange={setNewTask} />
    </div>
  );
}
