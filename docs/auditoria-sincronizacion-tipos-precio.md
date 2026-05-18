# Auditoría de sincronización de tipos de precio — SenciYo

**Fecha:** 2026-05-17  
**Auditor:** Claude (solo lectura)  
**Estado del código:** Post implementación CAMBIOS 1-10 (sesiones 1-3)  
**Rama auditada:** `develop`

---

## 1. Resumen ejecutivo

El módulo de Lista de Precios de SenciYo presenta una arquitectura sólida y mayormente coherente para la gestión de tipos de precio y su sincronización con los canales POS y Comprobantes. Se identificaron **3 hallazgos críticos**, **4 hallazgos parciales** y **2 inconsistencias semánticas** que requieren atención.

**Hallazgos críticos:**

1. **`resolveMinPrice` se llama sin el parámetro `canal` en `ProductsSection.tsx`** (Comprobantes): se usa el default `'comprobantes'` del parámetro opcional, lo que es funcionalmente correcto pero estructuralmente frágil — el contrato del canal no está siendo comunicado explícitamente por el caller de Comprobantes.

2. **`predeterminadoComprobantes` no es leído en ningún archivo del módulo Comprobantes**: el valor se almacena en `price_list_canal_config` pero el módulo de Emisión Tradicional y `ProductsSection.tsx` nunca lo leen al inicializar la columna de precio. El predeterminado de Comprobantes es letra muerta — solo tiene efecto en la UI de configuración.

3. **`isVendibleColumn` en `usePriceProfilesCatalog.ts` (POS) verifica `usarEnPuntoVenta` pero `salesColumnPredicate` en `usePriceBook.ts` verifica `usarEnComprobantes`**: los dos predicados de "columna seleccionable" son distintos y correctos para sus respectivos canales. Sin embargo, `usePosCartAndTotals` usa `usePriceBook` (el de `usarEnComprobantes`) en lugar de `usePriceProfilesCatalog`, lo que significa que **el POS filtra por `usarEnComprobantes`, no por `usarEnPuntoVenta`**.

**Hallazgos adicionales de riesgo medio:**

4. `resolveProfileId` en `usePriceProfilesCatalog` busca en `orderedColumns` (todos, sin filtrar por `visible`) en la búsqueda por ID, no solo en los `profiles` (visibles + vendibles). Esto puede asignar un perfil de precio de cliente que apunta a una columna deshabilitada.

5. El predicado `!isGlobalColumn && visible !== false` en `PriceColumnsManagerButton` incluye `min-allowed` en la lista "+ Precios". La columna P2 aparece en el gestor de columnas de la tabla aunque no debería ser vendible/configurable por el usuario en la tabla de precios por producto.

---

## 2. Alcance revisado (archivos leídos)

| # | Archivo | Propósito |
|---|---------|-----------|
| 1 | `lista-precios/models/PriceTypes.ts` | Tipos/interfaces core |
| 2 | `lista-precios/models/configuracionCanales.ts` | Modelo y defaults de canales |
| 3 | `lista-precios/utils/price-helpers/columns.ts` | Constructores y filtros de columnas |
| 4 | `lista-precios/utils/price-helpers/pricing.ts` | Cálculo de precios |
| 5 | `lista-precios/utils/storage.ts` | Capa de persistencia tenantizada |
| 6 | `lista-precios/utils/tenantHelpers.ts` | Re-exporta helpers de tenant |
| 7 | `lista-precios/hooks/useColumns.ts` | Gestión de columnas con reactividad |
| 8 | `lista-precios/hooks/useConfigCanales.ts` | Predeterminados por canal |
| 9 | `lista-precios/hooks/usePriceCalculator.ts` | Hook base para acceso a datos |
| 10 | `lista-precios/hooks/usePriceList.ts` | Orquestador del módulo LP |
| 11 | `lista-precios/hooks/usePriceProfilesCatalog.ts` | Perfiles vendibles (POS) |
| 12 | `lista-precios/hooks/usePriceProducts.ts` | Gestión de precios por producto |
| 13 | `lista-precios/components/ColumnManagement.tsx` | UI gestión tipos de precio |
| 14 | `lista-precios/components/modals/ColumnModal.tsx` | Modal edición nombre |
| 15 | `lista-precios/components/product-pricing/PriceColumnsManagerButton.tsx` | "+ Precios" UI |
| 16 | `lista-precios/components/ProductPricing.tsx` | Tabla de precios por producto |
| 17 | `lista-precios/utils/importProcessing.ts` | `buildTableColumnConfigs` |
| 18 | `shared/form-core/hooks/usePriceBook.ts` | Hook precio para Comprobantes/POS |
| 19 | `shared/form-core/components/ProductsSection.tsx` | Tabla de productos en Comprobantes |
| 20 | `punto-venta/hooks/usePosCartAndTotals.ts` | Lógica cart/totales POS |
| 21 | `punto-venta/pages/PuntoVenta.tsx` | Página principal POS (parcial) |
| 22 | `punto-venta/components/client/ClientSection.tsx` | Sección cliente POS |
| 23 | `comprobantes-electronicos/pages/EmisionTradicional.tsx` | Página emisión comprobantes |
| 24 | `gestion-clientes/models/cliente.types.ts` | Modelo cliente |
| 25 | `gestion-clientes/utils/saleClienteMapping.ts` | Mapeo cliente→perfil precio |
| 26 | `gestion-clientes/components/ClienteFormNew.tsx` | Formulario cliente (con `listaPrecio`) |
| 27 | `comprobantes-electronicos/models/constants.ts` | Constantes `PRICE_TYPES` legacy |

---

## 3. Flujo esperado de sincronización

```
Lista de Precios (useColumns + useConfigCanales)
  └── localStorage: price_list_columns (tenant)
  └── localStorage: price_list_canal_config (tenant)
  
  ┌── POS (usePriceBook → salesColumnPredicate → visible + usarEnComprobantes) ← ANOMALÍA
  │     └── pos_price_column (no-tenant) ← inicialización
  │     └── priceListOptions para selector de lista
  │     └── resolveMinPrice(..., 'pos') ← CORRECTO
  │
  └── Comprobantes (usePriceBook → salesColumnPredicate → visible + usarEnComprobantes)
        └── preferredPriceColumnId = client.listaPrecio → auto-aplica
        └── baseColumnId como default ← predeterminadoComprobantes IGNORADO
        └── resolveMinPrice(sku, unitCode) ← sin canal, usa default 'comprobantes'

Clientes → listaPrecio → priceProfileId → al seleccionar → aplica en POS y Comprobantes
  └── resolveProfileId busca en TODAS las columnas (no solo visibles/vendibles)
```

---

## 4. Estado y "+ Precios" [PUNTO 1 + PUNTO 2]

### 4.1 Campo `visible` como Estado

**`column.visible`** es efectivamente el campo de Estado (habilitado/deshabilitado).

- **`ColumnManagement.tsx` línea 125**: `const isEstadoActivo = column.visible !== false;`  
- La UI muestra toggle de "ESTADO" mapeado directamente a `column.visible`.
- **Nota semántica**: el patrón `visible !== false` (no `visible === true`) significa que un valor `undefined` también se trata como habilitado. En `buildFixedColumn` (línea 226 de `columns.ts`) y `sanitizeColumn` (línea 279), esta misma semántica se aplica consistentemente en la hidratación desde localStorage, por lo que el riesgo práctico es mínimo pero existe.

**Predicados que filtran por `visible`:**

| Predicado / Filtro | Archivo | Lógica |
|---|---|---|
| `filterVisibleColumns` | `columns.ts:381` | `col.visible` (booleano directo) |
| `salesColumnPredicate` | `usePriceBook.ts:59` | `!column.visible` → false |
| `isVendibleColumn` | `usePriceProfilesCatalog.ts:11` | `!column.visible` → false |
| `tableColumns` filter | `ProductPricing.tsx:48` | `column.visible !== false` |
| `PriceColumnsManagerButton` filter | `PriceColumnsManagerButton.tsx:23` | `column.visible !== false` |
| `otroVendiblePOS/Comp` | `usePriceList.ts:43,50` | `c.visible !== false` |

**No se encontró ningún lugar que ignore `visible` y muestre igual el tipo**, a excepción de `resolveProfileId` en `usePriceProfilesCatalog.ts` (ver hallazgo 4 en sección 10).

### 4.2 `buildFixedColumn` y override para `isBase`

**Hallazgo:** `buildFixedColumn` en `columns.ts:235-236` fuerza `column.isVisibleInTable = true` cuando `definition.isBase === true`.

```typescript
if (definition.isBase) {
  column.isVisibleInTable = true;  // OVERRIDE forzado para P1
}
```

Esto asegura que **P1 siempre aparezca en la tabla de precios por producto**. Sin embargo, `column.visible` (Estado) no se fuerza — P1 sí puede ser deshabilitado si el usuario lo toggle. En la práctica, `usePriceList.toggleColumnVisible` impide deshabilitar P1 si no existe `otroVendiblePOS` y `otroVendibleComp`, lo cual es una salvaguarda correcta.

### 4.3 Filtro "+ Precios" (PriceColumnsManagerButton)

**Filtro exacto** (línea 22-24):
```typescript
columns.filter(column => !isGlobalColumn(column) && column.visible !== false)
```

- **Incluye**: `base`, `manual`, `product-discount`, `min-allowed` (P2)
- **Excluye**: `global-discount` (P8), `global-increase` (P9), columnas deshabilitadas (visible = false)

**Hallazgo (Riesgo Medio):** El filtro **incluye `min-allowed` (P2)**. La columna de precio mínimo aparece en el gestor "+ Precios" de la tabla si su Estado está habilitado. Esto permite al usuario mostrarla como columna en la tabla de precios por producto, lo cual es correcto funcionalmente (para ingresar el precio mínimo), pero visualmente puede confundir si el usuario la ve junto a las columnas vendibles. No es un bug crítico.

**`buildTableColumnConfigs`** (en `importProcessing.ts:391`):
```typescript
filterVisibleColumns(columns).filter(column => column.isVisibleInTable !== false && !isGlobalColumn(column))
```
Usa `filterVisibleColumns` que filtra `col.visible`, luego excluye globales y las que no están marcadas en tabla. También incluye `min-allowed` si su `isVisibleInTable` está activo.

---

## 5. Sincronización con Punto de Venta [PUNTO 3]

### 5.1 Predicado de columnas seleccionables en POS

**Hallazgo Crítico:** `usePosCartAndTotals.ts` usa `usePriceBook()` directamente (líneas 154-162), obteniendo `priceColumns` que provienen de `salesColumnPredicate`:

```typescript
// usePriceBook.ts:58-63
const salesColumnPredicate = (column: Column): boolean => {
  if (!column.visible) return false;
  if (column.kind === 'base') return true;
  if (column.kind !== 'manual') return false;
  return column.usarEnComprobantes !== false;  // ← VERIFICA usarEnComprobantes, NO usarEnPuntoVenta
};
```

El POS consume `priceColumns` (que aplica `salesColumnPredicate`) para construir `priceListOptions`. Esto significa que:

- Una columna con `visible=true`, `usarEnPuntoVenta=true`, `usarEnComprobantes=false` **NO aparecerá en el POS**.
- Una columna con `visible=true`, `usarEnPuntoVenta=false`, `usarEnComprobantes=true` **SÍ aparecerá en el POS** (incorrecto).

El hook `usePriceProfilesCatalog.ts` tiene el predicado correcto para POS (`isVendibleColumn` que verifica `usarEnPuntoVenta`), pero este hook **no es usado por el POS para construir sus opciones de precio**. Solo es usado en:
- `ClienteFormNew.tsx` — para el selector de `listaPrecio` en formulario de cliente
- `ClientSection.tsx` (POS) — para `resolveProfileId` al seleccionar cliente

### 5.2 Inicialización del precio seleccionado en POS

El POS lee la selección previa desde `localStorage.getItem('pos_price_column')` (clave no-tenant) vía `readStoredPriceColumn` (línea 100-110 de `usePosCartAndTotals.ts`). La función valida que el ID esté en `priceListOptions.map(o => o.id)`, con fallback a `baseColumnId`.

**Hallazgo Parcial:** `predeterminadoPuntoVenta` de `configCanales` se sincroniza **solo** como `pos_price_column` no-tenant cuando el usuario lo cambia en `useConfigCanales.setPredeterminadoPOS`. El POS lee `pos_price_column`, que puede diferir de `predeterminadoPuntoVenta` si la clave no-tenant fue escrita antes de que existiera la configuración de canales. La sincronización en `useEffect` del `useConfigCanales` (líneas 39-50) solo escribe `pos_price_column` si no está definida **y** el predeterminado no es P1.

**Hallazgo:** No hay fallback explícito si la columna almacenada en `pos_price_column` ya no está habilitada (`visible=false`). Sin embargo, `readStoredPriceColumn` valida contra `validIds` (lista de opciones actuales): si la columna guardada ya no está en la lista, cae al `fallbackId` (baseColumnId) o al primer elemento. **Este fallback funciona correctamente** en tiempo de render pero depende de que `priceListOptions` ya esté disponible al montar.

### 5.3 Aplicación del perfil de precio de cliente en POS

En `PuntoVenta.tsx` (líneas 421-451), cuando se selecciona un cliente con `priceProfileId`:
```typescript
const resolvedProfileId = preferredProfileId && priceListOptions.some((option) => option.id === preferredProfileId)
  ? preferredProfileId
  : basePriceListId;
```
Valida que el `priceProfileId` esté en `priceListOptions` antes de aplicarlo. Si no está, usa `basePriceListId`. **Este comportamiento es correcto** pero como `priceListOptions` usa `salesColumnPredicate` (que verifica `usarEnComprobantes`), el perfil puede estar disponible o no según esa condición, no según `usarEnPuntoVenta`.

---

## 6. Sincronización con Comprobantes [PUNTO 4]

### 6.1 `salesColumnPredicate` en `usePriceBook.ts`

```typescript
const salesColumnPredicate = (column: Column): boolean => {
  if (!column.visible) return false;
  if (column.kind === 'base') return true;
  if (column.kind !== 'manual') return false;
  return column.usarEnComprobantes !== false;
};
```

- **Verifica `visible`**: Sí.
- **Verifica `usarEnComprobantes`**: Sí.
- **Verifica `usarEnPuntoVenta`**: No (correcto para Comprobantes; incorrecto para POS que también usa este hook).

### 6.2 `predeterminadoComprobantes` en Comprobantes

**Hallazgo Crítico:** La búsqueda exhaustiva de `predeterminadoComprobantes` en el módulo de Comprobantes no arroja resultados. El valor se persiste en `price_list_canal_config` pero:

- `EmisionTradicional.tsx` no importa `useConfigCanales` ni `readTenantJson('price_list_canal_config')`.
- `ProductsSection.tsx` no lee `predeterminadoComprobantes`.
- La inicialización de la columna de precio en Comprobantes depende del `preferredPriceColumnId` (del cliente) o del `baseColumnId` como fallback.

**Conclusión:** El campo "Pred. Comprobantes" en la UI de configuración es almacenado pero **nunca leído por el módulo de Comprobantes**. El predeterminado de Comprobantes es efectivamente siempre P1 (base) a menos que el cliente tenga un perfil de precio configurado.

### 6.3 `ProductsSection.tsx` y `priceColumns`

`ProductsSection.tsx` sí usa `usePriceBook()` directamente (línea 424-433):
```typescript
const {
  ...
  getPriceOptionsFor,
  resolveMinPrice,
  ...
} = usePriceBook();
```
Las columnas seleccionables provienen de `selectableColumns` (que aplica `salesColumnPredicate` → `usarEnComprobantes`). **Correcto para Comprobantes.**

---

## 7. Precio mínimo por canal [PUNTO 5]

### 7.1 Firma de `resolveMinPrice`

`usePriceBook.ts` líneas 324-331:
```typescript
const resolveMinPrice = useCallback((
  sku: string,
  unitCode?: string,
  canal: 'pos' | 'comprobantes' = 'comprobantes'
): number | undefined => {
  if (!minPriceColumn) return undefined;
  if (!minPriceColumn.visible) return undefined;
  if (canal === 'comprobantes' && minPriceColumn.usarEnComprobantes === false) return undefined;
  if (canal === 'pos' && minPriceColumn.usarEnPuntoVenta === false) return undefined;
  ...
```

La firma tiene el parámetro `canal` con default `'comprobantes'`.

### 7.2 Uso en POS

`usePosCartAndTotals.ts` — **correcto**, pasa explícitamente `'pos'`:
- Línea 251: `resolveMinPrice(sku, normalizedUnit || undefined, 'pos')`
- Línea 629: `resolveMinPrice(sku, unitCode || undefined, 'pos')`

### 7.3 Uso en Comprobantes (ProductsSection.tsx)

**Hallazgo Crítico (nivel warning):** `ProductsSection.tsx` línea 710:
```typescript
const minPrice = hasSelectableColumns ? resolveMinPrice(sku, unitCode) : undefined;
```
No pasa el parámetro `canal`. El default es `'comprobantes'`, por lo que el comportamiento es **funcionalmente correcto** (evalúa `usarEnComprobantes`). Sin embargo, el caller no comunica explícitamente su intención — si el default cambia en el futuro, el comportamiento cambiaría silenciosamente. Se clasifica como **riesgo bajo** pero viola el principio de explicitación del contrato.

### 7.4 ¿`minPriceColumn` aparece como vendible?

`minPriceColumn` **no aparece** en `selectableColumns` (que usa `salesColumnPredicate`): el predicado excluye `kind !== 'manual'`, y `min-allowed` no es `manual`. Por lo tanto P2 no se muestra en el selector de precio de Comprobantes. **Correcto.**

En POS, `priceColumns` también usa `salesColumnPredicate` (que excluye `min-allowed`). P2 no aparece en el selector de POS. **Correcto.**

---

## 8. Predeterminados por canal [PUNTO 6]

### 8.1 Almacenamiento

- **`useConfigCanales`** usa clave `price_list_canal_config` (tenant, vía `readTenantJson/writeTenantJson`).
- **POS** usa adicionalmente `pos_price_column` (clave no-tenant, `localStorage.setItem` directo).
- La sincronización entre ambas claves se hace en `setPredeterminadoPOS` y en un `useEffect` al montar.

### 8.2 Cascada al deshabilitar

`usePriceList.ts` implementa cascada en tres operaciones:

**`toggleColumnVisible`** (líneas 56-72):
- Impide deshabilitar si `!otroVendiblePOS(columnId) || !otroVendibleComp(columnId)`.
- Si el deshabilitado era predeterminado POS → reasigna al fallback de `otroVendiblePOS` o `'P1'`.
- Si el deshabilitado era predeterminado Comp → reasigna al fallback de `otroVendibleComp` o `'P1'`.
- **Condición AND**: no se puede deshabilitar si falta fallback en alguno de los dos canales. Esto puede bloquear deshabilitar una columna activa en POS pero inactiva en Comprobantes (o viceversa) si el otro canal no tiene alternativa. **Riesgo de UX moderado.**

**`toggleUsarEnPOS`** (líneas 75-88):
- Impide desactivar si `!fallback` (no quedaría otra opción vendible en POS).
- Si era predeterminado POS → reasigna al fallback.

**`toggleUsarEnComprobantes`** (líneas 91-104):
- Mismo patrón que POS.

### 8.3 Predicados `otroVendiblePOS` / `otroVendibleComp`

```typescript
// usePriceList.ts:42-46
const otroVendiblePOS = (excluirId: string): Column | undefined =>
  columnsHook.columns.find(
    c => c.id !== excluirId && c.visible !== false &&
      c.usarEnPuntoVenta !== false &&
      (c.kind === 'base' || c.kind === 'manual')
  );
```

- Restringe a `kind === 'base' || 'manual'`.  **Correcto** — excluye global, product-discount, min-allowed.
- Verifica `visible !== false` Y `usarEnPuntoVenta !== false`.  **Correcto.**

### 8.4 ¿Puede quedar sin predeterminado válido?

Teóricamente no: las salvaguardas impiden deshabilitar la última opción. Sin embargo, existe el caso borde donde `predeterminadoPuntoVenta` o `predeterminadoComprobantes` apunta a una columna que es `manual` con `usarEnPuntoVenta=false` (porque la lógica `otroVendiblePOS` excluiría P2/min-allowed pero no necesariamente todas las `manual`). En la práctica, si P1 siempre tiene `usarEnPuntoVenta=true` y `usarEnComprobantes=true`, hay siempre al menos un fallback válido.

---

## 9. Nombres visibles editables [PUNTO 7]

### 9.1 `getColumnDisplayName`

`columns.ts:343`:
```typescript
export const getColumnDisplayName = (column: Column): string => column.name;
```
Simplemente retorna `column.name`. No hay lógica adicional ni fallback a ID.

### 9.2 Uso en POS

`usePosCartAndTotals.ts:167`:
```typescript
priceListOptions: priceColumns.map((column) => ({
  id: column.id,
  label: column.name,  // Usa column.name directamente
  isBase: column.isBase,
}))
```
El selector de lista de precios en POS muestra `column.name`. **Correcto.**

### 9.3 Uso en Comprobantes

`usePriceBook.ts:293`:
```typescript
options.push({
  columnId: column.id,
  label: column.name,  // Usa column.name directamente
  ...
```
**Correcto.**

### 9.4 Hardcoding de nombres

**Hallazgo menor:** En `comprobantes-electronicos/models/constants.ts:270`:
```typescript
export const PRICE_TYPES = {
  base: { value: 'base' as const, label: 'Precio Base' },
  mayorista: { value: 'mayorista' as const, label: 'Precio Mayorista' },
  ...
```
Este objeto está marcado como `TEMPORAL - SERÁ REEMPLAZADO POR MÓDULO DE PRECIOS`. No se observó uso activo en la UI de selección de precio de Comprobantes — el módulo real ya usa `column.name`. Riesgo: si algún componente legado usa `PRICE_TYPES`, mostrará nombres hardcodeados y no los nombres configurados por el usuario.

---

## 10. Clientes y perfil de precio [PUNTO 8]

### 10.1 Modelo de cliente

`cliente.types.ts:121`:
```typescript
listaPrecio?: string;  // Campo opcional en ClienteDetalle
```
El campo almacena el ID de la columna de precio (o posiblemente el nombre). En `ClienteFormData` (línea 188) también está presente.

### 10.2 Mapeo a priceProfileId

`saleClienteMapping.ts:63`:
```typescript
priceProfileId: cliente.listaPrecio,
```
Se mapea directamente `listaPrecio` → `priceProfileId` en el snapshot del cliente.

### 10.3 Aplicación al seleccionar cliente en POS

`ClientSection.tsx` (POS) línea 189:
```typescript
priceProfileId: resolveProfileId(snap.priceProfileId),
```
Se normaliza con `resolveProfileId` de `usePriceProfilesCatalog`. Luego `PuntoVenta.tsx` (líneas 442-450) usa `priceProfileId` para cambiar `selectedPriceListId` si está disponible en `priceListOptions`.

**Hallazgo Parcial:** `resolveProfileId` busca en `orderedColumns` (todas las columnas, incluyendo deshabilitadas) por ID (línea 52-55) y por nombre (línea 58-59). Si el cliente tiene un `listaPrecio` que apunta a una columna con `visible=false`, `resolveProfileId` devuelve el ID igualmente. Luego en `PuntoVenta.tsx` la validación `priceListOptions.some(o => o.id === preferredProfileId)` filtrará las columnas no visibles, resultando en el fallback a `basePriceListId`. **El comportamiento final es correcto** pero `resolveProfileId` devuelve IDs de columnas deshabilitadas, lo que es engañoso.

### 10.4 Aplicación al seleccionar cliente en Comprobantes

`EmisionTradicional.tsx` línea 940:
```typescript
const preferredPriceColumnId = clienteSeleccionadoGlobal?.priceProfileId;
```
Se pasa como prop `preferredPriceColumnId` a `ProductsSection` (línea 1661).

`ProductsSection.tsx` líneas 702-708: al agregar producto, usa `preferredPriceColumnId` como segunda opción de lookup después de `currentOption` (precio ya asignado al item), antes del fallback a base. **La lógica de aplicación del perfil es correcta** para el caso de nuevo ítem.

Para ítems ya en el carrito, el `useEffect` de `preferredPriceColumnId` (líneas 762-808) aplica el cambio activamente a todos los ítems no manuales cuando cambia el cliente.

### 10.5 Formulario de cliente con `listaPrecio`

`ClienteFormNew.tsx` usa `usePriceProfilesCatalog.profiles` para el dropdown de selección de lista de precios (líneas 2463-2476). El selector muestra solo columnas visibles + vendibles (filtradas por `isVendibleColumn`). **Sin embargo**, `isVendibleColumn` en `usePriceProfilesCatalog` verifica `usarEnPuntoVenta`, no `usarEnComprobantes`. Esto significa que el dropdown de "Perfil de precio" del cliente muestra columnas habilitadas para POS, potencialmente mostrando opciones que no estarían disponibles en Comprobantes (si `usarEnPuntoVenta=true` pero `usarEnComprobantes=false`).

---

## 11. Reactividad sin recargar [PUNTO 9]

### 11.1 `useColumns.ts`

- **Inicialización**: `readTenantJson('price_list_columns', [])` en el estado inicial.
- **Reactividad cross-tab**: `window.addEventListener('storage', handleStorageChange)` (líneas 33-47). Filtra por `lsKey('price_list_columns')`.
- **Reactividad intra-tab**: React state (`useState`/`useCallback`), actualiza mediante `applyColumnsUpdate`.
- **Persistencia**: `useEffect` que llama `writeTenantJson` cuando `columns` cambia.
- `writeTenantJson` en `storage.ts:93` dispara `window.dispatchEvent(new CustomEvent(PRICE_DATA_CHANGED_EVENT))` para notificar a otros hooks en la misma pestaña.

### 11.2 `usePriceCalculator.ts`

Escucha dos eventos (líneas 46-64):
- `window.addEventListener('storage', ...)` — cambios cross-tab.
- `window.addEventListener(PRICE_DATA_CHANGED_EVENT, reload)` — cambios intra-tab.
Recarga `products` y `columns` cuando alguno de los dos se dispara.

### 11.3 `useConfigCanales.ts`

Solo usa React state y `writeTenantJson` directamente. **No escucha `storage` events** para sincronización cross-tab. Si se cambia el predeterminado desde otra pestaña, el hook local no se actualizará.

### 11.4 POS y Comprobantes usan el mismo hook

Tanto `usePosCartAndTotals.ts` como `ProductsSection.tsx` importan `usePriceBook` desde el mismo archivo. `usePriceBook` internamente usa `usePriceCalculator`, que sí es reactivo. **Correcto.**

`usePriceProfilesCatalog` también usa `usePriceCalculator`. **Correcto.**

### 11.5 Cadena de reactividad

```
Lista de Precios edita columna
  → useColumns actualiza state + writeTenantJson
  → writeTenantJson dispara PRICE_DATA_CHANGED_EVENT
  → usePriceCalculator recarga columns (misma pestaña)
  → usePriceBook recomputa selectableColumns
  → POS/Comprobantes re-renderizan con nuevos filtros
```
**La cadena funciona correctamente dentro de la misma pestaña.**

Para cross-tab: `writeTenantJson` llama `localStorage.setItem` → `storage` event en otra pestaña → `useColumns` y `usePriceCalculator` recargan. **Correcto.**

---

## 12. Consistencia técnica [PUNTO 10]

### 12.1 Dos predicados de columna vendible

| Predicado | Archivo | Canal | Verifica `visible` | Verifica `usarEnPuntoVenta` | Verifica `usarEnComprobantes` | Incluye `base`? |
|---|---|---|---|---|---|---|
| `isVendibleColumn` | `usePriceProfilesCatalog.ts:10` | POS (nominalmente) | Sí (`!column.visible`) | Sí (`!== false`) | No | Sí |
| `salesColumnPredicate` | `usePriceBook.ts:58` | Comprobantes (y POS) | Sí (`!column.visible`) | No | Sí (`!== false`) | Sí |

**Coexistencia problemática:** `isVendibleColumn` es el predicado correcto para POS pero solo se usa en `usePriceProfilesCatalog` (para el formulario de cliente y resolución de labels). `salesColumnPredicate` es el predicado correcto para Comprobantes pero se usa **también** para POS (vía `usePriceBook`).

### 12.2 Lógica P8/P9 mezclada con tipos vendibles

- `buildFixedColumn` en `columns.ts:239-241` asigna `globalRuleType/Value` solo para `global-discount` y `global-increase`.
- El predicado `salesColumnPredicate` excluye globals con `if (column.kind !== 'manual') return false` (antes del check de `usarEnComprobantes`). **Correcto** — P8/P9 no se mezclan con vendibles.
- `PriceColumnsManagerButton` usa `!isGlobalColumn(column)` para excluir P8/P9 del gestor de columnas de tabla. **Correcto.**

### 12.3 Código de creación/eliminación de columnas

No se encontró funcionalidad de creación de nuevas columnas (más allá de las 12 fijas). `generateColumnId` en `columns.ts:294` existe pero parece no tener UI activa. Las columnas son todas fixed-definition y el usuario solo puede renombrarlas y cambiar sus flags.

### 12.4 Consistencia del patrón `!== false` vs `=== true`

La base de código usa consistentemente `value !== false` para valores booleanos opcionales (`usarEnPuntoVenta`, `usarEnComprobantes`, `visible`, `isVisibleInTable`). Este patrón trata `undefined` como `true`, lo cual es coherente con los defaults en `buildFixedColumn`. Sin embargo, `isVendibleColumn` usa `!column.visible` (línea 11) que trata `undefined` como falsy (distinto al patrón del resto). Esta pequeña inconsistencia no tiene impacto práctico porque `ensureRequiredColumns` siempre hidrataría `visible` como booleano explícito.

---

## 13. Matriz de hallazgos

| # | Área | Regla esperada | Estado real | Evidencia (archivo:función) | Riesgo | Recomendación |
|---|------|----------------|-------------|----------------------------|--------|---------------|
| 1 | Estado (`visible`) | `column.visible` controla Estado en UI y predicados | **Correcto** | `ColumnManagement.tsx:125`, `columns.ts:381` | Bajo | — |
| 2 | Estado semántica | `visible !== false` trata `undefined` como enabled | **Parcial** | `columns.ts:279`, `PriceColumnsManagerButton.tsx:23` | Bajo | Normalizar a booleano explícito en hidratación |
| 3 | `isBase` override | `buildFixedColumn` fuerza `isVisibleInTable=true` para P1 | **Correcto** | `columns.ts:235-236` | Bajo | — |
| 4 | "+ Precios" excluye globals | `!isGlobalColumn && visible !== false` | **Correcto** | `PriceColumnsManagerButton.tsx:22-24` | Bajo | — |
| 5 | "+ Precios" incluye min-allowed | P2 debería excluirse del gestor de columnas de tabla | **Parcial** | `PriceColumnsManagerButton.tsx:22-24` | Bajo-Medio | Excluir `min-allowed` del filtro de "+Precios" |
| 6 | Columnas tabla deshabilitadas | Tabla no muestra tipos con `visible=false` | **Correcto** | `ProductPricing.tsx:48` | Bajo | — |
| 7 | POS filtra por `usarEnPuntoVenta` | `priceColumns` del POS debe respetar `usarEnPuntoVenta` | **Inconsistente** | `usePosCartAndTotals.ts:154-162` usa `usePriceBook` con `salesColumnPredicate` que verifica `usarEnComprobantes` | **Alto** | Usar `isVendibleColumn` (de `usePriceProfilesCatalog`) en POS |
| 8 | POS filtra por `visible` | POS no muestra tipos deshabilitados | **Correcto** (vía `salesColumnPredicate:!column.visible`) | `usePriceBook.ts:59` | Bajo | — |
| 9 | `predeterminadoPuntoVenta` aplica en POS | POS inicializa con el predeterminado configurado | **Parcial** | `useConfigCanales.ts:25-29` escribe `pos_price_column`; POS lee `pos_price_column` | Medio | Ver hallazgo 3.2 — posible drift entre las dos claves |
| 10 | `predeterminadoComprobantes` aplica en Comprobantes | Comprobantes inicializa con el predeterminado configurado | **No implementado** | `predeterminadoComprobantes` no es leído en ningún archivo del módulo Comprobantes | **Alto** | Leer `predeterminadoComprobantes` al inicializar `ProductsSection` |
| 11 | POS usa `usarEnPuntoVenta` en `salesColumnPredicate` | Canal POS filtra por `usarEnPuntoVenta` | **Inconsistente** | `usePriceBook.ts:62` verifica `usarEnComprobantes` | **Alto** | Separar predicados: uno por canal, o pasar canal como parámetro |
| 12 | Comprobantes filtra por `usarEnComprobantes` | `salesColumnPredicate` verifica `usarEnComprobantes` | **Correcto** | `usePriceBook.ts:62` | Bajo | — |
| 13 | `resolveMinPrice` tiene parámetro `canal` | Firma incluye `canal: 'pos'|'comprobantes'` | **Correcto** | `usePriceBook.ts:324` | Bajo | — |
| 14 | POS llama `resolveMinPrice` con `'pos'` | POS pasa `'pos'` explícitamente | **Correcto** | `usePosCartAndTotals.ts:251,629` | Bajo | — |
| 15 | Comprobantes llama `resolveMinPrice` con `'comprobantes'` | Comprobantes pasa `'comprobantes'` explícitamente | **Parcial** | `ProductsSection.tsx:710` — no pasa canal, usa default `'comprobantes'` | Bajo | Pasar `'comprobantes'` explícitamente |
| 16 | `minPriceColumn` no aparece como vendible | P2 excluido de `selectableColumns` y `priceColumns` | **Correcto** | `salesColumnPredicate` excluye `kind !== manual` | Bajo | — |
| 17 | `resolveMinPrice` verifica `visible` de P2 | No se aplica P2 si está deshabilitado | **Correcto** | `usePriceBook.ts:326` | Bajo | — |
| 18 | Cascada predeterminado al deshabilitar tipo | `toggleColumnVisible` reasigna predeterminado | **Correcto** | `usePriceList.ts:64-70` | Bajo | — |
| 19 | Cascada predeterminado al desactivar canal | `toggleUsarEnPOS/Comp` reasigna predeterminado | **Correcto** | `usePriceList.ts:83-87, 99-103` | Bajo | — |
| 20 | Sistema no puede quedar sin predeterminado | Salvaguardas impiden desactivar último vendible | **Correcto** | `usePriceList.ts:62, 81, 97` (`if (!fallback) return`) | Bajo | — |
| 21 | Nombres visibles en POS/Comprobantes | `column.name` usado en selectors | **Correcto** | `usePosCartAndTotals.ts:167`, `usePriceBook.ts:293` | Bajo | — |
| 22 | `getColumnDisplayName` retorna `column.name` | Sin hardcoding de ID | **Correcto** | `columns.ts:343` | Bajo | — |
| 23 | `PRICE_TYPES` legacy no usado en UI activa | Objeto legacy puede causar hardcoding | **Riesgoso** | `constants.ts:269-275` — marcado "TEMPORAL" | Medio | Eliminar o auditar todos los usos de `PRICE_TYPES` |
| 24 | Cliente con perfil de precio | `listaPrecio` existe en modelo y formulario | **Correcto** | `cliente.types.ts:121`, `ClienteFormNew.tsx:441` | Bajo | — |
| 25 | Al seleccionar cliente en POS aplica lista | `PuntoVenta.tsx` cambia `selectedPriceListId` | **Correcto** (con matiz) | `PuntoVenta.tsx:442-450` — valida contra `priceListOptions` (que usa `usarEnComprobantes`) | Medio | Usar predicado POS correcto para validación |
| 26 | Al seleccionar cliente en Comprobantes aplica lista | `EmisionTradicional.tsx` pasa `preferredPriceColumnId` | **Correcto** | `EmisionTradicional.tsx:940,1661` | Bajo | — |
| 27 | Perfil de precio del cliente respeta `visible` | Si columna deshabilitada, no se aplica | **Correcto** (runtime) | `PuntoVenta.tsx:442` valida en `priceListOptions`; `ProductsSection.tsx:785` valida en `options` | Bajo | — |
| 28 | `resolveProfileId` solo en columnas habilitadas | Debería no devolver IDs de columnas deshabilitadas | **Inconsistente** | `usePriceProfilesCatalog.ts:52-55` busca en `orderedColumns` (todas) | Medio | Filtrar por `visible` en `resolveProfileId` |
| 29 | Reactividad cross-tab | `useColumns` y `usePriceCalculator` escuchan `storage` events | **Correcto** | `useColumns.ts:33-47`, `usePriceCalculator.ts:46-64` | Bajo | — |
| 30 | `useConfigCanales` reactivo cross-tab | Cambios desde otra pestaña se sincronizan | **No implementado** | `useConfigCanales.ts` no escucha `storage` events | Medio | Agregar listener `storage` para `price_list_canal_config` |
| 31 | Formulario cliente muestra solo vendibles en POS/Comp | Dropdown `listaPrecio` filtra por `usarEnPuntoVenta` vía `isVendibleColumn` | **Parcial** | `ClienteFormNew.tsx:441` usa `usePriceProfilesCatalog.profiles` — solo incluye `usarEnPuntoVenta`, puede mostrar opciones no disponibles en Comprobantes | Medio | Considerar mostrar columnas disponibles en ambos canales |

---

## 14. Riesgos identificados

### Riesgo ALTO

**R1 — POS usa `usarEnComprobantes` como predicado**
- El POS obtiene `priceColumns` desde `usePriceBook.salesColumnPredicate`, que verifica `usarEnComprobantes`.
- Escenario de fallo: usuario configura un tipo de precio con `usarEnPuntoVenta=true` y `usarEnComprobantes=false` esperando que solo aparezca en POS. En POS **no aparecerá** (porque el predicado del POS usa `usarEnComprobantes`). Y viceversa: tipos habilitados solo para Comprobantes aparecerán en POS.
- Impacto: Confusión operativa, precios incorrectos aplicados en POS.

**R2 — `predeterminadoComprobantes` es letra muerta**
- El campo se configura en la UI pero nunca se aplica al abrir Comprobantes.
- Comprobantes siempre inicia con P1 (base) como precio, a menos que el cliente tenga un perfil de precio.
- Impacto: Funcionalidad prometida en UI no funciona, genera expectativas falsas.

### Riesgo MEDIO

**R3 — `resolveProfileId` resuelve columnas deshabilitadas**
- El ID resuelto puede apuntar a una columna con `visible=false`. Aunque las capas subsiguientes (POS `priceListOptions.some`, ProductsSection `options.find`) lo filtrarán, el valor intermedio es incorrecto.
- Impacto potencial: debugging difícil, edge cases con clientes que tienen perfiles obsoletos.

**R4 — `useConfigCanales` no reactivo cross-tab**
- Si se cambia el predeterminado desde una pestaña distinta, la primera pestaña no actualiza su estado de `configCanales`.
- Impacto: Inconsistencia visual en la UI de configuración, aunque el impacto operativo es bajo porque POS y Comprobantes leen de localStorage directamente.

**R5 — `PRICE_TYPES` legacy en `constants.ts`**
- Objeto marcado como temporal pero sigue presente. Si algún componente no auditado lo usa para mostrar opciones de precio, mostrará nombres hardcodeados.

**R6 — Dropdown de perfil de precio en cliente filtra por `usarEnPuntoVenta` (no ambos canales)**
- Un cliente puede tener asignado un perfil que funciona en POS pero no en Comprobantes, causando que en Comprobantes caiga al precio base silenciosamente.

### Riesgo BAJO

**R7 — `resolveMinPrice` sin canal explícito en Comprobantes**
- Usa default correcto pero no comunica la intención explícitamente.

**R8 — Condición AND en `toggleColumnVisible` (falla si canal distinto no tiene fallback)**
- Escenario: tipo P3 con `usarEnPuntoVenta=true, usarEnComprobantes=false`. Si no hay otro tipo para Comprobantes, no se puede deshabilitar P3 aunque tenga otro vendible en POS. El mensaje de error no indica cuál canal bloqueó la operación.

---

## 15. Recomendaciones priorizadas

### Prioridad 1 — Críticas (corregir antes de release)

**[C1]** Unificar el predicado de POS para que use `usarEnPuntoVenta`.

Opciones:
- **Opción A**: Agregar parámetro `canal` a `usePriceBook` para que `salesColumnPredicate` use `usarEnPuntoVenta` cuando `canal='pos'`.
- **Opción B**: `usePosCartAndTotals` usa `isVendibleColumn` de `usePriceProfilesCatalog` en lugar de `salesColumnPredicate` de `usePriceBook`.
- Archivos afectados: `usePriceBook.ts`, `usePosCartAndTotals.ts`.

**[C2]** Implementar lectura de `predeterminadoComprobantes` al inicializar Comprobantes.

- `ProductsSection.tsx` o su componente padre (`EmisionTradicional.tsx`) debe leer `readTenantJson('price_list_canal_config')` y pasar el `predeterminadoComprobantes` como prop inicial de `baseColumnId` o como `preferredPriceColumnId` cuando no hay cliente seleccionado.
- Alternativamente: exponer `predeterminadoComprobantes` vía un hook accesible en Comprobantes.

### Prioridad 2 — Importantes (siguiente sprint)

**[P2-1]** Pasar `'comprobantes'` explícitamente en `ProductsSection.tsx:710` al llamar `resolveMinPrice`.

**[P2-2]** Filtrar `resolveProfileId` para que no devuelva IDs de columnas con `visible=false`. Usar `profiles` (ya filtrado) en lugar de `orderedColumns` en el lookup por ID.

**[P2-3]** Agregar listener `storage` en `useConfigCanales` para reactividad cross-tab.

**[P2-4]** Eliminar o auditar usos de `PRICE_TYPES` en `constants.ts`. Marcar para remoción.

### Prioridad 3 — Mejoras de calidad

**[P3-1]** Excluir `min-allowed` del filtro de "+Precios" en `PriceColumnsManagerButton` si se considera que el usuario no debe verla como columna de precios vendibles. (O mantenerla con separación visual clara.)

**[P3-2]** Mejorar el mensaje de error en `toggleColumnVisible` cuando la condición AND bloquea la operación — indicar cuál canal no tiene fallback.

**[P3-3]** Normalizar el uso de `visible !== false` a booleano explícito en el punto de hidratación (ya se hace en `buildFixedColumn` pero no en `sanitizeColumn` para columnas dinámicas).

**[P3-4]** Considerar si el dropdown de "Perfil de precio" en el formulario de cliente debería mostrar solo columnas disponibles en ambos canales (intersección de `usarEnPuntoVenta` y `usarEnComprobantes`) o mantener separados.

---

## 16. Conclusión

El módulo de sincronización de tipos de precio en SenciYo tiene una arquitectura bien estructurada con persistencia tenantizada, reactividad intra-pestaña y cross-tab funcional para el núcleo del módulo, y una UI de configuración clara. Las cascadas de predeterminados y las salvaguardas contra quedar sin opciones de precio están correctamente implementadas.

Los dos hallazgos críticos que requieren corrección inmediata son:

1. **El POS filtra columnas por `usarEnComprobantes` en lugar de `usarEnPuntoVenta`** — esto rompe la separación de canales que el usuario configura en la UI.
2. **`predeterminadoComprobantes` nunca es aplicado** — la configuración existe pero no tiene efecto, lo que constituye una funcionalidad incompleta que puede generar confusión en el usuario.

El resto de los hallazgos son mejoras de calidad o correcciones menores que no afectan el comportamiento funcional correcto en el happy path pero crean fragilidades y posibles edge cases a medida que el sistema escala.
