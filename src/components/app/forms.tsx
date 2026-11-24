import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategorySelect, Field } from "./common";
import { repo } from "@/lib/repo";
import { db } from "@/lib/db";
import { ymd } from "@/lib/dates";
import { type CalEvent, type Priority, type Reminder, type Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export const tasksRepo = repo<Task>("tasks");
export const eventsRepo = repo<CalEvent>("events");
export const remindersRepo = repo<Reminder>("reminders");

export function FormDialog({ open, onOpenChange, title, description, onSubmit, children, submitLabel = "Salvar" }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; onSubmit: () => Promise<boolean | void> | boolean | void; children: ReactNode; submitLabel?: string }) {
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => { e.preventDefault(); setBusy(true); try { const r = await onSubmit(); if (r !== false) onOpenChange(false); } catch (err) { toast.error("Não foi possível salvar", { description: String(err) }); } finally { setBusy(false); } };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <DialogHeader><DialogTitle className="font-display text-2xl">{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader>
          {children}
          <DialogFooter className="gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{submitLabel}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TaskDialog({ open, onOpenChange, task, defaultDate }: { open: boolean; onOpenChange: (o: boolean) => void; task?: Task; defaultDate?: string }) {
  const empty = { title: "", notes: "", date: defaultDate ?? ymd(), time: "", priority: "media" as Priority, categoryId: undefined as string | undefined };
  const [f, setF] = useState(empty); const [err, setErr] = useState("");
  useEffect(() => { if (open) { setErr(""); setF(task ? { title: task.title, notes: task.notes ?? "", date: task.date ?? "", time: task.time ?? "", priority: task.priority, categoryId: task.categoryId } : empty); } }, [open, task]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={task ? "Editar tarefa" : "Nova tarefa"} onSubmit={async () => {
      if (!f.title.trim()) { setErr("Informe um título."); return false; }
      const data = { title: f.title.trim(), notes: f.notes || undefined, date: f.date || undefined, time: f.time || undefined, priority: f.priority, categoryId: f.categoryId };
      if (task) await tasksRepo.update(task.id, data); else await tasksRepo.create({ ...data, status: "pendente" });
      toast.success(task ? "Tarefa atualizada" : "Tarefa criada");
    }}>
      <Field label="Título" id="t-title" error={err}><Input id="t-title" className="h-11" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex.: Estudar capítulo 3" autoFocus /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data" id="t-date"><Input id="t-date" type="date" className="h-11" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Horário" id="t-time"><Input id="t-time" type="time" className="h-11" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prioridade"><Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v as Priority })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="media">Média</SelectItem><SelectItem value="alta">Alta</SelectItem></SelectContent></Select></Field>
        <Field label="Categoria"><CategorySelect value={f.categoryId} onChange={(v) => setF({ ...f, categoryId: v })} /></Field>
      </div>
      <Field label="Notas" id="t-notes"><Textarea id="t-notes" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
    </FormDialog>
  );
}

export function EventDialog({ open, onOpenChange, event, defaultDate }: { open: boolean; onOpenChange: (o: boolean) => void; event?: CalEvent; defaultDate?: string }) {
  const empty = { title: "", date: defaultDate ?? ymd(), start: "", end: "", notes: "", categoryId: undefined as string | undefined };
  const [f, setF] = useState(empty); const [err, setErr] = useState("");
  useEffect(() => { if (open) { setErr(""); setF(event ? { title: event.title, date: event.date, start: event.start ?? "", end: event.end ?? "", notes: event.notes ?? "", categoryId: event.categoryId } : empty); } }, [open, event]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={event ? "Editar evento" : "Novo evento"} onSubmit={async () => {
      if (!f.title.trim() || !f.date) { setErr("Título e data são obrigatórios."); return false; }
      if (f.start && f.end && f.end <= f.start) { setErr("O término deve ser depois do início."); return false; }
      const data = { title: f.title.trim(), date: f.date, start: f.start || undefined, end: f.end || undefined, notes: f.notes || undefined, categoryId: f.categoryId };
      if (event) await eventsRepo.update(event.id, data); else await eventsRepo.create(data);
      toast.success(event ? "Evento atualizado" : "Evento criado");
    }}>
      <Field label="Título" id="e-title" error={err}><Input id="e-title" className="h-11" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex.: Aniversário da Ana" /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Data"><Input type="date" className="h-11" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Início"><Input type="time" className="h-11" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
        <Field label="Término"><Input type="time" className="h-11" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
      </div>
      <Field label="Categoria"><CategorySelect value={f.categoryId} onChange={(v) => setF({ ...f, categoryId: v })} /></Field>
      <Field label="Notas"><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
    </FormDialog>
  );
}

export function ReminderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [title, setTitle] = useState(""); const [at, setAt] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { if (open) { setTitle(""); setErr(""); const d = new Date(Date.now() + 3600e3); d.setMinutes(0); setAt(`${ymd(d)}T${String(d.getHours()).padStart(2, "0")}:00`); } }, [open]);
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Novo lembrete" description="Avisos aparecem com o MList aberto. No iPad, notificações com o app fechado não são garantidas." onSubmit={async () => {
      if (!title.trim() || !at) { setErr("Informe título e horário."); return false; }
      await remindersRepo.create({ title: title.trim(), at, done: false, fired: false }); toast.success("Lembrete criado");
    }}>
      <Field label="O que lembrar?" error={err}><Input className="h-11" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Tomar vitamina" /></Field>
      <Field label="Quando"><Input type="datetime-local" className="h-11" value={at} onChange={(e) => setAt(e.target.value)} /></Field>
    </FormDialog>
  );
}

