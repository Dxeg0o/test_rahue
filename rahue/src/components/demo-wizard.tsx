"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

export function DemoWizard() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Hide entirely in embed mode
  if (searchParams.get("embed") === "true") return null;

  const navLinks = [
    { label: "Gestión", href: "/" },
    { label: "Operario", href: "/operator" },
  ];

  return (
    <>
      {/* Spacer to push content down */}
      <div className="h-16 w-full" />

      {/* Fixed Navbar */}
      <nav className="fixed top-0 left-0 w-full z-[100] bg-slate-900 border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <span className="text-white font-bold text-lg tracking-tight select-none">
            Gestión Operacional Rahue
          </span>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navLinks.map(({ label, href }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-white text-slate-900"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
