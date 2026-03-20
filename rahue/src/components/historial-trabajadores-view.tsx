"use client";

import { HistoryByWorker } from "./history-by-worker";

export function HistorialTrabajadoresView() {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Historial por Trabajador
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Rendimiento y trazabilidad por operador
        </p>
      </div>

      <div className="px-8 py-6">
        <HistoryByWorker />
      </div>
    </div>
  );
}
