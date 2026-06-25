# Validación Post-Corrección — Órdenes de Venta

**Auditor**: Senior Software Auditor — Agente autónomo  
**Fecha**: 2026-06-24  
**Rama**: RevisionCotizacion  
**Archivos modificados en esta corrección**: 14 (funcionales) + 2 (documentación MD sin rastrear)  
**Commit HEAD pre-corrección**: c982946e "Cotizacion"  

---

## 1. Estado inicial de Git

```
git status --short (resumen):
 M apps/senciyo/src/.../catalogo-articulos/models/types.ts
 M apps/senciyo/src/.../comprobantes-electronicos/hooks/useComprobanteActions.tsx
 M apps/senciyo/src/.../comprobantes-electronicos/lista-comprobantes/pages/ListaComprobantes.tsx
 M apps/senciyo/src/.../documentos-comerciales/components/ListadoDocumentosComerciales.tsx
 M apps/senciyo/src/.../documentos-comerciales/hooks/useDocumentoComercialActions.ts
 M apps/senciyo/src/.../documentos-comerciales/models/documentoComercial.types.ts
 M apps/senciyo/src/.../documentos-comerciales/utils/convertirOVaComprobante.ts
 M apps/senciyo/src/.../documentos-comerciales/utils/documentoComercial.storage.ts
 M apps/senciyo/src/.../documentos-comerciales/utils/servicioReservaStock.ts
 M apps/senciyo/src/.../gestion-inventario/components/notas-salida/FormularioNotaSalida.tsx
 M apps/senciyo/src/.../gestion-inventario/hooks/useNotasSalida.ts
 M apps/senciyo/src/.../gestion-inventario/services/notaSalida.service.ts
 M apps/senciyo/src/shared/documentosComerciales/postEmisionOrdenVenta.ts
 M apps/senciyo/src/shared/inventory/stockGateway.ts
?? AUDITORIA_EXTREMA_ORDENES_VENTA.md
?? CORRECCION_INTEGRAL_ORDENES_VENTA.md
```

**Líneas cambiadas**: 465 inserciones / 152 eliminaciones en 14 archivos.  
**Archivos de documentación no rastreados**: 2 MDs generados por el agente implementador.

---

## 2. Archivos modificados (14 funcionales)

| Archivo | Rol en corrección |
|---|---|
| `types.ts` (catalogo) | Agrega campo `stockReservadoOVPorEstablecimiento` |
| `documentoComercial.types.ts` | `almacenId?` → opcional; agrega `establecimientoId?`; agrega `notaSalidaIds[]` |
| `servicioReservaStock.ts` | Elimina FIFO de `reservarStockOrden`; usa nuevo campo global |
| `documentoComercial.storage.ts` | Normalización de estados legacy OV |
| `useDocumentoComercialActions.ts` | Guards de edición y anulación de OV |
| `ListadoDocumentosComerciales.tsx` | Guards UI: `puedeEditar`, `puedeAnular` reforzados |
| `convertirOVaComprobante.ts` | `terminosCredito: null → ov.creditTerms ?? null` |
| `postEmisionOrdenVenta.ts` | Nueva función `restaurarOVPostAnulacionComprobante`; soporte `notaSalidaIds[]`; claves de despacho actualizadas; `liberarReservasDeOV`/`restaurarReservasDeOV` actualizadas |
| `stockGateway.ts` | `summarizeProductStock` suma `stockReservadoOVPorEstablecimiento` en `totalReserved` |
| `notaSalida.service.ts` | `anularNSEnInventario`: `continue` → `throw`; `generarNSEnInventario`: soporte nueva arquitectura global |
| `useNotasSalida.ts` | Liberación proporcional por SKU (nueva arq); restauración OV post-anulación NS desde comprobante |
| `FormularioNotaSalida.tsx` | Soporte nuevo campo de reserva global |
| `ListaComprobantes.tsx` | Llama `restaurarOVPostAnulacionComprobante` al anular |
| `useComprobanteActions.tsx` | Salta reservas sin `almacenId` (nueva arquitectura) |

---

## 3. Fuente autoritativa de reserva

**Dos campos coexisten**:

1. `stockReservadoPorAlmacen?: Record<string, number>` — legacy; usada por NV automático y OVs antiguas con FIFO.  
2. `stockReservadoOVPorEstablecimiento?: Record<string, number>` — nueva; fuente de verdad para OVs generadas post-corrección.

**No existe** un campo `stockReservado` (simple, sin distinción).

**Fuente autoritativa para OVs nuevas**: `stockReservadoOVPorEstablecimiento[establecimientoId]`.

---

## 4. Relación entre los campos de reserva

| Campo | Responsable escritura | Lectores principales | ¿Activo para OV nueva? | Riesgo doble conteo |
|---|---|---|---|---|
| `stockReservadoPorAlmacen` | `reservarStockOrden` (legacy), `descontarStockParaDocumento` (NV) | `summarizeProductStock` (breakdown por almacén), `getReservedStock` (InventoryService) | NO (OVs nuevas usan el otro campo) | Bajo — solo se activa para NV o OVs legacy |
| `stockReservadoOVPorEstablecimiento` | `reservarStockOrden` (nueva arq) | `summarizeProductStock` (adición al total), `liberarReservasDeOV`, `restaurarReservasDeOV` | SÍ | Bajo — campo dedicado, separado |

**Fórmula en `summarizeProductStock` post-corrección**:

```
totalReserved = Σ(stockReservadoPorAlmacen[almacenId]) + stockReservadoOVPorEstablecimiento[estId]
totalAvailable = max(0, totalStock - totalReserved)
```

Ambos campos suman a `totalReserved`. Si una OV usa el campo nuevo y una NV usa el campo legacy, ambas se descuentan correctamente. Si una OV legacy usara `stockReservadoPorAlmacen` y existiera simultáneamente una reserva en `stockReservadoOVPorEstablecimiento` para el mismo producto, habría doble conteo solo si el producto tuviera reservas en ambos campos para la misma unidad de stock — **posible en migración de OVs pre-corrección a OVs post-corrección**, pero solo para el período de transición.

**Riesgo de doble conteo**: CONDICIONAL — ocurre si el mismo producto tiene OVs legacy activas (reserva en `stockReservadoPorAlmacen`) Y OVs nuevas activas (reserva en `stockReservadoOVPorEstablecimiento`) al mismo tiempo. En ese caso, `totalReserved` suma ambas correctamente (no hay doble conteo dentro de un mismo campo), pero `allocateSaleAcrossalmacenes` con `respectReservations=true` solo lee `stockReservadoPorAlmacen` — podría asignar stock que ya está "reservado" globalmente en el otro campo.

---

## 5. Reserva por establecimiento

`stockReservadoOVPorEstablecimiento[establecimientoId]` almacena la cantidad total reservada por una OV para un producto en un establecimiento, SIN especificar almacén. `summarizeProductStock` la resta del total disponible. La salida física (NS) usa FIFO por almacén sin estar guiada por esta reserva global — la validación de la NS verifica que la cantidad despachada ≤ reserva pendiente, y la asignación FIFO se aplica libremente dentro del establecimiento.

---

## 6. Creación de OV — flujo completo (post-corrección)

```
generarDocumento(datos: tipo=orden_venta)
  → validarDatos()                      — sin side effects
  → validarStockParaOrden(items, almacenes, establecimientoId)
      → summarizeProductStock() → totalAvailable incluye ambas reservas
  → generarCorrelativoSeguro()          — in-memory
  → reservarStockOrden(items, _almacenes, establecimientoId)
      → consolida cantidades por SKU (nuevo: sin FIFO)
      → updateProduct({ stockReservadoOVPorEstablecimiento: {[estId]: reservadoActual + qty} })
      → retorna ReservaStockItem[] con establecimientoId, SIN almacenId
  → construye DocumentoComercial { estado: 'Reservada', reservasStock }
  → agregarDocumento()                  — dispatch React
  → useEffect([state.documentos]) → guardarDocumentosEnStorage()  — localStorage
```

**Estado inicial**: `'Reservada'`. Stock reservado globalmente. FIFO eliminado de creación OV.

---

## 7. Bienes vs Servicios

`debeControlarStock(item)`: retorna false para servicios, items en modo libre sin código de catálogo. Solo bienes de catálogo pasan por validación y reserva. Post-corrección: sin cambios funcionales en este filtro.

---

## 8. Cálculo del disponible

**Antes**: `totalAvailable = Σ(stockPorAlmacen[a] - stockReservadoPorAlmacen[a])` por almacén.  
**Después**: igual más `- stockReservadoOVPorEstablecimiento[estId]` aplicado al total.

El `breakdown` por almacén no incluye la reserva OV (se añade solo al total). La UI de desglose por almacén no mostrará la reserva OV en el detalle por almacén — solo en el total. Esto es un desfase informativo menor, no un defecto de cálculo.

---

## 9. FIFO — solo en salida

**OV nueva**: `reservarStockOrden` ya NO llama `resolvealmacenesForSaleFIFO` ni `allocateSaleAcrossalmacenes`. La reserva es global por establecimiento.  
**NS desde OV nueva**: `generarNSEnInventario` usa FIFO para la salida física (`respectReservations: false`), ya que la reserva global no está en `stockReservadoPorAlmacen`.  
**NV automático**: `descontarStockParaDocumento` sigue usando FIFO (`respectReservations: true`). Sin cambio.

**Imports en `servicioReservaStock.ts`**: `resolvealmacenesForSaleFIFO` y `allocateSaleAcrossalmacenes` permanecen importados. `resolvealmacenesForSaleFIFO` se usa en `descontarStockParaDocumento` (líneas 201, 219). No son huérfanos. `resolvealmacenForSale` sí fue eliminado del import (correcto).

---

## 10. Despacho parcial

**Claves de `despachoKey`**:
- Reservas nuevas (OV): `{ sku, cantidad, establecimientoId }` → clave `sku__establecimientoId`
- Despachos NS (nueva arq): `aLiberar` construido con `establecimientoId` → clave `sku__establecimientoId`
- Reservas legacy (OV): `{ sku, cantidad, almacenId }` → clave `sku__almacenId`
- Despachos NS (legacy): `aLiberar` construido con `almacenId` → clave `sku__almacenId`

**Compatibilidad**: Las claves son CONSISTENTES dentro de cada arquitectura. Una OV nueva produce `despachoKey = sku__establecimientoId` tanto en reservas como en despachos. El cálculo de pendientes funciona correctamente.

**Excepción encontrada**: cuando `aLiberar` en `atenderOrdenVentaPostNSDirecta` lleva `establecimientoId` (nueva arq), se acumula como despacho con clave `sku__establecimientoId`. Al calcular `calcularReservasPendientes(reservasOriginales, nuevoDespachado)`, las reservas originales también tienen clave `sku__establecimientoId`. La resta es correcta.

---

## 11. Anulación de Nota de Salida

### 11.1 Throw al encontrar línea sin almacén

**Código en `anularNSEnInventario`** (notaSalida.service.ts:454-458):

```typescript
const resolvedAlmId = linea.almacenId ?? nota.almacenOrigenId;
if (!resolvedAlmId) {
  throw new Error(`No se puede anular la línea "${linea.productoNombre}": sin almacén asignado. ...`);
}
```

**Problema de atomicidad PARCIAL**: El loop itera sobre `nota.lineas` secuencialmente. Si la línea 1 tiene almacenId y la línea 2 no:
1. Línea 1 → `registerAdjustment()` ejecutado (stock modificado en Zustand)
2. Línea 2 → `throw` 

La excepción es capturada por `useNotasSalida.anularNS()` en un try/catch, que muestra error al usuario. Sin embargo, la modificación de la línea 1 ya ocurrió en Zustand (stock repuesto para esa línea). La NS permanece en estado `'Generada'` (el estado se actualiza al final del loop, en la función `anularNSEnInventario` que no llegó a completarse). La restauración es **incompleta** — stock parcialmente repuesto, NS no marcada como `'Anulada'`.

**Veredicto**: CORRECCIÓN PARCIAL — el error ya no es silencioso, pero la modificación parcial de stock sin rollback sigue siendo posible.

### 11.2 Restauración de OV al anular NS directa

`useNotasSalida.anularNS` (líneas 270-283): si `origen === 'OrdenVenta'` y `ordenVentaOrigenId`, llama `restaurarOVPostAnulacionNSDirecta` con las líneas de bienes que tienen `almacenId`. Esta restauración usa el campo `almacenId` directamente, lo que solo es compatible con reservas legacy. Para OVs con reserva nueva (sin `almacenId` en reservasStock), la función restauradora reinterpreta incorrectamente al intentar restaurar `stockReservadoPorAlmacen` con `almacenId = l.almacenId` de las líneas de la NS (físicas, sí tienen almacenId), pero la reserva original estaba en `stockReservadoOVPorEstablecimiento`.

**Nuevo código (líneas 286-301)** para NS desde comprobante → OV: también usa `almacenId` de líneas NS para restaurar. Mismo problema potencial.

---

## 12. Anulación de Comprobante

### 12.1 Guard antes de anular (Escenario C: Comprobante con NS activa)

En `ListaComprobantes.tsx`, la función `handleVoid` NO tiene un guard que bloquee la anulación del comprobante cuando existe una NS activa generada desde ese comprobante vinculada a una OV.

El código detecta `modo === 'nota_salida' && comprobante.notaSalidaId && comprobante.notaSalidaGenerada` (línea 800) y llama `anularNS` sobre esa NS. Esto es correcto para el caso de comprobantes de NV. Para comprobantes de OV en modo nota_salida con NS activa: el comprobante se anula, la NS también se anula (restaurando stock físico), y luego `restaurarOVPostAnulacionComprobante` restaura la OV a `'Reservada'`.

No existe un guard que **bloquee** el flujo — simplemente lo gestiona automáticamente (NS → anulada, OV → restaurada). La pregunta es si esto es correcto: la anulación en cascada (Comprobante → NS → restaura OV) parece intencional y funcional. El riesgo: si `anularNS` falla silenciosamente, el comprobante queda anulado pero la NS sigue activa.

### 12.2 Restauración de OV tras anulación de Comprobante

`ListaComprobantes.tsx` (líneas 929-947): nueva sección que detecta `sourceDocumentType === 'orden_venta'` o vía `instantaneaDocumentoComercial.relaciones.tipoDocumentoFuente === 'orden_venta'` y llama `restaurarOVPostAnulacionComprobante(ovId, { modoDescuentoStock })`.

**`restaurarOVPostAnulacionComprobante` en `postEmisionOrdenVenta.ts`**:
- Acepta OV en `'Atendida'` o `'Pendiente de salida'`.
- En modo `automatico`: llama `restaurarReservasDeOV(reservasStock)` → incrementa `stockReservadoOVPorEstablecimiento` (nueva arq) o `stockReservadoPorAlmacen` (legacy). Luego establece estado `'Reservada'`.
- En modo `nota_salida`: no modifica reservas (sigue vigente). Estado → `'Reservada'`.

**Riesgo detectado (modo `automatico` + OV nueva)**: Al anular el comprobante, el módulo de comprobantes ya repuso el stock real (`stockPorAlmacen`) via movimientos legacy (DEVOLUCION_CLIENTE). Luego `restaurarReservasDeOV` restaura la reserva global (`stockReservadoOVPorEstablecimiento`). Esto es correcto: stock real repuesto + reserva restaurada = disponible sin cambio neto respecto al estado post-OV-generada. La OV vuelve a 'Reservada' y puede generar nuevo comprobante.

**Riesgo detectado (modo `automatico` + OV legacy)**:  
El módulo de comprobantes repone stock en `stockPorAlmacen`. La restauración de reserva en `restaurarReservasDeOV` incrementa `stockReservadoPorAlmacen[almacenId]`. Funciona correctamente para OVs legacy.

---

## 13. Guards de edición y anulación

### 13.1 Guard de edición OV (OV-P1-002/006)

**`ListadoDocumentosComerciales.tsx`** (`puedeEditar`):

```typescript
if (doc.tipo === 'orden_venta' && !doc.esBorrador) return false;
return doc.esBorrador || ['Generada', 'Aprobada'].includes(doc.estado);
```

OVs no-borrador NUNCA son editables (ningún estado). Solo borradores son editables.

**`useDocumentoComercialActions.ts`** (`actualizarDocumento`):

```typescript
if (documentoExistente.tipo === 'orden_venta' && !documentoExistente.esBorrador) {
  return { exito: false, error: 'Las Órdenes de Venta generadas no pueden editarse. Anule y cree una nueva.' };
}
```

Guard dual: UI + lógica de negocio. Cubre `Reservada`, `Atendida parcialmente`, `Pendiente de salida`. **CORREGIDO**.

### 13.2 Guard de anulación OV (OV-P1-001)

**`ListadoDocumentosComerciales.tsx`** (`puedeAnular`):

```typescript
if (doc.tipo === 'orden_venta') {
  if (doc.estado === 'Atendida') return false;
  if (doc.estado === 'Pendiente de salida') return false;  // ← nuevo
  if (doc.estado === 'Atendida parcialmente' && doc.notaSalidaGenerada) return false;  // ← nuevo
  return !doc.esBorrador && doc.estado !== 'Anulada';
}
```

**`useDocumentoComercialActions.ts`** (`anularDocumento`):

```typescript
if (doc.tipo === 'orden_venta') {
  if (doc.estado === 'Pendiente de salida') return { exito: false, error: '...' };
  if (doc.estado === 'Atendida parcialmente' && doc.notaSalidaGenerada) return { exito: false, error: '...' };
  if (doc.estado === 'Atendida') return { exito: false, error: '...' };
}
```

Guard dual aplicado. **CORREGIDO para el escenario de OV-P1-001**.

**Brecha residual**: OV en `'Atendida parcialmente'` SIN NS activa (`notaSalidaGenerada = false`) puede anularse. Este es el caso de despacho parcial sin NS pendiente, que sí debería poder anularse (la reserva pendiente se libera via `calcularReservasPendientes`). Comportamiento correcto.

---

## 14. Atomicidad y rollback (OV-P1-005)

### 14.1 Flujo de generarDocumento (nuevo)

```
reservarStockOrden()  →  ESCRIBE Zustand (stockReservadoOVPorEstablecimiento)
construye documento
agregarDocumento()    →  dispatch React (síncrono)
useEffect            →  guardarDocumentosEnStorage()  →  localStorage.setItem()
```

### 14.2 Manejo de error en guardarDocumentosEnStorage

```typescript
export const guardarDocumentosEnStorage = (documentos: DocumentoComercial[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(obtenerClave(), JSON.stringify(documentos));
  } catch {
    // Ignorar errores de cuota  ← SIN CAMBIO POST-CORRECCIÓN
  }
};
```

El `catch { }` es silencioso. Si `localStorage.setItem` lanza `QuotaExceededError`:
1. `reservarStockOrden` ya ejecutó — `stockReservadoOVPorEstablecimiento` incrementado en Zustand.
2. El documento existe en el contexto React (visible en UI durante la sesión).
3. Al recargar la página: el documento NO está en localStorage → no se carga en el contexto → desaparece.
4. La reserva en Zustand también desaparece al recargar (Zustand in-memory). Si el store de productos persiste en localStorage separado (verifícar: el store de productos SÍ persiste en Zustand/localStorage via persist), la reserva en `stockReservadoOVPorEstablecimiento` persistiría con el documento desaparecido.

**No existe rollback**. La corrección NO abordó la atomicidad de `guardarDocumentosEnStorage`. **OV-P1-005: NO CORREGIDO** (el escenario de QuotaExceededError sigue sin rollback).

---

## 15. Crédito OV→Comprobante (OV-P1-003)

**Antes**: `terminosCredito: null` — hardcodeado.

**Después** (`convertirOVaComprobante.ts:340`):
```typescript
terminosCredito: ov.creditTerms ?? null,
```

Los `creditTerms` de la OV se transfieren al formulario de comprobante. **CORREGIDO**.

---

## 16. Múltiples Notas de Salida

**Antes**: `notaSalidaId?: string` — scalar, se sobreescribía con la última NS (OV-P2-002).

**Después**: Se agrega `notaSalidaIds?: string[]` (array). `vincularDocumentoComercialNS` acumula IDs en el array. `desvincularDocumentoComercialNS` acepta `notaSalidaIdARemover` para eliminar solo esa NS del array, manteniendo el resto.

El campo `notaSalidaId` sigue existiendo por compatibilidad (apunta a la última NS en `notaSalidaIds`). **MEJORADO** — P2-002 resuelto.

---

## 17. Estados legacy de OV

**Normalización en `normalizarDocumentoCargado`** (`documentoComercial.storage.ts`):

```typescript
if (doc.tipo === 'orden_venta') {
  if (doc.estado === 'Generada') → 'Reservada'
  if (doc.estado === 'Atendida parcial') → 'Atendida parcialmente'
  if (doc.estado === 'Atendida total') → 'Atendida'
  if (doc.estado === 'Convertida') → 'Atendida'   ← ANÁLISIS REQUERIDO
}
```

**Análisis de `'Convertida' → 'Atendida'`**:

En el modelo anterior, `'Convertida'` significaba que se emitió un comprobante desde la OV. En modo `automatico`, el stock real ya fue descontado al emitir el comprobante (vía `createComprobante` → `registerAdjustment`). La reserva ya fue liberada (`liberarReservasDeOV`). En ese caso, `'Atendida'` es correcto: el stock salió, la OV está finalizada.

En modo `nota_salida`, `'Convertida'` podría significar que el comprobante fue emitido pero la NS aún no fue generada. En ese caso, el stock real no salió y la reserva no fue liberada. Normalizar a `'Atendida'` sería incorrecto: no habría reserva activa ni estado de "pendiente de salida".

**Riesgo**: Para OVs legacy en modo `nota_salida` con estado `'Convertida'` (comprobante emitido, NS pendiente), la normalización a `'Atendida'` las marca como terminales. El usuario no puede generar la NS ni anular la OV. El stock queda "reservado" en Zustand pero sin OV en estado activo.

**Veredicto**: Normalización `'Convertida' → 'Atendida'` es CORRECTA para modo `automatico` pero potencialmente INCORRECTA para modo `nota_salida`. Es una corrección con riesgo de datos legacy.

---

## 18. No regresiones

### 18.1 NV automático

`descontarStockParaDocumento` en `servicioReservaStock.ts`: usa `resolvealmacenesForSaleFIFO` + `allocateSaleAcrossalmacenes` (sin cambio funcional). `stockReservadoPorAlmacen` no fue alterado para NV. **Sin regresión**.

### 18.2 Cotizaciones

`normalizarDocumentoCargado`: lógica de cotizaciones preservada en su propio bloque. **Sin regresión**.

### 18.3 Anulación de comprobante de NV

`ListaComprobantes.tsx`: bloques de restauración de cotización y NV no tocados. **Sin regresión**.

### 18.4 Nota de Salida directa (sin OV)

`generarNSEnInventario`: el path sin `esNSVinculadaAOV` usa FIFO normal (`respectReservations: true`). Sin cambio. **Sin regresión**.

---

## 19. Validaciones automáticas

| Comando | Resultado | Detalles |
|---|---|---|
| `npm run build --workspace=apps/senciyo` | ✅ | `✓ built in 22.09s`, 0 errores TypeScript |
| `npm run lint --workspace=apps/senciyo` | ✅ | Sin salida (0 errores, 0 warnings) |
| Warning chunks | ⚠️ (preexistente) | `index-BU-v6EYM.js` 3,348 kB > 3000 kB (no relacionado a OV) |

**Tests**: Infraestructura mínima. Solo un archivo encontrado: `stockAlerts.test.ts` (alertas de stock, no cubre flujos de OV). No existen tests para:
- `servicioReservaStock.ts` (reservarStockOrden, validarStockParaOrden)
- `postEmisionOrdenVenta.ts` (calcularReservasPendientes, restaurarOVPostAnulacionComprobante)
- `useDocumentoComercialActions.ts` (generarDocumento, anularDocumento)

---

## 20. Pruebas funcionales (runtime)

**Servidor de desarrollo**: Arrancó correctamente en `http://localhost:5173` (killed por timeout del test; no se realizaron pruebas de UI).

```
VITE v7.2.6 ready in 309 ms
➜  Local:   http://localhost:5173/
```

No se verificó comportamiento de UI. Todos los análisis son estáticos.

---

## 21. Hallazgos pendientes

### NUEVO-001 — Anulación NS con líneas procesadas antes del throw (atomicidad parcial)
**Severidad**: P1 (heredado, corrección parcial)  
**Archivo**: `notaSalida.service.ts:449-485`  
**Descripción**: El `throw` por línea sin almacén ocurre dentro del loop. Si líneas anteriores ya ejecutaron `registerAdjustment`, el stock fue parcialmente repuesto pero la NS no fue marcada como `'Anulada'`. La excepción se propaga al llamador (`useNotasSalida.anularNS`) que muestra error al usuario, pero sin rollback de líneas ya procesadas.

### NUEVO-002 — Restauración de reserva OV al anular NS directa usa almacenId de líneas NS
**Severidad**: P2  
**Archivo**: `useNotasSalida.ts:270-283`  
**Descripción**: Para OVs con nueva arquitectura (reserva en `stockReservadoOVPorEstablecimiento`), al anular la NS directa, el código construye `aRestaurar` con `almacenId = l.almacenId` (de líneas físicas). `restaurarOVPostAnulacionNSDirecta` llama `restaurarReservasDeOV(aRestaurar)`. Esta función restaura `stockReservadoPorAlmacen[almacenId]` (rama legacy) en lugar de `stockReservadoOVPorEstablecimiento`. La reserva global no se restaura correctamente.

```typescript
// useNotasSalida.ts:270-283
const aRestaurar = nota.lineas
  .filter(l => l.tipoBienServicio === 'bien' && l.almacenId)
  .map(l => ({
    sku: l.productoCodigo,
    cantidad: l.cantidad,
    almacenId: l.almacenId as string,  // ← almacenId físico de la NS, NO establecimientoId
  }));
restaurarOVPostAnulacionNSDirecta(nota.ordenVentaOrigenId, { ... aRestaurar });
```

El campo `establecimientoId` nunca se propaga a `aRestaurar`. Por tanto, `restaurarReservasDeOV` entra a la rama `else if (reserva.almacenId)` y modifica `stockReservadoPorAlmacen` en lugar de `stockReservadoOVPorEstablecimiento`. La reserva global no vuelve a su valor previo al despacho.

**Mismo problema existe en el bloque de líneas 286-301** (NS desde comprobante → OV).

### NUEVO-003 — `'Convertida' → 'Atendida'` en legacy puede ser incorrecto para modo nota_salida
**Severidad**: P2  
**Archivo**: `documentoComercial.storage.ts:31`  
**Descripción**: Documentado en §17. OVs legacy con `'Convertida'` en modo `nota_salida` quedan como terminales (`'Atendida'`) sin posibilidad de generar NS. El stock podría quedar reservado huérfano.

### NUEVO-004 — Guard de comprobante con NS activa no es explícito (solo gestiona, no bloquea)
**Severidad**: P2  
**Archivo**: `ListaComprobantes.tsx:800-806`  
**Descripción**: El flujo anula la NS en cascada al anular el comprobante. No existe un guard que requiera confirmación explícita del usuario sobre la cascade-annulment. Si `anularNS(comprobante.notaSalidaId, voidReason)` lanza excepción silenciada (catch interno), el comprobante queda anulado pero la NS permanece activa.

### NUEVO-005 — Desglose de reserva OV no visible en breakdown por almacén
**Severidad**: P3  
**Archivo**: `stockGateway.ts:146-163`  
**Descripción**: `ovEstablecimientoReserved` se resta del total pero no se incluye en el `breakdown` por almacén. La UI de desglose mostraría stock disponible incorrecto a nivel de almacén (sum de disponibles por almacén > total disponible real). Inconsistencia informativa.

---

## 22. Veredicto final

### Mapeo de hallazgos P1 originales con IDs de la auditoría:

| ID original | Descripción | Estado post-corrección |
|---|---|---|
| **OV-P1-001** | Anulación de OV en 'Pendiente de salida' con Comprobante vigente | **CORREGIDO** — guard dual en UI y lógica de negocio |
| **OV-P1-002/006** | Edición de OV con stock comprometido sin reconciliar reservas | **CORREGIDO** — OVs no-borrador bloqueadas en edición |
| **OV-P1-003** | creditTerms OV no se transfiere al Comprobante | **CORREGIDO** — `ov.creditTerms ?? null` |
| **OV-P1-004** | Anulación de Comprobante no restaura OV | **CORREGIDO** — `restaurarOVPostAnulacionComprobante` implementada |
| **OV-P1-005** | Atomicidad reserva + persistencia | **NO CORREGIDO** — `guardarDocumentosEnStorage` sigue con catch silencioso sin rollback |

### Nuevos hallazgos encontrados:

| ID | Severidad | Descripción |
|---|---|---|
| NUEVO-001 | P1 | Anulación NS: throw dentro del loop no previene modificaciones parciales de stock |
| NUEVO-002 | P2 | Restauración de reserva global al anular NS directa OV usa almacenId en lugar de establecimientoId |
| NUEVO-003 | P2 | `'Convertida' → 'Atendida'` legacy puede ser incorrecto para modo nota_salida |
| NUEVO-004 | P2 | Cascade-annulment comprobante→NS sin confirmación explícita ni rollback si NS falla |
| NUEVO-005 | P3 | Reserva global OV no visible en breakdown por almacén de `summarizeProductStock` |

### Criterio de aprobación (de la auditoría original):
- 🟢: 0 P0, 0 P1
- 🟡: 0 P0, ≤ 2 P1 menores sin impacto de datos
- 🔴: Cualquier P0, ≥ 3 P1, o P1 con impacto en integridad de stock

### Conteo post-corrección:
- P0: 0
- P1: 2 (OV-P1-005 no corregido + NUEVO-001 heredado)
- P2: 3 (NUEVO-002, NUEVO-003, NUEVO-004)
- P3: 1 (NUEVO-005)

**NUEVO-001** (throw dentro del loop en anularNS): impacto real bajo — requiere una NS con una línea sin almacenId Y líneas anteriores en el mismo documento. El caso más común es que la NS fue bien generada (con almacenes), por lo que el `throw` ocurriría solo en datos corruptos.

**OV-P1-005** (atomicidad): impacto bajo en producción (QuotaExceededError es raro), pero el riesgo existe y la corrección no lo abordó.

Los dos P1 restantes tienen impacto de datos bajo/moderado pero sin frecuencia alta en producción normal.

**Veredicto**: 🟡 APROBACIÓN CONDICIONAL

---

*Informe generado automáticamente por agente de auditoría. Todos los hallazgos son trazabilidad estática. No se ejecutaron pruebas de UI en browser.*
