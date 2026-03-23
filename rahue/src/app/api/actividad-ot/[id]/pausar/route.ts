import { NextResponse } from "next/server";
import {
  ActivityNotFoundError,
  ProductionConflictError,
  pauseActividadOt,
} from "@/lib/production-service";

type Params = {
  params: Promise<{ id: string }>;
};

type PauseBody = {
  reason?: string;
  detail?: string;
  pausedAt?: string;
};

function parseOptionalDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as PauseBody;
    const pausedAt = parseOptionalDate(body.pausedAt);

    if (pausedAt === null) {
      return NextResponse.json({ error: "pausedAt inválido" }, { status: 400 });
    }

    const result = await pauseActividadOt({
      actividadId: id,
      reason: body.reason?.trim() || "",
      detail: body.detail?.trim() || null,
      pausedAt,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ActivityNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ProductionConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("Error pausing actividad_ot:", error);
    return NextResponse.json(
      { error: "Error al pausar la actividad OT" },
      { status: 500 }
    );
  }
}
