# Implementación Final — Ajuste Cronograma: Jerarquía, Persistencia y Temporalidad

**Fecha:** 2026-03-16
**Módulo:** `apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`
**Rama:** `feature/creacion-cronograma`

---

## 1. Qué se verificó antes de editar

| Punto auditado | Hallazgo |
|---|---|
| Estado `densidad` | `useState<DensidadCronograma>` inicializado desde URL param `?densidad=` |
| Refs de densidad | `densidadPreviaRef`, `jerarquiaDetalleInicializadaRef`, `entregablesDetalleInicializadosRef` |
| Condiciones de densidad en jerarquía | `tieneHijos: densidad === 'detalle' && ...` / `if (densidad !== 'detalle' || ...)` / `if (densidad === 'detalle' && ...)` |
| UI de densidad | Bloque `<div className="space-y-1 text-sm">Densidad</div>` con toggle Ejecutivo/Detalle |
| Persistencia de expansión | **Ausente** — solo estado React en memoria, se pierde al navegar |
| Campos temporales por nivel | Objetivo: derivado de hijos. Iniciativa: `ventana_planificada_id`. Entrega: `ventana_planificada_id` + `ventana_real_id` + `fecha_objetivo` + `fecha_completado`. **Todos honestos.** |
| Fechas hardcodeadas | **Ninguna** — todo viene del modelo real |

---

## 2. Qué se corrigió exactamente

### 2.1 Eliminación completa del concepto "Densidad"

Se eliminaron sin residuos:

- **Tipo** `DensidadCronograma = 'ejecutivo' | 'detalle'` (línea 30)
- **Función** `normalizarDensidad()` (líneas 184–186)
- **Estado** `const [densidad, setDensidad]` (línea 454)
- **Refs** `densidadPreviaRef`, `jerarquiaDetalleInicializadaRef`, `entregablesDetalleInicializadosRef` (líneas 480–482)
- **URL param** `parametros.set('densidad', densidad)` → reemplazado por `parametros.delete('densidad')` para limpiar URLs anteriores
- **Condición en `filtrosAbiertos`** `searchParams.get('densidad') === 'detalle'`
- **Rama en `filasCronograma`**: `tieneHijos: densidad === 'detalle' && ...` → `tieneHijos: entregasIniciativa.length > 0`
- **Condición de visibilidad entregables**: `if (densidad !== 'detalle' || !iniciativasExpandidas...)` → `if (!iniciativasExpandidas...)`
- **Condición de grupo sin iniciativa**: `if (densidad === 'detalle' && ...)` → `if (entregasSinIniciativa.length > 0)`
- **Deps de `filasCronograma` useMemo**: removido `densidad`
- **`resumenControles`**: removido ítem `'Detalle' / 'Ejecutivo'` y dep `densidad`
- **`limpiarFiltros`**: removido `setDensidad('ejecutivo')`
- **UI bloque "Densidad"**: eliminado el toggle Ejecutivo/Detalle del panel de filtros

### 2.2 Persistencia real del estado de expansión

Se agregaron dos claves de localStorage:

```
pm-portal-roadmap-cronograma-objetivos-expandidos   → string[] (JSON)
pm-portal-roadmap-cronograma-iniciativas-expandidas → string[] (JSON)
```

- Los estados `objetivosExpandidos` y `iniciativasExpandidas` se inicializan desde localStorage en el `useState` lazy initializer.
- Dos nuevos `useEffect` persisten cada cambio de expansión al localStorage.
- Al navegar a otro módulo y regresar, la jerarquía queda exactamente como se dejó.

### 2.3 Simplificación del efecto de auto-expansión

La lógica de auto-expansión (que antes tenía 3 ramas condicionales de densidad) se simplificó a:

> "Solo si no hay nada restaurado del localStorage, expandir todos los objetivos con hijos al primer cargado."

Esto permite que:
- Primera visita → se expanden objetivos con hijos automáticamente.
- Visita siguiente → se respeta lo que el usuario dejó.

### 2.4 Mejora de tooltips en barras de segmento

Para barras de tipo `real` (ventana real de entrega) se añade la etiqueta: **"Ventana real confirmada"** (texto verde esmeralda).
Para barras de tipo `objetivo` (rango derivado) se añade la etiqueta: **"Derivado de hijos"** (texto slate tenue).

Esto aclara el origen de cada barra sin tocar la lógica de datos.

### 2.5 Limpieza de UI de filtros

El bloque secundario del panel de filtros que contenía:
- selector de trimestre (condicional a `vistaTemporal === 'trimestre'`)
- toggle de densidad

Se simplificó a:
- solo selector de trimestre (condicional), sin el wrapper externo innecesario.

---

## 3. Cómo quedó la jerarquía

```
Objetivo [expandible]
  └── Iniciativa [expandible]
        └── Entrega [hoja final]
  └── Sin iniciativa asignada [expandible, si aplica]
        └── Entrega [hoja final]
```

- **Nivel 0** – Objetivo: expandir/colapsar con botón circular grande.
- **Nivel 1** – Iniciativa: expandir/colapsar con botón circular pequeño.
- **Nivel 2** – Entrega: punto visual sin botón (hoja final).
- La profundidad es **siempre la misma**, no depende de ningún modo.

---

## 4. Cómo quedó la persistencia

| Qué | Dónde | Cómo |
|---|---|---|
| Vista temporal (año/trimestre) | URL param `?vista=` | React Router `useSearchParams` |
| Año seleccionado | URL param `?anio=` | React Router |
| Trimestre | URL param `?trimestre=` | React Router (solo si `vista=trimestre`) |
| Filtro objetivo | URL param `?objetivo=` | React Router |
| Filtro estado | URL param `?estado=` | React Router |
| Filtro ventana | URL param `?ventana=` | React Router |
| Objetivos expandidos | `localStorage` | JSON array de IDs |
| Iniciativas expandidas | `localStorage` | JSON array de IDs |
| Ancho columna jerarquía | `localStorage` | Número entero (px) |

---

## 5. Cómo quedó la parte temporal (barras y hitos)

### Por nivel

| Nivel | Tipo de barra | Origen del dato | Color |
|---|---|---|---|
| Objetivo | Barra delgada gris | Derivado: min(inicio hijos) → max(fin hijos) | Slate 300/55 |
| Iniciativa | Barra mediana cyan | `ventana_planificada_id` → `CatalogoVentanaPm.fecha_inicio/fin` | Cyan 500/80 |
| Entrega | Barra ámbar | `ventana_planificada_id` → ventana planificada | Amber 400/85 |
| Entrega | Barra verde | `ventana_real_id` → ventana real de ejecución | Emerald 500/85 |

### Marcadores (hitos puntuales)

| Variante | Origen | Color |
|---|---|---|
| Fecha objetivo | `entrega.fecha_objetivo` | Punto ámbar |
| Fecha completada | `entrega.fecha_completado` | Punto verde |
| Release programado | `release.fecha_programada` | Punto slate oscuro |
| Release ejecutado | `release.fecha_lanzamiento_real` | Punto verde esmeralda |

**No hay fechas hardcodeadas. No hay rangos simulados. Todo viene del modelo real.**

La barra de Objetivo se etiqueta explícitamente en el tooltip como "Derivado de hijos" para que el PM entienda que es un rango calculado, no un campo directo del sistema.

---

## 6. Archivos tocados

| Archivo | Tipo de cambio |
|---|---|
| `PaginaCronogramaRoadmap.tsx` | Único archivo modificado |

No se tocaron:
- Ningún modelo de dominio
- Ningún caso de uso
- Ningún archivo SQL / migración
- Ningún otro módulo
- Navegación Roadmap
- Ruta del cronograma

---

## 7. Validación final

| Validación | Resultado |
|---|---|
| `npm run lint` | ✅ Sin errores ni warnings |
| `npm run build` | ✅ Build exitoso (5.30s) |
| Warning de chunk size | ⚠️ Preexistente, no relacionado con estos cambios |
| Código muerto | ✅ Ninguno — todo lo de densidad fue removido por completo |
| Referencias a `setDensidad` | ✅ Ninguna |
| Referencias a `densidad` | ✅ Ninguna |
| Referencias a `DensidadCronograma` | ✅ Ninguna |

---

## 8. Riesgo residual

| Riesgo | Nivel | Mitigación |
|---|---|---|
| URLs existentes con `?densidad=detalle` | Bajo | El efecto URL borra el param con `parametros.delete('densidad')` en el primer render |
| localStorage con IDs de objetivos/iniciativas ya eliminados de BD | Bajo | Los IDs no presentes en los datos visibles son ignorados silenciosamente |
| Chunk size warning en build | Informativo | Preexistente, no causado por estos cambios; requiere estrategia de code-splitting general |
