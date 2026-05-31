# Auditoría extrema del formulario de emisión para reutilización en Documentos Comerciales

> **Fecha de auditoría:** 2026-05-31  
> **Auditor:** Arquitecto senior frontend (análisis estático exhaustivo, sin modificación de código)  
> **Versión del repositorio auditado:** branch `develop`, commit `6b6d60c7`

---

## 1. Resumen ejecutivo

### Veredicto general

El formulario de emisión actual **puede reutilizarse parcialmente**, pero **no debe moverse ni copiarse directamente**. Tiene componentes visuales de alta calidad que son genéricos en esencia, pero están envueltos en un nivel de orquestación (`EmisionTradicional.tsx`) y acoplados a lógica tributaria/SUNAT que no tiene cabida en Documentos Comerciales.

### Qué sí se puede reutilizar

| Qué | Cómo |
|-----|------|
| `CompactDocumentForm.tsx` | Solo la parte visual del formulario. Crear un wrapper `FormularioDocumentoComercial` que lo instancie con props adecuadas para el nuevo módulo. |
| `ProductsSection.tsx` | La tabla de ítems, el buscador de productos y la lógica de descuentos son genéricos. Reutilizable con props. |
| `NotesSection.tsx` | Completamente genérico. Reutilizable directamente. |
| `ConfigurationCard.tsx` | Completamente genérico. Reutilizable directamente. |
| `ActionButtonsSection.tsx` | Genérico por diseño (recibe callbacks). Reutilizable con props personalizadas. |
| `FieldsConfigModal.tsx` | Genérico. Reutilizable con props. Necesita clave de storage propia. |
| `useCart.tsx` | La lógica de carrito es genérica. Reutilizable directamente. |
| `useCurrency.tsx` (form-core) | Envoltura genérica del currencyManager. Reutilizable directamente. |
| `usePayment.tsx` | Cálculos de totales son genéricos. Reutilizable directamente. |
| `useFieldsConfiguration.ts` | Reutilizable con clave de storage diferente. |
| `useBorradorEnProgreso.ts` | En `shared/borradores`. Completamente genérico. Reutilizable directamente. |
| `shared/currency/` | Completamente genérico. Reutilizable directamente. |
| `shared/inventory/stockGateway.ts` | Genérico. Útil para futura fase de reserva de stock. |
| `shared/documentos/servicioConsultaDocumentos.ts` | Consulta RUC/DNI genérica. Reutilizable directamente. |
| `CartItem` (tipo) | Tipo de ítem de carrito. Mover a capa compartida. |
| `TablaVentaLibre.tsx` | Tabla de entrada libre. Reutilizable con props. |

### Qué NO se debe reutilizar

| Qué | Por qué |
|-----|---------|
| `useComprobanteActions.tsx` | Completamente acoplado a SUNAT, cobranzas, stock de venta oficial, Kardex. |
| `useDocumentType.tsx` | Hardcodeado para códigos SUNAT ('01'=factura, '03'=boleta, '07'=NC) y prefijos F/B. |
| `useDuplicateDataLoader.tsx` | Carga datos para flujos de duplicación/NC específicos de comprobantes. |
| `useDrafts.tsx` | Acoplado a borradores de comprobantes con validaciones SUNAT de expiración. |
| `useComprobanteState.tsx` | Mezcla estado del formulario con lógica de caja. |
| `useCreditTermsConfigurator.ts` | Específico del flujo de crédito/cobranzas de comprobantes. |
| `BloqueoCajaCerrada` | Exclusivo del flujo de caja para comprobantes. |
| `CobranzaModal` | Exclusivo del flujo de cobranza. |
| `PostIssueOptionsModal` | Exclusivo post-emisión SUNAT. |
| `SuccessModal` (actual) | Acoplado a estados de comprobante (enviado/aceptado SUNAT). |
| `instantaneaDocumentoComercial.ts` | Contiene lógica SUNAT (códigos, NC, CDR). Puede inspirar pero no reutilizarse. |
| `createComprobante()` / llamadas al backend de emisión | Exclusivo de comprobantes electrónicos SUNAT. |

### Sobre `CompactDocumentForm`

**No conviene moverlo**. Es el corazón del formulario actual y moverlo rompe comprobantes. La estrategia correcta es:

> Crear `FormularioDocumentoComercial` en el nuevo módulo, que use `CompactDocumentForm` directamente como sub-componente (igual que lo hace `EmisionTradicional.tsx`), pero con props que omitan los campos de NC/SUNAT y pasen configuraciones adecuadas para documentos comerciales.

### Recomendación para Fase 1

1. Crear `DocumentosComerciales/` como módulo independiente.
2. Crear un tipo de documento parametrizable (`TipoDocumentoComercial`: cotizacion | nota_venta | orden_venta).
3. Crear `FormularioDocumentoComercial` que componga los mismos sub-componentes que `EmisionTradicional` (`CompactDocumentForm`, `ProductsSection`, `NotesSection`, `ActionButtonsSection`).
4. Crear un `useDocumentoComercialActions` propio (NO derivar de `useComprobanteActions`).
5. Crear un `useDocumentoComercialType` propio (NO derivar de `useDocumentType`).
6. Reutilizar `useCart`, `useCurrency`, `usePayment`, `useFieldsConfiguration`, `useBorradorEnProgreso`.
7. NO tocar stock, cobranzas, caja, SUNAT, ni el módulo viejo.

---

## 2. Alcance revisado

### Archivos leídos directamente

| Archivo | Líneas | Estado |
|---------|--------|--------|
| `pages/EmisionTradicional.tsx` | 1.937 | Leído completo |
| `form-core/components/CompactDocumentForm.tsx` | 1.292 | Leído completo |
| `form-core/components/ProductsSection.tsx` | 2.160 | Leído (parcial ~1.743 líneas) |
| `form-core/components/ActionButtonsSection.tsx` | 130 | Leído completo |
| `form-core/components/ConfigurationCard.tsx` | 160 | Leído completo |
| `form-core/components/FieldsConfigModal.tsx` | 226 | Leído completo |
| `form-core/components/NotesSection.tsx` | 100 | Leído completo |
| `form-core/components/TablaVentaLibre.tsx` | 537 | Leído completo |
| `form-core/contexts/FieldsConfigurationContext.tsx` | 183 | Leído completo |
| `form-core/hooks/useCurrency.tsx` | 98 | Leído completo |
| `form-core/hooks/useDocumentType.tsx` | 325 | Leído completo |
| `form-core/hooks/useFieldsConfiguration.ts` | 130 | Leído completo |
| `form-core/hooks/usePayment.tsx` | ~300 | Leído completo |
| `form-core/hooks/usePriceBook.ts` | ~250 | Leído completo |
| `form-core/hooks/useProductSearch.tsx` | ~200 | Leído completo |
| `hooks/useComprobanteActions.tsx` | ~1.200 | Leído completo |
| `hooks/useDuplicateDataLoader.tsx` | ~280 | Leído completo |
| `hooks/useDrafts.tsx` | ~230 | Leído completo |
| `hooks/useComprobanteState.tsx` | ~120 | Leído completo |
| `hooks/useCreditTermsConfigurator.ts` | ~100 | Leído completo |
| `hooks/useAvailableProducts.tsx` | ~80 | Leído completo |
| `hooks/usePreview.tsx` | ~150 | Leído completo |
| `hooks/useCart.tsx` (punto-venta) | ~400 | Leído (200 líneas) |
| `models/comprobante.types.ts` | ~400 | Leído completo |
| `models/instantaneaDocumentoComercial.ts` | ~712 | Leído completo |
| `models/constants.ts` | ~120 | Leído completo |
| `shared/borradores/useBorradorEnProgreso.ts` | ~180 | Leído completo |
| `shared/borradores/almacenamientoBorradorEnProgreso.ts` | ~120 | Leído completo |
| `shared/currency/currencyManager.ts` | ~300 | Leído completo |
| `shared/currency/types.ts` | ~80 | Leído completo |
| `shared/currency/constants.ts` | ~30 | Leído completo |
| `shared/documentos/servicioConsultaDocumentos.ts` | ~150 | Leído completo |
| `shared/inventory/stockGateway.ts` | ~400 | Leído completo |
| `shared/inventory/unitConversion.ts` | ~200 | Leído completo |
| `shared/inventory/accionesStock.ts` | ~80 | Leído completo |
| `shared/series/collectionSeries.ts` | ~80 | Leído completo |
| `layouts/components/SearchBar.tsx` | ~1.500 | Leído completo |
| `Documentos-negociacion/pages/FormularioCotizacion.tsx` | ~100 (primeras líneas) | Leído parcial |
| `Documentos-negociacion/pages/FormularioNotaVenta.tsx` | ~100 (primeras líneas) | Leído parcial |

### Búsquedas de referencias realizadas

Se realizaron 20 búsquedas por términos clave que cubren todos los términos solicitados. Resultados documentados en la sección de inventario.

---

## 3. Mapa actual del formulario de emisión

### Componente raíz

```
EmisionTradicional.tsx (1.937 líneas)
└── Página orquestadora completa
    ├── Proveedor: FieldsConfigurationProvider (contexto de campos)
    ├── CompactDocumentForm (cliente, serie, fecha, moneda, formaPago, campos opcionales)
    ├── ProductsSection (buscador de productos, tabla de ítems, descuentos, totales)
    ├── NotesSection (observaciones, nota interna)
    ├── ActionButtonsSection (botones: preview, cancelar, borrador, emitir)
    ├── SidePreviewPane (panel lateral de vista previa)
    ├── Modales situacionales:
    │   ├── BloqueoCajaCerrada
    │   ├── DraftModal
    │   ├── CobranzaModal
    │   ├── PreviewModal
    │   ├── SuccessModal
    │   ├── PostIssueOptionsModal
    │   ├── CreditScheduleModal
    │   └── FieldsConfigModal
    └── PreviewDocument (impresión)
```

### Hooks que sostienen el formulario en EmisionTradicional

```
useCart()                    → carrito de productos (items, cantidades, precios)
useCurrency()                → moneda, tipo de cambio, conversión
useDrafts()                  → borradores guardados
useDocumentType()            → tipo comprobante, series disponibles
usePreview()                 → datos para vista previa
useComprobanteState()        → viewMode, formaPago, observaciones, caja
useComprobanteActions()      → crear, guardar, validar, stock, cobranzas
useFieldsConfiguration()     → visibilidad de campos (+ Campos)
useDuplicateDataLoader()     → rehidratación desde duplicación/NC
useSidePreviewPane()         → panel lateral
useCreditTermsConfigurator() → cuotas de crédito
useRetornoAperturaCaja()     → apertura de caja
useBorradorEnProgreso()      → borrador persistente en tiempo real
useClientes()                → gestión de clientes
useConfigCanales()           → canales
useProductStore()            → catálogo de productos
```

### Flujo de datos

```
URL params → useDocumentType → tipoComprobante, serieSeleccionada
                                      ↓
useCart → cartItems ──────────────────→ ProductsSection
useCurrency → moneda, conversión ──────→ CompactDocumentForm
usePayment → totales, cálculos ────────→ TaxBreakdownSummary
FieldsConfigurationContext → visibilidad→ CompactDocumentForm + ProductsSection
                                      ↓
EmisionTradicional (estado elevado)
├── clienteSeleccionadoGlobal
├── fechaEmision
├── optionalFields
├── appliedGlobalDiscount
└── datosNotaCredito
                                      ↓
useComprobanteActions.createComprobante()
├── Validar permisos
├── Descontar stock (FIFO)
├── Registrar cobranza
├── Crear snapshot (instantánea)
└── Analytics
```

---

## 4. Inventario de componentes del formulario

| Componente | Ubicación | Responsabilidad | Acoplamiento comprobantes | Reutilizable | Recomendación |
|-----------|-----------|----------------|--------------------------|--------------|---------------|
| `EmisionTradicional` | `pages/` | Orquestador completo de emisión | MUY ALTO (caja, SUNAT, cobranzas) | NO | No reutilizar. Crear `FormularioDocumentoComercial` por separado. |
| `CompactDocumentForm` | `form-core/components/` | Datos del documento (cliente, serie, moneda, formaPago, campos opcionales) | MEDIO (lookup RUC/DNI, tipos NC) | PARCIAL | Usar directamente desde el nuevo formulario, pasando props que omiten flujos NC/SUNAT |
| `ProductsSection` | `form-core/components/` | Búsqueda de productos, tabla de ítems, ajuste de stock, descuentos | BAJO-MEDIO (ajuste stock, impuestos SUNAT) | PARCIAL | Reutilizar la parte visual y de búsqueda; el ajuste manual de stock podría controlarse por prop |
| `TablaVentaLibre` | `form-core/components/` | Tabla editable para ítems libres | BAJO (tipos IGV son SUNAT pero puede ignorarse) | SÍ | Reutilizable directamente. Los tipos IGV se pueden pasar por props. |
| `NotesSection` | `form-core/components/` | Observaciones y nota interna | NULO | SÍ | Reutilizable directamente, sin cambios. |
| `ConfigurationCard` | `form-core/components/` | Card colapsable con header, badge, acciones | NULO | SÍ | Reutilizable directamente. |
| `ActionButtonsSection` | `form-core/components/` | Barra sticky de botones | BAJO (texto "Crear comprobante" es configurable) | SÍ | Reutilizable directamente. El `primaryAction.label` puede ser "Guardar" o "Generar". |
| `FieldsConfigModal` | `form-core/components/` | Modal de personalización de campos | BAJO (nombresde campos en español, genéricos) | SÍ | Reutilizable. Necesita su propia lista de campos opcionales. |
| `BloqueoCajaCerrada` | `shared/` | Bloqueo cuando caja está cerrada | MUY ALTO (específico de caja) | NO | No usar en documentos comerciales. |
| `CobranzaModal` | `shared/modales/` | Registro de cobro/pago | MUY ALTO (cobranzas) | NO | No usar en documentos comerciales. |
| `PostIssueOptionsModal` | `shared/modales/` | Opciones post-emisión SUNAT | MUY ALTO (SUNAT) | NO | No usar en documentos comerciales. |
| `SuccessModal` | `shared/modales/` | Modal de éxito de emisión | ALTO (estado SUNAT: enviado/aceptado) | NO | Crear un modal de éxito propio para documentos comerciales. |
| `SidePreviewPane` | `shared/` | Panel lateral vista previa | MEDIO (formato de comprobante) | PARCIAL | Crear versión para documentos comerciales o reutilizar si se parametriza el formato. |
| `PreviewDocument` | `shared/` | Documento para impresión | ALTO (formato A4/ticket de comprobante) | NO (sin refactoring) | Crear un `PreviewDocumentoComercial` separado. |
| `CreditScheduleModal` | `shared/` | Cronograma de crédito | ALTO (cobranzas, cuotas) | NO | No usar en documentos comerciales fase 1. |

---

## 5. Inventario de hooks y lógica

| Hook/Lógica | Ubicación | Responsabilidad | Acoplamiento | Reutilizable | Recomendación |
|-------------|-----------|----------------|-------------|--------------|---------------|
| `useCart` | `punto-venta/hooks/` | Carrito: agregar, quitar, actualizar items | BAJO (solo validación de stock disponible) | SÍ | Reutilizar directamente. La validación de stock se puede omitir temporalmente o controlar por prop. |
| `useCurrency` | `form-core/hooks/` | Monedas, conversión, formato | NULO | SÍ | Reutilizar directamente. Envuelve el `currencyManager` de `shared/currency`. |
| `usePayment` | `form-core/hooks/` | Cálculo de totales, vuelto, montos rápidos | BAJO (usa moneda del documento) | SÍ | Reutilizar para cálculo de subtotal/IGV/total. Ignorar la parte de "vuelto" (solo aplica a POS). |
| `useFieldsConfiguration` | `form-core/hooks/` | Visibilidad y obligatoriedad de campos | BAJO (clave de localStorage acoplada a comprobantes) | PARCIAL | Reutilizar la lógica. Cambiar la `STORAGE_KEY` para documentos comerciales. |
| `FieldsConfigurationContext` | `form-core/contexts/` | Proveedor React del estado de campos | BAJO (clave de localStorage) | PARCIAL | Crear `DocumentoComercialFieldsConfigurationContext` con su propia clave. O parametrizar la clave existente. |
| `useDocumentType` | `form-core/hooks/` | Tipos de comprobante y series | ALTO (códigos SUNAT '01'/'03'/'07', prefijos F/B) | NO | Crear `useDocumentoComercialType` con códigos propios (COT, NV, OV). |
| `useComprobanteActions` | `hooks/` | Crear comprobante, stock, cobranzas | MUY ALTO | NO | Crear `useDocumentoComercialActions` propio (solo guardar, borrador, generar PDF). |
| `useDrafts` | `hooks/` | Borradores con validación SUNAT | ALTO (validaciones normativas, límites días SUNAT) | NO | Usar `useBorradorEnProgreso` (shared) + crear `useDocumentoComercialDrafts` propio. |
| `useComprobanteState` | `hooks/` | Estado UI + integración caja | ALTO (caja) | NO | Crear `useDocumentoComercialState` propio. |
| `useCreditTermsConfigurator` | `hooks/` | Cuotas de crédito/cobranza | ALTO (cobranzas) | NO | No usar en documentos comerciales fase 1. |
| `useDuplicateDataLoader` | `hooks/` | Carga duplicación/NC desde location.state | MEDIO (maneja `instantaneaDocumentoComercial` de comprobantes) | PARCIAL | Crear `useDocumentoComercialDataLoader` propio que maneje la instantánea de documentos comerciales. |
| `useAvailableProducts` | `hooks/` | Productos filtrados por establecimiento + stock | BAJO | SÍ | Reutilizable directamente. |
| `usePreview` | `hooks/` | Vista previa (formato comprobante) | MEDIO (formato A4/ticket de comprobante) | PARCIAL | Crear `useDocumentoComercialPreview` propio. |
| `useBorradorEnProgreso` | `shared/borradores/` | Borrador persistente con debounce y TTL | NULO | SÍ | Reutilizar directamente. |
| `usePriceBook` | `form-core/hooks/` | Opciones de precio por columna | BAJO | SÍ | Reutilizable directamente para resolución de precios. |
| `useProductSearch` | `form-core/hooks/` | Búsqueda de productos con filtros | BAJO | SÍ | Reutilizable directamente. |

---

## 6. Campos actuales del formulario

| Campo | Visible por defecto | Configurable (+Campos) | Usado por comprobante | Útil para docs comerciales | Exclusivo comprobante | Observación |
|-------|--------------------|-----------------------|-----------------------|----------------------------|-----------------------|-------------|
| Tipo de comprobante (boleta/factura/NC) | SÍ | NO | SÍ | PARCIAL | NO | En docs comerciales sería: cotización/nota venta/orden venta |
| Serie | SÍ | NO | SÍ | SÍ | NO | Necesita serie propia (COT, NV, OV) |
| Correlativo | Implícito | NO | SÍ | SÍ | NO | Se genera automáticamente igual |
| Fecha de emisión | SÍ | NO | SÍ | SÍ | NO | Genérico |
| Cliente (búsqueda) | SÍ | NO | SÍ | SÍ | NO | Genérico. RUC/DNI también aplica a comerciales |
| Moneda (PEN/USD) | SÍ | NO | SÍ | SÍ | NO | Genérico |
| Forma de pago | SÍ | NO | SÍ | SÍ | NO | En comerciales podría ser informativo (no genera cobranza) |
| Fecha de vencimiento | NO | SÍ | SÍ | SÍ | NO | Útil para cotizaciones (vigencia) y órdenes de venta |
| Dirección del cliente | NO | SÍ | SÍ | SÍ | NO | Genérico |
| Correo del cliente | NO | SÍ | SÍ | SÍ | NO | Genérico |
| Dirección de envío | NO | SÍ | SÍ | SÍ | NO | Muy útil para órdenes de venta |
| Orden de compra (OC) | NO | SÍ | SÍ | SÍ | NO | Especialmente útil para órdenes de venta |
| Guía de remisión | NO | SÍ | SÍ | PARCIAL | NO | Más relevante para facturas/boletas. En OV puede ser referencia |
| Centro de costo | NO | SÍ | SÍ | SÍ | NO | Genérico |
| Observaciones | Configurable | SÍ | SÍ | SÍ | NO | Genérico. Se imprime en documento |
| Nota interna | Configurable | SÍ | SÍ | SÍ | NO | Genérico. No se imprime |
| Código de NC | SÍ (solo NC) | NO | SÍ (solo NC) | NO | SÍ | Exclusivo de Nota de Crédito SUNAT |
| Motivo de NC | SÍ (solo NC) | NO | SÍ (solo NC) | NO | SÍ | Exclusivo de Nota de Crédito SUNAT |
| Documento relacionado NC | SÍ (solo NC) | NO | SÍ (solo NC) | NO | SÍ | Exclusivo de Nota de Crédito SUNAT |
| Tipo base de NC (factura/boleta) | Implícito | NO | SÍ (solo NC) | NO | SÍ | Exclusivo de Nota de Crédito SUNAT |
| Perfil de precio | Implícito en búsqueda | NO | SÍ | SÍ | NO | Genérico. Útil para cotizaciones |
| Columnas de tabla (cantidad, precio, etc.) | Configurables | SÍ (+Columnas) | SÍ | SÍ | NO | Genérico |
| Stock disponible (indicador) | SÍ en tabla | NO | SÍ | PARCIAL | NO | En comerciales es referencial, no descuenta |
| Impuesto por ítem (IGV 18/10/exo/ina) | SÍ en tabla | SÍ | SÍ | SÍ | NO | Técnicamente SUNAT pero útil en comerciales para calcular totales referenciales |
| Descuento por ítem (%) | SÍ en tabla | SÍ | SÍ | SÍ | NO | Genérico |
| Descuento global (%) | Botón | NO | SÍ | SÍ | NO | Genérico |
| Subtotal/IGV/Total | SÍ | NO | SÍ | SÍ | NO | Genérico (referencial en comerciales) |
| Vista previa | Botón | SÍ (+Campos) | SÍ | SÍ | NO | El formato del doc sería diferente |
| Guardar borrador | Botón | SÍ (+Campos) | SÍ | SÍ | NO | Genérico, pero con su propia lógica |

---

## 7. Buscador de cliente y consulta de documento

### Dónde está

El buscador de clientes está **dentro de `CompactDocumentForm.tsx`** (no es un componente separado). Es un input con debounce de 250ms que busca en `useClientes().fetchClientes()` y muestra un dropdown de resultados.

El lookup de RUC (SUNAT) y DNI (RENIEC) está en el mismo archivo, usando:
- `lookupEmpresaPorRuc()` → internamente usa `shared/documentos/servicioConsultaDocumentos.ts`
- `lookupPersonaPorDni()` → ídem

### Cómo funciona

```
Usuario escribe en input
  → Si 11 dígitos → intento lookup RUC (botón)
  → Si 8 dígitos → intento lookup DNI (botón)
  → En cualquier caso → debounce 250ms → fetchClientes(query)
    → dropdown con resultados del catálogo local
```

Al seleccionar un cliente, llama `onClienteChange(cliente)` que actualiza el estado en el padre (`EmisionTradicional`).

### ¿Es reutilizable?

**SÍ, con matices:**
- La lógica de búsqueda local es 100% reutilizable.
- El servicio de consulta RUC/DNI (`shared/documentos/servicioConsultaDocumentos.ts`) es genérico y reutilizable directamente.
- El componente `CompactDocumentForm` no puede extraerse fácilmente solo su parte de cliente. Hay que usarlo completo o crear un sub-componente `SelectorCliente` nuevo.

### Recomendación

Para el nuevo módulo:
- Si se usa `CompactDocumentForm` directamente (opción recomendada), el buscador viene incluido.
- Si se decide no usar `CompactDocumentForm`, crear un componente `SelectorCliente` extraído que use `useClientes()` y `servicioConsultaDocumentos`. Esto requiere un refactoring futuro, no es necesario en Fase 1.

---

## 8. Buscador de productos y tabla de ítems

### Dónde está

- **Buscador de productos:** `ProductsSection.tsx` contiene el componente `ProductSelector` importado. El buscador es invocado via `useProductSearch()` y `useProductStore()`.
- **Tabla de ítems (catálogo):** dentro de `ProductsSection.tsx`, es una tabla con columnas configurables (producto, código, cantidad, unidad, precio, descuento, impuesto, importe).
- **Tabla de ítems (libre):** `TablaVentaLibre.tsx`, tabla editable manualmente sin catálogo.

### Cómo funciona

```
ProductsSection recibe: cartItems, addProductsFromSelector, updateCartItem, removeFromCart
  → modo 'catalogo': renderiza ProductSelector + tabla configurable
  → modo 'libre': renderiza TablaVentaLibre
  → AdjustmentModal: ajuste manual de stock (registro en Kardex)
  → TaxBreakdownSummary: desglose de impuestos
```

### ¿Es reutilizable?

**SÍ, parcialmente:**
- La tabla de ítems (catálogo y libre) es **completamente reutilizable**.
- El buscador de productos (`useProductSearch`, `ProductSelector`) es **completamente reutilizable**.
- `TaxBreakdownSummary`: reutilizable (muestra subtotal/IGV/total).
- `AdjustmentModal` (ajuste de stock): **NO reutilizar** en documentos comerciales (ajuste oficial de Kardex). En fase 1, el stock es solo referencial.

### Cómo desacoplar de comprobantes

- Eliminar del scope de docs comerciales: el botón de ajuste de stock y `AdjustmentModal`.
- Controlar esto con una prop `permitirAjusteStock?: boolean` (false por defecto en comerciales).
- La columna de stock en tabla puede mantenerse como indicador visual (solo lectura).

### Qué necesita Orden de Venta específicamente

- Visibilidad de stock disponible (referencial, no descuenta).
- Campo "fecha de entrega" o "fecha requerida" (campo nuevo, no existe en comprobantes).
- Campo "condiciones de entrega" (campo nuevo).

---

## 9. Totales, precios, descuentos e impuestos

### Qué lógica existe

La lógica de totales está distribuida en:

1. **`usePayment.tsx`:** `calculateTotals(cartItems)` → calcula subtotal por tipo de IGV (18%, 10%, exonerado, inafecto), agrega, retorna `{ subtotal, igv, total, currency }`.
2. **`calculateCurrencyAwareTotals()`** (utilidad importada en `EmisionTradicional`): ajusta totales considerando tipo de cambio.
3. **`buildLinePricingInputFromCartItem()` + `calculateLineaComprobante()`** (en `TablaVentaLibre`): cálculos por línea.
4. **`ProductsSection`**: aplica descuento global (%), reordena por columnas de precio, maneja precios con conversión de moneda.

### ¿Se puede compartir?

**SÍ, casi completo:**
- `usePayment.calculateTotals()` → reutilizable directamente.
- `calculateCurrencyAwareTotals()` → reutilizable directamente.
- `buildLinePricingInputFromCartItem()` → reutilizable directamente.
- `calculateLineaComprobante()` → reutilizable. Los tipos IGV son técnicamente SUNAT, pero los cálculos son matemáticos puros.

### Riesgos

- Los tipos de IGV (`igv18`, `igv10`, `exonerado`, `inafecto`) son nombres SUNAT pero la matemática es neutra. En documentos comerciales, el IGV es referencial. El riesgo es semántico, no técnico.
- Si se modifica `calculateLineaComprobante()` para comprobantes, puede romper los cálculos en documentos comerciales. Solución: no modificar la función compartida, o crear una versión propia.

### Recomendación

Reutilizar `usePayment` y las utilidades de cálculo directamente. Los totales en documentos comerciales son referenciales y usan la misma matemática.

---

## 10. Configuración de campos y columnas

### "+ Campos" (optionalFields)

**Cómo funciona:**
- `FieldsConfigurationContext` / `useFieldsConfiguration` mantiene un estado de visibilidad para 7 campos opcionales + sección de notas + botones de acción.
- Se persiste en `localStorage` con clave `'comprobantes_fields_visibility_config'`.
- El modal `FieldsConfigModal` permite al usuario activar/desactivar campos y marcarlos como obligatorios.
- `CompactDocumentForm` consume `useFieldsConfiguration()` para decidir si renderiza cada campo.

**Campos opcionales configurables actualmente:**
- `fechaVencimiento`, `direccion`, `correo`, `direccionEnvio`, `ordenCompra`, `guiaRemision`, `centroCosto`

### "+ Columnas"

**Cómo funciona:**
- `ProductsSection` mantiene estado `columnConfig` en `localStorage` (key: `'comprobantes_column_config'` o similar).
- El botón "+ Columnas" abre un panel inline que permite activar/desactivar columnas de la tabla de ítems.
- Las columnas configurables incluyen: código, cantidad, unidad, precio, descuento, impuesto, importe, stock.

### Persistencia

Ambas configuraciones se guardan en `localStorage` por clave fija. El problema es que **usan la misma clave para boleta y factura** (no están segmentadas por tipo de comprobante). Para documentos comerciales, se necesita una clave diferente.

### Acoplamiento

- El mecanismo es genérico pero la clave de storage está hardcodeada para comprobantes.
- Los nombres de campos están en español y son mayormente genéricos.

### Cómo replicarlo en documentos comerciales

**Opción A (recomendada para Fase 1):** Crear `useDocumentoComercialFieldsConfig` que tenga su propia `STORAGE_KEY` (`documentos_comerciales_fields_config`) y liste los campos específicos de documentos comerciales. Puede copiar la lógica de `useFieldsConfiguration.ts` (son ~130 líneas).

**Opción B (más limpio, más trabajo):** Parametrizar la `STORAGE_KEY` en el hook existente para que cada tipo de documento tenga su propio espacio de configuración.

---

## 11. Borradores

### Cómo se guarda borrador en comprobantes

Hay **dos mecanismos distintos** de borrador:

**Mecanismo 1: Borrador explícito (`useDrafts`)**
- El usuario hace clic en "Guardar borrador".
- Se genera un ID `DRAFT-{serie}-{random8}`.
- Se guarda en localStorage con clave `'borradores'`.
- Tiene validación SUNAT de días máximos (boleta: 5 días, factura: 1 día).
- El borrador aparece en el listado de borradores del módulo de comprobantes.

**Mecanismo 2: Borrador en progreso (`useBorradorEnProgreso`)**
- Auto-guardado silencioso cada 400ms (debounce).
- Se guarda en localStorage con clave dinámica: `borrador_en_progreso:app:tenant:establecimiento:tipo:serie:modo`.
- Expira en 7 días (configurable).
- Se restaura automáticamente al volver al formulario.
- Al emitir o cancelar, se limpia.

### ¿Puede generalizarse?

- `useBorradorEnProgreso` (shared/borradores): **SÍ, ya es genérico**. La clave dinámica soporta cualquier `tipoDocumento`.
- `useDrafts`: **NO directamente**. Tiene validaciones SUNAT de días, lógica de navegación hacia `/comprobantes`, y analytics de comprobantes.

### Qué necesita documentos comerciales

- Borrador en progreso (auto-save): **usar `useBorradorEnProgreso` directamente**, pasando `tipoDocumento: 'cotizacion' | 'nota_venta' | 'orden_venta'`.
- Borrador explícito ("Guardar borrador"): crear `useDocumentoComercialDrafts` propio. Sin límites de días SUNAT. Los borradores deben aparecer en el mismo listado de su tab (cotizaciones/notas venta/órdenes).

### Recomendación

```typescript
// Reutilizar directamente:
useBorradorEnProgreso({
  clave: crearClaveBorradorEnProgreso({
    tipoDocumento: 'cotizacion',
    serie: serieSeleccionada,
    // ...
  }),
  // ...
})

// Crear propio:
useDocumentoComercialDrafts() // sin límites SUNAT, navegación hacia su tab
```

---

## 12. Lógica exclusiva de comprobantes que NO debe pasar a documentos comerciales

### SUNAT / Emisión electrónica

- Códigos de tipo de comprobante SUNAT: `'01'` (factura), `'03'` (boleta), `'07'` (NC).
- Validación de correlativo para envío a OSE/SUNAT.
- Mock de respuesta OSE (`MOCK_OSE_RESPONSE_DELAY_MS = 1500ms`).
- Estado SUNAT: `'Enviado'` → `'Aceptado'` (transición tras delay).
- CDR: no implementado aún, pero el estado y flujo están diseñados para él.
- Código de Nota de Crédito SUNAT (01-13).
- Motivo de Nota de Crédito.
- Documento relacionado de Nota de Crédito.
- Validación `validateComprobanteNormativa()`.
- Validación `validateComprobanteReadyForCobranza()`.

### Caja

- `useRetornoAperturaCaja()`: apertura automática de caja al entrar al formulario.
- `BloqueoCajaCerrada`: bloqueo de UI si caja está cerrada.
- `isCajaOpen` en `useComprobanteState`.
- `useCaja()`: integración con módulo de caja.
- `cajaEstaAbierta`, `usuarioTieneCajaAsignada` en tipos.

### Cobranza

- `upsertCuenta()`: creación de cuenta por cobrar.
- `registerCobranza()`: registro de cobro inmediato.
- `CobranzaModal`: UI para registrar pago.
- `ComprobanteCreditTerms`: cuotas y cronograma de crédito para cobranzas.
- `CreditScheduleModal`, `CreditScheduleSummaryCard`.
- `useCobranzasContext`.
- `validateComprobanteReadyForCobranza()`.
- `sessionStorage.setItem('lastCreatedReceivableId')`.

### Stock / Kardex (descuento real)

- `resolvealmacenesForSaleFIFO()`: resolución de almacenes para descuento FIFO.
- `allocateSaleAcrossalmacenes()`: distribución de venta entre almacenes.
- `addMovimientoStock(tipo='SALIDA', motivo='VENTA')`: movimiento oficial de Kardex.
- `addMovimientoStock(tipo='ENTRADA', motivo='DEVOLUCION_CLIENTE')`: devolución por NC.
- `StockRepository.getMovements()`: lectura de historial para proporcionar devolución.
- `AdjustmentModal` + `registrarAjusteDeStock()`: ajuste manual de stock.
- `useInventoryFacade()`.

### Bancarización

- No está implementada actualmente en ningún archivo. No aplica.

### Nota de Crédito

- Todo el flujo de NC (código, motivo, documento relacionado, tipo base).
- `datosNotaCredito`, `DatosNotaCredito`, `ContextoOrigenNotaCredito`.
- `crearDatosNotaCreditoDesdeInstantanea()`.
- `tipoComprobanteBaseNotaCredito` en props de `CompactDocumentForm`.

### Analytics de comprobantes

- `registrarComprobanteEstadoActualizado()`.
- `registrarVentaCompletada()`, `registrarPrimeraVentaCompletada()`.
- `devLocalIndicadoresStore.registerVenta()`.

---

## 13. Capa compartida recomendada

### Estructura propuesta

```
apps/senciyo/src/
├── shared/
│   ├── borradores/                      ← YA EXISTE, genérico ✓
│   │   ├── useBorradorEnProgreso.ts
│   │   └── almacenamientoBorradorEnProgreso.ts
│   ├── currency/                        ← YA EXISTE, genérico ✓
│   │   └── currencyManager.ts, types.ts, constants.ts
│   ├── documentos/                      ← YA EXISTE, genérico ✓
│   │   └── servicioConsultaDocumentos.ts
│   ├── inventory/                       ← YA EXISTE, genérico ✓
│   │   └── stockGateway.ts, unitConversion.ts, accionesStock.ts
│   │
│   └── formulario-documento/            ← NUEVO (extraer/crear)
│       ├── components/
│       │   ├── ConfigurationCard.tsx    ← MOVER desde form-core (genérico puro)
│       │   ├── NotesSection.tsx         ← MOVER desde form-core (genérico puro)
│       │   ├── ActionButtonsSection.tsx ← MOVER desde form-core (genérico, props)
│       │   └── TablaVentaLibre.tsx      ← MOVER desde form-core (genérico con props)
│       ├── hooks/
│       │   ├── useCurrency.ts           ← MOVER o re-exportar desde form-core
│       │   ├── usePayment.ts            ← MOVER o re-exportar desde form-core
│       │   ├── usePriceBook.ts          ← MOVER o re-exportar (genérico)
│       │   └── useProductSearch.ts      ← MOVER o re-exportar (genérico)
│       ├── types/
│       │   ├── CartItem.ts              ← EXTRAER desde comprobante.types.ts
│       │   ├── IgvType.ts               ← EXTRAER (matemática pura)
│       │   ├── Currency.ts              ← YA EN shared/currency, re-exportar
│       │   └── DocumentoBase.ts         ← NUEVO: tipos base compartidos
│       └── utils/
│           ├── calculos.ts              ← EXTRAER calculateLineaComprobante, etc.
│           └── formatters.ts            ← EXTRAER formatSaleDocumentLabel, etc.
```

> **Nota:** El movimiento de archivos no es obligatorio en Fase 1. Los componentes `form-core` actuales pueden consumirse directamente desde el nuevo módulo sin moverlos. Solo moverlos cuando se confirme que documentos comerciales funciona correctamente.

### Qué mover (Fase 2, después de validar)

| Archivo | Desde | Hacia |
|---------|-------|-------|
| `ConfigurationCard.tsx` | `form-core/components/` | `shared/formulario-documento/components/` |
| `NotesSection.tsx` | `form-core/components/` | `shared/formulario-documento/components/` |
| `ActionButtonsSection.tsx` | `form-core/components/` | `shared/formulario-documento/components/` |
| `TablaVentaLibre.tsx` | `form-core/components/` | `shared/formulario-documento/components/` |
| `useCurrency.ts` | `form-core/hooks/` | `shared/formulario-documento/hooks/` |
| `usePayment.ts` | `form-core/hooks/` | `shared/formulario-documento/hooks/` |

### Qué crear nuevo

| Archivo nuevo | Dónde | Propósito |
|--------------|-------|-----------|
| `useDocumentoComercialType.ts` | `DocumentosComerciales/hooks/` | Equivalente de `useDocumentType` sin SUNAT |
| `useDocumentoComercialActions.ts` | `DocumentosComerciales/hooks/` | Equivalente de `useComprobanteActions` sin stock/cobranzas |
| `useDocumentoComercialDrafts.ts` | `DocumentosComerciales/hooks/` | Equivalente de `useDrafts` sin validaciones SUNAT |
| `useDocumentoComercialState.ts` | `DocumentosComerciales/hooks/` | Equivalente de `useComprobanteState` sin caja |
| `useDocumentoComercialFieldsConfig.ts` | `DocumentosComerciales/hooks/` | Equivalente de `useFieldsConfiguration` con clave propia |
| `DocumentoComercialFieldsContext.tsx` | `DocumentosComerciales/contexts/` | Proveedor de configuración de campos |
| `FormularioDocumentoComercial.tsx` | `DocumentosComerciales/components/` | Formulario raíz para los tres tipos |
| `documentoComercial.types.ts` | `DocumentosComerciales/models/` | Tipos propios del módulo |

### Qué dejar en comprobantes (no tocar)

- `EmisionTradicional.tsx`
- `CompactDocumentForm.tsx` (se usará desde el nuevo módulo, no se mueve)
- `ProductsSection.tsx` (ídem)
- `useComprobanteActions.tsx`
- `useDocumentType.tsx`
- `useDrafts.tsx`
- `useComprobanteState.tsx`
- `useCreditTermsConfigurator.ts`
- Todos los modales de comprobantes
- `instantaneaDocumentoComercial.ts` (referencia histórica si hace falta)

---

## 14. Contrato recomendado para `FormularioDocumentoComercial`

```typescript
// documentoComercial.types.ts
type TipoDocumentoComercial = 'cotizacion' | 'nota_venta' | 'orden_venta'

interface ConfiguracionCamposDocumento {
  // Campos del header
  mostrarFechaVencimiento: boolean
  mostrarDireccion: boolean
  mostrarCorreo: boolean
  mostrarDireccionEnvio: boolean
  mostrarOrdenCompra: boolean
  mostrarGuiaRemision: boolean
  mostrarCentroCosto: boolean
  mostrarFechaEntrega?: boolean       // solo orden_venta
  mostrarCondicionEntrega?: boolean   // solo orden_venta
  
  // Comportamiento
  requiereFechaVencimiento: boolean
  requiereOrdenCompra: boolean
}

interface ConfiguracionColumnasDocumento {
  mostrarCodigo: boolean
  mostrarCantidad: boolean
  mostrarUnidad: boolean
  mostrarPrecio: boolean
  mostrarDescuento: boolean
  mostrarImpuesto: boolean
  mostrarImporte: boolean
  mostrarStock: boolean   // solo referencial (readonly)
}

interface ValoresInicialesDocumento {
  cliente?: ClienteSnapshot
  items?: CartItem[]
  observaciones?: string
  notaInterna?: string
  formaPago?: string
  moneda?: Currency
  fechaEmision?: string
  fechaVencimiento?: string
  campos?: Partial<CamposOpcionalesDocumento>
  modoItems?: 'catalogo' | 'libre'
  tipoDocumento?: TipoDocumentoComercial
  serie?: string
  documentoOrigenId?: string
  documentoOrigenTipo?: TipoDocumentoComercial
}

interface FormularioDocumentoComercialProps {
  // Identidad
  tipoDocumento: TipoDocumentoComercial
  
  // Configuración de campos
  configuracionCampos?: Partial<ConfiguracionCamposDocumento>
  configuracionColumnas?: Partial<ConfiguracionColumnasDocumento>
  
  // Estado inicial (duplicación, edición)
  valoresIniciales?: ValoresInicialesDocumento
  
  // Modo
  modo?: 'nuevo' | 'editar' | 'duplicar' | 'convertir'
  
  // Callbacks de acciones
  onGuardarBorrador?: (datos: DatosDocumentoComercial) => Promise<void>
  onGenerar?: (datos: DatosDocumentoComercial) => Promise<string>  // retorna ID
  onCancelar?: () => void
  onVistaPrevia?: (datos: DatosDocumentoComercial) => void
  
  // Validaciones externas por tipo
  validaciones?: ValidacionesDocumentoComercial
  
  // Stock
  mostrarStock?: boolean              // default false para comerciales
  permitirAjusteStock?: boolean       // default false para comerciales
  
  // Conversión
  onConvertirAComprobante?: (datos: DatosDocumentoComercial) => void  // fase futura
}

interface ValidacionesDocumentoComercial {
  requiereCliente?: boolean
  requiereSerie?: boolean
  validarItemsMinimos?: number
  validadorCustom?: (datos: DatosDocumentoComercial) => string | null
}
```

### Eventos que debe exponer

```typescript
// Eventos del formulario
onGuardarBorrador   // usuario hace clic en "Guardar borrador"
onGenerar           // usuario hace clic en "Generar [tipo]"
onCancelar          // usuario hace clic en "Cancelar" o cierra
onVistaPrevia       // usuario hace clic en "Vista previa"
onConvertirAComprobante  // acción futura: convertir a factura/boleta
```

### Lógica que debe recibir por callbacks (NO hardcodear)

```typescript
// El formulario NO debe saber:
// - cómo guardar en el backend
// - cómo navegar después de generar
// - qué hacer con el ID generado
// - cómo registrar analytics
// Toda esa lógica va en el hook useDocumentoComercialActions y en la página contenedora
```

---

## 15. Riesgos detectados

| ID | Severidad | Riesgo | Evidencia técnica | Impacto | Recomendación |
|----|-----------|--------|-------------------|---------|---------------|
| R-01 | CRÍTICO | Mover `CompactDocumentForm` rompe `EmisionTradicional` | `EmisionTradicional.tsx:L248` importa `CompactDocumentForm` directamente | Formulario de comprobantes deja de funcionar | NO mover. Usar directamente desde el nuevo módulo. |
| R-02 | CRÍTICO | Mover `ProductsSection` rompe comprobantes y POS | Importado en `EmisionTradicional.tsx` y en POS | Dos módulos dejan de funcionar | NO mover en Fase 1. Importar desde su ubicación actual. |
| R-03 | ALTO | `useFieldsConfiguration` usa clave de localStorage compartida | `STORAGE_KEY = 'comprobantes_fields_visibility_config'` | Si docs comerciales usa la misma clave, el usuario pierde la configuración de comprobantes | Crear nueva clave `documentos_comerciales_fields_config` |
| R-04 | ALTO | `useDocumentType` filtra series por código SUNAT | Hardcodeado: `'01'`, `'03'`, `'07'` | Si se reutiliza, las series COT/NV/OV no se mostrarán | Crear `useDocumentoComercialType` con filtros propios |
| R-05 | ALTO | `CartItem` tipo en `comprobante.types.ts` | `models/comprobante.types.ts` | Si se modifica el tipo para comprobantes, puede romper docs comerciales | Extraer `CartItem` a `shared/formulario-documento/types/` o crear un tipo propio |
| R-06 | ALTO | Columnas de `ProductsSection` persisten en localStorage con clave no segmentada | Puede ser `'comprobantes_column_config'` | Config de columnas compartida entre tipos de documento | Crear clave de configuración por módulo: `'documentos_comerciales_column_config'` |
| R-07 | MEDIO | `CompactDocumentForm` renderiza campos de NC condicionales | Props `datosNotaCredito`, `tipoComprobanteBaseNotaCredito` presentes | Si se pasan props incorrectas/nulas, puede haber renders inesperados | Pasar `null` en esas props desde el nuevo módulo (ya soportado) |
| R-08 | MEDIO | `useComprobanteActions` mezcla cobranzas + stock + SUNAT en una sola función | `createComprobante()` L264-1055 hace todo en secuencia rígida | Imposible reutilizar parcialmente sin cirugía profunda | No reutilizar. Crear hook propio para docs comerciales. |
| R-09 | MEDIO | `instantaneaDocumentoComercial.ts` tiene `TipoDocumentoComercial` que incluye cotizacion/nota_venta pero la lógica es para comprobantes | `OrigenDocumentoComercial = 'documento_comercial'` | Puede confundir si se reutiliza la instantánea para docs comerciales | Crear `InstantaneaDocumentoComercialPropia` con solo los campos necesarios |
| R-10 | BAJO | `useBorradorEnProgreso` clave incluye `tipoDocumento` como parámetro | `crearClaveBorradorEnProgreso({ tipoDocumento })` | Si `tipoDocumento` no es único por módulo, puede haber colisiones de clave | Incluir módulo en la clave: `documentoComercial:cotizacion:COT-001` |
| R-11 | BAJO | `FieldsConfigurationContext` está provisto en `PrivateLayout` | `layouts/PrivateLayout.tsx` importa el proveedor | Si se crea un nuevo contexto paralelo, asegurarse de proveerlo al nuevo módulo también | Proveer `DocumentoComercialFieldsContext` en el layout del módulo o en la página raíz |
| R-12 | BAJO | El módulo viejo `Documentos-negociacion` ya usa `CompactDocumentForm`, `NotesSection`, `useCart`, etc. | `FormularioCotizacion.tsx` y `FormularioNotaVenta.tsx` importan estos componentes | Existe un "antecedente" de uso que puede generar confusión sobre qué es viejo y qué es nuevo | Aclarar en el código que el módulo viejo será eliminado; no extender ni corregir sus bugs |

---

## 16. Qué está bien y debe mantenerse

1. **La arquitectura de `CompactDocumentForm` como componente controlado** (recibe estado por props y emite cambios por callbacks). Es el patrón correcto para reutilización.

2. **La separación visual en secciones** (header del documento, tabla de ítems, notas, botones). El nuevo formulario debe respetar este layout.

3. **`ConfigurationCard` como contenedor de sección** con header colapsable, badge y acciones. Muy útil y genérico.

4. **`useBorradorEnProgreso` en `shared/borradores`** con clave dinámica por tipo de documento. El diseño es correcto para reutilización multi-módulo.

5. **`shared/currency/currencyManager`** como singleton + `useSyncExternalStore`. Correcto y reutilizable.

6. **`shared/documentos/servicioConsultaDocumentos`** con validación de formato RUC/DNI antes de llamar al backend.

7. **`shared/inventory/stockGateway`** como lógica pura de stock sin efectos secundarios.

8. **`useProductSearch` y `useAvailableProducts`** con filtro por establecimiento. Diseño correcto.

9. **El sistema de `+ Campos` y `+ Columnas`** como configuración persistida por usuario. El patrón es excelente y debe replicarse en documentos comerciales.

10. **`ActionButtonsSection` recibiendo `primaryAction` como prop** (label, onClick, disabled, icon). Totalmente flexible y reutilizable.

11. **`NotesSection` sin ninguna dependencia** más allá de React. Diseño ideal.

12. **`TablaVentaLibre` con cálculos por línea vía callbacks** (`convertirBaseADocumento`, `convertirDocumentoABase`). La inyección de funciones de conversión es el patrón correcto.

---

## 17. Qué no debe copiarse ni reutilizarse

1. **`useComprobanteActions.tsx`** completo. No tiene partes "extractables" sin riesgo.

2. **El flujo de cobranza** (CobranzaModal, CreditScheduleModal, useCobranzasContext).

3. **El bloqueo de caja** (BloqueoCajaCerrada, useRetornoAperturaCaja, isCajaOpen).

4. **Los modales post-emisión** (SuccessModal actual, PostIssueOptionsModal).

5. **La lógica de Nota de Crédito** (datosNotaCredito, ContextoOrigenNotaCredito, crearDatosNotaCreditoDesdeInstantanea).

6. **Los códigos SUNAT hardcodeados** en `useDocumentType`, `instantaneaDocumentoComercial` y `constants.ts`. Los documentos comerciales no tienen código SUNAT.

7. **`useDrafts.tsx`** con validación de días SUNAT y navegación a `/comprobantes`.

8. **`useCreditTermsConfigurator.ts`** y toda la lógica de cuotas/cronograma de crédito.

9. **`useComprobanteState`** con integración de caja.

10. **El mock de OSE** (`MOCK_OSE_RESPONSE_DELAY_MS`, estado 'Enviado'→'Aceptado').

11. **`registrarAjusteDeStock`** y `AdjustmentModal` para ajustes de inventario desde el formulario.

12. **El descuento FIFO de stock** al momento de guardar/emitir. En fase 1 de docs comerciales, el stock es solo referencial.

13. **`instantaneaDocumentoComercial.ts`** como modelo de datos para docs comerciales. Puede servir de inspiración, pero tiene demasiada lógica SUNAT entrelazada.

---

## 18. Recomendación para la Fase 1 del nuevo módulo

### Lo que Claude debe hacer a continuación

#### Crear módulo nuevo
- Crear `apps/senciyo/src/pages/Private/features/documentos-comerciales/` (todo en minúsculas con guion).
- **NO usar** `Documentos-negociacion` como base.
- **NO usar** `Documentos-negociacion` como referencia de arquitectura.
- **NO modificar** ningún archivo de `comprobantes-electronicos`.

#### Crear tabs independientes
- Crear tres tabs: `Cotizaciones`, `NotasVenta`, `OrdenesVenta`.
- Cada tab tiene: su propia página de listado, sus propios estados, sus propias acciones, sus propios filtros, su propio botón "+ Nuevo", sus propios borradores dentro del listado.
- Los borradores NO van en un tab separado. Aparecen en el listado del tipo correspondiente con una etiqueta visual de "borrador".

#### Crear listados
- Cada tab tiene un listado propio con: tabla o cards, filtros por estado/fecha/cliente, paginación, acciones contextuales (ver, editar, duplicar, convertir-si-aplica).
- Estado de documentos propios (sin SUNAT): borrador, generado, enviado-al-cliente, aceptado, vencido, cancelado.

#### Crear formulario comercial
- Crear `FormularioDocumentoComercial.tsx` en `documentos-comerciales/components/`.
- Componer usando: `CompactDocumentForm` (desde su ubicación actual en comprobantes), `ProductsSection` (ídem), `NotesSection` (ídem), `ActionButtonsSection` (ídem).
- Pasar `datosNotaCredito={null}` y `tipoComprobanteBaseNotaCredito={undefined}` a `CompactDocumentForm`.
- El selector de tipo muestra: Cotización, Nota de Venta, Orden de Venta (no boleta/factura).

#### Reutilizar/Extraer componentes
- **Reutilizar directamente** (sin mover): `CompactDocumentForm`, `ProductsSection`, `NotesSection`, `ConfigurationCard`, `ActionButtonsSection`, `FieldsConfigModal`, `TablaVentaLibre`.
- **Reutilizar directamente** (desde shared): `useBorradorEnProgreso`, `servicioConsultaDocumentos`, `currencyManager`.
- **Reutilizar directamente** (desde form-core): `useCart`, `useCurrency`, `usePayment`, `usePriceBook`, `useProductSearch`.
- **Crear nuevos**: `useDocumentoComercialType`, `useDocumentoComercialActions`, `useDocumentoComercialDrafts`, `useDocumentoComercialState`, `useDocumentoComercialFieldsConfig`.

#### No tocar stock
- En Fase 1, el stock en documentos comerciales es **solo referencial** (se muestra el disponible, no se descuenta).
- No llamar a `addMovimientoStock()`.
- No usar `AdjustmentModal`.
- Mostrar la columna de stock con un indicador visual (como ya lo hace `ProductsSection` con colores).

#### No tocar comprobantes
- Ningún archivo de `comprobantes-electronicos` debe modificarse.
- Si un componente de comprobantes necesita adaptarse para funcionar en docs comerciales, crear un wrapper en el nuevo módulo, no modificar el original.

#### No tocar cobranza
- No usar `useCobranzasContext`.
- No crear cuentas por cobrar desde documentos comerciales (eso es trabajo de cuando el doc comercial se convierte a comprobante, en fase futura).
- El campo "Forma de pago" en docs comerciales es **informativo**, no genera registro de cobranza.

#### No tocar módulo viejo
- No usar `Documentos-negociacion` como base.
- No importar nada desde `Documentos-negociacion`.
- No navegar a rutas de `Documentos-negociacion`.

---

## 19. Plan de acción sugerido

### Fase 1: Extracción segura de componentes comunes (preparación)

> Alcance: Solo agregar archivos nuevos. Cero modificaciones en archivos existentes.

1. Crear `shared/formulario-documento/types/CartItem.ts` → re-exportar (no mover) el tipo `CartItem` desde `comprobante.types.ts` para usarlo desde ambos módulos.
2. Crear `documentos-comerciales/models/documentoComercial.types.ts` con `TipoDocumentoComercial`, `EstadoDocumentoComercial`, `DocumentoComercial`, `DatosDocumentoComercial`.
3. Crear `documentos-comerciales/hooks/useDocumentoComercialType.ts` (equivalente de `useDocumentType` sin SUNAT, filtra series por código COT/NV/OV).
4. Crear `documentos-comerciales/hooks/useDocumentoComercialFieldsConfig.ts` (equivalente de `useFieldsConfiguration` con clave `'documentos_comerciales_fields_config'`).

### Fase 2: Creación del módulo nuevo y listados

1. Crear `documentos-comerciales/pages/DocumentosComerciales.tsx` con tres tabs.
2. Crear `documentos-comerciales/lista-cotizaciones/`, `lista-notas-venta/`, `lista-ordenes-venta/` con páginas, contextos y hooks propios.
3. Crear `documentos-comerciales/contexts/DocumentosComercialContext.tsx` para estado global del módulo (lista de documentos, filtros).
4. Registrar ruta en `privateRoutes.tsx`.
5. Agregar entrada en menú lateral.

### Fase 3: Implementación del formulario, borradores y acciones

1. Crear `documentos-comerciales/components/FormularioDocumentoComercial.tsx`.
2. Crear `documentos-comerciales/hooks/useDocumentoComercialState.ts`.
3. Crear `documentos-comerciales/hooks/useDocumentoComercialActions.ts` (guardar, generar, persistir).
4. Crear `documentos-comerciales/hooks/useDocumentoComercialDrafts.ts`.
5. Integrar `useBorradorEnProgreso` para auto-guardado.
6. Los borradores aparecen en el listado con estado `'borrador'`.

### Fase 4: Series y correlativos para documentos comerciales

1. Verificar que existan tipos de serie para COT (cotización), NV (nota de venta), OV (orden de venta) en el módulo de configuración de series.
2. Si no existen, coordinar con backend para crearlos.
3. `useDocumentoComercialType` filtrará las series disponibles por código de tipo.
4. El correlativo se genera en el backend al momento de generar el documento (no al guardarlo como borrador).

### Fase 5: Vista previa e impresión

1. Crear `documentos-comerciales/components/PreviewDocumentoComercial.tsx` con formato propio (cotización, nota de venta, OV).
2. Crear `documentos-comerciales/hooks/useDocumentoComercialPreview.ts`.
3. NO reutilizar el preview actual de comprobantes (formato diferente, sin numeración SUNAT).

### Fase 6: Reserva de stock (fase futura, no Fase 1)

> Solo implementar cuando el módulo comercial esté estable.

1. Cuando se genera una Orden de Venta, reservar stock (stock reservado += cantidad).
2. Usar `stockGateway` para cálculos, pero crear un servicio de reserva diferente al de venta FIFO.
3. Al cancelar una OV, liberar la reserva.
4. En cotizaciones: no reservar stock.
5. En notas de venta: evaluar si reserva o no según configuración del negocio.

### Fase 7: Conversión a comprobante (fase futura)

> Solo implementar cuando módulo y stock estén estables.

1. Desde el listado de una Nota de Venta u Orden de Venta, botón "Convertir a comprobante".
2. Navegar a `EmisionTradicional` con `location.state` que contenga una `CargaReutilizacionDocumentoComercial`.
3. `useDuplicateDataLoader` ya detecta este caso (`esCargaReutilizacionDocumentoComercial`).
4. Al emitir el comprobante, marcar el documento comercial origen como "convertido".
5. En este momento sí se descuenta el stock real (lo hace `useComprobanteActions`).

### Fase 8: Limpieza del módulo viejo

> Solo ejecutar cuando el nuevo módulo esté en producción y se confirme la migración.

1. Eliminar `Documentos-negociacion/` completo.
2. Eliminar rutas y menú del módulo viejo.
3. Verificar que ningún otro módulo importe desde `Documentos-negociacion`.
4. Audit de referencias: `grep -r "Documentos-negociacion"`.

---

## 20. Conclusión final

### Estado actual

El formulario de emisión de comprobantes tiene **alta calidad de diseño de componentes** pero está **orquestado por una capa de dominio muy acoplada** (SUNAT, cobranzas, stock, caja). Los sub-componentes visuales (`CompactDocumentForm`, `ProductsSection`, `NotesSection`, etc.) son **genéricos por naturaleza** aunque residen dentro del módulo de comprobantes.

### Veredicto para reutilización

| Aspecto | Veredicto |
|---------|-----------|
| ¿Puede reutilizarse el formulario visual? | **SÍ, directamente** (importar los componentes desde su ubicación actual) |
| ¿Conviene mover `CompactDocumentForm`? | **NO** (rompe comprobantes sin beneficio en Fase 1) |
| ¿Conviene crear un wrapper compartido? | **SÍ, `FormularioDocumentoComercial`** que componga los mismos sub-componentes |
| ¿Se puede reutilizar la lógica de acciones? | **NO** (`useComprobanteActions` está demasiado acoplado) |
| ¿Se puede reutilizar el carrito? | **SÍ** (`useCart` es genérico) |
| ¿Se puede reutilizar la moneda? | **SÍ** (`useCurrency`, `currencyManager`) |
| ¿Se pueden reutilizar los totales? | **SÍ** (`usePayment`) |
| ¿Se puede reutilizar el borrador en progreso? | **SÍ** (`useBorradorEnProgreso` en shared) |
| ¿Se puede reutilizar el buscador de clientes? | **SÍ, como parte de `CompactDocumentForm`** |
| ¿Se puede reutilizar el buscador de productos? | **SÍ** (`ProductsSection`, `useProductSearch`) |
| ¿Se puede reutilizar "+ Campos" / "+ Columnas"? | **SÍ, con clave de localStorage propia** |
| ¿Riesgo de romper comprobantes? | **BAJO si no se mueven archivos** |

### Decisión de arquitectura

La estrategia más segura y rápida para Fase 1 es:

> Crear `FormularioDocumentoComercial` en el nuevo módulo `documentos-comerciales`, que **consuma directamente** los componentes de `form-core` (sin moverlos), con hooks propios que no toquen SUNAT/cobranzas/stock, y con el mismo look & feel que el formulario de comprobantes.

Esto garantiza:
- Cero riesgo de romper comprobantes.
- Cero duplicación de lógica visual.
- Código nuevo limpio sin herencia de deuda técnica.
- Posibilidad de refactoring gradual en fases posteriores.

---

*Auditoría completada. Ningún archivo fue modificado durante este proceso.*

