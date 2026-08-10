-- ========== SEED DATA - WEDDING PLANNER ==========
-- Dados iniciais para desenvolvimento local
-- Execute com: supabase db reset

-- Inserir perfil de exemplo (após criar usuário no auth)
-- INSERT INTO public.profiles (id, email, full_name, role)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'admin@example.com', 'Admin', 'admin');

-- Buckets de storage padrão
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('wedding-photos', 'wedding-photos', true),
  ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;