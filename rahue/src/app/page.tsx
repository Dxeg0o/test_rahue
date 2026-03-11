"use client";

import { useDemo } from "@/lib/demo-context";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { ActiveOts } from "@/components/active-ots";
import { MachineCard } from "@/components/machine-card";
import { MachineCardCompact } from "@/components/machine-card-compact";
import { ProcessCard } from "@/components/process-card";

// Mock data removed in favor of DemoContext
export default function HomePage() {
  return (
    <Suspense>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const { machines } = useDemo();
  const searchParams = useSearchParams();
  const isEmbed = searchParams.get("embed") === "true";

  const MACHINE_AREAS = ["Impresión", "Troquelado", "Formado"];
  const PROCESOS_AREAS = ["Llegada Materiales"];
  const MOVIMIENTOS_AREAS = ["Tránsito a Bodega", "Entrega Cliente"];

  const activeProcesos = machines.filter(m => PROCESOS_AREAS.includes(m.area as string) && m.order !== null).map(m => ({
      id: m.order!.id,
      machineId: m.id,
      productName: m.order!.productName,
      stageName: m.area,
      operatorName: m.order!.operatorName,
      status: (m.order!.status === "PAUSED" ? "WAITING" : "IN_PROGRESS") as "WAITING" | "IN_PROGRESS",
      timeInStage: `${((new Date().getTime() - new Date(m.order!.startTime).getTime()) / 3600000).toFixed(1)} h`
  }));

  const activeMovimientos = machines.filter(m => MOVIMIENTOS_AREAS.includes(m.area as string) && m.order !== null).map(m => ({
      id: m.order!.id,
      machineId: m.id,
      productName: m.order!.productName,
      stageName: m.area,
      operatorName: m.order!.operatorName,
      status: (m.order!.status === "PAUSED" ? "WAITING" : "IN_PROGRESS") as "WAITING" | "IN_PROGRESS",
      timeInStage: `${((new Date().getTime() - new Date(m.order!.startTime).getTime()) / 3600000).toFixed(1)} h`
  }));


  // High-level Tabs: "View Mode"
  const [activeView, setActiveView] = useState<"live" | "history" | "workers">("live");

  // Live View Sub-tab
  const [liveViewMode, setLiveViewMode] = useState<"general" | "ots">("general");

  // Expanded Column State
  const [expandedColumn, setExpandedColumn] = useState<"procesos" | "maquinas" | "movimientos" | null>(null);

  // Drill-down State
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);

  // OT navigation from cards
  const [otInitialMachineId, setOtInitialMachineId] = useState<string | null>(null);

  const handleOtClick = (machineId: string) => {
    setOtInitialMachineId(machineId);
    setLiveViewMode("ots");
  };

  // Expanded areas in Vista General
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  const toggleArea = (area: string) => {
    setExpandedAreas(prev => {
      const next = new Set(prev);
      if (next.has(area)) next.delete(area);
      else next.add(area);
      return next;
    });
  };

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
    <main className={isEmbed
      ? "flex min-h-screen w-full flex-col"
      : "mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10"
    }>

      {/* Header (hidden in embed mode) */}
      {!isEmbed && (
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
      )}

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

      {/* 1. LIVE VIEW (GRID OR OTS) */}
      {!selectedMachineId && activeView === "live" && (
        <div className="space-y-6">
            {/* Live View Sub-Navigation */}
            <div className="flex space-x-4 border-b border-slate-200">
                <button
                    onClick={() => setLiveViewMode("general")}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                        liveViewMode === "general"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
                >
                    Vista General
                </button>
                <button
                    onClick={() => setLiveViewMode("ots")}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                        liveViewMode === "ots"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                    }`}
                >
                    OT activas
                </button>
            </div>

            {liveViewMode === "general" ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {expandedColumn === null ? (
                        /* 3 COLUMN VIEW */
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                            {/* COLUMNA 1: PROCESOS */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm flex flex-col h-[700px]">
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-2xl">
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-bold text-slate-800">Procesos</h2>
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{activeProcesos.length}</span>
                                    </div>
                                    <button onClick={() => setExpandedColumn("procesos")} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">Expandir ↗</button>
                                </div>
                                <div className="p-4 flex-1 overflow-y-auto space-y-3">
                                    {activeProcesos.map(item => (
                                        <ProcessCard key={item.id} item={item} onOtClick={() => handleOtClick(item.machineId)} />
                                    ))}
                                </div>
                            </div>

                            {/* COLUMNA 2: MÁQUINAS */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm flex flex-col h-[700px]">
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-2xl">
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-bold text-slate-800">Máquinas</h2>
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                                            {machines.filter(m => MACHINE_AREAS.includes(m.area as string) && (m.status === "RUNNING" || m.order?.status === "PAUSED")).length}
                                        </span>
                                    </div>
                                    <button onClick={() => setExpandedColumn("maquinas")} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">Expandir ↗</button>
                                </div>
                                <div className="p-4 flex-1 overflow-y-auto space-y-3">
                                    {machines.filter(m => MACHINE_AREAS.includes(m.area as string) && (m.status === "RUNNING" || m.order?.status === "PAUSED")).map(m => (
                                        <MachineCardCompact key={m.id} machine={m} onClick={() => setSelectedMachineId(m.id)} onOtClick={() => handleOtClick(m.id)} />
                                    ))}
                                </div>
                            </div>

                            {/* COLUMNA 3: MOVIMIENTOS */}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 shadow-sm flex flex-col h-[700px]">
                                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-2xl">
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-bold text-slate-800">Movimientos</h2>
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{activeMovimientos.length}</span>
                                    </div>
                                    <button onClick={() => setExpandedColumn("movimientos")} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">Expandir ↗</button>
                                </div>
                                <div className="p-4 flex-1 overflow-y-auto space-y-3">
                                    {activeMovimientos.map(item => (
                                        <ProcessCard key={item.id} item={item} onOtClick={() => handleOtClick(item.machineId)} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* EXPANDED VIEWS */
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                                <button
                                    onClick={() => setExpandedColumn(null)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 font-medium text-sm transition-colors uppercase tracking-wider bg-white border border-slate-200 shadow-sm"
                                >
                                    &larr; Volver
                                </button>
                                <h2 className="font-bold text-slate-800 text-xl capitalize">Vista Detallada: {expandedColumn}</h2>
                            </div>

                            {expandedColumn === "maquinas" && (
                                <div className="space-y-6">
                                    {["Impresión", "Troquelado", "Formado"].map(area => {
                                        const areaMachines = machines.filter(m => m.area === area);
                                        if (areaMachines.length === 0) return null;
                                        const isExpanded = expandedAreas.has(area);
                                        const runningCount = areaMachines.filter(m => m.status === "RUNNING").length;
                                        const pausedCount = areaMachines.filter(m => m.order?.status === "PAUSED").length;

                                        return (
                                            <section key={area} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                                {/* Area header */}
                                                <div className="flex items-center justify-between px-5 py-4 bg-slate-50/80 border-b border-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <h2 className="text-base font-bold text-slate-800">{area}</h2>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="flex items-center gap-1 text-green-600">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                                {runningCount}
                                                            </span>
                                                            {pausedCount > 0 && (
                                                                <span className="flex items-center gap-1 text-yellow-600">
                                                                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                                                                    {pausedCount}
                                                                </span>
                                                            )}
                                                            <span className="text-slate-400">{areaMachines.length} total</span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => toggleArea(area)}
                                                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    >
                                                        {isExpanded ? "Compactar" : "Expandir"}
                                                        <svg
                                                            width="14" height="14" viewBox="0 0 24 24" fill="none"
                                                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                                            className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                                                        >
                                                            <polyline points="6 9 12 15 18 9" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                {/* Machine cards */}
                                                <div className="p-4">
                                                    {isExpanded ? (
                                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-300">
                                                            {areaMachines.map((machine) => (
                                                                <MachineCard key={machine.id} machine={machine} onClick={() => setSelectedMachineId(machine.id)} onOtClick={() => handleOtClick(machine.id)} />
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                            {areaMachines.map((machine) => (
                                                                <MachineCardCompact key={machine.id} machine={machine} onClick={() => setSelectedMachineId(machine.id)} onOtClick={() => handleOtClick(machine.id)} />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </section>
                                        );
                                    })}
                                </div>
                            )}

                            {expandedColumn === "procesos" && (
                                <div className="space-y-6">
                                    {["Llegada Materiales", "Preparación"].map(stageName => {
                                        const groupItems = activeProcesos.filter(item => item.stageName === stageName);
                                        if (groupItems.length === 0) return null;
                                        const actsCount = groupItems.filter(i => i.status === "IN_PROGRESS").length;

                                        return (
                                            <section key={stageName} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                                <div className="flex items-center justify-between px-5 py-4 bg-slate-50/80 border-b border-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <h2 className="text-base font-bold text-slate-800">{stageName}</h2>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="flex items-center gap-1 text-indigo-600">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                                {actsCount} activos
                                                            </span>
                                                            <span className="text-slate-400">{groupItems.length} total</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                        {groupItems.map(item => (
                                                            <ProcessCard key={item.id} item={item} onOtClick={() => handleOtClick(item.machineId)} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </section>
                                        );
                                    })}
                                </div>
                            )}

                            {expandedColumn === "movimientos" && (
                                <div className="space-y-6">
                                    {["Tránsito a Bodega", "Entrega Cliente"].map(stageName => {
                                        const groupItems = activeMovimientos.filter(item => item.stageName === stageName);
                                        if (groupItems.length === 0) return null;
                                        const actsCount = groupItems.filter(i => i.status === "IN_PROGRESS").length;

                                        return (
                                            <section key={stageName} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                                <div className="flex items-center justify-between px-5 py-4 bg-slate-50/80 border-b border-slate-100">
                                                    <div className="flex items-center gap-3">
                                                        <h2 className="text-base font-bold text-slate-800">{stageName}</h2>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="flex items-center gap-1 text-indigo-600">
                                                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                                {actsCount} activos
                                                            </span>
                                                            <span className="text-slate-400">{groupItems.length} total</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-4">
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                        {groupItems.map(item => (
                                                            <ProcessCard key={item.id} item={item} onOtClick={() => handleOtClick(item.machineId)} />
                                                        ))}
                                                    </div>
                                                </div>
                                            </section>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <ActiveOts initialSelectedId={otInitialMachineId} onInitialConsumed={() => setOtInitialMachineId(null)} />
            )}
        </div>
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
                                   <>{selectedMachine.metrics.currentSpeed}<span className="text-xl font-normal text-slate-500 ml-1">{selectedMachine.metrics.speedUnit}</span></>
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
                            <h3 className="mb-6 font-bold text-slate-900">Velocidad en Tiempo Real ({selectedMachine.metrics.speedUnit.toUpperCase()})</h3>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={selectedMachine.history && selectedMachine.history.length > 0 ? selectedMachine.history : [{time: mounted ? format(currentTime, "HH:mm:ss") : "00:00:00", speed: 0, target: 60}]}>
                                        <defs>
                                            <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#007bff" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#007bff" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" />
                                        <YAxis domain={[0, 400]} />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="speed" stroke="#007bff" fillOpacity={1} fill="url(#colorSpeed)" animationDuration={300} />
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
