-- ========== TEMA PERSONALIZADO ==========
-- Permite que o usuário escolha qualquer cor (primária, secundária e de
-- destaque) e guarda essas cores no próprio evento, além do preset 'custom'.

-- 1. Colunas de cores personalizadas
alter table public.events
  add column if not exists custom_primary text;

alter table public.events
  add column if not exists custom_secondary text;

alter table public.events
  add column if not exists custom_accent text;

-- 2. Permite o valor 'custom' no tipo de tema
alter table public.events
  drop constraint if exists events_theme_preset_check;

alter table public.events
  add constraint events_theme_preset_check
  check (
    theme_preset in (
      'rose-gold',
      'emerald',
      'royal-blue',
      'mystic-violet',
      'amber-gold',
      'luxury-dark',
      'custom'
    )
  );