import { NextResponse } from "next/server";
import { db } from "@/db";
import type {
  MachineState,
  ActiveOrder,
  DemoMetrics,
  HistoryPoint,
  Stop,
  ProductStage,
  StageTimestamps,
  DemoStageDetail,
  OrderStatus,
} from "@/lib/demo-context";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function mapEstado(estado: string): OrderStatus {
  switch (estado) {
    case "calentando":  return "WARMING_UP";
    case "produciendo": return "RUNNING";
    case "pausada":     return "PAUSED";
    case "completada":  return "COMPLETED";
    default:            return "IDLE";
  }
}

function buildStopFromParada(p: {
  id: string;
  motivo: string;
  horaInicio: Date | string;
  horaTermino: Date | string | null;
  duracionSegundos: number | null;
}): Stop {
  return {
    id: p.id,
    startTime: fmtTime(p.horaInicio),
    endTime: p.horaTermino ? fmtTime(p.horaTermino) : "En curso",
    duration: p.duracionSegundos
      ? `${Math.floor(p.duracionSegundos / 60)}m ${p.duracionSegundos % 60}s`
      : "En curso",
    reason: p.motivo,
  };
}

// ── GET /api/planta ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    // 1. All physical machines with their etapa
    const allMachines = await db.query.maquina.findMany({
      with: { etapa: true },
    });

    // 2. All non-completed activities
    const activeActivities = await db.query.actividadOt.findMany({
      where: (a, { ne }) => ne(a.estado, "completada"),
      with: {
        ot: true,
        etapa: true,
        operador: true,
        paradas: true,
      },
    });

    // Index active activities by maquina_id (most recent wins)
    const actByMachine = new Map<string, (typeof activeActivities)[0]>();
    for (const act of activeActivities) {
      if (!act.maquinaId) continue;
      const existing = actByMachine.get(act.maquinaId);
      if (!existing || new Date(act.horaInicio) > new Date(existing.horaInicio)) {
        actByMachine.set(act.maquinaId, act);
      }
    }

    // 3. Full OT data for active OTs (workflow + all activities)
    const activeOtIds = [...new Set(activeActivities.map((a) => a.otId))];
    const otMap = new Map<string, Awaited<ReturnType<typeof fetchOtData>>[0]>();

    if (activeOtIds.length > 0) {
      const ots = await fetchOtData(activeOtIds);
      for (const o of ots) otMap.set(o.id, o);
    }

    // 4. Readings for active activities (last 30 per activity)
    const readingsMap = new Map<string, { minuto: Date | string; conteoLecturas: number }[]>();
    const activeActIds = activeActivities.map((a) => a.id);

    if (activeActIds.length > 0) {
      const readings = await db.query.lecturaPorMinuto.findMany({
        where: (l, { inArray }) => inArray(l.actividadOtId, activeActIds),
        orderBy: (l, { desc }) => [desc(l.minuto)],
      });
      for (const r of readings) {
        if (!r.actividadOtId) continue;
        const list = readingsMap.get(r.actividadOtId) ?? [];
        if (list.length < 30) list.push(r);
        readingsMap.set(r.actividadOtId, list);
      }
    }

    // 5. Build MachineState[] for physical machines
    const result: MachineState[] = allMachines.map((m) => {
      const act = actByMachine.get(m.id);
      const otData = act ? otMap.get(act.otId) : null;
      const readings = act ? (readingsMap.get(act.id) ?? []).slice().reverse() : [];

      return buildMachineState(m, act ?? null, otData ?? null, readings);
    });

    // 6. Add virtual entries for logistics activities (no physical machine)
    for (const act of activeActivities) {
      if (act.maquinaId) continue; // already handled above
      const otData = otMap.get(act.otId);
      if (!otData) continue;
      result.push(buildLogisticsMachineState(act, otData));
    }

    // 7. Pending OTs for management sidebar
    const pendingOts = await db.query.ot.findMany({
      where: (o, { eq }) => eq(o.estado, "sin_comenzar"),
      with: { tipoProducto: true },
      orderBy: (o, { desc }) => [desc(o.fechaCreacion)],
    });

    // 7b. Waiting OTs (between steps)
    const waitingOts = await db.query.ot.findMany({
      where: (o, { eq }) => eq(o.estado, "esperando"),
      with: { tipoProducto: true },
      orderBy: (o, { desc }) => [desc(o.fechaCreacion)],
    });

    // 8. Completed OTs count (today)
    const completedOts = await db.query.ot.findMany({
      where: (o, { eq }) => eq(o.estado, "historial"),
      columns: { id: true, fechaTermino: true },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const completedToday = completedOts.filter(
      (o) => o.fechaTermino && new Date(o.fechaTermino) >= todayStart
    ).length;
    const completedWeek = completedOts.length;

    // 9. Stage Categories map for dynamic UI rendering
    const etapasRows = await db.query.etapa.findMany({
      with: { categoria: true }
    });
    
    const stageCategories: Record<string, string> = {};
    for (const e of etapasRows) {
      if (e.categoria) {
         stageCategories[e.nombre] = e.categoria.nombre;
      }
    }

    return NextResponse.json(
      {
        machines: result,
        pendingOts: pendingOts.map((o) => ({
          id: o.codigo,
          client: o.cliente,
          product: o.tipoProducto.nombre,
          sku: o.sku || "",
          target: o.metaUnidades || 0,
          outputs: 1,
        })),
        waitingOts: waitingOts.map((o) => ({
          id: o.codigo,
          client: o.cliente,
          product: o.tipoProducto.nombre,
          sku: o.sku || "",
          target: o.metaUnidades || 0,
          outputs: 1,
        })),
        stats: { completedToday, completedWeek },
        stageCategories,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Error fetching planta data:", error);
    return NextResponse.json({ machines: [], pendingOts: [], stats: {} }, { status: 500 });
  }
}

// ── Query helpers ────────────────────────────────────────────────────────────

async function fetchOtData(otIds: string[]) {
  return db.query.ot.findMany({
    where: (o, { inArray }) => inArray(o.id, otIds),
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
          operador: true,
          maquina: true,
          paradas: true,
        },
        orderBy: (a, { asc }) => [asc(a.ordenEtapa)],
      },
    },
  });
}

// ── Builders ─────────────────────────────────────────────────────────────────

type Machine = Awaited<ReturnType<typeof db.query.maquina.findMany>>[0] & {
  etapa: Awaited<ReturnType<typeof db.query.etapa.findMany>>[0];
};
type Activity = Awaited<ReturnType<typeof db.query.actividadOt.findMany>>[0] & {
  ot: Awaited<ReturnType<typeof db.query.ot.findMany>>[0];
  etapa: Awaited<ReturnType<typeof db.query.etapa.findMany>>[0];
  operador: Awaited<ReturnType<typeof db.query.usuario.findMany>>[0] | null;
  paradas: Awaited<ReturnType<typeof db.query.parada.findMany>>;
};
type OtFull = Awaited<ReturnType<typeof fetchOtData>>[0];
type ReadingRow = { minuto: Date | string; conteoLecturas: number };

function buildMachineState(
  m: Machine,
  act: Activity | null,
  otData: OtFull | null,
  readings: ReadingRow[]
): MachineState {
  // Speed unit
  let speedUnit = m.unidadMetrica || m.etapa.unidadDisplay || "N/A";
  if (m.etapa.tipoMetrica === "logistica") speedUnit = "N/A";

  // No active activity → idle machine
  if (!act || !otData) {
    return {
      id: m.id,
      name: m.nombre,
      area: m.etapa.nombre as ProductStage,
      order: null,
      metrics: emptyMetrics(speedUnit),
      history: [],
      stops: [],
      status: "IDLE",
      internalHits: 0,
    };
  }

  // Machine status
  const machineStatus: "RUNNING" | "IDLE" =
    act.estado === "calentando" || act.estado === "produciendo" ? "RUNNING" : "IDLE";

  // History from readings
  const history: HistoryPoint[] = readings.map((r) => ({
    time: fmtTime(r.minuto),
    speed: r.conteoLecturas,
    target: act.velocidadObjetivo || 0,
  }));

  // Current speed: latest reading or activity average
  const latestReading = readings[readings.length - 1];
  const currentSpeed = machineStatus === "RUNNING"
    ? (latestReading?.conteoLecturas ?? act.velocidadPromedio ?? 0)
    : 0;

  // Stops on current activity
  const stops: Stop[] = (act.paradas ?? []).map(buildStopFromParada);

  // Build order — flow comes from the CURRENT workflow definition.
  const flow: ProductStage[] = otData.tipoProducto.workflowEtapas.map(
    (we) => we.etapa.nombre as ProductStage
  );

  // Only include stages that are still part of the current workflow.
  // If a stage was removed from the workflow after the OT was created,
  // its activities still exist in the DB but should not be shown.
  const currentEtapaIds = new Set(
    otData.tipoProducto.workflowEtapas.map((we) => we.etapaId)
  );

  // Stage timestamps — only for stages in the current workflow
  const stageTimestamps: Record<string, StageTimestamps> = {};
  for (const a of otData.actividades) {
    if (!currentEtapaIds.has(a.etapaId)) continue;
    stageTimestamps[a.etapa.nombre] = {
      start: new Date(a.horaInicio),
      ...(a.horaTermino ? { end: new Date(a.horaTermino) } : {}),
    };
  }

  // Stages detail — completed past stages, only from the current workflow
  const stagesDetail: DemoStageDetail[] = otData.actividades
    .filter((a) => a.estado === "completada" && a.id !== act.id && currentEtapaIds.has(a.etapaId))
    .map((a) => ({
      stageName: a.etapa.nombre,
      machineName: a.maquina?.nombre || "Logística",
      workerName: a.operador?.nombre || "Sin operador",
      workerRut: a.operador?.rut || "",
      startTime: new Date(a.horaInicio).toISOString(),
      endTime: a.horaTermino ? new Date(a.horaTermino).toISOString() : "",
      unitsProduced: a.unidadesProducidas || 0,
      outputsPerStroke: a.salidasPorGolpe || 1,
      averageSpeed: a.velocidadPromedio || 0,
      speedUnit: a.maquina?.unidadMetrica || speedUnit,
      standardDeviation: a.desviacionEstandar || 0,
      stops: (a.paradas ?? []).map(buildStopFromParada),
    }));

  // Active parada (for pause info)
  const activeParada = (act.paradas ?? []).find((p) => !p.horaTermino);

  const outputsPerStroke = act.salidasPorGolpe || 1;
  const totalUnits = act.unidadesProducidas || 0;
  const totalHits = Math.floor(totalUnits / outputsPerStroke);

  const order: ActiveOrder = {
    id: otData.codigo,
    createdAt: otData.fechaCreacion ? new Date(otData.fechaCreacion).toISOString() : undefined,
    client: otData.cliente,
    sku: otData.sku || undefined,
    productName: otData.tipoProducto.nombre,
    flow,
    stageTimestamps,
    stagesDetail,
    operatorName: act.operador?.nombre || "Sin operador",
    operatorRut: act.operador?.rut || "",
    outputs: outputsPerStroke,
    targetUnits: otData.metaUnidades || undefined,
    startTime: new Date(act.horaInicio),
    lastPauseStart: activeParada ? new Date(activeParada.horaInicio) : undefined,
    pauseReason: activeParada?.motivo,
    warmupHits: act.unidadesMerma || 0,
    status: mapEstado(act.estado),
  };

  const metrics: DemoMetrics = {
    totalHits,
    totalUnits,
    hitsPerMinute: currentSpeed,
    currentSpeed,
    minSpeed: act.velocidadMin || 0,
    maxSpeed: act.velocidadMax || 0,
    standardDeviation: act.desviacionEstandar || 0,
    outputsPerStroke,
    speedUnit,
  };

  return {
    id: m.id,
    name: m.nombre,
    area: m.etapa.nombre as ProductStage,
    order,
    metrics,
    history,
    stops,
    status: machineStatus,
    internalHits: totalHits,
  };
}

function buildLogisticsMachineState(
  act: Activity,
  otData: OtFull
): MachineState {
  const flow: ProductStage[] = otData.tipoProducto.workflowEtapas.map(
    (we) => we.etapa.nombre as ProductStage
  );

  const stageTimestamps: Record<string, StageTimestamps> = {};
  for (const a of otData.actividades) {
    stageTimestamps[a.etapa.nombre] = {
      start: new Date(a.horaInicio),
      ...(a.horaTermino ? { end: new Date(a.horaTermino) } : {}),
    };
  }

  const machineStatus: "RUNNING" | "IDLE" = act.estado === "pausada" ? "IDLE" : "RUNNING";

  return {
    id: `logistica-${act.id.substring(0, 8)}`,
    name: act.etapa.nombre,
    area: act.etapa.nombre as ProductStage,
    order: {
      id: otData.codigo,
      createdAt: otData.fechaCreacion ? new Date(otData.fechaCreacion).toISOString() : undefined,
      client: otData.cliente,
      sku: otData.sku || undefined,
      productName: otData.tipoProducto.nombre,
      flow,
      stageTimestamps,
      stagesDetail: [],
      operatorName: act.operador?.nombre || "Sin operador",
      operatorRut: act.operador?.rut || "",
      outputs: 1,
      targetUnits: otData.metaUnidades || undefined,
      startTime: new Date(act.horaInicio),
      status: mapEstado(act.estado),
    },
    metrics: emptyMetrics("N/A"),
    history: [],
    stops: (act.paradas ?? []).map(buildStopFromParada),
    status: machineStatus,
    internalHits: 0,
  };
}

function emptyMetrics(speedUnit: string): DemoMetrics {
  return {
    totalHits: 0,
    totalUnits: 0,
    hitsPerMinute: 0,
    currentSpeed: 0,
    minSpeed: 0,
    maxSpeed: 0,
    standardDeviation: 0,
    outputsPerStroke: 1,
    speedUnit,
  };
}
