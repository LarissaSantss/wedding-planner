// Configuração centralizada do Supabase
//
// ⚠️ IMPORTANTE — POR QUE NÃO PRECISA DE ENVIRONMENT VARIABLES NO VERCEL:
// SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY e SUPABASE_JWKS_URL são valores
// PÚBLICOS por design (a publishable key é anônima, feita para o frontend).
// Por isso os valores de fallback abaixo são seguros para este projeto.
//
// A SUPABASE_SECRET_KEY (sb_secret_...) NÃO está aqui — ela é secreta e
// só pode ser usada em backend / Edge Functions, nunca no navegador.

// Valores públicos do projeto (fallback embutido — funcionam no Vercel
// mesmo sem configurar Environment Variables)
const FALLBACK_URL = 'https://szrimbylarxaepwwafuq.supabase.co'
const FALLBACK_PUBLISHABLE_KEY = 'sb_publishable_TR6DSzMPPjJyhHmg4BzmTw_v-x7NOn7'
const FALLBACK_JWKS_URL = 'https://szrimbylarxaepwwafuq.supabase.co/auth/v1/.well-known/jwks.json'

// Prioriza variáveis de ambiente (VITE_*) se existirem, senão usa o fallback público.
// Isso permite sobrescrever localmente via .env sem bloquear o deploy no Vercel.
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL

export const SUPABASE_PUBLISHABLE_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_PUBLISHABLE_KEY

export const SUPABASE_JWKS_URL: string =
  import.meta.env.VITE_SUPABASE_JWKS_URL || FALLBACK_JWKS_URL