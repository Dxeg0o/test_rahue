# RAHUE - Modelo de Base de Datos

## Resumen

El modelo se organiza en **5 capas** lógicas:

| Capa | Tablas | Propósito |
|------|--------|-----------|
| 1. Catálogos | `etapa`, `tipo_producto`, `workflow_etapa` | Configuración de flujos productivos |
| 2. Recursos | `maquina`, `usuario` | Máquinas de planta + operadores (Auth0) |
| 3. Órdenes | `ot` | Órdenes de trabajo |
| 4. Ejecución | `actividad_ot`, `parada` | Registro de producción en vivo |
| 5. Lecturas | `lectura_maquina`, `lectura_por_minuto` | Datos de alta frecuencia de sensores |

Tabla auxiliar: `escaneo_barras` (auditoría de escaneos de código de barras).

---

## Diagrama ER

Archivo Excalidraw: [`database-model.excalidraw`](./database-model.excalidraw)

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│     etapa        │───▶│  workflow_etapa   │◀───│  tipo_producto   │
│                  │    │                  │    │                  │
│ nombre           │    │ tipo_producto_id │    │ nombre           │
│ tipo_metrica     │    │ etapa_id         │    │ descripcion      │
│ unidad_display   │    │ orden            │    │ color            │
└───────┬──────────┘    └──────────────────┘    └────────┬─────────┘
        │                                                │
        ▼                                                ▼
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│    maquina       │    │     usuario       │    │       ot         │
│                  │    │    (Auth0)        │    │                  │
│ etapa_id     FK  │    │ auth0_id         │    │ tipo_producto_id │
│ tipo_metrica     │    │ nombre           │    │ codigo (escaneo) │
│ unidad_metrica   │    │ rut (escaneo)    │    │ cliente          │
│                  │    │ rol              │    │ meta_unidades    │
└───────┬──────────┘    └────────┬─────────┘    │ estado           │
        │                        │              └────────┬─────────┘
        │                        │                       │
        ▼                        ▼                       ▼
        └────────────────┬───────┘    ┌──────────────────┘
                         ▼            ▼
                ┌─────────────────────────┐
                │      actividad_ot        │
                │                         │
                │ ot_id              FK   │
                │ etapa_id           FK   │
                │ maquina_id         FK   │
                │ operador_id        FK   │
                │ salidas_por_golpe       │
                │ hora_inicio             │
                │ hora_inicio_produccion  │  ← warmup → producción
                │ hora_termino            │
                │ unidades_producidas     │
                │ unidades_merma          │
                │ estado                  │
                └───────────┬─────────────┘
                    ┌───────┴───────┐
                    ▼               ▼
          ┌──────────────┐  ┌────────────────┐  ┌─────────────────┐
          │   parada      │  │lectura_maquina │  │lectura_por_min  │
          │               │  │                │  │  (agregada)     │
          │ motivo        │  │ maquina_id  FK │  │                 │
          │ hora_inicio   │  │ timestamp      │  │ velocidad       │
          │ hora_termino  │  │ valor          │  │ total_valor     │
          │ duracion_seg  │  │ es_merma       │  │ minuto          │
          └───────────────┘  └────────────────┘  └─────────────────┘
```

---

## Decisiones de Diseño Clave

### 1. Métricas por tipo de máquina

**Problema:** Tu modelo original tenía una tabla `golpes` que solo servía para troqueladoras. Impresoras miden metros/minuto y formadoras miden unidades/minuto.

**Solución:** La tabla `lectura_maquina` es **genérica**:

| Tipo de máquina | `valor` representa | `tipo_metrica` en etapa |
|-----------------|-------------------|------------------------|
| Troqueladora | 1 golpe | `golpes_min` |
| Impresora | metros avanzados | `metros_min` |
| Formadora | unidades formadas | `unidades_min` |
| Logística | N/A (sin lecturas) | `logistica` |

La máquina hereda su `tipo_metrica` de la etapa a la que pertenece. Esto permite que el frontend muestre la unidad correcta ("gpm", "m/min", etc.) sin lógica condicional compleja.

### 2. Workflows (lo que faltaba)

El modelo anterior no tenía workflows. Ahora:

- `tipo_producto` = un workflow con nombre (ej: "Cono", "Tapas")
- `workflow_etapa` = las etapas en orden para ese workflow
- Cada `ot` referencia un `tipo_producto`, heredando su flujo

Ejemplo:
```
tipo_producto: "Cono"
workflow_etapa:
  1. Llegada Materiales
  2. Impresión
  3. Troquelado
  4. Formado
  5. Tránsito a Bodega
  6. Entrega Cliente

tipo_producto: "Tapas Troqueladas"
workflow_etapa:
  1. Llegada Materiales
  2. Impresión
  3. Troquelado
  4. Tránsito a Bodega    ← sin Formado
  5. Entrega Cliente
```

### 3. Warmup / Merma (inicio de procesamiento)

El flujo de una `actividad_ot`:

```
[INICIO] → estado: "calentando"
              │
              │  máquina generando lecturas con es_merma = TRUE
              │
              ▼
         operador presiona "Iniciar Producción Real"
              │
              ▼
         estado: "produciendo"
              │
              │  lecturas con es_merma = FALSE
              │
              ├──▶ [PAUSA] → se crea registro en tabla `parada`
              │       │
              │       ▼
              │    [REANUDAR] → estado vuelve a "produciendo"
              │
              ▼
         [TERMINAR] → estado: "completada"
```

### 4. Auth0

- **NO** almacenamos contraseñas ni tokens en nuestra BD.
- La tabla `usuario` es un **perfil operativo** sincronizado desde Auth0.
- El campo `auth0_id` (ej: `auth0|abc123`) vincula con Auth0.
- El campo `rut` permite identificar operadores por escaneo de credencial.
- Roles (`admin`, `supervisor`, `operador`) se manejan en nuestra BD (o en Auth0 metadata).

### 5. Código de barras

El escaneo de OT ya funciona en el operador. El modelo soporta esto:
- La `ot.codigo` ("OT-3001") es lo que se escanea.
- `escaneo_barras` registra cada escaneo para auditoría.
- El contenido del código puede incluir metadata: `OT-3001|8|50000` (código|salidas|meta).

### 6. Escalabilidad de lecturas

`lectura_maquina` es la tabla que más crece (potencialmente millones de filas/día con troqueladoras a 350 gpm). Estrategias:

- **Particionamiento por mes** en PostgreSQL
- **Agregación a `lectura_por_minuto`** para dashboards (cron cada 60s)
- **Retención**: lecturas individuales > 90 días → archivar/eliminar
- **TimescaleDB** como opción si el volumen es extremo

---

## Qué cambió vs tu modelo original

| Tu modelo | Modelo nuevo | Por qué |
|-----------|-------------|---------|
| `golpes` (solo troqueladoras) | `lectura_maquina` (genérica) | Soporta todos los tipos de máquina |
| Sin workflows | `tipo_producto` + `workflow_etapa` | Define flujos por producto |
| Sin usuarios | `usuario` (Auth0) | Operadores, supervisores, admin |
| `maquina` (id, tipo) | `maquina` (id, nombre, etapa_id, tipo_metrica) | Más contexto por máquina |
| Sin paradas | `parada` | Registro detallado de pausas |
| Sin merma/warmup | `actividad_ot.hora_inicio_produccion` + `es_merma` | Tracking de merma |
| Sin auditoría de escaneos | `escaneo_barras` | Trazabilidad completa |
| Sin agregaciones | `lectura_por_minuto` | Performance en dashboards |

---

## Tablas totales: 10

1. `etapa` - catálogo de etapas productivas
2. `tipo_producto` - workflows / tipos de producto
3. `workflow_etapa` - etapas por workflow (junction)
4. `maquina` - máquinas de planta
5. `usuario` - perfiles operativos (Auth0)
6. `ot` - órdenes de trabajo
7. `actividad_ot` - ejecución en planta
8. `parada` - pausas/paradas
9. `lectura_maquina` - lecturas de sensores (alta frecuencia)
10. `lectura_por_minuto` - agregación para dashboards
11. `escaneo_barras` - auditoría de escaneos (auxiliar)
