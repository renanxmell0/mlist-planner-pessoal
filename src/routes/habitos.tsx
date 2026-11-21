import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Flame, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryDot, CategorySelect, ConfirmDelete, EmptyState, Field, Loading, PageHeader, Section, useDialog, WeekdayPicker } from "@/components/app/common";
import { FormDialog } from "@/components/app/forms";
import { db } from "@/lib/db";
import { repo } from "@/lib/repo";
import { fmt, ymd } from "@/lib/dates";
import { habitConsistency, habitDueOn, habitStreak, lastNDays } from "@/lib/calc";
import { WEEKDAYS, type Habit, type HabitLog } from "@/lib/types";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/habitos")({ head: pageHead("Hábitos", "Acompanhe seus hábitos no MList: dias da semana, check diário, sequência e consistência."), component: Page });

const habitsRepo = repo<Habit>("habits");
const logsRepo = repo<HabitLog>("habitLogs");

function Page() {
  const today = ymd(); const days = lastNDays(today, 7); const [showArchived, setShowArchived] = useState(false);
  const data = useLiveQuery(async () => ({ habits: await db.habits.toArray(), logs: await db.habitLogs.toArray() }), []);
  const edit = useDialog<Habit>();
  if (!data) return <Loading />;
  const list = data.habits.filter((h) => !!h.archived === showArchived).sort((a, b) => a.name.localeCompare(b.name));
  const toggle = async (h: Habit, date: string) => { const l = data.logs.find((x) => x.habitId === h.id && x.date === date); if (l) await logsRepo.remove(l.id); else await logsRepo.create({ habitId: h.id, date }); };
  const remove = async (h: Habit) => { await db.transaction("rw", db.habits, db.habitLogs, async () => { await db.habitLogs.where("habitId").equals(h.id).delete(); await db.habits.delete(h.id); }); toast.success("Hábito excluído"); };
  return (
    <div className="space-y-6">
      <PageHeader title="Hábitos" subtitle="Marque o que fez em cada dia." actions={<><Button variant="outline" className="h-11" onClick={() => setShowArchived(!showArchived)}>{showArchived ? "Ver ativos" : "Ver arquivados"}</Button><Button className="h-11" onClick={() => edit.show()}><Plus /> Novo hábito</Button></>} />
      {list.length === 0 ? <EmptyState title={showArchived ? "Nenhum hábito arquivado" : "Nenhum hábito ainda"} text={showArchived ? undefined : "Crie um hábito e escolha em quais dias ele vale."} action={!showArchived && <Button onClick={() => edit.show()}><Plus /> Criar hábito</Button>} /> :
        <div className="grid gap-4 lg:grid-cols-2">{list.map((h) => { const streak = habitStreak(h, data.logs, today); const cons = habitConsistency(h, data.logs, today, Math.max(1, Math.min(30, Math.floor((Date.now() - h.createdAt) / 86400000) + 1))); return (
          <Section key={h.id} title={h.name} action={<div className="flex">
            <Button variant="ghost" size="icon" aria-label={`Editar ${h.name}`} onClick={() => edit.show(h)}><Pencil /></Button>
            <Button variant="ghost" size="icon" aria-label={h.archived ? "Reativar" : "Arquivar"} onClick={() => habitsRepo.update(h.id, { archived: !h.archived })}>{h.archived ? <ArchiveRestore /> : <Archive />}</Button>
            <ConfirmDelete what="este hábito" onConfirm={() => remove(h)} /></div>}>
            <p className="-mt-2 mb-3 text-sm text-muted-foreground">{h.weekdays.length === 0 || h.weekdays.length === 7 ? "Todos os dias" : h.weekdays.map((d) => WEEKDAYS[d]).join(", ")}{h.goal ? ` · ${h.goal}` : ""}</p>
            <div className="mb-3 flex justify-between gap-1">{days.map((d) => { const due = habitDueOn(h, d); const done = data.logs.some((l) => l.habitId === h.id && l.date === d); return (
              <button key={d} type="button" disabled={!due || h.archived} aria-pressed={done} aria-label={`${fmt(d, "EEEE d/MM")}${done ? ", feito" : ""}`} onClick={() => toggle(h, d)}
                className={cn("flex h-14 min-w-11 flex-1 flex-col items-center justify-center rounded-xl border text-xs transition-colors", done ? "border-primary bg-primary text-primary-foreground" : due ? "border-input bg-card hover:bg-accent" : "border-transparent bg-muted/50 text-muted-foreground/50", d === today && !done && "ring-2 ring-ring")}>
                <span className="capitalize">{fmt(d, "EEEEEE")}</span><span className="font-semibold">{done ? "✓" : fmt(d, "d")}</span></button>); })}</div>
            <div className="flex flex-wrap items-center gap-4 text-sm"><span className="inline-flex items-center gap-1"><Flame className="h-4 w-4 text-primary" />{streak} {streak === 1 ? "dia" : "dias"} seguidos</span><span className="text-muted-foreground">{cons}% de constância (até 30 dias)</span><CategoryDot id={h.categoryId} /></div>
          </Section>); })}</div>}
      <HabitDialog open={edit.open} onOpenChange={edit.setOpen} habit={edit.item} />
    </div>
  );
}

function HabitDialog({ open, onOpenChange, habit }: { open: boolean; onOpenChange: (o: boolean) => void; habit?: Habit }) {
  const empty = { name: "", weekdays: [] as number[], goal: "", categoryId: undefined as string | undefined };
  const [f, setF] = useState(empty); const [err, setErr] = useState("");
  useEffect(() => { if (open) { setErr(""); setF(habit ? { name: habit.name, weekdays: habit.weekdays, goal: habit.goal ?? "", categoryId: habit.categoryId } : empty); } }, [open, habit]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={habit ? "Editar hábito" : "Novo hábito"} onSubmit={async () => {
      if (!f.name.trim()) { setErr("Informe um nome."); return false; }
      const data = { name: f.name.trim(), weekdays: f.weekdays, goal: f.goal || undefined, categoryId: f.categoryId };
      if (habit) await habitsRepo.update(habit.id, data); else await habitsRepo.create(data);
      toast.success(habit ? "Hábito atualizado" : "Hábito criado");
    }}>
      <Field label="Nome" id="h-name" error={err}><Input id="h-name" className="h-11" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Dias da semana (nenhum = todos os dias)"><WeekdayPicker value={f.weekdays} onChange={(w) => setF({ ...f, weekdays: w })} /></Field>
      <Field label="Meta (opcional)" id="h-goal"><Input id="h-goal" className="h-11" placeholder="Ex.: 2 litros, 20 minutos" value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })} /></Field>
      <Field label="Categoria"><CategorySelect value={f.categoryId} onChange={(c) => setF({ ...f, categoryId: c })} /></Field>
    </FormDialog>
  );
}
