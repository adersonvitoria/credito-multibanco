// Consulta de score (birô) — SIMULADA.
//
// O lojista NÃO informa o score do cliente. A plataforma consulta o birô uma
// única vez (a partir do CPF) e compartilha o resultado com todos os bancos —
// assim evita-se a múltipla consulta que derrubaria o score do cliente.
//
// Aqui o score é derivado de forma determinística do CPF (mesmo CPF → mesmo
// score), só para demonstração. Numa integração real, troque por uma chamada
// ao Serasa/Boa Vista/Quod mantendo a assinatura.

export interface ConsultaScore {
  score: number; // 0–1000
  faixa: "baixo" | "medio" | "bom" | "excelente";
  consultadoEm: Date;
}

export function consultarScore(cpf: string, nascimento?: Date): ConsultaScore {
  const digitos = (cpf || "").replace(/\D/g, "");
  let seed = 0;
  for (let i = 0; i < digitos.length; i++) {
    seed = (seed * 31 + digitos.charCodeAt(i)) % 1000003;
  }
  if (nascimento) seed = (seed + nascimento.getFullYear()) % 1000003;

  // Distribui em 350–950 (concentra no meio, como um birô real).
  const base = 350 + (seed % 601);
  const score = Math.round(base);

  return {
    score,
    faixa: faixaDoScore(score),
    consultadoEm: new Date(),
  };
}

function faixaDoScore(score: number): ConsultaScore["faixa"] {
  if (score >= 800) return "excelente";
  if (score >= 650) return "bom";
  if (score >= 500) return "medio";
  return "baixo";
}
