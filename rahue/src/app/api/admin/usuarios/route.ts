import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { usuario } from "@/db/schema";
import { eq } from "drizzle-orm";

// Verifica que el usuario autenticado sea admin
async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const u = await db.query.usuario.findFirst({
    where: eq(usuario.supabaseId, user.id),
    columns: { rol: true },
  });

  return u?.rol === "admin";
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const usuarios = await db.query.usuario.findMany({
    columns: {
      id: true,
      nombre: true,
      email: true,
      rut: true,
      rol: true,
      activo: true,
      createdAt: true,
    },
    orderBy: (u, { asc }) => [asc(u.nombre)],
  });

  return NextResponse.json(usuarios);
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id, rol, activo } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const updates: Partial<typeof usuario.$inferInsert> = {};
  if (rol !== undefined) updates.rol = rol;
  if (activo !== undefined) updates.activo = activo;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  }

  await db.update(usuario).set(updates).where(eq(usuario.id, id));

  return NextResponse.json({ ok: true });
}
