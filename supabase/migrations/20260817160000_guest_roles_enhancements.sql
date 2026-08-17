-- ========== APRIMORAMENTO DO MÓDULO DE CONVIDADOS (Luna) ==========
-- 1. Grupos ganham cor + ordem de exibição
-- 2. Papéis/categorias ganham descrição, ícone, cor e flag de múltiplos
-- 3. Seed automático de grupos + papéis padrão ao criar um casamento
-- 4. Backfill para casamentos existentes

-- ========== 1. EVENT_GUEST_GROUPS: COR + ORDEM ==========
alter table public.event_guest_groups
  add column if not exists color text not null default '#c9a9a6';

alter table public.event_guest_groups
  add column if not exists sort_order integer not null default 0;

-- ========== 2. GUEST_ROLES: DESCRIÇÃO + ÍCONE + COR + MÚLTIPLOS ==========
alter table public.guest_roles
  add column if not exists description text;

alter table public.guest_roles
  add column if not exists icon text not null default 'star';

alter table public.guest_roles
  add column if not exists color text not null default '#8b7a9e';

-- allow_multiple = true  → o papel pode ser atribuído a várias pessoas
-- allow_multiple = false → o papel deve ser exclusivo (1 pessoa)
alter table public.guest_roles
  add column if not exists allow_multiple boolean not null default true;

-- ========== 3. SEED AUTOMÁTICO (RPC + TRIGGER) ==========

create or replace function public.seed_event_guest_defaults(p_event_id uuid, p_event_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_groups text[] := '{}';
  v_group text;
  v_group_id uuid;
  v_roles text[] := '{}';
  v_role text;
  v_default_color text;
begin
  -- Grupos padrão por tipo de evento (casamento por padrão)
  if p_event_type = 'wedding' then
    v_groups := array['Família da noiva','Família do noivo','Amigos da noiva','Amigos do noivo','Padrinhos','Trabalho','Crianças','Outros'];
  else
    v_groups := array['Família','Amigos','Trabalho','Crianças','Outros'];
  end if;

  -- Cria apenas os grupos que ainda não existem para este evento
  foreach v_group in array v_groups
  loop
    if not exists (
      select 1 from public.event_guest_groups
      where event_id = p_event_id and name = v_group
    ) then
      v_default_color := case v_group
        when 'Família da noiva' then '#d4a5a5'
        when 'Família do noivo' then '#a5b8d4'
        when 'Amigos da noiva' then '#e8c9a0'
        when 'Amigos do noivo' then '#a8d4c0'
        when 'Padrinhos' then '#c9a9d4'
        when 'Trabalho' then '#9db4c0'
        when 'Crianças' then '#f2d1a0'
        when 'Família' then '#d4a5a5'
        when 'Amigos' then '#a8d4c0'
        when 'Outros' then '#b0b0b0'
        else '#c9a9a6'
      end;

      insert into public.event_guest_groups (event_id, name, color, sort_order)
      values (p_event_id, v_group, v_default_color, array_position(v_groups, v_group) - 1);
    end if;
  end loop;

  -- Papéis especiais padrão para casamento
  if p_event_type = 'wedding' then
    v_roles := array['Padrinho','Madrinha','Daminha','Pajém','Florista','Celebrante','Porta-alianças','Leitura','Entrada das alianças','Entrada dos noivos','Recepção','Homenagem','Outro'];
  else
    v_roles := array['Anfitrião','Homenagem','Recepção','Outro'];
  end if;

  foreach v_role in array v_roles
  loop
    if not exists (
      select 1 from public.guest_roles
      where event_id = p_event_id and name = v_role
    ) then
      insert into public.guest_roles (event_id, name, description, icon, color, allow_multiple)
      values (
        p_event_id,
        v_role,
        case v_role
          when 'Padrinho' then 'Acompanha o noivo durante a cerimônia'
          when 'Madrinha' then 'Acompanha a noiva durante a cerimônia'
          when 'Daminha' then 'Menina que participa da entrada da noiva'
          when 'Pajém' then 'Menino que participa da entrada da noiva'
          when 'Florista' then 'Espalha pétalas na entrada da noiva'
          when 'Celebrante' then 'Conduz a cerimônia religiosa/civil'
          when 'Porta-alianças' then 'Leva as alianças até o altar'
          when 'Leitura' then 'Faz leituras durante a cerimônia'
          when 'Entrada das alianças' then 'Momento da entrada das alianças'
          when 'Entrada dos noivos' then 'Momento da entrada dos noivos'
          when 'Recepção' then 'Apoio na recepção dos convidados'
          when 'Homenagem' then 'Participa de homenagem aos noivos'
          else 'Papel especial no evento'
        end,
        case v_role
          when 'Padrinho' then 'user-check'
          when 'Madrinha' then 'user-check'
          when 'Daminha' then 'flower'
          when 'Pajém' then 'flower'
          when 'Florista' then 'flower'
          when 'Celebrante' then 'mic'
          when 'Porta-alianças' then 'ring'
          when 'Leitura' then 'book-open'
          when 'Entrada das alianças' then 'ring'
          when 'Entrada dos noivos' then 'walk'
          when 'Recepção' then 'handshake'
          when 'Homenagem' then 'heart'
          else 'star'
        end,
        case v_role
          when 'Padrinho' then '#5b7a9d'
          when 'Madrinha' then '#c26a8a'
          when 'Daminha' then '#e0a5b5'
          when 'Pajém' then '#a5c4d4'
          when 'Florista' then '#d4987a'
          when 'Celebrante' then '#7a8a6a'
          when 'Porta-alianças' then '#c9a227'
          when 'Leitura' then '#8a6a9d'
          when 'Entrada das alianças' then '#c9a227'
          when 'Entrada dos noivos' then '#6a7a9d'
          when 'Recepção' then '#4a8a6a'
          when 'Homenagem' then '#c26a6a'
          else '#8b7a9e'
        end,
        case v_role
          when 'Padrinho' then true
          when 'Madrinha' then true
          when 'Daminha' then true
          when 'Pajém' then true
          when 'Florista' then true
          when 'Celebrante' then false
          when 'Porta-alianças' then false
          when 'Leitura' then true
          when 'Entrada das alianças' then true
          when 'Entrada dos noivos' then true
          when 'Recepção' then true
          when 'Homenagem' then true
          else true
        end
      );
    end if;
  end loop;
end;
$$;

-- Trigger: ao criar qualquer evento, semeia grupos + papéis padrão
create or replace function public.handle_new_event_seed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_event_guest_defaults(new.id, new.event_type);
  return new;
end;
$$;

drop trigger if exists trg_event_seed_guest_defaults on public.events;
create trigger trg_event_seed_guest_defaults
  after insert on public.events
  for each row execute procedure public.handle_new_event_seed();

-- ========== 4. BACKFILL PARA EVENTOS EXISTENTES ==========
-- Semeia grupos + papéis padrão para casamentos que já existiam antes desta migration.
do $$
declare
  r record;
begin
  for r in
    select e.id, e.event_type
    from public.events e
    where e.event_type = 'wedding'
      and not exists (
        select 1 from public.event_guest_groups g where g.event_id = e.id
      )
  loop
    perform public.seed_event_guest_defaults(r.id, r.event_type);
  end loop;
end;
$$;

-- ========== 5. ÍNDICES ==========
create index if not exists idx_guest_groups_sort_order on public.event_guest_groups (event_id, sort_order);
create index if not exists idx_guest_roles_event_created on public.guest_roles (event_id, created_at);