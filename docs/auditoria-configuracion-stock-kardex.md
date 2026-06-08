# Auditoría configuración de stock y Kardex

**Fecha:** 2026-06-07  
**Alcance:** Solo auditoría. Sin cambios de código.  
**Objetivo:** Entender el estado real de la configuración de stock y proponer la arquitectura de configuración correcta.

---

## 1. Resumen ejecutivo

El sistema tiene **una única variable de configuración de stock** llamada `allowNegativeStock`, almacenada en `SalesPreferences`. Su valor por defecto es `false`.

**El nombre del campo es engañoso.** Su función real no es "activar/desactivar el control de stock" ni "activar/desactivar el descuento automático". Es simplemente la respuesta a: **¿puede el stock quedar en negativo?**

| Valor | Comportamiento real |
|---|---|
| `allowNegativeStock = false` | Modo estricto: bloquea comprobante/POS si no hay stock |
| `allowNegativeStock = true` | Modo permisivo: el comprobante se emite aunque quede stock negativo |

En ambos casos, **el stock siempre se descuenta** cuando se emite un comprobante o se procesa en POS. No existe ningún switch "descuento automático on/off".

**Impacto directo en los escenarios de Fase 2 de Nota de Salida:** La propuesta funcional de "comprobante con descuento automático inactivo → generar NS después" no tiene base técnica en el sistema actual. El descuento siempre ocurre al emitir.

**Hallazgos adicionales críticos:**
- No existe un "switch maestro" de control de stock
- No existe módulo de Guía de Remisión
- No existe infraestructura de banners/cintillos persistentes
- Los movimientos Kardex sí tienen `documentoReferencia` pero no `documentoOrigenId` tipado
- `product.requiresStockControl` existe por producto pero no está conectado a configuración global

---

## 2. Configuración actual encontrada

### Tipo `SalesPreferences`

**Archivo:** `configuracion-sistema/contexto/ContextoConfiguracion.tsx` (línea ~65)

```typescript
export type SalesPreferences = {
  allowNegativeStock: boolean;
  pricesIncludeTax: boolean;
};
```

### Valores por defecto

**Archivo:** `ContextoConfiguracion.tsx` (línea ~797)

```typescript
const PREFERENCIAS_VENTAS_PREDETERMINADAS: SalesPreferences = {
  allowNegativeStock: false,    // Por defecto: modo estricto (no permite negativo)
  pricesIncludeTax: true,
};
```

### Persistencia

- **Clave localStorage:** `facturaFacilConfig`
- **Scope:** Tenant-aware — `lsKey('facturaFacilConfig', tenantId)`
- **Función de escritura:** `persistTenantSnapshot()`
- **Función de lectura:** `loadSalesPreferencesFromStorage()`
- **Migración legacy:** Lee del localStorage plano antiguo si no encuentra la versión versionada

### Dónde se lee el campo

| Módulo | Archivo | Uso |
|---|---|---|
| Comprobantes (Factura/Boleta) | `useComprobanteActions.tsx:139` | Lanza error si stock insuficiente y `!allowNegativeStock` |
| POS | `punto-venta/hooks/useCart.tsx:135-139` | `validateStockAvailability()` — bloquea o permite agregar al carrito |
| InventoryFacade | `gestion-inventario/api/inventory.facade.ts:71` | Pasado como opción al movimiento |
| InventoryService | `gestion-inventario/services/inventory.service.ts:52-61` | Parámetro a `updateStock()` |

### Campos que NO existen

Los siguientes campos fueron buscados y **no existen en ningún archivo**:

```
controlStockActivo              ← NO EXISTE
activarControlStock             ← NO EXISTE
stockControl                    ← NO EXISTE
descuentoAutomaticoComprobante  ← NO EXISTE
descontarStockAuto              ← NO EXISTE
usarControlStock                ← NO EXISTE
autoDescuentoStockEnComprobante ← NO EXISTE
```

### UI visual actual

**Componente:** `configuracion-sistema/components/negocio/SeccionPreferenciasVenta.tsx`

- **Título de la tarjeta:** "Control de stock en ventas" (con ícono Package)
- **Texto cuando está activado:** `"Activado: no podrás vender productos agotados."`
- **Texto cuando está desactivado:** `"Desactivado: podrás vender aunque esté agotado."`
- **Ruta de configuración:** `/configuracion/negocio`

---

## 3. Interpretación real de `allowNegativeStock`

### Lo que el nombre sugiere (incorrecto)

> "¿Permite stock negativo?" → implica que es una configuración de permisividad

### Lo que el código hace realmente

El campo es el switch del **modo de validación de stock en ventas**:

```
allowNegativeStock = false  →  modo estricto
   → Si stock < cantidad pedida → lanzar error → bloquear emisión
   → Stock nunca queda negativo

allowNegativeStock = true   →  modo permisivo
   → Si stock < cantidad pedida → emitir igual → stock queda negativo
   → Usar para usuarios que quieren vender primero, ajustar stock después
```

En **ambos modos**, el descuento de stock **siempre ocurre**. No hay modo "no descontar".

### Lo que el texto visual dice (parcialmente correcto)

- "Activado: no podrás vender productos agotados" → correcto para `allowNegativeStock = false`
- "Desactivado: podrás vender aunque esté agotado" → correcto para `allowNegativeStock = true`

Pero el nombre visual "Control de stock en ventas" es ambiguo. Un usuario podría interpretarlo como "activar/desactivar todo el control de inventario", cuando en realidad es solo "¿bloquear ventas sin stock?".

---

## 4. Diferencia entre control de stock y descuento automático

### Mapa conceptual del sistema actual

```
┌─────────────────────────────────────────────────────────────┐
│                    UNA SOLA CONFIGURACIÓN                   │
│                                                             │
│  salesPreferences.allowNegativeStock                        │
│                                                             │
│  false → valida stock, bloquea si insuficiente              │
│  true  → no valida, permite negativo, descuenta igual       │
│                                                             │
│  En ambos casos: el descuento SIEMPRE OCURRE               │
└─────────────────────────────────────────────────────────────┘
```

### Mapa conceptual de la propuesta

```
┌─────────────────────────────────────────────────────────────┐
│           DOS CONFIGURACIONES DISTINTAS (PROPUESTA)         │
│                                                             │
│  [1] Activar control de stock (switch maestro)              │
│      off → stock informativo, ventas sin restricción        │
│      on  → habilita el control formal                       │
│                                                             │
│  [2] Comportamiento por documento (tabla)                   │
│      Factura/Boleta → Automático | Mediante NS              │
│      Nota de Venta  → Automático | Mediante NS              │
│      Guía de Rem.   → Automático | Mediante NS              │
│      (otros fijos)                                          │
└─────────────────────────────────────────────────────────────┘
```

### Qué habría que agregar a `SalesPreferences` (propuesta)

```typescript
// Propuesta futura — NO implementar todavía
export type SalesPreferences = {
  allowNegativeStock: boolean;              // existente, renombrar semánticamente
  pricesIncludeTax: boolean;                // existente
  controlStockActivo: boolean;              // NUEVO: switch maestro
  stockDescuentoFacturaYBoleta: 'automatico' | 'nota_salida';  // NUEVO
  stockDescuentoNotaVenta: 'automatico' | 'nota_salida';       // NUEVO
  stockDescuentoGuiaRemision: 'automatico' | 'nota_salida';    // NUEVO (futuro)
};
```

---

## 5. Regla funcional propuesta

### Switch maestro: `controlStockActivo`

| Estado | Comportamiento |
|---|---|
| `false` (default empresas nuevas) | Stock es informativo. Ventas sin restricción. Sin Kardex forzado. Sin Nota de Salida obligatoria. |
| `true` | Control formal activo. Reglas de descuento por documento aplican. Kardex debe estar alineado. |

### Tabla de comportamiento por documento (cuando control activo)

| Documento | Configurable | Opción 1 | Opción 2 | Regla fija |
|---|---|---|---|---|
| Factura / Boleta | Sí | Automático al emitir | Mediante Nota de Salida | Si automático, exige stock |
| Nota de Venta | Sí | Automático al generar | Mediante Nota de Salida | Si automático, exige stock |
| Guía de Remisión | Sí | Automático al emitir | Mediante Nota de Salida | Si automático, exige stock |
| Orden de Venta | No | — | — | Reserva stock |
| Cotización | No | — | — | No afecta stock |
| Nota de Ingreso | No | — | — | Aumenta stock |
| Nota de Salida | No | — | — | Descuenta stock y exige stock |

### Regla fija de Nota de Salida

```
- Siempre requiere stock suficiente
- Siempre descuenta stock real al generarse
- Siempre genera movimiento Kardex tipo SALIDA
- Nunca permite stock negativo
```

### Regla fija de Nota de Ingreso

```
- Siempre aumenta stock real
- Siempre genera movimiento Kardex tipo ENTRADA
```

### Comportamiento del usuario nuevo

```
Empresa nueva → controlStockActivo = false
→ Stock Actual: muestra cantidades pero son informativas
→ Comprobantes: se emiten sin validar stock
→ NI/NS: si el usuario entra a Control Stock y los usa,
  funcionan normalmente (siempre mueven stock)
→ No hay bloqueos ni exigencias
→ Cintillo en Inventario le avisa que el control está inactivo
```

---

## 6. Estado actual de Comprobantes

### Factura y Boleta

**Función principal:** `createComprobante()` en `useComprobanteActions.tsx`

**Flujo de stock (líneas 491–655):**

```typescript
// 1. Siempre entra al bloque de descuento (excepto notas de crédito)
if (!isNoteCredit) {

  // 2. Calcula allocations usando stock disponible real
  const allocations = allocateSaleAcrossalmacenes({
    product,
    almacenesOrdered,
    qtyUnidadMinima,
    respectReservations: true,   // respeta reservas de OV
  });

  // 3. Verifica si hay suficiente
  const remaining = qty - allocatedTotal;

  // 4a. Si allowNegativeStock = false y falta stock → LANZA ERROR (bloquea)
  if (!allowNegativeStock && remaining > 0) {
    throw new Error('Stock insuficiente...');
  }

  // 4b. Si allowNegativeStock = true y falta stock → agrega al primer almacén (negativo)
  if (allowNegativeStock && remaining > 0) {
    pendingMovements.push({ productId, qtyUnidadMinima: remaining, almacenId: primero });
  }

  // 5. Siempre llama addMovimientoStock() → stock se descuenta
  for (const movement of pendingMovements) {
    addMovimientoStock(productId, 'SALIDA', 'VENTA', qty, obs, numeroComprobante, ...);
  }
}
```

**Conclusiones:**
- ✅ Siempre descuenta stock (no hay modo "no descontar")
- ✅ `allowNegativeStock = false` → valida y bloquea si no hay stock
- ✅ `allowNegativeStock = true` → descuenta aunque quede negativo
- ✅ Genera movimiento Kardex tipo `SALIDA` motivo `VENTA`
- ❌ No existe campo `stockDescontado` en el comprobante
- ❌ No hay forma directa de saber si un comprobante ya generó Kardex sin consultar el repositorio de movimientos
- ❌ No existe switch para desactivar el descuento en comprobantes

---

## 7. Estado actual de POS

**Archivo:** `punto-venta/hooks/useCart.tsx`

**Validación de stock en POS:**

```typescript
const validateStockAvailability = (product, nextQuantity): boolean => {
  if (!product.requiresStockControl) return true;   // por-producto

  const summary = summarizeProductStock({ product, almacenes, EstablecimientoId });
  const required = calculateRequiredUnidadMinima({ product, quantity, unitCode });

  if (required <= summary.totalAvailable) return true;

  if (!allowNegativeStock) {
    alert('⚠️ Stock insuficiente\n\n' + message);
    return false;   // bloquea agregar al carrito
  }
  return true;      // permite agregar aunque sea insuficiente
};
```

**Notas:**
- ✅ POS usa el mismo `allowNegativeStock` que comprobantes
- ✅ POS descuenta stock al generar comprobante (usa el mismo `createComprobante`)
- ✅ Tiene validación a nivel de carrito antes de llegar al servicio
- ⚠️ El campo `product.requiresStockControl` (por producto) puede eximir productos individuales de la validación — esto es independiente del switch global

---

## 8. Estado actual de Nota de Venta

**Archivo:** `Documentos-negociacion/pages/FormularioNotaVenta.tsx`

- ✅ **No descuenta stock** — confirmado. No llama a ninguna función de stock
- ✅ **No reserva stock** — confirmado
- ✅ **No genera Kardex** — confirmado
- ⚠️ Usa `useCart` para la UI del carrito pero no procesa comprobante
- ⚠️ `items` está tipado como `any[]` — tipado débil
- ❌ No tiene `almacenId` por línea de producto
- ❌ No podría soportar "automático" sin agregar campo `almacenId` y servicio de stock
- ❌ No tiene "Más acciones" para generar NS

**Comportamiento esperado para configuración propuesta:**
- Si `stockDescuentoNotaVenta = 'automatico'` → habría que integrar stock discount en NV
- Si `stockDescuentoNotaVenta = 'nota_salida'` → comportamiento actual, sin cambios

---

## 9. Estado actual de Orden de Venta

**Archivos:** `documentos-comerciales/models/documentoComercial.types.ts`, `servicioReservaStock.ts`

### Reserva de stock

```typescript
// OV guarda reservas:
reservasStock?: ReservaStockItem[]
// ReservaStockItem = { sku, nombre, cantidad, almacenId, almacenNombre? }

// El producto actualiza:
product.stockReservadoPorAlmacen[almacenId] += cantidad
```

### Estados relevantes

```
Borrador → Generada → Reservada → Atendida parcial → Atendida total
                                → Vencida
                                → Anulada
```

### Liberación de reserva

- ✅ `liberarReservaOrden()` existe en `servicioReservaStock.ts`
- ✅ Se llama automáticamente cuando OV es anulada
- ❌ No se llama al convertir OV → Comprobante (la liberación ocurre internamente al descontar, no explícitamente)
- ❌ No se llama al generar NS desde OV (flujo no implementado en Fase 1)

### Riesgo de reserva colgada

| Escenario | Riesgo |
|---|---|
| OV anulada | ✅ Resuelto — `liberarReservaOrden` llamado |
| OV vencida | ⚠️ Verificar si libera reserva al pasar a `Vencida` |
| OV → Comprobante | ✅ El comprobante descuenta stock real; la reserva queda técnicamente "absorbida" |
| OV → NS (Fase 2) | ❌ Sin implementar — reserva quedaría colgada si no se llama `liberarReservaOrden` |

---

## 10. Estado actual de Cotización

- ✅ No reserva stock — confirmado
- ✅ No descuenta stock — confirmado
- ✅ No genera Kardex — confirmado
- ✅ No tiene configuración de stock editable
- ✅ Comparte módulo con NV (`Documentos-negociacion`) pero tiene branch propio por `type === 'Cotización'`
- ✅ Alineada con la propuesta: columna "Cotización → No afecta stock"

---

## 11. Estado actual de Nota de Ingreso

**Archivo:** `gestion-inventario/services/notaIngreso.service.ts`

```typescript
// generarNIEnInventario(): SIEMPRE llama registerAdjustment con tipo 'ENTRADA'
const data: StockAdjustmentData = {
  tipo: 'ENTRADA',
  motivo,
  cantidad: linea.cantidad,
  documentoReferencia: numero,
  ...
};
const { product: productoActualizado, movement } = InventoryService.registerAdjustment(
  producto, almacen, data, usuario
);
```

- ✅ Siempre aumenta stock — sin configuración que lo desactive
- ✅ Siempre genera movimiento Kardex
- ✅ Siempre valida que el almacén existe y está activo
- ✅ Comportamiento alineado con la regla propuesta

---

## 12. Estado actual de Nota de Salida

**Archivo:** `gestion-inventario/services/notaSalida.service.ts`

```typescript
// generarNSEnInventario(): validación transaccional primero, luego descuento
// 1. Valida TODAS las líneas antes de mover stock
for (const linea of lineasBienes) {
  const stockActual = InventoryService.getStock(producto, almacen.id);
  if (stockActual < linea.cantidad) throw new Error('Stock insuficiente...');
}

// 2. Solo después de validar todo, descuenta
for (const linea of nota.lineas) {
  const data: StockAdjustmentData = { tipo: 'SALIDA', ... };
  InventoryService.registerAdjustment(producto, almacen, data, usuario);
}
```

- ✅ Siempre valida stock suficiente (transaccional)
- ✅ Nunca permite stock negativo
- ✅ Siempre genera movimiento Kardex tipo `SALIDA`
- ✅ Comportamiento alineado con la regla propuesta
- ❌ No tiene `documentoOrigenId` tipado (solo `documentoOrigen: string` libre)
- ❌ No consume reservas de OV

---

## 13. Estado actual de Guía de Remisión

**Resultado de búsqueda exhaustiva:**

- ❌ **No existe módulo de Guía de Remisión** como documento independiente
- ❌ No hay archivos con "guia", "remision", "remitente", "transportista" como módulo propio
- ⚠️ Existe un campo `waybill` en el modelo de comprobante — es una referencia a guía de remisión externa, no un documento interno generado por el sistema
- ⚠️ `guiaRemision: data.waybill ?? null` en `useComprobanteActions` — solo campo de datos, no flujo de stock

**Implicación para la tabla de configuración:**

La Guía de Remisión puede incluirse como fila en la tabla de configuración propuesta, pero su conexión funcional debe quedar vacía/no implementada hasta que el módulo exista. No requiere columna "configurable" activa.

```typescript
// Fila de tabla propuesta — columna "configurable" = true
// Pero implementación real = null/void hasta que módulo exista
stockDescuentoGuiaRemision: 'automatico' | 'nota_salida' | null;
```

---

## 14. Impacto en Inventario / Kardex

### Fuente de verdad de Stock Actual

**Cálculo:**
```typescript
// Por almacén:
real = product.stockPorAlmacen[almacenId]  // actualizado por registerAdjustment

// Total en pantalla:
disponible = real - stockReservadoPorAlmacen[almacenId]

// Campo total en producto:
product.cantidad = sum(stockPorAlmacen[*])  // recalculado por recalcularTotalesStock()
```

### Estructura de `MovimientoStock`

```typescript
export interface MovimientoStock {
  id: string;
  productoId: string;
  tipo: MovimientoTipo;           // ENTRADA | SALIDA | AJUSTE_* | MERMA | ...
  motivo: MovimientoMotivo;       // VENTA | COMPRA | TRANSFERENCIA_ALMACEN | ...
  cantidad: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  documentoReferencia?: string;   // ✅ número de documento origen (e.g. "F001-00000001")
  fecha: Date;
  almacenId: string;
  EstablecimientoId: string;
  // ... campos de transferencia
}
```

**Campos que EXISTEN:**
- ✅ `documentoReferencia` — almacena el número del documento que generó el movimiento

**Campos que NO EXISTEN:**
- ❌ `documentoOrigenId` — no hay ID tipado del documento origen
- ❌ `comprobanteId`, `notaSalidaId`, `ordenVentaId` — no hay references tipadas por tipo
- ❌ `stockDescontado` en Comprobante — no se registra si un comprobante ya movió stock

### Riesgo de inconsistencia en Kardex

Si se implementa Fase 2 (NS desde comprobante) sin verificar si el comprobante ya descontó:
```
Comprobante emite → descuenta 10 unidades → Kardex: -10
NS generada desde mismo comprobante → descuenta 10 unidades → Kardex: -20 adicionales
Stock final: -20 cuando debería ser -10
```

Para evitarlo, habría que agregar `stockDescontadoViaComprobante: boolean` al modelo de comprobante.

---

## 15. Riesgos de doble descuento

| Escenario | Riesgo | Mecanismo de protección existente |
|---|---|---|
| Comprobante emitido + NS posterior | **CRÍTICO** | Ninguno — comprobante ya descontó, NS descontaría de nuevo |
| POS + NS desde mismo documento | **CRÍTICO** | Ninguno |
| OV → Comprobante + OV → NS separada | **ALTO** | Ninguno — OV no registra qué documento atendió su reserva |
| NV con NS ya generada + nueva NS | **ALTO** | Ninguno — NV no guarda `notaSalidaId` |
| `allowNegativeStock = true` + NS posterior | **ALTO** | NS bloquea si no hay stock, pero comprobante puede haber dejado negativo |
| NS generada dos veces | **Bajo** | ✅ `generarNSEnInventario` lanza error si estado ya es `Generada` |

---

## 16. Riesgos de stock negativo

| Escenario | Riesgo | Protección actual |
|---|---|---|
| Comprobante con `allowNegativeStock = true` | Permitido por diseño | `allowNegativeStock` controla esto |
| POS con `allowNegativeStock = true` | Permitido por diseño | Mismo switch |
| NS manual | **Bloqueado** — ✅ NS siempre valida stock | Validación transaccional en `generarNSEnInventario` |
| NI (no aplica negativo) | No aplica | — |
| Comprobante→NS en Fase 2 | **ALTO** si comprobante dejó stock negativo | NS fallaría por stock insuficiente, bloqueando el flujo |

**Caso edge peligroso:**
```
1. Comprobante con allowNegativeStock=true emite 10 unidades cuando solo hay 3
2. Stock queda en -7
3. Usuario intenta generar NS desde ese comprobante (Fase 2)
4. NS valida y bloquea (stock < 0)
5. Usuario queda sin forma de documentar la salida ya realizada
```

---

## 17. Riesgos de reserva colgada

| Escenario | Riesgo | Estado |
|---|---|---|
| OV anulada | ✅ Resuelto | `liberarReservaOrden` llamado en anulación |
| OV → NS (Fase 2) sin liberar | **CRÍTICO** | No implementado — reserva quedaría activa y stock real ya descontado |
| OV → Comprobante → comprobante anulado | **MEDIO** | Reserva no se restaura al anular comprobante |
| OV con estado `Vencida` | ⚠️ Verificar | No confirmado si libera reserva al vencer |
| Reserva mayor al stock real (por ediciones manuales) | **MEDIO** | `summarizeProductStock` cap reservado en max(real, 0) |

---

## 18. Propuesta de configuración UX

### Estructura propuesta en `SalesPreferences`

```typescript
export type SalesPreferences = {
  // ─── Existente ───────────────────────────────────
  allowNegativeStock: boolean;       // Renombrar a allowNegativeStockInSales para claridad
  pricesIncludeTax: boolean;

  // ─── Nuevo: switch maestro ────────────────────────
  controlStockActivo: boolean;       // default: false para empresas nuevas

  // ─── Nuevo: comportamiento por documento ─────────
  stockDescuentoFacturaYBoleta: 'automatico' | 'nota_salida';   // default: 'automatico'
  stockDescuentoNotaVenta: 'automatico' | 'nota_salida';        // default: 'automatico'
  stockDescuentoGuiaRemision: 'automatico' | 'nota_salida';     // default: 'automatico' (futuro)
};
```

### UX en Configuración → Negocio → Preferencias

```
┌──────────────────────────────────────────────────────────────────┐
│  Control de stock                                                 │
│                                                                   │
│  ○ Activar control de stock                    [toggle: off]      │
│    Si está desactivado, el stock es informativo y las ventas     │
│    no descuentan inventario automáticamente.                     │
│                                                                   │
│  ─────────── Solo visible si control activo ────────────────     │
│                                                                   │
│  Comportamiento de stock por documento                           │
│  ┌──────────────────┬──────────────────────┬──────────────────┐ │
│  │ Documento        │ Opciones              │ Regla            │ │
│  ├──────────────────┼──────────────────────┼──────────────────┤ │
│  │ Factura / Boleta │ ● Automático          │ Exige stock      │ │
│  │                  │ ○ Mediante Nota Sal.  │                  │ │
│  ├──────────────────┼──────────────────────┼──────────────────┤ │
│  │ Nota de Venta    │ ● Automático          │ Exige stock      │ │
│  │                  │ ○ Mediante Nota Sal.  │                  │ │
│  ├──────────────────┼──────────────────────┼──────────────────┤ │
│  │ Guía de Remisión │ ● Automático          │ Exige stock      │ │
│  │ (próximamente)   │ ○ Mediante Nota Sal.  │                  │ │
│  ├──────────────────┼──────────────────────┼──────────────────┤ │
│  │ Orden de Venta   │ (reserva stock)       │ Fijo             │ │
│  │ Cotización       │ (no afecta stock)     │ Fijo             │ │
│  │ Nota de Ingreso  │ (aumenta stock)       │ Fijo             │ │
│  │ Nota de Salida   │ (descuenta stock)     │ Fijo             │ │
│  └──────────────────┴──────────────────────┴──────────────────┘ │
│                                                                   │
│  Modo estricto de stock                                           │
│  ○ Bloquear venta si no hay stock          [toggle: on]           │
│    Si está desactivado, se permite venta aunque haya déficit.    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 19. Propuesta de cintillo en Inventario

### Contexto

No existe infraestructura de banners persistentes. El sistema usa toasts (`useToast`) y `alert()` nativo. Habría que construir el cintillo desde cero.

### Especificación

**Ubicación:** Dentro de `InventoryPage.tsx`, debajo del toolbar/tabs, encima del contenido principal. Sólo visible en tabs que muestran datos de stock (situación, movimientos, alertas).

**Condición de visualización:**
```typescript
// Solo mostrar si control de stock está inactivo
!salesPreferences.controlStockActivo
```

**Contenido:**
```
┌────────────────────────────────────────────────────────────────────┐
│ ⚠️  Control de stock inactivo                                       │
│    El stock registrado es informativo. Tus documentos no           │
│    descuentan inventario hasta que actives el control de stock.    │
│                              [Ocultar por ahora] [Configurar →]    │
└────────────────────────────────────────────────────────────────────┘
```

**Reglas:**
- No tiene cierre permanente (no `localStorage.setItem('cerrado', true)`)
- Sí tiene "Ocultar por ahora" (estado en `useState`, se reinicia al volver al módulo)
- "Configurar →" navega a `/configuracion/negocio`
- Al regresar con `controlStockActivo = true`, el cintillo desaparece

**Patrón de retorno:**

```typescript
// En el botón Configurar del cintillo:
navigate('/configuracion/negocio', {
  state: { returnTo: '/inventario', returnTab: selectedView }
});

// En ConfiguracionNegocio.tsx, al guardar:
const returnTo = location.state?.returnTo;
if (returnTo) navigate(returnTo, { state: { tab: location.state?.returnTab } });
```

**Componente esqueleto sugerido:**

```typescript
// components/CintilloControlStock.tsx
interface Props {
  onOcultar: () => void;
}
const CintilloControlStock: React.FC<Props> = ({ onOcultar }) => {
  const navigate = useNavigate();
  return (
    <div className="mx-6 mt-3 flex items-center justify-between gap-3 px-4 py-2.5
                    bg-amber-50 dark:bg-amber-900/20 border border-amber-200
                    dark:border-amber-700 rounded-lg text-xs text-amber-700
                    dark:text-amber-400">
      <div className="flex items-center gap-2">
        <AlertTriangle size={13} className="flex-shrink-0" />
        <span>
          <strong>Control de stock inactivo.</strong>{' '}
          El stock registrado es informativo. Activa el control para que tus
          documentos descuenten inventario.
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={onOcultar} className="text-amber-500 hover:text-amber-700">
          Ocultar
        </button>
        <button
          onClick={() => navigate('/configuracion/negocio',
            { state: { returnTo: '/inventario' } })}
          className="font-semibold underline"
        >
          Configurar →
        </button>
      </div>
    </div>
  );
};
```

---

## 20. Compatibilidad con empresas existentes

### Situación actual

Empresas existentes tienen en su configuración:
- `allowNegativeStock: false` o `true` (guardado en `facturaFacilConfig`)
- No tienen `controlStockActivo` (campo nuevo, no existe)

### Estrategia de migración

Al leer la configuración, si `controlStockActivo` no existe → **derivar valor por comportamiento actual**:

```typescript
// En loadSalesPreferencesFromStorage() o en initConfig:
if (stored.controlStockActivo === undefined) {
  // Empresa existente: asumimos que tenía control activo (ya estaba usando el sistema)
  // Para empresas que ya usaban allowNegativeStock, el control ya estaba "activo"
  stored.controlStockActivo = true;  // retrocompatible: no romper flujo existente
}

if (stored.stockDescuentoFacturaYBoleta === undefined) {
  // Empresas existentes siempre descuentaron automáticamente
  stored.stockDescuentoFacturaYBoleta = 'automatico';
}
```

### Para empresas nuevas

```typescript
const PREFERENCIAS_VENTAS_PREDETERMINADAS: SalesPreferences = {
  allowNegativeStock: false,
  pricesIncludeTax: true,
  controlStockActivo: false,                        // NUEVO default: inactivo
  stockDescuentoFacturaYBoleta: 'automatico',
  stockDescuentoNotaVenta: 'automatico',
  stockDescuentoGuiaRemision: 'automatico',
};
```

---

## 21. Migración recomendada de configuración

### Plan de migración (4 pasos, sin romper empresas existentes)

**Paso 1 — Ampliar tipo `SalesPreferences`** (solo tipos, no lógica)
```typescript
export type SalesPreferences = {
  allowNegativeStock: boolean;
  pricesIncludeTax: boolean;
  controlStockActivo?: boolean;                       // opcional para retrocompat
  stockDescuentoFacturaYBoleta?: 'automatico' | 'nota_salida';
  stockDescuentoNotaVenta?: 'automatico' | 'nota_salida';
  stockDescuentoGuiaRemision?: 'automatico' | 'nota_salida';
};
```

**Paso 2 — Agregar lógica de migración en load**
- Si `controlStockActivo === undefined` → set `true` (retrocompatible)
- Si `stockDescuentoXxx === undefined` → set `'automatico'` (retrocompatible)

**Paso 3 — Agregar UI en `SeccionPreferenciasVenta.tsx`**
- Sección "Activar control de stock" (visible siempre)
- Tabla de comportamiento por documento (visible solo si `controlStockActivo = true`)

**Paso 4 — Consumir `controlStockActivo` en comprobantes/POS**
- Si `!controlStockActivo` → saltar validación y descuento de stock
- Si `controlStockActivo && stockDescuentoXxx === 'automatico'` → comportamiento actual
- Si `controlStockActivo && stockDescuentoXxx === 'nota_salida'` → no descontar en comprobante

---

## 22. Archivos que probablemente requerirán cambios

| Archivo | Cambio requerido | Complejidad |
|---|---|---|
| `ContextoConfiguracion.tsx` | Ampliar `SalesPreferences`, default, migración, persistencia | Media |
| `SeccionPreferenciasVenta.tsx` | Agregar toggle maestro + tabla de comportamiento por documento | Alta (UI) |
| `useComprobanteActions.tsx` | Respetar `controlStockActivo` y `stockDescuentoFacturaYBoleta` | Alta |
| `punto-venta/hooks/useCart.tsx` | Respetar `controlStockActivo` en validación de carrito | Media |
| `gestion-inventario/pages/InventoryPage.tsx` | Agregar cintillo cuando `!controlStockActivo` | Baja |
| `gestion-inventario/components/` | Crear `CintilloControlStock.tsx` | Baja |
| `configuracion-sistema/paginas/ConfiguracionNegocio.tsx` | Leer y usar `returnTo` state para navegación de retorno | Baja |
| `Documentos-negociacion/` (NV) | Si se decide `stockDescuentoNotaVenta = 'automatico'`, agregar llamada de stock | Alta |
| `gestion-inventario/models/inventory.types.ts` | Agregar `documentoOrigenId` a `MovimientoStock` | Baja |
| `gestion-inventario/models/notaSalida.types.ts` | Agregar `documentoOrigenId`, `documentoOrigenTipo` tipados | Baja |

---

## 23. Archivos que NO deberían tocarse

| Archivo | Razón |
|---|---|
| `gestion-inventario/services/inventory.service.ts` | Motor de stock — estable, no cambiar |
| `gestion-inventario/services/notaIngreso.service.ts` | NI siempre suma stock — correcto por diseño |
| `gestion-inventario/services/notaSalida.service.ts` | NS siempre descuenta con validación — correcto por diseño |
| `documentos-comerciales/services/servicioReservaStock.ts` | Lógica de reservas OV — solo reutilizar |
| `documentos-comerciales/services/convertirOVaComprobante.ts` | Conversión OV→Comprobante — no modificar |
| `configuracion-sistema/modelos/Series.ts` | Ya actualizado, no tocar |
| `configuracion-sistema/utilidades/catalogoSeries.ts` | Ya actualizado, no tocar |
| `gestion-inventario/repositories/stock.repository.ts` | Repositorio de Kardex — estable |

---

## 24. Recomendación por fases

### Fase A: Esta auditoría (completada)

- Documentar configuración actual y propuesta
- Definir campos nuevos de `SalesPreferences`
- Resolver con producto: ¿`controlStockActivo` default `false` para empresas nuevas?

### Fase B: Ampliar modelo de configuración (sin cambiar lógica)

```
1. Agregar campos opcionales a SalesPreferences (solo tipos)
2. Agregar defaults en PREFERENCIAS_VENTAS_PREDETERMINADAS
3. Agregar lógica de migración en loadSalesPreferencesFromStorage
4. Lint + build → 0 errores
```
Sin cambiar comportamiento actual. Empresas existentes: sin impacto.

### Fase C: UI de configuración

```
1. Agregar switch maestro en SeccionPreferenciasVenta.tsx
2. Agregar tabla de comportamiento por documento
3. Agregar "Configurar" en cintillo con returnTo
4. Probar en modo nueva empresa (controlStockActivo = false)
5. Probar en modo empresa existente (controlStockActivo migrado a true)
```

### Fase D: Cintillo informativo en Inventario

```
1. Crear componente CintilloControlStock.tsx
2. Insertar en InventoryPage.tsx condicionalmente
3. Conectar botón "Configurar" con navigate y returnTo
4. Probar que desaparece al activar control
```
Bajo riesgo, alta visibilidad UX.

### Fase E: Alinear Comprobantes con nueva configuración

```
1. En useComprobanteActions:
   - Si !controlStockActivo → saltar bloque de stock
   - Si stockDescuentoFacturaYBoleta = 'nota_salida' → saltar bloque de stock
2. En useCart (POS):
   - Si !controlStockActivo → no validar stock en carrito
3. Probar todos los escenarios: nueva empresa, empresa con control, ambos modos
```
Alta complejidad, alto impacto. Requiere pruebas exhaustivas.

### Fase F: Alinear Nota de Venta

```
Prerequisito: decidir si NV tendrá modo "Automático"
Si sí:
1. Tipar items en Documento (NV) — afecta también COT, cuidado
2. Agregar almacenId por línea en NV
3. Agregar llamada a stock en FormularioNotaVenta
Si no (solo modo "Mediante NS"):
→ Sin cambios en NV
```

### Fase G: Guía de Remisión

```
Cuando el módulo de Guía exista:
1. El campo stockDescuentoGuiaRemision ya estará en SalesPreferences
2. Solo conectar la lógica en el nuevo servicio de Guía
```
No hacer nada hasta que el módulo exista.

### Fase H: Integración con Nota de Salida (Fase 2 NS)

```
Prerequisito: Fases B-E completadas
1. NS desde OV: integrar liberarReservaOrden
2. NS desde NV: integrar cuando NV tenga tipado fuerte
3. NS desde Comprobante: solo si stockDescuentoXxx = 'nota_salida'
```

---

## 25. Pruebas manuales recomendadas

### Prueba 1 — Confirmar que comprobante siempre descuenta (hoy)

```
1. Producto con stock 10
2. Emitir Factura por 3 unidades
3. Ir a Control de Stock → Movimientos
4. Verificar movimiento SALIDA por 3 unidades con documentoReferencia = número factura
5. Stock debe quedar en 7
```

### Prueba 2 — Confirmar bloqueo con `allowNegativeStock = false`

```
1. Desactivar "Control de stock en ventas" (allowNegativeStock = false)
2. Producto con stock 2
3. Intentar emitir Factura por 5 unidades
4. Resultado esperado: error "Stock insuficiente"
5. Stock permanece en 2
6. Kardex: sin movimiento nuevo
```

### Prueba 3 — Confirmar permisividad con `allowNegativeStock = true`

```
1. Activar "Control de stock en ventas" (allowNegativeStock = true)
2. Producto con stock 2
3. Emitir Factura por 5 unidades
4. Resultado esperado: emisión exitosa
5. Stock queda en -3
6. Kardex: movimiento SALIDA por 5
```

### Prueba 4 — Confirmar NV no afecta stock

```
1. Producto con stock 10
2. Generar Nota de Venta por 5 unidades de ese producto
3. Verificar Control de Stock → Movimientos
4. Resultado esperado: sin nuevo movimiento
5. Stock permanece en 10
```

### Prueba 5 — Confirmar OV reserva pero no descuenta

```
1. Producto con stock 10
2. Crear y generar OV por 6 unidades → estado Reservada
3. Verificar Control de Stock → Situación
4. Stock real debe seguir siendo 10
5. Stock disponible debe ser 4 (10 - 6 reservado)
6. Kardex: sin movimiento de SALIDA (solo hay reserva)
```

### Prueba 6 — Confirmar NS valida y bloquea

```
1. Producto con stock 3
2. Crear NS manual con 5 unidades de ese producto
3. Intentar generar NS
4. Resultado esperado: error "Stock insuficiente"
5. Stock permanece en 3
6. Kardex: sin movimiento nuevo
```

### Prueba 7 — Confirmar NI siempre suma

```
1. Producto con stock 5
2. Generar Nota de Ingreso por 10 unidades
3. Stock debe ser 15
4. Kardex: movimiento ENTRADA por 10
```

---

## 26. Conclusión

### Tabla de estado actual por módulo

| Documento / módulo | Hoy mueve stock | Hoy valida stock | Puede quedar negativo | Genera Kardex | Requiere configuración nueva | Estado |
|---|---|---|---|---|---|---|
| Factura / Boleta | Sí (siempre) | Sí (si `!allowNegativeStock`) | Sí (si `allowNegativeStock`) | Sí | Sí | Parcial |
| POS | Sí (siempre) | Sí (si `!allowNegativeStock`) | Sí (si `allowNegativeStock`) | Sí | Sí | Parcial |
| Nota de Venta | No | No aplica | No aplica | No | Sí (si se activa modo automático) | Parcial |
| Orden de Venta | Reserva (no descuenta) | Sí (valida disponible) | No aplica | No (solo reserva) | No | Alineado |
| Cotización | No | No aplica | No aplica | No | No | Alineado |
| Nota de Ingreso | Entrada (siempre) | Sí (almacén activo) | No aplica | Sí | No | Alineado |
| Nota de Salida | Salida (siempre) | Sí (transaccional) | No (bloqueado) | Sí | No | Alineado |
| Guía de Remisión | No existe | No existe | No existe | No existe | Sí (futuro) | Pendiente de implementación |

### Respuestas directas a las 20 preguntas del brief

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | Qué configuración de stock existe | `salesPreferences.allowNegativeStock: boolean` — único campo |
| 2 | Dónde se guarda | `facturaFacilConfig` en localStorage, tenant-scoped |
| 3 | Qué significa `allowNegativeStock` | ¿Puede quedar stock negativo al vender? No es "auto-descuento on/off" |
| 4 | Qué módulos lo consumen | Comprobantes (Factura/Boleta), POS, InventoryFacade, InventoryService |
| 5 | Comprobantes descuentan siempre | **Sí, siempre** — el descuento no es opcional |
| 6 | NV descuenta stock | **No** — NV no afecta stock |
| 7 | OV reserva correctamente | **Sí** — por almacén, con función de liberación |
| 8 | Cotización afecta stock | **No** — confirmado |
| 9 | NS siempre valida stock | **Sí** — validación transaccional antes de descontar |
| 10 | NI siempre aumenta stock | **Sí** — sin configuración para desactivar |
| 11 | Riesgo de stock negativo | Sí, cuando `allowNegativeStock = true` |
| 12 | Riesgo de doble descuento | **Sí, crítico** — especialmente Comprobante + NS sin protección |
| 13 | Riesgo de Kardex inconsistente | Sí — no hay `stockDescontado` en comprobante |
| 14 | Qué cambiar para configuración propuesta | Ampliar `SalesPreferences` + lógica condicional en comprobantes + UI |
| 15 | Impacto en documentos existentes | Bajo si migración retrocompatible (`controlStockActivo = true` para existentes) |
| 16 | Cómo migrar | Derivar `controlStockActivo = true` y `stockDescuentoXxx = 'automatico'` para existentes |
| 17 | Cómo implementar cintillo sin ser invasivo | Componente local en InventoryPage, sin infraestructura global, con "Ocultar por ahora" |
| 18 | Archivos a tocar | `ContextoConfiguracion`, `SeccionPreferenciasVenta`, `useComprobanteActions`, `useCart`, `InventoryPage` |
| 19 | Archivos NO tocar | `inventory.service`, `notaIngreso.service`, `notaSalida.service`, `stock.repository` |
| 20 | Riesgos principales | Doble descuento (crítico), stock negativo (medio), reserva colgada (alto en OV→NS Fase 2) |

---

*Auditoría generada el 2026-06-07 — Solo lectura, sin cambios de código.*
