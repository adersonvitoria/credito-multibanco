// Funções financeiras: cálculo de parcela (Tabela Price) e formatação.

/**
 * Calcula a parcela mensal pela Tabela Price (sistema de amortização francês).
 * @param pv valor financiado (presente)
 * @param taxaMes taxa de juros mensal em fração (ex.: 0.0199 para 1,99% a.m.)
 * @param n número de parcelas
 */
export function calcularParcela(pv: number, taxaMes: number, n: number): number {
  if (n <= 0) return 0;
  if (taxaMes <= 0) return pv / n;
  const fator = Math.pow(1 + taxaMes, n);
  return (pv * taxaMes * fator) / (fator - 1);
}

/**
 * Custo Efetivo Total aproximado em % ao ano, a partir da taxa mensal.
 * (Aproximação: capitalização composta da taxa nominal mensal.)
 */
export function cetAnual(taxaMes: number): number {
  return (Math.pow(1 + taxaMes, 12) - 1) * 100;
}

export function formatarMoeda(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatarPercent(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined) return "—";
  return `${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

export function calcularIdade(nascimento: Date): number {
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const m = hoje.getMonth() - nascimento.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
  return idade;
}
