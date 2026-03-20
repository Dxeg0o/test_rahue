"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { OTDocument } from "@/lib/history-types";
import { ProductionFlowStepper } from "./production-flow-stepper";

interface OtDetailCardProps {
  ot: OTDocument;
  onClose?: () => void;
  className?: string;
}

export function OtDetailCard({ ot, onClose, className = "" }: OtDetailCardProps) {
  const [expandedStage, setExpandedStage] = useState<number | null>(null);

  if (!ot) return null;

  const statusConfig =
    ot.status === "completada"
      ? {
          label: "Completada",
          badgeClass:
            "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400",
          flowStatus: "COMPLETED" as const,
        }
      : ot.status === "en_proceso"
        ? {
            label: "En Proceso",
            badgeClass:
              "bg-indigo-500/20 border border-indigo-500/30 text-indigo-300",
            flowStatus: "RUNNING" as const,
          }
        : ot.status === "pendiente"
          ? {
              label: "Pendiente",
              badgeClass:
                "bg-amber-500/20 border border-amber-500/30 text-amber-300",
              flowStatus: "PAUSED" as const,
            }
          : {
              label: "Cancelada",
              badgeClass:
                "bg-red-500/20 border border-red-500/30 text-red-300",
              flowStatus: "PAUSED" as const,
            };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
        {/* Header */}
        <div className="bg-slate-900 p-6 md:px-8 text-white flex justify-between items-start shrink-0">
            <div className="w-full">
                <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-2xl font-bold">{ot.id}</h2>
                    <span className={`${statusConfig.badgeClass} text-xs px-2.5 py-1 rounded-md uppercase font-bold tracking-wider`}>
                      {statusConfig.label}
                    </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-2">
                    <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Cliente</p>
                        <p className="font-medium text-slate-200">{ot.client}</p>
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Producto / SKU</p>
                        <p className="font-medium text-slate-200">{ot.productName} <span className="text-slate-400">({ot.sku})</span></p>
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Creada El</p>
                        <p className="font-medium text-slate-200">{format(new Date(ot.createdAt), "dd MMM yyyy, HH:mm", { locale: es })}</p>
                    </div>
                    <div>
                        <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Objetivo</p>
                        <p className="font-medium text-slate-200">{ot.targetUnits.toLocaleString()} Unidades</p>
                    </div>
                </div>
            </div>
            {onClose && (
            <button 
                onClick={onClose}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            )}
        </div>

        {/* Scrollable Body */}
        <div className="p-8 flex-1 overflow-y-auto">
            {/* KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total Producido</p>
                <p className="text-2xl font-bold text-slate-900">{ot.unitsProduced.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">de {ot.targetUnits.toLocaleString()} objetivo</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Ritmo Promedio</p>
                <p className="text-2xl font-bold text-indigo-600">{ot.averageSpeed} <span className="text-sm text-slate-400 font-normal">u/min</span></p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Desv. Estándar</p>
                <p className={`text-2xl font-bold ${ot.standardDeviation > 3 ? "text-red-500" : "text-emerald-600"}`}>{ot.standardDeviation}</p>
            </div>
            </div>

            {/* Production Flow Stepper */}
             <div className="mb-8 p-6 bg-slate-50 border border-slate-100 rounded-3xl mt-8">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Línea de Vida</h3>
                <ProductionFlowStepper
                    flow={ot.flow}
                    currentStageName={ot.currentStageName}
                    status={statusConfig.flowStatus}
                    stageTimestamps={ot.stageTimestamps}
                    stagesDetail={ot.stages}
                />
            </div>

            {/* Detailed Stats List */}
            <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-900 mb-4 px-1">Detalle por Etapa</h3>
                <div className="space-y-3">
                    {ot.stages.map((stage, idx) => {
                        const isExpanded = expandedStage === idx;
                        const durationMs = new Date(stage.endTime).getTime() - new Date(stage.startTime).getTime();
                        const durationHrs = (durationMs / (1000 * 60 * 60)).toFixed(1);

                        return (
                            <div key={idx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md">
                                {/* Expandable Header */}
                                <button 
                                    onClick={() => setExpandedStage(isExpanded ? null : idx)}
                                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors focus:outline-none"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">{stage.stageName}</h4>
                                                <p className="text-sm text-slate-500">{stage.machineName}</p>
                                            </div>
                                        </div>
                                        <div className="hidden sm:block w-px h-8 bg-slate-200"></div>
                                        <div className="grid grid-cols-2 text-sm gap-4 mt-2 sm:mt-0">
                                            <div>
                                                <p className="text-slate-400 text-xs">Operador</p>
                                                <p className="font-medium text-slate-700">{stage.workerName}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400 text-xs">Horario</p>
                                                <p className="font-medium text-slate-700">
                                                    {format(new Date(stage.startTime), "HH:mm")} - {format(new Date(stage.endTime), "HH:mm")}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="hidden md:flex flex-col items-end">
                                            <span className="text-sm font-bold text-indigo-600">{stage.unitsProduced.toLocaleString()} und</span>
                                            <span className="text-xs text-slate-400">{durationHrs} h</span>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                            </svg>
                                        </div>
                                    </div>
                                </button>
                                
                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                                            {/* Sub-KPIs */}
                                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Velocidad Promedio</p>
                                                <p className="text-xl font-bold text-slate-900">{stage.averageSpeed} <span className="text-sm font-normal text-slate-400">{stage.speedUnit}</span></p>
                                            </div>
                                            {stage.stageName === "Troquelado" && (
                                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Salidas por Golpe</p>
                                                    <p className="text-xl font-bold text-slate-900">{stage.outputsPerStroke}</p>
                                                </div>
                                            )}
                                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Variabilidad (Desv)</p>
                                                <p className="text-xl font-bold text-slate-900">{stage.standardDeviation}</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Producido</p>
                                                <p className="text-xl font-bold text-indigo-600">{stage.unitsProduced.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* Stops Table / List */}
                                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                                                <h5 className="font-bold text-slate-700 text-sm">Registro de Paradas</h5>
                                                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 font-bold rounded-md">{stage.stops.length} paradas</span>
                                            </div>
                                            {stage.stops.length > 0 ? (
                                                <div className="divide-y divide-slate-100">
                                                    {stage.stops.map((stop, sIdx) => (
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
                                            ) : (
                                                <div className="p-6 text-center text-sm text-slate-400 italic">
                                                    No se registraron paradas en esta etapa.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
        
        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
            <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">
                Exportar Reporte
            </button>
            <button className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-200">
                Ver Gráficos Completos
            </button>
        </div>
    </div>
  );
}
