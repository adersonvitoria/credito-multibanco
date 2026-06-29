import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { simular } from "@/lib/simulacao";
import { consultarScore } from "@/lib/bureau";
import { BANCOS } from "@/lib/bancos";
import type { DadosSimulacao } from "@/types";

// GET /api/simulacoes — lista as simulações da loja.
export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const simulacoes = await prisma.simulacao.findMany({
    where: { usuarioId: sessao.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ simulacoes });
}

// POST /api/simulacoes — cria uma simulação rápida (estimativa, sem birô).
export async function POST(req: Request) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  let dados: DadosSimulacao;
  try {
    dados = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  const erro = validar(dados);
  if (erro) return NextResponse.json({ erro }, { status: 400 });

  // Score consultado no birô (o lojista não informa).
  const consulta = consultarScore(dados.clienteCpf, new Date(dados.clienteNascimento));

  // Bancos conveniados da loja (consulta todos).
  const convenios = await prisma.convenio.findMany({
    where: { usuarioId: sessao.id, ativo: true },
  });
  const nomes = new Set(convenios.map((c) => c.bancoNome));
  const conveniados = BANCOS.filter((b) => nomes.has(b.nome));

  const resultado = simular(dados.veiculoValor, consulta.score, {
    bancos: conveniados.length ? conveniados : BANCOS,
  });

  const sim = await prisma.simulacao.create({
    data: {
      usuarioId: sessao.id,
      clienteNome: dados.clienteNome.trim(),
      clienteCpf: dados.clienteCpf.trim(),
      clienteNascimento: new Date(dados.clienteNascimento),
      veiculoDescricao: dados.veiculoDescricao.trim(),
      veiculoPlaca: dados.veiculoPlaca.trim().toUpperCase(),
      veiculoAno: dados.veiculoAno,
      veiculoValor: dados.veiculoValor,
      resultadoJson: JSON.stringify(resultado),
    },
  });

  return NextResponse.json({ id: sim.id }, { status: 201 });
}

// Aceita placa antiga (ABC1234) e Mercosul (ABC1D23).
const PLACA_RE = /^[A-Za-z]{3}[0-9][0-9A-Za-z][0-9]{2}$/;

function validar(d: DadosSimulacao): string | null {
  if (!d.clienteNome?.trim()) return "Nome é obrigatório.";
  if (!d.clienteCpf?.trim()) return "CPF é obrigatório.";
  if (!d.clienteNascimento || isNaN(Date.parse(d.clienteNascimento)))
    return "Data de nascimento inválida.";
  if (!d.veiculoDescricao?.trim()) return "Descrição do carro é obrigatória.";
  if (!d.veiculoPlaca?.trim()) return "Placa é obrigatória.";
  if (!PLACA_RE.test(d.veiculoPlaca.replace(/[-\s]/g, "")))
    return "Placa inválida (use o formato ABC1234 ou ABC1D23).";
  if (!(d.veiculoAno > 1980)) return "Ano do veículo inválido.";
  if (!(d.veiculoValor > 0)) return "Valor do veículo deve ser maior que zero.";
  return null;
}
