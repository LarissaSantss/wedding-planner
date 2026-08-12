# Responsividade, E-mail de Confirmação e Funcionalidade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o Wedding & Events Planner responsivo (desktop + mobile), melhorar a UX do e-mail de confirmação, e tornar o site funcional com criação de eventos (com escolha de tipo) e módulo de Convidados operacional.

**Architecture:** Correção global de layout no CSS raiz (`#root` com largura fixa 1126px → fluido), reforço de media queries no CSS do dashboard, melhorias de auth (reenvio de e-mail + detecção de `email_not_confirmed`), e novas telas React (`EventCreate`, `GuestList`) integradas ao orquestrador `EventView`, persistindo via funções CRUD já existentes em `src/lib/supabase/database.ts`.

**Tech Stack:** React 19 + TypeScript strict + Vite 8 + Supabase (auth + PostgreSQL remoto já linkado/migrado).

## Global Constraints

- TypeScript strict mode ativo (`tsc -b`) — `noUnusedLocals`, `noUnusedParameters` habilitados.
- `verbatimModuleSyntax: true` — imports de tipos DEVEM usar `import type { ... }`.
- Não adicionar novas dependências; usar CSS puro com variáveis `--theme-*` já existentes.
- Tokens de tema: `--theme-primary`, `--theme-primary-hover`, `--theme-secondary`, `--theme-accent`, `--theme-surface`, `--theme-text`, `--theme-text-muted`, `--theme-border`, `--theme-gradient`, `--theme-progress`.
- Texto da UI em português (pt-BR).
- O banco remoto `wedding-planner` (`szrimbylarxaepwwafuq`) já tem a migration aplicada (tabelas `profiles`, `events`, `guests`, `vendors`, `tasks`, `expenses`, `gift_registry_items` com RLS).
- Verificação sem framework de testes: usar `npm run lint`, `npm run build` (type-check + build) e teste manual via `npm run dev`.
- Estados de loading/erro/vazio seguem as classes existentes: `state-panel`, `state-spinner`, `state-message`, `state-error`, `empty-state`.

---

## File Structure

**Modify:**
- `src/index.css` — remover largura fixa do `#root`, layout fluido, ajuste de fonte base.
- `src/components/dashboard/dashboard.css` — media queries mobile reforçadas + estilos novos (create-card, guest-list) seguindo o padrão existente.
- `src/lib/supabase/auth.ts` — adicionar `resendConfirmationEmail`.
- `src/lib/supabase/index.ts` — exportar `resendConfirmationEmail`.
- `src/components/auth/AuthScreen.tsx` — mensagem específica de não confirmado + botão reenviar.
- `src/components/dashboard/EventView.tsx` — novos estados de view (`create`, `module`), botões de criação, integração.
- `src/components/dashboard/EventDashboard.tsx` — botão "Novo evento" e `onOpenModule` nos cards.

**Create:**
- `src/components/dashboard/EventCreate.tsx` — tela de criação de evento com escolha de tipo (grade de cards).
- `src/components/dashboard/GuestList.tsx` — módulo de Convidados (listagem + adição + remoção).

---

### Task 1: Layout fluido global (remover largura fixa do `#root`)

**Files:**
- Modify: `src/index.css:53-63` (regra `#root`), `src/index.css:64-67` (regra `body`)

**Interfaces:**
- Consumes: nada.
- Produces: `#root` com `width: 100%`, sem `text-align: center` nem `border-inline`; `body` com `width: 100%` e `overflow-x: hidden`.

- [ ] **Step 1: Substituir a regra `#root`**

Substituir o bloco atual:

```css
#root {
  width: 1126px;
  max-width: 100%;
  margin: 0 auto;
  text-align: center;
  border-inline: 1px solid var(--border);
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
```

por:

```css
#root {
  width: 100%;
  max-width: none;
  margin: 0;
  text-align: left;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}
```

- [ ] **Step 2: Substituir a regra `body`**

Substituir:

```css
body {
  margin: 0;
}
```

por:

```css
body {
  margin: 0;
  width: 100%;
  overflow-x: hidden;
}
```

- [ ] **Step 3: Ajustar fonte base do `:root`**

No `:root`, alterar `font: 18px/145% var(--sans);` para `font: 16px/145% var(--sans);` (evita overflow em telas pequenas). Manter a media query `@media (max-width: 1024px) { font-size: 16px; }`.

- [ ] **Step 4: Verificar build e lint**

Run: `npm run lint && npm run build`
Expected: lint sem erros; build conclui (`tsc -b` + `vite build`).

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "fix: layout fluido global removendo largura fixa de 1126px"
```

---

### Task 2: Reforçar media queries do dashboard (mobile)

**Files:**
- Modify: `src/components/dashboard/dashboard.css` — bloco `@media (max-width: 640px)` no final.

**Interfaces:**
- Consumes: tokens `--theme-*`.
- Produces: regras `.event-metrics`, `.module-grid`, `.auth-card`, `.event-hero-countdown`, `.dashboard-controls`, `.form-actions` responsivas em `<= 640px`.

- [ ] **Step 1: Adicionar regras mobile ao bloco `@media (max-width: 640px)`**

Dentro do bloco `@media (max-width: 640px)` existente (final do arquivo), adicionar:

```css
  .dashboard-controls {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .event-selector-native {
    max-width: 180px;
    font-size: 0.8rem;
  }

  .event-hero-countdown {
    flex-wrap: wrap;
  }

  .event-metrics {
    grid-template-columns: 1fr;
  }

  .module-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .auth-main {
    padding: 1.25rem 1rem;
  }

  .auth-card {
    padding: 1.5rem 1.25rem;
  }

  .form-actions {
    flex-wrap: wrap;
    justify-content: stretch;
  }

  .form-actions .btn-primary,
  .form-actions .btn-secondary {
    flex: 1 1 auto;
  }
```

- [ ] **Step 2: Adicionar nova seção mobile para telas muito pequenas (`<= 400px`)**

Após o bloco `@media (max-width: 640px)` existente, adicionar:

```css
@media (max-width: 400px) {
  .module-grid {
    grid-template-columns: 1fr;
  }

  .event-hero {
    padding: 1.25rem 1rem;
  }

  .countdown-number {
    font-size: 1.5rem;
  }
}
```

- [ ] **Step 3: Verificar build e lint**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/dashboard.css
git commit -m "fix: reforçar responsividade mobile do dashboard e auth"
```

---

### Task 3: Reenvio de e-mail de confirmação + detecção de `email_not_confirmed`

**Files:**
- Modify: `src/lib/supabase/auth.ts` (após função `signUp`, linha ~16)
- Modify: `src/lib/supabase/index.ts` (lista de exports de auth, ~linha 16)
- Modify: `src/components/auth/AuthScreen.tsx`

**Interfaces:**
- Consumes: `supabase` de `./client`.
- Produces:
  - `resendConfirmationEmail(email: string)` em `auth.ts` e exportada no barrel `index.ts`.
  - Estado `resending: boolean` e handler `handleResend` em `AuthScreen`.

- [ ] **Step 1: Adicionar função `resendConfirmationEmail` em `auth.ts`**

Adicionar após a função `signUp`:

```ts
/**
 * Reenvia o e-mail de confirmação de cadastro
 */
export async function resendConfirmationEmail(email: string) {
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email,
  })
  return { data, error }
}
```

- [ ] **Step 2: Exportar no barrel `index.ts`**

Na Lista "Autenticação" de `src/lib/supabase/index.ts`, adicionar `resendConfirmationEmail` ao bloco de export.

- [ ] **Step 3: Atualizar `AuthScreen.tsx` — import e estado**

Modificar o import para `import { signIn, signUp, resendConfirmationEmail } from '../../lib/supabase/auth'`. Adicionar `const [resending, setResending] = useState(false)` após `const [success, setSuccess] = useState<string | null>(null)`.

- [ ] **Step 4: Atualizar `AuthScreen.tsx` — detecção de erro no login**

No `handleSubmit`, no branch `mode === 'login'`, substituir o bloco de erro genérico por:

```ts
if (mode === 'login') {
  const { error: signInError } = await signIn(email.trim(), password)
  if (signInError) {
    const isNotConfirmed =
      signInError instanceof Error &&
      'code' in signInError &&
      (signInError as Error & { code?: string }).code === 'email_not_confirmed'
    setError(
      isNotConfirmed
        ? 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (e o spam) e clique no link de confirmação, ou reenvie o e-mail abaixo.'
        : 'Email ou senha incorretos. Verifique e tente novamente.',
    )
  }
}
```

- [ ] **Step 5: Atualizar `AuthScreen.tsx` — mensagem de cadastro**

Substituir o `setSuccess` do signup por: `'Conta criada! Enviamos um link de confirmação para seu e-mail. Clique no link antes de entrar. Se não encontrar, verifique a caixa de spam.'`

- [ ] **Step 6: Adicionar handler `handleResend`**

Após `handleSubmit`, adicionar:

```ts
const handleResend = async () => {
  if (!email.trim()) return
  setResending(true)
  const { error: resendError } = await resendConfirmationEmail(email.trim())
  if (resendError) {
    setError('Não foi possível reenviar o e-mail. Verifique se o email está correto e tente novamente.')
  } else {
    setError(null)
    setSuccess('E-mail de confirmação reenviado. Verifique sua caixa de entrada (e o spam).')
  }
  setResending(false)
}
```

- [ ] **Step 7: Renderizar botão de reenvio condicionalmente**

Após os parágrafos `{error && ...}` e `{success && ...}`, e antes do botão submit, adicionar:

```tsx
{(error === 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (e o spam) e clique no link de confirmação, ou reenvie o e-mail abaixo.' ||
  success === 'E-mail de confirmação reenviado. Verifique sua caixa de entrada (e o spam).' ||
  (mode === 'signup' && success)) && (
  <button
    type="button"
    className="btn-secondary"
    style={{ width: '100%', marginTop: '0.75rem' }}
    onClick={() => void handleResend()}
    disabled={resending}
  >
    {resending ? 'Enviando...' : 'Reenviar e-mail de confirmação'}
  </button>
)}
```

- [ ] **Step 8: Verificar build e lint**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 9: Commit**

```bash
git add src/lib/supabase/auth.ts src/lib/supabase/index.ts src/components/auth/AuthScreen.tsx
git commit -m "feat: reenvio de e-mail de confirmação e detecção de email não confirmado"
```

---

### Task 4: Tela de criação de evento com escolha de tipo (`EventCreate`)

**Files:**
- Create: `src/components/dashboard/EventCreate.tsx`
- Modify: `src/components/dashboard/dashboard.css` (adicionar classes do create)

**Interfaces:**
- Consumes:
  - `EventType`, `ThemePreset` de `../../lib/supabase/types`
  - `THEME_PRESETS`, `THEME_PRESET_LIST`, `getThemeStyle` de `../../utils/theme`
  - `EVENT_TYPE_LABELS`, `EVENT_TYPE_ICONS` de `../../utils/eventFormat`
  - `createEvent` de `../../lib/supabase/database`
- Produces:
  - Componente `EventCreate({ theme, onCreated }: { theme: ThemePreset; onCreated: (title: string) => void })`.
  - Em `dashboard.css`: classes `.create-layout`, `.create-card`, `.create-type-grid`, `.create-type-option`, `.create-type-option.is-selected`, `.create-type-icon`, `.create-type-label`.

- [ ] **Step 1: Criar `EventCreate.tsx`**

Criar o arquivo com o conteúdo completo:

```tsx
import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { EventType, ThemePreset } from '../../lib/supabase/types'
import { THEME_PRESETS, THEME_PRESET_LIST, getThemeStyle } from '../../utils/theme'
import { EVENT_TYPE_LABELS, EVENT_TYPE_ICONS } from '../../utils/eventFormat'
import { createEvent } from '../../lib/supabase/database'

interface EventCreateProps {
  theme: ThemePreset
  onCreated: (title: string) => void
}

const EVENT_TYPE_OPTIONS = Object.keys(EVENT_TYPE_LABELS) as EventType[]

export function EventCreate({ theme, onCreated }: EventCreateProps) {
  const themeStyle = getThemeStyle(theme) as CSSProperties
  const [eventType, setEventType] = useState<EventType>('wedding')
  const [title, setTitle] = useState('')
  const [clientName1, setClientName1] = useState('')
  const [clientName2, setClientName2] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [themePreset, setThemePreset] = useState<ThemePreset>(theme)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Dê um título ao seu evento.')
      return
    }
    setCreating(true)
    setError(null)

    const values = {
      title: title.trim(),
      event_type: eventType,
      theme_preset: themePreset,
      client_name_1: clientName1.trim() || null,
      client_name_2: clientName2.trim() || null,
      date: date || null,
      location: location.trim() || null,
      status: 'draft' as const,
    }

    const { error: createError } = await createEvent(values)
    if (createError) {
      setError('Não foi possível criar o evento. Tente novamente.')
      setCreating(false)
      return
    }
    onCreated(title.trim())
  }

  return (
    <div className="dashboard-shell" style={themeStyle}>
      <main className="dashboard-main">
        <div className="create-layout">
          <section className="settings-section create-card" aria-labelledby="create-title">
            <h1 id="create-title" className="settings-section-title" style={{ fontSize: '1.35rem' }}>
              Criar novo evento
            </h1>
            <p className="settings-section-desc">
              Escolha o tipo de celebração e preencha as informações básicas.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-field" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label" htmlFor="create-type">
                  Tipo de evento
                </label>
                <div className="create-type-grid" role="radiogroup" aria-label="Tipo de evento">
                  {EVENT_TYPE_OPTIONS.map((type) => (
                    <button
                      key={type}
                      type="button"
                      role="radio"
                      aria-checked={eventType === type}
                      className={`create-type-option${eventType === type ? ' is-selected' : ''}`}
                      onClick={() => setEventType(type)}
                    >
                      <span className="create-type-icon" aria-hidden="true">
                        {EVENT_TYPE_ICONS[type]}
                      </span>
                      <span className="create-type-label">{EVENT_TYPE_LABELS[type]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field is-wide">
                  <label className="form-label" htmlFor="create-title-input">
                    Título do evento
                  </label>
                  <input
                    id="create-title-input"
                    className="form-control"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Casamento de Ana & Bruno"
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="create-client-1">
                    Nome principal
                  </label>
                  <input
                    id="create-client-1"
                    className="form-control"
                    type="text"
                    value={clientName1}
                    onChange={(e) => setClientName1(e.target.value)}
                    placeholder="Ex: Ana"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="create-client-2">
                    Nome secundário
                  </label>
                  <input
                    id="create-client-2"
                    className="form-control"
                    type="text"
                    value={clientName2}
                    onChange={(e) => setClientName2(e.target.value)}
                    placeholder="Ex: Bruno (opcional)"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="create-date">
                    Data do evento
                  </label>
                  <input
                    id="create-date"
                    className="form-control"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label" htmlFor="create-location">
                    Local
                  </label>
                  <input
                    id="create-location"
                    className="form-control"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ex: Salão Villa Real, São Paulo"
                  />
                </div>

                <div className="form-field is-wide">
                  <label className="form-label" htmlFor="create-theme">
                    Tema visual
                  </label>
                  <div className="theme-grid" role="radiogroup" aria-label="Tema visual">
                    {THEME_PRESET_LIST.map((preset) => {
                      const palette = THEME_PRESETS[preset]
                      const isSelected = preset === themePreset
                      return (
                        <button
                          key={preset}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={`theme-option${isSelected ? ' is-selected' : ''}`}
                          onClick={() => setThemePreset(preset)}
                        >
                          <span className="theme-swatch" style={{ background: palette.gradient }} aria-hidden="true" />
                          <span className="theme-option-label">{palette.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {error && (
                  <p className="auth-error" role="alert">
                    ⚠ {error}
                  </p>
                )}

                <div className="form-actions">
                  <button type="submit" className="btn-primary" disabled={creating}>
                    {creating ? 'Criando...' : 'Criar evento'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Adicionar classes CSS do create em `dashboard.css`**

Adicionar (antes do bloco final `@media (max-width: 640px)`):

```css
/* ---------- Criação de evento ---------- */
.create-layout {
  max-width: 720px;
  margin: 0 auto;
}

.create-card {
  padding: 2rem;
}

.create-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.625rem;
  margin-top: 0.5rem;
}

.create-type-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 0.75rem;
  border: 1px solid var(--theme-border);
  border-radius: var(--radius-card);
  background: color-mix(in srgb, var(--theme-surface) 90%, #fff);
  color: var(--theme-text);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    transform 0.15s ease,
    box-shadow 0.2s ease;
}

.create-type-option:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.create-type-option:focus-visible {
  outline: 2px solid var(--theme-primary);
  outline-offset: 2px;
}

.create-type-option.is-selected {
  border-color: var(--theme-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--theme-primary) 25%, transparent);
}

.create-type-icon {
  font-size: 1.5rem;
}

.create-type-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-align: center;
}
```

- [ ] **Step 3: Verificar build e lint**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/EventCreate.tsx src/components/dashboard/dashboard.css
git commit -m "feat: tela de criação de evento com escolha de tipo"
```

---

### Task 5: Integrar criação de evento no `EventView` e dashboard

**Files:**
- Modify: `src/components/dashboard/EventView.tsx`
- Modify: `src/components/dashboard/EventDashboard.tsx`

**Interfaces:**
- Consumes: `EventCreate` (Task 4), `useEvent` (já existente: `refresh`, `selectEvent`, `events`), `AuthScreen` (existente).
- Produces:
  - `EventView` com `type View = 'dashboard' | 'settings' | 'create'` e estado `view`.
  - `EventDashboard` com novas props `onCreateEvent: () => void` e `onOpenModule: (id: string) => void`.

- [ ] **Step 1: Atualizar `EventView.tsx` — tipo de view e import**

- Mudar `type View = 'dashboard' | 'settings'` para `type View = 'dashboard' | 'settings' | 'create'`.
- Importar `EventCreate` (`import { EventCreate } from './EventCreate'`).

- [ ] **Step 2: Atualizar `EventView.tsx` — caso Sem eventos com botão**

No bloco `if (!event)` (estado vazio), adicionar botão logo após o parágrafo `.empty-state-text`:

```tsx
<button
  type="button"
  className="btn-primary"
  onClick={() => setView('create')}
>
  Criar seu primeiro evento
</button>
```

- [ ] **Step 3: Atualizar `EventView.tsx` — render da view create**

No render, após o bloco `if (view === 'settings')`, adicionar:

```tsx
if (view === 'create') {
  return (
    <EventCreate
      theme={event.theme_preset}
      onCreated={async (title) => {
        await refresh()
        const created = events.find((e) => e.title === title)
        if (created) {
          await selectEvent(created.id)
        }
        setView('dashboard')
      }}
    />
  )
}
```

- [ ] **Step 4: Atualizar `EventView.tsx` — caso Sem eventos (view create)**

Adicionar ANTES do bloco `if (!event)`:

```tsx
if (view === 'create' && !event) {
  return (
    <EventCreate
      theme="rose-gold"
      onCreated={async (title) => {
        await refresh()
        const created = events.find((e) => e.title === title)
        if (created) await selectEvent(created.id)
        setView('dashboard')
      }}
    />
  )
}
```

- [ ] **Step 5: Atualizar `EventDashboard.tsx` — props e botão "Novo evento"**

- Adicionar `onCreateEvent: () => void` e `onOpenModule: (id: string) => void` à interface `EventDashboardProps`.
- Desestruturá-las nos parâmetros do componente.
- Na topbar, no `.dashboard-controls`, adicionar antes do botão Configurações:

```tsx
<button type="button" className="btn-primary" onClick={onCreateEvent}>
  + Novo evento
</button>
```

- Nos `MODULES.map`, adicionar `onClick={() => onOpenModule(module.id)}` ao `.module-card`.

- [ ] **Step 6: Atualizar `EventView.tsx` — passar props ao EventDashboard**

No render final do `<EventDashboard ...>`, adicionar:

```tsx
onCreateEvent={() => setView('create')}
onOpenModule={(id) => {
  console.log(`[parking] módulo ${id} ainda não implementado`)
}}
```

- [ ] **Step 7: Verificar build e lint**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/EventView.tsx src/components/dashboard/EventDashboard.tsx
git commit -m "feat: integração do fluxo de criação de evento"
```

---

### Task 6: Módulo de Convidados funcional (`GuestList`)

**Files:**
- Create: `src/components/dashboard/GuestList.tsx`
- Modify: `src/components/dashboard/dashboard.css` (classes da lista de convidados)
- Modify: `src/components/dashboard/EventView.tsx` (view module + integração)

**Interfaces:**
- Consumes:
  - `Guest` de `../../lib/supabase/types`
  - `fetchGuestsByEvent`, `createGuest`, `deleteGuest` de `../../lib/supabase/database`
  - `getThemeStyle` de `../../utils/theme`
- Produces:
  - `GuestList({ event, onBack }: { event: Event; onBack: () => void })`.
  - Em `dashboard.css`: classes `.guest-list`, `.guest-item`, `.guest-item-info`, `.guest-item-name`, `.guest-item-meta`, `.guest-list-empty`, `.guest-form-row`.
  - Em `EventView`: `type View = 'dashboard' | 'settings' | 'create' | 'module'`, estado `activeModule: string | null`.

- [ ] **Step 1: Criar `GuestList.tsx`**

Criar o arquivo com conteúdo completo:

```tsx
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Event, Guest } from '../../lib/supabase/types'
import { getThemeStyle } from '../../utils/theme'
import { fetchGuestsByEvent, createGuest, deleteGuest } from '../../lib/supabase/database'

interface GuestListProps {
  event: Event
  onBack: () => void
}

export function GuestList({ event, onBack }: GuestListProps) {
  const themeStyle = getThemeStyle(event.theme_preset) as CSSProperties
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const { data, error: fetchError } = await fetchGuestsByEvent(event.id, {
        orderBy: { column: 'created_at', ascending: false },
      })
      if (!mounted) return
      if (fetchError) {
        setError(fetchError.message)
      } else {
        setGuests(data ?? [])
      }
      setLoading(false)
    }
    void load()
    return () => {
      mounted = false
    }
  }, [event.id])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    setError(null)
    const { data, error: createError } = await createGuest({
      event_id: event.id,
      name: name.trim(),
      email: email.trim() || null,
    })
    if (createError) {
      setError('Não foi possível adicionar o convidado. Tente novamente.')
    } else if (data) {
      setGuests((prev) => [data, ...prev])
      setName('')
      setEmail('')
    }
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    const { error: deleteError } = await deleteGuest(id)
    if (deleteError) {
      setError('Não foi possível remover o convidado.')
    } else {
      setGuests((prev) => prev.filter((g) => g.id !== id))
    }
  }

  return (
    <div className="dashboard-shell" style={themeStyle}>
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <span className="dashboard-brand-mark" aria-hidden="true">
            👥
          </span>
          <span className="dashboard-brand-name">Convidados · {event.title}</span>
        </div>
        <div className="dashboard-controls">
          <button type="button" className="btn-secondary" onClick={onBack}>
            Voltar ao painel
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="settings-section" aria-labelledby="guests-title">
          <h2 id="guests-title" className="settings-section-title">
            Convidados
          </h2>
          <p className="settings-section-desc">
            Gerencie a lista de convidados deste evento.
          </p>

          {error && (
            <p className="auth-error" role="alert" style={{ marginBottom: '1rem' }}>
              ⚠ {error}
            </p>
          )}

          <form onSubmit={handleAdd} className="guest-form-row">
            <div className="form-field" style={{ flex: '2 1 160px' }}>
              <label className="form-label" htmlFor="guest-name">
                Nome
              </label>
              <input
                id="guest-name"
                className="form-control"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Maria Silva"
                required
              />
            </div>
            <div className="form-field" style={{ flex: '1 1 160px' }}>
              <label className="form-label" htmlFor="guest-email">
                E-mail
              </label>
              <input
                id="guest-email"
                className="form-control"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div style={{ alignSelf: 'flex-end' }}>
              <button type="submit" className="btn-primary" disabled={adding}>
                {adding ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </form>

          {loading ? (
            <div className="state-panel" style={{ minHeight: '200px' }}>
              <div className="state-spinner" role="status" aria-label="Carregando convidados" />
            </div>
          ) : guests.length === 0 ? (
            <div className="guest-list-empty">
              Nenhum convidado adicionado ainda. Use o formulário acima para começar.
            </div>
          ) : (
            <ul className="guest-list">
              {guests.map((guest) => (
                <li key={guest.id} className="guest-item">
                  <div className="guest-item-info">
                    <span className="guest-item-name">{guest.name}</span>
                    {guest.email && <span className="guest-item-meta">{guest.email}</span>}
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void handleDelete(guest.id)}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Adicionar classes CSS da lista de convidados**

Adicionar antes do bloco final `@media (max-width: 640px)`:

```css
/* ---------- Lista de convidados ---------- */
.guest-list {
  list-style: none;
  margin: 1.5rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.guest-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--theme-border);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--theme-surface) 92%, var(--theme-primary) 4%);
}

.guest-item-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.guest-item-name {
  font-weight: 600;
  font-size: 0.925rem;
  color: var(--theme-text);
}

.guest-item-meta {
  font-size: 0.8rem;
  color: var(--theme-text-muted);
}

.guest-list-empty {
  margin-top: 1.5rem;
  padding: 1.5rem;
  text-align: center;
  color: var(--theme-text-muted);
  border: 1px dashed var(--theme-border);
  border-radius: var(--radius-sm);
  font-size: 0.9rem;
}

.guest-form-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
```

- [ ] **Step 3: Atualizar `EventView.tsx` — view module e activeModule**

- Mudar `type View` para `type View = 'dashboard' | 'settings' | 'create' | 'module'`.
- Adicionar estado `const [activeModule, setActiveModule] = useState<string | null>(null)`.
- Importar `GuestList` (`import { GuestList } from './GuestList'`).
- No `handleSelectEvent`, adicionar `setActiveModule(null)`.
- No `onOpenModule` passado ao `EventDashboard`, trocar o `console.log` por:

```tsx
onOpenModule={(id) => {
  setActiveModule(id)
  setView('module')
}}
```

- Adicionar bloco de render (após o bloco `if (view === 'settings')`):

```tsx
if (view === 'module') {
  if (activeModule === 'guests') {
    return <GuestList event={event} onBack={() => setView('dashboard')} />
  }
  return (
    <div className="dashboard-shell" style={DEFAULT_THEME_STYLE}>
      <div className="state-panel">
        <p className="state-message">
          ⚙ Módulo "{activeModule}" em construção.
        </p>
        <button type="button" className="btn-primary" onClick={() => setView('dashboard')} style={{ marginTop: '1.25rem' }}>
          Voltar ao painel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verificar build e lint**

Run: `npm run lint && npm run build`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/GuestList.tsx src/components/dashboard/dashboard.css src/components/dashboard/EventView.tsx
git commit -m "feat: módulo de convidados funcional (listar, adicionar, remover)"
```

---

### Task 7: Teste manual completo como usuário

**Files:**
- Nenhum arquivo novo. Verificação end-to-end.

- [ ] **Step 1: Subir o dev server**

Run: `npm run dev`
Expected: servidor Vite no `http://localhost:5173`.

- [ ] **Step 2: Testar responsividade (desktop)**

- Abrir `http://localhost:5173` em janela larga (>= 1280px).
- Verificar: site ocupa 100% da largura; dashboard centralizado; sem scroll horizontal; hero, métricas e módulos em grade multi-coluna.

- [ ] **Step 3: Testar responsividade (mobile)**

- Usar DevTools (F12) → modo dispositivo (ex: iPhone 12, 390px).
- Verificar: sem scroll horizontal; topbar com controles ajustados; hero countdown quebra linha; métricas em 1 coluna; módulos em 2 colunas (e 1 coluna em <= 400px); auth-card com padding reduzido.

- [ ] **Step 4: Testar fluxo de criação de evento**

- Logar (ou confirmar usuário no painel do Supabase primeiro, se necessário).
- No estado vazio ou na topbar, clicar "Criar seu primeiro evento" / "+ Novo evento".
- Verificar: tela de criação abre; grade de tipos aparece (💍 Casamento, 👑 15 Anos, etc.); selecionar um tipo; preencher título; clicar "Criar evento".
- Verificar: volta ao dashboard com o novo evento selecionado; métricas refletem os dados.

- [ ] **Step 5: Testar módulo de Convidados**

- No dashboard, clicar no card "Convidados".
- Verificar: tela abre; formulário adiciona convidado; lista atualiza; "Remover" exclui; "Voltar ao painel" retorna.

- [ ] **Step 6: Testar e-mail de confirmação (UX)**

- Tentar login com e-mail não confirmado (se ainda existir).
- Verificar: mensagem específica "Seu e-mail ainda não foi confirmado..." com botão "Reenviar e-mail de confirmação".
- Clicar reenviar → mensagem "E-mail de confirmação reenviado...".

- [ ] **Step 7: Commit final se houver ajustes**

```bash
git add -A
git commit -m "fix: ajustes do teste manual de responsividade e fluxos"
```

---

## Self-Review

**1. Spec coverage:**
- Responsividade (index.css + dashboard.css) → Tasks 1 e 2. ✔
- E-mail de confirmação UX (reenvio + detecção) → Task 3. ✔
- Criação de evento com escolha de tipo → Tasks 4 e 5. ✔
- Módulos funcionais (Convidados piloto) → Tasks 6 e 7. ✔
- Teste como usuário → Task 7. ✔
- Migration aplicada no remoto → já executado (fora do plano de código, registrado no spec). ✔

**2. Placeholder scan:** Nenhum passo usa "TBD", "implementar depois" ou "adicionar tratamento" sem código. Todos os passos de código incluem o conteúdo completo. O único fallback de módulo não implementado tem código real (mensagem + botão voltar). ✔

**3. Type consistency:**
- `resendConfirmationEmail(email: string)` usado em AuthScreen e exportado no barrel. ✔
- `EventCreate({ theme, onCreated })` — `theme: ThemePreset`, `onCreated: (title: string) => void`; EventView passa `theme={event.theme_preset}` e `theme="rose-gold"` no caso sem evento. ✔
- `GuestList({ event, onBack })` — `event: Event`, `onBack: () => void`; EventView passa `event={event}`. ✔
- `EventDashboard` props novas `onCreateEvent: () => void` e `onOpenModule: (id: string) => void`; EventView passa ambas. ✔
