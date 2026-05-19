# Auditoría de unidades y símbolo comercial — SenciYo

**Fecha:** 2026-05-18
**Auditor:** Agente de auditoría Claude
**Estado:** Solo lectura — sin modificaciones al código funcional

---

## 1. Resumen ejecutivo

El proyecto SenciYo maneja unidades de medida SUNAT con un campo `symbol` editable llamado "símbolo comercial". El sistema genera un símbolo por defecto con la función `formatDefaultCommercialSymbol`, que produce cadenas como `"(HUR) Hora"` — es decir, incluye el código SUNAT en el símbolo mismo.

El problema de duplicidad visual ("HUR HUR" o código repetido) ocurre en la Lista de Precios porque el componente `UnitSelector` (en `ProductPricingTable.tsx`) renderiza **dos spans separados**: el primero muestra el `activeUnit` (código SUNAT, ej. `HUR`) en negrita, y el segundo muestra el `activeUnitLabel` devuelto por `getUnitDisplay` / `getUnitDisplayForUI`, que al resolver el símbolo comercial devuelve `"(HUR) Hora"`. El resultado visible es `HUR  (HUR) Hora`, dos veces el código.

La causa raíz está en `normalizeUnitsWithCatalog` (archivo `modelos/index.ts`, línea 208): cuando no hay símbolo personalizado guardado, se llama a `formatDefaultCommercialSymbol(code, name)` que devuelve `"(HUR) Hora"`. Este valor se guarda como `symbol` de la unidad. Cuando `getUnitDisplayForUI` lo resuelve, retorna ese string completo — y quien lo renderiza ya está mostrando el `code` por separado. La duplicidad existe en varios módulos con distintos grados de severidad.

**Módulos afectados:** Lista de Precios (crítico), Catálogo de Artículos / ImportPage (medio), Barra de búsqueda global (bajo).
**Nivel de riesgo general:** Alto.

---

## 2. Alcance revisado

Archivos y directorios revisados (rutas relativas a `apps/senciyo/src/`):

- `shared/units/unitDisplay.ts` — helper centralizado de display
- `shared/inventory/unitConversion.ts` — conversión entre unidades
- `pages/Private/features/configuracion-sistema/modelos/index.ts` — modelo `Unit`, catálogo SUNAT, `formatDefaultCommercialSymbol`, `normalizeUnitsWithCatalog`
- `pages/Private/features/configuracion-sistema/modelos/Configuration.ts` — modelo `Configuration`
- `pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion.tsx` — estado global `units`
- `pages/Private/features/configuracion-sistema/components/negocio/SeccionUnidades.tsx` — UI de edición de símbolo comercial
- `pages/Private/features/lista-precios/models/PriceTypes.ts` — modelos de precios
- `pages/Private/features/lista-precios/components/ListaPrecios.tsx` — componente raíz
- `pages/Private/features/lista-precios/components/ProductPricing.tsx` — lógica de display y `getUnitDisplay`
- `pages/Private/features/lista-precios/components/product-pricing/ProductPricingTable.tsx` — tabla con `UnitSelector` y `UnitPricesPanel`
- `pages/Private/features/lista-precios/components/product-pricing/utils.ts`
- `pages/Private/features/lista-precios/utils/priceHelpers.ts` — re-export de helpers
- `pages/Private/features/lista-precios/utils/price-helpers/columns.ts`
- `pages/Private/features/lista-precios/utils/price-helpers/formatting.ts`
- `pages/Private/features/catalogo-articulos/models/types.ts` — modelo `Product` del catálogo
- `pages/Private/features/catalogo-articulos/pages/ProductsPage.tsx` — filtro de unidades
- `pages/Private/features/catalogo-articulos/pages/ImportPage.tsx` — concatenación manual
- `pages/Private/features/catalogo-articulos/components/ProductDetailPanel.tsx` — usa `getUnitDisplayForUI`
- `pages/Private/features/catalogo-articulos/components/product-modal/ProductUnitsSection.tsx` — selector y `resolveUnitLabelText`
- `pages/Private/features/catalogo-articulos/components/product-table/ProductTableRow.tsx` — `getUnitDisplayForUI`
- `pages/Private/features/comprobantes-electronicos/punto-venta/hooks/useCart.tsx` — `getUnitDisplayForUI` en cart
- `pages/Private/features/comprobantes-electronicos/punto-venta/components/cart/CartItemsList.tsx` — display en carrito POS
- `pages/Private/features/comprobantes-electronicos/shared/form-core/components/ProductsSection.tsx` — display en comprobantes
- `pages/Private/features/comprobantes-electronicos/shared/form-core/hooks/usePriceBook.ts` — resolución de etiqueta de unidad
- `pages/Private/features/comprobantes-electronicos/shared/ui/PreviewDocument.tsx` — impresión con `getUnitDisplayForPrint`
- `pages/Private/features/comprobantes-electronicos/shared/modales/CobranzaModal.tsx` — opciones de moneda (irrelevante para unidades de medida)
- `pages/Private/features/comprobantes-electronicos/hooks/useAvailableProducts.tsx` — mapeo de productos disponibles
- `layouts/components/SearchBar.tsx` — búsqueda global, muestra `unitCode` crudo

---

## 3. Fuente de verdad de unidades

### 3.1 Definición del modelo

**Archivo:** `pages/Private/features/configuracion-sistema/modelos/index.ts` (líneas 19–38)

```
interface Unit {
  id: string;
  code: string;          // Código SUNAT (ej. "HUR", "NIU", "KGM")
  name: string;          // Descripción SUNAT (ej. "Hora", "Unidad")
  symbol?: string;       // Símbolo comercial editable (ej. "(HUR) Hora" o "Hr" custom)
  description?: string;  // Descripción ampliada SUNAT
  category: UnitCategory; // 'SERVICIOS'|'TIME'|'WEIGHT'|'VOLUME'|'LENGTH'|'AREA'|'ENERGY'|'QUANTITY'|'PACKAGING'
  baseUnit?: string;
  conversionFactor?: number;
  decimalPlaces: number;
  isActive: boolean;
  isSystem?: boolean;
  isFavorite?: boolean;
  isVisible?: boolean;
  isDefault?: boolean;
  displayOrder?: number;
  usageCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

El campo `symbol` es el **símbolo comercial editable**. Por defecto, si no hay ninguno guardado, se genera con:

```typescript
// modelos/index.ts:145-148
export const formatDefaultCommercialSymbol = (code: string, sunatName: string): string => {
    const normalizedCode = normalizeCode(code);
    const normalizedName = (sunatName ?? '').trim();
    return `(${normalizedCode}) ${normalizedName}`;
};
```

Esto produce strings como `"(HUR) Hora"`, `"(NIU) Unidad"`, `"(KGM) Kilogramo"` — que ya contienen el código SUNAT embebido dentro del símbolo.

### 3.2 Persistencia

- Las unidades se persisten en **localStorage** bajo la clave `facturaFacilConfig` (constante `LLAVE_ALMACENAMIENTO_CONFIGURACION` en `ContextoConfiguracion.tsx`).
- El estado global `units: Unit[]` vive en `ConfigurationState` dentro de `ContextoConfiguracion.tsx`.
- Cuando se guarda un símbolo personalizado, se actualiza la lista completa de unidades vía `onUpdate(updatedUnits)` en `SeccionUnidades.tsx` (línea 215).
- En `normalizeUnitsWithCatalog` (línea 200–234 de `modelos/index.ts`), cuando no hay símbolo guardado (`existing?.symbol` es vacío), se asigna `formatDefaultCommercialSymbol(catalog.code, catalog.name)` como valor de `symbol`.

### 3.3 Lectura desde otros módulos

Todos los módulos acceden a las unidades a través del hook `useConfigurationContext()`, específicamente `state.units: Unit[]`. Luego pasan ese array al helper centralizado `getUnitDisplayForUI` o `getUnitDisplayForPrint`.

---

## 4. Relación con Catálogo de productos

### 4.1 Selector de unidad mínima

**Archivo:** `pages/Private/features/catalogo-articulos/components/product-modal/ProductUnitsSection.tsx`

El formulario de producto muestra un `<select>` donde las opciones se construyen con `resolveUnitLabelText(unit)` (línea 108–116):

```typescript
export const resolveUnitLabelText = (unit: Unit): string => {
  return (
    getUnitDisplayForUI({
      code: unit.code,
      fallbackSymbol: unit.symbol,
      fallbackName: unit.name,
    }) || `(${unit.code}) ${unit.name}`
  );
};
```

Aquí `getUnitDisplayForUI` retorna `unit.symbol` si existe. Si `unit.symbol` es `"(HUR) Hora"` (generado por defecto), la opción del selector mostrará `"(HUR) Hora"` — que es descriptivo pero no es un símbolo limpio.

### 4.2 Presentaciones comerciales

**Archivo:** `pages/Private/features/catalogo-articulos/models/types.ts`

```typescript
export interface AdditionalUnitMeasure {
  unidadCodigo: string;          // Código SUNAT de la presentación
  factorConversion: number;      // Factor de conversión a unidad mínima
  unidadSymbol?: string;         // Símbolo comercial snapshot (opcional)
  unidadName?: string;           // Nombre snapshot (opcional)
}
```

El formulario del producto puede agregar `unidadesMedidaAdicionales`. Cada una guarda un snapshot del símbolo y nombre al momento de la creación.

### 4.3 Qué se guarda en el modelo del producto

**Archivo:** `pages/Private/features/catalogo-articulos/models/types.ts` (líneas 10–48)

```typescript
interface Product {
  unidad: string;          // Código SUNAT de la unidad mínima (ej. "HUR")
  unitSymbol?: string;     // Snapshot del símbolo comercial al momento de crear/editar
  unitName?: string;       // Snapshot del nombre SUNAT
  unidadesMedidaAdicionales?: AdditionalUnitMeasure[];
}
```

El producto guarda el **código** más snapshots del símbolo y nombre. Los snapshots no se actualizan automáticamente cuando el usuario edita el símbolo comercial en Configuración → Unidades.

---

## 5. Relación con Lista de Precios

### 5.1 Tabla principal

**Archivo:** `pages/Private/features/lista-precios/components/product-pricing/ProductPricingTable.tsx` (líneas 231–241)

La columna "Unidad" de la tabla renderiza el `UnitSelector`, pasando:
- `activeUnit={resolveActiveUnit(product)}` → el código SUNAT crudo (ej. `"HUR"`)
- `activeUnitLabel={getUnitDisplay(product.sku, resolveActiveUnit(product))}` → el label resuelto

### 5.2 Selector de unidad en fila

**Archivo:** `ProductPricingTable.tsx` (líneas 340–392, componente `UnitSelector`)

El botón visible renderiza dos spans:
```tsx
<span className="text-[11px] font-bold text-gray-900">{activeUnit}</span>
<span className="text-[11px] text-gray-600 truncate max-w-[90px]">{activeUnitLabel}</span>
```

- `activeUnit` = `"HUR"` (código SUNAT puro)
- `activeUnitLabel` = resultado de `getUnitDisplay(sku, "HUR")` = símbolo comercial resuelto

Cuando el símbolo por defecto es `"(HUR) Hora"`, el botón muestra: **`HUR  (HUR) Hora`** — duplicando el código.

En el dropdown de opciones (líneas 374–377), cada opción también muestra `option.code` + `option.label`:
```tsx
<span>{option.code}</span>
<span className="text-[11px] font-normal text-gray-500">{option.label}</span>
```

Mismo problema dentro del menú desplegable.

### 5.3 Detalle expandido

**Archivo:** `ProductPricingTable.tsx` (líneas 741–756, componente `UnitPricesPanel`)

Cada fila del panel expandido muestra:
```tsx
<span>{option.code}</span>   {/* "HUR" */}
{/* badges de isBase / Actual */}
<div className="text-[11px] text-gray-500">{option.label}</div>  {/* "(HUR) Hora" */}
```

El mismo patrón código + label. Con el símbolo por defecto se duplica el código visualmente.

También en la celda de factor de conversión (línea 755):
```tsx
<div className="text-[10px] text-gray-400 mt-1">
  1 {option.code} = {option.factor} {baseUnitCode}
</div>
```
Aquí solo se usa `code` (correcto, sin duplicidad en esta parte específica).

### 5.4 Helpers usados

La función `getUnitDisplay` se define localmente en `ProductPricing.tsx` (líneas 88–114):

```typescript
const getUnitDisplay = useCallback((sku: string, code: string): string => {
  if (!code) return '';
  const catalogProduct = catalogProducts.find(product => product.codigo === sku);
  if (!catalogProduct) {
    return getUnitDisplayForUI({ units: configState.units, code }) || code;
  }
  if (catalogProduct.unidad === code) {
    return (
      getUnitDisplayForUI({
        units: configState.units,
        code,
        fallbackSymbol: catalogProduct.unitSymbol,
        fallbackName: catalogProduct.unitName,
      }) || code
    );
  }
  const additional = catalogProduct.unidadesMedidaAdicionales?.find(unit => unit.unidadCodigo === code);
  if (!additional) return code;
  return (
    getUnitDisplayForUI({
      units: configState.units,
      code,
      fallbackSymbol: additional.unidadSymbol,
      fallbackName: additional.unidadName,
    }) || code
  );
}, [catalogProducts, configState.units]);
```

Y `getUnitDisplayForUI` en `shared/units/unitDisplay.ts` (líneas 52–55):

```typescript
export const getUnitDisplayForUI = (input: UnitDisplayInput): string | undefined => {
  const { symbol, name, code } = resolveUnitFields(input);
  return symbol || name || code || undefined;
};
```

Prioridad de resolución: `symbol` > `name` > `code`. Si `symbol = "(HUR) Hora"`, retorna `"(HUR) Hora"`.

---

## 6. Duplicidad visual detectada

### 6.1 Causa exacta

**Archivo y línea exacta de la concatenación problemática:**

`pages/Private/features/lista-precios/components/product-pricing/ProductPricingTable.tsx`, líneas 352–353:

```tsx
<span className="text-[11px] font-bold text-gray-900">{activeUnit}</span>
<span className="text-[11px] text-gray-600 truncate max-w-[90px]">{activeUnitLabel}</span>
```

Y en el dropdown de opciones, líneas 375–377:

```tsx
<span>{option.code}</span>
<span className="text-[11px] font-normal text-gray-500">{option.label}</span>
```

Y en el panel expandido `UnitPricesPanel`, líneas 744–753:

```tsx
<span>{option.code}</span>
{/* + badges */}
<div className="text-[11px] text-gray-500">{option.label}</div>
```

**Origen del símbolo problemático:**

`pages/Private/features/configuracion-sistema/modelos/index.ts`, líneas 145–149 y 207–208:

```typescript
export const formatDefaultCommercialSymbol = (code: string, sunatName: string): string => {
    return `(${normalizedCode}) ${normalizedName}`;  // produce "(HUR) Hora"
};
// ...
const symbol = sanitizedSymbol || formatDefaultCommercialSymbol(catalog.code, catalog.name);
```

### 6.2 Por qué se ve "HUR HUR" o código duplicado

Cuando el símbolo comercial de la unidad HUR no ha sido personalizado por el usuario, el sistema genera `symbol = "(HUR) Hora"`. La función `getUnitDisplayForUI` prioriza `symbol` sobre `name`, devolviendo `"(HUR) Hora"`. El componente `UnitSelector` muestra el `code` en el primer span y el `label` (= símbolo) en el segundo span. El resultado visual es:

```
[ HUR ] [ (HUR) Hora ] [▼]
```

Que el usuario percibe como duplicidad del código "HUR".

### 6.3 Por qué el detalle expandido repite información

El `UnitPricesPanel` sigue el mismo patrón: código en un `<span>` y label (= símbolo con código embebido) en un `<div>` separado. Adicionalmente muestra badges de "Base" y "Actual", lo que añade más texto alrededor del código duplicado.

---

## 7. Relación con POS

### 7.1 Visualización de unidad

**Archivos:** `punto-venta/hooks/useCart.tsx` (línea 241–245), `punto-venta/components/cart/CartItemsList.tsx` (líneas 36–42, 144–154)

El carrito del POS usa `getUnitDisplayForUI` con prioridad `symbol > name > code` para resolver la etiqueta. En `CartItemsList.tsx`, la función `resolveItemUnitLabel` llama a `getUnitDisplayForUI` y devuelve el símbolo completo. Este label se usa como texto de las opciones del selector de unidad en el carrito.

A diferencia de Lista de Precios, en el carrito POS **no se muestra el código separado junto al label** — solo se muestra el `label` resultante de `resolveItemUnitLabel`. Por tanto, si el símbolo es `"(HUR) Hora"`, se muestra `"(HUR) Hora"` sin duplicidad extra del código. El usuario sí verá el código embebido en el símbolo, pero no habrá un segundo span con el código crudo.

### 7.2 ¿Mismo problema que Lista de Precios?

**Parcialmente.** El símbolo por defecto `"(HUR) Hora"` sí aparece en POS, pero sin la segunda capa de duplicidad porque el código no se renderiza en un span separado. Sin embargo, el formato `"(HUR) Hora"` no es un símbolo limpio/compacto para mostrar en POS (tickets de impresión, etc.).

---

## 8. Relación con Comprobantes

### 8.1 Visualización de unidad

**Archivos:**
- `shared/form-core/components/ProductsSection.tsx` (líneas 386–391, 1256–1261)
- `shared/ui/PreviewDocument.tsx` (líneas 396–404)
- `shared/form-core/hooks/usePriceBook.ts` (líneas 124, 130–134, 144)
- `pages/Private/features/configuracion-sistema/components/diseno-comprobante/VistaPreviaComprobante.tsx` (líneas 396, 768)

Los comprobantes usan `getUnitDisplayForUI` (para la UI de edición) y `getUnitDisplayForPrint` (para la previsualización e impresión).

`getUnitDisplayForPrint` (en `unitDisplay.ts`, líneas 57–68) aplica lógica distinta según el formato:
- `format: 'ticket'` → retorna `symbol || name || code`
- `format: 'hoja'` → retorna `name || symbol || code`

Para impresión de hoja A4, prioriza `name` (descripción SUNAT, ej. "Hora") sobre `symbol` (ej. "(HUR) Hora"), lo cual es correcto. Para ticket térmica, usaría el símbolo que puede contener el código embebido.

En la UI de edición de comprobantes (`ProductsSection.tsx:386`), se usa `getUnitDisplayForUI` con el mismo comportamiento que Lista de Precios, pero aquí no se renderiza el código crudo en un span separado, por lo que no hay duplicidad visual del código.

### 8.2 ¿Mismo problema que Lista de Precios?

**No en la misma forma.** Los comprobantes no muestran el código SUNAT en un span separado junto al label. Sin embargo, si el símbolo por defecto `"(HUR) Hora"` aparece como etiqueta de unidad en la tabla de ítems, el usuario ve ese string completo (con paréntesis), lo cual es poco elegante pero no es duplicidad estricta.

---

## 9. Símbolo comercial editable

### 9.1 ¿Se respeta en cada módulo?

| Módulo | ¿Respeta símbolo editable? | Evidencia |
|--------|---------------------------|-----------|
| Lista de Precios (UnitSelector) | Sí — usa `getUnitDisplayForUI` que prioriza `symbol` | `ProductPricing.tsx:88–114` |
| Lista de Precios (UnitPricesPanel expandido) | Sí — mismo helper | `ProductPricingTable.tsx:753` |
| Catálogo — tabla de productos | Sí — `getUnitDisplayForUI` con fallbacks del snapshot | `ProductTableRow.tsx:284–293` |
| Catálogo — detalle panel | Sí — `getUnitDisplayForUI` | `ProductDetailPanel.tsx:71–77` |
| Catálogo — selector en formulario de producto | Sí — `resolveUnitLabelText` usa `getUnitDisplayForUI` | `ProductUnitsSection.tsx:108–116` |
| Catálogo — filtro de ImportPage | No — concatena `symbol + name` manualmente | `ImportPage.tsx:44` |
| Punto de Venta (carrito) | Sí — `resolveItemUnitLabel` usa `getUnitDisplayForUI` | `CartItemsList.tsx:36–42` |
| Comprobantes (ProductsSection) | Sí — `getUnitDisplayForUI` | `ProductsSection.tsx:1256–1261` |
| Comprobantes (impresión PreviewDocument) | Sí — `getUnitDisplayForPrint` | `PreviewDocument.tsx:396–404` |
| Barra de búsqueda global (precios) | Parcialmente — muestra `unitCode` crudo en `secondary` | `SearchBar.tsx:1147` |
| Configuración — tabla de unidades | Sí — `commercialSymbol = unit.symbol || formatDefaultCommercialSymbol(...)` | `SeccionUnidades.tsx:416` |

### 9.2 Estrategia actual vs estrategia recomendada

**Estrategia actual:** Cada módulo llama a `getUnitDisplayForUI` (bien) o implementa su propio fallback (riesgo). El helper centralizado retorna `symbol || name || code`, lo cual significa que el símbolo por defecto `"(HUR) Hora"` siempre gana sobre el nombre limpio `"Hora"`.

**Estrategia recomendada:** Dos opciones:
- **Opción A (sin tocar el helper):** Cambiar `formatDefaultCommercialSymbol` para que el símbolo por defecto sea solo el `name` (ej. `"Hora"`) en vez de `"(HUR) Hora"`. Los módulos que necesiten mostrar el código lo harían separadamente. Bajo impacto, corrección en un solo lugar.
- **Opción B (cambio de diseño del UnitSelector):** El componente `UnitSelector` no debería mostrar el `code` como span separado cuando el `label` ya lo contiene. Mostrar solo el `label` si este es informativo, o mostrar `code + name` como campos distintos sin usar el `symbol` como intermediario.

---

## 10. Helpers y lógica de formateo

### 10.1 Inventario de helpers

| Helper | Archivo | Descripción |
|--------|---------|-------------|
| `getUnitDisplayForUI` | `shared/units/unitDisplay.ts:52` | Helper centralizado para UI. Retorna `symbol \|\| name \|\| code` |
| `getUnitDisplayForPrint` | `shared/units/unitDisplay.ts:57` | Helper centralizado para impresión. Distingue ticket vs hoja |
| `getUnitByCode` | `shared/units/unitDisplay.ts:30` | Busca unidad por código en array |
| `normalizeText` | `shared/units/unitDisplay.ts:18` | Normaliza texto (quita tildes, lowercase) |
| `formatDefaultCommercialSymbol` | `configuracion-sistema/modelos/index.ts:145` | Genera símbolo por defecto `"(CODE) Name"` |
| `sanitizeCommercialSymbol` | `configuracion-sistema/modelos/index.ts:142` | Limpia caracteres de control del símbolo |
| `normalizeUnitsWithCatalog` | `configuracion-sistema/modelos/index.ts:200` | Normaliza lista de unidades contra catálogo SUNAT |
| `getUnitDisplay` (local) | `lista-precios/components/ProductPricing.tsx:88` | Wrapper local de `getUnitDisplayForUI` con lógica de fallback por catálogo |
| `resolveUnitLabelText` | `catalogo-articulos/components/product-modal/ProductUnitsSection.tsx:108` | Wrapper para selector de unidad mínima en formulario de producto |
| `resolveItemUnitLabel` (local) | `punto-venta/components/cart/CartItemsList.tsx:36` | Función inline para resolver label en carrito POS |

### 10.2 Duplicidad de lógica

La lógica de resolución de label (buscar en `configState.units` por código, con fallback en snapshot del producto) está duplicada en:
1. `ProductPricing.tsx:88–114` (con lógica de fallback del catálogo)
2. `usePriceBook.ts:124–144` (con lógica de fallback del catálogo)
3. `CartItemsList.tsx:36–42` (sin fallback del catálogo)
4. `useAvailableProducts.tsx:103–107` (con fallback del catálogo)

Estos podrían unificarse en un hook reutilizable tipo `useUnitDisplay(sku, code, catalogProducts)`.

La función `ImportPage.tsx:44` hace concatenación manual `${symbol} ${name}` sin pasar por `getUnitDisplayForUI`, lo que la excluye de la lógica centralizada.

### 10.3 Campos con nombres similares pero significados distintos

| NombreCampo | Módulo | Qué contiene realmente |
|-------------|--------|----------------------|
| `unit.symbol` | `configuracion-sistema/modelos/Unit` | Símbolo comercial editable. Por defecto = `"(HUR) Hora"` (código+nombre SUNAT) |
| `product.unitSymbol` | `catalogo-articulos/models/Product` | Snapshot del `unit.symbol` al momento de guardar el producto. Puede estar desactualizado |
| `additional.unidadSymbol` | `catalogo-articulos/models/AdditionalUnitMeasure` | Snapshot del símbolo para presentaciones adicionales |
| `product.unitName` | `catalogo-articulos/models/Product` | Snapshot del `unit.name` (descripción SUNAT) al momento de guardar |
| `unit.name` | `configuracion-sistema/modelos/Unit` | Descripción oficial SUNAT, ej. "Hora". No editable por el usuario |
| `unit.code` | `configuracion-sistema/modelos/Unit` | Código oficial SUNAT, ej. "HUR". No editable |
| `option.label` | `lista-precios/models/PriceTypes:ProductUnitOption` | Resultado de `getUnitDisplay`. Puede ser symbol (por defecto incluye código) |
| `option.code` | `lista-precios/models/PriceTypes:ProductUnitOption` | Código SUNAT puro, siempre disponible |
| `activeUnit` | `ProductPricingTable.tsx` (prop) | Código SUNAT puro de la unidad activa |
| `activeUnitLabel` | `ProductPricingTable.tsx` (prop) | Label resuelto de la unidad activa (incluye código si el símbolo es el por defecto) |

---

## 11. Riesgos funcionales y visuales

| Riesgo | Nivel | Evidencia |
|--------|-------|-----------|
| Duplicidad visual de código en `UnitSelector` cuando el símbolo por defecto incluye el código SUNAT | **Crítico** | `ProductPricingTable.tsx:352–353` + `modelos/index.ts:145–148` |
| Duplicidad de código en dropdown de opciones de `UnitSelector` | **Alto** | `ProductPricingTable.tsx:375–377` |
| Duplicidad de código en `UnitPricesPanel` (detalle expandido) | **Alto** | `ProductPricingTable.tsx:744–753` |
| `ImportPage.tsx:44` concatena `symbol + name` manualmente, sin usar helper centralizado | **Medio** | `ImportPage.tsx:44` — resultado: `"(HUR) Hora Hora"` si ambos campos están presentes |
| Snapshots de `unitSymbol`/`unitName` en productos no se actualizan cuando el usuario edita el símbolo en Configuración | **Medio** | `catalogo-articulos/models/types.ts:15–16` — no hay mecanismo de sincronización detectado |
| `SearchBar.tsx:1147` muestra `unitCode` crudo en texto secundario sin resolución | **Bajo** | `SearchBar.tsx:1147` — `secondary: "SKU X · Unidad HUR"` sin etiqueta amigable |
| Símbolo por defecto `"(HUR) Hora"` no es un símbolo compacto apropiado para tickets POS | **Medio** | `modelos/index.ts:145–148` + `getUnitDisplayForPrint` en modo `'ticket'` |
| Productos creados antes de que el usuario personalice el símbolo tienen snapshots con el valor `"(HUR) Hora"` | **Medio** | `catalogo-articulos/models/types.ts:unitSymbol` — dependencia de snapshot |
| `resolveUnitLabelText` en `ProductUnitsSection.tsx:114` tiene fallback hardcodeado `\`(${unit.code}) ${unit.name}\`` que duplica la lógica de `formatDefaultCommercialSymbol` | **Bajo** | `ProductUnitsSection.tsx:114` |
| Ausencia de typecheck script a nivel de monorepo (solo `tsc` en workspace individual) | **Bajo** | `package.json` raíz — solo `typecheck:functions` |

---

## 12. Matriz de hallazgos

| Área | Hallazgo | Estado | Evidencia | Riesgo | Recomendación |
|------|----------|--------|-----------|--------|---------------|
| Modelo `Unit` | El campo `symbol` puede contener `"(HUR) Hora"` — código embebido | Confuso | `modelos/index.ts:145–148` | Crítico | Cambiar `formatDefaultCommercialSymbol` para que el default sea solo el `name` |
| Helper centralizado | `getUnitDisplayForUI` prioriza `symbol` sin saber que puede contener el código | Parcial | `unitDisplay.ts:52–55` | Alto | Separar el concepto de "símbolo corto" vs "etiqueta completa" |
| `UnitSelector` en Lista de Precios | Renderiza `{activeUnit}` + `{activeUnitLabel}` en spans separados | Riesgoso | `ProductPricingTable.tsx:352–353` | Crítico | Mostrar solo el label, o mostrar `code` solo si el label no lo contiene |
| `UnitPricesPanel` expandido | Renderiza `{option.code}` + `{option.label}` en elementos separados | Riesgoso | `ProductPricingTable.tsx:744–753` | Alto | Mostrar solo el label completo, sin code separado |
| `formatDefaultCommercialSymbol` | Diseño intencional que mezcla código y nombre en el símbolo | Inconsistente | `modelos/index.ts:145–148` | Crítico | Rediseñar para que el símbolo por defecto sea solo `name` o solo `code` |
| Snapshots en producto | `unitSymbol` / `unitName` no se sincronizan con cambios en configuración | Riesgoso | `catalogo-articulos/models/types.ts:15–16` | Medio | Documentar este comportamiento o agregar migración |
| `ImportPage.tsx` | Concatenación manual `${symbol} ${name}` — no usa helper centralizado | Inconsistente | `ImportPage.tsx:44` | Medio | Reemplazar por `getUnitDisplayForUI` |
| Impresión de comprobantes | `getUnitDisplayForPrint` con format `'hoja'` prioriza `name` — correcto | Correcto | `unitDisplay.ts:57–68` | Bajo | Sin cambio necesario |
| POS carrito | `resolveItemUnitLabel` usa `getUnitDisplayForUI` — no duplica código en UI | Correcto | `CartItemsList.tsx:36–42` | Bajo | Sin cambio necesario |
| Lógica duplicada de resolución | La lógica "buscar en units, fallback en snapshot del producto" aparece en 4+ lugares | Inconsistente | `ProductPricing.tsx:88`, `usePriceBook.ts:124`, `CartItemsList.tsx:36`, `useAvailableProducts.tsx:103` | Medio | Extraer a hook reutilizable `useUnitDisplay` |
| `SeccionUnidades.tsx` | UI de edición de símbolo funciona correctamente | Correcto | `SeccionUnidades.tsx:181–219` | Bajo | Sin cambio necesario |
| `SearchBar.tsx` | Muestra `unitCode` crudo sin resolución de etiqueta amigable | Parcial | `SearchBar.tsx:1147` | Bajo | Mejorar texto secundario con etiqueta resuelta |
| TypeScript | `tsc --noEmit` ejecutado sin errores en workspace senciyo | Correcto | CLI — sin output de errores | N/A | Mantener |
| ESLint | `npm run lint:senciyo` ejecutado sin errores ni warnings | Correcto | CLI — sin output de errores | N/A | Mantener |

---

## 13. Recomendación de formato visual

### 13.1 Opciones evaluadas

**Opción A — Solo el símbolo comercial (sin código separado):**
- Botón: `[ (HUR) Hora ▼ ]`
- Pro: Un solo elemento, no hay duplicidad.
- Contra: Con el símbolo por defecto actual, sigue mostrando el código embebido entre paréntesis.

**Opción B — Solo símbolo limpio (corregir el default):**
- Cambiar `formatDefaultCommercialSymbol` para que devuelva solo el `name` (ej. `"Hora"`), y el selector muestre `[ Hora ▼ ]`.
- Pro: Limpio, sin código duplicado.
- Contra: Los usuarios que ya tenían `"(HUR) Hora"` guardado seguirán viendo el formato viejo hasta que se limpie el storage.

**Opción C — Código + nombre, sin symbol como intermediario:**
- Botón: `[ HUR · Hora ▼ ]`
- No usar `symbol` para el label del selector; usar directamente `${code} · ${name}` desde el modelo de la unidad.
- Pro: Siempre consistente, el código y el nombre son campos separados y claros.
- Contra: Ignora el símbolo comercial personalizado por el usuario.

**Opción D — Solo símbolo si es personalizado, sino código:**
- Si `unit.symbol` fue editado por el usuario (y difiere del default), mostrar `symbol`. Si no, mostrar `code`.
- Requiere poder distinguir si el símbolo es el default o fue personalizado.
- Pro: Respeta personalización. Contra: Complejidad adicional.

### 13.2 Formato recomendado por contexto

| Contexto | Formato recomendado | Justificación |
|----------|--------------------|--------------| 
| Botón `UnitSelector` en tabla de Lista de Precios | Solo `activeUnitLabel` (sin span de `code` separado) | Evita duplicidad; el label es suficiente para identificar la unidad |
| Dropdown de opciones en `UnitSelector` | `code · symbol_limpio` o solo `label` | Consistencia; el código ayuda en contexto de múltiples unidades |
| `UnitPricesPanel` expandido | `code` + badge de Base/Actual + `name` (no `symbol`) | En el panel detallado, el código ya es visible; `name` es más descriptivo que `symbol` |
| Filtros de catálogo (`ImportPage`) | `getUnitDisplayForUI` centralizado | Consistencia con el resto del sistema |
| Comprobantes impresos (ticket) | `symbol` limpio o `code` | Espacio limitado; símbolo conciso. Puede ser el código SUNAT |
| Comprobantes impresos (hoja A4) | `name` (descripción SUNAT) | Formato formal; ya funciona correctamente con `getUnitDisplayForPrint(format:'hoja')` |
| POS — selector de unidad en carrito | Solo `label` resuelto por `getUnitDisplayForUI` | Ya funciona así; sin cambios |

---

## 14. Plan sugerido de corrección

### Fase 1 — Corrección de la fuente del problema (impacto en todos los módulos)

**Archivo:** `apps/senciyo/src/pages/Private/features/configuracion-sistema/modelos/index.ts`

Cambio: Modificar `formatDefaultCommercialSymbol` para que el símbolo por defecto sea solo el `name` SUNAT (sin el código entre paréntesis):

```typescript
// Antes:
export const formatDefaultCommercialSymbol = (code: string, sunatName: string): string => {
    return `(${normalizedCode}) ${normalizedName}`;
};

// Después (propuesta):
export const formatDefaultCommercialSymbol = (_code: string, sunatName: string): string => {
    return (sunatName ?? '').trim();
};
```

- Impacto: Todo el sistema mostrará el nombre descriptivo (ej. "Hora") como símbolo por defecto en vez de "(HUR) Hora".
- Dependencias: `normalizeUnitsWithCatalog`, `SeccionUnidades.tsx`, `ProductUnitsSection.tsx`, tests de snapshot.
- Riesgo para datos existentes: Los usuarios que ya tienen `"(HUR) Hora"` guardado en localStorage seguirán viéndolo hasta que el `autoSanitizedOnceRef` en `SeccionUnidades.tsx` fuerce una re-escritura. Esto ocurre una vez en la primera carga; sin embargo, como la condición `needsSanitization` solo actúa cuando el símbolo está vacío, los existentes con `"(HUR) Hora"` no serán sobreescritos automáticamente. Sería necesario limpiar localStorage o forzar una migración.

### Fase 2 — Corrección del render en `UnitSelector`

**Archivo:** `apps/senciyo/src/pages/Private/features/lista-precios/components/product-pricing/ProductPricingTable.tsx`

Cambio: El botón del `UnitSelector` debe mostrar **solo el label** (o solo el código si el label no está disponible), eliminando el span separado del código:

```tsx
// Antes:
<span className="text-[11px] font-bold text-gray-900">{activeUnit}</span>
<span className="text-[11px] text-gray-600 truncate max-w-[90px]">{activeUnitLabel}</span>

// Después (propuesta):
<span className="text-[11px] font-semibold text-gray-900 truncate max-w-[110px]">
  {activeUnitLabel || activeUnit}
</span>
```

- Impacto: Elimina duplicidad visual inmediatamente, independiente de la Fase 1.
- Dependencias: Ninguna externa.
- Riesgo: Bajo — solo cambio visual en el selector.

También aplicar el mismo fix en el dropdown de opciones (líneas 375–377) y en `UnitPricesPanel` (línea 744).

### Fase 3 — Corrección de `ImportPage.tsx`

**Archivo:** `apps/senciyo/src/pages/Private/features/catalogo-articulos/pages/ImportPage.tsx`

Cambio: Reemplazar concatenación manual (línea 44) por `getUnitDisplayForUI`:

```typescript
// Antes:
name: `${meta?.symbol || ''} ${meta?.name || ''}`.trim() || code

// Después:
name: getUnitDisplayForUI({ units: configState.units, code, fallbackSymbol: meta?.symbol, fallbackName: meta?.name }) || code
```

- Requiere importar `useConfigurationContext` y `getUnitDisplayForUI`.
- Impacto: Medio — consistencia en filtros de importación.

### Fase 4 — Extracción de hook reutilizable (mejora de calidad)

Crear un hook `useUnitDisplay` en `shared/units/` que encapsule la lógica de "buscar en `configState.units`, fallback en snapshot del producto":

```typescript
// shared/units/useUnitDisplay.ts
export const useUnitDisplay = (catalogProducts: CatalogProduct[]) => {
  const { state: configState } = useConfigurationContext();
  return useCallback((sku: string, code: string): string => {
    // ... lógica actualmente duplicada en ProductPricing.tsx:88-114 ...
  }, [catalogProducts, configState.units]);
};
```

- Impacto: Refactor; sin cambio visual.
- Dependencias: `ProductPricing.tsx`, `usePriceBook.ts`, `CartItemsList.tsx`, `useAvailableProducts.tsx`.

### Fase 5 — Actualización de snapshots en productos (opcional, bajo riesgo)

Si se quiere que los productos muestren siempre el símbolo actualizado (no el snapshot), se puede eliminar los campos `unitSymbol` y `unitName` de `Product` y resolver siempre desde `configState.units` + código. Esto requiere mayor análisis de compatibilidad con datos existentes.

---

## 15. Conclusión

1. **Causa exacta de la duplicidad:** El símbolo por defecto generado por `formatDefaultCommercialSymbol` incluye el código SUNAT embebido (`"(HUR) Hora"`). El componente `UnitSelector` renderiza el código en un span separado y el símbolo (que ya contiene el código) en otro span, produciendo `HUR  (HUR) Hora`.

2. **Archivo/componente que la genera:** El símbolo problemático se origina en `pages/Private/features/configuracion-sistema/modelos/index.ts:145–148`. La duplicidad visual ocurre en `pages/Private/features/lista-precios/components/product-pricing/ProductPricingTable.tsx:352–353` (botón del selector), líneas 375–377 (dropdown), y líneas 744–753 (panel expandido).

3. **Helper o lógica que debería corregirse:** (a) `formatDefaultCommercialSymbol` en `modelos/index.ts` — cambiar el template del símbolo por defecto; (b) el render del `UnitSelector` en `ProductPricingTable.tsx` — eliminar el span del código separado o fusionarlo con el label.

4. **Formato visual recomendado:** En el `UnitSelector`, mostrar solo el `activeUnitLabel` (sin span separado del código). El label debe ser un texto limpio como `"Hora"` o `"kg"` — no `"(HUR) Hora"`.

5. **Módulos impactados:** Lista de Precios (crítico), Catálogo-ImportPage (medio), Barra de búsqueda global (bajo).

6. **¿Crear/reutilizar helper centralizado?** El helper `getUnitDisplayForUI` ya existe y está bien diseñado. Lo que debe corregirse es el valor que alimenta a ese helper (el `symbol` por defecto). También se recomienda crear un hook `useUnitDisplay` para centralizar la lógica de fallback que está duplicada en 4+ lugares.

7. **¿Solo Lista de Precios o varios módulos?** El problema del símbolo por defecto afecta a todos los módulos. La duplicidad visual más grave (código + label duplicado) es exclusiva de Lista de Precios. `ImportPage.tsx` tiene una concatenación independiente que también genera formato inconsistente.

8. **¿Respetar símbolo comercial editable?** Sí. La Fase 1 solo cambia el valor por defecto; los símbolos personalizados guardados por el usuario se respetan sin cambios. La Fase 2 (render) es independiente del valor del símbolo.

9. **¿Riesgo con productos ya creados?** Medio. Los productos tienen snapshots `unitSymbol` que contienen el formato antiguo `"(HUR) Hora"`. Si se cambia `formatDefaultCommercialSymbol`, los nuevos productos verán símbolo limpio `"Hora"`, pero los productos existentes mostrarán el snapshot antiguo hasta que el usuario edite el producto. La prioridad de `getUnitDisplayForUI` (primero busca en `configState.units`) mitiga este riesgo si la configuración es corregida.

10. **¿Riesgo con POS/Comprobantes?** Bajo. POS y Comprobantes no muestran el código SUNAT en un span separado; solo muestran el label resuelto. El cambio al símbolo por defecto mejorará la legibilidad en POS (de `"(HUR) Hora"` a `"Hora"`). Los comprobantes de hoja A4 ya priorizan `name` correctamente.

11. **Plan por fases:**
    - **Fase 1** (alta prioridad): Corregir `formatDefaultCommercialSymbol` en `modelos/index.ts`.
    - **Fase 2** (alta prioridad, independiente): Corregir render de `UnitSelector` y `UnitPricesPanel` en `ProductPricingTable.tsx`.
    - **Fase 3** (media prioridad): Corregir concatenación manual en `ImportPage.tsx`.
    - **Fase 4** (baja prioridad, calidad): Extraer hook `useUnitDisplay` reutilizable.
    - **Fase 5** (opcional): Eliminar dependencia de snapshots en productos y resolver siempre desde `configState.units`.

---
*Auditoría generada el 2026-05-18. Solo lectura — no se modificó código funcional.*
