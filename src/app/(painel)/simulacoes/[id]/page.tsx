import Link from "next/link";
import { notFound } from "next/navigation";
import { obterSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, formatarPercent } from "@/lib/finance";
import type { ResultadoSimulacao } from "@/lib/simulacao";

export const dynamic = "force-dynamic";

export default async function DetalheSimulacao({
  params,
}: {
  params: { id: string };
}) {
  const sessao = await obterSessao();
  if (!sessao) return null;

  const sim = await prisma.simulacao.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
  });
  if (!sim) notFound();

  const r = JSON.parse(sim.resultadoJson) as ResultadoSimulacao;

  const nasc = sim.clienteNascimento.toISOString().slice(0, 10);
  const paramsProposta = new URLSearchParams({
    nome: sim.clienteNome,
    cpf: sim.clienteCpf,
    nasc,
    desc: sim.veiculoDescricao,
    ano: String(sim.veiculoAno),
    valor: String(sim.veiculoValor),
  }).toString();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-sm text-slate-500 hover:text-marca-dark">
        ← Voltar
      </Link>

      <div className="mb-1 mt-2 flex items-center gap-2">
        <h1 className="text-2xl font-bold text-slate-900">{sim.clienteNome}</h1>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          simulação
        </span>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        {sim.veiculoDescricao} ({sim.veiculoAno}) • Placa {sim.veiculoPlaca}
      </p>

      {/* Parâmetros da estimativa */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <Resumo label="Valor do carro" valor={formatarMoeda(sim.veiculoValor)} />
        <Resumo label="Score (consultado)" valor={String(r.score)} />
        <Resumo
          label={`Entrada (${(r.entradaPct * 100).toFixed(0)}%)`}
          valor={formatarMoeda(r.valorEntrada)}
        />
        <Resumo label="Financiado" valor={formatarMoeda(r.valorFinanciado)} />
      </div>

      {/* Estimativa por banco (todos os conveniados) */}
      <h2 className="mb-2 font-semibold text-slate-900">
        Estimativa por banco — referência {r.prazoRef}x
      </h2>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Banco</th>
              <th className="px-4 py-3">Taxa a.m.</th>
              <th className="px-4 py-3">Parcela ({r.prazoRef}x)</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Retorno loja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {r.bancos.map((b) => (
              <tr key={b.banco} className={b.atendeScore ? "" : "opacity-60"}>
                <td className="px-4 py-3 font-medium text-slate-700">
                  {b.banco}
                  {!b.atendeScore && (
                    <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      score abaixo do mínimo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{formatarPercent(b.taxaMes)}</td>
                <td className="px-4 py-3 text-base font-bold text-slate-900">
                  {formatarMoeda(b.parcela)}
                </td>
                <td className="px-4 py-3 text-slate-600">{formatarMoeda(b.total)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {formatarMoeda(b.retornoLojista)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Estimativa com entrada de {(r.entradaPct * 100).toFixed(0)}% em {r.prazoRef}x,
        usando o score consultado e a política de taxa de cada banco. Não é
        proposta nem garante aprovação — as condições reais (e o comprometimento
        de renda) dependem da proposta completa.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/propostas/nova?${paramsProposta}`}
          className="rounded-lg bg-marca px-4 py-2.5 font-semibold text-white transition hover:bg-marca-dark"
        >
          Converter em proposta completa →
        </Link>
        <Link
          href="/simulacoes/nova"
          className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-600 transition hover:bg-slate-100"
        >
          Nova simulação
        </Link>
      </div>
    </div>
  );
}

function Resumo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-semibold text-slate-800">{valor}</p>
    </div>
  );
}
