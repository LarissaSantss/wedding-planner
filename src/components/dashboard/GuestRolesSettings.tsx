import { useCallback, useEffect, useState } from 'react'
import type { GuestRole } from '../../lib/supabase/types'
import {
  fetchGuestRoles,
  createGuestRole,
  updateGuestRole,
  deleteGuestRole,
} from '../../lib/supabase/database'

interface GuestRolesSettingsProps {
  eventId: string
}

/**
 * CRUD completo de Papéis Especiais do evento (Padrinho, Dama de Honra, etc.).
 * Qualquer convidado/acompanhante sem papel especial é tratado como "Convidado Comum".
 * Isolado por event_id via RLS.
 */
export function GuestRolesSettings({ eventId }: GuestRolesSettingsProps) {
  const [roles, setRoles] = useState<GuestRole[]>([])
  const [newName, setNewName] = useState('')
  const [newIsSpecial, setNewIsSpecial] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<GuestRole | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await fetchGuestRoles(eventId)
    setRoles(data ?? [])
    setLoading(false)
  }, [eventId])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    const { data, error: createError } = await createGuestRole({
      event_id: eventId,
      name: newName.trim(),
      is_special: newIsSpecial,
    })
    if (createError || !data) {
      setError('Não foi possível criar o papel.')
      return
    }
    setRoles((prev) => [...prev, data])
    setNewName('')
  }

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return
    await updateGuestRole(id, { name: editingName.trim() })
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, name: editingName.trim() } : r)))
    setEditingId(null)
    setEditingName('')
  }

  const handleDelete = async (id: string) => {
    // A FK guest_role_assignments.role_id tem ON DELETE CASCADE,
    // então convidados vinculados ficam automaticamente sem papel (Comum).
    await deleteGuestRole(id)
    setRoles((prev) => prev.filter((r) => r.id !== id))
    setDeleteConfirm(null)
  }

  return (
    <section className="settings-section share-section" aria-labelledby="guest-roles-title">
      <h2 id="guest-roles-title" className="settings-section-title">Papéis Especiais</h2>
      <p className="settings-section-desc">
        Crie os papéis especiais do casamento (Padrinho, Dama de Honra, Porta Aliança, Noivinho...).
        Qualquer convidado ou acompanhante sem um papel especial é tratado automaticamente como{' '}
        <strong>Convidado Comum</strong>.
      </p>

      {error && <p className="auth-error" role="alert">⚠ {error}</p>}

      <form onSubmit={handleCreate} className="guest-form-row">
        <div className="form-field" style={{ flex: '1 1 220px' }}>
          <label className="form-label" htmlFor="guest-role-name">Nome do papel</label>
          <input
            id="guest-role-name"
            className="form-control"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex: Padrinho"
          />
        </div>
        <div className="form-field" style={{ flex: '0 1 180px' }}>
          <label className="form-label" htmlFor="guest-role-special">Tipo</label>
          <select
            id="guest-role-special"
            className="form-control"
            value={newIsSpecial ? 'special' : 'common'}
            onChange={(e) => setNewIsSpecial(e.target.value === 'special')}
          >
            <option value="special">Papel especial</option>
            <option value="common">Categoria comum</option>
          </select>
        </div>
        <div style={{ alignSelf: 'flex-end' }}>
          <button type="submit" className="btn-primary" disabled={!newName.trim()}>Criar papel</button>
        </div>
      </form>

      {loading ? (
        <div className="state-panel" style={{ minHeight: '100px' }}>
          <div className="state-spinner" role="status" aria-label="Carregando papéis" />
        </div>
      ) : roles.length === 0 ? (
        <div className="guest-list-empty">Nenhum papel criado.</div>
      ) : (
        <ul className="group-list">
          {roles.map((role) => (
            <li key={role.id} className="group-item">
              {editingId === role.id ? (
                <>
                  <input
                    className="form-control"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                  />
                  <div className="group-actions">
                    <button type="button" className="btn-primary" onClick={() => void handleRename(role.id)}>Salvar</button>
                    <button type="button" className="btn-secondary" onClick={() => setEditingId(null)}>Cancelar</button>
                  </div>
                </>
              ) : (
                <>
                  <span className="group-name">
                    {role.name}
                    <span className="group-count"> · {role.is_special ? 'Especial' : 'Comum'}</span>
                  </span>
                  <div className="group-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => { setEditingId(role.id); setEditingName(role.name) }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="guest-trash-btn"
                      onClick={() => setDeleteConfirm(role)}
                      aria-label={`Excluir papel ${role.name}`}
                      title={`Excluir papel ${role.name}`}
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
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {deleteConfirm && (
        <div className="drawer-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-dialog-title">Excluir papel?</h3>
            <p className="confirm-dialog-text">
              Deseja excluir o papel <strong>{deleteConfirm.name}</strong>? Convidados vinculados
              a ele passarão a ser tratados como <strong>Convidado Comum</strong>.
            </p>
            <div className="confirm-dialog-actions">
              <button type="button" className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleDelete(deleteConfirm.id)}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}