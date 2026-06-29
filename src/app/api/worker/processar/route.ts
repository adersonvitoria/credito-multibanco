import { NextResponse } from "next/server";
import { processarProposta } from "@/lib/processarProposta";

// Endpoint do WORKER dedicado (Railway, MODO_CONSULTA=rpa). Recebe um propostaId,
// roda a consulta nos bancos (RPA/Playwright) e grava o resultado no banco.
// Protegido por um segredo compartilhado (WORKER_SECRET) — só o app principal
// (Vercel) chama isto.

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const secret = process.env.WORKER_SECRET;
  if (!secret) {
    return NextResponse.json({ erro: "Worker não configurado." }, { status: 503 });
  }
  if (req.headers.get("x-worker-secret") !== secret) {
    return NextResponse.json({ erro: "Não autorizado." }, { status: 401 });
  }

  let propostaId: string | undefined;
  try {
    propostaId = (await req.json())?.propostaId;
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }
  if (!propostaId) {
    return NextResponse.json({ erro: "propostaId obrigatório." }, { status: 400 });
  }

  try {
    await processarProposta(propostaId);
    return NextResponse.json({ ok: true, propostaId });
  } catch (erro) {
    console.error("[worker] falha ao processar proposta:", erro);
    return NextResponse.json(
      { erro: "Falha no processamento.", detalhe: String(erro) },
      { status: 500 }
    );
  }
}
