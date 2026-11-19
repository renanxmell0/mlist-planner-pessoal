import { useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories } from "@/lib/categories";
import { WEEKDAYS } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Pequena flor decorativa — usar com moderação. */
export function Flower({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("h-5 w-5 text-rose-soft", className)} fill="currentColor">
      {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="12" cy="6.5" rx="3.2" ry="4.6" transform={`rotate(${r} 12 12)`} opacity="0.85" />)}
      <circle cx="12" cy="12" r="2.4" className="text-primary" fill="currentColor" />
    </svg>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-semibold text-foreground md:text-4xl">{title}</h1>{subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
      <div className="mb-3 text-primary">{icon ?? <Flower className="h-8 w-8" />}</div>
      <p className="font-display text-lg text-foreground">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Section({ title, children, action, className }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={cn("card-soft p-5", className)}>
      <div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-xl font-medium">{title}</h2>{action}</div>
      {children}
    </section>
  );
}

export function ConfirmDelete({ onConfirm, what = "este item", trigger }: { onConfirm: () => void | Promise<void>; what?: string; trigger?: ReactNode }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger ?? <Button variant="ghost" size="icon" aria-label={`Excluir ${what}`}><Trash2 /></Button>}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Excluir {what}?</AlertDialogTitle><AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => onConfirm()}>Excluir</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Field({ label, children, error, id }: { label: string; children: ReactNode; error?: string; id?: string }) {
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label>{children}{error && <p className="text-sm text-destructive" role="alert">{error}</p>}</div>;
}

export function CategorySelect({ value, onChange }: { value?: string; onChange: (v: string | undefined) => void }) {
  const cats = useCategories();
  return (
    <Select value={value ?? "none"} onValueChange={(v) => onChange(v === "none" ? undefined : v)}>
      <SelectTrigger className="h-11"><SelectValue placeholder="Categoria" /></SelectTrigger>
      <SelectContent><SelectItem value="none">Sem categoria</SelectItem>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
    </Select>
  );
}

export function CategoryDot({ id }: { id?: string }) {
  const cats = useCategories(); const c = cats.find((x) => x.id === id); if (!c) return null;
  return <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />{c.name}</span>;
}

export function WeekdayPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dias da semana">
      {WEEKDAYS.map((d, i) => { const on = value.includes(i); return (
        <button type="button" key={d} aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== i) : [...value, i].sort())}
          className={cn("h-11 min-w-11 rounded-full border px-3 text-sm transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:bg-accent")}>{d}</button>
      ); })}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return <div className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} /></div>;
}

export function DemoBadge({ show }: { show?: boolean }) { return show ? <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">demo</span> : null; }

export function Loading() { return <div className="flex items-center justify-center py-16 text-muted-foreground" role="status"><Flower className="h-6 w-6 animate-spin" /><span className="ml-2">Carregando…</span></div>; }

export function useDialog<T = undefined>() { const [state, setState] = useState<{ open: boolean; item?: T }>({ open: false }); return { ...state, show: (item?: T) => setState({ open: true, item }), close: () => setState({ open: false }), setOpen: (o: boolean) => setState((s) => ({ ...s, open: o })) }; }
