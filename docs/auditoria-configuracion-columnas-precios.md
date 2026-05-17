# Auditoría de configuración de columnas de precio — SenciYo

> **Tipo:** Solo lectura. No se modificó ningún archivo funcional.
> **Fecha:** 2026-05-17
> **Módulo auditado:** Lista de Precios — configuración de columnas

---

## 1. Resumen ejecutivo

El módulo de Lista de Precios de SenciYo implementa un sistema de **9 columnas fijas predefinidas** (P1–P9) más hasta **10 columnas manuales adicionales** creadas por el usuario. El sistema es funcionalmente más rico de lo que su interfaz comunica, pero sufre de **tres problemas principales**:

1. **Confusión de visibilidades**: Existen dos campos de visibilidad (`visible` e `isVisibleInTable`) con semánticas distintas según el contexto (tabla, POS, importación). El nombre de ambos es ambiguo y cada módulo los interpreta de forma diferente.
2. **Perfil de precio de cliente implementado a medias**: El campo `listaPrecio` en el modelo de cliente se guarda pero **nunca se aplica automáticamente** al seleccionar el cliente en POS o Comprobantes.
3. **Nombre de pestaña engañoso**: "Plantilla de columnas" no comunica bien su función real, que es configurar qué listas/tipos de precio existen, cómo se calculan y dónde se muestran.

Los criterios de venta en POS y Comprobantes aplican la misma lógica de filtrado, excluyendo correctamente P2 (precio mínimo), P8 (descuento global) y P9 (aumento global) del selector vendible. Sin embargo, esta lógica implícita no está documentada ni visible para el usuario.

---

## 2. Alcance revisado

| Archivo | Ruta | Leído | Notas |
|---|---|---|---|
| `PriceTypes.ts` | `models/PriceTypes.ts` | ✓ | Tipos base del sistema |
| `columns.ts` | `utils/price-helpers/columns.ts` | ✓ | Constantes, definiciones, predicados |
| `useColumns.ts` | `hooks/useColumns.ts` | ✓ | Hook de estado de columnas |
| `ColumnManagement.tsx` | `components/ColumnManagement.tsx` | ✓ | UI de gestión de columnas |
| `ColumnModal.tsx` | `components/modals/ColumnModal.tsx` | ✓ | Modal crear/editar columna |
| `PriceColumnsManagerButton.tsx` | `components/product-pricing/` | ✓ | Selector de columnas en tabla |
| `ProductPricing.tsx` | `components/ProductPricing.tsx` | ✓ parcial | Tabla y filtros de columnas |
| `ProductPricingTable.tsx` | `components/product-pricing/` | ✓ | Renderizado de celdas |
| `importProcessing.ts` | `utils/importProcessing.ts` | ✓ | Excel import/export |
| `usePriceBook.ts` | Shared / hooks | ✓ | Lógica de venta — predicado columnas |
| `learnBasePrice.ts` | `utils/` | ✓ | Aprendizaje de precio base |
| `saleClienteMapping.ts` | `utils/` | ✓ | Mapeo cliente→perfil precio |
| `cliente.types.ts` | `gestion-clientes/models/` | ✓ | Modelo de cliente |
| `clienteFormConfig.ts` | `gestion-clientes/` | ✓ | Configuración de formulario cliente |
| `usePosCartAndTotals.ts` | `punto-venta/hooks/` | ✓ | Lógica carrito POS |

---

## 3. Mapa actual de columnas de precio

### 3.1 Columnas fijas del sistema (P1–P9)

| ID | Nombre visible | Kind | Mode | isBase | Visible | En tabla | Fija | Editable | Eliminable |
|---|---|---|---|---|---|---|---|---|---|
| **P1** | PRECIO BASE | `base` | `fixed` | ✓ | Siempre | Siempre | ✓ | Solo visibilidad (sin efecto) | ✗ |
| **P2** | PRECIO MÍNIMO | `min-allowed` | `fixed` | ✗ | `true` | `false` | ✓ | Solo visibilidad | ✗ |
| **P3** | PRECIO MAYORISTA | `manual` | `fixed` | ✗ | `true` | `false` | ✓ | Solo visibilidad | ✗ |
| **P4** | PRECIO DISTRIBUIDOR | `manual` | `fixed` | ✗ | `true` | `false` | ✓ | Solo visibilidad | ✗ |
| **P5** | PRECIO CORPORATIVO | `manual` | `fixed` | ✗ | `true` | `false` | ✓ | Solo visibilidad | ✗ |
| **P6** | PRECIO PREFERENCIAL | `manual` | `fixed` | ✗ | `true` | `false` | ✓ | Solo visibilidad | ✗ |
| **P7** | PRECIO PROMOCIONAL | `manual` | `fixed` | ✗ | `true` | `false` | ✓ | Solo visibilidad | ✗ |
| **P8** | DESCUENTO GLOBAL | `global-discount` | `fixed` | ✗ | `true` | `false` | ✓ | Regla (tipo + valor) | ✗ |
| **P9** | AUMENTO GLOBAL | `global-increase` | `fixed` | ✗ | `true` | `false` | ✓ | Regla (tipo + valor) | ✗ |

> **Evidencia:** `utils/price-helpers/columns.ts`, constantes `BASE_COLUMN_ID` a `GLOBAL_INCREASE_COLUMN_ID` (líneas 4–12), array `FIXED_COLUMN_DEFINITIONS` (líneas 30–136).

### 3.2 Columnas manuales creadas por usuario

| ID generado | Nombre visible | Kind | Mode | Fija | Editable | Eliminable |
|---|---|---|---|---|---|---|
| P10, P11, … | Definido por usuario | `manual` | `fixed` o `volume` | ✗ | Nombre, modo, visibilidad | ✓ |

> **Límite:** `MANUAL_COLUMN_LIMIT = 10` (`columns.ts` línea 13). El sistema puede tener hasta **19 columnas en total** (9 fijas + 10 manuales).

### 3.3 Mapeos históricos (legacy IDs)

| ID antiguo | ID nuevo | Nota |
|---|---|---|
| `PPM` | P2 | Precio mínimo anterior |
| `PPD` | P3 | Precio mayorista anterior |
| `P5` | P6 | Preferencial (fue P5 antes de agregar Corporativo) |
| `P6` | P7 | Promocional desplazado |
| `P7` | P8 | Descuento global desplazado |
| `P8` | P9 | Aumento global desplazado |
| `PGD` | P8 | Alias descuento global |
| `PGA` | P9 | Alias aumento global |

> **Evidencia:** `columns.ts`, campo `legacyIds` en cada entrada de `FIXED_COLUMN_DEFINITIONS`.

### 3.4 Columna base

- **Siempre existe**: Si no hay P1 en localStorage, `ensureRequiredColumns` lo crea.
- **No se puede ocultar permanentemente**: `column.visible` podría setearse a `false` pero POS/comprobantes siempre lo usa como fallback.
- **No se puede renombrar** funcionalmente: ColumnModal desactiva el campo `name` si `isFixedColumn`.
- **No se puede eliminar**: `deleteColumn` en `useColumns.ts` bloquea si `isBase === true`.
- **No existe columna "Otros"** actualmente.

---

## 4. Funcionamiento actual de "Plantilla de columnas"

### 4.1 ¿Qué permite hacer?

| Acción | ¿Permitida? | ¿Para qué columnas? | Evidencia |
|---|---|---|---|
| Ver todas las columnas | ✓ | Todas | `ColumnManagement.tsx` |
| Cambiar nombre visible | ✗ fijas / ✓ manuales | Solo manuales creadas por usuario | `ColumnModal.tsx` línea 145 |
| Cambiar modo (fijo/por cantidad) | ✗ fijas / ✓ manuales | Solo manuales creadas | `ColumnModal.tsx` línea 157 |
| Togglear visible (formularios) | ✓ | Todas | `ColumnManagement.tsx` línea 188–199 |
| Togglear visible en tabla | ✓ | Todas | `ColumnManagement.tsx` línea 200–215 |
| Configurar regla global | ✓ | P8, P9 únicamente | `ColumnModal.tsx` línea 88–107 |
| Agregar columna | ✓ | Solo si < 10 manuales | `ColumnManagement.tsx` línea 111–118 |
| Eliminar columna | ✗ fijas / ✓ manuales | Solo manuales creadas | `useColumns.ts` líneas 109–142 |
| Reordenar columnas | ✓ (tabla drag) | Todas vía PriceColumnsManagerButton | `useColumns.ts` `reorderColumns` |

### 4.2 Lo que el usuario ve vs. lo que realmente ocurre

- **Toggle "Visible" (ojo)** en la columna VISIBLE: Etiquetado "Mostrar en formularios" / "Ocultar en formularios". Cuando se desactiva, la columna **no aparece en el selector de precio de POS/Comprobantes** (ya que `salesColumnPredicate` filtra por `visible`). El usuario probablemente no sabe que ocultar en formularios también la quita de POS.
- **Toggle "Visible en tabla"**: Etiquetado "Mostrar en tablas" / "Ocultar en tablas". Controla solo la columna en la tabla de Lista de Precios. **No afecta POS ni Comprobantes directamente.**

### 4.3 ¿Es correcto el nombre "Plantilla de columnas"?

**No es correcto.** Una "plantilla" sugiere un modelo base para copiar o exportar. Lo que esta pestaña realmente gestiona es:
- Qué **tipos/listas de precio** existen.
- Cómo se **calculan** algunos (reglas globales).
- Cómo se **muestran** en la tabla y en formularios.

**Nombres más descriptivos según contexto:**

| Opción | Pros | Contras |
|---|---|---|
| "Configuración de precios" | Genérico, claro | Ambiguo con config general |
| "Tipos de precio" | Describe correctamente el contenido | No implica que se configure |
| "Listas de precio" | Término estándar del sector | Confusión con el módulo completo |
| **"Configuración de listas de precio"** | Preciso, completo | Largo |

**Recomendación:** `"Tipos de precio"` o `"Configuración de listas"` son los candidatos más claros para SenciYo.

---

## 5. Visibilidad, tabla, formularios y canales

### 5.1 Mapa de significados reales

| Campo | ¿Qué significa realmente? | ¿Qué controla? |
|---|---|---|
| `column.visible` | "Esta columna está habilitada en el sistema" | Aparece en formularios de edición de precio, **y en selector de POS/Comprobantes** |
| `column.isVisibleInTable` | "Esta columna se muestra en la tabla resumen de Lista de Precios" | Solo la visualización en `ProductPricingTable` y en exportación Excel |

### 5.2 Uso de `visible` en cada módulo

| Módulo | Usa `visible` | Usa `isVisibleInTable` | Predicado adicional |
|---|---|---|---|
| Tabla de precios (`ProductPricing.tsx`) | ✓ | ✓ | `visible !== false && isVisibleInTable !== false` |
| POS (`usePriceBook.ts`) | ✓ | ✗ | `kind === 'base' \|\| kind === 'manual'` |
| Comprobantes (mismo hook) | ✓ | ✗ | `kind === 'base' \|\| kind === 'manual'` |
| Excel importación | ✓ | ✓ | `visible && isVisibleInTable && !isGlobalColumn` |
| Selector Columnas (`PriceColumnsManagerButton`) | ✓ | ✓ | `visible !== false` para listar, `isVisibleInTable` para checked |
| Clientes | ✗ (no implementado) | ✗ | N/A |

> **Problema:** `visible=false` en una columna la elimina de POS sin advertencia al usuario. La etiqueta "Ocultar en formularios" no comunica este efecto secundario.

### 5.3 Escenario confuso

Un usuario desactiva "Visible" (ojo) en **PRECIO MAYORISTA** porque "no quiere verlo en formularios".
- Resultado real: PRECIO MAYORISTA desaparece del selector de lista de precio en POS y en Comprobantes.
- Resultado esperado por el usuario: Solo desaparece del formulario de asignación.
- **Impacto:** Vendedor en caja no puede cobrar al precio mayorista.

### 5.4 ¿Hay campo para "Usar en POS" o "Usar en Comprobantes"?

**No.** No existe ningún switch explícito de canal. Todo se basa en la lógica implícita de `kind` + `visible` en `salesColumnPredicate`:
```typescript
// usePriceBook.ts
const salesColumnPredicate = (column: Column): boolean => {
  if (!column.visible) return false;
  return column.kind === 'base' || column.kind === 'manual';
};
```

---

## 6. Relación con POS

### 6.1 ¿Qué columnas puede seleccionar el operador en POS?

Las columnas que cumplen **todas** estas condiciones:
1. `column.visible === true`
2. `column.kind === 'base' || column.kind === 'manual'`

**Resultado con configuración por defecto:**

| Columna | ¿Disponible en POS? | Motivo |
|---|---|---|
| P1 PRECIO BASE | ✓ | kind='base', visible=true |
| P2 PRECIO MÍNIMO | ✗ | kind='min-allowed' (excluido) |
| P3 PRECIO MAYORISTA | ✓ | kind='manual', visible=true |
| P4 PRECIO DISTRIBUIDOR | ✓ | kind='manual', visible=true |
| P5 PRECIO CORPORATIVO | ✓ | kind='manual', visible=true |
| P6 PRECIO PREFERENCIAL | ✓ | kind='manual', visible=true |
| P7 PRECIO PROMOCIONAL | ✓ | kind='manual', visible=true |
| P8 DESCUENTO GLOBAL | ✗ | kind='global-discount' (excluido) |
| P9 AUMENTO GLOBAL | ✗ | kind='global-increase' (excluido) |

### 6.2 Flujo de resolución de precio en POS

1. Operador selecciona columna (ej. P6 PREFERENCIAL) como lista activa.
2. Al agregar producto, `applyPriceToItem` busca precio en P6 para el sku+unidad.
3. Si no existe precio en P6: **fallback a P1** (precio base).
4. Se valida contra P2 (precio mínimo): si precio < mínimo, se ajusta y muestra error.
5. Globalrules (P8/P9): se calculan en `effectivePrices` pero **no como lista seleccionable**.

> **Evidencia:** `usePriceBook.ts`, función `getUnitPriceWithFallback` y `resolveMinPrice`.

### 6.3 ¿Se persiste la columna seleccionada?

Sí. `usePosCartAndTotals.ts` guarda en localStorage con clave `pos_price_column`. La sesión de POS recuerda la última lista usada.

### 6.4 Columna seleccionada vs. columna visible en tabla

Son independientes. POS puede usar P4 DISTRIBUIDOR aunque `isVisibleInTable=false`. Solo `visible=true` importa.

---

## 7. Relación con Comprobantes

### 7.1 ¿Mismo hook que POS?

**Sí.** `usePriceBook` es el hook compartido entre POS y Comprobantes (Emisión Tradicional). Ambos usan el mismo `salesColumnPredicate` y el mismo conjunto de `selectableColumns`.

### 7.2 Diferencias respecto a POS

| Aspecto | POS | Comprobantes |
|---|---|---|
| Hook de columnas | `usePriceBook` (compartido) | `usePriceBook` (compartido) |
| Selector de lista | `usePosCartAndTotals` (carrito) | `ProductsSection.tsx` (items) |
| Aprendizaje precio base | ✓ (`learnBasePriceIfMissing`) | ✓ (`learnBasePriceIfMissing`) |
| Persistencia de columna seleccionada | localStorage `pos_price_column` | No confirmado (posiblemente no persiste) |
| Perfil cliente auto-aplica columna | ✗ | ✗ |

### 7.3 `learnBasePriceIfMissing`

Tanto POS como Comprobantes llaman esta función al ingresar precio manual. Si no existe precio base (P1) para sku+unidad, crea uno automáticamente.

> **Riesgo:** El precio base puede poblarse sin que el usuario lo sepa, mezclando precios "aprendidos" con precios configurados deliberadamente en Lista de Precios.

---

## 8. Relación con Clientes

### 8.1 ¿Tiene el cliente un campo de perfil de precio?

**Sí.** El modelo `Cliente` en `gestion-clientes/models/cliente.types.ts` incluye:
```typescript
listaPrecio?: string;
```
Etiqueta en formulario (`clienteFormConfig.ts`): `"Perfil de precio"`.

### 8.2 ¿Qué valor almacena?

Un string que debería ser el ID de la columna (ej. `"P6"` para PREFERENCIAL). No está tipado fuertemente como `ColumnId` sino como `string` libre.

### 8.3 ¿Se aplica automáticamente al seleccionar cliente?

**No.** Este es el hallazgo más crítico del área de clientes.

- `saleClienteMapping.ts` mapea `listaPrecio` → `priceProfileId` en el snapshot del cliente.
- `priceProfileId` llega a `CartCheckoutPanel` como prop.
- **Pero** `usePosCartAndTotals` no recibe ni consume `priceProfileId` para cambiar automáticamente la columna activa.
- El usuario que asigna "Precio mayorista" a un cliente espera que al seleccionarlo en POS se active esa lista, pero **no ocurre**.

### 8.4 ¿Qué columnas puede asignar el formulario de cliente?

El campo `listaPrecio` es un input de texto libre actualmente. No hay un selector dropdown que filtre por columnas disponibles. No hay validación que verifique que el valor sea un ID de columna válido.

> **Riesgo:** Usuario puede escribir cualquier texto. Si escribe "P6" funciona si algún día se implementa la integración; si escribe "Mayorista" (texto), no funcionará.

### 8.5 ¿Qué columnas quedarían excluidas si se implementara el selector?

Deberían quedar excluidas: P2 (min-allowed), P8 (global-discount), P9 (global-increase), por la misma lógica de `salesColumnPredicate`.

---

## 9. Relación con Importar/Exportar Excel

### 9.1 ¿Qué columnas aparecen en la plantilla Excel?

Las columnas que cumplen **todas** estas condiciones simultáneamente:
1. `column.visible === true`
2. `column.isVisibleInTable !== false`
3. `!isGlobalColumn(column)` (excluye P8 y P9)

> **Evidencia:** `importProcessing.ts`, función `buildTableColumnConfigs` (líneas 391–399).

### 9.2 Resultado con configuración por defecto

Con la configuración inicial, solo **P1** tiene `isVisibleInTable=true`. Todas las demás (P2–P7) tienen `isVisibleInTable=false`. Esto significa que **la plantilla Excel por defecto solo exporta PRECIO BASE**.

El usuario debe activar manualmente "Visible en tabla" para cada columna que quiera incluir en el Excel.

### 9.3 Columnas siempre excluidas del Excel

- P8 DESCUENTO GLOBAL (excluido por `isGlobalColumn`)
- P9 AUMENTO GLOBAL (excluido por `isGlobalColumn`)

### 9.4 Consistencia entre Excel y tabla visual

| Columna | Tabla visual | Excel |
|---|---|---|
| P1 PRECIO BASE | ✓ (siempre) | ✓ (siempre, si isVisibleInTable=true) |
| P2–P7 (manual fijos) | Solo si isVisibleInTable=true | Solo si isVisibleInTable=true |
| P8, P9 (global) | Solo lectura si isVisibleInTable=true | ✗ Nunca |
| P10+ (manuales creadas) | Solo si isVisibleInTable=true | Solo si isVisibleInTable=true |

**Son coherentes entre sí.** La tabla visual y Excel usan el mismo criterio.

### 9.5 Riesgo de cambio a 10 columnas fijas

Si se elimina la posibilidad de crear columnas manuales, la importación quedaría intacta siempre que los IDs de columna no cambien. Los archivos Excel existentes con headers como "PRECIO MAYORISTA" seguirían funcionando porque `buildExpectedHeaders` usa `getColumnDisplayName(column)`.

---

## 10. Evaluación del modelo actual

### 10.1 Fortalezas

- **IDs fijos internos (P1–P9):** Los IDs no cambian aunque el usuario renombre columnas manuales. La lógica de migración con `legacyIds` es robusta.
- **Exclusión correcta de globales en venta:** P8/P9 están correctamente excluidos de `salesColumnPredicate`.
- **Fallback a precio base:** POS siempre tiene un precio aunque la lista seleccionada no tenga precio para ese producto.
- **Validación de precio mínimo:** P2 se verifica siempre en POS, aunque no sea seleccionable.
- **Límite de columnas manuales:** `MANUAL_COLUMN_LIMIT = 10` previene tabla inmanejable.

### 10.2 Debilidades

- **Sistema de 9+10=19 columnas potenciales** es demasiado flexible. El usuario no sabe cuándo es "suficiente".
- **Dos campos de visibilidad** con comportamientos distintos por módulo → confusión garantizada.
- **No hay canal explícito:** POS y Comprobantes usan lógica implícita que el usuario no puede configurar.
- **Perfil de cliente no integrado:** Campo `listaPrecio` existe pero no tiene efecto en venta.
- **Nombres de pestaña engañosos:** "Plantilla de columnas" no comunica bien la función.

---

## 11. Evaluación de modelo con 10 columnas fijas

### 11.1 El modelo propuesto

```
P1  Precio base         (obligatoria, siempre activa)
P2  Precio mínimo       (regla, no vendible directamente)
P3  Precio mayorista    (vendible)
P4  Precio distribuidor (vendible)
P5  Precio corporativo  (vendible)
P6  Precio preferencial (vendible)
P7  Precio promocional  (vendible)
P8  Descuento global    (calculada, no vendible directamente)
P9  Aumento global      (calculada, no vendible directamente)
P10 Otros               (vendible, renombrable)
```

### 11.2 ¿Lo soporta el sistema actual?

**Casi.** El sistema ya tiene 9 columnas fijas. Solo faltaría:
- Agregar P10 como columna fija con nombre visible editable ("Otros" por defecto).
- Eliminar la capacidad de crear columnas adicionales más allá de P10.
- Deshabilitar "Agregar columna" en la UI.
- Mantener la migración de P10+ existentes hacia P10 (o mostrar advertencia).

### 11.3 Beneficios

| Beneficio | Impacto |
|---|---|
| Simplifica UI de configuración | Alto: el usuario no necesita "diseñar" la estructura de precios |
| IDs estables: facilita integración futura (sincronización, reportes) | Alto |
| Tabla siempre con estructura predecible | Medio |
| Reduce riesgo de scroll horizontal excesivo | Medio |
| Facilita documentación y soporte | Medio |

### 11.4 Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Usuarios que tengan P10, P11+ manuales perderían estructura al migrar | Alto | Migrar P10+ a P10 con aviso, o mantener P10+ como read-only legacy |
| Usuarios que necesiten más de 10 precios distintos | Medio | Evaluar si el caso de uso es real; P10 "Otros" ya cubre el genérico |
| Nombres fijos (P3="MAYORISTA") pueden no aplica a todos los rubros | Medio | Permitir renombrar TODOS los nombres visibles, no solo P10 |

### 11.5 Impacto por módulo

| Módulo | Impacto |
|---|---|
| POS | Mínimo: selector usaría las mismas columnas fijas |
| Comprobantes | Mínimo: mismo hook |
| Clientes | Positivo: selector podría listar los 8 precios vendibles con nombres fijos |
| Excel importación | Neutro: mismo criterio `isVisibleInTable` |
| Filtros | Positivo: lista de columnas siempre predecible |
| Performance | Positivo: tabla nunca supera 10 columnas |

### 11.6 ¿Todos los nombres visibles deberían ser editables?

**Sí, con condiciones:**
- Nombre interno fijo: Siempre P1, P2, … para integraciones y log.
- Nombre visible editable: Para que un restaurant llame P4 "Delivery" y una farmacia lo llame "Institucional".
- **Solo P10 debería ser siempre libre** (es el "Otros" sin semántica fija).
- P1–P9 deberían tener nombre por defecto pero ser renombrables para adaptarse al rubro.

---

## 12. Evaluación de configuración por canal

### 12.1 Estado actual

No existe ningún switch explícito de canal. La lógica está implícita en `kind` + `visible`.

### 12.2 Campos actuales reutilizables

| Campo existente | Podría mapear a |
|---|---|
| `column.visible` | "Activo en el sistema" (master switch) |
| `column.isVisibleInTable` | "Mostrar en tabla de Lista de Precios" |
| (nuevo) `useInPOS` | "Usar en Punto de Venta" |
| (nuevo) `useInComprobantes` | "Usar en Comprobantes" |
| (nuevo) `useAsClientProfile` | "Disponible como perfil de cliente" |

### 12.3 Campos que faltarían

```typescript
interface Column {
  // Existentes
  visible: boolean;          // Sistema habilitado
  isVisibleInTable?: boolean; // Tabla de Lista de Precios
  
  // Propuestos nuevos
  usarEnPOS?: boolean;          // Aparece en selector de POS
  usarEnComprobantes?: boolean; // Aparece en selector de Comprobantes
  usarComoPerfilCliente?: boolean; // Aparece en perfil de precio de cliente
}
```

### 12.4 Configuración por canal — ¿Es viable?

| Criterio | Evaluación |
|---|---|
| Claridad para el usuario | Alta: el usuario entiende cada switch |
| Complejidad de implementación | Media: requiere actualizar 3 módulos (POS, Comprobantes, Clientes) |
| Compatibilidad con modelo fijo | Alta: aplica igual con columnas fijas |
| Riesgo de migración | Bajo: los campos nuevos tendrían valores por defecto razonables |

### 12.5 Defaults sugeridos al agregar switches

| Columna | usarEnPOS | usarEnComprobantes | usarComoPerfilCliente |
|---|---|---|---|
| P1 PRECIO BASE | ✓ siempre | ✓ siempre | ✓ siempre |
| P2 PRECIO MÍNIMO | ✗ bloqueado | ✗ bloqueado | ✗ bloqueado |
| P3–P7 (manual fijos) | ✓ default | ✓ default | ✓ default |
| P8 DESCUENTO GLOBAL | ✗ bloqueado | ✗ bloqueado | ✗ bloqueado |
| P9 AUMENTO GLOBAL | ✗ bloqueado | ✗ bloqueado | ✗ bloqueado |
| P10 OTROS | ✓ default | ✓ default | ✓ default |

### 12.6 ¿Convendría implementar switches por canal?

**Sí, especialmente el de "Usar en Punto de Venta".** Es el que más confusión genera actualmente porque el usuario cree que "ocultar en formularios" no afecta POS, pero sí lo hace. Un switch explícito de canal evita malentendidos. Los otros dos son convenientes pero no urgentes.

---

## 13. Problemas UX detectados

### 13.1 Nombres de toggle confusos

| Toggle actual | Qué hace realmente | Nombre sugerido |
|---|---|---|
| "Ocultar en formularios" (ojo) | Quita de formularios Y de POS/Comprobantes | "Desactivar columna" o "Columna activa" |
| "Ocultar en tablas" (table icon) | Solo quita de la tabla visual de precios | "Mostrar en tabla de precios" |

### 13.2 "Plantilla de columnas" vs. su función

El nombre sugiere algo temporal o exportable. La función real es configuración permanente de los tipos de precio del negocio. **Confusión garantizada** para nuevos usuarios.

### 13.3 Columnas visibles no sinónimo de columnas vendibles

La UI no indica en ningún lugar qué columnas son "vendibles" (aparecen en POS) y cuáles son "solo de referencia" (P2, P8, P9). El badge "Precio mínimo permitido" en ColumnManagement da un hint pero insuficiente.

### 13.4 Sin advertencia al ocultar columna usada en venta

Si el operador oculta PRECIO MAYORISTA mientras hay una sesión de POS activa usando esa lista, el comportamiento resultante no está definido (posiblemente caiga al fallback de precio base sin aviso).

### 13.5 Campo de perfil de precio en cliente no funciona

El formulario de cliente muestra "Perfil de precio" pero ingresar un valor no tiene efecto en POS ni Comprobantes. Un usuario avanzado podría pasar horas tratando de entender por qué el cliente "mayorista" sigue viendo el precio base.

### 13.6 P8/P9 con toggle "Visible en tabla" pero son de solo lectura

Las celdas de descuento/aumento global se calculan automáticamente y no son editables. Tener el toggle "Visible en tabla" para estas columnas es coherente técnicamente, pero visualmente genera confusión con las columnas de precio normal.

---

## 14. Riesgos funcionales y técnicos

| Área | Hallazgo | Riesgo | Evidencia |
|---|---|---|---|
| **Clientes** | `listaPrecio` guardado pero nunca aplica en POS | **Crítico** | `usePosCartAndTotals.ts`, `saleClienteMapping.ts` |
| **POS/Comprobantes** | Ocultar columna en "formularios" la quita de venta sin advertencia | **Alto** | `usePriceBook.ts`, `salesColumnPredicate` |
| **Migración legacy** | P5 antiguo mapea a P6 nuevo (PREFERENCIAL), posible colisión si hay columna manual con ID=P5 | **Alto** | `columns.ts` línea 9, 90 |
| **Nomenclatura** | `listaPrecio` (cliente) ≠ `priceProfileId` (snapshot) ≠ "Perfil de precio" (UI) | **Medio** | `cliente.types.ts` línea 121, `saleClienteMapping.ts` línea 63 |
| **Columnas globales** | Si `globalRuleValue = null`, descuento/aumento silenciosamente no aplica | **Medio** | `columns.ts` `applyGlobalRule` línea 357 |
| **filterVisibleColumns** | Nombre sugiere que retorna "columnas visibles" pero solo filtra `visible`, no `isVisibleInTable` | **Medio** | `columns.ts` línea 318, `importProcessing.ts` línea 392 |
| **Scroll horizontal** | Con 10 columnas fijas + 10 manuales = hasta 19 columnas en tabla | **Medio** | `ProductPricingTable.tsx`, sin cap en columnas de tabla |
| **learnBasePrice** | Precio base puede poblarse automáticamente desde POS/Comprobantes sin que usuario lo sepa | **Medio** | `learnBasePrice.ts` |
| **P2 precio mínimo** | Aparece en "Plantilla de columnas" igual que precios vendibles, pero no es vendible | **Bajo** | UI de ColumnManagement vs. `salesColumnPredicate` |
| **P8/P9 en tabla** | Toggle "Visible en tabla" para columnas de solo lectura puede confundir | **Bajo** | `ColumnManagement.tsx`, `ProductPricingTable.tsx` |
| **MANUAL_COLUMN_LIMIT** | Límite de 10 no validado en persistencia, solo en UI | **Bajo** | `useColumns.ts` línea 67–71 |
| **Tipos no usados** | `kind: 'product-discount'` en `ColumnKind` pero nunca creado en FIXED_COLUMN_DEFINITIONS | **Bajo** | `PriceTypes.ts`, `columns.ts` |

---

## 15. Recomendación funcional final

### 15.1 ¿Columnas dinámicas o 10 columnas fijas?

**Recomendación: 10 columnas fijas con nombre visible editable.**

El sistema ya tiene 9 columnas fijas conceptualmente. Agregar P10 "Otros" como undécima configurable (editable en nombre) resuelve el caso de uso "necesito otro tipo de precio" sin abrir un diseñador de columnas completo.

Razones:
- El 99% de los negocios necesita máximo 8 precios vendibles (P1–P7 + P10).
- Columnas manuales adicionales nunca tendrían semántica de negocio clara.
- Simplifica documentación, soporte y UX.

### 15.2 ¿Eliminar "Agregar columna"?

**Sí**, una vez que P10 "Otros" esté como columna fija renombrable. Reemplazar el botón con opción de renombrar P10.

### 15.3 ¿Permitir renombrar todos los nombres visibles?

**Sí, todos P1–P10**, pero mostrar claramente el "nombre interno" (rol) vs. "nombre visible" (etiqueta). Ejemplos:

```
Nombre interno: Precio base      → No editable
Nombre visible: "Precio al público" → Editable
```

### 15.4 ¿Switches por canal?

**Mínimo recomendado en primera fase:**
- "Usar en Punto de Venta" (resolver el riesgo crítico de confusión con `visible`)
- "Usar en Comprobantes" (opcional, si difieren de POS en el roadmap)

**Fase posterior:**
- "Disponible como perfil de cliente"
- "Incluir en importación/exportación"

### 15.5 ¿Qué debería estar bloqueado siempre?

| Campo | Bloqueado para |
|---|---|
| P1 visible/canal | Siempre activo, no desactivable |
| P2 como precio vendible | Nunca en selector de venta |
| P8/P9 como precio vendible | Nunca en selector de venta |
| P8/P9 nombre interno | No renombrable (rol técnico) |

### 15.6 ¿Renombrar "Plantilla de columnas"?

**Sí.** Recomendación: **"Tipos de precio"**. Es corto, descriptivo y diferencia bien del módulo padre "Lista de Precios".

---

## 16. Plan sugerido de implementación por fases

### Fase 1 — Correcciones críticas (sin refactor mayor)

**Prioridad: Alta. Sin romper nada existente.**

1. **Renombrar "Plantilla de columnas" → "Tipos de precio"** (o "Configuración de listas"). Cambio de string en UI, 1 archivo.
2. **Corregir tooltip del toggle `visible`**: Cambiar "Visible en formularios" → "Columna activa". Añadir nota: "Las columnas inactivas no aparecen en POS ni en Comprobantes."
3. **Conectar `priceProfileId` de cliente en POS**: En `usePosCartAndTotals`, al cargar cliente con `priceProfileId`, preseleccionar esa columna si existe y es válida.
4. **Unificar nomenclatura** `listaPrecio` → `perfilPrecioId` o mantener `listaPrecio` y eliminar el alias `priceProfileId` en el mapeo.

### Fase 2 — Mejora de modelo de columnas

**Prioridad: Media. Requiere diseño.**

5. **Agregar P10 "Otros" como columna fija** con nombre visible editable por defecto. Desactivar botón "Agregar columna".
6. **Permitir editar nombre visible de P1–P10**: Separar `internalName` (rol, no editable) de `displayName` (etiqueta, editable).
7. **Migrar columnas manuales existentes**: Si el usuario tiene P10, P11, …, mostrar advertencia y ofrecer migración a P10 o conservar como legacy read-only.

### Fase 3 — Configuración por canal

**Prioridad: Baja–Media. Mejora UX avanzada.**

8. **Agregar switch "Usar en Punto de Venta"** por columna. Default: true para P1–P7 y P10, false para P2/P8/P9 (bloqueado).
9. **Agregar switch "Usar en Comprobantes"** (si difieren de POS).
10. **Formulario cliente**: Cambiar campo de texto libre `listaPrecio` por selector dropdown filtrado por columnas con `usarComoPerfilCliente=true`.

### Fase 4 — Pulido y documentación

11. Ocultar toggles irrelevantes para columnas de solo lectura (P8/P9 en tabla: no mostrar toggle si es global).
12. Agregar tooltip informativo en P2, P8, P9 explicando que son "reglas de precio" no "listas de venta".
13. Documentar internamente el mapa de IDs y su semántica en un comentario de `columns.ts`.

---

## 17. Conclusión

El sistema de columnas de precio en SenciYo tiene una base técnica sólida pero comunica mal su complejidad al usuario. Los IDs fijos P1–P9 con su lógica de migración son un activo valioso que debe preservarse. El principal gap no es técnico sino de UX y de integración incompleta:

- **El campo más urgente de resolver** es la conexión entre el perfil de precio del cliente y POS/Comprobantes. El campo existe, el mapeo existe, pero la integración final no está implementada.
- **El segundo problema más urgente** es clarificar que `visible=false` desactiva la columna en POS, lo cual un operador nunca esperaría al "ocultar en formularios".
- **El tercer cambio más valioso** es renombrar "Plantilla de columnas" a algo que comunique "aquí defines qué tipos de precio maneja tu negocio".

El modelo de 10 columnas fijas con nombres visibles editables es el camino correcto. Elimina la complejidad de columnas libres sin sacrificar flexibilidad de nomenclatura por rubro.

---

## Matriz de hallazgos

| Área | Hallazgo | Estado | Evidencia | Riesgo | Recomendación |
|---|---|---|---|---|---|
| Columnas — Base | P1 siempre obligatoria y no eliminable | Correcto | `useColumns.ts` línea 127 | — | Mantener |
| Columnas — Fijas | 9 columnas fijas P1–P9 predefinidas | Correcto | `columns.ts` `FIXED_COLUMN_DEFINITIONS` | — | Agregar P10 "Otros" |
| Columnas — Dinámicas | Usuario puede crear hasta 10 columnas manuales | Parcial | `useColumns.ts`, `MANUAL_COLUMN_LIMIT=10` | Medio | Evaluar eliminar en favor de P10 fijo |
| Columnas — Nombres | Nombre visible editable solo en manuales creadas | Parcial | `ColumnModal.tsx` línea 145 | Medio | Extender a todas las fijas (excepto P1) |
| Columnas — Legacy | Mapeo de IDs antiguos (PPM, P5, P6…) presente | Correcto | `columns.ts` `legacyIds` | Alto (colisión P5) | Revisar caso P5→P6 |
| Visibilidad — `visible` | Controla formularios Y selector de venta (POS/Comprobantes) | Confuso | `usePriceBook.ts` salesColumnPredicate | Alto | Renombrar, separar semántica |
| Visibilidad — `isVisibleInTable` | Controla tabla de Lista de Precios y Excel | Parcial | `ProductPricing.tsx` línea 48, `importProcessing.ts` línea 392 | Bajo | Etiqueta "Visible en tabla de precios" |
| Pestaña — Nombre | "Plantilla de columnas" no comunica la función real | Confuso | UI `ListaPrecios.tsx` | Bajo | Renombrar a "Tipos de precio" |
| POS — Selector | Excluye correctamente P2/P8/P9 de selector vendible | Correcto | `usePriceBook.ts` línea 58–61 | — | Mantener lógica, documentar |
| POS — Canal explícito | No hay switch "Usar en POS" | No implementado | Ninguno | Alto | Agregar switch explícito |
| POS — Fallback base | Si no hay precio en columna elegida, usa P1 | Correcto | `usePriceBook.ts` `getUnitPriceWithFallback` | — | Mantener |
| POS — Precio mínimo | P2 se valida pero no aparece como vendible | Correcto | `usePriceBook.ts` `resolveMinPrice` | — | Mejorar tooltip UI |
| Comprobantes — Columnas | Mismo predicado que POS | Correcto | `usePriceBook.ts` (compartido) | — | Mantener |
| Clientes — Campo | `listaPrecio` existe en modelo | Parcial | `cliente.types.ts` línea 121 | Crítico | Implementar integración en POS |
| Clientes — Integración | `priceProfileId` nunca se usa en `usePosCartAndTotals` | Riesgoso | `usePosCartAndTotals.ts` | Crítico | Conectar en Fase 1 |
| Clientes — Validación | Campo texto libre, sin validación de ID válido | Inconsistente | `clienteFormConfig.ts` | Medio | Cambiar a selector tipado |
| Excel — Criterio export | Usa `visible && isVisibleInTable && !isGlobal` | Correcto | `importProcessing.ts` línea 392 | — | Mantener |
| Excel — Default | Solo P1 en tabla por defecto → plantilla con 1 columna | Confuso | `FIXED_COLUMN_DEFINITIONS` `defaultVisibleInTable` | Medio | Activar P3–P7 por defecto o explicar en UI |
| Global (P8/P9) — Toggle tabla | Toggle "Visible en tabla" para columnas calculadas | Confuso | `ColumnManagement.tsx` | Bajo | Ocultar toggle o mostrar como read-only |
| Global (P8/P9) — Null rule | Si `globalRuleValue=null`, descuento/aumento no aplica silenciosamente | Parcial | `columns.ts` `applyGlobalRule` línea 357 | Medio | Mostrar badge "sin configurar" en tabla |
| Nomenclatura — Naming | `listaPrecio` vs `priceProfileId` vs "Perfil de precio" inconsistentes | Inconsistente | 3 archivos distintos | Medio | Unificar a un solo término |
| learnBasePrice | Precio base puede crearse automáticamente desde POS sin control del usuario | Riesgoso | `learnBasePrice.ts` | Medio | Revisar si conviene con checkbox "no aprender" |
| `filterVisibleColumns` | Nombre engañoso: no filtra `isVisibleInTable` | Confuso | `columns.ts` línea 318 | Medio | Renombrar a `getActiveColumns` o `getEnabledColumns` |

---

*Fin de auditoría. Documento de solo lectura. Ningún archivo funcional fue modificado.*
