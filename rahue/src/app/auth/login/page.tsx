"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const [googleLoading, setGoogleLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  async function handleGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-end pr-16 bg-cover bg-center"
      style={{ backgroundImage: "url('/login-bg.jpeg')" }}
    >
      {/* Overlay oscuro sutil a la izquierda, transparente a la derecha */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none" />

      {/* Card de login */}
      <div className="relative z-10 w-full max-w-sm bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl p-10">
        {/* Logo / título */}
        <div className="mb-8">
          <p className="text-white/60 text-sm font-medium tracking-widest uppercase mb-1">
            Sistema de Gestión
          </p>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Rahue
          </h1>
          <p className="text-white/50 text-sm mt-2">
            Inicia sesión para continuar
          </p>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-200 bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3">
            Error al iniciar sesión. Intenta nuevamente.
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {googleLoading ? "Redirigiendo..." : "Continuar con Google"}
        </button>

        <p className="mt-6 text-center text-xs text-white/30">
          Solo usuarios autorizados pueden acceder.
        </p>
      </div>
    </div>
  );
}
