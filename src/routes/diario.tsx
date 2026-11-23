import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { Lock, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDelete, EmptyState, PageHeader, Section } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { db } from "@/lib/db";
import { fmt, ymd } from "@/lib/dates";
import { deleteEntry, readEntry, saveEntry, searchEntries, type Draft } from "@/lib/journal";
import { getLock, isUnlocked, setupLock, unlock } from "@/lib/crypto";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/diario")({ head: pageHead("Diário", "Escreva seu diário no MList, com entradas privadas criptografadas no aparelho."), component: Page });

function Page() {
  const entries = useLiveQuery(() => db.journal.toArray(), []) ?? [];
  const hasLock = useLiveQuery(async () => !!(await getLock()), []);
  const [q, setQ] = useState(""); const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null); const [status, setStatus] = useState("");
  const [unlocked, setUnlocked] = useState(isUnlocked()); const [pw, setPw] = useState("");
  const idRef = useRef<string | null>(null); const dirty = useRef(false);
  const list = searchEntries(entries, q);

  const open = async (id: string) => {
    const e = entries.find((x) => x.id === id); if (!e) return;
    const d = await readEntry(e); if (!d) { toast.error("Desbloqueie o diário para ler esta entrada."); return; }
    idRef.current = id; dirty.current = false; setSel(id); setDraft(d); setStatus("");
  };
  const create = () => { idRef.current = null; dirty.current = false; setSel("new"); setDraft({ date: ymd(), title: "", content: "", private: false }); setStatus(""); };
  const edit = (p: Partial<Draft>) => { dirty.current = true; setDraft((d) => (d ? { ...d, ...p } : d)); };

  // Salvamento automático 800 ms após a última alteração.
  useEffect(() => {
    if (!draft || !dirty.current) return;
    if (!draft.title.trim() && !draft.content.trim()) return;
    setStatus("Salvando…");
    const t = setTimeout(async () => {
      try { idRef.current = await saveEntry(draft, idRef.current ?? undefined); setSel(idRef.current); dirty.current = false; setStatus("Salvo"); }
      catch (err) { setStatus(""); toast.error(String((err as Error).message ?? err)); }
    }, 800);
    return () => clearTimeout(t);
  }, [draft]);

  const doUnlock = async () => {
    if (!pw) return;
    if (!hasLock) { if (pw.length < 6) { toast.error("Use ao menos 6 caracteres."); return; } await setupLock(pw); toast.success("Senha do diário criada"); }
    else if (!(await unlock(pw))) { toast.error("Senha incorreta"); return; }
    setPw(""); setUnlocked(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Diário" subtitle="Seus registros ficam só neste aparelho." actions={<Button className="h-11" onClick={create}><Plus /> Nova entrada</Button>} />
      {!unlocked && (
        <Section title={hasLock ? "Entradas privadas bloqueadas" : "Proteger entradas privadas"}>
          <p className="mb-3 text-sm text-muted-foreground">{hasLock ? "Digite a senha do diário para ler e escrever entradas privadas." : "Crie uma senha para criptografar entradas privadas. Sem ela, não há como recuperá-las."}</p>
          <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); void doUnlock(); }}>
            <Input type="password" aria-label="Senha do diário" className="h-11 max-w-xs" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Senha" />
            <Button type="submit" variant="outline" className="h-11"><Lock /> {hasLock ? "Desbloquear" : "Criar senha"}</Button>
          </form>
        </Section>
      )}
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Section title="Histórico">
          <div className="relative mb-3"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar no diário" className="h-11 pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar (exceto privadas)" /></div>
          {list.length === 0 ? <EmptyState title={q ? "Nada encontrado" : "Nenhuma entrada ainda"} text={q ? undefined : "Comece escrevendo sobre o seu dia."} /> :
            <ul className="space-y-1">{list.map((e) => <li key={e.id}><button onClick={() => open(e.id)} className={`w-full rounded-xl px-3 py-2 text-left hover:bg-accent ${sel === e.id ? "bg-accent" : ""}`}>
              <span className="block text-xs capitalize text-muted-foreground">{fmt(e.date, "EEE, d 'de' MMM yyyy")}</span>
              <span className="flex items-center gap-1 font-medium">{e.enc ? <><Lock className="h-3.5 w-3.5" /> Entrada privada</> : e.title || "Sem título"}</span>
            </button></li>)}</ul>}
        </Section>
        <Section title={draft ? (idRef.current ? "Editar entrada" : "Nova entrada") : "Entrada"} action={<span className="text-xs text-muted-foreground" aria-live="polite">{status}</span>}>
          {!draft ? <EmptyState title="Selecione ou crie uma entrada" /> : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Input type="date" aria-label="Data" className="h-11 w-44" value={draft.date} onChange={(e) => edit({ date: e.target.value })} />
                <label className="flex items-center gap-2 text-sm"><Switch checked={draft.private} disabled={!unlocked} onCheckedChange={(c) => edit({ private: c })} /> Privada{!unlocked && " (desbloqueie)"}</label>
                {idRef.current && <div className="ml-auto"><ConfirmDelete what="esta entrada" onConfirm={async () => { await deleteEntry(idRef.current!); setDraft(null); setSel(null); idRef.current = null; toast.success("Entrada excluída"); }} /></div>}
              </div>
              <Input aria-label="Título" className="h-11 text-lg" value={draft.title} onChange={(e) => edit({ title: e.target.value })} placeholder="Título" />
              <Textarea aria-label="Texto" className="min-h-[50vh] text-base leading-relaxed" value={draft.content} onChange={(e) => edit({ content: e.target.value })} placeholder="Como foi o seu dia?" />
              <p className="text-xs text-muted-foreground">Salvamento automático. Entradas privadas são criptografadas com a sua senha; sem ela não podem ser lidas.</p>
            </div>)}
        </Section>
      </div>
    </div>
  );
}
