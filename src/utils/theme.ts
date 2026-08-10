import type { CSSProperties } from 'react'
import type { ThemePreset } from '../lib/supabase/types'

/**
 * Paleta de cores por preset de tema.
 * Cada tema define cores primária, secundária, destaque e superfícies.
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

export const THEME_PRESETS: Record<ThemePreset, ThemePalette> = {
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

export const THEME_PRESET_LIST: ThemePreset[] = Object.keys(
  THEME_PRESETS,
) as ThemePreset[]

/**
 * Retorna a paleta de cores completa para um preset de tema.
 * Fallback seguro para 'rose-gold' se o preset for inválido.
 */
export function getThemePalette(preset: ThemePreset | null | undefined): ThemePalette {
  if (!preset) return THEME_PRESETS['rose-gold']
  return THEME_PRESETS[preset] ?? THEME_PRESETS['rose-gold']
}

/**
 * Gera o objeto `style` para aplicar cores CSS dinâmicas em um elemento.
 *
 * Uso:
 *   const theme = useEventTheme(event.theme_preset)
 *   <div style={theme.style}>...</div>
 */
export function getThemeStyle(preset: ThemePreset | null | undefined) {
  const palette = getThemePalette(preset)

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