"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { StageTimestamps } from "@/lib/demo-context";
import { getWorkflowProgressSummary } from "@/lib/workflow-progress";

interface ProcessItemProps {
  id: string;
  productName: string;
  stageName: string;
  operatorName: string;
  status: "IN_PROGRESS" | "WAITING" | "COMPLETED";
  timeInStage?: string;
  flow: string[];
  currentStageName: string;
  stageTimestamps?: Record<string, StageTimestamps>;
}

interface ProcessCardProps {
  item: ProcessItemProps;
  onClick?: () => void;
  onOtClick?: () => void;
}

const STATUS_LABELS = {
  completed: "Completada",
  current: "En curso",
  skipped: "Omitida",
  pending: "Pendiente",
} as const;

function formatStageWindow(timestamps?: StageTimestamps) {
  if (!timestamps?.start) return "Sin registro";
  if (!timestamps.end) return `Desde ${format(new Date(timestamps.start), "HH:mm")}`;
  return `${format(new Date(timestamps.start), "HH:mm")} - ${format(new Date(timestamps.end), "HH:mm")}`;
}

export function ProcessCard({ item, onClick, onOtClick }: ProcessCardProps) {
  const isWaiting = item.status === "WAITING";
  const isLlegadaMateriales = item.stageName === "Llegada Materiales";
  const [expanded, setExpanded] = useState(false);

  const workflowProgress = useMemo(
    () =>
      getWorkflowProgressSummary({
        flow: item.flow,
        currentStageName: item.currentStageName,
        status: item.status === "WAITING" ? "PAUSED" : "RUNNING",
        stageTimestamps: item.stageTimestamps,
      }),
    [item.currentStageName, item.flow, item.stageTimestamps, item.status]
  );

  if (isLlegadaMateriales) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div
          role="button"
          onClick={() => setExpanded((value) => !value)}
          className="w-full p-4 hover:bg-slate-50/60 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                  item.status === "IN_PROGRESS"
                    ? "bg-indigo-500 animate-pulse"
                    : isWaiting
                      ? "bg-amber-400"
                      : "bg-emerald-500"
                }`}
              />
              <h3 className="text-sm font-bold text-slate-900">Llegada Materiales</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOtClick?.();
                }}
                className="flex-shrink-0 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-mono font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
              >
                {item.id}
              </button>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-2.5">{item.productName}</p>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border bg-slate-50 border-slate-200 text-slate-600">
              Etapas {workflowProgress.processedCount}/{workflowProgress.totalCount}
            </span>
            {workflowProgress.skippedCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold border bg-slate-100 border-slate-300 text-slate-500">
                Omitidas {workflowProgress.skippedCount}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
                item.status === "IN_PROGRESS"
                  ? "bg-indigo-500"
                  : isWaiting
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
            >
              {item.status === "IN_PROGRESS"
                ? "EN CURSO"
                : isWaiting
                  ? "EN ESPERA"
                  : "COMPLETADO"}
            </span>
          </div>
        </div>

        {expanded && (
          <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Actual
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {item.currentStageName}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Encargado
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {item.operatorName}
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-50 rounded-xl border border-slate-100 overflow-hidden bg-white">
              {workflowProgress.stages.map((stage) => (
                <div key={stage.stageName} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{stage.stageName}</p>
                    <p className="text-[10px] text-slate-400">
                      {formatStageWindow(stage.timestamps)}
                    </p>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      stage.state === "completed"
                        ? "bg-emerald-50 text-emerald-700"
                        : stage.state === "current"
                          ? "bg-indigo-50 text-indigo-700"
                          : stage.state === "skipped"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-slate-50 text-slate-400"
                    }`}
                  >
                    {STATUS_LABELS[stage.state]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99] p-4"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
              item.status === "IN_PROGRESS"
                ? "bg-indigo-500 animate-pulse"
                : isWaiting
                  ? "bg-amber-400"
                  : "bg-slate-300"
            }`}
          />
          <h3 className="text-sm font-bold text-slate-900 truncate">{item.stageName}</h3>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOtClick?.();
          }}
          className="flex-shrink-0 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-mono font-bold text-indigo-600 hover:bg-indigo-100 transition-colors"
        >
          {item.id}
        </button>
      </div>

      <div className="flex justify-between items-center mb-3 gap-2">
        <span className="text-xs font-medium text-slate-500 truncate">{item.productName}</span>
        {item.timeInStage && (
          <span className="text-xs font-medium text-slate-400 flex-shrink-0">
            ⏱ {item.timeInStage}
          </span>
        )}
      </div>

      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-2 mb-3 ${
          item.status === "IN_PROGRESS"
            ? "bg-indigo-50 border border-indigo-100"
            : isWaiting
              ? "bg-amber-50 border border-amber-100"
              : "bg-emerald-50 border border-emerald-100"
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${
            item.status === "IN_PROGRESS"
              ? "bg-indigo-100"
              : isWaiting
                ? "bg-amber-100"
                : "bg-emerald-100"
          }`}
        >
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
        <span
          className={`text-xs font-medium ${
            item.status === "IN_PROGRESS"
              ? "text-indigo-700"
              : isWaiting
                ? "text-amber-700"
                : "text-emerald-700"
          }`}
        >
          {item.status === "IN_PROGRESS"
            ? "Paso en curso"
            : isWaiting
              ? "Esperando inicio"
              : "Completado"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${
              item.status === "IN_PROGRESS"
                ? "bg-indigo-500"
                : isWaiting
                  ? "bg-amber-500"
                  : "bg-slate-400"
            }`}
          >
            {item.status === "IN_PROGRESS"
              ? "ACTIVO"
              : item.status === "WAITING"
                ? "EN ESPERA"
                : "COMPLETADO"}
          </span>
          <span className="text-[11px] font-medium text-slate-500 truncate">
            Encargado: {item.operatorName}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-slate-500">
          {workflowProgress.processedCount}/{workflowProgress.totalCount} etapas
        </span>
      </div>
    </div>
  );
}
