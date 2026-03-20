import type { StageTimestamps } from "@/lib/demo-context";

export interface StageStop {
  reason: string;
  startTime: string;
  endTime: string;
  duration: string;
}

export interface StageDetail {
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
  stops: StageStop[];
}

export interface OTDocument {
  id: string;
  status: "pendiente" | "en_proceso" | "completada" | "cancelada";
  currentStageName: string | "COMPLETADO";
  createdAt: string;
  client: string;
  productName: string;
  sku: string;
  targetUnits: number;
  flow: string[];
  stageTimestamps: Record<string, StageTimestamps>;
  stages: StageDetail[];
  workerName: string;
  rut: string;
  machineName: string;
  startTime: string;
  endTime: string;
  unitsProduced: number;
  averageSpeed: number;
  stopsCount: number;
  standardDeviation: number;
  speedUnit: string;
}

export interface WorkerHistorySummary {
  id: string;
  name: string;
  rut: string;
  totalOts: number;
  totalUnits: number;
  avgSpeed: number;
  avgStandardDeviation: string;
  recentOts: OTDocument[];
  lastUnit: string;
}

export type PeriodFilter = "today" | "week" | "month";

export interface TimeHistoryChartPoint {
  name: string;
  fullName: string;
  units: number;
  originalKey: string;
}

export interface TimeHistoryStats {
  totalUnits: number;
  totalOts: number;
  avgEfficiency: number;
  chartData: TimeHistoryChartPoint[];
}

export interface TimeHistoryResponse {
  period: PeriodFilter;
  start: string;
  end: string;
  ots: OTDocument[];
  stats: TimeHistoryStats | null;
}
