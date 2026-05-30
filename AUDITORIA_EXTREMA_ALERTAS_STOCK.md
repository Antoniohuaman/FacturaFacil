# Auditoría Extrema del Tab Alertas de Stock

> **Fecha:** 2026-05-29  
> **Base de trabajo:** Código real leído archivo por archivo. Sin suposiciones.  
> **Alcance:** Tab Alertas del módulo Control de Stock.

---

## 1. Resumen Ejecutivo

El tab Alertas está **parcialmente correcto pero con problemas importantes**:

- El cálculo de alertas funciona correctamente cuando el stock mínimo está configurado.
- **Gap crítico:** productos con stock 0 sin stock mínimo configurado son **completamente invisibles** para el sistema de alertas. No existe un tipo de alerta "sin stock" independiente del stock mínimo.
- El botón "Generar Orden de Compra" genera un archivo `.txt` temporal/simulado. No es una orden de compra real. Su presencia en Inventario es funcional y arquitectónicamente incorrecta.
- Existe doble cálculo de alertas: `generateAlerts` ya calcula todos los datos y los guarda en el objeto `StockAlert`, pero `AlertsPanel` vuelve a ejecutar `evaluateStockAlert` para renderizar.
- El archivo de tests `stockAlerts.test.ts` no usa el formato `describe/it` de vitest y por eso el runner lo reporta como fallido, aunque la lógica de prueba es correcta.
- Las alertas sí se actualizan en tiempo real gracias a `useMemo` sobre `allProducts`, que se actualiza con cada `updateProduct()`.
- La UI del panel es funcional pero acumula código temporal (modal de orden de compra, `.txt`).

**Veredicto:** Alertas es funcional para el caso básico (stock mínimo configurado) pero incompleto para el caso frecuente (sin stock mínimo). El módulo tiene código temporal que debe limpiarse antes de que sea un Kardex confiable.

---

## 2. Alcance Revisado

### Archivos leídos completamente

| Archivo | Rol |
|---|---|
| `components/panels/AlertsPanel.tsx` | Componente UI principal del tab Alertas (560 líneas) |
| `services/inventory.service.ts` → `generateAlerts()` | Lógica de cálculo de alertas |
| `hooks/useInventory.ts` → `stockAlerts` | `useMemo` que expone alertas al panel |
| `utils/stockAlerts.ts` | Funciones `evaluateStockAlert()` y `getStockAlertType()` |
| `utils/stockAlerts.test.ts` | Tests manuales (no ejecutables por vitest) |
| `models/inventory.types.ts` → `StockAlert`, `EstadoAlerta` | Tipos de alertas |
| `pages/InventoryPage.tsx` | Integración del tab Alertas, barra de acciones |
| `hooks/useInventarioDisponibilidad.ts` → `calcularSituacion()` | Cálculo de situación en tab Stock Actual |

---

## 3. Mapa Actual del Tab Alertas

### Renderizado

```
InventoryPage.tsx
  └── {selectedView === 'alertas'} → AlertsPanel
        ├── Props: alertas: StockAlert[], onReabastecerProducto, onProgramarCompra
        └── Fuente: useInventory().stockAlerts
```

**`stockAlerts`** es un `useMemo` en `useInventory.ts` (líneas 128–134):
```typescript
const stockAlerts = useMemo<StockAlert[]>(() => {
  const alerts = InventoryService.generateAlerts(allProducts, almacenesActivos);
  if (almacenFiltro && almacenFiltro !== 'todos') {
    return alerts.filter(alert => alert.almacenId === almacenFiltro);
  }
  return alerts;
}, [allProducts, almacenesActivos, almacenFiltro]);
```

### Datos que consume

- `allProducts` del `useProductStore` (catálogo con `stockPorAlmacen`, `stockReservadoPorAlmacen`, `stockMinimoPorAlmacen`, `stockMaximoPorAlmacen`)
- `almacenesActivos` de `configState.almacenes`
- `almacenFiltro` del estado del hook

### Filtros disponibles

- Solo el filtro global de almacén (`almacenFiltro`) del hook. El panel en sí no tiene filtros propios.
- El filtro de período no aplica (alertas son sobre el estado actual, no histórico).

### Botones y acciones del panel

| Botón | Dónde está | Qué hace actualmente |
|---|---|---|
| Reabastecer | Por cada alerta crítica | Llama `openAdjustmentModal(productoId, cantidadSugerida)` |
| Programar Compra | Por cada alerta baja | Llama `openAdjustmentModal(productoId, cantidadSugerida)` |
| Generar Orden de Compra | Banner superior | Abre un modal interno; descarga `.txt` con lista de productos |
| Exportar Reporte | Banner superior | Descarga `.txt` con lista de alertas |

### Barra de acciones superior (de InventoryPage, no de AlertsPanel)

Cuando `selectedView === 'alertas'`, la barra de acciones general también aparece con:
- Filtro período (`filterPeriodo`)
- Filtro almacén (`almacenFiltro`)
- Botón "Exportar Excel" ← **exporta movimientos, no alertas**
- Botón "Transferir Stock"
- Botón "+ Ajustar Stock"

El botón "Exportar Excel" en esta barra exporta `movimientosFiltradosVisiblesRef.current` o `filteredMovements`. Desde el tab Alertas (sin `MovementsTable` montada), exportaría los movimientos del período/almacén seleccionado, **no las alertas**. Esto es confuso para el usuario.

---

## 4. Tipos de Alertas Actuales

| Tipo | Condición de activación | Estado (`EstadoAlerta`) | Fuente de datos | Funciona | Observación |
|---|---|---|---|---|---|
| Stock crítico | `disponible ≤ stockMinimo × 0.5` **Y** stockMinimo configurado | `CRITICO` | `stockPorAlmacen`, `stockReservadoPorAlmacen`, `stockMinimoPorAlmacen` | Sí | Requiere stockMinimo configurado |
| Stock bajo | `disponible ≤ stockMinimo` (sin llegar a crítico) | `BAJO` | Mismo | Sí | Requiere stockMinimo configurado |
| Sin stock con mínimo | `disponible = 0` con stockMinimo configurado | `CRITICO` (isCritical = true) | Mismo | Sí | Queda como crítico via stockMinimo ≥ 1 |
| **Sin stock sin mínimo** | `disponible = 0` sin stockMinimo configurado | — | — | **NO** | **GAP: invisible al sistema** |
| Exceso de stock | `disponible > stockMaximo` | `EXCESO` | `stockMaximoPorAlmacen` | Sí | Requiere stockMaximo configurado |
| Sin configuración | Sin stockMinimo ni stockMaximo | Nunca alerta | — | N/A | Producto invisible al sistema |

---

## 5. Evaluación de Cálculo de Alertas

### `generateAlerts()` en `inventory.service.ts`

```typescript
const stockReal = this.getStock(product, almacen.id);
const stockReservado = this.getReservedStock(product, almacen.id);
const stockDisponible = Math.max(0, stockReal - stockReservado);
const stockMinimo = product.stockMinimoPorAlmacen?.[almacen.id];
const stockMaximo = product.stockMaximoPorAlmacen?.[almacen.id];
const evaluation = evaluateStockAlert({
  disponible: stockDisponible,
  stockMinimo,
  stockMaximo
});
```

| Concepto | Implementado | Correcto | Observación |
|---|---|---|---|
| Stock real | Sí | Sí | `product.stockPorAlmacen[almacen.id] ?? 0` |
| Stock disponible | Sí | Sí | `Math.max(0, stockReal - stockReservado)` |
| Stock reservado | Sí | Sí | `product.stockReservadoPorAlmacen[almacen.id] ?? 0` |
| Stock mínimo | Sí | Sí | Por producto × almacén |
| Stock máximo | Sí | Sí | Por producto × almacén |
| Por almacén | Sí | Sí | Itera cada producto × almacén activo |
| Por establecimiento | Sí (implícito) | Parcial | Los almacenes tienen `establecimientoId`; se puede filtrar posterior |
| Multi-almacén | Sí | Sí | Genera una alerta por combinación producto × almacén |
| Multi-establecimiento | Sí (implícito) | Parcial | No hay una vista agrupada por establecimiento |

### `evaluateStockAlert()` en `stockAlerts.ts`

```
LOW: disponible <= min (≤, no <)
OVER: disponible > max
isCritical (con min): disponible <= min * 0.5
isCritical (sin min): disponible === 0  ← dead code porque sin min siempre devuelve OK
```

**Bug de diseño confirmado:** `isCritical = disponible === 0` cuando no hay min configurado **nunca impacta** ningún alert porque el `type` retornado sería `OK`, y `generateAlerts` filtra con `if (evaluation.type === 'OK') return;`. El código `available === 0` en la condición de isCritical sin min es **código muerto**.

### Double evaluation (redundante)

`AlertsPanel.tsx` re-evalúa cada alerta vía `useMemo`:
```typescript
const alertasDecoradas = useMemo(() => alertas.map(alerta => ({
  alerta,
  evaluation: evaluateStockAlert({
    disponible: alerta.cantidadActual,
    stockMinimo: alerta.stockMinimo,
    stockMaximo: alerta.stockMaximo
  })
})), [alertas]);
```

Pero `generateAlerts` ya calculó y guardó en el objeto `StockAlert`:
- `alerta.isCritical` → ya calculado
- `alerta.faltante` → ya calculado (= `evaluation.missing`)
- `alerta.excedente` → ya calculado (= `evaluation.excess`)
- `alerta.estado` → ya calculado

La re-evaluación en `AlertsPanel` produce los mismos valores. Es redundante e impacta performance levemente.

---

## 6. Evaluación de Actualización / Sincronización

El `stockAlerts` es un `useMemo` dependiente de `allProducts` (de `useProductStore`) y `almacenesActivos`. La actualización ocurre cada vez que `allProducts` cambia.

| Flujo | Llama `updateProduct()` | Alertas se actualizan | Evidencia |
|---|---|---|---|
| Ajuste unitario | Sí (hook) | **Sí, inmediato** | `useInventory.handleStockAdjustment` |
| Importación masiva | Sí (PanelImportacionStock) | **Sí** | `updateProduct(resultado.product.id, resultado.product)` |
| Reset de stock | Sí (PanelImportacionStock) | **Sí** | Misma función |
| Transferencia (intra/inter) | Sí (hook) | **Sí, inmediato** | Todos los handlers de transferencia |
| Venta | Sí (facade) | **Sí** | `updateProduct` en `inventory.facade.ts` |
| Anulación comprobante | Sí (facade) | **Sí** | Misma fachada |
| Nota de crédito | Sí (facade) | **Sí** | Misma fachada |
| Evento `stock-movements-changed` | No directamente | N/A | El evento recarga movimientos, no allProducts |

**Conclusión de sincronización:** Las alertas se actualizan correctamente en todos los flujos porque todas las operaciones de stock llaman `updateProduct()`, que actualiza `allProducts` en el store, lo que dispara la recomputación del `useMemo`.

**Nota:** El evento `facturafacil:stock-movements-changed` fue agregado para sincronizar la tabla de movimientos. Las alertas no dependen de él sino directamente de `allProducts`. Esto es correcto.

---

## 7. Evaluación de Configuración

### Dónde se configuran stockMinimo y stockMaximo

**Actualmente:** En el tab "Stock Actual" → `DisponibilidadTable.tsx`, mediante edición inline de celdas. El usuario hace clic en la celda de "Stock mínimo" o "Stock máximo" de un producto/almacén y escribe el valor.

- `onUpdateThreshold` en `useInventarioDisponibilidad.ts` (`updateStockThreshold`)
- Persiste en `product.stockMinimoPorAlmacen[almacenId]` y `product.stockMaximoPorAlmacen[almacenId]`
- Requiere que el usuario tenga un almacén seleccionado en la vista de disponibilidad

**Granularidad:** Por producto × almacén individual. No existe configuración global ni por categoría.

**Requisito para activar alertas:** Sin stock mínimo configurado, el producto NO genera ninguna alerta de bajo stock ni crítico (solo exceso si tiene máximo). Esto hace que la configuración de mínimos sea un paso **obligatorio y oculto** para que el sistema funcione.

### Qué configuración falta

| Configuración | Existe | Donde debería estar |
|---|---|---|
| Stock mínimo por producto × almacén | Sí (Stock Actual) | OK como está |
| Stock máximo por producto × almacén | Sí (Stock Actual) | OK como está |
| Umbral crítico configurable (default: 50% del mínimo) | No | Sería útil |
| Activar/desactivar alerta por producto | No | Podría agregar valor |
| Alerta de "sin stock" sin necesidad de mínimo | No | **Falta, es el gap crítico** |

---

## 8. Evaluación de UI/UX

### Banner superior

Muestra conteos de críticas, bajas y excedidas. Es útil y correcto. El icono de advertencia y los colores son coherentes.

### Botones "Reabastecer" y "Programar Compra"

Ambos abren el modal de ajuste. Esto es funcional como acceso rápido desde la alerta al ajuste. Sin embargo:
- Ambos hacen exactamente lo mismo: `openAdjustmentModal(productoId, cantidadSugerida)`
- La diferencia de nombres ("Reabastecer" vs "Programar Compra") es visual pero internamente son idénticos
- No hay diferencia funcional entre reabastecer (ajuste inmediato) y "programar compra" (que implica un proceso externo)

### Empty state

Cuando no hay alertas, el panel muestra un ícono verde y "¡Excelente! No hay alertas de stock". Esto es correcto y positivo.

### Filtros en AlertsPanel

AlertsPanel no tiene filtros propios. Hereda el `almacenFiltro` del hook. Si el usuario quiere ver alertas de un almacén específico, debe cambiar el filtro en la barra superior.

**Problema de contexto:** La barra de acciones superior muestra "Exportar Excel" cuando el usuario está en el tab Alertas. Ese botón exporta **movimientos**, no alertas. El usuario puede confundirse y esperar que exporte las alertas actuales.

### Redundancia de evaluación

El panel re-evalúa alertas que ya están evaluadas. No hay impacto visible para el usuario pero es código innecesario.

---

## 9. Evaluación del Botón "Generar Orden de Compra"

### Qué hace actualmente

`AlertsPanel.tsx:98-105` — abre un modal interno (`showOrdenCompraModal`).

El modal muestra la lista `alertasReposicion` (= alertas críticas + alertas bajas) con:
- Producto
- Código
- Stock disponible
- Stock mínimo
- Cantidad a pedir (= evaluation.missing)

El botón "Generar Orden" en el modal:
1. Construye un string de texto plano con los datos de la orden
2. Crea un `Blob` de tipo `text/plain`
3. Descarga el archivo como `orden-compra-{timestamp}.txt`

**Evidencia técnica:** `AlertsPanel.tsx:488-531`

```typescript
const blob = new Blob([ordenCompra], { type: 'text/plain' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `orden-compra-${Date.now()}.txt`;
```

### Análisis

| Criterio | Evaluación |
|---|---|
| ¿Genera una orden de compra real? | **No.** Genera un `.txt` temporal |
| ¿Está conectado a un módulo de Compras? | **No.** El módulo de Compras no existe aún |
| ¿Tiene valor para el usuario operativo? | Limitado. Un `.txt` no es un documento formal |
| ¿Debe vivir en Inventario? | **No.** Las órdenes de compra pertenecen a Compras |
| ¿Confunde al usuario? | Sí. El nombre sugiere una operación formal |
| ¿Debe eliminarse? | **Sí, o reemplazarse por "Exportar sugerencia de reposición"** |

### Código que quedaría muerto si se elimina

- Estado `showOrdenCompraModal`, `ordenCompraGenerada` en `AlertsPanel.tsx`
- Variable `alertasReposicion` (calculada solo para este modal)
- El JSX completo del modal de orden de compra (~160 líneas en `AlertsPanel.tsx`)
- Variable `reporte` del "Exportar Reporte" es independiente y no afecta

### Riesgo de mantenerlo

- El usuario puede creer que el `.txt` es un documento oficial
- Cuando exista el módulo de Compras, habría dos flujos contradictorios
- El código es temporal y no refleja el flujo correcto de reposición

---

## 10. Evaluación del Reporte / Exportación

### Botón "Exportar Reporte" (`AlertsPanel.tsx:107-148`)

Genera un `.txt` con el detalle de todas las alertas:
```
REPORTE DE ALERTAS DE STOCK
Fecha: ...
Total de alertas: N
Críticas: N
Stock Bajo: N
Excede Máximo: N

DETALLE:
1. Nombre Producto
   Código: ...
   Disponible: ...
   Stock Mínimo: ...
   Faltante: ...
```

| Criterio | Estado |
|---|---|
| ¿Respeta filtros del panel? | Parcialmente (hereda almacenFiltro del hook, pero el `.txt` no indica qué filtros aplicaron) |
| ¿Columnas suficientes? | Mínimas. Falta: almacén, establecimiento, stock máximo en todos los casos, stock real vs disponible |
| ¿Sirve para reposición? | Parcialmente. La cantidad "Faltante" está calculada |
| ¿Formato adecuado? | No. Un `.txt` no es filtrable ni útil para análisis |
| ¿Debería ser Excel? | Sí, para ser coherente con el resto del módulo |

### Columnas recomendadas para un reporte de alertas

| Columna | Existe hoy | Debería existir |
|---|---|---|
| Producto | Sí | Sí |
| Código | Sí | Sí |
| Almacén | No | Sí |
| Establecimiento | No | Sí |
| Stock disponible | Sí | Sí |
| Stock real | No | Sí |
| Stock mínimo | Sí | Sí |
| Stock máximo | No | Sí |
| Faltante | Sí (en críticas) | Sí |
| Excedente | Sí (en exceso) | Sí |
| Estado | No | Sí |
| Es crítico | No | Sí |

---

## 11. Problemas Detectados

| ID | Severidad | Problema | Evidencia técnica | Impacto funcional | Recomendación |
|---|---|---|---|---|---|
| A1 | **Crítico** | Productos sin stock (= 0) que NO tienen stockMinimo configurado son invisibles para el sistema de alertas | `stockAlerts.ts:44-57`: `typeof min === 'number' && available <= min` — sin min, siempre retorna OK | Operaciones sin configuración previa no generan ninguna alerta, aunque estén en 0 | Agregar tipo de alerta `SIN_STOCK` independiente del mínimo, o aplicar `LOW` cuando disponible = 0 |
| A2 | **Alto** | El botón "Generar Orden de Compra" genera un `.txt` temporal, no una orden real | `AlertsPanel.tsx:488-531`: Blob text/plain | El usuario puede confundirlo con un documento formal; no se integra con módulo de Compras | Eliminar el modal y botón; reemplazar con "Exportar sugerencia de reposición" en Excel |
| A3 | **Alto** | "Exportar Excel" en la barra de acciones exporta movimientos, no alertas, cuando el usuario está en el tab Alertas | `InventoryPage.tsx`: barra de acciones activa para selectedView 'alertas'; usa `movimientosFiltradosVisiblesRef` | Confusión de usuario; no puede exportar las alertas como Excel desde el botón visible | Ocultar "Exportar Excel" de la barra cuando selectedView = 'alertas', o agregar exportación propia al panel |
| A4 | **Medio** | `evaluateStockAlert` re-ejecutada en `AlertsPanel` para cada alerta, cuyos resultados ya están en el objeto `StockAlert` (`isCritical`, `faltante`, `excedente`) | `AlertsPanel.tsx:64-71` re-evalúa lo que ya calculó `generateAlerts` | Cálculo doble sin beneficio; `evaluation.missing` = `alerta.faltante` | Usar directamente `alerta.faltante`, `alerta.excedente`, `alerta.isCritical` en lugar de re-evaluar |
| A5 | **Medio** | `isCritical = (available === 0)` cuando `min === undefined` es código muerto: el tipo retornado sería OK y nunca genera alerta | `stockAlerts.ts:73`: `const isCritical = min !== undefined ? ... : available === 0` | La condición nunca impacta el sistema porque `generateAlerts` filtra por `type !== 'OK'` | Documentar o eliminar la rama muerta; o usarla para agregar el tipo `SIN_STOCK` |
| A6 | **Medio** | El archivo `stockAlerts.test.ts` no usa `describe/it` de vitest; el runner lo reporta como fallido | `stockAlerts.test.ts:15`: `export const runStockAlertTests = () => {...}` | Los tests nunca se ejecutan automáticamente; errores de regresión no se detectarían | Convertir a formato vitest estándar con `describe` e `it` |
| A7 | **Bajo** | Los botones "Reabastecer" y "Programar Compra" hacen exactamente lo mismo internamente | `AlertsPanel.tsx:207-211, 275-279`: ambos llaman `openAdjustmentModal(id, cantidadSugerida)` | El usuario podría esperar comportamientos diferentes | Unificar en un solo botón "Ajustar stock" o diferenciar si "Programar Compra" va a tener un flujo futuro |
| A8 | **Bajo** | El panel no indica qué almacén está filtrando cuando almacenFiltro ≠ 'todos' | AlertsPanel no muestra el filtro activo | El usuario podría no entender por qué ve pocas alertas | Agregar indicador del filtro de almacén activo |
| A9 | **Bajo** | El reporte exportado es `.txt` cuando el resto del módulo usa Excel | `AlertsPanel.tsx:142-148` Blob text/plain | Inconsistencia con el resto del módulo | Convertir a Excel con XLSX igual que movimientos |
| A10 | **Bajo** | El banner de alertas siempre se muestra aunque haya 0 alertas (empty state separado abajo) | `AlertsPanel.tsx:81-155`: el banner siempre renderiza | Algo confuso: hay dos estados posibles pero el banner superior siempre está visible | Ocultar el banner cuando alertasDecoradas.length === 0 y dejar solo el empty state |

---

## 12. Qué Está Bien y Debe Mantenerse

- **`evaluateStockAlert()` y `getStockAlertType()`** son funciones puras, bien estructuradas y con lógica correcta para los casos que cubren.
- **`sanitizeNumber()`, `sanitizeAvailable()`, `sanitizeThreshold()`** son helpers defensivos que protegen contra valores null/undefined/NaN/Infinity. Deben mantenerse.
- **`generateAlerts()` itera producto × almacén** correctamente, generando una alerta por cada combinación con problema. Esto es la granularidad correcta.
- **Stock disponible = real − reservado** es el cálculo correcto para alertas operativas.
- **Ordenamiento CRITICO > BAJO > EXCESO** en el resultado de `generateAlerts` es útil para UI.
- **El useMemo que depende de `allProducts`** garantiza que las alertas se refrescan automáticamente con cada operación de stock.
- **El filtro por almacén** en `stockAlerts` del hook funciona correctamente.
- **La configuración inline de mínimos/máximos** en Stock Actual (DisponibilidadTable) es un buen lugar. No necesita moverse.
- **La lógica de `isCritical`** para el caso con mínimo configurado es correcta (≤ 50% del mínimo).
- **El botón "Reabastecer"** que abre el modal de ajuste es útil como acceso rápido desde la alerta.
- **El empty state** ("¡Excelente! No hay alertas") es correcto y positivo.
- **El badge de conteo** en el tab Alertas (número rojo en la pestaña) es útil para notificación rápida.

---

## 13. Qué Debe Eliminarse

### Prioritario

1. **Modal "Generar Orden de Compra"** completo:
   - Estado `showOrdenCompraModal`, `ordenCompraGenerada` en `AlertsPanel.tsx`
   - Variable `alertasReposicion` si solo se usa en ese modal
   - Todo el JSX del modal (~160 líneas)
   - El botón "Generar Orden de Compra" del banner superior

2. **Variable `alertasReposicion`** si queda sin uso tras eliminar el modal (actualmente calculada como `[...alertasCriticas, ...alertasBajas]`)

### Opcional pero recomendado

3. **Re-evaluación en `AlertsPanel`**: reemplazar `alertasDecoradas` con lógica directa sobre los campos ya calculados de `StockAlert` (`isCritical`, `faltante`, `excedente`).

4. **`stockAlerts.test.ts`**: convertir a formato vitest estándar o eliminar si no aporta. No puede quedar como está (formato inválido para el runner).

5. **Rama muerta** en `evaluateStockAlert`: el `isCritical = available === 0` cuando min === undefined nunca impacta. Debe documentarse como comportamiento futuro o eliminarse.

---

## 14. Qué Falta para que Alertas Aporte Valor Real

En orden de prioridad:

1. **Alerta de "sin stock" sin necesidad de mínimo** — el gap más crítico. Un producto con 0 unidades DEBE aparecer en alertas aunque no tenga configurado un stock mínimo. Propuesta: si disponible = 0 y no hay mínimo configurado, generar alerta tipo `SIN_STOCK` o `LOW` con `isCritical=true`.

2. **Exportación Excel de alertas** — coherente con el resto del módulo. Columns: Producto, Código, Almacén, Establecimiento, Stock Real, Stock Disponible, Stock Reservado, Stock Mínimo, Stock Máximo, Faltante, Excedente, Estado, Es Crítico.

3. **Indicador del filtro activo** — si el usuario filtra por almacén, el panel debe mostrar "Mostrando alertas del almacén: CODIGO - Nombre" para evitar confusión.

4. **Separación del "Exportar Excel" de movimientos** — ocultar el botón de exportación de movimientos cuando el usuario está en el tab Alertas, o agregar un botón "Exportar alertas" específico al panel.

5. **Diferenciación visual entre sin-stock y bajo-stock** — actualmente ambos son `BAJO`/`CRITICO` mezclados. Un símbolo o filtro visual por tipo ayudaría.

6. **Conversión de tests a formato vitest** — para que los tests de regresión se ejecuten automáticamente.

7. **Filtros dentro del panel de alertas** — filtrar por tipo (crítico / bajo / exceso), por establecimiento, por categoría de producto.

---

## 15. Recomendación Funcional Final

**¿Debe seguir llamándose "Alertas"?** Sí. El nombre es correcto.

**¿Debe incluir configuración?** No. La configuración de stock mínimo/máximo ya está en "Stock Actual" y ese es el lugar correcto (inline, por almacén). No mover.

**¿Debe existir "Configuración de alertas"?** No es urgente. Lo más valioso es corregir el gap de "sin stock sin mínimo" y eliminar la orden de compra temporal.

**¿Debe eliminarse Orden de Compra?** **Sí, definitivamente.** Genera un `.txt` falso que no es una orden real. Cuando exista Compras, habría conflicto. El texto "Orden de Compra" en el contexto de Inventario es semánticamente incorrecto. Puede reemplazarse con "Exportar sugerencia de reposición" en Excel.

**¿Qué debe hacerse primero?** En orden:
1. Eliminar el modal/código de Orden de Compra
2. Agregar alerta de "sin stock" independiente de mínimo
3. Convertir exportación de alertas a Excel
4. Corregir el `stockAlerts.test.ts` a formato vitest

---

## 16. Plan de Acción Sugerido

*(Sin implementar — solo propuesta)*

### Paso 1 — Correcciones críticas

- [ ] Agregar caso `SIN_STOCK` en `getStockAlertType()`: si `disponible === 0` y `min === undefined`, retornar `LOW` con `isCritical = true`
- [ ] Agregar el campo `cantidadActual === 0 && !stockMinimo` como condición de alert en `generateAlerts`

### Paso 2 — Limpieza

- [ ] Eliminar el modal "Generar Orden de Compra" completo (`AlertsPanel.tsx`)
- [ ] Eliminar el botón "Generar Orden de Compra" del banner
- [ ] Limpiar variables huérfanas: `showOrdenCompraModal`, `ordenCompraGenerada`, `alertasReposicion`
- [ ] Convertir `stockAlerts.test.ts` a formato vitest estándar (`describe/it`)

### Paso 3 — Mejoras funcionales

- [ ] Convertir "Exportar Reporte" de `.txt` a Excel usando XLSX
- [ ] Agregar columnas: almacén, establecimiento, stock real, stock reservado, tipo de alerta
- [ ] Eliminar re-evaluación en `AlertsPanel`: usar directamente `alerta.faltante`, `alerta.excedente`, `alerta.isCritical`
- [ ] Ocultar botón "Exportar Excel" de la barra general cuando `selectedView === 'alertas'`, o agregar uno específico en el panel

### Paso 4 — Mejoras visuales

- [ ] Agregar indicador del almacén/filtro activo dentro del panel
- [ ] Unificar o diferenciar "Reabastecer" y "Programar Compra"
- [ ] Ocultar banner superior cuando no hay alertas (mostrar solo el empty state)

### Paso 5 — Integración futura con Compras

- [ ] Cuando exista módulo de Compras, agregar botón "Crear orden de compra" que envíe la lista de reposición al módulo de Compras con productos y cantidades sugeridas
- [ ] Mantener "Exportar sugerencia de reposición" como documento de apoyo

---

## 17. Conclusión Final

**¿La vista está lista?** Parcialmente. Funciona para productos con stock mínimo configurado, que en un inventario bien gestionado debería ser la mayoría. Pero el gap de "sin stock sin mínimo" la hace incompleta.

**¿Falta corrección?** Sí. El gap crítico (A1) hace que una categoría entera de problemas sea invisible. El botón de Orden de Compra (A2) introduce código temporal que distorsiona el flujo correcto.

**¿Debe simplificarse?** Sí. El modal de Orden de Compra debe eliminarse. La re-evaluación doble debe limpiarse. Los tests deben convertirse a formato estándar.

**¿Debe eliminarse algo?** Sí. El modal de Orden de Compra con todo su código asociado es la eliminación más urgente y de mayor impacto.

**¿Puede considerarse parte confiable del Kardex/inventario?** **Sí, con las correcciones indicadas.** El cálculo base (evaluateStockAlert, generateAlerts) es sólido y correcto para el 80% de casos. Con el fix de "sin stock sin mínimo" y la limpieza del código temporal, el tab Alertas sería confiable como indicador operativo del inventario.
