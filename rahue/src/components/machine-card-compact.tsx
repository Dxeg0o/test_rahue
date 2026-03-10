"use client";

import { MachineState } from "@/lib/demo-context";

interface MachineCardCompactProps {
    machine: MachineState;
    onClick: () => void;
    onOtClick?: () => void;
}

export function MachineCardCompact({ machine, onClick, onOtClick }: MachineCardCompactProps) {
    const getProgress = (current: number, target: number) => {
        if (!target || target === 0) return 0;
        return Math.min(100, Math.round((current / target) * 100));
    };

    const isActive = machine.status === "RUNNING" || machine.order?.status === "PAUSED";
    const isPaused = machine.order?.status === "PAUSED";
    const progress = machine.order?.targetUnits
        ? getProgress(machine.metrics.totalUnits, machine.order.targetUnits)
        : 0;

    const stdDev = machine.metrics.standardDeviation || 0;
    let trafficBg = "bg-green-100 text-green-700";
    if (stdDev > 4) trafficBg = "bg-red-100 text-red-700";
    else if (stdDev > 2) trafficBg = "bg-yellow-100 text-yellow-700";

    return (
        <div
            onClick={onClick}
            className="group relative cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-all hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 active:scale-[0.99]"
        >
            {/* Top row: Name + Status + OT */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    {/* Status indicator */}
                    <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                        machine.status === "RUNNING" ? "bg-green-500 animate-pulse" :
                        isPaused ? "bg-yellow-400 animate-pulse" :
                        "bg-slate-300"
                    }`} />
                    <h3 className="text-sm font-bold text-slate-900 truncate">{machine.name}</h3>
                </div>
                {isActive && machine.order ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onOtClick?.(); }}
                        className="flex-shrink-0 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-mono font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                        {machine.order.id}
                    </button>
                ) : (
                    <span className="flex-shrink-0 rounded-md bg-slate-50 px-2 py-0.5 text-xs text-slate-400">
                        Sin OT
                    </span>
                )}
            </div>

            {isActive && machine.order ? (
                <>
                    {/* Progress bar */}
                    <div className="mb-3">
                        <div className="flex justify-between text-[11px] font-medium mb-1">
                            <span className="text-indigo-600">{progress}%</span>
                            <span className="text-slate-400">
                                {machine.metrics.totalUnits.toLocaleString()} / {machine.order.targetUnits?.toLocaleString()}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Bottom row: Speed + Std Dev */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            {isPaused ? (
                                <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-md">PAUSA</span>
                            ) : (
                                <span className="text-sm font-bold text-slate-900">
                                    {machine.metrics.currentSpeed}
                                    <span className="text-[10px] font-normal text-slate-400 ml-0.5">{machine.metrics.speedUnit}</span>
                                </span>
                            )}
                        </div>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${trafficBg}`}>
                            <span className="mr-0.5">&sigma;</span>{stdDev.toFixed(1)}
                        </span>
                    </div>
                </>
            ) : (
                <p className="text-xs text-slate-400 py-1">Detenida - Esperando turno</p>
            )}
        </div>
    );
}
