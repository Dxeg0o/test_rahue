import { NextResponse } from "next/server";
import {
  ActivityNotFoundError,
  ProductionConflictError,
  beginActividadOtProduction,
} from "@/lib/production-service";

type Params = {
  params: Promise<{ id: string }>;
};

type BeginBody = {
  startedProductionAt?: string;
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
    const body = (await request.json().catch(() => ({}))) as BeginBody;
    const startedProductionAt = parseOptionalDate(body.startedProductionAt);

    if (startedProductionAt === null) {
      return NextResponse.json(
        { error: "startedProductionAt inválido" },
        { status: 400 }
      );
    }

    const result = await beginActividadOtProduction({
      actividadId: id,
      startedProductionAt,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ActivityNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ProductionConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("Error starting real production:", error);
    return NextResponse.json(
      { error: "Error al iniciar la producción real" },
      { status: 500 }
    );
  }
}
