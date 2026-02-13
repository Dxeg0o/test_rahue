"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { format } from "date-fns";

// --- Types ---

export type OrderStatus = "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED";

export interface Stop {
    id: string;
    startTime: string;
    endTime: string;
    duration: string;
    reason: string;
}

export interface ActiveOrder {
  id: string; // OT Number
  operatorName: string; // New: Name
  operatorRut: string; // New: Rut
  outputs: number; // Salidas troqueladora
  targetUnits?: number; // Optional target
  startTime: Date;
  lastPauseStart?: Date; // New: Track pause start time
  pauseReason?: string; // New: Track reason
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
const generateStops = (count: number): Stop[] => {
    const reasons = ["Atasco de material", "Fallo sensor", "Cambio de bobina", "Ajuste de troquel", "Micro-parada"];
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

    // Create 8 machines
    for (let i = 0; i < 8; i++) {
        // Deterministic status for initial render
        const isRunning = randomize ? (i !== 2 && i !== 6) : false; 
        const initialHits = isRunning ? 1500 + (i * 500) : 0;
        
        machines.push({
            id: `machine-${i + 1}`,
            name: `Troqueladora ${i + 1}`,
            status: isRunning ? "RUNNING" : "IDLE",
            order: isRunning ? {
                id: `OT-202${i}`,
                operatorName: operators[i].name,
                operatorRut: operators[i].rut,
                outputs: 2, // Default outputs
                targetUnits: 50000 + (i * 1000),
                startTime: new Date(Date.now() - 3600000),
                status: "RUNNING"
            } : null,
            metrics: { 
                totalHits: initialHits, 
                totalUnits: initialHits * 2, // 2 outputs
                hitsPerMinute: 350, 
                currentSpeed: isRunning ? 330 + (i * 5) : 0,
                minSpeed: isRunning ? 300 + (i * 2) : 0,
                maxSpeed: isRunning ? 380 + (i * 2) : 0,
                standardDeviation: isRunning ? parseFloat((Math.random() * 5 + 1).toFixed(2)) : 0, 
                outputsPerStroke: 2
            },
            history: [],
            stops: isRunning ? generateStops(Math.floor(Math.random() * 3) + 2) : [], 
            internalHits: initialHits
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
            };

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
                    outputsPerStroke: m.metrics.outputsPerStroke
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
        return {
            ...m,
            status: "RUNNING",
            order: {
                id: ot,
                operatorName: "Juan Perez (Default)", // Default for manual start
                operatorRut: rut,
                outputs: outputs,
                targetUnits: target,
                startTime: new Date(),
                status: "RUNNING"
            },
            metrics: {
                totalHits: 0,
                totalUnits: 0,
                hitsPerMinute: 350,
                currentSpeed: 340, // Start speed
                minSpeed: 300,
                maxSpeed: 380,
                standardDeviation: 1.5,
                outputsPerStroke: outputs
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
    <DemoContext.Provider value={{ machines, step, setStep, startMachineOrder, stopMachineOrder, pauseMachine, resumeMachine, resetDemo }}>
      {children}
    </DemoContext.Provider>
  );
}
