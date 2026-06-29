// Orquestrador da consulta multibanco.
//
// Modelo: a plataforma consulta o birô UMA vez (score compartilhado) e envia a
// proposta a TODOS os bancos conveniados. Cada banco é consultado via CONECTOR
// (simulado ou RPA/Playwright). A pré-qualificação é usada apenas para ORDENAR
// a exibição (probabilidade), não para limitar quem é consultado.

import { preQualificar, type PerfilBanco } from "@/lib/bancos";
import { getConector } from "@/lib/connectors";
import type { DadosConsulta, CredenciaisBanco } from "@/lib/connectors/types";
import type { ResultadoBanco, PreQualificacao } from "@/types";

export interface ResultadoConsulta {
  resultados: ResultadoBanco[];
  preQualificacao: PreQualificacao[];
  consultasRealizadas: number;
}

export async function consultarBancos(
  dados: DadosConsulta,
  conveniados: PerfilBanco[],
  credenciais: Record<string, CredenciaisBanco> = {}
): Promise<ResultadoConsulta> {
  // Pré-qualificação (só para ordenar a exibição por probabilidade).
  const preQual = conveniados.map((b) => ({ banco: b, pq: preQualificar(b, dados) }));
  preQual.sort((a, b) => {
    if (b.pq.probabilidade !== a.pq.probabilidade)
      return b.pq.probabilidade - a.pq.probabilidade;
    return b.pq.retornoLojista - a.pq.retornoLojista;
  });

  // Consulta TODOS os bancos conveniados (sem parar na aprovação).
  const resultados: ResultadoBanco[] = [];
  let ordem = 0;
  for (const { banco, pq } of preQual) {
    ordem++;
    const conector = getConector(banco, credenciais[banco.nome]);
    const r = await conector.consultar(dados, credenciais[banco.nome]);
    r.probabilidadeAprovacao = pq.probabilidade;
    r.ordemCascata = ordem;
    resultados.push(r);
  }

  return {
    resultados,
    preQualificacao: preQual.map((x) => x.pq),
    consultasRealizadas: resultados.length,
  };
}
