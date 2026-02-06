"use client";

import { useDemo } from "@/lib/demo-context";
import { useState } from "react";

import { PENDING_OTS } from "@/lib/mockOtData";

export default function OperatorPage() {
  const { machines, startMachineOrder, stopMachineOrder } = useDemo();
  
  // We assume the operator is at "Station A" (machine-1)
  const myMachine = machines.find(m => m.id === "machine-1");
  const isRunning = myMachine?.status === "RUNNING";

  // Local form state
  const [ot, setOt] = useState("");
  const [rut, setRut] = useState("");
  const [outputs, setOutputs] = useState(6);
  const [target, setTarget] = useState(50000);

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

  if (!myMachine) return <div>Error: Máquina no configurada</div>;

  if (isRunning && myMachine.order) {
    // ... (This part stays largely the same, maybe update success message)
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-lg space-y-8 rounded-3xl bg-white p-10 shadow-xl ring-1 ring-slate-900/5">
          <div className="text-center">
            <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 mb-4">
              EN PRODUCCIÓN
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
             <div className="col-span-2 rounded-2xl bg-slate-900 p-4 text-center text-white">
                <p className="text-sm font-medium text-slate-400">Velocidad Actual</p>
                <p className="text-4xl font-bold">{myMachine.metrics.currentSpeed} <span className="text-lg font-normal text-slate-500">golpes/min</span></p>
             </div>
          </div>

          <button
            onClick={handleStop}
            className="w-full rounded-xl bg-red-600 px-4 py-4 text-lg font-bold text-white transition-all hover:bg-red-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-red-200"
          >
            DETENER PRODUCCIÓN
          </button>
          
          <p className="text-center text-xs text-slate-400">
             Sistema RAHUE v1.0 • Estación de Operador
          </p>
        </div>
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
