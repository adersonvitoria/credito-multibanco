// Motores de decisão simulados dos bancos/financeiras.
//
// Duas operações por banco:
//   - preQualificar(): Fase 1 — estima a PROBABILIDADE de aprovação a partir
//     dos dados informados, SEM consultar o birô (não derruba o score).
//   - avaliarBanco(): Fase 2 — decisão efetiva após a consulta (hard pull).
//     Bancos em modo "MESA" não decidem na hora: caem em análise humana
//     (EM_ANALISE_MESA) com previsão de resposta.
//
// Para plugar um banco REAL, basta implementar a mesma assinatura chamando a
// API/arquivo/RPA do banco e registrá-lo em BANCOS.

import { calcularParcela, cetAnual, calcularIdade } from "@/lib/finance";
import type {
  ResultadoBanco,
  PreQualificacao,
  StatusResposta,
  ModoIntegracao,
  TipoIntegracao,
} from "@/types";

export interface PerfilBanco {
  nome: string;
  apetiteRisco: "conservador" | "moderado" | "agressivo";
  modo: ModoIntegracao; // INSTANTANEO decide na hora; MESA vai p/ análise humana
  tipoIntegracao: TipoIntegracao; // como o banco se integra (API/arquivo/RPA/manual)
  retornoLojistaPct: number; // % do financiado que o banco paga de retorno à loja
  scoreMinimo: number;
  rendaMinima: number;
  taxaBaseMes: number;
  prazoMaximo: number;
  entradaMinimaPct: number;
  maxComprometimento: number;
  idadeMaxVeiculo: number;
  latenciaBaseMs: number;
}

// Mix representativo do mercado brasileiro de financiamento de veículos.
export const BANCOS: PerfilBanco[] = [
  {
    nome: "Santander Financiamentos",
    apetiteRisco: "moderado",
    modo: "INSTANTANEO",
    tipoIntegracao: "API",
    retornoLojistaPct: 0.02,
    scoreMinimo: 580,
    rendaMinima: 1800,
    taxaBaseMes: 0.0179,
    prazoMaximo: 60,
    entradaMinimaPct: 0.2,
    maxComprometimento: 0.3,
    idadeMaxVeiculo: 12,
    latenciaBaseMs: 600,
  },
  {
    nome: "BV Financeira",
    apetiteRisco: "moderado",
    modo: "INSTANTANEO",
    tipoIntegracao: "API",
    retornoLojistaPct: 0.025,
    scoreMinimo: 550,
    rendaMinima: 1500,
    taxaBaseMes: 0.0189,
    prazoMaximo: 60,
    entradaMinimaPct: 0.15,
    maxComprometimento: 0.32,
    idadeMaxVeiculo: 15,
    latenciaBaseMs: 500,
  },
  {
    nome: "Itaú Veículos",
    apetiteRisco: "conservador",
    modo: "MESA",
    tipoIntegracao: "API",
    retornoLojistaPct: 0.015,
    scoreMinimo: 650,
    rendaMinima: 2500,
    taxaBaseMes: 0.0159,
    prazoMaximo: 48,
    entradaMinimaPct: 0.25,
    maxComprometimento: 0.28,
    idadeMaxVeiculo: 10,
    latenciaBaseMs: 800,
  },
  {
    nome: "Bradesco Financiamentos",
    apetiteRisco: "conservador",
    modo: "MESA",
    tipoIntegracao: "ARQUIVO",
    retornoLojistaPct: 0.018,
    scoreMinimo: 630,
    rendaMinima: 2200,
    taxaBaseMes: 0.0165,
    prazoMaximo: 48,
    entradaMinimaPct: 0.25,
    maxComprometimento: 0.3,
    idadeMaxVeiculo: 10,
    latenciaBaseMs: 700,
  },
  {
    nome: "Banco Pan",
    apetiteRisco: "agressivo",
    modo: "INSTANTANEO",
    tipoIntegracao: "API",
    retornoLojistaPct: 0.03,
    scoreMinimo: 480,
    rendaMinima: 1300,
    taxaBaseMes: 0.0219,
    prazoMaximo: 60,
    entradaMinimaPct: 0.1,
    maxComprometimento: 0.35,
    idadeMaxVeiculo: 18,
    latenciaBaseMs: 450,
  },
  {
    nome: "Omni Financeira",
    apetiteRisco: "agressivo",
    modo: "INSTANTANEO",
    tipoIntegracao: "RPA",
    retornoLojistaPct: 0.035,
    scoreMinimo: 420,
    rendaMinima: 1200,
    taxaBaseMes: 0.0249,
    prazoMaximo: 60,
    entradaMinimaPct: 0.1,
    maxComprometimento: 0.38,
    idadeMaxVeiculo: 20,
    latenciaBaseMs: 400,
  },
];

export function getBanco(nome: string): PerfilBanco | undefined {
  return BANCOS.find((b) => b.nome === nome);
}

export interface PropostaParaAvaliacao {
  clienteNascimento: Date;
  clienteRenda: number;
  clienteScore: number;
  veiculoAno: number;
  veiculoValor: number;
  valorEntrada: number;
  prazoMeses: number;
}

// ---------------------------------------------------------------------------
// Fase 1 — Pré-qualificação (SEM consulta ao birô)
// ---------------------------------------------------------------------------
// Estima a probabilidade de aprovação só com os dados informados. É isso que
// permite NÃO disparar hard pull para todos: a IA usa essa probabilidade para
// montar a cascata e consultar apenas os bancos mais promissores.
export function preQualificar(
  banco: PerfilBanco,
  p: PropostaParaAvaliacao
): PreQualificacao {
  const financiado = Math.max(0, p.veiculoValor - p.valorEntrada);
  const entradaPct = p.veiculoValor > 0 ? p.valorEntrada / p.veiculoValor : 0;
  const idadeVeic = new Date().getFullYear() - p.veiculoAno;
  const parcelaEst = calcularParcela(financiado, banco.taxaBaseMes, p.prazoMeses);
  const comprometimento = p.clienteRenda > 0 ? parcelaEst / p.clienteRenda : 1;

  let prob = 95;
  const fatores: { motivo: string; peso: number }[] = [];

  // Score
  if (p.clienteScore < banco.scoreMinimo) {
    const hit = clamp((banco.scoreMinimo - p.clienteScore) * 0.5, 0, 60);
    prob -= hit;
    fatores.push({ motivo: "score abaixo do mínimo do banco", peso: hit });
  } else {
    prob += clamp((p.clienteScore - banco.scoreMinimo) * 0.04, 0, 4);
  }

  // Renda
  if (p.clienteRenda < banco.rendaMinima) {
    prob -= 50;
    fatores.push({ motivo: "renda abaixo da exigida", peso: 50 });
  }

  // Entrada
  if (entradaPct < banco.entradaMinimaPct) {
    const hit = clamp((banco.entradaMinimaPct - entradaPct) * 200, 0, 40);
    prob -= hit;
    fatores.push({ motivo: "entrada abaixo do mínimo", peso: hit });
  }

  // Prazo / idade do veículo
  if (p.prazoMeses > banco.prazoMaximo) {
    prob -= 25;
    fatores.push({ motivo: "prazo acima do máximo", peso: 25 });
  }
  if (idadeVeic > banco.idadeMaxVeiculo) {
    prob -= 30;
    fatores.push({ motivo: "veículo acima da idade aceita", peso: 30 });
  }

  // Comprometimento de renda
  if (comprometimento > banco.maxComprometimento) {
    const hit = clamp((comprometimento - banco.maxComprometimento) * 220, 0, 45);
    prob -= hit;
    fatores.push({ motivo: "parcela compromete muito da renda", peso: hit });
  } else if (comprometimento > banco.maxComprometimento * 0.75) {
    prob -= 10;
  }

  // Apetite de risco
  if (banco.apetiteRisco === "agressivo") prob += 5;
  if (banco.apetiteRisco === "conservador") prob -= 4;

  prob = Math.round(clamp(prob, 2, 98));

  const motivoPrincipal =
    fatores.sort((a, b) => b.peso - a.peso)[0]?.motivo ??
    "perfil compatível com a política do banco";

  return {
    bancoNome: banco.nome,
    probabilidade: prob,
    motivoPrincipal,
    retornoLojista: round(financiado * banco.retornoLojistaPct, 2),
    modo: banco.modo,
    tipoIntegracao: banco.tipoIntegracao,
  };
}

// ---------------------------------------------------------------------------
// Fase 2 — Avaliação efetiva (após consulta / hard pull)
// ---------------------------------------------------------------------------
export function avaliarBanco(
  banco: PerfilBanco,
  proposta: PropostaParaAvaliacao
): ResultadoBanco {
  const motivos: string[] = [];
  const valorFinanciado = Math.max(0, proposta.veiculoValor - proposta.valorEntrada);
  const entradaPct =
    proposta.veiculoValor > 0 ? proposta.valorEntrada / proposta.veiculoValor : 0;
  const idadeVeiculo = new Date().getFullYear() - proposta.veiculoAno;
  const idadeCliente = calcularIdade(proposta.clienteNascimento);

  // ----- Regras de recusa automática (valem mesmo p/ bancos de mesa) -----
  if (proposta.clienteScore < banco.scoreMinimo)
    motivos.push(`score ${proposta.clienteScore} abaixo do mínimo (${banco.scoreMinimo})`);
  if (proposta.clienteRenda < banco.rendaMinima)
    motivos.push(`renda abaixo do mínimo exigido`);
  if (entradaPct < banco.entradaMinimaPct)
    motivos.push(
      `entrada de ${(entradaPct * 100).toFixed(0)}% abaixo do mínimo (${(
        banco.entradaMinimaPct * 100
      ).toFixed(0)}%)`
    );
  if (proposta.prazoMeses > banco.prazoMaximo)
    motivos.push(`prazo acima do máximo (${banco.prazoMaximo}x)`);
  if (idadeVeiculo > banco.idadeMaxVeiculo)
    motivos.push(`veículo com ${idadeVeiculo} anos acima do limite`);
  if (idadeCliente < 18) motivos.push(`cliente menor de idade`);

  if (motivos.length > 0) {
    return base(banco, {
      status: "NEGADO",
      observacao: `Recusado: ${motivos.join("; ")}.`,
      tempoRespostaMs: latencia(banco, proposta),
    });
  }

  // ----- Precificação -----
  let taxa = banco.taxaBaseMes;
  const folgaScore = proposta.clienteScore - banco.scoreMinimo;
  taxa -= Math.min(0.004, (folgaScore / 1000) * 0.02);
  taxa -= Math.min(0.003, (entradaPct - banco.entradaMinimaPct) * 0.02);
  taxa += Math.min(0.003, (proposta.prazoMeses / 60) * 0.004);
  taxa += jitter(valorFinanciado + banco.scoreMinimo, 0.0005);
  taxa = Math.max(0.009, taxa);

  const parcela = calcularParcela(valorFinanciado, taxa, proposta.prazoMeses);
  const comprometimento = parcela / proposta.clienteRenda;

  if (comprometimento > banco.maxComprometimento) {
    return base(banco, {
      status: "NEGADO",
      observacao: `Recusado: parcela compromete ${(comprometimento * 100).toFixed(
        0
      )}% da renda (limite ${(banco.maxComprometimento * 100).toFixed(0)}%).`,
      tempoRespostaMs: latencia(banco, proposta),
    });
  }

  const valores = {
    taxaJurosMes: round(taxa * 100, 4),
    valorFinanciado: round(valorFinanciado, 2),
    valorParcela: round(parcela, 2),
    prazoMeses: proposta.prazoMeses,
    valorTotal: round(parcela * proposta.prazoMeses, 2),
    cet: round(cetAnual(taxa), 2),
    retornoLojista: round(valorFinanciado * banco.retornoLojistaPct, 2),
  };

  // Bancos de MESA não decidem na hora: caem em análise humana.
  if (banco.modo === "MESA") {
    const previsao = 30 + Math.round(Math.abs(jitter(valorFinanciado, 90))); // 30–120 min
    return base(banco, {
      status: "EM_ANALISE_MESA",
      previsaoRespostaMin: previsao,
      observacao: `Em análise na mesa de crédito (resposta humana). Condições estimadas — previsão ~${previsao} min.`,
      tempoRespostaMs: latencia(banco, proposta),
      ...valores,
    });
  }

  // Bancos instantâneos: aprovam/pré-aprovam na hora.
  const scoreNoLimite = folgaScore < 40;
  const comprometimentoApertado = comprometimento > banco.maxComprometimento * 0.9;
  const status: StatusResposta =
    scoreNoLimite || comprometimentoApertado ? "PRE_APROVADO" : "APROVADO";

  const observacao =
    status === "PRE_APROVADO"
      ? scoreNoLimite
        ? "Pré-aprovado — sujeito a análise documental (score próximo do limite)."
        : "Pré-aprovado — comprometimento de renda elevado, confirmar renda."
      : "Aprovado com as condições simuladas.";

  return base(banco, {
    status,
    observacao,
    tempoRespostaMs: latencia(banco, proposta),
    ...valores,
  });
}

// Monta um ResultadoBanco com defaults; ordemCascata e probabilidade são
// preenchidos pelo orquestrador da cascata.
function base(banco: PerfilBanco, over: Partial<ResultadoBanco>): ResultadoBanco {
  return {
    bancoNome: banco.nome,
    status: "NEGADO",
    probabilidadeAprovacao: null,
    consultaHardRealizada: true,
    ordemCascata: null,
    taxaJurosMes: null,
    valorFinanciado: null,
    valorParcela: null,
    prazoMeses: null,
    valorTotal: null,
    cet: null,
    retornoLojista: null,
    previsaoRespostaMin: null,
    modoIntegracao: banco.modo,
    observacao: "",
    tempoRespostaMs: 0,
    ...over,
  };
}

function latencia(banco: PerfilBanco, proposta: PropostaParaAvaliacao): number {
  return Math.round(
    banco.latenciaBaseMs + Math.abs(jitter(proposta.veiculoValor, 250))
  );
}

function jitter(seed: number, amplitude: number): number {
  const x = Math.sin(seed) * 10000;
  const frac = x - Math.floor(x);
  return (frac - 0.5) * 2 * amplitude;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round(v: number, casas: number): number {
  const f = Math.pow(10, casas);
  return Math.round(v * f) / f;
}
