// Configuração centralizada do Supabase
// Todas as variáveis ficam no arquivo .env (prefixo VITE_ para exposição no frontend)
//
// IMPORTANTE PARA DEPLOY (Vercel/Netlify):
// O arquivo .env NÃO sobe para o GitHub (está no .gitignore).
// Configure as mesmas variáveis no painel do seu host de produção.
//
// Para o Vercel: Project → Settings → Environment Variables → adicione:
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_PUBLISHABLE_KEY
//   VITE_SUPABASE_JWKS_URL
// (NÃO adicione a secret key — ela nunca deve ir para o frontend)

// Variáveis PÚBLICAS (seguras para o frontend)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env
  .VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
export const SUPABASE_JWKS_URL = import.meta.env.VITE_SUPABASE_JWKS_URL as string | undefined

// Validação amigável: não quebra o build se faltar variável no ambiente de
// deploy, mas avisa claramente no console para que o desenvolvedor configure.
if (!SUPABASE_URL) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL não configurada. ' +
      'Configure as variáveis de ambiente no seu host (Vercel: Settings → Environment Variables).',
  )
}

if (!SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    '[Supabase] VITE_SUPABASE_PUBLISHABLE_KEY não configurada. ' +
      'O cliente não conseguirá autenticar nem consultar dados.',
  )
}

if (!SUPABASE_JWKS_URL) {
  console.warn(
    '[Supabase] VITE_SUPABASE_JWKS_URL não configurada. ' +
      'A verificação de tokens JWT pode não funcionar.',
  )
}