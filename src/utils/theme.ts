import type { CSSProperties } from 'react'
import type { ThemePreset } from '../lib/supabase/types'

/**
 * Paleta de cores completa aplicada ao redor do evento.
 * Para presets fixos retorna a mão exata do designer; para `custom`,
 * deriva toda a paleta a partir de três cores escolhidas pelo usuário.
 */
export interface ThemePalette {
  preset: ThemePreset
  label: string
  /** Cor primária — elementos de destaque e ações principais */
  primary: string
  /** Cor primária com opacidade para hover/estados */
  primaryHover: string
  /** Cor secundária — elementos de apoio e acentos */
  secondary: string
  /** Cor de destaque — badges, ênfases, detalhes */
  accent: string
  /** Cor de fundo da superfície principal (cards, painéis) */
  surface: string
  /** Cor de texto principal */
  text: string
  /** Cor de texto secundário */
  textMuted: string
  /** Cor de borda padrão */
  border: string
  /** Gradiente sofisticado do tema (exclusivo por preset) */
  gradient: string
  /** Cor da barra de progresso/indicadores */
  progress: string
}

/** Presets fixos (exclui o tema 'custom', que é gerado em tempo de execução). */
export type ThemePresetName = Exclude<ThemePreset, 'custom'>

export const THEME_PRESETS: Record<ThemePresetName, ThemePalette> = {
  'rose-gold': {
    preset: 'rose-gold',
    label: 'Rose Gold',
    primary: '#B76E79',
    primaryHover: '#A05D68',
    secondary: '#E8C4C4',
    accent: '#D4AF37',
    surface: '#FFF9F9',
    text: '#3D2C2E',
    textMuted: '#8A7174',
    border: '#EAD5D5',
    gradient: 'linear-gradient(135deg, #B76E79 0%, #E8C4C4 50%, #F5E6E6 100%)',
    progress: '#B76E79',
  },
  emerald: {
    preset: 'emerald',
    label: 'Esmeralda Real',
    primary: '#0E7C5B',
    primaryHover: '#0A6348',
    secondary: '#A8D5C2',
    accent: '#D4AF37',
    surface: '#F4FAF7',
    text: '#10352A',
    textMuted: '#5F7A6F',
    border: '#D0E4DB',
    gradient: 'linear-gradient(135deg, #0E7C5B 0%, #1FA97C 50%, #A8D5C2 100%)',
    progress: '#0E7C5B',
  },
  'royal-blue': {
    preset: 'royal-blue',
    label: 'Azul Royal',
    primary: '#1E3A8A',
    primaryHover: '#172E6E',
    secondary: '#93C5FD',
    accent: '#FBBF24',
    surface: '#F5F8FF',
    text: '#1E293B',
    textMuted: '#64748B',
    border: '#DBEAFE',
    gradient: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #93C5FD 100%)',
    progress: '#1E3A8A',
  },
  'mystic-violet': {
    preset: 'mystic-violet',
    label: 'Violeta Místico',
    primary: '#6D28D9',
    primaryHover: '#5B21B6',
    secondary: '#C4B5FD',
    accent: '#F0ABFC',
    surface: '#FAF5FF',
    text: '#2E1065',
    textMuted: '#7C6A9F',
    border: '#E9D5FF',
    gradient: 'linear-gradient(135deg, #6D28D9 0%, #8B5CF6 50%, #C4B5FD 100%)',
    progress: '#6D28D9',
  },
  'amber-gold': {
    preset: 'amber-gold',
    label: 'Amber Gold',
    primary: '#B45309',
    primaryHover: '#92400E',
    secondary: '#FCD34D',
    accent: '#F59E0B',
    surface: '#FFFBEB',
    text: '#451A03',
    textMuted: '#92643A',
    border: '#FEF3C7',
    gradient: 'linear-gradient(135deg, #B45309 0%, #D97706 50%, #FCD34D 100%)',
    progress: '#B45309',
  },
  'luxury-dark': {
    preset: 'luxury-dark',
    label: 'Luxury Dark',
    primary: '#C9A227',
    primaryHover: '#B08A1F',
    secondary: '#E5C158',
    accent: '#F5E1A4',
    surface: '#1A1A1A',
    text: '#F5F5F5',
    textMuted: '#A3A3A3',
    border: '#3D3D3D',
    gradient: 'linear-gradient(135deg, #1A1A1A 0%, #2E2E2E 50%, #C9A227 100%)',
    progress: '#C9A227',
  },
}

export const THEME_PRESET_LIST: ThemePresetName[] = Object.keys(
  THEME_PRESETS,
) as ThemePresetName[]

/* ============================================================
 * CORES CUSTOMIZADAS
 * ============================================================ */

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

/** Converte um HEX (ex: #B76E79) em canal RGB. */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '').trim()
  const full =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((c) => c + c)
          .join('')
      : cleaned
  const num = Number.parseInt(full.slice(0, 6).padEnd(6, '0'), 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function mixChannel(a: number, b: number, t: number): number {
  return clampChannel(a + (b - a) * t)
}

/** Mistura duas cores HEX com peso `t` (0 → corA, 1 → corB). */
function mixHex(colorA: string, colorB: string, t: number): string {
  const a = hexToRgb(colorA)
  const b = hexToRgb(colorB)
  const r = mixChannel(a.r, b.r, t)
  const g = mixChannel(a.g, b.g, t)
  const bl = mixChannel(a.b, b.b, t)
  return `rgb(${r}, ${g}, ${bl})`
}

/** Clareia uma cor HEX em direção ao branco (`t` define a intensidade). */
function lighten(hex: string, t: number): string {
  return mixHex(hex, '#FFFFFF', t)
}

/** Escurece uma cor HEX em direção ao preto. */
function darken(hex: string, t: number): string {
  return mixHex(hex, '#000000', t)
}

/** Gera a paleta completa para um tema personalizado a partir de 3 cores. */
export function buildCustomPalette(props: {
  primary: string
  secondary: string
  accent: string
}): ThemePalette {
  const primary = props.primary.trim() || '#B76E79'
  const secondary = props.secondary.trim() || '#E8C4C4'
  const accent = props.accent.trim() || '#D4AF37'

  return {
    preset: 'custom',
    label: 'Personalizado',
    primary,
    primaryHover: darken(primary, 0.16),
    secondary,
    accent,
    surface: lighten(primary, 0.96),
    text: darken(primary, 0.72),
    textMuted: darken(primary, 0.42),
    border: lighten(primary, 0.86),
    gradient: `linear-gradient(135deg, ${primary} 0%, ${secondary} 55%, ${accent} 100%)`,
    progress: primary,
  }
}

/** Obtém a paleta de um tema (preset fixo ou customizado em runtime). */
export function getThemePalette(
  preset: ThemePreset | null | undefined,
  custom?: { primary: string | null; secondary: string | null; accent: string | null },
): ThemePalette {
  if (preset === 'custom') {
    return buildCustomPalette({
      primary: custom?.primary ?? '#B76E79',
      secondary: custom?.secondary ?? '#E8C4C4',
      accent: custom?.accent ?? '#D4AF37',
    })
  }
  if (!preset) return THEME_PRESETS['rose-gold']
  return THEME_PRESETS[preset as ThemePresetName] ?? THEME_PRESETS['rose-gold']
}

/**
 * Gera o objeto `style` para aplicar cores CSS dinâmicas em um elemento.
 * Aceita um tema customizado opcional (usado quando o preset é 'custom').
 */
export function getThemeStyle(
  preset: ThemePreset | null | undefined,
  custom?: { primary: string | null; secondary: string | null; accent: string | null },
): CSSProperties {
  const palette = getThemePalette(preset, custom)

  return {
    '--theme-primary': palette.primary,
    '--theme-primary-hover': palette.primaryHover,
    '--theme-secondary': palette.secondary,
    '--theme-accent': palette.accent,
    '--theme-surface': palette.surface,
    '--theme-text': palette.text,
    '--theme-text-muted': palette.textMuted,
    '--theme-border': palette.border,
    '--theme-gradient': palette.gradient,
    '--theme-progress': palette.progress,
  } as CSSProperties
}

/**
 * Retorna as classes utilitárias para aplicar em elementos.
 * Compatível com o padrão de variáveis CSS (sem Tailwind config extra).
 */
export function getThemeClassNames(preset: ThemePreset | null | undefined): string {
  const palette = getThemePalette(preset)
  return `theme-${palette.preset}`
}

/**
 * Formata o label do tema para exibição amigável.
 */
export function getThemeLabel(preset: ThemePreset | null | undefined): string {
  return getThemePalette(preset).label
}