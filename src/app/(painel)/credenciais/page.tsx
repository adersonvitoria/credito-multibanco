"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface BancoCred {
  bancoNome: string;
  modo: string;
  tipoIntegracao: string;
  site: string;
  portalUrlPadrao: string;
  observacao: string;
  conveniado: boolean;
  credencial: {
    portalUrl: string;
    login: string;
    senhaDefinida: boolean;
    ativo: boolean;
  } | null;
}

// Estado editável por banco.
interface Edicao {
  portalUrl: string;
  login: string;
  senha: string;
  ativo: boolean;
  salvando: boolean;
  msg: string;
}

export default function CredenciaisPage() {
  const [bancos, setBancos] = useState<BancoCred[]>([]);
  const [edicao, setEdicao] = useState<Record<string, Edicao>>({});
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    const res = await fetch("/api/credenciais");
    const data = await res.json();
    const lista: BancoCred[] = data.bancos ?? [];
    setBancos(lista);
    const ed: Record<string, Edicao> = {};
    for (const b of lista) {
      ed[b.bancoNome] = {
        portalUrl: b.credencial?.portalUrl || b.portalUrlPadrao,
        login: b.credencial?.login || "",
        senha: "",
        ativo: b.credencial?.ativo ?? true,
        salvando: false,
        msg: "",
      };
    }
    setEdicao(ed);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  function set(banco: string, campo: keyof Edicao, valor: string | boolean) {
    setEdicao((e) => ({ ...e, [banco]: { ...e[banco], [campo]: valor, msg: "" } }));
  }

  async function salvar(banco: string) {
    const e = edicao[banco];
    setEdicao((s) => ({ ...s, [banco]: { ...s[banco], salvando: true, msg: "" } }));
    try {
      const res = await fetch("/api/credenciais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bancoNome: banco,
          login: e.login,
          senha: e.senha,
          portalUrl: e.portalUrl,
          ativo: e.ativo,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.erro || "Falha ao salvar");
      setEdicao((s) => ({
        ...s,
        [banco]: { ...s[banco], salvando: false, senha: "", msg: "✓ salvo" },
      }));
      carregar();
    } catch (err) {
      setEdicao((s) => ({
        ...s,
        [banco]: {
          ...s[banco],
          salvando: false,
          msg: err instanceof Error ? err.message : "Erro",
        },
      }));
    }
  }

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-slate-500 hover:text-marca-dark">
        ← Voltar
      </Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold text-slate-900">
        Bancos &amp; credenciais
      </h1>
      <p className="mb-6 text-sm text-slate-500">
        Mapeamento dos bancos/financeiras para onde a loja envia as propostas.
        Configure a URL do portal, o usuário e a senha de cada convênio. A senha é
        guardada <strong>criptografada</strong> e nunca é exibida.
      </p>

      {carregando ? (
        <p className="text-slate-400">Carregando...</p>
      ) : (
        <div className="space-y-4">
          {bancos.map((b) => {
            const e = edicao[b.bancoNome];
            if (!e) return null;
            return (
              <div
                key={b.bancoNome}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-slate-900">{b.bancoNome}</h2>
                  <Tag>{b.tipoIntegracao}</Tag>
                  <Tag>{b.modo === "MESA" ? "mesa" : "instantâneo"}</Tag>
                  {b.conveniado ? (
                    <Tag cor="emerald">conveniado</Tag>
                  ) : (
                    <Tag cor="slate">sem convênio</Tag>
                  )}
                  {b.credencial ? (
                    <Tag cor="teal">credencial definida</Tag>
                  ) : (
                    <Tag cor="amber">sem credencial</Tag>
                  )}
                  {b.site && (
                    <a
                      href={b.site}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto text-xs text-slate-400 hover:text-marca-dark"
                    >
                      {b.site.replace(/^https?:\/\//, "")} ↗
                    </a>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Campo label="URL do portal" className="sm:col-span-3">
                    <input
                      value={e.portalUrl}
                      onChange={(ev) => set(b.bancoNome, "portalUrl", ev.target.value)}
                      placeholder={b.portalUrlPadrao}
                      className={inputCls}
                    />
                  </Campo>
                  <Campo label="Usuário / login">
                    <input
                      value={e.login}
                      onChange={(ev) => set(b.bancoNome, "login", ev.target.value)}
                      className={inputCls}
                    />
                  </Campo>
                  <Campo
                    label={
                      b.credencial?.senhaDefinida
                        ? "Senha (deixe em branco p/ manter)"
                        : "Senha"
                    }
                  >
                    <input
                      type="password"
                      value={e.senha}
                      onChange={(ev) => set(b.bancoNome, "senha", ev.target.value)}
                      placeholder={b.credencial?.senhaDefinida ? "•••••••• (salva)" : ""}
                      className={inputCls}
                    />
                  </Campo>
                  <div className="flex items-end gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={e.ativo}
                        onChange={(ev) => set(b.bancoNome, "ativo", ev.target.checked)}
                        className="h-4 w-4 accent-marca"
                      />
                      ativo
                    </label>
                    <button
                      onClick={() => salvar(b.bancoNome)}
                      disabled={e.salvando}
                      className="rounded-lg bg-marca px-4 py-2 text-sm font-semibold text-white transition hover:bg-marca-dark disabled:opacity-60"
                    >
                      {e.salvando ? "Salvando..." : "Salvar"}
                    </button>
                    {e.msg && (
                      <span
                        className={`text-xs ${
                          e.msg.startsWith("✓") ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {e.msg}
                      </span>
                    )}
                  </div>
                </div>

                {b.observacao && (
                  <p className="mt-3 text-xs text-slate-400">{b.observacao}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-marca focus:ring-2 focus:ring-marca/30";

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
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Tag({
  children,
  cor = "slate",
}: {
  children: React.ReactNode;
  cor?: "slate" | "emerald" | "amber" | "teal";
}) {
  const cores: Record<string, string> = {
    slate: "bg-slate-100 text-slate-500",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    teal: "bg-teal-50 text-marca-dark",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${cores[cor]}`}>
      {children}
    </span>
  );
}
