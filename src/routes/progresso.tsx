import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { subDays, parseISO, format } from "date-fns";
import { EmptyState, Loading, PageHeader, ProgressBar, Section } from "@/components/app/common";
import { pageHead } from "@/lib/meta";
import { db } from "@/lib/db";
import { weekDates, weekStats, goalsSummary, type WeekStats } from "@/lib/progress";
import { percent, studyHours } from "@/lib/calc";
import { fmt } from "@/lib/dates";

export const Route = createFileRoute("/progresso")({ head: pageHead("Progresso", "Seu progresso real em tarefas, rotina, estudos e metas no MList."), component: Page });

function Page() {
  const data = useLiveQuery(async () => ({ tasks: await db.tasks.toArray(), routines: await db.routines.toArray(), logs: await db.routineLogs.toArray(), sessions: await db.studySessions.toArray(), goals: await db.goals.toArray() }), []);
  if (!data) return <Loading />;
  const today = format(new Date(), "yyyy-MM-dd");
  const weeks = [0, 1, 2, 3].map((i) => { const days = weekDates(format(subDays(parseISO(today), i * 7), "yyyy-MM-dd")); return { label: i === 0 ? "Esta semana" : `Semana de ${fmt(days[0]!, "dd/MM")}`, s: weekStats(days, data) }; });
  const g = goalsSummary(data.goals);
  const empty = !data.tasks.length && !data.routines.length && !data.sessions.length && !data.goals.length;
  const cur = weeks[0]!.s, prev = weeks[1]!.s;
  return (
    <div className="space-y-6">
      <PageHeader title="Progresso" subtitle="Números calculados a partir do que você registrou." />
      {empty ? <EmptyState title="Ainda não há dados para medir" text="Crie tarefas, rotinas, sessões de estudo ou metas e seu progresso aparecerá aqui." /> : <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Tarefas concluídas (total)" value={`${data.tasks.filter((t) => t.status === "concluida").length} de ${data.tasks.length}`} />
          <Stat label="Rotina nesta semana" value={`${percent(cur.routineDone, cur.routinePlanned)}%`} />
          <Stat label="Horas de estudo (total)" value={`${studyHours(data.sessions)} h`} />
          <Stat label="Metas concluídas" value={`${g.done} de ${g.total}`} />
        </div>
        <Section title="Esta semana x semana passada">
          <Compare label="Tarefas concluídas" a={cur.tasksDone} b={prev.tasksDone} />
          <Compare label="Atividades da rotina feitas" a={cur.routineDone} b={prev.routineDone} />
          <Compare label="Horas de estudo" a={cur.studyHours} b={prev.studyHours} unit=" h" />
        </Section>
        <Section title="Histórico das últimas 4 semanas">
          <div className="space-y-4">{weeks.map((w) => <WeekRow key={w.label} label={w.label} s={w.s} />)}</div>
        </Section>
        <Section title="Metas">
          {g.total ? <><p className="mb-2 text-sm text-muted-foreground">Progresso médio: {g.avg}%</p><ProgressBar value={g.avg} /></> : <p className="text-sm text-muted-foreground">Nenhuma meta criada ainda.</p>}
        </Section>
      </>}
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) { return <div className="card-soft p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-display text-2xl">{value}</p></div>; }
function Compare({ label, a, b, unit = "" }: { label: string; a: number; b: number; unit?: string }) {
  const diff = Math.round((a - b) * 10) / 10;
  return <div className="flex items-center justify-between border-b border-border py-2 last:border-0"><span>{label}</span><span className="tabular-nums">{a}{unit} <span className="text-sm text-muted-foreground">({diff >= 0 ? "+" : ""}{diff}{unit} vs. {b}{unit})</span></span></div>;
}
function WeekRow({ label, s }: { label: string; s: WeekStats }) {
  return <div><div className="mb-1 flex flex-wrap justify-between gap-2 text-sm"><span className="font-medium">{label}</span><span className="text-muted-foreground">Tarefas {s.tasksDone}/{s.tasksTotal} · Rotina {s.routineDone}/{s.routinePlanned} · Estudo {s.studyHours} h</span></div><ProgressBar value={percent(s.tasksDone + s.routineDone, s.tasksTotal + s.routinePlanned)} /></div>;
}
