import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDelete, EmptyState, Field, Loading, PageHeader, ProgressBar, Section, useDialog } from "@/components/app/common";
import { FormDialog } from "@/components/app/forms";
import { db } from "@/lib/db";
import { repo } from "@/lib/repo";
import { fmt, ymd } from "@/lib/dates";
import { planProgress, validatePlan, validateSession } from "@/lib/calc";
import { PLAN_STATUS_LABEL, type PlanStatus, type StudyPlan, type StudySession } from "@/lib/types";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/estudos")({ head: pageHead("Cronogramas de Estudos", "Planeje matérias e sessões de estudo no MList e acompanhe as horas estudadas."), component: Page });

const plansRepo = repo<StudyPlan>("studyPlans");
const sessRepo = repo<StudySession>("studySessions");

function Page() {
  const data = useLiveQuery(async () => ({ plans: await db.studyPlans.toArray(), sessions: await db.studySessions.toArray() }), []);
  const editPlan = useDialog<StudyPlan>(); const editSess = useDialog<{ plan: StudyPlan; session?: StudySession }>();
  if (!data) return <Loading />;
  const today = ymd();
  const removePlan = async (p: StudyPlan) => { await db.transaction("rw", db.studyPlans, db.studySessions, async () => { await db.studySessions.where("planId").equals(p.id).delete(); await db.studyPlans.delete(p.id); }); toast.success("Cronograma excluído"); };
  return (
    <div className="space-y-6">
      <PageHeader title="Cronogramas de Estudos" subtitle="Organize matérias e sessões de estudo." actions={<Button className="h-11" onClick={() => editPlan.show()}><Plus /> Novo cronograma</Button>} />
      {data.plans.length === 0 ? <EmptyState title="Nenhum cronograma ainda" text="Crie um cronograma com suas matérias e agende sessões." action={<Button onClick={() => editPlan.show()}><Plus /> Criar cronograma</Button>} /> :
        <div className="grid gap-4 xl:grid-cols-2">{data.plans.sort((a, b) => a.startDate.localeCompare(b.startDate)).map((p) => { const pr = planProgress(p.id, data.sessions); const ss = data.sessions.filter((s) => s.planId === p.id).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)); return (
          <Section key={p.id} title={p.title} action={<div className="flex"><Button variant="ghost" size="icon" aria-label={`Editar ${p.title}`} onClick={() => editPlan.show(p)}><Pencil /></Button><ConfirmDelete what="este cronograma e suas sessões" onConfirm={() => removePlan(p)} /></div>}>
            <p className="-mt-2 mb-2 text-sm text-muted-foreground">{PLAN_STATUS_LABEL[p.status]} · {fmt(p.startDate, "d/MM")} a {fmt(p.endDate, "d/MM/yyyy")}{p.subjects.length ? ` · ${p.subjects.join(", ")}` : ""}</p>
            <div className="mb-3 flex items-center gap-3"><ProgressBar value={pr.pct} /><span className="shrink-0 text-sm text-muted-foreground">{pr.done}/{pr.total} · {pr.hours} h</span></div>
            {ss.length === 0 ? <p className="mb-3 text-sm text-muted-foreground">Nenhuma sessão agendada.</p> :
              <ul className="mb-3 space-y-1">{ss.map((s) => <li key={s.id} className="flex min-h-11 items-center gap-3">
                <Checkbox className="size-5" checked={s.done} onCheckedChange={(c) => sessRepo.update(s.id, { done: !!c })} aria-label={`${s.subject} ${s.date}`} />
                <span className={`flex-1 ${s.done ? "text-muted-foreground line-through" : ""}`}>{s.subject}</span>
                <span className={`text-xs tabular-nums ${s.date === today ? "font-semibold text-primary" : "text-muted-foreground"}`}>{fmt(s.date, "dd/MM")} {s.start}–{s.end}</span>
                <Button variant="ghost" size="icon" aria-label={`Editar sessão ${s.subject}`} onClick={() => editSess.show({ plan: p, session: s })}><Pencil /></Button>
                <ConfirmDelete what="esta sessão" onConfirm={() => sessRepo.remove(s.id)} /></li>)}</ul>}
            <Button variant="outline" className="h-11" onClick={() => editSess.show({ plan: p })}><Plus /> Agendar sessão</Button>
          </Section>); })}</div>}
      <PlanDialog open={editPlan.open} onOpenChange={editPlan.setOpen} plan={editPlan.item} />
      <SessionDialog open={editSess.open} onOpenChange={editSess.setOpen} plan={editSess.item?.plan} session={editSess.item?.session} />
    </div>
  );
}

function PlanDialog({ open, onOpenChange, plan }: { open: boolean; onOpenChange: (o: boolean) => void; plan?: StudyPlan }) {
  const empty = { title: "", description: "", startDate: ymd(), endDate: "", subjects: "", status: "planejado" as PlanStatus };
  const [f, setF] = useState(empty); const [err, setErr] = useState("");
  useEffect(() => { if (open) { setErr(""); setF(plan ? { title: plan.title, description: plan.description ?? "", startDate: plan.startDate, endDate: plan.endDate, subjects: plan.subjects.join(", "), status: plan.status } : empty); } }, [open, plan]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={plan ? "Editar cronograma" : "Novo cronograma"} onSubmit={async () => {
      const e = validatePlan(f); if (e) { setErr(e); return false; }
      const data = { title: f.title.trim(), description: f.description || undefined, startDate: f.startDate, endDate: f.endDate, status: f.status, subjects: f.subjects.split(",").map((s) => s.trim()).filter(Boolean) };
      if (plan) await plansRepo.update(plan.id, data); else await plansRepo.create(data);
      toast.success(plan ? "Cronograma atualizado" : "Cronograma criado");
    }}>
      <Field label="Título" id="p-title" error={err}><Input id="p-title" className="h-11" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Início" id="p-start"><Input id="p-start" type="date" className="h-11" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} /></Field>
        <Field label="Fim" id="p-end"><Input id="p-end" type="date" className="h-11" value={f.endDate} onChange={(e) => setF({ ...f, endDate: e.target.value })} /></Field>
      </div>
      <Field label="Matérias (separadas por vírgula)" id="p-subj"><Input id="p-subj" className="h-11" placeholder="Matemática, Inglês" value={f.subjects} onChange={(e) => setF({ ...f, subjects: e.target.value })} /></Field>
      <Field label="Situação"><Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as PlanStatus })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PLAN_STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Descrição" id="p-desc"><Textarea id="p-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
    </FormDialog>
  );
}

function SessionDialog({ open, onOpenChange, plan, session }: { open: boolean; onOpenChange: (o: boolean) => void; plan?: StudyPlan; session?: StudySession }) {
  const empty = { subject: "", date: ymd(), start: "08:00", end: "09:00", notes: "" };
  const [f, setF] = useState(empty); const [err, setErr] = useState("");
  useEffect(() => { if (open) { setErr(""); setF(session ? { subject: session.subject, date: session.date, start: session.start, end: session.end, notes: session.notes ?? "" } : { ...empty, subject: plan?.subjects[0] ?? "" }); } }, [open, session, plan]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!plan) return null;
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={session ? "Editar sessão" : "Agendar sessão"} description={plan.title} onSubmit={async () => {
      const e = validateSession(f); if (e) { setErr(e); return false; }
      const data = { subject: f.subject.trim(), date: f.date, start: f.start, end: f.end, notes: f.notes || undefined };
      if (session) await sessRepo.update(session.id, data); else await sessRepo.create({ ...data, planId: plan.id, done: false });
      toast.success(session ? "Sessão atualizada" : "Sessão agendada");
    }}>
      <Field label="Matéria" id="s-subj" error={err}><Input id="s-subj" className="h-11" list="s-subjects" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /><datalist id="s-subjects">{plan.subjects.map((s) => <option key={s} value={s} />)}</datalist></Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Data" id="s-date"><Input id="s-date" type="date" className="h-11" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Início" id="s-start"><Input id="s-start" type="time" className="h-11" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
        <Field label="Fim" id="s-end"><Input id="s-end" type="time" className="h-11" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
      </div>
      <Field label="Anotações" id="s-notes"><Textarea id="s-notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
    </FormDialog>
  );
}
