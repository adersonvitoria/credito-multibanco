"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const INICIAL = {
  clienteNome: "",
  clienteCpf: "",
  clienteNascimento: "",
  veiculoDescricao: "",
  veiculoPlaca: "",
  veiculoAno: "",
  veiculoValor: "",
};

export default function NovaSimulacaoPage() {
  const router = useRouter();
  const [form, setForm] = useState(INICIAL);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  function set(campo: keyof typeof INICIAL, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const res = await fetch("/api/simulacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteNome: form.clienteNome,
          clienteCpf: form.clienteCpf,
          clienteNascimento: form.clienteNascimento,
          veiculoDescricao: form.veiculoDescricao,
          veiculoPlaca: form.veiculoPlaca,
          veiculoAno: Number(form.veiculoAno),
          veiculoValor: Number(form.veiculoValor),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.erro || "Falha ao simular");
      router.push(`/simulacoes/${data.id}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado");
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard" className="text-sm text-slate-500 hover:text-marca-dark">
        ← Voltar
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold text-slate-900">Simulação rápida</h1>
      <p className="mb-6 text-sm text-slate-500">
        O score é consultado automaticamente e a estimativa de parcela é
        calculada para <strong>todos os bancos conveniados</strong>. Sem decisão
        de crédito — ideal para dar um número ao cliente na hora.
      </p>

      <form onSubmit={enviar} className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Cliente</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Nome" className="sm:col-span-2">
              <input {...inp(form.clienteNome, (v) => set("clienteNome", v))} required />
            </Campo>
            <Campo label="CPF">
              <input
                {...inp(form.clienteCpf, (v) => set("clienteCpf", v))}
                placeholder="000.000.000-00"
                required
              />
            </Campo>
            <Campo label="Data de nascimento">
              <input
                type="date"
                {...inp(form.clienteNascimento, (v) => set("clienteNascimento", v))}
                required
              />
            </Campo>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold text-slate-900">Veículo</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Descrição do carro" className="sm:col-span-2">
              <input
                {...inp(form.veiculoDescricao, (v) => set("veiculoDescricao", v))}
                placeholder="Ex.: VW Polo 1.0 TSI Comfortline"
                required
              />
            </Campo>
            <Campo label="Placa">
              <input
                {...inp(form.veiculoPlaca, (v) => set("veiculoPlaca", v.toUpperCase()))}
                placeholder="ABC1D23"
                maxLength={8}
                required
              />
            </Campo>
            <Campo label="Ano">
              <input
                type="number"
                {...inp(form.veiculoAno, (v) => set("veiculoAno", v))}
                placeholder="2020"
                required
              />
            </Campo>
            <Campo label="Valor do carro (R$)" className="sm:col-span-2">
              <input
                type="number"
                min="0"
                step="0.01"
                {...inp(form.veiculoValor, (v) => set("veiculoValor", v))}
                required
              />
            </Campo>
          </div>
        </div>

        {erro && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white transition hover:bg-marca-dark disabled:opacity-60"
        >
          {enviando ? "Simulando..." : "Simular parcelas"}
        </button>
      </form>
    </div>
  );
}

function Campo({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function inp(value: string, onChange: (v: string) => void) {
  return {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    className:
      "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/30",
  };
}
