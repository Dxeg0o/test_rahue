import { NextResponse } from "next/server";
import {
  ActivityNotFoundError,
  completeActividadOt,
} from "@/lib/ot-lifecycle";

type Params = {
  params: Promise<{ id: string }>;
};

type CompleteBody = {
  completedAt?: string;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as CompleteBody;

    const completedAt = body.completedAt ? new Date(body.completedAt) : undefined;
    if (completedAt && Number.isNaN(completedAt.getTime())) {
      return NextResponse.json(
        { error: "completedAt inválido" },
        { status: 400 }
      );
    }

    const result = await completeActividadOt({
      actividadId: id,
      completedAt,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof ActivityNotFoundError) {
      return NextResponse.json(
        { error: "Actividad OT no encontrada" },
        { status: 404 }
      );
    }

    console.error("Error completing actividad_ot:", error);
    return NextResponse.json(
      { error: "Error al completar la actividad OT" },
      { status: 500 }
    );
  }
}
