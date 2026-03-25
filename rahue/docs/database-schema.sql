-- ============================================================================
-- RAHUE - Modelo de Base de Datos v2.0 (Workflows Flexibles)
-- ============================================================================
-- Autenticación: Supabase Auth (externo)
-- Base de datos: PostgreSQL (Supabase o similar)
-- ============================================================================

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │  CAPA 1: CATÁLOGOS (configuración del sistema)                        │
-- └─────────────────────────────────────────────────────────────────────────┘

CREATE TABLE categoria (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          TEXT NOT NULL UNIQUE,
    descripcion     TEXT
);

-- Etapas del proceso productivo.
-- Cada etapa puede tener un tipo de métrica distinto:
--   - "golpes_min"   → Troqueladoras (golpes por minuto)
--   - "metros_min"   → Impresoras (metros por minuto)
--   - "unidades_min" → Formadoras (unidades por minuto)
--   - "logistica"    → Llegada, Tránsito, Entrega (sin métrica de máquina)
CREATE TABLE etapa (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          TEXT NOT NULL UNIQUE,
    descripcion     TEXT,
    categoria_id    UUID NOT NULL REFERENCES categoria(id),
    tipo_metrica    TEXT NOT NULL DEFAULT 'logistica'
                    CHECK (tipo_metrica IN ('golpes_min', 'metros_min', 'unidades_min', 'logistica')),
    unidad_display  TEXT,  -- "gpm", "m/min", "u/min", NULL para logística
    icono           TEXT   -- nombre de ícono para UI
    -- SIN orden_default: las etapas son bloques sin orden inherente.
    -- El orden lo define workflow_etapa.orden dentro de cada workflow.
);

-- 6 etapas predefinidas:
--   Llegada Materiales (logistica), Impresión (metros_min),
--   Troquelado (golpes_min), Formado (unidades_min),
--   Tránsito a Bodega (logistica), Entrega Cliente (logistica)
--
-- Se pueden agregar más etapas al catálogo según necesidad.
-- Las etapas son bloques sin orden inherente — el orden lo define cada workflow.


-- Tipo de producto = Workflow.
-- Define un flujo productivo (ej: "Cono" pasa por 6 etapas, "Tapas Troqueladas" por 5).
CREATE TABLE tipo_producto (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre          TEXT NOT NULL UNIQUE,
    descripcion     TEXT,
    color           TEXT DEFAULT 'indigo',  -- color clave para UI
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);


-- Pasos que componen el workflow de cada tipo de producto (y en qué orden).
-- NOTA: Una misma etapa PUEDE repetirse dentro de un workflow (ej: doble troquelado).
-- El campo nombre_paso permite diferenciarlas: "Troquelado 1", "Troquelado 2 (repase)".
CREATE TABLE workflow_etapa (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_producto_id  UUID NOT NULL REFERENCES tipo_producto(id) ON DELETE CASCADE,
    etapa_id          UUID NOT NULL REFERENCES etapa(id) ON DELETE RESTRICT,
    orden             INT NOT NULL,
    nombre_paso       TEXT,             -- nombre personalizado (NULL = usa nombre de etapa)
    requiere_maquina  BOOLEAN DEFAULT FALSE,

    -- NO hay UNIQUE(tipo_producto_id, etapa_id) → una etapa puede repetirse
    UNIQUE(tipo_producto_id, orden)
);

CREATE INDEX idx_workflow_etapa_producto ON workflow_etapa(tipo_producto_id, orden);


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │  CAPA 2: RECURSOS (máquinas, usuarios)                                │
-- └─────────────────────────────────────────────────────────────────────────┘

-- Máquinas físicas de la planta.
-- Cada máquina pertenece a UNA etapa (ej: "Troquelado 4" → etapa Troquelado).
-- El tipo_metrica se HEREDA de la etapa, pero se almacena aquí para
-- performance (evitar JOIN en lecturas de alta frecuencia).
CREATE TABLE maquina (
    id              TEXT PRIMARY KEY,        -- "troquel-4", "impresion-1", etc.
    nombre          TEXT NOT NULL,           -- "Troquelado 4" (display)
    etapa_id        UUID NOT NULL REFERENCES etapa(id),
    tipo_metrica    TEXT NOT NULL,           -- heredado de etapa
    unidad_metrica  TEXT,                    -- heredado de etapa
    activa          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_maquina_etapa ON maquina(etapa_id);


-- Usuarios del sistema.
-- La autenticación la maneja Supabase Auth. Aquí guardamos el perfil operativo.
-- Roles:
--   - "admin"      → acceso total, configuración de workflows
--   - "supervisor"  → vista de gestión, historial, dashboard
--   - "operador"   → vista de operador, escaneo de OT, control de máquina
CREATE TABLE usuario (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_id     TEXT UNIQUE NOT NULL,    -- sub de Supabase Auth
    nombre          TEXT NOT NULL,
    email           TEXT,
    rut             TEXT UNIQUE,             -- para escaneo de credencial
    rol             TEXT NOT NULL DEFAULT 'operador'
                    CHECK (rol IN ('admin', 'supervisor', 'operador')),
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_usuario_supabase ON usuario(supabase_id);
CREATE INDEX idx_usuario_rut ON usuario(rut);


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │  CAPA 3: ÓRDENES DE TRABAJO (el corazón del sistema)                  │
-- └─────────────────────────────────────────────────────────────────────────┘

-- Orden de Trabajo (OT).
-- Representa un pedido de producción de un cliente.
-- La OT se crea ANTES de iniciar producción (puede estar pendiente).
-- Su workflow (flujo de etapas) viene determinado por el tipo_producto.
CREATE TABLE ot (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo              TEXT NOT NULL UNIQUE,    -- "OT-3001" (el que se escanea)
    tipo_producto_id    UUID NOT NULL REFERENCES tipo_producto(id),
    cliente             TEXT NOT NULL,
    sku                 TEXT,
    meta_unidades       INT,                    -- unidades objetivo
    estado              TEXT NOT NULL DEFAULT 'sin_comenzar'
                        CHECK (estado IN ('sin_comenzar', 'en_proceso', 'esperando', 'historial', 'cancelada')),
    fecha_creacion      TIMESTAMPTZ DEFAULT now(),
    fecha_inicio        TIMESTAMPTZ,            -- cuando se empezó a producir
    fecha_termino       TIMESTAMPTZ,            -- cuando se completó
    notas               TEXT
);

CREATE INDEX idx_ot_estado ON ot(estado);
CREATE INDEX idx_ot_tipo_producto ON ot(tipo_producto_id);
CREATE INDEX idx_ot_codigo ON ot(codigo);
CREATE INDEX idx_ot_fecha ON ot(fecha_creacion DESC);


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │  CAPA 4: EJECUCIÓN (la actividad real en planta)                      │
-- └─────────────────────────────────────────────────────────────────────────┘

-- Actividad de OT: un registro por cada vez que una OT pasa por una etapa.
-- Es el registro central de ejecución.
--
-- Flujo de estados:
--   calentando → produciendo → completada
--                    ↕
--                 pausada
--
-- La fase de "calentando" (warmup/merma) es el inicio donde la máquina
-- aún no produce producto bueno. Las lecturas durante esta fase se marcan
-- como merma.
CREATE TABLE actividad_ot (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ot_id                   UUID NOT NULL REFERENCES ot(id),
    etapa_id                UUID NOT NULL REFERENCES etapa(id),
    workflow_etapa_id       UUID REFERENCES workflow_etapa(id),  -- paso específico del workflow
    maquina_id              TEXT REFERENCES maquina(id),         -- NULL para etapas logísticas
    operador_id             UUID REFERENCES usuario(id),         -- quién operó

    -- Configuración de producción para esta actividad
    salidas_por_golpe       INT,            -- relevante para troqueladoras
    velocidad_objetivo      FLOAT,          -- velocidad meta de la máquina

    -- Timestamps clave
    hora_inicio             TIMESTAMPTZ NOT NULL DEFAULT now(),  -- inicio de warmup
    hora_inicio_produccion  TIMESTAMPTZ,    -- inicio de producción real (post-warmup)
    hora_termino            TIMESTAMPTZ,    -- fin de la actividad

    -- Métricas agregadas (se calculan y actualizan durante/al final)
    unidades_producidas     INT DEFAULT 0,
    unidades_merma          INT DEFAULT 0,  -- unidades del warmup
    velocidad_promedio      FLOAT,
    velocidad_min           FLOAT,
    velocidad_max           FLOAT,
    desviacion_estandar     FLOAT,

    -- Estado actual
    estado                  TEXT NOT NULL DEFAULT 'calentando'
                            CHECK (estado IN ('calentando', 'produciendo', 'pausada', 'completada')),

    -- Orden dentro del workflow (1, 2, 3...)
    orden_etapa             INT,

    -- UNIQUE por paso de workflow, NO por etapa (la etapa puede repetirse)
    UNIQUE(ot_id, workflow_etapa_id)
);

CREATE INDEX idx_actividad_ot_ot ON actividad_ot(ot_id);
CREATE INDEX idx_actividad_ot_maquina ON actividad_ot(maquina_id);
CREATE INDEX idx_actividad_ot_operador ON actividad_ot(operador_id);
CREATE INDEX idx_actividad_ot_estado ON actividad_ot(estado);
CREATE INDEX idx_actividad_ot_tiempo ON actividad_ot(hora_inicio DESC);


-- Paradas: cada vez que se pausa una actividad.
-- Se registra el motivo y la duración.
CREATE TABLE parada (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actividad_ot_id     UUID NOT NULL REFERENCES actividad_ot(id) ON DELETE CASCADE,
    motivo              TEXT NOT NULL,       -- 'colacion', 'bano', 'ajuste_maquina', etc.
    detalle             TEXT,                -- detalle adicional (si motivo = 'otro')
    hora_inicio         TIMESTAMPTZ NOT NULL DEFAULT now(),
    hora_termino        TIMESTAMPTZ,
    duracion_segundos   INT                 -- calculado al terminar
);

CREATE INDEX idx_parada_actividad ON parada(actividad_ot_id);
CREATE INDEX idx_parada_motivo ON parada(motivo);


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │  CAPA 5: LECTURAS DE MÁQUINA (agregadas por minuto)                   │
-- └─────────────────────────────────────────────────────────────────────────┘

-- Lecturas agregadas por minuto.
-- Cada fila = un minuto de actividad en una máquina.
-- conteo_lecturas = la velocidad por minuto (golpes/min, metros/min, unidades/min).
-- La velocidad y el total_valor se calculan on-the-fly a partir de conteo_lecturas
-- y el timestamp del minuto, junto con la unidad de medida de la máquina/etapa.
CREATE TABLE lectura_por_minuto (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maquina_id          TEXT NOT NULL REFERENCES maquina(id),
    actividad_ot_id     UUID REFERENCES actividad_ot(id),
    minuto              TIMESTAMPTZ NOT NULL,    -- timestamp truncado al minuto
    conteo_lecturas     INT NOT NULL,            -- lecturas en ese minuto (= velocidad)
    es_merma            BOOLEAN DEFAULT FALSE,

    UNIQUE(maquina_id, minuto)
);

CREATE INDEX idx_lectura_minuto_ts ON lectura_por_minuto(maquina_id, minuto DESC);
CREATE INDEX idx_lectura_minuto_act ON lectura_por_minuto(actividad_ot_id);


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │  CAPA 6: CÓDIGO DE BARRAS (configuración de escaneo)                  │
-- └─────────────────────────────────────────────────────────────────────────┘

-- Registro de escaneos de códigos de barras.
-- Útil para auditoría y troubleshooting.
CREATE TABLE escaneo_barras (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo            TEXT NOT NULL CHECK (tipo IN ('ot', 'operador', 'maquina')),
    valor_raw       TEXT NOT NULL,           -- contenido crudo del código
    entidad_id      TEXT,                    -- ID de la entidad resuelta (OT, usuario, máquina)
    resultado       TEXT NOT NULL CHECK (resultado IN ('ok', 'error', 'no_encontrado')),
    error_detalle   TEXT,
    maquina_id      TEXT REFERENCES maquina(id),
    usuario_id      UUID REFERENCES usuario(id),
    timestamp       TIMESTAMPTZ DEFAULT now()
);


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │  VISTAS ÚTILES                                                        │
-- └─────────────────────────────────────────────────────────────────────────┘

-- Vista: Resumen de OT con su workflow
CREATE VIEW v_ot_resumen AS
SELECT
    o.id,
    o.codigo,
    o.cliente,
    o.sku,
    o.estado,
    o.meta_unidades,
    o.fecha_creacion,
    o.fecha_inicio,
    o.fecha_termino,
    tp.nombre AS tipo_producto,
    tp.color AS tipo_producto_color,
    -- Progreso: cuántas etapas completadas vs total
    (SELECT COUNT(*) FROM actividad_ot a WHERE a.ot_id = o.id AND a.estado = 'completada')
        AS etapas_completadas,
    (SELECT COUNT(*) FROM workflow_etapa we WHERE we.tipo_producto_id = o.tipo_producto_id)
        AS etapas_totales,
    -- Unidades producidas (última actividad de máquina)
    (SELECT COALESCE(SUM(a.unidades_producidas), 0) FROM actividad_ot a WHERE a.ot_id = o.id)
        AS unidades_producidas_total
FROM ot o
JOIN tipo_producto tp ON tp.id = o.tipo_producto_id;


-- Vista: Actividad en curso (para dashboard en vivo)
CREATE VIEW v_actividad_en_curso AS
SELECT
    a.id AS actividad_id,
    o.codigo AS ot_codigo,
    o.cliente,
    tp.nombre AS tipo_producto,
    e.nombre AS etapa_nombre,
    e.tipo_metrica,
    m.nombre AS maquina_nombre,
    m.id AS maquina_id,
    u.nombre AS operador_nombre,
    a.estado,
    a.hora_inicio,
    a.hora_inicio_produccion,
    a.unidades_producidas,
    a.unidades_merma,
    a.velocidad_promedio,
    a.salidas_por_golpe
FROM actividad_ot a
JOIN ot o ON o.id = a.ot_id
JOIN tipo_producto tp ON tp.id = o.tipo_producto_id
JOIN etapa e ON e.id = a.etapa_id
LEFT JOIN maquina m ON m.id = a.maquina_id
LEFT JOIN usuario u ON u.id = a.operador_id
WHERE a.estado IN ('calentando', 'produciendo', 'pausada');


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │  NOTAS DE DISEÑO                                                      │
-- └─────────────────────────────────────────────────────────────────────────┘
--
-- 1. SUPABASE AUTH
--    - La tabla `usuario` se sincroniza desde Supabase Auth.
--    - El campo `supabase_id` es el identificador principal para autenticación.
--    - El campo `rut` permite identificar operadores vía escaneo de credencial.
--
-- 2. MÉTRICAS POR TIPO DE MÁQUINA
--    - Troqueladoras: 1 lectura = 1 golpe. Velocidad = golpes/min.
--    - Impresoras: lecturas periódicas de metros avanzados. Velocidad = m/min.
--    - Formadoras: lecturas periódicas de unidades. Velocidad = u/min.
--    - Logística: sin lecturas de máquina, solo timestamps.
--
-- 3. WARMUP / MERMA
--    - Al iniciar una actividad_ot, el estado es 'calentando'.
--    - Las lecturas durante warmup tienen es_merma = TRUE.
--    - El operador marca el inicio de producción real → estado = 'produciendo'.
--    - Las unidades de merma se calculan como la suma de lecturas con es_merma = TRUE.
--
-- 4. ESCALABILIDAD
--    - lectura_por_minuto: una fila por minuto por máquina.
--    - Considerar particionamiento por mes si el volumen crece.
--    - Considerar TimescaleDB si el volumen de lecturas es muy alto.
--
-- 5. WORKFLOWS
--    - Un tipo_producto define el flujo (workflow) como secuencia ordenada de etapas.
--    - Al crear una OT, se hereda el workflow del tipo_producto.
--    - Los workflows se pueden editar sin afectar OTs ya creadas (las OTs activas
--      siguen el workflow que tenían al momento de su creación).
--
-- ============================================================================
