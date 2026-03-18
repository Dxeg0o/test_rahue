"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { logout } from "@/app/auth/actions";

export function DemoWizard() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Hide entirely in embed mode or on auth pages
  if (searchParams.get("embed") === "true") return null;
  if (pathname.startsWith("/auth")) return null;

  const navLinks = [
    { label: "Gestión", href: "/", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    )},
    { label: "Operario", href: "/operator", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    )},
  ];

  return (
    <>
      {/* Spacer to push content down */}
      <div className="h-14 w-full" />

      {/* Fixed Navbar */}
      <nav className="fixed top-0 left-0 w-full z-[100] h-14 bg-slate-900 shadow-md">
        <div className="h-full px-5 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/logo-completo.svg"
              alt="Rahue"
              className="h-7"
              style={{ filter: "brightness(0) invert(1)" }}
            />
            <div className="h-5 w-px bg-white/15" />
            <span className="text-white/50 text-xs font-medium tracking-wider uppercase hidden sm:block">
              Gestión Operacional
            </span>
          </div>

          {/* Nav Links + Logout */}
          <div className="flex items-center gap-1">
            {navLinks.map(({ label, href, icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-white/50 hover:bg-white/8 hover:text-white/80"
                  }`}
                >
                  <span className={isActive ? "text-white" : "text-white/40"}>{icon}</span>
                  {label}
                </Link>
              );
            })}
            <div className="h-5 w-px bg-white/10 mx-2" />
            <form action={logout}>
              <button
                type="submit"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium text-white/40 hover:bg-red-500/15 hover:text-red-400 transition-all duration-150"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Salir
              </button>
            </form>
          </div>
        </div>
      </nav>
    </>
  );
}
