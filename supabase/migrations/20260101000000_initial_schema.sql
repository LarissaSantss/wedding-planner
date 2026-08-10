-- ========== MIGRATION INICIAL - WEDDING PLANNER ==========
-- Cria as tabelas do banco de dados com RLS (Row Level Security)

-- ========== EXTENSÕES ==========
create extension if not exists "uuid-ossp";

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

-- ========== TABELA: WEDDINGS ==========
create table if not exists public.weddings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  bride_name text,
  groom_name text,
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
  id uuid primary key default uuid_generate_v4(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
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
  id uuid primary key default uuid_generate_v4(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
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
  id uuid primary key default uuid_generate_v4(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
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
  id uuid primary key default uuid_generate_v4(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
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
  id uuid primary key default uuid_generate_v4(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
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
create index if not exists idx_weddings_user_id on public.weddings (user_id);
create index if not exists idx_guests_wedding_id on public.guests (wedding_id);
create index if not exists idx_vendors_wedding_id on public.vendors (wedding_id);
create index if not exists idx_tasks_wedding_id on public.tasks (wedding_id);
create index if not exists idx_expenses_wedding_id on public.expenses (wedding_id);
create index if not exists idx_gift_registry_wedding_id on public.gift_registry_items (wedding_id);

-- ========== ROW LEVEL SECURITY (RLS) ==========

-- Habilitar RLS em todas as tabelas
alter table public.profiles enable row level security;
alter table public.weddings enable row level security;
alter table public.guests enable row level security;
alter table public.vendors enable row level security;
alter table public.tasks enable row level security;
alter table public.expenses enable row level security;
alter table public.gift_registry_items enable row level security;

-- PROFILES: usuário só vê/edita o próprio perfil
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- WEDDINGS: usuário só acessa seus próprios casamentos
create policy "Users can view own weddings"
  on public.weddings for select
  using (auth.uid() = user_id);

create policy "Users can insert own weddings"
  on public.weddings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own weddings"
  on public.weddings for update
  using (auth.uid() = user_id);

create policy "Users can delete own weddings"
  on public.weddings for delete
  using (auth.uid() = user_id);

-- GUESTS: acesso via wedding do usuário
create policy "Users can view guests of own weddings"
  on public.guests for select
  using (
    exists (
      select 1 from public.weddings w
      where w.id = guests.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can insert guests to own weddings"
  on public.guests for insert
  with check (
    exists (
      select 1 from public.weddings w
      where w.id = guests.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can update guests of own weddings"
  on public.guests for update
  using (
    exists (
      select 1 from public.weddings w
      where w.id = guests.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can delete guests of own weddings"
  on public.guests for delete
  using (
    exists (
      select 1 from public.weddings w
      where w.id = guests.wedding_id and w.user_id = auth.uid()
    )
  );

-- VENDORS: acesso via wedding do usuário
create policy "Users can view vendors of own weddings"
  on public.vendors for select
  using (
    exists (
      select 1 from public.weddings w
      where w.id = vendors.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can insert vendors to own weddings"
  on public.vendors for insert
  with check (
    exists (
      select 1 from public.weddings w
      where w.id = vendors.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can update vendors of own weddings"
  on public.vendors for update
  using (
    exists (
      select 1 from public.weddings w
      where w.id = vendors.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can delete vendors of own weddings"
  on public.vendors for delete
  using (
    exists (
      select 1 from public.weddings w
      where w.id = vendors.wedding_id and w.user_id = auth.uid()
    )
  );

-- TASKS: acesso via wedding do usuário
create policy "Users can view tasks of own weddings"
  on public.tasks for select
  using (
    exists (
      select 1 from public.weddings w
      where w.id = tasks.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can insert tasks to own weddings"
  on public.tasks for insert
  with check (
    exists (
      select 1 from public.weddings w
      where w.id = tasks.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can update tasks of own weddings"
  on public.tasks for update
  using (
    exists (
      select 1 from public.weddings w
      where w.id = tasks.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can delete tasks of own weddings"
  on public.tasks for delete
  using (
    exists (
      select 1 from public.weddings w
      where w.id = tasks.wedding_id and w.user_id = auth.uid()
    )
  );

-- EXPENSES: acesso via wedding do usuário
create policy "Users can view expenses of own weddings"
  on public.expenses for select
  using (
    exists (
      select 1 from public.weddings w
      where w.id = expenses.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can insert expenses to own weddings"
  on public.expenses for insert
  with check (
    exists (
      select 1 from public.weddings w
      where w.id = expenses.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can update expenses of own weddings"
  on public.expenses for update
  using (
    exists (
      select 1 from public.weddings w
      where w.id = expenses.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can delete expenses of own weddings"
  on public.expenses for delete
  using (
    exists (
      select 1 from public.weddings w
      where w.id = expenses.wedding_id and w.user_id = auth.uid()
    )
  );

-- GIFT_REGISTRY_ITEMS: acesso via wedding do usuário
create policy "Users can view gift registry of own weddings"
  on public.gift_registry_items for select
  using (
    exists (
      select 1 from public.weddings w
      where w.id = gift_registry_items.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can insert gift registry to own weddings"
  on public.gift_registry_items for insert
  with check (
    exists (
      select 1 from public.weddings w
      where w.id = gift_registry_items.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can update gift registry of own weddings"
  on public.gift_registry_items for update
  using (
    exists (
      select 1 from public.weddings w
      where w.id = gift_registry_items.wedding_id and w.user_id = auth.uid()
    )
  );

create policy "Users can delete gift registry of own weddings"
  on public.gift_registry_items for delete
  using (
    exists (
      select 1 from public.weddings w
      where w.id = gift_registry_items.wedding_id and w.user_id = auth.uid()
    )
  );

-- ========== TRIGGER: ATUALIZAR UPDATED_AT ==========
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
  before update on public.weddings
  for each row execute procedure public.handle_updated_at();