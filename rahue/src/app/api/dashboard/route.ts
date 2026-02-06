import { NextResponse } from "next/server";
import { mockMinuteDocs, type MinuteDocument } from "@/lib/mockData";

const DEFAULT_RANGE_MINUTES = 24 * 60;

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

export async function GET() {
  try {
    // START MOCK DATA REPLACEMENT
    const now = new Date();
    const rangeStart = new Date(
      now.getTime() - DEFAULT_RANGE_MINUTES * 60 * 1000
    );

    // Filter mock data for the requested range
    const minuteDocs = mockMinuteDocs
      .filter((doc) => doc.ts_minute >= rangeStart && doc.ts_minute <= now)
      .sort((a, b) => a.ts_minute.getTime() - b.ts_minute.getTime());
    // END MOCK DATA REPLACEMENT

    const perMinuteSeries: SeriesPoint[] = minuteDocs.map((doc) => ({
      timestamp: doc.ts_minute.toISOString(),
      count: doc.count_last_minute ?? 0,
    }));

    const totalCount = perMinuteSeries.reduce(
      (acc, point) => acc + point.count,
      0
    );

    const latestDoc = minuteDocs[minuteDocs.length - 1] ?? null;
    const latestCount = latestDoc?.count_last_minute ?? null;
    const latestTimestamp = latestDoc?.ts_minute.toISOString() ?? null;

    const averagePerMinute =
      perMinuteSeries.length > 0
        ? totalCount / perMinuteSeries.length
        : 0;

    const hourBuckets = new Map<string, number>();

    for (const doc of minuteDocs) {
      const hour = new Date(doc.ts_minute);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      const currentValue = hourBuckets.get(key) ?? 0;
      hourBuckets.set(key, currentValue + (doc.count_last_minute ?? 0));
    }

    const perHourSeries: SeriesPoint[] = Array.from(hourBuckets.entries())
      .sort(
        (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
      )
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
      rangeStart: rangeStart.toISOString(),
      rangeEnd: now.toISOString(),
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard data", error);
    return NextResponse.json(
      { message: "No fue posible obtener los datos." },
      { status: 500 }
    );
  }
}
