import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { BarChart3, BookOpen, CalendarDays, CheckSquare, Clock, Flag, Home, Menu, Plus, Search, Settings, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Toaster } from "@/components/ui/sonner";
import { Flower } from "./common";
import { EventDialog, ReminderDialog, TaskDialog } from "./forms";
import { db } from "@/lib/db";
import { checkReminders } from "@/lib/reminders";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/", label: "Início", icon: Home },
  { to: "/tarefas", label: "Tarefas", icon: CheckSquare },
  { to: "/rotina", label: "Minha Rotina", icon: Clock },
  { to: "/estudos", label: "Cronogramas de Estudos", icon: BookOpen },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/metas", label: "Metas", icon: Flag },
  { to: "/progresso", label: "Progresso", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1" aria-label="Navegação principal">
      {NAV.map((n) => { const active = path === n.to; return (
        <Link key={n.to} to={n.to} onClick={onNavigate} aria-current={active ? "page" : undefined}
          className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors", active ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60")}>
          <n.icon className="h-5 w-5 shrink-0" />{n.label}
        </Link>
      ); })}
    </nav>
  );
}

function Brand() { return <div className="flex items-center gap-2 px-3 pb-4 pt-2"><Flower className="h-6 w-6" /><span className="font-display text-2xl font-semibold text-foreground">MList</span></div>; }

function useOnline() {
  const [on, setOn] = useState(true);
  useEffect(() => { const u = () => setOn(navigator.onLine); u(); window.addEventListener("online", u); window.addEventListener("offline", u); return () => { window.removeEventListener("online", u); window.removeEventListener("offline", u); }; }, []);
  return on;
}

function GlobalSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [q, setQ] = useState(""); const nav = useNavigate();
  const results = useLiveQuery(async () => {
    const s = q.trim().toLowerCase(); if (s.length < 2) return [];
    const has = (t?: string) => !!t && t.toLowerCase().includes(s);
    const [tasks, events, routines, goals, plans] = await Promise.all([db.tasks.toArray(), db.events.toArray(), db.routines.toArray(), db.goals.toArray(), db.studyPlans.toArray()]);
    return [
      ...tasks.filter((x) => has(x.title) || has(x.notes)).map((x) => ({ id: x.id, label: x.title, group: "Tarefas", to: "/tarefas" })),
      ...events.filter((x) => has(x.title)).map((x) => ({ id: x.id, label: `${x.title} · ${x.date.split("-").reverse().join("/")}`, group: "Eventos", to: "/calendario" })),
      ...routines.filter((x) => has(x.title)).map((x) => ({ id: x.id, label: x.title, group: "Rotina", to: "/rotina" })),
      ...goals.filter((x) => has(x.title)).map((x) => ({ id: x.id, label: x.title, group: "Metas", to: "/metas" })),
      ...plans.filter((x) => has(x.title) || x.subjects.some(has)).map((x) => ({ id: x.id, label: x.title, group: "Estudos", to: "/estudos" })),
    ].slice(0, 40);
  }, [q]) ?? [];
  const groups = [...new Set(results.map((r) => r.group))];
  return (
    <CommandDialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQ(""); }}>
      <CommandInput placeholder="Buscar em tudo…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>{q.trim().length < 2 ? "Digite pelo menos 2 letras." : "Nada encontrado."}</CommandEmpty>
        {groups.map((g) => <CommandGroup key={g} heading={g}>{results.filter((r) => r.group === g).map((r) => <CommandItem key={r.id} value={`${r.label}-${r.id}`} onSelect={() => { onOpenChange(false); nav({ to: r.to }); }}>{r.label}</CommandItem>)}</CommandGroup>)}
      </CommandList>
    </CommandDialog>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false); const [search, setSearch] = useState(false);
  const [dlg, setDlg] = useState<"task" | "event" | "reminder" | null>(null);
  const online = useOnline();
  useEffect(() => { void checkReminders(); const t = setInterval(() => void checkReminders(), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch(true); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, []);
  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar p-3 lg:block"><Brand /><NavList /></aside>
      <Sheet open={drawer} onOpenChange={setDrawer}><SheetContent side="left" className="w-72 bg-sidebar p-3"><SheetTitle className="sr-only">Menu</SheetTitle><Brand /><NavList onNavigate={() => setDrawer(false)} /></SheetContent></Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="size-11 lg:hidden" aria-label="Abrir menu" onClick={() => setDrawer(true)}><Menu /></Button>
          <span className="font-display text-xl font-semibold lg:hidden">MList</span>
          <button onClick={() => setSearch(true)} className="ml-auto flex h-11 min-w-0 items-center gap-2 rounded-full border border-input bg-card px-4 text-sm text-muted-foreground hover:bg-accent sm:w-72 lg:ml-0"><Search className="h-4 w-4" /><span className="hidden sm:inline">Buscar…</span></button>
          <span className={cn("ml-auto hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:flex", online ? "bg-secondary text-muted-foreground" : "bg-accent text-accent-foreground")} role="status">{online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{online ? "Online" : "Offline — dados salvos no aparelho"}</span>
          <DropdownMenu><DropdownMenuTrigger asChild><Button className="h-11 rounded-full" aria-label="Criar rápido"><Plus /><span className="hidden sm:inline">Novo</span></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuItem className="min-h-11" onSelect={() => setDlg("task")}>Tarefa</DropdownMenuItem><DropdownMenuItem className="min-h-11" onSelect={() => setDlg("event")}>Evento</DropdownMenuItem><DropdownMenuItem className="min-h-11" onSelect={() => setDlg("reminder")}>Lembrete</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </header>
        {!online && <div className="bg-accent px-4 py-1.5 text-center text-xs text-accent-foreground sm:hidden">Offline — tudo continua salvo no aparelho</div>}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
      <GlobalSearch open={search} onOpenChange={setSearch} />
      <TaskDialog open={dlg === "task"} onOpenChange={(o) => !o && setDlg(null)} />
      <EventDialog open={dlg === "event"} onOpenChange={(o) => !o && setDlg(null)} />
      <ReminderDialog open={dlg === "reminder"} onOpenChange={(o) => !o && setDlg(null)} />
      <Toaster position="top-center" richColors={false} />
    </div>
  );
}
