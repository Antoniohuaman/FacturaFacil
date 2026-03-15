# IMPLEMENTACIÓN — LIMPIEZA DE FECHAS VISIBLES EN UI
**Fecha:** 2026-03-15
**Alcance:** 22 archivos — todos los módulos del portal PM
**Rama:** pm-construccion

---

## 1. Objetivo de la mejora

Eliminar todos los casos donde una fecha se renderizaba directamente en la UI en formato técnico (`YYYY-MM-DD` o ISO timestamp), reemplazándolos con el helper de presentación `formatearFechaCorta()` que produce `"10 mar 2026"` vía `Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })`.

---

## 2. Problema UX detectado

El portal usaba `normalizarFechaPortal()` (devuelve los primeros 10 chars de cualquier ISO string → `YYYY-MM-DD`) tanto para lógica técnica (comparaciones de filtro, columnas CSV) como por error para display de UI. Además, varios campos de fecha se renderizaban directamente como `{item.fecha}` sin ningún formateo.

Resultado visible para el usuario: fechas como `2026-03-01` en tablas, opciones de selects y listas de acceso rápido, en lugar de `01 mar 2026`.

---

## 3. Distinción de usos (regla de oro)

| Uso | Función | Motivo |
|---|---|---|
| Display en UI (tabla, badge, opción, lista) | `formatearFechaCorta()` | Legible por humanos |
| Comparación en filtro (`>= hace30Dias`) | `normalizarFechaPortal()` | Comparación de strings ISO es correcta con YYYY-MM-DD |
| Columna de CSV export | `normalizarFechaPortal()` | CSV necesita formato estándar técnico |
| `type="date"` input | valor raw | El input espera YYYY-MM-DD |

---

## 4. Archivos modificados

### Grupo A — Reemplazar `normalizarFechaPortal` por `formatearFechaCorta` (sin usos técnicos residuales)

| Archivo | Cambios |
|---|---|
| `paginas/operacion/PaginaResumenOperacion.tsx` | Import swap; `item.fecha` → display |
| `paginas/operacion/mejoras/PaginaMejoras.tsx` | Import swap; `mejora.fecha_solicitud`, `mejora.fecha_cierre` |
| `paginas/gobierno/PaginaResumenGobierno.tsx` | Import swap; `item.fecha` → display |
| `paginas/gobierno/dependencias/PaginaDependencias.tsx` | Import swap; `fecha_identificacion`, `fecha_objetivo` |
| `paginas/gobierno/riesgos/PaginaRiesgos.tsx` | Import swap; `riesgo.fecha_objetivo` + `auditoria.fecha_auditoria` en option |
| `paginas/operacion/deuda-tecnica/PaginaDeudaTecnica.tsx` | Import swap; `fecha_identificacion`, `fecha_objetivo` |
| `paginas/operacion/bloqueos/PaginaBloqueos.tsx` | Import swap; `fecha_reporte`, `fecha_resolucion` |
| `paginas/operacion/lecciones/PaginaLeccionesAprendidas.tsx` | Import swap; Map de auditorías (useMemo + 2 selects) + `leccion.fecha_leccion` |
| `paginas/trazabilidad/PaginaTrazabilidad.tsx` | Import swap (con `formatearEstadoLegible`); `evento.created_at` |
| `paginas/requerimientos/PaginaResumenRequerimientos.tsx` | Import swap (con `formatearEstadoLegible`); `registro.fecha` |
| `paginas/operacion/bugs/PaginaBugs.tsx` | Import swap; Map de auditorías + 2 selects + `fecha_reporte`, `fecha_resolucion` |

### Grupo B — Añadir `formatearFechaCorta` junto a `normalizarFechaPortal` (CSV se preserva)

| Archivo | Display cambiado | CSV preservado |
|---|---|---|
| `paginas/auditorias/PaginaAuditorias.tsx` | `auditoria.fecha_auditoria` (lista + 2 selects), `ejecucion.fecha_ejecucion` (option) | `normalizarFechaPortal(auditoria.fecha_auditoria)` línea 485 |
| `paginas/lanzamientos/seguimiento/PaginaSeguimientoLanzamientos.tsx` | `seguimiento.fecha_registro` (tabla) | línea 243 |
| `paginas/lanzamientos/releases/PaginaReleases.tsx` | `release.fecha_programada`, `fecha_lanzamiento_real` (tabla) | líneas 484-485 |
| `paginas/decisiones/PaginaDecisiones.tsx` | `decision.fecha_decision` (tabla), `ejecucion.fecha_ejecucion` (option) | línea 370 |
| `paginas/discovery/insights/PaginaInsights.tsx` | descripcion del map de decisiones (useMemo), `insight.fecha_hallazgo` (tabla) | línea 460 |
| `paginas/discovery/investigaciones/PaginaInvestigaciones.tsx` | `investigacion.fecha_investigacion` (lista) | línea 241 |
| `paginas/validacion/ejecuciones/PaginaEjecucionesValidacion.tsx` | `ejecucion.fecha_ejecucion` (tabla) | líneas 264, 268, 269 |
| `paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx` | `entrega.fecha_objetivo`, `entrega.fecha_completado` (tabla, con fallback 'Sin fecha') | líneas 493-494 |

### Grupo C — Añadir `formatearFechaCorta` (archivo sin import previo de formatoPortal)

| Archivo | Cambio |
|---|---|
| `paginas/estrategia/GestionPeriodosEstrategicos.tsx` | Nueva import; `periodo.fecha_inicio → periodo.fecha_fin` (tabla) |
| `paginas/analitica/kpis/PaginaKpis.tsx` | Nueva import; `kpi.fecha_corte` (tabla) |
| `paginas/validacion/PaginaValidacion.tsx` | Nueva import; `ejecucion.fecha_ejecucion` (lista resumen) |

---

## 5. SQL

❌ No. Cero cambios en base de datos, consultas o esquemas.

---

## 6. Lo que NO se cambió (preservado intencionalmente)

| Categoría | Ejemplo |
|---|---|
| Comparaciones de filtro | `normalizarFechaPortal(release.updated_at) >= hace30Dias` |
| Filtros de KPI | `kpi.fecha_corte >= fechaDesde` (raw YYYY-MM-DD string compare) |
| Columnas CSV en todos los módulos | `normalizarFechaPortal(...)` dentro de `exportarCsv(...)` |
| Cálculos de fecha | `new Date(${entrega.fecha_objetivo}T00:00:00)` |
| Ordenamiento por fecha | sort keys con fecha raw |
| Inputs `type="date"` | Requieren YYYY-MM-DD |
| PaginaPortafolio, PaginaTendencias | Computación analítica interna (no display directo) |

---

## 7. Validación técnica

| Check | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores ni advertencias |
| `npm run build` | ✅ Build exitoso en 3.41s (285 módulos) |
| TypeScript (`tsc -b`) | ✅ Sin errores de tipos |
| Módulos transformados | 285 (igual que antes — sin archivos nuevos) |

> El único warning activo es el preexistente de chunk size (`1,328 kB`), no relacionado con este cambio.
