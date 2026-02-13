"use client";

import { useDemo } from "@/lib/demo-context";
import { useState } from "react";

import { PENDING_OTS } from "@/lib/mockOtData";

export default function OperatorPage() {
  const { machines, startMachineOrder, stopMachineOrder, pauseMachine, resumeMachine } = useDemo();
  
  // We assume the operator is at "Station A" (machine-1)
  const myMachine = machines.find(m => m.id === "machine-1");
  const isRunning = myMachine?.status === "RUNNING";
  const isPaused = myMachine?.order?.status === "PAUSED";
  const isActive = isRunning || isPaused;

  // Local form state
  const [ot, setOt] = useState("");
  const [rut, setRut] = useState("");
  const [outputs, setOutputs] = useState(6);
  const [target, setTarget] = useState(50000);
  
  // Pause state
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  
  const PAUSE_REASONS = [
      "Colación",
      "Baño",
      "Reunión",
      "Falta de Material",
      "Ajuste de Máquina",
      "Otro"
  ];

  const handleOtChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value;
      setOt(selectedId);
      
      const pending = PENDING_OTS.find(p => p.id === selectedId);
      if (pending) {
          setOutputs(pending.outputs);
          setTarget(pending.target);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ot || !rut) return;
    startMachineOrder("machine-1", ot, rut, outputs, target);
  };

  const handleStop = () => {
    stopMachineOrder("machine-1");
  };

  const handlePauseClick = () => {
      setShowPauseModal(true);
  };

  const confirmPause = () => {
      if (!pauseReason) return;
      pauseMachine("machine-1", pauseReason);
      setShowPauseModal(false);
      setPauseReason("");
  };

  const handleResume = () => {
      resumeMachine("machine-1");
  };

  if (!myMachine) return <div>Error: Máquina no configurada</div>;

  if (isActive && myMachine.order) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 relative">
        <div className="w-full max-w-lg space-y-8 rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-900/5">
          <div className="text-center">
            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset mb-4 ${
                isPaused 
                ? "bg-yellow-50 text-yellow-700 ring-yellow-600/20" 
                : "bg-green-50 text-green-700 ring-green-600/20"
            }`}>
              {isPaused ? "EN PAUSA" : "EN PRODUCCIÓN"}
            </span>
            <h1 className="text-3xl font-bold text-slate-900">{myMachine.name}</h1>
            <p className="mt-2 text-lg text-slate-600">Orden de Trabajo: <span className="font-mono font-bold">{myMachine.order.id}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-sm font-medium text-slate-500">Golpes Totales</p>
                <p className="text-3xl font-bold text-indigo-600">{myMachine.metrics.totalHits.toLocaleString()}</p>
             </div>
             <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-sm font-medium text-slate-500">Unidades</p>
                <p className="text-3xl font-bold text-indigo-600">{myMachine.metrics.totalUnits.toLocaleString()}</p>
             </div>
             <div className={`col-span-2 rounded-2xl p-4 text-center text-white transition-colors ${
                 isPaused ? "bg-amber-500" : "bg-slate-900"
             }`}>
                <p className="text-sm font-medium opacity-80">{isPaused ? "Motivo de Pausa" : "Velocidad Actual"}</p>
                <p className="text-4xl font-bold">
                    {isPaused 
                        ? (myMachine.order.pauseReason || "Pausa") 
                        : <>{myMachine.metrics.currentSpeed} <span className="text-lg font-normal opacity-60">golpes/min</span></>
                    }
                </p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {!isPaused ? (
                <button
                    onClick={handlePauseClick}
                    className="w-full rounded-xl bg-yellow-400 px-4 py-4 text-lg font-bold text-yellow-900 transition-all hover:bg-yellow-500 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-yellow-200"
                >
                    PAUSAR
                </button>
            ) : (
                <button
                    onClick={handleResume}
                    className="w-full rounded-xl bg-green-600 px-4 py-4 text-lg font-bold text-white transition-all hover:bg-green-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-green-200"
                >
                    REANUDAR
                </button>
            )}

            <button
                onClick={handleStop}
                className="w-full rounded-xl bg-red-600 px-4 py-4 text-lg font-bold text-white transition-all hover:bg-red-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-red-200"
            >
                TERMINAR
            </button>
          </div>
          
          <p className="text-center text-xs text-slate-400">
             Sistema RAHUE v1.0 • Estación de Operador
          </p>
        </div>

        {/* Modal Pause Reason */}
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
                        <button 
                            onClick={() => setShowPauseModal(false)}
                            className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                        >
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-900/5">
        <div className="text-center">
          <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20 mb-4">
             ESPERANDO INICIO
          </span>
          <h1 className="text-2xl font-bold text-slate-900">Configuración de Turno</h1>
          <p className="text-slate-500">{myMachine.name}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="ot" className="block text-sm font-medium text-slate-700">
              Seleccionar Orden de Trabajo (Pendientes)
            </label>
            <select
              id="ot"
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm bg-white"
              value={ot}
              onChange={handleOtChange}
            >
                <option value="">-- Seleccionar OT --</option>
                {PENDING_OTS.map(p => (
                    <option key={p.id} value={p.id}>
                        {p.id} - {p.client} ({p.product})
                    </option>
                ))}
            </select>
          </div>

          <div>
            <label htmlFor="rut" className="block text-sm font-medium text-slate-700">
              RUT Operador
            </label>
            <input
              type="text"
              id="rut"
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              placeholder="Ej. 12.345.678-9"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="outputs" className="block text-sm font-medium text-slate-700">
                Salidas (Troqueladora)
                </label>
                <input
                type="number"
                id="outputs"
                min={1}
                max={20}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                value={outputs}
                onChange={(e) => setOutputs(Number(e.target.value))}
                />
            </div>
            {/* Target is hidden but tracked in state */}
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-lg font-bold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-indigo-200"
          >
            COMENZAR
          </button>
        </form>
         <p className="text-center text-xs text-slate-400">
             Sistema RAHUE v1.0 • Estación de Operador
        </p>
      </div>
    </main>
  );
}
