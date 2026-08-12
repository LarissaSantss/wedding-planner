import { supabase } from './client'
import type {
  Profile,
  Event,
  EventInsert,
  EventUpdate,
  Guest,
  GuestInsert,
  GuestGroup,
  GuestGroupInsert,
  GuestCompanion,
  GuestCompanionInsert,
  GuestVote,
  GuestVoteValue,
  GuestComment,
  GuestCommentInsert,
  EventMember,
  EventMemberRole,
  GuestPriority,
  Vendor,
  VendorInsert,
  Task,
  TaskInsert,
  Board,
  BoardInsert,
  BoardColumn,
  BoardColumnInsert,
  TaskCategory,
  TaskCategoryInsert,
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
 * O `user_id` é obtido da sessão autenticada e enviado no insert,
 * pois a coluna é NOT NULL e a RLS exige `auth.uid() = user_id`.
 */
export async function createEvent(values: EventInsert): Promise<QueryResult<Event>> {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user?.id
  if (!userId) {
    return { data: null, error: new Error('NOT_AUTHENTICATED') }
  }
  return insertRecord<Event>('events', {
    ...values,
    user_id: userId,
  } as Record<string, unknown>)
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

/**
 * Entra em um evento existente usando o código de acesso.
 * A RPC (security definer) localiza o evento pelo código e registra
 * o usuário autenticado como membro (editor) do evento.
 */
export async function joinEventByCode(code: string): Promise<QueryResult<Event>> {
  const { data, error } = await supabase.rpc('join_event_by_code', { p_code: code })
  return { data: data as Event | null, error }
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
 * O `created_by` vem da sessão. Só `name` e `event_id` são obrigatórios.
 */
export async function createGuest(values: GuestInsert): Promise<QueryResult<Guest>> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id ?? null
  return insertRecord<Guest>('guests', {
    ...values,
    created_by: userId,
  } as Record<string, unknown>)
}

/**
 * Cadastro rápido: cria vários convidados de uma só vez.
 * Cada item exige apenas `name`; os demais campos ficam pendentes.
 */
export async function createGuests(
  eventId: string,
  names: string[],
): Promise<QueryListResult<Guest>> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id ?? null

  const rows = names.map((name) => ({
    event_id: eventId,
    name: name.trim(),
    created_by: userId,
  }))

  const { data, error } = await supabase
    .from('guests')
    .insert(rows)
    .select()

  return { data: data as Guest[] | null, error }
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
 * Injeta `created_by` da sessão. Só `title` + `event_id` são obrigatórios.
 */
export async function createTask(values: TaskInsert): Promise<QueryResult<Task>> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id ?? null
  return insertRecord<Task>('tasks', {
    ...values,
    created_by: userId,
  } as Record<string, unknown>)
}

/**
 * Cria várias tarefas de uma vez (um título por linha).
 * Cada tarefa recebe board_id/column_id opcionais e `created_by` da sessão.
 */
export async function createTasks(
  eventId: string,
  titles: string[],
  context?: { board_id?: string | null; column_id?: string | null },
): Promise<QueryListResult<Task>> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id ?? null

  const rows = titles.map((title) => ({
    event_id: eventId,
    title: title.trim(),
    board_id: context?.board_id ?? null,
    column_id: context?.column_id ?? null,
    created_by: userId,
  }))

  const { data, error } = await supabase.from('tasks').insert(rows).select()

  return { data: data as Task[] | null, error }
}

/**
 * Busca perfis por IDs (para exibir quem criou cada tarefa).
 */
export async function fetchProfiles(ids: string[]): Promise<QueryListResult<Profile>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) {
    return { data: [], error: null }
  }
  const { data, error } = await supabase.from('profiles').select('*').in('id', unique)
  return { data: data as Profile[] | null, error }
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

/**
 * Move uma tarefa para outra coluna/posição.
 * `position` é a ordem (1-based) dentro da coluna de destino.
 */
export async function moveTask(
  id: string,
  input: { column_id: string | null; position: number },
): Promise<QueryResult<Task>> {
  return updateRecord<Task>('tasks', id, {
    column_id: input.column_id,
    position: input.position,
  } as Record<string, unknown>)
}

/**
 * Persiste a nova ordem de várias tarefas (upsert por id).
 * Cada item define id, column_id e position.
 */
export async function updateTaskPositions(
  updates: Array<{ id: string; column_id: string | null; position: number }>,
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('tasks').upsert(
    updates.map((u) => ({
      id: u.id,
      column_id: u.column_id,
      position: u.position,
    })),
  )
  return { error }
}

// ========== OPERAÇÕES ESPECÍFICAS: KANBAN (BOARDS / COLUNAS) ==========

/** Busca os quadros de um evento. */
export async function fetchBoardsByEvent(
  eventId: string,
): Promise<QueryListResult<Board>> {
  return fetchWithFilter<Board>('boards', { event_id: eventId }, {
    orderBy: { column: 'sort_order', ascending: true },
  })
}

/** Cria um quadro. */
export async function createBoard(values: BoardInsert): Promise<QueryResult<Board>> {
  return insertRecord<Board>('boards', values as Record<string, unknown>)
}

/** Atualiza um quadro. */
export async function updateBoard(
  id: string,
  values: Partial<Board>,
): Promise<QueryResult<Board>> {
  return updateRecord<Board>('boards', id, values as Record<string, unknown>)
}

/** Remove um quadro (cascade remove colunas; tarefas ficam órfãs via SET NULL). */
export async function deleteBoard(id: string): Promise<{ error: Error | null }> {
  return deleteRecord('boards', id)
}

/** Busca as colunas de um quadro. */
export async function fetchColumnsByBoard(
  boardId: string,
): Promise<QueryListResult<BoardColumn>> {
  return fetchWithFilter<BoardColumn>('board_columns', { board_id: boardId }, {
    orderBy: { column: 'sort_order', ascending: true },
  })
}

/** Cria uma coluna. */
export async function createColumn(
  values: BoardColumnInsert,
): Promise<QueryResult<BoardColumn>> {
  return insertRecord<BoardColumn>('board_columns', values as Record<string, unknown>)
}

/** Atualiza uma coluna. */
export async function updateColumn(
  id: string,
  values: Partial<BoardColumn>,
): Promise<QueryResult<BoardColumn>> {
  return updateRecord<BoardColumn>('board_columns', id, values as Record<string, unknown>)
}

/** Remove uma coluna (tarefas viram órfãs via SET NULL). */
export async function deleteColumn(id: string): Promise<{ error: Error | null }> {
  return deleteRecord('board_columns', id)
}

// ========== OPERAÇÕES ESPECÍFICAS: CATEGORIAS ==========

/** Busca as categorias de um evento. */
export async function fetchCategoriesByEvent(
  eventId: string,
): Promise<QueryListResult<TaskCategory>> {
  return fetchWithFilter<TaskCategory>('task_categories', { event_id: eventId }, {
    orderBy: { column: 'sort_order', ascending: true },
  })
}

/** Cria uma categoria. */
export async function createCategory(
  values: TaskCategoryInsert,
): Promise<QueryResult<TaskCategory>> {
  return insertRecord<TaskCategory>('task_categories', values as Record<string, unknown>)
}

/** Atualiza uma categoria. */
export async function updateCategory(
  id: string,
  values: Partial<TaskCategory>,
): Promise<QueryResult<TaskCategory>> {
  return updateRecord<TaskCategory>('task_categories', id, values as Record<string, unknown>)
}

/** Remove uma categoria. */
export async function deleteCategory(id: string): Promise<{ error: Error | null }> {
  return deleteRecord('task_categories', id)
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

// ========== OPERAÇÕES ESPECÍFICAS: GRUPOS DE CONVIDADOS ==========

/** Busca os grupos de um evento. */
export async function fetchGuestGroups(
  eventId: string,
): Promise<QueryListResult<GuestGroup>> {
  return fetchWithFilter<GuestGroup>('event_guest_groups', { event_id: eventId }, {
    orderBy: { column: 'created_at', ascending: true },
  })
}

/** Cria um grupo para um evento. */
export async function createGuestGroup(
  values: GuestGroupInsert,
): Promise<QueryResult<GuestGroup>> {
  return insertRecord<GuestGroup>('event_guest_groups', values as Record<string, unknown>)
}

/** Renomeia um grupo. */
export async function updateGuestGroup(
  id: string,
  values: Partial<GuestGroup>,
): Promise<QueryResult<GuestGroup>> {
  return updateRecord<GuestGroup>('event_guest_groups', id, values as Record<string, unknown>)
}

/** Remove um grupo (convidados ligados ficam sem grupo via SET NULL). */
export async function deleteGuestGroup(id: string): Promise<{ error: Error | null }> {
  return deleteRecord('event_guest_groups', id)
}

// ========== OPERAÇÕES ESPECÍFICAS: ACOMPANHANTES ==========

/** Busca acompanhantes de um convidado. */
export async function fetchCompanionsByGuest(
  guestId: string,
): Promise<QueryListResult<GuestCompanion>> {
  return fetchWithFilter<GuestCompanion>('guest_companions', { guest_id: guestId }, {
    orderBy: { column: 'created_at', ascending: true },
  })
}

/** Cria um acompanhante. */
export async function createCompanion(
  values: GuestCompanionInsert,
): Promise<QueryResult<GuestCompanion>> {
  return insertRecord<GuestCompanion>('guest_companions', values as Record<string, unknown>)
}

/** Atualiza um acompanhante. */
export async function updateCompanion(
  id: string,
  values: Partial<GuestCompanion>,
): Promise<QueryResult<GuestCompanion>> {
  return updateRecord<GuestCompanion>('guest_companions', id, values as Record<string, unknown>)
}

/** Remove um acompanhante. */
export async function deleteCompanion(id: string): Promise<{ error: Error | null }> {
  return deleteRecord('guest_companions', id)
}

// ========== OPERAÇÕES ESPECÍFICAS: VOTOS ==========

/** Busca os votos de um convidado. */
export async function fetchVotesByGuest(
  guestId: string,
): Promise<QueryListResult<GuestVote>> {
  return fetchWithFilter<GuestVote>('guest_votes', { guest_id: guestId })
}

/**
 * Cria ou substitui o voto do usuário atual em um convidado.
 * O `user_id` vem da sessão; a RLS garante can_vote e one-vote-per-user.
 */
export async function upsertVote(
  guestId: string,
  vote: GuestVoteValue,
): Promise<QueryResult<GuestVote>> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id
  if (!userId) {
    return { data: null, error: new Error('NOT_AUTHENTICATED') }
  }

  const { data, error } = await supabase
    .from('guest_votes')
    .upsert({ guest_id: guestId, user_id: userId, vote }, { onConflict: 'guest_id,user_id' })
    .select()
    .single()

  return { data: data as GuestVote | null, error }
}

/** Remove o voto do usuário atual em um convidado. */
export async function deleteMyVote(guestId: string): Promise<{ error: Error | null }> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id
  if (!userId) {
    return { error: new Error('NOT_AUTHENTICATED') }
  }
  const { error } = await supabase
    .from('guest_votes')
    .delete()
    .eq('guest_id', guestId)
    .eq('user_id', userId)
  return { error }
}

// ========== OPERAÇÕES ESPECÍFICAS: DISCUSSÃO (COMENTÁRIOS) ==========

/** Busca os comentários de um convidado. */
export async function fetchCommentsByGuest(
  guestId: string,
): Promise<QueryListResult<GuestComment>> {
  return fetchWithFilter<GuestComment>('guest_comments', { guest_id: guestId }, {
    orderBy: { column: 'created_at', ascending: true },
  })
}

/** Cria um comentário (autoria via sessão). */
export async function createComment(
  values: GuestCommentInsert,
): Promise<QueryResult<GuestComment>> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id
  if (!userId) {
    return { data: null, error: new Error('NOT_AUTHENTICATED') }
  }
  return insertRecord<GuestComment>('guest_comments', {
    ...values,
    user_id: userId,
  } as Record<string, unknown>)
}

/** Remove um comentário (apenas o próprio autor, por RLS). */
export async function deleteComment(id: string): Promise<{ error: Error | null }> {
  return deleteRecord('guest_comments', id)
}

// ========== OPERAÇÕES ESPECÍFICAS: MEMBROS E PERMISSÕES ==========

/** Busca as permissões do usuário atual no evento. */
export async function fetchMyPermissions(
  eventId: string,
): Promise<{ can_vote: boolean; can_comment: boolean; can_prioritize: boolean; is_owner: boolean }> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session.session?.user?.id
  if (!userId) {
    return { can_vote: false, can_comment: false, can_prioritize: false, is_owner: false }
  }

  const { data: event } = await supabase
    .from('events')
    .select('user_id')
    .eq('id', eventId)
    .single()

  if (event?.user_id === userId) {
    return { can_vote: true, can_comment: true, can_prioritize: true, is_owner: true }
  }

  const { data: member } = await supabase
    .from('event_members')
    .select('can_vote,can_comment,can_prioritize')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()

  return {
    can_vote: member?.can_vote ?? false,
    can_comment: member?.can_comment ?? false,
    can_prioritize: member?.can_prioritize ?? false,
    is_owner: false,
  }
}

/** Lista os membros do evento (com perfil) — RPC security definer. */
export async function fetchEventMembers(eventId: string) {
  const { data, error } = await supabase.rpc('list_event_members', { p_event_id: eventId })
  return {
    data: data as Array<EventMember & { email: string | null; full_name: string | null }> | null,
    error,
  }
}

/** Atualiza role + flags + relacionamento de um membro (owner/admin) — RPC. */
export async function updateMemberPermissions(
  eventId: string,
  memberUserId: string,
  input: {
    role: EventMemberRole
    can_vote: boolean
    can_comment: boolean
    can_prioritize: boolean
    relationship_to_event: string | null
  },
): Promise<QueryResult<EventMember>> {
  const { data, error } = await supabase.rpc('update_member_permissions', {
    p_event_id: eventId,
    p_user_id: memberUserId,
    p_role: input.role,
    p_can_vote: input.can_vote,
    p_can_comment: input.can_comment,
    p_can_prioritize: input.can_prioritize,
    p_relationship_to_event: input.relationship_to_event,
  })
  return { data: data as EventMember | null, error }
}

/** Define a prioridade de um convidado (somente can_prioritize) — RPC. */
export async function setGuestPriority(
  guestId: string,
  priority: GuestPriority,
): Promise<QueryResult<Guest>> {
  const { data, error } = await supabase.rpc('set_guest_priority', {
    p_guest_id: guestId,
    p_priority: priority,
  })
  return { data: data as Guest | null, error }
}
