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

/** Status do ciclo de vida de um evento */
export type EventStatus = 'draft' | 'planned' | 'confirmed' | 'completed'

/** Status de RSVP de um convidado */
export type RsvpStatus = 'pending' | 'confirmed' | 'declined'

/** Status de um fornecedor */
export type VendorStatus = 'pending' | 'contracted' | 'cancelled'

/** Prioridade de uma tarefa */
export type TaskPriority = 'low' | 'medium' | 'high'

/** Papel do usuário na plataforma */
export type UserRole = 'user' | 'admin'

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
}

// ========== TABELAS RELACIONADAS ==========

// Convidados
export interface Guest {
  id: string
  event_id: string
  name: string
  email: string | null
  phone: string | null
  guest_group: string | null
  rsvp_status: RsvpStatus
  plus_one: boolean
  table_number: number | null
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
  assigned_to: string | null
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

/** Dados para criação de um convidado */
export type GuestInsert = Pick<Guest, 'name' | 'event_id'> & Partial<Omit<Guest, 'id' | 'created_at'>>

/** Dados para criação de um fornecedor */
export type VendorInsert = Pick<Vendor, 'name' | 'event_id'> & Partial<Omit<Vendor, 'id' | 'created_at'>>

/** Dados para criação de uma tarefa */
export type TaskInsert = Pick<Task, 'title' | 'event_id'> & Partial<Omit<Task, 'id' | 'created_at'>>

/** Dados para criação de uma despesa */
export type ExpenseInsert = Pick<Expense, 'description' | 'amount' | 'event_id'> &
  Partial<Omit<Expense, 'id' | 'created_at'>>

/** Dados para criação de um item de presente */
export type GiftRegistryItemInsert = Pick<GiftRegistryItem, 'name' | 'event_id'> &
  Partial<Omit<GiftRegistryItem, 'id' | 'created_at'>>

// ========== TIPO DO BANCO DE DADOS ==========

/**
 * Tipos das tabelas do banco de dados.
 * Gere automaticamente com: `supabase gen types typescript`
 */
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
        Update: Partial<Guest>
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