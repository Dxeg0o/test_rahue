"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ManagementSection =
  | "planta"
  | "ots"
  | "analytics"
  | "workers"
  | "workflows"
  | "usuarios";

interface CurrentUser {
  id: string;
  nombre: string;
  email: string | null;
  rut: string | null;
  rol: "admin" | "supervisor" | "operador";
}

interface Props {
  activeSection: ManagementSection;
  onSectionChange: (section: ManagementSection) => void;
  userRol?: "admin" | "supervisor" | "operador" | null;
  currentUser?: CurrentUser | null;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

const IconPlanta = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
  </svg>
);

const IconOTs = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const IconWorkflows = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="6" height="5" rx="1" />
    <rect x="16" y="3" width="6" height="5" rx="1" />
    <rect x="9" y="10" width="6" height="5" rx="1" />
    <rect x="2" y="17" width="6" height="5" rx="1" />
    <rect x="16" y="17" width="6" height="5" rx="1" />
    <path d="M8 5.5h8M12 8v2M5 12v5M19 12v5M12 15v2" />
  </svg>
);

const IconUsuarios = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconAnalytics = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M7 15l4-4 3 3 5-7" />
  </svg>
);

const IconWorkersHistory = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M20 8v6" />
    <path d="M17 11h6" />
  </svg>
);

const IconChevron = ({ flipped }: { flipped: boolean }) => (
  <svg
    width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={`transition-transform duration-300 ${flipped ? "rotate-180" : ""}`}
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

// ─── Sidebar structure ────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    group: "Producción",
    items: [
      {
        id: "planta" as ManagementSection,
        label: "Planta en Vivo",
        description: "Monitoreo en tiempo real",
        icon: <IconPlanta />,
        badge: { text: "LIVE", color: "bg-emerald-500" },
      },
    ],
  },
  {
    group: "Gestión",
    items: [
      {
        id: "ots" as ManagementSection,
        label: "Órdenes de Trabajo",
        description: "Creación y seguimiento de OTs",
        icon: <IconOTs />,
        badge: null,
      },
      {
        id: "analytics" as ManagementSection,
        label: "Analítica",
        description: "Historial por periodo",
        icon: <IconAnalytics />,
        badge: null,
      },
      {
        id: "workers" as ManagementSection,
        label: "Trabajadores",
        description: "Historial por operador",
        icon: <IconWorkersHistory />,
        badge: null,
      },
      {
        id: "workflows" as ManagementSection,
        label: "Workflows",
        description: "Flujos por tipo de producto",
        icon: <IconWorkflows />,
        badge: null,
      },
    ],
  },
  {
    group: "Administración",
    items: [
      {
        id: "usuarios" as ManagementSection,
        label: "Usuarios",
        description: "Roles y acceso",
        icon: <IconUsuarios />,
        badge: null,
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ManagementSidebar({ activeSection, onSectionChange, userRol, currentUser }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const visibleGroups = NAV_GROUPS.filter((group) => {
    if (group.group === "Administración") return userRol === "admin";
    return true;
  });

  return (
    <aside
      className={`
        flex flex-col shrink-0 bg-slate-900
        transition-all duration-300 ease-in-out overflow-hidden
        ${collapsed ? "w-[60px]" : "w-[230px]"}
      `}
      style={{ minHeight: "calc(100vh - 3.5rem)" }}
    >
      {/* Collapse toggle */}
      <div
        className={`flex h-12 items-center ${
          collapsed ? "justify-center" : "justify-end px-3"
        }`}
      >
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="flex h-7 w-7 items-center justify-center rounded-md text-white/30 hover:bg-white/8 hover:text-white/60 transition-colors"
        >
          <IconChevron flipped={collapsed} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3">
        {visibleGroups.map((group, gi) => (
          <div key={group.group} className={gi > 0 ? "mt-5" : ""}>
            {/* Group label */}
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/25 select-none">
                {group.group}
              </p>
            )}
            {collapsed && gi > 0 && (
              <div className="mx-3 my-2 h-px bg-white/8" />
            )}

            {/* Items */}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onSectionChange(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`
                        group flex w-full items-center rounded-lg transition-all duration-150
                        ${collapsed ? "h-10 w-10 justify-center mx-auto px-0" : "gap-3 px-3 py-2.5"}
                        ${
                          isActive
                            ? "bg-white/12 text-white"
                            : "text-white/50 hover:bg-white/6 hover:text-white/80"
                        }
                      `}
                    >
                      {/* Icon */}
                      <span
                        className={`shrink-0 transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-white/35 group-hover:text-white/60"
                        }`}
                      >
                        {item.icon}
                      </span>

                      {/* Label + description */}
                      {!collapsed && (
                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium leading-tight">
                              {item.label}
                            </p>
                            {item.badge && (
                              <span
                                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white ${item.badge.color}`}
                              >
                                {item.badge.text}
                              </span>
                            )}
                          </div>
                          <p
                            className={`truncate text-[11px] leading-tight mt-0.5 ${
                              isActive ? "text-white/40" : "text-white/25"
                            }`}
                          >
                            {item.description}
                          </p>
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer: usuario actual + logout */}
      <div className={`border-t border-white/8 ${collapsed ? "px-2 py-3" : "px-4 py-3"}`}>
        {currentUser && !collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar inicial */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                {currentUser.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white/80 leading-tight">{currentUser.nombre}</p>
                <p className="truncate text-[10px] text-white/30 leading-tight mt-0.5">
                  {currentUser.email ?? currentUser.rut ?? ""}
                </p>
              </div>
              {/* Rol badge */}
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                currentUser.rol === "admin" ? "bg-amber-500/20 text-amber-400" :
                currentUser.rol === "supervisor" ? "bg-indigo-500/20 text-indigo-400" :
                "bg-white/10 text-white/30"
              }`}>
                {currentUser.rol}
              </span>
            </div>
            <button
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.href = "/auth/login";
              }}
              className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium text-white/30 hover:bg-white/6 hover:text-white/60 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        ) : collapsed && currentUser ? (
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/auth/login";
            }}
            title="Cerrar sesión"
            className="flex h-7 w-7 mx-auto items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white hover:bg-indigo-700 transition-colors"
          >
            {currentUser.nombre.charAt(0).toUpperCase()}
          </button>
        ) : (
          <p className="text-[10px] text-white/20">Rahue v1.0</p>
        )}
      </div>
    </aside>
  );
}
