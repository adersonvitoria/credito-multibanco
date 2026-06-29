// Tipos compartilhados da plataforma de crédito multibanco.

export type StatusProposta = "PROCESSANDO" | "CONCLUIDA" | "ERRO";

// Estados possíveis de uma resposta de banco no modelo de cascata:
// - APROVADO / PRE_APROVADO / NEGADO: decisão após consulta (hard pull).
// - EM_ANALISE_MESA: caiu na mesa de crédito (análise humana), resposta assíncrona.
// - NAO_CONSULTADO: não foi consultado (cascata parou antes) — score preservado.
export type StatusResposta =
  | "APROVADO"
  | "PRE_APROVADO"
  | "NEGADO"
  | "EM_ANALISE_MESA"
  | "NAO_CONSULTADO";

export type ChanceAprovacao = "alta" | "media" | "baixa";

export type ModoIntegracao = "INSTANTANEO" | "MESA";
export type TipoIntegracao = "API" | "ARQUIVO" | "RPA" | "MANUAL";

// Dados de entrada de uma proposta (núcleo canônico enxuto — campos extras de
// cada banco só são pedidos quando a proposta avança).
export interface DadosProposta {
  clienteNome: string;
  clienteCpf: string;
  clienteNascimento: string; // ISO date (yyyy-mm-dd)
  clienteRenda: number;
  clienteProfissao: string;
  clienteCidade: string;
  clienteUf: string;
  veiculoDescricao: string;
  veiculoAno: number;
  veiculoValor: number;
  valorEntrada: number;
  prazoMeses: number;
  consentimentoLGPD: boolean;
}

// Dados de entrada de uma SIMULAÇÃO rápida (formulário enxuto).
export interface DadosSimulacao {
  clienteNome: string;
  clienteCpf: string;
  clienteNascimento: string; // ISO date
  veiculoDescricao: string;
  veiculoPlaca: string;
  veiculoAno: number;
  veiculoValor: number;
}

// Resultado da pré-qualificação de um banco (Fase 1 — SEM consulta ao birô).
export interface PreQualificacao {
  bancoNome: string;
  probabilidade: number; // 0–100
  motivoPrincipal: string;
  retornoLojista: number; // R$ estimado de retorno/comissão ao lojista
  modo: ModoIntegracao;
  tipoIntegracao: TipoIntegracao;
}

// Resultado da consulta efetiva de um banco (Fase 2 — após hard pull).
export interface ResultadoBanco {
  bancoNome: string;
  status: StatusResposta;
  probabilidadeAprovacao: number | null; // da pré-qualificação
  consultaHardRealizada: boolean;
  ordemCascata: number | null;
  taxaJurosMes: number | null;
  valorFinanciado: number | null;
  valorParcela: number | null;
  prazoMeses: number | null;
  valorTotal: number | null;
  cet: number | null;
  retornoLojista: number | null;
  previsaoRespostaMin: number | null; // quando vai para a mesa
  modoIntegracao: ModoIntegracao;
  observacao: string;
  tempoRespostaMs: number;
}

// Itens estruturados da análise da IA.
export interface RankingItem {
  banco: string;
  posicao: number;
  pros: string;
  contras: string;
}

export interface AjusteSugerido {
  acao: string;
  impactoEsperado: string;
}

export interface ResultadoAnalise {
  resumoExecutivo: string;
  estrategiaRecomendada: string;
  melhorBanco: string | null;
  chanceAprovacao: ChanceAprovacao;
  analisePerfil: string;
  ranking: RankingItem[];
  ajustes: AjusteSugerido[];
  geradoPorIA: boolean;
}
