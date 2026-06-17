# Auditoría: Unidades, Presentaciones, Kardex y Stock
**Fecha:** 2026-06-17  
**Rama auditada:** `inventarioMejoras2`  
**Alcance:** Solo lectura. Sin modificaciones de código.  
**Método:** Seis agentes de exploración paralelos + lectura directa de archivos clave.

---

## 1. Resumen ejecutivo

El sistema tiene una utilidad central de conversión (`unitConversion.ts`) bien diseñada, tipos claros de presentaciones comerciales y un servicio de inventario (`InventoryService`) que opera correctamente sobre unidad mínima. La infraestructura está preparada para manejar conversiones correctamente.

Sin embargo, **dos flujos críticos —Orden de Venta (reserva) y Nota de Venta (descuento automático)— no aplican la conversión** antes de afectar stock, reservando y descontando en la unidad visual del usuario en lugar de la unidad mínima. Además, el Kardex no guarda la unidad del movimiento, lo que limita su trazabilidad auditora.

Los flujos de Factura/Boleta y POS sí aplican conversión correctamente.

---

## 2. Veredicto general

| Área | Estado |
|---|---|
| Infraestructura de conversión | ✅ Existe y está bien diseñada |
| Factura / Boleta — descuento stock | ✅ Convierte correctamente |
| POS — descuento stock | ✅ Convierte correctamente |
| Nota de Ingreso — ingreso stock | ✅ Opera en unidad mínima (NI no soporta presentaciones en UI) |
| Nota de Salida — descuento stock | ✅ Opera en unidad mínima (NS no soporta presentaciones en UI) |
| Orden de Venta — reserva stock | ❌ **No convierte. Usa `item.quantity` directo** |
| Nota de Venta — descuento automático | ❌ **No convierte. Usa `item.quantity` directo** |
| Kardex — campo `unidad` | ⚠️ No existe campo de unidad en el movimiento |
| Transferencias | ⚠️ No soporta presentaciones en UI (opera en unidad mínima por defecto) |
| Ajustes de stock | ⚠️ No soporta presentaciones en UI (manual) |
| Importación Excel | ⚠️ Asume unidad mínima, sin conversión |
| Validación stock OV | ❌ Compara disponible (unidad mínima) vs `item.quantity` (unidad visual) |

---

## 3. Modelo funcional correcto

```
Producto:
- unidad = unidad mínima = base de inventario
- unidadesMedidaAdicionales[] = presentaciones comerciales opcionales
- cada presentación tiene factorConversion (1 presentación = N unidades mínimas)

Documento:
- guarda cantidad visual (item.quantity) en la unidad que el usuario ve
- antes de afectar inventario: cantidadInventario = item.quantity × factorConversion

Stock:
- se guarda siempre en unidad mínima

Kardex:
- registra cantidad en unidad mínima
- idealmente guarda también referencia de unidad comercial para trazabilidad

Reservas:
- se guardan en unidad mínima

Alertas:
- se calculan comparando con stock en unidad mínima

Importación:
- debe indicar claramente que las cantidades deben estar en unidad mínima
```

---

## 4. Modelo actual encontrado en el código

### Lo que funciona correctamente

- `unitConversion.ts` centraliza toda la lógica de conversión.
- `stockGateway.ts` envuelve la conversión con lógica FIFO y allocations.
- Factura/Boleta y POS usan `calculateRequiredUnidadMinima()` antes de `allocateSaleAcrossalmacenes()`.
- NI y NS no exponen selector de presentaciones en UI, por lo que sus `linea.cantidad` siempre están en unidad mínima.
- `stockMinimoPorAlmacen` y `stockMaximoPorAlmacen` se guardan y comparan en unidad mínima.

### Lo que está roto

- `servicioReservaStock.ts:reservarStockOrden()` pasa `item.quantity` directo sin conversión.
- `servicioReservaStock.ts:descontarStockParaDocumento()` pasa `item.quantity` directo sin conversión.
- `servicioReservaStock.ts:validarStockParaOrden()` compara `totalAvailable` (unidad mínima) vs `item.quantity` (unidad visual).
- `MovimientoStock` no tiene campo `unidad` — el Kardex no sabe en qué unidad se registró el movimiento.

---

## 5. Archivos revisados

| Archivo | Ruta | Rol |
|---|---|---|
| `unitConversion.ts` | `shared/inventory/` | Utilidad central de conversión |
| `stockGateway.ts` | `shared/inventory/` | FIFO, allocations, disponibilidad por unidad |
| `inventory.service.ts` | `gestion-inventario/services/` | `registerAdjustment`, `registerTransfer` |
| `stock.repository.ts` | `gestion-inventario/repositories/` | Persistencia Kardex en localStorage |
| `inventory.types.ts` | `gestion-inventario/models/` | `MovimientoStock`, `MovimientoTipo`, `MovimientoMotivo` |
| `notaIngreso.service.ts` | `gestion-inventario/services/` | `generarNIEnInventario` |
| `notaIngreso.types.ts` | `gestion-inventario/models/` | `LineaNotaIngreso`, `NotaIngreso` |
| `notaSalida.service.ts` | `gestion-inventario/services/` | `generarNSEnInventario` |
| `notaSalida.types.ts` | `gestion-inventario/models/` | `LineaNotaSalida`, `NotaSalida` |
| `servicioReservaStock.ts` | `documentos-comerciales/utils/` | OV: reserva; NV: descuento automático |
| `useDocumentoComercialActions.ts` | `documentos-comerciales/hooks/` | Acciones NV/OV |
| `useComprobanteActions.tsx` | `comprobantes-electronicos/hooks/` | Acciones Factura/Boleta/POS |
| `useCart.tsx` | `punto-venta/hooks/` | Carrito POS |
| `convertirOVaComprobante.ts` | `documentos-comerciales/utils/` | Conversión OV → Comprobante |
| `FormularioDocumentoComercial.tsx` | `documentos-comerciales/components/` | Formulario OV/NV |
| `ProductsSection.tsx` | `comprobantes-electronicos/shared/form-core/` | Selector de productos con presentaciones |
| `types.ts` (catalogo-articulos) | `catalogo-articulos/models/` | `Product`, `AdditionalUnitMeasure` |
| `documentoComercial.types.ts` | `documentos-comerciales/models/` | `CartItem` (re-export de comprobante.types) |
| `useProductForm.ts` | `catalogo-articulos/hooks/` | Gestión form producto |
| `useInventarioDisponibilidad.ts` | `gestion-inventario/hooks/` | Vista Stock Actual, cálculo alertas |
| `PanelImportacionStock.tsx` | `gestion-inventario/components/` | Importación Excel |
| `AdjustmentModal.tsx` | `gestion-inventario/components/modals/` | Ajuste manual de stock |
| `TransferModal.tsx` | `gestion-inventario/components/modals/` | Modal de transferencias |

---

## 6. Campos del producto relacionados con unidad mínima

**Archivo:** `apps/senciyo/src/pages/Private/features/catalogo-articulos/models/types.ts`

| Campo | Tipo | Significado |
|---|---|---|
| `unidad` | `string` | Código SUNAT de la unidad mínima (ej. `'NIU'`, `'KGM'`, `'BX'`) |
| `unitSymbol` | `string?` | Símbolo comercial de la unidad mínima (snapshot) |
| `unitName` | `string?` | Nombre SUNAT de la unidad mínima (snapshot) |

**Función de acceso:** `resolveUnidadMinima(product)` en `unitConversion.ts` retorna `product.unidad`.

**Riesgo:** No existe validación que bloquee cambiar `unidad` si ya hay stock o movimientos Kardex. Cambiar la unidad mínima post-creación corrompe todos los históricos.

---

## 7. Campos de presentaciones comerciales

**Archivo:** `catalogo-articulos/models/types.ts` — interface `AdditionalUnitMeasure`

| Campo | Tipo | Significado |
|---|---|---|
| `id` | `string` | ID único de la presentación (ej. `'pres-abc123'`) |
| `nombre` | `string` | Nombre visible (ej. `'Caja x 12'`) |
| `unidadCodigo` | `string` | Código SUNAT de la unidad de la presentación (ej. `'BX'`) |
| `factorConversion` | `number` | Cuántas unidades mínimas contiene 1 presentación |
| `unidadSymbol` | `string?` | Snapshot del símbolo SUNAT |
| `unidadName` | `string?` | Snapshot del nombre SUNAT |

**Código compuesto en UI:** `"BX__pres-abc123"` — combina código SUNAT + `id` para lookup exacto.

**Validaciones aplicadas en `useProductForm.ts`:**
- `factorConversion > 0` (bloqueante)
- `nombre` no vacío (bloqueante)
- `unidadCodigo` seleccionado (bloqueante)
- Factor = 1: advertencia no bloqueante
- Factor < 1: advertencia no bloqueante (fracción de unidad base)
- Presentaciones duplicadas (mismo nombre + unidad + factor): bloqueante

**Riesgo:** `factorConversion` se inicializa a `0` al agregar una presentación nueva. Si el usuario guarda sin editar el campo, el factor quedará en 0 y la conversión retornará 1 (fallback defensivo).

---

## 8. Utilidades de conversión encontradas

### Archivo central: `apps/senciyo/src/shared/inventory/unitConversion.ts`

| Función | Firma | Descripción |
|---|---|---|
| `resolveUnidadMinima(product)` | `→ string` | Retorna `product.unidad` |
| `getFactorToUnidadMinima(product, unitCode)` | `→ number` | Factor de conversión: 1 si es unidad mínima, `factorConversion` si es presentación |
| `convertToUnidadMinima({ product, quantity, unitCode })` | `→ number` | `quantity × factor` |
| `convertFromUnidadMinima({ product, quantity, unitCode })` | `→ number` | `quantity / factor` (para display) |
| `describeUnitConversion(product, unitCode)` | `→ UnitConversionDescriptor` | Descriptor con unidadMinima, unidadSeleccionada, factor |
| `resolveSunatUnitCode(product, unitCode)` | `→ string` | Código SUNAT real para XML/PDF |
| `normalizeUnitCode(value)` | `→ string?` | Normaliza a mayúsculas + trim |
| `ensureUnitCode(requested, fallback)` | `→ string` | Con fallback seguro |

### Archivo wrapper: `apps/senciyo/src/shared/inventory/stockGateway.ts`

| Función | Descripción |
|---|---|
| `calculateRequiredUnidadMinima({ product, quantity, unitCode })` | Delega a `convertToUnidadMinima` |
| `summarizeProductStock({ product, almacenes, EstablecimientoId })` | Stock total real/reservado/disponible en unidad mínima |
| `getAvailableStockForUnit({ product, almacenes, EstablecimientoId, unitCode })` | Disponible convertido a la unidad solicitada |
| `allocateSaleAcrossalmacenes({ product, almacenesOrdered, qtyUnidadMinima, respectReservations })` | FIFO across almacenes. El parámetro `qtyUnidadMinima` **exige** recibir cantidad ya convertida |
| `resolvealmacenesForSaleFIFO(...)` | Ordena almacenes por prioridad de salida |
| `computeAvailable(stock, reserved)` | `max(0, stock - reserved)` |

**Módulos que importan directamente `unitConversion.ts`:**
- `stockGateway.ts`
- `useCart.tsx` (POS)
- `useInventarioDisponibilidad.ts`
- `comprobantePricing.ts`

**Módulos que usan conversión vía `stockGateway.ts`:**
- `useComprobanteActions.tsx` (Factura/Boleta/POS)
- `useCart.tsx` (POS)
- `servicioReservaStock.ts` (OV/NV) — **pero sin llamar a `calculateRequiredUnidadMinima`**

---

## 9. Flujos que sí convierten correctamente

### Factura / Boleta (`useComprobanteActions.tsx` líneas 316–320 y 582–588)

```typescript
const quantityInUnidadMinima = catalogProduct
  ? calculateRequiredUnidadMinima({
      product: catalogProduct,
      quantity: item.quantity,
      unitCode: item.presentacionId || item.unidadMedida || item.unit,
    })
  : Number(item.quantity);

const allocations = allocateSaleAcrossalmacenes({
  product: catalogProduct,
  almacenesOrdered,
  qtyUnidadMinima: quantityInUnidadMinima,  // ← convertido
});
```

Tanto la **pre-validación** como el **descuento efectivo** aplican conversión.

### POS (`useComprobanteActions.tsx` — mismo código path que Factura/Boleta)

El POS genera un comprobante y sigue el mismo flujo. Convierte correctamente.

### Nota de Ingreso (`notaIngreso.service.ts` línea 94)

```typescript
cantidad: linea.cantidad,  // ← correcto porque NI no expone presentaciones
```

El formulario de NI asigna `unidad: product.unidad ?? 'NIU'` — siempre unidad mínima. No hay selector de presentación. `linea.cantidad` es siempre en unidad mínima.

### Nota de Salida (`notaSalida.service.ts`, usa `allocateSaleAcrossalmacenes`)

El formulario de NS asigna unidad desde `product.unidad`. No hay selector de presentación. `linea.cantidad` es siempre en unidad mínima.

Cuando NS se genera desde OV o NV, recibe `LineaNotaSalida[]` que deberían venir convertidas. El riesgo aquí es indirecto: si la OV reservó mal (sin conversión), la NS generada a partir de ella heredará cantidades incorrectas.

---

## 10. Flujos que NO convierten (brechas confirmadas)

### Orden de Venta — Reserva (`servicioReservaStock.ts:reservarStockOrden`, línea 137–142)

```typescript
const allocations = allocateSaleAcrossalmacenes({
  product: producto,
  almacenesOrdered,
  qtyUnidadMinima: item.quantity,  // ❌ quantity en unidad visual, no mínima
  respectReservations: true,
});
```

El formulario de OV usa el mismo `ProductsSection` de comprobantes, que sí permite seleccionar presentaciones. Si el usuario elige "2 Cajas x 12", `item.quantity = 2` y `item.presentacionId = "BX__pres-xxx"`. Pero `reservarStockOrden` pasa `item.quantity = 2` directamente. **Se reservan 2 unidades en lugar de 24.**

### Orden de Venta — Validación previa (`servicioReservaStock.ts:validarStockParaOrden`, línea 99)

```typescript
if (resumen.totalAvailable < item.quantity) {
```

`resumen.totalAvailable` está en unidad mínima (ej. 24 unidades). `item.quantity` está en unidad visual (ej. 3 cajas). La comparación es `24 < 3 = false` → **valida cuando no debería** (se necesitan 36 unidades pero solo hay 24).

### Nota de Venta — Descuento automático (`servicioReservaStock.ts:descontarStockParaDocumento`, línea 192–241)

```typescript
const allocations = allocateSaleAcrossalmacenes({
  product: producto,
  almacenesOrdered,
  qtyUnidadMinima: item.quantity,  // ❌ sin conversión
  respectReservations: true,
});

InventoryService.registerAdjustment(..., { cantidad: alloc.qtyUnidadMinima, ... });
```

**Se descuentan 2 unidades en lugar de 24.** El Kardex registra `cantidad: 2` cuando debería ser `24`.

---

## 11. Flujos con riesgo (sin conversión pero actualmente seguros por UI)

### Transferencias (`inventory.service.ts:registerTransfer`, línea 222)

El `TransferModal.tsx` no expone selector de presentaciones. El usuario ingresa la cantidad directamente. No hay conversión, pero tampoco hay riesgo inmediato porque la UI asume unidad mínima. **Riesgo futuro si se agrega selector de presentaciones sin agregar conversión.**

### Ajustes de stock (`AdjustmentModal.tsx`)

Sin selector de presentaciones. El usuario debe calcular manualmente la conversión. Documentado implícitamente por contexto, pero no hay aviso en la UI. **Riesgo de usabilidad.**

### Importación Excel (`PanelImportacionStock.tsx`)

No indica en la plantilla que las cantidades deben estar en unidad mínima. No hay columna de unidad. Asume correctamente unidad mínima, pero el usuario podría ingresar presentaciones por error. **Riesgo de usabilidad + datos incorrectos por error humano.**

---

## 12. Impacto sobre stock real

- NI y NS afectan `stockPorAlmacen` correctamente (unidad mínima).
- Factura, Boleta y POS afectan `stockPorAlmacen` correctamente (con conversión).
- **NV automática afecta `stockPorAlmacen` con la cantidad visual, no la convertida.** Si hay presentaciones, el stock real quedará sobredimensionado (solo bajó 2 en lugar de 24).
- Transferencias, ajustes e importación afectan `stockPorAlmacen` directamente, asumiendo unidad mínima.

---

## 13. Impacto sobre stock reservado

- `stockReservadoPorAlmacen` solo es modificado por: OV (reserva) y OV (liberación al anular/convertir).
- **Si OV reservó sin conversión, el reservado queda en unidad visual (ej. 2 en lugar de 24).**
- `stockDisponible = real - reservado`. Si el real es 24 y el reservado es 2 (debería ser 24), el disponible aparece como 22 en lugar de 0. Esto permite vender stock que en realidad está comprometido.

---

## 14. Impacto sobre stock disponible

- `computeAvailable(stock, reserved) = max(0, stock - reserved)`
- Directamente afectado por el error de reserva de OV.
- El disponible visible en Stock Actual será mayor al real cuando hay OVs con presentaciones activas.

---

## 15. Impacto sobre Kardex

- `MovimientoStock` no tiene campo `unidad`. El Kardex registra solo el número.
- Con NV automática y presentaciones: el Kardex muestra `cantidad: 2` cuando la realidad económica es `24`. El Kardex **no representa la realidad**.
- Con Factura/Boleta/POS: el Kardex registra la cantidad convertida. Es correcto.
- Con NI/NS: el Kardex registra `linea.cantidad` que siempre está en unidad mínima. Es correcto.
- **La ausencia del campo `unidad` en `MovimientoStock` impide toda trazabilidad auditora de unidades.** No se puede reconstruir si un movimiento de `12` fue "12 unidades" o "1 docena de 12."

---

## 16. Impacto sobre Nota de Ingreso

- NI no soporta presentaciones en su formulario.
- El formulario asigna `unidad: product.unidad` (unidad mínima) en cada línea.
- `generarNIEnInventario` pasa `linea.cantidad` directo → correcto porque siempre es unidad mínima.
- **NI opera correctamente.** Sin brecha funcional.
- Riesgo residual: NI tiene campos `unidad` y `unidadCodigo` en `LineaNotaIngreso` pero NO `factorConversion`. Si en el futuro se agrega selector de presentaciones sin agregar conversión, el bug de OV/NV se replicaría.

---

## 17. Impacto sobre Nota de Salida

- NS no soporta presentaciones en su formulario.
- El formulario asigna `unidad: product.unidad` en cada línea.
- NS usa `allocateSaleAcrossalmacenes` con `qtyUnidadMinima: linea.cantidad` → correcto por ser unidad mínima.
- Cuando NS es generada desde OV (modo `'nota_salida'`), las líneas son `LineaNotaSalida[]` construidas desde los items de la OV. Si la OV tenía presentaciones y no convirtió, las `LineaNotaSalida` traerán cantidades en unidad visual → NS descontará mal.
- **NS opera correctamente cuando es manual. Hereda el error de OV cuando se genera desde una OV con presentaciones.**

---

## 18. Impacto sobre Nota de Venta

Tres modos (`stockDescuentoNotaVenta`):

| Modo | Impacto |
|---|---|
| `'sin_control'` | No afecta stock. Sin riesgo. |
| `'nota_salida'` | Genera NS. Si NV tenía presentaciones, las líneas NS heredan cantidades sin convertir. |
| `'automatico'` | **Descuenta stock sin conversión.** Registra Kardex con cantidad visual. Crítico. |

---

## 19. Impacto sobre Orden de Venta

- **Validación incorrecta:** Permite crear OV con más unidades de las disponibles cuando el usuario usa presentaciones.
- **Reserva incorrecta:** Reserva en unidad visual. Si user vende 2 cajas × 12, reserva 2 en lugar de 24.
- **Disponible inflado:** El stock disponible aparece mayor al real para otros documentos.
- Al anular o convertir la OV, la liberación del reservado también usará la cantidad incorrecta (2 en lugar de 24) → el reservado queda en valores negativos o incorrectos.

---

## 20. Impacto sobre Comprobantes / POS / Guía

| Documento | Estado | Nota |
|---|---|---|
| Factura | ✅ Correcto | `calculateRequiredUnidadMinima` aplicado |
| Boleta | ✅ Correcto | Mismo código path que Factura |
| POS | ✅ Correcto | Mismo `useComprobanteActions` |
| Guía de Remisión | ℹ️ Metadata | No genera movimiento de stock propio. El stock se descuenta por el comprobante o NS vinculada. |

---

## 21. Impacto sobre Transferencias

- `inventory.service.ts:registerTransfer` usa `data.cantidad` directo.
- El `TransferModal.tsx` no tiene selector de presentaciones → usuario ingresa en unidad mínima.
- Sin riesgo inmediato. Riesgo futuro si se agrega selector de presentaciones.
- Transferencias respetan `stockReservadoPorAlmacen` (verifica disponible = real - reservado antes de transferir).

---

## 22. Impacto sobre Importación de stock

- `PanelImportacionStock.tsx` no aplica conversión.
- Plantilla no especifica que las cantidades deben ser en unidad mínima.
- Modo "Actualizar stock final": establece el stock exacto al número del Excel.
- Modo "Sumar ingreso": suma el número del Excel al stock actual.
- Bloquea correctamente si el stock final quedaría por debajo del reservado (protección H-03).
- **Sin riesgo técnico** — el sistema operará según los números que el usuario ingrese. **Riesgo de usabilidad:** si el usuario ingresa cajas en lugar de unidades, el stock quedará erróneo.

---

## 23. Casos de prueba recomendados

### Caso 1 — Unidad mínima = unidad (sin presentaciones)
```
Producto: CELULAR, unidad mínima: Unidad
Stock inicial: 100
NV automática: 2 unidades
Esperado: stock final 98, Kardex salida 2
Estado: ✅ Funciona (no hay presentaciones, cantidad = 2 unidades mínimas)
```

### Caso 2 — NV con Caja x 12 (brecha crítica)
```
Producto: GASEOSA, unidad mínima: Unidad
Presentación: Caja x 12 (factorConversion: 12)
Stock inicial: 100
NV automática: 2 Cajas (item.quantity = 2, presentacionId = "BX__pres-xxx")
Esperado: stock final 76, Kardex salida 24
REAL: stock final 98, Kardex salida 2 ← ERROR CRÍTICO
```

### Caso 3 — OV con Caja x 12 (brecha crítica)
```
Stock disponible inicial: 24 unidades
OV: 3 cajas (item.quantity = 3, factor 12 = 36 unidades reales)
Esperado: validación falla (36 > 24), OV bloqueada
REAL: validación pasa (24 < 3 = false), OV creada, reserva 3 en lugar de 36 ← ERROR CRÍTICO
```

### Caso 4 — Factura con presentación (flujo correcto)
```
Producto: GASEOSA, unidad mínima: Unidad
Presentación: Caja x 12
Stock inicial: 100
Factura: 2 Cajas
Esperado: stock final 76, Kardex salida 24
REAL: stock final 76, Kardex salida 24 ✅ CORRECTO
```

### Caso 5 — Stock insuficiente con presentación (Factura)
```
Stock disponible: 20 unidades
Factura: 2 cajas x 12 = 24 unidades
Esperado: factura bloqueada por stock insuficiente
REAL: bloqueada correctamente ✅ (pre-check en useComprobanteActions usa conversión)
```

### Caso 6 — Importación en unidad mínima
```
Producto: PAPEL, unidad mínima: Caja
Excel: CODIGO=P001, cantidad=10
Stock inicial: 0
Esperado: stock final 10 cajas
REAL: stock final 10 cajas ✅ (correcto si usuario ingresó en unidad mínima)
```

---

## 24. Brechas críticas

### C-01 — OV reserva en unidad visual (no mínima)
**Archivo:** `servicioReservaStock.ts:reservarStockOrden()` línea 137–142  
**Impacto:** El reservado queda en unidad visual. Disponible inflado. Stock comprometido no protegido.  
**Ejemplo:** OV 2 cajas × 12 → reserva 2 unidades, debería reservar 24.  
**Fix esperado:** `qtyUnidadMinima: calculateRequiredUnidadMinima({ product: producto, quantity: item.quantity, unitCode: item.presentacionId || item.unidadMedida })`

### C-02 — OV valida stock en unidad visual vs. unidad mínima
**Archivo:** `servicioReservaStock.ts:validarStockParaOrden()` línea 99  
**Impacto:** Permite crear OV cuando hay stock insuficiente (falso positivo) o bloquea cuando sí hay stock (falso negativo).  
**Fix esperado:** Convertir `item.quantity` antes de comparar con `resumen.totalAvailable`.

### C-03 — NV automática descuenta en unidad visual (no mínima)
**Archivo:** `servicioReservaStock.ts:descontarStockParaDocumento()` línea 192–241  
**Impacto:** Stock real queda sobredimensionado. Kardex incorrecto.  
**Ejemplo:** NV 2 cajas × 12 → descuenta 2 unidades y registra Kardex con `cantidad: 2`.

---

## 25. Brechas altas

### A-01 — Kardex sin campo `unidad`
**Archivo:** `inventory.types.ts` — interface `MovimientoStock`  
**Impacto:** Imposible auditar si un movimiento fue en unidad mínima o en presentación. No se puede reconstruir la historia real.  
**Recomendación:** Agregar `unidadMinima: string` (unidad del movimiento) y opcionalmente `unidadComercial?: string` y `factorAplicado?: number` para trazabilidad completa.

### A-02 — Cambio de `unidad mínima` del producto no bloqueado
**Archivo:** `useProductForm.ts` — función `initializeFormFromProduct()`  
**Impacto:** Cambiar la unidad mínima de un producto que ya tiene stock o Kardex hace que todos los históricos sean inconsistentes.  
**Recomendación:** Bloquear la edición de `unidad` si el producto tiene movimientos en `StockRepository.getMovements()` o `stockPorAlmacen > 0`.

### A-03 — NS generada desde OV hereda cantidades sin convertir
**Impacto:** Si la OV tiene brechas C-01/C-03, la NS generada descontará con las mismas cantidades incorrectas.

---

## 26. Brechas medias

### M-01 — Importación Excel no indica unidad esperada
**Archivo:** `PanelImportacionStock.tsx`  
**Impacto:** Usuario puede importar en presentaciones por error. Sin validación, el stock quedará erróneo.

### M-02 — Transferencias sin selector de presentaciones
**Archivo:** `TransferModal.tsx`  
**Impacto:** Si un usuario quiere transferir 2 cajas y escribe 2, transfiere 2 unidades mínimas. Sin conversión, sin aviso.

### M-03 — Ajustes sin selector de presentaciones
**Archivo:** `AdjustmentModal.tsx`  
**Impacto:** El usuario debe calcular manualmente el factor. Sin aviso ni ayuda visual.

### M-04 — `factorConversion` inicializado en 0
**Archivo:** `useProductForm.ts` línea 375  
**Impacto:** Si el usuario agrega una presentación y guarda sin editar el factor, `factorConversion = 0`. El fallback defensivo en `getFactorToUnidadMinima` retorna 1 en ese caso. Presentación actúa como si fuera 1:1 con la unidad mínima.

---

## 27. Brechas UX

### UX-01 — UI no explica que stock se muestra en unidad mínima
El Stock Actual muestra una columna "Unidad mínima" pero no hay tooltip ni texto que explique que todos los números (real, reservado, disponible) están en esa unidad.

### UX-02 — Formulario NI/NS no indica que se ingresa en unidad mínima
El campo `unidad` en NI/NS es solo texto informativo. No hay aviso de que la cantidad es en unidad mínima.

### UX-03 — Importación sin indicación de unidad
La plantilla Excel de importación no tiene columna "Unidad" ni instrucción que indique "ingrese en unidad mínima del producto".

### UX-04 — Ajuste sin equivalencia visual
El AdjustmentModal muestra el stock actual pero no la equivalencia en presentaciones. Si el usuario piensa en cajas, no tiene referencia.

### UX-05 — Presentación con factor = 1 no genera error bloqueante
Solo genera una advertencia no bloqueante. Un factor de 1 puede ser intencional (presentación unitaria) o un error de omisión. Podría requerir confirmación explícita.

---

## 28. Recomendación final

El sistema tiene la infraestructura correcta (`unitConversion.ts`, `stockGateway.ts`, `calculateRequiredUnidadMinima`). El problema es que **dos flujos no la usan**: `reservarStockOrden` y `descontarStockParaDocumento`.

La corrección es quirúrgica y de bajo riesgo. Solo requiere agregar la llamada a `calculateRequiredUnidadMinima()` en `servicioReservaStock.ts` antes de pasar la cantidad a `allocateSaleAcrossalmacenes()`.

Factura, Boleta y POS demuestran exactamente el patrón correcto que debe seguirse.

---

## 29. Plan sugerido de corrección por fases

### Fase 1 — Crítico (corregir bugs activos)

**Archivo:** `servicioReservaStock.ts`

**`validarStockParaOrden()` (línea 99):**
```typescript
// ANTES:
if (resumen.totalAvailable < item.quantity) {

// DESPUÉS:
import { calculateRequiredUnidadMinima } from '@/shared/inventory/stockGateway';
const qtyMin = calculateRequiredUnidadMinima({
  product: producto,
  quantity: item.quantity,
  unitCode: (item as { presentacionId?: string }).presentacionId || item.unidadMedida,
});
if (resumen.totalAvailable < qtyMin) {
```

**`reservarStockOrden()` (línea 137–142):**
```typescript
// ANTES:
const allocations = allocateSaleAcrossalmacenes({
  product: producto,
  almacenesOrdered,
  qtyUnidadMinima: item.quantity,

// DESPUÉS:
const qtyMin = calculateRequiredUnidadMinima({
  product: producto,
  quantity: item.quantity,
  unitCode: (item as { presentacionId?: string }).presentacionId || item.unidadMedida,
});
const allocations = allocateSaleAcrossalmacenes({
  product: producto,
  almacenesOrdered,
  qtyUnidadMinima: qtyMin,
```

**`descontarStockParaDocumento()` (línea ~198–210):**
Mismo patrón que `reservarStockOrden`.

### Fase 2 — Alto (trazabilidad Kardex)

Agregar campos a `MovimientoStock`:
```typescript
unidadMinima: string;           // Código SUNAT de la unidad del movimiento
unidadComercial?: string;       // Unidad visual si difiere de mínima
factorAplicado?: number;        // Factor de conversión aplicado (1 si no hubo conversión)
```

Propagar estos campos en `InventoryService.registerAdjustment`.

### Fase 3 — Medio (seguridad del modelo de producto)

Bloquear edición de `unidad` (unidad mínima) del producto si:
- `stockPorAlmacen` contiene valores > 0 para algún almacén.
- `StockRepository.getMovements()` contiene movimientos del producto.

Mostrar advertencia con opción de continuar (override manual) para casos de migración.

### Fase 4 — UX (mejoras de experiencia)

1. Agregar tooltips en columnas de stock: "Cantidades en [unidad mínima del producto]".
2. Agregar nota en formularios NI/NS/Ajustes/Transferencias: "Ingrese cantidades en [unidad mínima]".
3. Mejorar plantilla Excel de importación con columna "Unidad esperada" y nota descriptiva.
4. En `AdjustmentModal`, mostrar equivalencias: si el producto tiene presentaciones, mostrar "10 Cajas = 120 unidades".

---

## Matriz de flujos

| Flujo | Usa unidad mínima | Usa presentaciones | Convierte a unidad mínima | Afecta Kardex correctamente | Riesgo | Recomendación |
|---|:---:|:---:|:---:|:---:|---|---|
| **Producto (creación/edición)** | ✅ | ✅ | N/A | N/A | Alto: cambio de unidad no bloqueado | Bloquear edición si hay stock/Kardex |
| **Nota de Ingreso** | ✅ | ❌ no soporta | N/A | ✅ | Bajo | Agregar nota UX sobre unidad |
| **Nota de Salida (manual)** | ✅ | ❌ no soporta | N/A | ✅ | Bajo | Ídem |
| **Nota de Salida (desde OV/NV)** | ✅ | ⚠️ hereda OV | Depende de OV | ⚠️ depende | Alto: hereda error de OV | Corregir Fase 1 |
| **Orden de Venta (reserva)** | ❌ | ✅ soporta | ❌ **NO** | ❌ Kardex incorrecto | **Crítico** | Fase 1: agregar conversión |
| **Nota de Venta (automático)** | ❌ | ✅ soporta | ❌ **NO** | ❌ Kardex incorrecto | **Crítico** | Fase 1: agregar conversión |
| **Nota de Venta (sin_control)** | N/A | N/A | N/A | N/A | Sin riesgo | — |
| **Factura / Boleta** | ✅ | ✅ soporta | ✅ sí | ✅ | Sin riesgo | — |
| **POS** | ✅ | ✅ soporta | ✅ sí | ✅ | Sin riesgo | — |
| **Guía de Remisión** | N/A | N/A | N/A | N/A | Sin riesgo (es metadata) | Clarificar en docs |
| **Transferencias** | ✅ (por UI) | ❌ no soporta | N/A | ✅ | Medio: riesgo futuro | Agregar selector + conversión al agregarlo |
| **Importación Excel** | ✅ (asumido) | ❌ no soporta | N/A | ✅ | Medio: usabilidad | Agregar nota UX en plantilla |
| **Ajustes de stock** | ✅ (por UI) | ❌ no soporta | N/A | ✅ | Medio: usabilidad | Mostrar equivalencias en modal |
| **Alertas (stock mín/máx)** | ✅ | N/A | N/A | N/A | Sin riesgo | — |

---

*Fin del informe. 2026-06-17.*
