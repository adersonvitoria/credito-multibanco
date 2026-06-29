// Processamento de uma proposta: consulta os bancos conveniados (via conectores
// — simulado ou RPA conforme MODO_CONSULTA do ambiente), persiste as respostas e
// gera a análise da IA. É chamado:
//   - inline na rota /api/propostas (quando não há worker), ou
//   - pelo worker dedicado /api/worker/processar (Railway, MODO_CONSULTA=rpa).
//
// O score já foi consultado e gravado na proposta no momento da criação.

import { prisma } from "@/lib/prisma";
import { BANCOS } from "@/lib/bancos";
import { getPortal } from "@/lib/bancos/catalogo";
import { consultarBancos } from "@/lib/dispatch";
import { analisarPropostas } from "@/lib/ai";
import { descriptografar } from "@/lib/crypto";
import type { DadosConsulta, CredenciaisBanco } from "@/lib/connectors/types";

export async function processarProposta(propostaId: string): Promise<void> {
  const proposta = await prisma.proposta.findUnique({ where: { id: propostaId } });
  if (!proposta) throw new Error(`Proposta não encontrada: ${propostaId}`);

  try {
    // Bancos conveniados e ativos da loja.
    const convenios = await prisma.convenio.findMany({
      where: { usuarioId: proposta.usuarioId, ativo: true },
    });
    const nomes = new Set(convenios.map((c) => c.bancoNome));
    const conveniados = BANCOS.filter((b) => nomes.has(b.nome));
    if (conveniados.length === 0) throw new Error("Loja sem convênio ativo.");

    // Credenciais cadastradas (senha descriptografada em memória).
    const credRows = await prisma.credencial.findMany({
      where: { usuarioId: proposta.usuarioId, ativo: true },
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
        // credencial corrompida/chave trocada — ignora (cai p/ demo/simulado)
      }
    }

    const dadosConsulta: DadosConsulta = {
      clienteNome: proposta.clienteNome,
      clienteCpf: proposta.clienteCpf,
      clienteProfissao: proposta.clienteProfissao,
      clienteCidade: proposta.clienteCidade,
      clienteUf: proposta.clienteUf,
      clienteNascimento: proposta.clienteNascimento,
      clienteRenda: proposta.clienteRenda,
      clienteScore: proposta.clienteScore,
      veiculoDescricao: proposta.veiculoDescricao,
      veiculoAno: proposta.veiculoAno,
      veiculoValor: proposta.veiculoValor,
      valorEntrada: proposta.valorEntrada,
      prazoMeses: proposta.prazoMeses,
    };

    // Idempotência: limpa resultados anteriores (reprocessamento seguro).
    await prisma.respostaBanco.deleteMany({ where: { propostaId } });
    await prisma.analiseIA.deleteMany({ where: { propostaId } });

    const { resultados, consultasRealizadas } = await consultarBancos(
      dadosConsulta,
      conveniados,
      credenciais
    );

    await prisma.respostaBanco.createMany({
      data: resultados.map((r) => ({
        propostaId,
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
        clienteNascimento: proposta.clienteNascimento,
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
        propostaId,
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
      where: { id: propostaId },
      data: { status: "CONCLUIDA" },
    });
  } catch (erro) {
    await prisma.proposta.update({
      where: { id: propostaId },
      data: { status: "ERRO" },
    });
    throw erro;
  }
}
