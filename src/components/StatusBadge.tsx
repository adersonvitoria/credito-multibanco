import type { StatusResposta } from "@/types";

const ESTILOS: Record<StatusResposta, string> = {
  APROVADO: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  PRE_APROVADO: "bg-amber-100 text-amber-700 ring-amber-200",
  EM_ANALISE_MESA: "bg-sky-100 text-sky-700 ring-sky-200",
  NEGADO: "bg-red-100 text-red-700 ring-red-200",
  NAO_CONSULTADO: "bg-slate-100 text-slate-500 ring-slate-200",
};

const ROTULOS: Record<StatusResposta, string> = {
  APROVADO: "Aprovado",
  PRE_APROVADO: "Pré-aprovado",
  EM_ANALISE_MESA: "Em análise (mesa)",
  NEGADO: "Negado",
  NAO_CONSULTADO: "Não consultado",
};

export function StatusBadge({ status }: { status: StatusResposta }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${ESTILOS[status]}`}
    >
      {ROTULOS[status]}
    </span>
  );
}
