# Auditoría Extrema del Tab Movimientos / Kardex

> **Fecha:** 2026-05-29  
> **Base de trabajo:** Código real leído archivo por archivo. Sin suposiciones.  
> **Alcance:** Tab Movimientos del módulo Control de Stock, todos los flujos que generan movimientos.

---

## 1. Resumen Ejecutivo

El tab Movimientos **existe y funciona como punto de registro central**, pero **no es un Kardex completo ni confiable** por los siguientes motivos:

1. **Los movimientos de venta y anulación de comprobantes no actualizan el estado del hook en tiempo real.** Se escriben en `StockRepository` (localStorage) pero la lista visible en el tab solo se actualiza cuando se monta el componente o se llama `reloadMovements()`. Un usuario que hace una venta en otra pestaña y regresa al tab Movimientos sin navegar fuera del módulo verá una lista desactualizada.

2. **La anulación de comprobantes busca movimientos originales por `comprobanteId` (UUID interno)**, pero la venta guarda `documentoReferencia: numeroComprobante` (serial legible como "F001-00001"). Esta inconsistencia hace que la búsqueda de movimientos originales falle silenciosamente: el stock no se restaura.

3. **La búsqueda de texto no incluye documento/referencia, almacén ni transferenciaId.** Un usuario que busca movimientos de una factura específica no los encontrará por su número.

4. **La columna "Detalles" está sobrecargada** con información heterogénea (badge de transferencia, observaciones, documento, ubicación legacy), haciendo filas desproporcionadamente altas para transferencias.

5. **La exportación Excel no diferencia visualmente** entre movimiento de venta, ajuste manual, importación masiva o reversión. Solo hay "Tipo" y "Motivo" como columnas clasificadoras.

6. **Hay tipos de movimiento definidos en el modelo (MERMA, DEVOLUCION) que son inaccesibles** desde el modal de ajuste.

**Veredicto:** El tab Movimientos centraliza parcialmente el Kardex. Es confiable para ajustes y transferencias. Es incompleto para ventas/anulaciones/NC (riesgo de inconsistencia) y deficiente para búsqueda y exportación auditada.

---

## 2. Alcance Revisado

### Archivos leídos completamente

| Archivo | Rol |
|---|---|
| `components/tables/MovementsTable.tsx` | Tabla, filtros visuales, búsqueda |
| `pages/InventoryPage.tsx` | Exportación Excel, wiring del tab |
| `hooks/useInventory.ts` | Estado de movimientos, handlers |
| `services/inventory.service.ts` | Lógica de negocio que genera movimientos |
| `repositories/stock.repository.ts` | Persistencia en localStorage |
| `models/inventory.types.ts` | Tipos `MovimientoStock`, motivos, tipos |
| `utils/inventory.helpers.ts` | `filterByPeriod`, `sortByDateDesc`, helpers |
| `components/modals/AdjustmentModal.tsx` | Ajuste unitario |
| `components/PanelImportacionStock.tsx` | Importación masiva, reset |
| `api/inventory.facade.ts` | Fachada usada por ventas/NC |
| `comprobantes-electronicos/hooks/useComprobanteActions.tsx` | Generación de movimientos en venta y NC |
| `comprobantes-electronicos/lista-comprobantes/pages/ListaComprobantes.tsx` | Anulación de comprobante, restauración de stock |
| `models/transferencia.types.ts` | Entidad Transferencia |
| `repositories/transferencia.repository.ts` | Persistencia de transferencias |

---

## 3. Mapa Actual del Tab Movimientos

### Carga de datos

```
useInventory.ts:
  useEffect(() => {
    setMovimientos(StockRepository.getMovements()); // ← carga única en mount
  }, []);
```

Los movimientos se cargan **una sola vez** al montar el componente. No hay reactividad automática: si otro módulo escribe en `StockRepository`, el tab Movimientos no lo verá hasta que se llame `reloadMovements()` o el componente se re-monte.

### Estado en memoria vs localStorage

| Flujo | Escribe en StockRepository | Actualiza estado hook | Tab actualiza en tiempo real |
|---|---|---|---|
| Ajuste unitario (hook) | Sí | Sí | Sí |
| Importación masiva | Sí | No, solo vía `reloadMovements()` callback | Solo si se llama al callback |
| Reset de stock | Sí | No, solo vía `reloadMovements()` callback | Solo si se llama al callback |
| Transferencia intra (hook) | Sí | Sí | Sí |
| Despacho inter (hook) | Sí | Sí | Sí |
| Recepción inter (hook) | Sí | Sí | Sí |
| Anulación transferencia (hook) | Sí | Sí | Sí |
| **Venta/comprobante (facade)** | **Sí** | **No** | **No (brecha crítica)** |
| **Anulación comprobante (facade)** | **Sí** | **No** | **No (brecha crítica)** |
| **Nota de crédito (facade)** | **Sí** | **No** | **No (brecha crítica)** |

### Filtros disponibles

1. **Período** (`filterPeriodo`): hoy / última semana / último mes / todos — filtrado en hook (`filterByPeriod`).
2. **Almacén** (`almacenFiltro`): filtrado en hook con soporte correcto de `almacenOrigenId`/`almacenDestinoId` para transferencias.
3. **Tipo** (`filterTipo` interno en `MovementsTable`): filtro local; la opción "TRANSFERENCIA" ahora filtra correctamente por `esTransferencia`.
4. **Búsqueda** (`searchTerm` interno): filtra por `productoNombre`, `productoCodigo` y `usuario` únicamente.

### Exportación

`handleExportToExcel()` en `InventoryPage.tsx` exporta `filteredMovements` (ya filtrado por período y almacén) a Excel con columnas:

Fecha, Producto, Código, Tipo, Motivo, Cantidad, Stock Anterior, Stock Nuevo, Almacén, Establecimiento, Usuario, Observaciones, Documento, Es transferencia, Transferencia ID, Almacén origen, Almacén destino, Tipo transferencia.

Los filtros de período y almacén del hook SÍ se respetan. El filtro de tipo y búsqueda del MovementsTable NO se respetan porque la exportación usa `filteredMovements` del hook, no los datos post-filtro del componente tabla.

---

## 4. Modelo de Datos de MovimientoStock

| Campo | Tipo | Uso actual | Pantalla | Excel | Observación |
|---|---|---|---|---|---|
| `id` | `string` | ID único del movimiento | No | No | Formato `MOV-{ts}-{tipo}-{random}` |
| `productoId` | `string` | FK producto | No (solo para buscar) | No | |
| `productoCodigo` | `string` | Código del producto | Sí | Sí (col "Código") | |
| `productoNombre` | `string` | Nombre del producto | Sí | Sí (col "Producto") | |
| `tipo` | `MovimientoTipo` | ENTRADA/SALIDA/AJUSTE_POSITIVO/etc. | Sí (badge) | Sí | Badge con colores por tipo |
| `motivo` | `MovimientoMotivo` | VENTA/COMPRA/AJUSTE_INVENTARIO/etc. | Sí (badge) | Sí | |
| `cantidad` | `number` | Cantidad del movimiento | Sí (con +/-) | Sí | |
| `cantidadAnterior` | `number` | Stock antes del movimiento | Sí | Sí (col "Stock Anterior") | |
| `cantidadNueva` | `number` | Stock después del movimiento | Sí | Sí (col "Stock Nuevo") | |
| `usuario` | `string` | Nombre del usuario | Sí | Sí | |
| `observaciones` | `string?` | Texto libre | Sí (en col Detalles) | Sí | Mezclado con otros datos en pantalla |
| `documentoReferencia` | `string?` | Referencia externa | Sí (en col Detalles, prefijo "Doc:") | Sí (col "Documento") | No tiene columna propia en pantalla |
| `fecha` | `Date` | Fecha/hora del movimiento | Sí | Sí | |
| `ubicacion` | `string?` | Campo legacy | Sí (en Detalles, legacy) | No | Reliquio; prácticamente sin uso |
| `almacenId` | `string` | ID del almacén donde ocurrió | No directamente | No | Usado para filtros |
| `almacenCodigo` | `string` | Código del almacén | Sí (badge en col Almacén) | No | |
| `almacenNombre` | `string` | Nombre del almacén | Sí (col Almacén) | Sí (col "Almacén") | |
| `EstablecimientoId` | `string` | ID del establecimiento | No | No | |
| `EstablecimientoCodigo` | `string` | Código establecimiento | No | No | |
| `EstablecimientoNombre` | `string` | Nombre establecimiento | Sí (subtexto en col Almacén, prefijo "Est:") | Sí (col "Establecimiento") | |
| `esTransferencia` | `boolean?` | Flag de transferencia | Sí (badge en Detalles) | Sí (col "Es transferencia") | |
| `transferenciaId` | `string?` | ID del TRF | Sí (en Detalles como "ID Transferencia:") | Sí (col "Transferencia ID") | |
| `tipoTransferencia` | `'INTRA_ESTABLECIMIENTO' \| 'INTER_ESTABLECIMIENTO'?` | Tipo de transferencia | No | Sí | No se muestra en pantalla |
| `almacenOrigenId` | `string?` | ID almacén origen | No | No | Usado para filtros |
| `almacenOrigenNombre` | `string?` | Nombre almacén origen | Sí (en badge Detalles "Desde almacén:") | Sí | Visible solo si es transferencia |
| `almacenDestinoId` | `string?` | ID almacén destino | No | No | Usado para filtros |
| `almacenDestinoNombre` | `string?` | Nombre almacén destino | Sí (en badge Detalles "Hacia almacén:") | Sí | Visible solo si es transferencia |
| `movimientoRelacionadoId` | `string?` | ID del movimiento par | No | No | Nunca visible en pantalla ni Excel |

---

## 5. Fuentes que Generan Movimientos

| Flujo | Archivo / Función | Tipo | Motivo | documentoReferencia | Stock ant/nuevo | En tabla | En Excel | Estado |
|---|---|---|---|---|---|---|---|---|
| Ajuste unitario manual | `useInventory.handleStockAdjustment` → `InventoryService.registerAdjustment` | ENTRADA / SALIDA / AJUSTE_POSITIVO / AJUSTE_NEGATIVO | COMPRA / VENTA / AJUSTE_INVENTARIO / etc. | Libre (del modal) | Sí | Sí | Sí | ✅ OK |
| Importación masiva "actualizar" | `PanelImportacionStock.aplicarImportacion` → `InventoryService.registerAdjustment` | AJUSTE_POSITIVO / AJUSTE_NEGATIVO | AJUSTE_INVENTARIO | `IMP-YYYYMMDD-HHmmss` | Sí | Sí (tras recargar) | Sí | ⚠️ Requiere `reloadMovements()` |
| Importación masiva "sumar ingreso" | Mismo flujo | AJUSTE_POSITIVO | AJUSTE_INVENTARIO | `IMP-YYYYMMDD-HHmmss` | Sí | Sí (tras recargar) | Sí | ⚠️ Mismo motivo que "actualizar"; indistinguible por tipo/motivo |
| Reset de stock | `PanelImportacionStock.confirmarReset` → `InventoryService.registerAdjustment` | AJUSTE_NEGATIVO | AJUSTE_INVENTARIO | `RST-YYYYMMDD-HHmmss` | Sí | Sí (tras recargar) | Sí | ✅ OK (distinguible por prefijo RST en documento) |
| Transferencia intra-establecimiento | `useInventory.handleCreateTransfer` → `InventoryService.registerTransfer` | SALIDA + ENTRADA | TRANSFERENCIA_ALMACEN | Libre (del modal) | Sí | Sí | Sí | ✅ OK |
| Despacho inter-establecimiento | `useInventory.handleDespacharTransfer` → `InventoryService.registerTransferSalida` | SALIDA | TRANSFERENCIA_ALMACEN | Del campo referencia del modal | Sí | Sí | Sí | ✅ OK |
| Recepción inter-establecimiento | `useInventory.handleRecibirTransfer` → `InventoryService.registerTransferEntrada` | ENTRADA | TRANSFERENCIA_ALMACEN | Del campo referencia del modal | Sí | Sí | Sí | ✅ OK |
| Anulación de transferencia | `useInventory.handleAnularTransfer` → `InventoryService.registerTransferAnulacion` | ENTRADA / (SALIDA+ENTRADA) | TRANSFERENCIA_ALMACEN | Del campo referencia original | Sí | Sí | Sí | ✅ OK, pero anulación no marcada con campo especial |
| Venta/comprobante | `useComprobanteActions` → `useInventoryFacade.addMovimiento` | SALIDA | VENTA | `numeroComprobante` (serial como "F001-00001") | Sí | ⚠️ Solo tras re-mount o `reloadMovements()` | Sí (si el tab se recarga) | 🔴 No actualiza estado del hook en tiempo real |
| Anulación de comprobante | `ListaComprobantes` → `useInventoryFacade.addMovimiento` | ENTRADA | DEVOLUCION_CLIENTE | `comprobanteId` (UUID interno) | Sí | ⚠️ No en tiempo real | Sí | 🔴 Busca movimientos por UUID pero ventas guardan serial — bug de linkage |
| Nota de crédito devolución | `useComprobanteActions` → `useInventoryFacade.addMovimiento` | ENTRADA | DEVOLUCION_CLIENTE | `numeroComprobante` (serial de la NC) | Sí | ⚠️ No en tiempo real | Sí | ⚠️ No distinguible de reversión de anulación (mismo motivo) |
| MERMA tipo | `InventoryService.registerAdjustment` soportado | MERMA | MERMA / PRODUCTO_DAÑADO | — | Sí | — | — | ⚠️ Inaccesible desde AdjustmentModal (no expone tipo MERMA) |
| DEVOLUCION tipo | `InventoryService.registerAdjustment` soportado | DEVOLUCION | DEVOLUCION_PROVEEDOR / DEVOLUCION_CLIENTE | — | Sí | — | — | ⚠️ Inaccesible desde AdjustmentModal (no expone tipo DEVOLUCION) |
| Compra formal | No implementado | — | — | — | — | — | — | ⛔ Fuera de alcance — no existe módulo de compras |
| Actualización masiva (hook) | `useInventory.handleMassStockUpdate` → `InventoryService.processMassUpdate` | AJUSTE_POSITIVO / AJUSTE_NEGATIVO | Heredado del motivo pasado | Vacío (`''`) | Sí | Sí | Sí | ✅ Pero documentoReferencia vacío |

---

## 6. Evaluación por Flujo

### A. Ajuste Unitario

- **Genera:** 1 movimiento de tipo ENTRADA / SALIDA / AJUSTE_POSITIVO / AJUSTE_NEGATIVO, motivo seleccionable.
- **cantidadAnterior/cantidadNueva:** Correctos (`inventory.service.ts:114-131`).
- **Aparece en tabla:** Sí, en tiempo real.
- **Exporta:** Sí, con todos los campos.
- **Documentación:** `documentoReferencia` libre (campo "Documento" en modal). Opcional, puede quedar vacío.
- **Limitación:** El modal solo expone 4 tipos (ENTRADA, SALIDA, AJUSTE_POSITIVO, AJUSTE_NEGATIVO). Los tipos MERMA y DEVOLUCION definidos en el modelo son **inaccesibles** desde la UI.

### B. Importación Masiva

**Modo "Actualizar stock final":**
- Genera AJUSTE_POSITIVO o AJUSTE_NEGATIVO según si la diferencia es positiva o negativa.
- Motivo: `AJUSTE_INVENTARIO`.
- `documentoReferencia: 'IMP-YYYYMMDD-HHmmss'` — útil para agrupar el lote.
- `observaciones: 'Importación masiva: {anterior} → {nuevo}'`.
- Aparece en Movimientos: Sí, pero solo después de llamar `reloadMovements()` (que sí se llama a través de `onRecargarMovimientos` en `PanelImportacionStock.tsx:487`).

**Modo "Sumar ingreso de stock":**
- Genera siempre AJUSTE_POSITIVO.
- `documentoReferencia: 'IMP-YYYYMMDD-HHmmss'` — mismo prefijo que modo actualizar.
- `observaciones: 'Ingreso masivo: {anterior} + {cantidad} → {final}'`.
- **Problema:** En el Kardex, el tipo y motivo son idénticos entre "Actualizar" y "Sumar ingreso". Solo la observación distingue el origen. No hay campo `origenFlujo` o similar.

**Reset de stock:**
- Genera AJUSTE_NEGATIVO con motivo AJUSTE_INVENTARIO.
- `documentoReferencia: 'RST-YYYYMMDD-HHmmss'` — prefijo distinto, distinguible.
- `observaciones: 'Reseteo masivo a cero — RST-...'`.
- Stock anterior correcto (se lee antes de aplicar).

### C. Reset de Stock

- Distinguible en exportación por el prefijo `RST-` en documentoReferencia.
- El observaciones confirma el contexto.
- Genera un movimiento por producto×almacén, todos con el mismo loteId.
- ✅ Trazable.

### D. Transferencias

**Intra-establecimiento:**
- Genera 2 movimientos: SALIDA en origen, ENTRADA en destino.
- Ambos con `transferenciaId: 'TRF-YYYYMMDD-HHmmss'`, `esTransferencia: true`.
- Vinculados por `movimientoRelacionadoId`.
- `cantidadAnterior` y `cantidadNueva` calculados correctamente por almacén.
- Badge visible en tabla. ID TRF visible en Detalles.
- El filtro "Transferencias" muestra ambos movimientos.

**Inter-establecimiento (despacho):**
- Genera 1 movimiento SALIDA en origen. El `transferenciaId` del TRF.
- Stock del destino no cambia hasta la recepción.

**Inter-establecimiento (recepción):**
- Genera 1 movimiento ENTRADA en destino.
- Vinculado al despacho vía `movimientoRelacionadoId`.

**Anulación de transferencia:**
- Genera movimientos inversos (1 ENTRADA para EN_TRANSITO; SALIDA+ENTRADA para CONFIRMADA/RECIBIDA).
- Usan el mismo `transferenciaId` original — correcto para trazabilidad.
- `observaciones: 'Anulación de TRF-...'` — legible.
- **Limitación:** No existe campo de estado "ANULADO" en el movimiento mismo; solo en la entidad `Transferencia`. Un auditor que solo mire la tabla de movimientos verá ENTRADA con motivo TRANSFERENCIA_ALMACEN sin saber que es una reversión.

### E. Ventas / Comprobantes

- Flujo: `useComprobanteActions` → `useInventoryFacade.addMovimiento` → `StockRepository.addMovement`.
- Tipo: SALIDA, Motivo: VENTA.
- `documentoReferencia: numeroComprobante` (ej: "F001-00001") — legible y trazable.
- `cantidadAnterior/cantidadNueva` calculados correctamente en la fachada.
- `almacenId` resuelto vía FIFO por establecimiento.

**Brecha crítica:** La fachada escribe directamente en `StockRepository` sin notificar al hook de inventario. Si el usuario tiene el tab Movimientos abierto mientras hace una venta, NO verá el nuevo movimiento. Solo lo verá si:
  - Navega fuera y vuelve al módulo de inventario (re-mount del hook), o
  - Hay algún evento que dispare `reloadMovements()`.

### F. Anulación de Comprobantes

- Flujo: `ListaComprobantes` → `addMovimientoVoid` (fachada).
- Tipo: ENTRADA, Motivo: DEVOLUCION_CLIENTE.
- `documentoReferencia: comprobanteId` = **UUID interno del comprobante**.

**Bug de linkage crítico (`ListaComprobantes.tsx:714-724`):**
```typescript
const comprobanteId: string = selectedInvoiceForVoid.id ?? '';
const movimientosSalida = todosLosMovimientos.filter(
  (m) => m.documentoReferencia === comprobanteId && m.tipo === 'SALIDA' && m.motivo === 'VENTA'
);
```

La búsqueda usa el UUID del comprobante. Pero las ventas guardan `documentoReferencia: numeroComprobante` (serial como "F001-00001"). El filtro no encontrará ningún movimiento de salida. La idempotencia verifica `yaRevertido` que también falla (mismo motivo de búsqueda). Resultado: la anulación **no restaura el stock** aunque el código pretende hacerlo. Solo existe la entrada de reversión guardada, pero el stock no se actualiza correctamente.

### G. Nota de Crédito / Devolución

- Flujo: `useComprobanteActions` → `addMovimientoStock` (fachada).
- Solo aplica para códigos NC 06 y 07 (devolución física).
- Tipo: ENTRADA, Motivo: DEVOLUCION_CLIENTE.
- `documentoReferencia: numeroComprobante` (serial de la NC).
- Busca movimientos originales por `docAfectado = data.noteCreditData?.documentoRelacionado?.numeroCompleto` — serial correcto.
- Devuelve al almacén original de forma proporcional (correcto).
- `observaciones: 'Devolución NC F002-... / Ref: F001-...'` — legible.

**Limitación:** El motivo DEVOLUCION_CLIENTE es el mismo que usa la reversión por anulación de comprobante. Un auditor no puede distinguir desde la tabla si el movimiento es una devolución real de cliente o una reversión por anulación. Solo la observación lo indica.

### H. Otros Flujos

- **Actualización masiva del hook (`handleMassStockUpdate`):** Genera movimientos correctamente, los agrega al estado. `documentoReferencia: ''` (cadena vacía) — sin referencia. Usado internamente, accesible desde el panel de importación (ruta alternativa).
- **Stock reservado:** `stockReservadoPorAlmacen` existe en el modelo del producto pero no genera movimientos de ningún tipo. Es un campo de UI.

---

## 7. Evaluación de Filtros

| Filtro | Funciona | Alcance | Problema detectado |
|---|---|---|---|
| Período (hoy/semana/mes/todo) | Sí | Hook-level (`filteredMovements`) | Exportación respeta este filtro ✅ |
| Almacén | Sí | Hook-level + tabla | Hook filtra correctamente incluyendo `almacenOrigenId`/`almacenDestinoId` ✅ |
| Tipo (tabla interna) | Sí | Solo tabla | "Transferencias" ahora filtra por `esTransferencia` ✅; no afecta exportación ⚠️ |
| Búsqueda texto | Parcial | Solo tabla | Solo busca por `productoNombre`, `productoCodigo`, `usuario`. **No busca por `documentoReferencia`, `transferenciaId`, `almacenNombre` ni `observaciones`** ❌ |
| Combinación período + almacén | Sí | Hook-level | Funciona correctamente |
| Combinación tipo + búsqueda | Sí | Tabla | Funciona, pero tipo no afecta exportación |

**Limitación de exportación:** La exportación exporta `filteredMovements` del hook (filtrado por período y almacén) pero no aplica el filtro de tipo ni la búsqueda del componente tabla. Si el usuario filtra por "Transferencias" y exporta, el Excel incluirá todos los movimientos del período/almacén, no solo las transferencias.

---

## 8. Evaluación de Visualización

### Columnas actuales en pantalla

| Columna | Contenido | Observación |
|---|---|---|
| Fecha y Hora | Timestamp formateado | Correcta. Un campo. |
| Producto | Nombre + código (2 líneas) | Correcta. |
| Tipo | Badge con color | Correcta pero "Transferencia" y "Devolución" tienen el mismo color violeta. |
| Motivo | Badge gris | Correcta. |
| Almacén | Código + Nombre + "Est: ..." (hasta 3 líneas) | **Sobrecargada.** El texto "Est:" hace la celda alta. |
| Cantidad | +N o -N en color | Correcta. |
| Stock Ant → Nuevo | Número anterior → nuevo | No indica a qué almacén corresponde (ambiguo en transferencias). |
| Usuario | Avatar + nombre | Correcta. |
| Detalles | Badge TRF + observaciones + "Doc: ..." + ubicacion | **Muy sobrecargada.** Mezcla 4 tipos de información distintos. Las filas con transferencia crecen verticalmente. |

### Problemas de visualización

1. **Columna Detalles**: El badge de transferencia (con almacén origen/destino y TRF ID) ocupa varias líneas. Junto a observaciones y el documento de referencia, la celda puede tener 5-6 líneas de texto. Las filas de transferencia son el doble de altas que el resto.

2. **documentoReferencia sin columna propia**: El número de factura ("F001-00001") que permite rastrear el movimiento al comprobante original está oculto en Detalles como "Doc: F001-00001". No tiene columna propia y no es searchable.

3. **transferenciaId visible solo en Detalles**: El código TRF-... está en el badge de Detalles. No es searchable.

4. **movimientoRelacionadoId nunca visible**: El vínculo entre el movimiento de SALIDA y su ENTRADA complementaria no se muestra en ninguna vista.

5. **tipoTransferencia nunca visible en pantalla**: Solo en Excel. No se puede distinguir visualmente si una transferencia es intra o inter establecimiento.

6. **MERMA y DEVOLUCION tienen el mismo badge color que TRANSFERENCIA y DEVOLUCION** (ambos violeta). Difícil distinguir visualmente.

7. **Badge negativo incorrecto para transferencias ENTRADA**: En la columna Cantidad, ENTRADA muestra verde (+) y SALIDA rojo (-). Para transferencias, ambos son correctos por sí solos, pero vistos juntos en la lista no se puede determinar que están vinculados.

---

## 9. Evaluación de Exportación Excel

### Columnas actuales exportadas

Fecha, Producto, Código, Tipo, Motivo, Cantidad, Stock Anterior, Stock Nuevo, Almacén, Establecimiento, Usuario, Observaciones, Documento, Es transferencia, Transferencia ID, Almacén origen, Almacén destino, Tipo transferencia.

### Análisis

| Aspecto | Estado | Detalle |
|---|---|---|
| Respeta filtro período | Sí | ✅ |
| Respeta filtro almacén | Sí | ✅ |
| Respeta filtro tipo (tabla) | **No** | La exportación usa `filteredMovements` del hook, no los datos post-filtro de la tabla |
| Respeta búsqueda texto (tabla) | **No** | Misma razón |
| `transferenciaId` exportado | Sí | ✅ Columna "Transferencia ID" |
| Almacén origen/destino exportado | Sí | ✅ |
| `movimientoRelacionadoId` exportado | **No** | No está en ninguna columna del Excel |
| `almacenId` (UUID) exportado | **No** | Solo el nombre, no el ID para joins |
| `productoId` exportado | **No** | Solo código y nombre |
| Distinción anulación vs devolución | **No** | Mismo motivo DEVOLUCION_CLIENTE para ambos |
| Distinción importación actualizar vs sumar | **No** | Mismo tipo y motivo; solo difiere en observaciones |
| ID del movimiento exportado | **No** | El `id` del movimiento no se exporta; impide trazabilidad técnica completa |
| Observaciones mezcladas con detalles | Parcial | Observaciones tiene columna propia, pero "Doc:" es una columna separada. Mejor que en pantalla. |

### Propuesta de columnas ideales para exportación

```
ID Movimiento | Fecha | Producto | Código | Tipo | Motivo | Fuente | 
Almacén | Código Almacén | Establecimiento |
Cantidad | Stock Anterior | Stock Nuevo |
Referencia Documento | Observaciones |
Es Transferencia | Transferencia ID | Tipo Transferencia | 
Almacén Origen | Almacén Destino | Mov. Relacionado |
Usuario
```

La columna "Fuente" podría ser: "Ajuste manual", "Importación IMP-...", "Reset RST-...", "Transferencia", "Venta", "Devolución", "Anulación". Se puede inferir del motivo y del prefijo del documentoReferencia.

---

## 10. Problemas Detectados

| ID | Severidad | Problema | Evidencia técnica | Impacto funcional | Recomendación |
|---|---|---|---|---|---|
| P1 | **Crítico** | Los movimientos de venta, NC y anulación de comprobante NO actualizan el estado del hook en tiempo real | `useComprobanteActions.tsx` usa `useInventoryFacade.addMovimiento` que escribe en `StockRepository` sin notificar al hook. `useInventory.ts:77-79` carga solo en mount. | El tab Movimientos muestra una lista desactualizada para flujos de facturación | Emitir un evento o ejecutar `reloadMovements()` después de cada operación de comprobante. O suscribir el hook a cambios del repositorio. |
| P2 | **Crítico** | La anulación de comprobante busca movimientos por UUID interno (`comprobanteId`) pero la venta guarda el serial ("F001-00001") | `ListaComprobantes.tsx:717`: `m.documentoReferencia === comprobanteId` vs `useComprobanteActions.tsx:595`: `documentoReferencia: numeroComprobante` | La anulación no restaura el stock. El Kardex queda inconsistente. | Unificar la clave de búsqueda: usar siempre el serial del comprobante como `documentoReferencia`. |
| P3 | **Alto** | Búsqueda en tabla no incluye `documentoReferencia`, `transferenciaId`, `almacenNombre` ni `observaciones` | `MovementsTable.tsx:80-83` | Usuario no puede buscar movimientos por número de factura o código TRF | Ampliar el `matchesSearch` para incluir estos campos |
| P4 | **Alto** | La exportación no respeta los filtros de tipo y búsqueda del componente tabla | `InventoryPage.tsx:73`: exporta `filteredMovements` del hook, no los datos post-filtro del componente | Un usuario filtra "Transferencias" y exporta, pero recibe todos los movimientos | Pasar los datos ya filtrados al exportador, o filtrar en el handler de exportación |
| P5 | **Alto** | MERMA y DEVOLUCION son tipos de movimiento inaccesibles desde AdjustmentModal | `AdjustmentModal.tsx:318`: solo expone 4 tipos. `inventory.types.ts:6-13`: MERMA y DEVOLUCION existen. | Usuarios no pueden registrar mermas o devoluciones de proveedor directamente | Agregar botones/opciones para MERMA y DEVOLUCION en el modal |
| P6 | **Medio** | `movimientoRelacionadoId` nunca se muestra ni exporta | Existe en `inventory.types.ts:65` pero no aparece en pantalla ni en Excel | No se puede vincular visualmente SALIDA ↔ ENTRADA de la misma transferencia desde el Kardex | Agregar al Excel; en pantalla podría ser un enlace o referencia en Detalles |
| P7 | **Medio** | La anulación de transferencia no marca los movimientos como "anulación" | Los movimientos de reversión tienen `observaciones: 'Anulación de TRF-...'` pero no tienen un campo de tipo especial | Un auditor no distingue en el Kardex entre un movimiento normal y uno de reversión | Agregar un campo `esAnulacion?: boolean` o un motivo específico como `ANULACION_TRANSFERENCIA` |
| P8 | **Medio** | No se puede distinguir en el Kardex entre NC por devolución y reversión por anulación de comprobante | Ambos usan ENTRADA + DEVOLUCION_CLIENTE. Solo las observaciones diferencian. | Reportes agrupados por tipo de movimiento no distinguen estos dos casos | Crear motivos separados: `ANULACION_COMPROBANTE` o similar |
| P9 | **Medio** | No se puede distinguir entre modo "Actualizar stock final" y "Sumar ingreso" en el Kardex | Ambos generan AJUSTE_POSITIVO/NEGATIVO + AJUSTE_INVENTARIO. Solo difieren en la observación. | El Kardex no comunica si el ajuste fue masivo de tipo actualización o sumatorio | Agregar un campo o prefijo diferenciador en el motivo o un campo `origenFlujo` |
| P10 | **Medio** | La columna Detalles está sobrecargada y hace las filas de transferencia el doble de altas | `MovementsTable.tsx:272-309`: agrupa badge TRF + observaciones + documento + ubicacion legacy | Legibilidad reducida; interfaz densa y difícil de escanear | Separar documentoReferencia a su propia columna; mover badge TRF a columna de Tipo o Almacén |
| P11 | **Bajo** | `tipoTransferencia` ('INTRA'/'INTER') se exporta en Excel pero no se muestra en pantalla | `MovementsTable.tsx` no tiene columna para esto | Usuario no puede ver en pantalla si una transferencia es inter-establecimiento | Agregar un badge o indicador compacto en la columna Tipo o Almacén |
| P12 | **Bajo** | El ID del movimiento (`id`) no se exporta en Excel | `InventoryPage.tsx:73-91`: no incluye `mov.id` | Imposible hacer un join técnico entre exportaciones | Agregar columna "ID Movimiento" al Excel |
| P13 | **Bajo** | `ubicacion` (campo legacy) sigue apareciendo en la columna Detalles | `MovementsTable.tsx:303-308` | Ruido visual para movimientos que tienen este campo de una versión anterior | Evaluar si eliminar o mover a un detalle expandible |
| P14 | **Bajo** | La actualización masiva del hook (`handleMassStockUpdate`) guarda `documentoReferencia: ''` | `inventory.service.ts:349`: `documentoReferencia: ''` hardcodeado | Movimientos de actualización masiva sin referencia rastreable | Permitir pasar un identificador de lote opcional |

---

## 11. Qué Está Bien y Debe Mantenerse

- **`StockRepository`** como fuente única de persistencia para todos los movimientos — patrón correcto.
- **`cantidadAnterior` y `cantidadNueva`** se guardan correctamente en todos los flujos via el servicio.
- **Filtro de período** funciona correctamente en el hook.
- **Filtro de almacén** en el hook ahora incluye correctamente `almacenOrigenId` / `almacenDestinoId` para transferencias.
- **Filtro "Transferencias"** en la tabla ahora filtra por `esTransferencia` en vez de por tipo literal.
- **`transferenciaId` en formato TRF-YYYYMMDD-HHmmss** — legible y distintivo.
- **Movimientos de importación masiva** con prefijo `IMP-...` en documentoReferencia — distinguibles.
- **Movimientos de reset** con prefijo `RST-...` — distinguibles.
- **La NC** busca movimientos originales por serial del comprobante afectado — patrón correcto.
- **Idempotencia en anulación de comprobante** — el intento existe aunque la lógica de búsqueda esté rota.
- **`esTransferencia`, `transferenciaId`, `almacenOrigenNombre`, `almacenDestinoNombre`** exportados en Excel.
- **Badge de tipo** con colores semánticos (verde = entrada, rojo = salida, azul = ajuste +, naranja = ajuste -, violeta = devolución/transferencia).
- **Paginación** en la tabla de movimientos con selector de items por página.
- **Scoping de localStorage** por tenant (`lsKey`) en `StockRepository` — correcto.

---

## 12. Qué Falta para que Sea un Kardex Completo

| Brecha | Descripción |
|---|---|
| Sincronización en tiempo real con ventas | Los movimientos de ventas/NC/anulación no refrescan el tab automáticamente |
| Linkage anulación → venta | Bug de documentoReferencia UUID vs serial |
| Búsqueda por referencia/documento | No se puede buscar por número de factura ni por TRF |
| Exportación respeta filtros de tabla | El tipo y búsqueda seleccionados no afectan el Excel |
| Motivo "anulación" diferenciado | Las reversiones no tienen un motivo/tipo propio |
| Acceso a tipos MERMA y DEVOLUCION | Inaccesibles desde la UI |
| `movimientoRelacionadoId` visible | El par SALIDA↔ENTRADA de una misma transferencia no es navegable |
| Vista por producto (Kardex individual) | No existe vista de un solo producto con su historial completo ordenado |
| Indicador intra/inter en pantalla | No se ve si una transferencia es inter-establecimiento |

---

## 13. Recomendaciones Priorizadas

| Recomendación | Prioridad | Tipo | Riesgo si no se hace | Cambio visual |
|---|---|---|---|---|
| Corregir bug documentoReferencia en anulación de comprobante (P2) | P0 | Corrección lógica | Stock no se restaura al anular; datos inconsistentes | No |
| Sincronizar movimientos de venta/NC/anulación con estado del hook (P1) | P0 | Corrección arquitectural | Kardex muestra datos desactualizados para el flujo principal | No |
| Ampliar búsqueda con documentoReferencia, transferenciaId, almacenNombre (P3) | P1 | Corrección funcional | Auditoría por factura imposible desde la tabla | No |
| Exportación respeta filtros de tabla (tipo + búsqueda) (P4) | P1 | Corrección de exportación | Exportar "Transferencias" exporta todos los movimientos | No |
| Agregar tipos MERMA y DEVOLUCION en AdjustmentModal (P5) | P1 | Feature faltante | Registrar mermas requiere workaround | Mínimo |
| Agregar ID del movimiento y movimientoRelacionadoId en Excel (P6, P12) | P2 | Mejora exportación | Trazabilidad técnica imposible en auditorías | No |
| Separar documentoReferencia a columna propia en tabla (P10) | P2 | Mejora visual | Detalles sobrecargados, legibilidad deficiente | Sí |
| Motivo diferenciado para anulación de comprobante (P8) | P2 | Mejora auditoría | NC y anulación indistinguibles en reportes | No |
| Indicador intra/inter en pantalla para transferencias (P11) | P3 | Mejora visual | Información solo en Excel | Mínimo |
| Marcar movimientos de anulación de transferencia (P7) | P3 | Mejora auditoría | Reversiones indistinguibles de movimientos normales | No |
| Vista Kardex por producto individual | P3 | Feature nueva | No existe historial por producto | Sí |
| Distinguir modo importación masiva en motivo (P9) | P3 | Mejora auditoría | IMP actualizar e IMP sumar indistinguibles | No |

---

## 14. Propuesta Conceptual de Tabla Limpia

**Sin implementar. Solo referencia para próximas iteraciones.**

### Columnas visibles en pantalla (compactas)

| Columna | Contenido | Ancho |
|---|---|---|
| Fecha | DD/MM HH:mm | Fijo compacto |
| Producto | Nombre (truncado) + código debajo | Amplio |
| Tipo | Badge (ENTRADA / SALIDA / AJ+ / AJ- / MERMA / DEV) | Fijo |
| Motivo | Texto corto: Venta · Ajuste · Transferencia · Devolución · etc. | Medio |
| Cant. | +N / -N con color | Fijo |
| Stock ant→nuevo | Números | Fijo |
| Almacén | Solo nombre (sin "Est:") | Medio |
| Ref. / Doc. | Número factura, TRF-... o IMP-... | Medio |
| Usuario | Inicial + nombre | Compacto |
| Acciones | Botón "Ver detalle" | Fijo |

### En el modal "Ver detalle" de cada movimiento

- Establecimiento completo
- Stock anterior y nuevo con contexto de almacén
- Observaciones completas
- Movimiento relacionado (con link si aplica)
- ID del movimiento
- Tipo de transferencia (intra/inter)
- Almacén origen y destino completos
- Fecha completa con hora

### En el Excel (para auditoría)

Todas las columnas actuales + `ID Movimiento`, `Movimiento Relacionado ID`, `Código Almacén`, `Es Anulación`, `Fuente` (ajuste/importación/transferencia/venta/NC).

### Qué ocultar en la grilla

- ID interno del movimiento
- IDs de almacén
- Observaciones largas (mover a detalle)
- Badge TRF con almacén origen/destino (mover a detalle)
- `ubicacion` legacy

---

## 15. Conclusión Final

**¿Movimientos centraliza todo?**
Parcialmente. Centraliza ajustes manuales, importaciones y transferencias. Los movimientos de ventas, NC y anulaciones de comprobantes llegan tarde (no en tiempo real) y tienen un bug activo de linkage en la anulación.

**¿Hay algo que no esté entrando?**
Sí: las compras formales (módulo no implementado), y los movimientos de anulación de comprobante que en la práctica no restauran el stock correctamente.

**¿La vista es confiable?**
Para ajustes y transferencias: sí. Para ventas y anulaciones de comprobantes: no confiable como Kardex en tiempo real.

**¿La exportación es suficiente?**
No del todo. No respeta los filtros visuales (tipo, búsqueda). Falta el ID del movimiento y el vínculo entre movimientos relacionados. No distingue entre NC y reversión de anulación.

**¿Qué corregir primero?**
1. Bug P2 (linkage anulación → venta): sin este fix, el stock real puede diferir del stock en Kardex silenciosamente.
2. Bug P1 (sincronización en tiempo real): el tab debe mostrar movimientos de venta sin que el usuario deba navegar y volver.

**¿Qué mejorar visualmente después?**
Separar `documentoReferencia` a columna propia, ampliar búsqueda, limpiar columna Detalles, agregar indicador intra/inter.
