
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Event, Guest, EventTable, EventTableGuest } from '../../lib/supabase/types'
import {
  fetchEventTables,
  createEventTable,
  deleteEventTable,
  fetchEventTableGuests,
  createEventTableGuest,
  deleteEventTableGuest,
  fetchGuestsByEvent,
} from '../../lib/supabase/database'

interface SeatingChartProps {
  event: Event
}

/**
 * Aba de Organização de Mesas e Assentos.
 * CRUD de mesas + alocação de convidados confirmados via dropdown.
 */
export function SeatingChart({ event }: SeatingChartProps) {
  const [tables, setTables] = useState<EventTable[]>([])
  const [tableGuests, setTableGuests] = useState<EventTableGuest[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('8')
  const [location, setLocation] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [tablesRes, tableGuestsRes, guestsRes] = await Promise.all([
      fetchEventTables(event.id),
      fetchEventTableGuests(event.id),
      fetchGuestsByEvent(event.id),
    ])
    setTables(tablesRes.data ?? [])
    setTableGuests(tableGuestsRes.data ?? [])
    setGuests(guestsRes.data ?? [])
    setLoading(false)
  }, [event.id])

  useEffect(() => {
    void load()
  }, [load])

  const confirmedGuests = useMemo(
    () => guests.filter((g) => g.rsvp_status === 'confirmed'),
    [guests],
  )

  const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0)
  const unallocated = confirmedGuests.filter(
    (g) => !tableGuests.some((tg) => tg.guest_id === g.id),
  )

  const occupantCount = (tableId: string) =>
    tableGuests.filter((tg) => tg.table_id === tableId).length

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    const { data, error } = await createEventTable({
      event_id: event.id,
      name: name.trim(),
      capacity: Number(capacity) || 8,
      location: location.trim() || null,
    })
    if (!error && data) {
      setTables((prev) => [...prev, data])
      setName('')
      setCapacity('8')
      setLocation('')
    }
    setCreating(false)
  }

  const handleDeleteTable = async (id: string) => {
    const { error } = await deleteEventTable(id)
    if (!error) {
      setTables((prev) => prev.filter((t) => t.id !== id))
      setTableGuests((prev) => prev.filter((tg) => tg.table_id !== id))
    }
  }

  const handleAssign = async (guestId: string, tableId: string) => {
    // Remove alocação anterior deste convidado
    const existing = tableGuests.find((tg) => tg.guest_id === guestId)
    if (existing) {
      await deleteEventTableGuest(existing.id)
    }
    if (!tableId) {
      setTableGuests((prev) => prev.filter((tg) => tg.guest_id !== guestId))
      return
    }
    const { data, error } = await createEventTableGuest({
      event_id: event.id,
      table_id: tableId,
      guest_id: guestId,
      companion_id: null,
    })
    if (!error && data) {
      setTableGuests((prev) => [...prev.filter((tg) => tg.guest_id !== guestId), data])
    }
  }

  const tableOfGuest = (guestId: string) =>
    tableGuests.find((tg) => tg.guest_id === guestId)?.table_id ?? ''

  return (
    <div className="seating-section">
      <header className="guest-header">
        <div>
          <h1 className="guest-title">Mesas & Assentos</h1>
          <p className="guest-subtitle">
            Organize a disposição dos convidados confirmados nas mesas.
          </p>
        </div>
      </header>

      {/* Métricas */}
      <div className="seating-metrics">
        <div className="guest-indicator">
          <span className="guest-indicator-value">{tables.length}</span>
          <span className="guest-indicator-label">Mesas criadas</span>
        </div>
        <div className="guest-indicator">
          <span className="guest-indicator-value">{totalSeats}</span>
          <span className="guest-indicator-label">Assentos disponíveis</span>
        </div>
        <div className="guest-indicator">
          <span className="guest-indicator-value is-accent">{confirmedGuests.length}</span>
          <span className="guest-indicator-label">Confirmados</span>
        </div>
        {unallocated.length > 0 && (
          <div className="seating-alert" role="alert">
            ⚠ {unallocated.length} confirmado(s) ainda sem mesa.
          </div>
        )}
      </div>

      {/* Formulário nova mesa */}
      <form onSubmit={handleCreate} className="guest-form-row seating-form">
        <div className="form-field" style={{ flex: '1 1 220px' }}>
          <label className="form-label" htmlFor="table-name">Nome / Número</label>
          <input
            id="table-name"
            className="form-control"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Mesa da Família"
          />
        </div>
        <div className="form-field" style={{ flex: '0 1 120px' }}>
          <label className="form-label" htmlFor="table-capacity">Lugares</label>
          <input
            id="table-capacity"
            className="form-control"
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
        <div className="form-field" style={{ flex: '1 1 200px' }}>
          <label className="form-label" htmlFor="table-location">Localização (opcional)</label>
          <input
            id="table-location"
            className="form-control"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: Perto da pista de dança"
          />
        </div>
        <div style={{ alignSelf: 'flex-end' }}>
          <button type="submit" className="btn-primary" disabled={creating || !name.trim()}>
            {creating ? 'Criando...' : 'Criar mesa'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="state-panel" style={{ minHeight: '160px' }}>
          <div className="state-spinner" role="status" aria-label="Carregando mesas" />
        </div>
      ) : (
        <div className="seating-grid">
          {tables.map((table) => {
            const used = occupantCount(table.id)
            const full = used >= table.capacity
            const percent = Math.min(100, Math.round((used / table.capacity) * 100))
            return (
              <article key={table.id} className={`seating-card${full ? ' is-full' : ''}`}>
                <div className="seating-card-head">
                  <span className="seating-card-name">{table.name}</span>
                  <button
                    type="button"
                    className="guest-trash-btn"
                    onClick={() => void handleDeleteTable(table.id)}
                    aria-label={`Excluir ${table.name}`}
                    title={`Excluir ${table.name}`}
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
                {table.location && <div className="seating-card-location">📍 {table.location}</div>}

                <div className="seating-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Ocupação da mesa">
                  <span className="seating-progress-fill" style={{ width: `${percent}%` }} />
                </div>
                <div className="seating-card-count">
                  {used} / {table.capacity} lugares
                  {full && <span className="seating-full-badge">Lotada</span>}
                </div>

                <select
                  className="form-control"
                  value=""
                  onChange={(e) => {
                    const guestId = e.target.value
                    if (guestId) void handleAssign(guestId, table.id)
                    e.target.value = ''
                  }}
                  aria-label={`Adicionar convidado à ${table.name}`}
                >
                  <option value="">+ Adicionar convidado...</option>
                  {unallocated.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>

                <ul className="seating-guests">
                  {tableGuests
                    .filter((tg) => tg.table_id === table.id && tg.guest_id)
                    .map((tg) => {
                      const guest = guests.find((g) => g.id === tg.guest_id)
                      return (
                        <li key={tg.id} className="seating-guest-row">
                          <span>{guest?.name ?? 'Convidado'}</span>
                        </li>
                      )
                    })}
                </ul>
              </article>
            )
          })}
        </div>
      )}

      {/* Lista de não-alocados */}
      {unallocated.length > 0 && (
        <section className="seating-unallocated">
          <h2 className="section-heading">Ainda sem mesa</h2>
          <div className="seating-unallocated-list">
            {unallocated.map((g) => (
              <div key={g.id} className="seating-unallocated-row">
                <span>{g.name}</span>
                <select
                  className="form-control"
                  value={tableOfGuest(g.id)}
                  onChange={(e) => void handleAssign(g.id, e.target.value)}
                  aria-label={`Definir mesa para ${g.name}`}
                >
                  <option value="">Sem mesa</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}