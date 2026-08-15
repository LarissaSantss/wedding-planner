import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type {
  Event,
  EventUpdate,
  Task,
  TaskPriority,
  Guest,
  Expense,
  Vendor,
} from '../../lib/supabase/types'
import { getThemeStyle } from '../../utils/theme'
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  EVENT_STATUS_LABELS,
  formatCurrency,
  formatDate,
  buildDateDiff,
  getCoupleLabel,
} from '../../utils/eventFormat'
import { uploadEventCover } from '../../lib/supabase/storage'
import {
  fetchGuestsByEvent,
  fetchExpensesByEvent,
  fetchTasksByEvent,
  fetchVendorsByEvent,
  fetchEventMembers,
  updateTask,
} from '../../lib/supabase/database'
import { GuestList } from './GuestList'
import { Kanban } from './Kanban'
import { EventSettings } from './EventSettings'
import { SeatingChart } from './SeatingChart'

interface EventDashboardProps {
  event: Event
  events: Event[]
  activeSection?: 'dashboard' | 'guests' | 'tasks' | 'settings' | 'tables'
  onSelectEvent: (id: string) => void
  onOpenDashboard: () => void
  onOpenSettings: () => void
  onOpenGuests: () => void
  onOpenTasks: () => void
  onOpenTables: () => void
  onSaveEvent: (values: EventUpdate) => Promise<void>
  onDeleteEvent: (id: string) => void
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
  { id: 'tables', icon: '🪑', label: 'Mesas' },
  { id: 'vendors', icon: '🤝', label: 'Fornecedores' },
  { id: 'tasks', icon: '✅', label: 'Tarefas' },
  { id: 'expenses', icon: '💰', label: 'Orçamento' },
  { id: 'gifts', icon: '🎁', label: 'Presentes' },
  { id: 'settings', icon: '⚙️', label: 'Configurações' },
] as const

interface Member {
  user_id: string
  full_name: string | null
  email: string | null
}

interface DashboardData {
  guests: Guest[]
  tasks: Task[]
  expenses: Expense[]
  vendors: Vendor[]
  members: Member[]
}

const PRIORITY_BADGE: Record<TaskPriority, { label: string; className: string }> = {
  high: { label: 'Urgent', className: 'task-priority-urgent' },
  medium: { label: 'Medium', className: 'task-priority-medium' },
  low: { label: 'Low', className: 'task-priority-low' },
}

function initials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.trim().slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '?'
}

/**
 * Dashboard principal do LUNA com KPIs reais (tarefas, convidados, orçamento
 * e equipe), bloco de atenção, próximas tarefas e resumo financeiro.
 */
export function EventDashboard({
  event,
  events,
  activeSection = 'dashboard',
  onSelectEvent,
  onOpenDashboard,
  onOpenSettings,
  onOpenGuests,
  onOpenTasks,
  onOpenTables,
  onSaveEvent,
  onDeleteEvent,
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

  const countdownText = dateDiff
    ? dateDiff.years > 0
      ? `${dateDiff.years} ${dateDiff.years === 1 ? 'ano' : 'anos'} e ${dateDiff.days} ${
          dateDiff.days === 1 ? 'dia' : 'dias'
        } para o grande dia`
      : dateDiff.months > 0
        ? `${dateDiff.months} ${dateDiff.months === 1 ? 'mês' : 'meses'} e ${dateDiff.days} ${
            dateDiff.days === 1 ? 'dia' : 'dias'
          } para o grande dia`
        : `${dateDiff.days} ${dateDiff.days === 1 ? 'dia' : 'dias'} para o grande dia`
    : null

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const [data, setData] = useState<DashboardData>({
    guests: [],
    tasks: [],
    expenses: [],
    vendors: [],
    members: [],
  })

  const loadData = async () => {
    const [guests, tasks, expenses, vendors, members] = await Promise.allSettled([
      fetchGuestsByEvent(event.id),
      fetchTasksByEvent(event.id, { orderBy: { column: 'due_date', ascending: true } }),
      fetchExpensesByEvent(event.id),
      fetchVendorsByEvent(event.id),
      fetchEventMembers(event.id),
    ])

    setData({
      guests: guests.status === 'fulfilled' ? (guests.value.data ?? []) : [],
      tasks: tasks.status === 'fulfilled' ? (tasks.value.data ?? []) : [],
      expenses: expenses.status === 'fulfilled' ? (expenses.value.data ?? []) : [],
      vendors: vendors.status === 'fulfilled' ? (vendors.value.data ?? []) : [],
      members: members.status === 'fulfilled' ? ((members.value.data as Member[]) ?? []) : [],
    })
  }

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id])

  /* ---------- KPIs ---------- */
  const totalTasks = data.tasks.length
  const completedTasks = data.tasks.filter((t) => t.completed).length
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const totalGuests = data.guests.length
  const confirmedGuests = data.guests.filter((g) => g.rsvp_status === 'confirmed').length
  const pendingGuests = data.guests.filter((g) => g.rsvp_status === 'pending').length

  const budget = event.budget ?? 0
  const totalPaid = data.expenses.reduce((sum, e) => sum + (e.paid ? Number(e.amount) || 0 : 0), 0)
  const budgetPercent = budget > 0 ? Math.min(100, Math.round((totalPaid / budget) * 100)) : 0

  /* ---------- Financeiro ---------- */
  const totalContratado = data.vendors
    .filter((v) => v.status === 'contracted')
    .reduce((sum, v) => sum + (Number(v.cost) || 0), 0)
  const saldoPendente = Math.max(0, totalContratado - totalPaid)

  /* ---------- Tarefas: atraso, urgência e próximas ---------- */
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const todayTime = now.getTime()

  const isOverdue = (t: Task) =>
    !t.completed && t.due_date !== null && new Date(`${t.due_date}T00:00:00`).getTime() < todayTime

  const overdueTasks = data.tasks.filter(isOverdue)
  const urgentOpenTasks = data.tasks.filter((t) => !t.completed && t.priority === 'high')
  const attentionTaskCount = overdueTasks.length + urgentOpenTasks.length

  // Próximas tarefas: no prazo (hoje ou futuro) ou sem data, mais urgentes primeiro.
  const upcomingTasks = data.tasks
    .filter((t) => !t.completed && !isOverdue(t))
    .sort((a, b) => {
      const rank = (p: TaskPriority) => (p === 'high' ? 0 : p === 'medium' ? 1 : 2)
      const byPriority = rank(a.priority) - rank(b.priority)
      if (byPriority !== 0) return byPriority
      const aTime = a.due_date ? new Date(`${a.due_date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY
      const bTime = b.due_date ? new Date(`${b.due_date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY
      return aTime - bTime
    })
    .slice(0, 5)

  /* ---------- Alertas "O que precisa de atenção" ---------- */
  interface AttentionItem {
    key: string
    icon: string
    text: string
  }
  const attentionItems: AttentionItem[] = []

  if (overdueTasks.length > 0) {
    attentionItems.push({
      key: 'overdue-tasks',
      icon: '⏰',
      text: `${overdueTasks.length} ${overdueTasks.length === 1 ? 'tarefa vencida' : 'tarefas vencidas'} — ${overdueTasks
        .slice(0, 3)
        .map((t) => t.title)
        .join(', ')}${overdueTasks.length > 3 ? '…' : ''}`,
    })
  }

  if (budget > 0 && totalPaid > budget) {
    attentionItems.push({
      key: 'budget-over',
      icon: '💸',
      text: `Orçamento estourado em ${formatCurrency(totalPaid - budget)} (${formatCurrency(totalPaid)} de ${formatCurrency(budget)})`,
    })
  }

  const overdueExpenses = data.expenses.filter(
    (e) => !e.paid && e.due_date !== null && new Date(`${e.due_date}T00:00:00`).getTime() < todayTime,
  )
  if (overdueExpenses.length > 0) {
    const total = overdueExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0)
    attentionItems.push({
      key: 'overdue-expenses',
      icon: '🧾',
      text: `${overdueExpenses.length} ${overdueExpenses.length === 1 ? 'pagamento a fornecedor vencido' : 'pagamentos a fornecedores vencidos'} (${formatCurrency(total)})`,
    })
  }

  const pendingVendors = data.vendors.filter((v) => v.status === 'pending')
  if (pendingVendors.length > 0) {
    attentionItems.push({
      key: 'pending-vendors',
      icon: '🤝',
      text: `${pendingVendors.length} ${pendingVendors.length === 1 ? 'fornecedor aguardando contrato' : 'fornecedores aguardando contrato'} — ${pendingVendors
        .slice(0, 3)
        .map((v) => v.name)
        .join(', ')}${pendingVendors.length > 3 ? '…' : ''}`,
    })
  }

  const handlePickPhoto = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const { url, error } = await uploadEventCover(event.id, file)
    if (error) setUploadError('Não foi possível enviar a foto. Tente novamente.')
    else if (url) await onSaveEvent({ cover_image_url: url })
    setUploading(false)
  }

  const toggleTask = async (task: Task) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)),
    }))
    await updateTask(task.id, { completed: !task.completed })
  }

  const toggleFavorite = async (task: Task) => {
    const next: TaskPriority = task.priority === 'high' ? 'medium' : 'high'
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === task.id ? { ...t, priority: next } : t)),
    }))
    await updateTask(task.id, { priority: next })
  }

  const handleNav = (id: (typeof SIDEBAR_NAV)[number]['id']) => {
    if (id === 'dashboard') void onOpenDashboard()
    else if (id === 'guests') void onOpenGuests()
    else if (id === 'tables') void onOpenTables()
    else if (id === 'tasks') void onOpenTasks()
    else if (id === 'settings') void onOpenSettings()
  }

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
            <button type="button" className="sidebar-avatar-wrap" onClick={handlePickPhoto} disabled={uploading} aria-label="Alterar foto de perfil do evento">
              {event.cover_image_url ? (
                <img className="sidebar-avatar" src={event.cover_image_url} alt="Foto de perfil do evento" />
              ) : (
                <span className="sidebar-avatar sidebar-avatar-fallback" aria-hidden="true">
                  {EVENT_TYPE_ICONS[event.event_type]}
                </span>
              )}
              <span className="sidebar-avatar-badge" aria-hidden="true">{uploading ? '⏳' : '📷'}</span>
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
                item.id === 'tables' ||
                item.id === 'tasks' ||
                item.id === 'settings'
              const isActive =
                item.id === 'dashboard'
                  ? activeSection === 'dashboard'
                  : item.id === 'guests'
                    ? activeSection === 'guests'
                    : item.id === 'tasks'
                      ? activeSection === 'tasks'
                      : item.id === 'settings'
                        ? activeSection === 'settings'
                        : item.id === 'tables'
                          ? activeSection === 'tables'
                          : false
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`sidebar-nav-item${isActive ? ' is-active' : ''}${isEnabled ? '' : ' is-disabled'}`}
                  disabled={!isEnabled}
                  onClick={() => handleNav(item.id)}
                >
                  <span className="sidebar-nav-icon" aria-hidden="true">{item.icon}</span>
                  <span className="sidebar-nav-label">{item.label}</span>
                  {!isEnabled && <span className="sidebar-nav-soon">em breve</span>}
                </button>
              )
            })}
          </nav>

          {events.length > 1 && (
            <div className="sidebar-event-switch">
              <label className="form-label" htmlFor="sidebar-event-select">Trocar evento</label>
              <select id="sidebar-event-select" className="form-control" value={event.id} onChange={(e) => onSelectEvent(e.target.value)}>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} · {formatDate(e.date)} · {e.code}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void onDeleteEvent(event.id)}
              >
                Excluir evento atual
              </button>
            </div>
          )}
        </aside>

        <main className="event-main">
          <header className="dashboard-topbar">
            <div className="dashboard-brand">
              <span className="dashboard-brand-mark" aria-hidden="true">{EVENT_TYPE_ICONS[event.event_type]}</span>
              <span className="dashboard-brand-name">Wedding & Events Planner</span>
            </div>
            <div className="dashboard-controls">
              <button type="button" className="btn-secondary" onClick={onOpenSettings}>Configurações</button>
            </div>
          </header>

          <div className="dashboard-main">
            {activeSection === 'guests' ? (
              <GuestList event={event} />
            ) : activeSection === 'tasks' ? (
              <Kanban event={event} />
            ) : activeSection === 'settings' ? (
              <EventSettings
                event={event}
                onSave={async (_id, values) => {
                  await onSaveEvent(values)
                  return { error: null }
                }}
              />
            ) : activeSection === 'tables' ? (
              <SeatingChart event={event} />
            ) : (
              <>
                <section className="event-hero" aria-label="Resumo do evento">
                  {event.cover_image_url && (
                    <div className="event-hero-bg" style={{ backgroundImage: `url(${event.cover_image_url})` }} aria-hidden="true" />
                  )}
                  <span className="event-hero-badge">
                    {EVENT_TYPE_ICONS[event.event_type]} {EVENT_TYPE_LABELS[event.event_type]} · {EVENT_STATUS_LABELS[event.status]}
                  </span>
                  <h1 className="event-hero-title">
                    {EVENT_TYPE_LABELS[event.event_type]} {coupleText ?? event.title}
                  </h1>
                  {coupleText && <p className="event-hero-couple">{event.title}</p>}
                  {countdownText && (
                    <p className="event-hero-countdown-text">✨ {countdownText}</p>
                  )}
                  {event.date && (
                    <p className="event-hero-date">Data planejada: {formatDate(event.date)}</p>
                  )}
                  <button type="button" className="hero-photo-btn" onClick={handlePickPhoto} disabled={uploading}>
                    {uploading ? 'Enviando...' : event.cover_image_url ? '📷 Trocar foto' : '📷 Adicionar foto'}
                  </button>
                </section>

                {uploadError && <p className="auth-error" role="alert">⚠ {uploadError}</p>}

                {/* KPIs */}
                <section className="kpi-grid" aria-label="Métricas do evento">
                  <article className="kpi-card">
                    <span className="kpi-card-icon" aria-hidden="true">✅</span>
                    <div className="kpi-card-body">
                      <span className="kpi-card-label">Tarefas do Evento</span>
                      <span className="kpi-card-value">{completedTasks} / {totalTasks}</span>
                      <div className="kpi-progress" role="progressbar" aria-valuenow={taskProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso das tarefas">
                        <span className="kpi-progress-fill" style={{ width: `${taskProgress}%` }} />
                      </div>
                      <span className="kpi-card-hint">{taskProgress}% concluídas</span>
                      {attentionTaskCount > 0 && (
                        <span className="kpi-alert" role="alert">
                          ⚠ {attentionTaskCount} {attentionTaskCount === 1 ? 'tarefa atrasada/urgente' : 'tarefas atrasadas/urgentes'}
                        </span>
                      )}
                    </div>
                  </article>

                  <article className="kpi-card">
                    <span className="kpi-card-icon" aria-hidden="true">👥</span>
                    <div className="kpi-card-body">
                      <span className="kpi-card-label">Total de Convidados</span>
                      <span className="kpi-card-value">{confirmedGuests} <span className="kpi-card-muted">/ {totalGuests}</span></span>
                      <span className="kpi-card-hint">
                        {confirmedGuests} confirmados{pendingGuests > 0 ? ` · ${pendingGuests} pendente${pendingGuests > 1 ? 's' : ''}` : ''}
                      </span>
                    </div>
                  </article>

                  <article className="kpi-card">
                    <span className="kpi-card-icon" aria-hidden="true">💰</span>
                    <div className="kpi-card-body">
                      <span className="kpi-card-label">Orçamento do Evento</span>
                      <span className="kpi-card-value">{formatCurrency(totalPaid)}</span>
                      <div className="kpi-progress" role="progressbar" aria-valuenow={budgetPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Percentual pago do orçamento">
                        <span className="kpi-progress-fill" style={{ width: `${budgetPercent}%` }} />
                      </div>
                      <span className="kpi-card-hint">{budget > 0 ? `${budgetPercent}% pago de ${formatCurrency(budget)}` : 'Meta não definida'}</span>
                    </div>
                  </article>

                  <article className="kpi-card">
                    <span className="kpi-card-icon" aria-hidden="true">🤝</span>
                    <div className="kpi-card-body">
                      <span className="kpi-card-label">Equipe / Organizadores</span>
                      <div className="team-avatars">
                        <span className="team-avatar" title={event.client_name_1 ?? 'Você'} aria-label={event.client_name_1 ?? 'Você'}>
                          {initials(event.client_name_1, null)}
                        </span>
                        {data.members.map((m) => (
                          <span key={m.user_id} className="team-avatar" title={m.full_name ?? m.email ?? 'Membro'} aria-label={m.full_name ?? m.email ?? 'Membro'}>
                            {initials(m.full_name, m.email)}
                          </span>
                        ))}
                      </div>
                      <span className="kpi-card-hint">{data.members.length} organizadores</span>
                    </div>
                  </article>
                </section>

                {/* O que precisa de atenção */}
                {attentionItems.length > 0 && (
                  <section className="attention-card" aria-labelledby="attention-title">
                    <div className="attention-card-head">
                      <span className="attention-card-icon" aria-hidden="true">⚠️</span>
                      <h2 id="attention-title" className="attention-card-title">O que precisa de atenção</h2>
                    </div>
                    <ul className="attention-list">
                      {attentionItems.map((item) => (
                        <li key={item.key} className="attention-item">
                          <span className="attention-item-icon" aria-hidden="true">{item.icon}</span>
                          <span className="attention-item-text">{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Próximas tarefas + resumo financeiro */}
                <div className="dashboard-columns">
                  <section className="dashboard-panel" aria-labelledby="upcoming-title">
                    <div className="dashboard-panel-head">
                      <h2 id="upcoming-title" className="section-heading">Próximas tarefas</h2>
                      <button type="button" className="link-btn" onClick={onOpenTasks}>Ver Kanban Completo →</button>
                    </div>

                    {upcomingTasks.length === 0 ? (
                      <p className="guest-list-empty">Nenhuma tarefa pendente. 🎉</p>
                    ) : (
                      <ul className="task-list-dash">
                        {upcomingTasks.map((task) => {
                          const p = PRIORITY_BADGE[task.priority] ?? PRIORITY_BADGE.low
                          const favorite = task.priority === 'high'
                          return (
                            <li key={task.id} className={`task-row-dash${task.completed ? ' is-done' : ''}`}>
                              <div className="task-row-dash-top">
                                <label className="task-check">
                                  <input type="checkbox" checked={task.completed} onChange={() => void toggleTask(task)} aria-label={`Concluir ${task.title}`} />
                                  <span className="task-check-title">{task.title}</span>
                                </label>
                                <button
                                  type="button"
                                  className="task-star"
                                  aria-label={favorite ? `Remover ${task.title} dos favoritos` : `Favoritar ${task.title}`}
                                  aria-pressed={favorite}
                                  title={favorite ? 'Remover dos favoritos' : 'Favoritar'}
                                  onClick={() => void toggleFavorite(task)}
                                >
                                  {favorite ? '⭐' : '☆'}
                                </button>
                              </div>
                              <div className="task-row-meta">
                                {task.category && <span className="task-cat">{task.category}</span>}
                                <span className={`task-priority ${p.className}`}>{p.label}</span>
                                {task.due_date && <span className="task-due">📅 {formatDate(task.due_date)}</span>}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>

                  <section className="dashboard-panel" aria-labelledby="finance-title">
                    <h2 id="finance-title" className="section-heading">Resumo financeiro</h2>
                    <dl className="finance-list">
                      <div className="finance-row">
                        <dt>Total Contratado</dt>
                        <dd>{formatCurrency(totalContratado)}</dd>
                      </div>
                      <div className="finance-row">
                        <dt>Total Já Pago</dt>
                        <dd>{formatCurrency(totalPaid)}</dd>
                      </div>
                      <div className="finance-row is-total">
                        <dt>Saldo Pendente</dt>
                        <dd>{formatCurrency(saldoPendente)}</dd>
                      </div>
                    </dl>
                    <button type="button" className="btn-secondary" style={{ marginTop: '1rem' }} onClick={onOpenTasks}>
                      Gerenciar Orçamento
                    </button>
                  </section>
                </div>

                {/* Módulos */}
                <section className="modules-section" aria-labelledby="modules-heading">
                  <h2 id="modules-heading" className="section-heading">Meu planejamento</h2>
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
                        <span className="module-card-icon" aria-hidden="true">{module.icon}</span>
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
