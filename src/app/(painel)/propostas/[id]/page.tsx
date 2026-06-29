import Link from "next/link";
import { notFound } from "next/navigation";
import { obterSessao } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatarMoeda, calcularIdade } from "@/lib/finance";
import { CardBanco } from "@/components/CardBanco";
import { PainelIA } from "@/components/PainelIA";
import type { RankingItem, AjusteSugerido } from "@/types";

export const dynamic = "force-dynamic";

export default async function DetalheProposta({
  params,
}: {
  params: { id: string };
}) {
  const sessao = await obterSessao();
  if (!sessao) return null;

  const proposta = await prisma.proposta.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: { respostas: true, analise: true },
  });

  if (!proposta) notFound();

  const idade = calcularIdade(proposta.clienteNascimento);
  const entradaPct =
    proposta.veiculoValor > 0
      ? (proposta.valorEntrada / proposta.veiculoValor) * 100
      : 0;

  const ranking: RankingItem[] = proposta.analise
    ? safeParse(proposta.analise.rankingJson)
    : [];
  const ajustes: AjusteSugerido[] = proposta.analise
    ? safeParse(proposta.analise.ajustesJson)
    : [];

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-slate-500 hover:text-marca-dark">
        ← Voltar
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {proposta.clienteNome}
          </h1>
          <p className="text-sm text-slate-500">
            {proposta.veiculoDescricao} ({proposta.veiculoAno})
          </p>
        </div>
      </div>

      {/* Resumo da operação */}
      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <Resumo label="Valor do veículo" valor={formatarMoeda(proposta.veiculoValor)} />
        <Resumo
          label="Entrada"
          valor={`${formatarMoeda(proposta.valorEntrada)} (${entradaPct.toFixed(0)}%)`}
        />
        <Resumo
          label="Financiado"
          valor={formatarMoeda(proposta.veiculoValor - proposta.valorEntrada)}
        />
        <Resumo label="Prazo" valor={`${proposta.prazoMeses} meses`} />
        <Resumo label="Renda mensal" valor={formatarMoeda(proposta.clienteRenda)} />
        <Resumo label="Score (consultado)" valor={String(proposta.clienteScore)} />
        <Resumo label="Idade" valor={`${idade} anos`} />
        <Resumo label="Profissão" valor={proposta.clienteProfissao || "—"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Respostas dos bancos */}
        <section>
          <h2 className="mb-3 font-semibold text-slate-900">
            Respostas dos bancos ({proposta.respostas.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[...proposta.respostas]
              .sort((a, b) => {
                // Consultados (com ordem de cascata) primeiro; depois o resto.
                const oa = a.ordemCascata ?? 99;
                const ob = b.ordemCascata ?? 99;
                if (oa !== ob) return oa - ob;
                return (b.probabilidadeAprovacao ?? 0) - (a.probabilidadeAprovacao ?? 0);
              })
              .map((r) => (
              <CardBanco
                key={r.id}
                resposta={r}
                rendaMensal={proposta.clienteRenda}
                destaque={
                  !!proposta.analise?.melhorBanco &&
                  r.bancoNome === proposta.analise.melhorBanco
                }
              />
            ))}
          </div>
        </section>

        {/* Painel da IA */}
        <aside>
          {proposta.analise ? (
            <PainelIA
              resumoExecutivo={proposta.analise.resumoExecutivo}
              estrategiaRecomendada={proposta.analise.estrategiaRecomendada}
              melhorBanco={proposta.analise.melhorBanco}
              chanceAprovacao={proposta.analise.chanceAprovacao}
              analisePerfil={proposta.analise.analisePerfil}
              ranking={ranking}
              ajustes={ajustes}
              geradoPorIA={proposta.analise.geradoPorIA}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
              Análise indisponível para esta proposta.
            </div>
          )}
        </aside>
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

function safeParse<T>(json: string): T[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
