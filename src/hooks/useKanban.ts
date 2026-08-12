import { useCallback, useEffect, useState } from 'react'
import type { Board, BoardColumn, PastelColorKey } from '../lib/supabase/types'
import {
  fetchBoardsByEvent,
  createBoard,
  updateBoard,
  deleteBoard,
  fetchColumnsByBoard,
  createColumn,
  updateColumn,
  deleteColumn,
} from '../lib/supabase/database'

export interface KanbanState {
  boards: Board[]
  columns: BoardColumn[]
  activeBoardId: string | null
  columnsLoading: boolean
  loading: boolean
  error: string | null

  addBoard: (name: string, options?: { description?: string; color_key?: PastelColorKey }) => Promise<Board | null>
  renameBoard: (id: string, name: string) => Promise<void>
  archiveBoard: (id: string, archived: boolean) => Promise<void>
  setBoardColor: (id: string, color_key: PastelColorKey) => Promise<void>
  setPrimaryBoard: (id: string) => Promise<void>
  removeBoard: (id: string) => Promise<void>
  selectBoard: (id: string) => void

  addColumn: (boardId: string, name: string, options?: Partial<Pick<BoardColumn, 'color_key' | 'is_initial' | 'is_completion'>>) => Promise<BoardColumn | null>
  renameColumn: (id: string, name: string) => Promise<void>
  removeColumn: (id: string) => Promise<void>
}

/** Hook do módulo Kanban: carrega boards e colunas e expõe as ações. */
export function useKanban(eventId: string): KanbanState {
  const [boards, setBoards] = useState<Board[]>([])
  const [columns, setColumns] = useState<BoardColumn[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await fetchBoardsByEvent(eventId)
      if (!mounted) return
      if (fetchError) {
        setError(fetchError.message)
      } else {
        const list = data ?? []
        setBoards(list)
        const primary = list.find((b) => b.is_primary && !b.is_archived) ?? list[0]
        setActiveBoardId(primary?.id ?? null)
      }
      setLoading(false)
    }
    void load()
    return () => {
      mounted = false
    }
  }, [eventId])

  const loadColumns = useCallback(async (boardId: string) => {
    setColumnsLoading(true)
    const { data, error: fetchError } = await fetchColumnsByBoard(boardId)
    if (fetchError) {
      setError(fetchError.message)
      setColumns([])
    } else {
      setColumns(data ?? [])
    }
    setColumnsLoading(false)
  }, [])

  useEffect(() => {
    if (activeBoardId) {
      void loadColumns(activeBoardId)
    } else {
      setColumns([])
    }
  }, [activeBoardId, loadColumns])

  const addBoard = useCallback(
    async (name: string, options?: { description?: string; color_key?: PastelColorKey }) => {
      const { data, error: createError } = await createBoard({
        event_id: eventId,
        name,
        description: options?.description ?? null,
        color_key: options?.color_key ?? 'rose',
        sort_order: boards.length,
      })
      if (createError || !data) {
        setError('Não foi possível criar o quadro.')
        return null
      }
      setBoards((prev) => [...prev, data])
      setActiveBoardId(data.id)
      return data
    },
    [eventId, boards.length],
  )

  const renameBoard = useCallback(async (id: string, name: string) => {
    const { error: updateError } = await updateBoard(id, { name })
    if (updateError) {
      setError('Não foi possível renomear o quadro.')
      return
    }
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, name } : b)))
  }, [])

  const archiveBoard = useCallback(async (id: string, archived: boolean) => {
    const { error: updateError } = await updateBoard(id, { is_archived: archived })
    if (updateError) {
      setError('Não foi possível arquivar o quadro.')
      return
    }
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, is_archived: archived } : b)))
  }, [])

  const setBoardColor = useCallback(async (id: string, color_key: PastelColorKey) => {
    const { error: updateError } = await updateBoard(id, { color_key })
    if (updateError) {
      setError('Não foi possível alterar a cor do quadro.')
      return
    }
    setBoards((prev) => prev.map((b) => (b.id === id ? { ...b, color_key } : b)))
  }, [])

  const setPrimaryBoard = useCallback(
    async (id: string) => {
      // unset todos e seta o escolhido (apenas um principal)
      await Promise.all(boards.filter((b) => b.is_primary).map((b) => updateBoard(b.id, { is_primary: false })))
      const { error: updateError } = await updateBoard(id, { is_primary: true })
      if (updateError) {
        setError('Não foi possível definir o quadro principal.')
        return
      }
      setBoards((prev) => prev.map((b) => ({ ...b, is_primary: b.id === id })))
    },
    [boards],
  )

  const removeBoard = useCallback(async (id: string) => {
    const { error: deleteError } = await deleteBoard(id)
    if (deleteError) {
      setError('Não foi possível excluir o quadro.')
      return
    }
    setBoards((prev) => prev.filter((b) => b.id !== id))
    setActiveBoardId((cur) => (cur === id ? null : cur))
  }, [])

  const selectBoard = useCallback((id: string) => {
    setActiveBoardId(id)
  }, [])

  const addColumn = useCallback(
    async (
      boardId: string,
      name: string,
      options?: Partial<Pick<BoardColumn, 'color_key' | 'is_initial' | 'is_completion'>>,
    ) => {
      const { data, error: createError } = await createColumn({
        board_id: boardId,
        name,
        color_key: options?.color_key ?? 'lavender',
        is_initial: options?.is_initial ?? false,
        is_completion: options?.is_completion ?? false,
        sort_order: columns.length,
      })
      if (createError || !data) {
        setError('Não foi possível criar a coluna.')
        return null
      }
      setColumns((prev) => [...prev, data])
      return data
    },
    [columns.length],
  )

  const renameColumn = useCallback(async (id: string, name: string) => {
    const { error: updateError } = await updateColumn(id, { name })
    if (updateError) {
      setError('Não foi possível renomear a coluna.')
      return
    }
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))
  }, [])

  const removeColumn = useCallback(async (id: string) => {
    const { error: deleteError } = await deleteColumn(id)
    if (deleteError) {
      setError('Não foi possível excluir a coluna.')
      return
    }
    setColumns((prev) => prev.filter((c) => c.id !== id))
  }, [])

  return {
    boards,
    columns,
    activeBoardId,
    columnsLoading,
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
  }
}