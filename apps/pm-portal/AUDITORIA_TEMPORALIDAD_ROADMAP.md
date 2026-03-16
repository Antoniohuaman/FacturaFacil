# AUDITORÍA EXTREMA — TEMPORALIDAD ROADMAP Y RELACIÓN CON RELEASES

> **Sistema:** PM Portal
> **Rama auditada:** `feature/creacion-cronograma`
> **Fecha de auditoría:** 2026-03-16
> **Alcance:** Solo lectura. Sin modificaciones. Sin suposiciones sin evidencia.
> **Auditor:** Claude Code — Arquitecto full-stack + analista de sistemas

---

## 1. Resumen Ejecutivo

### Diagnóstico general

El módulo Roadmap del PM Portal está **parcialmente implementado en cuanto a temporalidad**. El sistema opera con un modelo híbrido donde la dimensión temporal de cada entidad está soportada de forma **heterogénea, inconsistente y en algunos casos inferida visualmente sin respaldo real en el modelo de datos**. Esto genera una brecha entre lo que el cronograma aparenta soportar y lo que el modelo realmente garantiza.

### Veredicto por entidad

| Entidad | Temporalidad real | Forma | Respaldo persistente |
|---|---|---|---|
| **Objetivo** | Ninguna propia | N/A | ❌ Solo `created_at`/`updated_at` |
| **Iniciativa** | Indirecta por ventana | Rango (via FK) | ⚠️ Solo si la ventana tiene fechas |
| **Entrega** | Parcial, dual-mode | Rango (vía ventana) + Marcador (fecha directa) | ⚠️ Campos opcionales sin validación de formato |
| **Release** | Completa | Hito plan/real | ✅ Campos requeridos con validación |
| **CatalogoVentanaPm** | Completa | Rango | ⚠️ Campos nullables opcionalmente |

### Severidad del problema

**Alta**. El cronograma puede mostrar un lienzo temporal rico y aparentemente respaldado, pero:

1. El **Objetivo** no tiene fechas propias. Su barra en el cronograma es un **artificio visual computado** desde los hijos.
2. La **Iniciativa** puede no tener barra en el cronograma si su ventana planificada no tiene `fecha_inicio`/`fecha_fin`.
3. La **Entrega** usa un modelo dual (ventana para barra, fecha directa para marcador) sin relación obligatoria entre ambos.
4. No existen reglas de **contención temporal** entre niveles jerárquicos.

### Nivel de riesgo de evolución

**Moderado-alto si se actúa sin plan**. Agregar campos de fecha a Objetivo e Iniciativa requiere:
- Migración de base de datos con columnas nullables (retrocompatible)
- Actualización de tipos TypeScript, schemas Zod, formularios y repositorios
- Ajuste en la lógica del cronograma para que el Objetivo use fechas propias y no solo inferidas
- Sin migraciones de datos existentes necesariamente, si los campos son opcionales

### Conclusión de alto nivel

El sistema **no soporta correctamente el cronograma ejecutivo** que presenta. La visualización supera el modelo. La evolución es técnicamente viable y prudente si se hace por fases, comenzando con campos opcionales para no romper compatibilidad.

---

## 2. Alcance Auditado

### Módulos revisados
- Roadmap: Objetivos, Iniciativas, Entregas, Cronograma
- Lanzamientos: Releases, Seguimiento post-lanzamiento

### Capas revisadas
- Dominio: interfaces TypeScript en `dominio/modelos.ts`
- Validación: esquemas Zod en `compartido/validacion/esquemas.ts`
- Aplicación: casos de uso en `aplicacion/casos-uso/`
- Infraestructura: repositorios Supabase en `infraestructura/repositorios/`
- Presentación: páginas y componentes en `presentacion/paginas/`
- Utilidades: formateo y CSV en `compartido/utilidades/`

### Archivos auditados con evidencia directa

| Archivo | Propósito |
|---|---|
| `src/dominio/modelos.ts` | Tipos/interfaces de dominio |
| `src/compartido/validacion/esquemas.ts` | Validación Zod de inputs |
| `src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx` | Cronograma visual (~1100 líneas) |
| `src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx` | CRUD Objetivos |
| `src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx` | CRUD Iniciativas |
| `src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx` | CRUD Entregas |
| `src/presentacion/paginas/lanzamientos/releases/PaginaReleases.tsx` | CRUD Releases |
| `src/presentacion/paginas/lanzamientos/seguimiento/PaginaSeguimientoLanzamientos.tsx` | Post-lanzamiento |
| `src/infraestructura/repositorios/repositorioLanzamientos.ts` | Persistencia releases |
| `src/compartido/utilidades/formatoPortal.ts` | Formateo de fechas |
| `src/compartido/utilidades/csv.ts` | Exportación CSV |

### Límites de la auditoría

- No se tuvo acceso a la base de datos Supabase directamente (tablas inferidas por modelos TypeScript y repositorios)
- No se auditó el dashboard de PostHog ni la integración GitHub
- No se auditó la capa de autenticación/permisos en su profundidad
- La auditoría no incluye datos productivos reales

---

## 3. Modelo Actual Real

### 3.1 Objetivos

**Campos actuales** (`dominio/modelos.ts:6-14`):
```typescript
export interface Objetivo {
  id: string
  nombre: string
  descripcion: string
  estado: EstadoRegistro        // 'pendiente' | 'en_progreso' | 'completado'
  prioridad: PrioridadRegistro  // 'baja' | 'media' | 'alta'
  created_at: string            // timestamp del sistema
  updated_at: string            // timestamp del sistema
}
```

**Campos temporales propios:** NINGUNO. Solo `created_at` y `updated_at` gestionados por Supabase.

**Schema de input** (`esquemas.ts:44-49`):
```typescript
export const objetivoSchema = z.object({
  nombre: ...,
  descripcion: ...,
  estado: estadoSchema,
  prioridad: prioridadSchema
  // ← Sin ningún campo de fecha
})
```

**Temporalidad actual:** El Objetivo **no tiene dimensión temporal propia en ninguna capa del sistema** (ni base de datos, ni validación, ni formulario). No existe ningún campo `fecha_inicio`, `fecha_fin`, `fecha_objetivo` ni equivalente.

**Reglas de negocio temporales:** Ninguna definida explícitamente. No hay validación de fechas de ningún tipo.

**Evidencia en el cronograma** (`PaginaCronogramaRoadmap.tsx:975-1023`):
El segmento visual del objetivo es **100% derivado** de sus hijos:

```typescript
function construirFilaObjetivo(objetivo, iniciativasObjetivo, entregasObjetivo) {
  const segmentosIniciativas = iniciativasObjetivo.flatMap(
    (iniciativa) => calcularSegmentosIniciativa(iniciativa).segmentos
  )
  const segmentosEntregas = entregasObjetivo.flatMap(
    (entrega) => calcularSegmentosEntrega(entrega).segmentos
  )
  const todosLosSegmentos = [...segmentosIniciativas, ...segmentosEntregas]
    .sort((a, b) => compararFechasAscendente(a.inicio, b.inicio))

  const segmentoObjetivo = todosLosSegmentos.length > 0 ? {
    id: `objetivo-${objetivo.id}`,
    inicio: todosLosSegmentos[0].inicio,       // ← más temprano de hijos
    fin: todosLosSegmentos[last].fin,           // ← más tardío de hijos
    variante: 'objetivo'
  } : null  // ← sin hijos = sin barra en el cronograma
}
```

**Conclusión:** La barra gris del Objetivo en el cronograma es un artefacto visual calculado, no refleja un dato del modelo. Si el objetivo no tiene hijos con fechas visibles en el rango seleccionado, **desaparece del cronograma completamente**.

---

### 3.2 Iniciativas

**Campos actuales** (`dominio/modelos.ts:16-32`):
```typescript
export interface Iniciativa {
  id: string
  objetivo_id: string | null           // FK a Objetivo (opcional)
  ventana_planificada_id: string | null // FK a CatalogoVentanaPm (opcional)
  etapa_id: string | null              // FK a CatalogoEtapaPm (opcional)
  nombre: string
  descripcion: string
  alcance: number
  impacto: number                       // 0.25 | 0.5 | 1 | 2 | 3
  confianza: number                     // 0-100
  esfuerzo: number                      // >= 0.5
  rice: number                          // calculado
  estado: EstadoRegistro
  prioridad: PrioridadRegistro
  created_at: string
  updated_at: string
}
```

**Campos temporales propios:** NINGUNO directo. Solo vinculación a una ventana planificada.

**Schema de input** (`esquemas.ts:51-63`):
```typescript
export const iniciativaSchema = z.object({
  objetivo_id: z.string().uuid().nullable().optional(),
  ventana_planificada_id: z.string().uuid().nullable().optional(),
  etapa_id: z.string().uuid().nullable().optional(),
  nombre: ...,
  descripcion: ...,
  alcance: z.number().int().min(0),
  impacto: z.union([...literales]),
  confianza: z.number().min(0).max(100),
  esfuerzo: z.number().min(0.5),
  estado: estadoSchema,
  prioridad: prioridadSchema
  // ← Sin ningún campo de fecha directa
})
```

**Temporalidad actual:** Indirecta y condicionada. El rango temporal de una iniciativa existe solo si:
1. Tiene `ventana_planificada_id` asignado (no null)
2. La ventana referenciada tiene `fecha_inicio` y `fecha_fin` no nulos

**Reglas de negocio temporales:** Ninguna. La relación ventana↔iniciativa no tiene validaciones de rango, contención ni consistencia.

**Evidencia en el cronograma** (`PaginaCronogramaRoadmap.tsx:927-948`):
```typescript
const calcularSegmentosIniciativa = (iniciativa: Iniciativa) => {
  const plan = obtenerRangoVentana(iniciativa.ventana_planificada_id, ventanasPorId)
  // ← Si la ventana es null o no tiene fechas, plan = null → sin barra
  return {
    segmentos: [
      construirSegmento(plan?.inicio ?? null, plan?.fin ?? null, `plan-${iniciativa.id}`, 'iniciativa')
    ].filter(Boolean),
    marcadores  // ← solo releases sin entrega_id asociados
  }
}
```

**Conclusión:** La iniciativa tiene temporalidad indirecta y frágil. Si la ventana no tiene fechas configuradas, la iniciativa **no tiene barra en el cronograma**, aunque sí aparece en la jerarquía de filas.

---

### 3.3 Entregas

**Campos actuales** (`dominio/modelos.ts:34-47`):
```typescript
export interface Entrega {
  id: string
  iniciativa_id: string | null
  ventana_planificada_id: string | null  // ventana como rango de planificación
  ventana_real_id: string | null         // ventana como rango real ejecutado
  nombre: string
  descripcion: string
  fecha_objetivo: string | null          // fecha puntual objetivo (directa)
  fecha_completado: string | null        // fecha puntual de completado (directa)
  estado: EstadoRegistro
  prioridad: PrioridadRegistro
  created_at: string
  updated_at: string
}
```

**Campos temporales:** Cuatro mecanismos de fecha, dos tipos distintos:
- `ventana_planificada_id` → rango (barra en cronograma)
- `ventana_real_id` → rango real ejecutado (barra en cronograma)
- `fecha_objetivo` → fecha puntual (marcador en cronograma)
- `fecha_completado` → fecha puntual de cierre (marcador en cronograma)

**Schema de input** (`esquemas.ts:65-75`):
```typescript
export const entregaSchema = z.object({
  iniciativa_id: z.string().uuid().nullable().optional(),
  ventana_planificada_id: z.string().uuid().nullable().optional(),
  ventana_real_id: z.string().uuid().nullable().optional(),
  nombre: ...,
  descripcion: ...,
  fecha_objetivo: z.string().nullable().optional(),           // ← sin validación de formato ISO
  fecha_completado: z.string().trim().nullable().optional(),  // ← sin validación de formato ISO
  estado: estadoSchema,
  prioridad: prioridadSchema
})
```

**Reglas de negocio temporales:**
- NO hay validación de que `fecha_completado >= fecha_objetivo`
- NO hay validación de que `fecha_objetivo` esté dentro de la ventana planificada
- NO hay validación del formato de fecha (puede ingresar cualquier string)
- El estado `completado` no requiere `fecha_completado` ni viceversa

**Evidencia en el cronograma** (`PaginaCronogramaRoadmap.tsx:951-972`):
```typescript
const calcularSegmentosEntrega = (entrega: Entrega) => {
  const plan = obtenerRangoVentana(entrega.ventana_planificada_id, ventanasPorId)
  const real = obtenerRangoVentana(entrega.ventana_real_id, ventanasPorId)
  const marcadores = [
    construirMarcador(parsearFechaPortal(entrega.fecha_objetivo), ..., 'entrega', 'Fecha objetivo'),
    construirMarcador(parsearFechaPortal(entrega.fecha_completado), ..., 'entrega_real', 'Fecha completada'),
    // + releases asociados a esta entrega
  ].filter(Boolean)

  const segmentos = [
    construirSegmento(plan?.inicio ?? null, plan?.fin ?? null, ..., 'plan'),
    construirSegmento(real?.inicio ?? null, real?.fin ?? null, ..., 'real')
  ].filter(Boolean)

  return { segmentos, marcadores }
}
```

**Conclusión:** La entrega es la entidad con mayor riqueza temporal pero también con mayor complejidad. Combina dos mecanismos distintos (ventanas para barras, fechas puntuales para marcadores) sin coordinación obligatoria entre ambos. Una entrega puede tener barra sin marcadores, marcadores sin barra, ambos, o ninguno.

---

### 3.4 Releases

**Campos actuales** (`dominio/modelos.ts:601-624`):
```typescript
export interface ReleasePm {
  id: string
  codigo: string                          // ej: "REL-2024-001"
  nombre: string
  descripcion: string
  tipo_release: TipoReleasePm             // 'mvp' | 'mejora' | 'correccion' | 'interno'
  estado: EstadoReleasePm                 // 'borrador'|'planificado'|'listo_para_salida'|'lanzado'|'revertido'|'cerrado'
  fecha_programada: string                // ← REQUERIDA, plan del hito
  fecha_lanzamiento_real: string | null   // ← OPCIONAL, real del hito
  iniciativa_id: string | null            // vinculación a iniciativa
  entrega_id: string | null               // vinculación a entrega
  owner: string | null
  responsable_aprobacion: string | null
  decision_id: string | null
  rollback_preparado: boolean
  rollback_descripcion: string | null
  rollback_responsable: string | null
  comunicacion_requerida: boolean
  comunicacion_descripcion: string | null
  audiencia_objetivo: string | null
  notas: string | null
  created_at: string
  updated_at: string
}
```

**Campos temporales:**
- `fecha_programada` → requerida, fecha del hito planificado
- `fecha_lanzamiento_real` → opcional, fecha real de ejecución

**Validación** (`esquemas.ts:465-495`):
```typescript
export const releaseSchema = z.object({
  fecha_programada: z.string().trim().min(10).max(20),     // ← requerido
  fecha_lanzamiento_real: fechaOpcionalSchema,             // ← opcional
  // ...
}).superRefine((valores, contexto) => {
  if (valores.fecha_lanzamiento_real && valores.fecha_lanzamiento_real < valores.fecha_programada) {
    contexto.addIssue({
      path: ['fecha_lanzamiento_real'],
      message: 'La fecha de lanzamiento real no puede ser menor que la fecha programada'
    })
  }
})
```

**Reglas de negocio temporales:**
- `fecha_programada` es obligatoria
- `fecha_lanzamiento_real >= fecha_programada` (validado en Zod)
- El estado del release no está validado contra sus fechas (ej: estado='lanzado' sin fecha real es válido)

**Evidencia en el cronograma** (`PaginaCronogramaRoadmap.tsx:361-363`):
```typescript
function fechaRelease(release: ReleasePm) {
  return parsearFechaPortal(release.fecha_lanzamiento_real ?? release.fecha_programada)
}
```
El release siempre aparece como **marcador puntual** (círculo), nunca como barra. Usa la fecha real si existe, si no usa la planificada. Este comportamiento es semánticamente correcto: el release es un hito, no un rango de ejecución.

**Relación con jerarquía:** El release puede vincularse a `iniciativa_id` y/o `entrega_id`. En el cronograma:
- Si el release tiene `entrega_id`, aparece en la fila de esa entrega
- Si no tiene `entrega_id` pero tiene `iniciativa_id`, aparece en la fila de esa iniciativa
- Los releases sin vínculo a entrega asociados a una iniciativa se filtran explícitamente (`filter((release) => !release.entrega_id)`)

---

### 3.5 Cronograma

**Qué dibuja hoy:**

| Nivel | Tipo visual | Fuente de datos | Condición de aparición |
|---|---|---|---|
| Objetivo | Barra gris fina | Agregado de hijos (mín inicio → máx fin) | Solo si tiene hijos con fechas en el rango |
| Iniciativa | Barra cyan | `ventana_planificada_id.fecha_inicio/fin` | Solo si la ventana tiene ambas fechas |
| Entrega (plan) | Barra amber | `ventana_planificada_id.fecha_inicio/fin` | Solo si la ventana tiene ambas fechas |
| Entrega (real) | Barra emerald | `ventana_real_id.fecha_inicio/fin` | Solo si la ventana tiene ambas fechas |
| Entrega (marcador plan) | Círculo amber | `entrega.fecha_objetivo` | Solo si campo no nulo y parseable |
| Entrega (marcador real) | Círculo emerald | `entrega.fecha_completado` | Solo si campo no nulo y parseable |
| Release plan | Círculo negro | `release.fecha_programada` | Siempre (campo requerido) |
| Release real | Círculo verde | `release.fecha_lanzamiento_real` | Solo si campo no nulo |

**Datos cargados al iniciar** (`PaginaCronogramaRoadmap.tsx:502-508`):
```typescript
const [objetivosData, iniciativasData, entregasData, releasesData, ventanasData] = await Promise.all([
  listarObjetivos(),
  listarIniciativas(),
  listarEntregas(),
  listarReleases(),
  listarVentanasPm()
])
```
Carga completa, sin paginación, sin lazy loading. Todos los datos en memoria.

**Cálculo de años disponibles** (`PaginaCronogramaRoadmap.tsx:590-627`):
Los años del selector provienen de: ventanas (campo `anio` + años de `fecha_inicio`/`fecha_fin`), entregas (`fecha_objetivo`, `fecha_completado`) y releases. **Los objetivos no aportan ningún año al selector** (confirmando que no tienen fechas).

---

## 4. Hallazgos Críticos

### P0 — Crítico

---

#### P0-01: Objetivo sin temporalidad propia — el cronograma simula más de lo que el modelo soporta

**Descripción:** El `Objetivo` no tiene ningún campo de fecha en el modelo de datos, esquema de validación ni formulario. Su representación en el cronograma (barra gris) es completamente computada a partir de sus hijos, sin ningún respaldo persistente.

**Evidencia concreta:**
- `dominio/modelos.ts:6-14`: interface `Objetivo` sin ningún campo de fecha de usuario
- `esquemas.ts:44-49`: schema Zod sin campos de fecha
- `PaginaCronogramaRoadmap.tsx:980-988`: barra del objetivo calculada como `min(hijos.inicio)` / `max(hijos.fin)`

**Impacto funcional:** Un objetivo corporativo estratégico no puede afirmarse en el tiempo. No se puede planificar ni auditar "¿cuándo termina el objetivo X?" porque esa información no existe en el modelo. La barra del cronograma es decorativa en términos de dato.

**Impacto técnico:** Cualquier filtrado, exportación o reporte que intente usar el rango temporal de un objetivo tomará datos inconsistentes o inventados en tiempo de render.

**Riesgo:** Alta probabilidad de malinterpretar el cronograma como si los objetivos estuvieran planificados en tiempo cuando no lo están.

---

#### P0-02: Iniciativa sin fechas directas — temporalidad dependiente de una ventana que puede no tener fechas

**Descripción:** La `Iniciativa` no tiene campos de fecha propios. Su único mecanismo temporal es la FK `ventana_planificada_id`, pero tanto el campo FK como las fechas de la ventana son nullable. Es posible que una iniciativa esté completamente sin temporalidad.

**Evidencia concreta:**
- `dominio/modelos.ts:16-32`: `ventana_planificada_id: string | null`
- `dominio/modelos.ts:49-60`: `CatalogoVentanaPm.fecha_inicio: string | null`, `fecha_fin: string | null`
- `PaginaCronogramaRoadmap.tsx:927-948`: si `obtenerRangoVentana` devuelve null, no se genera ningún segmento

**Impacto funcional:** Una iniciativa puede existir en el sistema pero ser **invisible** en el cronograma temporal si no tiene ventana con fechas asignadas. Esto afecta la trazabilidad ejecutiva.

**Impacto técnico:** La lógica de filtrado del cronograma puede excluir iniciativas válidas del rango visible. El selector de años disponibles no considera iniciativas sin ventana con fechas.

**Riesgo:** Iniciativas activas que no aparecen en el cronograma crean una falsa sensación de que la planificación es más simple de lo que es.

---

### P1 — Alto

---

#### P1-01: Entrega con doble mecanismo temporal sin coordinación

**Descripción:** La `Entrega` usa simultáneamente dos paradigmas temporales: ventanas (para barras/segmentos) y fechas directas (para marcadores/puntos). Estos dos mecanismos son independientes y no existe ninguna regla que los coordine, valide su consistencia o defina cuándo usar cada uno.

**Evidencia concreta:**
- `dominio/modelos.ts:34-47`: cuatro campos temporales
- `esquemas.ts:65-75`: sin validación cruzada entre ventana y fechas directas
- `PaginaCronogramaRoadmap.tsx:951-972`: ambos mecanismos coexisten en el mismo render

**Impacto funcional:** Una entrega puede mostrar:
- Una barra de ventana planificada (enero-marzo) y un marcador de fecha objetivo en junio (inconsistente)
- Solo un marcador puntual sin ninguna barra
- Solo una barra sin marcador de fecha objetivo
- Cuatro elementos visuales distintos al mismo tiempo (barra plan, barra real, marcador plan, marcador real)

**Impacto técnico:** El CSV de exportación exporta `fecha_objetivo` y `fecha_completado` pero no las fechas de las ventanas vinculadas. La exportación está incompleta en representación temporal.

**Riesgo:** Confusión operativa sobre qué representa cada elemento visual. Riesgo de datos contradictorios no detectados.

---

#### P1-02: Sin validaciones de formato en fechas de entregas

**Descripción:** Los campos `fecha_objetivo` y `fecha_completado` de la entrega son validados como `z.string().nullable().optional()` sin ninguna restricción de formato. Un string arbitrario pasaría la validación y sería persistido.

**Evidencia concreta:**
- `esquemas.ts:71-72`:
  ```typescript
  fecha_objetivo: z.string().nullable().optional(),
  fecha_completado: z.string().trim().nullable().optional(),
  ```
- Contraste con `releaseSchema` donde `fecha_programada: z.string().trim().min(10).max(20)` al menos impone longitud mínima
- La función `parsearFechaPortal` devuelve `null` para fechas inválidas, silenciando el error en lugar de reportarlo

**Impacto técnico:** Un valor como `"abc"` o `"mañana"` sería aceptado por el schema y persistido en Supabase. En el cronograma, el `parsearFechaPortal` devolvería null silenciosamente y el marcador no aparecería, sin ninguna señal al usuario.

**Riesgo:** Datos corruptos en producción que el sistema acepta sin queja pero no puede visualizar.

---

#### P1-03: Sin validación de contención temporal entre niveles

**Descripción:** No existen reglas de negocio que validen que los hijos estén temporalmente contenidos dentro de sus padres. Una entrega puede tener fechas fuera de la ventana de su iniciativa. Una iniciativa puede tener una ventana que excede cualquier rango del objetivo.

**Evidencia concreta:**
- `esquemas.ts`: ningún `superRefine` en `entregaSchema` o `iniciativaSchema` que valide contención
- `aplicacion/casos-uso/entregas.ts`: sin lógica de validación de contención al crear/editar
- `aplicacion/casos-uso/iniciativas.ts`: sin lógica de validación de contención al crear/editar

**Impacto funcional:** El cronograma puede mostrar una barra de entrega que va más allá de la barra de su iniciativa padre, o una iniciativa cuya ventana supera el rango del objetivo. Esto es visualmente incorrecto y operativamente confuso.

**Riesgo:** Erosión de la confianza en el cronograma como herramienta de planificación.

---

#### P1-04: Release puede asociarse a iniciativa Y entrega simultáneamente — ambigüedad semántica

**Descripción:** El `ReleasePm` tiene `iniciativa_id` y `entrega_id` como campos opcionales independientes. Un release puede estar asociado a ambos al mismo tiempo, creando ambigüedad sobre su nivel jerárquico real.

**Evidencia concreta:**
- `dominio/modelos.ts:610-611`:
  ```typescript
  iniciativa_id: string | null
  entrega_id: string | null
  ```
- `esquemas.ts:474-475`: ambos son `uuidOpcionalSchema` sin validación cruzada que impida tener ambos
- `PaginaCronogramaRoadmap.tsx:929-931`: la lógica del cronograma resuelve el conflicto excluyendo de la iniciativa los releases que también tienen entrega_id, pero esto es lógica ad-hoc sin respaldo en el modelo

**Impacto funcional:** La lógica de dónde mostrar el marcador del release en el cronograma es frágil: si un release tiene ambos ids, se muestra solo en la entrega (regla `!release.entrega_id`). Esto no está documentado ni validado a nivel de datos.

**Riesgo:** Un cambio en la lógica del cronograma podría duplicar marcadores o perder releases de la vista.

---

### P2 — Moderado

---

#### P2-01: El selector de años del cronograma no incluye objetivos

Los años disponibles en el cronograma se calculan a partir de ventanas, entregas y releases. Los objetivos nunca aportan información temporal al selector. Esto es consistente con el modelo pero evidencia la ausencia de temporalidad en Objetivo.

---

#### P2-02: Estado del release no validado contra fechas

Un release puede estar en estado `'lanzado'` sin tener `fecha_lanzamiento_real`, o en `'planificado'` con fecha real ya pasada. No hay validación cruzada estado↔fechas.

---

#### P2-03: Filtro de ventana en cronograma aplica solo a ventana planificada de iniciativa

El filtro `filtroVentana` en el cronograma filtra iniciativas por `ventana_planificada_id` pero no considera `ventana_real_id` ni para iniciativas (que no tienen real) ni como opción alternativa. Esto es parcialmente intencional pero podría causar confusión si se quiere ver la ventana real de entregas.

---

#### P2-04: CatalogoVentanaPm sin validación de contenido mínimo en modo temporal

Una ventana del catálogo puede existir con `fecha_inicio = null` y `fecha_fin = null`. Si se asigna a una iniciativa o entrega, esa entidad pierde toda representación temporal. No hay advertencia en el sistema.

---

#### P2-05: Función parsearFechaPortal falla silenciosamente

```typescript
function parsearFechaPortal(fecha: string | null | undefined) {
  if (!fecha) return null
  const fechaDate = new Date(fecha.includes('T') ? fecha : `${fecha}T00:00:00`)
  if (Number.isNaN(fechaDate.getTime())) return null  // ← falla silenciosa
  // ...
}
```
Fechas malformadas se tratan como "sin fecha" en lugar de reportar el error. Esto enmascara datos corruptos.

---

## 5. Inconsistencias Detectadas

### Inconsistencias de negocio

| # | Descripción |
|---|---|
| I-N-01 | El Objetivo es la entidad de mayor nivel estratégico pero la única sin temporalidad de negocio definida |
| I-N-02 | La Iniciativa tiene scoring RICE (que mide valor/esfuerzo) pero no tiene rango temporal propio para planificar ese esfuerzo |
| I-N-03 | La Entrega puede completarse (`estado='completado'`) sin registrar `fecha_completado`, perdiendo la trazabilidad de cuándo ocurrió |
| I-N-04 | Un Release puede marcarse como `'lanzado'` sin `fecha_lanzamiento_real`, creando un estado lanzado sin evidencia temporal |
| I-N-05 | Las ventanas de planificación son el único mecanismo de temporalidad de Iniciativa, pero están diseñadas como catálogo, no como fechas de planificación propias de cada entidad |

### Inconsistencias de modelado

| # | Descripción |
|---|---|
| I-M-01 | Objetivo: sin campos de fecha de ningún tipo en el modelo TypeScript |
| I-M-02 | Iniciativa: temporalidad por FK indirecta (ventana_planificada_id) pero sin fechas directas propias |
| I-M-03 | Entrega: mezcla dos paradigmas (FK ventana para rango + campo directo para punto) sin coordinación |
| I-M-04 | Release tiene `iniciativa_id` Y `entrega_id` sin restricción de unicidad o prioridad entre ellos |
| I-M-05 | La FK `etapa_id` de Iniciativa no tiene fechas asociadas en `CatalogoEtapaPm` (solo etiqueta y orden), haciendo que la etapa no tenga valor temporal tampoco |

### Inconsistencias UI/UX

| # | Descripción |
|---|---|
| I-U-01 | El cronograma muestra una barra de Objetivo que aparenta ser una planificación deliberada cuando es solo el envoltorio calculado de sus hijos |
| I-U-02 | Una iniciativa sin ventana con fechas aparece en la jerarquía de filas pero sin ninguna barra en el timeline — visualmente parece un error |
| I-U-03 | Una entrega puede tener simultáneamente dos barras (plan y real) y dos marcadores (objetivo y completado) — cuatro elementos para una sola entidad puede ser visualmente saturado |
| I-U-04 | El campo `rangoFechas` en la columna de jerarquía solo muestra fechas del segmento principal del objetivo, que son inferidas, no planificadas |
| I-U-05 | Los marcadores de release se muestran en la fila de la iniciativa o la entrega según vínculo, pero no existe una fila propia para releases en el cronograma |

### Inconsistencias contractuales

| # | Descripción |
|---|---|
| I-C-01 | `fecha_objetivo` en entrega: `z.string().nullable().optional()` acepta cualquier string; otros campos de fecha (releases) usan `min(10)` para forzar formato mínimo |
| I-C-02 | `fecha_completado` acepta string vacío (`z.string().trim().nullable().optional()`), que luego se normaliza a null en el repositorio — el comportamiento es correcto pero el contrato es ambiguo |
| I-C-03 | `fecha_programada` en release es requerida con `min(10)` pero no valida que sea una fecha ISO válida (solo longitud mínima) |

### Inconsistencias de persistencia

| # | Descripción |
|---|---|
| I-P-01 | Supabase puede recibir strings no-ISO en campos de fecha de entrega sin que la aplicación lo detecte |
| I-P-02 | La función `normalizarNulos` en repositorioLanzamientos convierte strings vacíos a null, pero no hay equivalente verificado en todos los repositorios |
| I-P-03 | No hay ningún índice de fecha conocido en las tablas de Objetivo o Iniciativa (ya que no tienen fechas), lo que no es problema hoy pero sería relevante al agregar fechas |

---

## 6. Mapa de Impacto si se Agregan Fechas

### 6.1 Impacto en front-end

#### Formularios
- **Objetivo**: Agregar `DatePicker` o `input[type=date]` para `fecha_inicio` y `fecha_fin` (o `fecha_objetivo`). Bajo riesgo si son opcionales.
- **Iniciativa**: Agregar campos de fecha directos si se quiere eliminar dependencia total de ventanas. Los formularios de RICE no necesitan modificación.
- **Sin impacto directo en**: formularios de Release (ya tienen fechas completas), formularios de Seguimiento (ya tienen fecha_registro).

#### Tipos TypeScript
- `Objetivo`: agregar `fecha_inicio?: string | null` y `fecha_fin?: string | null`
- `Iniciativa`: agregar `fecha_inicio?: string | null` y `fecha_fin?: string | null`
- Afecta: componentes que desestructuran o mapean estos tipos, aunque son pocos

#### Tablas y listados
- Las páginas de listado (`PaginaObjetivosRoadmap.tsx`, `PaginaIniciativasRoadmap.tsx`) necesitarán columnas de fecha nuevas si se quiere mostrarlas
- Los filtros de fecha existentes en Entregas son modelo para replicar en Iniciativas/Objetivos

#### Filtros
- El filtro por ventana del cronograma podría complementarse con filtro por fechas de objetivo/iniciativa si estos tuvieran fechas propias
- El selector de años disponibles en el cronograma debería incluir años de fechas de Objetivo e Iniciativa

#### Cronograma
- La función `construirFilaObjetivo` necesita modificarse para usar `fecha_inicio`/`fecha_fin` propias del objetivo en lugar de solo la agregación de hijos
- La función `calcularSegmentosIniciativa` necesita poder usar fechas directas además de ventana
- El `segmentoObjetivo` no debería ser `null` cuando el objetivo tiene fechas propias, aunque no tenga hijos en el rango

#### Exportaciones CSV
- Las columnas de fecha en objetivos y iniciativas no existen actualmente en los exports. Habría que agregar `ColumnaCsv` correspondientes
- Riesgo bajo: la función `exportarCsv` es genérica y solo requiere definir las columnas

#### Compatibilidad de UI
- Si los nuevos campos son opcionales, no se rompe ningún render existente
- La barra del objetivo en el cronograma puede cambiar de comportamiento (usar fechas propias en lugar de agregar hijos) — requiere decisión de diseño

---

### 6.2 Impacto en back-end

#### Endpoints/Repositorios
- `repositorioObjetivos.ts`: agregar campos al INSERT/UPDATE
- `repositorioIniciativas.ts`: agregar campos al INSERT/UPDATE
- Sin cambios necesarios en repositorios de Entrega, Release o Seguimiento

#### DTOs / Tipos de entrada
- Definir `ObjetivoEntrada` y `IniciativaEntrada` con los nuevos campos opcionales
- Los repositorios usan actualmente inferencia de tipos Zod (`z.infer<typeof objetivoSchema>`), por lo que cambiar el schema actualiza el tipo automáticamente

#### Validaciones
- Agregar `superRefine` en `objetivoSchema` para: `fecha_inicio <= fecha_fin` (si ambas presentes)
- Agregar `superRefine` en `iniciativaSchema` para: `fecha_inicio <= fecha_fin` (si ambas presentes)
- Considerar validación de formato ISO (al menos `min(10)` como en fecha_programada de Release)

#### Entidades
- Supabase actualiza automáticamente al agregar columnas nullables (no requiere deploy separado de cliente)

#### Contratos
- Si los campos son opcionales en Zod y nullables en DB: **sin ruptura de compatibilidad hacia atrás**
- Clientes existentes que no envíen los campos recibirán null por defecto

---

### 6.3 Impacto en persistencia

#### Tablas y columnas nuevas necesarias

**Tabla `objetivos`:**
```sql
ALTER TABLE objetivos ADD COLUMN fecha_inicio DATE NULL;
ALTER TABLE objetivos ADD COLUMN fecha_fin DATE NULL;
```

**Tabla `iniciativas`:**
```sql
ALTER TABLE iniciativas ADD COLUMN fecha_inicio DATE NULL;
ALTER TABLE iniciativas ADD COLUMN fecha_fin DATE NULL;
```

#### Migración de datos
- **Backfill NO requerido** si los campos son opcionales (null es el default)
- Los registros existentes quedan con `fecha_inicio = null`, `fecha_fin = null` — válido y compatible
- No hay datos viejos que queden "rotos" por la adición

#### Datos existentes en producción
- Sin riesgo de corrupción
- Sin pérdida de información existente
- La adición de columnas nullables en PostgreSQL es una operación DDL rápida y no bloqueante en tablas pequeñas-medianas

#### Formato de fecha
- Consistencia recomendada: usar `DATE` en Postgres (no `TIMESTAMP`) para fechas sin hora
- Actualmente la Entrega usa strings ISO (`YYYY-MM-DD`) — mantener consistencia

---

### 6.4 Impacto en operación

#### Producción
- La migración DDL (ADD COLUMN NULL) es de bajísimo riesgo en PostgreSQL / Supabase
- No requiere downtime si se hace como columna nullable sin DEFAULT computado
- Los registros existentes no se modifican

#### Compatibilidad
- Los formularios existentes no capturan las nuevas fechas → los registros quedan con null → comportamiento idéntico al actual
- Los tipos TypeScript son retrocompatibles si los campos son opcionales (`?`)

#### Riesgo de despliegue
- **Bajo** si la estrategia es: primero DB (nullable), luego tipos + schema, luego UI de captura
- **Medio** si se intenta hacer todo en un único deploy sin probar el cronograma actualizado

#### Deuda técnica expuesta
- Al agregar temporalidad real, se evidenciará que muchos objetivos e iniciativas quedarán sin fechas (datos históricos vacíos)
- El cronograma podría "degradarse" visualmente en objetivos que pierdan su barra agregada y no tengan fechas propias aún
- Habrá una fase intermedia donde el cronograma es menos completo mientras los usuarios completan las fechas

---

## 7. Validación de Hipótesis

| Hipótesis | Resultado | Evidencia | Comentario |
|---|---|---|---|
| H1: Objetivo debería tener temporalidad explícita propia | **Confirmada** | `modelos.ts:6-14` sin ningún campo de fecha; cronograma computa su barra desde hijos | El modelo actual no soporta planificación temporal de objetivos |
| H2: Iniciativa debería tener rango temporal explícito y no depender solo de ventana | **Confirmada parcialmente** | La dependencia de ventana es funcional pero frágil: window nullable, fechas de ventana nullables | La ventana es un mecanismo válido pero insuficiente como único recurso temporal |
| H3: Entrega debería mantenerse como unidad verificable con fecha objetivo y/o rango | **Confirmada** | `modelos.ts:34-47` tiene `fecha_objetivo` y `fecha_completado`; funcionan correctamente como marcadores | La entrega ya tiene el mejor modelo temporal del roadmap, aunque con brechas de validación |
| H4: Los hijos deberían quedar contenidos temporalmente dentro del padre | **Confirmada como ausente** | Ningún `superRefine` ni validación de negocio implementa contención; el cronograma no alerta si una entrega sale de su iniciativa | La contención temporal no existe en ninguna capa del sistema |
| H5: Release no debe modelarse como entregable, sino como hito | **Confirmada** | `PaginaCronogramaRoadmap.tsx:361-363` — release siempre es `MarcadorCronograma` (punto), nunca `SegmentoCronograma` (barra); semánticamente correcto | El release está correctamente modelado como hito en el cronograma |
| H6: Roadmap y Releases deben conectarse pero no mezclarse semánticamente | **Parcialmente confirmada** | Release tiene `iniciativa_id` y `entrega_id` como FKs opcionales sin restricción de unicidad o prioridad — hay ambigüedad cuando ambas están presentes | La separación conceptual existe pero el vínculo bidireccional no está bien gobernado |
| H7: El cronograma podría estar mostrando más madurez temporal de la que el modelo soporta | **Confirmada** | La barra del objetivo es inferida, no planificada; iniciativas sin ventana con fechas son invisibles; la complejidad visual supera la solidez del modelo | El cronograma es más sofisticado visualmente que el modelo de datos que lo respalda |
| H8: Agregar fechas sin auditoría previa podría romper contratos, UI o consistencia de datos | **Confirmada como riesgo real pero manejable** | Los tipos y schemas son el vector de ruptura principal; la DB acepta columnas nullables sin problema | La adición requiere coordinación entre capas pero no es intrínsecamente peligrosa si se hace con plan |

---

## 8. Modelo Objetivo Recomendado

> Nota: Esta sección propone el modelo funcional sin implementar código. Los nombres de campos son sugeridos.

### 8.1 Objetivo

**Fechas que debería tener:**

| Campo | Tipo | Obligatoriedad | Descripción |
|---|---|---|---|
| `fecha_inicio` | `DATE` (string ISO) | Opcional en fase 1, recomendable a largo plazo | Inicio planificado del objetivo estratégico |
| `fecha_fin` | `DATE` (string ISO) | Opcional en fase 1, recomendable a largo plazo | Cierre planificado del objetivo estratégico |

**Visualización recomendada:**
- En el cronograma: barra gruesa de color slate/azul oscuro que representa el rango planificado propio (no inferido)
- Si tiene fechas propias: mostrar barra propia + mantener el agregado de hijos como barra secundaria más delgada (para ver si los hijos "caben" en el objetivo)
- Si no tiene fechas propias: mantener comportamiento actual (barra inferida) con una indicación visual de que el rango es agregado

---

### 8.2 Iniciativa

**Fechas que debería tener:**

| Campo | Tipo | Obligatoriedad | Descripción |
|---|---|---|---|
| `fecha_inicio` | `DATE` (string ISO) | Opcional en fase 1 | Inicio planificado explícito de la iniciativa |
| `fecha_fin` | `DATE` (string ISO) | Opcional en fase 1 | Fin planificado explícito de la iniciativa |

**Relación con ventana:**
Las fechas directas deben **complementar**, no reemplazar, la ventana planificada. La jerarquía de precedencia sugerida:
1. Si la iniciativa tiene `fecha_inicio`/`fecha_fin` propias → usar esas
2. Si no tiene propias pero tiene ventana con fechas → usar las fechas de la ventana
3. Si no tiene ninguna → invisible en el cronograma (con indicador en jerarquía)

**Visualización recomendada:**
- Barra cyan cuando el rango viene de fechas propias
- Barra cyan con patrón punteado/borde diferente cuando el rango viene de ventana
- Indicador textual en la celda de jerarquía que diga "Ventana: Q1 2025" o "Planificada: ene – mar 2025" según origen

---

### 8.3 Entrega

**Fechas que ya tiene y deben mantenerse:**

| Campo | Estado actual | Recomendación |
|---|---|---|
| `ventana_planificada_id` | FK opcional | Mantener como fuente de barra planificada |
| `ventana_real_id` | FK opcional | Mantener como fuente de barra real |
| `fecha_objetivo` | String nullable | Mantener pero agregar validación de formato ISO |
| `fecha_completado` | String nullable | Mantener pero agregar validación: `>= fecha_objetivo` si ambas presentes |

**Adicionalmente recomendado:**
Validar que `fecha_objetivo` esté dentro del rango de la `ventana_planificada_id` si ambas existen (warning, no error bloqueante).

**Visualización recomendada:** La actual es la más completa. Reducir saturación considerando mostrar solo la barra de mayor relevancia según estado:
- Si `estado = 'completado'`: priorizar barra real (emerald) sobre plan (amber)
- Si `estado != 'completado'`: mostrar plan como primario

---

### 8.4 Release

**Cómo debe convivir con roadmap:**
El Release es un hito de lanzamiento gobernado, no un entregable. Debe mantenerse separado del Roadmap en su módulo propio (Lanzamientos), pero vinculado semánticamente al Roadmap a través de los vínculos `iniciativa_id` y `entrega_id`.

**Qué tipo de entidad es:**
Hito puntual con estado de ciclo de vida (borrador → planificado → listo → lanzado → cerrado/revertido). Tiene un "plan" (fecha_programada) y un "real" (fecha_lanzamiento_real).

**Cómo debe verse en el cronograma:**
- Marcador puntual (círculo), no barra — mantener comportamiento actual
- El marcador negro para planificado, verde para ejecutado — mantener visual actual
- Considerar una fila propia de "Releases" al pie del cronograma (fuera de la jerarquía de objetivo/iniciativa/entrega) para visión ejecutiva de hitos de lanzamiento sin mezclar con entregas

**Campos temporales suficientes:** Los actuales (`fecha_programada` requerida, `fecha_lanzamiento_real` opcional) son correctos y suficientes.

**Vínculo con jerarquía:**
- Mantener `iniciativa_id` y `entrega_id`
- Agregar regla de negocio: si tiene `entrega_id`, el `iniciativa_id` debería corresponder a la iniciativa de esa entrega (validación de consistencia referencial semántica)
- Considerar hacer mutuamente excluyentes (`iniciativa_id` O `entrega_id`, no ambos) para eliminar ambigüedad

---

## 9. Reglas de Negocio Recomendadas

### Reglas de contención temporal

| Regla | Tipo | Prioridad |
|---|---|---|
| `Objetivo.fecha_inicio <= Objetivo.fecha_fin` (si ambas presentes) | Validación Zod | Alta |
| `Iniciativa.fecha_inicio <= Iniciativa.fecha_fin` (si ambas presentes) | Validación Zod | Alta |
| `Iniciativa.fecha_inicio >= Objetivo.fecha_inicio` (soft rule, warning) | UI warning | Media |
| `Iniciativa.fecha_fin <= Objetivo.fecha_fin` (soft rule, warning) | UI warning | Media |
| `Entrega.fecha_objetivo` dentro del rango de `ventana_planificada` (soft rule) | UI warning | Baja |
| `Entrega.fecha_completado >= Entrega.fecha_objetivo` (si ambas presentes) | Validación Zod | Alta |

### Convivencia entre ventana y fechas explícitas

- Las ventanas de planificación (`CatalogoVentanaPm`) son un mecanismo de categorización temporal gruesa
- Las fechas directas en Iniciativa y Entrega son la planificación precisa
- Cuando ambas existen, las fechas directas tienen precedencia para visualización
- La ventana sigue siendo útil como etiqueta y para filtrado por categoría

### Diferencia plan / real / objetivo

| Término | Significado | Entidad |
|---|---|---|
| Plan | Rango planificado antes de ejecutar | Iniciativa (ventana), Entrega (ventana planificada) |
| Real | Rango o fecha en que ocurrió | Entrega (ventana_real_id, fecha_completado), Release (fecha_lanzamiento_real) |
| Objetivo | Fecha meta comprometida | Entrega (fecha_objetivo) |
| Hito | Fecha puntual de lanzamiento | Release (fecha_programada / fecha_lanzamiento_real) |

### Diferencia entre delivery y lanzamiento

- **Entrega (delivery)**: resultado de trabajo interno, se completa cuando el equipo termina su trabajo. Tiene rango de ejecución.
- **Release (lanzamiento)**: publicación gobernada hacia usuarios o sistemas externos. Es un hito puntual con checklist de salida y aprobación.
- Un Release puede referenciar una Entrega (el trabajo que está siendo lanzado), pero no son la misma entidad.

### Estados de release vs estados de ejecución

- Los estados de Roadmap (`pendiente`, `en_progreso`, `completado`) describen la **ejecución del trabajo**
- Los estados de Release (`borrador`, `planificado`, `listo_para_salida`, `lanzado`, `revertido`, `cerrado`) describen el **ciclo de gobernanza del lanzamiento**
- Estos dos vocabularios de estados NO deben mezclarse

### Validaciones compatibles con producción

- Todas las nuevas validaciones sobre campos nuevos deben ser `optional()` en el schema Zod para no romper registros existentes que no tengan esos campos
- Las validaciones cruzadas entre fechas nuevas (contención) deben aplicarse solo cuando ambos campos están presentes (`if (a && b) { validate }`)
- Las reglas de contención entre niveles deben ser warnings en UI, no errores bloqueantes, en la fase inicial

---

## 10. Plan de Evolución Seguro

### Fase 0 — Preparación (sin cambios en producción)

**Objetivo:** Asegurar que el equipo tiene claridad del estado actual antes de tocar código.

**Qué incluye:**
- Documentar el estado actual del modelo (este informe sirve de base)
- Definir formalmente qué fechas se agregan a Objetivo e Iniciativa
- Definir si los campos serán opcionales o requeridos en la versión final
- Preparar migrations SQL para revisión
- Establecer convención de formato de fecha (recomendado: `DATE` en Supabase = string `YYYY-MM-DD` en TypeScript)

**Riesgos:** Ninguno en producción
**Mitigación:** N/A
**Rompe compatibilidad:** No

---

### Fase 1 — Compatibilidad mínima (bajo riesgo)

**Objetivo:** Agregar las columnas a la base de datos sin tocar frontend ni validaciones, garantizando que nada se rompe.

**Qué tocaría:**
- Migración DDL en Supabase: `ALTER TABLE objetivos ADD COLUMN fecha_inicio DATE NULL` + `fecha_fin`
- Migración DDL en Supabase: `ALTER TABLE iniciativas ADD COLUMN fecha_inicio DATE NULL` + `fecha_fin`
- Actualizar interfaces TypeScript en `dominio/modelos.ts` con los campos opcionales (`fecha_inicio?: string | null`)
- Actualizar schemas Zod en `esquemas.ts` con los campos opcionales sin validación cruzada aún

**Riesgos:** Muy bajo. Columnas nullables no afectan registros existentes
**Mitigación:** Hacer la migración primero, verificar que el sistema sigue funcionando exactamente igual
**Rompe compatibilidad:** No

---

### Fase 2 — Evolución de modelo (riesgo medio)

**Objetivo:** Agregar captura de fechas en formularios sin aún cambiar la lógica del cronograma.

**Qué tocaría:**
- Formulario de creación/edición de Objetivo: agregar `DatePicker` para `fecha_inicio` / `fecha_fin`
- Formulario de creación/edición de Iniciativa: agregar `DatePicker` para `fecha_inicio` / `fecha_fin`
- Repositorios de Objetivo e Iniciativa: incluir los nuevos campos en INSERT/UPDATE
- Columnas de fecha en listados de Objetivo e Iniciativa (si se desea mostrarlas)
- Agregar validación Zod `fecha_inicio <= fecha_fin` en ambos schemas
- Agregar validación de formato ISO a `fecha_objetivo` y `fecha_completado` de Entrega

**Riesgos:**
- El formulario de Iniciativa ya es complejo (RICE). Agregar DatePicker requiere diseño UX cuidadoso
- Si la validación Zod de fechas de Entrega se endurece, registros existentes con strings no-ISO quedarán inválidos al editar

**Mitigación:**
- Hacer los nuevos campos completamente opcionales en formulario (placeholder: "Sin fecha")
- Para la validación de Entrega: hacer solo el formato de nuevos inputs, no retroactivamente validar existentes
- No tocar la lógica del cronograma en esta fase

**Rompe compatibilidad:** No si todos los campos son opcionales

---

### Fase 3 — Ajuste del cronograma (riesgo medio-alto)

**Objetivo:** Actualizar el cronograma para usar las fechas propias de Objetivo e Iniciativa cuando existen.

**Qué tocaría:**
- `PaginaCronogramaRoadmap.tsx` (>1000 líneas): modificar `construirFilaObjetivo` para usar fechas propias si existen
- `calcularSegmentosIniciativa`: usar fechas directas con fallback a ventana
- Lógica del selector de años: incluir años de fechas de Objetivo e Iniciativa
- Decisión de diseño: ¿el segmento del objetivo es propio O agregado O ambos superpuestos?
- Potencialmente: agregar fila de releases al pie del cronograma (si se decide separar releases de jerarquía)

**Riesgos:**
- El cronograma es un componente de >1000 líneas con lógica compleja; cualquier cambio requiere prueba exhaustiva
- Cambiar la lógica de la barra del objetivo puede hacer que objetivos sin fechas propias desaparezcan o cambien visualmente
- Riesgo de regresión en filtros temporales del cronograma

**Mitigación:**
- Hacer los cambios con lógica de fallback: si tiene fechas propias, usar propias; si no, usar lógica actual agregada
- Testear con datos reales antes de desplegar a producción
- Comunicar el cambio visual a los usuarios (la barra del objetivo puede cambiar de longitud)

**Rompe compatibilidad:** No en datos, sí potencialmente en apariencia visual

---

### Fase 4 — Endurecimiento de validaciones (riesgo bajo)

**Objetivo:** Agregar reglas de negocio más estrictas una vez que los datos tienen cobertura suficiente.

**Qué tocaría:**
- Validación de contención temporal entre niveles (warning en UI)
- Validar que `estado='completado'` en Entrega requiera `fecha_completado` (si se decide así)
- Validar que `estado='lanzado'` en Release requiera `fecha_lanzamiento_real`
- Refinar validación entre `iniciativa_id` y `entrega_id` en Release (no permitir ambos, o validar consistencia)
- Considerar audit trail de cambios de estado con fecha

**Riesgos:**
- Las nuevas validaciones pueden rechazar registros históricos que no cumplen las reglas
- Si se endurece la edición de registros existentes, usuarios pueden quedar bloqueados

**Mitigación:**
- Aplicar reglas estrictas solo en creación de nuevos registros
- Para edición de registros existentes: mostrar advertencias pero no bloquear hasta una fecha de corte definida

**Rompe compatibilidad:** Potencialmente en edición de registros históricos si se endurece la validación

---

## 11. Recomendación Final

### ¿Qué conviene hacer primero?

**Ejecutar Fase 0 y Fase 1 juntas.**

La Fase 0 no toca producción y la Fase 1 (migración DDL con columnas nullables) es de bajísimo riesgo. Agregar las columnas vacías primero garantiza que el backend puede recibir fechas inmediatamente sin necesidad de nuevos despliegues urgentes. Adicionalmente, corregir la validación de formato de `fecha_objetivo` y `fecha_completado` de Entrega es de riesgo bajo y alta prioridad (P1-02).

### ¿Qué no conviene hacer todavía?

**No tocar la lógica del cronograma (Fase 3) hasta tener datos reales de fechas.**

El cronograma es el componente más sensible del sistema. Cambiar su lógica sin tener datos de fechas de Objetivo e Iniciativa producirá una regresión visual: muchos objetivos quedarán sin barra (ya que sus fechas propias serán null), haciendo el cronograma más vacío que antes. Se debe esperar a que los usuarios completen las fechas a través de la nueva UI (Fase 2) antes de cambiar la lógica de visualización (Fase 3).

### ¿Cuál es el camino más seguro?

**Fase 0 → Fase 1 → Fase 2 → validar cobertura de datos → Fase 3 → Fase 4**

Con énfasis en que Fase 2 (formularios) debe llevarse al menos 2-4 semanas de uso productivo antes de activar Fase 3 (cronograma actualizado), para que los usuarios existentes hayan podido completar fechas en sus registros.

### ¿La evolución es recomendable en el estado actual?

**Sí, con plan. No sin él.**

El sistema está en un estado técnico sano (arquitectura limpia, código legible, separación de capas correcta). La deuda temporal es real pero no es una crisis. Agregar fechas a Objetivo e Iniciativa es la evolución correcta y necesaria para que el cronograma tenga integridad semántica. Sin esta evolución, el cronograma seguirá siendo una herramienta visual dependiente de que los usuarios mantengan coherencia manual entre sus datos.

### Cuál es la mejor decisión técnica-funcional

La mejor decisión es implementar temporalidad **explícita y opcional** en Objetivo e Iniciativa (Fase 1+2), con un plan de transición que:
1. No rompe nada existente en producción
2. Permite adopción gradual por parte de los usuarios
3. Refuerza la integridad del cronograma sin crear rigidez prematura
4. Mantiene la separación semántica entre Roadmap (ejecución) y Releases (lanzamiento gobernado)

El riesgo más alto no es técnico, sino **de regresión visual** en el cronograma si se actúa demasiado rápido en Fase 3. Eso es manejable con un plan de despliegue incremental.

---

## 12. Anexo de Evidencias

### Archivos de dominio

| Archivo | Líneas clave | Hallazgo |
|---|---|---|
| `src/dominio/modelos.ts:6-14` | Interface `Objetivo` | Sin ningún campo de fecha de usuario |
| `src/dominio/modelos.ts:16-32` | Interface `Iniciativa` | Sin fechas directas; solo FK a ventana |
| `src/dominio/modelos.ts:34-47` | Interface `Entrega` | 4 campos temporales distintos |
| `src/dominio/modelos.ts:49-60` | Interface `CatalogoVentanaPm` | `fecha_inicio` y `fecha_fin` nullables |
| `src/dominio/modelos.ts:601-624` | Interface `ReleasePm` | `fecha_programada` requerida, `fecha_lanzamiento_real` opcional |
| `src/dominio/modelos.ts:639-651` | Interface `ReleaseSeguimientoPm` | `fecha_registro` requerida |

### Archivos de validación

| Archivo | Líneas clave | Hallazgo |
|---|---|---|
| `src/compartido/validacion/esquemas.ts:44-49` | `objetivoSchema` | Sin campos de fecha |
| `src/compartido/validacion/esquemas.ts:51-63` | `iniciativaSchema` | Sin campos de fecha directos |
| `src/compartido/validacion/esquemas.ts:65-75` | `entregaSchema` | `fecha_objetivo` y `fecha_completado` como `z.string().nullable().optional()` sin validación de formato |
| `src/compartido/validacion/esquemas.ts:465-495` | `releaseSchema` | Validación cruzada `fecha_lanzamiento_real >= fecha_programada` implementada correctamente |
| `src/compartido/validacion/esquemas.ts:37` | `fechaCatalogoSchema` | `z.string().trim().nullable().optional()` — las fechas de ventana también sin validación de formato ISO |

### Archivos del cronograma

| Archivo | Líneas clave | Hallazgo |
|---|---|---|
| `PaginaCronogramaRoadmap.tsx:198-210` | `parsearFechaPortal` | Falla silenciosa en fechas inválidas |
| `PaginaCronogramaRoadmap.tsx:361-363` | `fechaRelease` | Release siempre como hito puntual (correcto) |
| `PaginaCronogramaRoadmap.tsx:370-391` | `obtenerRangoVentana` | Devuelve null si la ventana no tiene ambas fechas |
| `PaginaCronogramaRoadmap.tsx:590-627` | `aniosDisponibles` | Los años del selector no incluyen años de Objetivo |
| `PaginaCronogramaRoadmap.tsx:718-747` | Filtrado de iniciativas | Solo considera ventana planificada, no fechas directas |
| `PaginaCronogramaRoadmap.tsx:927-948` | `calcularSegmentosIniciativa` | Barra de iniciativa depende exclusivamente de la ventana con fechas |
| `PaginaCronogramaRoadmap.tsx:975-1024` | `construirFilaObjetivo` | Barra del objetivo es 100% inferida de hijos |
| `PaginaCronogramaRoadmap.tsx:980-988` | Segmento objetivo | `min(hijos.inicio)` / `max(hijos.fin)` sin ningún dato propio |

### Repositorios y persistencia

| Archivo | Hallazgo |
|---|---|
| `repositorioLanzamientos.ts:13-17` | `normalizarNulos` convierte strings vacíos a null — buena práctica |
| Orden de queries en repositorioLanzamientos | Releases ordenados por `fecha_programada DESC` — confirma relevancia temporal |
| `repositorioObjetivos.ts` | Sin manejo de fechas en ningún método |
| `repositorioIniciativas.ts` | Sin manejo de fechas en ningún método |

### Utilidades de fecha

| Archivo | Función | Hallazgo |
|---|---|---|
| `formatoPortal.ts` | `normalizarFechaPortal` | Convierte ISO a `YYYY-MM-DD` |
| `formatoPortal.ts` | `formatearFechaCorta` | Locale `es-PE`, formato "14 ene 2024" |
| `formatoPortal.ts` | `formatearFechaHoraCorta` | Con hora "14 ene 2024 15:30" |
| `csv.ts` | `exportarCsv` | Genérico, sin lógica de fecha específica |

### Reglas de validación existentes en el sistema (por referencia)

| Schema | Regla temporal |
|---|---|
| `catalogoVentanaPmSchema` | `fecha_inicio <= fecha_fin` |
| `releaseSchema` | `fecha_lanzamiento_real >= fecha_programada` |
| `bugSchema` (inferido) | `fecha_resolucion >= fecha_reporte` |
| `objetivoSchema` | Ninguna |
| `iniciativaSchema` | Ninguna |
| `entregaSchema` | Ninguna (brecha crítica) |

---

*Fin del informe de auditoría. Documento generado el 2026-03-16. Ningún archivo fue modificado durante la auditoría.*
