-- ========== FOTOS DE CAPA DOS EVENTOS ==========
-- Cria o bucket público para fotos de capa/perfil dos eventos e as políticas
-- de acesso (usuários autenticados enviam; leitura é pública).

-- 1. Bucket público
insert into storage.buckets (id, name, public)
values ('wedding-photos', 'wedding-photos', true)
on conflict (id) do nothing;

-- 2. Políticas no storage.objects
drop policy if exists "Authenticated users can upload event covers" on storage.objects;
create policy "Authenticated users can upload event covers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'wedding-photos');

drop policy if exists "Public can view event covers" on storage.objects;
create policy "Public can view event covers"
  on storage.objects for select
  using (bucket_id = 'wedding-photos');

drop policy if exists "Authenticated users can update event covers" on storage.objects;
create policy "Authenticated users can update event covers"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'wedding-photos');

drop policy if exists "Authenticated users can delete event covers" on storage.objects;
create policy "Authenticated users can delete event covers"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'wedding-photos');