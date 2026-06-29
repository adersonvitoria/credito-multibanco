"use client";

import { useEffect, useState } from "react";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  createdAt: string;
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [atual, setAtual] = useState("");
  const [form, setForm] = useState({ nome: "", email: "", senha: "" });
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    const res = await fetch("/api/usuarios");
    const data = await res.json();
    setUsuarios(data.usuarios ?? []);
    setAtual(data.atual ?? "");
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setMsg("");
    setEnviando(true);
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.erro || "Falha ao cadastrar");
      setForm({ nome: "", email: "", senha: "" });
      setMsg("✓ Usuário cadastrado.");
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
        Cadastro de usuários
      </h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Usuários com acesso ao painel desta loja.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Lista */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                    {u.nome}
                    {u.id === atual && (
                      <span className="ml-2 rounded bg-marca/10 px-1.5 py-0.5 text-[10px] font-medium text-marca-dark dark:text-marca-light">
                        você
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.email}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                    Nenhum usuário ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Novo usuário */}
        <form
          onSubmit={criar}
          className="h-fit space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Novo usuário</h2>
          <Campo label="Nome">
            <input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className={inputCls}
              required
            />
          </Campo>
          <Campo label="E-mail">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputCls}
              required
            />
          </Campo>
          <Campo label="Senha (mín. 6)">
            <input
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              className={inputCls}
              required
            />
          </Campo>
          {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">{erro}</p>}
          {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40">{msg}</p>}
          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-lg bg-marca px-4 py-2.5 font-semibold text-white transition hover:bg-marca-dark disabled:opacity-60"
          >
            {enviando ? "Cadastrando..." : "Cadastrar usuário"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-marca focus:ring-2 focus:ring-marca/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}
