
import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { toast } from "sonner";
import { Download, Upload, Plus, Pencil, X } from "lucide-react";

import { PageHeader, Section, ConfirmDelete, Field } from "@/components/app/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { pageHead } from "@/lib/meta";
import {
  applyBackup,
  exportBackup,
  validateBackup,
  type ValidationResult,
} from "@/lib/backup";
import { clearAll, clearDemo, repo } from "@/lib/repo";
import { db } from "@/lib/db";
import { seedDemo } from "@/lib/seed";
import { notificationsSupported } from "@/lib/reminders";
import { CATEGORY_COLORS } from "@/lib/categories";
import type { Category } from "@/lib/types";

export const Route = createFileRoute("/configuracoes")({
  head: pageHead(
    "Configurações",
    "Categorias, backup, dados de exemplo, lembretes e armazenamento do MList."
  ),
  component: Page,
});

const categoriesRepo = repo<Category>("categories");

const LABEL: Record<string, string> = {
  tasks: "Tarefas",
  events: "Eventos",
  routines: "Rotinas",
  routineLogs: "Registros de rotina",
  goals: "Metas",
  studyPlans: "Cronogramas",
  studySessions: "Sessões de estudo",
  reminders: "Lembretes",
  categories: "Categorias",
};

function Page() {
  const file = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<ValidationResult | null>(null);
  const [storage, setStorage] = useState<string>(
    "Indisponível neste navegador"
  );
  const [perm, setPerm] = useState<string>("");

  const categories =
    useLiveQuery(() => db.categories.orderBy("name").toArray(), []) ?? [];

  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState(CATEGORY_COLORS[0]);
  const [editingCategory, setEditingCategory] =
    useState<Category | null>(null);

  useEffect(() => {
    navigator.storage
      ?.estimate?.()
      .then((e) =>
        setStorage(
          `${((e.usage ?? 0) / 1024 / 1024).toFixed(2)} MB usados`
        )
      )
      .catch(() => undefined);

    setPerm(
      notificationsSupported() ? Notification.permission : "indisponível"
    );
  }, []);

  function resetCategoryForm() {
    setCategoryName("");
    setCategoryColor(CATEGORY_COLORS[0]);
    setEditingCategory(null);
  }

  async function saveCategory() {
    const name = categoryName.trim();

    if (!name) {
      toast.error("Informe o nome da categoria.");
      return;
    }

    const duplicate = categories.some(
      (category) =>
        category.name.trim().toLowerCase() === name.toLowerCase() &&
        category.id !== editingCategory?.id
    );

    if (duplicate) {
      toast.error("Já existe uma categoria com esse nome.");
      return;
    }

    try {
      if (editingCategory) {
        await categoriesRepo.update(editingCategory.id, {
          name,
          color: categoryColor,
        });

        toast.success("Categoria atualizada.");
      } else {
        await categoriesRepo.create({
          name,
          color: categoryColor,
        });

        toast.success("Categoria criada.");
      }

      resetCategoryForm();
    } catch {
      toast.error("Não foi possível salvar a categoria.");
    }
  }

  function editCategory(category: Category) {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryColor(category.color);
  }

  
  async function deleteCategory(id: string) {
    try {
      await db.transaction(
        "rw",
        [
          db.categories,
          db.tasks,
          db.events,
          db.routines,
          db.goals,
        ],
        async () => {
          const tables = [
            db.tasks,
            db.events,
            db.routines,
            db.goals,
          ];

          for (const table of tables) {
            await table.toCollection().modify((item) => {
              if (item.categoryId === id) {
                delete item.categoryId;
                item.updatedAt = Date.now();
              }
            });
          }

          await db.categories.delete(id);
        }
      );

      if (editingCategory?.id === id) {
        resetCategoryForm();
      }

      toast.success("Categoria excluída.");
    } catch (error) {
      console.error("Erro ao excluir categoria:", error);
      toast.error("Não foi possível excluir a categoria.");
    }
  }


  async function doExport() {
    try {
      const b = await exportBackup();

      const url = URL.createObjectURL(
        new Blob([JSON.stringify(b, null, 2)], {
          type: "application/json",
        })
      );

      const a = document.createElement("a");
      a.href = url;
      a.download = `mlist-backup-${b.exportedAt.slice(0, 10)}.json`;
      a.click();

      URL.revokeObjectURL(url);
      toast.success("Backup exportado");
    } catch {
      toast.error("Não foi possível exportar o backup.");
    }
  }

  async function onFile(f?: File) {
    if (!f) return;

    try {
      setPreview(validateBackup(JSON.parse(await f.text())));
    } catch {
      setPreview({
        ok: false,
        errors: ["O arquivo não é um JSON válido."],
        counts: {},
        skipped: 0,
      });
    }

    if (file.current) file.current.value = "";
  }

  async function confirmImport() {
    if (!preview) return;

    try {
      await applyBackup(preview);
      toast.success("Backup importado");
      setPreview(null);
    } catch {
      toast.error(
        "Falha ao importar. Seus dados atuais não foram alterados."
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" />

      <Section title="Categorias">
        <p className="mb-4 text-sm text-muted-foreground">
          Crie e organize categorias para classificar suas tarefas,
          rotinas e metas. As alterações ficam salvas neste aparelho.
        </p>

        <div className="space-y-4">
          <Field
            label={editingCategory ? "Editar categoria" : "Nome da categoria"}
            id="category-name"
          >
            <Input
              id="category-name"
              className="h-11"
              placeholder="Ex.: Faculdade, Trabalho, Pessoal..."
              value={categoryName}
              maxLength={40}
              onChange={(e) => setCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveCategory();
                }
              }}
            />
          </Field>

          <div className="space-y-2">
            <p className="text-sm font-medium">Cor da categoria</p>

            <div className="flex flex-wrap gap-3">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Selecionar cor ${color}`}
                  aria-pressed={categoryColor === color}
                  onClick={() => setCategoryColor(color)}
                  className={`h-9 w-9 rounded-full border-2 transition-all ${
                    categoryColor === color
                      ? "scale-110 border-foreground ring-2 ring-ring ring-offset-2"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void saveCategory()}>
              {editingCategory ? (
                <>
                  <Pencil className="mr-2 h-4 w-4" />
                  Salvar alterações
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar categoria
                </>
              )}
            </Button>

            {editingCategory && (
              <Button
                type="button"
                variant="outline"
                onClick={resetCategoryForm}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar edição
              </Button>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">Minhas categorias</h3>
            <span className="text-xs text-muted-foreground">
              {categories.length} cadastradas
            </span>
          </div>

          {categories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma categoria cadastrada.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Crie sua primeira categoria acima.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((category) => (
                <li
                  key={category.id}
                  className="flex min-h-14 items-center gap-3 py-2"
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />

                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {category.name}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label={`Editar ${category.name}`}
                    onClick={() => editCategory(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <ConfirmDelete
                    what={`a categoria "${category.name}"`}
                    onConfirm={() => deleteCategory(category.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title="Backup manual">
        <p className="mb-4 text-sm text-muted-foreground">
          Seus dados ficam só neste aparelho. Exporte um arquivo JSON
          regularmente e guarde em local seguro.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button onClick={doExport}>
            <Download /> Exportar backup
          </Button>

          <Button
            variant="outline"
            onClick={() => file.current?.click()}
          >
            <Upload /> Importar backup
          </Button>

          <input
            ref={file}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Arquivo de backup"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>

        {preview && (
          <div className="mt-4 rounded-xl border border-border p-4" role="status">
            {preview.ok ? (
              <>
                <p className="font-medium">Conteúdo do arquivo:</p>

                <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
                  {Object.entries(preview.counts).map(([k, n]) => (
                    <li key={k}>
                      {LABEL[k] ?? k}: {n}
                    </li>
                  ))}
                </ul>

                {preview.skipped > 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {preview.skipped} item(ns) inválido(s) ou duplicado(s)
                    serão ignorados.
                  </p>
                )}

                <div className="mt-4 flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button>Substituir meus dados</Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Substituir todos os dados?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Os dados atuais deste aparelho serão apagados e
                          trocados pelos do backup. Considere exportar um
                          backup antes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmImport}>
                          Substituir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button
                    variant="ghost"
                    onClick={() => setPreview(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="font-medium text-destructive">
                  Não foi possível usar este arquivo:
                </p>

                <ul className="mt-1 list-disc pl-5 text-sm">
                  {preview.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>

                <Button
                  className="mt-3"
                  variant="ghost"
                  onClick={() => setPreview(null)}
                >
                  Fechar
                </Button>
              </>
            )}
          </div>
        )}
      </Section>

      <Section title="Dados de exemplo">
        <p className="mb-4 text-sm text-muted-foreground">
          Os exemplos aparecem marcados como “exemplo” e podem ser
          removidos sem afetar seus dados.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await seedDemo();
              toast.success("Exemplos adicionados");
            }}
          >
            Adicionar exemplos
          </Button>

          <Button
            variant="outline"
            onClick={async () => {
              await clearDemo();
              toast.success("Exemplos removidos");
            }}
          >
            Remover exemplos
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive">
                Apagar todos os dados
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Apagar todos os dados?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Tarefas, rotinas, estudos, metas, eventos e lembretes
                  serão apagados deste aparelho. Não pode ser desfeito.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    await clearAll();
                    toast.success("Dados apagados");
                  }}
                >
                  Apagar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Section>

      <Section title="Lembretes">
        <p className="text-sm text-muted-foreground">
          Permissão de notificações:{" "}
          <strong>
            {perm === "granted"
              ? "permitida"
              : perm === "denied"
                ? "bloqueada"
                : perm === "default"
                  ? "não solicitada"
                  : "indisponível"}
          </strong>
          . No iPad, notificações só funcionam com o app instalado na
          Tela de Início (iPadOS 16.4+) e não são garantidas com o app
          fechado.
        </p>

        {perm === "default" && (
          <Button
            className="mt-3"
            variant="outline"
            onClick={async () =>
              setPerm(await Notification.requestPermission())
            }
          >
            Permitir notificações
          </Button>
        )}
      </Section>

      <Section title="Armazenamento e sobre">
        <p className="text-sm text-muted-foreground">
          {storage}. MList versão 1.0 — planner pessoal offline.
          Nenhum dado é enviado para servidores.
        </p>
      </Section>
    </div>
  );
}
