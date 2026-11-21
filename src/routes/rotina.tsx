import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { addDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { CalendarClock, ChevronLeft, ChevronRight, Pencil, Plus, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryDot, CategorySelect, ConfirmDelete, EmptyState, Field, Loading, PageHeader, ProgressBar, Section, useDialog, WeekdayPicker } from "@/components/app/common";
import { FormDialog } from "@/components/app/forms";
import { db } from "@/lib/db";
import { repo } from "@/lib/repo";
import { fmt, ymd } from "@/lib/dates";
import { occurrencesOn, routineDayProgress, validateRoutine, type Occurrence } from "@/lib/calc";
import { TEMPLATE_DAYS, TEMPLATE_LABEL, WEEKDAYS, type Routine, type RoutineLog, type RoutineTemplate } from "@/lib/types";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/rotina")({ head: pageHead("Minha Rotina", "Organize sua rotina semanal no MList: horários recorrentes, ajustes do dia e conclusão diária."), component: Page });

const routinesRepo = repo<Routine>("routines");
const logsRepo = repo<RoutineLog>("routineLogs");

function Page() {
  const [date, setDate] = useState(ymd());
  const data = useLiveQuery(async () => ({ routines: await db.routines.toArray(), logs: await db.routineLogs.where("date").equals(date).toArray() }), [date]);
  const edit = useDialog<Routine>(); const day = useDialog<Occurrence>();
  if (!data) return <Loading />;
  const occ = occurrencesOn(data.routines, date); const prog = routineDayProgress(occ, data.logs);
  const skipped = data.routines.filter((r) => r.overrides?.[date]?.skipped);
  const toggle = async (o: Occurrence) => { const l = data.logs.find((x) => x.routineId === o.routine.id); if (l) await logsRepo.remove(l.id); else await logsRepo.create({ routineId: o.routine.id, date }); };
  const setOverride = async (r: Routine, ov: Routine["overrides"][string] | undefined) => { const overrides = { ...(r.overrides ?? {}) }; if (ov) overrides[date] = ov; else delete overrides[date]; await routinesRepo.update(r.id, { overrides }); };
  const remove = async (r: Routine) => { await db.transaction("rw", db.routines, db.routineLogs, async () => { await db.routineLogs.where("routineId").equals(r.id).delete(); await db.routines.delete(r.id); }); toast.success("Rotina excluída"); };
  const isToday = date === ymd();
  return (
    <div className="space-y-6">
      <PageHeader title="Minha Rotina" subtitle="Seus horários recorrentes da semana." actions={<Button className="h-11" onClick={() => edit.show()}><Plus /> Nova rotina</Button>} />
      <Section title={isToday ? "Hoje" : fmt(date, "EEEE, d 'de' MMMM")} action={
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Dia anterior" onClick={() => setDate(ymd(addDays(parseISO(date), -1)))}><ChevronLeft /></Button>
          <Input type="date" aria-label="Escolher dia" className="h-10 w-40" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          <Button variant="ghost" size="icon" aria-label="Próximo dia" onClick={() => setDate(ymd(addDays(parseISO(date), 1)))}><ChevronRight /></Button>
          {!isToday && <Button variant="outline" size="sm" onClick={() => setDate(ymd())}>Hoje</Button>}
        </div>}>
        <div className="mb-4 flex items-center gap-3"><ProgressBar value={prog.pct} /><span className="shrink-0 text-sm text-muted-foreground">{prog.done}/{prog.total} · {prog.pct}%</span></div>
        {occ.length === 0 ? <EmptyState icon={<CalendarClock className="h-7 w-7" />} title="Nada na rotina deste dia" text={data.routines.length ? "Nenhuma rotina cai neste dia da semana." : "Crie sua primeira rotina para vê-la aqui."} /> :
          <ul className="space-y-2">{occ.map((o) => { const done = data.logs.some((l) => l.routineId === o.routine.id); const changed = !!o.routine.overrides?.[date]; return (
            <li key={o.routine.id} className="flex min-h-14 items-center gap-3 rounded-xl bg-secondary/60 px-3 py-2">
              <Checkbox className="size-5" checked={done} onCheckedChange={() => toggle(o)} aria-label={`Concluir ${o.title}`} />
              <span className="w-28 shrink-0 text-sm tabular-nums text-muted-foreground">{o.start}–{o.end}</span>
              <div className="min-w-0 flex-1"><p className={done ? "text-muted-foreground line-through" : ""}>{o.title}</p>{changed && <p className="text-xs text-primary">Ajustado só neste dia</p>}</div>
              <Button variant="ghost" size="sm" onClick={() => day.show(o)}>Ajustar dia</Button>
            </li>); })}</ul>}
        {skipped.length > 0 && <div className="mt-4 space-y-1 text-sm text-muted-foreground"><p>Pulados neste dia:</p>{skipped.map((r) => <div key={r.id} className="flex items-center gap-2"><span>{r.title}</span><Button variant="ghost" size="sm" onClick={() => setOverride(r, undefined)}><Undo2 /> Restaurar</Button></div>)}</div>}
      </Section>
      <Section title="Todas as rotinas">
        {data.routines.length === 0 ? <EmptyState title="Nenhuma rotina cadastrada" action={<Button onClick={() => edit.show()}><Plus /> Criar rotina</Button>} /> :
          <ul className="divide-y divide-border">{[...data.routines].sort((a, b) => a.start.localeCompare(b.start)).map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1"><p className="font-medium">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.start}–{r.end} · {r.weekdays.map((d) => WEEKDAYS[d]).join(", ")}{r.endDate ? ` · até ${fmt(r.endDate, "dd/MM/yyyy")}` : ""}</p><CategoryDot id={r.categoryId} /></div>
              <Button variant="ghost" size="icon" aria-label={`Editar ${r.title}`} onClick={() => edit.show(r)}><Pencil /></Button>
              <ConfirmDelete what="esta rotina" onConfirm={() => remove(r)} />
            </li>))}</ul>}
      </Section>
      <RoutineDialog open={edit.open} onOpenChange={edit.setOpen} routine={edit.item} />
      <DayDialog open={day.open} onOpenChange={day.setOpen} occ={day.item} date={date} onSave={setOverride} />
    </div>
  );
}

function RoutineDialog({ open, onOpenChange, routine }: { open: boolean; onOpenChange: (o: boolean) => void; routine?: Routine }) {
  const empty = { title: "", description: "", start: "08:00", end: "09:00", template: "dias-uteis" as RoutineTemplate, weekdays: TEMPLATE_DAYS["dias-uteis"], categoryId: undefined as string | undefined, startDate: "", endDate: "" };
  const [f, setF] = useState(empty); const [err, setErr] = useState("");
  useEffect(() => { if (open) { setErr(""); setF(routine ? { title: routine.title, description: routine.description ?? "", start: routine.start, end: routine.end, template: routine.template, weekdays: routine.weekdays, categoryId: routine.categoryId, startDate: routine.startDate ?? "", endDate: routine.endDate ?? "" } : empty); } }, [open, routine]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={routine ? "Editar rotina" : "Nova rotina"} onSubmit={async () => {
      const e = validateRoutine(f); if (e) { setErr(e); return false; }
      const data = { title: f.title.trim(), description: f.description || undefined, start: f.start, end: f.end, template: f.template, weekdays: f.weekdays, categoryId: f.categoryId, startDate: f.startDate || undefined, endDate: f.endDate || undefined };
      if (routine) await routinesRepo.update(routine.id, data); else await routinesRepo.create({ ...data, overrides: {} });
      toast.success(routine ? "Rotina atualizada" : "Rotina criada");
    }}>
      <Field label="Título" id="r-title"><Input id="r-title" className="h-11" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Início" id="r-start"><Input id="r-start" type="time" className="h-11" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
        <Field label="Fim" id="r-end"><Input id="r-end" type="time" className="h-11" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
      </div>
      <Field label="Modelo">
        <Select value={f.template} onValueChange={(v) => { const t = v as RoutineTemplate; setF({ ...f, template: t, weekdays: t === "personalizado" ? f.weekdays : TEMPLATE_DAYS[t] }); }}>
          <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
          <SelectContent>{(Object.keys(TEMPLATE_LABEL) as RoutineTemplate[]).map((t) => <SelectItem key={t} value={t}>{TEMPLATE_LABEL[t]}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Dias da semana"><WeekdayPicker value={f.weekdays} onChange={(w) => setF({ ...f, weekdays: w, template: "personalizado" })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Começa em (opcional)" id="r-sd"><Input id="r-sd" type="date" className="h-11" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
        <Field label="Termina em (opcional)" id="r-ed"><Input id="r-ed" type="date" className="h-11" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
      </div>
      <Field label="Categoria"><CategorySelect value={f.categoryId} onChange={(c) => setF({ ...f, categoryId: c })} /></Field>
      <Field label="Descrição" id="r-desc" error={err}><Textarea id="r-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
    </FormDialog>
  );
}

function DayDialog({ open, onOpenChange, occ, date, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; occ?: Occurrence; date: string; onSave: (r: Routine, ov: Routine["overrides"][string] | undefined) => Promise<void> }) {
  const [f, setF] = useState({ title: "", start: "", end: "" }); const [err, setErr] = useState("");
  useEffect(() => { if (open && occ) { setErr(""); setF({ title: occ.title, start: occ.start, end: occ.end }); } }, [open, occ]);
  if (!occ) return null;
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Ajustar só este dia" description={`${fmt(date, "EEEE, d 'de' MMMM")} — as outras datas continuam iguais.`} onSubmit={async () => {
      const e = validateRoutine({ ...f, weekdays: [0] }); if (e) { setErr(e); return false; }
      await onSave(occ.routine, { title: f.title.trim(), start: f.start, end: f.end }); toast.success("Dia ajustado");
    }}>
      <Field label="Título" id="d-title"><Input id="d-title" className="h-11" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Início" id="d-start"><Input id="d-start" type="time" className="h-11" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
        <Field label="Fim" id="d-end" error={err}><Input id="d-end" type="time" className="h-11" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={async () => { await onSave(occ.routine, { skipped: true }); toast.success("Pulado neste dia"); onOpenChange(false); }}>Pular neste dia</Button>
        {occ.routine.overrides?.[date] && <Button type="button" variant="ghost" onClick={async () => { await onSave(occ.routine, undefined); onOpenChange(false); }}><Undo2 /> Voltar ao padrão</Button>}
      </div>
    </FormDialog>
  );
}
