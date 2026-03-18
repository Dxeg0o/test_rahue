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

  const u = await db.query.usuario.findFirst({
    where: eq(usuario.supabaseId, user.id),
    columns: { rol: true },
  });

  return NextResponse.json({ rol: u?.rol ?? null });
}
