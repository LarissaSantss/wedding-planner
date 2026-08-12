-- ========== MÓDULO TAREFAS / KANBAN (Luna) — FASE 1 ==========
-- Quadros (boards), colunas, categorias, tarefas evoluída, responsáveis,
-- subtarefas, comentários (com menções), anexos e histórico — tudo com RLS
-- multi-evento baseada em `public.is_event_member`.

-- ========== 1. QUADROS (BOARDS) ==========
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  description text,
  color_key text not null default 'rose',
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== 2. CATEGORIAS DE TAREFAS (por evento) ==========
create table if not exists public.task_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  icon_key text not null default 'folder',
  color_key text not null default 'rose',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== 3. COLUNAS DO QUADRO ==========
create table if not exists public.board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null,
  description text,
  color_key text not null default 'lavender',
  sort_order integer not null default 0,
  is_initial boolean not null default false,
  is_completion boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== 4. TAREFAS (evolução não-destrutiva) ==========
-- `assigned_to` (legado) é mantido por compatibilidade, mas a atribuição
-- passa a ser feita em `task_assignees` (responsável principal + colaboradores).
alter table public.tasks
  add column if not exists board_id uuid references public.boards (id) on delete set null;

alter table public.tasks
  add column if not exists column_id uuid references public.board_columns (id) on delete set null;

alter table public.tasks
  add column if not exists category_id uuid references public.task_categories (id) on delete set null;

alter table public.tasks
  add column if not exists position integer not null default 0;

alter table public.tasks
  add column if not exists created_by uuid references auth.users (id) on delete set null;

alter table public.tasks
  add column if not exists updated_at timestamptz not null default now();

-- ========== 5. RESPONSÁVEIS (principal + colaboradores) ==========
create table if not exists public.task_assignees (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('primary', 'collaborator')) default 'collaborator',
  created_at timestamptz not null default now(),
  unique (task_id, user_id)
);

-- ========== 6. SUBTAREFAS ==========
create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== 7. COMENTÁRIOS (com menções) ==========
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null,
  mentions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== 8. ANEXOS (arquivos ficam no Storage, não aqui) ==========
create table if not exists public.task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  filename text not null,
  storage_path text not null,
  content_type text,
  size_bytes bigint,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ========== 9. HISTÓRICO DE ATIVIDADES ==========
create table if not exists public.task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ========== 10. ÍNDICES ==========
create index if not exists idx_boards_event_id on public.boards (event_id);
create index if not exists idx_task_categories_event_id on public.task_categories (event_id);
create index if not exists idx_board_columns_board_id on public.board_columns (board_id);
create index if not exists idx_tasks_board_id on public.tasks (board_id);
create index if not exists idx_tasks_column_id on public.tasks (column_id);
create index if not exists idx_tasks_category_id on public.tasks (category_id);
create index if not exists idx_task_assignees_task_id on public.task_assignees (task_id);
create index if not exists idx_task_subtasks_task_id on public.task_subtasks (task_id);
create index if not exists idx_task_comments_task_id on public.task_comments (task_id);
create index if not exists idx_task_attachments_task_id on public.task_attachments (task_id);
create index if not exists idx_task_activity_task_id on public.task_activity (task_id);

-- ========== 11. TRIGGER DE UPDATED_AT ==========
-- reutiliza public.touch_updated_at (criado no módulo de convidados); garante aqui.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_boards_updated_at on public.boards;
create trigger trg_boards_updated_at
  before update on public.boards
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_board_columns_updated_at on public.board_columns;
create trigger trg_board_columns_updated_at
  before update on public.board_columns
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_task_categories_updated_at on public.task_categories;
create trigger trg_task_categories_updated_at
  before update on public.task_categories
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_task_subtasks_updated_at on public.task_subtasks;
create trigger trg_task_subtasks_updated_at
  before update on public.task_subtasks
  for each row execute procedure public.touch_updated_at();

drop trigger if exists trg_task_comments_updated_at on public.task_comments;
create trigger trg_task_comments_updated_at
  before update on public.task_comments
  for each row execute procedure public.touch_updated_at();

-- ========== 12. FUNÇÃO DE PERMISSÃO DE EDIÇÃO ==========
create or replace function public.can_manage_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.events e where e.id = p_event_id and e.user_id = auth.uid()
  )
  or exists (
    select 1 from public.event_members m
    where m.event_id = p_event_id and m.user_id = auth.uid()
      and m.role in ('owner', 'admin', 'editor')
  );
$$;

-- ========== 13. RLS ==========
alter table public.boards enable row level security;
alter table public.task_categories enable row level security;
alter table public.board_columns enable row level security;
alter table public.task_assignees enable row level security;
alter table public.task_subtasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.task_activity enable row level security;

-- BOARDS
create policy "Members read boards" on public.boards
  for select using (public.is_event_member(event_id));
create policy "Manage boards" on public.boards
  for insert with check (public.can_manage_event(event_id));
create policy "Manage boards update" on public.boards
  for update using (public.can_manage_event(event_id));
create policy "Manage boards delete" on public.boards
  for delete using (public.can_manage_event(event_id));

-- CATEGORIAS
create policy "Members read categories" on public.task_categories
  for select using (public.is_event_member(event_id));
create policy "Manage categories" on public.task_categories
  for insert with check (public.can_manage_event(event_id));
create policy "Manage categories update" on public.task_categories
  for update using (public.can_manage_event(event_id));
create policy "Manage categories delete" on public.task_categories
  for delete using (public.can_manage_event(event_id));

-- COLUNAS (resolvem via board -> event_id)
create policy "Members read columns" on public.board_columns
  for select using (
    exists (
      select 1 from public.boards b
      where b.id = board_columns.board_id and public.is_event_member(b.event_id)
    )
  );
create policy "Manage columns" on public.board_columns
  for insert with check (
    exists (
      select 1 from public.boards b
      where b.id = board_columns.board_id and public.can_manage_event(b.event_id)
    )
  );
create policy "Manage columns update" on public.board_columns
  for update using (
    exists (
      select 1 from public.boards b
      where b.id = board_columns.board_id and public.can_manage_event(b.event_id)
    )
  );
create policy "Manage columns delete" on public.board_columns
  for delete using (
    exists (
      select 1 from public.boards b
      where b.id = board_columns.board_id and public.can_manage_event(b.event_id)
    )
  );

-- RESPONSÁVEIS: apenas membros do evento; escreve apenas can_manage_event
create policy "Members read assignees" on public.task_assignees
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_assignees.task_id and public.is_event_member(t.event_id)
    )
  );
create policy "Manage assignees" on public.task_assignees
  for insert with check (
    public.is_event_member(
      (select event_id from public.tasks where id = task_assignees.task_id)
    ) is true
    and public.can_manage_event(
      (select event_id from public.tasks where id = task_assignees.task_id)
    )
    and task_assignees.user_id in (
      select m.user_id from public.event_members m
      where m.event_id = (select event_id from public.tasks where id = task_assignees.task_id)
      union
      select e.user_id from public.events e
      where e.id = (select event_id from public.tasks where id = task_assignees.task_id)
    )
  );
create policy "Manage assignees update" on public.task_assignees
  for update using (
    public.can_manage_event(
      (select event_id from public.tasks where id = task_assignees.task_id)
    )
  );
create policy "Manage assignees delete" on public.task_assignees
  for delete using (
    public.can_manage_event(
      (select event_id from public.tasks where id = task_assignees.task_id)
    )
  );

-- SUBTAREFAS
create policy "Members read subtasks" on public.task_subtasks
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_subtasks.task_id and public.is_event_member(t.event_id)
    )
  );
create policy "Manage subtasks" on public.task_subtasks
  for insert with check (
    public.can_manage_event(
      (select event_id from public.tasks where id = task_subtasks.task_id)
    )
  );
create policy "Manage subtasks update" on public.task_subtasks
  for update using (
    public.can_manage_event(
      (select event_id from public.tasks where id = task_subtasks.task_id)
    )
  );
create policy "Manage subtasks delete" on public.task_subtasks
  for delete using (
    public.can_manage_event(
      (select event_id from public.tasks where id = task_subtasks.task_id)
    )
  );

-- COMENTÁRIOS
create policy "Members read comments" on public.task_comments
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_comments.task_id and public.is_event_member(t.event_id)
    )
  );
create policy "Members create comment" on public.task_comments
  for insert with check (
    user_id = auth.uid()
    and public.is_event_member(
      (select event_id from public.tasks where id = task_comments.task_id)
    )
  );
create policy "Own comment delete" on public.task_comments
  for delete using (user_id = auth.uid());

-- ANEXOS
create policy "Members read attachments" on public.task_attachments
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_attachments.task_id and public.is_event_member(t.event_id)
    )
  );
create policy "Manage attachments" on public.task_attachments
  for insert with check (
    public.can_manage_event(
      (select event_id from public.tasks where id = task_attachments.task_id)
    )
  );
create policy "Manage attachments delete" on public.task_attachments
  for delete using (
    public.can_manage_event(
      (select event_id from public.tasks where id = task_attachments.task_id)
    )
  );

-- ATIVIDADE
create policy "Members read activity" on public.task_activity
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_activity.task_id and public.is_event_member(t.event_id)
    )
  );
create policy "Insert activity" on public.task_activity
  for insert with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_activity.task_id and public.can_manage_event(t.event_id)
    )
  );

-- ========== 14. BUCKET DE ANEXOS DE TAREFAS ==========
insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

drop policy if exists "Members can upload task attachments" on storage.objects;
create policy "Members can upload task attachments"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'task-attachments');

drop policy if exists "Members can read task attachments" on storage.objects;
create policy "Members can read task attachments"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'task-attachments');

drop policy if exists "Members can delete task attachments" on storage.objects;
create policy "Members can delete task attachments"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'task-attachments');