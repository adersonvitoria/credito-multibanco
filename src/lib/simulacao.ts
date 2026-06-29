// Motor de SIMULAÇÃO rápida (estimativa) — consulta TODOS os bancos.
//
// Diferente da proposta, a simulação não tem renda/entrada/prazo informados e
// não é uma decisão de crédito. Mas o score é consultado no birô (uma vez) e a
// simulação mostra, para CADA banco conveniado, a taxa e a parcela estimadas
// num cenário de referência (entrada padrão + prazo de referência).

import { BANCOS, type PerfilBanco } from "@/lib/bancos";
import { calcularParcela, cetAnual } from "@/lib/finance";

export interface EstimativaBanco {
  banco: string;
  taxaMes: number; // %
  parcela: number;
  total: number;
  cet: number; // % a.a.
  retornoLojista: number;
  atendeScore: boolean; // o score consultado atende o mínimo deste banco?
}

export interface ResultadoSimulacao {
  score: number; // score consultado no birô
  entradaPct: number;
  valorEntrada: number;
  valorFinanciado: number;
  prazoRef: number; // prazo de referência (ex.: 48)
  bancos: EstimativaBanco[];
}

export interface OpcoesSimulacao {
  entradaPct?: number;
  prazoMeses?: number;
  bancos?: PerfilBanco[];
}

export function simular(
  valorVeiculo: number,
  score: number,
  opts: OpcoesSimulacao = {}
): ResultadoSimulacao {
  const entradaPct = opts.entradaPct ?? 0.2;
  const prazo = opts.prazoMeses ?? 48;
  const bancos = opts.bancos ?? BANCOS;

  const valorEntrada = round(valorVeiculo * entradaPct, 2);
  const financiado = Math.max(0, valorVeiculo - valorEntrada);

  const estimativas: EstimativaBanco[] = bancos.map((b) => {
    let taxa = b.taxaBaseMes;
    const folga = score - b.scoreMinimo;
    taxa -= Math.min(0.004, Math.max(0, (folga / 1000) * 0.02));
    if (entradaPct > b.entradaMinimaPct)
      taxa -= Math.min(0.003, (entradaPct - b.entradaMinimaPct) * 0.02);
    taxa += Math.min(0.003, (prazo / 60) * 0.004);
    taxa = Math.max(0.009, taxa);

    const parcela = calcularParcela(financiado, taxa, prazo);
    return {
      banco: b.nome,
      taxaMes: round(taxa * 100, 2),
      parcela: round(parcela, 2),
      total: round(parcela * prazo, 2),
      cet: round(cetAnual(taxa), 2),
      retornoLojista: round(financiado * b.retornoLojistaPct, 2),
      atendeScore: score >= b.scoreMinimo,
    };
  });

  // Quem atende o score primeiro; depois menor parcela.
  estimativas.sort((a, b) => {
    if (a.atendeScore !== b.atendeScore) return a.atendeScore ? -1 : 1;
    return a.parcela - b.parcela;
  });

  return {
    score,
    entradaPct,
    valorEntrada,
    valorFinanciado: financiado,
    prazoRef: prazo,
    bancos: estimativas,
  };
}

function round(v: number, casas: number): number {
  const f = Math.pow(10, casas);
  return Math.round(v * f) / f;
}
