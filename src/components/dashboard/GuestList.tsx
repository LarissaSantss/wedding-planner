import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Event, Guest, GuestPriority, CompanionRelationship, GuestRoleAssignment } from '../../lib/supabase/types'
import { useGuestModule } from '../../hooks/useGuestModule'
import { GuestDetail } from './GuestDetail'
import { COMPANION_RELATIONSHIP_LABELS, COMPANION_RELATIONSHIP_LIST } from '../../utils/eventFormat'
import { createCompanion, createGuests, fetchGuestRoleAssignments } from '../../lib/supabase/database'

interface GuestListProps {
  event: Event
}

const PRIORITY_OPTIONS: Array<{ value: GuestPriority; label: string }> = [
  { value: 1, label: '⭐' },
  { value: 2, label: '⭐⭐' },
  { value: 3, label: '⭐⭐⭐' },
]

interface CompanionDraft {
  name: string
  relationship: CompanionRelationship
}

function invitedByLabel(event: Event, value: Guest['invited_by']): string {
  const a = event.client_name_1 ?? 'Noiva'
  const b = event.client_name_2 ?? 'Noivo'
  if (value === 'client_1') return a
  if (value === 'client_2') return b
  if (value === 'both') return `${a} & ${b}`
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
  const [filter, setFilter] = useState<string>('all')
  const [macroFilter, setMacroFilter] = useState<'all' | 'special' | 'common'>('all')
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Guest | null>(null)
  const [assignments, setAssignments] = useState<GuestRoleAssignment[]>([])

  // Modal
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
  })
  const [companionCount, setCompanionCount] = useState(0)
  const [companions, setCompanions] = useState<CompanionDraft[]>([])

  // Bulk form
  const [bulkText, setBulkText] = useState('')
  const [bulkConfirm, setBulkConfirm] = useState<string[] | null>(null)

  const loadAssignments = useCallback(async () => {
    const { data } = await fetchGuestRoleAssignments(event.id)
    setAssignments(data ?? [])
  }, [event.id])

  useEffect(() => {
    void loadAssignments()
  }, [loadAssignments])

  const indicators = useMemo(() => {
    const total = guests.length
    const confirmed = guests.filter((g) => g.rsvp_status === 'confirmed').length
    const pending = guests.filter((g) => g.rsvp_status === 'pending').length
    const declined = guests.filter((g) => g.rsvp_status === 'declined').length
    const triple = guests.filter((g) => g.priority === 3).length
    const unclassified = guests.filter((g) => g.priority === null).length
    return { total, confirmed, pending, declined, triple, unclassified }
  }, [guests])

  const filtered = useMemo(() => {
    return guests.filter((g) => {
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false

      // Filtro macro: participantes com papéis especiais vs comuns
      if (macroFilter === 'special' && !assignments.some((a) => a.guest_id === g.id)) return false
      if (macroFilter === 'common' && assignments.some((a) => a.guest_id === g.id)) return false

      if (filter === 'all') return true
      if (filter === 'none') return g.priority === null
      if (filter === '1') return g.priority === 1
      if (filter === '2') return g.priority === 2
      if (filter === '3') return g.priority === 3
      if (filter === 'client_1') return g.invited_by === 'client_1'
      if (filter === 'client_2') return g.invited_by === 'client_2'
      if (filter === 'both') return g.invited_by === 'both'
      return true
    })
  }, [guests, search, filter, macroFilter, assignments])

  const openAdd = () => {
    setForm({ name: '', email: '', phone: '', priority: '', invited_by: '' })
    setCompanionCount(0)
    setCompanions([])
    setBulkText('')
    setBulkConfirm(null)
    setFeedback(null)
    setAddTab('single')
    setShowAdd(true)
  }

  const setCount = (next: number) => {
    const n = Math.max(0, Math.floor(next))
    setCompanionCount(n)
    setCompanions((prev) => {
      const arr = [...prev]
      if (n > arr.length) {
        for (let i = arr.length; i < n; i++) {
          arr.push({ name: '', relationship: 'other' })
        }
      } else if (n < arr.length) {
        // Não remove silenciosamente se houver dados (tratado no submit/arrow)
        arr.length = n
      }
      return arr
    })
  }

  const changeCompanion = (index: number, patch: Partial<CompanionDraft>) => {
    setCompanions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

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
      group_id: null,
      notes: null,
      priority,
      invited_by:
        form.invited_by === 'client_1' ||
        form.invited_by === 'client_2' ||
        form.invited_by === 'both'
          ? form.invited_by
          : null,
    })

    // Persiste acompanhantes preenchidos (e vazios como pendentes) no Supabase.
    if (guest) {
      const drafts = companions.slice(0, companionCount)
      await Promise.all(
        drafts.map((c) =>
          createCompanion({
            guest_id: guest.id,
            name: c.name.trim(),
            relationship: c.relationship,
          }),
        ),
      )
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
    const names = bulkText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)

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
            : `${data.length} convidados adicionados.`,
      })
      setBulkText('')
      setBulkConfirm(null)
    }
    setAdding(false)
  }

  return (
    <div className="guest-section">
      <header className="guest-header">
        <div>
          <h1 className="guest-title">Convidados</h1>
          <p className="guest-subtitle">
            Organize sua lista, acompanhe confirmações e decidam juntos quem estará presente.
          </p>
        </div>
        <button type="button" className="guest-add-btn" onClick={openAdd}>
          + Adicionar convidado
        </button>
      </header>

      <div className="guest-indicators">
        <div className="guest-indicator">
          <span className="guest-indicator-value">{indicators.total}</span>
          <span className="guest-indicator-label">Total</span>
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
        <div className="guest-indicator">
          <span className="guest-indicator-value is-accent">{indicators.triple}</span>
          <span className="guest-indicator-label">⭐⭐⭐</span>
        </div>
        <div className="guest-indicator">
          <span className="guest-indicator-value is-muted">{indicators.unclassified}</span>
          <span className="guest-indicator-label">Sem classificação</span>
        </div>
      </div>

      <div className="guest-macro-row">
        <button type="button" className={`guest-macro${macroFilter === 'all' ? ' is-active' : ''}`} onClick={() => setMacroFilter('all')}>Todos</button>
        <button type="button" className={`guest-macro${macroFilter === 'special' ? ' is-active' : ''}`} onClick={() => setMacroFilter('special')}>🌟 Participantes / Papéis Especiais</button>
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
        <div className="guest-filters">
          <button type="button" className={`guest-pill${filter === 'all' ? ' is-active' : ''}`} onClick={() => setFilter('all')}>Todos</button>
          <button type="button" className={`guest-pill${filter === 'client_1' ? ' is-active' : ''}`} onClick={() => setFilter('client_1')}>{event.client_name_1 ?? 'Noiva'}</button>
          <button type="button" className={`guest-pill${filter === 'client_2' ? ' is-active' : ''}`} onClick={() => setFilter('client_2')}>{event.client_name_2 ?? 'Noivo'}</button>
          <button type="button" className={`guest-pill${filter === 'both' ? ' is-active' : ''}`} onClick={() => setFilter('both')}>Ambos</button>
          <button type="button" className={`guest-pill${filter === 'none' ? ' is-active' : ''}`} onClick={() => setFilter('none')}>Sem classificação</button>
          <button type="button" className={`guest-pill${filter === '3' ? ' is-active' : ''}`} onClick={() => setFilter('3')}>⭐⭐⭐</button>
          <button type="button" className={`guest-pill${filter === '2' ? ' is-active' : ''}`} onClick={() => setFilter('2')}>⭐⭐</button>
          <button type="button" className={`guest-pill${filter === '1' ? ' is-active' : ''}`} onClick={() => setFilter('1')}>⭐</button>
        </div>
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
          {filtered.map((guest) => (
            <li key={guest.id} className="guest-card-row" onClick={() => setSelectedGuest(guest)}>
              <div className="guest-card-row-left">
                <div className="guest-card-row-title">
                  <span className="guest-card-name">{guest.name}</span>
                  <span className="guest-card-author">
                    Adicionado por {guest.invited_by ? invitedByLabel(event, guest.invited_by) : 'organizador'}
                    {guest.relationship_to_event ? ` · ${guest.relationship_to_event}` : ''}
                  </span>
                </div>
                <div className="guest-card-row-meta">
                  {guest.group_id && (
                    <span className="guest-card-chip">
                      {groups.find((g) => g.id === guest.group_id)?.name ?? 'Grupo'}
                    </span>
                  )}
                  {guest.phone && <span className="guest-card-line">{guest.phone}</span>}
                  {guest.email && <span className="guest-card-line">{guest.email}</span>}
                  {hasPending(guest) && (
                    <span className="guest-pending-badge">Informações pendentes</span>
                  )}
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
          ))}
        </ul>
      )}

      {showAdd && (
        <div className="drawer-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h2 className="modal-title">Adicionar convidado</h2>
              <button type="button" className="modal-close" onClick={() => setShowAdd(false)} aria-label="Fechar">×</button>
            </header>

            <div className="guest-modal-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={addTab === 'single'} className={`guest-modal-tab${addTab === 'single' ? ' is-active' : ''}`} onClick={() => setAddTab('single')}>
                Individual
              </button>
              <button type="button" role="tab" aria-selected={addTab === 'bulk'} className={`guest-modal-tab${addTab === 'bulk' ? ' is-active' : ''}`} onClick={() => setAddTab('bulk')}>
                + Adicionar vários convidados
              </button>
            </div>

            {addTab === 'single' ? (
              <form onSubmit={handleAddSingle} className="modal-form">
                <div className="form-field">
                  <label className="form-label" htmlFor="g-name">Nome completo *</label>
                  <input id="g-name" className="form-control" type="text" autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Maria Silva" required />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="g-email">E-mail</label>
                  <input id="g-email" className="form-control" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Opcional" />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="g-phone">Telefone</label>
                  <input id="g-phone" className="form-control" type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Opcional" />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="g-priority">Prioridade</label>
                  <select id="g-priority" className="form-control" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                    <option value="">A definir</option>
                    {PRIORITY_OPTIONS.map((p) => (
                      <option key={p.value} value={String(p.value)}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="g-invited">Convidado de</label>
                  <select id="g-invited" className="form-control" value={form.invited_by} onChange={(e) => setForm((f) => ({ ...f, invited_by: e.target.value }))}>
                    <option value="">Ainda não definido</option>
                    <option value="client_1">{event.client_name_1 ?? 'Noiva'}</option>
                    <option value="client_2">{event.client_name_2 ?? 'Noivo'}</option>
                    <option value="both">Ambos</option>
                  </select>
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

                {companions.map((c, i) => (
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

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={adding || !form.name.trim()}>{adding ? 'Adicionando...' : 'Adicionar'}</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBulkSubmit} className="modal-form">
                <p className="modal-desc">Cole ou digite um nome por linha. Apenas o nome é obrigatório.</p>
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
