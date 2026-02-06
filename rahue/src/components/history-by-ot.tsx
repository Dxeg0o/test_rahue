"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import type { OTDocument } from "@/lib/mockOtData";
import { OtDetailCard } from "./ot-detail-card";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function HistoryByOt() {
  const [search, setSearch] = useState("");
  const [selectedOt, setSelectedOt] = useState<OTDocument | null>(null);

  const { data: ots, isLoading } = useSWR<OTDocument[]>(
    `/api/history/ot?limit=100&q=${encodeURIComponent(search)}`,
    fetcher
  );

  return (
    <div className="flex h-[calc(100vh-220px)] gap-6">
      {/* LEFT: List */}
      <div className={`flex flex-col gap-4 transition-all duration-300 ${selectedOt ? "w-1/3" : "w-full"}`}>
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por OT, Operador..."
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pl-10 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-3 top-3.5 h-4 w-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-slate-200">
          {isLoading ? (
            <div className="text-center py-10 text-slate-400">Cargando historial...</div>
          ) : ots && ots.length > 0 ? (
            ots.map((ot) => (
              <div
                key={ot.id}
                onClick={() => setSelectedOt(ot)}
                className={`cursor-pointer rounded-xl border p-4 transition-all hover:shadow-md ${
                  selectedOt?.id === ot.id
                    ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                    : "border-slate-200 bg-white hover:border-indigo-300"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-900">{ot.id}</span>
                  <span className="text-xs font-mono text-slate-400">
                    {format(new Date(ot.startTime), "dd/MM/yyyy")}
                  </span>
                </div>
                
                <div className="space-y-1 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center">👤</span>
                    <span className="font-medium text-slate-800">{ot.workerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center">📦</span>
                    <span className="text-emerald-600 font-bold">{ot.unitsProduced.toLocaleString()} un.</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
             <div className="text-center py-10 text-slate-400">No se encontraron OTs.</div>
          )}
        </div>
      </div>

      {/* RIGHT: Details Panel */}
      {selectedOt && (
        <div className="w-2/3 animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="h-full rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden flex flex-col">
            <OtDetailCard ot={selectedOt} onClose={() => setSelectedOt(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
