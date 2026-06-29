import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { BANCOS } from "@/lib/bancos";
import { consultarScore } from "@/lib/bureau";
import { processarProposta } from "@/lib/processarProposta";
import type { DadosProposta } from "@/types";

// Runtime Node. maxDuration alto porque, com worker, aguardamos a consulta RPA.
export const runtime = "nodejs";
export const maxDuration = 120;

// GET /api/propostas — lista as propostas da loja autenticada.
export async function GET() {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  const propostas = await prisma.proposta.findMany({
    where: { usuarioId: sessao.id },
    orderBy: { createdAt: "desc" },
    include: { respostas: true, analise: true },
  });

  return NextResponse.json({ propostas });
}

// POST /api/propostas — consulta o score (birô, 1x), cria a proposta e dispara o
// processamento (consulta a todos os bancos): no worker dedicado se WORKER_URL
// estiver configurado (RPA real), senão inline (modo do próprio ambiente).
export async function POST(req: Request) {
  const sessao = await obterSessao();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });

  let dados: DadosProposta;
  try {
    dados = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido." }, { status: 400 });
  }

  if (!dados.consentimentoLGPD) {
    return NextResponse.json(
      { erro: "É necessário o consentimento do cliente (LGPD) para consultar os bancos." },
      { status: 400 }
    );
  }

  const erroValidacao = validar(dados);
  if (erroValidacao) return NextResponse.json({ erro: erroValidacao }, { status: 400 });

  const nascimento = new Date(dados.clienteNascimento);

  // Bancos conveniados (checagem antecipada para erro claro).
  const convenios = await prisma.convenio.findMany({
    where: { usuarioId: sessao.id, ativo: true },
  });
  const conveniados = BANCOS.filter((b) =>
    new Set(convenios.map((c) => c.bancoNome)).has(b.nome)
  );
  if (conveniados.length === 0) {
    return NextResponse.json(
      { erro: "A loja não possui convênio ativo com nenhum banco." },
      { status: 400 }
    );
  }

  // Score consultado no birô UMA vez (o lojista não informa).
  const consulta = consultarScore(dados.clienteCpf, nascimento);

  const proposta = await prisma.proposta.create({
    data: {
      usuarioId: sessao.id,
      status: "PROCESSANDO",
      clienteNome: dados.clienteNome.trim(),
      clienteCpf: dados.clienteCpf.trim(),
      clienteNascimento: nascimento,
      clienteRenda: dados.clienteRenda,
      clienteScore: consulta.score,
      clienteProfissao: dados.clienteProfissao.trim(),
      clienteCidade: dados.clienteCidade.trim(),
      clienteUf: dados.clienteUf.trim().toUpperCase(),
      veiculoDescricao: dados.veiculoDescricao.trim(),
      veiculoAno: dados.veiculoAno,
      veiculoValor: dados.veiculoValor,
      valorEntrada: dados.valorEntrada,
      prazoMeses: dados.prazoMeses,
      maxBancosCascata: conveniados.length,
      consentimentoLGPD: true,
      consentimentoEm: new Date(),
    },
  });

  try {
    await delegarOuProcessar(proposta.id);
    return NextResponse.json({ id: proposta.id }, { status: 201 });
  } catch (erro) {
    console.error("[propostas] worker falhou, tentando inline:", erro);
    // Fallback: processa inline (modo do próprio ambiente) para sempre concluir.
    try {
      await processarProposta(proposta.id);
      return NextResponse.json({ id: proposta.id }, { status: 201 });
    } catch (erro2) {
      console.error("[propostas] falha no processamento inline:", erro2);
      return NextResponse.json(
        { erro: "Falha ao processar a proposta.", id: proposta.id },
        { status: 500 }
      );
    }
  }
}

// Se WORKER_URL+WORKER_SECRET estão configurados, delega a consulta ao worker
// dedicado (Railway, RPA real). Senão, processa no próprio ambiente.
async function delegarOuProcessar(propostaId: string): Promise<void> {
  const workerUrl = process.env.WORKER_URL;
  const secret = process.env.WORKER_SECRET;

  if (workerUrl && secret) {
    const res = await fetch(`${workerUrl.replace(/\/$/, "")}/api/worker/processar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": secret },
      body: JSON.stringify({ propostaId }),
    });
    if (!res.ok) {
      throw new Error(`worker respondeu ${res.status}`);
    }
    return;
  }

  await processarProposta(propostaId);
}

function validar(d: DadosProposta): string | null {
  if (!d.clienteNome?.trim()) return "Nome do cliente é obrigatório.";
  if (!d.clienteCpf?.trim()) return "CPF é obrigatório.";
  if (!d.clienteNascimento || isNaN(Date.parse(d.clienteNascimento)))
    return "Data de nascimento inválida.";
  if (!(d.clienteRenda > 0)) return "Renda deve ser maior que zero.";
  if (!d.veiculoDescricao?.trim()) return "Descrição do veículo é obrigatória.";
  if (!(d.veiculoValor > 0)) return "Valor do veículo deve ser maior que zero.";
  if (!(d.valorEntrada >= 0)) return "Entrada inválida.";
  if (d.valorEntrada >= d.veiculoValor)
    return "A entrada não pode ser maior ou igual ao valor do veículo.";
  if (!(d.prazoMeses > 0 && d.prazoMeses <= 72))
    return "Prazo deve estar entre 1 e 72 meses.";
  if (!(d.veiculoAno > 1980)) return "Ano do veículo inválido.";
  return null;
}
