-- ========== ORGANIZAÇÃO DE MESAS E ASSENTOS (Luna) ==========
-- Tabelas: event_tables (mesas) e event_table_guests (alocação de convidados
-- e acompanhantes em mesas). Isolado por event_id com RLS.

create table if not exists public.event_tables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  capacity integer not null default 8 check (capacity > 0),
  location text,
  created_at timestamptz not null default now()
);

create table if not exists public.event_table_guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  table_id uuid not null references public.event_tables (id) on delete cascade,
  guest_id uuid references public.guests (id) on delete cascade,
  companion_id uuid references public.guest_companions (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint event_table_guest_target_check check (
    (guest_id is not null)::int + (companion_id is not null)::int = 1
  ),
  unique (table_id, guest_id),
  unique (table_id, companion_id)
);

create index if not exists idx_event_tables_event_id on public.event_tables (event_id);
create index if not exists idx_event_table_guests_table_id on public.event_table_guests (table_id);
create index if not exists idx_event_table_guests_guest_id on public.event_table_guests (guest_id);

alter table public.event_tables enable row level security;
alter table public.event_table_guests enable row level security;

create policy "Members read tables" on public.event_tables
  for select using (public.is_event_member(event_id));
create policy "Members create tables" on public.event_tables
  for insert with check (public.is_event_member(event_id));
create policy "Members update tables" on public.event_tables
  for update using (public.is_event_member(event_id));
create policy "Members delete tables" on public.event_tables
  for delete using (public.is_event_member(event_id));

create policy "Members read table guests" on public.event_table_guests
  for select using (public.is_event_member(event_id));
create policy "Members create table guests" on public.event_table_guests
  for insert with check (public.is_event_member(event_id));
create policy "Members update table guests" on public.event_table_guests
  for update using (public.is_event_member(event_id));
create policy "Members delete table guests" on public.event_table_guests
  for delete using (public.is_event_member(event_id));