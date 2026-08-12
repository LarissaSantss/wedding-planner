// ========== TIPOS GERAIS ==========

export type { User, Session } from '@supabase/supabase-js'

// ========== ENUMS / UNION TYPES ==========

/** Tipos de evento suportados pelo SaaS multi-eventos */
export type EventType =
  | 'wedding'
  | 'debutante'
  | 'birthday'
  | 'anniversary'
  | 'corporate'
  | 'graduation'
  | 'other'

/** Presets de tema visual disponíveis */
export type ThemePreset =
  | 'rose-gold'
  | 'emerald'
  | 'royal-blue'
  | 'mystic-violet'
  | 'amber-gold'
  | 'luxury-dark'
  | 'custom'

/** Status do ciclo de vida de um evento */
export type EventStatus = 'draft' | 'planned' | 'confirmed' | 'completed'

/** Status de um fornecedor */
export type VendorStatus = 'pending' | 'contracted' | 'cancelled'

/** Prioridade de uma tarefa */
export type TaskPriority = 'low' | 'medium' | 'high'

/** Chaves da paleta pastel do Kanban (centralizadas — hex não espalhado) */
export type PastelColorKey =
  | 'rose'
  | 'lavender'
  | 'sage'
  | 'blue'
  | 'peach'
  | 'vanilla'
  | 'beige'
  | 'gray'

/** Papel de um responsável numa tarefa */
export type TaskAssigneeRole = 'primary' | 'collaborator'

/** Papel do usuário na plataforma */
export type UserRole = 'user' | 'admin'

// ========== MÓDULO DE CONVIDADOS ==========

/** Status de RSVP de um convidado */
export type RsvpStatus = 'pending' | 'confirmed' | 'declined'

/** Prioridade do convidado (1 a 3 estrelas) — valor estruturado, não emoji */
export type GuestPriority = 1 | 2 | 3

/** Relação do acompanhante com o convidado */
export type CompanionRelationship =
  | 'spouse'
  | 'partner'
  | 'child'
  | 'parent'
  | 'friend'
  | 'other'

/** Voto dos organizadores sobre um convidado */
export type GuestVoteValue = 'agree' | 'disagree'

/** Papel/função de um membro no planejamento do evento */
export type EventMemberRole = 'owner' | 'admin' | 'editor' | 'viewer'

/**
 * Relacionamento da pessoa COM O EVENTO (código estruturado).
 * Estes são os códigos do casamento; outros event_type poderão expor
 * os seus próprios códigos. `(string & {})` preserva autocomplete.
 */
export type WeddingRelationship =
  | 'mother_of_bride'
  | 'father_of_bride'
  | 'mother_of_groom'
  | 'father_of_groom'
  | 'sibling_of_bride'
  | 'sibling_of_groom'
  | 'grandparent_of_bride'
  | 'grandparent_of_groom'
  | 'aunt_uncle_of_bride'
  | 'aunt_uncle_of_groom'
  | 'cousin_of_bride'
  | 'cousin_of_groom'
  | 'friend_of_bride'
  | 'friend_of_groom'
  | 'colleague_of_bride'
  | 'colleague_of_groom'
  | 'groomsman'
  | 'bridesmaid'
  | 'ring_bearer'
  | 'maid_of_honor'
  | 'other'

export type RelationshipToEvent = WeddingRelationship | (string & {})

// ========== TABELAS DO BANCO ==========

// Tabela de perfis de usuário
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
}

// ========== TABELA CENTRAL: EVENTS (Multi-Eventos SaaS) ==========

/**
 * Evento principal — substitui a antiga tabela `weddings`.
 * Suporta casamentos, 15 anos, aniversários, bodas, corporativos e formaturas.
 */
export interface Event {
  id: string
  user_id: string
  title: string
  event_type: EventType
  theme_preset: ThemePreset
  custom_primary: string | null // Tema personalizado — cor primária
  custom_secondary: string | null // Tema personalizado — cor secundária
  custom_accent: string | null // Tema personalizado — cor de destaque
  description: string | null
  client_name_1: string | null // Nome do destaque (noiva, aniversariante, empresa)
  client_name_2: string | null // Nome secundário (noivo, co-anfitrião) — opcional
  date: string | null
  location: string | null
  guest_count: number | null
  budget: number | null
  cover_image_url: string | null
  status: EventStatus
  created_at: string
  updated_at: string
  code: string // Código único para acesso ao evento
}

// ========== TABELAS RELACIONADAS ==========

// Convidados (GUEST — pessoa da lista; não confundir com EVENT_MEMBER)
export interface Guest {
  id: string
  event_id: string
  name: string
  email: string | null
  phone: string | null
  guest_group: string | null // legado (texto livre) — preservado por compatibilidade
  group_id: string | null // FK para event_guest_groups
  priority: GuestPriority | null
  notes: string | null
  relationship_to_event: RelationshipToEvent | null
  rsvp_status: RsvpStatus
  plus_one: boolean
  table_number: number | null
  created_by: string | null // FK auth.users
  created_at: string
  updated_at: string
}

// Grupos personalizados do evento
export interface GuestGroup {
  id: string
  event_id: string
  name: string
  created_at: string
  updated_at: string
}

// Acompanhante de um convidado
export interface GuestCompanion {
  id: string
  guest_id: string
  name: string
  relationship: CompanionRelationship
  created_at: string
  updated_at: string
}

// Voto de um organizador sobre um convidado
export interface GuestVote {
  id: string
  guest_id: string
  user_id: string
  vote: GuestVoteValue
  created_at: string
  updated_at: string
}

// Comentário na discussão de um convidado
export interface GuestComment {
  id: string
  guest_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

// Membro do evento (EVENT_MEMBER — permissão de acesso; não é GUEST)
export interface EventMember {
  event_id: string
  user_id: string
  role: EventMemberRole
  can_vote: boolean
  can_comment: boolean
  can_prioritize: boolean
  relationship_to_event: RelationshipToEvent | null
  created_at: string
}

// Fornecedores
export interface Vendor {
  id: string
  event_id: string
  name: string
  category: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  notes: string | null
  status: VendorStatus
  cost: number | null
  created_at: string
}

// Tarefas / Checklist
export interface Task {
  id: string
  event_id: string
  title: string
  description: string | null
  due_date: string | null
  completed: boolean
  priority: TaskPriority
  category: string | null
  assigned_to: string | null // legado — atribuição agora em task_assignees
  board_id: string | null
  column_id: string | null
  category_id: string | null
  position: number
  created_by: string | null
  created_at: string
  updated_at: string
}

// Quadro Kanban
export interface Board {
  id: string
  event_id: string
  name: string
  description: string | null
  color_key: PastelColorKey
  sort_order: number
  is_primary: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

// Coluna do quadro
export interface BoardColumn {
  id: string
  board_id: string
  name: string
  description: string | null
  color_key: PastelColorKey
  sort_order: number
  is_initial: boolean
  is_completion: boolean
  created_at: string
  updated_at: string
}

// Categoria de tarefas por evento
export interface TaskCategory {
  id: string
  event_id: string
  name: string
  icon_key: string
  color_key: PastelColorKey
  sort_order: number
  created_at: string
  updated_at: string
}

// Responsável de uma tarefa
export interface TaskAssignee {
  id: string
  task_id: string
  user_id: string
  role: TaskAssigneeRole
  created_at: string
}

// Subtarefa
export interface TaskSubtask {
  id: string
  task_id: string
  title: string
  completed: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// Comentário de tarefa (com menções)
export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  mentions: string[]
  created_at: string
  updated_at: string
}

// Anexo de tarefa (arquivo fica no Storage)
export interface TaskAttachment {
  id: string
  task_id: string
  filename: string
  storage_path: string
  content_type: string | null
  size_bytes: number | null
  created_by: string | null
  created_at: string
}

// Histórico de atividade
export interface TaskActivity {
  id: string
  task_id: string
  user_id: string | null
  action: string
  metadata: Record<string, unknown>
  created_at: string
}

// Despesas / Orçamento
export interface Expense {
  id: string
  event_id: string
  description: string
  amount: number
  category: string | null
  vendor_id: string | null
  paid: boolean
  due_date: string | null
  created_at: string
}

// Lista de presentes / Registro
export interface GiftRegistryItem {
  id: string
  event_id: string
  name: string
  description: string | null
  price: number | null
  url: string | null
  image_url: string | null
  quantity: number
  purchased_quantity: number
  created_at: string
}

// ========== TIPOS PARA OPERAÇÕES DE CRUD ==========

/** Dados para criação de um evento (campos obrigatórios) */
export type EventInsert = Pick<Event, 'title'> &
  Partial<Omit<Event, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

/** Dados para atualização de um evento */
export type EventUpdate = Partial<Omit<Event, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

/** Dados para criação de um convidado (apenas name + event_id são obrigatórios) */
export type GuestInsert = Pick<Guest, 'name' | 'event_id'> &
  Partial<Omit<Guest, 'id' | 'created_at' | 'updated_at' | 'created_by'>>

/** Dados para atualização de um convidado */
export type GuestUpdate = Partial<
  Omit<Guest, 'id' | 'event_id' | 'created_at' | 'updated_at' | 'created_by'>
>

/** Dados para criação de um grupo */
export type GuestGroupInsert = Pick<GuestGroup, 'name' | 'event_id'>

/** Dados para atualização de um grupo */
export type GuestGroupUpdate = Partial<Omit<GuestGroup, 'id' | 'event_id' | 'created_at' | 'updated_at'>>

/** Dados para criação de um acompanhante */
export type GuestCompanionInsert = Pick<GuestCompanion, 'name' | 'guest_id'> &
  Partial<Omit<GuestCompanion, 'id' | 'created_at' | 'updated_at'>>

/** Dados para atualização de um acompanhante */
export type GuestCompanionUpdate = Partial<
  Omit<GuestCompanion, 'id' | 'guest_id' | 'created_at' | 'updated_at'>
>

/** Dados para criação de um comentário */
export type GuestCommentInsert = Pick<GuestComment, 'content' | 'guest_id'>

/** Dados para votar em um convidado */
export type GuestVoteInsert = Pick<GuestVote, 'guest_id' | 'vote'>

/** Dados para criação de um fornecedor */
export type VendorInsert = Pick<Vendor, 'name' | 'event_id'> & Partial<Omit<Vendor, 'id' | 'created_at'>>

/** Dados para criação de uma tarefa (só title + event_id obrigatórios) */
export type TaskInsert = Pick<Task, 'title' | 'event_id'> &
  Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'created_by'>>

/** Dados para atualização de uma tarefa */
export type TaskUpdate = Partial<Omit<Task, 'id' | 'event_id' | 'created_at' | 'updated_at' | 'created_by'>>

/** Dados para criação de um quadro */
export type BoardInsert = Pick<Board, 'name' | 'event_id'> &
  Partial<Omit<Board, 'id' | 'created_at' | 'updated_at'>>

/** Dados para criação de coluna */
export type BoardColumnInsert = Pick<BoardColumn, 'name' | 'board_id'> &
  Partial<Omit<BoardColumn, 'id' | 'created_at' | 'updated_at'>>

/** Dados para criação de categoria */
export type TaskCategoryInsert = Pick<TaskCategory, 'name' | 'event_id'> &
  Partial<Omit<TaskCategory, 'id' | 'created_at' | 'updated_at'>>

/** Dados para criação de responsável */
export type TaskAssigneeInsert = Pick<TaskAssignee, 'task_id' | 'user_id'> &
  Partial<Omit<TaskAssignee, 'id' | 'created_at'>>

/** Dados para criação de subtarefa */
export type TaskSubtaskInsert = Pick<TaskSubtask, 'task_id' | 'title'> &
  Partial<Omit<TaskSubtask, 'id' | 'created_at' | 'updated_at'>>

/** Dados para criação de comentário */
export type TaskCommentInsert = Pick<TaskComment, 'task_id' | 'content'> &
  Partial<Pick<TaskComment, 'mentions'>>

/** Dados para criação de anexo */
export type TaskAttachmentInsert = Pick<TaskAttachment, 'task_id' | 'filename' | 'storage_path'> &
  Partial<Omit<TaskAttachment, 'id' | 'created_at'>>

/** Dados para criação de uma despesa */
export type ExpenseInsert = Pick<Expense, 'description' | 'amount' | 'event_id'> &
  Partial<Omit<Expense, 'id' | 'created_at'>>

/** Dados para criação de um item de presente */
export type GiftRegistryItemInsert = Pick<GiftRegistryItem, 'name' | 'event_id'> &
  Partial<Omit<GiftRegistryItem, 'id' | 'created_at'>>

// ========== TIPO DO BANCO DE DADOS ==========

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile>
        Update: Partial<Profile>
      }
      events: {
        Row: Event
        Insert: EventInsert
        Update: EventUpdate
      }
      guests: {
        Row: Guest
        Insert: GuestInsert
        Update: GuestUpdate
      }
      event_guest_groups: {
        Row: GuestGroup
        Insert: GuestGroupInsert
        Update: GuestGroupUpdate
      }
      guest_companions: {
        Row: GuestCompanion
        Insert: GuestCompanionInsert
        Update: GuestCompanionUpdate
      }
      guest_votes: {
        Row: GuestVote
        Insert: GuestVoteInsert
        Update: Partial<GuestVote>
      }
      guest_comments: {
        Row: GuestComment
        Insert: GuestCommentInsert
        Update: Partial<GuestComment>
      }
      event_members: {
        Row: EventMember
        Insert: Partial<EventMember>
        Update: Partial<EventMember>
      }
      vendors: {
        Row: Vendor
        Insert: VendorInsert
        Update: Partial<Vendor>
      }
      tasks: {
        Row: Task
        Insert: TaskInsert
        Update: Partial<Task>
      }
      boards: {
        Row: Board
        Insert: BoardInsert
        Update: Partial<Board>
      }
      board_columns: {
        Row: BoardColumn
        Insert: BoardColumnInsert
        Update: Partial<BoardColumn>
      }
      task_categories: {
        Row: TaskCategory
        Insert: TaskCategoryInsert
        Update: Partial<TaskCategory>
      }
      task_assignees: {
        Row: TaskAssignee
        Insert: TaskAssigneeInsert
        Update: Partial<TaskAssignee>
      }
      task_subtasks: {
        Row: TaskSubtask
        Insert: TaskSubtaskInsert
        Update: Partial<TaskSubtask>
      }
      task_comments: {
        Row: TaskComment
        Insert: TaskCommentInsert
        Update: Partial<TaskComment>
      }
      task_attachments: {
        Row: TaskAttachment
        Insert: TaskAttachmentInsert
        Update: Partial<TaskAttachment>
      }
      task_activity: {
        Row: TaskActivity
        Insert: Partial<TaskActivity>
        Update: Partial<TaskActivity>
      }
      expenses: {
        Row: Expense
        Insert: ExpenseInsert
        Update: Partial<Expense>
      }
      gift_registry_items: {
        Row: GiftRegistryItem
        Insert: GiftRegistryItemInsert
        Update: Partial<GiftRegistryItem>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}