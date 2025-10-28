import { NextResponse } from "next/server";

type SeriesPoint = {
  timestamp: string;
  count: number;
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
};

const HOURS_OF_DATA = 4;
const MINUTES_PER_HOUR = 60;
const MINUTES_OF_DATA = HOURS_OF_DATA * MINUTES_PER_HOUR;

function generateStaticSeries(): {
  perMinuteSeries: SeriesPoint[];
  perHourSeries: SeriesPoint[];
  rangeStart: string;
  rangeEnd: string;
  totalCount: number;
  latestCount: number;
  latestTimestamp: string;
  averagePerMinute: number;
  averagePerHour: number;
} {
  const now = new Date();
  const minuteMs = 60 * 1000;
  const startTime = new Date(now.getTime() - (MINUTES_OF_DATA - 1) * minuteMs);
  const perMinuteSeries: SeriesPoint[] = [];

  const highFlowPattern = [7, 8, 9, 10, 11];
  const lowFlowPattern = [2, 3];

  for (let index = 0; index < MINUTES_OF_DATA; index += 1) {
    const timestamp = new Date(startTime.getTime() + index * minuteMs);
    const hourIndex = Math.floor(index / MINUTES_PER_HOUR);
    const pattern = hourIndex === 1 ? lowFlowPattern : highFlowPattern;
    const value = pattern[index % pattern.length];

    perMinuteSeries.push({
      timestamp: timestamp.toISOString(),
      count: value,
    });
  }

  const perHourMap = new Map<string, number>();

  for (const point of perMinuteSeries) {
    const hourStart = new Date(point.timestamp);
    hourStart.setMinutes(0, 0, 0);
    const key = hourStart.toISOString();
    const current = perHourMap.get(key) ?? 0;
    perHourMap.set(key, current + point.count);
  }

  const perHourSeries = Array.from(perHourMap.entries())
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([timestamp, count]) => ({ timestamp, count }));

  const totalCount = perMinuteSeries.reduce((acc, point) => acc + point.count, 0);
  const latestPoint = perMinuteSeries[perMinuteSeries.length - 1];

  const averagePerMinute = totalCount / perMinuteSeries.length;
  const averagePerHour =
    perHourSeries.reduce((acc, point) => acc + point.count, 0) /
    perHourSeries.length;

  return {
    perMinuteSeries,
    perHourSeries,
    rangeStart: perMinuteSeries[0]?.timestamp ?? startTime.toISOString(),
    rangeEnd: perMinuteSeries[perMinuteSeries.length - 1]?.timestamp ?? now.toISOString(),
    totalCount,
    latestCount: latestPoint.count,
    latestTimestamp: latestPoint.timestamp,
    averagePerMinute,
    averagePerHour,
  };
}

export async function GET() {
  const {
    perMinuteSeries,
    perHourSeries,
    rangeStart,
    rangeEnd,
    totalCount,
    latestCount,
    latestTimestamp,
    averagePerMinute,
    averagePerHour,
  } = generateStaticSeries();

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
  };

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
