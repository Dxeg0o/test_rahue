import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  etapa,
  tipoProducto,
  workflowEtapa,
  maquina,
  escaneoBarras,
  lecturaMaquina,
  lecturaPorMinuto,
  parada,
  actividadOt,
  ot,
} from "./schema";
import { sql } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL no está definida");
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

// Helper para crear pasos de workflow
type WfStep = {
  etapaNombre: string;
  nombrePaso?: string;
  requiereMaquina?: boolean;
};

async function seed() {
  console.log("🌱 Sembrando datos iniciales...\n");

  // ── 0. Limpiar datos existentes (en orden de dependencias) ─────────
  console.log("  🧹 Limpiando datos existentes...");
  await db.delete(escaneoBarras);
  await db.delete(lecturaPorMinuto);
  await db.delete(lecturaMaquina);
  await db.delete(parada);
  await db.delete(actividadOt);
  await db.delete(ot);
  await db.delete(workflowEtapa);
  await db.delete(maquina);
  await db.delete(tipoProducto);
  await db.delete(etapa);
  console.log("     ✅ Datos limpiados");

  // ── 1. Catálogo de etapas predefinidas ─────────────────────────────
  console.log("  📋 Creando catálogo de etapas...");
  const etapas = await db
    .insert(etapa)
    .values([
      {
        nombre: "Llegada Materiales",
        categoria: "logistica",
        tipoMetrica: "logistica",
        icono: "truck",
        descripcion: "Recepción e inspección de materia prima",
      },
      {
        nombre: "Impresión",
        categoria: "impresion",
        tipoMetrica: "metros_min",
        unidadDisplay: "m/min",
        icono: "printer",
        descripcion: "Impresión sobre material plano",
      },
      {
        nombre: "Troquelado",
        categoria: "troquelado",
        tipoMetrica: "golpes_min",
        unidadDisplay: "gpm",
        icono: "scissors",
        descripcion: "Corte con troquel (golpes por minuto)",
      },
      {
        nombre: "Formado",
        categoria: "formado",
        tipoMetrica: "unidades_min",
        unidadDisplay: "u/min",
        icono: "box",
        descripcion: "Formación del producto final (conos, envases, etc.)",
      },
      {
        nombre: "Tránsito a Bodega",
        categoria: "logistica",
        tipoMetrica: "logistica",
        icono: "warehouse",
        descripcion: "Traslado de producto terminado a bodega",
      },
      {
        nombre: "Entrega Cliente",
        categoria: "logistica",
        tipoMetrica: "logistica",
        icono: "package-check",
        descripcion: "Despacho al cliente final",
      },
    ])
    .returning();

  const etapaMap = Object.fromEntries(etapas.map((e) => [e.nombre, e.id]));
  console.log(`     ✅ ${etapas.length} etapas creadas`);

  // ── 2. Tipos de producto (Workflows) ───────────────────────────────
  console.log("  🔄 Creando workflows...");
  const workflows = await db
    .insert(tipoProducto)
    .values([
      {
        nombre: "Cono",
        descripcion: "Cono de helado - flujo completo",
        color: "indigo",
      },
      {
        nombre: "Tapas",
        descripcion: "Tapas impresas y formadas",
        color: "emerald",
      },
      {
        nombre: "Tapas Troqueladas",
        descripcion: "Tapas solo troqueladas (sin formado)",
        color: "orange",
      },
    ])
    .returning();

  const wfMap = Object.fromEntries(workflows.map((w) => [w.nombre, w.id]));
  console.log(`     ✅ ${workflows.length} workflows creados`);

  // ── 3. Workflow → Etapas (composición libre) ─────────────────────────
  console.log("  🔗 Vinculando etapas a workflows...");

  const workflowDefs: Record<string, WfStep[]> = {
    "Cono": [
      { etapaNombre: "Llegada Materiales" },
      { etapaNombre: "Impresión", requiereMaquina: true },
      { etapaNombre: "Troquelado", requiereMaquina: true },
      { etapaNombre: "Formado", requiereMaquina: true },
      { etapaNombre: "Tránsito a Bodega" },
      { etapaNombre: "Entrega Cliente" },
    ],
    "Tapas": [
      { etapaNombre: "Llegada Materiales" },
      { etapaNombre: "Impresión", requiereMaquina: true },
      { etapaNombre: "Troquelado", requiereMaquina: true },
      { etapaNombre: "Formado", requiereMaquina: true },
      { etapaNombre: "Tránsito a Bodega" },
      { etapaNombre: "Entrega Cliente" },
    ],
    "Tapas Troqueladas": [
      { etapaNombre: "Llegada Materiales" },
      { etapaNombre: "Impresión", requiereMaquina: true },
      { etapaNombre: "Troquelado", requiereMaquina: true },
      { etapaNombre: "Tránsito a Bodega" },
      { etapaNombre: "Entrega Cliente" },
    ],
  };

  const allWfEtapas = Object.entries(workflowDefs).flatMap(
    ([wfName, steps]) =>
      steps.map((step, i) => ({
        tipoProductoId: wfMap[wfName],
        etapaId: etapaMap[step.etapaNombre],
        orden: i + 1,
        nombrePaso: step.nombrePaso ?? null,
        requiereMaquina: step.requiereMaquina ?? false,
      }))
  );

  await db.insert(workflowEtapa).values(allWfEtapas);
  console.log(`     ✅ ${allWfEtapas.length} pasos de workflow creados`);

  // ── 4. Máquinas ────────────────────────────────────────────────────
  console.log("  🏭 Creando máquinas...");
  const maquinas = await db
    .insert(maquina)
    .values([
      // Troqueladoras
      { id: "troquel-1", nombre: "Troqueladora 1", etapaId: etapaMap["Troquelado"], tipoMetrica: "golpes_min", unidadMetrica: "gpm" },
      { id: "troquel-2", nombre: "Troqueladora 2", etapaId: etapaMap["Troquelado"], tipoMetrica: "golpes_min", unidadMetrica: "gpm" },
      { id: "troquel-3", nombre: "Troqueladora 3", etapaId: etapaMap["Troquelado"], tipoMetrica: "golpes_min", unidadMetrica: "gpm" },
      { id: "troquel-4", nombre: "Troqueladora 4", etapaId: etapaMap["Troquelado"], tipoMetrica: "golpes_min", unidadMetrica: "gpm" },
      // Impresoras
      { id: "impresion-1", nombre: "Impresora 1", etapaId: etapaMap["Impresión"], tipoMetrica: "metros_min", unidadMetrica: "m/min" },
      { id: "impresion-2", nombre: "Impresora 2", etapaId: etapaMap["Impresión"], tipoMetrica: "metros_min", unidadMetrica: "m/min" },
      // Formadoras
      { id: "formadora-1", nombre: "Formadora 1", etapaId: etapaMap["Formado"], tipoMetrica: "unidades_min", unidadMetrica: "u/min" },
      { id: "formadora-2", nombre: "Formadora 2", etapaId: etapaMap["Formado"], tipoMetrica: "unidades_min", unidadMetrica: "u/min" },
    ])
    .returning();

  console.log(`     ✅ ${maquinas.length} máquinas creadas`);

  console.log("\n✅ Seed completado exitosamente!");
  console.log(`\n📊 Resumen:`);
  console.log(`   ${etapas.length} etapas en catálogo`);
  console.log(`   ${workflows.length} workflows (tipos de producto)`);
  console.log(`   ${allWfEtapas.length} pasos de workflow`);
  console.log(`   ${maquinas.length} máquinas`);
  await client.end();
}

seed().catch((err) => {
  console.error("❌ Error en seed:", err);
  process.exit(1);
});
