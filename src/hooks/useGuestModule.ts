import { useCallback, useEffect, useState } from 'react'
import type {
  Guest,
  GuestGroup,
  GuestPriority,
} from '../lib/supabase/types'
import {
  fetchGuestsByEvent,
  createGuest,
  createGuests,
  deleteGuest,
  fetchGuestGroups,
  createGuestGroup,
  updateGuestGroup,
  deleteGuestGroup,
  setGuestPriority,
  fetchMyPermissions,
} from '../lib/supabase/database'

export interface MyPermissions {
  can_vote: boolean
  can_comment: boolean
  can_prioritize: boolean
  is_owner: boolean
}

export interface GuestModule {
  guests: Guest[]
  groups: GuestGroup[]
  loading: boolean
  error: string | null
  permissions: MyPermissions
  addGuest: (values: {
    name: string
    email?: string | null
    phone?: string | null
    group_id?: string | null
    notes?: string | null
  }) => Promise<boolean>
  addGuests: (names: string[]) => Promise<number>
  removeGuest: (id: string) => Promise<void>
  addGroup: (name: string) => Promise<boolean>
  renameGroup: (id: string, name: string) => Promise<void>
  removeGroup: (id: string) => Promise<void>
  prioritize: (guestId: string, priority: GuestPriority) => Promise<boolean>
}

/**
 * Hook do módulo de convidados: carrega convidados, grupos e as permissões
 * do usuário atual, e expõe as ações de CRUD + priorização.
 */
export function useGuestModule(eventId: string): GuestModule {
  const [guests, setGuests] = useState<Guest[]>([])
  const [groups, setGroups] = useState<GuestGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<MyPermissions>({
    can_vote: false,
    can_comment: false,
    can_prioritize: false,
    is_owner: false,
  })

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError(null)

      const [guestsRes, groupsRes, perms] = await Promise.all([
        fetchGuestsByEvent(eventId, { orderBy: { column: 'created_at', ascending: false } }),
        fetchGuestGroups(eventId),
        fetchMyPermissions(eventId),
      ])

      if (!mounted) return

      if (guestsRes.error) {
        setError(guestsRes.error.message)
      } else {
        setGuests(guestsRes.data ?? [])
      }

      if (groupsRes.error) {
        setError((prev) => prev ?? groupsRes.error?.message ?? null)
      } else {
        setGroups(groupsRes.data ?? [])
      }

      setPermissions(perms)
      setLoading(false)
    }

    void load()
    return () => {
      mounted = false
    }
  }, [eventId])

  const addGuest = useCallback(
    async (values: {
      name: string
      email?: string | null
      phone?: string | null
      group_id?: string | null
      notes?: string | null
    }): Promise<boolean> => {
      const { data, error: createError } = await createGuest({
        event_id: eventId,
        name: values.name,
        email: values.email ?? null,
        phone: values.phone ?? null,
        group_id: values.group_id ?? null,
        notes: values.notes ?? null,
      })

      if (createError || !data) {
        setError('Não foi possível adicionar o convidado.')
        return false
      }

      setGuests((prev) => [data, ...prev])
      return true
    },
    [eventId],
  )

  const addGuests = useCallback(
    async (names: string[]): Promise<number> => {
      const clean = names.map((n) => n.trim()).filter(Boolean)
      if (clean.length === 0) return 0

      const { data, error: createError } = await createGuests(eventId, clean)
      if (createError || !data) {
        setError('Não foi possível adicionar os convidados.')
        return 0
      }
      setGuests((prev) => [...data, ...prev])
      return data.length
    },
    [eventId],
  )

  const removeGuest = useCallback(async (id: string) => {
    const { error: deleteError } = await deleteGuest(id)
    if (deleteError) {
      setError('Não foi possível remover o convidado.')
      return
    }
    setGuests((prev) => prev.filter((g) => g.id !== id))
  }, [])

  const addGroup = useCallback(
    async (name: string): Promise<boolean> => {
      const { data, error: createError } = await createGuestGroup({
        event_id: eventId,
        name,
      })
      if (createError || !data) {
        setError('Não foi possível criar o grupo.')
        return false
      }
      setGroups((prev) => [...prev, data])
      return true
    },
    [eventId],
  )

  const renameGroup = useCallback(async (id: string, name: string) => {
    const { error: updateError } = await updateGuestGroup(id, { name })
    if (updateError) {
      setError('Não foi possível renomear o grupo.')
      return
    }
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)))
  }, [])

  const removeGroup = useCallback(async (id: string) => {
    const { error: deleteError } = await deleteGuestGroup(id)
    if (deleteError) {
      setError('Não foi possível remover o grupo.')
      return
    }
    setGroups((prev) => prev.filter((g) => g.id !== id))
    // Convidados ligados ao grupo removido ficam sem grupo (SET NULL)
    setGuests((prev) =>
      prev.map((g) => (g.group_id === id ? { ...g, group_id: null } : g)),
    )
  }, [])

  const prioritize = useCallback(
    async (guestId: string, priority: GuestPriority): Promise<boolean> => {
      const { data, error: rpcError } = await setGuestPriority(guestId, priority)
      if (rpcError || !data) {
        setError('Você não tem permissão para priorizar este convidado.')
        return false
      }
      setGuests((prev) => prev.map((g) => (g.id === guestId ? { ...g, priority } : g)))
      return true
    },
    [],
  )

  return {
    guests,
    groups,
    loading,
    error,
    permissions,
    addGuest,
    addGuests,
    removeGuest,
    addGroup,
    renameGroup,
    removeGroup,
    prioritize,
  }
}