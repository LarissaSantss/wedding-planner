import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type {
  Event,
  Guest,
  GuestCompanion,
  GuestVote,
  GuestVoteValue,
  GuestComment,
  GuestGroup,
  CompanionRelationship,
} from '../../lib/supabase/types'
import { getThemeStyle } from '../../utils/theme'
import { COMPANION_RELATIONSHIP_LABELS, COMPANION_RELATIONSHIP_LIST } from '../../utils/eventFormat'
import { CreatableGroupSelect } from './CreatableGroupSelect'
import {
  fetchCompanionsByGuest,
  createCompanion,
  deleteCompanion,
  fetchVotesByGuest,
  upsertVote,
  deleteMyVote,
  fetchCommentsByGuest,
  createComment,
  deleteComment,
} from '../../lib/supabase/database'

interface GuestDetailProps {
  event: Event
  guest: Guest
  canVote: boolean
  canComment: boolean
  onClose: () => void
  onGroupChange?: (guestId: string, groupId: string) => void
  groups?: GuestGroup[]
  onCreateGroup?: (name: string) => Promise<GuestGroup | null>
}

export function GuestDetail({
  event,
  guest,
  canVote,
  canComment,
  onClose,
  onGroupChange,
  groups = [],
  onCreateGroup,
}: GuestDetailProps) {
  const themeStyle = getThemeStyle(
    event.theme_preset,
    event.theme_preset === 'custom'
      ? {
          primary: event.custom_primary,
          secondary: event.custom_secondary,
          accent: event.custom_accent,
        }
      : undefined,
  ) as CSSProperties

  const [companions, setCompanions] = useState<GuestCompanion[]>([])
  const [votes, setVotes] = useState<GuestVote[]>([])
  const [comments, setComments] = useState<GuestComment[]>([])
  const [loading, setLoading] = useState(true)

  const [companionName, setCompanionName] = useState('')
  const [relationship, setRelationship] = useState<CompanionRelationship>('friend')
  const [commentText, setCommentText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [companionsRes, votesRes, commentsRes] = await Promise.all([
      fetchCompanionsByGuest(guest.id),
      fetchVotesByGuest(guest.id),
      fetchCommentsByGuest(guest.id),
    ])
    setCompanions(companionsRes.data ?? [])
    setVotes(votesRes.data ?? [])
    setComments(commentsRes.data ?? [])
    setLoading(false)
  }, [guest.id])

  useEffect(() => {
    void load()
  }, [load])

  const handleAddCompanion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companionName.trim()) return
    const { data, error } = await createCompanion({
      guest_id: guest.id,
      name: companionName.trim(),
      relationship,
    })
    if (!error && data) {
      setCompanions((prev) => [...prev, data])
      setCompanionName('')
    }
  }

  const handleRemoveCompanion = async (id: string) => {
    const { error } = await deleteCompanion(id)
    if (!error) setCompanions((prev) => prev.filter((c) => c.id !== id))
  }

  const handleVote = async (value: GuestVoteValue) => {
    const { data, error } = await upsertVote(guest.id, value)
    if (!error && data) {
      setVotes((prev) => {
        const others = prev.filter((v) => v.user_id !== data.user_id)
        return [...others, data]
      })
    }
  }

  const handleRemoveVote = async () => {
    const { error } = await deleteMyVote(guest.id)
    if (!error) {
      // Remove o voto do usuário atual (o backend retorna apenas erro)
      void load()
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    const { data, error } = await createComment({
      guest_id: guest.id,
      content: commentText.trim(),
    })
    if (!error && data) {
      setComments((prev) => [...prev, data])
      setCommentText('')
    }
  }

  const handleRemoveComment = async (id: string) => {
    const { error } = await deleteComment(id)
    if (!error) setComments((prev) => prev.filter((c) => c.id !== id))
  }

  const agreeCount = votes.filter((v) => v.vote === 'agree').length
  const disagreeCount = votes.filter((v) => v.vote === 'disagree').length

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className="guest-drawer"
        style={themeStyle}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Detalhes de ${guest.name}`}
      >
        <header className="guest-drawer-header">
          <div>
            <h2 className="guest-drawer-name">{guest.name}</h2>
            {guest.notes && <p className="guest-drawer-notes">{guest.notes}</p>}
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </header>

        {loading ? (
          <div className="state-panel" style={{ minHeight: '200px' }}>
            <div className="state-spinner" role="status" aria-label="Carregando" />
          </div>
        ) : (
        <div className="guest-drawer-body">
            {/* Grupo */}
            {onGroupChange && onCreateGroup && (
              <div className="form-field" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label" htmlFor="guest-detail-group">Grupo</label>
                <CreatableGroupSelect
                  groups={groups}
                  value={guest.group_id ?? ''}
                  onChange={(value) => onGroupChange(guest.id, value)}
                  onCreate={onCreateGroup}
                  inputId="guest-detail-group"
                />
              </div>
            )}

            {/* Acompanhantes */}
            <section className="guest-drawer-section">
              <h3 className="guest-drawer-section-title">Acompanhantes</h3>
              {companions.length === 0 ? (
                <p className="guest-drawer-empty">Nenhum acompanhante.</p>
              ) : (
                <ul className="companion-list">
                  {companions.map((c) => (
                    <li key={c.id} className="companion-item">
                      <span>
                        {c.name} · {COMPANION_RELATIONSHIP_LABELS[c.relationship]}
                      </span>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => void handleRemoveCompanion(c.id)}
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={handleAddCompanion} className="companion-form">
                <input
                  className="form-control"
                  type="text"
                  value={companionName}
                  onChange={(e) => setCompanionName(e.target.value)}
                  placeholder="Nome do acompanhante"
                />
                <select
                  className="form-control"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value as CompanionRelationship)}
                  aria-label="Relação"
                >
                  {COMPANION_RELATIONSHIP_LIST.map((rel) => (
                    <option key={rel} value={rel}>
                      {COMPANION_RELATIONSHIP_LABELS[rel]}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-primary" disabled={!companionName.trim()}>
                  Adicionar
                </button>
              </form>
            </section>

            {/* Votação */}
            <section className="guest-drawer-section">
              <h3 className="guest-drawer-section-title">Votação</h3>
              <div className="vote-summary">
                <span className="vote-agree">✓ {agreeCount} concordam</span>
                <span className="vote-disagree">✗ {disagreeCount} discordam</span>
              </div>
              <div className="vote-list">
                {votes.length === 0 && <p className="guest-drawer-empty">Nenhum voto ainda.</p>}
                {votes.map((v) => (
                  <span key={v.id} className={`vote-chip vote-chip-${v.vote}`}>
                    Membro · {v.vote === 'agree' ? '✓' : '✗'}
                  </span>
                ))}
              </div>
              {canVote && (
                <div className="vote-actions">
                  <button type="button" className="btn-primary" onClick={() => void handleVote('agree')}>
                    Concordar
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => void handleVote('disagree')}>
                    Discordar
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => void handleRemoveVote()}>
                    Remover meu voto
                  </button>
                </div>
              )}
            </section>

            {/* Discussão */}
            <section className="guest-drawer-section">
              <h3 className="guest-drawer-section-title">Discussão</h3>
              {comments.length === 0 ? (
                <p className="guest-drawer-empty">Nenhum comentário ainda.</p>
              ) : (
                <ul className="comment-list">
                  {comments.map((c) => (
                    <li key={c.id} className="comment-item">
                      <div className="comment-meta">
                        <span className="comment-author">Membro</span>
                        <span className="comment-date">
                          {new Date(c.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="comment-content">{c.content}</p>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => void handleRemoveComment(c.id)}
                      >
                        Remover
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {canComment && (
                <form onSubmit={handleAddComment} className="comment-form">
                  <input
                    className="form-control"
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Escreva um comentário..."
                  />
                  <button type="submit" className="btn-primary" disabled={!commentText.trim()}>
                    Comentar
                  </button>
                </form>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  )
}