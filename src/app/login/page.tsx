"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("loja@demo.com");
  const [senha, setSenha] = useState("demo1234");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.erro || "Falha ao entrar");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-teal-50 p-4 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-marca text-xl font-bold text-white">
            ₵
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Crédito Multibanco</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Análise de crédito em todos os bancos, com IA.
          </p>
        </div>

        <div className="mb-5 rounded-lg border border-marca/30 bg-teal-50/60 p-3 dark:bg-teal-950/30">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-marca-dark">
            Acesso de demonstração
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">E-mail</span>
            <code className="font-mono text-slate-800 dark:text-slate-200">loja@demo.com</code>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Senha</span>
            <code className="font-mono text-slate-800 dark:text-slate-200">demo1234</code>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Os campos abaixo já vêm preenchidos — é só clicar em Entrar.
          </p>
        </div>

        <form onSubmit={entrar} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-marca focus:ring-2 focus:ring-marca/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Senha
            </label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-marca focus:ring-2 focus:ring-marca/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {erro && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-marca px-4 py-2.5 font-semibold text-white transition hover:bg-marca-dark disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Plataforma de análise de crédito multibanco
        </p>
      </div>
    </main>
  );
}
