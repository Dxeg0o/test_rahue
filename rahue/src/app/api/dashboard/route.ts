import { NextResponse } from "next/server";

type DashboardEvent = {
  timestamp: string;
  title: string;
  description: string;
};

type SeriesPoint = {
  timestamp: string;
  count: number;
  event?: DashboardEvent;
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
  events: DashboardEvent[];
};

const TOTAL_MINUTES = 4 * 60;
const DECLINE_START_MINUTE = 60;

function buildStaticSeries() {
  const now = new Date();
  const rangeStart = new Date(now.getTime() - (TOTAL_MINUTES - 1) * 60_000);
  const declineStart = new Date(
    rangeStart.getTime() + DECLINE_START_MINUTE * 60_000
  );

  const event: DashboardEvent = {
    timestamp: declineStart.toISOString(),
    title: "Pieza defectuosa",
    description:
      "Se reportó en el formulario de problemas de la máquina: \"Pieza defectuosa\".",
  };

  const steadyPattern = [8, 9, 7, 10, 11, 9, 8, 10];
  const declineDuration = TOTAL_MINUTES - DECLINE_START_MINUTE;

  const perMinuteSeries: SeriesPoint[] = Array.from(
    { length: TOTAL_MINUTES },
    (_, index) => {
      const timestamp = new Date(rangeStart.getTime() + index * 60_000);

      let count: number;
      if (index < DECLINE_START_MINUTE) {
        count = steadyPattern[index % steadyPattern.length];
      } else {
        const progress =
          declineDuration > 1
            ? (index - DECLINE_START_MINUTE) / (declineDuration - 1)
            : 1;
        const base = 7.5 - progress * 5.5; // from ~7.5 down to ~2.0
        const modulation = ((index - DECLINE_START_MINUTE) % 5) * 0.15;
        count = Math.max(2, Math.round(base - modulation));
      }

      const point: SeriesPoint = {
        timestamp: timestamp.toISOString(),
        count,
      };

      if (index === DECLINE_START_MINUTE) {
        point.event = event;
      }

      return point;
    }
  );

  const perHourBuckets = new Map<number, SeriesPoint>();

  for (const point of perMinuteSeries) {
    const timestamp = new Date(point.timestamp);
    timestamp.setMinutes(0, 0, 0);
    const bucketKey = timestamp.getTime();
    const existing = perHourBuckets.get(bucketKey);

    if (existing) {
      existing.count += point.count;
      if (point.event && !existing.event) {
        existing.event = point.event;
      }
    } else {
      perHourBuckets.set(bucketKey, {
        timestamp: timestamp.toISOString(),
        count: point.count,
        event: point.event,
      });
    }
  }

  const perHourSeries = Array.from(perHourBuckets.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return { perMinuteSeries, perHourSeries, rangeStart, rangeEnd: now, event };
}

export async function GET() {
  const { perMinuteSeries, perHourSeries, rangeStart, rangeEnd, event } =
    buildStaticSeries();

  const totalCount = perMinuteSeries.reduce((acc, point) => acc + point.count, 0);
  const latestPoint = perMinuteSeries[perMinuteSeries.length - 1] ?? null;
  const latestCount = latestPoint?.count ?? null;
  const latestTimestamp = latestPoint?.timestamp ?? null;

  const averagePerMinute =
    perMinuteSeries.length > 0 ? totalCount / perMinuteSeries.length : 0;

  const totalPerHour = perHourSeries.reduce((acc, point) => acc + point.count, 0);
  const averagePerHour =
    perHourSeries.length > 0 ? totalPerHour / perHourSeries.length : 0;

  const payload: DashboardPayload = {
    totalCount,
    latestCount,
    latestTimestamp,
    averagePerMinute,
    averagePerHour,
    perMinuteSeries,
    perHourSeries,
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    events: [event],
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
