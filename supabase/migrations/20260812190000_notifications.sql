-- ========== NOTIFICAÇÕES (Luna) — FASE 9 ==========
-- Arquitetura genérica de notificações por evento, preparada para menções,
-- atribuição de tarefa, comentários e prazos próximos. Não acopla à estrutura
-- de cada módulo: usa `type` + referência opcional a task_id.

create table if not exists public.event_notifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  task_id uuid references public.tasks (id) on delete set null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_read
  on public.event_notifications (user_id, read, created_at desc);

create index if not exists idx_notifications_event_id
  on public.event_notifications (event_id);

alter table public.event_notifications enable row level security;

-- O usuário só vê as próprias notificações de eventos dos quais participa.
create policy "Users read own notifications" on public.event_notifications
  for select using (user_id = auth.uid());

-- Inserir notificação para um membro do evento (o autor também precisa
-- pertencer ao evento para criar).
create policy "Members create notifications" on public.event_notifications
  for insert with check (
    public.is_event_member(event_id)
    and exists (
      select 1 from public.event_members m where m.event_id = event_id and m.user_id = user_id
      union
      select 1 from public.events e where e.id = event_id and e.user_id = user_id
    )
  );

-- Cada usuário marca como lida apenas as próprias notificações.
create policy "Users update own notifications" on public.event_notifications
  for update using (user_id = auth.uid());

create policy "Users delete own notifications" on public.event_notifications
  for delete using (user_id = auth.uid());