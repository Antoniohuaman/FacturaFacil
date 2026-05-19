# Auditoría de presentaciones comerciales y conversiones — SenciYo

**Fecha:** 2026-05-18  
**Auditor:** Agente de auditoría Claude  
**Estado:** Solo lectura — sin modificaciones al código funcional  

---

## 1. Resumen ejecutivo

SenciYo implementa un sistema de unidades de medida y presentaciones comerciales con un nivel de madurez **medio-alto**. El concepto de "unidad mínima + presentaciones con `factorConversion`" está correctamente modelado en el catálogo y correctamente consumido en stock, POS y comprobantes. Sin embargo, se identifican los siguientes riesgos clave:

1. **La dirección de conversión del campo "Contiene"** es semánticamente correcta (`1 presentación = N unidades mínimas`) pero no es validada ni documentada con suficiente énfasis en la UI para evitar errores de usuario novato.
2. **Lista de Precios usa `factorConversion` de dos formas distintas**: como etiqueta visual de conversión en la tabla, y como multiplicador de precio base cuando no hay precio explícito para la presentación. Esta dualidad crea riesgo de precios incorrectos si el factor está mal configurado.
3. **El control de stock sí convierte a unidad mínima antes de descontar**, pero esa conversión depende 100% de que `factorConversion` sea correcto en el catálogo.
4. **El formulario de producto inicializa `factorConversion` en 1** al agregar una nueva presentación, lo que puede llevar a presentaciones con factor incorrecto si el usuario no lo cambia.
5. **No existe validación de rango máximo** para `factorConversion` (solo se valida que sea > 0).
6. **La unidad enviada al comprobante XML/PDF es la unidad del ítem de carrito**, que puede ser la presentación comercial. Esto es correcto normativamente en Perú (SUNAT permite ambas) pero no hay conversión automática a unidad mínima para el documento.
7. **npm run lint:senciyo** — El comando `npm run lint` ejecutado en `apps/senciyo` terminó sin errores ni advertencias (salida vacía), lo que indica que el código pasa las reglas ESLint configuradas.

**Nivel de riesgo general: MEDIO** — El sistema funciona correctamente en el flujo normal, pero hay escenarios de error de configuración de usuario que pueden producir precios o descuentos de stock incorrectos de manera silenciosa.

---

## 2. Alcance revisado

| Archivo | Ruta relativa | Propósito |
|---------|--------------|-----------|
| `types.ts` | `apps/senciyo/src/pages/Private/features/catalogo-articulos/models/types.ts` | Modelo `Product`, `AdditionalUnitMeasure`, `ProductFormData` |
| `useProductForm.ts` | `apps/senciyo/src/pages/Private/features/catalogo-articulos/hooks/useProductForm.ts` | Lógica del formulario de producto |
| `ProductUnitsSection.tsx` | `apps/senciyo/src/pages/Private/features/catalogo-articulos/components/product-modal/ProductUnitsSection.tsx` | UI de unidad mínima y familia |
| `ProductAdditionalUnitsTable.tsx` | `apps/senciyo/src/pages/Private/features/catalogo-articulos/components/product-modal/ProductAdditionalUnitsTable.tsx` | UI de tabla de presentaciones comerciales |
| `index.ts` (modelos config) | `apps/senciyo/src/pages/Private/features/configuracion-sistema/modelos/index.ts` | Modelo `Unit`, catálogo SUNAT |
| `PriceTypes.ts` | `apps/senciyo/src/pages/Private/features/lista-precios/models/PriceTypes.ts` | Modelo `ProductUnitOption`, `Column`, `Product` |
| `ProductPricing.tsx` | `apps/senciyo/src/pages/Private/features/lista-precios/components/ProductPricing.tsx` | Constructor de `getUnitOptions` con factor |
| `ProductPricingTable.tsx` | `apps/senciyo/src/pages/Private/features/lista-precios/components/product-pricing/ProductPricingTable.tsx` | Renderizado visual del factor en tabla |
| `usePriceProducts.ts` | `apps/senciyo/src/pages/Private/features/lista-precios/hooks/usePriceProducts.ts` | Hook de gestión de precios por unidad |
| `priceHelpers.ts` (barrel) | `apps/senciyo/src/pages/Private/features/lista-precios/utils/priceHelpers.ts` | Re-exporta helpers de precios |
| `effectivePrices.ts` | `apps/senciyo/src/pages/Private/features/lista-precios/utils/price-helpers/effectivePrices.ts` | `buildEffectivePriceMatrix`, `collectUnitMetas` |
| `pricing.ts` | `apps/senciyo/src/pages/Private/features/lista-precios/utils/price-helpers/pricing.ts` | `calculatePrice`, `roundCurrency` |
| `types.ts` (product-pricing) | `apps/senciyo/src/pages/Private/features/lista-precios/components/product-pricing/types.ts` | `UnitOption = ProductUnitOption` |
| `useCart.tsx` | `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/punto-venta/hooks/useCart.tsx` | Carrito POS, validación de stock |
| `ProductGrid.tsx` | `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/punto-venta/components/ProductGrid.tsx` | Grid de productos POS, `buildProductForSale` |
| `ProductsSection.tsx` | `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/shared/form-core/components/ProductsSection.tsx` | Tabla de ítems en emisión tradicional |
| `usePriceBook.ts` | `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/shared/form-core/hooks/usePriceBook.ts` | `getUnitPriceWithFallback`, `getUnitFactorFromCatalog` |
| `useComprobanteActions.tsx` | `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/hooks/useComprobanteActions.tsx` | Descuento de stock post-venta |
| `unitConversion.ts` | `apps/senciyo/src/shared/inventory/unitConversion.ts` | `convertToUnidadMinima`, `getFactorToUnidadMinima` |
| `stockGateway.ts` | `apps/senciyo/src/shared/inventory/stockGateway.ts` | `calculateRequiredUnidadMinima`, `allocateSaleAcrossalmacenes` |
| `accionesStock.ts` | `apps/senciyo/src/shared/inventory/accionesStock.ts` | `registrarAjusteDeStock` |
| `comprobante.types.ts` | `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/models/comprobante.types.ts` | `CartItem`, `Product` del comprobante |
| `usePosComprobanteFlow.ts` | `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/punto-venta/hooks/usePosComprobanteFlow.ts` | Flujo completo de venta POS |

---

## 3. Concepto funcional esperado

En un ERP correctamente diseñado para Perú:

1. **Unidad mínima**: La unidad más pequeña en que se mide/vende el producto y en que se lleva el stock. Ejemplo: `NIU` (Unidad).
2. **Presentaciones comerciales**: Agrupaciones de unidades mínimas para venta mayorista o por empaque. Ejemplo: `BX` (Caja) que contiene 12 unidades.
3. **Factor de conversión**: `factorConversion = N` significa "1 presentación = N unidades mínimas". Dirección: presentación → unidad mínima.
4. **Stock**: Se gestiona siempre en unidad mínima. Al vender 1 caja, se descuentan 12 unidades del stock.
5. **Precios**: Pueden definirse por unidad mínima (precio/unidad) o por presentación (precio/caja). Si no hay precio explícito para la presentación, se puede calcular como `precio_base × factor`.
6. **Documento fiscal**: La unidad de medida enviada al XML puede ser la presentación o la unidad mínima, según lo que se vendió.

---

## 4. Unidad mínima

### 4.1 Definición en el modelo

`Product.unidad` (tipo `string`, código SUNAT como `NIU`, `KGM`, etc.) — Archivo: `types.ts:14`.  
Campos complementarios: `unitSymbol?: string` y `unitName?: string` — `types.ts:15-16`.  
Estos son snapshots del símbolo y nombre al momento de guardar el producto.

### 4.2 Uso real en el sistema

- **Stock**: `stockGateway.ts:25` — `resolveUnidadMinima(product)` retorna `product.unidad`. Todo el inventario está en esta unidad.
- **Conversión**: `unitConversion.ts:36-50` — `getFactorToUnidadMinima()` devuelve `1` cuando la unidad solicitada coincide con `product.unidad`.
- **POS**: `useCart.tsx:224-230` — `calculateRequiredUnidadMinima()` convierte la cantidad del ítem a unidad mínima para validar stock.
- **Comprobantes**: `useComprobanteActions.tsx:523-528` — Mismo cálculo para descontar stock post-venta.

### 4.3 Campos en el modelo Product

```typescript
// types.ts:14-16
unidad: string;             // Código SUNAT (ej: 'NIU', 'KGM', 'BX')
unitSymbol?: string;        // Snapshot del símbolo
unitName?: string;          // Snapshot del nombre
```

### 4.4 Posibilidad de cambio post-creación

Sí. El formulario `useProductForm.ts` permite editar un producto existente (`initializeFormFromProduct`, línea 554). Al cambiar la unidad base:
- Se eliminan presentaciones que coincidan con la nueva unidad mínima (`handleBaseUnitChange:387-398`).
- Se emite un mensaje informativo al usuario (`setUnitInfoMessage`).
- No hay validación que impida el cambio si ya existen precios o movimientos de stock.

### 4.5 Riesgos

- **Alto**: Cambiar la unidad mínima de un producto con stock existente no migra el stock a la nueva unidad. El stock quedará en la unidad anterior (que era el contexto de los números almacenados).
- **Medio**: Cambiar la unidad mínima invalida silenciosamente los factores de conversión de presentaciones existentes si las mismas se eliminan por incompatibilidad de familia.
- **Bajo**: No hay campo `precio` en `ProductFormData`; el precio base se gestiona en Lista de Precios, por lo que no hay riesgo de precio inconsistente al cambiar la unidad base desde el catálogo.

---

## 5. Presentaciones comerciales

### 5.1 Modelo AdditionalUnitMeasure

```typescript
// types.ts:3-8
export interface AdditionalUnitMeasure {
  unidadCodigo: string;      // Código SUNAT de la presentación (ej: 'BX')
  factorConversion: number;  // Cuántas unidades mínimas contiene 1 presentación
  unidadSymbol?: string;     // Snapshot del símbolo
  unidadName?: string;       // Snapshot del nombre
}
```

Almacenada en `Product.unidadesMedidaAdicionales?: AdditionalUnitMeasure[]` — `types.ts:22`.

### 5.2 Flujo de creación

1. Usuario selecciona **familia de unidades** (chip en `ProductUnitFamilyField`).
2. Usuario selecciona **unidad mínima** de esa familia.
3. Usuario pulsa "Agregar presentación" — `addAdditionalUnit` (`useProductForm.ts:417-434`).
4. El sistema auto-selecciona la primera unidad disponible de la familia que no sea la unidad base.
5. **`factorConversion` se inicializa en `1`** (línea 427) — riesgo de omisión.
6. Usuario ingresa el valor de "Contiene" (campo numérico min 0.0001, step 0.0001).
7. Se muestra la preview: `1 [presentación] = [factor] [unidadMínima]` (línea 97).

### 5.3 Validaciones existentes

En `useProductForm.ts:722-743`:
- `unit.unidadCodigo === formData.unidad` → error "No puede coincidir con la unidad base".
- `seenUnits.has(unit.unidadCodigo)` → error "Unidad repetida".
- Unidad de otra familia si no se usa fallback → error "No coincide con la familia seleccionada".
- `!unit.factorConversion || unit.factorConversion <= 0` → error "El campo 'Contiene' debe ser mayor a 0".
- **Ausencia de validación de máximo**: no hay límite superior al factor.
- **Ausencia de validación de que sea entero para unidades de conteo**: se permiten decimales.
- El input HTML tiene `min="0.0001"` y `step="0.0001"` pero no `max`.

### 5.4 Posibilidad de edición/eliminación

- **Editar**: Sí, mediante `updateAdditionalUnit()` que modifica `factorConversion` o `unidadCodigo` en el array.
- **Eliminar**: Sí, mediante `removeAdditionalUnit(index)`.
- **Sin historial**: No hay registro de cambios históricos. Cambiar un factor ya usado en ventas puede generar inconsistencias retroactivas.

---

## 6. Campo "Contiene" y dirección de conversión

### 6.1 Nombre del campo en código

- Nombre funcional en UI: **"Contiene"** (label en `ProductAdditionalUnitsTable.tsx:124`).
- Nombre en modelo: **`factorConversion`** (`AdditionalUnitMeasure.factorConversion`).
- Tooltip: "Cantidad de unidades mínimas que incluye esta presentación." (`ProductAdditionalUnitsTable.tsx:125`).

### 6.2 Dirección de la conversión

**La dirección es: `1 PRESENTACIÓN = factorConversion × UNIDADES_MÍNIMAS`**

Confirmado en múltiples lugares:
- `ProductAdditionalUnitsTable.tsx:97`: `1 ${selectedUnitLabel} = ${formatFactorValue(unit.factorConversion)} ${baseUnitLabel}`
- `unitConversion.ts:58-65`: `convertToUnidadMinima = quantity × factorConversion`
- `stockGateway.ts:408-413`: `calculateRequiredUnidadMinima → convertToUnidadMinima`
- `usePriceBook.ts:222-231`: `price = baseUnitPrice × factor` (precio de presentación = precio unitario × factor)

### 6.3 Interpretación actual

```
Ejemplo: Producto "Gaseosa 250ml"
  unidad = NIU (Unidad mínima)
  presentación: BX (Caja) con factorConversion = 24

Interpretación: 1 Caja = 24 Unidades
  - Al vender 1 caja → se descuentan 24 unidades del stock
  - Si precio base (NIU) = S/ 2.50 y no hay precio explícito para BX:
    precio_BX = 2.50 × 24 = S/ 60.00
```

### 6.4 Análisis de UX del campo

**Fortalezas:**
- El tooltip explica el concepto ("Cantidad de unidades mínimas que incluye esta presentación").
- Se muestra la preview en tiempo real: `1 Caja = 24 Unidad`.
- El sufijo del input muestra la unidad mínima como referencia (ej: `24 NIU` → se renderiza `24 Unidad`).
- El botón de ayuda con icono `HelpCircle` es accesible (`aria-label`).

**Debilidades:**
- **El valor inicial es 1**: Si el usuario agrega la presentación y no modifica el factor, queda `factorConversion=1`, lo que equivale a "Caja = 1 Unidad". No hay advertencia visible.
- **No hay ejemplo inline**: El tooltip describe el concepto pero no muestra un ejemplo numérico concreto (ej: "Si una caja tiene 12 unidades, ingresa 12").
- **El placeholder es "0"**: Confuso — sugiere que 0 es válido, pero la validación lo rechaza.
- **No hay advertencia cuando factor = 1**: El caso más común de error (olvidar cambiar el valor) no genera ningún aviso visual antes de guardar.
- **El label "Contiene" es ambiguo**: Sin el tooltip, el usuario podría pensar que es el contenido en gramos, ml, etc.

### 6.5 Ejemplo concreto con valores reales

| Campo | Valor | Significado |
|-------|-------|-------------|
| `unidad` | `NIU` | Unidad mínima = 1 Unidad |
| `unidadCodigo` (adicional) | `BX` | Presentación = Caja |
| `factorConversion` | `24` | 1 Caja = 24 Unidades |
| Stock disponible | `120 NIU` | 120 unidades en stock |
| Venta: 3 cajas | `3 × 24 = 72 NIU` | Se descuentan 72 unidades |
| Stock resultante | `48 NIU` | 48 unidades |

---

## 7. Consistencia matemática

### 7.1 Validaciones de rango del factor

| Condición | Validación | Lugar |
|-----------|------------|-------|
| `factor <= 0` | Bloqueado con mensaje de error | `useProductForm.ts:741-742` |
| `factor > 0` y `factor < 0.0001` | Permitido por lógica (input `min="0.0001"` solo es HTML5, eludible) | `ProductAdditionalUnitsTable.tsx:138` |
| `factor = 1` | Permitido sin advertencia | Riesgo de configuración incorrecta |
| `factor = Infinity` | Técnicamente permitido (HTML no limita) | No hay `max` en input |
| `factor = NaN` | El guard `unitConversion.ts:48-49`: `isPositive(factor) ? factor : 1` lo neutraliza | `unitConversion.ts:49` |

### 7.2 Casos extremos

- **Factor 0**: Rechazado en validación de formulario. En `getFactorToUnidadMinima` hay guard adicional: si factor no es positivo, retorna `1` — `unitConversion.ts:49`.
- **Factor negativo**: Rechazado en validación de formulario (condición `<= 0`).
- **Factor decimal (ej: 0.5)**: Permitido. Semánticamente correcto para sub-unidades (ej: 1/2 kg). Para unidades de conteo (NIU→BX) un decimal no tiene sentido físico pero el sistema no lo impide.
- **Factor muy grande (ej: 10000)**: Permitido. Podría causar precios calculados incorrectos si se usa el multiplicador en `usePriceBook`.

### 7.3 Riesgo de inversión de conversión

**No se encontró inversión de la dirección en el código revisado.** La fórmula es consistente en todos los módulos:

```
quantity_en_unidad_mínima = quantity_en_presentación × factorConversion
```

Todos los módulos que consumen el factor (POS, comprobantes, lista de precios) usan la misma dirección.

---

## 8. Relación con Lista de Precios

### 8.1 Cómo Lista de Precios consume presentaciones

1. `ProductPricing.tsx:116-146` — `getUnitOptions()` construye la lista de opciones de unidad para el selector. Incluye la unidad base (`isBase: true`) y todas las `unidadesMedidaAdicionales` con su `factorConversion`.
2. Cada entrada en `prices` del producto `PriceTypes.ts:64` es un `Record<string, ProductUnitPrices>` donde la clave del segundo nivel es el `unitCode`. Es decir, los precios están indexados por código de unidad.
3. Tanto la unidad mínima como cada presentación puede tener su propio precio explícito.

### 8.2 Campo factor en UnitOption

```typescript
// PriceTypes.ts:54-59
export interface ProductUnitOption {
  code: string;
  label: string;
  isBase: boolean;
  factor?: number;   // ← factorConversion de AdditionalUnitMeasure
}
```

El campo `factor` es poblado en `ProductPricing.tsx:134`:
```typescript
catalogProduct.unidadesMedidaAdicionales?.forEach(
  unit => addOption(unit.unidadCodigo, false, unit.factorConversion)
);
```

### 8.3 El factor afecta precio o solo informa

**El factor tiene DOS usos en Lista de Precios:**

**Uso 1 — Visual/informativo** (en `ProductPricingTable.tsx:377-380` y línea 741-743):
```jsx
{option.factor && (
  <div className="text-[11px] text-gray-500 mt-0.5">
    1 {option.code} = {option.factor} {baseUnitLabel}
  </div>
)}
```
Aquí el factor solo muestra la conversión al usuario.

**Uso 2 — Cálculo de precio** (en `usePriceBook.ts:220-231`):
```typescript
const baseUnitPriceValue = resolvePriceValue(columnPrices[baseUnitCode]);
const factor = getUnitFactorFromCatalog(catalogProduct, normalizedSelectedUnit);

if (typeof baseUnitPriceValue === 'number' && typeof factor === 'number') {
  return {
    price: roundCurrency(baseUnitPriceValue * factor),
    hasPrice: true,
    hasExplicitPrice: false,   // ← indica que es precio calculado, no explícito
    ...
  };
}
```

**Esto significa**: Si no existe precio explícito para una presentación (ej: Caja/BX), el sistema calcula `precio_presentación = precio_NIU × factorConversion`. Esto es un **fallback de cálculo automático**.

**Consecuencia crítica**: Si el usuario configura mal el factor (ej: Caja con factor=1 por olvido), el precio calculado de la caja será igual al precio unitario, vendiendo la caja al precio de una sola unidad.

### 8.4 Estado de la conexión

**Activa y funcional.** La conexión catálogo → lista de precios para presentaciones está implementada correctamente. El factor se usa tanto para display como para calcular precio de fallback.

---

## 9. Relación con Control de Stock

### 9.1 Existe módulo de stock

Sí. Los archivos `stockGateway.ts`, `unitConversion.ts` y `accionesStock.ts` implementan la capa de inventario. Existe también un módulo `gestion-inventario` con `InventoryService` y `AdjustmentModal`.

### 9.2 Hay conversión al descontar stock

**Sí, confirmado.** La cadena es:

1. `useComprobanteActions.tsx:522-528`:
```typescript
const quantityInUnidadMinima = catalogProduct
  ? calculateRequiredUnidadMinima({
      product: catalogProduct,
      quantity: item.quantity,
      unitCode: item.unidadMedida || item.unit,  // ← puede ser código de presentación
    })
  : item.quantity;
```

2. `stockGateway.ts:402-414`:
```typescript
export const calculateRequiredUnidadMinima = (options) => {
  return convertToUnidadMinima({
    product: options.product,
    quantity: options.quantity,
    unitCode: options.unitCode,
  });
};
```

3. `unitConversion.ts:58-65`:
```typescript
export const convertToUnidadMinima = (input) => {
  const factor = getFactorToUnidadMinima(input.product, input.unitCode);
  return quantity * factor;  // ← multiplicación directa
};
```

El mismo mecanismo se aplica en `useCart.tsx:224-230` para validar stock antes de agregar al carrito.

### 9.3 Estado de la conexión

**Activa y correctamente implementada.** El flujo es: `venta por presentación → conversión a unidad mínima → descuento de stock en unidad mínima`. La conversión usa el `factorConversion` del catálogo como única fuente de verdad.

---

## 10. Relación con Punto de Venta

### 10.1 Selector de unidad en POS

En `ProductGrid.tsx:197-284`, el componente mantiene estado `unitSelections: Record<string, string>` (sku → unitCode). Al cargar, se inicializa con `getPreferredUnitForSku` (`usePriceBook.ts:308-322`) que prioriza la unidad base.

El usuario puede cambiar la unidad desde el grid, y el precio se recalcula automáticamente en `resolveProductPrice` → `getPriceForProduct(sku, unitCode, selectedPriceListId)`.

### 10.2 Cálculo de precio por unidad

`ProductGrid.tsx:311-318`:
```typescript
const resolveProductPrice = useCallback((product: Product, unitCode?: string) => {
  const sku = resolveSku(product);
  const computed = getPriceForProduct(sku, unitCode, selectedPriceListId);
  if (typeof computed === 'number') return computed;
  return Number.isFinite(product.price) ? product.price : 0;
}, [...]);
```

`getPriceForProduct` llama a `getUnitPriceWithFallback` en `usePriceBook`, que:
1. Busca precio explícito para `unitCode`.
2. Si no existe, calcula `precio_base × factor`.

### 10.3 Conversión a unidad mínima para stock

Al confirmar la venta en POS, `useComprobanteActions.tsx` convierte a unidad mínima antes de descontar. El `CartItem` guarda `unidadMedida` con el código de la presentación seleccionada, y la conversión ocurre en el momento del descuento de stock.

**El carrito NO guarda la cantidad en unidad mínima**. Guarda la cantidad en la unidad seleccionada (que puede ser una presentación). La conversión es siempre en el momento de registro.

### 10.4 Estado de la conexión

**Activa y funcional.** Flujo completo: selección de unidad en grid → precio de la unidad → ítem en carrito con unitCode de presentación → conversión a unidad mínima en descuento de stock.

---

## 11. Relación con Comprobantes

### 11.1 Selector de unidad en emisión

En `ProductsSection.tsx:34-64`, `buildCatalogUnitOptions()` construye las opciones de unidad para cada ítem del comprobante:
```typescript
// Agrega la unidad base
options.push({ code: product.unidad, isBase: true });
// Agrega las presentaciones
product.unidadesMedidaAdicionales?.forEach(u => {
  if (!u?.unidadCodigo) return;
  options.push({ code: u.unidadCodigo });
});
```

El usuario puede seleccionar qué unidad usar por ítem.

### 11.2 Unidad enviada al documento

La unidad enviada al XML/comprobante es la unidad del `CartItem.unidadMedida` o `CartItem.unidadMedidaCodigo`. **No hay conversión automática a unidad mínima para el documento fiscal.** Si el usuario vende "3 Cajas", el documento dirá "3 BX" (código de Caja).

Esto es **normativamente correcto** en Perú: la SUNAT acepta documentos con la unidad comercial de venta, no necesariamente la unidad mínima. La conversión a unidad mínima solo ocurre para el control de stock interno.

### 11.3 Estado de la conexión

**Activa y correctamente diseñada.** El comprobante muestra la unidad real de venta (presentación o mínima), mientras el stock se ajusta en unidad mínima internamente.

---

## 12. UX/UI actual

### 12.1 Labels y textos del formulario

| Elemento | Texto actual | Archivo:Línea |
|----------|-------------|---------------|
| Label sección | "Familia de unidades" | `ProductUnitsSection.tsx:62` |
| Tooltip familia | "Selecciona la familia para habilitar conversiones (presentaciones)." | `ProductUnitsSection.tsx:63` |
| Label unidad mínima | "Unidad mínima *" (asterisco de obligatorio) | `ProductUnitsSection.tsx:132` |
| Tooltip unidad mínima | "Unidad base para stock y ventas (ej.: Unidad, Kg)." | `ProductUnitsSection.tsx:134` |
| Sección presentaciones | "Presentaciones comerciales" | `ProductAdditionalUnitsTable.tsx:47` |
| Tooltip presentaciones | "Crea equivalencias: caja = 12 unidades, pack = 6, etc." | `ProductAdditionalUnitsTable.tsx:48` |
| Label campo factor | "Contiene" | `ProductAdditionalUnitsTable.tsx:124` |
| Tooltip campo factor | "Cantidad de unidades mínimas que incluye esta presentación." | `ProductAdditionalUnitsTable.tsx:125` |
| Placeholder campo factor | "0" | `ProductAdditionalUnitsTable.tsx:146` |
| Preview conversión | "1 [presentación] = [factor] [unidadMínima]" | `ProductAdditionalUnitsTable.tsx:97` |

### 12.2 Claridad del campo "Contiene"

El campo "Contiene" con su tooltip es **moderadamente claro** para usuarios técnicos, pero **insuficiente** para usuarios novatos. El tooltip especifica "Cantidad de unidades mínimas que incluye esta presentación", lo cual es correcto, pero:

- No da un ejemplo numérico inline.
- El placeholder "0" es contradictorio (0 no es válido).
- No hay advertencia visible cuando el valor es 1 (caso común de omisión).

### 12.3 Ayudas y ejemplos inline

- **Tooltip en "Presentaciones comerciales"**: incluye ejemplo "caja = 12 unidades, pack = 6, etc." — buena práctica.
- **Preview de conversión**: texto dinámico `1 Caja = 24 Unidad` — excelente para verificación visual.
- **Mensaje de advertencia al cambiar familia**: "Se limpiaron presentaciones que no son compatibles..." — informativo.
- **Mensaje sin unidades**: "Configura tus unidades de medida en Configuración de Negocio." — útil.

### 12.4 Problemas de UX identificados

| Problema | Severidad | Descripción |
|----------|-----------|-------------|
| Factor inicializa en 1 sin advertencia | Alto | El usuario puede guardar "1 Caja = 1 Unidad" sin darse cuenta |
| Placeholder "0" en campo "Contiene" | Medio | Sugiere que 0 es aceptable, pero está bloqueado |
| Sin validación de rango máximo | Medio | Factores absurdos (ej: 99999) son aceptados |
| Sin aviso de que factor=1 es sospechoso para presentaciones de bulto | Medio | Solo aplica a PACKAGING y QUANTITY |
| El preview usa el código si no hay label | Bajo | Si la unidad no tiene label, muestra código crudo |
| No hay feedback visual del precio calculado por presentación | Bajo | No se muestra en el catálogo cuánto valdría la presentación |

---

## 13. Alternativas de diseño

### Opción A — Mantener modelo actual con mejoras menores (RECOMENDADA para MVP)
Mantener el campo `factorConversion` con la misma dirección pero mejorar la UX:
- Cambiar placeholder de "0" a vacío o "ej: 12".
- Agregar advertencia inline cuando factor=1 para unidades de tipo PACKAGING/QUANTITY.
- Agregar tooltip más explicativo con ejemplo numérico.
- **Pros**: Mínimo cambio de código. **Contras**: No resuelve el riesgo de precio calculado incorrecto.

### Opción B — Precio explícito obligatorio por presentación
Requerir que cada presentación tenga precio explícito en Lista de Precios antes de poder venderla.
- **Pros**: Elimina el riesgo del precio calculado por factor. **Contras**: Mayor carga de configuración para el usuario.

### Opción C — Factor bidireccional con campo de dirección
Agregar un campo `direction: 'direct' | 'inverse'` para soportar conversiones en ambas direcciones.
- **Pros**: Más flexible. **Contras**: Mayor complejidad, innecesario para el caso de uso actual.

### Opción D — Lock del factor post-primera-venta
Bloquear la edición de `factorConversion` una vez que el producto tenga movimientos de stock o precios asignados.
- **Pros**: Previene inconsistencias retroactivas. **Contras**: Limita flexibilidad operativa.

### Opción E — Historial de cambios de factor
Guardar el historial de cambios del `factorConversion` con timestamp para auditoría.
- **Pros**: Trazabilidad completa. **Contras**: Requiere backend o persistencia adicional.

---

## 14. Mapa de conexiones funcionales

| Módulo origen | Módulo destino | Estado | Evidencia |
|---------------|----------------|--------|-----------|
| Catálogo (AdditionalUnitMeasure) | Lista de Precios (UnitOption.factor) | Activo, funcional | `ProductPricing.tsx:134` |
| Catálogo (AdditionalUnitMeasure) | Lista de Precios (precio calculado fallback) | Activo, con riesgo | `usePriceBook.ts:220-231` |
| Catálogo (AdditionalUnitMeasure) | POS (selector de unidad) | Activo, funcional | `ProductGrid.tsx:279-284` |
| Catálogo (AdditionalUnitMeasure) | Comprobantes (selector de unidad por ítem) | Activo, funcional | `ProductsSection.tsx:53-59` |
| Catálogo (factorConversion) | Stock (conversión en validación de stock) | Activo, funcional | `unitConversion.ts:58-65` |
| Catálogo (factorConversion) | Stock (conversión al descontar post-venta) | Activo, funcional | `useComprobanteActions.tsx:522-528` |
| Lista de Precios (precio por unidad) | POS (precio en tarjeta de producto) | Activo, funcional | `ProductGrid.tsx:311-318` |
| Lista de Precios (precio por unidad) | Comprobantes (precio al seleccionar ítem) | Activo, funcional | `usePriceBook.ts:160-240` |
| POS (CartItem.unidadMedida) | Documento fiscal (unidad en XML) | Activo, correcto | `comprobante.types.ts:98` |
| Catálogo (unidad base) | Stock (unidadMinima) | Activo, funcional | `stockGateway.ts:100` |

---

## 15. Matriz de hallazgos

| Área | Regla esperada | Estado real | Evidencia | Riesgo | Recomendación |
|------|---------------|-------------|-----------|--------|---------------|
| Factor inicial al agregar presentación | Debe ser null/vacío para forzar que el usuario lo ingrese | Se inicializa en `1` | `useProductForm.ts:427` | Alto | Inicializar en `null` o `undefined` y requerir ingreso explícito |
| Placeholder campo "Contiene" | Debe sugerir un valor representativo (ej: "ej: 12") | Muestra "0" | `ProductAdditionalUnitsTable.tsx:146` | Medio | Cambiar a texto descriptivo |
| Validación de rango máximo del factor | Debe validar contra un máximo razonable | No existe | `useProductForm.ts:741` | Medio | Agregar `factor > 10000` como warning |
| Advertencia factor=1 para empaques | Debe alertar cuando factor=1 en PACKAGING | No existe | `useProductForm.ts:741-742` | Medio | Agregar validación semántica |
| Precio calculado por factor (Lista de Precios) | El usuario debe saber si un precio es calculado o explícito | `hasExplicitPrice: false` existe pero no se muestra al usuario claramente | `usePriceBook.ts:230` | Medio | Mostrar badge "Calculado" vs "Explícito" en la tabla de precios |
| Conversión a unidad mínima para descuento de stock | Debe convertir antes de descontar | Correcto y funcional | `useComprobanteActions.tsx:523-528` | Sin riesgo | N/A |
| Conversión para validar stock en POS | Debe validar con la cantidad en unidad mínima | Correcto y funcional | `useCart.tsx:224-230` | Sin riesgo | N/A |
| Dirección del factor en código | Debe ser `1 presentación = N unidades mínimas` | Correcta y consistente | `unitConversion.ts:62-64` | Sin riesgo | N/A |
| Unidad en documento fiscal | Puede ser la presentación comercial | Correcto normativamente | `comprobante.types.ts:98` | Sin riesgo | N/A |
| Historial de cambios del factor | Debería existir para auditoría | No existe | No confirmado | Medio | Considerar para MVP+1 |
| Bloqueo de edición post-ventas | Factor no debería cambiar si hay ventas | No existe | No confirmado | Alto | Considerar para MVP+1 |
| Validación de consistencia de familia | Presentaciones deben ser de la misma familia | Existe y funciona | `useProductForm.ts:732-737` | Sin riesgo | N/A |
| Validación de duplicados | No puede haber dos presentaciones con el mismo código | Existe y funciona | `useProductForm.ts:726-731` | Sin riesgo | N/A |

---

## 16. Riesgos

### Riesgo 1 — ALTO: Factor inicializado en 1 sin advertencia
- **Descripción**: Al agregar una presentación, `factorConversion` se inicializa en `1`. Si el usuario no lo modifica, tendrá una presentación equivalente a 1 unidad mínima.
- **Impacto**: Precio de la presentación = precio unitario (calculado por fallback). Stock descontado = 1 unidad por cada unidad de presentación vendida.
- **Evidencia**: `useProductForm.ts:427` — `factorConversion: 1`.
- **Mitigación**: Inicializar en `undefined/null` y requerir valor explícito.

### Riesgo 2 — ALTO: Cambio de factor invalida histórico silenciosamente
- **Descripción**: No hay bloqueo ni alerta al editar `factorConversion` de una presentación con precios o ventas existentes.
- **Impacto**: Precios calculados por fallback cambiarán retroactivamente. Descuentos de stock para ventas futuras serán distintos a las pasadas sin trazabilidad.
- **Evidencia**: `updateAdditionalUnit` (`useProductForm.ts:444-480`) — sin restricciones.
- **Mitigación**: Bloquear edición o requerir confirmación explícita.

### Riesgo 3 — MEDIO: Precio calculado por factor puede ser incorrecto
- **Descripción**: Si no hay precio explícito para una presentación, `usePriceBook` calcula `precio = precio_base × factor`. Este precio calculado (`hasExplicitPrice: false`) no es visible para el usuario como "calculado" en la UI de Lista de Precios.
- **Impacto**: El usuario puede pensar que no hay precio asignado cuando en realidad se está usando un precio calculado potencialmente incorrecto.
- **Evidencia**: `usePriceBook.ts:220-231`.
- **Mitigación**: Mostrar un indicador visual de "precio calculado" vs "precio explícito".

### Riesgo 4 — MEDIO: Sin validación de rango máximo del factor
- **Descripción**: No hay límite superior para `factorConversion`. Un factor de 100000 es técnicamente aceptado.
- **Evidencia**: `useProductForm.ts:741` — solo valida `<= 0`.
- **Mitigación**: Agregar un límite máximo configurable (ej: 100000) o al menos un warning.

### Riesgo 5 — MEDIO: Sin historial de cambios
- **Descripción**: No existe registro de cuándo cambió el `factorConversion`, por quién, ni cuál era el valor anterior.
- **Impacto**: Imposibilidad de auditar inconsistencias históricas entre ventas y stock.
- **Mitigación**: Implementar log de cambios (requiere backend).

### Riesgo 6 — BAJO: Cambio de unidad mínima no migra stock
- **Descripción**: Si se edita un producto y se cambia la unidad mínima, los valores numéricos del stock almacenados no se migran a la nueva unidad.
- **Evidencia**: `initializeFormFromProduct` no incluye lógica de migración de stock.
- **Mitigación**: Bloquear cambio de unidad mínima si hay stock > 0, o implementar migración automática.

---

## 17. Recomendaciones priorizadas

### P1 — Crítica (para antes del siguiente release)
1. **Cambiar el valor inicial de `factorConversion` de `1` a `null` o `undefined`**, y requerir que el usuario ingrese un valor antes de poder guardar. Esto previene el Riesgo 1.
2. **Cambiar el placeholder del campo "Contiene"** de `"0"` a `""` o `"ej: 12"` para evitar confusión.

### P2 — Alta (MVP+1)
3. **Agregar advertencia visual cuando `factorConversion === 1`** para unidades de tipo PACKAGING o QUANTITY. Texto sugerido: "¿Seguro? 1 unidad = 1 unidad mínima. Si esta presentación contiene más, ingresa la cantidad correcta."
4. **Mostrar badge "Calculado" o "C" en Lista de Precios** cuando el precio de una presentación se obtiene por fallback (`hasExplicitPrice: false`). Esto resuelve el Riesgo 3.
5. **Bloquear o requerir confirmación al editar `factorConversion`** de una presentación que ya tiene precios asignados en Lista de Precios. Resuelve Riesgo 2.

### P3 — Media (roadmap)
6. **Agregar validación de rango máximo** para `factorConversion` (ej: `> 100000` genera error).
7. **Implementar historial de cambios de configuración de presentaciones** (requiere backend). Resuelve Riesgo 5.
8. **Bloquear cambio de unidad mínima si el producto tiene stock > 0** o mostrar advertencia con impacto calculado.
9. **Agregar un tooltip con ejemplo numérico** al campo "Contiene": "Ejemplo: si vendes cajas de 12 unidades, ingresa 12 aquí."

### P4 — Baja (mejora continua)
10. **Mostrar en la ficha del producto** (ProductDetailPanel) el precio calculado o explícito por cada presentación.
11. **Agregar validación de que factor sea entero** para unidades de tipo QUANTITY y PACKAGING (opcionales).

---

## 18. Conclusión

Respuestas directas a las preguntas auditadas:

**¿Qué significa `factorConversion`?**  
"Cuántas unidades mínimas contiene 1 presentación." `factorConversion = N` → `1 presentación = N unidades mínimas`. Evidencia: `unitConversion.ts:62`.

**¿La conversión es correcta (presentación → unidad mínima)?**  
Sí. La dirección `quantity_base = quantity_presentación × factorConversion` es correcta y consistente en todos los módulos. Evidencia: `unitConversion.ts:62-64`.

**¿El campo "Contiene" está bien nombrado y explicado?**  
Moderadamente. El tooltip lo explica pero falta ejemplo inline y el placeholder "0" es confuso.

**¿Se usa el factor para calcular precio?**  
Sí, como fallback cuando no hay precio explícito para la presentación. `precio_presentación = precio_base × factor`. Evidencia: `usePriceBook.ts:220-231`.

**¿Hay riesgo de precio incorrecto?**  
Sí (Riesgo 3). Si el factor está mal configurado, el precio calculado por fallback será incorrecto. No hay indicación visual de que el precio es calculado.

**¿El stock se descuenta correctamente al vender por presentación?**  
Sí. El descuento usa `calculateRequiredUnidadMinima → convertToUnidadMinima → quantity × factor`. Evidencia: `useComprobanteActions.tsx:522-528`.

**¿La validación de stock en POS también convierte?**  
Sí, la misma cadena. Evidencia: `useCart.tsx:224-230`.

**¿Qué unidad va al documento fiscal?**  
La unidad de venta (puede ser presentación o unidad mínima). No se convierte automáticamente. Esto es correcto normativamente.

**¿Se puede cambiar el factor post-creación?**  
Sí, sin restricciones ni historial. Riesgo Alto (Riesgo 2).

**¿El formulario de producto tiene buena UX para el campo "Contiene"?**  
Parcialmente. Tiene tooltip y preview visual, pero falta advertencia para factor=1 y ejemplo inline.

**¿Hay bloqueo para factores inválidos?**  
Solo para `<= 0`. No hay límite superior ni detección del caso `factor = 1` como sospechoso.

**¿Existe módulo de stock conectado a presentaciones?**  
Sí. `stockGateway.ts` y `unitConversion.ts` implementan la capa de inventario que usa `factorConversion` del catálogo como única fuente de verdad para todas las conversiones.

**Resultado del lint (`npm run lint` en `apps/senciyo`):**  
El comando se ejecutó sin errores ni advertencias. Salida vacía = código pasa las reglas ESLint configuradas.

---

*Auditoría generada el 2026-05-18. Solo lectura — no se modificó código funcional.*
