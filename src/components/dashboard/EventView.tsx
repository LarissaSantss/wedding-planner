{/* 
  ============================================================================
  DIRECTION CONTRACT — EVENT VIEW (surface: EventView, mode: Operate)
  ----------------------------------------------------------------------------
  THESIS: Orquestrador das duas superfícies do evento — conecta o usuário
  autenticado ao Supabase via useEvent, alterna entre Dashboard e Settings,
  e aplica o tema do evento ao redor de ambas. Rejeita roteamento complexo
  para duas telas acopladas.
  OWN-WORLD: Mesmo sistema de tokens `--theme-*`; estados de loading, erro e
  vazio consistentes com o craft floor (spinner, mensagem de erro, empty state).
  STORY: Usuário logado chega ao evento mais recente; navega para
  configurações e volta; tema se mantém coerente em toda a navegação.
  FIRST VIEWPORT: Verifica autenticação → carrega eventos → exibe Dashboard
  ou registro adequado (empty/error).
  FORM: Extensão de superfície dentro do mundo estabelecido; seleção direta.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the
  finish review, the verdict, and DESIGN.md.
  ============================================================================
*/}
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useEvent } from '../../hooks/useEvent'
import { getThemeStyle } from '../../utils/theme'
import { EventDashboard } from './EventDashboard'
import { EventSettings } from './EventSettings'

type View = 'dashboard' | 'settings'

/** Tema padrão aplicado aos estados de loading/erro/vazio (sem evento carregado) */
const DEFAULT_THEME_STYLE = getThemeStyle('rose-gold') as CSSProperties

/**
 * Componente orquestrador do dashboard do evento.
 *
 * - Protege o acesso: exige sessão autenticada
 * - Carrega eventos do usuário logado via `useEvent` (Supabase + RLS)
 * - Alterna entre EventDashboard e EventSettings
 *
 * Uso:
 *   <EventView />
 */
export function EventView() {
  const { user, loading: authLoading } = useAuth()
  const { event, events, loading: eventLoading, error, refresh, selectEvent, saveEvent } =
    useEvent()
  const [view, setView] = useState<View>('dashboard')

  // Aguarda autenticação e carregamento inicial
  if (authLoading || eventLoading) {
    return (
      <div className="dashboard-shell" style={DEFAULT_THEME_STYLE}>
        <div className="state-panel">
          <div className="state-spinner" role="status" aria-label="Carregando" />
          <p className="state-message">Carregando suas informações...</p>
        </div>
      </div>
    )
  }

  // Usuário não autenticado — retorna vazio (login será tratado em outra etapa)
  if (!user) {
    return null
  }

  // Erro ao carregar eventos
  if (error) {
    return (
      <div className="dashboard-shell" style={DEFAULT_THEME_STYLE}>
        <div className="state-panel">
          <p className="state-message state-error">⚠ {error}</p>
          <button type="button" className="btn-primary" onClick={() => void refresh()} style={{ marginTop: '1.25rem' }}>
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // Sem eventos cadastrados
  if (!event) {
    return (
      <div className="dashboard-shell" style={DEFAULT_THEME_STYLE}>
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true">
            ✨
          </span>
          <h1 className="empty-state-title">Nenhum evento criado</h1>
          <p className="empty-state-text">
            Crie seu primeiro evento para começar a planejar convidados, fornecedores, tarefas e orçamento.
          </p>
        </div>
      </div>
    )
  }

  const handleSelectEvent = (id: string) => {
    void selectEvent(id)
    setView('dashboard')
  }

  const handleSave = (id: string, values: Parameters<typeof saveEvent>[1]) => {
    return saveEvent(id, values)
  }

  if (view === 'settings') {
    return (
      <EventSettings
        event={event}
        onSave={handleSave}
        onBack={() => setView('dashboard')}
      />
    )
  }

  return (
    <EventDashboard
      event={event}
      events={events}
      onSelectEvent={handleSelectEvent}
      onOpenSettings={() => setView('settings')}
    />
  )
}