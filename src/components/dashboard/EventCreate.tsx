import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { EventType, ThemePreset } from '../../lib/supabase/types'
import { THEME_PRESETS, THEME_PRESET_LIST, getThemeStyle } from '../../utils/theme'
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  EVENT_NAME_CONFIG,
} from '../../utils/eventFormat'
import type { RoleOption } from '../../utils/eventFormat'
import { createEvent } from '../../lib/supabase/database'
import { getProfile } from '../../lib/supabase/auth'
import { useAuth } from '../../hooks/useAuth'

interface EventCreateProps {
  theme: ThemePreset
  onCreated: (title: string) => void
  onCancel?: () => void
}

const EVENT_TYPE_OPTIONS = Object.keys(EVENT_TYPE_LABELS) as EventType[]

export function EventCreate({ theme, onCreated, onCancel }: EventCreateProps) {
  const { user } = useAuth()

  const [profileName, setProfileName] = useState('')
  const [eventType, setEventType] = useState<EventType>('wedding')
  const [role, setRole] = useState<RoleOption>('none')
  const [name1, setName1] = useState('')
  const [name2, setName2] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [themePreset, setThemePreset] = useState<ThemePreset>(theme)
  const [customPrimary, setCustomPrimary] = useState('#B76E79')
  const [customSecondary, setCustomSecondary] = useState('#E8C4C4')
  const [customAccent, setCustomAccent] = useState('#D4AF37')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const config = EVENT_NAME_CONFIG[eventType]

  // Busca o nome do perfil (para preencher o campo do papel escolhido).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    void getProfile(user.id).then((profile) => {
      if (cancelled) return
      const name =
        profile?.full_name ||
        (typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : '') ||
        ''
      setProfileName(name)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  // Auto-preenche o nome do usuário no campo correspondente ao papel.
  useEffect(() => {
    if (!profileName) return
    const target =
      role === 'self'
        ? config.selfField
        : role === 'other'
          ? config.otherField
          : config.noneField
    if (!target) return
    if (target === 'name1' && !name1) setName1(profileName)
    if (target === 'name2' && !name2) setName2(profileName)
  }, [profileName, role, config.selfField, config.otherField, config.noneField, name1, name2])

  // Prévia ao vivo do tema (inclui tema personalizado).
  const themeStyle = useMemo<CSSProperties>(
    () =>
      getThemeStyle(
        themePreset,
        themePreset === 'custom'
          ? {
              primary: customPrimary,
              secondary: customSecondary,
              accent: customAccent,
            }
          : undefined,
      ),
    [themePreset, customPrimary, customSecondary, customAccent],
  )

  const handleTypeChange = (type: EventType) => {
    setEventType(type)
    setRole('none')
    setName1('')
    setName2('')
  }

  // Reseta o formulário inteiro (inclusive tipo, papel, tema e cores).
  const resetForm = () => {
    setEventType('wedding')
    setRole('none')
    setName1('')
    setName2('')
    setTitle('')
    setDate('')
    setLocation('')
    setThemePreset('rose-gold')
    setCustomPrimary('#B76E79')
    setCustomSecondary('#E8C4C4')
    setCustomAccent('#D4AF37')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Dê um título ao seu evento.')
      return
    }
    setCreating(true)
    setError(null)

    // Lê os valores atuais dos inputs no momento do envio, evitando
    // qualquer dado "fantasma" de um evento anterior.
    const values = {
      title: title.trim(),
      event_type: eventType,
      theme_preset: themePreset,
      ...(themePreset === 'custom'
        ? {
            custom_primary: customPrimary,
            custom_secondary: customSecondary,
            custom_accent: customAccent,
          }
        : {}),
      client_name_1: name1.trim() || null,
      client_name_2: name2.trim() || null,
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
    resetForm()
    setCreating(false)
    onCreated(title.trim())
  }

  return (
    <div className="dashboard-shell" style={themeStyle}>
      <main className="create-main">
        <div className="create-card">
          <div className="auth-brand">
            <span className="auth-brand-mark" aria-hidden="true">
              {EVENT_TYPE_ICONS[eventType]}
            </span>
            <h1 className="auth-title">Criar novo evento</h1>
            <p className="auth-subtitle">
              Conte quem serão os homenageados e escolha as cores da celebração
            </p>
          </div>

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
                    onClick={() => handleTypeChange(type)}
                  >
                    <span className="create-type-icon" aria-hidden="true">
                      {EVENT_TYPE_ICONS[type]}
                    </span>
                    <span className="create-type-label">{EVENT_TYPE_LABELS[type]}</span>
                  </button>
                ))}
              </div>
            </div>

            {config.roleQuestion && config.roleOptions && (
              <div className="form-field" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">{config.roleQuestion}</label>
                <div
                  className="role-grid"
                  role="radiogroup"
                  aria-label={config.roleQuestion}
                >
                  {config.roleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={role === opt.value}
                      className={`role-option${role === opt.value ? ' is-selected' : ''}`}
                      onClick={() => setRole(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

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

              {config.fields.map((field) => (
                <div className="form-field" key={field.key}>
                  <label className="form-label" htmlFor={`create-${field.key}`}>
                    {field.label}
                  </label>
                  <input
                    id={`create-${field.key}`}
                    className="form-control"
                    type="text"
                    value={field.key === 'name1' ? name1 : name2}
                    onChange={(e) =>
                      field.key === 'name1'
                        ? setName1(e.target.value)
                        : setName2(e.target.value)
                    }
                    placeholder={field.placeholder}
                  />
                </div>
              ))}

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
                        <span
                          className="theme-swatch"
                          style={{ background: palette.gradient }}
                          aria-hidden="true"
                        />
                        <span className="theme-option-label">{palette.label}</span>
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    role="radio"
                    aria-checked={themePreset === 'custom'}
                    className={`theme-option${themePreset === 'custom' ? ' is-selected' : ''}`}
                    onClick={() => setThemePreset('custom')}
                  >
                    <span
                      className="theme-swatch"
                      style={{
                        background: `linear-gradient(135deg, ${customPrimary} 0%, ${customSecondary} 55%, ${customAccent} 100%)`,
                      }}
                      aria-hidden="true"
                    />
                    <span className="theme-option-label">Personalizado</span>
                  </button>
                </div>

                {themePreset === 'custom' && (
                  <>
                  <p className="color-picker-hint" style={{ marginTop: '0.75rem' }}>
                    Clique no quadrado colorido para abrir o seletor de cores.
                  </p>
                  <div className="color-picker-grid">
                    <div className="form-field">
                      <label className="form-label" htmlFor="custom-primary">
                        Cor primária
                      </label>
                      <div className="color-picker-row">
                        <input
                          id="custom-primary"
                          className="color-input"
                          type="color"
                          value={customPrimary}
                          onChange={(e) => setCustomPrimary(e.target.value)}
                        />
                        <input
                          className="form-control"
                          type="text"
                          value={customPrimary}
                          onChange={(e) => setCustomPrimary(e.target.value)}
                          maxLength={7}
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <label className="form-label" htmlFor="custom-secondary">
                        Cor secundária
                      </label>
                      <div className="color-picker-row">
                        <input
                          id="custom-secondary"
                          className="color-input"
                          type="color"
                          value={customSecondary}
                          onChange={(e) => setCustomSecondary(e.target.value)}
                        />
                        <input
                          className="form-control"
                          type="text"
                          value={customSecondary}
                          onChange={(e) => setCustomSecondary(e.target.value)}
                          maxLength={7}
                        />
                      </div>
                    </div>

                    <div className="form-field">
                      <label className="form-label" htmlFor="custom-accent">
                        Cor de destaque
                      </label>
                      <div className="color-picker-row">
                        <input
                          id="custom-accent"
                          className="color-input"
                          type="color"
                          value={customAccent}
                          onChange={(e) => setCustomAccent(e.target.value)}
                        />
                        <input
                          className="form-control"
                          type="text"
                          value={customAccent}
                          onChange={(e) => setCustomAccent(e.target.value)}
                          maxLength={7}
                        />
                      </div>
                    </div>
                  </div>
                  </>
                )}
              </div>

              {error && (
                <p className="auth-error" role="alert">
                  ⚠ {error}
                </p>
              )}

              <div className="form-actions">
                {onCancel && (
                  <button type="button" className="btn-secondary" onClick={onCancel}>
                    Voltar
                  </button>
                )}
                <button type="submit" className="btn-primary" disabled={creating}>
                  {creating ? 'Criando...' : 'Criar evento'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}