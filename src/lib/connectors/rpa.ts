// Runner de RPA com Playwright.
//
// Um "conector RPA" abre um navegador headless, executa a RECEITA do banco
// (passos de automação no portal: login, preencher, submeter, raspar) e devolve
// a resposta estruturada. O Playwright é importado de forma DINÂMICA, então este
// módulo compila mesmo sem o pacote instalado — só é exigido em tempo de execução
// quando um banco em modo RPA é realmente consultado.

import { cetAnual } from "@/lib/finance";
import type { PerfilBanco } from "@/lib/bancos";
import type { ResultadoBanco, StatusResposta } from "@/types";
import type { Conector, DadosConsulta, CredenciaisBanco } from "@/lib/connectors/types";

// Dados brutos raspados da tela do portal.
export interface RespostaPortal {
  status: StatusResposta;
  taxaJurosMes?: number | null;
  valorParcela?: number | null;
  prazoMeses?: number | null;
  valorTotal?: number | null;
  observacao?: string;
}

export interface ContextoRPA {
  page: any; // playwright.Page (tipado como any p/ import dinâmico)
  dados: DadosConsulta;
  credenciais?: CredenciaisBanco;
  baseUrl: string;
}

// Receita = como automatizar UM portal específico.
export interface ReceitaRPA {
  bancoNome: string;
  automacao: (ctx: ContextoRPA) => Promise<RespostaPortal>;
}

export function conectorRPA(banco: PerfilBanco, receita: ReceitaRPA): Conector {
  return {
    banco,
    modo: "rpa",
    async consultar(dados, credenciais) {
      const inicio = Date.now();
      let browser: any;
      try {
        const pw: any = await import("playwright"); // lazy
        browser = await pw.chromium.launch({
          headless: process.env.RPA_HEADLESS !== "false",
        });
        const page = await browser.newPage();
        const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

        const portal = await receita.automacao({ page, dados, credenciais, baseUrl });

        const financiado = Math.max(0, dados.veiculoValor - dados.valorEntrada);
        return montar(banco, portal, financiado, Date.now() - inicio);
      } catch (erro: any) {
        // Falha técnica do robô (portal mudou, captcha, timeout) — não é negativa.
        return {
          bancoNome: banco.nome,
          status: "NAO_CONSULTADO",
          probabilidadeAprovacao: null,
          consultaHardRealizada: false,
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
          observacao: `Falha do robô (RPA) no portal: ${erro?.message ?? erro}. Tente o modo manual assistido.`,
          tempoRespostaMs: Date.now() - inicio,
        };
      } finally {
        if (browser) await browser.close().catch(() => {});
      }
    },
  };
}

function montar(
  banco: PerfilBanco,
  portal: RespostaPortal,
  financiado: number,
  tempoMs: number
): ResultadoBanco {
  const aprovavel =
    portal.status === "APROVADO" ||
    portal.status === "PRE_APROVADO" ||
    portal.status === "EM_ANALISE_MESA";
  const taxa = portal.taxaJurosMes ?? null;

  return {
    bancoNome: banco.nome,
    status: portal.status,
    probabilidadeAprovacao: null, // preenchido pela cascata
    consultaHardRealizada: true,
    ordemCascata: null, // preenchido pela cascata
    taxaJurosMes: taxa,
    valorFinanciado: aprovavel ? financiado : null,
    valorParcela: portal.valorParcela ?? null,
    prazoMeses: portal.prazoMeses ?? null,
    valorTotal: portal.valorTotal ?? null,
    cet: taxa != null ? round(cetAnual(taxa / 100), 2) : null,
    retornoLojista: aprovavel ? round(financiado * banco.retornoLojistaPct, 2) : null,
    previsaoRespostaMin: portal.status === "EM_ANALISE_MESA" ? 60 : null,
    modoIntegracao: banco.modo,
    observacao: portal.observacao || "Resposta capturada do portal via robô (RPA).",
    tempoRespostaMs: tempoMs,
  };
}

function round(v: number, casas: number): number {
  const f = Math.pow(10, casas);
  return Math.round(v * f) / f;
}
