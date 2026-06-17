# Auditoría Extrema — Cálculos y Movimientos de Stock
**Fecha:** 2026-06-16 | **Rama:** develop | **Solo auditoría — sin cambios de código**

---

## 1. Resumen ejecutivo

Se auditaron exhaustivamente 40+ archivos del módulo `gestion-inventario` y módulos externos que afectan stock (documentos comerciales, comprobantes, punto de venta, configuración). El sistema implementa un inventario **client-side 100% en localStorage**, con stock real por almacén como fuente de verdad, un Kardex como diario append-only, y reservas lógicas para Órdenes de Venta.

La arquitectura central es sólida: los cálculos de `stockDisponible = real - reservado` son consistentes, el mecanismo FIFO de distribución por almacén respeta prioridades y reservas, y los flows de NI/NS/Transferencias tienen guards de estado que previenen doble procesamiento. Sin embargo, se identificaron **3 brechas altas** y **5 brechas medias** que deben corregirse antes de avanzar a módulos de compras/pagos.

---

## 2. Veredicto general

**C — Requiere correcciones puntuales antes de cierre.**

El motor de cálculo de stock es correcto. Los flows de creación/anulación de NI, NS e importación tienen guards adecuados. La brecha principal (A-01) es un escenario real reproducible: una OV en estado `Pendiente de salida` que se anula no libera sus reservas, dejando stockReservadoPorAlmacen corrupto indefinidamente.

---

## 3. Tipo de inventario identificado

| Aspecto | Valor |
|---|---|
| Persistencia | localStorage por tenant (no backend) |
| Modelo | Multi-almacén, multi-establecimiento |
| Stock en unidad de | Unidad mínima del producto (`unidad`) |
| Conversiones | Sí, vía `unitConversion.ts` (factorConversion por unidad adicional) |
| Reservas | Lógicas (no movimiento físico) |
| Kardex | Append-only, no reconstruye stock |
| Prioridad de salida | FIFO por `prioridadSalida` del almacén |
| Control configurable | Sí (`controlStockActivo`, modo por tipo de documento) |

---

## 4. Fuente de verdad del stock

| Dato | Campo | Fuente | Derivado? |
|---|---|---|---|
| **Stock real por almacén** | `product.stockPorAlmacen[almacenId]` | `ProductStore` (localStorage) | No — valor directo |
| **Stock reservado por almacén** | `product.stockReservadoPorAlmacen[almacenId]` | `ProductStore` vía `updateProduct()` | No — valor directo |
| **Stock disponible** | — | Calculado on-demand | Sí — `max(0, real - reservado)` |
| **Stock por establecimiento** | `product.stockPorEstablecimiento[estId]` | `InventoryService.recalcularTotalesStock()` | Sí — suma de almacenes del est. |
| **Cantidad total** | `product.cantidad` | `InventoryService.getTotalStock()` | Sí — suma de todos los almacenes |
| **Kardex** | `StockRepository` (localStorage) | Append-only | Solo log, no reconstruye |

### Invariante central
```
stockDisponible = max(0, stockPorAlmacen[almId] - stockReservadoPorAlmacen[almId])
```
Implementación verificada en `inventory.service.ts` y `stockGateway.ts`:
```typescript
// stockGateway.ts
export const computeAvailable = (stock: number, reserved: number): number =>
  stock <= reserved ? 0 : stock - reserved;

// useInventarioDisponibilidad.ts
const reservado = Math.min(rawReservado, Math.max(real, 0));
const disponible = Math.max(0, real - reservado);
```

---

## 5. Mapa de flujos que afectan stock

| Flujo | Afecta stockReal | Afecta stockReservado | Genera Kardex | Archivo principal |
|---|---|---|---|---|
| Nota de Ingreso (confirmar) | **+** | No | ENTRADA | `notaIngreso.service.ts` |
| Nota de Ingreso (anular) | **−** | No | AJUSTE_NEGATIVO | `notaIngreso.service.ts` |
| Nota de Salida (confirmar) | **−** | **−** (libera OV) | SALIDA | `notaSalida.service.ts` |
| Nota de Salida (anular) | **+** | No | AJUSTE_POSITIVO | `notaSalida.service.ts` |
| OV (crear) | No | **+** | No | `servicioReservaStock.ts` |
| OV (cancelar, estado=Reservada) | No | **−** | No | `useDocumentoComercialActions.ts` |
| OV (cancelar, estado=Pendiente de salida) | No | ❌ **NO libera** | No | **BRECHA A-01** |
| Comprobante desde OV (auto) | **−** | **−** (post-emisión) | SALIDA | `useComprobanteActions.tsx` |
| Comprobante directo (auto) | **−** | No | SALIDA | `useComprobanteActions.tsx` |
| Nota de Venta (auto) | **−** | No | SALIDA | `servicioReservaStock.ts` |
| Nota de Venta (anular, auto) | **+** | No | AJUSTE_POSITIVO | `servicioReservaStock.ts` |
| Transferencia intra (confirmar) | 0 (redistribuye) | No | SALIDA + ENTRADA | `inventory.service.ts` |
| Transferencia inter (despacho) | **−** origen | No | SALIDA | `inventory.service.ts` |
| Transferencia inter (recepción) | **+** destino | No | ENTRADA | `inventory.service.ts` |
| Transferencia (anular) | Revierte | No | Inverso | `inventory.service.ts` |
| Importar stock (actualizar) | = valor | No | AJUSTE | `PanelImportacionStock.tsx` |
| Importar stock (sumar) | **+** | No | AJUSTE_POSITIVO | `PanelImportacionStock.tsx` |
| Ajuste manual (Inventario) | ±  | No | AJUSTE_POSITIVO/NEGATIVO | `useInventory.ts` |

---

## 6. Configuración de descuento de stock

### Matriz de comportamiento

| `controlStockActivo` | Documento | `modoDescuento` | ΔStockReal | ΔStockReservado | Kardex |
|---|---|---|---|---|---|
| false | Cualquiera | — | 0 | 0 | No |
| true | Factura/Boleta | automatico | **−** al emitir | **−** (si venía de OV) | Sí |
| true | Factura/Boleta | nota_salida | 0 al emitir | Mantenido | No — espera NS |
| true | Nota de Venta | automatico | **−** al confirmar | 0 | Sí |
| true | Nota de Venta | nota_salida | 0 | 0 | No — espera NS |
| true | Guía de Remisión | automatico | **−** | **−** (si OV) | Sí |
| true | Orden de Venta | — | 0 | **+** siempre | No |
| true | NS manual | — | **−** | 0 | Sí |
| true | NS desde OV | — | **−** | **−** (parcial) | Sí |

### Verificación de guards

`controlStockActivo` se verifica en:
- `useDocumentoComercialActions.ts` (NV, OV)
- `useComprobanteActions.tsx` (Factura/Boleta)
- `ListadoDocumentosComerciales.tsx` (visibilidad botón NS)

No existe un guard global único tipo `if (!controlStockActivo) throw`. Cada flujo verifica por separado — coherente pero distribuido.

---

## 7. Orden de Venta y reservas

### Estructura de reserva

```typescript
// documentoComercial.types.ts
interface ReservaStockItem {
  sku: string;       // por SKU, no por ID
  nombre: string;
  cantidad: number;
  almacenId: string; // PER-ALMACÉN (no por establecimiento)
  almacenNombre?: string;
}
```

La reserva es **por almacén**, usando FIFO según `prioridadSalida`. Una OV puede tener reservas distribuidas en varios almacenes para un mismo SKU.

### Flujo completo verificado

```
1. OV creada → reservarStockOrden()
   → allocateSaleAcrossalmacenes(..., respectReservations: true)
   → stockReservadoPorAlmacen[almacenId] += qty  (por cada almacén asignado)
   → OV.reservasStock[] = [{sku, almacenId, cantidad}, ...]
   → stockDisponible = real − reservado → se reduce

2. Comprobante desde OV (modo=automatico)
   → Lee OV.reservasStock via sessionStorage (conversionSourceId)
   → Usa los MISMOS almacenIds de la reserva (no recalcula FIFO)
   → stockPorAlmacen[almacenId] -= qty
   → actualizarOrdenVentaPostEmision() → liberarReservasDeOV()
   → stockReservadoPorAlmacen[almacenId] -= qty
   → OV.estado = 'Atendida'

3. Comprobante desde OV (modo=nota_salida)
   → Mismo que 2 pero sin liberarReservasDeOV()
   → OV.estado = 'Pendiente de salida'

4. NS desde OV (modo=nota_salida)
   → generarNSEnInventario() → SALIDA por almacén (FIFO guiado por reserva OV)
   → updateProduct() con stock reducido
   → liberarReservasDeOV(parcial) — solo lo despachado en esta NS
```

### Respuestas a preguntas de OV

1. ✅ **¿La OV reserva correctamente?** Sí, con FIFO por prioridad y `respectReservations: true`.
2. ✅ **¿Reserva por almacén?** Sí, `ReservaStockItem.almacenId` por almacén.
3. ✅ **¿La UI muestra reservado total?** Sí — `filter().reduce()` para suma multi-almacén (corregido en sesión previa).
4. ✅ **¿Trazabilidad de distribución?** Sí, `OV.reservasStock[]` almacena distribución por almacén.
5. ✅ **¿La NS desde OV consume solo su reserva?** Sí — valida contra `totalOvPendiente` antes de proceder.
6. ✅ **¿NS parcial soportada?** Sí — `Math.min(linea.cantidad, maxLiberable)`.
7. ✅ **¿Segunda NS respeta pendiente?** Sí — libera solo lo despachado, deja el resto activo.
8. ✅ **¿Otra OV no se ve afectada?** Sí — cada OV tiene su propio `reservasStock[]`.
9. ⚠️ **¿Si el stock real se movió entre reserva y salida?** El stock real podría haber bajado. La NS valida `realTotal >= linea.cantidad` (stock físico), pero un ajuste manual entre reserva y NS podría crear situación donde hay reserva pero no stock real suficiente. La validación lo detecta y lanza error.
10. ⚠️ **¿Varias OVs reservando el mismo producto?** SAFE en single-tab, RIESGO en multi-tab (ver brecha M-03).

---

## 8. Nota de Salida

### Flujo de generación

```
notaSalida.service.ts::generarNSEnInventario()

Por cada línea (tipoBienServicio === 'bien'):
  1. resolvealmacenesForSaleFIFO() → almacenes ordenados por prioridad
  2. IF esNSVinculadaAOV:
       → Validar contra reserva OV pendiente
       → Asignar distribución guiada por almacenIds de la OV
     ELSE (manual):
       → allocateSaleAcrossalmacenes(..., respectReservations: true)
  3. Por cada allocation:
       → registerAdjustment(tipo='SALIDA') → stock real − qty
       → Kardex SALIDA entry
       → línea expandida con almacenId real
  4. recalcularTotalesStock() → stockPorEstablecimiento actualizado
```

### Respuestas

1. ✅ **¿Valida contra disponible correcto?** Sí — `totalDisponible = real - reservado`.
2. ✅ **¿Respeta prioridad de almacenes?** Sí — `resolvealmacenesForSaleFIFO()`.
3. ✅ **¿Genera Kardex por almacén real?** Sí — un SALIDA por cada allocation.
4. ✅ **¿Evita consumir reservas ajenas?** Sí — `respectReservations: true` en FIFO.
5. ✅ **¿Soporta salida parcial?** Sí.
6. ✅ **¿Revierte correctamente al anular?** Sí — AJUSTE_POSITIVO por línea expandida.
7. ✅ **¿No depende de almacenOrigenId del header?** Correcto — header es informativo, distribución es real.
8. ✅ **¿No usa stock real bruto?** Correcto — usa disponible.
9. ✅ **¿No genera movimientos duplicados?** Guard de estado previene re-generación.
10. ⚠️ **NS en estado 'Entregada' no se puede anular** — no existe flujo de devolución (ver brecha M-01).

---

## 9. Nota de Ingreso

### Flujo de generación

```
notaIngreso.service.ts::generarNIEnInventario()

Por cada línea (tipoBienServicio === 'bien'):
  1. almacen = linea.almacenId ?? nota.almacenDestinoId  (soporte multi-almacén por línea)
  2. Guard: almacen.estaActivoAlmacen === false → throw
  3. registerAdjustment(tipo='ENTRADA') → stock real + qty
  4. Kardex ENTRADA entry
  5. recalcularTotalesStock() → cantidad + stockPorEstablecimiento actualizados
```

### Respuestas

1. ✅ **¿Incrementa stock real correctamente?** Sí, por almacén destino.
2. ✅ **¿Genera Kardex de entrada?** Sí, tipo ENTRADA.
3. ✅ **¿Actualiza totales?** Sí, `recalcularTotalesStock()` actualiza `cantidad` y `stockPorEstablecimiento`.
4. ✅ **¿Anulación revierte exactamente?** Sí — AJUSTE_NEGATIVO por misma cantidad y almacén. Previo guard: stock actual >= línea cantidad.
5. ✅ **¿No afecta reservas?** Correcto — NI no toca `stockReservadoPorAlmacen`.
6. ⚠️ **¿No duplica líneas?** El mismo producto puede aparecer dos veces en una NI (diferentes líneas). Ambas se suman. No hay merge automático. Comportamiento correcto (puede ser intencional), pero la anulación también invierte ambas líneas por separado.
7. ℹ️ **¿Costo unitario para Kardex valorizado?** El campo `costoUnitario` existe en `LineaNotaIngreso`, pero no se persiste en el `MovimientoStock`. El Kardex no es valorizado.

---

## 10. Descuento automático

### Mecanismo principal

`servicioReservaStock.ts::descontarStockParaDocumento()` — usada por NV automático.

`useComprobanteActions.tsx` — usada directamente por Factura/Boleta, con lógica separada para OV-derived vs directo.

### Código del fallback sin Kardex (BRECHA M-02)

```typescript
// servicioReservaStock.ts — descontarStockParaDocumento()
if (almacenObj && documentoReferencia && usuario) {
  // PATH 1: registerAdjustment → CON Kardex SALIDA ✅
  InventoryService.registerAdjustment(productoCurrent, almacenObj, { tipo: 'SALIDA', ... }, usuario);
} else {
  // PATH 2: directo stockPorAlmacen SIN Kardex ⚠️
  const nuevoStock = Math.max(0, stockActual - alloc.qtyUnidadMinima);
  useProductStore.getState().updateProduct(productoCurrent.id, {
    stockPorAlmacen: { ..., [alloc.almacenId]: nuevoStock },
  });
}
```

PATH 2 se activa si `almacenObj` es `null` (almacén no encontrado) o si `documentoReferencia`/`usuario` están vacíos. En operación normal nunca debería ocurrir, pero el path existe y no genera Kardex.

### Respuestas

1. ✅ **¿Qué helper descuenta?** `descontarStockParaDocumento()` (NV) / `addMovimientoStock()` (Factura/Boleta).
2. ✅ **¿Qué helper revierte?** `revertirDescuentoStockDocumento()` — usa `doc.reservasStock[]` para revertir por almacén.
3. ⚠️ **¿Genera Kardex?** Solo en PATH 1. PATH 2 no genera (ver M-02).
4. ✅ **¿Usa prioridad de almacenes?** Sí — `resolvealmacenesForSaleFIFO()`.
5. ✅ **¿Valida disponible total?** Sí — `validarStockParaOrden()` antes de descontar.
6. ✅ **¿Respeta reservas?** Sí — `respectReservations: true`.
7. ✅ **¿Evita negativos?** Sí — `Math.max(0, ...)` en PATH 2; `updateStock(...allowNegativeStock: false)` en PATH 1.
8. ⚠️ **¿Documento emitido sin stock descontado?** En Factura/Boleta, el stock es no-fatal (`try/catch` con `toast.warning`). El comprobante se emite aunque falle el descuento (ver brecha A-02).
9. ✅ **¿Riesgo de doble descuento?** No — si viene de OV con modo `nota_salida`, no descuenta al emitir (solo NS lo hace). Si viene de OV con modo `automatico`, la NS no puede generarse luego (OV queda 'Atendida').

---

## 11. Importación masiva

### Modo actualizar (reemplaza)

```typescript
const stockActual = InventoryService.getStock(productoActual, almacenId);
// H-03 guard:
const stockReservado = productoActual.stockReservadoPorAlmacen?.[almacenId] ?? 0;
if (cantidadArchivo < stockReservado) → error

const diff = cantidadArchivo - stockActual;
if (diff > 0) tipo = 'AJUSTE_POSITIVO';
if (diff < 0) tipo = 'AJUSTE_NEGATIVO';
registerAdjustment(tipo, Math.abs(diff))
recalcularTotalesStock()
```

### Modo sumar (acumula)

```typescript
const stockFinal = stockActual + cantidadArchivo;
registerAdjustment('AJUSTE_POSITIVO', cantidadArchivo)
recalcularTotalesStock()
```

### Respuestas

1. ✅ **¿Actualizar pisa reservas?** No — guard H-03 bloquea si `nuevoStock < reservado`.
2. ✅ **¿Bloquea si final < reservado?** Sí, error explícito.
3. ✅ **¿Sumar respeta stock actual?** Sí — suma sobre el existente.
4. ✅ **¿Genera Kardex?** Sí — `registerAdjustment()` → Kardex por cada cambio.
5. ✅ **¿Actualiza por almacén y establecimiento?** Sí — `recalcularTotalesStock()` actualiza `stockPorEstablecimiento`.
6. ✅ **¿Celdas vacías?** `null` → sin cambio para ese almacén.
7. ✅ **¿Ceros?** `sinCambios++` → sin cambio (no se aplica 0 como ajuste).
8. ✅ **¿Negativos?** Rechazados con error en ambos modos.
9. ⚠️ **¿Funciona con muchos productos?** Procesamiento secuencial en loop, sin transacción. Fallo a mitad deja estado parcial (ver brecha M-04).

---

## 12. Transferencias

### Estado máquina verificada

```
INTRA_ESTABLECIMIENTO:
  crear → CONFIRMADA (inmediato)
  stock origen -qty, stock destino +qty, ambos movimientos Kardex en una sola operación

INTER_ESTABLECIMIENTO:
  crear → PENDIENTE (sin movimiento de stock)
  despachar → EN_TRANSITO (stock origen -qty, Kardex SALIDA)
  recibir → RECIBIDA/CONFIRMADA (stock destino +qty, Kardex ENTRADA)

CANCELADA: solo desde PENDIENTE → sin movimiento de stock
ANULADA:
  desde EN_TRANSITO → AJUSTE_POSITIVO en origen
  desde CONFIRMADA/RECIBIDA → AJUSTE_NEGATIVO en destino + AJUSTE_POSITIVO en origen
```

### Respuestas

1. ✅ **¿Descuenta origen correctamente?** Sí — `registerTransferSalida()`.
2. ✅ **¿Aumenta destino correctamente?** Sí — `registerTransferEntrada()`.
3. ✅ **¿Transferencia interna no altera total del establecimiento?** Correcto — suma sobre almacenes del mismo establecimiento se mantiene.
4. ✅ **¿Kardex de salida y entrada?** Sí — par SALIDA+ENTRADA vinculados por `movimientoRelacionadoId`.
5. ✅ **¿Valida disponible real?** Sí — `disponible = max(0, stockOrigen - reservedOrigen)`.
6. ✅ **¿No usa stock reservado?** Correcto — descuenta sobre disponible, no sobre reservado.
7. ✅ **¿Respeta establecimientos y almacenes?** Sí.
8. ✅ **¿No permite transferir sin stock?** Guard explícito con throw.
9. ✅ **¿No genera duplicados?** Estado CONFIRMADA previene re-procesamiento.
10. ✅ **¿Anulación revierte?** Sí, con movimientos Kardex inversos.

---

## 13. Multi-almacén y prioridad

### Función central: `resolvealmacenesForSaleFIFO()`

Ubicada en `stockGateway.ts`. Filtra almacenes activos del establecimiento y los ordena por `prioridadSalida` ascendente.

Fallback en NS (líneas 165-174 de `notaSalida.service.ts`):
```typescript
let almacenesOrdenados = resolvealmacenesForSaleFIFO({ almacenes: almacenesArray, EstablecimientoId });
if (!almacenesOrdenados.length) {
  almacenesOrdenados = almacenesArray.filter(a => a.estaActivoAlmacen !== false);
}
```

⚠️ **Si `resolvealmacenesForSaleFIFO()` retorna vacío** (sin almacenes activos del establecimiento), el fallback usa TODOS los almacenes activos sin filtrar por establecimiento. En entorno multi-establecimiento esto podría incluir almacenes de otro establecimiento.

### Respuestas

1. ✅ **¿Función que resuelve orden?** `resolvealmacenesForSaleFIFO()` en `stockGateway.ts`.
2. ✅ **¿Respeta prioridad configurada?** Sí — ordena por `prioridadSalida`.
3. ✅ **¿Primer almacén sin stock?** Se salta — allocation devuelve 0 para ese almacén.
4. ✅ **¿Suma varios almacenes?** Sí — FIFO distribuye entre todos hasta cubrir la cantidad.
5. ✅ **¿Almacén inactivo?** Se excluye — `estaActivoAlmacen !== false`.
6. ✅ **¿Producto no disponible en establecimiento?** `isProductEnabledForEstablecimiento()` filtra en disponibilidad; la venta lanza error si `disponible = 0`.
7. ✅ **¿Almacenes recién creados?** Incluidos automáticamente si están activos y tienen `establecimientoId`.
8. ⚠️ **¿Hardcode?** Fallback en NS puede usar almacenes de cualquier establecimiento (ver M-05).

---

## 14. Unidades

### Sistema implementado

`unitConversion.ts` (`@/shared/inventory/`) contiene:
- `resolveUnidadMinima(product)` — retorna código de unidad base
- `convertToUnidadMinima({product, quantity, unitCode})` — aplica factor de conversión
- `convertFromUnidadMinima()` — inversa
- `getFactorToUnidadMinima()` — busca en `product.unidadesMedidaAdicionales`

### Análisis de aplicación

| Flujo | Conversión aplicada |
|---|---|
| NI (notaIngreso.service.ts) | Usa `linea.cantidad` directo — NO convierte |
| NS (notaSalida.service.ts) | Usa `linea.cantidad` como `qtyUnidadMinima` explícitamente |
| Comprobante (useComprobanteActions.tsx) | `calculateRequiredUnidadMinima()` — SÍ convierte |
| OV (servicioReservaStock.ts) | Usa `item.quantity` directo de CartItem |
| Importación | Usa cantidad del Excel directo — NO convierte |
| Transferencias | `transferencia.cantidad` — NO convierte |

⚠️ **Inconsistencia de unidades (brecha M-06)**: Comprobantes aplican conversión a unidad mínima, pero NI/NS, OV y transferencias usan la cantidad cruda de la línea. Si un producto tiene `unidadesMedidaAdicionales` (ej. docenas), las cantidades en NI y NS podrían estar en unidad de venta (docena = 12), mientras el stock se almacena en unidad mínima (unidad = 1), produciendo un descuento de 1 cuando deberían ser 12.

---

## 15. Anulaciones y reversas

| Operación | Revierte stockReal | Libera stockReservado | Genera Kardex | Guard doble-reversa |
|---|---|---|---|---|
| Anular NI | ✅ AJUSTE_NEGATIVO | N/A | ✅ | ✅ estado ≠ Generada |
| Anular NS (Generada) | ✅ AJUSTE_POSITIVO | No (no había reserva) | ✅ | ✅ estado ≠ Generada |
| Anular NS (Entregada) | ❌ Bloqueado | — | — | — |
| Cancelar OV (Reservada) | N/A | ✅ libera | No | ✅ estado = Reservada |
| Cancelar OV (Pendiente salida) | N/A | ❌ **NO libera** | No | — |
| Anular NV (auto) | ✅ AJUSTE_POSITIVO | N/A | ✅ | ✅ estado ≠ Anulada |
| Anular comprobante (auto) | ✅ AJUSTE_POSITIVO | ✅ si venía de OV | ✅ | ✅ NC flag |
| Cancelar transferencia (PENDIENTE) | N/A (no hubo mvt.) | N/A | No | ✅ estado = PENDIENTE |
| Anular transferencia (EN_TRANSITO) | ✅ origen restaurado | N/A | ✅ | ✅ estado check |
| Anular transferencia (CONFIRMADA) | ✅ ambos | N/A | ✅ | ✅ estado check |

---

## 16. Concurrencia / doble clic / multi-tab

### Guards de doble clic verificados

- **NI**: `procesando` state + guard de estado `nota.estado === 'Generada'` → throw
- **NS**: `procesando` state + guard de estado → throw
- **Importación**: `importando` state flag
- **Comprobantes**: `isProcessing` state

### Riesgos multi-tab

```
Tab 1 lee: stock = 100, reservado = 0, disponible = 100
Tab 2 lee: stock = 100, reservado = 0, disponible = 100

Tab 1 crea OV: reservarStockOrden() → stockReservadoPorAlmacen = 100
Tab 2 crea OV (antes de que Tab 1 persista): lee reservado = 0
  → allocateSaleAcrossalmacenes() → disponible = 100 → asigna 100
  → stockReservadoPorAlmacen = 0 + 100 = 100 (pero Tab 1 ya escribió 100)
  → Resultado final: stockReservadoPorAlmacen = 100 (sobrescrito por Tab 2)
  → Tab 1's reservation PERDIDA silenciosamente
```

La reserva usa `useProductStore.getState().allProducts.find()` en cada iteración para obtener el estado más reciente del producto, lo que mitiga el problema DENTRO de una sola operación multi-línea, pero NO entre operaciones concurrentes en tabs diferentes.

---

## 17. Duplicidad de lógica

| Función / Propósito | Implementaciones encontradas | Diferencias | Riesgo |
|---|---|---|---|
| Calcular disponible | `computeAvailable()` (stockGateway) + inline en `useInventarioDisponibilidad.ts` | Equivalentes — ambas `max(0, real - reservado)` | Bajo |
| Descuento stock automático | `descontarStockParaDocumento()` (NV) vs `addMovimientoStock()` (Comprobantes/POS) | Lógica similar pero no idéntica. NV usa `InventoryService.registerAdjustment()`. Comprobantes usan `addMovimientoStock()` que puede ser un wrapper | Medio |
| Reservar stock | `reservarStockOrden()` en `servicioReservaStock.ts` | Una sola implementación | Bajo |
| FIFO de almacenes | `resolvealmacenesForSaleFIFO()` + `allocateSaleAcrossalmacenes()` en `stockGateway.ts` | Una sola implementación, bien centralizada | Bajo |
| `recalcularTotalesStock` vs `syncEstablecimientoStock` | Ambas recalculan `stockPorEstablecimiento` | `recalcularTotalesStock` = service estático (NI/NS/Importación). `syncEstablecimientoStock` = función local en `useInventory.ts` (Transferencias). Equivalentes pero en contextos distintos | Bajo |
| Actualizar `stockPorAlmacen` directo | PATH 2 en `descontarStockParaDocumento()` + path normal | PATH 2 sin Kardex, path normal con Kardex | **Alto** |

---

## 18. Hardcode / código frágil

| # | Hallazgo | Archivo | Severidad |
|---|---|---|---|
| H-F1 | Fallback en `resolvealmacenesForSaleFIFO()` usa `almacenesArray` sin filtrar por establecimiento | `notaSalida.service.ts` línea 165-174 | Media |
| H-F2 | `sessionStorage.getItem('conversionSourceId')` para pasar OV al comprobante — acoplamiento frágil entre módulos | `useComprobanteActions.tsx` | Media |
| H-F3 | `procesando` y `importando` guards son por-componente — no hay lock global compartido | Varios | Media |
| H-F4 | Kardex no puede reconstruir stock — si `stockPorAlmacen` en localStorage se corrompe, no hay recovery | `StockRepository` | Alta |
| H-F5 | `cantidad` en Product (legacy) puede divergir de `stockPorAlmacen` si `recalcularTotalesStock` no se llama | `inventory.service.ts` | Baja |
| H-F6 | `ReservaStockItem.sku` usa `producto.codigo` (no `id`) — si se cambia el código del producto, la reserva queda huérfana | `servicioReservaStock.ts` | Media |

---

## 19. Matriz de escenarios

| # | Escenario | Flujo | Resultado esperado | Estado actual | Riesgo | Veredicto |
|---|---|---|---|---|---|---|
| 1 | 1 producto, 1 almacén, NI confirmar | NI → registerAdjustment ENTRADA | stock += qty, Kardex ENTRADA | ✅ Correcto | Ninguno | OK |
| 2 | 1 producto, 2 almacenes, NI con líneas distintas | NI multi-línea → ENTRADA por almacén | stock A += qa, stock B += qb | ✅ Correcto | Ninguno | OK |
| 3 | 1 producto, stock 100, OV reserva 80 | OV → reservarStockOrden FIFO | reservado=80, disponible=20 | ✅ Correcto | Ninguno | OK |
| 4 | OV completa, comprobante (auto) | OV → Comprobante → liberarReserva | stock -80, reservado 0, OV=Atendida | ✅ Correcto | Ninguno | OK |
| 5 | OV completa, comprobante (nota_salida) | OV → Comprobante → NS | OV=Pendiente, NS descuenta real, libera parcial | ✅ Correcto | Ninguno | OK |
| 6 | OV parcial NS1 (40/80), luego NS2 (40/80) | NS1 libera 40, NS2 libera 40 | reservado final = 0 | ✅ Correcto | Ninguno | OK |
| 7 | OV en Pendiente de salida → cancelar | cancelar OV → liberar reserva | reservado liberado | ❌ NO libera | **Alto** | **BRECHA A-01** |
| 8 | NS manual, 3 almacenes, FIFO | NS → allocateSaleAcrossalmacenes | distribuido por prioridad | ✅ Correcto | Ninguno | OK |
| 9 | NS manual, stock insuficiente | NS → validar disponible | error claro | ✅ Correcto | Ninguno | OK |
| 10 | NS desde OV excede reserva OV | NS → totalOvPendiente | error "excede reserva" | ✅ Correcto | Ninguno | OK |
| 11 | Anular NI (stock suficiente) | anularNI → AJUSTE_NEGATIVO | stock restaurado | ✅ Correcto | Ninguno | OK |
| 12 | Anular NI (stock ya consumido) | anularNI → guard stock < línea | error bloqueante | ✅ Correcto | Ninguno | OK |
| 13 | Anular NS (Generada) | anularNS → AJUSTE_POSITIVO | stock restaurado | ✅ Correcto | Ninguno | OK |
| 14 | Anular NS (Entregada) | anularNS → error | bloqueado correctamente | ✅ Correcto (falta devol.) | Medio | Ver M-01 |
| 15 | Factura con stock insuf. (auto) | comprobante → stockError | toast warning, comprobante emitido | ⚠️ No fatal | **Alto** | **BRECHA A-02** |
| 16 | NV automática | descontarStockParaDocumento PATH1 | stock -qty, Kardex SALIDA | ✅ Correcto | Ninguno | OK |
| 17 | NV automática (almacenObj falta) | descontarStockParaDocumento PATH2 | stock -qty, **sin Kardex** | ⚠️ PATH2 | Medio | **BRECHA M-02** |
| 18 | Importar stock final (actualizar) | setStock → AJUSTE ± diff | stock = valor Excel, Kardex | ✅ Correcto | Ninguno | OK |
| 19 | Importar final por debajo de reservado | H-03 guard | error bloqueante | ✅ Correcto | Ninguno | OK |
| 20 | Importar sumar ingreso | addStock → AJUSTE_POSITIVO | stock += Excel, Kardex | ✅ Correcto | Ninguno | OK |
| 21 | Importar con celda vacía | null → sin cambio | se mantiene stock | ✅ Correcto | Ninguno | OK |
| 22 | Importar con negativo | guard explícito | error bloqueante | ✅ Correcto | Ninguno | OK |
| 23 | Importar 500 productos, fallo en prod 250 | sequential sin tx | 249 actualizados, 251 no | ⚠️ No atómico | Medio | **BRECHA M-04** |
| 24 | Transferencia intra-establecimiento | CONFIRMADA inmediato | stock reacomoda en almacenes | ✅ Correcto | Ninguno | OK |
| 25 | Transferencia inter-establecimiento | PENDIENTE → EN_TRANSITO → RECIBIDA | stock sale al despacho, llega al recibir | ✅ Correcto | Ninguno | OK |
| 26 | Cancelar transferencia PENDIENTE | CANCELADA → sin movimiento | stock intacto | ✅ Correcto | Ninguno | OK |
| 27 | Anular transferencia EN_TRANSITO | AJUSTE_POSITIVO en origen | stock origen restaurado | ✅ Correcto | Ninguno | OK |
| 28 | 2 tabs, OV concurrentes, mismo producto | race condition | puede pisar reservas | ⚠️ Race condition | Alto | **BRECHA M-03** |
| 29 | Producto con docena (unidad adicional), NI con 1 docena | NI usa cantidad cruda | ingresa 1 al stock en vez de 12 | ⚠️ Sin conversión | Medio | **BRECHA M-06** |
| 30 | Almacén inactivo en NS FIFO | allocate skip inactivo | no se usa almacén inactivo | ✅ Correcto | Ninguno | OK |
| 31 | `resolvealmacenesForSaleFIFO()` retorna [] | fallback a todos activos | puede incluir otros establecimientos | ⚠️ Fallback frágil | Medio | **BRECHA M-05** |
| 32 | Comprobante emitido, stock falla (no fatal) | toast.warning, comprobante existe | stock inconsistente con comprobante emitido | ⚠️ | **Alto** | **BRECHA A-02** |
| 33 | NI mismo producto en 2 líneas mismo almacén | loop procesa 2 líneas | stock += q1 + q2 | ✅ Aceptable | Ninguno | OK |
| 34 | Producto SKU cambiado después de OV | reserva usa sku, no id | reserva queda huérfana | ⚠️ | Medio | **BRECHA M-07** |
| 35 | Inventario desactivado, reactivado | prefs.controlStockActivo = true | stock histórico preservado | ✅ Correcto | Ninguno | OK |

---

## 20. Brechas encontradas

### A-01 — OV en estado 'Pendiente de salida' no libera reserva al cancelar

**Severidad:** Alta  
**Archivo:** `useDocumentoComercialActions.ts` línea 462  
**Flujo:** OV → Comprobante (modo nota_salida) → OV queda 'Pendiente de salida' → usuario cancela OV  

**Código actual:**
```typescript
if (doc.estado === 'Reservada' && doc.reservasStock?.length) {
  liberarReservaOrden(doc.reservasStock);
}
// Si estado === 'Pendiente de salida': NO libera reserva
```

**Impacto:** `stockReservadoPorAlmacen` queda permanentemente inflado. El disponible se reduce sin que exista ningún documento activo que lo justifique. Afecta a futuras OV y ventas que ven menos disponible del real.  
**Reproducción:** Crear OV → emitir comprobante con modo nota_salida → cancelar OV.  
**Recomendación:** Agregar rama para `doc.estado === 'Pendiente de salida'` que también llame `liberarReservaOrden()`.  
**Riesgo si no se corrige:** Stock disponible permanentemente reducido. Ventas rechazadas por stock incorrecto.

---

### A-02 — Comprobante puede emitirse sin descontar stock (error no fatal)

**Severidad:** Alta  
**Archivo:** `useComprobanteActions.tsx` bloque try/catch del descuento  
**Flujo:** Factura/Boleta automático → falla el descuento de stock → comprobante emitido de todas formas  

**Código actual:**
```typescript
try {
  // ... descuento de stock
} catch (stockError) {
  toast.warning('Stock no actualizado. Ajusta manualmente desde Inventario > Movimientos.');
}
// Comprobante ya creado y en localStorage
```

**Impacto:** Documento fiscal emitido con stock sin descontar. El Kardex no refleja la salida. El stock queda inflado.  
**Reproducción:** Forzar una excepción en el descuento (almacén eliminado entre validación y emisión).  
**Recomendación:** Decidir si el error de stock debe ser fatal (rollback del comprobante) o mantenerlo no-fatal pero registrar un movimiento de auditoría.  
**Riesgo si no se corrige:** Venta fantasma — documento emitido, stock no descontado, Kardex incompleto.

---

### A-03 — Kardex no puede reconstruir stock (punto de fallo único)

**Severidad:** Alta  
**Archivo:** `StockRepository.ts`, `inventory.service.ts`  
**Flujo:** Todos  

**Descripción:** El stock real vive en `product.stockPorAlmacen` en localStorage. El Kardex (`StockRepository`) es solo un log de movimientos. No existe función que recalcule `stockPorAlmacen` a partir del Kardex. Si `stockPorAlmacen` se corrompe (bug, importación errónea, edición manual del localStorage), el stock queda incorrecto y no hay forma de reconciliarlo desde el Kardex.  

**Evidencia:**
```typescript
// InventoryService.getStock() — lee directo:
static getStock(product: Product, almacenId: string): number {
  return product.stockPorAlmacen?.[almacenId] ?? 0;
}
// StockRepository — solo append/read, sin reconstrucción
```

**Recomendación:** Implementar una función de reconciliación que recalcule `stockPorAlmacen` sumando ENTRADA y restando SALIDA del Kardex para un producto/almacén dado.  
**Riesgo si no se corrige:** No hay recovery en caso de corrupción de datos.

---

### M-01 — NS en estado 'Entregada' no tiene flujo de devolución

**Severidad:** Media  
**Archivo:** `notaSalida.service.ts` línea 406-415  
**Flujo:** NS → Entregada → devolución  

**Código actual:**
```typescript
if (nota.estado !== 'Generada') {
  throw new Error(
    nota.estado === 'Entregada'
      ? 'No se puede anular una Nota de Salida en estado Entregada. Contacte a soporte...'
      : '...'
  );
}
```

**Impacto:** Si se marca una NS como Entregada por error, no existe forma de revertirla. El stock queda descontado permanentemente salvo ajuste manual.  
**Recomendación:** Implementar NI de devolución vinculada a la NS original.

---

### M-02 — PATH2 en `descontarStockParaDocumento` descuenta sin Kardex

**Severidad:** Media  
**Archivo:** `servicioReservaStock.ts` — `descontarStockParaDocumento()`  

**Descripción:** Si `almacenObj` es null o `documentoReferencia`/`usuario` están vacíos, el stock se descuenta directamente sin generar movimiento de Kardex.  
**Recomendación:** Eliminar el PATH2 fallback y hacer que la condición sea un `throw` en lugar de un descuento silencioso. Si `almacenObj` no existe, el descuento no debe ocurrir de ninguna forma.

---

### M-03 — Race condition en reservas multi-tab

**Severidad:** Media  
**Archivo:** `servicioReservaStock.ts` — `reservarStockOrden()`  

**Descripción:** Dos OVs creadas simultáneamente en tabs diferentes pueden ambas leer `stockReservadoPorAlmacen = 0` y ambas reservar la misma cantidad, resultando en reservas totales > stock real.  
**Recomendación:** Añadir lock en localStorage o implementar reserva con CAS (compare-and-swap) que falle si el valor cambió desde la lectura.

---

### M-04 — Importación masiva sin transacción atómica

**Severidad:** Media  
**Archivo:** `PanelImportacionStock.tsx`  

**Descripción:** El loop de importación actualiza productos de forma secuencial. Un fallo a mitad deja algunos productos actualizados y otros no. No hay rollback.  
**Recomendación:** Calcular todos los nuevos valores primero, validar todo, y solo entonces aplicar todos los cambios de una vez (bulk `updateProduct`).

---

### M-05 — Fallback en NS puede usar almacenes de otro establecimiento

**Severidad:** Media  
**Archivo:** `notaSalida.service.ts` línea 165-174  

**Descripción:** Si `resolvealmacenesForSaleFIFO()` retorna array vacío para un establecimiento, el fallback usa `almacenesArray.filter(a => a.estaActivoAlmacen !== false)` sin filtrar por establecimiento. En sistema multi-establecimiento, FIFO podría usar almacenes de otro establecimiento.  
**Recomendación:** El fallback debe filtrar también por `establecimientoId`.

---

### M-06 — NI/NS/OV no aplican conversión de unidades

**Severidad:** Media  
**Archivos:** `notaIngreso.service.ts`, `notaSalida.service.ts`, `servicioReservaStock.ts`  

**Descripción:** Comprobantes aplican `calculateRequiredUnidadMinima()` para convertir a unidad mínima antes de descontar stock. NI, NS y OV usan la cantidad cruda de la línea, asumiendo que ya está en unidad mínima. Si un usuario registra NI con `cantidad = 1 docena` y el sistema almacena en unidades, el stock sube en 1 en vez de 12.  
**Recomendación:** Verificar si `linea.cantidad` en NI/NS ya viene convertida a unidad mínima desde el UI. Si no, aplicar `convertToUnidadMinima()` antes de llamar `registerAdjustment()`.

---

### M-07 — Reserva indexada por `sku` (código), no por `productoId`

**Severidad:** Media  
**Archivo:** `servicioReservaStock.ts`, `documentoComercial.types.ts`  

**Descripción:** `ReservaStockItem.sku` almacena el código del producto (`producto.codigo`), no el ID. Si se modifica el código de un producto desde Catálogo después de que una OV haya creado una reserva, la reserva queda huérfana (no se puede liberar porque el sku no coincide).  
**Recomendación:** Añadir `productoId` a `ReservaStockItem` y usarlo para la reconciliación, con `sku` solo como referencia de display.

---

## 21. Priorización de correcciones

| Orden | Brecha | Severidad | Esfuerzo estimado |
|---|---|---|---|
| 1 | **A-01** — OV Pendiente de salida no libera reserva | Alta | Bajo (1 condición) |
| 2 | **A-02** — Comprobante emitido sin stock descontado | Alta | Medio (decidir política) |
| 3 | **A-03** — Kardex no reconstruye stock | Alta | Alto (feature nueva) |
| 4 | **M-05** — Fallback NS sin filtro de establecimiento | Media | Bajo (1 línea) |
| 5 | **M-02** — PATH2 sin Kardex | Media | Bajo (eliminar fallback) |
| 6 | **M-06** — Conversión de unidades en NI/NS | Media | Medio (verificar y aplicar) |
| 7 | **M-04** — Importación sin transacción | Media | Medio (refactor loop) |
| 8 | **M-03** — Race condition multi-tab | Media | Alto (requiere locking) |
| 9 | **M-07** — Reserva por sku no por id | Media | Medio (migración de datos) |
| 10 | **M-01** — Sin flujo de devolución para NS Entregada | Media | Alto (feature nueva) |

---

## 22. Checklist de cierre

- [x] Stock real vive en `stockPorAlmacen` — correcto
- [x] `stockDisponible = real - reservado` — invariante garantizada
- [x] NI genera Kardex ENTRADA por almacén
- [x] NI anulación revierte exactamente con guard de no-negativo
- [x] NS respeta FIFO y prioridad de almacenes
- [x] NS valida disponible (no stock bruto)
- [x] NS OV-linked no afecta reservas ajenas
- [x] NS parcial libera solo lo despachado
- [x] Reserva OV no genera movimiento físico
- [x] Comprobante desde OV usa almacenes exactos de la reserva
- [x] Transferencia valida disponible (no stock bruto)
- [x] Transferencia genera par SALIDA+ENTRADA en Kardex
- [x] Importación guarda H-03 (no bajar por debajo de reservado)
- [x] Guards de doble clic en NI/NS/Importación
- [ ] **OV Pendiente de salida libera reserva al cancelar** — **PENDIENTE**
- [ ] **Comprobante error de stock es fatal o hay auditoría** — **PENDIENTE**
- [ ] **Kardex puede reconciliar stock** — **PENDIENTE**
- [ ] **Fallback NS filtra por establecimiento** — **PENDIENTE**
- [ ] **Conversión de unidades en NI/NS verificada** — **PENDIENTE**

---

## 23. Preguntas abiertas

1. **¿`linea.cantidad` en NI/NS ya viene en unidad mínima desde el UI?** Si el formulario de NI/NS presenta campos en unidad del producto sin convertir, la brecha M-06 es real. Si el UI ya convierte antes de guardar la línea, M-06 no aplica.
2. **¿`stockDescuentoGuiaRemision` es verificado en algún flujo de Guía de Remisión?** No se encontró en los archivos auditados. ¿Guía de Remisión descuenta stock actualmente?
3. **¿`addMovimientoStock()` en comprobantes es un wrapper de `InventoryService.registerAdjustment()` o una implementación separada?** Necesita verificación para confirmar si genera Kardex de forma idéntica.
4. **¿La función `resolvealmacenesForSaleFIFO()` puede devolver vacío en producción?** Si existe al menos un almacén activo por establecimiento (que es la condición mínima para operar), en teoría nunca debería ocurrir el fallback.
5. **¿Existe un proceso de backup/export del localStorage?** Con A-03 sin corregir, la única fuente de verdad del stock puede perderse sin recovery.

---

## 24. Recomendación final

### Puede cerrarse el módulo de inventario operativo con estas condiciones:

**Obligatorio antes de avanzar a Compras/Pagos:**
1. Corregir **A-01** — único bug reproducible que corrompe stock de forma permanente y silenciosa.
2. Corregir **M-05** — fallback NS multi-establecimiento.
3. Verificar y documentar **M-06** (conversión de unidades en NI/NS).

**Puede quedar como deuda técnica documentada:**
- A-02 (no fatal pero con toast), M-02 (path anómalo), M-03 (multi-tab), M-04 (importación), M-07 (sku vs id).
- A-03 (reconciliación Kardex) — importante para resiliencia a largo plazo pero no bloquea operación actual.

### La lógica central es sólida

El motor FIFO multi-almacén con `respectReservations: true`, la separación limpia entre reservas lógicas y movimientos físicos, los guards de estado en NI/NS, y la validación H-03 en importación son implementaciones de buena calidad. El sistema puede operar correctamente en el escenario de empresa con un establecimiento, varios almacenes, con OVs, NI/NS y transferencias — que es el caso de uso principal.

---

*Informe generado el 2026-06-16. Basado en lectura directa del código fuente. Sin ejecución de código.*
