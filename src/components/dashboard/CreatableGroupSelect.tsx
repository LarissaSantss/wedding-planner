import { useMemo, useState } from 'react'
import type { GuestGroup } from '../../lib/supabase/types'

interface CreatableGroupSelectProps {
  groups: GuestGroup[]
  value: string
  onChange: (value: string) => void
  onCreate: (name: string) => Promise<GuestGroup | null>
  inputId?: string
  allowNone?: boolean
}

/**
 * Select de busca com criação rápida:
 * filtra os grupos conforme a digitação e, se não houver correspondência,
 * mostra "+ Criar novo grupo '...'".
 */
export function CreatableGroupSelect({
  groups,
  value,
  onChange,
  onCreate,
  inputId,
  allowNone = true,
}: CreatableGroupSelectProps) {
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)

  const selected = groups.find((g) => g.id === value) ?? null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groups
    return groups.filter((g) => g.name.toLowerCase().includes(q))
  }, [groups, query])

  const exactMatch = groups.some((g) => g.name.toLowerCase() === query.trim().toLowerCase())
  const showCreate = query.trim().length > 0 && !exactMatch

  const handleCreate = async () => {
    if (!query.trim()) return
    setCreating(true)
    const created = await onCreate(query.trim())
    if (created) {
      onChange(created.id)
      setQuery('')
    }
    setCreating(false)
  }

  return (
    <div className="creatable-select">
      <input
        id={inputId}
        className="form-control"
        type="text"
        value={query || (selected ? selected.name : '')}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar ou criar grupo..."
        onFocus={() => {
          if (selected) setQuery(selected.name)
        }}
        list={inputId ? `${inputId}-list` : undefined}
      />
      <datalist id={inputId ? `${inputId}-list` : undefined}>
        {filtered.map((g) => (
          <option key={g.id} value={g.name} />
        ))}
      </datalist>

      <div className="creatable-select-menu">
        {allowNone && (
          <button
            type="button"
            className={`creatable-option${!value ? ' is-selected' : ''}`}
            onClick={() => {
              onChange('')
              setQuery('')
            }}
          >
            Sem grupo
          </button>
        )}

        {filtered.map((g) => (
          <button
            key={g.id}
            type="button"
            className={`creatable-option${value === g.id ? ' is-selected' : ''}`}
            onClick={() => {
              onChange(g.id)
              setQuery('')
            }}
          >
            {g.name}
          </button>
        ))}

        {showCreate && (
          <button
            type="button"
            className="creatable-option is-create"
            onClick={() => void handleCreate()}
            disabled={creating}
          >
            {creating ? 'Criando...' : `+ Criar novo grupo "${query.trim()}"`}
          </button>
        )}
      </div>
    </div>
  )
}