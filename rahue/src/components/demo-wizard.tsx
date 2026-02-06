"use client";

import { useDemo } from "@/lib/demo-context";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DemoWizard() {
  const { step, setStep } = useDemo();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleView = () => {
    if (step === "OPERATOR_START") {
        // Go to Operations
        setStep("DASHBOARD_VIEW");
        router.push("/");
    } else {
        // Go to Operator
        setStep("OPERATOR_START");
        router.push("/operator");
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed top-4 right-4 z-[100] rounded-full bg-slate-900 text-white px-4 py-2 shadow-lg hover:bg-slate-800 text-sm font-bold flex items-center gap-2"
      >
        <span>🧙‍♂️ Menu Demo</span>
      </button>
    );
  }

  const isOperatorView = step === "OPERATOR_START";

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
                <div className="flex-grow flex items-center justify-between">
                    <div>
                         <span className={`font-bold uppercase text-xs tracking-wider ${isOperatorView ? "text-yellow-400" : "text-emerald-400"}`}>
                             {isOperatorView ? "VISTA OPERARIO" : "VISTA OPERACIONES"}
                         </span>
                         <p className="text-white font-medium">
                             {isOperatorView 
                                ? "Aquí el operario ingresa OTs y gestiona la máquina." 
                                : "Aquí el supervisor monitorea toda la planta en vivo."}
                         </p>
                    </div>

                    <button
                      onClick={toggleView}
                      className="bg-white hover:bg-slate-100 text-slate-900 px-6 py-2 rounded-lg font-bold text-sm transition-colors border-2 border-transparent hover:border-indigo-500"
                    >
                      {isOperatorView ? "Ir a Vista Operaciones \u2192" : "Ir a Vista Operario \u2192"}
                    </button>
                </div>

                {/* Close/Minimize */}
                <button 
                    onClick={() => setIsExpanded(false)}
                    className="text-slate-500 hover:text-white transition-colors ml-4"
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
