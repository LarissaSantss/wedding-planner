# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + TypeScript (strict) + Vite + Supabase (auth, database, storage). Estilização com CSS puro e variáveis custom properties dinâmicas (tokens de tema via `src/utils/theme.ts` com `--theme-*`).

## Users

- **Pessoal**: noivos, aniversariantes e famílias organizando o próprio evento (casamento, 15 anos, aniversário, bodas, formatura).
- **Profissional**: organizadores e empresas de eventos gerenciando múltiplos clientes/eventos simultaneamente.

## Product Purpose

SaaS multi-eventos comercializável que centraliza o planejamento completo de qualquer celebração — convidados, fornecedores, tarefas, orçamento e lista de presentes — em uma única plataforma com identidade visual premium por evento.

## Positioning

SaaS multi-eventos com temas visuais sofisticados e personalizáveis por evento (Rose Gold, Esmeralda Real, Azul Royal, Violeta Místico, Amber Gold, Luxury Dark), diferenciando-se de ferramentas genéricas de planejamento ao entregar uma experiência visual de alto padrão alinhada a cada celebração.

## Operating Context

- Usuário autentica via Supabase Auth (email/senha, OAuth, magic link).
- Cada evento pertence a um `user_id`; RLS isola os dados por usuário.
- Tabela central `events` com `event_type` e `theme_preset`; tabelas relacionais `guests`, `vendors`, `tasks`, `expenses`, `gift_registry_items`.
- O dashboard exibe o evento mais recente do usuário logado, com opção de trocar entre eventos.

## Capabilities and Constraints

- **Tipos de evento**: wedding, debutante, birthday, anniversary, corporate, graduation, other.
- **Temas visuais**: rose-gold, emerald, royal-blue, mystic-violet, amber-gold, luxury-dark.
- **Status do evento**: draft, planned, confirmed, completed.
- **Módulos**: convidados (RSVP), fornecedores, tarefas/checklist, despesas/orçamento, lista de presentes.
- **Tecnologia**: TypeScript strict mode; tipagem estrita em `src/lib/supabase/types.ts`; CRUD seguro em `src/lib/supabase/database.ts`; utilitário de tema em `src/utils/theme.ts`.
- **Decisão em aberto**: fluxo de criação de novo evento e onboarding de primeiro acesso ainda não definidos.

## Brand Commitments

- Nome do produto: Wedding & Events Planner.
- Identidade visual premium por evento, sem gradientes roxos genéricos de IA.
- Paletas de cores reais e sofisticadas alinhadas ao tema escolhido.

## Evidence on Hand

- Migration SQL: `supabase/migrations/20260101000000_initial_schema.sql` (schema completo com RLS).
- Tipos: `src/lib/supabase/types.ts`.
- CRUD: `src/lib/supabase/database.ts`.
- Temas: `src/utils/theme.ts`.
- Sem conteúdo real de clientes, depoimentos ou dados de demonstração ainda.

## Product Principles

1. **Multi-evento por padrão**: a arquitetura central é `events`, não casamentos; todo módulo deriva de um evento.
2. **Identidade visual premium**: cada evento carrega seu próprio tema sofisticado, aplicado de forma consistente na interface.
3. **Segurança por isolamento**: RLS garante que cada usuário acesse apenas seus próprios dados.
4. **Tipagem estrita**: contratos de dados explícitos e seguros em todo o frontend.
5. **Pronto para comercialização**: SaaS multi-tenant com base sólida para escalar a múltiplos clientes.

## Accessibility & Inclusion

- Interface responsiva (desktop e mobile).
- Contraste de cores adequado em cada preset de tema.
- Sem requisito de acessibilidade específico adicional estabelecido nesta etapa.