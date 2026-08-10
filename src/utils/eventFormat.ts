import type { EventType, EventStatus } from '../lib/supabase/types'

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