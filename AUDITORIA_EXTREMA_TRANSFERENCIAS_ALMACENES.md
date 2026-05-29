# Auditoría Extrema de Transferencia entre Almacenes

> **Fecha:** 2026-05-29  
> **Auditor:** Arquitecto senior frontend / auditor funcional-técnico  
> **Módulo auditado:** Control de Stock — Transferencia entre Almacenes  
> **Base de trabajo:** Código real leído archivo por archivo. Sin suposiciones.  
> **Alcance:** Solo transferencias dentro de la misma empresa/RUC. Empresas distintas fuera de alcance.

---

## 1. Resumen Ejecutivo

La transferencia entre almacenes **existe y funciona en su flujo principal**: descuenta stock del origen, suma al destino, genera dos movimientos (`SALIDA` + `ENTRADA`) vinculados por un `transferenciaId` compartido, y persiste en localStorage con clave scoped por tenant.

Sin embargo, **no está completa ni lista para producción formal** por los siguientes motivos críticos:

- Hay un **bug confirmado en el filtro de la tabla de movimientos**: cuando el usuario filtra por un almacén, los movimientos de transferencia del almacén complementario desaparecen de la vista.
- La **opción de filtro "Transferencias"** en el selector de tipo de movimiento **nunca devuelve resultados** porque los movimientos de transferencia se guardan como tipo `SALIDA`/`ENTRADA`, no como tipo `TRANSFERENCIA`.
- **La exportación a Excel omite los campos clave de transferencia** (`transferenciaId`, almacén origen, almacén destino).
- **No existe reversión ni anulación**.
- **No existe historial/listado de transferencias** como operación agrupada.
- **No hay código secuencial tipo TRF-0001**. Se usa `TRANS-<timestamp>`.
- **El campo `product.cantidad` (stock total legacy) no se actualiza** durante una transferencia; solo se actualiza `stockPorAlmacen`.
- El flujo es solo **uno-a-uno por producto por transferencia** (no es multi-producto, no es batch).

El modal cumple su función básica y la lógica de servicio es sólida. Puede mantenerse como modal mientras se corrigen los bugs críticos. Convertirlo en un tab propio requeriría correcciones previas más implementación de historial agrupado.

---

## 2. Alcance Revisado

### Archivos leídos completamente

| Archivo | Líneas | Rol |
|---|---|---|
| `components/modals/TransferModal.tsx` | 377 | UI del modal de transferencia |
| `services/inventory.service.ts` | 362 | Lógica de negocio: `registerTransfer()` |
| `models/inventory.types.ts` | 189 | Tipos: `MovimientoStock`, `StockTransferData`, `MovimientoTipo` |
| `hooks/useInventory.ts` | 353 | Orquestación: `handleStockTransfer()`, estado del modal |
| `repositories/stock.repository.ts` | 111 | Persistencia en localStorage |
| `pages/InventoryPage.tsx` | 370 | Página principal, botón "Transferir Stock", exportación |
| `components/tables/MovementsTable.tsx` | 408 | Tabla de movimientos con filtro |
| `utils/inventory.helpers.ts` | 175 | Helpers: `generateTransferId()`, `filterByPeriod()` |
| `api/inventory.facade.ts` | 139 | Fachada usada por otros módulos (no maneja transferencias) |
| `components/panels/AlertsPanel.tsx` | 560 | Panel de alertas |
| `components/panels/SummaryCards.tsx` | 182 | Tarjetas de resumen |
| `components/disponibilidad/DisponibilidadTable.tsx` | 626 | Tabla de stock actual |
| `components/disponibilidad/InventarioSituacionPage.tsx` | 364 | Vista Stock Actual, botón "Transferir" |
| `hooks/useInventarioDisponibilidad.ts` | 504 | Hook de disponibilidad |
| `models/disponibilidad.types.ts` | 144 | Tipos para disponibilidad |

---

## 3. Mapa Actual de Transferencia (Flujo Real)

### Paso a paso desde UI hasta stock

```
1. USUARIO abre InventoryPage
   └── Tabs disponibles: Stock Actual | Movimientos | Alertas | Resumen | Importar

2. USUARIO hace clic en "Transferir Stock"
   ├── Botón visible en: vista "Movimientos", "Alertas", "Resumen" (NO en "Stock Actual" ni "Importar")
   │   [InventoryPage.tsx:291-296] — condición: selectedView !== 'situacion' && selectedView !== 'importar'
   └── También disponible en la toolbar de InventarioSituacionPage (vista Stock Actual)
       [InventarioSituacionPage.tsx:315] — onTransferir={onTransferir}

3. useInventory.openTransferModal() → setShowTransferModal(true)
   [useInventory.ts:306-308]

4. TransferModal se renderiza (isOpen=true)
   [TransferModal.tsx:24-376]
   ├── El usuario busca un producto por nombre o código
   │   └── Filtra: allProducts donde tipoExistencia !== 'SERVICIOS'
   ├── Selecciona almacén ORIGEN (select con todos los almacenes activos)
   │   └── Muestra stock disponible del producto en ese almacén
   │       [TransferModal.tsx:69] selectedProduct?.stockPorAlmacen?.[almacenOrigenId] ?? 0
   ├── Selecciona almacén DESTINO (select filtrado: excluye el origen seleccionado)
   │   └── Muestra stock actual del producto en destino
   ├── Ingresa cantidad (input type="number", min="1", max=stockDisponibleOrigen)
   ├── Opcionalmente ingresa documentoReferencia y observaciones
   └── Hace clic en "Transferir Stock" (botón deshabilitado mientras condiciones no se cumplan)

5. TransferModal.handleSubmit() ejecuta validaciones en UI:
   [TransferModal.tsx:80-124]
   ├── Producto seleccionado
   ├── Almacén origen seleccionado
   ├── Almacén destino seleccionado
   ├── Origen ≠ Destino (alert si iguales)
   ├── cantidad > 0 (alert si no)
   └── cantidad ≤ stockDisponibleOrigen (alert si excede)

6. onTransfer(data) → useInventory.handleStockTransfer(data)
   [useInventory.ts:203-247]
   ├── Verifica permiso 'inventario.transferir'
   ├── Busca product en allProducts
   ├── Busca almacenOrigen y almacenDestino en almacenesActivos
   └── Llama a InventoryService.registerTransfer(product, almacenOrigen, almacenDestino, data, usuario)

7. InventoryService.registerTransfer()
   [inventory.service.ts:167-254]
   ├── Obtiene stockOrigen = product.stockPorAlmacen[almacenOrigenId] ?? 0
   ├── Obtiene stockDestino = product.stockPorAlmacen[almacenDestinoId] ?? 0
   ├── Valida: stockOrigen >= data.cantidad → lanza Error si no
   ├── Genera transferenciaId = `TRANS-${Date.now()}`
   ├── updatedProduct = updateStock(product, almacenOrigenId, stockOrigen - cantidad)
   │   Luego:    updateStock(updatedProduct, almacenDestinoId, stockDestino + cantidad)
   ├── Crea movimientoSalida (tipo='SALIDA', motivo='TRANSFERENCIA_ALMACEN', esTransferencia=true)
   ├── Crea movimientoEntrada (tipo='ENTRADA', motivo='TRANSFERENCIA_ALMACEN', esTransferencia=true)
   ├── Vincula: movimientoSalida.movimientoRelacionadoId = movimientoEntrada.id
   │           movimientoEntrada.movimientoRelacionadoId = movimientoSalida.id
   ├── Ambos comparten transferenciaId
   └── StockRepository.addMovements([movimientoSalida, movimientoEntrada])

8. De vuelta en useInventory.handleStockTransfer():
   ├── updateProduct(result.product.id, result.product) → actualiza stockPorAlmacen en ProductStore
   ├── setMovimientos(prev => [...result.movements, ...prev]) → actualiza lista de movimientos en memoria
   └── success("...") → muestra notificación de éxito

9. Reactividad automática (useMemo):
   ├── stockAlerts recalcula desde allProducts + almacenesActivos
   ├── stockSummary recalcula desde allProducts
   └── datosDisponibilidad en DisponibilidadTable recalcula desde allProducts
```

---

## 4. Mapa Técnico Actual

| Archivo | Responsabilidad | Lógica de transferencia contenida | Observación |
|---|---|---|---|
| `TransferModal.tsx` | UI de entrada de datos | Validación de UI, cálculo visual de stock origen/destino | Sin separación intra/inter establecimiento; usa alert() nativo |
| `inventory.service.ts` | Lógica de negocio pura | `registerTransfer()`: genera ID, actualiza stock, crea ambos movimientos | No actualiza `product.cantidad` (legacy); `transferenciaId` basado en timestamp |
| `inventory.types.ts` | Definición de tipos | `StockTransferData`, `MovimientoStock` con campos de transferencia | Tipo `TRANSFERENCIA` definido pero nunca usado en transferencias reales |
| `useInventory.ts` | Orquestación de estado | `handleStockTransfer()`: permisos, buscar entidades, llamar servicio, actualizar estado | Solo busca almacenes en `almacenesActivos`; no diferencia intra/inter establecimiento |
| `stock.repository.ts` | Persistencia | `addMovements()`: guarda ambos movimientos en localStorage en una sola escritura | Pseudoatómico (JavaScript single-threaded); no hay backend |
| `InventoryPage.tsx` | Página contenedora | Botón "Transferir Stock", export Excel, renderiza TransferModal | Botón ausente en vista "Stock Actual" y "Importar"; export no incluye campos de transferencia |
| `InventarioSituacionPage.tsx` | Vista Stock Actual | Pasa `onTransferir` a toolbar | Correcto; sin lógica propia de transferencia |
| `MovementsTable.tsx` | Tabla de historial | Muestra badge de transferencia con origen/destino; filtro por tipo incluye 'TRANSFERENCIA' | **BUG**: filtro interno por almacén ignora `almacenOrigenId`/`almacenDestinoId`; opción 'TRANSFERENCIA' vacía |
| `AlertsPanel.tsx` | Panel de alertas | No involucrado directamente | Recalcula post-transferencia vía useMemo |
| `SummaryCards.tsx` | Resumen de inventario | No involucrado directamente | Recalcula post-transferencia vía useMemo |
| `inventory.helpers.ts` | Utilidades | `generateTransferId()` definido pero NO usado en producción | `registerTransfer` usa su propio `TRANS-${Date.now()}` en vez de este helper |
| `inventory.facade.ts` | API de compatibilidad | No maneja transferencias | Sí actualiza `product.cantidad` y `stockPorEstablecimiento`; la ruta de transferencia no pasa por aquí |

---

## 5. Evaluación Funcional

| Funcionalidad esperada | Existe | Estado | Evidencia técnica | Observación |
|---|---|---|---|---|
| Selección de almacén origen | Sí | Correcto | `TransferModal.tsx:212-235` — select con todos los almacenes activos | Muestra nombre de establecimiento junto al almacén |
| Selección de almacén destino | Sí | Correcto | `TransferModal.tsx:253-279` — select excluye el origen | `almacenes.filter(wh => wh.id !== almacenOrigenId)` |
| Selección de producto | Sí | Correcto | `TransferModal.tsx:161-197` — búsqueda con dropdown, excluye SERVICIOS | No filtra por stock mínimo; permite seleccionar producto con stock 0 en origen |
| Ingreso de cantidad | Sí | Parcialmente correcto | `TransferModal.tsx:288-303` — `min="1"` en input HTML | El `min="1"` en HTML puede ser ignorado; validación real está en `handleSubmit`. No bloquea decimales en input tipo "number" |
| Validación: stock suficiente en origen | Sí | Correcto | Modal: `TransferModal.tsx:108-111`; Servicio: `inventory.service.ts:178-180` | Doble validación (UI + servicio). El servicio lanza `Error` si falla |
| Bloqueo de cantidad = 0 | Sí | Correcto | `TransferModal.tsx:103-106`: `cantidadNum <= 0` bloquea | |
| Bloqueo de cantidad negativa | Sí | Correcto | Misma validación anterior | |
| Bloqueo de origen = destino | Sí | Correcto | `TransferModal.tsx:97-100` + `almacenes.filter(wh => wh.id !== almacenOrigenId)` (doble protección) | |
| Decimales en cantidad | Permitido | Riesgo bajo | Input type="number" sin `step`; no hay validación de entero en el servicio | Si el producto usa unidades enteras, puede ingresarse 1.5 sin error |
| Descuento correcto del origen | Sí | Correcto | `inventory.service.ts:185`: `stockOrigen - data.cantidad` | |
| Suma correcta al destino | Sí | Correcto | `inventory.service.ts:186`: `stockDestino + data.cantidad` | |
| Creación de stock en destino si no existía | Sí | Correcto | `updateStock()` usa spread: `{ ...product.stockPorAlmacen, [almacenId]: nuevoStock }` — crea la clave si no existía | |
| Generación de dos movimientos | Sí | Correcto | `inventory.service.ts:188-251` — `movimientoSalida` + `movimientoEntrada` | Ambos con `esTransferencia: true`, `transferenciaId` compartido |
| Movimientos vinculados entre sí | Sí | Correcto | `movimientoRelacionadoId` cruzado entre ambos | |
| Código de transferencia (tipo TRF) | Parcialmente | Incompleto | `transferenciaId = TRANS-${Date.now()}` — no es TRF, no es secuencial | `generateTransferId()` en helpers.ts existe pero no se usa aquí |
| `documentoReferencia` compartido | Sí | Correcto | Mismo `data.documentoReferencia` asignado a ambos movimientos | Campo de texto libre; no tipificado como guía de remisión |
| Stock negativo posible | No | Correcto | El servicio valida `stockOrigen < data.cantidad` y lanza Error | `updateStock()` tiene `allowNegativeStock` pero no se pasa en transferencias |
| Permiso requerido | Sí | Correcto | `useInventory.ts:205-213` — verifica `'inventario.transferir'` | |
| Reversión / anulación | No | Ausente | No existe ningún método ni endpoint de anulación | Riesgo crítico para trazabilidad |
| Estado de transferencia | No | Ausente | No hay campo `estado` (borrador, pendiente, confirmado, anulado) | |
| Código secuencial (TRF-0001) | No | Ausente | `TRANS-${Date.now()}` no es secuencial ni legible | |
| Distinción intra/inter establecimiento | No | Ausente | Ambos tipos usan exactamente el mismo flujo y campos | Riesgo para futura integración con guía de remisión |
| Guía de remisión | No | Ausente (campo libre existe) | `documentoReferencia` acepta texto libre como "GUIA-001" | No hay entidad guía ni validación de formato |
| Nota de ingreso / nota de salida | No | Ausente | No hay relación formal | |
| Historial agrupado de transferencias | No | Ausente | Solo movimientos individuales visibles | El usuario no puede ver "la transferencia TRF-X como unidad" |
| Transferencia multi-producto | No | Ausente | Un producto por operación | |
| Transferencia entre establecimientos | Sí (sin control) | Riesgo | El modal lista todos los almacenes activos sin distinguir establecimiento origen | No hay validación ni marcado especial |
| Transferencia entre empresas | No (sin control) | Fuera de alcance | No aplica en el alcance actual | |

---

## 6. Evaluación Kardex

| Pregunta | Resultado | Evidencia técnica |
|---|---|---|
| ¿Genera movimiento de salida? | **Sí** | `tipo: 'SALIDA'`, `motivo: 'TRANSFERENCIA_ALMACEN'`, `inventory.service.ts:189-215` |
| ¿Genera movimiento de entrada? | **Sí** | `tipo: 'ENTRADA'`, `motivo: 'TRANSFERENCIA_ALMACEN'`, `inventory.service.ts:218-244` |
| ¿Ambos movimientos comparten referencia? | **Sí** | `transferenciaId` compartido; `movimientoRelacionadoId` cruzado |
| ¿Se ven en la tabla Movimientos? | **Parcialmente** | Bug de filtro interno en `MovementsTable.tsx` oculta el movimiento complementario cuando se filtra por almacén |
| ¿Se exportan al Excel? | **Parcialmente** | La exportación incluye `tipo`, `motivo`, `observaciones`, `documentoReferencia`, pero **omite** `transferenciaId`, `almacenOrigenNombre`, `almacenDestinoNombre` |
| ¿Actualiza stock actual (StockActual tab)? | **Sí** | `updateProduct()` actualiza `stockPorAlmacen`; `useInventarioDisponibilidad` recalcula vía `useMemo` |
| ¿Actualiza resumen / SummaryCards? | **Sí** | `stockSummary` en `useInventory` recalcula vía `useMemo` sobre `allProducts` |
| ¿Actualiza alertas? | **Sí** | `stockAlerts` en `useInventory` recalcula vía `useMemo` sobre `allProducts + almacenesActivos` |
| ¿Sirve para auditar una transferencia? | **Parcialmente** | Con `transferenciaId` visible en la columna "Detalles" se puede rastrear, pero solo en pantalla; la exportación no lo incluye y no hay vista agrupada |
| ¿Kardex muestra `cantidadAnterior` → `cantidadNueva`? | **Sí** | Ambos movimientos registran `cantidadAnterior` y `cantidadNueva` por almacén |
| ¿El tipo mostrado es "Transferencia"? | **No** | En tabla aparece badge "Entrada" (verde) y "Salida" (rojo), no "Transferencia". Solo el badge de detalles indica que es transferencia |

---

## 7. Evaluación de Consistencia y Riesgos

### Riesgo 1 — Bug: Filtro de tabla oculta movimiento complementario (ALTO)

**Archivo:** `MovementsTable.tsx:88-93`

```typescript
// En MovementsTable, filtro interno:
const matchesalmacen =
  !almacenFiltro ||
  almacenFiltro === 'todos' ||
  mov.almacenId === almacenFiltro; // Solo almacenId, no almacenOrigenId ni almacenDestinoId
```

**En `useInventory.ts:90-93`** (filtro del hook, más completo):
```typescript
filtered = filtered.filter(
  mov => mov.almacenId === almacenFiltro ||
         mov.almacenOrigenId === almacenFiltro ||
         mov.almacenDestinoId === almacenFiltro
);
```

**Resultado:** El hook filtra `filteredMovements` correctamente (incluye ambos movimientos cuando el usuario filtra por almacén-A: la SALIDA de A y la ENTRADA en B). Pero `MovementsTable` re-filtra internamente con solo `almacenId`, lo que excluye la ENTRADA (almacenId = almacén-B) cuando el usuario está viendo almacén-A. El usuario solo ve la SALIDA pero no la ENTRADA complementaria.

**Impacto:** El Kardex de un almacén es incompleto cuando se filtra. El usuario no puede ver el par completo de movimientos de una transferencia al filtrar por almacén.

---

### Riesgo 2 — Bug: Filtro "Transferencias" en selector de tipo nunca devuelve resultados (MEDIO)

**Archivo:** `MovementsTable.tsx:147`

```typescript
<option value="TRANSFERENCIA">Transferencias</option>
```

Los movimientos de transferencia se guardan con `tipo: 'SALIDA'` o `tipo: 'ENTRADA'`, **nunca** con `tipo: 'TRANSFERENCIA'`. El tipo `TRANSFERENCIA` está definido en el enum `MovimientoTipo` pero no se usa.

**Impacto:** El usuario activa el filtro "Transferencias" y no ve ningún resultado. Confusión garantizada.

---

### Riesgo 3 — `product.cantidad` (campo legacy total) no se actualiza durante transferencia (MEDIO-ALTO)

**Archivo:** `inventory.service.ts:185-186` y `useInventory.ts:234`

`InventoryService.updateStock()` solo modifica `stockPorAlmacen`. No toca `product.cantidad`.

La fachada (`inventory.facade.ts:98-101`) sí actualiza `product.cantidad`:
```typescript
const productUpdate = {
  stockPorAlmacen: ...,
  cantidad: totalStock,  // Actualiza total
  ...
};
```

Pero las transferencias **no pasan por la fachada**. El hook llama a `updateProduct(result.product.id, result.product)` donde `result.product` tiene `stockPorAlmacen` actualizado pero `cantidad` sin actualizar.

**Impacto:** Si algún componente del sistema depende de `product.cantidad` para mostrar el total de stock, verá un valor desactualizado. La vista `DisponibilidadTable` usa `InventoryService.getStock()` (lee `stockPorAlmacen`), por lo que esta correctamente. Pero cualquier otra referencia a `product.cantidad` mostrará un total antiguo.

---

### Riesgo 4 — Operación pseudoatómica pero sin reversión (ALTO)

**Archivo:** `inventory.service.ts:185-251`

El flujo es:
1. `updateStock()` (en memoria) — modifica el objeto Product
2. Crea los dos objetos de movimiento (en memoria)
3. `StockRepository.addMovements()` — escribe en localStorage

Si falla entre pasos, la inconsistencia permanece en memoria hasta que el usuario refresca. Dado que JavaScript es single-threaded y no hay I/O real entre pasos, la probabilidad es mínima. Pero si la escritura a localStorage falla (almacenamiento lleno), el stock se actualizó en memoria pero los movimientos no se persistieron. Al recargar, el stock volvería al estado anterior (desde el store que se re-inicializa) pero los movimientos tampoco estarían.

El problema real no es el fallo técnico (improbable), sino que **no existe ningún mecanismo de reversión** para una transferencia ya confirmada por el usuario. Si el usuario transfirió 50 unidades por error, no puede deshacer.

---

### Riesgo 5 — `transferenciaId` basado en timestamp (BAJO)

```typescript
const transferenciaId = `TRANS-${Date.now()}`;
```

En un sistema single-user, la colisión es casi imposible. Pero el ID no es secuencial ni legible (ej: `TRANS-1748476842123`). No tiene formato `TRF-0001` que sea auditable a simple vista.

---

### Riesgo 6 — Sin control de transferencia entre establecimientos (MEDIO)

El modal lista **todos los almacenes activos** de todos los establecimientos. El usuario puede transferir entre almacenes de distintos establecimientos sin ninguna advertencia. No existe:
- Flag `esTransferenciaInterEstablecimiento`
- Validación o alerta si origen y destino son de distintos establecimientos
- Campo obligatorio de guía de remisión para este caso
- Preparación para vinculación futura con guía de remisión

---

### Riesgo 7 — Exportación incompleta para auditoría (MEDIO)

**Archivo:** `InventoryPage.tsx:72-112`, `handleExportToExcel()`

Columnas exportadas: Fecha, Producto, Código, Tipo, Motivo, Cantidad, Stock Anterior, Stock Nuevo, Almacén, Establecimiento, Usuario, Observaciones, Documento.

Columnas ausentes en la exportación:
- `transferenciaId` (ID de la transferencia)
- `almacenOrigenNombre` / `almacenDestinoNombre`
- `esTransferencia` (flag)
- `movimientoRelacionadoId`

Un auditor que descargue el Excel no puede saber que dos filas (SALIDA + ENTRADA) son la misma transferencia, ni qué almacén envió a cuál.

---

### Riesgo 8 — Descarga de stock de destino visible antes de confirmar (BAJO)

El panel de resumen en el modal muestra el stock proyectado (origen futuro y destino futuro). Esto es correcto. No hay riesgo aquí. Es UX positivo.

---

## 8. Evaluación de UI/UX Actual

| Pregunta | Resultado |
|---|---|
| ¿El modal actual es suficiente para operación básica? | Sí, cubre el caso de uso principal con buena UX |
| ¿Es fácil de usar? | Sí; el flujo es lineal: producto → origen → destino → cantidad |
| ¿El usuario entiende cuál es el origen y el destino? | Sí; está visualmente separado (azul = origen, violeta = destino) con iconos Building2 |
| ¿El usuario ve el stock del origen antes de ingresar cantidad? | Sí; aparece al seleccionar el almacén origen |
| ¿El usuario ve el stock del destino antes de confirmar? | Sí; aparece al seleccionar el almacén destino |
| ¿Hay resumen antes de confirmar? | Sí; cuadro ámbar con el resultado proyectado |
| ¿El usuario recibe confirmación visual post-transferencia? | Sí; notificación de éxito via `useFeedback` |
| ¿El botón está deshabilitado mientras los campos no estén completos? | Sí; condición explícita en el botón |
| ¿El usuario puede saber si está transfiriendo entre distintos establecimientos? | Solo si lee el nombre de establecimiento en el selector; no hay alerta ni distinción visual explícita |
| ¿Conviene moverlo a tab propio? | Sí, en el futuro; pero no ahora sin historial y correcciones previas |
| ¿Qué debería mostrar el tab futuro? | Lista de transferencias agrupadas por TRF, con columnas: ID, Fecha, Producto, Origen, Destino, Cantidad, Estado, Usuario, Documento |
| ¿El modal de captura debe quedar? | Sí; el formulario de nueva transferencia puede permanecer como modal o sección dentro del tab |

---

## 9. Relación con Movimientos, Resumen y Reportes

| Área | Estado | Detalle |
|---|---|---|
| **Tabla Movimientos** | Parcial | Muestra movimientos con badge de transferencia y transferenciaId; BUG: filtro por almacén oculta el movimiento complementario |
| **Exportación de movimientos** | Incompleta | Falta `transferenciaId` y almacén origen/destino en el Excel |
| **Resumen (SummaryCards)** | Correcto | Recalcula desde `stockPorAlmacen` post-transferencia; el total de stock no cambia (conservación), lo cual es matemáticamente correcto |
| **Alertas (AlertsPanel)** | Correcto | Recalcula desde `allProducts` post-transferencia; si el origen baja de su mínimo, se generará alerta correctamente |
| **Stock Actual (DisponibilidadTable)** | Correcto | Recalcula desde `InventoryService.getStock()` → `stockPorAlmacen`; refleja el cambio en ambos almacenes |
| **Disponibilidad por almacén** | Correcto | La vista "Todos los almacenes" muestra columnas dinámicas por almacén; cada columna usa `item.stockPorAlmacen?.[w.id]` que refleja el cambio |
| **Filtros por almacén en movimientos** | Parcial | El hook filtra correctamente; la tabla re-filtra incorrectamente (ver Riesgo 1) |
| **stockPorEstablecimiento** | No actualizado | El servicio no actualiza este campo durante transferencias; la fachada sí lo hace para ajustes/ventas, pero las transferencias no pasan por la fachada |

---

## 10. Relación con Documentos Internos

| Documento | Existe actualmente | Evidencia | Comentario |
|---|---|---|---|
| Código de transferencia secuencial tipo TRF | **No** | `TRANS-${Date.now()}` en `inventory.service.ts:182` | No es secuencial, no es legible |
| Documento interno de transferencia | **No** | No hay entidad `Transferencia` separada | Solo existen los dos movimientos individuales |
| Ticket / constancia imprimible | **No** | No existe ninguna función de impresión o generación de PDF | |
| Campo documentoReferencia | **Sí (texto libre)** | `TransferModal.tsx:306-317`; `StockTransferData.documentoReferencia?: string` | Acepta "GUIA-001, ORDEN-123" pero sin validación ni tipado |
| Guía de remisión formal | **No** | No existe entidad `GuiaRemision` vinculada a la transferencia | Solo el campo libre `documentoReferencia` |
| Nota de ingreso | **No** | No existe relación formal | |
| Nota de salida | **No** | No existe relación formal | |
| Estado de transferencia | **No** | No existe campo `estado` en ningún tipo relacionado | |

---

## 11. Problemas Detectados

| ID | Severidad | Problema | Evidencia técnica | Impacto funcional | Recomendación |
|---|---|---|---|---|---|
| P1 | **Crítico** | Filtro interno de `MovementsTable` oculta movimiento complementario de transferencia al filtrar por almacén | `MovementsTable.tsx:88-93`: `mov.almacenId === almacenFiltro` (no incluye `almacenOrigenId`/`almacenDestinoId`) | El Kardex de un almacén es incompleto. El usuario no ve el par completo SALIDA+ENTRADA | Agregar `|| mov.almacenOrigenId === almacenFiltro || mov.almacenDestinoId === almacenFiltro` en el filtro interno de `MovementsTable` |
| P2 | **Alto** | Opción de filtro "Transferencias" nunca devuelve resultados | `MovementsTable.tsx:147` ofrece `value="TRANSFERENCIA"`, pero ningún movimiento tiene `tipo='TRANSFERENCIA'` | El usuario activa el filtro y no ve nada; confusión total | Cambiar la opción a filtrar por `motivo === 'TRANSFERENCIA_ALMACEN'` o mostrar solo movimientos donde `esTransferencia === true` |
| P3 | **Alto** | Exportación a Excel omite campos clave de transferencia | `InventoryPage.tsx:72-88`: no incluye `transferenciaId`, `almacenOrigenNombre`, `almacenDestinoNombre` | Un auditor externo no puede identificar qué movimientos pertenecen a la misma transferencia | Agregar columnas: `Transferencia ID`, `Almacén Origen`, `Almacén Destino` |
| P4 | **Alto** | `product.cantidad` (campo legacy total) no se actualiza durante transferencias | `inventory.service.ts updateStock()` no modifica `cantidad`; la fachada sí lo hace pero la transferencia no pasa por la fachada | Cualquier componente que lea `product.cantidad` para calcular stock total ve un valor desactualizado | Actualizar `product.cantidad = InventoryService.getTotalStock(updatedProduct)` en `registerTransfer` o en el hook |
| P5 | **Alto** | Sin mecanismo de reversión ni anulación de transferencia | No existe ningún método en el servicio ni opción en la UI | Una transferencia errónea no puede deshacerse sin manipulación manual de datos | Implementar `reverseTransfer()` como mínimo, con los mismos movimientos en dirección inversa |
| P6 | **Medio** | `transferenciaId` no es secuencial ni legible | `TRANS-1748476842123` no es legible para el usuario | Difícil de referenciar en comunicaciones internas | Implementar numeración secuencial: `TRF-0001`, `TRF-0002`, etc. |
| P7 | **Medio** | Sin distinción entre transferencia intra-establecimiento e inter-establecimiento | No existe flag ni validación diferenciada | Futuras integraciones con guía de remisión no tendrán dónde anclar | Agregar campo `tipoTransferencia: 'INTRA_ESTABLECIMIENTO' | 'INTER_ESTABLECIMIENTO'` y validación de guía para el segundo caso |
| P8 | **Medio** | No existe historial/listado de transferencias como operación agrupada | Solo existen los dos movimientos individuales | El usuario no puede consultar "todas las transferencias del día" como unidad | Implementar entidad `Transferencia` o tab dedicado con agrupación por `transferenciaId` |
| P9 | **Medio** | `generateTransferId()` en `inventory.helpers.ts` existe pero nunca se llama | `inventory.helpers.ts:144-146` vs `inventory.service.ts:182` | Código muerto; inconsistencia entre helpers y servicio | Usar el helper o eliminarlo |
| P10 | **Bajo** | Input de cantidad no valida que sea entero (solo valida > 0) | `TransferModal.tsx:288-295`: `type="number"` sin `step="1"` | Para productos que usan unidades enteras, se pueden ingresar decimales | Agregar `step="1"` o validación de `Number.isInteger(cantidadNum)` según el tipo de unidad del producto |
| P11 | **Bajo** | Botón "Transferir Stock" no aparece en la vista "Stock Actual" (tab por defecto) | `InventoryPage.tsx:251`: condición `selectedView !== 'situacion'` excluye la barra de acciones | El usuario en la vista de stock no tiene acceso directo al botón | El toolbar de `InventarioSituacionPage` sí lo tiene; doble acceso inconsistente según desde dónde se acceda |
| P12 | **Bajo** | `stockPorEstablecimiento` no se actualiza en transferencias | `registerTransfer` solo modifica `stockPorAlmacen`; la fachada actualiza ambos | Campos de stock por establecimiento quedan desactualizados | Actualizar `stockPorEstablecimiento` en el hook post-transferencia, similar a lo que hace `inventory.facade.ts:77-95` |

---

## 12. Qué Está Bien y Debe Mantenerse

- **Validación doble de stock**: La UI valida en `TransferModal.handleSubmit()` y el servicio lanza `Error` si `stockOrigen < data.cantidad`. No hay forma de burlar la validación desde la UI.
- **Bloqueo de origen = destino**: El select de destino filtra dinámicamente el almacén origen seleccionado. Además, hay validación explícita en `handleSubmit`. Doble protección correcta.
- **Generación de dos movimientos vinculados**: Ambos movimientos comparten `transferenciaId` y se vinculan mutuamente mediante `movimientoRelacionadoId`. El diseño de datos es correcto.
- **Escritura atómica de ambos movimientos**: `StockRepository.addMovements([movimientoSalida, movimientoEntrada])` realiza una sola escritura en localStorage con ambos movimientos. No pueden quedar solo uno guardado.
- **Reactividad post-transferencia**: `stockAlerts`, `stockSummary` y `datosDisponibilidad` se recalculan automáticamente vía `useMemo` después de `updateProduct()`.
- **Campo `documentoReferencia` disponible**: Aunque sea texto libre, ya existe en el formulario y se persiste en ambos movimientos. Sirve como puente hacia una futura guía de remisión.
- **Badge visual de transferencia en tabla**: `MovementsTable` muestra el almacén complementario y el `transferenciaId` en la columna Detalles. Es útil para trazabilidad en pantalla.
- **Permiso de transferencia separado**: El sistema verifica `'inventario.transferir'` como permiso independiente, no agrupado con ajuste.
- **UI con resumen predictivo**: El modal muestra el stock proyectado antes de confirmar. Buena UX.
- **Filtro de servicios**: `tipoExistencia !== 'SERVICIOS'` evita transferir productos de tipo servicio.
- **Datos de establecimiento en movimientos**: Ambos movimientos registran `EstablecimientoId`, `EstablecimientoCodigo`, `EstablecimientoNombre` (del almacén correspondiente), lo que facilita futura diferenciación intra/inter.

---

## 13. Qué Falta para un Flujo Completo pero Simple

*Esta sección propone sin implementar. Son orientaciones para priorizar el backlog.*

### 13.1 Correcciones antes de cualquier rediseño

1. Corregir filtro interno de `MovementsTable` (P1) — una línea de código.
2. Corregir opción de filtro "Transferencias" (P2) — filtrar por `esTransferencia` o `motivo`.
3. Agregar `transferenciaId` y almacén origen/destino en la exportación Excel (P3).
4. Actualizar `product.cantidad` en `registerTransfer` (P4).

### 13.2 Tab "Transferencias" (futuro)

Un tab dedicado debería mostrar:
- **Lista de transferencias agrupadas por `transferenciaId`**: una fila por transferencia, no dos filas (no repetir el enfoque de la tabla de movimientos).
- Columnas: Código TRF, Fecha, Producto, Almacén Origen, Almacén Destino, Cantidad, Estado, Usuario, Documento Referencia.
- Acción: "Nueva Transferencia" → abre el modal actual (que se mantiene).
- Acción: "Ver detalle" → muestra los dos movimientos vinculados.
- Filtros: por fecha, por almacén, por establecimiento.

### 13.3 Código TRF secuencial

Implementar un contador en localStorage (o como campo en el repositorio) para generar `TRF-00001`, `TRF-00002`, etc. Esto reemplaza `TRANS-${Date.now()}`.

### 13.4 Reversión mínima

Un método `reverseTransfer(transferenciaId)` que:
1. Encuentra los dos movimientos por `transferenciaId`.
2. Genera dos nuevos movimientos inversos (SALIDA en destino original, ENTRADA en origen original).
3. Marca los movimientos originales con `estado: 'ANULADO'` (requiere campo `estado` en `MovimientoStock`).

### 13.5 Distinción intra/inter establecimiento y preparación para guía

- Agregar `tipoTransferencia: 'INTRA' | 'INTER'` calculado automáticamente comparando `almacenOrigen.establecimientoId` con `almacenDestino.establecimientoId`.
- Para `INTER`: mostrar campo adicional "Guía de remisión" (texto, obligatorio u opcional).
- No implementar la entidad GuíaRemisión completa ahora; solo el campo de referencia tipificado.

### 13.6 Estado de transferencia

Agregar campo `estado: 'CONFIRMADA' | 'ANULADA'` en el registro de transferencia. Mínimo viable; no necesita flujo de aprobación.

---

## 14. Matriz Priorizada de Recomendaciones

| Recomendación | Prioridad | Tipo | Riesgo si no se hace | Requiere rediseño visual |
|---|---|---|---|---|
| Corregir filtro interno de MovementsTable (P1) | **P0 — Inmediato** | Corrección de bug | El Kardex por almacén es incompleto; dato incorrecto en producción | No |
| Corregir opción de filtro "Transferencias" (P2) | **P0 — Inmediato** | Corrección de bug | El filtro nunca funciona; confusión al usuario | No |
| Agregar `transferenciaId` y almacén origen/destino en exportación Excel (P3) | **P1 — Alta** | Corrección de exportación | Auditoría externa imposible desde el Excel | No |
| Actualizar `product.cantidad` post-transferencia (P4) | **P1 — Alta** | Corrección de dato | Campo legacy desactualizado; riesgo en módulos que usen ese campo | No |
| Implementar reversión básica de transferencia (P5) | **P1 — Alta** | Feature mínima | Errores de transferencia son permanentes | No (solo lógica y botón) |
| Usar código TRF secuencial (P6) | **P2 — Media** | Mejora de trazabilidad | IDs ilegibles dificultan soporte y auditoría | No |
| Marcar transferencia intra/inter establecimiento (P7) | **P2 — Media** | Mejora para futuro | Imposible vincular guía de remisión más adelante | No |
| Actualizar `stockPorEstablecimiento` post-transferencia (P12) | **P2 — Media** | Corrección de dato | Campo de establecimientos queda desactualizado | No |
| Agregar `step="1"` y validación de entero si aplica (P10) | **P3 — Baja** | Corrección de validación | Decimales inválidos en productos con unidades enteras | No |
| Implementar tab "Transferencias" con historial agrupado (P8) | **P3 — Media** | Feature nueva | Sin historial, no hay gestión formal; solo operativo básico | Sí |
| Estado de transferencia (CONFIRMADA / ANULADA) | **P3 — Media** | Feature nueva | Sin estado no se puede gestionar el ciclo de vida | Sí (mínimo) |
| Preparar campo tipificado para guía de remisión en inter-establecimiento | **P4 — Futura** | Preparación | Sin esto la integración futura con guía requiere un cambio de modelo | No |

---

## 15. Respuestas a las Preguntas Obligatorias

| # | Pregunta | Respuesta |
|---|---|---|
| 1 | ¿Existe actualmente transferencia entre almacenes? | **Sí** |
| 2 | ¿Dónde está implementada? | `TransferModal.tsx` (UI), `inventory.service.ts:registerTransfer()` (lógica), `useInventory.ts:handleStockTransfer()` (orquestación) |
| 3 | ¿Es modal, página, tab, componente o helper? | **Modal** accesible desde múltiples puntos de la página |
| 4 | ¿Qué flujo sigue el usuario hoy para transferir? | Abrir módulo → ir a cualquier tab excepto Stock Actual o Importar → clic "Transferir Stock" → seleccionar producto, origen, destino, cantidad → confirmar |
| 5 | ¿Permite elegir establecimiento origen? | **No directamente**; elige almacén origen que incluye nombre de establecimiento. No hay filtro explícito por establecimiento |
| 6 | ¿Permite elegir almacén origen? | **Sí** |
| 7 | ¿Permite elegir establecimiento destino? | **No directamente**; igual que en origen |
| 8 | ¿Permite elegir almacén destino? | **Sí** |
| 9 | ¿Permite transferir entre almacenes del mismo establecimiento? | **Sí** |
| 10 | ¿Permite transferir entre almacenes de distintos establecimientos? | **Sí, sin control ni advertencia** |
| 11 | ¿Permite transferir entre empresas distintas? | **No aplica**; fuera de alcance del sistema |
| 12 | ¿Valida que origen y destino no sean iguales? | **Sí** (doble: select filtra + validación en handleSubmit) |
| 13 | ¿Valida stock suficiente en almacén origen? | **Sí** (doble: UI + servicio) |
| 14 | ¿Permite stock negativo en transferencia? | **No** |
| 15 | ¿Permite cantidad 0? | **No** (validación `cantidadNum <= 0`) |
| 16 | ¿Permite cantidad negativa? | **No** (misma validación) |
| 17 | ¿Permite decimales? | **Sí** (no hay validación de entero; riesgo bajo dependiendo del producto) |
| 18 | ¿Cómo maneja productos no disponibles en destino? | Los crea: `updateStock` usa spread y crea la clave si no existía |
| 19 | ¿Crea stock en destino si no existía? | **Sí** |
| 20 | ¿Descuenta correctamente del origen? | **Sí** |
| 21 | ¿Suma correctamente al destino? | **Sí** |
| 22 | ¿Genera dos movimientos en Kardex? | **Sí** |
| 23 | ¿Los movimientos están vinculados entre sí? | **Sí** (via `transferenciaId` y `movimientoRelacionadoId`) |
| 24 | ¿Existe código de transferencia tipo TRF? | **No**; existe `TRANS-${Date.now()}` |
| 25 | ¿Existe documentoReferencia compartido? | **Sí** (texto libre, opcional) |
| 26 | ¿Los movimientos aparecen en la tabla general de Movimientos? | **Sí, con bug de filtro** |
| 27 | ¿Los movimientos se exportan correctamente? | **Parcialmente** (faltan campos clave de transferencia) |
| 28 | ¿El resumen de inventario se actualiza correctamente? | **Sí** |
| 29 | ¿Las alertas se actualizan correctamente? | **Sí** |
| 30 | ¿La vista Stock Actual refleja correctamente la transferencia? | **Sí** |
| 31 | ¿Funciona con varios almacenes? | **Sí** |
| 32 | ¿Funciona con varios establecimientos? | **Sí** (sin diferenciación) |
| 33 | ¿Qué pasa si falla la salida pero se ejecuta la entrada? | El fallo en el servicio lanza `Error` antes de persistir. Si el error es post-persistencia, es teóricamente posible inconsistencia pero improbable en JS single-threaded |
| 34 | ¿Qué pasa si falla la entrada después de descontar origen? | Mismo escenario. El stock en memoria se actualizaría pero los movimientos no se guardarían si falla localStorage. Improbable. |
| 35 | ¿La operación es atómica en la lógica actual? | **Pseudoatómica**: una sola escritura a localStorage para ambos movimientos. El stock en memoria y los movimientos persisten en pasos separados (riesgo teórico bajo) |
| 36 | ¿Existe historial/listado de transferencias como operación agrupada? | **No** |
| 37 | ¿Existe detalle de transferencia? | **No** (solo la fila de movimiento en la tabla) |
| 38 | ¿Existe estado de transferencia? | **No** |
| 39 | ¿Existe anulación o reversión de transferencia? | **No** |
| 40 | Si se anula, ¿revierte correctamente origen y destino? | **No aplica**; no existe anulación |
| 41 | ¿Existe relación con guía de remisión? | **No** (solo campo de texto libre) |
| 42 | ¿Existe campo para guía de remisión? | **Sí** (`documentoReferencia`: texto libre; sin tipado específico) |
| 43 | ¿Existe relación con nota de ingreso o nota de salida? | **No** |
| 44 | ¿El usuario puede entender qué transferencia generó cada movimiento? | **En pantalla sí** (badge con `transferenciaId` visible en tabla); **en exportación no** |
| 45 | ¿Está listo para convertirse en tab propio? | **No**; requiere correcciones P0+P1 primero |
| 46 | ¿Qué habría que mover o extraer para convertirlo en tab? | Crear entidad `Transferencia` agrupada, historial con paginación, ruta propia, código TRF secuencial |
| 47 | ¿Qué no debe tocarse porque ya funciona? | La lógica de `registerTransfer()`, la vinculación por `transferenciaId`, la reactividad post-transferencia, las validaciones de stock y origen=destino |
| 48 | ¿Qué problemas críticos hay? | P1 (filtro de tabla) y P2 (filtro de tipo) son bugs activos en producción |
| 49 | ¿Qué problemas altos hay? | P3 (exportación incompleta), P4 (`product.cantidad` no actualizado), P5 (sin reversión) |
| 50 | ¿Qué correcciones mínimas se recomiendan antes de rediseñar? | Corregir P1 y P2 (bugs activos), luego P3 (exportación), luego P4 (dato legacy) |

---

## 16. Evaluación de los Casos Funcionales Esperados

### Caso 1: Transferencia simple dentro del mismo establecimiento

| Condición | Resultado | Verificado en |
|---|---|---|
| Origen queda `stockOrigen - cantidad` | **Correcto** | `inventory.service.ts:185,198` |
| Destino queda `stockDestino + cantidad` | **Correcto** | `inventory.service.ts:186,226` |
| Total empresa sin cambio (conservación) | **Correcto** | `stockPorAlmacen` suma la misma cantidad total |
| Movimiento salida -cantidad | **Correcto** | `movimientoSalida.cantidad = data.cantidad`, `tipo='SALIDA'` |
| Movimiento entrada +cantidad | **Correcto** | `movimientoEntrada.cantidad = data.cantidad`, `tipo='ENTRADA'` |
| Ambos con misma referencia | **Correcto** | `transferenciaId` compartido |

### Caso 2: Transferencia entre distintos establecimientos de la misma empresa

| Condición | Resultado | Verificado en |
|---|---|---|
| Origen baja | **Correcto** | Mismo flujo que Caso 1 |
| Destino sube | **Correcto** | Mismo flujo que Caso 1 |
| Movimientos vinculados | **Correcto** | Mismo `transferenciaId` |
| Identificado como inter-establecimiento | **No** | No existe `tipoTransferencia` ni flag equivalente |
| Preparado para guía de remisión | **Parcialmente** | Solo con campo texto libre `documentoReferencia` |

### Caso 3: Origen sin stock suficiente

| Condición | Resultado | Verificado en |
|---|---|---|
| Bloqueo en UI | **Correcto** | `TransferModal.tsx:108-111` y botón deshabilitado |
| Bloqueo en servicio | **Correcto** | `inventory.service.ts:178-180` lanza Error |
| No se generan movimientos | **Correcto** | El error ocurre antes de crear los movimientos |
| Stock no modificado | **Correcto** | La actualización de stock está después de la validación |

### Caso 4: Origen y destino iguales

| Condición | Resultado | Verificado en |
|---|---|---|
| Bloqueado | **Correcto** | Select filtra + `TransferModal.tsx:97-100` |
| No se generan movimientos | **Correcto** | No llega al servicio |

### Caso 5: Cantidad cero o negativa

| Condición | Resultado | Verificado en |
|---|---|---|
| Bloqueado | **Correcto** | `TransferModal.tsx:103-106` + botón deshabilitado |
| No se generan movimientos | **Correcto** | No llega al servicio |

### Caso 6: Fallo parcial

| Condición | Resultado |
|---|---|
| La operación es pseudoatómica (una escritura) | **Correcto** para el caso de movimientos |
| Si falla después de actualizar stockPorAlmacen (en memoria) pero antes de persistir movimientos | **Riesgo teórico** — en JavaScript single-threaded y sin I/O entre pasos, es improbable |
| Documentado el riesgo | Sí, en Riesgo 4 |

### Caso 7: Consulta posterior

| Condición | Resultado |
|---|---|
| Tab Movimientos muestra entrada y salida | **Parcialmente** (bug de filtro oculta uno de los dos al filtrar por almacén) |
| Misma referencia permite saber que pertenecen a la misma transferencia | **En pantalla sí** (`transferenciaId` visible); en Excel **no** |

---

## 15. Conclusión Final

| Pregunta | Respuesta |
|---|---|
| ¿La transferencia actual funciona? | **Sí**, en su flujo principal funciona correctamente |
| ¿Está completa? | **No**; faltan: reversión, historial agrupado, código TRF, distinción intra/inter establecimiento, exportación completa |
| ¿Está lista para producción/prototipo funcional? | **No todavía**: hay dos bugs activos (P1 y P2) que dan información incorrecta al usuario |
| ¿Debe seguir como modal o pasar a tab? | **Seguir como modal** hasta resolver los bugs y agregar historial. No es productivo mover a tab con bugs activos |
| ¿Qué se debe corregir antes de rediseñar? | P1 (filtro MovementsTable), P2 (opción de filtro por tipo), P3 (exportación), P4 (product.cantidad) |
| ¿Qué se debe implementar luego para dejarla completa? | Código TRF secuencial, reversión básica, distinción intra/inter establecimiento, historial agrupado, estado de transferencia |

**La transferencia está implementada de forma sólida en su núcleo** (servicio, tipos, vinculación de movimientos, reactividad). Las correcciones P1 y P2 son triviales en código. El sistema puede darse por funcional para uso interno una vez aplicadas esas correcciones. Un flujo formal con documento TRF, historial y reversión es la siguiente etapa lógica.
