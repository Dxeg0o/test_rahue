"use client";

import { HistoryByTime } from "./history-by-time";

export function AnaliticaView() {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-900">Analítica</h1>
        <p className="mt-1 text-sm text-slate-500">
          Producción histórica por fecha y periodo
        </p>
      </div>

      <div className="px-8 py-6">
        <HistoryByTime />
      </div>
    </div>
  );
}
