import { NextResponse } from "next/server";

type SeriesPoint = {
  timestamp: string;
  count: number;
  eventLabel?: string;
};

type ChartAnnotation = {
  timestamp: string;
  label: string;
  description?: string;
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
  annotations: ChartAnnotation[];
};

const TOTAL_MINUTES = 4 * 60;
const DROP_START_MINUTE = 3 * 60;
const START_TIMESTAMP = new Date("2024-04-18T08:00:00.000Z");

function buildMinuteSeries(): SeriesPoint[] {
  return Array.from({ length: TOTAL_MINUTES }, (_, index) => {
    const timestamp = new Date(
      START_TIMESTAMP.getTime() + index * 60 * 1000
    ).toISOString();

    let count: number;

    if (index < DROP_START_MINUTE) {
      const steadyPattern = [7, 8, 9, 10, 11, 9, 8, 10];
      count = steadyPattern[index % steadyPattern.length];
    } else {
      const progress = index - DROP_START_MINUTE;

      if (progress < 10) {
        count = 4;
      } else {
        count = progress % 3 === 0 ? 3 : 2;
      }
    }

    const eventLabel =
      index === DROP_START_MINUTE
        ? "Pieza defectuosa reportada en el formulario de problemas"
        : undefined;

    return {
      timestamp,
      count,
      eventLabel,
    };
  });
}

function buildHourSeries(perMinuteSeries: SeriesPoint[]): SeriesPoint[] {
  const buckets = new Map<number, SeriesPoint>();

  for (const point of perMinuteSeries) {
    const date = new Date(point.timestamp);
    date.setMinutes(0, 0, 0);
    const bucketKey = date.getTime();
    const bucket = buckets.get(bucketKey);

    if (!bucket) {
      buckets.set(bucketKey, {
        timestamp: date.toISOString(),
        count: point.count,
        eventLabel: point.eventLabel,
      });
    } else {
      bucket.count += point.count;
      if (point.eventLabel) {
        bucket.eventLabel = point.eventLabel;
      }
    }
  }

  return Array.from(buckets.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export async function GET() {
  const perMinuteSeries = buildMinuteSeries();
  const perHourSeries = buildHourSeries(perMinuteSeries);

  const totalCount = perMinuteSeries.reduce((acc, point) => acc + point.count, 0);

  const latestPoint = perMinuteSeries[perMinuteSeries.length - 1];
  const latestCount = latestPoint?.count ?? null;
  const latestTimestamp = latestPoint?.timestamp ?? null;

  const averagePerMinute =
    perMinuteSeries.length > 0 ? totalCount / perMinuteSeries.length : 0;

  const averagePerHour =
    perHourSeries.length > 0
      ? perHourSeries.reduce((acc, point) => acc + point.count, 0) /
        perHourSeries.length
      : 0;

  const rangeStart = perMinuteSeries[0]?.timestamp ?? START_TIMESTAMP.toISOString();
  const rangeEnd =
    perMinuteSeries[perMinuteSeries.length - 1]?.timestamp ??
    new Date(START_TIMESTAMP.getTime() + (TOTAL_MINUTES - 1) * 60 * 1000).toISOString();

  const annotations: ChartAnnotation[] = [
    {
      timestamp: new Date(
        START_TIMESTAMP.getTime() + DROP_START_MINUTE * 60 * 1000
      ).toISOString(),
      label: "Pieza defectuosa",
      description:
        "Se reportó una pieza defectuosa en el formulario de problemas de la máquina.",
    },
  ];

  const payload: DashboardPayload = {
    totalCount,
    latestCount,
    latestTimestamp,
    averagePerMinute,
    averagePerHour,
    perMinuteSeries,
    perHourSeries,
    rangeStart,
    rangeEnd,
    annotations,
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
