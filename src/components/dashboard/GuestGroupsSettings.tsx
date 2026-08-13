import { useCallback, useEffect, useState } from 'react'
import type { GuestGroup, Guest } from '../../lib/supabase/types'
import {
  fetchGuestGroups,
  createGuestGroup,
  updateGuestGroup,
  deleteGuestGroup,
  fetchGuestsByEvent,
  updateGuest,
} from '../../lib/supabase/database'

interface GuestGroupsSettingsProps {
  eventId: string
}

/**
 * Gerenciamento centralizado de grupos nas Configurações.
 * Renomear/editar e excluir com proteção: ao excluir um grupo com convidados,
 * pergunta se deseja mover os convidados para "Sem Grupo" ou cancelar.
 */
export function GuestGroupsSettings({ eventId }: GuestGroupsSettingsProps) {
  const [groups, setGroups] = useState<GuestGroup[]>([])
  const [linkedGuests, setLinkedGuests] = useState<Record<string, Guest[]>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [newName, setNewName] = useState('')
  const [deleting, setDeleting] = useState<GuestGroup | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [groupsRes, guestsRes] = await Promise.all([
      fetchGuestGroups(eventId),
      fetchGuestsByEvent(eventId),
    ])
    setGroups(groupsRes.data ?? [])

    const map: Record<string, Guest[]> = {}
    for (const g of guestsRes.data ?? []) {
      if (g.group_id) {
        map[g.group_id] = [...(map[g.group_id] ?? []), g]
      }
    }
    setLinkedGuests(map)
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    const { data, error: createError } = await createGuestGroup({
      event_id: eventId,
      name: newName.trim(),
    })
    if (createError || !data) {
      setError('Não foi possível criar o grupo.')
      return
    }
    setGroups((prev) => [...prev, data])
    setNewName('')
  }

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return
    await updateGuestGroup(id, { name: editingName.trim() })
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name: editingName.trim() } : g)))
    setEditingId(null)
    setEditingName('')
  }

  const confirmDelete = async () => {
    if (!deleting) return
    const guestsInGroup = linkedGuests[deleting.id] ?? []

    // Move convidados para "Sem Grupo" antes de excluir (proteção de dados)
    for (const g of guestsInGroup) {
      await updateGuest(g.id, { group_id: null })
    }

    await deleteGuestGroup(deleting.id)
    setGroups((prev) => prev.filter((g) => g.id !== deleting.id))
    setLinkedGuests((prev) => {
      const next = { ...prev }
      delete next[deleting.id]
      return next
    })
    setDeleting(null)
  }

  const countFor = (id: string) => linkedGuests[id]?.length ?? 0

  return (
    <section className="settings-section share-section" aria-labelledby="guest-groups-settings-title">
      <h2 id="guest-groups-settings-title" className="settings-section-title">
        Grupos de convidados
      </h2>
      <p className="settings-section-desc">
        Gerencie os grupos deste evento. A exclusão de um grupo com convidados vinculados
        exige confirmação.
      </p>

      {error && (
        <p className="auth-error" role="alert" style={{ marginBottom: '1rem' }}>
          ⚠ {error}
        </p>
      )}

      <form onSubmit={handleCreate} className="guest-form-row">
        <div className="form-field" style={{ flex: '1 1 220px' }}>
          <label className="form-label" htmlFor="settings-group-name">Novo grupo</label>
          <input
            id="settings-group-name"
            className="form-control"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex: Família da Noiva"
          />
        </div>
        <div style={{ alignSelf: 'flex-end' }}>
          <button type="submit" className="btn-primary" disabled={!newName.trim()}>
            Criar grupo
          </button>
        </div>
      </form>

      {loading ? (
        <div className="state-panel" style={{ minHeight: '100px' }}>
          <div className="state-spinner" role="status" aria-label="Carregando grupos" />
        </div>
      ) : groups.length === 0 ? (
        <div className="guest-list-empty">Nenhum grupo criado.</div>
      ) : (
        <ul className="group-list">
          {groups.map((g) => (
            <li key={g.id} className="group-item">
              {editingId === g.id ? (
                <>
                  <input
                    className="form-control"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                  />
                  <div className="group-actions">
                    <button type="button" className="btn-primary" onClick={() => void handleRename(g.id)}>
                      Salvar
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="group-name">
                    {g.name}
                    <span className="group-count"> · {countFor(g.id)} convidados</span>
                  </span>
                  <div className="group-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setEditingId(g.id)
                        setEditingName(g.name)
                      }}
                    >
                      Renomear
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setDeleting(g)}
                    >
                      Excluir
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {deleting && (
        <div className="drawer-overlay" onClick={() => setDeleting(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-dialog-title">Excluir grupo "{deleting.name}"?</h3>
            {countFor(deleting.id) > 0 ? (
              <p className="confirm-dialog-text">
                Este grupo possui <strong>{countFor(deleting.id)} convidado(s)</strong> vinculado(s).
                Ao excluir, esses convidados serão movidos para <strong>"Sem grupo"</strong>.
              </p>
            ) : (
              <p className="confirm-dialog-text">Este grupo não possui convidados vinculados.</p>
            )}

            <div className="confirm-dialog-actions">
              <button type="button" className="btn-secondary" onClick={() => setDeleting(null)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={() => void confirmDelete()}>
                Mover para "Sem grupo" e excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}