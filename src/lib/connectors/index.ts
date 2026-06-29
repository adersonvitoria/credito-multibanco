// Resolve qual conector usar para cada banco.
//
// Padrão: TODOS os bancos são consultados via RPA (Playwright no portal web).
// Cada banco tem sua config de portal (src/lib/connectors/portais.ts) executada
// pelo motor genérico. Em modo demo (RPA_PORTAL_MOCK != "false") o alvo é o
// portal mock local; com RPA_PORTAL_MOCK=false, usa a URL real do cadastro.
//
// Para desligar o RPA (dev/testes) e usar o motor de regras local, defina
// MODO_CONSULTA=simulado.

import { conectorSimulado } from "@/lib/connectors/simulado";
import { conectorRPA } from "@/lib/connectors/rpa";
import { criarReceita } from "@/lib/connectors/recipeEngine";
import { getPortalConfig } from "@/lib/connectors/portais";
import type { PerfilBanco } from "@/lib/bancos";
import type { Conector, CredenciaisBanco } from "@/lib/connectors/types";

function modo(): "rpa" | "simulado" {
  return process.env.MODO_CONSULTA === "simulado" ? "simulado" : "rpa";
}

export function getConector(
  banco: PerfilBanco,
  _credenciais?: CredenciaisBanco
): Conector {
  if (modo() === "simulado") return conectorSimulado(banco);
  return conectorRPA(banco, criarReceita(getPortalConfig(banco.nome)));
}

export type { Conector, CredenciaisBanco, DadosConsulta } from "@/lib/connectors/types";
