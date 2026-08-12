# Design — Responsividade Global e E-mail de Confirmação

## Contexto

O site Wedding & Events Planner funciona corretamente na tela de login, mas:

1. **Não é responsivo** — o layout não ocupa a tela toda e quebra em celulares.
2. **E-mail de confirmação** — o usuário quer entender como funciona o fluxo de confirmação de conta.

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

- Se **ativado**: o Supabase envia um e-mail de confirmação ao cadastrar. O usuário precisa clicar no link para ativar a conta. Sem isso, o login falha. O e-mail pode cair em **spam/lixo eletrônico**.
- Se **desativado**: o cadastro já cria a conta ativa e o login funciona imediatamente, sem e-mail.

Como o usuário **conseguiu entrar** após criar a conta, a confirmação está **desativada** no projeto remoto. Se quiser ativar a confirmação por e-mail, é necessário habilitar no painel remoto e (idealmente) configurar um provedor SMTP customizado, pois o e-mail padrão do Supabase tem baixa taxa de entrega e costuma cair em spam.

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

### 2. E-mail de confirmação

Não requer alteração de código. Ação de configuração no painel do Supabase remoto, se o usuário desejar ativar a confirmação. O comportamento atual (sem confirmação) é o esperado dado que o usuário consegue entrar.

## Critérios de Aceite

- [ ] O site ocupa 100% da largura da tela em desktop e mobile.
- [ ] Nenhum scroll horizontal em larguras de 320px a 1920px.
- [ ] A tela de login/cadastro fica centralizada e visível em celular.
- [ ] Dashboard, métricas e módulos se reorganizam corretamente em telas pequenas.
- [ ] O fluxo de login/cadastro/dashboard funciona como antes (sem regressão).
- [ ] O usuário entende o funcionamento do e-mail de confirmação (explicação documentada).

## Fora de Escopo

- Ativar/desativar a confirmação de e-mail no Supabase remoto (ação manual no painel pelo usuário).
- Implementar provedor SMTP customizado.
- Criar tela de "verifique seu e-mail" dedicada.