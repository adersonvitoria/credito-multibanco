// Motor genérico de RPA: transforma um PortalConfig numa ReceitaRPA executável
// (login → preencher proposta → submeter → raspar resultado), de forma
// resiliente à hidratação do front (networkidle + settle).

import type { ReceitaRPA, RespostaPortal } from "@/lib/connectors/rpa";
import type { PortalConfig } from "@/lib/connectors/portais";
import type { StatusResposta } from "@/types";

// Em modo demo (padrão), todos os bancos são consultados no portal MOCK local.
// Defina RPA_PORTAL_MOCK=false para usar a URL real do portal (do cadastro).
function modoMock(): boolean {
  return process.env.RPA_PORTAL_MOCK !== "false";
}

export function criarReceita(config: PortalConfig): ReceitaRPA {
  return {
    bancoNome: config.bancoNome,
    async automacao({ page, dados, credenciais, baseUrl }): Promise<RespostaPortal> {
      const alvo = modoMock()
        ? `${baseUrl}/mock-banco?banco=${encodeURIComponent(config.bancoNome)}`
        : credenciais?.portalUrl;
      if (!alvo) {
        throw new Error(
          `Sem URL de portal para ${config.bancoNome} (cadastre a URL/credenciais).`
        );
      }

      const usuario = credenciais?.usuario ?? "demo";
      const senha = credenciais?.senha ?? "demo";

      // 1) Login (espera hidratação antes de interagir).
      await page.goto(alvo, { waitUntil: "networkidle" });
      await page.waitForSelector(config.loginSubmit, { state: "visible", timeout: 30000 });
      await page.waitForTimeout(600);
      await page.fill(config.loginUsuario, usuario);
      await page.fill(config.loginSenha, senha);
      await page.click(config.loginSubmit);
      await page.waitForSelector(config.aposLogin, { timeout: 30000 });

      // 2) Preenche a proposta e submete.
      for (const campo of config.campos) {
        await page.fill(campo.selector, campo.valor(dados));
      }
      await page.click(config.propostaSubmit);
      await page.waitForSelector(config.resultado, { timeout: 30000 });

      // 3) Raspa o resultado.
      const ler = async (sel: string, attr?: string): Promise<string | null> => {
        if (attr) return page.getAttribute(sel, attr);
        const t = await page.textContent(sel);
        return t != null ? t.trim() : null;
      };
      const num = async (sel: string, attr?: string): Promise<number | null> => {
        const v = await ler(sel, attr);
        if (v == null || v === "") return null;
        const n = Number(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
        return isNaN(n) ? null : n;
      };

      const statusBruto = (await ler(config.statusSelector, config.statusAttr)) ?? "";
      const status = (config.mapearStatus ?? mapearStatusPadrao)(statusBruto);

      return {
        status,
        taxaJurosMes: await num(config.taxaSelector, config.taxaAttr),
        valorParcela: await num(config.parcelaSelector, config.parcelaAttr),
        prazoMeses: dados.prazoMeses,
        valorTotal: await num(config.totalSelector, config.totalAttr),
        observacao: config.obsSelector
          ? (await ler(config.obsSelector)) || "Resposta capturada do portal (RPA)."
          : "Resposta capturada do portal (RPA).",
      };
    },
  };
}

function mapearStatusPadrao(bruto: string): StatusResposta {
  const v = bruto.toUpperCase();
  if (v.includes("PRE") || v.includes("PRÉ")) return "PRE_APROVADO";
  if (v.includes("APROV")) return "APROVADO";
  if (v.includes("MESA") || v.includes("ANALISE") || v.includes("ANÁLISE"))
    return "EM_ANALISE_MESA";
  return "NEGADO";
}
