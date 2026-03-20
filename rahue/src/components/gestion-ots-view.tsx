"use client";

import { useState } from "react";
import { useDemo } from "@/lib/demo-context";

type OTTab = "pendientes" | "activas";

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  RUNNING:    { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500" },
  PAUSED:     { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
  WARMING_UP: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  IDLE:       { bg: "bg-slate-50",  text: "text-slate-500",  dot: "bg-slate-400" },
  COMPLETED:  { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
};

const STATUS_LABELS: Record<string, string> = {
  RUNNING:    "En Producción",
  PAUSED:     "En Pausa",
  WARMING_UP: "Calentando",
  IDLE:       "Inactiva",
  COMPLETED:  "Completada",
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS["IDLE"];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  sublabel?: string;
  accent: string;
}

function StatCard({ label, value, sublabel, accent }: StatCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent}`}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function GestionOtsView() {
  const { machines, pendingOts, plantStats } = useDemo();
  const [tab, setTab] = useState<OTTab>("pendientes");
  const [search, setSearch] = useState("");

  const activeMachines = machines.filter((m) => m.order !== null);

  const statsData = [
    {
      label: "Pendientes",
      value: pendingOts.length,
      sublabel: "por iniciar",
      accent: "text-amber-600",
    },
    {
      label: "En Proceso",
      value: activeMachines.length,
      sublabel: `${activeMachines.filter((m) => m.order?.status === "RUNNING").length} activas`,
      accent: "text-blue-600",
    },
    {
      label: "Completadas Hoy",
      value: plantStats.completedToday,
      sublabel: "en este turno",
      accent: "text-green-600",
    },
    {
      label: "Total Completadas",
      value: plantStats.completedWeek,
      sublabel: "historial completo",
      accent: "text-slate-900",
    },
  ];

  const filteredPending = pendingOts.filter(
    (ot) =>
      ot.id.toLowerCase().includes(search.toLowerCase()) ||
      ot.client.toLowerCase().includes(search.toLowerCase()) ||
      ot.product.toLowerCase().includes(search.toLowerCase())
  );

  const filteredActive = activeMachines.filter(
    (m) =>
      m.order!.id.toLowerCase().includes(search.toLowerCase()) ||
      (m.order!.client ?? "").toLowerCase().includes(search.toLowerCase()) ||
      m.order!.productName.toLowerCase().includes(search.toLowerCase())
  );

  const tabs: { id: OTTab; label: string; count: number }[] = [
    { id: "pendientes", label: "Pendientes", count: pendingOts.length },
    { id: "activas",    label: "En Proceso", count: activeMachines.length },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      {/* Page header */}
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Órdenes de Trabajo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Administra, supervisa y controla el ciclo de vida de las OTs
        </p>
      </div>

      <div className="px-8 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statsData.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                  tab === t.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    tab === t.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-300 text-slate-600"
                  }`}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative max-w-xs w-full">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar OT, cliente, producto…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {tab === "pendientes" ? (
            filteredPending.length === 0 ? (
              <EmptyState message="No hay OTs pendientes" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <Th>Orden</Th>
                    <Th>Cliente</Th>
                    <Th>Producto / SKU</Th>
                    <Th>Meta</Th>
                    <Th>Salidas/Golpe</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPending.map((ot, i) => (
                    <tr
                      key={ot.id}
                      className={`border-b border-slate-50 transition-colors hover:bg-slate-50 ${
                        i === filteredPending.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                        {ot.id}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">{ot.client}</td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800">{ot.product}</p>
                        <p className="text-xs text-slate-400 font-mono">{ot.sku}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {ot.target.toLocaleString("es-CL")} und.
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 text-center">
                        {ot.outputs}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status="IDLE" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            filteredActive.length === 0 ? (
              <EmptyState message="No hay OTs activas en este momento" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <Th>Orden</Th>
                    <Th>Cliente</Th>
                    <Th>Producto</Th>
                    <Th>Máquina</Th>
                    <Th>Operador</Th>
                    <Th>Estado</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActive.map((m, i) => (
                    <tr
                      key={m.id}
                      className={`border-b border-slate-50 transition-colors hover:bg-slate-50 ${
                        i === filteredActive.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                        {m.order!.id}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {m.order!.client ?? "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {m.order!.productName}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium">
                        {m.name}
                      </td>
                      <td className="px-5 py-3.5 text-slate-700">
                        {m.order!.operatorName}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={m.order!.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <svg className="mx-auto mb-3 text-slate-300" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}
