"use client";

import { useState } from "react";

export type ManagementSection = "planta" | "ots" | "workflows" | "usuarios";

interface Props {
  activeSection: ManagementSection;
  onSectionChange: (section: ManagementSection) => void;
  userRol?: "admin" | "supervisor" | "operador" | null;
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

export function ManagementSidebar({ activeSection, onSectionChange, userRol }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const visibleGroups = NAV_GROUPS.filter((group) => {
    if (group.group === "Administración") return userRol === "admin";
    return true;
  });

  return (
    <aside
      className={`
        flex flex-col shrink-0 bg-white border-r border-slate-200
        transition-all duration-300 ease-in-out overflow-hidden
        ${collapsed ? "w-[60px]" : "w-[220px]"}
      `}
      style={{ minHeight: "calc(100vh - 4rem)" }}
    >
      {/* Header / Collapse toggle */}
      <div
        className={`flex h-12 items-center border-b border-slate-100 ${
          collapsed ? "justify-center" : "justify-between px-4"
        }`}
      >
        {!collapsed && (
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Menú
          </span>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expandir menú" : "Colapsar menú"}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <IconChevron flipped={collapsed} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        {visibleGroups.map((group, gi) => (
          <div key={group.group} className={gi > 0 ? "mt-4" : ""}>
            {/* Group label */}
            {!collapsed && (
              <p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400 select-none">
                {group.group}
              </p>
            )}
            {collapsed && gi > 0 && (
              <div className="mx-3 my-2 h-px bg-slate-100" />
            )}

            {/* Items */}
            <ul className="space-y-0.5 px-2">
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
                            ? "bg-slate-900 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }
                      `}
                    >
                      {/* Icon */}
                      <span
                        className={`shrink-0 transition-colors ${
                          isActive
                            ? "text-white"
                            : "text-slate-400 group-hover:text-slate-600"
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
                              isActive ? "text-slate-400" : "text-slate-400"
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

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="text-[10px] text-slate-400">Sistema RAHUE v1.0</p>
        </div>
      )}
    </aside>
  );
}
