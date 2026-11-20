import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/app/common";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/estudos")({ head: pageHead("Cronogramas de Estudos", "Cronogramas de Estudos no MList, seu planner pessoal offline."), component: Page });

function Page() {
  return <div><PageHeader title="Cronogramas de Estudos" /><EmptyState title="Esta tela ainda está em construção" text="Seus dados já ficam salvos no aparelho." /></div>;
}
