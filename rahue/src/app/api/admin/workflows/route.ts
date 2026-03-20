import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  tipoProducto,
  workflowEtapa,
  actividadOt,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// ── GET /api/admin/workflows ────────────────────────────────────────────────
// Returns all workflows (tipoProducto) with their stages and live stats.

export async function GET() {
  try {
    const workflows = await db.query.tipoProducto.findMany({
      where: (tp) => eq(tp.activo, true),
      with: {
        workflowEtapas: {
          with: { etapa: { with: { categoria: true } } },
          orderBy: (we, { asc }) => [asc(we.orden)],
        },
      },
      orderBy: (tp, { asc }) => [asc(tp.createdAt)],
    });

    // Gather stats: active OTs and completed this week per tipoProducto
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

    const allOts = await db.query.ot.findMany({
      columns: {
        id: true,
        tipoProductoId: true,
        estado: true,
        fechaTermino: true,
        fechaInicio: true,
      },
    });

    const statsMap = new Map<
      string,
      { activeOTs: number; completedThisWeek: number; avgCycleHours: number }
    >();

    for (const wf of workflows) {
      const wfOts = allOts.filter((o) => o.tipoProductoId === wf.id);
      const active = wfOts.filter(
        (o) => o.estado === "en_proceso" || o.estado === "pendiente"
      ).length;
      const completedWeek = wfOts.filter(
        (o) =>
          o.estado === "completada" &&
          o.fechaTermino &&
          new Date(o.fechaTermino) >= weekAgo
      );

      // Avg cycle time for completed OTs
      let avgCycleHours = 0;
      if (completedWeek.length > 0) {
        const totalMs = completedWeek.reduce((sum, o) => {
          if (o.fechaInicio && o.fechaTermino) {
            return (
              sum +
              (new Date(o.fechaTermino).getTime() -
                new Date(o.fechaInicio).getTime())
            );
          }
          return sum;
        }, 0);
        avgCycleHours = Math.round(totalMs / completedWeek.length / 3_600_000);
      }

      statsMap.set(wf.id, {
        activeOTs: active,
        completedThisWeek: completedWeek.length,
        avgCycleHours,
      });
    }

    const result = workflows.map((wf) => {
      const stats = statsMap.get(wf.id) ?? {
        activeOTs: 0,
        completedThisWeek: 0,
        avgCycleHours: 0,
      };
      return {
        id: wf.id,
        name: wf.nombre,
        description: wf.descripcion ?? "",
        colorKey: wf.color ?? "indigo",
        stages: wf.workflowEtapas.map((we) => ({
          id: we.id,
          etapaId: we.etapaId,
          nombre: we.nombrePaso ?? we.etapa.nombre,
          etapaNombre: we.etapa.nombre,
          orden: we.orden,
          requiereMaquina: we.requiereMaquina ?? false,
          icono: we.etapa.icono,
          categoria: we.etapa.categoria?.nombre || "otro",
        })),
        ...stats,
      };
    });

    // Also return available etapas for the stage picker
    const etapas = await db.query.etapa.findMany({
      orderBy: (e, { asc }) => [asc(e.nombre)],
    });

    return NextResponse.json(
      { workflows: result, etapas },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      { error: "Error al obtener workflows" },
      { status: 500 }
    );
  }
}

// ── POST /api/admin/workflows ───────────────────────────────────────────────
// Create a new workflow (tipoProducto + workflowEtapas).

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, colorKey, stages } = body as {
      name: string;
      description: string;
      colorKey: string;
      stages: { etapaId: string; nombrePaso?: string; requiereMaquina?: boolean }[];
    };

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }
    if (!stages || stages.length < 2) {
      return NextResponse.json(
        { error: "Se requieren al menos 2 etapas" },
        { status: 400 }
      );
    }

    // Create tipoProducto
    const [newTp] = await db
      .insert(tipoProducto)
      .values({
        nombre: name.trim(),
        descripcion: description?.trim() || null,
        color: colorKey || "indigo",
      })
      .returning();

    // Create workflowEtapas
    const weValues = stages.map((s, i) => ({
      tipoProductoId: newTp.id,
      etapaId: s.etapaId,
      orden: i + 1,
      nombrePaso: s.nombrePaso || null,
      requiereMaquina: s.requiereMaquina ?? false,
    }));

    await db.insert(workflowEtapa).values(weValues);

    return NextResponse.json({ id: newTp.id }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating workflow:", error);
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un tipo de producto con ese nombre" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Error al crear workflow" },
      { status: 500 }
    );
  }
}

// ── PUT /api/admin/workflows ────────────────────────────────────────────────
// Update an existing workflow.

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, colorKey, stages } = body as {
      id: string;
      name: string;
      description: string;
      colorKey: string;
      stages: { etapaId: string; nombrePaso?: string; requiereMaquina?: boolean }[];
    };

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }
    if (!stages || stages.length < 2) {
      return NextResponse.json(
        { error: "Se requieren al menos 2 etapas" },
        { status: 400 }
      );
    }

    // 1. Update tipoProducto metadata
    await db
      .update(tipoProducto)
      .set({
        nombre: name.trim(),
        descripcion: description?.trim() || null,
        color: colorKey || "indigo",
        updatedAt: new Date(),
      })
      .where(eq(tipoProducto.id, id));

    // 2. Get the existing workflow_etapa IDs for this workflow
    const existingStages = await db
      .select({ id: workflowEtapa.id })
      .from(workflowEtapa)
      .where(eq(workflowEtapa.tipoProductoId, id));

    const existingIds = existingStages.map((s) => s.id);

    // 3. Nullify actividad_ot.workflow_etapa_id references to avoid FK violation.
    //    This preserves activity history — activities just lose the link to the
    //    specific workflow step definition (which is being replaced).
    if (existingIds.length > 0) {
      await db
        .update(actividadOt)
        .set({ workflowEtapaId: null })
        .where(inArray(actividadOt.workflowEtapaId, existingIds));
    }

    // 4. Delete old workflow stages and insert the new ones
    await db.delete(workflowEtapa).where(eq(workflowEtapa.tipoProductoId, id));

    const weValues = stages.map((s, i) => ({
      tipoProductoId: id,
      etapaId: s.etapaId,
      orden: i + 1,
      nombrePaso: s.nombrePaso || null,
      requiereMaquina: s.requiereMaquina ?? false,
    }));

    await db.insert(workflowEtapa).values(weValues);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Error updating workflow:", error);
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      return NextResponse.json(
        { error: "Ya existe un tipo de producto con ese nombre" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Error al actualizar workflow" },
      { status: 500 }
    );
  }
}

// ── DELETE /api/admin/workflows ─────────────────────────────────────────────
// Soft-delete (deactivate) a workflow. Hard-delete only if no OTs reference it.

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    // Check if there are OTs using this workflow
    const otsUsingIt = await db.query.ot.findMany({
      where: (o) => eq(o.tipoProductoId, id),
      columns: { id: true },
      limit: 1,
    });

    if (otsUsingIt.length > 0) {
      // Soft delete - just deactivate
      await db
        .update(tipoProducto)
        .set({ activo: false, updatedAt: new Date() })
        .where(eq(tipoProducto.id, id));

      return NextResponse.json({
        ok: true,
        softDeleted: true,
        message: "Workflow desactivado (tiene OTs asociadas)",
      });
    }

    // Hard delete - cascade will handle workflowEtapas
    await db.delete(tipoProducto).where(eq(tipoProducto.id, id));

    return NextResponse.json({ ok: true, softDeleted: false });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return NextResponse.json(
      { error: "Error al eliminar workflow" },
      { status: 500 }
    );
  }
}
