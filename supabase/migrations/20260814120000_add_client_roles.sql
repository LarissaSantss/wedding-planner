alter table public.events
  add column if not exists client_role_1 text,
  add column if not exists client_role_2 text;
