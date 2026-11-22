import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryDot, CategorySelect, ConfirmDelete, EmptyState, Field, Loading, PageHeader, ProgressBar, Section, useDialog } from "@/components/app/common";
import { FormDialog } from "@/components/app/forms";
import { db } from "@/lib/db";
import { repo, uid } from "@/lib/repo";
import { fmt, ymd } from "@/lib/dates";
import { goalProgress } from "@/lib/calc";
import { GOAL_STATUS_LABEL, type Goal, type GoalStatus, type GoalStep } from "@/lib/types";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/metas")({ head: pageHead("Metas", "Metas no MList: etapas, prazos e progresso das suas conquistas."), component: Page });

const goalsRepo = repo<Goal>("goals");
type Filter = "todas" | GoalStatus;

function Page() {
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const edit = useDialog<Goal>(); const [filter, setFilter] = useState<Filter>("todas");
  if (!goals) return <Loading />;
  const today = ymd();
  const list = goals.filter((g) => filter === "todas" || g.status === filter).sort((a, b) => (a.deadline ?? "9").localeCompare(b.deadline ?? "9"));
  const toggleStep = async (g: Goal, id: string) => {
    const steps = g.steps.map((s) => (s.id === id ? { ...s, done: !s.done } : s));
    const all = steps.length > 0 && steps.every((s) => s.done);
    await goalsRepo.update(g.id, { steps, status: all ? "concluida" : steps.some((s) => s.done) ? "em-andamento" : g.status === "concluida" ? "em-andamento" : g.status });
  };
  return (
    <div className="space-y-6">
      <PageHeader title="Metas" subtitle="Divida em etapas e acompanhe o progresso." actions={<Button className="h-11" onClick={() => edit.show()}><Plus /> Nova meta</Button>} />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar metas">
        {(["todas", "nao-iniciada", "em-andamento", "concluida"] as Filter[]).map((f) => <Button key={f} variant={filter === f ? "default" : "outline"} className="h-11" onClick={() => setFilter(f)}>{f === "todas" ? "Todas" : GOAL_STATUS_LABEL[f]}</Button>)}
      </div>
      {list.length === 0 ? <EmptyState title="Nenhuma meta aqui" text="Crie uma meta e adicione etapas para medir o avanço." action={<Button onClick={() => edit.show()}><Plus /> Criar meta</Button>} /> :
        <div className="grid gap-4 lg:grid-cols-2">{list.map((g) => { const p = goalProgress(g); const late = g.deadline && g.deadline < today && g.status !== "concluida"; return (
          <Section key={g.id} title={g.title} action={<div className="flex"><Button variant="ghost" size="icon" aria-label={`Editar ${g.title}`} onClick={() => edit.show(g)}><Pencil /></Button><ConfirmDelete what="esta meta" onConfirm={async () => { await goalsRepo.remove(g.id); toast.success("Meta excluída"); }} /></div>}>
            <div className="-mt-2 mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground"><span>{GOAL_STATUS_LABEL[g.status]}</span>{g.deadline && <span className={late ? "text-destructive" : ""}>Prazo: {fmt(g.deadline, "d 'de' MMM yyyy")}{late ? " (atrasada)" : ""}</span>}<CategoryDot id={g.categoryId} /></div>
            {g.description && <p className="mb-3 text-sm">{g.description}</p>}
            <div className="mb-3 flex items-center gap-3"><ProgressBar value={p} /><span className="shrink-0 text-sm text-muted-foreground">{p}%</span></div>
            {g.steps.length > 0 && <ul className="space-y-1">{g.steps.map((s) => <li key={s.id} className="flex min-h-11 items-center gap-3"><Checkbox className="size-5" checked={s.done} onCheckedChange={() => toggleStep(g, s.id)} aria-label={s.title} /><span className={s.done ? "text-muted-foreground line-through" : ""}>{s.title}</span></li>)}</ul>}
          </Section>); })}</div>}
      <GoalDialog open={edit.open} onOpenChange={edit.setOpen} goal={edit.item} />
    </div>
  );
}

function GoalDialog({ open, onOpenChange, goal }: { open: boolean; onOpenChange: (o: boolean) => void; goal?: Goal }) {
  const empty = { title: "", description: "", deadline: "", status: "nao-iniciada" as GoalStatus, steps: [] as GoalStep[], manualProgress: 0, categoryId: undefined as string | undefined };
  const [f, setF] = useState(empty); const [step, setStep] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { if (open) { setErr(""); setStep(""); setF(goal ? { title: goal.title, description: goal.description ?? "", deadline: goal.deadline ?? "", status: goal.status, steps: goal.steps, manualProgress: goal.manualProgress ?? 0, categoryId: goal.categoryId } : empty); } }, [open, goal]); // eslint-disable-line react-hooks/exhaustive-deps
  const addStep = () => { if (step.trim()) { setF({ ...f, steps: [...f.steps, { id: uid(), title: step.trim(), done: false }] }); setStep(""); } };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={goal ? "Editar meta" : "Nova meta"} onSubmit={async () => {
      if (!f.title.trim()) { setErr("Informe um título."); return false; }
      const data = { title: f.title.trim(), description: f.description || undefined, deadline: f.deadline || undefined, status: f.status, steps: f.steps, manualProgress: f.steps.length ? undefined : f.manualProgress, categoryId: f.categoryId };
      if (goal) await goalsRepo.update(goal.id, data); else await goalsRepo.create(data);
      toast.success(goal ? "Meta atualizada" : "Meta criada");
    }}>
      <Field label="Título" id="g-title" error={err}><Input id="g-title" className="h-11" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <Field label="Descrição" id="g-desc"><Textarea id="g-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Prazo" id="g-dl"><Input id="g-dl" type="date" className="h-11" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field>
        <Field label="Situação"><Select value={f.status} onValueChange={(v) => setF({ ...f, status: v as GoalStatus })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(GOAL_STATUS_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></Field>
      </div>
      <Field label="Etapas" id="g-step">
        <ul className="space-y-1">{f.steps.map((s) => <li key={s.id} className="flex items-center gap-2 text-sm"><span className="flex-1">{s.title}</span><Button type="button" variant="ghost" size="icon" aria-label={`Remover ${s.title}`} onClick={() => setF({ ...f, steps: f.steps.filter((x) => x.id !== s.id) })}><X /></Button></li>)}</ul>
        <div className="flex gap-2"><Input id="g-step" className="h-11" placeholder="Nova etapa" value={step} onChange={(e) => setStep(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addStep(); } }} /><Button type="button" variant="outline" className="h-11" onClick={addStep}>Adicionar</Button></div>
      </Field>
      {f.steps.length === 0 && <Field label={`Progresso manual: ${f.manualProgress}%`} id="g-man"><input id="g-man" type="range" min={0} max={100} step={5} className="w-full accent-primary" value={f.manualProgress} onChange={(e) => setF({ ...f, manualProgress: Number(e.target.value) })} /></Field>}
      <Field label="Categoria"><CategorySelect value={f.categoryId} onChange={(c) => setF({ ...f, categoryId: c })} /></Field>
    </FormDialog>
  );
}
