import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { EventType, ThemePreset } from '../../lib/supabase/types'
import { THEME_PRESETS, THEME_PRESET_LIST, getThemeStyle } from '../../utils/theme'
import { EVENT_TYPE_LABELS, EVENT_TYPE_ICONS } from '../../utils/eventFormat'
import { createEvent } from '../../lib/supabase/database'

interface EventCreateProps {
  theme: ThemePreset
  onCreated: (title: string) => void
}

const EVENT_TYPE_OPTIONS = Object.keys(EVENT_TYPE_LABELS) as EventType[]

export function EventCreate({ theme, onCreated }: EventCreateProps) {
  const themeStyle = getThemeStyle(theme) as CSSProperties
  const [eventType, setEventType] = useState<EventType>('wedding')
  const [title, setTitle] = useState('')
  const [clientName1, setClientName1] = useState('')
  const [clientName2, setClientName2] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [themePreset, setThemePreset] = useState<ThemePreset>(theme)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Dê um título ao seu evento.')
      return
    }
    setCreating(true)
    setError(null)

    const values = {
      title: title.trim(),
      event_type: eventType,
      theme_preset: themePreset,
      client_name_1: clientName1.trim() || null,
      client_name_2: clientName2.trim() || null,
      date: date || null,
      location: location.trim() || null,
      status: 'draft' as const,
    }

    const { error: createError } = await createEvent(values)
    if (createError) {
      setError('Não foi possível criar o evento. Tente novamente.')
      setCreating(false)
      return
    }
    onCreated(title.trim())
  }

  return (
    <div className="dashboard-shell" style={themeStyle}>
      <main className="dashboard-main">
        <div className="create-layout">
          <section className="settings-section create-card" aria-labelledby="create-title">
            <h1 id="create-title" className="settings-section-title" style={{ fontSize: '1.35rem' }}>
              Criar novo evento
            </h1>
            <p className="settings-section-desc">
              Escolha o tipo de celebração e preencha as informações básicas.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-field" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" htmlFor="create-type">
                  Tipo de evento
                </label>
                <div className="create-type-grid" role="radiogroup" aria-label="Tipo de evento">
                  {EVENT_TYPE_OPTIONS.map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={eventType === type}
                      className={`create-type-option${eventType === type ? ' is-selected' : ''}`}
                      onClick={() => setEventType(type)}
                    >
                      <span className="create-type-icon" aria-hidden="true">
                        {EVENT_TYPE_ICONS[type]}
                      </span>
                      <span className="create-type-label">{EVENT_TYPE_LABELS[type]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field is-wide">
                  <label className="form-label" htmlFor="create-title-input">
                    Título do evento
                  </label>
                  <input
                    id="create-title-input"
                    className="form-control"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Casamento de Ana & Bruno"
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="create-client-1">
                    Nome principal
                  </label>
                  <input
                    id="create-client-1"
                    className="form-control"
                    type="text"
                    value={clientName1}
                    onChange={(e) => setClientName1(e.target.value)}
                    placeholder="Ex: Ana"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="create-client-2">
                    Nome secundário
                  </label>
                  <input
                    id="create-client-2"
                    className="form-control"
                    type="text"
                    value={clientName2}
                    onChange={(e) => setClientName2(e.target.value)}
                    placeholder="Ex: Bruno (opcional)"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="create-date">
                    Data do evento
                  </label>
                  <input
                    id="create-date"
                    className="form-control"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="create-location">
                    Local
                  </label>
                  <input
                    id="create-location"
                    className="form-control"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Salão Villa Real, São Paulo"
                  />
                </div>

                <div className="form-field is-wide">
                  <label className="form-label" htmlFor="create-theme">
                    Tema visual
                  </label>
                  <div className="theme-grid" role="radiogroup" aria-label="Tema visual">
                    {THEME_PRESET_LIST.map((preset) => {
                      const palette = THEME_PRESETS[preset]
                      const isSelected = preset === themePreset
                      return (
                        <button
                          key={preset}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={`theme-option${isSelected ? ' is-selected' : ''}`}
                          onClick={() => setThemePreset(preset)}
                        >
                          <span className="theme-swatch" style={{ background: palette.gradient }} aria-hidden="true" />
                          <span className="theme-option-label">{palette.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {error && (
                  <p className="auth-error" role="alert">
                    ⚠ {error}
                  </p>
                )}

                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={creating}>
                    {creating ? 'Criando...' : 'Criar evento'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}