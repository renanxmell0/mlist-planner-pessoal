import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, Loading, PageHeader, Section } from "@/components/app/common";
import { db } from "@/lib/db";
import { fmt, ymd } from "@/lib/dates";
import { occurrencesOn } from "@/lib/calc";
import { WEEKDAYS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/calendario")({ head: pageHead("Calendário", "Calendário do MList com tarefas, eventos, rotina e estudos de cada dia."), component: Page });

function Page() {
  const [month, setMonth] = useState(() => startOfMonth(new Date())); const [sel, setSel] = useState(ymd());
  const data = useLiveQuery(async () => ({ tasks: await db.tasks.toArray(), events: await db.events.toArray(), routines: await db.routines.toArray(), sessions: await db.studySessions.toArray() }), []);
  if (!data) return <Loading />;
  const days = eachDayOfInterval({ start: startOfWeek(month), end: endOfWeek(endOfMonth(month)) }).map(ymd);
  const items = (d: string) => [
    ...data.events.filter((e) => e.date === d).map((e) => ({ k: e.id, t: e.start ?? "", title: e.title, kind: "Evento" })),
    ...occurrencesOn(data.routines, d).map((o) => ({ k: "r" + o.routine.id, t: o.start, title: o.title, kind: "Rotina" })),
    ...data.sessions.filter((s) => s.date === d).map((s) => ({ k: s.id, t: s.start, title: s.subject, kind: "Estudo" })),
    ...data.tasks.filter((t) => t.date === d).map((t) => ({ k: t.id, t: t.time ?? "", title: t.title + (t.status === "concluida" ? " ✓" : ""), kind: "Tarefa" })),
  ].sort((a, b) => a.t.localeCompare(b.t));
  const selItems = items(sel);
  return (
    <div className="space-y-6">
      <PageHeader title="Calendário" />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Section title={fmt(month, "MMMM 'de' yyyy")} className="[&_h2]:capitalize" action={<div className="flex gap-1">
          <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft /></Button>
          <Button variant="outline" size="sm" onClick={() => { setMonth(startOfMonth(new Date())); setSel(ymd()); }}>Hoje</Button>
          <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setMonth(addMonths(month, 1))}><ChevronRight /></Button></div>}>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">{WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">{days.map((d) => { const n = items(d).length; const out = d.slice(0, 7) !== ymd(month).slice(0, 7); return (
            <button key={d} type="button" onClick={() => setSel(d)} aria-pressed={d === sel} aria-label={`${fmt(d, "d 'de' MMMM")}, ${n} itens`}
              className={cn("flex h-16 flex-col items-center justify-start rounded-xl pt-2 text-sm transition-colors", d === sel ? "bg-primary text-primary-foreground" : "hover:bg-accent", out && d !== sel && "text-muted-foreground/50", d === ymd() && d !== sel && "ring-2 ring-ring")}>
              <span>{fmt(d, "d")}</span>{n > 0 && <span className={cn("mt-1 rounded-full px-1.5 text-[10px]", d === sel ? "bg-primary-foreground/25" : "bg-secondary text-secondary-foreground")}>{n}</span>}</button>); })}</div>
        </Section>
        <Section title={fmt(sel, "EEEE, d/MM")} className="[&_h2]:capitalize">
          {selItems.length === 0 ? <EmptyState title="Dia livre" /> : <div className="space-y-4">
            {selItems.length > 0 && <ul className="space-y-2">{selItems.map((x) => <li key={x.k} className="flex gap-3 rounded-xl bg-secondary/60 px-3 py-2 text-sm"><span className="w-12 shrink-0 tabular-nums text-muted-foreground">{x.t}</span><span className="flex-1">{x.title}</span><span className="text-xs text-muted-foreground">{x.kind}</span></li>)}</ul>}
          </div>}
        </Section>
      </div>
    </div>
  );
}
