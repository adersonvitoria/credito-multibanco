// Configuração declarativa do portal de cada banco/financeira.
//
// Cada banco tem um PortalConfig: a URL e os seletores/passos para o robô
// (Playwright) logar, preencher a proposta e raspar o resultado. O motor
// genérico (recipeEngine.ts) executa qualquer config — então adicionar/ajustar
// um banco real é editar uma config, não escrever código.
//
// ⚠️ Os seletores abaixo são os do PORTAL MOCK (/mock-banco), usados para rodar
// a esteira de ponta a ponta hoje. Para um banco REAL, substitua os seletores e
// a forma de extração pelos do portal daquele banco (e trate login/2FA/captcha).
// A URL real vem do cadastro de credenciais / catálogo; em modo demo
// (RPA_PORTAL_MOCK != "false") o alvo é sempre o portal mock.

import type { DadosConsulta } from "@/lib/connectors/types";
import type { StatusResposta } from "@/types";

export interface CampoPortal {
  selector: string;
  valor: (d: DadosConsulta) => string;
}

export interface PortalConfig {
  bancoNome: string;
  // Login
  loginUsuario: string;
  loginSenha: string;
  loginSubmit: string;
  aposLogin: string; // seletor que aparece depois do login (form da proposta)
  // Proposta
  campos: CampoPortal[];
  propostaSubmit: string;
  resultado: string; // seletor que aparece com o resultado
  // Extração (se *Attr definido, lê o atributo; senão, o texto do elemento)
  statusSelector: string;
  statusAttr?: string;
  taxaSelector: string;
  taxaAttr?: string;
  parcelaSelector: string;
  parcelaAttr?: string;
  totalSelector: string;
  totalAttr?: string;
  obsSelector?: string;
  mapearStatus?: (bruto: string) => StatusResposta;
}

// Config padrão = seletores do portal mock. Serve de base para todos os bancos
// enquanto os portais reais não são mapeados.
function configMock(bancoNome: string): PortalConfig {
  return {
    bancoNome,
    loginUsuario: "#usuario",
    loginSenha: "#senha",
    loginSubmit: "#entrar",
    aposLogin: "#form-proposta",
    campos: [
      { selector: "#cpf", valor: (d) => d.clienteCpf },
      { selector: "#renda", valor: (d) => String(d.clienteRenda) },
      { selector: "#score", valor: (d) => String(d.clienteScore) },
      { selector: "#valorVeiculo", valor: (d) => String(d.veiculoValor) },
      { selector: "#entrada", valor: (d) => String(d.valorEntrada) },
      { selector: "#prazo", valor: (d) => String(d.prazoMeses) },
    ],
    propostaSubmit: "#consultar",
    resultado: "#resultado",
    statusSelector: "#resultado",
    statusAttr: "data-status",
    taxaSelector: "#res-taxa",
    taxaAttr: "data-valor",
    parcelaSelector: "#res-parcela",
    parcelaAttr: "data-valor",
    totalSelector: "#res-total",
    totalAttr: "data-valor",
    obsSelector: "#res-obs",
  };
}

// Registro de portais por banco. Hoje todos usam a config mock; troque a entrada
// de um banco por uma config com os seletores reais quando integrar o portal.
//
// Exemplo de override real (ilustrativo):
//   "Banco Pan": { ...configMock("Banco Pan"),
//     loginUsuario: "#cpfCnpj", loginSenha: "input[name=senha]",
//     loginSubmit: "button[type=submit]", aposLogin: ".dashboard-lojista",
//     campos: [ { selector: "#cpfCliente", valor: d => d.clienteCpf }, ... ],
//     propostaSubmit: "#btnSimular", resultado: ".resultado-proposta",
//     statusSelector: ".badge-status", taxaSelector: ".taxa", ... }
const OVERRIDES: Record<string, PortalConfig> = {
  // (vazio por enquanto — preencher com os portais reais)
};

export function getPortalConfig(bancoNome: string): PortalConfig {
  return OVERRIDES[bancoNome] ?? configMock(bancoNome);
}
