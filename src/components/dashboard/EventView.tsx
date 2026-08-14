
/*
  DIRECTION CONTRACT - EVENT VIEW (surface: EventView, mode: Operate)
  THESIS: Orquestrador das duas superficies do evento - conecta o usuario
  autenticado ao Supabase via useEvent, alterna entre Dashboard e Settings,
  e aplica o tema do evento ao redor de ambas.
*/
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useEvent } from '../../hooks/useEvent'
import { getThemeStyle } from '../../utils/theme'
import { AuthScreen } from '../auth/AuthScreen'
import type { EventUpdate } from '../../lib/supabase/types'
import { EventDashboard } from './EventDashboard'
import { EventCreate } from './EventCreate'
import { EventJoin } from './EventJoin'

type View = 'empty' | 'create' | 'join' | 'dashboard' | 'settings' | 'guests' | 'tasks' | 'tables'

const DEFAULT_THEME_STYLE = getThemeStyle('rose-gold') as CSSProperties

export function EventView() {
  const { user, loading: authLoading } = useAuth()
  const { event, events, loading: eventLoading, error, refresh, selectEvent, saveEvent, deleteEvent } =
    useEvent()

  // Código de convite vindo da URL (?code=XXXX), lido uma única vez
  const [initialJoinCode] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('code')?.trim() ?? ''
  })
  const [view, setView] = useState<View>(() => (initialJoinCode ? 'join' : 'empty'))

  // Remove o código da URL após a leitura (não altera estado React)
  useEffect(() => {
    if (!initialJoinCode) return
    const url = new URL(window.location.href)
    url.searchParams.delete('code')
    window.history.replaceState(null, '', url.toString())
  }, [initialJoinCode])

  const handleRefresh = () => {
    void refresh()
  }

  const handleCreateEvent = () => {
    setView('create')
  }

  const handleEnterCode = () => {
    setView('join')
  }

  const handleJoined = async (eventId: string) => {
    await refresh()
    await selectEvent(eventId)
    setView('dashboard')
  }

  if (authLoading || eventLoading) {
    return (
      <div className="dashboard-shell" style={DEFAULT_THEME_STYLE}>
        <div className="state-panel">
          <div className="state-spinner" role="status" aria-label="Carregando" />
          <p className="state-message">Carregando suas informacoes...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthScreen />
  }

  if (error) {
    return (
      <div className="dashboard-shell" style={DEFAULT_THEME_STYLE}>
        <div className="state-panel">
          <p className="state-message state-error">Erro: {error}</p>
          <button type="button" className="btn-primary" onClick={handleRefresh}>
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!event) {
    if (view === 'create') {
      return (
        <EventCreate
          theme="rose-gold"
          onCreated={() => {
            void refresh()
            setView('dashboard')
          }}
          onCancel={() => setView('empty')}
        />
      )
    }

    if (view === 'join') {
      return (
        <EventJoin
          theme="rose-gold"
          initialCode={initialJoinCode}
          onJoined={(id) => {
            void handleJoined(id)
          }}
          onBack={() => setView('empty')}
        />
      )
    }

    return (
      <div className="dashboard-shell" style={DEFAULT_THEME_STYLE}>
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">✨</span>
          <h1 className="empty-state-title">Nenhum evento criado</h1>
          <p className="empty-state-text">
            Crie seu primeiro evento para comecar a planejar convidados, fornecedores, tarefas e orcamento.
          </p>
          <div className="empty-state-actions">
            <button type="button" className="btn-primary" onClick={handleCreateEvent}>
              Criar novo evento
            </button>
            <button type="button" className="btn-secondary" onClick={handleEnterCode}>
              Entrar com codigo do evento
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleSelectEvent = (id: string) => {
    void selectEvent(id)
    setView('dashboard')
  }

  const handleSaveEvent = async (values: EventUpdate) => {
    await saveEvent(event.id, values)
  }

  if (view === 'join') {
    return (
      <EventJoin
        theme={event.theme_preset}
        initialCode={initialJoinCode}
        onJoined={(id) => {
          void handleJoined(id)
        }}
        onBack={() => setView('dashboard')}
      />
    )
  }


  return (
    <EventDashboard
      event={event}
      events={events}
      activeSection={
        view === 'guests'
          ? 'guests'
          : view === 'tasks'
            ? 'tasks'
            : view === 'settings'
              ? 'settings'
              : view === 'tables'
                ? 'tables'
                : 'dashboard'
      }
      onSelectEvent={handleSelectEvent}
      onOpenDashboard={() => setView('dashboard')}
      onOpenSettings={() => setView('settings')}
      onOpenGuests={() => setView('guests')}
      onOpenTasks={() => setView('tasks')}
      onOpenTables={() => setView('tables')}
      onSaveEvent={handleSaveEvent}
      onDeleteEvent={(id) => {
        void deleteEvent(id)
      }}
    />
  )
}
