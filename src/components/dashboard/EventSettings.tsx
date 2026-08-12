{/* 
  ============================================================================
  DIRECTION CONTRACT — EVENT SETTINGS (surface: EventSettings, mode: Operate)
  ----------------------------------------------------------------------------
  THESIS: Configuração do evento como painel de controle claro e escaneável —
  formulário de dados à esquerda, seletor de tema à direita; rejeita o padrão
  de "modal para uma tarefa simples" e o scaffolding de cards iguais.
  OWN-WORLD: Sistema de tokens `--theme-*` gerados por src/utils/theme.ts.
  Cada preset (rose-gold, emerald, royal-blue, mystic-violet, amber-gold,
  luxury-dark) dita primária, acento, superfície e texto. Modo Operate:
  scanabilidade, consistência, affordances nativas de formulário.
  STORY: O organizador ajusta os dados do evento e escolhe a identidade visual
  em tempo real; o tema muda instantaneamente na aplicação inteira.
  FIRST VIEWPORT: Topbar com marca + seletor de eventos; abaixo, grade de 2
  colunas — formulário de dados (título, tipo, nomes, data, local, orçamento,
  convidados, status) e seção de tema com 6 presets swatch.
  FORM: Novas superfícies dentro do mundo estabelecido (tokens de tema);
  seleção direta, sem tournament.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the
  finish review, the verdict, and DESIGN.md.
  ============================================================================
*/}
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type {
  Event,
  EventType,
  EventStatus,
  ThemePreset,
} from '../../lib/supabase/types'
import {
  THEME_PRESETS,
  THEME_PRESET_LIST,
  getThemeStyle,
} from '../../utils/theme'
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  EVENT_STATUS_LABELS,
} from '../../utils/eventFormat'
import { MemberPermissionsPanel } from './MemberPermissionsPanel'
import { useAuth } from '../../hooks/useAuth'

interface EventSettingsProps {
  event: Event
  onSave: (id: string, values: Partial<Event>) => Promise<{ error: Error | null }>
  onBack: () => void
}

interface FormState {
  title: string
  event_type: EventType
  status: EventStatus
  client_name_1: string
  client_name_2: string
  date: string
  location: string
  budget: string
  guest_count: string
  description: string
}

const EVENT_TYPE_OPTIONS = Object.keys(EVENT_TYPE_LABELS) as EventType[]
const EVENT_STATUS_OPTIONS = Object.keys(EVENT_STATUS_LABELS) as EventStatus[]

/**
 * Painel de configurações do evento.
 *
 * - Edita os dados do evento (título, tipo, nomes, data, local, orçamento, convidados, status)
 * - Altera o tema visual dinamicamente via `src/utils/theme.ts`
 * - Salva via `onSave` (conectado ao Supabase pelo componente pai)
 *
 * Uso:
 *   <EventSettings event={event} onSave={saveEvent} onBack={() => setView('dashboard')} />
 */
export function EventSettings({ event, onSave, onBack }: EventSettingsProps) {
  const { user } = useAuth()
  const isOwner = user?.id === event.user_id

  const [form, setForm] = useState<FormState>(() => ({
    title: event.title,
    event_type: event.event_type,
    status: event.status,
    client_name_1: event.client_name_1 ?? '',
    client_name_2: event.client_name_2 ?? '',
    date: event.date ?? '',
    location: event.location ?? '',
    budget: event.budget !== null && event.budget !== undefined ? String(event.budget) : '',
    guest_count:
      event.guest_count !== null && event.guest_count !== undefined
        ? String(event.guest_count)
        : '',
    description: event.description ?? '',
  }))
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset>(event.theme_preset)
  const [customPrimary, setCustomPrimary] = useState(event.custom_primary ?? '#B76E79')
  const [customSecondary, setCustomSecondary] = useState(event.custom_secondary ?? '#E8C4C4')
  const [customAccent, setCustomAccent] = useState(event.custom_accent ?? '#D4AF37')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)

  const copyText = async (text: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }

  const handleCopyCode = () => {
    void copyText(event.code, 'code')
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?code=${event.code}`
    void copyText(link, 'link')
  }

  // Aplica o tema selecionado em tempo real (pré-visualização)
  const themeStyle = useMemo<CSSProperties>(
    () =>
      getThemeStyle(
        selectedTheme,
        selectedTheme === 'custom'
          ? {
              primary: customPrimary,
              secondary: customSecondary,
              accent: customAccent,
            }
          : undefined,
      ),
    [selectedTheme, customPrimary, customSecondary, customAccent],
  )

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    const values: Partial<Event> = {
      title: form.title.trim(),
      event_type: form.event_type,
      status: form.status,
      client_name_1: form.client_name_1.trim() || null,
      client_name_2: form.client_name_2.trim() || null,
      date: form.date || null,
      location: form.location.trim() || null,
      budget: form.budget ? Number(form.budget) : null,
      guest_count: form.guest_count ? Number(form.guest_count) : null,
      description: form.description.trim() || null,
      theme_preset: selectedTheme,
      custom_primary: selectedTheme === 'custom' ? customPrimary : null,
      custom_secondary: selectedTheme === 'custom' ? customSecondary : null,
      custom_accent: selectedTheme === 'custom' ? customAccent : null,
    }

    const { error } = await onSave(event.id, values)

    if (error) {
      setFeedback({ type: 'error', message: 'Não foi possível salvar. Tente novamente.' })
    } else {
      setFeedback({ type: 'success', message: 'Alterações salvas com sucesso.' })
    }

    setSaving(false)
  }

  return (
    <div className="dashboard-shell" style={themeStyle}>
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <span className="dashboard-brand-mark" aria-hidden="true">
            {EVENT_TYPE_ICONS[event.event_type]}
          </span>
          <span className="dashboard-brand-name">Configurações do Evento</span>
        </div>
        <div className="dashboard-controls">
          <button type="button" className="btn-secondary" onClick={onBack}>
            Voltar ao painel
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="settings-layout">
          {/* Coluna 1: Dados do evento */}
          <section className="settings-section" aria-labelledby="settings-data-title">
            <h2 id="settings-data-title" className="settings-section-title">
              Dados do evento
            </h2>
            <p className="settings-section-desc">
              Informações gerais que aparecem no painel e na contagem regressiva.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-grid">
                <div className="form-field is-wide">
                  <label className="form-label" htmlFor="event-title">
                    Título do evento
                  </label>
                  <input
                    id="event-title"
                    className="form-control"
                    type="text"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="Ex: Casamento de Ana & Bruno"
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="event-type">
                    Tipo de evento
                  </label>
                  <select
                    id="event-type"
                    className="form-control"
                    value={form.event_type}
                    onChange={(e) => updateField('event_type', e.target.value as EventType)}
                  >
                    {EVENT_TYPE_OPTIONS.map((type) => (
                      <option key={type} value={type}>
                        {EVENT_TYPE_ICONS[type]} {EVENT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="event-status">
                    Status
                  </label>
                  <select
                    id="event-status"
                    className="form-control"
                    value={form.status}
                    onChange={(e) => updateField('status', e.target.value as EventStatus)}
                  >
                    {EVENT_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {EVENT_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="client-1">
                    Nome principal
                  </label>
                  <input
                    id="client-1"
                    className="form-control"
                    type="text"
                    value={form.client_name_1}
                    onChange={(e) => updateField('client_name_1', e.target.value)}
                    placeholder="Ex: Ana"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="client-2">
                    Nome secundário
                  </label>
                  <input
                    id="client-2"
                    className="form-control"
                    type="text"
                    value={form.client_name_2}
                    onChange={(e) => updateField('client_name_2', e.target.value)}
                    placeholder="Ex: Bruno (opcional)"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="event-date">
                    Data do evento
                  </label>
                  <input
                    id="event-date"
                    className="form-control"
                    type="date"
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="event-location">
                    Local
                  </label>
                  <input
                    id="event-location"
                    className="form-control"
                    type="text"
                    value={form.location}
                    onChange={(e) => updateField('location', e.target.value)}
                    placeholder="Ex: Salão Villa Real, São Paulo"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="event-budget">
                    Orçamento (R$)
                  </label>
                  <input
                    id="event-budget"
                    className="form-control"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.budget}
                    onChange={(e) => updateField('budget', e.target.value)}
                    placeholder="Ex: 50000"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="event-guests">
                    Nº de convidados
                  </label>
                  <input
                    id="event-guests"
                    className="form-control"
                    type="number"
                    min="0"
                    step="1"
                    value={form.guest_count}
                    onChange={(e) => updateField('guest_count', e.target.value)}
                    placeholder="Ex: 150"
                  />
                </div>

                <div className="form-field is-wide">
                  <label className="form-label" htmlFor="event-desc">
                    Descrição
                  </label>
                  <textarea
                    id="event-desc"
                    className="form-control"
                    rows={3}
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Detalhes do evento, tema da decoração, observações..."
                  />
                </div>

                <div className="form-actions">
                  {feedback && (
                    <span
                      className={`save-feedback${feedback.type === 'error' ? ' is-error' : ''}`}
                      role="status"
                    >
                      {feedback.type === 'success' ? '✓' : '⚠'} {feedback.message}
                    </span>
                  )}
                  <button type="button" className="btn-secondary" onClick={onBack}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* Coluna 2: Tema visual */}
          <section className="settings-section" aria-labelledby="settings-theme-title">
            <h2 id="settings-theme-title" className="settings-section-title">
              Tema visual
            </h2>
            <p className="settings-section-desc">
              Escolha a identidade visual do evento. A mudança é aplicada em tempo real.
            </p>

            <div className="theme-grid" role="radiogroup" aria-label="Tema visual do evento">
              {THEME_PRESET_LIST.map((preset) => {
                const palette = THEME_PRESETS[preset]
                const isSelected = preset === selectedTheme
                return (
                  <button
                    key={preset}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`theme-option${isSelected ? ' is-selected' : ''}`}
                    onClick={() => setSelectedTheme(preset)}
                  >
                    <span
                      className="theme-swatch"
                      style={{ background: palette.gradient }}
                      aria-hidden="true"
                    />
                    <span className="theme-option-label">{palette.label}</span>
                    <span className="theme-option-desc">{palette.primary}</span>
                  </button>
                )
              })}

              <button
                type="button"
                role="radio"
                aria-checked={selectedTheme === 'custom'}
                className={`theme-option${selectedTheme === 'custom' ? ' is-selected' : ''}`}
                onClick={() => setSelectedTheme('custom')}
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

            {selectedTheme === 'custom' && (
              <>
              <p className="color-picker-hint" style={{ marginTop: '0.75rem' }}>
                Clique no quadrado colorido para abrir o seletor de cores.
              </p>
              <div className="color-picker-grid">
                <div className="form-field">
                  <label className="form-label" htmlFor="settings-custom-primary">
                    Cor primária
                  </label>
                  <div className="color-picker-row">
                    <input
                      id="settings-custom-primary"
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
                  <label className="form-label" htmlFor="settings-custom-secondary">
                    Cor secundária
                  </label>
                  <div className="color-picker-row">
                    <input
                      id="settings-custom-secondary"
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
                  <label className="form-label" htmlFor="settings-custom-accent">
                    Cor de destaque
                  </label>
                  <div className="color-picker-row">
                    <input
                      id="settings-custom-accent"
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
          </section>

          {/* Permissões dos membros (somente owner) */}
          {isOwner && <MemberPermissionsPanel event={event} />}

          {/* Compartilhamento: código de acesso e link de convite */}
          <section className="settings-section share-section" aria-labelledby="settings-share-title">
            <h2 id="settings-share-title" className="settings-section-title">
              Compartilhar evento
            </h2>
            <p className="settings-section-desc">
              Envie o código ou o link de convite para outras pessoas acessarem este evento.
            </p>

            <div className="share-code-row">
              <span className="share-code-value" aria-label="Código de acesso do evento">
                {event.code}
              </span>
              <button type="button" className="btn-secondary" onClick={handleCopyCode}>
                {copied === 'code' ? '✓ Copiado!' : 'Copiar código'}
              </button>
              <button type="button" className="btn-primary" onClick={handleCopyLink}>
                {copied === 'link' ? '✓ Link copiado!' : 'Copiar link de convite'}
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
