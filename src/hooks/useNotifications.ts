import { useCallback, useEffect, useState } from 'react'
import type { EventNotification } from '../lib/supabase/types'
import {
  fetchMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../lib/supabase/database'

export interface NotificationsState {
  notifications: EventNotification[]
  unreadCount: number
  loading: boolean
  load: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

/** Hook de notificações do usuário logado (sininho). */
export function useNotifications(): NotificationsState {
  const [notifications, setNotifications] = useState<EventNotification[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await fetchMyNotifications()
    setNotifications(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const unreadCount = notifications.filter((n) => !n.read).length

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  return { notifications, unreadCount, loading, load, markRead, markAllRead }
}