import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { criarSessao, definirCookieSessao } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, senha } = await req.json();

    if (!email || !senha) {
      return NextResponse.json(
        { erro: "Informe e-mail e senha." },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });

    if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
      return NextResponse.json(
        { erro: "E-mail ou senha inválidos." },
        { status: 401 }
      );
    }

    const token = await criarSessao({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      lojaNome: usuario.lojaNome,
    });
    await definirCookieSessao(token);

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("[auth/login]", erro);
    return NextResponse.json({ erro: "Erro ao processar login." }, { status: 500 });
  }
}
