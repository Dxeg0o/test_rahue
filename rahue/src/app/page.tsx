"use client";

import { useDemo } from "@/lib/demo-context";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { GeneralHistoryView } from "@/components/general-history-view";

export default function HomePage() {
  const { machines } = useDemo();
  
  // High-level Tabs: "View Mode"
  const [activeView, setActiveView] = useState<"live" | "history" | "workers">("live");
  
  // Drill-down State
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);
  
  // Detail View Sub-tabs
  const [detailTab, setDetailTab] = useState<"production" | "quality" | "stops">("production");
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedMachine = machines.find(m => m.id === selectedMachineId);

  // Helper to calculate progress
  const getProgress = (current: number, target: number) => {
      if (!target || target === 0) return 0;
      return Math.min(100, Math.round((current / target) * 100));
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10">
      
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4 items-center">
            {selectedMachineId && (
                <button 
                    onClick={() => setSelectedMachineId(null)}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                >
                    &larr; Volver
                </button>
            )}
            <div>
                <h1 className="text-3xl font-bold text-slate-900">
                    {selectedMachineId ? selectedMachine?.name : "Centro de Control"}
                </h1>
                <p className="text-sm text-slate-500">
                    {mounted ? format(currentTime, "PPP - HH:mm", { locale: es }) : "Cargando fecha..."}
                </p>
            </div>
        </div>
      </header>

      {/* Main Navigation Tabs (Only visible in Main View) */}
      {!selectedMachineId && (
          <div className="flex space-x-1 rounded-xl bg-slate-100 p-1">
            {["live", "history"].map((tab) => (
                <button
                key={tab}
                onClick={() => setActiveView(tab as "live" | "history" | "workers")}
                className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                    activeView === tab
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-500 hover:bg-white/[0.12] hover:text-slate-700"
                }`}
                >
                {tab === "live" && "Planta en Vivo"}
                {tab === "history" && "Historial General"}
                </button>
            ))}
          </div>
      )}

      {/* --- CONTENT AREA --- */}

      {/* 1. LIVE VIEW (GRID) */}
      {!selectedMachineId && activeView === "live" && (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {machines.map((machine) => {
             const progress = machine.order && machine.order.targetUnits 
                ? getProgress(machine.metrics.totalUnits, machine.order.targetUnits) 
                : 0;

             // Calculate Traffic Light based on Std Dev
             const stdDev = machine.metrics.standardDeviation || 0;
             let trafficColor = "text-green-500";
             if (stdDev > 4) trafficColor = "text-red-500";
             else if (stdDev > 2) trafficColor = "text-yellow-500";
             
             // Triangle shape for traffic light container or icon
             // Using a triangle SVG icon next to the indicator
                
             return (
                <div 
                key={machine.id}
                onClick={() => setSelectedMachineId(machine.id)}
                className={`group relative cursor-pointer overflow-hidden rounded-3xl p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-2xl border border-slate-100 bg-white`}
                >
                    {/* Status Dot */}
                    <div className={`absolute top-4 right-4 h-3 w-3 rounded-full ${
                        machine.status === "RUNNING" ? "bg-green-500 animate-pulse" : 
                        machine.order?.status === "PAUSED" ? "bg-yellow-400 animate-pulse" :
                        "bg-slate-300"
                    }`} />

                    <h3 className="text-xl font-bold text-slate-900 mb-1">{machine.name}</h3>
                    <p className="text-xs text-slate-400 mb-6">ID: {machine.id.toUpperCase()}</p>

                    {(machine.status === "RUNNING" || machine.order?.status === "PAUSED") && machine.order ? (
                        <div className="space-y-4">
                            {/* Key Info Cards */}
                            <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Orden (OT):</span>
                                    <span className="font-mono font-bold text-slate-900">{machine.order.id}</span>
                                </div>
                                <div className="flex flex-col text-sm">
                                    <span className="text-slate-500">Operador:</span>
                                    <span className="font-bold text-slate-900 truncate">
                                        {machine.order.operatorName}
                                    </span>
                                    <span className="text-xs text-slate-500">{machine.order.operatorRut}</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs font-medium">
                                    <span className="text-indigo-600">Progreso ({progress}%)</span>
                                    <span className="text-slate-400">{machine.metrics.totalUnits.toLocaleString()} / {machine.order.targetUnits?.toLocaleString()}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 transition-all duration-1000 ease-out" 
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                            
                            {/* Speed & Std Dev Indicator */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-slate-400">Velocidad</p>
                                    <p className="text-lg font-bold text-slate-900">
                                        {machine.order.status === "PAUSED" ? (
                                            <span className="text-yellow-600 text-sm">EN PAUSA</span>
                                        ) : (
                                            <>{machine.metrics.currentSpeed} <span className="text-xs font-normal text-slate-500">gpm</span></>
                                        )}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end">
                                     <p className="text-xs text-slate-400">Desviación</p>
                                     <div className="flex items-center gap-1">
                                        {/* Triangle Icon */}
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className={trafficColor}>
                                            <path d="M12 2L2 22h20L12 2z" />
                                        </svg>
                                        <span className="text-sm font-bold text-slate-700">{stdDev.toFixed(2)}</span>
                                     </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="py-10 text-center text-slate-400 text-sm bg-slate-50 rounded-xl">
                            <p>Máquina Detenida</p>
                            <p className="text-xs mt-1">Esperando inicio de turno</p>
                        </div>
                    )}
                </div>
            );
          })}
        </section>
      )}

      {/* 2. HISTORY / WORKERS PLACEHOLDERS */}
      {!selectedMachineId && activeView !== "live" && (
         <div className="w-full h-full">
            <GeneralHistoryView />
         </div>
      )}


      {/* 3. MACHINE DETAIL VIEW */}
      {selectedMachineId && selectedMachine && (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
           {/* Detailed Header Card */}
            <div className="rounded-3xl bg-slate-900 p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
               <div>
                  <div className="flex items-center gap-3 mb-2">
                       <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                           selectedMachine.status === "RUNNING" ? "bg-green-500 text-slate-900" : 
                           selectedMachine.order?.status === "PAUSED" ? "bg-yellow-400 text-yellow-900" :
                           "bg-red-500 text-white"
                       }`}>
                           {selectedMachine.status === "RUNNING" ? "EN PRODUCCIÓN" : 
                            selectedMachine.order?.status === "PAUSED" ? "EN PAUSA" :
                            "DETENIDA"}
                       </span>
                  </div>
                  {selectedMachine.order && (
                      <div className="mt-4 space-y-1">
                          <p className="text-slate-400">Orden de Trabajo: <span className="text-white font-mono text-lg">{selectedMachine.order.id}</span></p>
                          <p className="text-slate-400">Operador: <span className="text-white">{selectedMachine.order.operatorName} - {selectedMachine.order.operatorRut}</span></p>
                      </div>
                  )}
               </div>
               
               {(selectedMachine.status === "RUNNING" || selectedMachine.order?.status === "PAUSED") && (
                   <div className="flex gap-10 text-center">
                       <div>
                           <p className="text-slate-400 text-sm uppercase tracking-wider">Velocidad</p>
                           <p className="text-6xl font-black">
                               {selectedMachine.order?.status === "PAUSED" ? (
                                   <span className="text-4xl text-yellow-400">PAUSA</span>
                               ) : (
                                   <>{selectedMachine.metrics.currentSpeed}<span className="text-xl font-normal text-slate-500 ml-1">gpm</span></>
                               )}
                           </p>
                       </div>
                       <div>
                           <p className="text-slate-400 text-sm uppercase tracking-wider">Avance</p>
                           <p className="text-6xl font-black text-indigo-400">
                                {selectedMachine.order?.targetUnits ? getProgress(selectedMachine.metrics.totalUnits, selectedMachine.order.targetUnits) : 0}%
                           </p>
                       </div>
                       <div>
                           <p className="text-slate-400 text-sm uppercase tracking-wider">ETA</p>
                           <p className="text-6xl font-black text-emerald-400">
                                14:30
                           </p>
                       </div>
                   </div>
               )}
            </div>

            {/* Inner Tabs for "Information Types" */}
             <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  {['production', 'stops'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab as "production" | "quality" | "stops")}
                      className={`
                        whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                        ${detailTab === tab
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}
                      `}
                    >
                      {tab === 'production' && 'Producción en Vivo'}
                      {tab === 'stops' && 'Paradas'}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Detail Content */}
              <section className="min-h-[400px]">
                 {detailTab === "production" && (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="mb-6 font-bold text-slate-900">Velocidad en Tiempo Real (GPM)</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={selectedMachine.history && selectedMachine.history.length > 0 ? selectedMachine.history : [{time: mounted ? format(currentTime, "HH:mm:ss") : "00:00:00", speed: 0, target: 60}]}>
                                        <defs>
                                            <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" />
                                        <YAxis domain={[0, 400]} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="speed" stroke="#6366f1" fillOpacity={1} fill="url(#colorSpeed)" animationDuration={300} />
                                        <Area type="monotone" dataKey="target" stroke="#94a3b8" strokeDasharray="5 5" fill="none" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                                <h3 className="mb-4 font-bold text-slate-900">Indicadores Clave</h3>
                                
                                <div className="space-y-6"> 
                                    {/* Producción */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Producción</h4>
                                        <ul className="space-y-2">
                                            <li className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-slate-500 text-sm">Unidades Producidas</span>
                                                <span className="font-bold text-slate-900">{selectedMachine.metrics.totalUnits.toLocaleString()}</span>
                                            </li>
                                            <li className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-slate-500 text-sm">Golpes Totales</span>
                                                <span className="font-bold text-slate-900">{selectedMachine.metrics.totalHits.toLocaleString()}</span>
                                            </li>
                                            <li className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-slate-500 text-sm">Meta OT</span>
                                                <span className="font-bold text-slate-900">{selectedMachine.order?.targetUnits?.toLocaleString()}</span>
                                            </li>
                                            <li className="flex justify-between pb-2">
                                                <span className="text-slate-500 text-sm">Salidas por Golpe</span>
                                                <span className="font-bold text-slate-900">{selectedMachine.metrics.outputsPerStroke}</span>
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Rendimiento */}
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rendimiento Máquina</h4>
                                        <ul className="space-y-2">
                                             <li className="flex justify-between border-b border-slate-100 pb-2">
                                                <span className="text-slate-500 text-sm">Velocidad Min/Max</span>
                                                <span className="font-bold text-slate-900">
                                                    {selectedMachine.metrics.minSpeed} / {selectedMachine.metrics.maxSpeed}
                                                </span>
                                            </li>
                                            <li className="flex justify-between pb-2">
                                                <span className="text-slate-500 text-sm">Desviación Estándar</span>
                                                <span className={`font-bold ${
                                                    (selectedMachine.metrics.standardDeviation || 0) > 3 ? "text-red-500" : "text-slate-900"
                                                }`}>
                                                    {selectedMachine.metrics.standardDeviation?.toFixed(2)}
                                                </span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                     </div>
                 )}
                 
                 {detailTab === "stops" && (
                      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                          <h3 className="mb-4 font-bold text-slate-900">Registro de Paradas</h3>
                          <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 uppercase text-xs text-slate-500">
                                  <tr>
                                      <th className="px-4 py-2">Hora Inicio</th>
                                      <th className="px-4 py-2">Hora Término</th>
                                      <th className="px-4 py-2">Duración</th>
                                      <th className="px-4 py-2">Motivo</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {selectedMachine.stops && selectedMachine.stops.length > 0 ? (
                                      selectedMachine.stops.map((stop, i) => (
                                      <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                                          <td className="px-4 py-3">{stop.startTime}</td>
                                          <td className="px-4 py-3 text-slate-500 font-mono">{stop.endTime}</td>
                                          <td className="px-4 py-3 font-medium text-slate-700">{stop.duration}</td>
                                          <td className="px-4 py-3 text-slate-500">
                                              <span className="px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium">
                                                  {stop.reason}
                                              </span>
                                          </td>
                                      </tr>
                                      ))
                                  ) : (
                                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Sin paradas registradas</td></tr>
                                  )}
                              </tbody>
                          </table>
                      </div>
                 )}
              </section>
        </div>
      )}

    </main>
  );
}
