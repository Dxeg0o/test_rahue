"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { OTDocument } from "@/lib/mockOtData";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function OtHistoryView() {
  const [search, setSearch] = useState("");
  const [selectedOt, setSelectedOt] = useState<OTDocument | null>(null);

  const { data: ots, isLoading } = useSWR<OTDocument[]>(
    `/api/history/ot?limit=100&q=${encodeURIComponent(search)}`,
    fetcher
  );

  return (
    <div className="flex h-[calc(100vh-200px)] gap-6">
      {/* LEFT: List */}
      <div className={`flex flex-col gap-4 transition-all duration-300 ${selectedOt ? "w-1/3" : "w-full"}`}>
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por OT, Operador..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-10 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
          {isLoading ? (
            <div className="text-center py-10 text-slate-400">Cargando historial...</div>
          ) : ots && ots.length > 0 ? (
            ots.map((ot) => (
              <div
                key={ot.id}
                onClick={() => setSelectedOt(ot)}
                className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${
                  selectedOt?.id === ot.id
                    ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                    : "border-slate-200 bg-white hover:border-indigo-300"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-900">{ot.id}</span>
                  <span className="text-xs font-mono text-slate-400">
                    {format(new Date(ot.startTime), "dd/MM/yyyy")}
                  </span>
                </div>
                
                <div className="space-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center">👤</span>
                    <span className="font-medium text-slate-800">{ot.workerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center">🕒</span>
                    <span>{format(new Date(ot.startTime), "HH:mm")} inicio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center">📦</span>
                    <span className="text-emerald-600 font-bold">{ot.unitsProduced.toLocaleString()} un.</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
             <div className="text-center py-10 text-slate-400">No se encontraron OTs.</div>
          )}
        </div>
      </div>

      {/* RIGHT: Details Panel */}
      {selectedOt && (
        <div className="w-2/3 animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="h-full rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col">
            
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  {selectedOt.id}
                  <span className="bg-green-500 text-slate-900 text-xs px-2 py-0.5 rounded uppercase font-bold tracking-wider">Completada</span>
                </h2>
                <p className="text-slate-400 mt-1">{selectedOt.machineName}</p>
              </div>
              <button 
                onClick={() => setSelectedOt(null)}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-8 flex-1 overflow-y-auto">
              {/* KPIs Grid */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Producido</p>
                    <p className="text-2xl font-bold text-slate-900">{selectedOt.unitsProduced.toLocaleString()}</p>
                    <p className="text-xs text-slate-400 mt-1">de {selectedOt.targetUnits.toLocaleString()} objetivo</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Ritmo Promedio</p>
                    <p className="text-2xl font-bold text-indigo-600">{selectedOt.averageSpeed} <span className="text-sm text-slate-400 font-normal">u/min</span></p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Micro-paradas</p>
                    <p className="text-2xl font-bold text-red-500">{selectedOt.stopsCount}</p>
                </div>
              </div>

              {/* Detailed Stats List */}
              <div className="space-y-6">
                <div>
                   <h3 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">Detalles de Tiempo</h3>
                   <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                          <p className="text-slate-500">Fecha</p>
                          <p className="font-medium">{format(new Date(selectedOt.startTime), "PPPP", { locale: es })}</p>
                      </div>
                       <div>
                          <p className="text-slate-500">Duración Turno</p>
                          <p className="font-medium">
                            {((new Date(selectedOt.endTime).getTime() - new Date(selectedOt.startTime).getTime()) / (1000 * 60 * 60)).toFixed(1)} horas
                          </p>
                      </div>
                      <div>
                          <p className="text-slate-500">Hora Inicio</p>
                          <p className="font-medium">{format(new Date(selectedOt.startTime), "HH:mm:ss")}</p>
                      </div>
                      <div>
                          <p className="text-slate-500">Hora Fin</p>
                          <p className="font-medium">{format(new Date(selectedOt.endTime), "HH:mm:ss")}</p>
                      </div>
                   </div>
                </div>

                <div>
                   <h3 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">Operador Responsable</h3>
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">
                        {selectedOt.workerName.charAt(0)}
                      </div>
                      <div>
                          <p className="font-bold text-slate-900">{selectedOt.workerName}</p>
                          <p className="text-slate-500 text-sm">Operador Maquinista</p>
                      </div>
                   </div>
                </div>
              </div>

            </div>
            
            {/* Footer Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50">
                    Exportar Reporte
                </button>
                <button className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500">
                    Ver Gráficos Completos
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
