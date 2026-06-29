// Catálogo de portais dos bancos/financeiras — para onde a loja envia as
// propostas. Aqui ficam o site institucional e a URL do portal de correspondente
// (onde o robô/lojista faz a consulta), além do tipo de integração.
//
// ⚠️ As URLs de PORTAL abaixo são referências e devem ser CONFIRMADAS com o
// gerente de cada convênio — cada loja pode ter um endereço/subdomínio próprio
// de correspondente. O site institucional é só orientativo. O usuário e a senha
// de cada banco são cadastrados por loja na tela "Bancos & credenciais"
// (guardados criptografados, ver src/lib/crypto.ts).

export interface PortalBanco {
  bancoNome: string;
  site: string; // site institucional (referência)
  portalUrl: string; // portal de correspondente (confirmar/configurável)
  tipoIntegracao: "API" | "ARQUIVO" | "RPA" | "MANUAL";
  observacao: string;
}

export const CATALOGO_PORTAIS: PortalBanco[] = [
  {
    bancoNome: "Santander Financiamentos",
    site: "https://www.santander.com.br",
    portalUrl: "https://www.santanderfinanciamentos.com.br",
    tipoIntegracao: "API",
    observacao: "Portal de correspondente / API. Confirmar endpoint do convênio.",
  },
  {
    bancoNome: "BV Financeira",
    site: "https://www.bv.com.br",
    portalUrl: "https://www.bv.com.br",
    tipoIntegracao: "API",
    observacao: "Plataforma BV para lojistas. Confirmar URL/credenciais do convênio.",
  },
  {
    bancoNome: "Itaú Veículos",
    site: "https://www.itau.com.br",
    portalUrl: "https://www.credline.com.br",
    tipoIntegracao: "API",
    observacao: "Originação via Credline/Itaú. Bancos de mesa respondem assíncrono.",
  },
  {
    bancoNome: "Bradesco Financiamentos",
    site: "https://banco.bradesco",
    portalUrl: "https://www.bradescofinanciamentos.com.br",
    tipoIntegracao: "ARQUIVO",
    observacao: "Integração por arquivo/portal. Confirmar fluxo com o convênio.",
  },
  {
    bancoNome: "Banco Pan",
    site: "https://www.bancopan.com.br",
    portalUrl: "https://lojista.bancopan.com.br",
    tipoIntegracao: "API",
    observacao: "Portal do lojista Pan. Confirmar URL/credenciais.",
  },
  {
    bancoNome: "Omni Financeira",
    site: "https://www.omni.com.br",
    portalUrl: "https://portal.omni.com.br",
    tipoIntegracao: "RPA",
    observacao: "Sem API aberta — automação de portal (RPA). Confirmar URL.",
  },
];

export function getPortal(bancoNome: string): PortalBanco | undefined {
  return CATALOGO_PORTAIS.find((p) => p.bancoNome === bancoNome);
}
