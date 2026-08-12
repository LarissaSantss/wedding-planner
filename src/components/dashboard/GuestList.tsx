import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Event, Guest } from '../../lib/supabase/types'
import { getThemeStyle } from '../../utils/theme'
import { fetchGuestsByEvent, createGuest, deleteGuest } from '../../lib/supabase/database'

interface GuestListProps {
  event: Event
  onBack: () => void
}

export function GuestList({ event, onBack }: GuestListProps) {
  const themeStyle = getThemeStyle(event.theme_preset) as CSSProperties
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data, error: fetchError } = await fetchGuestsByEvent(event.id, {
        orderBy: { column: 'created_at', ascending: false },
      })
      if (!mounted) return
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setGuests(data ?? [])
      }
      setLoading(false)
    }
    void load()
    return () => {
      mounted = false
    }
  }, [event.id])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    setError(null)
    const { data, error: createError } = await createGuest({
      event_id: event.id,
      name: name.trim(),
      email: email.trim() || null,
    })
    if (createError) {
      setError('Não foi possível adicionar o convidado. Tente novamente.')
    } else if (data) {
      setGuests((prev) => [data, ...prev])
      setName('')
      setEmail('')
    }
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    const { error: deleteError } = await deleteGuest(id)
    if (deleteError) {
      setError('Não foi possível remover o convidado.')
    } else {
      setGuests((prev) => prev.filter((g) => g.id !== id))
    }
  }

  return (
    <div className="dashboard-shell" style={themeStyle}>
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <span className="dashboard-brand-mark" aria-hidden="true">
            👥
          </span>
          <span className="dashboard-brand-name">Convidados · {event.title}</span>
        </div>
        <div className="dashboard-controls">
          <button type="button" className="btn-secondary" onClick={onBack}>
            Voltar ao painel
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="settings-section" aria-labelledby="guests-title">
          <h2 id="guests-title" className="settings-section-title">
            Convidados
          </h2>
          <p className="settings-section-desc">
            Gerencie a lista de convidados deste evento.
          </p>

          {error && (
            <p className="auth-error" role="alert" style={{ marginBottom: '1rem' }}>
              ⚠ {error}
            </p>
          )}

          <form onSubmit={handleAdd} className="guest-form-row">
            <div className="form-field" style={{ flex: '2 1 160px' }}>
              <label className="form-label" htmlFor="guest-name">
                Nome
              </label>
              <input
                id="guest-name"
                className="form-control"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Maria Silva"
                required
              />
            </div>
            <div className="form-field" style={{ flex: '1 1 160px' }}>
              <label className="form-label" htmlFor="guest-email">
                E-mail
              </label>
              <input
                id="guest-email"
                className="form-control"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button type="submit" className="btn-primary" disabled={adding}>
                {adding ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </form>

          {loading ? (
            <div className="state-panel" style={{ minHeight: '200px' }}>
              <div className="state-spinner" role="status" aria-label="Carregando convidados" />
            </div>
          ) : guests.length === 0 ? (
            <div className="guest-list-empty">
              Nenhum convidado adicionado ainda. Use o formulário acima para começar.
            </div>
          ) : (
            <ul className="guest-list">
              {guests.map((guest) => (
                <li key={guest.id} className="guest-item">
                  <div className="guest-item-info">
                    <span className="guest-item-name">{guest.name}</span>
                    {guest.email && <span className="guest-item-meta">{guest.email}</span>}
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void handleDelete(guest.id)}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}