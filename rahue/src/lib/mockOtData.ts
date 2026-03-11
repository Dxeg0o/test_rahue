import { addMinutes, subDays, subHours, subMinutes } from "date-fns";
import { ProductStage, StageTimestamps, Stop } from "./demo-context";

// Helper to calculate realistic logistic timestamps
function getLogisticTimestamps(startBase: Date, minOffset: number, maxOffset: number): StageTimestamps {
    const mins = minOffset + Math.floor(Math.random() * (maxOffset - minOffset));
    return {
        start: new Date(startBase.getTime() - mins * 60000),
        end: new Date(startBase.getTime() - Math.floor(mins * 0.1) * 60000)
    };
}

// --- Per-stage detail for each production step ---
export interface StageDetail {
  stageName: ProductStage;
  machineName: string;
  workerName: string;
  workerRut: string;
  startTime: string; // ISO
  endTime: string; // ISO
  unitsProduced: number;
  outputsPerStroke: number;
  averageSpeed: number;
  speedUnit: string;
  standardDeviation: number;
  stops: StageStop[];
}

export interface StageStop {
  reason: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: string;
}

export interface OTDocument {
  id: string; // OT-XXXX
  // Generic OT info
  createdAt: string; // ISO - when the OT was created
  client: string;
  productName: string; // e.g. Cono, Tapas
  sku: string;
  targetUnits: number;
  // Flow
  flow: ProductStage[];
  stageTimestamps: Record<string, StageTimestamps>;
  // Per-stage details
  stages: StageDetail[];
  // Legacy aggregated (computed from stages)
  workerName: string; // Primary worker (first stage)
  rut: string;
  machineName: string; // Primary machine (current/last stage)
  startTime: string; // ISO - production start
  endTime: string; // ISO - production end
  unitsProduced: number;
  averageSpeed: number;
  stopsCount: number;
  standardDeviation: number;
  speedUnit: string;
}

export const WORKERS = [
  { id: "W1", name: "Juan Pérez", rut: "12.345.678-9" },
  { id: "W2", name: "María González", rut: "9.876.543-2" },
  { id: "W3", name: "Carlos Ruiz", rut: "15.432.109-8" },
  { id: "W4", name: "Ana López", rut: "18.765.432-1" },
  { id: "W5", name: "Pedro Sánchez", rut: "10.987.654-3" },
  { id: "W6", name: "Laura Díaz", rut: "16.666.666-6" },
  { id: "W7", name: "Jorge Martínez", rut: "17.777.777-7" },
  { id: "W8", name: "Claudia Ruiz", rut: "18.888.888-8" }
];

const MACHINES_BY_AREA: Record<string, string[]> = {
  "Impresión": ["Impresión 1", "Impresión 2", "Impresión 3"],
  "Troquelado": ["Troquelado 4", "Troquelado 5", "Troquelado 6", "Troquelado 7", "Troquelado 8", "Troquelado 9", "Troquelado 10", "Troquelado 11"],
  "Formado": ["Formado 12", "Formado 13", "Formado 14", "Formado 15"]
};

const ALL_MACHINES = [
    "Impresión 1", "Impresión 2", "Impresión 3",
    "Troquelado 4", "Troquelado 5", "Troquelado 6", "Troquelado 7", "Troquelado 8", "Troquelado 9", "Troquelado 10", "Troquelado 11",
    "Formado 12", "Formado 13", "Formado 14", "Formado 15"
];

const CLIENTS = [
  "Coca-Cola", "Nestlé", "Unilever", "CCU", "Carozzi",
  "Soprole", "Colun", "Watts", "Agrosuper", "Iansa"
];

const SKUS: Record<string, string[]> = {
  "Cono": ["CONO-350-6PK", "CONO-500-4PK", "CONO-250-12PK", "CONO-1L-3PK"],
  "Tapas": ["TAPA-60MM-STD", "TAPA-80MM-PRE", "TAPA-45MM-MIN", "TAPA-100MM-IND"],
  "Tapas Troqueladas": ["TTROQ-60MM-A", "TTROQ-80MM-B", "TTROQ-45MM-C"]
};

const SPEED_UNITS: Record<string, string> = {
  "Impresión": "m/min",
  "Troquelado": "gpm",
  "Formado": "u/min"
};

const STOP_REASONS = [
  "Ajuste de máquina",
  "Cambio de bobina",
  "Falla eléctrica",
  "Limpieza programada",
  "Almuerzo operador",
  "Falta de material",
  "Mantenimiento preventivo",
  "Cambio de turno"
];

// --- NEW: Pending OTs for Operator Selection ---
export const PENDING_OTS = [
    { id: "OT-3001", client: "Coca-Cola", product: "Caja 6pack 350ml", sku: "CONO-350-6PK", target: 50000, outputs: 8 },
    { id: "OT-3002", client: "Nestlé", product: "Estuche Cereales 500g", sku: "TAPA-60MM-STD", target: 25000, outputs: 4 },
    { id: "OT-3003", client: "Unilever", product: "Display Detergente 1kg", sku: "TTROQ-80MM-B", target: 12000, outputs: 6 },
    { id: "OT-3004", client: "CCU", product: "Bandeja Cerveza 470ml", sku: "CONO-500-4PK", target: 80000, outputs: 10 },
    { id: "OT-3005", client: "Carozzi", product: "Caja Fideos 400g", sku: "TAPA-80MM-PRE", target: 35000, outputs: 5 },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomExcluding<T>(arr: T[], exclude: T): T {
  const filtered = arr.filter(x => x !== exclude);
  return filtered.length > 0 ? pickRandom(filtered) : exclude;
}

function generateStageStops(count: number, stageStart: Date, stageEnd: Date): StageStop[] {
  const stops: StageStop[] = [];
  const stageDurationMs = stageEnd.getTime() - stageStart.getTime();

  for (let i = 0; i < count; i++) {
    const offsetMs = Math.random() * stageDurationMs * 0.8;
    const stopStart = new Date(stageStart.getTime() + offsetMs);
    const durationMin = Math.floor(Math.random() * 12) + 1;
    const durationSec = Math.floor(Math.random() * 60);
    const stopEnd = new Date(stopStart.getTime() + durationMin * 60000 + durationSec * 1000);

    const startH = stopStart.getHours().toString().padStart(2, "0");
    const startM = stopStart.getMinutes().toString().padStart(2, "0");
    const endH = stopEnd.getHours().toString().padStart(2, "0");
    const endM = stopEnd.getMinutes().toString().padStart(2, "0");

    stops.push({
      reason: pickRandom(STOP_REASONS),
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:${endM}`,
      duration: `${durationMin}m ${durationSec}s`
    });
  }

  return stops.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function generateMockOTs(count: number = 300): OTDocument[] {
  const ots: OTDocument[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    // Distribute OTs over last 60 days
    const daysBack = Math.floor(Math.random() * 60);
    const dayBase = subDays(now, daysBack);

    // Random product/flow
    const rand = Math.random();
    let flowName = "";
    let flowStages: ProductStage[] = [];

    if (rand < 0.33) {
      flowName = "Cono";
      flowStages = ["Llegada Materiales", "Impresión", "Troquelado", "Formado", "Envío a Bodega", "Llegada a Bodega", "Entrega Cliente"];
    } else if (rand < 0.66) {
      flowName = "Tapas";
      flowStages = ["Llegada Materiales", "Impresión", "Troquelado", "Formado", "Envío a Bodega", "Llegada a Bodega", "Entrega Cliente"];
    } else {
      flowName = "Tapas Troqueladas";
      flowStages = ["Llegada Materiales", "Impresión", "Troquelado", "Envío a Bodega", "Llegada a Bodega", "Entrega Cliente"];
    }

    const client = pickRandom(CLIENTS);
    const skuOptions = SKUS[flowName] || ["SKU-GEN-001"];
    const sku = pickRandom(skuOptions);

    // OT creation is before production starts (e.g. 1-24 hours before)
    const creationOffset = Math.floor(Math.random() * 24 * 60) + 60; // 1-24 hours in minutes

    // Build per-stage data with sequential timing
    const stages: StageDetail[] = [];
    const stageTimestamps: Record<string, StageTimestamps> = {};
    let totalUnitsProduced = 0;
    let totalStops = 0;
    let overallStart: Date | null = null;
    let overallEnd: Date | null = null;

    // Each stage duration: 30 min to 4 hours
    let stageStartTime = subMinutes(dayBase, creationOffset - 60); // First stage starts ~1h after creation

    flowStages.forEach((stage, idx) => {
      // Non-production stages
      if (["Llegada Materiales", "Envío a Bodega", "Llegada a Bodega", "Entrega Cliente"].includes(stage)) {
          // They don't generate units or have machines/workers in the same way, but they need timestamps
          return;
      }

      const stageDurationMin = Math.floor(Math.random() * 210) + 30; // 30-240 min
      const stageEndTime = addMinutes(stageStartTime, stageDurationMin);

      // Each stage has its own worker and machine
      const machinesForArea = MACHINES_BY_AREA[stage] || ALL_MACHINES;
      const machineName = pickRandom(machinesForArea);

      // Different worker for each stage
      const worker = WORKERS[(i + idx) % WORKERS.length];
      // Sometimes pick a different one to add variation
      const finalWorker = Math.random() > 0.3 ? worker : pickRandomExcluding(WORKERS, worker);

      const speedUnit = SPEED_UNITS[stage] || "gpm";
      const avgSpeed = 40 + Math.floor(Math.random() * 50);
      const speedModifier = 0.8 + Math.random() * 0.4;
      const finalSpeed = Math.floor(avgSpeed * speedModifier);
      const stageUnits = Math.floor(finalSpeed * stageDurationMin * 0.85);
      const stageStopsCount = Math.floor(Math.random() * 4);
      const outputsPerStroke = Math.floor(Math.random() * 8) + 2;

      const stageStops = generateStageStops(stageStopsCount, stageStartTime, stageEndTime);

      stages.push({
        stageName: stage,
        machineName,
        workerName: finalWorker.name,
        workerRut: finalWorker.rut,
        startTime: stageStartTime.toISOString(),
        endTime: stageEndTime.toISOString(),
        unitsProduced: stageUnits,
        outputsPerStroke,
        averageSpeed: finalSpeed,
        speedUnit,
        standardDeviation: Number((0.5 + Math.random() * 4.5).toFixed(2)),
        stops: stageStops
      });

      stageTimestamps[stage] = { start: stageStartTime, end: stageEndTime };
      totalUnitsProduced += stageUnits;
      totalStops += stageStopsCount;

      if (!overallStart) overallStart = stageStartTime;
      overallEnd = stageEndTime;

      // Gap between stages: 15 min to 2 hours (transit, setup)
      const gapMin = Math.floor(Math.random() * 105) + 15;
      stageStartTime = addMinutes(stageEndTime, gapMin);
    });

    // Populate Logistic Timestamps
    if (overallStart && overallEnd) {
        stageTimestamps["Llegada Materiales"] = getLogisticTimestamps(overallStart, 120, 240);
        
        const finalEnd = overallEnd as Date;
        const envioStart = new Date(finalEnd.getTime() + 15 * 60000); // 15 mins after last production stage
        stageTimestamps["Envío a Bodega"] = { start: envioStart, end: new Date(envioStart.getTime() + 30 * 60000) };
        
        // Typecast to bypass TS incorrectly inferring never for the end property
        const envioData = stageTimestamps["Envío a Bodega"] as StageTimestamps;
        const envioEnd = envioData.end || new Date(envioStart.getTime() + 30 * 60000);
        
        const llegadaStart = new Date(envioEnd);
        stageTimestamps["Llegada a Bodega"] = { start: llegadaStart, end: new Date(llegadaStart.getTime() + 15 * 60000) };
        
        const llegadaData = stageTimestamps["Llegada a Bodega"] as StageTimestamps;
        const llegadaEnd = llegadaData.end || new Date(llegadaStart.getTime() + 15 * 60000);
        
        const entregaStart = new Date(llegadaEnd.getTime() + Math.random() * 24 * 60 * 60000); // Between 0 and 24 hours later
        stageTimestamps["Entrega Cliente"] = { start: entregaStart, end: new Date(entregaStart.getTime() + 120 * 60000) };
    }

    const startForFix: Date = overallStart ?? new Date();
    
    // Final check for overallStart logic
    const createdAt = subMinutes(startForFix, creationOffset - 60 + Math.floor(Math.random() * 60));
    const targetUnits = Math.ceil(totalUnitsProduced / 500) * 500 + Math.floor(Math.random() * 5) * 500;

    // Last stage details for aggregated fields
    const lastStage = stages[stages.length - 1];
    const firstStage = stages[0];

    ots.push({
      id: `OT-${25000 + i}`,
      createdAt: createdAt.toISOString(),
      client,
      productName: flowName,
      sku,
      targetUnits,
      flow: flowStages,
      stageTimestamps,
      stages,
      // Legacy aggregated
      workerName: firstStage.workerName,
      rut: firstStage.workerRut,
      machineName: lastStage.machineName,
      startTime: overallStart!.toISOString(),
      endTime: overallEnd!.toISOString(),
      unitsProduced: totalUnitsProduced,
      averageSpeed: Math.round(stages.reduce((s, st) => s + st.averageSpeed, 0) / stages.length),
      stopsCount: totalStops,
      standardDeviation: Number((stages.reduce((s, st) => s + st.standardDeviation, 0) / stages.length).toFixed(2)),
      speedUnit: lastStage.speedUnit
    });
  }

  return ots.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

export const mockOTs = generateMockOTs();

// --- Aggregation Helpers ---

export function getWorkerStats(workerName: string) {
  // Now check both legacy workerName and per-stage workerNames
  const workerOts = mockOTs.filter(ot =>
    ot.workerName === workerName || ot.stages.some(s => s.workerName === workerName)
  );
  const totalOts = workerOts.length;
  if (totalOts === 0) return null;

  const totalUnits = workerOts.reduce((acc, ot) => acc + ot.unitsProduced, 0);
  const avgSpeed = Math.round(workerOts.reduce((acc, ot) => acc + ot.averageSpeed, 0) / totalOts);
  const avgStandardDeviation = (workerOts.reduce((acc, ot) => acc + ot.standardDeviation, 0) / totalOts).toFixed(2);
  const lastUnit = workerOts.length > 0 ? workerOts[0].speedUnit : "u/m";

  return {
    name: workerName,
    rut: WORKERS.find(w => w.name === workerName)?.rut || "Sin RUT",
    totalOts,
    totalUnits,
    avgSpeed,
    avgStandardDeviation,
    recentOts: workerOts.slice(0, 5),
    lastUnit
  };
}
