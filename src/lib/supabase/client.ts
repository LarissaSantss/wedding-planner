import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../config/supabase'

// Cliente público (frontend) - usa a publishable key (anônima)
// Seguro para o navegador. A RLS protege os dados por usuário.
// As credenciais são valores PÚBLICOS por design (ver src/config/supabase.ts),
// portanto funcionam no Vercel sem configurar Environment Variables.
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export default supabase