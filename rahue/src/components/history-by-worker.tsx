"use client";

import { useState } from "react";
import { WORKERS, getWorkerStats, type OTDocument } from "@/lib/mockOtData";
import { OtDetailCard } from "./ot-detail-card";
import { format } from "date-fns";

export function HistoryByWorker() {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedOt, setSelectedOt] = useState<OTDocument | null>(null);

  const selectedWorkerStats = selectedWorkerId 
    ? getWorkerStats(WORKERS.find(w => w.id === selectedWorkerId)?.name || "") 
    : null;

  return (
    <div className="flex h-[calc(100vh-220px)] gap-6">
      {/* LEFT: Workers List */}
      <div className={`flex flex-col gap-4 transition-all duration-300 ${selectedWorkerId ? "w-1/3" : "w-full"}`}>
        <div className="grid grid-cols-1 gap-3">
            {WORKERS.map((worker) => (
                <div
                    key={worker.id}
                    onClick={() => { setSelectedWorkerId(worker.id); setSelectedOt(null); }}
                    className={`cursor-pointer rounded-xl border p-5 transition-all hover:shadow-md flex items-center gap-4 ${
                        selectedWorkerId === worker.id
                        ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                        : "border-slate-200 bg-white hover:border-indigo-300"
                    }`}
                >
                    <div className="w-12 h-12 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-xl">
                        {worker.name.charAt(0)}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">{worker.name}</h3>
                        <p className="text-xs text-slate-500">{worker.rut}</p>
                    </div>
                    {/* Mini Sparkline or Stat could go here */}
                    <div className="ml-auto text-right">
                         <span className="text-indigo-600 font-bold">Ver &rarr;</span>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* RIGHT: Worker Detail OR OT Detail */}
      {selectedWorkerId && selectedWorkerStats && (
        <div className="w-2/3 animate-in slide-in-from-right-4 fade-in duration-300 flex flex-col h-full">
            
            {selectedOt ? (
                 <div className="h-full rounded-3xl border border-slate-200 overflow-hidden shadow-xl relative">
                     <OtDetailCard ot={selectedOt} onClose={() => setSelectedOt(null)} className="h-full" />
                 </div>
            ) : (
                <div className="h-full rounded-3xl border border-slate-200 bg-white shadow-xl flex flex-col overflow-hidden">
                    {/* Worker Header */}
                    <div className="bg-slate-900 p-8 text-white shrink-0">
                         <div className="flex justify-between items-start">
                             <div className="flex items-center gap-6">
                                <div className="w-20 h-20 bg-white/10 text-white rounded-full flex items-center justify-center font-bold text-4xl">
                                    {selectedWorkerStats.name.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold">{selectedWorkerStats.name}</h2>
                                    <p className="text-indigo-200 opacity-80">{selectedWorkerStats.rut}</p>
                                </div>
                             </div>
                             <button onClick={() => setSelectedWorkerId(null)} className="text-slate-400 hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                             </button>
                         </div>
                         
                         <div className="mt-8 grid grid-cols-4 gap-4">
                             <div className="bg-white/5 p-4 rounded-xl">
                                 <p className="text-slate-400 text-xs uppercase tracking-wider">Total OTs</p>
                                 <p className="text-2xl font-bold">{selectedWorkerStats.totalOts}</p>
                             </div>
                             <div className="bg-white/5 p-4 rounded-xl">
                                 <p className="text-slate-400 text-xs uppercase tracking-wider">Unidades Total</p>
                                 <p className="text-2xl font-bold text-emerald-400">{(selectedWorkerStats.totalUnits / 1000).toFixed(1)}k</p>
                             </div>
                             <div className="bg-white/5 p-4 rounded-xl">
                                 <p className="text-slate-400 text-xs uppercase tracking-wider">Vel. Promedio</p>
                                 <p className="text-2xl font-bold">{selectedWorkerStats.avgSpeed} <span className="text-sm font-normal text-slate-500">gpm</span></p>
                             </div>
                             <div className="bg-white/5 p-4 rounded-xl">
                                 <p className="text-slate-400 text-xs uppercase tracking-wider">Calidad</p>
                                 <p className="text-2xl font-bold text-indigo-400">{selectedWorkerStats.avgQuality}%</p>
                             </div>
                         </div>
                    </div>

                    {/* Worker's Recent OTs List */}
                    <div className="p-6 flex-1 overflow-y-auto bg-slate-50">
                        <h3 className="font-bold text-slate-900 mb-4 px-1">Últimas OTs Realizadas</h3>
                        <div className="space-y-3">
                            {selectedWorkerStats.recentOts.map(ot => (
                                <div 
                                    key={ot.id}
                                    onClick={() => setSelectedOt(ot)}
                                    className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                            OT
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{ot.id}</p>
                                            <p className="text-xs text-slate-500">{ot.machineName} • {format(new Date(ot.startTime), "d MMM, HH:mm")}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        <p className="font-bold text-slate-900">{ot.unitsProduced.toLocaleString()}</p>
                                        <p className="text-xs text-slate-500">unidades</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
