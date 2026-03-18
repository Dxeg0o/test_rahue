"use client";

import { useState, useEffect, useCallback } from "react";

type Rol = "admin" | "supervisor" | "operador";

interface Usuario {
  id: string;
  nombre: string;
  email: string | null;
  rut: string | null;
  rol: Rol;
  activo: boolean;
  createdAt: string | null;
}

const ROL_LABELS: Record<Rol, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  operador: "Operador",
};

const ROL_COLORS: Record<Rol, string> = {
  admin: "bg-purple-100 text-purple-700",
  supervisor: "bg-blue-100 text-blue-700",
  operador: "bg-slate-100 text-slate-700",
};

export function GestionUsuariosView() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null); // id del usuario guardándose

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/usuarios");
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Error al cargar usuarios");
        return;
      }
      setUsuarios(await res.json());
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  async function updateUsuario(id: string, changes: { rol?: Rol; activo?: boolean }) {
    setSaving(id);
    try {
      const res = await fetch("/api/admin/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...changes }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Error al actualizar");
        return;
      }
      setUsuarios((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...changes } : u))
      );
    } catch {
      alert("Error de conexión");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Cargando usuarios...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={fetchUsuarios}
          className="px-4 py-1.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Usuarios</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Gestiona los roles y el acceso de cada usuario.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-500">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Email</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">RUT</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No hay usuarios registrados.
                </td>
              </tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{u.nombre}</td>
                <td className="px-4 py-3 text-slate-500">{u.email ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{u.rut ?? "—"}</td>

                {/* Selector de rol */}
                <td className="px-4 py-3">
                  <select
                    value={u.rol}
                    disabled={saving === u.id}
                    onChange={(e) =>
                      updateUsuario(u.id, { rol: e.target.value as Rol })
                    }
                    className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-400 ${ROL_COLORS[u.rol]} disabled:opacity-50`}
                  >
                    <option value="operador">Operador</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>

                {/* Toggle activo */}
                <td className="px-4 py-3">
                  <button
                    disabled={saving === u.id}
                    onClick={() => updateUsuario(u.id, { activo: !u.activo })}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${
                      u.activo
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-red-100 text-red-600 hover:bg-red-200"
                    }`}
                  >
                    {u.activo ? "Activo" : "Inactivo"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} registrado{usuarios.length !== 1 ? "s" : ""}.
      </p>
    </div>
  );
}
