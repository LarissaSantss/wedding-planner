import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../config/supabase'

// Cliente público (frontend) - usa a publishable key (anônima)
// Seguro para o navegador. A RLS protege os dados por usuário.
// Fallback para string vazia evita quebrar o build quando as variáveis
// ainda não foram configuradas no host (o warning já é emitido no config).
export const supabase = createClient(SUPABASE_URL ?? '', SUPABASE_PUBLISHABLE_KEY ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export default supabase