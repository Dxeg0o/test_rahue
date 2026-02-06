"use client";

import { useDemo } from "@/lib/demo-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export function DemoWizard() {
  const { step, setStep } = useDemo();
  const router = useRouter();
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);

  // Relaxed Routing: Only redirect if explicitly needed for the step to make sense.
  // We removed the strict "if step X and not path Y, redirect" loop for better UX.
  
  const handleNextStep = (nextStep: typeof step, targetPath: string) => {
    setStep(nextStep);
    router.push(targetPath);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed top-4 right-4 z-[100] rounded-full bg-slate-900 text-white px-4 py-2 shadow-lg hover:bg-slate-800 text-sm font-bold flex items-center gap-2"
      >
        <span>🧙‍♂️ Ver Guía</span>
      </button>
    );
  }

  const renderContent = () => {
    switch (step) {
      case "INTRO":
        return (
          <div className="flex items-center justify-between w-full">
            <div>
                 <span className="text-indigo-300 font-bold uppercase text-xs tracking-wider">Inicio</span>
                <p className="text-white font-medium">Bienvenido a la Demo de RAHUE. Vamos a simular un turno completo.</p>
            </div>
            <button
              onClick={() => handleNextStep("OPERATOR_START", "/operator")}
              className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              Comenzar: Ir a Operador &rarr;
            </button>
          </div>
        );

      case "OPERATOR_START":
         return (
          <div className="flex items-center justify-between w-full">
             <div>
                 <span className="text-yellow-400 font-bold uppercase text-xs tracking-wider">Paso 1: Operador</span>
                <p className="text-white font-medium">Configura la máquina. Ingresa una OT (ej. 101) y dale a <span className="text-indigo-300">COMENZAR</span>.</p>
            </div>
             <div className="bg-slate-800 px-3 py-1 rounded text-xs text-slate-400">
                Esperando que inicies la OT...
            </div>
          </div>
        );

      case "DASHBOARD_VIEW":
        return (
          <div className="flex items-center justify-between w-full">
             <div>
                 <span className="text-emerald-400 font-bold uppercase text-xs tracking-wider">Paso 2: Supervisión</span>
                <p className="text-white font-medium">¡Producción en vivo! Tu máquina (Troqueladora A) y la B están trabajando.</p>
            </div>
             <button
              onClick={() => handleNextStep("OPERATOR_STOP", "/operator")}
              className="bg-white text-slate-900 hover:bg-slate-100 px-6 py-2 rounded-lg font-bold text-sm transition-colors"
            >
              Terminar Turno (Ir a Operador) &rarr;
            </button>
          </div>
        );

      case "OPERATOR_STOP":
        return (
           <div className="flex items-center justify-between w-full">
             <div>
                 <span className="text-red-400 font-bold uppercase text-xs tracking-wider">Paso 3: Cierre</span>
                <p className="text-white font-medium">El turno acabó. Presiona <span className="text-red-300">DETENER PRODUCCIÓN</span>.</p>
            </div>
             <div className="bg-slate-800 px-3 py-1 rounded text-xs text-slate-400">
                Esperando detención...
            </div>
          </div>
        );

      case "FINISHED":
        return (
           <div className="flex items-center justify-between w-full">
             <div>
                 <span className="text-indigo-300 font-bold uppercase text-xs tracking-wider">Fin</span>
                <p className="text-white font-medium">¡Ciclo completado con éxito!</p>
            </div>
             <button
                onClick={() => {
                    setStep("INTRO");
                    router.push("/");
                }}
                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
              >
                Reiniciar Demo 
              </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
        {/* Spacer to push content down */}
        <div className="h-20 w-full bg-transparent" /> 
        
        {/* Fixed Top Bar */}
        <div className="fixed top-0 left-0 w-full z-[100] bg-slate-900 border-b border-white/10 shadow-2xl">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center gap-6">
                
                {/* Icon / Brand */}
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-white/10 text-xl">
                    🧙‍♂️
                </div>

                {/* Dynamic Content */}
                <div className="flex-grow">
                    {renderContent()}
                </div>

                {/* Close/Minimize */}
                <button 
                    onClick={() => setIsExpanded(false)}
                    className="text-slate-500 hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                    </svg>
                </button>
            </div>
        </div>
    </>
  );
}
