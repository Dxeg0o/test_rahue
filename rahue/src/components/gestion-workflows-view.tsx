"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EtapaDB {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  tipoMetrica: string;
  unidadDisplay: string | null;
  icono: string | null;
}

interface WorkflowStageDB {
  id: string;
  etapaId: string;
  nombre: string;
  etapaNombre: string;
  orden: number;
  requiereMaquina: boolean;
  icono: string | null;
  categoria: string;
}

interface WorkflowDef {
  id: string;
  name: string;
  description: string;
  colorKey: ColorKey;
  stages: WorkflowStageDB[];
  activeOTs: number;
  completedThisWeek: number;
  avgCycleHours: number;
}

// ─── Colors ───────────────────────────────────────────────────────────────────

type ColorKey = "indigo" | "emerald" | "orange" | "rose" | "violet" | "sky" | "amber";

const COLOR_MAP: Record<ColorKey, {
  bg: string; border: string; badge: string; badgeText: string; dot: string; swatch: string;
}> = {
  indigo:  { bg: "bg-indigo-50",  border: "border-indigo-200",  badge: "bg-indigo-100",  badgeText: "text-indigo-700",  dot: "bg-indigo-500",  swatch: "bg-indigo-500"  },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100", badgeText: "text-emerald-700", dot: "bg-emerald-500", swatch: "bg-emerald-500" },
  orange:  { bg: "bg-orange-50",  border: "border-orange-200",  badge: "bg-orange-100",  badgeText: "text-orange-700",  dot: "bg-orange-500",  swatch: "bg-orange-500"  },
  rose:    { bg: "bg-rose-50",    border: "border-rose-200",    badge: "bg-rose-100",    badgeText: "text-rose-700",    dot: "bg-rose-500",    swatch: "bg-rose-500"    },
  violet:  { bg: "bg-violet-50",  border: "border-violet-200",  badge: "bg-violet-100",  badgeText: "text-violet-700",  dot: "bg-violet-500",  swatch: "bg-violet-500"  },
  sky:     { bg: "bg-sky-50",     border: "border-sky-200",     badge: "bg-sky-100",     badgeText: "text-sky-700",     dot: "bg-sky-500",     swatch: "bg-sky-500"     },
  amber:   { bg: "bg-amber-50",   border: "border-amber-200",   badge: "bg-amber-100",   badgeText: "text-amber-700",   dot: "bg-amber-400",   swatch: "bg-amber-400"   },
};

// ─── Stage icons ──────────────────────────────────────────────────────────────

const STAGE_ICONS: Record<string, React.ReactNode> = {
  truck: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  printer: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  scissors: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  box: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  warehouse: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
      <rect x="9" y="11" width="14" height="10" rx="2" />
      <circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    </svg>
  ),
  "package-check": (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
};

function getStageIcon(icono: string | null | undefined): React.ReactNode {
  if (!icono) return null;
  return STAGE_ICONS[icono] ?? null;
}

// ─── Flow preview (mini) ──────────────────────────────────────────────────────

function FlowPreview({ stages, small }: { stages: WorkflowStageDB[]; small?: boolean }) {
  if (stages.length === 0)
    return <p className="text-xs text-slate-400 italic">Sin etapas configuradas</p>;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {stages.map((s, i) => (
        <div key={`${s.etapaId}-${i}`} className="flex items-center gap-1.5">
          <div className={`flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700 shadow-sm ${small ? "text-[11px]" : "text-xs font-medium"}`}>
            <span className="text-slate-400">{getStageIcon(s.icono)}</span>
            {s.nombre}
          </div>
          {i < stages.length - 1 && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-300">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

interface ModalProps {
  workflow?: WorkflowDef;
  etapas: EtapaDB[];
  saving: boolean;
  onSave: (data: { name: string; description: string; colorKey: ColorKey; stages: { etapaId: string; nombrePaso?: string; requiereMaquina?: boolean }[] }) => void;
  onClose: () => void;
}

function WorkflowModal({ workflow, etapas, saving, onSave, onClose }: ModalProps) {
  const isEdit = !!workflow;
  const [name, setName] = useState(workflow?.name ?? "");
  const [description, setDescription] = useState(workflow?.description ?? "");
  const [colorKey, setColorKey] = useState<ColorKey>(workflow?.colorKey ?? "indigo");
  const [selectedStages, setSelectedStages] = useState<{ etapaId: string; nombre: string; icono: string | null }[]>(
    workflow?.stages.map((s) => ({ etapaId: s.etapaId, nombre: s.etapaNombre, icono: s.icono })) ?? []
  );
  const [error, setError] = useState("");

  const addStage = (etapa: EtapaDB) => {
    if (!selectedStages.some((s) => s.etapaId === etapa.id)) {
      setSelectedStages((prev) => [...prev, { etapaId: etapa.id, nombre: etapa.nombre, icono: etapa.icono }]);
    }
  };

  const removeStage = (i: number) => {
    setSelectedStages((prev) => prev.filter((_, idx) => idx !== i));
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    setSelectedStages((prev) => {
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  };

  const moveDown = (i: number) => {
    if (i === selectedStages.length - 1) return;
    setSelectedStages((prev) => {
      const next = [...prev];
      [next[i], next[i + 1]] = [next[i + 1], next[i]];
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim()) { setError("El nombre es obligatorio."); return; }
    if (selectedStages.length < 2) { setError("Agrega al menos 2 etapas."); return; }
    onSave({
      name: name.trim(),
      description: description.trim(),
      colorKey,
      stages: selectedStages.map((s) => ({ etapaId: s.etapaId })),
    });
  };

  const colors: ColorKey[] = ["indigo", "emerald", "orange", "rose", "violet", "sky", "amber"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEdit ? "Editar Workflow" : "Nuevo Workflow"}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {isEdit ? "Modifica el flujo de producción" : "Define las etapas del proceso productivo"}
            </p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Nombre del tipo de producto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                placeholder="Ej: Cono, Tapas, Bandeja..."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Descripción</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción breve del flujo (opcional)"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Color de identificación</label>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColorKey(c)}
                    className={`h-7 w-7 rounded-full transition-all ${COLOR_MAP[c].swatch} ${
                      colorKey === c ? "ring-2 ring-offset-2 ring-slate-400 scale-110" : "opacity-70 hover:opacity-100"
                    }`}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Stage builder */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-1">Etapas disponibles</p>
              <p className="text-xs text-slate-400 mb-3">Haz clic en una etapa para agregarla al flujo</p>
              <div className="flex flex-wrap gap-2">
                {etapas.map((et) => {
                  const added = selectedStages.some((s) => s.etapaId === et.id);
                  return (
                    <button
                      key={et.id}
                      onClick={() => addStage(et)}
                      disabled={added}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        added
                          ? "border-slate-100 bg-slate-50 text-slate-300 cursor-default"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-900 hover:bg-slate-900 hover:text-white shadow-sm cursor-pointer"
                      }`}
                    >
                      <span>{getStageIcon(et.icono)}</span>
                      {et.nombre}
                      {!added && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5">
                          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      )}
                      {added && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-0.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Configured flow */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">
                Flujo configurado
                {selectedStages.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-slate-400">{selectedStages.length} etapa{selectedStages.length !== 1 ? "s" : ""}</span>
                )}
              </p>

              {selectedStages.length === 0 ? (
                <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-8 text-sm text-slate-400">
                  Agrega etapas desde el listado de arriba
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  {selectedStages.map((s, i) => (
                    <div
                      key={`${s.etapaId}-${i}`}
                      className={`flex items-center gap-3 px-4 py-3 bg-white ${
                        i < selectedStages.length - 1 ? "border-b border-slate-100" : ""
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                        {i + 1}
                      </span>
                      <span className="text-slate-400 shrink-0">{getStageIcon(s.icono)}</span>
                      <span className="flex-1 text-sm font-medium text-slate-800">{s.nombre}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => moveUp(i)} disabled={i === 0} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-default transition-colors" title="Subir">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                        </button>
                        <button onClick={() => moveDown(i)} disabled={i === selectedStages.length - 1} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-default transition-colors" title="Bajar">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                        </button>
                        <button onClick={() => removeStage(i)} className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors ml-1" title="Eliminar">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            {selectedStages.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Vista previa del flujo</p>
                <FlowPreview stages={selectedStages.map((s, i) => ({
                  id: "",
                  etapaId: s.etapaId,
                  nombre: s.nombre,
                  etapaNombre: s.nombre,
                  orden: i + 1,
                  requiereMaquina: false,
                  icono: s.icono,
                  categoria: "",
                }))} small />
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-7 py-4">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-slate-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear Workflow"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete confirmation ───────────────────────────────────────────────────────

function DeleteConfirm({ name, deleting, onConfirm, onCancel }: { name: string; deleting: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Eliminar workflow</h3>
            <p className="text-sm text-slate-500 mt-0.5">Esta acción no se puede deshacer</p>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          ¿Seguro que deseas eliminar el workflow <strong>&ldquo;{name}&rdquo;</strong>?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={deleting} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50">
            {deleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Workflow card ────────────────────────────────────────────────────────────

function WorkflowCard({
  wf,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}: {
  wf: WorkflowDef;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const c = COLOR_MAP[wf.colorKey] ?? COLOR_MAP.indigo;

  return (
    <div className={`rounded-2xl border bg-white shadow-sm transition-all duration-200 overflow-hidden ${c.border}`}>
      {/* Header */}
      <div className={`flex items-start justify-between gap-4 px-6 py-5 ${c.bg}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-2.5 w-2.5 rounded-full shrink-0 mt-0.5 ${c.dot}`} />
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 truncate">{wf.name}</h3>
            {wf.description && (
              <p className="mt-0.5 text-sm text-slate-500 truncate">{wf.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.badge} ${c.badgeText}`}>
            {wf.stages.length} etapas
          </span>
          <button onClick={onEdit} title="Editar" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button onClick={onDelete} title="Eliminar" className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M9 6V4h6v2" />
            </svg>
          </button>
          <button onClick={onToggle} title={expanded ? "Colapsar" : "Ver flujo"} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
        <div className="px-5 py-4 text-center">
          <p className="text-[11px] text-slate-400 font-medium">OTs Activas</p>
          <p className={`text-2xl font-bold mt-0.5 ${wf.activeOTs > 0 ? "text-blue-600" : "text-slate-400"}`}>
            {wf.activeOTs}
          </p>
        </div>
        <div className="px-5 py-4 text-center">
          <p className="text-[11px] text-slate-400 font-medium">Completadas / Semana</p>
          <p className="text-2xl font-bold mt-0.5 text-slate-900">{wf.completedThisWeek}</p>
        </div>
        <div className="px-5 py-4 text-center">
          <p className="text-[11px] text-slate-400 font-medium">Ciclo Promedio</p>
          <p className="text-2xl font-bold mt-0.5 text-slate-900">{wf.avgCycleHours}h</p>
        </div>
      </div>

      {/* Expandable flow */}
      {expanded && (
        <div className="border-t border-slate-100 px-6 py-5 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Flujo de producción
          </p>
          <FlowPreview stages={wf.stages} />
          <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-3 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              Ciclo estimado: <strong className="text-slate-700">{wf.avgCycleHours}h</strong>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Máquinas: <strong className="text-slate-700">
                {wf.stages.filter(s => s.requiereMaquina || ["impresion", "troquelado", "formado"].includes(s.categoria)).map(s => s.nombre).join(", ") || "—"}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function GestionWorkflowsView() {
  const [workflows, setWorkflows] = useState<WorkflowDef[]>([]);
  const [etapas, setEtapas] = useState<EtapaDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingWf, setEditingWf] = useState<WorkflowDef | undefined>(undefined);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/workflows");
      if (!res.ok) throw new Error("Error al cargar workflows");
      const data = await res.json();
      setWorkflows(data.workflows ?? []);
      setEtapas(data.etapas ?? []);
    } catch (e) {
      console.error(e);
      setErrorMsg("Error al cargar workflows");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const openCreate = () => { setEditingWf(undefined); setModalMode("create"); };
  const openEdit = (wf: WorkflowDef) => { setEditingWf(wf); setModalMode("edit"); };
  const closeModal = () => { setModalMode(null); setEditingWf(undefined); };

  const handleSave = async (data: { name: string; description: string; colorKey: ColorKey; stages: { etapaId: string; nombrePaso?: string; requiereMaquina?: boolean }[] }) => {
    setSaving(true);
    setErrorMsg("");
    try {
      const isEdit = modalMode === "edit" && editingWf;
      const res = await fetch("/api/admin/workflows", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { id: editingWf.id, ...data } : data),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || "Error al guardar");
        return;
      }

      closeModal();
      await fetchWorkflows();
    } catch (e) {
      setErrorMsg("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/admin/workflows?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || "Error al eliminar");
        return;
      }
      setDeletingId(null);
      if (expandedId === id) setExpandedId(null);
      await fetchWorkflows();
    } catch (e) {
      setErrorMsg("Error de conexión");
    } finally {
      setDeleting(false);
    }
  };

  const totalActive = workflows.reduce((s, w) => s + w.activeOTs, 0);
  const totalCompleted = workflows.reduce((s, w) => s + w.completedThisWeek, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="text-sm text-slate-500">Cargando workflows...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-full bg-slate-50">
        {/* Page header */}
        <div className="border-b border-slate-200 bg-white px-8 py-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Gestión de Workflows</h1>
            <p className="mt-1 text-sm text-slate-500">
              Define y supervisa los flujos de producción por tipo de producto
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700 transition-colors shadow-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nuevo Workflow
          </button>
        </div>

        <div className="px-8 py-6 space-y-6">
          {/* Error banner */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errorMsg}
              <button onClick={() => setErrorMsg("")} className="ml-auto text-red-400 hover:text-red-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tipos de Producto</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{workflows.length}</p>
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
          {workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 space-y-3">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
                <rect x="2" y="3" width="6" height="5" rx="1" /><rect x="16" y="3" width="6" height="5" rx="1" />
                <rect x="9" y="10" width="6" height="5" rx="1" /><rect x="2" y="17" width="6" height="5" rx="1" />
                <rect x="16" y="17" width="6" height="5" rx="1" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-500">No hay workflows configurados</p>
                <p className="text-xs text-slate-400 mt-1">Crea el primer workflow para comenzar</p>
              </div>
              <button onClick={openCreate} className="mt-2 flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Crear Workflow
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {workflows.map((wf) => (
                <WorkflowCard
                  key={wf.id}
                  wf={wf}
                  expanded={expandedId === wf.id}
                  onToggle={() => setExpandedId((prev) => (prev === wf.id ? null : wf.id))}
                  onEdit={() => openEdit(wf)}
                  onDelete={() => setDeletingId(wf.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {(modalMode === "create" || modalMode === "edit") && (
        <WorkflowModal
          workflow={editingWf}
          etapas={etapas}
          saving={saving}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {deletingId && (
        <DeleteConfirm
          name={workflows.find((w) => w.id === deletingId)?.name ?? ""}
          deleting={deleting}
          onConfirm={() => handleDelete(deletingId)}
          onCancel={() => setDeletingId(null)}
        />
      )}
    </>
  );
}
