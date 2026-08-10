import { useCallback, useEffect, useState } from 'react'
import type { Event, EventUpdate } from '../lib/supabase/types'
import {
  fetchUserEvents,
  fetchEventById,
  updateEvent,
} from '../lib/supabase/database'

interface UseEventReturn {
  event: Event | null
  events: Event[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  selectEvent: (id: string) => Promise<void>
  saveEvent: (id: string, values: EventUpdate) => Promise<{ error: Error | null }>
}

/**
 * Hook que gerencia o evento ativo do usuário logado.
 *
 * - Carrega a lista de eventos do usuário (RLS isola por user_id)
 * - Seleciona o evento mais recente por padrão
 * - Permite trocar de evento e salvar alterações
 *
 * Uso:
 *   const { event, events, loading, saveEvent, selectEvent } = useEvent()
 */
export function useEvent(): UseEventReturn {
  const [event, setEvent] = useState<Event | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await fetchUserEvents()

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const list = data ?? []
    setEvents(list)

    // Mantém o evento selecionado se ainda existir na lista
    setEvent((current) => {
      if (current && list.some((e) => e.id === current.id)) return current
      return list[0] ?? null
    })

    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const selectEvent = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await fetchEventById(id)

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setEvent(data)
    setLoading(false)
  }, [])

  const saveEvent = useCallback(
    async (id: string, values: EventUpdate) => {
      const { error: saveError } = await updateEvent(id, values)

      if (!saveError) {
        // Atualiza o estado local com os dados salvos
        setEvent((current) => (current && current.id === id ? { ...current, ...values } : current))
        setEvents((current) =>
          current.map((e) => (e.id === id ? { ...e, ...values } : e)),
        )
      }

      return { error: saveError }
    },
    [],
  )

  return {
    event,
    events,
    loading,
    error,
    refresh,
    selectEvent,
    saveEvent,
  }
}