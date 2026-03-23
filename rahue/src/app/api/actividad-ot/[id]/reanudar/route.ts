import { NextResponse } from "next/server";
import {
  ActivityNotFoundError,
  ProductionConflictError,
  resumeActividadOt,
} from "@/lib/production-service";

type Params = {
  params: Promise<{ id: string }>;
};

type ResumeBody = {
  resumedAt?: string;
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
    const body = (await request.json().catch(() => ({}))) as ResumeBody;
    const resumedAt = parseOptionalDate(body.resumedAt);

    if (resumedAt === null) {
      return NextResponse.json({ error: "resumedAt inválido" }, { status: 400 });
    }

    const result = await resumeActividadOt({
      actividadId: id,
      resumedAt,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ActivityNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ProductionConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("Error resuming actividad_ot:", error);
    return NextResponse.json(
      { error: "Error al reanudar la actividad OT" },
      { status: 500 }
    );
  }
}
