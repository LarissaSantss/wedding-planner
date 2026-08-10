import { supabase } from './client'

// ========== OPERAÇÕES GENÉRICAS DE BANCO ==========

/**
 * Busca todos os registros de uma tabela
 */
export async function fetchAll<T>(
  table: string,
  options?: {
    columns?: string
    orderBy?: { column: string; ascending?: boolean }
  },
): Promise<{ data: T[] | null; error: Error | null }> {
  const query = supabase.from(table).select(options?.columns ?? '*')

  if (options?.orderBy) {
    query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? true,
    })
  }

  const { data, error } = await query
  return { data: data as T[] | null, error }
}

/**
 * Busca registros de uma tabela com filtros
 */
export async function fetchWithFilter<T>(
  table: string,
  filters: Record<string, string | number | boolean>,
  options?: {
    columns?: string
    limit?: number
    orderBy?: { column: string; ascending?: boolean }
  },
): Promise<{ data: T[] | null; error: Error | null }> {
  let query = supabase.from(table).select(options?.columns ?? '*')

  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value)
  }

  if (options?.orderBy) {
    query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? true,
    })
  }

  if (options?.limit) {
    query.limit(options.limit)
  }

  const { data, error } = await query
  return { data: data as T[] | null, error }
}

/**
 * Busca um único registro pelo ID
 */
export async function fetchById<T>(
  table: string,
  id: string,
  options?: { columns?: string },
): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await supabase
    .from(table)
    .select(options?.columns ?? '*')
    .eq('id', id)
    .single()

  return { data: data as T | null, error }
}

/**
 * Insere um novo registro
 */
export async function insertRecord<T>(
  table: string,
  values: Record<string, unknown>,
): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await supabase
    .from(table)
    .insert(values)
    .select()
    .single()

  return { data: data as T | null, error }
}

/**
 * Atualiza um registro existente
 */
export async function updateRecord<T>(
  table: string,
  id: string,
  values: Record<string, unknown>,
): Promise<{ data: T | null; error: Error | null }> {
  const { data, error } = await supabase
    .from(table)
    .update(values)
    .eq('id', id)
    .select()
    .single()

  return { data: data as T | null, error }
}

/**
 * Remove um registro pelo ID
 */
export async function deleteRecord(
  table: string,
  id: string,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from(table).delete().eq('id', id)
  return { error }
}

/**
 * Busca registros em tempo real (real-time)
 */
export function subscribeToTable(
  table: string,
  callback: (payload: { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null }) => void,
) {
  return supabase
    .channel(`table-${table}-changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as Record<string, unknown> | null,
          old: payload.old as Record<string, unknown> | null,
        })
      },
    )
    .subscribe()
}