# Auditoría extrema de importación y exportación de stock

> **Fecha:** 2026-05-28  
> **Auditor:** Claude Sonnet 4.6 — Arquitecto senior / Auditor funcional-técnico  
> **Proyecto:** FacturaFacil — App `senciyo`  
> **Alcance:** Solo importación y exportación del módulo de inventario. No se evalúa backend ni compras.

---

## 1. Resumen ejecutivo

La importación masiva de stock **funciona correctamente a nivel lógico**: interpreta la cantidad como stock final, calcula la diferencia y genera movimientos de Kardex correctos (AJUSTE_POSITIVO o AJUSTE_NEGATIVO). Esta parte es sólida.

Sin embargo, el flujo actual tiene **problemas importantes de UX y trazabilidad** que hacen que el usuario tenga una experiencia confusa y riesgosa:

1. **La plantilla está vacía.** No incluye productos precargados. El usuario debe saber los códigos exactos de todos sus productos para llenar el Excel manualmente, lo que genera errores de código equivocado y productos "no encontrados" frecuentes.

2. **La gestión de almacenes es ambigua.** El archivo puede tener una columna ALMACEN opcional. Si no la tiene, se aplica a todos los almacenes seleccionados mediante checkboxes en pantalla. Esta dualidad no es clara para el usuario.

3. **No hay referencia de lote/importación en los movimientos.** Todos los movimientos de importación muestran `documentoReferencia: ''` (vacío). Es imposible saber después qué importación generó qué movimientos.

4. **Reset y Importar están en el mismo modal** sin separación visual suficiente. Un usuario puede activar un reset masivo por accidente.

5. **El reset usa `alert()` y `confirm()` del navegador**, inconsistente con el sistema de diseño del proyecto que usa `toast`.

Lo que está bien y no debe tocarse: la lógica de diferencia (stock_archivo - stock_actual), la generación de AJUSTE_POSITIVO/AJUSTE_NEGATIVO, la observación textual que muestra `X → Y`, y la validación de que si no hay diferencia no genera movimiento innecesario.

Los módulos de precios y productos tienen patrones más maduros que deben reutilizarse para transformar la importación de stock en un flujo simple, seguro y trazable.

**Prioridad:** Antes de cualquier rediseño visual, corregir la trazabilidad de lote y la plantilla vacía.

---

## 2. Alcance revisado

### Archivos del módulo de inventario auditados

```
gestion-inventario/
├── components/modals/MassUpdateModal.tsx               (1042 líneas — flujo completo de importación)
├── pages/InventoryPage.tsx                              (366 líneas — orquestador, exportación de movimientos)
├── components/disponibilidad/InventarioSituacionPage.tsx (327 líneas — exportación de stock actual)
├── components/disponibilidad/DisponibilidadTable.tsx    (599 líneas — tabla de disponibilidad)
├── components/tables/MovementsTable.tsx                 (audited — tabla de movimientos)
├── hooks/useInventory.ts                                (355 líneas — hook principal)
├── hooks/useInventarioDisponibilidad.ts                 (494 líneas — hook de disponibilidad)
├── services/inventory.service.ts                        (362 líneas — registerAdjustment, processMassUpdate)
├── repositories/stock.repository.ts                     (111 líneas — persistencia localStorage)
└── models/inventory.types.ts                            (189 líneas — MovimientoStock, tipos)
```

### Módulos comparados (importación/exportación)

```
gestion-clientes/
├── pages/ImportarClientesPage.tsx                       (1550 líneas — referencia de UX)

catalogo-articulos/
├── pages/ImportPage.tsx                                 (448 líneas — flujo con previsualización)
├── components/ImportModal.tsx                           (354 líneas — drag & drop)
├── components/ExportProductsModal.tsx                   (447 líneas — exportación configurable)
└── utils/excelHelpers.ts                                (200+ líneas — generación de plantilla dinámica)

lista-precios/
├── components/ImportPricesTab.tsx                       (302 líneas — tab de importación precargado)
└── utils/importProcessing.ts                            (150+ líneas — procesamiento)
```

### Búsquedas realizadas con Grep

- `xlsx|XLSX|sheet_to_json|writeFile|FileReader` → 7 archivos
- `MassUpdateModal|Actualización Masiva|handleApplyImport|handleResetStock|handleFileUpload` → gestion-inventario
- `plantilla|template|downloadTemplate` → catalogo-articulos, gestion-clientes, lista-precios
- `exportToExcel|handleExport` → InventoryPage, InventarioSituacionPage
- `registerAdjustment|AJUSTE_POSITIVO|AJUSTE_NEGATIVO` → inventory.service.ts, MassUpdateModal

---

## 3. Mapa actual de importación de stock

### Flujo paso a paso (desde que el usuario abre hasta que se actualiza el stock)

**Paso 1 — Acceso**
El usuario hace clic en el botón "Actualización Masiva" en `InventoryPage.tsx` (barra de acciones superior). Se abre `MassUpdateModal` como overlay.

**Paso 2 — Selección de tab**
El modal tiene 3 pestañas: "Resetear Stock", "Importar desde Archivo" y una tercera (manual). Por defecto abre en "Resetear Stock".

**Paso 3 — Selección de almacenes (común a ambas pestañas)**
El usuario debe elegir entre "Aplicar a todos los almacenes" (toggle) o seleccionar almacenes individualmente de una lista de checkboxes. Esta selección afecta tanto el reset como la importación.

**Paso 4 — Descarga de plantilla (tab Importar)**
El usuario hace clic en "Descargar Plantilla Excel". Se genera y descarga dinámicamente un archivo `.xlsx` con 3 columnas: `CODIGO`, `ALMACEN`, `CANTIDAD`. La plantilla está **vacía** (solo encabezados). Nombre: `plantilla-stock-{timestamp}.xlsx`.

**Paso 5 — Completar el archivo**
El usuario abre el Excel descargado, escribe manualmente el código de cada producto, opcionalmente el código del almacén, y la cantidad que quiere que quede en stock.

**Paso 6 — Carga del archivo**
El usuario selecciona o arrastra el archivo al área de carga. `handleFileUpload` lee el archivo con `XLSX.read(data, { type: 'binary' })`. Valida que existan columnas CODIGO y CANTIDAD. La columna ALMACEN es opcional.

**Paso 7 — Vista previa**
Se muestran los registros parseados con sus columnas: código, almacén (si existe), cantidad. El usuario puede revisar antes de aplicar.

**Paso 8 — Aplicar cambios**
`handleApplyImport` itera por cada almacén seleccionado (o el especificado en el archivo) y por cada registro:
- Busca el producto por `codigo.toUpperCase()`
- Si no existe: agrega a lista de "no encontrados"
- Si existe: calcula `diferencia = cantidad - stockActual`
- Si `diferencia === 0`: no genera movimiento (correcto)
- Si `diferencia > 0`: genera `AJUSTE_POSITIVO` con `cantidad = diferencia`
- Si `diferencia < 0`: genera `AJUSTE_NEGATIVO` con `cantidad = Math.abs(diferencia)`
- Llama `InventoryService.registerAdjustment()` → actualiza producto en Zustand + localStorage
- Llama `updateProduct()` en el store

**Paso 9 — Resultado**
Se muestra un `alert()` nativo con: movimientos registrados, almacenes procesados, sin cambios, no encontrados.

**Paso 10 — Cierre**
El modal se cierra. La vista de movimientos se refresca (tras corrección reciente con `reloadMovements`).

---

## 4. Mapa actual de exportación de stock/movimientos

### Exportación 1: Movimientos (`InventoryPage.handleExportToExcel`)

- **Qué exporta:** Movimientos filtrados por período y almacén (los mismos que se ven en la pestaña "Movimientos")
- **Archivo:** `movimientos_stock_{fecha}.xlsx`
- **Hoja:** "Movimientos"
- **Columnas (13):** Fecha, Producto, Código, Tipo, Motivo, Cantidad, Stock Anterior, Stock Nuevo, Almacén, Establecimiento, Usuario, Observaciones, Documento
- **Filtros respetados:** Sí — período y almacén aplicados en `filteredMovements`
- **Usa filtros de pantalla:** Sí
- **Sirve para Kardex:** Parcialmente — falta columna de saldo acumulado calculado
- **Sirve como plantilla de reimportación:** No — contiene todos los campos de movimiento, no solo código + cantidad

### Exportación 2: Stock actual (`InventarioSituacionPage`)

- **Qué exporta:** Disponibilidad actual por establecimiento y almacén seleccionado
- **Columnas:** Código, Producto, Unidad Mínima, Stock Real, Reservado, Disponible, Situación, Stock Mínimo, Stock Máximo, Establecimiento, Almacén
- **Filtros respetados:** Sí — según establecimiento y almacén seleccionados en filtros
- **Sirve para Kardex:** No — es una foto del stock actual, sin historial
- **Sirve como plantilla de reimportación:** Casi — tiene CODIGO y stock actual, pero también incluye columnas que el sistema ya conoce y que confundirían al usuario

---

## 5. Evaluación de plantilla

| Aspecto | Estado actual | Riesgo | Recomendación |
|---------|--------------|--------|---------------|
| Plantilla existe | ✅ Sí | — | Mantener |
| Se descarga desde el modal | ✅ Sí | — | Mantener |
| Plantilla vacía (sin productos) | ❌ Sin productos | ALTO: El usuario no sabe qué códigos usar → errores "no encontrado" masivos | Precargar con todos los productos del catálogo |
| Incluye CODIGO del producto | ✅ Sí | — | Mantener |
| Incluye NOMBRE del producto | ❌ No | MEDIO: El usuario no puede verificar a qué producto corresponde cada código | Agregar columna NOMBRE (solo lectura/informativa) |
| Incluye stock actual | ❌ No | ALTO: El usuario no sabe qué stock tiene ahora → no puede calcular cuánto ingresar | Agregar columna STOCK_ACTUAL (solo informativa) |
| Incluye ALMACEN | ⚠️ Opcional | ALTO: Lógica ambigua entre columna en archivo y selector en pantalla | Ver sección 8 |
| Incluye unidad | ❌ No | BAJO: Útil para validar que no se equivoca de unidad de medida | Agregar como columna informativa |
| Incluye instrucciones | ❌ No | MEDIO: El usuario no sabe qué poner en cada columna | Agregar hoja "Instrucciones" como en catálogo de productos |
| Tiene ejemplos en la plantilla | ❌ No | MEDIO: Sin ejemplos, el usuario no sabe el formato esperado | Agregar fila de ejemplo |
| Nombre del archivo claro | ✅ `plantilla-stock-{ts}.xlsx` | — | Mejorar a `Plantilla_Stock_{establecimiento}_{almacen}_{fecha}.xlsx` |

---

## 6. Evaluación de columnas de importación

| Columna | Obligatoria/Opcional | Uso actual | Problema | Recomendación |
|---------|---------------------|------------|---------|---------------|
| `CODIGO` (o `CODE`) | Obligatoria | Identifica el producto — búsqueda `p.codigo.toUpperCase() === codigo.toUpperCase()` | Solo busca por código exacto. No acepta nombre ni SKU alternativo. Si el código tiene espacios o variaciones, no encontrará. | Mantener como identificador principal. Agregar tolerancia a espacios (`trim()`). |
| `CANTIDAD` (o `STOCK`, `QTY`) | Obligatoria | Valor destino del stock | Interpreta como stock final (correcto). No valida mínimos/máximos configurados. No respeta `controlEstrictoStock` del almacén. | Mantener interpretación como stock final. Agregar validación contra stockMínimo/stockMáximo si el almacén tiene configuración estricta. |
| `ALMACEN` (o `ALMACEN`) | Opcional | Si existe, filtra el almacén objetivo por `codigoAlmacen.toUpperCase()`. Si no existe, aplica a todos los almacenes seleccionados. | Doble lógica de almacén (archivo vs selector) no documentada. Si el código del almacén en el archivo no coincide con ninguno activo, la fila se salta silenciosamente (no se reporta como error). | Ver sección 8 para análisis completo. Agregar validación explícita y reporte de almacén no encontrado. |
| `NOMBRE` (no existe) | No existe | — | El usuario no puede confirmar que el código corresponde al producto correcto | Agregar como columna informativa (solo para referencia visual, no procesada) |
| `STOCK_ACTUAL` (no existe) | No existe | — | El usuario no sabe el stock actual al preparar el archivo | Agregar como columna calculada al generar plantilla precargada |
| `UNIDAD` (no existe) | No existe | — | El usuario no sabe en qué unidad se mide el stock | Agregar como columna informativa |
| `ESTABLECIMIENTO` (no existe) | No existe | — | En entornos multi-establecimiento, no se puede especificar por fila | Fuera del alcance actual de la importación (se controla por filtro de pantalla) |

### Notas adicionales sobre columnas

- El parseo busca `codigoIndex` por `h.includes('codigo') || h.includes('code')` (case insensitive, parcial). Esto acepta variaciones de encabezado pero podría chocar si un encabezado contiene la palabra "codigo" por casualidad.
- El parseo busca `cantidadIndex` por `h.includes('cantidad') || h.includes('stock') || h.includes('qty')`. La palabra `stock` en el encabezado puede capturar columnas no deseadas si la plantilla tiene varias columnas con "stock" en el nombre (ej: "Stock Actual").
- Filas con `cantidad < 0` son aceptadas (aunque el stock resultante puede quedar negativo si `allowNegativeStock = false` a nivel del servicio, el `registerAdjustment` lo clampea a 0, no genera error visible).

---

## 7. Evaluación funcional de actualización de stock

### Modo: Importar desde Archivo

| Criterio | Estado | Evidencia técnica |
|---------|--------|------------------|
| ¿Reemplaza o suma? | **Reemplaza** (stock final) | `const diferencia = cantidad - stockActual; const tipo = diferencia > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO'` |
| ¿El comportamiento es claro para el usuario? | ❌ No está documentado | El modal no explica explícitamente que la cantidad es el stock final deseado, no una cantidad a sumar |
| ¿Genera movimiento cuando aumenta? | ✅ `AJUSTE_POSITIVO` | `InventoryService.registerAdjustment(..., tipo, ...)` |
| ¿Genera movimiento cuando disminuye? | ✅ `AJUSTE_NEGATIVO` | Mismo mecanismo |
| ¿Genera movimiento si no hay diferencia? | ✅ No (correcto) | `if (stockActual !== cantidad) { ... }` — salta si son iguales |
| ¿Guarda stock anterior? | ✅ Sí | `cantidadAnterior: stockActual` en `MovimientoStock` |
| ¿Guarda stock nuevo? | ✅ Sí | `cantidadNueva: nuevoStock` en `MovimientoStock` |
| ¿Guarda almacén? | ✅ Sí | `almacenId`, `almacenCodigo`, `almacenNombre` en movimiento |
| ¿Guarda usuario? | ✅ Sí | `user?.nombre \|\| 'Usuario'` |
| ¿Guarda observación útil? | ✅ Parcial | `'Importación masiva: ${stockActual} → ${cantidad}'` — muestra transición |
| ¿Guarda referencia de lote/importación? | ❌ No | `documentoReferencia: ''` (vacío) — imposible rastrear qué archivo/operación generó este movimiento |
| ¿Respeta `allowNegativeStock`? | ⚠️ Solo en servicio | `InventoryService.registerAdjustment` clampea a 0 si `permiteStockNegativo = false`, pero no muestra error al usuario ni reporta que el stock quedó diferente a lo pedido |
| ¿Respeta `controlEstrictoStock`? | ❌ No evaluado | La configuración del almacén tiene `controlEstrictoStock` pero la importación no la verifica |
| ¿Motivo es correcto? | ✅ `AJUSTE_INVENTARIO` | Apropiado para carga inicial/ajuste masivo |

### Escenario 1 — Stock actual 2, archivo dice 10
**Resultado:** `diferencia = 8 > 0` → `AJUSTE_POSITIVO, cantidad = 8`. Stock final = 10. ✅ Correcto.

### Escenario 2 — Stock actual 10, archivo dice 3
**Resultado:** `diferencia = -7 < 0` → `AJUSTE_NEGATIVO, cantidad = 7`. Stock final = 3. ✅ Correcto.

### Escenario 3 — Stock actual 5, archivo dice 0
**Resultado:** `diferencia = -5` → `AJUSTE_NEGATIVO, cantidad = 5`. Stock final = 0. ✅ Correcto (si `allowNegativeStock = false`, el servicio clampea a 0 igual que el resultado esperado).

### Escenario 4 — Producto no existe
**Resultado:** Se agrega a `noEncontrados[]` y se muestra en el resumen. ✅ Correcto pero el reporte es solo un `alert()` — no es descargable ni persistente.

### Escenario 5 — Almacén no existe (código en archivo no coincide con ningún almacén activo)
**Resultado:** `if (codigoAlmacen.toUpperCase() !== targetCode.toUpperCase()) { return; }` — la fila se salta silenciosamente. **No se reporta como error.** El usuario no sabe que esa fila fue ignorada. ❌ Bug de trazabilidad.

### Escenario 6 — Código de producto duplicado en mismo almacén
**Resultado:** Se procesan ambas filas en orden. La segunda sobrescribe el resultado de la primera porque `updateProduct` actualiza el store con el resultado de `registerAdjustment`, que trabaja sobre el estado en memoria. La segunda llamada usa el stock ya actualizado por la primera como base. **El resultado final depende del orden de las filas.** No se advierte al usuario. ❌ Comportamiento no documentado y potencialmente incorrecto.

### Escenario 7 — Mismo producto en dos almacenes distintos
**Resultado:** Se generan dos movimientos independientes, uno por almacén. ✅ Correcto.

### Escenario 8 — Selector de almacén en pantalla + columna ALMACEN en archivo
**Resultado:** Si el archivo tiene columna ALMACEN, el filtro interno compara el código de almacén de la fila con cada almacén del `almacenesAplicar`. Si coincide, procesa. Si no coincide, salta. Si el usuario seleccionó "Almacén A" en pantalla y el archivo dice "Almacén B", la fila se salta silenciosamente. ❌ Ambigüedad no documentada, potencialmente confusa.

---

## 8. Evaluación de almacenes en importación

### Situación actual

Existen **dos mecanismos paralelos** para especificar el almacén de la importación:

1. **Selector en pantalla:** El usuario marca checkboxes de almacenes o activa "Aplicar a todos". El sistema itera `almacenesAplicar` (array de almacenes seleccionados) y para cada uno procesa todos los registros del archivo.

2. **Columna ALMACEN en archivo:** Si existe, el sistema compara `fila.almacen.toUpperCase()` con `(almacen.codigoAlmacen ?? almacen.id).toUpperCase()` para decidir si procesa esa fila en ese almacén.

### Problema de la dualidad

Cuando ambos mecanismos coexisten, el comportamiento es:
- El sistema itera los almacenes del selector
- Para cada almacén, itera las filas del archivo
- Si la fila tiene ALMACEN especificado, solo procesa si coincide con el almacén actual de la iteración
- Si no coincide, salta silenciosamente (no reporta error)

Esto significa que si el usuario selecciona "Todos los almacenes" en pantalla y el archivo especifica "ALMACEN-01", solo las filas con "ALMACEN-01" en el archivo serán procesadas para ese almacén. Las demás se saltan. El resultado final puede ser correcto (el sistema termina aplicando cada fila al almacén correcto) pero el usuario no tiene forma de entender este comportamiento sin leer el código.

### Opciones para resolver la ambigüedad (análisis, sin implementar)

| Enfoque | Ventajas | Desventajas | Recomendado |
|---------|---------|-------------|-------------|
| **Columna ALMACEN en Excel + selector deshabilitado** | El archivo es autocontenido | El usuario necesita conocer códigos de almacén exactos; errores de código no reportados | Parcialmente |
| **Selector de almacén en pantalla, sin columna en Excel** | Más simple para el usuario; un almacén a la vez | No permite multi-almacén en un solo archivo | Para casos simples |
| **Selector de establecimiento + almacén en pantalla, plantilla pre-filtrada** | El usuario trabaja solo con los productos del almacén que eligió | Requiere un selector previo a la descarga de plantilla | **Recomendado** |
| **Columna ALMACEN con lista desplegable en Excel** | Reduce errores de código | Técnicamente complejo (validación XLSX nativa); el proyecto ya usa XLSX básico | Futuro |
| **Un archivo por almacén** | Simple y predecible | Inconveniente si hay muchos almacenes | Para negocios con pocos almacenes |

**Recomendación:** El enfoque más seguro y simple es que el usuario elija establecimiento + almacén en pantalla **antes** de descargar la plantilla, y que la plantilla se genere precargada con los productos de ese almacén con su stock actual. Así la columna ALMACEN en el archivo queda innecesaria y se elimina la ambigüedad.

---

## 9. Evaluación de resetear stock

| Criterio | Estado | Riesgo | Recomendación |
|---------|--------|--------|---------------|
| ¿Genera movimientos? | ✅ Sí — `AJUSTE_NEGATIVO` por cantidad actual | — | Mantener |
| ¿Registra `stockActual` previo? | ✅ Sí — `cantidadAnterior` en movimiento | — | Mantener |
| ¿Documenta el reset? | ⚠️ Solo observación: `'Reseteo masivo de stock a cero'` | MEDIO: Sin referencia de usuario que inició el reset | Agregar nombre de usuario y fecha explícita |
| ¿Está en el mismo modal que importación? | ❌ Sí (mismo modal, primera pestaña) | ALTO: El usuario abre el modal buscando importar y puede activar reset accidentalmente | Separar visualmente, o mover reset a una sección con acceso más deliberado (botón separado, confirmación en 2 pasos) |
| ¿La confirmación es suficiente? | ⚠️ Solo `confirm()` del navegador | ALTO: El diálogo nativo puede no leerse con atención; no muestra cuántos productos/almacenes afectará antes de confirmar | Reemplazar con modal de confirmación que muestre resumen de impacto |
| ¿El reset está demasiado visible? | ⚠️ Es la primera pestaña | ALTO: El usuario puede activar reset sin intención | Cambiar orden: Importar primero, Reset al final o en sección separada |
| ¿El reset omite productos con stock 0? | ✅ Sí — `if (stockActual > 0)` | — | Mantener (evita movimientos innecesarios) |
| ¿El reset reporta cuántos productos afectó? | ⚠️ Solo en `alert()` | BAJO: No persistente, no descargable | Mostrar resultado en UI antes de cerrar modal |

---

## 10. Evaluación de resultados y errores de importación

### Resumen actual (tras `handleApplyImport`)

Se muestra un `alert()` con texto plano:
```
✅ IMPORTACIÓN COMPLETADA

📊 Resumen:
• Movimientos registrados: N
• Almacenes procesados: M
• Sin cambios (mismo stock): X

⚠️ No encontrados (Y):
cod1, cod2, cod3 ...
```

### Problemas del resumen actual

| Problema | Severidad | Detalle |
|---------|----------|---------|
| Usa `alert()` nativo | MEDIO | No es accesible, bloquea el hilo, no respeta el sistema de diseño |
| Lista de no encontrados se trunca a 10 | MEDIO | Si hay 50 productos no encontrados, el usuario no puede verlos todos |
| No hay descarga de reporte de errores | ALTO | El usuario no puede exportar la lista de productos no actualizados para corregir |
| No reporta almacén no encontrado (escenario 5) | ALTO | Las filas saltadas por almacén inexistente no se cuentan ni reportan |
| No reporta duplicados en archivo (escenario 6) | ALTO | Los duplicados se procesan sin advertencia |
| No reporta si stock quedó diferente a lo pedido | MEDIO | Si `allowNegativeStock = false` y el stock pedido es negativo, el servicio clampea a 0 sin notificar |
| No muestra vista previa antes de aplicar | ALTO | El usuario solo puede revisar los datos crudos del archivo, no el impacto calculado (stock antes → stock después) |

### Comparación con otros módulos

| Módulo | Vista previa antes de aplicar | Lista de errores descargable | Reporte persistente | Detalle por fila |
|--------|------------------------------|------------------------------|--------------------|--------------------|
| Clientes | ❌ No | ✅ Sí | ✅ Sí (en historial) | ✅ Sí (fila + mensaje) |
| Productos | ✅ Sí (ImportPage) | ✅ Sí (`exportImportErrors`) | ❌ No | ✅ Sí (fila + error) |
| Precios | ✅ Sí (tabla de previsualización) | ❌ No | ✅ Parcial (timestamp) | ✅ Sí (estado por fila) |
| **Stock** | ⚠️ Solo datos crudos | ❌ No | ❌ No | ❌ No |

---

## 11. Evaluación de exportación

### Exportación de movimientos (`InventoryPage`)

| Criterio | Estado |
|---------|--------|
| ¿Existe? | ✅ Sí — botón "Exportar" en barra de acciones |
| ¿Qué exporta? | Movimientos del período/almacén filtrado |
| ¿Columnas suficientes para Kardex? | ⚠️ Parcial — tiene Stock Anterior y Nuevo, pero no "Saldo acumulado" calculado |
| ¿Incluye Almacén? | ✅ Sí |
| ¿Incluye Establecimiento? | ✅ Sí |
| ¿Incluye Documento origen? | ✅ Sí (campo `Documento`) |
| ¿Incluye Usuario? | ✅ Sí |
| ¿Incluye Motivo? | ✅ Sí |
| ¿Respeta filtros? | ✅ Sí — usa `filteredMovements` |
| ¿Exporta todos los datos o solo la página? | ✅ Todos los filtrados |
| ¿Confunde con "exportar plantilla"? | ✅ El botón dice "Exportar" — podría mejorarse a "Exportar movimientos" para mayor claridad |
| ¿Sirve para reimportar? | ❌ No — contiene todos los campos del movimiento, no es el formato de importación |

### Exportación de stock actual (`InventarioSituacionPage`)

| Criterio | Estado |
|---------|--------|
| ¿Existe? | ✅ Sí — botón de descarga en toolbar de situación |
| ¿Qué exporta? | Foto del stock actual por establecimiento y almacén |
| ¿Incluye CODIGO? | ✅ Sí |
| ¿Incluye NOMBRE? | ✅ Sí |
| ¿Incluye stock actual (Real)? | ✅ Sí |
| ¿Incluye Reservado? | ✅ Sí |
| ¿Incluye Disponible? | ✅ Sí |
| ¿Incluye Almacén/Establecimiento? | ✅ Sí |
| ¿Sirve como plantilla de reimportación? | ⚠️ Casi — tiene CODIGO y stock actual, pero las columnas extra confundirían al usuario |
| ¿Sirve para Kardex? | ❌ No — es solo un snapshot, sin historial |

### Oportunidad detectada

La exportación de stock actual podría servir como base para la plantilla de importación si se genera con las columnas correctas: CODIGO, NOMBRE (solo lectura), UNIDAD, STOCK_ACTUAL (solo lectura), NUEVA_CANTIDAD (la que el usuario edita). Esto evitaría mantener dos archivos separados.

---

## 12. Comparación con importación de clientes y precios

### Gestión de Clientes (`ImportarClientesPage.tsx`)

| Característica | Clientes | Stock |
|----------------|---------|-------|
| Tiene página/tab propia | ✅ Página dedicada | ❌ Solo modal |
| Tiene modal de carga | ✅ Sí | ✅ Sí (en el modal) |
| Plantilla descargable | ✅ Archivos estáticos oficiales | ✅ Generada dinámicamente |
| Plantilla precargada con datos | ⚠️ Solo filas de ejemplo | ❌ Vacía |
| Hoja de instrucciones | ❌ No | ❌ No |
| Dos modos (básico/completo) | ✅ Sí | ❌ No |
| Muestra resultado detallado | ✅ Sí — creados, actualizados, omitidos, errores por fila | ⚠️ Solo `alert()` simple |
| Descarga reporte de errores | ✅ Sí | ❌ No |
| Vista previa antes de aplicar | ❌ No | ⚠️ Solo datos crudos |

**Qué reutilizar de Clientes:** El patrón de reportar errores por fila (número de fila + campo + mensaje) y la posibilidad de descargar el reporte de errores.

**Qué no reutilizar:** La complejidad de dos modos (básico/completo). Stock no necesita eso.

---

### Catálogo de Artículos (`ImportPage.tsx + excelHelpers.ts`)

| Característica | Productos | Stock |
|----------------|---------|-------|
| Tiene página propia | ✅ `ImportPage` | ❌ Solo modal |
| Tiene modal de carga | ✅ `ImportModal` con drag & drop | ✅ Modal con drag & drop |
| Plantilla generada dinámicamente | ✅ Con unidades, establecimientos, ejemplos | ✅ Pero vacía sin productos |
| Hoja de instrucciones en plantilla | ✅ Sí — incluye valores permitidos | ❌ No |
| Vista previa antes de aplicar | ✅ Sí — con columnas parseadas y errores | ⚠️ Solo datos crudos |
| Descarga de errores | ✅ `exportImportErrors()` | ❌ No |
| Reporta creados/actualizados/errores | ✅ Sí, en pantalla estructurada | ⚠️ `alert()` simple |

**Qué reutilizar de Productos:** 
1. `generateExcelTemplate()` con hoja de instrucciones — adaptar para stock con columnas CODIGO, NOMBRE, UNIDAD, STOCK_ACTUAL, NUEVA_CANTIDAD
2. `exportImportErrors()` — adaptar para exportar productos no encontrados y almacenes fallidos
3. El flujo de vista previa antes de aplicar (mostrar el impacto calculado: stock actual → stock nuevo, por producto y almacén)

---

### Lista de Precios (`ImportPricesTab.tsx`)

| Característica | Precios | Stock |
|----------------|---------|-------|
| Tiene tab propio dentro de página | ✅ Tab dentro de Lista de Precios | ❌ Modal separado |
| Plantilla precargada con productos | ✅ **Sí — todos los productos del catálogo** | ❌ Vacía |
| Columnas dinámicas según configuración | ✅ Según columnas de precios activas | ❌ Solo CODIGO, ALMACEN, CANTIDAD fijas |
| Vista previa con estado por fila | ✅ Lista, Aplicada, Sin cambios, Error | ⚠️ Solo datos crudos |
| Mensajes de estado detallados | ✅ Sí — con conteo y timestamp | ⚠️ Solo `alert()` |
| Selector previo necesario | Columnas de precios activas | Debería: establecimiento + almacén |

**Qué reutilizar de Precios:** El patrón de **plantilla precargada con todos los productos del catálogo** es exactamente lo que necesita stock. El usuario descarga el archivo, ya tiene su lista de productos con el stock actual, solo modifica la columna "NUEVA CANTIDAD" y reimporta.

**Patrón ideal para stock:** Combinar la plantilla precargada de Precios con la vista previa y reporte de errores de Productos.

---

## 13. Problemas detectados

| ID | Severidad | Problema | Evidencia técnica | Impacto funcional/UX | Recomendación concreta |
|----|-----------|---------|-------------------|----------------------|------------------------|
| I-01 | **ALTO** | Plantilla vacía sin productos precargados | `MassUpdateModal.tsx:388-418`: plantilla genera solo headers `['CODIGO', 'ALMACEN', 'CANTIDAD']` | El usuario debe conocer todos los códigos de sus productos de memoria o buscarlos uno a uno. Genera errores masivos de "no encontrado". | Generar plantilla con todos los productos del catálogo activo, incluyendo stock actual por almacén seleccionado. |
| I-02 | **ALTO** | Almacén no encontrado en archivo no se reporta | `MassUpdateModal.tsx:318`: `if (codigoAlmacen.toUpperCase() !== targetCode.toUpperCase()) { return; }` — sin push a noEncontrados | Las filas con almacén incorrecto se ignoran silenciosamente. El usuario cree que se actualizó stock cuando no fue así. | Agregar `almacenesNoEncontrados[]` al reporte de resultado. |
| I-03 | **ALTO** | Sin referencia de lote en movimientos de importación | `MassUpdateModal.tsx:348`: `documentoReferencia: ''` (vacío explícito) | Imposible saber después qué importación generó qué movimientos. El campo Documento en MovementsTable aparece vacío. | Generar un ID de lote por cada ejecución de importación (ej: `IMP-{timestamp}`) y usarlo como `documentoReferencia`. |
| I-04 | **ALTO** | Duplicados en archivo no reportados ni rechazados | `handleApplyImport` itera todas las filas sin deduplicar | Si el mismo producto aparece dos veces, se aplican dos ajustes consecutivos. El resultado final depende del orden de filas. El usuario no recibe advertencia. | Detectar duplicados (mismo CODIGO + ALMACEN) antes de aplicar. Tomar el último valor o reportar el conflicto. |
| I-05 | **ALTO** | Sin vista previa de impacto calculado | Solo muestra datos crudos del archivo, sin mostrar `stock_actual → nueva_cantidad` antes de aplicar | El usuario no puede revisar el impacto antes de confirmar. Errores en cantidades no se detectan hasta ver los movimientos. | Agregar step de previsualización mostrando: producto, stock actual, nueva cantidad, diferencia, tipo de ajuste. |
| I-06 | **MEDIO** | Sin descarga de reporte de errores | Los "no encontrados" solo se muestran en `alert()` truncados a 10 | Para importaciones grandes, el usuario no puede saber todos los productos que fallaron. | Agregar botón "Descargar reporte de errores" como en módulo de productos. |
| I-07 | **MEDIO** | Reset en primera pestaña del modal | El modal abre en "Resetear Stock" por defecto (`useState<'reset'>`) | Un usuario que quiere importar puede ejecutar un reset accidentalmente. | Cambiar orden de tabs: Importar primero. O separar Reset en sección independiente con acceso más deliberado. |
| I-08 | **MEDIO** | Comportamiento de cantidad vs stock no documentado | No hay texto en el modal explicando que la cantidad es el stock final deseado | El usuario puede asumir que se suma la cantidad al stock actual, no que la reemplaza. | Agregar texto claro en el modal: "La cantidad representa el stock final deseado. El sistema calculará el ajuste automáticamente." |
| I-09 | **MEDIO** | Reset usa `confirm()` y `alert()` nativo | `handleResetStock:81-95`: `const confirmacion = confirm(...)` y `alert(...)` al final | Inconsistente con el sistema de diseño del proyecto. El `confirm()` del navegador puede ignorarse fácilmente. | Reemplazar con modal de confirmación dedicado y `toast` para resultados. |
| I-10 | **MEDIO** | La plantilla no tiene hoja de instrucciones | La plantilla generada tiene una sola hoja con 3 columnas vacías | El usuario no sabe qué valores son válidos, qué formato usar ni cómo funciona el almacén. | Agregar hoja "Instrucciones" como hace el módulo de productos (`excelHelpers.ts:113-127`). |
| I-11 | **BAJO** | `documentoReferencia` vacío en reset también | `handleResetStock:111`: `documentoReferencia: ''` | Los movimientos de reset no tienen referencia. | Generar ID de lote también para el reset: `RST-{timestamp}`. |
| E-01 | **BAJO** | Botón de exportación no indica qué exporta | `InventoryPage.tsx`: botón etiquetado "Exportar" sin especificar | El usuario puede confundir "exportar movimientos" con "exportar plantilla de stock" | Cambiar etiqueta a "Exportar movimientos" o añadir submenú. |
| E-02 | **BAJO** | La exportación de stock actual no sirve como plantilla | Las columnas incluyen Reservado, Disponible, Situación que confundirían en reimportación | Oportunidad perdida: el Excel de stock actual podría servir como base para preparar una importación | Documentar o agregar un botón "Descargar como plantilla" que genere la versión adaptada para importar. |

---

## 14. Qué está bien y debe mantenerse

1. **Lógica de diferencia:** La importación calcula `diferencia = cantidadArchivo - stockActual` y genera el tipo de ajuste correcto. Es la base correcta para Kardex y no debe cambiarse.

2. **No genera movimiento si no hay diferencia:** `if (stockActual !== cantidad) { ... }` — evita ruido de movimientos innecesarios.

3. **`AJUSTE_POSITIVO` / `AJUSTE_NEGATIVO` como motivo `AJUSTE_INVENTARIO`:** Correcto para este flujo. No simula una venta ni una compra.

4. **La observación muestra la transición:** `'Importación masiva: ${stockActual} → ${cantidad}'` es informativa y útil para auditoría.

5. **Guarda `cantidadAnterior` y `cantidadNueva`:** Ambos campos del `MovimientoStock` se registran correctamente.

6. **Identificación de producto por código (case insensitive):** El `codigo.toUpperCase()` es tolerante y práctico.

7. **La lógica multi-almacén con selector de almacenes:** El concepto de seleccionar qué almacenes afecta la importación es correcto, aunque la UX necesita mejoras.

8. **El reset genera movimientos:** `InventoryService.registerAdjustment` con tipo `AJUSTE_NEGATIVO` — esto mantiene trazabilidad del reset en el Kardex.

9. **El reset omite productos con stock 0:** `if (stockActual > 0)` evita movimientos de ajuste de `0 → 0`.

10. **Formatos aceptados:** `.xlsx`, `.xls`, `.csv`, `.txt` — cobertura amplia.

11. **Validación de encabezados mínimos:** El parser valida que existan columnas CODIGO y CANTIDAD antes de procesar.

---

## 15. Propuesta funcional recomendada (sin implementar)

### Flujo ideal de importación de stock

**¿Tab propio o modal?**
Se recomienda un **tab dentro de la página de inventario** (como Lista de Precios), no un modal flotante. El flujo de importación tiene suficientes pasos (descarga → completar → subir → previsualizar → confirmar) para merecer una vista dedicada. Sin embargo, si se mantiene como modal, debe ser un modal más grande con steps visuales.

**Paso 1 — Selección de contexto (antes de descargar plantilla)**
El usuario elige: Establecimiento + Almacén. Este contexto define el stock actual que se mostrará en la plantilla.

**Paso 2 — Descarga de plantilla precargada**
La plantilla se genera con:
- Columna `CODIGO` (bloqueada/gris — solo lectura)
- Columna `NOMBRE` (bloqueada/gris — solo lectura)
- Columna `UNIDAD` (bloqueada/gris — solo lectura)
- Columna `STOCK_ACTUAL` (bloqueada/gris — solo lectura, para referencia)
- Columna `NUEVA_CANTIDAD` (editable — el usuario solo toca esta columna)
- Hoja "Instrucciones" con explicación del flujo

La columna ALMACEN desaparece del archivo porque ya fue seleccionada en pantalla.

**Paso 3 — El usuario edita NUEVA_CANTIDAD**
Solo modifica la columna de nueva cantidad. No toca el resto.

**Paso 4 — Carga del archivo**
El sistema detecta automáticamente la columna NUEVA_CANTIDAD. Muestra cuántos productos fueron encontrados.

**Paso 5 — Vista previa de impacto (antes de aplicar)**
Tabla con: Código, Nombre, Stock Actual, Nueva Cantidad, Diferencia, Tipo de Ajuste. Filtros: Solo con cambios / Todos. Errores resaltados en rojo.

**Paso 6 — Confirmar importación**
Botón "Aplicar cambios". Se genera un ID de lote (`IMP-{timestamp}`) que se usa como `documentoReferencia` en todos los movimientos.

**Paso 7 — Resultado**
En pantalla (no `alert()`): Total aplicados, sin cambios, no encontrados. Botón "Descargar reporte de errores" si hay fallos.

**Validaciones mínimas antes de aplicar:**
- Producto no encontrado → reportar, no aplicar esa fila
- Almacén no activo → reportar, no aplicar esa fila
- Cantidad negativa → depende de config `allowNegativeStock`; si no se permite, reportar
- Duplicados (mismo producto) → tomar el último valor y advertir

**Trazabilidad Kardex:**
- `documentoReferencia`: `IMP-{timestamp}`
- `motivo`: `AJUSTE_INVENTARIO`
- `observaciones`: `Importación masiva: {stockAnterior} → {stockNuevo}` (mantener el actual)
- `tipo`: `AJUSTE_POSITIVO` o `AJUSTE_NEGATIVO` (mantener el actual)

---

## 16. Matriz priorizada de mejoras

| Mejora | Prioridad | Tipo | Requiere rediseño visual | Riesgo si no se hace |
|--------|-----------|------|--------------------------|---------------------|
| Plantilla precargada con productos y stock actual | **P1** | Mejora UX | No — solo cambia la generación del Excel | ALTO: Errores masivos de "no encontrado" con plantilla vacía |
| Referencia de lote (`IMP-{timestamp}`) en movimientos | **P1** | Corrección trazabilidad | No — 1 línea de código | ALTO: Imposible auditar qué importación generó qué movimientos |
| Reportar almacén no encontrado en resultado | **P1** | Corrección lógica | No | ALTO: Filas ignoradas silenciosamente, stock no actualizado sin que el usuario lo sepa |
| Deduplicar filas duplicadas en archivo | **P1** | Corrección lógica | No | ALTO: Resultado de importación dependiente del orden de filas |
| Texto explicativo: "cantidad = stock final, no suma" | **P2** | Mejora UX | Mínima (texto en modal) | MEDIO: Confusión sobre el comportamiento de reemplazo vs suma |
| Vista previa de impacto antes de aplicar | **P2** | Mejora UX | Sí (nuevo componente) | MEDIO: El usuario no detecta errores hasta ver movimientos |
| Reemplazar `confirm()`/`alert()` por modal/toast | **P2** | Mejora UX | Mínima | BAJO: Inconsistencia de diseño |
| Separar Reset de Importar (tab orden o sección separada) | **P2** | Mejora UX | Mínima | MEDIO: Risk de reset accidental |
| Descarga de reporte de errores (no encontrados) | **P3** | Mejora UX | No — reutilizar patrón de productos | BAJO: Sin descarga, errores se pierden |
| Hoja de instrucciones en plantilla | **P3** | Mejora UX | No | BAJO: Instrucciones en pantalla ya reducen el riesgo |
| Exportación de movimientos con etiqueta clara | **P4** | Mejora UX | Mínima | BAJO: Confusión menor |
| Plantilla exportación de stock con opción "usar como base para importar" | **P4** | Mejora UX | No | BAJO: Oportunidad de simplificación |

---

## 17. Conclusión final

**¿La importación actual funciona correctamente?**
Parcialmente. La lógica de diferencia (reemplazo de stock, no suma) es correcta. Los movimientos generados tienen los campos necesarios. Sin embargo, hay errores funcionales importantes: almacén no encontrado no se reporta, duplicados no se controlan, y la referencia de lote en movimientos está vacía. Estos deben corregirse antes de cualquier rediseño.

**¿La exportación actual funciona correctamente?**
Sí. La exportación de movimientos y la de stock actual funcionan correctamente. Tienen las columnas necesarias. El único problema es que ninguna de las dos puede usarse como plantilla de importación directamente.

**¿El flujo actual es simple para el usuario?**
No. La plantilla vacía obliga al usuario a conocer todos los códigos de sus productos. La ambigüedad entre columna ALMACEN en el archivo y selector en pantalla no está documentada. La pestaña Reset aparece primero y puede causar operaciones destructivas accidentales.

**¿La plantilla actual es suficiente?**
No. Tres columnas vacías (`CODIGO`, `ALMACEN`, `CANTIDAD`) no son suficientes para un usuario no técnico. La plantilla ideal debería venir con los productos precargados, el stock actual visible y solo una columna editable.

**¿Qué se debe corregir antes de rediseñar?**
1. Agregar ID de lote (`IMP-{timestamp}`) como `documentoReferencia` en todos los movimientos de importación
2. Reportar filas con almacén no encontrado en el resultado de importación
3. Detectar y manejar duplicados en el archivo antes de procesar
4. Agregar texto claro que explique que la cantidad es el stock final deseado

**¿Qué se debe considerar para el futuro rediseño?**
La plantilla precargada con productos (patrón de Lista de Precios) es el cambio con mayor impacto para la UX. El selector de establecimiento + almacén previo a la descarga de plantilla elimina la ambigüedad de la columna ALMACEN. La vista previa de impacto (patrón de Catálogo de Artículos) permite al usuario revisar los cambios antes de confirmar. Estos tres elementos, junto con las correcciones de trazabilidad, transformarían la importación de un flujo técnico-confuso en uno simple y confiable.

---

*Auditoría basada en lectura directa del código fuente. No se modificó ningún archivo. Todas las afirmaciones están referenciadas a evidencia de código real.*
