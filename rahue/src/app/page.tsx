"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { StatCard } from "@/components/stat-card";

interface SeriesPoint {
  timestamp: string;
  count: number;
  incidentMessage?: string | null;
}

interface DashboardData {
  totalCount: number;
  latestCount: number | null;
  latestTimestamp: string | null;
  averagePerMinute: number;
  averagePerHour: number;
  perMinuteSeries: SeriesPoint[];
  perHourSeries: SeriesPoint[];
  rangeStart: string;
  rangeEnd: string;
  incidentTimestamp: string | null;
  incidentLabel: string | null;
}

const fetcher = (url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error("No fue posible obtener los datos");
    }
    return response.json() as Promise<DashboardData>;
  });

const numberFormatter = new Intl.NumberFormat("es-MX");
const averageFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 1,
});

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) return "Sin registro";
  const date = parseISO(timestamp);
  return format(date, "dd/MM/yyyy HH:mm", { locale: es });
}

type ViewMode = "minute" | "hour";

const REFRESH_INTERVAL_MS = 60_000;

function ChartTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0 || !label) {
    return null;
  }

  const date = parseISO(label);
  const value = payload[0]?.value ?? 0;
  const formatted = format(date, "dd MMM yyyy HH:mm", { locale: es });
  const incidentMessage =
    (payload[0]?.payload as SeriesPoint | undefined)?.incidentMessage ?? null;

  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-slate-500">{formatted}</p>
      <p className="text-sm font-semibold text-slate-900">
        {numberFormatter.format(Number(value))}
      </p>
      {incidentMessage ? (
        <p className="mt-1 text-xs font-semibold text-rose-500">
          {incidentMessage}
        </p>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("hour");

  const { data, error, isLoading } = useSWR<DashboardData>(
    "/api/dashboard",
    fetcher,
    {
      refreshInterval: REFRESH_INTERVAL_MS,
      revalidateOnFocus: false,
    }
  );

  const chartSeries = useMemo<SeriesPoint[]>(() => {
    if (!data) return [];
    return viewMode === "minute" ? data.perMinuteSeries : data.perHourSeries;
  }, [data, viewMode]);

  const averageValue = useMemo(() => {
    if (!data) return 0;
    return viewMode === "minute" ? data.averagePerMinute : data.averagePerHour;
  }, [data, viewMode]);

  const periodLabel = useMemo(() => {
    if (!data) return "";
    const start = parseISO(data.rangeStart);
    const end = parseISO(data.rangeEnd);
    return `${format(start, "d MMM", { locale: es })} - ${format(
      end,
      "d MMM yyyy",
      { locale: es }
    )}`;
  }, [data]);

  const dataPointsLabel = useMemo(() => {
    return chartSeries.length > 0
      ? `Mostrando ${chartSeries.length} puntos de datos`
      : "Sin datos disponibles";
  }, [chartSeries.length]);

  const isEmpty = !isLoading && !error && chartSeries.length === 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-slate-900">
            Distribución de Frecuencia de Golpes
          </h1>
          <p className="text-sm text-slate-500">
            Análisis de volumen en tiempo real
          </p>
          {data ? (
            <p className="text-xs text-slate-400">{periodLabel}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode("minute")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "minute"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Por minuto
            </button>
            <button
              type="button"
              onClick={() => setViewMode("hour")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "hour"
                  ? "bg-white text-slate-900 shadow"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Por hora
            </button>
          </div>
          <span className="text-xs font-medium text-slate-400">
            Auto actualización cada 1 minuto
          </span>
        </div>
      </header>

      <section className="grid gap-5 md:grid-cols-3">
        <StatCard
          title="Total de Golpes"
          subtitle="Acumulado en el periodo"
          value={data ? numberFormatter.format(data.totalCount) : "--"}
        />
        <StatCard
          title="Último Registro"
          subtitle={
            data?.latestTimestamp ? "Último evento registrado" : undefined
          }
          value={
            data?.latestCount != null
              ? numberFormatter.format(data.latestCount)
              : "--"
          }
          helper={formatTimestamp(data?.latestTimestamp ?? null)}
        />
        <StatCard
          title="Promedio"
          subtitle={
            viewMode === "minute" ? "Promedio por minuto" : "Promedio por hora"
          }
          value={data ? averageFormatter.format(averageValue) : "--"}
        />
      </section>

      <section className="flex flex-col gap-5 rounded-3xl border border-[#e6e8ee] bg-white p-6 shadow-[0px_16px_40px_rgba(15,23,42,0.05)]">
        <header className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-900">
            Evolución de la Distribución de Frecuencia de Golpes
          </h2>
          <p className="text-sm text-slate-500">
            Visualización {viewMode === "minute" ? "por minuto" : "por hora"}
          </p>
        </header>
        <div className="h-[320px] w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Cargando datos...
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm font-medium text-slate-600">
                No fue posible cargar la información
              </p>
              <p className="text-xs text-slate-400">
                Revisa tu conexión a la base de datos e intenta de nuevo.
              </p>
            </div>
          ) : isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-400">
              Aún no hay datos para mostrar en este periodo.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartSeries}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="countGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eef2ff" strokeDasharray="4 4" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#94a3b8"
                  tickFormatter={(value) => {
                    const date = parseISO(value);
                    return viewMode === "minute"
                      ? format(date, "HH:mm", { locale: es })
                      : format(date, "d MMM HH:mm", { locale: es });
                  }}
                  fontSize={12}
                  minTickGap={20}
                />
                <YAxis
                  stroke="#94a3b8"
                  tickFormatter={(value) =>
                    numberFormatter.format(Number(value))
                  }
                  fontSize={12}
                />
                <Tooltip content={<ChartTooltip />} />
                {data?.incidentTimestamp ? (
                  <ReferenceLine
                    x={data.incidentTimestamp}
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    label={{
                      value: data.incidentLabel ?? "",
                      position: "top",
                      fill: "#ef4444",
                      fontSize: 12,
                      fontWeight: 600,
                      offset: 10,
                    }}
                  />
                ) : null}
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#4f46e5"
                  fillOpacity={1}
                  fill="url(#countGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <footer className="flex flex-col gap-2 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
          <span>{dataPointsLabel}</span>
          <span>
            Actualizado: {formatTimestamp(data?.latestTimestamp ?? null)}
          </span>
        </footer>
      </section>
    </main>
  );
}
