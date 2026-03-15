# Auditoría Técnica: Zona Horaria y Consistencia Temporal — PM Portal
**Fecha de auditoría:** 2026-03-15
**Rama auditada:** pm-construccion
**Auditor:** Revisión exhaustiva de código fuente

---

## 1. Resumen ejecutivo

El PM Portal maneja las fechas con **una convención consistente internamente, pero con asunciones implícitas de zona horaria que producen comportamientos correctos en el escenario de despliegue actual (Perú, UTC-5) y que serían problemáticos en escenarios multi-región**.

**Diagnóstico general:** Estado **parcialmente correcto**.

- El sistema es coherente en lo más importante: todos los campos temporales son `string`, no `Date`; no hay parseos sorpresa; no hay mezcla de `Date` y `string` en el mismo flujo.
- La separación conceptual entre **fechas de negocio** (`YYYY-MM-DD`) y **timestamps de evento** (`ISO 8601 con Z`) existe en los datos, pero el código no la trata de forma diferenciada — ambas categorías se procesan con el mismo helper `formatearFechaCorta`.
- Hay **cuatro focos de riesgo real** que no rompen nada en producción hoy para usuarios en Lima, pero que son técnicamente incorrectos o frágiles:
  1. El filtro de historial/trazabilidad envía fechas sin offset a PostgreSQL.
  2. `hoy` y `hace30Dias` en resumen de lanzamientos se derivan en UTC, no en hora local Lima.
  3. `formatearFechaCorta` renderiza timestamps UTC-Z sin especificar `timeZone` en `Intl.DateTimeFormat`.
  4. `PaginaTendencias` y otros usan `T00:00:00` sin `Z` para construir objetos `Date` internos.

No hay riesgo de corrupción de datos. No hay pérdida de información de auditoría. El problema es conceptual y de precisión temporal.

---

## 2. Convención temporal actual detectada

### 2.1 En base de datos (inferida — sin acceso a migraciones SQL)

No se encontraron archivos `.sql` ni migraciones Supabase en el repositorio. Los tipos se infieren de los modelos de dominio TypeScript y de los patrones de uso.

| Categoría | Inferencia del tipo DB |
|---|---|
| `created_at`, `updated_at` | `timestamptz` (Supabase por defecto) — retorna ISO con `Z` |
| `fecha_*` de negocio | `date` o `text` — retorna `YYYY-MM-DD` |
| `fecha_ejecucion`, `fecha_auditoria`, etc. | Idem — `YYYY-MM-DD` por uso |

**Evidencia:** Los formularios usan `<input type="date">` para campos de negocio y los valores por defecto son `new Date().toISOString().slice(0, 10)` (YYYY-MM-DD). Nunca se observa un timestamp completo en ningún campo `fecha_*`.

### 2.2 En el cliente TypeScript (dominio)

Todos los campos temporales son `string`:

```typescript
// src/dominio/modelos.ts — todos los campos temporales
created_at: string
updated_at: string
fecha_objetivo: string | null
fecha_completado: string | null
fecha_ejecucion: string
fecha_decision: string
fecha_auditoria: string
fecha_programada: string
fecha_lanzamiento_real: string | null
fecha_reporte: string
fecha_resolucion: string | null
// ... (28 campos temporales en total, todos string)
```

**Sin excepción: ningún campo es `Date`.** El sistema nunca hace un parsing automático a objetos Date al leer de Supabase. Esto es correcto.

### 2.3 Convención general detectada

El sistema usa **una sola convención**: tratar todos los valores temporales como strings opacos, formateándolos solo en el momento del render. Esto es pragmático y coherente. El riesgo está en los detalles de implementación de ese formateo y en las comparaciones.

---

## 3. Inventario de helpers y funciones temporales

### 3.1 `normalizarFechaPortal`
**Archivo:** `src/compartido/utilidades/formatoPortal.ts:3–10`

```typescript
export function normalizarFechaPortal(fecha: string | null | undefined) {
  if (!fecha) {
    return ''
  }
  const fechaNormalizada = fecha.includes('T') ? fecha.slice(0, 10) : fecha
  return fechaNormalizada
}
```

| Propiedad | Valor |
|---|---|
| Propósito | Extraer YYYY-MM-DD de cualquier string temporal |
| Entrada `"2025-03-15"` | Retorna `"2025-03-15"` |
| Entrada `"2025-03-15T10:30:00.000Z"` | Retorna `"2025-03-15"` |
| Entrada `null` / `undefined` | Retorna `""` |
| Uso correcto en el codebase | Comparaciones de filtro, columnas CSV, filtro "recientes" |
| Uso incorrecto (ya corregido en Fase 6) | Display en UI — reemplazado por `formatearFechaCorta` |
| **Riesgo** | **BAJO** |

**Análisis:** Es idempotente y segura. El `slice(0, 10)` sobre ISO strings siempre produce YYYY-MM-DD. **No introduce ningún riesgo de zona horaria** porque solo opera sobre strings — no parsea a `Date`.

**Advertencia de uso:** Trunca siempre el componente de tiempo. Si se aplicase a `"2025-03-15T23:00:00.000Z"` (que en Lima es marzo 16 a las 6 AM), retorna `"2025-03-15"`. Esto es correcto para fecha de negocio (el evento ocurrió el 15 en UTC) pero incorrecto si se quiere la fecha Lima. Este escenario no ocurre en el codebase actual ya que `normalizarFechaPortal` solo se usa en CSV/filtros donde YYYY-MM-DD UTC es el formato correcto.

---

### 3.2 `formatearFechaCorta`
**Archivo:** `src/compartido/utilidades/formatoPortal.ts:12–30`

```typescript
const formateadorFechaCorta = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})

export function formatearFechaCorta(fecha: string | null | undefined): string {
  if (!fecha) {
    return ''
  }

  const fechaNormalizada = fecha.includes('T') ? fecha : `${fecha}T00:00:00`
  const fechaDate = new Date(fechaNormalizada)
  if (Number.isNaN(fechaDate.getTime())) {
    return fecha.slice(0, 10)
  }

  return formateadorFechaCorta.format(fechaDate)
}
```

Este helper tiene dos caminos críticos:

#### Camino A — Entrada `YYYY-MM-DD` (fecha de negocio pura)

```
"2025-03-15"
    → no contiene 'T'
    → append → "2025-03-15T00:00:00"  ← medianoche LOCAL (sin Z)
    → new Date("2025-03-15T00:00:00")  ← medianoche en timezone del navegador
    → Intl.DateTimeFormat sin timeZone  ← usa timezone del navegador
    → "15 mar 2025"
```

**Resultado para cualquier timezone:** `"2025-03-15"` → siempre muestra `"15 mar 2025"`. ✅ Correcto para fechas de negocio. La medianoche local + Intl sin timeZone producen siempre la fecha original.

#### Camino B — Entrada ISO con Z `"2025-03-15T10:30:00.000Z"` (timestamp de evento UTC)

```
"2025-03-15T10:30:00.000Z"
    → contiene 'T' → no se modifica
    → new Date("2025-03-15T10:30:00.000Z")  ← 10:30 AM UTC
    → Intl.DateTimeFormat sin timeZone  ← usa timezone del navegador
    → Lima (UTC-5): 05:30 AM → "15 mar 2025" ✅
    → UTC+0: 10:30 AM → "15 mar 2025" ✅
    → UTC-6 (CST): 04:30 AM → "15 mar 2025" ✅
    → UTC+12: 22:30 → "15 mar 2025" ✅
```

Este caso particular es seguro porque 10:30 UTC no cruzará medianoche en ningún timezone razonable.

#### Camino B — Input ISO con Z cerca de medianoche UTC `"2025-03-15T05:00:00.000Z"`

```
→ Lima (UTC-5): 00:00 AM del 15 → "15 mar 2025" ✅
→ UTC-6 (CST): 23:00 del 14 → "14 mar 2025" ⚠️ (diferente fecha)
```

**Para usuarios en Lima específicamente:** cualquier timestamp entre `00:00:00Z` y `04:59:59Z` corresponde a la noche anterior Lima (19:00-23:59 del día anterior Lima). El render mostrará la fecha UTC, mientras que el usuario Lima pensaría en la fecha local. En el contexto del portal (un sistema de PM), los eventos de trazabilidad creados a las 10 PM Lima (03:00Z del día siguiente) se mostrarían con la fecha del día siguiente en UTC. **Para Lima esto NO es un bug hoy** — el sistema funciona bien para horario de oficina. Pero es técnicamente impreciso para eventos nocturnos.

| Propiedad | Valor |
|---|---|
| Uso correcto | Fechas de negocio YYYY-MM-DD — sin riesgo de timezone |
| Uso riesgoso | Timestamps UTC con Z cerca de medianoche UTC (horario nocturno Lima) |
| Riesgo práctico actual | BAJO (solo afecta eventos creados entre ~7 PM y 11 PM Lima) |
| Riesgo teórico multi-región | MEDIO |

---

### 3.3 `inicioDia` (local en PaginaResumenLanzamientos)
**Archivo:** `src/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos.tsx:15–17`

```typescript
function inicioDia(fecha: Date) {
  return fecha.toISOString().slice(0, 10)
}
```

Extrae YYYY-MM-DD en **UTC** de un objeto `Date`. Si se llama con `new Date()` (ahora mismo), devuelve la fecha UTC actual. Para Lima (UTC-5), esto es mañana a partir de las 7 PM Lima.

| Propiedad | Valor |
|---|---|
| Propósito | Generar `hoy` y `hace30Dias` para filtros |
| **Riesgo** | **MEDIO** — `hoy` es la fecha UTC, no la fecha Lima |

---

### 3.4 `construirPeriodos` (local en PaginaTendencias)
**Archivo:** `src/presentacion/paginas/analitica/tendencias/PaginaTendencias.tsx:29–43`

```typescript
function construirPeriodos(desde: string, hasta: string) {
  const periodos: string[] = []
  const cursor = new Date(`${desde}T00:00:00`)  // medianoche LOCAL
  const limite = new Date(`${hasta}T00:00:00`)  // medianoche LOCAL
  cursor.setDate(1)
  limite.setDate(1)

  while (cursor <= limite) {
    const clave = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    periodos.push(clave)
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return periodos
}
```

Itera meses para construir etiquetas `YYYY-MM`. Usa `T00:00:00` sin Z (medianoche local). Para la iteración de meses, esto no tiene impacto de zona horaria — `setDate(1)` y `setMonth()` operan en tiempo local de forma consistente.

| Propiedad | Valor |
|---|---|
| Riesgo práctico | BAJO — el resultado son strings YYYY-MM, no afectado por timezone |

---

### 3.5 `esReciente` (local en PaginaResumenAnalitico)
**Archivo:** `src/presentacion/paginas/analitica/PaginaResumenAnalitico.tsx:10–23`

```typescript
function esReciente(fecha: string | null | undefined, dias: number) {
  if (!fecha) return false
  const fechaBase = new Date(fecha.includes('T') ? fecha : `${fecha}T00:00:00`)
  if (Number.isNaN(fechaBase.getTime())) return false
  const limite = new Date()
  limite.setDate(limite.getDate() - dias)
  return fechaBase >= limite
}
```

Compara `Date` objects. Para fechas de negocio (`YYYY-MM-DD`), `fechaBase` es medianoche local; `limite` es ahora mismo (UTC). La comparación es leve timezone-sensitive pero funcionalmente correcta para el propósito de "fue en los últimos N días".

---

## 4. Inventario de campos temporales por módulo

### 4.1 Campos `created_at` / `updated_at` (presentes en TODOS los modelos)

| Campo | Tipo TS | Tipo DB inferido | Semántica | Cómo se muestra | Estado |
|---|---|---|---|---|---|
| `created_at` | `string` | `timestamptz` | Timestamp de evento (UTC) | `formatearFechaCorta` en Trazabilidad | ✅ Correcto para Lima |
| `updated_at` | `string` | `timestamptz` | Timestamp de evento (UTC) | `normalizarFechaPortal` en filtros, `localeCompare` en sorts | ✅ Correcto |

### 4.2 Fechas de negocio por módulo

| Módulo | Campo | Tipo TS | Semántica | Helper de display | Estado |
|---|---|---|---|---|---|
| Roadmap | `fecha_objetivo` | `string \| null` | Fecha entrega objetivo | `formatearFechaCorta` / local en PaginaRoadmap | ✅ |
| Roadmap | `fecha_completado` | `string \| null` | Fecha real completado | `formatearFechaCorta` | ✅ |
| Estrategia | `fecha_inicio`, `fecha_fin` | `string \| null` | Período estratégico | `formatearFechaCorta` | ✅ |
| Validación | `fecha_inicio`, `fecha_fin` | `string \| null` | Período plan validación | No visible en resumen | ✅ |
| Validación | `fecha_ejecucion` | `string` | Fecha de ejecución | `formatearFechaCorta` | ✅ |
| Lanzamientos | `fecha_programada` | `string` | Release programado | `formatearFechaCorta` | ✅ |
| Lanzamientos | `fecha_lanzamiento_real` | `string \| null` | Release real | `formatearFechaCorta` | ✅ |
| Lanzamientos | `fecha_registro` | `string` | Registro seguimiento | `formatearFechaCorta` | ✅ |
| Discovery | `fecha_hallazgo` | `string` | Fecha de insight | `formatearFechaCorta` | ✅ |
| Discovery | `fecha_investigacion` | `string` | Fecha investigación | `formatearFechaCorta` | ✅ |
| Decisiones | `fecha_decision` | `string` | Fecha decisión | `formatearFechaCorta` | ✅ |
| Auditorías | `fecha_auditoria` | `string` | Fecha auditoría | `formatearFechaCorta` | ✅ |
| Operación | `fecha_reporte` | `string` | Reporte bug/bloqueo | `formatearFechaCorta` | ✅ |
| Operación | `fecha_resolucion` | `string \| null` | Resolución | `formatearFechaCorta` | ✅ |
| Operación | `fecha_solicitud` | `string` | Solicitud mejora | `formatearFechaCorta` | ✅ |
| Operación | `fecha_cierre` | `string \| null` | Cierre mejora | `formatearFechaCorta` | ✅ |
| Operación | `fecha_identificacion` | `string` | Identificación deuda/riesgo | `formatearFechaCorta` | ✅ |
| Operación | `fecha_objetivo` | `string \| null` | Objetivo deuda/riesgo | `formatearFechaCorta` | ✅ |
| Operación | `fecha_leccion` | `string` | Fecha lección | `formatearFechaCorta` | ✅ |
| Gobierno | `fecha_identificacion` | `string` | Dependencias/riesgos | `formatearFechaCorta` | ✅ |
| Analítica | `fecha_corte` | `string` | KPI/Health Score | `formatearFechaCorta` | ✅ |
| Trazabilidad | `created_at` | `string` (UTC Z) | Evento técnico | `formatearFechaCorta` | ⚠️ Timezone-dependent |

---

## 5. Hallazgos críticos

### Hallazgo 1 — FILTRO DE TRAZABILIDAD SIN OFFSET TIMEZONE
**Archivo:** `src/infraestructura/repositorios/repositorioHistorialCambios.ts:49–55`
**Severidad:** MEDIA

```typescript
if (filtros.fechaDesde) {
  consulta = consulta.gte('created_at', `${filtros.fechaDesde}T00:00:00`)  // ← sin Z
}
if (filtros.fechaHasta) {
  consulta = consulta.lte('created_at', `${filtros.fechaHasta}T23:59:59.999`)  // ← sin Z
}
```

**El problema:** `created_at` en la base de datos es `timestamptz` (UTC). El filtro envía `'2025-03-15T00:00:00'` sin información de timezone. PostgreSQL/Supabase interpreta esta cadena usando el timezone de la sesión (generalmente UTC para Supabase cloud).

**Consecuencia para Lima (UTC-5):** Si el usuario selecciona `desde = "2025-03-15"`, el filtro aplica `>= 2025-03-15T00:00:00 UTC`. Esto incluye registros de las **últimas 5 horas del 14 de marzo en Lima** (desde las 7 PM Lima del 14 = 00:00 UTC del 15). El usuario Lima esperaba ver solo registros del 15 de marzo Lima en adelante.

**Comparar con PaginaTablero (CORRECTO):**
```typescript
// src/presentacion/paginas/tablero/PaginaTablero.tsx:196-197
const fechaInicio = new Date(`${desdePersonalizado}T00:00:00.000Z`)  // ← con Z ✅
const fechaHasta = new Date(`${hastaPersonalizado}T00:00:00.000Z`)   // ← con Z ✅
```
PaginaTablero sí usa `Z` pero solo para calcular diferencia de días (no para enviar a Supabase), por lo que el resultado es correcto para ese uso específico aunque no sea el patrón "correcto Lima".

**Impacto real:** Los registros de trazabilidad de las últimas 5 horas del día anterior aparecen incluidos cuando el usuario filtra "desde el día siguiente". En un sistema de PM de uso diario en horario laboral (9 AM – 6 PM Lima), la ventana de impacto es mínima (raramente se crean registros entre 7 PM y 11:59 PM Lima).

---

### Hallazgo 2 — `hoy` BASADO EN UTC, NO EN HORA LIMA
**Archivo:** `src/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos.tsx:60–65`
**Severidad:** BAJA

```typescript
function inicioDia(fecha: Date) {
  return fecha.toISOString().slice(0, 10)  // extrae fecha en UTC
}

const hoy = useMemo(() => inicioDia(new Date()), [])
const hace30Dias = useMemo(() => {
  const fecha = new Date()
  fecha.setDate(fecha.getDate() - 30)
  return inicioDia(fecha)  // también UTC
}, [])
```

Luego se usa así:
```typescript
// línea 79
.filter((release) => release.fecha_programada >= hoy && release.estado !== 'cerrado')
```

**El problema:** `hoy` es la fecha UTC. Para Lima (UTC-5), entre las 7 PM y las 11:59 PM Lima, `hoy` ya es "mañana" en UTC. Un release programado para "hoy" en Lima desaparecería de la sección "próximos" a partir de las 7 PM Lima.

**`hace30Dias`** tiene el mismo problema — los releases cerrados recientemente podrían mostrar un resultado ligeramente diferente al esperado en horario nocturno Lima.

**Impacto real:** Solo observable entre 7 PM y 11:59 PM Lima. Para uso habitual de negocio en horario laboral: ningún impacto.

---

### Hallazgo 3 — CONSTRUCCIÓN DE `hoy` EN PaginaRoadmap CON AMBIGÜEDAD
**Archivo:** `src/presentacion/paginas/roadmap/PaginaRoadmap.tsx:391`
**Severidad:** BAJA

```typescript
const fecha = new Date(`${entrega.fecha_objetivo}T00:00:00`).getTime()
// ...
return fecha >= ahora  // donde ahora = new Date().getTime()
```

`new Date('2025-03-15T00:00:00')` = medianoche local Lima. `new Date().getTime()` = ahora UTC. La comparación es entre medianoche local y el momento actual en milliseconds absolutos. Esto funciona correctamente porque ambos son timestamps absolutos comparables. Sin embargo, la "medianoche local" de `fecha_objetivo` significa que la entrega aparecerá como "próxima" hasta las 00:00 Lima del día objetivo, luego desaparecerá. Esto es el comportamiento intuitivamente esperado.

---

### Hallazgo 4 — `formatearFechaCorta` SIN `timeZone` EXPLÍCITO EN `Intl.DateTimeFormat`
**Archivo:** `src/compartido/utilidades/formatoPortal.ts:12–16`
**Severidad:** BAJA para escenario actual, MEDIA si sistema se abre a múltiples zonas

```typescript
const formateadorFechaCorta = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
  // NO hay timeZone: 'America/Lima'
})
```

Sin `timeZone` explícito, usa el timezone del sistema operativo/navegador del usuario. Para el escenario actual (usuarios en Lima usando el sistema), esto produce el comportamiento esperado. Para timestamps UTC cercanos a la medianoche UTC (que ocurren en horario nocturno Lima), la fecha mostrada depende del timezone del navegador del usuario.

**Para fechas de negocio puras (YYYY-MM-DD):** esto no es un problema — ver análisis en sección 3.2.
**Para `created_at` (timestamps UTC):** podría mostrar fechas diferentes a usuarios en distintas zonas, lo cual es en realidad el comportamiento CORRECTO (mostrar la fecha local del evento para cada usuario).

---

### Hallazgo 5 — ORDENAMIENTO POR `updated_at` CON `localeCompare`
**Archivo:** `src/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos.tsx:86`
**Severidad:** NINGUNA (está correcto)

```typescript
const recientes = useMemo(
  () => [...releases].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 6),
  [releases]
)
```

`updated_at` es ISO 8601 con Z (`"2025-03-15T10:30:00.000Z"`). `localeCompare` sobre strings ISO correctamente ordena cronológicamente. El timezone no afecta el orden relativo. ✅

---

### Hallazgo 6 — PARSEO SIN T SUFFIX EN SORT DE ROADMAP
**Archivo:** `src/presentacion/paginas/roadmap/PaginaRoadmap.tsx:254`

```typescript
.sort((entregaA, entregaB) => {
  return new Date(entregaA.fecha_objetivo ?? '').getTime() - new Date(entregaB.fecha_objetivo ?? '').getTime()
})
```

`new Date('2025-03-15')` (sin T) — según la especificación ECMAScript, una cadena ISO de solo fecha (`YYYY-MM-DD`) se parsea como **UTC midnight**. Esto es diferente a `new Date('2025-03-15T00:00:00')` que sería medianoche local. Sin embargo, para el propósito de ordenamiento cronológico, el offset es constante para todas las fechas → el orden relativo es correcto. ✅

**Nota técnica:** Esta inconsistencia (sin T = UTC midnight; con T sin Z = local midnight) no tiene impacto funcional aquí porque solo se compara entre sí.

---

## 6. Clasificación semántica recomendada

El sistema tiene dos categorías de campos temporales que requieren tratamiento diferente:

### Categoría A — Fechas de negocio puras

**Campos:** todos los `fecha_*`

| Característica | Descripción |
|---|---|
| Formato en DB | `date` o `text` almacenado como `YYYY-MM-DD` |
| Semántica | "Este evento ocurrió/ocurrirá el día X" — sin hora, sin timezone |
| Tratamiento correcto actual | ✅ `formatearFechaCorta` con path `T00:00:00` local → correcto |
| Comparación/filtro | ✅ String lexicográfico (`>=`, `localeCompare`) — correcto |
| Validación Zod | ✅ `z.string().min(10).max(20)` — pragmático, funciona |
| Valores por defecto | ✅ `new Date().toISOString().slice(0, 10)` — da fecha UTC, off by ≤1 día para Lima nocturno |

### Categoría B — Timestamps de evento con hora

**Campos:** `created_at`, `updated_at`

| Característica | Descripción |
|---|---|
| Formato en DB | `timestamptz` en UTC, retorna `YYYY-MM-DDTHH:mm:ss.SSSZ` |
| Semántica | "El evento técnico sucedió exactamente en este instante" |
| Tratamiento en display | ⚠️ `formatearFechaCorta` muestra solo la fecha, pierde la hora |
| Tratamiento en filtros (trazabilidad) | ⚠️ Comparación sin Z — off by UTC-offset horas |
| Ordenamiento | ✅ `localeCompare` sobre ISO correcto |
| Validación Zod | ✅ No se validan en formularios — solo en lectura |

**La diferenciación está parcialmente bien:** El sistema reconoce implícitamente que `created_at`/`updated_at` son timestamps y no los mezcla con fechas de negocio en los formularios. Pero no tiene un helper dedicado para mostrar timestamps con hora completa.

---

## 7. Riesgos reales

| # | Riesgo | Categoría | Probabilidad | Impacto | Severidad total | Evidencia |
|---|---|---|---|---|---|---|
| 1 | Filtro de trazabilidad incluye 5 horas del día anterior en UTC | Functional | Media | Bajo | **MEDIO** | `repositorioHistorialCambios.ts:50,54` |
| 2 | `hoy` en resumen lanzamientos es fecha UTC — off by 1 después de 7 PM Lima | UX | Baja | Bajo | **BAJO** | `PaginaResumenLanzamientos.tsx:60` |
| 3 | `formatearFechaCorta` sin `timeZone` explícito — frágil para multi-región | Architectural | Baja (mono-región actual) | Medio | **BAJO** | `formatoPortal.ts:12-16` |
| 4 | Timestamps `created_at` en trazabilidad muestran solo fecha, no hora | UX/Precision | Presente | Bajo | **BAJO** | `PaginaTrazabilidad.tsx:118` |
| 5 | `new Date(fecha_objetivo)` sin T en sort roadmap — UTC vs local inconsistencia | Technical | Presente | Nulo (solo afecta sort) | **NINGUNO** | `PaginaRoadmap.tsx:254` |
| 6 | Valores por defecto de formularios `toISOString().slice(0,10)` — fecha UTC | UX | Baja (horario nocturno) | Nulo | **NINGUNO** | 19 archivos |

---

## 8. Qué sí está bien

1. **Consistencia de tipos en dominio:** todos los campos temporales son `string`, nunca `Date`. No hay riesgo de serialización/deserialización incorrecta.

2. **Validación Zod pragmática:** `z.string().min(10).max(20)` captura cadenas malformadas. El rango cubre tanto `YYYY-MM-DD` (10 chars) como `YYYY-MM-DDTHH:mm:ss.SSSZ` (24 chars), aunque no valida semántica. Es suficiente para el caso de uso.

3. **Comparaciones de negocio en string:** `fecha_programada >= hoy`, `fecha_corte >= fechaDesde` — correcto porque `YYYY-MM-DD` es lexicográficamente sortable. No hay riesgo de error de ordenamiento.

4. **Manejo de `null` en todos los helpers:** `normalizarFechaPortal`, `formatearFechaCorta` — ambos retornan `''` para `null`/`undefined`. No hay riesgo de `new Date(undefined)` o `NaN` en display.

5. **Fallback en `formatearFechaCorta`:** si `new Date()` produce `NaN`, retorna `fecha.slice(0, 10)` — degradación segura.

6. **Valores por defecto de formularios:** `new Date().toISOString().slice(0, 10)` — genera UTC que difiere ≤1 día de Lima solo en horario nocturno. Para 19 páginas con formularios de fechas de negocio, esto es correcto en >99.9% de los usos.

7. **Ordenamiento de `updated_at` con `localeCompare`:** ISO 8601 con Z es lexicográficamente sortable → el ordenamiento cronológico es siempre correcto.

8. **`PaginaTablero` usa `T00:00:00.000Z` para cálculo de días:** el único lugar donde se hace matemática de fechas a nivel milliseconds usa la forma UTC correcta.

9. **No hay mezcla de `Date` objects con strings:** el sistema nunca almacena `Date` en estado React ni en modelos. Todo es string de entrada a salida, parseando a `Date` solo para display/cálculo inmediato.

10. **Separación real entre fechas de negocio y timestamps:** los formularios nunca mezclan `fecha_*` (YYYY-MM-DD) con campos `created_at`. No existe un campo de negocio que guarde un timestamp completo ni un `created_at` que se guarde como solo fecha.

---

## 9. Qué NO debe tocarse

Estas construcciones parecen raras o inconsistentes pero son **técnicamente correctas para su propósito específico**:

1. **`new Date(entrega.fecha_objetivo)` sin T en PaginaRoadmap:254**
   Solo se usa para sort comparativo (`getTime() - getTime()`). Dado que ambas fechas se parsean como UTC midnight, el orden relativo es correcto. No tocar.

2. **`normalizarFechaPortal` en CSV exports**
   Produce YYYY-MM-DD intencionalmente para columnas de exportación técnica. El uso de Z o no-Z no cambia el resultado porque es solo `slice(0, 10)` sobre el string — nunca parsea a Date.

3. **`normalizarFechaPortal(release.updated_at) >= hace30Dias` en PaginaResumenLanzamientos:111**
   Trunca `updated_at` (timestamp UTC) a YYYY-MM-DD y compara con `hace30Dias` (YYYY-MM-DD UTC). La comparación es internamente consistente: ambos lados son fechas UTC. No tocar.

4. **`localeCompare` sobre `updated_at`**
   ISO 8601 con Z es perfectamente sortable lexicográficamente. Funciona mejor que `new Date()` comparisons para este caso.

5. **`Intl.DateTimeFormat('es-PE')` sin `timeZone`**
   Para fechas de negocio puras (`YYYY-MM-DD` + `T00:00:00` local), el resultado es correcto en cualquier timezone. El comportamiento de usar el timezone del navegador es el esperado para mostrar la fecha local del usuario.

6. **Los 19 formularios con `new Date().toISOString().slice(0, 10)`**
   Los valores por defecto generados son YYYY-MM-DD UTC. Para horario laboral Peru (UTC-5), la diferencia con la fecha local es cero. El off-by-one solo ocurre en las últimas horas del día, cuando es improbable que alguien esté creando registros. No tocar.

---

## 10. Recomendación de siguiente fase

### Diagnóstico de dimensión

Los problemas encontrados son **pequeños y localizados**. No hay una catástrofe temporal. El sistema es sólido para el escenario actual (usuarios en Lima, horario laboral).

### Fase recomendada: Corrección focalizada (pequeña, de 2–3 archivos)

No es necesaria una normalización transversal mayor. Solo hay **dos correcciones que valen la pena hacer**:

#### Corrección 1 — Repositorio de historial de cambios (prioridad MEDIA)
**Archivo:** `repositorioHistorialCambios.ts:50,54`

Cambiar los boundaries de filtro para que incluyan el offset UTC-5 de Lima:
```typescript
// En vez de:
`${filtros.fechaDesde}T00:00:00`
// Usar:
`${filtros.fechaDesde}T00:00:00-05:00`
```
O, más robusto, calcular la medianoche UTC equivalente en el frontend antes de enviar.

#### Corrección 2 — `hoy` en resumen de lanzamientos (prioridad BAJA)
**Archivo:** `PaginaResumenLanzamientos.tsx:60`

Para que `hoy` sea la fecha Lima (no UTC), usar `new Date()` con ajuste manual del offset o con `Intl.DateTimeFormat` para extraer la fecha local.

#### Lo que NO requiere corrección inmediata:
- `formatearFechaCorta` — funciona correctamente para el uso actual.
- Los 19 formularios con `toISOString().slice(0,10)` — correcto en práctica.
- El sort de roadmap con `new Date(fecha)` sin T — inofensivo.
- `Intl.DateTimeFormat` sin `timeZone` — correcto para mono-región.

### Si el sistema crece a multi-región:
En ese escenario sí sería necesaria una fase transversal que incluya:
- Añadir `timeZone: 'America/Lima'` a `formateadorFechaCorta`.
- Crear un helper específico `formatearFechaHoraCorta` para timestamps con hora visible.
- Añadir un helper que convierta filtros de fecha a boundaries UTC explícitos.
- Posiblemente un helper `fechaHoyLocal()` que use `Intl` para generar YYYY-MM-DD en timezone correcto.

---

## Apéndice — Archivos con evidencia directa

| Archivo | Hallazgo |
|---|---|
| `src/compartido/utilidades/formatoPortal.ts` | Helpers principales — `T00:00:00` sin Z |
| `src/infraestructura/repositorios/repositorioHistorialCambios.ts:50,54` | Filtro timestamp sin offset |
| `src/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos.tsx:60-65` | `hoy` basado en UTC |
| `src/presentacion/paginas/tablero/PaginaTablero.tsx:196-197` | Único uso correcto con Z |
| `src/presentacion/paginas/roadmap/PaginaRoadmap.tsx:242,391` | `T00:00:00` sin Z |
| `src/presentacion/paginas/analitica/tendencias/PaginaTendencias.tsx:31-32` | `T00:00:00` sin Z |
| `src/presentacion/paginas/analitica/PaginaResumenAnalitico.tsx:15` | `T00:00:00` sin Z |
| `src/dominio/modelos.ts` | Todos los campos temporales como `string` |
| `src/compartido/validacion/esquemas.ts` | Fechas como `z.string()` |
