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
  lecturaMaquina,
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
  await db.delete(lecturaMaquina);
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
  // supabase_id es placeholder — en prod se sincroniza desde Supabase Auth al login.
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
    // Completadas (historial)
    {
      codigo: "OT-3001", tipoProductoId: W["Cono"],             cliente: "Nestlé Chile",    sku: "CNO-001", metaUnidades: 50000,
      estado: "completada",
      fechaCreacion: daysAgo(7), fechaInicio: daysAgo(7), fechaTermino: daysAgo(6),
    },
    {
      codigo: "OT-3002", tipoProductoId: W["Tapas Troqueladas"], cliente: "Soprole",        sku: "TT-442",  metaUnidades: 30000,
      estado: "completada",
      fechaCreacion: daysAgo(5), fechaInicio: daysAgo(5), fechaTermino: daysAgo(4),
    },
    {
      codigo: "OT-3003", tipoProductoId: W["Tapas"],             cliente: "Loncoleche",     sku: "TAP-220", metaUnidades: 20000,
      estado: "completada",
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
    // Pendientes (sin iniciar)
    {
      codigo: "OT-3007", tipoProductoId: W["Cono"],              cliente: "Nestlé Chile",   sku: "CNO-003", metaUnidades: 60000,
      estado: "pendiente",
      fechaCreacion: hoursAgo(2),
    },
    {
      codigo: "OT-3008", tipoProductoId: W["Tapas"],             cliente: "Loncoleche",     sku: "TAP-221", metaUnidades: 18000,
      estado: "pendiente",
      fechaCreacion: minutesAgo(30),
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

  // OT-3001 (Cono, completada) — todas las etapas completadas
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

  // OT-3004 (Cono, en proceso) — llegada completa, impresión completa, troquelado activo
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

  // OT-3005 (Tapas, en proceso) — llegada completa, impresión activa
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

  // OT-3006 (Tapas Troqueladas, en proceso) — activa desde hace poco
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
      estado: "calentando" },
  );

  const actividadesInserted = await db.insert(actividadOt).values(actividades).returning();
  const A = Object.fromEntries(actividadesInserted.map((a) => [`${a.otId}:${a.ordenEtapa}`, a]));
  console.log(`     ✅ ${actividadesInserted.length} actividades\n`);

  // ── 8. Paradas ───────────────────────────────────────────────────────
  console.log("  ⏸️  Paradas...");

  // Parada activa en OT-3005 (impresión pausada)
  const actImpOT3005 = A[`${ot3005.id}:2`];
  // Paradas históricas en OT-3004 troquelado
  const actTroqOT3004 = A[`${ot3004.id}:3`];
  // Parada en OT-3001 troquelado (histórica)
  const actTroqOT3001 = A[`${ot3001.id}:3`];

  const paradasData: (typeof parada.$inferInsert)[] = [];

  if (actImpOT3005) {
    paradasData.push({
      actividadOtId: actImpOT3005.id,
      motivo: "ajuste_maquina",
      detalle: "Ajuste de tensión de rodillo",
      horaInicio: minutesAgo(15),
      horaTermino: null, // sigue activa
    });
  }

  if (actTroqOT3004) {
    paradasData.push({
      actividadOtId: actTroqOT3004.id,
      motivo: "colacion",
      horaInicio: new Date(hoursAgo(2.75).getTime() + 45*60*1000),
      horaTermino: new Date(hoursAgo(2.75).getTime() + 75*60*1000),
      duracionSegundos: 1800,
    });
  }

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

  // ── 9. Lecturas de máquina (actividades activas) ─────────────────────
  // Generamos ~60 min de lecturas para las actividades en_proceso con máquina
  console.log("  📡 Lecturas de máquina...");

  const lecturasData: (typeof lecturaMaquina.$inferInsert)[] = [];

  // Actividad activa: OT-3004 troquelado (troquel-2, golpes_min ~120)
  const actTroqOT3004act = A[`${ot3004.id}:3`];
  if (actTroqOT3004act) {
    const inicioProduccion = actTroqOT3004act.horaInicioProduccion ?? hoursAgo(2.75);
    // Merma: 15 min antes de producción (warmup)
    const inicioCalentamiento = actTroqOT3004act.horaInicio ?? hoursAgo(3);
    const mermaMinutos = 15;
    for (let m = 0; m < mermaMinutos; m++) {
      const golpesEnMinuto = randInt(40, 70); // velocidad baja en warmup
      for (let g = 0; g < golpesEnMinuto; g++) {
        lecturasData.push({
          maquinaId: "troquel-2",
          actividadOtId: actTroqOT3004act.id,
          timestamp: new Date(inicioCalentamiento.getTime() + m * 60_000 + (g / golpesEnMinuto) * 60_000),
          valor: 1,
          esMerma: true,
        });
      }
    }
    // Producción: desde hora_inicio_produccion hasta ahora (~165 min)
    const minProduccion = Math.floor((Date.now() - inicioProduccion.getTime()) / 60_000);
    for (let m = 0; m < minProduccion; m++) {
      const golpesEnMinuto = randInt(105, 128);
      for (let g = 0; g < golpesEnMinuto; g++) {
        lecturasData.push({
          maquinaId: "troquel-2",
          actividadOtId: actTroqOT3004act.id,
          timestamp: new Date(inicioProduccion.getTime() + m * 60_000 + (g / golpesEnMinuto) * 60_000),
          valor: 1,
          esMerma: false,
        });
      }
    }
  }

  // Actividad: OT-3006 troquelado (troquel-3, en calentamiento)
  const actTroqOT3006 = A[`${ot3006.id}:3`];
  if (actTroqOT3006) {
    const inicioCalentamiento = actTroqOT3006.horaInicio ?? minutesAgo(60);
    const minCalentando = Math.floor((Date.now() - inicioCalentamiento.getTime()) / 60_000);
    for (let m = 0; m < minCalentando; m++) {
      const golpesEnMinuto = randInt(30, 75);
      for (let g = 0; g < golpesEnMinuto; g++) {
        lecturasData.push({
          maquinaId: "troquel-3",
          actividadOtId: actTroqOT3006.id,
          timestamp: new Date(inicioCalentamiento.getTime() + m * 60_000 + (g / golpesEnMinuto) * 60_000),
          valor: 1,
          esMerma: true,
        });
      }
    }
  }

  // Insertar en lotes de 500 para no exceder límites
  const BATCH = 500;
  for (let i = 0; i < lecturasData.length; i += BATCH) {
    await db.insert(lecturaMaquina).values(lecturasData.slice(i, i + BATCH));
  }
  console.log(`     ✅ ${lecturasData.length} lecturas individuales\n`);

  // ── 10. Lecturas por minuto (agregadas) ──────────────────────────────
  console.log("  📊 Lecturas por minuto...");

  const lpmData: (typeof lecturaPorMinuto.$inferInsert)[] = [];

  // Agregar las lecturas de OT-3004 troquelado por minuto
  if (actTroqOT3004act) {
    const inicioProduccion = actTroqOT3004act.horaInicioProduccion ?? hoursAgo(2.75);
    const minProduccion = Math.floor((Date.now() - inicioProduccion.getTime()) / 60_000);
    for (let m = 0; m < minProduccion; m++) {
      const velocidad = rand(105, 128);
      lpmData.push({
        maquinaId: "troquel-2",
        actividadOtId: actTroqOT3004act.id,
        minuto: new Date(inicioProduccion.getTime() + m * 60_000),
        totalValor: velocidad,
        conteoLecturas: Math.round(velocidad),
        velocidad,
        esMerma: false,
      });
    }
  }

  // Lecturas históricas de OT-3001 troquelado (troquel-1) — resumen por hora
  const actTroqOT3001hist = A[`${ot3001.id}:3`];
  if (actTroqOT3001hist) {
    const inicio = actTroqOT3001hist.horaInicioProduccion ?? new Date(daysAgo(6).getTime() + 8.5*3600*1000);
    const minutos = 330; // 5.5 horas de producción
    for (let m = 0; m < minutos; m++) {
      const velocidad = rand(100, 130);
      lpmData.push({
        maquinaId: "troquel-1",
        actividadOtId: actTroqOT3001hist.id,
        minuto: new Date(inicio.getTime() + m * 60_000),
        totalValor: velocidad,
        conteoLecturas: Math.round(velocidad),
        velocidad,
        esMerma: false,
      });
    }
  }

  for (let i = 0; i < lpmData.length; i += BATCH) {
    await db.insert(lecturaPorMinuto).values(lpmData.slice(i, i + BATCH));
  }
  console.log(`     ✅ ${lpmData.length} lecturas/minuto\n`);

  // ── 11. Escaneos de barras ────────────────────────────────────────────
  console.log("  🔍 Escaneos de barras...");
  await db.insert(escaneoBarras).values([
    // Escaneos exitosos al iniciar OT-3004
    { tipo: "ot",       valorRaw: "OT-3004", entidadId: ot3004.id,       resultado: "ok",           maquinaId: "troquel-2",   usuarioId: U["Andrés Castro"],  timestamp: hoursAgo(3) },
    { tipo: "operador", valorRaw: "44444444-4", entidadId: U["Diego Rojas"], resultado: "ok",        maquinaId: "troquel-2",   usuarioId: U["Diego Rojas"],    timestamp: hoursAgo(3) },
    // OT-3005 impresora
    { tipo: "ot",       valorRaw: "OT-3005", entidadId: ot3005.id,       resultado: "ok",           maquinaId: "impresion-1", usuarioId: U["Juan Pérez"],     timestamp: hoursAgo(6) },
    { tipo: "operador", valorRaw: "22222222-2", entidadId: U["Juan Pérez"], resultado: "ok",         maquinaId: "impresion-1", usuarioId: U["Juan Pérez"],     timestamp: hoursAgo(6) },
    // Escaneo fallido (OT no encontrada)
    { tipo: "ot",       valorRaw: "OT-9999", entidadId: null,             resultado: "no_encontrado", maquinaId: "troquel-1", usuarioId: null,                timestamp: hoursAgo(1) },
    // Escaneo de máquina
    { tipo: "maquina",  valorRaw: "troquel-3", entidadId: "troquel-3",   resultado: "ok",           maquinaId: "troquel-3",   usuarioId: U["Diego Rojas"],    timestamp: hoursAgo(1) },
    // Escaneo OT-3006
    { tipo: "ot",       valorRaw: "OT-3006", entidadId: ot3006.id,       resultado: "ok",           maquinaId: "troquel-3",   usuarioId: U["Diego Rojas"],    timestamp: hoursAgo(1) },
  ]);
  console.log("     ✅ 7 escaneos\n");

  // ── Resumen ──────────────────────────────────────────────────────────
  console.log("✅ Seed completado!\n");
  console.log("📊 Resumen:");
  console.log(`   ${etapas.length} etapas`);
  console.log(`   ${workflows.length} workflows (tipos de producto)`);
  console.log(`   ${allWfEtapas.length} pasos de workflow`);
  console.log(`   ${maquinas.length} máquinas`);
  console.log(`   ${usuarios.length} usuarios (1 admin, 2 supervisores, 5 operadores)`);
  console.log(`   ${otsData.length} OTs (3 completadas, 3 en proceso, 2 pendientes)`);
  console.log(`   ${actividadesInserted.length} actividades`);
  console.log(`   ${paradasData.length} paradas`);
  console.log(`   ${lecturasData.length} lecturas individuales de máquina`);
  console.log(`   ${lpmData.length} lecturas agregadas por minuto`);
  console.log("   7 escaneos de barras");

  await client.end();
}

seed().catch((err) => {
  console.error("❌ Error en seed:", err);
  process.exit(1);
});
