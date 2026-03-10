"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useDemo, MachineState } from "@/lib/demo-context";

export function ActiveOts() {
  const { machines } = useDemo();
  const [search, setSearch] = useState("");
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);

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
                            <span className="text-slate-500 font-normal px-2 py-0.5 bg-slate-100 rounded-md">Etapa: Troquelado</span>
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
            <div className={`p-6 text-white flex justify-between items-start shrink-0 ${selectedMachine.status === "RUNNING" ? "bg-slate-900" : "bg-yellow-600"}`}>
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        {selectedMachine.order.id}
                        <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                            selectedMachine.status === "RUNNING" ? "bg-green-500 text-slate-900" : "bg-white/20 text-white"
                        }`}>
                            {selectedMachine.status === "RUNNING" ? "En Producción" : "En Pausa"}
                        </span>
                    </h2>
                    <p className={`mt-1 font-medium ${selectedMachine.status === "RUNNING" ? "text-slate-400" : "text-yellow-100"}`}>
                        {selectedMachine.name}
                    </p>
                </div>
                <button onClick={() => setSelectedMachineId(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
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
                            {selectedMachine.status === "RUNNING" ? selectedMachine.metrics.currentSpeed : 0} <span className="text-sm text-slate-400 font-normal">GPM</span>
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
                    <div className="w-full relative px-2 sm:px-6">
                        <div className="flex w-full relative z-10">
                            {selectedMachine.order.flow?.map((stage, index, flowArr) => {
                                const currentStageIndex = flowArr.indexOf("Troquelado");
                                const isCompleted = index < currentStageIndex;
                                const isCurrent = index === currentStageIndex;
                                const isLast = index === flowArr.length - 1;
                                const timestamps = selectedMachine.order!.stageTimestamps?.[stage];

                                let circleClasses = "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all relative box-border ";
                                let textClasses = "mt-4 text-sm font-bold text-center ";

                                if (isCompleted) {
                                    circleClasses += "bg-emerald-500 text-white shadow-sm shadow-emerald-200";
                                    textClasses += "text-emerald-700";
                                } else if (isCurrent) {
                                    circleClasses += selectedMachine.status === "RUNNING" 
                                        ? "bg-white border-[3px] border-indigo-600 ring-[6px] ring-indigo-50 shadow-sm" 
                                        : "bg-white border-[3px] border-yellow-500 ring-[6px] ring-yellow-50 shadow-sm";
                                    textClasses += selectedMachine.status === "RUNNING" ? "text-indigo-700" : "text-yellow-700";
                                } else {
                                    circleClasses += "bg-white border-2 border-slate-200 text-slate-500";
                                    textClasses += "text-slate-500";
                                }

                                return (
                                    <div key={stage} className="relative flex flex-col items-center flex-1">
                                        {/* Forward connecting line */}
                                        {!isLast && (
                                            <div className="absolute top-5 sm:top-6 left-1/2 w-full h-[3px] bg-slate-200 -z-10" />
                                        )}
                                        {!isLast && isCompleted && (
                                            <div className="absolute top-5 sm:top-6 left-1/2 w-full h-[3px] bg-emerald-400 -z-10" />
                                        )}

                                        <div className={circleClasses}>
                                            {isCompleted ? (
                                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 text-white">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                </svg>
                                            ) : isCurrent ? (
                                                <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full relative z-10 ${selectedMachine.status === "RUNNING" ? 'bg-indigo-600' : 'bg-yellow-500'}`} />
                                            ) : (
                                                <span className="relative z-10">{index + 1}</span>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-center h-24 pt-1">
                                            <span className={textClasses}>
                                                {stage}
                                                {isCurrent && <span className="block text-[11px] font-medium opacity-80 mt-1 font-normal">{selectedMachine.status === "RUNNING" ? "(En Curso)" : "(En Pausa)"}</span>}
                                            </span>
                                            <div className="text-[11px] text-center mt-3 font-medium rounded text-slate-500 tracking-tight">
                                                {isCompleted && timestamps?.end && timestamps?.start ? (
                                                    <div className="flex flex-col items-center justify-center space-y-0.5">
                                                        <span>{format(new Date(timestamps.start), "HH:mm")}</span>
                                                        <span className="text-slate-300 font-light leading-none">|</span>
                                                        <span>{format(new Date(timestamps.end), "HH:mm")}</span>
                                                    </div>
                                                ) : isCurrent && timestamps?.start ? (
                                                    <span className={`px-3 py-1.5 rounded-full font-bold ${selectedMachine.status === "RUNNING" ? "bg-indigo-100 text-indigo-700" : "bg-yellow-100 text-yellow-800"}`}>
                                                        Desde {format(new Date(timestamps.start), "HH:mm")}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-300 italic">Pendiente</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Detailed Stats List */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">Detalles de la Orden</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-slate-500">Operador</p>
                                <p className="font-medium text-slate-900">{selectedMachine.order.operatorName}</p>
                                <p className="text-xs text-slate-400">{selectedMachine.order.operatorRut}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Hora Inicio</p>
                                <p className="font-medium">{format(new Date(selectedMachine.order.startTime), "HH:mm:ss")}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Salidas por Golpe</p>
                                <p className="font-medium">{selectedMachine.order.outputs}</p>
                            </div>
                            <div>
                                <p className="text-slate-500">Golpes Totales Reales</p>
                                <p className="font-medium">{selectedMachine.metrics.totalHits.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {selectedMachine.stops && selectedMachine.stops.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">Últimas Paradas</h3>
                            <div className="space-y-2">
                                {selectedMachine.stops.slice(-3).reverse().map((stop, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg text-sm border border-slate-100">
                                        <div>
                                            <span className="font-medium text-slate-700">{stop.reason}</span>
                                            <div className="text-xs text-slate-400 mt-0.5">{stop.startTime} - {stop.endTime}</div>
                                        </div>
                                        <div className="font-mono text-slate-500 bg-white px-2 py-1 rounded border shadow-sm">
                                            {stop.duration}
                                        </div>
                                    </div>
                                ))}
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
