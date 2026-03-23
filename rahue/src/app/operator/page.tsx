"use client";

import { useDemo } from "@/lib/demo-context";
import { useState, useEffect } from "react";

interface ScannedOT {
  id: string;
  outputs: number;
  target: number;
  client?: string;
  product?: string;
}

export default function OperatorPage() {
  const {
    machines,
    pendingOts,
    startMachineOrder,
    beginRealProduction,
    stopMachineOrder,
    pauseMachine,
    resumeMachine,
  } = useDemo();

  const myMachine = machines.find(m => m.id === "machine-1");
  const orderStatus = myMachine?.order?.status;
  const isWarmingUp = orderStatus === "WARMING_UP";
  const isPaused = orderStatus === "PAUSED";
  const isRunning = orderStatus === "RUNNING";
  const isActive = isRunning || isPaused;

  // Barcode scan state
  const [otInput, setOtInput] = useState("");
  const [rutInput, setRutInput] = useState("");
  const [scannedOT, setScannedOT] = useState<ScannedOT | null>(null);
  const [scannedRut, setScannedRut] = useState("");
  const [otError, setOtError] = useState("");

  // Warmup elapsed time
  const [warmupElapsed, setWarmupElapsed] = useState(0);
  const [showStartProductionModal, setShowStartProductionModal] = useState(false);

  useEffect(() => {
    if (!isWarmingUp) { setWarmupElapsed(0); return; }
    const interval = setInterval(() => setWarmupElapsed(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isWarmingUp]);

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m} min ${s} seg` : `${s} seg`;
  };

  // Pause / stop state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [showStopModal, setShowStopModal] = useState(false);

  const PAUSE_REASONS = ["Colación", "Baño", "Reunión", "Falta de Material", "Ajuste de Máquina", "Otro"];

  // Parse barcode format: OT-3001|8|50000
  const parseOtBarcode = (raw: string): ScannedOT | null => {
    const parts = raw.trim().split("|");
    if (parts.length < 2) return null;
    const id = parts[0].trim();
    const outputs = parseInt(parts[1].trim());
    const target = parts.length >= 3 ? parseInt(parts[2].trim()) : 50000;
    if (!id || isNaN(outputs)) return null;
    const pending = pendingOts.find(p => p.id === id);
    return {
      id,
      outputs: pending?.outputs ?? outputs,
      target: pending?.target ?? target,
      client: pending?.client,
      product: pending?.product,
    };
  };

  const handleOtKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && otInput.trim()) {
      const parsed = parseOtBarcode(otInput);
      if (parsed) {
        setScannedOT(parsed);
        setOtError("");
      } else {
        setOtError("Código inválido. Formato esperado: OT-XXXX|salidas|objetivo");
      }
      setOtInput("");
    }
  };

  const handleRutKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && rutInput.trim()) {
      setScannedRut(rutInput.trim());
      setRutInput("");
    }
  };

  const handleSubmit = () => {
    if (!scannedOT || !scannedRut) return;
    startMachineOrder("machine-1", scannedOT.id, scannedRut, scannedOT.outputs, scannedOT.target);
    setScannedOT(null);
    setScannedRut("");
  };

  const confirmStop = () => {
    stopMachineOrder("machine-1");
    setShowStopModal(false);
  };

  const confirmPause = () => {
    if (!pauseReason) return;
    pauseMachine("machine-1", pauseReason);
    setShowPauseModal(false);
    setPauseReason("");
  };

  if (!myMachine) return <div>Error: Máquina no configurada</div>;

  // ─── Pantalla: INICIO DE PROCESAMIENTO ───
  if (isWarmingUp && myMachine.order) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 relative">
        <div className="w-full max-w-lg space-y-6 rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-900/5">
          <div className="text-center">
            <span className="inline-flex items-center rounded-md bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20 mb-4">
              INICIO DE PROCESAMIENTO
            </span>
            <h1 className="text-3xl font-bold text-slate-900">{myMachine.name}</h1>
            <p className="mt-2 text-lg text-slate-600">
              Orden: <span className="font-mono font-bold">{myMachine.order.id}</span>
            </p>
            {myMachine.order.client && (
              <p className="text-sm text-slate-500 mt-1">{myMachine.order.client}</p>
            )}
          </div>

          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-3 w-3 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
              <p className="text-sm font-semibold text-amber-800">Máquina en calentamiento</p>
            </div>
            <p className="text-xs text-amber-700 leading-relaxed">
              Las unidades producidas en esta fase son <strong>merma</strong> y no cuentan para la producción. Confirma cuando la máquina esté estabilizada.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center">
            <p className="text-sm font-medium text-slate-500 mb-1">Tiempo en etapa</p>
            <p className="text-4xl font-bold text-slate-800 font-mono">{formatElapsed(warmupElapsed)}</p>
          </div>

          <button
            onClick={() => setShowStartProductionModal(true)}
            className="w-full rounded-xl bg-green-600 px-4 py-5 text-lg font-bold text-white shadow-lg transition-all hover:bg-green-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-green-200"
          >
            INICIAR PRODUCCIÓN REAL
          </button>

          <p className="text-center text-xs text-slate-400">Sistema RAHUE v1.0 • Estación de Operador</p>
        </div>

        {/* Modal: Confirmar inicio producción real */}
        {showStartProductionModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900">¿Iniciar producción real?</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Tiempo de calentamiento: <span className="font-semibold text-slate-700">{formatElapsed(warmupElapsed)}</span>
                </p>
                <p className="mt-1 text-sm text-slate-500">Los golpes contarán como producción desde este momento.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStartProductionModal(false)}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { beginRealProduction("machine-1"); setShowStartProductionModal(false); }}
                  className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // ─── Pantalla: EN PRODUCCIÓN / EN PAUSA ───
  if (isActive && myMachine.order) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 relative">
        <div className="w-full max-w-lg space-y-6 rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-900/5">
          <div className="text-center space-y-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
              isPaused
                ? "bg-yellow-50 text-yellow-700 ring-yellow-600/20"
                : "bg-green-50 text-green-700 ring-green-600/20"
            }`}>
              {isPaused ? "EN PAUSA" : "EN PRODUCCIÓN"}
            </span>
            <h1 className="text-3xl font-bold text-slate-900">{myMachine.name}</h1>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Orden de Trabajo</p>
            <p className="text-4xl font-bold font-mono text-slate-900">{myMachine.order.id}</p>
            {myMachine.order.client && (
              <p className="text-sm text-slate-500">{myMachine.order.client}</p>
            )}
          </div>

          {isPaused && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-center">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Motivo de Pausa</p>
              <p className="text-2xl font-bold text-amber-800">{myMachine.order.pauseReason || "Pausa"}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {!isPaused ? (
              <button
                onClick={() => setShowPauseModal(true)}
                className="w-full rounded-xl bg-yellow-400 px-4 py-4 text-lg font-bold text-yellow-900 transition-all hover:bg-yellow-500 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-yellow-200"
              >
                PAUSAR
              </button>
            ) : (
              <button
                onClick={() => resumeMachine("machine-1")}
                className="w-full rounded-xl bg-green-600 px-4 py-4 text-lg font-bold text-white transition-all hover:bg-green-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-green-200"
              >
                REANUDAR
              </button>
            )}
            <button
              onClick={() => setShowStopModal(true)}
              className="w-full rounded-xl bg-red-600 px-4 py-4 text-lg font-bold text-white transition-all hover:bg-red-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-red-200"
            >
              TERMINAR
            </button>
          </div>

          <p className="text-center text-xs text-slate-400">Sistema RAHUE v1.0 • Estación de Operador</p>
        </div>

        {/* Modal: Confirmar término */}
        {showStopModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-7 w-7 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900">¿Terminar producción?</h3>
                <p className="mt-2 text-sm text-slate-500">Esta acción finalizará la orden de trabajo en curso. No se puede deshacer.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowStopModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button onClick={confirmStop} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">
                  Sí, terminar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Motivo de pausa */}
        {showPauseModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-slate-900 mb-4 text-center">Seleccionar Motivo de Pausa</h3>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {PAUSE_REASONS.map(reason => (
                  <button
                    key={reason}
                    onClick={() => setPauseReason(reason)}
                    className={`p-4 rounded-xl text-sm font-bold border-2 transition-all ${
                      pauseReason === reason
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowPauseModal(false); setPauseReason(""); }} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={confirmPause}
                  disabled={!pauseReason}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    );
  }

  // ─── Pantalla: CONFIGURACIÓN DE TURNO (Escaneo de código de barras) ───
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md space-y-5 rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-900/5">
        <div className="text-center">
          <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 mb-4">
            ESPERANDO INICIO
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Configuración de Turno</h1>
          <p className="text-slate-500">{myMachine.name}</p>
        </div>

        {/* Escáner de OT */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Orden de Trabajo (Código de Barras)
          </label>
          {scannedOT ? (
            <div className="rounded-xl border-2 border-green-400 bg-green-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-bold text-green-800 font-mono">{scannedOT.id}</p>
                  {scannedOT.client && (
                    <p className="text-sm text-green-700">{scannedOT.client} — {scannedOT.product}</p>
                  )}
                  <p className="text-xs text-green-600">
                    {scannedOT.outputs} salidas/golpe · Objetivo: {scannedOT.target?.toLocaleString()} und.
                  </p>
                </div>
                <button onClick={() => setScannedOT(null)} className="text-xs text-green-700 underline hover:no-underline flex-shrink-0">
                  Cambiar
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  className="block w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3 pr-10 font-mono text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Escanear código de barras OT..."
                  value={otInput}
                  onChange={e => { setOtInput(e.target.value); setOtError(""); }}
                  onKeyDown={handleOtKeyDown}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5v15M6 4.5v15M9.75 4.5v15M12 4.5v15M15.75 4.5v15M18 4.5v15M21.75 4.5v15" />
                  </svg>
                </div>
              </div>
              {otError && <p className="mt-1 text-xs text-red-500">{otError}</p>}
              <p className="mt-1 text-xs text-slate-400">Apunta el lector al código y presiona Enter</p>
            </div>
          )}
        </div>

        {/* Escáner de credencial operador */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Credencial Operador (RUT)
          </label>
          {scannedRut ? (
            <div className="rounded-xl border-2 border-green-400 bg-green-50 p-3 flex items-center justify-between">
              <p className="font-mono font-bold text-green-800">{scannedRut}</p>
              <button onClick={() => setScannedRut("")} className="text-xs text-green-700 underline hover:no-underline">
                Cambiar
              </button>
            </div>
          ) : (
            <div>
              <div className="relative">
                <input
                  type="text"
                  className="block w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-3 pr-10 font-mono text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-colors"
                  placeholder="Escanear credencial o escribir RUT..."
                  value={rutInput}
                  onChange={e => setRutInput(e.target.value)}
                  onKeyDown={handleRutKeyDown}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-400">Apunta el lector a la credencial o escribe el RUT y presiona Enter</p>
            </div>
          )}
        </div>

        <details className="rounded-xl border border-slate-200 overflow-hidden text-sm">
          <summary className="cursor-pointer select-none px-4 py-3 text-xs font-semibold text-slate-500 hover:bg-slate-50">
            OTs pendientes disponibles
          </summary>
          <div className="px-4 pb-4 pt-3 bg-slate-50 border-t border-slate-200 space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Escaneo sugerido</p>
              <div className="space-y-1">
                {pendingOts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setScannedOT({ id: p.id, outputs: p.outputs, target: p.target, client: p.client, product: p.product })}
                    className="w-full text-left rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs hover:bg-indigo-50 hover:border-indigo-200 transition-colors group"
                  >
                    <span className="font-mono text-indigo-600 group-hover:text-indigo-700">{p.id}|{p.outputs}|{p.target}</span>
                    <span className="text-slate-400 ml-2">— {p.client} / {p.product}</span>
                  </button>
                ))}
                {pendingOts.length === 0 && (
                  <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs text-slate-400">
                    No hay OTs pendientes disponibles.
                  </div>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Credencial de operador</p>
              <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs text-slate-500">
                Escanea la credencial real o ingresa el RUT manualmente.
              </div>
            </div>
          </div>
        </details>

        <button
          onClick={handleSubmit}
          disabled={!scannedOT || !scannedRut}
          className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-lg font-bold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          COMENZAR
        </button>

        <p className="text-center text-xs text-slate-400">Sistema RAHUE v1.0 • Estación de Operador</p>
      </div>
    </main>
  );
}
