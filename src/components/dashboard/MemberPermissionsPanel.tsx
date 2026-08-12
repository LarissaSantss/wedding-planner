import { useEffect, useState } from 'react'
import type { Event, EventMemberRole } from '../../lib/supabase/types'
import { fetchEventMembers, updateMemberPermissions } from '../../lib/supabase/database'

interface MemberRow {
  user_id: string
  role: EventMemberRole
  can_vote: boolean
  can_comment: boolean
  can_prioritize: boolean
  relationship_to_event: string | null
  email: string | null
  full_name: string | null
}

interface MemberPermissionsPanelProps {
  event: Event
}

interface PermissionCheckboxProps {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}

function PermissionCheckbox({ label, checked, disabled, onChange }: PermissionCheckboxProps) {
  return (
    <label className={`permission-toggle${disabled ? ' is-disabled' : ''}${checked ? ' is-checked' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

/**
 * Painel (somente owner) para configurar, por membro, as permissões:
 * pode votar, pode comentar e pode priorizar.
 */
export function MemberPermissionsPanel({ event }: MemberPermissionsPanelProps) {
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      const { data, error: fetchError } = await fetchEventMembers(event.id)
      if (!mounted) return
      if (fetchError) {
        setError('Não foi possível carregar os membros.')
      } else {
        setMembers((data ?? []) as unknown as MemberRow[])
      }
      setLoading(false)
    }
    void load()
    return () => {
      mounted = false
    }
  }, [event.id])

  const update = async (member: MemberRow, patch: Partial<MemberRow>) => {
    setSavingId(member.user_id)
    setError(null)

    const next = {
      can_vote: member.can_vote,
      can_comment: member.can_comment,
      can_prioritize: member.can_prioritize,
      ...patch,
    }

    const { error: updateError } = await updateMemberPermissions(event.id, member.user_id, {
      role: member.role,
      can_vote: next.can_vote,
      can_comment: next.can_comment,
      can_prioritize: next.can_prioritize,
      relationship_to_event: member.relationship_to_event,
    })

    if (updateError) {
      setError('Não foi possível salvar as permissões.')
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.user_id === member.user_id ? { ...m, ...next } : m)),
      )
    }
    setSavingId(null)
  }

  if (loading) {
    return (
      <div className="state-panel" style={{ minHeight: '120px' }}>
        <div className="state-spinner" role="status" aria-label="Carregando membros" />
      </div>
    )
  }

  return (
    <section className="settings-section" aria-labelledby="members-permissions-title">
      <h2 id="members-permissions-title" className="settings-section-title">
        Permissões dos membros
      </h2>
      <p className="settings-section-desc">
        Defina, para cada pessoa, o que ela pode fazer: votar, comentar ou priorizar convidados.
      </p>

      {error && (
        <p className="auth-error" role="alert" style={{ marginBottom: '1rem' }}>
          ⚠ {error}
        </p>
      )}

      {members.length === 0 ? (
        <p className="guest-list-empty">Nenhum membro além do dono.</p>
      ) : (
        <div className="member-permission-list">
          {members.map((member) => (
            <div key={member.user_id} className="member-permission-row">
              <div className="member-permission-identity">
                <span className="member-permission-name">
                  {member.full_name || member.email || 'Membro'}
                </span>
                <span className="member-permission-role">{member.role}</span>
                {savingId === member.user_id && <span className="save-feedback">salvando...</span>}
              </div>
              <div className="member-permission-toggles">
                <PermissionCheckbox
                  label="Pode votar"
                  checked={member.can_vote}
                  onChange={(checked) => void update(member, { can_vote: checked })}
                />
                <PermissionCheckbox
                  label="Pode comentar"
                  checked={member.can_comment}
                  onChange={(checked) => void update(member, { can_comment: checked })}
                />
                <PermissionCheckbox
                  label="Pode priorizar"
                  checked={member.can_prioritize}
                  onChange={(checked) => void update(member, { can_prioritize: checked })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}