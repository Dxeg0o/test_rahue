import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  subtitle?: string;
  value: string;
  helper?: string;
  icon?: ReactNode;
}

export function StatCard({ title, subtitle, value, helper, icon }: StatCardProps) {
  return (
    <article className="flex flex-col gap-3 rounded-3xl border border-[#e6e8ee] bg-white p-6 shadow-[0px_16px_40px_rgba(15,23,42,0.05)]">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-500">{title}</span>
          {subtitle ? (
            <span className="text-xs text-slate-400">{subtitle}</span>
          ) : null}
        </div>
        {icon}
      </header>
      <div className="flex flex-col gap-1">
        <span className="text-4xl font-semibold text-slate-900">{value}</span>
        {helper ? (
          <span className="text-xs text-slate-400">{helper}</span>
        ) : null}
      </div>
    </article>
  );
}
