"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
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

export type ProductStage = string;

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
  id: string;
  createdAt?: string;
  client?: string;
  sku?: string;
  productName: string;
  flow: ProductStage[];
  stageTimestamps?: Record<string, StageTimestamps>;
  stagesDetail?: DemoStageDetail[];
  operatorName: string;
  operatorRut: string;
  outputs: number;
  targetUnits?: number;
  startTime: Date;
  lastPauseStart?: Date;
  pauseReason?: string;
  warmupHits?: number;
  status: OrderStatus;
}

export interface DemoMetrics {
  totalHits: number;
  totalUnits: number;
  hitsPerMinute: number;
  currentSpeed: number;
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
  id: string;
  name: string;
  area: ProductStage;
  order: ActiveOrder | null;
  metrics: DemoMetrics;
  history: HistoryPoint[];
  stops: Stop[];
  status: "IDLE" | "RUNNING";
  internalHits: number;
}

export interface PendingOT {
  id: string;
  client: string;
  product: string;
  sku: string;
  target: number;
  outputs: number;
}

export interface PlantStats {
  completedToday: number;
  completedWeek: number;
}

interface DemoContextType {
  machines: MachineState[];
  pendingOts: PendingOT[];
  plantStats: PlantStats;
  stageCategories: Record<string, string>;
  step: DemoStep;
  setStep: (step: DemoStep) => void;
  startMachineOrder: (machineId: string, ot: string, rut: string, outputs: number, target: number) => void;
  beginRealProduction: (machineId: string) => void;
  stopMachineOrder: (machineId: string) => void;
  pauseMachine: (machineId: string, reason: string) => void;
  resumeMachine: (machineId: string) => void;
  resetDemo: () => void;
  refreshData: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
}

// --- Date deserialization from API ---

function deserializeOrder(raw: Record<string, unknown>): ActiveOrder {
  return {
    ...raw,
    startTime: new Date(raw.startTime as string),
    lastPauseStart: raw.lastPauseStart ? new Date(raw.lastPauseStart as string) : undefined,
    stageTimestamps: raw.stageTimestamps
      ? Object.fromEntries(
          Object.entries(raw.stageTimestamps as Record<string, Record<string, string>>).map(
            ([k, v]) => [
              k,
              {
                start: v.start ? new Date(v.start) : undefined,
                end: v.end ? new Date(v.end) : undefined,
              },
            ]
          )
        )
      : undefined,
  } as ActiveOrder;
}

function deserializeMachine(raw: Record<string, unknown>): MachineState {
  return {
    ...raw,
    order: raw.order ? deserializeOrder(raw.order as Record<string, unknown>) : null,
  } as MachineState;
}

// --- Provider ---

export function DemoProvider({ children }: { children: ReactNode }) {
  const [machines, setMachines] = useState<MachineState[]>([]);
  const [pendingOts, setPendingOts] = useState<PendingOT[]>([]);
  const [plantStats, setPlantStats] = useState<PlantStats>({ completedToday: 0, completedWeek: 0 });
  const [stageCategories, setStageCategories] = useState<Record<string, string>>({});
  const [step, setStep] = useState<DemoStep>("INTRO");
  const [loaded, setLoaded] = useState(false);

  // Fetch plant data from API
  const fetchPlantData = useCallback(async () => {
    try {
      const res = await fetch("/api/planta");
      if (!res.ok) return;
      const data = await res.json();
      setMachines(
        (data.machines ?? []).map((m: Record<string, unknown>) => deserializeMachine(m))
      );
      if (data.pendingOts) setPendingOts(data.pendingOts);
      if (data.stats) setPlantStats(data.stats);
      if (data.stageCategories) setStageCategories(data.stageCategories);
      setLoaded(true);
    } catch (e) {
      console.warn("Error fetching plant data:", e);
      setLoaded(true); // Don't block rendering on API failure
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPlantData();
  }, [fetchPlantData]);

  // Poll every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchPlantData, 10_000);
    return () => clearInterval(interval);
  }, [fetchPlantData]);

  // --- Operator actions (local mutations, will be persisted via API later) ---

  const startMachineOrder = (machineId: string, otCode: string, rut: string, outputs: number, target: number) => {
    setMachines(prev => prev.map(m => {
      if (m.id !== machineId) return m;

      const flowStages: ProductStage[] = [...STANDARD_FLOW];
      const now = new Date();

      return {
        ...m,
        status: "RUNNING" as const,
        order: {
          id: otCode,
          createdAt: new Date(now.getTime() - 24 * 3600000).toISOString(),
          client: "—",
          productName: "Cono",
          flow: flowStages,
          stageTimestamps: { [m.area]: { start: now } },
          stagesDetail: [],
          operatorName: "Operador",
          operatorRut: rut,
          outputs,
          targetUnits: target,
          startTime: now,
          status: "WARMING_UP" as OrderStatus,
        },
        metrics: {
          totalHits: 0,
          totalUnits: 0,
          hitsPerMinute: 0,
          currentSpeed: 0,
          minSpeed: 0,
          maxSpeed: 0,
          standardDeviation: 0,
          outputsPerStroke: outputs,
          speedUnit: m.metrics.speedUnit,
        },
        stops: [],
        history: [],
        internalHits: 0,
      };
    }));

    if (step === "OPERATOR_START") setStep("DASHBOARD_VIEW");
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
        },
      };
    }));
  };

  const pauseMachine = (machineId: string, reason: string) => {
    setMachines(prev => prev.map(m => {
      if (m.id !== machineId || !m.order) return m;
      return {
        ...m,
        status: "IDLE" as const,
        order: {
          ...m.order,
          status: "PAUSED" as OrderStatus,
          lastPauseStart: new Date(),
          pauseReason: reason,
        },
      };
    }));
  };

  const resumeMachine = (machineId: string) => {
    const now = new Date();
    setMachines(prev => prev.map(m => {
      if (m.id !== machineId || !m.order || m.order.status !== "PAUSED") return m;

      const pauseStart = m.order.lastPauseStart || now;
      const durationMs = now.getTime() - pauseStart.getTime();
      const durationMin = Math.floor(durationMs / 60000);
      const durationSec = Math.floor((durationMs % 60000) / 1000);

      const newStop: Stop = {
        id: `stop-${Date.now()}`,
        startTime: format(pauseStart, "HH:mm"),
        endTime: format(now, "HH:mm"),
        duration: `${durationMin}m ${durationSec}s`,
        reason: m.order.pauseReason || "Pausa Operador",
      };

      return {
        ...m,
        status: "RUNNING" as const,
        order: {
          ...m.order,
          status: "RUNNING" as OrderStatus,
          lastPauseStart: undefined,
          pauseReason: undefined,
        },
        stops: [...m.stops, newStop],
      };
    }));
  };

  const stopMachineOrder = (machineId: string) => {
    setMachines(prev => prev.map(m => {
      if (m.id !== machineId) return m;
      return { ...m, status: "IDLE" as const, order: null };
    }));

    if (step === "OPERATOR_STOP") setStep("FINISHED");
  };

  const resetDemo = () => {
    fetchPlantData();
    setStep("INTRO");
  };

  return (
    <DemoContext.Provider
      value={{
        machines,
        pendingOts,
        plantStats,
        stageCategories,
        step,
        setStep,
        startMachineOrder,
        beginRealProduction,
        stopMachineOrder,
        pauseMachine,
        resumeMachine,
        resetDemo,
        refreshData: fetchPlantData,
      }}
    >
      {loaded || machines.length > 0 ? children : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="text-sm text-slate-500">Cargando planta...</p>
          </div>
        </div>
      )}
    </DemoContext.Provider>
  );
}
