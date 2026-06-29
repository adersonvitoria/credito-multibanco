// Camada de conectores: abstrai COMO cada banco é consultado.
//
//   - "simulado": motor de regras local (demo / sem credenciais).
//   - "rpa": robô Playwright que acessa o portal do banco como o lojista faz,
//     preenche o formulário e raspa a resposta da tela.
//
// A cascata não sabe (nem precisa saber) qual modo está em uso — ela só chama
// `conector.consultar(dados, credenciais)`.

import type { ResultadoBanco } from "@/types";
import type { PerfilBanco, PropostaParaAvaliacao } from "@/lib/bancos";

// Dados completos do cliente/operação que um portal pode exigir no formulário.
export interface DadosConsulta extends PropostaParaAvaliacao {
  clienteNome: string;
  clienteCpf: string;
  clienteProfissao: string;
  clienteCidade: string;
  clienteUf: string;
  veiculoDescricao: string;
}

// Credenciais de convênio da loja em um banco (guardadas criptografadas).
export interface CredenciaisBanco {
  usuario: string;
  senha: string;
  portalUrl?: string; // URL do portal (do cadastro ou do catálogo)
  extra?: Record<string, string>;
}

export type ModoConector = "simulado" | "rpa";

export interface Conector {
  banco: PerfilBanco;
  modo: ModoConector;
  consultar(
    dados: DadosConsulta,
    credenciais?: CredenciaisBanco
  ): Promise<ResultadoBanco>;
}
