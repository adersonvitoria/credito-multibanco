"use client";

import { useEffect, useState } from "react";

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const [dark, setDark] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMontado(true);
  }, []);

  function alternar() {
    const novo = !dark;
    setDark(novo);
    document.documentElement.classList.toggle("dark", novo);
    try {
      localStorage.setItem("tema", novo ? "dark" : "light");
    } catch {
      // ignora se localStorage indisponível
    }
  }

  // Evita mismatch de hidratação: só mostra o ícone após montar.
  const label = dark ? "Modo claro" : "Modo escuro";

  return (
    <button
      onClick={alternar}
      title={label}
      aria-label={label}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <span className="flex h-5 w-5 items-center justify-center">
        {montado && dark ? <IconSol /> : <IconLua />}
      </span>
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

function IconLua() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSol() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"
        strokeLinecap="round"
      />
    </svg>
  );
}
