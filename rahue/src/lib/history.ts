import {
  differenceInDays,
  endOfDay,
  endOfWeek,
  format,
  isWithinInterval,
  startOfDay,
  startOfWeek,
  subDays,
} from "date-fns";
import { es } from "date-fns/locale";
import { db } from "@/db";
import type {
  OTDocument,
  PeriodFilter,
  StageDetail,
  StageStop,
  TimeHistoryStats,
  WorkerHistorySummary,
} from "@/lib/history-types";

async function fetchOtRows() {
  return db.query.ot.findMany({
    with: {
      tipoProducto: {
        with: {
          workflowEtapas: {
            with: { etapa: true },
            orderBy: (we, { asc }) => [asc(we.orden)],
          },
        },
      },
      actividades: {
        with: {
          etapa: true,
          workflowEtapa: {
            with: { etapa: true },
          },
          maquina: true,
          operador: true,
          paradas: true,
        },
        orderBy: (a, { asc, desc }) => [
          asc(a.ordenEtapa),
          asc(a.horaInicio),
          desc(a.horaTermino),
        ],
      },
    },
    orderBy: (o, { desc }) => [desc(o.fechaTermino), desc(o.fechaInicio), desc(o.fechaCreacion)],
  });
}

type OtRow = Awaited<ReturnType<typeof fetchOtRows>>[number];

function formatTime(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds || seconds <= 0) return "0m 0s";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder}s`;
}

function buildStageStop(stop: {
  motivo: string;
  horaInicio: Date | string;
  horaTermino: Date | string | null;
  duracionSegundos: number | null;
}): StageStop {
  return {
    reason: stop.motivo,
    startTime: formatTime(stop.horaInicio),
    endTime: stop.horaTermino ? formatTime(stop.horaTermino) : "En curso",
    duration: stop.horaTermino
      ? formatDuration(stop.duracionSegundos)
      : "En curso",
  };
}

function buildFlowMetadata(row: OtRow) {
  const steps = row.tipoProducto.workflowEtapas.map((step) => ({
    workflowEtapaId: step.id,
    etapaId: step.etapaId,
    label: step.nombrePaso || step.etapa.nombre,
    orden: step.orden,
  }));

  const labelByWorkflowEtapaId = new Map(
    steps.map((step) => [step.workflowEtapaId, step.label])
  );
  const labelByEtapaId = new Map<string, string>();

  for (const step of steps) {
    if (!labelByEtapaId.has(step.etapaId)) {
      labelByEtapaId.set(step.etapaId, step.label);
    }
  }

  return {
    flow: steps.map((step) => step.label),
    labelByWorkflowEtapaId,
    labelByEtapaId,
  };
}

function buildStageDetail(
  activity: OtRow["actividades"][number],
  stageName: string
): StageDetail {
  return {
    stageName,
    machineName: activity.maquina?.nombre || "Logística",
    workerName: activity.operador?.nombre || "Sin operador",
    workerRut: activity.operador?.rut || "",
    startTime: new Date(activity.horaInicio).toISOString(),
    endTime: activity.horaTermino
      ? new Date(activity.horaTermino).toISOString()
      : new Date(activity.horaInicio).toISOString(),
    unitsProduced: activity.unidadesProducidas || 0,
    outputsPerStroke: activity.salidasPorGolpe || 1,
    averageSpeed: activity.velocidadPromedio || 0,
    speedUnit:
      activity.maquina?.unidadMetrica ||
      activity.etapa.unidadDisplay ||
      "u/min",
    standardDeviation: activity.desviacionEstandar || 0,
    stops: (activity.paradas || []).map(buildStageStop),
  };
}

export function mapOtRowToDocument(row: OtRow): OTDocument {
  const { flow, labelByWorkflowEtapaId, labelByEtapaId } = buildFlowMetadata(row);

  const activities = [...row.actividades].sort((a, b) => {
    const orderDiff = (a.ordenEtapa ?? 0) - (b.ordenEtapa ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return new Date(a.horaInicio).getTime() - new Date(b.horaInicio).getTime();
  });

  const stages = activities.map((activity) => {
    const stageName =
      (activity.workflowEtapaId
        ? labelByWorkflowEtapaId.get(activity.workflowEtapaId)
        : undefined) ||
      labelByEtapaId.get(activity.etapaId) ||
      activity.etapa.nombre;

    return buildStageDetail(activity, stageName);
  });

  const stageTimestamps = stages.reduce<OTDocument["stageTimestamps"]>((acc, stage) => {
    acc[stage.stageName] = {
      start: new Date(stage.startTime),
      end: new Date(stage.endTime),
    };
    return acc;
  }, {});

  const firstStage = stages[0];
  const lastStage = stages[stages.length - 1];
  const measurableStages = stages.filter((stage) => stage.averageSpeed > 0);
  const currentStageName =
    row.estado === "historial"
      ? "COMPLETADO"
      : lastStage?.stageName || flow[0] || "COMPLETADO";

  const totalUnits = stages.reduce((sum, stage) => sum + stage.unitsProduced, 0);
  const totalStops = stages.reduce((sum, stage) => sum + stage.stops.length, 0);
  const averageSpeed =
    measurableStages.length > 0
      ? Math.round(
          measurableStages.reduce((sum, stage) => sum + stage.averageSpeed, 0) /
            measurableStages.length
        )
      : 0;
  const standardDeviation =
    measurableStages.length > 0
      ? Number(
          (
            measurableStages.reduce(
              (sum, stage) => sum + stage.standardDeviation,
              0
            ) / measurableStages.length
          ).toFixed(2)
        )
      : 0;

  return {
    id: row.codigo,
    status: row.estado,
    currentStageName,
    createdAt: new Date(row.fechaCreacion || row.fechaInicio || new Date()).toISOString(),
    client: row.cliente,
    productName: row.tipoProducto.nombre,
    sku: row.sku || "",
    targetUnits: row.metaUnidades || 0,
    flow: flow.length > 0 ? flow : stages.map((stage) => stage.stageName),
    stageTimestamps,
    stages,
    workerName: firstStage?.workerName || "Sin operador",
    rut: firstStage?.workerRut || "",
    machineName: lastStage?.machineName || "Sin máquina",
    startTime: new Date(
      row.fechaInicio || firstStage?.startTime || row.fechaCreacion || new Date()
    ).toISOString(),
    endTime: new Date(
      row.fechaTermino || lastStage?.endTime || row.fechaInicio || row.fechaCreacion || new Date()
    ).toISOString(),
    unitsProduced: totalUnits,
    averageSpeed,
    stopsCount: totalStops,
    standardDeviation,
    speedUnit: lastStage?.speedUnit || "u/min",
  };
}

export async function fetchCompletedOtDocuments() {
  const rows = await fetchOtRows();
  return rows
    .filter((row) => row.estado === "historial")
    .map(mapOtRowToDocument);
}

export async function fetchOtDocumentByCode(code: string) {
  const rows = await db.query.ot.findMany({
    where: (o, { eq }) => eq(o.codigo, code),
    with: {
      tipoProducto: {
        with: {
          workflowEtapas: {
            with: { etapa: true },
            orderBy: (we, { asc }) => [asc(we.orden)],
          },
        },
      },
      actividades: {
        with: {
          etapa: true,
          workflowEtapa: {
            with: { etapa: true },
          },
          maquina: true,
          operador: true,
          paradas: true,
        },
        orderBy: (a, { asc, desc }) => [
          asc(a.ordenEtapa),
          asc(a.horaInicio),
          desc(a.horaTermino),
        ],
      },
    },
  });

  const row = rows[0];
  return row ? mapOtRowToDocument(row) : null;
}

export function searchHistoryOts(ots: OTDocument[], rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return ots;

  return ots.filter((ot) => {
    const values = [
      ot.id,
      ot.client,
      ot.productName,
      ot.sku,
      ot.workerName,
      ot.machineName,
      ...ot.stages.flatMap((stage) => [
        stage.stageName,
        stage.machineName,
        stage.workerName,
        stage.workerRut,
      ]),
    ];

    return values.some((value) => value.toLowerCase().includes(query));
  });
}

export async function fetchWorkerHistorySummaries() {
  const ots = await fetchCompletedOtDocuments();
  const workerMap = new Map<
    string,
    {
      id: string;
      name: string;
      rut: string;
      totalUnits: number;
      speedTotal: number;
      speedCount: number;
      deviationTotal: number;
      deviationCount: number;
      recentOts: OTDocument[];
      otIds: Set<string>;
      lastUnit: string;
      lastActivityAt: number;
    }
  >();

  for (const ot of ots) {
    const seenInOt = new Set<string>();

    for (const stage of ot.stages) {
      if (!stage.workerName || stage.workerName === "Sin operador") continue;

      const key = stage.workerRut || stage.workerName;
      const activityAt = new Date(stage.endTime || stage.startTime).getTime();
      const existing = workerMap.get(key) ?? {
        id: key,
        name: stage.workerName,
        rut: stage.workerRut || "Sin RUT",
        totalUnits: 0,
        speedTotal: 0,
        speedCount: 0,
        deviationTotal: 0,
        deviationCount: 0,
        recentOts: [],
        otIds: new Set<string>(),
        lastUnit: stage.speedUnit,
        lastActivityAt: 0,
      };

      existing.totalUnits += stage.unitsProduced;

      if (stage.averageSpeed > 0) {
        existing.speedTotal += stage.averageSpeed;
        existing.speedCount += 1;
        existing.lastUnit = stage.speedUnit;
      }

      existing.deviationTotal += stage.standardDeviation;
      existing.deviationCount += 1;
      existing.lastActivityAt = Math.max(existing.lastActivityAt, activityAt);

      if (!existing.otIds.has(ot.id)) {
        existing.otIds.add(ot.id);
        existing.recentOts.push(ot);
      }

      if (!seenInOt.has(key)) {
        seenInOt.add(key);
      }

      workerMap.set(key, existing);
    }
  }

  return Array.from(workerMap.values())
    .map<WorkerHistorySummary>((worker) => ({
      id: worker.id,
      name: worker.name,
      rut: worker.rut,
      totalOts: worker.otIds.size,
      totalUnits: worker.totalUnits,
      avgSpeed:
        worker.speedCount > 0
          ? Math.round(worker.speedTotal / worker.speedCount)
          : 0,
      avgStandardDeviation:
        worker.deviationCount > 0
          ? (
              worker.deviationTotal / worker.deviationCount
            ).toFixed(2)
          : "0.00",
      recentOts: worker.recentOts
        .sort(
          (a, b) =>
            new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
        )
        .slice(0, 5),
      lastUnit: worker.lastUnit,
    }))
    .sort((a, b) => b.totalUnits - a.totalUnits);
}

export function resolvePeriodRange(period: PeriodFilter, now = new Date()) {
  if (period === "today") {
    return { start: startOfDay(now), end: endOfDay(now) };
  }

  if (period === "week") {
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
  }

  return { start: subDays(now, 30), end: endOfDay(now) };
}

export function buildTimeHistoryStats(ots: OTDocument[]): TimeHistoryStats | null {
  if (ots.length === 0) return null;

  const totalUnits = ots.reduce((acc, ot) => acc + ot.unitsProduced, 0);
  const totalOts = ots.length;
  const avgEfficiency = Math.round(
    ots.reduce((acc, ot) => {
      const target = ot.targetUnits || 1;
      return acc + (ot.unitsProduced / target) * 100;
    }, 0) / totalOts
  );

  const sortedOts = [...ots].sort(
    (a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime()
  );
  const firstDate = new Date(sortedOts[0].endTime);
  const lastDate = new Date(sortedOts[sortedOts.length - 1].endTime);
  const isDaily =
    differenceInDays(lastDate, firstDate) > 1 || sortedOts.length > 20;

  const groups = new Map<string, number>();

  for (const ot of sortedOts) {
    const date = new Date(ot.endTime);
    const key = isDaily ? format(date, "yyyy-MM-dd") : format(date, "HH:00");
    groups.set(key, (groups.get(key) || 0) + ot.unitsProduced);
  }

  const chartData = Array.from(groups.entries())
    .map(([key, value]) => ({
      name: isDaily ? format(new Date(key), "dd MMM", { locale: es }) : key,
      fullName: isDaily ? format(new Date(key), "PPP", { locale: es }) : key,
      units: value,
      originalKey: key,
    }))
    .sort((a, b) => a.originalKey.localeCompare(b.originalKey));

  return {
    totalUnits,
    totalOts,
    avgEfficiency,
    chartData,
  };
}

export async function fetchTimeHistory(period: PeriodFilter) {
  const ots = await fetchCompletedOtDocuments();
  const { start, end } = resolvePeriodRange(period);

  const filteredOts = ots.filter((ot) =>
    isWithinInterval(new Date(ot.endTime), { start, end })
  );

  return {
    period,
    start,
    end,
    ots: filteredOts,
    stats: buildTimeHistoryStats(filteredOts),
  };
}
