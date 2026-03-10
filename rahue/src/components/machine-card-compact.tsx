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
    let devBg = "bg-emerald-50 text-emerald-700";
    let devDot = "bg-emerald-500";
    if (stdDev > 4) { devBg = "bg-red-50 text-red-700"; devDot = "bg-red-500"; }
    else if (stdDev > 2) { devBg = "bg-amber-50 text-amber-700"; devDot = "bg-amber-500"; }

    return (
        <div
            onClick={onClick}
            className="group relative cursor-pointer rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-all hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 active:scale-[0.99]"
        >
            {/* Header: Name + OT */}
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                        machine.status === "RUNNING" ? "bg-emerald-500 animate-pulse" :
                        isPaused ? "bg-amber-400 animate-pulse" :
                        "bg-slate-300"
                    }`} />
                    <h3 className="text-sm font-bold text-slate-900 truncate">{machine.name}</h3>
                </div>
                {isActive && machine.order ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onOtClick?.(); }}
                        className="flex-shrink-0 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-mono font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                        {machine.order.id}
                    </button>
                ) : (
                    <span className="flex-shrink-0 rounded-lg bg-slate-50 px-2 py-0.5 text-xs text-slate-400">
                        Sin OT
                    </span>
                )}
            </div>

            {isActive && machine.order ? (
                <>
                    {/* Progress */}
                    <div className="mb-3">
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-1">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${isPaused ? "bg-amber-400" : "bg-indigo-500"}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between items-baseline">
                            <span className="text-sm font-black text-slate-900 tabular-nums">{progress}%</span>
                            <span className="text-[11px] text-slate-400 font-medium tabular-nums">
                                {machine.metrics.totalUnits.toLocaleString()} / {machine.order.targetUnits?.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Metrics row */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                        {isPaused ? (
                            <span className="text-xs font-bold text-amber-600">En pausa</span>
                        ) : (
                            <span className="text-sm font-black text-slate-900 tabular-nums">
                                {machine.metrics.currentSpeed}
                                <span className="text-[10px] font-medium text-slate-400 ml-0.5">{machine.metrics.speedUnit}</span>
                            </span>
                        )}
                        <div className="flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${devDot}`} />
                            <span className={`text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md ${devBg}`}>
                                {stdDev.toFixed(1)}
                            </span>
                        </div>
                    </div>
                </>
            ) : (
                <p className="text-xs text-slate-400 py-1">Detenida - Esperando turno</p>
            )}
        </div>
    );
}
