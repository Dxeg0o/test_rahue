"use client";

import { format } from "date-fns";
import { ProductStage, StageTimestamps } from "@/lib/demo-context";

interface ProductionFlowStepperProps {
  flow: ProductStage[];
  currentStageName: ProductStage | "COMPLETADO";
  status: "RUNNING" | "PAUSED" | "COMPLETED";
  stageTimestamps?: Record<string, StageTimestamps>;
  etaString?: string;
}

export function ProductionFlowStepper({
  flow,
  currentStageName,
  status,
  stageTimestamps,
  etaString
}: ProductionFlowStepperProps) {
    if (!flow || flow.length === 0) return null;

    return (
        <div className="w-full relative px-2 sm:px-6">
            <div className="flex w-full relative z-10">
                {flow.map((stage, index, flowArr) => {
                    // Si el currentStageName es "COMPLETADO", consideramos que todos los pasos ya pasaron.
                    const currentStageIndex = currentStageName === "COMPLETADO" ? flowArr.length : flowArr.indexOf(currentStageName as ProductStage);
                    
                    const isCompleted = index < currentStageIndex;
                    const isCurrent = index === currentStageIndex;
                    const isLast = index === flowArr.length - 1;
                    const timestamps = stageTimestamps?.[stage];

                    let circleClasses = "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm sm:text-base transition-all relative box-border ";
                    let textClasses = "mt-4 text-sm font-bold text-center ";

                    if (isCompleted || status === "COMPLETED") {
                        circleClasses += "bg-emerald-500 text-white shadow-sm shadow-emerald-200";
                        textClasses += "text-emerald-700";
                    } else if (isCurrent) {
                        circleClasses += status === "RUNNING" 
                            ? "bg-white border-[3px] border-indigo-600 ring-[6px] ring-indigo-50 shadow-sm" 
                            : "bg-white border-[3px] border-yellow-500 ring-[6px] ring-yellow-50 shadow-sm";
                        textClasses += status === "RUNNING" ? "text-indigo-700" : "text-yellow-700";
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
                            {!isLast && (isCompleted || status === "COMPLETED") && (
                                <div className="absolute top-5 sm:top-6 left-1/2 w-full h-[3px] bg-emerald-400 -z-10" />
                            )}

                            <div className={circleClasses}>
                                {isCompleted || status === "COMPLETED" ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 text-white">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                ) : isCurrent ? (
                                    <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full relative z-10 ${status === "RUNNING" ? 'bg-indigo-600' : 'bg-yellow-500'}`} />
                                ) : (
                                    <span className="relative z-10">{index + 1}</span>
                                )}
                            </div>

                            <div className="flex flex-col items-center h-28 pt-1">
                                <span className={textClasses}>
                                    {stage}
                                    {isCurrent && <span className="block text-[11px] font-medium opacity-80 mt-1 font-normal">{status === "RUNNING" ? "(En Curso)" : status === "PAUSED" ? "(En Pausa)" : ""}</span>}
                                </span>
                                <div className="text-[11px] text-center mt-3 font-medium rounded text-slate-500 tracking-tight flex flex-col items-center gap-1.5 w-full">
                                    {(isCompleted || status === "COMPLETED") && timestamps?.start && timestamps?.end ? (
                                        <div className="flex flex-col items-center justify-center space-y-0.5 mt-1">
                                            <span>{format(new Date(timestamps.start), "HH:mm")}</span>
                                            <span className="text-slate-300 font-light leading-none">|</span>
                                            <span>{format(new Date(timestamps.end), "HH:mm")}</span>
                                        </div>
                                    ) : isCurrent && timestamps?.start ? (
                                        <>
                                            <span className={`px-2 py-1 rounded-md font-bold text-[10px] w-full max-w-[90px] ${status === "RUNNING" ? "bg-indigo-50 text-indigo-600 border border-indigo-100" : "bg-yellow-50 text-yellow-700 border border-yellow-100"}`}>
                                                Desde {format(new Date(timestamps.start), "HH:mm")}
                                            </span>
                                            {etaString && status === "RUNNING" && (
                                                <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[10px] w-full max-w-[90px] flex items-center justify-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
                                                    </svg>
                                                    ETA {etaString}
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        <span className="text-slate-300 italic mt-1">Pendiente</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
