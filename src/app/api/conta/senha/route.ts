import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";

export const runtime = "nodejs";

// POST /api/conta/senha — troca a senha do usuário logado.
export async function POST(req: Request) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  let body: { senhaAtual?: string; novaSenha?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const { senhaAtual = "", novaSenha = "" } = body;
  if (novaSenha.length < 6)
    return NextResponse.json({ erro: "A nova senha deve ter ao menos 6 caracteres." }, { status: 400 });

  const usuario = await prisma.usuario.findUnique({ where: { id: sessao.id } });
  if (!usuario || !(await bcrypt.compare(senhaAtual, usuario.senhaHash))) {
    return NextResponse.json({ erro: "Senha atual incorreta." }, { status: 400 });
  }

  await prisma.usuario.update({
    where: { id: sessao.id },
    data: { senhaHash: await bcrypt.hash(novaSenha, 10) },
  });

  return NextResponse.json({ ok: true });
}
