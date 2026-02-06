"use client";

import { useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getOtsByPeriod, getStatsByTime, type PeriodFilter } from "@/lib/history-helpers";
import { OtDetailCard } from "./ot-detail-card";
import type { OTDocument } from "@/lib/mockOtData";

export function HistoryByTime() {
  const [period, setPeriod] = useState<PeriodFilter>("week");
  const [selectedOt, setSelectedOt] = useState<OTDocument | null>(null);

  const { ots, start, end } = getOtsByPeriod(period);
  const stats = getStatsByTime(ots);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleBarClick = (data: any) => {
    // Future: Filter list by clicked bar?
    // For now just console log
    console.log("Clicked bar", data);
  };

  return (
    <div className="flex h-[calc(100vh-220px)] gap-6">
      {/* LEFT: Stats & Chart & Link to List */}
      <div className={`flex flex-col gap-4 transition-all duration-300 ${selectedOt ? "w-1/3" : "w-full"}`}>
        
        {/* Controls */}
        <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex gap-2">
                {(["today", "week", "month"] as PeriodFilter[]).map((p) => (
                    <button
                        key={p}
                        onClick={() => { setPeriod(p); setSelectedOt(null); }}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            period === p 
                            ? "bg-indigo-100 text-indigo-700 font-bold" 
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                    >
                        {p === "today" && "Hoy"}
                        {p === "week" && "Esta Semana"}
                        {p === "month" && "Este Mes"}
                    </button>
                ))}
            </div>
            <div className="text-right text-xs text-slate-400 px-2">
                {format(start, "d MMM", { locale: es })} - {format(end, "d MMM", { locale: es })}
            </div>
        </div>

        {/* Key Stats Cards */}
        {stats && (
            <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs uppercase font-bold">Total Unidades</p>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalUnits.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs uppercase font-bold">OTs Terminadas</p>
                    <p className="text-2xl font-bold text-indigo-600">{stats.totalOts}</p>
                </div>
                 <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-slate-500 text-xs uppercase font-bold">Eficiencia Prom.</p>
                    <p className="text-2xl font-bold text-emerald-600">{stats.avgEfficiency}%</p>
                </div>
            </div>
        )}

        {/* CHART Area */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-4 shadow-sm min-h-[250px] relative">
            <h3 className="text-slate-900 font-bold mb-4">Producción del Periodo</h3>
            {stats && stats.chartData.length > 0 ? (
                <div className="absolute inset-0 top-12 bottom-4 left-4 right-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.chartData} onClick={handleBarClick}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} />
                             <XAxis 
                                dataKey="name" 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                axisLine={false}
                                tickLine={false}
                             />
                             <YAxis 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => `${value / 1000}k`}
                             />
                             <Tooltip 
                                cursor={{fill: '#f1f5f9'}}
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                             />
                             <Bar dataKey="units" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-full flex items-center justify-center text-slate-400">
                    No hay datos para este periodo
                </div>
            )}
        </div>

        {/* List of OTs in Period */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[200px]">
             <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="font-bold text-slate-900">Detalle de OTs ({stats?.totalOts || 0})</h3>
                 <span className="text-xs text-slate-400">Ordenado por fecha</span>
             </div>
             <div className="flex-1 overflow-y-auto p-2 space-y-2">
                 {ots.map(ot => (
                     <div 
                        key={ot.id}
                        onClick={() => setSelectedOt(ot)}
                        className={`
                            flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                            ${selectedOt?.id === ot.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-indigo-300 hover:shadow-sm'}
                        `}
                     >
                         <div>
                             <p className="font-bold text-slate-700 text-sm">{ot.id}</p>
                             <p className="text-xs text-slate-400 capitalize">{format(new Date(ot.startTime), "EEEE HH:mm", {locale: es})}</p>
                         </div>
                         <div className="text-right">
                             <p className="font-bold text-slate-900 text-sm">{ot.unitsProduced.toLocaleString()}</p>
                             <p className="text-xs text-slate-400">{ot.workerName}</p>
                         </div>
                     </div>
                 ))}
             </div>
        </div>

      </div>

      {/* RIGHT: OT Detail */}
      {selectedOt && (
        <div className="w-2/3 animate-in slide-in-from-right-4 fade-in duration-300">
             <div className="h-full rounded-3xl border border-slate-200 overflow-hidden shadow-xl relative">
                 <OtDetailCard ot={selectedOt} onClose={() => setSelectedOt(null)} className="h-full" />
             </div>
        </div>
      )}
    </div>
  );
}
