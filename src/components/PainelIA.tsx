import type { RankingItem, AjusteSugerido, ChanceAprovacao } from "@/types";

const CHANCE_ESTILO: Record<ChanceAprovacao, string> = {
  alta: "bg-emerald-100 text-emerald-700",
  media: "bg-amber-100 text-amber-700",
  baixa: "bg-red-100 text-red-700",
};

const CHANCE_ROTULO: Record<ChanceAprovacao, string> = {
  alta: "Chance alta",
  media: "Chance média",
  baixa: "Chance baixa",
};

interface PainelIAProps {
  resumoExecutivo: string;
  estrategiaRecomendada: string;
  melhorBanco: string | null;
  chanceAprovacao: string;
  analisePerfil: string;
  ranking: RankingItem[];
  ajustes: AjusteSugerido[];
  geradoPorIA: boolean;
}

export function PainelIA(props: PainelIAProps) {
  const chance = (props.chanceAprovacao as ChanceAprovacao) || "media";

  return (
    <div className="overflow-hidden rounded-2xl border border-marca/30 bg-gradient-to-br from-teal-50 to-white">
      <div className="flex items-center justify-between border-b border-marca/20 bg-white/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-marca text-sm text-white">
            ✦
          </span>
          <h2 className="font-semibold text-slate-900">Análise inteligente</h2>
          {!props.geradoPorIA && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              modo heurístico (sem IA)
            </span>
          )}
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${CHANCE_ESTILO[chance]}`}
        >
          {CHANCE_ROTULO[chance]}
        </span>
      </div>

      <div className="space-y-5 p-5">
        <p className="text-slate-700">{props.resumoExecutivo}</p>

        {props.estrategiaRecomendada && (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Estratégia da cascata
            </p>
            <p className="text-sm text-slate-600">{props.estrategiaRecomendada}</p>
          </div>
        )}

        {props.melhorBanco && (
          <div className="rounded-xl bg-white p-4 ring-1 ring-marca/20">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Recomendação
            </p>
            <p className="text-lg font-bold text-marca-dark">{props.melhorBanco}</p>
          </div>
        )}

        <div>
          <h3 className="mb-1 text-sm font-semibold text-slate-700">
            Perfil do cliente
          </h3>
          <p className="text-sm text-slate-600">{props.analisePerfil}</p>
        </div>

        {props.ranking.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              Ranking das opções
            </h3>
            <ol className="space-y-2">
              {props.ranking.map((r) => (
                <li
                  key={`${r.posicao}-${r.banco}`}
                  className="flex gap-3 rounded-lg bg-white p-3 ring-1 ring-slate-100"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca/10 text-xs font-bold text-marca-dark">
                    {r.posicao}
                  </span>
                  <div className="text-sm">
                    <p className="font-medium text-slate-800">{r.banco}</p>
                    {r.pros && (
                      <p className="text-emerald-600">+ {r.pros}</p>
                    )}
                    {r.contras && (
                      <p className="text-slate-400">− {r.contras}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {props.ajustes.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              Ajustes para melhorar a aprovação
            </h3>
            <ul className="space-y-2">
              {props.ajustes.map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-sm"
                >
                  <p className="font-medium text-amber-900">{a.acao}</p>
                  <p className="text-amber-700">→ {a.impactoEsperado}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
