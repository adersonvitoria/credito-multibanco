import { redirect } from "next/navigation";
import { obterSessao } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await obterSessao();
  if (!sessao) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar nome={sessao.nome} lojaNome={sessao.lojaNome} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
