CREATE TABLE "actividad_ot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ot_id" uuid NOT NULL,
	"etapa_id" uuid NOT NULL,
	"workflow_etapa_id" uuid,
	"maquina_id" text,
	"operador_id" uuid,
	"salidas_por_golpe" integer,
	"velocidad_objetivo" real,
	"hora_inicio" timestamp with time zone DEFAULT now() NOT NULL,
	"hora_inicio_produccion" timestamp with time zone,
	"hora_termino" timestamp with time zone,
	"unidades_producidas" integer DEFAULT 0,
	"unidades_merma" integer DEFAULT 0,
	"velocidad_promedio" real,
	"velocidad_min" real,
	"velocidad_max" real,
	"desviacion_estandar" real,
	"estado" text DEFAULT 'calentando' NOT NULL,
	"orden_etapa" integer,
	CONSTRAINT "uq_actividad_ot_wf_etapa" UNIQUE("ot_id","workflow_etapa_id")
);
--> statement-breakpoint
CREATE TABLE "escaneo_barras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" text NOT NULL,
	"valor_raw" text NOT NULL,
	"entidad_id" text,
	"resultado" text NOT NULL,
	"error_detalle" text,
	"maquina_id" text,
	"usuario_id" uuid,
	"timestamp" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "etapa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"categoria" text DEFAULT 'otro' NOT NULL,
	"tipo_metrica" text DEFAULT 'logistica' NOT NULL,
	"unidad_display" text,
	"icono" text,
	CONSTRAINT "etapa_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "lectura_maquina" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"maquina_id" text NOT NULL,
	"actividad_ot_id" uuid,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"valor" real DEFAULT 1 NOT NULL,
	"es_merma" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "lectura_por_minuto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"maquina_id" text NOT NULL,
	"actividad_ot_id" uuid,
	"minuto" timestamp with time zone NOT NULL,
	"total_valor" real NOT NULL,
	"conteo_lecturas" integer NOT NULL,
	"velocidad" real NOT NULL,
	"es_merma" boolean DEFAULT false,
	CONSTRAINT "uq_lectura_minuto_maquina" UNIQUE("maquina_id","minuto")
);
--> statement-breakpoint
CREATE TABLE "maquina" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"etapa_id" uuid NOT NULL,
	"tipo_metrica" text NOT NULL,
	"unidad_metrica" text,
	"activa" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"tipo_producto_id" uuid NOT NULL,
	"cliente" text NOT NULL,
	"sku" text,
	"meta_unidades" integer,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"fecha_creacion" timestamp with time zone DEFAULT now(),
	"fecha_inicio" timestamp with time zone,
	"fecha_termino" timestamp with time zone,
	"notas" text,
	"etapa_actual" text,
	CONSTRAINT "ot_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "parada" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actividad_ot_id" uuid NOT NULL,
	"motivo" text NOT NULL,
	"detalle" text,
	"hora_inicio" timestamp with time zone DEFAULT now() NOT NULL,
	"hora_termino" timestamp with time zone,
	"duracion_segundos" integer
);
--> statement-breakpoint
CREATE TABLE "tipo_producto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"color" text DEFAULT 'indigo',
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "tipo_producto_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "usuario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supabase_id" text NOT NULL,
	"nombre" text NOT NULL,
	"email" text,
	"rut" text,
	"rol" text DEFAULT 'operador' NOT NULL,
	"activo" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "usuario_supabase_id_unique" UNIQUE("supabase_id"),
	CONSTRAINT "usuario_rut_unique" UNIQUE("rut")
);
--> statement-breakpoint
CREATE TABLE "workflow_etapa" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo_producto_id" uuid NOT NULL,
	"etapa_id" uuid NOT NULL,
	"orden" integer NOT NULL,
	"nombre_paso" text,
	"requiere_maquina" boolean DEFAULT false,
	CONSTRAINT "uq_workflow_etapa_producto_orden" UNIQUE("tipo_producto_id","orden")
);
--> statement-breakpoint
ALTER TABLE "actividad_ot" ADD CONSTRAINT "actividad_ot_ot_id_ot_id_fk" FOREIGN KEY ("ot_id") REFERENCES "public"."ot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_ot" ADD CONSTRAINT "actividad_ot_etapa_id_etapa_id_fk" FOREIGN KEY ("etapa_id") REFERENCES "public"."etapa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_ot" ADD CONSTRAINT "actividad_ot_workflow_etapa_id_workflow_etapa_id_fk" FOREIGN KEY ("workflow_etapa_id") REFERENCES "public"."workflow_etapa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_ot" ADD CONSTRAINT "actividad_ot_maquina_id_maquina_id_fk" FOREIGN KEY ("maquina_id") REFERENCES "public"."maquina"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "actividad_ot" ADD CONSTRAINT "actividad_ot_operador_id_usuario_id_fk" FOREIGN KEY ("operador_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escaneo_barras" ADD CONSTRAINT "escaneo_barras_maquina_id_maquina_id_fk" FOREIGN KEY ("maquina_id") REFERENCES "public"."maquina"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escaneo_barras" ADD CONSTRAINT "escaneo_barras_usuario_id_usuario_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectura_maquina" ADD CONSTRAINT "lectura_maquina_maquina_id_maquina_id_fk" FOREIGN KEY ("maquina_id") REFERENCES "public"."maquina"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectura_maquina" ADD CONSTRAINT "lectura_maquina_actividad_ot_id_actividad_ot_id_fk" FOREIGN KEY ("actividad_ot_id") REFERENCES "public"."actividad_ot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectura_por_minuto" ADD CONSTRAINT "lectura_por_minuto_maquina_id_maquina_id_fk" FOREIGN KEY ("maquina_id") REFERENCES "public"."maquina"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lectura_por_minuto" ADD CONSTRAINT "lectura_por_minuto_actividad_ot_id_actividad_ot_id_fk" FOREIGN KEY ("actividad_ot_id") REFERENCES "public"."actividad_ot"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maquina" ADD CONSTRAINT "maquina_etapa_id_etapa_id_fk" FOREIGN KEY ("etapa_id") REFERENCES "public"."etapa"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ot" ADD CONSTRAINT "ot_tipo_producto_id_tipo_producto_id_fk" FOREIGN KEY ("tipo_producto_id") REFERENCES "public"."tipo_producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parada" ADD CONSTRAINT "parada_actividad_ot_id_actividad_ot_id_fk" FOREIGN KEY ("actividad_ot_id") REFERENCES "public"."actividad_ot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_etapa" ADD CONSTRAINT "workflow_etapa_tipo_producto_id_tipo_producto_id_fk" FOREIGN KEY ("tipo_producto_id") REFERENCES "public"."tipo_producto"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_etapa" ADD CONSTRAINT "workflow_etapa_etapa_id_etapa_id_fk" FOREIGN KEY ("etapa_id") REFERENCES "public"."etapa"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_actividad_ot_ot" ON "actividad_ot" USING btree ("ot_id");--> statement-breakpoint
CREATE INDEX "idx_actividad_ot_maquina" ON "actividad_ot" USING btree ("maquina_id");--> statement-breakpoint
CREATE INDEX "idx_actividad_ot_operador" ON "actividad_ot" USING btree ("operador_id");--> statement-breakpoint
CREATE INDEX "idx_actividad_ot_estado" ON "actividad_ot" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "idx_actividad_ot_tiempo" ON "actividad_ot" USING btree ("hora_inicio");--> statement-breakpoint
CREATE INDEX "idx_lectura_maquina_ts" ON "lectura_maquina" USING btree ("maquina_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_lectura_actividad" ON "lectura_maquina" USING btree ("actividad_ot_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_lectura_minuto_ts" ON "lectura_por_minuto" USING btree ("maquina_id","minuto");--> statement-breakpoint
CREATE INDEX "idx_lectura_minuto_act" ON "lectura_por_minuto" USING btree ("actividad_ot_id");--> statement-breakpoint
CREATE INDEX "idx_maquina_etapa" ON "maquina" USING btree ("etapa_id");--> statement-breakpoint
CREATE INDEX "idx_ot_estado" ON "ot" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "idx_ot_tipo_producto" ON "ot" USING btree ("tipo_producto_id");--> statement-breakpoint
CREATE INDEX "idx_ot_codigo" ON "ot" USING btree ("codigo");--> statement-breakpoint
CREATE INDEX "idx_ot_fecha" ON "ot" USING btree ("fecha_creacion");--> statement-breakpoint
CREATE INDEX "idx_parada_actividad" ON "parada" USING btree ("actividad_ot_id");--> statement-breakpoint
CREATE INDEX "idx_parada_motivo" ON "parada" USING btree ("motivo");--> statement-breakpoint
CREATE INDEX "idx_usuario_supabase" ON "usuario" USING btree ("supabase_id");--> statement-breakpoint
CREATE INDEX "idx_usuario_rut" ON "usuario" USING btree ("rut");--> statement-breakpoint
CREATE INDEX "idx_workflow_etapa_producto" ON "workflow_etapa" USING btree ("tipo_producto_id","orden");