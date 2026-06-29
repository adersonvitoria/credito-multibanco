"use client";

// PORTAL-BANCO MOCK — simula o site de uma financeira onde o lojista consulta
// manualmente. O robô (Playwright) automatiza este fluxo ponta a ponta.
//
// Inputs NÃO-CONTROLADOS (lidos via FormData no submit): isso evita a corrida de
// hidratação do React quando a automação preenche os campos antes de o React
// anexar os onChange. Os #ids e data-attributes são estáveis para a raspagem
// em src/lib/connectors/recipes/mockBanco.ts.

import { useState } from "react";
import { calcularParcela } from "@/lib/finance";

type Etapa = "login" | "proposta" | "resultado";

interface Resultado {
  status: "APROVADO" | "PRE_APROVADO" | "NEGADO";
  taxa: number | null; // % a.m.
  parcela: number | null;
  total: number | null;
  obs: string;
}

export default function MockBancoPage() {
  const [etapa, setEtapa] = useState<Etapa>("login");
  const [resultado, setResultado] = useState<Resultado | null>(null);

  function entrar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("usuario") && fd.get("senha")) setEtapa("proposta");
  }

  function consultar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setResultado(
      decidir({
        renda: Number(fd.get("renda")) || 0,
        score: Number(fd.get("score")) || 0,
        valor: Number(fd.get("valorVeiculo")) || 0,
        entrada: Number(fd.get("entrada")) || 0,
        prazo: Number(fd.get("prazo")) || 0,
      })
    );
    setEtapa("resultado");
  }

  return (
    <main className="min-h-screen bg-slate-900 p-6 text-slate-100">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-indigo-500 font-bold">
            B
          </span>
          <div>
            <p className="font-bold">Banco Demo — Portal do Parceiro</p>
            <p className="text-xs text-slate-400">Esteira de crédito (ambiente mock)</p>
          </div>
        </div>

        {etapa === "login" && (
          <form onSubmit={entrar} className="space-y-4 rounded-xl bg-slate-800 p-6" id="form-login">
            <h1 className="text-lg font-semibold">Acesso do correspondente</h1>
            <input id="usuario" name="usuario" placeholder="Usuário do convênio" className="w-full rounded bg-slate-700 px-3 py-2 text-sm outline-none" />
            <input id="senha" name="senha" type="password" placeholder="Senha" className="w-full rounded bg-slate-700 px-3 py-2 text-sm outline-none" />
            <button id="entrar" type="submit" className="w-full rounded bg-indigo-500 px-4 py-2 font-semibold hover:bg-indigo-400">
              Entrar
            </button>
          </form>
        )}

        {etapa === "proposta" && (
          <form onSubmit={consultar} className="space-y-3 rounded-xl bg-slate-800 p-6" id="form-proposta">
            <h1 className="text-lg font-semibold">Nova consulta de financiamento</h1>
            {(
              [
                ["cpf", "CPF"],
                ["renda", "Renda mensal (R$)"],
                ["score", "Score"],
                ["valorVeiculo", "Valor do veículo (R$)"],
                ["entrada", "Entrada (R$)"],
                ["prazo", "Prazo (meses)"],
              ] as const
            ).map(([id, label]) => (
              <div key={id}>
                <label className="mb-1 block text-xs text-slate-400">{label}</label>
                <input id={id} name={id} className="w-full rounded bg-slate-700 px-3 py-2 text-sm outline-none" />
              </div>
            ))}
            <button id="consultar" type="submit" className="w-full rounded bg-indigo-500 px-4 py-2 font-semibold hover:bg-indigo-400">
              Consultar crédito
            </button>
          </form>
        )}

        {etapa === "resultado" && resultado && (
          <div id="resultado" data-status={resultado.status} className="space-y-3 rounded-xl bg-slate-800 p-6">
            <h1 className="text-lg font-semibold">Resultado da análise</h1>
            <p className={`text-2xl font-bold ${resultado.status === "NEGADO" ? "text-red-400" : "text-emerald-400"}`}>
              {resultado.status}
            </p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <span id="res-taxa" data-valor={resultado.taxa ?? ""}>
                Taxa: {resultado.taxa != null ? `${resultado.taxa}% a.m.` : "—"}
              </span>
              <span id="res-parcela" data-valor={resultado.parcela ?? ""}>
                Parcela: {resultado.parcela != null ? `R$ ${resultado.parcela}` : "—"}
              </span>
              <span id="res-total" data-valor={resultado.total ?? ""}>
                Total: {resultado.total != null ? `R$ ${resultado.total}` : "—"}
              </span>
            </div>
            <p id="res-obs" className="text-xs text-slate-400">
              {resultado.obs}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

// "Política de crédito" própria deste portal (independente do motor da
// plataforma — representa a lógica do banco, que não conhecemos por dentro).
function decidir(c: {
  renda: number;
  score: number;
  valor: number;
  entrada: number;
  prazo: number;
}): Resultado {
  const financiado = Math.max(0, c.valor - c.entrada);

  if (c.score < 500)
    return { status: "NEGADO", taxa: null, parcela: null, total: null, obs: "Score insuficiente para a política do banco." };
  if (c.prazo <= 0 || financiado <= 0)
    return { status: "NEGADO", taxa: null, parcela: null, total: null, obs: "Dados insuficientes." };

  let taxa = 0.0185;
  if (c.score >= 700) taxa -= 0.002;
  if (c.valor > 0 && c.entrada / c.valor >= 0.3) taxa -= 0.001;
  taxa = Math.max(0.012, taxa);

  const parcela = calcularParcela(financiado, taxa, c.prazo);
  const comprometimento = c.renda > 0 ? parcela / c.renda : 1;

  if (comprometimento > 0.35)
    return {
      status: "NEGADO",
      taxa: null,
      parcela: null,
      total: null,
      obs: `Parcela compromete ${(comprometimento * 100).toFixed(0)}% da renda.`,
    };

  const status = c.score < 600 ? "PRE_APROVADO" : "APROVADO";
  return {
    status,
    taxa: round(taxa * 100, 2),
    parcela: round(parcela, 2),
    total: round(parcela * c.prazo, 2),
    obs:
      status === "PRE_APROVADO"
        ? "Pré-aprovado — sujeito a confirmação documental."
        : "Aprovado conforme política do banco.",
  };
}

function round(v: number, casas: number): number {
  const f = Math.pow(10, casas);
  return Math.round(v * f) / f;
}
