import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BANCOS } from "../src/lib/bancos";
import { getPortal } from "../src/lib/bancos/catalogo";
import { criptografar } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  const email = "loja@demo.com";
  const senha = "demo1234";
  const senhaHash = await bcrypt.hash(senha, 10);

  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: {
      nome: "Gerente Demo",
      email,
      senhaHash,
      lojaNome: "Auto Center Demo",
    },
  });

  // Convênios: a loja demo é conveniada com todos os bancos.
  for (const banco of BANCOS) {
    await prisma.convenio.upsert({
      where: { usuarioId_bancoNome: { usuarioId: usuario.id, bancoNome: banco.nome } },
      update: { ativo: true },
      create: { usuarioId: usuario.id, bancoNome: banco.nome, ativo: true },
    });
  }

  // Credenciais de demonstração (senha criptografada) para os bancos usados no
  // demo de RPA — assim a consulta usa as credenciais cadastradas.
  const credsDemo = ["Banco Pan", "Omni Financeira"];
  for (const bancoNome of credsDemo) {
    await prisma.credencial.upsert({
      where: { usuarioId_bancoNome: { usuarioId: usuario.id, bancoNome } },
      update: {},
      create: {
        usuarioId: usuario.id,
        bancoNome,
        portalUrl: getPortal(bancoNome)?.portalUrl ?? null,
        login: "loja_demo",
        senhaCriptografada: criptografar("senha-demo"),
        ativo: true,
      },
    });
  }

  console.log("✓ Usuário de demonstração pronto:");
  console.log(`  email: ${email}`);
  console.log(`  senha: ${senha}`);
  console.log(`✓ ${BANCOS.length} convênios ativos criados.`);
  console.log(`✓ ${credsDemo.length} credenciais de demonstração criadas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
