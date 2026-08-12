-- ========== CÓDIGO DE ACESSO + COMPARTILHAMENTO DE EVENTOS ==========
-- Permite que um usuário entre em um evento existente usando um código
-- de acesso ou link de convite (colaboração multiusuário).

-- ========== 1. COLUNA CODE EM EVENTS ==========
alter table public.events add column if not exists code text;

-- Backfill para eventos já existentes (código de 8 caracteres)
update public.events
set code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where code is null;

alter table public.events
  alter column code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

alter table public.events alter column code set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_code_key') then
    alter table public.events add constraint events_code_key unique (code);
  end if;
end $$;

-- ========== 2. TABELA EVENT_MEMBERS ==========
create table if not exists public.event_members (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text check (role in ('owner', 'editor', 'viewer')) default 'editor',
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists idx_event_members_user_id on public.event_members (user_id);

alter table public.event_members enable row level security;

-- ========== 3. FUNÇÃO HELPER: USUÁRIO TEM ACESSO AO EVENTO? ==========
-- security definer evita recursão de RLS entre events e event_members
create or replace function public.is_event_member(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and e.user_id = auth.uid()
  ) or exists (
    select 1 from public.event_members m
    where m.event_id = p_event_id and m.user_id = auth.uid()
  );
$$;

-- ========== 4. FUNÇÃO: ENTRAR NO EVENTO PELO CÓDIGO =========
create or replace function public.join_event_by_code(p_code text)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_event
  from public.events
  where code = upper(trim(p_code));

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  -- Dono não precisa virar membro do próprio evento
  if v_event.user_id <> auth.uid() then
    insert into public.event_members (event_id, user_id, role)
    values (v_event.id, auth.uid(), 'editor')
    on conflict (event_id, user_id) do nothing;
  end if;

  return v_event;
end;
$$;

-- ========== 5. RLS: EVENT_MEMBERS ==========
create policy "Members can view memberships of accessible events"
  on public.event_members for select
  using (public.is_event_member(event_id));

create policy "Event owners can add members"
  on public.event_members for insert
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  );

create policy "Event owners or self can remove members"
  on public.event_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = auth.uid()
    )
  );

-- ========== 6. RLS: EVENTS (dono OU membro podem ver) ==========
drop policy if exists "Users can view own events" on public.events;
create policy "Users can view accessible events"
  on public.events for select
  using (auth.uid() = user_id or public.is_event_member(id));

-- ========== 7. RLS: TABELAS FILHAS (acesso de membro) ==========

-- GUESTS
drop policy if exists "Users can view guests of own events" on public.guests;
drop policy if exists "Users can insert guests to own events" on public.guests;
drop policy if exists "Users can update guests of own events" on public.guests;
drop policy if exists "Users can delete guests of own events" on public.guests;
create policy "Members can view guests" on public.guests for select using (public.is_event_member(event_id));
create policy "Members can insert guests" on public.guests for insert with check (public.is_event_member(event_id));
create policy "Members can update guests" on public.guests for update using (public.is_event_member(event_id));
create policy "Members can delete guests" on public.guests for delete using (public.is_event_member(event_id));

-- VENDORS
drop policy if exists "Users can view vendors of own events" on public.vendors;
drop policy if exists "Users can insert vendors to own events" on public.vendors;
drop policy if exists "Users can update vendors of own events" on public.vendors;
drop policy if exists "Users can delete vendors of own events" on public.vendors;
create policy "Members can view vendors" on public.vendors for select using (public.is_event_member(event_id));
create policy "Members can insert vendors" on public.vendors for insert with check (public.is_event_member(event_id));
create policy "Members can update vendors" on public.vendors for update using (public.is_event_member(event_id));
create policy "Members can delete vendors" on public.vendors for delete using (public.is_event_member(event_id));

-- TASKS
drop policy if exists "Users can view tasks of own events" on public.tasks;
drop policy if exists "Users can insert tasks to own events" on public.tasks;
drop policy if exists "Users can update tasks of own events" on public.tasks;
drop policy if exists "Users can delete tasks of own events" on public.tasks;
create policy "Members can view tasks" on public.tasks for select using (public.is_event_member(event_id));
create policy "Members can insert tasks" on public.tasks for insert with check (public.is_event_member(event_id));
create policy "Members can update tasks" on public.tasks for update using (public.is_event_member(event_id));
create policy "Members can delete tasks" on public.tasks for delete using (public.is_event_member(event_id));

-- EXPENSES
drop policy if exists "Users can view expenses of own events" on public.expenses;
drop policy if exists "Users can insert expenses to own events" on public.expenses;
drop policy if exists "Users can update expenses of own events" on public.expenses;
drop policy if exists "Users can delete expenses of own events" on public.expenses;
create policy "Members can view expenses" on public.expenses for select using (public.is_event_member(event_id));
create policy "Members can insert expenses" on public.expenses for insert with check (public.is_event_member(event_id));
create policy "Members can update expenses" on public.expenses for update using (public.is_event_member(event_id));
create policy "Members can delete expenses" on public.expenses for delete using (public.is_event_member(event_id));

-- GIFT_REGISTRY_ITEMS
drop policy if exists "Users can view gift registry of own events" on public.gift_registry_items;
drop policy if exists "Users can insert gift registry to own events" on public.gift_registry_items;
drop policy if exists "Users can update gift registry of own events" on public.gift_registry_items;
drop policy if exists "Users can delete gift registry of own events" on public.gift_registry_items;
create policy "Members can view gift registry" on public.gift_registry_items for select using (public.is_event_member(event_id));
create policy "Members can insert gift registry" on public.gift_registry_items for insert with check (public.is_event_member(event_id));
create policy "Members can update gift registry" on public.gift_registry_items for update using (public.is_event_member(event_id));
create policy "Members can delete gift registry" on public.gift_registry_items for delete using (public.is_event_member(event_id));
