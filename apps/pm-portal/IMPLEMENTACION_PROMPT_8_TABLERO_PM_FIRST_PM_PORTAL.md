# IMPLEMENTACIÓN — Tablero PM-First
**Fecha:** 2026-03-15
**Alcance:** 1 archivo — reescritura completa de `PaginaTablero.tsx`
**Rama:** pm-construccion

---

## 1. Objetivo

Convertir el Tablero de un panel técnico/DevOps a un dashboard ejecutivo PM-first. El PM debe poder leer de un vistazo el estado del producto, ver las alertas que requieren acción y luego, de forma secundaria, acceder a datos de infraestructura.

---

## 2. Qué se investigó antes de implementar

| Fuente | Qué devuelve | Uso en tablero |
|---|---|---|
| `listarPeriodosEstrategicos()` | `PeriodoEstrategicoPm[]` con campo `activo: boolean` | Período activo + fechas |
| `obtenerResumenOperacion()` | `{ bugs, mejoras, deudas, bloqueos, lecciones }` | Bugs abiertos + bloqueos |
| `obtenerResumenGobierno()` | `{ stakeholders, riesgos, dependencias }` | Riesgos altos/críticos + dependencias bloqueantes |
| `obtenerContadoresLanzamientos()` | `{ releases, checklist, seguimientos }` | Releases próximos |
| `leerEstadoDespliegue()` | Deploy info | Conservado, bloque técnico |
| `obtenerMetricasPosthogAutenticado()` | Métricas PostHog | Conservado, bloque técnico |
| `clienteSupabase` health ping | Supabase OK/Error | Conservado, bloque técnico |

**Tipos clave confirmados:**
- `BugPm.estado`: `'nuevo' | 'triage' | 'en_progreso' | 'resuelto' | 'cerrado'`
- `BugPm.prioridad`: `PrioridadRegistro = 'baja' | 'media' | 'alta'`
- `BloqueoPm.estado`: `'abierto' | 'en_seguimiento' | 'escalado' | 'resuelto'`
- `RiesgoPm.criticidad`: `CriticidadGobiernoPm = 'baja' | 'media' | 'alta' | 'critica'`
- `RiesgoPm.estado`: `'identificado' | 'en_mitigacion' | 'monitoreo' | 'cerrado'`
- `DependenciaPm.estado`: `'abierta' | 'en_seguimiento' | 'resuelta' | 'bloqueante'`
- `ReleasePm.estado`: `EstadoReleasePm` — relevante: `'cerrado'`

---

## 3. Arquitectura del nuevo tablero

### Bloque 1 — Encabezado ejecutivo
Subtítulo corregido: "Visión ejecutiva del estado actual del producto y señales operativas activas." Sin referencias a despliegue ni DevOps.

### Bloque 2 — Snapshot PM (5 tarjetas)
Carga en paralelo con `Promise.all([listarPeriodosEstrategicos, obtenerResumenOperacion, obtenerResumenGobierno, obtenerContadoresLanzamientos])`.

| Tarjeta | Señal | Color condicional |
|---|---|---|
| Periodo activo | `periodos.find(p => p.activo)` — nombre + fechas | — |
| Releases próximos | `releases.filter(r => fecha_programada >= hoy && estado !== 'cerrado').length` | — |
| Bugs abiertos | `bugs.filter(b => estado not in resuelto\|cerrado).length` + alta prioridad count | — |
| Bloqueos activos | `bloqueos.filter(b => estado !== 'resuelto').length` | Rojo si > 0 |
| Riesgos altos/críticos | `riesgos.filter(r => estado !== 'cerrado' && criticidad in 'alta'\|'critica').length` | Ámbar si > 0 |

### Bloque 3 — Atención inmediata (condicional)
Solo se muestra si hay bloqueos activos o bugs de alta prioridad (ambos limitados a 5 ítems). Incluye link a las páginas respectivas.

### Bloque 4 — Salud ejecutiva
Señal derivada con lógica:
```
riesgo   → bloqueosActivos > 0 || dependenciasBloqueantes > 0 || riesgosAltosYCriticos > 3
atencion → bugsAltaPrioridad > 0 || riesgosAltosYCriticos > 0
estable  → ninguno de los anteriores
```
Muestra badge (verde/ámbar/rojo) + descripción en lenguaje ejecutivo + resumen de señales en una línea.

### Bloque 5 — Infraestructura y analítica (compacto)
Label "INFRAESTRUCTURA Y ANALÍTICA" en texto gris pequeño separa visualmente. Grid de 3 artículos con la misma lógica que antes pero texto reducido a `text-sm`/`text-xs`. Toda la funcionalidad PostHog (filtros, delta, meta, estado) se conserva intacta.

---

## 4. Señales computadas y almacenadas

Se evita guardar los arrays completos en estado. Se computa un objeto `SeñalesPm` con exactamente lo que necesita el UI:

```typescript
interface SeñalesPm {
  periodoActivo: { nombre: string; fechaInicio: string; fechaFin: string } | null
  releasesProximos: number
  bugsAbiertos: number
  bugsAltaPrioridad: number
  bloqueosActivos: number
  riesgosAltosYCriticos: number
  dependenciasBloqueantes: number
  bloqueosDetalle: Array<{ id: string; codigo: string; titulo: string }>  // max 5
  bugsAltaDetalle: Array<{ id: string; codigo: string; titulo: string }>  // max 5
}
```

---

## 5. Gestión del estado de carga

| Estado | Separación |
|---|---|
| `cargandoPm / errorPm` | Un solo `useEffect` para todos los datos PM (se fallan juntos o se resuelven juntos) |
| `cargandoEstado / errorEstado` | Separado, igual que antes |
| `saludSupabase / detalleSupabase` | Separado, igual que antes |
| `cargandoMetricas / errorMetricas` | Separado, igual que antes |

Los bloques 2, 3 y 4 están envueltos en `<EstadoVista cargando={cargandoPm}>`. Los bloques infra tienen su propio `EstadoVista` individual como antes.

---

## 6. Navegación

Se añadieron links a páginas PM:
- `/lanzamientos/releases` desde "Releases próximos" y tarjeta
- `/gobierno/riesgos` desde tarjeta de riesgos
- `/operacion/bloqueos` desde tarjeta de bloqueos y lista de atención

---

## 7. Archivos tocados

| Archivo | Tipo de cambio |
|---|---|
| `src/presentacion/paginas/tablero/PaginaTablero.tsx` | Reescritura completa — PM-first |

**No se tocó:** `menuPortal.ts`, router, layout, estilos globales, dominio, esquemas Zod, SQL, Supabase, ningún otro módulo.

---

## 8. SQL

❌ No. Cero cambios en base de datos.

---

## 9. Validación técnica

| Check | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores ni advertencias |
| `npm run build` | ✅ Build exitoso (285 módulos) |
| TypeScript (`tsc -b`) | ✅ Sin errores de tipos |

> Warning de chunk size (`1,336 kB`) es preexistente e irrelevante a estos cambios.

---

## 10. Qué no se hizo y por qué

| Decisión | Razón |
|---|---|
| No se usó `obtenerFuentesResumenAnalitico()` | Demasiado pesado (27 fuentes) para una vista home |
| No se importaron tipos de dominio explícitamente | TypeScript infiere los tipos desde las funciones — evita imports innecesarios |
| No se separó en subcomponentes | Un único componente es suficiente para esta complejidad; subcomponentes serían over-engineering |
| La lógica PostHog no se simplificó | Se preservó exactamente para no introducir regresiones en funcionalidad existente |
