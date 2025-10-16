import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DEFAULT_RANGE_MINUTES = 24 * 60;

interface MinuteDocument {
  ts_minute: Date;
  count_last_minute: number;
}

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
    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB ?? "counter_db";
    const collectionName =
      process.env.MONGODB_COLLECTION ?? "counts_per_minute";

    const db = client.db(dbName);
    const collection = db.collection<MinuteDocument>(collectionName);

    const now = new Date();
    const rangeStart = new Date(
      now.getTime() - DEFAULT_RANGE_MINUTES * 60 * 1000
    );

    const minuteDocs = await collection
      .find({ ts_minute: { $gte: rangeStart, $lte: now } })
      .sort({ ts_minute: 1 })
      .toArray();

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
