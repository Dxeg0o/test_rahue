import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { actividadOt, ot, parada, usuario } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type OtStatus = "pendiente" | "en_proceso" | "completada" | "cancelada";
type ActivityStatus = "calentando" | "produciendo" | "pausada" | "completada";

export class ActivityNotFoundError extends Error {
  constructor(activityId: string) {
    super(`Actividad OT no encontrada: ${activityId}`);
    this.name = "ActivityNotFoundError";
  }
}

export class OtNotFoundError extends Error {
  constructor(otCode: string) {
    super(`OT no encontrada: ${otCode}`);
    this.name = "OtNotFoundError";
  }
}

export class OperatorNotFoundError extends Error {
  constructor(operatorCode: string) {
    super(`Operador no encontrado o inactivo: ${operatorCode}`);
    this.name = "OperatorNotFoundError";
  }
}

export class ProductionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductionConflictError";
  }
}

export class MachineValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MachineValidationError";
  }
}

export interface StartActividadOtInput {
  otCode: string;
  operatorCode: string;
  machineId?: string | null;
  startedAt?: Date;
}

export interface StartActividadOtResult {
  actividadId: string;
  otId: string;
  otCode: string;
  stageName: string;
  activityStatus: ActivityStatus;
  otStatus: OtStatus;
  currentStageName: string | null;
  machineId: string | null;
}

export interface BeginActividadOtProductionInput {
  actividadId: string;
  startedProductionAt?: Date;
}

export interface BeginActividadOtProductionResult {
  actividadId: string;
  otId: string;
  activityStatus: ActivityStatus;
  startedProductionAt: Date | null;
  otStatus: OtStatus;
  currentStageName: string | null;
}

export interface PauseActividadOtInput {
  actividadId: string;
  reason: string;
  detail?: string | null;
  pausedAt?: Date;
}

export interface PauseActividadOtResult {
  actividadId: string;
  otId: string;
  stopId: string;
  activityStatus: ActivityStatus;
  pausedAt: Date;
  otStatus: OtStatus;
  currentStageName: string | null;
}

export interface ResumeActividadOtInput {
  actividadId: string;
  resumedAt?: Date;
}

export interface ResumeActividadOtResult {
  actividadId: string;
  otId: string;
  activityStatus: ActivityStatus;
  resumedAt: Date;
  otStatus: OtStatus;
  currentStageName: string | null;
}

export interface CompleteActividadOtInput {
  actividadId: string;
  completedAt?: Date;
}

export interface CompleteActividadOtResult {
  actividadId: string;
  otId: string;
  otCode: string;
  activityCompletedAt: Date;
  otCompleted: boolean;
  otStatus: OtStatus;
  currentStageName: string | null;
}

export interface GetActividadOtStateResult {
  actividadId: string;
  otId: string;
  otCode: string;
  activityStatus: ActivityStatus;
  stageName: string;
  otStatus: OtStatus;
  currentStageName: string | null;
  machineId: string | null;
  operatorId: string | null;
  startedAt: Date;
  startedProductionAt: Date | null;
  completedAt: Date | null;
  activeStop: {
    id: string;
    reason: string;
    detail: string | null;
    startedAt: Date;
  } | null;
}

export interface ActiveMachineOptionResult {
  id: string;
  name: string;
  stageName: string;
}

type WorkflowStepSnapshot = {
  workflowEtapaId: string;
  etapaId: string;
  order: number;
  stageName: string;
  requiresMachine: boolean;
};

type ActivitySnapshot = {
  id: string;
  otId: string;
  workflowEtapaId: string | null;
  order: number | null;
  stageName: string;
  status: ActivityStatus;
  machineId: string | null;
  operatorId: string | null;
  startedAt: Date;
  startedProductionAt: Date | null;
  completedAt: Date | null;
};

type OtSnapshot = {
  id: string;
  code: string;
  typeProductId: string;
  status: OtStatus;
  startedAt: Date | null;
  completedAt: Date | null;
};

type ProgressSnapshot = {
  status: OtStatus;
  currentStageName: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
};

function isUuid(value: string) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value
  );
}

function activityMatchesWorkflowStep(
  activity: ActivitySnapshot,
  step: WorkflowStepSnapshot
) {
  if (activity.workflowEtapaId) {
    return activity.workflowEtapaId === step.workflowEtapaId;
  }

  if (activity.order !== null && activity.order !== undefined) {
    return activity.order === step.order;
  }

  return activity.stageName.trim().toLowerCase() === step.stageName.trim().toLowerCase();
}

function compareActivities(left: ActivitySnapshot, right: ActivitySnapshot) {
  const orderComparison = (left.order ?? Number.MAX_SAFE_INTEGER) -
    (right.order ?? Number.MAX_SAFE_INTEGER);
  if (orderComparison !== 0) {
    return orderComparison;
  }

  return left.startedAt.getTime() - right.startedAt.getTime();
}

function findFirstPendingWorkflowStep(
  workflowSteps: WorkflowStepSnapshot[],
  activities: ActivitySnapshot[]
) {
  for (const step of workflowSteps) {
    const hasCompletedActivity = activities.some(
      (activity) =>
        activityMatchesWorkflowStep(activity, step) &&
        (activity.status === "completada" || activity.completedAt !== null)
    );

    if (!hasCompletedActivity) {
      return step;
    }
  }

  return null;
}

function findPendingWorkflowSteps(
  workflowSteps: WorkflowStepSnapshot[],
  activities: ActivitySnapshot[]
) {
  return workflowSteps.filter(
    (step) =>
      !activities.some(
        (activity) =>
          activityMatchesWorkflowStep(activity, step) &&
          (activity.status === "completada" || activity.completedAt !== null)
      )
  );
}

async function getOtByCode(tx: Tx, otCode: string): Promise<OtSnapshot> {
  const found = await tx.query.ot.findFirst({
    where: (currentOt, { eq }) => eq(currentOt.codigo, otCode),
    columns: {
      id: true,
      codigo: true,
      tipoProductoId: true,
      estado: true,
      fechaInicio: true,
      fechaTermino: true,
    },
  });

  if (!found) {
    throw new OtNotFoundError(otCode);
  }

  return {
    id: found.id,
    code: found.codigo,
    typeProductId: found.tipoProductoId,
    status: found.estado,
    startedAt: found.fechaInicio ? new Date(found.fechaInicio) : null,
    completedAt: found.fechaTermino ? new Date(found.fechaTermino) : null,
  };
}

async function getOperatorId(tx: Tx, operatorCode: string) {
  const normalizedOperatorCode = operatorCode.trim();
  const operatorIdMatch = isUuid(normalizedOperatorCode)
    ? eq(usuario.id, normalizedOperatorCode)
    : undefined;

  const rows = await tx
    .select({ id: usuario.id })
    .from(usuario)
    .where(
      and(
        eq(usuario.activo, true),
        or(
          eq(usuario.rut, normalizedOperatorCode),
          eq(usuario.supabaseId, normalizedOperatorCode),
          operatorIdMatch,
          sql`lower(${usuario.email}) = lower(${normalizedOperatorCode})`,
          sql`lower(${usuario.nombre}) = lower(${normalizedOperatorCode})`
        )
      )
    )
    .limit(1);

  if (rows.length === 0) {
    throw new OperatorNotFoundError(normalizedOperatorCode);
  }

  return rows[0].id;
}

async function loadWorkflowSteps(tx: Tx, tipoProductoId: string) {
  const rows = await tx.query.workflowEtapa.findMany({
    where: (step, { eq }) => eq(step.tipoProductoId, tipoProductoId),
    with: { etapa: true },
    orderBy: (step, { asc }) => [asc(step.orden)],
  });

  return rows.map<WorkflowStepSnapshot>((row) => ({
    workflowEtapaId: row.id,
    etapaId: row.etapaId,
    order: row.orden,
    stageName: row.nombrePaso || row.etapa.nombre,
    requiresMachine: Boolean(row.requiereMaquina),
  }));
}

async function loadActivities(tx: Tx, otId: string) {
  const rows = await tx.query.actividadOt.findMany({
    where: (activity, { eq }) => eq(activity.otId, otId),
    with: {
      etapa: true,
      workflowEtapa: {
        with: { etapa: true },
      },
    },
    orderBy: (activity, { asc }) => [asc(activity.ordenEtapa), asc(activity.horaInicio)],
  });

  return rows.map<ActivitySnapshot>((row) => ({
    id: row.id,
    otId: row.otId,
    workflowEtapaId: row.workflowEtapaId,
    order: row.ordenEtapa,
    stageName:
      row.workflowEtapa?.nombrePaso ||
      row.workflowEtapa?.etapa.nombre ||
      row.etapa.nombre,
    status: row.estado,
    machineId: row.maquinaId ?? null,
    operatorId: row.operadorId ?? null,
    startedAt: new Date(row.horaInicio),
    startedProductionAt: row.horaInicioProduccion
      ? new Date(row.horaInicioProduccion)
      : null,
    completedAt: row.horaTermino ? new Date(row.horaTermino) : null,
  }));
}

async function getActivityById(tx: Tx, actividadId: string) {
  const activity = await tx.query.actividadOt.findFirst({
    where: (currentActivity, { eq }) => eq(currentActivity.id, actividadId),
    with: {
      ot: {
        columns: {
          id: true,
          codigo: true,
          tipoProductoId: true,
          estado: true,
          fechaInicio: true,
          fechaTermino: true,
        },
      },
      etapa: true,
      workflowEtapa: {
        with: { etapa: true },
      },
      paradas: {
        orderBy: (stop, { desc }) => [desc(stop.horaInicio)],
      },
    },
  });

  if (!activity) {
    throw new ActivityNotFoundError(actividadId);
  }

  const activeStop = activity.paradas.find((stop) => !stop.horaTermino);

  return {
    activity: {
      id: activity.id,
      otId: activity.otId,
      workflowEtapaId: activity.workflowEtapaId,
      order: activity.ordenEtapa,
      stageName:
        activity.workflowEtapa?.nombrePaso ||
        activity.workflowEtapa?.etapa.nombre ||
        activity.etapa.nombre,
      status: activity.estado,
      machineId: activity.maquinaId ?? null,
      operatorId: activity.operadorId ?? null,
      startedAt: new Date(activity.horaInicio),
      startedProductionAt: activity.horaInicioProduccion
        ? new Date(activity.horaInicioProduccion)
        : null,
      completedAt: activity.horaTermino ? new Date(activity.horaTermino) : null,
    } satisfies ActivitySnapshot,
    ot: {
      id: activity.ot.id,
      code: activity.ot.codigo,
      typeProductId: activity.ot.tipoProductoId,
      status: activity.ot.estado,
      startedAt: activity.ot.fechaInicio ? new Date(activity.ot.fechaInicio) : null,
      completedAt: activity.ot.fechaTermino ? new Date(activity.ot.fechaTermino) : null,
    } satisfies OtSnapshot,
    activeStop: activeStop
      ? {
          id: activeStop.id,
          reason: activeStop.motivo,
          detail: activeStop.detalle ?? null,
          startedAt: new Date(activeStop.horaInicio),
        }
      : null,
  };
}

async function normalizeFinishedActivities(tx: Tx, otId: string) {
  await tx.execute(sql`
    update actividad_ot
    set estado = 'completada'
    where ot_id = ${otId}
      and hora_termino is not null
      and estado <> 'completada'
  `);
}

async function loadMachineSnapshot(tx: Tx, machineId: string) {
  const machine = await tx.query.maquina.findFirst({
    where: (currentMachine, { eq }) => eq(currentMachine.id, machineId),
    with: { etapa: true },
  });

  if (!machine) {
    throw new MachineValidationError(
      `La máquina "${machineId}" no existe en la base.`
    );
  }

  if (!machine.activa) {
    throw new MachineValidationError(
      `La máquina "${machineId}" no está activa.`
    );
  }

  return machine;
}

async function resolveMachineId(
  tx: Tx,
  workflowStep: WorkflowStepSnapshot,
  machineId?: string | null
) {
  const normalizedMachineId = machineId?.trim() || null;

  if (!workflowStep.requiresMachine) {
    if (normalizedMachineId) {
      const machine = await loadMachineSnapshot(tx, normalizedMachineId);
      throw new MachineValidationError(
        `La OT todavía espera "${workflowStep.stageName}", que no usa máquina. No puedes iniciarla desde "${machine.id}" (${machine.nombre}).`
      );
    }

    return null;
  }

  if (!normalizedMachineId) {
    throw new MachineValidationError(
      `La etapa "${workflowStep.stageName}" requiere una máquina configurada.`
    );
  }

  const machine = await loadMachineSnapshot(tx, normalizedMachineId);

  if (machine.etapaId !== workflowStep.etapaId) {
    throw new MachineValidationError(
      `La máquina "${normalizedMachineId}" pertenece a "${machine.etapa.nombre}" y la OT espera "${workflowStep.stageName}".`
    );
  }

  return machine.id;
}

function computeOtProgress(
  workflowSteps: WorkflowStepSnapshot[],
  activities: ActivitySnapshot[]
): ProgressSnapshot {
  const sortedActivities = [...activities].sort(compareActivities);
  const openActivities = sortedActivities.filter(
    (activity) => activity.status !== "completada" && activity.completedAt === null
  );
  const nextPendingStep = findFirstPendingWorkflowStep(workflowSteps, sortedActivities);

  const startedAt = sortedActivities.length > 0
    ? sortedActivities.reduce((earliest, activity) =>
        activity.startedAt < earliest ? activity.startedAt : earliest,
      sortedActivities[0].startedAt)
    : null;

  const completedActivities = sortedActivities.filter((activity) => activity.completedAt);
  const completedAt = completedActivities.length > 0
    ? completedActivities.reduce((latest, activity) =>
        activity.completedAt! > latest ? activity.completedAt! : latest,
      completedActivities[0].completedAt!)
    : null;

  if (openActivities.length > 0) {
    return {
      status: "en_proceso",
      currentStageName: openActivities[0].stageName,
      startedAt,
      completedAt: null,
    };
  }

  if (sortedActivities.length === 0) {
    return {
      status: "pendiente",
      currentStageName: workflowSteps[0]?.stageName ?? null,
      startedAt: null,
      completedAt: null,
    };
  }

  if (nextPendingStep) {
    return {
      status: "en_proceso",
      currentStageName: nextPendingStep.stageName,
      startedAt,
      completedAt: null,
    };
  }

  return {
    status: "completada",
    currentStageName: null,
    startedAt,
    completedAt,
  };
}

async function syncOtStateFromProgress(tx: Tx, otId: string, tipoProductoId: string) {
  const workflowSteps = await loadWorkflowSteps(tx, tipoProductoId);
  const activities = await loadActivities(tx, otId);
  const progress = computeOtProgress(workflowSteps, activities);

  await tx
    .update(ot)
    .set({
      estado: progress.status,
      fechaInicio: progress.startedAt,
      fechaTermino: progress.completedAt,
    })
    .where(eq(ot.id, otId));

  return progress;
}

async function closeOpenStops(tx: Tx, actividadId: string, finishedAt: Date) {
  const openStops = await tx.query.parada.findMany({
    where: (currentStop, { and, eq, isNull }) =>
      and(
        eq(currentStop.actividadOtId, actividadId),
        isNull(currentStop.horaTermino)
      ),
    orderBy: (currentStop, { desc }) => [desc(currentStop.horaInicio)],
  });

  for (const stop of openStops) {
    const startedAt = new Date(stop.horaInicio);
    const durationInSeconds = Math.max(
      0,
      Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000)
    );

    await tx
      .update(parada)
      .set({
        horaTermino: finishedAt,
        duracionSegundos: durationInSeconds,
      })
      .where(eq(parada.id, stop.id));
  }
}

export async function startActividadOt({
  otCode,
  operatorCode,
  machineId,
  startedAt,
}: StartActividadOtInput): Promise<StartActividadOtResult> {
  return db.transaction(async (tx) => {
    const normalizedOtCode = otCode.trim();
    const normalizedOperatorCode = operatorCode.trim();

    if (!normalizedOtCode) {
      throw new ProductionConflictError("Debes enviar un código de OT válido.");
    }

    if (!normalizedOperatorCode) {
      throw new ProductionConflictError("Debes enviar un operador válido.");
    }

    const currentOt = await getOtByCode(tx, normalizedOtCode);
    if (currentOt.status === "cancelada") {
      throw new ProductionConflictError(
        `La OT "${normalizedOtCode}" está cancelada y no puede iniciarse.`
      );
    }

    await normalizeFinishedActivities(tx, currentOt.id);
    const operatorId = await getOperatorId(tx, normalizedOperatorCode);
    const workflowSteps = await loadWorkflowSteps(tx, currentOt.typeProductId);
    const activities = await loadActivities(tx, currentOt.id);
    const openActivities = activities.filter(
      (activity) => activity.status !== "completada" && activity.completedAt === null
    );

    if (openActivities.length > 0) {
      const stages = [...new Set(openActivities.map((activity) => activity.stageName))].join(", ");
      throw new ProductionConflictError(
        `La OT "${normalizedOtCode}" ya tiene una actividad activa en ${stages}.`
      );
    }

    const nextStep = findFirstPendingWorkflowStep(workflowSteps, activities);
    if (!nextStep) {
      await syncOtStateFromProgress(tx, currentOt.id, currentOt.typeProductId);
      throw new ProductionConflictError(
        `La OT "${normalizedOtCode}" ya completó todas sus etapas.`
      );
    }

    const normalizedMachineId = machineId?.trim() || null;
    let selectedStep = nextStep;

    if (normalizedMachineId) {
      const machine = await loadMachineSnapshot(tx, normalizedMachineId);
      const pendingSteps = findPendingWorkflowSteps(workflowSteps, activities);
      const machineStep = pendingSteps.find(
        (step) => step.etapaId === machine.etapaId
      );

      if (!machineStep) {
        throw new MachineValidationError(
          `La máquina "${machine.id}" (${machine.nombre}) no corresponde a ninguna etapa pendiente de esta OT.`
        );
      }

      selectedStep = machineStep;
    }

    const resolvedMachineId = await resolveMachineId(tx, selectedStep, machineId);
    const activityStartedAt = startedAt ?? new Date();

    const [createdActivity] = await tx
      .insert(actividadOt)
      .values({
        otId: currentOt.id,
        etapaId: selectedStep.etapaId,
        workflowEtapaId: selectedStep.workflowEtapaId,
        ordenEtapa: selectedStep.order,
        maquinaId: resolvedMachineId,
        operadorId: operatorId,
        horaInicio: activityStartedAt,
        estado: "calentando",
      })
      .returning({ id: actividadOt.id });

    const progress = await syncOtStateFromProgress(tx, currentOt.id, currentOt.typeProductId);

    return {
      actividadId: createdActivity.id,
      otId: currentOt.id,
      otCode: currentOt.code,
      stageName: selectedStep.stageName,
      activityStatus: "calentando",
      otStatus: progress.status,
      currentStageName: progress.currentStageName,
      machineId: resolvedMachineId,
    };
  });
}

export async function beginActividadOtProduction({
  actividadId,
  startedProductionAt,
}: BeginActividadOtProductionInput): Promise<BeginActividadOtProductionResult> {
  return db.transaction(async (tx) => {
    const { activity, ot: currentOt } = await getActivityById(tx, actividadId);

    if (activity.status === "completada") {
      throw new ProductionConflictError("La actividad ya está completada.");
    }

    const productionStartedAt =
      activity.startedProductionAt ?? startedProductionAt ?? new Date();

    if (activity.status !== "produciendo") {
      if (activity.status === "pausada") {
        throw new ProductionConflictError(
          "La actividad está pausada. Reanúdala antes de iniciar producción."
        );
      }

      await tx
        .update(actividadOt)
        .set({
          estado: "produciendo",
          horaInicioProduccion: productionStartedAt,
        })
        .where(eq(actividadOt.id, activity.id));
    }

    const progress = await syncOtStateFromProgress(tx, currentOt.id, currentOt.typeProductId);

    return {
      actividadId: activity.id,
      otId: currentOt.id,
      activityStatus: "produciendo",
      startedProductionAt: productionStartedAt,
      otStatus: progress.status,
      currentStageName: progress.currentStageName,
    };
  });
}

export async function pauseActividadOt({
  actividadId,
  reason,
  detail,
  pausedAt,
}: PauseActividadOtInput): Promise<PauseActividadOtResult> {
  return db.transaction(async (tx) => {
    const { activity, ot: currentOt, activeStop } = await getActivityById(tx, actividadId);
    const normalizedReason = reason.trim();

    if (!normalizedReason) {
      throw new ProductionConflictError("Debes indicar un motivo de pausa.");
    }

    if (activity.status === "completada") {
      throw new ProductionConflictError("La actividad ya está completada.");
    }

    if (activity.status === "pausada") {
      if (!activeStop) {
        throw new ProductionConflictError(
          "La actividad figura pausada pero no tiene una parada abierta."
        );
      }

      const progress = await syncOtStateFromProgress(tx, currentOt.id, currentOt.typeProductId);
      return {
        actividadId: activity.id,
        otId: currentOt.id,
        stopId: activeStop.id,
        activityStatus: "pausada",
        pausedAt: activeStop.startedAt,
        otStatus: progress.status,
        currentStageName: progress.currentStageName,
      };
    }

    const stopStartedAt = pausedAt ?? new Date();
    const [createdStop] = await tx
      .insert(parada)
      .values({
        actividadOtId: activity.id,
        motivo: normalizedReason,
        detalle: detail?.trim() || null,
        horaInicio: stopStartedAt,
      })
      .returning({ id: parada.id });

    await tx
      .update(actividadOt)
      .set({ estado: "pausada" })
      .where(eq(actividadOt.id, activity.id));

    const progress = await syncOtStateFromProgress(tx, currentOt.id, currentOt.typeProductId);

    return {
      actividadId: activity.id,
      otId: currentOt.id,
      stopId: createdStop.id,
      activityStatus: "pausada",
      pausedAt: stopStartedAt,
      otStatus: progress.status,
      currentStageName: progress.currentStageName,
    };
  });
}

export async function resumeActividadOt({
  actividadId,
  resumedAt,
}: ResumeActividadOtInput): Promise<ResumeActividadOtResult> {
  return db.transaction(async (tx) => {
    const { activity, ot: currentOt, activeStop } = await getActivityById(tx, actividadId);

    if (activity.status === "completada") {
      throw new ProductionConflictError("La actividad ya está completada.");
    }

    if (!activeStop) {
      if (activity.status === "produciendo") {
        const progress = await syncOtStateFromProgress(tx, currentOt.id, currentOt.typeProductId);
        return {
          actividadId: activity.id,
          otId: currentOt.id,
          activityStatus: "produciendo",
          resumedAt: resumedAt ?? new Date(),
          otStatus: progress.status,
          currentStageName: progress.currentStageName,
        };
      }

      throw new ProductionConflictError("La actividad no tiene una parada abierta para reanudar.");
    }

    const effectiveResumedAt = resumedAt ?? new Date();
    const durationInSeconds = Math.max(
      0,
      Math.floor((effectiveResumedAt.getTime() - activeStop.startedAt.getTime()) / 1000)
    );

    await tx
      .update(parada)
      .set({
        horaTermino: effectiveResumedAt,
        duracionSegundos: durationInSeconds,
      })
      .where(eq(parada.id, activeStop.id));

    await tx
      .update(actividadOt)
      .set({ estado: "produciendo" })
      .where(eq(actividadOt.id, activity.id));

    const progress = await syncOtStateFromProgress(tx, currentOt.id, currentOt.typeProductId);

    return {
      actividadId: activity.id,
      otId: currentOt.id,
      activityStatus: "produciendo",
      resumedAt: effectiveResumedAt,
      otStatus: progress.status,
      currentStageName: progress.currentStageName,
    };
  });
}

export async function completeActividadOt({
  actividadId,
  completedAt,
}: CompleteActividadOtInput): Promise<CompleteActividadOtResult> {
  return db.transaction(async (tx) => {
    const { activity, ot: currentOt } = await getActivityById(tx, actividadId);

    const effectiveCompletedAt = activity.completedAt ?? completedAt ?? new Date();

    await closeOpenStops(tx, activity.id, effectiveCompletedAt);

    if (activity.status !== "completada" || !activity.completedAt) {
      await tx
        .update(actividadOt)
        .set({
          estado: "completada",
          horaTermino: effectiveCompletedAt,
        })
        .where(eq(actividadOt.id, activity.id));
    }

    await normalizeFinishedActivities(tx, currentOt.id);
    const progress = await syncOtStateFromProgress(tx, currentOt.id, currentOt.typeProductId);

    return {
      actividadId: activity.id,
      otId: currentOt.id,
      otCode: currentOt.code,
      activityCompletedAt: effectiveCompletedAt,
      otCompleted: progress.status === "completada",
      otStatus: progress.status,
      currentStageName: progress.currentStageName,
    };
  });
}

export async function getActividadOtState(
  actividadId: string
): Promise<GetActividadOtStateResult> {
  return db.transaction(async (tx) => {
    const { activity, ot: currentOt, activeStop } = await getActivityById(tx, actividadId);
    const progress = await syncOtStateFromProgress(tx, currentOt.id, currentOt.typeProductId);

    return {
      actividadId: activity.id,
      otId: currentOt.id,
      otCode: currentOt.code,
      activityStatus: activity.status,
      stageName: activity.stageName,
      otStatus: progress.status,
      currentStageName: progress.currentStageName,
      machineId: activity.machineId,
      operatorId: activity.operatorId,
      startedAt: activity.startedAt,
      startedProductionAt: activity.startedProductionAt,
      completedAt: activity.completedAt,
      activeStop,
    };
  });
}

export async function listActiveMachines(): Promise<ActiveMachineOptionResult[]> {
  const machines = await db.query.maquina.findMany({
    where: (currentMachine, { eq }) => eq(currentMachine.activa, true),
    columns: {
      id: true,
      nombre: true,
    },
    with: {
      etapa: {
        columns: {
          nombre: true,
        },
      },
    },
  });

  return machines
    .map((machine) => ({
      id: machine.id,
      name: machine.nombre,
      stageName: machine.etapa?.nombre ?? "Sin etapa",
    }))
    .sort((left, right) => {
      const stageComparison = left.stageName.localeCompare(right.stageName, "es");
      if (stageComparison !== 0) {
        return stageComparison;
      }

      const nameComparison = left.name.localeCompare(right.name, "es");
      if (nameComparison !== 0) {
        return nameComparison;
      }

      return left.id.localeCompare(right.id, "es");
    });
}
