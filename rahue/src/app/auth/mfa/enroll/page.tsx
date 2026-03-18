"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type EnrollState = "loading" | "qr" | "verify" | "done";

export default function MfaEnrollPage() {
  const [state, setState] = useState<EnrollState>("loading");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    async function startEnroll() {
      const supabase = createClient();

      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp?.length) {
        setState("done");
        return;
      }

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error || !data) {
        setError(error?.message ?? "No se pudo iniciar el enrolamiento.");
        setState("qr");
        return;
      }

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setState("qr");
    }
    startEnroll();
  }, []);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });

    if (error) {
      setError("Código incorrecto. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    setState("done");
    setLoading(false);
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/login-bg.jpeg')" }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent pointer-events-none" />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl p-10">
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

        {state === "loading" && (
          <div className="flex flex-col items-center py-12">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mb-4" />
            <p className="text-sm text-white/60">Generando código QR...</p>
          </div>
        )}

        {state === "done" && (
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 rounded-2xl mb-5 mx-auto">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">MFA activado</h1>
            <p className="text-sm text-white/50 mb-8">
              Tu cuenta ahora requiere verificación en dos pasos al iniciar sesión.
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              Ir al dashboard
            </button>
          </div>
        )}

        {(state === "qr" || state === "verify") && (
          <>
            {state === "qr" ? (
              <>
                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white text-xs font-bold">
                    1
                  </div>
                  <div className="h-px flex-1 bg-white/15" />
                  <div className="flex items-center justify-center w-8 h-8 bg-white/5 border border-white/10 rounded-lg text-white/30 text-xs font-bold">
                    2
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-10 h-10 bg-indigo-500/20 backdrop-blur-sm border border-indigo-400/30 rounded-xl">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white">Escanea el código QR</h1>
                    <p className="text-xs text-white/40">Google Authenticator, Authy u otra app TOTP</p>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 text-sm text-red-200 bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                {qrCode && (
                  <div className="flex justify-center my-6">
                    <div
                      className="bg-white rounded-2xl p-4 shadow-lg"
                      dangerouslySetInnerHTML={{ __html: qrCode }}
                    />
                  </div>
                )}

                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 mb-6">
                  <p className="text-xs text-white/40 mb-1">Clave manual:</p>
                  <p className="text-sm font-mono text-white/80 break-all select-all">{secret}</p>
                </div>

                <button
                  onClick={() => setState("verify")}
                  className="w-full py-3 px-4 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  Ya escaneé el código
                  <svg className="inline-block w-4 h-4 ml-2 -mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            ) : (
              <>
                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center justify-center w-8 h-8 bg-emerald-500/20 border border-emerald-400/30 rounded-lg text-emerald-400 text-xs">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="h-px flex-1 bg-white/15" />
                  <div className="flex items-center justify-center w-8 h-8 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white text-xs font-bold">
                    2
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-10 h-10 bg-indigo-500/20 backdrop-blur-sm border border-indigo-400/30 rounded-xl">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-white">Verificar configuración</h1>
                    <p className="text-xs text-white/40">Ingresa el código de 6 dígitos de tu app</p>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 mb-4 text-sm text-red-200 bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <form onSubmit={handleVerify} className="mt-6 space-y-4">
                  <div className="flex justify-center gap-2 cursor-text" onClick={() => codeInputRef.current?.focus()}>
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
                    ref={codeInputRef}
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
                      "Activar MFA"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setState("qr"); setCode(""); setError(null); }}
                    className="w-full py-2 text-sm text-white/40 hover:text-white/70 transition-colors"
                  >
                    <svg className="inline-block w-4 h-4 mr-1 -mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver al QR
                  </button>
                </form>
              </>
            )}
          </>
        )}

        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-center text-xs text-white/30">
            La verificación en dos pasos protege tu cuenta.
          </p>
        </div>
      </div>
    </div>
  );
}
