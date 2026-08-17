import type { GuestRole, GuestGroup, EventType, RsvpStatus } from '../lib/supabase/types'

/**
 * Sugestão de grupo a partir da relação com o evento.
 * Usada na "inteligência de preenchimento" — mostrada como sugestão,
 * nunca aplicada sem o consentimento do usuário.
 */
export const RELATIONSHIP_TO_GROUP_SUGGESTION: Record<string, string> = {
  'Mãe da noiva': 'Família da noiva',
  'Pai da noiva': 'Família da noiva',
  'Irmã da noiva': 'Família da noiva',
  'Irmão da noiva': 'Família da noiva',
  'Avó da noiva': 'Família da noiva',
  'Avô da noiva': 'Família da noiva',
  'Familiar da noiva': 'Família da noiva',
  'Mãe do noivo': 'Família do noivo',
  'Pai do noivo': 'Família do noivo',
  'Irmã do noivo': 'Família do noivo',
  'Irmão do noivo': 'Família do noivo',
  'Avó do noivo': 'Família do noivo',
  'Avô do noivo': 'Família do noivo',
  'Familiar do noivo': 'Família do noivo',
  'Amigo da noiva': 'Amigos da noiva',
  'Amigo do noivo': 'Amigos do noivo',
  'Colega de trabalho': 'Trabalho',
  Padrinho: 'Padrinhos',
  Madrinha: 'Padrinhos',
}

/** Sugestão de grupo a partir de um papel especial. */
export const ROLE_TO_GROUP_SUGGESTION: Record<string, string> = {
  Padrinho: 'Padrinhos',
  Madrinha: 'Padrinhos',
  Daminha: 'Padrinhos',
  'Pajém': 'Padrinhos',
  Florista: 'Padrinhos',
  'Porta-alianças': 'Padrinhos',
}

/** Cores padrão sugeridas para novos grupos. */
export const GROUP_COLOR_PRESETS = [
  '#d4a5a5', // rosa suave
  '#a5b8d4', // azul suave
  '#c9a9d4', // lavanda
  '#a8d4c0', // sálvia
  '#e8c9a0', // pêssego
  '#f2d1a0', // creme
  '#9db4c0', // cinza-azulado
  '#b0b0b0', // cinza
  '#c26a8a', // rosa forte
  '#5b7a9d', // azul profundo
  '#7a8a6a', // verde-oliva
  '#c9a227', // dourado
] as const

/** Ícones disponíveis para papéis especiais (keys consistentes com o seed). */
export const ROLE_ICON_OPTIONS = [
  { value: 'star', label: 'Estrela', emoji: '⭐' },
  { value: 'heart', label: 'Coração', emoji: '💖' },
  { value: 'user-check', label: 'Padrinho', emoji: '🤵' },
  { value: 'flower', label: 'Flor', emoji: '🌸' },
  { value: 'ring', label: 'Aliança', emoji: '💍' },
  { value: 'mic', label: 'Microfone', emoji: '🎤' },
  { value: 'book-open', label: 'Leitura', emoji: '📖' },
  { value: 'walk', label: 'Entrada', emoji: '🚶' },
  { value: 'handshake', label: 'Recepção', emoji: '🤝' },
  { value: 'crown', label: 'Coroa', emoji: '👑' },
  { value: 'sparkles', label: 'Brilho', emoji: '✨' },
  { value: 'party', label: 'Festa', emoji: '🎉' },
] as const

/** Mapa de ícone → emoji para exibição. */
export const ROLE_ICON_EMOJI: Record<string, string> = {
  star: '⭐',
  heart: '💖',
  'user-check': '🤵',
  flower: '🌸',
  ring: '💍',
  mic: '🎤',
  'book-open': '📖',
  walk: '🚶',
  handshake: '🤝',
  crown: '👑',
  sparkles: '✨',
  party: '🎉',
  default: '🎭',
}

/** Retorna emoji do ícone ou fallback. */
export function roleIconEmoji(icon: string | null | undefined): string {
  return ROLE_ICON_EMOJI[icon ?? ''] ?? ROLE_ICON_EMOJI.default
}

/** Rótulos e cores do status RSVP. */
export const RSVP_STATUS_META: Record<
  RsvpStatus,
  { label: string; className: string; dot: string }
> = {
  confirmed: { label: 'Confirmada', className: 'is-confirmed', dot: '🟢' },
  pending: { label: 'Pendente', className: 'is-pending', dot: '🟡' },
  declined: { label: 'Recusada', className: 'is-declined', dot: '🔴' },
}

/** Labels da legenda de prioridade. */
export const PRIORITY_LEGEND: Record<1 | 2 | 3, string> = {
  3: 'Indispensável',
  2: 'Desejável',
  1: 'Se houver disponibilidade',
}

/**
 * Campos considerados para a completude do perfil de um convidado.
 * Retorna os itens que estão faltando (labels amigáveis).
 */
export function getMissingGuestFields(guest: {
  name: string
  email?: string | null
  phone?: string | null
  relationship_to_event?: string | null
  group_id?: string | null
  invited_by?: string | null
}): string[] {
  const missing: string[] = []
  if (!guest.email?.trim()) missing.push('E-mail')
  if (!guest.phone?.trim()) missing.push('Telefone')
  if (!guest.relationship_to_event?.trim()) missing.push('Relação com o evento')
  if (!guest.group_id) missing.push('Grupo')
  if (!guest.invited_by) missing.push('Convidado de')
  return missing
}

/**
 * Calcula o percentual de completude de um convidado (0–100).
 * Apenas o nome é obrigatório na criação; os demais campos pontuam.
 */
export function guestCompletionPercent(guest: {
  email?: string | null
  phone?: string | null
  relationship_to_event?: string | null
  group_id?: string | null
  invited_by?: string | null
  priority?: number | null
}): number {
  const fields = [
    Boolean(guest.email?.trim()),
    Boolean(guest.phone?.trim()),
    Boolean(guest.relationship_to_event?.trim()),
    Boolean(guest.group_id),
    Boolean(guest.invited_by),
    guest.priority !== null && guest.priority !== undefined,
  ]
  const done = fields.filter(Boolean).length
  return Math.round((done / fields.length) * 100)
}

/** Label de "Convidado de" por valor bruto. */
export function invitedByShortLabel(
  value: string | null | undefined,
  client1: string | null,
  client2: string | null,
): string {
  if (value === 'client_1') return client1 ?? 'Noiva'
  if (value === 'client_2') return client2 ?? 'Noivo'
  if (value === 'both') return 'Ambos'
  return 'A definir'
}

/** Busca global normalizada: procura em vários campos do convidado. */
export function guestMatchesSearch(guest: {
  name: string
  email?: string | null
  phone?: string | null
  relationship_to_event?: string | null
  group_name?: string | null
  role_names?: string[]
  companion_names?: string[]
}, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const haystack = [
    guest.name,
    guest.email ?? '',
    guest.phone ?? '',
    guest.relationship_to_event ?? '',
    guest.group_name ?? '',
    ...(guest.role_names ?? []),
    ...(guest.companion_names ?? []),
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(q)
}

/** Aplica o seletor de chips com cor de fundo suave a partir de um hex. */
export function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Agrupa os grupos por nome (case-insensitive) para evitar duplicatas. */
export function findGroupByName(groups: GuestGroup[], name: string): GuestGroup | undefined {
  const target = name.trim().toLowerCase()
  return groups.find((g) => g.name.trim().toLowerCase() === target)
}

/** Encontra o grupo sugerido para uma relação/papel, se existir na lista. */
export function findSuggestedGroup(
  groups: GuestGroup[],
  relationship: string | null | undefined,
  roleNames: string[],
): GuestGroup | undefined {
  if (!relationship && roleNames.length === 0) return undefined

  if (relationship) {
    const suggested = RELATIONSHIP_TO_GROUP_SUGGESTION[relationship]
    if (suggested) {
      const found = findGroupByName(groups, suggested)
      if (found) return found
    }
  }

  for (const roleName of roleNames) {
    const suggested = ROLE_TO_GROUP_SUGGESTION[roleName]
    if (suggested) {
      const found = findGroupByName(groups, suggested)
      if (found) return found
    }
  }

  return undefined
}

/** Tipo de evento como label amigável (para filtros). */
export const EVENT_TYPE_LABEL_FOR_GUEST: Record<EventType, string> = {
  wedding: 'Casamento',
  debutante: '15 anos',
  birthday: 'Aniversário',
  anniversary: 'Bodas',
  corporate: 'Corporativo',
  graduation: 'Formatura',
  other: 'Evento',
}