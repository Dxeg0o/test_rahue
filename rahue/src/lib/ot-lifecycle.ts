import { eq } from "drizzle-orm";
import { db } from "@/db";
import { actividadOt, ot } from "@/db/schema";

export class ActivityNotFoundError extends Error {
  constructor(activityId: string) {
    super(`Actividad OT no encontrada: ${activityId}`);
    this.name = "ActivityNotFoundError";
  }
}

export interface CompleteActividadOtInput {
  actividadId: string;
  completedAt?: Date;
}

export interface CompleteActividadOtResult {
  actividadId: string;
  otId: string;
  activityCompletedAt: Date;
  otCompleted: boolean;
  otStatus: "pendiente" | "en_proceso" | "completada" | "cancelada";
}

export async function completeActividadOt({
  actividadId,
  completedAt,
}: CompleteActividadOtInput): Promise<CompleteActividadOtResult> {
  return db.transaction(async (tx) => {
    const activity = await tx.query.actividadOt.findFirst({
      where: (a, { eq }) => eq(a.id, actividadId),
      columns: {
        id: true,
        estado: true,
        horaTermino: true,
        workflowEtapaId: true,
        ordenEtapa: true,
      },
      with: {
        ot: {
          columns: {
            id: true,
            estado: true,
            fechaTermino: true,
            tipoProductoId: true,
          },
        },
      },
    });

    if (!activity) {
      throw new ActivityNotFoundError(actividadId);
    }

    const activityCompletedAt = activity.horaTermino
      ? new Date(activity.horaTermino)
      : completedAt ?? new Date();

    if (activity.estado !== "completada" || !activity.horaTermino) {
      await tx
        .update(actividadOt)
        .set({
          estado: "completada",
          horaTermino: activityCompletedAt,
        })
        .where(eq(actividadOt.id, activity.id));
    }

    const lastWorkflowStep = await tx.query.workflowEtapa.findFirst({
      where: (we, { eq }) => eq(we.tipoProductoId, activity.ot.tipoProductoId),
      columns: {
        id: true,
        orden: true,
      },
      orderBy: (we, { desc }) => [desc(we.orden)],
    });

    const isLastStepInCurrentWorkflow = Boolean(lastWorkflowStep) && (
      activity.workflowEtapaId === lastWorkflowStep?.id ||
      (activity.ordenEtapa !== null &&
        activity.ordenEtapa !== undefined &&
        activity.ordenEtapa === lastWorkflowStep?.orden)
    );

    let otStatus = activity.ot.estado;
    let otCompleted = Boolean(activity.ot.fechaTermino) || activity.ot.estado === "completada";

    // Una OT completada no se "reabre" si el workflow cambia después.
    if (!otCompleted && isLastStepInCurrentWorkflow) {
      await tx
        .update(ot)
        .set({
          estado: "completada",
          fechaTermino: activityCompletedAt,
        })
        .where(eq(ot.id, activity.ot.id));

      otStatus = "completada";
      otCompleted = true;
    }

    return {
      actividadId: activity.id,
      otId: activity.ot.id,
      activityCompletedAt,
      otCompleted,
      otStatus,
    };
  });
}
