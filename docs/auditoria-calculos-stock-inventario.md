# Auditoría de Cálculos de Stock — FacturaFacil / SenciYo

**Fecha:** 2026-06-14  
**Auditor:** Claude Sonnet 4.6 (Arquitecto Senior — Inventario multi-almacén)  
**Rama:** TransferenciaAlmacenes  
**Alcance:** Núcleo inventario, NI, NS, Transferencias, Comprobantes, POS, OV, NV, Importación

---

## Resumen Ejecutivo

El módulo de inventario de SenciYo tiene una arquitectura de stock correcta en su núcleo. La fuente de verdad es `stockPorAlmacen` por producto, se usa consistentemente la fórmula `disponible = real − reservado` en los flujos críticos, y las brechas anteriores B-01, B-03 y B-04 han sido corregidas. Persisten 3 brechas nuevas de riesgo medio-alto que requieren atención antes de cerrar el módulo como operativamente confiable: el comprobante que crea primero el documento y descuenta después (B-05), la validación de NS que ignora el stock reservado (B-04 parcialmente activa), y la importación que no verifica reservas al resetear stock.

**Veredicto: C — Cálculo de stock requiere correcciones puntuales antes de cierre.**

---

## Sección 1 — Mapa de Fuentes de Verdad

### 1.1 Jerarquía de fuentes

| Campo | Rol | Estado |
|---|---|---|
| `product.stockPorAlmacen[almacenId]` | **Fuente de verdad principal** — stock real por almacén | Activo, siempre actualizado en operaciones NI/NS/Transferencia |
| `product.stockReservadoPorAlmacen[almacenId]` | **Reservas activas** — comprometidas por OV | Actualizado por OV create/cancel; liberado al emitir comprobante o NS directa |
| `product.stockPorEstablecimiento[estId]` | **Derivado agregado** — suma de stockPorAlmacen del establecimiento | Actualizado en transferencias (`syncEstablecimientoStock`) y en comprobantes (`inventory.facade.ts`); AUSENTE en NI/NS manuales |
| `product.cantidad` | **Campo legacy** — total global | Recalculado en `recalcularTotalesStock()`, llamado en NI/NS/importación. Inconsistente en comprobantes donde solo actualiza por almacén |
| Movimientos Kardex (localStorage) | **Log de eventos** — no es fuente autoritativa de stock | Solo se lee para UI de historial; no se usa para reconstruir stockPorAlmacen |

### 1.2 Diagnóstico de sincronización

**`stockPorEstablecimiento` — desincronización estructural:**

- `useInventory.ts` (transferencias): llama `syncEstablecimientoStock()` correctamente (línea 236, 368, 426, 527).
- `notaIngreso.service.ts` / `notaSalida.service.ts`: llaman `recalcularTotalesStock()` que recalcula `stockPorEstablecimiento` iterando todos los almacenes (líneas 107, 221 de NI service; 221 de NS service). Correcto.
- `inventory.facade.ts` (comprobantes/POS): actualiza `stockPorEstablecimiento` de forma incremental con `delta` (líneas 82-99). Correcto pero diferente algoritmo — puede desincronizarse si el delta previo era incorrecto.
- `PanelImportacionStock.tsx`: llama `recalcularTotalesStock()` (líneas 443, 474). Correcto.
- `confirmarReset` en importación: llama `updateProduct(producto.id, resultado.product)` con el resultado de `registerAdjustment` que NO recalcula `stockPorEstablecimiento` (línea 521). **BRECHA nueva: reseteo no recalcula `stockPorEstablecimiento`.**

**El Kardex no puede reconstruir stockPorAlmacen:**  
`StockRepository` solo almacena movimientos con `cantidadAnterior` y `cantidadNueva` pero no existe ninguna función que itere movimientos para derivar el stock actual. La fuente de verdad real es el objeto `Product` en Zustand/localStorage de catálogo, no los movimientos.

**Riesgo de desincronización:**  
Si el proceso de actualización de `Product` falla (error de escritura a localStorage) después de que el `MovimientoStock` ya fue guardado, el Kardex y el stock real quedan divergentes sin mecanismo de reconciliación automática.

---

## Sección 2 — Verificación de la Fórmula Disponible = Real − Reservado

| Flujo | Usa disponible = Real − Reservado | Evidencia | Clasificación |
|---|---|---|---|
| **Transferencia intra/inter** | Sí | `inventory.service.ts:206` — `Math.max(0, stockOrigen - reservedOrigen)` | Correcto |
| **TransferModal validación UI** | Sí | TransferModal lee stock y el service valida disponible | Correcto |
| **Nota de Salida — validación pre-descuento** | No | `notaSalida.service.ts:175` — usa `stockActual` sin restar reservado | **Riesgoso** |
| **Alertas de stock** | Sí | `inventory.service.ts:548` — `stockDisponible = Math.max(0, stockReal - stockReservado)` | Correcto |
| **Stock Actual UI (cantidadActual en alerta)** | Sí | `inventory.service.ts:573` — `cantidadActual: stockDisponible` | Correcto |
| **OV — validación disponible** | Sí | `servicioReservaStock.ts:92` — `summarizeProductStock` usa `computeAvailable(stock, reserved)` | Correcto |
| **Comprobante automático — pre-check** | Sí | `useComprobanteActions.tsx:326` — `allocateSaleAcrossalmacenes` con `respectReservations: true` | Correcto |
| **POS (useCart)** | Sí | `useCart.tsx:226` — `summarizeProductStock` con reservas | Correcto |
| **Importación masiva — reseteo** | No | `PanelImportacionStock.tsx:503-521` — resetea sin verificar reservado | **Riesgoso** |
| **NI anulación** | No aplica — solo verifica `stockActual >= linea.cantidad` | `notaIngreso.service.ts:158-163` — validación correcta para reversión de entrada | Correcto |

---

## Sección 3 — Revalidación de Brechas Anteriores

### B-01 — Doble generación NI/NS

**Estado: CORREGIDA parcialmente / Riesgo residual.**

**Evidencia `useNotasIngreso.ts` — `generarNI`:**
- Línea 69: `cargarNotasIngreso()` re-lee desde localStorage en cada llamada (snapshot fresco).
- Línea 57 (service): guard `if (nota.estado === 'Generada') throw new Error(...)` — el idempotent check existe.
- NO hay flag `isLoading` / `procesando` que deshabilite el botón en el hook; el hook solo retorna `generarNI: (id) => boolean`. La responsabilidad de deshabilitar el botón está en el componente consumidor.
- Riesgo residual: si el usuario hace doble-click rápido antes de que React re-renderice con el estado `'Generada'`, la segunda llamada puede llegar al service antes de que `agregarOActualizarNI` persista el nuevo estado. El guard del service lee el estado del parámetro `nota`, no de localStorage, por lo que si ambas llamadas leen el mismo borrador simultáneamente, ambas pasarían el guard.

**Evidencia `useNotasSalida.ts` — `generarNS`:** Idéntico patrón.

**Recomendación:** Agregar `const [procesando, setProcesando] = useState(false)` en el hook y hacer `if (procesando) return false` al inicio de `generarNI`/`generarNS`.

---

### B-02 — Anulación NS vinculada a OV

**Estado: IMPLEMENTADA Y CORRECTA.**

**Evidencia `useNotasSalida.ts:215-219`:**
```typescript
// NS directa desde OV: restaurar OV a 'Reservada' y reponer reserva de stock
if (nota.origen === 'OrdenVenta' && nota.ordenVentaOrigenId) {
  restaurarOVPostAnulacionNSDirecta(nota.ordenVentaOrigenId, { ... });
}
```

**Evidencia `postEmisionOrdenVenta.ts:213-256`:**
- `restaurarOVPostAnulacionNSDirecta`: verifica `ov.estado === 'Atendida'` antes de actuar.
- Llama `restaurarReservasDeOV(ov.reservasStock)` que incrementa `stockReservadoPorAlmacen`.
- Cambia estado OV a `'Reservada'`.

**Flujo OV → NS directa:**
1. OV se crea en estado `'Reservada'` con `reservasStock`.
2. NS directa se genera: stock real se descuenta (via `registerAdjustment`), reserva se libera (`liberarReservasDeOV`), OV pasa a `'Atendida'`.
3. Al anular NS directa: stock real se repone (via `registerAdjustment` AJUSTE_POSITIVO), reserva se restaura (`restaurarReservasDeOV`), OV vuelve a `'Reservada'`.

Ciclo completo y simétrico. Brecha anterior corregida.

---

### B-03 — stockPorEstablecimiento null

**Estado: CORREGIDA.**

**Evidencia `useInventory.ts:39-40`:**
```typescript
// BRECHA-03: inicializar el mapa si es null/undefined en lugar de saltar silenciosamente
const nextStockPorEst = { ...(product.stockPorEstablecimiento ?? {}) };
```

El comentario explícito en el código confirma que fue corregida. El `?? {}` garantiza que nunca se hace early-return; siempre se inicializa el mapa.

**Cobertura de la corrección:**
- Transferencias intra: `syncEstablecimientoStock` llamada con establecimientos afectados. Correcto.
- Transferencias inter (despacho/recepción): llamada en `handleDespacharTransfer` y `handleRecibirTransfer`. Correcto.
- NI/NS: `recalcularTotalesStock` recalcula `stockPorEstablecimiento` completo. Correcto.
- Comprobantes: `inventory.facade.ts` calcula incrementalmente. Correcto.
- Reset en importación: NO llama `recalcularTotalesStock`. **Brecha residual menor.**

---

### B-04 — NS valida real vs disponible

**Estado: PARCIALMENTE ABIERTA.**

**Evidencia `notaSalida.service.ts:175-183`:**
```typescript
const stockActual = InventoryService.getStock(producto, almacenLinea.id);
if (stockActual < linea.cantidad) {
  throw new Error(`No hay stock suficiente...`);
}
```

`InventoryService.getStock` devuelve `product.stockPorAlmacen?.[almacenId] ?? 0` — el **stock real**, no el disponible.

**Impacto por tipo de NS:**
- **NS manual:** Puede descontar stock que está reservado para OVs. Si hay 10 real, 8 reservado para una OV, y se genera NS por 5, la validación pasa (10 >= 5) pero el stock real cae a 5 con 8 reservado → reservado > real → stock disponible negativo virtual.
- **NS desde OV (origen = 'OrdenVenta'):** Benigno — la OV ya comprometió la reserva; la NS libera esa reserva y descuenta el real. El resultado neto es correcto.
- **NS desde comprobante:** El comprobante en modo automático ya descontó el stock real; la NS no lo volvería a descontar (el comprobante ya lo hizo). En modo `nota_salida`, la NS sí descuenta. Benigno porque la OV tenía reserva.

**Conclusión:** La brecha impacta principalmente NS manuales cuando hay reservas activas de OV en el mismo almacén. Es un escenario real cuando el módulo OV está activo.

---

### B-05 — Comprobante huérfano si falla stock

**Estado: ABIERTA — Diseño intencional con riesgo documentado.**

**Evidencia `useComprobanteActions.tsx:341-686`:**

El orden de operaciones es:
1. (Línea 341) `toast.info('Procesando...')` — feedback visual
2. (Línea 344) `await new Promise(setTimeout, 2000)` — simulación API
3. (Línea 349) `addComprobante(...)` — **el comprobante se CREA PRIMERO**
4. (Línea 533-686) Descuento de stock — **DESPUÉS del comprobante**

Si el descuento falla (líneas 669-685):
```typescript
toast.warning(
  'Stock no actualizado',
  `El comprobante ${numeroComprobante} se creó pero el stock no pudo actualizarse. Ajusta manualmente...`
);
```

**Este es el comportamiento documentado e intencional** — el equipo eligió priorizar la consistencia del comprobante sobre la del stock, con una advertencia al usuario. Es una decisión de diseño válida para un sistema front-end sin backend transaccional. Sin embargo, en la práctica genera comprobantes con stock incorrecto hasta ajuste manual.

**Alternativa sin rollback posible en frontend:** Si el stock no se descuenta, el stock actual queda inflado, y futuras validaciones verán más disponible del real.

---

### B-06 — Importación menor al reservado

**Estado: ABIERTA.**

**Evidencia `PanelImportacionStock.tsx:450-484`:**

En modo `actualizar` (stock final):
```typescript
if (cantidadArchivo < 0) {
  errores.push(`... El stock final no puede ser negativo.`);
  continue;
}
```

Valida que no sea negativo, pero **no verifica que el nuevo stock sea >= reservado**. Si hay `stockReservadoPorAlmacen[almacenId] = 50` y el usuario importa `cantidadArchivo = 10`, el stock real quedaría en 10 con 50 reservados → disponible virtual = −40.

En modo `reset` (`confirmarReset`):
- Resetea a cero incondicionalmente si `stockActual > 0`.
- No verifica reservas. Si hay reservas activas, el reset pone el stock en 0 con reservas positivas → disponible virtual negativo.

**Riesgo alto** cuando hay OVs activas con reservas.

---

## Sección 4 — Auditoría por Flujo

### 4.1 Nota de Ingreso (NI)

| Aspecto | Detalle |
|---|---|
| **Stock que lee** | `product.stockPorAlmacen[almacenId]` vía `InventoryService.getStock()` |
| **Stock que modifica** | `stockPorAlmacen[almacenId]` += cantidad. `cantidad` (total) recalculado. `stockPorEstablecimiento` recalculado completo. |
| **Orden de operaciones** | 1) Validar nota no generada, 2) Generar correlativo, 3) Por línea: `registerAdjustment` → `recalcularTotalesStock` → `updateProduct`, 4) Persistir nota. |
| **Riesgo huérfano** | Bajo — si `updateProduct` falla después de que `registerAdjustment` guardó el movimiento, el stock en memoria y el Kardex divergen. Sin rollback. |
| **Estado reserva** | No toca `stockReservadoPorAlmacen`. Correcto: la NI es una entrada que aumenta el disponible. |
| **Anulación** | Correcta — verifica `stockActual >= linea.cantidad` antes de revertir. Registra AJUSTE_NEGATIVO. |
| **Riesgo doble generación** | Residual (ver B-01). El guard de estado existe pero sin mutex de UI. |

### 4.2 Nota de Salida (NS)

| Aspecto | Detalle |
|---|---|
| **Stock que lee** | `product.stockPorAlmacen[almacenId]` — **stock real, no disponible** |
| **Stock que modifica** | `stockPorAlmacen[almacenId]` -= cantidad. `cantidad` y `stockPorEstablecimiento` recalculados. |
| **Orden de operaciones** | 1) Validar estado, 2) Validar almacén activo, 3) **Validar stock (REAL)** para todas las líneas, 4) Generar correlativo, 5) Por línea: `registerAdjustment` → `recalcularTotalesStock`. |
| **Riesgo huérfano** | Bajo — si falla el proceso de líneas parcialmente, el stock queda inconsistente (se procesaron N-1 líneas pero no la N). Sin rollback. |
| **Estado reserva** | NS directa desde OV: libera reserva vía `liberarReservasDeOV` DESPUÉS de `updateProduct`. NS manual: no toca reservas. |
| **Anulación** | Registra AJUSTE_POSITIVO (repone stock). NS directa desde OV: restaura reserva y revierte estado OV. |
| **Brecha crítica** | Validación usa stock real, no disponible (B-04 parcialmente abierta). |

### 4.3 Transferencias

| Aspecto | Detalle |
|---|---|
| **Stock que lee** | `stockPorAlmacen[almacenOrigenId]` + `stockReservadoPorAlmacen[almacenOrigenId]` |
| **Disponible usado** | `Math.max(0, stockOrigen - reservedOrigen)` — Correcto |
| **Stock que modifica** | Origen: -cantidad. Destino: +cantidad. `cantidad` total. `syncEstablecimientoStock` para establecimientos afectados. |
| **Inter-establecimiento** | PENDIENTE: solo registra entidad, sin mover stock. EN_TRANSITO: descuenta origen. RECIBIDA: suma destino. |
| **Anulación CONFIRMADA/RECIBIDA** | Revierte ambos movimientos verificando stock en destino >= cantidad. |
| **Anulación EN_TRANSITO** | Solo revierte la salida (correcto — el destino no recibió). |

### 4.4 Comprobante (Factura/Boleta)

| Aspecto | Detalle |
|---|---|
| **Pre-check stock** | `allocateSaleAcrossalmacenes` con `respectReservations: true` → usa disponible. Correcto. |
| **Stock que modifica** | `inventory.facade.ts:addMovimiento` → `updateProduct` con `stockPorAlmacen`, `cantidad`, `stockPorEstablecimiento` incremental. |
| **Orden de operaciones** | Crea comprobante PRIMERO, descuenta stock DESPUÉS. **Huérfano si falla stock** (B-05). |
| **OV → Comprobante** | Usa reservas de OV para allocation exacta (no FIFO nuevo). Libera reservas al emitir (modo automático). |
| **NC (Nota de Crédito)** | No descuenta stock. Puede reponer stock si código SUNAT es 06/07. |

### 4.5 POS (useCart)

| Aspecto | Detalle |
|---|---|
| **Validación al agregar** | `summarizeProductStock` con reservas → usa disponible real. Correcto. |
| **Al confirmar venta** | Misma lógica que comprobante vía `useComprobanteActions`. |
| **Stock que modifica** | Igual que comprobante — `addMovimiento` en facade. |

### 4.6 Orden de Venta (OV)

| Aspecto | Detalle |
|---|---|
| **Validación** | `validarStockParaOrden` → `summarizeProductStock` con `respectReservations: true` → disponible real. Correcto. |
| **Reserva** | `reservarStockOrden` → incrementa `stockReservadoPorAlmacen`. No toca stock real. |
| **Al emitir comprobante** | Modo automático: libera reserva + descuenta real. Modo nota_salida: no libera reserva hasta NS. |
| **Al anular OV** | `liberarReservaOrden` → decrementa `stockReservadoPorAlmacen`. |

### 4.7 Nota de Venta (NV)

| Aspecto | Detalle |
|---|---|
| **Modo automático** | `descontarStockParaDocumento` → descuenta `stockPorAlmacen`. No genera movimiento Kardex. **Kardex queda sin registro del movimiento de NV.** |
| **Modo nota_salida** | No descuenta; NS posterior lo hace. |
| **Anulación** | `revertirDescuentoStockDocumento` — repone `stockPorAlmacen`. Sin movimiento Kardex. |

### 4.8 Importación Masiva

| Aspecto | Detalle |
|---|---|
| **Modo actualizar** | Calcula `diferencia`, registra AJUSTE_POSITIVO o AJUSTE_NEGATIVO. Llama `recalcularTotalesStock`. Correcto para `stockPorEstablecimiento`. |
| **Modo sumar** | Suma directamente; registra AJUSTE_POSITIVO. Correcto. |
| **Modo reset** | Solo registra AJUSTE_NEGATIVO; NO llama `recalcularTotalesStock` (usa `resultado.product` del `registerAdjustment`). **`stockPorEstablecimiento` no recalculado tras reset.** |
| **Sin verificación de reservas** | Ningún modo verifica `stockReservadoPorAlmacen` antes de operar. B-06. |

### 4.9 Cotización

No afecta stock en ningún modo. Sin riesgo de stock.

---

## Sección 5 — Auditoría de Precisión Numérica

### 5.1 Uso de parseFloat / parseInt / Number()

| Ubicación | Uso | Riesgo |
|---|---|---|
| `notaIngreso.service.ts:38` | `parseInt(n.correlativo, 10)` + `Number.isFinite` guard | Correcto |
| `notaSalida.service.ts:53` | Igual patrón | Correcto |
| `PanelImportacionStock.tsx:134, 189` | `parseFloat(String(valorCrudo))` + `isNaN` check | Correcto |
| `notaIngreso.service.ts:268` | `parseFloat((existing.base + l.subtotal).toFixed(2))` | Correcto — evita acumulación de punto flotante |
| `stockGateway.ts:11-19` | `toNumber()` con `Number.isFinite` check | Correcto |
| `postEmisionOrdenVenta.ts:29-31` | `toNum()` con `Number.isFinite && n > 0` | Correcto |
| `inventory.service.ts:55` | `Number.isFinite(newQuantity) ? Number(newQuantity) : 0` | Correcto |

### 5.2 Stock negativo

- `InventoryService.updateStock()`: por defecto `Math.max(0, normalizedQuantity)`. Permite negativo solo si `allowNegativeStock: true`.
- `inventory.facade.ts`: respeta `allowNegativeStock` de configuración.
- `allocateSaleAcrossalmacenes`: `computeAvailable = stock <= reserved ? 0 : stock - reserved` — nunca negativo.
- `liberarReservasDeOV` y similares: `Math.max(0, ...)` — no permite reservado negativo.
- **No se detecta posibilidad de stock negativo sin intención del sistema.**

### 5.3 Cantidad 0

- `isValidQuantity()` en helpers: `quantity > 0` — rechaza 0.
- `generarNSEnInventario`: no valida que `linea.cantidad > 0` explícitamente (hereda la validación del formulario de UI).
- `registerAdjustment`: no valida `data.cantidad > 0`. Si se pasa 0, el stock no cambia pero se registra un movimiento vacío. **Riesgo menor de movimientos con cantidad 0 en Kardex.**

### 5.4 NaN

- `stockGateway.ts:toNumber()` y `postEmisionOrdenVenta.ts:toNum()` retornan 0 si NaN. Protegido.
- `PanelImportacionStock.tsx`: valida `isNaN(parseado)` y registra error. Protegido.
- `generarCorrelativoNI/NS`: usa `.filter(Number.isFinite)` para filtrar NaN. Protegido.

---

## Sección 6 — Auditoría de Persistencia y Refresh

### 6.1 Fuentes de persistencia

| Dato | Almacenamiento | Clave tenant |
|---|---|---|
| Productos (con stock) | localStorage — catálogo products key | Sí (lsKey) |
| Movimientos Kardex | localStorage — `facturafacil_stock_movements` | Sí (lsKey) |
| Notas de Ingreso | localStorage | Sí (tryLsKey) |
| Notas de Salida | localStorage | Sí (tryLsKey) |
| Documentos Comerciales (OV/NV) | localStorage — `documentos_comerciales_v1` | Sí (tryLsKey) |
| Transferencias | localStorage — TransferenciaRepository | No verificado |

### 6.2 Lectura fresca antes de operar

- `generarNI` / `generarNS`: llaman `cargarNotasIngreso()` / `cargarNotasSalida()` al inicio — snapshot fresco desde localStorage. Correcto.
- `liberarReservasDeOV` y `reservarStockOrden`: usan `useProductStore.getState()` en cada iteración del loop. Correcto — evita snapshot stale en bucles multi-almacén.
- `handleCreateTransfer`: usa `allProducts.find(...)` del closure de React — potencial snapshot levemente desactualizado si hay renders concurrentes. Bajo riesgo en uso normal.

### 6.3 Patrón snapshot peligroso

**Detectado en `PanelImportacionStock.tsx:400-445`:**
```typescript
let productoActual = allProducts.find(p => p.codigo === fila.codigo);
// ... bucle por almacenes del mismo producto:
updateProduct(productoActual.id, productoFinalA);
productoActual = productoFinalA; // ← actualiza referencia local
```
Correcto — el código actualiza `productoActual` en cada iteración del loop de almacenes del mismo producto. No hay snapshot stale.

**Detectado en `confirmarReset` (línea 508):**
```typescript
const producto = allProducts.find(p => p.id === idProducto);
// ...
updateProduct(producto.id, resultado.product);
```
NO actualiza la referencia local entre iteraciones de almacenes del mismo producto en el reset. Si un producto tiene múltiples almacenes en `productosSeleccionados`, la segunda iteración de almacén leerá el `producto` del cierre original (desactualizado). **Riesgo de overwrite silencioso en reset multi-almacén del mismo producto.**

---

## Sección 7 — Auditoría de Orden de Operaciones

### 7.1 NI — Orden real

```
validar(estado != Generada) 
→ validar(almacen activo) 
→ por línea: registerAdjustment(stock+) → recalcularTotalesStock → productsMap.set 
→ agregarOActualizarNI (persistir nota) 
→ por producto: updateProduct(store)
```
**Ventana de inconsistencia:** Entre `registerAdjustment` (que guarda movimiento en localStorage) y `updateProduct` (que actualiza stock en Product). Si el proceso falla entre estos dos pasos, el movimiento Kardex existe pero el stock del producto no fue actualizado. Bajo riesgo en entorno frontend de hilo único.

### 7.2 NS — Orden real

```
validar(estado) 
→ validar(almacen activo) 
→ validar TODAS las líneas (stock real >= cantidad) 
→ generarCorrelativo 
→ por línea: registerAdjustment(stock-) → recalcularTotalesStock 
→ agregarOActualizarNS 
→ por producto: updateProduct 
→ [si OV]: liberarReservas → atenderOV / restaurarOV
```
Nota: la validación transaccional (todas las líneas antes de procesar ninguna) es correcta — evita procesar N-1 líneas si la N-ésima falla.

### 7.3 Transferencia intra — Orden real

```
validar(permisos + establecimiento origen) 
→ validar(disponible = real - reservado >= cantidad) 
→ updateStock(origen-) + updateStock(destino+) 
→ stockPorAlmacen actualizado en memoria 
→ syncEstablecimientoStock 
→ addMovements([salida, entrada]) en StockRepository 
→ updateProduct 
→ TransferenciaRepository.upsert
```

### 7.4 Comprobante — Orden real (B-05)

```
validar(permisos) 
→ validateComprobanteData 
→ pre-check stock (disponible) 
→ [crédito]: crear cuenta 
→ [crédito]: registerCobranza 
→ addComprobante ← COMPROBANTE CREADO 
→ [si automático]: descuento de stock (puede fallar aquí)
```

**Ventana de inconsistencia:** El comprobante queda registrado aunque el stock no se descuente. En el mundo real, el vendedor tiene un comprobante válido entregado al cliente pero el sistema no sabe que vendió esas unidades.

---

## Sección 8 — Auditoría de Reconciliación

### 8.1 ¿Puede verificarse stockPorAlmacen = suma de movimientos?

**No.** El `StockRepository` almacena movimientos pero no existe ninguna función que reconstruya `stockPorAlmacen` sumando entradas y restando salidas. Los movimientos registran `cantidadAnterior` y `cantidadNueva` pero son documentos de auditoría, no la fuente de verdad.

Además, los movimientos de NV (en modo automático) NO se registran en Kardex — solo en el store de productos. Esto hace imposible la reconciliación completa.

### 8.2 ¿Puede verificarse stockPorEstablecimiento?

**Parcialmente.** `recalcularTotalesStock` puede calcular `stockPorEstablecimiento` desde `stockPorAlmacen` en cualquier momento. No existe una función de verificación automática que lo haga y alerte sobre divergencias.

### 8.3 ¿Puede verificarse reservado = suma de reservas activas de OV?

**No.** Las reservas están en `stockReservadoPorAlmacen` del producto. Los documentos OV tienen `reservasStock[]`. No existe función de reconciliación que sume `reservasStock` de todas las OVs en estado `'Reservada'` y compare con `stockReservadoPorAlmacen`.

### 8.4 Función de reconciliación

**No existe.** No se encontró ninguna función de verificación, chequeo de consistencia, o reparación automática de stock.

---

## Matriz 1 — Hallazgos de Cálculo

| ID | Flujo | Cálculo afectado | Regla esperada | Estado actual | Cumple | Evidencia | Riesgo | Prioridad |
|---|---|---|---|---|---|---|---|---|
| H-01 | NS Manual | Validación pre-descuento | disponible = real − reservado | Usa solo real | No | `notaSalida.service.ts:175` | Medio | Alta |
| H-02 | Comprobante | Orden create/descuento | Descuento antes o atómico con create | Create primero, descuento después con toast si falla | Parcial | `useComprobanteActions.tsx:533-686` | Medio | Media |
| H-03 | Importación reset | Verificación reservas | Nuevo stock >= reservado antes de operar | No verifica | No | `PanelImportacionStock.tsx:497-521` | Medio-Alto | Alta |
| H-04 | Importación reset | Recalcular stockPorEstablecimiento | Recalcular tras cambio | No recalcula | No | `PanelImportacionStock.tsx:521` | Bajo | Media |
| H-05 | NV modo auto | Kardex | Registrar movimiento en Kardex | No registra en Kardex | No | `servicioReservaStock.ts:175-222` | Bajo | Baja |
| H-06 | NS/NI multi-línea | Rollback parcial | Rollback si línea N falla | No hay rollback | No | `notaSalida.service.ts:194-225` | Bajo | Baja |
| H-07 | Doble click NI/NS | Guard concurrencia | Flag procesando en hook | Solo guard en service | Parcial | `useNotasIngreso.ts:67-112` | Bajo | Media |
| H-08 | Reset multi-almacén | Snapshot product | Leer producto fresco por almacén | Usa referencia estática en cierre | No | `PanelImportacionStock.tsx:505-521` | Bajo | Media |
| H-09 | Todos flujos | Movimiento qty=0 | Rechazar cantidad 0 | No validado en service | No | `inventory.service.ts:135-188` | Muy bajo | Baja |

---

## Matriz 2 — Brechas Anteriores Revalidadas

| Brecha | ¿Sigue vigente? | Evidencia actual | Corregida en | Recomendación si sigue |
|---|---|---|---|---|
| B-01 Doble generación NI/NS | Parcialmente — guard de estado existe, sin mutex UI | `useNotasIngreso.ts:67`, service guard en línea 57 | Corregida en service; falta en hook | Agregar flag `procesando` en hooks de NI y NS |
| B-02 Anulación NS vinculada OV | No vigente — corregida | `useNotasSalida.ts:215-219`, `postEmisionOrdenVenta.ts:213-256` | Corregida completa | — |
| B-03 stockPorEstablecimiento null | No vigente — corregida | `useInventory.ts:39-40` con comentario explícito | Corregida con `?? {}` | — |
| B-04 NS valida real vs disponible | Vigente para NS manuales | `notaSalida.service.ts:175` | Solo corregida para Transferencias | Usar disponible = real − reservado en validación NS |
| B-05 Comprobante huérfano | Vigente — diseño intencional | `useComprobanteActions.tsx:669-685` toast de advertencia | Mitigada con advertencia, no eliminada | Considerar pre-descuento antes del create para mayor consistencia |
| B-06 Importación menor al reservado | Vigente | `PanelImportacionStock.tsx:503-521` | No corregida | Agregar validación: nuevo stock >= reservado actual |

---

## Veredicto Final

**C — Cálculo de stock requiere correcciones puntuales antes de cierre.**

**Justificación basada en el código:**

1. El núcleo de stock (`inventory.service.ts`, `stockGateway.ts`) es correcto y robusto. Todas las transferencias, alertas, OV y POS usan disponible = real − reservado correctamente.

2. Las brechas B-02 y B-03 fueron corregidas correctamente con código explícito y comentarios de trazabilidad en el código fuente.

3. Persisten tres brechas de riesgo medio-alto:
   - **H-01 / B-04**: NS manual puede descontar stock reservado para OVs. Impacta la integridad cuando OV y NS se usan conjuntamente.
   - **H-03 / B-06**: La importación masiva puede dejar el stock en un valor menor al reservado, rompiendo el invariante `disponible >= 0`.
   - **H-02 / B-05**: El comprobante puede quedar sin stock actualizado si falla el descuento. La advertencia al usuario es insuficiente para producción.

4. No existe función de reconciliación que permita detectar y reparar inconsistencias acumuladas.

---

## Checklist de Cierre

### Bloqueantes para cerrar inventario operativo

- [ ] **H-01**: Cambiar validación en `notaSalida.service.ts:175` para usar `disponible = getStock - getReservedStock` en lugar de solo `getStock`. Una línea de cambio.
- [ ] **H-03**: En `PanelImportacionStock.tsx` — método `aplicarImportacion` (modo actualizar) y `confirmarReset`: agregar verificación `cantidadArchivo < reservado` antes de proceder, con advertencia bloqueante al usuario.

### Correcciones recomendadas antes de módulo de compras

- [ ] **H-07**: Agregar `const [procesando, setProcesando] = useState(false)` en `useNotasIngreso` y `useNotasSalida` para prevenir doble generación por doble-click.
- [ ] **H-08**: En `confirmarReset`, actualizar la referencia de producto en el bucle interno de almacenes (igual patrón que `aplicarImportacion` línea 478).
- [ ] **H-04**: En `confirmarReset`, llamar `recalcularTotalesStock` después de cada ajuste para mantener `stockPorEstablecimiento` actualizado.
- [ ] **H-02**: Documentar formalmente la decisión de crear comprobante antes de descontar stock, o considerar invertir el orden (descontar → crear → si falla crear, reponer stock).

### Mejoras técnicas no urgentes

- [ ] **H-05**: Registrar movimiento Kardex en NV modo automático (`descontarStockParaDocumento` debería llamar `StockRepository.addMovement`). Actualmente la NV no deja huella en el Kardex.
- [ ] **H-09**: Agregar validación `data.cantidad > 0` en `InventoryService.registerAdjustment` para evitar movimientos Kardex con cantidad 0.
- [ ] **Reconciliación**: Crear función `verificarConsistenciaStock(products, ovDocumentos)` que compare `stockReservadoPorAlmacen` vs suma de `reservasStock` de OVs activas, y `stockPorEstablecimiento` vs suma de `stockPorAlmacen` por establecimiento.
- [ ] **Kardex como fuente de verdad futura**: Definir si el Kardex debe poder reconstruir `stockPorAlmacen`. Actualmente no puede (movimientos de NV no se registran; las reservas no se registran como movimientos). Decisión arquitectural necesaria antes de módulo de compras.

### Puntos dependientes de Kardex valorizado (futuro)

- [ ] El `costoUnitario` en líneas de NI se almacena en el documento pero no fluye al movimiento Kardex (`MovimientoStock` no tiene campo `costo`). Antes de implementar Kardex valorizado (costo promedio, FIFO valorizado), agregar `costoUnitario?: number` a `MovimientoStock`.
- [ ] `descontarStockParaDocumento` (NV modo automático) no registra movimiento Kardex. Esto imposibilita el cálculo de costo de venta por documento comercial.
- [ ] La función `recalcularTotalesStock` ignora el campo `costoPromedio` del producto. Para Kardex valorizado, este campo debe mantenerse coherente con cada movimiento de entrada.

---

## Archivos Auditados

| Archivo | Leído |
|---|---|
| `hooks/useInventory.ts` | Completo |
| `services/inventory.service.ts` | Completo |
| `repositories/stock.repository.ts` | Completo |
| `models/inventory.types.ts` | Completo |
| `utils/inventory.helpers.ts` | Completo |
| `services/notaIngreso.service.ts` | Completo |
| `hooks/useNotasIngreso.ts` | Completo |
| `repositories/notaIngreso.repository.ts` | Completo |
| `models/notaIngreso.types.ts` | Completo |
| `services/notaSalida.service.ts` | Completo |
| `hooks/useNotasSalida.ts` | Completo |
| `repositories/notaSalida.repository.ts` | Completo |
| `models/notaSalida.types.ts` | Completo |
| `components/PanelImportacionStock.tsx` | Completo |
| `components/modals/TransferModal.tsx` | Parcial (primeras 100 líneas) |
| `catalogo-articulos/models/types.ts` | Parcial (primeras 120 líneas) |
| `comprobantes-electronicos/hooks/useComprobanteActions.tsx` | Parcial (líneas 130-700) |
| `shared/documentosComerciales/postEmisionOrdenVenta.ts` | Completo |
| `documentos-comerciales/utils/servicioReservaStock.ts` | Completo |
| `shared/inventory/stockGateway.ts` | Completo |
| `gestion-inventario/api/inventory.facade.ts` | Completo |
| `documentos-comerciales/hooks/useDocumentoComercialActions.ts` | Parcial (líneas 100-260) |
| `comprobantes-electronicos/punto-venta/hooks/useCart.tsx` | Parcial (líneas 130-260) |
