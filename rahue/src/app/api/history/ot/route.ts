import { NextResponse } from "next/server";
import { mockOTs } from "@/lib/mockOtData";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.toLowerCase() || "";
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  let filtered = mockOTs;

  if (q) {
    filtered = filtered.filter(
      (ot) =>
        ot.id.toLowerCase().includes(q) ||
        ot.workerName.toLowerCase().includes(q) ||
        ot.machineName.toLowerCase().includes(q)
    );
  }

  const sliced = filtered.slice(0, limit);

  return NextResponse.json(sliced);
}
