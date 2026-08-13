import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Event, Guest, GuestPriority } from '../../lib/supabase/types'
import { getThemeStyle } from '../../utils/theme'
import { useGuestModule } from '../../hooks/useGuestModule'
import { GuestDetail } from './GuestDetail'
import { CreatableGroupSelect } from './CreatableGroupSelect'

interface GuestListProps {
  event: Event
  onBack: () => void
}

const PRIORITY_OPTIONS: Array<{ value: GuestPriority; label: string }> = [
  { value: 1, label: '⭐' },
  { value: 2, label: '⭐⭐' },
  { value: 3, label: '⭐⭐⭐' },
]

function groupName(groups: { id: string; name: string }[], groupId: string | null): string {
  if (!groupId) return 'Sem grupo'
  return groups.find((g) => g.id === groupId)?.name ?? 'Sem grupo'
}

export function GuestList({ event, onBack }: GuestListProps) {
  const themeStyle = getThemeStyle(
    event.theme_preset,
    event.theme_preset === 'custom'
      ? {
          primary: event.custom_primary,
          secondary: event.custom_secondary,
          accent: event.custom_accent,
        }
      : undefined,
  ) as CSSProperties

  const {
    guests,
    groups,
    loading,
    error,
    permissions,
    addGuest,
    addGuests,
    removeGuest,
    updateGuest,
    addGroup,
    prioritize,
  } = useGuestModule(event.id)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [groupId, setGroupId] = useState('')
  const [adding, setAdding] = useState(false)

  const [filterGroup, setFilterGroup] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)

  const [quickMode, setQuickMode] = useState<'single' | 'bulk'>('single')
  const [bulkText, setBulkText] = useState('')
  const [bulkCount, setBulkCount] = useState<number | null>(null)

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    const ok = await addGuest({
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      group_id: groupId || null,
      notes: null,
    })
    if (ok) {
      setName('')
      setEmail('')
      setPhone('')
      setGroupId('')
    }
    setAdding(false)
  }

  const handlePriority = async (guest: Guest, priority: GuestPriority) => {
    await prioritize(guest.id, priority)
    if (selectedGuest?.id === guest.id) {
      setSelectedGuest({ ...guest, priority })
    }
  }

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const names = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (names.length === 0) return

    setAdding(true)
    const count = await addGuests(names)
    if (count > 0) {
      setBulkCount(count)
      setBulkText('')
      window.setTimeout(() => setBulkCount(null), 3000)
    }
    setAdding(false)
  }

  const filtered = guests.filter((g) => {
    if (filterGroup === 'none' && g.group_id) return false
    if (filterGroup !== 'all' && filterGroup !== 'none' && g.group_id !== filterGroup) return false
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="dashboard-shell" style={themeStyle}>
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <span className="dashboard-brand-mark" aria-hidden="true">👥</span>
          <span className="dashboard-brand-name">Convidados · {event.title}</span>
        </div>
        <div className="dashboard-controls">
          <button type="button" className="btn-secondary" onClick={onBack}>
            Voltar ao painel
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Convidados */}
        <section className="settings-section" aria-labelledby="guests-title">
          <h2 id="guests-title" className="settings-section-title">Convidados</h2>
          <p className="settings-section-desc">
            Adicione rapidamente, defina grupo e prioridade e clique em um convidado para acompanhantes, votação e discussão.
          </p>

          <div className="guest-toolbar">
            <input
              className="form-control"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar convidado..."
            />
            <select
              className="form-control"
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              aria-label="Filtrar por grupo"
            >
              <option value="all">Todos os grupos</option>
              <option value="none">Sem grupo</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="auth-error" role="alert" style={{ marginTop: '1rem' }}>
              ⚠ {error}
            </p>
          )}

          {bulkCount !== null && (
            <p className="auth-success" role="status" style={{ marginTop: '1rem' }}>
              ✓ {bulkCount} {bulkCount === 1 ? 'convidado adicionado' : 'convidados adicionados'}.
            </p>
          )}

          {/* Cadastro rápido */}
          <div role="tablist" className="quick-add-tabs" aria-label="Forma de adicionar convidados">
            <button
              type="button"
              role="tab"
              aria-selected={quickMode === 'single'}
              className={`quick-add-tab${quickMode === 'single' ? ' is-active' : ''}`}
              onClick={() => setQuickMode('single')}
            >
              Um por vez
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={quickMode === 'bulk'}
              className={`quick-add-tab${quickMode === 'bulk' ? ' is-active' : ''}`}
              onClick={() => setQuickMode('bulk')}
            >
              Colar vários nomes
            </button>
          </div>

          {quickMode === 'bulk' ? (
            <form onSubmit={handleBulkAdd} className="quick-add-bulk">
              <label className="form-label" htmlFor="bulk-names">
                Cole um nome por linha
              </label>
              <textarea
                id="bulk-names"
                className="form-control"
                rows={3}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'Maria Silva\nJoão Silva\nAna Souza\nCarlos Oliveira'}
              />
              <button type="submit" className="btn-primary" disabled={adding || !bulkText.trim()}>
                {adding ? 'Adicionando...' : 'Adicionar nomes'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddGuest} className="guest-form-row">
              <div className="form-field" style={{ flex: '2 1 160px' }}>
                <label className="form-label" htmlFor="guest-name">Nome completo</label>
                <input
                  id="guest-name"
                  className="form-control"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Maria Silva"
                />
              </div>
              <div className="form-field" style={{ flex: '1 1 140px' }}>
                <label className="form-label" htmlFor="guest-email">Email</label>
                <input
                  id="guest-email"
                  className="form-control"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="form-field" style={{ flex: '1 1 140px' }}>
                <label className="form-label" htmlFor="guest-phone">Telefone</label>
                <input
                  id="guest-phone"
                  className="form-control"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="form-field" style={{ flex: '1 1 160px' }}>
                <label className="form-label" htmlFor="guest-group">Grupo</label>
                <CreatableGroupSelect
                  groups={groups}
                  value={groupId}
                  onChange={setGroupId}
                  onCreate={addGroup}
                  inputId="guest-group"
                />
              </div>
              <div style={{ alignSelf: 'flex-end' }}>
                <button type="submit" className="btn-primary" disabled={adding || !name.trim()}>
                  {adding ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="state-panel" style={{ minHeight: '200px' }}>
              <div className="state-spinner" role="status" aria-label="Carregando convidados" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="guest-list-empty">Nenhum convidado encontrado.</div>
          ) : (
            <ul className="guest-list">
              {filtered.map((guest) => (
                <li key={guest.id} className="guest-item">
                  <div className="guest-item-info">
                    <span className="guest-item-name">
                      {guest.priority ? PRIORITY_OPTIONS.find((p) => p.value === guest.priority)?.label + ' ' : ''}
                      {guest.name}
                    </span>
                    <span className="guest-item-meta">
                      {groupName(groups, guest.group_id)}
                      {guest.email ? ` · ${guest.email}` : ''}
                    </span>
                  </div>
                  <div className="guest-item-actions">
                    {permissions.can_prioritize && (
                      <select
                        className="form-control"
                        value={guest.priority ?? ''}
                        aria-label={`Prioridade de ${guest.name}`}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val) void handlePriority(guest, Number(val) as GuestPriority)
                        }}
                      >
                        <option value="">—</option>
                        {PRIORITY_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setSelectedGuest(guest)}
                    >
                      Detalhes
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => void removeGuest(guest.id)}>
                      Remover
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {selectedGuest && (
        <GuestDetail
          event={event}
          guest={selectedGuest}
          canVote={permissions.can_vote}
          canComment={permissions.can_comment}
          onClose={() => setSelectedGuest(null)}
          onGroupChange={(guestId, groupIdValue) => void updateGuest(guestId, { group_id: groupIdValue || null })}
          groups={groups}
          onCreateGroup={addGroup}
        />
      )}
    </div>
  )
}