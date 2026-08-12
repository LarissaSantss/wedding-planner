# Design — Responsividade Global e E-mail de Confirmação

## Contexto

O site Wedding & Events Planner funciona corretamente na tela de login, mas:

1. **Não é responsivo** — o layout não ocupa a tela toda e quebra em celulares.
2. **E-mail de confirmação** — o usuário quer entender como funciona o fluxo de confirmação de conta.
3. **Ausência de tabelas no Supabase remoto** — o dashboard não tinha onde carregar eventos.

## Status de Execução (registro contínuo)

- Migration `20260101000000_initial_schema.sql` corrigida (usar `gen_random_uuid()` nativo do PG15 em vez da extensão `uuid-ossp`) e **aplicada** no banco remoto `wedding-planner` (`szrimbylarxaepwwafuq`) via `supabase db push --linked`. Tabelas `profiles`, `events`, `guests`, `vendors`, `tasks`, `expenses`, `gift_registry_items` criadas com RLS e policies.
- Histórico de migrations remoto reparado: 10 migrations órfãs (`20260804...`) marcadas como `reverted` para permitir o push.
- Projeto local linkado ao remoto via `supabase link --project-ref szrimbylarxaepwwafuq`.
- **Pendente**: configuração de provedor SMTP customizado no painel do Supabase (ação manual do usuário) para entrega confiável do e-mail de confirmação.

## Causa Raiz

### 1. Responsividade

O arquivo `src/index.css` (herdado do template Vite) define uma largura fixa no `#root`:

```css
#root {
  width: 1126px;        /* ← LARGURA FIXA — trava o site inteiro */
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

Isso força todo o site a ter 1126px de largura, independentemente da tela. Em celulares, o conteúdo é cortado e não ocupa a largura real. Embora `dashboard.css` já tenha media queries em `max-width: 640px`, elas nunca têm efeito porque o `#root` impede o layout fluido.

Também há `font: 18px/145%` no `:root` que, em telas muito pequenas, pode contribuir para overflow.

### 2. E-mail de confirmação

O projeto usa o Supabase **remoto** (`https://szrimbylarxaepwwafuq.supabase.co`), não o local.

O `supabase/config.toml` tem `enable_confirmations = false`, mas isso **apenas controla o CLI local** (`supabase start`). Não afeta o projeto hospedado no Supabase Cloud.

O envio de e-mail de confirmação é controlado no painel do Supabase remoto em:
**Authentication → Sign In / Providers → Email → "Confirm email"**.

**Situação real relatada pelo usuário:**
- Criar conta funciona (aparece "Conta criada!").
- Nenhum e-mail de confirmação chega (nem na caixa de entrada, nem no spam).
- Fazer login falha com "Email ou senha incorretos. Verifique e tente novamente."

**Dedução:** a confirmação por e-mail está **ATIVADA** no Supabase remoto. O Supabase cria a conta em estado `unconfirmed`, bloqueia o login até a confirmação, e o e-mail de confirmação **não está sendo entregue** — comportamento comum do serviço de e-mail transacional padrão do Supabase, que tem baixa taxa de entrega e frequentemente cai em spam ou é bloqueado.

**Impacto UX atual:** ao tentar logar, o usuário vê apenas "Email ou senha incorretos", sem entender que o problema é a não confirmação do e-mail. Não há como reenviar o e-mail de confirmação pela interface.

## Solução Proposta

### 1. Responsividade

**`src/index.css`**
- Remover a largura fixa `1126px` do `#root`.
- Tornar o layout fluido: `width: 100%`, `max-width: none`, manter `min-height: 100svh`.
- Remover `text-align: center` e `border-inline` do `#root` (não devem ser aplicados globalmente ao app de dashboard).
- Ajustar a fonte base: reduzir `font: 18px/145%` para algo mais contido (ex: `16px/145%`) ou manter, mas garantir que não cause overflow no mobile.
- Manter as regras de `:root` e `prefers-color-scheme` que não interferem no app.

**`src/components/dashboard/dashboard.css`**
- Reforçar media queries para telas pequenas:
  - **Topbar**: já esconde `.dashboard-brand-name` em `≤ 640px`. Garantir que os controles (seletor + botão configurações) não estourem.
  - **Hero countdown**: em telas pequenas, compactar os blocos (o `gap` e `padding` já são reduzidos). Considerar permitir `flex-wrap` para evitar overflow com números grandes.
  - **Métricas (`event-metrics`)**: já usa `auto-fit, minmax(240px, 1fr)` — em celular largura < 240px pode causar overflow horizontal. Ajustar para `minmax(160px, 1fr)` ou `1fr` em telas pequenas.
  - **Módulos (`module-grid`)**: já usa `auto-fit, minmax(170px, 1fr)` — idem, ajustar para `minmax(140px, 1fr)` no mobile.
  - **Auth**: `.auth-card` tem `padding: 2.25rem 2rem` e `max-width: 400px`. Em telas pequenas, reduzir padding e garantir que o card caiba na tela.
  - **Formulários**: grid já colapsa para 1 coluna em `≤ 640px`. Garantir que `.form-actions` não cause overflow (botões "Cancelar" + "Salvar" + feedback).

### 2. E-mail de confirmação — experiência do usuário

**Código (frontend):**
- Adicionar função `resendConfirmationEmail(email)` em `src/lib/supabase/auth.ts` usando `supabase.auth.resend({ type: 'signup', email })`.
- Na tela de cadastro (`AuthScreen.tsx`): quando a conta for criada, exibir mensagem clara: "Conta criada! Enviamos um link de confirmação para seu e-mail. Clique no link antes de entrar. Se não encontrar, verifique a caixa de spam." + botão "Reenviar e-mail de confirmação".
- Na tela de login (`AuthScreen.tsx`): detectar o erro de e-mail não confirmado (`error.code === 'email_not_confirmed'` no `signInWithPassword`) e exibir mensagem específica em vez de "Email ou senha incorretos": "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (e o spam) e clique no link de confirmação, ou reenvie o e-mail." + botão "Reenviar e-mail".
- Feedback de sucesso ao reenviar: "E-mail de confirmação reenviado. Verifique sua caixa de entrada (e o spam)."

**Ação manual (painel do Supabase remoto — fora do código):**
- Para destravar imediatamente: no painel **Authentication → Users**, confirmar manualmente o usuário criado.
- Para o fluxo em produção: desativar "Confirm email" em **Authentication → Sign In / Providers → Email** (login imediato, sem e-mail) **OU** configurar um provedor SMTP customizado (ex: Resend, SendGrid, Amazon SES) em **Settings → Auth → SMTP** para entrega confiável dos e-mails.

## Critérios de Aceite

- [ ] O site ocupa 100% da largura da tela em desktop e mobile.
- [ ] Nenhum scroll horizontal em larguras de 320px a 1920px.
- [ ] A tela de login/cadastro fica centralizada e visível em celular.
- [ ] Dashboard, métricas e módulos se reorganizam corretamente em telas pequenas.
- [ ] O fluxo de login/cadastro/dashboard funciona como antes (sem regressão).
- [ ] O usuário entende o funcionamento do e-mail de confirmação (explicação documentada).
- [ ] A tela de login diferencia erro de e-mail não confirmado de credenciais inválidas, com mensagem clara e botão de reenvio.
- [ ] A tela de cadastro informa claramente que é preciso confirmar o e-mail antes de entrar e oferece reenvio.

## Fora de Escopo

- Ativar/desativar a confirmação de e-mail no Supabase remoto (ação manual no painel pelo usuário).
- Implementar provedor SMTP customizado.
- Criar tela de "verifique seu e-mail" dedicada (a confirmação acontece na tela de login/cadastro existente).
- Confirmar manualmente usuários no painel do Supabase (ação manual pelo usuário).
