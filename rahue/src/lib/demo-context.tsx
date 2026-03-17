"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { format } from "date-fns";

// --- Types ---

export type OrderStatus = "IDLE" | "WARMING_UP" | "RUNNING" | "PAUSED" | "COMPLETED";

export interface Stop {
    id: string;
    startTime: string;
    endTime: string;
    duration: string;
    reason: string;
}

export type ProductStage = "Llegada Materiales" | "Impresión" | "Troquelado" | "Formado" | "Tránsito a Bodega" | "Entrega Cliente";

export const STANDARD_FLOW: ProductStage[] = [
    "Llegada Materiales", "Impresión", "Troquelado", "Formado", "Tránsito a Bodega", "Entrega Cliente"
];

export interface ProductFlow {
    name: string;
    stages: ProductStage[];
}

export interface StageTimestamps {
    start?: Date;
    end?: Date;
}

export interface DemoStageDetail {
  stageName: string;
  machineName: string;
  workerName: string;
  workerRut: string;
  startTime: string;
  endTime: string;
  unitsProduced: number;
  outputsPerStroke: number;
  averageSpeed: number;
  speedUnit: string;
  standardDeviation: number;
  stops: Stop[];
}

export interface ActiveOrder {
  id: string; // OT Number
  createdAt?: string; // New: creation date
  client?: string; // New: client name
  sku?: string; // New: specific SKU
  productName: string; // Product name representing the flow
  flow: ProductStage[]; // The stages of this product
  stageTimestamps?: Record<string, StageTimestamps>; // Timing for each stage
  stagesDetail?: DemoStageDetail[]; // Array of past stages details (for expandable panels)
  operatorName: string; // Name
  operatorRut: string; // Rut
  outputs: number; // Salidas troqueladora
  targetUnits?: number; // Optional target
  startTime: Date;
  lastPauseStart?: Date; // New: Track pause start time
  pauseReason?: string; // New: Track reason
  warmupHits?: number; // Hits accumulated during warmup phase (merma)
  status: OrderStatus;
}

export interface DemoMetrics {
  totalHits: number;
  totalUnits: number; // hits * outputs
  hitsPerMinute: number;
  currentSpeed: number; // Hits per minute (instant)
  // New indicators
  minSpeed: number;
  maxSpeed: number;
  standardDeviation: number;
  outputsPerStroke: number;
  speedUnit: string;
}

export interface HistoryPoint {
    time: string;
    speed: number;
    target: number;
}

// --- Context ---

export type DemoStep = "INTRO" | "OPERATOR_START" | "DASHBOARD_VIEW" | "OPERATOR_STOP" | "FINISHED";

export interface MachineState {
  id: string; // "machine-1", "machine-2"
  name: string;
  area: ProductStage;
  order: ActiveOrder | null;
  metrics: DemoMetrics;
  history: HistoryPoint[];
  stops: Stop[]; // New: List of stops
  status: "IDLE" | "RUNNING";
  internalHits: number; // Float accumulator
}

interface DemoContextType {
  machines: MachineState[];
  step: DemoStep;
  setStep: (step: DemoStep) => void;
  startMachineOrder: (machineId: string, ot: string, rut: string, outputs: number, target: number) => void;
  beginRealProduction: (machineId: string) => void;
  stopMachineOrder: (machineId: string) => void;
  pauseMachine: (machineId: string, reason: string) => void;
  resumeMachine: (machineId: string) => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
}

// --- Helper Functions ---
const generateStops = (count: number, randomize: boolean = true): Stop[] => {
    const reasons = [
        "Ajuste de máquina",
        "Cambio de bobina",
        "Falla eléctrica",
        "Limpieza programada",
        "Almuerzo operador",
        "Falta de material"
    ];

    if (!randomize) {
      return Array.from({ length: count }).map((_, i) => ({
          id: `stop-${i}`,
          startTime: "10:00",
          endTime: "10:15",
          duration: "15 min 0 seg",
          reason: reasons[i % reasons.length]
      }));
    }

    return Array.from({ length: count }).map((_, i) => {
        const durationMin = Math.floor(Math.random() * 15) + 1;
        const durationSec = Math.floor(Math.random() * 60);
        
        // Generate Start Time
        const startHour = Math.floor(Math.random() * (17 - 8) + 8);
        const startMin = Math.floor(Math.random() * 60);
        const startTimeStr = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
        
        // Calculate End Time
        const totalStartMin = startHour * 60 + startMin;
        const totalEndMin = totalStartMin + durationMin;
        const endHour = Math.floor(totalEndMin / 60);
        const endMin = totalEndMin % 60;
        const endTimeStr = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;

        return {
            id: `stop-${i}`,
            startTime: startTimeStr,
            endTime: endTimeStr,
            duration: `${durationMin} min ${durationSec} seg`,
            reason: reasons[Math.floor(Math.random() * reasons.length)]
        };
    });
};

// --- Generator Helper ---

const generateInitialMachines = (randomize: boolean = false): MachineState[] => {
    const machines: MachineState[] = [];
    
    const operators = [
        { name: "Juan Perez Rosales", rut: "11.111.111-K" },
        { name: "Maria Gonzalez", rut: "12.222.222-2" },
        { name: "Carlos Lopez", rut: "13.333.333-3" },
        { name: "Ana Torres", rut: "14.444.444-4" },
        { name: "Pedro Sanchez", rut: "15.555.555-5" },
        { name: "Laura Diaz", rut: "16.666.666-6" },
        { name: "Jorge Martinez", rut: "17.777.777-7" },
        { name: "Claudia Ruiz", rut: "18.888.888-8" }
    ];
    
    // Machine areas assignment:
    // 3 -> Impresión
    // 8 -> Troquelado
    // 4 -> Formado
    // 8 -> Llegada Materiales (procesos)
    // 4 -> Tránsito a Bodega (movimientos)
    // 4 -> Entrega Cliente (movimientos)
    const areaMap: ProductStage[] = [
        "Impresión", "Impresión", "Impresión",
        "Troquelado", "Troquelado", "Troquelado", "Troquelado", "Troquelado", "Troquelado", "Troquelado", "Troquelado",
        "Formado", "Formado", "Formado", "Formado",
        "Llegada Materiales", "Llegada Materiales", "Llegada Materiales", "Llegada Materiales", "Llegada Materiales", "Llegada Materiales", "Llegada Materiales", "Llegada Materiales",
        "Tránsito a Bodega", "Tránsito a Bodega", "Tránsito a Bodega", "Tránsito a Bodega",
        "Entrega Cliente", "Entrega Cliente", "Entrega Cliente", "Entrega Cliente"
    ];

    // Helper: builds stage timestamps for all completed stages up to current area
    function buildStageTimestamps(currentArea: ProductStage, baseTime: number): Record<string, StageTimestamps> {
        const timestamps: Record<string, StageTimestamps> = {};
        const currentIdx = STANDARD_FLOW.indexOf(currentArea);
        if (currentIdx === -1) return {};
        const STAGE_DURATION_H = 2;
        const GAP_H = 0.5;
        for (let j = 0; j < currentIdx; j++) {
            const stagesFromCurrent = currentIdx - j;
            const start = new Date(baseTime - (1 + stagesFromCurrent * (STAGE_DURATION_H + GAP_H)) * 3600000);
            const end = new Date(start.getTime() + STAGE_DURATION_H * 3600000);
            timestamps[STANDARD_FLOW[j]] = { start, end };
        }
        timestamps[currentArea] = { start: new Date(baseTime - 3600000) };
        return timestamps;
    }

    // Per-area counters for naming
    const areaCounters: Record<string, number> = {};

    // Products with their flows and SKUs
    const productCatalog = [
        { name: "Cono",              flow: [...STANDARD_FLOW] as ProductStage[],                                                                           skus: ["CONO-350-6PK", "CONO-500-4PK", "CONO-250-12PK", "CONO-1L-3PK"] },
        { name: "Tapas",             flow: [...STANDARD_FLOW] as ProductStage[],                                                                           skus: ["TAPA-60MM-STD", "TAPA-80MM-PRE", "TAPA-45MM-MIN", "TAPA-100MM-IND"] },
        { name: "Tapas Troqueladas", flow: ["Llegada Materiales", "Impresión", "Troquelado", "Tránsito a Bodega", "Entrega Cliente"] as ProductStage[],    skus: ["TTROQ-60MM-A", "TTROQ-80MM-B", "TTROQ-45MM-C"] },
    ];
    const clientNames = ["Coca-Cola", "Nestlé", "Unilever", "CCU", "Carozzi", "Soprole", "Colun", "Watts", "Agrosuper", "Iansa"];

    for (let i = 0; i < areaMap.length; i++) {
        // Deterministic status for initial render
        const isRunning = true;
        const initialHits = 1500 + (i * 500);

        const area = areaMap[i];
        // Track per-area counter
        areaCounters[area] = (areaCounters[area] || 0) + 1;
        const areaNum = areaCounters[area];

        let speedUnit = "gpm";
        if (area === "Impresión") speedUnit = "m/min";
        if (area === "Formado") speedUnit = "u/min";
        const isLogistics = ["Llegada Materiales", "Tránsito a Bodega", "Entrega Cliente"].includes(area);
        if (isLogistics) speedUnit = "N/A";

        const product = productCatalog[i % productCatalog.length];
        const flowName = isLogistics ? product.name : "Cono";
        const flowStages: ProductStage[] = isLogistics ? [...product.flow] : [...STANDARD_FLOW];
        let stagesDetail: DemoStageDetail[] = [];

        const baseTime = randomize ? Date.now() : 1700000000000; // Fixed date for SSR
        const stageTimestamps = buildStageTimestamps(area, baseTime);

        if (area === "Troquelado") {
            const printStart = stageTimestamps["Impresión"]?.start ?? new Date(baseTime - 4 * 3600000);
            const printEnd = stageTimestamps["Impresión"]?.end ?? new Date(baseTime - 2 * 3600000);
            stagesDetail = [
                {
                    stageName: "Impresión",
                    machineName: "Impresión 1",
                    workerName: randomize ? "Ana Torres" : "Maria Gonzalez",
                    workerRut: "14.444.444-4",
                    startTime: printStart.toISOString(),
                    endTime: printEnd.toISOString(),
                    unitsProduced: 65000,
                    outputsPerStroke: 2,
                    averageSpeed: 520,
                    speedUnit: "m/min",
                    standardDeviation: 1.25,
                    stops: []
                }
            ];
        } else if (area === "Formado") {
            const printStart = stageTimestamps["Impresión"]?.start ?? new Date(baseTime - 7 * 3600000);
            const printEnd = stageTimestamps["Impresión"]?.end ?? new Date(baseTime - 5 * 3600000);
            const troqStart = stageTimestamps["Troquelado"]?.start ?? new Date(baseTime - 4 * 3600000);
            const troqEnd = stageTimestamps["Troquelado"]?.end ?? new Date(baseTime - 2 * 3600000);
            stagesDetail = [
                {
                    stageName: "Impresión",
                    machineName: "Impresión 2",
                    workerName: randomize ? "Carlos Lopez" : "Juan Perez Rosales",
                    workerRut: "13.333.333-3",
                    startTime: printStart.toISOString(),
                    endTime: printEnd.toISOString(),
                    unitsProduced: 120000,
                    outputsPerStroke: 2,
                    averageSpeed: 580,
                    speedUnit: "m/min",
                    standardDeviation: 1.4,
                    stops: []
                },
                {
                    stageName: "Troquelado",
                    machineName: "Troquelado 4",
                    workerName: randomize ? "Ana Torres" : "Maria Gonzalez",
                    workerRut: "14.444.444-4",
                    startTime: troqStart.toISOString(),
                    endTime: troqEnd.toISOString(),
                    unitsProduced: 118000,
                    outputsPerStroke: 4,
                    averageSpeed: 300,
                    speedUnit: "gpm",
                    standardDeviation: 1.8,
                    stops: []
                }
            ];
        }

        const operatorInfo = operators[i % operators.length];
        const clientName = clientNames[i % clientNames.length];

        machines.push({
            id: isLogistics ? `logistica-${area.substring(0, 3).toLowerCase()}-${areaNum}` : `machine-${i + 1}`,
            name: `${area} ${areaNum}`,
            area: areaMap[i],
            status: isRunning ? "RUNNING" : "IDLE",
            order: isRunning ? {
                id: isLogistics ? `OT-${area === "Llegada Materiales" ? 3100 + areaNum : area === "Tránsito a Bodega" ? 3200 + areaNum : 3300 + areaNum}` : `OT-202${i}`,
                createdAt: new Date(baseTime - 12 * 3600000).toISOString(),
                client: clientName,
                sku: isLogistics ? product.skus[areaNum % product.skus.length] : `SKU-CON-${i}X`,
                productName: flowName,
                flow: flowStages,
                stageTimestamps: stageTimestamps,
                stagesDetail: stagesDetail,
                operatorName: operatorInfo.name,
                operatorRut: operatorInfo.rut,
                outputs: 2,
                targetUnits: 50000 + (i * 1000),
                startTime: new Date(baseTime - 3600000),
                status: isLogistics && randomize ? (Math.random() > 0.5 ? "RUNNING" : "PAUSED") : "RUNNING"
            } : null,
            metrics: {
                totalHits: isLogistics ? 0 : initialHits,
                totalUnits: isLogistics ? 0 : initialHits * 2, // 2 outputs
                hitsPerMinute: isLogistics ? 0 : 350,
                currentSpeed: isLogistics ? 0 : (isRunning ? 330 + (i * 5) : 0),
                minSpeed: isLogistics ? 0 : (isRunning ? 300 + (i * 2) : 0),
                maxSpeed: isLogistics ? 0 : (isRunning ? 380 + (i * 2) : 0),
                standardDeviation: isLogistics ? 0 : (isRunning ? parseFloat(((randomize ? Math.random() : 0.5) * 5 + 1).toFixed(2)) : 0),
                outputsPerStroke: 2,
                speedUnit: speedUnit
            },
            history: [],
            stops: isRunning && !isLogistics ? generateStops(randomize ? Math.floor(Math.random() * 3) + 2 : 2, randomize) : [],
            internalHits: isLogistics ? 0 : initialHits
        });
    }

    return machines;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  // Start with deterministic data (all IDLE) to match server
  const [machines, setMachines] = useState<MachineState[]>(() => generateInitialMachines(false));
  const [step, setStep] = useState<DemoStep>("INTRO");

  // On mount, switch to random data
  useEffect(() => {
      setMachines(generateInitialMachines(true));
  }, []);

  // Simulation Loop (Runs every 1s)
  useEffect(() => {
    const interval = setInterval(() => {
        const now = format(new Date(), "HH:mm:ss");

        setMachines(prevMachines => prevMachines.map(m => {
            if (m.status !== "RUNNING" || !m.order) {
                 if (m.history.length > 0 && m.history[m.history.length - 1].speed > 0) {
                     // Add one "stop" point
                     return {
                         ...m,
                         history: [...m.history.slice(-29), { time: now, speed: 0, target: 350 }]
                     }
                 }
                return m;
            }

            // Logistics stages don't run production simulation
            const LOGISTICS_STAGES: ProductStage[] = ["Llegada Materiales", "Tránsito a Bodega", "Entrega Cliente"];
            if (LOGISTICS_STAGES.includes(m.area)) return m;

            // Simulate tick
            // Target speed range: 330 - 365 GPM
            // Random walk with tendency to return to center (347.5)
            // const centerSpeed = 347.5; // Unused
            let variance = Math.floor(Math.random() * 7) - 3; // -3 to +3
            
            // If too low, push up
            if (m.metrics.currentSpeed < 330) variance = Math.abs(variance) + 1;
            // If too high, push down
            if (m.metrics.currentSpeed > 365) variance = -Math.abs(variance) - 1;

            const newSpeed = Math.max(0, m.metrics.currentSpeed + variance);
            
            // Calc hits for this second (speed is per minute) -> speed / 60
            const hitsThisTick = newSpeed / 60; 
            
            // Update total hits using internal accumulator
            // If internalHits is undefined fallback to metrics.totalHits (shouldn't happen with new init)
            const currentInternal = m.internalHits ?? m.metrics.totalHits;
            const newInternalHits = currentInternal + hitsThisTick;
            
            const newTotalHitsInt = Math.floor(newInternalHits);
            const newTotalUnits = newTotalHitsInt * m.order.outputs;

            const newPoint: HistoryPoint = {
                time: now,
                speed: newSpeed,
                target: 350 // Mock target speed
            };

            // Keep only last 30 points
            const newHistory = [...m.history, newPoint].slice(-30);

            return {
                ...m,
                internalHits: newInternalHits,
                metrics: {
                    totalHits: newTotalHitsInt,
                    totalUnits: newTotalUnits,
                currentSpeed: newSpeed,
                    hitsPerMinute: 350, // Keep constant for demo or calc from speed
                    // Preserve other metrics
                    minSpeed: m.metrics.minSpeed,
                    maxSpeed: m.metrics.maxSpeed,
                    standardDeviation: m.metrics.standardDeviation,
                    outputsPerStroke: m.metrics.outputsPerStroke,
                    speedUnit: m.metrics.speedUnit
                },
                history: newHistory
            };
        }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const startMachineOrder = (machineId: string, ot: string, rut: string, outputs: number, target: number) => {
    setMachines(prev => prev.map(m => {
        if (m.id !== machineId) return m;

        const flowName = "Cono";
        const flowStages: ProductStage[] = [...STANDARD_FLOW];

        const now = new Date();
        const stageTimestamps: Record<string, StageTimestamps> = {
            "Llegada Materiales": { start: new Date(now.getTime() - 8 * 3600000), end: new Date(now.getTime() - 7 * 3600000) },
            "Impresión": { 
                start: new Date(now.getTime() - 5 * 3600000), 
                end: new Date(now.getTime() - 3 * 3600000) 
            },
            "Troquelado": { start: now }
        };

        const manualStagesDetail = [
            {
                stageName: "Impresión",
                machineName: "Impresión 1",
                workerName: "Ana Torres",
                workerRut: "14.444.444-4",
                startTime: new Date(now.getTime() - 5 * 3600000).toISOString(),
                endTime: new Date(now.getTime() - 3 * 3600000).toISOString(),
                unitsProduced: 60000,
                outputsPerStroke: 2,
                averageSpeed: 500,
                speedUnit: "m/min",
                standardDeviation: 1.2,
                stops: []
            }
        ];

        return {
            ...m,
            status: "RUNNING",
            order: {
                id: ot,
                createdAt: new Date(now.getTime() - 24 * 3600000).toISOString(),
                client: "Nestlé", 
                sku: `SKU-${flowName.substring(0, 3)}-NEW`,
                productName: flowName,
                flow: flowStages,
                stageTimestamps: stageTimestamps,
                stagesDetail: manualStagesDetail,
                operatorName: "Juan Perez (Default)", // Default for manual start
                operatorRut: rut,
                outputs: outputs,
                targetUnits: target,
                startTime: new Date(),
                status: "WARMING_UP"
            },
            metrics: {
                totalHits: 0,
                totalUnits: 0,
                hitsPerMinute: 350,
                currentSpeed: 340, // Start speed
                minSpeed: 300,
                maxSpeed: 380,
                standardDeviation: 1.5,
                outputsPerStroke: outputs,
                speedUnit: m.metrics.speedUnit
            },
            stops: [],
            history: [], // Reset history on new run
            internalHits: 0
        }
    }));
    
    if (step === "OPERATOR_START") {
        setStep("DASHBOARD_VIEW");
    }
  };

  const beginRealProduction = (machineId: string) => {
    setMachines(prev => prev.map(m => {
        if (m.id !== machineId || !m.order || m.order.status !== "WARMING_UP") return m;
        return {
            ...m,
            order: {
                ...m.order,
                status: "RUNNING" as OrderStatus,
                warmupHits: m.metrics.totalHits,
            }
        };
    }));
  };

  const pauseMachine = (machineId: string, reason: string) => {
    setMachines(prev => prev.map(m => {
        if (m.id !== machineId || !m.order) return m;
        return {
            ...m,
            status: "IDLE", // Machine stops running physically
            order: {
                ...m.order,
                status: "PAUSED",
                lastPauseStart: new Date(),
                pauseReason: reason
            }
        }
    }));
  };

  const resumeMachine = (machineId: string) => {
    const now = new Date();
    setMachines(prev => prev.map(m => {
        if (m.id !== machineId || !m.order || m.order.status !== "PAUSED") return m;
        
        // Calculate duration from pause start
        const pauseStart = m.order.lastPauseStart || now;
        const durationMs = now.getTime() - pauseStart.getTime();
        const durationMin = Math.floor(durationMs / 60000);
        const durationSec = Math.floor((durationMs % 60000) / 1000);
        
        const startTimeStr = format(pauseStart, "HH:mm");
        const endTimeStr = format(now, "HH:mm");

        const newStop: Stop = {
            id: `stop-${Date.now()}`,
            startTime: startTimeStr,
            endTime: endTimeStr,
            duration: `${durationMin}m ${durationSec}s`,
            reason: m.order.pauseReason || "Pausa Operador"
        };

        return {
            ...m,
            status: "RUNNING",
            order: {
                ...m.order,
                status: "RUNNING",
                lastPauseStart: undefined,
                pauseReason: undefined
            },
            stops: [...m.stops, newStop]
        }
    }));
  };

  const stopMachineOrder = (machineId: string) => {
    setMachines(prev => prev.map(m => {
        if (m.id !== machineId) return m;
        return {
            ...m,
            status: "IDLE",
            order: null
        }
    }));

     if (step === "OPERATOR_STOP") {
        setStep("FINISHED");
    }
  };

  const resetDemo = () => {
     setMachines(generateInitialMachines(true));
     setStep("INTRO");
  }

  return (
    <DemoContext.Provider value={{ machines, step, setStep, startMachineOrder, beginRealProduction, stopMachineOrder, pauseMachine, resumeMachine, resetDemo }}>
      {children}
    </DemoContext.Provider>
  );
}
