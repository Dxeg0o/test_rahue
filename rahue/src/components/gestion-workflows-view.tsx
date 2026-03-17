"use client";

import { useState } from "react";
import { ProductStage } from "@/lib/demo-context";

// ─── Data ─────────────────────────────────────────────────────────────────────

interface WorkflowDef {
  id: string;
  name: string;
  description: string;
  color: {
    bg: string;
    border: string;
    badge: string;
    badgeText: string;
    dot: string;
  };
  stages: ProductStage[];
  activeOTs: number;
  completedThisWeek: number;
  avgCycleHours: number;
}

const WORKFLOWS: WorkflowDef[] = [
  {
    id: "cono",
    name: "Cono",
    description: "Proceso completo de fabricación de conos con todas las etapas productivas.",
    color: {
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      badge: "bg-indigo-100",
      badgeText: "text-indigo-700",
      dot: "bg-indigo-500",
    },
    stages: [
      "Llegada Materiales",
      "Impresión",
      "Troquelado",
      "Formado",
      "Tránsito a Bodega",
      "Entrega Cliente",
    ],
    activeOTs: 2,
    completedThisWeek: 12,
    avgCycleHours: 18,
  },
  {
    id: "tapas",
    name: "Tapas",
    description: "Línea de producción estándar de tapas con ciclo completo.",
    color: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      badge: "bg-emerald-100",
      badgeText: "text-emerald-700",
      dot: "bg-emerald-500",
    },
    stages: [
      "Llegada Materiales",
      "Impresión",
      "Troquelado",
      "Formado",
      "Tránsito a Bodega",
      "Entrega Cliente",
    ],
    activeOTs: 1,
    completedThisWeek: 8,
    avgCycleHours: 16,
  },
  {
    id: "tapas-troqueladas",
    name: "Tapas Troqueladas",
    description: "Flujo simplificado sin etapa de formado, directo a bodega tras troquelado.",
    color: {
      bg: "bg-orange-50",
      border: "border-orange-200",
      badge: "bg-orange-100",
      badgeText: "text-orange-700",
      dot: "bg-orange-500",
    },
    stages: [
      "Llegada Materiales",
      "Impresión",
      "Troquelado",
      "Tránsito a Bodega",
      "Entrega Cliente",
    ],
    activeOTs: 0,
    completedThisWeek: 5,
    avgCycleHours: 12,
  },
];

// ─── Stage icons ─────────────────────────────────────────────────────────────

const STAGE_ICONS: Record<string, React.ReactNode> = {
  "Llegada Materiales": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  Impresión: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  Troquelado: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Formado: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  "Tránsito a Bodega": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
      <rect x="9" y="11" width="14" height="10" rx="2" />
      <circle cx="12" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
    </svg>
  ),
  "Entrega Cliente": (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

// ─── Stage pill ───────────────────────────────────────────────────────────────

function StagePill({ stage }: { stage: ProductStage }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm whitespace-nowrap">
      <span className="text-slate-400">{STAGE_ICONS[stage]}</span>
      {stage}
    </div>
  );
}

function StageArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-300">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// ─── Workflow card ────────────────────────────────────────────────────────────

function WorkflowCard({ wf, expanded, onToggle }: { wf: WorkflowDef; expanded: boolean; onToggle: () => void }) {
  return (
    <div className={`rounded-2xl border bg-white shadow-sm transition-all duration-200 overflow-hidden ${wf.color.border}`}>
      {/* Card header */}
      <div className={`flex items-start justify-between gap-4 p-6 ${wf.color.bg}`}>
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full mt-1 shrink-0 ${wf.color.dot}`} />
          <div>
            <h3 className="text-lg font-bold text-slate-900">{wf.name}</h3>
            <p className="mt-0.5 text-sm text-slate-500">{wf.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${wf.color.badge} ${wf.color.badgeText}`}>
            {wf.stages.length} etapas
          </span>
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
            title={expanded ? "Colapsar" : "Ver detalle"}
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-slate-400 font-medium">OTs Activas</p>
          <p className={`text-2xl font-bold mt-0.5 ${wf.activeOTs > 0 ? "text-blue-600" : "text-slate-400"}`}>
            {wf.activeOTs}
          </p>
        </div>
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-slate-400 font-medium">Completadas / Semana</p>
          <p className="text-2xl font-bold mt-0.5 text-slate-900">{wf.completedThisWeek}</p>
        </div>
        <div className="px-6 py-4 text-center">
          <p className="text-xs text-slate-400 font-medium">Ciclo Promedio</p>
          <p className="text-2xl font-bold mt-0.5 text-slate-900">{wf.avgCycleHours}h</p>
        </div>
      </div>

      {/* Expandable: flow diagram */}
      {expanded && (
        <div className="border-t border-slate-100 px-6 py-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Flujo de producción
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {wf.stages.map((stage, i) => (
              <div key={stage} className="flex items-center gap-2">
                <StagePill stage={stage} />
                {i < wf.stages.length - 1 && <StageArrow />}
              </div>
            ))}
          </div>

          {/* Metadata row */}
          <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Tiempo de ciclo estimado: <strong className="text-slate-700">{wf.avgCycleHours} horas</strong>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Etapas de máquina: <strong className="text-slate-700">
                {wf.stages.filter(s => ["Impresión", "Troquelado", "Formado"].includes(s)).join(", ")}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function GestionWorkflowsView() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const totalActive = WORKFLOWS.reduce((sum, w) => sum + w.activeOTs, 0);
  const totalCompleted = WORKFLOWS.reduce((sum, w) => sum + w.completedThisWeek, 0);

  return (
    <div className="min-h-full bg-slate-50">
      {/* Page header */}
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Workflows</h1>
        <p className="mt-1 text-sm text-slate-500">
          Define y supervisa los flujos de producción por tipo de producto
        </p>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tipos de Producto</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{WORKFLOWS.length}</p>
            <p className="mt-1 text-xs text-slate-400">workflows definidos</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">OTs en Curso</p>
            <p className="mt-1 text-3xl font-bold text-blue-600">{totalActive}</p>
            <p className="mt-1 text-xs text-slate-400">entre todos los flujos</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Completadas / Semana</p>
            <p className="mt-1 text-3xl font-bold text-green-600">{totalCompleted}</p>
            <p className="mt-1 text-xs text-slate-400">últimos 7 días</p>
          </div>
        </div>

        {/* Workflow cards */}
        <div className="space-y-4">
          {WORKFLOWS.map((wf) => (
            <WorkflowCard
              key={wf.id}
              wf={wf}
              expanded={expandedId === wf.id}
              onToggle={() => toggle(wf.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
