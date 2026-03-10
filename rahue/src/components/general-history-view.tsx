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
            <div className="flex space-x-4 border-b border-slate-200">
                <button 
                    onClick={() => setMode("OT")}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                        mode === "OT"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
                >
                    Por OTs
                </button>
                <button 
                    onClick={() => setMode("WORKER")}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                        mode === "WORKER"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
                >
                    Por Trabajador
                </button>
                <button 
                    onClick={() => setMode("TIME")}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                        mode === "TIME"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
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
