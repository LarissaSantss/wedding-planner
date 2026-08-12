/* 
  ============================================================================
  DIRECTION CONTRACT — AUTH SCREEN (surface: AuthScreen, mode: Operate)
  ----------------------------------------------------------------------------
  THESIS: Porta de entrada do Wedding & Events Planner — login e cadastro em
  um único painel elegante com o tema Rose Gold padrão. Rejeita o padrão de
  "hero de marketing" para uma tela de tarefa: aqui o usuário quer entrar.
  OWN-WORLD: Tokens `--theme-*` (rose-gold por padrão). Formulário limpo,
  feedback de erro claro, estados de loading. Modo Operate: affordances
  nativas de formulário, scanabilidade.
  STORY: O organizador entra com email/senha (ou cria conta) e chega ao
  dashboard do evento. Erros nomeiam o problema e a recuperação.
  FIRST VIEWPORT: Marca central, alternância Login/Cadastro, campos de
  email e senha, botão primário, mensagem de erro quando aplicável.
  FORM: Nova superfície dentro do mundo estabelecido; seleção direta.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the
  finish review, the verdict, and DESIGN.md.
  ============================================================================
*/
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { signIn, signUp, resendConfirmationEmail } from '../../lib/supabase/auth'
import { getThemeStyle } from '../../utils/theme'

type Mode = 'login' | 'signup'

const THEME_STYLE = getThemeStyle('rose-gold') as CSSProperties

/**
 * Tela de autenticação (login e cadastro).
 *
 * - Login com email/senha via Supabase Auth
 * - Cadastro de novo usuário
 * - Feedback de erro claro e estados de loading
 *
 * Uso:
 *   <AuthScreen />
 */
export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setSuccess(null)
  }

  const handleResend = async () => {
    if (!email.trim()) return
    setResending(true)
    const { error: resendError } = await resendConfirmationEmail(email.trim())
    if (resendError) {
      setError('Não foi possível reenviar o e-mail. Verifique se o email está correto e tente novamente.')
    } else {
      setError(null)
      setSuccess('E-mail de confirmação reenviado. Verifique sua caixa de entrada (e o spam).')
    }
    setResending(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (!email.trim() || !password) {
      setError('Preencha email e senha para continuar.')
      setLoading(false)
      return
    }

    if (mode === 'login') {
      const { error: signInError } = await signIn(email.trim(), password)
      if (signInError) {
        const isNotConfirmed =
          signInError instanceof Error &&
          'code' in signInError &&
          (signInError as Error & { code?: string }).code === 'email_not_confirmed'
        setError(
          isNotConfirmed
            ? 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (e o spam) e clique no link de confirmação, ou reenvie o e-mail abaixo.'
            : 'Email ou senha incorretos. Verifique e tente novamente.',
        )
      }
    } else {
      const { error: signUpError } = await signUp(email.trim(), password)
      if (signUpError) {
        setError('Não foi possível criar a conta. Verifique o email e tente novamente.')
      } else {
        setSuccess('Conta criada! Enviamos um link de confirmação para seu e-mail. Clique no link antes de entrar. Se não encontrar, verifique a caixa de spam.')
      }
    }

    setLoading(false)
  }

  return (
    <div className="dashboard-shell" style={THEME_STYLE}>
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-brand">
            <span className="auth-brand-mark" aria-hidden="true">
              💍
            </span>
            <h1 className="auth-title">Wedding & Events Planner</h1>
            <p className="auth-subtitle">Planeje sua celebração com elegância</p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Autenticação">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-tab${mode === 'login' ? ' is-active' : ''}`}
              onClick={() => switchMode('login')}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`auth-tab${mode === 'signup' ? ' is-active' : ''}`}
              onClick={() => switchMode('signup')}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-field">
              <label className="form-label" htmlFor="auth-email">
                Email
              </label>
              <input
                id="auth-email"
                className="form-control"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
                required
              />
            </div>

            <div className="form-field" style={{ marginTop: '1rem' }}>
              <label className="form-label" htmlFor="auth-password">
                Senha
              </label>
              <input
                id="auth-password"
                className="form-control"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="auth-error" role="alert">
                ⚠ {error}
              </p>
            )}

            {success && (
              <p className="auth-success" role="status">
                ✓ {success}
              </p>
            )}

            {(error === 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (e o spam) e clique no link de confirmação, ou reenvie o e-mail abaixo.' ||
              success === 'Conta criada! Enviamos um link de confirmação para seu e-mail. Clique no link antes de entrar. Se não encontrar, verifique a caixa de spam.' ||
              (mode === 'signup' && success)) && (
              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%', marginTop: '0.75rem' }}
                onClick={() => void handleResend()}
                disabled={resending}
              >
                {resending ? 'Enviando...' : 'Reenviar e-mail de confirmação'}
              </button>
            )}

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading
                ? 'Aguarde...'
                : mode === 'login'
                  ? 'Entrar'
                  : 'Criar conta'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}