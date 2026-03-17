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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              maxAge: 60 * 60 * 24 * 7, // 7 días
            })
          );
        },
      },
    }
  );

  // Refresca la sesión si expiró — IMPORTANTE: no agregar lógica entre createServerClient y getUser
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rutas públicas que no requieren autenticación
  const publicPaths = ["/auth/login", "/auth/signup", "/auth/callback"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const isMfaPath = pathname.startsWith("/auth/mfa");

  // Si no está autenticado y accede a ruta protegida → redirigir a login
  if (!user && !isPublicPath && !isMfaPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Si está autenticado y accede a login/signup → redirigir al dashboard
  if (user && isPublicPath && pathname !== "/auth/callback") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Si está autenticado, verificar nivel de autenticación MFA
  if (user && !isPublicPath && !isMfaPath) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal) {
      // Tiene MFA enrollado pero no completó el challenge → forzar challenge
      if (aal.nextLevel === "aal2" && aal.nextLevel !== aal.currentLevel) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/mfa/challenge";
        return NextResponse.redirect(url);
      }

      // No tiene MFA enrollado → verificar si es admin y forzar enroll
      if (aal.currentLevel === "aal1" && aal.nextLevel === "aal1") {
        const { data: usuario } = await supabase
          .from("usuario")
          .select("rol")
          .eq("supabase_id", user.id)
          .single();

        if (usuario?.rol === "admin") {
          const url = request.nextUrl.clone();
          url.pathname = "/auth/mfa/enroll";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
