"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { useRouter } from "next/navigation";

// Mock data for stats
const operatorPerformance = [
  { name: "Juan P.", otCount: 12, efficiency: 98 },
  { name: "Maria L.", otCount: 15, efficiency: 95 },
  { name: "Carlos R.", otCount: 8, efficiency: 92 },
  { name: "Ana M.", otCount: 18, efficiency: 99 },
];

const machineSpeedHistory = [
  { time: "08:00", speed: 45 },
  { time: "09:00", speed: 52 },
  { time: "10:00", speed: 58 },
  { time: "11:00", speed: 0 }, // Break
  { time: "12:00", speed: 62 },
  { time: "13:00", speed: 65 },
  { time: "14:00", speed: 60 },
];

export default function StatsPage() {
    const router = useRouter();

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Estadísticas de Planta</h1>
          <p className="text-sm text-slate-500">Análisis histórico y rendimiento</p>
        </div>
        <div className="flex gap-4">
             <button
            onClick={() => router.push("/operator")}
            className="rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
          >
            Ir a Operador
          </button>
           <button
            onClick={() => router.push("/")}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Ir a Dashboard
          </button>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Operator Efficiency Chart */}
        <section className="rounded-3xl border border-[#e6e8ee] bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-lg font-semibold text-slate-900">Eficiencia por Operador (%)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={operatorPerformance} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="efficiency" fill="#4f46e5" radius={[0, 4, 4, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Machine Speed Chart */}
        <section className="rounded-3xl border border-[#e6e8ee] bg-white p-6 shadow-sm">
          <h3 className="mb-6 text-lg font-semibold text-slate-900">Velocidad Promedio (Golpes/min)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={machineSpeedHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="speed"
                  stroke="#fbbf24"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#fbbf24", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

       <div className="rounded-3xl border border-[#e6e8ee] bg-white overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100">
             <h3 className="text-lg font-semibold text-slate-900">Resumen de Turno</h3>
          </div>
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Operador</th>
                <th className="px-6 py-3 font-medium">OTs Completadas</th>
                <th className="px-6 py-3 font-medium text-right">Eficiencia Promedio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {operatorPerformance.map((op) => (
                <tr key={op.name} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{op.name}</td>
                  <td className="px-6 py-3">{op.otCount}</td>
                  <td className="px-6 py-3 text-right text-emerald-600 font-semibold">{op.efficiency}%</td>
                </tr>
              ))}
            </tbody>
          </table>
       </div>
    </main>
  );
}
