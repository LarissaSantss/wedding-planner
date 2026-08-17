import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Event,
  EventUpdate,
  Task,
  TaskPriority,
  Guest,
  Expense,
  Vendor,
} from '../../lib/supabase/types'
import {
  EVENT_TYPE_LABELS,
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
  { id: 'guests', title: 'Convidados', caption: 'RSVP, mesas e grupos' },
  { id: 'vendors', title: 'Fornecedores', caption: 'Contratos e contatos' },
  { id: 'tasks', title: 'Tarefas', caption: 'Checklist do evento' },
  { id: 'expenses', title: 'Orçamento', caption: 'Despesas e custos' },
  { id: 'gifts', title: 'Presentes', caption: 'Lista de registro' },
]

const SIDEBAR_NAV = [
  { id: 'dashboard', label: 'Painel' },
  { id: 'guests', label: 'Convidados' },
  { id: 'tables', label: 'Mesas' },
  { id: 'vendors', label: 'Fornecedores' },
  { id: 'tasks', label: 'Tarefas' },
  { id: 'expenses', label: 'Orçamento' },
  { id: 'gifts', label: 'Presentes' },
  { id: 'settings', label: 'Configurações' },
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
  high: { label: 'Urgente', className: 'is-danger' },
  medium: { label: 'Média', className: 'is-warning' },
  low: { label: 'Baixa', className: 'is-outline' },
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
 * Dashboard principal do LUNA — centro de comando do evento.
 * Redesign visual "Wedding Editorial": hero editorial, faixa de progresso,
 * bloco de atenção, próximas tarefas e resumo financeiro.
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
  const dateDiff = useMemo(() => buildDateDiff(event.date), [event.date])
  const coupleText = getCoupleLabel(event)

  const countdownNumber = dateDiff
    ? dateDiff.years > 0
      ? dateDiff.years * 365 + dateDiff.days
      : dateDiff.months > 0
        ? dateDiff.months * 30 + dateDiff.days
        : dateDiff.days
    : null

  const countdownLabel =
    countdownNumber === null
      ? null
      : countdownNumber === 1
        ? 'dia para o grande dia'
        : 'dias para o grande dia'

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

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
    text: string
  }
  const attentionItems: AttentionItem[] = []

  if (overdueTasks.length > 0) {
    attentionItems.push({
      key: 'overdue-tasks',
      text: `${overdueTasks.length} ${overdueTasks.length === 1 ? 'tarefa vencida' : 'tarefas vencidas'} — ${overdueTasks
        .slice(0, 3)
        .map((t) => t.title)
        .join(', ')}${overdueTasks.length > 3 ? '…' : ''}`,
    })
  }

  if (budget > 0 && totalPaid > budget) {
    attentionItems.push({
      key: 'budget-over',
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
      text: `${overdueExpenses.length} ${overdueExpenses.length === 1 ? 'pagamento a fornecedor vencido' : 'pagamentos a fornecedores vencidos'} (${formatCurrency(total)})`,
    })
  }

  const pendingVendors = data.vendors.filter((v) => v.status === 'pending')
  if (pendingVendors.length > 0) {
    attentionItems.push({
      key: 'pending-vendors',
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

  const isDashboard = activeSection === 'dashboard'

  return (
    <div className="luna">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => void handleFileChange(e)}
        aria-hidden="true"
      />

      <div className="luna-shell">
        {/* ===== Sidebar ===== */}
        <aside className="luna-sidebar" aria-label="Menu do evento">
          <div className="luna-sidebar-brand">
            <span className="luna-sidebar-mark" aria-hidden="true">L</span>
            <span className="luna-sidebar-wordmark">Luna</span>
          </div>

          <div className="luna-event-card">
            <p className="luna-eyebrow">Evento atual</p>
            <p className="luna-event-name">{event.title}</p>
            <p className="luna-event-meta">
              {EVENT_TYPE_LABELS[event.event_type]} · {formatDate(event.date)}
            </p>
          </div>

          <nav className="luna-nav" aria-label="Navegação do evento">
            <p className="luna-eyebrow luna-nav-label">Planejamento</p>
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
                  className={`luna-nav-item${isActive ? ' is-active' : ''}${isEnabled ? '' : ' is-disabled'}`}
                  disabled={!isEnabled}
                  onClick={() => handleNav(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="luna-nav-label-text">{item.label}</span>
                  {!isEnabled && <span className="luna-nav-soon">em breve</span>}
                </button>
              )
            })}
          </nav>

          {events.length > 1 && (
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="luna-label" htmlFor="sidebar-event-select">Trocar evento</label>
              <select
                id="sidebar-event-select"
                className="luna-select"
                value={event.id}
                onChange={(e) => onSelectEvent(e.target.value)}
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} · {formatDate(e.date)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="luna-btn luna-btn-danger"
                onClick={() => void onDeleteEvent(event.id)}
              >
                Excluir evento
              </button>
            </div>
          )}
        </aside>

        {/* ===== Conteúdo ===== */}
        <main className="luna-main">
          <header className="luna-topbar">
            <span className="luna-topbar-title">
              {isDashboard ? 'Painel' : EVENT_TYPE_LABELS[event.event_type]}
            </span>
            <div className="luna-topbar-actions">
              <button type="button" className="luna-btn luna-btn-ghost" onClick={onOpenSettings}>
                Configurações
              </button>
            </div>
          </header>

          <div className="luna-content">
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
                {/* ===== Hero editorial ===== */}
                <section className="luna-hero" aria-label="Resumo do evento">
                  <p className="luna-eyebrow">
                    {EVENT_TYPE_LABELS[event.event_type]} · {EVENT_STATUS_LABELS[event.status]}
                  </p>
                  <h1 className="luna-hero-title">
                    {coupleText ? (
                      <>
                        {coupleText.split(' & ')[0]} <em>&</em> {coupleText.split(' & ')[1] ?? ''}
                      </>
                    ) : (
                      event.title
                    )}
                  </h1>
                  <p className="luna-hero-sub">
                    Seu planejamento está sob controle. Acompanhe o progresso, as decisões pendentes
                    e os próximos passos do seu {EVENT_TYPE_LABELS[event.event_type].toLowerCase()}.
                  </p>
                  <div className="luna-hero-meta">
                    {countdownNumber !== null && (
                      <span className="luna-countdown">
                        <span className="luna-countdown-num">{countdownNumber}</span>
                        <span className="luna-countdown-label">{countdownLabel}</span>
                      </span>
                    )}
                    {event.date && (
                      <span className="luna-hero-date">
                        Data planejada: <strong>{formatDate(event.date)}</strong>
                      </span>
                    )}
                    <button
                      type="button"
                      className="luna-btn luna-btn-secondary"
                      onClick={handlePickPhoto}
                      disabled={uploading}
                    >
                      {uploading ? 'Enviando…' : event.cover_image_url ? 'Trocar foto de capa' : 'Adicionar foto de capa'}
                    </button>
                  </div>
                  {uploadError && (
                    <p className="luna-caption" role="alert" style={{ color: '#8f2f3e', marginTop: '0.75rem' }}>
                      {uploadError}
                    </p>
                  )}
                </section>

                {/* ===== Faixa de progresso ===== */}
                <section aria-label="Métricas do evento">
                  <div className="luna-progress-strip">
                    <div className="luna-stat">
                      <span className="luna-stat-label">Tarefas</span>
                      <span className="luna-stat-value">{completedTasks}<span style={{ color: 'var(--luna-text-faint)', fontSize: '1.2rem' }}> / {totalTasks}</span></span>
                      <div className="luna-stat-bar" role="progressbar" aria-valuenow={taskProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso das tarefas">
                        <span className="luna-stat-bar-fill" style={{ width: `${taskProgress}%` }} />
                      </div>
                      <span className="luna-stat-hint">{taskProgress}% concluídas</span>
                      {attentionTaskCount > 0 && (
                        <span className="luna-stat-alert" role="alert">
                          {attentionTaskCount} {attentionTaskCount === 1 ? 'atrasada/urgente' : 'atrasadas/urgentes'}
                        </span>
                      )}
                    </div>

                    <div className="luna-stat">
                      <span className="luna-stat-label">Convidados</span>
                      <span className="luna-stat-value">{confirmedGuests}<span style={{ color: 'var(--luna-text-faint)', fontSize: '1.2rem' }}> / {totalGuests}</span></span>
                      <span className="luna-stat-hint">
                        {confirmedGuests} confirmados{pendingGuests > 0 ? ` · ${pendingGuests} pendente${pendingGuests > 1 ? 's' : ''}` : ''}
                      </span>
                    </div>

                    <div className="luna-stat">
                      <span className="luna-stat-label">Orçamento</span>
                      <span className="luna-stat-value" style={{ fontSize: '1.5rem' }}>{formatCurrency(totalPaid)}</span>
                      <div className="luna-stat-bar" role="progressbar" aria-valuenow={budgetPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Percentual pago do orçamento">
                        <span className="luna-stat-bar-fill" style={{ width: `${budgetPercent}%` }} />
                      </div>
                      <span className="luna-stat-hint">{budget > 0 ? `${budgetPercent}% pago de ${formatCurrency(budget)}` : 'Meta não definida'}</span>
                    </div>

                    <div className="luna-stat">
                      <span className="luna-stat-label">Equipe</span>
                      <span className="luna-stat-value">{data.members.length + 1}</span>
                      <span className="luna-stat-hint">
                        {data.members.length + 1 === 1 ? 'organizador' : 'organizadores'} no evento
                      </span>
                    </div>
                  </div>
                </section>

                {/* ===== O que precisa de atenção ===== */}
                {attentionItems.length > 0 && (
                  <section className="luna-attention" aria-labelledby="attention-title">
                    <div className="luna-attention-head">
                      <h2 id="attention-title" className="luna-attention-title">O que precisa de atenção</h2>
                    </div>
                    <ul className="luna-attention-list">
                      {attentionItems.map((item) => (
                        <li key={item.key} className="luna-attention-item">
                          <span className="luna-attention-dot" aria-hidden="true" />
                          <span>{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* ===== Próximas tarefas + financeiro ===== */}
                <div className="luna-cols">
                  <section className="luna-panel luna-panel-pad" aria-labelledby="upcoming-title">
                    <div className="luna-section-head">
                      <h2 id="upcoming-title" className="luna-h2">Próximas tarefas</h2>
                      <button type="button" className="luna-link" onClick={onOpenTasks}>
                        Ver Kanban →
                      </button>
                    </div>

                    {upcomingTasks.length === 0 ? (
                      <div className="luna-empty">
                        <p className="luna-lead">Nenhuma tarefa pendente.</p>
                        <p className="luna-caption">Tudo em dia por aqui.</p>
                      </div>
                    ) : (
                      <ul className="luna-task-list">
                        {upcomingTasks.map((task) => {
                          const p = PRIORITY_BADGE[task.priority] ?? PRIORITY_BADGE.low
                          const favorite = task.priority === 'high'
                          return (
                            <li key={task.id} className={`luna-task${task.completed ? ' is-done' : ''}`}>
                              <label className="luna-task-check">
                                <input
                                  type="checkbox"
                                  checked={task.completed}
                                  onChange={() => void toggleTask(task)}
                                  aria-label={`Concluir ${task.title}`}
                                />
                                <span className="luna-task-title">{task.title}</span>
                              </label>
                              <div className="luna-task-meta">
                                {task.due_date && <span>{formatDate(task.due_date)}</span>}
                                <span className={`luna-badge ${p.className}`}>{p.label}</span>
                                <button
                                  type="button"
                                  className={`luna-task-star${favorite ? ' is-fav' : ''}`}
                                  aria-label={favorite ? `Remover ${task.title} dos favoritos` : `Favoritar ${task.title}`}
                                  aria-pressed={favorite}
                                  title={favorite ? 'Remover dos favoritos' : 'Favoritar'}
                                  onClick={() => void toggleFavorite(task)}
                                >
                                  {favorite ? '★' : '☆'}
                                </button>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>

                  <section className="luna-panel luna-panel-pad" aria-labelledby="finance-title">
                    <div className="luna-section-head">
                      <h2 id="finance-title" className="luna-h2">Resumo financeiro</h2>
                    </div>
                    <dl className="luna-finance">
                      <div className="luna-finance-row">
                        <dt>Total contratado</dt>
                        <dd>{formatCurrency(totalContratado)}</dd>
                      </div>
                      <div className="luna-finance-row">
                        <dt>Total já pago</dt>
                        <dd>{formatCurrency(totalPaid)}</dd>
                      </div>
                      <div className="luna-finance-row is-total">
                        <dt>Saldo pendente</dt>
                        <dd>{formatCurrency(saldoPendente)}</dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      className="luna-btn luna-btn-secondary"
                      style={{ marginTop: '1.25rem', alignSelf: 'flex-start' }}
                      onClick={onOpenTasks}
                    >
                      Gerenciar orçamento
                    </button>
                  </section>
                </div>

                {/* ===== Módulos ===== */}
                <section className="luna-section" aria-labelledby="modules-heading">
                  <div className="luna-section-head">
                    <h2 id="modules-heading" className="luna-h2">Meu planejamento</h2>
                  </div>
                  <div className="luna-modules">
                    {MODULES.map((module) => (
                      <button
                        key={module.id}
                        type="button"
                        className="luna-module"
                        aria-label={`Abrir módulo ${module.title}`}
                        onClick={
                          module.id === 'guests'
                            ? () => void onOpenGuests()
                            : module.id === 'tasks'
                              ? () => void onOpenTasks()
                              : undefined
                        }
                      >
                        <span className="luna-module-title">{module.title}</span>
                        <span className="luna-module-caption">{module.caption}</span>
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
