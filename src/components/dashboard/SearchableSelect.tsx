import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface SearchableSelectOption {
  value: string
  label: string
  sublabel?: string
  icon?: string
  color?: string
  disabled?: boolean
}

interface SearchableSelectProps {
  id?: string
  label?: string
  placeholder?: string
  value: string
  options: SearchableSelectOption[]
  onChange: (value: string) => void
  onBlur?: () => void
  disabled?: boolean
  className?: string
  /** Ícone de pesquisa mostrado no input. */
  showSearchIcon?: boolean
  /** Se verdadeiro, mostra "Limpar" para voltar ao estado vazio. */
  clearable?: boolean
  emptyMessage?: string
  /** Permitir que o valor digitado seja usado mesmo sem estar nas opções. */
  allowFreeText?: boolean
  /** Placeholder do campo de busca dentro do dropdown. */
  searchPlaceholder?: string
}

/**
 * Combobox pesquisável e acessível com suporte a teclado.
 *
 * - Digitar filtra as opções em tempo real
 * - Setas ↑/↓ navegam, Enter seleciona, Esc fecha
 * - Home/End vão ao início/fim da lista
 * - Click-fora fecha o dropdown
 * - `allowFreeText` permite valores não listados (ex: criação rápida)
 */
export function SearchableSelect({
  id,
  label,
  placeholder = 'Selecionar...',
  value,
  options,
  onChange,
  onBlur,
  disabled = false,
  className = '',
  showSearchIcon = true,
  clearable = true,
  emptyMessage = 'Nenhuma opção encontrada',
  allowFreeText = false,
  searchPlaceholder = 'Digite para pesquisar...',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel?.toLowerCase().includes(q) ?? false),
    )
  }, [options, query])

  // Fecha ao clicar fora
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

  // Rolagem do item ativo no dropdown
  useEffect(() => {
    if (!open || activeIndex < 0) return
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const handleInputChange = (value: string) => {
    setQuery(value)
    setActiveIndex(-1)
    if (!open) setOpen(true)

    // Se permitir texto livre, emite o valor digitado como seleção
    if (allowFreeText) {
      onChange(value)
    }
  }

  const handleSelect = useCallback(
    (opt: SearchableSelectOption) => {
      if (opt.disabled) return
      onChange(opt.value)
      setOpen(false)
      setQuery('')
      setActiveIndex(-1)
    },
    [onChange],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      setOpen(true)
      return
    }

    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % Math.max(filtered.length, 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) =>
          prev <= 0 ? Math.max(filtered.length - 1, 0) : prev - 1,
        )
        break
      case 'Home':
        e.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        e.preventDefault()
        setActiveIndex(filtered.length - 1)
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && filtered[activeIndex]) {
          handleSelect(filtered[activeIndex])
        } else if (query.trim() && allowFreeText) {
          onChange(query.trim())
          setOpen(false)
          setQuery('')
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setQuery('')
        inputRef.current?.blur()
        break
      case 'Tab':
        setOpen(false)
        setQuery('')
        break
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setQuery('')
    inputRef.current?.focus()
    setOpen(true)
  }

  return (
    <div className={`searchable-select${className ? ` ${className}` : ''}`} ref={rootRef}>
      {label && (
        <label className="form-label" htmlFor={id}>{label}</label>
      )}

      <div className={`searchable-select-control${open ? ' is-open' : ''}`}>
        <span className="searchable-select-icon" aria-hidden="true">
          {showSearchIcon ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          ) : null}
        </span>

        <input
          ref={inputRef}
          id={id}
          className="searchable-select-input"
          type="text"
          value={open ? query : (selected?.label ?? '')}
          placeholder={open ? searchPlaceholder : placeholder}
          readOnly={!open && !allowFreeText}
          disabled={disabled}
          onFocus={() => { setOpen(true); setQuery(''); setActiveIndex(-1) }}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Delay para permitir clique na opção antes do blur
            setTimeout(() => {
              setOpen(false)
              setQuery('')
              onBlur?.()
            }, 120)
          }}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id ?? 'searchable'}-listbox`}
          aria-activedescendant={
            activeIndex >= 0 ? `${id ?? 'searchable'}-opt-${activeIndex}` : undefined
          }
        />

        {clearable && value && !disabled && (
          <button
            type="button"
            className="searchable-select-clear"
            onClick={handleClear}
            tabIndex={-1}
            aria-label="Limpar seleção"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        <span className="searchable-select-chevron" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>

      {open && (
        <ul
          id={`${id ?? 'searchable'}-listbox`}
          className="searchable-select-list"
          role="listbox"
          ref={listRef}
        >
          {filtered.length === 0 && (
            <li className="searchable-select-empty" role="option" aria-disabled="true">
              {emptyMessage}
            </li>
          )}
          {filtered.map((opt, index) => {
            const isActive = index === activeIndex
            return (
              <li key={opt.value} role="option" aria-selected={opt.value === value}>
                <button
                  id={`${id ?? 'searchable'}-opt-${index}`}
                  type="button"
                  className={`searchable-select-option${isActive ? ' is-active' : ''}${opt.value === value ? ' is-selected' : ''}${opt.disabled ? ' is-disabled' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(opt) }}
                  onMouseEnter={() => setActiveIndex(index)}
                  disabled={opt.disabled}
                >
                  {opt.color && (
                    <span className="searchable-select-swatch" style={{ backgroundColor: opt.color }} aria-hidden="true" />
                  )}
                  {opt.icon && <span className="searchable-select-option-icon" aria-hidden="true">{opt.icon}</span>}
                  <span className="searchable-select-option-label">
                    {opt.label}
                    {opt.sublabel && <span className="searchable-select-option-sublabel">{opt.sublabel}</span>}
                  </span>
                  {opt.value === value && (
                    <svg className="searchable-select-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}