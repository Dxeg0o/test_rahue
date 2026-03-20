import { NextResponse } from "next/server";
import { fetchOtDocumentByCode } from "@/lib/history";

type Params = {
  params: Promise<{ code: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { code } = await params;
    const ot = await fetchOtDocumentByCode(decodeURIComponent(code));

    if (!ot) {
      return NextResponse.json(
        { message: "OT no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json(ot, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Error fetching OT detail:", error);
    return NextResponse.json(
      { message: "No fue posible obtener el detalle de la OT." },
      { status: 500 }
    );
  }
}
