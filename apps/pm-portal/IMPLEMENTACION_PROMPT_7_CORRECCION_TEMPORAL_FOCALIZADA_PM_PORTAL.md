# IMPLEMENTACIÓN — Corrección Temporal Focalizada
**Fecha:** 2026-03-15
**Alcance:** 4 archivos — corrección quirúrgica post-auditoría temporal
**Rama:** pm-construccion

---

## 1. Objetivo

Corregir los puntos técnicamente incorrectos o frágiles identificados en la auditoría de zona horaria (`AUDITORIA_ZONA_HORARIA_Y_CONSISTENCIA_TEMPORAL_PM_PORTAL.md`), sin abrir una refactorización mayor.

---

## 2. Qué se investigó

Antes de editar se confirmó el estado real de cada archivo:

| Archivo | Estado previo confirmado |
|---|---|
| `formatoPortal.ts` | No tenía helper para fecha+hora — solo `formatearFechaCorta` (solo fecha) |
| `PaginaTrazabilidad.tsx:118` | Usaba `formatearFechaCorta(evento.created_at)` — perdía la hora del evento |
| `repositorioHistorialCambios.ts:50,54` | Boundaries `T00:00:00` y `T23:59:59.999` sin offset → ambiguos para UTC vs Lima |
| `PaginaResumenLanzamientos.tsx:15–17` | `inicioDia` usaba `toISOString().slice(0,10)` → fecha UTC, no fecha local Lima |

---

## 3. Qué se corrigió exactamente

### A. Nuevo helper `formatearFechaHoraCorta`
**Archivo:** `src/compartido/utilidades/formatoPortal.ts`

```typescript
const formateadorFechaHoraCorta = new Intl.DateTimeFormat('es-PE', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

export function formatearFechaHoraCorta(fecha: string | null | undefined): string {
  if (!fecha) {
    return ''
  }

  const fechaDate = new Date(fecha)
  if (Number.isNaN(fechaDate.getTime())) {
    return fecha.slice(0, 16)
  }

  return formateadorFechaHoraCorta.format(fechaDate)
}
```

**Por qué no se reusa `formateadorFechaCorta`:** Los formateadores de `Intl.DateTimeFormat` se construyen una sola vez fuera de la función para evitar creación repetida en cada render. Necesitamos un formateador distinto con las opciones de hora. El patrón es el mismo que `formateadorFechaCorta`.

**Por qué no se añade `T00:00:00`:** Este helper es para timestamps de evento (`created_at`), que siempre llegan con `T` y timezone (`Z` o `+00:00`). No se debe forzar medianoche local — se preserva la hora exacta del evento.

**Salida esperada:** `"15 mar 2026, 4:05 p. m."` o formato equivalente según `Intl` de 'es-PE' con hora local del navegador.

---

### B. Trazabilidad muestra fecha y hora
**Archivo:** `src/presentacion/paginas/trazabilidad/PaginaTrazabilidad.tsx`

**Import:**
```typescript
// Antes:
import { formatearEstadoLegible, formatearFechaCorta } from '@/compartido/utilidades/formatoPortal'
// Después:
import { formatearEstadoLegible, formatearFechaHoraCorta } from '@/compartido/utilidades/formatoPortal'
```

**Encabezado de columna:**
```tsx
// Antes:
<th className="px-3 py-2">Fecha</th>
// Después:
<th className="px-3 py-2">Fecha y hora</th>
```

**Celda de dato:**
```tsx
// Antes:
<td className="px-3 py-2">{formatearFechaCorta(evento.created_at)}</td>
// Después:
<td className="px-3 py-2">{formatearFechaHoraCorta(evento.created_at)}</td>
```

**Resultado funcional:** Un admin que audita verá `"15 mar 2026, 4:05 p. m."` en lugar de `"15 mar 2026"`. La hora es en timezone del navegador (Lima), que es el comportamiento correcto y esperado.

---

### C. Filtro de historial con timezone Lima explícito
**Archivo:** `src/infraestructura/repositorios/repositorioHistorialCambios.ts`

```typescript
// Antes:
consulta = consulta.gte('created_at', `${filtros.fechaDesde}T00:00:00`)
consulta = consulta.lte('created_at', `${filtros.fechaHasta}T23:59:59.999`)

// Después:
consulta = consulta.gte('created_at', `${filtros.fechaDesde}T00:00:00-05:00`)
consulta = consulta.lte('created_at', `${filtros.fechaHasta}T23:59:59.999-05:00`)
```

**Por qué `-05:00`:** Perú no aplica horario de verano — siempre UTC-5. Hardcodear el offset es la solución más simple y correcta para este sistema mono-región. PostgreSQL recibe ahora un timestamp con timezone explícito: `'2025-03-15T00:00:00-05:00'` equivale exactamente a `'2025-03-15T05:00:00Z'`, que es la medianoche real Lima del día seleccionado por el usuario.

**Qué resuelve:** Antes, seleccionar "desde 2025-03-15" incluía registros del 14 de marzo entre las 7 PM y las 11:59 PM Lima (que son las 00:00 a 04:59 UTC del 15). Ahora el filtro empieza exactamente a las 00:00 Lima del día seleccionado.

---

### D. `hoy` y `hace30Dias` en tiempo local Lima
**Archivo:** `src/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos.tsx`

```typescript
// Antes:
function inicioDia(fecha: Date) {
  return fecha.toISOString().slice(0, 10)  // UTC — incorrecto para Lima después de 7 PM
}

// Después:
function inicioDia(fecha: Date) {
  const año = String(fecha.getFullYear())
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`  // tiempo local del navegador
}
```

**Por qué `getFullYear/getMonth/getDate`:** Estos métodos operan en el timezone local del navegador, a diferencia de `toISOString()` que siempre devuelve UTC. Para Lima (UTC-5), `new Date()` a las 8 PM Lima da `.toISOString()` = "mañana" en UTC, pero `getFullYear/getMonth/getDate` = "hoy" en Lima.

**Qué resuelve:** Antes, un release programado para "hoy" desaparecía de la sección "próximos" a partir de las 7 PM Lima porque `hoy` ya era mañana en UTC. Ahora `hoy` es siempre la fecha real del usuario.

---

## 4. Archivos tocados

| Archivo | Tipo de cambio |
|---|---|
| `src/compartido/utilidades/formatoPortal.ts` | Nuevo helper `formatearFechaHoraCorta` añadido |
| `src/presentacion/paginas/trazabilidad/PaginaTrazabilidad.tsx` | Import + encabezado + celda actualizados |
| `src/infraestructura/repositorios/repositorioHistorialCambios.ts` | Offset `-05:00` añadido a boundaries de filtro |
| `src/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos.tsx` | `inicioDia` corregida para usar tiempo local |

**No se tocó:** ningún otro módulo, `menuPortal.ts`, router, layout, estilos globales, dominio, esquemas Zod, SQL, Supabase.

---

## 5. SQL

❌ No. Cero cambios en base de datos, consultas de esquema o migraciones.

---

## 6. Validación técnica

| Check | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores ni advertencias |
| `npm run build` | ✅ Build exitoso (285 módulos) |
| TypeScript (`tsc -b`) | ✅ Sin errores de tipos |

> Warning de chunk size (`1,328 kB`) es preexistente e irrelevante a estos cambios.

---

## 7. Riesgo residual después de esta corrección

| Riesgo | Estado |
|---|---|
| Filtro de trazabilidad incluye horas del día anterior | ✅ Corregido con `-05:00` |
| `hoy` en lanzamientos basado en UTC | ✅ Corregido con tiempo local |
| Trazabilidad pierde hora del evento | ✅ Corregido con `formatearFechaHoraCorta` |
| `formatearFechaCorta` sin `timeZone` explícito | ⚪ Permanece — no impacta fechas de negocio (ver auditoría) |
| `T00:00:00` sin Z en PaginaRoadmap, PaginaTendencias | ⚪ Permanece — solo para cálculos internos; sin impacto en display ni en filtros de BD |
| Sistema frágil para multi-región | ⚪ Permanece — fuera del alcance de esta corrección puntual |

Los tres puntos marcados con ⚪ son frágiles teóricamente pero no producen errores reales en el escenario actual (usuarios en Lima, horario laboral). Se documentan como deuda técnica para una eventual fase transversal si el sistema escala a multi-región.
