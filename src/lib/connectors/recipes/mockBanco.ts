// Receita de RPA para o "portal-banco" MOCK servido pelo próprio app
// (/mock-banco). Demonstra o mecanismo ponta a ponta: login → preencher
// proposta → submeter → raspar a resposta da tela.
//
// Para um banco REAL, você cria uma receita análoga com a URL e os seletores
// do portal daquele banco (e trata login/2FA/captcha conforme o caso).

import type { PerfilBanco } from "@/lib/bancos";
import type { ReceitaRPA, RespostaPortal } from "@/lib/connectors/rpa";

export function receitaMockBanco(banco: PerfilBanco): ReceitaRPA {
  return {
    bancoNome: banco.nome,
    async automacao({ page, dados, credenciais, baseUrl }): Promise<RespostaPortal> {
      const usuario = credenciais?.usuario ?? "demo";
      const senha = credenciais?.senha ?? "demo";

      // 1) Abre o portal e faz login (como o lojista faria).
      // networkidle + settle garante que o React hidratou antes de interagir
      // (senão o clique no submit acontece antes dos handlers serem anexados).
      await page.goto(`${baseUrl}/mock-banco`, { waitUntil: "networkidle" });
      await page.waitForSelector("#entrar", { state: "visible", timeout: 30000 });
      await page.waitForTimeout(700); // settle de hidratação
      await page.fill("#usuario", usuario);
      await page.fill("#senha", senha);
      await page.click("#entrar");
      await page.waitForSelector("#form-proposta", { timeout: 30000 });

      // 2) Preenche os dados da proposta.
      await page.fill("#cpf", dados.clienteCpf);
      await page.fill("#renda", String(dados.clienteRenda));
      await page.fill("#score", String(dados.clienteScore));
      await page.fill("#valorVeiculo", String(dados.veiculoValor));
      await page.fill("#entrada", String(dados.valorEntrada));
      await page.fill("#prazo", String(dados.prazoMeses));
      await page.click("#consultar");

      // 3) Aguarda e raspa o resultado da tela.
      await page.waitForSelector("#resultado", { timeout: 30000 });
      const status = ((await page.getAttribute("#resultado", "data-status")) ||
        "NEGADO") as RespostaPortal["status"];

      const num = async (sel: string): Promise<number | null> => {
        const v = await page.getAttribute(sel, "data-valor");
        return v != null && v !== "" ? Number(v) : null;
      };

      const obs = (await page.textContent("#res-obs"))?.trim();

      return {
        status,
        taxaJurosMes: await num("#res-taxa"),
        valorParcela: await num("#res-parcela"),
        prazoMeses: dados.prazoMeses,
        valorTotal: await num("#res-total"),
        observacao: obs || "Resposta capturada do portal (RPA).",
      };
    },
  };
}
