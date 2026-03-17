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
      // ── Logística ──
      {
        nombre: "Llegada Materiales",
        categoria: "logistica",
        tipoMetrica: "logistica",
        icono: "truck",
        ordenDefault: 1,
        descripcion: "Recepción e inspección de materia prima",
      },
      {
        nombre: "Tránsito a Bodega",
        categoria: "logistica",
        tipoMetrica: "logistica",
        icono: "warehouse",
        ordenDefault: 90,
        descripcion: "Traslado de producto terminado a bodega",
      },
      {
        nombre: "Entrega Cliente",
        categoria: "logistica",
        tipoMetrica: "logistica",
        icono: "package-check",
        ordenDefault: 99,
        descripcion: "Despacho al cliente final",
      },
      {
        nombre: "Tránsito Interno",
        categoria: "logistica",
        tipoMetrica: "logistica",
        icono: "move",
        ordenDefault: 50,
        descripcion: "Traslado entre estaciones de trabajo",
      },
      {
        nombre: "Almacenamiento Intermedio",
        categoria: "logistica",
        tipoMetrica: "logistica",
        icono: "archive",
        ordenDefault: 51,
        descripcion: "Almacenaje temporal entre procesos",
      },

      // ── Impresión ──
      {
        nombre: "Impresión",
        categoria: "impresion",
        tipoMetrica: "metros_min",
        unidadDisplay: "m/min",
        icono: "printer",
        ordenDefault: 10,
        descripcion: "Impresión sobre material plano",
      },
      {
        nombre: "Barnizado",
        categoria: "impresion",
        tipoMetrica: "metros_min",
        unidadDisplay: "m/min",
        icono: "paintbrush",
        ordenDefault: 11,
        descripcion: "Aplicación de barniz protector post-impresión",
      },
      {
        nombre: "Secado",
        categoria: "impresion",
        tipoMetrica: "logistica",
        icono: "wind",
        ordenDefault: 12,
        descripcion: "Secado de tinta o barniz",
      },

      // ── Troquelado ──
      {
        nombre: "Troquelado",
        categoria: "troquelado",
        tipoMetrica: "golpes_min",
        unidadDisplay: "gpm",
        icono: "scissors",
        ordenDefault: 20,
        descripcion: "Corte con troquel (golpes por minuto)",
      },
      {
        nombre: "Descartone",
        categoria: "troquelado",
        tipoMetrica: "unidades_min",
        unidadDisplay: "u/min",
        icono: "trash-2",
        ordenDefault: 21,
        descripcion: "Remoción del material sobrante post-troquelado",
      },
      {
        nombre: "Medio Corte",
        categoria: "troquelado",
        tipoMetrica: "golpes_min",
        unidadDisplay: "gpm",
        icono: "slice",
        ordenDefault: 22,
        descripcion: "Corte parcial del material (kiss-cut)",
      },

      // ── Formado ──
      {
        nombre: "Formado",
        categoria: "formado",
        tipoMetrica: "unidades_min",
        unidadDisplay: "u/min",
        icono: "box",
        ordenDefault: 30,
        descripcion: "Formación del producto final (conos, envases, etc.)",
      },
      {
        nombre: "Pegado",
        categoria: "formado",
        tipoMetrica: "unidades_min",
        unidadDisplay: "u/min",
        icono: "droplets",
        ordenDefault: 31,
        descripcion: "Aplicación de adhesivo y pegado de componentes",
      },
      {
        nombre: "Doblado",
        categoria: "formado",
        tipoMetrica: "unidades_min",
        unidadDisplay: "u/min",
        icono: "fold-vertical",
        ordenDefault: 32,
        descripcion: "Plegado del material según especificación",
      },

      // ── Control de calidad ──
      {
        nombre: "Control de Calidad",
        categoria: "control_calidad",
        tipoMetrica: "logistica",
        icono: "shield-check",
        ordenDefault: 80,
        descripcion: "Inspección visual y dimensional del producto",
      },
      {
        nombre: "Muestreo",
        categoria: "control_calidad",
        tipoMetrica: "logistica",
        icono: "flask-conical",
        ordenDefault: 81,
        descripcion: "Toma de muestras para control estadístico",
      },

      // ── Empaque ──
      {
        nombre: "Empaque",
        categoria: "empaque",
        tipoMetrica: "unidades_min",
        unidadDisplay: "u/min",
        icono: "package",
        ordenDefault: 85,
        descripcion: "Empacado del producto terminado",
      },
      {
        nombre: "Paletizado",
        categoria: "empaque",
        tipoMetrica: "logistica",
        icono: "layers",
        ordenDefault: 86,
        descripcion: "Armado de pallets para despacho",
      },
      {
        nombre: "Etiquetado",
        categoria: "empaque",
        tipoMetrica: "unidades_min",
        unidadDisplay: "u/min",
        icono: "tag",
        ordenDefault: 87,
        descripcion: "Aplicación de etiquetas al producto o empaque",
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
        descripcion: "Cono de helado - flujo completo con impresión, troquelado y formado",
        color: "indigo",
      },
      {
        nombre: "Tapas Impresas",
        descripcion: "Tapas con impresión, troquelado y formado",
        color: "emerald",
      },
      {
        nombre: "Tapas Troqueladas",
        descripcion: "Tapas solo troqueladas (sin impresión ni formado)",
        color: "orange",
      },
      {
        nombre: "Etiquetas",
        descripcion: "Etiquetas impresas y troqueladas",
        color: "violet",
      },
      {
        nombre: "Cajas Plegadizas",
        descripcion: "Cajas con impresión, barnizado, troquelado y pegado",
        color: "sky",
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
      { etapaNombre: "Control de Calidad" },
      { etapaNombre: "Empaque", requiereMaquina: true },
      { etapaNombre: "Tránsito a Bodega" },
      { etapaNombre: "Entrega Cliente" },
    ],
    "Tapas Impresas": [
      { etapaNombre: "Llegada Materiales" },
      { etapaNombre: "Impresión", requiereMaquina: true },
      { etapaNombre: "Barnizado", requiereMaquina: true },
      { etapaNombre: "Secado" },
      { etapaNombre: "Troquelado", requiereMaquina: true },
      { etapaNombre: "Formado", requiereMaquina: true },
      { etapaNombre: "Control de Calidad" },
      { etapaNombre: "Empaque", requiereMaquina: true },
      { etapaNombre: "Tránsito a Bodega" },
      { etapaNombre: "Entrega Cliente" },
    ],
    "Tapas Troqueladas": [
      { etapaNombre: "Llegada Materiales" },
      { etapaNombre: "Troquelado", nombrePaso: "Troquelado 1", requiereMaquina: true },
      { etapaNombre: "Descartone", requiereMaquina: true },
      { etapaNombre: "Troquelado", nombrePaso: "Troquelado 2 (repase)", requiereMaquina: true },
      { etapaNombre: "Control de Calidad" },
      { etapaNombre: "Empaque", requiereMaquina: true },
      { etapaNombre: "Entrega Cliente" },
    ],
    "Etiquetas": [
      { etapaNombre: "Llegada Materiales" },
      { etapaNombre: "Impresión", requiereMaquina: true },
      { etapaNombre: "Barnizado", requiereMaquina: true },
      { etapaNombre: "Medio Corte", requiereMaquina: true },
      { etapaNombre: "Empaque", requiereMaquina: true },
      { etapaNombre: "Entrega Cliente" },
    ],
    "Cajas Plegadizas": [
      { etapaNombre: "Llegada Materiales" },
      { etapaNombre: "Impresión", requiereMaquina: true },
      { etapaNombre: "Barnizado", requiereMaquina: true },
      { etapaNombre: "Secado" },
      { etapaNombre: "Troquelado", requiereMaquina: true },
      { etapaNombre: "Descartone", requiereMaquina: true },
      { etapaNombre: "Pegado", requiereMaquina: true },
      { etapaNombre: "Doblado", requiereMaquina: true },
      { etapaNombre: "Control de Calidad" },
      { etapaNombre: "Empaque", requiereMaquina: true },
      { etapaNombre: "Paletizado" },
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
      // Barnizadoras
      { id: "barniz-1", nombre: "Barnizadora 1", etapaId: etapaMap["Barnizado"], tipoMetrica: "metros_min", unidadMetrica: "m/min" },
      // Empacadoras
      { id: "empaque-1", nombre: "Empacadora 1", etapaId: etapaMap["Empaque"], tipoMetrica: "unidades_min", unidadMetrica: "u/min" },
      // Pegadora
      { id: "pegadora-1", nombre: "Pegadora 1", etapaId: etapaMap["Pegado"], tipoMetrica: "unidades_min", unidadMetrica: "u/min" },
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
