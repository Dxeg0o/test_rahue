"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useDemo, MachineState, ProductStage, DemoStageDetail, Stop } from "@/lib/demo-context";
import { ProductionFlowStepper } from "./production-flow-stepper";

interface ActiveOtsProps {
  initialSelectedId?: string | null;
  onInitialConsumed?: () => void;
}

export function ActiveOts({ initialSelectedId, onInitialConsumed }: ActiveOtsProps) {
  const { machines } = useDemo();
  const [search, setSearch] = useState("");
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(initialSelectedId ?? null);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  const [isCurrentExpanded, setIsCurrentExpanded] = useState(false);

  useEffect(() => {
    if (initialSelectedId) {
      setSelectedMachineId(initialSelectedId);
      onInitialConsumed?.();
    }
  }, [initialSelectedId, onInitialConsumed]);

  // Filter machines that have an active order (RUNNING or PAUSED)
  const activeMachines = machines.filter(m => m.order !== null);

  // Filter by search query
  const filteredMachines = activeMachines.filter(m => {
      const q = search.toLowerCase();
      return (
          m.order?.id.toLowerCase().includes(q) ||
          m.order?.operatorName.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q)
      );
  });

  const selectedMachine = activeMachines.find(m => m.id === selectedMachineId);

  const getProgress = (current: number, target?: number) => {
      if (!target || target === 0) return 0;
      return Math.min(100, Math.round((current / target) * 100));
  };

  return (
    <div className="flex h-[calc(100vh-220px)] gap-6 animate-in fade-in duration-300">
      {/* LEFT: List */}
      <div className={`flex flex-col gap-4 transition-all duration-300 ${selectedMachine ? "w-1/3" : "w-full"}`}>
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por OT, Operador, Máquina..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-10 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
          {filteredMachines.length > 0 ? (
            filteredMachines.map((m) => {
               const progress = m.order?.targetUnits ? getProgress(m.metrics.totalUnits, m.order.targetUnits) : 0;
               return (
                <div
                    key={m.id}
                    onClick={() => setSelectedMachineId(m.id)}
                    className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${
                    selectedMachine?.id === m.id
                        ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                        : "border-slate-200 bg-white hover:border-indigo-300"
                    }`}
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-900">{m.order?.id}</span>
                        <div className={`h-2.5 w-2.5 rounded-full ${m.status === "RUNNING" ? "bg-emerald-500" : "bg-yellow-400"}`} title={m.status === "RUNNING" ? "En Producción" : "En Pausa"} />
                    </div>
                    
                    {m.order?.productName && (
                        <div className="text-xs font-semibold text-indigo-600 mb-2 truncate flex justify-between items-center">
                            <span>{m.order.productName}</span>
                            <span className="text-slate-500 font-normal px-2 py-0.5 bg-slate-100 rounded-md">Etapa: {m.area}</span>
                        </div>
                    )}

                    <div className="space-y-1 text-sm text-slate-600 mb-3">
                        <div className="flex items-center gap-2">
                            <span className="w-4 text-center">🏭</span>
                            <span className="font-medium text-slate-800">{m.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-4 text-center">👤</span>
                            <span className="text-slate-800">{m.order?.operatorName}</span>
                        </div>
                    </div>

                    {/* Mini Progress */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-indigo-600">{progress}%</span>
                            <span className="text-slate-400">{m.metrics.totalUnits.toLocaleString()} / {m.order?.targetUnits?.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>
               );
            })
          ) : (
             <div className="text-center py-10 text-slate-400">No se encontraron OTs activas.</div>
          )}
        </div>
      </div>

      {/* RIGHT: Details Panel */}
      {selectedMachine && selectedMachine.order && (
        <div className="w-2/3 animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="h-full rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className={`p-6 md:px-8 text-white flex justify-between items-start shrink-0 ${selectedMachine.status === "RUNNING" ? "bg-slate-900" : "bg-yellow-600"}`}>
                <div className="w-full">
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-2xl font-bold">{selectedMachine.order.id}</h2>
                        <span className={`text-xs px-2.5 py-1 rounded-md uppercase font-bold tracking-wider ${
                            selectedMachine.status === "RUNNING" ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" : "bg-white/20 text-white"
                        }`}>
                            {selectedMachine.status === "RUNNING" ? "En Producción" : "En Pausa"}
                        </span>
                        <span className="text-slate-400 ml-2">({selectedMachine.name})</span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                        <div>
                            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Cliente</p>
                            <p className="font-medium text-white">{selectedMachine.order.client || "No especificado"}</p>
                        </div>
                        <div>
                            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Producto / SKU</p>
                            <p className="font-medium text-white">{selectedMachine.order.productName} <span className="text-white/70">({selectedMachine.order.sku || "N/A"})</span></p>
                        </div>
                        <div>
                            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Creada El</p>
                            <p className="font-medium text-white">
                                {selectedMachine.order.createdAt 
                                    ? format(new Date(selectedMachine.order.createdAt), "dd MMM yyyy, HH:mm", { locale: es }) 
                                    : "Desconocida"}
                            </p>
                        </div>
                        <div>
                            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Objetivo</p>
                            <p className="font-medium text-white">{selectedMachine.order.targetUnits?.toLocaleString() || 0} Unidades</p>
                        </div>
                    </div>
                </div>
                <button onClick={() => setSelectedMachineId(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0 ml-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-8 flex-1 overflow-y-auto">
                {/* KPIs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Avance</p>
                        <p className="text-2xl font-bold text-slate-900">{getProgress(selectedMachine.metrics.totalUnits, selectedMachine.order.targetUnits)}%</p>
                        <p className="text-xs text-slate-400 mt-1">{selectedMachine.metrics.totalUnits.toLocaleString()} / {selectedMachine.order.targetUnits?.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Velocidad Actual</p>
                        <p className="text-2xl font-bold text-indigo-600">
                            {selectedMachine.status === "RUNNING" ? selectedMachine.metrics.currentSpeed : 0} <span className="text-sm text-slate-400 font-normal">{selectedMachine.metrics.speedUnit.toUpperCase()}</span>
                        </p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Desviación Estándar</p>
                        <p className={`text-2xl font-bold ${
                            (selectedMachine.metrics.standardDeviation || 0) > 3 ? "text-red-500" : "text-emerald-600"
                        }`}>
                            {selectedMachine.metrics.standardDeviation?.toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Production Flow Stepper */}
                <div className="mb-8 p-6 bg-slate-50 border border-slate-100 rounded-3xl">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Flujo de Producción</h3>
                    {(() => {
                        const currentStage = selectedMachine.area as ProductStage;
                        let etaString = "";
                        if (selectedMachine.status === "RUNNING") {
                            const { totalUnits, currentSpeed } = selectedMachine.metrics;
                            const targetUnits = selectedMachine.order?.targetUnits || 0;
                            if (targetUnits > totalUnits && currentSpeed > 0) {
                                const remainingUnits = targetUnits - totalUnits;
                                const remainingMinutes = remainingUnits / currentSpeed;
                                const now = new Date();
                                const etaDate = new Date(now.getTime() + remainingMinutes * 60000);
                                etaString = format(etaDate, "HH:mm");
                            }
                        }

                        return (
                            <ProductionFlowStepper
                                flow={selectedMachine.order.flow || []}
                                currentStageName={currentStage}
                                status={selectedMachine.status === "RUNNING" ? "RUNNING" : "PAUSED"}
                                stageTimestamps={selectedMachine.order.stageTimestamps}
                                etaString={etaString || undefined}
                            />
                        );
                    })()}
                </div>

                {/* Detailed Stats List & Past Stages Expandables */}
                <div className="space-y-6">
                    {/* Current Stage Summary (Replaces previous static detail view) */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-4 px-1">Detalles de Operación Actual</h3>
                        <div className="bg-white border-2 border-indigo-200 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
                            <button 
                                onClick={() => setIsCurrentExpanded(!isCurrentExpanded)}
                                className="w-full text-left p-4 flex items-center justify-between bg-indigo-50/30 hover:bg-indigo-50/50 transition-colors focus:outline-none"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 w-full">
                                    <div className="flex items-center gap-3 sm:w-1/4">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm relative">
                                            <span className="relative z-10 flex items-center gap-1">
                                                {selectedMachine.order?.stagesDetail ? selectedMachine.order.stagesDetail.length + 1 : 1}
                                            </span>
                                            <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-white ${selectedMachine.status === "RUNNING" ? "bg-emerald-500" : "bg-yellow-500"}`}></div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900">{selectedMachine.area}</h4>
                                            <p className="text-xs text-slate-500">{selectedMachine.name}</p>
                                        </div>
                                    </div>
                                    <div className="hidden sm:block w-px h-8 bg-slate-200"></div>
                                    <div className="grid grid-cols-2 text-sm gap-4 flex-1">
                                        <div>
                                            <p className="text-slate-400 text-[10px] uppercase font-bold">Operador</p>
                                            <p className="font-medium text-slate-700 text-xs">{selectedMachine.order.operatorName}</p>
                                        </div>
                                        <div>
                                            <p className="text-slate-400 text-[10px] uppercase font-bold">Desde</p>
                                            <p className="font-medium text-slate-700 text-xs">
                                                {format(new Date(selectedMachine.order.startTime), "HH:mm")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 pl-4 shrink-0">
                                    <div className="hidden md:flex flex-col items-end">
                                        {selectedMachine.metrics.totalUnits > 0 && <span className="text-sm font-bold text-indigo-600">{selectedMachine.metrics.totalUnits.toLocaleString()} und</span>}
                                        <span className="text-xs text-slate-400">{((new Date().getTime() - new Date(selectedMachine.order.startTime).getTime()) / 3600000).toFixed(1)} h</span>
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isCurrentExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 transition-transform duration-200 ${isCurrentExpanded ? 'rotate-180' : ''}`}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </div>
                                </div>
                            </button>
                            
                            {isCurrentExpanded && (
                                <div className="border-t border-indigo-100 bg-white p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Velocidad Actual</p>
                                            <p className="text-lg font-bold text-slate-900">{selectedMachine.metrics.currentSpeed} <span className="text-xs font-normal text-slate-400">{selectedMachine.metrics.speedUnit}</span></p>
                                        </div>
                                        {selectedMachine.area === "Troquelado" && (
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Salidas / Golpe</p>
                                                <p className="text-lg font-bold text-slate-900">{selectedMachine.order.outputs}</p>
                                            </div>
                                        )}
                                        {selectedMachine.area === "Troquelado" && (
                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 shadow-sm">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Golpes Máquina</p>
                                                <p className="text-lg font-bold text-slate-900">{selectedMachine.metrics.totalHits.toLocaleString()}</p>
                                            </div>
                                        )}
                                        <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 shadow-sm">
                                            <p className="text-[10px] text-indigo-500 uppercase tracking-wider mb-1">Total Producido</p>
                                            <p className="text-lg font-bold text-indigo-600">{selectedMachine.metrics.totalUnits.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {selectedMachine.stops && selectedMachine.stops.length > 0 ? (
                                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                                                <h5 className="font-bold text-slate-700 text-sm">Registro de Paradas (Turno Actual)</h5>
                                                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 font-bold rounded-md">{selectedMachine.stops.length} paradas</span>
                                            </div>
                                            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                                {selectedMachine.stops.slice().reverse().map((stop, sIdx) => (
                                                    <div key={sIdx} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                                            <span className="font-medium text-slate-700 text-sm">{stop.reason}</span>
                                                        </div>
                                                        <div className="flex items-center gap-6 text-sm text-slate-500">
                                                            <span>{stop.startTime} - {stop.endTime}</span>
                                                            <span className="font-medium text-slate-700 w-16 text-right">{stop.duration}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                                            No se han registrado paradas en el turno actual.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expandables for past stages */}
                    {selectedMachine.order.stagesDetail && selectedMachine.order.stagesDetail.length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-lg font-bold text-slate-900 mb-4 px-1">Historial de Etapas Anteriores</h3>
                            <div className="space-y-3">
                                {selectedMachine.order.stagesDetail.map((stage: DemoStageDetail, idx: number) => {
                                    const isExpanded = expandedStage === idx;
                                    const durationMs = new Date(stage.endTime).getTime() - new Date(stage.startTime).getTime();
                                    const durationHrs = (durationMs / (1000 * 60 * 60)).toFixed(1);

                                    return (
                                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
                                            <button 
                                                onClick={() => setExpandedStage(isExpanded ? null : idx)}
                                                className="w-full text-left p-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors focus:outline-none"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900">{stage.stageName}</h4>
                                                            <p className="text-xs text-slate-500">{stage.machineName || "Logística"}</p>
                                                        </div>
                                                    </div>
                                                    <div className="hidden sm:block w-px h-8 bg-slate-200"></div>
                                                    <div className="grid grid-cols-2 text-sm gap-4">
                                                        <div>
                                                            <p className="text-slate-400 text-[10px] uppercase">Operador</p>
                                                            <p className="font-medium text-slate-700 text-xs">{stage.workerName || "Almacén"}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-400 text-[10px] uppercase">Horario</p>
                                                            <p className="font-medium text-slate-700 text-xs">
                                                                {format(new Date(stage.startTime), "HH:mm")} - {format(new Date(stage.endTime), "HH:mm")}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4">
                                                    <div className="hidden md:flex flex-col items-end">
                                                        {stage.unitsProduced > 0 && <span className="text-sm font-bold text-indigo-600">{stage.unitsProduced.toLocaleString()} und</span>}
                                                        <span className="text-xs text-slate-400">{durationHrs} h</span>
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </button>
                                            
                                            {isExpanded && (
                                                <div className="border-t border-slate-100 bg-slate-50/50 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {stage.unitsProduced > 0 && (
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Velocidad Promedio</p>
                                                                <p className="text-lg font-bold text-slate-900">{stage.averageSpeed} <span className="text-xs font-normal text-slate-400">{stage.speedUnit}</span></p>
                                                            </div>
                                                            {stage.stageName === "Troquelado" && (
                                                                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Salidas por Golpe</p>
                                                                    <p className="text-lg font-bold text-slate-900">{stage.outputsPerStroke}</p>
                                                                </div>
                                                            )}
                                                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Variabilidad</p>
                                                                <p className="text-lg font-bold text-slate-900">{stage.standardDeviation}</p>
                                                            </div>
                                                            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Producido</p>
                                                                <p className="text-lg font-bold text-indigo-600">{stage.unitsProduced.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {stage.stops && stage.stops.length > 0 && (
                                                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                                            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                                                                <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wide">Registro de Paradas</h5>
                                                                <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 font-bold rounded-md">{stage.stops.length} paradas</span>
                                                            </div>
                                                            <div className="divide-y divide-slate-100">
                                                                {stage.stops.map((stop: Stop, sIdx: number) => (
                                                                    <div key={sIdx} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                                                                            <span className="font-medium text-slate-700 text-xs">{stop.reason}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                                                            <span>{stop.startTime} - {stop.endTime}</span>
                                                                            <span className="font-medium text-slate-700 w-12 text-right">{stop.duration}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
