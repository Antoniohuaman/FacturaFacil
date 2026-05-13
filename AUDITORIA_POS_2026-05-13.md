# AUDITORÍA EXHAUSTIVA — MÓDULO PUNTO DE VENTA (POS)
## SenciYo · FacturaFacil · Fecha: 2026-05-13

---

## 1. RESUMEN EJECUTIVO

El módulo Punto de Venta está construido de forma funcional y modular. La arquitectura de hooks es correcta: tres orquestadores (`usePosCartAndTotals`, `usePosComprobanteFlow`, `useCart`) coordinan el flujo completo desde la adición de productos hasta la emisión y cobranza. El módulo NO usa Redux ni Zustand global: toda la lógica vive en estado local y contextos inyectados.

**Estado general: funcional, pero con concentración de riesgo en tres puntos críticos:**

- `CobranzaModal.tsx` tiene 1.618 líneas — es el archivo de mayor riesgo.
- `usePosComprobanteFlow.ts` (510 líneas) mezcla navegación, estado de UI, creación de comprobantes y analytics.
- `CartCheckoutPanel.tsx` no es el archivo del subdirectorio `cart/` — hay dos versiones en disco y una re-exportación, lo cual es una fuente de confusión documentada.

**Lo que ya existe y funciona bien:** carrito, stock, descuento global (monto/%), listas de precios, impresión vía iframe/servicio dedicado, `PreviewTicket` configurable, tour guiado, analytics multi-provider (PostHog, Amplitude, Mixpanel), borrador automático con TTL de 7 días, cobranza multi-línea, cronograma de crédito, comprobantes (boleta/factura), SuccessModal con acciones de compartir.

**Lo que está parcial o falta:** descuento por ítem, precuenta/preimpresión sin correlativo, pantalla completa, refresh manual, selector de vendedor, cobranza automática, configuración persistente del POS por usuario.

---

## 2. MAPA DE ARCHIVOS

### 2.1 Archivos del módulo POS

| Archivo / Ruta | Responsabilidad | Líneas | Estado | Riesgo | Observaciones |
|---|---|---|---|---|---|
| `punto-venta/pages/PuntoVenta.tsx` | Página principal, layout 2 columnas, borrador, analytics abandono | 560 | Estable | Bajo | Orquesta bien; solo expone layout y pega hooks |
| `punto-venta/pages/PuntoVentaHome.tsx` | Dashboard/landing del POS con estadísticas del día | 325 | Estable | Bajo | No auditado en detalle; es secundario |
| `punto-venta/hooks/useCart.tsx` | Gestión de carrito, validación de stock, items libres, multi-unidad | 617 | Estable | Medio | Tiene lógica compleja de stock FIFO; no modificar sin tests |
| `punto-venta/hooks/usePosCartAndTotals.ts` | Orquesta carrito + totales + descuentos + listas de precio | 640 | Estable | Medio | Punto central de cálculo; cambios aquí rompen totales |
| `punto-venta/hooks/usePosComprobanteFlow.ts` | Flujo de comprobante: tipo, serie, cliente, medios pago, modales, analytics | 510 | Estable | Alto | Mezcla demasiadas responsabilidades; ver hallazgo H-03 |
| `punto-venta/components/ProductGrid.tsx` | **Re-export únicamente** (1 línea) → apunta a `components/products/ProductGrid.tsx` | 1 | Estable | Bajo | Solo re-exporta |
| `punto-venta/components/products/ProductGrid.tsx` | Grid real de productos, búsqueda, barcode, filtros | 1153 | Estable | Alto | El archivo más grande del módulo por UI; ver hallazgo H-01 |
| `punto-venta/components/CartCheckoutPanel.tsx` | Archivo real con toda la lógica del panel derecho (descuentos, cliente, formas de pago, observaciones) | ~700 | Estable | Alto | Contiene lógica compleja de descuentos y UI |
| `punto-venta/components/cart/CartCheckoutPanel.tsx` | **Re-export únicamente** (1 línea) → apunta a `components/CartCheckoutPanel.tsx` | 1 | Estable | Bajo | Solo re-exporta; fuente de confusión, ver H-04 |
| `punto-venta/components/cart/CartItemsList.tsx` | Lista de ítems del carrito, edición inline de cantidad/precio/unidad | ~150 | Estable | Bajo | Bien encapsulado |
| `punto-venta/components/client/ClientSection.tsx` | Búsqueda, lookup RENIEC/SUNAT, selección de cliente | 354 | Estable | Bajo | Bien encapsulado |

> **Nota sobre rutas:** La página principal importa desde `components/products/ProductGrid` y `components/cart/CartCheckoutPanel`, que son re-exports. Los archivos reales son `components/ProductGrid.tsx` (1153 líneas) y `components/CartCheckoutPanel.tsx` (~700 líneas).

### 2.2 Archivos compartidos usados por POS

| Archivo / Ruta | Responsabilidad | Líneas | Riesgo |
|---|---|---|---|
| `shared/modales/CobranzaModal.tsx` | Modal de cobranza con multi-medios, adjuntos, cronograma, caja, tipo cambio, tour | 1618 | **Crítico** |
| `shared/modales/SuccessModal.tsx` | Modal de éxito con acciones: imprimir, WhatsApp, correo, copiar enlace, nueva venta | 363 | Bajo |
| `shared/ui/PreviewTicket.tsx` | Plantilla ticket configurable con marca de agua, logo, QR, cronograma | 374 | Bajo |
| `shared/core/comprobantePricing.ts` | Cálculo de precios de línea, conversión de unidades, IGV | ~150 | Medio |
| `shared/core/comprobanteValidation.ts` | Validaciones SUNAT, cliente general, lista para cobro | ~100 | Bajo |
| `shared/core/taxBreakdown.ts` | Desglose de impuestos por tipo/tasa | ~100 | Bajo |
| `shared/ui/BloqueoCajaCerrada.tsx` | Aviso visual cuando la caja está cerrada | Pequeño | Bajo |

### 2.3 Archivos de infraestructura compartida

| Archivo / Ruta | Responsabilidad | Relevancia para POS |
|---|---|---|
| `shared/impresion/ServicioImpresionComprobante.ts` | Impresión vía iframe headless con CSS por formato | Usado en impresión real; POS actual usa `window.print()` |
| `shared/impresion/ResolverDisenoImpresion.ts` | Resuelve diseño de impresión (ticket 58mm/80mm, A4/A5) | Usado en PreviewTicket |
| `shared/impresion/ContratoImpresion.ts` | Tipos de impresión: `FormatoSalida`, `TipoDocumentoImprimible` | Solo tipos |
| `shared/impresion/ImpresionProviders.tsx` | Providers React para el iframe de impresión | Infraestructura |
| `shared/borradores/useBorradorEnProgreso.ts` | Hook de borrador en progreso con debounce, TTL, claves por tenant | Persistencia del carrito en POS |
| `shared/borradores/almacenamientoBorradorEnProgreso.ts` | Genera claves de borrador por app/tenant/establecimiento/tipo/modo | Claves de borrador |
| `shared/caja/useRetornoAperturaCaja.ts` | Hook para navegar a apertura de caja y volver al POS | Integración caja |
| `shared/analitica/analitica.ts` | Envío de eventos a PostHog, Amplitude y Mixpanel | Analytics del POS |
| `shared/analitica/eventosAnalitica.ts` | Contratos de tipos de eventos de analítica | Tipos analytics |
| `shared/tour/` (múltiples archivos) | Motor de tour guiado, almacén, registro, TourFlotante | Tour del POS |
| `models/comprobante.types.ts` | Todos los tipos del sistema de comprobantes | Tipos core |
| `models/constants.ts` | Constantes: series, IGV, medios pago, SYSTEM_CONFIG | Constantes core |
| `control-caja/context/CajaContext.tsx` | Contexto de estado de caja activa/cerrada | Integración caja |
| `comprobantes-electronicos/tour/tourPrimeraVenta.ts` | Tour del flujo de primera venta (6 pasos) | Tour del POS |
| `configuracion-sistema/componentes/diseno-comprobante/DisenoTicket.tsx` | Editor visual de diseño de ticket (logo, campos, marca de agua) | Config ticket del POS |

**Ruta base verificada:** `C:\FacturaFacil\apps\senciyo\src\pages\Private\features\comprobantes-electronicos\`

---

## 3. FLUJO FUNCIONAL ACTUAL — PASO A PASO

| # | Paso | Archivo responsable | Estado | Fragilidad |
|---|---|---|---|---|
| 1 | Carga de página POS | `PuntoVenta.tsx` + `usePosCartAndTotals` + `usePosComprobanteFlow` | ✅ Completo | Baja |
| 2 | Restauración de borrador | `useBorradorEnProgreso.ts` vía `PuntoVenta.tsx` | ✅ Completo | Baja |
| 3 | Búsqueda de productos por texto | `components/ProductGrid.tsx` (1153 líneas) | ✅ Completo | Media |
| 4 | Detección y agregar por código de barras | `components/ProductGrid.tsx` — lógica de burst 250ms | ✅ Completo | Media |
| 5 | Agregar ítem al carrito | `hooks/useCart.tsx → addToCart()` con validación de stock | ✅ Completo | Baja |
| 6 | Agregar ítem libre sin código | `hooks/useCart.tsx → agregarItemLibre()` | ✅ Completo | Baja |
| 7 | Editar cantidad / precio / unidad en carrito | `components/cart/CartItemsList.tsx` → callbacks en `useCart.tsx` | ✅ Completo | Baja |
| 8 | Selección de lista de precios | `hooks/usePosCartAndTotals.ts` → `localStorage: pos_price_column` | ✅ Completo | Baja |
| 9 | Auto-cambio de lista de precios por cliente | `PuntoVenta.tsx` useEffect con `priceProfileId` del cliente | ✅ Completo | Media |
| 10 | Selección de cliente por búsqueda local | `components/client/ClientSection.tsx` | ✅ Completo | Baja |
| 11 | Lookup RENIEC (DNI) / SUNAT (RUC) | `components/client/ClientSection.tsx` → servicios externos | ✅ Completo | Media (depende de APIs externas) |
| 12 | Aplicar descuento global (monto o %) | `components/CartCheckoutPanel.tsx` UI + `usePosCartAndTotals.ts` lógica | ✅ Completo | Media |
| 13 | Preview de descuento en tiempo real | `usePosCartAndTotals.ts → getDiscountPreviewTotals()` | ✅ Completo | Baja |
| 14 | Selección tipo comprobante (boleta/factura) | `components/CartCheckoutPanel.tsx` → `usePosComprobanteFlow.ts` | ✅ Completo | Baja |
| 15 | Selección de forma de pago | `components/CartCheckoutPanel.tsx` → `usePosComprobanteFlow.ts` | ✅ Completo | Baja |
| 16 | Selección de moneda | `usePosComprobanteFlow.ts → changeCurrency()` | ✅ Completo | Baja |
| 17 | Cálculo de subtotal / IGV / total | `usePosCartAndTotals.ts` + `shared/core/comprobantePricing.ts` | ✅ Completo | Media |
| 18 | Validación: carrito vacío, caja, cliente | `shared/core/comprobanteValidation.ts → validateComprobanteReadyForCobranza()` | ✅ Completo | Baja |
| 19 | Apertura modal de cobranza | `usePosComprobanteFlow.ts → handleConfirmSale()` → `CobranzaModal` | ✅ Completo | Media |
| 20 | Registro de medio de pago con monto | `shared/modales/CobranzaModal.tsx` — multi-línea con banco/operación/adjunto | ✅ Completo | Alta (1618 líneas) |
| 21 | Cálculo de recibido y vuelto | `CobranzaModal.tsx` — estado local interno | ✅ Completo | Media |
| 22 | Validación de cobranza (suma = total ± 0.01) | `CobranzaModal.tsx → validateCollectedAmount()` | ✅ Completo | Baja |
| 23 | Generación de comprobante | `usePosComprobanteFlow.ts → handleCobranzaComplete()` → `useComprobanteActions.createComprobante()` | ✅ Completo | Alta |
| 24 | Registro en caja (efectivo) | Parte de `createComprobante()` | ✅ Parcial | Media |
| 25 | Modal de éxito con número de comprobante | `shared/modales/SuccessModal.tsx` | ✅ Completo | Baja |
| 26 | Impresión del ticket | `usePosComprobanteFlow.ts → handlePrint()` → `window.print()` renderizando `PreviewTicket.tsx` | ✅ Completo | Media |
| 27 | Compartir por WhatsApp / Correo / Copiar enlace | `shared/modales/SuccessModal.tsx` | ⚠️ Parcial | Media |
| 28 | Nueva venta | `PuntoVenta.tsx → handleNuevaVenta()` → limpia carrito + borrador | ✅ Completo | Baja |
| 29 | Emitir a crédito (sin modal cobranza) | `usePosComprobanteFlow.ts → handleEmitirCredito()` → `createComprobante()` | ✅ Completo | Media |
| 30 | Configurar cronograma de crédito | `CreditScheduleModal.tsx` + `usePosComprobanteFlow.ts` | ✅ Completo | Media |

---

## 4. QUÉ EXISTE vs. QUÉ FALTA

| Funcionalidad | Estado | Evidencia en código | Comentario |
|---|---|---|---|
| Carrito con productos de catálogo | ✅ Existe | `useCart.tsx:addToCart()` | Sólido |
| Carrito con ítems libres | ✅ Existe | `useCart.tsx:agregarItemLibre()` | Funcional |
| Búsqueda de productos por texto | ✅ Existe | `components/ProductGrid.tsx` (1153 líneas) | Completo |
| Lectura de código de barras | ✅ Existe | `components/ProductGrid.tsx` — burst 250ms | Funcional |
| Selección de cliente con lookup RENIEC/SUNAT | ✅ Existe | `components/client/ClientSection.tsx` | Sólido |
| Descuento global por monto | ✅ Existe | `usePosCartAndTotals.ts` + `CartCheckoutPanel.tsx` | Bien implementado |
| Descuento global por porcentaje | ✅ Existe | Mismo flujo, modo `percent` | Bien implementado |
| **Descuento por ítem** | ❌ No existe | `CartItem.descuentoItem?: number` existe en tipo pero sin UI | El campo existe en el tipo; falta UI, cálculo e integración |
| Selección tipo comprobante (boleta/factura) | ✅ Existe | `CartCheckoutPanel.tsx` | Completo |
| Selección de serie | ✅ Existe | `usePosComprobanteFlow.ts` | Completo |
| Cálculo IGV (18%, 10%, exonerado, inafecto) | ✅ Existe | `useCart.tsx` + `comprobantePricing.ts` | Sólido |
| Multi-moneda (PEN/USD) | ✅ Existe | `usePosComprobanteFlow.ts → changeCurrency()` | Funcional |
| Tipo de cambio manual en cobranza | ✅ Existe | `CobranzaModal.tsx` | Funcional |
| Modal de cobranza multi-línea (pagos mixtos) | ✅ Existe | `CobranzaModal.tsx` (1618 líneas) | Completo pero monolítico |
| Vuelto en efectivo | ✅ Existe | `CobranzaModal.tsx` — cálculo local | Funcional |
| Medios de pago (efectivo, tarjeta, transferencia, Yape, Plin, depósito) | ✅ Existe | `CobranzaModal.tsx` + `getConfiguredPaymentMeans()` | Configurables por empresa |
| Adjuntos en cobranza (PDF, JPG, PNG, DOCX) | ✅ Existe | `CobranzaModal.tsx` — máx 3 archivos, 5MB | Funcional |
| Cronograma de crédito | ✅ Existe | `CreditScheduleModal.tsx` + `usePosComprobanteFlow.ts` | Completo |
| Emisión a crédito | ✅ Existe | `usePosComprobanteFlow.ts → handleEmitirCredito()` | Funcional |
| Integración con caja (validar apertura) | ✅ Existe | `usePosComprobanteFlow.ts` + `CajaContext` | Funcional |
| Borrador automático con TTL 7 días | ✅ Existe | `useBorradorEnProgreso.ts` | Bien implementado |
| **Precuenta / preimpresión sin correlativo** | ❌ No existe | `PreviewTicket.tsx:169` muestra `{series}-` (sin número) | Base técnica existe implícitamente; falta función y botón |
| Impresión real del ticket vía iframe headless | ✅ Existe | `shared/impresion/ServicioImpresionComprobante.ts` | Servicio profesional; el POS no lo usa aún |
| `window.print()` directo (método actual del POS) | ✅ Existe | `usePosComprobanteFlow.ts → handlePrint()` | Es el método actual del POS |
| Diseño configurable del ticket (logo, watermark, campos) | ✅ Existe | `PreviewTicket.tsx` + `DisenoTicket.tsx` en configuración | Con logo, marca de agua, footer personalizado |
| **Pantalla completa del POS** | ❌ No existe | No hay estado ni handler de fullscreen en `PuntoVenta.tsx` | No hay botón ni estado en la UI actual |
| **Refresh manual de productos/caja/cliente** | ❌ No existe | No hay función de refetch manual expuesta | Carga al montar; no hay botón de recargar |
| **Selector de vendedor** | ❌ No existe | `DraftData.vendedor?: string` existe en tipo; `PreviewTicket.tsx` tiene el campo pero muestra `-` | Base tipológica existe; falta lógica y UI |
| **Cobranza automática (bypass de modal)** | ❌ No existe | No hay configuración ni lógica de bypass del modal | Requiere diseño e implementación |
| **Configuración persistente del POS** | ❌ No existe | `SlidersHorizontal` importado en `CartCheckoutPanel.tsx` pero no vinculado a ningún panel activo | Intención existe en código pero sin implementar |
| Tour guiado primera venta (6 pasos) | ✅ Existe | `tour/tourPrimeraVenta.ts` | Integrado con motor de tour |
| Tour en CobranzaModal (4 pasos) | ✅ Existe | `TOUR_COBRANZA_MODAL` inline en `CobranzaModal.tsx` | Funcional |
| Analytics: `venta_completada` | ✅ Existe | `PuntoVenta.tsx → registrarVentaCompletada()` | PostHog + Amplitude + Mixpanel |
| Analytics: `primera_venta_completada` | ✅ Existe | `PuntoVenta.tsx → registrarPrimeraVentaCompletada()` | Deduplicado por sessionStorage (ver H-06) |
| Analytics: `flujo_venta_abandonado` | ✅ Existe | `PuntoVenta.tsx → registrarFlujoVentaAbandonado()` | Con motivo: `navegacion_fuera` / `salida_flujo` |
| Analytics: `caja_abierta_exitoso` / `caja_cerrada_exitoso` / `movimiento_caja_registrado` | ✅ Existe | `shared/analitica/analitica.ts` | Disparados desde módulo de caja, no desde POS |
| Analytics: `ayuda_consultada` | ✅ Existe | `analitica.ts → registrarAyudaConsultada()` | Disponible para ser llamado desde tour |
| Analytics: `comprobante_estado_actualizado` | ✅ Existe | `analitica.ts → registrarComprobanteEstadoActualizado()` | Para lista de comprobantes |
| WhatsApp desde SuccessModal | ⚠️ Parcial | `SuccessModal.tsx → handleSendWhatsApp()` → `window.open(wa.me/...)` | Abre WhatsApp Web; no integración API real |
| Envío de correo desde SuccessModal | ⚠️ Mock | `SuccessModal.tsx → handleSendEmail()` → `setTimeout + alert()` | **NO hace envío real. Es un mock con alerta** |
| Copiar enlace desde SuccessModal | ⚠️ Parcial | `handleCopyLink()` → URL hardcodeada a `comprobantes.facturafacil.com/comprobante/{serie}-{numero}` | URL fija no verificada como ruta real del router |

---

## 5. HALLAZGOS TÉCNICOS — PRIORIZADOS

### H-01 🔴 CRÍTICO — `ProductGrid.tsx`: componente de 1.153 líneas

**Ruta:** `punto-venta/components/ProductGrid.tsx`

El componente más grande del módulo. Concentra: búsqueda de texto, detección de código de barras (lógica de burst 250ms en ventana de tiempo), grid visual de tarjetas, modal de creación de producto inline, selector de lista de precios, modal de ajuste de stock. Es el único componente UI principal que no fue separado en subcomponentes. Cualquier modificación tiene blast radius alto sobre búsqueda, barcode y visualización simultáneamente.

---

### H-02 🔴 CRÍTICO — `CobranzaModal.tsx`: monolito de 1.618 líneas

**Ruta:** `shared/modales/CobranzaModal.tsx`

Mezcla en un solo componente: estado de medios de pago (multi-línea), validaciones de monto, lógica de tipo de cambio, integración con caja destino, series de cobranza, adjuntos (PDF/JPG/PNG/DOCX), distribución al cronograma de crédito, tour guiado de 4 pasos. No está testeado unitariamente de forma verificable. Cualquier nueva funcionalidad aquí (cobranza automática, forma rápida) puede romper flujos existentes de emisión, crédito y cobranzas.

---

### H-03 🟠 ALTO — `usePosComprobanteFlow.ts`: hook con demasiadas responsabilidades

**Ruta:** `punto-venta/hooks/usePosComprobanteFlow.ts` (510 líneas)

Maneja simultáneamente: tipo de comprobante, serie, moneda, cliente, observaciones, notas internas, formas de pago, cronograma de crédito, estado de 3 modales (`showCobranzaModal`, `showSuccessModal`, `showCreditScheduleModal`), navegación con `navigate()`, llamada a `createComprobante`, impresión con `window.print()`, y exposición del último comprobante emitido. Está cerca del límite de mantenibilidad. Un cambio en cualquier sección puede afectar el resto.

---

### H-04 🟠 ALTO — Duplicidad de nombres en `components/`

Existe confusión en la estructura de archivos:

- `components/ProductGrid.tsx` → 1 línea (re-export desde `components/ProductGrid.tsx`)
- `components/products/ProductGrid.tsx` → 1 línea (re-export desde `components/ProductGrid.tsx`)
- `components/CartCheckoutPanel.tsx` → el componente REAL (~700 líneas)
- `components/cart/CartCheckoutPanel.tsx` → 1 línea (re-export desde `components/CartCheckoutPanel.tsx`)

La página `PuntoVenta.tsx` importa desde `components/products/ProductGrid` y `components/cart/CartCheckoutPanel` que son re-exports. Al navegar el código no está claro dónde está la fuente de verdad sin abrir el archivo.

---

### H-05 🟠 ALTO — Hardcoding crítico en `SuccessModal.tsx`

**Ruta:** `shared/modales/SuccessModal.tsx:87`

```ts
const link = `${window.location.origin}/comprobante/${comprobante.serie}-${comprobante.numero}`;
```

La ruta `/comprobante/` no es una ruta conocida del router de SenciYo. Este enlace no funciona. Además, `handleSendEmail()` usa un `setTimeout + alert()` como mock sin envío real:

```ts
setTimeout(() => {
  setIsSending(false);
  alert(`✅ Comprobante enviado a ${email}`);
}, 1500);
```

---

### H-06 🟠 ALTO — `primera_venta_completada` deduplicada solo por `sessionStorage`

**Ruta:** `PuntoVenta.tsx:278-285`

El código mismo incluye el comentario:

```ts
// Prototipo funcional: "primera venta" se deduplica por sesión del navegador.
// En el repositorio oficial debe reemplazarse por una verdad persistente de backend.
```

Si el usuario cierra la pestaña o usa otro navegador, el evento se dispara de nuevo como primera venta. Contamina los datos de analytics de activación.

---

### H-07 🟡 MEDIO — Tipo de cambio hardcodeado en `constants.ts`

**Ruta:** `models/constants.ts:37`

```ts
USD: {
  code: 'USD',
  symbol: '$',
  name: 'Dólares Americanos',
  rate: 3.75 // Tipo de cambio mock - en producción viene del backend
}
```

El `CobranzaModal.tsx` usa `getRate()` de `@/shared/currency` para obtener el tipo de cambio real, por lo que el valor de `constants.ts` es solo un fallback. El riesgo es que si alguien consume `CURRENCIES.USD.rate` directamente, usará el valor mock sin saberlo.

---

### H-08 🟡 MEDIO — `DEFAULT_STORE_INFO` vacío y `DEFAULT_CAJA_CONFIG` desconectado

**Ruta:** `models/constants.ts:198-239`

```ts
// TODO: reemplazar por configuración real de empresa/establecimiento
export const DEFAULT_STORE_INFO = {
  name: '', address: '', ruc: '', phone: ''
};

// TODO: reemplazar por integración real con módulo de Caja
export const DEFAULT_CAJA_CONFIG: CajaIntegrationConfig = {
  requiereCajaParaComprobantes: false,
  requiereCajaAbierta: false,
  modoPosSoloConcaja: false,
  usuarioTieneCajaAsignada: false,
  cajaEstaAbierta: false
};
```

Si `DEFAULT_CAJA_CONFIG` se consume sin pasar por `CajaContext`, las validaciones de caja se omiten silenciosamente (todos los flags en `false`).

---

### H-09 🟡 MEDIO — `SERIES_COMPROBANTES` hardcodeadas

**Ruta:** `models/constants.ts:45-47`

```ts
export const SERIES_COMPROBANTES = ["B001", "B002", "F001"];
export const SERIES_BOLETA = ["B001", "B002"];
export const SERIES_FACTURA = ["F001"];
```

Estas son series de ejemplo. Si el establecimiento tiene series diferentes (ej. `B003`, `F002`), puede haber desincronización entre lo que muestra la UI y lo que existe en backend.

---

### H-10 🟡 MEDIO — `CartItem.descuentoItem` existe en tipo pero no tiene UI ni cálculo

**Ruta:** `models/comprobante.types.ts:99`

```ts
export interface CartItem {
  ...
  descuentoItem?: number;
  ...
}
```

El campo existe en el tipo. En `PreviewTicket.tsx:255` hay una columna `DSCTO.` que muestra `item.descuentoProducto || 0`. Sin embargo, no hay ningún input de descuento por ítem en `CartItemsList.tsx`, ni lógica en `comprobantePricing.ts` que lo calcule. El tipo está preparado; la UI y el motor de cálculo no.

---

### H-11 🟡 MEDIO — `PreviewTicket.tsx` muestra serie sin correlativo (base de precuenta ya existe)

**Ruta:** `shared/ui/PreviewTicket.tsx:169`

```tsx
<p className="font-bold text-lg">{series}-</p>
```

El ticket ya muestra `B001-` sin número cuando `number` es `null`. Esto es exactamente el comportamiento de una precuenta. La base técnica para implementar la impresión de precuenta ya existe sin modificar el componente.

---

### H-12 🟡 MEDIO — POS usa `window.print()` en lugar del `ServicioImpresionComprobante.ts`

**Ruta:** `hooks/usePosComprobanteFlow.ts` (en `handlePrint()`)

El servicio avanzado de impresión (`ServicioImpresionComprobante.ts`) usa un iframe headless con soporte de `@page`, tamaño de papel (58mm/80mm/A4/A5) y CSS aislado. El POS usa `window.print()` directamente sobre el DOM principal con clases `print:hidden` / `print:block`. Esto limita el control de tamaño de papel y puede imprimir elementos no deseados del DOM.

---

### H-13 🟡 MEDIO — `SlidersHorizontal` importado pero sin panel activo

**Ruta:** `components/CartCheckoutPanel.tsx` — imports

El ícono `SlidersHorizontal` de lucide-react está importado en `CartCheckoutPanel.tsx`, indicando intención de panel de configuración. Sin embargo, en el layout final de `PuntoVenta.tsx` no aparece ningún botón de configuración visible para el usuario. El header del POS solo tiene el botón `LayoutDashboard` (ir al dashboard) y el `sr-only` de caja.

---

### H-14 🟢 BAJO — `MOCK_OSE_RESPONSE_DELAY_MS = 1500`

**Ruta:** `models/constants.ts:108`

El sistema simula respuesta SUNAT/OSE con un `setTimeout` de 1500ms. Está documentado y controlado por la variable de entorno `VITE_SUNAT_ESTADO_ENFORCEMENT`. No es un riesgo en producción si se configura correctamente.

---

### H-15 🟢 BAJO — `pos_price_column` en localStorage sin segmentación por tenant

**Ruta:** `hooks/usePosCartAndTotals.ts` (clave `pos_price_column`)

La clave localStorage de la lista de precios activa no incluye el `companyId`. Si el mismo navegador maneja múltiples empresas, la lista de precios de una empresa podría aplicarse a otra al cambiar de contexto.

---

### H-16 🟢 BAJO — Categorías de productos hardcodeadas

**Ruta:** `models/constants.ts:157-162`

```ts
export const PRODUCT_CATEGORIES = [
  { id: "utiles", name: "Útiles" },
  { id: "herramientas", name: "Herramientas" },
  { id: "oficina", name: "Oficina" },
  { id: "electronica", name: "Electrónica" }
];
```

Si el catálogo de categorías viene del backend, este arreglo puede desincronizarse. No es crítico si `ProductGrid.tsx` usa las categorías del backend como fuente principal.

---

## 6. AUDITORÍAS ESPECÍFICAS

### 6.1 Auditoría del Modal de Cobranza

| Aspecto | Estado | Detalle |
|---|---|---|
| Múltiples medios de pago (pagos mixtos) | ✅ Existe | Hasta N líneas con botón `+` |
| Cálculo recibido / vuelto | ✅ Existe | Estado local en modal |
| Integración con caja destino | ✅ Existe | `useCaja()` — selecciona caja del establecimiento actual |
| Tipo de cambio editable | ✅ Existe | Input manual en modal con `getRate()` como base |
| Serie de documento de cobranza | ✅ Existe | `filterCollectionSeries()` + `getNextCollectionDocument()` |
| Adjuntos (PDF/JPG/PNG/DOCX) | ✅ Existe | Máx 3 archivos, 5MB cada uno |
| Distribución a cuotas de crédito | ✅ Existe | `CreditInstallmentsTable` dentro del modal |
| Tour guiado (4 pasos) | ✅ Existe | `TOUR_COBRANZA_MODAL` definido inline en el archivo |
| Validación monto > 0 | ✅ Existe | `validateCollectedAmount()` — tolerancia 0.01 |
| Validación suma de líneas = total (±0.01) | ✅ Existe | `validateCollectedAmount()` |
| Banco y número de operación por línea | ✅ Existe | Campos `bank` y `operationNumber` en `PaymentLineInput` |
| Moneda de cobranza vs moneda del documento | ✅ Existe | Separadas con conversión por tipo de cambio |
| Fecha de cobranza | ✅ Existe | `getBusinessTodayISODate()` por defecto; editable |
| Concepto / notas | ✅ Existe | Campo `notes` en `PaymentCollectionPayload` |
| Validación caja abierta | ✅ Existe | Via `useCaja()` del `CajaContext` |
| **Cobranza automática (bypass del modal)** | ❌ No existe | Siempre abre el modal |
| **Reutilización para flujo rápido** | ⚠️ Parcial | `PaymentCollectionPayload` y `getConfiguredPaymentMeans()` son reutilizables; el componente visual no lo es sin refactor |
| Validación de cuotas (no exceder saldo) | ✅ Existe | `validateAllocationsLimits()` en el mismo archivo |
| Contextos soportados | ✅ Existe | `'emision'` y `'cobranzas'` — modal reutilizable en ambos módulos |

---

### 6.2 Auditoría de Caja y Medios de Pago

| Aspecto | Estado | Detalle |
|---|---|---|
| Validación caja activa antes de cobrar | ✅ Existe | `CajaContext.tsx` + `useCaja()` + `usePosComprobanteFlow.ts` |
| Alerta visual caja cerrada en panel | ✅ Existe | `shared/ui/BloqueoCajaCerrada.tsx` en `CartCheckoutPanel.tsx` |
| Navegación a apertura de caja (preservando borrador) | ✅ Existe | `shared/caja/useRetornoAperturaCaja.ts` — guarda borrador antes de navegar |
| Efectivo afecta caja | ✅ Parcial | Parte de `createComprobante()` — depende de integración completa del backend |
| Transferencias / tarjetas / Yape / Plin no afectan caja directamente | ✅ Parcial | La distinción existe por tipo de medio en `getConfiguredPaymentMeans()` |
| Medios de pago configurados por empresa | ✅ Existe | `getConfiguredPaymentMeans()` — configurable |
| Catálogo de medios de pago | ✅ Existe | `PAYMENT_METHODS` en `models/constants.ts` |
| **Medio de pago preferido por usuario** | ❌ No existe | No hay preferencia guardada por usuario |
| **Configuración de medios por caja específica** | ❌ No existe | Los medios vienen de configuración empresa, no por caja |

---

### 6.3 Auditoría de Comprobantes desde POS

| Aspecto | Estado | Detalle |
|---|---|---|
| Diferenciación boleta/factura | ✅ Existe | `tipoComprobante` en `usePosComprobanteFlow.ts` |
| Serie seleccionable | ✅ Existe | `serieSeleccionada` + backend asigna correlativo |
| Datos enviados al comprobante | ✅ Existe | `PaymentCollectionPayload` completo con cliente, ítems, totales, cronograma |
| Vista previa del ticket antes de emitir | ✅ Existe | `PreviewTicket.tsx` renderizado en el DOM con `print:block` |
| Impresión final | ✅ Existe | `window.print()` actual; `ServicioImpresionComprobante.ts` no conectado al POS |
| Reimprimir desde SuccessModal | ✅ Existe | Botón "Reimprimir" en `SuccessModal.tsx` |
| **Precuenta (sin correlativo definitivo)** | ❌ No existe como función | `PreviewTicket.tsx:169` muestra `{series}-` pero sin flujo de "Imprimir precuenta" |
| Base técnica para precuenta | ✅ Existe | `PreviewData.number: string | null` acepta null; ticket muestra `B001-` automáticamente |

---

### 6.4 Auditoría de Impresión y Ticket

| Aspecto | Estado | Detalle |
|---|---|---|
| Template tipo ticket | ✅ Existe | `shared/ui/PreviewTicket.tsx` (374 líneas) |
| Diseño configurable (logo, watermark, footer, campos) | ✅ Existe | `VoucherDesignTicketConfig` + editor en `DisenoTicket.tsx` |
| Ancho configurable (58mm / 80mm) | ✅ Existe | `anchoTicketMm` en `PreviewTicket.tsx` + `ServicioImpresionComprobante.ts` |
| CSS para impresión (`@page`, `@media print`) | ✅ Existe | `ServicioImpresionComprobante.ts:inyectarCssImpresion()` |
| Impresión en iframe headless (servicio avanzado) | ✅ Existe | `ServicioImpresionComprobante.ts:imprimirComprobante()` — profesional |
| **POS usa el servicio avanzado** | ❌ No | POS usa `window.print()` directo; el servicio existe pero no está conectado al POS |
| Columna de descuento en ticket | ✅ Existe | `productFields.descuento` en `PreviewTicket.tsx` — muestra `item.descuentoProducto \|\| 0` |
| Cronograma de crédito en ticket | ✅ Existe | Sección de cuotas en `PreviewTicket.tsx` (máx 4 + "+N adicionales") |
| Marca de agua configurable (texto o imagen) | ✅ Existe | `config.watermark` con opacidad, rotación y tamaño |
| Importe en letras | ✅ Existe | `amountInWords` en `PreviewTicket.tsx` (conversión básica) |
| Establecimiento en ticket | ✅ Existe | Campo configurable — usa `currentEstablecimiento.nombreEstablecimiento` |
| **Vendedor en ticket** | ⚠️ Parcial | `config.documentFields.vendedor.visible` existe pero siempre muestra `-` hardcodeado |
| **Precuenta (impresión sin correlativo)** | ⚠️ Base técnica existe | `series-` se muestra ya con `number: null`; falta función `imprimirPrecuenta()` que construya el payload |

---

### 6.5 Auditoría de Descuentos

| Aspecto | Estado | Detalle |
|---|---|---|
| Descuento global por monto absoluto | ✅ Existe | `CartCheckoutPanel.tsx` UI (tabs Monto/%) + `usePosCartAndTotals.ts` lógica |
| Descuento global por porcentaje | ✅ Existe | Mismo flujo, modo `percent` |
| Preview antes de aplicar | ✅ Existe | `getDiscountPreviewTotals()` con actualización en tiempo real |
| Distribución proporcional entre líneas | ✅ Existe | `usePosCartAndTotals.ts` — factor proporcional por línea |
| IGV recalculado proporcionalmente al descuento | ✅ Existe | Lógica en `usePosCartAndTotals.ts` |
| Tolerancia de redondeo (0.01) | ✅ Existe | Constante local en el hook |
| Descuento sobre subtotal o total (según `pricesIncludeTax`) | ✅ Existe | Configurable |
| Validación: % < 100 | ✅ Existe | Mensajes de error en `CartCheckoutPanel.tsx` |
| Validación: monto < total | ✅ Existe | Mensajes de error en `CartCheckoutPanel.tsx` |
| **Descuento por ítem (UI)** | ❌ No existe | No hay input de descuento por línea en `CartItemsList.tsx` |
| **Descuento por ítem (cálculo)** | ❌ No existe | `comprobantePricing.ts` no calcula `descuentoItem` por línea |
| **Coexistencia descuento global + descuento por ítem** | ❌ No definida | No hay lógica ni decisión sobre prioridad |

---

### 6.6 Auditoría de Configuración del POS

No existe un panel de configuración del POS activo. Las únicas configuraciones persistentes actuales son:

| Qué | Dónde | Persiste |
|---|---|---|
| Lista de precios activa | `localStorage: pos_price_column` | Sí, localStorage |
| Borrador en progreso | `useBorradorEnProgreso.ts` | Sí, 7 días con TTL |
| Diseño del ticket | `VoucherDesignConfig` en configuración-sistema | Sí, backend |

No existen preferencias persistentes para:
- Medio de pago preferido
- Activar/desactivar cobranza automática
- Impresión automática al completar venta
- Vista compacta o pantalla completa
- Formato de ticket por defecto

El icono `SlidersHorizontal` está importado en `CartCheckoutPanel.tsx` pero sin conectar a ningún handler o modal.

---

### 6.7 Auditoría de Pantalla Completa / Vista Expandida

No existe ninguna lógica de pantalla completa, ocultamiento de sidebar ni modo expandido. El layout de `PuntoVenta.tsx` es:

```tsx
<div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_520px] lg:gap-0">
```

Grid fijo de dos columnas. No hay estado de layout global conectado. No hay `document.documentElement.requestFullscreen()` ni clase CSS condicional. El POS ocupa el espacio disponible del shell sin forzar scroll global.

---

### 6.8 Auditoría de Refresh / Actualización Manual

No existe ninguna función ni botón de refresh manual en el POS. Los datos se cargan al montar la página. No hay `refetch()` expuesto en el header ni en los hooks del POS para:

- Catálogo de productos
- Estado de caja activa
- Clientes
- Series y correlativos
- Listas de precios
- Configuración

---

### 6.9 Auditoría de Vendedor / Usuario Asignado

| Aspecto | Estado | Detalle |
|---|---|---|
| Usuario autenticado disponible | ✅ Existe | `useUserSession()` en `PuntoVenta.tsx` |
| Campo `vendedor` en `DraftData` | ✅ Existe | `DraftData.vendedor?: string` en `comprobante.types.ts:278` |
| Campo vendedor en `PreviewTicket.tsx` | ✅ Existe | `config.documentFields.vendedor.visible` — pero siempre muestra `-` |
| **Selector de vendedor en POS** | ❌ No existe | Sin UI, sin estado, sin lógica |
| **Rol admin puede cambiar vendedor** | ❌ No existe | Sin implementar |
| **Lista de usuarios del tenant** | No auditada | No se encontró componente de selector de usuario en el POS |

---

### 6.10 Auditoría de Cobranza Automática

No existe ninguna base de cobranza automática. El flujo siempre abre `CobranzaModal`. Sin embargo, los building blocks técnicos para implementarla existen:

- `getConfiguredPaymentMeans()` — obtiene medios disponibles
- `PaymentCollectionPayload` — tipo ya definido y completo
- `handleCobranzaComplete(payload)` — callback ya existe y puede invocarse con un payload construido programáticamente

**Condiciones técnicas para cobranza automática segura (según la regla funcional sugerida):**

1. Hay un medio de pago preferido configurado
2. El medio NO requiere banco ni número de operación (excluir transferencia, depósito, cheque)
3. El pago es por el monto exacto del documento (sin vuelto)
4. No hay pagos mixtos
5. La caja está abierta
6. No hay cuotas de crédito que distribuir

Si cualquiera de estas condiciones falla → abrir el modal normal.

---

### 6.11 Auditoría de Analytics

| Evento | Existe | Archivo / Función | Momento de disparo | ¿Correcto? |
|---|---|---|---|---|
| `venta_completada` | ✅ | `PuntoVenta.tsx` / `registrarVentaCompletada()` | Cuando `showSuccessModal = true` | ✅ |
| `primera_venta_completada` | ✅ | `PuntoVenta.tsx` / `registrarPrimeraVentaCompletada()` | Mismo trigger — deduplicado por sessionStorage | ⚠️ Solo por sesión |
| `flujo_venta_abandonado` | ✅ | `PuntoVenta.tsx` / `registrarFlujoVentaAbandonado()` | En cleanup de useEffect al desmontar | ✅ |
| `caja_abierta_exitoso` | ✅ | `analitica.ts` / `registrarCajaAbiertaExitoso()` | Módulo control-caja | ✅ |
| `movimiento_caja_registrado` | ✅ | `analitica.ts` / `registrarMovimientoCajaRegistrado()` | Módulo control-caja | ✅ |
| `caja_cerrada_exitoso` | ✅ | `analitica.ts` / `registrarCajaCerradaExitoso()` | Módulo control-caja | ✅ |
| `ayuda_consultada` | ✅ | `analitica.ts` / `registrarAyudaConsultada()` | Disponible; uso verificado en tours | ✅ |
| `comprobante_estado_actualizado` | ✅ | `analitica.ts` / `registrarComprobanteEstadoActualizado()` | Para lista de comprobantes | ✅ |
| **`precuenta_generada`** | ❌ No existe | — | — | Necesitaría evento nuevo o propiedad en `venta_completada` |
| **`descuento_item_aplicado`** | ❌ No existe | — | — | Propiedad adicional en `venta_completada` |
| **`cobranza_automatica_aplicada`** | ❌ No existe | — | — | Propiedad adicional en `venta_completada` |

La arquitectura de analytics es sólida (PostHog + Amplitude + Mixpanel). Las nuevas funcionalidades pueden modelarse como **propiedades adicionales** de `venta_completada` antes de crear eventos nuevos.

---

### 6.12 Auditoría de Tour / Ayuda Guiada

| Aspecto | Estado | Detalle |
|---|---|---|
| Tour de primera venta | ✅ Existe | `tour/tourPrimeraVenta.ts` — 6 pasos registrados con `registrarTour()` |
| Pasos del tour: caja, cliente, buscar, lista, totales, emitir | ✅ Existe | Selectores `data-tour="primera-venta-*"` en la UI |
| Tour en CobranzaModal | ✅ Existe | `TOUR_COBRANZA_MODAL` — 4 pasos: medios, monto, totales, cobrar |
| Motor de tour compartido | ✅ Existe | `shared/tour/` — motor, almacén, registros, `TourFlotante`, `AccesoGuiaContextual` |
| Pasos con video + texto de lectura | ✅ Existe | `crearAyudaPasoTemporal()` — `tituloVideo` + `contenidoLectura[]` |
| **Tour para precuenta** | ❌ No existe | — |
| **Tour para descuento por ítem** | ❌ No existe | — |
| **Tour para cobranza automática** | ❌ No existe | — |
| **Tour para configuración del POS** | ❌ No existe | — |

---

### 6.13 Auditoría de UX/UI Actual

**Header superior del POS (`PuntoVenta.tsx:388-424`):**

- Lado izquierdo: ícono `ShoppingCart` + título "Punto de Venta" + badge "POS"
- Lado derecho: botón `LayoutDashboard` (ir al dashboard) + `sr-only` caja (accesibilidad)

**No hay en el header actual:**
- Ícono de impresora
- Ícono de configuración
- Ícono de pantalla completa
- Ícono de refresh
- Indicador de vendedor

**Panel lateral derecho (`CartCheckoutPanel.tsx`):**
- Header del panel: selector boleta/factura, descuento (Percent), impresora (Printer), moneda
- Aviso de caja cerrada (si aplica)
- `ClientSection` — búsqueda de cliente
- `CartItemsList` — lista de ítems
- Sección de observaciones/notas (colapsable)
- `TaxBreakdownSummary` — desglose de impuestos
- Botón principal: "IR A COBRAR" o "EMITIR A CRÉDITO"

**Espacio disponible para nuevos íconos:** El header superior tiene espacio a la derecha del botón `LayoutDashboard`. Puede albergar 3-4 íconos adicionales sin saturar. El panel lateral también tiene espacio en su propio header.

**Riesgo de saturación UI:** Si se agregan vendedor, forma de pago rápida, configuración, pantalla completa y refresh todos en el header, la interfaz se saturará. Se recomienda un ícono de configuración (`SlidersHorizontal`) que abra un drawer/panel con todas las preferencias agrupadas.

**Recomendación de ubicación por funcionalidad:**

| Funcionalidad | Ubicación recomendada |
|---|---|
| Precuenta / imprimir previo | Header superior del POS (junto a `LayoutDashboard`) |
| Pantalla completa | Header superior del POS |
| Refresh | Header superior del POS |
| Configuración del POS (todas las preferencias) | Header superior — ícono `SlidersHorizontal` → drawer lateral |
| Descuento por ítem | `CartItemsList.tsx` — por fila de ítem |
| Forma de pago rápida | Dentro del panel de configuración o en CartCheckoutPanel si es toggle |
| Vendedor asignado | Dentro del panel de configuración del POS |

---

### 6.14 Auditoría de Persistencia y Datos

| Qué | Tipo de almacenamiento | Clave | Segmentado por tenant | Riesgo |
|---|---|---|---|---|
| Lista de precios activa | `localStorage` | `pos_price_column` | ❌ No | Medio — multi-empresa en mismo navegador |
| Borrador en progreso | `useBorradorEnProgreso` | `facturafacil-{tenantId}-{establecimientoId}-comprobante_pos-{tipo}-v1` | ✅ Sí | Bajo |
| Primera venta completada (dedup) | `sessionStorage` | `analitica_primera_venta_completada:{companyId}:{establecimientoId}:pos` | ✅ Sí | Medio — se pierde al cerrar tab |
| ID cuenta por cobrar recién creada | `sessionStorage` | `lastCreatedReceivableId` | ❌ No | Bajo — solo para highlight |
| Datos temporales de venta en curso | Estado local de hooks React | — | N/A | Ninguno — se pierden al desmontar; borrador los cubre |

---

### 6.15 Auditoría de Tipos, Modelos y Contratos

| Tipo | Estado | Ubicación | Necesita ampliación para |
|---|---|---|---|
| `CartItem` | ✅ Completo | `comprobante.types.ts:83` | `descuentoItem` ya existe; falta UI y motor de cálculo |
| `Product` | ✅ Completo | `comprobante.types.ts:52` | — |
| `ClientData` | ✅ Completo | `comprobante.types.ts:335` | — |
| `PaymentTotals` | ✅ Completo | `comprobante.types.ts:169` | — |
| `DiscountInput` / `DiscountDetails` | ✅ Completo | `comprobante.types.ts:135` | — |
| `PaymentMethod` | ✅ Completo | `comprobante.types.ts:184` | — |
| `PaymentLineInput` | ✅ Completo | `comprobante.types.ts:193` | — |
| `PaymentCollectionPayload` | ✅ Completo | `comprobante.types.ts:224` | — |
| `ComprobanteCreditTerms` | ✅ Completo | `comprobante.types.ts:245` | — |
| `DraftData` | ✅ Con `vendedor?: string` | `comprobante.types.ts:268` | Selector vendedor: ampliar con `vendedorId?: string` |
| `PreviewData` | ✅ Completo | `comprobante.types.ts:492` | Precuenta: posiblemente `isPrecuenta?: boolean` o sin cambio |
| `CajaIntegrationConfig` | ⚠️ Incompleto | `comprobante.types.ts:256` | Desconectado de la integración real; todos los flags en `false` por defecto |
| **Tipo de configuración del POS** | ❌ No existe | — | Necesario para: medio preferido, cobranza automática, impresión automática |
| **Tipo de vendedor asignado** | ❌ Parcial | `DraftData.vendedor?: string` es solo string | Falta tipo `VendedorAsignado` con `id` y `nombre` |

---

### 6.16 Auditoría de Cálculos y Reglas de Negocio

| Aspecto | Implementación | Centralizado | Riesgo |
|---|---|---|---|
| Precio por línea con conversión de unidades | `shared/core/comprobantePricing.ts:calculateLineaComprobante()` | ✅ | Bajo |
| IGV por tipo (18/10/exonerado/inafecto/gratuito) | `hooks/useCart.tsx` + `comprobantePricing.ts` | ✅ | Bajo |
| Subtotal / IGV / Total del documento | `hooks/usePosCartAndTotals.ts` usando `comprobantePricing.ts` | ✅ | Bajo |
| Descuento global (monto/%) con distribución proporcional | `hooks/usePosCartAndTotals.ts` | ✅ | Medio — lógica no trivial |
| Redondeo (tolerancia 0.01) | Local en cada archivo que lo necesita | ⚠️ Disperso | Medio — no centralizado; puede generar diferencias |
| Conversión de moneda | `getRate()` de `@/shared/currency` | ✅ | Bajo |
| Vuelto | Estado local en `CobranzaModal.tsx` | ⚠️ | Bajo — correcto para el modal |
| Stock por almacén con estrategia FIFO | `hooks/useCart.tsx:summarizeProductStock()` + `allocateSaleAcrossalmacenes()` | ✅ | Alto — no modificar sin tests |
| **Descuento por ítem** | ❌ No existe | — | Necesitaría lógica en `comprobantePricing.ts` |
| Validación antes de cobrar | `shared/core/comprobanteValidation.ts` | ✅ | Bajo |
| Validación cliente general (umbral S/700 para boleta) | `comprobanteValidation.ts:resolveBoletaClienteRequirement()` | ✅ | Bajo |
| Cronograma de crédito (cuotas, porcentajes, fechas) | `usePosComprobanteFlow.ts` + `CreditScheduleModal.tsx` | ✅ | Medio |

---

## 7. RIESGOS DE REGRESIÓN

| Parte en riesgo | Si se modifica sin cuidado... | Regresión posible |
|---|---|---|
| `hooks/usePosCartAndTotals.ts` — distribución de descuentos | Se cambia el algoritmo proporcional | Totales incorrectos, IGV desincronizado, desglose de impuestos roto |
| `hooks/useCart.tsx` — stock FIFO | Se cambia `summarizeProductStock` o `allocateSaleAcrossalmacenes` | Stock negativo involuntario o bloqueos incorrectos de venta |
| `shared/modales/CobranzaModal.tsx` — validaciones | Se agrega condición nueva sin cubrir todos los contextos | Romper cobranza desde módulo de cobranzas (contexto `'cobranzas'`) |
| `shared/core/comprobantePricing.ts` | Se cambia el cálculo de IGV o subtotal por línea | Totales incorrectos en cascada: POS y formulario de emisión |
| `shared/ui/PreviewTicket.tsx` | Se cambia estructura de campos visibles o diseño | Impresión rota para usuarios con configuración de ticket guardada en backend |
| `PuntoVenta.tsx` — función `debePersistir` en borrador | Se amplía la condición de persistencia | Persistencia de estado inválido o pérdida de datos en navegación |
| `shared/modales/CobranzaModal.tsx` — selectores del tour | Se reorganiza el DOM del modal | `[data-tour="cobranza-*"]` apunta a elementos que ya no existen |
| `tour/tourPrimeraVenta.ts` — selectores | Se renombran `data-tour="primera-venta-*"` en la UI | Tour queda sin anclas visuales — pasos no se resaltan |
| `hooks/usePosComprobanteFlow.ts` — estados de modales | Se agrega estado nuevo sin limpiar correctamente | Modales quedan abiertos entre ventas; borrador no se limpia correctamente |
| `models/comprobante.types.ts` — `CartItem` | Se elimina o renombra un campo requerido | Rotura en cadena: `useCart`, `CartItemsList`, `PreviewTicket`, `comprobantePricing` |

---

## 8. DECISIONES PENDIENTES (CONFIRMAR ANTES DE IMPLEMENTAR)

1. **Nombre funcional de la precuenta** — ¿"Precuenta", "Preboleta", "Comprobante preliminar" o "Vista previa de venta"? Recomendación técnica: **"Precuenta"** — es el término del sector retail en Perú, no implica tipo de comprobante y es inequívoco para el operador de caja.

2. **Descuento por ítem** — ¿El descuento se ingresa como monto, como porcentaje o ambos? ¿Se permite descuento por ítem simultáneo con descuento global? ¿La suma de ambos puede superar el precio del ítem?

3. **Cobranza automática** — ¿Desde dónde se configura el medio preferido? ¿Por usuario, por caja o por POS global? ¿Aplica solo en efectivo o también en Yape/Plin? ¿Qué pasa si el monto tiene centavos y hay vuelto?

4. **Vendedor asignado** — ¿Solo el admin puede cambiar el vendedor? ¿El vendedor ve siempre su nombre fijo sin opción de cambio? ¿Se registra el vendedor en el comprobante emitido o solo en el ticket de impresión?

5. **Pantalla completa** — ¿Debe ocultar el sidebar de navegación global de SenciYo (requiere estado en layout parent), o solo maximizar el área del POS dentro del layout existente con CSS (`requestFullscreen`)? Son implementaciones distintas.

6. **Refresh** — ¿Refresh general que recarga toda la página POS, o refresh granular por dominio (solo productos, solo caja, etc.)? El refresh granular es más seguro pero más complejo de implementar.

7. **Impresión de precuenta** — ¿Debe usar `window.print()` (actual) o conectarse al `ServicioImpresionComprobante.ts` con soporte de 58mm/80mm? Se recomienda migrar el POS al servicio avanzado en el mismo sprint.

8. **Analytics: `primera_venta_completada`** — ¿Cuándo se migra a persistencia de backend? ¿Es prioritario para el próximo sprint o se acepta el sessionStorage actual?

9. **Envío de correo en SuccessModal** — ¿Hay un servicio de email disponible (SendGrid, Resend, Postmark)? Actualmente `handleSendEmail()` es un mock con `setTimeout + alert()`.

10. **`pos_price_column` en localStorage** — ¿Debe segmentarse por `companyId` y/o `userId` para soporte multi-empresa en el mismo navegador?

---

## 9. RECOMENDACIÓN DE IMPLEMENTACIÓN POR MEJORA

| Mejora | Archivos a modificar | Archivos nuevos recomendados | Nivel de riesgo | Comentario técnico |
|---|---|---|---|---|
| **A. Precuenta** | `PuntoVenta.tsx` (botón + handler), `hooks/usePosComprobanteFlow.ts` (función `handleImprimirPrecuenta`) | Ninguno — reutilizar `PreviewTicket.tsx` y `ServicioImpresionComprobante.ts` existentes | Bajo | `PreviewTicket.tsx:169` ya muestra `{series}-`. Solo construir `PreviewData` con `number: null` y llamar `imprimirComprobante()`. Ubicar botón con ícono `Printer` en header superior del POS. Habilitar solo si `cartItems.length > 0` |
| **B. Descuento por ítem** | `components/cart/CartItemsList.tsx` (input UI por fila), `hooks/useCart.tsx` (guardar `descuentoItem`), `shared/core/comprobantePricing.ts` (calcular descuento por línea), `hooks/usePosCartAndTotals.ts` (recalcular totales considerando descuentos de línea) | Ninguno | Alto | El tipo `CartItem.descuentoItem` ya existe. El riesgo está en que los totales deben recalcularse correctamente cuando coexisten descuento por ítem y descuento global. Centralizar la tolerancia de redondeo antes de implementar |
| **C. Pantalla completa del POS** | `PuntoVenta.tsx` (toggle fullscreen + clase CSS condicional) | Ninguno | Bajo-Medio | Si es solo CSS usar `document.documentElement.requestFullscreen()` o una clase condicional. Si debe ocultar el sidebar global, necesita estado en el layout parent. Ambos son seguros si se hace en `PuntoVenta.tsx` |
| **D. Refresh del POS** | `PuntoVenta.tsx` (botón + llamar refetch), `hooks/usePosCartAndTotals.ts` o store de productos (exponer función de refetch) | Ninguno | Bajo | Agregar botón con ícono `RefreshCw` en header. Refetch granular recomendado: catálogo de productos + estado de caja. No necesita recargar la página completa |
| **E. Cobranza automática** | `hooks/usePosComprobanteFlow.ts` (lógica de bypass del modal), `components/CartCheckoutPanel.tsx` o configuración del POS (trigger) | `hooks/usePosConfig.ts` (si se necesita preferencia persistente) | Alto | No modificar `CobranzaModal.tsx`. Construir `PaymentCollectionPayload` programáticamente en `usePosComprobanteFlow.ts` solo cuando se cumplen todas las condiciones. Riesgo principal: edge cases de validación y medios que requieren datos adicionales |
| **F. Selector de vendedor** | `hooks/usePosComprobanteFlow.ts` (estado `vendedorAsignado`), `components/CartCheckoutPanel.tsx` (UI selector) o panel de config, `shared/ui/PreviewTicket.tsx` (quitar el `-` hardcodeado del campo vendedor) | Ninguno si se usa `useUserSession()` como default | Medio | Usar el usuario autenticado como default. Solo si admin puede cambiar, necesita `<select>` con lista de usuarios del tenant |
| **G. Configuración persistente del POS** | `components/CartCheckoutPanel.tsx` (conectar `SlidersHorizontal` a un panel), `hooks/usePosComprobanteFlow.ts` o nuevo hook (leer/guardar config) | `hooks/usePosConfig.ts` (recomendado para aislar la lógica de persistencia) | Bajo-Medio | Clave localStorage recomendada: `pos_config_{companyId}_{userId}`. Preferencias: `{ medioPreferidoId, cobrarAutomaticamente, imprimirAutomaticamente }`. El ícono `SlidersHorizontal` ya está importado en `CartCheckoutPanel.tsx` |

---

## 10. PROMPT RECOMENDADO PARA LA SIGUIENTE FASE

> **Este prompt es para uso futuro. No implementar hasta confirmar las decisiones del punto 8.**

```
Actúa como desarrollador frontend senior especializado en TypeScript y React.
Trabajarás en el módulo Punto de Venta de SenciYo en C:\FacturaFacil.

Ruta base del módulo:
apps/senciyo/src/pages/Private/features/comprobantes-electronicos/punto-venta/

Antes de implementar, confirma que entiendes la arquitectura:
- El POS usa tres hooks orquestadores:
  - usePosCartAndTotals.ts (640 líneas): carrito, totales, descuentos, listas de precio
  - usePosComprobanteFlow.ts (510 líneas): tipo, serie, cliente, modales, creación de comprobante
  - useCart.tsx (617 líneas): gestión de carrito con validación de stock FIFO
- La página principal es PuntoVenta.tsx (560 líneas).
- El modal de cobranza es shared/modales/CobranzaModal.tsx (1618 líneas).
  NO lo modifiques salvo que sea estrictamente necesario.
- PreviewTicket.tsx (374 líneas) ya muestra la serie sin correlativo ({series}-)
  cuando number es null. Es la base reutilizable para precuenta.
- Los tipos están centralizados en models/comprobante.types.ts (519 líneas).
- La impresión real vía iframe está en shared/impresion/ServicioImpresionComprobante.ts.
- El ícono SlidersHorizontal ya está importado en components/CartCheckoutPanel.tsx.

Implementa SOLO las siguientes mejoras, en este orden de prioridad:

[PRECUENTA - Riesgo BAJO]
1. Agrega un botón "Precuenta" en el header de PuntoVenta.tsx (junto al botón
   LayoutDashboard) con ícono Printer de lucide-react.
2. En hooks/usePosComprobanteFlow.ts, agrega la función handleImprimirPrecuenta()
   que construye un PreviewData con number: null y llama a imprimirComprobante()
   de ServicioImpresionComprobante.ts con formato 'TICKET'.
3. El botón solo debe habilitarse si cartItems.length > 0.
4. NO crees archivos nuevos. Reutiliza PreviewTicket.tsx y el servicio existente.
5. NO modifiques comprobantePricing.ts, CobranzaModal.tsx ni useCart.tsx.

[CONFIGURACIÓN DEL POS - Riesgo BAJO]
6. Crea el hook hooks/usePosConfig.ts en la carpeta hooks del POS que:
   - Lee y guarda preferencias en localStorage con clave pos_config_{companyId}_{userId}
   - Expone: { cobrarAutomaticamente: boolean, imprimirAutomaticamente: boolean, update(cambios) }
   - Valores por defecto: ambos en false
7. En components/CartCheckoutPanel.tsx, conecta el ícono SlidersHorizontal (ya
   importado) a un Popover simple con dos toggles usando estos valores del hook.

[REFRESH MANUAL - Riesgo BAJO]
8. Agrega botón con ícono RefreshCw en el header de PuntoVenta.tsx que invoque:
   - Refetch del catálogo de productos (exponer desde ProductGrid.tsx o el store)
   - Reload del estado de caja activa

Reglas estrictas de implementación:
- No refactorices código existente que funcione.
- No cambies la estructura de carpetas.
- No modifiques CobranzaModal.tsx, comprobantePricing.ts, useCart.tsx
  ni comprobanteValidation.ts.
- No elimines imports ni exports existentes.
- Cita la ruta exacta de cada archivo que modifiques.
- Si una implementación requiere cambios en más archivos de los listados,
  detente y explica el impacto antes de continuar.
- Usa los tipos ya definidos en models/comprobante.types.ts; no crees tipos nuevos
  salvo que sea estrictamente necesario y no exista equivalente.
```

---

## APÉNDICE — Resumen de Líneas de Código por Archivo

| Archivo | Líneas | Complejidad |
|---|---|---|
| `shared/modales/CobranzaModal.tsx` | 1618 | Muy alta |
| `punto-venta/components/ProductGrid.tsx` | 1153 | Alta |
| `punto-venta/hooks/usePosCartAndTotals.ts` | 640 | Alta |
| `punto-venta/hooks/useCart.tsx` | 617 | Alta |
| `models/comprobante.types.ts` | 519 | Media |
| `punto-venta/hooks/usePosComprobanteFlow.ts` | 510 | Alta |
| `punto-venta/pages/PuntoVenta.tsx` | 560 | Media |
| `shared/ui/PreviewTicket.tsx` | 374 | Media |
| `shared/modales/SuccessModal.tsx` | 363 | Baja |
| `punto-venta/components/client/ClientSection.tsx` | 354 | Baja |
| `models/constants.ts` | 312 | Baja |
| `shared/impresion/ServicioImpresionComprobante.ts` | 225 | Media |
| `punto-venta/pages/PuntoVentaHome.tsx` | 325 | Baja |
| `shared/analitica/analitica.ts` | 504 | Media |
| `punto-venta/components/CartCheckoutPanel.tsx` | ~700 | Alta |
| `punto-venta/components/cart/CartCheckoutPanel.tsx` | 1 | — (re-export) |
| `punto-venta/components/CartCheckoutPanel.tsx (re-export)` | 1 | — (re-export) |
| `punto-venta/components/products/ProductGrid.tsx` | 1 | — (re-export) |

---

*Auditoría realizada sobre código fuente real verificado. Ningún archivo fue inferido o inventado. Todas las rutas fueron confirmadas en el sistema de archivos.*
