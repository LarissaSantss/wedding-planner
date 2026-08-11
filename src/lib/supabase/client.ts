import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../config/supabase'

/**
 * Indica se as variáveis de ambiente do Supabase foram configuradas.
 * Usado pela UI para exibir uma tela de configuração em vez de tela branca.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)

/**
 * Cria um cliente "dummy" que não lança exceção quando o Supabase não está
 * configurado. Qualquer chamada retorna um erro amigável em vez de quebrar
 * o app com tela branca.
 */
function createDummyClient(): SupabaseClient {
  const configError = new Error(
    'Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY ' +
      'no arquivo .env (local) ou nas Environment Variables do Vercel.',
  )

  const fail = () => ({ data: null, error: configError })

  // Cadeia de query (from().select().eq()...) — qualquer método retorna erro
  const chainable = () =>
    new Proxy(function () {}, {
      get: () => chainable,
      apply: () => fail(),
    })

  return new Proxy({} as SupabaseClient, {
    get: (_target, prop) => {
      if (prop === 'auth') {
        return {
          getSession: fail,
          getUser: fail,
          signUp: fail,
          signInWithPassword: fail,
          signInWithOAuth: fail,
          signInWithOtp: fail,
          signOut: fail,
          resetPasswordForEmail: fail,
          updateUser: fail,
          onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: () => {} } },
          }),
        }
      }
      if (prop === 'channel') {
        return () => ({
          on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        })
      }
      return chainable
    },
  })
}

// Cliente público (frontend) - usa a publishable key (anônima)
// Seguro para o navegador. A RLS protege os dados por usuário.
// Se as variáveis não estiverem configuradas, usa o cliente dummy para
// evitar tela branca e exibir mensagem de configuração na UI.
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(SUPABASE_URL as string, SUPABASE_PUBLISHABLE_KEY as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createDummyClient()

export default supabase