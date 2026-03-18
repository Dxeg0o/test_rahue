"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { usuario } from "@/db/schema";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const nombre = formData.get("nombre") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  // Crear registro en tabla usuario con rol operador por defecto
  if (data.user) {
    await db.insert(usuario).values({
      supabaseId: data.user.id,
      nombre: nombre || email,
      email,
      rol: "operador",
    });
  }

  redirect("/auth/login?message=Revisa tu email para confirmar tu cuenta");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
