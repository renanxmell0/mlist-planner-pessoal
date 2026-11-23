import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDelete, EmptyState, PageHeader, ProgressBar, Section } from "@/components/app/common";
import { MoodPicker, saveMood } from "@/components/app/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/lib/db";
import { fmt, ymd } from "@/lib/dates";
import { moodStats } from "@/lib/journal";
import { MOODS, type MoodValue } from "@/lib/types";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/humor")({ head: pageHead("Humor", "Registre seu humor diário no MList e acompanhe o histórico."), component: Page });

function Page() {
  const [date, setDate] = useState(ymd()); const [value, setValue] = useState<MoodValue | undefined>(); const [note, setNote] = useState("");
  const all = useLiveQuery(() => db.moods.toArray(), []) ?? [];
  const current = all.find((m) => m.date === date);
  useEffect(() => { setValue(current?.value); setNote(current?.note ?? ""); }, [date, current?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const sorted = [...all].sort((a, b) => b.date.localeCompare(a.date)); const st = moodStats(all);
  const save = async () => { if (!value) { toast.error("Escolha como você está."); return; } await saveMood(date, value, note.trim()); toast.success("Humor registrado"); };
  return (
    <div className="space-y-6">
      <PageHeader title="Humor" subtitle="Um registro por dia." />
      <div className="grid gap-6 md:grid-cols-2">
        <Section title="Registrar">
          <div className="space-y-4">
            <Input type="date" aria-label="Data" className="h-11 w-44" value={date} max={ymd()} onChange={(e) => setDate(e.target.value)} />
            <MoodPicker size="lg" value={value} onPick={setValue} />
            <Textarea aria-label="Observação" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Observação (opcional)" />
            <Button className="h-11" onClick={save}>{current ? "Atualizar" : "Salvar"}</Button>
          </div>
        </Section>
        <Section title="Resumo">
          {st.total === 0 ? <EmptyState title="Sem registros ainda" /> : <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{st.total} registros · média {st.avg.toLocaleString("pt-BR")} de 5</p>
            {MOODS.map((m) => <div key={m.value} className="flex items-center gap-3 text-sm"><span className="w-24">{m.emoji} {m.label}</span><ProgressBar value={Math.round((st.counts[m.value] / st.total) * 100)} /><span className="w-6 text-right tabular-nums">{st.counts[m.value]}</span></div>)}
          </div>}
        </Section>
      </div>
      <Section title="Histórico">
        {sorted.length === 0 ? <EmptyState title="Nenhum registro" /> : <ul className="divide-y">{sorted.map((m) => { const mo = MOODS.find((x) => x.value === m.value); return (
          <li key={m.id} className="flex min-h-14 items-center gap-3 py-2"><span className="text-2xl" aria-hidden>{mo?.emoji}</span>
            <button className="flex-1 text-left" onClick={() => setDate(m.date)}><span className="block text-sm font-medium capitalize">{fmt(m.date, "EEEE, d 'de' MMM yyyy")} · {mo?.label}</span>{m.note && <span className="text-sm text-muted-foreground">{m.note}</span>}</button>
            <ConfirmDelete what="este registro" onConfirm={() => db.moods.delete(m.id)} /></li>); })}</ul>}
      </Section>
    </div>
  );
}
