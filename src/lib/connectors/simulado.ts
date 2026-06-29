// Conector "simulado": usa o motor de regras local (sem acessar portal).
// É o default para demonstração e para bancos sem credencial/receita de RPA.

import { avaliarBanco, type PerfilBanco } from "@/lib/bancos";
import type { Conector, DadosConsulta } from "@/lib/connectors/types";

export function conectorSimulado(banco: PerfilBanco): Conector {
  return {
    banco,
    modo: "simulado",
    async consultar(dados: DadosConsulta) {
      const resultado = avaliarBanco(banco, dados);
      // Simula o tempo de resposta da consulta.
      await new Promise((r) => setTimeout(r, Math.min(resultado.tempoRespostaMs, 1500)));
      return resultado;
    },
  };
}
