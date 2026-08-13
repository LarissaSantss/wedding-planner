-- ========== CONVIDADO DE (QUEM CONVIDOU) ==========
-- Campo genérico multi-evento: client_1 (ex: Noiva), client_2 (ex: Noivo)
-- ou both. Distinto de relationship_to_event (relação/parentesco).
alter table public.guests
  add column if not exists invited_by text;