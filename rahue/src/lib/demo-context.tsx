"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { format } from "date-fns";

// --- Types ---

export type OrderStatus = "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED";

export interface ActiveOrder {
  id: string; // OT Number
  operatorRut: string;
  outputs: number; // Salidas troqueladora
  targetUnits?: number; // Optional target
  startTime: Date;
  status: OrderStatus;
}

export interface DemoMetrics {
  totalHits: number;
  totalUnits: number; // hits * outputs
  hitsPerMinute: number;
  currentSpeed: number; // Hits per minute (instant)
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
  status: "IDLE" | "RUNNING";
  internalHits: number; // Float accumulator
}

interface DemoContextType {
  machines: MachineState[];
  step: DemoStep;
  setStep: (step: DemoStep) => void;
  startMachineOrder: (machineId: string, ot: string, rut: string, outputs: number, target: number) => void;
  stopMachineOrder: (machineId: string) => void;
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

// --- Generator Helper ---

const generateInitialMachines = (): MachineState[] => {
    const machines: MachineState[] = [];
    // User's Machine
    machines.push({
        id: "machine-1",
        name: "Troqueladora A",
        status: "IDLE",
        order: null,
        metrics: { totalHits: 0, totalUnits: 0, hitsPerMinute: 0, currentSpeed: 0 },
        history: [],
        internalHits: 0
    });

    // Simulated Machines (B-H)
    const machineNames = ["B", "C", "D", "E", "F", "G", "H"];
    machineNames.forEach((letter, i) => {
        const isRunning = i % 3 !== 0; // Some random status
        const initialHits = isRunning ? 1500 + (i * 500) : 0;
        machines.push({
            id: `machine-${i + 2}`,
            name: `Troqueladora ${letter}`,
            status: isRunning ? "RUNNING" : "IDLE",
            order: isRunning ? {
                id: `OT-202${i}`,
                operatorRut: `1${i}.456.789-k`,
                outputs: 10,
                targetUnits: 50000 + (i * 1000),
                startTime: new Date(Date.now() - 3600000),
                status: "RUNNING"
            } : null,
            metrics: { 
                totalHits: initialHits, 
                totalUnits: initialHits * 10, 
                hitsPerMinute: 350, 
                currentSpeed: isRunning ? 330 + (i * 5) : 0
            },
            history: [],
            internalHits: initialHits
        });
    });

    return machines;
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [machines, setMachines] = useState<MachineState[]>(generateInitialMachines);
  const [step, setStep] = useState<DemoStep>("INTRO");

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
                    ...m.metrics,
                    totalHits: newTotalHitsInt,
                    totalUnits: newTotalUnits,
                    currentSpeed: newSpeed
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
                currentSpeed: 340 // Start speed
            },
            history: [], // Reset history on new run
            internalHits: 0
        }
    }));
    
    if (step === "OPERATOR_START") {
        setStep("DASHBOARD_VIEW");
    }
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
     setMachines(generateInitialMachines());
     setStep("INTRO");
  }

  return (
    <DemoContext.Provider value={{ machines, step, setStep, startMachineOrder, stopMachineOrder, resetDemo }}>
      {children}
    </DemoContext.Provider>
  );
}
