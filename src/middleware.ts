import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "credito_session";

// Protege as rotas do painel: sem sessão válida → redireciona para /login.
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const url = req.nextUrl.clone();

  let autenticado = false;
  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token, secret);
      autenticado = true;
    } catch {
      autenticado = false;
    }
  }

  if (!autenticado) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Aplica o middleware apenas às rotas do painel.
  matcher: [
    "/dashboard/:path*",
    "/propostas/:path*",
    "/simulacoes/:path*",
    "/credenciais/:path*",
  ],
};
