# Auditoría: Modal "Configurar inventario" — Nota de Venta y opción "No afecta stock"

**Fecha:** 2026-06-17  
**Rama auditada:** `inventarioMejoras2`  
**Alcance:** Solo lectura. Sin modificaciones de código.

---

## 1. Resumen ejecutivo

El modal "Configurar inventario" ofrece solo dos comportamientos posibles para la Nota de Venta: _Automático al generar_ y _Mediante Nota de Salida_. No existe una tercera opción configurable de "No afecta stock" a nivel de documento individual. La única forma actual de que la Nota de Venta no afecte inventario es desactivar el control global (`controlStockActivo = false`), lo cual también desactiva el stock para Factura/Boleta y Guía de Remisión.

Funcionalmente, el valor interno `'sin_control'` ya existe en el sistema (`useCart`, `ComprobantesListContext`) pero no está expuesto como opción configurable para Nota de Venta ni incluido en el tipo `StockDescuentoDocumento`. Agregar esta opción requiere modificar aproximadamente 5 archivos con riesgo bajo, ya que la lógica de acciones ya maneja correctamente el caso `modoDescuentoStock === undefined` (sin efecto en stock).

---

## 2. Estado actual del modal

**Archivo:** `apps/senciyo/src/pages/Private/features/configuracion-sistema/components/negocio/ModalConfiguracionInventario.tsx`

El modal presenta una tabla con dos grupos de filas:

### Documentos configurables (radio buttons)

| Documento       | Opción 1               | Opción 2                  |
|-----------------|------------------------|---------------------------|
| Factura/Boleta  | Automático al emitir   | Mediante Nota de Salida   |
| Nota de Venta   | Automático al generar  | Mediante Nota de Salida   |
| Guía de Remisión| Automático al emitir   | Mediante Nota de Salida   |

### Documentos fijos (comportamiento predefinido, sin opciones)

| Documento      | Comportamiento   |
|----------------|------------------|
| Orden de Venta | Reserva stock    |
| Cotización     | No afecta stock  |
| Nota de Ingreso| Aumenta stock    |
| Nota de Salida | Descuenta stock  |

La tabla tiene columnas `Documento` y `Comportamiento de inventario` con ancho `max-w-lg`. El ancho disponible soporta una tercera opción de radio sin overflow.

---

## 3. Modelo de configuración detectado

### Tipo principal

**Archivo:** `apps/senciyo/src/pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion.tsx` — líneas 65–81

```typescript
export type StockDescuentoDocumento = 'automatico' | 'nota_salida';
// ↑ Solo dos valores. No existe 'sin_control' ni 'no_afecta'.

export type SalesPreferences = {
  allowNegativeStock: boolean;
  pricesIncludeTax: boolean;
  controlStockActivo?: boolean;                         // switch maestro global
  stockDescuentoFacturaYBoleta?: StockDescuentoDocumento;
  stockDescuentoNotaVenta?: StockDescuentoDocumento;
  stockDescuentoGuiaRemision?: StockDescuentoDocumento;
};
```

### Valores por defecto

```typescript
// ContextoConfiguracion.tsx línea 807
const PREFERENCIAS_VENTAS_PREDETERMINADAS: SalesPreferences = {
  allowNegativeStock: false,
  pricesIncludeTax: true,
  controlStockActivo: false,
  stockDescuentoNotaVenta: 'automatico',
  stockDescuentoFacturaYBoleta: 'automatico',
  stockDescuentoGuiaRemision: 'automatico',
};
```

### Tipo en DocumentoComercial

**Archivo:** `apps/senciyo/src/pages/Private/features/documentos-comerciales/models/documentoComercial.types.ts` — línea 135

```typescript
modoDescuentoStock?: 'automatico' | 'nota_salida';
// No incluye 'sin_control'.
```

### Tipo en Comprobante (Factura/Boleta)

**Archivo:** `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext.tsx` — línea 51

```typescript
modoDescuentoStock?: 'automatico' | 'nota_salida' | 'sin_control';
// ↑ Aquí sí existe 'sin_control', pero solo para comprobantes, no para documentos comerciales.
```

---

## 4. Problema funcional detectado

### 4.1 La Nota de Venta está obligada a elegir entre dos opciones que siempre afectan stock

Cuando `controlStockActivo === true`:

- `stockDescuentoNotaVenta = 'automatico'` → la Nota de Venta **valida y descuenta stock al guardar**.
- `stockDescuentoNotaVenta = 'nota_salida'` → la Nota de Venta **muestra botón "Generar Nota de Salida"** y descuenta al generarla.

No existe opción intermedia: "control activo para otros documentos, pero la Nota de Venta no afecta stock".

### 4.2 La única salida actual es el switch global

Si el usuario desactiva `controlStockActivo`, todos los documentos dejan de afectar stock. Esto es un bypass global, no una configuración por documento.

### 4.3 Hay DOS módulos de Nota de Venta con comportamiento distinto (hallazgo crítico)

| Módulo                       | Archivo                                                                                                    | Comportamiento de stock                                               |
|------------------------------|------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| **Documentos-negociacion**   | `Documentos-negociacion/pages/FormularioNotaVenta.tsx` línea 50                                            | `useCart('sin_control')` hardcodeado. **Nunca afecta stock.**         |
| **Documentos-comerciales**   | `documentos-comerciales/components/FormularioDocumentoComercial.tsx` línea 51                              | Cart con `sin_control` (UI), pero **save action sí respeta config.** |

En el módulo **Documentos-comerciales**, la lógica de guardado (`useDocumentoComercialActions.ts` líneas 133–169) respeta completamente `stockDescuentoNotaVenta`:

```typescript
// useDocumentoComercialActions.ts línea 133
if (datos.tipo === 'nota_venta' && controlStockActivo) {
  modoDescuentoStock = stockDescuentoNotaVenta;           // 'automatico' | 'nota_salida'
  if (stockDescuentoNotaVenta === 'automatico') {
    const validacion = validarStockParaOrden(...);        // valida antes de guardar
    if (!validacion.valido) return { exito: false, error: validacion.error };
  }
}
// ...
if (datos.tipo === 'nota_venta' && modoDescuentoStock === 'automatico') {
  reservasStock = descontarStockParaDocumento(...);       // descuenta stock real + Kardex
}
```

### 4.4 El valor `'sin_control'` ya existe internamente pero no es configurable

- Existe como valor de parámetro en `useCart` (`'automatico' | 'nota_salida' | 'sin_control'`)
- Existe en el tipo `modoDescuentoStock` de `Comprobante`
- **No existe** en `StockDescuentoDocumento` (tipo de configuración)
- **No existe** en `DocumentoComercial.modoDescuentoStock`
- **No se puede seleccionar** en el modal

### 4.5 Respuesta a: ¿Nota de Venta está obligada a afectar stock?

**Parcialmente sí.** Cuando el control de inventario está activo y el usuario usa el módulo **Documentos-comerciales**, la Nota de Venta con `stockDescuentoNotaVenta = 'automatico'` SÍ descuenta stock. El módulo **Documentos-negociacion** siempre es `sin_control` independientemente de la configuración.

---

## 5. Alternativas UX evaluadas

### Alternativa A — Tercera opción de radio solo en la fila Nota de Venta

```
Nota de Venta:
( ) Automático al generar
( ) Mediante Nota de Salida
( ) No afecta stock
```

- **Ventaja:** Claro, directo, no rompe el layout de las otras filas.
- **Ventaja:** El ancho `max-w-lg` del modal soporta tres opciones en línea para Nota de Venta.
- **Riesgo menor:** La celda de Nota de Venta queda diferente a las otras dos configurables, pero es justificable porque NV es funcionalmente diferente.
- **Compatibilidad:** Alta. Solo añade un radio en esa fila.

### Alternativa B — Tercera columna "No afecta stock" en toda la tabla

```
Documento         Automático    Nota de Salida    No afecta stock
Factura/Boleta       ○              ○                    —
Nota de Venta        ○              ○                    ○
Guía de Remisión     ○              ○                    —
```

- **Ventaja:** Estructura tabular uniforme.
- **Riesgo:** Celdas vacías (`—`) para Factura/Boleta y Guía de Remisión generan confusión visual.
- **Riesgo:** Implica que "No afecta stock" debería estar disponible para todos, o requiere manejo especial de disabled por fila.
- **Riesgo:** Cambia el ancho de columnas y puede desbordar en pantallas pequeñas.

### Alternativa C — Toggle "Afecta stock" + comportamiento condicional

```
Nota de Venta:
[ ] Afecta stock
    Si activo:   ( ) Automático  ( ) Nota de Salida
    Si inactivo: No afecta stock
```

- **Ventaja:** Semántica clara (primero decides si afecta, luego cómo).
- **Riesgo alto:** Complejidad de interacción innecesaria; dos decisiones en lugar de una selección directa.
- **Riesgo:** Inconsistente con el resto del formulario donde solo hay radios.
- **Descartada.**

### Alternativa D — Misma columna, tercera opción de radio en fila NV (variante de A)

```
Factura / Boleta:
  ( ) Automático al emitir
  ( ) Mediante Nota de Salida

Nota de Venta:
  ( ) Automático al generar
  ( ) Mediante Nota de Salida
  ( ) No afecta stock          ← nuevo

Guía de Remisión:
  ( ) Automático al emitir
  ( ) Mediante Nota de Salida
```

Idéntica a A en resultado. La diferencia es solo en el texto de las opciones; el componente ya es flexiblee por la arquitectura de `OPCIONES_CONFIGURABLES`.

---

## 6. Alternativa recomendada

**Alternativa A / D — Tercera opción de radio exclusivamente en la fila Nota de Venta.**

Razón funcional: la Nota de Venta es el único documento configurable que puede ser puramente comercial/interno sin movimiento físico de mercancía. Factura/Boleta y Guía de Remisión por definición mueven bienes; agregar "No afecta stock" en ellos podría enmascarar errores contables.

Razón técnica: el modal ya itera `OPCIONES_CONFIGURABLES` y renderiza radios genéricamente. Agregar un tercer radio solo para la fila `stockDescuentoNotaVenta` puede hacerse condicionalmente dentro del map sin tocar las otras filas.

Etiqueta recomendada: `No afecta stock` (consistente con el texto ya usado para Cotización en `DOCUMENTOS_FIJOS`).

---

## 7. Impacto funcional esperado

Si se agrega `'sin_control'` como tercera opción configurable para Nota de Venta:

| Aspecto                             | Comportamiento esperado con "No afecta stock"                                          |
|-------------------------------------|----------------------------------------------------------------------------------------|
| Generación de Nota de Venta         | Funciona normalmente. Sin validación de stock.                                         |
| Kardex                              | No se genera movimiento.                                                               |
| Stock disponible                    | No cambia.                                                                             |
| Stock real                          | No cambia.                                                                             |
| Stock reservado                     | No cambia.                                                                             |
| Botón "Generar Nota de Salida"      | No aparece. La condición ya exige `stockDescuentoNotaVenta === 'nota_salida'`.         |
| Anulación de Nota de Venta          | No genera reversión de stock (ya condicionado a `modoDescuentoStock === 'automatico'`).|
| Factura/Boleta                      | Sin cambio. Usa `stockDescuentoFacturaYBoleta`, campo separado.                        |
| Guía de Remisión                    | Sin cambio. Usa `stockDescuentoGuiaRemision`, campo separado.                          |
| Orden de Venta                      | Sin cambio. Reserva stock, no usa `stockDescuentoNotaVenta`.                           |
| Cotización                          | Sin cambio. Siempre "No afecta stock" (fijo).                                         |
| Nota de Ingreso / Nota de Salida    | Sin cambio. Comportamiento fijo.                                                       |
| Módulo Documentos-negociacion (leg.)| Sin cambio. Siempre usa `useCart('sin_control')` hardcodeado.                         |

### Por qué no rompe `modoDescuentoStock === undefined` actual

En `useDocumentoComercialActions.ts` línea 120:
```typescript
let modoDescuentoStock: 'automatico' | 'nota_salida' | undefined;
```

Cuando `controlStockActivo === false`, `modoDescuentoStock` queda `undefined`. Las condiciones de descuento usan `=== 'automatico'` y `=== 'nota_salida'`, por lo que `undefined` ya produce "sin efecto". Agregar `'sin_control'` como valor configurable que resulta en `modoDescuentoStock = 'sin_control'` produce el mismo resultado práctico, pero de forma explícita y trazable.

---

## 8. Archivos involucrados en una futura corrección

| # | Archivo                                                                                                                 | Cambio requerido                                                                                    | Criticidad |
|---|-------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------|-----------|
| 1 | `configuracion-sistema/contexto/ContextoConfiguracion.tsx`                                                              | Extender `StockDescuentoDocumento = 'automatico' \| 'nota_salida' \| 'sin_control'`                 | Alta      |
| 2 | `configuracion-sistema/components/negocio/ModalConfiguracionInventario.tsx`                                             | Agregar tercer radio `'sin_control'` / "No afecta stock" condicionalmente en la fila `nota_venta`   | Alta      |
| 3 | `documentos-comerciales/models/documentoComercial.types.ts`                                                             | Extender `modoDescuentoStock?: 'automatico' \| 'nota_salida' \| 'sin_control'`                      | Alta      |
| 4 | `documentos-comerciales/hooks/useDocumentoComercialActions.ts`                                                          | Actualizar declaración de `modoDescuentoStock` (línea 120 y equivalente en editar) para incluir `'sin_control'` | Media |
| 5 | `configuracion-sistema/components/negocio/SeccionPreferenciasVenta.tsx`                                                 | Agregar `sin_control: 'No afecta stock'` en `LABEL_DESCUENTO` para visualización en el resumen      | Media     |
| 6 | `documentos-comerciales/components/ListadoDocumentosComerciales.tsx`                                                    | Verificar que `puedeGenerarNS()` sigue siendo correcto (ya excluye por `!== 'nota_salida'`; sin cambio necesario) | Baja |
| 7 | `comprobantes-electronicos/lista-comprobantes/contexts/ComprobantesListContext.tsx`                                     | Ya tiene `'sin_control'`; sin cambio necesario                                                      | Ninguna   |

**Archivos que NO requieren cambio:**
- `FormularioNotaVenta.tsx` (módulo legacy — ya es sin_control hardcoded)
- `FormularioDocumentoComercial.tsx` (cart usa sin_control; el save action solo necesita que `modoDescuentoStock` quede como `'sin_control'` o `undefined`, ambos son inocuos)
- `servicioReservaStock.ts` (no se llama si modo no es `'automatico'`)
- Lógica de Kardex (no se toca si no hay descuento)
- Nota de Ingreso, Nota de Salida, Orden de Venta, Cotización

---

## 9. Respuestas a las preguntas del informe

| # | Pregunta                                                                      | Respuesta                                                                                                                                                       |
|---|-------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | ¿Nota de Venta está obligada a afectar stock?                                 | **Sí, cuando `controlStockActivo === true` y se usa el módulo Documentos-comerciales.** El módulo legacy (Documentos-negociacion) siempre es sin_control.       |
| 2 | ¿Existe ya un modo "sin_control" o "no afecta stock"?                         | **Internamente sí** (`useCart`, `ComprobantesListContext`). **No es configurable** en el modal ni en `StockDescuentoDocumento`.                                  |
| 3 | ¿Solo falta exponerlo en UI o también falta soporte funcional?                | **Falta principalmente la exposición en UI + extensión del tipo.** La lógica de acciones ya maneja `modoDescuentoStock !== 'automatico'` como "sin efecto".     |
| 4 | ¿Qué archivos modificar?                                                      | Ver tabla en sección 8. Principalmente: `ContextoConfiguracion.tsx`, `ModalConfiguracionInventario.tsx`, `documentoComercial.types.ts`, `useDocumentoComercialActions.ts`, `SeccionPreferenciasVenta.tsx`. |
| 5 | ¿Cuál es la opción UX más limpia?                                             | **Alternativa A**: tercera opción de radio "No afecta stock" solo en la fila Nota de Venta.                                                                    |
| 6 | ¿Conviene agregar tercera opción visible solo para Nota de Venta?             | **Sí.** Es la solución más directa, consistente con el modelo de radios existente, y no afecta otras filas.                                                    |
| 7 | ¿Conviene agregar columna "Estado" o "Afecta stock"?                          | **No.** Añade complejidad innecesaria para un caso puntual de un solo documento.                                                                               |
| 8 | ¿Conviene una tercera columna "No afecta stock"?                              | **No.** Deja celdas vacías en Factura/Boleta y Guía, genera confusión visual y amplía el ancho del modal.                                                      |
| 9 | ¿Esto debe aplicar solo a Nota de Venta o también a Factura/Boleta/Guía?     | **Solo a Nota de Venta.** Factura/Boleta y Guía de Remisión son documentos que por definición acompañan movimientos físicos de bienes. La hipótesis del usuario es correcta. |
| 10| ¿Qué riesgos hay si se implementa mal?                                        | Ver sección 9 (Riesgos).                                                                                                                                       |
| 11| ¿Cuál es la recomendación final?                                              | Ver sección 10.                                                                                                                                                 |

---

## 9. Riesgos

### Riesgo 1 — TypeScript: unión literal incompleta (BAJO)
Si se extiende `StockDescuentoDocumento` a `'automatico' | 'nota_salida' | 'sin_control'`, TypeScript reportará errores en todos los switch/if que no manejen el nuevo caso. Esto es deseable: obliga a revisar cada punto de consumo.

### Riesgo 2 — `allowNegativeStock` no aplica a "sin_control" (BAJO–MEDIO)
Actualmente `validarStockParaOrden` se llama solo si `stockDescuentoNotaVenta === 'automatico'`. Con `'sin_control'`, esta validación no se invoca. Este es el comportamiento correcto (si no afecta stock, no valida), pero debe estar documentado para no confundir al equipo.

### Riesgo 3 — Documentos ya guardados sin `modoDescuentoStock` (NINGUNO)
Los documentos existentes con `modoDescuentoStock === undefined` ya funcionan como "sin efecto" en la lógica de anulación. El nuevo valor `'sin_control'` no es retroactivamente necesario; los documentos legacy no necesitan migración.

### Riesgo 4 — Etiqueta en SeccionPreferenciasVenta (BAJO)
Si no se actualiza `LABEL_DESCUENTO` en el componente de resumen, mostrará `undefined` o vacío para NV con `'sin_control'`. Es un bug visual, no funcional. Debe incluirse en el mismo PR.

### Riesgo 5 — Desincronización entre módulos legacy y comercial (EXISTENTE, no introducido)
El módulo `Documentos-negociacion` siempre usa `sin_control` independientemente de la configuración. Este riesgo ya existe hoy y no empeora con la mejora propuesta.

### Riesgo 6 — `useDocumentoComercialActions.ts` tiene `modoDescuentoStock` tipado como `'automatico' | 'nota_salida' | undefined` (BAJO)
Si se agrega `'sin_control'` al tipo de `StockDescuentoDocumento`, TypeScript detectará el desajuste en línea 120 y 266. La corrección es extender el tipo de la variable local. La lógica en sí no cambia porque el else final ya actúa como fallback sin efecto.

---

## 10. Recomendación final

**Implementar la Alternativa A: agregar "No afecta stock" como tercera opción de radio exclusivamente en la fila Nota de Venta.**

Justificación:

1. **Funcionalmente necesario.** Una Nota de Venta puede ser un documento interno, de preventa o de control sin movimiento físico. Obligarla a elegir solo entre "automático" o "mediante NS" es incorrecto en esos escenarios.

2. **Técnicamente seguro.** El valor `'sin_control'` ya existe en el runtime. La extensión del tipo y la adición del radio son cambios mínimos que no alteran ningún flujo existente de otros documentos.

3. **UX consistente.** Usar el mismo patrón de radio que las otras opciones, visible solo en la fila correcta. No rompe el layout del modal. La etiqueta "No afecta stock" ya es usada para Cotización, por lo que el lenguaje es coherente.

4. **Riesgo estimado: BAJO.** Cinco archivos, cambios acotados, ninguna migración de datos, ningún efecto en Kardex, Nota de Salida, reservas, ni otros documentos.

5. **Hipótesis del usuario confirmada.** Factura/Boleta y Guía de Remisión no necesitan "No afecta stock" como opción general. Solo Nota de Venta lo requiere.

---

*Auditoría realizada el 2026-06-17 sobre rama `inventarioMejoras2`. No se modificó código.*
