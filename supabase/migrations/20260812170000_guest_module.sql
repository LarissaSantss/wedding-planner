-- ========== MÓDULO DE CONVIDADOS (Luna) — FASE 1 ==========
-- Evolui guests, adiciona permissões granulares + relacionamento com o evento,
-- e cria as tabelas de grupos, acompanhantes, votação e discussão — todas com
-- RLS baseada em `public.is_event_member`.

-- ========== 1. PERMISSÕES + RELACIONAMENTO EM EVENT_MEMBERS ==========
-- Novo nível de acesso ADMIN além de OWNER/EDITOR/VIEWER.
alter table public.event_members
  drop constraint if exists event_members_role_check;

alter table public.event_members
  add constraint event_members_role_check
  check (role in ('owner', 'admin', 'editor', 'viewer'));

alter table public.event_members
  add column if not exists can_vote boolean not null default false;

alter table public.event_members
  add column if not exists can_comment boolean not null default false;

alter table public.event_members
  add column if not exists can_prioritize boolean not null default false;

-- Relacionamento da pessoa COM O EVENTO (código estruturado, extensível por
-- event_type no frontend). NÃO é a permissão de acesso — são conceitos distintos.
alter table public.event_members
  add column if not exists relationship_to_event text;

-- Backfill: editor ganha votar/comentar; admin ganha votar/comentar/priorizar.
update public.event_members
set can_vote = true, can_comment = true
where role = 'editor';

update public.event_members
set can_vote = true, can_comment = true, can_prioritize = true
where role in ('admin', 'owner');

-- ========== 2. FUNÇÃO HELPER: PERMISSÃO DO MEMBRO ATUAL ==========
create or replace function public.member_can(p_event_id uuid, p_ability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and e.user_id = auth.uid()
  )
  or exists (
    select 1 from public.event_members m
    where m.event_id = p_event_id
      and m.user_id = auth.uid()
      and (
        m.role in ('owner', 'admin')
        or (p_ability = 'vote' and m.can_vote)
        or (p_ability = 'comment' and m.can_comment)
        or (p_ability = 'prioritize' and m.can_prioritize)
      )
  );
$$;

-- ========== 3. TABELAS DO MÓDULO ==========

create table if not exists public.event_guest_groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guest_companions (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  name text not null,
  relationship text check (relationship in ('spouse','partner','child','parent','friend','other')) default 'other',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guest_votes (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  vote text check (vote in ('agree','disagree')) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guest_id, user_id)
);

create table if not exists public.guest_comments (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references public.guests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== 4. EVOLUÇÃO DE GUESTS ==========
alter table public.guests
  add column if not exists priority smallint check (priority between 1 and 3);

alter table public.guests
  add column if not exists notes text;

alter table public.guests
  add column if not exists group_id uuid references public.event_guest_groups (id) on delete set null;

alter table public.guests
  add column if not exists relationship_to_event text;

alter table public.guests
  add column if not exists created_by uuid references auth.users (id) on delete set null;

alter table public.guests
  add column if not exists updated_at timestamptz not null default now();

-- ========== 5. ÍNDICES ==========
create index if not exists idx_guest_groups_event_id on public.event_guest_groups (event_id);
create index if not exists idx_guests_group_id on public.guests (group_id);
create index if not exists idx_guest_companions_guest_id on public.guest_companions (guest_id);
create index if not exists idx_guest_votes_guest_id on public.guest_votes (guest_id);
create index if not exists idx_guest_comments_guest_id on public.guest_comments (guest_id);

-- ========== 6. TRIGGERS DE UPDATED_AT ==========
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_guests_updated_at on public.guests;
create trigger trg_guests_updated_at
  before update on public.guests
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_guest_groups_updated_at on public.event_guest_groups;
create trigger trg_guest_groups_updated_at
  before update on public.event_guest_groups
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_guest_companions_updated_at on public.guest_companions;
create trigger trg_guest_companions_updated_at
  before update on public.guest_companions
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_guest_votes_updated_at on public.guest_votes;
create trigger trg_guest_votes_updated_at
  before update on public.guest_votes
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_guest_comments_updated_at on public.guest_comments;
create trigger trg_guest_comments_updated_at
  before update on public.guest_comments
  for each row execute procedure public.touch_updated_at();

-- ========== 7. ROW LEVEL SECURITY ==========
alter table public.event_guest_groups enable row level security;
alter table public.guest_companions enable row level security;
alter table public.guest_votes enable row level security;
alter table public.guest_comments enable row level security;

-- GRUPOS
create policy "Members read groups" on public.event_guest_groups
  for select using (public.is_event_member(event_id));
create policy "Members create groups" on public.event_guest_groups
  for insert with check (public.is_event_member(event_id));
create policy "Members update groups" on public.event_guest_groups
  for update using (public.is_event_member(event_id));
create policy "Members delete groups" on public.event_guest_groups
  for delete using (public.is_event_member(event_id));

-- ACOMPANHANTES
create policy "Members read companions" on public.guest_companions
  for select using (
    exists (
      select 1 from public.guests g
      where g.id = guest_companions.guest_id
        and public.is_event_member(g.event_id)
    )
  );
create policy "Members create companions" on public.guest_companions
  for insert with check (
    exists (
      select 1 from public.guests g
      where g.id = guest_companions.guest_id
        and public.is_event_member(g.event_id)
    )
  );
create policy "Members update companions" on public.guest_companions
  for update using (
    exists (
      select 1 from public.guests g
      where g.id = guest_companions.guest_id
        and public.is_event_member(g.event_id)
    )
  );
create policy "Members delete companions" on public.guest_companions
  for delete using (
    exists (
      select 1 from public.guests g
      where g.id = guest_companions.guest_id
        and public.is_event_member(g.event_id)
    )
  );

-- VOTOS
create policy "Members read votes" on public.guest_votes
  for select using (
    exists (
      select 1 from public.guests g
      where g.id = guest_votes.guest_id
        and public.is_event_member(g.event_id)
    )
  );
create policy "Members cast own vote" on public.guest_votes
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.guests g
      where g.id = guest_votes.guest_id
        and public.member_can(g.event_id, 'vote')
    )
  );
create policy "Members update own vote" on public.guest_votes
  for update using (
    user_id = auth.uid()
    and exists (
      select 1 from public.guests g
      where g.id = guest_votes.guest_id
        and public.member_can(g.event_id, 'vote')
    )
  );
create policy "Members delete own vote" on public.guest_votes
  for delete using (
    user_id = auth.uid()
    and exists (
      select 1 from public.guests g
      where g.id = guest_votes.guest_id
        and public.member_can(g.event_id, 'vote')
    )
  );

-- COMENTÁRIOS
create policy "Members read comments" on public.guest_comments
  for select using (
    exists (
      select 1 from public.guests g
      where g.id = guest_comments.guest_id
        and public.is_event_member(g.event_id)
    )
  );
create policy "Members create own comment" on public.guest_comments
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.guests g
      where g.id = guest_comments.guest_id
        and public.member_can(g.event_id, 'comment')
    )
  );
create policy "Members delete own comment" on public.guest_comments
  for delete using (user_id = auth.uid());

-- ========== 8. PERMISSÕES DE MEMBROS (SOMENTE OWNER/ADMIN) ==========
create policy "Owners and admins can update members"
  on public.event_members for update
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.user_id = auth.uid()
    )
    or exists (
      select 1 from public.event_members me
      where me.event_id = event_id
        and me.user_id = auth.uid()
        and me.role in ('owner', 'admin')
    )
  );

-- ========== 9. RPC: DEFINIR PRIORIDADE ==========
create or replace function public.set_guest_priority(p_guest_id uuid, p_priority smallint)
returns public.guests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guests;
begin
  if p_priority is null or p_priority < 1 or p_priority > 3 then
    raise exception 'INVALID_PRIORITY';
  end if;

  select * into v_guest from public.guests where id = p_guest_id;
  if not found then
    raise exception 'GUEST_NOT_FOUND';
  end if;

  if not public.member_can(v_guest.event_id, 'prioritize') then
    raise exception 'NOT_ALLOWED';
  end if;

  update public.guests set priority = p_priority where id = p_guest_id;
  select * into v_guest from public.guests where id = p_guest_id;
  return v_guest;
end;
$$;

-- ========== 10. RPC: LISTAR MEMBROS (COM PERFIL + RELACIONAMENTO) ==========
create or replace function public.list_event_members(p_event_id uuid)
returns table (
  user_id uuid,
  role text,
  can_vote boolean,
  can_comment boolean,
  can_prioritize boolean,
  relationship_to_event text,
  email text,
  full_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.user_id,
    m.role,
    m.can_vote,
    m.can_comment,
    m.can_prioritize,
    m.relationship_to_event,
    p.email,
    p.full_name
  from public.event_members m
  left join public.profiles p on p.id = m.user_id
  where m.event_id = p_event_id
    and public.is_event_member(p_event_id)
  order by m.created_at asc;
$$;

-- ========== 11. RPC: ATUALIZAR MEMBRO (ROLE + FLAGS + RELACIONAMENTO) ==========
create or replace function public.update_member_permissions(
  p_event_id uuid,
  p_user_id uuid,
  p_role text,
  p_can_vote boolean,
  p_can_comment boolean,
  p_can_prioritize boolean,
  p_relationship_to_event text
)
returns public.event_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.event_members;
begin
  if p_role not in ('owner', 'admin', 'editor', 'viewer') then
    raise exception 'INVALID_ROLE';
  end if;

  if not exists (
    select 1 from public.events e
    where e.id = p_event_id and e.user_id = auth.uid()
  ) and not exists (
    select 1 from public.event_members me
    where me.event_id = p_event_id
      and me.user_id = auth.uid()
      and me.role in ('owner', 'admin')
  ) then
    raise exception 'NOT_ALLOWED';
  end if;

  update public.event_members
  set
    role = p_role,
    can_vote = p_can_vote,
    can_comment = p_can_comment,
    can_prioritize = p_can_prioritize,
    relationship_to_event = p_relationship_to_event
  where event_id = p_event_id and user_id = p_user_id;

  select * into v_member
  from public.event_members
  where event_id = p_event_id and user_id = p_user_id;

  return v_member;
end;
$$;