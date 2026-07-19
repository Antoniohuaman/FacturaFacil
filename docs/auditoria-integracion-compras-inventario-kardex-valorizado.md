# Auditoría integral — Compras, Inventario y Kardex valorizado

**Fecha:** 2026-07-16
**Alcance:** auditoría técnica y funcional de solo lectura. No se modificó código funcional, modelos, servicios ni configuraciones. Único artefacto de esta tarea: este documento.
**Repositorio:** `C:\FacturaFacil` — app auditada: `apps/senciyo/src`.

---

## 1. Resumen ejecutivo

SenciYo tiene hoy un **Inventario puramente cuantitativo**. No existe ningún mecanismo de valorización: `MovimientoStock` (el "Kardex") no tiene campo de costo, moneda ni tipo de cambio; no existe ningún modelo de capas/lotes; y las funciones que se llaman "FIFO" (`resolvealmacenesForSaleFIFO`, `allocateSaleAcrossalmacenes`) únicamente deciden **de qué almacén** se descuenta una cantidad — no consumen capas de costo. `Configuration.inventory.costMethod` (`'FIFO'|'LIFO'|'AVERAGE'|'SPECIFIC'`) está declarado en el esquema de configuración pero no tiene ningún motor de costeo detrás: es configuración fantasma.

**Compras e Inventario están desacoplados en runtime, no solo parcialmente conectados.** El puente documental (`mapeadorCCaNI.ts` → `prepararDatosNIDesdeCC`, `calcularEstadosCompra.ts` → `calcularEstadoInventarioCC/OC`) es código huérfano: existe, compila, se exporta, pero **cero archivos lo invocan** (confirmado por grep exhaustivo). De las 3 modalidades de inventario declaradas en el tipo (`con_nota_ingreso`, `ingreso_automatico`, `no_afecta_inventario`), solo 2 son alcanzables desde la UI real (`SelectorModalidadInventario.tsx` solo ofrece 2 `<option>`); `ingreso_automatico`, aunque se pudiera seleccionar programáticamente, **solo cambia un campo de estado en texto** (`estadoInventario`) — no crea Nota de Ingreso, no genera movimiento de Kardex, no toca stock. No existe ningún botón "Generar NI" conectado desde Compras.

`Product.precioCompra` ("precio de compra") es un **costo referencial manual, estático**, que únicamente pre-rellena el costo unitario al crear una línea nueva en Compras o en Nota de Ingreso. Nunca se actualiza automáticamente tras una compra real, no tiene moneda asociada, y no lo consume ningún cálculo de margen (el módulo Precios no tiene ningún campo de costo/utilidad/margen).

El **factor de conversión de presentaciones comerciales se aplica correctamente en Ventas/POS**, pero **no se aplica en el flujo Compras → Nota de Ingreso**: si una línea de compra se registra en una presentación distinta a la unidad mínima (ej. "CAJA x12"), la cantidad numérica no se reescala al generar el movimiento de stock — riesgo de corrupción de cantidades de inventario, previo incluso a cualquier tema de valorización.

Las **ventas usan 3 motores de descuento de stock distintos** (Nota de Venta vía `InventoryService.registerAdjustment`; Factura/Boleta/POS vía `inventory.facade.ts` — un motor separado que reimplementa la misma aritmética; Nota de Salida vía el mismo `registerAdjustment` que NV), lo que implica que cualquier lógica de consumo de capas FIFO por costo deberá implementarse y mantenerse en 3 lugares si no se unifica antes.

**Con la evidencia recolectada, hoy no es posible calcular el costo real de una venta, la utilidad bruta ni el margen.** No hay infraestructura alguna que lo soporte — ni persistida ni derivada. Esto no es una brecha menor de cableado: es ausencia total de la capa de costeo.

---

## 2. Alcance auditado

Módulos inspeccionados con evidencia de código (ver §26 para el listado completo de archivos):

1. Productos (`catalogo-articulos/`)
2. Presentaciones comerciales y unidades de medida (`shared/units/`, `shared/inventory/unitConversion.ts`)
3. Inventario (`gestion-inventario/`)
4. Kardex y movimientos (`gestion-inventario/models/inventory.types.ts`, `services/inventory.service.ts`)
5. Notas de Ingreso (`gestion-inventario/services/notaIngreso.service.ts` + tipos + UI)
6. Notas de Salida (`gestion-inventario/services/notaSalida.service.ts` + tipos + UI)
7. Ajustes de inventario (`useInventory.ts`, `AdjustmentModal.tsx`)
8. Importación de stock (`PanelImportacionStock.tsx`)
9. Compras (`compras/` completo)
10. Orden de Compra (`compras/modelos/OrdenCompra.ts`, `servicios/servicioOrdenCompra.ts`)
11. Comprobante de Compra (`compras/modelos/ComprobanteCompra.ts`, `FormularioComprobanteCompra.tsx`)
12. Cuentas por Pagar y Pagos (`servicioCuentaPorPagar.ts`, `servicioPagoCompra.ts`) — solo para desacoplamiento
13. Comprobantes de venta (`comprobantes-electronicos/`)
14. Punto de Venta (`punto-venta/hooks/useCart.tsx`, `usePosComprobanteFlow.tsx`) — solo salidas
15. Órdenes de Venta y reservas (`documentos-comerciales/utils/servicioReservaStock.ts`, `postEmisionOrdenVenta.ts`) — solo interacción con stock
16. Precios (`lista-precios/`)
17. Configuración (`configuracion-sistema/`)
18. Almacenes (`shared/inventory/stockGateway.ts`, `TransferModal.tsx`)
19. Monedas y precisión monetaria (`shared/currency/`)
20. Impuestos (`configuracion-sistema/modelos/Tax.ts`)
21. Reportes/dashboards (`indicadores-negocio/`)

No se modificó ningún archivo de estos módulos.

---

## 3. Arquitectura actual encontrada

- **Frontend puro, sin backend**: toda persistencia es `localStorage`, vía repositorios por dominio (`stock.repository.ts`, `notaIngreso.repository.ts`, `notaSalida.repository.ts`, y equivalentes en Compras/Ventas). No hay servidor ni base de datos — relevante para el riesgo de migración (§25).
- **Estructura en español** para Compras (`compras/{componentes,paginas,modelos,servicios,repositorios,contexto,utilidades,constantes,mapeadores}/`), consistente con la decisión de arquitectura fijada en la Fase 0/1 del módulo (ver memoria de proyecto).
- **Inventario vive en `gestion-inventario/`**, independiente de Compras. La Nota de Ingreso pertenece a este módulo, no a Compras — confirmado: 100% de los archivos de NI están dentro de `gestion-inventario/`.
- **Tres motores de descuento de stock coexisten** (NV, Factura/Boleta/POS, NS) sin una única función central — ver §8 y matriz de movimientos (§21).
- **Módulo Precios (`lista-precios/`) totalmente aislado** de costo: no importa nada de `catalogo-articulos` salvo unidad/presentación, nunca `precioCompra`.
- **Utilidad central de moneda sólida** (`shared/currency/currencyManager.ts`), pero el cálculo de IGV está duplicado con fallback `0.18` hardcodeado en al menos 6 archivos distintos, y no hay integración de tipo de cambio en el Kardex.

---

## 4. Modelo actual de Productos y presentaciones

### Producto (`catalogo-articulos/models/types.ts:12-60`, interface `Product`)

Campos relevantes: `id, codigo, nombre, unidad, precio, categoria, unidadesMedidaAdicionales?, precioCompra?, porcentajeGanancia?, tipoExistencia?, cantidad?, stockPorEstablecimiento?, stockPorAlmacen?, stockReservadoPorAlmacen?, stockReservadoOVPorEstablecimiento?`.

> Nota: existe un segundo tipo llamado también `Product` en `lista-precios/models/PriceTypes.ts:61-66` (shape del price-book, no relacionado al catálogo) — riesgo de confusión de nombre, no de dato.

- **Control de inventario**: no existe un flag persistente por producto (`controlaInventario` no existe). Se deriva de dos mecanismos: (a) switch global `salesPreferences.controlStockActivo` (`configuracion-sistema/contexto/ContextoConfiguracion.tsx:82`), y (b) `tipoExistencia === 'SERVICIOS'` evaluado ad-hoc en cada consumidor (NI, NS, Transferencias, búsqueda de productos).
- **Unidad mínima**: `product.unidad`, resuelta siempre vía `resolveUnidadMinima()` (`shared/inventory/unitConversion.ts:30-32`).
- **Unidad base ≠ unidad mínima**: no existen como conceptos separados — son el mismo campo (`product.unidad`) con dos nombres distintos según el archivo que lo consuma (`unitConversion.ts`/`stockGateway.ts` dicen "unidad mínima"; `useLineasCompra.ts`/`ProductPricingTable.tsx` dicen "unidad base").
- **Presentaciones comerciales**: `AdditionalUnitMeasure[]` (`types.ts:3-10`): `{ id, nombre, unidadCodigo, factorConversion, unidadSymbol?, unidadName? }`. **Sin precio propio, sin costo propio, sin estado activo/inactivo** (verificado contra el formulario real `ProductAdditionalUnitsTable.tsx`, sin ningún campo de estos tres).
- **Factor de conversión — uso real**:
  - ✅ Ventas/POS (`comprobantePricing.ts`, `useCart.tsx`, `servicioReservaStock.ts`) — consistente.
  - ❌ **Compras → Nota de Ingreso**: `mapeadorCCaNI.ts:39-51` copia `cantidad: l.cantidadRecibida` **sin multiplicar por `factorConversion`**; `notaIngreso.service.ts` y `InventoryService.registerAdjustment` reciben ese número directo, sin ningún parámetro de unidad/factor. **Riesgo confirmado**: comprar 2 cajas de 12 puede ingresar "2" al stock en vez de "24".
  - ❌ Notas de Ingreso/Salida/Ajustes/Transferencias en `gestion-inventario/`: grep de `factorConversion`/`factor` dentro de toda la carpeta sin resultados.
- **Conversiones duplicadas**: `usePriceBook.ts` (`comprobantes-electronicos/.../usePriceBook.ts:73-98`) reimplementa su propia resolución de factor en vez de reusar `unitConversion.ts`; el parseo de "código compuesto de presentación" (separador `__`) está repetido en 3 archivos (`shared/units/codigoPresentacion.ts`, `usePriceBook.ts`, `unitConversion.ts`).
- **Snapshot histórico de factor**: `MovimientoStock` no guarda ni unidad ni factor — no hay campo que "consultar" después. Para movimientos de venta la cantidad ya queda convertida a unidad mínima en el momento (congelada correctamente); para Compras/NI el problema es previo (nunca se convirtió, ver arriba).

### Campo "precio de compra" (`Product.precioCompra?: number`, `types.ts:30`)

- **Etiqueta UI real**: "Precio inicial de compra" con tooltip explícito *"Costo referencial para márgenes. No afecta stock por sí solo."* (`ProductFinancialSection.tsx:34,37`).
- **Consumidores confirmados**: prellenar `costoUnitario` en línea nueva de Compras (`servicioOrdenCompra.ts:97`) y de Nota de Ingreso (`FormularioNotaIngreso.tsx:399`) — en ambos casos editable y no vinculante. Copiado también en selectores de venta (`useAvailableProducts.tsx`, `ProductSelector.tsx`) sin ningún cálculo de margen asociado.
- **No consumido por**: Inventario/Kardex (`MovimientoStock` no lo referencia), módulo Precios (grep sin resultados), Compras nunca escribe de vuelta a este campo (grep recursivo de `updateProduct`/`useProductStore` en todo `compras/` sin resultados).
- **Qué representa**: costo referencial estático de entrada manual — no es costo inicial contable formal, no es último costo real (no se actualiza tras comprar), no es precio de venta.
- **`porcentajeGanancia?: number`** (`types.ts:31`): declarado, editable, mostrado — pero **sin ninguna lógica de cálculo** que lo use para derivar `precio` pese a que su tooltip promete justo eso ("Se usa para sugerir precio de venta desde el costo"). Es un campo decorativo.
- **Riesgo de mantenerlo como fuente paralela**: alto, si se implementa Kardex valorizado sin decidir su rol — quedarían dos "costos" no sincronizados (`precioCompra` manual vs. costo real derivado del Kardex).
- **Recomendación (fundamentada, no implementada)**: convertirlo en **costo inicial** (semilla del primer lote/capa al activar valorización para un producto con stock preexistente), y a partir de ahí dejar de escribirlo manualmente — el costo vigente debe derivarse del Kardex. Renombrarlo o mantener el nombre es una decisión de UX, no técnica; lo importante es que deje de ser la fuente de verdad una vez exista Kardex valorizado.

---

## 5. Modelo actual de Compras

### `LineaCompra` (`compras/modelos/LineaCompra.ts:21-92`)

Existen: producto (`productoId`), `afectaInventario`, unidad+presentación (`unidadMedida`, `unidadesDisponibles`), cantidad comercial (`cantidadSolicitada`), costo unitario, descuento, impuesto (`tipoAfectacion`/`tasaIgv`/`igv`), base imponible, total, almacén (`almacenDestinoId/Nombre`), cantidad ingresada a inventario (`cantidadIngresadaInventario`).

Faltan: "cantidad mínima"/reorden (no existe ningún campo), Nota de Ingreso relacionada por línea, movimientos de Kardex relacionados por línea (`grep Kardex` en todo el módulo Compras → 0 resultados).

Parcial/engañoso: `cantidadIngresadaInventario` y `cantidadPendienteInventario` existen en el tipo pero **se inicializan en 0 y nunca se incrementan con un valor real** en ningún punto del módulo — son contadores muertos, no reflejan ninguna recepción real.

### Clasificación de línea (`ClasificacionLineaCompra`, `LineaCompra.ts:3-8`)

`'producto' | 'servicio' | 'gasto' | 'suministro' | 'activo_fijo'` — **solo `producto` y `servicio` son alcanzables en runtime** (única función que asigna clasificación, `crearLineaCompraDesdeProducto`, solo produce esas dos). `gasto`, `suministro`, `activo_fijo` son ramas muertas del tipo.

**`afectaInventario` NO se deriva de `clasificacion` en ningún punto.** En el CC se asigna de forma **uniforme a todas las líneas del documento** según `modalidadInventario` (`FormularioComprobanteCompra.tsx:376-379`) — una línea de servicio dentro de un CC en `con_nota_ingreso` recibe el mismo `afectaInventario: true` que una línea de producto. En la OC, `afectaInventario` queda **hardcodeado en `false` para toda línea**, siempre (`servicioOrdenCompra.ts:124`) — la OC nunca afecta inventario tal como está codificado hoy.

### Modalidad de ingreso a inventario (`ModalidadInventarioCC`, `ComprobanteCompra.ts:26-29`)

| Modalidad | ¿Alcanzable desde UI? | Efecto real verificado |
|---|---|---|
| `no_afecta_inventario` | ✅ Sí | Correcto y consistente: `afectaInventario=false` en todas las líneas, `estadoInventario='no_aplica'`. Sin efecto de stock. |
| `con_nota_ingreso` | ✅ Sí (default del formulario) | **No existe ningún botón "Generar NI" ni handler conectado.** `mapeadorCCaNI.ts` (`prepararDatosNIDesdeCC`) es código huérfano — confirmado por grep: cero consumidores en todo el repo salvo su propio archivo y el barrel `index.ts`. `estadoInventario` del CC queda congelado en `'pendiente'` para siempre. |
| `ingreso_automatico` | ❌ No — el selector real (`SelectorModalidadInventario.tsx:50-57`) solo ofrece 2 `<option>` | Confirmado con grep: la única lógica real que lee este valor es `derivarEstadoInventarioCC` (`ContextoCompras.tsx:232-237`), que **solo cambia el campo `estadoInventario` a `'automatico'`** — no crea NI, no genera movimiento de Kardex, no toca `stockPorAlmacen`. Es un cambio de texto/badge sin ningún efecto físico. |

`calcularEstadoInventarioCC`/`calcularEstadoInventarioOC`/`calcularEstadoRecepcion` (`utilidades/calcularEstadosCompra.ts`) son también código huérfano — exportados, nunca llamados; reemplazados en runtime por una versión simplificada e incompleta dentro de `ContextoCompras.tsx` que no reproduce la misma lógica de cálculo por línea.

### Trazabilidad documental CC ↔ NI ↔ Kardex

Los campos existen en el tipo (`notasIngresoRelacionadas?: string[]`, `movimientosInventarioRelacionados?: string[]` en `ComprobanteCompra.ts:119-120`; `TrazabilidadCompra` como tipo adicional) pero **nunca se escriben con un id nuevo** — solo se preservan al editar. `TrazabilidadCompra` tiene cero usos reales (ni lectura ni escritura) fuera de su declaración. Consecuencia: `calcularEstadoPrincipalCC` y `motivoBloqueoAnulacionCC` leen estos arrays para decidir estado/bloqueo de anulación, pero como nunca se pueblan, un CC en `con_nota_ingreso` **nunca podrá transicionar a `'Convertido'`** ni bloquear su anulación por este motivo.

### Riesgo de duplicación

Real y por diseño incompleto: no hay FK tipada CC→NI (solo texto libre `documentoOrigen`/`numeroDocumentoOrigen` en NI), no hay chequeo de unicidad, y `prepararDatosNIDesdeCC` no tiene ninguna verificación de idempotencia.

### Costo valorizable de la compra (`reglasCompras.ts`, `calcularLineaCompra`/`calcularTotalesLineas`)

Existen: costo unitario, descuento por línea, IGV (agrupado por tasa), retención (solo Recibos por Honorarios), percepción/detracción como datos **informativos separados** (no como componente de la suma), moneda y tipo de cambio a nivel de documento.

No existen: descuento global de documento, ISC, otros impuestos distintos de IGV, flete, seguro, gastos adicionales, bonificaciones, redondeo intermedio explícito (solo un `round2` final).

El modelo separa `baseImponible` vs `igv` vs `total` (descomposición fiscal), pero **no separa impuesto recuperable/no recuperable** ni tiene ningún campo de "costo valorizable" distinto del total documental. No hay configuración tributaria centralizada de empresa que Compras consulte para IGV — cada línea resuelve su tasa desde una etiqueta de texto en el propio producto (`resolverImpuestoProducto`, regex sobre "IGV (18.00%)"); si falta, bloquea el registro. El propio código documenta esta decisión: *"Compras nunca inventa una tasa ni usa un impuesto por defecto de Configuración."*

### CxP y Pagos — desacoplamiento

**Confirmado limpio.** `CuentaPorPagar` y `PagoCompra` no tienen ningún campo de costo/almacén/clasificación/inventario; grep cruzado de `almacen|costoUnitario|inventario|kardex|afectaInventario` en `servicioCuentaPorPagar.ts`, `servicioPagoCompra.ts` y `mapeadorCCaCuentaPorPagar.ts` → 0 resultados. No hay mezcla indebida entre pago y valorización.

---

## 6. Modelo actual de Inventario y Kardex

### `MovimientoStock` (`gestion-inventario/models/inventory.types.ts:35-67`)

Campos reales: `id, productoId/Codigo/Nombre, tipo, motivo, cantidad, cantidadAnterior, cantidadNueva, usuario, observaciones?, documentoReferencia?, fecha, ubicacion?, almacenId/Codigo/Nombre, EstablecimientoId/Codigo/Nombre, esTransferencia?, transferenciaId?, tipoTransferencia?, almacenOrigen/DestinoId/Nombre?, movimientoRelacionadoId?`.

Ver matriz completa de campos en §21. Resumen: **existen** id, establecimiento, almacén, producto, tipo, fecha, cantidad, usuario, motivo, movimiento relacionado (parcial); **faltan por completo** costo unitario, valor de entrada, valor de salida, saldo valorizado, moneda, tipo de cambio, lote/capa, unidad, estado, reverso; **parciales** documento de origen (texto libre, sin id estructurado), saldo (se infiere leyendo stock en memoria, no es un ledger acumulado), entrada/salida (se infiere de `tipo`, sin booleano explícito).

### Kardex valorizado — respuestas directas

1. **¿Guarda costos o solo cantidades?** Solo cantidades. Ningún campo de costo en `MovimientoStock` ni en `StockAdjustmentData` (el input de todo ajuste).
2. **¿Cada entrada crea una capa valorizada?** No. No existe ninguna estructura de capas/lotes en ningún modelo del repo.
3. **¿Existe un modelo explícito de capas FIFO?** No.
4. **¿FIFO está implementado realmente?** No como consumo de capas de costo. `resolvealmacenesForSaleFIFO` + `allocateSaleAcrossalmacenes` (`shared/inventory/stockGateway.ts:245-318`) solo ordenan y reparten cantidad entre **almacenes** por prioridad de despacho — el propio comentario del código lo confirma. El nombre "FIFO" es engañoso respecto al comportamiento real.
5. **¿Cómo identifica una salida qué entradas consume?** No lo identifica — no hay estructura de lotes; solo resuelve de qué almacén(es) descontar cantidad de un contador agregado (`stockPorAlmacen[almacenId]`).
6. **¿Una salida conserva detalle de capas consumidas?** No existe ese campo en ningún tipo.
7. **¿Se registra costo total de la salida?** No.
8. **¿Se registra costo de venta?** No — ni en `MovimientoStock` ni en `CartItem`/`Comprobante`.
9. **¿Los valores son persistidos o calculados en lectura?** Ninguno de los dos — no existen valores de costo. La única "valorización" encontrada, `useInventarioDisponibilidad.ts:381` (`disponible * precio`), usa **precio de venta**, no costo — no es Kardex valorizado.
10. **¿Redondeos?** `toFixed(2)`/`round2` se aplican solo a totales monetarios de documentos (NI, NS, Compras), nunca a costo de inventario (no existe ese concepto para redondear).
11. **¿Precisión por moneda?** Existe el campo `decimalPlaces` en `CurrencyDescriptor`, pero ambas monedas activas (PEN/USD) están fijas en 2 decimales, y ~70 archivos usan `toFixed(2)` hardcodeado en vez de la utilidad central.
12. **¿Cantidades decimales?** Sin hallazgos de restricción especial; no aplica a valorización porque no existe.
13. **¿Producto con stock en varios almacenes?** Sí soportado (`stockPorAlmacen: Record<almacenId, number>`), pero el costo es **global al producto** (`precioCompra`), no por almacén — no existe `costoPorAlmacen`.
14. **¿Las capas FIFO son por empresa/establecimiento/almacén/producto?** No aplica — no existen capas.
15. **¿Las transferencias conservan el costo de las capas trasladadas?** No aplica (no hay capas) y tampoco hay ningún campo de costo en absoluto en `TransferModal.tsx` ni en los métodos de transferencia de `InventoryService` — grep de `costo` en `TransferModal.tsx` sin resultados.
16. **¿Un ajuste negativo consume FIFO?** No — solo resta cantidad (`stockActual - cantidad`, clamp a 0 salvo `allowNegativeStock`, opción no usada por ningún llamador real).
17. **¿Una Nota de Salida consume FIFO?** Consume la misma asignación por-almacén (`allocateSaleAcrossalmacenes`), sin costo.
18. **¿Una venta consume FIFO?** Igual — asignación por almacén, sin costo.
19. **¿Una anulación reconstruye o revierte las capas consumidas?** No aplica (no hay capas); genera movimiento inverso de cantidad únicamente.
20. **¿Riesgo de stock correcto con valor incorrecto?** El riesgo real hoy es más severo: no hay valor en absoluto que pueda estar "incorrecto" — está ausente. El riesgo latente, una vez se implemente valorización, es que el stock (cantidad) siga siendo la única fuente confiable mientras el costo se calcule de forma separada y quede desincronizado si no se ata al mismo movimiento atómico.

### Función central de mutación de stock

`InventoryService.registerAdjustment` (`services/inventory.service.ts:135-193`), envuelta por `registrarAjusteDeStock` (`shared/inventory/accionesStock.ts:25-38`). Su input, `StockAdjustmentData` (`inventory.types.ts:155-163`), **no tiene ningún parámetro de costo**. Es usada por NV y NS. **Factura/Boleta/POS usa un motor distinto** (`inventory.facade.ts`, vía `addMovimientoStock`), que reimplementa la misma aritmética de forma independiente — ver §13.

---

## 7. Entradas actuales de stock

| Vía | Función | ¿Registra costo? | ¿Crea capa? |
|---|---|---|---|
| Ajuste manual positivo | `InventoryService.registerAdjustment` vía `AdjustmentModal.tsx` | No — `StockAdjustmentData` no tiene campo de costo | No |
| Importación masiva — modo reemplazo | `PanelImportacionStock.tsx:470-494` (ajusta por diferencia) | No — sin columna de costo en la plantilla | No |
| Importación masiva — modo sumatorio | `PanelImportacionStock.tsx:423-451` | No | No |
| Nota de Ingreso | `notaIngreso.service.ts:75-111` (`generarNIEnInventario`) | **Captura `costoUnitario` por línea en el documento, pero lo descarta al generar el movimiento** — no se propaga a `StockAdjustmentData` | No |
| Devolución de cliente (NC con retorno físico) | `useComprobanteActions.tsx:726-786` | No | No |

---

## 8. Salidas actuales de stock

Existen **tres orquestaciones independientes**, no una función central única:

1. **Nota de Venta (NV) automática**: `descontarStockParaDocumento()` (`documentos-comerciales/utils/servicioReservaStock.ts:201-282`) → `allocateSaleAcrossalmacenes` → `InventoryService.registerAdjustment`.
2. **Factura/Boleta (incluye POS)**: lógica inline en `useComprobanteActions.tsx:531-668` → `addMovimientoStock` (`gestion-inventario/api/inventory.facade.ts:24-138`) — **motor distinto**, reimplementa el cálculo de `cantidadNueva`/`delta` en vez de reusar `registerAdjustment`.
3. **Nota de Salida (NS)**: `notaSalida.service.ts:150-419` → `InventoryService.registerAdjustment` (igual motor que NV).

La resolución FIFO-por-almacén (`resolvealmacenesForSaleFIFO`/`allocateSaleAcrossalmacenes`) está además **reimplementada de forma independiente en los 3 sitios**, no llamada desde un único punto compartido.

Ninguna de las 3 vías registra costo de salida, costo total de venta, ni conserva capas consumidas.

---

## 9. Estado real de FIFO

**FIFO, tal como está implementado, es una política de selección de almacén — no un algoritmo de consumo de costo por antigüedad de lote.** No existe ningún dato de "cuándo entró" ni "a qué costo entró" un lote de stock; `stockPorAlmacen` es un contador agregado por almacén, no una cola. Confirmado en 3 auditorías independientes (Inventario core, Notas, Ventas/POS) con evidencia cruzada: las funciones con nombre FIFO (`resolvealmacenesForSaleFIFO`, `allocateSaleAcrossalmacenes`) solo devuelven `{almacenId, qtyUnidadMinima}`, nunca un costo.

---

## 10. Estado real de la valorización

**No existe valorización real.** `StockSummary.valorTotalStock: number` está declarado en el tipo (`inventory.types.ts:114`) pero **nunca se calcula** en ningún archivo del repo (grep global confirma una única ocurrencia: la propia declaración). `Configuration.inventory.costMethod` y `autoUpdateCosts` son configuración fantasma — declarados con valor por defecto, sin ningún consumidor real.

---

## 11. Estado real del costo de venta

**No calculable hoy.** `CartItem`/`Comprobante`/`LineaNotaSalida` no tienen ningún campo de costo de venta; el único candidato (`CartItem.precioCompra`) es un snapshot manual del catálogo, no ligado a las unidades físicas realmente descontadas ni actualizado por compras reales.

---

## 12. Estado real de utilidad y margen

**No existe ningún cálculo de utilidad/margen en ningún módulo auditado.** Grep exhaustivo de `margen|utilidad|ganancia` en todo el repo: los únicos resultados relevantes de "margen" son de **descuadre de caja** (`control-caja/`), sin relación a rentabilidad. `porcentajeGanancia` (Productos) es un campo declarativo sin lógica de cálculo. Módulo Precios: cero campos de costo/margen. Reportes/KPIs (`indicadores-negocio/`): cero campos de costo/margen/utilidad en cualquier DTO.

---

## 13. Integración actual Compras–Inventario

**Desacoplamiento total en runtime**, con solo artefactos de modelo preparados y no accionados:

- `ComprobanteCompra.notasIngresoRelacionadas`, `movimientosInventarioRelacionados`, `modalidadInventario` → declarados, nunca poblados/ejecutados de forma real (ver §5).
- `mapeadorCCaNI.ts` / `calcularEstadosCompra.ts` → código huérfano, cero llamadores.
- Ningún archivo de `compras/` invoca `InventoryService`, `notaIngreso.repository`, `generarNIEnInventario` ni `StockRepository` (grep exhaustivo sin resultados).
- El único lugar donde "algo pasa" con la modalidad de inventario es un cambio de campo de estado de texto (`estadoInventario`) dentro del propio `ContextoCompras.tsx` — sin ningún efecto en `gestion-inventario/`.

---

## 14. Fuentes de verdad y duplicidades

| Fuente candidata de costo | Significado real | Origen | Consumidores | ¿Fuente de verdad? | ¿Snapshot? | ¿Derivada? | ¿Duplicada? | Riesgo |
|---|---|---|---|---|---|---|---|---|
| `Product.precioCompra` | Costo referencial manual | Input de usuario en catálogo | Prellena costo en línea de OC/CC/NI | No | No (mutable, no versionado) | No | — | Alto: única fuente hoy, pero sin actualización automática ni moneda asociada |
| `LineaCompra.costoUnitario` | Costo pactado con proveedor en el documento | Usuario, editable, puede prellenarse de `precioCompra` | Cálculo de totales de la línea/documento | Sí, para el documento de compra | Sí (una vez registrado el CC) | No | — | Bajo dentro de Compras; no se propaga fuera |
| `LineaNotaIngreso.costoUnitario` | Costo de la línea de ingreso física | Usuario (o heredado de CC si existiera el puente — no existe hoy) | Documento NI (impresión/totales) | Debería serlo para el movimiento de Kardex, pero **no llega** | Sí (en el documento) | No | Duplica conceptualmente a `LineaCompra.costoUnitario` sin vínculo real | Alto: se descarta al generar el movimiento — el dato existe pero se pierde |
| `MovimientoStock` (costo) | — | — | — | No existe el campo | — | — | — | Crítico: no hay dónde persistir el costo de un movimiento hoy |
| Presentación comercial (`factorConversion`) | Equivalencia de unidad, no costo | Catálogo | Ventas/POS (sí), Compras/NI (no aplicado) | Debería serlo para conversión de cantidad | No (siempre se consulta "actual") | — | Reimplementado en `usePriceBook.ts` | Alto: inconsistencia de aplicación entre módulos |
| `lista-precios` | Precio de venta únicamente | Catálogo de precios | Ventas/POS | Sí, para precio de venta | No | No | — | Ninguno relacionado a costo — está correctamente desacoplado, pero también significa que no hay ningún lugar hoy donde vivan costo/margen |

**Recomendación de fuente canónica futura** (no implementada, solo recomendación):
1. Costo documental de compra → `LineaCompra`/`ComprobanteCompra` (ya es razonable hoy).
2. Costo por unidad mínima → debe derivarse en el momento de generar el movimiento de entrada (costo documental ÷ factor de conversión), no re-consultado después.
3. Costo de una entrada → el propio movimiento de Kardex (campo nuevo, hoy inexistente).
4. Valor del stock → suma de capas vigentes por producto+almacén (estructura nueva, hoy inexistente).
5. Costo de una salida → suma de capas consumidas en esa salida (estructura nueva).
6. Costo de venta → el campo anterior, copiado/persistido en la línea de venta al momento de la transacción (no recalculado después).
7. Último costo informativo → derivable como lectura de la capa más reciente, sin necesidad de mantenerlo como campo separado del producto.
8. Margen real → venta neta menos costo de venta persistido, por línea/documento — nunca recalculado con costos actuales.

---

## 15. Hallazgos P0 (críticos)

| ID | Hallazgo | Evidencia | Impacto | Módulos afectados |
|---|---|---|---|---|
| P0-01 | No existe ningún campo de costo en `MovimientoStock` ni en `StockAdjustmentData` | `inventory.types.ts:35-67,155-163` | Imposible construir Kardex valorizado sin cambiar el modelo base | Inventario/Kardex |
| P0-02 | "FIFO" real solo ordena almacenes, no consume capas de costo | `stockGateway.ts:245-318` | Cualquier cálculo de costo de venta actual sería inventado, no derivado del sistema | Inventario, Ventas, POS, NS |
| P0-03 | Puente Compras→Nota de Ingreso es código huérfano (`mapeadorCCaNI.ts`, `calcularEstadosCompra.ts`) sin consumidores reales | grep exhaustivo confirma 0 llamadores | El flujo "Comprobante de Compra → Nota de Ingreso" documentado funcionalmente **no existe en ejecución** | Compras, Inventario |
| P0-04 | Modalidad `ingreso_automatico` no mueve stock — solo cambia un campo de texto (`estadoInventario`) | `ContextoCompras.tsx:232-237` | El usuario puede creer que el stock se actualizó automáticamente y no es así | Compras, Inventario |
| P0-05 | Factor de conversión de presentaciones no se aplica en el flujo Compras→Nota de Ingreso | `mapeadorCCaNI.ts:39-51`, `notaIngreso.service.ts:89-97` | Comprar en presentación distinta a unidad mínima genera cantidades de stock incorrectas | Productos, Compras, Inventario |
| P0-06 | `LineaNotaIngreso.costoUnitario` se descarta al generar el movimiento de Kardex | `notaIngreso.service.ts:89-97` (no incluye `costoUnitario` en `StockAdjustmentData`) | El único costo real capturado en todo el flujo se pierde antes de llegar a Inventario | Notas de Ingreso, Inventario |
| P0-07 | Tres motores de descuento de stock distintos y no unificados (NV, Factura/Boleta/POS, NS) | `servicioReservaStock.ts`, `useComprobanteActions.tsx` + `inventory.facade.ts`, `notaSalida.service.ts` | Cualquier lógica de consumo de capas deberá implementarse y mantenerse en 3 lugares si no se unifica antes | Ventas, POS, Notas de Salida, Inventario |
| P0-08 | No existe idempotencia real en el registro de NI respecto a un documento origen (texto libre, sin FK, sin chequeo de unicidad) | `notaIngreso.types.ts:76-77`, `generarNIEnInventario` | Riesgo de duplicar el ingreso de stock desde el mismo Comprobante de Compra | Compras, Notas de Ingreso |
| P0-09 | Riesgo de doble descuento de stock en NV/OV por ausencia de guard de operación en curso | `FormularioDocumentoComercial.tsx:200-298` (`handleGenerar` sin `isProcessing`) | Doble clic puede descontar stock dos veces para la misma venta | Documentos Comerciales, Inventario |
| P0-10 | Módulo Precios y módulo Productos no tienen ningún campo/cálculo de utilidad o margen — infraestructura ausente, no solo desconectada | grep exhaustivo sin resultados en `lista-precios/`, `catalogo-articulos/` | No hay ningún punto de partida reutilizable para mostrar margen — debe diseñarse desde cero | Precios, Productos, Reportes |

---

## 16. Hallazgos P1 (importantes)

| ID | Hallazgo | Evidencia | Impacto | Módulos afectados |
|---|---|---|---|---|
| P1-01 | `afectaInventario` no se deriva de `clasificacion` de línea — se asigna uniformemente por documento | `FormularioComprobanteCompra.tsx:376-379` | Una línea de servicio en un CC con `con_nota_ingreso` queda marcada como afecta-inventario igual que una de producto | Compras |
| P1-02 | `OrdenCompra`: `afectaInventario` hardcodeado en `false` para toda línea | `servicioOrdenCompra.ts:124` | La OC nunca puede afectar inventario tal como está codificada, aunque el modelo lo permita | Compras |
| P1-03 | Clasificaciones `gasto`/`suministro`/`activo_fijo` son ramas muertas del enum, inalcanzables desde la UI | `crearLineaCompraDesdeProducto` solo produce `producto`/`servicio` | La matriz funcional de clasificación (§17) es aspiracional, no operativa | Compras |
| P1-04 | `porcentajeGanancia` tiene tooltip que promete cálculo de precio sugerido, pero no existe tal lógica | `ProductFinancialSection.tsx:87`, sin consumidor de cálculo | Expectativa de usuario no cumplida por el producto actual | Productos |
| P1-05 | Cálculo de IGV duplicado con fallback `0.18` hardcodeado en al menos 6 archivos, sin consultar el catálogo `Tax`/`PERU_TAX_TYPES` | `notaIngreso.service.ts`, `notaSalida.service.ts`, `comprobantePricing.ts`, `taxBreakdown.ts`, `documentoComercial.helpers.ts`, `usePayment.tsx` | Cambiar la tasa de IGV requeriría tocar 6 lugares, con riesgo de inconsistencia | Compras, Ventas, Inventario, Configuración |
| P1-06 | Trazabilidad CC↔NI↔Kardex (`notasIngresoRelacionadas`, `movimientosInventarioRelacionados`, `TrazabilidadCompra`) declarada pero nunca poblada | grep sin escrituras nuevas, solo preservación al editar | Estados de "Convertido"/bloqueo de anulación por derivados nunca se activan | Compras |
| P1-07 | Transferencias entre almacenes no manejan costo en absoluto (ni para preservar ni para perder — el concepto no existe) | `TransferModal.tsx`, `inventory.service.ts` métodos de transferencia | Al implementar valorización, las transferencias necesitan diseño de costo completo desde cero | Inventario, Almacenes |
| P1-08 | `Configuration.inventory.costMethod`/`autoUpdateCosts` son configuración fantasma sin consumidor | `Configuration.ts:52-53`, `useConfiguracionSistema.ts:76-77` | Da falsa impresión de que el sistema ya soporta métodos de costeo configurables | Configuración, Inventario |
| P1-09 | Ajustes manuales individuales no tienen función de anulación/reverso dedicada | `useInventory.ts` sin `anularAjuste` | Corregir un ajuste manual erróneo requiere un ajuste inverso manual, sin trazabilidad de "reversa de X" | Inventario |
| P1-10 | Reportes de inventario (`reportDefinitions.ts`) son 100% de cantidades — cero columnas de costo/valor | `indicadores-negocio/models/reportDefinitions.ts:72-87` | No hay ningún reporte reutilizable como base de "inventario valorizado" | Reportes |

---

## 17. Hallazgos P2 (mejora posterior)

| ID | Hallazgo | Evidencia | Impacto | Módulos afectados |
|---|---|---|---|---|
| P2-01 | Duplicación de resolución de factor de conversión (`usePriceBook.ts` vs `unitConversion.ts`) | `usePriceBook.ts:73-98` | Mantenimiento duplicado, riesgo de divergencia futura | Productos, Ventas |
| P2-02 | ~70 archivos usan `toFixed(2)` hardcodeado en vez de `currencyManager.formatMoney`/`normalizarImporte` | múltiples archivos citados por los auditores | Si se activa una moneda con distinta precisión decimal, quedaría mal formateada en 70 puntos | Monedas, todos los módulos |
| P2-03 | EUR existe en tipos (`MonedaCompra`, `COMMON_CURRENCIES`) pero no hay UI para activarlo | `SeccionMonedas.tsx` sin botón de alta | Confusión sobre soporte multi-moneda real | Configuración, Monedas |
| P2-04 | `NotaIngreso` no tiene campo `tipoCambio` en cabecera (aunque sí `moneda`) | `notaIngreso.types.ts:73` | Si se compra en moneda extranjera, la NI no captura el tipo de cambio para valorizar en moneda base | Notas de Ingreso, Monedas |
| P2-05 | `DisponibilidadItem.precio` (precio de venta) no se usa para ningún cálculo de valor de inventario | `disponibilidad.types.ts:12-52` | Oportunidad perdida de indicador aproximado, aunque sería a precio de venta, no costo | Inventario, Reportes |

---

## 18. Decisiones funcionales pendientes

| # | Decisión | Alternativas | Recomendación | Impacto técnico | Impacto funcional | Prioridad |
|---|---|---|---|---|---|---|
| 1 | ¿Ingreso automático genera una NI visible o un movimiento directo silencioso? | (a) Genera NI visible auto-confirmada; (b) movimiento directo sin documento NI | (a) — preserva trazabilidad documental uniforme | Medio: requiere invocar el mismo servicio de NI desde Compras | Alto: afecta expectativa de auditoría del usuario | P0 |
| 2 | ¿Se permiten recepciones parciales (1 CC → N NI)? | Sí / No, solo 1:1 | Sí, con control de cantidad pendiente por línea (el campo ya existe en `LineaCompra`, solo falta conectarlo) | Alto: requiere idempotencia real y acumulación de cantidad ingresada | Alto: casos reales de entrega parcial del proveedor | P0 |
| 3 | ¿Una compra puede distribuirse en varios almacenes? | Sí (ya soportado a nivel de línea en NI) / No | Mantener soportado — ya existe el campo `almacenId` por línea en NI | Bajo — ya modelado | Medio | P1 |
| 4 | ¿IGV recuperable forma parte del costo valorizable? | Incluirlo / Excluirlo (crédito fiscal) | Excluirlo del costo valorizable (el IGV recuperable no es costo, es crédito fiscal) — pero requiere que el modelo lo distinga, hoy no lo hace | Alto: requiere nuevo campo de desglose en `LineaCompra` | Alto: afecta directamente el costo que se propaga al Kardex | P0 |
| 5 | ¿Cómo tratar impuestos no recuperables (ej. ISC en ciertos casos)? | Sumarlos al costo valorizable | Sí, sumarlos — pero el modelo actual no tiene ISC en absoluto | Medio | Medio | P1 |
| 6 | ¿Cómo tratar flete y gastos asociados a la compra? | Prorratear al costo por línea / dejarlo fuera del MVP | Fuera del MVP inicial (no existe el campo hoy); prorrateo es una Etapa 5 | Alto si se incluye ahora | Bajo si se pospone | P2 |
| 7 | ¿Cómo tratar bonificaciones (mercadería gratis del proveedor)? | Costo cero para la bonificación / prorratear costo total entre unidades pagadas+bonificadas | Prorratear (más preciso contablemente), pero requiere diseño nuevo | Alto | Medio | P2 |
| 8 | ¿Qué costo exigir en ajustes positivos? | Costo obligatorio siempre / opcional con warning | Obligatorio si el producto ya tiene capas de costo activas; si es el primer ingreso, permitir costo inicial = `precioCompra` | Medio | Alto — hoy no se exige nada | P0 |
| 9 | ¿Qué costo exigir en importaciones masivas? | Igual que ajustes: obligatorio si hay valorización activa | Sí, agregar columna de costo obligatoria en el nuevo modo de importación valorizada | Alto: cambio de plantilla, parseo, validación | Alto | P1 |
| 10 | ¿Qué hacer con stock histórico sin costo (productos ya existentes)? | Seed inicial desde `precioCompra` / costo cero explícito marcado como "sin costear" | Seed desde `precioCompra` con marca de "costo inicial estimado", auditable | Medio | Alto — evita bloquear la migración | P0 |
| 11 | ¿Cómo tratar productos ya existentes con "precio de compra"? | Migrar a costo inicial de la primera capa / mantener como campo separado de referencia | Migrar a costo inicial de capa, dejar de escribirlo manualmente después | Medio | Alto | P0 |
| 12 | ¿Qué margen mostrar (estimado, real, ambos)? | Solo real / solo estimado / ambos | Ambos, claramente diferenciados: estimado (con costo referencial/último costo) mientras no haya venta; real (con costo FIFO consumido) tras la venta | Alto | Alto | P1 |
| 13 | ¿Dónde mostrarlo? | Módulo Precios / Detalle de Producto / Reporte de rentabilidad | Estimado en Detalle de Producto (no en Precios, que debe seguir siendo solo venta); real en Reporte de rentabilidad/Comprobante | — | Alto — evita mezclar conceptualmente Precios con costo | P1 |
| 14 | ¿Qué hacer al anular una compra cuyo stock ya fue vendido? | Bloquear anulación / permitir con ajuste de costo negativo | Bloquear (mismo patrón ya usado hoy en `anularNIEnInventario`, que bloquea si el stock actual es menor a lo ingresado) | Bajo — patrón ya existe, extenderlo | Alto | P0 |
| 15 | ¿Se soporta inicialmentre solo 1 CC → 1 NI o múltiples NI? | 1:1 primero, N:1 en etapa posterior | 1:1 para el MVP (más simple, cubre el caso principal), diseñar el modelo para no bloquear N:1 después | Medio | Medio | P1 |

---

## 19. Arquitectura objetivo propuesta

No se propone una reconstrucción total — se reutiliza la infraestructura existente (repositorios `localStorage`, `InventoryService`, tipos de Compras ya bien modelados en su mayoría) y se añaden los componentes de costeo ausentes.

1. **Dueño del costo documental**: Compras (`LineaCompra`/`ComprobanteCompra`) — ya es la fuente correcta hoy, solo falta que se propague.
2. **Dueño del stock (cantidad)**: `gestion-inventario/` (`InventoryService`, `Product.stockPorAlmacen`) — sin cambios de responsabilidad.
3. **Dueño del movimiento valorizado**: nuevo — una extensión de `MovimientoStock` (o una entidad hermana `MovimientoValorizado`) dentro de `gestion-inventario/`, no en Compras.
4. **Documento que genera la entrada**: Nota de Ingreso, con origen tipado hacia `ComprobanteCompra` (nueva FK real, no texto libre).
5. **Ingreso automático**: debe generar una NI real (auto-confirmada) invocando el mismo servicio `generarNIEnInventario` que hoy usa el flujo manual — no un camino paralelo.
6. **Ingreso mediante NI manual**: conectar el botón real "Generar NI" desde CC, usando `prepararDatosNIDesdeCC` como punto de partida (hoy huérfano, ya tiene la forma correcta de mapeo).
7. **Evitar doble ingreso**: FK tipada `comprobanteCompraOrigenId` + chequeo de unicidad antes de generar, más control de cantidad pendiente por línea (`cantidadPendienteInventario` ya existe, solo falta conectarlo).
8. **Conversión de presentación a unidad mínima**: aplicar `getFactorToUnidadMinima`/`describeUnitConversion` (ya existente en `shared/inventory/unitConversion.ts`) también en el flujo Compras→NI, no solo en Ventas.
9. **Creación de capa FIFO**: al confirmar la NI, crear una entrada en una nueva estructura de capas (producto+almacén+cantidad remanente+costo unitario+fecha), separada de `MovimientoStock` o como extensión de este.
10. **Consumo**: modificar `allocateSaleAcrossalmacenes` (o envolverlo) para que, tras resolver el almacén, consuma capas en orden de antigüedad dentro de ese almacén y devuelva el costo consumido.
11. **Reversión**: anulaciones deben re-crear la capa consumida (o restaurar su cantidad remanente) con el costo original — nunca con costo recalculado al momento de la anulación.
12. **Costo de venta**: suma de costos de capas consumidas por la salida, persistido en la línea de venta en el momento de la transacción.
13. **Margen**: venta neta (ya disponible) menos costo de venta persistido (nuevo).
14. **Dónde se muestran los indicadores**: margen estimado en Detalle de Producto; margen real en Reporte de rentabilidad (nuevo, no en Precios).
15. **Datos persistidos**: costo unitario por capa, capas consumidas por salida, costo de venta por línea.
16. **Datos derivados**: último costo (lectura de la capa más reciente), valor total de inventario (suma de capas vigentes) — no se debe persistir un campo "cacheado" propenso a desincronizarse sin un mecanismo de recálculo controlado.
17. **Trazabilidad histórica**: todo movimiento y toda línea de venta conservan el costo con el que se ejecutaron — nunca se recalculan retroactivamente con costos actuales.

### Diagrama textual

```
Producto/presentación (factorConversion)
  → Comprobante de Compra (costo documental, moneda, tipo de cambio)
    → Nota de Ingreso (automática o manual) [FK real comprobanteCompraOrigenId]
      → conversión a unidad mínima (factorConversion aplicado)
        → Movimiento de entrada (cantidad + costo unitario)
          → Capa FIFO (producto + almacén + cantidad remanente + costo + fecha)
            → Comprobante de Venta / Nota de Salida
              → Consumo FIFO (capas por almacén, en orden de antigüedad)
                → Costo de venta (persistido en la línea)
                  → Utilidad bruta = Venta neta − Costo de venta
                    → Margen = Utilidad bruta / Venta neta
```

---

## 20. Plan de implementación por etapas

### Etapa 0 — Saneamiento del modelo
- **Objetivo**: unificar fuentes de verdad y corregir inconsistencias previas a cualquier valorización.
- **Dominios afectados**: `Product` (rol de `precioCompra`), `LineaCompra`/`ComprobanteCompra` (desglose recuperable/no recuperable), `NotaIngreso` (FK tipada a CC), conversión de unidad en Compras→NI.
- **Dependencias**: ninguna previa.
- **Riesgos**: decisiones funcionales pendientes (§18) deben cerrarse antes; sin esto, cualquier campo nuevo queda mal fundamentado.
- **Criterios de aceptación**: `mapeadorCCaNI.ts` deja de ser huérfano (tiene al menos un consumidor real); factor de conversión se aplica en el flujo Compras→NI.
- **Complejidad**: media. **Prioridad**: P0.

### Etapa 1 — Entrada valorizada desde Compras
- **Objetivo**: CC → NI (automática o manual) genera un movimiento con costo por unidad mínima y crea una capa.
- **Dominios**: `gestion-inventario/services/{inventory,notaIngreso}.service.ts`, `MovimientoStock` (nuevo campo de costo), nueva estructura de capas.
- **Dependencias**: Etapa 0.
- **Riesgos**: unificar los 3 motores de salida (§8) puede requerirse antes de continuar a Etapa 3, o al menos planificarse en paralelo.
- **Criterios de aceptación**: una compra registrada y su NI dejan una capa consultable con costo por unidad mínima correcto (ver caso de ejemplo §6 del prompt: 2 cajas de 12 a S/120 → 24 unidades a S/10).
- **Complejidad**: alta. **Prioridad**: P0.

### Etapa 2 — Ajustes e importaciones valorizadas
- **Objetivo**: exigir costo en ajustes positivos e importaciones cuando la valorización esté activa; crear capas desde ambos flujos.
- **Dominios**: `AdjustmentModal.tsx`, `PanelImportacionStock.tsx` (nueva columna de costo, nueva validación, nueva previsualización).
- **Dependencias**: Etapa 1 (estructura de capas ya debe existir).
- **Riesgos**: migración de plantillas de importación existentes; usuarios con hábito de importar sin costo.
- **Criterios de aceptación**: no se puede crear stock con costo cero salvo decisión explícita documentada (§18, decisión 10).
- **Complejidad**: media. **Prioridad**: P1.

### Etapa 3 — Salidas FIFO valorizadas
- **Objetivo**: venta, POS y Nota de Salida consumen capas reales y devuelven costo consumido.
- **Dominios**: `stockGateway.ts` (`allocateSaleAcrossalmacenes` extendido o nueva función), los 3 motores de salida (§8), reversos/anulaciones.
- **Dependencias**: Etapas 1-2.
- **Riesgos**: es el cambio de mayor impacto — toca 3 flujos de venta distintos; alto riesgo de regresión si no se unifica primero el motor de salida (hallazgo P0-07).
- **Criterios de aceptación**: una venta anulada restaura la capa exacta consumida, con su costo original.
- **Complejidad**: alta. **Prioridad**: P0.

### Etapa 4 — Costo de venta y margen
- **Objetivo**: persistir costo histórico por línea de venta; calcular utilidad y margen; exponer en reportes.
- **Dominios**: modelos de venta (`CartItem`/línea de comprobante), `indicadores-negocio/` (nuevos reportes/KPIs).
- **Dependencias**: Etapa 3.
- **Riesgos**: recalcular ventas históricas con costos actuales (prohibido — debe usarse el costo persistido en el momento de la venta).
- **Criterios de aceptación**: reporte de rentabilidad muestra margen real por producto/periodo usando costo persistido, no recalculado.
- **Complejidad**: media. **Prioridad**: P1.

### Etapa 5 — Casos avanzados
- **Objetivo**: recepciones parciales, gastos asociados (flete/seguro), devoluciones, notas de crédito de compra, múltiples almacenes en una misma compra, moneda extranjera con tipo de cambio histórico en el Kardex.
- **Dominios**: transversal.
- **Dependencias**: Etapas 1-4.
- **Riesgos**: alcance amplio; debe fragmentarse en sub-entregas.
- **Criterios de aceptación**: definidos por decisión funcional caso por caso (§18).
- **Complejidad**: alta. **Prioridad**: P2.

---

## 21. Matriz de campos existentes y faltantes

| Concepto | Campo real | Módulo | Archivo | Existe | Se usa | Fuente de verdad | Observación |
|---|---|---|---|---|---|---|---|
| Unidad mínima | `Product.unidad` | Productos | `catalogo-articulos/models/types.ts:16` | ✅ | ✅ | Sí | Llamada "unidad base" en otros módulos, mismo campo |
| Presentación comercial | `AdditionalUnitMeasure` | Productos | `catalogo-articulos/models/types.ts:3-10` | ✅ | Parcial | Sí, para conversión de venta | Sin precio/costo/estado propio |
| Precio de compra | `Product.precioCompra` | Productos | `catalogo-articulos/models/types.ts:30` | ✅ | Parcial (solo prellenado) | No para Kardex | Referencial, manual, sin moneda |
| Porcentaje de ganancia | `Product.porcentajeGanancia` | Productos | `catalogo-articulos/models/types.ts:31` | ✅ | ❌ (sin cálculo) | No | Campo decorativo |
| Costo de línea de compra | `LineaCompra.costoUnitario` | Compras | `compras/modelos/LineaCompra.ts` | ✅ | ✅ (dentro de Compras) | Sí, para el documento | No se propaga a Inventario |
| Modalidad de inventario | `ComprobanteCompra.modalidadInventario` | Compras | `ComprobanteCompra.ts:26-29` | ✅ | Parcial (2 de 3 alcanzables) | — | `ingreso_automatico` sin efecto real |
| Cantidad ingresada a inventario | `LineaCompra.cantidadIngresadaInventario` | Compras | `LineaCompra.ts:60` | ✅ | ❌ (siempre 0) | No | Contador muerto |
| NI relacionada | `ComprobanteCompra.notasIngresoRelacionadas` | Compras | `ComprobanteCompra.ts:119` | ✅ | ❌ (nunca se escribe con id nuevo) | No | Campo muerto en la práctica |
| Costo de línea de NI | `LineaNotaIngreso.costoUnitario` | Inventario (NI) | `notaIngreso.types.ts:41` | ✅ | Parcial (solo en documento) | No para Kardex | Se descarta al generar movimiento |
| Costo en movimiento de Kardex | — | Inventario | `inventory.types.ts:35-67` | ❌ | — | — | Campo inexistente |
| Capa/lote de costo | — | Inventario | — | ❌ | — | — | Estructura inexistente |
| Saldo valorizado | `StockSummary.valorTotalStock` | Inventario | `inventory.types.ts:114` | ✅ (tipo) / ❌ (implementación) | ❌ | — | Declarado, nunca calculado |
| Costo de venta | — | Ventas | — | ❌ | — | — | Campo inexistente |
| Margen/utilidad | — | Precios/Productos/Reportes | — | ❌ | — | — | Sin infraestructura en ningún módulo |
| Tipo de cambio en Kardex | — | Inventario | `inventory.types.ts` | ❌ | — | — | Campo inexistente |
| Método de costeo configurado | `Configuration.inventory.costMethod` | Configuración | `Configuration.ts:53` | ✅ (tipo, con default) | ❌ (sin motor) | — | Configuración fantasma |

---

## 22. Matriz de documentos y movimientos

| Operación | Cambia stock | Cambia valorización | Crea capa | Consume FIFO (costo) | Permite reverso | Estado actual |
|---|---|---|---|---|---|---|
| Ajuste manual positivo | ✅ | ❌ | ❌ | — | ❌ (sin función de anulación dedicada) | Cuantitativo puro |
| Ajuste manual negativo | ✅ | ❌ | — | ❌ (solo resta cantidad) | ❌ | Cuantitativo puro |
| Importación — reemplazo | ✅ | ❌ | ❌ | — | Parcial (ajuste inverso manual posible) | Cuantitativo puro |
| Importación — sumatoria | ✅ | ❌ | ❌ | — | Parcial | Cuantitativo puro |
| Nota de Ingreso (generar) | ✅ | ❌ (costo capturado pero descartado) | ❌ | — | ✅ (anulación con validación de stock consumido) | Cuantitativo; costo se pierde |
| Nota de Ingreso (anular) | ✅ (reverso) | — | — | — | ✅ (bloquea si stock < cantidad) | Reverso de cantidad únicamente |
| Nota de Salida (generar) | ✅ | ❌ | — | ❌ (solo asigna almacén) | ✅ | Cuantitativo puro |
| Nota de Salida (anular) | ✅ (reverso) | — | — | — | ✅ (rollback transaccional) | Cuantitativo puro |
| Venta (NV) | ✅ | ❌ | — | ❌ | ✅ (reverso de cantidad) | Cuantitativo puro |
| Venta (Factura/Boleta/POS) | ✅ (motor distinto) | ❌ | — | ❌ | ✅ (con guard de idempotencia `yaRevertido`) | Cuantitativo puro, motor separado |
| Nota de Crédito con devolución física | ✅ | ❌ | — | ❌ | — | Reversión proporcional por almacén, sin costo |
| Transferencia entre almacenes | ✅ (origen/destino) | ❌ (concepto inexistente) | — | — | ✅ (con `movimientoRelacionadoId`) | Solo cantidad |
| Orden de Compra (registrar) | ❌ | ❌ | — | — | — | Correcto — no debe afectar stock |
| Orden de Venta (reservar) | ❌ (solo reserva) | — | — | — | ✅ (liberación de reserva) | Correcto — reserva, no movimiento real |

---

## 23. Matriz de clasificaciones de línea (Compras)

| Clasificación | Genera CxP | Afecta inventario | Requiere producto | Genera Kardex | Observación |
|---|---:|---:|---:|---:|---|
| `producto` | Sí | Según `modalidadInventario` del documento (no por línea) | Sí (siempre, hoy) | Solo si `con_nota_ingreso` se conecta — hoy no genera nada real | Única clasificación con lógica de negocio operativa |
| `servicio` | Sí | Igual que `producto` — **no hay exclusión por ser servicio** | Sí (hoy toda línea exige producto) | Igual que arriba, hoy no aplica | Riesgo: un servicio dentro de un CC `con_nota_ingreso` heredaría `afectaInventario=true` si se conectara el puente sin corregir esto primero |
| `gasto` | Pendiente de decisión (no implementado) | No debería | No debería (línea libre) | No | Enum declarado, cero lógica — decisión de Producto/PM pendiente |
| `suministro` | Pendiente de decisión | Debatible — un suministro consumible podría inventariarse | Si se decide inventariar, sí | Si se decide inventariar, sí | Enum declarado, cero lógica |
| `activo_fijo` | Pendiente de decisión | No (activo fijo no es inventario circulante) | Podría requerir un registro propio de activos (inexistente hoy) | No | Enum declarado, cero lógica; módulo de activos fijos no existe |

**Nota**: esta tabla describe el estado declarado en el tipo vs. lo realmente ejecutable — no es una propuesta de diseño nuevo, es la fotografía de lo que existe y lo que falta decidir.

---

## 24. Matriz de indicadores de costo y margen

| Indicador | Fórmula | Datos disponibles hoy | Datos faltantes | Ubicación recomendada |
|---|---|---|---|---|
| Último costo de compra | Costo unitario de la última `LineaCompra`/`LineaNotaIngreso` registrada | `costoUnitario` existe en ambos documentos | Ninguna consulta agregada que lo derive hoy | Detalle de Producto (derivado, no persistido como campo aparte) |
| Costo actual del stock (por capa) | Costo de la capa vigente más antigua (FIFO) | Nada — no existen capas | Estructura de capas completa | Inventario/Kardex |
| Valor total del inventario | Σ (cantidad remanente × costo) por capa | Nada — `valorTotalStock` es campo muerto | Estructura de capas + función de agregación | Reporte de inventario valorizado |
| Costo FIFO de la siguiente salida | Costo de la capa más antigua con remanente | Nada | Estructura de capas + lógica de consumo | Inventario/Kardex |
| Costo real de venta | Σ costo de capas consumidas por la línea de venta | Nada | Persistencia de costo en línea de venta | Comprobante de venta (persistido) |
| Utilidad bruta | Venta neta − costo real de venta | Venta neta sí existe (`CartItem`/línea) | Costo real de venta (no existe) | Reporte de rentabilidad |
| Margen sobre venta | Utilidad bruta / venta neta | Depende de utilidad bruta | Igual que arriba | Reporte de rentabilidad |
| Recargo/markup | Utilidad bruta / costo de venta | Depende de ambos | Igual que arriba | Reporte de rentabilidad |

---

## 25. Riesgos de migración y datos existentes

- **Sin backend/BD**: toda la persistencia actual es `localStorage`. Cualquier migración de esquema (agregar campos de costo a `MovimientoStock`, crear estructura de capas) debe considerar productos/stock ya existentes en instalaciones activas, sin costo alguno asociado — de ahí la decisión pendiente #10/#11 (§18) sobre cómo sembrar costo inicial desde `precioCompra`.
- **`cantidadIngresadaInventario`/`cantidadPendienteInventario` en `LineaCompra` están en 0 para todo dato histórico** — no reflejan ninguna recepción real pasada; no se puede usar para reconstruir historial de recepciones si se decide implementarlo retroactivamente.
- **Compras registradas antes de la valorización no tendrán capas** — cualquier venta que hoy consuma ese stock "sin capa" necesitará una regla explícita (p. ej., capa "legado" al costo `precioCompra` vigente al momento de activar valorización, marcada como estimada).
- **Los 3 motores de salida (NV, Factura/Boleta/POS, NS) migran a distinto ritmo si no se unifican primero** — riesgo de que la valorización funcione en un flujo y no en otro durante una transición.
- **No hay tipo de cambio histórico en ningún movimiento** — compras en USD hechas antes de la integración no podrán valorizarse correctamente en soles sin asumir un tipo de cambio (actual, con el sesgo que eso implica) para el stock preexistente.

---

## 26. Archivos auditados

**Productos / Presentaciones / Unidades:**
`catalogo-articulos/models/types.ts`, `catalogo-articulos/components/product-modal/{ProductFinancialSection,ProductAdditionalUnitsTable,ProductPricingTable,ProductTypeSelector}.tsx`, `catalogo-articulos/hooks/{useProductForm,useProductStore}.ts`, `shared/inventory/unitConversion.ts`, `shared/units/{codigoPresentacion,productUnitOptions}.ts`

**Precios:**
`lista-precios/models/PriceTypes.ts`, `lista-precios/utils/price-helpers/columns.ts`, `lista-precios/utils/effectivePrices.ts`

**Inventario / Kardex:**
`gestion-inventario/models/inventory.types.ts`, `gestion-inventario/services/inventory.service.ts`, `gestion-inventario/api/inventory.facade.ts`, `gestion-inventario/repositories/stock.repository.ts`, `gestion-inventario/hooks/{useInventory,useInventarioDisponibilidad}.ts`, `shared/inventory/{stockGateway,accionesStock}.ts`, `gestion-inventario/models/disponibilidad.types.ts`

**Notas de Ingreso/Salida, Ajustes, Importación:**
`gestion-inventario/models/{notaIngreso,notaSalida}.types.ts`, `gestion-inventario/services/{notaIngreso,notaSalida}.service.ts`, `gestion-inventario/repositories/notaIngreso.repository.ts`, `gestion-inventario/components/{FormularioNotaIngreso,FormularioNotaSalida,AdjustmentModal,PanelImportacionStock,TransferModal}.tsx`, `gestion-inventario/hooks/{useNotasIngreso,useNotasSalida}.ts`, `gestion-inventario/models/transferencia.types.ts`

**Compras:**
`compras/modelos/{LineaCompra,ComprobanteCompra,OrdenCompra,CuentaPorPagar,PagoCompra,TrazabilidadCompra,tiposBaseCompras}.ts`, `compras/servicios/{servicioOrdenCompra,servicioComprobanteCompra,servicioCuentaPorPagar,servicioPagoCompra,index}.ts`, `compras/logica/reglasCompras.ts`, `compras/mapeadores/{mapeadorCCaNI,mapeadorOCaCC,mapeadorCCaCuentaPorPagar,index}.ts`, `compras/utilidades/{calcularEstadosCompra,formatearCompras,index}.ts`, `compras/contexto/ContextoCompras.tsx`, `compras/componentes/formularios/{FormularioComprobanteCompra,FormularioOrdenCompra,SelectorModalidadInventario}.tsx`, `compras/componentes/items/useLineasCompra.ts`, `compras/constantes/modalidadesInventario.ts`

**Ventas / POS / Órdenes de Venta:**
`documentos-comerciales/utils/servicioReservaStock.ts`, `documentos-comerciales/utils/postEmisionOrdenVenta.ts`, `documentos-comerciales/hooks/useDocumentoComercialActions.ts`, `documentos-comerciales/components/{ListadoDocumentosComerciales,FormularioDocumentoComercial}.tsx`, `comprobantes-electronicos/hooks/useComprobanteActions.tsx`, `comprobantes-electronicos/punto-venta/hooks/{useCart,usePosComprobanteFlow}.tsx`, `comprobantes-electronicos/lista-comprobantes/pages/{ListaComprobantes,ProductSelector}.tsx`, `comprobantes-electronicos/shared/core/{comprobantePricing,taxBreakdown}.ts`, `comprobantes-electronicos/shared/form-core/hooks/{usePriceBook,usePayment}.tsx`, `documentos-comerciales/utils/documentoComercial.helpers.ts`

**Monedas / Almacenes / Impuestos / Configuración / Reportes:**
`shared/currency/{constants,currencyManager,types}.ts`, `configuracion-sistema/modelos/{Currency,Company,Configuration,Tax}.ts`, `configuracion-sistema/components/negocio/{SeccionMonedas,SeccionConfiguracionTributaria}.tsx`, `configuracion-sistema/hooks/useConfiguracionSistema.ts`, `configuracion-sistema/contexto/ContextoConfiguracion.tsx`, `indicadores-negocio/models/{reportDefinitions,indicadores}.ts`, `indicadores-negocio/api/types.ts`, `control-caja/{context/CajaContext,utils/errors}.ts`

Total aproximado: **90+ archivos** revisados con lectura de código real (no solo nombres), a través de 6 líneas de investigación paralelas más verificación cruzada directa (grep) sobre los hallazgos más críticos (código huérfano de `mapeadorCCaNI`/`calcularEstadosCompra`, ausencia de campo de costo en `MovimientoStock`, alcance real del selector de modalidad de inventario, y estado muerto de `valorTotalStock`).

---

## 27. Conclusión y recomendación de siguiente paso

SenciYo tiene una base sólida de **cantidades** (multi-almacén, multi-establecimiento, reservas separadas de salidas reales, anulaciones con guards de idempotencia en varios flujos) pero **cero infraestructura de costeo**. La integración solicitada (Compras→Inventario→Kardex valorizado→Costo de venta→Margen) no es un ajuste incremental menor: requiere (a) resolver primero las brechas de saneamiento de modelo que ya existen hoy sin valorización (factor de conversión no aplicado en Compras→NI, puente Compras↔Inventario huérfano, 3 motores de salida no unificados), y (b) construir desde cero el concepto de capa/costo por movimiento, que hoy no existe en ningún punto del código.

**Siguiente paso recomendado**: cerrar las Decisiones Funcionales Pendientes (§18) con Producto/PM — en particular las que bloquean el diseño técnico (tratamiento de IGV recuperable en el costo, qué hacer con stock histórico sin costo, y si el ingreso automático debe generar una NI visible) — antes de tocar código. Comenzar la implementación por la **Etapa 0 (saneamiento del modelo)**, ya que corrige inconsistencias que existen independientemente de si se construye o no el Kardex valorizado.
