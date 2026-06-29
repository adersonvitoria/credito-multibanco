import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { BANCOS } from "@/lib/bancos";
import { consultarBancos } from "@/lib/dispatch";
import { consultarScore } from "@/lib/bureau";
import { analisarPropostas } from "@/lib/ai";
import { descriptografar } from "@/lib/crypto";
import { getPortal } from "@/lib/bancos/catalogo";
import type { DadosConsulta, CredenciaisBanco } from "@/lib/connectors/types";
import type { DadosProposta } from "@/types";

// Garante runtime Node (Playwright/RPA não roda no Edge).
export const runtime = "nodejs";

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

// POST /api/propostas — consulta o score (birô, uma vez), envia a TODOS os
// bancos conveniados, persiste as respostas e gera a análise com IA.
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

  // Bancos conveniados e ativos para esta loja.
  const convenios = await prisma.convenio.findMany({
    where: { usuarioId: sessao.id, ativo: true },
  });
  const nomesConveniados = new Set(convenios.map((c) => c.bancoNome));
  const conveniados = BANCOS.filter((b) => nomesConveniados.has(b.nome));

  if (conveniados.length === 0) {
    return NextResponse.json(
      { erro: "A loja não possui convênio ativo com nenhum banco." },
      { status: 400 }
    );
  }

  // Credenciais cadastradas dos portais (senha descriptografada em memória).
  const credRows = await prisma.credencial.findMany({
    where: { usuarioId: sessao.id, ativo: true },
  });
  const credenciais: Record<string, CredenciaisBanco> = {};
  for (const c of credRows) {
    try {
      credenciais[c.bancoNome] = {
        usuario: c.login,
        senha: descriptografar(c.senhaCriptografada),
        portalUrl: c.portalUrl || getPortal(c.bancoNome)?.portalUrl,
      };
    } catch {
      // Credencial corrompida/chave trocada — ignora (banco cai p/ simulado/demo).
    }
  }

  // Consulta o score no birô UMA vez (o lojista não informa o score).
  const consulta = consultarScore(dados.clienteCpf, nascimento);

  const proposta = await prisma.proposta.create({
    data: {
      usuarioId: sessao.id,
      status: "PROCESSANDO",
      clienteNome: dados.clienteNome.trim(),
      clienteCpf: dados.clienteCpf.trim(),
      clienteNascimento: nascimento,
      clienteRenda: dados.clienteRenda,
      clienteScore: consulta.score, // score consultado no birô
      clienteProfissao: dados.clienteProfissao.trim(),
      clienteCidade: dados.clienteCidade.trim(),
      clienteUf: dados.clienteUf.trim().toUpperCase(),
      veiculoDescricao: dados.veiculoDescricao.trim(),
      veiculoAno: dados.veiculoAno,
      veiculoValor: dados.veiculoValor,
      valorEntrada: dados.valorEntrada,
      prazoMeses: dados.prazoMeses,
      maxBancosCascata: conveniados.length, // consulta todos
      consentimentoLGPD: true,
      consentimentoEm: new Date(),
    },
  });

  try {
    const dadosConsulta: DadosConsulta = {
      clienteNome: proposta.clienteNome,
      clienteCpf: proposta.clienteCpf,
      clienteProfissao: proposta.clienteProfissao,
      clienteCidade: proposta.clienteCidade,
      clienteUf: proposta.clienteUf,
      clienteNascimento: nascimento,
      clienteRenda: proposta.clienteRenda,
      clienteScore: proposta.clienteScore,
      veiculoDescricao: proposta.veiculoDescricao,
      veiculoAno: proposta.veiculoAno,
      veiculoValor: proposta.veiculoValor,
      valorEntrada: proposta.valorEntrada,
      prazoMeses: proposta.prazoMeses,
    };

    // Consulta TODOS os bancos conveniados (usando as credenciais cadastradas).
    const { resultados, consultasRealizadas } = await consultarBancos(
      dadosConsulta,
      conveniados,
      credenciais
    );

    await prisma.respostaBanco.createMany({
      data: resultados.map((r) => ({
        propostaId: proposta.id,
        bancoNome: r.bancoNome,
        status: r.status,
        probabilidadeAprovacao: r.probabilidadeAprovacao,
        consultaHardRealizada: r.consultaHardRealizada,
        ordemCascata: r.ordemCascata,
        previsaoRespostaMin: r.previsaoRespostaMin,
        modoIntegracao: r.modoIntegracao,
        taxaJurosMes: r.taxaJurosMes,
        valorFinanciado: r.valorFinanciado,
        valorParcela: r.valorParcela,
        prazoMeses: r.prazoMeses,
        valorTotal: r.valorTotal,
        cet: r.cet,
        retornoLojista: r.retornoLojista,
        observacao: r.observacao,
        tempoRespostaMs: r.tempoRespostaMs,
      })),
    });

    const analise = await analisarPropostas(
      {
        clienteNome: proposta.clienteNome,
        clienteNascimento: nascimento,
        clienteRenda: proposta.clienteRenda,
        clienteScore: proposta.clienteScore,
        clienteProfissao: proposta.clienteProfissao,
        veiculoDescricao: proposta.veiculoDescricao,
        veiculoAno: proposta.veiculoAno,
        veiculoValor: proposta.veiculoValor,
        valorEntrada: proposta.valorEntrada,
        prazoMeses: proposta.prazoMeses,
      },
      resultados,
      { totalConveniados: conveniados.length, consultasRealizadas }
    );

    await prisma.analiseIA.create({
      data: {
        propostaId: proposta.id,
        resumoExecutivo: analise.resumoExecutivo,
        estrategiaRecomendada: analise.estrategiaRecomendada,
        melhorBanco: analise.melhorBanco,
        chanceAprovacao: analise.chanceAprovacao,
        analisePerfil: analise.analisePerfil,
        rankingJson: JSON.stringify(analise.ranking),
        ajustesJson: JSON.stringify(analise.ajustes),
        geradoPorIA: analise.geradoPorIA,
      },
    });

    await prisma.proposta.update({
      where: { id: proposta.id },
      data: { status: "CONCLUIDA" },
    });

    return NextResponse.json({ id: proposta.id }, { status: 201 });
  } catch (erro) {
    console.error("[propostas] falha no processamento:", erro);
    await prisma.proposta.update({
      where: { id: proposta.id },
      data: { status: "ERRO" },
    });
    return NextResponse.json(
      { erro: "Falha ao processar a proposta.", id: proposta.id },
      { status: 500 }
    );
  }
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
