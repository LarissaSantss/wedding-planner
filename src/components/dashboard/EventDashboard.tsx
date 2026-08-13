import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Event, EventUpdate } from '../../lib/supabase/types'
import { getThemeStyle } from '../../utils/theme'
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  EVENT_STATUS_LABELS,
  formatCurrency,
  formatNumber,
  formatDate,
  buildDateDiff,
  getCoupleLabel,
} from '../../utils/eventFormat'
import { uploadEventCover } from '../../lib/supabase/storage'
import {
  fetchGuestsByEvent,
  fetchExpensesByEvent,
} from '../../lib/supabase/database'
import { GuestList } from './GuestList'

interface EventDashboardProps {
  event: Event
  events: Event[]
  activeSection?: 'dashboard' | 'guests'
  onSelectEvent: (id: string) => void
  onOpenSettings: () => void
  onOpenGuests: () => void
  onOpenTasks: () => void
  onSaveEvent: (values: EventUpdate) => Promise<void>
}

const MODULES = [
  { id: 'guests', icon: '👥', title: 'Convidados', caption: 'RSVP, mesas e grupos' },
  { id: 'vendors', icon: '🤝', title: 'Fornecedores', caption: 'Contratos e contatos' },
  { id: 'tasks', icon: '✅', title: 'Tarefas', caption: 'Checklist do evento' },
  { id: 'expenses', icon: '💰', title: 'Orçamento', caption: 'Despesas e custos' },
  { id: 'gifts', icon: '🎁', title: 'Presentes', caption: 'Lista de registro' },
]

const SIDEBAR_NAV = [
  { id: 'dashboard', icon: '🏠', label: 'Painel' },
  { id: 'guests', icon: '👥', label: 'Convidados' },
  { id: 'vendors', icon: '🤝', label: 'Fornecedores' },
  { id: 'tasks', icon: '✅', label: 'Tarefas' },
  { id: 'expenses', icon: '💰', label: 'Orçamento' },
  { id: 'gifts', icon: '🎁', label: 'Presentes' },
  { id: 'settings', icon: '⚙️', label: 'Configurações' },
] as const

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * Dashboard principal com menu lateral retrátil, foto de capa do casal,
 * contador em anos/meses/dias e cards de visão geral com dados reais.
 */
export function EventDashboard({
  event,
  events,
  activeSection = 'dashboard',
  onSelectEvent,
  onOpenSettings,
  onOpenGuests,
  onOpenTasks,
  onSaveEvent,
}: EventDashboardProps) {
  const themeStyle = useMemo<CSSProperties>(
    () =>
      getThemeStyle(
        event.theme_preset,
        event.theme_preset === 'custom'
          ? {
              primary: event.custom_primary,
              secondary: event.custom_secondary,
              accent: event.custom_accent,
            }
          : undefined,
      ),
    [event.theme_preset, event.custom_primary, event.custom_secondary, event.custom_accent],
  )

  const dateDiff = useMemo(() => buildDateDiff(event.date), [event.date])
  const coupleText = getCoupleLabel(event)
  const hasDate = Boolean(event.date)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const [guestCount, setGuestCount] = useState(0)
  const [confirmedCount, setConfirmedCount] = useState(0)
  const [spent, setSpent] = useState(0)

  useEffect(() => {
    let mounted = true
    void (async () => {
      const [guestsRes, expensesRes] = await Promise.all([
        fetchGuestsByEvent(event.id),
        fetchExpensesByEvent(event.id),
      ])
      if (!mounted) return

      const guests = guestsRes.data ?? []
      setGuestCount(guests.length)
      setConfirmedCount(guests.filter((g) => g.rsvp_status === 'confirmed').length)

      const expenses = expensesRes.data ?? []
      const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
      setSpent(total)
    })()
    return () => {
      mounted = false
    }
  }, [event.id])

  const handlePickPhoto = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploading(true)
    setUploadError(null)
    const { url, error } = await uploadEventCover(event.id, file)
    if (error) {
      setUploadError('Não foi possível enviar a foto. Tente novamente.')
    } else if (url) {
      await onSaveEvent({ cover_image_url: url })
    }
    setUploading(false)
  }

  const handleNav = (id: (typeof SIDEBAR_NAV)[number]['id']) => {
    if (id === 'guests') void onOpenGuests()
    else if (id === 'tasks') void onOpenTasks()
    else if (id === 'settings') void onOpenSettings()
  }

  const budget = event.budget ?? 0
  const budgetPercent = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : null

  return (
    <div className="dashboard-shell" style={themeStyle}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => void handleFileChange(e)}
        aria-hidden="true"
      />

      <div className={`app-layout${collapsed ? ' is-collapsed' : ''}`}>
        {/* ===================== SIDEBAR ===================== */}
        <aside className={`event-sidebar${collapsed ? ' is-collapsed' : ''}`} aria-label="Menu do evento">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expandir menu' : 'Minimizar menu'}
            title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
          >
            <span aria-hidden="true">{collapsed ? '»' : '«'}</span>
          </button>

          <div className="sidebar-profile">
            <button
              type="button"
              className="sidebar-avatar-wrap"
              onClick={handlePickPhoto}
              disabled={uploading}
              aria-label="Alterar foto de perfil do evento"
            >
              {event.cover_image_url ? (
                <img
                  className="sidebar-avatar"
                  src={event.cover_image_url}
                  alt="Foto de perfil do evento"
                />
              ) : (
                <span className="sidebar-avatar sidebar-avatar-fallback" aria-hidden="true">
                  {EVENT_TYPE_ICONS[event.event_type]}
                </span>
              )}
              <span className="sidebar-avatar-badge" aria-hidden="true">
                {uploading ? '⏳' : '📷'}
              </span>
            </button>

            <h2 className="sidebar-event-name">{event.title}</h2>
            <p className="sidebar-event-type">
              {EVENT_TYPE_ICONS[event.event_type]} {EVENT_TYPE_LABELS[event.event_type]}
            </p>
          </div>

          <nav className="sidebar-nav">
            {SIDEBAR_NAV.map((item) => {
              const isEnabled =
                item.id === 'dashboard' ||
                item.id === 'guests' ||
                item.id === 'tasks' ||
                item.id === 'settings'
              const isActive =
                item.id === 'dashboard'
                  ? activeSection === 'dashboard'
                  : item.id === 'guests'
                    ? activeSection === 'guests'
                    : false
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-nav-item${isActive ? ' is-active' : ''}${isEnabled ? '' : ' is-disabled'}`}
                  disabled={!isEnabled}
                  onClick={() => handleNav(item.id)}
                >
                  <span className="sidebar-nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="sidebar-nav-label">{item.label}</span>
                  {!isEnabled && <span className="sidebar-nav-soon">em breve</span>}
                </button>
              )
            })}
          </nav>

          {events.length > 1 && (
            <div className="sidebar-event-switch">
              <label className="form-label" htmlFor="sidebar-event-select">
                Trocar evento
              </label>
              <select
                id="sidebar-event-select"
                className="form-control"
                value={event.id}
                onChange={(e) => onSelectEvent(e.target.value)}
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {EVENT_TYPE_ICONS[e.event_type]} {e.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </aside>

        {/* ===================== MAIN ===================== */}
        <main className="event-main">
          <header className="dashboard-topbar">
            <div className="dashboard-brand">
              <span className="dashboard-brand-mark" aria-hidden="true">
                {EVENT_TYPE_ICONS[event.event_type]}
              </span>
              <span className="dashboard-brand-name">Wedding & Events Planner</span>
            </div>
            <div className="dashboard-controls">
              <button type="button" className="btn-secondary" onClick={onOpenSettings}>
                Configurações
              </button>
            </div>
          </header>

          <div className="dashboard-main">
            {activeSection === 'guests' ? (
              <GuestList event={event} />
            ) : (
            <>
            {/* Hero do evento — primeiro viewport, com fundo fotográfico fosco */}
            <section className="event-hero" aria-label="Resumo do evento">
              {event.cover_image_url && (
                <div
                  className="event-hero-bg"
                  style={{ backgroundImage: `url(${event.cover_image_url})` }}
                  aria-hidden="true"
                />
              )}

              <span className="event-hero-badge">
                {EVENT_TYPE_ICONS[event.event_type]} {EVENT_TYPE_LABELS[event.event_type]} ·{' '}
                {EVENT_STATUS_LABELS[event.status]}
              </span>

              <h1 className="event-hero-title">
                {EVENT_TYPE_LABELS[event.event_type]} {coupleText ?? event.title}
              </h1>
              {coupleText && <p className="event-hero-couple">{event.title}</p>}

              <button
                type="button"
                className="hero-photo-btn"
                onClick={handlePickPhoto}
                disabled={uploading}
              >
                {uploading ? 'Enviando...' : event.cover_image_url ? '📷 Trocar foto' : '📷 Adicionar foto'}
              </button>
            </section>

            {/* Contador em cartões delicados (anos / meses / dias) */}
            {hasDate && dateDiff && (
              <section className="countdown-cards" aria-label="Contagem regressiva">
                <article className="countdown-card">
                  <span className="countdown-card-number">{pad2(dateDiff.years)}</span>
                  <span className="countdown-card-label">
                    {dateDiff.years === 1 ? 'ano' : 'anos'}
                  </span>
                </article>
                <article className="countdown-card">
                  <span className="countdown-card-number">{pad2(dateDiff.months)}</span>
                  <span className="countdown-card-label">
                    {dateDiff.months === 1 ? 'mês' : 'meses'}
                  </span>
                </article>
                <article className="countdown-card">
                  <span className="countdown-card-number">{pad2(dateDiff.days)}</span>
                  <span className="countdown-card-label">
                    {dateDiff.days === 1 ? 'dia' : 'dias'}
                  </span>
                </article>
              </section>
            )}

            {uploadError && (
              <p className="auth-error" role="alert">
                ⚠ {uploadError}
              </p>
            )}

            {/* Cards de acesso rápido */}
            <section className="overview-cards" aria-label="Visão geral do projeto">
              <article className="overview-card">
                <span className="overview-card-icon" aria-hidden="true">📅</span>
                <div className="overview-card-body">
                  <p className="overview-card-label">Data do Evento</p>
                  <p className="overview-card-value">{formatDate(event.date)}</p>
                  <p className="overview-card-hint">
                    {event.location ? `📍 ${event.location}` : 'Local a definir'}
                  </p>
                </div>
              </article>

              <article className="overview-card">
                <span className="overview-card-icon" aria-hidden="true">💰</span>
                <div className="overview-card-body">
                  <p className="overview-card-label">Orçamento / Financeiro</p>
                  <p className="overview-card-value">
                    {formatCurrency(spent)}
                    {budget > 0 && (
                      <span className="overview-card-muted"> de {formatCurrency(budget)}</span>
                    )}
                  </p>
                  {budgetPercent !== null ? (
                    <div className="overview-progress" role="progressbar" aria-valuenow={budgetPercent} aria-valuemin={0} aria-valuemax={100}>
                      <span className="overview-progress-fill" style={{ width: `${budgetPercent}%` }} />
                    </div>
                  ) : (
                    <p className="overview-card-hint">Defina o teto do orçamento no painel</p>
                  )}
                </div>
              </article>

              <article className="overview-card">
                <span className="overview-card-icon" aria-hidden="true">👥</span>
                <div className="overview-card-body">
                  <p className="overview-card-label">Resumo de Convidados</p>
                  <p className="overview-card-value">
                    {formatNumber(guestCount)}
                    <span className="overview-card-muted"> adicionados</span>
                  </p>
                  <p className="overview-card-hint">
                    {formatNumber(confirmedCount)} confirmados ·{' '}
                    {event.guest_count ? `${formatNumber(event.guest_count)} previstos` : 'sem meta definida'}
                  </p>
                </div>
              </article>
            </section>

            {/* Módulos do planejamento */}
            <section className="modules-section" aria-labelledby="modules-heading">
              <h2 id="modules-heading" className="section-heading">
                Meu planejamento
              </h2>
              <div className="module-grid">
                {MODULES.map((module) => (
                  <button
                    key={module.id}
                    type="button"
                    className="module-card"
                    aria-label={`Abrir módulo ${module.title}`}
                    onClick={
                      module.id === 'guests'
                        ? () => void onOpenGuests()
                        : module.id === 'tasks'
                          ? () => void onOpenTasks()
                          : undefined
                    }
                  >
                    <span className="module-card-icon" aria-hidden="true">
                      {module.icon}
                    </span>
                    <span className="module-card-title">{module.title}</span>
                    <span className="module-card-caption">{module.caption}</span>
                  </button>
                ))}
              </div>
            </section>
            </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}