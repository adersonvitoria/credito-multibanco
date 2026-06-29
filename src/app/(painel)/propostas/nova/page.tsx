"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BANCOS } from "@/lib/bancos";

const CAMPOS_INICIAIS = {
  clienteNome: "",
  clienteCpf: "",
  clienteNascimento: "",
  clienteRenda: "",
  clienteProfissao: "",
  clienteCidade: "",
  clienteUf: "",
  veiculoDescricao: "",
  veiculoAno: "",
  veiculoValor: "",
  valorEntrada: "",
  prazoMeses: "48",
};

export default function NovaPropostaPage() {
  const router = useRouter();
  const [form, setForm] = useState(CAMPOS_INICIAIS);
  const [consentimento, setConsentimento] = useState(false);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Pré-preenche quando a proposta vem de uma simulação (query params).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (Array.from(q.keys()).length === 0) return;
    setForm((f) => ({
      ...f,
      clienteNome: q.get("nome") ?? f.clienteNome,
      clienteCpf: q.get("cpf") ?? f.clienteCpf,
      clienteNascimento: q.get("nasc") ?? f.clienteNascimento,
      veiculoDescricao: q.get("desc") ?? f.veiculoDescricao,
      veiculoAno: q.get("ano") ?? f.veiculoAno,
      veiculoValor: q.get("valor") ?? f.veiculoValor,
    }));
  }, []);

  function set(campo: keyof typeof CAMPOS_INICIAIS, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!consentimento) {
      setErro("Marque o consentimento do cliente (LGPD) para prosseguir.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteNome: form.clienteNome,
          clienteCpf: form.clienteCpf,
          clienteNascimento: form.clienteNascimento,
          clienteRenda: Number(form.clienteRenda),
          clienteProfissao: form.clienteProfissao,
          clienteCidade: form.clienteCidade,
          clienteUf: form.clienteUf,
          veiculoDescricao: form.veiculoDescricao,
          veiculoAno: Number(form.veiculoAno),
          veiculoValor: Number(form.veiculoValor),
          valorEntrada: Number(form.valorEntrada),
          prazoMeses: Number(form.prazoMeses),
          consentimentoLGPD: consentimento,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.erro || "Falha ao enviar proposta");

      router.push(`/propostas/${data.id}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado");
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-sm text-slate-500 hover:text-marca-dark">
        ← Voltar
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold text-slate-900">Nova proposta</h1>
      <p className="mb-6 text-sm text-slate-500">
        O <strong>score é consultado automaticamente</strong> (você não precisa
        informar) e a proposta é enviada a <strong>todos os {BANCOS.length} bancos
        conveniados</strong>. A consulta ao birô é feita uma única vez e
        compartilhada com os bancos.
      </p>

      <form onSubmit={enviar} className="space-y-6">
        <Secao titulo="Dados do cliente">
          <Campo label="Nome completo" className="sm:col-span-2">
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
          <Campo label="Renda mensal (R$)">
            <input
              type="number"
              min="0"
              step="0.01"
              {...inp(form.clienteRenda, (v) => set("clienteRenda", v))}
              required
            />
          </Campo>
          <Campo label="Profissão">
            <input
              {...inp(form.clienteProfissao, (v) => set("clienteProfissao", v))}
            />
          </Campo>
          <Campo label="Cidade">
            <input {...inp(form.clienteCidade, (v) => set("clienteCidade", v))} />
          </Campo>
          <Campo label="UF">
            <input
              maxLength={2}
              {...inp(form.clienteUf, (v) => set("clienteUf", v.toUpperCase()))}
              placeholder="RS"
            />
          </Campo>
        </Secao>

        <Secao titulo="Veículo e condições">
          <Campo label="Descrição do veículo" className="sm:col-span-2">
            <input
              {...inp(form.veiculoDescricao, (v) => set("veiculoDescricao", v))}
              placeholder="Ex.: VW Polo 1.0 TSI Comfortline"
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
          <Campo label="Valor do veículo (R$)">
            <input
              type="number"
              min="0"
              step="0.01"
              {...inp(form.veiculoValor, (v) => set("veiculoValor", v))}
              required
            />
          </Campo>
          <Campo label="Entrada (R$)">
            <input
              type="number"
              min="0"
              step="0.01"
              {...inp(form.valorEntrada, (v) => set("valorEntrada", v))}
              required
            />
          </Campo>
          <Campo label="Prazo (meses)">
            <select
              value={form.prazoMeses}
              onChange={(e) => set("prazoMeses", e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/30"
            >
              {[12, 24, 36, 48, 60, 72].map((m) => (
                <option key={m} value={m}>
                  {m} meses
                </option>
              ))}
            </select>
          </Campo>
        </Secao>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 font-semibold text-slate-900">Consentimento</h2>
          <p className="mb-4 text-xs text-slate-500">
            O score será consultado no birô e a proposta enviada a todos os
            bancos conveniados.
          </p>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <input
              type="checkbox"
              checked={consentimento}
              onChange={(e) => setConsentimento(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-marca"
            />
            <span className="text-sm text-amber-900">
              Confirmo que o cliente <strong>autorizou (LGPD)</strong> a consulta
              de crédito e o envio dos seus dados às financeiras conveniadas para
              esta finalidade.
            </span>
          </label>
        </div>

        {erro && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p>
        )}

        <button
          type="submit"
          disabled={enviando || !consentimento}
          className="w-full rounded-lg bg-marca px-4 py-3 font-semibold text-white transition hover:bg-marca-dark disabled:opacity-60"
        >
          {enviando
            ? "Consultando o birô e todos os bancos..."
            : "Iniciar análise em cascata"}
        </button>
      </form>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 font-semibold text-slate-900">{titulo}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
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

// Props comuns dos <input> de texto/número.
function inp(value: string, onChange: (v: string) => void) {
  return {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    className:
      "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/30",
  };
}
