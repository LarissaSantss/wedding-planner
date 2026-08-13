import { useState } from 'react'
import { useNotifications } from '../../hooks/useNotifications'
import { formatDate } from '../../utils/eventFormat'

/**
 * Sino de notificações do usuário, com contagem de não lidas e dropdown.
 * Usa o hook useNotifications (leitura e marcação).
 */
export function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)

  return (
    <div className="notification-bell">
      <button
        type="button"
        className="notification-bell-button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
      >
        🔔
        {unreadCount > 0 && <span className="notification-bell-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <span className="notification-dropdown-title">Notificações</span>
            {unreadCount > 0 && (
              <button type="button" className="btn-secondary" onClick={() => void markAllRead()}>
                Marcar todas como lidas
              </button>
            )}
          </div>

          {loading ? (
            <div className="state-panel" style={{ minHeight: '80px' }}>
              <div className="state-spinner" role="status" aria-label="Carregando notificações" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="guest-list-empty">Nenhuma notificação.</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={`notification-item${n.read ? '' : ' is-unread'}`}
                  onClick={() => void markRead(n.id)}
                >
                  <span className="notification-item-title">{n.title}</span>
                  {n.body && <span className="notification-item-body">{n.body}</span>}
                  <span className="notification-item-date">{formatDate(n.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}