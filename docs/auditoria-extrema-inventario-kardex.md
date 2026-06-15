# Auditoría Extrema — Módulo Inventario / Kardex
**Fecha de auditoría:** 2026-06-14  
**Rama auditada:** TransferenciaAlmacenes  
**Auditor:** Claude Sonnet 4.6 (análisis estático exhaustivo)  
**Archivos leídos:** 24 archivos core + 6 archivos de módulos externos (comprobantes, OV, stock gateway)

---

## Sección 1 — Resumen Ejecutivo

### Tipo de Inventario Implementado
El sistema implementa un **inventario perpetuo con registro cronológico de movimientos** que actúa como Kardex operativo. No es FIFO, LIFO ni promedio ponderado en sentido contable estricto: el costo unitario **no se registra en los movimientos de stock**. Es un Kardex de cantidades (sin valorización), con trazabilidad por almacén y por establecimiento.

### Estado General del Módulo
El módulo está en estado **avanzado de desarrollo**. Tiene 7 tabs funcionales (Stock Actual, Movimientos, Transferencias, Alertas, Importar, Notas de Ingreso, Notas de Salida), con flujos de generación y anulación completos para NI y NS. La integración con comprobantes (facturas/boletas) y OV está implementada con lógica de reserva y descuento. Existen brechas documentadas (BRECHA-01, BRECHA-02, BRECHA-03) y patrones de riesgo de sincronización relacionados con el almacenamiento en localStorage.

### Veredicto Final
**C — Requiere correcciones importantes antes de MVP**

Razón: El módulo funciona para operaciones unitarias, pero tiene brechas críticas en la consistencia de stock (doble descuento posible en NI, falta de Kardex valorizado, stock negativo no controlado de forma uniforme, race conditions en localStorage multi-tab, ausencia de transacciones atómicas en servidor).

---

## Sección 2 — Tipo de Inventario: 30 Preguntas

| # | Pregunta | Respuesta | Evidencia |
|---|----------|-----------|-----------|
| 1 | ¿Es inventario perpetuo o periódico? | **Perpetuo** — cada movimiento actualiza stockPorAlmacen inmediatamente | `inventory.service.ts:registerAdjustment` + `stock.repository.ts:addMovement` |
| 2 | ¿Existe motor de Kardex real (registro cronológico con saldo)? | **Parcialmente** — existe `MovimientoStock` con `cantidadAnterior` y `cantidadNueva`, persistido en localStorage. No es un Kardex contable (sin costo unitario, sin saldo acumulado de valor) | `stock.repository.ts` key `facturafacil_stock_movements` |
| 3 | ¿Qué método de valorización se usa? | **Ninguno** — no se registra costo por movimiento. `LineaNotaIngreso.costoUnitario` existe en el modelo NI pero no se traslada a `MovimientoStock` | `inventory.types.ts:MovimientoStock` — ausencia del campo `costoUnitario` |
| 4 | ¿Se registra costo unitario en cada movimiento? | **No** — `MovimientoStock` no tiene campo de costo. `LineaNotaIngreso` tiene `costoUnitario` pero no se propaga al movimiento en `notaIngreso.service.ts:generarNIEnInventario` | `notaIngreso.service.ts:89-111` |
| 5 | ¿Se calcula saldo acumulado por producto/almacén en cada movimiento? | **Parcialmente** — se guarda `cantidadNueva` (saldo de cantidad) pero NO saldo de valor. No hay recálculo encadenado; el saldo se obtiene del snapshot del producto | `inventory.service.ts:registerAdjustment:162-188` |
| 6 | ¿Existe tabla/colección dedicada de Kardex? | **No como entidad separada** — los movimientos están en `facturafacil_stock_movements` (localStorage) junto con todos los tipos. No existe un "libro de Kardex" independiente | `stock.repository.ts:STORAGE_KEY_MOVEMENTS` |
| 7 | ¿Las notas de ingreso generan asiento en el Kardex? | **Sí** — `generarNIEnInventario` llama a `InventoryService.registerAdjustment` que llama a `StockRepository.addMovement` con tipo ENTRADA y motivo mapeado desde `tipoIngreso` | `notaIngreso.service.ts:99-110` |
| 8 | ¿Las notas de salida generan asiento en el Kardex? | **Sí** — `generarNSEnInventario` llama a `InventoryService.registerAdjustment` con tipo SALIDA | `notaSalida.service.ts:213-224` |
| 9 | ¿Las transferencias inter-almacén generan asiento en el Kardex? | **Sí** — generan dos movimientos (SALIDA en origen, ENTRADA en destino) vinculados por `transferenciaId` | `inventory.service.ts:registerTransfer:225-291` |
| 10 | ¿Los comprobantes (facturas/boletas) afectan el Kardex directamente? | **Sí, condicionalmente** — solo cuando `controlStockActivo=true` y `stockDescuentoFacturaYBoleta='automatico'`. Usa `addMovimientoStock` (facade) con motivo VENTA | `useComprobanteActions.tsx:533-686` |
| 11 | ¿El POS afecta el Kardex directamente? | **Sí, indirectamente** — POS usa `useCart` que a su vez llama al mismo `createComprobante` de `useComprobanteActions`, siguiendo el mismo flujo condicional | `useCart.tsx` importa `useComprobanteActions` |
| 12 | ¿Las órdenes de venta reservan stock real? | **Sí** — `reservarStockOrden` incrementa `stockReservadoPorAlmacen` sin tocar `stockPorAlmacen`. Usa FIFO por establecimiento | `servicioReservaStock.ts:117-165` |
| 13 | ¿Las cotizaciones reservan stock? | **No** — las cotizaciones no tienen lógica de reserva. Solo los documentos tipo Orden de Venta activan `reservarStockOrden` | Ausencia de llamada en flujo de cotizaciones |
| 14 | ¿Las notas de venta reservan stock? | **Condicionalmente** — `descontarStockParaDocumento` descuenta stock real en NV con modo automático. No hay reserva, descuenta directo si `modoDescuentoStock='automatico'` | `servicioReservaStock.ts:175-222` |
| 15 | ¿Existe control de stock negativo? | **Parcialmente** — `InventoryService.updateStock` tiene `allowNegativeStock` flag que aplica `Math.max(0, qty)`. En comprobantes, `allowNegativeStockConfig` viene de `salesPreferences.allowNegativeStock`. En NI/NS el control no es configurable externamente | `inventory.service.ts:54-64` |
| 16 | ¿Existe lote/serie para trazabilidad? | **No** — no hay campos de lote ni número de serie en ningún modelo | Ausencia en `inventory.types.ts` y `notaIngreso.types.ts` |
| 17 | ¿Existe fecha de vencimiento en el stock? | **No** — no hay campo de vencimiento en productos ni movimientos | Ausencia en `types.ts` (Product) |
| 18 | ¿El stock se gestiona por almacén? | **Sí** — `stockPorAlmacen: Record<string, number>` en Product. Cada operación especifica `almacenId` | `types.ts:48` |
| 19 | ¿El stock se gestiona por establecimiento? | **Sí, derivado** — `stockPorEstablecimiento` se calcula sumando almacenes del establecimiento vía `recalcularTotalesStock` / `syncEstablecimientoStock` | `inventory.service.ts:113-130`, `useInventory.ts:34-48` |
| 20 | ¿Existe stock mínimo/máximo/reorden? | **Sí (mínimo/máximo)** — `stockMinimoPorAlmacen` y `stockMaximoPorAlmacen` por almacén. No existe punto de reorden ni sugerencia automática de compra | `inventory.service.ts:67-105` |
| 21 | ¿Existe valorización en transferencias? | **No** — las transferencias solo mueven cantidades. No hay costo unitario transferido | `inventory.service.ts:registerTransfer` — sin campo de costo |
| 22 | ¿Se calcula costo promedio en ingresos múltiples? | **No** — no existe motor de costo promedio ponderado. El `costoUnitario` de NI existe pero no se acumula | `notaIngreso.types.ts:LineaNotaIngreso.costoUnitario` — no propagado |
| 23 | ¿Existe ajuste de inventario? | **Sí** — AJUSTE_POSITIVO y AJUSTE_NEGATIVO disponibles desde el modal de ajuste y desde importación masiva | `inventory.types.ts:MovimientoTipo` |
| 24 | ¿Existe toma de inventario/conteo físico? | **No** — no existe flujo de conteo físico. La importación masiva puede funcionar como sustituto imperfecto | `PanelImportacionStock.tsx` — modo 'actualizar stock final' |
| 25 | ¿Existe conciliación entre libro y físico? | **No** — no hay pantalla de conciliación. Los movimientos son fuente de verdad pero no hay reporte de diferencias | Ausencia en el módulo |
| 26 | ¿El sistema maneja multi-moneda en stock? | **No en cantidades** — el campo `moneda` existe en NI/NS pero solo para el documento, no para el valor del stock | `notaIngreso.types.ts:moneda` |
| 27 | ¿Existe importación masiva de stock inicial? | **Sí** — `PanelImportacionStock` soporta Excel/CSV con dos modos: actualizar stock final y sumar ingreso | `PanelImportacionStock.tsx:388-490` |
| 28 | ¿Existe exportación de Kardex a Excel/PDF? | **Excel sí** — tab Movimientos exporta a `.xlsx` con 20 columnas. No hay exportación PDF. No hay exportación para NI/NS | `InventoryPage.tsx:104-162` |
| 29 | ¿Existe historial de ediciones/anulaciones auditables? | **Sí para NI/NS** — `historial: EventoHistorialNI[]` registra cada acción. Para movimientos directos no hay historial de edición (inmutables por diseño) | `notaIngreso.types.ts:103`, `notaSalida.types.ts:103` |
| 30 | ¿El sistema diferencia entre stock real, reservado, y disponible? | **Sí** — fórmula `disponible = real - reservado` implementada en `useInventarioDisponibilidad.ts:190-191` y `inventory.service.ts:getReservedStock` | `useInventarioDisponibilidad.ts:183-194` |

---

## Sección 3 — Auditoría por Tabs

### Tab 1: Stock Actual (situacion)
- **Propósito real:** Vista de disponibilidad por producto y almacén del establecimiento activo.
- **Lee:** `allProducts` del store + `almacenes` de configuración. Calcula en tiempo real.
- **Escribe:** Solo al editar umbrales inline (stockMinimo/stockMaximo) vía `updateStockThreshold`.
- **Genera Kardex:** No directamente. Los botones "Ajustar" y "Transferir" abren modales que sí generan Kardex.
- **Actualiza stockPorAlmacen:** No; solo lee.
- **Actualiza disponible/reservado:** No directamente; recalcula dinámicamente.
- **Exportación Excel:** Sí — exporta a través del `useAutoExportRequest('inventario-stock')` + `InventarioSituacionPage`.
- **Columnas exportadas:** SKU, Nombre, Unidad Mínima, Real, Reservado, Disponible, Situación, Stock Mínimo, Stock Máximo, precio, columnas dinámicas por almacén.
- **Riesgos:** Si el establecimiento no está seleccionado, devuelve lista vacía (correcto por seguridad). Puede mostrar productos sin stock registrado si `stockPorAlmacen` es undefined.
- **Brechas:** No muestra el campo `cantidad` legacy del producto; podría ser inconsistente si un producto tiene `cantidad` pero no `stockPorAlmacen`.

### Tab 2: Movimientos
- **Propósito real:** Historial de Kardex de cantidades filtrable por período, almacén, tipo y búsqueda.
- **Lee:** `filteredMovements` del hook `useInventory` que lee de `StockRepository.getMovements()`.
- **Escribe:** Solo exportación a Excel; no modifica datos.
- **Genera Kardex:** No; solo lectura.
- **Actualiza stock:** No.
- **Exportación Excel:** Sí — 20 columnas: Fecha, Producto, Código, Tipo, Motivo, Fuente, Movimiento, Saldo Anterior, Saldo Final, Almacén, Código Almacén, Establecimiento, Usuario, Documento/Ref., Observaciones, Es Transferencia, Transferencia ID, Tipo Transferencia, Almacén Origen, Almacén Destino.
- **Riesgos:** No incluye costo unitario (ausente en el modelo). El campo "Saldo Anterior" y "Saldo Final" son por almacén específico, no global. Puede ser confuso para transferencias donde hay dos movimientos.
- **Brechas:** No hay correlativo de movimiento secuencial. No hay exportación por rango de fechas personalizado (solo períodos fijos). Sin filtro por establecimiento en la tabla de movimientos.

### Tab 3: Transferencias
- **Propósito real:** Gestión del ciclo de vida de transferencias intra e inter-establecimiento (PENDIENTE → EN_TRANSITO → RECIBIDA/CONFIRMADA → ANULADA).
- **Lee:** `TransferenciaRepository.getAll()` + movimientos inferidos de `StockRepository`.
- **Escribe:** `TransferenciaRepository.upsert()` + movimientos via `InventoryService.registerTransfer*`.
- **Genera Kardex:** Sí — dos movimientos (SALIDA+ENTRADA) para transferencias inmediatas. Uno para despacho, uno para recepción en inter-establecimiento.
- **Actualiza stockPorAlmacen:** Sí — directamente en origen y destino.
- **Actualiza stockPorEstablecimiento:** Sí — vía `syncEstablecimientoStock` en `useInventory.ts`.
- **Actualiza reservado:** No afecta `stockReservadoPorAlmacen`.
- **Exportación Excel:** No — el panel TransferenciasPanel no tiene botón de exportación.
- **Riesgos:** Inter-establecimiento: si el almacén destino no existe en el catálogo local (multi-tenant) el producto no se actualiza en destino. La validación de `disponible < cantidad` solo aplica en intra; el despacho inter-establecimiento también la aplica pero la recepción no valida redundancia.
- **Brechas:** Sin exportación Excel en tab Transferencias (BRECHA documentada). Sin notificación push al establecimiento destino para transferencias inter. El estado EN_TRANSITO no bloquea una segunda operación de despacho (aunque el guard `estado !== 'PENDIENTE'` lo previene parcialmente).

### Tab 4: Alertas
- **Propósito real:** Panel de alertas por stock bajo/crítico/sin stock/exceso calculado dinámicamente.
- **Lee:** `stockAlerts` calculado por `InventoryService.generateAlerts()` desde `allProducts` y `almacenesActivos`.
- **Escribe:** No directamente. Botón "Ajustar stock" abre modal de ajuste que sí escribe.
- **Genera Kardex:** Indirectamente al usar el modal de ajuste.
- **Actualiza disponible/reservado:** No.
- **Exportación Excel:** Sí — columnas: Producto, Código, Almacén, Código Almacén, Establecimiento, Stock Real, Stock Reservado, Stock Disponible, Stock Mínimo, Stock Máximo, Faltante, Excedente, Estado, Es Crítico.
- **Riesgos:** Las alertas usan `disponible = real - reservado`, correcto. Pero si `stockMinimoPorAlmacen` no está configurado, el producto no genera alertas aunque tenga stock 0.
- **Brechas:** No hay alerta proactiva si el stock llega a 0 después de una venta (la alerta solo aparece cuando el usuario navega al tab). No hay notificación externa (email, notificación push).

### Tab 5: Importar Stock
- **Propósito real:** Importación masiva de stock desde Excel/CSV (dos modos: actualizar final o sumar ingreso) y reset a cero.
- **Lee:** `allProducts`, `almacenesActivos`, archivo Excel del usuario.
- **Escribe:** `InventoryService.registerAdjustment` para cada producto/almacén con `documentoReferencia = loteId (IMP-* o RST-*)`.
- **Genera Kardex:** Sí — un movimiento AJUSTE_POSITIVO o AJUSTE_NEGATIVO por cada celda modificada.
- **Actualiza stockPorAlmacen:** Sí — vía registerAdjustment + updateProduct.
- **Actualiza stockPorEstablecimiento:** Sí — vía `recalcularTotalesStock`.
- **Exportación Excel:** No directa — descarga la plantilla pre-poblada con stock actual.
- **Riesgos:** Sin transacción: si el proceso falla a mitad, el stock queda parcialmente actualizado. Sin validación de stock reservado: puede importar stock menor al reservado creando disponible negativo. Sin control de concurrencia: dos tabs abiertos simultáneamente pueden producir race conditions.
- **Brechas:** No genera contra-asiento de Kardex contable (sin costo). Reset no pregunta confirmación individual por línea. No hay rollback.

### Tab 6: Notas de Ingreso (NI)
- **Propósito real:** Registro de entradas formales al almacén con número de serie, correlativo, tipo SUNAT, proveedor, y multi-línea por producto.
- **Lee:** `cargarNotasIngreso()` de localStorage + `allProducts` + `almacenesMap`.
- **Escribe:** `agregarOActualizarNI()` al guardar borrador/generar/anular + `updateProduct` para el stock.
- **Genera Kardex:** Sí al generar — un movimiento ENTRADA por cada línea de bien.
- **Actualiza stockPorAlmacen:** Sí — vía `registerAdjustment`.
- **Actualiza stockPorEstablecimiento:** Sí — vía `recalcularTotalesStock`.
- **Actualiza reservado:** No.
- **Exportación Excel:** No hay exportación de listado NI desde el panel.
- **Riesgos:** El correlativo se calcula como `max(existentes) + 1` en memoria, sin lock. Dos tabs simultáneos podrían generar el mismo correlativo. Si el almacén de una línea no existe, esa línea se omite silenciosamente.
- **Brechas:** Sin exportación del listado NI. Sin validación de duplicidad de documento proveedor. Correlativo sin atomicidad. Historial registra acciones pero no cambios de campos (solo eventos).

### Tab 7: Notas de Salida (NS)
- **Propósito real:** Registro de salidas formales del almacén con número de serie, correlativo, tipo SUNAT, cliente, y multi-línea. Integración con OV, comprobantes, NV.
- **Lee:** `cargarNotasSalida()` de localStorage + `allProducts` + `almacenesMap`.
- **Escribe:** `agregarOActualizarNS()` + `updateProduct` + lógica de post-emisión para OV/NV.
- **Genera Kardex:** Sí al generar — un movimiento SALIDA por cada línea de bien. Al anular, AJUSTE_POSITIVO para revertir.
- **Actualiza stockPorAlmacen:** Sí.
- **Actualiza stockPorEstablecimiento:** Sí.
- **Actualiza reservado:** Sí al liberar reservas de OV (`liberarReservasDeOV`).
- **Exportación Excel:** No hay exportación del listado NS desde el panel.
- **Riesgos:** La validación pre-generación verifica stock real `stockActual < cantidad`, sin considerar el reservado. Esto puede permitir generar una NS usando stock que está reservado para una OV.
- **Brechas:** Sin exportación listado NS. La validación de stock no usa disponible (real − reservado) sino solo real — esto es una brecha de consistencia de fórmula. Sin límite de cantidad a anular en relación a entregas parciales.

---

## Sección 4 — Auditoría por Flujos

### Flujo 1: Producto → Inventario (registrar stock inicial)
- **Lo que hace:** El usuario crea un producto en el catálogo. El stock inicial se puede establecer vía Importar Stock (AJUSTE_POSITIVO) o ajuste manual.
- **Double discount posible:** No para ingreso inicial.
- **Reversión:** El ajuste puede anularse generando otro ajuste negativo (manual).
- **Kardex generado:** Sí, movimiento AJUSTE_POSITIVO con referencia IMP-*.

### Flujo 2: Nota de Ingreso (NI)
- **Lo que hace:** Crea borrador → usuario completa datos y líneas → "Generar" ejecuta `generarNIEnInventario` → actualiza stockPorAlmacen por cada línea → guarda nota como 'Generada'.
- **Double discount:** Protegido — `if (nota.estado === 'Generada') throw new Error(...)` evita regenerar. Sin embargo, el guard es en memoria; si dos tabs procesan simultáneamente la misma nota, pueden pasar ambos el check antes de que se guarde el estado 'Generada'. **Race condition real** (brecha CRÍTICA).
- **Reversión:** Anulación genera movimiento AJUSTE_NEGATIVO. Verifica que el stock actual no sea menor a la cantidad ingresada.
- **Bloqueo doble anulación:** Sí — `if (nota.estado !== 'Generada') throw new Error(...)`.

### Flujo 3: Nota de Salida (NS)
- **Lo que hace:** Crea borrador → completa datos → "Generar" ejecuta `generarNSEnInventario` → valida stock real (no disponible) → decrementa stockPorAlmacen.
- **Double discount:** Protegido por estado 'Generada', pero con la misma race condition que NI en multi-tab.
- **Reversión:** AJUSTE_POSITIVO. No valida stock negativo al anular NS (siempre suma de vuelta).
- **Brecha:** La validación pre-generación usa `stockActual < linea.cantidad` (stock real), no `disponible < linea.cantidad`. Si hay 10 unidades reservadas para OV y 5 en stock real, una NS de 5 pasa la validación pero consume el stock comprometido.

### Flujo 4: Transferencias
- **Lo que hace:** Intra-establecimiento: movimiento inmediato SALIDA+ENTRADA. Inter-establecimiento: PENDIENTE → (despacho) EN_TRANSITO → (recepción) RECIBIDA.
- **Double discount:** Protegido por estado; despacho verifica `estado === 'PENDIENTE'`, recepción verifica `estado === 'EN_TRANSITO'`.
- **Reversión:** `handleAnularTransfer` genera movimientos inversos. Para EN_TRANSITO solo revierte la SALIDA. Para CONFIRMADA/RECIBIDA revierte ambos.
- **Riesgo:** Anulación de RECIBIDA verifica `stockDestino < cantidad` pero no verifica si hay reservas o salidas posteriores en el almacén destino desde que se recibió.

### Flujo 5: Orden de Venta (OV) → Reserva de Stock
- **Lo que hace:** Al crear OV en `useDocumentoComercialActions`, llama a `validarStockParaOrden` y luego `reservarStockOrden`. Incrementa `stockReservadoPorAlmacen` sin tocar real.
- **Double discount:** No — reserva no descuenta real.
- **Liberación correcta:** Al generar NS desde OV → `liberarReservasDeOV` libera. Al anular OV → `liberarReservaOrden`. Al anular NS de OV → `restaurarOVPostAnulacionNSDirecta` (restaura OV a 'Reservada', pero no repone la reserva de stock explícitamente en todos los casos).
- **Riesgo documentado (BRECHA-02):** Si la NS directa desde OV se anula, `restaurarOVPostAnulacionNSDirecta` cambia el estado de OV pero puede no reponer `stockReservadoPorAlmacen`.

### Flujo 6: Comprobante (Factura/Boleta)
- **Lo que hace:** Solo descuenta stock si `controlStockActivo=true` y `stockDescuentoFacturaYBoleta='automatico'`. Usa FIFO + allocateSaleAcrossalmacenes.
- **Double discount:** Protección parcial — si el comprobante es desde OV, usa las reservas de OV exactas (sin re-ejecutar FIFO). Pero si el comprobante falla y el stock ya se descontó, el comprobante se marcó como creado. La recuperación es manual.
- **Reversión:** Nota de Crédito con código 06 o 07 revierte el stock al almacén original.
- **Riesgo crítico:** El comprobante se crea ANTES de descontar stock (línea 349 genera número, el stock se descuenta después). Si el descuento falla, hay un toast de warning pero el comprobante existe sin ajuste de stock. El equipo debe corregir manualmente.

### Flujo 7: POS
- **Lo que hace:** Usa el mismo `createComprobante` de `useComprobanteActions` con `source='pos'`. El flujo de stock es idéntico al de comprobante normal.
- **Diferencia:** Permiso `ventas.pos.vender` en lugar de `ventas.comprobantes.emitir`.
- **Riesgo:** Si el cajero tiene permiso POS pero no de inventario, el stock se descuenta igualmente. No hay permiso separado para el descuento de stock en POS.

### Flujo 8: Cotización
- **Lo que hace:** No afecta stock. Sin reserva ni descuento.
- **Riesgo:** Cotización sobrecomprometida no es detectada hasta que el cliente convierte a OV o comprobante.

### Flujo 9: Nota de Venta (NV)
- **Lo que hace:** Descuenta stock real directamente (no reserva) en modo automático via `descontarStockParaDocumento`. Reversión via `revertirDescuentoStockDocumento` al anular.
- **Riesgo:** No considera stock reservado (reservas de OV) al descontar. Puede consumir stock comprometido.

### Flujo 10: Guía de Remisión (GR)
- **Lo que hace:** No se encontró integración directa con stock en el análisis del código disponible. GR referenciada en `notaSalida.types.ts.guiaRemision` como campo de texto pero sin lógica de movimiento.
- **Brecha:** GR no genera movimiento Kardex.

---

## Sección 5 — Auditoría del Kardex: 16 Preguntas

| # | Pregunta | Implementado | Necesario para MVP |
|---|----------|-------------|-------------------|
| 1 | ¿Existe colección/tabla de Kardex? | Sí — `facturafacil_stock_movements` en localStorage. No es una tabla de BD relacional. | Para producción: debe migrar a BD. Para MVP local: aceptable. |
| 2 | ¿Cada movimiento tiene: fecha, tipo, doc ref, cantidad entrada/salida, saldo, costo unitario, costo total? | **Parcialmente** — tiene fecha, tipo, motivo, documentoReferencia, cantidad, cantidadAnterior (saldo previo), cantidadNueva (saldo nuevo). **Falta: costo unitario y costo total.** | Costo unitario/total es necesario para Kardex SUNAT. |
| 3 | ¿El Kardex es por producto+almacén o solo por producto? | **Por producto+almacén** — cada movimiento tiene `almacenId` explícito. | Correcto para MVP. |
| 4 | ¿El Kardex permite filtrar por rango de fechas? | **Parcialmente** — filtros fijos (hoy/semana/mes/todo). Sin rango personalizado. | Rango personalizado necesario para reportes contables. |
| 5 | ¿El Kardex se puede exportar? | **Sí** — Excel con 20 columnas desde tab Movimientos. Sin PDF. | Excel suficiente para MVP. PDF deseable. |
| 6 | ¿El saldo del Kardex coincide con el stock actual? | **Sí en la misma sesión** — `cantidadNueva` del último movimiento debería coincidir con `stockPorAlmacen[almacenId]`. **No garantizado** si hubo actualizaciones por otras rutas sin movimiento. | Reconciliación automática necesaria para auditoría. |
| 7 | ¿Los movimientos del Kardex son inmutables? | **Sí por diseño** — solo se pueden agregar movimientos, no editar. `clearAllMovements` existe pero requiere acceso directo al repositorio. | Debe protegerse `clearAllMovements` con permiso especial. |
| 8 | ¿Existe número correlativo de movimientos? | **No** — los IDs son `MOV-${Date.now()}-${random}`. No hay correlativo secuencial. | Necesario para Kardex contable SUNAT. |
| 9 | ¿El Kardex distingue tipos de movimiento? | **Sí** — ENTRADA, SALIDA, AJUSTE_POSITIVO, AJUSTE_NEGATIVO, DEVOLUCION, MERMA, TRANSFERENCIA | Correcto. |
| 10 | ¿El Kardex registra el usuario que generó el movimiento? | **Sí** — campo `usuario: string` en `MovimientoStock` | Correcto. |
| 11 | ¿El Kardex registra el costo total acumulado (valorización)? | **No** — ausencia total de campos de costo en `MovimientoStock` | Crítico para Kardex valorizado SUNAT. |
| 12 | ¿Las anulaciones generan contra-asiento? | **Sí** — NI anulada genera AJUSTE_NEGATIVO, NS anulada genera AJUSTE_POSITIVO, transferencia anulada genera movimientos inversos. | Correcto. |
| 13 | ¿El Kardex sirve como fuente de verdad para el stock actual? | **No totalmente** — el stock actual está en `product.stockPorAlmacen` (en memoria/localStorage del catálogo). El Kardex registra movimientos pero no es la fuente de reconstrucción del saldo. | Para auditoría, el stock debería poder reconstruirse desde el Kardex. Esto no es posible actualmente. |
| 14 | ¿Existe Kardex por establecimiento? | **Indirectamente** — cada movimiento tiene `EstablecimientoId` pero el filtro en UI es por almacén. El tab "Stock Actual" sí filtra por establecimiento. | Filtro explícito por establecimiento en Movimientos sería deseable. |
| 15 | ¿El Kardex es accesible desde la UI? | **Sí** — tab Movimientos en InventoryPage. | Correcto. |
| 16 | ¿El Kardex cumple el formato SUNAT para libros contables? | **No** — faltan: correlativo secuencial, costo unitario, costo total, saldo valorizado. | Necesario antes de certificación SUNAT. |

---

## Sección 6 — Consistencia de Stock: Fórmula disponible = real - reservado

### Implementación verificada
La fórmula `disponible = real - reservado` está correctamente implementada en:
- `useInventarioDisponibilidad.ts:190-191`: `const reservado = Math.min(rawReservado, Math.max(real, 0)); const disponible = Math.max(0, real - reservado);`
- `InventoryService.generateAlerts:547-548`: `const stockDisponible = Math.max(0, stockReal - stockReservado);`
- `inventory.service.ts:registerTransfer:205-209`: Valida `disponible = stockOrigen - reservedOrigen` antes de transferir.

### Lugares donde se usa `real` como `disponible` (RIESGO)

| Archivo | Línea | Descripción | Severidad |
|---------|-------|-------------|-----------|
| `notaSalida.service.ts:175-183` | ~175 | Pre-validación NS usa `InventoryService.getStock(producto, almacenLinea.id)` (stock real) para verificar si hay suficiente, sin restar reservado. Una NS puede generar sobre stock comprometido. | **ALTA** |
| `notaIngreso.service.ts:158` | ~158 | Pre-validación anulación NI usa `InventoryService.getStock(producto, almacen.id)` — correcto para anulación (verificar no quede negativo), pero podría confundirse. | Baja (correcto contextualmente) |
| `PanelImportacionStock.tsx:418` | ~418 | Al importar, usa `productoActual.stockPorAlmacen?.[almacenId] ?? 0` sin considerar reservas. El modo 'actualizar' puede fijar un stock final menor al reservado. | **MEDIA** |

---

## Sección 7 — Stock por Almacén y Establecimiento

### Fuentes de Verdad

| Campo | Fuente principal | Quién lo actualiza | Quién lo lee |
|-------|-----------------|-------------------|-------------|
| `stockPorAlmacen[almacenId]` | `Product` en memoria (Zustand/localStorage del catálogo) | `InventoryService.updateStock` via `updateProduct` | Todos los módulos |
| `stockPorEstablecimiento[estId]` | Calculado sumando almacenes del establecimiento | `recalcularTotalesStock` y `syncEstablecimientoStock` | `stockGateway.ts` como fallback |
| `stockReservadoPorAlmacen[almacenId]` | `Product` en memoria | `reservarStockOrden` y `liberarReservasDeOV` vía `updateProduct` directo | `servicioReservaStock.ts`, `useInventarioDisponibilidad.ts` |
| `cantidad` | Campo legacy en `Product` | `recalcularTotalesStock` (total de todos los almacenes) | Fallback en `stockGateway.ts` |

### Riesgo de Desincronización

1. **stockPorEstablecimiento no siempre actualizado:** `syncEstablecimientoStock` solo se llama en transferencias. En ajustes, NI, NS solo se llama `recalcularTotalesStock`. Si la función `recalcularTotalesStock` no incluye todos los establecimientos, `stockPorEstablecimiento` puede ser parcial.
   - Evidencia: `inventory.service.ts:113-130` — solo actualiza establecimientos que tienen almacenes con `establecimientoId` definido.

2. **stockReservadoPorAlmacen puede quedar positivo tras anulación de NS de OV:** Si `restaurarOVPostAnulacionNSDirecta` cambia el estado de OV a 'Reservada' pero no repone `stockReservadoPorAlmacen`, el disponible calculado aparece mayor al real comprometido.
   - Evidencia: `useNotasSalida.ts:215-220` — llama `restaurarOVPostAnulacionNSDirecta` pero no recrea la reserva explícitamente.

3. **Multi-tab race condition en localStorage:** Todos los repositorios usan read-modify-write en localStorage sin lock. Si dos pestañas ejecutan operaciones simultáneas, el segundo write puede sobreescribir el primero.

### Funciones de Sincronización Existentes
- `syncEstablecimientoStock` en `useInventory.ts` — para transferencias
- `recalcularTotalesStock` en `inventory.service.ts` — para ajustes, NI, NS, importación
- `STOCK_MOVEMENTS_CHANGED_EVENT` — evento para recargar movimientos en todos los hooks suscritos

---

## Sección 8 — Auditoría de Anulación/Reversión

| Documento | ¿Se puede anular? | ¿Qué revierte? | ¿Bloquea doble anulación? | Riesgo residual |
|-----------|------------------|----------------|--------------------------|-----------------|
| Nota de Ingreso | Sí (solo estado 'Generada') | AJUSTE_NEGATIVO por cada línea de bien | Sí — guard `estado !== 'Generada'` | Verifica stock actual ≥ cantidad ingresada; pero usa stock real sin considerar reservas |
| Nota de Salida (Generada) | Sí (no si está 'Entregada') | AJUSTE_POSITIVO por cada línea de bien | Sí — guard `estado !== 'Generada'` | No verifica limitaciones; siempre suma de vuelta |
| Transferencia PENDIENTE | Sí (cancelar) | No mueve stock | Sí — solo si `estado === 'PENDIENTE'` | Correcto |
| Transferencia EN_TRANSITO | Sí (anular) | Revierte solo SALIDA en origen | Sí | Deja destinatario sin entrada esperada |
| Transferencia CONFIRMADA/RECIBIDA | Sí (anular) | Revierte AMBOS movimientos | Sí — `estadosAnulables` check | No verifica si almacén destino ya usó el stock |
| Comprobante (NC) | Sí (mediante Nota de Crédito) | NC con código 06/07 repone stock en almacén original | No hay guard explícito de doble NC | Podría emitirse más de una NC sobre el mismo comprobante |
| OV | Sí (anular/cancelar) | Libera `stockReservadoPorAlmacen` | Estado verificado | Ver brecha de restauración post-NS anulada |

---

## Sección 9 — Auditoría de Persistencia

### localStorage Keys identificadas

| Key | Contenido | Repositorio | Tenant-scoped |
|-----|-----------|-------------|---------------|
| `facturafacil_stock_movements` → `{tenant}_facturafacil_stock_movements` | Movimientos de stock (`MovimientoStock[]`) | `StockRepository` | Sí (vía `lsKey`) |
| `facturafacil_transferencias` → `{tenant}_facturafacil_transferencias` | Transferencias (`Transferencia[]`) | `TransferenciaRepository` | Sí (vía `lsKey`) |
| `{tenant}_facturafacil_notas_ingreso` | Notas de Ingreso (`NotaIngreso[]`) | `notaIngreso.repository.ts` | Sí (vía `tryLsKey`) |
| `{tenant}_facturafacil_notas_salida` | Notas de Salida (`NotaSalida[]`) | `notaSalida.repository.ts` | Sí (vía `tryLsKey`) |
| `product` / `allProducts` | Catálogo de productos con stockPorAlmacen | `useProductStore` (Zustand persist) | Dependiente del store |

### Eventos y Cleanup

| Evento | Publicado por | Suscriptor(es) | Cleanup |
|--------|--------------|---------------|---------|
| `facturafacil:stock-movements-changed` | `StockRepository.addMovement/addMovements` | `useInventory.ts` useEffect | Sí — `removeEventListener` en cleanup |
| `facturafacil:notas-ingreso-changed` | `guardarNotasIngreso` | `useNotasIngreso.ts` useEffect | Sí |
| `facturafacil:notas-salida-changed` | `guardarNotasSalida` | `useNotasSalida.ts` useEffect | Sí |
| `facturafacil:comprobante-ns-generada` | `useNotasSalida.generarNS` | Módulo comprobantes | No verificado en este análisis |
| `facturafacil:comprobante-ns-anulada` | `useNotasSalida.anularNS` | Módulo comprobantes | No verificado |

### Riesgos de Desincronización tras Refresh
1. **Transferencias en estado PENDIENTE:** Si el usuario refresca durante el flujo inter-establecimiento, `setTransferencias` se reinicia desde `TransferenciaRepository.getAll()` (correcto — persiste en localStorage). **No hay pérdida de datos.**
2. **Movimientos en `filteredMovements`:** Se recarga desde `StockRepository.getMovements()` al montar (correcto).
3. **stockReservadoPorAlmacen:** Persiste en el producto (localStorage del catálogo). Si el catálogo se carga correctamente, la reserva sobrevive al refresh.
4. **sessionStorage (`conversionSourceId`, `conversionSourceType`):** Usado en `useComprobanteActions` para detectar conversión desde OV. Si el usuario abre la emisión en una nueva pestaña, `sessionStorage` no se comparte: el comprobante sería tratado como venta directa, potencialmente usando FIFO en vez de las reservas de OV.

### Campos Solo en Memoria
- `suggestedQuantity`, `prefilledAlmacenId`, `adjustmentMode` en `useInventory` — no persisten, solo UI state.
- `resultadoParseo`, `resultadoImportacion` en `PanelImportacionStock` — no persisten.

---

## Sección 10 — Auditoría de Importación/Exportación

### Importación Masiva
- **Modo:** Dos modos: "Actualizar stock final" (reemplaza) y "Sumar ingreso" (acumula).
- **Validaciones pre-aplicación:** Archivo vacío, columnas desconocidas, códigos duplicados, cantidades negativas según modo.
- **Kardex generado:** Sí — un movimiento AJUSTE_POSITIVO o AJUSTE_NEGATIVO por celda modificada, con `documentoReferencia = loteId`.
- **Sin transacción:** Si el proceso se interrumpe (error de memoria, cierre del tab), el stock puede quedar parcialmente actualizado.
- **Sin validación de stock reservado:** No verifica si el stock final importado sería menor al reservado.

### Exportaciones Excel por Tab

| Tab | Exporta | Columnas | Notas |
|-----|---------|----------|-------|
| Movimientos | Sí | 20 columnas (ver Sección 3) | Respeta filtros de período, almacén, tipo y búsqueda |
| Stock Actual | Sí (auto-export) | SKU, Nombre, Unidad, Real, Reservado, Disponible, Situación, Mín, Máx + por almacén | Requiere establecimiento seleccionado |
| Alertas | Sí | 14 columnas incluyendo Real/Reservado/Disponible | Exporta todas las alertas activas |
| Transferencias | **No** | — | Brecha |
| Notas de Ingreso | **No** | — | Brecha |
| Notas de Salida | **No** | — | Brecha |
| Importar Stock | Solo plantilla descarga | Stock actual por almacén | No es exportación de Kardex |

---

## Sección 11 — Auditoría UI/UX

| Tipo | Descripción | Archivo | Impacto |
|------|-------------|---------|---------|
| IDs técnicos visibles | `transferenciaId` como `TRF-YYYYMMDD-HHmmss` visible en UI de transferencias y en columna "Doc/Ref." de movimientos — correcto y legible. | `MovementsTable.tsx:264` | Bajo — es un correlativo legible |
| Texto confuso | "Resetear stock a cero" no indica claramente que crea movimientos de ajuste negativo auditables | `PanelImportacionStock.tsx:901` | Medio |
| Campos faltantes en tabla Movimientos | Sin columna de "Costo Unitario" | `MovementsTable.tsx` | Medio para auditoría |
| Sin confirmación en doble clic | El botón "Aplicar cambios (N)" en importación no tiene debounce/disable post-click | `PanelImportacionStock.tsx:828` | Alto — doble importación posible |
| Botón "Ajustar stock" en Alertas | Sugiere abrir modal pero no indica cuánto ajustar ni de dónde viene la sugerencia de cantidad | `AlertsPanel.tsx:199` | Bajo |
| Cintillo de "Control inactivo" | Banner informativo cuando `controlStockActivo=false` permite al usuario acceder y modificar inventario sin activar el control — correcto por diseño pero puede confundir | `CintilloControlStock` | Bajo |

---

## Sección 12 — Auditoría Técnica

### Código Duplicado
- `resolveIgvRate` existe en `notaIngreso.service.ts:226` y `resolveIgvRateNS` en `notaSalida.service.ts:81` — lógica casi idéntica.
- `generarCorrelativoNI` y `generarCorrelativoNS` son funciones idénticas con tipos diferentes.
- `calcularDesgloseTributario` y `calcularDesgloseTributarioNS` son funciones casi idénticas.
- `prepararDuplicado` y `prepararDuplicadoNS` — misma estructura con tipos diferentes.

### Código Muerto / Potencial
- `StockRepository.clearAllMovements()` — existe pero no tiene guard de permiso. Si se llama desde cualquier ruta, borra todo el Kardex.
- `generateMovementId` en `inventory.helpers.ts:143` — definida pero los movimientos usan `MOV-${Date.now()}-${random}` directamente en `inventory.service.ts`.

### Tipos `any` innecesarios
- `PanelImportacionStock.tsx:1` — `/* eslint-disable @typescript-eslint/no-explicit-any -- XLSX sheet_to_json retorna any[][] */` — aceptable como boundary pero podría tipificarse mejor.

### Magic Strings
- Eventos en strings: `'facturafacil:stock-movements-changed'`, `'facturafacil:notas-ingreso-changed'`, etc. — están como constantes exportadas en los repositorios. Correcto.
- `sessionStorage.getItem('conversionSourceType')` y `'conversionSourceId'` en `useComprobanteActions.tsx:309` — strings literales sin constante, riesgo de typo.

### Listeners sin Cleanup
- `useInventory.ts:86`: `removeEventListener(STOCK_MOVEMENTS_CHANGED_EVENT, recargar)` — cleanup correcto.
- `useNotasIngreso.ts:37`: `removeEventListener(NOTAS_INGRESO_CHANGED_EVENT, recargar)` — correcto.
- `useNotasSalida.ts:47`: Correcto.
- `useComprobanteActions.tsx:111-112`: Eventos `'facturafacil:comprobante-ns-generada'` y `'facturafacil:comprobante-ns-anulada'` disparados con `window.dispatchEvent` pero no se encontraron los listeners correspondientes en el análisis — posible listener sin limpieza en módulo de comprobantes.

### Ausencia de Transacciones
Todas las operaciones que afectan múltiples productos o múltiples repositorios son secuenciales sin rollback. Ejemplos:
- Importación masiva: 100 productos, falla en el producto 50, los 49 anteriores ya están actualizados.
- `generarNIEnInventario`: procesa líneas en bucle; si `registerAdjustment` falla en línea 3, líneas 1-2 ya actualizaron el stock.

---

## Sección 13 — Matriz de Escenarios (25 Escenarios)

| # | Escenario | Estado | Cumple | Riesgo | Evidencia | Recomendación |
|---|-----------|--------|--------|--------|-----------|---------------|
| 1 | Usuario registra NI → stock sube en almacén destino | Implementado | Sí | Bajo | `notaIngreso.service.ts:99-110` | Sin cambios |
| 2 | Usuario registra NS → stock baja en almacén origen | Implementado | Sí (parcial) | Medio | `notaSalida.service.ts:175-183` — valida real, no disponible | Cambiar validación a `disponible` |
| 3 | Usuario transfiere stock → origen baja, destino sube | Implementado | Sí | Bajo | `inventory.service.ts:registerTransfer` | Sin cambios para intra |
| 4 | Usuario emite factura → stock baja en almacén del establecimiento | Implementado condicionalmente | Sí (si controlStockActivo + modo auto) | Medio | `useComprobanteActions.tsx:533-686` | Documentar modo claramente |
| 5 | Usuario emite boleta → stock baja | Implementado (igual que factura) | Sí | Medio | Mismo flujo | Ídem |
| 6 | POS vende → stock baja en almacén asignado al POS | Implementado | Sí | Bajo | POS usa mismo `createComprobante` | Sin cambios |
| 7 | OV reserva → stockReservado sube, disponible baja | Implementado | Sí | Bajo | `servicioReservaStock.ts:117-165` | Sin cambios |
| 8 | OV se convierte a factura → reserva se libera, stock baja | Implementado | Sí | Medio | `useComprobanteActions.tsx:546-668` + `obtenerReservasDeOV` | Verificar atomicidad |
| 9 | OV se anula → reserva se libera | Implementado | Sí | Bajo | `liberarReservaOrden` | Sin cambios |
| 10 | NI se anula → stock revierte | Implementado | Sí | Bajo | `anularNIEnInventario` | Sin cambios |
| 11 | NS se anula → stock revierte | Implementado (solo 'Generada') | Sí | Bajo | `anularNSEnInventario` | No permite anular 'Entregada' — revisar si necesario |
| 12 | Transferencia se anula → stock revierte en ambos almacenes | Implementado | Sí | Medio | `inventory.service.ts:registerTransferAnulacion` | No verifica si almacén destino ya usó el stock |
| 13 | Factura se anula → stock revierte | Implementado vía NC códigos 06/07 | Parcial | Alto | `useComprobanteActions.tsx:689-769` | Agregar guard doble-NC |
| 14 | POS se anula | No implementado explícitamente como POS | No (misma ruta NC) | Alto | Mismo mecanismo que factura | Definir flujo de anulación POS |
| 15 | Stock llega a mínimo → alerta se dispara | Implementado (reactivo) | Sí | Bajo | `InventoryService.generateAlerts:544-597` | Sin cambios |
| 16 | Stock negativo → sistema bloquea o permite | Configurable | Parcial | Alto | `allowNegativeStock` en salesPreferences | Unificar control en todos los flujos (NS no lo aplica) |
| 17 | Importación masiva → stock se establece correctamente | Implementado | Sí (sin transacción) | Medio | `PanelImportacionStock.tsx:388-490` | Agregar doble-clic protection |
| 18 | Multi-almacén → producto tiene stock diferente por almacén | Implementado | Sí | Bajo | `stockPorAlmacen: Record<string,number>` | Sin cambios |
| 19 | Multi-establecimiento → stock se aísla por establecimiento | Implementado | Sí | Medio | `isProductEnabledForEstablecimiento` + filtros por `currentEstablecimientoId` | BRECHA-03: si `stockPorEstablecimiento` es null puede inicializarse incorrectamente |
| 20 | Producto sin control de stock → flujos no afectan stock | Implementado | Sí | Bajo | `requiresStockControl` flag en CartItem | Sin cambios |
| 21 | Doble clic en guardar NI → duplicación de movimiento | Riesgo real | No protegido | **Crítico** | `notaIngreso.service.ts:57-59` — check en memoria, race condition multi-tab | Agregar debounce/disable en botón Generar |
| 22 | Cierre de sesión → datos en memoria se pierden | Parcialmente | Sí | Bajo | localStorage persiste; estado de UI se pierde pero datos no | Sin cambios |
| 23 | Refresh durante transferencia inter-est. PENDIENTE → estado consistente | Implementado | Sí | Bajo | Estado persiste en `facturafacil_transferencias` localStorage | Sin cambios |
| 24 | Dos usuarios simultáneos → race condition en stock | **No protegido** | No | **Crítico** | localStorage no tiene lock; read-modify-write no atómico | Implementar optimistic locking o migrar a BD |
| 25 | Kardex muestra historial completo → todos los movimientos registrados | Implementado para operaciones vía service | Parcial | Medio | Comprobantes, NS, NI, ajustes generan movimientos. Cambios directos via updateProduct sin `registerAdjustment` no generan Kardex | Auditar todos los updateProduct directos |

---

## Sección 14 — Matriz de Brechas

| ID | Brecha | Severidad | Flujo | Archivo(s) | Impacto | Recomendación | Prioridad |
|----|--------|-----------|-------|------------|---------|---------------|-----------|
| B-01 | Race condition en generación de NI/NS: dos tabs simultáneos pueden generar la misma nota dos veces si ambos pasan el check `estado !== 'Generada'` antes de que cualquiera persista el cambio | **Crítica** | NI, NS | `notaIngreso.service.ts:57`, `notaSalida.service.ts:145` | Doble movimiento en Kardex, stock duplicado | Implementar lock optimista en repositorio (timestamp + versión) o button disable post-clic | P0 |
| B-02 | stockReservadoPorAlmacen no se repone al anular NS directa desde OV: `restaurarOVPostAnulacionNSDirecta` cambia estado de OV a 'Reservada' pero no recrea la reserva en `stockReservadoPorAlmacen` | **Alta** | NS → OV | `useNotasSalida.ts:215-220`, `postEmisionOrdenVenta.ts` | Stock disponible aparece mayor al real comprometido; OV puede re-ejecutarse sin stock | En `anularNS`, si `origen === 'OrdenVenta'`, reponer la reserva de stock llamando a `reservarStockOrden` | P1 |
| B-03 | syncEstablecimientoStock no inicializa mapa si `stockPorEstablecimiento` es null/undefined al crear producto nuevo en establecimiento destino de transferencia inter-est. | **Alta** | Transferencias inter | `useInventory.ts:40` — comentario `// BRECHA-03` existente | Stock del establecimiento destino puede quedar en 0 o undefined aunque el almacén tenga stock | El código ya tiene el comentario de la brecha; la solución está indicada: inicializar el mapa. Implementar la inicialización. | P1 |
| B-04 | Validación de stock en NS usa stock real, no disponible (real − reservado): `generarNSEnInventario` valida `stockActual < linea.cantidad` sin restar `stockReservadoPorAlmacen` | **Alta** | NS | `notaSalida.service.ts:175-183` | NS puede consumir stock reservado para una OV activa | Cambiar validación a `InventoryService.getReservedStock` + comparar disponible | P1 |
| B-05 | Comprobante creado antes de descontar stock: si el descuento falla, el comprobante existe pero el stock no se actualizó | **Alta** | Comprobantes electrónicos | `useComprobanteActions.tsx:349-686` | Kardex y stock real desincronizados; corrección manual necesaria | Reordenar: descontar stock primero (o usar saga pattern) | P1 |
| B-06 | Sin número correlativo secuencial en movimientos de Kardex | **Alta** | Todos | `inventory.service.ts:163` — ID con timestamp+random | No cumple formato Kardex SUNAT para libros contables | Implementar correlativo auto-incremental por almacén+año en el repositorio | P1 |
| B-07 | Sin costo unitario en movimientos de Kardex: `LineaNotaIngreso.costoUnitario` existe pero no se propaga a `MovimientoStock` | **Alta** | NI, NS, Kardex | `notaIngreso.service.ts:89-111`, `inventory.types.ts` | Kardex sin valorización; no cumple SUNAT libro 12 | Agregar `costoUnitario` y `costoTotal` a `MovimientoStock` y propagarlo desde NI | P1 |
| B-08 | Sin exportación Excel en tabs Transferencias, NI, NS | **Media** | Transferencias, NI, NS | `TransferenciasPanel.tsx`, `NotasIngresoPanel.tsx`, `NotasSalidaPanel.tsx` | Usuario no puede exportar registros para auditoría o contabilidad | Agregar botón de exportación Excel con columnas relevantes | P2 |
| B-09 | Sin transacción en importación masiva: fallo parcial deja stock inconsistente | **Media** | Importar | `PanelImportacionStock.tsx:388-490` | Stock puede quedar en estado intermedio | Implementar lista de cambios pendientes y aplicarlos todos o revertir al error | P2 |
| B-10 | Sin filtro de rango de fechas personalizado en tab Movimientos | **Media** | Movimientos | `InventoryPage.tsx` — solo hoy/semana/mes/todo | No se puede generar Kardex por período contable específico | Agregar DatePicker desde/hasta | P2 |
| B-11 | `StockRepository.clearAllMovements()` sin guard de permiso | **Media** | Transversal | `stock.repository.ts:111-114` | Cualquier código puede borrar todo el Kardex | Proteger con permiso `inventario.admin` o eliminar el método público | P2 |
| B-12 | Correlativo NI/NS sin atomicidad (multi-tab): `Math.max(...usados) + 1` puede generar correlativo duplicado | **Media** | NI, NS | `notaIngreso.service.ts:31-41`, `notaSalida.service.ts:47-57` | Dos notas con mismo correlativo; invalido para SUNAT | Usar timestamp + uuid como fallback hasta tener backend | P2 |
| B-13 | sessionStorage `conversionSourceType/Id` no compartido entre tabs: comprobante desde OV en nueva pestaña usa FIFO en lugar de reservas de OV | **Media** | Comprobantes desde OV | `useComprobanteActions.tsx:309` — strings literales | Stock descontado de almacén diferente al reservado por OV | Migrar conversionSource a localStorage con clave por comprobante en curso | P2 |
| B-14 | No hay exportación PDF del Kardex | **Baja** | Movimientos | `InventoryPage.tsx:handleExportToExcel` | Solo Excel; SUNAT puede requerir PDF en algunos escenarios | Implementar exportación PDF en fase post-MVP | P3 |
| B-15 | Doble clic en "Aplicar cambios" de importación puede ejecutar dos veces | **Baja** | Importar | `PanelImportacionStock.tsx:828` — botón sin disable post-click | Posible doble ajuste de stock | Agregar `disabled` al botón durante la ejecución | P2 |
| B-16 | No hay lote/serie ni fecha de vencimiento | **Mejora futura** | Todos | `inventory.types.ts` | Trazabilidad limitada para productos con fecha crítica | Agregar en fase post-MVP como extensión del modelo | P4 |
| B-17 | GR no genera movimiento Kardex | **Baja** | GR | `notaSalida.types.ts:guiaRemision` — solo campo de texto | Guía remisionada no registra salida física | Definir si GR debe generar NS automáticamente | P3 |
| B-18 | Kardex no puede reconstruir stock actual (no es fuente de verdad única) | **Alta** | Todos | Divergencia entre `stockPorAlmacen` en producto y movimientos en `stock_movements` | Sin reconciliación posible; auditoría manual difícil | Implementar función de reconstrucción de saldo desde movimientos para verificación | P2 |

---

## Sección 15 — Veredicto Final

### Calificación: **C — Requiere correcciones importantes antes de MVP**

**Justificación:**

El módulo tiene una arquitectura conceptualmente sólida: inventario perpetuo con Kardex de cantidades, gestión por almacén y establecimiento, 7 tabs funcionales, integración con comprobantes y OV, anulaciones con reversión de movimientos. Para uso interno de una empresa pequeña con un solo usuario activo, el sistema funcionaría correctamente.

Sin embargo, para un MVP multi-usuario, multi-establecimiento, con flujos contables reales exigidos por SUNAT, existen las siguientes razones que impiden un veredicto B:

1. **Race condition en NI/NS (B-01):** Dos tabs simultáneos pueden duplicar movimientos, corrompiendo el Kardex y el stock. Esta es una brecha inherente al patrón localStorage sin lock.

2. **Kardex sin valorización (B-07):** El costo unitario del `LineaNotaIngreso` no se propaga al movimiento. Sin esto, el módulo no cumple el Libro de Inventarios y Balances (SUNAT Libro 12) que requiere valorización por PEPS, promedio u otro método.

3. **Validación NS sobre stock real en lugar de disponible (B-04):** Una NS puede generar consumiendo stock comprometido para una OV activa, creando una inconsistencia difícil de detectar.

4. **Sin correlativo secuencial en Kardex (B-06):** SUNAT requiere numeración correlativa en el libro de Kardex.

5. **Sin transacciones (B-05, B-09):** Fallos parciales dejan el sistema en estados inconsistentes sin posibilidad de rollback automático.

Los puntos 2 y 4 son específicamente requeridos por la normativa peruana SUNAT para cualquier empresa que lleve Kardex valorizado (régimen general, medianos y grandes contribuyentes). Sin embargo, para empresas en RUS o RER que solo necesitan control operativo de cantidades, el veredicto podría elevarse a B.

---

## Sección 16 — Checklist de Cierre

### Bloqueantes (P0/P1)
- [ ] **B-01:** Implementar protección contra race condition en generación NI/NS (disable de botón durante ejecución + verificación fresh del estado antes de procesar)
- [ ] **B-02:** Reponer `stockReservadoPorAlmacen` al anular NS directa desde OV en `useNotasSalida.anularNS`
- [ ] **B-03:** Inicializar `stockPorEstablecimiento` en `syncEstablecimientoStock` cuando sea null/undefined
- [ ] **B-04:** Cambiar validación pre-generación NS de stock real a stock disponible (real − reservado)
- [ ] **B-05:** Descontar stock antes de crear el número de comprobante, o implementar compensación atómica
- [ ] **B-06:** Implementar correlativo secuencial en movimientos de Kardex (al menos por año)
- [ ] **B-07:** Propagar `costoUnitario` de `LineaNotaIngreso` al `MovimientoStock` correspondiente

### No Bloqueantes (P2)
- [ ] **B-08:** Exportación Excel en tabs Transferencias, NI, NS
- [ ] **B-09:** Transacción en importación masiva (rollback en error)
- [ ] **B-10:** Filtro de rango de fechas personalizado en Movimientos
- [ ] **B-11:** Guard de permiso en `StockRepository.clearAllMovements()`
- [ ] **B-12:** Correlativo NI/NS con mayor robustez anti-duplicados
- [ ] **B-13:** Migrar `conversionSourceType/Id` de sessionStorage a localStorage con scope de comprobante
- [ ] **B-15:** Disable de botón "Aplicar cambios" durante ejecución de importación
- [ ] **B-18:** Función de reconciliación Kardex → stock para verificación de integridad

### Mejoras UX (P3)
- [ ] Rango de fechas personalizado en exportación de Movimientos
- [ ] Exportación PDF del Kardex
- [ ] Confirmación de cantidad sugerida en botón "Ajustar stock" desde Alertas
- [ ] Indicador visual de "Procesando..." durante generación NI/NS con bloqueo de UI
- [ ] Refactorizar funciones duplicadas (`resolveIgvRate`, `generarCorrelativo`, `prepararDuplicado`) a shared

### Mejoras Técnicas (P3)
- [ ] Unificar `resolveIgvRate` / `resolveIgvRateNS` en función compartida en `shared/`
- [ ] Unificar `generarCorrelativoNI` / `generarCorrelativoNS` en función genérica
- [ ] Exportar constantes de sessionStorage keys en `shared/conversionContext.ts`
- [ ] Agregar tipos explícitos en lugar de `any` en `PanelImportacionStock.tsx`

### Post-MVP / Futuro (P4)
- [ ] **B-16:** Soporte de lote/número de serie y fecha de vencimiento
- [ ] **B-17:** GR genera NS automática o viceversa
- [ ] Migración de localStorage a backend real (eliminar todas las race conditions)
- [ ] Kardex valorizado con método promedio ponderado
- [ ] Motor FIFO/PEPS para valorización (requerimiento SUNAT régimen general)
- [ ] Conteo físico / toma de inventario
- [ ] Conciliación libro vs. físico
- [ ] Notificaciones proactivas (email/push) para alertas de stock
- [ ] Exportación Kardex en formato SUNAT para declaración

---

*Fin del reporte de auditoría. Archivos auditados: 30 (24 core + 6 externos). Fecha: 2026-06-14.*
