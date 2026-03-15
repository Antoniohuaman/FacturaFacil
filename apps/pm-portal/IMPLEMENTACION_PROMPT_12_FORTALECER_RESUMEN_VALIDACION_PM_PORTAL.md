# IMPLEMENTACIÓN — Fase 13: Fortalecer resumen de Validación
**Fecha:** 2026-03-15
**Alcance:** 1 archivo — `PaginaValidacion.tsx`
**Rama:** pm-construccion

---

## 1. Qué se investigó

### Archivos leídos

| Archivo | Qué aportó |
|---|---|
| `PaginaValidacion.tsx` | Estado de partida: 3 KPI cards + 2 bloques secundarios |
| `validaciones.ts` (caso de uso) | `obtenerResumenValidacion()` llama al repositorio que devuelve solo 3 conteos |
| `repositorioValidaciones.ts` | `obtenerResumen()` carga planes+plantillas internamente pero descarta los arrays, devuelve solo counts; `planesActivos` usa `estado_codigo !== 'completado'` |
| `ejecucionesValidacion.ts` (caso de uso) | `listarEjecucionesValidacion()` devuelve lista completa |
| `modelos.ts` | `EjecucionValidacion.resultado` es texto libre; `EjecucionValidacion.estado_codigo` es código de catálogo dinámico; `PlanValidacion.fecha_fin` es `string | null`; `PlantillaValidacion.activo` es `boolean` |
| `PaginaEjecucionesValidacion.tsx` | Confirmó que `estado_codigo` se carga de `listarEstadosPm('validacion_ejecucion')` — catálogo dinámico, sin enum conocido |

### Métricas evaluadas

| Métrica | Confiable | Por qué |
|---|---|---|
| `planesVencidos` | ✅ Sí | `fecha_fin < hoy && estado_codigo !== 'completado'` — campos reales, 'completado' ya lo usa el repositorio |
| `plantillasActivas` | ✅ Sí | `plantilla.activo === true` — boolean explícito en el modelo |
| `totalEjecuciones` | ✅ Sí | `ejecuciones.length` — simple conteo |
| `ejecucionesUltimos30Dias` | ✅ Sí | `fecha_ejecucion >= hace30Dias` — fecha ISO string, comparación segura |
| % ejecuciones completadas | ❌ No | `estado_codigo` es catálogo dinámico — no se puede hardcodear 'completado' para ejecuciones |
| Ejecuciones con resultado negativo | ❌ No | `resultado` es texto libre (Zod: `z.string().min(3).max(4000)`) — sin enum |
| Ejecuciones rechazadas/aprobadas | ❌ No | Mismo motivo — texto libre |

### Decisión de arquitectura

En lugar de mantener `obtenerResumenValidacion()` (que carga planes+plantillas y los descarta), se reemplaza por llamadas directas a `listarPlanesValidacion()` + `listarPlantillasValidacion()` (casos de uso ya existentes). Las 3 llamadas corren en `Promise.all` — misma latencia que antes o menor (sin un nivel de indirección extra).

---

## 2. Qué se corrigió exactamente

### Carga de datos

```typescript
// Antes:
const [resumenRespuesta, ejecuciones] = await Promise.all([
  obtenerResumenValidacion(),
  listarEjecucionesValidacion()
])

// Después:
const [planesData, plantillasData, ejecucionesData] = await Promise.all([
  listarPlanesValidacion(),
  listarPlantillasValidacion(),
  listarEjecucionesValidacion()
])
```

### Estado

```typescript
// Antes:
const [resumen, setResumen] = useState<ResumenValidacionVista | null>(null)
const [ejecucionesRecientes, setEjecucionesRecientes] = useState<EjecucionValidacion[]>([])

// Después:
const [planes, setPlanes] = useState<PlanValidacion[]>([])
const [plantillas, setPlantillas] = useState<PlantillaValidacion[]>([])
const [ejecuciones, setEjecuciones] = useState<EjecucionValidacion[]>([])
```

### Señales derivadas (useMemo)

```typescript
const señales = useMemo(() => {
  const hoy = new Date().toISOString().slice(0, 10)
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return {
    totalPlanes: planes.length,
    planesActivos: planes.filter((plan) => plan.estado_codigo !== 'completado').length,
    planesVencidos: planes.filter(
      (plan) => plan.fecha_fin !== null && plan.fecha_fin < hoy && plan.estado_codigo !== 'completado'
    ).length,
    totalPlantillas: plantillas.length,
    plantillasActivas: plantillas.filter((plantilla) => plantilla.activo).length,
    totalEjecuciones: ejecuciones.length,
    ejecucionesUltimos30Dias: ejecuciones.filter((ejecucion) => ejecucion.fecha_ejecucion >= hace30Dias).length,
    ejecucionesRecientes: [...ejecuciones]
      .sort((a, b) => b.fecha_ejecucion.localeCompare(a.fecha_ejecucion))
      .slice(0, 5)
  }
}, [planes, plantillas, ejecuciones])
```

### Layout — nueva estructura

**Antes:** `md:grid-cols-3` (3 KPI cards planas) + 2 bloques inferiores.

**Después:**

**Fila 1: 4 KPI cards** (`md:grid-cols-2 xl:grid-cols-4`)
| Card | Dato principal | Subtítulo |
|---|---|---|
| Planes | `totalPlanes` | `planesActivos` activos |
| Planes vencidos | `planesVencidos` | Señal amber si > 0 / verde si = 0 |
| Plantillas | `totalPlantillas` | `plantillasActivas` activas |
| Ejecuciones | `totalEjecuciones` | `ejecucionesUltimos30Dias` en los últimos 30 días |

**Fila 2: 2 bloques** (sin cambios de estructura)
- Accesos (igual que antes)
- Últimas ejecuciones (mismo contenido, ahora ordenadas por `fecha_ejecucion` descendente)

### Señal visual para planes vencidos

Cuando `planesVencidos > 0` la card usa:
- `border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30`
- Número en `text-amber-700 dark:text-amber-400`
- Subtítulo: "Activos con fecha fin superada"

Cuando `planesVencidos === 0`:
- Estilo neutro estándar (`border-slate-200 bg-white`)
- Subtítulo: "Sin planes vencidos"

---

## 3. Archivos tocados

| Archivo | Tipo de cambio |
|---|---|
| `src/presentacion/paginas/validacion/PaginaValidacion.tsx` | Reescritura del componente — nuevas señales, nuevo grid, misma estructura de navegación |

**No se tocó:** `validaciones.ts` (caso de uso), `repositorioValidaciones.ts`, `ejecucionesValidacion.ts`, `modelos.ts`, `menuPortal.ts`, router, sidebar, layout, ningún otro módulo.

---

## 4. SQL

❌ No. Cero cambios en base de datos.

---

## 5. Validación técnica

| Check | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores ni advertencias |
| `npm run build` | ✅ Build exitoso (285 módulos) |
| TypeScript (`tsc -b`) | ✅ Sin errores de tipos |

> Warning de chunk size (`1,342 kB`) es preexistente e irrelevante.

---

## 6. Riesgo residual

| Caso | Estado |
|---|---|
| `fecha_fin` en formato distinto a ISO date | ✅ El repositorio guarda `fecha_fin || null` desde entrada Zod (tipo date), comparación ISO-string es segura |
| `estado_codigo` con valor distinto a 'completado' para planes cerrados | Riesgo mínimo: el repositorio ya usa `!== 'completado'` para `planesActivos` — consistente |
| Ejecuciones sin `fecha_ejecucion` bien formada | ✅ `fecha_ejecucion` es campo requerido en el schema Zod (`z.string()`) |
| Dark mode | ✅ Todas las clases incluyen variante `dark:` |
| Navegación interna (`NavegacionValidacion`) | ✅ Sin tocar |
| 3 llamadas en `Promise.all` vs 2 anteriores | ✅ `listarPlantillasValidacion()` reemplaza la indirección interna de `obtenerResumen()` que hacía lo mismo — igual o menor latencia total |

**Riesgo residual: ninguno significativo.**
