import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "credito_session";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não configurado no .env");
  }
  return new TextEncoder().encode(secret);
}

export interface SessaoUsuario {
  id: string;
  nome: string;
  email: string;
  lojaNome: string;
}

export async function criarSessao(payload: SessaoUsuario): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function definirCookieSessao(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function limparCookieSessao() {
  cookies().delete(COOKIE_NAME);
}

/** Lê e valida a sessão atual a partir do cookie. Retorna null se não autenticado. */
export async function obterSessao(): Promise<SessaoUsuario | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: payload.id as string,
      nome: payload.nome as string,
      email: payload.email as string,
      lojaNome: payload.lojaNome as string,
    };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
