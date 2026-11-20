import { createFileRoute } from "@tanstack/react-router";
import { EmptyState, PageHeader } from "@/components/app/common";
import { pageHead } from "@/lib/meta";

export const Route = createFileRoute("/configuracoes")({ head: pageHead("Configurações", "Configurações no MList, seu planner pessoal offline."), component: Page });

function Page() {
  return <div><PageHeader title="Configurações" /><EmptyState title="Esta tela ainda está em construção" text="Seus dados já ficam salvos no aparelho." /></div>;
}
