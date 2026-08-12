import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Event, PastelColorKey, Task, Profile } from '../../lib/supabase/types'
import { getThemeStyle } from '../../utils/theme'
import { PASTEL_PALETTE_LIST, getPastelColor } from '../../utils/pastelPalette'
import { useKanban } from '../../hooks/useKanban'
import {
  fetchTasksByEvent,
  createTask,
  createTasks,
  fetchProfiles,
  deleteTask,
  moveTask,
} from '../../lib/supabase/database'

interface KanbanProps {
  event: Event
  onBack: () => void
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Kanban({ event, onBack }: KanbanProps) {
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
    boards,
    columns,
    activeBoardId,
    loading,
    error,
    addBoard,
    renameBoard,
    archiveBoard,
    setBoardColor,
    setPrimaryBoard,
    removeBoard,
    selectBoard,
    addColumn,
    renameColumn,
    removeColumn,
  } = useKanban(event.id)

  const [newBoardName, setNewBoardName] = useState('')
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)
  const [editingBoardName, setEditingBoardName] = useState('')

  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnColor, setNewColumnColor] = useState<PastelColorKey>('lavender')
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null)
  const [editingColumnName, setEditingColumnName] = useState('')

  // Tarefas
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [taskTitle, setTaskTitle] = useState('')
  const [taskColumnId, setTaskColumnId] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [bulkCount, setBulkCount] = useState<number | null>(null)
  const [adding, setAdding] = useState(false)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dropColumnId, setDropColumnId] = useState<string | null>(null)

  const activeBoard = boards.find((b) => b.id === activeBoardId) ?? null

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

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim()) return
    setAdding(true)
    const { data, error: createError } = await createTask({
      event_id: event.id,
      title: taskTitle.trim(),
      board_id: activeBoardId,
      column_id: taskColumnId || null,
    })
    if (!createError && data) {
      setTasks((prev) => [...prev, data])
      setTaskTitle('')
      const creatorId = data.created_by
      if (creatorId) {
        const existing = profiles[creatorId]
        if (existing) {
          setProfiles((prev) => ({ ...prev, [creatorId]: existing }))
        } else {
          const { data: profileData } = await fetchProfiles([creatorId])
          const first = profileData?.[0]
          if (first) setProfiles((prev) => ({ ...prev, [first.id]: first }))
        }
      }
    }
    setAdding(false)
  }

  const handleAddTasksBulk = async (e: React.FormEvent) => {
    e.preventDefault()
    const titles = bulkText.split('\n').map((s) => s.trim()).filter(Boolean)
    if (titles.length === 0) return
    setAdding(true)
    const { data, error: createError } = await createTasks(event.id, titles, {
      board_id: activeBoardId,
      column_id: taskColumnId || null,
    })
    if (!createError && data) {
      setTasks((prev) => [...data, ...prev])
      setBulkCount(data.length)
      setBulkText('')
      window.setTimeout(() => setBulkCount(null), 3000)
      const ids = data.map((t) => t.created_by).filter(Boolean) as string[]
      if (ids.length > 0) {
        const { data: profileData } = await fetchProfiles(ids)
        setProfiles((prev) => {
          const next = { ...prev }
          for (const p of profileData ?? []) next[p.id] = p
          return next
        })
      }
    }
    setAdding(false)
  }

  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBoardName.trim()) return
    await addBoard(newBoardName.trim(), { color_key: 'rose' })
    setNewBoardName('')
  }

  const handleRenameBoard = async (id: string) => {
    if (!editingBoardName.trim()) return
    await renameBoard(id, editingBoardName.trim())
    setEditingBoardId(null)
    setEditingBoardName('')
  }

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBoardId || !newColumnName.trim()) return
    await addColumn(activeBoardId, newColumnName.trim(), { color_key: newColumnColor })
    setNewColumnName('')
  }

  const handleRenameColumn = async (id: string) => {
    if (!editingColumnName.trim()) return
    await renameColumn(id, editingColumnName.trim())
    setEditingColumnId(null)
    setEditingColumnName('')
  }

  const handleRemoveTask = async (id: string) => {
    const { error: deleteError } = await deleteTask(id)
    if (!deleteError) setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const handleDropOnColumn = async (columnId: string | null) => {
    setDropColumnId(null)
    const taskId = draggingTaskId
    setDraggingTaskId(null)
    if (!taskId) return

    const targetColumnId = columnId ?? null
    await moveTask(taskId, {
      column_id: targetColumnId,
      position: tasksByColumn(targetColumnId).length + 1,
    })
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, column_id: targetColumnId } : t)),
    )
  }

  const handleMoveTo = async (taskId: string, columnId: string | null) => {
    await moveTask(taskId, {
      column_id: columnId,
      position: tasksByColumn(columnId).length + 1,
    })
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, column_id: columnId } : t)))
  }

  const tasksByColumn = (columnId: string | null) =>
    tasks.filter((t) => (t.column_id ?? null) === columnId && (t.board_id ?? null) === activeBoardId)

  return (
    <div className="dashboard-shell" style={themeStyle}>
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <span className="dashboard-brand-mark" aria-hidden="true">📋</span>
          <span className="dashboard-brand-name">Tarefas · {event.title}</span>
        </div>
        <div className="dashboard-controls">
          <button type="button" className="btn-secondary" onClick={onBack}>
            Voltar ao painel
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Quadros */}
        <section className="settings-section" aria-labelledby="boards-title">
          <h2 id="boards-title" className="settings-section-title">Quadros (Kanbans)</h2>
          <p className="settings-section-desc">
            Crie quadros e colunas personalizados para organizar o planejamento do evento.
          </p>

          <div className="board-list">
            {boards.map((board) => {
              const color = getPastelColor(board.color_key)
              const isActive = board.id === activeBoardId
              return (
                <div
                  key={board.id}
                  className={`board-item${isActive ? ' is-active' : ''}${board.is_archived ? ' is-archived' : ''}`}
                  style={{ borderLeftColor: color.accent }}
                >
                  <button
                    type="button"
                    className="board-item-main"
                    onClick={() => selectBoard(board.id)}
                  >
                    <span className="board-item-name">
                      {board.is_primary ? '⭐ ' : ''}{board.name}
                    </span>
                    <span className="board-item-meta">
                      {board.is_archived ? 'Arquivado' : `${color.label}`}
                    </span>
                  </button>

                  <div className="board-item-actions">
                    {editingBoardId === board.id ? (
                      <>
                        <input
                          className="form-control"
                          value={editingBoardName}
                          onChange={(e) => setEditingBoardName(e.target.value)}
                          autoFocus
                        />
                        <button type="button" className="btn-primary" onClick={() => void handleRenameBoard(board.id)}>
                          Salvar
                        </button>
                      </>
                    ) : (
                      <>
                        <select
                          className="form-control"
                          value={board.color_key}
                          aria-label={`Cor do quadro ${board.name}`}
                          onChange={(e) => void setBoardColor(board.id, e.target.value as PastelColorKey)}
                        >
                          {PASTEL_PALETTE_LIST.map((c) => (
                            <option key={c.key} value={c.key}>{c.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            setEditingBoardId(board.id)
                            setEditingBoardName(board.name)
                          }}
                        >
                          Renomear
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => void archiveBoard(board.id, !board.is_archived)}
                        >
                          {board.is_archived ? 'Desarquivar' : 'Arquivar'}
                        </button>
                        {!board.is_primary && (
                          <button type="button" className="btn-secondary" onClick={() => void setPrimaryBoard(board.id)}>
                            Principal
                          </button>
                        )}
                        <button type="button" className="btn-secondary" onClick={() => void removeBoard(board.id)}>
                          Excluir
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <form onSubmit={handleAddBoard} className="guest-form-row">
            <div className="form-field" style={{ flex: '1 1 220px' }}>
              <label className="form-label" htmlFor="board-name">Nome do quadro</label>
              <input
                id="board-name"
                className="form-control"
                type="text"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Ex: Planejamento do Casamento"
              />
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button type="submit" className="btn-primary" disabled={!newBoardName.trim()}>
                Criar quadro
              </button>
            </div>
          </form>
        </section>

        {/* Colunas + tarefas do quadro ativo */}
        {activeBoard && (
          <section className="settings-section" aria-labelledby="columns-title" style={{ marginTop: '1.5rem' }}>
            <h2 id="columns-title" className="settings-section-title">
              Colunas · {activeBoard.name}
            </h2>
            <p className="settings-section-desc">
              Organize as etapas deste quadro e adicione tarefas rapidamente.
            </p>

            {loading ? (
              <div className="state-panel" style={{ minHeight: '120px' }}>
                <div className="state-spinner" role="status" aria-label="Carregando colunas" />
              </div>
            ) : (
              <div className="kanban-columns">
                {columns.map((col) => {
                  const color = getPastelColor(col.color_key)
                  const colTasks = tasksByColumn(col.id)
                  return (
                    <div
                      key={col.id}
                      className={`kanban-column${dropColumnId === col.id ? ' is-drop-target' : ''}`}
                      style={{ borderTopColor: color.accent }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        setDropColumnId(col.id)
                      }}
                      onDragLeave={() => {
                        if (dropColumnId === col.id) setDropColumnId(null)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        void handleDropOnColumn(col.id)
                      }}
                    >
                      <div className="kanban-column-header">
                        <span className="column-item-name">
                          {col.is_completion ? '✅ ' : ''}{col.name}
                        </span>
                        <span className="kanban-column-count">{colTasks.length}</span>
                        <div className="group-actions">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => {
                              setEditingColumnId(col.id)
                              setEditingColumnName(col.name)
                            }}
                          >
                            Editar
                          </button>
                          <button type="button" className="btn-secondary" onClick={() => void removeColumn(col.id)}>
                            Excluir
                          </button>
                        </div>
                      </div>

                      {editingColumnId === col.id && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <input
                            className="form-control"
                            value={editingColumnName}
                            onChange={(e) => setEditingColumnName(e.target.value)}
                            autoFocus
                          />
                          <button type="button" className="btn-primary" onClick={() => void handleRenameColumn(col.id)}>
                            Salvar
                          </button>
                        </div>
                      )}

                      <ul className="task-list">
                        {colTasks.map((task) => {
                          const creator = task.created_by ? profiles[task.created_by] : null
                          return (
                            <li
                              key={task.id}
                              className={`task-card${draggingTaskId === task.id ? ' is-dragging' : ''}`}
                              draggable
                              onDragStart={() => setDraggingTaskId(task.id)}
                              onDragEnd={() => {
                                setDraggingTaskId(null)
                                setDropColumnId(null)
                              }}
                            >
                              <div className="task-card-top">
                                <span className="task-card-title">{task.title}</span>
                                <span className="task-card-menu" aria-label={`Opções de ${task.title}`}>
                                  ⋮
                                </span>
                              </div>
                              {task.priority && (
                                <span className="task-card-badge">
                                  {PRIORITY_LABELS[task.priority] ?? task.priority}
                                </span>
                              )}
                              <span className="task-card-meta">
                                {creator ? `Por ${creator.full_name || creator.email}` : 'Criado'} ·{' '}
                                {formatDateTime(task.created_at)}
                              </span>

                              <div className="task-card-actions">
                                <label className="sr-only" htmlFor={`move-${task.id}`}>
                                  Mover para
                                </label>
                                <select
                                  id={`move-${task.id}`}
                                  className="form-control"
                                  value={task.column_id ?? ''}
                                  onChange={(e) => {
                                    void handleMoveTo(task.id, e.target.value || null)
                                  }}
                                >
                                  <option value="">Sem coluna</option>
                                  {columns.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="btn-secondary"
                                  onClick={() => void handleRemoveTask(task.id)}
                                >
                                  Remover
                                </button>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Adicionar coluna */}
            <form onSubmit={handleAddColumn} className="guest-form-row" style={{ marginTop: '1rem' }}>
              <div className="form-field" style={{ flex: '1 1 220px' }}>
                <label className="form-label" htmlFor="column-name">Nova coluna</label>
                <input
                  id="column-name"
                  className="form-control"
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Ex: Ideias"
                />
              </div>
              <div className="form-field" style={{ flex: '0 1 140px' }}>
                <label className="form-label" htmlFor="column-color">Cor</label>
                <select
                  id="column-color"
                  className="form-control"
                  value={newColumnColor}
                  onChange={(e) => setNewColumnColor(e.target.value as PastelColorKey)}
                >
                  {PASTEL_PALETTE_LIST.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ alignSelf: 'flex-end' }}>
                <button type="submit" className="btn-primary" disabled={!newColumnName.trim()}>
                  Adicionar coluna
                </button>
              </div>
            </form>

            {/* Adicionar tarefa */}
            <div className="quick-add" style={{ marginTop: '1.25rem' }}>
              <div className="quick-add-tabs" role="tablist" aria-label="Forma de adicionar tarefa">
                <span className="quick-add-tab is-active">Uma por vez</span>
              </div>

              <form onSubmit={handleAddTask} className="guest-form-row">
                <div className="form-field" style={{ flex: '2 1 260px' }}>
                  <label className="form-label" htmlFor="task-title">Título da tarefa</label>
                  <input
                    id="task-title"
                    className="form-control"
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Ex: Contratar fotógrafo"
                  />
                </div>
                <div className="form-field" style={{ flex: '1 1 180px' }}>
                  <label className="form-label" htmlFor="task-column">Coluna</label>
                  <select
                    id="task-column"
                    className="form-control"
                    value={taskColumnId}
                    onChange={(e) => setTaskColumnId(e.target.value)}
                  >
                    <option value="">Sem coluna</option>
                    {columns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ alignSelf: 'flex-end' }}>
                  <button type="submit" className="btn-primary" disabled={adding || !taskTitle.trim()}>
                    {adding ? 'Adicionando...' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>

            {/* Adicionar várias tarefas */}
            <div className="quick-add" style={{ marginTop: '1rem' }}>
              <form onSubmit={handleAddTasksBulk} className="quick-add-bulk">
                <label className="form-label" htmlFor="task-bulk">
                  Adicionar várias de uma vez (um título por linha)
                </label>
                <textarea
                  id="task-bulk"
                  className="form-control"
                  rows={3}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={'Contratar buffet\nContratar fotógrafo\nEscolher decoração'}
                />
                <button type="submit" className="btn-primary" disabled={adding || !bulkText.trim()}>
                  {adding ? 'Adicionando...' : 'Adicionar tarefas'}
                </button>
              </form>
            </div>

            {bulkCount !== null && (
              <p className="auth-success" role="status" style={{ marginTop: '1rem' }}>
                ✓ {bulkCount} {bulkCount === 1 ? 'tarefa adicionada' : 'tarefas adicionadas'}.
              </p>
            )}
          </section>
        )}

        {error && (
          <p className="auth-error" role="alert" style={{ marginTop: '1rem' }}>
            ⚠ {error}
          </p>
        )}
      </main>
    </div>
  )
}