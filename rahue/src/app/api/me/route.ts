import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { usuario } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ rol: null }, { status: 401 });
  }

  let u = await db.query.usuario.findFirst({
    where: eq(usuario.supabaseId, user.id),
    columns: { id: true, nombre: true, email: true, rut: true, rol: true },
  });

  // Auto-provisioning: si el usuario existe en Supabase Auth pero no en la
  // tabla usuario (ej. admin invitado sin pasar por signup), lo creamos aquí.
  if (!u) {
    const nombre =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "Sin nombre";

    const [inserted] = await db
      .insert(usuario)
      .values({
        supabaseId: user.id,
        nombre,
        email: user.email,
        rol: "operador",
      })
      .returning({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rut: usuario.rut, rol: usuario.rol });

    u = inserted;
  }

  return NextResponse.json({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rut: u.rut ?? null,
    rol: u.rol,
  });
}
