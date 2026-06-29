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

Cada banco é consultado por um **conector** — a cascata não sabe qual:

- **`simulado`** — motor de regras local (default / demo / sem credenciais).
- **`rpa`** — robô **Playwright** que acessa o **portal do banco** como o lojista
  faz hoje: login, preenche o formulário, submete e **raspa a resposta da tela**.

O lojista cadastra os dados uma vez; por baixo dos panos o robô faz a consulta.
Para **demonstrar o RPA ponta a ponta sem depender de portais reais**, o app
serve um **portal-banco mock** em [`/mock-banco`](src/app/mock-banco/page.tsx), e
a receita [`mockBanco.ts`](src/lib/connectors/recipes/mockBanco.ts) automatiza-o.

> Plugar um banco real = escrever uma receita análoga (URL + seletores + login/
> 2FA/captcha do portal) e fornecer as credenciais de convênio da loja.

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
      simulado.ts | rpa.ts | recipes/mockBanco.ts | index.ts
    ai.ts                       # predição/roteamento com Claude + fallback
    finance.ts | auth.ts | prisma.ts
prisma/
  schema.prisma                 # Usuario, Convenio, Proposta, RespostaBanco, AnaliseIA
  seed.ts                       # loja demo + convênios
```

## Próximos passos

- Conectores de bancos reais (uma receita por portal) + cofre de credenciais
  criptografado.
- Fila/worker para o RPA (em vez de rodar no request).
- Atualização em tempo real conforme cada banco/mesa responde (webhooks/polling).
- Migrar SQLite → PostgreSQL (trocar `provider` no `schema.prisma`).
