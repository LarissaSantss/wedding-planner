import type {
  EventType,
  EventStatus,
  CompanionRelationship,
} from '../lib/supabase/types'

/** Labels amigáveis por tipo de evento */
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: 'Casamento',
  debutante: '15 Anos',
  birthday: 'Aniversário',
  anniversary: 'Bodas',
  corporate: 'Corporativo',
  graduation: 'Formatura',
  other: 'Outro Evento',
}

/** Labels das relações de acompanhantes */
export const COMPANION_RELATIONSHIP_LABELS: Record<CompanionRelationship, string> = {
  spouse: 'Cônjuge',
  partner: 'Parceiro(a)',
  child: 'Filho(a)',
  parent: 'Pai/Mãe',
  friend: 'Amigo(a)',
  other: 'Outro',
}

export const COMPANION_RELATIONSHIP_LIST = Object.keys(
  COMPANION_RELATIONSHIP_LABELS,
) as CompanionRelationship[]

/** Emoji/ícone por tipo de evento (usado como marca visual na interface) */
export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  wedding: '💍',
  debutante: '👑',
  birthday: '🎂',
  anniversary: '💞',
  corporate: '🏢',
  graduation: '🎓',
  other: '✨',
}

/** Status por extenso em português */
export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Rascunho',
  planned: 'Planejado',
  confirmed: 'Confirmado',
  completed: 'Concluído',
}

/** Papel do usuário que cria o evento em relação aos homenageados. */
export type RoleOption = 'self' | 'other' | 'none'

export interface EventNameField {
  key: 'name1' | 'name2'
  label: string
  placeholder: string
  required?: boolean
}

/**
 * Configuração de nomes por tipo de evento.
 * `roleQuestion` define a pergunta "Qual o seu papel?" quando pertinente,
 * e `autoFillRole` indica qual campo recebe o nome do usuário logado.
 */
export interface EventNameConfig {
  /** Pergunta opcional exibida antes dos campos de nome. */
  roleQuestion?: string
  /** Opções de papel (self = eu sou o homenageado; none = não sou). */
  roleOptions?: { value: RoleOption; label: string }[]
  /** Campo preenchido automaticamente quando `self` é escolhido. */
  selfField?: 'name1' | 'name2'
  /** Campo preenchido automaticamente quando `other` é escolhido (casamento). */
  otherField?: 'name1' | 'name2'
  /** Campo preenchido automaticamente quando `none` é escolhido. */
  noneField?: 'name1' | 'name2'
  /** Campos de nome a serem preenchidos. */
  fields: EventNameField[]
}

export const EVENT_NAME_CONFIG: Record<EventType, EventNameConfig> = {
  wedding: {
    roleQuestion: 'Você é um dos noivos?',
    roleOptions: [
      { value: 'self', label: 'Sou a noiva' },
      { value: 'other', label: 'Sou o noivo' },
      { value: 'none', label: 'Não sou um dos noivos' },
    ],
    selfField: 'name1',
    otherField: 'name2',
    fields: [
      { key: 'name1', label: 'Nome da noiva', placeholder: 'Ex: Ana' },
      { key: 'name2', label: 'Nome do noivo', placeholder: 'Ex: Bruno' },
    ],
  },
  debutante: {
    roleQuestion: 'Você é a aniversariante?',
    roleOptions: [
      { value: 'self', label: 'Sou a aniversariante' },
      { value: 'none', label: 'Estou organizando' },
    ],
    selfField: 'name1',
    noneField: 'name2',
    fields: [
      { key: 'name1', label: 'Nome da aniversariante', placeholder: 'Ex: Larissa' },
      { key: 'name2', label: 'Nome de quem organiza', placeholder: 'Ex: Maria (organizadora)' },
    ],
  },
  birthday: {
    roleQuestion: 'Você é o(a) aniversariante?',
    roleOptions: [
      { value: 'self', label: 'Sou o(a) aniversariante' },
      { value: 'none', label: 'Não sou' },
    ],
    selfField: 'name1',
    fields: [
      { key: 'name1', label: 'Nome do(a) aniversariante', placeholder: 'Ex: João' },
    ],
  },
  anniversary: {
    fields: [
      { key: 'name1', label: 'Nome do casal (1)', placeholder: 'Ex: Ana' },
      { key: 'name2', label: 'Nome do casal (2)', placeholder: 'Ex: Bruno' },
    ],
  },
  corporate: {
    fields: [
      { key: 'name1', label: 'Nome da empresa', placeholder: 'Ex: Acme Ltda' },
      { key: 'name2', label: 'Nome do responsável', placeholder: 'Ex: Carlos' },
    ],
  },
  graduation: {
    fields: [
      { key: 'name1', label: 'Nome do(a) formando(a)', placeholder: 'Ex: Júlia' },
    ],
  },
  other: {
    fields: [
      { key: 'name1', label: 'Nome principal', placeholder: 'Ex: Nome do homenageado' },
    ],
  },
}

/**
 * Monta o rótulo com os nomes dos homenageados.
 * Em casamentos, o noivo vem primeiro (client_name_2 = noivo).
 */
export function getCoupleLabel(event: {
  event_type: EventType
  client_name_1: string | null
  client_name_2: string | null
}): string | null {
  const a = event.client_name_1
  const b = event.client_name_2
  const ordered = event.event_type === 'wedding' ? [b, a] : [a, b]
  const names = ordered.filter((name): name is string => Boolean(name))
  return names.length > 0 ? names.join(' & ') : null
}

/**
 * Formata um valor numérico como moeda BRL.
 * Ex: 12500.5 → "R$ 12.500,50"
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Formata um número com separador de milhar brasileiro.
 * Ex: 150 → "150"
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('pt-BR').format(value)
}

/**
 * Formata uma data ISO para o padrão brasileiro.
 * Ex: "2026-11-28" → "28/11/2026"
 */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'A definir'
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'A definir'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/**
 * Calcula a contagem regressiva em dias para uma data ISO.
 * Retorna positivo quando a data está no futuro, 0 se for hoje, negativo se passou.
 */
export function daysUntil(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null

  const diff = target.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Mensagem amigável da contagem regressiva.
 */
export function formatCountdown(isoDate: string | null | undefined): string {
  const days = daysUntil(isoDate)
  if (days === null) return 'Data a definir'

  if (days > 1) return `Faltam ${days} dias`
  if (days === 1) return 'Falta 1 dia'
  if (days === 0) return 'É hoje! 🎉'
  return 'Evento realizado'
}

export interface DateDiff {
  years: number
  months: number
  days: number
}

/**
 * Calcula a diferença exata de calendário entre hoje e a data do evento.
 * Subtrai anos completos primeiro, depois meses restantes e por fim dias,
 * respeitando o comprimento real de cada mês (sem dividir por 30).
 *
 * Ex: hoje 12/08/2026 → evento 11/09/2027 = 1 ano, 0 meses, 30 dias.
 */
export function buildDateDiff(isoDate: string | null | undefined): DateDiff | null {
  if (!isoDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null

  if (target.getTime() <= today.getTime()) {
    return { years: 0, months: 0, days: 0 }
  }

  let years = target.getFullYear() - today.getFullYear()
  let months = target.getMonth() - today.getMonth()
  let days = target.getDate() - today.getDate()

  if (days < 0) {
    months -= 1
    // Dias do mês anterior ao mês-alvo (0 = último dia do mês anterior)
    const prevMonthLastDay = new Date(
      target.getFullYear(),
      target.getMonth(),
      0,
    ).getDate()
    days += prevMonthLastDay
  }

  if (months < 0) {
    years -= 1
    months += 12
  }

  return { years, months, days }
}

/** Pluraliza os rótulos do contador (1 ano / 2 anos). */
export function countdownLabel(value: number, singular: string, plural: string): string {
  return value === 1 ? singular : plural
}
