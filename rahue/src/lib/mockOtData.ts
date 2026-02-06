import { addMinutes, format, subDays, subMinutes } from "date-fns";
import { es } from "date-fns/locale";

export interface OTDocument {
  id: string; // OT-XXXX
  workerName: string;
  machineName: string;
  startTime: string; // ISO
  endTime: string; // ISO
  unitsProduced: number;
  targetUnits: number;
  averageSpeed: number; // units per minute
  stopsCount: number;
}

const WORKERS = ["Juan Pérez", "María González", "Carlos Ruiz", "Ana López", "Pedro Sánchez"];
const MACHINES = ["Troqueladora A", "Troqueladora B", "Impresora 1", "Impresora 2", "Cortadora"];

export function generateMockOTs(count: number = 200): OTDocument[] {
  const ots: OTDocument[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    // Random dates within last 30 days
    const daysBack = Math.floor(Math.random() * 30);
    const startBase = subDays(now, daysBack);
    
    // Random duration 4-8 hours
    const durationMinutes = 240 + Math.floor(Math.random() * 240);
    const startTime = subMinutes(startBase, Math.random() * 1000); // Randomize time of day
    const endTime = addMinutes(startTime, durationMinutes);

    // Production logic
    const avgSpeed = 40 + Math.floor(Math.random() * 40); // 40-80 units/min
    const unitsProduced = Math.floor(avgSpeed * durationMinutes * 0.85); // 85% efficiency roughly
    const targetUnits = Math.ceil(unitsProduced / 1000) * 1000; // Round up to nearest 1000

    ots.push({
      id: `OT-${10000 + i}`,
      workerName: WORKERS[Math.floor(Math.random() * WORKERS.length)],
      machineName: MACHINES[Math.floor(Math.random() * MACHINES.length)],
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      unitsProduced,
      targetUnits,
      averageSpeed: avgSpeed,
      stopsCount: Math.floor(Math.random() * 10),
    });
  }

  // Sort by date desc
  return ots.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

export const mockOTs = generateMockOTs();
