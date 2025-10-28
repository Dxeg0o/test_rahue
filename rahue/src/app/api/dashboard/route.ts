import { NextResponse } from "next/server";

type SeriesPoint = {
  timestamp: string;
  count: number;
  incidentMessage?: string | null;
};

type DashboardPayload = {
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
};

const INCIDENT_LABEL = "Pieza defectuosa";
const INCIDENT_MINUTE_INDEX = 60; // Inicio de la segunda hora
const TOTAL_MINUTES = 4 * 60; // 4 horas de datos estáticos

function buildMinuteSeries(startDate: Date): SeriesPoint[] {
  return Array.from({ length: TOTAL_MINUTES }, (_, index) => {
    const timestamp = new Date(startDate.getTime() + index * 60_000);
    let count: number;

    if (index < 60) {
      // Primera hora: flujo casi constante de 7-11 golpes por minuto
      count = 9 + ((index % 5) - 2);
    } else if (index < 120) {
      // Segunda hora: descenso considerable a 2-3 golpes por minuto
      count = 2 + (index % 2);
    } else {
      // Horas restantes: regreso al flujo normal de 7-11 golpes por minuto
      count = 9 + ((index % 5) - 2);
    }

    const incidentMessage =
      index === INCIDENT_MINUTE_INDEX ? INCIDENT_LABEL : null;

    return {
      timestamp: timestamp.toISOString(),
      count,
      incidentMessage,
    };
  });
}

function buildHourSeries(minuteSeries: SeriesPoint[]): SeriesPoint[] {
  const buckets = new Map<number, { total: number; incidentMessage?: string | null }>();

  for (const point of minuteSeries) {
    const date = new Date(point.timestamp);
    date.setMinutes(0, 0, 0);
    const key = date.getTime();
    const bucket = buckets.get(key) ?? { total: 0, incidentMessage: null };
    bucket.total += point.count;
    if (point.incidentMessage) {
      bucket.incidentMessage = point.incidentMessage;
    }
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([time, bucket]) => ({
      timestamp: new Date(time).toISOString(),
      count: bucket.total,
      incidentMessage: bucket.incidentMessage,
    }));
}

export async function GET() {
  const rangeStart = new Date("2024-04-15T08:00:00.000Z");
  const perMinuteSeries = buildMinuteSeries(rangeStart);
  const perHourSeries = buildHourSeries(perMinuteSeries);

  const totalCount = perMinuteSeries.reduce((acc, point) => acc + point.count, 0);
  const latestPoint = perMinuteSeries[perMinuteSeries.length - 1] ?? null;

  const averagePerMinute =
    perMinuteSeries.length > 0 ? totalCount / perMinuteSeries.length : 0;

  const averagePerHour =
    perHourSeries.length > 0
      ? perHourSeries.reduce((acc, point) => acc + point.count, 0) /
        perHourSeries.length
      : 0;

  const incidentTimestamp = perMinuteSeries[INCIDENT_MINUTE_INDEX]?.timestamp ?? null;

  const payload: DashboardPayload = {
    totalCount,
    latestCount: latestPoint?.count ?? null,
    latestTimestamp: latestPoint?.timestamp ?? null,
    averagePerMinute,
    averagePerHour,
    perMinuteSeries,
    perHourSeries,
    rangeStart: rangeStart.toISOString(),
    rangeEnd:
      perMinuteSeries[perMinuteSeries.length - 1]?.timestamp ??
      rangeStart.toISOString(),
    incidentTimestamp,
    incidentLabel: INCIDENT_LABEL,
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
