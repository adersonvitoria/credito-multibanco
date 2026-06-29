// Análise inteligente da estratégia de cascata e das respostas dos bancos.
//
// O valor da IA aqui NÃO é ordenar por menor taxa (isso é um filtro). É:
//   - prever a probabilidade de aprovação por banco (Fase 1, sem consultar birô),
//   - recomendar a ESTRATÉGIA de roteamento (quais bancos consultar e em que
//     ordem) para maximizar aprovação preservando o score do cliente,
//   - analisar o perfil e sugerir ajustes,
//   - recomendar a melhor opção considerando aprovação + custo + retorno à loja.
//
// Sem ANTHROPIC_API_KEY (ou se a chamada falhar), usa um fallback heurístico.

import Anthropic from "@anthropic-ai/sdk";
import { formatarMoeda, formatarPercent, calcularIdade } from "@/lib/finance";
import type {
  ResultadoBanco,
  ResultadoAnalise,
  ChanceAprovacao,
  RankingItem,
  StatusResposta,
} from "@/types";

const MODELO = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

export interface ContextoCliente {
  clienteNome: string;
  clienteNascimento: Date;
  clienteRenda: number;
  clienteScore: number;
  clienteProfissao: string;
  veiculoDescricao: string;
  veiculoAno: number;
  veiculoValor: number;
  valorEntrada: number;
  prazoMeses: number;
}

export interface MetaEstrategia {
  totalConveniados: number;
  consultasRealizadas: number;
}

const APROVAVEIS: StatusResposta[] = ["APROVADO", "PRE_APROVADO", "EM_ANALISE_MESA"];

export async function analisarPropostas(
  ctx: ContextoCliente,
  resultados: ResultadoBanco[],
  meta: MetaEstrategia
): Promise<ResultadoAnalise> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return analiseHeuristica(ctx, resultados, meta);

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODELO,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: montarPrompt(ctx, resultados, meta) }],
    } as Anthropic.Messages.MessageCreateParamsNonStreaming);

    const dados = parseJsonResiliente(extrairTexto(response));
    return {
      resumoExecutivo: String(dados.resumoExecutivo ?? "").trim(),
      estrategiaRecomendada: String(dados.estrategiaRecomendada ?? "").trim(),
      melhorBanco: dados.melhorBanco ? String(dados.melhorBanco) : null,
      chanceAprovacao: normalizarChance(dados.chanceAprovacao),
      analisePerfil: String(dados.analisePerfil ?? "").trim(),
      ranking: Array.isArray(dados.ranking) ? dados.ranking : [],
      ajustes: Array.isArray(dados.ajustes) ? dados.ajustes : [],
      geradoPorIA: true,
    };
  } catch (erro) {
    console.error("[ai] análise com IA falhou, usando fallback heurístico:", erro);
    return analiseHeuristica(ctx, resultados, meta);
  }
}

const SYSTEM_PROMPT = `Você é um analista de crédito sênior especializado em financiamento de veículos no Brasil, operando uma "mesa de crédito digital" para lojas de carros.

A plataforma consulta o score do cliente no birô UMA única vez e compartilha esse resultado com TODOS os bancos conveniados (assim evita múltiplas consultas que derrubariam o score). Todos os bancos conveniados são consultados e respondem com sua decisão. O lojista não informa o score — ele é consultado pela plataforma.

Seu papel: recomendar a melhor opção (considerando chance de aprovação, custo total para o cliente e retorno/comissão para a loja), explicar o cenário e sugerir ajustes concretos. Considere que bancos em "mesa" respondem de forma assíncrona (análise humana).

Responda SEMPRE e SOMENTE com JSON válido (sem markdown), neste formato:
{
  "resumoExecutivo": "2-3 frases para a loja",
  "estrategiaRecomendada": "1-2 frases sobre o cenário: birô consultado uma vez e enviado a todos os bancos, e o que isso revelou",
  "melhorBanco": "nome do banco recomendado ou null",
  "chanceAprovacao": "alta | media | baixa",
  "analisePerfil": "perfil do cliente (score, renda, comprometimento) em 2-4 frases",
  "ranking": [ { "banco": "nome", "posicao": 1, "pros": "...", "contras": "..." } ],
  "ajustes": [ { "acao": "ação concreta", "impactoEsperado": "efeito" } ]
}
O ranking lista só bancos aprovados/pré-aprovados/em mesa, do melhor para o pior.`;

function montarPrompt(
  ctx: ContextoCliente,
  resultados: ResultadoBanco[],
  meta: MetaEstrategia
): string {
  const idade = calcularIdade(ctx.clienteNascimento);
  const financiado = Math.max(0, ctx.veiculoValor - ctx.valorEntrada);
  const entradaPct = ctx.veiculoValor > 0 ? (ctx.valorEntrada / ctx.veiculoValor) * 100 : 0;

  const linhas = resultados
    .map((r) => {
      const prob =
        r.probabilidadeAprovacao != null ? `${r.probabilidadeAprovacao}%` : "—";
      if (r.status === "NAO_CONSULTADO")
        return `- ${r.bancoNome}: NÃO CONSULTADO (prob. pré-qual ${prob}) — ${r.observacao}`;
      if (r.status === "NEGADO")
        return `- ${r.bancoNome}: NEGADO (prob. pré-qual ${prob}) — ${r.observacao}`;
      const comp =
        r.valorParcela != null ? (r.valorParcela / ctx.clienteRenda) * 100 : 0;
      return `- ${r.bancoNome} [${r.modoIntegracao}] ordem ${r.ordemCascata} (prob. ${prob}): ${
        r.status
      } — taxa ${formatarPercent(r.taxaJurosMes)} a.m., parcela ${formatarMoeda(
        r.valorParcela
      )} (${comp.toFixed(0)}% da renda) x ${r.prazoMeses}, total ${formatarMoeda(
        r.valorTotal
      )}, retorno à loja ${formatarMoeda(r.retornoLojista)}. ${r.observacao}`;
    })
    .join("\n");

  return `Analise a estratégia de cascata e as respostas.

CLIENTE
- ${ctx.clienteNome}, ${idade} anos, ${ctx.clienteProfissao}
- Renda mensal: ${formatarMoeda(ctx.clienteRenda)} | Score: ${ctx.clienteScore}

OPERAÇÃO
- ${ctx.veiculoDescricao} (${ctx.veiculoAno}) — ${formatarMoeda(ctx.veiculoValor)}
- Entrada ${formatarMoeda(ctx.valorEntrada)} (${entradaPct.toFixed(0)}%) | Financiado ${formatarMoeda(
    financiado
  )} | ${ctx.prazoMeses} meses

CONSULTA
- Birô consultado 1x (score ${ctx.clienteScore} compartilhado) | ${
    meta.totalConveniados
  } bancos conveniados, todos consultados (${meta.consultasRealizadas})

RESULTADOS
${linhas}

Gere a análise no formato JSON especificado.`;
}

function extrairTexto(response: Anthropic.Messages.Message): string {
  return response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

function parseJsonResiliente(texto: string): any {
  const limpo = texto.replace(/^```(?:json)?/gm, "").replace(/```$/gm, "").trim();
  try {
    return JSON.parse(limpo);
  } catch {
    const i = limpo.indexOf("{");
    const f = limpo.lastIndexOf("}");
    if (i >= 0 && f > i) return JSON.parse(limpo.slice(i, f + 1));
    throw new Error("Resposta da IA sem JSON válido");
  }
}

function normalizarChance(valor: unknown): ChanceAprovacao {
  const v = String(valor ?? "").toLowerCase();
  if (v.startsWith("alt")) return "alta";
  if (v.startsWith("baix")) return "baixa";
  return "media";
}

// ---------- Fallback heurístico (sem IA) ----------

const PRIORIDADE: Record<string, number> = {
  APROVADO: 0,
  PRE_APROVADO: 1,
  EM_ANALISE_MESA: 2,
};

export function analiseHeuristica(
  ctx: ContextoCliente,
  resultados: ResultadoBanco[],
  meta: MetaEstrategia
): ResultadoAnalise {
  const aprovaveis = resultados.filter((r) => APROVAVEIS.includes(r.status));
  const ordenados = [...aprovaveis].sort((a, b) => {
    const pa = PRIORIDADE[a.status] ?? 9;
    const pb = PRIORIDADE[b.status] ?? 9;
    if (pa !== pb) return pa - pb;
    return (a.valorTotal ?? Infinity) - (b.valorTotal ?? Infinity);
  });

  const melhor = ordenados[0] ?? null;
  const emMesa = resultados.filter((r) => r.status === "EM_ANALISE_MESA").length;
  const aprovadosJa = resultados.filter((r) => r.status === "APROVADO").length;
  const entradaPct = ctx.veiculoValor > 0 ? (ctx.valorEntrada / ctx.veiculoValor) * 100 : 0;

  const ranking: RankingItem[] = ordenados.map((r, i) => ({
    banco: r.bancoNome,
    posicao: i + 1,
    pros:
      r.status === "APROVADO"
        ? i === 0
          ? "Aprovado já, menor custo total."
          : "Aprovado na hora."
        : r.status === "EM_ANALISE_MESA"
        ? "Boa condição estimada (aguardando mesa)."
        : `Taxa de ${formatarPercent(r.taxaJurosMes)} a.m.`,
    contras:
      r.status === "EM_ANALISE_MESA"
        ? `Resposta humana — previsão ~${r.previsaoRespostaMin} min.`
        : r.status === "PRE_APROVADO"
        ? "Depende de documentação."
        : `Custo total ${formatarMoeda(r.valorTotal)}.`,
  }));

  let chance: ChanceAprovacao = "baixa";
  if (aprovadosJa >= 1) chance = "alta";
  else if (aprovaveis.length >= 1) chance = "media";

  const estrategia =
    `Consultamos o birô uma vez (score ${ctx.clienteScore}) e enviamos a proposta aos ${meta.totalConveniados} bancos conveniados. ` +
    (aprovadosJa >= 1
      ? `${aprovadosJa} aprovação(ões) imediata(s)${emMesa ? ` e ${emMesa} em análise na mesa` : ""}.`
      : emMesa >= 1
      ? `Nenhuma aprovação imediata; ${emMesa} proposta(s) em análise na mesa.`
      : `Nenhum banco aprovou nas condições atuais — veja os ajustes.`);

  const comprometimentoMelhor =
    melhor?.valorParcela != null ? melhor.valorParcela / ctx.clienteRenda : 0;

  const ajustes: { acao: string; impactoEsperado: string }[] = [];
  if (aprovaveis.length === 0) {
    if (entradaPct < 40)
      ajustes.push({
        acao: "Aumentar a entrada para reduzir o valor financiado.",
        impactoEsperado: "Diminui a parcela e o comprometimento, principal motivo das recusas.",
      });
    if (ctx.prazoMeses < 60)
      ajustes.push({
        acao: `Alongar o prazo para 60 meses (atual: ${ctx.prazoMeses}).`,
        impactoEsperado: "Reduz a parcela e ajuda a passar no limite de comprometimento.",
      });
    if (ctx.clienteScore < 650)
      ajustes.push({
        acao: "Incluir avalista com bom score antes de reenviar.",
        impactoEsperado: "Libera bancos conservadores que recusam por score, sem novas consultas inúteis.",
      });
    if (ajustes.length === 0)
      ajustes.push({
        acao: "Considerar um veículo mais barato ou reduzir o valor financiado.",
        impactoEsperado: "Aproxima a parcela da capacidade de pagamento.",
      });
  } else {
    if (entradaPct < 25)
      ajustes.push({
        acao: "Aumentar a entrada para pelo menos 25%.",
        impactoEsperado: "Reduz a taxa e melhora a condição na recomendação.",
      });
    if (comprometimentoMelhor > 0.3)
      ajustes.push({
        acao: "Alongar o prazo ou reduzir o financiado para baixar a parcela.",
        impactoEsperado: "Diminui o comprometimento na melhor proposta.",
      });
    if (ajustes.length === 0)
      ajustes.push({
        acao: "Perfil sólido — seguir com o banco recomendado.",
        impactoEsperado: "Boa chance de fechamento nas condições atuais.",
      });
  }

  const resumo = melhor
    ? melhor.status === "EM_ANALISE_MESA"
      ? `Melhor caminho: ${melhor.bancoNome} (em mesa, previsão ~${melhor.previsaoRespostaMin} min), parcela estimada ${formatarMoeda(
          melhor.valorParcela
        )} em ${melhor.prazoMeses}x.`
      : `Melhor opção: ${melhor.bancoNome}, parcela de ${formatarMoeda(
          melhor.valorParcela
        )} em ${melhor.prazoMeses}x (total ${formatarMoeda(melhor.valorTotal)}).`
    : `Nenhum dos ${meta.totalConveniados} bancos aprovou nas condições atuais — ajuste e reenvie.`;

  const analisePerfil = `Score ${ctx.clienteScore} e renda ${formatarMoeda(
    ctx.clienteRenda
  )}. Entrada de ${entradaPct.toFixed(0)}%. ${
    melhor
      ? `A melhor parcela compromete ${(comprometimentoMelhor * 100).toFixed(0)}% da renda.`
      : "Perfil precisa de reforço (entrada, score ou avalista)."
  }`;

  return {
    resumoExecutivo: resumo,
    estrategiaRecomendada: estrategia,
    melhorBanco: melhor?.bancoNome ?? null,
    chanceAprovacao: chance,
    analisePerfil,
    ranking,
    ajustes,
    geradoPorIA: false,
  };
}
