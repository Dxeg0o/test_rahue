"use client";

import { useState, useMemo } from "react";

const TINTAS = [
    "Cyan",
    "Magenta",
    "Amarillo (Y)",
    "Negro (K)",
    "Barniz UV",
    "Blanco de Cobertura",
];

const PAPEL = [
    "Bobina 1",
    "Bobina 2",
];

const CONFIRMADORES = [
    "Ana Torres",
    "Luis Vega",
    "María González",
    "Carlos López",
    "Paula Ramos",
];

interface ProcessItemProps {
    id: string;
    productName: string;
    stageName: string;
    operatorName: string;
    status: "IN_PROGRESS" | "WAITING" | "COMPLETED";
    timeInStage?: string;
}

interface ProcessCardProps {
    item: ProcessItemProps;
    onClick?: () => void;
    onOtClick?: () => void;
}

interface SubtaskData {
    label: string;
    completed: boolean;
    completedBy?: string;
    completedAt?: string;
    quantity?: string;
}

function SubtaskItem({ label, completed, completedBy, completedAt, quantity }: SubtaskData) {
    return (
        <div className="flex items-start gap-2.5 px-1.5 py-1.5">
            <div className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center ${
                completed ? "bg-emerald-500 border-emerald-500" : "border-slate-200 bg-white"
            }`}>
                {completed && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-2.5 h-2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-medium ${completed ? "text-slate-600" : "text-slate-400 italic"}`}>
                        {label}
                    </span>
                    {quantity && (
                        <span className={`text-xs flex-shrink-0 font-semibold ${completed ? "text-slate-500" : "text-slate-300"}`}>
                            {quantity}
                        </span>
                    )}
                </div>
                {completed && completedBy ? (
                    <p className="text-[10px] text-slate-400 mt-0.5">{completedBy} · {completedAt}</p>
                ) : !completed ? (
                    <p className="text-[10px] text-slate-300 mt-0.5">Pendiente</p>
                ) : null}
            </div>
        </div>
    );
}

export function ProcessCard({ item, onClick, onOtClick }: ProcessCardProps) {
    const isWaiting = item.status === "WAITING";
    const isLlegadaMateriales = item.stageName === "Llegada Materiales";
    const [expanded, setExpanded] = useState(false);

    const { tintas, papel, tintasOk, papelOk, allDone } = useMemo(() => {
        const hash = item.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        const tintasCount =
            item.status === "COMPLETED" ? TINTAS.length :
            item.status === "IN_PROGRESS" ? (hash % 3) + 3 : 0;
        const papelCount =
            item.status === "COMPLETED" ? PAPEL.length :
            item.status === "IN_PROGRESS" ? (hash % 2) + 1 : 0;

        // Base time ~2h ago, each confirmed item ~15min apart
        const baseMs = Date.now() - 2 * 60 * 60 * 1000;

        const buildSubtask = (label: string, index: number, completed: boolean, unit: string): SubtaskData => {
            const confHash = label.split("").reduce((a, c) => a + c.charCodeAt(0), hash);
            const qty = unit === "kg" ? (confHash % 8) + 2 : (confHash % 400) + 300;
            const quantity = `${qty} ${unit}`;
            if (!completed) return { label, completed: false, quantity };
            const completedBy = CONFIRMADORES[confHash % CONFIRMADORES.length];
            const completedAt = new Date(baseMs + index * 15 * 60 * 1000)
                .toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
            return { label, completed: true, completedBy, completedAt, quantity };
        };

        return {
            tintas: TINTAS.map((t, i) => buildSubtask(t, i, i < tintasCount, "kg")),
            papel: PAPEL.map((p, i) => buildSubtask(p, i, i < papelCount, "m")),
            tintasOk: tintasCount,
            papelOk: papelCount,
            allDone: tintasCount === TINTAS.length && papelCount === PAPEL.length,
        };
    }, [item.id, item.status]);

    // ── Llegada Materiales: collapsible subtasks ──────────────────────────
    if (isLlegadaMateriales) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Always-visible header (click to expand) */}
                <div
                    role="button"
                    onClick={() => setExpanded(v => !v)}
                    className="w-full p-4 hover:bg-slate-50/60 transition-colors cursor-pointer select-none"
                >
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                                allDone ? "bg-emerald-500" :
                                item.status === "IN_PROGRESS" ? "bg-indigo-500 animate-pulse" :
                                isWaiting ? "bg-amber-400" : "bg-slate-300"
                            }`} />
                            <h3 className="text-sm font-bold text-slate-900">Llegada Materiales</h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onOtClick?.(); }}
                                className="flex-shrink-0 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-mono font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
                            >
                                {item.id}
                            </button>
                            <svg
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                                strokeWidth={2} stroke="currentColor"
                                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                        </div>
                    </div>

                    <p className="text-xs text-slate-500 mb-2.5">{item.productName}</p>

                    {/* Collapsed summary badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                            tintasOk === TINTAS.length
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}>
                            Tintas {tintasOk}/{TINTAS.length}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                            papelOk === PAPEL.length
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-slate-50 border-slate-200 text-slate-600"
                        }`}>
                            Papel {papelOk}/{PAPEL.length}
                        </span>
                        {allDone && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-emerald-500 text-white">
                                ✓ LISTO
                            </span>
                        )}
                    </div>
                </div>

                {/* Expanded subtasks */}
                {expanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                        {/* Tintas */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Tintas ({tintasOk}/{TINTAS.length})
                            </p>
                            <div className="divide-y divide-slate-50">
                                {tintas.map((t) => (
                                    <SubtaskItem key={t.label} {...t} />
                                ))}
                            </div>
                        </div>

                        {/* Papel */}
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                Papel ({papelOk}/{PAPEL.length})
                            </p>
                            <div className="divide-y divide-slate-50">
                                {papel.map((p) => (
                                    <SubtaskItem key={p.label} {...p} />
                                ))}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
                                allDone ? "bg-emerald-500" :
                                item.status === "IN_PROGRESS" ? "bg-indigo-500" :
                                isWaiting ? "bg-amber-500" : "bg-slate-400"
                            }`}>
                                {allDone ? "LISTO" : item.status === "IN_PROGRESS" ? "EN CURSO" : "EN ESPERA"}
                            </span>
                            <span className="text-[11px] font-medium text-slate-500 truncate">{item.operatorName}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── Other non-machine stages: step card ───────────────────────────────
    return (
        <div
            onClick={onClick}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] p-4"
        >
            <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                        item.status === "IN_PROGRESS" ? "bg-indigo-500 animate-pulse" :
                        isWaiting ? "bg-amber-400" : "bg-slate-300"
                    }`} />
                    <h3 className="text-sm font-bold text-slate-900 truncate">{item.stageName}</h3>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onOtClick?.(); }}
                    className="flex-shrink-0 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-mono font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                    {item.id}
                </button>
            </div>

            <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-medium text-slate-500">{item.productName}</span>
                {item.timeInStage && (
                    <span className="text-xs font-medium text-slate-400">
                        ⏱ {item.timeInStage}
                    </span>
                )}
            </div>

            {/* Step status */}
            <div className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-3 ${
                item.status === "IN_PROGRESS" ? "bg-indigo-50 border border-indigo-100" :
                isWaiting ? "bg-amber-50 border border-amber-100" :
                "bg-emerald-50 border border-emerald-100"
            }`}>
                <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${
                    item.status === "IN_PROGRESS" ? "bg-indigo-100" :
                    isWaiting ? "bg-amber-100" : "bg-emerald-100"
                }`}>
                    {item.status === "IN_PROGRESS" ? (
                        <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                    ) : isWaiting ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-amber-600">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3 h-3 text-emerald-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                    )}
                </div>
                <span className={`text-xs font-medium ${
                    item.status === "IN_PROGRESS" ? "text-indigo-700" :
                    isWaiting ? "text-amber-700" : "text-emerald-700"
                }`}>
                    {item.status === "IN_PROGRESS" ? "Paso en curso" : isWaiting ? "Esperando inicio" : "Completado"}
                </span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
                    item.status === "IN_PROGRESS" ? "bg-indigo-500" :
                    isWaiting ? "bg-amber-500" : "bg-slate-400"
                }`}>
                    {item.status === "IN_PROGRESS" ? "ACTIVO" : item.status === "WAITING" ? "EN ESPERA" : "COMPLETADO"}
                </span>
                <span className="text-[11px] font-medium text-slate-500 truncate mt-0.5">Encargado: {item.operatorName}</span>
            </div>
        </div>
    );
}
