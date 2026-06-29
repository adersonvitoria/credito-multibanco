import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";

// GET /api/simulacoes/:id — retorna uma simulação.
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const simulacao = await prisma.simulacao.findFirst({
    where: { id: params.id, usuarioId: sessao.id },
  });
  if (!simulacao)
    return NextResponse.json({ erro: "Simulação não encontrada." }, { status: 404 });

  return NextResponse.json({ simulacao });
}
