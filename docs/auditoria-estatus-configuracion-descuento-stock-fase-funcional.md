# Auditoría de Estado — Configuración Descuento Stock: Fase Funcional

**Fecha:** 2026-06-08  
**Rama:** `InventarioAvances` (rebautizada internamente como `ConfiguracionDescuentoStock`)  
**Alcance auditado:** 7 archivos modificados en working tree (no commiteados aún)  
**Auditor:** Revisión arquitectural post-implementación

---

## 1. Resumen Ejecutivo

La fase funcional solicitada era **alinear Factura/Boleta y POS** con los nuevos campos `controlStockActivo` y `stockDescuentoFacturaYBoleta`. El trabajo principal se completó correctamente. Sin embargo, durante la implementación se tomó una decisión arquitectural no solicitada: **Nota de Venta recibió la misma integración de stock completa** (pre-validación + descuento + Kardex) que Factura/Boleta, siendo que este módulo estaba explícitamente fuera del alcance de esta fase.

**Veredicto:**

| Componente | Resultado |
|---|---|
| Factura/Boleta (useComprobanteActions) | ✅ Dentro del alcance, bien implementado |
| POS (useCart) | ✅ Dentro del alcance, bien implementado |
| Trazabilidad (ComprobantesListContext) | ✅ Dentro del alcance, correcto |
| Cotización (FormularioCotizacion) | ✅ Compatibilidad técnica, sin cambio funcional |
| Documentos Comerciales (FormularioDocumentoComercial) | ✅ Compatibilidad técnica, sin cambio funcional |
| **Nota de Venta (FormularioNotaVenta)** | **⚠️ FUERA DEL ALCANCE — cambio funcional activo** |
| Modelo tipos NV (documento.types.ts) | ⚠️ Necesario solo por el cambio en NV |

---

## 2. Resultado de Validación Técnica

```
tsc --noEmit:   ✅ 0 errores (ejecutado)
eslint:         ✅ 0 errores, 0 warnings en archivos modificados (ejecutado)
vite build:     ✅ build exitoso en 16.36s — Exit code: 0 (ejecutado)
Advertencia:    ⚠️ chunk index-DOZ7OXIs.js supera 3000 kB (pre-existente, no relacionado)
```

---

## 3. Auditoría por Archivo

---

### 3.1 `useComprobanteActions.tsx`

**Cambios realizados:**

1. Lee `controlStockActivo` y `stockDescuentoFacturaYBoleta` desde `salesPreferences`.
2. Agrega bloque de **pre-validación de stock** antes de cualquier efecto secundario. Condición: `tipoComprobante !== 'nota_credito' && controlStockActivo && === 'automatico'`. Se omiten conversiones desde OV (`esOV = true`).
3. El bloque principal de descuento de stock cambia de:
   ```ts
   if (!isNoteCredit) { ... }
   ```
   a:
   ```ts
   if (!isNoteCredit && controlStockActivo && stockDescuentoFacturaYBoleta === 'automatico') { ... }
   ```
4. Dentro del bloque de descuento, el guard de error cambia de:
   ```ts
   if (!allowNegativeStock && remaining > 0) { throw }
   ```
   a:
   ```ts
   if (remaining > 0) { throw }
   ```
5. El campo `modoDescuentoStock` se guarda en el objeto `nuevoComprobante`.
6. Deps del `useCallback` actualizadas correctamente.

**Dentro del alcance:** ✅ Sí  
**Cambia comportamiento funcional:** ✅ Sí (intencional y correcto)

**Riesgo identificado — `allowNegativeStock` queda como dead code:**

El cambio del punto 4 introduce un problema secundario. Código anterior al throw:

```ts
// Este código es ahora DEAD CODE — nunca se alcanza dentro del bloque automatico
if (allowNegativeStock && remaining > 0) {
  pendingMovements.push({ ... almacenesOrdered[0] ... });
}
```

En el modo `automatico` con `allowNegativeStock = true`, antes el sistema permitía quedar en stock negativo al empujar el remainig al primer almacén. Ahora siempre lanza error si `remaining > 0`. Esto es **alineado con el requisito** ("no permitir stock negativo en modo automático"), pero el bloque `allowNegativeStock` debajo del throw queda como código inalcanzable y confuso para futuros lectores.

**Nota sobre OV → Comprobante:** La pre-validación se salta para conversiones OV. En el bloque de descuento, si por condición de carrera hay `remaining > 0` (reserva OV no cubrió todo), el nuevo código siempre lanza error. Antes, `allowNegativeStock = true` lo absorbería. El efecto práctico: el comprobante ya fue guardado (antes del bloque try), se muestra el warning "Stock no actualizado" y el usuario debe ajustar manualmente. Comportamiento degradado pero tolerable.

**Recomendación:** Mantener. Limpiar el dead code en un refactor separado.

---

### 3.2 `ComprobantesListContext.tsx`

**Cambio realizado:** Agrega `modoDescuentoStock?: 'automatico' | 'nota_salida' | 'sin_control'` a la interfaz `Comprobante`.

**Dentro del alcance:** ✅ Sí  
**Cambia comportamiento funcional:** No — campo opcional, retrocompatible  
**Riesgo:** Ninguno. Los comprobantes existentes sin el campo tendrán `undefined`, que es manejado correctamente en TypeScript al ser opcional.  
**Recomendación:** Mantener. Es la base de trazabilidad para la Fase 2 de Nota de Salida.

---

### 3.3 `useCart.tsx`

**Cambios realizados:**

1. Firma cambia de `useCart(): UseCartReturn` a `useCart(modoDescuentoOverride?: ...): UseCartReturn`.
2. Lee `controlStockActivo` y `stockDescuentoFacturaYBoleta`.
3. `validateStockAvailability` ahora computa el modo efectivo:
   ```ts
   const modo = modoDescuentoOverride ?? (controlStockActivo ? stockDescuentoFacturaYBoleta : 'sin_control');
   if (modo === 'sin_control' || modo === 'nota_salida') return true;
   ```
4. Deps del `useCallback` actualizadas.

**Dentro del alcance:** ✅ Sí para POS / ⚠️ Parcial (el parámetro fue motivado en parte por el cambio en NV)  
**Cambia comportamiento funcional para POS:** ✅ Sí (intencional y correcto) — ahora el carrito POS respeta `controlStockActivo`  
**Compatibilidad hacia atrás:** ✅ Callers que no pasan parámetro reciben el comportamiento Factura/Boleta (correcto)  
**Riesgo:** El parámetro en sí es una mejora arquitectural que permite a cualquier llamador definir su propio modo. Si se revierte NV, el parámetro sigue siendo útil y correcto para Cotización y Documentos Comerciales.  
**Recomendación:** Mantener completo.

---

### 3.4 `FormularioNotaVenta.tsx`

**⚠️ ARCHIVO FUERA DEL ALCANCE**

**Cambios realizados (listado completo):**

| Tipo | Cambio |
|---|---|
| Import | `useInventoryFacade` |
| Import | `allocateSaleAcrossalmacenes`, `calculateRequiredUnidadMinima`, `resolvealmacenesForSaleFIFO` desde `stockGateway` |
| Import | `useProductStore` |
| Import | `type CatalogProduct` |
| Hook | `useInventoryFacade` instanciado → `addMovimientoStock` |
| Hook | `useProductStore` instanciado → `catalogProducts` |
| Lógica | Lee `controlStockActivo`, `stockDescuentoNotaVenta`, computa `modoDescuentoNV`, lee `almacenes` |
| Lógica | Construye `catalogLookup` (Map id→producto, codigo→producto) |
| useCart | `useCart()` → `useCart(modoDescuentoNV)` |
| Función `handleCrearNotaVenta` | **Agrega pre-validación de stock** antes de `setIsProcessing(true)` (solo creación nueva, modo `automatico`) |
| Función `handleCrearNotaVenta` | **Agrega descuento de stock + Kardex** después de `addDocumento(notaVentaData)` (solo creación nueva, modo `automatico`) |
| Datos guardados | `modoDescuentoStock: modoDescuentoNV` en el objeto `notaVentaData` |

**Cambia comportamiento funcional:** ✅ **SÍ, significativamente**

Con `controlStockActivo = true` y `stockDescuentoNotaVenta = 'automatico'`:
- El carrito de NV ahora bloquea agregar productos sin stock
- Al crear una NV (modo nuevo), se descuenta stock y se genera Kardex tipo SALIDA motivo VENTA
- La NV queda registrada con `modoDescuentoStock = 'automatico'`

**Dentro del alcance:** ❌ No. El alcance original dice explícitamente: *"En esta fase NO se debía modificar funcionalmente: Nota de Venta"*.

**Análisis de riesgos específicos:**

| Riesgo | Descripción | Severidad |
|---|---|---|
| Prematuridad funcional | NV descuenta stock en esta fase sin test ni revisión de producto | Alta |
| Consistencia de estados | Si NV se anula después de descontar stock, el stock no se restaura (no hay lógica de anulación para NV con stock) | Alta |
| Doble descuento NV→Comprobante | Si la NV descuenta y luego se convierte a factura en modo `automatico`, el comprobante también descuenta. No hay mecanismo anti-doble descuento implementado | Alta |
| Sin UI de alerta | No hay cintillo ni aviso al usuario de que NV ahora descuenta stock automáticamente | Media |
| `tipoDetalle` no verificado | El código de NV no verifica `item.tipoDetalle === 'libre'` antes de calcular stock. Los items libres podrían generar intentos de descuento de stock innecesarios | Baja |
| Correlativo de NV con stock inconsistente | Si la creación del NV falla después del descuento de stock pero antes del toast de éxito, el stock queda decrementado sin documento visible | Media |
| Edición no cubierta | El modo edición no descuenta stock (correcto) pero tampoco repone o ajusta, lo que puede crear inconsistencias si se cambia cantidad | Baja |

**Recomendación:** Revertir los cambios funcionales de stock en NV (pre-validación + descuento + imports de inventario). Mantener únicamente `useCart(modoDescuentoNV)` si se decide que la validación de carrito es aceptable en esta fase, aunque esto introduce inconsistencia (carrito bloquea pero NV no descuenta).

La recomendación más limpia es `useCart('sin_control')` para NV en esta fase, igual que Cotización.

---

### 3.5 `FormularioCotizacion.tsx`

**Cambio realizado:** `useCart()` → `useCart('sin_control')`

**Dentro del alcance:** ✅ Compatibilidad técnica necesaria  
**Cambia comportamiento funcional:** ❌ No. La cotización nunca afectó stock y sigue sin afectarlo. Antes del cambio, con `controlStockActivo = true` y `stockDescuentoFacturaYBoleta = 'automatico'`, el carrito de cotización habría bloqueado la adición de productos sin stock. Este cambio previene esa regresión.  
**Riesgo:** Ninguno.  
**Recomendación:** Mantener.

---

### 3.6 `FormularioDocumentoComercial.tsx`

**Cambio realizado:** `useCart()` → `useCart('sin_control')`

**Contexto:** Este componente cubre los documentos CT (Cotización), NV y OV del módulo `Documentos-Comerciales` (FASE 1). Ninguno de estos tipos descuenta stock en FASE 1.

**Dentro del alcance:** ✅ Compatibilidad técnica necesaria  
**Cambia comportamiento funcional:** ❌ No. Igual que Cotización, este cambio previene que el carrito bloqueara erroneamente la adición de productos en modo `automatico`. Ningún documento de este módulo genera Kardex.  
**Riesgo:** Ninguno para el comportamiento actual.  
**Recomendación:** Mantener.

---

### 3.7 `documento.types.ts`

**Cambio realizado:** Agrega `modoDescuentoStock?: 'automatico' | 'nota_salida' | 'sin_control'` a la interfaz `Documento`.

**Dentro del alcance:** ⚠️ Solo fue necesario porque se implementó NV  
**Cambia comportamiento funcional:** ❌ No — campo opcional, retrocompatible  
**Riesgo:** Ninguno técnico. El riesgo conceptual es que sugiere que el módulo `Documentos-negociacion` tiene integración de stock cuando aún no debería.  
**Recomendación:** Mantener si se retienen los cambios de NV. Si se revierte NV, este campo sigue siendo inofensivo y puede quedarse como preparación para fase futura.

---

## 4. Tabla de Cumplimiento vs Alcance Original

| Regla solicitada | Estado actual | Cumple | Observación |
|---|---|---|---|
| Comprobante con inventario inactivo no descuenta | Bloque de stock condicional a `controlStockActivo` | ✅ Cumple | Correcto |
| Comprobante con automático descuenta | Bloque activo cuando `controlStockActivo && === 'automatico'` | ✅ Cumple | Correcto |
| Comprobante con Nota de Salida no descuenta | Bloque excluido cuando `=== 'nota_salida'` | ✅ Cumple | Correcto |
| POS con inventario inactivo no descuenta | `validateStockAvailability` retorna true si `!controlStockActivo` | ✅ Cumple | Correcto |
| POS con automático descuenta | `validateStockAvailability` activa si `controlStockActivo && 'automatico'` | ✅ Cumple | El descuento sigue siendo vía `createComprobante` en el POS |
| POS con Nota de Salida no descuenta | `validateStockAvailability` retorna true si `'nota_salida'` | ✅ Cumple | Correcto |
| **Nota de Venta no debía cambiar** | **NV ahora valida stock y descuenta Kardex** | **❌ No cumple** | **Fuera de alcance** |
| Cotización no debía cambiar funcionalmente | Solo compatibilidad técnica de carrito | ✅ Cumple | Sin cambio funcional |
| Orden de Venta no debía cambiar | Cubierta por `FormularioDocumentoComercial` con `'sin_control'` | ✅ Cumple | Sin cambio funcional |
| Nota de Ingreso no debía cambiar | No se tocó | ✅ Cumple | Sin cambios |
| Nota de Salida directa no debía cambiar | No se tocó | ✅ Cumple | Sin cambios |

---

## 5. Riesgos Identificados

| Riesgo | Origen | Severidad | Afecta |
|---|---|---|---|
| NV descuenta stock sin lógica de anulación | `FormularioNotaVenta.tsx` | 🔴 Alta | NV en modo automático |
| Doble descuento NV → Comprobante | `FormularioNotaVenta.tsx` | 🔴 Alta | NV convertida a factura/boleta |
| `allowNegativeStock` dead code en bloque automático | `useComprobanteActions.tsx` | 🟡 Media | Confusión futura, no bug activo |
| Sin UI de alerta para NV con stock activo | `FormularioNotaVenta.tsx` | 🟡 Media | UX del usuario |
| OV → Comprobante con carrera de stock | `useComprobanteActions.tsx` | 🟡 Media | Flujo poco frecuente |
| Consistencia cart NV (bloquea pero no descuenta) | `useCart + FormularioNotaVenta` | 🟡 Media | UX inconsistente si se mantiene parcialmente |
| `tipoDetalle 'libre'` no verificado en NV | `FormularioNotaVenta.tsx` | 🟢 Baja | Items libres podrían intentar lookup de catálogo |
| Deuda técnica `modoDescuentoOverride` | `useCart.tsx` | 🟢 Baja | Parámetro bien diseñado, sin riesgo |

---

## 6. Qué Debe Mantenerse

```
✅ useComprobanteActions.tsx — todo el cambio es correcto y en alcance.
✅ ComprobantesListContext.tsx — campo modoDescuentoStock, retrocompatible.
✅ useCart.tsx — parámetro modoDescuentoOverride + lógica de validación.
✅ FormularioCotizacion.tsx — useCart('sin_control').
✅ FormularioDocumentoComercial.tsx — useCart('sin_control').
⚠️ documento.types.ts — campo modoDescuentoStock (inocuo, puede quedarse).
```

---

## 7. Qué Debería Revertirse o Ajustarse

```
❌ FormularioNotaVenta.tsx — los siguientes bloques:
   - imports de useInventoryFacade, stockGateway, useProductStore, CatalogProduct
   - hooks addMovimientoStock, catalogProducts
   - lógica controlStockActivo / stockDescuentoNV / catalogLookup / almacenes
   - pre-validación de stock en handleCrearNotaVenta
   - bloque de descuento de stock en handleCrearNotaVenta
   - modoDescuentoStock en notaVentaData (si se revierte todo)

   Decisión sobre useCart: ver opciones en sección 9.
```

---

## 8. Pendiente Para Siguiente Fase

```
📋 Fase NV-Stock (separada):
   - Diseño formal del flujo NV con stock (validación UX, cintillo, anulación)
   - Anti-doble descuento NV → Comprobante
   - Anulación de NV con devolución de stock
   - Decidir si NV en modo 'nota_salida' genera botón "Generar NS"
   - Test del flujo completo

📋 Limpieza en useComprobanteActions.tsx:
   - Remover dead code: if (allowNegativeStock && remaining > 0) { push }
     (solo alcanzable en modo automatico, pero nunca se llega porque throw antes)

📋 Fase NS (Nota de Salida) — Fase 2 completa:
   - Ver docs/auditoria-fase2-nota-salida-documentos-origen.md
```

---

## 9. Recomendación de Siguiente Acción

### Opción A — Mantener todo como está
Aceptar que NV recibió la integración de stock en esta fase. Requiere:
- Implementar lógica de anulación de NV con devolución de stock
- Implementar anti-doble descuento NV → Comprobante
- Agregar UI de advertencia (cintillo) en NV cuando `controlStockActivo = true`
- Documentar formalmente como "Nota de Venta con stock" como parte de esta fase

**Cuándo elegirla:** Si el equipo de producto acepta el cambio funcional y se pueden cerrar los riesgos de doble descuento y anulación antes del commit.

---

### Opción B — Mantener Comprobantes/POS, revertir Nota de Venta completamente
Revertir `FormularioNotaVenta.tsx` a su estado previo. Agregar únicamente `useCart('sin_control')` para que el carrito de NV no sea afectado por el nuevo `validateStockAvailability`.

Resultado:
- NV sigue sin afectar stock (comportamiento original)
- El carrito de NV no bloquea por stock (correcto para el estado actual)
- Los 5 archivos del alcance quedan limpios y comprometibles

**Cuándo elegirla:** Si se quiere cerrar esta fase con exactamente lo que se pidió y deferrir NV.

---

### Opción C — Mantener useCart(modoDescuentoNV) en NV, revertir solo el bloque de stock
Revertir únicamente los bloques de pre-validación y descuento en `handleCrearNotaVenta`. Mantener `useCart(modoDescuentoNV)` y la lectura de config.

Resultado:
- El carrito de NV validará stock si `stockDescuentoNotaVenta = 'automatico'`
- Pero al crear NV, no se descuenta stock
- **Inconsistencia UX:** el carrito bloquea al usuario diciendo "no hay stock" pero la NV se crea igual... si el usuario logra ignorarlo

**Cuándo elegirla:** Si se quiere preparar la infraestructura de config para NV sin la lógica de descuento. Pero la inconsistencia cart-vs-creación hace esta opción confusa para el usuario.

---

### Opción D — Revertir parcialmente y rehacer con alcance más cerrado
Deshacer todos los cambios de NV más el parámetro en `useCart`, y re-implementar solo lo mínimo necesario para prevenir que el carrito de NV/Cotización valide stock.

**Cuándo elegirla:** Si se detecta que el parámetro `modoDescuentoOverride` en `useCart` fue demasiado invasivo. En la práctica, el parámetro es correcto y bien diseñado.

---

### ✅ Recomendación: **Opción B**

**Motivo:** Es la opción que más respeta el alcance original acordado y minimiza riesgos activos. Los dos riesgos críticos de NV (doble descuento y falta de anulación) no pueden resolverse en este mismo commit sin ampliar significativamente el alcance.

**Acciones concretas recomendadas:**
1. Revertir `FormularioNotaVenta.tsx` a estado previo.
2. Agregar únicamente `useCart('sin_control')` en la línea del hook en NV.
3. Mantener `documento.types.ts` con el campo (inocuo, preparación futura).
4. Commitear con: "feat: alinear Factura/Boleta y POS con control de stock activo".
5. Abrir tarea separada: "feat: integración de stock en Nota de Venta (Fase 2 NV-Stock)".

---

## 10. Resumen Ejecutivo Final

```
Archivos auditados:       7
Dentro del alcance:       6 (algunos parcialmente)
Fuera del alcance:        1 (FormularioNotaVenta.tsx — cambio funcional activo)
Riesgos críticos:         2 (doble descuento NV→Comprobante, ausencia de anulación NV)
tsc/eslint/build:         ✅ 0 errores
Recomendación:            Opción B — revertir NV, commitear el resto
```
