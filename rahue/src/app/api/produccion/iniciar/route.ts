import { NextResponse } from "next/server";
import {
  MachineValidationError,
  OperatorNotFoundError,
  OtNotFoundError,
  ProductionConflictError,
  startActividadOt,
} from "@/lib/production-service";

type StartBody = {
  otCode?: string;
  operatorCode?: string;
  machineId?: string | null;
  startedAt?: string;
};

function parseOptionalDate(value?: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as StartBody;
    const startedAt = parseOptionalDate(body.startedAt);

    if (startedAt === null) {
      return NextResponse.json({ error: "startedAt inválido" }, { status: 400 });
    }

    const result = await startActividadOt({
      otCode: body.otCode?.trim() || "",
      operatorCode: body.operatorCode?.trim() || "",
      machineId: body.machineId?.trim() || null,
      startedAt,
    });

    return NextResponse.json({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    if (error instanceof OtNotFoundError || error instanceof OperatorNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ProductionConflictError || error instanceof MachineValidationError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("Error starting actividad_ot:", error);
    return NextResponse.json(
      { error: "Error al iniciar la actividad OT" },
      { status: 500 }
    );
  }
}
