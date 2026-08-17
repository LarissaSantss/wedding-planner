import { useEffect, useMemo, useRef, useState } from 'react'
import type { GuestRole } from '../../lib/supabase/types'
import { roleIconEmoji } from '../../utils/guestConfig'

interface RolePickerProps {
  roles: GuestRole[]
  selectedRoleIds: string[]
  onChange: (roleIds: string[]) => void
  disabled?: boolean
  placeholder?: string
}

/**
 * Seletor de papéis especiais com múltipla seleção.
 *
 * - Abre um painel com busca e checkboxes
 * - Seleção múltipla com chips removíveis (badges coloridos)
 * - Cada papel exibe ícone + cor configurados
 */
export function RolePicker({
  roles,
  selectedRoleIds,
  onChange,
  disabled = false,
  placeholder = '+ Adicionar papel',
}: RolePickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const selectedRoles = useMemo(
    () => roles.filter((r) => selectedRoleIds.includes(r.id)),
    [roles, selectedRoleIds],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return roles
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
    )
  }, [roles, query])

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  const toggleRole = (roleId: string) => {
    if (disabled) return
    if (selectedRoleIds.includes(roleId)) {
      onChange(selectedRoleIds.filter((id) => id !== roleId))
    } else {
      onChange([...selectedRoleIds, roleId])
    }
  }

  const removeRole = (roleId: string) => {
    if (disabled) return
    onChange(selectedRoleIds.filter((id) => id !== roleId))
  }

  return (
    <div className={`role-picker${disabled ? ' is-disabled' : ''}`} ref={rootRef}>
      {selectedRoles.length > 0 && (
        <div className="role-picker-chips">
          {selectedRoles.map((role) => (
            <span
              key={role.id}
              className="role-picker-chip"
              style={{
                backgroundColor: `${role.color}1f`,
                borderColor: `${role.color}55`,
                color: role.color,
              }}
            >
              <span className="role-picker-chip-icon" aria-hidden="true">
                {roleIconEmoji(role.icon)}
              </span>
              {role.name}
              {!disabled && (
                <button
                  type="button"
                  className="role-picker-chip-remove"
                  onClick={() => removeRole(role.id)}
                  aria-label={`Remover papel ${role.name}`}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        className="role-picker-trigger"
        onClick={() => { if (!disabled) setOpen((prev) => !prev) }}
        disabled={disabled}
        aria-expanded={open}
      >
        <span className="role-picker-trigger-icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
        {placeholder}
      </button>

      {open && (
        <div className="role-picker-panel">
          <div className="role-picker-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="role-picker-search-input"
              placeholder="Pesquisar papel..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <ul className="role-picker-list">
            {filtered.length === 0 && (
              <li className="role-picker-empty">Nenhum papel encontrado</li>
            )}
            {filtered.map((role) => {
              const isSelected = selectedRoleIds.includes(role.id)
              return (
                <li key={role.id} className="role-picker-item">
                  <label className={`role-picker-option${isSelected ? ' is-selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRole(role.id)}
                      className="role-picker-checkbox"
                    />
                    <span
                      className="role-picker-checkmark"
                      aria-hidden="true"
                      style={{ borderColor: isSelected ? role.color : undefined, backgroundColor: isSelected ? role.color : undefined }}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </span>
                    <span className="role-picker-option-icon" aria-hidden="true" style={{ color: role.color }}>
                      {roleIconEmoji(role.icon)}
                    </span>
                    <span className="role-picker-option-text">
                      <span className="role-picker-option-name">{role.name}</span>
                      {role.description && (
                        <span className="role-picker-option-desc">{role.description}</span>
                      )}
                    </span>
                    {!role.allow_multiple && (
                      <span className="role-picker-single-badge" title="Papel exclusivo">
                        único
                      </span>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}