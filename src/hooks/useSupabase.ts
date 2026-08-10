import { useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook que expõe o cliente Supabase e helpers de banco
 *
 * Uso:
 * const { supabase, fetchAll, insertRecord } = useSupabase()
 */
export function useSupabase() {
  const fetchAll = useCallback(
    async <T>(table: string, options?: { columns?: string; orderBy?: { column: string; ascending?: boolean } }) => {
      const query = supabase.from(table).select(options?.columns ?? '*')
      if (options?.orderBy) {
        query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true })
      }
      const { data, error } = await query
      return { data: data as T[] | null, error }
    },
    [],
  )

  const fetchById = useCallback(async <T>(table: string, id: string) => {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
    return { data: data as T | null, error }
  }, [])

  const insert = useCallback(async <T>(table: string, values: Record<string, unknown>) => {
    const { data, error } = await supabase.from(table).insert(values).select().single()
    return { data: data as T | null, error }
  }, [])

  const update = useCallback(
    async <T>(table: string, id: string, values: Record<string, unknown>) => {
      const { data, error } = await supabase.from(table).update(values).eq('id', id).select().single()
      return { data: data as T | null, error }
    },
    [],
  )

  const remove = useCallback(async (table: string, id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    return { error }
  }, [])

  return {
    supabase,
    fetchAll,
    fetchById,
    insert,
    update,
    remove,
  }
}