"use client";

import { useState, useEffect } from "react";
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
  const router = useRouter();

  useEffect(() => {
    async function startEnroll() {
      const supabase = createClient();

      // Verificar si ya tiene MFA enrollado
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

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">Generando código QR...</div>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-xl mb-4 mx-auto">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">MFA activado</h1>
          <p className="text-sm text-gray-500 mb-6">
            Tu cuenta ahora requiere verificación en dos pasos al iniciar sesión.
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Ir al dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {state === "qr" ? (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              Configurar autenticación de dos pasos
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              Escanea este código QR con Google Authenticator, Authy u otra app TOTP.
            </p>

            {error && (
              <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            {qrCode && (
              <div className="flex justify-center mb-4">
                {/* El QR de Supabase viene como SVG */}
                <div
                  className="border border-gray-200 rounded-xl p-3 bg-white"
                  dangerouslySetInnerHTML={{ __html: qrCode }}
                />
              </div>
            )}

            <div className="bg-gray-50 rounded-lg px-4 py-3 mb-6">
              <p className="text-xs text-gray-500 mb-1">Clave manual (si no puedes escanear):</p>
              <p className="text-sm font-mono text-gray-800 break-all">{secret}</p>
            </div>

            <button
              onClick={() => setState("verify")}
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Ya escaneé el código →
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              Verificar configuración
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              Ingresa el código de 6 dígitos que muestra tu app para confirmar.
            </p>

            {error && (
              <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                required
                autoFocus
                className="w-full px-4 py-3 text-center text-2xl tracking-widest font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />

              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? "Verificando..." : "Activar MFA"}
              </button>

              <button
                type="button"
                onClick={() => setState("qr")}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                ← Volver al QR
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
