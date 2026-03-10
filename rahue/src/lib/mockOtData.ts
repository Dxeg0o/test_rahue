import { addMinutes, subDays, subHours, subMinutes } from "date-fns";
import { ProductStage, StageTimestamps } from "./demo-context";

export interface OTDocument {
  id: string; // OT-XXXX
  workerName: string;
  rut: string;
  machineName: string;
  startTime: string; // ISO
  endTime: string; // ISO
  unitsProduced: number;
  targetUnits: number;
  averageSpeed: number; // units per minute
  stopsCount: number;
  standardDeviation: number; // Replaces quality
  productName: string;
  flow: ProductStage[];
  stageTimestamps: Record<string, StageTimestamps>;
  speedUnit: string;
}

export const WORKERS = [
  { id: "W1", name: "Juan Pérez", rut: "12.345.678-9" },
  { id: "W2", name: "María González", rut: "9.876.543-2" },
  { id: "W3", name: "Carlos Ruiz", rut: "15.432.109-8" },
  { id: "W4", name: "Ana López", rut: "18.765.432-1" },
  { id: "W5", name: "Pedro Sánchez", rut: "10.987.654-3" }
];

const MACHINES = [
    "Impresión 1", "Impresión 2", "Impresión 3",
    "Troquelado 4", "Troquelado 5", "Troquelado 6", "Troquelado 7", "Troquelado 8", "Troquelado 9", "Troquelado 10", "Troquelado 11",
    "Formado 12", "Formado 13", "Formado 14", "Formado 15"
];

// --- NEW: Pending OTs for Operator Selection ---
export const PENDING_OTS = [
    { id: "OT-3001", client: "Coca-Cola", product: "Caja 6pack 350ml", target: 50000, outputs: 8 },
    { id: "OT-3002", client: "Nestlé", product: "Estuche Cereales 500g", target: 25000, outputs: 4 },
    { id: "OT-3003", client: "Unilever", product: "Display Detergente 1kg", target: 12000, outputs: 6 },
    { id: "OT-3004", client: "CCU", product: "Bandeja Cerveza 470ml", target: 80000, outputs: 10 },
    { id: "OT-3005", client: "Carozzi", product: "Caja Fideos 400g", target: 35000, outputs: 5 },
];

export function generateMockOTs(count: number = 300): OTDocument[] {
  const ots: OTDocument[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    // Distribute OTs over last 60 days
    const daysBack = Math.floor(Math.random() * 60);
    const startBase = subDays(now, daysBack);
    
    // Simulate 1 to 8 hours duration
    const durationMinutes = Math.floor(Math.random() * 420) + 60; 
    const endTime = addMinutes(startBase, Math.random() * 8 * 60 + durationMinutes); // Randomize end time
    const startTime = subMinutes(endTime, durationMinutes);

    const machineName = MACHINES[Math.floor(Math.random() * MACHINES.length)];
    let speedUnit = "gpm";
    if (machineName.startsWith("Impresión")) speedUnit = "m/min";
    if (machineName.startsWith("Formado")) speedUnit = "u/min";

    // Productivity logic
    const avgSpeed = 40 + Math.floor(Math.random() * 50); // 40-90 units/min
    // Introduce some high/low performers
    const worker = WORKERS[Math.floor(Math.random() * WORKERS.length)];
    const speedModifier = 0.8 + (Math.random() * 0.4); // 0.8x to 1.2x : 1; 

    const finalSpeed = Math.floor(avgSpeed * speedModifier);
    const unitsProduced = Math.floor(finalSpeed * durationMinutes * 0.85); 
    const targetUnits = Math.ceil(unitsProduced / 500) * 500; 

    const rand = Math.random();
    let flowName = "";
    let flowStages: ProductStage[] = [];

    if (rand < 0.33) {
        flowName = "Cono";
        flowStages = ["Impresión", "Troquelado", "Formado"];
    } else if (rand < 0.66) {
        flowName = "Tapas";
        flowStages = ["Impresión", "Troquelado", "Formado"];
    } else {
        flowName = "Tapas Troqueladas";
        flowStages = ["Impresión", "Troquelado"];
    }

    const stageTimestamps: Record<string, StageTimestamps> = {};
    let currentStageStart = subHours(startTime, 2); // default print start

    flowStages.forEach((stage) => {
        if (stage === "Troquelado") {
            stageTimestamps[stage] = { start: startTime, end: endTime };
            currentStageStart = endTime;
        } else if (stage === "Impresión") {
            stageTimestamps[stage] = { start: currentStageStart, end: startTime };
        } else if (stage === "Formado") {
            const formEnd = addMinutes(currentStageStart, durationMinutes * 0.8);
            stageTimestamps[stage] = { start: currentStageStart, end: formEnd };
            currentStageStart = formEnd;
        }
    });

    ots.push({
      id: `OT-${25000 + i}`,
      workerName: worker.name,
      rut: worker.rut,
      machineName: MACHINES[Math.floor(Math.random() * MACHINES.length)],
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      unitsProduced,
      targetUnits,
      averageSpeed: finalSpeed,
      stopsCount: Math.floor(Math.random() * 12),
      standardDeviation: Number((0.5 + Math.random() * 4.5).toFixed(2)),
      productName: flowName,
      flow: flowStages,
      stageTimestamps,
      speedUnit
    });
  }

  return ots.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

export const mockOTs = generateMockOTs();

// --- Aggregation Helpers ---

export function getWorkerStats(workerName: string) {
  const workerOts = mockOTs.filter(ot => ot.workerName === workerName);
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
