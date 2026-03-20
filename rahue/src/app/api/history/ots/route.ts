import { NextResponse } from "next/server";
import { fetchCompletedOtDocuments, searchHistoryOts } from "@/lib/history";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const ots = await fetchCompletedOtDocuments();
    const filtered = searchHistoryOts(ots, q).slice(0, limit);

    return NextResponse.json(filtered, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error fetching history OTs:", error);
    return NextResponse.json(
      { message: "No fue posible obtener el historial por OT." },
      { status: 500 }
    );
  }
}
