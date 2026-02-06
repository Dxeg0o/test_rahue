"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { OTDocument } from "@/lib/mockOtData";

interface OtDetailCardProps {
  ot: OTDocument;
  onClose?: () => void;
  className?: string;
}

export function OtDetailCard({ ot, onClose, className = "" }: OtDetailCardProps) {
  if (!ot) return null;

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-start shrink-0">
            <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
                {ot.id}
                <span className="bg-green-500 text-slate-900 text-xs px-2 py-0.5 rounded uppercase font-bold tracking-wider">Completada</span>
            </h2>
            <p className="text-slate-400 mt-1">{ot.machineName}</p>
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
                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Calidad</p>
                <p className="text-2xl font-bold text-emerald-600">{ot.quality}%</p>
            </div>
            </div>

            {/* Detailed Stats List */}
            <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">Detalles de Tiempo</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-slate-500">Fecha</p>
                        <p className="font-medium capitalize">{format(new Date(ot.startTime), "EEEE d 'de' MMMM", { locale: es })}</p>
                    </div>
                    <div>
                        <p className="text-slate-500">Duración Turno</p>
                        <p className="font-medium">
                        {((new Date(ot.endTime).getTime() - new Date(ot.startTime).getTime()) / (1000 * 60 * 60)).toFixed(1)} horas
                        </p>
                    </div>
                    <div>
                        <p className="text-slate-500">Hora Inicio</p>
                        <p className="font-medium">{format(new Date(ot.startTime), "HH:mm:ss")}</p>
                    </div>
                    <div>
                        <p className="text-slate-500">Hora Fin</p>
                        <p className="font-medium">{format(new Date(ot.endTime), "HH:mm:ss")}</p>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-slate-900 mb-3 border-b pb-2">Operador Responsable</h3>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">
                    {ot.workerName.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-slate-900">{ot.workerName}</p>
                        <p className="text-slate-500 text-sm">Operador Maquinista</p>
                    </div>
                </div>
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
