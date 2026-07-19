# Diseño técnico definitivo — Integración Compras, Inventario, Kardex Valorizado, Costo de Venta y Margen

**Fecha:** 2026-07-16
**Naturaleza:** documento de diseño técnico y funcional. No se implementó código, no se modificaron modelos, no se crearon componentes ni servicios.
**Repositorio:** `C:\FacturaFacil` — app: `apps/senciyo/src`.
**Insumo:** `docs/auditoria-integracion-compras-inventario-kardex-valorizado.md` (no modificado) + verificación directa de código adicional realizada en esta tarea.

Convención de este documento: todo bloque de código marcado `// DISEÑO PROPUESTO` es una propuesta técnica, no código existente. Todo lo demás citado con ruta y línea es código real verificado.

**Nota de revisión (corrección y cierre definitivo):** este documento fue revisado íntegramente después de su primera versión para incorporar seis correcciones obligatorias, sin cambiar la arquitectura central ya aprobada (`MovimientoStock` cuantitativo + `CapaCostoInventario` + `ConsumoCapaCostoInventario`, ver §9.1):

1. **Nomenclatura en español** para toda la infraestructura nueva — `ServicioKardexValorizado`, `CapaCostoInventario`, `ConsumoCapaCostoInventario`, `ValorizacionInicialInventario`, `OperacionIdempotenteInventario`, `LoteImportacionValorizada`, y sus archivos bajo `gestion-inventario/{modelos,servicios,repositorios,utilidades}/` — sin renombrar el código legado en inglés que ya existe (`InventoryService`, `StockRepository`, `MovimientoStock`, etc.), y **sin crear un segundo módulo de Inventario**: todo vive dentro de `gestion-inventario/` (§2 del encargo de corrección).
2. **Ámbito multiempresa explícito** (`empresaId`) en todos los modelos nuevos y en `MovimientoStock`, con clave de idempotencia compuesta (`empresaId + clave`) e invariante dedicada (§6 del encargo, §32 invariante 21).
3. **Jerarquía canónica de cantidades** declarada explícitamente: suma de capas activas es la fuente valorizada; `Product.stockPorAlmacen` es proyección sincronizada, nunca segunda verdad; función de reconciliación que nunca reconstruye capas desde el agregado (§8.1, corrige §7 del encargo).
4. **Snapshot histórico generalizado**: `esInventariable`, factor, unidad, afectación tributaria, recuperabilidad, moneda, TC, costo valorizable, almacén y presentación se persisten al confirmar el documento y nunca se recalculan leyendo el catálogo vigente (§10.0, corrige §8 del encargo).
5. **Niveles de costo desambiguados**: `costoUnitarioComercialOriginal` (por presentación) vs. `costoUnitarioBaseOriginal` (por unidad mínima, moneda original) vs. `costoUnitarioBaseMonedaBase` (por unidad mínima, moneda base) vs. `valorValorizableOriginal`/`valorValorizableMonedaBase` (totales) — ningún campo mezcla dos niveles (§9.2, corrige §9 del encargo).
6. **Tratamiento de impuestos recuperables sin asunción silenciosa**: se descarta `Company.aplicaCreditoFiscal` (default `true` asumido) y se reemplaza por `Configuration.inventory.tratamientoImpuestoCompra`, con default `'pendiente_configuracion'` que **bloquea la activación de valorización** hasta que la empresa confirme explícitamente su política (§16, corrige §10 del encargo).

**Nota de la segunda revisión (correcciones omitidas por truncamiento, completadas ahora):** una primera pasada de corrección aplicó los 6 puntos anteriores; esta segunda pasada revisó el documento completo de punta a punta y corrigió, de forma propagada (no como apéndice), lo siguiente:

7. **Motor central separado en dos fases** (`prepararOperacionInventario`, pura, sin efectos secundarios; `confirmarOperacionInventario`, la única que persiste) — la versión anterior llamaba a `InventoryService.registerAdjustment` (que persiste de inmediato) a mitad de una secuencia que después seguía creando capas, lo cual no era atómico (§12).
8. **Política de precisión concreta y centralizada** (`precisionInventario.ts`): 6 decimales para cantidades, 8 para factores y costos unitarios internos, `decimalPlaces` de la moneda solo para valores finales — reemplaza la vaga "mínimo 6 decimales" anterior (§17.3).
9. **Consistencia transaccional lógica vía diario recuperable** (`TransaccionInventario`) en vez de "leer→validar→calcular→escribir, ledger al final" con "revisión manual" como respuesta a un fallo — se define una rutina de recuperación determinística para cada escenario de interrupción, y se deja de usar la expresión "atomicidad real" para describir `localStorage` (§22).
10. **Idempotencia con hash y estado**: `OperacionIdempotenteInventario` gana `estado`, `hashEntrada` y `resultadoIds: string[]` (ya no un `resultadoId` escalar); la clave de venta pasa de un UUID generado por intento (`VENTA-${operationId}`, no idempotente en la práctica) a una clave estable derivada de un id de documento persistido antes de mutar inventario (`VENTA-STOCK-${documentoVentaId}`) (§21).
11. **Activación irreversible sin rollback booleano**: `Configuration.inventory.estadoValorizacion` reemplaza el booleano `valorizacionActiva` por una máquina de 9 estados sin ninguna transición de `'activa'` hacia atrás — se elimina toda mención de "`valorizacionActiva=false` desactiva..." como estrategia de rollback (§24, §31.5).
12. **Transferencias y devoluciones completas**: linaje explícito con fecha de adquisición vs. fecha de transferencia, devolución de cliente con reconstrucción proporcional del costo histórico, devolución al proveedor, frontera de la nota de crédito de compra, y anulación de una entrada ya transferida (§19, §20).
13. **Plan de etapas dividido** (0, 1A-1E, 2, 3, 4, 5) en vez de una "Etapa 1" monolítica; el mapeador CC→NI se prueba en la Etapa 0 pero solo se conecta a un flujo productivo en la Etapa 3 (§34) — *(nota: la Etapa 2 se corrigió de nuevo en la tercera revisión, ver punto 19 abajo)*.
14. **Backlog reclasificado** en 6 tipos (historia funcional, habilitador técnico, tarea de infraestructura, tarea de migración, corrección de deuda técnica, historia de reporte) — sin habilitadores técnicos redactados como "Como desarrollador, quiero..." (§35).
15. **Nueva sección "Estándares técnicos de implementación"** con la lista completa de "cero tolerancia" exigida y los niveles de verificación (código vs. unitaria vs. integración vs. navegador real).
16. **28 escenarios de prueba adicionales** (interrupción del diario, recuperación, conflicto de idempotencia, devoluciones, transferencias parciales, precisión) y criterio de desempate FIFO (`fechaEntrada`→`fechaCreacion`→`id`, nunca el orden del arreglo) (§36).

**Nota de la tercera revisión (cierre final de bloqueantes):** esta tercera pasada corrigió tres últimos bloqueantes detectados sobre la segunda versión, propagados en resumen ejecutivo, arquitectura, modelos, contratos, flujos, motor central, diario transaccional, idempotencia, estados, migración, etapas, riesgos, invariantes, pruebas y conclusión:

17. **Orden seguro de activación**: se corrige que una empresa pudiera llegar a `estadoValorizacion='activa'` (en la Etapa 2 de la segunda versión) antes de que Compras y Ventas tuvieran sus flujos conectados al motor central. Ahora, `validada→activando` está gateada por `verificarCondicionesActivacion()` (§24.1bis) — un checklist de los 7 grupos de entradas/salidas/operaciones adicionales que deben estar migrados — y la acción "Confirmar activación" **no se entrega en la UI hasta el cierre de la Etapa 4**, no antes (§34).
18. **Comportamiento diferenciado por estado, sin mutación libre fuera de suspensión**: `puedeMutarInventario(estado)` dejó de ser un booleano plano (`!== 'suspendida_por_inconsistencia'`, que permitía mutar incluso en `'validada'`/`'activando'`/`'fallida_recuperable'`) y se reemplaza por `resolverModoOperacion(estado)` con 6 modos diferenciados y una matriz completa de 9 estados × 6 capacidades (§24.1ter, §24.1quater) — incluye la invalidación de snapshot de migración (`requiereRecalculo`) cuando una mutación cuantitativa toca un producto+almacén ya propuesto en el lote.
19. **Unidad transaccional por documento completo, no por línea**: `DatosEntradaValorizada`/`DatosSalidaValorizada` (un producto/almacén individual, forzando invocaciones por línea) se reemplazan por `DatosOperacionEntradaInventario`/`DatosOperacionSalidaInventario`, que envuelven `lineas: []` — una NI, una venta o un ajuste con varias líneas se preparan y confirman como **una sola operación atómica e idempotente**, nunca línea por línea (§12.1-§12.5).

---

## 1. Resumen ejecutivo

Este documento traduce las 16 decisiones funcionales ya aprobadas por Producto (sección 3) en un diseño técnico ejecutable sobre el repositorio real de SenciYo. La conclusión central: **no se debe extender `MovimientoStock` con campos monetarios** (opción A del §9); se debe mantener como registro puramente cuantitativo del "hecho físico" y crear dos entidades nuevas — `CapaCostoInventario` (saldo valorizado de una entrada) y `ConsumoCapaCostoInventario` (relación N:M entre una salida y las capas que consume) — porque una salida puede consumir varias capas y esa relación no cabe en un campo escalar sin normalizar el modelo hasta perder trazabilidad.

El diseño identifica y corrige, sin refactorizar código, tres ambigüedades estructurales que bloquean la integración:

1. **`afectaInventario` de `LineaCompra` mezcla dos conceptos distintos** (naturaleza de la línea vs. efecto del documento) — se separan en `esInventariable` (nuevo, derivado de la clasificación y del producto) y `afectaInventario` (redefinido como el AND de `esInventariable` y la política del documento).
2. **Tres motores de mutación de stock** (`InventoryService.registerAdjustment`, `inventory.facade.ts::addMovimiento`, y la orquestación FIFO repetida en 3 archivos) se unifican detrás de un único servicio de dominio, `ServicioKardexValorizado`, sin obligar a que cada componente cambie su punto de entrada — el servicio se divide en una fase de **preparación pura** (`prepararOperacionInventario`, calcula el plan completo en memoria, sin ningún efecto secundario) y una fase de **confirmación** (`confirmarOperacionInventario`, la única que persiste, dentro de un diario transaccional recuperable) (§12, §22), y opera siempre sobre el **documento completo** (todas sus líneas juntas, `DatosOperacionEntradaInventario`/`DatosOperacionSalidaInventario`), nunca línea por línea (§12.1).
3. **Ausencia total de idempotencia estructural**: hoy la única protección es un booleano de React (`isProcessing`) y, en el caso de Factura/Boleta, el `numeroComprobante` que se usa como referencia es literalmente `Math.random()` (`useComprobanteActions.tsx:347`, comentario propio: "Simular respuesta exitosa") — no sirve como clave de idempotencia. Se diseña una clave de idempotencia de dominio, derivada de un id de documento persistido **antes** de cualquier `await` (no un UUID generado en cada intento), con hash de entrada para distinguir un reintento legítimo de un conflicto real (§21).

El resto del documento detalla modelos, relaciones, flujos paso a paso, consistencia transaccional lógica sobre `localStorage` mediante un diario recuperable, migración del stock existente con una máquina de activación irreversible, deprecación de `Product.precioCompra`, invariantes, riesgos, plan de etapas dividido, backlog reclasificado, estándares técnicos de implementación y estrategia de pruebas.

---

## 2. Fuentes revisadas

### 2.1 Documento de auditoría
`docs/auditoria-integracion-compras-inventario-kardex-valorizado.md` (27 secciones, 6 matrices) — no modificado, usado como punto de partida.

### 2.2 Código verificado directamente en esta tarea (evidencia verbatim, no solo narrativa)

**Productos/Presentaciones:** `catalogo-articulos/models/types.ts` (interfaces `Product`, `AdditionalUnitMeasure`, `isProductEnabledForEstablecimiento`), `shared/inventory/unitConversion.ts` (completo: `normalizeUnitCode`, `resolveUnidadMinima`, `getFactorToUnidadMinima`, `convertToUnidadMinima`, `convertFromUnidadMinima`, `describeUnitConversion`, `ensureUnitCode`, `resolveSunatUnitCode`), `shared/units/codigoPresentacion.ts` (completo), `shared/units/productUnitOptions.ts` (interface `ProductUnitOption` — y su duplicado divergente en `lista-precios/models/PriceTypes.ts:54-59`).

**Inventario/Kardex:** `gestion-inventario/models/inventory.types.ts` (interfaces `MovimientoStock`, `StockAdjustmentData`, `StockSummary`, tipos `MovimientoTipo`/`MovimientoMotivo`), `gestion-inventario/services/inventory.service.ts` (cuerpo completo de `registerAdjustment` y `updateStock`, firmas de `registerTransfer*`), `shared/inventory/stockGateway.ts` (cuerpo completo de `allocateSaleAcrossalmacenes`, `computeAvailable`, firmas de `resolvealmacenesForSaleFIFO`/`summarizeProductStock`), `shared/inventory/accionesStock.ts` (completo), `gestion-inventario/models/transferencia.types.ts` (completo), `configuracion-sistema/modelos/Almacen.ts` (completo), `gestion-inventario/repositories/stock.repository.ts` (completo — confirmación de ausencia total de locking/transacciones).

**Notas de Ingreso/Salida:** `gestion-inventario/models/notaIngreso.types.ts` y `notaSalida.types.ts` (completos), cuerpo completo de `generarNIEnInventario`, `anularNIEnInventario` (`notaIngreso.service.ts`) y `generarNSEnInventario` (`notaSalida.service.ts`).

**Ventas/POS:** cuerpo completo de `descontarStockParaDocumento`/`revertirDescuentoStockDocumento` (`servicioReservaStock.ts`), `inventory.facade.ts::addMovimiento` completo, bloque de descuento de stock en `useComprobanteActions.tsx:530-686`, interface `CartItem` completa, guard `isProcessing` (`useComprobanteState.tsx`/`usePosComprobanteFlow.ts`), orden real de generación de `numeroComprobante` vs. descuento de stock.

**Compras:** `LineaCompra.ts`, `ComprobanteCompra.ts`, `OrdenCompra.ts`, `tiposBaseCompras.ts` (todos completos), `mapeadorCCaNI.ts` (completo), `calcularEstadosCompra.ts` (completo), `derivarEstadoInventarioCC` y todos los usos de `estadoInventario` en `ContextoCompras.tsx`, cuerpo completo de `resolverImpuestoProducto`/`calcularLineaCompra`/`calcularMontoRetencion` (`reglasCompras.ts`), `SelectorModalidadInventario.tsx` (completo).

**Moneda/Impuestos/Configuración:** `shared/currency/currencyManager.ts` (completo), `CurrencyDescriptor`, `DEFAULT_CURRENCIES`, mecanismo real de sincronización `Company.monedaBase` → `currencyManager` (`ContextoConfiguracion.tsx:1530-1536`), `useCurrency.tsx` (de dónde sale `currencyInfo.rate` realmente), `Tax`/`TaxCalculator`/`PERU_TAX_TYPES` (`Tax.ts`), `Configuration.inventory` completo, defaults reales en `useConfiguracionSistema.ts`, `Company.regimenTributario`.

Total de archivos con lectura verbatim en esta tarea: **~45** (además de los ~90 ya auditados previamente). Ningún archivo fue modificado.

---

## 3. Decisiones funcionales aprobadas

Se listan tal cual fueron entregadas por Producto (secciones 3.1 a 3.16 del encargo). Este documento **no** las reinterpreta ni sustituye — solo las traduce a diseño técnico:

1. Ingreso automático genera NI real, visible, auto-confirmada, mismo motor que el manual, sin segundo camino silencioso, idempotente.
2. Ingreso mediante NI manual: CC pendiente hasta confirmar NI; 1 NI completa por CC en el primer alcance; arquitectura preparada para 1:N futuro sin rehacer el modelo.
3. "No afecta inventario": cero NI, cero movimiento, cero capa; puede generar CxP/pago; desacoplado del Kardex.
4. Líneas inventariables: naturaleza de línea (inventariable o no) separada del efecto del documento (afecta o no en este momento); solo productos inventariables y suministros vinculados a producto inventariable generan Kardex; OC no aumenta stock (esto no es un defecto a corregir).
5. Presentaciones: CC conserva presentación/unidad/cantidad/costo comercial y factor aplicado; Inventario/Kardex siempre en unidad mínima; factor persistido como snapshot histórico, nunca reconsultado.
6. Costo valorizable: nace en el CC; excluye impuesto recuperable, incluye no recuperable; aplica descuentos; se convierte a costo por unidad mínima; flete/seguro/prorrateo/bonificaciones fuera del MVP.
7. Moneda base configurable por empresa (no hardcode PEN); Kardex valorizado en moneda base; operaciones en otra moneda conservan moneda/costo original + TC histórico + costo convertido; sin recálculo con TC actual; reutilizar fuentes centrales de Ventas.
8. `Product.precioCompra` deja de ser fuente oficial; único uso transitorio: propuesta de migración/prellenado a confirmar; estrategia de deprecación limpia, sin campo muerto ni fuente paralela permanente.
9. Toda entrada positiva valorizada exige costo unitario válido > 0 (NI, ajuste, importación en sus 3 modos, devolución física); sin costo cero; importación con cantidad+costo+almacén, validación, previsualización, trazabilidad; bonificaciones a costo cero fuera de este alcance.
10. Activación de valorización: capa inicial por empresa+establecimiento(si aplica)+producto+almacén con stock positivo; detección, propuesta (con `precioCompra` como sugerencia), revisión/confirmación, origen del valor, trazabilidad; bloqueo de activación con stock positivo sin costo confirmado; sin inventar costo histórico no disponible.
11. Anulaciones: reversos trazables con cantidad/costo/moneda base/capa(s) originales y relación al movimiento revertido; bloqueo si el stock ya se consumió y no puede revertirse con coherencia; sin editar/eliminar silenciosamente, sin stock negativo, sin recalcular con valores actuales.
12. FIFO único método oficial; LIFO/promedio/específico ocultos/deshabilitados; separar conceptualmente selección de almacén vs. consumo FIFO de capas; renombrar o separar las funciones actuales mal llamadas "FIFO".
13. Costo real de venta persistido por línea en el momento de la salida, rastreable a los consumos de capa; nunca recalculado con costo actual/promedio/futuro.
14. Margen: Precios sigue siendo solo dueño de precios de venta; margen estimado en Producto; valor/costo de stock en Inventario/Kardex; utilidad/margen real en reporte de rentabilidad; margen estimado usa costo de la siguiente salida FIFO **por almacén**, sin consolidar sin contexto de almacén.
15. Capas FIFO por empresa+establecimiento(según modelo vigente)+producto+almacén; transferencias retiran capas reales, conservan costo/fecha/procedencia, crean capas equivalentes en destino, sin revalorizar, sin usar `precioCompra`, sin generar utilidad, con reverso trazable.
16. CxP/Pagos permanecen desacoplados de stock/recepción/costo/capas/costo de venta; pagar o anular un pago no crea ni revierte stock.

---

## 4. Validación de las decisiones contra el repositorio

| # | Decisión | ¿El repositorio la soporta hoy? | Evidencia | Implicación técnica |
|---|---|---|---|---|
| 1 | Ingreso automático → NI real | ❌ No — `derivarEstadoInventarioCC` (`ContextoCompras.tsx:233-237`) solo cambia `estadoInventario` a `'automatico'`; ninguna función de `compras/` invoca `generarNIEnInventario` | Confirmado por grep exhaustivo (ver auditoría §13) — código huérfano `mapeadorCCaNI.ts`/`calcularEstadosCompra.ts` | Se debe conectar el CC con `generarNIEnInventario` real, generando y auto-confirmando una NI, no solo cambiar el estado |
| 2 | NI manual, CC pendiente, 1:N futuro | ✅ Parcialmente — `NotaIngreso.documentoOrigen`/`numeroDocumentoOrigen` son texto libre (`notaIngreso.types.ts`); `ComprobanteCompra.notasIngresoRelacionadas?: string[]` ya es un **arreglo** (`ComprobanteCompra.ts:119`), es decir el modelo YA admite 1:N aunque hoy nunca se puebla | `ComprobanteCompra.ts:119`, `mapeadorCCaNI.ts:5-15` | Solo falta la FK tipada y su uso real; la cardinalidad 1:N no requiere cambio de tipo, ya está declarada |
| 3 | No afecta inventario desacoplado | ✅ Ya correcto | `FormularioComprobanteCompra.tsx:376-379`, `derivarEstadoInventarioCC` línea 235 | Sin cambios necesarios en esta regla |
| 4 | Línea inventariable ≠ documento afecta | ❌ No distinguido — `afectaInventario` se asigna uniformemente por documento (`FormularioComprobanteCompra.tsx:376-379`), ignorando `clasificacion` | Confirmado — `grep "clasificacion"` en `ContextoCompras.tsx` → 0 resultados de uso en reglas | Se requiere nuevo campo derivado `esInventariable` (§10) |
| 5 | Snapshot de factor de conversión | ❌ No existe ningún campo de factor en `MovimientoStock` ni en `LineaNotaIngreso` (`inventory.types.ts:35-67`, `notaIngreso.types.ts:28-45`) | Confirmado — ni unidad ni factor viajan al movimiento | Requiere nuevos campos en `LineaNotaIngreso`/movimiento (§10, §15) |
| 6 | Costo valorizable sin IGV recuperable | ❌ No hay noción de "recuperable" en `Tax` ni en `Company` (`Tax.ts:1-76`, `Company.ts`) — grep de `recuperable|creditoFiscal` sin resultados | Confirmado — falta modelo central mínimo | Se propone `Configuration.inventory.tratamientoImpuestoCompra` (§16), configuración explícita sin valor asumido — default `'pendiente_configuracion'` bloquea la activación en vez de asumir recuperabilidad |
| 7 | Moneda base configurable, TC histórico | ⚠️ Parcial — `Company.monedaBase` existe y se sincroniza a `currencyManager` (`ContextoConfiguracion.tsx:1530-1536`), pero `currencyInfo.rate` en Ventas usa la tasa **vigente** del `CurrencyDescriptor`, no una tasa fechada/histórica (`useCurrency.tsx:22-33`) | `Company.ts:28`, `useCurrency.tsx` | El "TC histórico" de Ventas hoy es solo "el TC vigente al momento de emitir", capturado como snapshot en el documento — es reutilizable como snapshot, pero no existe una tabla de tasas por fecha |
| 8 | `precioCompra` no oficial | ✅ Confirmado como hallazgo de auditoría; ampliado aquí: consumidores exactos son `servicioOrdenCompra.ts:97,122`, `FormularioNotaIngreso.tsx:399`, `useAvailableProducts.tsx`, `ProductSelector.tsx`, `useLineasCompra.ts:71` | ver §10, §25 | Plan de deprecación con consumidores nombrados |
| 9 | Costo obligatorio en entradas | ❌ Ningún control lo exige hoy — `StockAdjustmentData` (`inventory.types.ts:155-163`) no tiene campo de costo | Confirmado | Debe añadirse en el nuevo `ServicioKardexValorizado`, no en `StockAdjustmentData` (que se mantiene cuantitativo) |
| 10 | Activación con capa inicial | ❌ No existe ningún proceso de activación ni `Configuration.inventory` tiene un flag de "valorización activa" (`Configuration.ts:49-61`) | Confirmado | Nuevo campo + nuevo flujo (§24) |
| 11 | Anulaciones trazables, bloqueo si consumido | ✅ Patrón parcial ya existe — `anularNIEnInventario` (`notaIngreso.service.ts:140-164`) ya bloquea si `stockActual < linea.cantidad`, aunque por cantidad agregada, no por capa | `notaIngreso.service.ts:151-164` | Se debe migrar esa validación de "cantidad agregada" a "capa específica no consumida" (§20) |
| 12 | FIFO único método, funciones renombradas | ❌ `resolvealmacenesForSaleFIFO`/`allocateSaleAcrossalmacenes` (`stockGateway.ts:245-318`) NO son FIFO de costo — confirmado con el cuerpo completo transcrito en §2.2 | `stockGateway.ts:286-318` (cuerpo completo revisado) | Ver §18 — separación conceptual explícita |
| 13 | Costo de venta persistido por línea | ❌ `CartItem` (`comprobante.types.ts:84-131`) no tiene ningún campo de costo de venta — solo `precioCompra` (snapshot manual, no de venta) | Confirmado, interface completa revisada | Nuevo campo en línea de venta persistida (§26) |
| 14 | Margen: ubicaciones aprobadas | ✅ Consistente con lo auditado — `lista-precios` no tiene ningún campo de costo (confirmado en auditoría, no se volvió a verificar por no ser necesario) | — | Sin cambios de ubicación necesarios |
| 15 | Capas por almacén, transferencias sin revalorizar | ✅ `Almacen` (`Almacen.ts:1-51`) sí tiene `establecimientoId`, `prioridadSalida`, `esAlmacenPrincipal`, `estaActivoAlmacen` — todos los campos necesarios para ordenar capas por almacén ya existen | `Almacen.ts` completo | Ninguna dependencia bloqueante |
| 16 | CxP/Pagos desacoplados | ✅ Confirmado limpio en auditoría previa; no se requirió re-verificación | — | Sin cambios necesarios |

---

## 5. Correcciones o matices al informe de auditoría

La auditoría previa es, en general, precisa. Se identifican los siguientes matices con evidencia adicional recolectada en esta tarea:

1. **`MovimientoTipo` y `MovimientoMotivo` no son `enum` de TypeScript** — son *union types* de literales string (`inventory.types.ts:6-30`). La auditoría los llamaba genéricamente "enums"; la distinción importa para el diseño porque no hay un objeto en tiempo de ejecución que enumerar (p. ej. para poblar un `<select>`), solo el literal union.
2. **`registerAdjustment` (`inventory.service.ts:135-193`) no valida stock insuficiente para `SALIDA`/`AJUSTE_NEGATIVO`/`MERMA`** — el propio cuerpo revisado confirma que `nuevoStock` puede quedar negativo y se persiste vía `updateStock`, que por defecto (`allowNegativeStock` no seteado) hace `Math.max(0, ...)`, es decir, **oculta el déficit clampeando a 0 en silencio** en lugar de rechazar la operación. La auditoría mencionaba el clamp pero no remarcaba que esto significa que una salida que debería fallar por falta de stock, hoy simplemente trunca sin error — hallazgo nuevo, relevante para el diseño de validación del motor central (§12).
3. **`allocateSaleAcrossalmacenes` es puramente calculadora, no muta nada** — confirmado con el cuerpo completo: solo retorna `almacenDiscountAllocation[]`. La mutación real ocurre en llamadas posteriores separadas a `registerAdjustment`/`addMovimiento`, una por cada asignación. Esto es relevante porque significa que **hoy ya existe una ventana entre "calcular cuánto descontar" y "efectivamente descontar"**, y por cada almacén asignado se hace una llamada independiente (sin transacción) — la auditoría no explicitaba este detalle de implementación, que es clave para diseñar la atomicidad del nuevo motor (§22).
4. **`descontarStockParaDocumento` (Nota de Venta) NO valida stock suficiente antes de aplicar** — a diferencia de `generarNSEnInventario`, que sí valida explícitamente `remaining > 0` y lanza error (`notaSalida.service.ts`, línea equivalente a 633-637 en `useComprobanteActions.tsx`). Este es un hallazgo **nuevo**, no estaba en la auditoría previa: **Nota de Venta puede generar stock negativo silencioso** vía el mismo clamp de `updateStock` mencionado en el punto 2.
5. **El comentario de código en `useComprobanteActions.tsx:650` ("Aplicación atómica...") es objetivamente falso** — el bucle que sigue (líneas 651-668) aplica movimientos uno por uno de forma síncrona sin ningún rollback; si uno falla a mitad de camino, los anteriores ya se aplicaron y el `catch` solo muestra un toast ("ajusta manualmente"). La auditoría había señalado la ausencia de un motor único, pero no había citado este comentario engañoso — es evidencia adicional de que el problema no es solo arquitectónico sino que el código actual **cree** ser atómico sin serlo.
6. **`numeroComprobante` en el flujo de Factura/Boleta es literalmente `Math.random()`** (`useComprobanteActions.tsx:347`, comentario propio "Simular respuesta exitosa"), generado **antes** del bloque de descuento de stock pero **sin relación con ninguna clave de idempotencia real**. La auditoría mencionaba el riesgo de doble descuento en NV/OV por falta de guard, pero no había identificado que el propio "número de comprobante" — que uno esperaría usar como clave natural de idempotencia — es un valor simulado sin persistencia transaccional. Este hallazgo cambia el diseño de idempotencia de venta (§21): no se puede usar `numeroComprobante` como clave, se necesita una clave generada por el cliente.
7. **`Tax.ts` ya tiene `affectationCode`/`affectationName` (Catálogo 07 SUNAT: 10/20/30/40)** estructurados (`Tax.ts:24-34`), pero **Compras no los usa** — en su lugar, `resolverImpuestoProducto` (`reglasCompras.ts:884-900`) parsea un string libre (`Product.impuesto`) con regex/substring. La auditoría había señalado el parseo de texto libre como debilidad, pero no había identificado que el modelo estructurado correcto **ya existe en `Tax`**, simplemente no está conectado desde `Product`. Esto cambia la recomendación: no hay que inventar un catálogo nuevo, hay que conectar uno que ya existe (§16).
8. **Existen al menos 4 implementaciones independientes y ligeramente distintas del mismo parseo de texto de impuesto** (`resolverImpuestoProducto` en `reglasCompras.ts`, `resolverAfectacionDesdeImpuesto` en `shared/catalogos-sunat/validaciones-detraccion.ts`, `resolveIgvRate`/`resolveIgvRateNS` en `notaIngreso.service.ts`/`notaSalida.service.ts`) — una de ellas (`resolverAfectacionDesdeImpuesto`) además detecta `'exporta'` como caso especial que las otras tres no reconocen. La auditoría había señalado "IGV duplicado en 6+ archivos" de forma más general; aquí se precisa que son al menos 4 implementaciones de la **misma** función con comportamiento sutilmente distinto entre sí, no solo 6 fallbacks de `0.18`.
9. **`DEFAULT_CURRENCIES` (`constants.ts:36`, `exchangeRate: 3.75`) y el seed de `ContextoConfiguracion.tsx:355` (`exchangeRate: 3.70`) usan valores por defecto de tipo de cambio USD distintos entre sí** — inconsistencia menor no mencionada en la auditoría previa, relevante para el riesgo de migración (§24, §33).
10. **`Almacen.id` en transferencias (`Transferencia.id`, formato `TRF-YYYYMMDD-HHmmss`) puede colisionar en el mismo segundo** — esto ya estaba documentado en una auditoría previa de Transferencias (memoria de proyecto), y se confirma que sigue vigente en `transferencia.types.ts`. Relevante para el diseño de clave de idempotencia de transferencias (§21).

Ningún hallazgo de la auditoría previa fue refutado — todos los matices anteriores son **precisiones adicionales**, no correcciones de error.

---

## 6. Arquitectura actual relevante

```
Producto (catalogo-articulos)
  unidad (mínima) + unidadesMedidaAdicionales[] (factorConversion, sin costo/precio propio)
  precioCompra (costo referencial manual, sin moneda, no oficial)
  tipoExistencia (10 valores; 'SERVICIOS' = proxy no-inventariable, usado ad-hoc en 4+ archivos)

Compras (compras/)
  OrdenCompra —(no afecta stock, correcto por diseño)
  ComprobanteCompra
    modalidadInventario: con_nota_ingreso | ingreso_automatico | no_afecta_inventario
    lineas: LineaCompra[] (afectaInventario asignado uniformemente por documento, no por línea)
    notasIngresoRelacionadas: string[] (declarado, nunca poblado)
  mapeadorCCaNI.ts / calcularEstadosCompra.ts → código huérfano, cero consumidores

Inventario (gestion-inventario/)
  Product.stockPorAlmacen: Record<almacenId, number>  (cantidad agregada, sin capas)
  MovimientoStock (Kardex) — sin costo, sin moneda, sin capa, sin snapshot de factor
  NotaIngreso/NotaSalida — costoUnitario capturado en línea, descartado al generar movimiento
  stockGateway.ts — "FIFO" = solo orden/asignación de ALMACENES, no de costo
  3 motores de mutación: InventoryService.registerAdjustment (NV, NS) |
                          inventory.facade.ts::addMovimiento (Factura/Boleta/POS) |
                          (ambos re-implementan la misma aritmética por separado)
  stock.repository.ts — localStorage read-modify-write completo, sin lock/transacción

Precios (lista-precios/) — solo precios de venta, sin costo/margen (correcto, se mantiene así)

Configuración (configuracion-sistema/)
  Company.monedaBase → sincronizado a currencyManager (efecto secundario, no derivación pura)
  Tax.affectationCode (Catálogo 07 SUNAT) — existe, no conectado a Producto/Compras
  Configuration.inventory.costMethod — 4 valores declarados, 0 motores reales
```

---

## 7. Arquitectura objetivo

```
Producto/presentación (factorConversion snapshot-eable)
  → esInventariable() [nueva función pura, reemplaza los 4+ chequeos ad-hoc de tipoExistencia]
    → ComprobanteCompra (costo documental + moneda + TC + esInventariable por línea)
      → [ingreso_automatico | con_nota_ingreso] → NotaIngreso (motor único, real)
        → confirmación de NI
          → ServicioKardexValorizado.registrarEntradaValorizada()
            → MovimientoStock (ENTRADA, hecho físico, sin campos monetarios)
            → CapaCostoInventario (saldo valorizado: cantidad + costo + moneda + TC histórico)
              → [venta | NS | NC devolución] → ServicioKardexValorizado.registrarSalidaValorizada()
                → MovimientoStock (SALIDA)
                → ConsumoCapaCostoInventario[] (1:N — una salida puede tocar varias capas)
                  → costo real de venta (persistido en la línea de venta, snapshot inmutable)
                    → Utilidad bruta = venta neta − costo real de venta
                      → Margen = utilidad bruta / venta neta  (Reporte de rentabilidad)
```

Todo el árbol anterior queda protegido por: (a) una clave de idempotencia de dominio reservada antes de mutar el dominio (§12.1bis, §21), (b) un diario transaccional recuperable con control optimista de versión (§22, §22.1bis) — no una promesa de "bloque síncrono" como garantía por sí sola, sino recuperación determinística ante interrupción y detección de conflicto antes del commit, (c) invariantes verificables después de cada operación (§32).

---

## 8. Dueños y fuentes de verdad

| Dato | Dueño | Fuente de verdad | Persistido/derivado | Consumidores | Prohibiciones |
|---|---|---|---|---|---|
| Identidad, unidad mínima, naturaleza inventariable del producto | Productos | `Product.unidad`, `Product.tipoExistencia` | Persistido | Compras, Inventario, Ventas | No debe existir una segunda fuente de "unidad" por módulo |
| Presentaciones y factor **vigente** (para operaciones nuevas) | Productos | `Product.unidadesMedidaAdicionales[]` | Persistido | Compras (al crear línea), Ventas | El factor vigente **nunca** se usa para reconstruir un movimiento histórico — solo para operaciones nuevas |
| Costo documental de compra (comercial, con impuestos desglosados) | Compras | `LineaCompra`/`ComprobanteCompra` | Persistido | NI, `ServicioKardexValorizado` | Compras no calcula costo de Kardex por sí sola; solo entrega el insumo |
| Moneda original, TC, descuentos, impuestos de la compra | Compras | `ComprobanteCompra.moneda/tipoCambio`, `LineaCompra.tipoAfectacion/tasaIgv` | Persistido | `ServicioKardexValorizado` (conversión a moneda base) | El TC no se recalcula después de confirmada la NI |
| Modalidad de ingreso | Compras | `ComprobanteCompra.modalidadInventario` | Persistido | `ServicioKardexValorizado`, UI de Inventario | La modalidad no puede cambiarse después de generada la NI (ver §31) |
| Relación CC↔NI | Compras + Inventario (compartida) | `ComprobanteCompra.notasIngresoRelacionadas[]` + `NotaIngreso.origen.comprobanteCompraId` (nuevo) | Persistido, bidireccional | Reglas de bloqueo de anulación, UI de trazabilidad | Nunca usar texto libre (`documentoOrigen`) como relación técnica |
| Cantidades — reservas (`stockReservadoPorAlmacen`, `stockReservadoOVPorEstablecimiento`) | Inventario | `Product.stockReservadoPorAlmacen`/`stockReservadoOVPorEstablecimiento` | Persistido | Todos los módulos que consultan disponibilidad | Sin cambios — no representa cantidad valorizada, es reserva; ver §8.1 para la jerarquía de cantidad valorizada |
| Cantidades — stock valorizado (canónico, tras activar valorización) | Inventario | **Σ `CapaCostoInventario.cantidadDisponible` (`estado='disponible'`) por empresa+establecimiento+almacén+producto** | Persistido (en las capas) | `ServicioKardexValorizado`, reconciliación | Ver §8.1 — jerarquía obligatoria, corrige ambigüedad previa |
| Cantidades — `Product.stockPorAlmacen` | Inventario | Proyección operativa de lectura rápida, sincronizada en la misma unidad de trabajo que las capas | Persistido, pero **derivado en origen** de las capas (nunca al revés) | UI, disponibilidad, compatibilidad con `stockGateway.ts` existente | Nunca se trata como segunda verdad independiente — ver §8.1 |
| Movimientos (hecho físico) | Inventario | `MovimientoStock` (extendido, ver §10) | Persistido | Reportes, reversos, trazabilidad | `MovimientoStock` no lleva campos monetarios (ver §9) |
| Capas de costo (saldo valorizado) | Inventario | `CapaCostoInventario` (nueva) | Persistido | Consumo FIFO, valor de stock, margen estimado | Nunca se recalcula el costo de una capa ya creada |
| Consumo FIFO de una salida | Inventario | `ConsumoCapaCostoInventario` (nueva) | Persistido | Costo de venta, reversos | Una salida sin sus consumos asociados es un estado inválido (ver §32) |
| Precio de venta | Precios | `lista-precios` (`Column`, `ProductUnitPrices`) | Persistido | Ventas, margen (solo lectura) | Precios nunca escribe ni lee costo/capas |
| Venta neta, costo de venta persistido por línea | Ventas | Línea de comprobante/NV/NS (nuevo campo, ver §26) | Persistido en el momento de la venta | Reporte de rentabilidad | Nunca se recalcula con costo actual |
| Valor de inventario, costo de siguiente salida, utilidad, margen | Reportes | Derivado de `CapaCostoInventario` + `ConsumoCapaCostoInventario` + líneas de venta | Derivado (no persistido como snapshot salvo el costo de venta ya persistido en la línea) | Detalle de Producto, Reporte de rentabilidad | No se materializa un campo "margen" independiente que pueda desincronizarse |
| Moneda base, TC vigente | Configuración | `Company.monedaBase` → `currencyManager` | Persistido (empresa) + runtime (manager) | Todo cálculo de conversión | El TC vigente solo se usa para operaciones **nuevas**, nunca para recalcular históricas |
| Impuestos y su recuperabilidad | Configuración | `Tax` (existente) + `Configuration.inventory.tratamientoImpuestoCompra` (nuevo, §16) | Persistido | Compras (costo valorizable) | No hardcodear tasa ni recuperabilidad; no asumir un valor por defecto — `'pendiente_configuracion'` bloquea hasta confirmación explícita |
| Método de costeo oficial | Configuración | `Configuration.inventory.costMethod` (restringido a `'FIFO'` en UI, ver §12/§18) | Persistido | `ServicioKardexValorizado` | No construir motores para LIFO/promedio/específico en este alcance |
| Activación de valorización | Configuración | Nuevo campo `Configuration.inventory.estadoValorizacion` (máquina de estados, §31.5) + proceso de migración (§24) | Persistido | `ServicioKardexValorizado` (bloquea operar vía `puedeMutarInventario`/`esValorizacionActiva`) | No se activa con stock positivo sin costo confirmado; ninguna transición de regreso desde `'activa'` |

### 8.1 Corrección obligatoria: jerarquía canónica de cantidades

El documento original mantenía `Product.stockPorAlmacen`, `CapaCostoInventario.cantidadDisponible` y los contadores de `LineaCompra` (`cantidadIngresadaInventario`/`cantidadPendienteInventario`) sin declarar una jerarquía explícita entre ellos. Se corrige aquí:

#### Fuente canónica valorizada

> **Stock proyectado por almacén = suma de cantidades disponibles de las capas activas.**

Después de que una empresa alcanza `Configuration.inventory.estadoValorizacion === 'activa'` (§31.5), la suma de `CapaCostoInventario.cantidadDisponible` (con `estado='disponible'`) agrupada por `empresaId` + `establecimientoId` + `productoId` + `almacenId` **es** el stock valorizado canónico. No existe una segunda cantidad "verdadera" en paralelo.

#### Proyección operativa

`Product.stockPorAlmacen` permanece — no se elimina ni se reemplaza en su rol de lectura — como **proyección rápida** para: consultas de disponibilidad en tiempo real, la UI existente (que ya lo consume en decenas de componentes), y compatibilidad con `shared/inventory/stockGateway.ts` (que sigue operando sobre este campo sin cambios, ver §12.4). Pero deja de ser una segunda fuente de verdad independiente: **toda operación de `ServicioKardexValorizado` que crea o consume capas actualiza, dentro de la misma unidad de trabajo (§22), tanto las capas como `Product.stockPorAlmacen`** — nunca en pasos separados que puedan desincronizarse.

```ts
// DISEÑO PROPUESTO — dentro de la unidad de trabajo de cada operación de ServicioKardexValorizado
// (extracto conceptual, ver §22.2 para el contrato completo de PlanOperacionInventario)
function calcularProyeccionStockActualizada(
  productoActual: Product,
  almacenId: string,
  deltaCapas: number, // + para entrada, − para salida/consumo
): Product {
  const actual = productoActual.stockPorAlmacen?.[almacenId] ?? 0;
  return {
    ...productoActual,
    stockPorAlmacen: { ...productoActual.stockPorAlmacen, [almacenId]: actual + deltaCapas },
  };
}
```

#### Función central de reconciliación

```ts
// DISEÑO PROPUESTO — gestion-inventario/utilidades/reconciliacionStockInventario.ts

export interface ResultadoReconciliacionStock {
  productoId: string;
  almacenId: string;
  cantidadSegunCapas: number;
  cantidadSegunProyeccion: number;
  diferencia: number;
  esInconsistenciaCritica: boolean;
}

/**
 * Corrección obligatoria (cuarta pasada): la regla unilateral "crítica solo si diferencia > 0"
 * asumía que únicamente la proyección podía "adelantarse" a las capas. Eso era razonable ANTES de
 * activar (productos aún no migrados legítimamente no tienen capas), pero es falso DESPUÉS de
 * activar: con `estadoValorizacion==='activa'`, la suma de capas ES la fuente canónica (§8.1) —
 * cualquier divergencia en cualquier dirección (proyección > capas O capas > proyección) es una
 * inconsistencia, nunca solo una de las dos direcciones.
 */
export function reconciliarProyeccionStockInventario(
  empresaId: string,
  productoId: string,
  almacenId: string,
): ResultadoReconciliacionStock {
  const cantidadSegunCapas = redondearAPrecision(
    sumarCapasDisponibles(empresaId, productoId, almacenId), PRECISION_CANTIDAD_UNIDAD_MINIMA,
  ); // Σ cantidadDisponible, estado='disponible' — normalizada con la política central de precisión (§17.3), nunca un epsilon local
  const cantidadSegunProyeccion = redondearAPrecision(
    obtenerStockPorAlmacen(empresaId, productoId, almacenId), PRECISION_CANTIDAD_UNIDAD_MINIMA,
  ); // Product.stockPorAlmacen[almacenId]
  const diferencia = cantidadSegunProyeccion - cantidadSegunCapas;

  const activa = esValorizacionActiva(Configuration.inventory.estadoValorizacion); // 'activa' o 'suspendida_por_inconsistencia' (§24.1ter)
  return {
    productoId, almacenId, cantidadSegunCapas, cantidadSegunProyeccion, diferencia,
    // Después de activar: CUALQUIER diferencia distinta de cero, en cualquier dirección, es crítica.
    // Antes de activar: nunca es crítica (aún no existe una fuente canónica de capas que comparar).
    esInconsistenciaCritica: activa && diferencia !== 0,
  };
}

// Reconstrucción: SIEMPRE en una única dirección.
export function reconstruirProyeccionDesdeCapas(empresaId: string, productoId: string, almacenId: string): void {
  const cantidadSegunCapas = sumarCapasDisponibles(empresaId, productoId, almacenId);
  actualizarStockPorAlmacen(empresaId, productoId, almacenId, cantidadSegunCapas);
  // PROHIBIDO: la función inversa (crear/ajustar capas a partir de un stockPorAlmacen leído) no existe.
  // Un contador agregado sin evidencia de capa NUNCA se convierte en una capa inventada.
}
```

`reconciliarProyeccionStockInventario` se invoca: (a) como verificación previa dentro de `ServicioKardexValorizado.registrarSalidaValorizada` cuando `esInconsistenciaCritica` — en ese caso **bloquea la nueva operación** hasta que un administrador revise la discrepancia (no se "corrige sola" silenciosamente); (b) como reporte periódico opcional, fuera del camino crítico de una venta.

#### Proyecciones derivadas del CC (corrección del mismo principio y del bloqueante de cantidad ambigua)

**Corrección obligatoria (cuarta pasada)**: la versión anterior usaba `cantidadRecibida` como fuente genérica para poblar `LineaNotaIngreso.cantidad`, sin distinguir "lo que el documento declara" de "lo que efectivamente ya se ingresó a Inventario". Se corrigen los cuatro conceptos por separado — ninguno sustituye a otro:

| Cantidad | Vive en | Significado |
|---|---|---|
| `cantidadDocumentadaInventariable` | `LineaCompra` (renombra el uso de `cantidadRecibida` para líneas inventariables — snapshot de lo que el CC declara, en unidad mínima, ya convertido con `factorConversionAplicado`, §15) | Lo que el documento de compra dice que corresponde a esta línea |
| `cantidadIngresadaInventario` | `LineaCompra` (ya existente, activada como proyección derivada) | Lo que ya se confirmó vía NI activas relacionadas a este CC |
| `cantidadPendienteInventario` | `LineaCompra` (ya existente, activada como proyección derivada) | `cantidadDocumentadaInventariable − cantidadIngresadaInventario` |
| `cantidadConfirmadaNI` | `LineaNotaIngreso.cantidad` (ya existente) | Lo que una NI específica confirma — nunca mayor que `cantidadPendienteInventario` del CC al momento de generarla |

Fórmula del MVP (una única NI completa activa por CC, decisión 3.2 — diseñada para no romper si en el futuro se permite 1:N):

```ts
// DISEÑO PROPUESTO — compras/logica/reglasCompras.ts (función nueva en el archivo ya existente)

export function recalcularProyeccionIngresoCC(
  cc: ComprobanteCompra,
  notasIngresoRelacionadas: NotaIngreso[], // ya filtradas por cc.id vía origen.comprobanteCompraId
): Pick<LineaCompra, 'cantidadIngresadaInventario' | 'cantidadPendienteInventario'>[] & { estadoInventario: EstadoInventarioCC } {
  /* DISEÑO PROPUESTO — recorre TODAS las líneas de TODAS las NI ACTIVAS (estado==='Generada';
     una NI 'Anulada' o un 'Borrador' no confirmado NO cuenta) relacionadas a este CC, y recalcula
     desde cero (nunca suma un delta sobre el valor previo):

       cantidadIngresadaInventario(líneaCC) = Σ LineaNotaIngreso.cantidad de NI activas cuyo
         lineaOrigenId === líneaCC.id
       cantidadPendienteInventario(líneaCC) = líneaCC.cantidadDocumentadaInventariable
         − cantidadIngresadaInventario(líneaCC)

     Ejecutar esta función dos veces con el mismo estado de documentos produce exactamente el
     mismo resultado (idempotente por construcción) — nunca depende de cuántas veces se llamó
     antes. La fórmula ya soporta N NI futuras sin cambiar de forma: hoy el MVP simplemente
     bloquea (§14.3, puedeGenerarNIDesdeCC) que exista una segunda NI activa mientras haya una
     con estado==='Generada', por lo que cantidadIngresadaInventario en la práctica solo refleja
     una NI a la vez — pero la fórmula en sí ya suma sobre el arreglo completo. */
}
```

**Reglas explícitas de la fórmula**:
- La cantidad se determina primero en la presentación comercial del CC (`LineaCompra.cantidadSolicitada`), y se convierte a unidad mínima con `convertToUnidadMinima` **una sola vez**, al confirmar la línea — el resultado se persiste en `cantidadDocumentadaInventariable` (snapshot, §10.0), nunca se reconvierte después.
- `cantidadConfirmadaNI` de una NI nueva nunca puede superar `cantidadPendienteInventario` de la línea de CC en el momento de generarla — validado en `prepararOperacionInventario` para el tipo `nota_ingreso`, no solo en la UI.
- Anular una NI activa **recalcula** `cantidadIngresadaInventario`/`cantidadPendienteInventario` desde las NI activas restantes (nunca resta un delta a mano) — si la anulación deja el CC sin ninguna NI activa, `cantidadPendienteInventario` vuelve a ser igual a `cantidadDocumentadaInventariable`.
- En el MVP, `puedeGenerarNIDesdeCC` (§14.3) bloquea una segunda NI mientras exista una con `estado !== 'Anulada'` — habilitar 1:N en el futuro es cambiar esa función de validación, no el modelo ni la fórmula anterior.

Esta función se invoca al final de cada operación que confirma o anula una NI relacionada a un CC (dentro de la misma unidad de trabajo, §22) — nunca se actualiza el contador "a mano" desde `generarNIEnInventario`, `anularNIEnInventario`, ni ningún otro punto disperso.

---

## 9. Modelo de datos propuesto

### 9.1 Alternativas evaluadas para representar el costo

**Alternativa A — Extender `MovimientoStock` con campos monetarios** (`costoUnitario`, `valorMovimiento`, `moneda`, `tipoCambio`, `capaConsumidaId`, etc. directamente en el tipo existente).

**Alternativa B — Mantener `MovimientoStock` cuantitativo y crear `CapaCostoInventario` + `ConsumoCapaCostoInventario` como entidades separadas.**

| Criterio | Alternativa A (extender) | Alternativa B (separar) |
|---|---|---|
| Trazabilidad | Un movimiento de salida solo puede tener un valor de costo si se asume una sola capa consumida — pero una salida real puede tocar 2+ capas (ver ejemplo obligatorio del prompt: 10@10 + 2@12) | Cada capa consumida queda como una fila propia en `ConsumoCapaCostoInventario`, con su propio costo — no hay pérdida de información |
| Normalización | `MovimientoStock` pasaría a ser una tabla con campos que a veces aplican (entrada) y a veces no (transferencia sin costo propio) — mezcla conceptos | `MovimientoStock` sigue siendo homogéneo: siempre "qué pasó físicamente". Costo vive donde corresponde |
| Capacidad de una salida de consumir varias capas | ❌ Requeriría un array embebido dentro de `MovimientoStock`, rompiendo la forma actual (objeto plano, serializado 1:1 a localStorage) | ✅ Modelado nativo: N filas de `ConsumoCapaCostoInventario` por 1 `MovimientoStock` |
| Anulaciones | Revertir un movimiento requeriría reconstruir qué capas tocó desde un array embebido | Reversar es: leer `ConsumoCapaCostoInventario` por `movimientoSalidaId`, restaurar cada capa referenciada — consulta directa, sin parsear estructuras anidadas |
| Transferencias | El campo de costo de un movimiento de transferencia tendría que representar "la capa que se movió", pero una transferencia también puede mover cantidad de varias capas | Igual que una salida: se generan N `ConsumoCapaCostoInventario` (con motivo `TRANSFERENCIA`) + N `CapaCostoInventario` nuevas en destino |
| Consultas (valor de stock, costo de siguiente salida) | Requiere escanear todos los movimientos y reconstruir el estado de "capas vigentes" en cada consulta (no hay tabla de capas) | Consulta directa: `CapaCostoInventario` filtrado por `estado='disponible'` — sin recalcular desde el historial completo |
| Migración de datos existentes | Los movimientos históricos (sin costo) tendrían campos monetarios `undefined`, mezclados con los nuevos que sí los tienen — ambigüedad de "esquema mixto" | Los movimientos históricos simplemente no tienen `CapaCostoInventario` asociada — no hay ambigüedad de esquema, solo ausencia de dato relacionado |
| Mantenimiento | Cualquier cambio al modelo de costeo (ej. agregar landed cost en el futuro) obliga a tocar el tipo `MovimientoStock`, usado en decenas de consumidores no relacionados a costo (transferencias, reportes de cantidad, etc.) | Cambios al modelo de costeo quedan aislados en `CapaCostoInventario`/`ConsumoCapaCostoInventario`, sin tocar el tipo que ya consumen decenas de archivos |

**Decisión: Alternativa B.** `MovimientoStock` se extiende solo con campos **relacionales/estructurales** (no monetarios) necesarios para idempotencia y trazabilidad documental (ver §10.6) — sigue siendo, en espíritu, "lo que pasó físicamente". El valor económico vive exclusivamente en las dos entidades nuevas.

### 9.2 `CapaCostoInventario` (nueva)

```ts
// DISEÑO PROPUESTO — gestion-inventario/modelos/CapaCostoInventario.ts

export type EstadoCapaCosto = 'disponible' | 'agotada' | 'revertida';

export type ProcedenciaCapaCosto =
  | 'compra'            // vía NotaIngreso ligada a ComprobanteCompra
  | 'ajuste'            // ajuste positivo manual
  | 'importacion'       // importación de stock (sumatoria o inicial)
  | 'devolucion_cliente'// NC con retorno físico
  | 'transferencia'     // capa creada en almacén destino por una transferencia
  | 'migracion_inicial';// valorización inicial de stock preexistente (§24)

export interface CapaCostoInventario {
  id: string;
  /** Aislamiento multiempresa explícito en el dato — nunca se infiere solo del namespace de localStorage (ver §6). */
  empresaId: string;
  establecimientoId: string;
  productoId: string;
  almacenId: string;

  /** FK al MovimientoStock (tipo ENTRADA) que originó esta capa. 1:1. */
  movimientoEntradaId: string;

  tipoDocumentoOrigen: 'nota_ingreso' | 'ajuste' | 'importacion' | 'devolucion_cliente' | 'transferencia' | 'migracion';
  documentoOrigenId: string;      // id estructurado: NotaIngreso.id, id de ajuste, id de lote de importación, etc.
  lineaOrigenId?: string;         // id de LineaNotaIngreso / línea de ajuste, cuando aplica

  /** Si esta capa nació de una transferencia, referencia a la capa de origen (conserva procedencia, nunca revaloriza). */
  capaOrigenId?: string;

  // --- Nivel comercial: snapshot de la presentación tal como se compró (ausente si la entrada ya nació en unidad mínima, ej. un ajuste manual) ---
  cantidadComercialOriginal?: number;       // cantidad en la presentación comprada (ej. 2 cajas)
  costoUnitarioComercialOriginal?: number;  // costo por unidad de presentación, en moneda original (ej. 120 por caja)
  factorConversionAplicado?: number;        // snapshot histórico del factor usado — nunca reconsultado (§15)

  // --- Nivel unidad mínima: lo que efectivamente gestiona el Kardex ---
  cantidadInicial: number;        // cantidad en unidad mínima con la que nació la capa
  cantidadDisponible: number;     // remanente en unidad mínima — nunca negativo
  costoUnitarioBaseOriginal: number;   // costo por unidad mínima, en moneda original (= costoUnitarioComercialOriginal / factorConversionAplicado, cuando aplica)

  // --- Nivel moneda base: lo que efectivamente valoriza el Kardex ---
  /** Ver política de precisión en §17. Nunca redondeado a decimalPlaces de la moneda. */
  costoUnitarioBaseMonedaBase: number;
  /** Fuente de verdad del valor total de la capa en moneda original — no se deriva multiplicando en cada lectura. */
  valorValorizableOriginal: number;
  /** Fuente de verdad del valor total de la capa en moneda base — no se deriva multiplicando en cada lectura. */
  valorValorizableMonedaBase: number;

  monedaBase: string;             // código de la moneda base de la empresa al momento de crear la capa
  monedaOriginal: string;         // moneda del documento de origen
  tipoCambioAplicado: number;     // snapshot histórico — nunca recalculado
  fechaTipoCambio: string;        // fecha/referencia del TC usado

  fechaEntrada: string;           // determina el orden FIFO dentro del almacén
  estado: EstadoCapaCosto;
  procedencia: ProcedenciaCapaCosto;

  usuario: string;
  fechaCreacion: string;
}
```

**Por qué el snapshot comercial vive también en la capa, no solo en `LineaNotaIngreso`**: una consulta de trazabilidad o de reporte no debería necesitar un `join` hacia el documento de origen para explicar "de qué presentación salió este costo por unidad mínima" — la capa queda autocontenida. Esto es lo mismo que exige la corrección del §8 (snapshot de naturaleza inventariable): ningún dato histórico depende de reconsultar otra entidad que pudo cambiar después.

### 9.3 `ConsumoCapaCostoInventario` (nueva)

```ts
// DISEÑO PROPUESTO — gestion-inventario/modelos/ConsumoCapaCostoInventario.ts

export interface ConsumoCapaCostoInventario {
  id: string;
  /** Aislamiento multiempresa explícito — igual criterio que `CapaCostoInventario.empresaId` (§6). */
  empresaId: string;

  /** FK al MovimientoStock (tipo SALIDA) que generó este consumo. Varias filas pueden compartir el mismo movimientoSalidaId. */
  movimientoSalidaId: string;
  /** Línea del documento de salida (venta, NS, NC) que originó este consumo, cuando aplica. */
  lineaDocumentoSalidaId?: string;

  capaId: string;
  cantidadConsumida: number;      // unidad mínima, > 0

  /** Snapshot del costo de la capa al momento del consumo (inmutable aunque la capa cambie de estado luego). */
  costoUnitarioBaseMonedaBase: number;
  valorConsumidoMonedaBase: number;    // redondeado a decimalPlaces de monedaBase (ver política de reconciliación §17)
  monedaBase: string;

  fecha: string;
  estado: 'confirmado' | 'revertido';
  consumoReversoDeId?: string;    // si esta fila es la reversión de otra
}
```

### 9.4 `ValorizacionInicialInventario` / `DetalleValorizacionInicial` (migración, nueva — ver §24)

```ts
// DISEÑO PROPUESTO — gestion-inventario/modelos/ValorizacionInicialInventario.ts

export type EstadoValorizacionInicialInventario = 'en_revision' | 'confirmado' | 'cancelado';
export type OrigenPropuestaCosto = 'precioCompra' | 'ultimoCostoDocumental' | 'manual' | 'sin_propuesta';

export interface DetalleValorizacionInicial {
  productoId: string;
  almacenId: string;
  cantidadDetectada: number;
  costoPropuesto: number;
  origenPropuesta: OrigenPropuestaCosto;
  costoConfirmado?: number;
  confirmado: boolean;
  /** Poblado ÚNICAMENTE después de ejecutar la transición activando→activa (§24.1bis.3) — nunca antes. El gate previo a la activación (§24.1bis) NO exige este campo; verifica que el detalle sea valorizable, no que la capa ya exista. */
  capaGeneradaId?: string;
  /**
   * true si, mientras el lote estaba en 'en_preparacion'/'pendiente_costos', ocurrió una
   * mutación cuantitativa real sobre este producto+almacén (venta, ajuste, NI) — invalida la
   * confirmación previa y bloquea la transición a 'validada' hasta que el usuario revise de
   * nuevo (§24.1ter, invalidarDetalleSiAfectado). Nunca se confirma una propuesta basada en
   * stock desactualizado.
   */
  requiereRecalculo: boolean;
}

export interface ValorizacionInicialInventario {
  id: string;
  /** Toda la operación de migración es por empresa — nunca puede mezclar detalles de dos empresas en el mismo lote. */
  empresaId: string;
  establecimientoId?: string;
  fechaActivacion: string;
  usuario: string;
  estado: EstadoValorizacionInicialInventario;
  detalles: DetalleValorizacionInicial[];
}
```

### 9.5 `OperacionIdempotenteInventario` (ledger de idempotencia, nueva — corregida, ver §21)

**Corrección obligatoria respecto a la versión anterior**: un `resultadoId: string` singular y un modelo sin estado eran insuficientes — no permitían distinguir "en curso" de "confirmada", ni detectar un reintento con datos distintos bajo la misma clave, ni relacionar la operación con su `TransaccionInventario` (§9.6). Se corrige aquí:

```ts
// DISEÑO PROPUESTO — gestion-inventario/modelos/OperacionIdempotenteInventario.ts

export type TipoOperacionIdempotenteInventario =
  | 'ni_automatica' | 'ni_confirmacion'
  | 'ajuste_positivo' | 'ajuste_negativo'
  | 'nota_salida' | 'venta_salida'
  | 'importacion' | 'transferencia'
  | 'anulacion' | 'reverso'
  | 'devolucion_cliente' | 'devolucion_proveedor'
  | 'valorizacion_inicial';

export type EstadoOperacionIdempotenteInventario = 'preparada' | 'confirmada' | 'fallida' | 'revertida';

export interface OperacionIdempotenteInventario {
  id: string;
  empresaId: string;
  /** Fórmula determinística por tipo de operación — ver matriz completa en §21.4. La unicidad real, consultada y persistida, es SIEMPRE (empresaId, clave), nunca `clave` sola. */
  clave: string;
  tipoOperacion: TipoOperacionIdempotenteInventario;
  estado: EstadoOperacionIdempotenteInventario;

  /**
   * Hash determinístico (ej. SHA-256 sobre una serialización canónica) de los
   * datos de entrada que originaron esta operación (cantidades, costos,
   * documentoOrigenId, línea, etc.). Permite distinguir un reintento legítimo
   * (mismo hash → devolver el resultado previo) de un conflicto de idempotencia
   * (hash distinto bajo la misma clave → error, nunca se reprocesa en silencio).
   */
  hashEntrada: string;

  referenciaDocumentoId: string;
  referenciaDocumentoTipo: 'comprobante_compra' | 'nota_ingreso' | 'nota_salida' | 'venta' | 'ajuste' | 'importacion' | 'transferencia' | 'valorizacion_inicial';

  /** Todo lo que esta operación generó — un movimiento de entrada puede producir 1 movimiento + 1 capa; una salida puede producir 1 movimiento + N consumos. Nunca un único id escalar. */
  resultadoIds: string[];

  /** FK a la transacción del diario que ejecutó esta operación (§9.6) — permite auditar/recuperar el detalle completo de las escrituras. */
  transaccionInventarioId: string;

  fechaCreacion: string;
  fechaConfirmacion?: string;
  error?: string;
}
```

### 9.6 `TransaccionInventario` (diario transaccional recuperable, nueva — ver §22)

```ts
// DISEÑO PROPUESTO — gestion-inventario/modelos/TransaccionInventario.ts

export type EstadoTransaccionInventario = 'preparada' | 'confirmando' | 'confirmada' | 'revertida' | 'fallida';

export interface TransaccionInventario {
  id: string;
  empresaId: string;
  tipoOperacion: TipoOperacionIdempotenteInventario;
  claveIdempotencia: string;
  estado: EstadoTransaccionInventario;

  /** Hash de los datos de entrada — igual valor que `OperacionIdempotenteInventario.hashEntrada` para la misma operación. */
  hashEntrada: string;

  /** Claves de `localStorage` (o futuras filas de tabla) que esta transacción va a escribir — declaradas ANTES de escribir, para poder detectar en la recuperación qué faltó. */
  clavesAfectadas: string[];

  /** Snapshot de "antes" de cada clave afectada — permite reconstruir o verificar en la recuperación. */
  datosAnteriores: Record<string, unknown>;
  /** El plan completo ya calculado (`PlanOperacionInventario`, §12.2) — lo único que `confirmarOperacionInventario` ejecuta, sin recalcular reglas. */
  datosPropuestos: Record<string, unknown>;

  resultadoIds: string[];
  fechaPreparacion: string;
  fechaConfirmacion?: string;
  usuario: string;
  error?: string;
}
```

Ver el flujo completo de 9 pasos y la estrategia de recuperación en §22.2/§22.3.

### 9.6bis `EstadoVersionInventario` (control optimista de concurrencia, nueva — corrección obligatoria, ver §22.1bis)

**Corrección obligatoria (cuarta pasada)**: el diario transaccional (§22) hace recuperable una interrupción, pero por sí solo **no impide** que dos pestañas del mismo navegador preparen sendos planes sobre las mismas capas al mismo tiempo — cada plan calculado en `prepararOperacionInventario` podría quedar obsoleto si otra pestaña ya escribió antes de que este confirme. Se agrega una versión monotónica por empresa, obligatoria (no un mecanismo opcional):

```ts
// DISEÑO PROPUESTO — gestion-inventario/modelos/EstadoVersionInventario.ts

export interface EstadoVersionInventario {
  empresaId: string;
  versionInventario: number;      // monotónica, se incrementa en cada operación confirmada (§12.3, paso 9)
  fechaActualizacion: string;
  ultimaTransaccionId?: string;
}
```

`PlanOperacionInventario` (§12.2) declara `versionEsperada`/`hashEstadoBase` — la versión leída al iniciar la preparación. `confirmarOperacionInventario` (§12.3, paso 4) relee la versión vigente antes de escribir cualquier dato de dominio: si no coincide, aborta sin escribir, marca la transacción `'fallida'`, libera la reserva de idempotencia (vuelve a `'preparada'`, disponible para que el llamador recalcule el plan con datos frescos) y devuelve un error de conflicto de versión — nunca aplica escrituras calculadas sobre un estado que ya cambió (invariante 28, §32).

### 9.7 `LoteImportacionValorizada` (importación de stock con costo, nueva — ver §13.5)

```ts
// DISEÑO PROPUESTO — gestion-inventario/modelos/LoteImportacionValorizada.ts

export type EstadoLoteImportacionValorizada = 'previsualizado' | 'confirmado' | 'cancelado';

export interface LoteImportacionValorizada {
  id: string;
  empresaId: string;
  establecimientoId: string;
  fecha: string;
  usuario: string;
  estado: EstadoLoteImportacionValorizada;
  nombreArchivo: string;
  totalFilas: number;
  filasConCostoPendiente: number;
}
```

Este lote es el ancla de idempotencia de una importación (`IMPORT-${loteImportacionId}`, §21) y el `documentoOrigenId`/`tipoDocumentoOrigen: 'importacion'` que queda registrado en cada `CapaCostoInventario` generada por sus filas (§13.5).

### 9.8 Matriz de entidades propuestas

| Entidad propuesta | Propósito | Campos principales | Identificadores | Relaciones | Fuente de verdad |
|---|---|---|---|---|---|
| `CapaCostoInventario` | Saldo valorizado de una entrada | empresaId, cantidadDisponible, costoUnitarioBaseMonedaBase, valorValorizableMonedaBase, monedaOriginal, tipoCambioAplicado | `id` | `movimientoEntradaId` → `MovimientoStock`; `capaOrigenId` → self (transferencias) | Costo/valor de una entrada de stock |
| `ConsumoCapaCostoInventario` | Relación N:M entre una salida y las capas que consume | empresaId, cantidadConsumida, costoUnitarioBaseMonedaBase (snapshot), valorConsumidoMonedaBase | `id` | `movimientoSalidaId` → `MovimientoStock`; `capaId` → `CapaCostoInventario` | Costo de una salida/venta |
| `ValorizacionInicialInventario` | Proceso de activación de valorización sobre stock existente | empresaId, detalles[], estado | `id` | `detalles[].capaGeneradaId` → `CapaCostoInventario` | Auditoría del proceso de migración |
| `OperacionIdempotenteInventario` | Ledger de claves de idempotencia con estado y hash | empresaId, clave, estado, hashEntrada, resultadoIds[], transaccionInventarioId | `empresaId + clave` (única compuesta) | `transaccionInventarioId` → `TransaccionInventario` | Prevención de doble ejecución y de conflicto de reintento |
| `TransaccionInventario` | Diario transaccional recuperable — unidad de consistencia lógica sobre `localStorage` | empresaId, estado, clavesAfectadas[], datosAnteriores, datosPropuestos, resultadoIds[] | `id` | 1:1 con la `OperacionIdempotenteInventario` que la originó | Recuperación tras interrupción (§22) |
| `LoteImportacionValorizada` | Ancla de idempotencia y trazabilidad de una importación de stock con costo | empresaId, establecimientoId, estado, totalFilas | `id` | Origen de las `CapaCostoInventario` generadas por sus filas | Trazabilidad de importación |

---

## 10. Cambios por modelo existente

### 10.0 Corrección obligatoria: principio general de snapshot histórico inmutable

El documento original trataba el snapshot de "naturaleza inventariable" y el de "factor de conversión" como dos casos aislados. Se generaliza aquí a **todo** dato que un documento confirmado deriva del catálogo/configuración vigente en el momento: una vez confirmado, ese dato se persiste como snapshot en la línea/capa correspondiente y **nunca** se vuelve a derivar leyendo el catálogo/configuración actual. La tabla siguiente es el checklist completo pedido en la corrección:

| Dato | Dónde se fija el snapshot | Se calcula | Nunca se recalcula leyendo |
|---|---|---|---|
| Naturaleza inventariable (`esInventariable`) | `LineaCompra.esInventariable` (§10.3) | Al confirmar el CC | `Product.tipoExistencia` vigente |
| Factor de conversión | `LineaCompra.factorConversionAplicado`, `CapaCostoInventario.factorConversionAplicado` (§9.2, §10.3) | Al confirmar la línea/capa | `Product.unidadesMedidaAdicionales[].factorConversion` vigente |
| Unidad comercial | `LineaCompra.unidadMedidaCodigo`, `CapaCostoInventario.cantidadComercialOriginal` (§9.2) | Al confirmar la línea/capa | Presentaciones vigentes del producto |
| Unidad mínima | `MovimientoStock.cantidad`, `CapaCostoInventario.cantidadInicial` (ya existente/§9.2) | Al generar el movimiento | `Product.unidad` vigente |
| Afectación tributaria (`tipoAfectacion`/`tasaIgv`) | `LineaCompra.tipoAfectacion`/`tasaIgv` (ya existente) | Al confirmar la línea | `Product.impuesto`/`Tax` vigente |
| Recuperabilidad aplicada | `LineaCompra.tratamientoImpuestoAplicado` (nuevo, §10.12/§16) | Al confirmar la línea | `Configuration`/`TratamientoImpuestoCompra` vigente |
| Moneda | `CapaCostoInventario.monedaOriginal`/`monedaBase` (§9.2) | Al crear la capa | `Company.monedaBase` vigente |
| Tipo de cambio | `CapaCostoInventario.tipoCambioAplicado`/`fechaTipoCambio` (§9.2) | Al crear la capa | `currencyManager`/tasa vigente |
| Costo valorizable | `CapaCostoInventario.costoUnitarioBaseOriginal`/`costoUnitarioBaseMonedaBase`/`valorValorizableOriginal`/`valorValorizableMonedaBase` (§9.2) | Al crear la capa | Recálculo con costos/tasas actuales |
| Almacén utilizado | `MovimientoStock.almacenId`, `CapaCostoInventario.almacenId` (ya existente/§9.2) | Al generar el movimiento | Reasignación posterior de almacenes |
| Presentación comercial | `LineaCompra.unidadesDisponibles` snapshot vía `factorConversionAplicado`/`costoUnitarioComercialOriginal` (§9.2, §10.3) | Al confirmar la línea/capa | Catálogo de presentaciones vigente |

Para documentos históricos que no tengan alguno de estos campos (creados antes de este diseño): la inferencia ocurre **una sola vez**, en un paso de migración controlado (Etapa 0 para naturaleza/factor; Etapa 2/24 para costo), el resultado se persiste, y se registra explícitamente el origen de la inferencia (ej. `origenInferencia: 'migracion_saneamiento'`) — nunca se vuelve a inferir en cada lectura posterior. Ver invariante 22, §32.

### 10.1 `Product` (`catalogo-articulos/models/types.ts:12-60`)

| Campo | Acción | Tipo propuesto | Motivo | Migración | Consumidores afectados |
|---|---|---|---|---|---|
| `precioCompra` | Deprecar (no eliminar aún) | sin cambio de tipo, se agrega comentario `@deprecated` | Ver §25 — deja de ser costo oficial | Ninguna inmediata; se retira cuando `getConsumidores() === 0` | `servicioOrdenCompra.ts:97,122`, `FormularioNotaIngreso.tsx:399`, `useAvailableProducts.tsx`, `ProductSelector.tsx`, `useLineasCompra.ts:71` |
| `porcentajeGanancia` | Sin cambio en este alcance | — | No forma parte del Kardex valorizado; su redefinición (o eliminación) es una decisión de UX de Precios, fuera de este diseño | — | — |
| — | **Nuevo** (función pura, no campo) | `esProductoInventariable(product: Product): boolean` en `shared/inventory/` | Reemplaza 4+ chequeos ad-hoc de `tipoExistencia !== 'SERVICIOS'` dispersos (`FormularioNotaIngreso.tsx:373`, `FormularioNotaSalida.tsx:318`, `TransferModal.tsx:151`, `useProductSearch.tsx:38`) | Ninguna — es una función derivada, no persiste dato nuevo | Todo punto que hoy repite la condición inline |

### 10.2 `AdditionalUnitMeasure` (`catalogo-articulos/models/types.ts:3-10`)

Sin cambios. El factor de conversión ya existe (`factorConversion: number`); lo que falta no es el campo sino que **Compras→NI lo aplique** (ver §15) — eso es un cambio de flujo, no de modelo.

### 10.3 `LineaCompra` (`compras/modelos/LineaCompra.ts:21-92`)

| Campo | Acción | Tipo propuesto | Motivo | Migración | Consumidores afectados |
|---|---|---|---|---|---|
| — | **Nuevo** | `esInventariable: boolean` | Naturaleza de la línea, separada del efecto del documento (decisión 3.4) — ver fórmula en §14 | **Snapshot persistido al confirmar la línea, no recalculado en cada lectura** (corrección §8, generalización del principio de snapshot histórico): se calcula una vez con `calcularEsInventariable(linea, producto)` en el momento de registrar el CC y se guarda en el campo. Un cambio posterior en `Product.tipoExistencia` **no** altera líneas ya confirmadas. Líneas históricas (previas a este diseño, sin el campo): se infiere **una sola vez**, durante la migración de saneamiento de la Etapa 0 (§34), se persiste el resultado junto con `origenInferencia: 'migracion_saneamiento'` para que quede registrado que no es un dato capturado en el momento original — nunca se vuelve a inferir en cada lectura posterior | `SelectorModalidadInventario.tsx`, reglas de generación de NI |
| `afectaInventario` | **Redefinir semántica** (mismo campo, mismo tipo `boolean`) | sin cambio de tipo | Pasa de "asignado uniforme por documento" a `esInventariable && documentoAfectaInventario(modalidadInventario)` — fórmula, no dato libre | **Snapshot persistido al confirmar el CC**, igual criterio que `esInventariable`: se calcula una vez y no se recalcula después aunque cambie `modalidadInventario` de otro documento o el catálogo; líneas históricas no se tocan retroactivamente | `mapeadorCCaNI.ts` (filtro de líneas a incluir en NI) |
| `unidadMedidaCodigo`, `unidadesDisponibles`, `costoUnitario` | Sin cambio de tipo | — | Ya alcanzan para snapshot de presentación (ver §15) — **falta** que la línea persista el **factor aplicado** en el momento, no solo el código de unidad | — | — |
| — | **Nuevo** | `factorConversionAplicado?: number` | Snapshot del factor usado al momento de registrar la línea — nunca reconsultado (decisión 3.5) | Líneas históricas sin este campo: se asume factor `1` únicamente si `unidadMedidaCodigo === unidad mínima del producto`; si no, queda marcado como "snapshot no disponible" (ver riesgo R-08, §33) | `ServicioKardexValorizado.registrarEntradaValorizada` (conversión a unidad mínima) |
| — | **Nuevo** | `cantidadDocumentadaInventariable: number` | Snapshot en unidad mínima de lo que el CC declara para esta línea (reemplaza el uso ambiguo de `cantidadRecibida` como fuente de NI, §8.1) — se calcula una sola vez con `convertToUnidadMinima` al confirmar la línea | Líneas históricas: se infiere de `cantidadRecibida` una sola vez en la Etapa 0, con `origenInferencia` registrado | `recalcularProyeccionIngresoCC`, `mapeadorCCaNI.ts` |
| `cantidadIngresadaInventario`, `cantidadPendienteInventario` | **Activar como proyección derivada** (mismo tipo, hoy contadores muertos) | sin cambio de tipo | **No se incrementan/decrementan manualmente desde ningún servicio** — se recalculan íntegramente y de forma idempotente mediante `recalcularProyeccionIngresoCC` (§8.1) cada vez que cambia una NI relacionada, siempre como `cantidadDocumentadaInventariable − Σ cantidadConfirmadaNI de NI activas`; dos ejecuciones consecutivas sobre el mismo estado producen el mismo resultado | Sin migración — se corrige hacia adelante | `calcularEstadoInventarioCC`/`OC` (activados, ver §31), `recalcularProyeccionIngresoCC` |

### 10.4 `ComprobanteCompra` (`compras/modelos/ComprobanteCompra.ts`)

| Campo | Acción | Tipo propuesto | Motivo | Migración | Consumidores afectados |
|---|---|---|---|---|---|
| `notasIngresoRelacionadas` | **Poblar** (mismo tipo `string[]`, ya soporta 1:N) | sin cambio de tipo | Hoy declarado y nunca escrito con id nuevo — se activa la escritura real | CC históricos quedan con el array vacío (correcto: nunca tuvieron NI real) | `calcularEstadoPrincipalCC`, `motivoBloqueoAnulacionCC` |
| `movimientosInventarioRelacionados` | **Poblar** | sin cambio de tipo | Igual que arriba | Igual que arriba | Reportes de trazabilidad |
| `estadoInventario` | **Corregir derivación** (mismo tipo `EstadoInventarioCC`, ya tiene los 5 valores necesarios) | sin cambio de tipo | Se reemplaza `derivarEstadoInventarioCC` (simplificada) por la lógica ya existente en `calcularEstadoInventarioCC` (`calcularEstadosCompra.ts:43-60`, hoy huérfana) alimentada con datos reales | CC históricos: recalcular en lectura, no persistir retroactivamente un valor distinto al guardado | UI de listado/detalle de CC |

### 10.5 `NotaIngreso` / `LineaNotaIngreso` (`gestion-inventario/models/notaIngreso.types.ts`)

| Campo | Acción | Tipo propuesto | Motivo | Migración | Consumidores afectados |
|---|---|---|---|---|---|
| — | **Nuevo** | `origen: { tipo: 'comprobante_compra' \| 'ajuste' \| 'importacion' \| 'devolucion' \| 'manual'; comprobanteCompraId?: string; automatica: boolean }` | Reemplaza el texto libre `documentoOrigen`/`numeroDocumentoOrigen` como relación técnica real (decisión: no usar texto libre como relación) | NI históricas: `origen = { tipo: 'manual', automatica: false }` por defecto (no se puede reconstruir el origen real retroactivamente si no estaba estructurado) | `ServicioKardexValorizado`, reglas de bloqueo de anulación de CC |
| `documentoOrigen`, `numeroDocumentoOrigen` | **Mantener sin cambio** (compatibilidad de impresión/UI, texto libre) | sin cambio de tipo | Se conservan como campos de presentación/impresión, dejan de usarse como relación técnica | — | Plantillas de impresión de NI |
| `LineaNotaIngreso` | **Nuevo campo** | `lineaOrigenId?: string` (referencia a `LineaCompra.id`), `factorConversionAplicado?: number`, `cantidadComercialOriginal?: number`, `unidadComercialOriginal?: string` | Snapshot completo de la conversión aplicada (decisión 3.5) — permite reconstruir "2 cajas de 12 a S/120" sin recalcular | NI históricas: campos `undefined` (sin snapshot disponible, se documenta como limitación de migración) | `ServicioKardexValorizado.registrarEntradaValorizada` |
| `costoUnitario` | Sin cambio de tipo, **se conecta** | — | Hoy se descarta al generar el movimiento (`notaIngreso.service.ts:89-97` no lo incluye en `StockAdjustmentData`) — pasa a alimentar `CapaCostoInventario.costoUnitarioBaseOriginal` | — | `ServicioKardexValorizado` |

### 10.6 `MovimientoStock` (`gestion-inventario/models/inventory.types.ts:35-67`)

Solo campos **estructurales/relacionales**, ningún campo monetario (ver decisión §9.1):

| Campo | Acción | Tipo propuesto | Motivo | Migración | Consumidores afectados |
|---|---|---|---|---|---|
| — | **Nuevo** | `empresaId?: string` | Corrección obligatoria de ámbito multiempresa (§6): la auditoría había señalado que "empresa" es solo **parcial** en `MovimientoStock` hoy (aislamiento únicamente por namespace de `localStorage`, sin campo en el dato). Como este modelo ya se está extendiendo en esta misma etapa, se cierra la brecha aquí también, no solo en las entidades nuevas | Movimientos históricos: `undefined` — el namespace de `localStorage` sigue siendo su único aislamiento (no se puede reconstruir retroactivamente); toda lectura de movimientos nuevos exige este campo | `ServicioKardexValorizado`, todo repositorio nuevo (invariante §32) |
| — | **Nuevo** | `documentoOrigenId?: string` | FK real, en paralelo al `documentoReferencia` de texto existente (no se rompe) | Movimientos históricos: `undefined`, siguen usando `documentoReferencia` (texto) para su propia trazabilidad legada | Reportes de trazabilidad estructurada |
| — | **Nuevo** | `tipoDocumentoOrigen?: 'comprobante_compra' \| 'nota_ingreso' \| 'nota_salida' \| 'ajuste' \| 'importacion' \| 'transferencia' \| 'venta' \| 'nota_credito' \| 'migracion'` | Tipo de origen estructurado | Movimientos históricos: `undefined` | Igual que arriba |
| — | **Nuevo** | `lineaOrigenId?: string` | Id de línea de origen | Movimientos históricos: `undefined` | Igual que arriba |
| — | **Nuevo** | `capaId?: string` | Para movimientos `ENTRADA`: referencia 1:1 a la `CapaCostoInventario` creada. Para `SALIDA`: **no se usa** (la relación es 1:N vía `ConsumoCapaCostoInventario.movimientoSalidaId`, no cabe en un campo escalar) | Movimientos históricos: `undefined` (no tienen capa) | `ServicioKardexValorizado` |
| — | **Nuevo** | `estado?: 'confirmado' \| 'revertido'` (default `'confirmado'` si ausente, para compatibilidad) | Necesario para reversos trazables sin editar el movimiento original (decisión 3.11) | Movimientos históricos: se asume `'confirmado'` si el campo no existe | Reglas de reverso (§20) |
| — | **Nuevo** | `movimientoReversoDeId?: string` | Referencia al movimiento que este revierte | Movimientos históricos: `undefined` | Igual que arriba |
| — | **Nuevo** | `claveIdempotencia?: string` | Ver §21 — trazabilidad cruzada con `OperacionIdempotenteInventario.clave` (que en realidad se consulta como `empresaId + clave`, ver §9.5) | Movimientos históricos: `undefined` | `ServicioKardexValorizado` |

**Justificación de por qué estos campos SÍ van en `MovimientoStock` y el costo NO**: son metadatos sobre "qué originó/revirtió este hecho físico, para qué empresa y bajo qué clave de idempotencia", no sobre "cuánto vale" — coherente con la definición del propio prompt (§6: "Movimiento de inventario... representa el hecho físico"). `empresaId` no es un dato de costo, es identidad — pertenece aquí igual que `productoId`/`almacenId`.

### 10.7 `StockAdjustmentData` (`gestion-inventario/models/inventory.types.ts:155-163`)

**Sin cambios.** Sigue siendo el contrato de `InventoryService.registerAdjustment`, que permanece como primitivo cuantitativo puro. El costo se maneja **por encima** de esta capa, en `ServicioKardexValorizado` (§12) — `StockAdjustmentData` nunca necesita saber de dinero.

### 10.8 Transferencias (`gestion-inventario/models/transferencia.types.ts`)

| Campo | Acción | Tipo propuesto | Motivo | Migración | Consumidores afectados |
|---|---|---|---|---|---|
| `id` | **Corregir generación** (mismo campo, mismo tipo `string`) | Formato con sufijo aleatorio o `crypto.randomUUID()` en vez de solo `TRF-YYYYMMDD-HHmmss` | Colisión ya documentada en auditoría previa de Transferencias — se vuelve crítico como clave de idempotencia (§21) | Transferencias históricas conservan su id actual | `OperacionIdempotenteInventario.clave` (`TRANSFER-${id}`) |
| — | **Nuevo** | `capasOrigenIds?: string[]`, `capasDestinoIds?: string[]` | Trazabilidad de qué capas se movieron (decisión 3.15) | Transferencias históricas: `undefined` (no tenían capas) | `ServicioKardexValorizado.transferirStockValorizado` |

### 10.9 Línea de comprobante de venta / `CartItem` (`comprobantes-electronicos/models/comprobante.types.ts:84-131`)

**`CartItem` no se modifica** — es estado efímero de carrito (UI), no el registro persistido de la venta. El campo nuevo de costo de venta va en la **línea persistida** del comprobante/NV (la entidad que hoy guarda `price`, `quantity`, etc. tras confirmar la venta, fuera del alcance de `CartItem`):

| Campo | Acción | Tipo propuesto | Motivo | Migración | Consumidores afectados |
|---|---|---|---|---|---|
| — | **Nuevo** (en línea persistida de venta, no en `CartItem`) | `costoVentaUnitario?: number`, `costoVentaTotal?: number`, `consumosCapaIds?: string[]` | Persistencia del costo real de venta (decisión 3.13) | Ventas históricas: `undefined` — su costo de venta **no puede reconstruirse** (ver §24, prohibición explícita de recalcular historia) | Reporte de rentabilidad |

### 10.10 `LineaNotaSalida` (`gestion-inventario/models/notaSalida.types.ts`)

| Campo | Acción | Tipo propuesto | Motivo | Migración | Consumidores afectados |
|---|---|---|---|---|---|
| — | **Nuevo** | `costoVentaUnitario?: number`, `costoVentaTotal?: number` (NS con `origen` de venta) | Igual razón que 10.9 — una NS puede ser la salida real detrás de una venta | NS históricas: `undefined` | Reporte de rentabilidad |

### 10.11 `Configuration.inventory` (`configuracion-sistema/modelos/Configuration.ts:49-61`)

| Campo | Acción | Tipo propuesto | Motivo | Migración | Consumidores afectados |
|---|---|---|---|---|---|
| `costMethod` | **Restringir en UI** (mismo tipo `'FIFO' \| 'LIFO' \| 'AVERAGE' \| 'SPECIFIC'`, sin cambio de tipo) | — | Decisión 3.12: FIFO único método oficial; las otras 3 opciones se deshabilitan en el selector, no se eliminan del tipo (evita romper configuraciones ya guardadas con esos valores, aunque nunca tuvieron motor real) | Configuraciones existentes con `'AVERAGE'` (el default actual, `useConfiguracionSistema.ts:77`) migran a `'FIFO'` explícitamente durante la activación (§24) | Selector de configuración de inventario |
| `autoUpdateCosts` | **Eliminar** (era configuración fantasma sin consumidor) | — | Ver auditoría — cero consumidores confirmados; no tiene sentido en el nuevo diseño (el costo se actualiza siempre vía capas, no hay "modo manual/automático" de costo) | Se retira en la etapa de saneamiento (§34, Etapa 0) | Ninguno (confirmado sin consumidores) |
| — | **Nuevo — corregido** | `estadoValorizacion: EstadoActivacionValorizacion` (default `'no_iniciada'`) | **Reemplaza el booleano `valorizacionActiva` de la versión anterior**, que permitía describir (incorrectamente) un "rollback" `valorizacionActiva=false` después de haber operado en modo valorizado. El nuevo campo es una máquina de estados (§31.5) sin ninguna transición de regreso desde `'activa'`/`'suspendida_por_inconsistencia'` hacia estados anteriores | Se activa manualmente al completar el proceso de migración; una vez `'activa'`, es terminal salvo transición a `'suspendida_por_inconsistencia'` (reversible solo hacia `'activa'`, nunca hacia atrás) | `ServicioKardexValorizado` (valida antes de operar vía `esValorizacionActiva(estado)`/`puedeMutarInventario(estado)`, §31.5) |
| — | **Nuevo** | `tratamientoImpuestoCompra: TratamientoImpuestoCompra` (`'excluir_recuperables' \| 'incluir_impuestos' \| 'definir_por_linea' \| 'pendiente_configuracion'`, default `'pendiente_configuracion'`) | Ver §16 (corrección obligatoria) — decide si el IGV de una línea gravada es recuperable, sin asumir un valor por defecto operativo | Empresas existentes: default `'pendiente_configuracion'` — **bloquea la transición `validada`→`activando`** hasta que el usuario elija explícitamente una de las 3 políticas reales en Configuración | `ServicioKardexValorizado`, fórmula de costo valorizable (§16), precondición de activación (§24.1) |

### 10.12 `Company` (`configuracion-sistema/modelos/Company.ts`)

**Sin cambios.** La versión anterior de este diseño proponía `Company.aplicaCreditoFiscal: boolean` con default `true` asumido — se descarta por completo (corrección §10, no era una configuración explícita, era una asunción silenciosa). El reemplazo (`Configuration.inventory.tratamientoImpuestoCompra`, sin default operativo) se documenta en §10.11.

### 10.13 Matriz de cambios por modelo (resumen)

| Modelo | Campo | Acción | Tipo propuesto | Motivo | Migración | Consumidores afectados |
|---|---|---|---|---|---|---|
| `Product` | `precioCompra` | Deprecar | sin cambio | Ver §25 | Diferida | 5 archivos (§10.1) |
| `Product` | (nueva función) `esProductoInventariable` | Nueva | `(p) => boolean` | Unifica 4+ chequeos ad-hoc | Ninguna | 4 archivos |
| `LineaCompra` | `esInventariable` | Nueva | `boolean` | Naturaleza vs. efecto | Snapshot al confirmar; históricas inferidas una sola vez en Etapa 0 con `origenInferencia` registrado | `mapeadorCCaNI.ts` |
| `LineaCompra` | `afectaInventario` | Redefinir semántica | `boolean` (mismo tipo) | Fórmula, no dato libre | Snapshot al confirmar; líneas históricas no se tocan retroactivamente | `mapeadorCCaNI.ts` |
| `LineaCompra` | `factorConversionAplicado` | Nueva | `number?` | Snapshot histórico | `undefined` en históricas | `ServicioKardexValorizado` |
| `LineaCompra` | `tratamientoImpuestoLinea` | Nueva | `'excluido' \| 'incluido'` (opcional) | Solo obligatorio cuando la empresa usa política `'definir_por_linea'` (§16) | `undefined` en históricas y en empresas con política global | `calcularCostoValorizableLinea` |
| `LineaCompra` | `tratamientoImpuestoAplicado` | Nueva | `'excluido' \| 'incluido'` | Snapshot del resultado efectivamente aplicado a la línea (independiente de la política vigente después) | `undefined` en históricas | Reportes de trazabilidad tributaria |
| `LineaCompra` | `cantidadIngresadaInventario`/`cantidadPendienteInventario` | Activar como proyección derivada | sin cambio | Contadores muertos hoy; recalculados por función central idempotente (§8.1), nunca incrementados a mano | Ninguna | Estados derivados, `recalcularProyeccionIngresoCC` |
| `ComprobanteCompra` | `notasIngresoRelacionadas`/`movimientosInventarioRelacionados` | Poblar | sin cambio | Trazabilidad real | Ninguna | Reglas de bloqueo |
| `ComprobanteCompra` | `estadoInventario` | Corregir derivación | sin cambio | Usar lógica ya existente | Recalculado en lectura | UI |
| `NotaIngreso` | `origen` | Nueva | objeto estructurado | Reemplaza texto libre como relación | Default `manual` en históricas | `ServicioKardexValorizado` |
| `LineaNotaIngreso` | `lineaOrigenId`, `factorConversionAplicado`, `cantidadComercialOriginal`, `unidadComercialOriginal` | Nuevas | varios | Snapshot de conversión | `undefined` en históricas | `ServicioKardexValorizado` |
| `MovimientoStock` | `empresaId`, `documentoOrigenId`, `tipoDocumentoOrigen`, `lineaOrigenId`, `capaId`, `estado`, `movimientoReversoDeId`, `claveIdempotencia` | Nuevas | varios | Estructural/identidad, no monetario | `undefined` en históricos | `ServicioKardexValorizado`, reversos, aislamiento multiempresa |
| `StockAdjustmentData` | — | Sin cambio | — | Permanece cuantitativo puro | — | — |
| `Transferencia` | `id` | Corregir generación | sin cambio de tipo | Evitar colisión | Sin retro-cambio | Idempotencia |
| `Transferencia` | `capasOrigenIds`/`capasDestinoIds` | Nuevas | `string[]?` | Trazabilidad de capas | `undefined` en históricas | `ServicioKardexValorizado` |
| Línea de venta persistida | `costoVentaUnitario`/`costoVentaTotal`/`consumosCapaIds` | Nuevas | varios | Costo de venta (3.13) | `undefined` en históricas — no se reconstruye | Reporte de rentabilidad |
| `LineaNotaSalida` | `costoVentaUnitario`/`costoVentaTotal` | Nuevas | `number?` | Igual razón | `undefined` en históricas | Reporte de rentabilidad |
| `Configuration.inventory` | `costMethod` | Restringir en UI | sin cambio de tipo | FIFO único oficial | Migrar `'AVERAGE'`→`'FIFO'` en activación | Selector |
| `Configuration.inventory` | `autoUpdateCosts` | Eliminar | — | Fantasma, sin consumidor | Ninguna | Ninguno |
| `Configuration.inventory` | `estadoValorizacion` | Nueva | `EstadoActivacionValorizacion` (9 estados, §31.5) | Gate de activación irreversible — reemplaza el booleano descartado | Default `'no_iniciada'` | `ServicioKardexValorizado` vía `esValorizacionActiva`/`puedeMutarInventario` |
| `Configuration.inventory` | `tratamientoImpuestoCompra` | Nueva | `TratamientoImpuestoCompra` | Falta modelo de recuperabilidad, sin asumir valor por defecto | Default `'pendiente_configuracion'` — bloquea activación | Fórmula de costo valorizable, precondición de activación |
| `Company` | — | **Sin cambios** | — | Se descarta `aplicaCreditoFiscal` (asunción silenciosa) | — | — |

**Ningún concepto queda con fuente duplicada**: cantidad comercial vive en `LineaCompra`/`LineaNotaIngreso` (snapshot), cantidad en unidad mínima vive en `MovimientoStock.cantidad` (ya existente), costo documental vive en `LineaCompra.costoUnitario` (ya existente), costo por unidad mínima vive en `CapaCostoInventario.costoUnitarioBaseMonedaBase` (nuevo, único), costo de venta vive en la línea de venta persistida (nuevo, único), valor de stock se **deriva** de `CapaCostoInventario` (nunca se persiste un total cacheado independiente).

---

## 11. Relaciones e identificadores canónicos

```
ComprobanteCompra.id
  ↔ NotaIngreso.origen.comprobanteCompraId          (FK tipada, nueva)
    ↔ MovimientoStock.documentoOrigenId = NotaIngreso.id   (FK tipada, nueva)
      ↔ CapaCostoInventario.movimientoEntradaId = MovimientoStock.id   (FK, nueva entidad)

NotaSalida.id | Comprobante.id (venta)
  ↔ MovimientoStock.documentoOrigenId                (FK tipada, nueva)
    ↔ ConsumoCapaCostoInventario.movimientoSalidaId = MovimientoStock.id  (FK, nueva entidad, 1:N)
      ↔ ConsumoCapaCostoInventario.capaId → CapaCostoInventario.id       (FK, nueva entidad)

MovimientoStock (revertido)
  ↔ MovimientoStock.movimientoReversoDeId = movimiento original.id      (FK, nuevo campo)

Transferencia.id
  ↔ MovimientoStock (SALIDA origen).documentoOrigenId = Transferencia.id
  ↔ ConsumoCapaCostoInventario (motivo TRANSFERENCIA) → capas de origen
  ↔ CapaCostoInventario (nuevas, en destino).capaOrigenId → capa de origen
  ↔ MovimientoStock (ENTRADA destino).movimientoRelacionadoId = movimiento de salida.id  (campo ya existente)
```

### 11.1 Reglas de identificadores

- **Ningún identificador de relación técnica es serie, número, nombre, código de producto, posición de arreglo o texto libre.** Todas las relaciones nuevas usan `id` (string, generado con el mismo patrón `crypto.randomUUID()`/timestamp+random ya usado en `MOV-${Date.now()}-${Math.random()...}`, `inventory.service.ts:161`).
- Los campos de texto libre existentes (`documentoReferencia`, `documentoOrigen`, `numeroDocumentoOrigen`) **se mantienen sin cambio** para impresión/presentación — pero dejan de ser la fuente de relación técnica; esa función la cumplen los nuevos campos `*Id`.
- **Cardinalidad 1:1 actual, preparada para 1:N futura**: `ComprobanteCompra.notasIngresoRelacionadas: string[]` (ya es array) — en el MVP se valida que tenga máximo 1 elemento activo (no anulado); esa validación vive en la capa de reglas de negocio (`reglasCompras.ts`), no en el tipo, por lo que levantar el límite a 1:N en el futuro **no requiere cambio de modelo**, solo cambio de regla de validación.
- **Estado activo/anulado en relaciones históricas**: cuando una NI se anula, su relación con el CC **no se borra** — el CC puede volver a generar una NI nueva (si la regla de negocio lo permite en el futuro) porque la validación de "ya tiene NI" filtra por `estado !== 'Anulada'`, no por existencia del array.

### 11.2 Clave de idempotencia por operación (ver desarrollo completo en §21)

**Corrección obligatoria**: la clave de venta se corrige respecto a la formulación original de esta sección — ver desarrollo completo y matriz de las 13 operaciones en §21.4. Resumen:

| Operación | Clave propuesta | Determinismo |
|---|---|---|
| CC → NI automática | `NI-AUTO-${comprobanteCompraId}` | Determinística — un CC solo puede tener una NI automática |
| Confirmación de NI (manual o automática) | `NI-CONFIRM-${notaIngresoId}` | Determinística |
| Venta (cualquier canal) | `VENTA-STOCK-${documentoVentaId}` (id interno persistido **antes** de mutar inventario, §21.3 — **no** un UUID generado por intento) | Determinística por documento — dos intentos del mismo documento comparten la misma clave |
| Anulación de documento | `ANULACION-${tipoDocumento}-${documentoId}` | Determinística |
| Transferencia | `TRANSFER-${transferenciaId}` (con `id` corregido, §10.8) | Determinística |
| Importación | `IMPORT-${loteImportacionId}` (nuevo id de lote, generado al iniciar la sesión de importación) | Determinística por lote |

---

## 12. Motor central de inventario

### 12.0 Corrección obligatoria: la versión anterior no era atómica

La primera versión de este diseño describía el motor central como una secuencia de 12 responsabilidades donde el paso 6 ("Registrar el movimiento — vía `InventoryService.registerAdjustment`") ocurría **antes** del paso 7 ("Crear o consumir capas"). Esto es un defecto real, no un detalle menor: `InventoryService.registerAdjustment` (`inventory.service.ts:135-193`, código ya verificado en la auditoría) **persiste de inmediato** — llama a `StockRepository.addMovement`, que hace `localStorage.setItem` de forma síncrona. Si el paso 7 fallara después (por ejemplo, no hay capas suficientes para una salida), el movimiento **ya estaría escrito** en `localStorage` sin su capa/consumo correspondiente — exactamente el tipo de inconsistencia que este diseño existe para prevenir.

**Corrección**: el motor central se divide en dos fases estrictamente separadas — **preparación pura** (sin ningún efecto secundario) y **confirmación** (la única fase que persiste, y lo hace de forma completa o no lo hace en absoluto, dentro de la unidad de trabajo y el diario transaccional de §22). Ninguna función de preparación llama jamás a `StockRepository`, `localStorage.setItem`, ni a `InventoryService.registerAdjustment` en su forma actual (que mezcla cálculo y persistencia).

### 12.1 Bloqueante obligatorio: la unidad transaccional e idempotente es el documento completo, no cada línea

**Corrección obligatoria**: la versión anterior modelaba `DatosEntradaValorizada`/`DatosSalidaValorizada` como un producto/almacén individual, lo que forzaba a los llamadores (`generarNIEnInventario`, `generarNSEnInventario`, ventas) a invocar el motor **una vez por línea** — cada línea con su propia validación, su propio plan y, en la práctica, su propia oportunidad de éxito o fallo independiente del resto del documento. Eso es incorrecto: una Nota de Ingreso con 5 líneas, un carrito de venta con 3 productos, o un ajuste con varios ítems son **un solo documento** — o se confirma completo, o no se confirma nada. Se corrige reemplazando los contratos por línea por contratos a nivel de documento, con un arreglo de líneas interno.

**Corrección obligatoria adicional (cuarta pasada): el contrato debe distinguir modo cuantitativo de modo valorizado.** La versión anterior de `DatosOperacionEntradaInventario`/`DatosOperacionSalidaInventario` exigía costo en toda línea, de forma incondicional — pero antes de `estadoValorizacion==='activa'` (§24.1ter, modo `cuantitativo_libre`/`cuantitativo_invalida_snapshot`), una NI, un ajuste o una venta deben poder aplicarse **sin** costo, exactamente como hoy. El modo no es una preferencia de UI: lo resuelve `resolverModoOperacion(estado)` (§24.1ter), nunca un parámetro que el llamador elija libremente.

```ts
// DISEÑO PROPUESTO — gestion-inventario/servicios/servicioKardexValorizado.ts

export type TipoDocumentoEntradaInventario =
  | 'nota_ingreso' | 'ajuste' | 'importacion' | 'devolucion_cliente' | 'migracion';
export type TipoDocumentoSalidaInventario =
  | 'venta' | 'nota_salida' | 'nota_credito';

export type ModoOperacionInventario = 'cuantitativo' | 'valorizado';

interface DatosOperacionInventarioBase {
  empresaId: string;
  documentoId: string;
  establecimientoId: string;
  claveIdempotencia: string;      // una sola clave para TODO el documento, no una por línea
  hashEntrada: string;            // hash sobre el documento completo (todas sus líneas), §21.1
  usuario: string;
}

/** Línea sin costo — solo modifica cantidad. Válida únicamente cuando resolverModoOperacion(estado) permite modo cuantitativo. */
export interface DatosLineaOperacionCuantitativa {
  lineaId: string;
  productoId: string;
  almacenId: string;
  cantidadUnidadMinima: number;
}

/** Línea con costo obligatorio — crea/consume capas. Única forma válida cuando estadoValorizacion==='activa'. */
export interface DatosLineaEntradaValorizada {
  lineaId: string;
  productoId: string;
  almacenId: string;

  // Nivel comercial (opcional — ausente si la entrada ya nace en unidad mínima, ej. un ajuste manual sin presentación)
  cantidadComercialOriginal?: number;
  costoUnitarioComercialOriginal?: number;  // en moneda original, por unidad de presentación
  factorConversionAplicado?: number;        // snapshot resuelto por el llamador (Compras) en el momento — nunca reconsultado después

  // Nivel unidad mínima (siempre presente)
  cantidadUnidadMinima: number;
  costoUnitarioBaseOriginal: number;        // en moneda original del documento, por unidad mínima — OBLIGATORIO, > 0
}

export interface DatosLineaSalidaValorizada {
  lineaId: string;
  productoId: string;
  cantidadUnidadMinima: number;      // total solicitado para esta línea; se distribuye por almacén según prioridad FIFO
  almacenPreferenteId?: string;      // solo cuando la línea ya viene atada a una reserva de OV con almacén fijado
}

/** Unidad transaccional e idempotente: el DOCUMENTO completo — todas sus líneas se preparan y confirman juntas. */
export interface DatosOperacionEntradaCuantitativa extends DatosOperacionInventarioBase {
  modoOperacion: 'cuantitativo';
  tipoDocumento: TipoDocumentoEntradaInventario;
  lineas: DatosLineaOperacionCuantitativa[];
}

export interface DatosOperacionEntradaInventario extends DatosOperacionInventarioBase {
  modoOperacion: 'valorizado';
  tipoDocumento: TipoDocumentoEntradaInventario;
  monedaOriginal: string;
  tipoCambioAplicado: number;        // snapshot ya resuelto por el llamador (Compras/NI) — uno solo para todo el documento
  fechaTipoCambio: string;
  lineas: DatosLineaEntradaValorizada[];
}

export interface DatosOperacionSalidaCuantitativa extends DatosOperacionInventarioBase {
  modoOperacion: 'cuantitativo';
  tipoDocumento: TipoDocumentoSalidaInventario;
  lineas: DatosLineaOperacionCuantitativa[];
}

export interface DatosOperacionSalidaInventario extends DatosOperacionInventarioBase {
  modoOperacion: 'valorizado';
  tipoDocumento: TipoDocumentoSalidaInventario;
  lineas: DatosLineaSalidaValorizada[];
}
```

**Reglas del discriminante `modoOperacion`** (§24.1ter): `prepararOperacionInventario` rechaza, antes de calcular cualquier otra cosa, una operación `'valorizado'` cuando `resolverModoOperacion(estadoValorizacion)` no es `'valorizado_exclusivo'`, y rechaza una operación `'cuantitativo'` cuando el modo resuelto no admite operar cuantitativamente (`'cuantitativo_libre'`/`'cuantitativo_invalida_snapshot'`). Esto cierra el bloqueante de "después de activar, una entrada sin capa es inválida" (invariante 24, §32) al nivel del contrato, no solo de la validación en tiempo de ejecución. Ningún llamador decide el modo: `generarNIEnInventario`, `useComprobanteActions.tsx`, etc. construyen siempre el modo que `resolverModoOperacion` devuelve para el estado vigente de la empresa en ese instante.

**Nota sobre transferencias**: `DatosTransferenciaValorizada` (§19) no necesita este rediseño — el modelo legado `Transferencia` ya es 1:1 con un solo producto por documento (`Transferencia.productoId: string`, singular, confirmado en la auditoría), así que ahí el documento **ya es** la línea; no hay una granularidad más fina que romper. Una transferencia solo existe en modo valorizado (una transferencia antes de activar es, simplemente, el `registerTransfer` cuantitativo ya existente, sin cambio).

### 12.1bis Bloqueante obligatorio: la reserva de idempotencia debe existir antes de mutar el dominio

**Corrección obligatoria (cuarta pasada)**: la versión anterior solo **verificaba** idempotencia (lectura) dentro de `prepararOperacionInventario` y recién **escribía** `OperacionIdempotenteInventario` al final de `confirmarOperacionInventario` (antiguo paso 7). Eso deja una ventana real: dos invocaciones concurrentes con la misma clave pueden ambas pasar la verificación de lectura (ninguna reservó nada todavía) y ambas construir y confirmar un plan, antes de que cualquiera escriba el ledger de idempotencia. Se corrige introduciendo una **tercera fase**, previa a la preparación pura, cuya única responsabilidad es reservar la clave:

```ts
// DISEÑO PROPUESTO — gestion-inventario/servicios/servicioKardexValorizado.ts

export type ResultadoReservaIdempotencia =
  | { resultado: 'nueva'; operacionIdempotenteId: string }
  | { resultado: 'repetida'; resultadoIds: string[] }
  | { resultado: 'conflicto'; mensaje: string }
  | { resultado: 'recuperar'; operacion: OperacionIdempotenteInventario };

/**
 * ÚNICA función que escribe ANTES de que exista un plan. No calcula ninguna regla de negocio —
 * solo determina si esta clave puede proceder, y si puede, dobla como la primera escritura real
 * de la operación (constructiva, no solo de lectura).
 */
export function reservarOperacionIdempotente(
  empresaId: string,
  clave: string,
  tipoOperacion: TipoOperacionIdempotenteInventario,
  hashEntrada: string,
): ResultadoReservaIdempotencia {
  /* DISEÑO PROPUESTO:
     1. Obtener el bloqueo cooperativo (navigator.locks si está disponible, §11.4) por
        (empresaId, clave) — libera al retornar en cualquiera de las ramas siguientes salvo 'nueva'.
     2. Buscar OperacionIdempotenteInventario por (empresaId, clave).
     3. No existe → crear una fila nueva en estado 'preparada' con este hashEntrada
        (ESCRITURA — primera de toda la operación) → { resultado: 'nueva', operacionIdempotenteId }.
     4. Existe, estado 'confirmada', mismo hashEntrada → { resultado: 'repetida', resultadoIds }.
     5. Existe, estado 'confirmada', hashEntrada distinto → { resultado: 'conflicto', mensaje }
        (ConflictoIdempotencia, §21.2 — nunca se reprocesa en silencio).
     6. Existe, estado 'preparada' (`OperacionIdempotenteInventario` — este modelo solo tiene los
        4 estados de §9.5: 'preparada'|'confirmada'|'fallida'|'revertida', nunca 'confirmando';
        ese estado pertenece únicamente a `TransaccionInventario`, §9.6) → puede significar una
        reserva huérfana (nunca llegó a existir un plan) o una `TransaccionInventario` asociada
        que sigue en curso — en ambos casos, { resultado: 'recuperar', operacion } delega a
        recuperarTransaccionInterrumpida (§22.3), que decide cuál de los dos casos es, cruzando
        el estado de la idempotencia con el de su `TransaccionInventario` vinculada (tabla
        cruzada de §22.3/§22.4) — nunca ignora este caso ni reprocesa a ciegas. */
}
```

Con esto, la secuencia completa de una operación queda en **tres fases**, no dos:

1. **`reservarOperacionIdempotente`** — la única escritura antes de que exista un plan; cierra la ventana de colisión entre dos invocaciones concurrentes con la misma clave.
2. **`prepararOperacionInventario`** (§12.2) — pura, sin efectos secundarios, recibe la reserva ya hecha (`operacionIdempotenteId`) y construye el plan completo, incluyendo `versionEsperada`/`hashEstadoBase` (§11, §12.2).
3. **`confirmarOperacionInventario`** (§12.3) — la única que persiste el dominio: crea la `TransaccionInventario`, aplica las escrituras, y **finaliza** (no crea) la `OperacionIdempotenteInventario` reservada en la fase 1, marcándola `'confirmada'`.

`ServicioKardexValorizado.registrarEntradaValorizada`/`registrarSalidaValorizada` (§12.5) encadenan las tres automáticamente — ningún llamador invoca las tres funciones por separado salvo que necesite inspeccionar el plan antes de confirmar (ej. previsualización de importación, §13.5).

### 12.2 Fase 2 — `prepararOperacionInventario` (pura, opera sobre el documento completo, tras la reserva de idempotencia)

```ts
// DISEÑO PROPUESTO — gestion-inventario/servicios/servicioKardexValorizado.ts

/**
 * Resultado de la fase de preparación: un plan completo para TODO el documento (todas sus
 * líneas), calculado en memoria, que describe exactamente qué se va a escribir. No contiene
 * NINGÚN efecto ya aplicado — es una descripción, no una ejecución. Es INMUTABLE una vez
 * construido: confirmarOperacionInventario no recalcula ningún campo, solo lo ejecuta.
 */
export interface PlanOperacionInventario {
  id: string;                          // = el id que tendrá la TransaccionInventario (§9.6)
  empresaId: string;
  documentoId: string;
  tipoDocumento: TipoDocumentoEntradaInventario | TipoDocumentoSalidaInventario;
  tipoOperacion: TipoOperacionIdempotenteInventario;
  modoOperacion: ModoOperacionInventario;

  claveIdempotencia: string;
  operacionIdempotenteId: string;       // de la reserva ya hecha en la fase 1 (§12.1bis) — nunca se genera aquí
  hashEntrada: string;

  /** Control optimista de concurrencia (§11) — obligatorio, no opcional. */
  versionEsperada: number;              // EstadoVersionInventario.versionInventario leído al iniciar esta preparación
  hashEstadoBase: string;               // hash de los datos base leídos (productos/almacenes/capas), para detectar drift además de la versión

  /** true si la reserva de la fase 1 ya venía con resultadoIds de una operación previa confirmada — el plan no tiene escrituras nuevas. */
  yaExistente: boolean;
  resultadoIdsPrevios?: string[];

  // Uno o más por línea del documento — el plan cubre TODAS las líneas juntas:
  movimientosNuevos: MovimientoStock[];
  movimientosActualizados: MovimientoStock[];
  capasNuevas: CapaCostoInventario[];
  capasActualizadas: CapaCostoInventario[];
  consumosNuevos: ConsumoCapaCostoInventario[];
  consumosActualizados: ConsumoCapaCostoInventario[];
  proyeccionStockPropuesta: Array<{ productoId: string; almacenId: string; cantidadNueva: number }>;
  actualizacionesProductos: Array<{ productoId: string; cambios: Partial<Product> }>;
  actualizacionesDocumentos: Array<{ tipo: 'comprobante_compra' | 'nota_ingreso' | 'nota_salida' | 'venta'; id: string; cambios: Record<string, unknown> }>;

  /** Claves de repositorio que confirmarOperacionInventario va a escribir — declaradas aquí, no calculadas durante la confirmación (§22.2). */
  clavesAfectadas: string[];
  /** Snapshot de "antes" de cada clave afectada, ya leído en esta fase — permite recuperación sin releer estado mutado. */
  datosAnteriores: Record<string, unknown>;

  resultadoIds: string[];               // ids de TODOS los movimientos/capas/consumos de TODAS las líneas
  costoTotalOperacion: number;          // suma de todas las líneas del documento (0 en modo cuantitativo)
  usuario: string;
  fecha: string;
}

export function prepararOperacionInventario(
  reserva: Extract<ResultadoReservaIdempotencia, { resultado: 'nueva' }>,
  input:
    | DatosOperacionEntradaCuantitativa | DatosOperacionEntradaInventario
    | DatosOperacionSalidaCuantitativa | DatosOperacionSalidaInventario
    | DatosTransferenciaValorizada,
): PlanOperacionInventario {
  /* DISEÑO PROPUESTO — internamente, sobre el DOCUMENTO completo (todas sus líneas juntas):
     1. Verificar que resolverModoOperacion(estadoValorizacion) admite input.modoOperacion — si no,
        rechazar antes de cualquier otro cálculo (§24.1ter).
     2. Leer EstadoVersionInventario.versionInventario vigente → versionEsperada; leer snapshot
        coherente para TODOS los productos/almacenes/capas de TODAS las líneas — una sola lectura
        por entidad, no una por línea — y calcular hashEstadoBase sobre ese snapshot.
     3. Validar reglas de negocio para CADA línea (costo > 0 en entradas valorizadas, línea
        inventariable, stock/capas suficientes en salidas, etc.) — SI CUALQUIER LÍNEA FALLA, el
        documento completo se rechaza: no se construye un plan parcial con solo las líneas válidas.
     4. Para cada línea válida, calcular el resultado de la mutación reutilizando
        InventoryService.calcularAjustePropuesto(...) (pura, §12.4) y, en modo valorizado para
        entradas, construir su CapaCostoInventario propuesta; para salidas, ejecutar
        consumirCapasFIFO (§18.2) en memoria y construir sus ConsumoCapaCostoInventario propuestos.
        En modo cuantitativo, solo movimientosNuevos/proyeccionStockPropuesta — sin capas/consumos.
     5. Calcular la proyección de stockPorAlmacen resultante consolidada (§8.1) — si dos líneas
        del mismo documento tocan el mismo producto+almacén, se consolida en una sola entrada de
        proyección, no dos que se pisen.
     6. Calcular las actualizaciones de documentos relacionados (CC, NI, línea de venta) — en memoria.
     7. Declarar clavesAfectadas y datosAnteriores (snapshot ya leído en el paso 2) — nunca se
        vuelven a calcular durante la confirmación.
     8. Ensamblar y retornar el PlanOperacionInventario completo, con `resultadoIds` cubriendo
        TODAS las líneas y `operacionIdempotenteId = reserva.operacionIdempotenteId`. */
}
```

**Prohibiciones explícitas de esta fase** (ninguna excepción): no persiste, no llama `localStorage.setItem`, no modifica ningún repositorio, no emite eventos de dominio, no modifica contexto de React, no cambia el estado de ningún documento fuera de la estructura `actualizacionesDocumentos` del plan (que es solo datos, no una escritura). **Ninguna línea se confirma de forma aislada** — el plan es del documento completo o no existe. La única escritura previa a esta fase es la reserva de idempotencia (§12.1bis), que ya ocurrió y cuyo id se recibe como parámetro.

### 12.3 Fase 3 — `confirmarOperacionInventario` (la única que persiste el dominio, confirma el documento completo)

```ts
// DISEÑO PROPUESTO — gestion-inventario/servicios/servicioKardexValorizado.ts

export interface ResultadoOperacionValorizada {
  documentoId: string;
  movimientos: MovimientoStock[];     // de TODAS las líneas del documento
  capasCreadas?: CapaCostoInventario[];
  consumos?: ConsumoCapaCostoInventario[];
  costoTotalOperacion: number;        // total del documento
  yaExistia: boolean;
}

export function confirmarOperacionInventario(plan: PlanOperacionInventario): ResultadoOperacionValorizada {
  /* DISEÑO PROPUESTO — secuencia única y definitiva (corresponde a los pasos 10-19 de la secuencia
     canónica completa de §22.2 — reserva de idempotencia = pasos 1-8, preparación = paso 9):

     10. Crear la TransaccionInventario (§9.6) con estado='preparada', vinculada a
         plan.operacionIdempotenteId, y persistirla.
     11. Con la transacción todavía en 'preparada' (antes de tocar dominio): releer
         EstadoVersionInventario.versionInventario y compararlo con plan.versionEsperada; verificar
         invariantes aplicables (§32), datos anteriores (plan.datosAnteriores) contra el estado
         real, disponibilidad, cantidades, costos, relaciones y que el modo (cuantitativo/
         valorizado) del plan sigue siendo válido para el estado actual. Si CUALQUIERA de estas
         verificaciones falla: marcar la transacción 'fallida' (nunca llegó a 'confirmando'),
         liberar la reserva de idempotencia (vuelve a 'preparada', disponible para un nuevo
         intento) y devolver el error correspondiente (ConflictoDeVersion u otro) — cero
         escrituras de dominio en este camino (invariante 26).
     12. Si todo lo anterior es válido: marcar la transacción 'confirmando'.
     13. Aplicar TODAS las escrituras del plan (de TODAS las líneas) dentro de
         UnidadTrabajoInventario (§22.1): movimientos, capas, consumos, proyección de stock,
         documentos relacionados — en el orden fijo que define esa unidad de trabajo, usando los
         repositorios de bajo nivel (StockRepository, RepositorioCapasCostoInventario, etc.)
         directamente, NUNCA volviendo a invocar InventoryService.registerAdjustment (que
         reintentaría su propio cálculo). No existe un "confirmar línea por línea" — es un único
         paso que aplica el documento entero o falla completo.
     14. Releer el estado recién persistido.
     15. Verificar invariantes aplicables (§32) sobre lo escrito, la nueva versión, relaciones,
         cantidades, valores y reconciliación — antes de cerrar.
     16. Confirmar la OperacionIdempotenteInventario ya reservada en la fase 1 (§12.1bis) — nunca
         se crea una nueva fila aquí, solo se actualiza la existente a estado='confirmada' con
         resultadoIds=plan.resultadoIds, transaccionInventarioId=transaccion.id,
         fechaConfirmacion=ahora.
     17. Marcar la TransaccionInventario 'confirmada'.
     18. Incrementar EstadoVersionInventario.versionInventario (§9.6bis), registrar
         ultimaTransaccionId, y liberar el bloqueo cooperativo obtenido en el paso 4 (§12.1bis).
     19. Retornar ResultadoOperacionValorizada.

     Si plan.yaExistente (reserva ya venía 'confirmada' con el mismo hash, §12.1bis paso 6):
     construir y retornar el resultado desde OperacionIdempotenteInventario.resultadoIds, SIN
     ejecutar ninguno de los pasos anteriores. */
}
```

`confirmarOperacionInventario` **no vuelve a calcular ninguna regla de negocio** (el plan ya trae todo resuelto), **no crea ningún id distinto** a los que el plan ya trae en `resultadoIds`, y **no consulta otra vez** factores de conversión, impuestos, monedas ni costos — todo eso ya se resolvió, una sola vez, en `prepararOperacionInventario`, para el documento completo. Su única decisión propia es la verificación del paso 11, que ocurre **antes** de marcar la transacción `'confirmando'` — nunca después, para no dejar una transacción `'confirmando'` que después resulte abortada por conflicto de versión.

### 12.4 Clasificación de funciones existentes (obligatoria, sin dejar dos caminos de mutación)

| Función existente | Clasificación | Acción propuesta |
|---|---|---|
| `InventoryService.registerAdjustment` (`inventory.service.ts:135-193`) | Debe dejar de persistir directamente desde el motor nuevo | Se extrae su lógica de cálculo (el `switch` de `data.tipo` y el cómputo de `nuevoStock`) a una función **pura** nueva, `InventoryService.calcularAjustePropuesto(product, data): { cantidadAnterior, cantidadNueva, movimientoPropuesto }`, invocada por `prepararOperacionInventario` una vez por línea del documento. `registerAdjustment` en sí **queda como wrapper temporal** (`calcularAjustePropuesto` + persistencia inmediata) para los llamadores que aún no hayan migrado durante la transición de la Etapa 1 — se marca `@deprecated` desde el inicio de la Etapa 1C, y se elimina en la Etapa 1E cuando los 7 llamadores originales (§12.5) hayan migrado por completo |
| `InventoryService.updateStock` | Ya es pura (calcula, no decide nada de negocio) | Reutilizable sin cambio, invocada internamente por `calcularAjustePropuesto` |
| `inventory.facade.ts::addMovimiento` | Debe dejar de persistir directamente | Misma estrategia que `registerAdjustment`: extraer cálculo puro, mantener como wrapper deprecado durante la transición, eliminar en Etapa 4 cuando `useComprobanteActions.tsx` migre por completo |
| `StockRepository.addMovement`/`addMovements` | Primitivo de escritura real | Se mantiene sin cambio de código, pero pasa a invocarse **exclusivamente** desde `confirmarOperacionInventario` (dentro de la unidad de trabajo) — nunca desde código de preparación ni desde wrappers deprecados una vez completada la migración |
| `resolvealmacenesForSaleFIFO`, `allocateSaleAcrossalmacenes`, `computeAvailable` (`stockGateway.ts`) | Utilidades puras, ya reutilizables | Sin cambio — se invocan libremente dentro de `prepararOperacionInventario` |
| `getFactorToUnidadMinima`, `convertToUnidadMinima`, `describeUnitConversion` (`unitConversion.ts`) | Utilidades puras, ya reutilizables | Sin cambio |
| `currencyManager.convert`, `normalizarImporte` | Utilidades puras, ya reutilizables | Sin cambio |
| `generarNIEnInventario`/`anularNIEnInventario` (`notaIngreso.service.ts`) | Deben dejar de llamar `registerAdjustment` directamente | Se adaptan para construir un `DatosOperacionEntradaInventario` con **todas** las líneas de la NI y invocar `prepararOperacionInventario` + `confirmarOperacionInventario` **una sola vez para el documento completo** (o el método de conveniencia `registrarEntradaValorizada`, §12.5) — nunca una invocación por línea |
| `generarNSEnInventario` (`notaSalida.service.ts`) | Igual que arriba, para salidas | Igual, hacia `registrarSalidaValorizada` |
| `registrarAjusteDeStock` (`shared/inventory/accionesStock.ts`) | Función que hoy persiste directamente (comentario propio: "punto único donde hoy se muta/persiste") | Se marca `@deprecated`, se retira cuando `AdjustmentModal.tsx` migre a llamar el motor nuevo (Etapa 1C) |

**No se propone un servicio que simplemente envuelva varios servicios viejos que persisten por separado** — esa es exactamente la razón por la que se separan las dos fases: la fase de preparación nunca invoca nada que persista, y la fase de confirmación es la única puerta de escritura real.

### 12.5 API pública de conveniencia y quiénes deben migrar

```ts
// DISEÑO PROPUESTO — envoltorio de conveniencia sobre las TRES fases (reservar→preparar→confirmar,
// §12.1bis), para llamadores que no necesitan inspeccionar el plan antes de confirmar. Todos los
// métodos reciben el DOCUMENTO completo (con sus líneas), nunca una línea individual, y resuelven
// el modo de operación desde el estado vigente de la empresa — nunca lo decide el llamador.
function ejecutarOperacionCompleta(
  empresaId: string,
  clave: string,
  tipoOperacion: TipoOperacionIdempotenteInventario,
  hashEntrada: string,
  input: Parameters<typeof prepararOperacionInventario>[1],
): ResultadoOperacionValorizada {
  const reserva = reservarOperacionIdempotente(empresaId, clave, tipoOperacion, hashEntrada);
  if (reserva.resultado === 'repetida') return construirResultadoDesdeIds(reserva.resultadoIds);
  if (reserva.resultado === 'conflicto') throw new ConflictoIdempotencia(reserva.mensaje);
  if (reserva.resultado === 'recuperar') return recuperarTransaccionInterrumpida(empresaId, reserva.operacion);
  return confirmarOperacionInventario(prepararOperacionInventario(reserva, input));
}

export const ServicioKardexValorizado = {
  registrarEntradaValorizada(
    input: DatosOperacionEntradaCuantitativa | DatosOperacionEntradaInventario,
  ): ResultadoOperacionValorizada {
    return ejecutarOperacionCompleta(input.empresaId, input.claveIdempotencia, tipoOperacionDe(input), input.hashEntrada, input);
  },
  registrarSalidaValorizada(
    input: DatosOperacionSalidaCuantitativa | DatosOperacionSalidaInventario,
  ): ResultadoOperacionValorizada {
    return ejecutarOperacionCompleta(input.empresaId, input.claveIdempotencia, tipoOperacionDe(input), input.hashEntrada, input);
  },
  transferirStockValorizado(input: DatosTransferenciaValorizada): ResultadoOperacionValorizada {
    return ejecutarOperacionCompleta(input.empresaId, input.claveIdempotencia, 'transferencia', input.hashEntrada, input);
  },
  revertirMovimientoValorizado(empresaId: string, movimientoId: string, usuario: string, motivo: string): ResultadoOperacionValorizada { /* misma cadena reservar/preparar/confirmar internamente, clave REVERSO-${movimientoId} */ },
  consultarCostoSiguienteSalida(empresaId: string, productoId: string, almacenId: string): number | null { /* solo lectura, sin plan */ },
  obtenerValorStock(empresaId: string, productoId: string, almacenId?: string): number { /* solo lectura, sin plan */ },
  // Expuestas también por separado para casos que sí necesitan revisar el plan antes de confirmar
  // (ej. previsualización de importación masiva, §13.5):
  reservarOperacionIdempotente,
  prepararOperacionInventario,
  confirmarOperacionInventario,
};
```

**Regla de firma**: todo método recibe `empresaId` explícito — nunca se infiere de un singleton de sesión implícito (invariante 21, §32). **Regla de granularidad**: `registrarEntradaValorizada`/`registrarSalidaValorizada` siempre reciben el documento completo (`lineas: [...]`) — no existe una sobrecarga ni una variante que acepte una sola línea suelta; un documento de una sola línea simplemente pasa un arreglo `lineas` de longitud 1. **Regla de modo**: ningún llamador construye `modoOperacion` a mano — cada llamador (NI, ajustes, ventas) resuelve el modo con `resolverModoOperacion(Configuration.inventory.estadoValorizacion)` (§24.1ter) inmediatamente antes de invocar `registrarEntradaValorizada`/`registrarSalidaValorizada`, y construye el objeto `DatosOperacion*Cuantitativa`/`DatosOperacion*Inventario` que corresponda a ese modo.

| Llamador actual | Función que hoy muta stock | Debe pasar a llamar |
|---|---|---|
| `notaIngreso.service.ts::generarNIEnInventario` | `InventoryService.registerAdjustment` (hoy, una vez por línea) | `ServicioKardexValorizado.registrarEntradaValorizada` **una sola vez, con todas las líneas de la NI en `lineas: []`** |
| Ajuste manual positivo (`AdjustmentModal.tsx` → `useInventory.ts`) | `InventoryService.registerAdjustment` vía `registrarAjusteDeStock` | `ServicioKardexValorizado.registrarEntradaValorizada` (documento de ajuste, con sus líneas si el ajuste cubre varios ítems) |
| Importación (sumatoria/reemplazo/inicial) | `InventoryService.registerAdjustment` | `prepararOperacionInventario` (previsualización) + `confirmarOperacionInventario` (al confirmar el usuario) — el documento es el lote de importación completo (`LoteImportacionValorizada`), cada fila del archivo es una línea, ver §13.5 |
| `servicioReservaStock.ts::descontarStockParaDocumento` (NV) | `InventoryService.registerAdjustment` (hoy, una vez por ítem del carrito) | `ServicioKardexValorizado.registrarSalidaValorizada` **una sola vez, con todos los ítems del carrito en `lineas: []`** |
| `useComprobanteActions.tsx` (Factura/Boleta/POS) | `inventory.facade.ts::addMovimiento` (hoy, en un `for` por ítem) | `ServicioKardexValorizado.registrarSalidaValorizada` una sola vez por comprobante, con todos sus ítems como líneas |
| `notaSalida.service.ts::generarNSEnInventario` | `InventoryService.registerAdjustment` (hoy, una vez por línea) | `ServicioKardexValorizado.registrarSalidaValorizada` una sola vez, con todas las líneas de la NS |
| NC con retorno físico (`useComprobanteActions.tsx`) | `addMovimientoVoid`/facade | `ServicioKardexValorizado.registrarEntradaValorizada` (documento de la NC completo, motivo devolución) |
| Transferencias (`inventory.service.ts::registerTransfer*`) | `InventoryService` directo | `ServicioKardexValorizado.transferirStockValorizado` (un producto por transferencia, ya es 1:1 con el documento legado) |
| Reversos (NI, NS, venta, ajuste) | Lógica ad-hoc por módulo | `ServicioKardexValorizado.revertirMovimientoValorizado` |

Esto **unifica los 3 motores actuales** (hallazgo P0-07 de la auditoría) y además corrige la granularidad de invocación: ningún llamador invoca el motor más de una vez por documento — cierra el riesgo de que una NI/venta con varias líneas quede parcialmente aplicada si una línea intermedia falla.

---

## 13. Entradas valorizadas

### 13.1 Nota de Ingreso (automática o manual)

Ambas modalidades terminan en el mismo lugar: `generarNIEnInventario` (reutilizada, con una modificación puntual: en vez de llamar `InventoryService.registerAdjustment` por línea, construye **un solo** `DatosOperacionEntradaInventario` con `documentoId: nota.id`, `tipoDocumento: 'nota_ingreso'`, `monedaOriginal: nota.moneda`, `tipoCambioAplicado` resuelto del CC origen si existe (o `1` si la NI es manual sin CC en la misma moneda base), y `lineas: nota.lineas.map(linea => ({ lineaId: linea.id, productoId: linea.productoId, almacenId: linea.almacenId, costoUnitarioBaseOriginal: linea.costoUnitario, ... }))` — **una sola** llamada a `ServicioKardexValorizado.registrarEntradaValorizada` para toda la NI, no una por línea).

### 13.2 Ajuste positivo

Se agrega el campo de costo **obligatorio** en `AdjustmentModal.tsx` cuando `esValorizacionActiva(Configuration.inventory.estadoValorizacion)` (si la empresa aún no llegó a `'activa'`, el ajuste sigue siendo cuantitativo puro, sin bloquear el uso del sistema durante la transición). La validación "costo > 0" vive en `prepararOperacionInventario` (§12.2), no en el componente de UI (defensa en profundidad, igual que hoy `registerAdjustment` valida `cantidad > 0` centralizadamente).

### 13.3 Importación — modo sumatoria

Se agrega columna de costo por almacén a la plantilla (ver §13.5). El **lote de importación completo** (`LoteImportacionValorizada`) es el documento — todas sus filas con cantidad positiva y costo válido se agrupan en `lineas: []` de un único `DatosOperacionEntradaInventario` (`tipoDocumento: 'importacion'`, `documentoId: lote.id`), y se confirman con **una sola** llamada a `registrarEntradaValorizada` para el lote completo (o se rechaza completo si alguna fila obligatoria falla validación, §12.2).

### 13.4 Importación — modo reemplazo

**No se acepta simplemente reemplazar el contador de stock** (instrucción explícita del encargo). Diseño:

- Si `cantidadArchivo > stockActual` para una fila → esa fila aporta una línea de **entrada** al `DatosOperacionEntradaInventario` del lote (§13.3), exigiendo costo para esa diferencia (no para el stock ya existente, que conserva sus capas).
- Si `cantidadArchivo < stockActual` para una fila → esa fila aporta una línea de **salida** al `DatosOperacionSalidaInventario` del lote (motivo `AJUSTE_INVENTARIO`), que **consume capas FIFO reales** (no borra capas arbitrariamente) — si las capas disponibles no alcanzan para cubrir la diferencia sin dejar remanente negativo, el lote completo se **bloquea** con un error explícito señalando la(s) fila(s) problemática(s) ("no se puede reducir el stock por debajo de lo que las capas registradas permiten sin costo indeterminado"), en vez de forzar un reemplazo ambiguo. Como el lote es una sola unidad transaccional, un error en una fila no aplica el resto del lote de forma parcial.
- Si `cantidadArchivo === stockActual` → no genera movimiento.

### 13.5 Importación — plantilla, validación, previsualización, trazabilidad (decisión 3.9)

- **Plantilla**: se agrega una columna de costo por cada columna de almacén ya existente (`"{código} - {nombre}"` → se agrega `"{código} - {nombre} (Costo)"`), manteniendo compatibilidad con el formato legacy (`CODIGO | ALMACEN | CANTIDAD`) mediante una columna `COSTO` adicional opcional — si está ausente y `valorizacionActiva === true`, la fila se marca como "requiere costo" en la previsualización, sin bloquear la carga completa del archivo (se bloquea solo la confirmación de esas filas específicas).
- **Validación**: costo `> 0` para toda cantidad positiva resultante (nueva o diferencia); costo no se exige para diferencias negativas (salidas) ni para filas sin cambio.
- **Previsualización**: la tabla de previsualización ya existente (`PanelImportacionStock.tsx`) se extiende con una columna de costo y un indicador visual por fila ("con costo" / "requiere costo" / "sin cambio").
- **Trazabilidad**: cada fila procesada genera su propio `documentoOrigenId` = `IMPORT-${loteImportacionId}-${numeroFila}`, permitiendo rastrear qué fila del archivo generó qué capa/movimiento.

### 13.6 Devolución de cliente con retorno físico (NC código 06/07)

Se trata como entrada valorizada con `tipoDocumentoOrigen: 'devolucion_cliente'`. El costo asignado a la capa nueva es el **mismo costo de venta** que tenía la línea original vendida (si está disponible — ventas posteriores a la activación de valorización lo tendrán, ver §26), preservando la coherencia de que "lo que vuelve, vuelve al mismo valor al que salió". Si la venta original es anterior a la activación (sin costo de venta persistido), se bloquea la devolución valorizada y se ofrece registrarla como ajuste manual con costo a confirmar por el usuario (no se inventa un costo).

---

## 14. Integración Compras–Inventario

### 14.1 Separación "línea inventariable" vs. "documento afecta inventario"

```ts
// DISEÑO PROPUESTO — compras/logica/reglasCompras.ts (nueva función, no reemplaza afectaInventario existente)

function calcularEsInventariable(linea: LineaCompra, producto: Product | undefined): boolean {
  if (linea.clasificacion === 'producto') {
    return Boolean(producto) && esProductoInventariable(producto!);
  }
  if (linea.clasificacion === 'suministro') {
    // Decisión 3.4: "suministros vinculados a un producto inventariable"
    return Boolean(producto) && esProductoInventariable(producto!) && producto!.tipoExistencia === 'SUMINISTROS';
  }
  // servicio, gasto, activo_fijo: nunca inventariables en este alcance
  return false;
}

function calcularAfectaInventarioLinea(
  esInventariable: boolean,
  modalidadInventario: ModalidadInventarioCC,
): boolean {
  return esInventariable && modalidadInventario !== 'no_afecta_inventario';
}
```

Con esto: una línea de servicio dentro de un CC en `con_nota_ingreso` queda con `esInventariable=false` → `afectaInventario=false` automáticamente, sin necesidad de un caso especial (cierra el hallazgo P1-01 de la auditoría). La OC sigue sin mover inventario porque su política de documento nunca invoca `ServicioKardexValorizado` — no porque se fuerce `afectaInventario=false` por línea de forma arbitraria (cierra el hallazgo P1-02, ahora como comportamiento intencional documentado, no como hardcode accidental).

### 14.2 Flujo "ingreso automático" (conecta el hallazgo P0-04 de la auditoría) — saga formal recuperable

**Corrección obligatoria (cuarta pasada)**: la versión anterior describía el CC, la Cuenta por Pagar, la NI y el Kardex como si se guardaran dentro de "una única unidad de trabajo" — pero son documentos distintos, persistidos en momentos distintos, cada uno con su propia entidad y su propio repositorio. Presentarlo como una sola transacción es la misma falsa promesa de atomicidad que §22.0 ya corrigió para el motor central; aquí se corrige de forma simétrica con una **saga explícita, recuperable, con estado observable en cada paso** — no una transacción monolítica que no existe.

```ts
// DISEÑO PROPUESTO — compras/modelos/EstadoIngresoAutomatico.ts

export type EstadoIngresoAutomatico = 'pendiente' | 'procesando' | 'completado' | 'fallido_recuperable';
```

- **`pendiente`**: el CC ya está guardado; la NI automática todavía no se confirmó.
- **`procesando`**: existe una operación activa de la saga (protege contra un segundo disparo mientras la primera sigue en curso).
- **`completado`**: NI, movimiento y las relaciones CC↔NI están todas confirmadas — **y, además, la capa correspondiente si la empresa operaba en modo valorizado en el momento de la saga** (criterio corregido, §14.2.1 abajo). Solo en este estado el CC puede presentarse como "ingreso automático completo".
- **`fallido_recuperable`**: la saga se interrumpió a mitad de camino; el siguiente intento **continúa** desde el último paso confirmado, con la misma clave — nunca se reinicia desde cero.

#### 14.2.1 Corrección obligatoria (quinta pasada): el criterio de `'completado'` depende del modo vigente al momento de la saga

**La versión anterior exigía "capa" incondicionalmente para marcar `'completado'`** — eso es incorrecto y, para la mayoría de las empresas (todas las que aún no llegaron a `estadoValorizacion==='activa'`), **inalcanzable**: antes de activar, `generarNIAutomatica` construye una operación en `modoOperacion:'cuantitativo'` (§12.1, §24.1ter — no existen capas en ese modo por diseño), así que exigir una capa para considerar la saga completa dejaría el CC eternamente `'procesando'`/nunca `'completado'` para toda empresa no activa, que es el caso normal durante las Etapas 0-3. Se corrige separando el criterio por modo, resuelto **una sola vez**, al inicio de la saga (paso 5bis siguiente), nunca reevaluado a mitad de camino:

```ts
// DISEÑO PROPUESTO — dentro de generarNIAutomatica(cc), inmediatamente después de marcar 'procesando'
const modoVigente = resolverModoOperacion(Configuration.inventory.estadoValorizacion); // §24.1ter — resuelto UNA vez, fijado para toda la saga

// Criterio de 'completado', evaluado al final de la saga (paso 10):
function sagaCompleta(cc: ComprobanteCompra, ni: NotaIngreso, modoVigente: ModoOperacionInventario): boolean {
  const base = ni.estado === 'Generada'
    && cc.notasIngresoRelacionadas.includes(ni.id)
    && cc.movimientosInventarioRelacionados.length > 0;
  if (modoVigente !== 'valorizado_exclusivo') return base; // modo cuantitativo: NI+movimiento+relación es TODO lo que puede existir — no hay capa que exigir
  // modo valorizado (empresa 'activa'): además exige la capa y el costo resueltos
  return base && existeCapaParaMovimiento(ni.lineas[0]?.movimientoId) && cc.lineas.every(l => !l.esInventariable || l.tratamientoImpuestoAplicado !== undefined);
}
```

**Regla adicional**: el modo se resuelve **una sola vez**, al iniciar la saga (no se recalcula si la empresa activa la valorización mientras la saga de un CC específico sigue `'procesando'`/`'fallido_recuperable'`) — evita que una recuperación tardía intente completar en modo valorizado una NI que se preparó en modo cuantitativo (o viceversa), lo cual violaría la inmutabilidad de un plan ya calculado (§12.2). Si la saga queda interrumpida en modo cuantitativo y la empresa activa la valorización antes de que se recupere, la recuperación completa igualmente en modo cuantitativo (el modo con el que se preparó originalmente) — la NI resultante queda como una de las últimas operaciones cuantitativas legítimas antes de la migración, cubierta por el proceso de valorización inicial (§24), no reinterpretada retroactivamente como valorizada.

**Flujo de la saga** (`generarNIAutomatica(cc)`, nueva función en `compras/servicios/`), invocado inmediatamente después de persistir el CC:

1. Registrar el `ComprobanteCompra` (ya ocurrió, paso previo a la saga).
2. Crear o actualizar su `CuentaPorPagar` (flujo ya existente, sin cambio — desacoplado del Kardex, decisión 3.16).
3. Guardar `cc.estadoIngresoAutomatico = 'pendiente'` (campo nuevo, snapshot explícito del proceso — reemplaza la idea de "estado implícito" de la versión anterior).
4. Reservar la clave `NI-AUTO-${comprobanteCompraId}` vía `reservarOperacionIdempotente` (§12.1bis) — si ya existe en `'confirmada'`, la saga no repite nada (protege contra doble-submit del formulario de CC); si existe en `'preparada'` (con o sin una `TransaccionInventario` asociada en curso), delega a recuperación (paso siguiente, §22.3).
5. Marcar `cc.estadoIngresoAutomatico = 'procesando'`.
5bis. **Resolver `modoVigente = resolverModoOperacion(Configuration.inventory.estadoValorizacion)` (§24.1ter) una sola vez** — se fija para el resto de esta saga, incluso si se recupera después de una interrupción (§14.2.1).
6. Construir `DatosNIDesdeCC` reutilizando `prepararDatosNIDesdeCC` (`mapeadorCCaNI.ts`, hoy huérfano — se conecta aquí), extendido con `factorConversionAplicado`/`cantidadDocumentadaInventariable` por línea (§8.1, §15); si `modoVigente==='valorizado_exclusivo'`, resolver además `calcularCostoValorizableLinea` (§16.3) por línea. Crear la `NotaIngreso` en `'Borrador'` con `origen = { tipo: 'comprobante_compra', comprobanteCompraId: cc.id, automatica: true }`.
7. Confirmar la NI mediante `generarNIEnInventario` (la función real y ya probada, sin duplicar su lógica) — pasa de `'Borrador'` a `'Generada'`, lo que internamente construye `modoOperacion: modoVigente` (§12.1) y llama a `ServicioKardexValorizado.registrarEntradaValorizada` **una sola vez, con todas las líneas de la NI** (§13.1), siguiendo las tres fases de §12.1bis-§12.3 — crea capa solo si `modoVigente==='valorizado_exclusivo'`, nunca si es cuantitativo.
8. Relacionar: `cc.notasIngresoRelacionadas = [notaIngreso.id]`, `cc.movimientosInventarioRelacionados = movimientos.map(m => m.id)`, `NotaIngreso.origen.comprobanteCompraId` ya poblado desde el paso 6.
9. Invocar `recalcularProyeccionIngresoCC(cc, notasIngresoRelacionadas)` (§8.1) — recalcula `cantidadIngresadaInventario`/`cantidadPendienteInventario`/`estadoInventario`, nunca asignado a mano.
10. Verificar `sagaCompleta(cc, ni, modoVigente)` (§14.2.1) — marcar `cc.estadoIngresoAutomatico = 'completado'` solo si se cumple para el modo con el que se preparó esta saga.

**Mientras `estadoIngresoAutomatico !== 'completado'`**: el CC no se muestra como ingreso terminado en ninguna vista; no se permite crear una NI manual adicional para ese CC (mismo guard que §14.3); no se permite disparar una segunda saga con una clave distinta (la clave siempre es `NI-AUTO-${cc.id}`, determinística, nunca un UUID por intento); no se duplica la `CuentaPorPagar` (el paso 2 ya es idempotente por sí mismo, guard existente); no se crea una segunda capa (protegido por la reserva de idempotencia del paso 4). La UI muestra el estado real (`pendiente`/`procesando`/`fallido_recuperable`/`completado`), nunca "completado" de forma optimista.

**Recuperación**: si el proceso se interrumpe (cierre de pestaña, error de red, excepción), `cc.estadoIngresoAutomatico` queda en `'procesando'` o `'fallido_recuperable'`. Al reintentar (automáticamente al recargar el módulo, igual que §22.3, o manualmente desde la UI), la saga **continúa desde el último paso confirmado** usando la misma clave `NI-AUTO-${cc.id}` — nunca recrea el CC, nunca duplica la `CuentaPorPagar`, nunca reinicia la NI si ya se creó en `'Borrador'`; retoma el primer paso pendiente. Esto es la misma filosofía de recuperación de §22.3, aplicada a una saga de documentos en vez de a una sola `TransaccionInventario`.

Actualiza en consecuencia: modelos (`ComprobanteCompra.estadoIngresoAutomatico`, nuevo campo), estados (máquina anterior), flujos (pasos 1-10 arriba, reemplazan la descripción previa de "unidad de trabajo única"), idempotencia (clave `NI-AUTO-${comprobanteCompraId}` ya definida en §21.4, ahora con la saga explícita que la usa), recuperación (párrafo anterior), criterios de aceptación de la Etapa 3 (§34, debe incluir "la saga se recupera correctamente desde cualquier paso interrumpido"), pruebas (escenarios nuevos en §36).

### 14.3 Flujo "con Nota de Ingreso" manual

1. CC se registra con `modalidadInventario === 'con_nota_ingreso'` → `estadoInventario = 'pendiente'`.
2. Desde Inventario, una nueva acción "Generar Nota de Ingreso desde Comprobante de Compra" (UI nueva, fuera de alcance de este documento de diseño detallar pixel a pixel, pero su contrato de datos es `prepararDatosNIDesdeCC(cc)` extendido igual que en 14.2.b) lista los CC con `estadoInventario === 'pendiente'` y `modalidadInventario === 'con_nota_ingreso'`.
3. El usuario selecciona un CC, se pre-llena una NI en `'Borrador'` con `origen = { tipo: 'comprobante_compra', comprobanteCompraId: cc.id, automatica: false }`.
4. El usuario confirma manualmente (mismo botón/flujo que ya existe en `FormularioNotaIngreso.tsx`) → `generarNIEnInventario` → `ServicioKardexValorizado.registrarEntradaValorizada` → `recalcularProyeccionIngresoCC(cc, notasIngresoRelacionadas)` (§8.1), dentro de la misma unidad de trabajo.
5. **Bloqueo de una segunda NI en el MVP**: antes de permitir generar la NI, se valida que `cc.notasIngresoRelacionadas` no tenga ya una NI con `estado !== 'Anulada'` — si existe, se bloquea con mensaje explícito. Esta validación vive en **una función de regla de negocio separada** (`reglasCompras.puedeGenerarNIDesdeCC(cc, notasExistentes)`), no hardcodeada dentro del formulario, precisamente para que levantar el límite a N sea cambiar esa única función en el futuro.

### 14.4 Flujo "no afecta inventario"

Sin cambios respecto al comportamiento actual (ya es correcto): el CC nunca invoca `generarNIAutomatica` ni ofrece la acción "Generar NI" — la exclusión ocurre en el punto de entrada (si `modalidadInventario === 'no_afecta_inventario'`, ningún código de los pasos 14.2/14.3 se ejecuta), no como una rama adicional dentro del motor.

### 14.5 Trazabilidad canónica resultante

```
ComprobanteCompra.notasIngresoRelacionadas: [notaIngreso.id]        (ahora poblado de verdad)
NotaIngreso.origen.comprobanteCompraId: comprobanteCompra.id         (nuevo campo, FK real)
MovimientoStock.documentoOrigenId: notaIngreso.id                    (nuevo campo, FK real)
CapaCostoInventario.movimientoEntradaId: movimientoStock.id          (nueva entidad)
```

---

## 15. Presentaciones y conversión de unidades

### 15.1 Única fuente de verdad

`shared/inventory/unitConversion.ts` (ya existente) sigue siendo la única fuente de verdad para: `getFactorToUnidadMinima`, `convertToUnidadMinima`, `convertFromUnidadMinima`, `describeUnitConversion`. **No se crea una nueva utilidad** — se corrige quién la usa:

| Módulo | Hoy | Cambio propuesto |
|---|---|---|
| Ventas/POS | Ya usa `describeUnitConversion` (`comprobantePricing.ts:243`) | Sin cambio |
| `usePriceBook.ts` (Precios, lado venta) | Reimplementa su propia resolución de factor (`getUnitFactorFromCatalog`) | Migrar a `getFactorToUnidadMinima`/`describeUnitConversion` — **fuera del alcance de Kardex valorizado**, se documenta como deuda técnica relacionada (no bloqueante, ver §39) |
| Compras → NI (`mapeadorCCaNI.ts`) | **No aplica el factor en absoluto** (copia `cantidad: l.cantidadRecibida` tal cual) | Debe llamar `convertToUnidadMinima({ product, quantity: linea.cantidadRecibida, unitCode: linea.unidadMedidaCodigo })` al construir `LineaNIDesdeCC.cantidad` |
| Inventario (NI/NS/Ajustes/Transferencias) | No usa factor (siempre unidad base) — correcto hoy porque nunca reciben cantidades en otra unidad | Sin cambio — solo Compras necesita conversión, porque es el único punto donde el usuario puede elegir una presentación distinta a la unidad mínima |

### 15.2 Snapshots que deben persistirse

Por decisión 3.5 ("el factor usado debe persistirse como snapshot... nunca debe reconsultarse el factor actual"):

| Snapshot | Dónde vive (nuevo campo) |
|---|---|
| `presentacionId` (o código de unidad elegido) | `LineaCompra.unidadMedidaCodigo` (ya existe) |
| Unidad comercial | `LineaCompra.unidadMedida` (ya existe) |
| Factor aplicado | `LineaCompra.factorConversionAplicado` (nuevo, §10.3) — copiado a `LineaNotaIngreso.factorConversionAplicado` (nuevo, §10.5) al generar la NI |
| Cantidad comercial | `LineaCompra.cantidadSolicitada`/`cantidadRecibida` (ya existe) — copiado a `LineaNotaIngreso.cantidadComercialOriginal` (nuevo) |
| Cantidad en unidad mínima | `LineaNotaIngreso.cantidad` (ya existe, hoy sin convertir — se corrige para que SÍ sea el resultado de la conversión) → `MovimientoStock.cantidad` (ya existe) |
| Costo por presentación | `LineaCompra.costoUnitario` (ya existe) |
| Costo por unidad mínima | `CapaCostoInventario.costoUnitarioBaseMonedaBase` (nuevo) |

### 15.3 Ejemplo obligatorio verificado contra el diseño

- Unidad mínima: unidad. Presentación: caja de 12 (`factorConversion: 12` en `AdditionalUnitMeasure`).
- Compra: 2 cajas, S/120 por caja → `LineaCompra.cantidadSolicitada = 2`, `unidadMedidaCodigo = <código compuesto de la presentación caja>`, `costoUnitario = 120`, `factorConversionAplicado = 12` (snapshot tomado en este momento).
- Al generar la NI: `LineaNotaIngreso.cantidad = convertToUnidadMinima({ product, quantity: 2, unitCode: <presentación> }) = 24`.
- `ServicioKardexValorizado.registrarEntradaValorizada` recibe (con los tres niveles explícitos, sin ambigüedad, ver §9.9):
  - `cantidadComercialOriginal: 2`, `costoUnitarioComercialOriginal: 120`, `factorConversionAplicado: 12`
  - `cantidadUnidadMinima: 24` (= 2 × 12), `costoUnitarioBaseOriginal: 10` (= 120 / 12 — costo por unidad mínima, en moneda original)
  - `monedaOriginal: 'PEN'`, `tipoCambioAplicado: 1` (moneda base de la empresa también es PEN en este ejemplo)
- `CapaCostoInventario` resultante: `cantidadInicial: 24`, `costoUnitarioComercialOriginal: 120`, `cantidadComercialOriginal: 2`, `factorConversionAplicado: 12`, `costoUnitarioBaseOriginal: 10`, `costoUnitarioBaseMonedaBase: 10` (mismo valor que el original porque TC=1), `valorValorizableOriginal: 240`, `valorValorizableMonedaBase: 240`.
- Ningún campo mezcla dos niveles: el costo "120" nunca se confunde con el costo "10" porque tienen nombres distintos (`costoUnitarioComercialOriginal` vs. `costoUnitarioBaseOriginal`), y el valor total documental ("240") tiene su propio nombre (`valorValorizableOriginal`/`valorValorizableMonedaBase`) distinto de ambos costos unitarios.

### 15.4 Riesgo histórico si cambia el factor después

Si el usuario edita `AdditionalUnitMeasure.factorConversion` de "caja de 12" a "caja de 24" **después** de esta compra, la capa ya creada (`factorConversionAplicado: 12`, snapshot en `LineaNotaIngreso`) **no se ve afectada** — ninguna función de consulta de capas vuelve a llamar `getFactorToUnidadMinima` sobre movimientos pasados. Nuevas compras con la misma presentación usarán el factor `24` vigente. Este es exactamente el comportamiento exigido por la decisión 3.5.

### 15.5 Casos adicionales

| Caso | Comportamiento diseñado |
|---|---|
| Cantidades decimales (ej. compra de 2.5 kg) | `convertToUnidadMinima`/`convertFromUnidadMinima` ya operan con `number` sin restricción de enteros — sin cambio necesario; la política de precisión de costo (§17) absorbe el redondeo, no la cantidad |
| Cambio de unidad base del producto (`Product.unidad`) después de tener capas | Fuera de alcance de este diseño — es un caso de "cambio de identidad de la unidad mínima", no de factor de presentación; se documenta como pendiente no bloqueante (§39), dado que no fue mencionado en las decisiones aprobadas |
| Producto comprado por caja pero controlado por unidad | Es exactamente el caso base del ejemplo obligatorio (§15.3) — ya cubierto |

---

## 16. Costo valorizable y tributación

### 16.1 Corrección obligatoria: sin asunción silenciosa de recuperabilidad

La versión anterior de este diseño proponía `Company.aplicaCreditoFiscal: boolean` con **default `true` asumido para todas las empresas existentes** — esto es exactamente el tipo de "valor por defecto silencioso" que las decisiones aprobadas prohíben (misma familia de riesgo que "no inventar costo histórico no disponible", decisión 3.10). Se reemplaza por una configuración **explícita, en español, que la empresa debe confirmar antes de poder activar la valorización** — nunca se asume en silencio.

```ts
// DISEÑO PROPUESTO — configuracion-sistema/modelos/Configuration.ts, dentro de Configuration.inventory

export type TratamientoImpuestoCompra =
  | 'excluir_recuperables'     // el IGV de líneas gravadas se excluye del costo valorizable (empresa con derecho a crédito fiscal)
  | 'incluir_impuestos'        // todo impuesto de la línea se incluye en el costo valorizable (empresa sin derecho a crédito fiscal)
  | 'definir_por_linea'        // la recuperabilidad se confirma línea por línea al registrar el CC (casos mixtos)
  | 'pendiente_configuracion'; // default para TODA empresa existente — bloquea la activación de valorización hasta que se resuelva
```

`Tax.ts` **ya tiene** `affectationCode`/`affectationName` (Catálogo 07 SUNAT: `'10'` Gravado-Onerosa, `'20'` Exonerado, `'30'` Inafecto, `'40'` Exportación — `Tax.ts:24-34`, valores reales en `PERU_TAX_TYPES`). Lo que falta no es el catálogo — es (a) que `Product` tenga una referencia estructurada a `Tax` en vez de un string libre, y (b) esta configuración de tratamiento.

**Corrección obligatoria (cuarta pasada): resolución tributaria estructurada como bloqueante P0 de la Etapa 0, no como mejora diferida.** La versión anterior aceptaba el parseo de texto libre (`resolverImpuestoProducto`) como solución **definitiva** del MVP y relegaba la conexión estructurada a §39 (pendiente no bloqueante). Eso es incorrecto: el costo valorizable **depende** de la tasa/recuperabilidad resuelta (§16.3), y hoy existen **4 implementaciones independientes y ligeramente distintas** del mismo parseo (`resolverImpuestoProducto`, `resolverAfectacionDesdeImpuesto`, `resolveIgvRate`, `resolveIgvRateNS` — hallazgo §5.8), lo cual viola directamente "cero reglas tributarias duplicadas" (Estándares técnicos). Se corrige unificando en una única función central, cuya construcción se mueve a la **Etapa 0** (antes de que cualquier capa se cree con costo valorizable):

```ts
// DISEÑO PROPUESTO — compras/logica/reglasCompras.ts (función central única, Etapa 0)

export interface ResolucionTributariaProducto {
  impuestoId: string;
  codigoAfectacion: string;      // Tax.affectationCode, catálogo 07 SUNAT
  tasa: number;
  esRecuperable: boolean;        // derivado de codigoAfectacion + Configuration.inventory.tratamientoImpuestoCompra
  tratamientoAplicado: TratamientoImpuestoLinea;
  importeRecuperable: number;
  importeNoRecuperable: number;
  origenResolucion: 'tax_estructurado' | 'texto_parseado_legacy';
}

export function resolverTratamientoTributarioProducto(
  producto: Product,
  linea: LineaCompra,
  tratamientoEmpresa: TratamientoImpuestoCompra,
): ResolucionTributariaProducto {
  /* DISEÑO PROPUESTO: fuente única, en este orden de preferencia —
     1. Si Product.impuestoId (FK estructurada a Tax, nueva) está poblado: resolver directamente
        desde Tax.affectationCode/tasa — origenResolucion: 'tax_estructurado'.
     2. Si no (producto legado sin impuestoId): delegar en resolverImpuestoProducto (texto
        parseado, único punto que sigue reimplementando el parseo) — origenResolucion:
        'texto_parseado_legacy'. Este es el ÚNICO lugar del código nuevo que invoca el parseo de
        texto; ninguna otra función nueva lo reimplementa.
     3. Aplicar resolverTratamientoImpuestoLinea (§16.3) con tratamientoEmpresa para calcular
        esRecuperable/tratamientoAplicado/importeRecuperable/importeNoRecuperable. */
}
```

`resolverAfectacionDesdeImpuesto`, `resolveIgvRate`, `resolveIgvRateNS` (las otras 3 implementaciones del mismo parseo) **quedan deprecadas desde el cierre de la Etapa 0** y delegan internamente en `resolverTratamientoTributarioProducto` — no se reimplementan, no coexisten como una quinta fuente. Se eliminan cuando `getConsumidores() === 0` (mismo criterio objetivo que la deprecación de `precioCompra`, §25.3). Migrar `Product.impuesto` a un `impuestoId` estructurado (FK a `Tax.id`) sigue siendo deseable a mediano plazo pero **no bloquea la Etapa 0**: mientras no exista, `resolverTratamientoTributarioProducto` opera en `origenResolucion: 'texto_parseado_legacy'` para todos los productos — lo que se cierra en la Etapa 0 es la **unificación** de las 4 implementaciones en una sola función, no la migración completa del campo de `Product` (que queda documentada en §39 como mejora posterior, ya no como excusa para mantener 4 parseos duplicados).

**Por qué no vive en `Company`**: es una decisión de cómo se valoriza el inventario, no un dato tributario general de la empresa — se agrupa junto a `estadoValorizacion` en `Configuration.inventory`, donde ya vive el resto de la configuración de activación (§10.11).

### 16.2 Precondición de activación (bloqueo explícito)

`Configuration.inventory.estadoValorizacion` **no puede transicionar `validada→activando`** (§24.1, §31.5) mientras `tratamientoImpuestoCompra === 'pendiente_configuracion'`. Esta es una precondición adicional a la ya existente ("todo el stock positivo tiene costo confirmado") — ambas deben cumplirse. No hay una tercera opción de "activar y decidir después": obliga a la empresa a elegir explícitamente entre las 3 políticas reales antes de que exista un solo Sol de costo valorizado.

### 16.3 Fórmula de costo valorizable (MVP, sin flete/seguro/bonificaciones)

```ts
// DISEÑO PROPUESTO — compras/logica/reglasCompras.ts, nueva función

type TratamientoImpuestoLinea = 'excluido' | 'incluido';

function resolverTratamientoImpuestoLinea(
  linea: LineaCompra,
  tratamientoEmpresa: TratamientoImpuestoCompra,
): TratamientoImpuestoLinea {
  if (tratamientoEmpresa === 'excluir_recuperables') return 'excluido';
  if (tratamientoEmpresa === 'incluir_impuestos') return 'incluido';
  if (tratamientoEmpresa === 'definir_por_linea') {
    if (!linea.tratamientoImpuestoLinea) {
      throw new Error(
        'Esta línea requiere que confirmes si su IGV es recuperable antes de registrar el comprobante ' +
        '(la empresa tiene configurado "definir por línea").'
      );
    }
    return linea.tratamientoImpuestoLinea;
  }
  // 'pendiente_configuracion' nunca debería llegar aquí — bloqueado antes por §16.2 / activación.
  throw new Error('La empresa no ha confirmado el tratamiento de impuestos de compra. Resuélvelo en Configuración antes de continuar.');
}

function calcularCostoValorizableLinea(
  linea: LineaCompra,
  tratamientoEmpresa: TratamientoImpuestoCompra,
): { costoValorizableComercial: number; impuestoRecuperable: number; impuestoNoRecuperable: number; tratamientoAplicado: TratamientoImpuestoLinea } {
  // Reutiliza el resultado ya calculado por calcularLineaCompra (reglasCompras.ts:724-742):
  const { baseImponible, igv } = calcularLineaCompra(linea);
  const tratamientoAplicado = resolverTratamientoImpuestoLinea(linea, tratamientoEmpresa);

  const impuestoRecuperable = linea.tipoAfectacion === 'gravado' && tratamientoAplicado === 'excluido' ? igv : 0;
  const impuestoNoRecuperable = igv - impuestoRecuperable;

  // Costo valorizable EXCLUYE el impuesto recuperable, INCLUYE el no recuperable:
  const costoValorizableComercial = baseImponible + impuestoNoRecuperable;

  return { costoValorizableComercial, impuestoRecuperable, impuestoNoRecuperable, tratamientoAplicado };
}

function calcularCostoValorizablePorUnidadMinima(
  costoValorizableComercial: number,
  cantidadComercial: number,
  factorConversionAplicado: number,
): number {
  const cantidadUnidadMinima = cantidadComercial * factorConversionAplicado;
  return cantidadUnidadMinima > 0 ? costoValorizableComercial / cantidadUnidadMinima : 0;
}
```

Casos:
- `tipoAfectacion === 'exonerado' | 'inafecto'` → `igv = 0` ya (por `calcularLineaCompra`), por lo que `impuestoNoRecuperable = 0` también — el costo valorizable es simplemente `baseImponible` (= `neto`), sin importar `tratamientoEmpresa`.
- `tipoAfectacion === 'sin_configurar'` → **se bloquea el registro del CC** (comportamiento ya existente, `validarLineasCompra`, `reglasCompras.ts:507-512` — sin cambio, el diseño no debilita esta validación).
- `tratamientoEmpresa === 'incluir_impuestos'` → todo el IGV gravado se vuelve no recuperable, formando parte del costo (empresa sin derecho a crédito fiscal, ej. un régimen futuro no representado hoy en los 3 valores de `regimenTributario`).
- `tratamientoEmpresa === 'definir_por_linea'` sin `linea.tratamientoImpuestoLinea` confirmado → **bloquea el registro de esa línea específica**, no asume ni "excluido" ni "incluido" por defecto.

`tratamientoAplicado` (el resultado, no la política) se persiste como snapshot en `LineaCompra.tratamientoImpuestoAplicado` (nuevo campo, §10.0/§10.3) al confirmar la línea — coherente con el principio general de snapshot histórico: si la empresa cambia su política general después, las líneas ya confirmadas no cambian de tratamiento retroactivamente.

### 16.4 Dónde se ejecuta y dónde se persiste

El cálculo se ejecuta **una sola vez**, en `ServicioKardexValorizado.registrarEntradaValorizada` (al momento de crear la `CapaCostoInventario`), no en cada pantalla que muestre el costo. El resultado (`costoUnitarioBaseOriginal`, ya en moneda del documento) se persiste en `CapaCostoInventario.costoUnitarioBaseOriginal`; el resultado convertido a moneda base se persiste en `costoUnitarioBaseMonedaBase`. Cualquier pantalla que necesite mostrar "costo valorizable" **lee** estos campos — no vuelve a ejecutar `calcularCostoValorizableLinea`.

### 16.5 Comportamiento en moneda extranjera y precisión

Ver desarrollo completo en §17. Resumen: `costoValorizableComercial` (en moneda original) se convierte con `currencyManager.convert(monto, monedaOriginal, monedaBase, tipoCambioAplicado)` — reutilizando la función ya existente, pasando el TC ya capturado por Compras como `rateOverride` (la firma `convert(amount, from, to, rateOverride?)` ya soporta esto, `currencyManager.ts:189-197`).

### 16.6 Qué falta para decidir correctamente el costo valorizable (respuesta directa)

1. Fuente de la tasa: `resolverTratamientoTributarioProducto` (§16.1) — fuente única obligatoria desde la Etapa 0. Internamente delega en `resolverImpuestoProducto` (texto parseado) únicamente cuando el producto no tiene `impuestoId` estructurado (`origenResolucion: 'texto_parseado_legacy'`) — ningún código nuevo llama a `resolverImpuestoProducto` directamente; siempre pasa por la función unificada.
2. Fuente de la recuperabilidad: **no existe hoy** — se agrega `Configuration.inventory.tratamientoImpuestoCompra` (`TratamientoImpuestoCompra`, §16.1), sin asumir un valor por defecto operativo (el default `'pendiente_configuracion'` bloquea, no asume).
3. Configuración requerida: el nuevo campo, expuesto en la UI de activación de valorización (§24) — la empresa debe elegirlo explícitamente antes de poder activar.
4. Comportamiento exonerado/inafecto: costo valorizable = base neta, sin componente de IGV, sin importar la política (ya cubierto, §16.3).
5. Comportamiento en moneda extranjera: conversión con TC snapshot (§16.5, §17).
6. Alternativa mínima segura para el MVP: **no hay atajo silencioso** — la empresa confirma su tratamiento una vez, como parte del mismo flujo de activación de valorización (§24.1); mientras no lo haga, `estadoValorizacion` no puede transicionar a `'activando'`/`'activa'`.
7. Qué debe quedar preparado para una versión posterior: `impuestoId` estructurado en `Product` (FK a `Tax`), landed cost (flete/seguro/gastos adicionales/bonificaciones prorrateadas) — explícitamente fuera de este MVP (decisión 3.6).

---

## 17. Moneda, tipo de cambio y precisión

### 17.1 Reutilización de fuentes centrales existentes (decisión 3.7: "reutiliza las fuentes centrales existentes, sin copiar su lógica de manera dispersa")

- **Moneda base**: `Company.monedaBase` → sincronizado a `currencyManager` (ya existente, `ContextoConfiguracion.tsx:1530-1536`). `ServicioKardexValorizado` obtiene la moneda base leyendo `currencyManager.getSnapshot().baseCurrency.code` — **no** repite el patrón disperso `config.currencies.find(c => c.isBaseCurrency)?.code ?? 'PEN'` que hoy aparece duplicado en `ContextoCompras.tsx` y `FormularioComprobanteCompra.tsx` (hallazgo nuevo de esta tarea, §5.9 nota adicional: aunque no se lista ahí, se registra aquí como deuda a corregir, no bloqueante).
- **Conversión y redondeo**: `currencyManager.convert(amount, from, to, rateOverride?)` (ya existente) — se reutiliza siempre con `rateOverride` = el TC ya capturado por el documento origen (Compras), nunca se vuelve a llamar `getRate()` (que devolvería la tasa **vigente**, no la histórica).
- **Formato de presentación**: `currencyManager.formatMoney` (ya existente) — sin cambios.

### 17.2 Snapshot obligatorio por operación con moneda distinta a la base

Ya diseñado en `CapaCostoInventario` (§9.2): `monedaOriginal`, `costoUnitarioBaseOriginal`, `tipoCambioAplicado`, `fechaTipoCambio`. **Nunca se recalcula** — confirmado como comportamiento correcto porque `currencyManager.convert` solo se invoca en el momento de `registrarEntradaValorizada`, con el TC que el llamador (Compras) ya tiene capturado (`ComprobanteCompra.tipoCambio`, campo existente, input manual — `FormularioComprobanteCompra.tsx:189-190,360`).

**Nota de matiz sobre "TC histórico" en Ventas** (identificado en §5.7 de este documento): el `tipoCambio` que hoy captura Ventas (`EmisionTradicional.tsx:1313,1657`) es literalmente la tasa **vigente** del `CurrencyDescriptor` en el momento de emitir (`currencyInfo.rate` = `CurrencyDescriptor.exchangeRate`), no una tasa fechada de una tabla histórica — pero **una vez capturada y persistida en el documento**, se comporta como snapshot correcto (no se vuelve a leer `exchangeRate` después). El diseño de Kardex sigue exactamente este mismo patrón: capturar el TC vigente **en el momento de la operación** y persistirlo — es consistente con cómo ya funciona Ventas, no una innovación.

### 17.3 Corrección obligatoria: política de precisión concreta y centralizada

La versión anterior definía la precisión interna como "mínimo 6 decimales", una cifra vaga sin fuente única. Se corrige con una política concreta, con una constante por concepto, centralizada en un solo archivo — nunca hardcodeada de forma dispersa:

```ts
// DISEÑO PROPUESTO — gestion-inventario/utilidades/precisionInventario.ts (nuevo, fuente única)

/** Cantidad de un producto expresada en su unidad mínima (ej. 2.5 kg, 3.333333 litros de un envase parcial). */
export const PRECISION_CANTIDAD_UNIDAD_MINIMA = 6;

/** Factor de conversión entre una presentación comercial y la unidad mínima (ej. 0.75 kg por unidad de un producto vendido a granel en distintas presentaciones). */
export const PRECISION_FACTOR_CONVERSION = 8;

/** Costo unitario interno (por unidad mínima), en moneda original y en moneda base — la precisión más alta del sistema, porque es la que sufre el problema de "10 / 3" del ejemplo obligatorio. */
export const PRECISION_COSTO_UNITARIO_INTERNO = 8;

/**
 * Tipo de cambio aplicado: NO es una constante fija en este archivo — se resuelve centralmente
 * desde `currencyManager` en el momento de la operación (§17.1), pero una vez capturado se
 * ALMACENA con la misma precisión que el costo unitario interno (8 decimales), no con los
 * `decimalPlaces` de presentación de la moneda (que son para mostrar, no para calcular).
 */
export const PRECISION_TIPO_CAMBIO_ALMACENADO = PRECISION_COSTO_UNITARIO_INTERNO;

/** Redondea un número a N decimales sin usar toFixed() como lógica de negocio (toFixed() devuelve string y trunca por representación de punto flotante — aquí se usa aritmética explícita). */
export function redondearAPrecision(valor: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}
```

**Precisión de presentación en interfaz y reportes**: nunca usa las constantes anteriores — usa exclusivamente `currencyManager.formatMoney`/`normalizarImporte` (ya existentes), que resuelven `decimalPlaces` **por moneda**, configurado en `CurrencyDescriptor` (ej. 2 para PEN/USD hoy, pero editable por moneda — no hardcodeado). Esto responde punto por punto lo exigido:

1. **Dónde se normaliza**: un único archivo, `precisionInventario.ts` (cantidades/factores/costo interno) + `currencyManager`/`normalizarImporte` (ya existentes, para presentación monetaria por moneda) — ninguna otra parte del código nuevo define su propia constante de decimales.
2. **Cuándo se redondea**: **solo** al persistir un valor monetario **final** (`valorValorizableMonedaBase`, `valorConsumidoMonedaBase`, totales de documento) — nunca al calcular un valor **intermedio** (`costoUnitarioBaseMonedaBase`, `costoUnitarioBaseOriginal`, `factorConversionAplicado`).
3. **Qué nunca se redondea prematuramente**: `costoUnitarioBaseOriginal`, `costoUnitarioBaseMonedaBase`, `costoUnitarioComercialOriginal` y `factorConversionAplicado` se calculan y almacenan siempre con su precisión interna completa (8 decimales para costos/TC, hasta 6 para factores expresados en unidad mínima) — redondearlos antes de multiplicar por cantidades es exactamente el error que produce el drift del ejemplo obligatorio.
4. **Cómo se maneja el residuo**: ver reconciliación (punto 5) — el residuo de redondeo se absorbe siempre en el **último** consumo de una capa, nunca se descarta ni se distribuye arbitrariamente entre consumos intermedios.
5. **Cómo se reconcilia el último consumo**: sin cambio respecto al mecanismo ya diseñado (ver función `calcularCostoConsumo` más abajo) — se mantiene, solo se precisa que opera sobre valores con `PRECISION_COSTO_UNITARIO_INTERNO` (8 decimales), no sobre un genérico "6 o más".
6. **Cómo se garantiza que la suma de consumos coincida con el valor de la capa**: por construcción — todos los consumos salvo el último usan `redondearAPrecision(cantidad × costoUnitarioBaseMonedaBase, decimalPlaces(monedaBase))`, y el último usa `valorValorizableMonedaBase − Σ(anteriores)`, de modo que la suma total es exactamente `valorValorizableMonedaBase` (invariante 17, §32) — no una aproximación.
7. **Cómo se manejan cantidades fraccionarias**: `cantidadInicial`/`cantidadDisponible`/`cantidadConsumida` se almacenan con `PRECISION_CANTIDAD_UNIDAD_MINIMA` (6 decimales) — suficiente para unidades de peso/volumen fraccionarias (ej. 2.5 kg, 0.333333 litros de un envase parcial) sin acumular error perceptible en productos de alta rotación.
8. **Cómo se evita `toFixed()` como lógica de negocio**: `redondearAPrecision` (arriba) y `normalizarImporte` (ya existente) son las **únicas** dos funciones de redondeo permitidas en código nuevo de este diseño — ninguna función de `ServicioKardexValorizado`, `prepararOperacionInventario` ni `confirmarOperacionInventario` llama `.toFixed()` directamente. Código legado que ya usa `toFixed(2)` (~70 archivos, confirmado en auditoría) queda fuera de alcance de esta corrección — no se toca, pero tampoco se replica el patrón en código nuevo.

```ts
// DISEÑO PROPUESTO — política de reconciliación, dentro de ServicioKardexValorizado
// (sin cambio de algoritmo respecto a la versión anterior — se precisa la precisión exacta usada)

function calcularCostoConsumo(
  capa: CapaCostoInventario,
  cantidadAConsumir: number,
  esUltimoConsumoDeLaCapa: boolean, // cantidadAConsumir === capa.cantidadDisponible
  totalYaConsumidoDeLaCapa: number, // suma de valorConsumidoMonedaBase de consumos previos, ya redondeados a decimalPlaces(monedaBase)
): number {
  const decimales = currencyManager.getCurrency(capa.monedaBase)?.decimalPlaces ?? 2;
  if (esUltimoConsumoDeLaCapa) {
    return redondearAPrecision(capa.valorValorizableMonedaBase - totalYaConsumidoDeLaCapa, decimales);
  }
  return redondearAPrecision(cantidadAConsumir * capa.costoUnitarioBaseMonedaBase, decimales);
}
```

**Ejemplo obligatorio verificado**: valor valorizable = 10 (moneda base, `decimalPlaces=2`), cantidad = 3 → `costoUnitarioBaseMonedaBase = redondearAPrecision(10 / 3, 8) = 3.33333333`. Consumo 1 de 1 unidad: `redondearAPrecision(1 × 3.33333333, 2) = 3.33`. Consumo 2 de 1 unidad: `3.33`. Consumo 3 (último, de la unidad restante): `redondearAPrecision(10 − 3.33 − 3.33, 2) = 3.34`. Suma de consumos = `3.33 + 3.33 + 3.34 = 10.00` exactamente, sin residuo perdido ni duplicado.

### 17.4 Precisión en el contrato de backend futuro (corrección obligatoria)

Por la misma razón que se evita `toFixed()`/`number` de punto flotante en el frontend, el contrato de backend futuro (§23) **exige** columnas `DECIMAL`/`NUMERIC` (con la escala de §17.3) para costo unitario, tipo de cambio y todo valor monetario — **prohíbe explícitamente** `FLOAT`/`DOUBLE` para estos campos, porque reintroducirían exactamente el mismo problema de redondeo acumulado que este diseño resuelve en el frontend.

### 17.5 Matriz de precisión

| Concepto | Precisión interna | Redondeo | Cuándo se redondea | Fuente de la constante |
|---|---|---|---|---|
| Cantidad en unidad mínima (`cantidadInicial`/`cantidadDisponible`/`cantidadConsumida`) | 6 decimales | `redondearAPrecision(valor, 6)` | Al calcular la conversión de presentación a unidad mínima | `PRECISION_CANTIDAD_UNIDAD_MINIMA` |
| Factor de conversión (`factorConversionAplicado`) | 8 decimales | `redondearAPrecision(valor, 8)` | Al capturar el snapshot del factor | `PRECISION_FACTOR_CONVERSION` |
| Costo unitario interno (`costoUnitarioBaseOriginal`/`costoUnitarioBaseMonedaBase`) | 8 decimales | Nunca antes de persistir la capa; nunca al multiplicar por cantidad | Nunca — es un valor intermedio | `PRECISION_COSTO_UNITARIO_INTERNO` |
| Tipo de cambio (`tipoCambioAplicado`) | 8 decimales, resuelto vía `currencyManager` | Igual que costo unitario interno | Nunca — snapshot histórico | `PRECISION_TIPO_CAMBIO_ALMACENADO` |
| `valorValorizableOriginal`/`valorValorizableMonedaBase` | `decimalPlaces` de la moneda correspondiente | `normalizarImporte`/`redondearAPrecision` | Una sola vez, al crear la capa — fuente de verdad del total | `currencyManager.getCurrency(moneda).decimalPlaces` |
| `valorConsumidoMonedaBase` (no último) | `decimalPlaces` de `monedaBase` | `redondearAPrecision(cantidad × costoUnitarioBaseMonedaBase, decimalPlaces)` | Por consumo | Igual que arriba |
| `valorConsumidoMonedaBase` (último de la capa) | `decimalPlaces` de `monedaBase` | Residual: `valorValorizableMonedaBase − Σ anteriores` | Al agotar la capa | Reconciliación, evita drift |
| Valores de presentación en UI/reportes | `decimalPlaces` de la moneda | `currencyManager.formatMoney` | Al renderizar, nunca al calcular | `CurrencyDescriptor.decimalPlaces` |
| Backend futuro (todas las columnas anteriores) | Igual escala, tipo `DECIMAL`/`NUMERIC` | Definido por la columna, nunca `FLOAT`/`DOUBLE` | Igual que el frontend | Migración 1:1 de las constantes de este archivo |

---

## 18. Capas y consumo FIFO

### 18.1 Separación conceptual explícita (decisión 3.12)

| Concepto | Función existente | Qué hace realmente | Rol en el nuevo diseño |
|---|---|---|---|
| **Selección/prioridad de almacén** | `resolvealmacenesForSaleFIFO` (`stockGateway.ts:245-267`) | Ordena `Almacen[]` por `prioridadSalida`/`esAlmacenPrincipal` | Se **reutiliza sin cambios** — sigue decidiendo de qué almacén(es) se despacha |
| **Distribución de cantidad entre almacenes** | `allocateSaleAcrossalmacenes` (`stockGateway.ts:286-318`) | Reparte una cantidad solicitada entre los almacenes ya ordenados, según stock/reserva agregados | Se **reutiliza sin cambios** — sigue siendo el primer nivel de resolución (cuánto sale de cada almacén) |
| **Consumo FIFO de capas de costo** | No existe hoy | — | **Nuevo**: dentro de cada almacén asignado por `allocateSaleAcrossalmacenes`, `ServicioKardexValorizado` consume las capas de ese almacén ordenadas por `fechaEntrada` ascendente |

**Recomendación de nombres** (decisión 3.12: "las funciones actuales... deben renombrarse o quedar conceptualmente separadas"): se recomienda, en una etapa de saneamiento posterior (no bloqueante para este diseño), renombrar `resolvealmacenesForSaleFIFO` → `resolveAlmacenesPorPrioridadSalida` y `allocateSaleAcrossalmacenes` → `distribuirCantidadEntreAlmacenes`, dejando el término "FIFO" reservado exclusivamente para la nueva función de consumo de capas (`consumirCapasFIFO`, interna de `ServicioKardexValorizado`). Este renombre es un cambio de nombre de función existente (no de comportamiento) — se documenta como parte de la Etapa 1 (§34), no como bloqueante del diseño de datos.

### 18.2 Algoritmo de consumo FIFO por capas

```ts
// DISEÑO PROPUESTO — dentro de ServicioKardexValorizado, función interna

function consumirCapasFIFO(
  productoId: string,
  almacenId: string,
  cantidadUnidadMinima: number,
): { consumos: Array<{ capa: CapaCostoInventario; cantidad: number }>; cantidadCubierta: number } {
  const capasDisponibles = obtenerCapasDisponibles(productoId, almacenId)
    .filter(c => c.estado === 'disponible' && c.cantidadDisponible > 0)
    .sort((a, b) => new Date(a.fechaEntrada).getTime() - new Date(b.fechaEntrada).getTime()); // FIFO real

  let restante = cantidadUnidadMinima;
  const consumos: Array<{ capa: CapaCostoInventario; cantidad: number }> = [];

  for (const capa of capasDisponibles) {
    if (restante <= 0) break;
    const tomar = Math.min(restante, capa.cantidadDisponible);
    if (tomar > 0) {
      consumos.push({ capa, cantidad: tomar });
      restante -= tomar;
    }
  }

  return { consumos, cantidadCubierta: cantidadUnidadMinima - restante };
}
```

**Invariante de bloqueo**: si `cantidadCubierta < cantidadUnidadMinima` (no hay capas suficientes en ese almacén, aunque `stockPorAlmacen` diga que sí hay cantidad — señal de desalineación entre cantidad y capas, ver riesgo R-01 §33), la operación **completa** se aborta (no se aplica un consumo parcial) — esto es más estricto que el comportamiento actual de `descontarStockParaDocumento`, que hoy aplica lo que alcance sin error (hallazgo §5.4).

### 18.3 Ejemplo obligatorio verificado

- Entrada 1: 10 unidades a costo interno 10 → `CapaCostoInventario` A: `cantidadInicial=10, cantidadDisponible=10, costoUnitarioBaseMonedaBase=10`.
- Entrada 2: 10 unidades a costo interno 12 → `CapaCostoInventario` B: `cantidadInicial=10, cantidadDisponible=10, costoUnitarioBaseMonedaBase=12`, `fechaEntrada` posterior a la de A.
- Salida: 12 unidades.
  - `consumirCapasFIFO` ordena [A, B] por fecha → toma 10 de A (`restante=2`), luego 2 de B (`restante=0`).
  - `ConsumoCapaCostoInventario` #1: `capaId=A, cantidadConsumida=10, valorConsumidoMonedaBase=100` (A queda agotada: `cantidadDisponible=0`, `estado='agotada'`, y por regla de reconciliación §17.3 este es el único/último consumo de A, así que `valorConsumidoMonedaBase = valorValorizableMonedaBase(A) − 0 = 100`, coincide con `10×10` de todas formas al no haber drift en este caso).
  - `ConsumoCapaCostoInventario` #2: `capaId=B, cantidadConsumida=2, valorConsumidoMonedaBase=24` (B queda con `cantidadDisponible=8`, `estado='disponible'`).
  - Costo total de la salida = `100 + 24 = 124` ✅ (coincide exactamente con el ejemplo obligatorio del encargo).
  - Remanente: 8 unidades de la capa B a costo 12 ✅.

### 18.4 Distribución entre varios almacenes

Cuando una venta se distribuye entre 2+ almacenes (vía `allocateSaleAcrossalmacenes`), `consumirCapasFIFO` se ejecuta **una vez por almacén asignado**, de forma independiente — las capas de un almacén nunca se consumen para cubrir la cantidad asignada a otro almacén. Esto es consistente con la decisión 3.15 ("capas FIFO por... almacén").

### 18.5bis Valor remanente exacto de una capa (corrección obligatoria — cuarta pasada)

**El valor disponible de una capa NO se calcula multiplicando `cantidadDisponible × costoUnitarioBaseMonedaBase`.** Esa multiplicación es un control auxiliar de sanidad (debe estar razonablemente cerca), pero **nunca** la fuente canónica — porque los consumos parciales ya absorbieron su residuo de redondeo contra `valorValorizableMonedaBase` (§17.3), y recalcular multiplicando introduciría de vuelta exactamente el drift que la reconciliación de §17.3 existe para evitar. La fuente canónica es siempre derivada de los consumos reales:

```ts
// DISEÑO PROPUESTO — gestion-inventario/utilidades/valorCapaInventario.ts (o dentro de servicioKardexValorizado.ts)

export function calcularValorDisponibleCapa(capa: CapaCostoInventario, consumos: ConsumoCapaCostoInventario[]): number {
  const valorConsumidoTotal = consumos
    .filter((c) => c.capaId === capa.id && c.estado === 'confirmado')
    .reduce((acc, c) => acc + c.valorConsumidoMonedaBase, 0);
  return redondearAPrecision(capa.valorValorizableMonedaBase - valorConsumidoTotal, decimalPlaces(capa.monedaBase));
}
```

**Reglas**: (a) `valorInicial = valorConsumido + valorDisponible`, siempre, por construcción de la reconciliación de §17.3 (el último consumo absorbe exactamente el residuo); (b) capa nueva → `valorDisponible = valorValorizableMonedaBase` (cero consumos); (c) capa agotada (`estado='agotada'`) → `valorDisponible = 0` exacto, nunca un residuo de punto flotante cercano a cero; (d) un reverso de consumo (§20.3) restaura exactamente `consumo.valorConsumidoMonedaBase` — nunca recalcula multiplicando cantidad por costo actual; (e) una transferencia (§19.1) traslada el valor exacto tomado del consumo de la capa origen, no un valor recalculado en destino; (f) el reporte de inventario valorizado (§27.4, §30) debe reconciliar: `Σ calcularValorDisponibleCapa` de todas las capas disponibles de un producto **debe** coincidir con `obtenerValorStock` — cualquier divergencia entre ambos indica un error de cálculo, no una redondeo aceptable. **No se agrega un campo persistido `valorDisponibleMonedaBase` en `CapaCostoInventario`** — mantenerlo como valor derivado, no un segundo contador que pueda desincronizarse de `cantidadDisponible`, es coherente con "cero fuentes de verdad paralelas" (Estándares técnicos); si el volumen de consultas lo justifica en el futuro, puede proyectarse como campo cacheado **siempre reconciliable** contra esta fórmula, nunca como fuente alterna.

### 18.5 Claves de las capas

`empresaId` (campo explícito en `CapaCostoInventario`, no inferido del namespace de `localStorage` — ver corrección de §6: el namespace de `lsKey()` es una protección adicional, no un sustituto del identificador de empresa en el dato) + `establecimientoId` + `productoId` + `almacenId` — los 4 componentes de la clave de agrupación FIFO, tal como pide la decisión 3.15. Toda consulta de capas disponibles (`obtenerCapasDisponibles`, §18.2) filtra por estos 4 campos explícitamente — nunca por 3, confiando en que el namespace ya excluyó otras empresas.

---

## 19. Transferencias

### 19.1 Diseño

```
Transferencia (origen A → destino B), cantidad Q
  1. consumirCapasFIFO(productoId, almacenOrigenId=A, cantidadUnidadMinima=Q)
     → ConsumoCapaCostoInventario[] con motivo 'TRANSFERENCIA', movimientoSalidaId = movimiento SALIDA en A
  2. Por cada consumo (capaOrigen, cantidadTomada):
     → crear CapaCostoInventario nueva en B:
         cantidadInicial = cantidadTomada
         cantidadDisponible = cantidadTomada
         costoUnitarioBaseMonedaBase = capaOrigen.costoUnitarioBaseMonedaBase   (SIN recalcular)
         monedaOriginal = capaOrigen.monedaOriginal               (conservada)
         costoUnitarioBaseOriginal = capaOrigen.costoUnitarioBaseOriginal (conservada)
         tipoCambioAplicado = capaOrigen.tipoCambioAplicado       (conservado)
         fechaEntrada = capaOrigen.fechaEntrada                    (NO la fecha de la transferencia — conserva antigüedad FIFO real)
         capaOrigenId = capaOrigen.id                              (lineage)
         procedencia = 'transferencia'
  3. movimiento ENTRADA en B, con capaId apuntando a la(s) nueva(s) capa(s) creada(s)
  4. Transferencia.capasOrigenIds / capasDestinoIds poblados (nuevo campo, §10.8)
```

- **No revaloriza**: `costoUnitarioBaseMonedaBase` viaja sin cambios.
- **No usa `precioCompra`**: no interviene en absoluto en este flujo.
- **No genera utilidad ni costo de venta**: una transferencia no es una salida de negocio, es un movimiento interno — no se crea ningún registro de "costo de venta" ni de margen.
- **Conserva fecha y procedencia**: `fechaEntrada` de la nueva capa es la de la capa original, preservando el orden FIFO correcto en el almacén destino (una unidad transferida no "rejuvenece" su antigüedad).

> **La capa trasladada conserva la fecha de adquisición original para el orden FIFO. La fecha de transferencia se conserva como evento de trazabilidad, pero no rejuvenece la antigüedad económica de la capa.**

Concretamente: `CapaCostoInventario.fechaEntrada` (nueva, en destino) = `capaOrigen.fechaEntrada` (fecha de adquisición original, la que determina el orden FIFO en B); `CapaCostoInventario.fechaCreacion` (nueva, en destino) = momento real en que se ejecuta la transferencia (evento de trazabilidad — cuándo se creó esta fila, no de qué antigüedad económica goza). Ambas fechas se conservan, con roles distintos y ninguna sustituye a la otra.

**Linaje completo conservado** (ningún campo es opcional a omitir):

| Dato de linaje | Dónde vive |
|---|---|
| Empresa | `CapaCostoInventario.empresaId` (idéntico en origen y destino — una transferencia nunca cruza empresas) |
| Capa de origen | `CapaCostoInventario.id` (la que se consume en A) |
| Capa de destino | `CapaCostoInventario.id` (la nueva en B) ↔ `capaOrigenId` apunta hacia atrás a la de origen |
| Movimiento de salida | `MovimientoStock` (tipo `SALIDA`, motivo `TRANSFERENCIA_ALMACEN`) en A |
| Movimiento de entrada | `MovimientoStock` (tipo `ENTRADA`) en B, con `movimientoRelacionadoId` apuntando al de salida (campo ya existente, reutilizado) |
| Fecha original (adquisición) | `fechaEntrada` (conservada, ver declaración arriba) |
| Fecha de transferencia (evento) | `fechaCreacion` de la capa nueva + `fecha` del `MovimientoStock` de entrada |
| Cantidad | `cantidadTomada` = `ConsumoCapaCostoInventario.cantidadConsumida` en A = `CapaCostoInventario.cantidadInicial` en B |
| Costo | `costoUnitarioBaseMonedaBase`/`costoUnitarioBaseOriginal`/`monedaOriginal`/`tipoCambioAplicado` — idénticos entre origen y destino, sin recalcular |

### 19.2 Reverso de transferencia

Revertir una transferencia **solo es posible si la capa derivada en destino sigue disponible** (`cantidadDisponible === cantidadInicial` en B, misma regla que cualquier reverso de entrada, §20.2) — si parte ya se vendió/transfirió de nuevo desde B, se bloquea (ver §20.6 para el escenario simétrico: anular la entrada **original** en A cuando ya hubo una transferencia hacia B). Cuando es seguro:

1. Restaurar el almacén de origen: incrementar `cantidadDisponible` de la(s) capa(s) de A que la transferencia había consumido, exactamente por `ConsumoCapaCostoInventario.cantidadConsumida` — mismo costo, sin recalcular.
2. Marcar como `'revertida'` la(s) capa(s) creadas en B por la transferencia.
3. Generar movimientos de reverso (`AJUSTE_POSITIVO` en A, `AJUSTE_NEGATIVO` en B) enlazados a los movimientos originales vía `movimientoReversoDeId` — **nunca se editan ni se borran** los movimientos originales de la transferencia.

### 19.3 Escenarios de prueba obligatorios (referencia — desarrollo completo en §36)

- Transferencia parcial de una sola capa de origen (la cantidad solicitada es menor que `cantidadDisponible` de la capa de origen).
- Transferencia que consume varias capas de origen (FIFO reparte entre 2+ capas, generando 2+ capas nuevas en destino).
- Reverso de una transferencia sin consumo posterior en destino (caso normal, siempre permitido).
- Intento de reverso después de que la capa de destino ya fue consumida (venta desde B) — debe bloquearse con el mismo mensaje explicativo que cualquier reverso de entrada bloqueado (§20.2).

---

## 20. Reversos y anulaciones

### 20.1 Principio general (decisión 3.11)

Ninguna operación confirmada se edita o elimina — toda anulación genera un **reverso nuevo**, trazable, que usa cantidad y costo **originales**.

### 20.2 Revertir una ENTRADA (anular NI, ajuste positivo, importación, migración)

```ts
// DISEÑO PROPUESTO
function revertirEntrada(capaId: string): void {
  const capa = obtenerCapa(capaId);
  if (capa.cantidadDisponible !== capa.cantidadInicial) {
    throw new Error(
      'No se puede anular: parte de esta entrada ya fue consumida (venta, salida o transferencia). ' +
      'Bloqueado para no dejar stock negativo ni recalcular costos.'
    );
  }
  // capa.cantidadDisponible === capa.cantidadInicial → nada la ha tocado, es seguro revertir
  marcarCapaComoRevertida(capa);
  crearMovimientoReverso(capa.movimientoEntradaId, tipo: 'AJUSTE_NEGATIVO', motivo: original.motivo);
}
```

Esto **reemplaza** la validación actual de `anularNIEnInventario` (`notaIngreso.service.ts:151-164`), que hoy compara `stockActual < linea.cantidad` (cantidad **agregada** del almacén, no de la capa específica) — la nueva validación es más precisa: compara la capa **específica** que esa NI creó, no el stock total del almacén (que puede incluir cantidad de otras entradas). Esto cierra una brecha silenciosa: hoy, si el stock agregado del almacén alcanza (porque hay otra entrada más reciente cubriendo la diferencia), `anularNIEnInventario` permite la anulación aunque la entrada específica de esa NI ya se haya vendido — con capas, esto ya no puede ocurrir porque se valida la capa exacta, no el agregado.

### 20.3 Revertir una SALIDA (anular venta, NS, ajuste negativo)

```ts
// DISEÑO PROPUESTO
function revertirSalida(movimientoSalidaId: string): void {
  const consumos = obtenerConsumosPorMovimiento(movimientoSalidaId)
    .filter(c => c.estado === 'confirmado');

  for (const consumo of consumos) {
    const capa = obtenerCapa(consumo.capaId);
    incrementarCantidadDisponible(capa, consumo.cantidadConsumida); // misma capa, mismo costo — nunca se crea una capa nueva
    if (capa.estado === 'agotada') marcarCapaComoDisponible(capa);
    marcarConsumoComoRevertido(consumo);
  }
  crearMovimientoReverso(movimientoSalidaId, tipo: 'AJUSTE_POSITIVO', motivo: original.motivo);
}
```

Revertir una salida **siempre es posible** (a diferencia de revertir una entrada) porque las unidades no desaparecieron del sistema — simplemente se les devuelve su disponibilidad en la(s) misma(s) capa(s) de las que salieron, al costo histórico exacto que ya tenían. **Sin recálculo**: el costo de la capa nunca se toca, solo su `cantidadDisponible`/`estado`.

### 20.4 Unidades transferidas pero no consumidas

Si la salida original (venta) fue de un almacén B al que llegaron unidades por transferencia desde A, y esas unidades **no fueron consumidas** en B (siguen como capa disponible, ahora con más disponibilidad tras el reverso de venta): revertir la venta es igual que 20.3, sin relación con la transferencia. **El caso que sí bloquea** es revertir la **transferencia** cuando las unidades transferidas ya se vendieron desde B — ese caso usa la misma regla de 20.2 (capa de destino con `cantidadDisponible !== cantidadInicial` → bloqueo), aplicada a la capa creada en B por la transferencia.

### 20.5 Casos por documento

| Operación a anular | Estrategia | Puede bloquearse si... |
|---|---|---|
| Editar CC antes de ingresar inventario | Sin cambio — edición normal de documento en estado `'registrado'`/`estadoInventario='pendiente'` | Nunca (no hay stock/capa involucrada aún) |
| Editar CC después de ingresar inventario | **No permitido** en este diseño — el CC queda de solo-lectura para campos que afecten costo/cantidad una vez `estadoInventario !== 'pendiente'` (mismo patrón que hoy bloquea edición tras estados avanzados) | Siempre, si ya hay NI generada |
| Anular CC | Bloqueado si tiene NI relacionada activa (regla ya existente, `motivoBloqueoAnulacionCC`, ahora con datos reales por fin) | NI activa relacionada |
| Anular NI | §20.2 | Capa parcial o totalmente consumida |
| Anular venta (cualquier canal) | §20.3 | Nunca — siempre reversible (no hay "consumo del consumo") |
| Anular NS | §20.3 | Nunca |
| Revertir ajuste | §20.2 (positivo) / §20.3 (negativo) | Positivo: si se consumió. Negativo: nunca |
| Devolver mercadería al proveedor | §20.8 | Cantidad devuelta > disponible (§20.8) |
| Nota de crédito de compra (frontera funcional) | §20.9 | — |
| Anulación de compra después de transferencia | §20.6 | Linaje con transferencias no revertidas |

### 20.6 Anulación después de transferencia (completa el caso simétrico de §19.2)

Si se intenta anular la **entrada original** (NI/ajuste) de una capa en el almacén A, pero parte o toda esa capa **ya fue transferida** hacia uno o más almacenes destino (`capaOrigenId` de otras capas apuntando a esta), la validación no puede limitarse a comparar `cantidadDisponible` de la capa en A (que ya reflejaría la salida por transferencia como consumo) — debe **localizar el linaje completo**:

```ts
// DISEÑO PROPUESTO
function validarAnulacionConLinaje(capaId: string): void {
  const capa = obtenerCapa(capaId);
  const capasDerivadas = buscarCapasPorCapaOrigenId(capaId); // todas las transferencias que salieron de esta capa

  if (capa.cantidadDisponible !== capa.cantidadInicial) {
    if (capasDerivadas.length === 0) {
      // No hay transferencias — el consumo fue una venta/salida directa (regla ya cubierta en §20.2)
      throw new Error('No se puede anular: parte de esta entrada ya fue consumida.');
    }
    const derivadasConConsumo = capasDerivadas.filter(d => d.cantidadDisponible !== d.cantidadInicial);
    if (derivadasConConsumo.length > 0) {
      throw new Error(
        `No se puede anular directamente: parte de esta entrada fue transferida y ya se consumió en destino. ` +
        `Revierte primero estas transferencias: ${derivadasConConsumo.map(d => d.documentoOrigenId).join(', ')}.`
      );
    }
    // Todas las capas derivadas siguen íntegras (nadie las consumió en destino) — se puede
    // revertir cada transferencia (§19.2) y LUEGO anular la entrada original, en ese orden.
    throw new Error(
      `Esta entrada fue transferida. Para anularla, primero revierte la(s) transferencia(s): ` +
      `${capasDerivadas.map(d => d.documentoOrigenId).join(', ')}.`
    );
  }
  // Sin transferencias ni consumo — anulación directa, §20.2.
}
```

**No se bloquea de forma genérica** ("no se puede anular porque hay una transferencia") — se analiza el linaje completo y, si las capas derivadas siguen íntegras, se indica exactamente qué transferencias revertir primero, permitiendo luego la anulación de la entrada original.

### 20.7 Devolución del cliente (con y sin evidencia histórica)

**Con venta vinculada y consumos históricos disponibles** (venta posterior a la activación de valorización, con `consumosCapaIds` persistidos en la línea de venta, §26): la entrada de devolución **debe usar exactamente el costo histórico** de lo que se devuelve — se localizan los `ConsumoCapaCostoInventario` originales de esa línea de venta y:

- Si se devuelve la **cantidad completa** vendida: se reconstruye una entrada con el mismo costo ponderado que tuvo la salida (si la venta consumió una sola capa, el costo es el de esa capa; si consumió varias, se reconstruye **proporcionalmente** entre ellas).
- Si se devuelve una **cantidad parcial**: se reconstruye proporcionalmente respetando el orden en que se consumieron las capas originales — la porción devuelta "recupera" primero el costo de la capa que se consumió primero en la venta original (consistente con que la devolución física típicamente corresponde a las últimas unidades entregadas, pero el diseño no asume esto — usa proporción ponderada por defecto salvo que el flujo de devolución permita al usuario indicar de qué capa específica proviene físicamente).

```ts
// DISEÑO PROPUESTO
function calcularCostoDevolucionCliente(
  consumosOriginales: ConsumoCapaCostoInventario[], // de la línea de venta original
  cantidadDevuelta: number,
): { costoUnitarioBaseMonedaBase: number; capasReconstruidas: Array<{ capaId: string; cantidad: number }> } {
  // Reconstrucción proporcional: por cada consumo original, la fracción que corresponde a
  // cantidadDevuelta se re-ingresa a LA MISMA capa (si sigue existiendo y no fue purgada) con
  // el mismo costo — NUNCA con "último costo", "costo FIFO actual" ni Product.precioCompra.
}
```

**No usar último costo, no usar costo FIFO actual (de las capas vigentes hoy), no usar `precioCompra`, y no solicitar un costo manual al usuario cuando existe evidencia histórica** — el flujo de devolución con evidencia no muestra un campo de costo editable, muestra el costo ya reconstruido, de solo lectura.

**Sin evidencia histórica** (venta anterior a la activación de valorización, o `consumosCapaIds` ausente): flujo **excepcional**, distinto del anterior — el sistema no reconstruye nada, presenta un campo de costo manual obligatorio, y la capa resultante queda marcada `procedencia` con un origen que la distingue como estimada (no se presenta como "costo real reconstruido" en ningún reporte).

### 20.8 Devolución al proveedor

Se modela como salida valorizada (`registrarSalidaValorizada`, `tipoDocumentoOrigen` motivo `DEVOLUCION_PROVEEDOR`) que **consume o revierte las capas originadas por esa compra específica** (localizadas por `documentoOrigenId` = la NI de esa compra):

- Si la capa de esa compra sigue **íntegra** (`cantidadDisponible === cantidadInicial`): la devolución sale exactamente al mismo costo — no hay diferencia funcional con revertir la entrada (§20.2), salvo que aquí se modela como salida (el proveedor "recibe" físicamente la mercadería) en vez de como reverso puro.
- Si **parte ya fue vendida**: se bloquea devolver una cantidad superior a `cantidadDisponible` de esa capa específica; se permite devolver únicamamente la cantidad remanente, si funcionalmente corresponde (decisión de negocio a confirmar con Producto — el diseño lo deja preparado, no lo fuerza).
- El costo de la devolución siempre es el de la capa original de esa compra — nunca un costo distinto.

### 20.9 Nota de crédito de compra — frontera funcional (sin desarrollar el módulo completo)

No se desarrolla el flujo completo en este MVP (no estaba entre las 16 decisiones aprobadas), pero se aclara la frontera para no dejar una contradicción con §20.8:

- **Nota de crédito financiera sin devolución física** (ej. descuento posterior, corrección de precio): no cambia stock, no toca `ServicioKardexValorizado` en absoluto — es puramente un ajuste de Cuentas por Pagar (ya desacoplado, decisión 3.16).
- **Nota de crédito con devolución física de mercadería**: **debe** relacionarse con el flujo de devolución al proveedor (§20.8) — no es un flujo paralelo ni contradictorio; una NC de compra con devolución física simplemente aporta el documento tributario que acompaña a la misma operación de salida valorizada ya diseñada en §20.8.
- Lo que queda fuera de este MVP es la generación/gestión del documento tributario de la NC de compra en sí (numeración, relación formal con SUNAT, etc.) — no el efecto sobre inventario, que ya está cubierto.

---

## 21. Idempotencia

### 21.1 Por qué el booleano `isProcessing` no basta (evidencia, §5.6)

Confirmado con el cuerpo completo del código: `isProcessing` es estado de React, leído del closure del render en curso (`usePosComprobanteFlow.ts`, guard en `handleCrearComprobante`) — dos invocaciones disparadas en el mismo tick (antes del primer re-render) leen ambas `false` y ambas pasan. Además, `numeroComprobante` (la única referencia "natural" disponible) es `Math.random()` (`useComprobanteActions.tsx:347`) generado **sin relación** con ninguna clave de idempotencia. La protección debe existir en el dominio, no en la UI.

### 21.2 Corrección obligatoria: hash de entrada, estado, y `resultadoIds[]`

La versión anterior de este diseño modelaba `OperacionIdempotenteInventario` con `resultadoId: string` (singular) y sin estado ni hash — insuficiente por tres razones concretas: (a) una entrada genera típicamente **más de un** resultado (un movimiento + una capa; o un movimiento + N consumos) — un campo escalar pierde información; (b) sin hash de la entrada, un reintento con **datos distintos** bajo la misma clave (ej. el usuario corrigió la cantidad y volvió a enviar con el mismo `documentoVentaId`) se confundiría con un reintento legítimo y devolvería un resultado incorrecto; (c) sin estado, no hay forma de distinguir "en curso" (recuperable, §22.3) de "confirmada" (definitiva).

El modelo corregido ya está definido en §9.5 (`OperacionIdempotenteInventario` con `estado`, `hashEntrada`, `resultadoIds: string[]`, `transaccionInventarioId`). El flujo de verificación:

```ts
// DISEÑO PROPUESTO — dentro de prepararOperacionInventario (§12.2), primer paso
function verificarIdempotencia(
  empresaId: string,
  clave: string,
  hashEntrada: string,
): { resultado: 'nueva' } | { resultado: 'repetida'; operacion: OperacionIdempotenteInventario } {
  const previa = RepositorioOperacionesIdempotentesInventario.buscarPorEmpresaYClave(empresaId, clave);

  if (!previa) return { resultado: 'nueva' };

  if (previa.estado === 'confirmada') {
    if (previa.hashEntrada === hashEntrada) {
      return { resultado: 'repetida', operacion: previa }; // reintento legítimo — mismos datos
    }
    throw new ConflictoIdempotencia(
      `La clave "${clave}" ya fue usada con datos distintos. No se reprocesa: revisa si esta es ` +
      `una operación nueva que necesita una clave distinta, o corrige el conflicto manualmente.`
    );
  }

  // estado 'preparada' o 'confirmando': una TransaccionInventario quedó a medias — no es un caso
  // de idempotencia normal, es un caso de recuperación (§22.3). prepararOperacionInventario delega
  // a la rutina de recuperación antes de continuar; nunca ignora este estado ni reprocesa a ciegas.
  return recuperarTransaccionInterrumpida(empresaId, previa);
}
```

**Regla explícita**: mismo `(empresaId, clave)` + mismo `hashEntrada` ⇒ se devuelve el resultado previo, cero efectos nuevos. Mismo `(empresaId, clave)` + `hashEntrada` distinto ⇒ error de conflicto — **nunca** se construye ni se devuelve un resultado silenciosamente a partir de una entrada diferente a la que originó la clave.

`hashEntrada` se calcula (SHA-256, o equivalente disponible en el runtime del navegador vía `crypto.subtle.digest`) sobre una serialización canónica (claves ordenadas, sin espacios) de los campos de negocio del `Datos*` de entrada — cantidad, costo, moneda, documentoOrigenId, línea, etc. — excluyendo metadatos como `usuario`/`fecha` que no cambian el efecto de la operación.

### 21.3 Corrección obligatoria: clave estable para ventas (no un UUID por intento)

La versión anterior proponía `VENTA-${operationId}` con `operationId = crypto.randomUUID()` generado **en cada intento** de emisión — esto es, en la práctica, no-idempotente: dos intentos del mismo documento de venta (doble click, reintento tras error, recarga) generan dos UUID distintos y por tanto dos claves distintas, exactamente el problema que se pretendía resolver.

**Corrección**: la clave se deriva de un identificador **interno, persistente, del propio documento o proceso de emisión** — no de un valor generado en el momento del intento:

```
VENTA-STOCK-${documentoVentaId}
```

`documentoVentaId` es el id interno que el flujo de emisión ya crea y persiste **antes** de mutar inventario (el borrador de comprobante/NV, con su propio `id` de aplicación — no el `numeroComprobante` simulado con `Math.random()`, que se genera más tarde y no es estable). Este id:

- se crea y persiste (aunque sea en estado `'borrador'`) en el primer paso del flujo de emisión, antes de cualquier `await` hacia el motor de inventario;
- sobrevive: doble clic (el segundo clic reutiliza el mismo `documentoVentaId` porque el borrador ya existe), recarga de página (el borrador persistido se recupera), reintento tras error (se reintenta con el mismo id), caída del navegador (igual), respuesta externa tardía (la clave no depende de la respuesta), reanudación (la clave ya existe, se reutiliza).
- Dos clics **no pueden** crear dos claves distintas para el mismo documento — la clave depende del documento, no del intento.

Esto reemplaza toda mención anterior de `operationId`/`VENTA-${operationId}` generado por intento.

### 21.4 Matriz completa de claves por operación

| Operación | Clave | Generador / origen |
|---|---|---|
| Creación de NI automática (CC → NI) | `NI-AUTO-${comprobanteCompraId}` | Determinística — `comprobanteCompraId` ya persistido al registrar el CC |
| Confirmación de NI (manual o automática) | `NI-CONFIRM-${notaIngresoId}` | Determinística — `notaIngresoId` ya persistido en estado `'Borrador'` |
| Ajuste positivo | `AJUSTE-POS-${ajusteId}` | Determinística — `ajusteId` generado al crear el borrador del ajuste, antes de confirmar |
| Ajuste negativo | `AJUSTE-NEG-${ajusteId}` | Igual que arriba |
| Nota de Salida | `NS-${notaSalidaId}` | Determinística — `notaSalidaId` ya persistido en `'Borrador'` (mismo patrón que NI) |
| Venta (Factura/Boleta/POS/NV) | `VENTA-STOCK-${documentoVentaId}` | Determinística — ver §21.3, nunca un UUID por intento |
| Importación | `IMPORT-${loteImportacionId}` | Determinística — `loteImportacionId` (`LoteImportacionValorizada.id`) generado al abrir el panel, antes de previsualizar |
| Transferencia | `TRANSFER-${transferenciaId}` | Determinística — con generación de `id` corregida para evitar colisión por timestamp (§10.8) |
| Anulación (de cualquier documento) | `ANULACION-${tipoDocumento}-${documentoId}` | Determinística |
| Reverso (de un movimiento específico) | `REVERSO-${movimientoId}` | Determinística — un movimiento solo puede tener un reverso |
| Devolución de cliente | `DEVOL-CLIENTE-${devolucionId}` | Determinística — `devolucionId` propio del flujo de devolución, persistido antes de mutar inventario |
| Devolución al proveedor | `DEVOL-PROVEEDOR-${devolucionId}` | Igual que arriba |
| Valorización inicial (activación) | `VALORIZACION-INICIAL-${valorizacionInicialInventarioId}` | Determinística — un solo intento de activación por lote |

### 21.5 Matriz de idempotencia (escenario → mecanismo)

| Escenario a prevenir | Mecanismo | Capa donde se aplica |
|---|---|---|
| Doble NI automática desde el mismo CC | Clave `NI-AUTO-${ccId}`, mismo hash ⇒ resultado previo | `prepararOperacionInventario` |
| Doble confirmación de la misma NI | Clave `NI-CONFIRM-${niId}` + estado `'Generada'` ya existente como guard adicional (`notaIngreso.service.ts:52-54`, primera línea de defensa) | Doble: guard de estado existente + `OperacionIdempotenteInventario` |
| Doble entrada de stock (mismo lote de importación reprocesado) | Clave `IMPORT-${loteId}` | `prepararOperacionInventario` (por fila) |
| Doble descuento por venta (doble click/doble submit/recarga) | Clave `VENTA-STOCK-${documentoVentaId}`, estable por documento (§21.3) | `prepararOperacionInventario` |
| Reintento con mismo hash | Se devuelve `resultadoIds` previo, cero escrituras nuevas | `verificarIdempotencia` |
| Reintento con hash distinto bajo la misma clave | `ConflictoIdempotencia` — error explícito, nunca se reprocesa en silencio | `verificarIdempotencia` |
| Doble consumo FIFO | Consecuencia directa de "doble descuento" — mismo mecanismo | Igual que arriba |
| Doble reverso (anular dos veces) | Clave `REVERSO-${movimientoId}` + estado del documento (`'Anulada'` ya bloquea reintento a nivel de guard existente) | Doble: guard de estado + `OperacionIdempotenteInventario` |
| Doble transferencia | Clave `TRANSFER-${id}` (con generación de `id` corregida para evitar colisión por timestamp) | `prepararOperacionInventario` |
| Doble devolución (cliente o proveedor) | Clave `DEVOL-CLIENTE-${id}`/`DEVOL-PROVEEDOR-${id}` | `prepararOperacionInventario` |
| Doble activación de valorización | Clave `VALORIZACION-INICIAL-${id}` | `prepararOperacionInventario` |

---

## 22. Consistencia transaccional lógica en localStorage

### 22.0 Corrección obligatoria: no se llama "atomicidad real" a varias escrituras consecutivas

La versión anterior describía "leer → validar → calcular → escribir síncrono, ledger al final" y admitía que, si una escritura fallaba a mitad de camino, el resultado era "datos parciales para revisión manual". Eso **no es una estrategia de recuperación** — es una promesa de atomicidad que el propio texto reconocía no poder cumplir. Se corrige el diseño completo: se elimina toda mención de "atomicidad real" sobre `localStorage`, y "revisión manual" deja de ser la respuesta ante un fallo. Las expresiones correctas para este documento, de aquí en adelante, son **consistencia transaccional lógica**, **operación recuperable** y **diario de recuperación** — nunca "transacción real" (esa solo existe en el backend futuro, §23).

### 22.1 Alternativas evaluadas

**Alternativa A — Guardar todo el agregado de Inventario en una única clave de `localStorage`.** Un solo `setItem` por operación (todo movimientos + capas + consumos + ledger serializados como un único blob JSON), lo que elimina el riesgo de "escritura N de M falla" porque solo hay una escritura.

**Alternativa B — Diario transaccional recuperable** (`TransaccionInventario`, §9.6): cada operación se registra primero como intención (`preparada`), luego se aplican las escrituras de dominio, y solo al final se marca `confirmada`. Si el proceso se interrumpe, el diario permite **detectar y completar o revertir** la operación de forma determinística al reiniciar.

| Criterio | A (agregado único) | B (diario transaccional) |
|---|---|---|
| Tamaño de la escritura | Un blob que crece sin límite con todo el historial de movimientos, capas y consumos de la empresa — cada operación reescribe **todo** el agregado, no solo lo nuevo | Cada operación escribe solo sus propias claves nuevas; el diario es la única pieza que crece con el historial de transacciones, pero puede archivarse/purgarse (§22.2, paso 9) |
| Rendimiento con volumen creciente | Degrada linealmente con el tamaño total del historial — cada operación nueva paga el costo de serializar TODO de nuevo | Cada operación paga solo el costo de sus propias escrituras — no reserializa el historial completo |
| Recuperación tras interrupción | Binaria: o el `setItem` del blob completo se hizo o no se hizo — no hay forma de saber "a qué paso lógico llegó" porque no hay pasos, es una sola escritura (en teoría más simple, pero solo funciona si el navegador garantiza que un único `setItem` de un blob grande es atómico a nivel de motor, lo cual **no está garantizado** por la especificación de `localStorage` para valores grandes) | El diario registra explícitamente `preparada`→`confirmando`→`confirmada`, permitiendo saber exactamente qué se alcanzó a escribir y decidir determinísticamente cómo completar o revertir |
| Riesgo de cuota (`QuotaExceededError`) | Alto — un solo blob que contiene todo el historial de la empresa puede exceder la cuota de `localStorage` (típicamente 5-10 MB) mucho antes que escrituras incrementales pequeñas | Bajo — cada transacción escribe un registro pequeño; el riesgo de cuota se administra por purga/archivado del diario (§22.2, paso 9), no por el tamaño del historial completo |
| Multi-pestaña | Cualquier pestaña que escriba el blob completo **sobrescribe** los cambios que otra pestaña haya hecho mientras tanto (peor que hoy: hoy cada repositorio ya hace read-modify-write de su propia colección, pero un agregado único junta TODAS las colecciones en una sola clave, ampliando la superficie de colisión) | El riesgo de multi-pestaña se mantiene acotado a las claves específicas que cada transacción declara en `clavesAfectadas` — no mejora el problema de fondo (sigue sin haber lock real), pero no lo empeora agregando más superficie de colisión |
| Migración a backend | Un agregado único no tiene análogo natural en una base de datos relacional/documental normalizada — habría que "deshacer" el blob en tablas | El diario transaccional **es** literalmente el patrón que un backend real implementaría con una tabla de transacciones + `BEGIN`/`COMMIT` — migración directa (§23) |

**Decisión: Alternativa B (diario transaccional).** El análisis no muestra ningún escenario donde el agregado único sea más seguro o viable para el volumen actual — al contrario, agrava el riesgo de cuota y de colisión multi-pestaña al concentrar todo en una sola clave, y no tiene un camino de migración natural a backend.

### 22.1bis Control optimista de concurrencia obligatorio (corrección obligatoria — cuarta pasada)

El diario transaccional (§22.1/§22.2) resuelve la recuperación tras interrupción, pero no, por sí solo, la colisión entre dos pestañas operando la misma empresa **al mismo tiempo**. Se agrega un control obligatorio, en dos capas — ninguna de las dos es opcional, y ninguna se presenta como garantía absoluta por sí sola:

1. **Bloqueo cooperativo (`navigator.locks`, cuando el runtime lo soporta)**: `reservarOperacionIdempotente` (§12.1bis) obtiene un lock por `(empresaId, clave)` antes de leer/escribir la fila de idempotencia — reduce la ventana de colisión entre dos intentos con la **misma** clave. **No se presenta como garantía universal**: si el navegador no soporta `navigator.locks`, la reserva procede sin lock, y la validación real recae por completo en el paso 2.
2. **Versión obligatoria (`EstadoVersionInventario`, §9.6bis)**: `prepararOperacionInventario` lee `versionEsperada`; `confirmarOperacionInventario` la revalida antes de escribir (§12.3, paso 4). Esta es la validación que **sí** se cumple siempre, con o sin `navigator.locks` — es la que efectivamente detecta el conflicto antes del commit, no una garantía basada en una API opcional del navegador.

`BroadcastChannel`/evento `storage` (cuando estén disponibles) se usan como **notificación complementaria** — informan a otras pestañas que la versión cambió, para que puedan refrescar su UI o recalcular un plan en curso proactivamente — pero **nunca** son el mecanismo que decide si una escritura procede; esa decisión la toma siempre el chequeo de versión del paso 11 de la secuencia única (§22.2).

**Backend futuro (§23)**: el control optimista de versión es exclusivamente una mitigación de prototipo sobre `localStorage`; un backend real resuelve la concurrencia con transacciones de base de datos (`SELECT ... FOR UPDATE` o equivalente) — la columna `version_inventario` puede conservarse como optimistic lock adicional incluso con backend real, pero deja de ser la única defensa.

**Riesgo residual reconocido**: incluso con ambas capas, `localStorage` no ofrece una transacción real entre "leer versión" y "escribir" — el control optimista de versión hace el conflicto **detectable de forma determinística antes del commit** (aborta en vez de corromper), no lo elimina de raíz; eliminarlo de raíz requiere backend real (§23), consistente con R-15 (§33).

### 22.2 Secuencia única y oficial (reserva de idempotencia → diario → dominio → confirmación)

**Corrección obligatoria (quinta pasada)**: el documento contenía descripciones de la secuencia ligeramente distintas entre §12.1bis/§12.3 y esta sección — en particular, esta sección afirmaba que `TransaccionInventario` era "la PRIMERA escritura real", lo cual quedó obsoleto desde que se introdujo la reserva de idempotencia (§12.1bis) como el primer paso real. Se elimina esa afirmación y se deja **una única secuencia oficial de 19 pasos**, referenciada (no repetida con numeración distinta) desde §12.1bis/§12.2/§12.3:

```ts
// DISEÑO PROPUESTO — gestion-inventario/utilidades/unidadTrabajoInventario.ts

export interface UnidadTrabajoInventario {
  ejecutar(plan: PlanOperacionInventario): ResultadoOperacionValorizada;
}

/*
SECUENCIA ÚNICA (la única que este documento reconoce — cualquier otra descripción de los mismos
pasos en §12.1bis/§12.2/§12.3 es un resumen de estos mismos 19 pasos, nunca una secuencia distinta):

 1. Recibir la operación documental completa (§12.1).
 2. Construir una serialización canónica de la entrada.
 3. Calcular hashEntrada.
 4. Obtener bloqueo cooperativo por (empresaId, clave, recursos de Inventario afectados) — §22.1bis.
 5. Consultar OperacionIdempotenteInventario por (empresaId, clave).
 6. Si existe 'confirmada' con el mismo hashEntrada → devolver resultadoIds, no ejecutar de nuevo.
 7. Si existe con la misma clave y hashEntrada distinto → ConflictoIdempotencia, no modificar nada.
 8. [reservarOperacionIdempotente, §12.1bis] Reservar OperacionIdempotenteInventario en estado
    'preparada' — ÉSTA es la primera escritura real de toda la secuencia (nunca TransaccionInventario).
 9. [prepararOperacionInventario, §12.2] Preparar completamente PlanOperacionInventario en memoria,
    SIN persistir ningún dato de dominio — incluye versionEsperada/hashEstadoBase leídos en este paso.
10. [confirmarOperacionInventario, §12.3] Crear TransaccionInventario en 'preparada', vinculada a
    la reserva del paso 8 (transaccionInventarioId ↔ operacionIdempotenteId).
11. Con la transacción todavía en 'preparada': verificar versionEsperada contra
    EstadoVersionInventario.versionInventario vigente, hashEstadoBase, invariantes (§32), datos
    anteriores, disponibilidad, cantidades, costos, relaciones, y que el modo (cuantitativo/
    valorizado) sigue siendo válido para el estado actual de la empresa.
    — Si CUALQUIERA falla: marcar la transacción 'fallida' (nunca pasó por 'confirmando'), liberar
      la reserva de idempotencia (vuelve a 'preparada', disponible para reintento) y devolver el
      error correspondiente — CERO escrituras de dominio.
12. Si todo lo anterior es válido: cambiar TransaccionInventario a 'confirmando'.
13. Aplicar TODAS las escrituras del plan, en el orden fijo:
      StockRepository.addMovements(plan.movimientosNuevos, plan.movimientosActualizados)
      RepositorioCapasCostoInventario.guardar(plan.capasNuevas, plan.capasActualizadas)
      RepositorioConsumosCapasInventario.guardar(plan.consumosNuevos, plan.consumosActualizados)
      actualizarProyeccionStock(plan.proyeccionStockPropuesta)
      plan.actualizacionesDocumentos.forEach(persistirDocumento)
14. Releer las claves de `plan.clavesAfectadas` y verificar que lo escrito coincide con lo
    calculado (chequeo de sanidad barato — compara longitudes/ids, no recalcula reglas de negocio).
15. Verificar invariantes aplicables (§32) sobre el estado ya escrito, antes de cerrar.
16. Confirmar la OperacionIdempotenteInventario del paso 8 — estado='confirmada',
    resultadoIds=plan.resultadoIds, transaccionInventarioId=transaccion.id, fechaConfirmacion=ahora
    — NUNCA se crea una fila nueva aquí, solo se finaliza la ya reservada.
17. Marcar TransaccionInventario 'confirmada' (fechaConfirmacion: ahora).
18. Incrementar EstadoVersionInventario.versionInventario, registrar ultimaTransaccionId, liberar
    el bloqueo cooperativo del paso 4.
19. Retornar ResultadoOperacionValorizada.

Housekeeping (fuera de la secuencia crítica, no bloquea la operación en curso): archivar o purgar
transacciones 'confirmada' antiguas según política de retención.
*/
```

### 22.3 Recuperación al iniciar el módulo

Al cargar `gestion-inventario` (arranque de la aplicación, o primera vez que se invoca `ServicioKardexValorizado` en la sesión), se ejecuta una rutina de recuperación **antes** de aceptar cualquier operación nueva:

**Corrección obligatoria (quinta pasada)**: la versión anterior de esta rutina solo escaneaba `RepositorioTransaccionesInventario` — nunca cruzaba el estado de la transacción con el de su `OperacionIdempotenteInventario` asociada. Eso deja casos reales sin cubrir (ej. una transacción ya `'confirmada'` cuya idempotencia sigue `'preparada'` porque el proceso murió justo entre los pasos 16 y 17 de §22.2). Se corrige escaneando **ambos** repositorios y resolviendo por la combinación de sus dos estados — nunca por uno solo:

```ts
// DISEÑO PROPUESTO — gestion-inventario/utilidades/unidadTrabajoInventario.ts
function recuperarTransaccionesInterrumpidas(empresaId: string): void {
  const operacionesNoConfirmadas = RepositorioOperacionesIdempotentesInventario
    .listarPorEmpresa(empresaId)
    .filter(op => op.estado === 'preparada');

  for (const operacion of operacionesNoConfirmadas) {
    const transaccion = RepositorioTransaccionesInventario.buscarPorOperacionIdempotente(operacion.id);
    resolverCombinacion(operacion, transaccion); // ver matriz completa en §22.4
  }

  // Caso adicional: transacción 'confirmada' cuya idempotencia asociada NO llegó a 'confirmada'
  // (paso 17 de §22.2 ocurrió, pero el paso 16 — o su verificación posterior — no se completó).
  const transaccionesConfirmadas = RepositorioTransaccionesInventario.listarPorEmpresa(empresaId).filter(t => t.estado === 'confirmada');
  for (const transaccion of transaccionesConfirmadas) {
    const operacion = RepositorioOperacionesIdempotentesInventario.buscarPorId(transaccion.operacionIdempotenteId);
    if (!operacion || operacion.estado !== 'confirmada') resolverCombinacion(operacion, transaccion);
  }
}
```

**Nunca** se ignoran las combinaciones interrumpidas, **nunca** se responde con "revisar manualmente" como estrategia primaria (queda como último recurso solo si el propio diario está corrupto, ver matriz siguiente), **nunca** se duplica la operación (la recuperación completa o revierte la misma combinación, no crea una nueva), **nunca** se inventan datos faltantes.

### 22.4 Matriz completa de recuperación (transacción × idempotencia) y escenarios de fallo

**Corrección obligatoria (quinta pasada)**: la tabla siguiente reemplaza la lista lineal anterior (que solo cubría el estado de `TransaccionInventario` en aislamiento) por la matriz completa exigida — cada fila es una combinación real de `(estado de OperacionIdempotenteInventario, estado de TransaccionInventario)`, nunca uno de los dos por separado:

| `OperacionIdempotenteInventario` | `TransaccionInventario` | Acción de `resolverCombinacion` |
|---|---|---|
| `preparada` | inexistente | El proceso murió entre el paso 8 y el paso 10 de §22.2 (nunca llegó a crear la transacción) — marcar la idempotencia `'fallida'`, liberar la clave para un reintento limpio |
| `preparada` | `preparada` | Nunca se llegó a validar/marcar `'confirmando'` (paso 11 no completó o falló) — marcar ambas `'fallida'`, liberar la clave |
| `preparada` | `confirmando` | Algunas escrituras de dominio pudieron aplicarse (paso 13 en curso) — verificar, clave por clave, cuáles de `clavesAfectadas` ya reflejan lo calculado en el plan y cuáles no; aplicar las pendientes (las MISMAS ya calculadas, nunca un recálculo) y completar hasta el paso 19 |
| `preparada` | `confirmada` | Las escrituras de dominio ya se aplicaron y la transacción ya cerró, pero el paso 16 (confirmar idempotencia) no se completó — **no se repiten** las escrituras de dominio; se completa únicamente la idempotencia con los `resultadoIds` ya registrados en la transacción |
| `preparada` | `fallida` | La transacción ya se autodescartó — completar el mismo cierre en la idempotencia (`'fallida'`, clave liberada) |
| `confirmada` | `confirmada` | Estado estable — nada que recuperar |
| `confirmada` | `preparada`/`confirmando`/inexistente | **Inconsistencia real** (invariante 30, §32): una idempotencia dice "confirmada" pero su transacción no respalda ese resultado — suspender mutaciones para esa empresa (`suspendida_por_inconsistencia`, §24.5) y exponer en el panel de diagnóstico; único caso que requiere revisión, por ser evidencia de corrupción, no de una interrupción normal |
| Journal corrupto (JSON inválido o campos faltantes en cualquiera de las dos filas) | — | Se excluye de la recuperación automática, la empresa pasa a `suspendida_por_inconsistencia` para esa operación específica, panel de diagnóstico — único caso legítimo de intervención humana |

**Escenarios de interrupción y su combinación resultante** (referencia rápida, todos cubiertos por la matriz anterior):

| Escenario | Combinación resultante |
|---|---|
| Cierre de pestaña antes del paso 8 (reserva de idempotencia) | Ninguna fila creada — no hay nada que recuperar |
| Cierre de pestaña entre el paso 8 y el paso 10 (transacción aún no creada) | `preparada` / inexistente |
| Cierre de pestaña entre el paso 10 y el paso 12 (validación en curso, transacción `preparada`) | `preparada` / `preparada` |
| Cierre de pestaña a mitad del paso 13 (escrituras de dominio parciales) | `preparada` / `confirmando` |
| Cierre de pestaña entre el paso 17 y el paso 16 completo (orden de escritura real: 16 antes de 17, §22.2 — este caso cubre una excepción entre ambos) | `preparada` / `confirmada` |
| `localStorage.setItem` falla por cuota excedida a mitad del paso 13 | Igual que "escrituras de dominio parciales" — recuperable sin pérdida ni duplicación |
| Recarga de página a mitad de cualquier paso | Igual tratamiento — la recuperación se ejecuta al cargar el módulo, sin importar la causa |
| Operación iniciada desde otra pestaña sobre la misma empresa | El diario permite **detectar** operaciones ajenas en curso (por `empresaId`), pero no impide la colisión de por sí — mitigación parcial, riesgo residual R-15 (§33), resuelto definitivamente solo con backend real |

### 22.5 Matriz de operaciones y su estrategia transaccional

| Operación | Escrituras involucradas | Validaciones previas | Estrategia de consistencia lógica | Transacción backend futura |
|---|---|---|---|---|
| Entrada valorizada (NI, ajuste, importación) | `MovimientoStock` (N), `CapaCostoInventario` (N), documento (NI/CC actualizado), `TransaccionInventario`, `OperacionIdempotenteInventario` | Costo > 0, línea inventariable, almacén activo, idempotencia (hash) | Diario transaccional (§22.2): preparada→confirmando→confirmada, recuperable | `INSERT` en una transacción SQL/NoSQL real con `BEGIN`/`COMMIT` único |
| Salida valorizada (venta, NS) | `MovimientoStock` (N), `ConsumoCapaCostoInventario` (N), línea de venta actualizada, `TransaccionInventario`, `OperacionIdempotenteInventario` | Stock/capas suficientes, idempotencia (hash) | Igual que arriba | Igual que arriba |
| Transferencia | `MovimientoStock` (2), `ConsumoCapaCostoInventario` (N origen), `CapaCostoInventario` (N destino), `Transferencia` actualizada, `TransaccionInventario`, `OperacionIdempotenteInventario` | Capas de origen suficientes, almacenes activos, idempotencia | Igual que arriba | Igual que arriba |
| Reverso (cualquiera) | `MovimientoStock` (reverso), capas/consumos actualizados (`estado`), documento anulado, `TransaccionInventario`, `OperacionIdempotenteInventario` | Capa no consumida (si es reverso de entrada), idempotencia | Igual que arriba | Igual que arriba |
| Devolución (cliente o proveedor) | Igual que entrada/salida según el caso, `TransaccionInventario`, `OperacionIdempotenteInventario` | Evidencia histórica disponible o flujo excepcional confirmado (§20) | Igual que arriba | Igual que arriba |
| Activación de valorización (migración) | `ValorizacionInicialInventario`, `CapaCostoInventario` (N), `Configuration.inventory` (estado de activación, §24.5), `TransaccionInventario`, `OperacionIdempotenteInventario` | Todo el stock positivo tiene costo confirmado; `tratamientoImpuestoCompra` resuelto (§16.2) | Diario transaccional de un solo lote grande, con posibilidad de cancelar **antes** de la transición `validada`→`activando` (§24.5) — una vez `activando`, sigue el mismo flujo recuperable de §22.2, nunca un rollback booleano | Igual que arriba, posiblemente particionada por lotes si el volumen es alto |

---

## 23. Contrato para backend futuro

### 23.1 El patrón actual ya está "pre-adaptado" para una API

Evidencia: `generarNIEnInventario(nota, notasExistentes, productsMap, almacenesMap, usuario)` (`notaIngreso.service.ts:50`) ya recibe sus "repositorios" como parámetros explícitos (`Map<string, Product>`, `Map<string, Almacen>`) en vez de importar un singleton de estado global — es, en espíritu, una función de dominio pura, del mismo tipo que tendría un handler de API. El propio comentario de `accionesStock.ts:20-22` lo confirma: *"Nota: este es el punto único donde hoy se muta/persiste en frontend. Mañana puede reemplazarse por una llamada a API sin tocar POS/Tradicional."*

`ServicioKardexValorizado` se diseña siguiendo el mismo patrón: sus métodos reciben todo lo que necesitan como parámetros (o los leen de "repositorios" reemplazables), y devuelven un `ResultadoOperacionValorizada` estructurado — nunca dependen de mutar variables de closure externas. Esto significa que **migrar a backend es reemplazar el cuerpo de cada método por una llamada `fetch`/`axios` a un endpoint con el mismo contrato de entrada/salida**, sin tocar a los llamadores (Compras, POS, Ventas, etc.).

### 23.2 Contrato propuesto (mapeo función local → endpoint futuro)

| Función local (hoy/diseño) | Endpoint futuro equivalente | Verbo |
|---|---|---|
| `ServicioKardexValorizado.registrarEntradaValorizada` | `POST /empresas/{empresaId}/inventario/entradas-valorizadas` | POST |
| `ServicioKardexValorizado.registrarSalidaValorizada` | `POST /empresas/{empresaId}/inventario/salidas-valorizadas` | POST |
| `ServicioKardexValorizado.transferirStockValorizado` | `POST /empresas/{empresaId}/inventario/transferencias-valorizadas` | POST |
| `ServicioKardexValorizado.revertirMovimientoValorizado` | `POST /empresas/{empresaId}/inventario/movimientos/{id}/reversos` | POST |
| `ServicioKardexValorizado.consultarCostoSiguienteSalida` | `GET /empresas/{empresaId}/inventario/productos/{id}/costo-siguiente-salida?almacenId=` | GET |
| `ServicioKardexValorizado.obtenerValorStock` | `GET /empresas/{empresaId}/inventario/productos/{id}/valor-stock?almacenId=` | GET |

En todos los casos, el `claveIdempotencia` se convierte naturalmente en un header `Idempotency-Key` (patrón estándar de APIs REST) y el **diario transaccional lógico** (`TransaccionInventario`, §22) se convierte en una transacción de base de datos **real** (`BEGIN`/`COMMIT`/`ROLLBACK`) del lado del backend — el frontend deja de necesitar la rutina de recuperación de §22.3 porque la base de datos garantiza atomicidad real (constraint único compuesto sobre `(empresa_id, clave)` en la tabla de idempotencia, nunca sobre `clave` sola; un `ROLLBACK` automático de la base de datos reemplaza la recuperación manual del diario ante cualquier fallo a mitad de transacción). La tabla `transacciones_inventario` (equivalente a `TransaccionInventario`) puede conservarse como bitácora de auditoría incluso con backend real, pero deja de ser necesaria para la recuperación — esa responsabilidad pasa a la base de datos.

**Precisión monetaria en el contrato (corrección obligatoria §17)**: todo campo de costo unitario, valor valorizable y tipo de cambio en las tablas del backend futuro debe declararse `DECIMAL`/`NUMERIC` con la escala definida en §17.1 (nunca `FLOAT`/`DOUBLE`, que introducen el mismo tipo de error de redondeo que este diseño evita explícitamente en el frontend) — el contrato de API expone estos valores como `string` decimal (no `number` de JSON, que en JavaScript es de punto flotante de 64 bits) para que el cliente no reintroduzca imprecisión al deserializar.

**Aislamiento multiempresa en el contrato (corrección obligatoria §6)**: `empresaId` es parte de la ruta del recurso, no un campo opcional del body — el backend debe: (a) derivar el `empresaId` autorizado del contexto de autenticación de la petición (nunca confiar únicamente en el `empresaId` que el cliente envía en el body, que podría manipularse), (b) validar que coincide con el de la ruta antes de ejecutar cualquier lectura/escritura, y (c) aplicar el mismo filtro de `empresaId` en toda tabla nueva (`capas_costo_inventario`, `consumos_capas_inventario`, `valorizaciones_iniciales_inventario`, `operaciones_idempotentes_inventario`, `transacciones_inventario`, `lotes_importacion_valorizada`) como columna indexada, no como metadato opcional. El frontend actual (`localStorage` con `lsKey()`) ya sigue este mismo principio de "aislar por tenant en cada capa", así que este contrato no introduce una práctica nueva — la formaliza para cuando exista una base de datos compartida entre tenants (donde el namespace de `localStorage` deja de existir como protección física).

### 23.3 Lo que NO debe asumirse hoy

Este documento **no** afirma que exista backend. Todo el diseño de §22 (diario transaccional, recuperación) es explícitamente para el prototipo `localStorage`, donde **no** hay transacción real — se usan deliberadamente los términos "consistencia transaccional lógica" y "operación recuperable", nunca "atomicidad real" ni "transacción de base de datos" para describir lo que ocurre hoy en el frontend. La tabla anterior es una guía de migración, no una implementación pendiente de este alcance.

---

## 24. Migración del stock existente

### 24.1 Proceso de activación (decisión 3.10), corregido con la máquina de estados de §31.5

**Corrección obligatoria**: se elimina el flujo lineal de 6 pasos con un booleano al final — se reemplaza por una máquina de estados explícita (`Configuration.inventory.estadoValorizacion`, definida completa en §31.5) donde cada paso corresponde a una transición nombrada, y **ninguna** transición regresa desde `'activa'` a un estado anterior.

```
Estado inicial: Configuration.inventory.estadoValorizacion = 'no_iniciada'
                Configuration.inventory.tratamientoImpuestoCompra = 'pendiente_configuracion'
                (todo el stock existente, de ESTA empresa, tiene cantidad pero cero capas)

no_iniciada → en_preparacion   (evento: usuario inicia el proceso)
  DETECCIÓN: recorrer todos los productos de la empresa con esProductoInventariable(p)===true;
  para cada (empresaId, establecimientoId, productoId, almacenId) con stockPorAlmacen > 0
  → crear un DetalleValorizacionInicial { cantidadDetectada: stockPorAlmacen[almacenId] }
  PROPUESTA DE COSTO por detalle:
    origenPropuesta = 'precioCompra' si product.precioCompra > 0 else 'sin_propuesta'
    costoPropuesto = product.precioCompra ?? 0

en_preparacion → pendiente_costos   (evento: detección completa, hay detalles por confirmar)
  REVISIÓN / CONFIRMACIÓN (acción del usuario): acepta el costo propuesto o ingresa uno manual.
  El usuario también resuelve, en paralelo, el paso de tratamientoImpuestoCompra (§16.2).
  Se permanece en este estado mientras haya AL MENOS un detalle sin costoConfirmado>0
  O tratamientoImpuestoCompra === 'pendiente_configuracion'.

pendiente_costos → validada   (evento: TODOS los detalles con cantidadDetectada>0 tienen
  costoConfirmado>0 Y tratamientoImpuestoCompra !== 'pendiente_configuracion')
  En este estado el usuario puede: revisar de nuevo (→ pendiente_costos), cancelar
  (→ cancelada_antes_activacion), o confirmar la activación final (→ activando).

validada → activando   (evento: usuario confirma la activación — GATEADA por
  verificarCondicionesActivacion(), §24.1bis. Si no está lista, esta transición ni siquiera se
  ofrece en la UI — no es un botón deshabilitado, es una acción que no existe hasta la Etapa 4.
  Cuando está lista, dispara la TransaccionInventario que crea todas las capas de una vez,
  clave de idempotencia VALORIZACION-INICIAL-${valorizacionInicialInventarioId})
  CREACIÓN DE CAPAS (vía prepararOperacionInventario + confirmarOperacionInventario, §12, §22):
    Por cada detalle confirmado, capa propuesta con:
      empresaId, cantidadInicial: cantidadDetectada, cantidadDisponible: cantidadDetectada,
      costoUnitarioBaseMonedaBase: costoConfirmado, procedencia: 'migracion_inicial',
      fechaEntrada: fechaActivacion (no se inventa fecha histórica no disponible),
      tipoDocumentoOrigen: 'migracion', documentoOrigenId: valorizacionInicialInventario.id
    + MovimientoStock informativo (tipo 'AJUSTE_POSITIVO', motivo 'AJUSTE_INVENTARIO') —
      puramente de trazabilidad/auditoría, NO cambia stockPorAlmacen (la cantidad física ya
      estaba reflejada desde antes de activar).

activando → activa   (evento: la TransaccionInventario se confirma exitosamente, §22.2)
  Configuration.inventory.estadoValorizacion = 'activa'
  Configuration.inventory.costMethod = 'FIFO'  (forzado, §10.11)
  ValorizacionInicialInventario.estado = 'confirmado'
  — ESTADO TERMINAL respecto a "desactivar": desde aquí NO existe transición hacia
    no_iniciada/en_preparacion/pendiente_costos/validada. La única transición posible es
    → suspendida_por_inconsistencia (§24.5), y de ahí de vuelta → activa (nunca más atrás).

activando → fallida_recuperable   (evento: la TransaccionInventario de activación se interrumpe
  a mitad de camino — MISMO mecanismo de recuperación de §22.3, no un caso especial: al
  reintentar, la recuperación completa o revierte la MISMA transacción, usando la MISMA clave
  de idempotencia; no se recalculan los costos confirmados)
fallida_recuperable → activando   (evento: se reintenta la recuperación/confirmación)

validada → cancelada_antes_activacion   (evento: usuario cancela antes de confirmar)
cancelada_antes_activacion → en_preparacion   (evento: usuario decide reiniciar el proceso)
```

### 24.1bis Bloqueante obligatorio: condiciones técnicas para permitir la activación

**Corrección obligatoria**: el diseño anterior permitía, en principio, que una empresa llegara a `'activa'` (Etapa 2) antes de que Compras (Etapa 3) y Ventas (Etapa 4) tuvieran sus flujos conectados al motor central — dejando abierta la posibilidad de una empresa "activa" cuyas ventas siguieran descontando stock por el camino cuantitativo antiguo, sin consumir capas. Esto se corrige con una regla explícita:

> **Una empresa solo puede alcanzar `estadoValorizacion = 'activa'` cuando TODOS los flujos que pueden modificar stock estén conectados al motor central (`prepararOperacionInventario`/`confirmarOperacionInventario`) y sean capaces de crear o consumir capas según corresponda.**

**Corrección obligatoria (cuarta pasada): el gate no puede estar construido con literales `cumplido: true`.** Una entrada como `{ clave: 'factura', cumplido: true }` escrita a mano en el código no verifica nada — es un hardcode disfrazado de checklist, exactamente lo que la sección de estándares técnicos prohíbe (§ Estándares técnicos, "cero hardcode"). El gate se separa en dos tipos de condición, verificadas por mecanismos distintos:

#### 24.1bis.1 Capacidad técnica de la versión desplegada

Ninguna aplicación en ejecución puede "descubrir" inspeccionando su propio código si un llamador fue migrado — por eso esto no es una función que calcula un booleano en runtime a partir del código fuente, sino un **manifiesto declarado en tiempo de build**, generado una sola vez por commit/versión, y consultado (nunca editado) en runtime. El repositorio no tiene hoy ningún mecanismo de versión de esquema, feature flags ni capacidades (confirmado en la auditoría original — sin resultados de grep para nada equivalente); se crea el mínimo necesario, sin construir una infraestructura de feature flags genérica:

```ts
// DISEÑO PROPUESTO — gestion-inventario/modelos/RegistroCapacidadesInventario.ts

export type ClaveCapacidadInventario =
  | 'nota_ingreso' | 'ajuste_positivo' | 'importacion' | 'valorizacion_inicial' | 'devolucion_cliente'
  | 'compras_ingreso_automatico' | 'compras_ingreso_manual'
  | 'factura' | 'boleta' | 'pos' | 'nota_venta' | 'nota_salida' | 'ajuste_negativo' | 'merma'
  | 'devolucion_proveedor' | 'nota_credito_fisica'
  | 'transferencias' | 'reversos' | 'anulaciones' | 'reconciliacion' | 'idempotencia'
  | 'recuperacion_transaccional' | 'concurrencia_versionado';

export interface RegistroCapacidadesInventario {
  /** Versión de build de la aplicación (ej. package.json.version o hash de commit del release) — no editable en runtime. */
  version: string;
  /** Las claves que ESTA versión desplegada efectivamente conecta al motor central — declarado por Arquitectura al cerrar cada etapa (§34), nunca por la empresa ni por la UI. */
  capacidadesDisponibles: ClaveCapacidadInventario[];
  fechaPublicacion: string;
}
```

`RegistroCapacidadesInventario` se genera como parte del checklist de cierre de cada etapa (§34) — la Etapa 1C agrega `'nota_ingreso'`/`'ajuste_positivo'` a `capacidadesDisponibles`, la Etapa 3 agrega las dos claves de Compras, la Etapa 4 agrega las 9 claves de salida, etc. No es un dato que la aplicación calcule preguntándose a sí misma "¿ya migré esto?" — es una declaración versionada, igual que un `CHANGELOG`, verificable en code review.

#### 24.1bis.2 Condiciones dinámicas de la empresa

A diferencia de la capacidad técnica (igual para todas las empresas de una misma versión), estas condiciones se evalúan **por empresa**, contra datos reales, en el momento del intento de activación — nunca contra un literal:

```ts
// DISEÑO PROPUESTO — gestion-inventario/utilidades/estadoValorizacionInventario.ts

export interface RequisitoActivacion {
  clave: string;
  descripcion: string;
  cumplido: boolean;
  evidencia: string;           // qué dato real se consultó para decidir cumplido
  motivoBloqueo?: string;      // presente solo si cumplido === false
  accionRequerida?: string;    // presente solo si cumplido === false
}

function verificarTratamientoTributarioConfirmado(empresaId: string): RequisitoActivacion {
  const config = obtenerConfiguracionInventario(empresaId); // lectura real de Configuration.inventory
  const cumplido = config.tratamientoImpuestoCompra !== 'pendiente_configuracion';
  return { clave: 'tratamiento_tributario', descripcion: 'Política de recuperabilidad de IGV confirmada (§16.2)', cumplido,
    evidencia: `tratamientoImpuestoCompra='${config.tratamientoImpuestoCompra}'`,
    motivoBloqueo: cumplido ? undefined : 'La empresa no ha elegido una política real', accionRequerida: cumplido ? undefined : 'Configuración > Inventario' };
}
function verificarMonedaBaseDefinida(empresaId: string): RequisitoActivacion { /* Company.monedaBase !== undefined, vía currencyManager */ return undefined as unknown as RequisitoActivacion; }
function verificarMetodoFIFOConfigurado(empresaId: string): RequisitoActivacion { /* Configuration.inventory.costMethod === 'FIFO' */ return undefined as unknown as RequisitoActivacion; }
/**
 * Corrección obligatoria (quinta pasada): esta función NO exige `capaGeneradaId` — las capas
 * todavía no existen en el momento de este gate (se crean recién durante `validada→activando`,
 * §24.1/§24.1bis.3). Verifica que cada detalle sea VALORIZABLE (tiene todo lo necesario para que
 * la capa pueda generarse correctamente), no que la capa ya se haya generado. Exigir
 * `capaGeneradaId` aquí crearía un ciclo imposible: para activar se exigiría una capa creada,
 * pero la capa solo puede crearse al activar.
 */
function verificarTodoStockPositivoValorizado(lote: ValorizacionInicialInventario): RequisitoActivacion { /* todo DetalleValorizacionInicial con cantidadDetectada>0 tiene: empresaId, productoId, almacenId, costoConfirmado>0, monedaBase resuelta, tipoCambioAplicado (si aplica), origenPropuesta registrado, tratamiento tributario confirmado — es decir, la PROPUESTA de capa está completa y es calculable, sin exigir capaGeneradaId/movimientoEntradaId (que aún no existen) */ return undefined as unknown as RequisitoActivacion; }
function verificarSinDetallesPendientesCosto(lote: ValorizacionInicialInventario): RequisitoActivacion { /* cero detalles con costoConfirmado ausente (§24.1) */ return undefined as unknown as RequisitoActivacion; }
function verificarLoteValidado(lote: ValorizacionInicialInventario): RequisitoActivacion { /* lote.estado === 'en_revision' listo para 'confirmado', ninguna transición saltada */ return undefined as unknown as RequisitoActivacion; }
function verificarSinRecalculoPendiente(lote: ValorizacionInicialInventario): RequisitoActivacion { /* cero DetalleValorizacionInicial.requiereRecalculo===true, §24.1ter */ return undefined as unknown as RequisitoActivacion; }
function verificarSinTransaccionesIncompletas(empresaId: string): RequisitoActivacion { /* RepositorioTransaccionesInventario: cero en 'preparada'/'confirmando' para esta empresa, §22.3 */ return undefined as unknown as RequisitoActivacion; }
function verificarSinOperacionesEnRecuperacion(empresaId: string): RequisitoActivacion { /* cero OperacionIdempotenteInventario en estado inconsistente (§22.4, tabla de recuperación) */ return undefined as unknown as RequisitoActivacion; }
function verificarSinInconsistenciaCapasProyeccion(empresaId: string): RequisitoActivacion { /* reconciliarProyeccionStockInventario sin diferencia, §8.1/§6 */ return undefined as unknown as RequisitoActivacion; }
function verificarSinNIAutomaticaPendienteOFallida(empresaId: string): RequisitoActivacion { /* cero EstadoIngresoAutomatico en 'pendiente'/'procesando'/'fallido_recuperable', §4 */ return undefined as unknown as RequisitoActivacion; }
function verificarSinConflictoDeVersion(empresaId: string): RequisitoActivacion { /* EstadoVersionInventario sin transacción abortada por versión sin resolver, §11/§12.3 */ return undefined as unknown as RequisitoActivacion; }
function verificarSinDatosCruzadosEntreEmpresas(empresaId: string): RequisitoActivacion { /* auditoría de invariante 21 — cero filas de capas/consumos con empresaId distinto detectadas para este productoId+almacenId */ return undefined as unknown as RequisitoActivacion; }
function verificarSinMutacionDirectaLegacyHabilitada(): RequisitoActivacion { /* RegistroCapacidadesInventario confirma cero llamadores productivos restantes a InventoryService.registerAdjustment/addMovimiento sin pasar por el motor central, §12.4 */ return undefined as unknown as RequisitoActivacion; }

const CAPACIDADES_REQUERIDAS: ClaveCapacidadInventario[] = [
  'nota_ingreso', 'ajuste_positivo', 'importacion', 'valorizacion_inicial', 'devolucion_cliente',
  'compras_ingreso_automatico', 'compras_ingreso_manual',
  'factura', 'boleta', 'pos', 'nota_venta', 'nota_salida', 'ajuste_negativo', 'merma',
  'devolucion_proveedor', 'nota_credito_fisica',
  'transferencias', 'reversos', 'anulaciones', 'reconciliacion', 'idempotencia',
  'recuperacion_transaccional', 'concurrencia_versionado',
];

export function verificarCondicionesActivacion(
  empresaId: string,
  lote: ValorizacionInicialInventario,
  registro: RegistroCapacidadesInventario,
): { listo: boolean; pendientes: RequisitoActivacion[] } {
  const requisitosDeCapacidad: RequisitoActivacion[] = CAPACIDADES_REQUERIDAS.map((clave) => {
    const cumplido = registro.capacidadesDisponibles.includes(clave);
    return {
      clave, descripcion: DESCRIPCION_CAPACIDAD[clave], cumplido,
      evidencia: cumplido ? `Declarado en RegistroCapacidadesInventario v${registro.version}` : `Ausente de RegistroCapacidadesInventario v${registro.version}`,
      motivoBloqueo: cumplido ? undefined : `El flujo "${clave}" aún no está conectado al motor central en esta versión desplegada`,
      accionRequerida: cumplido ? undefined : `Completar la etapa que migra "${clave}" (§34)`,
    };
  });

  const requisitosDinamicos = [
    verificarTratamientoTributarioConfirmado(empresaId), verificarMonedaBaseDefinida(empresaId),
    verificarMetodoFIFOConfigurado(empresaId), verificarTodoStockPositivoValorizado(lote),
    verificarSinDetallesPendientesCosto(lote), verificarLoteValidado(lote), verificarSinRecalculoPendiente(lote),
    verificarSinTransaccionesIncompletas(empresaId), verificarSinOperacionesEnRecuperacion(empresaId),
    verificarSinInconsistenciaCapasProyeccion(empresaId), verificarSinNIAutomaticaPendienteOFallida(empresaId),
    verificarSinConflictoDeVersion(empresaId), verificarSinDatosCruzadosEntreEmpresas(empresaId),
    verificarSinMutacionDirectaLegacyHabilitada(),
  ];

  const pendientes = [...requisitosDeCapacidad, ...requisitosDinamicos].filter((r) => !r.cumplido);
  return { listo: pendientes.length === 0, pendientes };
}
```

**Por qué la capacidad técnica sigue siendo, además, un refuerzo de UI**: mientras `RegistroCapacidadesInventario.capacidadesDisponibles` no incluya las 23 claves requeridas, la acción "Confirmar activación" (`validada → activando`) **no se ofrece en la UI en absoluto** — no es un botón deshabilitado con un mensaje, es una funcionalidad que literalmente no se entrega hasta el cierre de la Etapa 4 (§34). Pero, a diferencia de la versión anterior, esto ya **no** es la única defensa: `verificarCondicionesActivacion` se invoca también desde `prepararOperacionInventario` para la operación `valorizacion_inicial` con `modoOperacion: 'valorizado'` dirigida a la transición `activando`, y rechaza la operación si `listo === false`, verificando datos reales (capacidad declarada + condiciones dinámicas de la empresa) — nunca un literal en el propio código de verificación.

### 24.1bis.3 Excepción exclusiva de `validada` para la valorización inicial, y confirmación posterior (corrección obligatoria — quinta pasada, cierra el bloqueo circular)

**El estado `validada` no admite operaciones valorizadas en general** — admite exactamente **una**, y solo cuando el gate ya aprobó:

```ts
// DISEÑO PROPUESTO — regla de excepción, evaluada dentro de prepararOperacionInventario (§12.2, paso 1)
function modoOperacionPermitidoEnValidada(
  tipoOperacion: TipoOperacionIdempotenteInventario,
  gateAprobado: boolean,
): boolean {
  // Única excepción de todo el diseño: la operación que CREA las capas iniciales puede
  // prepararse en modo 'valorizado' mientras el estado todavía es 'validada' — porque esa es,
  // precisamente, la operación que hace la transición validada→activando (§24.1). Ninguna otra
  // operación valorizada (venta, entrada ordinaria, salida, transferencia, ajuste, NI, devolución)
  // se permite en 'validada' bajo ningún motivo.
  return tipoOperacion === 'valorizacion_inicial' && gateAprobado;
}
```

Con `resolverModoOperacion('validada') === 'bloqueado_snapshot_aprobado'` (§24.1ter) sin cambio — la excepción no reemplaza esa función ni la convierte en permisiva de forma genérica; vive como una verificación adicional, específica de `tipoOperacion==='valorizacion_inicial'`, dentro de `prepararOperacionInventario`. Ventas, entradas, salidas, transferencias, ajustes, NI y devoluciones valorizadas siguen bloqueadas en `'validada'` sin excepción.

**Confirmación posterior a la activación** (dentro de `confirmarOperacionInventario`, §12.3, para la operación `valorizacion_inicial` específicamente — pasos adicionales antes de transicionar `activando→activa`):

```
Tras aplicar las escrituras del plan de activación, verificar (nunca antes de aplicar):
  - existe exactamente una CapaCostoInventario por cada DetalleValorizacionInicial con
    cantidadDetectada > 0 (capaGeneradaId poblado en cada detalle, cantidadInicial === cantidadDetectada);
  - cada capa nueva tiene movimientoEntradaId, costo confirmado, valor valorizable, moneda,
    tipo de cambio, empresaId, almacenId, productoId consistentes con su detalle de origen;
  - reconciliarProyeccionStockInventario (§8.1) no reporta diferencia para ningún producto+almacén
    recién valorizado;
  - cero detalles pendientes, cero capas duplicadas (una sola capa por detalle);
  - EstadoVersionInventario.versionInventario incrementado (§9.6bis);
  - OperacionIdempotenteInventario confirmada, TransaccionInventario confirmada.

Si TODO lo anterior se cumple: activando → activa.
Si CUALQUIER verificación falla: activando → fallida_recuperable (nunca activa con datos parciales).
```

**Sin duplicar stock**: la valorización inicial toma como cantidad la proyección cuantitativa ya existente (`Product.stockPorAlmacen`, sin recalcularla) y la convierte en stock valorizado creando las capas — **no** vuelve a incrementar `stockPorAlmacen` (ya refleja esa cantidad desde antes de activar, §8.1), **no** genera Notas de Ingreso, **no** duplica movimientos físicos históricos. El `MovimientoStock` de apertura que crea (§24.1, tipo `'AJUSTE_POSITIVO'`, motivo `'AJUSTE_INVENTARIO'`) es puramente informativo/trazable, tal como ya establece §24.1 — esta sección no cambia esa regla, solo la conecta explícitamente con la verificación posterior anterior.

### 24.1ter Comportamiento diferenciado por estado (corrección obligatoria — sin mutación libre fuera de suspensión)

**Corrección obligatoria**: la versión anterior definía `puedeMutarInventario(estado) = estado !== 'suspendida_por_inconsistencia'` — es decir, permitía mutar en **todos** los demás estados por igual, incluyendo `'validada'`, `'activando'` y `'fallida_recuperable'`, donde no debería permitirse ninguna mutación de stock. Se reemplaza por un modelo de modos de operación diferenciados:

```ts
// DISEÑO PROPUESTO — gestion-inventario/utilidades/estadoValorizacionInventario.ts

export type ModoOperacionInventario =
  | 'cuantitativo_libre'              // no_iniciada / cancelada_antes_activacion: comportamiento actual, sin capas, sin snapshot que invalidar
  | 'cuantitativo_invalida_snapshot'  // en_preparacion / pendiente_costos: cuantitativo permitido, pero invalida el detalle de migración afectado
  | 'bloqueado_snapshot_aprobado'     // validada: snapshot ya aprobado, inmutable — cero mutaciones
  | 'bloqueado_activacion_en_curso'   // activando / fallida_recuperable: cero mutaciones, solo la transacción de activación
  | 'valorizado_exclusivo'            // activa: solo el motor central valorizado, prohibido el camino cuantitativo directo
  | 'bloqueado_suspension';           // suspendida_por_inconsistencia: cero mutaciones, solo consulta/diagnóstico/reconciliación

export function resolverModoOperacion(estado: EstadoActivacionValorizacion): ModoOperacionInventario {
  switch (estado) {
    case 'no_iniciada':
    case 'cancelada_antes_activacion':
      return 'cuantitativo_libre';
    case 'en_preparacion':
    case 'pendiente_costos':
      return 'cuantitativo_invalida_snapshot';
    case 'validada':
      return 'bloqueado_snapshot_aprobado';
    case 'activando':
    case 'fallida_recuperable':
      return 'bloqueado_activacion_en_curso';
    case 'activa':
      return 'valorizado_exclusivo';
    case 'suspendida_por_inconsistencia':
      return 'bloqueado_suspension';
  }
}

export function puedeMutarInventario(estado: EstadoActivacionValorizacion): boolean {
  const modo = resolverModoOperacion(estado);
  return modo === 'cuantitativo_libre' || modo === 'cuantitativo_invalida_snapshot' || modo === 'valorizado_exclusivo';
}

export function puedeOperarCuantitativamente(estado: EstadoActivacionValorizacion): boolean {
  const modo = resolverModoOperacion(estado);
  return modo === 'cuantitativo_libre' || modo === 'cuantitativo_invalida_snapshot';
}

export function puedeOperarValorizadamente(estado: EstadoActivacionValorizacion): boolean {
  return resolverModoOperacion(estado) === 'valorizado_exclusivo';
}

export function esValorizacionActiva(estado: EstadoActivacionValorizacion): boolean {
  // "Operando en modo valorizado" — incluye 'suspendida_por_inconsistencia' porque el método de
  // costeo NO cambia durante una suspensión (§24.5); lo que cambia es si se permite MUTAR.
  return estado === 'activa' || estado === 'suspendida_por_inconsistencia';
}

/**
 * Cuando el modo es 'cuantitativo_invalida_snapshot' (en_preparacion/pendiente_costos) y ocurre
 * una mutación cuantitativa real (venta, ajuste, NI) sobre un producto+almacén que ya tiene un
 * DetalleValorizacionInicial propuesto en el lote en curso, ese detalle se marca
 * requiereRecalculo=true (nuevo campo, §9.4) — NUNCA se confirma una propuesta basada en stock
 * desactualizado. La transición pendiente_costos→validada exige requiereRecalculo=false en
 * TODOS los detalles, además de costoConfirmado>0.
 */
export function invalidarDetalleSiAfectado(
  loteId: string,
  productoId: string,
  almacenId: string,
): void {
  // DISEÑO PROPUESTO: localiza el DetalleValorizacionInicial de ese lote+producto+almacén
  // (si existe) y lo marca requiereRecalculo=true; no recalcula el costo automáticamente —
  // exige que el usuario lo revise de nuevo antes de avanzar.
}
```

### 24.1quater Matriz de comportamiento por estado (obligatoria)

| Estado | Consultar | Operar cuantitativamente | Operar valorizadamente | Editar migración | Activar (`validada→activando`) | Recuperar |
|---|---|---|---|---|---|---|
| `no_iniciada` | Sí | Sí | No | No (sin lote todavía) | No | No |
| `en_preparacion` | Sí | Sí (invalida detalles afectados) | No | Sí (detección en curso) | No | No |
| `pendiente_costos` | Sí | Sí (invalida y exige recálculo del detalle afectado) | No | Sí | No | No |
| `validada` | Sí | **No** | No | **No** (snapshot aprobado, inmutable) | Sí, si `verificarCondicionesActivacion().listo` | No |
| `activando` | Sí | **No** | No | No | En curso (no reiniciable, solo recuperable) | Sí (recuperación de la transacción de activación) |
| `fallida_recuperable` | Sí | **No** | No | No | No (retoma `activando`) | Sí |
| `activa` | Sí | **No** (prohibido el camino directo) | Sí (exclusivo, vía motor central) | No aplica | No (terminal) | Sí (recuperación normal de transacciones, §22.3) |
| `suspendida_por_inconsistencia` | Sí | No | No | No | No | Sí (reconciliación, §24.5) |
| `cancelada_antes_activacion` | Sí | Sí | No | No (se reinicia el proceso) | No | No |

**Ninguna fila permite mutación libre en `validada`, `activando` o `fallida_recuperable`** — corrige exactamente el defecto señalado.

### 24.2 Qué se migra y qué no puede reconstruirse

| Dato | ¿Se migra? | Cómo |
|---|---|---|
| Cantidad de stock existente | Sí | Ya está en `Product.stockPorAlmacen` — no se toca, solo se le crea una capa equivalente |
| Costo de ese stock | Parcialmente | Propuesto desde `precioCompra` si existe; si no, requiere costo manual confirmado — nunca se inventa |
| Historial de movimientos anteriores a la activación | No se re-valoriza retroactivamente | Los movimientos históricos quedan tal cual (sin costo) — la capa inicial representa "el stock tal como está hoy", no reconstruye cómo se formó |
| Ventas realizadas antes de la activación | No se les asigna costo de venta retroactivo | Prohibición explícita del encargo — el costo de venta real solo se garantiza para ventas posteriores a la activación |
| Compras históricas sin vínculo estructurado a NI | No se re-vinculan | Quedan con su trazabilidad de texto libre original; solo las compras nuevas (posteriores a este diseño) usan la FK estructurada |

### 24.3 Casos particulares

| Caso | Tratamiento |
|---|---|
| Producto sin `precioCompra` y con stock positivo | Bloquea la activación de ese producto/almacén hasta que el usuario ingrese un costo manual — no se activa parcialmente dejando ese producto sin capa |
| Producto con `precioCompra` pero stock en varios almacenes | Se propone el mismo `precioCompra` como sugerencia para cada almacén (es un valor de producto, no de almacén) — el usuario puede diferenciar por almacén al confirmar si lo desea |
| Stock cero | No genera detalle ni capa — no hay nada que valorizar |
| Empresas con distinta moneda base | El costo confirmado se registra directamente en la moneda base de esa empresa (no hay conversión — `precioCompra` no tiene moneda asociada hoy, se asume que el usuario lo confirma ya en la moneda correcta al revisar) |
| Multi-establecimiento | El lote de migración puede ejecutarse por establecimiento o para todos a la vez — queda como parámetro de la UI, sin impacto en el modelo (`ValorizacionInicialInventario.establecimientoId` opcional ya lo permite) |

### 24.4 Antes vs. después de activar (corrección obligatoria — sin rollback booleano)

**Antes de llegar a `'activa'`** (estados `no_iniciada`/`en_preparacion`/`pendiente_costos`/`validada`/`cancelada_antes_activacion`): el proceso puede iniciarse, revisarse, cancelarse, repetirse, modificar los costos ya propuestos, y restaurar el estado previo — **no existen movimientos valorizados productivos todavía**, por lo que cualquiera de estas acciones es segura y no requiere ningún reverso de datos de dominio (`ValorizacionInicialInventario` puede pasar a `'cancelado'` sin dejar ninguna capa creada). Mientras tanto, `puedeMutarInventario(estado)` es `true` y el sistema sigue operando en modo cuantitativo puro (sin exigir costo), exactamente como hoy.

**Después del primer movimiento valorizado confirmado** (estado `'activa'`, alcanzado vía `activando`→`activa`): **no existe ninguna acción de "desactivar" desde la UI**, no se puede volver a modo cuantitativo, no se puede registrar una venta sin consumir capas, no se puede registrar una entrada sin costo, no se permite alternar entre ambos modelos, y **no existe rollback mediante un booleano** — se elimina explícitamente cualquier lectura de este diseño que sugiera que `estadoValorizacion` (o el campo booleano anterior) puede volver a un valor "no activo" una vez alcanzado `'activa'`. Una empresa que aún no activó puede seguir operando cuantitativamente durante la transición (coexistencia intencional, R-10 §33); una empresa que ya activó **no puede regresar** a ese comportamiento.

### 24.5 Suspensión por inconsistencia (nuevo estado, no rollback)

Si `reconciliarProyeccionStockInventario` (§8.1) detecta una inconsistencia crítica en una empresa con `estadoValorizacion === 'activa'`, la transición es `activa → suspendida_por_inconsistencia` (nunca hacia un estado anterior). Este estado:

- **Bloquea** todas las operaciones mutadoras (`puedeMutarInventario` retorna `false`) — ninguna entrada, salida, ajuste, transferencia ni reverso se acepta mientras dure.
- **Permite consultar** — reportes, detalle de producto, Kardex de solo lectura siguen funcionando.
- **Permite diagnosticar** — un panel de reconciliación muestra exactamente qué producto/almacén tiene la discrepancia (`ResultadoReconciliacionStock`, §8.1).
- **No cambia el método de costeo** — sigue siendo `'FIFO'`, `costMethod` no se toca.
- **No permite operar cuantitativamente** — a diferencia de una empresa que nunca activó, una empresa suspendida no vuelve al modo sin-costo; simplemente no opera hasta que un administrador reconcilie la inconsistencia (vía `reconstruirProyeccionDesdeCapas`, §8.1) y el sistema transicione `suspendida_por_inconsistencia → activa`.

### 24.6 Matriz de migración

| Elemento | Se migra | No puede reconstruirse | Se marca como estimado | Fecha de corte | Validación | Cancelación antes de `activando` |
|---|---|---|---|---|---|---|
| Stock positivo existente | Cantidad (sin cambio) + capa nueva | Cómo se formó ese stock originalmente | Costo si viene de `precioCompra` | Fecha de activación | Bloquea transición a `validada` si falta costo confirmado | `ValorizacionInicialInventario.estado = 'cancelado'`, `estadoValorizacion → cancelada_antes_activacion`, ninguna capa creada |
| Ventas anteriores | No | Costo de venta histórico | — | — | — | — |
| Compras anteriores | No | Vínculo estructurado a NI | — | — | — | — |
| `Configuration.inventory.costMethod` | Sí (forzado a `'FIFO'`) | — | — | En la transición `activando→activa` | — | Reversible mientras `estadoValorizacion` no sea `activa` |

---

## 25. Deprecación de `Product.precioCompra`

### 25.1 Consumidores actuales identificados (evidencia exacta)

| Consumidor actual | Archivo:línea | Sustituto propuesto | Etapa de migración | Condición de eliminación |
|---|---|---|---|---|
| Prellenar costo de línea nueva de OC | `servicioOrdenCompra.ts:97` | `derivarCostoSugerido(productoId)` — lee el **último costo real de compra** (`consultarUltimoCostoCompra`, §25.2, nunca el costo de la siguiente salida FIFO) si la empresa está `esValorizacionActiva`; si no, cae a `precioCompra` como hoy | Etapa 3 (§34) | Cuando `estadoValorizacion==='activa'` para todas las empresas |
| Campo de referencia en línea (`precioCompraReferencia`) | `servicioOrdenCompra.ts:122`, `LineaCompra.ts:39` | Mantener como snapshot informativo de "cuál era el costo sugerido al momento de crear la línea" — deja de derivarse de `Product.precioCompra` en vivo y pasa a ser un snapshot puntual (ya se comporta así, solo cambia la fuente) | Etapa 3 | Nunca se elimina — es un snapshot documental válido, distinto del campo de Producto |
| Prellenar costo de línea de NI | `FormularioNotaIngreso.tsx:399` | Igual que arriba — `derivarCostoSugerido` | Etapa 3 | Igual que arriba |
| Mostrar/copiar en selectores de venta | `useAvailableProducts.tsx`, `ProductSelector.tsx` | Estos usos no calculan margen (confirmado en auditoría) — se retiran directamente una vez confirmado que no hay lógica de cálculo dependiente, sin sustituto necesario | Etapa 3 | Al confirmar ausencia de lógica dependiente (ya confirmado en auditoría) |
| `useLineasCompra.ts:71` | — | Igual que el primero (`derivarCostoSugerido`) | Etapa 3 | Igual |
| Detalle de Producto (mostrar "costo") | `ProductDetailPanel.tsx:264` | Reemplazar por "último costo real de compra" derivado de capas (§28) | Etapa 5 | Cuando el detalle de Producto muestre los nuevos indicadores derivados |

### 25.2 Transición formal (7 pasos, siguiendo el encargo literalmente)

1. **Identificar todos los consumidores actuales** — tabla anterior, completa (6 puntos de uso reales confirmados, ninguno adicional detectado en la auditoría ni en la verificación de esta tarea).
2. **Sustituir el prellenado de Compras/NI** por `derivarCostoSugerido(productoId)`:

**Corrección obligatoria (cuarta pasada): no confundir "último costo de compra" con "costo de la siguiente salida FIFO".** La versión anterior sugería el costo de una compra **nueva** usando `consultarCostoSiguienteSalida` — que es el costo de la capa **más antigua** disponible (la próxima en salir por FIFO). Usar la capa más antigua para sugerir el precio de una compra nueva es exactamente el error que el encargo señala: una compra nueva no tiene relación con "qué va a salir después", tiene relación con "cuánto costó la última vez que compré esto". Se separan tres conceptos, cada uno con su propia función y su propio uso — ninguno sustituye a otro:

```ts
// DISEÑO PROPUESTO — gestion-inventario/servicios/servicioKardexValorizado.ts

/** Última entrada real de PROCEDENCIA 'compra', no anulada, fecha más reciente — sugerencia editable para una compra NUEVA. */
export function consultarUltimoCostoCompra(
  empresaId: string, productoId: string,
): { costoUnitarioBaseOriginal: number; moneda: string; tipoCambioAplicado: number; fecha: string } | null {
  /* DISEÑO PROPUESTO: busca CapaCostoInventario con procedencia==='compra', estado!=='revertida',
     ordenada por fechaEntrada descendente, primera coincidencia — devuelve su costo por unidad
     mínima en moneda original, la moneda y el TC histórico. NO es el costo oficial de la compra
     nueva hasta que el usuario confirme el documento — es solo la sugerencia inicial editable. */
}

/**
 * Costo de la capa disponible MÁS ANTIGUA (próxima en salir por FIFO) — para margen estimado y
 * simulación, NUNCA para sugerir el costo de una compra nueva. Es la misma función ya declarada
 * como `ServicioKardexValorizado.consultarCostoSiguienteSalida` (§12.5) — un solo nombre, sin
 * una segunda implementación paralela; se documenta aquí junto a `consultarUltimoCostoCompra`
 * únicamente para dejar explícita la frontera entre ambas.
 */
// consultarCostoSiguienteSalida(empresaId, productoId, almacenId): number | null — ver §12.5.

function derivarCostoSugerido(productoId: string): { valor: number; origen: 'ultimoCostoDocumental' | 'precioCompra' | 'sin_sugerencia' } {
  if (esValorizacionActiva(Configuration.inventory.estadoValorizacion)) {
    const ultimaCompra = consultarUltimoCostoCompra(empresaId, productoId);
    if (ultimaCompra !== null) return { valor: ultimaCompra.costoUnitarioBaseOriginal, origen: 'ultimoCostoDocumental' };
  }
  const producto = obtenerProducto(productoId);
  if (producto?.precioCompra) return { valor: producto.precioCompra, origen: 'precioCompra' };
  return { valor: 0, origen: 'sin_sugerencia' };
}
```

**Costo promedio: explícitamente fuera del MVP.** Ninguna función nueva de este diseño calcula ni expone un costo promedio ponderado — `Configuration.inventory.costMethod` se restringe a `'FIFO'` en UI (§10.11) precisamente para que no exista una configuración activa sin motor real detrás. Si en el futuro se habilita, requiere su propio diseño (nueva función, nuevo consumidor), no una reutilización parcial de `consultarUltimoCostoCompra`/`consultarCostoSiguienteSalidaFIFO`.

**Corrección de ubicaciones que mezclaban los tres conceptos**: Detalle de Producto (§28) debe mostrar los tres por separado y rotulados sin ambigüedad — "Último costo de compra" (`consultarUltimoCostoCompra`), "Costo de la siguiente salida FIFO por almacén" (`consultarCostoSiguienteSalida`) — nunca un único campo "costo actual" que mezcle ambos; el prellenado de Compras (`servicioOrdenCompra.ts`, `FormularioNotaIngreso.tsx`, §25.1) usa exclusivamente `derivarCostoSugerido`/`consultarUltimoCostoCompra`, nunca `consultarCostoSiguienteSalida`.
3. **Usar `precioCompra` como propuesta durante la migración** — ya diseñado en §24.1 paso 2, sin cambio adicional.
4. **Marcarlo como deprecado** — se agrega comentario `@deprecated` en `types.ts:30` y se retira el campo del formulario de creación de producto **una vez** que `derivarCostoSugerido` esté activo para todas las empresas (Etapa 3 completa) — mientras tanto, sigue siendo la única fuente para empresas que aún no activaron valorización (transición gradual, no un corte abrupto).
5. **Retirarlo de la UI** — el formulario de producto dejaría de mostrar "Precio inicial de compra" como campo editable de uso corriente; se reemplaza conceptualmente por el flujo de migración (§24), que es el único momento en que un costo inicial "manual" tiene sentido funcional.
6. **Eliminarlo del modelo** cuando `getConsumidores() === 0` — condición objetiva y verificable por grep, no por fecha arbitraria.
7. **`porcentajeGanancia`**: no se elimina en este diseño (no forma parte de la integración Compras↔Kardex); se documenta como decisión pendiente de Precios/Producto, fuera de alcance (§39).

### 25.3 Ninguna compatibilidad indefinida

`precioCompra` **no** queda como "campo legado que igual se sigue leyendo por si acaso" de forma indefinida — su condición de eliminación (paso 6) es objetiva: cero consumidores reales, verificable con la misma técnica de grep usada en la auditoría original. No se define una fecha calendario (sería arbitraria); se define una condición de código verificable.

---

## 26. Costo de venta

### 26.1 Dónde se persiste

En la línea del documento de salida real (no en `CartItem`, que es efímero): línea de comprobante (Factura/Boleta/NV) y `LineaNotaSalida` (§10.9, §10.10). Ambas reciben, en el momento de `registrarSalidaValorizada`:

```ts
costoVentaUnitario = valorConsumidoMonedaBase_de_la_linea / cantidadUnidadMinima_de_la_linea
costoVentaTotal = Σ valorConsumidoMonedaBase de todos los ConsumoCapaCostoInventario de esa línea
consumosCapaIds = [ids de los ConsumoCapaCostoInventario generados]
```

### 26.2 Trazabilidad hasta los consumos

`consumosCapaIds` permite, para cualquier línea de venta, reconstruir exactamente qué capas (y por tanto qué compras/ajustes/migraciones) originaron el costo — satisface la exigencia "debe poder rastrearse hasta los consumos de capas que lo originaron" (decisión 3.13).

### 26.3 Inmutabilidad

Una vez persistido, `costoVentaUnitario`/`costoVentaTotal` **nunca se recalcula** — ni al anular la venta (el reverso no toca estos campos, solo crea el reverso de movimiento/consumo, ver §20.3), ni al consultar reportes históricos (que leen el campo persistido, no vuelven a ejecutar `consumirCapasFIFO`), ni si el costo de las capas originales cambiara por algún ajuste posterior (las capas no se editan retroactivamente, ver §32 invariante 7).

---

## 27. Utilidad y margen

### 27.1 Definiciones (reutilizadas literalmente de la decisión 3.14, sin reinterpretar)

- **Venta neta**: importe de venta después de descuentos y sin impuestos trasladados, según la estructura real de Ventas (ya calculado hoy en los documentos de venta — no requiere cambio de modelo).
- **Costo real de venta**: suma del costo histórico de las capas consumidas → `LineaVenta.costoVentaTotal` (§26).
- **Utilidad bruta**: `ventaNeta − costoVentaTotal`.
- **Margen sobre venta**: `utilidadBruta / ventaNeta`.
- **Recargo/markup**: `utilidadBruta / costoVentaTotal`.

### 27.2 Margen estimado (Detalle de Producto)

Por decisión 3.14: "utilizar el costo esperado de la siguiente salida FIFO del almacén seleccionado; si no existe contexto de almacén, no mostrar un costo consolidado engañoso; el diseño puede proponer mostrar el indicador por almacén."

```ts
// DISEÑO PROPUESTO — consumido por el Detalle de Producto, no persistido
function calcularMargenEstimadoPorAlmacen(productoId: string, almacenId: string, precioVenta: number): number | null {
  const costoSiguienteSalida = ServicioKardexValorizado.consultarCostoSiguienteSalida(productoId, almacenId);
  if (costoSiguienteSalida === null) return null; // sin capas disponibles en ese almacén — no se muestra "0%" engañoso
  return (precioVenta - costoSiguienteSalida) / precioVenta;
}
```

Si el usuario no ha seleccionado un almacén (vista consolidada de todos los almacenes), el Detalle de Producto **no muestra un margen único global** — muestra, como máximo, una tabla "margen estimado por almacén" (uno por cada almacén con capas disponibles), nunca un promedio o consolidado que mezclaría distintos costos FIFO por almacén.

### 27.3 Utilidad y margen real (Reporte de rentabilidad)

Se calcula exclusivamente a partir de campos ya persistidos (`ventaNeta` existente + `costoVentaTotal` nuevo), agregando por período/producto/documento/almacén/establecimiento/empresa según el caso — nunca recalculando con costos actuales.

### 27.4 Matriz de indicadores de costo, utilidad y margen

| Indicador | Fórmula | Datos disponibles tras este diseño | Datos faltantes | Ubicación recomendada |
|---|---|---|---|---|
| Último costo de compra | Costo unitario de la última `LineaCompra`/`LineaNotaIngreso` registrada | Sí — ya existe el campo, solo falta la función de consulta | Ninguno | Detalle de Producto (derivado) |
| Costo actual del stock (siguiente capa FIFO) | `costoUnitarioBaseMonedaBase` de la capa disponible más antigua por almacén | Sí, con este diseño (`CapaCostoInventario`) | Ninguno tras implementar | Detalle de Producto (por almacén), Inventario/Kardex |
| Valor total del inventario | Σ `calcularValorDisponibleCapa(capa, consumos)` (§18.5bis — derivado de `valorValorizableMonedaBase − Σ valorConsumidoMonedaBase`, nunca `cantidadDisponible × costoUnitarioBaseMonedaBase`) por capas `estado='disponible'` | Sí, con este diseño | Ninguno tras implementar | Reporte de inventario valorizado |
| Costo FIFO de la siguiente salida | Igual que "costo actual del stock" | Sí | Ninguno | Detalle de Producto, POS (opcional, informativo) |
| Costo real de venta | Σ `valorConsumidoMonedaBase` de una línea | Sí, con este diseño (§26) | Ninguno tras implementar | Comprobante de venta (persistido) |
| Utilidad bruta | `ventaNeta − costoVentaTotal` | Sí — `ventaNeta` ya existe, `costoVentaTotal` nuevo | Ninguno | Reporte de rentabilidad |
| Margen sobre venta | `utilidadBruta / ventaNeta` | Sí | Ninguno | Reporte de rentabilidad |
| Recargo/markup | `utilidadBruta / costoVentaTotal` | Sí | Ninguno | Reporte de rentabilidad |
| Margen estimado (sin venta aún) | `(precioVenta − costoSiguienteSalidaFIFO) / precioVenta`, por almacén | Sí, con este diseño | Ninguno | Detalle de Producto |

---

## 28. Impacto en Productos

Se agrega al Detalle de Producto (existente, `ProductDetailPanel.tsx`), como indicadores **derivados**, no campos persistidos:

- Último costo real de compra (derivado — última `CapaCostoInventario.costoUnitarioBaseOriginal` por producto, con su `fechaEntrada`).
- Costo de siguiente salida FIFO por almacén (derivado — `consultarCostoSiguienteSalida` por cada almacén con stock).
- Valor de stock del producto (derivado — `obtenerValorStock(productoId)`, suma sobre todos los almacenes).
- Margen estimado por precio de venta, por almacén (§27.2).

**Ninguno de estos 4 indicadores se persiste como campo independiente de `Product`** — se calculan en el momento de abrir el panel, leyendo `CapaCostoInventario`. Esto evita la duplicidad que hoy representa `precioCompra` (un valor cacheado que puede desincronizarse de la realidad).

---

## 29. Impacto en Precios

**Confirmación explícita**: el módulo `lista-precios/` **no se modifica** en este diseño.

- Continúa siendo exclusivamente el dueño de precios de venta (`Column`, `ProductUnitPrices`, ya existentes).
- No se le agrega costo oficial, capas, costo de inventario, margen real persistido ni utilidad oficial.
- Puede ser **leído** por el Detalle de Producto (para calcular margen estimado, §27.2, cruzando el precio de venta ya existente en `lista-precios` con el costo derivado de Inventario) y por el Reporte de rentabilidad (para obtener `ventaNeta` si ese reporte decide originarla desde el precio de catálogo en vez de desde el documento de venta ya emitido — decisión de implementación fuera de este diseño, ya que `ventaNeta` real de una venta concreta siempre debe salir del documento de venta, no del catálogo de precios).
- No existe ninguna dependencia técnica que obligue a modificar `lista-precios/` para completar este diseño.

---

## 30. Impacto en Reportes

Nuevos reportes/indicadores propuestos (no implementados en este alcance):

| Reporte | Fuente de datos | Agregación posible |
|---|---|---|
| Inventario valorizado | `CapaCostoInventario` (`estado='disponible'`) | Por producto, almacén, establecimiento, empresa |
| Costo de venta | Líneas de venta con `costoVentaTotal` persistido | Por producto, línea, comprobante, periodo, almacén, establecimiento, empresa |
| Rentabilidad (utilidad + margen) | `ventaNeta` (existente) + `costoVentaTotal` (nuevo) | Por producto, documento, periodo, establecimiento, almacén |
| Utilidad por producto | Igual que rentabilidad, agrupado por producto | Periodo configurable |
| Margen por documento | Igual, agrupado por comprobante/NV/NS | — |
| Margen por periodo | Igual, agrupado por rango de fechas | — |
| Margen por establecimiento | Igual, agrupado por `establecimientoId` | — |
| Margen por almacén | Igual, agrupado por `almacenId` (tiene sentido solo si la venta registra el almacén real de despacho, ya disponible vía `ConsumoCapaCostoInventario` → `CapaCostoInventario.almacenId`) | — |

Estos reportes se agregan al hub existente (`indicadores-negocio/models/reportDefinitions.ts`) como nuevas entradas en una categoría "Rentabilidad" — sin modificar los reportes de cantidad ya existentes ("Reporte de stock", "Movimientos de inventario").

---

## 31. Máquinas de estado

### 31.1 Comprobante de Compra (`EstadoInventarioCC`, ya existente, valores reutilizados sin cambio de tipo)

```
no_aplica         ← modalidadInventario === 'no_afecta_inventario' (sin cambio)
pendiente         ← modalidadInventario === 'con_nota_ingreso', sin NI generada aún
                    (evento: registrar CC → validación: líneas inventariables existen → efecto: estadoInventario='pendiente')
completo          ← NI generada y confirmada (evento: confirmar NI → validación: todas las cantidades ingresadas
                    cubren lo facturado → efecto: estadoInventario='completo', notasIngresoRelacionadas poblado)
automatico        ← modalidadInventario === 'ingreso_automatico' (evento: registrar CC → efecto inmediato:
                    generarNIAutomatica ejecutada síncronamente → NI ya confirmada → estadoInventario='automatico')
```

*(`parcial` existe en el tipo `EstadoInventarioCC` para una futura Etapa 5 de recepciones parciales — no se usa en el MVP de este diseño, que solo permite 1 NI completa por CC, decisión 3.2. No se elimina del tipo porque `calcularEstadoInventarioCC` ya lo contempla y activarlo en el futuro es solo habilitar la rama de código, no cambiar el modelo.)*

Documentos afectados por transición: `ComprobanteCompra.estadoInventario`, `notasIngresoRelacionadas`, `movimientosInventarioRelacionados`.

### 31.2 Nota de Ingreso (`EstadoNotaIngreso`, ya existente: `'Borrador' | 'Generada' | 'Anulada'`, sin cambio de tipo)

```
Borrador → Generada    (evento: confirmar NI → validación: costo>0 por línea, líneas>0, almacén activo,
                         idempotencia OK → efecto: ServicioKardexValorizado.registrarEntradaValorizada
                         por línea, correlativo asignado)
Generada → Anulada     (evento: anular NI → validación: cada capa de esta NI tiene
                         cantidadDisponible === cantidadInicial (§20.2) → efecto: reverso de movimiento,
                         capas marcadas 'revertida')
```

Bloqueos: `Generada → Generada` (doble confirmación) bloqueado por guard de estado existente + ledger de idempotencia (§21). `Anulada → *` no tiene transición de salida (estado terminal).

### 31.3 Movimiento (`estado`, nuevo campo, §10.6)

```
confirmado → revertido   (evento: revertir movimiento → efecto: crear movimiento inverso con
                           movimientoReversoDeId apuntando a este; el movimiento ORIGINAL se marca
                           'revertido' pero NO se edita ningún otro campo — el reverso es un
                           movimiento nuevo, distinto)
```

No existe transición `revertido → confirmado` (irreversible una vez revertido — para "deshacer un reverso" se generaría un nuevo movimiento, no se resucita el original).

### 31.4 Capa (`EstadoCapaCosto`: `'disponible' | 'agotada' | 'revertida'`, nuevo)

```
disponible → agotada     (evento: consumo que deja cantidadDisponible=0 → efecto: sin cambio de costo,
                           solo estado)
agotada → disponible     (evento: reverso de una salida que había consumido esta capa → efecto:
                           cantidadDisponible vuelve a > 0, §20.3)
disponible → revertida   (evento: reverso de la entrada que creó esta capa, solo si
                           cantidadDisponible === cantidadInicial → §20.2)
```

**No se modela un estado `'transferida'` separado** (decisión explícita, evita redundancia): una capa que se transfiere completamente queda `'agotada'` por la salida de transferencia en el almacén origen — la distinción de "por qué se agotó" ya vive en el `motivo` del movimiento asociado (`TRANSFERENCIA_ALMACEN` vs. `VENTA`, valores ya existentes en `MovimientoMotivo`), no requiere un estado de capa adicional.

### 31.5 Activación de valorización (`Configuration.inventory.estadoValorizacion`, corregido — irreversible)

```ts
// DISEÑO PROPUESTO — gestion-inventario/modelos/EstadoActivacionValorizacion.ts
export type EstadoActivacionValorizacion =
  | 'no_iniciada'
  | 'en_preparacion'
  | 'pendiente_costos'
  | 'validada'
  | 'activando'
  | 'activa'
  | 'suspendida_por_inconsistencia'
  | 'cancelada_antes_activacion'
  | 'fallida_recuperable';
```

```
no_iniciada → en_preparacion              (evento: iniciar el proceso → efecto: se genera
                                            ValorizacionInicialInventario en 'en_revision',
                                            corre la detección de stock existente)
en_preparacion → pendiente_costos         (evento: detección completa → efecto: quedan detalles
                                            sin costoConfirmado y/o tratamientoImpuestoCompra
                                            pendiente)
pendiente_costos → pendiente_costos       (evento: usuario confirma costos parcialmente → se
                                            permanece aquí hasta que TODO esté confirmado)
pendiente_costos → validada               (evento: todos los detalles confirmados Y
                                            tratamientoImpuestoCompra resuelto → validación:
                                            cero detalles sin costoConfirmado>0 Y cero detalles
                                            con requiereRecalculo=true — §24.1ter, un detalle
                                            invalidado por una mutación posterior bloquea esta
                                            transición hasta que se revise de nuevo)
validada → cancelada_antes_activacion     (evento: usuario cancela → efecto: ValorizacionInicialInventario
                                            → 'cancelado', ninguna capa creada, sin cambio de Configuration)
cancelada_antes_activacion → en_preparacion (evento: usuario decide reiniciar el proceso)
validada → activando                      (evento: usuario confirma la activación final → GATEADA
                                            por verificarCondicionesActivacion().listo (§24.1bis):
                                            TODOS los flujos de entrada y salida deben estar
                                            conectados al motor central — si no, esta transición
                                            no se ofrece en la UI. Cuando está lista, arranca la
                                            TransaccionInventario de creación de capas, §22.2, con
                                            clave VALORIZACION-INICIAL-${id})
activando → activa                        (evento: la TransaccionInventario se confirma → efecto:
                                            costMethod='FIFO' forzado, ValorizacionInicialInventario
                                            → 'confirmado' — TERMINAL respecto a desactivación)
activando → fallida_recuperable           (evento: la transacción se interrumpe a mitad de camino
                                            → efecto: NINGUNO manual — se recupera con el mismo
                                            mecanismo de §22.3, misma clave de idempotencia)
fallida_recuperable → activando           (evento: se reintenta/completa la recuperación)
activa → suspendida_por_inconsistencia    (evento: reconciliarProyeccionStockInventario detecta
                                            inconsistencia crítica → efecto: bloquea mutaciones,
                                            NO cambia costMethod, NO permite modo cuantitativo)
suspendida_por_inconsistencia → activa    (evento: administrador reconcilia la inconsistencia
                                            vía reconstruirProyeccionDesdeCapas, §8.1)
```

**`activa` y `suspendida_por_inconsistencia` son los únicos estados alcanzables después del primer movimiento valorizado confirmado — ninguno de los dos tiene transición de regreso hacia `no_iniciada`/`en_preparacion`/`pendiente_costos`/`validada`/`cancelada_antes_activacion`.** Esto reemplaza por completo cualquier mención anterior de `valorizacionActiva=false` como mecanismo de rollback (§24.4).

### 31.6 `TransaccionInventario.estado` (diario transaccional, §22)

```
preparada → confirmando   (evento: la verificación previa —versión, invariantes, disponibilidad—
                            pasó y comienza a aplicar escrituras de dominio, pasos 11-12 de la
                            secuencia única, §22.2)
confirmando → confirmada  (evento: todas las escrituras aplicadas y verificadas, paso 17 de la secuencia única, §22.2)
preparada → fallida       (evento: recuperación detecta 'preparada' sin ninguna escritura de
                            dominio aplicada → se descarta sin tocar datos, libera la clave)
confirmando → revertida   (evento: recuperación determina que la operación debe revertirse en
                            vez de completarse — solo aplicable si el propio tipo de operación
                            define un reverso seguro, ej. una activación cuya validación posterior
                            falla; el caso normal es completar, no revertir, ver §22.3)
```

Terminales: `confirmada`, `fallida`, `revertida` — ninguna transición de salida.

### 31.7 `OperacionIdempotenteInventario.estado`

```
preparada → confirmada    (evento: la TransaccionInventario asociada llega a 'confirmada')
preparada → fallida       (evento: la TransaccionInventario asociada se descarta sin aplicar nada)
confirmada → revertida    (evento: se revierte la operación de negocio que esta clave representa —
                            ej. anular una NI cuya entrada esta clave había confirmado; NO borra
                            la fila, la marca revertida para que un futuro reintento con la misma
                            clave sepa que ya se procesó y fue revertido, no que nunca ocurrió)
```

### 31.8 Matriz de estados y transiciones (resumen)

| Entidad | Estados | Transición | Evento | Validaciones | Efectos | Bloqueos |
|---|---|---|---|---|---|---|
| `ComprobanteCompra.estadoInventario` | pendiente/completo/automatico/no_aplica/(parcial futuro) | pendiente→completo | Confirmar NI manual | Líneas inventariables, costo válido | NI generada, relaciones pobladas | Segunda NI mientras haya una activa |
| `ComprobanteCompra.estadoInventario` | — | (creación)→automatico | Registrar CC en modalidad automática | Idem | NI generada y confirmada en el mismo flujo | Doble generación (idempotencia) |
| `NotaIngreso.estado` | Borrador/Generada/Anulada | Borrador→Generada | Confirmar | Costo>0, idempotencia | Movimiento+capa creados | Confirmar dos veces |
| `NotaIngreso.estado` | — | Generada→Anulada | Anular | Capa no consumida | Reverso de movimiento | Si ya se consumió (§20.2) |
| `MovimientoStock.estado` | confirmado/revertido | confirmado→revertido | Revertir | Reglas por tipo (§20) | Movimiento inverso creado | Revertir dos veces |
| `CapaCostoInventario.estado` | disponible/agotada/revertida | disponible→agotada | Consumo total | — | Sin cambio de costo | — |
| `CapaCostoInventario.estado` | — | agotada→disponible | Reverso de salida | — | Restaura cantidad | — |
| `CapaCostoInventario.estado` | — | disponible→revertida | Reverso de entrada | Sin consumo previo | Capa anulada | Si hay consumo parcial/total |
| `TransaccionInventario.estado` | preparada/confirmando/confirmada/revertida/fallida | preparada→confirmando→confirmada | Confirmar operación | Invariantes post-escritura (§32) | Escrituras de dominio aplicadas | — |
| `OperacionIdempotenteInventario.estado` | preparada/confirmada/fallida/revertida | preparada→confirmada | Transacción asociada confirma | Hash coincide | `resultadoIds` poblado | Hash distinto bajo misma clave |
| `Configuration.inventory.estadoValorizacion` | 9 estados (§31.5) | validada→activando→activa | Confirmar activación | Costos+tratamiento tributario resueltos **Y** `verificarCondicionesActivacion().listo` (§24.1bis, todos los flujos productivos migrados) | Capas iniciales creadas, terminal | Ninguna transición de regreso desde `activa`; comportamiento por estado detallado en §24.1quater (sin mutación libre en `validada`/`activando`/`fallida_recuperable`) |

---

## 32. Invariantes

| # | Invariante | Dónde se protege | Cómo se valida |
|---|---|---|---|
| 1 | No existe stock positivo valorizado sin costo | `ServicioKardexValorizado.registrarEntradaValorizada` | Rechaza si `costoUnitarioBaseOriginal <= 0` antes de escribir |
| 2 | No existe capa con cantidad negativa | `consumirCapasFIFO` | Nunca toma más de `capa.cantidadDisponible`; el bucle se detiene cuando `restante<=0` |
| 3 | Σ `cantidadDisponible` de capas de un producto+almacén == stock valorizado esperado | Función de auditoría periódica (nueva, opcional, no bloqueante) `verificarConsistenciaCapas(productoId, almacenId)` | Compara Σ capas vs. `Product.stockPorAlmacen[almacenId]`; discrepancia se reporta como alerta, no bloquea operación (dado que puede haber stock legado sin capa, ver §33 R-01) |
| 4 | Toda entrada positiva crea movimiento y capa en una operación atómica | UoW (§22.2) | `movimientosNuevos` y `capasNuevas` se calculan juntos en el mismo `PlanOperacionInventario` (§12.2) y se escriben dentro de la misma `TransaccionInventario`, verificada por versión antes de escribir (§12.3, §22.1bis) — nunca en pasos independientes que puedan quedar a medias |
| 5 | Toda salida crea movimiento y consumos FIFO en una operación atómica | UoW (§22.2) | Igual, con `escrituras.consumos` |
| 6 | Todo costo de venta se deriva de consumos de capas reales | `ServicioKardexValorizado.registrarSalidaValorizada` | `costoVentaTotal` se calcula exclusivamente como Σ `ConsumoCapaCostoInventario.valorConsumidoMonedaBase` generados en la misma operación — nunca de un valor externo |
| 7 | Ningún costo histórico se recalcula con datos actuales | Diseño de todas las funciones de consulta (§27, §28) | Las funciones de reporte/detalle **leen** campos persistidos (`costoVentaTotal`, `capa.costoUnitarioBaseMonedaBase`) — ninguna vuelve a invocar `calcularCostoValorizableLinea` sobre datos ya persistidos |
| 8 | Ningún CC genera dos veces el mismo ingreso | Idempotencia (§21) | Clave `NI-AUTO-${ccId}` / bloqueo de segunda NI mientras haya una activa (§14.3) |
| 9 | Ninguna NI se confirma dos veces | Guard de estado existente (`estado==='Generada'` ya lanza) + idempotencia nueva | Doble verificación (§21.4) |
| 10 | Ninguna venta descuenta dos veces el stock | Idempotencia (§21.4, clave estable `VENTA-STOCK-${documentoVentaId}`) | `documentoVentaId` persistido antes de mutar inventario, nunca un UUID nuevo por intento (§21.3) |
| 11 | Toda anulación conserva historial | Diseño de reversos (§20) | Se crea movimiento/consumo de reverso, nunca se edita/elimina el original |
| 12 | Un reverso usa cantidad y costo originales | §20.2, §20.3 | El reverso lee `capa.costoUnitarioBaseMonedaBase`/`consumo.valorConsumidoMonedaBase` ya persistidos, nunca recalcula |
| 13 | Una transferencia conserva el valor total trasladado | §19.1 | `costoUnitarioBaseMonedaBase` de la capa nueva = el de la capa origen, sin operación aritmética adicional |
| 14 | El pago no modifica stock ni costo | Sin cambio — ya así hoy (auditoría confirmó desacoplamiento limpio) | `CuentaPorPagar`/`PagoCompra` no referencian `ServicioKardexValorizado` en ningún punto del diseño |
| 15 | Una línea no inventariable nunca crea Kardex | `calcularEsInventariable` (§14.1) | `ServicioKardexValorizado` nunca se invoca para líneas con `esInventariable=false` |
| 16 | La suma de consumos de una salida coincide con la cantidad en unidad mínima solicitada | `consumirCapasFIFO` | Si `cantidadCubierta < cantidadUnidadMinima` → la operación completa se aborta (§18.2), nunca se persiste un consumo parcial silencioso |
| 17 | La suma del costo de los consumos coincide con el costo de venta persistido | `registrarSalidaValorizada` | `costoVentaTotal = Σ valorConsumidoMonedaBase` calculado en la misma operación, no dos fuentes separadas |
| 18 | El valor de una capa inicial coincide con cantidad × costo según la política de precisión | `CapaCostoInventario.valorValorizableMonedaBase` | Calculado una única vez al crear la capa, con `normalizarImporte` (§17.3) |
| 19 | No se activa el valorizado con stock positivo pendiente de costear | Proceso de activación (§24.1, paso 4) | Bloquea si algún `DetalleValorizacionInicial.cantidadDetectada > 0` no tiene `costoConfirmado > 0` |
| 20 | Los IDs de documentos permanecen estables y no dependen de textos | §11.1 | Todas las relaciones nuevas usan campos `*Id`, nunca `documentoReferencia` (texto) como relación técnica |
| 21 | **Ninguna consulta, mutación, capa, consumo, reverso o clave de idempotencia puede cruzar datos entre empresas** | `empresaId` en todos los modelos nuevos (§6, §9) | Todo repositorio nuevo (`RepositorioCapasCostoInventario`, `RepositorioConsumosCapasInventario`, `RepositorioOperacionesIdempotentesInventario`, repositorio de `ValorizacionInicialInventario`/`LoteImportacionValorizada`) filtra y valida `empresaId` explícitamente en cada lectura/escritura — el namespace de `localStorage` (`lsKey()`) es una protección adicional, no un sustituto (ver pruebas T-21/T-22, §36) |
| 22 | Un cambio posterior en el catálogo no altera la naturaleza, cantidad ni costo histórico de un documento confirmado | §10.0 (principio general de snapshot), `LineaCompra`/`LineaNotaIngreso`/`CapaCostoInventario` | Todo dato derivado del catálogo (naturaleza inventariable, factor, unidad, afectación tributaria, recuperabilidad, moneda, TC, costo valorizable, almacén, presentación) se persiste como snapshot al confirmar el documento — ninguna función de lectura vuelve a consultar `Product`/`Tax`/`Configuration` vigentes para reconstruir un dato histórico |
| 23 | Stock proyectado por almacén = suma de cantidades disponibles de las capas activas | §8.1 (jerarquía canónica de cantidades), `reconciliarProyeccionStockInventario` | `Product.stockPorAlmacen` se actualiza dentro de la misma unidad de trabajo que crea/consume capas (§22); la función de reconciliación detecta y reporta cualquier divergencia — nunca reconstruye capas desde el agregado, solo reconstruye el agregado desde las capas |
| 24 | Después de `estadoValorizacion==='activa'`, una entrada sin capa es inválida y una salida sin consumos es inválida — no existe camino cuantitativo directo | Contrato discriminado `modoOperacion` (§12.1) + `resolverModoOperacion` (§24.1ter) | `prepararOperacionInventario` rechaza `modoOperacion:'cuantitativo'` cuando el modo resuelto es `'valorizado_exclusivo'`, antes de cualquier otro cálculo |
| 25 | La reserva de idempotencia existe antes de mutar cualquier dato de dominio | `reservarOperacionIdempotente` (§12.1bis) | Es la primera escritura de toda la secuencia — `prepararOperacionInventario`/`confirmarOperacionInventario` reciben la reserva ya hecha, nunca la crean |
| 26 | Un plan construido sobre una versión de Inventario anterior no se aplica — ningún conflicto de versión aplica escrituras parciales | `EstadoVersionInventario` (§9.6bis), paso 11 de la secuencia única (§22.2) | Se relee la versión mientras la transacción sigue `'preparada'` (antes de marcarla `'confirmando'`); si difiere de `plan.versionEsperada`, se aborta sin tocar dominio y se libera la reserva de idempotencia |
| 27 | La versión de Inventario de una empresa aumenta con cada operación confirmada, nunca con una fallida o abortada | `confirmarOperacionInventario` paso 9 (§12.3) | El incremento ocurre únicamente tras marcar la `TransaccionInventario` `'confirmada'` — una transacción `'fallida'` no incrementa la versión |
| 28 | Una `TransaccionInventario` en `'confirmada'` con su `OperacionIdempotenteInventario` todavía en `'preparada'` es un estado recuperable, nunca uno que se ignora | Recuperación (§22.3, tabla ampliada de §22.4) | La rutina de recuperación detecta esta combinación específica (no solo `'preparada'`/`'confirmando'` de la transacción) y completa la idempotencia sin reprocesar el plan |
| 29 | El valor remanente de una capa se deriva siempre de `valorValorizableMonedaBase − Σ valorConsumidoMonedaBase` de consumos confirmados no revertidos — nunca de `cantidadDisponible × costoUnitarioBaseMonedaBase` | `calcularValorDisponibleCapa` (§18.5bis) | Toda consulta de valor de stock (§27, §28, §30) usa esta función derivada; el producto cantidad×costo se admite solo como control auxiliar de sanidad, nunca como fuente |
| 30 | Una NI automática (`EstadoIngresoAutomatico !== 'completado'`) nunca se presenta como ingreso terminado, y bloquea una segunda NI (manual o automática) sobre el mismo CC | Saga de ingreso automático (§14.2) | La UI lee `cc.estadoIngresoAutomatico`; `puedeGenerarNIDesdeCC` (§14.3) bloquea mientras exista una NI relacionada con `estado !== 'Anulada'` |
| 31 | El gate previo a `validada→activando` nunca exige `capaGeneradaId`/`movimientoEntradaId` — solo exige que cada detalle sea valorizable; esos campos se verifican y pueblan exclusivamente en la confirmación posterior a aplicar la transacción de activación | `verificarTodoStockPositivoValorizado` (§24.1bis.2), confirmación posterior (§24.1bis.3) | Ningún requisito de `verificarCondicionesActivacion` referencia campos que solo existen tras `activando→activa`; su ausencia previa nunca es motivo de bloqueo |
| 32 | `validada` admite exactamente una operación valorizada — `tipoOperacion==='valorizacion_inicial'` con el gate ya aprobado — y ninguna otra (venta, entrada ordinaria, salida, transferencia, ajuste, NI, devolución valorizadas siguen bloqueadas) | `modoOperacionPermitidoEnValidada` (§24.1bis.3) | `prepararOperacionInventario` verifica esta excepción antes de aceptar cualquier operación en modo `'valorizado'` cuando `estadoValorizacion==='validada'` |
| 33 | El criterio de `estadoIngresoAutomatico==='completado'` nunca exige una capa cuando la saga se preparó en modo cuantitativo — el modo se resuelve una sola vez al iniciar la saga y no se reevalúa a mitad de camino | `sagaCompleta` (§14.2.1) | `modoVigente` se fija en el paso 5bis de §14.2 y se usa igual en la ejecución normal y en la recuperación tras interrupción |

**Capa donde se valida cada invariante** (agrupado, no fila por fila): **preparación** (`prepararOperacionInventario`) — 1, 2, 15, 16, 18, 19, 20, 21, 24; **confirmación** (`confirmarOperacionInventario`) — 4, 5, 25, 26, 27; **repositorio** (filtro `empresaId` en cada lectura/escritura) — 21, 23; **recuperación** (§22.3/§22.4) — 28; **reconciliación** (`reconciliarProyeccionStockInventario`) — 8, 23, 29; **activación** (`verificarCondicionesActivacion`) — 9, 10, 19, 22, 24.

---

## 33. Riesgos

### 33.1 Matriz de riesgos

| ID | Prioridad | Riesgo | Mitigación | Etapa |
|---|---|---|---|---|
| R-01 | P0 | Stock existente (cantidad) puede no coincidir con la suma de capas migradas si hay desalineación previa entre `stockPorAlmacen` y la realidad (ej. ajustes no registrados) | Función `reconciliarProyeccionStockInventario` (§8.1, invariante 23) como reporte de alerta antes de activar; el proceso de migración usa `stockPorAlmacen` como fuente única de cantidad a valorizar (no reconstruye desde el historial de movimientos) | Etapa 0/2 |
| R-02 | P0 | Pérdida de precisión por redondeo acumulado en costos unitarios con muchos decimales | Política de precisión centralizada §17.3 (constantes por concepto, residual en el último consumo de cada capa) | Etapa 1A |
| R-03 | P0 | Movimientos duplicados por reintento (doble-click, recarga, reintento tras error) | Idempotencia de dominio con hash y clave estable (§21), no solo booleano de UI | Etapa 1B-1D |
| R-04 | P0 | Stock y capas desalineados si un flujo nuevo omite pasar por `ServicioKardexValorizado` | Migrar los 7 llamadores identificados en §12.5 a lo largo de las Etapas 1C-1E (no dejar ningún canal de venta sin migrar) — riesgo de "motor huérfano" si se migra parcialmente | Etapa 1C-1E |
| R-05 | P0 | Persisten 3 motores de salida si la migración de llamadores no es completa | Checklist explícito de los 7 llamadores (§12.5) como criterio de aceptación de las Etapas 1C-1E; `InventoryService.registerAdjustment`/`inventory.facade.ts::addMovimiento` marcados `@deprecated` desde el inicio de la migración (§12.4) | Etapa 1C-1E |
| R-06 | P1 | Relaciones por texto libre (`documentoReferencia`) siguen existiendo en paralelo a las nuevas FK — riesgo de que código nuevo use la fuente equivocada por costumbre | Code review explícito: toda nueva relación debe usar los campos `*Id`, `documentoReferencia` queda solo para presentación | Etapa 1A |
| R-07 | P1 | Cambio de factor de conversión histórico si algún flujo no migrado sigue reconsultando el factor vigente en vez del snapshot | Snapshot obligatorio en `factorConversionAplicado` (§10.3/10.5, también en `CapaCostoInventario`, §9.2); auditar que ningún reporte de costo recalcule con `getFactorToUnidadMinima` sobre datos ya persistidos | Etapa 0/1C |
| R-08 | P1 | Líneas históricas de Compra/NI sin `factorConversionAplicado` (creadas antes de este diseño) — no se puede reconstruir su snapshot real | Se documenta como limitación de migración (no se inventa el dato); reportes que dependan de este campo para históricos deben mostrar "snapshot no disponible" explícitamente, no asumir factor 1 | Etapa 0 |
| R-09 | P1 | Tipo de cambio actual aplicado a una capa histórica si algún reporte usa `currencyManager.getRate()` en vez de leer `capa.tipoCambioAplicado` | Prohibición explícita en el diseño (§17.2) + revisión de que ninguna función de reporte llame `getRate`/`convert` sin `rateOverride` sobre datos de capas ya creadas | Etapa 4/5 |
| R-10 | P1 | Migración parcial: algunas empresas activan valorización y otras no, coexistiendo en el mismo código | `Configuration.inventory.estadoValorizacion` es una máquina de estados **por empresa** (§31.5) — `puedeMutarInventario(estado)`/`esValorizacionActiva(estado)` deciden el comportamiento para esa empresa específica; una empresa en `no_iniciada`/`en_preparacion`/etc. sigue operando cuantitativamente mientras otra ya está `'activa'`, sin que ninguna de las dos vea a la otra — coexistencia por diseño de datos, no por un booleano global compartido | Etapa 2/3 |
| R-11 | P1 | Eliminación prematura de `precioCompra` mientras aún tenga consumidores no migrados | Condición de eliminación objetiva por grep (§25.3), no por fecha — bloquea la eliminación hasta verificar cero consumidores | Etapa 3/5 |
| R-12 | P1 | Anulación después de consumo parcial de una capa — el usuario puede no entender por qué se bloquea | Mensaje de error explícito (§20.2) explicando la causa (parte del stock ya se vendió/transfirió) | Etapa 3 |
| R-13 | P1 | Transferencias con reverso complejo si las capas de destino ya se consumieron parcialmente en el almacén destino | Bloqueo explícito (§19.2, mismo patrón que §20.2); linaje completo para anulación de la entrada original (§20.6) | Etapa 1E/4 |
| R-14 | P2 | Importación por reemplazo con reducción de stock que no puede cubrirse con las capas disponibles sin dejar remanente negativo | Bloqueo explícito con mensaje claro (§13.4), en vez de forzar el reemplazo | Etapa 2 |
| R-15 | **P1** | `localStorage` sin transacciones reales — ventana de riesgo entre validar y escribir si el proceso del navegador se interrumpe (cierre de pestaña, crash), y colisión si dos pestañas operan la misma empresa simultáneamente | El diario transaccional recuperable (§22) minimiza y hace determinística la recuperación de la ventana de interrupción; el control optimista de versión + bloqueo cooperativo (§22.1bis, §9.6bis) detecta la colisión multi-pestaña **antes del commit** en vez de dejarla como riesgo silencioso — sigue siendo un riesgo residual reconocido (no hay lock real en `localStorage`, la detección es determinística pero no elimina la ventana de raíz) — backend futuro lo resuelve definitivamente con transacciones reales (§23). Se eleva de P2 a P1 porque el volumen de uso concurrente esperado (múltiples cajas POS de un mismo establecimiento) hace la colisión razonablemente probable, no un caso extremo | Etapa 1B (mitigado con control de versión, no eliminado por completo) |
| R-16 | P2 | Volumen de capas y rendimiento — un producto de alta rotación puede acumular miles de capas a lo largo del tiempo, con consultas FIFO cada vez más costosas sobre `localStorage` | Fuera de alcance resolver en este diseño de frontend-only; se documenta como razón adicional para priorizar el backend real (§23) antes de escalar a volúmenes altos | Etapa 5 / backend futuro |
| R-17 | P2 | Consultas de reportes (`obtenerValorStock`, agregaciones por periodo) recorriendo todas las capas/consumos sin índices, en `localStorage` | Mismo comentario que R-16 — aceptable para el volumen actual de un prototipo frontend, no para escala de producción | Etapa 5 / backend futuro |
| R-18 | P2 | Compatibilidad con futuro backend si el diseño de `ServicioKardexValorizado` no sigue el patrón de funciones puras con parámetros explícitos | Diseño ya sigue ese patrón — `prepararOperacionInventario` es pura por construcción (§12.2), verificado contra el precedente real (`generarNIEnInventario`) | Etapa 1B |
| R-19 | P2 | Multiempresa: la recuperación del diario transaccional (§22.3) podría filtrar entre tenants si `lsKey()` no se respeta en algún nuevo repositorio | Todos los repositorios nuevos (`RepositorioCapasCostoInventario`, `RepositorioConsumosCapasInventario`, `RepositorioOperacionesIdempotentesInventario`, `RepositorioTransaccionesInventario`) deben usar `lsKey()` igual que `StockRepository`, y además filtrar explícitamente por `empresaId` en cada consulta (invariante 21, §32) — doble verificación, no solo namespace | Etapa 1A |
| R-20 | P2 | Multiestablecimiento/multialmacén: capas de un mismo producto en distintos establecimientos podrían mezclarse si una consulta olvida filtrar por `establecimientoId` | `CapaCostoInventario.establecimientoId` es campo obligatorio (no opcional) — toda función de consulta debe recibirlo explícitamente, sin default | Etapa 1A |
| R-21 | P1 | Reintento con hash de entrada distinto bajo la misma clave de idempotencia (conflicto real, no duplicado) mal manejado devolvería un resultado incorrecto en silencio | `ConflictoIdempotencia` explícito (§21.2) — nunca se construye un resultado a partir de una entrada distinta a la que originó la clave | Etapa 1B |
| R-22 | P1 | Suspensión por inconsistencia (`suspendida_por_inconsistencia`) bloquea una empresa completa hasta diagnóstico manual — riesgo operativo si no hay panel de diagnóstico a tiempo para cuando una empresa pueda alcanzar `'activa'` | El panel de diagnóstico (§22.4, journal corrupto) debe estar disponible desde el cierre de la Etapa 4 (primera etapa donde `'activa'` es alcanzable) — se incluye como criterio de aceptación de esa etapa, no como mejora posterior | Etapa 4 |
| R-23 | P0 | Activar una empresa (`validada→activando`) antes de que todos los flujos de entrada y salida estén conectados al motor central dejaría ventas/entradas descontando stock por el camino cuantitativo antiguo sin consumir capas, en una empresa que el sistema ya reporta como "valorizada" | `verificarCondicionesActivacion()` (§24.1bis) gatea la transición; la acción "Confirmar activación" ni siquiera se entrega en la UI hasta el cierre de la Etapa 4 (§34) — no es un booleano de configuración, es código que no existe hasta entonces | Etapa 2/4 |

---

## Estándares técnicos de implementación

Esta sección aplica a **todas** las etapas del plan (§34) y a cualquier implementación futura derivada de este diseño — es una sección nueva, exigida explícitamente, no numerada dentro de la secuencia 1-40 porque aplica transversalmente a todas ellas.

### Cero tolerancia

Ninguna etapa de implementación puede introducir:

- **Cero hardcode** — ninguna tasa de impuesto, precisión decimal, moneda base, ni umbral de negocio escrito directamente en el código; todo pasa por configuración (`Tax`, `Configuration.inventory`, `precisionInventario.ts`).
- **Cero parches** — un bug se corrige en su causa raíz (ej. si `registerAdjustment` no valida stock suficiente, se corrige la validación en el motor central, no se agrega un chequeo adicional disperso en el llamador).
- **Cero lógica duplicada** — si una regla ya existe (conversión de unidad, cálculo de IGV, redondeo), se reutiliza; no se reimplementa una segunda vez "por si acaso" (el propio problema que esta corrección resuelve respecto al parseo de impuesto duplicado en 4 archivos, auditoría §5.8).
- **Cero código muerto** — ninguna función, campo o archivo se introduce sin un consumidor real identificado en la etapa que lo introduce (ver §37.0, columna "Necesidad").
- **Cero configuraciones sin efecto** — se elimina `autoUpdateCosts` precisamente por ser una configuración fantasma (§10.11); ninguna configuración nueva de este diseño puede terminar en el mismo estado.
- **Cero campos sin consumidores** — todo campo nuevo declarado en §10 tiene, en la misma tabla, su consumidor identificado.
- **Cero archivos innecesarios** — la clasificación de necesidad de §37.0 (indispensable/probable/opcional/no recomendado) es vinculante; no se crean archivos "opcional" sin justificación explícita en esa tabla.
- **Cero `any` para evitar modelado** — si un dato necesita una unión discriminada (ej. `tipoDocumentoOrigen`), se modela como tal; `any` no es un sustituto de decidir la forma del dato.
- **Cero casts inseguros como solución** — un cast (`as X`) nunca reemplaza una validación o una conversión real; si aparece uno, es señal de que falta una función de conversión propiamente dicha.
- **Cero relaciones por texto** — ninguna relación técnica nueva usa `documentoReferencia` ni ningún otro campo de texto libre (invariante 20, §32); todas usan campos `*Id`.
- **Cero cambios históricos silenciosos** — ningún dato persistido de una capa, consumo, movimiento o línea de venta se recalcula ni se sobrescribe después de confirmado (invariantes 7, 12, 22, §32).
- **Cero mutaciones fuera del motor central** — toda mutación de stock valorizado pasa por `prepararOperacionInventario`/`confirmarOperacionInventario` (§12); no se acepta un segundo camino, ni siquiera "temporal", que escriba `CapaCostoInventario`/`ConsumoCapaCostoInventario` por fuera de esas dos funciones.
- **Cero reglas tributarias copiadas** — la resolución de IGV/recuperabilidad vive exclusivamente en `resolverTratamientoTributarioProducto` (§16.1, que delega en `resolverImpuestoProducto` solo como fallback legado para productos sin `impuestoId`) + `Configuration.inventory.tratamientoImpuestoCompra` (§16); ninguna función nueva llama a `resolverImpuestoProducto`/`resolverAfectacionDesdeImpuesto`/`resolveIgvRate`/`resolveIgvRateNS` directamente ni reimplementa su propio parseo de impuesto.
- **Cero conversiones de unidad duplicadas** — toda conversión pasa por `shared/inventory/unitConversion.ts` (existente); ninguna función nueva reimplementa `getFactorToUnidadMinima`.
- **Cero `toFixed()` como lógica de negocio** — solo `redondearAPrecision`/`normalizarImporte` (§17.3) redondean valores de negocio.
- **Cero dependencia exclusiva de la UI para validaciones** — toda validación de negocio (costo>0, stock suficiente, línea inventariable) vive en `prepararOperacionInventario` o en las funciones de reglas que invoca, nunca solo en un componente de React (defensa en profundidad, ya es el patrón de `registerAdjustment` hoy con `cantidad>0`).
- **Cero compatibilidad legacy indefinida** — toda deprecación (`registerAdjustment`, `addMovimiento`, `precioCompra`) tiene una condición de eliminación objetiva y verificable (cero consumidores, por grep), nunca una fecha "eventual" sin criterio.
- **Cero warnings nuevos, cero errores de TypeScript, cero fallos de lint, cero archivos temporales** dejados en el repositorio al cerrar cualquier etapa.

### Principios positivos

- **Reutilizar fuentes de verdad** existentes (`unitConversion.ts`, `currencyManager`, `Tax`, `stockGateway.ts`) — este diseño extiende, no reconstruye.
- **Refactorizar la raíz, no parchar síntomas** — la separación preparar/confirmar (§12) es un ejemplo: en vez de agregar más validaciones alrededor de `registerAdjustment`, se corrige la raíz (que persiste antes de tiempo).
- **Eliminar código deprecado cuando llegue a cero consumidores** — no antes (rompería flujos), no "eventualmente" sin verificar (dejaría código muerto indefinido).
- **Documentar excepciones reales** — cuando algo queda fuera del MVP (landed cost, NC de compra completa, recepciones parciales), se declara explícitamente en §39, nunca se implementa a medias sin decirlo.
- **No crear abstracciones sin consumidor** — ninguna interfaz/tipo nuevo de este diseño se introduce antes de que exista (o esté planificado en la misma etapa) quien lo consuma.
- **No crear otro módulo de Inventario** — todo vive en `gestion-inventario/` (§37.0).
- **Mantener toda infraestructura nueva en español** — nomenclatura de dominio, en línea con la corrección de §2 de este encargo.

### Verificación al cierre de cada etapa

```
npx tsc -b --noEmit
npm run lint
npm run build
git diff --check
git status --short
```

### Niveles de verificación — no confundir uno con otro

| Nivel | Qué verifica | Qué NO verifica |
|---|---|---|
| Validaciones de código (`tsc`, `lint`) | Tipos correctos, ausencia de errores de sintaxis/estilo | Que la lógica de negocio sea correcta |
| Pruebas unitarias | Una función pura (`calcularCostoConsumo`, `consumirCapasFIFO`) produce el resultado esperado para entradas controladas | Que la integración entre funciones sea correcta |
| Pruebas de integración de dominio | `prepararOperacionInventario`+`confirmarOperacionInventario` end-to-end contra repositorios reales (`localStorage` simulado) | Comportamiento real del navegador, recarga, multi-pestaña |
| Pruebas reales de navegador | Recarga a mitad de operación, cierre de pestaña, comportamiento observable en la UI real | Nada reemplaza esto — es la única forma de validar recuperación real |

**Un `build` limpio no es una prueba funcional.** Cada etapa del plan (§34) debe completar su propia lista de pruebas (§36) antes de considerarse terminada — `tsc`/`lint`/`build` en verde es una condición necesaria, no suficiente.

---

## 34. Plan por etapas (corregido — sin Etapa 1 monolítica, sin rollback por booleano, sin recomendaciones de ramas)

**Corrección obligatoria**: la versión anterior concentraba todo el motor central en una única "Etapa 1" y usaba `valorizacionActiva=false` como estrategia de rollback en 2 etapas distintas — ambas cosas se corrigen aquí. La Etapa 1 se divide en 5 subetapas (1A-1E), y ningún rollback depende de alternar un booleano después de haber operado en modo valorizado (consistente con §24.4). **Corrección obligatoria (cuarta pasada): este documento no recomienda nombres de rama ni comandos de creación de ramas** — la gestión de ramas es una decisión operativa del equipo, fuera del alcance de un documento de diseño; cada etapa se describe por su objetivo, alcance y criterios de aceptación, no por dónde se implementa en el control de versiones.

### Etapa 0 — Saneamiento y fuentes de verdad

- **Objetivo**: corregir ambigüedades de modelo que existen HOY, independientemente de la valorización — condición previa para que las etapas siguientes no hereden bugs de base.
- **Alcance**: `esProductoInventariable` (nueva función única), `esInventariable`/`afectaInventario` en `LineaCompra` (§14.1), conectar `calcularEstadoInventarioCC`/`OC` (ya existentes, huérfanas) en reemplazo de `derivarEstadoInventarioCC`, aplicar factor de conversión en `mapeadorCCaNI.ts` (§15.1), eliminar `Configuration.inventory.autoUpdateCosts` (fantasma), agregar `Configuration.inventory.tratamientoImpuestoCompra` (§16, sin valor por defecto operativo), **unificar las 4 implementaciones de parseo tributario en `resolverTratamientoTributarioProducto` (§16.1, bloqueante P0 — el costo valorizable de toda etapa posterior depende de esta única fuente)**, `cantidadDocumentadaInventariable` snapshot en `LineaCompra` (§8.1). **`mapeadorCCaNI.ts` puede corregirse y probarse en esta etapa (unitariamente), pero NO se conecta a ningún flujo funcional que genere stock** — esa conexión ocurre recién en la Etapa 3, cuando ya existe el motor valorizado que puede recibir sus datos con seguridad.
- **Módulos**: Productos, Compras, Configuración.
- **Dependencias**: ninguna previa.
- **Riesgos**: R-07, R-08.
- **Criterios de aceptación**: `calcularEstadoInventarioCC` reemplaza a `derivarEstadoInventarioCC` en `ContextoCompras.tsx`; ninguna línea de servicio queda marcada `afectaInventario=true` dentro de un CC; `mapeadorCCaNI.ts` tiene pruebas unitarias propias, **sin** ningún llamador productivo todavía (no es criterio de esta etapa que "deje de ser huérfano" mediante un consumidor operativo — eso es criterio de la Etapa 3).
- **Pruebas**: escenarios 2, 7 (§36).
- **Complejidad**: media. **Prioridad**: P0.
- **Rollback**: revertir el commit — no hay datos nuevos persistidos en esta etapa (solo lógica).
- **Definición de terminado**: build + lint sin errores; los cambios de `afectaInventario` no alteran ningún CC ya registrado (solo aplican a registros nuevos).

### Etapa 1A — Modelos y repositorios

- **Objetivo**: crear todas las entidades nuevas de datos, sin ningún consumidor productivo todavía — puramente aditivo.
- **Alcance**: `CapaCostoInventario`, `ConsumoCapaCostoInventario`, `OperacionIdempotenteInventario`, `TransaccionInventario`, `EstadoActivacionValorizacion` (modelos, §9); `RepositorioCapasCostoInventario`, `RepositorioConsumosCapasInventario`, `RepositorioOperacionesIdempotentesInventario`, `RepositorioTransaccionesInventario` (repositorios); `empresaId` agregado a `MovimientoStock`; `precisionInventario.ts` (constantes); invariantes 1-3, 18, 20-23 verificables desde este punto (aunque nada las ejercite todavía).
- **Módulos**: Inventario (solo modelos/repositorios, sin tocar servicios existentes).
- **Dependencias**: Etapa 0.
- **Riesgos**: R-19, R-20 (aislamiento multiempresa debe verificarse desde el primer archivo).
- **Criterios de aceptación**: todos los modelos compilan; los repositorios tienen pruebas unitarias de CRUD básico con filtro por `empresaId`; cero referencias desde código existente (nada los usa todavía).
- **Pruebas**: T-21, T-22 (aislamiento multiempresa, §36).
- **Complejidad**: baja. **Prioridad**: P0.
- **Rollback**: revertir el commit — cero consumidores, cero riesgo de romper algo existente.
- **Definición de terminado**: build + lint sin errores; cobertura unitaria de repositorios.

### Etapa 1B — Unidad de trabajo y recuperación

- **Objetivo**: implementar el diario transaccional recuperable (§22) — sigue sin consumidores productivos, se prueba de forma aislada.
- **Alcance**: `unidadTrabajoInventario.ts` (secuencia única de 19 pasos, §22.2), `reconciliacionStockInventario.ts`, `estadoValorizacionInventario.ts` (helpers), rutina de recuperación al iniciar el módulo (§22.3).
- **Módulos**: Inventario (utilidades).
- **Dependencias**: Etapa 1A.
- **Riesgos**: R-15 (multi-pestaña, mitigación parcial reconocida).
- **Criterios de aceptación**: pruebas de interrupción simuladas (cierre antes de `preparada`, entre `preparada` y `confirmando`, a mitad de escrituras) pasan con recuperación determinística, sin intervención manual.
- **Pruebas**: escenarios 1-8 de la lista de 28 (§36) — todos los de recuperación/journal.
- **Complejidad**: alta. **Prioridad**: P0.
- **Rollback**: revertir el commit — sigue sin consumidores productivos.
- **Definición de terminado**: suite de pruebas de interrupción en verde, incluyendo journal corrupto (→ `suspendida_por_inconsistencia` simulada).

### Etapa 1C — Motor central de entradas

- **Objetivo**: `prepararOperacionInventario`/`confirmarOperacionInventario` para entradas (NI, ajustes positivos, importación, devolución de cliente) — primeros consumidores productivos, en modo cuantitativo puro (ninguna empresa ha activado valorización aún).
- **Alcance**: `servicioKardexValorizado.ts` (mitad de entradas), extracción de `InventoryService.calcularAjustePropuesto` (pura, §12.4), migración de `generarNIEnInventario`/`anularNIEnInventario` para invocar el motor nuevo con **un documento completo por llamada** (§12.1), `registrarAjusteDeStock` marcado `@deprecated`.
- **Módulos**: Inventario (Notas de Ingreso, Ajustes).
- **Dependencias**: Etapas 1A, 1B.
- **Riesgos**: R-03, R-04, R-18.
- **Criterios de aceptación**: NI/ajustes pasan por el motor nuevo; comportamiento observable de cantidades idéntico al actual (regresión cero, ninguna empresa exige costo todavía porque `estadoValorizacion !== 'activa'` para todas); cada operación queda con su `OperacionIdempotenteInventario`.
- **Pruebas**: T-01, T-04, T-08 (parcial, sin exigir costo aún), T-19, T-20.
- **Complejidad**: alta. **Prioridad**: P0.
- **Rollback**: revertir el commit que redirige `generarNIEnInventario`/`AdjustmentModal.tsx` al motor nuevo — como ninguna empresa está `'activa'` todavía, no hay datos valorizados que perder.
- **Definición de terminado**: cero llamadas directas a `InventoryService.registerAdjustment` desde NI/Ajustes; tests de regresión de cantidad en verde.

### Etapa 1D — Motor central de salidas

- **Objetivo**: `prepararOperacionInventario`/`confirmarOperacionInventario` para salidas (NS, ventas de los 3 canales, ajustes negativos) — sigue en modo cuantitativo puro.
- **Alcance**: mitad de salidas de `servicioKardexValorizado.ts`, validación de stock suficiente antes de aplicar (corrige hallazgo §5.4), extracción de cálculo puro de `inventory.facade.ts::addMovimiento`, migración de `descontarStockParaDocumento`/`useComprobanteActions.tsx`/`generarNSEnInventario`.
- **Módulos**: Ventas, POS, Notas de Salida.
- **Dependencias**: Etapas 1A, 1B, 1C.
- **Riesgos**: R-04, R-05, R-18.
- **Criterios de aceptación**: los 3 canales de venta + NS pasan por el motor nuevo; clave `VENTA-STOCK-${documentoVentaId}` implementada y probada contra doble-click/recarga; comportamiento observable idéntico al actual.
- **Pruebas**: T-05, T-20, escenario 20 de la lista de 28.
- **Complejidad**: alta. **Prioridad**: P0.
- **Rollback**: revertir el commit de redirección — mismo argumento que 1C (ninguna empresa activa todavía).
- **Definición de terminado**: cero motores de salida fuera de `servicioKardexValorizado.ts`; `inventory.facade.ts::addMovimiento` marcado `@deprecated`.

### Etapa 1E — Transferencias y reversos

- **Objetivo**: completar el motor central con transferencias valorizadas y reversos genéricos — cierra el conjunto de operaciones del motor antes de exigir costo en ninguna.
- **Alcance**: `transferirStockValorizado`, `revertirMovimientoValorizado` genérico (§20), linaje de transferencias (§19), restauración exacta en reversos.
- **Módulos**: Inventario (Transferencias), todos los módulos con capacidad de anular.
- **Dependencias**: Etapas 1A-1D.
- **Riesgos**: R-13.
- **Criterios de aceptación**: transferencias y reversos pasan por el motor nuevo; escenarios de linaje (§19.3) y de reverso bloqueado (§20.2/20.6) verificados.
- **Pruebas**: T-13, escenarios 24, 25, 23 de la lista de 28.
- **Complejidad**: media. **Prioridad**: P0.
- **Rollback**: revertir el commit de redirección.
- **Definición de terminado**: los 7 llamadores originales de §12.5 están completamente migrados; `InventoryService.registerAdjustment` y `inventory.facade.ts::addMovimiento` sin ningún llamador productivo restante (listos para eliminarse cuando corresponda).

### Etapa 2 — Valorización inicial y migración: construcción hasta `validada` (P0 — bloqueante)

**Corrección obligatoria de alcance**: esta etapa **ya no** lleva a ninguna empresa hasta `'activa'` — solo construye y prueba el proceso hasta `'validada'` (detección, propuesta de costo, revisión/confirmación, tratamiento tributario). La transición `validada→activando` queda **gateada** por `verificarCondicionesActivacion()` (§24.1bis), que no puede devolver `listo:true` hasta que Compras (Etapa 3) y Ventas (Etapa 4) estén conectadas al motor central. Esto corrige el bloqueante de "orden seguro de activación": ninguna empresa puede quedar operando en modo valorizado con sus ventas todavía descontando stock por el camino cuantitativo antiguo.

- **Objetivo**: activar la exigencia de costo en entradas positivas (ajuste, importación), plantilla de importación con costo, y construir el proceso de migración/activación hasta el estado `'validada'` — **la acción "Confirmar activación" (`validada→activando`) todavía no se entrega en esta etapa** (se entrega al cierre de la Etapa 4, §24.1bis).
- **Alcance**: `AdjustmentModal.tsx` (campo costo condicional vía `resolverModoOperacion`/`puedeOperarCuantitativamente`), `PanelImportacionStock.tsx` (columna costo, previsualización vía `prepararOperacionInventario`, modo reemplazo con lógica de §13.4), `LoteImportacionValorizada`, UI del proceso de migración recorriendo `no_iniciada→en_preparacion→pendiente_costos→validada` (§31.5) — sin la acción final de activación.
- **Módulos**: Inventario (Ajustes, Importación), Configuración.
- **Dependencias**: Etapas 1A-1E.
- **Riesgos**: R-01, R-14.
- **Criterios de aceptación**: el proceso de migración llega a `'validada'` de forma reproducible; `invalidarDetalleSiAfectado` marca `requiereRecalculo=true` cuando una mutación cuantitativa toca un producto+almacén ya propuesto, bloqueando `pendiente_costos→validada` hasta revisión; **no existe ningún botón ni acción que dispare `validada→activando` en esta etapa** (verificado explícitamente como criterio negativo).
- **Pruebas**: T-09, T-10, T-15, T-16, escenarios 12, 15, 16, 18, 19, 34-37 de la lista de 46.
- **Complejidad**: media. **Prioridad**: P0 (habilitadora — sin ella, Etapa 4 no tiene con qué activar; no bloquea por sí sola el objetivo funcional completo, que se cierra en la Etapa 4).
- **Rollback**: `ValorizacionInicialInventario.estado='cancelado'`, `estadoValorizacion → cancelada_antes_activacion` — siempre seguro en esta etapa, porque `'activa'` es inalcanzable aquí por diseño.
- **Definición de terminado**: el proceso de migración es ejecutable end-to-end hasta `'validada'` en un ambiente de prueba con datos reales de al menos una empresa piloto.

### Etapa 3 — Integración Compras

- **Objetivo**: conectar CC↔NI real (automática y manual) — **aquí, y no antes, se conecta `mapeadorCCaNI.ts` a un flujo funcional real** —, trazabilidad poblada, costo valorizable con IGV recuperable/no recuperable, bloqueo de duplicados. Cierra los requisitos de **entrada** de `verificarCondicionesActivacion()` (§24.1bis: `compras_ingreso_automatico`, `compras_ingreso_manual`).
- **Alcance**: `generarNIAutomatica` (nueva), acción "Generar NI desde CC" en Inventario, `calcularCostoValorizableLinea` (§16.3), `derivarCostoSugerido` reemplazando el prellenado directo de `precioCompra` (§25.2).
- **Módulos**: Compras, Notas de Ingreso.
- **Dependencias**: Etapas 1E y 2.
- **Riesgos**: R-06, R-11, R-12.
- **Criterios de aceptación**: un CC en modalidad `ingreso_automatico` completa la saga de `EstadoIngresoAutomatico` (§14.2) hasta `'completado'`, con recuperación verificada desde cada paso interrumpido (no reinicia desde cero); un CC en `con_nota_ingreso` bloquea una segunda NI mientras la primera esté activa; `estadoInventario` refleja el estado real de las cantidades; **ahora sí** `mapeadorCCaNI.ts` tiene un consumidor productivo real; `RegistroCapacidadesInventario.capacidadesDisponibles` (§24.1bis.1) incorpora `compras_ingreso_automatico`/`compras_ingreso_manual`.
- **Pruebas**: escenarios 1, 4, 5, 6, 7 (§36).
- **Complejidad**: alta. **Prioridad**: P0.
- **Rollback**: revertir el commit que conecta el botón/flujo — `mapeadorCCaNI.ts` puede volver a quedar sin llamador productivo (regresa al estado de la Etapa 0) sin afectar capas ya creadas por otras vías (ajustes/importación de la Etapa 2). Seguro porque ninguna empresa está `'activa'` todavía (el gate de Etapa 2 lo impide).
- **Definición de terminado**: 100% de los CC con modalidad automática de una empresa piloto generan NI visible y capa; cero CC con NI duplicada.

### Etapa 4 — Integración Ventas y documentos, y activación productiva

**Corrección obligatoria de alcance**: esta etapa cierra los requisitos de **salida** de `verificarCondicionesActivacion()` y, como último entregable, **habilita por primera vez la acción "Confirmar activación"** (`validada→activando`) — es la etapa en la que el manifiesto completo (entradas de las Etapas 1C/2/3 + salidas de esta etapa) queda con `listo:true`.

- **Objetivo**: activar consumo real de capas (`consumirCapasFIFO`) en Factura, Boleta, POS, Nota de Venta, Nota de Salida, ajuste negativo/merma, devolución al proveedor y Nota de Crédito con movimiento físico; persistir costo de venta; **entregar la acción de activación productiva**.
- **Alcance**: los 3 puntos de venta + NS (ya migrados al motor cuantitativo en la Etapa 1D) ahora consumen capas cuando la empresa está `'activa'`; anulaciones de venta restauran capas exactas (§20.3); actualización de `RegistroCapacidadesInventario.capacidadesDisponibles` (§24.1bis.1) incorporando `factura`/`boleta`/`pos`/`nota_venta`/`nota_salida`/`ajuste_negativo`/`merma`/`devolucion_proveedor`/`nota_credito_fisica`; entrega de la UI de "Confirmar activación" (`validada→activando`), habilitada solo cuando `verificarCondicionesActivacion` confirma `listo===true` contra datos reales.
- **Módulos**: Ventas, POS, Notas de Salida, Notas de Crédito, Configuración (UI de activación).
- **Dependencias**: Etapas 1E, 2, 3.
- **Riesgos**: R-02, R-09, R-13, R-23 (nuevo, ver §33).
- **Criterios de aceptación**: el ejemplo obligatorio de FIFO (§18.3, 10@10+2@12→124) se verifica en los 3 canales de venta; una venta anulada restaura exactamente las capas originales; `verificarCondicionesActivacion().listo === true` al cerrar esta etapa; **solo entonces** una empresa piloto puede ejecutar `validada→activando→activa` por primera vez, con éxito verificado end-to-end.
- **Pruebas**: escenarios 11, 12, 13, 14, 17 (§36), más la ejecución completa de activación de una empresa piloto **después** de que esta etapa cierre.
- **Complejidad**: alta. **Prioridad**: P0.
- **Rollback**: revertir el commit que activa el consumo de capas en estos canales **es seguro mientras ninguna empresa haya completado `validada→activando→activa`** (lo cual, por el gate de esta misma etapa, no puede ocurrir antes de que el código de esta etapa esté completo y probado) — una vez que la primera empresa piloto complete la activación y realice ventas reales en modo valorizado, cualquier corrección posterior debe hacerse corrigiendo la causa raíz del defecto encontrado (nunca deshaciendo el código para "volver a cuantitativo", que ya es irreversible por diseño, §24.4). Se recomienda una etapa de *canary* con una sola empresa piloto antes del despliegue general.
- **Definición de terminado**: cero discrepancias entre cantidad descontada y capas consumidas en pruebas de regresión de la empresa piloto; la empresa piloto completó `validada→activando→activa` exitosamente, con todos los flujos de venta ya consumiendo capas desde el primer movimiento posterior a la activación.

### Etapa 5 — Reportes, utilidad y margen

- **Objetivo**: exponer indicadores derivados en Detalle de Producto, construir Reporte de rentabilidad, Kardex valorizado, inventario valorizado, costo de venta.
- **Alcance**: nuevas vistas/consultas (§27, §28, §30) — sin nueva lógica de dominio más allá de las funciones de consulta ya diseñadas en `ServicioKardexValorizado`.
- **Módulos**: Productos (UI), Reportes.
- **Dependencias**: Etapa 4.
- **Riesgos**: R-16, R-17.
- **Criterios de aceptación**: Reporte de rentabilidad reproduce manualmente los cálculos de utilidad/margen de un conjunto de ventas de prueba.
- **Pruebas**: escenario 17 (§36), pruebas de UI no detalladas en este documento.
- **Complejidad**: media. **Prioridad**: P1.
- **Rollback**: los reportes son de solo lectura — desactivarlos no afecta datos.
- **Definición de terminado**: reporte publicado y validado contra al menos un mes de datos de una empresa piloto.

### 34.1 Matriz de etapas (resumen)

| Etapa | Objetivo | Dependencias | Complejidad | Prioridad |
|---|---|---|---|---|
| 0 | Saneamiento de modelo | — | Media | P0 |
| 1A | Modelos y repositorios | 0 | Baja | P0 |
| 1B | Unidad de trabajo y recuperación | 1A | Alta | P0 |
| 1C | Motor central de entradas | 1A, 1B | Alta | P0 |
| 1D | Motor central de salidas | 1A, 1B, 1C | Alta | P0 |
| 1E | Transferencias y reversos | 1A-1D | Media | P0 |
| 2 | Valorización inicial y migración | 1A-1E | Media | **P0** |
| 3 | Integración Compras | 1E, 2 | Alta | P0 |
| 4 | Integración Ventas y documentos | 1E, 2, 3 | Alta | P0 |
| 5 | Reportes, utilidad y margen | 4 | Media | P1 |

---

## 35. Backlog reclasificado (corrección obligatoria — sin historias "Como desarrollador")

**Corrección obligatoria**: la versión anterior redactaba habilitadores técnicos como si fueran historias de usuario final ("Como arquitecto, quiero un servicio único...", "Como desarrollador, quiero migrar..."). Un habilitador técnico no tiene un usuario final que lo "quiera" — existe para permitir que una historia funcional futura sea posible. Se reclasifica todo el backlog en 6 tipos: **Historia funcional**, **Habilitador técnico**, **Tarea de infraestructura**, **Tarea de migración**, **Corrección de deuda técnica**, **Historia de reporte**.

### 35.1 Backlog completo

| Código | Tipo | Objetivo | Valor | Entregables | Dependencias | Prioridad | Criterios de aceptación | Etapa |
|---|---|---|---|---|---|---|---|---|
| E0.1 | Corrección de deuda técnica | Unificar la detección de "producto inventariable" en una sola función | Elimina 4+ implementaciones ad-hoc de la misma regla (`tipoExistencia !== 'SERVICIOS'`) | `esProductoInventariable`, migración de 4 call sites, tests unitarios | — | P0 | Los 4 call sites usan la misma función; tests cubren los 10 valores de `tipoExistencia` | 0 |
| E0.2 | Corrección de deuda técnica | Separar naturaleza de línea del efecto del documento | Cierra hallazgo P1-01 (`afectaInventario` uniforme por documento) | `calcularEsInventariable`, `calcularAfectaInventarioLinea`, actualización de `FormularioComprobanteCompra.tsx` | E0.1 | P0 | Una línea de servicio nunca queda `afectaInventario=true` | 0 |
| E0.3 | Corrección de deuda técnica | Conectar el cálculo real de `estadoInventario` de un CC | Cierra hallazgo P0-04 (estado congelado en `'pendiente'`) | Conectar `calcularEstadoInventarioCC`, eliminar `derivarEstadoInventarioCC` | — | P0 | `estadoInventario` refleja cantidades reales | 0 |
| E1A.1 | Habilitador técnico | Modelar las entidades de costo (capa/consumo) | Base de datos de todo el proyecto — sin esto no hay Kardex valorizado | `CapaCostoInventario`, `ConsumoCapaCostoInventario` + repositorios, con `empresaId` | Etapa 0 | P0 | Compilan; tests CRUD con filtro por `empresaId` | 1A |
| E1A.2 | Tarea de infraestructura | Modelar el ledger de idempotencia y el diario transaccional | Base de la consistencia transaccional (§21, §22) | `OperacionIdempotenteInventario`, `TransaccionInventario` + repositorios | E1A.1 | P0 | Tests unitarios de escritura/lectura por `(empresaId, clave)` | 1A |
| E1A.3 | Tarea de infraestructura | Centralizar la política de precisión | Evita drift de redondeo desde el primer commit (§17) | `precisionInventario.ts` | — | P0 | `redondearAPrecision` con test del ejemplo 10/3 | 1A |
| E1B.1 | Tarea de infraestructura | Implementar el diario transaccional recuperable | Elimina "revisión manual" como estrategia de recuperación (§22) | `unidadTrabajoInventario.ts`, rutina de recuperación al iniciar el módulo | E1A.* | P0 | Pruebas de interrupción (escenarios 1-8, §36) en verde | 1B |
| E1B.2 | Habilitador técnico | Función de reconciliación stock↔capas | Sustento de la jerarquía canónica de cantidades (§8.1) | `reconciliacionStockInventario.ts` | E1A.1 | P0 | Detecta inconsistencia; nunca reconstruye capas desde el agregado | 1B |
| E1C.1 | Habilitador técnico | Extraer el cálculo puro de `InventoryService.registerAdjustment` | Permite la separación preparar/confirmar (§12) | `InventoryService.calcularAjustePropuesto` | E1B.* | P0 | Mismo resultado numérico que `registerAdjustment` hoy | 1C |
| E1C.2 | Historia funcional | Registrar una compra sin perder el costo capturado en la Nota de Ingreso | Cierra hallazgo P0-06 (costo descartado al generar el movimiento) | Migración de `generarNIEnInventario`/`anularNIEnInventario` al motor nuevo | E1C.1 | P0 | El costo de línea de NI llega a la capa creada | 1C |
| E1D.1 | Habilitador técnico | Extraer el cálculo puro de `inventory.facade.ts::addMovimiento` | Permite unificar el tercer motor de salida (hallazgo P0-07) | Función pura reutilizada por `prepararOperacionInventario` | E1C.* | P0 | Mismo resultado numérico que `addMovimiento` hoy | 1D |
| E1D.2 | Corrección de deuda técnica | Validar stock suficiente antes de descontar en Nota de Venta | Cierra hallazgo nuevo §5.4 (NV puede generar stock negativo silencioso) | Validación en el motor nuevo, antes de aplicar | E1D.1 | P0 | NV no genera stock negativo silencioso | 1D |
| E1D.3 | Historia funcional | Que un doble-click no descuente stock dos veces al vender | Confianza del usuario en el punto de venta | Clave `VENTA-STOCK-${documentoVentaId}` (§21.3) | E1D.1 | P0 | Doble submit no duplica movimiento | 1D |
| E1E.1 | Habilitador técnico | Transferencias y reversos genéricos en el motor central | Cierra el conjunto de operaciones antes de exigir costo en ninguna | `transferirStockValorizado`, `revertirMovimientoValorizado` | E1D.* | P0 | Linaje completo verificado (§19.1) | 1E |
| E2.1 | Historia funcional + Tarea de migración | Revisar y confirmar el costo de todo mi stock existente, dejando la migración lista para activar | Habilita el objetivo central del encargo — la activación real se completa en la Etapa 4, una vez conectadas Compras y Ventas (§24.1bis) | Detección, propuesta, UI de revisión, `ValorizacionInicialInventario`, máquina de estados hasta `'validada'` (§31.5) | E1E.* | **P0** | Una empresa piloto llega a `estadoValorizacion='validada'` con reporte de auditoría de la migración; ninguna acción de esta historia dispara `'activando'`/`'activa'` | 2 |
| E2.2 | Historia funcional | Que un ajuste positivo exija un costo válido cuando mi empresa activó la valorización | Cierra decisión funcional 3.9 | Campo condicional en `AdjustmentModal.tsx` vía `puedeMutarInventario`/`esValorizacionActiva` | E2.1 | P0 | Costo 0 rechazado cuando la empresa está `'activa'` | 2 |
| E2.3 | Historia funcional + Tarea de migración | Importar stock con su costo por almacén | Cierra decisión funcional 3.9 para importación masiva | Columna de plantilla, previsualización, `LoteImportacionValorizada` | E2.1 | P0 | Fila sin costo bloquea la confirmación de esa fila | 2 |
| E3.1 | Historia funcional | Que un Comprobante de Compra en modalidad automática genere su Nota de Ingreso sin pasos manuales | Cierra hallazgo P0-04 (ingreso automático no movía stock) | `generarNIAutomatica`, clave `NI-AUTO-${comprobanteCompraId}` | E2.* | P0 | NI visible generada en el mismo flujo de registrar el CC | 3 |
| E3.2 | Historia funcional | Generar la Nota de Ingreso pendiente de un Comprobante de Compra | Cierra hallazgo P0-03 (`mapeadorCCaNI.ts` huérfano) | UI de listado de CC pendientes, conexión productiva real de `prepararDatosNIDesdeCC` | E2.*, E3.1 | P0 | `mapeadorCCaNI.ts` tiene, por primera vez, un consumidor productivo | 3 |
| E3.3 | Historia funcional | Que el costo valorizable excluya el IGV recuperable según la política que mi empresa confirmó | Cierra decisión funcional 3.6 sin asumir recuperabilidad en silencio | `calcularCostoValorizableLinea`, `LineaCompra.tratamientoImpuestoLinea`/`tratamientoImpuestoAplicado` | E2.1 | P0 | Costo valorizable excluye/incluye el IGV según `tratamientoImpuestoCompra` | 3 |
| E4.1 | Historia funcional | Que cada venta (Factura, Boleta, POS, NV) consuma capas FIFO reales y registre su costo | Objetivo central del encargo — costo de venta real | Consumo de capas conectado en los 3 canales + NS | E1E.*, E2.*, E3.* | P0 | El ejemplo obligatorio 10@10+2@12=124 se verifica en los 3 canales | 4 |
| E4.2 | Historia funcional | Que anular una venta restaure exactamente las capas originales | Confianza en anulaciones, evita corrupción de costo | `revertirSalida` conectado a los 3 canales | E4.1 | P0 | Reverso con el mismo costo histórico, sin recálculo | 4 |
| E4.3 | Tarea de migración | Habilitar la activación productiva de la valorización una vez conectados todos los flujos | Cierra el bloqueante de orden seguro de activación (§24.1bis) — es el único punto donde `'activa'` es alcanzable | `verificarCondicionesActivacion()` con manifiesto completo, UI de "Confirmar activación" | E2.1, E3.*, E4.1 | **P0** | `listo===true`; primera empresa piloto ejecuta `validada→activando→activa` con éxito | 4 |
| E5.1 | Historia de reporte | Ver el último costo real, el costo de siguiente salida y el margen estimado por almacén en el Detalle de Producto | Cierra decisión funcional 3.14 | Consultas derivadas (`consultarCostoSiguienteSalida`, `obtenerValorStock`) + UI | E4.* | P1 | Margen nunca se muestra consolidado sin contexto de almacén | 5 |
| E5.2 | Historia de reporte | Reporte de rentabilidad por producto, periodo y almacén | Objetivo de negocio final del encargo (utilidad y margen) | Agregaciones sobre `costoVentaTotal` persistido + UI de reporte | E4.* | P1 | Reproduce manualmente los cálculos de un mes de datos de prueba | 5 |

### 35.2 Matriz de dependencias (resumen)

| Etapa | Códigos | Depende de |
|---|---|---|
| 0 | E0.1–E0.3 | — |
| 1A | E1A.1–E1A.3 | Etapa 0 |
| 1B | E1B.1–E1B.2 | Etapa 1A |
| 1C | E1C.1–E1C.2 | Etapas 1A, 1B |
| 1D | E1D.1–E1D.3 | Etapas 1A, 1B, 1C |
| 1E | E1E.1 | Etapas 1A-1D |
| 2 | E2.1–E2.3 | Etapas 1A-1E |
| 3 | E3.1–E3.3 | Etapas 1E, 2 |
| 4 | E4.1–E4.2 | Etapas 1E, 2, 3 |
| 5 | E5.1–E5.2 | Etapa 4 |

---

## 36. Estrategia de pruebas

### 36.1 Niveles

- **Unitarias**: funciones puras (`calcularEsInventariable`, `calcularCostoValorizableLinea`, `consumirCapasFIFO`, `calcularCostoConsumo`).
- **Integración de dominio**: `ServicioKardexValorizado` completo, incluyendo la unidad de trabajo, contra repositorios reales de `localStorage` (en un entorno de test con `localStorage` simulado).
- **Regresión**: suite existente de Compras/Inventario/Ventas debe seguir en verde tras cada etapa (especialmente Etapa 1, que no debe cambiar comportamiento observable).
- **Idempotencia**: doble invocación intencional de cada operación con la misma clave, verificar `yaExistia: true` en el segundo intento y cero escrituras duplicadas.
- **Migración**: proceso de activación completo contra un snapshot de datos con productos con y sin `precioCompra`.
- **Persistencia**: verificar que tras cada operación, `localStorage` contiene exactamente los objetos esperados (movimiento, capa, consumo, ledger).
- **Navegador**: recarga de página a mitad de un flujo de venta — verificar que no queda estado corrupto.
- **Reverso**: cada tipo de reverso (entrada, salida, transferencia) con y sin consumo previo.
- **Precisión monetaria**: escenario de división no exacta (§17.3).
- **Multi-almacén**: venta distribuida entre 2+ almacenes con capas distintas en cada uno.
- **Moneda extranjera**: compra en USD con moneda base PEN (o viceversa).

### 36.2 Criterio de desempate FIFO (corrección obligatoria)

`consumirCapasFIFO` (§18.2) ordena capas por `fechaEntrada` ascendente — pero dos capas pueden compartir exactamente la misma `fechaEntrada` (ej. dos líneas de la misma NI, o dos filas de la misma importación). El desempate **nunca depende del orden del arreglo** en memoria (que no está garantizado estable entre lecturas de `localStorage`). Orden de desempate, aplicado en cascada:

1. `fechaEntrada` ascendente (criterio primario — antigüedad económica).
2. Si empatan: `fechaCreacion` ascendente (cuándo se creó la fila de la capa — desempate por orden real de creación, no de aparición en el arreglo).
3. Si aún empatan: `id` de la capa, ascendente por comparación de string estable (`localeCompare` o comparación lexicográfica simple) — garantiza un orden determinístico incluso si dos capas se crearon en el mismo milisegundo.

```ts
// DISEÑO PROPUESTO — dentro de consumirCapasFIFO (§18.2)
function compararCapasParaFIFO(a: CapaCostoInventario, b: CapaCostoInventario): number {
  const porFecha = new Date(a.fechaEntrada).getTime() - new Date(b.fechaEntrada).getTime();
  if (porFecha !== 0) return porFecha;
  const porCreacion = new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime();
  if (porCreacion !== 0) return porCreacion;
  return a.id.localeCompare(b.id); // desempate final, determinístico, nunca el orden del arreglo
}
```

### 36.3 Escenarios obligatorios

1. 2 cajas × 12 a costo 120 → 24 unidades a costo 10 (§15.3).
2. Cambio posterior del factor de conversión no altera la compra histórica (§15.4).
3. Compra en USD con moneda base configurada distinta (§16.5, §17.2).
4. CC automático genera una sola NI (§14.2, idempotencia `NI-AUTO`).
5. Reintento (doble submit) no genera segunda entrada (§21.2).
6. CC manual queda pendiente hasta confirmar NI (§14.3).
7. Servicio en CC mixto (producto + servicio) no genera stock para la línea de servicio (§14.1).
8. Ajuste positivo sin costo es rechazado cuando `estadoValorizacion==='activa'` (§13.2, §24.4).
9. Importación sumatoria crea capa con el costo de la columna (§13.3).
10. Reemplazo con diferencia negativa consume capas reales, bloquea si no alcanzan (§13.4).
11. FIFO: 10 a 10 + 10 a 12; salida 12 → costo 124 (§18.3).
12. Venta anulada restaura las capas originales exactas, mismo costo (§20.3).
13. Transferencia conserva costo y fecha de entrada original (§19.1).
14. Compra no puede anularse cuando su capa ya fue consumida (§20.2).
15. Stock histórico recibe capa inicial durante la migración (§24.1).
16. Empresa no llega a `'activa'` mientras existan costos pendientes de confirmar o `tratamientoImpuestoCompra==='pendiente_configuracion'` (§24.1).
17. Margen real usa costo histórico persistido, no costo actual de las capas vigentes (§26.3, §27.3).
18. Pago parcial o anulado no modifica el Kardex (decisión funcional aprobada 3.16, sin cambio de comportamiento).
19. Recarga de página a mitad de una operación se recupera de forma determinística vía el diario transaccional (§22.3), sin intervención manual.
20. Doble-click no duplica movimientos (§21.3, clave estable por documento, sin UUID por intento).
21. Dos empresas con el mismo `productoId`, mismo `documentoId` y mismo `almacenId` (colisión de ids sin relación real entre sí) generan capas y consumos completamente independientes — ninguna consulta de una empresa devuelve datos de la otra (§6, invariante 21).
22. Dos empresas usan claves operativas equivalentes (ej. ambas generan un CC cuyo `id` interno coincide en un escenario de prueba forzado) — la clave de idempotencia compuesta (`empresaId + clave`) evita que la NI automática de una empresa bloquee o reutilice el resultado de la otra.
23. `Product.stockPorAlmacen` de un producto valorizado siempre coincide con la suma de `cantidadDisponible` de sus capas activas tras cada operación — `reconciliarProyeccionStockInventario` no reporta inconsistencia crítica en un flujo normal de entrada→salida (§8.1).
24. Cierre de pestaña después de guardar la `TransaccionInventario` (`'preparada'`) y antes de escribir cualquier dato de dominio (§22.4).
25. Cierre de pestaña después de escribir stock/movimientos pero antes de escribir capas — a mitad del paso 13 de §22.2 (§22.4).
26. Recuperación de una `TransaccionInventario` en estado `'preparada'` al reiniciar el módulo (§22.3).
27. Recuperación de una `TransaccionInventario` en estado `'confirmando'` con escrituras parciales al reiniciar (§22.3).
28. Fallo de `localStorage.setItem` (simulado) a mitad del paso 13 de la confirmación (§22.4).
29. Cuota de `localStorage` excedida (`QuotaExceededError`) durante la confirmación (§22.4).
30. Diario (`TransaccionInventario`) corrupto (JSON inválido o campos faltantes) — la empresa queda `suspendida_por_inconsistencia`, nunca se ignora (§22.4, §24.5).
31. Dos pestañas del navegador operando sobre la misma empresa simultáneamente — riesgo residual documentado, no resuelto por completo (§22.4, R-15).
32. Reintento con la misma clave de idempotencia y el mismo `hashEntrada` — devuelve el resultado previo, cero escrituras nuevas (§21.2).
33. Reintento con la misma clave de idempotencia y un `hashEntrada` distinto — `ConflictoIdempotencia`, nunca un resultado silencioso (§21.2).
34. Cambio posterior de si un producto es inventariable (`Product.tipoExistencia`) no altera `esInventariable` de líneas ya confirmadas (§10.0, invariante 22).
35. Cambio posterior del factor de conversión no altera capas ya creadas (§15.4, invariante 22) — mismo caso que el escenario 2, verificado también a nivel de `CapaCostoInventario.factorConversionAplicado`.
36. Cambio posterior de la etiqueta de impuesto del producto no altera `tipoAfectacion`/`tratamientoImpuestoAplicado` de líneas ya confirmadas (§10.0, invariante 22).
37. Cambio posterior de la moneda base de la empresa no recalcula `costoUnitarioBaseMonedaBase` de capas ya creadas (§10.0, invariante 22).
38. Devolución de cliente con costo histórico disponible — reconstrucción proporcional entre las capas consumidas originalmente (§20.7).
39. Devolución de cliente sin evidencia histórica suficiente (venta anterior a la activación) — flujo excepcional, costo manual, marcado como estimado (§20.7).
40. Devolución al proveedor — consume/revierte exactamente la capa originada por esa compra, al mismo costo (§20.8).
41. Anulación de una entrada después de que fue transferida — bloqueada con indicación de qué transferencias revertir primero (§20.6).
42. Transferencia parcial de una sola capa de origen (§19.3).
43. Transferencia que consume varias capas de origen, generando varias capas en destino (§19.3).
44. Cantidades decimales en una entrada/salida (ej. 2.5 kg) — precisión de 6 decimales respetada sin error acumulado perceptible (§17.5).
45. Residuo monetario: capa de valor 10 con cantidad 3 — la suma de los 3 consumos es exactamente 10.00, con el residuo absorbido en el último (§17.3, ejemplo obligatorio).
46. Capas con exactamente la misma `fechaEntrada` — el desempate usa `fechaCreacion` y luego `id`, nunca el orden del arreglo (§36.2).
47. Gate de activación rechazado por capacidad técnica ausente en `RegistroCapacidadesInventario` (§24.1bis.1) — `listo:false` con el requisito de capacidad específico entre los pendientes.
48. Gate de activación rechazado por condición dinámica de empresa (`tratamientoImpuestoCompra==='pendiente_configuracion'`) aun con toda la capacidad técnica disponible (§24.1bis.2).
49. Saga de ingreso automático interrumpida después de persistir el CC pero antes de confirmar la NI — al reintentar, continúa desde el paso pendiente con la misma clave `NI-AUTO-${ccId}`, sin recrear el CC ni duplicar la Cuenta por Pagar (§14.2).
50. Intento de generar una NI manual mientras existe una NI automática del mismo CC en `'pendiente'`/`'procesando'` — bloqueado (§14.2/§14.3).
51. Reintento de la saga de ingreso automático tras un fallo, con la misma clave — no duplica la capa ni la NI ya creada en `'Borrador'` (§14.2).
52. Conflicto de versión entre preparación y confirmación (otra operación confirmó primero) — el plan se aborta sin escrituras de dominio, la reserva de idempotencia se libera para un nuevo intento (§12.3 paso 4, §22.1bis).
53. Repreparación exitosa después de un conflicto de versión — el segundo intento lee la versión ya actualizada y confirma sin conflicto (§22.1bis).
54. Operación en modo `'cuantitativo'` con costo ausente antes de activar — aceptada sin exigir costo (§12.1, §24.1ter).
55. Intento de operación en modo `'cuantitativo'` cuando `estadoValorizacion==='activa'` — rechazado por el contrato antes de cualquier cálculo (§12.1, invariante 24).
56. Operación en modo `'valorizado'` con costo ausente en alguna línea — rechazada, ninguna línea del documento se aplica (§12.1).
57. Reconciliación bilateral: capas > proyección (no solo proyección > capas) marca inconsistencia crítica después de activar — la dirección de la diferencia no importa (§6, §8.1).
58. Cantidad confirmada de una NI que excede `cantidadPendienteInventario` de la línea de CC en ese momento — rechazada (§8.1).
59. Gate de activación evaluado con todos los detalles valorizables (costo confirmado, sin `requiereRecalculo`) pero sin ninguna capa creada todavía — `listo:true`, sin exigir `capaGeneradaId` (§24.1bis.2/.3).
60. Intento de operación valorizada distinta de `valorizacion_inicial` (ej. una venta) mientras `estadoValorizacion==='validada'` — rechazada por `modoOperacionPermitidoEnValidada` (§24.1bis.3).
61. Saga de ingreso automático completada en modo cuantitativo (empresa no activa) — `'completado'` sin exigir capa (§14.2.1).
62. Saga de ingreso automático completada en modo valorizado (empresa activa) — `'completado'` exige capa y costo resueltos (§14.2.1).

### 36.4 Matriz de pruebas

| ID | Escenario | Precondición | Acción | Resultado esperado | Nivel de prueba | Etapa |
|---|---|---|---|---|---|---|
| T-01 | Conversión de presentación | Producto con presentación caja×12 | Comprar 2 cajas a S/120 c/u, generar NI | Capa con `cantidadInicial=24`, `costoUnitarioBaseMonedaBase=10` | Integración de dominio | 3 |
| T-02 | Factor histórico inmutable | Capa ya creada con factor 12 | Editar el producto a factor 24, consultar la capa antigua | La capa conserva `cantidadInicial=24` (no se recalcula a 48) | Unitaria + integración | 3 |
| T-03 | Compra en moneda extranjera | Empresa con moneda base PEN | Registrar CC en USD con TC=3.75, generar NI | Capa con `monedaOriginal=USD`, `tipoCambioAplicado=3.75`, `costoUnitarioBaseMonedaBase` en PEN | Integración de dominio | 3 |
| T-04 | Idempotencia NI automática | CC con modalidad automática | Registrar el mismo CC dos veces (simulado) | Solo existe una NI, segunda invocación retorna `yaExistente:true` | Idempotencia | 3 |
| T-05 | Doble submit de venta | Documento de venta ya creado con su `documentoVentaId` | Invocar `registrarSalidaValorizada` dos veces con clave `VENTA-STOCK-${documentoVentaId}` | Solo un movimiento de salida, un consumo — segunda invocación retorna el resultado previo | Idempotencia | 1D |
| T-06 | CC manual pendiente | CC modalidad `con_nota_ingreso` | Registrar CC, no generar NI | `estadoInventario='pendiente'`, sin movimiento ni capa | Integración de dominio | 3 |
| T-07 | Servicio no genera stock | CC con línea producto + línea servicio | Registrar CC modalidad automática | Solo la línea producto genera capa; línea servicio `esInventariable=false` | Integración de dominio | 0/3 |
| T-08 | Ajuste sin costo rechazado | `estadoValorizacion==='activa'` | Intentar ajuste positivo con costo 0 | Error, ninguna escritura | Unitaria | 2 |
| T-09 | Importación sumatoria con costo | Plantilla con columna costo | Importar fila con cantidad y costo | Capa creada con ese costo | Integración de dominio | 2 |
| T-10 | Reemplazo negativo consume capas | Producto con 2 capas | Reemplazo reduce stock por debajo de la capa más antigua | Capa más antigua se agota, la siguiente se reduce parcialmente | Integración de dominio | 2 |
| T-11 | FIFO multi-capa | Capas 10@10 y 10@12 | Salida de 12 unidades | Consumo 10@10 + 2@12, costo total 124 | Integración de dominio | 1D/4 |
| T-12 | Reverso de venta | Venta con consumo de 2 capas | Anular la venta | Ambas capas restauradas a su `cantidadDisponible` previa, mismo costo | Reverso | 4 |
| T-13 | Transferencia conserva costo | Capa con costo 10, fecha antigua | Transferir a otro almacén | Nueva capa con costo 10 y misma `fechaEntrada` | Integración de dominio | 1E |
| T-14 | Bloqueo de anulación tras consumo | NI generó una capa, luego se vendió parcialmente | Intentar anular la NI | Error explícito, ninguna escritura | Reverso | 3 |
| T-15 | Migración crea capa inicial | Producto con stock 50, sin capas | Ejecutar migración con costo confirmado | Capa con `cantidadInicial=50`, `procedencia='migracion_inicial'` | Migración | 2 |
| T-16 | Bloqueo de activación con costos pendientes | Producto con stock sin costo confirmado | Intentar transición `pendiente_costos→validada` | Bloqueado, lista de pendientes mostrada | Migración | 2 |
| T-17 | Margen usa costo histórico | Venta antigua con costo persistido; capas actuales con costo distinto | Consultar reporte de rentabilidad de esa venta | Usa el costo persistido, no el de las capas vigentes | Integración de dominio | 5 |
| T-18 | Pago no toca Kardex | CxP con pago registrado/anulado | Registrar y anular un pago | Cero movimientos de `MovimientoStock` generados | Regresión | — |
| T-19 | Recarga a mitad de operación | `TransaccionInventario` en `'confirmando'` con escrituras parciales | Reiniciar el módulo | Recuperación completa determinísticamente las escrituras pendientes usando `datosPropuestos`, sin recalcular | Navegador/Persistencia | 1B |
| T-20 | Doble-click no duplica | Documento de venta con `documentoVentaId` ya persistido | Disparar dos eventos de submit en el mismo tick | Un solo movimiento persistido, clave `VENTA-STOCK-${documentoVentaId}` estable | Idempotencia | 1D |
| T-21 | Aislamiento multiempresa — ids coincidentes | Empresa A y empresa B con el mismo `productoId`/`almacenId`, cada una con su propia capa | Consultar `obtenerValorStock` para el `productoId` en cada empresa | Cada empresa ve solo sus propias capas; ninguna suma cruza a la otra | Integración de dominio | 1A |
| T-22 | Idempotencia no cruza empresas | Empresa A y empresa B registran un CC cuyo `id` coincide (escenario forzado de prueba) | Ambas generan NI automática con clave `NI-AUTO-${ccId}` | Ambas NI se crean (una por empresa) — la clave compuesta `empresaId+clave` las distingue | Idempotencia | 1A/3 |
| T-23 | Reconciliación de proyección de stock | Producto valorizado con 2 entradas y 1 salida ya procesadas | Ejecutar `reconciliarProyeccionStockInventario` | `diferencia = 0`, `esInconsistenciaCritica = false` | Integración de dominio | 1B |
| T-24 | Cierre antes de escrituras de dominio | — | Simular cierre justo después de persistir `TransaccionInventario` `'preparada'` | Recuperación marca `'fallida'`, libera la clave, ninguna escritura de dominio | Navegador/Persistencia | 1B |
| T-25 | Cierre a mitad de escrituras | — | Simular cierre entre escribir movimientos y escribir capas (paso 13) | Recuperación completa las escrituras pendientes (capas) usando el mismo plan ya calculado | Navegador/Persistencia | 1B |
| T-26 | Recuperación de `'preparada'` | Transacción huérfana en `'preparada'` | Reiniciar el módulo | Se marca `'fallida'`, clave liberada para reintento | Navegador/Persistencia | 1B |
| T-27 | Recuperación de `'confirmando'` | Transacción con escrituras parciales | Reiniciar el módulo | Completa lo pendiente y cierra en `'confirmada'` | Navegador/Persistencia | 1B |
| T-28 | Fallo de `setItem` simulado | Mock de `localStorage.setItem` que lanza a mitad del paso 13 | Ejecutar `confirmarOperacionInventario` | Transacción queda `'confirmando'`, recuperable en el siguiente intento | Navegador/Persistencia | 1B |
| T-29 | Cuota excedida | Mock de `QuotaExceededError` | Ejecutar `confirmarOperacionInventario` | Igual que T-28 — recuperable, no se pierde ni duplica la operación | Navegador/Persistencia | 1B |
| T-30 | Journal corrupto | `TransaccionInventario` con JSON inválido | Reiniciar el módulo | Empresa pasa a `suspendida_por_inconsistencia` para esa transacción, panel de diagnóstico la muestra | Navegador/Persistencia | 1B/2 |
| T-31 | Multi-pestaña (riesgo residual) | Dos pestañas abiertas sobre la misma empresa | Ambas invocan una operación mutadora casi simultáneamente | Riesgo documentado (R-15) — no se afirma resolución completa; prueba confirma que al menos no corrompe el diario (cada transacción tiene su propio `id`) | Navegador/Persistencia | 1B |
| T-32 | Reintento mismo hash | Operación ya confirmada con clave K y hash H | Reintentar con clave K y hash H | Retorna `resultadoIds` previos, cero escrituras nuevas | Idempotencia | 1B |
| T-33 | Reintento hash distinto | Operación ya confirmada con clave K y hash H | Reintentar con clave K y hash H' ≠ H | `ConflictoIdempotencia`, ninguna escritura | Idempotencia | 1B |
| T-34 | Cambio posterior de naturaleza inventariable | Línea de CC confirmada con `esInventariable=true` | Cambiar `Product.tipoExistencia` a `'SERVICIOS'` | La línea histórica conserva `esInventariable=true` | Unitaria | 0 |
| T-35 | Cambio posterior de impuesto | Línea confirmada con `tipoAfectacion='gravado'` | Cambiar la etiqueta de impuesto del producto | La línea histórica conserva su `tipoAfectacion`/`tratamientoImpuestoAplicado` | Unitaria | 3 |
| T-36 | Cambio posterior de moneda base | Capa creada con `monedaBase='PEN'` | Cambiar `Company.monedaBase` a `'USD'` | La capa histórica conserva `costoUnitarioBaseMonedaBase` en PEN, sin reconvertir | Unitaria | 1C |
| T-37 | Devolución de cliente con evidencia | Venta con `consumosCapaIds` persistidos | Registrar devolución completa | Costo reconstruido = costo histórico exacto de la venta | Integración de dominio | 4 |
| T-38 | Devolución de cliente sin evidencia | Venta anterior a activación | Registrar devolución | Flujo excepcional, costo manual, `procedencia` marcada como estimada | Integración de dominio | 4 |
| T-39 | Devolución al proveedor | Capa de una compra específica íntegra | Registrar devolución al proveedor | Capa se consume/revierte al mismo costo | Integración de dominio | 1E |
| T-40 | Anulación tras transferencia | Capa transferida, capa derivada íntegra en destino | Intentar anular la entrada original | Bloqueado, indica qué transferencia revertir primero | Reverso | 1E |
| T-41 | Transferencia parcial | Capa de origen con remanente mayor a lo transferido | Transferir una fracción | Capa de origen reduce `cantidadDisponible`, nueva capa en destino con la fracción | Integración de dominio | 1E |
| T-42 | Transferencia multi-capa | 2 capas de origen con remanente combinado suficiente | Transferir una cantidad que requiere ambas | 2 capas nuevas en destino, cada una con el costo de su origen | Integración de dominio | 1E |
| T-43 | Cantidades decimales | Producto vendido por kg | Entrada/salida de 2.5 kg | Precisión de 6 decimales respetada, sin error acumulado | Unitaria | 1A |
| T-44 | Residuo monetario | Capa de valor 10, cantidad 3 | 3 consumos de 1 unidad cada uno | Suma de consumos = 10.00 exacto | Unitaria | 1A |
| T-45 | Capas con misma fecha | 2 capas con `fechaEntrada` idéntica | Ejecutar `consumirCapasFIFO` | Desempate por `fechaCreacion`, luego `id` — resultado determinístico y reproducible | Unitaria | 1D |
| T-46 | Gate rechazado por capacidad ausente | `RegistroCapacidadesInventario` sin `'pos'` declarado | Ejecutar `verificarCondicionesActivacion` | `listo:false`, `'pos'` entre los pendientes con evidencia | Unitaria | 4 |
| T-47 | Gate rechazado por condición dinámica | `tratamientoImpuestoCompra==='pendiente_configuracion'` | Ejecutar `verificarCondicionesActivacion` con capacidad completa | `listo:false` por la condición dinámica, no por capacidad | Unitaria | 4 |
| T-48 | Saga de CC automático interrumpida | CC persistido, NI en `'Borrador'`, saga cae antes del paso 7 | Reiniciar el módulo / reintentar | Continúa desde el paso pendiente, misma clave `NI-AUTO`, sin CxP duplicada | Navegador/Persistencia | 3 |
| T-49 | NI manual bloqueada por NI automática pendiente | CC con `estadoIngresoAutomatico==='procesando'` | Intentar generar NI manual para el mismo CC | Bloqueado con mensaje explícito | Integración de dominio | 3 |
| T-50 | Conflicto de versión | Plan preparado con `versionEsperada=N`; otra operación confirma y sube la versión a `N+1` | Confirmar el primer plan | Aborta sin escritura, transacción `'fallida'`, reserva de idempotencia liberada | Integración de dominio | 1B |
| T-51 | Repreparación tras conflicto de versión | Igual que T-50 | Volver a preparar y confirmar | Confirma exitosamente con la versión actualizada | Integración de dominio | 1B |
| T-52 | Modo cuantitativo sin costo antes de activar | `estadoValorizacion !== 'activa'` | Registrar ajuste sin costo | Aceptado, sin capa creada | Unitaria | 1C |
| T-53 | Modo cuantitativo rechazado tras activar | `estadoValorizacion==='activa'` | Intentar construir una operación `modoOperacion:'cuantitativo'` | Rechazada antes de cualquier cálculo (invariante 24) | Unitaria | 4 |
| T-54 | Reconciliación bilateral — capas > proyección | Empresa activa, capa con más cantidad que la proyección | Ejecutar `reconciliarProyeccionStockInventario` | `esInconsistenciaCritica:true` (antes solo se detectaba en la otra dirección) | Integración de dominio | 4 |
| T-55 | Cantidad de NI excede pendiente del CC | `cantidadPendienteInventario` de la línea = 10 | Confirmar NI con `cantidadConfirmadaNI=15` | Rechazada, ninguna escritura | Unitaria | 3 |
| T-56 | Gate sin bloqueo circular | Lote `validada` con todos los detalles valorizables, cero capas creadas | Ejecutar `verificarCondicionesActivacion` | `listo:true` (no exige `capaGeneradaId`) | Unitaria | 2/4 |
| T-57 | Excepción exclusiva de `validada` | `estadoValorizacion==='validada'` | Intentar preparar una venta valorizada | Rechazada — solo `valorizacion_inicial` se permite en `validada` | Unitaria | 2 |
| T-58 | Saga CC automático completa sin capa (modo cuantitativo) | `estadoValorizacion !== 'activa'` | Ejecutar `generarNIAutomatica` de punta a punta | `'completado'` sin capa creada | Integración de dominio | 3 |
| T-59 | Saga CC automático completa con capa (modo valorizado) | `estadoValorizacion==='activa'` | Ejecutar `generarNIAutomatica` de punta a punta | `'completado'` solo si existe capa y costo resuelto | Integración de dominio | 4 |

---

## 37. Mapa de impacto por archivo

### 37.0 Clasificación de necesidad de archivos nuevos (obligatoria)

Todo archivo nuevo vive dentro de `apps/senciyo/src/pages/Private/features/gestion-inventario/` (o en el nivel raíz de esa carpeta), organizados en las subcarpetas ya usadas por este diseño: `modelos/`, `servicios/`, `repositorios/`, `utilidades/` — **ninguno crea** `inventario-valorizado/`, `kardex-valorizado/`, ni ninguna otra sección principal de Inventario. Estructura resultante (solo lo nuevo; lo existente en inglés no se toca ni se muestra aquí):

```
gestion-inventario/
  modelos/
    CapaCostoInventario.ts
    ConsumoCapaCostoInventario.ts
    ValorizacionInicialInventario.ts
    OperacionIdempotenteInventario.ts
    TransaccionInventario.ts
    LoteImportacionValorizada.ts
    EstadoActivacionValorizacion.ts
    EstadoVersionInventario.ts
    RegistroCapacidadesInventario.ts
    EstadoIngresoAutomatico.ts
  servicios/
    servicioKardexValorizado.ts
  repositorios/
    repositorioCapasCostoInventario.ts
    repositorioConsumosCapasInventario.ts
    repositorioOperacionesIdempotentesInventario.ts
    repositorioTransaccionesInventario.ts
  utilidades/
    unidadTrabajoInventario.ts
    reconciliacionStockInventario.ts
    precisionInventario.ts
    estadoValorizacionInventario.ts
    valorCapaInventario.ts
```

**Ninguno de los archivos anteriores existe todavía — son propuestas para implementación futura, no se crean en esta tarea (documento-solo).** Se crean únicamente cuando su etapa correspondiente (§34) se implemente, y cada uno tiene el consumidor real identificado en la tabla siguiente — ninguno es un archivo fantasma, vacío o especulativo.

| Archivo | Nuevo/existente | Ubicación | Responsabilidad | Necesidad | Etapa | Consumidores |
|---|---|---|---|---|---|---|
| `CapaCostoInventario.ts` | Nuevo | `modelos/` | Tipo de la capa de costo (§9.2) | **Indispensable** | 1A | `servicioKardexValorizado.ts`, repositorios, reportes |
| `ConsumoCapaCostoInventario.ts` | Nuevo | `modelos/` | Tipo del consumo de capa (§9.3) | **Indispensable** | 1A | Igual que arriba |
| `ValorizacionInicialInventario.ts` | Nuevo | `modelos/` | Tipo del proceso de migración (§9.4) | **Indispensable** | 2 | Flujo de activación |
| `OperacionIdempotenteInventario.ts` | Nuevo | `modelos/` | Tipo del ledger de idempotencia (§9.5) | **Indispensable** | 1A | `servicioKardexValorizado.ts` |
| `TransaccionInventario.ts` | Nuevo | `modelos/` | Tipo del diario transaccional (§9.6) | **Indispensable** | 1A | `unidadTrabajoInventario.ts` |
| `LoteImportacionValorizada.ts` | Nuevo | `modelos/` | Tipo del lote de importación (§9.7) | **Probable** — solo si se implementa importación valorizada en la Etapa 2 tal como está diseñada; si se pospone, el resto del motor central no depende de él | 2 | `PanelImportacionStock.tsx` |
| `EstadoActivacionValorizacion.ts` | Nuevo | `modelos/` | Tipo de la máquina de estados de activación (§31.5) | **Indispensable** | 2 | `Configuration.inventory`, flujo de activación |
| `servicioKardexValorizado.ts` | Nuevo | `servicios/` | `prepararOperacionInventario`/`confirmarOperacionInventario`/API de conveniencia, por documento completo (§12) | **Indispensable** | 1B-1D | Todos los 7 llamadores migrados (§12.5) |
| `repositorioCapasCostoInventario.ts` | Nuevo | `repositorios/` | Persistencia de capas | **Indispensable** | 1A | `servicioKardexValorizado.ts` |
| `repositorioConsumosCapasInventario.ts` | Nuevo | `repositorios/` | Persistencia de consumos | **Indispensable** | 1A | Igual que arriba |
| `repositorioOperacionesIdempotentesInventario.ts` | Nuevo | `repositorios/` | Persistencia del ledger de idempotencia | **Indispensable** | 1A | Igual que arriba |
| `repositorioTransaccionesInventario.ts` | Nuevo | `repositorios/` | Persistencia del diario transaccional (§22) | **Indispensable** | 1A | `unidadTrabajoInventario.ts` |
| `unidadTrabajoInventario.ts` | Nuevo | `utilidades/` | Orquestación del diario transaccional + recuperación (§22) | **Indispensable** | 1B | `servicioKardexValorizado.ts` |
| `reconciliacionStockInventario.ts` | Nuevo | `utilidades/` | Reconciliación capas↔proyección (§8.1) | **Indispensable** | 1B | `servicioKardexValorizado.ts`, panel de diagnóstico |
| `precisionInventario.ts` | Nuevo | `utilidades/` | Constantes y función de redondeo centralizadas (§17.3) | **Indispensable** | 1A | Todo el motor central |
| `estadoValorizacionInventario.ts` | Nuevo | `utilidades/` | Helpers `esValorizacionActiva`/`puedeMutarInventario`/`resolverModoOperacion`/`verificarCondicionesActivacion` (§24.1ter, §24.1bis) | **Indispensable** | 2/4 | `servicioKardexValorizado.ts`, UI de activación |
| `EstadoVersionInventario.ts` | Nuevo | `modelos/` | Tipo del control optimista de concurrencia (§9.6bis) | **Indispensable** | 1B | `servicioKardexValorizado.ts` (§12.2/§12.3), `unidadTrabajoInventario.ts` |
| `RegistroCapacidadesInventario.ts` | Nuevo | `modelos/` | Tipo del manifiesto de capacidades técnicas por versión desplegada (§24.1bis.1) | **Indispensable** | 4 (declarado incrementalmente desde 1C) | `verificarCondicionesActivacion` |
| `EstadoIngresoAutomatico.ts` | Nuevo | `modelos/` | Tipo de la máquina de estados de la saga de ingreso automático (§14.2) | **Indispensable** | 3 | `generarNIAutomatica`, UI de estado del CC |
| `valorCapaInventario.ts` | Nuevo | `utilidades/` | `calcularValorDisponibleCapa` — fuente única del valor remanente de una capa (§18.5bis) | **Indispensable** | 1A | `servicioKardexValorizado.ts`, reportes (§27, §28, §30) |

**No recomendado / explícitamente descartado**: cualquier archivo de "escaneo defensivo" independiente del diario transaccional (la versión anterior de este diseño lo proponía; se elimina porque el diario transaccional ya cubre esa necesidad de forma más completa, §22); cualquier segundo repositorio de movimientos paralelo a `StockRepository` (se reutiliza el existente); cualquier archivo esqueleto sin consumidor identificado en la tabla anterior.

**Nota metodológica del resto de §37**: solo se listan archivos con un cambio de comportamiento identificado en este diseño — no se incluyen archivos por coincidencia de nombre ni conjeturas.

### Productos

| Archivo | Responsabilidad actual | Cambio futuro | Etapa | Riesgo |
|---|---|---|---|---|
| `catalogo-articulos/models/types.ts` | Define `Product`, `precioCompra` | Agregar `@deprecated` a `precioCompra`; sin nuevo campo persistido | 0/5 | Bajo |
| `shared/inventory/unitConversion.ts` | Conversión de unidad | Sin cambio de código — se agrega `esProductoInventariable` en un archivo nuevo del mismo directorio | 0 | Bajo |
| `catalogo-articulos/components/product-modal/ProductFinancialSection.tsx` | Editor de `precioCompra` | Actualizar tooltip/UI cuando se retire de uso corriente (Etapa 5) | 5 | Bajo |

### Compras

| Archivo | Responsabilidad actual | Cambio futuro | Etapa | Riesgo |
|---|---|---|---|---|
| `compras/modelos/LineaCompra.ts` | Define `LineaCompra` | Agregar `esInventariable`, `factorConversionAplicado` | 0 | Bajo |
| `compras/logica/reglasCompras.ts` | `calcularLineaCompra`, `resolverImpuestoProducto`, `calcularTotalesLineas` | Agregar `calcularEsInventariable`, `calcularAfectaInventarioLinea`, `calcularCostoValorizableLinea` | 0/3 | Medio |
| `compras/contexto/ContextoCompras.tsx` | `derivarEstadoInventarioCC`, orquestación de registro de CC | Reemplazar `derivarEstadoInventarioCC` por `calcularEstadoInventarioCC`; invocar `generarNIAutomatica` tras registrar CC en modalidad automática | 0/3 | Alto (archivo central, 1861 líneas) |
| `compras/mapeadores/mapeadorCCaNI.ts` | `prepararDatosNIDesdeCC` (huérfano) | Se conecta; se extiende con `factorConversionAplicado` | 3 | Medio |
| `compras/utilidades/calcularEstadosCompra.ts` | Funciones huérfanas | Se conectan sin cambio de código | 0 | Bajo |
| `compras/componentes/formularios/SelectorModalidadInventario.tsx` | Selector de modalidad (2 de 3 opciones) | Sin cambio funcional en este diseño — la tercera opción sigue sin exponerse en UI porque su efecto ahora sí es real (Etapa 3), no porque se agregue al selector como texto libre; se documenta como decisión de UX pendiente (§39) | 3 | Bajo |
| `compras/componentes/formularios/FormularioComprobanteCompra.tsx` | Asigna `afectaInventario` uniforme | Usar `calcularAfectaInventarioLinea` por línea | 0 | Medio |
| `compras/servicios/servicioOrdenCompra.ts` | Prellena costo desde `precioCompra` | Usar `derivarCostoSugerido` | 3 | Bajo |

### Inventario / Kardex

| Archivo | Responsabilidad actual | Cambio futuro | Etapa | Riesgo |
|---|---|---|---|---|
| `gestion-inventario/models/inventory.types.ts` | `MovimientoStock`, `StockAdjustmentData` | Agregar campos estructurales a `MovimientoStock` (§10.6); `StockAdjustmentData` sin cambio | 1 | Medio |
| `gestion-inventario/services/inventory.service.ts` | `registerAdjustment`, `updateStock`, transferencias | Sin cambio de firma — se envuelve desde `ServicioKardexValorizado`, no se modifica su cuerpo | 1 | Bajo |
| `shared/inventory/stockGateway.ts` | `resolvealmacenesForSaleFIFO`, `allocateSaleAcrossalmacenes` | Posible renombre (Etapa 1, no bloqueante) — comportamiento sin cambio | 1 | Bajo |
| `shared/inventory/accionesStock.ts` | `registrarAjusteDeStock` | Se mantiene como wrapper interno de bajo nivel, usado por `ServicioKardexValorizado` | 1 | Bajo |
| `gestion-inventario/servicios/servicioKardexValorizado.ts` | — (no existe) | **Archivo nuevo** — `prepararOperacionInventario` (pura) + `confirmarOperacionInventario` (única que persiste), API de conveniencia (§12) | 1B-1D | Alto |
| `gestion-inventario/modelos/TransaccionInventario.ts` | — (no existe) | **Archivo nuevo** — diario transaccional (§9.6, §22) | 1A | Alto |
| `gestion-inventario/repositorios/repositorioTransaccionesInventario.ts` | — (no existe) | **Archivo nuevo** | 1A | Alto |
| `gestion-inventario/utilidades/precisionInventario.ts` | — (no existe) | **Archivo nuevo** — constantes y redondeo centralizado (§17.3) | 1A | Bajo |
| `gestion-inventario/utilidades/estadoValorizacionInventario.ts` | — (no existe) | **Archivo nuevo** — helpers de la máquina de estados de activación (§24.4) | 2 | Bajo |
| `gestion-inventario/modelos/EstadoActivacionValorizacion.ts` | — (no existe) | **Archivo nuevo** — tipo de la máquina de estados (§31.5) | 2 | Bajo |
| `gestion-inventario/modelos/CapaCostoInventario.ts` | — (no existe) | **Archivo nuevo** | 1 | Bajo |
| `gestion-inventario/modelos/ConsumoCapaCostoInventario.ts` | — (no existe) | **Archivo nuevo** | 1 | Bajo |
| `gestion-inventario/repositorios/repositorioCapasCostoInventario.ts` | — (no existe) | **Archivo nuevo** | 1 | Medio |
| `gestion-inventario/repositorios/repositorioConsumosCapasInventario.ts` | — (no existe) | **Archivo nuevo** | 1 | Medio |
| `gestion-inventario/repositorios/repositorioOperacionesIdempotentesInventario.ts` | — (no existe) | **Archivo nuevo** | 1 | Medio |
| `gestion-inventario/modelos/ValorizacionInicialInventario.ts` | — (no existe) | **Archivo nuevo** | 2 | Bajo |
| `gestion-inventario/modelos/LoteImportacionValorizada.ts` | — (no existe) | **Archivo nuevo** | 2 | Bajo |
| `gestion-inventario/utilidades/unidadTrabajoInventario.ts` | — (no existe) | **Archivo nuevo** — orquestación atómica (§22) | 1 | Alto |
| `gestion-inventario/utilidades/reconciliacionStockInventario.ts` | — (no existe) | **Archivo nuevo** — reconciliación capas↔proyección (§8.1) | 1 | Medio |
| `gestion-inventario/repositories/stock.repository.ts` | Persistencia de movimientos | Sin cambio de código — la recuperación tras interrupción vive en `unidadTrabajoInventario.ts` (§22.3), no dentro de este repositorio | 1A | Bajo |
| `gestion-inventario/services/notaIngreso.service.ts` | `generarNIEnInventario`, `anularNIEnInventario` | Cambiar la llamada interna de `InventoryService.registerAdjustment` a `ServicioKardexValorizado.registrarEntradaValorizada`; `anularNIEnInventario` cambia su validación de cantidad agregada a validación por capa (§20.2) | 1/3 | Alto |
| `gestion-inventario/services/notaSalida.service.ts` | `generarNSEnInventario` | Igual, hacia `registrarSalidaValorizada` | 1/4 | Alto |
| `gestion-inventario/models/notaIngreso.types.ts` | `NotaIngreso`, `LineaNotaIngreso` | Agregar `origen`, `lineaOrigenId`, `factorConversionAplicado`, etc. | 3 | Medio |
| `gestion-inventario/models/notaSalida.types.ts` | `LineaNotaSalida` | Agregar `costoVentaUnitario`/`costoVentaTotal` | 4/5 | Medio |
| `gestion-inventario/models/transferencia.types.ts` | `Transferencia` | Agregar `capasOrigenIds`/`capasDestinoIds`; corregir generación de `id` | 1/4 | Medio |
| `gestion-inventario/components/AdjustmentModal.tsx` | Formulario de ajuste manual | Campo de costo condicional | 2 | Bajo |
| `gestion-inventario/components/PanelImportacionStock.tsx` | Importación de stock | Columna de costo, previsualización, lógica de reemplazo (§13.4) | 2 | Medio |
| `gestion-inventario/api/inventory.facade.ts` | `addMovimiento` (motor de Factura/Boleta/POS, persiste directamente, invocado hoy en un `for` por ítem) | Se extrae su lógica de cálculo a una función pura reutilizada por `prepararOperacionInventario` (una sola llamada por comprobante, con todos sus ítems como líneas, §12.1); `addMovimiento` queda como wrapper `@deprecated` durante la transición y se elimina en la Etapa 4 cuando `useComprobanteActions.tsx` migre por completo (§12.4) | 1B/4 | Alto |

### Ventas / POS

| Archivo | Responsabilidad actual | Cambio futuro | Etapa | Riesgo |
|---|---|---|---|---|
| `documentos-comerciales/utils/servicioReservaStock.ts` | `descontarStockParaDocumento`, `revertirDescuentoStockDocumento` | Migrar a `ServicioKardexValorizado.registrarSalidaValorizada`/`revertirMovimientoValorizado`; agregar validación de stock suficiente antes de aplicar (corrige hallazgo §5.4) | 1/4 | Alto |
| `comprobantes-electronicos/hooks/useComprobanteActions.tsx` | Bloque de descuento de stock (líneas 530-686) | Reemplazar el `for` con llamadas directas a `addMovimientoStock` por una única llamada a `ServicioKardexValorizado.registrarSalidaValorizada` con clave `VENTA-STOCK-${documentoVentaId}` | 1D/4 | Alto |
| `comprobantes-electronicos/hooks/useComprobanteState.tsx` | `isProcessing` | Sin cambio — se mantiene como guard de UI adicional (defensa en profundidad), ya no es la única protección | 1 | Bajo |
| `comprobantes-electronicos/punto-venta/hooks/usePosComprobanteFlow.ts` | Guard de submit (`isProcessing`) | Asegurar que `documentoVentaId` se cree y persista antes del primer `await` en `handleCrearComprobante`, para que la clave `VENTA-STOCK-${documentoVentaId}` sea estable entre reintentos | 1D | Medio |
| `comprobantes-electronicos/models/comprobante.types.ts` | `CartItem` | Sin cambio (es efímero) — el campo nuevo va en la línea persistida, no en `CartItem` | — | — |

### Configuración

| Archivo | Responsabilidad actual | Cambio futuro | Etapa | Riesgo |
|---|---|---|---|---|
| `configuracion-sistema/modelos/Configuration.ts` | `Configuration.inventory` | Eliminar `autoUpdateCosts`; agregar `estadoValorizacion: EstadoActivacionValorizacion` (§31.5, reemplaza el booleano) | 0/2 | Bajo |
| `configuracion-sistema/modelos/Configuration.ts` | `Configuration.inventory` | Agregar `tratamientoImpuestoCompra` (además de `estadoValorizacion`, ver fila de Configuración más arriba) | 0 | Bajo |
| `configuracion-sistema/hooks/useConfiguracionSistema.ts` | Defaults de configuración | Actualizar defaults (`costMethod: 'FIFO'`, sin `autoUpdateCosts`) | 0 | Bajo |

### Reportes / Precios — solo consumidores de lectura, no se modifican en este diseño más allá de lo indicado

| Archivo | Responsabilidad actual | Cambio futuro | Etapa | Riesgo |
|---|---|---|---|---|
| `indicadores-negocio/models/reportDefinitions.ts` | Catálogo de reportes | Agregar nuevas entradas (categoría "Rentabilidad") | 5 | Bajo |
| `lista-precios/*` | Precios de venta | **Sin cambios** — solo lectura desde Detalle de Producto/Reportes | — | Ninguno |

---

## 38. Decisiones técnicas recomendadas

| # | Decisión | Alternativas | Recomendación | Ventajas | Desventajas | Impacto | Riesgo | Decisión final |
|---|---|---|---|---|---|---|---|---|
| 1 | Extender `MovimientoStock` vs. entidades separadas | A) Extender; B) Separar (`CapaCostoInventario`+`ConsumoCapaCostoInventario`) | B | Normalización, soporta N:M salida↔capas, no contamina un tipo usado por decenas de consumidores no relacionados a costo | Más entidades que mantener, más joins en consultas | Alto (afecta todo el modelo) | Bajo (mitigado por la propia normalización) | **B — separar** (§9.1) |
| 2 | Estructura exacta de capa y consumo | Campos mínimos vs. campos completos con snapshot de moneda/TC/procedencia | Campos completos con snapshot | Cumple decisión 3.7/3.11 sin depender de reconsultar otras entidades | Más campos por fila | Medio | Bajo | Estructura completa de §9.2/9.3 |
| 3 | Servicio central de inventario | A) Forzar una única función pública que todos llamen directamente; B) Servicio de dominio que envuelve los primitivos existentes | B | No exige reescribir los 7 llamadores desde cero — solo cambia a qué capa llaman | Requiere disciplina de code review para que nadie vuelva a llamar los primitivos directamente | Alto | Medio (R-04, R-05) | **B** (§12) |
| 4 | Unidad de trabajo para `localStorage` | A) Confiar en operaciones individuales; B) Reserva de idempotencia previa + diario transaccional recuperable + control optimista de versión (§12.1bis, §22, §22.1bis) | B | Cierra la ventana de colisión entre invocaciones concurrentes (reserva antes de mutar) y hace la recuperación tras interrupción determinística, sin prometer atomicidad real | No es una transacción de base de datos real (multi-pestaña sigue siendo un riesgo residual, mitigado no eliminado) | Medio | Medio-Alto (R-15, elevado a P1) | **B** (§12.1bis, §22.2, §22.1bis) |
| 5 | Claves de idempotencia | A) Usar `numeroComprobante`/ids ya existentes; B) Generar claves de dominio deterministas, derivadas de un id interno persistido antes de mutar inventario | B | `numeroComprobante` es `Math.random()` hoy, no sirve; un `operationId` generado por intento tampoco (no determinista); la clave debe derivarse de `documentoVentaId`, ya persistido antes de cualquier `await` (§21.3) | Requiere que el flujo de emisión persista el borrador del documento (con su id) antes de invocar el motor de inventario | Alto | Bajo | **B** (§21) |
| 6 | Precisión monetaria interna | A) Redondear a `decimalPlaces` en cada paso; B) Alta precisión interna + reconciliación en el último consumo | B | Evita drift acumulado (ejemplo 10/3) | Lógica de reconciliación algo más compleja | Medio | Bajo | **B** (§17.3) |
| 7 | Estrategia de migración | A) Migración automática sin revisión; B) Detección + propuesta + confirmación manual obligatoria | B | Cumple decisión 3.10 explícita (no inventar costo histórico) | Requiere esfuerzo manual del usuario para confirmar cada producto | Alto (funcional) | Bajo (técnico) | **B** (§24) |
| 8 | Estrategia de deprecación de `precioCompra` | A) Eliminación inmediata; B) Deprecación gradual condicionada a consumidores reales | B | No rompe flujos existentes mientras haya empresas con `estadoValorizacion !== 'activa'` | Campo "deprecado" convive más tiempo con el sistema | Medio | Bajo (condición objetiva de eliminación) | **B** (§25) |
| 9 | Relaciones CC–NI–movimientos | A) Mantener texto libre; B) FKs tipadas nuevas, preparadas para 1:N | B | Elimina ambigüedad, ya compatible con 1:N sin cambio de tipo futuro | Requiere popular relaciones en dos documentos (CC y NI) de forma sincronizada | Alto | Medio (R-06) | **B** (§11) |
| 10 | Persistencia del costo en ventas | A) Solo en `CartItem` (efímero); B) En la línea persistida del documento de venta | B | `CartItem` desaparece tras la venta — el costo debe sobrevivir en el registro permanente | Ninguna relevante | Alto | Bajo | **B** (§10.9, §26) |
| 11 | Estrategia de transferencia de capas | A) Revalorizar al costo actual del destino; B) Conservar costo/fecha original, crear capa equivalente | B | Cumple decisión 3.15 explícita | Ninguna relevante (es la única opción compatible con la decisión) | Medio | Bajo | **B** (§19) |
| 12 | Estrategia de reversos | A) Editar el movimiento original; B) Crear movimiento/consumo de reverso, bloqueando si no es seguro | B | Cumple decisión 3.11, preserva historial | Requiere lógica de bloqueo más fina (por capa, no por agregado) | Alto | Medio (R-12, R-13) | **B** (§20) |
| 13 | Forma de centralizar salidas | A) Obligar una única función pública idéntica en todos los canales; B) Servicio de dominio único, con adaptadores delgados por canal, invocado una vez por documento completo | B | Menor fricción de migración, mismo resultado de unificación, cierra el riesgo de invocación por línea | Requiere disciplina para no reintroducir un cuarto motor ni una invocación por línea | Alto | Medio (R-04, R-05) | **B** (§12.1, §12.4) |
| 14 | Estrategia de consultas y reportes | A) Materializar agregados persistidos (ej. "valor de stock" cacheado); B) Derivar en el momento desde `CapaCostoInventario` | B | Evita una nueva fuente de verdad que pueda desincronizarse (mismo problema que hoy tiene `StockSummary.valorTotalStock`, campo muerto) | Consultas más costosas a volumen alto (R-16/R-17) | Medio | Bajo en el volumen actual | **B** (§27, §28) |
| 15 | Contrato futuro para backend | A) Diseñar `ServicioKardexValorizado` acoplado a `localStorage`; B) Diseñarlo como funciones puras con parámetros explícitos, replicando el patrón ya usado por `generarNIEnInventario` | B | Migración a backend = reemplazar cuerpo por `fetch`, sin tocar llamadores | Ninguna relevante | Alto (facilita el futuro) | Bajo | **B** (§23) |

---

## 39. Pendientes no bloqueantes

Estos elementos **no bloquean** la implementación de este diseño, pero quedan documentados para no perderse:

1. **Migrar `Product.impuesto` (string libre) a un `impuestoId` estructurado** (FK a `Tax.id`, usando `Tax.affectationCode` ya existente) — la **unificación** de las 4 implementaciones de parseo en `resolverTratamientoTributarioProducto` ya es bloqueante de la Etapa 0 (§16.1); lo que queda como mejora no bloqueante aquí es específicamente que `Product` gane el campo `impuestoId` y deje de depender del texto parseado como `origenResolucion` para todos sus productos.
2. **Unificar el patrón disperso `config.currencies.find(c => c.isBaseCurrency)?.code ?? 'PEN'`** (duplicado en `ContextoCompras.tsx` y `FormularioComprobanteCompra.tsx`) en un único hook — identificado en esta tarea (§17.1), no forma parte del alcance de Compras↔Inventario.
3. **Migrar `usePriceBook.ts`** (Precios, lado venta) a reusar `getFactorToUnidadMinima`/`describeUnitConversion` en vez de su propia resolución de factor — deuda técnica de Precios, no de Kardex (§15.1).
4. **Renombrar `resolvealmacenesForSaleFIFO`/`allocateSaleAcrossalmacenes`** a nombres que no usen "FIFO" (decisión 3.12 lo sugiere, no lo exige de forma bloqueante) — cambio de nombre puro, recomendado para la Etapa 1 pero no crítico si se pospone.
5. **`porcentajeGanancia`** — su eliminación o redefinición es una decisión de Precios/Producto fuera del alcance de este diseño (§25.2, punto 7).
6. **Nota de crédito de compra** — no estaba en las 16 decisiones aprobadas; queda fuera de este diseño (§20.5).
7. **Cambio de unidad base del producto (`Product.unidad`) después de tener capas** — caso no cubierto por las decisiones aprobadas, documentado en §15.5.
8. **Landed cost avanzado** (flete, seguro, gastos adicionales prorrateados, bonificaciones a costo cero) — explícitamente fuera del MVP por decisión 3.6, queda como Etapa 6 futura no detallada aquí.
9. **Recepciones parciales (1 CC → N NI)** — el modelo ya lo soporta (`notasIngresoRelacionadas: string[]`), pero la regla de negocio de la Etapa 3 la bloquea a propósito para el MVP (decisión 3.2); habilitarla es cambiar una función de validación, no el modelo.
10. **Rendimiento a gran volumen de capas** (R-16/R-17) — aceptable para el prototipo actual, debe resolverse al migrar a backend real (§23).

---

## 40. Conclusión y siguiente paso

El diseño demuestra que la integración solicitada **no requiere una reconstrucción del sistema** — reutiliza `InventoryService`, `stockGateway.ts`, `currencyManager`, `Tax`, y el patrón de funciones puras ya usado por `generarNIEnInventario`/`generarNSEnInventario`. Tras cinco pasadas de corrección, el diseño queda cerrado en los siguientes puntos: (a) dos entidades nuevas (`CapaCostoInventario`/`ConsumoCapaCostoInventario`) para representar costo por capas sin monolitizar `MovimientoStock`, con niveles de costo desambiguados (comercial/unidad mínima/moneda base) y `empresaId` explícito en todas; (b) un motor central dividido en **tres** fases — reserva de idempotencia, preparación pura y confirmación —, con una **secuencia única de 19 pasos** (§22.2) referenciada sin duplicación desde §12.1bis-§12.3, que unifica los 3 motores de salida actuales, opera siempre sobre el **documento completo** y distingue contractualmente modo cuantitativo de modo valorizado (§12.1), con una única excepción exclusiva y acotada para la valorización inicial dentro de `'validada'` (§24.1bis.3); (c) un mecanismo de idempotencia con hash de entrada, clave estable por documento y reserva previa a cualquier mutación de dominio, respaldado por control optimista de versión para la colisión entre pestañas, y una matriz completa de recuperación cruzada transacción×idempotencia (§22.3/§22.4); (d) una máquina de estados de activación genuinamente irreversible, gateada sin literales hardcodeados por un manifiesto real de capacidades técnicas más condiciones dinámicas verificadas contra datos de la empresa (§24.1bis), **sin el ciclo imposible de exigir una capa que solo puede crearse al activar** (§24.1bis.2/.3); (e) una saga formal y recuperable para el ingreso automático de Compras, cuyo criterio de finalización se resuelve correctamente según el modo vigente al iniciar la saga, sin exigir una capa inexistente en modo cuantitativo (§14.2/§14.2.1); (f) resolución tributaria unificada en una única función (`resolverTratamientoTributarioProducto`) desde la Etapa 0, sin que ninguna otra sección siga aceptando el parseo legado como fuente final (§16.1/§16.6); y (g) un proceso formal de migración que nunca inventa costo histórico no disponible ni asume una política de recuperabilidad tributaria en silencio.

**Siguiente paso recomendado**: revisar y aprobar este documento con Producto/PM y Arquitectura antes de comenzar la implementación de la Etapa 0. La Etapa 0 es la más segura para comenzar porque no persiste ningún dato nuevo — solo corrige lógica ya existente (separación línea inventariable/efecto de documento, conexión de funciones huérfanas, unificación de la resolución tributaria) y puede validarse con la suite de regresión actual sin ningún cambio de esquema. El mapeador CC→NI se prepara y prueba en esta etapa, pero **no** se conecta a ningún flujo productivo hasta la Etapa 3. La activación real (`validada→activando→activa`) no es posible hasta el cierre de la Etapa 4, cuando `verificarCondicionesActivacion()` confirma, contra datos reales (no literales) y sin exigir capas que aún no existen, que Compras y Ventas ya están conectadas al motor central (§24.1bis) — este orden ya no puede invertirse por diseño.

---

## Verificación final (quinta pasada de corrección — cierre documental definitivo)

1. Único archivo **modificado** en esta quinta pasada: `docs/diseno-tecnico-kardex-valorizado-integracion-compras.md` (el mismo documento de las cuatro pasadas anteriores — no se creó una segunda versión, copia, respaldo, carpeta ni archivo Markdown adicional). El informe de auditoría previo (`docs/auditoria-integracion-compras-inventario-kardex-valorizado.md`) no fue modificado.
2. No se creó ningún módulo de Inventario nuevo, ni archivo funcional, ni componente, ni servicio real, ni rama de Git — todo lo nuevo son fragmentos `// DISEÑO PROPUESTO` dentro del mismo documento. No se amplió el backlog ni se agregaron nuevas etapas — la arquitectura principal, ya aprobada en las pasadas anteriores, no se rediseñó.
3. No se ejecutó build, lint ni TypeScript — no se modificó ningún archivo de código, modelo, componente ni configuración; no aplica a una tarea puramente documental.
4. Comandos de verificación ejecutados y resultado reportado en la respuesta final de esta tarea: `git diff --check`, `git status --short`.
5. Las cuatro contradicciones del encargo, corregidas y propagadas al contenido operativo:
   - **(1) Bloqueo circular de la activación** — `verificarTodoStockPositivoValorizado` ya no exige `capaGeneradaId` (inexistente antes de activar); el gate previo verifica que cada detalle sea *valorizable*, no que ya tenga capa. Se agregó la excepción exclusiva de `validada` para `tipoOperacion==='valorizacion_inicial'` (§24.1bis.3, `modoOperacionPermitidoEnValidada`) y la lista de verificaciones posteriores a la activación (capa por detalle, `movimientoEntradaId`, reconciliación) que sí exige esos campos — nunca antes. Invariantes 31-32, escenarios 59-60/T-56-57.
   - **(2) Secuencia contradictoria** — se estableció una única secuencia oficial de 19 pasos en §22.2 (reserva de idempotencia = primera escritura real, nunca `TransaccionInventario`), referenciada sin repetición divergente desde §12.1bis/§12.2/§12.3; se corrigió que el chequeo de versión ocurre mientras la transacción sigue `'preparada'`, antes de marcarla `'confirmando'`; se reemplazó la rutina de recuperación (que solo escaneaba `TransaccionInventario`) por una que cruza los estados de `OperacionIdempotenteInventario` y `TransaccionInventario` (matriz completa, §22.4); se eliminó la mención errónea de un estado `'confirmando'` en `OperacionIdempotenteInventario` (§9.5 solo define `preparada`/`confirmada`/`fallida`/`revertida`).
   - **(3) Contradicción tributaria** — §16.6 y "Estándares técnicos" ya no aceptan `resolverImpuestoProducto` (texto parseado) como fuente final; ambos apuntan a `resolverTratamientoTributarioProducto` (§16.1) como única fuente, con el parseo legado como delegación interna exclusiva para productos sin `impuestoId`.
   - **(4) Criterio de finalización de la saga CC automático** — `'completado'` ya no exige capa incondicionalmente; se resuelve `modoVigente` una sola vez al iniciar la saga (§14.2.1) y el criterio de finalización se bifurca: sin capa en modo cuantitativo, con capa y costo resueltos en modo valorizado. Invariante 33, escenarios 61-62/T-58-59.
6. Referencias cruzadas de numeración de pasos (`paso 4`/`paso 5`/`paso 7` de versiones previas de §22.2) corregidas en toda ocurrencia activa a la nueva numeración de 19 pasos.
7. Barrido acumulado de las cuatro pasadas anteriores (siguen sin ocurrencias activas): `valorizacionActiva` como campo activo, `resultadoId` singular, `cumplido: true` hardcodeado, `DatosEntradaValorizada`/`DatosSalidaValorizada` por línea, recomendaciones/comandos de rama, `movimientosPropuestos`/`capasPropuestas`/`consumosPropuestos` (nombres de campo obsoletos del plan).

