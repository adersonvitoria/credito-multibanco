"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";

interface ItemNav {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const ITENS: ItemNav[] = [
  { href: "/dashboard", label: "Dashboard", icon: <IconHome /> },
  { href: "/credenciais", label: "Bancos & credenciais", icon: <IconBank /> },
  { href: "/usuarios", label: "Cadastro de usuários", icon: <IconUsers /> },
  { href: "/configuracoes", label: "Configurações", icon: <IconGear /> },
];

export function Sidebar({ nome, lojaNome }: { nome: string; lojaNome: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-marca text-sm font-bold text-white">
          ₵
        </span>
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          Crédito Multibanco
        </span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {ITENS.map((item) => {
          const ativo =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                ativo
                  ? "bg-marca/10 text-marca-dark dark:bg-marca/20 dark:text-marca-light"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Rodapé: tema, loja e sair */}
      <div className="space-y-1 border-t border-slate-200 px-3 py-3 dark:border-slate-800">
        <ThemeToggle />
        <div className="px-3 py-2">
          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
            {lojaNome}
          </p>
          <p className="truncate text-xs text-slate-400">{nome}</p>
        </div>
        <button
          onClick={sair}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span className="flex h-5 w-5 items-center justify-center">
            <IconLogout />
          </span>
          Sair
        </button>
      </div>
    </aside>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconBank() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M12 3l9 5H3l9-5zM4 21h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM22 19v-1a4 4 0 0 0-3-3.87M16 4.13A4 4 0 0 1 16 11.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
