import type { TaskCategory } from '../lib/supabase/types'

export interface CategoryIcon {
  key: string
  emoji: string
  label: string
}

/** Ícones disponíveis para categorias (centralizados, sem emoji espalhado). */
export const CATEGORY_ICONS: CategoryIcon[] = [
  { key: 'music', emoji: '🎵', label: 'Música' },
  { key: 'food', emoji: '🍽️', label: 'Alimentação' },
  { key: 'clothing', emoji: '👗', label: 'Vestuário' },
  { key: 'decoration', emoji: '🌸', label: 'Decoração' },
  { key: 'photography', emoji: '📸', label: 'Fotografia' },
  { key: 'venue', emoji: '🏛️', label: 'Local' },
  { key: 'transport', emoji: '🚗', label: 'Transporte' },
  { key: 'finance', emoji: '💰', label: 'Financeiro' },
  { key: 'other', emoji: '📁', label: 'Outro' },
]

export function getCategoryIcon(key: string | null | undefined): string {
  return CATEGORY_ICONS.find((i) => i.key === key)?.emoji ?? '📁'
}

/**
 * Regras locais de auto-categorização: palavra-chave no título → nome de
 * categoria. Sem IA externa; a arquitetura permite evoluir depois.
 */
const KEYWORD_RULES: Array<{ keywords: string[]; categoryName: string }> = [
  { keywords: ['banda', 'dj', 'música', 'musica', 'show'], categoryName: 'Música' },
  { keywords: ['bolo', 'buffet', 'comida', 'alimenta', 'doces', 'jantar', 'churrasco'], categoryName: 'Alimentação' },
  { keywords: ['vestido', 'terno', 'roupa', 'traje', 'sapato', 'figurino'], categoryName: 'Vestuário' },
  { keywords: ['flor', 'decora', 'arranjo', 'mesa', 'cenografia'], categoryName: 'Decoração' },
  { keywords: ['fotógrafo', 'fotografo', 'fotografia', 'filmagem', 'vídeo', 'video'], categoryName: 'Fotografia' },
  { keywords: ['local', 'espaço', 'espaco', 'salão', 'salao', 'igreja', 'cerimonial'], categoryName: 'Local' },
  { keywords: ['transporte', 'carro', 'limousine', 'van', 'transfer'], categoryName: 'Transporte' },
  { keywords: ['orçamento', 'orcamento', 'pagamento', 'contrato', 'custo', 'cobrança'], categoryName: 'Financeiro' },
]

/**
 * Sugere uma categoria existente a partir do título da tarefa.
 * Retorna null se nenhuma regra casar ou se a categoria não existir.
 */
export function suggestCategory(
  title: string,
  categories: TaskCategory[],
): TaskCategory | null {
  const normalized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((k) => normalized.includes(k))) {
      const match = categories.find(
        (c) => c.name.toLowerCase() === rule.categoryName.toLowerCase(),
      )
      if (match) return match
    }
  }
  return null
}

/**
 * Retorna o nome de categoria canônico sugerido para um título,
 * independentemente de a categoria já existir no evento.
 */
export function suggestCategoryName(title: string): string | null {
  const normalized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((k) => normalized.includes(k))) {
      return rule.categoryName
    }
  }
  return null
}