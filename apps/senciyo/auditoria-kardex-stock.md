# Auditoría Kardex, Stock y Movimientos

> **Fecha:** 2026-06-05
> **Branch:** ImplementacionNotaIngreso
> **Autor:** Revisión técnica sobre los hallazgos del análisis de código estático del módulo `gestion-inventario` y módulos relacionados.

---

## 1. Resumen ejecutivo

El sistema FacturaFacil / senciyo gestiona el inventario íntegramente en el frontend mediante `localStorage` y un store Zustand. No existe una capa de persistencia en servidor para movimientos ni para el stock en tiempo real. El stock de cada producto se almacena como tres mapas paralelos (`stockPorAlmacen`, `stockReservadoPorAlmacen`, `stockMinimoPorAlmacen`) en el objeto `Product` del catálogo.

La capa de cálculo centralizada reside en `src/shared/inventory/stockGateway.ts`, que suma las cantidades de todos los almacenes activos del establecimiento activo para obtener un único `totalAvailable`. Este total agregado es el número que se muestra al vendedor en Comprobantes, POS, Cotización, Nota de Venta y Orden de Venta.

El hallazgo crítico de esta auditoría es que la cifra mostrada en los módulos de venta representa el stock global del establecimiento (suma de todos sus almacenes), mientras que la deducción real al emitir un comprobante opera sobre almacenes individuales con lógica FIFO. Esto crea una asimetría de información: el vendedor ve "260 unidades disponibles" pero esas 260 están distribuidas en 4 almacenes y el proceso de venta las consumirá de uno a la vez siguiendo una prioridad opaca para el usuario.

---

## 2. Fuente de verdad del stock

| Concepto | Dónde vive | Tipo | Clave |
|---|---|---|---|
| Stock real por almacén | `Product.stockPorAlmacen` | `Record<string, number>` | `almacenId` |
| Stock reservado por almacén | `Product.stockReservadoPorAlmacen` | `Record<string, number>` | `almacenId` |
| Stock mínimo por almacén | `Product.stockMinimoPorAlmacen` | `Record<string, number>` | `almacenId` |
| Stock máximo por almacén | `Product.stockMaximoPorAlmacen` | `Record<string, number>` | `almacenId` |
| Stock por establecimiento (legado) | `Product.stockPorEstablecimiento` | `Record<string, number>` | `establecimientoId` |
| Stock global (legado) | `Product.cantidad` | `number` | — |
| Historial de movimientos | `localStorage[tenantKey]` | `MovimientoStock[]` | — |
| Notas de Ingreso | `localStorage['notas_ingreso_v1']` | `NotaIngreso[]` | — |

**El campo `stockPorAlmacen` es la fuente de verdad primaria.** Los campos `stockPorEstablecimiento` y `cantidad` son rutas de compatibilidad que se usan cuando `stockPorAlmacen` está ausente. Todos los módulos modernos escriben y leen desde `stockPorAlmacen`.

Los movimientos de stock se persisten en `src/pages/Private/features/gestion-inventario/repositories/stock.repository.ts` bajo una clave con prefijo de tenant. Estos movimientos son el registro histórico (kardex) pero **no son la fuente de verdad del stock actual**: el stock actual solo existe en el objeto `Product` del catálogo.

---

## 3. Modelo actual: real, reservado y disponible

```
stockReal[almacenId]        = Product.stockPorAlmacen[almacenId]
stockReservado[almacenId]   = max(0, Product.stockReservadoPorAlmacen[almacenId])
stockDisponible[almacenId]  = max(0, stockReal[almacenId] - stockReservado[almacenId])

totalReal        = Σ stockReal[a]       para a ∈ almacenesActivosDelEstablecimiento
totalReservado   = min(Σ stockReservado[a], max(totalReal, 0))   // reservado no puede exceder real
totalDisponible  = max(0, totalReal - totalReservado)
```

La fórmula de `totalReservado` con el `Math.min` está en `useInventarioDisponibilidad.ts` línea ~237 y sirve para evitar que inconsistencias de datos muestren stock disponible negativo al usuario.

La conversión de unidades se aplica sobre `totalAvailable` (en unidad mínima) mediante `convertFromUnidadMinima` antes de mostrar el valor al usuario.

---

## 4. Servicios/helpers identificados

| Helper / Servicio | Archivo | Responsabilidad |
|---|---|---|
| `summarizeProductStock` | `src/shared/inventory/stockGateway.ts` | Agrega stock de todos los almacenes activos del establecimiento |
| `getAvailableStockForUnit` | `src/shared/inventory/stockGateway.ts` | Llama a `summarizeProductStock` y convierte unidades |
| `allocateSaleAcrossalmacenes` | `src/shared/inventory/stockGateway.ts` | FIFO: distribuye una venta entre almacenes |
| `resolvealmacenForSale` | `src/shared/inventory/stockGateway.ts` | Resuelve almacén único para reservas de OV |
| `resolvealmacenesForSaleFIFO` | `src/shared/inventory/stockGateway.ts` | Ordena almacenes para deducción FIFO |
| `hasSufficientStock` | `src/shared/inventory/stockGateway.ts` | Verifica `totalAvailable >= requerido` |
| `registrarAjusteDeStock` | `src/shared/inventory/accionesStock.ts` | Punto único de mutación frontend (llama a InventoryService + Zustand) |
| `InventoryService.registerAdjustment` | `src/pages/Private/features/gestion-inventario/services/inventory.service.ts` | Calcula nuevo stock, crea `MovimientoStock`, llama a `StockRepository.addMovement` |
| `InventoryService.registerTransfer*` | ídem | Genera dos movimientos vinculados para transferencias |
| `InventoryService.generateAlerts` | ídem | Compara stock real con mínimos/máximos, retorna `StockAlert[]` |
| `StockRepository` | `src/pages/Private/features/gestion-inventario/repositories/stock.repository.ts` | CRUD de `MovimientoStock[]` en localStorage |
| `generarNIEnInventario` | `src/pages/Private/features/gestion-inventario/services/notaIngreso.service.ts` | Genera entradas de stock por línea de NI (función pura) |
| `anularNIEnInventario` | ídem | Genera reversiones de stock por línea de NI (función pura) |
| `validarStockParaOrden` | `src/pages/Private/features/documentos-comerciales/utils/servicioReservaStock.ts` | Valida stock disponible antes de confirmar OV |
| `reservarStockOrden` | ídem | Incrementa `stockReservadoPorAlmacen` para OV |
| `liberarReservaOrden` | ídem | Decrementa `stockReservadoPorAlmacen` al anular OV |
| `useInventoryFacade.addMovimiento` | `src/pages/Private/features/gestion-inventario/api/inventory.facade.ts` | Punto de entrada para módulos externos (ventas, NC) |

---

## 5. Flujos que modifican stock real (`stockPorAlmacen`)

| Flujo | Tipo de movimiento | Punto de entrada |
|---|---|---|
| Ajuste manual en UI inventario | `AJUSTE_POSITIVO` / `AJUSTE_NEGATIVO` | `useInventory.handleStockAdjustment` |
| Transferencia intra-establecimiento | `SALIDA` + `ENTRADA` (vinculados) | `useInventory.handleCreateTransfer` |
| Transferencia inter-establecimiento: despacho | `SALIDA` | `useInventory.handleDespacharTransfer` |
| Transferencia inter-establecimiento: recepción | `ENTRADA` | `useInventory.handleRecibirTransfer` |
| Anulación de transferencia | Movimientos inversos | `useInventory.handleAnularTransfer` |
| Importación masiva de stock (Excel) | `AJUSTE_POSITIVO` / `AJUSTE_NEGATIVO` | `PanelImportacionStock` → `InventoryService.registerAdjustment` |
| Reset masivo de stock | `AJUSTE_NEGATIVO` a cero | ídem |
| Generación de Nota de Ingreso | `ENTRADA` por línea de NI | `useNotasIngreso.generarNI` → `generarNIEnInventario` |
| Anulación de Nota de Ingreso | `AJUSTE_NEGATIVO` por línea de NI | `useNotasIngreso.anularNI` → `anularNIEnInventario` |
| Emisión de comprobante (Factura/Boleta/NV) | `SALIDA` / `VENTA` por ítem | `useComprobanteActions.createComprobante` → `addMovimiento` |
| Nota de Crédito devolución (códigos 06/07 SUNAT) | `ENTRADA` / `DEVOLUCION_CLIENTE` | `useComprobanteActions` → `addMovimiento` |
| Anulación de comprobante en lista | `ENTRADA` inversa | `ListaComprobantes` → `addMovimiento` |
| Actualización masiva en UI (batch) | `AJUSTE_POSITIVO` / `AJUSTE_NEGATIVO` | `useInventory.handleMassStockUpdate` → `InventoryService.processMassUpdate` |

---

## 6. Flujos que modifican stock reservado (`stockReservadoPorAlmacen`)

| Flujo | Efecto | Archivo |
|---|---|---|
| Generación de Orden de Venta | Incrementa `stockReservadoPorAlmacen[almacenPrincipal]` | `servicioReservaStock.reservarStockOrden` |
| Anulación de Orden de Venta (estado `Reservada`) | Decrementa con floor a 0 | `servicioReservaStock.liberarReservaOrden` |
| Conversión de OV a comprobante (post-emisión) | Libera la reserva (decrementa) | `postEmisionOrdenVenta.liberarReservasDeOV` |

**Importante:** Ningún otro módulo toca `stockReservadoPorAlmacen`. Los ajustes manuales, importaciones masivas, transferencias y Notas de Ingreso ignoran completamente este campo.

---

## 7. Flujos que solo consultan stock

| Flujo | Función usada | Qué muestra |
|---|---|---|
| Lista de productos en Comprobantes (búsqueda) | `getAvailableStockForUnit` | `totalAvailable` del establecimiento |
| Carrito en POS (validación add-to-cart) | `summarizeProductStock` | `totalAvailable` para bloquear si insuficiente |
| ProductGrid POS | `getAvailableStockForUnit` | stock en unidad de presentación |
| ProductSelector (lista comprobantes) | `summarizeProductStock` | `totalAvailable` con colores |
| InventarioSituacionPage (Stock Actual) | `useInventarioDisponibilidad` | real, reservado, disponible por almacén |
| AlertsPanel | `InventoryService.generateAlerts` | productos bajo mínimo/máximo |
| MovementsTable (Kardex) | `StockRepository.getMovements()` | historial de movimientos |
| Cotización / Nota de Venta (formulario) | `getAvailableStockForUnit` | solo visualización, sin bloqueo |
| FormularioNotaIngreso | `product.stockPorAlmacen?.[lineaAlmacenId]` | stock actual del almacén destino de cada línea |
| DisponibilidadTable | `item.stockPorAlmacen?.[w.id]` | por columna de almacén |

---

## 8. Revisión de Stock Actual

**Archivo principal:** `src/pages/Private/features/gestion-inventario/components/disponibilidad/InventarioSituacionPage.tsx`
**Hook:** `src/pages/Private/features/gestion-inventario/hooks/useInventarioDisponibilidad.ts`

El módulo Stock Actual es el único que muestra stock **desagregado por almacén**. El hook `useInventarioDisponibilidad` calcula para cada producto:

- `real`: suma de `getStock(product, almacenId)` para cada almacén en el scope
- `reservado`: suma clampeada de `getReservedStock(product, almacenId)` para cada almacén en el scope
- `disponible`: `max(0, real - reservado)`
- `stockPorAlmacen`: mapa `{ [almacenId]: stock }` para columnas individuales (solo cuando el scope tiene más de 1 almacén)

La vista `DisponibilidadTable` renderiza una columna por almacén activo con el valor `item.stockPorAlmacen?.[w.id] ?? 0`. El total consolidado es correcto (suma de todos los almacenes). Esta es la única pantalla donde el usuario puede ver la distribución real.

**Estado:** Correcto. Funciona por diseño.

---

## 9. Revisión de Movimientos / Kardex

**Archivos:**
- `src/pages/Private/features/gestion-inventario/components/tables/MovementsTable.tsx`
- `src/pages/Private/features/gestion-inventario/components/modals/MovimientoDetalleModal.tsx`
- `src/pages/Private/features/gestion-inventario/repositories/stock.repository.ts`

El "Kardex" en esta aplicación es el `MovementsTable` — una tabla paginada que muestra todos los `MovimientoStock[]` del establecimiento activo. Cada registro guarda `cantidadAnterior`, `cantidadNueva`, `almacenId`, `almacenNombre`, y opcionalmente `documentoReferencia`.

**No existe ningún archivo llamado `kardex*.ts`**. El kardex es implícito: los `MovimientoStock` creados por `InventoryService.registerAdjustment` y `registerTransfer*` constituyen el registro secuencial de todos los movimientos.

**Persistencia:** Solo en `localStorage`. No hay sincronización con backend. Si el navegador borra los datos, el kardex desaparece (pero el stock en el catálogo persiste por separado en el store de productos).

**Función `inferirFuente`** en `src/pages/Private/features/gestion-inventario/utils/inventory.helpers.ts` determina la etiqueta de origen a partir de campos del movimiento:

```ts
// Prefijos de documentoReferencia usados para clasificar la fuente
// IMP-...  → Importación masiva
// RST-...  → Reset de stock
// NI-...   → Nota de Ingreso
// Factura/Boleta → detectado por motivo=VENTA
```

**Gap:** No existe un índice inverso del kardex por producto. La búsqueda de movimientos históricos de un producto requiere `StockRepository.getMovementsByProduct(productId)` que itera el array completo en memoria. Con volúmenes altos en localStorage esto puede degradar el rendimiento.

---

## 10. Revisión de Importación Masiva

**Archivo:** `src/pages/Private/features/gestion-inventario/components/PanelImportacionStock.tsx`

El panel permite cargar un Excel y aplicar tres modos: actualizar (diferencia), sumar (solo positivo), y reset (llevar a cero). Cada fila del Excel mapea a un `almacenId` específico del establecimiento activo.

**Flujo de escritura:**
1. Lee `productoActual.stockPorAlmacen?.[almacenId]`
2. Calcula la delta según el modo
3. Llama `InventoryService.registerAdjustment(...)` con `documentoReferencia: loteId` donde el loteId tiene formato `IMP-YYYYMMDD-HHmmss` o `RST-YYYYMMDD-HHmmss`
4. `registerAdjustment` actualiza `stockPorAlmacen` y persiste el `MovimientoStock`

**Gap detectado:** `PanelImportacionStock` **no llama a `syncEstablecimientoStock`** después de cada importación. El campo `Product.stockPorEstablecimiento` queda desincronizado con `stockPorAlmacen` hasta que una transferencia (que sí llama al sync) ocurra. Los módulos que usen la ruta de fallback `stockPorEstablecimiento` (cuando `stockPorAlmacen` es nulo) verán datos obsoletos.

**Recomendación (fase posterior):** Después de ejecutar la importación masiva, recalcular `stockPorEstablecimiento[establecimientoId]` como la suma de `stockPorAlmacen[a.id]` para todos los almacenes del establecimiento, del mismo modo en que lo hace `syncEstablecimientoStock` en `useInventory.ts`.

---

## 11. Revisión de Ajustes

**No existe un archivo dedicado `ajuste*.ts` o `ajuste*.tsx`.**

Los ajustes manuales se orquestan desde:
- UI: `src/pages/Private/features/gestion-inventario/components/modals/AdjustmentModal.tsx`
- Hook: `useInventory.handleStockAdjustment` en `useInventory.ts`
- Servicio: `InventoryService.registerAdjustment` en `inventory.service.ts`

El modal permite seleccionar producto, almacén, tipo (`AJUSTE_POSITIVO` / `AJUSTE_NEGATIVO`), motivo, cantidad y observaciones. La validación en el modal verifica que la cantidad no deje el stock en negativo (a menos que `allowNegativeStock` esté activo).

**Gap:** Al igual que la importación masiva, los ajustes manuales no recalculan `stockPorEstablecimiento`. Solo actualizan `stockPorAlmacen[almacenId]`.

---

## 12. Revisión de Transferencias

**Archivos:**
- `src/pages/Private/features/gestion-inventario/models/transferencia.types.ts`
- `src/pages/Private/features/gestion-inventario/repositories/transferencia.repository.ts`
- `src/pages/Private/features/gestion-inventario/components/transferencias/TransferenciasPanel.tsx`
- Orquestación: `useInventory.ts` métodos `handleCreateTransfer`, `handleDespacharTransfer`, `handleRecibirTransfer`, `handleAnularTransfer`

**Tipos de transferencia:**
- `INTRA_ESTABLECIMIENTO`: operación atómica (SALIDA + ENTRADA en el mismo tick). Llama `syncEstablecimientoStock` para ambos establecimientos.
- `INTER_ESTABLECIMIENTO`: operación en dos pasos: despacho (solo SALIDA del origen) y recepción (solo ENTRADA en destino). El estado `EN_TRANSITO` existe entre ambos pasos.

**Gap 1 — Stock reservado no considerado:** `registerTransferSalida` valida solo contra `stockPorAlmacen[almacenId]` puro, sin descontar `stockReservadoPorAlmacen`. Una transferencia puede mover unidades que ya están comprometidas con una Orden de Venta activa.

**Gap 2 — Ventana de inconsistencia inter-establecimiento:** Mientras una transferencia está en estado `EN_TRANSITO`, el stock del almacén origen ya fue decrementado pero el destino aún no lo recibió. Durante ese período, si ocurre otra venta o ajuste, el stock del destino puede comprometerse antes de que la transferencia llegue.

**Gap 3 — `stockReservadoPorAlmacen` nunca se toca en transferencias.** Si el almacén destino tiene reservas existentes, la llegada de nuevas unidades vía transferencia reduce el stock disponible real pero no libera automáticamente ninguna reserva pendiente.

---

## 13. Revisión de Nota de Ingreso

**Archivos:**
- `src/pages/Private/features/gestion-inventario/models/notaIngreso.types.ts`
- `src/pages/Private/features/gestion-inventario/models/notaIngreso.constants.ts`
- `src/pages/Private/features/gestion-inventario/services/notaIngreso.service.ts`
- `src/pages/Private/features/gestion-inventario/repositories/notaIngreso.repository.ts`
- `src/pages/Private/features/gestion-inventario/hooks/useNotasIngreso.ts`
- `src/pages/Private/features/gestion-inventario/components/notas-ingreso/NotasIngresoPanel.tsx`
- `src/pages/Private/features/gestion-inventario/components/notas-ingreso/FormularioNotaIngreso.tsx`
- `src/pages/Private/features/gestion-inventario/components/notas-ingreso/DetalleNotaIngreso.tsx`

**Ciclo de vida:**

| Estado | Acciones permitidas | Efecto en stock |
|---|---|---|
| `Borrador` | Editar, eliminar | Ninguno |
| `Generada` | Anular, duplicar | `stockPorAlmacen` incrementado por línea |
| `Anulada` | Solo visualizar | `stockPorAlmacen` revertido por línea |

**Generación:**
`generarNIEnInventario` es una función pura (no persiste). Por cada línea no-servicio:
1. Resuelve el almacén: `linea.almacenId ?? nota.almacenDestinoId`
2. Mapea `nota.tipoIngreso` a `MovimientoMotivo`
3. Crea `StockAdjustmentData` con `tipo: 'ENTRADA'` y `documentoReferencia: 'NI-SERIE-XXXXXXXX'`
4. Llama `InventoryService.registerAdjustment(product, almacen, data, usuario)`

El hook `useNotasIngreso.generarNI` recibe los arrays `productoActualizado` y los aplica con `updateProduct(id, producto)` en el store Zustand.

**Nota importante:** La NI soporta que cada línea tenga un `almacenId` diferente. Esto significa que un único documento puede distribuir stock entre múltiples almacenes. Esta funcionalidad funciona correctamente y es el origen del escenario descrito en el hallazgo crítico.

---

## 14. Revisión de Orden de Venta

**Archivos clave:**
- `src/pages/Private/features/documentos-comerciales/utils/servicioReservaStock.ts`
- `src/pages/Private/features/documentos-comerciales/hooks/useDocumentoComercialActions.ts`
- `src/pages/Private/features/documentos-comerciales/utils/convertirOVaComprobante.ts`
- `src/shared/documentosComerciales/postEmisionOrdenVenta.ts`

**Ciclo de vida del stock en OV:**

| Evento | Función | Efecto |
|---|---|---|
| Generación de OV | `validarStockParaOrden` + `reservarStockOrden` | Valida `totalAvailable` global, luego reserva en `almacenPrincipal` |
| Anulación de OV | `liberarReservaOrden(doc.reservasStock)` | Decrementa `stockReservadoPorAlmacen[reserva.almacenId]` |
| Conversión a comprobante | `actualizarOrdenVentaPostEmision` | Libera reserva (`stockReservadoPorAlmacen`) + marca OV como `Atendida` |

**Gap crítico de la OV:** La validación usa `totalAvailable` (suma de todos los almacenes), pero la reserva se escribe únicamente en el almacén principal (`resolvealmacenForSale` devuelve un único almacén). Si el stock disponible está distribuido entre múltiples almacenes y ninguno tiene suficiente individualmente, la OV podría reservar en el almacén principal aunque este no tenga suficiente stock real propio.

**Ejemplo:**
- Almacén principal: 5 unidades disponibles
- Almacén secundario: 10 unidades disponibles
- `totalAvailable` = 15 → validación pasa
- Reserva se escribe en almacén principal: `stockReservadoPorAlmacen[almacenPrincipal] += 15`
- Resultado: stock reservado del almacén principal supera su stock real

La emisión posterior del comprobante usa FIFO entre almacenes y libera correctamente la reserva, pero el estado intermedio (OV en estado `Reservada`) es inconsistente.

---

## 15. Revisión de Comprobantes

**Archivo principal:** `src/pages/Private/features/comprobantes-electronicos/hooks/useComprobanteActions.tsx`

**Flujo en `createComprobante` (validación y deducción):**

```
1. Se guarda el documento del comprobante en localStorage.
2. Para cada ítem con requiresStockControl = true:
   a. resolvealmacenesForSaleFIFO → lista almacenes del establecimiento (principal primero)
   b. calculateRequiredUnidadMinima → convierte cantidad a unidad mínima
   c. allocateSaleAcrossalmacenes → distribuye entre almacenes FIFO
   d. Si sobrante > 0 y !allowNegativeStock → lanza Error
   e. addMovimientoStock → SALIDA/VENTA por almacén
3. Si paso 2 falla: el comprobante ya existe. Toast de advertencia. Sin rollback.
```

**Gap crítico:** El comprobante se persiste **antes** de la deducción de stock. No hay transaccionalidad. Si la deducción falla (por stock insuficiente), el documento queda emitido sin movimiento Kardex. El vendedor debe corregir manualmente.

**Reversión (NC/anulación):**
La búsqueda de los movimientos `SALIDA/VENTA` originales se hace por `documentoReferencia` en `StockRepository.getMovements()`. Si no se encuentran, la restitución va al almacén primario. La restitución siempre usa `allowNegativeStock: true`.

---

## 16. Revisión de Punto de Venta

**Archivos:**
- `src/pages/Private/features/comprobantes-electronicos/punto-venta/hooks/useCart.tsx`
- `src/pages/Private/features/comprobantes-electronicos/punto-venta/components/products/ProductGrid.tsx`
- `src/pages/Private/features/comprobantes-electronicos/hooks/useAvailableProducts.tsx`

El POS usa exactamente los mismos helpers de stock que los Comprobantes tradicionales:

- **Pantalla de productos:** `getAvailableStockForUnit` → muestra `totalAvailable` convertido a unidad de presentación. Colores: verde (≥10), ámbar (<10), rojo (0). Botón de ajuste aparece cuando stock = 0.
- **Validación al agregar al carrito:** `summarizeProductStock` + `calculateRequiredUnidadMinima`. Bloquea con mensaje de error si `!allowNegativeStock`.
- **Deducción al emitir:** delega a `useComprobanteActions.createComprobante` — idéntico al flujo de Comprobantes tradicional.

El POS no tiene un almacén seleccionado explícitamente por el operador. La deducción FIFO consume el almacén principal primero. El vendedor ve el total del establecimiento.

---

## 17. Revisión de Cotización y Nota de Venta

**Archivo:** `src/pages/Private/features/documentos-comerciales/hooks/useDocumentoComercialActions.ts`

**Cotización:** Cero interacción con stock. La guarda de stock (`validarStockParaOrden`, `reservarStockOrden`) solo se ejecuta cuando `datos.tipo === 'orden_venta'`. Una cotización puede generarse aunque no exista stock del producto. El campo `stock` que el formulario muestra es calculado por `getAvailableStockForUnit` y es solo informativo; no bloquea.

**Nota de Venta:** Comportamiento idéntico a la cotización. Estado inicial `Generada`. No reserva, no valida, no consume stock en ningún punto del ciclo de vida (incluida la anulación).

**Riesgo:** Un vendedor puede emitir Notas de Venta en exceso del stock disponible sin ninguna advertencia, ya que no hay validación bloqueante. Si la NV es usada como documento previo a una facturación, el stock real nunca se deducirá desde la NV misma.

---

## 18. Hallazgo crítico: stock total mostrado en ventas

### El problema

Cuando una Nota de Ingreso distribuye un producto en múltiples almacenes, por ejemplo:

| Almacén | Stock real |
|---|---|
| 0001 | 60 |
| 0002 | 60 |
| 0003 | 70 |
| 0004 | 70 |
| **Total** | **260** |

El módulo Stock Actual muestra 260 correctamente (con desglose por columna).

En los módulos de venta (Comprobantes, POS, Cotización, Nota de Venta, Orden de Venta), el número que ve el vendedor es también **260**.

### La función responsable

La suma agregada proviene de `summarizeProductStock` en `src/shared/inventory/stockGateway.ts`:

```ts
// stockGateway.ts ~línea 93
export function summarizeProductStock(options: ProductStockInput): ProductStockSummary {
  const { product, almacenes, EstablecimientoId } = options;
  const filteredAlmacenes = almacenes.filter(
    a => a.establecimientoId === EstablecimientoId && a.estaActivoAlmacen !== false
  );
  // Suma stock de TODOS los almacenes activos del establecimiento
  let totalStock = 0, totalReserved = 0;
  for (const almacen of filteredAlmacenes) {
    totalStock   += product.stockPorAlmacen?.[almacen.id] ?? 0;
    totalReserved += Math.max(0, product.stockReservadoPorAlmacen?.[almacen.id] ?? 0);
  }
  const totalAvailable = Math.max(0, totalStock - totalReserved);
  // ...
}
```

Esta función devuelve `totalAvailable = 260`. Todos los módulos de venta llaman esta función o `getAvailableStockForUnit` (que la envuelve) y exponen ese total al vendedor.

### Módulos que consumen el total agregado

| Módulo | Archivo | Función usada |
|---|---|---|
| Búsqueda de productos en Comprobantes | `useProductSearch.tsx` | `summarizeProductStock` |
| POS – pantalla de productos | `useAvailableProducts.tsx` | `getAvailableStockForUnit` |
| POS – validación carrito | `useCart.tsx` | `summarizeProductStock` |
| Orden de Venta – validación | `servicioReservaStock.ts` | `summarizeProductStock` |
| Selector de productos (lista comprobantes) | `ProductSelector.tsx` | `summarizeProductStock` |
| Cotización / Nota de Venta (formulario) | `useProductSearch.tsx` | `summarizeProductStock` |

### ¿Es intencional o efecto secundario?

Es **por diseño del helper**, pero la consecuencia no fue analizada completamente al momento de crearlo. El helper fue diseñado para dar la visión de disponibilidad del establecimiento completo, lo cual es correcto para el módulo Stock Actual. Pero al reutilizarse en los módulos de venta sin opciones de filtrado por almacén específico, produce que el vendedor vea 260 cuando en realidad ningún almacén individual tiene más de 70.

La deducción FIFO al emitir es técnicamente correcta (consume los almacenes de a uno), pero el vendedor no sabe desde cuál almacén se deducirá ni si el almacén operativo de su tienda tiene stock suficiente.

---

## 19. Riesgos funcionales detectados

| # | Riesgo | Severidad | Módulo afectado |
|---|---|---|---|
| R1 | Vendedor ve 260 unidades pero ningún almacén tiene más de 70; puede suceder que el almacén físico de la tienda esté vacío | Alto | Comprobantes, POS, OV |
| R2 | Comprobante se guarda antes de la deducción de stock; si la deducción falla, el documento queda sin kardex | Alto | Comprobantes, POS |
| R3 | Transferencias no respetan `stockReservadoPorAlmacen`; pueden mover unidades comprometidas con OV activas | Alto | Transferencias |
| R4 | OV reserva el total en el almacén principal aunque este no tenga stock suficiente individualmente | Medio | Orden de Venta |
| R5 | `stockPorEstablecimiento` no se actualiza tras importación masiva ni tras ajustes manuales | Medio | Importación, Ajustes |
| R6 | Nota de Venta y Cotización no validan stock; pueden emitirse sin existencias | Medio | Documentos Comerciales |
| R7 | El kardex vive solo en localStorage; si el usuario limpia datos del navegador se pierde sin posibilidad de reconstrucción | Alto | Kardex completo |
| R8 | No existe una "Nota de Salida" como entidad independiente; las salidas por motivos distintos a venta no tienen documento formal | Medio | Gestión inventario |
| R9 | Búsqueda de movimientos para reversión (NC/anulación) por `documentoReferencia` puede fallar si el documento fue emitido antes de que el sistema registrara movimientos | Bajo | Comprobantes |
| R10 | Transferencias inter-establecimiento en estado `EN_TRANSITO` crean una ventana donde el stock origen ya fue decrementado pero el destino no lo contabiliza | Medio | Transferencias |

---

## 20. Recomendación técnica

### Escenario A: Venta deduce solo del almacén operativo (almacén principal)

**Descripción:** El vendedor ve solo el stock del almacén principal de su establecimiento. La deducción ocurre exclusivamente en ese almacén. El FIFO multi-almacén se desactiva para ventas; solo se usa para transferencias.

**Ventajas:**
- El número que ve el vendedor (ej. 70) refleja exactamente lo que puede vender desde su ubicación física.
- Validación y deducción son consistentes: ambas usan el mismo almacén.
- Reservas de OV también apuntarían al mismo almacén.

**Cambios requeridos:**
- `summarizeProductStock` debe recibir un `almacenId` opcional. Si se proporciona, filtra a ese almacén en lugar de sumar todos.
- `useAvailableProducts`, `useProductSearch`, `useCart`, `servicioReservaStock` deben pasar el `almacenId` del establecimiento activo (almacén principal).
- Definir claramente qué es "almacén principal" y asegurarse de que cada establecimiento tenga uno.

**Desventaja:** Si el almacén principal se vacía pero otros tienen stock, el sistema bloqueará la venta aunque el stock total exista. Requiere transferencias manuales para equilibrar.

### Escenario B: Venta consume de múltiples almacenes con FIFO (comportamiento actual mejorado)

**Descripción:** Mantener el FIFO automático, pero mostrar al vendedor el detalle de dónde se descontará, o al menos informar que el stock está en múltiples almacenes.

**Ventajas:**
- Aprovecha todo el stock del establecimiento automáticamente.
- No requiere transferencias manuales previas a la venta.

**Cambios requeridos:**
- En la UI de Comprobantes y POS, mostrar un desglose de "Stock disponible por almacén" al seleccionar el producto.
- La validación de OV debe cambiar: en lugar de comparar contra `totalAvailable`, debe validar que la suma del FIFO alcance la cantidad pedida (que es lo que ya hace `allocateSaleAcrossalmacenes`, pero la validación previa es más permisiva).
- Las reservas de OV deben escribirse distribuidas entre almacenes (siguiendo FIFO) en lugar de concentrarse en el almacén principal.

**Desventaja:** Más complejo. El vendedor no puede anticipar fácilmente desde qué almacén físico se preparará el pedido.

### Recomendación de este auditor

Para un negocio pequeño con un único almacén operativo por punto de venta, **el Escenario A es más adecuado** porque elimina la confusión entre lo que se muestra y lo que se puede vender. El Escenario B es adecuado para operaciones con múltiples almacenes que comparten inventario fungible (ej. una bodega central + tienda que se abastecen mutuamente automáticamente).

**La decisión debe ser tomada por el negocio**, no por la tecnología. El código ya soporta ambos escenarios; la diferencia es qué parámetros se pasan a `summarizeProductStock` y `allocateSaleAcrossalmacenes`.

---

## 21. Archivos involucrados

### Archivos de lectura crítica (fuente de verdad)

| Archivo | Rol |
|---|---|
| `src/shared/inventory/stockGateway.ts` | Toda la matemática de stock; helper central |
| `src/shared/inventory/accionesStock.ts` | Punto único de mutación desde fuera del módulo inventario |
| `src/pages/Private/features/gestion-inventario/services/inventory.service.ts` | Lógica de ajustes, transferencias, alerts |
| `src/pages/Private/features/gestion-inventario/repositories/stock.repository.ts` | Persistencia del kardex en localStorage |
| `src/pages/Private/features/catalogo-articulos/models/types.ts` | Definición del interface `Product` con todos los campos de stock |
| `src/pages/Private/features/gestion-inventario/models/inventory.types.ts` | `MovimientoStock`, enumeraciones, tipos de filtros |

### Archivos de consumo en ventas

| Archivo | Qué hace con stock |
|---|---|
| `src/pages/Private/features/comprobantes-electronicos/hooks/useComprobanteActions.tsx` | Deducción FIFO al emitir, reversión en NC/anulación |
| `src/pages/Private/features/comprobantes-electronicos/hooks/useAvailableProducts.tsx` | Lista productos con stock para POS y comprobantes |
| `src/pages/Private/features/comprobantes-electronicos/shared/form-core/hooks/useProductSearch.tsx` | Búsqueda con stock en formulario tradicional |
| `src/pages/Private/features/comprobantes-electronicos/punto-venta/hooks/useCart.tsx` | Validación por ítem en carrito POS |
| `src/pages/Private/features/documentos-comerciales/utils/servicioReservaStock.ts` | Validación + reserva + liberación para OV |
| `src/shared/documentosComerciales/postEmisionOrdenVenta.ts` | Liberación de reserva post-emisión de comprobante |
| `src/pages/Private/features/documentos-comerciales/utils/convertirOVaComprobante.ts` | Validación OV al convertir a comprobante |

### Archivos del módulo inventario

| Archivo | Rol |
|---|---|
| `src/pages/Private/features/gestion-inventario/services/notaIngreso.service.ts` | Generación y anulación de NI (puras) |
| `src/pages/Private/features/gestion-inventario/hooks/useNotasIngreso.ts` | Ciclo de vida de NI + aplicación al store |
| `src/pages/Private/features/gestion-inventario/hooks/useInventory.ts` | Orquestación de toda la UI de inventario |
| `src/pages/Private/features/gestion-inventario/hooks/useInventarioDisponibilidad.ts` | Cálculo detallado para la vista Stock Actual |
| `src/pages/Private/features/gestion-inventario/api/inventory.facade.ts` | Compatibilidad para módulos legacy |
| `src/pages/Private/features/gestion-inventario/components/PanelImportacionStock.tsx` | Importación masiva vía Excel |

---

## 22. Archivos que no deberían tocarse

Los siguientes archivos implementan funcionalidad estable y cualquier modificación requiere pruebas extensas de regresión:

| Archivo | Razón para no tocar |
|---|---|
| `src/pages/Private/features/gestion-inventario/models/inventory.types.ts` | Tipos base usados por todo el sistema; cambiar un campo rompe múltiples consumidores |
| `src/pages/Private/features/catalogo-articulos/models/types.ts` (campos de stock) | Mismo argumento; los campos `stockPorAlmacen`, `stockReservadoPorAlmacen` son contratos establecidos |
| `src/pages/Private/features/gestion-inventario/repositories/stock.repository.ts` | La migración de clave legacy en `getMovements()` es frágil; tocarla puede romper datos existentes de usuarios |
| `src/pages/Private/features/catalogo-articulos/hooks/useProductStore.tsx` | Store central de todos los productos; sus métodos de actualización son usados por más de 15 archivos |
| `src/pages/Private/features/gestion-inventario/utils/stockAlerts.ts` | Tiene tests; cualquier cambio debe actualizar `stockAlerts.test.ts` en paralelo |
| `src/shared/documentosComerciales/postEmisionOrdenVenta.ts` | Lee y escribe localStorage directamente en dos colecciones; es sensible al orden de operaciones |

---

## 23. Plan de corrección sugerido por fases

### Fase 1: Corrección de `stockPorEstablecimiento` (sin romper nada)

**Objetivo:** Corregir el gap de sincronización en importación masiva y ajustes manuales.

**Cambios:**
1. En `PanelImportacionStock.tsx`, después de procesar el lote, llamar a `syncEstablecimientoStock(establecimientoId)`. Este método ya existe en `useInventory.ts` (extraer a función pura en un helper shared).
2. En `InventoryService.registerAdjustment`, al final del método, actualizar `product.stockPorEstablecimiento[establecimientoId]` sumando los almacenes del establecimiento.

**Archivos a modificar:**
- `src/pages/Private/features/gestion-inventario/components/PanelImportacionStock.tsx`
- `src/pages/Private/features/gestion-inventario/services/inventory.service.ts`

**Riesgo:** Bajo. No cambia la lógica de stock, solo agrega sincronización del campo legado.

---

### Fase 2: Mostrar desglose por almacén en formularios de venta

**Objetivo:** Transparencia para el vendedor sin cambiar la lógica de deducción.

**Cambios:**
1. Añadir a `ProductStockSummary` (en `stockGateway.ts`) la propagación del `breakdown[]` hasta los hooks de búsqueda.
2. En `useProductSearch.tsx` y `useAvailableProducts.tsx`, exponer `stockBreakdown` (array de `{almacenNombre, available}`) junto con el `stock` total.
3. En el selector de productos de Comprobantes y POS, mostrar un tooltip o línea de detalle: "Stock: 260 total (0001: 60 | 0002: 60 | 0003: 70 | 0004: 70)".

**Archivos a modificar:**
- `src/shared/inventory/stockGateway.ts` (exponer `breakdown` en la función)
- `src/pages/Private/features/comprobantes-electronicos/shared/form-core/hooks/useProductSearch.tsx`
- `src/pages/Private/features/comprobantes-electronicos/hooks/useAvailableProducts.tsx`
- Componentes de UI de selección de productos (solo presentación)

**Riesgo:** Bajo. Es solo lectura; no cambia ninguna lógica de escritura.

---

### Fase 3: Filtrar stock por almacén operativo en ventas (Escenario A)

**Objetivo:** Mostrar y validar solo el stock del almacén operativo en los módulos de venta.

**Cambios:**
1. Agregar parámetro `almacenId?: string` a `summarizeProductStock`. Cuando se provee, filtrar el `filteredAlmacenes` array a ese único almacén.
2. En el contexto de Comprobantes y POS, determinar el `almacenId` operativo (almacén principal del establecimiento activo) y pasarlo a todos los helpers.
3. En `servicioReservaStock.ts`, cambiar `resolvealmacenForSale` para que la validación y la reserva usen el mismo almacén que la deducción usará después.
4. Actualizar validación en `registerTransferSalida` para descontar `stockReservadoPorAlmacen` antes de verificar disponibilidad.

**Archivos a modificar:**
- `src/shared/inventory/stockGateway.ts`
- `src/pages/Private/features/comprobantes-electronicos/hooks/useComprobanteActions.tsx`
- `src/pages/Private/features/comprobantes-electronicos/hooks/useAvailableProducts.tsx`
- `src/pages/Private/features/comprobantes-electronicos/shared/form-core/hooks/useProductSearch.tsx`
- `src/pages/Private/features/comprobantes-electronicos/punto-venta/hooks/useCart.tsx`
- `src/pages/Private/features/documentos-comerciales/utils/servicioReservaStock.ts`
- `src/pages/Private/features/gestion-inventario/services/inventory.service.ts` (método `registerTransferSalida`)

**Riesgo:** Alto. Cambiar `summarizeProductStock` afecta a más de 10 consumidores. Requiere pruebas completas de todos los flujos de venta.

---

### Fase 4: Nota de Salida (entidad independiente)

**Objetivo:** Crear un módulo espejo de Nota de Ingreso para registrar salidas formales de inventario (devoluciones a proveedor, mermas, préstamos, etc.).

**Archivos a crear (siguiendo el patrón de Nota de Ingreso):**

| Archivo nuevo | Equivalente NI |
|---|---|
| `models/notaSalida.types.ts` | `notaIngreso.types.ts` |
| `models/notaSalida.constants.ts` | `notaIngreso.constants.ts` |
| `services/notaSalida.service.ts` | `notaIngreso.service.ts` |
| `repositories/notaSalida.repository.ts` | `notaIngreso.repository.ts` |
| `hooks/useNotasSalida.ts` | `useNotasIngreso.ts` |
| `components/notas-salida/` (carpeta) | `components/notas-ingreso/` |

**Tipos de salida sugeridos** (según catálogo SUNAT Tabla 13):
- `04` Consignación entregada
- `06` Devolución entregada
- `09` Salida de producción
- `11` Salida por transferencia entre almacenes
- `16` Merma
- `17` Desmedro
- `18` Robo / pérdida

---

## 24. Pruebas manuales recomendadas

### Prueba 1: Verificar el stock total mostrado vs. stock real por almacén

1. Crear producto `PROD-TEST` con stock en 3 almacenes: A1=10, A2=20, A3=30 (total=60).
2. Abrir módulo Comprobantes y buscar `PROD-TEST`.
3. **Resultado esperado actual:** muestra 60.
4. Intentar emitir factura por 35 unidades.
5. **Resultado esperado:** factura emitida; verificar en Stock Actual que A1=0, A2=0, A3=5 (FIFO).
6. Verificar Kardex: debe tener 2 o 3 movimientos SALIDA con almacenes diferentes.

### Prueba 2: Reserva de Orden de Venta vs. transferencia simultánea

1. Producto `PROD-TEST2` con 10 unidades en almacén principal.
2. Crear OV por 8 unidades → `stockReservadoPorAlmacen[principal] = 8` → disponible = 2.
3. Intentar transferencia de 5 unidades desde el almacén principal.
4. **Resultado esperado:** transferencia debería bloquearse o al menos advertir que hay reservas activas.
5. **Resultado actual probable:** transferencia se ejecuta porque ignora `stockReservadoPorAlmacen`.

### Prueba 3: Importación masiva y sincronización de stockPorEstablecimiento

1. Verificar el valor actual de `Product.stockPorEstablecimiento[estId]` para un producto (acceder vía DevTools → localStorage).
2. Ejecutar importación masiva sumando 50 unidades al almacén principal.
3. Verificar `stockPorAlmacen[almacenPrincipal]` incrementado en 50.
4. Verificar `stockPorEstablecimiento[estId]` — **resultado esperado tras el fix:** también incrementado en 50.
5. **Resultado actual probable:** `stockPorEstablecimiento` permanece sin cambio.

### Prueba 4: Nota de Ingreso multi-almacén y visualización en ventas

1. Crear NI con 2 líneas del mismo producto: 60 uds en almacén 0001 y 60 uds en almacén 0002.
2. Generar la NI.
3. Verificar en Stock Actual: columna 0001=60, columna 0002=60, total=120.
4. Abrir POS y buscar el producto.
5. **Anotar el stock mostrado:** ¿60 o 120?
6. Agregar 80 uds al carrito.
7. Emitir boleta.
8. Verificar Kardex: debe haber 2 movimientos SALIDA (60 de 0001 y 20 de 0002).
9. Verificar Stock Actual: 0001=0, 0002=40.

### Prueba 5: NC devolución parcial y reversión de kardex

1. Emitir factura con 2 productos distintos.
2. Emitir NC (código 06) por 1 de los productos.
3. Verificar Kardex: debe aparecer un ENTRADA con `documentoReferencia` igual al número de la NC.
4. Verificar Stock Actual: solo el producto de la NC debe haber incrementado.

### Prueba 6: Anulación de comprobante cuando el kardex del original ya no existe

1. Emitir factura normal.
2. Desde DevTools localStorage, eliminar el `MovimientoStock` asociado.
3. Anular el comprobante.
4. **Verificar:** el sistema debe generar el movimiento de reversión en el almacén primario (fallback), no debe lanzar error no controlado.

---

## 25. Conclusión

El módulo de gestión de inventario de FacturaFacil tiene una arquitectura bien estructurada para un sistema frontend-only: la separación entre `stockGateway.ts` (matemática pura), `InventoryService` (lógica de negocio), `StockRepository` (persistencia) y `useInventory` (orquestación UI) es coherente y mantenible.

La Nota de Ingreso implementada en la rama actual está correctamente integrada: crea movimientos de tipo `ENTRADA` por línea, soporta múltiples almacenes por documento, y su lógica de generación/anulación es pura (sin efectos secundarios en el servicio), delegando la persistencia al hook.

El hallazgo más importante de esta auditoría es la **asimetría entre el stock mostrado en ventas (total del establecimiento) y el stock operativo real del punto de venta**. Esta asimetría no es un bug de implementación sino una consecuencia del diseño de `summarizeProductStock`, que fue creado para la vista de inventario y luego reutilizado en todos los módulos de venta. La función hace exactamente lo que su nombre indica. El problema es la expectativa del usuario en el contexto de venta.

La resolución requiere una decisión de negocio sobre el modelo operativo (Escenario A vs. B) antes de que el equipo técnico pueda implementar el cambio correcto. Ese cambio, una vez decidido, tiene un impacto localizado en `stockGateway.ts` y en los hooks de cada módulo de venta, sin necesidad de alterar los modelos de datos ni el sistema de persistencia.

Los riesgos de mayor severidad son el **R2** (comprobante sin rollback antes de la deducción de stock) y el **R7** (kardex en localStorage sin respaldo). Ambos son limitaciones arquitecturales del sistema frontend-only que solo se resolverán completamente con una capa de persistencia en servidor.
