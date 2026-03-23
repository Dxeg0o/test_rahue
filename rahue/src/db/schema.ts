import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  real,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================================
// CAPA 1: CATÁLOGOS
// ============================================================================

export const categoria = pgTable("categoria", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull().unique(),
  descripcion: text("descripcion"),
});

// Etapa = bloque reutilizable. NO tiene orden propio.
// El orden lo define workflow_etapa.orden dentro de cada workflow.
export const etapa = pgTable("etapa", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull().unique(),
  descripcion: text("descripcion"),
  categoriaId: uuid("categoria_id")
    .notNull()
    .references(() => categoria.id),
  tipoMetrica: text("tipo_metrica", {
    enum: ["golpes_min", "metros_min", "unidades_min", "logistica"],
  })
    .notNull()
    .default("logistica"),
  unidadDisplay: text("unidad_display"), // "gpm", "m/min", "u/min", NULL para logística
  icono: text("icono"), // nombre de ícono para UI (ej: "truck", "printer", "scissors")
});

export const tipoProducto = pgTable("tipo_producto", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull().unique(),
  descripcion: text("descripcion"),
  color: text("color").default("indigo"),
  activo: boolean("activo").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const workflowEtapa = pgTable(
  "workflow_etapa",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipoProductoId: uuid("tipo_producto_id")
      .notNull()
      .references(() => tipoProducto.id, { onDelete: "cascade" }),
    etapaId: uuid("etapa_id")
      .notNull()
      .references(() => etapa.id, { onDelete: "restrict" }),
    orden: integer("orden").notNull(),
    // Nombre personalizado del paso dentro de este workflow (opcional).
    // Si es NULL, se usa el nombre de la etapa.
    // Útil cuando la misma etapa aparece 2+ veces: "Troquelado 1", "Troquelado 2"
    nombrePaso: text("nombre_paso"),
    // Si este paso requiere máquina o es solo logístico/manual
    requiereMaquina: boolean("requiere_maquina").default(false),
  },
  (table) => [
    // Ya NO hay UNIQUE(tipo_producto_id, etapa_id) → una etapa puede repetirse
    unique("uq_workflow_etapa_producto_orden").on(
      table.tipoProductoId,
      table.orden
    ),
    index("idx_workflow_etapa_producto").on(table.tipoProductoId, table.orden),
  ]
);

// ============================================================================
// CAPA 2: RECURSOS
// ============================================================================

export const maquina = pgTable(
  "maquina",
  {
    id: text("id").primaryKey(), // "troquel-4", "impresion-1", etc.
    nombre: text("nombre").notNull(),
    etapaId: uuid("etapa_id")
      .notNull()
      .references(() => etapa.id),
    tipoMetrica: text("tipo_metrica").notNull(),
    unidadMetrica: text("unidad_metrica"),
    activa: boolean("activa").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("idx_maquina_etapa").on(table.etapaId)]
);

export const usuario = pgTable(
  "usuario",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supabaseId: text("supabase_id").notNull().unique(),
    nombre: text("nombre").notNull(),
    email: text("email"),
    rut: text("rut").unique(), // para escaneo de credencial
    rol: text("rol", { enum: ["admin", "supervisor", "operador"] })
      .notNull()
      .default("operador"),
    activo: boolean("activo").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_usuario_supabase").on(table.supabaseId),
    index("idx_usuario_rut").on(table.rut),
  ]
);

// ============================================================================
// CAPA 3: ÓRDENES DE TRABAJO
// ============================================================================

export const ot = pgTable(
  "ot",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    codigo: text("codigo").notNull().unique(), // "OT-3001"
    tipoProductoId: uuid("tipo_producto_id")
      .notNull()
      .references(() => tipoProducto.id),
    cliente: text("cliente").notNull(),
    sku: text("sku"),
    metaUnidades: integer("meta_unidades"),
    estado: text("estado", {
      enum: ["pendiente", "en_proceso", "completada", "cancelada"],
    })
      .notNull()
      .default("pendiente"),
    fechaCreacion: timestamp("fecha_creacion", {
      withTimezone: true,
    }).defaultNow(),
    fechaInicio: timestamp("fecha_inicio", { withTimezone: true }),
    fechaTermino: timestamp("fecha_termino", { withTimezone: true }),
    notas: text("notas"),
  },
  (table) => [
    index("idx_ot_estado").on(table.estado),
    index("idx_ot_tipo_producto").on(table.tipoProductoId),
    index("idx_ot_codigo").on(table.codigo),
    index("idx_ot_fecha").on(table.fechaCreacion),
  ]
);

// ============================================================================
// CAPA 4: EJECUCIÓN
// ============================================================================

export const actividadOt = pgTable(
  "actividad_ot",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    otId: uuid("ot_id")
      .notNull()
      .references(() => ot.id),
    etapaId: uuid("etapa_id")
      .notNull()
      .references(() => etapa.id),
    // Referencia al paso específico del workflow (permite saber cuál de los N
    // "Troquelado" del workflow es este). NULL para actividades legacy.
    workflowEtapaId: uuid("workflow_etapa_id").references(() => workflowEtapa.id),
    maquinaId: text("maquina_id").references(() => maquina.id), // NULL para logística
    operadorId: uuid("operador_id").references(() => usuario.id),

    // Configuración de producción
    salidasPorGolpe: integer("salidas_por_golpe"),
    velocidadObjetivo: real("velocidad_objetivo"),

    // Timestamps clave
    horaInicio: timestamp("hora_inicio", { withTimezone: true })
      .notNull()
      .defaultNow(),
    horaInicioProduccion: timestamp("hora_inicio_produccion", {
      withTimezone: true,
    }), // post-warmup
    horaTermino: timestamp("hora_termino", { withTimezone: true }),

    // Métricas agregadas
    unidadesProducidas: integer("unidades_producidas").default(0),
    unidadesMerma: integer("unidades_merma").default(0),
    velocidadPromedio: real("velocidad_promedio"),
    velocidadMin: real("velocidad_min"),
    velocidadMax: real("velocidad_max"),
    desviacionEstandar: real("desviacion_estandar"),

    // Estado
    estado: text("estado", {
      enum: ["calentando", "produciendo", "pausada", "completada"],
    })
      .notNull()
      .default("calentando"),

    ordenEtapa: integer("orden_etapa"),
  },
  (table) => [
    // UNIQUE por OT + paso del workflow (no por etapa, porque puede repetirse)
    unique("uq_actividad_ot_wf_etapa").on(table.otId, table.workflowEtapaId),
    index("idx_actividad_ot_ot").on(table.otId),
    index("idx_actividad_ot_maquina").on(table.maquinaId),
    index("idx_actividad_ot_operador").on(table.operadorId),
    index("idx_actividad_ot_estado").on(table.estado),
    index("idx_actividad_ot_tiempo").on(table.horaInicio),
  ]
);

export const parada = pgTable(
  "parada",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actividadOtId: uuid("actividad_ot_id")
      .notNull()
      .references(() => actividadOt.id, { onDelete: "cascade" }),
    motivo: text("motivo").notNull(), // 'colacion', 'bano', 'ajuste_maquina', etc.
    detalle: text("detalle"),
    horaInicio: timestamp("hora_inicio", { withTimezone: true })
      .notNull()
      .defaultNow(),
    horaTermino: timestamp("hora_termino", { withTimezone: true }),
    duracionSegundos: integer("duracion_segundos"),
  },
  (table) => [
    index("idx_parada_actividad").on(table.actividadOtId),
    index("idx_parada_motivo").on(table.motivo),
  ]
);

// ============================================================================
// CAPA 5: LECTURAS DE MÁQUINA
// ============================================================================

export const lecturaMaquina = pgTable(
  "lectura_maquina",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    maquinaId: text("maquina_id")
      .notNull()
      .references(() => maquina.id),
    actividadOtId: uuid("actividad_ot_id").references(() => actividadOt.id),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    valor: real("valor").notNull().default(1), // 1 para golpes, metros para impresoras
    esMerma: boolean("es_merma").default(false),
  },
  (table) => [
    index("idx_lectura_maquina_ts").on(table.maquinaId, table.timestamp),
    index("idx_lectura_actividad").on(table.actividadOtId, table.timestamp),
  ]
);

export const lecturaPorMinuto = pgTable(
  "lectura_por_minuto",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    maquinaId: text("maquina_id")
      .notNull()
      .references(() => maquina.id),
    actividadOtId: uuid("actividad_ot_id").references(() => actividadOt.id),
    minuto: timestamp("minuto", { withTimezone: true }).notNull(),
    totalValor: real("total_valor").notNull(),
    conteoLecturas: integer("conteo_lecturas").notNull(),
    velocidad: real("velocidad").notNull(),
    esMerma: boolean("es_merma").default(false),
  },
  (table) => [
    unique("uq_lectura_minuto_maquina").on(table.maquinaId, table.minuto),
    index("idx_lectura_minuto_ts").on(table.maquinaId, table.minuto),
    index("idx_lectura_minuto_act").on(table.actividadOtId),
  ]
);

// ============================================================================
// CAPA 6: AUDITORÍA
// ============================================================================

export const escaneoBarras = pgTable("escaneo_barras", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipo: text("tipo", { enum: ["ot", "operador", "maquina"] }).notNull(),
  valorRaw: text("valor_raw").notNull(),
  entidadId: text("entidad_id"),
  resultado: text("resultado", {
    enum: ["ok", "error", "no_encontrado"],
  }).notNull(),
  errorDetalle: text("error_detalle"),
  maquinaId: text("maquina_id").references(() => maquina.id),
  usuarioId: uuid("usuario_id").references(() => usuario.id),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow(),
});

// ============================================================================
// RELACIONES (para queries con .with())
// ============================================================================

export const categoriaRelations = relations(categoria, ({ many }) => ({
  etapas: many(etapa),
}));

export const etapaRelations = relations(etapa, ({ one, many }) => ({
  categoria: one(categoria, {
    fields: [etapa.categoriaId],
    references: [categoria.id],
  }),
  maquinas: many(maquina),
  workflowEtapas: many(workflowEtapa),
  actividades: many(actividadOt),
}));

export const tipoProductoRelations = relations(tipoProducto, ({ many }) => ({
  workflowEtapas: many(workflowEtapa),
  ots: many(ot),
}));

export const workflowEtapaRelations = relations(
  workflowEtapa,
  ({ one, many }) => ({
    tipoProducto: one(tipoProducto, {
      fields: [workflowEtapa.tipoProductoId],
      references: [tipoProducto.id],
    }),
    etapa: one(etapa, {
      fields: [workflowEtapa.etapaId],
      references: [etapa.id],
    }),
    actividades: many(actividadOt),
  })
);

export const maquinaRelations = relations(maquina, ({ one, many }) => ({
  etapa: one(etapa, {
    fields: [maquina.etapaId],
    references: [etapa.id],
  }),
  actividades: many(actividadOt),
  lecturas: many(lecturaMaquina),
  lecturasPorMinuto: many(lecturaPorMinuto),
}));

export const usuarioRelations = relations(usuario, ({ many }) => ({
  actividades: many(actividadOt),
  escaneos: many(escaneoBarras),
}));

export const otRelations = relations(ot, ({ one, many }) => ({
  tipoProducto: one(tipoProducto, {
    fields: [ot.tipoProductoId],
    references: [tipoProducto.id],
  }),
  actividades: many(actividadOt),
}));

export const actividadOtRelations = relations(
  actividadOt,
  ({ one, many }) => ({
    ot: one(ot, {
      fields: [actividadOt.otId],
      references: [ot.id],
    }),
    etapa: one(etapa, {
      fields: [actividadOt.etapaId],
      references: [etapa.id],
    }),
    workflowEtapa: one(workflowEtapa, {
      fields: [actividadOt.workflowEtapaId],
      references: [workflowEtapa.id],
    }),
    maquina: one(maquina, {
      fields: [actividadOt.maquinaId],
      references: [maquina.id],
    }),
    operador: one(usuario, {
      fields: [actividadOt.operadorId],
      references: [usuario.id],
    }),
    paradas: many(parada),
    lecturas: many(lecturaMaquina),
    lecturasPorMinuto: many(lecturaPorMinuto),
  })
);

export const paradaRelations = relations(parada, ({ one }) => ({
  actividadOt: one(actividadOt, {
    fields: [parada.actividadOtId],
    references: [actividadOt.id],
  }),
}));

export const lecturaMaquinaRelations = relations(lecturaMaquina, ({ one }) => ({
  maquina: one(maquina, {
    fields: [lecturaMaquina.maquinaId],
    references: [maquina.id],
  }),
  actividadOt: one(actividadOt, {
    fields: [lecturaMaquina.actividadOtId],
    references: [actividadOt.id],
  }),
}));

export const lecturaPorMinutoRelations = relations(
  lecturaPorMinuto,
  ({ one }) => ({
    maquina: one(maquina, {
      fields: [lecturaPorMinuto.maquinaId],
      references: [maquina.id],
    }),
    actividadOt: one(actividadOt, {
      fields: [lecturaPorMinuto.actividadOtId],
      references: [actividadOt.id],
    }),
  })
);

export const escaneoBarrasRelations = relations(escaneoBarras, ({ one }) => ({
  maquina: one(maquina, {
    fields: [escaneoBarras.maquinaId],
    references: [maquina.id],
  }),
  usuario: one(usuario, {
    fields: [escaneoBarras.usuarioId],
    references: [usuario.id],
  }),
}));
