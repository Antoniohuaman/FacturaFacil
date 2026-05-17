# Auditoría exhaustiva del módulo de precios — SenciYo

**Fecha de auditoría:** 2026-05-17  
**Auditor:** Claude Sonnet 4.6 (asistente de arquitectura)  
**Repositorio:** `C:\FacturaFacil`  
**Rama auditada:** `develop`  
**Alcance:** Módulo `/lista-precios` y todos sus consumidores directos e indirectos  
**Restricción:** Solo lectura. No se modificó ningún archivo funcional.

---

## 1. Resumen ejecutivo

El módulo de lista de precios de SenciYo está **arquitecturalmente bien estructurado** con separación clara entre tipos, hooks, utilidades y componentes. Sin embargo, presenta **riesgos operativos críticos** derivados de su persistencia exclusiva en `localStorage`, ausencia de validación del precio mínimo en el punto de venta, un hook de cálculo de precios que lee datos una sola vez al montar (estado potencialmente desactualizado en POS), y una pestaña de Paquetes que opera en completo aislamiento del motor de precios.

**El riesgo más grave:** Un producto puede venderse en el POS a un precio **inferior al mínimo permitido** sin ningún bloqueo. Adicionalmente, si el usuario actualiza precios en Lista de Precios y el POS ya está abierto en la misma pestaña, el POS continuará usando los precios anteriores hasta que se recargue la página, porque `usePriceCalculator` carga datos **una única vez** sin reactividad.

**Estado general del módulo:**

| Área | Estado | Riesgo |
|------|--------|--------|
| Modelo de datos | Sólido | Bajo |
| Persistencia real (backend/DB) | No existe | Crítico |
| Cálculo de precios base | Funcional | Medio |
| Cálculo efectivo (reglas globales) | Funcional | Bajo |
| Plantilla de columnas | Funcional | Bajo |
| Importación Excel | Funcional | Medio |
| Precio mínimo en POS | No aplicado | Crítico |
| Reactividad del POS a cambios | No reactivo | Alto |
| Paquetes | Aislado del módulo | Alto |
| Precio preferencial por cliente | UI conectada, POS no aplica | Alto |
| Auditoría de cambios | Inexistente | Alto |

---

## 2. Alcance revisado

La auditoría cubrió:

- **Módulo central:** `apps/senciyo/src/pages/Private/features/lista-precios/`
- **Consumidores directos:** módulo de comprobantes electrónicos (`comprobantes-electronicos/`), punto de venta (`punto-venta/`), gestión de clientes (`gestion-clientes/`), catálogo de artículos (`catalogo-articulos/`)
- **Infraestructura compartida:** `shared/currency`, `shared/tenant`, `shared/time`
- **Rutas y permisos:** `routes/privateRoutes.tsx`, `configuracion-sistema/roles/catalogoPermisos.ts`

---

## 3. Mapa de archivos relacionados

### 3.1 Módulo principal (`lista-precios/`)

| Ruta | Rol | Consume | Expone | Estado |
|------|-----|---------|--------|--------|
| `models/PriceTypes.ts` | Tipos centrales | `catalogo-articulos/models/types` | `Column`, `FixedPrice`, `VolumePrice`, `Price`, `Product`, `ProductUnitPrices`, `PriceForm` | Activo |
| `models/EffectivePriceTypes.ts` | Tipos de precio efectivo | — | `EffectivePriceResult`, `EffectivePriceMatrix` | Activo |
| `models/PriceImportTypes.ts` | Tipos de importación masiva | `PriceTypes` | `BulkPriceImportEntry`, `PriceImportPreviewRow`, `ImportTableColumnConfig` | Activo |
| `hooks/usePriceList.ts` | Orquestador principal del módulo | `useColumns`, `usePriceProducts`, `useCatalogSync` | Estado completo de la UI | Activo |
| `hooks/useColumns.ts` | Gestión de columnas con localStorage | `priceHelpers`, `tenantHelpers`, `storage` | CRUD de columnas, persistencia | Activo |
| `hooks/usePriceProducts.ts` | Gestión de productos/precios | `priceHelpers`, `storage`, catálogo | CRUD de precios, importación, matrix efectiva | Activo |
| `hooks/usePriceCalculator.ts` | API de consulta para externos | `storage`, `priceHelpers` | `getBasePrice`, `calculatePriceBySKU`, `getUnitPrice` | **Activo — bug de reactividad** |
| `hooks/usePriceProfilesCatalog.ts` | Expone perfiles vendibles a clientes/POS | `usePriceCalculator` | Lista de columnas `kind=manual` visibles | Activo |
| `hooks/useCatalogSync.ts` | Sincroniza catálogo desde localStorage | `storage`, `tenantHelpers` | `catalogProducts` | Activo |
| `hooks/index.ts` | Barrel de exports públicos | — | `usePriceList`, `usePriceCalculator`, `useColumns`, `usePriceProducts`, `useCatalogSync` | Activo |
| `utils/price-helpers/columns.ts` | Definiciones y lógica de columnas fijas | `PriceTypes` | Constantes P1–P9, `ensureRequiredColumns`, `applyGlobalRule`, `validateColumnConfiguration` | Activo |
| `utils/price-helpers/pricing.ts` | Cálculo de precios y redondeo | `shared/currency`, `volume` | `roundCurrency`, `calculatePrice`, `getFixedPriceValue` | Activo |
| `utils/price-helpers/effectivePrices.ts` | Matriz de precios efectivos | `columns`, `pricing` | `buildEffectivePriceMatrix`, `getEffectivePriceFromBase` | Activo |
| `utils/price-helpers/volume.ts` | Precios por volumen | `PriceTypes`, `formatting` | `calculateVolumePrice`, `validateVolumeRanges`, formatters | Activo |
| `utils/price-helpers/formatting.ts` | Formateo de moneda/fecha | `shared/currency` | `formatPrice`, `formatDate` | Activo |
| `utils/priceHelpers.ts` | Re-exporta price-helpers/* | todos los helpers | Barrel de exportación | Activo |
| `utils/importProcessing.ts` | Parser Excel, validación, plantillas | `xlsx` (probablemente), `PriceTypes`, `PriceImportTypes` | `parseExcelFile`, `buildImportTemplate`, `validateImportRow` | Activo |
| `utils/learnBasePrice.ts` | Aprende precio base desde POS | `storage`, `priceHelpers`, `shared/time` | `learnBasePriceIfMissing` | Activo |
| `utils/storage.ts` | Persistencia tenant-aware en localStorage | `tenantHelpers` | `readTenantJson`, `writeTenantJson`, `ensureTenantStorageMigration` | Activo |
| `utils/tenantHelpers.ts` | Re-exporta helpers de tenant | `shared/tenant` | `getTenantEmpresaId`, `lsKey` | Activo |
| `components/ListaPrecios.tsx` | Componente raíz con pestañas | `usePriceList`, sub-componentes | UI completa del módulo | Activo |
| `components/ProductPricing.tsx` | Interfaz de precios por producto | `ProductPricingTable`, modales | Vista principal de tabla | Activo |
| `components/ColumnManagement.tsx` | Gestión de plantilla de columnas | `useColumns` via props | UI de CRUD de columnas | Activo |
| `components/SummaryBar.tsx` | Barra de resumen y controles | props de `usePriceList` | Búsqueda, exportación, asignación | Activo |
| `components/ImportPricesTab.tsx` | Importación desde Excel | `usePriceList`, `importProcessing` | UI de importación masiva | Activo |
| `components/PackagesTab.tsx` | Paquetes de productos | `useProductStore` (catálogo) | CRUD de paquetes | **Aislado del módulo de precios** |
| `components/modals/PriceModal.tsx` | Modal asignación precio fijo | `usePriceList` | Formulario precio/vigencia | Activo |
| `components/modals/VolumeMatrixModal.tsx` | Modal precio por volumen | `usePriceList` | Formulario de rangos | Activo |
| `components/modals/ColumnModal.tsx` | Modal columna | `usePriceList` | Formulario de columna | Activo |
| `components/product-pricing/ProductPricingTable.tsx` | Tabla principal de precios | `usePriceList`, `effectivePrices` | Tabla editable inline | Activo |
| `components/product-pricing/ProductPricingControls.tsx` | Controles de búsqueda | props | Input de búsqueda | Activo |
| `components/product-pricing/PriceColumnsManagerButton.tsx` | Gestor de visibilidad columnas tabla | props | Dropdown de toggles | Activo |
| `components/product-pricing/types.ts` | Tipos de tabla | — | `InlineCellState`, `CellStatus`, `UnitOption`, `ProductRowHandlers` | Activo |
| `components/product-pricing/utils.ts` | Utilidades de tabla | — | `cellKey`, `getDefaultValidityRange`, `FALLBACK_UNIT_CODE` | Activo |

### 3.2 Consumidores externos

| Módulo | Archivo | Relación con precios |
|--------|---------|----------------------|
| Comprobantes | `shared/form-core/hooks/usePriceBook.ts` | Hook puente: resuelve precios por SKU/unidad con fallback |
| Comprobantes | `shared/core/comprobantePricing.ts` | Convierte `CartItem` a input de cálculo de línea |
| Comprobantes | `hooks/useAvailableProducts.tsx` | Carga productos con precio base para POS/comprobantes |
| Punto de Venta | `punto-venta/hooks/useCart.tsx` | Carrito; llama `learnBasePriceIfMissing` al editar precio |
| Punto de Venta | `punto-venta/hooks/usePosCartAndTotals.ts` | Orquesta carrito + totales; gestiona columna activa del POS |
| Clientes | `gestion-clientes/utils/saleClienteMapping.ts` | Mapea `cliente.listaPrecio` → `priceProfileId` en snapshot |
| Clientes | `gestion-clientes/components/ClienteFormNew.tsx` | Selector de perfil de precio usando `usePriceProfilesCatalog` |
| Rutas | `routes/privateRoutes.tsx` | Registra `/lista-precios` con permisos `precios.ver`, `precios.editar` |
| Permisos | `configuracion-sistema/roles/catalogoPermisos.ts` | Define permisos `precios.ver` y `precios.editar` |

---

## 4. Descripción funcional actual del módulo

El módulo `/lista-precios` es un sistema de gestión de precios multi-columna orientado a productos del catálogo. Su propósito es centralizar la definición de todos los precios (base, mínimo, mayorista, distribuidor, etc.) de todos los productos, por unidad de medida.

La interfaz tiene **cuatro pestañas**:

1. **Precios por producto:** Tabla principal con todos los productos del catálogo y sus precios por columna. Permite edición inline, filtrado por SKU, gestión de unidades y acceso a modales de precio fijo y precio por volumen.

2. **Paquetes:** Gestión de paquetes de productos. Opera independientemente del módulo de precios (usa `useProductStore` del catálogo).

3. **Plantilla de columnas:** CRUD de columnas de precio. Permite crear columnas manuales y configurar columnas globales.

4. **Importar precios:** Descarga de plantilla Excel, carga de archivo, vista previa y aplicación masiva.

### Tipos de precio implementados

| Tipo | Descripción | Implementado |
|------|-------------|:---:|
| Precio fijo (`FixedPrice`) | Valor único con fechas de vigencia | Sí |
| Precio por volumen (`VolumePrice`) | Rangos de cantidad con precios distintos | Sí |
| Precio global-discount (P8) | Descuento % o monto sobre precio base | Sí (cálculo automático) |
| Precio global-increase (P9) | Recargo % o monto sobre precio base | Sí (cálculo automático) |

---

## 5. Modelo de datos y origen de información

### 5.1 Estructura de datos

```typescript
// Columna de precio
interface Column {
  id: string;           // P1..P9 para fijas, Pn para manuales
  name: string;
  mode: 'fixed' | 'volume';
  visible: boolean;       // visible en UI del módulo
  isVisibleInTable?: boolean; // visible en tabla de productos
  isBase: boolean;
  order: number;
  kind: 'base' | 'global-discount' | 'global-increase' | 'product-discount' | 'min-allowed' | 'manual';
  globalRuleType?: 'percent' | 'amount';
  globalRuleValue?: number | null;
}

// Producto con precios
interface Product {
  sku: string;
  name: string;
  prices: Record<columnId, Record<unitCode, Price>>;
  activeUnitCode?: string;
}

// Precio fijo
interface FixedPrice { type: 'fixed'; value: number; validFrom: string; validUntil: string; }
// Precio por volumen
interface VolumePrice { type: 'volume'; ranges: VolumeRange[]; validFrom: string; validUntil: string; }
```

### 5.2 Claves de localStorage (tenant-prefixed)

Todas las claves usan el patrón `{empresaId}:{baseKey}`:

| Dato | Clave base | Claves legacy migradas |
|------|-----------|------------------------|
| Columnas configuradas | `price_list_columns` | `lista_precios_columns` |
| Productos con precios | `price_list_products` | `lista_precios_products` |
| Estado de importación | `price_list_import_state` | `lista_precios_import` |
| Catálogo de productos | `catalog_products` | `catalogo_productos` |
| Columna activa en POS | `pos_price_column` | (ninguna) |

### 5.3 Origen real de cada dato

| Dato | Origen | Persistencia | Se pierde si... |
|------|--------|-------------|-----------------|
| Columnas de precio | localStorage (inicializado con `ensureRequiredColumns`) | localStorage | Se limpia el storage del navegador |
| Precios de productos | localStorage | localStorage | Se limpia el storage del navegador |
| Catálogo de productos | localStorage (escrito por módulo de catálogo) | localStorage | Se limpia el storage |
| Columna activa POS | localStorage (`pos_price_column`) | localStorage | Se limpia el storage |
| Precios aprendidos (`learnBasePrice`) | localStorage | localStorage | Se limpia el storage |

**No existe ningún backend, API, Supabase ni base de datos real.** Todo el módulo funciona sobre localStorage del navegador.

---

## 6. Flujo de lectura y escritura de precios

### Flujo de lectura

```
Usuario abre /lista-precios
  → useColumns inicializa: readTenantJson('price_list_columns', [])
     → ensureRequiredColumns() garantiza P1-P9 presentes
  → useCatalogSync inicializa: readTenantJson('catalog_products', [])
  → usePriceProducts inicializa: readTenantJson('price_list_products', [])
     → normalizeStoredProducts() normaliza IDs legacy
  → buildEffectivePriceMatrix() calcula matriz de precios efectivos (incluyendo globales)
  → ProductPricingTable renderiza con effectivePrices
```

### Flujo de escritura (precio directo)

```
Usuario edita celda inline o abre PriceModal
  → addOrUpdateProductPrice(priceData)
     → validateDates() + validateFixedPrice()
     → Si min-allowed: validar <= precio base
     → setProducts(prev => [...]) [actualiza estado React]
     → useEffect: writeTenantJson('price_list_products', products)
```

### Flujo de escritura (importación Excel)

```
Usuario carga archivo Excel
  → importProcessing.parseExcelFile()
  → Genera PriceImportPreviewRow[] con status/errors/warnings
  → Usuario revisa vista previa
  → Usuario confirma → applyImportedFixedPrices(entries)
     → Filtra columnas válidas, valida valores
     → setProducts() con precios aplicados
     → useEffect: writeTenantJson()
```

### Flujo de escritura (aprendizaje desde POS)

```
Usuario edita precio en POS manualmente
  → updateCartItemPrice() en useCart
     → learnBasePriceIfMissing({ sku, unitCode, value })
        → readTenantJson('price_list_products')
        → Si no existe precio base vigente para ese SKU/unidad:
           writeTenantJson('price_list_products', [...])
        → Si ya existe precio base vigente: no sobreescribe
```

### Sincronización cross-tab

`useColumns`, `usePriceProducts`, y `useCatalogSync` escuchan el evento `storage` del navegador para actualizar estado cuando otra pestaña escribe en localStorage. Este mecanismo funciona **únicamente entre pestañas distintas**. **No funciona dentro de la misma pestaña** (localStorage events no se disparan en la misma pestaña que escribe).

---

## 7. Relación con productos

### Origen de productos en la lista de precios

Los productos que aparecen en la tabla de precios provienen de dos fuentes combinadas en `usePriceProducts.catalogMergedProducts`:

1. **Catálogo activo:** Todos los productos de `catalog_products` (localStorage), enriquecidos con precios si existen en `price_list_products`.
2. **Productos huérfanos:** Productos que tienen precios en `price_list_products` pero ya no están en el catálogo activo. Aparecen al final de la tabla.

### Relación SKU ↔ Precio

La clave de relación es el `sku` (equivalente a `codigo` en el catálogo). La estructura de precios es:

```
product.prices[columnId][unitCode] = Price
```

Cada producto puede tener precios distintos por:
- Columna (base, mínimo, mayorista, etc.)
- Unidad de medida (`NIU`, `KGM`, etc.)

### Cambio de nombre del producto

Si el nombre de un producto cambia en el catálogo, `catalogMergedProducts` lo actualiza automáticamente en memoria (línea 164 de `usePriceProducts.ts`). Sin embargo, el nombre guardado en `price_list_products` no se actualiza en localStorage hasta el próximo guardado de un precio para ese producto.

### Inconsistencias detectadas

| Tipo | Descripción | Severidad |
|------|-------------|-----------|
| Precio duplicado | El campo `precio` en `catalogo-articulos/models/types.ts` y el campo `prices.P1` en `price_list_products` pueden divergir | Alto |
| Productos sin precio | Los productos del catálogo aparecen en la tabla aunque no tengan ningún precio configurado (con celdas vacías) | Bajo (intencional) |
| Productos huérfanos | Productos con precios pero sin entrada en el catálogo aparecen en la tabla sin nombre/descripción completa | Medio |
| SKU sensible a mayúsculas | `unitCode` se normaliza a mayúsculas en `learnBasePrice.ts` pero no en todos los flujos del módulo principal | Medio |

---

## 8. Relación con punto de venta

### Arquitectura de integración

El POS consume precios a través de la cadena:

```
usePosCartAndTotals
  → usePriceBook (getUnitPriceWithFallback, getPriceOptionsFor, resolveMinPrice)
     → usePriceCalculator (lee localStorage UNA VEZ al montar)
```

### Precio por defecto en POS

El POS usa la columna guardada en `localStorage['pos_price_column']` como columna activa. Al inicializar `usePosCartAndTotals`, llama `readStoredPriceColumn()` para recuperar la última columna seleccionada. Si no hay ninguna guardada o es inválida, usa la primera columna disponible.

### Columnas ofrecidas en el selector del POS

`usePosCartAndTotals` construye `PosPriceListOption[]` usando las columnas del `usePriceBook`. Solo se ofrecen columnas con precios configurados o columnas marcadas como visibles en el sistema.

### Bug crítico: usePriceCalculator no es reactivo

**Archivo:** `hooks/usePriceCalculator.ts` — Líneas 42-44:

```typescript
export const usePriceCalculator = () => {
  const products = useMemo(() => loadPriceProducts(), []);  // ← deps vacías
  const columns  = useMemo(() => loadColumns(), []);        // ← deps vacías
```

`useMemo` con array de dependencias vacío ejecuta la función **una sola vez al montar el componente**. Esto significa:

- Si el usuario actualiza precios en `/lista-precios` en la misma sesión del navegador y luego va al POS **sin recargar la página**, el POS mostrará los precios **anteriores a la edición**.
- El mismo problema afecta a `usePriceBook` que depende de `usePriceCalculator`.

### Precio mínimo en POS: no aplicado

`resolveMinPrice()` en `usePriceBook` resuelve el valor del precio mínimo (columna P2). Este valor se expone como `minAllowedPrice` en `CartItem`. Sin embargo, **no existe ninguna validación en `useCart` ni en `usePosCartAndTotals` que impida ingresar o guardar un precio inferior al mínimo**. El campo `minAllowedPrice` se almacena en el item pero nunca se valida durante la venta.

### learnBasePrice: aprendizaje automático

Cuando el usuario edita manualmente un precio en el POS, `learnBasePriceIfMissing` se llama para registrar ese precio como precio base en la lista. Solo actúa si:
- No existe un precio base vigente para ese SKU/unidad, O
- El precio existente ha expirado

Usa `validUntil: '9999-12-31'`, lo que prácticamente significa "nunca expira". Una vez aprendido, no se sobrescribe automáticamente aunque el precio cambie en el POS.

---

## 9. Relación con comprobantes y ventas

### Cómo se toma el precio al agregar un producto

En comprobantes electrónicos (formulario libre y lista), `usePriceBook.getUnitPriceWithFallback()` resuelve el precio así:

1. Busca en `price_list_products` el producto por SKU.
2. Usa la columna preferida (la activa en POS o la base).
3. Si no encuentra precio para la unidad exacta, hace fallback a la unidad base del producto.
4. Si no encuentra precio en ninguna unidad, devuelve `undefined`.

El precio se mapea al campo `price` del `CartItem`. El campo `priceColumnId` registra qué columna se usó.

### ¿El precio queda congelado?

Sí: una vez que el `CartItem` se crea con un `price`, ese valor queda en memoria del carrito. Los cambios posteriores en la lista de precios no actualizan los items ya en el carrito.

### Diferencia venta POS vs comprobante tradicional

Ambos usan `usePriceBook` como fuente de precios. El POS tiene adicionalmente `learnBasePriceIfMissing` al editar precios. No se detectó diferencia estructural en el precio tomado.

### Campo `isManualPrice`

Cuando el usuario edita el precio directamente en el formulario del comprobante, se marca `isManualPrice: true`. Este flag evita que el precio sea sobreescrito por recálculos automáticos del carrito. `buildLinePricingInputFromCartItem` respeta este flag.

### Validación de precio mínimo en comprobantes

**No existe.** Al igual que en el POS, `minAllowedPrice` se propaga al `CartItem` pero nunca se valida antes de emitir el comprobante.

---

## 10. Relación con clientes

### Perfiles de precio por cliente

El campo `cliente.listaPrecio` almacena el ID de una columna de precios (tipo `manual` y `visible`). Este campo se mapea a `priceProfileId` en `clienteToSaleSnapshot()`.

### Columnas ofrecidas como perfil

`usePriceProfilesCatalog` filtra columnas con:

```typescript
const isVendibleColumn = (column: Column): boolean => {
  return column.visible && column.kind === 'manual';
};
```

Esto significa:
- Solo columnas `kind='manual'` y `visible=true` se ofrecen como perfiles
- La columna base (P1, `kind='base'`) **nunca** aparece en el selector de cliente
- Las columnas globales (P8, P9) tampoco
- La columna de precio mínimo (P2) tampoco

**El usuario no puede asignar "Precio Base" como perfil de un cliente**, aunque en la lógica del negocio podría tener sentido.

### ¿El perfil del cliente se aplica en POS?

**Parcialmente.** El `priceProfileId` del cliente se propaga en el snapshot de venta. El campo llega a `usePosCartAndTotals`, que lo recibe como `selectedPriceColumnId`. Sin embargo, la aplicación efectiva del perfil a los items del carrito requiere que `applyPriceToItem` use ese `selectedPriceColumnId` como fuente para resolver el precio. Esto existe en el código, pero si el precio para esa columna no existe en la lista, hace fallback a la columna base, sin notificar al usuario.

**No existe validación ni advertencia cuando el perfil de precio de un cliente no tiene precios configurados en la lista.** El usuario creerá que vende al precio preferencial del cliente cuando en realidad está vendiendo al precio base.

---

## 11. Relación con caja y cobranzas

Los totales en el POS se calculan en `usePosCartAndTotals` usando `calculateLineaComprobante()` sobre cada `CartItem`. La función `buildLinePricingInputFromCartItem()` convierte el precio del item al formato de cálculo de línea.

Los descuentos globales (P8) y aumentos globales (P9) se calculan en `buildEffectivePriceMatrix()` en el módulo de precios, pero el resultado de esa matriz (el campo `effectivePrices`) se usa solo en la **tabla del módulo `/lista-precios`** para mostrar los precios calculados. **El POS no consume `effectivePrices`.** El POS usa `usePriceBook.getUnitPriceWithFallback()` que resuelve el precio explícito del item.

Esto implica que si una columna tiene `kind='global-discount'` configurado, el precio calculado aparecerá correctamente en la tabla de precios del módulo, pero para que ese precio llegue al POS, el usuario deberá haber configurado explícitamente el precio en esa columna para cada producto, o el precio explícito ya debe existir.

**Las reglas de descuento/aumento global (P8/P9) NO se aplican automáticamente al total de la venta en el POS.** Solo son cálculos de referencia visibles en la lista de precios.

---

## 12. Análisis de paquetes

### Estado: Aislado del módulo de precios

`PackagesTab.tsx` importa y usa:

```typescript
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
```

No importa ningún hook ni utilidad de `lista-precios`. Los paquetes son entidades del módulo `catalogo-articulos`, no del módulo de precios.

### Qué hace PackagesTab

- CRUD de paquetes (create/edit/delete) via `useProductStore.addPackage/updatePackage/deletePackage`
- El tipo `Package` viene de `catalogo-articulos/models/types`
- El precio de un paquete se calcula con descuentos sobre los precios de los productos del catálogo (campo `precio` del producto, no la lista de precios)
- Búsqueda/filtrado de paquetes
- Modal inline para crear/editar

### Hallazgos

| Característica | Estado |
|----------------|--------|
| Paquetes en POS | No encontrado — no hay evidencia de que el POS consuma paquetes |
| Paquetes en comprobantes | No encontrado |
| Precio de paquete desde lista de precios | No implementado |
| Precio de paquete en columna base | No implementado |
| Afecta stock | No verificado (depende de `useProductStore`) |
| Paquetes en importación Excel | No implementado |
| Persistencia | Via `useProductStore` (probablemente localStorage del catálogo) |

**El botón "Paquetes" en la barra de pestañas de Lista de Precios da acceso a un módulo de catálogo de artículos embebido, no a un sistema de precios de paquetes.**

---

## 13. Análisis de plantilla de columnas

### Columnas fijas (no eliminables, no renombrables)

| ID | Nombre por defecto | Kind | isBase | Visible por defecto | Visible en tabla por defecto |
|----|-------------------|------|--------|--------------------|-----------------------------|
| P1 | PRECIO BASE | `base` | true | true | **true** |
| P2 | PRECIO MÍNIMO | `min-allowed` | false | true | false |
| P3 | PRECIO MAYORISTA | `manual` | false | true | false |
| P4 | PRECIO DISTRIBUIDOR | `manual` | false | true | false |
| P5 | PRECIO CORPORATIVO | `manual` | false | true | false |
| P6 | PRECIO PREFERENCIAL | `manual` | false | true | false |
| P7 | PRECIO PROMOCIONAL | `manual` | false | true | false |
| P8 | DESCUENTO GLOBAL | `global-discount` | false | true | false |
| P9 | AUMENTO GLOBAL | `global-increase` | false | true | false |

### Columnas manuales

- Hasta **10 columnas manuales** adicionales (constante `MANUAL_COLUMN_LIMIT = 10`)
- ID generado automáticamente como `P10`, `P11`, etc.
- Pueden ser `mode: 'fixed'` o `mode: 'volume'`
- Pueden eliminarse (a diferencia de las fijas)
- Al eliminar: se borran todos los precios de esa columna en todos los productos

### Mecanismos de columna

| Función | Implementado |
|---------|:---:|
| Crear columna manual | Sí |
| Editar nombre columna manual | Sí |
| Editar modo (fijo/volumen) columna manual | Sí |
| Eliminar columna manual | Sí |
| Eliminar columna fija | No (bloqueado) |
| Cambiar columna base | No (stub — `setBaseColumn` muestra error) |
| Configurar regla global (P8/P9) | Sí (tipo: % o monto, valor) |
| Visibilidad en módulo | Sí |
| Visibilidad en tabla de productos | Sí (campo `isVisibleInTable`) |
| Reordenar columnas | Sí (por arrastre) |
| Reset a orden por defecto | Sí |
| Seleccionar todas para tabla | Sí |
| Persistencia de orden/visibilidad | Sí (localStorage) |

### `setBaseColumn`: stub no funcional

```typescript
const setBaseColumn = useCallback((columnId: string): void => {
    if (columnId !== BASE_COLUMN_ID) {
      setError('La columna base es fija y no se puede reasignar');
    }
}, [setError]);
```

Esta función está expuesta por `usePriceList` pero solo muestra un error si se intenta cambiar la base. No implementa lógica real de reasignación. No hay UI en `ColumnManagement.tsx` que llame a esta función directamente.

### Validación de configuración de columnas

`validateColumnConfiguration()` verifica:
1. `hasBase`: existe al menos una columna con `kind='base'`
2. `hasVisible`: existe al menos una columna visible
3. `hasVisibleEditable`: existe al menos una columna visible editable (base, manual, product-discount, min-allowed)

Esta validación se usa en `SummaryBar.tsx` para mostrar el estado de configuración. **No bloquea ninguna operación** si la configuración no es válida.

---

## 14. Análisis de importación/exportación Excel

### Generación de plantilla

`importProcessing.ts` genera la plantilla Excel con:
- Columnas fijas: SKU, Nombre producto, Unidad, Vigente Desde, Vigente Hasta
- Columnas de precio: una columna por cada columna visible del módulo
- Incluye una fila de encabezados y potencialmente ejemplos de formato

### Validaciones al importar

| Validación | Implementada |
|-----------|:---:|
| SKU inexistente en catálogo | Sí — se omite la fila |
| SKU inexistente en lista (crea producto nuevo) | Sí — si está en catálogo |
| Unidad inexistente | Usa unidad del producto existente o la base del catálogo como fallback |
| Precio inválido (NaN, negativo) | Sí — se filtra |
| Precio = null (borrar precio) | Sí — elimina el precio para esa unidad |
| Precio = 0 | Sí — se acepta (price >= 0) |
| Columna no existente | Sí — se filtra por columnas válidas |
| Fechas inválidas | No verificado en código de importación |
| Precio mínimo > precio base en importación | **No validado** |
| Filas duplicadas (mismo SKU) | Se procesa cada fila; la última gana |
| Valores vacíos | Se tratan como null → borra precio |

### Flujo importación

```
1. Usuario descarga plantilla → buildImportTemplate()
2. Usuario carga archivo Excel
3. parseExcelFile() → PriceImportPreviewRow[]
4. Se muestra vista previa con estado (ready/error/applied)
5. Usuario confirma → applyImportedFixedPrices()
6. Se persiste en localStorage
```

### Riesgo: importación masiva sin validación precio mínimo

Si se importa un Excel donde para un producto P2 (precio mínimo) > P1 (precio base), la importación lo acepta sin error. Solo `addOrUpdateProductPrice` (edición directa) valida P2 ≤ P1.

### Riesgo: filas duplicadas = último gana

No hay deduplicación antes de aplicar. Si el mismo SKU+unidad aparece dos veces, ambos se procesan en orden y el segundo sobreescribe al primero sin advertencia.

### Persistencia post-importación

Al confirmar la importación, los datos se persisten via `writeTenantJson('price_list_products', ...)` en localStorage. Si el browser se cierra antes de que se complete, puede quedar un estado parcialmente aplicado sin posibilidad de rollback.

---

## 15. Análisis del botón "Asignar precio"

El botón "Asignar precio" en `SummaryBar.tsx` llama a `openPriceModal()` del hook `usePriceList`, que abre `PriceModal.tsx`.

### PriceModal.tsx

- Permite buscar y seleccionar un producto (por SKU o nombre)
- Seleccionar unidad de medida (desde catálogo)
- Seleccionar columna de precio
- Ingresar valor y fechas de vigencia
- Si la columna seleccionada es de tipo `volume`, puede redirigir al `VolumeMatrixModal`

### Características

| Funcionalidad | Estado |
|--------------|--------|
| Asignación de precio fijo | Funcional |
| Asignación de precio por volumen | Funcional (via modal secundario) |
| Asignación masiva (múltiples productos) | No implementado |
| Asignación por paquete | No implementado |
| Asignación por cliente | No implementado |
| Asignación por rango de fechas masivo | No implementado |
| Validación P2 ≤ P1 | Sí |
| Guardar sin cerrar modal | No verificado |

### Diferencia con edición inline

La edición inline en `ProductPricingTable.tsx` hace lo mismo que `PriceModal` pero directamente en la celda de la tabla. Ambas llaman a `addOrUpdateProductPrice`. No hay duplicidad de lógica (ambas usan el mismo hook), pero hay redundancia funcional: el usuario puede asignar el mismo precio desde dos lugares distintos con la misma lógica.

---

## 16. Análisis de columnas visibles y personalización

### Distinción entre `visible` e `isVisibleInTable`

| Campo | Descripción | Afecta |
|-------|-------------|--------|
| `visible` | Columna aparece en el formulario del módulo de precios | Lista de columnas en `ColumnManagement`, selector de columna en `PriceModal` |
| `isVisibleInTable` | Columna aparece como columna en la tabla de `ProductPricingTable` | Solo la tabla de precios por producto |

Estas dos propiedades son **independientes**. Una columna puede ser visible en el módulo pero no mostrarse como columna en la tabla. Esto puede ser confuso para el usuario que espera que "visible" controle todo.

### Columna P1 (base): siempre visible y en tabla

En `buildFixedColumn()`:
```typescript
if (definition.isBase) {
  column.visible = true;
  column.isVisibleInTable = true;
}
```
La columna base no puede ocultarse.

### Gestor de columnas de tabla (`PriceColumnsManagerButton`)

- Toggle de visibilidad por columna
- Reset (restaura defaults)
- Seleccionar todas
- El orden de columnas en la tabla sigue el campo `order` de cada columna
- El orden se puede cambiar en `ColumnManagement` via drag, y se persiste en localStorage

### Sincronización visibilidad ↔ exportación

Las columnas incluidas en la plantilla de exportación Excel se basan en las columnas visibles del módulo (campo `visible`), no en `isVisibleInTable`. Esto puede generar discrepancia: una columna visible en exportación pero oculta en la tabla.

---

## 17. Reglas de negocio, cálculos y validaciones

### Reglas implementadas

| Regla | Dónde | Estado |
|-------|-------|--------|
| P1 (base) siempre requerida | `ensureRequiredColumns`, `validateColumnConfiguration` | Funcional |
| P2 ≤ P1 (precio mínimo ≤ base) | `addOrUpdateProductPrice` | Solo en edición directa |
| Precio fijo > 0 | `validateFixedPrice` | Funcional |
| Precio volumen: minQty > 0 | `validateVolumeRanges` | Funcional |
| Precio volumen: maxQty > minQty | `validateVolumeRanges` | Funcional |
| Precio volumen: sin gaps entre rangos | `validateVolumeRanges` | Funcional |
| Precio volumen: rangos continuos | `validateVolumeRanges` | Funcional |
| Fechas: desde < hasta | `validateDates` | Funcional |
| Columna base no eliminable | `deleteColumn` | Funcional |
| Columnas globales no eliminables | `deleteColumn` | Funcional |
| Columnas fijas (P2-P9) no eliminables | `deleteColumn` | Funcional |
| Límite 10 columnas manuales | `addColumn` | Funcional |
| Redondeo a 2 decimales | `roundCurrency` (usa `currencyManager.baseCurrency.decimalPlaces`) | Funcional |
| Global-discount: base * (1 - pct/100) | `applyGlobalRule` | Funcional |
| Global-increase: base * (1 + pct/100) | `applyGlobalRule` | Funcional |
| Resultado global no negativo | `applyGlobalRule: Math.max(computed, 0)` | Funcional |
| Precio ≥ 0 en importación | `applyImportedFixedPrices` | Funcional |

### Reglas no implementadas / ausentes

| Regla faltante | Impacto | Severidad |
|----------------|---------|-----------|
| P2 ≤ P1 en importación Excel | Precio mínimo mayor al base se acepta silenciosamente | Alto |
| Px ≥ P2 en POS (precio mínimo) | Venta por debajo del mínimo permitida | Crítico |
| P3..P7 relacionados con P1 o P2 | Sin restricciones entre columnas manuales | Medio |
| Vigencia del precio al vender | No se verifica si el precio está vigente en el momento de la venta | Alto |
| Validación de precio 0 en columna base | Precio base = 0 es tecnicamente posible | Medio |
| Validación de negativos en edición directa | `validateFixedPrice` rechaza ≤ 0, pero importación acepta = 0 | Bajo |

### Cálculo de precio volumen

En `calculateVolumePrice()`, si la cantidad no encaja en ningún rango, se usa `sortedRanges[0]` como fallback (el primer rango) sin advertencia al usuario.

### Redondeo

`roundCurrency` usa `currencyManager.getSnapshot().baseCurrency.decimalPlaces ?? 2`. El número de decimales depende de la configuración de moneda del sistema. Si no está configurado, usa 2 por defecto.

---

## 18. Mapa de consumidores y sincronización

### Módulo Precios como proveedor

```
lista-precios
  ├── comprobantes-electronicos
  │     ├── usePriceBook.ts          (resuelve precios por SKU)
  │     ├── useAvailableProducts.tsx  (precios base en selector de productos)
  │     └── ProductsSection.tsx      (llama learnBasePriceIfMissing)
  ├── punto-venta
  │     ├── usePosCartAndTotals.ts   (columna activa, precios del carrito)
  │     └── useCart.tsx              (learnBasePriceIfMissing)
  └── gestion-clientes
        ├── ClienteFormNew.tsx       (selector perfil precio)
        └── saleClienteMapping.ts    (mapeo priceProfileId)
```

### Módulo Precios como consumidor

```
lista-precios
  ├── catalogo-articulos             (productos: nombre, SKU, unidades)
  └── shared/currency                (formateo de moneda, decimales)
```

### Sincronización: reactividad

| Fuente de cambio | Se refleja en módulo de precios | Se refleja en POS mismo render |
|-----------------|--------------------------------|-------------------------------|
| Edición en lista de precios | Sí (estado React + localStorage) | **No** (usePriceCalculator lazy) |
| Cambio en catálogo (misma sesión) | Sí (via storage event) | **No** |
| Cambio en catálogo (otra pestaña) | Sí | Parcialmente |
| Importación Excel | Sí | **No** |
| learnBasePrice | No se refleja hasta reload | **No** |

### Módulos con lógica de precio propia (riesgo de divergencia)

| Módulo | Lógica propia | Riesgo |
|--------|--------------|--------|
| `catalogo-articulos` | Campo `precio` en producto | Puede divergir de lista de precios |
| `PackagesTab` | Precio de paquete calculado desde `precio` de producto en catálogo | Aislado completamente del módulo de precios |
| POS `useCart` | `learnBasePriceIfMissing` escribe directamente en price_list_products | Puede sobreescribir precio configurado si no está vigente |

---

## 19. Hallazgos funcionales

| # | Funcionalidad | Estado | Evidencia |
|---|--------------|--------|-----------|
| F1 | CRUD de columnas | Funcional | `useColumns.ts`, `ColumnManagement.tsx` |
| F2 | Configuración regla global (P8/P9) | Funcional | `useColumns.updateColumn`, `columns.ts:applyGlobalRule` |
| F3 | Precio fijo por producto/unidad/columna | Funcional | `usePriceProducts.addOrUpdateProductPrice` |
| F4 | Precio por volumen | Funcional | `VolumeMatrixModal`, `volume.ts` |
| F5 | Tabla de precios con edición inline | Funcional | `ProductPricingTable.tsx` |
| F6 | Importación Excel con vista previa | Funcional | `importProcessing.ts`, `ImportPricesTab.tsx` |
| F7 | Exportación Excel de plantilla | Funcional | `importProcessing.ts` |
| F8 | Gestor de columnas visibles en tabla | Funcional | `PriceColumnsManagerButton.tsx` |
| F9 | Búsqueda por SKU/nombre | Funcional | `usePriceProducts.filteredProducts` |
| F10 | Precios efectivos (globales calculados) | Funcional en UI | `effectivePrices.ts` — **solo visual, no se usan en ventas** |
| F11 | Sincronización cross-tab | Funcional | Storage events en hooks |
| F12 | Migración de claves legacy | Funcional | `storage.ts:ensureTenantStorageMigration` |
| F13 | Perfil de precio en cliente | Parcial | UI conectada; POS puede no aplicar si no hay precio para la columna |
| F14 | Precio mínimo en POS | Solo UI | `minAllowedPrice` en CartItem no se valida |
| F15 | Precio mínimo en comprobantes | Solo UI | Mismo que F14 |
| F16 | Descuento/aumento global en ventas | No conectado | `effectivePrices` no llega al POS |
| F17 | Paquetes con precio de lista | No implementado | PackagesTab usa catálogo, no lista de precios |
| F18 | Paquetes en POS/comprobantes | No encontrado | No hay evidencia de consumo de paquetes en POS |
| F19 | Vigencia de precio al vender | No validado | POS usa cualquier precio sin verificar validFrom/validUntil |
| F20 | Cambio de columna base | No funcional | `setBaseColumn` es un stub |
| F21 | Precio por cliente aplicado automáticamente en POS | Parcial | Se intenta aplicar pero sin fallback visible al usuario |
| F22 | Trazabilidad de cambios de precio | No implementado | No hay historial de cambios |
| F23 | Auditoría de modificaciones | No implementado | Sin log de quién cambió qué |

---

## 20. Hallazgos técnicos

### T1 — CRÍTICO: usePriceCalculator no reactivo

**Archivo:** `hooks/usePriceCalculator.ts:42-44`

```typescript
const products = useMemo(() => loadPriceProducts(), []);
const columns  = useMemo(() => loadColumns(), []);
```

`useMemo` con `[]` solo ejecuta una vez al montar. Cualquier cambio posterior en localStorage no se refleja. Todos los consumidores (`usePriceBook`, `usePosCartAndTotals`) heredan este problema.

**Solución sugerida:** Reemplazar por `useState` + `useEffect` que escuche el evento `storage`, o usar un contexto reactivo compartido.

### T2 — ALTO: Precios de reglas globales no llegan al POS

**Archivo:** `hooks/usePriceProducts.ts:485`, `comprobantes-electronicos/...`

`effectivePrices` se construye en `usePriceProducts` y se pasa a la tabla del módulo. Pero `usePriceBook` llama a `usePriceCalculator.getPriceForColumn()` que solo lee precios **explícitos** de `price_list_products`. Las columnas P8/P9 con reglas globales solo tienen precio efectivo calculado en memoria, no guardado en `price_list_products`, por lo que el POS nunca los obtiene.

### T3 — ALTO: Sin validación de vigencia al vender

Los precios tienen `validFrom` y `validUntil`. No se verifican al resolver el precio en `usePriceBook.getUnitPriceWithFallback()`. Un precio expirado (o no aún vigente) se usará igualmente.

**Evidencia:** `usePriceCalculator.ts:56-79` — `getProductBySKU`, `getPriceForColumn`, `resolvePriceByUnit`: ninguna verifica las fechas.

### T4 — ALTO: Sin validación de precio mínimo en POS/comprobantes

`minAllowedPrice` se expone en `CartItem` pero nunca se comprueba contra `price` al confirmar venta.

### T5 — ALTO: learnBasePrice usa validUntil = '9999-12-31'

**Archivo:** `utils/learnBasePrice.ts:42`

```typescript
const validUntil = '9999-12-31';
```

Un precio "aprendido" automáticamente desde el POS tiene vigencia prácticamente infinita. Si el precio "real" cambia en el módulo de precios, pero el precio aprendido es más reciente, `hasValidConfiguredPrice()` devolverá `true` y no aprenderá el nuevo valor. El precio en la lista puede quedar desactualizado.

### T6 — MEDIO: addColumn tiene setTimeout artificial

**Archivo:** `hooks/useColumns.ts:78`

```typescript
await new Promise(resolve => setTimeout(resolve, 300));
```

Simula una llamada async. Produce un delay de 300ms innecesario en la UI. El comentario dice "Simular operación async (futuro API call)". Cuando se implemente el backend, este `setTimeout` deberá reemplazarse.

### T7 — MEDIO: PackagesTab definida en lista-precios pero usa catalogo-articulos

**Archivo:** `components/PackagesTab.tsx:3-4`

```typescript
import { useProductStore } from '../../catalogo-articulos/hooks/useProductStore';
```

Este componente debería estar en `catalogo-articulos` o la separación de responsabilidades debería clarificarse.

### T8 — MEDIO: usePriceProfilesCatalog excluye columna base de perfiles

Solo expone `kind='manual'`. El usuario no puede asignar un cliente al "Precio Base". Si se requiere en el futuro, habría que cambiar el filtro.

### T9 — MEDIO: Nombres de columnas hardcodeados en legacy IDs

`legacyIds` en `FIXED_COLUMN_DEFINITIONS` mapea IDs antiguos (`PPM`, `PPD`, `PGD`, etc.) a los nuevos. Si se introducen más cambios en IDs, se deberá mantener esta lista manualmente.

### T10 — BAJO: Código duplicado en normalización de productos

La función `normalizeStoredProduct` existe en `usePriceProducts.ts` y también en `learnBasePrice.ts`. Lógica similar de normalización de precios (isPriceObject, resolución de unidad base) está duplicada.

### T11 — BAJO: Tipos no exportados desde barrel

`hooks/index.ts` no exporta `usePriceProfilesCatalog`. Los consumidores lo importan directamente por ruta relativa.

---

## 21. Hallazgos UX/UI

### UX1 — Términos inconsistentes

| Término en UI | Término técnico | ¿Consistente? |
|--------------|----------------|:---:|
| "Columnas visibles" | `visible` (en modal) + `isVisibleInTable` (en tabla) | No — dos controles con mismo nombre aparente |
| "Precio base" | Columna con `kind='base'`, también campo `precio` en catálogo | Confuso — dos fuentes distintas |
| "Paquetes" | Sección en `/lista-precios` pero dato de catálogo | Confuso — está en el lugar incorrecto |
| "Asignar precio" | Abre `PriceModal` que también existe inline | Redundante |

### UX2 — Sin indicadores de vigencia en tabla

La tabla de productos muestra el precio de la columna sin indicar si está vigente, expirado o pendiente. Un precio configurado para el año pasado aparece igual que uno vigente.

### UX3 — Columnas P8/P9 en tabla: precio calculado pero no guardado

Si P8 tiene una regla global del 10% de descuento, la tabla muestra el precio calculado. Pero si el usuario intenta editar esa celda inline, editaría el precio explícito (no la regla). Esto puede confundir: el usuario puede creer que el precio mostrado es un valor guardado cuando es derivado.

### UX4 — Sin feedback cuando perfil de precio de cliente no tiene precios

Al seleccionar un cliente con perfil de precio "Mayorista" y ese precio no está configurado, el POS usará el precio base silenciosamente. El usuario no recibe ninguna advertencia.

### UX5 — PackagesTab en Lista de Precios es confuso

El usuario espera gestionar precios de paquetes, no crear paquetes de catálogo.

### UX6 — Mensaje de error al intentar eliminar columna fija

`deleteColumn` setea `error` con mensajes como "Las columnas globales son obligatorias". Este error aparece en el estado del hook pero no se muestra en la UI de forma persistente — depende de si el componente lee `error`.

### UX7 — Confirmación básica al eliminar paquetes

`PackagesTab.tsx` usa `window.confirm()` para confirmar eliminación. Inconsistente con el sistema de UI del resto de la aplicación.

---

## 22. Código duplicado, muerto o riesgoso

### Código duplicado

| Patrón duplicado | Archivos | Riesgo |
|-----------------|---------|--------|
| `isPriceObject()` | `usePriceProducts.ts:59` y `learnBasePrice.ts:11` | Divergencia futura |
| Normalización de precios almacenados | `usePriceProducts.normalizeStoredProduct` y `learnBasePrice.ts:~70` | Comportamiento inconsistente |
| `ensureTenantStorageMigration` llamado en 4 hooks distintos | `useColumns`, `usePriceProducts`, `usePriceCalculator`, `useCatalogSync` | Migración múltiple innecesaria |

### Código potencialmente muerto

| Elemento | Archivo | Motivo |
|----------|---------|--------|
| `countColumnsByMode()` | `columns.ts` | No se usa en ningún componente visible |
| `getOptimalQuantityBreakdown()` | `volume.ts` | No se usa en componentes del módulo |
| `getPriceRange()` | `volume.ts` | No se usa en componentes visibles |
| `setBaseColumn` expuesto por `usePriceList` | `usePriceList.ts` | Stub sin UI que lo invoque |
| `Module`, `UserMenuOption`, `Company` interfaces | `PriceTypes.ts` | Parecen reliquias de un prototipo anterior |

### Código riesgoso

| Patrón | Archivo | Riesgo |
|--------|---------|--------|
| `setTimeout(resolve, 300)` en `addColumn` | `useColumns.ts:78` | Delay artificial, debe removerse al conectar backend |
| `validUntil: '9999-12-31'` en learnBasePrice | `learnBasePrice.ts:42` | Precios auto-aprendidos nunca expiran |
| `console.error/warn` sin estructura | Múltiples archivos | En producción expone detalles internos |
| `window.confirm()` en PackagesTab | `PackagesTab.tsx` | Bloqueante, no accesible, inconsistente |

---

## 23. Riesgos de negocio

### CRÍTICO

| # | Riesgo | Evidencia | Impacto |
|---|--------|-----------|---------|
| RN1 | **Venta por debajo del precio mínimo** | `CartItem.minAllowedPrice` nunca validado contra `CartItem.price` en POS/comprobantes | Pérdida de margen, ventas fuera de política |
| RN2 | **POS usa precios desactualizados** | `usePriceCalculator` carga datos una sola vez al montar | El vendedor puede cotizar con precios incorrectos si actualizó precios en otra pestaña o en la misma sesión sin reload |
| RN3 | **Pérdida total de datos** | Todo en localStorage; sin backup, sin sync backend | Un borrado de datos del browser elimina toda la lista de precios configurada |

### ALTO

| # | Riesgo | Evidencia | Impacto |
|---|--------|-----------|---------|
| RN4 | **Perfil de precio de cliente ignorado silenciosamente** | Sin advertencia cuando columna del perfil no tiene precios | Cliente cree tener tarifa especial, se le cobra tarifa base |
| RN5 | **Precio expirado usado en venta** | Sin validación de vigencia en `usePriceBook` | Precios de campañas pasadas pueden seguir aplicándose |
| RN6 | **Reglas globales (descuento/aumento) no llegan a ventas** | `effectivePrices` solo en UI del módulo, no en POS | Descuentos configurados en P8/P9 son visuales pero no funcionan al vender |
| RN7 | **Importación masiva sin validar precio mínimo** | `applyImportedFixedPrices` no valida P2 vs P1 | Se pueden cargar configuraciones de precio inválidas en masa |
| RN8 | **Sin trazabilidad de cambios** | No hay log de quién cambió qué precio cuándo | Imposible auditar inconsistencias de precio o revertir cambios accidentales |
| RN9 | **learnBasePrice puede crear precios incorrectos** | Un precio ingresado manualmente en POS por error se aprende y persiste | Precio erróneo "aprendido" permanece como precio base |

### MEDIO

| # | Riesgo | Evidencia | Impacto |
|---|--------|-----------|---------|
| RN10 | **Precio campo `precio` en catálogo vs lista de precios** | Dos fuentes de precio para un mismo producto | Inconsistencia visible cuando `useAvailableProducts` muestra precio del catálogo y la lista muestra otro |
| RN11 | **Productos huérfanos en lista de precios** | `catalogMergedProducts` incluye productos eliminados del catálogo | Precios de productos que ya no se venden persisten y pueden confundir |
| RN12 | **Paquetes sin precio de lista** | `PackagesTab` usa precio de catálogo | Precio de paquetes no se beneficia de la gestión de listas de precios |

---

## 24. Matriz de estado por funcionalidad

| Área | Funcionalidad | Estado | Evidencia | Riesgo | Recomendación |
|------|--------------|--------|-----------|--------|---------------|
| Columnas | CRUD columnas fijas (P1-P9) | Funcional | `useColumns.ts`, `columns.ts` | Bajo | — |
| Columnas | CRUD columnas manuales (hasta 10) | Funcional | `useColumns.ts:61-103` | Bajo | — |
| Columnas | Reglas globales P8/P9 | Funcional en cálculo | `applyGlobalRule` | Alto | Conectar a ventas |
| Columnas | Cambio de columna base | Roto | `setBaseColumn` es stub | Medio | Completar o remover |
| Productos | Tabla de precios editable | Funcional | `ProductPricingTable.tsx` | Bajo | — |
| Productos | Precio fijo por producto/unidad | Funcional | `usePriceProducts.addOrUpdateProductPrice` | Bajo | — |
| Productos | Precio por volumen | Funcional | `VolumeMatrixModal`, `volume.ts` | Bajo | — |
| Productos | Validación P2 ≤ P1 | Parcial | Solo en edición directa, no en importación | Alto | Agregar en importación |
| Importación | Descarga de plantilla Excel | Funcional | `importProcessing.ts` | Bajo | — |
| Importación | Carga y vista previa | Funcional | `ImportPricesTab.tsx` | Medio | Agregar validación P2 vs P1 |
| Importación | Aplicación masiva | Funcional | `applyImportedFixedPrices` | Medio | Validar precio mínimo |
| Importación | Rollback en caso de error | No implementado | Sin transacciones | Medio | Implementar rollback |
| POS | Precio de columna seleccionada | Funcional | `usePosCartAndTotals.ts` | Bajo | — |
| POS | Reactivo a cambios de precio | No reactivo | `usePriceCalculator` deps `[]` | Crítico | Hacer reactivo |
| POS | Validación precio mínimo | Solo UI | `minAllowedPrice` en CartItem no validado | Crítico | Agregar validación |
| POS | Perfiles de precio por cliente | Parcial | Se aplica; sin feedback si falta precio | Alto | Agregar advertencia |
| POS | Reglas globales P8/P9 | No conectado | `effectivePrices` no llega a POS | Alto | Conectar o documentar |
| Comprobantes | Precio correcto al emitir | Parcial | Hereda problema de reactividad del POS | Alto | Corregir reactividad |
| Comprobantes | Vigencia de precio | No validado | Sin verificación de fechas en venta | Alto | Agregar validación |
| Clientes | Selector de perfil de precio | Funcional | `ClienteFormNew.tsx` | Medio | — |
| Clientes | Aplicación del perfil en venta | Parcial | Sin feedback si perfil sin precios | Alto | Agregar advertencia |
| Paquetes | CRUD de paquetes | Funcional (catálogo) | `PackagesTab.tsx`, `useProductStore` | Medio | Separar de lista-precios |
| Paquetes | Paquetes en POS | No encontrado | Sin evidencia de consumo | Alto | Definir si es requerido |
| Paquetes | Precio de paquete desde lista | No implementado | Usa precio de catálogo | Medio | Evaluar necesidad |
| Vigencia | Registro de vigencia | Funcional | `validFrom/validUntil` en `Price` | Bajo | — |
| Vigencia | Validación de vigencia al vender | No implementado | `usePriceBook` no verifica fechas | Alto | Implementar |
| Persistencia | Datos en localStorage | Solo localStorage | `storage.ts` | Crítico | Migrar a backend |
| Persistencia | Migración legacy keys | Funcional | `ensureTenantStorageMigration` | Bajo | — |
| Auditoría | Log de cambios de precio | No implementado | Sin ningún registro | Alto | Implementar audit log |

---

## 25. Recomendaciones priorizadas

### Crítico — Debe corregirse antes de usar en producción real

#### RC1: Hacer `usePriceCalculator` reactivo a cambios en localStorage

**Problema:** `useMemo(() => loadProducts(), [])` lee datos solo al montar. POS usa precios viejos si se actualiza la lista en la misma sesión.  
**Evidencia:** `hooks/usePriceCalculator.ts:42-44`  
**Impacto:** Vendedores pueden cotizar con precios incorrectos.  
**Propuesta:** Reemplazar por `useState` + `useEffect` con escucha del evento `storage`, similar a `useColumns` y `usePriceProducts`.  
**Archivos:** `hooks/usePriceCalculator.ts`  
**Riesgo:** Bajo — cambio aislado en un hook.  
**Dependencias:** Todos los consumidores de `usePriceCalculator` se beneficiarán automáticamente.

#### RC2: Implementar validación de precio mínimo en POS y comprobantes

**Problema:** `minAllowedPrice` en `CartItem` nunca se valida contra `price`.  
**Evidencia:** `punto-venta/hooks/useCart.tsx`, `usePosCartAndTotals.ts`  
**Impacto:** Ventas por debajo del precio mínimo sin restricción.  
**Propuesta:** En `updateCartItemPrice` y en la confirmación de venta, verificar `price >= minAllowedPrice` y mostrar advertencia/bloqueo.  
**Archivos:** `punto-venta/hooks/useCart.tsx`, `usePosCartAndTotals.ts`  
**Riesgo:** Medio — puede requerir UI de confirmación o advertencia.  
**Dependencias:** RC1 (para que el precio mínimo esté actualizado).

#### RC3: Migrar persistencia a backend

**Problema:** Todo en localStorage. Un borrado de datos del browser elimina toda la configuración de precios.  
**Evidencia:** `utils/storage.ts` — toda la persistencia es `localStorage.setItem/getItem`.  
**Impacto:** Pérdida total de datos de precios sin recuperación.  
**Propuesta:** Conectar a API/Supabase para guardar y leer precios. Usar localStorage como caché/offline, no como única fuente de verdad.  
**Archivos:** `utils/storage.ts`, todos los hooks que usen `readTenantJson/writeTenantJson`.  
**Riesgo:** Alto — cambio arquitectónico mayor.  
**Dependencias:** Diseño de schema de BD, API endpoints.

### Alto — Importante para evitar inconsistencias

#### RA1: Validar precio mínimo en importación Excel

**Problema:** `applyImportedFixedPrices` acepta P2 > P1.  
**Evidencia:** `hooks/usePriceProducts.ts:487-646` — sin validación cruzada.  
**Propuesta:** Agregar validación en el paso de preview y antes de aplicar: si P2 > P1 para el mismo SKU/unidad en la misma importación, marcar como error.  
**Archivos:** `utils/importProcessing.ts`, `hooks/usePriceProducts.ts`  
**Riesgo:** Bajo.

#### RA2: Validar vigencia de precio al resolver en ventas

**Problema:** `usePriceCalculator.getPriceForColumn` no verifica `validFrom/validUntil`.  
**Propuesta:** Agregar verificación de vigencia en `resolvePriceByUnit`. Si el precio no está vigente, devolver `undefined` (o el precio vigente más cercano).  
**Archivos:** `hooks/usePriceCalculator.ts:63-79`  
**Riesgo:** Medio — puede exponer que muchos precios tienen fechas incorrectas.

#### RA3: Advertencia cuando perfil de cliente no tiene precios en columna

**Problema:** Usuario selecciona cliente con `priceProfileId` pero la columna no tiene precios. Se usa precio base sin notificación.  
**Propuesta:** En `usePosCartAndTotals.applyPriceToItem`, verificar si el precio fue resuelto desde la columna del perfil o desde fallback, y notificar.  
**Archivos:** `punto-venta/hooks/usePosCartAndTotals.ts`  
**Riesgo:** Bajo.

#### RA4: Conectar reglas globales (P8/P9) al POS

**Problema:** `effectivePrices` con precios calculados por reglas globales existe en memoria pero no llega al POS.  
**Propuesta:** En `usePriceBook.getUnitPriceWithFallback`, si la columna es global, calcular el precio efectivo usando `applyGlobalRule` en lugar de buscar precio explícito.  
**Archivos:** `comprobantes-electronicos/shared/form-core/hooks/usePriceBook.ts`, `price-helpers/columns.ts`  
**Riesgo:** Medio — cambia el comportamiento de resolución de precios.

#### RA5: Implementar audit log de cambios de precio

**Problema:** Sin trazabilidad de cambios.  
**Propuesta:** Registrar en cada escritura: fecha, usuario, SKU, columna, valor anterior, valor nuevo. Almacenar en localStorage como interim y sincronizar con backend.  
**Archivos:** `utils/storage.ts`, `hooks/usePriceProducts.ts`  
**Riesgo:** Bajo (lectura); requiere schema para persistencia a largo plazo.

### Medio — Mejora de mantenibilidad y consistencia

#### RM1: Eliminar `setTimeout(300)` en `addColumn`

**Archivos:** `hooks/useColumns.ts:78`  
**Propuesta:** Remover el delay. Cuando se conecte a un API real, la promesa nativa será el mecanismo de espera.

#### RM2: Unificar `isPriceObject` y normalización de productos

**Archivos:** `hooks/usePriceProducts.ts:59`, `utils/learnBasePrice.ts:11`  
**Propuesta:** Mover a un archivo compartido de utilities internas del módulo.

#### RM3: Exportar `usePriceProfilesCatalog` desde barrel

**Archivos:** `hooks/index.ts`  
**Propuesta:** Agregar a exports públicos para evitar imports por ruta relativa.

#### RM4: Mover `PackagesTab` a `catalogo-articulos`

**Archivos:** `components/PackagesTab.tsx`  
**Propuesta:** El componente pertenece al módulo de catálogo, no al de precios.

#### RM5: Consolidar distinción `visible` vs `isVisibleInTable`

**Propuesta:** Clarificar en UI con etiquetas distintas: "Disponible como opción de precio" (visible) vs "Mostrar columna en tabla" (isVisibleInTable).

#### RM6: Eliminar tipos sin uso en PriceTypes.ts

**Tipos:** `Module`, `UserMenuOption`, `Company` en `models/PriceTypes.ts` — parecen reliquias de un prototipo anterior.

### Bajo — Mejoras cosméticas o futuras

#### RB1: Validar precio base ≠ 0

Agregar validación que P1 > 0 si se usa en ventas.

#### RB2: Reemplazar `window.confirm()` en PackagesTab

Usar modal de confirmación consistente con el sistema de UI.

#### RB3: Formateo consistente de errores internos

Usar un logger estructurado en lugar de `console.error/warn` directos.

#### RB4: Documentar comportamiento de learnBasePrice

Agregar comentario que explique por qué `validUntil = '9999-12-31'` y qué implica para el ciclo de vida del precio.

---

## 26. Próximos pasos sugeridos

### Sprint inmediato (antes de producción real)

1. **Implementar RC2** (validación precio mínimo en POS) — 1-2 días
2. **Implementar RC1** (reactividad de `usePriceCalculator`) — 1 día
3. **Implementar RA1** (validación P2 vs P1 en importación) — 1 día
4. **Implementar RA2** (vigencia de precio en ventas) — 1 día

### Sprint siguiente (estabilidad)

5. **Implementar RA3** (advertencia perfil sin precios)
6. **Implementar RA4** (reglas globales en POS)
7. **Implementar RA5** (audit log básico en localStorage)
8. **Implementar RM1** (remover setTimeout)

### Roadmap (arquitectura)

9. **RC3** (migración a backend) — Sprints múltiples
10. **RM4** (mover Packages a catálogo)
11. Definir si Paquetes en POS es requerido y diseñar la integración

---

## 27. Conclusión

El módulo de lista de precios de SenciYo tiene una **base arquitectónica sólida**: separación clara de responsabilidades, tipos TypeScript bien definidos, sistema de columnas flexible, importación Excel funcional y sincronización cross-tab correcta. El nivel de detalle en las definiciones de columnas fijas (P1-P9 con kinds, legacyIds y help texts) evidencia planificación cuidadosa.

Sin embargo, el módulo presenta **tres riesgos operativos críticos** que impiden su uso confiable en producción:

1. **Los precios no son confiables en el POS durante una sesión** porque `usePriceCalculator` es un hook que no reacciona a cambios en localStorage.
2. **El precio mínimo configurado nunca bloquea ni advierte** durante una venta, haciendo la funcionalidad de "precio mínimo" puramente visual.
3. **Todos los datos viven en localStorage** del navegador, sin ningún backup ni sincronización entre dispositivos o usuarios.

Las funcionalidades de descuento/aumento global (P8/P9) y perfiles de precio por cliente están **implementadas en el módulo de precios** pero **no conectadas a las ventas**, generando una brecha entre lo que el usuario configura y lo que realmente aplica en las transacciones.

La pestaña de Paquetes es conceptualmente incorrecta dentro de este módulo: gestiona entidades del catálogo de artículos y no tiene relación con la lista de precios.

Con las correcciones de prioridad Crítica (RC1, RC2) implementadas, el módulo puede usarse de forma confiable para operaciones básicas. La persistencia en backend (RC3) es indispensable para cualquier uso en entorno de producción real.

---

*Informe generado el 2026-05-17. Basado exclusivamente en el análisis estático del código del repositorio. No se modificó ningún archivo funcional.*
