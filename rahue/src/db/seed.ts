import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  categoria,
  etapa,
  tipoProducto,
  workflowEtapa,
  maquina,
  usuario,
  ot,
  actividadOt,
  parada,
  lecturaPorMinuto,
  escaneoBarras,
} from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ DATABASE_URL no está definida");
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Resta N minutos a una fecha */
const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);
/** Resta N horas a una fecha */
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000);
/** Resta N días a una fecha */
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

/** Número aleatorio entre min y max */
const rand = (min: number, max: number) =>
  Math.random() * (max - min) + min;
const randInt = (min: number, max: number) =>
  Math.floor(rand(min, max + 1));

type WfStep = {
  etapaNombre: string;
  nombrePaso?: string;
  requiereMaquina?: boolean;
};

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Sembrando datos...\n");

  // ── 0. Limpiar (orden de dependencias) ──────────────────────────────
  console.log("  🧹 Limpiando datos existentes...");
  await db.delete(escaneoBarras);
  await db.delete(lecturaPorMinuto);
  await db.delete(parada);
  await db.delete(actividadOt);
  await db.delete(ot);
  await db.delete(workflowEtapa);
  await db.delete(maquina);
  await db.delete(tipoProducto);
  await db.delete(etapa);
  await db.delete(categoria);
  await db.delete(usuario);
  console.log("     ✅ Limpio\n");

  // ── 0.5. Categorías ──────────────────────────────────────────────────
  console.log("  📂 Categorías...");
  const categorias = await db.insert(categoria).values([
    { nombre: "proceso", descripcion: "Todo flujo de materiales o sub-procesos manuales" },
    { nombre: "maquina", descripcion: "Procesos que suceden físicamente en una máquina productiva" },
    { nombre: "movimiento", descripcion: "Transacciones e hitos logísticos como despachos" },
  ]).returning();
  const C = Object.fromEntries(categorias.map((c) => [c.nombre, c.id]));
  console.log(`     ✅ ${categorias.length} categorías\n`);

  // ── 1. Etapas ────────────────────────────────────────────────────────
  console.log("  📋 Etapas...");
  const etapas = await db.insert(etapa).values([
    { nombre: "Llegada Materiales",  categoriaId: C["proceso"],  tipoMetrica: "logistica",    icono: "truck",         descripcion: "Recepción e inspección de materia prima" },
    { nombre: "Impresión",           categoriaId: C["maquina"],  tipoMetrica: "metros_min",   unidadDisplay: "m/min", icono: "printer",       descripcion: "Impresión sobre material plano" },
    { nombre: "Troquelado",          categoriaId: C["maquina"],  tipoMetrica: "golpes_min",   unidadDisplay: "gpm",   icono: "scissors",      descripcion: "Corte con troquel (golpes por minuto)" },
    { nombre: "Formado",             categoriaId: C["maquina"],  tipoMetrica: "unidades_min", unidadDisplay: "u/min", icono: "box",           descripcion: "Formación del producto final" },
    { nombre: "Tránsito a Bodega",   categoriaId: C["movimiento"],tipoMetrica: "logistica",    icono: "warehouse",     descripcion: "Traslado de producto terminado a bodega" },
    { nombre: "Entrega Cliente",     categoriaId: C["movimiento"],tipoMetrica: "logistica",    icono: "package-check", descripcion: "Despacho al cliente final" },
  ]).returning();
  const E = Object.fromEntries(etapas.map((e) => [e.nombre, e]));
  console.log(`     ✅ ${etapas.length} etapas\n`);

  // ── 2. Tipos de producto (workflows) ─────────────────────────────────
  console.log("  🔄 Workflows...");
  const workflows = await db.insert(tipoProducto).values([
    { nombre: "Cono",             descripcion: "Cono de helado - flujo completo",            color: "indigo" },
    { nombre: "Tapas",            descripcion: "Tapas impresas y formadas",                  color: "emerald" },
    { nombre: "Tapas Troqueladas",descripcion: "Tapas solo troqueladas (sin formado)",       color: "orange" },
  ]).returning();
  const W = Object.fromEntries(workflows.map((w) => [w.nombre, w.id]));
  console.log(`     ✅ ${workflows.length} workflows\n`);

  // ── 3. Workflow → etapas ─────────────────────────────────────────────
  console.log("  🔗 Pasos de workflow...");
  const workflowDefs: Record<string, WfStep[]> = {
    "Cono": [
      { etapaNombre: "Llegada Materiales" },
      { etapaNombre: "Impresión",         requiereMaquina: true },
      { etapaNombre: "Troquelado",        requiereMaquina: true },
      { etapaNombre: "Formado",           requiereMaquina: true },
      { etapaNombre: "Tránsito a Bodega" },
      { etapaNombre: "Entrega Cliente" },
    ],
    "Tapas": [
      { etapaNombre: "Llegada Materiales" },
      { etapaNombre: "Impresión",         requiereMaquina: true },
      { etapaNombre: "Troquelado",        requiereMaquina: true },
      { etapaNombre: "Formado",           requiereMaquina: true },
      { etapaNombre: "Tránsito a Bodega" },
      { etapaNombre: "Entrega Cliente" },
    ],
    "Tapas Troqueladas": [
      { etapaNombre: "Llegada Materiales" },
      { etapaNombre: "Impresión",         requiereMaquina: true },
      { etapaNombre: "Troquelado",        requiereMaquina: true },
      { etapaNombre: "Tránsito a Bodega" },
      { etapaNombre: "Entrega Cliente" },
    ],
  };

  const allWfEtapas = await db.insert(workflowEtapa).values(
    Object.entries(workflowDefs).flatMap(([wfName, steps]) =>
      steps.map((step, i) => ({
        tipoProductoId: W[wfName],
        etapaId: E[step.etapaNombre].id,
        orden: i + 1,
        nombrePaso: step.nombrePaso ?? null,
        requiereMaquina: step.requiereMaquina ?? false,
      }))
    )
  ).returning();

  // Mapa: workflow+orden → workflowEtapa
  const WE = Object.fromEntries(
    allWfEtapas.map((we) => [`${we.tipoProductoId}:${we.orden}`, we])
  );
  console.log(`     ✅ ${allWfEtapas.length} pasos\n`);

  // ── 4. Máquinas ──────────────────────────────────────────────────────
  console.log("  🏭 Máquinas...");
  const maquinas = await db.insert(maquina).values([
    { id: "troquel-1",   nombre: "Troqueladora 1", etapaId: E["Troquelado"].id, tipoMetrica: "golpes_min",   unidadMetrica: "gpm"   },
    { id: "troquel-2",   nombre: "Troqueladora 2", etapaId: E["Troquelado"].id, tipoMetrica: "golpes_min",   unidadMetrica: "gpm"   },
    { id: "troquel-3",   nombre: "Troqueladora 3", etapaId: E["Troquelado"].id, tipoMetrica: "golpes_min",   unidadMetrica: "gpm"   },
    { id: "troquel-4",   nombre: "Troqueladora 4", etapaId: E["Troquelado"].id, tipoMetrica: "golpes_min",   unidadMetrica: "gpm"   },
    { id: "impresion-1", nombre: "Impresora 1",    etapaId: E["Impresión"].id,  tipoMetrica: "metros_min",   unidadMetrica: "m/min" },
    { id: "impresion-2", nombre: "Impresora 2",    etapaId: E["Impresión"].id,  tipoMetrica: "metros_min",   unidadMetrica: "m/min" },
    { id: "formadora-1", nombre: "Formadora 1",    etapaId: E["Formado"].id,    tipoMetrica: "unidades_min", unidadMetrica: "u/min" },
    { id: "formadora-2", nombre: "Formadora 2",    etapaId: E["Formado"].id,    tipoMetrica: "unidades_min", unidadMetrica: "u/min" },
  ]).returning();
  console.log(`     ✅ ${maquinas.length} máquinas\n`);

  // ── 5. Usuarios ──────────────────────────────────────────────────────
  console.log("  👤 Usuarios...");
  const usuarios = await db.insert(usuario).values([
    { supabaseId: "seed-admin-001",      nombre: "Carlos Mendoza",   email: "carlos@rahue.cl",    rut: "12345678-9", rol: "admin" },
    { supabaseId: "seed-super-001",      nombre: "Ana Soto",         email: "ana@rahue.cl",       rut: "98765432-1", rol: "supervisor" },
    { supabaseId: "seed-super-002",      nombre: "Roberto Fuentes",  email: "roberto@rahue.cl",   rut: "11111111-1", rol: "supervisor" },
    { supabaseId: "seed-oper-001",       nombre: "Juan Pérez",       email: "juan@rahue.cl",      rut: "22222222-2", rol: "operador" },
    { supabaseId: "seed-oper-002",       nombre: "María González",   email: "maria@rahue.cl",     rut: "33333333-3", rol: "operador" },
    { supabaseId: "seed-oper-003",       nombre: "Diego Rojas",      email: "diego@rahue.cl",     rut: "44444444-4", rol: "operador" },
    { supabaseId: "seed-oper-004",       nombre: "Valentina López",  email: "valentina@rahue.cl", rut: "55555555-5", rol: "operador" },
    { supabaseId: "seed-oper-005",       nombre: "Andrés Castro",    email: "andres@rahue.cl",    rut: "66666666-6", rol: "operador" },
  ]).returning();
  const U = Object.fromEntries(usuarios.map((u) => [u.nombre, u.id]));
  console.log(`     ✅ ${usuarios.length} usuarios\n`);

  // ── 6. Órdenes de trabajo ────────────────────────────────────────────
  console.log("  📦 Órdenes de trabajo...");

  const otsData = await db.insert(ot).values([
    // Historial (completadas)
    {
      codigo: "OT-3001", tipoProductoId: W["Cono"],             cliente: "Nestlé Chile",    sku: "CNO-001", metaUnidades: 50000,
      estado: "historial",
      fechaCreacion: daysAgo(7), fechaInicio: daysAgo(7), fechaTermino: daysAgo(6),
    },
    {
      codigo: "OT-3002", tipoProductoId: W["Tapas Troqueladas"], cliente: "Soprole",        sku: "TT-442",  metaUnidades: 30000,
      estado: "historial",
      fechaCreacion: daysAgo(5), fechaInicio: daysAgo(5), fechaTermino: daysAgo(4),
    },
    {
      codigo: "OT-3003", tipoProductoId: W["Tapas"],             cliente: "Loncoleche",     sku: "TAP-220", metaUnidades: 20000,
      estado: "historial",
      fechaCreacion: daysAgo(3), fechaInicio: daysAgo(3), fechaTermino: daysAgo(2),
    },
    // En proceso (activas hoy)
    {
      codigo: "OT-3004", tipoProductoId: W["Cono"],              cliente: "Nestlé Chile",   sku: "CNO-002", metaUnidades: 45000,
      estado: "en_proceso",
      fechaCreacion: daysAgo(1), fechaInicio: hoursAgo(6),
    },
    {
      codigo: "OT-3005", tipoProductoId: W["Tapas"],             cliente: "Colún",          sku: "TAP-331", metaUnidades: 25000,
      estado: "en_proceso",
      fechaCreacion: hoursAgo(8), fechaInicio: hoursAgo(7),
    },
    {
      codigo: "OT-3006", tipoProductoId: W["Tapas Troqueladas"], cliente: "Soprole",        sku: "TT-450",  metaUnidades: 15000,
      estado: "en_proceso",
      fechaCreacion: hoursAgo(4), fechaInicio: hoursAgo(3),
    },
    {
      codigo: "OT-3009", tipoProductoId: W["Cono"],              cliente: "Watts",          sku: "CNO-010", metaUnidades: 40000,
      estado: "en_proceso",
      fechaCreacion: daysAgo(2), fechaInicio: hoursAgo(5),
    },
    {
      codigo: "OT-3010", tipoProductoId: W["Tapas"],             cliente: "Danone Chile",   sku: "TAP-500", metaUnidades: 22000,
      estado: "en_proceso",
      fechaCreacion: hoursAgo(5), fechaInicio: hoursAgo(4),
    },
    {
      codigo: "OT-3011", tipoProductoId: W["Cono"],              cliente: "Loncoleche",     sku: "CNO-011", metaUnidades: 35000,
      estado: "esperando",
      fechaCreacion: hoursAgo(3), fechaInicio: hoursAgo(2),
    },
    // Sin comenzar (pendientes)
    {
      codigo: "OT-3007", tipoProductoId: W["Cono"],              cliente: "Nestlé Chile",   sku: "CNO-003", metaUnidades: 60000,
      estado: "sin_comenzar",
      fechaCreacion: hoursAgo(2),
    },
    {
      codigo: "OT-3008", tipoProductoId: W["Tapas"],             cliente: "Loncoleche",     sku: "TAP-221", metaUnidades: 18000,
      estado: "sin_comenzar",
      fechaCreacion: minutesAgo(30),
    },
    {
      codigo: "OT-3012", tipoProductoId: W["Tapas Troqueladas"], cliente: "Soprole",        sku: "TT-460",  metaUnidades: 12000,
      estado: "sin_comenzar",
      fechaCreacion: minutesAgo(45),
    },
    {
      codigo: "OT-3013", tipoProductoId: W["Cono"],              cliente: "Watts",          sku: "CNO-012", metaUnidades: 55000,
      estado: "sin_comenzar",
      fechaCreacion: minutesAgo(15),
    },
  ]).returning();

  const OT = Object.fromEntries(otsData.map((o) => [o.codigo, o]));
  console.log(`     ✅ ${otsData.length} OTs\n`);

  // ── 7. Actividades ───────────────────────────────────────────────────
  console.log("  ⚙️  Actividades...");

  // Helper: buscar workflow_etapa de un tipo_producto por orden
  const getWE = (tipoProductoId: string, orden: number) =>
    WE[`${tipoProductoId}:${orden}`];

  const actividades: (typeof actividadOt.$inferInsert)[] = [];

  // ── OT-3001 (Cono, completada) — todas las etapas completadas ──
  const ot3001 = OT["OT-3001"];
  actividades.push(
    { otId: ot3001.id, etapaId: E["Llegada Materiales"].id, workflowEtapaId: getWE(W["Cono"],1)?.id, ordenEtapa: 1,
      estado: "completada", horaInicio: daysAgo(7), horaTermino: new Date(daysAgo(7).getTime() + 60*60*1000) },
    { otId: ot3001.id, etapaId: E["Impresión"].id,          workflowEtapaId: getWE(W["Cono"],2)?.id, maquinaId: "impresion-1", operadorId: U["Juan Pérez"],     ordenEtapa: 2,
      salidasPorGolpe: null, velocidadObjetivo: 80,
      horaInicio: new Date(daysAgo(7).getTime() + 60*60*1000),
      horaInicioProduccion: new Date(daysAgo(7).getTime() + 70*60*1000),
      horaTermino: new Date(daysAgo(7).getTime() + 4*3600*1000),
      unidadesProducidas: 48000, unidadesMerma: 800,
      velocidadPromedio: 82, velocidadMin: 70, velocidadMax: 91, desviacionEstandar: 4.2,
      estado: "completada" },
    { otId: ot3001.id, etapaId: E["Troquelado"].id,         workflowEtapaId: getWE(W["Cono"],3)?.id, maquinaId: "troquel-1",   operadorId: U["María González"], ordenEtapa: 3,
      salidasPorGolpe: 4, velocidadObjetivo: 120,
      horaInicio: new Date(daysAgo(6).getTime() + 8*3600*1000),
      horaInicioProduccion: new Date(daysAgo(6).getTime() + 8.5*3600*1000),
      horaTermino: new Date(daysAgo(6).getTime() + 14*3600*1000),
      unidadesProducidas: 50000, unidadesMerma: 1200,
      velocidadPromedio: 118, velocidadMin: 95, velocidadMax: 130, desviacionEstandar: 6.1,
      estado: "completada" },
    { otId: ot3001.id, etapaId: E["Formado"].id,            workflowEtapaId: getWE(W["Cono"],4)?.id, maquinaId: "formadora-1", operadorId: U["Diego Rojas"],    ordenEtapa: 4,
      velocidadObjetivo: 200,
      horaInicio: new Date(daysAgo(6).getTime() + 14*3600*1000),
      horaInicioProduccion: new Date(daysAgo(6).getTime() + 14.25*3600*1000),
      horaTermino: new Date(daysAgo(6).getTime() + 18*3600*1000),
      unidadesProducidas: 50000, unidadesMerma: 300,
      velocidadPromedio: 195, velocidadMin: 180, velocidadMax: 210, desviacionEstandar: 8.0,
      estado: "completada" },
    { otId: ot3001.id, etapaId: E["Tránsito a Bodega"].id,  workflowEtapaId: getWE(W["Cono"],5)?.id, ordenEtapa: 5,
      estado: "completada", horaInicio: new Date(daysAgo(6).getTime() + 18*3600*1000), horaTermino: new Date(daysAgo(6).getTime() + 19*3600*1000) },
    { otId: ot3001.id, etapaId: E["Entrega Cliente"].id,    workflowEtapaId: getWE(W["Cono"],6)?.id, ordenEtapa: 6,
      estado: "completada", horaInicio: new Date(daysAgo(6).getTime() + 23*3600*1000), horaTermino: new Date(daysAgo(6).getTime() + 25*3600*1000) },
  );

  // ── OT-3002 (Tapas Troqueladas, completada) — cadena completa ──
  const ot3002 = OT["OT-3002"];
  actividades.push(
    { otId: ot3002.id, etapaId: E["Llegada Materiales"].id, workflowEtapaId: getWE(W["Tapas Troqueladas"],1)?.id, ordenEtapa: 1,
      estado: "completada", horaInicio: daysAgo(5), horaTermino: new Date(daysAgo(5).getTime() + 45*60*1000) },
    { otId: ot3002.id, etapaId: E["Impresión"].id,          workflowEtapaId: getWE(W["Tapas Troqueladas"],2)?.id, maquinaId: "impresion-1", operadorId: U["Valentina López"], ordenEtapa: 2,
      velocidadObjetivo: 75,
      horaInicio: new Date(daysAgo(5).getTime() + 1*3600*1000),
      horaInicioProduccion: new Date(daysAgo(5).getTime() + 1.25*3600*1000),
      horaTermino: new Date(daysAgo(5).getTime() + 5*3600*1000),
      unidadesProducidas: 29000, unidadesMerma: 600,
      velocidadPromedio: 74, velocidadMin: 62, velocidadMax: 82, desviacionEstandar: 4.5,
      estado: "completada" },
    { otId: ot3002.id, etapaId: E["Troquelado"].id,         workflowEtapaId: getWE(W["Tapas Troqueladas"],3)?.id, maquinaId: "troquel-2",   operadorId: U["Andrés Castro"],  ordenEtapa: 3,
      salidasPorGolpe: 2, velocidadObjetivo: 115,
      horaInicio: new Date(daysAgo(5).getTime() + 6*3600*1000),
      horaInicioProduccion: new Date(daysAgo(5).getTime() + 6.5*3600*1000),
      horaTermino: new Date(daysAgo(5).getTime() + 12*3600*1000),
      unidadesProducidas: 30000, unidadesMerma: 900,
      velocidadPromedio: 112, velocidadMin: 96, velocidadMax: 124, desviacionEstandar: 5.8,
      estado: "completada" },
    { otId: ot3002.id, etapaId: E["Tránsito a Bodega"].id,  workflowEtapaId: getWE(W["Tapas Troqueladas"],4)?.id, ordenEtapa: 4,
      estado: "completada", horaInicio: new Date(daysAgo(5).getTime() + 13*3600*1000), horaTermino: new Date(daysAgo(5).getTime() + 14*3600*1000) },
    { otId: ot3002.id, etapaId: E["Entrega Cliente"].id,    workflowEtapaId: getWE(W["Tapas Troqueladas"],5)?.id, ordenEtapa: 5,
      estado: "completada", horaInicio: new Date(daysAgo(4).getTime() + 8*3600*1000), horaTermino: new Date(daysAgo(4).getTime() + 10*3600*1000) },
  );

  // ── OT-3003 (Tapas, completada) — cadena completa ──
  const ot3003 = OT["OT-3003"];
  actividades.push(
    { otId: ot3003.id, etapaId: E["Llegada Materiales"].id, workflowEtapaId: getWE(W["Tapas"],1)?.id, ordenEtapa: 1,
      estado: "completada", horaInicio: daysAgo(3), horaTermino: new Date(daysAgo(3).getTime() + 30*60*1000) },
    { otId: ot3003.id, etapaId: E["Impresión"].id,          workflowEtapaId: getWE(W["Tapas"],2)?.id, maquinaId: "impresion-2", operadorId: U["Juan Pérez"],     ordenEtapa: 2,
      velocidadObjetivo: 70,
      horaInicio: new Date(daysAgo(3).getTime() + 1*3600*1000),
      horaInicioProduccion: new Date(daysAgo(3).getTime() + 1.2*3600*1000),
      horaTermino: new Date(daysAgo(3).getTime() + 4*3600*1000),
      unidadesProducidas: 19500, unidadesMerma: 350,
      velocidadPromedio: 69, velocidadMin: 58, velocidadMax: 76, desviacionEstandar: 3.7,
      estado: "completada" },
    { otId: ot3003.id, etapaId: E["Troquelado"].id,         workflowEtapaId: getWE(W["Tapas"],3)?.id, maquinaId: "troquel-3",   operadorId: U["Diego Rojas"],    ordenEtapa: 3,
      salidasPorGolpe: 2, velocidadObjetivo: 110,
      horaInicio: new Date(daysAgo(3).getTime() + 5*3600*1000),
      horaInicioProduccion: new Date(daysAgo(3).getTime() + 5.5*3600*1000),
      horaTermino: new Date(daysAgo(3).getTime() + 10*3600*1000),
      unidadesProducidas: 20000, unidadesMerma: 500,
      velocidadPromedio: 105, velocidadMin: 88, velocidadMax: 116, desviacionEstandar: 5.2,
      estado: "completada" },
    { otId: ot3003.id, etapaId: E["Formado"].id,            workflowEtapaId: getWE(W["Tapas"],4)?.id, maquinaId: "formadora-2", operadorId: U["Valentina López"], ordenEtapa: 4,
      velocidadObjetivo: 190,
      horaInicio: new Date(daysAgo(3).getTime() + 11*3600*1000),
      horaInicioProduccion: new Date(daysAgo(3).getTime() + 11.25*3600*1000),
      horaTermino: new Date(daysAgo(3).getTime() + 14*3600*1000),
      unidadesProducidas: 20000, unidadesMerma: 200,
      velocidadPromedio: 188, velocidadMin: 170, velocidadMax: 205, desviacionEstandar: 7.5,
      estado: "completada" },
    { otId: ot3003.id, etapaId: E["Tránsito a Bodega"].id,  workflowEtapaId: getWE(W["Tapas"],5)?.id, ordenEtapa: 5,
      estado: "completada", horaInicio: new Date(daysAgo(3).getTime() + 15*3600*1000), horaTermino: new Date(daysAgo(3).getTime() + 16*3600*1000) },
    { otId: ot3003.id, etapaId: E["Entrega Cliente"].id,    workflowEtapaId: getWE(W["Tapas"],6)?.id, ordenEtapa: 6,
      estado: "completada", horaInicio: new Date(daysAgo(2).getTime() + 9*3600*1000), horaTermino: new Date(daysAgo(2).getTime() + 11*3600*1000) },
  );

  // ── OT-3004 (Cono, en proceso) — troquelado activo en troquel-2 ──
  const ot3004 = OT["OT-3004"];
  actividades.push(
    { otId: ot3004.id, etapaId: E["Llegada Materiales"].id, workflowEtapaId: getWE(W["Cono"],1)?.id, ordenEtapa: 1,
      estado: "completada", horaInicio: hoursAgo(6), horaTermino: hoursAgo(5.5) },
    { otId: ot3004.id, etapaId: E["Impresión"].id,          workflowEtapaId: getWE(W["Cono"],2)?.id, maquinaId: "impresion-2", operadorId: U["Valentina López"], ordenEtapa: 2,
      velocidadObjetivo: 80,
      horaInicio: hoursAgo(5.5),
      horaInicioProduccion: hoursAgo(5.25),
      horaTermino: hoursAgo(3),
      unidadesProducidas: 31200, unidadesMerma: 500,
      velocidadPromedio: 79, velocidadMin: 65, velocidadMax: 88, desviacionEstandar: 5.1,
      estado: "completada" },
    { otId: ot3004.id, etapaId: E["Troquelado"].id,         workflowEtapaId: getWE(W["Cono"],3)?.id, maquinaId: "troquel-2",   operadorId: U["Andrés Castro"],  ordenEtapa: 3,
      salidasPorGolpe: 4, velocidadObjetivo: 120,
      horaInicio: hoursAgo(3),
      horaInicioProduccion: hoursAgo(2.75),
      unidadesProducidas: 18400, unidadesMerma: 800,
      velocidadPromedio: 115, velocidadMin: 88, velocidadMax: 128, desviacionEstandar: 7.3,
      estado: "produciendo" },
  );

  // ── OT-3005 (Tapas, en proceso) — impresión pausada en impresion-1 ──
  const ot3005 = OT["OT-3005"];
  actividades.push(
    { otId: ot3005.id, etapaId: E["Llegada Materiales"].id, workflowEtapaId: getWE(W["Tapas"],1)?.id, ordenEtapa: 1,
      estado: "completada", horaInicio: hoursAgo(7), horaTermino: hoursAgo(6.5) },
    { otId: ot3005.id, etapaId: E["Impresión"].id,          workflowEtapaId: getWE(W["Tapas"],2)?.id, maquinaId: "impresion-1", operadorId: U["Juan Pérez"],     ordenEtapa: 2,
      velocidadObjetivo: 75,
      horaInicio: hoursAgo(6),
      horaInicioProduccion: hoursAgo(5.8),
      unidadesProducidas: 22000, unidadesMerma: 400,
      velocidadPromedio: 73, velocidadMin: 60, velocidadMax: 80, desviacionEstandar: 4.8,
      estado: "pausada" },
  );

  // ── OT-3006 (Tapas Troqueladas, en proceso) — troquelado activo en troquel-3 ──
  const ot3006 = OT["OT-3006"];
  actividades.push(
    { otId: ot3006.id, etapaId: E["Llegada Materiales"].id, workflowEtapaId: getWE(W["Tapas Troqueladas"],1)?.id, ordenEtapa: 1,
      estado: "completada", horaInicio: hoursAgo(3), horaTermino: hoursAgo(2.75) },
    { otId: ot3006.id, etapaId: E["Impresión"].id,          workflowEtapaId: getWE(W["Tapas Troqueladas"],2)?.id, maquinaId: "impresion-2", operadorId: U["María González"], ordenEtapa: 2,
      velocidadObjetivo: 70,
      horaInicio: hoursAgo(2.5),
      horaInicioProduccion: hoursAgo(2.3),
      horaTermino: hoursAgo(1),
      unidadesProducidas: 9800, unidadesMerma: 200,
      velocidadPromedio: 68, velocidadMin: 58, velocidadMax: 74, desviacionEstandar: 3.9,
      estado: "completada" },
    { otId: ot3006.id, etapaId: E["Troquelado"].id,         workflowEtapaId: getWE(W["Tapas Troqueladas"],3)?.id, maquinaId: "troquel-3",   operadorId: U["Diego Rojas"],    ordenEtapa: 3,
      salidasPorGolpe: 2, velocidadObjetivo: 110,
      horaInicio: hoursAgo(1),
      horaInicioProduccion: minutesAgo(55),
      unidadesProducidas: 6200, unidadesMerma: 300,
      velocidadPromedio: 108, velocidadMin: 90, velocidadMax: 118, desviacionEstandar: 5.5,
      estado: "produciendo" },
  );

  // ── OT-3009 (Cono, en proceso) — formado activo en formadora-1 ──
  const ot3009 = OT["OT-3009"];
  actividades.push(
    { otId: ot3009.id, etapaId: E["Llegada Materiales"].id, workflowEtapaId: getWE(W["Cono"],1)?.id, ordenEtapa: 1,
      estado: "completada", horaInicio: hoursAgo(5), horaTermino: hoursAgo(4.75) },
    { otId: ot3009.id, etapaId: E["Impresión"].id,          workflowEtapaId: getWE(W["Cono"],2)?.id, maquinaId: "impresion-2", operadorId: U["Valentina López"], ordenEtapa: 2,
      velocidadObjetivo: 78,
      horaInicio: hoursAgo(4.75),
      horaInicioProduccion: hoursAgo(4.5),
      horaTermino: hoursAgo(3.5),
      unidadesProducidas: 28000, unidadesMerma: 450,
      velocidadPromedio: 77, velocidadMin: 64, velocidadMax: 85, desviacionEstandar: 4.6,
      estado: "completada" },
    { otId: ot3009.id, etapaId: E["Troquelado"].id,         workflowEtapaId: getWE(W["Cono"],3)?.id, maquinaId: "troquel-1",   operadorId: U["María González"], ordenEtapa: 3,
      salidasPorGolpe: 4, velocidadObjetivo: 120,
      horaInicio: hoursAgo(3.5),
      horaInicioProduccion: hoursAgo(3.25),
      horaTermino: hoursAgo(2),
      unidadesProducidas: 36000, unidadesMerma: 1000,
      velocidadPromedio: 116, velocidadMin: 92, velocidadMax: 128, desviacionEstandar: 6.5,
      estado: "completada" },
    { otId: ot3009.id, etapaId: E["Formado"].id,            workflowEtapaId: getWE(W["Cono"],4)?.id, maquinaId: "formadora-1", operadorId: U["Diego Rojas"],    ordenEtapa: 4,
      velocidadObjetivo: 200,
      horaInicio: hoursAgo(2),
      horaInicioProduccion: hoursAgo(1.75),
      unidadesProducidas: 19500, unidadesMerma: 400,
      velocidadPromedio: 195, velocidadMin: 175, velocidadMax: 215, desviacionEstandar: 9.2,
      estado: "produciendo" },
  );

  // ── OT-3010 (Tapas, en proceso) — impresión activa en impresion-2 ──
  const ot3010 = OT["OT-3010"];
  actividades.push(
    { otId: ot3010.id, etapaId: E["Llegada Materiales"].id, workflowEtapaId: getWE(W["Tapas"],1)?.id, ordenEtapa: 1,
      estado: "completada", horaInicio: hoursAgo(4), horaTermino: hoursAgo(3.75) },
    { otId: ot3010.id, etapaId: E["Impresión"].id,          workflowEtapaId: getWE(W["Tapas"],2)?.id, maquinaId: "impresion-2", operadorId: U["Andrés Castro"],  ordenEtapa: 2,
      velocidadObjetivo: 72,
      horaInicio: hoursAgo(3.5),
      horaInicioProduccion: hoursAgo(3.25),
      unidadesProducidas: 14500, unidadesMerma: 300,
      velocidadPromedio: 71, velocidadMin: 60, velocidadMax: 79, desviacionEstandar: 4.1,
      estado: "produciendo" },
  );

  // ── OT-3011 (Cono, en proceso) — formado calentando en formadora-2 ──
  const ot3011 = OT["OT-3011"];
  actividades.push(
    { otId: ot3011.id, etapaId: E["Llegada Materiales"].id, workflowEtapaId: getWE(W["Cono"],1)?.id, ordenEtapa: 1,
      estado: "completada", horaInicio: hoursAgo(2), horaTermino: hoursAgo(1.75) },
    { otId: ot3011.id, etapaId: E["Impresión"].id,          workflowEtapaId: getWE(W["Cono"],2)?.id, maquinaId: "impresion-1", operadorId: U["María González"], ordenEtapa: 2,
      velocidadObjetivo: 76,
      horaInicio: hoursAgo(1.75),
      horaInicioProduccion: hoursAgo(1.5),
      horaTermino: hoursAgo(0.75),
      unidadesProducidas: 10200, unidadesMerma: 250,
      velocidadPromedio: 74, velocidadMin: 62, velocidadMax: 81, desviacionEstandar: 3.8,
      estado: "completada" },
    { otId: ot3011.id, etapaId: E["Troquelado"].id,         workflowEtapaId: getWE(W["Cono"],3)?.id, maquinaId: "troquel-4",   operadorId: U["Andrés Castro"],  ordenEtapa: 3,
      salidasPorGolpe: 4, velocidadObjetivo: 118,
      horaInicio: hoursAgo(0.75),
      horaInicioProduccion: hoursAgo(0.5),
      horaTermino: minutesAgo(10),
      unidadesProducidas: 8800, unidadesMerma: 400,
      velocidadPromedio: 110, velocidadMin: 88, velocidadMax: 122, desviacionEstandar: 6.0,
      estado: "completada" },
    { otId: ot3011.id, etapaId: E["Formado"].id,            workflowEtapaId: getWE(W["Cono"],4)?.id, maquinaId: "formadora-2", operadorId: U["Valentina López"], ordenEtapa: 4,
      velocidadObjetivo: 190,
      horaInicio: minutesAgo(10),
      unidadesProducidas: 0, unidadesMerma: 0,
      estado: "calentando" },
  );

  const actividadesInserted = await db.insert(actividadOt).values(actividades).returning();
  const A = Object.fromEntries(actividadesInserted.map((a) => [`${a.otId}:${a.ordenEtapa}`, a]));
  console.log(`     ✅ ${actividadesInserted.length} actividades\n`);

  // ── 8. Paradas ───────────────────────────────────────────────────────
  console.log("  ⏸️  Paradas...");

  const paradasData: (typeof parada.$inferInsert)[] = [];

  // Parada activa en OT-3005 (impresión pausada)
  const actImpOT3005 = A[`${ot3005.id}:2`];
  if (actImpOT3005) {
    paradasData.push({
      actividadOtId: actImpOT3005.id,
      motivo: "ajuste_maquina",
      detalle: "Ajuste de tensión de rodillo",
      horaInicio: minutesAgo(15),
      horaTermino: null,
    });
  }

  // Paradas históricas en OT-3004 troquelado
  const actTroqOT3004 = A[`${ot3004.id}:3`];
  if (actTroqOT3004) {
    paradasData.push({
      actividadOtId: actTroqOT3004.id,
      motivo: "colacion",
      horaInicio: new Date(hoursAgo(2.75).getTime() + 45*60*1000),
      horaTermino: new Date(hoursAgo(2.75).getTime() + 75*60*1000),
      duracionSegundos: 1800,
    });
  }

  // Paradas históricas en OT-3001 troquelado
  const actTroqOT3001 = A[`${ot3001.id}:3`];
  if (actTroqOT3001) {
    paradasData.push(
      {
        actividadOtId: actTroqOT3001.id,
        motivo: "bano",
        horaInicio: new Date(daysAgo(6).getTime() + 10*3600*1000),
        horaTermino: new Date(daysAgo(6).getTime() + 10.25*3600*1000),
        duracionSegundos: 900,
      },
      {
        actividadOtId: actTroqOT3001.id,
        motivo: "ajuste_maquina",
        detalle: "Cambio de matriz",
        horaInicio: new Date(daysAgo(6).getTime() + 12*3600*1000),
        horaTermino: new Date(daysAgo(6).getTime() + 12.5*3600*1000),
        duracionSegundos: 1800,
      }
    );
  }

  if (paradasData.length > 0) {
    await db.insert(parada).values(paradasData);
  }
  console.log(`     ✅ ${paradasData.length} paradas\n`);

  // ── 9. Lecturas por minuto (para todas las actividades activas con máquina) ──
  console.log("  📊 Lecturas por minuto...");

  const lpmData: (typeof lecturaPorMinuto.$inferInsert)[] = [];

  // Helper para generar lecturas por minuto
  function generateLpm(
    maquinaId: string,
    actividadId: string,
    inicio: Date,
    minutos: number,
    rangoMin: number,
    rangoMax: number,
    esMerma: boolean,
  ) {
    for (let m = 0; m < minutos; m++) {
      lpmData.push({
        maquinaId,
        actividadOtId: actividadId,
        minuto: new Date(inicio.getTime() + m * 60_000),
        conteoLecturas: randInt(rangoMin, rangoMax),
        esMerma,
      });
    }
  }

  // OT-3004 troquelado (troquel-2, produciendo) — ~165 min de producción
  const actTroqOT3004act = A[`${ot3004.id}:3`];
  if (actTroqOT3004act) {
    const inicioCalentamiento = actTroqOT3004act.horaInicio ?? hoursAgo(3);
    const inicioProduccion = actTroqOT3004act.horaInicioProduccion ?? hoursAgo(2.75);
    // Warmup: 15 min
    generateLpm("troquel-2", actTroqOT3004act.id, inicioCalentamiento, 15, 40, 70, true);
    // Producción: desde inicio producción hasta ahora
    const minProduccion = Math.floor((Date.now() - inicioProduccion.getTime()) / 60_000);
    generateLpm("troquel-2", actTroqOT3004act.id, inicioProduccion, minProduccion, 105, 128, false);
  }

  // OT-3006 troquelado (troquel-3, produciendo) — warmup + producción
  const actTroqOT3006 = A[`${ot3006.id}:3`];
  if (actTroqOT3006) {
    const inicioCalentamiento = actTroqOT3006.horaInicio ?? hoursAgo(1);
    const inicioProduccion = actTroqOT3006.horaInicioProduccion ?? minutesAgo(55);
    const minWarmup = Math.floor((inicioProduccion.getTime() - inicioCalentamiento.getTime()) / 60_000);
    generateLpm("troquel-3", actTroqOT3006.id, inicioCalentamiento, minWarmup, 30, 75, true);
    const minProduccion = Math.floor((Date.now() - inicioProduccion.getTime()) / 60_000);
    generateLpm("troquel-3", actTroqOT3006.id, inicioProduccion, minProduccion, 90, 118, false);
  }

  // OT-3005 impresión (impresion-1, pausada) — lecturas hasta la pausa
  const actImpOT3005lpm = A[`${ot3005.id}:2`];
  if (actImpOT3005lpm) {
    const inicioProduccion = actImpOT3005lpm.horaInicioProduccion ?? hoursAgo(5.8);
    // Lecturas hasta hace 15 min (cuando se pausó)
    const minProduccion = Math.floor((minutesAgo(15).getTime() - inicioProduccion.getTime()) / 60_000);
    generateLpm("impresion-1", actImpOT3005lpm.id, inicioProduccion, minProduccion, 60, 80, false);
  }

  // OT-3010 impresión (impresion-2, produciendo) — lecturas activas
  const actImpOT3010 = A[`${ot3010.id}:2`];
  if (actImpOT3010) {
    const inicioCalentamiento = actImpOT3010.horaInicio ?? hoursAgo(3.5);
    const inicioProduccion = actImpOT3010.horaInicioProduccion ?? hoursAgo(3.25);
    const minWarmup = Math.floor((inicioProduccion.getTime() - inicioCalentamiento.getTime()) / 60_000);
    generateLpm("impresion-2", actImpOT3010.id, inicioCalentamiento, minWarmup, 20, 40, true);
    const minProduccion = Math.floor((Date.now() - inicioProduccion.getTime()) / 60_000);
    generateLpm("impresion-2", actImpOT3010.id, inicioProduccion, minProduccion, 65, 85, false);
  }

  // OT-3009 formado (formadora-1, produciendo) — lecturas activas
  const actFormOT3009 = A[`${ot3009.id}:4`];
  if (actFormOT3009) {
    const inicioCalentamiento = actFormOT3009.horaInicio ?? hoursAgo(2);
    const inicioProduccion = actFormOT3009.horaInicioProduccion ?? hoursAgo(1.75);
    const minWarmup = Math.floor((inicioProduccion.getTime() - inicioCalentamiento.getTime()) / 60_000);
    generateLpm("formadora-1", actFormOT3009.id, inicioCalentamiento, minWarmup, 60, 100, true);
    const minProduccion = Math.floor((Date.now() - inicioProduccion.getTime()) / 60_000);
    generateLpm("formadora-1", actFormOT3009.id, inicioProduccion, minProduccion, 180, 220, false);
  }

  // OT-3011 formado (formadora-2, calentando) — solo warmup
  const actFormOT3011 = A[`${ot3011.id}:4`];
  if (actFormOT3011) {
    const inicioCalentamiento = actFormOT3011.horaInicio ?? minutesAgo(10);
    const minCalentando = Math.floor((Date.now() - inicioCalentamiento.getTime()) / 60_000);
    generateLpm("formadora-2", actFormOT3011.id, inicioCalentamiento, minCalentando, 60, 100, true);
  }

  // Lecturas históricas de OT-3001 troquelado (troquel-1) — resumen por hora
  const actTroqOT3001hist = A[`${ot3001.id}:3`];
  if (actTroqOT3001hist) {
    const inicio = actTroqOT3001hist.horaInicioProduccion ?? new Date(daysAgo(6).getTime() + 8.5*3600*1000);
    generateLpm("troquel-1", actTroqOT3001hist.id, inicio, 330, 100, 130, false);
  }

  // Lecturas históricas de OT-3001 impresión (impresion-1)
  const actImpOT3001hist = A[`${ot3001.id}:2`];
  if (actImpOT3001hist) {
    const inicio = actImpOT3001hist.horaInicioProduccion ?? new Date(daysAgo(7).getTime() + 70*60*1000);
    generateLpm("impresion-1", actImpOT3001hist.id, inicio, 170, 65, 90, false);
  }

  // Lecturas históricas de OT-3001 formado (formadora-1)
  const actFormOT3001hist = A[`${ot3001.id}:4`];
  if (actFormOT3001hist) {
    const inicio = actFormOT3001hist.horaInicioProduccion ?? new Date(daysAgo(6).getTime() + 14.25*3600*1000);
    generateLpm("formadora-1", actFormOT3001hist.id, inicio, 225, 175, 215, false);
  }

  const BATCH = 500;
  for (let i = 0; i < lpmData.length; i += BATCH) {
    await db.insert(lecturaPorMinuto).values(lpmData.slice(i, i + BATCH));
  }
  console.log(`     ✅ ${lpmData.length} lecturas/minuto\n`);

  // ── 10. Escaneos de barras ──────────────────────────────────────────
  console.log("  🔍 Escaneos de barras...");
  await db.insert(escaneoBarras).values([
    { tipo: "ot",       valorRaw: "OT-3004", entidadId: ot3004.id,       resultado: "ok",           maquinaId: "troquel-2",   usuarioId: U["Andrés Castro"],  timestamp: hoursAgo(3) },
    { tipo: "operador", valorRaw: "44444444-4", entidadId: U["Diego Rojas"], resultado: "ok",        maquinaId: "troquel-2",   usuarioId: U["Diego Rojas"],    timestamp: hoursAgo(3) },
    { tipo: "ot",       valorRaw: "OT-3005", entidadId: ot3005.id,       resultado: "ok",           maquinaId: "impresion-1", usuarioId: U["Juan Pérez"],     timestamp: hoursAgo(6) },
    { tipo: "operador", valorRaw: "22222222-2", entidadId: U["Juan Pérez"], resultado: "ok",         maquinaId: "impresion-1", usuarioId: U["Juan Pérez"],     timestamp: hoursAgo(6) },
    { tipo: "ot",       valorRaw: "OT-9999", entidadId: null,             resultado: "no_encontrado", maquinaId: "troquel-1", usuarioId: null,                timestamp: hoursAgo(1) },
    { tipo: "maquina",  valorRaw: "troquel-3", entidadId: "troquel-3",   resultado: "ok",           maquinaId: "troquel-3",   usuarioId: U["Diego Rojas"],    timestamp: hoursAgo(1) },
    { tipo: "ot",       valorRaw: "OT-3006", entidadId: ot3006.id,       resultado: "ok",           maquinaId: "troquel-3",   usuarioId: U["Diego Rojas"],    timestamp: hoursAgo(1) },
    { tipo: "ot",       valorRaw: "OT-3009", entidadId: ot3009.id,       resultado: "ok",           maquinaId: "formadora-1", usuarioId: U["Diego Rojas"],    timestamp: hoursAgo(2) },
    { tipo: "ot",       valorRaw: "OT-3010", entidadId: ot3010.id,       resultado: "ok",           maquinaId: "impresion-2", usuarioId: U["Andrés Castro"],  timestamp: hoursAgo(3.5) },
  ]);
  console.log("     ✅ 9 escaneos\n");

  // ── Resumen ──────────────────────────────────────────────────────────
  console.log("✅ Seed completado!\n");
  console.log("📊 Resumen:");
  console.log(`   ${etapas.length} etapas`);
  console.log(`   ${workflows.length} workflows (tipos de producto)`);
  console.log(`   ${allWfEtapas.length} pasos de workflow`);
  console.log(`   ${maquinas.length} máquinas`);
  console.log(`   ${usuarios.length} usuarios (1 admin, 2 supervisores, 5 operadores)`);
  console.log(`   ${otsData.length} OTs (3 historial, 5 en proceso, 1 esperando, 4 sin comenzar)`);
  console.log(`   ${actividadesInserted.length} actividades`);
  console.log(`   ${paradasData.length} paradas`);
  console.log(`   ${lpmData.length} lecturas agregadas por minuto`);
  console.log("   9 escaneos de barras");

  await client.end();
}

seed().catch((err) => {
  console.error("❌ Error en seed:", err);
  process.exit(1);
});
