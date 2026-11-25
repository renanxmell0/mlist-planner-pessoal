import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import { PageHeader, Section } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { pageHead } from "@/lib/meta";
import { applyBackup, exportBackup, validateBackup, type ValidationResult } from "@/lib/backup";
import { clearAll, clearDemo } from "@/lib/repo";
import { seedDemo } from "@/lib/seed";
import { notificationsSupported } from "@/lib/reminders";

export const Route = createFileRoute("/configuracoes")({ head: pageHead("Configurações", "Backup, dados de exemplo, lembretes e armazenamento do MList."), component: Page });

const LABEL: Record<string, string> = { tasks: "Tarefas", events: "Eventos", routines: "Rotinas", routineLogs: "Registros de rotina", goals: "Metas", studyPlans: "Cronogramas", studySessions: "Sessões de estudo", reminders: "Lembretes", categories: "Categorias" };

function Page() {
  const file = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ValidationResult | null>(null);
  const [storage, setStorage] = useState<string>("Indisponível neste navegador");
  const [perm, setPerm] = useState<string>("");
  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setStorage(`${((e.usage ?? 0) / 1024 / 1024).toFixed(2)} MB usados`)).catch(() => undefined);
    setPerm(notificationsSupported() ? Notification.permission : "indisponível");
  }, []);

  async function doExport() {
    try {
      const b = await exportBackup(); const url = URL.createObjectURL(new Blob([JSON.stringify(b, null, 2)], { type: "application/json" }));
      const a = document.createElement("a"); a.href = url; a.download = `mlist-backup-${b.exportedAt.slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
      toast.success("Backup exportado");
    } catch { toast.error("Não foi possível exportar o backup."); }
  }
  async function onFile(f?: File) {
    if (!f) return;
    try { setPreview(validateBackup(JSON.parse(await f.text()))); }
    catch { setPreview({ ok: false, errors: ["O arquivo não é um JSON válido."], counts: {}, skipped: 0 }); }
    if (file.current) file.current.value = "";
  }
  async function confirmImport() {
    if (!preview) return;
    try { await applyBackup(preview); toast.success("Backup importado"); setPreview(null); } catch { toast.error("Falha ao importar. Seus dados atuais não foram alterados."); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" />
      <Section title="Backup manual">
        <p className="mb-4 text-sm text-muted-foreground">Seus dados ficam só neste aparelho. Exporte um arquivo JSON regularmente e guarde em local seguro.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={doExport}><Download /> Exportar backup</Button>
          <Button variant="outline" onClick={() => file.current?.click()}><Upload /> Importar backup</Button>
          <input ref={file} type="file" accept="application/json,.json" className="hidden" aria-label="Arquivo de backup" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
        {preview && (
          <div className="mt-4 rounded-xl border border-border p-4" role="status">
            {preview.ok ? <>
              <p className="font-medium">Conteúdo do arquivo:</p>
              <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">{Object.entries(preview.counts).map(([k, n]) => <li key={k}>{LABEL[k] ?? k}: {n}</li>)}</ul>
              {preview.skipped > 0 && <p className="mt-2 text-sm text-muted-foreground">{preview.skipped} item(ns) inválido(s) ou duplicado(s) serão ignorados.</p>}
              <div className="mt-4 flex gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button>Substituir meus dados</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Substituir todos os dados?</AlertDialogTitle><AlertDialogDescription>Os dados atuais deste aparelho serão apagados e trocados pelos do backup. Considere exportar um backup antes.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmImport}>Substituir</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button variant="ghost" onClick={() => setPreview(null)}>Cancelar</Button>
              </div>
            </> : <><p className="font-medium text-destructive">Não foi possível usar este arquivo:</p><ul className="mt-1 list-disc pl-5 text-sm">{preview.errors.map((e) => <li key={e}>{e}</li>)}</ul><Button className="mt-3" variant="ghost" onClick={() => setPreview(null)}>Fechar</Button></>}
          </div>
        )}
      </Section>
      <Section title="Dados de exemplo">
        <p className="mb-4 text-sm text-muted-foreground">Os exemplos aparecem marcados como “exemplo” e podem ser removidos sem afetar seus dados.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={async () => { await seedDemo(); toast.success("Exemplos adicionados"); }}>Adicionar exemplos</Button>
          <Button variant="outline" onClick={async () => { await clearDemo(); toast.success("Exemplos removidos"); }}>Remover exemplos</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="outline" className="text-destructive">Apagar todos os dados</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Apagar todos os dados?</AlertDialogTitle><AlertDialogDescription>Tarefas, rotinas, estudos, metas, eventos e lembretes serão apagados deste aparelho. Não pode ser desfeito.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => { await clearAll(); toast.success("Dados apagados"); }}>Apagar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Section>
      <Section title="Lembretes">
        <p className="text-sm text-muted-foreground">Permissão de notificações: <strong>{perm === "granted" ? "permitida" : perm === "denied" ? "bloqueada" : perm === "default" ? "não solicitada" : "indisponível"}</strong>. No iPad, notificações só funcionam com o app instalado na Tela de Início (iPadOS 16.4+) e não são garantidas com o app fechado.</p>
        {perm === "default" && <Button className="mt-3" variant="outline" onClick={async () => setPerm(await Notification.requestPermission())}>Permitir notificações</Button>}
      </Section>
      <Section title="Armazenamento e sobre">
        <p className="text-sm text-muted-foreground">{storage}. MList versão 1.0 — planner pessoal offline. Nenhum dado é enviado para servidores.</p>
      </Section>
    </div>
  );
}
