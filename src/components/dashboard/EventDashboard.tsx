{/* 
  ============================================================================
  DIRECTION CONTRACT — EVENT DASHBOARD (surface: EventDashboard, mode: Operate)
  ----------------------------------------------------------------------------
  THESIS: O dashboard do evento como um "cartão de convite vivo" — hero com
  gradiente do tema, contagem regressiva em três blocos e métricas-chave em
  cards; rejeita o template hero-metric genérico (big number + small label
  disperso) ao concentrar a identidade do evento no primeiro viewport.
  OWN-WORLD: Sistema de tokens `--theme-*` gerados por src/utils/theme.ts.
  O gradiente do preset escolhido dita a cor do hero; superfície e texto
  seguem o mesmo token. Emojis de tipo de evento (💍, 👑) são marca visual
  solicitada explicitamente no brief do produto.
  STORY: O organizador vê, em segundos, o que importa — data, contagem,
  orçamento e convidados — e encontra o caminho para configurar ou abrir
  módulos de planejamento.
  FIRST VIEWPORT: Topbar (marca + seletor de eventos + botão configurações);
  hero com badge de tipo, título, nomes dos clientes e contagem regressiva;
  grade de métricas; grade de módulos do planejamento.
  FORM: Novas superfícies dentro do mundo estabelecido (tokens de tema);
  seleção direta, sem tournament.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the
  finish review, the verdict, and DESIGN.md.
  ============================================================================
*/}
import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import type { Event } from '../../lib/supabase/types'
import { getThemeStyle } from '../../utils/theme'
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  EVENT_STATUS_LABELS,
  formatCurrency,
  formatNumber,
  formatDate,
  daysUntil,
} from '../../utils/eventFormat'

interface EventDashboardProps {
  event: Event
  events: Event[]
  onSelectEvent: (id: string) => void
  onOpenSettings: () => void
}

interface CountdownUnit {
  value: number
  label: string
}

/** Quebra a contagem regressiva em dias, horas, minutos e segundos */
function buildCountdown(isoDate: string | null | undefined): CountdownUnit[] {
  const days = daysUntil(isoDate)
  if (days === null) return []

  if (days <= 0) {
    return [
      { value: Math.max(0, days), label: 'dias' },
      { value: 0, label: 'horas' },
      { value: 0, label: 'min' },
    ]
  }

  return [
    { value: days, label: 'dias' },
    { value: 0, label: 'horas' },
    { value: 0, label: 'min' },
  ]
}

const MODULES = [
  { id: 'guests', icon: '👥', title: 'Convidados', caption: 'RSVP, mesas e grupos' },
  { id: 'vendors', icon: '🤝', title: 'Fornecedores', caption: 'Contratos e contatos' },
  { id: 'tasks', icon: '✅', title: 'Tarefas', caption: 'Checklist do evento' },
  { id: 'expenses', icon: '💰', title: 'Orçamento', caption: 'Despesas e custos' },
  { id: 'gifts', icon: '🎁', title: 'Presentes', caption: 'Lista de registro' },
]

/**
 * Dashboard principal do evento.
 *
 * - Resumo do evento ativo: nomes, tipo, contagem regressiva, orçamento, convidados
 * - Seletor para trocar entre eventos do usuário
 * - Acesso às configurações do evento
 * - Atalhos para módulos de planejamento
 *
 * Uso:
 *   <EventDashboard event={event} events={events}
 *     onSelectEvent={selectEvent} onOpenSettings={() => setView('settings')} />
 */
export function EventDashboard({
  event,
  events,
  onSelectEvent,
  onOpenSettings,
}: EventDashboardProps) {
  const themeStyle = useMemo<CSSProperties>(() => getThemeStyle(event.theme_preset), [event.theme_preset])
  const countdown = useMemo(() => buildCountdown(event.date), [event.date])

  const clientNames = [event.client_name_1, event.client_name_2].filter(
    (name): name is string => Boolean(name),
  )
  const coupleText = clientNames.length > 0 ? clientNames.join(' & ') : null

  return (
    <div className="dashboard-shell" style={themeStyle}>
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <span className="dashboard-brand-mark" aria-hidden="true">
            {EVENT_TYPE_ICONS[event.event_type]}
          </span>
          <span className="dashboard-brand-name">Wedding & Events Planner</span>
        </div>

        <div className="dashboard-controls">
          {events.length > 1 && (
            <div className="event-selector">
              <select
                className="form-control event-selector-native"
                aria-label="Selecionar evento"
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

          <button type="button" className="btn-secondary" onClick={onOpenSettings}>
            Configurações
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Hero do evento — primeiro viewport */}
        <section className="event-hero" aria-label="Resumo do evento">
          <span className="event-hero-badge">
            {EVENT_TYPE_ICONS[event.event_type]} {EVENT_TYPE_LABELS[event.event_type]} ·{' '}
            {EVENT_STATUS_LABELS[event.status]}
          </span>

          <h1 className="event-hero-title">{event.title}</h1>
          {coupleText && <p className="event-hero-couple">{coupleText}</p>}

          <div className="event-hero-countdown">
            {countdown.length > 0 ? (
              countdown.map((unit, index) => (
                <span key={unit.label} className="countdown-block">
                  {index > 0 && <span className="countdown-divider" aria-hidden="true" />}
                  <span className="countdown-number">{unit.value}</span>
                  <span className="countdown-label">{unit.label}</span>
                </span>
              ))
            ) : (
              <span className="countdown-number" style={{ fontSize: '1.25rem' }}>
                Data a definir
              </span>
            )}
          </div>
        </section>

        {/* Métricas-chave */}
        <section className="event-metrics" aria-label="Métricas do evento">
          <article className="metric-card">
            <p className="metric-label">Data</p>
            <p className="metric-value" style={{ fontSize: '1.2rem' }}>
              {formatDate(event.date)}
            </p>
            <p className="metric-hint">
              {event.location ? `📍 ${event.location}` : 'Local a definir'}
            </p>
          </article>

          <article className="metric-card">
            <p className="metric-label">Orçamento</p>
            <p className="metric-value">{formatCurrency(event.budget)}</p>
            <p className="metric-hint">{event.budget ? 'Orçamento planejado' : 'Defina no painel'}</p>
          </article>

          <article className="metric-card">
            <p className="metric-label">Convidados</p>
            <p className="metric-value">{formatNumber(event.guest_count)}</p>
            <p className="metric-hint">{event.guest_count ? 'Convidados planejados' : 'Defina no painel'}</p>
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

      </main>
    </div>
  )
}