"use client";

import { useState } from "react";

export function TrocarSenha() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    setEnviando(true);
    try {
      const res = await fetch("/api/conta/senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.erro || "Falha ao trocar a senha");
      setSenhaAtual("");
      setNovaSenha("");
      setMsg("✓ Senha alterada com sucesso.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setEnviando(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-marca focus:ring-2 focus:ring-marca/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

  return (
    <form onSubmit={enviar} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Senha atual
        </span>
        <input
          type="password"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          className={inputCls}
          required
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Nova senha (mín. 6)
        </span>
        <input
          type="password"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          className={inputCls}
          required
        />
      </label>
      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">{erro}</p>}
      {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40">{msg}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-marca px-4 py-2.5 font-semibold text-white transition hover:bg-marca-dark disabled:opacity-60"
      >
        {enviando ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}
