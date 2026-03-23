import { NextResponse } from "next/server";
import { listActiveMachines } from "@/lib/production-service";

export async function GET() {
  try {
    const machines = await listActiveMachines();

    return NextResponse.json(
      { machines },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching active machines:", error);
    return NextResponse.json(
      { error: "Error al obtener las maquinas activas" },
      { status: 500 }
    );
  }
}
