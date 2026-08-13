import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Event, Task, Profile, TaskCategory } from '../../lib/supabase/types'
import { getThemeStyle } from '../../utils/theme'
import { useKanban } from '../../hooks/useKanban'
import {
  fetchTasksByEvent,
  createTask,
  fetchProfiles,
  deleteTask,
  moveTask,
  fetchCategoriesByEvent,
} from '../../lib/supabase/database'
import { TaskDetail } from './TaskDetail'

interface KanbanProps {
  event: Event
  onBack: () => void
}

type ViewMode = 'kanban' | 'list'

function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso
}

function columnIcon(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('fazer') || n.includes('todo')) return '📂'
  if (n.includes('progresso') || n.includes('andamento')) return '⚡'
  if (n.includes('conclu') || n.includes('feito') || n.includes('done')) return '✅'
  return '📋'
}

export function Kanban({ event, onBack }: KanbanProps) {
  const themeStyle = getThemeStyle(
    event.theme_preset,
    event.theme_preset === 'custom'
      ? { primary: event.custom_primary, secondary: event.custom_secondary, accent: event.custom_accent }
      : undefined,
  ) as CSSProperties

  const { boards, columns, activeBoardId, loading, selectBoard } = useKanban(event.id)

  const [tasks, setTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})

  const [view, setView] = useState<ViewMode>('kanban')
  const [filter, setFilter] = useState<string>('all')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // Nova tarefa
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newColumnId, setNewColumnId] = useState('')
  const [adding, setAdding] = useState(false)

  const loadTasks = useCallback(async () => {
    const { data } = await fetchTasksByEvent(event.id, {
      orderBy: { column: 'position', ascending: true },
    })
    const list = data ?? []
    setTasks(list)

    const creatorIds = list.map((t) => t.created_by).filter(Boolean) as string[]
    if (creatorIds.length > 0) {
      const { data: profilesData } = await fetchProfiles(creatorIds)
      const map: Record<string, Profile> = {}
      for (const p of profilesData ?? []) map[p.id] = p
      setProfiles(map)
    }
  }, [event.id])

  const loadCategories = useCallback(async () => {
    const { data } = await fetchCategoriesByEvent(event.id)
    setCategories(data ?? [])
  }, [event.id])

  useEffect(() => {
    void loadTasks()
    void loadCategories()
  }, [loadTasks, loadCategories])

  const tasksForBoard = useMemo(
    () => tasks.filter((t) => (t.board_id ?? null) === activeBoardId),
    [tasks, activeBoardId],
  )

  const columnCount = (columnId: string | null) =>
    tasksForBoard.filter((t) => (t.column_id ?? null) === columnId).length

  const totalCount = tasksForBoard.length

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasksForBoard
    if (filter === 'favorites') return tasksForBoard.filter((t) => t.priority === 'high')
    return tasksForBoard.filter((t) => t.column_id === filter)
  }, [tasksForBoard, filter])

  const categoryById = (id: string | null) => categories.find((c) => c.id === id) ?? null

  const handleMoveTo = async (taskId: string, columnId: string | null) => {
    await moveTask(taskId, {
      column_id: columnId,
      position: columnCount(columnId) + 1,
    })
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, column_id: columnId } : t)))
  }

  const handleRemoveTask = async (id: string) => {
    const { error } = await deleteTask(id)
    if (!error) setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const openNewTask = () => {
    setNewColumnId(columns[0]?.id ?? '')
    setShowNewTask(true)
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    const { data, error: createError } = await createTask({
      event_id: event.id,
      title: newTitle.trim(),
      board_id: activeBoardId,
      column_id: newColumnId || null,
    })
    if (!createError && data) {
      setTasks((prev) => [...prev, data])
      setNewTitle('')
      setShowNewTask(false)
    }
    setAdding(false)
  }

  const renderTaskCard = (task: Task) => {
    const category = categoryById(task.category_id)
    const creator = task.created_by ? profiles[task.created_by] : null
    const favorite = task.priority === 'high'
    return (
      <article
        key={task.id}
        className="kb-card"
        onClick={() => setSelectedTaskId(task.id)}
      >
        <div className="kb-card-top">
          <span className="kb-tag">{category ? category.name : 'SEM CATEGORIA'}</span>
          <button
            type="button"
            className="kb-star"
            aria-label={favorite ? 'Favorita' : 'Não favorita'}
            aria-pressed={favorite}
            onClick={(e) => e.stopPropagation()}
          >
            {favorite ? '⭐' : '☆'}
          </button>
        </div>

        <h3 className="kb-card-title">{task.title}</h3>
        {task.description && <p className="kb-card-desc">{task.description}</p>}

        <div className="kb-card-foot">
          <span className="kb-date">
            <span aria-hidden="true">📅</span>
            {formatDateOnly(task.due_date) || 'Sem prazo'}
          </span>
          <select
            className="kb-select"
            value={task.column_id ?? ''}
            aria-label="Mover para"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => void handleMoveTo(task.id, e.target.value || null)}
          >
            <option value="">Sem coluna</option>
            {columns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="kb-card-author">
          {creator ? `Por ${creator.full_name || creator.email}` : 'Criado por você'}
        </div>
      </article>
    )
  }

  return (
    <div className="dashboard-shell" style={themeStyle}>
      <main className="kb-main">
        {/* Cabeçalho principal */}
        <header className="kb-header">
          <div className="kb-header-title-row">
            <span className="kb-header-icon" aria-hidden="true">☑</span>
            <div>
              <h1 className="kb-title">Checklist & Quadro Kanban</h1>
              <p className="kb-subtitle">
                Organize tarefas com auto-categorização inteligente e fluxo Kanban
              </p>
            </div>
          </div>

          <div className="kb-header-actions">
            <button type="button" className="kb-back-btn" onClick={onBack}>
              ← Voltar
            </button>

            {boards.length > 1 && (
              <select
                className="form-control kb-board-select"
                value={activeBoardId ?? ''}
                onChange={(e) => selectBoard(e.target.value)}
                aria-label="Quadro"
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}

            <div className="kb-view-toggle" role="tablist" aria-label="Modo de visualização">
              <button
                type="button"
                role="tab"
                aria-selected={view === 'kanban'}
                className={`kb-view-btn${view === 'kanban' ? ' is-active' : ''}`}
                onClick={() => setView('kanban')}
              >
                <span aria-hidden="true">▦</span> Kanban
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === 'list'}
                className={`kb-view-btn${view === 'list' ? ' is-active' : ''}`}
                onClick={() => setView('list')}
              >
                <span aria-hidden="true">☰</span> Lista
              </button>
            </div>

            <button type="button" className="kb-filter-btn" aria-label="Filtrar">
              <span aria-hidden="true">≣</span>
            </button>

            <button type="button" className="kb-new-btn" onClick={openNewTask}>
              + Nova Tarefa
            </button>
          </div>
        </header>

        {/* Pills de filtro */}
        <div className="kb-pills" role="tablist" aria-label="Filtrar tarefas">
          <button
            type="button"
            className={`kb-pill${filter === 'all' ? ' is-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todas ({totalCount})
          </button>
          {columns.map((col) => (
            <button
              key={col.id}
              type="button"
              className={`kb-pill${filter === col.id ? ' is-active' : ''}`}
              onClick={() => setFilter(col.id)}
            >
              {col.name} ({columnCount(col.id)})
            </button>
          ))}
          <button
            type="button"
            className={`kb-pill${filter === 'favorites' ? ' is-active' : ''}`}
            onClick={() => setFilter('favorites')}
          >
            Favoritas ⭐
          </button>
        </div>

        {/* Conteúdo */}
        {view === 'kanban' ? (
          loading ? (
            <div className="state-panel" style={{ minHeight: '220px' }}>
              <div className="state-spinner" role="status" aria-label="Carregando tarefas" />
            </div>
          ) : columns.length === 0 ? (
            <div className="guest-list-empty">
              Nenhuma coluna criada ainda. Crie colunas no seu quadro para começar.
            </div>
          ) : (
            <div className="kb-grid">
              {columns.map((col) => {
                const colTasks = filteredTasks.filter((t) => t.column_id === col.id)
                return (
                  <section key={col.id} className="kb-column">
                    <header className="kb-column-head">
                      <span className="kb-column-title">
                        <span className="kb-column-icon" aria-hidden="true">{columnIcon(col.name)}</span>
                        {col.name}
                      </span>
                      <span className="kb-column-count">{colTasks.length}</span>
                    </header>

                    <div className="kb-column-body">
                      {colTasks.length === 0 ? (
                        <div className="kb-column-empty">Sem tarefas</div>
                      ) : (
                        colTasks.map(renderTaskCard)
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          )
        ) : (
          <div className="kb-list">
            {filteredTasks.length === 0 ? (
              <div className="guest-list-empty">Nenhuma tarefa encontrada.</div>
            ) : (
              filteredTasks.map((task) => (
                <div key={task.id} className="kb-list-row" onClick={() => setSelectedTaskId(task.id)}>
                  <span className="kb-list-title">{task.title}</span>
                  <span className="kb-list-meta">
                    {categoryById(task.category_id)?.name ?? 'Sem categoria'}
                  </span>
                  <select
                    className="kb-select"
                    value={task.column_id ?? ''}
                    aria-label="Mover para"
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => void handleMoveTo(task.id, e.target.value || null)}
                  >
                    <option value="">Sem coluna</option>
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleRemoveTask(task.id)
                    }}
                  >
                    Remover
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Modal nova tarefa */}
      {showNewTask && (
        <div className="drawer-overlay" onClick={() => setShowNewTask(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-dialog-title">Nova tarefa</h3>
            <form onSubmit={handleAddTask} className="guest-form-row">
              <div className="form-field" style={{ flex: '1 1 280px' }}>
                <label className="form-label" htmlFor="kb-new-title">Título</label>
                <input
                  id="kb-new-title"
                  className="form-control"
                  type="text"
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Enviar Convites Oficiais"
                />
              </div>
              <div className="form-field" style={{ flex: '1 1 180px' }}>
                <label className="form-label" htmlFor="kb-new-column">Coluna</label>
                <select
                  id="kb-new-column"
                  className="form-control"
                  value={newColumnId}
                  onChange={(e) => setNewColumnId(e.target.value)}
                >
                  <option value="">Sem coluna</option>
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="confirm-dialog-actions" style={{ width: '100%' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowNewTask(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={adding || !newTitle.trim()}>
                  {adding ? 'Criando...' : 'Criar tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTaskId && (
        <TaskDetail
          event={event}
          task={tasks.find((t) => t.id === selectedTaskId) as Task}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={(updated) =>
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
          }
        />
      )}
    </div>
  )
}