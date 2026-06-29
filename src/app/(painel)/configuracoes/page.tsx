import { obterSessao } from "@/lib/auth";
import { TrocarSenha } from "@/components/TrocarSenha";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const sessao = await obterSessao();
  if (!sessao) return null;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
        Configurações
      </h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Conta, segurança e aparência.
      </p>

      <div className="space-y-6">
        {/* Perfil */}
        <Card titulo="Perfil">
          <Linha rotulo="Nome" valor={sessao.nome} />
          <Linha rotulo="E-mail" valor={sessao.email} />
          <Linha rotulo="Loja" valor={sessao.lojaNome} />
        </Card>

        {/* Segurança */}
        <Card titulo="Segurança">
          <TrocarSenha />
        </Card>

        {/* Aparência */}
        <Card titulo="Aparência">
          <p className="mb-2 text-sm text-slate-500 dark:text-slate-400">
            Alterne entre o modo claro e o modo escuro.
          </p>
          <div className="w-fit rounded-lg border border-slate-200 dark:border-slate-700">
            <ThemeToggle />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">{titulo}</h2>
      {children}
    </section>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{rotulo}</span>
      <span className="font-medium text-slate-800 dark:text-slate-200">{valor}</span>
    </div>
  );
}
