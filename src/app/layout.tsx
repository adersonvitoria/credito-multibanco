import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crédito Multibanco — Análise de Propostas com IA",
  description:
    "Dispare a análise de crédito do cliente para todos os bancos e receba as melhores opções com inteligência artificial.",
};

// Aplica o tema antes da pintura, evitando flash (FOUC).
const themeScript = `try{var t=localStorage.getItem('tema');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
