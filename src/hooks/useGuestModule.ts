import { useCallback, useEffect, useState } from 'react'
import type {
  Guest,
  GuestGroup,
  GuestPriority,
  GuestRole,
  GuestRoleAssignment,
} from '../lib/supabase/types'
import {
  fetchGuestsByEvent,
  createGuest,
  createGuests,
  deleteGuest,
  updateGuest as updateGuestDb,
  fetchGuestGroups,
  createGuestGroup,
  updateGuestGroup,
  deleteGuestGroup,
  setGuestPriority,
  fetchMyPermissions,
  fetchGuestRoles,
  createGuestRole,
  updateGuestRole,
  deleteGuestRole,
  fetchGuestRoleAssignments,
  createGuestRoleAssignment,
  deleteGuestRoleAssignment,
} from '../lib/supabase/database'

export interface MyPermissions {
  can_vote: boolean
  can_comment: boolean
  can_prioritize: boolean
  is_owner: boolean
}

export interface AddGuestValues {
  name: string
  email?: string | null
  phone?: string | null
  group_id?: string | null
  notes?: string | null
  priority?: GuestPriority | null
  invited_by?: Guest['invited_by']
  relationship_to_event?: string | null
}

export interface GuestModule {
  guests: Guest[]
  groups: GuestGroup[]
  roles: GuestRole[]
  roleAssignments: GuestRoleAssignment[]
  loading: boolean
  error: string | null
  permissions: MyPermissions
  addGuest: (values: AddGuestValues) => Promise<Guest | null>
  addGuests: (names: string[]) => Promise<number>
  removeGuest: (id: string) => Promise<void>
  updateGuest: (id: string, values: Partial<Guest>) => Promise<void>
  addGroup: (name: string, color?: string) => Promise<GuestGroup | null>
  renameGroup: (id: string, name: string) => Promise<void>
  updateGroup: (id: string, values: Partial<GuestGroup>) => Promise<void>
  removeGroup: (id: string) => Promise<void>
  prioritize: (guestId: string, priority: GuestPriority) => Promise<boolean>
  addRole: (values: Partial<GuestRole>) => Promise<GuestRole | null>
  updateRole: (id: string, values: Partial<GuestRole>) => Promise<void>
  removeRole: (id: string) => Promise<void>
  /** Define os papéis de um convidado (substitui atribuições existentes). */
  setGuestRoles: (guestId: string, roleIds: string[]) => Promise<boolean>
  removeRoleAssignment: (assignmentId: string) => Promise<void>
}

/**
 * Hook do módulo de convidados: carrega convidados, grupos, papéis,
 * atribuições e permissões do usuário atual, expondo CRUD + priorização.
 */
export function useGuestModule(eventId: string): GuestModule {
  const [guests, setGuests] = useState<Guest[]>([])
  const [groups, setGroups] = useState<GuestGroup[]>([])
  const [roles, setRoles] = useState<GuestRole[]>([])
  const [roleAssignments, setRoleAssignments] = useState<GuestRoleAssignment[]>([])
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

      const [guestsRes, groupsRes, rolesRes, assignmentsRes, perms] = await Promise.all([
        fetchGuestsByEvent(eventId, { orderBy: { column: 'created_at', ascending: false } }),
        fetchGuestGroups(eventId),
        fetchGuestRoles(eventId),
        fetchGuestRoleAssignments(eventId),
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

      if (rolesRes.error) {
        setError((prev) => prev ?? rolesRes.error?.message ?? null)
      } else {
        setRoles(rolesRes.data ?? [])
      }

      if (assignmentsRes.error) {
        setError((prev) => prev ?? assignmentsRes.error?.message ?? null)
      } else {
        setRoleAssignments(assignmentsRes.data ?? [])
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
    async (values: AddGuestValues): Promise<Guest | null> => {
      const { data, error: createError } = await createGuest({
        event_id: eventId,
        name: values.name,
        email: values.email ?? null,
        phone: values.phone ?? null,
        group_id: values.group_id ?? null,
        notes: values.notes ?? null,
        priority: values.priority ?? null,
        invited_by: values.invited_by ?? null,
        relationship_to_event: values.relationship_to_event ?? null,
      })

      if (createError || !data) {
        setError('Não foi possível adicionar o convidado.')
        return null
      }

      setGuests((prev) => [data, ...prev])
      return data
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
    setRoleAssignments((prev) => prev.filter((a) => a.guest_id !== id))
  }, [])

  const updateGuest = useCallback(async (id: string, values: Partial<Guest>) => {
    const { data, error: updateError } = await updateGuestDb(id, values)
    if (updateError || !data) {
      setError('Não foi possível atualizar o convidado.')
      return
    }
    setGuests((prev) => prev.map((g) => (g.id === id ? data : g)))
  }, [])

  const addGroup = useCallback(
    async (name: string, color?: string): Promise<GuestGroup | null> => {
      const { data, error: createError } = await createGuestGroup({
        event_id: eventId,
        name,
        ...(color ? { color } : {}),
      })
      if (createError || !data) {
        setError('Não foi possível criar o grupo.')
        return null
      }
      setGroups((prev) => [...prev, data])
      return data
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

  const updateGroup = useCallback(async (id: string, values: Partial<GuestGroup>) => {
    const { data, error: updateError } = await updateGuestGroup(id, values)
    if (updateError || !data) {
      setError('Não foi possível atualizar o grupo.')
      return
    }
    setGroups((prev) => prev.map((g) => (g.id === id ? data : g)))
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

  const addRole = useCallback(
    async (values: Partial<GuestRole>): Promise<GuestRole | null> => {
      const { data, error: createError } = await createGuestRole({
        event_id: eventId,
        name: values.name ?? '',
        ...(values.description !== undefined ? { description: values.description } : {}),
        ...(values.icon !== undefined ? { icon: values.icon } : {}),
        ...(values.color !== undefined ? { color: values.color } : {}),
        ...(values.allow_multiple !== undefined ? { allow_multiple: values.allow_multiple } : {}),
        ...(values.is_special !== undefined ? { is_special: values.is_special } : {}),
      })
      if (createError || !data) {
        setError('Não foi possível criar o papel.')
        return null
      }
      setRoles((prev) => [...prev, data])
      return data
    },
    [eventId],
  )

  const updateRole = useCallback(async (id: string, values: Partial<GuestRole>) => {
    const { data, error: updateError } = await updateGuestRole(id, values)
    if (updateError || !data) {
      setError('Não foi possível atualizar o papel.')
      return
    }
    setRoles((prev) => prev.map((r) => (r.id === id ? data : r)))
  }, [])

  const removeRole = useCallback(async (id: string) => {
    const { error: deleteError } = await deleteGuestRole(id)
    if (deleteError) {
      setError('Não foi possível remover o papel.')
      return
    }
    setRoles((prev) => prev.filter((r) => r.id !== id))
    setRoleAssignments((prev) => prev.filter((a) => a.role_id !== id))
  }, [])

  const setGuestRoles = useCallback(
    async (guestId: string, roleIds: string[]): Promise<boolean> => {
      const current = roleAssignments.filter((a) => a.guest_id === guestId)
      const currentRoleIds = new Set(current.map((a) => a.role_id))
      const nextRoleIds = new Set(roleIds)

      const toRemove = current.filter((a) => !nextRoleIds.has(a.role_id))
      const toAdd = [...nextRoleIds].filter((id) => !currentRoleIds.has(id))

      try {
        // Remove atribuições que não estão mais presentes
        for (const assignment of toRemove) {
          const { error } = await deleteGuestRoleAssignment(assignment.id)
          if (error) {
            setError('Não foi possível remover a atribuição de papel.')
            return false
          }
        }

        // Cria novas atribuições
        const created: GuestRoleAssignment[] = []
        for (const roleId of toAdd) {
          const { data, error } = await createGuestRoleAssignment({
            event_id: eventId,
            role_id: roleId,
            guest_id: guestId,
          })
          if (error || !data) {
            setError('Não foi possível atribuir o papel.')
            return false
          }
          created.push(data)
        }

        setRoleAssignments((prev) => [
          ...prev.filter((a) => a.guest_id !== guestId),
          ...current.filter((a) => nextRoleIds.has(a.role_id)),
          ...created,
        ])
        return true
      } catch {
        setError('Não foi possível atualizar os papéis.')
        return false
      }
    },
    [eventId, roleAssignments],
  )

  const removeRoleAssignment = useCallback(async (assignmentId: string) => {
    const { error: deleteError } = await deleteGuestRoleAssignment(assignmentId)
    if (deleteError) {
      setError('Não foi possível remover a atribuição de papel.')
      return
    }
    setRoleAssignments((prev) => prev.filter((a) => a.id !== assignmentId))
  }, [])

  return {
    guests,
    groups,
    roles,
    roleAssignments,
    loading,
    error,
    permissions,
    addGuest,
    addGuests,
    removeGuest,
    updateGuest,
    addGroup,
    renameGroup,
    updateGroup,
    removeGroup,
    prioritize,
    addRole,
    updateRole,
    removeRole,
    setGuestRoles,
    removeRoleAssignment,
  }
}