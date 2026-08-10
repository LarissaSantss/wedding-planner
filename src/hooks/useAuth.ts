import { useState, useEffect, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, signIn, signUp, signOut, getSession } from '../lib/supabase'

interface UseAuthReturn {
  user: User | null
  session: Session | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ error: Error | null }>
  register: (email: string, password: string) => Promise<{ error: Error | null }>
  logout: () => Promise<void>
}

/**
 * Hook de autenticação - gerencia o estado do usuário logado
 *
 * Uso:
 * const { user, isAuthenticated, login, logout } = useAuth()
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    // Busca a sessão inicial
    getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    // Escuta mudanças de autenticação em tempo real
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await signIn(email, password)
    return { error }
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const { error } = await signUp(email, password)
    return { error }
  }, [])

  const logout = useCallback(async () => {
    await signOut()
    setUser(null)
    setSession(null)
  }, [])

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  }
}