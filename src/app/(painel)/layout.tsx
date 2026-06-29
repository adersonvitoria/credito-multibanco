import Link from "next/link";
import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth";
import { BotaoSair } from "@/components/BotaoSair";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-marca text-sm font-bold text-white">
              ₵
            </span>
            <span className="font-semibold text-slate-900">
              Crédito Multibanco
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/credenciais"
              className="hidden text-sm font-medium text-slate-600 hover:text-marca-dark sm:block"
            >
              Bancos &amp; credenciais
            </Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-700">
                {sessao.lojaNome}
              </p>
              <p className="text-xs text-slate-400">{sessao.nome}</p>
            </div>
            <BotaoSair />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
