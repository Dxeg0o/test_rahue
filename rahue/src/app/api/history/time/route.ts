import { NextResponse } from "next/server";
import { fetchTimeHistory } from "@/lib/history";
import type { PeriodFilter } from "@/lib/history-types";

function parsePeriod(value: string | null): PeriodFilter {
  return value === "today" || value === "week" || value === "month"
    ? value
    : "week";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = parsePeriod(searchParams.get("period"));
    const history = await fetchTimeHistory(period);

    return NextResponse.json(
      {
        ...history,
        start: history.start.toISOString(),
        end: history.end.toISOString(),
      },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Error fetching time history:", error);
    return NextResponse.json(
      { message: "No fue posible obtener el historial por fecha." },
      { status: 500 }
    );
  }
}
