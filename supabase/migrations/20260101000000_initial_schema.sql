-- ========== MIGRATION MULTIEVENTOS - SAAS WEDDING & EVENTS PLANNER ==========
-- Cria as tabelas do banco de dados com suporte a múltiplos tipos de eventos e temas visuais

-- ========== EXTENSÕES ==========
-- gen_random_uuid() é nativo do PostgreSQL 13+ (Supabase usa PG15),
-- então não precisamos da extensão uuid-ossp.

-- ========== TABELA: PROFILES ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role text check (role in ('user', 'admin')) default 'user',
  created_at timestamptz not null default now()
);

-- Trigger para criar perfil automaticamente ao criar usuário
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ========== TABELA: EVENTS (Multi-Eventos SaaS) ==========
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  event_type text check (event_type in ('wedding', 'debutante', 'birthday', 'anniversary', 'corporate', 'graduation', 'other')) default 'wedding',
  theme_preset text check (theme_preset in ('rose-gold', 'emerald', 'royal-blue', 'mystic-violet', 'amber-gold', 'luxury-dark')) default 'rose-gold',
  description text,
  client_name_1 text, -- Ex: Nome da Noiva / Aniversariante / Empresa
  client_name_2 text, -- Ex: Nome do Noivo / Co-anfitrião (opcional)
  date date,
  location text,
  guest_count integer,
  budget numeric(12, 2),
  cover_image_url text,
  status text check (status in ('draft', 'planned', 'confirmed', 'completed')) default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== TABELA: GUESTS ==========
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  guest_group text,
  rsvp_status text check (rsvp_status in ('pending', 'confirmed', 'declined')) default 'pending',
  plus_one boolean default false,
  table_number integer,
  created_at timestamptz not null default now()
);

-- ========== TABELA: VENDORS ==========
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  category text,
  contact_name text,
  email text,
  phone text,
  address text,
  website text,
  notes text,
  status text check (status in ('pending', 'contracted', 'cancelled')) default 'pending',
  cost numeric(12, 2),
  created_at timestamptz not null default now()
);

-- ========== TABELA: TASKS ==========
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  completed boolean not null default false,
  priority text check (priority in ('low', 'medium', 'high')) default 'medium',
  category text,
  assigned_to uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ========== TABELA: EXPENSES ==========
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null default 0,
  category text,
  vendor_id uuid references public.vendors (id) on delete set null,
  paid boolean not null default false,
  due_date date,
  created_at timestamptz not null default now()
);

-- ========== TABELA: GIFT_REGISTRY_ITEMS ==========
create table if not exists public.gift_registry_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2),
  url text,
  image_url text,
  quantity integer not null default 1,
  purchased_quantity integer not null default 0,
  created_at timestamptz not null default now()
);

-- ========== ÍNDICES ==========
create index if not exists idx_events_user_id on public.events (user_id);
create index if not exists idx_guests_event_id on public.guests (event_id);
create index if not exists idx_vendors_event_id on public.vendors (event_id);
create index if not exists idx_tasks_event_id on public.tasks (event_id);
create index if not exists idx_expenses_event_id on public.expenses (event_id);
create index if not exists idx_gift_registry_event_id on public.gift_registry_items (event_id);

-- ========== ROW LEVEL SECURITY (RLS) ==========

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.guests enable row level security;
alter table public.vendors enable row level security;
alter table public.tasks enable row level security;
alter table public.expenses enable row level security;
alter table public.gift_registry_items enable row level security;

-- PROFILES
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- EVENTS
create policy "Users can view own events" on public.events for select using (auth.uid() = user_id);
create policy "Users can insert own events" on public.events for insert with check (auth.uid() = user_id);
create policy "Users can update own events" on public.events for update using (auth.uid() = user_id);
create policy "Users can delete own events" on public.events for delete using (auth.uid() = user_id);

-- GUESTS
create policy "Users can view guests of own events" on public.guests for select using (exists (select 1 from public.events e where e.id = guests.event_id and e.user_id = auth.uid()));
create policy "Users can insert guests to own events" on public.guests for insert with check (exists (select 1 from public.events e where e.id = guests.event_id and e.user_id = auth.uid()));
create policy "Users can update guests of own events" on public.guests for update using (exists (select 1 from public.events e where e.id = guests.event_id and e.user_id = auth.uid()));
create policy "Users can delete guests of own events" on public.guests for delete using (exists (select 1 from public.events e where e.id = guests.event_id and e.user_id = auth.uid()));

-- VENDORS
create policy "Users can view vendors of own events" on public.vendors for select using (exists (select 1 from public.events e where e.id = vendors.event_id and e.user_id = auth.uid()));
create policy "Users can insert vendors to own events" on public.vendors for insert with check (exists (select 1 from public.events e where e.id = vendors.event_id and e.user_id = auth.uid()));
create policy "Users can update vendors of own events" on public.vendors for update using (exists (select 1 from public.events e where e.id = vendors.event_id and e.user_id = auth.uid()));
create policy "Users can delete vendors of own events" on public.vendors for delete using (exists (select 1 from public.events e where e.id = vendors.event_id and e.user_id = auth.uid()));

-- TASKS
create policy "Users can view tasks of own events" on public.tasks for select using (exists (select 1 from public.events e where e.id = tasks.event_id and e.user_id = auth.uid()));
create policy "Users can insert tasks to own events" on public.tasks for insert with check (exists (select 1 from public.events e where e.id = tasks.event_id and e.user_id = auth.uid()));
create policy "Users can update tasks of own events" on public.tasks for update using (exists (select 1 from public.events e where e.id = tasks.event_id and e.user_id = auth.uid()));
create policy "Users can delete tasks of own events" on public.tasks for delete using (exists (select 1 from public.events e where e.id = tasks.event_id and e.user_id = auth.uid()));

-- EXPENSES
create policy "Users can view expenses of own events" on public.expenses for select using (exists (select 1 from public.events e where e.id = expenses.event_id and e.user_id = auth.uid()));
create policy "Users can insert expenses to own events" on public.expenses for insert with check (exists (select 1 from public.events e where e.id = expenses.event_id and e.user_id = auth.uid()));
create policy "Users can update expenses of own events" on public.expenses for update using (exists (select 1 from public.events e where e.id = expenses.event_id and e.user_id = auth.uid()));
create policy "Users can delete expenses of own events" on public.expenses for delete using (exists (select 1 from public.events e where e.id = expenses.event_id and e.user_id = auth.uid()));

-- GIFT_REGISTRY_ITEMS
create policy "Users can view gift registry of own events" on public.gift_registry_items for select using (exists (select 1 from public.events e where e.id = gift_registry_items.event_id and e.user_id = auth.uid()));
create policy "Users can insert gift registry to own events" on public.gift_registry_items for insert with check (exists (select 1 from public.events e where e.id = gift_registry_items.event_id and e.user_id = auth.uid()));
create policy "Users can update gift registry of own events" on public.gift_registry_items for update using (exists (select 1 from public.events e where e.id = gift_registry_items.event_id and e.user_id = auth.uid()));
create policy "Users can delete gift registry of own events" on public.gift_registry_items for delete using (exists (select 1 from public.events e where e.id = gift_registry_items.event_id and e.user_id = auth.uid()));

-- ========== TRIGGER: UPDATED_AT ==========
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
  before update on public.events
  for each row execute procedure public.handle_updated_at();