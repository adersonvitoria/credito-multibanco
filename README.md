# Crédito Multibanco — Mesa de Crédito Digital com IA

Plataforma para **lojas de carros** originarem crédito em **vários bancos** sem
queimar a proposta:

1. **O lojista não informa o score.** A plataforma consulta o birô **uma única
   vez** (a partir do CPF) e **compartilha o score com todos os bancos** — assim
   evita as múltiplas consultas que derrubariam o score do cliente.
2. **Todos os bancos conveniados são consultados** e respondem com sua decisão
   (aprovado / pré-aprovado / negado / em análise na mesa). A pré-qualificação
   por IA é usada só para ordenar a exibição por probabilidade.
3. A **IA (Claude)** recomenda a melhor opção (aprovação + custo do cliente +
   retorno à loja), analisa o perfil e sugere ajustes.

## Como a consulta é feita (conectores)

**Por padrão (`MODO_CONSULTA=rpa`), TODOS os bancos são consultados via robô
Playwright** no portal web: login, preenche o formulário, submete e **raspa a
resposta da tela**. O lojista cadastra os dados uma vez; o robô faz a consulta em
cada portal.

- Cada banco tem uma **config de portal declarativa** em
  [`portais.ts`](src/lib/connectors/portais.ts) (URL + seletores de login,
  campos e resultado). O motor genérico
  [`recipeEngine.ts`](src/lib/connectors/recipeEngine.ts) executa qualquer config.
- Um **único navegador é reutilizado** por requisição (contexto isolado por banco).
- Em modo demo (`RPA_PORTAL_MOCK=true`), todos consultam o **portal-banco mock**
  [`/mock-banco`](src/app/mock-banco/page.tsx) (que varia a condição por banco),
  provando a esteira ponta a ponta. Com `RPA_PORTAL_MOCK=false`, usa a **URL real**
  de cada credencial.
- `MODO_CONSULTA=simulado` desliga o RPA e usa o motor de regras local (dev/testes).

> Plugar um banco real = preencher a config dele em `portais.ts` com os seletores
> do portal (e tratar login/2FA/captcha) + cadastrar URL e credenciais da loja.

### Limitações reais do RPA (e como são tratadas)

- **Portais mudam** → receita por banco, isolada e versionável.
- **Captcha / 2FA / antibot** → falha técnica vira `NÃO CONSULTADO` com aviso
  (não conta como recusa); previsto fallback para modo manual assistido.
- **Credenciais** → por loja+banco, devem ser guardadas criptografadas.
- **Performance** → navegador é pesado; roda sequencial (casa com a cascata).
  Em produção, use fila/worker, não dentro do request.

## Gaps contornados

| Gap | Como é resolvido |
|---|---|
| Score despenca com N consultas | **Uma** consulta ao birô, compartilhada com todos os bancos (o lojista não informa o score) |
| Bancos odeiam leilão de taxa | Ranking otimiza aprovação + **retorno à loja**, não só menor taxa |
| Precisa de convênio | Só bancos com **convênio ativo** entram na cascata |
| APIs heterogêneas | Camada de **conectores** (simulado / RPA / futura API) |
| Formulário gigante mata conversão | **Núcleo canônico enxuto**; campos extras só se a proposta avança |
| Mesa de crédito (resposta humana) | Estado **`EM_ANÁLISE_MESA`** assíncrono com previsão |
| LGPD | **Consentimento obrigatório** (gate + registro) antes de qualquer consulta |
| IA ≠ ordenar por taxa | IA faz **predição + roteamento da cascata**, perfil e ajustes |

## Mapeamento de bancos e credenciais

A tela **Bancos & credenciais** (`/credenciais`) lista todos os bancos/financeiras
e, para cada um, o convênio, o **tipo de integração** (API / arquivo / RPA),
a **URL do portal** e o **usuário/senha** do convênio da loja.

- As senhas são guardadas **criptografadas** (AES-256-GCM, `src/lib/crypto.ts`) e
  **nunca** retornam pela API — a tela só mostra se a senha está definida.
- O catálogo de portais fica em `src/lib/bancos/catalogo.ts`. ⚠️ As URLs de portal
  são **referências e devem ser confirmadas** com o gerente de cada convênio
  (cada loja pode ter um endereço de correspondente próprio).
- O **RPA usa as credenciais cadastradas**: ao consultar um banco em modo RPA, o
  robô loga no portal com o usuário/senha da loja para aquele banco.

| Banco | Integração | Portal (referência — confirmar) |
|---|---|---|
| Santander Financiamentos | API | santanderfinanciamentos.com.br |
| BV Financeira | API | bv.com.br |
| Itaú Veículos | API (mesa) | credline.com.br |
| Bradesco Financiamentos | Arquivo (mesa) | bradescofinanciamentos.com.br |
| Banco Pan | API | lojista.bancopan.com.br |
| Omni Financeira | RPA | portal.omni.com.br |

## Topologia em produção (no ar)

| Componente | URL | Papel |
|---|---|---|
| **App (UI)** | https://credito-multibanco.vercel.app | Vercel — UI/API, cria a proposta e consulta o score (1x). Roda em `MODO_CONSULTA=simulado`; com `WORKER_URL` definido, **delega a consulta dos bancos ao worker**. |
| **Worker RPA** | https://credito-multibanco-worker-production.up.railway.app | Railway (Docker + Chromium) — `MODO_CONSULTA=rpa`. Recebe `POST /api/worker/processar` (autenticado por `WORKER_SECRET`) e roda o Playwright nos portais. |
| **Banco** | Prisma Postgres (Marketplace Vercel) | Compartilhado pelos dois. |

```
Vercel (UI) ── cria proposta + score ──▶ POST /api/worker/processar (x-worker-secret)
                                                   │
                                          Railway worker (Playwright/Chromium, MODO_CONSULTA=rpa)
                                                   │ grava respostas + análise
                                                   ▼
                                          Prisma Postgres ◀── a tela lê o resultado
```

Se o worker estiver indisponível, a Vercel faz **fallback** para processamento inline
(simulado), de modo que a proposta sempre conclui. Login demo: `loja@demo.com` / `demo1234`.

> **Portais reais:** no worker (Railway), troque `RPA_PORTAL_MOCK=false` e preencha os
> seletores de cada banco em `src/lib/connectors/portais.ts` + cadastre URL/usuário/senha
> em **Bancos & credenciais**. (No demo, `RPA_PORTAL_MOCK=true` → consulta o portal mock.)

### Deploy do worker (Railway)

```bash
railway init --name credito-multibanco-worker
railway variables --set "DATABASE_URL=..." --set "CREDENTIALS_KEY=..." \
  --set "JWT_SECRET=..." --set "MODO_CONSULTA=rpa" --set "RPA_PORTAL_MOCK=true" \
  --set "WORKER_SECRET=..." --set "APP_BASE_URL=https://<seu-worker>.up.railway.app"
railway up --service credito-multibanco-worker     # builda o Dockerfile (Node + Chromium)
railway domain                                      # gera o domínio público
```
Depois, na Vercel: defina `WORKER_URL` (= domínio do worker) e `WORKER_SECRET` (o mesmo)
e refaça o deploy. O `Dockerfile` já instala OpenSSL e o Chromium do Playwright.

## Stack

Next.js 14 (App Router) + Prisma + SQLite + Tailwind + `@anthropic-ai/sdk` +
`playwright`. Auth JWT (jose) + bcrypt. Sem `ANTHROPIC_API_KEY`, a IA cai em um
fallback heurístico e o app continua 100% funcional.

## Rodando

```bash
cd credito-multibanco
npm install
npx playwright install chromium      # navegador para o RPA
cp .env.example .env                  # Windows: copy .env.example .env
npm run setup                         # cria o banco + usuário demo + convênios
npm run dev                           # http://localhost:3000
```

Login demo: **loja@demo.com** / **demo1234**

### Ativar o robô (RPA) num banco

No `.env`, liste o banco em `RPA_BANCOS` (a consulta dele passa a ir pelo portal
mock via Playwright):

```env
RPA_BANCOS="Omni Financeira,Banco Pan"
RPA_HEADLESS="false"   # opcional: abre o navegador visível para depurar
```

### Ativar a IA

Preencha `ANTHROPIC_API_KEY` no `.env` (modelo padrão `claude-opus-4-8`).

## Estrutura

```
src/
  app/
    (painel)/dashboard | propostas/nova | propostas/[id]
    api/auth/* | api/propostas (cascata + IA)
    mock-banco                  # portal-banco MOCK automatizado pelo RPA
  lib/
    bancos/index.ts             # perfis, preQualificar() e avaliarBanco()
    bancos/catalogo.ts          # catálogo: site + URL do portal de cada banco
    bureau.ts                   # consulta de score (birô), uma vez, compartilhada
    dispatch.ts                 # consulta TODOS os bancos (via conectores)
    simulacao.ts                # estimativa por banco (simulação rápida)
    crypto.ts                   # criptografia das senhas (AES-256-GCM)
    connectors/                 # camada de conectores
      index.ts | simulado.ts | rpa.ts (Playwright)
      portais.ts                # config de portal por banco (URL + seletores)
      recipeEngine.ts           # executa qualquer config via Playwright
    ai.ts                       # predição/roteamento com Claude + fallback
    finance.ts | auth.ts | prisma.ts
prisma/
  schema.prisma                 # Usuario, Convenio, Proposta, RespostaBanco, AnaliseIA
  seed.ts                       # loja demo + convênios
```

## Deploy na Vercel

O app é Next.js e roda na Vercel, com dois cuidados: **Postgres** (a Vercel não
persiste SQLite) e **modo simulado** em produção (o Playwright/RPA não roda no
serverless — veja abaixo).

1. **Crie um Postgres no Neon** (https://neon.tech ou Marketplace da Vercel) e
   copie a `DATABASE_URL`.
2. **Aplique o schema + seed** uma vez (localmente, apontando para o Neon):
   ```bash
   # no .env, DATABASE_URL = sua string do Neon
   npx prisma db push
   npm run db:seed        # cria loja@demo.com / demo1234 + convênios
   ```
3. **Importe o repositório na Vercel**: vercel.com → *Add New → Project* →
   importe `adersonvitoria/credito-multibanco` (framework Next.js é detectado).
4. **Configure as variáveis de ambiente** no projeto da Vercel:

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | string do Neon |
   | `JWT_SECRET` | string aleatória longa |
   | `CREDENTIALS_KEY` | string aleatória longa |
   | `MODO_CONSULTA` | `simulado` |
   | `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | `1` (evita baixar o Chromium no build) |
   | `ANTHROPIC_API_KEY` | (opcional) ativa a análise por IA |
   | `ANTHROPIC_MODEL` | (opcional) `claude-opus-4-8` |

5. **Deploy**. Pronto — login com `loja@demo.com` / `demo1234`.

> **RPA em produção:** o Playwright precisa de um navegador real e não roda nas
> funções serverless da Vercel. Por isso a Vercel roda em `MODO_CONSULTA=simulado`.
> Para consultar os portais de verdade, rode o RPA num **worker dedicado**
> (Railway/Render/Fly/VM) que a Vercel aciona via fila/HTTP, com
> `MODO_CONSULTA=rpa` e `RPA_PORTAL_MOCK=false`.

## Próximos passos

- Conectores de bancos reais (uma receita por portal) + cofre de credenciais
  criptografado.
- Fila/worker para o RPA (em vez de rodar no request).
- Atualização em tempo real conforme cada banco/mesa responde (webhooks/polling).
- Migrar SQLite → PostgreSQL (trocar `provider` no `schema.prisma`).
