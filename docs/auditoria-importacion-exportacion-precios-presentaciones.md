# Auditoría de importación y exportación de precios con presentaciones — SenciYo

**Fecha:** 2026-05-19  
**Tipo:** Solo lectura — sin modificaciones de código  
**Módulo auditado:** Lista de Precios — flujo de exportación e importación masiva de precios  
**Versión:** rama `develop`

---

## 1. Resumen ejecutivo

El flujo actual de exportación/importación masiva de precios en Lista de Precios **funciona correctamente para el caso de un solo código SUNAT por producto**, pero presenta cuatro problemas críticos cuando el producto tiene presentaciones comerciales:

1. **La columna `UNIDAD` expone códigos SUNAT técnicos** (p. ej. `SA`, `BX`, `PK`) en lugar de los nombres comerciales que el usuario creó (p. ej. "SACO POR 50K", "CAJA X 12").
2. **Dos presentaciones con el mismo código SUNAT comparten una única ranura de precio** — sobreescritura silenciosa inevitable.
3. **El Excel no incluye el nombre del producto ni la equivalencia**, lo que hace muy difícil que el usuario identifique qué fila corresponde a qué.
4. **No existe columna técnica oculta/protegida** que permita identificar de forma unívoca cada presentación independientemente del texto visible.

El resultado práctico: el usuario que exporta sus precios ve datos técnicos incomprensibles, y si tiene dos presentaciones con el mismo código SUNAT (p. ej. "CAJA X 12" y "CAJA X 18", ambas `BX`), el sistema no puede almacenar ni exportar sus precios de forma independiente.

---

## 2. Alcance revisado

| Archivo | Revisado |
|---|---|
| `utils/importProcessing.ts` | ✅ Completo |
| `components/ListaPrecios.tsx` (función `exportVisiblePrices`) | ✅ Completo |
| `hooks/usePriceProducts.ts` (función `applyImportedFixedPrices`) | ✅ Completo |
| `models/PriceTypes.ts` | ✅ Completo |
| `models/PriceImportTypes.ts` | ✅ Completo |
| `components/ImportPricesTab.tsx` | ✅ Completo |
| `components/import-prices/ImportActionControls.tsx` | ✅ Completo |
| `components/import-prices/ImportPreviewTable.tsx` | ✅ Completo |
| `components/product-pricing/ProductPricingTable.tsx` | ✅ Completo |
| `utils/price-helpers/columns.ts` | ✅ Completo |
| `shared/units/codigoPresentacion.ts` | ✅ Completo |
| `comprobantes-electronicos/shared/form-core/hooks/usePriceBook.ts` | ✅ Completo |
| `comprobantes-electronicos/punto-venta/hooks/usePosCartAndTotals.ts` | ✅ Completo |

---

## 3. Estado actual del Excel exportado

### 3.1 Columnas generadas

**Fuente:** `importProcessing.ts` → `buildExpectedHeaders`, `SKU_HEADER`, `UNIT_HEADER`, `VALIDITY_HEADER`  
**Función de exportación:** `ListaPrecios.tsx` → `exportVisiblePrices`

```
| SKU | UNIDAD | <nombre columna P1> | <nombre columna P2> | ... | VIGENCIA |
```

Ejemplo con columnas base y mínimo activadas:

```
| SKU      | UNIDAD | PRECIO BASE | PRECIO MÍNIMO | VIGENCIA   |
| I93K3VLB | KGM    | 10.00       | 8.00          | 31/12/2025 |
| I93K3VLB | SA     | 500.00      |               | 31/12/2025 |
| I93K3VLB | PK     | 300.00      |               | 31/12/2025 |
```

### 3.2 Inventario de columnas

| Columna | Presente | Formato | Editable por usuario |
|---|---|---|---|
| SKU | ✅ | string | No debe editarse |
| Nombre del producto | ❌ No incluida | — | — |
| UNIDAD | ✅ | código SUNAT simple (`KGM`, `SA`) | Técnicamente editable |
| Nombre de presentación | ❌ No incluida | — | — |
| Equivalencia | ❌ No incluida | — | — |
| Factor de conversión | ❌ No incluida | — | — |
| ID técnico de presentación | ❌ No incluida | — | — |
| Columnas de precio (P1-P12) | ✅ | número decimal | Sí — principal dato editable |
| VIGENCIA | ✅ | `dd/mm/aaaa` | Sí |
| Columnas de regla global | ❌ Excluidas | — | — |

### 3.3 Cómo se genera cada fila

**Fuente:** `ListaPrecios.tsx` líneas 130–173

```typescript
// Para cada producto del price book:
const unitCodes = collectUnitsWithPrices(product, allowedColumnIds);
// unitCodes = Object.keys(product.prices[columnId]) → códigos SUNAT simples

orderedUnits.forEach(unitCode => {
  row[UNIT_HEADER] = unitCode;            // ← código SUNAT crudo
  row[header] = price.value;              // ← precio
  row[VALIDITY_HEADER] = validityIso;     // ← vigencia del primer precio
});
```

**Orden de filas:** unidad base del catálogo primero → `activeUnitCode` → alfabético.

### 3.4 Qué precios se exportan

Solo precios de tipo `fixed` (`FixedPrice`). Las **matrices de volumen** (`VolumePrice`) **no se exportan**.

---

## 4. Problema con la columna UNIDAD

### 4.1 Qué contiene actualmente

La columna `UNIDAD` recibe literalmente la clave del mapa `product.prices[columnId]`, que es el **código SUNAT de la unidad** almacenado en el momento en que se guardó el precio.

**Fuente:** `importProcessing.ts` → `collectUnitsWithPrices` (líneas 405–414):

```typescript
export const collectUnitsWithPrices = (product: Product, allowedColumnIds: Set<string>): string[] => {
  const units = new Set<string>();
  Object.entries(product.prices || {}).forEach(([columnId, unitPrices]) => {
    if (!allowedColumnIds.has(columnId)) return;
    Object.keys(unitPrices || {}).forEach(code => units.add(code));
    //                                         ^^^^ clave interna = SUNAT code
  });
  return Array.from(units);
};
```

### 4.2 Cómo se almacena el precio en el UI

**Fuente:** `ProductPricingTable.tsx` (componente `UnitPricesPanel`):

```typescript
const sunatCode = option.code.includes('__') ? option.code.split('__')[0] : option.code;
// Cuando el usuario hace clic en editar precio:
beginInlineEdit(product, column, sunatCode)  // ← siempre SUNAT simple
```

**Fuente:** `usePriceProducts.ts` → `addOrUpdateProductPrice` (línea 253):

```typescript
const resolvedUnitCode = unitCode?.trim() || getBaseUnitForProduct(...);
// Precio almacenado en:
product.prices[canonicalColumnId][resolvedUnitCode] = newPrice;  // ← clave = SUNAT code
```

### 4.3 Implicación directa

Los **códigos compuestos** (`SA__pres-abc123`) se usan **únicamente en los selectores de UI** (POS, Comprobantes, Lista de Precios). En el almacenamiento de precios (`product.prices`) **solo existen códigos SUNAT simples** como claves. Por tanto:

- El Excel exportado muestra `SA`, `PK`, `BX` — no "SACO POR 50K", "PAQUETE DE 30K".
- Dos presentaciones con mismo código SUNAT (ej. "CAJA X 12" y "CAJA X 18" ambas `BX`) comparten **la misma clave** → sus precios se sobreescriben mutuamente.

### 4.4 Recomendación de nombre de columna

| Opción | Pros | Contras | Recomendación |
|---|---|---|---|
| `UNIDAD` | Familiar en contabilidad | Hace pensar en código SUNAT técnico | No recomendado |
| `PRESENTACIÓN` | Refleja lo que el usuario creó | Puede confundir en la unidad base | Recomendado con alias |
| `PRESENTACIÓN / UNIDAD` | Cubre ambos casos | Encabezado largo | Aceptable |
| `UNIDAD / PRESENTACIÓN DE VENTA` | Más preciso | Demasiado largo | No recomendado |

**Recomendación:** `PRESENTACIÓN` como nombre visible. La unidad base también se muestra bajo ese encabezado con su símbolo comercial (ej. `(KGM) Kilogramo`). Internamente la columna técnica (oculta) lleva la `PRICE_KEY`.

---

## 5. Modelo funcional esperado

### 5.1 Jerarquía de datos

```
Producto (SKU)
├── unidad base (code: KGM, name: Kilogramo)
└── unidadesMedidaAdicionales[]
    ├── id: "pres-abc123"
    │   nombre: "SACO POR 50K"
    │   unidadCodigo: "SA"
    │   factorConversion: 50
    └── id: "pres-def456"
        nombre: "PAQUETE DE 30K"
        unidadCodigo: "PK"
        factorConversion: 30
```

### 5.2 Clave de precio correcta por presentación

| Presentación | UI selector code | Clave en `product.prices` (hoy) | Debería ser |
|---|---|---|---|
| Unidad base | `KGM` | `KGM` | `KGM` |
| SACO POR 50K | `SA__pres-abc123` | `SA` | `SA__pres-abc123` o `SA` con deduplicación |
| PAQUETE DE 30K | `PK__pres-def456` | `PK` | `PK__pres-def456` o `PK` con deduplicación |
| CAJA X 12 | `BX__pres-g11` | `BX` | `BX__pres-g11` ← sin esto, colisión |
| CAJA X 18 | `BX__pres-g22` | `BX` | `BX__pres-g22` ← sobreescritura inevitable hoy |

---

## 6. Estructura recomendada del Excel

### 6.1 Columnas visibles para el usuario

| # | Nombre columna | Contenido | Editable |
|---|---|---|---|
| 1 | `SKU` | Código del producto | No (referencia) |
| 2 | `PRODUCTO` | Nombre del producto | No (referencia) |
| 3 | `PRESENTACIÓN` | Nombre presentación o símbolo unidad base | No (referencia) |
| 4 | `EQUIVALENCIA` | Ej: `1 SACO POR 50K = 50 Kilogramo` | No (informativo) |
| 5 | `PRECIO BASE` | Precio base numérico | **Sí** |
| 6 | `PRECIO MÍNIMO` | Precio mínimo numérico | **Sí** |
| 7..N | `<columnas adicionales>` | Precios adicionales configurados | **Sí** |
| N+1 | `VIGENCIA` | Fecha de vencimiento `dd/mm/aaaa` | **Sí** |

### 6.2 Columnas técnicas ocultas/protegidas

| Nombre columna | Contenido | Por qué es necesaria |
|---|---|---|
| `PRICE_KEY` | Clave técnica de precio (`SA__pres-abc123` o `KGM`) | Importación unívoca — no depende del texto visible |
| `TIPO_FILA` | `BASE` o `PRESENTACION` | Contexto rápido para validación |

> **Nota:** Los campos `PRODUCTO`, `PRESENTACIÓN` y `EQUIVALENCIA` son de solo lectura para el usuario. El campo `PRICE_KEY` puede ser visible pero de solo lectura, o estar en una columna oculta de la hoja.

---

## 7. Regla de filas por producto/presentación

### 7.1 Regla recomendada

```
1 fila = 1 unidad base  ó  1 presentación comercial
```

Un producto con unidad base `KGM` + 2 presentaciones debe generar **3 filas**:

```
| SKU      | PRODUCTO        | PRESENTACIÓN    | EQUIVALENCIA               | PRECIO BASE | VIGENCIA   | PRICE_KEY        |
| I93K3VLB | ARROZ PACASMAYO | (KGM) Kilogramo | Unidad base                | 10.00       | 31/12/2025 | KGM              |
| I93K3VLB | ARROZ PACASMAYO | SACO POR 50K    | 1 SACO POR 50K = 50 KGM    | 500.00      | 31/12/2025 | SA__pres-abc123  |
| I93K3VLB | ARROZ PACASMAYO | PAQUETE DE 30K  | 1 PAQUETE DE 30K = 30 KGM  | 300.00      | 31/12/2025 | PK__pres-def456  |
```

### 7.2 Regla actual (implementada)

```
1 fila = 1 código SUNAT distinto con precio guardado en product.prices
```

Genera correctamente múltiples filas, pero el discriminador es el código SUNAT —no la presentación— lo que falla en el caso de dos presentaciones con mismo código SUNAT.

---

## 8. Importación y mapeo de precios

### 8.1 Flujo actual paso a paso

**Fuente:** `importProcessing.ts` → `parseRawRows` + `usePriceProducts.ts` → `applyImportedFixedPrices`

```
1. Lee fila del Excel
2. Extrae SKU (String, toUpperCase)
3. Busca en catalogLookup y productLookup por SKU
4. Extrae UNIDAD (String, toUpperCase)
5. Valida con collectAllowedUnits():
   → base unit (catalogProduct.unidad)
   → unidadesMedidaAdicionales[].unidadCodigo   ← solo SUNAT simple
   → claves existentes en product.prices         ← solo SUNAT simple (o compound si ya existe)
6. resolvedUnitCode = UNIDAD || activeUnitCode || baseUnit
7. Aplica precio a product.prices[columnId][resolvedUnitCode]
```

### 8.2 Respuestas a los puntos auditados

| Pregunta | Respuesta |
|---|---|
| ¿Usa SKU + unidad? | Sí — `SKU + unitCode` (SUNAT code) |
| ¿Usa SKU + priceKey? | No — no existe columna PRICE_KEY |
| ¿Usa SKU + presentationId? | No |
| ¿Usa solo código SUNAT? | Sí — es el identificador principal |
| ¿Puede distinguir "CAJA X 12" de "CAJA X 18" si ambas son BX? | **No** — colisión inevitable |
| ¿Puede reimportar el mismo Excel que exporta sin fallar? | **Sí** — para el caso de un código SUNAT por presentación |
| ¿Qué pasa si el usuario cambia el texto de UNIDAD? | Falla — "La unidad XYZ no es válida" si no está en `collectAllowedUnits` |
| ¿Qué pasa si borra una fila? | Esa unidad/columna no se actualiza — silencioso |
| ¿Qué pasa si duplica una fila? | Error — `enforceDuplicateSafety` marca todas las instancias |
| ¿Qué pasa si cambia el SKU? | Error — "El SKU no existe en el catálogo" |
| ¿Qué pasa si cambia columnas técnicas? | No hay columnas técnicas — no aplica |
| ¿Validaciones existentes? | Ver sección 8.3 |
| ¿Mensajes de error? | Ver sección 8.3 |

### 8.3 Validaciones implementadas

| Validación | Nivel | Acción |
|---|---|---|
| SKU obligatorio | Error en parseo | Fila → `status = 'error'` |
| SKU no existe en catálogo ni price book | Error en parseo | Fila → `status = 'error'` |
| Unidad no válida para el SKU | Error en parseo | Fila → `status = 'error'` |
| Sin cambios detectados | Error en parseo | Fila → `status = 'error'` |
| Vigencia inválida (formato, pasado, `until <= from`) | Error en parseo | Fila → `status = 'error'` |
| Precio mínimo > precio base | Error en parseo | Fila → `status = 'error'` |
| SKU + unidad duplicado en el archivo | Error en parseo | Todas las instancias → `status = 'error'` |
| Unidad omitida con varias unidades disponibles | Warning | Fila → `status = 'ready'` + advertencia |
| Precio negativo | Filtrado silencioso | No se aplica |
| columnId inválido | Filtrado silencioso | No se aplica |
| Precio mínimo > base (segunda validación al aplicar) | Skipped | Fila no se aplica |
| Precio idéntico al existente | Skipped silencioso | No se actualiza |

---

## 9. Columnas técnicas visibles, ocultas o protegidas

### 9.1 Estado actual

**No existen columnas técnicas** en el Excel actual. El sistema depende exclusivamente de `SKU` + `UNIDAD` (SUNAT code) para identificar cada fila.

### 9.2 Columnas técnicas que deberían existir

#### `PRICE_KEY` (crítica)

**Justificación:**  
La clave de precio `PRICE_KEY` es el identificador unívoco para resolver el mapeo `precio → presentación específica`. Sin esta clave, el sistema no puede distinguir dos presentaciones con el mismo código SUNAT.

Formato: igual al código de opción del selector UI.

| Caso | `PRICE_KEY` | `UNIDAD` (SUNAT) |
|---|---|---|
| Unidad base KGM | `KGM` | `KGM` |
| SACO POR 50K (SA) | `SA__pres-abc123` | `SA` |
| CAJA X 12 (BX) | `BX__pres-g11` | `BX` |
| CAJA X 18 (BX) | `BX__pres-g22` | `BX` |

**Modo recomendado:** columna visible pero no editable (con fondo gris o protegida). Si el usuario la borra, el sistema hace fallback a `UNIDAD` (SUNAT). Si la modifica, se ignora el cambio.

#### `TIPO_FILA`

**Justificación:** Permite que el importador diferencie con un solo campo si la fila corresponde a la unidad base (`BASE`) o a una presentación (`PRESENTACION`).

**Modo recomendado:** columna oculta o visible pero no editable.

#### Columnas de referencia (informativas, no técnicas)

`PRODUCTO` y `EQUIVALENCIA` son columnas visibles y de solo lectura que ayudan al usuario a identificar contexto. No son necesarias para el mapeo, pero mejoran radicalmente la UX.

---

## 10. UX recomendada para el usuario

### 10.1 Columnas bloqueadas (no editables)

- `SKU`
- `PRODUCTO`
- `PRESENTACIÓN`
- `EQUIVALENCIA`
- `PRICE_KEY` (si se incluye visible)
- `TIPO_FILA` (si se incluye visible)

### 10.2 Columnas editables por el usuario

- Todos los valores de precio (`PRECIO BASE`, `PRECIO MÍNIMO`, etc.)
- `VIGENCIA`

### 10.3 Recomendaciones de estilo

| Elemento | Recomendación |
|---|---|
| Columnas de referencia (`SKU`, `PRODUCTO`, `PRESENTACIÓN`, `EQUIVALENCIA`) | Fondo gris claro (#F5F5F5), fuente normal |
| Columnas de precio | Fondo blanco, negrita en el encabezado |
| `VIGENCIA` | Fondo blanco, formato de fecha |
| `PRICE_KEY`, `TIPO_FILA` | Ocultas o fondo gris oscuro si visibles |
| Encabezados | Fila congelada (freeze row 1), negrita |
| Hoja de instrucciones | Hoja separada `INSTRUCCIONES` — No implementado actualmente |

### 10.4 Validaciones a añadir en el Excel (librerías xlsx no las soportan nativamente)

- Precio no puede ser negativo (validar en importación — ya implementado)
- Precio no puede ser texto (validar en importación — ya implementado con `parseNumberCell`)
- Fecha debe ser posterior a hoy (validar en importación — ya implementado)

---

## 11. Plantilla vs exportación de precios actuales

### 11.1 Estado actual de los dos flujos

| Flujo | Función | Contenido |
|---|---|---|
| Descargar plantilla | `ImportPricesTab.tsx` → `handleDownloadTemplate` | Solo encabezados, sin datos |
| Exportar precios actuales | `ListaPrecios.tsx` → `exportVisiblePrices` | Encabezados + precios existentes |

**Ambos comparten la misma estructura de encabezados**, generada por `buildExpectedHeaders(tableColumnConfigs)`.

### 11.2 Resultado

- **La plantilla es idéntica en estructura al archivo de exportación** — el usuario puede exportar → editar → reimportar el mismo archivo sin errores de estructura. ✅
- **Problema:** la plantilla no tiene datos de referencia (producto, presentación) — el usuario llena a ciegas. La exportación tiene datos pero en formato técnico incomprensible (SUNAT codes).

### 11.3 Recomendación

Ambos flujos deben adoptar la misma estructura mejorada:
1. Plantilla: encabezados + filas de referencia pre-llenadas con SKU, PRODUCTO, PRESENTACIÓN, EQUIVALENCIA, PRICE_KEY — precio vacío, vigencia vacía.
2. Exportación: misma estructura + precios actuales.

---

## 12. Riesgos detectados

| # | Riesgo | Severidad | Descripción | Archivo |
|---|---|---|---|---|
| R1 | **Dos presentaciones con mismo SUNAT → precio sobreescrito** | 🔴 Alto | Si "CAJA X 12" y "CAJA X 18" usan `BX`, sus precios se almacenan en `prices[col]["BX"]` — el segundo sobreescribe al primero. No hay forma de asignar precios independientes. | `usePriceProducts.ts`, `ProductPricingTable.tsx` |
| R2 | **UNIDAD en Excel = código SUNAT técnico** | 🔴 Alto | El usuario ve `SA`, `BX`, `KGM` en lugar de "SACO POR 50K", "CAJA X 12". Alto riesgo de confusión y error manual. | `importProcessing.ts:19`, `ListaPrecios.tsx:152` |
| R3 | **Sin nombre de producto en exportación** | 🟠 Medio | El usuario no puede identificar fácilmente a qué producto corresponde cada fila sin el nombre, solo por SKU. | `ListaPrecios.tsx:150-153` |
| R4 | **Importación falla silenciosamente para columnas inexistentes** | 🟠 Medio | Si el `columnId` no existe en `validColumnIds`, el precio se filtra sin advertencia al usuario. | `usePriceProducts.ts:525-530` |
| R5 | **Precios de volumen no se exportan** | 🟠 Medio | Solo se exportan precios `fixed`. Precios con matriz de volumen se pierden en el ciclo exportar→reimportar. | `ListaPrecios.tsx:159` |
| R6 | **Presentación eliminada en producto pero presente en Excel** | 🟠 Medio | Si el usuario elimina una presentación del catálogo, su código SUNAT puede seguir en `collectAllowedUnits` vía las claves existentes en `product.prices`. El precio se importa a la misma clave SUNAT aunque la presentación ya no exista. | `importProcessing.ts:170-178` |
| R7 | **Sin columna técnica `PRICE_KEY`** | 🔴 Alto | Sin esta clave, el sistema no puede resolver unívocamente el destino de un precio cuando hay dos presentaciones con el mismo código SUNAT. | Ausente |
| R8 | **Usuario puede editar UNIDAD en Excel** | 🟠 Medio | La columna `UNIDAD` no está protegida. Si el usuario cambia `SA` por `KGM`, el precio se importa a la unidad base en lugar de la presentación. | `importProcessing.ts:284-295` |
| R9 | **Idempotencia parcial** | 🟡 Bajo | Exportar y reimportar el mismo Excel funciona solo si no hay colisión de SUNAT codes entre presentaciones. En el caso simple es idempotente. | `importProcessing.ts`, `usePriceProducts.ts` |
| R10 | **Vigencia única por fila** | 🟡 Bajo | La exportación toma la vigencia del primer precio encontrado en la fila. Si las columnas tienen fechas distintas, se pierde esa diferencia. | `ListaPrecios.tsx:161-163` |

---

## 13. Recomendación de corrección por fases

### Fase 1 — MVP seguro (corrección mínima funcional)

**Objetivo:** hacer el Excel legible y seguro sin cambiar el modelo de datos subyacente.

**Cambios en exportación (`importProcessing.ts`, `ListaPrecios.tsx`):**

1. Agregar columna `PRODUCTO` (nombre del producto del catálogo).
2. Agregar columna `PRESENTACIÓN` (nombre de presentación o símbolo de unidad base).
3. Agregar columna `EQUIVALENCIA` (texto informativo: `1 SACO POR 50K = 50 KGM`).
4. Agregar columna técnica `PRICE_KEY` — valor = código de opción del selector UI (`SA__pres-abc123` o `KGM`).
5. Mantener columna `UNIDAD` (SUNAT code) pero renombrarla internamente o dejarla oculta como referencia.

**Cambios en importación (`importProcessing.ts`, `usePriceProducts.ts`):**

6. Si la fila tiene `PRICE_KEY` válida → usarla como `resolvedUnitCode` para el almacenamiento.
7. Si `PRICE_KEY` ausente o inválida → fallback al comportamiento actual con `UNIDAD` (SUNAT).
8. Actualizar `collectAllowedUnits` para incluir también códigos compuestos de presentaciones.
9. Actualizar `buildExpectedHeaders` para incluir las nuevas columnas fijas.

**Sin cambios en:**
- POS, Comprobantes, Stock/Kardex, Configuración de Unidades
- Modelo de datos `Product.prices` (seguirá siendo `Record<columnId, Record<unitCode, Price>>` — el `unitCode` ahora podrá ser compound)
- Lógica de selección y resolución de precios en `usePriceBook`

**Resultado esperado del Excel (Fase 1):**

```
| SKU | PRODUCTO | PRESENTACIÓN | EQUIVALENCIA | PRECIO BASE | PRECIO MÍNIMO | VIGENCIA | PRICE_KEY |
| I93K3VLB | ARROZ PACASMAYO | (KGM) Kilogramo | Unidad base | 10.00 | 8.00 | 31/12/2025 | KGM |
| I93K3VLB | ARROZ PACASMAYO | SACO POR 50K | 1 SACO POR 50K = 50 Kilogramo | 500.00 | | 31/12/2025 | SA__pres-abc123 |
| I93K3VLB | ARROZ PACASMAYO | PAQUETE DE 30K | 1 PAQUETE DE 30K = 30 Kilogramo | 300.00 | | 31/12/2025 | PK__pres-def456 |
```

---

### Fase 2 — UX avanzada

**Objetivo:** proteger el Excel y mejorar la experiencia de edición.

1. **Columnas de referencia bloqueadas:** usar estilos y validación de XLSX para marcar como protegidas `SKU`, `PRODUCTO`, `PRESENTACIÓN`, `EQUIVALENCIA`, `PRICE_KEY`.
2. **Validación numérica de precios:** advertir si una celda de precio contiene texto.
3. **Hoja de instrucciones:** segunda hoja `INSTRUCCIONES` con guía paso a paso.
4. **Errores de importación más precisos:** mostrar qué campo exactamente causó el error (columna, fila, valor recibido).
5. **Compatibilidad con datos de migración:** si `PRICE_KEY` no existe en el archivo (importaciones antiguas), usar `UNIDAD` como fallback y emitir advertencia.

---

### Fase 3 — Integración futura

1. Exportar también precios de volumen en una hoja separada (`PRECIOS_VOLUMEN`).
2. Historial de cambios de precios (auditoría).
3. Integración con Stock/Kardex al cambiar precios masivamente.
4. Validación en importación contra stock mínimo / políticas de descuento máximo.

---

## 14. Conclusión

El flujo actual de exportación/importación masiva de precios es **técnicamente funcional para el caso simple** (una sola presentación por código SUNAT), pero tiene **tres problemas estructurales** que se vuelven bloqueantes en la práctica:

1. **El usuario ve códigos SUNAT técnicos** en lugar de nombres comerciales — UX inaceptable.
2. **Dos presentaciones con mismo código SUNAT no pueden tener precios independientes** — limitación funcional crítica.
3. **Sin `PRICE_KEY` técnica oculta**, el sistema no puede garantizar que una reimportación aplique el precio a la presentación correcta.

La corrección de Fase 1 es quirúrgica: agrega columnas al export/import sin tocar POS, Comprobantes, modelos de catálogo ni lógica de inventario. El único cambio de comportamiento es que `product.prices[columnId]` podrá usar códigos compuestos como clave cuando se importe con `PRICE_KEY`, habilitando la distinción de presentaciones con mismo código SUNAT.

---

*Auditoría realizada en modo solo lectura. No se modificó ningún archivo de código fuente.*
