"use client";

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

export function ProcessCard({ item, onClick, onOtClick }: ProcessCardProps) {
    const isWaiting = item.status === "WAITING";
    
    return (
        <div
            onClick={onClick}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] p-4"
        >
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                        item.status === "IN_PROGRESS" ? "bg-indigo-500 animate-pulse" :
                        isWaiting ? "bg-amber-400" :
                        "bg-slate-300"
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

            <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-500">{item.productName}</span>
                {item.timeInStage && (
                    <span className="text-xs font-medium text-slate-400">
                        ⏱ {item.timeInStage}
                    </span>
                )}
            </div>
            
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
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
