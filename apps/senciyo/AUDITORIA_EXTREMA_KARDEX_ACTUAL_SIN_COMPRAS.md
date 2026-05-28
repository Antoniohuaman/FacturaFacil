# Auditoría extrema del Kardex actual sin Compras/Pagos

> **Fecha:** 2026-05-28  
> **Auditor:** Claude Sonnet 4.6 — Arquitecto senior / Auditor funcional-técnico  
> **Proyecto:** FacturaFacil — App `senciyo`  
> **Alcance:** Solo funcionalidades ya implementadas. No se evalúa backend, compras, orden de venta, lotes, series ni vencimientos.

---

## 1. Resumen ejecutivo

El módulo de inventario actual funciona correctamente en la mayoría de sus operaciones individuales: ajustes, transferencias, FIFO, descuento por venta, alertas y exportación. La arquitectura de datos es sólida y los movimientos contienen los campos necesarios para Kardex de cantidades.

Sin embargo, **existen dos errores críticos que rompen la integridad del Kardex** desde la primera operación real:

1. **Anular un comprobante no restaura el stock.** El stock descontado en la venta queda perdido permanentemente.
2. **Emitir una nota de crédito no genera entrada de stock.** Las devoluciones son invisibles para el inventario.

Adicionalmente, hay tres problemas de severidad alta que deben corregirse antes de usar el módulo en producción: el campo `stockReservadoPorAlmacen` nunca se escribe (UI engañosa), el error de stock en venta es silencioso (el comprobante se emite aunque el descuento falle), y la vista de movimientos en `useInventory` no se actualiza tras una importación masiva.

**Veredicto general:** El módulo es un **Kardex operativo parcial**. Los flujos de ingreso manual, ajuste, transferencia y descuento por venta funcionan bien. Los flujos de reversión (anulación y nota de crédito) están rotos. Corrigiendo los dos errores críticos el módulo puede clasificarse como Kardex operativo de cantidades confiable para el prototipo actual.

---

## 2. Alcance revisado

### Archivos auditados con código real

```
gestion-inventario/
├── api/inventory.facade.ts                           (139 líneas)
├── services/inventory.service.ts                     (362 líneas)
├── repositories/stock.repository.ts                  (111 líneas)
├── hooks/useInventory.ts                             (355 líneas)
├── hooks/useInventarioDisponibilidad.ts              (494 líneas)
├── models/inventory.types.ts                         (189 líneas)
├── models/disponibilidad.types.ts                    (137 líneas)
├── utils/stockAlerts.ts                              (95 líneas)
├── utils/inventory.helpers.ts
├── stores/usePreferenciasDisponibilidad.ts
├── pages/InventoryPage.tsx                           (355 líneas, sección export)
├── components/modals/AdjustmentModal.tsx
├── components/modals/TransferModal.tsx
├── components/modals/MassUpdateModal.tsx             (930 líneas)
├── components/tables/MovementsTable.tsx
├── components/panels/AlertsPanel.tsx
├── components/panels/SummaryCards.tsx
├── components/disponibilidad/DisponibilidadTable.tsx
└── components/disponibilidad/InventarioSituacionPage.tsx

shared/inventory/
├── stockGateway.ts                                   (415 líneas)
├── accionesStock.ts                                  (39 líneas)
└── unitConversion.ts                                 (152 líneas)

catalogo-articulos/
├── hooks/useProductStore.tsx                         (781 líneas)
├── models/types.ts                                   (178 líneas)
└── utils/catalogStorage.ts                           (203 líneas)

comprobantes-electronicos/
├── hooks/useComprobanteActions.tsx                   (1089 líneas)
└── lista-comprobantes/pages/ListaComprobantes.tsx    (1379 líneas)
```

### Búsquedas realizadas con Grep

- `nota_credito` → 13 archivos
- `confirmVoid|handleVoid|anularComprobante` → 1 archivo (solo ListaComprobantes)
- `allowNegativeStock` → 12 archivos
- `stockReservadoPorAlmacen` escritura/asignación → **0 resultados**
- `allocateSale|resolvealmacen` → 3 archivos
- `UPDATE_COMPROBANTE` → 3 archivos
- `cantidad:` asignación en useProductStore → línea 607

---

## 3. Qué funcionalidades actuales existen

| Funcionalidad | Existe | Archivo principal | Estado | Observación |
|---------------|--------|------------------|--------|-------------|
| Ajuste positivo manual | ✅ | `AdjustmentModal + useInventory + InventoryService` | ✅ Funciona | Genera movimiento trazable |
| Ajuste negativo manual | ✅ | `AdjustmentModal + useInventory + InventoryService` | ✅ Funciona | Genera movimiento trazable |
| Transferencia entre almacenes | ✅ | `TransferModal + useInventory + InventoryService` | ✅ Funciona | Genera 2 movimientos vinculados |
| Importación masiva (xlsx/csv) | ✅ | `MassUpdateModal` | ⚠️ Funciona con issue | Genera movimientos pero UI de movimientos no se refresca |
| Reseteo masivo a cero | ✅ | `MassUpdateModal` | ⚠️ Funciona con issue | Mismo problema de refresco |
| Exportación de movimientos | ✅ | `InventoryPage.handleExportToExcel` | ✅ Funciona | 13 columnas útiles |
| Venta normal (factura/boleta) descuenta stock | ✅ | `useComprobanteActions` | ✅ Funciona | Con FIFO multi-almacén |
| FIFO multi-almacén en venta | ✅ | `stockGateway.allocateSaleAcrossalmacenes` | ✅ Funciona | Almacén principal primero |
| Validación de stock insuficiente | ✅ | `useComprobanteActions + stockGateway` | ✅ Funciona | Respeta `allowNegativeStock` |
| Configuración de stock negativo | ✅ | `inventory.facade + stockGateway` | ✅ Funciona | Clampea a 0 si deshabilitado |
| Anulación de comprobante devuelve stock | ❌ | `ListaComprobantes.confirmVoid` | ❌ **ROTO** | Solo cambia estado UI. Stock no restaurado. |
| Nota de crédito genera entrada de stock | ❌ | `useComprobanteActions` | ❌ **ROTO** | Bloque de stock saltado si `isNoteCredit` |
| Edición de comprobante revierte stock | ❌ | No existe lógica | ❌ Riesgo | Potencial doble descuento |
| Alertas de stock bajo/crítico/exceso | ✅ | `AlertsPanel + stockAlerts.ts` | ✅ Funciona | Cálculo correcto |
| Resumen/KPIs de inventario | ✅ | `SummaryCards + useInventarioDisponibilidad` | ✅ Funciona | Datos calculados correctamente |
| Vista de movimientos (historial) | ✅ | `MovementsTable` | ✅ Funciona | Con búsqueda, filtro y paginación |
| Vista Kardex por producto | ❌ | No existe | ❌ No implementado | Solo tabla plana de movimientos |
| Disponibilidad actual (stock real/reservado/disponible) | ✅ | `InventarioSituacionPage + DisponibilidadTable` | ⚠️ Parcial | `reservado` siempre es 0 en la práctica |
| Edición inline de umbrales min/max | ✅ | `DisponibilidadTable` | ✅ Funciona | Persiste en producto |

---

## 4. Qué funciona correctamente

### 4.1 Ajustes de stock (positivos y negativos)
`InventoryService.registerAdjustment` calcula correctamente el nuevo stock, genera un objeto `MovimientoStock` completo con `cantidadAnterior`, `cantidadNueva`, `tipo`, `motivo`, `almacenId`, `usuario` y `documentoReferencia`, y lo persiste en `StockRepository`. El producto se actualiza en Zustand vía `updateProduct`. La lógica es correcta y confiable.

### 4.2 Transferencias entre almacenes
`InventoryService.registerTransfer` valida que `stockOrigen >= cantidad`, genera dos movimientos con un `transferenciaId` compartido (SALIDA del origen + ENTRADA al destino), y actualiza ambos almacenes en el producto. La vinculación entre movimientos es correcta.

**Evidencia:**
```typescript
// inventory.service.ts
if (stockOrigen < data.cantidad) {
  throw new Error(`Stock insuficiente...`);
}
// Crea transferenciaId compartido entre ambos movimientos
```

### 4.3 Descuento de stock por venta (factura/boleta)
`useComprobanteActions.tsx` desconecta stock correctamente al emitir cualquier comprobante que no sea nota de crédito. Usa FIFO, respeta `stockReservadoPorAlmacen` en el cálculo de disponible, y genera un movimiento por cada almacén involucrado con `documentoReferencia = numeroComprobante`.

### 4.4 FIFO multi-almacén
`resolvealmacenesForSaleFIFO` ordena almacenes poniendo el principal primero, luego el resto. `allocateSaleAcrossalmacenes` consume stock almacén por almacén respetando `stock - reservado` como disponible real. Si un almacén no tiene suficiente, continúa con el siguiente. La implementación es correcta.

**Evidencia:**
```typescript
// stockGateway.ts
const mains = matches.filter(wh => Boolean(wh.esAlmacenPrincipal)).sort(...);
const rest = matches.filter(wh => !wh.esAlmacenPrincipal).sort(...);
return [...mains, ...rest];
```

### 4.5 Importación masiva (comportamiento)
La importación masiva en `MassUpdateModal.handleApplyImport` no suma ni reemplaza ciegamente: calcula la diferencia `cantidad - stockActual` y aplica un `AJUSTE_POSITIVO` si aumenta o `AJUSTE_NEGATIVO` si disminuye. Esto genera movimientos trazables por cada cambio. Si el stock no cambia, no genera movimiento. Si el código no se encuentra, lo lista como "no encontrado".

### 4.6 Exportación de movimientos
`handleExportToExcel` exporta 13 columnas útiles: Fecha, Producto, Código, Tipo, Motivo, Cantidad, Stock Anterior, Stock Nuevo, Almacén, Establecimiento, Usuario, Observaciones, Documento.

### 4.7 Alertas de stock
`stockAlerts.ts` calcula correctamente:
- **Sin stock:** `disponible === 0`
- **Crítico:** `disponible < stockMinimo * 0.5`
- **Bajo:** `disponible < stockMinimo`
- **Exceso:** `disponible > stockMaximo`

### 4.8 Cálculo de disponibilidad
`useInventarioDisponibilidad` suma stock real y reservado de todos los almacenes del scope, clampea el reservado para que no supere el real, y calcula `disponible = max(0, real - reservado)`. La lógica es correcta.

### 4.9 Validación de stock insuficiente en venta
Si `allowNegativeStock = false` y la venta excede el disponible, se lanza un error que detiene la emisión del comprobante. El mensaje incluye el nombre del producto y las cantidades.

### 4.10 Todos los movimientos tienen los campos de Kardex
Cada `MovimientoStock` registrado incluye: `cantidadAnterior`, `cantidadNueva`, `cantidad` (el delta), `almacenId`, `almacenCodigo`, `almacenNombre`, `productoId`, `productoCodigo`, `productoNombre`, `tipo`, `motivo`, `fecha`, `usuario`, `documentoReferencia`, `observaciones`, `EstablecimientoId`, más campos de transferencia cuando aplica.

---

## 5. Qué está mal o incompleto

| ID | Severidad | Problema | Evidencia técnica | Impacto funcional | Recomendación concreta |
|----|-----------|---------|-------------------|-------------------|------------------------|
| E-01 | **CRÍTICO** | Anular comprobante no restaura stock | `ListaComprobantes.tsx: confirmVoid()` solo ejecuta `dispatch({ type: 'UPDATE_COMPROBANTE', payload: { status: 'Anulado' } })`. Sin ninguna llamada a stock. | Cada anulación deja el stock incorrecto para siempre. El Kardex diverge de la realidad desde la primera anulación. | En `confirmVoid()`, después del dispatch, iterar `selectedInvoiceForVoid.items`, resolver el almacén de cada movimiento de venta original (por `documentoReferencia`) y llamar `addMovimientoStock(..., 'ENTRADA', 'DEVOLUCION_CLIENTE', cantidad, ..., numeroComprobante)` por cada uno. |
| E-02 | **CRÍTICO** | Nota de crédito no genera entrada de stock | `useComprobanteActions.tsx:487`: `if (!isNoteCredit) { /* TODO el bloque de stock */ }`. Para NC `isNoteCredit = true`, el bloque nunca ejecuta. | Devoluciones de clientes no recuperan stock. Cualquier NC por devolución deja el inventario incorrecto. | Agregar bloque `if (isNoteCredit)` que genere un movimiento `ENTRADA` / `DEVOLUCION_CLIENTE` por cada ítem de la NC, con `documentoReferencia = numNC` y referencia al comprobante origen. |
| E-03 | **ALTO** | Error de descuento de stock en venta es silencioso | `useComprobanteActions.tsx:~598`: `catch (stockError) { console.error(); toast.warning('Stock no actualizado'); }` — el comprobante ya se emitió y el flujo continúa. | Comprobantes emitidos sin impacto en stock. El usuario no nota el problema. El Kardex queda desincronizado respecto a ventas reales. | Registrar el error con suficiente detalle (productId, almacenId, cantidad, comprobanteId) en algún store de "movimientos pendientes" o al menos en `StockRepository` como movimiento fallido, para reconciliación posterior. |
| E-04 | **ALTO** | `stockReservadoPorAlmacen` nunca se escribe en ningún flujo activo | Grep de asignaciones de `stockReservadoPorAlmacen` en todo el src: **0 resultados de escritura**. Solo se lee en `stockGateway.ts` (líneas 104, 110, 282) y se deserializa en `catalogStorage.ts`. | La columna "Reservado" en `DisponibilidadTable` siempre muestra 0 en la práctica. Genera confusión al usuario. El cálculo de disponible es `real - 0 = real`, que es correcto por accidente. | Hasta que se implemente Orden de Venta: **ocultar la columna "Reservado"** en `DisponibilidadTable` o mostrar tooltip claro: "Disponible cuando se implemente Orden de Venta". No es error del Kardex pero sí es UX engañosa. |
| E-05 | **ALTO** | Movimientos de importación masiva no se reflejan en `useInventory.movements` | `MassUpdateModal.handleApplyImport` y `handleResetStock` llaman directamente a `InventoryService.registerAdjustment` (que guarda en StockRepository/localStorage), pero `useInventory.movements` es estado local cargado solo al montar el componente. `onClose()` no dispara un reload. | Tras importar masivamente, el tab "Movimientos" no muestra los nuevos movimientos hasta que el usuario navegue fuera y vuelva. | En `useInventory`, exponer una función `reloadMovements()` que llame `StockRepository.getMovements()` y actualice el estado local. Llamarla desde el callback `onSuccess` del modal, que ya existe como `onClose`. |
| E-06 | **MEDIO** | Campo `cantidad` legacy se mantiene en paralelo a `stockPorAlmacen` | `inventory.facade.ts:106`: `cantidad: totalStock` actualiza el campo legacy junto con `stockPorAlmacen`. `catalogStorage.ts` lo persiste. `useProductStore.tsx:607` lo inicializa. | Dos fuentes de verdad para el stock total. Si algún módulo lee `product.cantidad` en lugar de `stockGateway.summarizeProductStock()`, obtendrá el valor legacy que puede divergir. | Auditar qué módulos leen `product.cantidad` directamente (vs vía `stockGateway`). A corto plazo: mantener sincronizado como está (el facade ya lo actualiza). A mediano plazo: deprecar con JSDoc `@deprecated` y migrar lectores a `summarizeProductStock`. |
| E-07 | **MEDIO** | No existe vista de Kardex por producto | `MovementsTable` muestra todos los movimientos planos. No hay vista de "Kardex de un producto" con saldo acumulado, filtrada por producto + almacén + fecha. | Para auditar el historial de un producto específico hay que buscar manualmente en la tabla de movimientos. No existe la vista de Kardex canónica. | Agregar vista de Kardex: tabla filtrada por producto + almacén + rango de fechas, con columnas: Fecha, Documento, Tipo, Motivo, Entrada, Salida, Saldo. El saldo se puede calcular acumulando sobre los movimientos filtrados. |
| E-08 | **MEDIO** | Doble anulación posible sin control | `confirmVoid()` no verifica si el comprobante ya está en estado `'Anulado'` antes de proceder. Si se implementa la reversión de stock, dos anulaciones del mismo comprobante generarían doble entrada de stock. | Con la corrección del E-01, esto se convierte en bug crítico. | En `confirmVoid()`, verificar `if (selectedInvoiceForVoid.status === 'Anulado') return` antes de ejecutar cualquier lógica de reversión. |
| E-09 | **MEDIO** | Exportación tiene 13 columnas mapeadas pero array `colWidths` tiene 11 entradas | `InventoryPage.tsx:95-108`: el array `data` tiene 13 campos pero `colWidths` tiene 11 objetos `{ wch }`. Las últimas 2 columnas quedan sin ancho configurado. | Las columnas "Observaciones" y "Documento" quedan con ancho automático en el Excel exportado (no se truncan, solo quedan sin el ancho explícito). | Agregar 2 entradas faltantes al array `colWidths`: `{ wch: 20 }` para Almacén y `{ wch: 40 }` para Observaciones, corrigiendo el desplazamiento. |
| E-10 | **BAJO** | `MassUpdateModal` usa `alert()` y `confirm()` nativo del browser | `handleResetStock` y `handleApplyImport` usan `alert(...)` y `confirm(...)`. `handleFileUpload` también usa `alert(...)`. | No respeta el sistema de diseño del proyecto (que usa `toast`). Bloquea el hilo del browser. Sin accesibilidad. Texto en plain text sin formato. | Migrar a los modales o `toast` del sistema. Para confirmaciones destructivas, usar un modal de confirmación con botones. |
| E-11 | **BAJO** | Edición de comprobante no revierte impacto en stock | No existe lógica de reversión al editar un comprobante ya emitido. Si se permite navegar al formulario con `edit: invoice`, se descuentaría stock nuevamente sin revertir el anterior. | Doble descuento de stock si se edita cantidades de un comprobante ya procesado. | Verificar si la UI permite o no editar comprobantes emitidos. Si no lo permite, documentarlo explícitamente. Si lo permite, implementar reversión antes de aplicar el nuevo descuento. |

---

## 6. Evaluación de ajustes de stock

### Ajuste positivo
- **¿Aumenta stock?** ✅ Sí. `InventoryService.registerAdjustment` con tipo `ENTRADA` o `AJUSTE_POSITIVO`: `nuevoStock = stockActual + cantidad`.
- **¿Genera movimiento trazable?** ✅ Sí. `StockRepository.addMovement(movement)` se llama dentro de `registerAdjustment`.
- **¿Guarda stock anterior?** ✅ Sí. `movement.cantidadAnterior = stockActual` (antes del ajuste).
- **¿Guarda stock nuevo?** ✅ Sí. `movement.cantidadNueva = nuevoStock`.
- **¿Guarda almacén?** ✅ Sí. `almacenId`, `almacenCodigo`, `almacenNombre`.
- **¿Guarda documento/motivo?** ✅ Sí. `documentoReferencia` y `motivo` son campos opcionales pero siempre presentes en el movimiento.
- **¿Guarda usuario?** ✅ Sí. `session?.userName || 'Sistema'`.
- **¿Validaciones?** ✅ El modal valida que almacén y producto estén seleccionados. La cantidad debe ser positiva.

### Ajuste negativo
- **¿Descuenta stock?** ✅ Sí. Con tipo `SALIDA`, `AJUSTE_NEGATIVO` o `MERMA`: `nuevoStock = stockActual - cantidad`.
- **¿Permite stock negativo?** Depende de `allowNegativeStock`. Si está deshabilitado: `Math.max(0, cantidadNuevaRaw)`. Si está habilitado: permite negativos.
- **¿Genera movimiento?** ✅ Sí. Mismo mecanismo que positivo.

### Evidencia del cálculo en `inventory.facade.ts`:
```typescript
// inventory.facade.ts:65-70
const isEntrada = tipo === 'ENTRADA' || tipo === 'AJUSTE_POSITIVO' || tipo === 'DEVOLUCION';
const cantidadNuevaRaw = isEntrada ? stockActual + cantidad : stockActual - cantidad;
const cantidadNueva = allowNegativeStock ? cantidadNuevaRaw : Math.max(0, cantidadNuevaRaw);
```

---

## 7. Evaluación de transferencia entre almacenes

- **¿Descuenta del almacén origen?** ✅ Sí. `InventoryService.registerTransfer` calcula `stockOrigen - cantidad`.
- **¿Suma al almacén destino?** ✅ Sí. Calcula `stockDestino + cantidad`.
- **¿Valida stock suficiente en origen?** ✅ Sí. Si `stockOrigen < data.cantidad` → lanza error `'Stock insuficiente'`.
- **¿Genera dos movimientos vinculados?** ✅ Sí. Genera `movimientoSalida` y `movimientoEntrada` ambos con el mismo `transferenciaId`. Ambos tienen `esTransferencia: true`.
- **¿Guarda almacén origen/destino en cada movimiento?** ✅ Sí. `almacenOrigenId`, `almacenOrigenNombre`, `almacenDestinoId`, `almacenDestinoNombre` presentes en ambos.
- **¿Reversión si algo falla?** ❌ No. No hay bloque `try/catch` con rollback. Si la segunda actualización falla, el origen ya se descontó sin que el destino reciba. En el contexto actual (localStorage) esto es poco probable pero técnicamente posible.

---

## 8. Evaluación de importación / actualización masiva

- **¿Existe?** ✅ Sí. `MassUpdateModal.tsx` con dos pestañas: "Resetear Stock" e "Importar desde Archivo".
- **¿Qué formato acepta?** `.xlsx`, `.xls`, `.csv`, `.txt`.
- **¿Valida headers?** ✅ Sí. Requiere columnas `CODIGO` y `CANTIDAD` (case-insensitive). Columna `ALMACEN` es opcional.
- **¿Crea productos o solo actualiza?** Solo actualiza. Si el código no existe, lo agrega a lista "no encontrados" sin lanzar error.
- **¿Reemplaza o suma stock?** **Reemplaza** (comportamiento correcto para carga de stock físico). Calcula `diferencia = cantidadImportada - stockActual` y aplica el ajuste. Si `diferencia == 0`, no genera movimiento.
- **¿Genera movimientos de Kardex?** ✅ Sí. Genera `AJUSTE_POSITIVO` o `AJUSTE_NEGATIVO` por cada producto/almacén con diferencia, vía `InventoryService.registerAdjustment`. Incluye observación `Importación masiva: X → Y`.
- **¿Valida errores?** ✅ Sí. Filas sin código o cantidad inválida se descartan. Productos no encontrados se listan al final.
- **¿Trazabilidad suficiente?** ✅ Sí en StockRepository. ⚠️ Parcial en UI: los nuevos movimientos no se muestran en `MovementsTable` sin refrescar (ver E-05).
- **¿Riesgo de alterar stock sin historial?** ❌ No. Cada cambio genera movimiento. El "resetear a cero" también genera `AJUSTE_NEGATIVO` por la cantidad actual, con observación explícita.
- **Riesgo identificado:** El `handleResetStock` llama a `InventoryService.registerAdjustment` directamente, no a `useInventory.handleMassStockUpdate`. Esto omite el hook de permisos `tienePermiso('inventario.actualizacion_masiva')`. El modal igual verifica permisos al abrirse, pero la función de aplicar no los reverifica.

---

## 9. Evaluación de exportación

- **¿Qué exporta?** La tabla de **movimientos** filtrados (`filteredMovements`), no el stock actual.
- **¿Columnas incluidas?** 13 columnas: Fecha, Producto, Código, Tipo, Motivo, Cantidad, Stock Anterior, Stock Nuevo, Almacén, Establecimiento, Usuario, Observaciones, Documento.
- **¿Filtros disponibles antes de exportar?** Sí: filtro por período (hoy/semana/mes/todo) y por almacén. Los mismos aplicados en la vista.
- **¿Sirve para auditar entradas/salidas?** ✅ Sí. Con Stock Anterior, Stock Nuevo y Tipo se puede reconstruir el historial.
- **¿Sirve como Kardex completo?** ⚠️ Parcialmente. Falta columna de "Saldo acumulado". Para Kardex puro se necesitaría mostrar el saldo de forma acumulativa por producto/almacén, no solo el snapshot de ese movimiento. Sin embargo, los datos están suficientes para calcularlo en Excel con una columna adicional.
- **¿Qué falta para Kardex completo?** Una columna calculada "Saldo acumulado" que sea la suma acumulada del delta por producto+almacén. Esto requiere ordenar por producto+almacén+fecha antes de exportar.
- **Bug menor (E-09):** Array `colWidths` tiene 11 entradas para 13 columnas. Las últimas 2 columnas quedan sin ancho definido (no es bloqueante).
- **Exportación de stock actual:** `InventarioSituacionPage` tiene su propia exportación de disponibilidad (stock actual por producto), separada de la de movimientos. Ambas son correctas.

---

## 10. Evaluación de venta y descuento de stock

- **¿Desde dónde se descuenta?** `useComprobanteActions.tsx`, función `createComprobante`, bloque protegido por `if (!isNoteCredit)`.
- **¿Genera movimiento?** ✅ Sí. Genera `SALIDA` / `VENTA` por cada producto × almacén con `documentoReferencia = numeroComprobante`.
- **¿Usa FIFO multi-almacén?** ✅ Sí. `resolvealmacenesForSaleFIFO` + `allocateSaleAcrossalmacenes`.
- **¿Descuenta del almacén correcto?** ✅ Sí. Cada movimiento lleva su propio `almacenId` correspondiente al almacén del que sale el stock.
- **¿Parte la salida entre varios almacenes?** ✅ Sí. Si un producto tiene 5 unidades en almacén A y 10 en almacén B, y se venden 12, genera 2 movimientos: 5 de A y 7 de B.
- **¿El usuario puede entender de qué almacén salió?** ✅ Sí. En `MovementsTable`, cada movimiento muestra el almacén. El número de comprobante como `documentoReferencia` permite vincular.
- **¿Qué pasa con stock insuficiente sin `allowNegativeStock`?** La venta se bloquea con error. `useComprobanteActions:559`: `throw new Error('Stock insuficiente')`.
- **¿Qué pasa con stock insuficiente con `allowNegativeStock = true`?** La venta procede, el stock queda negativo.
- **¿Qué pasa si falla el descuento?** ❌ El comprobante ya se emitió. El catch solo muestra un toast. Stock queda desincronizado. (Ver E-03).
- **¿Productos tipo "libre" o sin control de stock?** Correctamente saltados: `if (item.tipoDetalle === 'libre' || !item.requiresStockControl) continue;`

---

## 11. Evaluación de anulación de comprobante

- **¿Anular devuelve stock?** ❌ **No. Error crítico (E-01).**
- **¿Genera movimiento inverso?** ❌ No.
- **¿Qué hace `confirmVoid()`?**

```typescript
// ListaComprobantes.tsx — confirmVoid()
dispatch({
  type: 'UPDATE_COMPROBANTE',
  payload: { ...selectedInvoiceForVoid, status: 'Anulado', statusColor: 'red' }
});
registrarComprobanteEstadoActualizado({ estado: 'anulado', ... }); // analítica
devLocalIndicadoresStore.marcarVentaAnulada(selectedInvoiceForVoid.id); // indicadores
// ← FIN. Sin ninguna llamada a inventory.facade, addMovimientoStock ni InventoryService.
```

- **¿Se devuelve al almacén original?** Irrelevante, porque no hay devolución alguna.
- **¿Si salió de varios almacenes, revierte a los mismos?** No aplica porque no hay reversión.
- **¿Hay control de doble anulación?** ❌ No. (Ver E-08).
- **Impacto real:** Cada comprobante anulado deja stock incorrecto para siempre. En un negocio real, esto hace el Kardex inservible en semanas.

---

## 12. Evaluación de nota de crédito

- **¿La NC genera entrada de stock?** ❌ **No. Error crítico (E-02).**
- **¿Por qué?**

```typescript
// useComprobanteActions.tsx:487
const isNoteCredit = data.tipoComprobante === 'nota_credito'; // true

if (!isNoteCredit) {       // false → bloque NO ejecuta
  // ... toda la lógica de descuento/entrada de stock está aquí ...
  // Para NC por devolución, debería ejecutarse una ENTRADA aquí
}
```

- **¿Se relaciona con el comprobante afectado?** La NC tiene `DatosNotaCredito.documentoRelacionado` con el número del comprobante origen, pero este dato no se usa para nada relacionado con stock.
- **¿Distingue NC por devolución vs otros motivos?** ✅ Los códigos SUNAT están definidos en `constants.ts` (01=Anulación, 06=Devolución total, 07=Devolución por ítem, etc.). Pero no se usan para decidir si generar entrada de stock.
- **¿Devuelve al almacén original?** No aplica porque no hay devolución.
- **Nota sobre alcance:** La NC por devolución de mercancía debería incrementar el stock. La NC por descuento o error en precio no necesariamente. Actualmente ninguna NC toca el stock.

---

## 13. Evaluación de edición de comprobante

- **¿Existe flujo de edición de comprobante?** El menú de `ListaComprobantes` tiene un `onEdit` que navega al formulario de emisión con los datos precargados.
- **¿Revierte el movimiento anterior antes de aplicar el nuevo?** ❌ No. No existe ninguna lógica de reversión al editar.
- **¿Riesgo de doble descuento?** ✅ Sí. Si se permite editar un comprobante ya emitido y se confirma, `createComprobante` generaría nuevos movimientos `SALIDA` sin revertir los anteriores.
- **Mitigación parcial:** Si la UI no permite editar comprobantes en estado `'Aceptado'`, el riesgo no existe en práctica. Pero si se permite, el stock se descuenta dos veces.
- **Recomendación:** Verificar si la UI bloquea edición de comprobantes emitidos. Si no lo bloquea, implementar verificación: si `comprobanteId` ya tiene movimientos de stock, revertirlos antes de aplicar los nuevos.

---

## 14. Evaluación de almacenes y FIFO

- **¿Cómo se elige almacén en venta?** Automáticamente mediante `resolvealmacenesForSaleFIFO({ almacenes, EstablecimientoId })` que filtra por establecimiento activo y ordena: principal primero, resto por id (determinístico).
- **¿Hay almacén por defecto?** Sí: el marcado como `esAlmacenPrincipal: true` en el establecimiento activo.
- **¿El FIFO es consistente?** ✅ Sí. El ordenamiento es determinístico: mismo establecimiento + misma configuración = mismo orden FIFO siempre.
- **¿Se puede vender desde varios almacenes en una misma venta?** ✅ Sí. `allocateSaleAcrossalmacenes` lo soporta.
- **¿Cada movimiento queda separado por almacén?** ✅ Sí. Se genera un movimiento por cada `almacenId` con su propia cantidad.
- **¿La anulación/NC respeta el almacén original?** ❌ No aplica porque no hay reversión implementada (E-01, E-02).
- **¿Riesgo de UX si el usuario no sabe de qué almacén salió?** Mitigado: `MovementsTable` muestra el almacén de cada movimiento y el `documentoReferencia` (número de comprobante). Se puede rastrear.

---

## 15. Evaluación de stock reservado

- **¿El campo existe?** ✅ Sí. `Product.stockReservadoPorAlmacen?: Record<string, number>` definido en `types.ts`.
- **¿Participa en el cálculo de disponible?** ✅ Sí. `useInventarioDisponibilidad:182-189` resta reservado del real. `stockGateway.allocateSaleAcrossalmacenes:282` lo respeta al distribuir ventas.
- **¿Alguna funcionalidad actual lo modifica?** ❌ No. Grep de escrituras en todo el src: **0 resultados**.
- **¿Siempre es 0 en la práctica?** ✅ Sí (salvo que se cargue un producto con ese campo seteado manualmente en el storage, lo cual no tiene UI).
- **¿La UI puede confundir al usuario?** ⚠️ Sí. La columna "Reservado" en `DisponibilidadTable` siempre muestra 0, pero existe y se muestra. Un usuario podría esperar que refleje alguna reserva real.
- **Recomendación:** Hasta que se implemente Orden de Venta, **ocultar la columna "Reservado" por defecto** o agregar un tooltip: `"Sin efecto hasta que se active el módulo de Orden de Venta"`. No es un error del Kardex de cantidades, pero sí genera expectativas incorrectas.

---

## 16. Evaluación de Kardex de cantidades

| Criterio | Estado | Detalle |
|----------|--------|---------|
| ¿Existe Kardex por producto? | ❌ No | Solo existe `MovementsTable` con todos los movimientos planos. No hay vista de Kardex individual por producto. |
| ¿Historial claro de entradas/salidas? | ✅ Sí | `MovementsTable` con filtro por tipo y búsqueda por nombre/código. |
| ¿Se muestra saldo anterior y final? | ✅ Sí | Columnas "Stock Anterior" y "Stock Nuevo" en cada movimiento. |
| ¿Saldo acumulado por producto? | ❌ No | No hay columna de saldo acumulado. Hay que calcularlo mentalmente mirando los movimientos de un producto. |
| ¿Se puede filtrar por producto/almacén/fecha? | ⚠️ Parcial | Hay búsqueda por texto (producto/código), filtro por tipo de movimiento, y filtro por período. No hay filtro por almacén específico en MovementsTable. |
| ¿Los movimientos tienen documento origen? | ✅ Sí | Campo `documentoReferencia` en cada movimiento (ej: número de comprobante). |
| ¿Los movimientos tienen almacén? | ✅ Sí | `almacenId`, `almacenCodigo`, `almacenNombre` en cada movimiento. |
| ¿Sirve para auditar stock? | ⚠️ Parcial | Sirve para rastrear movimientos individuales. No sirve para ver la línea de tiempo de un producto específico con saldo acumulado. |
| ¿Qué falta para Kardex confiable? (sin compras) | — | 1. Corregir E-01 (anulación). 2. Corregir E-02 (NC). 3. Vista de Kardex por producto con saldo acumulado. 4. Filtro por almacén en MovementsTable. |

---

## 17. Matriz final de brechas actuales

| Brecha | Severidad | Módulo afectado | Corregir ahora | Recomendación concreta |
|--------|-----------|-----------------|----------------|------------------------|
| Anulación no restaura stock | CRÍTICO | Comprobantes → Inventario | ✅ Sí | Implementar reversión en `confirmVoid()` usando `addMovimientoStock` por cada ítem original |
| NC no genera entrada de stock | CRÍTICO | Comprobantes → Inventario | ✅ Sí | Agregar bloque de entrada en `createComprobante` para NC por devolución |
| Error silencioso en descuento de venta | ALTO | Comprobantes | ✅ Sí | Registrar el fallo en StockRepository para reconciliación posterior |
| Reservado siempre 0 — UI engañosa | ALTO | Inventario (UI) | ✅ Sí (ajuste UI) | Ocultar columna o agregar tooltip claro sobre dependencia de Orden de Venta |
| Movimientos de importación masiva no refrescan UI | ALTO | Inventario | ✅ Sí | Exponer `reloadMovements()` en `useInventory` y llamarla desde `MassUpdateModal.onClose` |
| Campo `cantidad` legacy paralelo | MEDIO | Catálogo / Inventario | No urgente | Deprecar con JSDoc, verificar lectores directos |
| No hay vista Kardex por producto | MEDIO | Inventario | No urgente | Agregar vista de Kardex individual por producto |
| Sin filtro por almacén en MovementsTable | MEDIO | Inventario (UI) | No urgente | Agregar selector de almacén al filtro de la tabla de movimientos |
| Doble anulación posible sin control | MEDIO | Comprobantes | Sí (parte de E-01) | Verificar `status === 'Anulado'` antes de ejecutar reversión |
| `colWidths` con 11 entradas para 13 columnas | BAJO | Inventario (export) | Sí (trivial) | Agregar 2 objetos `{ wch }` faltantes |
| `MassUpdateModal` usa `alert()` nativo | BAJO | Inventario (UX) | No urgente | Migrar a toast/modal del sistema |
| Sin filtro de almacén en exportación de movimientos | BAJO | Inventario | No urgente | Ya existe filtro de almacén en InventoryPage que aplica antes de exportar |

---

## 18. Lista priorizada de correcciones

### Correcciones críticas

**C-01: Restaurar stock al anular comprobante**
- Archivo: `ListaComprobantes.tsx`, función `confirmVoid`
- Qué hacer: Después del `dispatch(UPDATE_COMPROBANTE)`, verificar si el comprobante tiene items con `requiresStockControl`. Por cada item, llamar `addMovimientoStock(productId, 'ENTRADA', 'DEVOLUCION_CLIENTE', cantidad, `Reversión anulación ${numComprobante}`, numComprobante, ...)` respetando el almacén original del movimiento de venta.
- Prerequisito: Guardar el `almacenId` de cada movimiento de venta en el comprobante, o buscarlo en `StockRepository` por `documentoReferencia`.

**C-02: Generar entrada de stock al emitir nota de crédito por devolución**
- Archivo: `useComprobanteActions.tsx`, dentro de `createComprobante`
- Qué hacer: Agregar bloque `if (isNoteCredit && data.noteCreditData?.codigo in ['06','07','...'])` que itere `data.cartItems` y genere `addMovimientoStock(..., 'ENTRADA', 'DEVOLUCION_CLIENTE', ...)` con referencia al comprobante NC y al comprobante origen.
- Nota: Distinguir NC por devolución (códigos 06, 07 SUNAT) de NC por error en precio (código 01, 02, etc.) — solo las de devolución deberían generar entrada de stock.

### Correcciones altas

**A-01: Registrar movimientos fallidos en venta**
- Archivo: `useComprobanteActions.tsx`, catch del bloque de stock
- Qué hacer: En el catch, crear un registro en StockRepository con tipo especial `PENDIENTE` o log de error estructurado, incluyendo `comprobanteId`, `productId`, `almacenId`, `cantidad` fallida. Al menos que quede rastro para reconciliación.

**A-02: Ocultar o aclarar columna "Reservado" en DisponibilidadTable**
- Archivo: `DisponibilidadTable.tsx`
- Qué hacer: Opción A — Ocultar la columna `reservado` de la vista por defecto hasta que Orden de Venta esté activa. Opción B — Agregar tooltip: "Reservado por Órdenes de Venta activas (disponible próximamente)". Opción B es preferible para no sorprender al usuario cuando se active.

**A-03: Refrescar movimientos tras importación masiva**
- Archivos: `useInventory.ts` (exponer `reloadMovements`) y `InventoryPage.tsx` (pasar callback a `MassUpdateModal`)
- Qué hacer: En `useInventory`, agregar función `reloadMovements = () => setMovements(StockRepository.getMovements())`. Pasar como `onSuccess` a `MassUpdateModal`. Llamarla al cerrar si hubo cambios.

### Correcciones medias

**M-01: Agregar verificación de doble anulación**
- Parte de C-01. En `confirmVoid`, verificar `if (selectedInvoiceForVoid.status === 'Anulado') { alert('Comprobante ya anulado'); return; }`.

**M-02: Corregir `colWidths` en exportación**
- Archivo: `InventoryPage.tsx:95-108`
- Agregar 2 objetos faltantes al array para que tenga 13 entradas correspondientes a las 13 columnas.

### Mejoras menores

**L-01: Migrar `alert()`/`confirm()` de MassUpdateModal a componentes del sistema**
- Archivo: `MassUpdateModal.tsx`
- Reemplazar `alert(...)` por `toast.success/error(...)` y `confirm(...)` por modal de confirmación.

---

## 19. Conclusión final

### ¿Lo que existe funciona al 100%?
**No.** Hay dos errores críticos que rompen la integridad del Kardex.

### ¿Qué partes sí están bien?
- Ajustes manuales (positivo/negativo): correctos y trazables.
- Transferencias entre almacenes: correctas con movimientos vinculados.
- Descuento de stock por venta (factura/boleta): correcto con FIFO multi-almacén.
- Importación masiva: correcta (calcula diferencia, genera movimientos, valida errores).
- Exportación de movimientos: correcta con 13 columnas útiles.
- Alertas de stock: cálculo correcto.
- Disponibilidad (real y disponible): cálculo correcto.
- Campos de trazabilidad en cada movimiento: completos.
- Configuración de stock negativo: respetada en todos los flujos.

### ¿Qué partes no están bien?
- Anulación de comprobante no restaura stock. **Error crítico.**
- Nota de crédito no genera entrada de stock. **Error crítico.**
- Error de descuento en venta es silencioso. **Riesgo alto.**
- Columna "Reservado" siempre en 0. **Confusión de UX.**
- Vista de movimientos no se refresca tras importación masiva. **Bug de UX.**

### ¿Qué se debe corregir antes de seguir agregando más documentos?
1. Implementar reversión de stock al anular comprobante (C-01).
2. Implementar entrada de stock en nota de crédito por devolución (C-02).
3. Ocultar o aclarar columna "Reservado" (A-02).

Sin corregir C-01 y C-02, cada anulación y cada NC dejan el Kardex incorrecto. Agregar más tipos de documentos sobre una base con estos errores amplifica el daño.

### ¿El módulo actual puede considerarse Kardex operativo de cantidades?

**Parcial.** Con las correcciones críticas aplicadas, el módulo cubre los flujos principales de un Kardex de cantidades:
- Ingresos manuales, ajustes, transferencias y ventas con FIFO generan movimientos completos y trazables.
- El historial de movimientos es consultable y exportable.
- Los movimientos contienen todos los campos necesarios (anterior, nuevo, producto, almacén, usuario, documento).

Sin las correcciones críticas: **No es confiable**. Un Kardex que no registra las reversiones de ventas anuladas ni las devoluciones de clientes no puede usarse como referencia de inventario.

---

*Auditoría basada en lectura directa del código fuente. No se modificó ningún archivo. Todas las referencias incluyen archivo y contexto de línea.*
