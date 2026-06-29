import { StatusBadge } from "@/components/StatusBadge";
import { formatarMoeda, formatarPercent } from "@/lib/finance";
import type { StatusResposta } from "@/types";

interface RespostaProps {
  bancoNome: string;
  status: string;
  probabilidadeAprovacao: number | null;
  consultaHardRealizada: boolean;
  ordemCascata: number | null;
  previsaoRespostaMin: number | null;
  modoIntegracao: string;
  taxaJurosMes: number | null;
  valorParcela: number | null;
  prazoMeses: number | null;
  valorTotal: number | null;
  cet: number | null;
  retornoLojista: number | null;
  observacao: string | null;
  tempoRespostaMs: number;
}

export function CardBanco({
  resposta,
  rendaMensal,
  destaque,
}: {
  resposta: RespostaProps;
  rendaMensal: number;
  destaque?: boolean;
}) {
  const status = resposta.status as StatusResposta;
  const comValores =
    status === "APROVADO" || status === "PRE_APROVADO" || status === "EM_ANALISE_MESA";
  const naoConsultado = status === "NAO_CONSULTADO";
  const comprometimento =
    resposta.valorParcela != null && rendaMensal > 0
      ? (resposta.valorParcela / rendaMensal) * 100
      : null;

  return (
    <div
      className={`rounded-xl border bg-white p-4 dark:bg-slate-900 ${
        destaque ? "border-marca ring-2 ring-marca/30" : "border-slate-200 dark:border-slate-800"
      } ${naoConsultado || status === "NEGADO" ? "opacity-80" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {resposta.ordemCascata != null && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white dark:bg-slate-600">
              {resposta.ordemCascata}
            </span>
          )}
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{resposta.bancoNome}</h3>
          {destaque && (
            <span className="rounded-full bg-marca px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Melhor opção
            </span>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Linha de meta: probabilidade pré-qual + modo */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
        {resposta.probabilidadeAprovacao != null && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">
            pré-qual {resposta.probabilidadeAprovacao}%
          </span>
        )}
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">
          {resposta.modoIntegracao === "MESA" ? "mesa" : "instantâneo"}
        </span>
        {!resposta.consultaHardRealizada && !naoConsultado && (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">
            sem consulta
          </span>
        )}
        {naoConsultado && (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-600">
            score preservado
          </span>
        )}
      </div>

      {comValores ? (
        <>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Parcela">
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                {formatarMoeda(resposta.valorParcela)}
              </span>
              <span className="text-slate-400"> /{resposta.prazoMeses}x</span>
            </Info>
            <Info label="Taxa a.m.">{formatarPercent(resposta.taxaJurosMes)}</Info>
            <Info label="Total a pagar">{formatarMoeda(resposta.valorTotal)}</Info>
            <Info label="Retorno à loja">{formatarMoeda(resposta.retornoLojista)}</Info>
          </div>

          {comprometimento != null && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Comprometimento da renda</span>
                <span>{comprometimento.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${
                    comprometimento > 30 ? "bg-amber-500" : "bg-marca"
                  }`}
                  style={{ width: `${Math.min(100, comprometimento)}%` }}
                />
              </div>
            </div>
          )}

          {status === "EM_ANALISE_MESA" && resposta.previsaoRespostaMin != null && (
            <p className="mt-3 rounded-lg bg-sky-50 px-2 py-1 text-xs text-sky-700">
              Resposta humana — previsão ~{resposta.previsaoRespostaMin} min.
            </p>
          )}

          {resposta.observacao && (
            <p className="mt-3 text-xs text-slate-400">{resposta.observacao}</p>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-500">{resposta.observacao}</p>
      )}

      {resposta.consultaHardRealizada && resposta.tempoRespostaMs > 0 && (
        <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-300">
          consulta em {resposta.tempoRespostaMs} ms
        </p>
      )}
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-slate-700 dark:text-slate-200">{children}</p>
    </div>
  );
}
