// Criptografia das senhas de portal dos bancos (AES-256-GCM).
//
// As senhas de convênio NUNCA são guardadas em texto puro nem retornadas pela
// API. Aqui usamos AES-256-GCM com uma chave derivada de CREDENTIALS_KEY (ou,
// em último caso, do JWT_SECRET). Em produção, use um KMS / secret manager e uma
// CREDENTIALS_KEY dedicada e rotacionável.

import crypto from "crypto";

const ALGORITMO = "aes-256-gcm";

function obterChave(): Buffer {
  const segredo = process.env.CREDENTIALS_KEY || process.env.JWT_SECRET;
  if (!segredo) throw new Error("CREDENTIALS_KEY/JWT_SECRET não configurado");
  // Deriva uma chave de 32 bytes de forma determinística.
  return crypto.scryptSync(segredo, "credito-multibanco::credenciais", 32);
}

// Retorna "iv:tag:ciphertext" (cada parte em base64).
export function criptografar(texto: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITMO, obterChave(), iv);
  const enc = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function descriptografar(payload: string): string {
  const [ivB, tagB, dataB] = payload.split(":");
  if (!ivB || !tagB || !dataB) throw new Error("Credencial em formato inválido");
  const decipher = crypto.createDecipheriv(ALGORITMO, obterChave(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(dataB, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}
