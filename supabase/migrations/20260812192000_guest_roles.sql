-- ========== PAPÉIS/CATEGORIAS + VOTAÇÃO DO CASAL (Luna) ==========
-- Categorias/papéis customizáveis por evento (Padrinho, Dama de Honra, etc.)
-- + atribuição de papéis a convidados E acompanhantes + votação dos anfitriões.

create table if not exists public.guest_roles (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  is_special boolean not null default true,
  created_at timestamptz not null default now()
);

-- Atribuição de um papel a um convidado OU a um acompanhante (exatamente um).
create table if not exists public.guest_role_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  role_id uuid not null references public.guest_roles (id) on delete cascade,
  guest_id uuid references public.guests (id) on delete cascade,
  companion_id uuid references public.guest_companions (id) on delete cascade,
  relationship_to_event text,
  created_at timestamptz not null default now(),
  constraint guest_role_assignment_target_check check (
    (guest_id is not null)::int + (companion_id is not null)::int = 1
  )
);

-- Voto de cada anfitrião/membro sobre uma atribuição de papel.
create table if not exists public.guest_role_votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  assignment_id uuid not null references public.guest_role_assignments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('pending','approved','rejected')) default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, user_id)
);

create index if not exists idx_guest_roles_event_id on public.guest_roles (event_id);
create index if not exists idx_guest_role_assignments_event_id on public.guest_role_assignments (event_id);
create index if not exists idx_guest_role_assignments_guest_id on public.guest_role_assignments (guest_id);
create index if not exists idx_guest_role_assignments_companion_id on public.guest_role_assignments (companion_id);
create index if not exists idx_guest_role_votes_assignment_id on public.guest_role_votes (assignment_id);

alter table public.guest_roles enable row level security;
alter table public.guest_role_assignments enable row level security;
alter table public.guest_role_votes enable row level security;

-- ROLES
create policy "Members read roles" on public.guest_roles
  for select using (public.is_event_member(event_id));
create policy "Members create roles" on public.guest_roles
  for insert with check (public.is_event_member(event_id));
create policy "Members update roles" on public.guest_roles
  for update using (public.is_event_member(event_id));
create policy "Members delete roles" on public.guest_roles
  for delete using (public.is_event_member(event_id));

-- ASSIGNMENTS
create policy "Members read assignments" on public.guest_role_assignments
  for select using (public.is_event_member(event_id));
create policy "Members create assignments" on public.guest_role_assignments
  for insert with check (public.is_event_member(event_id));
create policy "Members update assignments" on public.guest_role_assignments
  for update using (public.is_event_member(event_id));
create policy "Members delete assignments" on public.guest_role_assignments
  for delete using (public.is_event_member(event_id));

-- VOTES
create policy "Members read votes" on public.guest_role_votes
  for select using (public.is_event_member(event_id));
create policy "Members cast own vote" on public.guest_role_votes
  for insert with check (user_id = auth.uid() and public.is_event_member(event_id));
create policy "Members update own vote" on public.guest_role_votes
  for update using (user_id = auth.uid());
create policy "Members delete own vote" on public.guest_role_votes
  for delete using (user_id = auth.uid());