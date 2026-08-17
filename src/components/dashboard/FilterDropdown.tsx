import { useEffect, useMemo, useRef, useState } from 'react'

export interface FilterOption {
  value: string
  label: string
  icon?: string
  color?: string
}

interface FilterDropdownProps {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  placeholder?: string
  allOption?: string
  noneValue?: string
  noneLabel?: string
  searchable?: boolean
  activeLabel?: string
  icon?: string
}

/**
 * Dropdown de filtro com busca (usado nos filtros inteligentes).
 * - Abre ao clicar; `value === ''` exibe o placeholder
 * - Mostra a opção ativa destacada com check
 */
export function FilterDropdown({
  label,
  value,
  options,
  onChange,
  placeholder,
  allOption = 'Todos',
  noneValue,
  noneLabel = 'Sem classificação',
  searchable = true,
  icon,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.icon?.toLowerCase().includes(q) ?? false),
    )
  }, [options, query])

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

  const applyValue = (next: string) => {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  const isActive = value !== ''

  return (
    <div className={`filter-dropdown${isActive ? ' is-active' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="filter-dropdown-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {icon && <span className="filter-dropdown-icon" aria-hidden="true">{icon}</span>}
        <span className="filter-dropdown-label">
          {isActive ? (selected?.label ?? label) : (placeholder ?? label)}
        </span>
        <svg className="filter-dropdown-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="filter-dropdown-menu" role="listbox">
          {searchable && (
            <div className="filter-dropdown-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Pesquisar..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </div>
          )}

          <ul className="filter-dropdown-list">
            <li role="option" aria-selected={value === ''}>
              <button
                type="button"
                className={`filter-dropdown-option${value === '' ? ' is-selected' : ''}`}
                onClick={() => applyValue('')}
              >
                <span className="filter-dropdown-option-label">{allOption}</span>
              </button>
            </li>
            {filtered.map((opt) => (
              <li key={opt.value} role="option" aria-selected={opt.value === value}>
                <button
                  type="button"
                  className={`filter-dropdown-option${opt.value === value ? ' is-selected' : ''}`}
                  onClick={() => applyValue(opt.value)}
                >
                  {opt.color && (
                    <span className="filter-dropdown-swatch" style={{ backgroundColor: opt.color }} aria-hidden="true" />
                  )}
                  {opt.icon && <span className="filter-dropdown-option-icon" aria-hidden="true">{opt.icon}</span>}
                  <span className="filter-dropdown-option-label">{opt.label}</span>
                  {opt.value === value && (
                    <svg className="filter-dropdown-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
            {noneValue && !query && (
              <li role="option" aria-selected={value === noneValue}>
                <button
                  type="button"
                  className={`filter-dropdown-option${value === noneValue ? ' is-selected' : ''}`}
                  onClick={() => applyValue(noneValue)}
                >
                  <span className="filter-dropdown-option-label">{noneLabel}</span>
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}