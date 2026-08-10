import { supabase } from './client'
import type {
  Event,
  EventInsert,
  EventUpdate,
  Guest,
  GuestInsert,
  Vendor,
  VendorInsert,
  Task,
  TaskInsert,
  Expense,
  ExpenseInsert,
  GiftRegistryItem,
  GiftRegistryItemInsert,
} from './types'

// ========== TIPOS DE RESPOSTA ==========

export interface QueryResult<T> {
  data: T | null
  error: Error | null
}

export interface QueryListResult<T> {
  data: T[] | null
  error: Error | null
}

export interface QueryOptions {
  columns?: string
  orderBy?: { column: string; ascending?: boolean }
  limit?: number
}

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

// ========== OPERAÇÕES ESPECÍFICAS: EVENTS ==========

/**
 * Busca todos os eventos do usuário autenticado.
 * A RLS garante que apenas eventos do próprio usuário sejam retornados.
 */
export async function fetchUserEvents(
  options?: QueryOptions,
): Promise<QueryListResult<Event>> {
  return fetchAll<Event>('events', {
    ...options,
    orderBy: options?.orderBy ?? { column: 'created_at', ascending: false },
  })
}

/**
 * Busca um evento pelo ID (RLS valida a propriedade).
 */
export async function fetchEventById(id: string): Promise<QueryResult<Event>> {
  return fetchById<Event>('events', id)
}

/**
 * Cria um novo evento.
 * O `user_id` é preenchido automaticamente pela RLS (auth.uid()).
 */
export async function createEvent(values: EventInsert): Promise<QueryResult<Event>> {
  return insertRecord<Event>('events', values as Record<string, unknown>)
}

/**
 * Atualiza um evento existente.
 */
export async function updateEvent(
  id: string,
  values: EventUpdate,
): Promise<QueryResult<Event>> {
  return updateRecord<Event>('events', id, values as Record<string, unknown>)
}

/**
 * Remove um evento e, por cascade, todos os dados relacionados.
 */
export async function deleteEvent(id: string): Promise<{ error: Error | null }> {
  return deleteRecord('events', id)
}

// ========== OPERAÇÕES ESPECÍFICAS: GUESTS ==========

/**
 * Busca todos os convidados de um evento.
 */
export async function fetchGuestsByEvent(
  eventId: string,
  options?: QueryOptions,
): Promise<QueryListResult<Guest>> {
  return fetchWithFilter<Guest>('guests', { event_id: eventId }, options)
}

/**
 * Cria um novo convidado para um evento.
 */
export async function createGuest(values: GuestInsert): Promise<QueryResult<Guest>> {
  return insertRecord<Guest>('guests', values as Record<string, unknown>)
}

/**
 * Atualiza um convidado existente.
 */
export async function updateGuest(
  id: string,
  values: Partial<Guest>,
): Promise<QueryResult<Guest>> {
  return updateRecord<Guest>('guests', id, values as Record<string, unknown>)
}

/**
 * Remove um convidado.
 */
export async function deleteGuest(id: string): Promise<{ error: Error | null }> {
  return deleteRecord('guests', id)
}

// ========== OPERAÇÕES ESPECÍFICAS: VENDORS ==========

/**
 * Busca todos os fornecedores de um evento.
 */
export async function fetchVendorsByEvent(
  eventId: string,
  options?: QueryOptions,
): Promise<QueryListResult<Vendor>> {
  return fetchWithFilter<Vendor>('vendors', { event_id: eventId }, options)
}

/**
 * Cria um novo fornecedor para um evento.
 */
export async function createVendor(values: VendorInsert): Promise<QueryResult<Vendor>> {
  return insertRecord<Vendor>('vendors', values as Record<string, unknown>)
}

/**
 * Atualiza um fornecedor existente.
 */
export async function updateVendor(
  id: string,
  values: Partial<Vendor>,
): Promise<QueryResult<Vendor>> {
  return updateRecord<Vendor>('vendors', id, values as Record<string, unknown>)
}

/**
 * Remove um fornecedor.
 */
export async function deleteVendor(id: string): Promise<{ error: Error | null }> {
  return deleteRecord('vendors', id)
}

// ========== OPERAÇÕES ESPECÍFICAS: TASKS ==========

/**
 * Busca todas as tarefas de um evento.
 */
export async function fetchTasksByEvent(
  eventId: string,
  options?: QueryOptions,
): Promise<QueryListResult<Task>> {
  return fetchWithFilter<Task>('tasks', { event_id: eventId }, options)
}

/**
 * Cria uma nova tarefa para um evento.
 */
export async function createTask(values: TaskInsert): Promise<QueryResult<Task>> {
  return insertRecord<Task>('tasks', values as Record<string, unknown>)
}

/**
 * Atualiza uma tarefa existente.
 */
export async function updateTask(
  id: string,
  values: Partial<Task>,
): Promise<QueryResult<Task>> {
  return updateRecord<Task>('tasks', id, values as Record<string, unknown>)
}

/**
 * Remove uma tarefa.
 */
export async function deleteTask(id: string): Promise<{ error: Error | null }> {
  return deleteRecord('tasks', id)
}

// ========== OPERAÇÕES ESPECÍFICAS: EXPENSES ==========

/**
 * Busca todas as despesas de um evento.
 */
export async function fetchExpensesByEvent(
  eventId: string,
  options?: QueryOptions,
): Promise<QueryListResult<Expense>> {
  return fetchWithFilter<Expense>('expenses', { event_id: eventId }, options)
}

/**
 * Cria uma nova despesa para um evento.
 */
export async function createExpense(values: ExpenseInsert): Promise<QueryResult<Expense>> {
  return insertRecord<Expense>('expenses', values as Record<string, unknown>)
}

/**
 * Atualiza uma despesa existente.
 */
export async function updateExpense(
  id: string,
  values: Partial<Expense>,
): Promise<QueryResult<Expense>> {
  return updateRecord<Expense>('expenses', id, values as Record<string, unknown>)
}

/**
 * Remove uma despesa.
 */
export async function deleteExpense(id: string): Promise<{ error: Error | null }> {
  return deleteRecord('expenses', id)
}

// ========== OPERAÇÕES ESPECÍFICAS: GIFT REGISTRY ==========

/**
 * Busca todos os itens da lista de presentes de um evento.
 */
export async function fetchGiftRegistryByEvent(
  eventId: string,
  options?: QueryOptions,
): Promise<QueryListResult<GiftRegistryItem>> {
  return fetchWithFilter<GiftRegistryItem>(
    'gift_registry_items',
    { event_id: eventId },
    options,
  )
}

/**
 * Cria um novo item na lista de presentes.
 */
export async function createGiftRegistryItem(
  values: GiftRegistryItemInsert,
): Promise<QueryResult<GiftRegistryItem>> {
  return insertRecord<GiftRegistryItem>(
    'gift_registry_items',
    values as Record<string, unknown>,
  )
}

/**
 * Atualiza um item da lista de presentes.
 */
export async function updateGiftRegistryItem(
  id: string,
  values: Partial<GiftRegistryItem>,
): Promise<QueryResult<GiftRegistryItem>> {
  return updateRecord<GiftRegistryItem>(
    'gift_registry_items',
    id,
    values as Record<string, unknown>,
  )
}

/**
 * Remove um item da lista de presentes.
 */
export async function deleteGiftRegistryItem(
  id: string,
): Promise<{ error: Error | null }> {
  return deleteRecord('gift_registry_items', id)
}
