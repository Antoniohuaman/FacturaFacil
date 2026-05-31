# Auditoría Extrema del Tab Stock Actual

> **Fecha:** 2026-05-29  
> **Base de trabajo:** Código real leído archivo por archivo. Sin suposiciones.  
> **Alcance:** Tab "Stock Actual" del módulo Control de Stock.

---

## 1. Resumen Ejecutivo

El tab Stock Actual está **parcialmente correcto** pero tiene un **bug crítico confirmado** que explica exactamente el problema reportado por el usuario: configurar stock mínimo borra el stock máximo y viceversa.

**Problemas críticos:**
- **Bug de borrado de mínimo/máximo:** La función `updateThresholds` usa `Object.prototype.hasOwnProperty` para detectar qué campos actualizar. Cuando el objeto que se le pasa tiene ambas claves (`stockMinimo` y `stockMaximo`) pero una con valor `undefined`, `hasOwnProperty` retorna `true` para ambas, y el campo con `undefined` ejecuta `delete nextMap[almacenId]` — borrando el valor que ya existía.

**Problemas altos:**
- Tres componentes son **código muerto no importado**: `DisponibilidadKPIs.tsx`, `DisponibilidadToolbar.tsx`, `DisponibilidadToolbarCompact.tsx`.
- La vista Stock Actual no muestra "Excedido" aunque stockMaximo esté configurado (inconsistencia con Alertas).
- El ajuste de stock por fila en modo "Todos los almacenes" abre el modal sin almacén preseleccionado — riesgo de ajustar el almacén equivocado.
- Las vistas guardadas no restauran los filtros activos al aplicarse (campo `filtros` en `VistaGuardada` es datos muertos).

**Veredicto:** El tab necesita corrección crítica (bug de mínimo/máximo), limpieza de código muerto y un ajuste de consistencia con Alertas. El resto de la funcionalidad es sólida.

---

## 2. Alcance Revisado

### Archivos leídos completamente

| Archivo | Líneas | Rol |
|---|---|---|
| `components/disponibilidad/InventarioSituacionPage.tsx` | 364 | Página principal del tab Stock Actual |
| `hooks/useInventarioDisponibilidad.ts` | 503 | Hook de datos, filtros, paginación, edición de umbrales |
| `components/disponibilidad/DisponibilidadTable.tsx` | 626 | Tabla con columnas dinámicas y edición inline |
| `components/disponibilidad/DisponibilidadToolbarEnhanced.tsx` | 406 | Toolbar con filtros, acciones y botones |
| `components/disponibilidad/DisponibilidadSettings.tsx` | 335 | Modal de personalización de vista |
| `stores/usePreferenciasDisponibilidad.ts` | 234 | Zustand store de preferencias de visualización |
| `models/disponibilidad.types.ts` | 144 | Tipos: DisponibilidadItem, SituacionStock, VistaGuardada |
| `services/inventory.service.ts` → `updateThresholds()` | — | Actualización de stock mínimo/máximo |
| `hooks/useInventory.ts` → handlers | — | Contexto superior del módulo |
| `pages/InventoryPage.tsx` | 432 | Wiring del tab en la página principal |
| `components/disponibilidad/DisponibilidadKPIs.tsx` | 60+ | Componente nunca importado (código muerto) |
| `components/disponibilidad/DisponibilidadToolbar.tsx` | — | Componente nunca importado (código muerto) |
| `components/disponibilidad/DisponibilidadToolbarCompact.tsx` | — | Componente nunca importado (código muerto) |

---

## 3. Mapa Actual de la Vista

### Árbol de componentes

```
InventoryPage.tsx
  └── {selectedView === 'situacion'} → InventarioSituacionPage
        ├── DisponibilidadToolbarEnhanced  (filtros + acciones + botones)
        ├── DisponibilidadTable            (tabla con columnas dinámicas)
        ├── DisponibilidadPagination       (paginación)
        └── DisponibilidadSettings         (modal configuración de vista)
```

### Hooks involucrados

| Hook | Responsabilidad |
|---|---|
| `useInventarioDisponibilidad` | Calcula disponibilidad, filtros, paginación, edición de umbrales |
| `usePreferenciasDisponibilidad` | Densidad, columnas visibles, vistas guardadas (Zustand/persist) |
| `useCurrentEstablecimientoId` | Establece establecimiento activo de la sesión |

### Fuente de datos del stock

`allProducts` del `useProductStore()` → `product.stockPorAlmacen[almacenId]`, `product.stockReservadoPorAlmacen[almacenId]`, `product.stockMinimoPorAlmacen[almacenId]`, `product.stockMaximoPorAlmacen[almacenId]`

### Filtros

- Establecimiento: fijo a `currentEstablecimientoId` (selector visualmente deshabilitado)
- Almacén: selectable entre almacenes del establecimiento activo
- Búsqueda: por SKU o nombre (`filtroSku`)
- Solo disponible: `soloConDisponible: boolean` (filtra disponible > 0)

### Exportación

`handleExportStockActual` en `InventarioSituacionPage.tsx` — exporta `datosExportacion` (= `datosOrdenados`, todos los resultados filtrados, sin paginación). Usa XLSX.

---

## 4. Modelo de Stock Usado por la Vista

| Campo | Origen | Uso en vista | Se muestra | Se exporta | Observación |
|---|---|---|---|---|---|
| `stockPorAlmacen[almacenId]` | `product.stockPorAlmacen` | Stock real por almacén | Sí (col "Real") | Sí | Fuente primaria |
| `stockReservadoPorAlmacen[almacenId]` | `product.stockReservadoPorAlmacen` | Reservado por almacén | Sí (col "Reservado") | Sí | Se usa para calcular disponible |
| `disponible = max(0, real - reservado)` | Calculado | Stock disponible | Sí | Sí | Correcto: `Math.min(rawReservado, Math.max(real, 0))` |
| `stockMinimoPorAlmacen[almacenId]` | `product.stockMinimoPorAlmacen` | Umbral mínimo | Sí (editable) | Sí | En modo multi-almacén: suma acumulada |
| `stockMaximoPorAlmacen[almacenId]` | `product.stockMaximoPorAlmacen` | Umbral máximo | Sí (editable) | Sí | En modo multi-almacén: suma acumulada |
| `situacion` | `calcularSituacion()` | Estado operativo | Sí (badge) | Sí (col "Estado") | No incluye "Excedido" — falta stockMaximo |
| `stockPorAlmacen` (mapa) | `product.stockPorAlmacen` | Columnas dinámicas multi-almacén | Condicional | Sí (modo todos) | Solo cuando scope tiene > 1 almacén |
| `precio` | `product.precio` | Valor total | No (pantalla) | Sí (col "Valor total") | Solo en exportación |

---

## 5. Evaluación de Filtros

### Establecimiento

`useCurrentEstablecimientoId()` determina el establecimiento activo. El selector en la toolbar está `disabled` (hardcodeado en `DisponibilidadToolbarEnhanced.tsx:93`). El usuario ve qué establecimiento está activo pero no puede cambiarlo desde aquí — debe usar el selector global del header. Esto es correcto por diseño operativo.

**Riesgo**: El selector aparenta ser un filtro interactivo pero no lo es. Puede confundir al usuario que intenta hacer clic en él.

### Almacén

Se limita a almacenes del establecimiento activo (`almacenesActivos.filter(w => w.establecimientoId === currentEstablecimientoId)`). Si hay un solo almacén, se preselecciona automáticamente. Si hay varios, se muestran todos con opción "Todos los almacenes".

**Correcto**: No mezcla almacenes de otros establecimientos.

### Búsqueda

Filtra por `item.sku.toLowerCase().includes(busqueda)` OR `item.nombre.toLowerCase().includes(busqueda)`. Case-insensitive. Se combina con el filtro `soloConDisponible`. Funciona correctamente.

**Limitación**: No busca por establecimiento, almacén o estado. Esto es aceptable para esta vista.

### Solo disponible

`filtros.soloConDisponible` filtra `item.disponible > 0`. Esto significa que excluye productos con reservado ≥ real (disponible = 0). El nombre "Solo disponible" es correcto semánticamente.

### Paginación

Respeta todos los filtros (filtra antes de paginar). El contador muestra `itemsMostrados/totalItems` cuando hay filtros activos, o solo `totalItems` cuando no hay filtros — correcto y legible.

### Combinación de filtros

Orden de aplicación: `filtros.filtroSku` → `filtros.soloConDisponible` → paginación. Correcto.

---

## 6. Evaluación de Columnas y Datos

### Columnas fijas

| Columna | Contenido | Sticky | Ordenable | Observación |
|---|---|---|---|---|
| Código | `item.sku` | Sí (left) | Sí | Font-mono |
| Producto | `item.nombre` + `stockMinimo`/`stockMaximo` debajo | Sí (left) | Sí | |
| Unidad mínima | `item.unidadMinima` | No | No | |
| Real | `item.real` | No | Sí | Suma de almacenes en scope |
| Reservado | `item.reservado` | No | Sí | `Math.min(rawReservado, Math.max(real, 0))` — correcto |
| Disponible | `item.disponible` | No | Sí | `max(0, real - reservado)` — correcto |
| Stock mínimo | `item.stockMinimo` | No | No | Editable inline (solo si almacén seleccionado) |
| Stock máximo | `item.stockMaximo` | No | No | Editable inline (solo si almacén seleccionado) |
| Estado | `item.situacion` | No | Sí | Badge: OK, Sin stock, Bajo, Crítico — falta Excedido |
| Acciones | Botón ajustar | No | No | |

### Columnas dinámicas por almacén (modo "Todos los almacenes")

Cuando `!filtros.almacenId && almacenesDisponibles.length > 1`, se genera una columna por cada almacén con el stock real individual. La columna "Real" pasa a llamarse "Real total". Funciona correctamente.

**Limitación**: Las columnas dinámicas muestran solo stock real, no disponible por almacén individual.

### Stock real total (modo todos)

Suma correctamente: `almacenescope.forEach(id => real += InventoryService.getStock(product, id))`. Correcto.

### Cálculo de disponible

```typescript
const reservado = Math.min(rawReservado, Math.max(real, 0));
const disponible = Math.max(0, real - reservado);
```

**Pregunta 7** — ¿Qué pasa si reservado > real? Respuesta: `reservado = Math.min(rawReservado, real)` lo limita al real. Disponible queda en 0. Correcto.

### Stock mínimo/máximo en "Todos los almacenes"

Se **suma** el mínimo y máximo de todos los almacenes del scope. Ejemplo: si ALM-A tiene min=5 y ALM-B tiene min=3, se muestra min=8. Esta acumulación es discutible — puede confundir al usuario que espera ver el mínimo individual. Pero la celda en "Todos" es de solo lectura (no editable), así que no genera riesgo de corrupción.

---

## 7. Evaluación de Stock Mínimo y Máximo

### Bug crítico confirmado: borrado al actualizar

**Archivo:** `hooks/useInventarioDisponibilidad.ts → updateStockThreshold()` y `services/inventory.service.ts → updateThresholds()`

**Flujo del bug:**

En `updateStockThreshold`, cuando se actualiza solo el mínimo (`field === 'stockMinimo'`):
```typescript
// useInventarioDisponibilidad.ts:466-469
const updatedProduct = InventoryService.updateThresholds(product, almacenId, {
  stockMinimo: field === 'stockMinimo' ? nextMin ?? null : undefined,  // ← valor real
  stockMaximo: field === 'stockMaximo' ? nextMax ?? null : undefined,  // ← undefined (key presente)
});
```

El objeto pasado a `updateThresholds` es `{ stockMinimo: <valor>, stockMaximo: undefined }`.

En `updateThresholds` (`inventory.service.ts:73-103`):
```typescript
const hasMinUpdate = Object.prototype.hasOwnProperty.call(updates, 'stockMinimo'); // true
const hasMaxUpdate = Object.prototype.hasOwnProperty.call(updates, 'stockMaximo'); // ← TAMBIÉN true (la key existe aunque sea undefined)
```

Luego para el máximo:
```typescript
if (hasMaxUpdate) {
  const normalizedMax = updates.stockMaximo ?? undefined;  // undefined ?? undefined = undefined
  if (normalizedMax === undefined) {
    delete nextMaxMap[almacenId];  // ← ¡BORRA el stock máximo existente!
  }
}
```

**Resultado**: Cada vez que el usuario edita el mínimo, el máximo es borrado. Y viceversa. Esto confirma exactamente el problema reportado.

**Causa raíz**: El uso de `Object.prototype.hasOwnProperty` con un objeto literal que incluye ambas claves (incluso si una tiene valor `undefined`) hace que `hasMaxUpdate` sea siempre `true`.

**Impacto**: Los valores de stock mínimo y máximo son imposibles de mantener ambos configurados al mismo tiempo usando la edición inline de la tabla.

### Merge correcto del mapa

A pesar del bug anterior, el spread inicial SÍ es correcto:
```typescript
const nextMinMap = { ...(product.stockMinimoPorAlmacen ?? {}) };
```
El mapa de otros almacenes se preserva. El bug solo afecta al almacén que se está editando en esa operación.

### Validaciones

En `updateStockThreshold`:
- Valor negativo: `if (normalizedValue !== undefined && (Number.isNaN(normalizedValue) || normalizedValue < 0)) throw new Error('...')` ✓
- mínimo > máximo: `if (nextMin !== undefined && nextMax !== undefined && nextMax < nextMin) throw new Error('...')` ✓

**Problema de validación**: La validación `nextMax < nextMin` usa `currentMax` para el campo no editado. Pero luego la llamada a `updateThresholds` BORRA ese `currentMax`. La validación pasa correctamente pero el resultado final es incorrecto (máximo borrado).

### Riesgo de sobrescribir almacén equivocado

**Mitigado**: La edición solo está activa cuando `selectedalmacen` está definido (`canEditThresholds = Boolean(selectedEstablecimiento && selectedalmacen)`). En modo "Todos los almacenes" la edición está desactivada. Correcto.

### Persistencia

Los mínimos/máximos se guardan en el objeto `Product` via `updateProduct()` en el ProductStore. No hay un flujo que sobrescriba los mapas completos durante el cambio de filtros o establecimiento. El riesgo de borrado accidental por cambio de filtro NO existe — solo lo introduce el bug de `updateThresholds` descrito arriba.

---

## 8. Evaluación de Acciones

| Acción | Ubicación | Qué hace | Funciona | Duplicidad | Recomendación |
|---|---|---|---|---|---|
| Exportar a Excel | Menú Acciones | Exporta `datosOrdenados` completos con columnas dinámicas | Sí | No | Mantener |
| Actualización masiva | Menú Acciones | Navega a tab Importar stock (`setSelectedView('importar')`) | Sí | No | Mantener — acceso contextual válido |
| Transferir stock | Menú Acciones | Abre `TransferModal` (mismo que tab Transferencias) | Sí | Con tab Transferencias | Revisar si debe dirigir al tab o abrir modal |
| Ajustar stock (Acciones) | Menú Acciones | Abre `AdjustmentModal` sin producto preseleccionado | Sí | Con botón "+Ajustar Stock" de la barra | Mantener; sin duplicidad real (el del menú es contextual) |
| Ajustar stock por fila | Icono en cada fila | Abre `AdjustmentModal` con `productoId` y `disponible` | Sí | No | ⚠️ Riesgo: en "Todos almacenes" no preselecciona almacén |
| Pantalla completa | Botón (⤢) | `document.documentElement.requestFullscreen()` | Sí | No | Funciona correctamente |
| Compartir | Botón (share) | Copia `window.location.href` al portapapeles | Parcial | No | URL no incluye filtros como query params → enlace no reproduce vista |
| Configuración de vista | Botón (⚙) | Abre `DisponibilidadSettings` modal | Sí | No | Mantener |

### Detalle del ajuste por fila en "Todos los almacenes"

```typescript
// InventarioSituacionPage.tsx:81-90
const handleAjustarStock = useCallback((item: DisponibilidadItem) => {
  if (onAjustarProducto) {
    onAjustarProducto(item.productoId, item.disponible, {
      almacenId: selectedalmacenId,  // ← undefined cuando no hay almacén seleccionado
      mode: 'prefilled'
    });
  }
}, [onAjustarProducto, selectedalmacenId]);
```

`selectedalmacenId = selectedalmacen?.id` — es `undefined` en "Todos los almacenes". El modal de ajuste abriría con el producto preseleccionado pero sin almacén. El usuario podría elegir cualquier almacén (incluso uno de otro establecimiento si AdjustmentModal no filtra).

---

## 9. Evaluación de Exportación Excel

### Qué respeta la exportación

| Filtro | Respeta en exportación | Evidencia |
|---|---|---|
| Establecimiento activo | Sí | `almacenescope` está limitado al establecimiento |
| Almacén seleccionado | Sí | `filtros.almacenId` determina el scope |
| Búsqueda por SKU/nombre | Sí | Exporta `datosOrdenados` (ya filtrado por búsqueda) |
| Solo disponible | Sí | `datosOrdenados` ya aplica `soloConDisponible` |
| Ordenamiento | Sí | Exporta `datosOrdenados` (incluye sort) |
| Paginación | No (intencional) | Exporta TODOS los resultados filtrados, sin límite de página |

**Correcto**: El usuario ve 25 filas paginadas pero exporta todos los resultados del filtro.

### Columnas exportadas en modo almacén único

Establecimiento, Almacén, Código SKU, Producto, Unidad mínima, Real, Reservado, Disponible, Stock mínimo, Stock máximo, Estado.

### Columnas exportadas en modo "Todos los almacenes"

Columnas dinámicas por almacén (Real individual) + Real total, Reservado, Disponible, Stock mínimo, Stock máximo, Estado. Correcto y completo.

### Columnas recomendadas adicionales

El "Valor total" (precio × disponible) se incluye en el objeto `datosExportacion` vía `item.precio` pero NO se exporta. El campo existe. Podría añadirse como columna opcional.

---

## 10. Evaluación de Personalización de Vista

### Densidad

Funciona correctamente. Valores: `compacta | comoda | espaciosa`. Se persiste en localStorage scoped por tenant. Las clases CSS por densidad se aplican en `DisponibilidadTable.tsx` mediante `densidadClasses[densidad]`.

### Columnas visibles

Funciona. `toggleColumna` impide ocultar la última columna. No hay protección para ocultar columnas "obligatorias" como Código o Producto — el usuario puede ocultarlas todas excepto la última. No es un bug crítico pero podría resultar en una tabla con solo "Acciones" visible.

### Vistas guardadas — Bug de restauración de filtros

**Archivo**: `stores/usePreferenciasDisponibilidad.ts:206-211`

```typescript
aplicarVista: (vista) => {
  set({
    columnasVisibles: vista.columnasVisibles,  // ✓ restaura columnas
    densidad: vista.densidad                    // ✓ restaura densidad
    // ← filtros NO se restauran
  });
},
```

La `VistaGuardada` tiene un campo `filtros: Partial<DisponibilidadFilters>` que se guarda correctamente cuando el usuario hace "Nueva vista" (incluye establecimiento, almacén, búsqueda, soloConDisponible). Pero cuando el usuario "Activa" la vista, los filtros NO se aplican.

**Impacto**: El usuario guarda una vista con filtros específicos esperando restaurarlos, pero al activar la vista solo recupera columnas y densidad. Los filtros guardados son datos muertos.

### Resetear preferencias

```typescript
resetearPreferencias: () => {
  set({
    ...PREFERENCIAS_INICIALES,
    vistasGuardadas: get().vistasGuardadas,  // mantiene vistas guardadas
    vistaActivaId: undefined
  });
},
```

Resetea densidad, columnas y items por página, pero **mantiene las vistas guardadas**. Puede ser intencional o confuso para el usuario. El botón dice "Resetear preferencias" y podría esperarse que borre también las vistas.

### `alert()` y `confirm()` nativos

`DisponibilidadSettings.tsx:62, 73, 78, 313` usa `alert()` y `confirm()`. El resto del módulo usa `useFeedback()` y toasts. Inconsistencia de UX.

### Persistencia

Usa Zustand + persist con `createJSONStorage(tenantAwareStorage)`. El tenant-scoping es correcto y hace migración automática de claves legacy. Robusto.

---

## 11. Evaluación de Coherencia con Alertas

| Aspecto | Stock Actual (`calcularSituacion`) | Alertas (`evaluateStockAlert`) | ¿Coincide? |
|---|---|---|---|
| `disponible = 0` → Sin stock | `if (disponible === 0) return 'Sin stock'` | `if (available === 0) return 'LOW'` → `estado: 'SIN_STOCK'` | Sí en comportamiento, no en tipo |
| `disponible ≤ min × 0.5` → Crítico | `if (stockMinimo && disponible < stockMinimo * 0.5) return 'Crítico'` | `isCritical = available <= min * 0.5` | Sí |
| `disponible ≤ min` → Bajo | `if (stockMinimo && disponible < stockMinimo) return 'Bajo'` | `available <= min → 'LOW'` | Sí (con diferencia: `<` vs `<=`) |
| `disponible > max` → Excedido | **No implementado** | `available > max → 'OVER' → 'EXCESO'` | **No** — brecha |
| Sin mínimo configurado | `return 'OK'` | `available === 0 → 'LOW'` (desde corrección reciente) | **No** — brecha persistente |

### Diferencia `<` vs `<=` para "Bajo"

Stock Actual: `disponible < stockMinimo` (estrictamente menor)  
Alertas: `available <= stockMinimo` (menor o igual)

Si `disponible === stockMinimo`, Alertas muestra alerta pero Stock Actual muestra "OK". Esta inconsistencia es un bug menor.

### Sin mínimo: producto con 0 stock

Después de la corrección reciente en Alertas, un producto con disponible=0 y sin mínimo genera una alerta `SIN_STOCK`. Pero en Stock Actual, `calcularSituacion` retorna `'Sin stock'` cuando disponible=0 independientemente del mínimo — esto SÍ es correcto. Stock Actual maneja el caso correctamente.

### Excedido inexistente en Stock Actual

`SituacionStock` es `'OK' | 'Sin stock' | 'Bajo' | 'Crítico'` — no incluye `'Excedido'`. Si un producto tiene `disponible > stockMaximo`, Stock Actual mostraría "OK". Solo Alertas lo detecta. El usuario no puede ver el exceso desde Stock Actual.

---

## 12. Evaluación Multi-Almacén / Multi-Establecimiento

### Establecimiento activo

`currentEstablecimientoId` viene de `useCurrentEstablecimientoId()` (sesión). El hook `useInventarioDisponibilidad` lo usa para filtrar almacenes y productos. **No mezcla establecimientos**.

```typescript
const almacenesDisponibles = useMemo(() => {
  if (!currentEstablecimientoId) return [];
  return almacenesActivos.filter(w => w.establecimientoId === currentEstablecimientoId);
}, [almacenesActivos, currentEstablecimientoId]);
```

**Correcto**: Si no hay establecimiento activo, devuelve array vacío.

### "Todos los almacenes"

`almacenescope` cuando `!filtros.almacenId` contiene todos los almacenes activos del establecimiento actual. Las columnas dinámicas se generan para cada almacén en ese scope. El stock se suma correctamente.

### Columnas dinámicas

Solo se generan cuando `almacenesParaColumnas` prop existe (se pasa cuando `!filtros.almacenId && almacenesDisponibles.length > 1`). En modo un almacén, no hay columnas dinámicas. **Correcto**.

### Sincronización del almacén al cambiar establecimiento

```typescript
const almacenSigueValido = !prev.almacenId
  ? true
  : almacenesActivos.some(w => w.id === prev.almacenId && w.establecimientoId === nextEstablecimientoId);
const nextAlmacenId = almacenSigueValido ? prev.almacenId : '';
```

Si el almacén seleccionado no pertenece al nuevo establecimiento, se resetea a vacío. **Correcto, sin riesgo de mezclar datos**.

---

## 13. Problemas Detectados

| ID | Severidad | Problema | Evidencia técnica | Impacto | Recomendación |
|---|---|---|---|---|---|
| S1 | **Crítico** | Actualizar stock mínimo borra stock máximo y viceversa | `useInventarioDisponibilidad.ts:466-469` pasa `{ stockMinimo: v, stockMaximo: undefined }` con key presente; `inventory.service.ts:73-74` usa `hasOwnProperty` que retorna `true` para ambas claves; línea 102 ejecuta `delete nextMaxMap[almacenId]` | Usuario no puede mantener mínimo y máximo configurados simultáneamente | Pasar solo el campo que se está actualizando, sin incluir la clave contraria: en lugar de `{ stockMinimo: v, stockMaximo: undefined }`, pasar `{ stockMinimo: v }` |
| S2 | **Alto** | Tres componentes nunca importados: código muerto | `DisponibilidadKPIs.tsx`, `DisponibilidadToolbar.tsx`, `DisponibilidadToolbarCompact.tsx` no aparecen en ningún import | Confusión, mantenimiento innecesario, riesgo de que alguien los edite pensando que están activos | Eliminar los tres archivos |
| S3 | **Alto** | Stock Actual no muestra estado "Excedido" aunque stockMaximo esté configurado | `disponibilidad.types.ts:6`: `SituacionStock = 'OK' | 'Sin stock' | 'Bajo' | 'Crítico'`; `calcularSituacion()` no evalúa `stockMaximo` | Usuario configura stock máximo pero nunca ve que está excedido en esta vista | Agregar 'Excedido' a `SituacionStock` y evaluar `disponible > stockMaximo` en `calcularSituacion()` |
| S4 | **Alto** | Ajuste por fila en "Todos los almacenes" abre modal sin almacén preseleccionado | `InventarioSituacionPage.tsx:84`: `almacenId: selectedalmacenId` es `undefined` cuando no hay almacén seleccionado | Usuario puede ajustar stock en el almacén equivocado sin saber | Mostrar mensaje o selector de almacén antes de abrir el modal, o deshabilitar acción en modo "Todos los almacenes" |
| S5 | **Alto** | Vistas guardadas no restauran filtros al aplicarse | `usePreferenciasDisponibilidad.ts:207-211`: `aplicarVista` solo restaura `columnasVisibles` y `densidad` | Usuario espera restaurar el estado completo de la vista pero solo recupera preferencias de visualización | Aplicar también `filtros` guardados, o clarificar en UI que las vistas guardan solo preferencias de pantalla |
| S6 | **Medio** | Establecimiento selector visualmente parece interactivo pero está deshabilitado sin indicación clara | `DisponibilidadToolbarEnhanced.tsx:93`: `disabled` en el select; misma apariencia que el selector de almacén | Usuario puede intentar cambiar el establecimiento y no saber por qué no puede | Agregar un tooltip o indicador visual que explique que el establecimiento se cambia desde el header |
| S7 | **Medio** | Diferencia `<` vs `<=` entre Stock Actual y Alertas para el umbral "Bajo" | Stock Actual: `disponible < stockMinimo`; Alertas: `available <= stockMinimo` | Producto con `disponible === stockMinimo` aparece OK en Stock Actual pero genera alerta en Alertas | Unificar a `<=` en `calcularSituacion()` |
| S8 | **Medio** | El botón Compartir copia URL sin incluir filtros activos como query params | `DisponibilidadToolbarEnhanced.tsx:296`: `window.location.href` | El enlace compartido no reproduce la vista filtrada | Incluir filtros activos como query params en la URL, o cambiar el tooltip a "Copiar enlace (sin filtros)" |
| S9 | **Bajo** | `alert()` y `confirm()` nativos en `DisponibilidadSettings.tsx` | Líneas 62, 73, 78, 313 | UX inconsistente con el resto del módulo que usa toasts | Reemplazar con el sistema de feedback del módulo |
| S10 | **Bajo** | `resetearPreferencias` mantiene las vistas guardadas pero el nombre sugiere reset completo | `usePreferenciasDisponibilidad.ts:221-224` | Usuario puede confundirse si espera que "Resetear" borre también sus vistas | Clarificar en el UI: "Resetear columnas y densidad (mantiene vistas guardadas)" |
| S11 | **Bajo** | Stock mínimo/máximo acumulado en "Todos los almacenes" puede confundir | `useInventarioDisponibilidad.ts:203-210`: suma los valores por almacén | Si ALM-A tiene min=5 y ALM-B tiene min=3, se muestra min=8 — puede interpretarse como "el mínimo total necesario" | Clarificar en el header de la columna o en tooltip que es la suma de mínimos individuales |

---

## 14. Código Muerto / Código Temporal / Hardcodeos

### Componentes no importados (código muerto)

| Archivo | Evidencia de no uso | Riesgo |
|---|---|---|
| `DisponibilidadKPIs.tsx` | Grep: solo aparece en su propio archivo | Se puede eliminar |
| `DisponibilidadToolbar.tsx` | Grep: solo en su propio archivo | Se puede eliminar |
| `DisponibilidadToolbarCompact.tsx` | Grep: solo en su propio archivo | Se puede eliminar |

### Datos muertos en `VistaGuardada`

El campo `filtros: Partial<DisponibilidadFilters>` en `VistaGuardada` se guarda correctamente pero **nunca se aplica** cuando el usuario activa una vista. Es un campo persistido pero sin efecto.

### Hardcodeos

- `DisponibilidadToolbarEnhanced.tsx:93`: `disabled` hardcodeado en el select de establecimiento — funcional pero sin documentar en UI.
- `usePreferenciasDisponibilidad.ts:163`: `ocultarTodasColumnasOpcionales` hardcodea las columnas esenciales: `['codigo', 'producto', 'unidadMinima', 'disponible', 'acciones']`. Esto no es un riesgo activo pero si se agregan nuevas columnas, este hardcode debe actualizarse.

### `alert()` / `confirm()` usados como UI

`DisponibilidadSettings.tsx:62, 73, 78, 313` — código funcional pero no alineado con el sistema de feedback del módulo.

---

## 15. Qué Está Bien y Debe Mantenerse

- **Cálculo de disponible** `Math.max(0, real - Math.min(reservado, real))` — correcto, previene negativos.
- **Filtrado por establecimiento** — no mezcla almacenes de otros establecimientos.
- **Reset de almacén al cambiar establecimiento** — limpia el filtro de almacén correctamente.
- **Columnas dinámicas por almacén** — solo se muestran en modo multi-almacén.
- **Exportación completa (sin límite de página)** — exporta todos los resultados filtrados.
- **Exportación respeta todos los filtros** — establecimiento, almacén, búsqueda, solo disponible.
- **Edición inline de mínimo/máximo solo con almacén seleccionado** — `canEditThresholds` correcto.
- **Persistencia scoped por tenant** en preferencias de vista.
- **Paginación configurable** (25/50/100 items por página).
- **Chips de filtros activos** en la toolbar — muy buenos para UX.
- **Botón limpiar filtros** — funcional y conveniente.
- **`calcularSituacion` maneja disponible=0** correctamente como "Sin stock".
- **Validaciones de mínimo/máximo** (negativo, mínimo > máximo) en la capa de hook.
- **Pantalla completa** con `document.requestFullscreen()` — funciona correctamente.

---

## 16. Qué Debe Corregirse

En orden de prioridad:

1. **[CRÍTICO]** Bug `updateThresholds`: no pasar la clave del campo contrario con `undefined`. Cambiar el objeto de actualización para que solo incluya el campo que se está editando.

2. **[ALTO]** Agregar "Excedido" a `SituacionStock` y a `calcularSituacion()` en `useInventarioDisponibilidad.ts`.

3. **[ALTO]** Proteger el ajuste por fila en modo "Todos los almacenes": mostrar selector de almacén o deshabilitar la acción.

4. **[ALTO]** Corregir `aplicarVista` para también restaurar filtros, o eliminar el campo `filtros` de `VistaGuardada` para honestidad.

5. **[MEDIO]** Unificar condición de "Bajo": `<` → `<=` en `calcularSituacion()` para alinear con `evaluateStockAlert()`.

---

## 17. Qué Debe Eliminarse o Simplificarse

| Elemento | Motivo | Acción |
|---|---|---|
| `DisponibilidadKPIs.tsx` | No importado, código muerto | Eliminar archivo |
| `DisponibilidadToolbar.tsx` | No importado, código muerto | Eliminar archivo |
| `DisponibilidadToolbarCompact.tsx` | No importado, código muerto | Eliminar archivo |
| Campo `filtros` en `VistaGuardada` | No se aplica al restaurar vista | Eliminar el campo o implementar la restauración |
| `alert()` / `confirm()` en DisponibilidadSettings | UX inconsistente | Reemplazar con toasts/feedback del sistema |
| Botón Compartir | No incluye filtros — promesa rota | Reemplazar funcionalidad por export URL con filtros en query params, o eliminar el botón |

---

## 18. Qué Falta para que Stock Actual Esté Completo

1. **Estado "Excedido"** visible en la tabla cuando disponible > stockMaximo.
2. **Ajuste por fila con almacén preseleccionado** en todos los modos (no solo con almacén específico).
3. **Compartir con URL reproducible** (filtros como query params).
4. **Vistas guardadas que restauren filtros** completos, no solo columnas/densidad.
5. **Indicador de restricción en el selector de establecimiento** (tooltip explicando que se cambia desde el header).
6. **Feedback visual** (toasts en lugar de `alert`/`confirm`) en personalización de vista.
7. **Columna "Valor disponible"** en la exportación (precio × disponible existe en el item pero no se exporta).

---

## 19. Recomendación Funcional Final

**¿Está lista la vista?** Operativamente funciona para el 90% de los casos. El bug de mínimo/máximo la hace no confiable para el caso que el usuario más necesita (configurar alertas de reposición).

**¿Qué se debe corregir primero?** El bug S1 (borrado de mínimo/máximo). Es la corrección más crítica, de menor impacto en código y mayor impacto en confiabilidad.

**¿Qué acciones deben quedarse?** Exportar Excel, Actualización masiva, Ajustar stock, Pantalla completa, Configuración de vista, Ajustar por fila (con corrección).

**¿Qué acciones deben moverse?** "Transferir stock" en el menú Acciones podría dirigir al tab Transferencias en lugar de abrir el modal directamente — pero ambas opciones son válidas.

**¿Qué acciones deben eliminarse?** Botón Compartir (en su forma actual — promesa rota).

**¿Cómo debe quedar la configuración de mínimo/máximo?** Edición inline en la tabla (como ya está), con el bug corregido. La configuración en Stock Actual es el lugar natural.

**¿La personalización de vista aporta o confunde?** Aporta para densidad y columnas. Las vistas guardadas confunden porque no restauran filtros. Deben arreglarse o simplificarse.

**¿La exportación está bien?** Sí. Respeta todos los filtros activos, exporta datos completos (no solo la página visible) y separa columnas correctamente.

---

## 20. Plan de Acción Sugerido

*(Sin implementar — solo propuesta)*

### Paso 1 — Correcciones críticas

- [ ] **Bug S1**: En `updateStockThreshold`, pasar solo el campo que se edita — no pasar la clave contraria con `undefined`
- [ ] **Bug S3**: Agregar `'Excedido'` a `SituacionStock` y evaluar `stockMaximo` en `calcularSituacion()`
- [ ] **Bug S4**: Proteger ajuste por fila en "Todos los almacenes" (mostrar selector o deshabilitar)

### Paso 2 — Limpieza

- [ ] Eliminar: `DisponibilidadKPIs.tsx`, `DisponibilidadToolbar.tsx`, `DisponibilidadToolbarCompact.tsx`
- [ ] Eliminar campo `filtros` de `VistaGuardada` si no se implementará la restauración; o implementarla
- [ ] Reemplazar `alert()` y `confirm()` por feedback consistente
- [ ] Corregir `<` → `<=` en `calcularSituacion()` para "Bajo" (alinear con Alertas)

### Paso 3 — Mejoras funcionales

- [ ] Implementar restauración de filtros en `aplicarVista()`
- [ ] Agregar tooltip al selector de establecimiento (locked al establecimiento activo)
- [ ] Agregar columna "Valor disponible" a la exportación

### Paso 4 — Mejoras visuales

- [ ] Indicador visual "Excedido" en badge del estado
- [ ] Mejorar botón Compartir (URL con filtros como query params o eliminar)
- [ ] Clarificar tooltip de `resetearPreferencias` (indica que mantiene vistas guardadas)

### Paso 5 — Pruebas

- [ ] Test unitario para `updateThresholds` que valide que actualizar mínimo conserva máximo y viceversa
- [ ] Test unitario para `calcularSituacion` que cubra todos los estados incluido "Excedido"
- [ ] Test de integración para ajuste por fila verificando almacén correcto

---

## 21. Conclusión Final

El tab Stock Actual es la vista central y más completa del módulo. Tiene una arquitectura sólida, filtros correctos, exportación bien construida y persistencia robusta de preferencias.

**El bug crítico es el borrado de stock mínimo/máximo** (S1). Es el problema más impactante porque hace que la configuración de alertas de reposición sea imposible de mantener. El fix es pequeño (no pasar la clave contraria con `undefined` en la llamada a `updateThresholds`).

Después de ese fix, las correcciones más importantes son: agregar "Excedido" al estado de la tabla (S3) y proteger el ajuste por fila en modo multi-almacén (S4).

La limpieza de código muerto (tres componentes no importados) es trivial pero importante para la mantenibilidad.

Con estas correcciones, Stock Actual quedaría como una vista confiable, coherente con Alertas y lista para uso operativo diario.
