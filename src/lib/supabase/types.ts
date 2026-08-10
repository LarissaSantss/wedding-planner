// ========== TIPOS GERAIS ==========

export type { User, Session } from '@supabase/supabase-js'

// ========== TABELAS DO BANCO ==========

// Tabela de perfis de usuário
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: 'user' | 'admin' | null
  created_at: string
}

// ========== TABELAS DO WEDDING PLANNER ==========

// Casamento / Evento principal
export interface Wedding {
  id: string
  user_id: string
  title: string
  description: string | null
  bride_name: string | null
  groom_name: string | null
  date: string | null
  location: string | null
  guest_count: number | null
  budget: number | null
  cover_image_url: string | null
  status: 'draft' | 'planned' | 'confirmed' | 'completed' | null
  created_at: string
  updated_at: string
}

// Convidados
export interface Guest {
  id: string
  wedding_id: string
  name: string
  email: string | null
  phone: string | null
  guest_group: string | null
  rsvp_status: 'pending' | 'confirmed' | 'declined' | null
  plus_one: boolean | null
  table_number: number | null
  created_at: string
}

// Fornecedores
export interface Vendor {
  id: string
  wedding_id: string
  name: string
  category: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  website: string | null
  notes: string | null
  status: 'pending' | 'contracted' | 'cancelled' | null
  cost: number | null
  created_at: string
}

// Tarefas / Checklist
export interface Task {
  id: string
  wedding_id: string
  title: string
  description: string | null
  due_date: string | null
  completed: boolean
  priority: 'low' | 'medium' | 'high' | null
  category: string | null
  assigned_to: string | null
  created_at: string
}

// Despesas / Orçamento
export interface Expense {
  id: string
  wedding_id: string
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
  wedding_id: string
  name: string
  description: string | null
  price: number | null
  url: string | null
  image_url: string | null
  quantity: number
  purchased_quantity: number
  created_at: string
}

// ========== TIPO DO BANCO DE DADOS ==========

/**
 * Tipos das tabelas do banco de dados.
 * Gera automaticamente com: `supabase gen types typescript`
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile>
        Update: Partial<Profile>
      }
      weddings: {
        Row: Wedding
        Insert: Partial<Wedding>
        Update: Partial<Wedding>
      }
      guests: {
        Row: Guest
        Insert: Partial<Guest>
        Update: Partial<Guest>
      }
      vendors: {
        Row: Vendor
        Insert: Partial<Vendor>
        Update: Partial<Vendor>
      }
      tasks: {
        Row: Task
        Insert: Partial<Task>
        Update: Partial<Task>
      }
      expenses: {
        Row: Expense
        Insert: Partial<Expense>
        Update: Partial<Expense>
      }
      gift_registry_items: {
        Row: GiftRegistryItem
        Insert: Partial<GiftRegistryItem>
        Update: Partial<GiftRegistryItem>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}