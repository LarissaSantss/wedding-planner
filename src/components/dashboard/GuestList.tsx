import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Event } from '../../lib/supabase/types'

import { useGuestModule } from '../../hooks/useGuestModule'
import { GuestDetail } from './GuestDetail'

interface GuestListProps {
  event: Event
}

export function GuestList({ event }: GuestListProps) {
  const {
    guests,
    groups,
    roles,
    roleAssignments,
    loading,
    error,
    permissions,
    addGuest,
    updateGuest,
    addGroup,
    removeGroup,
    prioritize,
  } = useGuestModule(event.id)

  const [search, setSearch] = useState('')
  const [macroFilter, setMacroFilter] = useState<'all' | 'special' | 'common'>('all')
  const [selectedGuest, setSelectedGuest] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [draftFilters, setDraftFilters] = useState({
    invited_by: '',
    priority: '',
    group_id: '',
    relationship: '',
    role: '',
  })
  const [filters, setFilters] = useState({
    invited_by: '',
    priority: '',
    group_id: '',
    relationship: '',
    role: '',
  })

  const [showExport, setShowExport] = useState(false)
  const [exportConfirmedOnly, setExportConfirmedOnly] = useState(false)
  const [exportSort, setExportSort] = useState<'alpha' | 'group'>('alpha')
  const [exportCopied, setExportCopied] = useState(false)

  const [showAdd, setShowAdd] = useState(false)
  const [addTab, setAddTab] = useState<'single' | 'bulk'>('single')
  const [adding, setAdding] = useState(false)
  const [feedback, setFeedback] = useState(null)

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
  const [companionDrafts, setCompanionDrafts] = useState<{name: string, relationship: string}[]>([])

  const loadAux = useCallback(async () => {
    await Promise.all([
      fetchGuestRoleAssignments(event.id),
      fetchCompanionsByEvent(event.id),
      fetchVotesByEvent(event.id),
      fetchEventMembers(event.id),
    ])
  }, [event.id])

  useEffect(() => {
    void loadAux()
  }, [loadAux])

  const indicators = useMemo(() => {
    const total = guests.length
    const confirmed = guests.filter((g) => g.rsvp_status === 'confirmed').length
    const pending = guests.filter((g) => g.rsvp_status === 'pending').length
    const declined = guests.filter((g) => g.rsvp_status === 'declined').length
    const pendingInfo = guests.filter((g) => !g.email || !g.phone || !g.relationship_to_event).length
    const rolesAssigned = roleAssignments.length
    return { total, confirmed, pending, declined, pendingInfo, rolesAssigned }
  }, [guests, roleAssignments])

  const activeFilterCount =
    (filters.invited_by ? 1 : 0) +
    (filters.priority ? 1 : 0) +
    (filters.group_id ? 1 : 0) +
    (filters.relationship ? 1 : 0) +
    (filters.role ? 1 : 0)

  const filtered = useMemo(() => {
    return guests.filter((g) => {
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false
      if (macroFilter === 'special' && !roleAssignments.some((a) => a.guest_id === g.id)) return false
      if (macroFilter === 'common' && roleAssignments.some((a) => a.guest_id === g.id)) return false
      if (filters.invited_by && g.invited_by !== filters.invited_by) return false
      if (filters.priority && (filters.priority === 'none' ? g.priority !== null : g.priority !== Number(filters.priority))) return false
      if (filters.group_id && (filters.group_id === 'none' ? g.group_id !== null : g.group_id !== filters.group_id)) return false
      if (filters.relationship && g.relationship_to_event !== filters.relationship) return false
      if (filters.role) {
        const guestRoleIds = roleAssignments.filter((a) => a.guest_id === g.id).map((a) => a.role_id)
        if (!guestRoleIds.includes(filters.role)) return false
      }
      return true
    })
  }, [guests, search, macroFilter, filters, roleAssignments])

  const exportList = useMemo(() => {
    let list = [...filtered]
    if (exportConfirmedOnly) list = list.filter((g) => g.rsvp_status === 'confirmed')
    if (exportSort === 'alpha') list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    else {
      const groupName = (id) => groups.find((g) => g.id === id)?.name ?? 'zzz'
      list.sort((a, b) => {
        const g1 = groupName(a.group_id), g2 = groupName(b.group_id)
        return g1.localeCompare(g2, 'pt-BR') || a.name.localeCompare(b.name, 'pt-BR')
      })
    }
    return list
  }, [filtered, exportConfirmedOnly, exportSort, groups])

  const RSVP_LABEL: Record<string, string> = { confirmed: 'Confirmado', pending: 'Pendente', declined: 'Recusado' }

  const exportText = useMemo(() => {
    const lines = exportList.map((g) => {
      const parts = [g.name]
      if (g.relationship_to_event) parts.push(`(${g.relationship_to_event})`)
      parts.push(`[${RSVP_LABEL[g.rsvp_status]}]`)
      return parts.join(' ')
    })
    const header = `Lista de convidados — ${event.title}\nTotal: ${exportList.length} convidados · ${guests.length} lugares\n`
    return header + '\n' + lines.join('\n')
  }, [exportList, guests.length, event.title])

  const handleCopyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportText)
      setExportCopied(true)
      setTimeout(() => setExportCopied(false), 2000)
    } catch /* clipboard indisponível */ {}
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

  const openAdd = () => {
    setForm({ name: '', email: '', phone: '', priority: '', invited_by: '', relationship: '', group_id: '' })
    setCompanionCount(0)
    setCompanionDrafts([])
    setShowAdd(true)
  }

  const setCount = (next: number) => {
    const n = Math.max(0, Math.floor(next))
    setCompanionCount(n)
    setCompanionDrafts((prev) => {
      const arr = [...prev]
      if (n > arr.length) for (let i = arr.length; i < n; i++) arr.push({ name: '', relationship: 'other' })
      else if (n < arr.length) arr.length = n
      return arr
    })
  }

  const changeCompanion = (index: number, patch: Partial<{name: string, relationship: string}>) => {
    setCompanionDrafts((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  const emptyCompanions = companionDrafts.slice(0, companionCount).filter((c) => !c.name.trim()).length

  const handleAddSingle = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setAdding(true)
    setFeedback(null)
    const priority = form.priority === '1' || form.priority === '2' || form.priority === '3' ? Number(form.priority) : null
    const guest = await addGuest({
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      group_id: form.group_id || null,
      notes: null,
      priority,
      invited_by: form.invited_by === 'client_1' || form.invited_by === 'client_2' || form.invited_by === 'both' ? form.invited_by : null,
      relationship_to_event: form.relationship || null,
    })
    if (guest) {
      const drafts = companionDrafts.slice(0, companionCount)
      await Promise.all(drafts.map((c) => createCompanion({ guest_id: guest.id, name: c.name.trim(), relationship: c.relationship })))
    }
    setAdding(false)
    setShowAdd(false)
  }

  const detectDuplicates = (names: string[]): string[] => {
    const seen = new Set<string>(), dupes = new Set<string>()
    for (const n of names) { const key = n.toLowerCase(); if (seen.has(key)) dupes.add(n); seen.add(key) }
    return [...dupes]
  }

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const names = bulkText.split('\n').map((s) => s.trim()).filter(Boolean)
    if (names.length === 0) return
    const dupes = detectDuplicates(names)
    if (dupes.length > 0) { setBulkConfirm(dupes); return }
    void doBulkAdd(names)
  }

  const doBulkAdd = async (names: string[]) => {
    setAdding(true)
    setFeedback(null)
    const { data, error: createError } = await createGuests(event.id, names)
    if (createError || !data) { setFeedback({ type: 'error', message: 'Não foi possível adicionar.' }) }
    else {
      const failed = names.length - data.length
      setFeedback({ type: 'success', message: `${data.length} adicionados. ${failed} com informações pendentes.` })
      setBulkText(''); setBulkConfirm(null)
    }
    setAdding(false)
  }

  /* ---------- Render ---------- */
  return (
    <div className="guest-section">
      <header className="guest-header">
        <div>
          <h1 className="guest-title">Convidados</h1>
          <p className="guest-subtitle">Organize sua lista e decidam juntos quem estará presente.</p>
        </div>
        <div className="guest-header-actions">
          <button className="btn-secondary" onClick={() => setShowExport(true)}>⬇ Exportar</button>
          <button className="guest-add-btn" onClick={openAdd}>+ Adicionar convidado</button>
        </div>
      </header>

      <div className="guest-indicators">
        <div className="guest-indicator"><span className="is-accent">{indicators.total}</span><span>Convidados</span></div>
        <div className="guest-indicator"><span className="is-green">{indicators.confirmed}</span><span>Confirmados</span></div>
        <div className="guest-indicator"><span className="is-muted">{indicators.pending}</span><span>Pendentes</span></div>
        <div className="guest-indicator"><span className="is-red">{indicators.declined}</span><span>Recusados</span></div>
        <div className="guest-indicator"><span>{indicators.totalCompanions || 0}</span><span>Acompanhantes</span></div>
        <div className="guest-indicator"><span>{indicators.totalPeople || 0}</span><span>Pessoas no evento</span></div>
        <div className="guest-indicator"><span className="is-warning">{indicators.pendingInfo}</span><span>Informações pendentes</span></div>
        <div className="guest-indicator"><span>{indicators.rolesAssigned}</span><span>Papéis especiais</span></div>
      </div>

      <div className="guest-macro-row">
        <button className={`mac${macroFilter === 'all' ? ' is-active' : ''}`} onClick={() => setMacroFilter('all')}>Todos</button>
        <button className={`mac${macroFilter === 'special' ? ' is-active' : ''}`} onClick={() => setMacroFilter('special')}>🌟 Papéis Especiais</button>
        <button className={`mac${macroFilter === 'common' ? ' is-active' : ''}`} onClick={() => setMacroFilter('common')}>👥 Convidados Comuns</button>
      </div>

      <div className="guest-toolbar-row">
        <input
          className="form-control guest-search"
          type="search"
          placeholder="🔎 Buscar por nome"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-control" value={filters.invited_by} onChange={(e) => setDraftFilters((f) => ({ ...f, invited_by: e.target.value }))}>
          <option value="">Todos</option>
          <option value="client_1">Noiva</option>
          <option value="client_2">Noivo</option>
          <option value="both">Ambos</option>
          <option value="none">A definir</option>
        </select>
        <select className="form-control" value={filters.priority} onChange={(e) => setDraftFilters((f) => ({ ...f, priority: e.target.value }))}>
          <option value="">Todas</option>
          <option value="3">3 estrelas</option>
          <option value="2">2 estrelas</option>
          <option value="1">1 estrela</option>
          <option value="none">Sem classificação</option>
        </select>
        <select className="form-control" value={filters.group_id} onChange={(e) => setDraftFilters((f) => ({ ...f, group_id: e.target.value }))}>
          <option value="">Todos</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          <option value="none">Sem grupo</option>
        </select>
        <select className="form-control" value={filters.relationship} onChange={(e) => setDraftFilters((f) => ({ ...f, relationship: e.target.value }))}>
          <option value="">Todas</option>
          {['Amigo', 'Família', 'Trabalho', 'Outro'].map((r) => <option key={r} value={r}>{r}</option>)}
          <option value="none">Sem relação</option>
        </select>
        {roles.length > 0 && (
          <select className="form-control" value={filters.role ?? ''} onChange={(e) => setDraftFilters((f) => ({ ...f, role: e.target.value }))}>
            <option value="">Todos os papéis</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
      </div>

      {error && <p className="auth-error" role="alert" style={{ marginTop: '1rem' }} ⚠ {error}</p>}

      {loading ? (
        <div className="state-panel" style={{ minHeight: '200px' }}><span role="status" aria-label="Carregando convidados" /></div>
      ) : filtered.length === 0 ? (
        <div className="guest-empty"><p>Nenhum convidado encontrado.</p><button className="btn-primary" onClick={openAdd}>+ Adicionar convidado</button></div>
      ) : (
        <ul className="guest-card-list">
          {filtered.map((guest) => {
            const missing = [
              !guest.email && 'E-mail',
              !guest.phone && 'Telefone',
              !guest.relationship_to_event && 'Relação',
              !guest.group_id && 'Grupo',
              !guest.invited_by && 'Convidado de',
            ].filter(Boolean)
            const completion = guest?.priority !== null ? Math.round((guest.priority / 3) * 100) : 0

            return (
              <li key={guest.id} className="guest-card-row" onClick={() => setSelectedGuest(guest)}>
                <div className="guest-card-row-left">
                  <div className="guest-card-row-title">
                    <span className="guest-card-name">{guest.name}</span>
                    {guest.priority && <span className="guest-card-stars">{'⭐'.repeat(guest.priority)}</span>}
                  </div>
                  <div className="guest-card-context">
                    {suggestedGroup && (
                      <span className="guest-suggestion">
                        ✨ Sugestão: parece pertencer ao grupo <span className="guest-suggestion-group">{suggestedGroup}</span>.<br />
                        <button className="guest-suggestion-apply">[Aplicar]</button>
                      </span>
                    )}
                    {guest.relationship_to_event && <span>{guest.relationship_to_event}</span>}
                    {guest.relationship_to_event && guest.invited_by && <span> · </span>}
                    {guest.invited_by && <span>Convidado de {guest.invited_by}</span>}
                  </div>
                  <div className="guest-card-row-meta">
                    {missing.length > 0 && <span className="guest-missing-indicator">⚠ {missing.length} campo(s) pendente(s)</span>}
                    {completion < 100 && <span>Conforto: {completion}%</span>}
                  </div>
                </div>

                <div className="guest-card-row-right">
                  <div className="guest-star-picker" onClick={(e) => e.stopPropagation()}>
                    {[1, 2, 3].map((level) => (
                      <button key={level} type="button" className={`guest-star-btn${(guest.priority ?? 0) >= level ? ' is-filled' : ''}`} onClick={() => void prioritize(guest.id, level as any)} aria-label={`Prioridade ${level} estrela${level > 1 ? 's' : ''}`}>
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
                  <div className="guest-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="guest-action-btn" aria-label="Editar">✏️</button>
                    <button className="guest-action-btn" aria-label="Adicionar papel">🎭</button>
                    <button className="guest-action-btn" aria-label="Ver acompanhantes">👥</button>
                    <button
                      className="guest-action-btn"
                      onClick={() => {
                        const newStatus = guest.rsvp_status === 'confirmed' ? 'pending' : guest.rsvp_status === 'pending' ? 'declined' : 'confirmed'
                        updateGuest(guest.id, { rsvp_status: newStatus })
                      }}
                      aria-label="Alterar confirmação"
                    >
                      ✓
                    </button>
                    <button
                      className="guest-action-btn guest-action-btn-danger"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(guest) }}
                      aria-label={`Excluir ${guest.name}`}
                      title={`Excluir ${guest.name}`}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {showFilters && (
        <div className="drawer-overlay" onClick={() => setShowFilters(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head"><h2>Filtrar convidados</h2><button className="modal-close" onClick={() => setShowFilters(false)} aria-label="Fechar">×</button></header>
            <div className="modal-form">
              <div className="form-field"><label>Convidado de</label><select className="form-control" value={draftFilters.invited_by} onChange={(e) => setDraftFilters((f) => ({ ...f, invited_by: e.target.value }))}><option value="">Todos</option><option value="client_1">Noiva</option><option value="client_2">Noivo</option><option value="both">Ambos</option><option value="none">A definir</option></select></div>
              <div className="form-field"><label>Prioridade</label><select className="form-control" value={draftFilters.priority} onChange={(e) => setDraftFilters((f) => ({ ...f, priority: e.target.value }))}><option value="">Todas</option><option value="3">3 estrelas</option><option value="2">2 estrelas</option><option value="1">1 estrela</option><option value="none">Sem classificação</option></select></div>
              <div className="form-field"><label>Grupo</label><select className="form-control" value={draftFilters.group_id} onChange={(e) => setDraftFilters((f) => ({ ...f, group_id: e.target.value }))}><option value="">Todos</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}<option value="none">Sem grupo</option></select></div>
              <div className="form-field"><label>Relação com o evento</label><select className="form-control" value={draftFilters.relationship} onChange={(e) => setDraftFilters((f) => ({ ...f, relationship: e.target.value }))}><option value="">Todas</option>{['Amigo', 'Família', 'Trabalho', 'Outro'].map((r) => <option key={r} value={r}>{r}</option>)}<option value="none">Sem relação</option></select></div>
              {roles.length > 0 && (
                <div className="form-field"><label>Papel especial</label><select className="form-control" value={draftFilters.role ?? ''} onChange={(e) => setDraftFilters((f) => ({ ...f, role: e.target.value }))}><option value="">Todos os papéis</option>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
              )}
              <div className="modal-actions"><button className="btn-secondary" onClick={() => { setDraftFilters({ invited_by: '', priority: '', group_id: '', relationship: '', role: '' }); setFilters({ invited_by: '', priority: '', group_id: '', relationship: '', role: '' }); setShowFilters(false) }}>Limpar</button><button className="btn-primary" onClick={() => { setFilters(draftFilters); setShowFilters(false) }}>Aplicar</button></div>
            </div>
          </div>
        </div>
      )}

      {showExport && (
        <div className="drawer-overlay" onClick={() => setShowExport(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head"><h2>Exportar lista</h2><button className="modal-close" onClick={() => setShowExport(false)} aria-label="Fechar">×</button></header>
            <div className="modal-form">
              <label><input type="checkbox" checked={exportConfirmedOnly} onChange={(e) => setExportConfirmedOnly(e.target.checked)} /> Apenas confirmados</label>
              <div><label>Ordenação</label><select value={exportSort} onChange={(e) => setExportSort(e.target.value as 'alpha' | 'group')}><option value="alpha">Alfabética</option><option value="group">Por grupo</option></select></div>
              <p className="modal-desc">{exportList.length} convidado(s) · {guests.length} lugares no buffet.</p>
              <div className="modal-actions"><button className="btn-secondary" onClick={() => void handleCopyExport()}>{exportCopied ? '✓ Copiado!' : '📋 Copiar'}</button><button className="btn-primary" onClick={handleDownloadExport}>⬇ Baixar .txt</button></div>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="drawer-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head"><h2>Adicionar convidado</h2><button className="modal-close" onClick={() => setShowAdd(false)} aria-label="Fechar">×</button></header>
            <div className="guest-modal-tabs" role="tablist">
              <button className={`modal-tab${addTab === 'single' ? ' is-active' : ''}" role="tab" onClick={() => setAddTab('single')}>👤 Um convidado</button>
              <button className={`modal-tab${addTab === 'bulk' ? ' is-active' : ''}" role="tab" onClick={() => setAddTab('bulk')}>👥 Vários convidados</button>
            </div>
            {addTab === 'single' ? (
              <form onSubmit={handleAddSingle} className="modal-form">
                <div><label>Nome completo *</label><input className="form-control" type="text" autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Maria Silva" required /></div>
                <div><span>Convidado de</span><div className="guest-invited-toggle" role="group" aria-label="Convidado de">{['client_1', 'client_2', 'both', ''].map((val) => (
                  <button key={val || 'none'} type="button" className={`guest-invited-option${form.invited_by === val ? ' is-active' : ''}`} onClick={() => setForm((f) => ({ ...f, invited_by: val }))}>
                    {val === '' ? 'A definir' : val === 'both' ? 'Ambos' : 'Noiva/Noivo'}
                  </button>
                ))}</div>
                <div><label>Relação com o evento</label><select value={form.relationship} onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}>{['Amigo', 'Família', 'Trabalho', 'Outro'].map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><label>Grupo</label><select value={form.group_id} onChange={(e) => setForm((f) => ({ ...f, group_id: e.target.value }))}>{groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
                <div><label>Prioridade</label><select className="form-control" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}><option value="">A definir</option><option value="3">3 estrelas</option><option value="2">2 estrelas</option><option value="1">1 estrela</option></select></div>
                <div><label>E-mail</label><input className="form-control" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Opcional" /></div>
                <div><label>Telefone</label><input className="form-control" type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Opcional" /></div>
                <div><span>Acompanhantes</span><div className="companion-stepper"><button className="stepper-arrow" aria-label="Aumentar" onClick={() => setCount(companionCount + 1)}>▲</button><input className="stepper-value" type="number" min={0} value={companionCount} onChange={(e) => setCount(Number(e.target.value) || 0)} aria-label="Quantidade de acompanhantes" /><button className="stepper-arrow" aria-label="Diminuir" onClick={() => setCount(companionCount - 1)}>▼</button></div></div>
                {companionDrafts.slice(0, companionCount).map((c, i) => (
                  <div key={i} className="companion-draft"><span>Acompanhante {i + 1}</span><input className="form-control" type="text" value={c.name} onChange={(e) => changeCompanion(i, { name: e.target.value })} placeholder="Nome completo" /><select className="form-control" value={c.relationship} onChange={(e) => changeCompanion(i, { relationship: e.target.value })} aria-label="Relação do acompanhante {i + 1}">{['Amigo', 'Família', 'Trabalho', 'Outro'].map((rel) => <option key={rel} value={rel}>{['Amigo', 'Família', 'Trabalho', 'Outro'][['Amigo', 'Família', 'Trabalho', 'Outro'].indexOf(rel)]}</option>)}</select></div>
                ))}
                {emptyCompanions > 0 && <p className="companion-pending-hint">⚠ {emptyCompanions} acompanhante(s) ainda precisam ser informado(s).</p>}
                <div className="modal-actions"><button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button><button className="btn-primary" disabled={adding || !form.name.trim()}>{adding ? 'Adicionando...' : 'Adicionar'}</button></div>
              </form>
            ) : (
              <form onSubmit={handleBulkSubmit} className="modal-form"><p className="modal-desc">Cole ou digite um nome por linha. Criados rapidamente com status "Informações pendentes".</p><textarea className="form-control" rows={6} value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Maria Silva\nJoão Souza\nAna Oliveira\nCarlos Santos" /></p>{bulkConfirm && (
                <div className="bulk-dupe-warning" role="alert"><p>Nomes duplicados:</p><ul>{bulkConfirm.map((d) => <li key={d}>{d}</li>)}</ul><p>Deseja continuar?</p><div className="modal-actions"><button className="btn-secondary" onClick={() => setBulkConfirm(null)}>Cancelar</button><button className="btn-primary" onClick={() => { const names = bulkText.split('\\n').map(s => s.trim()).filter(Boolean); setBulkConfirm(null); void doBulkAdd(names) }}>Continuar</button></div></div>
              )}{feedback && <p className={feedback.type === 'success' ? 'auth-success' : 'auth-error'} role="status">{feedback.message}</p>}{!bulkConfirm && (
                <div className="modal-actions"><button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancelar</button><button className="btn-primary" disabled={adding || !bulkText.trim()}>{adding ? 'Adicionando convidados...' : 'Adicionar convidados'} </button></div>
              )}</form>
            )}
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="drawer-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Excluir convidado?</h3><p>Deseja excluir <strong>{deleteConfirm.name}</strong>? Esta ação não pode ser desfeita.</p>
            <div className="confirm-dialog-actions"><button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button><button className="btn-primary" onClick={() => { void removeGuest(deleteConfirm.id); setDeleteConfirm(null) }}>Excluir</button></div>
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