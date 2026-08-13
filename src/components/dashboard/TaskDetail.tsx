import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type {
  Event,
  Task,
  TaskAssignee,
  TaskPriority,
  TaskAssigneeRole,
  TaskSubtask,
  TaskComment,
  TaskAttachment,
  TaskActivity,
} from '../../lib/supabase/types'
import { getThemeStyle } from '../../utils/theme'
import {
  fetchTaskAssignees,
  upsertTaskAssignee,
  removeTaskAssignee,
  fetchEventMembers,
  updateTask,
  fetchTaskSubtasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  fetchTaskComments,
  createTaskComment,
  deleteTaskComment,
  fetchTaskAttachments,
  createTaskAttachment,
  deleteTaskAttachment,
  fetchTaskActivity,
  recordTaskActivity,
} from '../../lib/supabase/database'
import { uploadTaskFile } from '../../lib/supabase/storage'

interface TaskDetailProps {
  event: Event
  task: Task
  onClose: () => void
  onUpdated: (task: Task) => void
}

interface MemberOption {
  user_id: string
  full_name: string | null
  email: string | null
}

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
]

const ACTIVITY_LABELS: Record<string, string> = {
  created: 'criou a tarefa',
  updated: 'atualizou a tarefa',
  assignee_added: 'atribuiu um responsável',
  attachment_added: 'adicionou um anexo',
  comment_added: 'comentou',
  subtask_completed: 'concluiu uma subtarefa',
}

export function TaskDetail({ event, task, onClose, onUpdated }: TaskDetailProps) {
  const themeStyle = getThemeStyle(
    event.theme_preset,
    event.theme_preset === 'custom'
      ? { primary: event.custom_primary, secondary: event.custom_secondary, accent: event.custom_accent }
      : undefined,
  ) as CSSProperties

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [dueDate, setDueDate] = useState(task.due_date ?? '')

  const [assignees, setAssignees] = useState<TaskAssignee[]>([])
  const [members, setMembers] = useState<MemberOption[]>([])
  const [memberId, setMemberId] = useState('')
  const [role, setRole] = useState<TaskAssigneeRole>('collaborator')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [subtasks, setSubtasks] = useState<TaskSubtask[]>([])
  const [subtaskTitle, setSubtaskTitle] = useState('')
  const [comments, setComments] = useState<TaskComment[]>([])
  const [commentText, setCommentText] = useState('')
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [activity, setActivity] = useState<TaskActivity[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const [assigneeRes, membersRes, subtasksRes, commentsRes, attachmentsRes, activityRes] =
      await Promise.all([
        fetchTaskAssignees(task.id),
        fetchEventMembers(event.id),
        fetchTaskSubtasks(task.id),
        fetchTaskComments(task.id),
        fetchTaskAttachments(task.id),
        fetchTaskActivity(task.id),
      ])
    setAssignees(assigneeRes.data ?? [])
    setMembers((membersRes.data ?? []) as MemberOption[])
    setSubtasks(subtasksRes.data ?? [])
    setComments(commentsRes.data ?? [])
    setAttachments(attachmentsRes.data ?? [])
    setActivity(activityRes.data ?? [])
  }, [task.id, event.id])

  useEffect(() => {
    void load()
  }, [load])

  const refreshActivity = async () => {
    const { data } = await fetchTaskActivity(task.id)
    setActivity(data ?? [])
  }

  const handleSaveFields = async () => {
    setSaving(true)
    setError(null)
    const { data, error: updateError } = await updateTask(task.id, {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
    })
    if (updateError || !data) {
      setError('Não foi possível salvar.')
    } else {
      onUpdated(data)
      await recordTaskActivity(task.id, 'updated', { title: data.title })
      await refreshActivity()
    }
    setSaving(false)
  }

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberId) return
    const { data, error: assignError } = await upsertTaskAssignee(task.id, memberId, role)
    if (assignError || !data) {
      setError('Não foi possível atribuir o responsável.')
      return
    }
    setAssignees((prev) => {
      const others = prev.filter((a) => a.user_id !== data.user_id)
      return [...others, data]
    })
    setMemberId('')
    await recordTaskActivity(task.id, 'assignee_added')
    await refreshActivity()
  }

  const handleRemoveAssignee = async (assigneeId: string) => {
    const { error: removeError } = await removeTaskAssignee(assigneeId)
    if (!removeError) {
      setAssignees((prev) => prev.filter((a) => a.id !== assigneeId))
    }
  }

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subtaskTitle.trim()) return
    const { data, error: createError } = await createSubtask({
      task_id: task.id,
      title: subtaskTitle.trim(),
      sort_order: subtasks.length,
    })
    if (!createError && data) {
      setSubtasks((prev) => [...prev, data])
      setSubtaskTitle('')
    }
  }

  const handleToggleSubtask = async (subtask: TaskSubtask) => {
    const { data, error: updateError } = await updateSubtask(subtask.id, {
      completed: !subtask.completed,
    })
    if (!updateError && data) {
      setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? data : s)))
      if (data.completed) {
        await recordTaskActivity(task.id, 'subtask_completed', { title: data.title })
        await refreshActivity()
      }
    }
  }

  const handleRemoveSubtask = async (id: string) => {
    const { error: removeError } = await deleteSubtask(id)
    if (!removeError) setSubtasks((prev) => prev.filter((s) => s.id !== id))
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    const { data, error: createError } = await createTaskComment({
      task_id: task.id,
      content: commentText.trim(),
      mentions: [],
    })
    if (!createError && data) {
      setComments((prev) => [...prev, data])
      setCommentText('')
      await recordTaskActivity(task.id, 'comment_added')
      await refreshActivity()
    }
  }

  const handleRemoveComment = async (id: string) => {
    const { error: removeError } = await deleteTaskComment(id)
    if (!removeError) setComments((prev) => prev.filter((c) => c.id !== id))
  }

  const handleUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const { path, error: uploadError } = await uploadTaskFile(task.id, file)
    if (uploadError || !path) {
      setError('Não foi possível enviar o anexo.')
      return
    }
    const { data, error: createError } = await createTaskAttachment({
      task_id: task.id,
      filename: file.name,
      storage_path: path,
      content_type: file.type,
      size_bytes: file.size,
    })
    if (!createError && data) {
      setAttachments((prev) => [...prev, data])
      await recordTaskActivity(task.id, 'attachment_added', { filename: file.name })
      await refreshActivity()
    }
  }

  const handleRemoveAttachment = async (id: string) => {
    const { error: removeError } = await deleteTaskAttachment(id)
    if (!removeError) setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const memberName = (id: string) => {
    const m = members.find((m) => m.user_id === id)
    return m?.full_name || m?.email || 'Membro'
  }

  const doneCount = subtasks.filter((s) => s.completed).length

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="guest-drawer" style={themeStyle} onClick={(e) => e.stopPropagation()}>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => void handleUploadAttachment(e)}
        />

        <header className="guest-drawer-header">
          <h2 className="guest-drawer-name">Detalhes da tarefa</h2>
          <button type="button" className="btn-secondary" onClick={onClose}>Fechar</button>
        </header>

        <div className="guest-drawer-body">
          <div className="form-field" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label" htmlFor="task-detail-title">Título</label>
            <input id="task-detail-title" className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="form-field" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label" htmlFor="task-detail-desc">Descrição</label>
            <textarea id="task-detail-desc" className="form-control" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
            <div className="form-field">
              <label className="form-label" htmlFor="task-detail-priority">Prioridade</label>
              <select id="task-detail-priority" className="form-control" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="task-detail-due">Prazo</label>
              <input id="task-detail-due" className="form-control" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <button type="button" className="btn-primary" onClick={() => void handleSaveFields()} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>

          {/* Subtarefas */}
          <section className="guest-drawer-section">
            <h3 className="guest-drawer-section-title">
              Subtarefas {subtasks.length > 0 ? `(${doneCount}/${subtasks.length})` : ''}
            </h3>
            <ul className="companion-list">
              {subtasks.map((subtask) => (
                <li key={subtask.id} className="companion-item">
                  <label className="subtask-row">
                    <input
                      type="checkbox"
                      checked={subtask.completed}
                      onChange={() => void handleToggleSubtask(subtask)}
                    />
                    <span className={subtask.completed ? 'subtask-done' : ''}>{subtask.title}</span>
                  </label>
                  <button type="button" className="btn-secondary" onClick={() => void handleRemoveSubtask(subtask.id)}>
                    Remover
                  </button>
                </li>
              ))}
            </ul>

            <form onSubmit={handleAddSubtask} className="companion-form">
              <input
                className="form-control"
                type="text"
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                placeholder="Nova subtarefa..."
              />
              <button type="submit" className="btn-primary" disabled={!subtaskTitle.trim()}>Adicionar</button>
            </form>
          </section>

          {/* Responsáveis */}
          <section className="guest-drawer-section">
            <h3 className="guest-drawer-section-title">Responsáveis</h3>
            <ul className="companion-list">
              {assignees.map((a) => (
                <li key={a.id} className="companion-item">
                  <span>
                    {memberName(a.user_id)}
                    {a.role === 'primary' ? ' · Responsável' : ' · Colaborador'}
                  </span>
                  <button type="button" className="btn-secondary" onClick={() => void handleRemoveAssignee(a.id)}>
                    Remover
                  </button>
                </li>
              ))}
            </ul>

            <form onSubmit={handleAssign} className="companion-form">
              <select className="form-control" value={memberId} onChange={(e) => setMemberId(e.target.value)} aria-label="Membro">
                <option value="">Selecionar membro...</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.full_name || m.email}</option>
                ))}
              </select>
              <select className="form-control" value={role} onChange={(e) => setRole(e.target.value as TaskAssigneeRole)} aria-label="Papel">
                <option value="collaborator">Colaborador</option>
                <option value="primary">Responsável</option>
              </select>
              <button type="submit" className="btn-primary" disabled={!memberId}>Atribuir</button>
            </form>
          </section>

          {/* Comentários */}
          <section className="guest-drawer-section">
            <h3 className="guest-drawer-section-title">Comentários</h3>
            <ul className="comment-list">
              {comments.map((comment) => (
                <li key={comment.id} className="comment-item">
                  <div className="comment-meta">
                    <span className="comment-author">{memberName(comment.user_id)}</span>
                    <span className="comment-date">{new Date(comment.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="comment-content">{comment.content}</p>
                  <button type="button" className="btn-secondary" onClick={() => void handleRemoveComment(comment.id)}>Remover</button>
                </li>
              ))}
            </ul>

            <form onSubmit={handleAddComment} className="comment-form">
              <input
                className="form-control"
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Use @nome para mencionar alguém..."
              />
              <button type="submit" className="btn-primary" disabled={!commentText.trim()}>Comentar</button>
            </form>
          </section>

          {/* Anexos */}
          <section className="guest-drawer-section">
            <h3 className="guest-drawer-section-title">Anexos</h3>
            <ul className="companion-list">
              {attachments.map((attachment) => (
                <li key={attachment.id} className="companion-item">
                  <span>📎 {attachment.filename}</span>
                  <button type="button" className="btn-secondary" onClick={() => void handleRemoveAttachment(attachment.id)}>Remover</button>
                </li>
              ))}
            </ul>
            <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
              Adicionar anexo
            </button>
          </section>

          {/* Histórico */}
          <section className="guest-drawer-section">
            <h3 className="guest-drawer-section-title">Histórico</h3>
            <ul className="comment-list">
              {activity.map((entry) => (
                <li key={entry.id} className="comment-item">
                  <div className="comment-meta">
                    <span className="comment-author">{memberName(entry.user_id ?? '')}</span>
                    <span className="comment-date">{new Date(entry.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="comment-content">{ACTIVITY_LABELS[entry.action] ?? entry.action}</p>
                </li>
              ))}
            </ul>
          </section>

          {error && (
            <p className="auth-error" role="alert">
              ⚠ {error}
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}