// Configuração centralizada do Supabase
// Todas as variáveis ficam no arquivo .env (prefixo VITE_ para exposição no frontend)

// Variáveis PÚBLICAS (seguras para o frontend)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string
export const SUPABASE_JWKS_URL = import.meta.env.VITE_SUPABASE_JWKS_URL as string

// Variável SECRETA (⚠️ apenas para Edge Functions / backend)
// NÃO é exposta no bundle do frontend
export const SUPABASE_SECRET_KEY = import.meta.env.VITE_SUPABASE_SECRET_KEY as string

// Validação das variáveis de ambiente
if (!SUPABASE_URL) {
  throw new Error('VITE_SUPABASE_URL não está definido no arquivo .env')
}

if (!SUPABASE_PUBLISHABLE_KEY) {
  throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY não está definido no arquivo .env')
}

if (!SUPABASE_JWKS_URL) {
  throw new Error('VITE_SUPABASE_JWKS_URL não está definido no arquivo .env')
}