import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { addDays } from "date-fns";
import { CheckSquare, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryDot, ConfirmDelete, DemoBadge, EmptyState, PageHeader, useDialog } from "@/components/app/common";
import { TaskDialog, tasksRepo } from "@/components/app/forms";
import { db } from "@/lib/db";
import { fmt, ymd } from "@/lib/dates";
import { useCategories } from "@/lib/categories";
import { PRIORITY_LABEL, type Task } from "@/lib/types";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/tarefas")({ head: pageHead("Tarefas", "Organize tarefas com prioridade, categoria, data e filtros."), component: Tarefas });

const PRI_ORDER = { alta: 0, media: 1, baixa: 2 } as const;
export function filterTasks(tasks: Task[], f: { q: string; status: string; priority: string; cat: string; when: string }, today: string) {
  const week = ymd(addDays(new Date(today + "T12:00"), 7));
  return tasks.filter((t) => {
    if (f.q && !`${t.title} ${t.notes ?? ""}`.toLowerCase().includes(f.q.toLowerCase())) return false;
    if (f.status !== "todas" && t.status !== f.status) return false;
    if (f.priority !== "todas" && t.priority !== f.priority) return false;
    if (f.cat !== "todas" && t.categoryId !== f.cat) return false;
    if (f.when === "hoje" && t.date !== today) return false;
    if (f.when === "semana" && (!t.date || t.date < today || t.date > week)) return false;
    if (f.when === "atrasadas" && (!t.date || t.date >= today || t.status === "concluida")) return false;
    if (f.when === "sem-data" && t.date) return false;
    return true;
  }).sort((a, b) => (a.status === b.status ? 0 : a.status === "pendente" ? -1 : 1) || (a.date ?? "9999").localeCompare(b.date ?? "9999") || PRI_ORDER[a.priority] - PRI_ORDER[b.priority]);
}

function Tarefas() {
  const tasks = useLiveQuery(() => db.tasks.toArray(), []); const cats = useCategories(); const dlg = useDialog<Task>();
  const [f, setF] = useState({ q: "", status: "pendente", priority: "todas", cat: "todas", when: "todas" });
  const today = ymd();
  if (!tasks) return null;
  const list = filterTasks(tasks, f, today);
  const sel = (key: keyof typeof f, label: string, opts: [string, string][]) => (
    <Select value={f[key]} onValueChange={(v) => setF({ ...f, [key]: v })}><SelectTrigger className="h-11 w-full sm:w-40" aria-label={label}><SelectValue /></SelectTrigger><SelectContent>{opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
  );
  return (
    <div>
      <PageHeader title="Tarefas" subtitle={`${tasks.filter((t) => t.status === "pendente").length} pendentes`} actions={<Button className="h-11" onClick={() => dlg.show()}><Plus /> Nova tarefa</Button>} />
      <div className="mb-5 grid gap-2 sm:flex sm:flex-wrap">
        <Input className="h-11 sm:w-60" placeholder="Filtrar por texto…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} aria-label="Filtrar por texto" />
        {sel("when", "Quando", [["todas", "Qualquer data"], ["hoje", "Hoje"], ["semana", "Próximos 7 dias"], ["atrasadas", "Atrasadas"], ["sem-data", "Sem data"]])}
        {sel("status", "Status", [["todas", "Todos status"], ["pendente", "Pendentes"], ["concluida", "Concluídas"]])}
        {sel("priority", "Prioridade", [["todas", "Toda prioridade"], ["alta", "Alta"], ["media", "Média"], ["baixa", "Baixa"]])}
        {sel("cat", "Categoria", [["todas", "Toda categoria"], ...cats.map((c) => [c.id, c.name] as [string, string])])}
      </div>
      {list.length === 0 ? <EmptyState icon={<CheckSquare className="h-8 w-8" />} title={tasks.length ? "Nenhuma tarefa com esses filtros" : "Nenhuma tarefa ainda"} text="Crie uma tarefa para começar." action={<Button onClick={() => dlg.show()}><Plus /> Nova tarefa</Button>} /> :
        <ul className="card-soft divide-y divide-border">{list.map((t) => {
          const late = t.date && t.date < today && t.status === "pendente";
          return (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <Checkbox className="size-6" checked={t.status === "concluida"} onCheckedChange={(c) => tasksRepo.update(t.id, { status: c ? "concluida" : "pendente" })} aria-label={`Concluir ${t.title}`} />
              <div className="min-w-0 flex-1">
                <p className={t.status === "concluida" ? "text-muted-foreground line-through" : "font-medium"}>{t.title} <DemoBadge show={t.demo} /></p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {t.date && <span className={late ? "font-semibold text-destructive" : ""}>{late ? "Atrasada · " : ""}{fmt(t.date, "dd/MM")}{t.time && ` às ${t.time}`}</span>}
                  <span className={t.priority === "alta" ? "text-primary" : ""}>Prioridade {PRIORITY_LABEL[t.priority].toLowerCase()}</span>
                  <CategoryDot id={t.categoryId} />
                </div>
              </div>
              <Button variant="ghost" size="icon" className="size-11" aria-label="Editar" onClick={() => dlg.show(t)}><Pencil /></Button>
              <ConfirmDelete what="tarefa" onConfirm={() => tasksRepo.remove(t.id)} />
            </li>
          );
        })}</ul>}
      <TaskDialog open={dlg.open} onOpenChange={dlg.setOpen} task={dlg.item} />
    </div>
  );
}
