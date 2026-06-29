import Link from "next/link";
import { obterSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarMoeda } from "@/lib/finance";
import type { StatusResposta } from "@/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessao = await obterSessao();
  if (!sessao) return null;

  const propostas = await prisma.proposta.findMany({
    where: { usuarioId: sessao.id },
    orderBy: { createdAt: "desc" },
    include: { respostas: true, analise: true },
  });

  const simulacoes = await prisma.simulacao.findMany({
    where: { usuarioId: sessao.id },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Propostas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Dispare uma análise para todos os bancos e veja as melhores opções.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/simulacoes/nova"
            className="rounded-lg border border-marca/40 px-4 py-2.5 font-semibold text-marca-dark transition hover:bg-teal-50 dark:text-marca-light dark:hover:bg-slate-800"
          >
            Simulação rápida
          </Link>
          <Link
            href="/propostas/nova"
            className="rounded-lg bg-marca px-4 py-2.5 font-semibold text-white transition hover:bg-marca-dark"
          >
            + Nova proposta
          </Link>
        </div>
      </div>

      {propostas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-slate-500 dark:text-slate-400">
            Nenhuma proposta ainda. Crie a primeira para disparar a análise
            multibanco.
          </p>
          <Link
            href="/propostas/nova"
            className="mt-4 inline-block rounded-lg bg-marca px-4 py-2 font-semibold text-white hover:bg-marca-dark"
          >
            Criar proposta
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {propostas.map((p) => {
            const aprovados = p.respostas.filter(
              (r) => r.status === ("APROVADO" as StatusResposta)
            ).length;
            const preAprovados = p.respostas.filter(
              (r) => r.status === ("PRE_APROVADO" as StatusResposta)
            ).length;

            return (
              <Link
                key={p.id}
                href={`/propostas/${p.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-marca hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-slate-900 group-hover:text-marca-dark dark:text-slate-100">
                    {p.clienteNome}
                  </h2>
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                  {p.veiculoDescricao} • {formatarMoeda(p.veiculoValor)}
                </p>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                    {aprovados} aprovados
                  </span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">
                    {preAprovados} pré
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
                    {p.respostas.length} bancos
                  </span>
                </div>

                {p.analise?.melhorBanco && (
                  <p className="mt-3 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
                    <span className="text-slate-400">Recomendado: </span>
                    <span className="font-medium text-marca-dark dark:text-marca-light">
                      {p.analise.melhorBanco}
                    </span>
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {simulacoes.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Simulações recentes
            </h2>
            <Link
              href="/simulacoes/nova"
              className="text-sm font-medium text-marca-dark hover:underline"
            >
              + Nova simulação
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {simulacoes.map((s) => (
              <Link
                key={s.id}
                href={`/simulacoes/${s.id}`}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-marca dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{s.clienteNome}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {s.veiculoDescricao} • {formatarMoeda(s.veiculoValor)}
                </p>
                <p className="mt-1 text-xs text-slate-400">Placa {s.veiculoPlaca}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
