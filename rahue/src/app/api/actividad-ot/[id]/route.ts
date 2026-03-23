import { NextResponse } from "next/server";
import {
  ActivityNotFoundError,
  getActividadOtState,
} from "@/lib/production-service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params) {
  try {
    const { id } = await params;
    const result = await getActividadOtState(id);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ActivityNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("Error fetching actividad_ot state:", error);
    return NextResponse.json(
      { error: "Error al obtener el estado de la actividad OT" },
      { status: 500 }
    );
  }
}
