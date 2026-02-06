
import { addMinutes, subDays, subHours } from "date-fns";

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
  quality: number; // Percentage 0-100
}

export const WORKERS = [
  { id: "W1", name: "Juan Pérez", rut: "12.345.678-9" },
  { id: "W2", name: "María González", rut: "9.876.543-2" },
  { id: "W3", name: "Carlos Ruiz", rut: "15.432.109-8" },
  { id: "W4", name: "Ana López", rut: "18.765.432-1" },
  { id: "W5", name: "Pedro Sánchez", rut: "10.987.654-3" }
];

const MACHINES = ["Troqueladora A", "Troqueladora B", "Troqueladora C", "Troqueladora D", "Troqueladora E"];

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
    
    // Duration 2 to 9 hours
    const durationMinutes = 120 + Math.floor(Math.random() * 420);
    const startTime = subHours(startBase, Math.random() * 8); // Randomize start time
    const endTime = addMinutes(startTime, durationMinutes);

    // Productivity logic
    const avgSpeed = 40 + Math.floor(Math.random() * 50); // 40-90 units/min
    // Introduce some high/low performers
    const worker = WORKERS[Math.floor(Math.random() * WORKERS.length)];
    const speedModifier = worker.name === "Juan Pérez" ? 1.2 : 1; 

    const finalSpeed = Math.floor(avgSpeed * speedModifier);
    const unitsProduced = Math.floor(finalSpeed * durationMinutes * 0.85); 
    const targetUnits = Math.ceil(unitsProduced / 500) * 500; 

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
      quality: 90 + Math.floor(Math.random() * 10), // 90-100%
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
  const avgQuality = (workerOts.reduce((acc, ot) => acc + ot.quality, 0) / totalOts).toFixed(1);

  return {
    name: workerName,
    rut: WORKERS.find(w => w.name === workerName)?.rut || "Sin RUT",
    totalOts,
    totalUnits,
    avgSpeed,
    avgQuality,
    recentOts: workerOts.slice(0, 10), // last 10
  };
}
