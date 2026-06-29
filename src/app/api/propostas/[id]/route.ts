import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";

// GET /api/propostas/:id — retorna uma proposta com respostas e análise.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const sessao = await obterSessao();
  if (!sessao) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const proposta = await prisma.proposta.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
    include: { respostas: true, analise: true },
  });

  if (!proposta) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ proposta });
}
