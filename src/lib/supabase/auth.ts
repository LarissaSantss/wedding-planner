import { supabase } from './client'
import type { Session } from '@supabase/supabase-js'

// ========== AUTENTICAÇÃO ==========

/**
 * Cadastra um novo usuário com email e senha
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })
  return { data, error }
}

/**
 * Realiza login com email e senha
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

/**
 * Realiza login com provedores OAuth (Google, GitHub, etc.)
 */
export async function signInWithProvider(provider: 'google' | 'github' | 'facebook' | 'apple') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
  })
  return { data, error }
}

/**
 * Realiza login com link mágico (email sem senha)
 */
export async function signInWithMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
  })
  return { data, error }
}

/**
 * Realiza logout do usuário
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * Busca a sessão atual do usuário
 */
export async function getSession(): Promise<{ data: { session: Session | null }; error: null } | { data: { session: null }; error: Error }> {
  const { data, error } = await supabase.auth.getSession()
  if (error) {
    return { data: { session: null }, error }
  }
  return { data: { session: data.session }, error: null }
}

/**
 * Busca o usuário atualmente autenticado
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  return { data, error }
}

/**
 * Envia solicitação de reset de senha
 */
export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email)
  return { data, error }
}

/**
 * Atualiza a senha do usuário (após reset ou quando logado)
 */
export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  return { data, error }
}

/**
 * Escuta mudanças no estado de autenticação
 */
export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}

// ========== PERFIL ==========

export interface UserProfile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role?: string
  created_at?: string
}

/**
 * Busca o perfil do usuário na tabela profiles
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Erro ao buscar perfil:', error.message)
    return null
  }

  return data as UserProfile
}

/**
 * Atualiza o perfil do usuário
 */
export async function updateProfile(userId: string, updates: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  return { data, error }
}