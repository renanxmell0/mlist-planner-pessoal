# MList — planner pessoal

Planner pessoal offline para iPad (paisagem e retrato) e celular, em português do Brasil. Todos os dados ficam no próprio aparelho, sem conta, sem servidor.

## Funcionalidades
- **Início**: resumo do dia, tarefas, agenda (rotina, eventos, estudos), metas e lembretes.
- **Tarefas**: criar, editar, concluir e excluir; filtros por texto, data, status, prioridade e categoria.
- **Minha Rotina**: atividades recorrentes por dia da semana, modelos (dias úteis, sábado, domingo, personalizado), ajuste só de um dia, conclusão diária.
- **Cronogramas de Estudos**: planos com período, matérias, status e sessões com horários; progresso e horas estudadas.
- **Calendário**: mês com marcação de dias e detalhes de eventos, rotina, estudos e tarefas.
- **Metas**: etapas, prazo, status e percentual.
- **Progresso**: métricas calculadas só dos seus registros (semana atual x anterior, últimas 4 semanas, metas).
- **Configurações**: exportar/importar backup JSON, dados de exemplo, apagar dados, permissão de notificações, armazenamento.
- Busca global (Ctrl/⌘+K), criação rápida, indicador online/offline.

## Capturas de tela
_(adicione aqui)_

## Tecnologias
TanStack Start + React 19, TypeScript, Vite, Tailwind CSS v4, Dexie (IndexedDB), vite-plugin-pwa, date-fns, Lucide, Vitest.

## Requisitos
Node.js 20+ e npm (ou Bun). Nenhum arquivo `.env` é necessário.

## Instalar e executar
```sh
npm install
npm run dev        # http://localhost:8080
npm run build      # build de produção
npm run preview    # testar o build
npx vitest run     # testes
```

## Estrutura
- `src/routes/` — páginas (uma por arquivo).
- `src/components/app/` — menu, formulários e componentes compartilhados.
- `src/lib/` — banco (`db.ts`), repositório (`repo.ts`), cálculos (`calc.ts`, `progress.ts`), backup (`backup.ts`), offline (`pwa.ts`), lembretes.
- `public/` — manifesto e ícones.

## Dados locais
IndexedDB via Dexie, tabelas: tasks, events, routines, routineLogs, goals, studyPlans, studySessions, reminders, categories, settings. Cada registro tem `id`, `createdAt`, `updatedAt`. A versão 2 do banco apaga definitivamente dados antigos de Diário, Hábitos, Humor e senha.

## Instalar no iPad
1. Abra o endereço publicado no **Safari** (com internet).
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**.
3. Abra pelo ícone. Após a primeira visita, o app abre sem internet.
O modo offline não funciona na prévia do editor, só no app publicado. Limpar dados do Safari apaga seus dados: faça backups.

## Backup
Configurações → **Exportar backup** gera um JSON com versão do esquema. **Importar** valida o arquivo, mostra o conteúdo, ignora itens inválidos/duplicados e só substitui os dados após confirmação. Backups antigos são migrados; backups de versão mais nova são recusados.

## Privacidade
Não há senha nem bloqueio. Os dados não saem do aparelho, mas qualquer pessoa com acesso ao aparelho desbloqueado pode vê-los.

## Notificações no iPadOS
Lembretes aparecem dentro do app. Notificações do sistema exigem permissão e, no iPad, app instalado na Tela de Início (iPadOS 16.4+). **Não há garantia de aviso com o app fechado.**

## Deploy na Vercel
Importe o repositório na Vercel; comando `npm run build`. Use HTTPS (obrigatório para PWA).

## Solução de problemas
- **App antigo após atualização**: feche e reabra; ou acesse com `?sw=off` para remover o cache offline.
- **Importação recusada**: confira se o arquivo é um backup do MList.
- **Sem notificações**: verifique a permissão em Ajustes do iPad e se o app está instalado.

## Commits
Mensagens curtas em português descrevendo a mudança.
