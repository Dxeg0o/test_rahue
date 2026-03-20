import { NextResponse } from "next/server";
import { fetchWorkerHistorySummaries } from "@/lib/history";

export async function GET() {
  try {
    const workers = await fetchWorkerHistorySummaries();

    return NextResponse.json(workers, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error fetching worker history:", error);
    return NextResponse.json(
      { message: "No fue posible obtener el historial por trabajador." },
      { status: 500 }
    );
  }
}
