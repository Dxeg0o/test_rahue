import { NextResponse } from "next/server";

const MINUTES_PER_HOUR = 60;
const TOTAL_HOURS = 4;
const START_TIMESTAMP = new Date("2024-06-01T08:00:00.000Z");

type SeriesPoint = {
  timestamp: string;
  count: number;
};

type MachineEvent = {
  timestamp: string;
  title: string;
  description: string;
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
  events: MachineEvent[];
};

function buildSeries(): { series: SeriesPoint[]; events: MachineEvent[] } {
  const perMinuteSeries: SeriesPoint[] = [];

  const steadyPattern = [7, 9, 8, 10, 11, 9, 8, 10];
  const lowPattern = [3, 2, 3, 2, 3, 2];

  for (let minute = 0; minute < TOTAL_HOURS * MINUTES_PER_HOUR; minute += 1) {
    const timestamp = new Date(
      START_TIMESTAMP.getTime() + minute * 60 * 1000
    );

    let count = 0;

    if (minute < MINUTES_PER_HOUR) {
      count = steadyPattern[minute % steadyPattern.length];
    } else if (minute < MINUTES_PER_HOUR * 2) {
      count = lowPattern[minute % lowPattern.length];
    } else {
      count = steadyPattern[minute % steadyPattern.length];
    }

    perMinuteSeries.push({ timestamp: timestamp.toISOString(), count });
  }

  const disruptionTimestamp = new Date(
    START_TIMESTAMP.getTime() + MINUTES_PER_HOUR * 60 * 1000
  ).toISOString();

  const events: MachineEvent[] = [
    {
      timestamp: disruptionTimestamp,
      title: "Pieza defectuosa",
      description:
        "Se registró un problema en el formulario de la máquina: \"Pieza defectuosa\".",
    },
  ];

  return { series: perMinuteSeries, events };
}

export async function GET() {
  const { series: perMinuteSeries, events } = buildSeries();

  const totalCount = perMinuteSeries.reduce(
    (acc, point) => acc + point.count,
    0
  );

  const latestPoint = perMinuteSeries[perMinuteSeries.length - 1] ?? null;
  const latestCount = latestPoint?.count ?? null;
  const latestTimestamp = latestPoint?.timestamp ?? null;

  const averagePerMinute =
    perMinuteSeries.length > 0
      ? totalCount / perMinuteSeries.length
      : 0;

  const hourBuckets = new Map<string, number>();

  for (const point of perMinuteSeries) {
    const hour = new Date(point.timestamp);
    hour.setMinutes(0, 0, 0);
    const key = hour.toISOString();
    const currentValue = hourBuckets.get(key) ?? 0;
    hourBuckets.set(key, currentValue + point.count);
  }

  const perHourSeries: SeriesPoint[] = Array.from(hourBuckets.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([timestamp, count]) => ({ timestamp, count }));

  const averagePerHour =
    perHourSeries.length > 0
      ? perHourSeries.reduce((acc, point) => acc + point.count, 0) /
        perHourSeries.length
      : 0;

  const payload: DashboardPayload = {
    totalCount,
    latestCount,
    latestTimestamp,
    averagePerMinute,
    averagePerHour,
    perMinuteSeries,
    perHourSeries,
    rangeStart: perMinuteSeries[0]?.timestamp ?? START_TIMESTAMP.toISOString(),
    rangeEnd:
      perMinuteSeries[perMinuteSeries.length - 1]?.timestamp ??
      START_TIMESTAMP.toISOString(),
    events,
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
