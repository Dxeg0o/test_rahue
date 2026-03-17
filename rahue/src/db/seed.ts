import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { etapa, tipoProducto, workflowEtapa, maquina } from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL no está definida");
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function seed() {
  console.log("🌱 Sembrando datos iniciales...\n");

  // ── 1. Etapas ──────────────────────────────────────────────────────────
  console.log("  📋 Creando etapas...");
  const etapas = await db
    .insert(etapa)
    .values([
      {
        nombre: "Llegada Materiales",
        tipoMetrica: "logistica",
        unidadDisplay: null,
        ordenDefault: 1,
      },
      {
        nombre: "Impresión",
        tipoMetrica: "metros_min",
        unidadDisplay: "m/min",
        ordenDefault: 2,
      },
      {
        nombre: "Troquelado",
        tipoMetrica: "golpes_min",
        unidadDisplay: "gpm",
        ordenDefault: 3,
      },
      {
        nombre: "Formado",
        tipoMetrica: "unidades_min",
        unidadDisplay: "u/min",
        ordenDefault: 4,
      },
      {
        nombre: "Tránsito a Bodega",
        tipoMetrica: "logistica",
        unidadDisplay: null,
        ordenDefault: 5,
      },
      {
        nombre: "Entrega Cliente",
        tipoMetrica: "logistica",
        unidadDisplay: null,
        ordenDefault: 6,
      },
    ])
    .returning();

  const etapaMap = Object.fromEntries(etapas.map((e) => [e.nombre, e.id]));
  console.log(`     ✅ ${etapas.length} etapas creadas`);

  // ── 2. Tipos de producto (Workflows) ───────────────────────────────────
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

  // ── 3. Workflow → Etapas ───────────────────────────────────────────────
  console.log("  🔗 Vinculando etapas a workflows...");

  const fullFlow = [
    "Llegada Materiales",
    "Impresión",
    "Troquelado",
    "Formado",
    "Tránsito a Bodega",
    "Entrega Cliente",
  ];

  const sinFormado = [
    "Llegada Materiales",
    "Impresión",
    "Troquelado",
    "Tránsito a Bodega",
    "Entrega Cliente",
  ];

  const workflowEtapasData = [
    ...fullFlow.map((e, i) => ({
      tipoProductoId: wfMap["Cono"],
      etapaId: etapaMap[e],
      orden: i + 1,
    })),
    ...fullFlow.map((e, i) => ({
      tipoProductoId: wfMap["Tapas"],
      etapaId: etapaMap[e],
      orden: i + 1,
    })),
    ...sinFormado.map((e, i) => ({
      tipoProductoId: wfMap["Tapas Troqueladas"],
      etapaId: etapaMap[e],
      orden: i + 1,
    })),
  ];

  await db.insert(workflowEtapa).values(workflowEtapasData);
  console.log(`     ✅ ${workflowEtapasData.length} vínculos creados`);

  // ── 4. Máquinas ────────────────────────────────────────────────────────
  console.log("  🏭 Creando máquinas...");
  const maquinas = await db
    .insert(maquina)
    .values([
      {
        id: "troquel-1",
        nombre: "Troquelado 1",
        etapaId: etapaMap["Troquelado"],
        tipoMetrica: "golpes_min",
        unidadMetrica: "gpm",
      },
      {
        id: "troquel-2",
        nombre: "Troquelado 2",
        etapaId: etapaMap["Troquelado"],
        tipoMetrica: "golpes_min",
        unidadMetrica: "gpm",
      },
      {
        id: "troquel-3",
        nombre: "Troquelado 3",
        etapaId: etapaMap["Troquelado"],
        tipoMetrica: "golpes_min",
        unidadMetrica: "gpm",
      },
      {
        id: "troquel-4",
        nombre: "Troquelado 4",
        etapaId: etapaMap["Troquelado"],
        tipoMetrica: "golpes_min",
        unidadMetrica: "gpm",
      },
      {
        id: "impresion-1",
        nombre: "Impresión 1",
        etapaId: etapaMap["Impresión"],
        tipoMetrica: "metros_min",
        unidadMetrica: "m/min",
      },
      {
        id: "impresion-2",
        nombre: "Impresión 2",
        etapaId: etapaMap["Impresión"],
        tipoMetrica: "metros_min",
        unidadMetrica: "m/min",
      },
      {
        id: "formadora-1",
        nombre: "Formadora 1",
        etapaId: etapaMap["Formado"],
        tipoMetrica: "unidades_min",
        unidadMetrica: "u/min",
      },
      {
        id: "formadora-2",
        nombre: "Formadora 2",
        etapaId: etapaMap["Formado"],
        tipoMetrica: "unidades_min",
        unidadMetrica: "u/min",
      },
    ])
    .returning();

  console.log(`     ✅ ${maquinas.length} máquinas creadas`);

  console.log("\n✅ Seed completado exitosamente!");
  await client.end();
}

seed().catch((err) => {
  console.error("❌ Error en seed:", err);
  process.exit(1);
});
