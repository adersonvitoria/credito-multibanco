// Resolve qual conector usar para cada banco.
//
// Demo: por padrão, todos os bancos usam o conector "simulado". Para acionar o
// robô (Playwright) em um banco, liste o nome dele em RPA_BANCOS (.env) —
// nesse caso a consulta vai pelo portal-banco MOCK (/mock-banco), provando o
// fluxo de RPA. Em produção, cada banco RPA teria sua própria receita.

import { conectorSimulado } from "@/lib/connectors/simulado";
import { conectorRPA } from "@/lib/connectors/rpa";
import { receitaMockBanco } from "@/lib/connectors/recipes/mockBanco";
import type { PerfilBanco } from "@/lib/bancos";
import type { Conector, CredenciaisBanco } from "@/lib/connectors/types";

function bancosRPA(): Set<string> {
  return new Set(
    (process.env.RPA_BANCOS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function getConector(
  banco: PerfilBanco,
  credenciais?: CredenciaisBanco
): Conector {
  if (bancosRPA().has(banco.nome)) {
    // No demo, a receita RPA é o portal mock; troque por receitaBancoX(banco) real.
    return conectorRPA(banco, receitaMockBanco(banco));
  }
  return conectorSimulado(banco);
}

export type { Conector, CredenciaisBanco, DadosConsulta } from "@/lib/connectors/types";
