"use client";

import { MachineState } from "@/lib/demo-context";

interface MachineCardProps {
    machine: MachineState;
    onClick: () => void;
}

export function MachineCard({ machine, onClick }: MachineCardProps) {
    const getProgress = (current: number, target: number) => {
        if (!target || target === 0) return 0;
        return Math.min(100, Math.round((current / target) * 100));
    };

    const progress = machine.order && machine.order.targetUnits 
        ? getProgress(machine.metrics.totalUnits, machine.order.targetUnits) 
        : 0;

    // Calculate Traffic Light based on Std Dev
    const stdDev = machine.metrics.standardDeviation || 0;
    let trafficColor = "text-green-500";
    if (stdDev > 4) trafficColor = "text-red-500";
    else if (stdDev > 2) trafficColor = "text-yellow-500";
        
    return (
        <div 
        onClick={onClick}
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
                                    <>{machine.metrics.currentSpeed} <span className="text-xs font-normal text-slate-500">{machine.metrics.speedUnit}</span></>
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
}
