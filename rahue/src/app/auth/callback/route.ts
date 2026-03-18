import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { usuario } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const user = data.user;

      // Crear registro de usuario si no existe aún (primer login con OAuth)
      const existing = await db.query.usuario.findFirst({
        where: eq(usuario.supabaseId, user.id),
        columns: { id: true },
      });

      if (!existing) {
        const nombre =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "Sin nombre";

        await db.insert(usuario).values({
          supabaseId: user.id,
          nombre,
          email: user.email,
          rol: "operador",
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_error`);
}
