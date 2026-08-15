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
  GuestRole,
  GuestRoleAssignment,
  GuestRoleVote,
  GuestRoleVoteStatus,
  CompanionRelationship,
} from '../../lib/supabase/types'
import { getThemeStyle } from '../../utils/theme'
import {
  COMPANION_RELATIONSHIP_LABELS,
  COMPANION_RELATIONSHIP_LIST,
  getRelationshipOptions,
  PRIORITY_LABELS,
} from '../../utils/eventFormat'
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
  fetchGuestRoles,
  createGuestRoleAssignment,
  deleteGuestRoleAssignment,
  fetchGuestRoleAssignments,
  fetchGuestRoleVotes,
  upsertGuestRoleVote,
  fetchEventMembers,
  updateGuest,
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
  onDelete?: () => void
}

interface Member {
  user_id: string
  full_name: string | null
  email: string | null
}

function roleVoteSummary(votes: GuestRoleVote[], assignmentId: string): GuestRoleVoteStatus {
  const list = votes.filter((v) => v.assignment_id === assignmentId)
  if (list.length === 0) return 'pending'
  if (list.some((v) => v.status === 'rejected')) return 'rejected'
  if (list.every((v) => v.status === 'approved')) return 'approved'
  return 'pending'
}

const VOTE_STATUS_LABEL: Record<GuestRoleVoteStatus, string> = {
  pending: '⏳ Em análise',
  approved: '👍 Aprovado',
  rejected: '❌ Reprovado',
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
  onDelete,
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
  const [roles, setRoles] = useState<GuestRole[]>([])
  const [assignments, setAssignments] = useState<GuestRoleAssignment[]>([])
  const [roleVotes, setRoleVotes] = useState<GuestRoleVote[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  const [companionName, setCompanionName] = useState('')
  const [relationship, setRelationship] = useState<CompanionRelationship>('friend')
  const [commentText, setCommentText] = useState('')

  // Informações & vínculo (edição inline)
  const [editName, setEditName] = useState(guest.name)
  const [editRelationship, setEditRelationship] = useState(guest.relationship_to_event ?? '')
  const [editPriority, setEditPriority] = useState(guest.priority ? String(guest.priority) : '')
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoSaved, setInfoSaved] = useState(false)

  // Papéis
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [assignmentTargetId, setAssignmentTargetId] = useState('__guest__')

  const relationshipOptions = getRelationshipOptions(event.event_type)

  const load = useCallback(async () => {
    setLoading(true)
    const [companionsRes, votesRes, commentsRes, rolesRes, assignmentsRes, roleVotesRes, membersRes] =
      await Promise.all([
        fetchCompanionsByGuest(guest.id),
        fetchVotesByGuest(guest.id),
        fetchCommentsByGuest(guest.id),
        fetchGuestRoles(event.id),
        fetchGuestRoleAssignments(event.id),
        fetchGuestRoleVotes(event.id),
        fetchEventMembers(event.id),
      ])
    setCompanions(companionsRes.data ?? [])
    setVotes(votesRes.data ?? [])
    setComments(commentsRes.data ?? [])
    setRoles(rolesRes.data ?? [])
    setAssignments(assignmentsRes.data ?? [])
    setRoleVotes(roleVotesRes.data ?? [])
    setMembers((membersRes.data as Member[]) ?? [])
    setLoading(false)
  }, [guest.id, event.id])

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

  const handleAssignRole = async () => {
    if (!selectedRoleId) return
    const isGuest = assignmentTargetId === '__guest__'
    const { data, error } = await createGuestRoleAssignment({
      event_id: event.id,
      role_id: selectedRoleId,
      guest_id: isGuest ? guest.id : null,
      companion_id: isGuest ? null : assignmentTargetId,
      relationship_to_event: null,
    })
    if (!error && data) {
      setAssignments((prev) => [...prev, data])
      setSelectedRoleId('')
      setAssignmentTargetId('__guest__')
    }
  }

  const handleRemoveAssignment = async (id: string) => {
    const { error } = await deleteGuestRoleAssignment(id)
    if (!error) setAssignments((prev) => prev.filter((a) => a.id !== id))
  }

  const handleVoteAssignment = async (id: string, status: GuestRoleVoteStatus) => {
    const { data, error } = await upsertGuestRoleVote(id, status)
    if (!error && data) {
      setRoleVotes((prev) => {
        const others = prev.filter((v) => v.assignment_id !== id || v.user_id !== data.user_id)
        return [...others, data]
      })
    }
  }

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editName.trim()) return
    setSavingInfo(true)
    await updateGuest(guest.id, {
      name: editName.trim(),
      relationship_to_event: editRelationship || null,
      priority: editPriority ? (Number(editPriority) as Guest['priority']) : null,
    })
    setSavingInfo(false)
    setInfoSaved(true)
    setTimeout(() => setInfoSaved(false), 2000)
  }

  const agreeCount = votes.filter((v) => v.vote === 'agree').length
  const disagreeCount = votes.filter((v) => v.vote === 'disagree').length
  const hasDivergence = agreeCount > 0 && disagreeCount > 0

  const memberName = (userId: string) =>
    members.find((m) => m.user_id === userId)?.full_name ??
    members.find((m) => m.user_id === userId)?.email ??
    'Organizador'

  const ownAssignments = assignments.filter(
    (a) => a.guest_id === guest.id || companions.some((c) => c.id === a.companion_id),
  )

  const roleName = (roleId: string) => roles.find((r) => r.id === roleId)?.name ?? 'Papel'
  const assignmentTargetName = (a: GuestRoleAssignment) => {
    if (a.guest_id === guest.id) return guest.name
    return companions.find((c) => c.id === a.companion_id)?.name ?? 'Acompanhante'
  }

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
          <div className="guest-drawer-header-actions">
            {onDelete && (
              <button type="button" className="btn-secondary" onClick={onDelete}>
                Excluir
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </header>

        {loading ? (
          <div className="state-panel" style={{ minHeight: '200px' }}>
            <div className="state-spinner" role="status" aria-label="Carregando" />
          </div>
        ) : (
          <div className="guest-drawer-body">
            {/* Informações & Vínculo */}
            <section className="guest-drawer-section">
              <h3 className="guest-drawer-section-title">Informações & Vínculo</h3>
              <form onSubmit={handleSaveInfo} className="guest-info-form">
                <div className="form-field">
                  <label className="form-label" htmlFor="gd-name">Nome</label>
                  <input
                    id="gd-name"
                    className="form-control"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="gd-rel">Relação com o evento</label>
                  <select
                    id="gd-rel"
                    className="form-control"
                    value={editRelationship}
                    onChange={(e) => setEditRelationship(e.target.value)}
                  >
                    <option value="">Selecionar...</option>
                    {relationshipOptions.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label" htmlFor="gd-priority">Prioridade</label>
                  <select
                    id="gd-priority"
                    className="form-control"
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                  >
                    <option value="">A definir</option>
                    <option value="3">{PRIORITY_LABELS[3]}</option>
                    <option value="2">{PRIORITY_LABELS[2]}</option>
                    <option value="1">{PRIORITY_LABELS[1]}</option>
                  </select>
                </div>
                {onGroupChange && onCreateGroup && (
                  <div className="form-field">
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
                <div className="guest-info-actions">
                  <button type="submit" className="btn-primary" disabled={savingInfo || !editName.trim()}>
                    {savingInfo ? 'Salvando...' : 'Salvar'}
                  </button>
                  {infoSaved && <span className="save-feedback">✓ Salvo</span>}
                </div>
              </form>
            </section>

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

            {/* Votação do Casal */}
            <section className="guest-drawer-section">
              <h3 className="guest-drawer-section-title">Votação do casal</h3>
              {hasDivergence && (
                <p className="vote-divergence" role="alert">
                  ⚠️ Divergência entre organizadores
                </p>
              )}
              <div className="vote-summary">
                <span className="vote-agree">✓ {agreeCount} concordam</span>
                <span className="vote-disagree">✗ {disagreeCount} discordam</span>
              </div>
              <div className="vote-list">
                {votes.length === 0 && <p className="guest-drawer-empty">Nenhum voto ainda.</p>}
                {votes.map((v) => (
                  <span key={v.id} className={`vote-chip vote-chip-${v.vote}`}>
                    {memberName(v.user_id)} · {v.vote === 'agree' ? '👍 Concorda' : '👎 Discorda'}
                  </span>
                ))}
              </div>
              {canVote && (
                <div className="vote-actions">
                  <button type="button" className="btn-primary" onClick={() => void handleVote('agree')}>
                    👍 Concordar
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => void handleVote('disagree')}>
                    👎 Discordar
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => void handleRemoveVote()}>
                    Remover meu voto
                  </button>
                </div>
              )}
            </section>

            {/* Papéis e votação de papel */}
            <section className="guest-drawer-section">
              <h3 className="guest-drawer-section-title">Papéis especiais</h3>

              <div className="role-assign-form">
                <select
                  className="form-control"
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  aria-label="Selecionar papel"
                >
                  <option value="">Selecionar papel...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <select
                  className="form-control"
                  value={assignmentTargetId}
                  onChange={(e) => setAssignmentTargetId(e.target.value)}
                  aria-label="Atribuir a"
                >
                  <option value="__guest__">{guest.name}</option>
                  {companions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button type="button" className="btn-primary" disabled={!selectedRoleId} onClick={() => void handleAssignRole()}>
                  Atribuir
                </button>
              </div>

              {ownAssignments.length === 0 ? (
                <p className="guest-drawer-empty">Nenhum papel atribuído.</p>
              ) : (
                <ul className="role-assignment-list">
                  {ownAssignments.map((a) => {
                    const status = roleVoteSummary(roleVotes, a.id)
                    return (
                      <li key={a.id} className="role-assignment-item">
                        <div className="role-assignment-info">
                          <span className="role-assignment-role">{roleName(a.role_id)}</span>
                          <span className="role-assignment-target">{assignmentTargetName(a)}</span>
                          <span className={`role-vote-status is-${status}`}>
                            {VOTE_STATUS_LABEL[status]}
                          </span>
                        </div>
                        <div className="role-assignment-vote-actions">
                          <button
                            type="button"
                            className="btn-secondary"
                            aria-label={`Aprovar ${roleName(a.role_id)}`}
                            onClick={() => void handleVoteAssignment(a.id, 'approved')}
                          >
                            👍
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            aria-label={`Deixar ${roleName(a.role_id)} em análise`}
                            onClick={() => void handleVoteAssignment(a.id, 'pending')}
                          >
                            ⏳
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            aria-label={`Reprovar ${roleName(a.role_id)}`}
                            onClick={() => void handleVoteAssignment(a.id, 'rejected')}
                          >
                            ❌
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => void handleRemoveAssignment(a.id)}
                          >
                            Remover
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Comentários / Discussão */}
            <section className="guest-drawer-section">
              <h3 className="guest-drawer-section-title">Comentários</h3>
              {comments.length === 0 ? (
                <p className="guest-drawer-empty">Nenhum comentário ainda. Use @ para mencionar alguém.</p>
              ) : (
                <ul className="comment-list">
                  {comments.map((c) => (
                    <li key={c.id} className="comment-item">
                      <div className="comment-meta">
                        <span className="comment-author">{memberName(c.user_id)}</span>
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
                    placeholder="Escreva um comentário... use @nome para mencionar"
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
