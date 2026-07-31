# Auditoría UX de Rentabilidad, Reportes y Exportables

**Fecha:** 2026-07-29 · **Rama:** `Rentabilidad` · **Tipo:** auditoría de solo lectura y diseño funcional (sin cambios de código)

---

## 1. Veredicto ejecutivo

- **¿Dónde se verá Rentabilidad?** Dentro de Indicadores → Reportes, como una nueva categoría **"Rentabilidad"** con un único reporte detallado ("Rentabilidad de ventas"). Ruta destino: una página propia con su propia entrada en `privateRoutes.tsx` (no existe hoy ninguna página de rentabilidad).
- **¿El Dashboard (Resumen) será obligatorio?** No. Resumen mostrará como máximo 2 tarjetas (Venta neta, Utilidad bruta) a modo de vista rápida, con un enlace directo al reporte. Toda la información completa, filtros, agrupaciones y exportación viven en Reportes — un usuario que nunca abre Resumen puede consultar y exportar Rentabilidad igualmente.
- **¿Existirá un reporte independiente?** Sí — uno solo (no seis). Granularidad por línea de venta, con agrupación opcional por producto/vendedor/cliente/establecimiento/período resuelta con un selector "Agrupar por", no con reportes duplicados.
- **¿Se ampliará algún reporte existente?** No en este primer alcance. No existe hoy ningún reporte de ventas a nivel de línea que sirva de base razonable, y el único candidato a nivel de documento (`Comprobantes emitidos`) ya arrastra deuda técnica real (export con columnas fijas desconectadas de pantalla, sin `ColumnsManager`) que debe resolverse antes de ampliarlo — hacerlo ahora duplicaría la fuente de verdad de "utilidad" en dos lugares con riesgo real de discrepancia.
- **¿Qué Excel tendrá columnas de rentabilidad?** Solo el Excel del nuevo reporte "Rentabilidad de ventas", vía el mismo botón "Exportar" ya usado en Compras (`exportDatasetToExcel`), respetando `ColumnsManager` y exportando todas las filas filtradas (nunca solo la página).
- **¿Cuál será la navegación exacta?** `Indicadores → Reportes → Rentabilidad → Rentabilidad de ventas`, alcanzable también por deep-link `autoExport` desde la tarjeta del hub, exactamente igual que los 8 reportes ya existentes.

---

## 2. Estado actual de Indicadores

`IndicadoresPage.tsx` (`indicadores-negocio/pages/`) alterna entre **Resumen** y **Reportes** mediante el query param `?view=reportes` (no rutas separadas):

```tsx
const activeView: IndicatorsTab = searchParams.get("view") === "reportes" ? "reportes" : "resumen";
```

- **Resumen** (vista por defecto, sin componente propio — JSX inline en `IndicadoresPage.tsx`): un carrusel horizontal de 6 tarjetas KPI (`KpiCards.tsx`: Total de Ventas, Nuevos Clientes, Comprobantes Emitidos, Crecimiento, Ticket Promedio, Tasa de Anulaciones — `flex-nowrap overflow-x-auto snap-x`, con flechas `hidden md:flex`), seguido de gráficos (`VentasPorComprobanteCard`, `VentasPorEstablecimientoCard`), tres `RankingCard` (Top Vendedores, Productos Más Vendidos, Clientes Principales — **sin exportación ni drill-down**), `ClientesInsightsCard`, `FormasPagoCard` y `DetalleVentasDiariasCard`.
- **No existe ningún "engranaje" que permita ocultar/mostrar tarjetas del Resumen.** El único ícono de engranaje (`Settings`, en el header) abre `NotificacionIndicadorModal` — configuración de alertas, no de visibilidad de tarjetas. Verificado por grep exhaustivo (`hideCard`, `visibleCards`, `toggleCard`, `CardVisibility` → 0 resultados).
- **Reportes** = `ReportsHub.tsx`, un hub 100% dirigido por datos (`reportDefinitions.ts`), con filtro de período (`DateRangePicker`), establecimiento (`<select>` inline) y buscador de texto. Cada tarjeta de reporte tiene dos acciones: **"Abrir módulo"** (`<Link to={item.modulePath}>`, navega a la página real del módulo) y **"Exportar"** (deep-link `autoExport=1` que abre el módulo, dispara su exportación local y regresa al hub).
- **Confirmado: agregar una categoría nueva no requiere código de ruteo nuevo** — solo agregar el literal a `ReportCategory`/`reportCategories` y objetos a `reportDefinitions`. La categoría "Documentos" ya existe vacía (sin reportes) y no rompe nada, prueba directa de que el hub tolera categorías sin contenido.
- **Permiso único**: `indicadores.ver` gatea toda la ruta `/indicadores` (Resumen y Reportes por igual, `privateRoutes.tsx:161`). No hay permiso por vista ni por reporte individual.

---

## 3. Catálogo actual de Reportes

8 reportes definidos en `reportDefinitions.ts`, en 7 categorías (`Comprobantes`, `Documentos` [vacía], `Clientes`, `Precios`, `Inventario` [×2], `Cobranzas`, `Caja`):

| id | Categoría | Módulo real | Export |
|---|---|---|---|
| `comprobantes-general` | Comprobantes | `ListaComprobantes.tsx` | ExcelJS manual propio (`BulkExport.tsx`) |
| `clientes-maestro` | Clientes | `ClientesPage.tsx` | ExcelJS manual propio |
| `precios-listas` | Precios | `ListaPrecios.tsx` | SheetJS (`cargarXlsx`) |
| `precios-catalogo` | Precios | `ProductsPage.tsx` | SheetJS |
| `inventario-stock` | Inventario | `InventarioSituacionPage.tsx` | SheetJS |
| `inventario-movimientos` | Inventario | `InventoryPage.tsx` | SheetJS |
| `cobranzas-estado` | Cobranzas | `CobranzasDashboard.tsx` | SheetJS |
| `caja-movimientos` | Caja | `ReportesCaja.tsx` | SheetJS |

**No existe ningún reporte de "Ventas"** — ni por producto, ni por vendedor, ni por cliente a nivel transaccional. El único acercamiento son los 3 `RankingCard` del Resumen (Top-N, sin exportar, sin drill-down). Esto confirma que Rentabilidad no compite con ningún reporte de ventas existente — llena un vacío real.

---

## 4. Exportables existentes

Infraestructura compartida real:
- **`ColumnsManager`** (`shared/columns/ColumnsManager.tsx`) — contrato `{id,label,visible,fixed?}` + callbacks de toggle/reset/reorder. Usado en 8+ tablas, pero **coexisten al menos 4 implementaciones paralelas** de "columnas configurables" (Comprobantes, Documentos Comerciales, Cobranzas, Catálogo tienen su propio mecanismo de checkboxes/store en vez de `ColumnsManager`).
- **`exportDatasetToExcel`** (`shared/export/exportToExcel.ts`) — ExcelJS diferido, `{rows, columns:{header,key,width,numFmt}, filename, worksheetName}`. Es el patrón correcto y el único genuinamente reutilizado.
- **13 módulos** usan en su lugar `cargarXlsx()` (SheetJS) directamente, y **3 módulos** (Comprobantes, Clientes) reimplementan ExcelJS manualmente desde cero (duplicación real, no solo nominal).
- El módulo con **mejor higiene**: las 5 tablas de Compras — `ColumnsManager` + `exportDatasetToExcel`, exportan siempre lo filtrado completo (nunca la página), montos como `number`+`numFmt`.
- **Bugs reales encontrados** (no corregidos, solo documentados): Catálogo de artículos exporta solo la página visible, no el catálogo filtrado completo; Maestro de clientes ignora el buscador al exportar (siempre exporta todo); Cobranzas ignora su propio `ColumnsManager` al exportar; nombres de archivo inconsistentes (solo Comprobantes/Cobranzas/Caja incluyen el período en el nombre).

---

## 5. Alternativas evaluadas

| Alternativa | Ventajas | Desventajas | Recomendación |
|---|---|---|---|
| **A. Reporte independiente en Reportes → Rentabilidad** | Sin duplicar fuente de verdad; no depende del dashboard; granularidad de línea correcta; reutiliza 100% la infraestructura de Compras (`ColumnsManager`+`exportDatasetToExcel`+hub data-driven) | Requiere una página nueva (no existe ninguna hoy) | **Elegida** |
| **B. Solo columnas en un reporte de ventas existente** | Cero página nueva | **No existe ningún reporte de ventas a nivel de línea** para extender; el único candidato (`Comprobantes`, nivel documento) ya tiene deuda técnica real (export desconectado de pantalla); mezclaría objetivo comercial/tributario con análisis de margen | Rechazada para el primer alcance |
| **C. Reporte independiente + columnas opcionales en reportes de ventas** | Cobertura máxima | Sin un reporte de línea existente, el "extra" de C se reduce a B (rechazado); riesgo de dos cálculos de utilidad divergentes (documento vs línea) | Rechazada para el primer alcance; reevaluar como fase 2 una vez el reporte y el servicio de proyección estén validados |
| **D. Ampliar el Resumen con un dashboard completo de rentabilidad, sin reporte en Reportes** | Visibilidad inmediata | Viola el principio obligatorio del encargo ("muchos usuarios no revisan Resumen"); no exportable por diseño de esa vista | Rechazada |

---

## 6. Ubicación UX recomendada

```
Indicadores
├── Resumen
│   └── (opcional) 2 tarjetas: Venta neta · Utilidad bruta → enlazan al reporte
└── Reportes
    └── Rentabilidad                    ← nueva categoría
        └── Rentabilidad de ventas       ← único reporte, con agrupación y filtros
```

Evidencia de viabilidad: `reportDefinitions.ts` ya tiene una categoría vacía ("Documentos") sin romper el hub — agregar "Rentabilidad" es el mismo movimiento data-driven, cero riesgo estructural.

---

## 7. Rol de Indicadores → Resumen

**Secundario, nunca obligatorio.** Recomendación concreta:

- **Tarjetas exactas recomendadas:** solo 2 — **Venta neta** y **Utilidad bruta**. NO agregar Costo de ventas ni Margen bruto % al Resumen (serían redundantes con las dos anteriores y saturarían el carrusel, que ya tiene 6 tarjetas).
- **Posición:** al final del carrusel `KpiCards` (posición 7-8), respetando el mismo `snap-x`/scroll horizontal — nunca reemplazar ninguna de las 6 tarjetas actuales (Total de Ventas, Ticket Promedio y Crecimiento tienen prioridad de negocio ya establecida).
- **Título/subtítulo:** "Venta neta" / período activo; "Utilidad bruta" / "Cobertura de costo: X%" como subtítulo (ver §16).
- **Acción al clic:** navega directo a `Reportes → Rentabilidad de ventas` (mismo patrón que la tarjeta "Crecimiento" ya usa para abrir su modal — aquí en vez de modal, navega al reporte).
- **Ventas sin costo:** el subtítulo de "Utilidad bruta" debe mostrar la cobertura (ver §16) — nunca mostrar utilidad=venta ni margen=100%.
- **Móvil:** mismo comportamiento de swipe/scroll horizontal ya implementado, sin cambios de layout.
- No existe mecanismo para que el usuario oculte KPIs (confirmado ausente) — no se debe inventar uno solo para esto.

---

## 8. Reporte principal de Rentabilidad

**Un único reporte:** "Rentabilidad de ventas", con filtros + selector "Agrupar por" (ver §15) en vez de 6 reportes especializados. Justificación: los 6 candidatos evaluados (resumen, por producto, por documento, por establecimiento, por vendedor, por cliente) son la MISMA tabla base agregada de formas distintas — construirlos como reportes separados duplicaría la lógica de proyección y el riesgo de inconsistencia entre pantallas. El primer alcance realmente útil es la tabla detallada por línea con agrupación configurable.

---

## 9. Granularidad de la tabla

**Una fila por línea de venta** (no por documento, no por producto agregado, no por día). Razón, con evidencia:
- El costo de venta solo existe a nivel de `ConsumoCapaCostoInventario` por `lineaComercialId` — agregar a nivel de documento perdería la posibilidad de ver qué producto específico generó la utilidad o la pérdida.
- `DetalleDocumentoComercial.desgloseFinancieroLineas` ya persiste la venta neta exactamente a nivel de línea — es la unidad atómica que el sistema ya calcula y congela.
- Agregaciones por producto/establecimiento/vendedor/período se resuelven agrupando esta tabla base (§15), nunca recalculando desde otra fuente.

---

## 10. Columnas predeterminadas

| Columna | Visible por defecto | Opcional | Fuente real | Formato | Justificación |
|---|---|---|---|---|---|
| Fecha | Sí | No (fija) | `InstantaneaDocumentoComercial.identidad.fechaEmision` | dd/mm/yyyy | Identifica el período de la venta |
| Documento | Sí | No (fija) | `identidad.numeroCompleto` | texto | Trazabilidad al comprobante |
| Producto | Sí | No (fija) | `CartItem.name`/`code` | texto | Unidad de análisis principal |
| Cantidad | Sí | No (fija) | `DesgloseFinancieroLinea.cantidad` | número | Volumen vendido |
| Venta neta | Sí | No (fija) | `DesgloseFinancieroLinea.ventaNetaSinImpuesto` | moneda | Ya persistida, congelada |
| Costo de venta | Sí | No (fija) | `ConsumoCapaCostoInventario.valorConsumidoMonedaBase` agregado por `lineaComercialId` (**requiere un NUEVO servicio de proyección — ver §17, no existe hoy**) | moneda | Núcleo del análisis |
| Utilidad bruta | Sí | No (fija) | Derivada: Venta neta − Costo de venta | moneda | Resultado principal |
| Margen bruto % | Sí | No (fija) | Derivada: Utilidad bruta / Venta neta × 100 | porcentaje | Resultado principal |

---

## 11. Columnas opcionales

| Columna | Visible por defecto | Opcional | Fuente real | Formato | Justificación |
|---|---|---|---|---|---|
| Cliente | No | Sí | `identidad`→`cliente.nombre` | texto | Análisis por cliente |
| Vendedor | No | Sí | `vendedor.nombreUsuario` | texto | Análisis por vendedor |
| Establecimiento | No | Sí | `establecimiento.nombreEstablecimiento` | texto | Multi-local |
| Almacén | No | Sí | `MovimientoStock.almacenNombre` | texto | Detalle logístico |
| Moneda | No | Sí | `DesgloseFinancieroLinea.moneda` | texto (código) | Multi-moneda |
| Precio unitario | No | Sí | `DesgloseFinancieroLinea.precioUnitarioHistorico` | moneda | Detalle de precio |
| Descuento de línea | No | Sí | `DesgloseFinancieroLinea.descuentoLinea` | moneda | Auditoría de descuentos |
| Descuento global asignado | No | Sí | `DesgloseFinancieroLinea.descuentoGlobalAsignado` | moneda | Auditoría de descuentos |
| Impuesto | No | Sí | `DesgloseFinancieroLinea.impuesto` | moneda | Detalle tributario |
| Total vendido | No | Sí | `DesgloseFinancieroLinea.total` | moneda | Total con impuesto |
| Estado del comprobante | No | Sí | `Comprobante.status` (`InvoiceListTable.STATUS_STYLES`) | badge | Reutiliza badge ya existente |
| Estado del costo | No | Sí | Derivada: `tieneValorizacion` (ver `FilaKardexValorizado`) | badge/texto | Ver §13 |
| Tipo de documento | No | Sí | `identidad.tipoDocumento`/`tipoComprobante` | texto | Factura/Boleta/NC/NV |
| Canal de venta | No | Sí | `identidad.origen` (`pos`/`emision_tradicional`/`documento_comercial`/`conversion`) | texto | Distingue POS vs Emisión Tradicional vs Documentos Comerciales |
| Nota de Crédito relacionada | No | Sí | **No existe fuente precomputada hoy** — requiere nueva lógica de búsqueda por relación (ver §14, §17) | texto/link | Trazabilidad de devolución |
| Cantidad devuelta | No | Sí | `CapaCostoInventario.consumoOrigenId` agregado (existe el campo, falta la función de agregación — nueva, ver §17) | número | Ajuste por devolución |
| Utilidad ajustada por devolución | No | Sí | Derivada (nueva lógica, ver §14/§17) | moneda | Solo si hay devolución |

**Fijas vs personalizables:** Fecha/Documento/Producto/Cantidad/Venta neta/Costo de venta/Utilidad bruta/Margen bruto % son **fijas** (mismo criterio que Compras: identidad + resultado principal nunca se ocultan). El resto es 100% `ColumnsManager`. Ningún ID técnico (`capaId`, `consumoId`, `movimientoId`) se muestra jamás.

---

## 12. Columnas de rentabilidad en reportes existentes

| Reporte actual | Columna propuesta | Default/opcional | Justificación |
|---|---|---|---|
| `Comprobantes emitidos` (`ListaComprobantes.tsx`) | Ninguna en este alcance | N/A | Su export ya tiene deuda técnica (columnas fijas desconectadas de `MASTER_COLUMNS`, sin `ColumnsManager`) que debe resolverse antes de ampliarlo; es nivel documento, no línea — agregar "margen" ahí requeriría re-agregar desde la misma fuente que el reporte de Rentabilidad, duplicando cálculo |
| `Reporte de stock` / `Movimientos de inventario` | Ninguna | N/A | Ya muestra costo unitario/valor de movimiento (Kardex) — mezclar con margen de VENTA sería un concepto distinto (costo de inventario vs. rentabilidad comercial) |
| `Maestro de clientes` | Ninguna | N/A | Nivel cliente agregado, no transaccional — fuera de alcance del primer reporte |

**Conclusión: el modelo dual evaluado en el encargo (reporte de ventas conserva objetivo comercial + columnas opcionales de costo/utilidad) NO se recomienda para este primer alcance**, precisamente porque no existe ningún reporte de ventas a nivel de línea al cual esas columnas puedan sumarse sin re-implementar la misma agregación que el reporte de Rentabilidad ya haría. Reevaluar en una fase 2, una vez el servicio de proyección esté probado en producción.

---

## 13. Excel de Rentabilidad

- **Desde qué pantalla:** el propio reporte "Rentabilidad de ventas", mismo botón **"Exportar"** (nunca "Exportar costos"/"Exportar utilidad").
- **Mecanismo:** `exportDatasetToExcel` (el patrón correcto, igual que Compras) — nunca SheetJS/`cargarXlsx`, para no sumar una 14ª implementación paralela.
- Respeta filtros aplicados y **exporta todas las filas filtradas**, nunca solo la página.
- Respeta `ColumnsManager`: exporta exactamente las columnas visibles + las fijas (aunque estén "ocultas" no existen como opción — las fijas siempre van).
- **Una sola hoja** (`worksheetName: 'Rentabilidad'`), sin hojas múltiples — no hay evidencia de necesidad de desglose adicional en el primer alcance.
- **Nombre de archivo:** `Rentabilidad_<periodoDesde>_<periodoHasta>.xlsx` (mismo patrón que ya usa `ListaComprobantes.tsx`, corrigiendo la inconsistencia detectada en Compras/Documentos Comerciales de usar solo la fecha de hoy).
- **Formatos:** montos como `number` + `numFmt:'#,##0.00'` (patrón de Compras, nunca string pre-formateado); porcentaje como `number` (ratio) + `numFmt:'0.00%'` (Excel nativo, no como string con símbolo `%`); fechas como `Date` real + `numFmt:'dd/mm/yyyy'` (patrón ya usado en `ListaComprobantes.tsx`).
- **Valores ausentes (sin costo):** la celda de Costo/Utilidad/Margen debe quedar **vacía** (`null`/`undefined`, nunca `0`), con una columna adicional "Estado del costo" = `"Sin costo registrado"` para esa fila (ver §16).

### Columnas mínimas del Excel — evaluación exacta

| Columna | Existe hoy | Confiable | Derivada | Exportable | Predeterminada | Opcional |
|---|---|---|---|---|---|---|
| Fecha | Sí | Sí | No | Sí | Sí | — |
| Documento | Sí | Sí | No | Sí | Sí | — |
| Tipo de documento | Sí | Sí | No | Sí | — | Sí |
| Cliente | Sí | Sí | No | Sí | — | Sí |
| Vendedor | Sí | Sí | No | Sí | — | Sí |
| Establecimiento | Sí | Sí | No | Sí | — | Sí |
| Almacén | Sí | Sí | No | Sí | — | Sí |
| Producto | Sí | Sí | No | Sí | Sí | — |
| Cantidad | Sí | Sí | No | Sí | Sí | — |
| Precio unitario histórico | Sí | Sí | No | Sí | — | Sí |
| Importe bruto | Sí | Sí | No | Sí | — | Sí |
| Descuento de línea | Sí | Sí | No | Sí | — | Sí |
| Descuento global asignado | Sí | Sí | No | Sí | — | Sí |
| Venta neta | Sí | Sí | No | Sí | Sí | — |
| Impuesto | Sí | Sí | No | Sí | — | Sí |
| Total vendido | Sí | Sí | No | Sí | — | Sí |
| Costo de venta | Parcial (dato existe, falta agregación) | Sí, cuando hay costo | **Sí** (nueva función) | Sí | Sí | — |
| Utilidad bruta | No | Sí, cuando hay costo | Sí | Sí | Sí | — |
| Margen bruto % | No | Sí, cuando hay costo | Sí | Sí | Sí | — |
| Estado del costo | No | Sí | Sí (nueva) | Sí | — | Sí |
| Devolución o NC relacionada | No | No verificable con la evidencia actual | Sí (nueva) | Sí | — | Sí |
| Moneda | Sí | Sí | No | Sí | — | Sí |

---

## 14. Excel de reportes existentes

**Ninguno se modifica en este alcance.** Consecuencia directa de §12: al no agregarse columnas de rentabilidad a ningún reporte existente, ningún Excel existente cambia. Única condición para el futuro: si en fase 2 se decide extender `Comprobantes emitidos`, su Excel debería primero migrar de la reimplementación manual de `BulkExport.tsx` a `exportDatasetToExcel` y conectar sus columnas de export a `MASTER_COLUMNS`/`ColumnsManager` — sin eso, agregar columnas de rentabilidad ahí perpetuaría la deuda técnica ya identificada.

---

## 15. Filtros

- **Obligatorios:** Periodo (reutilizar `DateRangePicker`).
- **Principales visibles:** Establecimiento (reutilizar el `<select>` inline ya usado 3 veces — ver §17 nota de duplicación), Buscador de texto (producto/documento/cliente), botón **"Agrupar por"** (Producto / Vendedor / Cliente / Establecimiento / Período / Sin agrupar — resuelve los "6 reportes" de un solo reporte, §8).
- **Avanzados (colapsados detrás de "Filtros"):** Almacén, Categoría, Tipo de documento, Canal, Estado del comprobante, Estado del costo, Con/sin devolución.
- **Innecesarios para el primer alcance:** Cliente/Vendedor como filtro dedicado (ya cubiertos por el buscador + agrupación), "Con utilidad/con pérdida" y "Rango de margen" (nice-to-have, añadir solo si el primer alcance demuestra demanda real — evitar saturar la pantalla de filtros, principio explícito del encargo).
- Reutilizar exactamente: `DateRangePicker`, patrón de `<select>` de establecimiento, `ColumnsManager`, botón "Exportar" — todos ya existen y no requieren nuevo diseño visual.

---

## 16. Ventas sin costo registrado

**Etiqueta única recomendada: "Sin costo registrado."** (Más precisa que "No valorizado" — una venta puede estar en una empresa ya valorizada pero sin costo histórico por otra razón — y más accionable que "No verificable", que es la frase reservada para esta auditoría, no para UI de producto.)

- **Celda de Costo/Utilidad/Margen:** texto `"Sin costo registrado"` en gris, nunca `S/ 0.00` ni `100%`.
- **Badge/estado:** columna opcional "Estado del costo" con badge neutro (gris) `"Sin costo"` vs. verde `"Con costo"`.
- **Tooltip:** "Esta venta no tiene un costo histórico asociado — probablemente ocurrió antes de activar la valorización de inventario."
- **Totales/tarjetas:** Venta neta **incluye** todas las filas (siempre calculable). Costo de venta, Utilidad bruta y Margen bruto % se calculan **solo** sobre filas con costo, con la advertencia de cobertura visible:

```
Utilidad bruta: S/ 8,500
Cobertura de costo: 94%
12 ventas sin costo registrado
```

**Sí se recomienda esta advertencia** — es la única forma honesta de comunicar que la utilidad mostrada no cubre el 100% de las ventas del período, evitando que el usuario interprete la cifra como definitiva.

- **Excel:** misma regla — celda vacía + columna "Estado del costo" = `"Sin costo registrado"`.
- **Gráficos:** las filas sin costo se excluyen de "Utilidad bruta por periodo"/"Margen bruto por producto" (nunca graficadas como 0).

---

## 17. Anulaciones y devoluciones

Regla recomendada por concepto:

| Concepto | Regla |
|---|---|
| Comprobante anulado | Excluir de Venta neta/Costo/Utilidad — no aporta ingreso ni costo real vigente. Mostrar con badge "Anulado" (reutilizando `STATUS_STYLES` de `InvoiceListTable.tsx`, ya existe) si se filtra explícitamente para verlo. |
| NC financiera | No afecta cantidad ni costo (confirmado: nunca toca inventario) — sí debe **reducir** la Venta neta del período/documento afectado. |
| NC con devolución física (total o parcial) | Reduce Venta neta proporcionalmente y reduce Costo de venta usando el costo histórico real recuperado (ya implementado en el motor — capas `procedencia:'devolucion_cliente'`). Utilidad se recalcula sobre los valores netos. |
| Varias devoluciones sobre la misma venta | Sumar todas las devoluciones confirmadas (nunca duplicar); cada una ya tiene su propio vínculo `consumoOrigenId`. |

**Vista recomendada:** **valores netos consolidados por defecto** (una sola fila con Venta neta y Costo de venta ya ajustados), con un filtro opcional "Incluir detalle de devoluciones" que, al activarse, agrega una fila de ajuste ligada a la original (mismo patrón que el detalle del Kardex ya usa: reverso = movimiento nuevo, nunca edita el original). Esto evita mostrar dos números de "utilidad" simultáneos sin contexto.

**Fuente:** ninguna fórmula se implementa aquí — solo se define que la fuente de "cantidad devuelta"/"costo recuperado" es el conjunto de capas `procedencia:'devolucion_cliente'` vinculadas por `consumoOrigenId`, y que el vínculo "NC relacionada" hoy **no tiene una función de búsqueda lista** (confirmado ausente) — debe construirse en el futuro servicio de proyección.

---

## 18. Indicadores y gráficos

**Agrupación** vía selector "Agrupar por" (§15), no tabs ni reportes separados.

**Máximo 2 gráficos**, ambos con utilidad real y evidencia de demanda (ya existen widgets equivalentes para ventas en el Resumen — `VentasPorComprobanteCard`, `VentasPorEstablecimientoCard` — confirmando que el patrón de "un gráfico junto a la tabla" ya es una convención aceptada en este módulo):
1. **Utilidad bruta por período** (línea/barras, mismo estilo recharts que `DetalleVentasDiariasCard`).
2. **Margen bruto por producto** (barras, top N).

Ambos excluyen filas "sin costo registrado" (§16). No se recomienda ningún gráfico adicional — evitar decoración sin uso analítico.

---

## 19. Detalle de una fila

Al hacer clic en una fila: **reutilizar el patrón de modal centrado de `MovimientoDetalleModal.tsx`** (no el `Drawer` compartido de Compras/Documentos Comerciales — el detalle de costo ya vive en ese patrón de modal, y mezclar ambos patrones para el mismo concepto de "detalle de costo" sería inconsistente). Mostrar exactamente el mismo tipo de sección ya usada ahí: **"Origen del costo"** con etiquetas humanas (`ETIQUETA_TIPO_DOCUMENTO_ORIGEN`), nunca `capaId`/`consumoId`.

Contenido del detalle (todo en lenguaje de negocio):
- Venta neta, Costo de venta, Utilidad bruta, Margen — con el mismo formato de la tabla.
- Desglose por línea (si el documento tiene más de un producto, mostrar solo la línea seleccionada, no todo el documento).
- Origen del costo (uno o varios orígenes si hubo multi-capa — igual que hoy).
- Ajustes por devolución, si existen (cantidad devuelta, costo recuperado) — sección adicional solo cuando aplique.
- Enlace "Ver comprobante" que navega al documento original (reutiliza la navegación ya existente hacia `ListaComprobantes`/`ListadoDocumentosComerciales`).

No se duplica el detalle del Kardex — se reutiliza literalmente el mismo patrón visual y las mismas etiquetas ya aprobadas.

---

## 20. Reutilización técnica

| Necesidad | Recurso existente | Reutilizable | Adaptación requerida | Riesgo |
|---|---|---|---|---|
| Hub y navegación | `ReportsHub.tsx` + `reportDefinitions.ts` | Sí | Agregar categoría + 1 definición | Bajo |
| Filtro de período | `DateRangePicker.tsx` | Sí | Ninguna | Bajo |
| Filtro de establecimiento | patrón `<select>` (duplicado 3 veces hoy) | Sí | Ninguna (mismo duplicado, no empeora) | Bajo |
| Columnas configurables | `ColumnsManager.tsx` | Sí | Ninguna — seguir el patrón de Compras exactamente | Bajo |
| Exportación | `exportDatasetToExcel` | Sí | Ninguna | Bajo |
| Deep-link auto-export | `useAutoExportRequest`/`autoExportParams.ts` | Sí | Nuevo `reportId` string | Bajo |
| Detalle de fila | `MovimientoDetalleModal.tsx` (patrón) | Sí (patrón, no el componente en sí) | Nuevo modal análogo para venta | Medio |
| Formato de dinero | `formatMoney`/`normalizarImporte` | Sí | Ninguna | Bajo |
| Formato de porcentaje | **No centralizado** — solo existe `formatPercentage` local en `indicadores-negocio/utils/formatters.ts` | Parcial | Import cross-feature aceptable (mismo módulo, `indicadores-negocio`) | Bajo |
| Costo por línea | `ConsumoCapaCostoInventario` + `listarConsumosPorMovimientoSalida`/`listarConsumosCapaCostoInventarioPorEmpresa` | Sí (datos) | **Falta la función de agregación por `lineaComercialId`/documento — NUEVA** | Medio |
| Venta neta por línea | `DesgloseFinancieroLinea` (`desgloseFinancieroVenta.ts`) | Sí | Ninguna para Factura/Boleta/POS/NC; **ausente en snapshots de Cotización/OV/NV antes de emitir** (confirmado: solo se completa al emitir el comprobante final) | Medio |
| `consultaKardexValorizado.service.ts` | Existe, pero opera por `MovimientoStock`, no por documento/producto agregado | Parcial | No reutilizable tal cual para Rentabilidad — sirve de referencia de patrón, no de función a llamar | Medio |

**Servicio único de proyección de Rentabilidad — necesario, no implementado aquí.** Responsabilidades que SÍ tendría: (a) leer `InstantaneaDocumentoComercial.detalle.desgloseFinancieroLineas` de los comprobantes del período; (b) leer `ConsumoCapaCostoInventario` vía `lineaComercialId`/`movimientoSalidaId` para el costo; (c) combinar ambos en filas puras `{fecha, documento, producto, cantidad, ventaNeta, costoVenta, utilidadBruta, margenBruto, tieneCosto, ...}`; (d) marcar `tieneCosto:false` cuando no haya consumo, nunca inventar 0. Lo que **NO** debería hacer: recalcular FIFO, tocar `Product.precioCompra`, mutar ningún dato de inventario/comprobante, ni duplicar la lógica ya existente en `consultaKardexValorizado.service.ts`/`desgloseFinancieroVenta.ts` — solo **combinar** lo que ya existe.

---

## 21. Permisos

- **Reutilizar `indicadores.ver`** — mismo criterio que el resto de Reportes (Comprobantes, Clientes, Inventario, Cobranzas, Caja no tienen permisos diferenciados por reporte individual, todo bajo el permiso de módulo).
- No hay evidencia de un permiso `costos`/`ventas.margen` existente, ni de reglas reales por plan (`No verificable con la evidencia actual` sobre restricciones por plan — no inventar ninguna).
- **No crear un permiso nuevo.** Si en el futuro el negocio decide que "ver ventas" no implica "ver costos/margen", eso requeriría una decisión de producto explícita y un permiso nuevo justificado — no algo a asumir ni crear en esta auditoría.

---

## 22. Propuesta visual conceptual

```
Indicadores de Gestión
[ Resumen ] [ Reportes ]

── Resumen (extracto) ──────────────────────────────
[ Total Ventas ] [ Nuevos Clientes ] [ Comprobantes ] [ Crecimiento ] [ Ticket Prom. ] [ Anulaciones ] [ Venta neta ] [ Utilidad bruta → ]

── Reportes ─────────────────────────────────────────
Comprobantes · Clientes · Precios · Inventario · Cobranzas · Caja · Rentabilidad
                                                              └── Rentabilidad de ventas

Rentabilidad de ventas
[ Periodo ] [ Establecimiento ] [ Agrupar por: Sin agrupar ▾ ]     [ Filtros ]
[ Buscar producto/documento/cliente ]              [ Columnas ] [ Exportar ]

Utilidad bruta: S/ 8,500   Cobertura de costo: 94%   12 ventas sin costo registrado

| Fecha      | Documento    | Producto      | Cantidad | Venta neta | Costo de venta      | Utilidad bruta | Margen  |
| 2026-07-01 | F001-000123  | Laptop X      | 2        | S/ 2,000   | S/ 1,400            | S/ 600          | 30.0%   |
| 2026-07-02 | B001-000456  | Mouse Y       | 5        | S/ 250     | Sin costo registrado| —               | —       |

(fila con costo disponible → cifras normales; fila sin costo → texto gris "Sin costo registrado", nunca 0)
```

- **Vista con costo disponible:** cifras normales, badge verde "Con costo" si la columna está activa.
- **Vista con ventas sin costo:** celdas grises "Sin costo registrado", badge neutro, excluidas de los totales de Utilidad/Margen pero incluidas en Venta neta.
- **Columnas configurables:** botón "Columnas" idéntico al de Compras/Movimientos de Inventario.
- **Excel:** mismo botón "Exportar", sin segundo botón.
- **Navegación al comprobante:** clic en la fila → modal de detalle (patrón `MovimientoDetalleModal`) → botón "Ver comprobante" → navega a la lista/documento original.

---

## 23. Archivos previstos

**Indicadores:**
- Modificado: `reportDefinitions.ts` (agregar categoría + 1 definición).
- Modificado (opcional): `IndicadoresPage.tsx`/`KpiCards.tsx` (2 tarjetas nuevas del Resumen).

**Reportes / página nueva:**
- Creado: página del reporte (nueva ruta, ej. `indicadores-negocio/pages/RentabilidadVentasPage.tsx` o ubicación equivalente) — justificación: no existe ninguna página de rentabilidad hoy.
- Modificado: `privateRoutes.tsx` (una entrada de ruta nueva).

**Proyección de datos:**
- Creado: un único servicio de proyección de Rentabilidad (combina `desgloseFinancieroLineas` + `ConsumoCapaCostoInventario`, ver §20) — justificación: no existe hoy ninguna función que una ambos lados.

**Tabla, filtros, columnas:**
- Creado: componente de tabla del reporte + su `ColumnsManagerColumn[]` (10 fijas/opcionales, ver §10-§11).
- Reutilizado sin cambios: `DateRangePicker`, patrón de filtro de establecimiento, `ColumnsManager`, botón "Exportar"/`exportDatasetToExcel`.

**Exportación:**
- Ninguna nueva utilidad — reutiliza `exportDatasetToExcel` tal cual.

**Pruebas (futura implementación, no ahora):**
- Pruebas del servicio de proyección (puro, sin UI) — mismo patrón ya usado en `consultaKardexValorizado.service.test.ts`.

**No tocados:** Indicadores → Resumen (salvo las 2 tarjetas opcionales), Inventario, Compras, todos los reportes existentes y sus Excel.

**Presupuesto estimado:** 1 página nueva + 1 ruta + 1 servicio de proyección + 1 componente de tabla/columnas + 1 modal de detalle + 1 entrada en `reportDefinitions.ts` — **6 piezas nuevas**, todas con responsabilidad única y sin duplicar infraestructura existente.

---

## 24. Riesgos UX y técnicos

- **Riesgo real:** construir el servicio de proyección de forma ingenua (recorrer todas las capas/consumos de la empresa en cada consulta) sin paginación/filtrado por período podría ser costoso en empresas con historial largo — debe filtrarse por rango de fechas ANTES de agregar, igual que ya hacen los reportes de Compras.
- **Riesgo real:** si se decide en el futuro extender `Comprobantes emitidos` con columnas de margen (fase 2, §12), debe resolverse primero su deuda técnica de exportación (migrar de `BulkExport.tsx` a `exportDatasetToExcel`) — de lo contrario se sumaría una 4ª implementación de Excel duplicada.
- **Riesgo real confirmado:** Cotización/OV/NV no persisten `desgloseFinancieroLineas` hasta que se emite el comprobante final — el reporte de Rentabilidad debe operar sobre comprobantes EMITIDOS, nunca sobre cotizaciones/OV/NV en borrador (que de todas formas no representan una venta real).
- **Riesgo UX:** mostrar "Sin costo registrado" sin la advertencia de cobertura (§16) generaría desconfianza en la cifra de utilidad — la advertencia es obligatoria, no opcional.
- No se identificó riesgo de aislamiento multiempresa (toda la infraestructura reutilizada ya es tenant-scoped) ni riesgo de permisos (reutiliza `indicadores.ver` sin cambios).

---

## 25. Decisiones pendientes de producto

- ¿El primer alcance incluye devoluciones/NC en el cálculo, o se difiere a fase 2? (Esta auditoría recomienda incluir devoluciones desde el inicio, ya que el motor ya las soporta — ver §17 — pero es una decisión de negocio, no técnica.)
- ¿Las 2 tarjetas del Resumen (§7) se implementan en el mismo alcance que el reporte, o se difieren? (Recomendado: mismo alcance, es trivial una vez el servicio de proyección existe.)
- ¿Se requiere un permiso diferenciado "ver costos" en el futuro? (No hay evidencia de necesidad hoy — decisión a revisar si surge un caso real de negocio.)

---

## 26. Recomendación final

Construir **un único reporte** "Rentabilidad de ventas" bajo una nueva categoría **Reportes → Rentabilidad**, granularidad por línea de venta, reutilizando al 100% la infraestructura ya validada de Compras (`ColumnsManager` + `exportDatasetToExcel` + hub data-driven de `reportDefinitions.ts`). No ampliar ningún reporte existente en este alcance — no existe hoy ninguno a nivel de línea, y el único candidato a nivel de documento ya tiene deuda técnica que debe resolverse antes, no en paralelo. El Resumen recibe como máximo 2 tarjetas secundarias que enlazan al reporte; nunca es la única vía de consulta. El único desarrollo genuinamente nuevo es un servicio de proyección que combina `desgloseFinancieroLineas` (ya existe) con `ConsumoCapaCostoInventario` (ya existe) — nada de esto requiere un motor nuevo, un permiso nuevo, ni una segunda vía de exportación.

---

**Ruta del archivo:** `docs/AUDITORIA_UX_RENTABILIDAD_REPORTES_EXPORTABLES.md`
