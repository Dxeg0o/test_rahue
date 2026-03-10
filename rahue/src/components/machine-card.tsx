"use client";

import { MachineState } from "@/lib/demo-context";

interface MachineCardProps {
    machine: MachineState;
    onClick: () => void;
    onOtClick?: () => void;
}

export function MachineCard({ machine, onClick, onOtClick }: MachineCardProps) {
    const getProgress = (current: number, target: number) => {
        if (!target || target === 0) return 0;
        return Math.min(100, Math.round((current / target) * 100));
    };

    const isActive = machine.status === "RUNNING" || machine.order?.status === "PAUSED";
    const isPaused = machine.order?.status === "PAUSED";

    const progress = machine.order?.targetUnits
        ? getProgress(machine.metrics.totalUnits, machine.order.targetUnits)
        : 0;

    // ETA calculation
    let etaString = "";
    if (machine.status === "RUNNING" && machine.order?.targetUnits) {
        const remaining = machine.order.targetUnits - machine.metrics.totalUnits;
        if (remaining > 0 && machine.metrics.currentSpeed > 0) {
            const mins = remaining / machine.metrics.currentSpeed;
            const eta = new Date(Date.now() + mins * 60000);
            etaString = `${eta.getHours().toString().padStart(2, "0")}:${eta.getMinutes().toString().padStart(2, "0")}`;
        }
    }

    const stdDev = machine.metrics.standardDeviation || 0;
    let devBg = "bg-emerald-50 text-emerald-700";
    let devDot = "bg-emerald-500";
    if (stdDev > 4) { devBg = "bg-red-50 text-red-700"; devDot = "bg-red-500"; }
    else if (stdDev > 2) { devBg = "bg-amber-50 text-amber-700"; devDot = "bg-amber-500"; }

    return (
        <div
            onClick={onClick}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]"
        >
            {isActive && machine.order ? (
                <>
                    {/* Header */}
                    <div className="px-5 pt-4 pb-3">
                        {/* Row 1: Name + OT — same as compact */}
                        <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                                    machine.status === "RUNNING" ? "bg-emerald-500 animate-pulse" :
                                    isPaused ? "bg-amber-400 animate-pulse" :
                                    "bg-slate-300"
                                }`} />
                                <h3 className="text-sm font-bold text-slate-900 truncate">{machine.name}</h3>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onOtClick?.(); }}
                                className="flex-shrink-0 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-mono font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
                            >
                                {machine.order.id}
                            </button>
                        </div>

                        {/* Row 2: Extra info — only in expanded */}
                        <div className="flex items-center gap-2 mb-3 ml-5">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${isPaused ? "bg-amber-500" : "bg-emerald-500"}`}>
                                {isPaused ? "PAUSA" : "ACTIVA"}
                            </span>
                            <span className="text-[11px] text-slate-400 truncate">{machine.order.operatorName}</span>
                        </div>

                        {/* Progress — same structure as compact */}
                        <div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-1.5">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${isPaused ? "bg-amber-400" : "bg-indigo-500"}`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-lg font-black text-slate-900 tabular-nums">{progress}%</span>
                                <span className="text-[11px] text-slate-400 font-medium tabular-nums">
                                    {machine.metrics.totalUnits.toLocaleString()} / {machine.order.targetUnits?.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Metrics footer */}
                    <div className="flex border-t border-slate-100 divide-x divide-slate-100">
                        <div className="flex-1 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Velocidad</p>
                            {isPaused ? (
                                <p className="text-xs font-bold text-amber-600">En pausa</p>
                            ) : (
                                <p className="text-sm font-black text-slate-900 tabular-nums">
                                    {machine.metrics.currentSpeed}
                                    <span className="text-[10px] font-medium text-slate-400 ml-0.5">{machine.metrics.speedUnit}</span>
                                </p>
                            )}
                        </div>
                        <div className="flex-1 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Desviacion</p>
                            <div className="flex items-center gap-1">
                                <span className={`h-1.5 w-1.5 rounded-full ${devDot}`} />
                                <span className={`text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded-md ${devBg}`}>
                                    {stdDev.toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <div className="flex-1 px-3 py-2.5">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">ETA</p>
                            {etaString ? (
                                <p className="text-sm font-black text-emerald-600 tabular-nums">{etaString}</p>
                            ) : (
                                <p className="text-xs font-bold text-slate-300">--:--</p>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="px-5 py-5">
                    <div className="flex items-center gap-2.5 mb-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                        <h3 className="text-sm font-bold text-slate-900">{machine.name}</h3>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Detenida</p>
                            <p className="text-xs text-slate-400">Esperando inicio de turno</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
