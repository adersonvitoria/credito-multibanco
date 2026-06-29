import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";

export const runtime = "nodejs";

// GET /api/usuarios — usuários da mesma loja.
export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const usuarios = await prisma.usuario.findMany({
    where: { lojaNome: sessao.lojaNome },
    orderBy: { createdAt: "asc" },
    select: { id: true, nome: true, email: true, createdAt: true },
  });

  return NextResponse.json({ usuarios, atual: sessao.id });
}

// POST /api/usuarios — cadastra um novo usuário na mesma loja.
export async function POST(req: Request) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  let body: { nome?: string; email?: string; senha?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const nome = (body.nome ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const senha = body.senha ?? "";

  if (!nome) return NextResponse.json({ erro: "Informe o nome." }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return NextResponse.json({ erro: "E-mail inválido." }, { status: 400 });
  if (senha.length < 6)
    return NextResponse.json({ erro: "A senha deve ter ao menos 6 caracteres." }, { status: 400 });

  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) return NextResponse.json({ erro: "Já existe um usuário com esse e-mail." }, { status: 409 });

  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senhaHash: await bcrypt.hash(senha, 10),
      lojaNome: sessao.lojaNome,
    },
    select: { id: true, nome: true, email: true, createdAt: true },
  });

  return NextResponse.json({ usuario }, { status: 201 });
}
