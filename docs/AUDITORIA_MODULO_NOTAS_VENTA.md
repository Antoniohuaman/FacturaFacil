# Auditoría — Módulo Documentos Comerciales > Notas de Venta

**Fecha:** 2026-06-21  
**Auditor:** Análisis estático + revisión funcional  
**Rama:** `cotizacion4`  
**Alcance:** Submódulo Notas de Venta (`nota_venta`) y su relación con Cotizaciones y Órdenes de Venta

---

## 1. Resumen ejecutivo

| Dimensión | Evaluación |
|-----------|-----------|
| **Avance funcional** | ~75% — Los flujos principales están implementados pero hay brechas críticas en conversión a comprobante y desacoplamiento de campos |
| **Avance técnico** | ~80% — La arquitectura es sólida pero existe acoplamiento accidental entre helper de estado y badge compartido |
| **Veredicto** | 🟠 **PARCIAL** — Requiere correcciones antes de producción |
| **Riesgos principales** | Badge muestra estado incorrecto; campo "Requiere aprobación" aparece donde no debe; NV → Comprobante no implementado |

---

## 2. Causa raíz del impacto "Vigente" en Nota de Venta

### Diagnóstico exacto

**Archivo responsable:** `apps/senciyo/src/pages/Private/features/documentos-comerciales/components/EstadoDocumentoBadge.tsx`  
**Línea:** 24  

```tsx
// EstadoDocumentoBadge.tsx — línea 24
const estadoDisplay = normalizarEstadoCotizacionParaDisplay(estado);
```

**Función causante:** `normalizarEstadoCotizacionParaDisplay` en  
`apps/senciyo/src/pages/Private/features/documentos-comerciales/utils/documentoComercial.helpers.ts`  
**Líneas:** 184–190  

```typescript
export const normalizarEstadoCotizacionParaDisplay = (
  estado: EstadoDocumentoComercial,
): EstadoDocumentoComercial => {
  if (estado === 'Generada') return 'Vigente';   // ← CAUSA RAÍZ
  if (estado === 'Rechazada') return 'No aprobada';
  return estado;
};
```

### Por qué ocurre

La función `normalizarEstadoCotizacionParaDisplay` fue creada para mapear el estado legacy `'Generada'` de **Cotizaciones** al nuevo estado `'Vigente'` (migración FASE 2). Sin embargo, el componente `EstadoDocumentoBadge` la aplica a **todos los documentos comerciales** sin discriminar por `tipo`. Como las Notas de Venta son generadas con estado `'Generada'` (correcto por diseño), el badge transforma ese estado y muestra `'Vigente'` en pantalla.

### Cadena del efecto

```
NV generada → estado: 'Generada' (storage ✓)
      ↓
EstadoDocumentoBadge recibe estado='Generada'
      ↓
normalizarEstadoCotizacionParaDisplay('Generada') → 'Vigente'
      ↓
Badge muestra 'Vigente' (INCORRECTO para NV)
```

### Alcance del impacto

| Contexto | ¿Afectado? | Efecto |
|----------|-----------|--------|
| Badge en listado NV | ✅ SÍ | Muestra 'Vigente' en lugar de 'Generada' |
| Badge en drawer de detalle NV | ✅ SÍ | Muestra 'Vigente' en lugar de 'Generada' |
| Estado almacenado en localStorage | ❌ NO | Permanece 'Generada' (storage correcto) |
| Filtros por estado | ❌ NO | Usan `ESTADOS_POR_TIPO[tipo]` correctamente |
| Excel exportado | ❌ NO | Exporta el estado crudo 'Generada' (sin normalizar) |
| Lógica de acciones | ❌ NO | Guards evalúan el estado real del objeto, no el display |
| OV con estado 'Generada' (legacy) | ✅ SÍ | También mostraría 'Vigente' si hay OVs con estado legacy 'Generada' |

### El estado persistido NO fue alterado

La normalización en `documentoComercial.storage.ts` (`normalizarDocumentoCargado`) está correctamente protegida:

```typescript
function normalizarDocumentoCargado(doc: DocumentoComercial): DocumentoComercial {
  if (doc.tipo !== 'cotizacion') return doc;  // Guard correcto — NV/OV no se normalizan en storage
  // ...
}
```

Las NV siguen almacenadas como `'Generada'`. El problema es **solo de presentación**.

---

## 3. Estados correctos de Nota de Venta

### Tipos definidos actualmente

**Archivo:** `apps/senciyo/src/pages/Private/features/documentos-comerciales/models/documentoComercial.types.ts`

```typescript
type EstadoNotaVenta =
  | 'Borrador'
  | 'Generada'
  | 'Convertida'
  | 'Anulada';
```

### Matriz de estados

| Estado | Existe en tipos | Se muestra en UI | Tiene filtro | Acción que lo alcanza | Es correcto para NV | Observación |
|--------|-----------------|-----------------|-------------|----------------------|---------------------|-------------|
| `Borrador` | ✅ | ✅ | ✅ | Guardar borrador | ✅ | Correcto |
| `Generada` | ✅ | ✅ (como 'Vigente' ← bug) | ✅ | `generarDocumento`, `generarDesdeBorrador` | ✅ | Estado inicial correcto; display bugueado |
| `Convertida` | ✅ | ✅ | ✅ | **Ninguna** | ⚠️ Parcial | Estado definido pero **inalcanzable**: no existe flujo NV → Comprobante |
| `Anulada` | ✅ | ✅ | ✅ | `anularDocumento` | ✅ | Correcto |

### Estados que NO deben aparecer en NV

| Estado | Pertenece a | Aparece en NV badge/filtro | Riesgo |
|--------|------------|---------------------------|--------|
| `Vigente` | Cotizaciones | ✅ SÍ (bug en badge) | ALTO — confunde estado |
| `Pendiente aprobación` | Cotizaciones | ❌ NO (filtros correctos) | Ninguno |
| `Aprobada` | Cotizaciones | ❌ NO | Ninguno |
| `Aceptada` | Cotizaciones | ❌ NO | Ninguno |
| `Cerrada perdida` | Cotizaciones | ❌ NO | Ninguno |
| `Vencida` | Cotizaciones/OV | ❌ NO | Ninguno |
| `Reservada` | OV | ❌ NO | Ninguno |

### ¿Necesita NV más estados?

| Pregunta | Respuesta |
|----------|-----------|
| ¿Necesita `Vencida`? | No — NV no tiene ciclo de negociación ni vencimiento |
| ¿Necesita `Cerrada`? | No — no aplica al modelo de NV |
| ¿Necesita `Entregada`? | Posible futuro; actualmente se gestiona vía Nota de Salida |
| ¿Necesita `Convertida`? | Sí, si se implementa NV → Comprobante. Hoy es dead state |
| ¿Necesita `Parcialmente atendida`? | No aplica; no tiene reservas de stock |

---

## 4. Acoplamientos detectados

### Acoplamiento A — `normalizarEstadoCotizacionParaDisplay` aplicada globalmente

**Ubicación:** `EstadoDocumentoBadge.tsx:24`  
**Tipo:** Acoplamiento accidental — función de normalización de Cotizaciones usada en componente compartido  
**Impacto:** NV y OV legacy muestran 'Vigente' en el badge  
**Corrección:** Añadir parámetro `tipo` a la función o condicionar la normalización en el badge

### Acoplamiento B — "Requiere aprobación" en formulario compartido

**Ubicación:** `FormularioHeaderComercial.tsx:519–528`  
**Tipo:** Campo de negocio de Cotizaciones expuesto en componente genérico sin guard por tipo  
**Impacto:** NV y OV muestran el checkbox; si un usuario lo activa en NV, el campo se persiste en `camposOpcionales.requiereAprobacion`  
**Consecuencias secundarias:**  
- El campo aparece en el listado (columna "Req. aprobación") para NV (muestra "No" pero es confuso)  
- El campo aparece en el Excel de NV  
- El drawer de detalle lo mostraría si `camposOpcionales.requiereAprobacion === true`  
**Corrección:** Envolver el checkbox con `{tipoDocumento === 'cotizacion' && (...)}`

### Acoplamiento C — Columna "Req. aprobación" en listado y Excel sin filtro por tipo

**Ubicación:** `ListadoDocumentosComerciales.tsx:641, 662`  
**Tipo:** Columna de datos de Cotizaciones disponible para todos los tipos  
**Impacto:** La columna aparece en la configuración de columnas del tab Notas de Venta; en Excel se incluye si está visible  
**Corrección:** La columna `requiereAprobacion` debería ocultarse u omitirse cuando `tipo !== 'cotizacion'`

### Lo que SÍ está correctamente desacoplado

| Aspecto | Estado |
|---------|--------|
| `normalizarDocumentoCargado` (storage) — guarda con `if tipo !== cotizacion return doc` | ✅ Correcto |
| `evaluarVencimientosCotizaciones` — filtra solo por `tipo === 'cotizacion'` | ✅ Correcto |
| Acciones `aprobar`, `rechazar`, `marcarAceptada`, `cerrarPerdida` — guard `tipo === 'cotizacion'` | ✅ Correcto |
| `puedeConvertirCotizacion` — guard `tipo === 'cotizacion' && estado === 'Aceptada'` | ✅ Correcto |
| `puedeConvertir` (OV) — guard `tipo === 'orden_venta' && estado === 'Reservada'` | ✅ Correcto |
| `calcularEstadoResultanteCotizacion` — solo invocada cuando `tipo === 'cotizacion'` | ✅ Correcto |
| Filtros de estado — usan `ESTADOS_POR_TIPO[tipo]` | ✅ Correcto |
| `ESTADOS_NOTA_VENTA` constante — no incluye estados de Cotización | ✅ Correcto |
| `generarDocumento` — estado inicial 'Generada' para NV (rama `else`) | ✅ Correcto |

---

## 5. Flujo funcional auditado

| # | Flujo | Estado | Evidencia | Riesgo | Recomendación | Prioridad |
|---|-------|--------|-----------|--------|---------------|-----------|
| 1 | Crear nueva NV | ✅ Completo | `FormularioDocumentoComercial.tsx` + ruta `/documentos-comerciales/nuevo/nota_venta` | Bajo | — | — |
| 2 | Guardar como borrador | ✅ Completo | `useDocumentoComercialDrafts`, guardado automático | Bajo | — | — |
| 3 | Retomar borrador | ✅ Completo | Listado + acción editar en `esBorrador=true` | Bajo | — | — |
| 4 | Generar NV | ✅ Completo | `generarDesdeBorrador`, estado 'Generada' correcto | Bajo | — | — |
| 5 | Editar NV | ✅ Completo | `puedeEditar` permite 'Borrador' o 'Generada' | Bajo | — | — |
| 6 | Ver detalle | ✅ Completo | Drawer en `ListadoDocumentosComerciales.tsx` | Bajo | — | — |
| 7 | Duplicar | ✅ Completo | Acción disponible siempre | Bajo | — | — |
| 8 | Anular | ✅ Completo | `puedeAnular`, `anularDocumento` con cascade NS | Bajo | — | — |
| 9 | Imprimir | ✅ Completo | Imprimir A4/Ticket disponible si `!esBorrador` | Bajo | — | — |
| 10 | Compartir | ✅ Completo | Email/WhatsApp/Enlace si `!esBorrador` | Bajo | — | — |
| 11 | Exportar Excel | ⚠️ Parcial | Exporta 'Generada' pero UI muestra 'Vigente' — inconsistencia | Medio | Normalizar estado en Excel igual que en badge | P1 |
| 12 | Generar comprobante | ❌ No implementado | No existe `puedeConvertirNV` ni `construirCargaConversionDesdeNV`. Estado 'Convertida' inalcanzable | Alto | Implementar o definir si aplica al modelo de negocio | P1 |
| 13 | Generar Nota de Salida | ✅ Completo | `puedeGenerarNS` correcto; cascade al anular NV | Bajo | — | — |
| 14 | Convertir desde Cotización | ✅ Completo | `handleConvertirCotANV` con `prefillFrom + cotizacionOrigenId` | Bajo | — | — |
| 15 | Recibir datos de Cotización | ✅ Completo | `prefillFrom` precarga formulario | Bajo | — | — |
| 16 | Restaurar Cotización al anular NV | ✅ Completo | `anularDocumento` restaura Cotización de 'Convertida' → 'Aceptada' | Bajo | — | — |
| 17 | Crédito y cuotas | ✅ Completo | `isCreditMethod` en `FormularioDocumentoComercial` | Bajo | — | — |
| 18 | Documento relacionado | ✅ Completo | `trazabilidad.documentoOrigenNumero` en drawer | Bajo | — | — |
| 19 | Historial y trazabilidad | ✅ Completo | `historial` en drawer | Bajo | — | — |
| 20 | Cancelar creación/conversión | ✅ Completo | Implementado en `EmisionTradicional.tsx` (Task 1) | Bajo | — | — |
| 21 | Series por defecto | ✅ Completo | `useDocumentoComercialType` | Bajo | — | — |

---

## 6. Formulario y campos

### Análisis de campos en `FormularioHeaderComercial.tsx`

| Campo | Líneas | Corresponde a NV | Tiene guard por tipo | Observación |
|-------|--------|-----------------|---------------------|-------------|
| Serie | 276–294 | ✅ Sí | No (aplica a todos) | Correcto |
| Fecha emisión | 297–308 | ✅ Sí | No | Correcto |
| Fecha vencimiento | 310–322 | ⚠️ Opcional | No | Funcional para NV pero no es obligatorio |
| Cliente | 325–432 | ✅ Sí, obligatorio | No | Correcto |
| Moneda | 436–459 | ✅ Sí | No | Correcto |
| Forma de pago | 462–486 | ✅ Sí | No | Correcto |
| Método de envío | 490–503 | ✅ Opcional | No | Correcto |
| Fecha prevista entrega | 505–517 | ✅ Opcional | No | Correcto |
| **Requiere aprobación** | **519–528** | ❌ **No corresponde** | **No — BRECHA** | **Debe ser exclusivo de Cotizaciones** |
| Orden de compra | 533–549 | ✅ Opcional | Config `optionalFields` | Correcto |
| Correo | 552–569 | ✅ Opcional | Config `optionalFields` | Correcto |
| Dirección | 571–588 | ✅ Opcional | Config `optionalFields` | Correcto |
| Dirección de envío | 590–609 | ✅ Opcional | Config `optionalFields` | Correcto |
| Guía de remisión | 611–627 | ✅ Opcional | Config `optionalFields` | Correcto |
| Centro de costo | 629–644 | ✅ Opcional | Config `optionalFields` | Correcto |

### Validaciones del formulario

| Validación | Estado | Evidencia |
|-----------|--------|-----------|
| Cliente obligatorio | ✅ Implementado | `actions.validarDatos(datos)` + `setErrorCliente` |
| Ítems obligatorios | ✅ Implementado | Botón Generar deshabilitado hasta tener ítems |
| Borrador sin validación estricta | ✅ Correcto | `habilitado: modo === 'nuevo' && !prefillFrom && !cotizacionOrigenId` |
| No arrastrar datos anteriores | ✅ Correcto | `clearCart()` al navegar |
| Cancelar no crea borrador | ✅ Correcto | El borrador solo se activa sin `prefillFrom` ni `cotizacionOrigenId` |
| Series por defecto | ✅ Correcto | `useDocumentoComercialType` |
| Cuotas visibles en crédito | ✅ Correcto | `isCreditMethod` condición |

---

## 7. Acciones por estado

| Acción | Existe | Estado visible | Corresponde a NV | Ejecuta lógica real | Observación |
|--------|--------|----------------|-----------------|---------------------|-------------|
| Ver detalle | ✅ | Siempre | ✅ | ✅ | Correcto |
| Editar | ✅ | `Borrador` o `Generada` | ✅ | ✅ | Correcto |
| Retomar borrador | ✅ | Solo `esBorrador=true` | ✅ | ✅ | Correcto |
| Duplicar | ✅ | Siempre | ✅ | ✅ | Correcto |
| Imprimir A4 | ✅ | `!esBorrador` | ✅ | ✅ | Correcto |
| Imprimir Ticket | ✅ | `!esBorrador` | ✅ | ✅ | Correcto |
| Compartir Email/WhatsApp | ✅ | `!esBorrador` | ✅ | ✅ | Correcto |
| Anular | ✅ | Excepto `Anulada`, `Convertida`, `Borrador` | ✅ | ✅ | Correcto |
| Eliminar borrador | ✅ | Solo `esBorrador=true` | ✅ | ✅ | Correcto |
| **Generar comprobante** | ❌ | — | **Debería existir** | — | **No implementado para NV** |
| Generar Nota de Salida | ✅ | `Generada` + modo `nota_salida` + stock activo | ✅ | ✅ | Correcto |
| Aprobar | ✅ | `Pendiente aprobación` | ❌ Solo Cotizaciones | ✅ (guard correcto) | NO aparece en NV — correcto |
| No aprobar | ✅ | `Pendiente aprobación` | ❌ Solo Cotizaciones | ✅ (guard correcto) | NO aparece en NV — correcto |
| Marcar como aceptada | ✅ | `Vigente` o `Aprobada` | ❌ Solo Cotizaciones | ✅ (guard correcto) | NO aparece en NV — correcto |
| Cerrar perdida | ✅ | `Vigente`, `Aprobada`, `Aceptada` | ❌ Solo Cotizaciones | ✅ (guard correcto) | NO aparece en NV — correcto |
| Generar NV/OV desde Cot | ✅ | `Aceptada` (Cotización) | ❌ Solo Cotizaciones | ✅ (guard correcto) | NO aparece en NV — correcto |

---

## 8. Conversión a comprobante

### Estado actual

**No existe flujo NV → Comprobante en el módulo.**

- `puedeConvertir(doc)` → solo `tipo === 'orden_venta' && estado === 'Reservada'`
- No existe `puedeConvertirNV()` equivalente
- No existe `construirCargaConversionDesdeNV()`
- No existe `validarNVParaConversion()`
- El estado `'Convertida'` en `EstadoNotaVenta` es **dead state** — definido en tipos pero inalcanzable

### Consecuencias

- El usuario no puede generar un comprobante directamente desde una NV existente
- El flujo `NV → Comprobante` solo existe si la NV fue generada desde una Cotización y se convierte indirectamente
- Si el modelo de negocio requiere NV → Comprobante (factura/boleta), hay que implementar el flujo análogo al de OV

### Prevención de doble conversión

Sin flujo implementado, no hay riesgo de doble conversión.

---

## 9. Conversión desde Cotización

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Prellenado correcto | ✅ | `handleConvertirCotANV` pasa `prefillFrom: {...doc}` |
| Serie por defecto | ✅ | La NV usa su propia configuración de series |
| Cancelación → retorno a Cotización | ✅ | Implementado en Task 1 (sessionStorage cleanup + navigate) |
| No crea borrador automático | ✅ | `habilitado: ... && !cotizacionOrigenId` |
| Cotización queda 'Convertida' | ✅ | `vincularDocumentoConCotizacion` en actions |
| Trazabilidad bidireccional | ✅ | `documentoOrigenId/Numero` en NV; `documentoDestinoId/Numero` en Cotización |
| Sync cambios comerciales | ✅ | `tieneCambiosComerciales` + modal de confirmación (Task 2) |
| Bloqueo si Cotización con aprobación | ✅ | Modal 'con_aprobacion' bloquea cambios |
| Reapertura de Cotización al anular NV | ✅ | `anularDocumento` restaura 'Convertida' → 'Aceptada' |
| Stock refrescado al convertir | ✅ | `refrescarStockItem` en `handleConvertirCotANV` |
| NV directa no hereda reglas de aprobación | ⚠️ | Campo "Requiere aprobación" visible pero no afecta estado de NV — solo display |

---

## 10. Inventario / Nota de Salida

| Aspecto | Comportamiento real | Riesgo |
|---------|--------------------|----|
| ¿NV descuenta stock directamente? | Solo si `modoDescuentoStock === 'automatico'` (config) | Bajo — configurable |
| ¿Genera Nota de Salida? | Solo si `modoDescuentoStock === 'nota_salida'` y `controlStockActivo=true` | Bajo |
| ¿Reserva stock? | **NO** — eso es exclusivo de OV | Bajo |
| ¿La anulación revierte stock? | Sí, si modo 'automatico': `revertirDescuentoStockDocumento` | Bajo |
| ¿Riesgo de doble descuento? | No — modos mutuamente excluyentes por config | Bajo |
| ¿Confusión con reglas de OV? | No — `getModoDescuentoNV` es exclusivo de NV | Bajo |
| ¿La conversión a comprobante altera inventario? | N/A — no existe flujo NV → Comprobante | — |
| ¿Cascade NS al anular NV? | ✅ Sí — anula NS primero si `notaSalidaGenerada && notaSalidaId` | Bajo |
| ¿Doble anulación de NS? | Protegido por `notaSalidaGenerada` flag | Bajo |

---

## 11. Anulación y trazabilidad

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Modal con motivo obligatorio | ✅ | `confirmandoAccion.tipo === 'anular'` con input motivo |
| Estado final | ✅ | `'Anulada'` |
| Historial actualizado | ✅ | `crearEvento` registra acción |
| NS vinculada anulada primero | ✅ | Líneas 553–561 `ListadoDocumentosComerciales.tsx` |
| Cotización origen restaurada | ✅ | `anularDocumento` busca y restaura cotización 'Convertida' → 'Aceptada' |
| Inventario revertido | ✅ | `revertirDescuentoStockDocumento` si modo 'automatico' |
| Prevención doble anulación | ✅ | `puedeAnular` retorna false si `estado === 'Anulada'` |
| NV anulada no permite conversión | ✅ | `puedeConvertir` no incluye NV; ya no existiría la acción |
| NV anulada no permite edición | ✅ | `puedeEditar` — default branch; 'Anulada' no está en lista editable |
| Trazabilidad limpiada en cotización origen | ✅ | `documentoDestinoId`, `documentoDestinoTipo`, `documentoDestinoNumero` limpiados |

---

## 12. Listado, filtros y columnas

| Aspecto | Estado | Observación |
|---------|--------|-------------|
| Búsqueda por nombre/número | ✅ | Filtro de texto libre |
| Filtro por fecha | ✅ | Rango de fechas |
| Filtro por estado | ✅ | Usa `ESTADOS_POR_TIPO['nota_venta']` → solo ['Borrador', 'Generada', 'Convertida', 'Anulada'] |
| Badge coincide con filtro | ❌ | Badge muestra 'Vigente'; filtro busca 'Generada'; son distintos strings — incongruencia |
| Paginación | ✅ | Implementada |
| Ordenamiento | ✅ | Implementado |
| Columnas configurables | ✅ | Columnas por tab |
| Columna Estado | ⚠️ | Muestra 'Vigente' (normalizado) en listado aunque estado interno es 'Generada' |
| Columna "Req. aprobación" | ⚠️ | Disponible en tab NV; muestra 'No' para todas — confuso |
| Doc. relacionado | ✅ | `trazabilidad.documentoOrigenNumero` para NV |
| Conteo coincide con datos | ✅ | Filtrado sobre array en memoria |

### Problema filtro + badge

Si el usuario filtra por "Generada" en el tab NV, el filtro funciona porque compara contra `doc.estado` (que es `'Generada'`). Pero el badge muestra 'Vigente'. El usuario ve NVs con badge 'Vigente' al filtrar por 'Generada', lo que es confuso. Igualmente, si busca por 'Vigente', no encontrará nada porque el estado real es 'Generada'.

---

## 13. Exportación Excel

| Campo | Estado | Observación |
|-------|--------|-------------|
| Respeta filtros visibles | ✅ | Exporta `documentosFiltrados` |
| Número de NV | ✅ | Campo `numero` |
| Cliente | ✅ | `cliente.nombre` |
| Documento cliente | ✅ | Columna opcional |
| Fecha emisión | ✅ | `fechaEmision` |
| Fecha vencimiento | ✅ | `camposOpcionales.fechaVencimiento` |
| Moneda | ✅ | `moneda` |
| Subtotal / IGV / Total | ✅ | Como número |
| **Estado** | ❌ | Exporta `'Generada'` mientras UI muestra `'Vigente'` — inconsistencia |
| Usuario | ✅ | `vendedor` |
| Doc. relacionado | ✅ | `trazabilidad.documentoOrigenNumero` para NV |
| Forma de pago | ✅ | `formaPago` |
| **Req. aprobación** | ⚠️ | Columna presente en Excel de NV; muestra 'No' siempre — confuso |

El Excel exporta el estado crudo del objeto (`doc.estado`) en la línea 637 de `ListadoDocumentosComerciales.tsx`:

```typescript
estado: doc.estado,  // 'Generada' — mientras el badge muestra 'Vigente'
```

Una vez corregido el badge para que NV muestre 'Generada', la inconsistencia desaparece y el Excel quedaría correcto automáticamente.

---

## 14. Hallazgos técnicos

### HT-01 — Nombre engañoso: `normalizarEstadoCotizacionParaDisplay`

La función se llama con prefijo "Cotización" pero se aplica globalmente. Esto indujo el error: al leerla, parece específica pero no lo es.

### HT-02 — `EstadoDocumentoBadge` no discrimina por tipo

El badge recibe solo `estado: EstadoDocumentoComercial`. No sabe el tipo de documento. La normalización que aplica es correcta para cotizaciones pero incorrecta para el resto.

**Opciones de corrección:**
1. Añadir prop `tipo?: TipoDocumentoComercial` al badge y condicionar la normalización
2. Crear un helper `normalizarEstadoParaDisplay(estado, tipo)` que encapsule la lógica diferenciada
3. Separar `normalizarEstadoCotizacionParaDisplay` de la lógica general de display

### HT-03 — `CamposOpcionalesDocumentoComercial.requiereAprobacion` en interfaz compartida

El campo está en la interfaz compartida pero es semánticamente exclusivo de Cotizaciones. Podría moverse a una interfaz extendida `CamposOpcionalesCotizacion`.

### HT-04 — Estado `'Convertida'` en `EstadoNotaVenta` es dead state

No hay ninguna acción que lleve a una NV al estado 'Convertida'. Si no se implementa NV → Comprobante, este estado debe eliminarse del tipo para evitar confusión y código muerto.

### HT-05 — Excel sin normalización de estado

El Excel exporta `doc.estado` directamente mientras la UI muestra el estado normalizado. Si se corrige el badge (P0-01), el Excel pasará a ser el estado real correcto. Si la normalización se mantiene para cotizaciones, el Excel de Cotizaciones también debería normalizar `'Rechazada'` → `'No aprobada'`.

---

## 15. Brechas P0, P1 y P2

| ID | Hallazgo | Tipo | Impacto | Evidencia | Prioridad | Recomendación |
|----|----------|------|---------|-----------|-----------|---------------|
| **P0-01** | Badge NV muestra 'Vigente' en lugar de 'Generada' | Regresión funcional | Estado incorrecto en UI; filtro por 'Vigente' no encuentra NVs | `EstadoDocumentoBadge.tsx:24` + `documentoComercial.helpers.ts:187` | **P0** | Añadir param `tipo` al badge o crear helper diferenciado que solo normalice para cotizaciones |
| **P0-02** | Campo "Requiere aprobación" aparece en formulario NV y OV | Filtración de regla de negocio | Usuario puede marcarlo en NV; campo se persiste en camposOpcionales; aparece en detalle/Excel | `FormularioHeaderComercial.tsx:519–528` | **P0** | Envolver con `{tipoDocumento === 'cotizacion' && (...)}` |
| **P1-01** | NV → Comprobante no implementado; estado 'Convertida' inalcanzable | Funcionalidad faltante | Flujo de negocio incompleto si se requiere emitir comprobante desde NV | Ausencia de `puedeConvertirNV`, `construirCargaConversionDesdeNV` | **P1** | Definir si aplica; implementar análogo al flujo OV → Comprobante o eliminar 'Convertida' del tipo |
| **P1-02** | Excel de Cotizaciones exporta estado 'Rechazada' (legacy) sin normalizar | Dato incorrecto en exportación | Excel puede mostrar 'Rechazada' cuando UI muestra 'No aprobada' | `ListadoDocumentosComerciales.tsx:637` + `helpers.ts:188` | **P1** | Normalizar `doc.estado` en la fila Excel usando el mismo helper |
| **P2-01** | Columna "Req. aprobación" visible en tab NV y OV | UX confusa | Muestra 'No' para todas las NVs; no aporta información | `ListadoDocumentosComerciales.tsx:641, 662` | **P2** | Ocultar la columna en tabs que no son Cotización |
| **P2-02** | `normalizarEstadoCotizacionParaDisplay` — nombre engañoso | Calidad de código | Confunde a futuros desarrolladores | `documentoComercial.helpers.ts:184` | **P2** | Renombrar o refactorizar para hacer explícita la aplicación selectiva |
| **P2-03** | `'Convertida'` en `EstadoNotaVenta` sin acción que lo alcance | Código muerto en tipos | Dead state; filtro de estado lo muestra pero nunca se llega | `documentoComercial.types.ts` | **P2** | Eliminar si no se implementa NV → Comprobante; o documentarlo claramente |

---

## 16. Comparación esperada de estados

| Tipo de documento | Estados correctos esperados | Estados actuales en código | Estados indebidos actuales | Acción recomendada |
|-------------------|----------------------------|---------------------------|---------------------------|-------------------|
| **Cotización** | Borrador, Vigente, Pendiente aprobación, Aprobada, No aprobada, Aceptada, Cerrada perdida, Vencida, Convertida, Anulada | ✅ Todos presentes y alcanzables | Ninguno (solo legacy manejado) | Mantener |
| **Nota de Venta** | Borrador, Generada, Convertida*, Anulada | Presente en tipos; badge muestra 'Vigente' en lugar de 'Generada' | `Vigente` (en badge, no en storage) | Corregir badge (P0-01); implementar o eliminar 'Convertida' (P1-01/P2-03) |
| **Orden de Venta** | Borrador, Reservada, Pendiente de salida, Atendida parcialmente, Atendida, Anulada, Vencida | ✅ Presentes; legacy 'Generada' manejado | `Vigente` posible en badge si hay OVs con estado legacy 'Generada' | Misma corrección que P0-01 aplica también a OV legacy |

*`Convertida` solo aplica si se implementa flujo NV → Comprobante.

---

## 17. Recomendación final

🟠 **PARCIAL — No listo para cerrar sin las correcciones P0**

El módulo está funcionalmente bien estructurado en su mayoría. Los Guards de acciones de Cotizaciones están correctamente aplicados. La normalización de storage es correcta. El flujo de anulación con cascade está completo.

Sin embargo, existen **dos brechas P0** que deben corregirse antes de cualquier despliegue:

1. El badge muestra un estado incorrecto ('Vigente') para todas las Notas de Venta — afecta directamente la percepción del usuario y la consistencia del filtro.
2. El campo "Requiere aprobación" aparece en el formulario de NV — introduce un campo de negocio de Cotizaciones que no tiene función en NV.

Adicionalmente, hay **una brecha P1** que define si el módulo está funcionalmente completo: la conversión NV → Comprobante. Dependiendo del modelo de negocio, puede ser necesaria o no. Su ausencia deja el estado 'Convertida' como dead code.

### Correcciones P0 (no requieren análisis funcional adicional)

**P0-01 — Fix del badge:**
```typescript
// Opción A: helper diferenciado
export function normalizarEstadoParaDisplay(
  estado: EstadoDocumentoComercial,
  tipo: TipoDocumentoComercial,
): EstadoDocumentoComercial {
  if (tipo !== 'cotizacion') return estado;  // NV y OV muestran estado real
  if (estado === 'Generada') return 'Vigente';
  if (estado === 'Rechazada') return 'No aprobada';
  return estado;
}
// Actualizar EstadoDocumentoBadge para recibir `tipo` y usar la nueva función
```

**P0-02 — Fix campo "Requiere aprobación":**
```tsx
// FormularioHeaderComercial.tsx línea 519
{tipoDocumento === 'cotizacion' && (
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="checkbox"
      checked={camposOpcionales.requiereAprobacion ?? false}
      onChange={(e) => onCampoOpcionalChange('requiereAprobacion', e.target.checked || undefined)}
      className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
    />
    <span className="text-sm text-gray-700 dark:text-gray-300">Requiere aprobación</span>
  </label>
)}
```

---

## 18. Checklist final

| Ítem | Estado | Nota |
|------|--------|------|
| Crear NV | ✅ | Funciona |
| Guardar borrador | ✅ | Funciona |
| Retomar borrador | ✅ | Funciona |
| Generar | ✅ | Estado 'Generada' correcto en storage |
| Editar | ✅ | Solo desde 'Borrador' o 'Generada' |
| Duplicar | ✅ | Funciona |
| Anular | ✅ | Con cascade NS + restauración Cotización |
| Ver detalle | ✅ | Drawer completo |
| Imprimir | ✅ | A4 y Ticket |
| Compartir | ✅ | Email/WhatsApp/Enlace |
| **Exportar Excel** | ⚠️ | Estado inconsistente con badge (P1-02) |
| **Generar comprobante** | ❌ | No implementado (P1-01) |
| Generar Nota de Salida | ✅ | Funciona con guard correcto |
| Crédito/cuotas | ✅ | Funciona |
| **Estados** | ❌ | Badge muestra 'Vigente' en lugar de 'Generada' (P0-01) |
| Filtros | ✅ | Correctos (filtra por 'Generada' real) |
| Columnas | ⚠️ | "Req. aprobación" visible en NV tab (P2-01) |
| Documento relacionado | ✅ | `documentoOrigenNumero` correcto |
| Trazabilidad | ✅ | Historial completo |
| **Integración con Cotización** | ⚠️ | Campo "Req. aprobación" filtrado (P0-02); resto correcto |
| Integración con Inventario | ✅ | NS, cascade al anular |

---

## 19. Apéndice — Archivos clave

| Archivo | Rol | Riesgo |
|---------|-----|--------|
| `components/EstadoDocumentoBadge.tsx` | Badge compartido — causa del bug 'Vigente' | **ALTO** |
| `utils/documentoComercial.helpers.ts` | Helper de normalización global — función sin guard por tipo | **ALTO** |
| `components/FormularioHeaderComercial.tsx` | Formulario compartido — campo "Requiere aprobación" sin guard | **ALTO** |
| `components/ListadoDocumentosComerciales.tsx` | Listado, filtros, menú, Excel — bien desacoplado en acciones | **MEDIO** |
| `hooks/useDocumentoComercialActions.ts` | Acciones — Guards correctos para tipos | **BAJO** |
| `utils/documentoComercial.storage.ts` | Storage — Normalización correctamente aislada a cotizaciones | **BAJO** |
| `models/documentoComercial.types.ts` | Tipos — Estado 'Convertida' dead state en NV | **BAJO** |
| `utils/convertirOVaComprobante.ts` | Conversiones — Sin equivalente para NV | **MEDIO** |
