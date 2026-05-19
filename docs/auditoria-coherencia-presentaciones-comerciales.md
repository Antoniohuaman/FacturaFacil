# Auditoría de coherencia de presentaciones comerciales — SenciYo

**Fecha:** 2026-05-18
**Auditor:** Agente de auditoría Claude (claude-sonnet-4-6)
**Estado:** Solo lectura — sin modificaciones al código funcional
**Rama revisada:** `ajustes2precios`

---

## 1. Resumen ejecutivo

El módulo de presentaciones comerciales de SenciYo tiene una base arquitectónica funcional pero carece de lógica de coherencia semántica entre unidades. El sistema filtra las presentaciones disponibles **solo por familia y visibilidad**, sin aplicar ninguna regla de jerarquía (mayor/menor), sin validar si el `factorConversion` tiene sentido económico para la combinación elegida, y sin impedir combinaciones incoherentes desde el punto de vista comercial.

Los problemas más críticos son:

1. **No existe metadata jerárquica** en el modelo `Unit` — no hay campo `level`, `rank`, `parent`, `sizeRank`, `isBaseCandidate`, `isPresentationCandidate` ni `conversionDirection`.
2. **El `factorConversion` se inicializa siempre en `1`**, sin ninguna pista al usuario sobre cuál es el valor correcto.
3. **La familia PACKAGING tiene 25 unidades completamente heterogéneas** (Caja, Bolsa, Botella, Balde, Fardo, Palet, Tornillo…) sin ningún orden de tamaño — el sistema no distingue cuál es "mayor" ni "menor".
4. **La familia QUANTITY tiene jerarquía implícita** (Millar > Gruesa implícita > Docena > Media Docena > Unidad) que el sistema no captura.
5. **El POS y los Comprobantes consumen `unidadesMedidaAdicionales` sin validación adicional**, confiando completamente en que los datos del catálogo son coherentes.
6. **Lista de Precios deriva precios multiplicando el precio base por `factorConversion`** — un factor incorrecto produce precios errados silenciosamente.
7. **No existe validación de factores < 1** (ej.: presentación Gramo con base Kilogramo requeriría `factor = 0.001`), aunque el input técnicamente lo permite.

**Nivel de riesgo global:** MEDIO-ALTO para inventario futuro / BAJO-MEDIO para ventas actuales (el usuario puede corregir el factor manualmente, pero no hay guía).

---

## 2. Alcance revisado

| Archivo | Propósito |
|---|---|
| `apps/senciyo/src/pages/Private/features/configuracion-sistema/modelos/index.ts` | Modelo Unit, SUNAT_UNITS, normalización |
| `apps/senciyo/src/pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion.tsx` | Almacenamiento y dispatch de unidades |
| `apps/senciyo/src/pages/Private/features/configuracion-sistema/components/negocio/SeccionUnidades.tsx` | UI de configuración de unidades |
| `apps/senciyo/src/pages/Private/features/catalogo-articulos/models/types.ts` | Modelos Product, AdditionalUnitMeasure, ProductFormData |
| `apps/senciyo/src/pages/Private/features/catalogo-articulos/hooks/useProductForm.ts` | Lógica de formulario de producto |
| `apps/senciyo/src/pages/Private/features/catalogo-articulos/components/product-modal/ProductUnitsSection.tsx` | UI de unidad base del producto |
| `apps/senciyo/src/pages/Private/features/catalogo-articulos/components/product-modal/ProductAdditionalUnitsTable.tsx` | UI de presentaciones comerciales |
| `apps/senciyo/src/pages/Private/features/lista-precios/components/ProductPricing.tsx` | Opciones de unidades en Lista de Precios |
| `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/shared/form-core/hooks/usePriceBook.ts` | Cálculo de precio por unidad en Comprobantes/POS |
| `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/shared/form-core/components/ProductsSection.tsx` | Selector de unidad en Comprobantes |
| `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/punto-venta/hooks/usePosCartAndTotals.ts` | Unidades disponibles en POS |

---

## 3. Fuente de verdad de unidades y familias

### 3.1 Modelo Unit — campos exactos con tipos

**Archivo:** `configuracion-sistema/modelos/index.ts`, líneas 8–38

```typescript
export type UnitCategory =
  | 'SERVICIOS' | 'TIME' | 'WEIGHT' | 'VOLUME'
  | 'LENGTH' | 'AREA' | 'ENERGY' | 'QUANTITY' | 'PACKAGING';

export interface Unit {
  id: string;                    // ID único (sunat-NIU, sunat-KGM, etc.)
  code: string;                  // Código SUNAT (NIU, KGM, LTR, BX…)
  name: string;                  // Nombre SUNAT normalizado
  symbol?: string;               // Símbolo comercial editable por el usuario
  description?: string;          // Descripción (misma que name en SUNAT_UNITS)
  category: UnitCategory;        // Familia (PACKAGING, QUANTITY, WEIGHT…)
  baseUnit?: string;             // Código de la unidad base de la familia (solo WEIGHT/VOLUME/LENGTH/AREA/ENERGY/TIME)
  conversionFactor?: number;     // Factor vs. unidad base (solo métricas)
  decimalPlaces: number;         // Decimales sugeridos
  isActive: boolean;             // Activa en el sistema
  isSystem?: boolean;            // True = proviene del catálogo SUNAT
  isFavorite?: boolean;          // Marcada como favorita
  isVisible?: boolean;           // Visible en selectores de producto
  isDefault?: boolean;           // Es la unidad por defecto de su familia
  displayOrder?: number;         // Orden de visualización
  usageCount?: number;           // Contador de uso
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 ¿Existe metadata jerárquica?

**No existe.** Búsqueda exhaustiva confirma la ausencia de:

- `level` — No confirmado.
- `rank` — No confirmado.
- `hierarchy` — No confirmado.
- `parent` — No confirmado.
- `conversionDirection` — No confirmado.
- `isBaseCandidate` — No confirmado.
- `isPresentationCandidate` — No confirmado.
- `sizeRank` — No confirmado.

El campo `baseUnit` existe pero **solo en familias métricas** (WEIGHT, VOLUME, LENGTH, AREA, ENERGY, TIME) y **no existe en PACKAGING ni QUANTITY**. Es decir, el sistema tiene jerarquía implícita en las familias métricas (todos tienen `conversionFactor` relativo a la unidad base), pero PACKAGING y QUANTITY carecen completamente de ella.

El campo `displayOrder` existe en `Unit` pero su valor en SUNAT_UNITS está basado en el índice de posición del array, no en una jerarquía semántica de tamaño.

### 3.3 Familias encontradas en el catálogo

**Archivo:** `configuracion-sistema/modelos/index.ts`, líneas 52–138

El catálogo `SUNAT_UNITS` contiene exactamente **9 familias** (`UnitCategory`):

| Familia | Label UI | Unidades | Tiene baseUnit+conversionFactor |
|---|---|---|---|
| SERVICIOS | Servicios | 1 | No |
| TIME | Tiempos | 3 | Sí |
| WEIGHT | Pesos | 6 | Sí |
| VOLUME | Volúmenes | 8 | Sí |
| LENGTH | Longitudes | 7 | Sí |
| AREA | Áreas | 4 | Sí |
| ENERGY | Energías | 2 | Sí |
| QUANTITY | Cantidades | 12 | No |
| PACKAGING | Empaques | 25 | No |

### 3.4 Unidades por familia

**SERVICIOS:**
- `ZZ` — Servicio

**TIME (base: HUR = Hora):**
- `HUR` — Hora (factor 1)
- `HT` — Media hora (factor 0.5)
- `SEC` — Segundo (factor 1/3600)

**WEIGHT (base: KGM = Kilogramo):**
- `KGM` — Kilogramo (factor 1)
- `GRM` — Gramos (factor 0.001)
- `MGM` — Miligramos (factor 0.000001)
- `TNE` — Toneladas (factor 1000)
- `ONZ` — Onzas (factor 0.028349523125)
- `LBR` — Libras (factor 0.45359237)

**VOLUME (bases: LTR = Litro / MTQ = Metro cúbico):**
- `LTR` — Litro (factor 1)
- `MLT` — Mililitro (factor 0.001)
- `GLL` — Galón (factor 3.78541)
- `GLI` — Galón inglés (factor 4.54609)
- `MTQ` — Metro cúbico (factor 1, baseUnit MTQ)
- `CMQ` — Centímetro cúbico (factor 0.000001)
- `MMQ` — Milímetro cúbico (factor 0.000000001)
- `FTQ` — Pies cúbicos (factor 0.028316846592)

**LENGTH (base: MTR = Metro):**
- `MTR` — Metro (factor 1)
- `CMT` — Centímetro (factor 0.01)
- `MMT` — Milímetro (factor 0.001)
- `KTM` — Kilómetro (factor 1000)
- `INH` — Pulgadas (factor 0.0254)
- `YRD` — Yarda (factor 0.9144)
- `FOT` — Pies (factor 0.3048)

**AREA (base: MTK = Metro cuadrado):**
- `CMK` — Centímetro cuadrado (factor 0.0001)
- `MMK` — Milímetro cuadrado (factor 0.000001)
- `MTK` — Metro cuadrado (factor 1)
- `FTK` — Pies cuadrados (factor 0.09290304)

**ENERGY (base: KWH = Kilovatio hora):**
- `KWH` — Kilovatio hora (factor 1)
- `MWH` — Megavatio hora (factor 1000)

**QUANTITY (sin baseUnit, sin conversionFactor):**
- `NIU` — Unidad
- `C62` — Piezas
- `CEN` — Ciento de unidades
- `MIL` — Millar
- `UM` — Millón
- `DZN` — Docena
- `QD` — Cuarto de docena
- `HD` — Media docena
- `DZP` — Docena de paquetes
- `PR` — Par
- `SET` — Juego
- `KT` — Kit

**PACKAGING (sin baseUnit, sin conversionFactor — 25 unidades):**
- `BX` — Caja
- `BG` — Bolsa
- `BO` — Botellas
- `BJ` — Balde
- `BLL` — Barril
- `SA` — Saco
- `PK` — Paquete
- `CH` — Envase
- `JR` — Frasco
- `JG` — Jarra
- `AV` — Cápsula
- `CT` — Cartón
- `CA` — Latas
- `BE` — Fardo
- `CY` — Cilindro
- `U2` — Blister
- `LEF` — Hoja
- `ST` — Pliego
- `TU` — Tubos
- `RL` — Carrete
- `RD` — Varilla
- `PG` — Placas
- `PF` — Paletas
- `BT` — Tornillo
- `RM` — Resma

---

## 4. Unidad base del producto

### 4.1 Nombre en código vs nombre en UI

| Concepto | Campo en código | Label en UI |
|---|---|---|
| Unidad base del producto | `formData.unidad` (string con el código SUNAT) | "Unidad mínima *" |
| Tooltip | — | "Unidad base para stock y ventas (ej.: Unidad, Kg)." |
| Presentaciones adicionales | `formData.unidadesMedidaAdicionales[]` | "Presentaciones comerciales" |

**Archivo:** `ProductUnitsSection.tsx`, líneas 130–135 (label "Unidad mínima") y línea 134 (tooltip).

El nombre "Unidad mínima" comunica correctamente la intención: es la unidad de stock y la unidad de referencia para el `factorConversion`. Sin embargo, no hay ningún texto que explique explícitamente que el `factorConversion` de cada presentación debe ser "cuántas unidades mínimas contiene esa presentación".

### 4.2 Uso real como base operativa

La unidad base (`product.unidad`) es el denominador de todas las conversiones. En `usePriceBook.ts` línea 74–75:

```typescript
const baseCode = normalizeUnitCode(product.unidad);
if (normalizedTarget === baseCode) {
  return 1;  // precio directo, sin multiplicación
}
```

Para cualquier presentación adicional, el precio se calcula como:
```
precioPresentation = precioBase * factorConversion
```

Esto implica que si base = Unidad (NIU) y presentación = Caja con `factorConversion = 12`, el precio de la caja = precio unitario × 12. La semántica es **"cuántas unidades mínimas hay en la presentación"**.

---

## 5. Cómo se generan hoy las presentaciones comerciales

### 5.1 Función/lógica de filtrado

No existe una función dedicada con nombre `getAvailableUnitsForAdditional` o `availableUnitsForAdditional` o `unitsForPresentation`. La lógica está distribuida en tres variables calculadas en `useProductForm.ts`:

**Variable `filteredUnitsForFamily`** (líneas 276–278):
```typescript
const filteredUnitsForFamily = useMemo(() => {
  return sortedVisibleUnits.filter(unit => unit.category === selectedUnitFamily);
}, [sortedVisibleUnits, selectedUnitFamily]);
```

**Variable `remainingUnitsForAdditional`** (líneas 294–301):
```typescript
const remainingUnitsForAdditional = useMemo(() => {
  const usedCodes = new Set<string>([
    formData.unidad,
    ...formData.unidadesMedidaAdicionales.map(unit => unit.unidadCodigo)
  ]);
  const allowedOptions = filteredUnitsForFamily.length > 0 ? filteredUnitsForFamily : sortedVisibleUnits;
  return allowedOptions.filter(unit => !usedCodes.has(unit.code));
}, [formData.unidad, formData.unidadesMedidaAdicionales, filteredUnitsForFamily, sortedVisibleUnits]);
```

**Función `getAdditionalUnitOptions`** (líneas 484–496):
```typescript
const getAdditionalUnitOptions = useCallback(
  (rowIndex: number) => {
    const allowedOptions = filteredUnitsForFamily.length > 0 ? filteredUnitsForFamily : sortedVisibleUnits;
    return allowedOptions.filter(unit => {
      if (unit.code === formData.unidad) return false;
      return (
        unit.code === formData.unidadesMedidaAdicionales[rowIndex]?.unidadCodigo ||
        !formData.unidadesMedidaAdicionales.some((other, idx) => idx !== rowIndex && other.unidadCodigo === unit.code)
      );
    });
  },
  [filteredUnitsForFamily, sortedVisibleUnits, formData.unidad, formData.unidadesMedidaAdicionales]
);
```

**Variable `visibleUnits`** (líneas 173–175):
```typescript
const visibleUnits = useMemo(() => {
  return availableUnits.filter(unit => unit.isActive !== false && unit.isVisible !== false);
}, [availableUnits]);
```

### 5.2 ¿Solo filtra por familia + excluir base?

**Sí, exactamente eso.** Las reglas de filtrado para presentaciones son:

1. La unidad debe ser `isActive !== false` AND `isVisible !== false` (línea 174).
2. La unidad debe pertenecer a `selectedUnitFamily` (misma familia que la unidad base).
3. La unidad no puede coincidir con `formData.unidad` (la unidad base).
4. La unidad no puede coincidir con otra presentación ya agregada.
5. Fallback: si no hay unidades visibles en la familia, muestra todas las visibles del sistema.

No hay ninguna lógica adicional de coherencia semántica: tamaño, jerarquía, dirección de conversión, ni validación de que el factor sea razonable para la combinación.

### 5.3 ¿Hay validación de coherencia?

En `validateForm` (líneas 721–752), la única validación sobre `unidadesMedidaAdicionales` es:

- `unit.unidadCodigo` no puede estar vacío → "Selecciona una unidad"
- `unit.unidadCodigo` no puede coincidir con `formData.unidad` → "No puede coincidir con la unidad base"
- `unit.unidadCodigo` no puede estar duplicado → "Unidad repetida"
- Si no se usa fallback: `unit.category !== selectedUnitFamily` → "No coincide con la familia seleccionada"
- `unit.factorConversion <= 0` → "El campo 'Contiene' debe ser mayor a 0"

**No hay validación de:**
- Si el factor es `1` (valor por defecto) — no advierte que probablemente es incorrecto
- Si el factor < 1 (presentación "menor" a la base)
- Si la combinación base/presentación tiene sentido semántico (ej. Kilogramo base, Gramo presentación con factor 0.001)
- Si la presentación podría ser "mayor" o "menor" que la base

---

## 6. Problemas de coherencia detectados

### Problema 1: Factor de conversión inicializado en 1 sin guía

**Archivo:** `useProductForm.ts`, línea 427:
```typescript
factorConversion: 1,
```

Cuando el usuario agrega una presentación, el sistema elige automáticamente la primera unidad disponible de la familia y le asigna `factorConversion: 1`. Esto significa que, por defecto, una "Caja" contiene "1 Unidad" — lo cual es comercialmente erróneo en casi todos los casos reales.

**Riesgo:** El usuario puede no notar este valor y guardar con `factorConversion: 1`. En Lista de Precios, el precio de la Caja sería idéntico al de la Unidad. En Comprobantes y POS, se calculará un precio incorrecto silenciosamente.

### Problema 2: Familia PACKAGING sin jerarquía — combinaciones absurdas permitidas

La familia PACKAGING tiene 25 unidades sin ninguna relación semántica entre sí. El sistema permite cualquiera de estas combinaciones sin advertencia:

- Base: **Caja**, Presentación: **Tornillo** (BT) — sin sentido comercial
- Base: **Barril**, Presentación: **Cápsula** — sin sentido comercial
- Base: **Hoja** (LEF), Presentación: **Paletas** (PF) — la presentación es más grande, pero también podría ser menor
- Base: **Fardo**, Presentación: **Caja** — puede tener sentido (si un fardo contiene múltiples cajas) o no (si la caja es más grande)
- Base: **Bolsa**, Presentación: **Resma** — sin sentido comercial

### Problema 3: Factor < 1 no validado semánticamente

El input tiene `min="0.0001"` y `step="0.0001"` (línea 139, `ProductAdditionalUnitsTable.tsx`), lo que técnicamente permite ingresar factores fraccionarios. Casos válidos pero confusos:

- Base: Kilogramo, Presentación: Gramo, Factor: 0.001 → ¿Es la presentación menor a la base? ¿Tiene sentido comercial como "presentación"?
- Base: Litro, Presentación: Mililitro, Factor: 0.001 → Similar al anterior

El `tooltip` de "Contiene" dice "Cantidad de unidades mínimas que incluye esta presentación" (línea 125, `ProductAdditionalUnitsTable.tsx`). Si se asigna factor 0.001 para Gramo con base Kilogramo, se interpreta como "1 Gramo contiene 0.001 Kilogramos" — técnicamente correcto como conversión, pero semánticamente invertido respecto a la dirección esperada de "presentación comercial" (que debería ser mayor o igual a la base).

### Problema 4: Familia QUANTITY tiene jerarquía implícita no capturada

La jerarquía natural de QUANTITY es:
```
Millón > Millar > Ciento > Docena de paquetes > Docena > Media docena > Cuarto de docena > Par > Unidad/Pieza
```
El sistema no captura esta jerarquía. Un usuario puede definir Base: Millar, Presentación: Unidad, con `factorConversion: 0.001`, lo cual invierte la dirección de conversión esperada.

### Problema 5: Unidades PACKAGING con conversionFactor propio del catálogo SUNAT vacío

Las 25 unidades de PACKAGING tienen `conversionFactor: undefined` y `baseUnit: undefined`. No existe ninguna referencia en el catálogo SUNAT a cuántas Unidades hay en una Caja, porque eso varía por producto. Esto es correcto conceptualmente — el factor es por producto — pero el sistema no lo comunica claramente al usuario, quien podría asumir que el factor ya está precargado.

### Problema 6: Tooltip de "Presentaciones comerciales" no explica la semántica del factor

**Archivo:** `ProductAdditionalUnitsTable.tsx`, línea 48:
```
Tooltip: "Crea equivalencias: caja = 12 unidades, pack = 6, etc."
```

El ejemplo "caja = 12 unidades" es correcto pero solo válido cuando la familia es QUANTITY con unidad base Unidad. No existe ninguna orientación sobre qué ingresar cuando la familia es PACKAGING, WEIGHT, o VOLUME.

---

## 7. Análisis por familias de unidades

### 7.1 Familia Empaques/PACKAGING

**Unidades:** Caja, Bolsa, Botella, Balde, Barril, Saco, Paquete, Envase, Frasco, Jarra, Cápsula, Cartón, Latas, Fardo, Cilindro, Blister, Hoja, Pliego, Tubos, Carrete, Varilla, Placas, Paletas, Tornillo, Resma (25 total)

**¿Hay jerarquía entre ellas?** No en el sistema, pero sí existe una jerarquía implícita natural para algunas:
- Pallet > Fardo > Caja > Paquete (para distribución logística)
- Barril > Balde (para volúmenes líquidos)
- Blister/Cápsula → contenedor individual de medicamento

**¿Cuál es naturalmente "mayor"?** Depende del producto. No hay un orden universal aplicable a los 25.

**¿El sistema lo sabe?** No.

**Riesgo:** ALTO. El usuario puede combinar cualquier par sin advertencia. La familia es heterogénea por definición (SUNAT la usa para cualquier tipo de envase comercial), y el usuario que no entienda la semántica puede definir combinaciones sin sentido.

**Caso concreto problemático:**
- Base: `NIU` (QUANTITY), Presentación: `BX` (PACKAGING) — estas son familias distintas. El sistema rechaza esto correctamente porque el filtro de familia lo excluye. PERO si el usuario pone Base: `BX` (Caja, PACKAGING) y Presentación: `BO` (Botellas, PACKAGING), factor 12, el sistema lo acepta aunque el significado es ambiguo (¿12 botellas en una caja? ¿o la caja pesa 12 veces una botella?).

### 7.2 Familia Cantidades/QUANTITY

**Unidades:** Unidad, Piezas, Ciento, Millar, Millón, Docena, Cuarto de docena, Media docena, Docena de paquetes, Par, Juego, Kit (12 total)

**¿Hay jerarquía implícita?** Sí, parcialmente:
- Millón (1.000.000 U) > Millar (1.000 U) > Ciento (100 U) > Docena (12 U) > Media Docena (6 U) > Cuarto de Docena (3 U) > Par (2 U) > Unidad (1 U)
- Juego y Kit son conceptualmente distintos (no tienen cantidad fija)

**¿El sistema lo captura?** No. No hay `conversionFactor` ni `baseUnit` en las unidades QUANTITY.

**Caso típico correcto:** Base: Unidad (NIU), Presentación: Docena (DZN), factor: 12. El sistema lo permite y es semánticamente correcto.

**Caso problemático permitido:** Base: Millar, Presentación: Unidad, factor: 1. El sistema lo acepta (factor > 0, familia misma), pero si el usuario no cambia el factor de 1 al valor correcto (0.001), el precio de "1 Unidad" sería igual al precio del "1 Millar".

### 7.3 Familia Pesos/WEIGHT

**Unidades:** Kilogramo, Gramos, Miligramos, Toneladas, Onzas, Libras (6 total)

**¿Hay jerarquía implícita?** Sí, y está capturada en `conversionFactor` relativo a KGM:
- Tonelada (1000 KGM) > Kilogramo (1) > Libra (0.454) > Onza (0.028) > Gramo (0.001) > Miligramo (0.000001)

**¿El sistema lo captura?** Parcialmente. El `conversionFactor` existe en el catálogo pero **no se usa en absoluto en la lógica de presentaciones** — es solo metadata del catálogo SUNAT, no se usa para pre-calcular el `factorConversion` de la presentación.

**Caso correcto:** Base: Kilogramo, Presentación: Gramo, factor: 0.001 (1 Gramo = 0.001 Kg).

**Caso problemático:** Si el `conversionFactor` del catálogo se usara como sugerencia automática para el `factorConversion` de la presentación, la UX sería mucho mejor. Actualmente el usuario debe calcularlo manualmente.

**Pregunta de negocio:** ¿Una presentación en Gramos tiene sentido cuando la unidad base es Kilogramo? La respuesta es "sí" en farmacia/especias/joyería — se vende "1 gramo" de producto que se controla en stock por kilogramo. Pero el `factorConversion = 0.001` implica que el precio de "1 Gramo" = precio_base × 0.001. Esto puede no tener sentido si el precio ya está dado por Kg y el gramo tiene precio diferente por economías de escala.

### 7.4 Familia Volúmenes/VOLUME

**Unidades:** Litro, Mililitro, Galón, Galón inglés, Metro cúbico, Centímetro cúbico, Milímetro cúbico, Pies cúbicos (8 total, 2 sub-bases)

**Nota arquitectónica:** VOLUME tiene dos sub-familias internas (base LTR y base MTQ) que no están separadas en la familia. Un usuario que pone Base: Litro, Presentación: Metro cúbico está mezclando sub-familias, aunque el factor correcto (1000) es calculable.

**Caso correcto:** Base: Litro, Presentación: Galón, factor: 3.785 (1 Galón = 3.785 Litros).

**Caso ambiguo:** Base: Litro, Presentación: Mililitro, factor: 0.001. Es técnicamente correcto pero semánticamente invertido como "presentación comercial" (la presentación es menor que la base).

### 7.5 Familia Longitudes y Áreas

**Longitudes (7):** Metro, Centímetro, Milímetro, Kilómetro, Pulgadas, Yarda, Pies

**Áreas (4):** Centímetro cuadrado, Milímetro cuadrado, Metro cuadrado, Pies cuadrados

Estas familias son menos problemáticas en comercio. Las presentaciones para telas, cables, madera, vidrio tienen sentido (Base: Metro, Presentación: Milímetro es raro; Base: Metro, sin presentación adicional suele bastar).

**Riesgo:** BAJO para el uso comercial típico.

### 7.6 Otras familias

**TIME:** Hora, Media hora, Segundo. Contexto de servicios. Combinaciones de presentación son raras pero posibles (ej.: Base: Hora, Presentación: Segundo con factor 3600). El sistema lo permite sin advertencia.

**ENERGY:** Kilovatio hora, Megavatio hora. Solo 2 unidades. La jerarquía es obvia (MWH = 1000 KWH) y el `conversionFactor` existe.

**SERVICIOS:** Solo "Servicio" (ZZ). No tiene sentido agregar presentaciones a un servicio. El sistema no lo impide explícitamente — si el usuario tiene familia SERVICIOS seleccionada, la única unidad disponible es ZZ, así que `remainingUnitsForAdditional` quedaría vacía y no podría agregar presentaciones. Este es un caso bien manejado.

---

## 8. Opciones de regla de negocio

### Opción A: Status Quo (sin cambios)
**Descripción:** Mantener el filtro actual: misma familia + excluir base + excluir ya usadas.

**Pros:**
- Sin costo de desarrollo.
- Flexibilidad máxima (el usuario puede hacer cualquier combinación).

**Contras:**
- Factor `1` por defecto engaña al usuario.
- No hay guía sobre qué factor usar.
- Errores silenciosos en precios.

**Impacto:** ALTO riesgo de datos incorrectos en producción.

### Opción B: Sugerencia de factor basada en conversionFactor del catálogo
**Descripción:** Para unidades métricas (WEIGHT, VOLUME, LENGTH, AREA, ENERGY, TIME), pre-calcular el `factorConversion` sugerido usando `conversionFactor` del catálogo SUNAT: `factor = unidadPresentacion.conversionFactor / unidadBase.conversionFactor`.

**Ejemplo:** Base: Kilogramo (factor=1), Presentación: Tonelada (factor=1000) → sugerencia = 1000/1 = 1000.

**Pros:**
- Reduce errores de usuario en familias métricas.
- No requiere nueva metadata.
- Uso de datos que ya existen en `SUNAT_UNITS`.

**Contras:**
- No aplica a PACKAGING ni QUANTITY (no tienen conversionFactor).
- Sigue siendo una "sugerencia" — el usuario puede cambiarla.

**Impacto:** MEDIO desarrollo, ALTO valor para familias métricas.

### Opción C: Campo "dirección" en la presentación (MAYOR / MENOR / EQUIVALENTE)
**Descripción:** Agregar al UI una pregunta: "¿Esta presentación es mayor, menor o equivalente a la unidad base?" y ajustar la validación y la visualización del factor en consecuencia.

**Pros:**
- Guía UX clara para el usuario.
- Permite validar que el factor sea > 1 si es "mayor" o < 1 si es "menor".

**Contras:**
- Requiere cambio en modelo `AdditionalUnitMeasure`.
- Agrega complejidad al formulario.
- No funciona bien para PACKAGING donde el usuario no sabe a priori si la presentación es mayor.

**Impacto:** ALTO desarrollo, MEDIO valor.

### Opción D: Advertencia soft cuando factor = 1 (MVP inmediato)
**Descripción:** Mostrar un mensaje de advertencia en la UI cuando `factorConversion === 1`, indicando: "¿Seguro que esta presentación contiene exactamente 1 unidad mínima?"

**Pros:**
- Cero cambios en modelo de datos.
- Cero cambios en lógica de negocio.
- Reduce el principal riesgo: guardar con factor=1 por error.
- 1–2 horas de desarrollo.

**Contras:**
- No impide el error.
- No guía sobre el factor correcto.

**Impacto:** BAJO desarrollo, ALTO valor inmediato.

### Opción E: Jerarquía explícita en PACKAGING mediante nuevo campo `sizeRank`
**Descripción:** Agregar `sizeRank?: number` a `SunatUnitCatalogItem` para dar un orden de tamaño relativo dentro de la familia. El UI filtraría presentaciones que sean de tamaño mayor al de la unidad base.

**Pros:**
- Soluciona el problema de fondo en PACKAGING.
- Permite validación semántica real.

**Contras:**
- Requiere asignación manual de `sizeRank` para las 25 unidades de PACKAGING.
- La asignación es subjetiva (Fardo puede ser mayor o menor que Caja según el sector).
- Rompe casos legítimos donde la presentación es menor (ej.: Base: Fardo, Presentación: Caja).

**Impacto:** ALTO desarrollo, MEDIO valor (la subjetividad limita su efectividad).

---

## 9. Impacto en Lista de Precios

**Archivo:** `ProductPricing.tsx`, líneas 116–146 (función `getUnitOptions`)

```typescript
const getUnitOptions = useCallback((product: Product) => {
  const catalogProduct = catalogProducts.find(p => p.codigo === product.sku);
  // ...
  if (catalogProduct) {
    addOption(catalogProduct.unidad, true);  // unidad base
    catalogProduct.unidadesMedidaAdicionales?.forEach(
      unit => addOption(unit.unidadCodigo, false, unit.factorConversion)
    );
  }
  // ...
}, [catalogProducts, getUnitDisplay, resolveActiveUnit]);
```

**Hallazgos:**
1. `getUnitOptions` toma **todas** las `unidadesMedidaAdicionales` del producto sin ninguna validación adicional de coherencia.
2. El `factor` se muestra en la UI del menú de selección de unidad (como metadata), pero no se valida si es razonable.
3. En `usePriceBook.ts` línea 225: `price: roundCurrency(baseUnitPriceValue * factor)` — el precio de la presentación se calcula multiplicando el precio de la unidad base por el `factorConversion`. Si el factor es 1 (incorrecto), el precio de la presentación será idéntico al de la base. Si el factor es 0.001 (presentación menor), el precio será 0.001 × precio_base — potencialmente un precio de centavos.
4. No hay validación de si el precio derivado es razonable (ej.: precio < 0.01, o precio > X%).

**Conclusión:** Lista de Precios confía completamente en el `factorConversion` del catálogo. Un factor incorrecto produce precios incorrectos de forma silenciosa.

---

## 10. Impacto en POS

**Archivo:** `usePosCartAndTotals.ts`, líneas 36–56 (función interna)

```typescript
product.unidadesMedidaAdicionales?.forEach((u) => {
  if (u?.unidadCodigo) {
    options.push({ code: u.unidadCodigo, isBase: false });
  }
});
```

**Hallazgos:**
1. El POS toma todas las `unidadesMedidaAdicionales` sin validación de coherencia.
2. Las unidades son listadas como opciones de selección para el vendedor.
3. El precio por unidad en POS también usa `usePriceBook` → mismo cálculo `precio_base × factor`.
4. Si un vendedor selecciona una presentación con `factor = 1` (incorrecto), se emitirá el comprobante al mismo precio que la unidad mínima — error silencioso y difícil de detectar post-venta.

---

## 11. Impacto en Comprobantes

**Archivo:** `ProductsSection.tsx`, líneas 43–61

```typescript
const presentationUnits = product?.unidadesMedidaAdicionales ?? [];
presentationUnits.forEach((u) => {
  if (!u?.unidadCodigo) return;
  const code = u.unidadCodigo;
  const exists = options.some((opt) => opt.code === code);
  if (!exists) {
    options.push({ code, label: getUnitLabelForSku(sku, code) });
  }
});
```

**Hallazgos:**
1. Comprobantes también toma **todas** las `unidadesMedidaAdicionales` sin validación.
2. El operador de facturación puede seleccionar cualquier presentación definida en el producto.
3. El precio se calcula en `usePriceBook.ts` línea 225: `roundCurrency(baseUnitPriceValue * factor)`.
4. La unidad elegida en el comprobante electrónico (campo SUNAT) es el código SUNAT de la presentación (ej.: `BX` para Caja). SUNAT valida el código, no el factor — el factor solo afecta el precio calculado.

**Riesgo SUNAT:** Bajo — SUNAT no valida la coherencia del factor de conversión. El riesgo es financiero/comercial, no normativo.

---

## 12. Impacto futuro en Stock y Kardex

### 12.1 Datos mínimos para Kardex

Para implementar un Kardex funcional con conversiones entre presentaciones, el sistema necesita:

1. **`factorConversion` correcto y confiable** — actualmente no validado.
2. **Unidad de stock** definida explícitamente (¿se controla por unidad base o por presentación?).
3. **Dirección de conversión** clara: "1 Caja = 12 Unidades" vs. "12 Unidades = 1 Caja".
4. **Política de fraccionamiento**: ¿se puede vender fracción de una Caja (ej.: 0.5 Cajas = 6 Unidades)?

El modelo actual `AdditionalUnitMeasure` carece de campos para (2), (3) y (4).

### 12.2 Riesgo de conversiones decimales

Si la unidad base es PACKAGING (ej.: Caja) y una presentación es "Paquete" con factor 0.5 (media caja), el stock en unidades mínimas generaría fracciones. El campo `decimalPlaces` existe en `Unit` pero no en `AdditionalUnitMeasure` — no hay control de cuántos decimales permite el stock de una presentación.

**Riesgo ALTO:** Kardex con conversiones decimales puede producir inconsistencias si el sistema de stock no redondea correctamente.

### 12.3 Qué debe resolverse antes del módulo de inventario

Antes de implementar Kardex/Inventario con múltiples presentaciones, se deben resolver:

1. **Validar y sanitizar todos los `factorConversion` existentes** en la base de datos — detectar factores = 1 que probablemente son incorrectos.
2. **Definir la unidad de stock** a nivel de producto: ¿siempre es la unidad mínima (`product.unidad`)? Confirmarlo explícitamente en el modelo.
3. **Agregar `decimalPlaces` a `AdditionalUnitMeasure`** o al menos heredarlo de la unidad referenciada.
4. **Política de fraccionamiento**: decidir si el sistema permite vender fracciones de presentaciones y cómo se redondea el stock.
5. **Auditoría de datos**: revisar todos los productos existentes con `unidadesMedidaAdicionales` y detectar inconsistencias antes de activar el control de stock.

---

## 13. Recomendación UX

### 13.1 Cambios inmediatos (sin nueva metadata)

**Prioridad CRÍTICA:**

1. **Advertencia cuando `factorConversion === 1` al guardar o al cambiar la unidad** (Opción D):
   - Texto sugerido: "El valor 'Contiene' es 1. ¿Esta presentación realmente contiene 1 [unidad mínima]? Si no, actualiza el valor antes de guardar."
   - Implementación: verificación en `validateForm` → `rowErrors.factor = 'warning'` o en la UI como indicador visual.

2. **Mejorar el label del campo "Contiene"** con ejemplo contextual:
   - Actual: "Contiene" + tooltip genérico.
   - Propuesto: "Contiene (ej.: si 1 Caja = 12 Unidades, ingresa 12)" — usando la unidad base actual en el ejemplo dinámico.

3. **Placeholder con valor sugerido** para familias métricas: si existen `conversionFactor` en el catálogo, pre-calcular el factor sugerido y mostrarlo como placeholder (Opción B).

**Prioridad ALTA:**

4. **Validación de factor < 1 con mensaje explicativo**: "Este valor indica que la presentación es menor a la unidad base. ¿Es correcto? Considera si la unidad base debería ser la presentación más pequeña."

5. **Texto informativo sobre la semántica** de la tabla: "Define cuántas [unidades mínimas] contiene cada presentación. Los precios se calcularán automáticamente multiplicando el precio base por este valor."

### 13.2 Cambios con nueva metadata

6. **Agregar `suggestedFactor?: number` a `SunatUnitCatalogItem`** para las combinaciones más comunes (ej.: NIU→DZN = 12, NIU→MIL = 1000, KGM→TNE = 1000).
7. **Agregar `sizeRank?: number` a `SunatUnitCatalogItem` en PACKAGING** para filtrar presentaciones mayores a la base.
8. **Agregar campo `decimalPlaces` a `AdditionalUnitMeasure`** para preparación de Kardex.
9. **Agregar `conversionDirection: 'UP' | 'DOWN' | 'EQUIVALENT'`** para orientar la validación de factores.

---

## 14. Matriz de decisión

| Tema | Situación actual | Riesgo | Recomendación | Prioridad |
|---|---|---|---|---|
| Factor inicializado en 1 | `factorConversion: 1` hardcodeado (useProductForm.ts:427) | ALTO: precios incorrectos silenciosos | Advertencia cuando factor=1, cambiar default a vacío/null | CRÍTICA |
| Jerarquía en PACKAGING | 25 unidades sin orden de tamaño | MEDIO: combinaciones sin sentido | Advertencia soft en combinaciones heterogéneas | ALTA |
| Jerarquía en QUANTITY | Sin baseUnit/conversionFactor | BAJO-MEDIO: usuario debe calcular manualmente | Sugerencia de factor basada en conocimiento del dominio | ALTA |
| Sugerencia de factor en métricas | conversionFactor en catálogo no se usa para sugerencias | MEDIO: usuario calcula manualmente con riesgo de error | Implementar Opción B (pre-cálculo desde conversionFactor) | MEDIA |
| Factor < 1 | Permitido sin advertencia | MEDIO: presentación "menor" a base | Advertencia contextual | MEDIA |
| Downstream sin validación | POS/Comprobantes/Precios consumen sin validar | ALTO si datos son incorrectos | Validar coherencia en guardado del producto | ALTA |
| Kardex futuro | AdditionalUnitMeasure sin unidad de stock ni decimales | ALTO cuando se active inventario | Ampliar modelo antes de activar stock | ALTA |
| Lint del proyecto | `npm run lint:senciyo` sale con exit code 0 | N/A | Sin acción requerida | N/A |

---

## 15. Plan de acción sugerido

### Fase 1 — MVP inmediato (sin cambios de modelo, 1–3 días)

1. **Cambiar `factorConversion: 1` a `factorConversion: 0`** en `addAdditionalUnit` y manejar el 0 como "vacío" en la UI.
2. **Agregar advertencia en `validateForm`** cuando `factorConversion === 1` o cuando el factor no se ha modificado del default.
3. **Mejorar el label y placeholder del campo "Contiene"** con ejemplo dinámico usando la unidad base.
4. **Agregar texto explicativo** sobre la semántica de la tabla de presentaciones.

### Fase 2 — Mejora estructural (1–2 semanas)

5. **Implementar Opción B**: usar `conversionFactor` del catálogo para sugerir el factor cuando ambas unidades tienen `conversionFactor` definido.
6. **Agregar advertencia para factor < 1** con mensaje explicativo de la semántica.
7. **Agregar `suggestedFactor` en `SunatUnitCatalogItem`** para las combinaciones más comunes de QUANTITY.
8. **Ampliar tooltip** de "Presentaciones comerciales" con ejemplos por familia.

### Fase 3 — Inventario/Kardex (antes de activar módulo de stock)

9. **Auditoría de datos**: script para detectar productos con `factorConversion === 1` en presentaciones que probablemente son incorrectas.
10. **Ampliar `AdditionalUnitMeasure`** con `decimalPlaces`, `conversionDirection`.
11. **Definir y documentar** la política de fraccionamiento de presentaciones.
12. **Migración de datos**: revisar y corregir factores incorrectos con el usuario antes de activar control de stock.

### Fase 4 — Reglas avanzadas (largo plazo)

13. **Agregar `sizeRank` en PACKAGING** con revisión por sector de negocio.
14. **Implementar validación semántica** de dirección de conversión.
15. **Alertas en Lista de Precios** cuando el precio derivado parece incoherente (precio < 0.01, o > 10x el precio base).

---

## 16. Conclusión

### Respuestas directas a las preguntas de análisis

**1. ¿El sistema valida coherencia de presentaciones?**
No. Solo valida: misma familia, no duplicar base, no duplicar otras presentaciones, factor > 0. No hay validación semántica de jerarquía ni de razonabilidad del factor.

**2. ¿Existe metadata jerárquica en el modelo Unit?**
No. No existe `level`, `rank`, `parent`, `sizeRank`, `isBaseCandidate`, `isPresentationCandidate` ni `conversionDirection`. El campo `conversionFactor` existe en el catálogo SUNAT para familias métricas pero no se usa para guiar al usuario en la entrada del factor de conversión de la presentación.

**3. ¿La familia PACKAGING tiene jerarquía?**
No en el sistema. Tiene 25 unidades completamente heterogéneas sin ningún campo de orden de tamaño. La jerarquía es parcial, implícita y dependiente del sector.

**4. ¿La familia QUANTITY tiene jerarquía?**
Sí, implícitamente (Millón > Millar > Ciento > Docena > Par > Unidad), pero el sistema no la captura — estas unidades no tienen `conversionFactor` ni `baseUnit`.

**5. ¿Qué valor toma `factorConversion` al agregar una presentación?**
Siempre `1` (useProductForm.ts:427). Este es el problema más crítico porque es silenciosamente incorrecto en prácticamente todos los casos reales.

**6. ¿El POS valida la coherencia de presentaciones?**
No. Toma todas las `unidadesMedidaAdicionales` sin filtro adicional.

**7. ¿Los Comprobantes validan la coherencia de presentaciones?**
No. Misma situación que POS.

**8. ¿Lista de Precios valida el factor?**
No. Calcula `precio_base × factorConversion` sin ninguna verificación de razonabilidad.

**9. ¿Permite factores < 1?**
Sí, técnicamente (min="0.0001"). No hay advertencia ni guía sobre el significado de presentaciones con factor < 1.

**10. ¿Está preparado el modelo para Kardex?**
No. Faltan: unidad de stock explícita, política de fraccionamiento, `decimalPlaces` por presentación, `conversionDirection`. Se necesita una fase de preparación de modelo antes de activar inventario con múltiples unidades.

**11. ¿Cuál es la recomendación inmediata más impactante?**
Cambiar el `factorConversion` default de `1` a un valor vacío/null y agregar advertencia cuando el usuario intente guardar con factor=1. Costo: horas. Beneficio: elimina el principal vector de error silencioso en precios.

---

## Resultado del lint

```
> npm run lint:senciyo
> npm run lint -w senciyo
> senciyo@0.0.0 lint
> eslint .

EXIT_CODE: 0 (sin errores, sin advertencias)
```

El proyecto no tiene errores de lint en la rama `ajustes2precios` al momento de esta auditoría.

---

*Auditoría generada el 2026-05-18. Solo lectura — ningún archivo funcional fue modificado.*
*Archivos leídos: 11. Archivos modificados: 0. Archivo creado: este documento.*
