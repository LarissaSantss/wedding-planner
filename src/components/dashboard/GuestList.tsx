import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  Event,
  Guest,
  GuestPriority,
  CompanionRelationship,
  GuestRoleAssignment,
  GuestCompanion,
  GuestVote,
} from '../../lib/supabase/types'

import { useGuestModule } from '../../hooks/useGuestModule'
import { GuestDetail } from './GuestDetail'
import {
  COMPANION_RELATIONSHIP_LABELS,
  COMPANION_RELATIONSHIP_LIST,
  getRelationshipOptions,
  PRIORITY_LABELS,
} from '../../utils/eventFormat'
import {
  createCompanion,
  createGuests,
  fetchGuestRoleAssignments,
  fetchCompanionsByEvent,
  fetchVotesByEvent,
  fetchEventMembers,
} from '../../lib/supabase/database'

interface GuestListProps {
  event: Event
}

interface CompanionDraft {
  name: string
  relationship: CompanionRelationship
}

interface Member {
  user_id: string
  full_name: string | null
  email: string | null
}

/* ---------- Helpers de rótulo ---------- */

function clientLabel(event: Event, key: 'client_1' | 'client_2'): string {
  const name = key === 'client_1' ? event.client_name_1 : event.client_name_2
  const role = key === 'client_1' ? event.client_role_1 : event.client_role_2
  return [name, role].filter(Boolean).join(' - ') || (key === 'client_1' ? 'Anfitrião 1' : 'Anfitrião 2')
}

function invitedByLabel(event: Event, value: Guest['invited_by']): string {
  if (value === 'client_1') return clientLabel(event, 'client_1')
  if (value === 'client_2') return clientLabel(event, 'client_2')
  if (value === 'both') return `${clientLabel(event, 'client_1')} & ${clientLabel(event, 'client_2')}`
  return 'A definir'
}

function hasPending(guest: Guest): boolean {
  return (
    !guest.email ||
    !guest.phone ||
    guest.priority === null ||
    guest.invited_by === null ||
    !guest.relationship_to_event
  )
}

function stars(n: number | null): string {
  if (!n) return ''
  return '⭐'.repeat(n)
}

const RSVP_LABEL: Record<Guest['rsvp_status'], string> = {
  confirmed: 'Confirmado',
  pending: 'Pendente',
  declined: 'Recusado',
}

/* ---------- Filtros ---------- */
interface Filters {
  invited_by: string // '' | client_1 | client_2 | both | none
  priority: string // '' | 1 | 2 | 3 | none
  group_id: string // '' | id | none
  relationship: string // '' | valor | none
}

const EMPTY_FILTERS: Filters = { invited_by: '', priority: '', group_id: '', relationship: '' }

export function GuestList({ event }: GuestListProps) {
  const {
    guests,
    groups,
    loading,
    error,
    permissions,
    addGuest,
    updateGuest,
    addGroup,
    removeGuest,
    prioritize,
  } = useGuestModule(event.id)

  const [search, setSearch] = useState('')
  const [macroFilter, setMacroFilter] = useState<'all' | 'special' | 'common'>('all')
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Guest | null>(null)
  const [assignments, setAssignments] = useState<GuestRoleAssignment[]>([])
  const [companions, setCompanions] = useState<GuestCompanion[]>([])
  const [votes, setVotes] = useState<GuestVote[]>([])
  const [members, setMembers] = useState<Member[]>([])

  // Modal de filtros
  const [showFilters, setShowFilters] = useState(false)
  const [draftFilters, setDraftFilters] = useState<Filters>(EMPTY_FILTERS)
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

  // Modal de exportação
  const [showExport, setShowExport] = useState(false)
  const [exportConfirmedOnly, setExportConfirmedOnly] = useState(false)
  const [exportSort, setExportSort] = useState<'alpha' | 'group'>('alpha')
  const [exportCopied, setExportCopied] = useState(false)

  // Modal de adição
  const [showAdd, setShowAdd] = useState(false)
  const [addTab, setAddTab] = useState<'single' | 'bulk'>('single')
  const [adding, setAdding] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Single form
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    priority: '',
    invited_by: '',
    relationship: '',
    group_id: '',
  })
  const [companionCount, setCompanionCount] = useState(0)
  const [companionDrafts, setCompanionDrafts] = useState<CompanionDraft[]>([])

  // Bulk form
  const [bulkText, setBulkText] = useState('')
  const [bulkConfirm, setBulkConfirm] = useState<string[] | null>(null)

  const relationshipOptions = useMemo(() => getRelationshipOptions(event.event_type), [event.event_type])

  const loadAux = useCallback(async () => {
    const [assignRes, compRes, votesRes, membersRes] = await Promise.allSettled([
      fetchGuestRoleAssignments(event.id),
      fetchCompanionsByEvent(event.id),
      fetchVotesByEvent(event.id),
      fetchEventMembers(event.id),
    ])
    if (assignRes.status === 'fulfilled') setAssignments(assignRes.value.data ?? [])
    if (compRes.status === 'fulfilled') setCompanions(compRes.value.data ?? [])
    if (votesRes.status === 'fulfilled') setVotes(votesRes.value.data ?? [])
    if (membersRes.status === 'fulfilled') setMembers((membersRes.value.data as Member[]) ?? [])
  }, [event.id])

  useEffect(() => {
    void loadAux()
  }, [loadAux])

  /* ---------- Indicadores / KPIs ---------- */
  const companionsByGuest = useMemo(() => {
    const map = new Map<string, GuestCompanion[]>()
    for (const c of companions) {
      const arr = map.get(c.guest_id) ?? []
      arr.push(c)
      map.set(c.guest_id, arr)
    }
    return map
  }, [companions])

  const totalSeats = guests.length + companions.length

  const indicators = useMemo(() => {
    const total = guests.length
    const confirmed = guests.filter((g) => g.rsvp_status === 'confirmed').length
    const pending = guests.filter((g) => g.rsvp_status === 'pending').length
    const declined = guests.filter((g) => g.rsvp_status === 'declined').length
    return { total, confirmed, pending, declined }
  }, [guests])

  /* ---------- Votação rápida por convidado ---------- */
  const votesByGuest = useMemo(() => {
    const map = new Map<string, GuestVote[]>()
    for (const v of votes) {
      const arr = map.get(v.guest_id) ?? []
      arr.push(v)
      map.set(v.guest_id, arr)
    }
    return map
  }, [votes])

  const memberName = useCallback(
    (userId: string) => members.find((m) => m.user_id === userId)?.full_name ?? null,
    [members],
  )

  // Rótulo curto da votação do casal para o card: "Larissa 👍 | Vinicius ⏳"
  const voteSummary = useCallback(
    (guestId: string): string | null => {
      const list = votesByGuest.get(guestId) ?? []
      const c1 = clientLabel(event, 'client_1').split(' - ')[0]
      const c2 = clientLabel(event, 'client_2').split(' - ')[0]
      const parts: string[] = []
      const voteFor = (name: string) => {
        const v = list.find((x) => memberName(x.user_id) === name)
        return v ? (v.vote === 'agree' ? '👍' : '👎') : '⏳'
      }
      if (event.client_name_1) parts.push(`${c1} ${voteFor(event.client_name_1)}`)
      if (event.client_name_2) parts.push(`${c2} ${voteFor(event.client_name_2)}`)
      return parts.length > 0 ? parts.join(' | ') : null
    },
    [votesByGuest, event, memberName],
  )

  /* ---------- Filtragem ---------- */
  const activeFilterCount =
    (filters.invited_by ? 1 : 0) + (filters.priority ? 1 : 0) + (filters.group_id ? 1 : 0) + (filters.relationship ? 1 : 0)

  const filtered = useMemo(() => {
    return guests.filter((g) => {
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false

      if (macroFilter === 'special' && !assignments.some((a) => a.guest_id === g.id)) return false
      if (macroFilter === 'common' && assignments.some((a) => a.guest_id === g.id)) return false

      if (filters.invited_by) {
        if (filters.invited_by === 'none') {
          if (g.invited_by !== null) return false
        } else if (g.invited_by !== filters.invited_by) return false
      }
      if (filters.priority) {
        if (filters.priority === 'none') {
          if (g.priority !== null) return false
        } else if (g.priority !== Number(filters.priority)) return false
      }
      if (filters.group_id) {
        if (filters.group_id === 'none') {
          if (g.group_id !== null) return false
        } else if (g.group_id !== filters.group_id) return false
      }
      if (filters.relationship) {
        if (filters.relationship === 'none') {
          if (g.relationship_to_event) return false
        } else if (g.relationship_to_event !== filters.relationship) return false
      }
      return true
    })
  }, [guests, search, macroFilter, filters, assignments])

  /* ---------- Exportação ---------- */
  const exportList = useMemo(() => {
    let list = [...filtered]
    if (exportConfirmedOnly) list = list.filter((g) => g.rsvp_status === 'confirmed')
    if (exportSort === 'alpha') {
      list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    } else {
      const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name ?? 'zzz'
      list.sort((a, b) => {
        const byGroup = groupName(a.group_id).localeCompare(groupName(b.group_id), 'pt-BR')
        return byGroup !== 0 ? byGroup : a.name.localeCompare(b.name, 'pt-BR')
      })
    }
    return list
  }, [filtered, exportConfirmedOnly, exportSort, groups])

  const exportText = useMemo(() => {
    const lines = exportList.map((g) => {
      const comp = companionsByGuest.get(g.id)?.length ?? 0
      const parts = [g.name]
      if (g.relationship_to_event) parts.push(`(${g.relationship_to_event})`)
      if (comp > 0) parts.push(`+${comp} acomp.`)
      parts.push(`[${RSVP_LABEL[g.rsvp_status]}]`)
      return parts.join(' ')
    })
    const header = `Lista de convidados — ${event.title}\nTotal: ${exportList.length} convidados · ${totalSeats} lugares\n`
    return header + '\n' + lines.join('\n')
  }, [exportList, companionsByGuest, event.title, totalSeats])

  const handleCopyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportText)
      setExportCopied(true)
      setTimeout(() => setExportCopied(false), 2000)
    } catch {
      /* clipboard indisponível */
    }
  }

  const handleDownloadExport = () => {
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `convidados-${event.title.toLowerCase().replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ---------- Modal de adição ---------- */
  const openAdd = () => {
    setForm({ name: '', email: '', phone: '', priority: '', invited_by: '', relationship: '', group_id: '' })
    setCompanionCount(0)
    setCompanionDrafts([])
    setBulkText('')
    setBulkConfirm(null)
    setFeedback(null)
    setAddTab('single')
    setShowAdd(true)
  }

  const setCount = (next: number) => {
    const n = Math.max(0, Math.floor(next))
    setCompanionCount(n)
    setCompanionDrafts((prev) => {
      const arr = [...prev]
      if (n > arr.length) {
        for (let i = arr.length; i < n; i++) arr.push({ name: '', relationship: 'other' })
      } else if (n < arr.length) {
        arr.length = n
      }
      return arr
    })
  }

  const changeCompanion = (index: number, patch: Partial<CompanionDraft>) => {
    setCompanionDrafts((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  const emptyCompanions = companionDrafts.slice(0, companionCount).filter((c) => !c.name.trim()).length

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setAdding(true)
    setFeedback(null)

    const priority =
      form.priority === '1' || form.priority === '2' || form.priority === '3'
        ? (Number(form.priority) as GuestPriority)
        : null

    const guest = await addGuest({
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      group_id: form.group_id || null,
      notes: null,
      priority,
      invited_by:
        form.invited_by === 'client_1' || form.invited_by === 'client_2' || form.invited_by === 'both'
          ? form.invited_by
          : null,
      relationship_to_event: form.relationship || null,
    })

    if (guest) {
      const drafts = companionDrafts.slice(0, companionCount)
      await Promise.all(
        drafts.map((c) =>
          createCompanion({ guest_id: guest.id, name: c.name.trim(), relationship: c.relationship }),
        ),
      )
      void loadAux()
    }

    setAdding(false)
    setShowAdd(false)
  }

  const detectDuplicates = (names: string[]): string[] => {
    const seen = new Set<string>()
    const dupes = new Set<string>()
    for (const n of names) {
      const key = n.toLowerCase()
      if (seen.has(key)) dupes.add(n)
      seen.add(key)
    }
    return [...dupes]
  }

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const names = bulkText.split('\n').map((s) => s.trim()).filter(Boolean)
    if (names.length === 0) return
    const dupes = detectDuplicates(names)
    if (dupes.length > 0) {
      setBulkConfirm(dupes)
      return
    }
    void doBulkAdd(names)
  }

  const doBulkAdd = async (names: string[]) => {
    setAdding(true)
    setFeedback(null)
    const { data, error: createError } = await createGuests(event.id, names)
    if (createError || !data) {
      setFeedback({ type: 'error', message: 'Não foi possível adicionar os convidados.' })
    } else {
      const failed = names.length - data.length
      setFeedback({
        type: 'success',
        message:
          failed > 0
            ? `${data.length} convidados adicionados. ${failed} não puderam ser adicionados.`
            : `${data.length} convidados adicionados com "Informações pendentes".`,
      })
      setBulkText('')
      setBulkConfirm(null)
      void loadAux()
    }
    setAdding(false)
  }

  /* ---------- Render ---------- */
  return (
    <div className="guest-section">
      <header className="guest-header">
        <div>
          <h1 className="guest-title">Convidados</h1>
          <p className="guest-subtitle">
            Organize sua lista, acompanhe confirmações e decidam juntos quem estará presente.
          </p>
        </div>
        <div className="guest-header-actions">
          <button type="button" className="btn-secondary" onClick={() => setShowExport(true)}>
            ⬇ Exportar
          </button>
          <button type="button" className="guest-add-btn" onClick={openAdd}>
            + Adicionar convidado
          </button>
        </div>
      </header>

      <div className="guest-indicators">
        <div className="guest-indicator">
          <span className="guest-indicator-value">{indicators.total}</span>
          <span className="guest-indicator-label">Convidados</span>
        </div>
        <div className="guest-indicator">
          <span className="guest-indicator-value is-accent">{totalSeats}</span>
          <span className="guest-indicator-label">Lugares no buffet</span>
        </div>
        <div className="guest-indicator">
          <span className="guest-indicator-value is-green">{indicators.confirmed}</span>
          <span className="guest-indicator-label">Confirmados</span>
        </div>
        <div className="guest-indicator">
          <span className="guest-indicator-value is-muted">{indicators.pending}</span>
          <span className="guest-indicator-label">Pendentes</span>
        </div>
        <div className="guest-indicator">
          <span className="guest-indicator-value is-red">{indicators.declined}</span>
          <span className="guest-indicator-label">Recusados</span>
        </div>
      </div>

      <div className="guest-macro-row">
        <button type="button" className={`guest-macro${macroFilter === 'all' ? ' is-active' : ''}`} onClick={() => setMacroFilter('all')}>Todos</button>
        <button type="button" className={`guest-macro${macroFilter === 'special' ? ' is-active' : ''}`} onClick={() => setMacroFilter('special')}>🌟 Papéis Especiais</button>
        <button type="button" className={`guest-macro${macroFilter === 'common' ? ' is-active' : ''}`} onClick={() => setMacroFilter('common')}>👥 Convidados Comuns</button>
      </div>

      <div className="guest-toolbar-row">
        <input
          className="form-control guest-search"
          type="search"
          placeholder="🔎 Buscar por nome"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="btn-secondary guest-filter-btn" onClick={() => { setDraftFilters(filters); setShowFilters(true) }}>
          ⚙ Filtrar{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
      </div>

      {error && (
        <p className="auth-error" role="alert" style={{ marginTop: '1rem' }}>
          ⚠ {error}
        </p>
      )}

      {loading ? (
        <div className="state-panel" style={{ minHeight: '200px' }}>
          <div className="state-spinner" role="status" aria-label="Carregando convidados" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="guest-empty">
          <p>Nenhum convidado encontrado.</p>
          <button type="button" className="btn-primary" onClick={openAdd}>
            + Adicionar convidado
          </button>
        </div>
      ) : (
        <ul className="guest-card-list">
          {filtered.map((guest) => {
            const comp = companionsByGuest.get(guest.id) ?? []
            const summary = voteSummary(guest.id)
            return (
              <li key={guest.id} className="guest-card-row" onClick={() => setSelectedGuest(guest)}>
                <div className="guest-card-row-left">
                  <div className="guest-card-row-title">
                    <span className="guest-card-name">{guest.name}</span>
                    {guest.priority && <span className="guest-card-stars">{stars(guest.priority)}</span>}
                  </div>
                  <div className="guest-card-context">
                    {guest.relationship_to_event && <span>{guest.relationship_to_event}</span>}
                    {guest.relationship_to_event && guest.invited_by && <span> · </span>}
                    {guest.invited_by && <span>Convidado de {invitedByLabel(event, guest.invited_by)}</span>}
                  </div>
                  <div className="guest-card-row-meta">
                    {comp.length > 0 && (
                      <span className="guest-card-chip">+{comp.length} acomp.</span>
                    )}

                    <span className={`guest-status guest-status-${guest.rsvp_status}`}>
                      {RSVP_LABEL[guest.rsvp_status]}
                    </span>
                    {hasPending(guest) && (
                      <span className="guest-pending-badge">Informações pendentes</span>
                    )}
                    {summary && <span className="guest-card-line">{summary}</span>}
                  </div>
                </div>

                <div className="guest-card-row-right">
                  <div className="guest-star-picker" onClick={(e) => e.stopPropagation()}>
                    {[1, 2, 3].map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={`guest-star-btn${(guest.priority ?? 0) >= level ? ' is-filled' : ''}`}
                        onClick={() => void prioritize(guest.id, level as GuestPriority)}
                        aria-label={`Prioridade ${level} estrela${level > 1 ? 's' : ''}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="guest-trash-btn"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(guest) }}
                    aria-label={`Excluir ${guest.name}`}
                    title={`Excluir ${guest.name}`}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* ===== Modal de Filtros ===== */}
      {showFilters && (
        <div className="drawer-overlay" onClick={() => setShowFilters(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h2 className="modal-title">Filtrar convidados</h2>
              <button type="button" className="modal-close" onClick={() => setShowFilters(false)} aria-label="Fechar">×</button>
            </header>
            <div className="modal-form">
              <div className="form-field">
                <label className="form-label" htmlFor="f-invited">Convidado de</label>
                <select id="f-invited" className="form-control" value={draftFilters.invited_by} onChange={(e) => setDraftFilters((f) => ({ ...f, invited_by: e.target.value }))}>
                  <option value="">Todos</option>
                  <option value="client_1">{clientLabel(event, 'client_1')}</option>
                  <option value="client_2">{clientLabel(event, 'client_2')}</option>
                  <option value="both">Ambos</option>
                  <option value="none">A definir</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="f-priority">Prioridade</label>
                <select id="f-priority" className="form-control" value={draftFilters.priority} onChange={(e) => setDraftFilters((f) => ({ ...f, priority: e.target.value }))}>
                  <option value="">Todas</option>
                  <option value="3">{PRIORITY_LABELS[3]}</option>
                  <option value="2">{PRIORITY_LABELS[2]}</option>
                  <option value="1">{PRIORITY_LABELS[1]}</option>
                  <option value="none">Sem classificação</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="f-group">Grupo</label>
                <select id="f-group" className="form-control" value={draftFilters.group_id} onChange={(e) => setDraftFilters((f) => ({ ...f, group_id: e.target.value }))}>
                  <option value="">Todos</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                  <option value="none">Sem grupo</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="f-rel">Relação com o evento</label>
                <select id="f-rel" className="form-control" value={draftFilters.relationship} onChange={(e) => setDraftFilters((f) => ({ ...f, relationship: e.target.value }))}>
                  <option value="">Todas</option>
                  {relationshipOptions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="none">Sem relação</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setDraftFilters(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); setShowFilters(false) }}>
                  Limpar
                </button>
                <button type="button" className="btn-primary" onClick={() => { setFilters(draftFilters); setShowFilters(false) }}>
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal de Exportação ===== */}
      {showExport && (
        <div className="drawer-overlay" onClick={() => setShowExport(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h2 className="modal-title">Exportar lista</h2>
              <button type="button" className="modal-close" onClick={() => setShowExport(false)} aria-label="Fechar">×</button>
            </header>
            <div className="modal-form">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={exportConfirmedOnly} onChange={(e) => setExportConfirmedOnly(e.target.checked)} />
                Apenas confirmados
              </label>
              <div className="form-field">
                <label className="form-label" htmlFor="export-sort">Ordenação</label>
                <select id="export-sort" className="form-control" value={exportSort} onChange={(e) => setExportSort(e.target.value as 'alpha' | 'group')}>
                  <option value="alpha">Alfabética</option>
                  <option value="group">Por grupo</option>
                </select>
              </div>
              <p className="modal-desc">
                {exportList.length} convidado{exportList.length !== 1 ? 's' : ''} · {totalSeats} lugares no buffet.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => void handleCopyExport()}>
                  {exportCopied ? '✓ Copiado!' : '📋 Copiar'}
                </button>
                <button type="button" className="btn-primary" onClick={handleDownloadExport}>
                  ⬇ Baixar .txt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal de Adição ===== */}
      {showAdd && (
        <div className="drawer-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h2 className="modal-title">Adicionar convidado</h2>
              <button type="button" className="modal-close" onClick={() => setShowAdd(false)} aria-label="Fechar">×</button>
            </header>

            <div className="guest-modal-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={addTab === 'single'} className={`guest-modal-tab${addTab === 'single' ? ' is-active' : ''}`} onClick={() => setAddTab('single')}>
                👤 Um convidado
              </button>
              <button type="button" role="tab" aria-selected={addTab === 'bulk'} className={`guest-modal-tab${addTab === 'bulk' ? ' is-active' : ''}`} onClick={() => setAddTab('bulk')}>
                👥 Vários convidados
              </button>
            </div>

            {addTab === 'single' ? (
              <form onSubmit={handleAddSingle} className="modal-form">
                <div className="form-field">
                  <label className="form-label" htmlFor="g-name">Nome completo *</label>
                  <input id="g-name" className="form-control" type="text" autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Maria Silva" required />
                </div>

                <div className="form-field">
                  <span className="form-label">Convidado de</span>
                  <div className="guest-invited-toggle" role="group" aria-label="Convidado de">
                    {(['client_1', 'client_2', 'both', ''] as const).map((val) => (
                      <button
                        key={val || 'none'}
                        type="button"
                        className={`guest-invited-option${form.invited_by === val ? ' is-active' : ''}`}
                        onClick={() => setForm((f) => ({ ...f, invited_by: val }))}
                      >
                        {val === '' ? 'A definir' : val === 'both' ? 'Ambos' : clientLabel(event, val)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="g-rel">Relação com o evento</label>
                  <select id="g-rel" className="form-control" value={form.relationship} onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}>
                    <option value="">Selecionar...</option>
                    {relationshipOptions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="g-group">Grupo</label>
                  <select id="g-group" className="form-control" value={form.group_id} onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}>
                    <option value="">Sem grupo</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="g-priority">Prioridade</label>
                  <select id="g-priority" className="form-control" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                    <option value="">A definir</option>
                    <option value="3">{PRIORITY_LABELS[3]}</option>
                    <option value="2">{PRIORITY_LABELS[2]}</option>
                    <option value="1">{PRIORITY_LABELS[1]}</option>
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="g-email">E-mail</label>
                  <input id="g-email" className="form-control" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Opcional" />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="g-phone">Telefone</label>
                  <input id="g-phone" className="form-control" type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Opcional" />
                </div>

                <div className="companion-stepper-block">
                  <span className="form-label">Acompanhantes</span>
                  <div className="companion-stepper">
                    <button type="button" className="stepper-arrow" aria-label="Aumentar acompanhantes" onClick={() => setCount(companionCount + 1)}>▲</button>
                    <input
                      className="stepper-value"
                      type="number"
                      min={0}
                      value={companionCount}
                      onChange={(e) => setCount(Number(e.target.value) || 0)}
                      aria-label="Quantidade de acompanhantes"
                    />
                    <button type="button" className="stepper-arrow" aria-label="Diminuir acompanhantes" onClick={() => setCount(companionCount - 1)}>▼</button>
                  </div>
                </div>

                {companionDrafts.slice(0, companionCount).map((c, i) => (
                  <div key={i} className="companion-draft">
                    <span className="companion-draft-title">Acompanhante {i + 1}</span>
                    <input className="form-control" type="text" value={c.name} onChange={(e) => changeCompanion(i, { name: e.target.value })} placeholder="Nome completo" />
                    <select className="form-control" value={c.relationship} onChange={(e) => changeCompanion(i, { relationship: e.target.value as CompanionRelationship })} aria-label={`Relação do acompanhante ${i + 1}`}>
                      {COMPANION_RELATIONSHIP_LIST.map((rel) => (
                        <option key={rel} value={rel}>{COMPANION_RELATIONSHIP_LABELS[rel]}</option>
                      ))}
                    </select>
                  </div>
                ))}

                {emptyCompanions > 0 && (
                  <p className="companion-pending-hint" role="status">
                    ⚠️ {emptyCompanions} acompanhante{emptyCompanions > 1 ? 's ainda precisam' : ' ainda precisa'} ser informado{emptyCompanions > 1 ? 's' : ''}.
                  </p>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={adding || !form.name.trim()}>{adding ? 'Adicionando...' : 'Adicionar'}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBulkSubmit} className="modal-form">
                <p className="modal-desc">
                  Cole ou digite um nome por linha. Os registros são criados rapidamente com o status de
                  <strong> "Informações pendentes"</strong> para completar depois.
                </p>
                <textarea className="form-control" rows={6} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder={'Maria Silva\nJoão Souza\nAna Oliveira\nCarlos Santos'} />

                {bulkConfirm && (
                  <div className="bulk-dupe-warning" role="alert">
                    <p>Encontramos nomes duplicados:</p>
                    <ul>{bulkConfirm.map((d) => <li key={d}>{d}</li>)}</ul>
                    <p>Deseja continuar?</p>
                    <div className="modal-actions">
                      <button type="button" className="btn-secondary" onClick={() => setBulkConfirm(null)}>Cancelar</button>
                      <button type="button" className="btn-primary" onClick={() => { const names = bulkText.split('\n').map(s => s.trim()).filter(Boolean); setBulkConfirm(null); void doBulkAdd(names) }}>Continuar</button>
                    </div>
                  </div>
                )}

                {feedback && (
                  <p className={feedback.type === 'success' ? 'auth-success' : 'auth-error'} role="status">
                    {feedback.message}
                  </p>
                )}

                {!bulkConfirm && (
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
                    <button type="submit" className="btn-primary" disabled={adding || !bulkText.trim()}>{adding ? 'Adicionando convidados...' : 'Adicionar convidados'}</button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* ===== Confirmação de exclusão ===== */}
      {deleteConfirm && (
        <div className="drawer-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-dialog-title">Excluir convidado?</h3>
            <p className="confirm-dialog-text">
              Deseja excluir <strong>{deleteConfirm.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="confirm-dialog-actions">
              <button type="button" className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => { void removeGuest(deleteConfirm.id); setDeleteConfirm(null) }}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedGuest && (
        <GuestDetail
          event={event}
          guest={selectedGuest}
          canVote={permissions.can_vote}
          canComment={permissions.can_comment}
          onClose={() => setSelectedGuest(null)}
          onGroupChange={(id, groupId) => void updateGuest(id, { group_id: groupId || null })}
          groups={groups}
          onCreateGroup={addGroup}
          onDelete={() => { setDeleteConfirm(selectedGuest); setSelectedGuest(null) }}
        />
      )}
    </div>
  )
}
