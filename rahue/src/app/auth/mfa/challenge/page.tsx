"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function MfaChallengePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError || !factors?.totp?.length) {
      setError("No se encontró un factor MFA. Intenta iniciar sesión de nuevo.");
      setLoading(false);
      return;
    }

    const factorId = factors.totp[0].id;

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError) {
      setError(challengeError.message);
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      setError("Código incorrecto. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/login-bg.jpeg')" }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl p-10">
        {/* Logo */}
        <div className="mb-8">
          <img
            src="/logo-completo.svg"
            alt="Rahue"
            className="h-10 mb-3"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <p className="text-white/50 text-sm font-medium tracking-widest uppercase">
            Sistema de Gestión
          </p>
        </div>

        {/* Lock icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-indigo-500/20 backdrop-blur-sm border border-indigo-400/30 rounded-2xl mb-5 mx-auto">
          <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-white text-center mb-1">
          Verificación en dos pasos
        </h1>
        <p className="text-sm text-white/50 text-center mb-6">
          Ingresa el código de tu app de autenticación
        </p>

        {error && (
          <div className="mb-4 text-sm text-red-200 bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Visual code display */}
          <div
            className="flex justify-center gap-2 cursor-text"
            onClick={() => document.getElementById("mfa-code-input")?.focus()}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`w-11 h-14 flex items-center justify-center rounded-xl border text-2xl font-mono transition-all duration-200 ${
                  code[i]
                    ? "bg-white/15 border-white/40 text-white"
                    : i === code.length
                      ? "bg-white/10 border-white/30 text-white/30 animate-pulse"
                      : "bg-white/5 border-white/10 text-white/20"
                }`}
              >
                {code[i] || ""}
              </div>
            ))}
          </div>
          <input
            id="mfa-code-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            autoFocus
            required
            className="sr-only"
            aria-label="Código de verificación"
          />

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full py-3 px-4 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white disabled:hover:scale-100 text-gray-700 text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                Verificando...
              </span>
            ) : (
              "Verificar"
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-center text-xs text-white/30">
            Solo usuarios autorizados pueden acceder.
          </p>
        </div>
      </div>
    </div>
  );
}
