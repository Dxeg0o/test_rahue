"use client";

import { useState } from "react";
import { HistoryByOt } from "./history-by-ot";
import { HistoryByWorker } from "./history-by-worker";
import { HistoryByTime } from "./history-by-time";

type HistoryMode = "OT" | "WORKER" | "TIME";

export function GeneralHistoryView() {
  const [mode, setMode] = useState<HistoryMode>("OT");

  return (
    <div className="flex flex-col h-full space-y-6">
        
        {/* Navigation / Filter Bar */}
        <div className="flex items-center justify-between">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
                <button 
                    onClick={() => setMode("OT")}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${mode === "OT" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                    Por OTs
                </button>
                <button 
                    onClick={() => setMode("WORKER")}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${mode === "WORKER" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                    Por Trabajador
                </button>
                <button 
                    onClick={() => setMode("TIME")}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${mode === "TIME" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                    Por Fecha/Periodo
                </button>
            </div>
            
            {/* Context Stats or Actions */}
            {mode === "OT" && <span className="text-xs text-slate-400 font-medium">Mostrando OTs recientes</span>}
            {mode === "WORKER" && <span className="text-xs text-slate-400 font-medium">Análisis de rendimiento por operador</span>}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0">
             {mode === "OT" && <HistoryByOt />}
             {mode === "WORKER" && <HistoryByWorker />}
             {mode === "TIME" && <HistoryByTime />}
        </div>
    </div>
  );
}
