import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { BANCOS } from "@/lib/bancos";
import { getPortal } from "@/lib/bancos/catalogo";
import { criptografar } from "@/lib/crypto";

export const runtime = "nodejs";

// GET /api/credenciais — mapeamento de todos os bancos com convênio, portal e
// status de credencial (a senha NUNCA é retornada, só se está definida).
export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const [convenios, credenciais] = await Promise.all([
    prisma.convenio.findMany({ where: { usuarioId: sessao.id } }),
    prisma.credencial.findMany({ where: { usuarioId: sessao.id } }),
  ]);
  const convPorNome = new Map(convenios.map((c) => [c.bancoNome, c]));
  const credPorNome = new Map(credenciais.map((c) => [c.bancoNome, c]));

  const bancos = BANCOS.map((b) => {
    const portal = getPortal(b.nome);
    const cred = credPorNome.get(b.nome);
    return {
      bancoNome: b.nome,
      modo: b.modo,
      tipoIntegracao: portal?.tipoIntegracao ?? b.tipoIntegracao,
      site: portal?.site ?? "",
      portalUrlPadrao: portal?.portalUrl ?? "",
      observacao: portal?.observacao ?? "",
      conveniado: convPorNome.get(b.nome)?.ativo ?? false,
      credencial: cred
        ? {
            portalUrl: cred.portalUrl ?? "",
            login: cred.login,
            senhaDefinida: !!cred.senhaCriptografada,
            ativo: cred.ativo,
          }
        : null,
    };
  });

  return NextResponse.json({ bancos });
}

// POST /api/credenciais — cria/atualiza a credencial de um banco.
export async function POST(req: Request) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  let body: {
    bancoNome?: string;
    login?: string;
    senha?: string;
    portalUrl?: string;
    ativo?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const bancoNome = (body.bancoNome ?? "").trim();
  if (!BANCOS.some((b) => b.nome === bancoNome))
    return NextResponse.json({ erro: "Banco desconhecido." }, { status: 400 });
  if (!body.login?.trim())
    return NextResponse.json({ erro: "Informe o usuário/login do portal." }, { status: 400 });

  const existente = await prisma.credencial.findUnique({
    where: { usuarioId_bancoNome: { usuarioId: sessao.id, bancoNome } },
  });

  // Senha: obrigatória ao criar; opcional ao atualizar (mantém a atual se vazia).
  let senhaCriptografada = existente?.senhaCriptografada;
  if (body.senha && body.senha.length > 0) {
    senhaCriptografada = criptografar(body.senha);
  }
  if (!senhaCriptografada) {
    return NextResponse.json({ erro: "Informe a senha do portal." }, { status: 400 });
  }

  const dados = {
    login: body.login.trim(),
    portalUrl: body.portalUrl?.trim() || null,
    senhaCriptografada,
    ativo: body.ativo ?? true,
  };

  await prisma.credencial.upsert({
    where: { usuarioId_bancoNome: { usuarioId: sessao.id, bancoNome } },
    update: dados,
    create: { usuarioId: sessao.id, bancoNome, ...dados },
  });

  return NextResponse.json({ ok: true });
}
