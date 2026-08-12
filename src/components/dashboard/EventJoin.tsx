/*
  DIRECTION CONTRACT - EVENT JOIN (surface: EventJoin, mode: Operate)
  THESIS: Entrada em um evento existente via codigo de acesso ou link de
  convite - um unico campo, validacao clara e feedback imediato.
*/
import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { ThemePreset } from '../../lib/supabase/types'
import { getThemeStyle } from '../../utils/theme'
import { joinEventByCode } from '../../lib/supabase/database'

interface EventJoinProps {
  theme: ThemePreset
  initialCode?: string
  onJoined: (eventId: string) => void
  onBack: () => void
}

/** Extrai o codigo de acesso de um link de convite ou devolve o proprio texto */
function extractCode(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    const fromQuery = url.searchParams.get('code')
    if (fromQuery) return fromQuery.trim().toUpperCase()
    const segments = url.pathname.split('/').filter(Boolean)
    return (segments[segments.length - 1] ?? '').toUpperCase()
  } catch {
    return trimmed.toUpperCase()
  }
}

export function EventJoin({ theme, initialCode = '', onJoined, onBack }: EventJoinProps) {
  const themeStyle = getThemeStyle(theme) as CSSProperties
  const [code, setCode] = useState(initialCode)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const accessCode = extractCode(code)
    if (!accessCode) {
      setError('Informe o código ou o link do evento.')
      return
    }

    setJoining(true)
    setError(null)

    const { data, error: joinError } = await joinEventByCode(accessCode)

    if (joinError || !data) {
      const notFound = joinError?.message?.includes('EVENT_NOT_FOUND')
      setError(
        notFound
          ? 'Nenhum evento encontrado com esse código. Verifique e tente novamente.'
          : 'Não foi possível entrar no evento. Tente novamente.',
      )
      setJoining(false)
      return
    }

    onJoined(data.id)
  }

  return (
    <div className="dashboard-shell" style={themeStyle}>
      <main className="dashboard-main">
        <div className="create-layout">
          <section className="settings-section create-card" aria-labelledby="join-title">
            <h1 id="join-title" className="settings-section-title" style={{ fontSize: '1.35rem' }}>
              Entrar com código do evento
            </h1>
            <p className="settings-section-desc">
              Cole o código de acesso ou o link de convite compartilhado pelo organizador do evento.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-field is-wide" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" htmlFor="join-code">
                  Código ou link do evento
                </label>
                <input
                  id="join-code"
                  className="form-control"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ex: A1B2C3D4 ou o link de convite"
                  autoComplete="off"
                  required
                />
              </div>

              {error && (
                <p className="auth-error" role="alert">
                  ⚠ {error}
                </p>
              )}

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={onBack}>
                  Voltar
                </button>
                <button type="submit" className="btn-primary" disabled={joining}>
                  {joining ? 'Entrando...' : 'Entrar no evento'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}
