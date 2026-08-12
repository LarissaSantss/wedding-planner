import type { PastelColorKey } from '../lib/supabase/types'

/**
 * Paleta pastel sofisticada do Kanban do LUNA.
 * Centraliza os hexadecimais — não espalhe cores pelo código.
 */
export interface PastelColor {
  key: PastelColorKey
  label: string
  /** Cor de fundo (clara) */
  background: string
  /** Cor do texto/fundo um pouco mais forte para chips e bordas */
  foreground: string
  /** Borda/badge */
  accent: string
}

export const PASTEL_PALETTE: Record<PastelColorKey, PastelColor> = {
  rose: { key: 'rose', label: 'Rosa', background: '#FBE9EC', foreground: '#C98A95', accent: '#E7C0C7' },
  lavender: { key: 'lavender', label: 'Lavanda', background: '#F0ECFA', foreground: '#9B8BC4', accent: '#D3C9EE' },
  sage: { key: 'sage', label: 'Sálvia', background: '#EAF3EC', foreground: '#7FA88C', accent: '#C4DCCB' },
  blue: { key: 'blue', label: 'Azul', background: '#E8F0F8', foreground: '#7B9CC0', accent: '#C5D8EC' },
  peach: { key: 'peach', label: 'Pêssego', background: '#FCEFE7', foreground: '#D29A78', accent: '#F1CBB4' },
  vanilla: { key: 'vanilla', label: 'Baunilha', background: '#FAF3E3', foreground: '#C4A86A', accent: '#EADAB8' },
  beige: { key: 'beige', label: 'Bege', background: '#F4EFE8', foreground: '#A99A82', accent: '#DDD2C2' },
  gray: { key: 'gray', label: 'Cinza', background: '#F0F1F3', foreground: '#8B9199', accent: '#D2D6DA' },
}

export const PASTEL_PALETTE_LIST: PastelColor[] = Object.values(PASTEL_PALETTE)

export function getPastelColor(key: PastelColorKey | string | null | undefined): PastelColor {
  if (!key) return PASTEL_PALETTE.gray
  return (PASTEL_PALETTE as Record<string, PastelColor>)[key] ?? PASTEL_PALETTE.gray
}