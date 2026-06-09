import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresca o token de acesso silenciosamente (mantém a sessão válida)
  // IMPORTANTE: não chamar nada entre createServerClient e getUser que leia cookies
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Roteamento por tipo de conta
  const tipo     = user?.user_metadata?.tipo as string | undefined;
  const mbDevice = request.cookies.get("vellox_mb_device")?.value;
  const isMotoboy = (user && tipo === "motoboy") || (!user && mbDevice === "1");

  if (isMotoboy && !pathname.startsWith("/motoboy") && !pathname.startsWith("/api")) {
    const url = request.nextUrl.clone();
    url.pathname = "/motoboy";
    return NextResponse.redirect(url);
  }

  // Rotas protegidas sem sessão → redireciona para login
  const protectedPrefixes = [
    "/dashboard", "/motoboys", "/pedidos", "/configuracoes",
    "/mapa", "/monitor", "/financeiro", "/catalogo",
  ];
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Guard KTL: bloqueia rotas não permitidas para o plano KTL
  const KTL_ALLOWED = ["/pedidos", "/financeiro", "/catalogo"];
  const KTL_BLOCKED = ["/dashboard", "/mapa", "/monitor", "/auditoria", "/lojas"];
  if (user && tipo === "empresa" && KTL_BLOCKED.some((p) => pathname.startsWith(p))) {
    const { data: emp } = await supabase
      .from("empresas")
      .select("plano")
      .eq("id", user.id)
      .single();
    if (emp?.plano === "ktl") {
      const url = request.nextUrl.clone();
      url.pathname = "/pedidos";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Exclui arquivos estáticos, imagens, e rotas Next.js internas
    "/((?!_next/static|_next/image|favicon.ico|icon.*|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
