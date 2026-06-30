# Auditoría técnica y funcional para el módulo Compras

> **Fecha:** 2026-06-30 (actualizado)
> **Auditor:** Arquitecto frontend senior SenciYo
> **Repositorio:** FacturaFacil / apps/senciyo
> **Rama auditada:** RevisionGuias
> **Estado:** Documento de planificación definitivo — sin modificaciones de código

---

## 1. Resumen ejecutivo actualizado

El prototipo SenciYo tiene una base técnica **sólida** para desarrollar el módulo de Compras. Sin embargo, la versión anterior de este informe sobreestimó la reutilización directa de componentes. La postura correcta es:

> La reutilización esperada es principalmente de **lineamiento visual, patrón de formularios, experiencia de usuario, estilo de campos, drawers, badges, tablas y modales** — no de lógica ni tipos de ventas.

Correcciones clave respecto a la versión anterior del informe:

| Punto corregido | Versión anterior | Versión correcta |
|---|---|---|
| Reutilización estimada | "70-80% directo" | Patrón visual/estructural reutilizable; lógica y tipos propios |
| Estado del documento | Campo único `estado` | Estados separados por dimensión |
| Aprobación de OC | Fase 2 | **Fase 1** — incluye aprobación básica desde el inicio |
| Modalidad de inventario | Solo "generar o vincular NI" | Tres modalidades: `con_nota_ingreso`, `ingreso_automatico`, `no_afecta_inventario` |
| `LineaCompra` | Campos básicos | Cantidades separadas: solicitada, recibida, facturada, ingresada |
| Contrato backend | No existía | Nueva sección §21 con entidades y endpoints esperados |
| Estructura de carpetas | Mix inglés/español | Todo lo nuevo de Compras en español |
| "Solicitud de compra" | Usada sin definición | Renombrado a "Requerimiento de compra" |
| Pagos múltiples | Sin distinción | Distingue: varios medios en un pago vs. un pago a varias facturas |
| Renombrar `compra.types.ts` | P0 urgente | P1 — revisar si rompe imports antes de ejecutar |

**Veredicto actualizado:** El módulo de Compras se puede desarrollar limpiamente sobre la base actual. La preparación técnica (Fase 0) es indispensable antes de escribir una sola línea funcional. Si se salta la Fase 0, se acumula deuda técnica desde el primer commit.

---

## 2. Decisiones funcionales definitivas

Estas decisiones **no deben revertirse** al implementar. Quedan fijadas aquí para que el desarrollo sea coherente.

### 2.1 Comprobante de compra ≠ emisión

En Compras, SenciYo **no emite** el comprobante. El proveedor emite la factura, boleta, recibo u otro documento, y SenciYo lo **registra**. Por eso el lenguaje correcto es:

- ✅ "Registrar comprobante de compra"
- ✅ "Comprobante recibido del proveedor"
- ❌ "Emitir comprobante" (solo aplica en ventas)

### 2.2 Terminología: Requerimiento de compra

El documento interno pre-orden se llama **Requerimiento de compra**, no "Solicitud de compra". El flujo completo es:

```
Requerimiento de compra (Fase 2)
  → Orden de compra (Fase 1)
  → Comprobante de compra (Fase 1)
  → Cuenta por pagar (Fase 1)
  → Pago (Fase 1)
  → Nota de Ingreso en Inventario (Fase 1)
```

### 2.3 Nota de Ingreso permanece en Inventario

La Nota de Ingreso no se mueve a Compras. Compras la genera, la vincula o actualiza stock automáticamente a través de tres modalidades. Ver §12.

### 2.4 Proveedores dentro de Clientes/Proveedores

No se crea un módulo separado de Proveedores. Se usa la entidad `gestion-clientes` filtrando por `type = 'Proveedor'` o `'Cliente-Proveedor'`. Ver §15.

### 2.5 Suministros como clasificación, no tab

Los suministros son una `clasificacion` dentro de `LineaCompra`, no un tab principal ni un módulo separado. El campo `afectaInventario: boolean` determina si esa línea mueve stock.

### 2.6 Activos fijos: campo en Fase 1, módulo en Fase 3

`LineaCompra` admite `clasificacion: 'activo_fijo'` desde Fase 1, con campos mínimos previstos. El módulo completo con ficha, depreciación y vida útil queda para Fase 3 o Fase 4.

### 2.7 Aprobación básica desde Fase 1

La aprobación de órdenes de compra se incluye en Fase 1. Debe contemplar: usuario que aprueba/rechaza, fecha, motivo de rechazo e historial. No incluye aprobación avanzada por monto ni por centro de costo.

### 2.8 Pagos: dos escenarios distintos

| Escenario | Definición | Fase |
|---|---|---|
| **Varios medios en un pago** | Un pago = S/300 efectivo + S/500 transferencia, aplicado a una CxP | Fase 1 |
| **Un pago a varias facturas** | Un pago distribuido entre múltiples CxP | Fase 2 |

### 2.9 Control presupuestal informativo en Fase 1

Solo campos textuales `centroCosto` y `presupuesto` en cabecera y línea. Sin catálogo, sin validación, sin bloqueo. El control real es Fase 3/4.

### 2.10 Nomenclatura en español para todo lo nuevo

Todo archivo, carpeta, tipo, función, constante, ruta y componente nuevo del módulo Compras debe nombrarse en español. Ver §5.

---

## 3. Alcance revisado del módulo Compras

### 3.1 Entidades en Fase 1 (mínimo viable)

| Entidad | Descripción |
|---|---|
| `OrdenCompra` | Documento de intención de compra hacia el proveedor |
| `ComprobanteCompra` | Registro del documento recibido del proveedor (factura, boleta, recibo) |
| `CuentaPorPagar` | Obligación financiera generada desde el comprobante de compra |
| `CuotaCuentaPorPagar` | Cuota individual dentro de un pago a crédito |
| `PagoCompra` | Pago registrado contra una o más CxP |
| `MedioPagoCompra` | Línea de medio de pago dentro de un `PagoCompra` |
| `LineaCompra` | Línea de producto/servicio/gasto en OC o CC |
| `AdjuntoCompra` | Archivo adjunto (sustento documental) |
| `TrazabilidadCompra` | Vínculos entre documentos del ciclo de compra |

### 3.2 Entidades en Fase 2 (compras avanzadas)

| Entidad | Descripción |
|---|---|
| `RequerimientoCompra` | Solicitud interna pre-orden con aprobación de área |
| `CotizacionProveedor` | Propuesta recibida de proveedor (como adjunto o registro) |
| `AplicacionPagoMultiple` | Distribución de un pago entre varias CxP |

### 3.3 Entidades en Fase 3 (ERP avanzado)

| Entidad | Descripción |
|---|---|
| `NotaCreditoCompra` | Nota de crédito recibida del proveedor (reduce CxP) |
| `NotaDebitoCompra` | Nota de débito recibida del proveedor (aumenta CxP) |
| `DevolucionProveedor` | Salida de mercadería devuelta — gestionada desde Inventario |
| `ActivoFijoCompra` | Ficha de activo fijo adquirido por compra |

### 3.4 Fuera del alcance de Compras

| Fuera del alcance | Motivo |
|---|---|
| Nota de Ingreso (formulario y gestión) | Permanece en Inventario |
| Emisión de comprobante electrónico | Es de Ventas; en Compras solo se registra el recibido |
| Módulo de Proveedores separado | Usa `gestion-clientes` filtrado |
| Control presupuestal bloqueante | Fase 4 |
| Módulo completo de Activos Fijos | Fase 4 |

---

## 4. Reutilización visual, estructural y técnica

### 4.1 Qué se reutiliza

La reutilización no es copiar lógica. Es seguir los mismos **patrones de UX y estructura** del sistema:

| Patrón reutilizable | Origen | Uso en Compras |
|---|---|---|
| Formulario de 7-8 secciones | `documentos-comerciales` | Formulario de OC y CC (misma estructura: cabecera, proveedor, líneas, totales, condiciones, campos opcionales, adjuntos, notas) |
| Listado con filtros y columnas configurables | `documentos-comerciales` | Listas de OC, CC, CxP, Pagos |
| Drawer de detalle lateral | `shared/ui/Drawer` y `gestion-inventario` | Detalle de OC, CC, CxP |
| Badge de estado semántico | `estadosGRE.ts`, `EstadoDocumentoBadge.tsx` | Badge de estados separados por dimensión |
| Modal de acción con motivo | `ModalAnulacionGRE.tsx`, etc. | Modales de aprobación, rechazo, anulación |
| Menú contextual con acciones | Comprobantes, GRE | Acciones contextuales en tablas de Compras |
| Panel de totales (subtotal, IGV, total) | `documentos-comerciales` | Panel de totales en OC y CC |
| Selector de tercero (cliente/proveedor) | `gestion-clientes` | Selector de proveedor en formularios |
| Múltiples medios de pago | `gestion-cobranzas` | Registro de pago a proveedor |
| Cuotas/condiciones de crédito | `gestion-cobranzas/utils/installments.ts` | Cuotas de CxP — reutilizable sin cambios |
| Cálculo IGV/tributos | `documentoComercial.helpers.ts` → `calcularDesgloseTributos()` | Mismo cálculo para líneas de compra |
| Formato número de documento | `formatearNumeroDocumento()` | Mismo formato `SERIE-CORRELATIVO` |
| Namespace localStorage | `shared/tenant/index.ts` → `lsKey()` | Todas las claves de Compras |
| Exportación Excel | `shared/export/` | Exportar OC, CC, CxP |
| Toasts y confirmaciones | `shared/feedback/` → `useFeedback()` | Sin cambios |
| Motor de detracciones | `shared/catalogos-sunat/calculo-detraccion.ts` | Mismas reglas SUNAT en compras |
| Catálogo de medios de pago SUNAT | `shared/payments/paymentMeans.ts` | Sin cambios |

### 4.2 Qué NO se reutiliza directamente

| Elemento | Razón |
|---|---|
| `CartItem` | Tipo de línea acoplado a ventas y POS; crear `LineaCompra` propio |
| `DocumentoComercial` (el tipo completo) | Tiene campos de ventas (cotización, NV, OV); crear `OrdenCompra` y `ComprobanteCompra` propios |
| `DocumentosComercialesContext` | No mezclar con OC/CC; contextos separados obligatorios |
| `FormularioDocumentoComercial.tsx` | No copiar el componente; seguir su patrón de secciones con componentes nuevos |
| `InvoiceListTable.tsx` | Acoplado a comprobantes electrónicos SUNAT |
| `useComprobanteActions.tsx` | Lógica de emisión, OSE, stock de ventas — no aplica en compras |
| `CobranzasContext` | No mezclar; crear `ContextoPagosCompras` espejo separado |
| Componentes de `notas-ingreso/` | NI permanece en Inventario; Compras solo genera/vincula |

### 4.3 Helpers reutilizables directamente (sin cambios)

```
shared/tenant/index.ts           → lsKey() para namespace
shared/payments/paymentMeans.ts  → medios de pago SUNAT
shared/export/                   → exportación Excel
shared/feedback/                 → toasts y confirmaciones
shared/currency/currencyStorage.ts → estados de moneda
shared/catalogos-sunat/calculo-detraccion.ts → motor detracciones
gestion-cobranzas/utils/installments.ts      → cálculo de cuotas
gestion-cobranzas/utils/paymentMeans.ts      → medios de pago
control-caja/utils/calculations.ts           → resumen de caja
documentos-comerciales/utils/documentoComercial.helpers.ts → calcularDesgloseTributos()
```

---

## 5. Arquitectura propuesta del módulo Compras en español

```
features/compras/
│
├── componentes/
│   ├── formularios/
│   │   ├── FormularioOrdenCompra.tsx         OC — secciones: cabecera, proveedor, líneas,
│   │   │                                     totales, condiciones pago, campos opcionales,
│   │   │                                     adjuntos, notas
│   │   ├── FormularioComprobanteCompra.tsx   CC — referencia doc. proveedor, modalidad
│   │   │                                     inventario, líneas, totales, adjuntos
│   │   ├── SeccionProveedor.tsx              Selector + alta rápida + consulta RUC
│   │   ├── SeccionLineasCompra.tsx           Tabla de líneas con clasificación y cantidades
│   │   ├── SeccionTotalesCompra.tsx          Desglose subtotal/IGV/retención/total
│   │   ├── SeccionCondicionesPago.tsx        Contado/crédito/cuotas/fechas
│   │   └── SeccionCamposOpcionalesCompra.tsx Almacén, centro costo, presupuesto, OC interna
│   │
│   ├── listados/
│   │   ├── TablaOrdenesCompra.tsx            Lista OC con filtros y columnas configurables
│   │   ├── TablaComprobantesCompra.tsx       Lista CC
│   │   ├── TablaCuentasPorPagar.tsx          Lista CxP con estado de vencimiento
│   │   └── TablaPagosCompras.tsx             Lista de pagos
│   │
│   ├── detalle/
│   │   ├── DrawerDetalleOC.tsx               Panel lateral OC: datos, líneas, estados,
│   │   │                                     trazabilidad, acciones
│   │   ├── DrawerDetalleCC.tsx               Panel lateral CC: datos, NI vinculada, pago
│   │   └── DrawerDetalleCxP.tsx              Panel lateral CxP: cuotas, historial pagos
│   │
│   ├── modales/
│   │   ├── ModalAprobacionOC.tsx             Aprobar / Rechazar con comentario
│   │   ├── ModalAnularOC.tsx                 Anular con motivo
│   │   ├── ModalAnularCC.tsx                 Anular CC con motivo
│   │   ├── ModalGenerarCC.tsx                Generar CC desde OC (datos doc. proveedor)
│   │   ├── ModalRegistrarPagoCompra.tsx      Pago con múltiples medios
│   │   ├── ModalAnularPago.tsx               Anular pago con motivo
│   │   ├── ModalVincularNI.tsx               Seleccionar NI existente en Inventario
│   │   └── ModalEmisionExitosaCC.tsx         Confirmación post-registro
│   │
│   └── estadisticas/
│       └── ResumenCompras.tsx                KPIs: total compras período, CxP vencida,
│                                             pagos del mes, OC pendientes
│
├── paginas/
│   ├── ComprasPage.tsx                       Layout con tabs: OC / Comprobantes / CxP / Pagos
│   ├── FormularioOCPagina.tsx                Crear / Editar OC
│   └── FormularioCCPagina.tsx               Crear CC (vincular a OC o directa)
│
├── modelos/
│   ├── OrdenCompra.ts                        Tipo + constantes + estados
│   ├── ComprobanteCompra.ts                  Tipo + constantes + estados
│   ├── CuentaPorPagar.ts                     Tipo + constantes + estados
│   ├── PagoCompra.ts                         Tipo + constantes + estados
│   ├── LineaCompra.ts                        Tipo de línea con todos los campos
│   ├── TrazabilidadCompra.ts                 Tipo de trazabilidad
│   ├── AdjuntoCompra.ts                      Tipo de adjunto
│   └── index.ts                              Re-exports
│
├── servicios/
│   ├── servicioOrdenCompra.ts                Lógica de negocio OC (aprobar, generar CC,
│   │                                         calcular estados derivados)
│   ├── servicioComprobanteCompra.ts          Lógica CC (registrar, generar CxP, generar NI
│   │                                         o actualizar stock según modalidad)
│   ├── servicioCuentaPorPagar.ts             Lógica CxP (cuotas, saldo, estado vencimiento)
│   └── servicioPagoCompra.ts                 Lógica pagos (aplicar, anular, impacto caja)
│
├── repositorios/
│   ├── repositorioOrdenesCompra.ts           CRUD + persistencia OC en localStorage
│   ├── repositorioComprobantesCompra.ts      CRUD + persistencia CC
│   ├── repositorioCuentasPorPagar.ts         CRUD + persistencia CxP
│   └── repositorioPagosCompras.ts            CRUD + persistencia Pagos
│
├── contexto/
│   ├── ContextoOrdenesCompra.tsx             Estado + CRUD + eventos DOM
│   ├── ContextoComprobantesCompra.tsx        Estado + CRUD + eventos DOM
│   ├── ContextoCuentasPorPagar.tsx           Estado + saldos + CxP vencida
│   └── ContextoPagosCompras.tsx              Espejo de CobranzasContext — sin mezclar
│
├── utilidades/
│   ├── calcularTotalesCompra.ts              Wrapper de calcularDesgloseTributos para compras
│   ├── calcularCantidadesPendientes.ts       Derivar cantidadPendienteRecepcion, etc.
│   ├── calcularEstadosDerivadosOC.ts         Calcular estadoRecepcion, estadoFacturacion, etc.
│   ├── normalizarComprobante.ts              Normalizar datos del doc. del proveedor
│   └── formatearCompras.ts                  Formatear números, fechas, importes de compras
│
├── constantes/
│   ├── clavesAlmacenamientoCompras.ts        Todas las claves localStorage de Compras
│   ├── tiposDocumentoProveedor.ts            Catálogo: factura, boleta, recibo, etc.
│   ├── motivosAnulacionCompras.ts            Lista de motivos de anulación
│   └── permisosCompras.ts                    Constantes de nombres de permisos
│
└── mapeadores/
    ├── mapeadorOCaCC.ts                      Mapear campos de OC al nuevo CC
    ├── mapeadorCCaNI.ts                      Mapear líneas de CC a líneas de NI en Inventario
    └── mapeadorCCaCuentaPorPagar.ts          Generar CxP desde CC
```

### Responsabilidad de cada carpeta

| Carpeta | Responsabilidad |
|---|---|
| `componentes/` | Solo presentación + estado local de UI. Sin lógica de negocio. |
| `paginas/` | Orquestan componentes para una vista completa. Leen contexto. |
| `modelos/` | Tipos TypeScript e interfaces. Sin imports de React. Portables al backend. |
| `servicios/` | Lógica de negocio pura. Sin localStorage directo. Sin React. |
| `repositorios/` | Acceso a datos (localStorage en prototipo). Portables a HTTP en backend. |
| `contexto/` | Estado React compartido. Usan repositorios y servicios. |
| `utilidades/` | Funciones auxiliares puras. Sin efectos secundarios. |
| `constantes/` | Valores fijos: claves, catálogos, permisos. Sin lógica. |
| `mapeadores/` | Transforman un tipo en otro. Cruciales para transición a backend. |

---

## 6. Entidades funcionales y fases

| Entidad | Fase | Descripción breve |
|---|---|---|
| `OrdenCompra` | **1** | Documento de compra con aprobación básica |
| `ComprobanteCompra` | **1** | Registro del comprobante recibido del proveedor |
| `CuentaPorPagar` | **1** | Obligación financiera generada desde CC |
| `CuotaCuentaPorPagar` | **1** | Cuota individual en pago a crédito |
| `PagoCompra` | **1** | Pago registrado (múltiples medios, afecta caja) |
| `MedioPagoCompra` | **1** | Línea de medio de pago dentro de un pago |
| `LineaCompra` | **1** | Línea de OC o CC (producto/servicio/gasto/suministro/activo) |
| `AdjuntoCompra` | **1** | Sustento documental adjunto |
| `TrazabilidadCompra` | **1** | Cadena de referencias entre documentos |
| `RequerimientoCompra` | **2** | Solicitud interna pre-orden |
| `CotizacionProveedor` | **2** | Propuesta del proveedor (adjunto o registro) |
| `AplicacionPagoMultiple` | **2** | Distribución de un pago a varias CxP |
| `NotaCreditoCompra` | **3** | NC recibida del proveedor |
| `NotaDebitoCompra` | **3** | ND recibida del proveedor |
| `DevolucionProveedor` | **3** | Desde Inventario; vinculada a Compras |
| `ActivoFijoCompra` | **3** | Ficha de activo adquirido |
| Control presupuestal completo | **4** | Catálogo + control + bloqueo |

---

## 7. Campos mínimos y recomendados por entidad

### 7.A `RequerimientoCompra` — Fase 2 (campos previstos desde Fase 0)

```typescript
interface RequerimientoCompra {
  id: string;
  numero: string;
  fechaRegistro: string;           // ISO
  fechaRequerida?: string;
  solicitanteId: string;
  solicitanteNombre: string;
  areaSolicitante?: string;
  centroCosto?: string;
  presupuesto?: string;
  prioridad?: 'baja' | 'media' | 'alta' | 'urgente';
  motivo?: string;
  observaciones?: string;
  lineas: LineaCompra[];
  adjuntos?: AdjuntoCompra[];
  estadoDocumento: EstadoDocumentoRC;
  estadoAprobacion: EstadoAprobacion;
  ordenCompraDestinoId?: string;
  ordenCompraDestinoNumero?: string;
  historial: EventoHistorialCompras[];
}

type EstadoDocumentoRC = 'borrador' | 'registrado' | 'convertido' | 'cerrado' | 'anulado';
type EstadoAprobacion = 'no_requiere' | 'pendiente' | 'aprobada' | 'rechazada';
```

---

### 7.B `OrdenCompra` — Fase 1

```typescript
interface OrdenCompra {
  // Identidad
  id: string;
  tipoDocumento: 'orden_compra';
  serie: string;
  correlativo: string;
  numero: string;                          // serie-correlativo

  // Fechas
  fechaEmision: string;                    // ISO
  fechaVencimiento?: string;
  fechaEntregaEsperada?: string;

  // Proveedor
  proveedorId: string;
  proveedorTipoDocumento: string;          // RUC, DNI, CE
  proveedorNumeroDocumento: string;
  proveedorNombre: string;
  proveedorDireccionFacturacion?: string;
  proveedorDireccionEntrega?: string;
  proveedorContactoId?: string;

  // Comprador
  compradorId?: string;
  compradorNombre?: string;

  // Financiero
  moneda: 'PEN' | 'USD' | 'EUR';
  tipoCambio?: number;
  formaPago: 'contado' | 'credito';
  condicionesPago?: string;               // Texto libre o código de condición

  // Flujo de aprobación
  requiereAprobacion: boolean;
  aprobadoPor?: string;
  fechaAprobacion?: string;
  rechazadoPor?: string;
  fechaRechazo?: string;
  motivoRechazo?: string;

  // Contenido
  lineas: LineaCompra[];
  totales: TotalesCompra;

  // Opcionales
  centroCosto?: string;
  presupuesto?: string;
  observaciones?: string;
  observacionPresupuestal?: string;

  // Adjuntos y trazabilidad
  adjuntos?: AdjuntoCompra[];
  trazabilidad?: TrazabilidadCompra;

  // Auditoría
  historial: EventoHistorialCompras[];
  creadoPor?: string;
  actualizadoPor?: string;
  fechaCreacion: string;
  fechaActualizacion: string;

  // Estados (separados por dimensión — ver §8)
  estadoDocumento: EstadoDocumentoOC;
  estadoAprobacion: EstadoAprobacionOC;
  estadoRecepcion: EstadoRecepcionOC;
  estadoFacturacion: EstadoFacturacionOC;
  estadoInventario: EstadoInventarioOC;

  // Anulación
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  anuladoPor?: string;

  // Trazabilidad con Compras
  requerimientoCompraOrigenId?: string;      // Fase 2
  comprobantesCompraRelacionados?: string[]; // IDs de CC vinculados
  notasIngresoRelacionadas?: string[];       // IDs de NI en Inventario
}
```

---

### 7.C `ComprobanteCompra` — Fase 1

```typescript
interface ComprobanteCompra {
  // Identidad
  id: string;
  tipoRegistro: 'comprobante_compra';

  // Datos del documento del proveedor (lo que imprimió el proveedor)
  tipoComprobanteProveedor: string;         // '01' Factura, '03' Boleta, '12' Recibo, etc.
  serieProveedor: string;
  numeroProveedor: string;
  fechaEmisionProveedor: string;            // Fecha en el doc. del proveedor

  // Datos de registro interno
  fechaRegistro: string;                    // Cuándo se registró en SenciYo
  fechaVencimiento?: string;                // Para CxP a crédito
  serie?: string;                           // Numeración interna opcional
  correlativo?: string;

  // Proveedor
  proveedorId: string;
  proveedorTipoDocumento: string;
  proveedorNumeroDocumento: string;
  proveedorNombre: string;
  direccionProveedor?: string;

  // Comprador
  compradorId?: string;
  compradorNombre?: string;

  // Financiero
  moneda: 'PEN' | 'USD' | 'EUR';
  tipoCambio?: number;
  formaPago: 'contado' | 'credito';
  condicionesPago?: string;

  // Modalidad de afectación de inventario
  modalidadInventario: 'con_nota_ingreso' | 'ingreso_automatico' | 'no_afecta_inventario';

  // Contenido
  lineas: LineaCompra[];
  totales: TotalesCompra;

  // Tributación
  detraccion?: DatosDetraccionCompra;
  percepcion?: DatosPercepcionCompra;
  retencion?: DatosRetencionCompra;

  // Opcionales
  centroCosto?: string;
  presupuesto?: string;
  observaciones?: string;
  observacionPresupuestal?: string;

  // Trazabilidad
  ordenCompraOrigenId?: string;
  ordenCompraOrigenNumero?: string;
  cuentaPorPagarId?: string;
  pagosRelacionados?: string[];            // IDs de PagoCompra
  notasIngresoRelacionadas?: string[];     // IDs de NI en Inventario
  movimientosInventarioRelacionados?: string[];
  adjuntos: AdjuntoCompra[];
  trazabilidad?: TrazabilidadCompra;

  // Auditoría
  historial: EventoHistorialCompras[];
  creadoPor?: string;
  fechaCreacion: string;
  fechaActualizacion: string;

  // Estados (ver §8)
  estadoDocumento: EstadoDocumentoCC;
  estadoPago: EstadoPagoCC;
  estadoInventario: EstadoInventarioCC;

  // Anulación
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  anuladoPor?: string;
}
```

---

### 7.D `LineaCompra` — Fase 1

```typescript
interface LineaCompra {
  id: string;

  // Identificación del ítem
  productoId?: string;
  codigoProducto?: string;
  nombreProducto: string;
  descripcion?: string;

  // Clasificación funcional
  clasificacion: 'producto' | 'servicio' | 'gasto' | 'suministro' | 'activo_fijo';
  afectaInventario: boolean;              // Determina si mueve stock

  // Unidad de medida
  unidadMedida: string;                   // Nombre: "Unidad", "Kilogramo"
  unidadMedidaCodigo: string;             // SUNAT: NIU, KGM, LTR, etc.

  // Cantidades separadas (clave para evitar doble ingreso)
  cantidadSolicitada: number;             // Lo pedido en OC
  cantidadRecibida: number;               // Lo recibido físicamente
  cantidadFacturada: number;              // Lo en el comprobante del proveedor
  cantidadIngresadaInventario: number;    // Lo ingresado a stock
  cantidadPendienteRecepcion: number;     // cantidadSolicitada - cantidadRecibida
  cantidadPendienteFacturacion: number;   // cantidadRecibida - cantidadFacturada
  cantidadPendienteInventario: number;    // cantidadFacturada - cantidadIngresadaInventario

  // Financiero
  costoUnitario: number;
  descuentoUnitario?: number;
  descuentoTotal?: number;
  subtotal: number;
  tipoAfectacion: 'gravado' | 'exonerado' | 'inafecto';
  tasaIgv?: number;                       // 0.18, 0.10, 0
  igv: number;
  total: number;

  // Destino de inventario
  almacenDestinoId?: string;
  almacenDestinoNombre?: string;

  // Presupuestal
  centroCosto?: string;
  presupuesto?: string;

  // Activos fijos (clasificacion = 'activo_fijo')
  descripcionActivo?: string;
  responsableActivo?: string;
  ubicacionActivo?: string;

  observacion?: string;
}
```

---

### 7.E `TotalesCompra` — Fase 1

```typescript
interface TotalesCompra {
  subtotal: number;          // Base imponible gravada
  subtotalExonerado: number; // Base exonerada
  subtotalInafecto: number;  // Base inafecta
  descuentoTotal: number;    // Descuentos aplicados
  igv: number;
  retencion?: number;
  percepcion?: number;
  detraccion?: number;
  total: number;
  moneda: 'PEN' | 'USD' | 'EUR';
}
```

---

### 7.F `CuentaPorPagar` — Fase 1

```typescript
interface CuentaPorPagar {
  id: string;

  // Origen
  comprobanteCompraId: string;
  comprobanteCompraNumero: string;         // serieProveedor-numeroProveedor

  // Proveedor
  proveedorId: string;
  proveedorNombre: string;
  proveedorNumeroDocumento: string;

  // Financiero
  moneda: 'PEN' | 'USD' | 'EUR';
  tipoCambio?: number;
  total: number;
  totalPagado: number;
  saldoPendiente: number;

  // Condiciones
  formaPago: 'contado' | 'credito';
  fechaEmision: string;
  fechaVencimiento?: string;
  cuotas?: CuotaCuentaPorPagar[];

  // Estados (ver §8)
  estadoPago: EstadoPagoCxP;
  estadoVencimiento: EstadoVencimientoCxP;

  // Relaciones
  pagosRelacionados: string[];            // IDs de PagoCompra aplicados

  // Auditoría
  historial: EventoHistorialCompras[];
  observaciones?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}
```

---

### 7.G `CuotaCuentaPorPagar` — Fase 1

```typescript
interface CuotaCuentaPorPagar {
  id: string;
  numeroCuota: number;
  fechaVencimiento: string;
  montoCuota: number;
  montoPagado: number;
  saldoPendiente: number;
  diasCredito?: number;                  // Plazo acordado
  diasVencido?: number;                  // Calculado: hoy - fechaVencimiento (si > 0)
  estadoPago: 'pendiente' | 'parcial' | 'pagada';
  estadoVencimiento: 'vigente' | 'por_vencer' | 'vencida';
}
```

---

### 7.H `PagoCompra` — Fase 1

```typescript
interface PagoCompra {
  id: string;
  numeroPago: string;                    // Numeración interna

  // Fechas
  fechaPago: string;

  // Proveedor
  proveedorId: string;
  proveedorNombre: string;

  // Financiero
  moneda: 'PEN' | 'USD' | 'EUR';
  tipoCambio?: number;
  montoTotalPagado: number;

  // Medios de pago (múltiples en un mismo pago — Escenario A)
  mediosPago: MedioPagoCompra[];

  // CxP aplicadas (Fase 1: solo una; Fase 2: múltiples)
  cuentasPorPagarAplicadas: string[];   // IDs de CxP
  comprobantesCompraAplicados: string[]; // IDs de CC (referencia)

  // Caja/Banco
  cajaId?: string;
  cuentaBancariaId?: string;

  // Sustento del pago
  documentoSustentoTipo?: string;        // 'voucher_transferencia', 'carta_pago', etc.
  documentoSustentoSerie?: string;
  documentoSustentoNumero?: string;

  // Notas
  concepto?: string;
  observaciones?: string;
  adjuntos?: AdjuntoCompra[];

  // Estado
  estadoDocumento: 'registrado' | 'anulado';
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  anuladoPor?: string;

  // Auditoría
  historial: EventoHistorialCompras[];
  creadoPor?: string;
  fechaCreacion: string;
}
```

---

### 7.I `MedioPagoCompra` — Fase 1

```typescript
interface MedioPagoCompra {
  id: string;
  medioPagoCodigo: string;               // SUNAT: '008' Efectivo, '003' Transferencia, etc.
  medioPagoNombre: string;
  monto: number;
  moneda?: 'PEN' | 'USD' | 'EUR';
  tipoCambio?: number;
  cajaId?: string;                       // Si es efectivo
  cuentaBancariaId?: string;             // Si es transferencia/depósito
  referenciaOperacion?: string;          // Nro. de operación bancaria
  fechaOperacion?: string;
}
```

---

### 7.J `AdjuntoCompra` — Fase 1

```typescript
interface AdjuntoCompra {
  id: string;
  tipoAdjunto:
    | 'cotizacion_proveedor'
    | 'factura_proveedor'
    | 'guia_remision'
    | 'voucher_pago'
    | 'contrato'
    | 'orden_compra_firmada'
    | 'otro';
  nombreArchivo: string;
  tipoArchivo: string;                   // MIME type: 'application/pdf', 'image/jpeg'
  tamanio?: number;                      // Bytes
  urlLocal?: string;                     // Base64 o blob URL en prototipo
  fechaCarga: string;
  cargadoPor?: string;
  observacion?: string;
}
```

---

### 7.K `TrazabilidadCompra` — Fase 1

```typescript
interface TrazabilidadCompra {
  // Origen (Fase 2)
  requerimientoCompraOrigenId?: string;
  requerimientoCompraOrigenNumero?: string;

  // Orden de compra
  ordenCompraOrigenId?: string;
  ordenCompraOrigenNumero?: string;

  // Comprobante de compra
  comprobanteCompraId?: string;
  comprobanteCompraNumero?: string;

  // Cuenta por pagar
  cuentaPorPagarId?: string;

  // Pagos
  pagoCompraIds?: string[];

  // Inventario
  notaIngresoIds?: string[];
  movimientoInventarioIds?: string[];

  // Destino (si aplica a otro tipo futuro)
  documentoDestinoTipo?: string;
  documentoDestinoId?: string;
  documentoDestinoNumero?: string;
}
```

---

### 7.L `EventoHistorialCompras` — Fase 1

```typescript
interface EventoHistorialCompras {
  fecha: string;
  usuario?: string;
  accion: string;
  detalle?: string;
}
```

---

## 8. Estados separados por dimensión

Cada entidad tiene estados independientes por dimensión. Esto evita un campo `estado` gigante que mezcle aprobación, pago e inventario.

### Orden de Compra

| Dimensión | Campo | Valores posibles |
|---|---|---|
| Documento | `estadoDocumento` | `borrador` · `registrado` · `cerrado` · `anulado` |
| Aprobación | `estadoAprobacion` | `no_requiere` · `pendiente` · `aprobada` · `rechazada` |
| Recepción | `estadoRecepcion` | `pendiente` · `parcial` · `completa` · `no_aplica` |
| Facturación | `estadoFacturacion` | `pendiente` · `parcial` · `completa` · `no_aplica` |
| Inventario | `estadoInventario` | `pendiente` · `parcial` · `completo` · `automatico` · `no_aplica` |

**Cálculo de estados derivados de OC** (se derivan de `LineaCompra`):

```
estadoRecepcion:
  - Si todas las líneas con afectaInventario=true tienen cantidadRecibida >= cantidadSolicitada → 'completa'
  - Si alguna línea tiene cantidadRecibida > 0 pero < cantidadSolicitada → 'parcial'
  - Si ninguna línea tiene recepción → 'pendiente'
  - Si ninguna línea afecta inventario → 'no_aplica'

estadoFacturacion:
  - Si suma cantidadFacturada >= suma cantidadSolicitada → 'completa'
  - Si suma cantidadFacturada > 0 → 'parcial'
  - Si cantidadFacturada = 0 → 'pendiente'

estadoInventario:
  - Si modalidadInventario = 'ingreso_automatico' → 'automatico'
  - Si modalidadInventario = 'no_afecta_inventario' → 'no_aplica'
  - Si suma cantidadIngresadaInventario >= suma cantidadFacturada → 'completo'
  - Si suma cantidadIngresadaInventario > 0 → 'parcial'
  - Si cantidadIngresadaInventario = 0 → 'pendiente'
```

---

### Comprobante de Compra

| Dimensión | Campo | Valores posibles |
|---|---|---|
| Documento | `estadoDocumento` | `borrador` · `registrado` · `anulado` |
| Pago | `estadoPago` | `pendiente` · `parcial` · `pagado` |
| Inventario | `estadoInventario` | `pendiente` · `parcial` · `completo` · `automatico` · `no_aplica` |

---

### Cuenta por Pagar

| Dimensión | Campo | Valores posibles |
|---|---|---|
| Pago | `estadoPago` | `pendiente` · `parcial` · `pagada` · `anulada` |
| Vencimiento | `estadoVencimiento` | `vigente` · `por_vencer` · `vencida` |

`estadoVencimiento` es **calculado**, no persisted: se deriva comparando `fechaVencimiento` con la fecha actual. `por_vencer` aplica cuando faltan ≤ 7 días (configurable).

---

### Pago de Compra

| Dimensión | Campo | Valores posibles |
|---|---|---|
| Documento | `estadoDocumento` | `registrado` · `anulado` |

---

## 9. Acciones por entidad

### Orden de Compra

| Acción | Estado inicial requerido | Efecto |
|---|---|---|
| Crear borrador | — | `estadoDocumento = borrador` |
| Guardar como borrador | `borrador` | Persiste sin efectos |
| Registrar OC | `borrador` | `estadoDocumento = registrado`; si `requiereAprobacion = true` → `estadoAprobacion = pendiente` |
| Enviar a aprobación | `registrado` + `requiereAprobacion` | `estadoAprobacion = pendiente` |
| Aprobar | `estadoAprobacion = pendiente` | `estadoAprobacion = aprobada`, registra `aprobadoPor` y `fechaAprobacion` |
| Rechazar | `estadoAprobacion = pendiente` | `estadoAprobacion = rechazada`, registra motivo y fecha |
| Generar CC | `aprobada` (o `no_requiere`) | Crea `ComprobanteCompra` vinculada; `estadoFacturacion` avanza |
| Vincular NI existente | `aprobada` | Agrega NI a `notasIngresoRelacionadas`; actualiza `estadoInventario` |
| Cerrar | `registrado` o `aprobada` | `estadoDocumento = cerrado` (independiente de recepción completa) |
| Anular | Cualquiera excepto `anulado` o `cerrado` con CC | `estadoDocumento = anulado`, registra motivo |
| Duplicar | Cualquiera | Crea nueva OC en `borrador` copiando datos |
| Adjuntar archivo | Cualquiera excepto `anulado` | Agrega a `adjuntos[]` |
| Ver trazabilidad | Cualquiera | Vista de cadena documental |
| Exportar / Imprimir | `registrado` o superior | PDF o Excel de la OC |

---

### Comprobante de Compra

| Acción | Estado requerido | Efecto |
|---|---|---|
| Crear borrador | — | `estadoDocumento = borrador` |
| Registrar CC | `borrador` | `estadoDocumento = registrado`; genera CxP automáticamente; según `modalidadInventario` genera NI o actualiza stock o no hace nada |
| Vincular NI existente | `registrado` | Agrega NI; actualiza `estadoInventario` |
| Anular CC | `registrado` | `estadoDocumento = anulado`; revierte CxP; revierte stock si modalidad `ingreso_automatico` |
| Duplicar | Cualquiera | Nueva CC en `borrador` copiando datos proveedor (excepto serie/número) |
| Adjuntar archivo | Cualquiera excepto `anulado` | Agrega a `adjuntos[]` |
| Ver trazabilidad | Cualquiera | Vista de cadena |
| Exportar | `registrado` | Excel o PDF |

---

### Cuenta por Pagar

| Acción | Estado requerido | Efecto |
|---|---|---|
| Ver detalle | Cualquiera | Muestra cuotas, historial de pagos, saldo |
| Registrar pago | `estadoPago ≠ pagada` | Crea `PagoCompra`; reduce `saldoPendiente`; actualiza `totalPagado`; recalcula `estadoPago` y `estadoVencimiento` |
| Ver historial | Cualquiera | Listado de `EventoHistorialCompras` |

CxP se genera automáticamente al registrar CC. No se crea manualmente.

---

### Pago de Compra

| Acción | Estado requerido | Efecto |
|---|---|---|
| Registrar pago | CxP con saldo > 0 | Crea `PagoCompra`; reduce saldo CxP; registra `Movimiento Egreso` en Caja |
| Anular pago | `estadoDocumento = registrado` | `estadoDocumento = anulado`; revierte saldo CxP; revierte `Movimiento Egreso` en Caja |
| Ver detalle | Cualquiera | Muestra medios, adjuntos, historial |

---

## 10. Validaciones funcionales obligatorias

### Orden de Compra

- Proveedor obligatorio.
- Al menos una línea.
- Cada línea: `cantidadSolicitada > 0` y `costoUnitario >= 0`.
- Moneda obligatoria.
- Forma de pago obligatoria.
- Si `requiereAprobacion = true`: no puede generar CC mientras `estadoAprobacion ≠ aprobada`.
- No se puede editar si `estadoDocumento = cerrado` o `anulado`.
- No se puede anular si tiene CC registradas sin reversa definida (bloqueo o advertencia).
- Si `formaPago = credito` y `condicionesPago` no define cuotas: advertir.

### Comprobante de Compra

- Proveedor obligatorio.
- `tipoComprobanteProveedor` obligatorio.
- `serieProveedor` y `numeroProveedor` obligatorios.
- `fechaEmisionProveedor` obligatoria y no futura.
- Si `formaPago = credito`: `fechaVencimiento` obligatoria.
- No se puede registrar un duplicado exacto: mismo proveedor + tipo + serie + número (deduplica por RUC + serie + número del proveedor).
- Al menos una línea.
- Si alguna línea tiene `afectaInventario = true` y `modalidadInventario ≠ no_afecta_inventario`: `almacenDestinoId` obligatorio en esa línea.
- Si `modalidadInventario = ingreso_automatico`: verificar que el almacén destino esté activo antes de registrar.
- Control de doble ingreso: `cantidadIngresadaInventario` no puede superar `cantidadFacturada` por línea.

### Cuenta por Pagar

- Se genera automáticamente al registrar CC — no creación manual.
- `saldoPendiente` inicial = `totales.total`.
- Si tiene cuotas: suma de `montoCuota` debe igualar `totales.total` (tolerancia ±0.01).
- `saldoPendiente` no puede ser negativo.

### Pago de Compra

- `montoTotalPagado > 0`.
- `montoTotalPagado` no puede superar `saldoPendiente` de la CxP (bloqueo o advertencia configurable).
- `sum(mediosPago[].monto) = montoTotalPagado` (tolerancia ±0.01).
- Si algún medio es efectivo (`medioPagoCodigo = '008'`): `cajaId` obligatorio.
- Si algún medio es transferencia/depósito (`medioPagoCodigo = '003'` o `'001'`): `cuentaBancariaId` recomendado.
- Anular pago: revertir saldo en CxP y `Movimiento Egreso` en Caja.

---

## 11. Integración con Inventario

### Regla fundamental

**La Nota de Ingreso vive en `gestion-inventario/`. No se mueve a Compras.** Compras interactúa con Inventario a través de tres vías:

1. **Generar una NI nueva** desde CC — llamando a `servicioNIEnInventario.generar()` con los datos de las líneas de compra.
2. **Vincular una NI existente** — el usuario selecciona una NI ya registrada en Inventario y la asocia a la CC mediante `notasIngresoRelacionadas`.
3. **Ingreso automático de stock** — Compras registra directamente el `MovimientoStock` tipo `ENTRADA` con motivo `COMPRA` sin generar un documento NI visible.

### Reglas de prevención de doble ingreso

El campo `cantidadIngresadaInventario` en `LineaCompra` es la fuente de verdad para saber cuánto ya entró a stock:

```
cantidadPendienteInventario = cantidadFacturada - cantidadIngresadaInventario
```

Cuando Compras genera o vincula una NI:
- Actualiza `cantidadIngresadaInventario` en las líneas correspondientes de la CC.
- Recalcula `cantidadPendienteInventario`.
- Actualiza `estadoInventario` de CC y OC.

No se permite generar un segundo ingreso si `cantidadPendienteInventario = 0`.

### Campos de `NotaIngreso` relevantes para Compras

Desde Inventario, `NotaIngreso` ya tiene:
- `proveedorId` — obligatorio para `tipoIngreso = '02'` (Compra)
- `tipoIngreso = '02'` → `motivo = 'COMPRA'`
- `almacenDestinoId`
- `lineas[].productoId`, `lineas[].cantidad`, `lineas[].costoUnitario`

El campo **opcional a agregar en Inventario** (sin urgencia, Fase 2):
- `comprobanteCompraOrigenId?: string` — para trazabilidad bidireccional completa.

---

## 12. Modalidades de afectación de stock

El campo `modalidadInventario` en `ComprobanteCompra` determina el flujo de stock:

### Modalidad A — `con_nota_ingreso`

```
Registrar CC
  → Compras genera NI en borrador en Inventario (mapeador: mapeadorCCaNI.ts)
  → Usuario revisa y genera la NI en Inventario (UI de Inventario)
  → NI generada → MovimientoStock ENTRADA
  → Compras recibe notificación / vincula NI por ID
  → Actualiza cantidadIngresadaInventario en LineaCompra
  → Actualiza estadoInventario en CC y OC
```

### Modalidad B — `ingreso_automatico`

```
Registrar CC
  → servicioComprobanteCompra.ts llama directamente a inventory.service.ts
  → Crea MovimientoStock ENTRADA (motivo: COMPRA) por cada línea con afectaInventario=true
  → NO genera NI visible para el usuario
  → Actualiza stock en Product.stockPorAlmacen[almacenDestinoId]
  → Actualiza cantidadIngresadaInventario en LineaCompra
  → estadoInventario = 'automatico'
```

### Modalidad C — `no_afecta_inventario`

```
Registrar CC (solo servicios, gastos o suministros sin control de stock)
  → No genera NI
  → No mueve stock
  → estadoInventario = 'no_aplica'
```

### Configuración de modalidad por defecto

La modalidad puede configurarse:
- A nivel de empresa (en `Configuración → Compras`)
- A nivel de orden/comprobante (el usuario puede cambiarla al registrar)
- A nivel de línea (campo `afectaInventario` en `LineaCompra`)

---

## 13. Integración con Caja/Bancos

### Flujo al registrar un pago

```
ModalRegistrarPagoCompra
  → servicioP pagoCompra.registrar(pagoCompra)
  │   → repositorioPagosCompras.guardar(pago)
  │   → servicioCuentaPorPagar.aplicarPago(cxpId, monto)
  │   → Para cada línea de medio de pago:
  │       Si medioPagoCodigo = '008' (Efectivo):
  │         CajaContext.agregarMovimiento({
  │           tipo: 'Egreso',
  │           concepto: 'Pago a proveedor - ' + proveedorNombre,
  │           medioPago: medioPagoCodigo,
  │           monto: montoMedio,
  │           referencia: numeroPago,
  │           comprobante: comprobanteCompraNumero,
  │         })
  │       Si medioPagoCodigo = '003' o '001' (Transferencia / Depósito):
  │         Registrar en cuenta bancaria (Fase 2)
  └   → Emitir evento DOM 'compras_pago_registrado'
```

### Anulación de pago

```
servicioP pagoCompra.anular(pagoId, motivo)
  → revertir saldo en CxP
  → Para cada movimiento de caja generado por ese pago:
      CajaContext.revertirMovimiento(movimientoId)
      // O crear Movimiento de tipo 'Ingreso' que compense el Egreso
  → estadoDocumento = 'anulado'
```

### No modificar `control-caja/`

La integración es **unidireccional**: Compras llama a funciones de Caja. No se modifica la lógica de Caja. El módulo de Caja ya soporta `tipo: 'Egreso'` nativamente.

---

## 14. Integración con Cuentas por Pagar y Pagos

### Generación automática de CxP al registrar CC

```
servicioComprobanteCompra.registrar(cc)
  → Persiste CC
  → servicioCuentaPorPagar.generarDesdCC(cc)
      → Crea CuentaPorPagar con:
          comprobanteCompraId = cc.id
          total = cc.totales.total
          totalPagado = 0
          saldoPendiente = cc.totales.total
          formaPago = cc.formaPago
          fechaVencimiento = cc.fechaVencimiento
          estadoPago = 'pendiente'
          estadoVencimiento = calcular(fechaVencimiento)
          cuotas = si crédito: mapeadorCCaCuentaPorPagar.generarCuotas(cc)
      → Persiste CxP
  → Vincula: cc.cuentaPorPagarId = nuevaCxP.id
```

### Recálculo de estados al registrar pago

```
servicioCuentaPorPagar.aplicarPago(cxpId, montoAplicado)
  → totalPagado += montoAplicado
  → saldoPendiente = total - totalPagado
  → estadoPago:
      Si saldoPendiente <= 0.01: 'pagada'
      Si totalPagado > 0: 'parcial'
      Else: 'pendiente'
  → Si tiene cuotas: actualizar cuotas con installments.ts (reutilizable de Cobranzas)
```

---

## 15. Integración con Clientes/Proveedores

### Uso del módulo existente

`gestion-clientes/` ya soporta `type: 'Proveedor'` y `'Cliente-Proveedor'`. No se modifica el módulo. Compras consume sus hooks con filtros:

```typescript
// En SeccionProveedor.tsx:
const { clientes: proveedores } = useClientes({
  filtros: { tipo: ['Proveedor', 'Cliente-Proveedor'] }
});
```

### Alta rápida de proveedor desde Compras

`SeccionProveedor.tsx` debe incluir un botón "Nuevo proveedor" que abre el formulario de alta de `gestion-clientes` con `type = 'Proveedor'` pre-seleccionado. El formulario vive en `gestion-clientes/`; Compras no lo duplica.

### Consulta RUC/DNI

El patrón de consulta a SUNAT ya existe en `gestion-clientes/`. Reutilizar el hook existente desde `SeccionProveedor.tsx`.

### Datos del proveedor en Compras

Al seleccionar un proveedor en OC o CC, se desnormalizan los campos relevantes en el documento:

```
proveedorId, proveedorTipoDocumento, proveedorNumeroDocumento,
proveedorNombre, proveedorDireccionFacturacion
```

Esto garantiza que el documento histórico no cambie si se edita el proveedor más adelante.

### Renombramiento visual del sidebar

El label "Clientes" en `SideNav.tsx` puede cambiarse a "Clientes y Proveedores" como cambio visual menor. No modifica el módulo ni sus datos. Se recomienda hacer esto en Fase 1 como parte de la limpieza previa al desarrollo.

---

## 16. Productos, servicios, gastos, suministros y activos fijos

### Campo `clasificacion` en `LineaCompra`

| Valor | Descripción | `afectaInventario` por defecto | Mueve stock |
|---|---|---|---|
| `producto` | Bien inventariable para reventa o producción | `true` | Sí |
| `servicio` | Servicio recibido del proveedor | `false` | No |
| `gasto` | Gasto operativo (no inventariable) | `false` | No |
| `suministro` | Insumo de oficina u operativo | Configurable | Opcional |
| `activo_fijo` | Bien de capital | `false` (en Fase 1) | No en Fase 1 |

El campo `afectaInventario` puede ser editado por el usuario independientemente de la clasificación, para cubrir casos especiales (ej: suministro que sí se quiere controlar en stock).

### Campo `tipoExistencia` de `Product`

El modelo `Product` ya tiene `tipoExistencia` con catálogo SUNAT:
`MERCADERIAS`, `PRODUCTOS_TERMINADOS`, `MATERIAS_PRIMAS`, `ENVASES`, `SERVICIOS`, etc.

Al buscar un producto en `SeccionLineasCompra.tsx`, el `tipoExistencia` puede sugerir la `clasificacion` automáticamente:

```
MERCADERIAS → clasificacion = 'producto', afectaInventario = true
SERVICIOS   → clasificacion = 'servicio', afectaInventario = false
MATERIAS_PRIMAS → clasificacion = 'producto', afectaInventario = true
```

El usuario puede cambiar la sugerencia manualmente.

### Campo `precioCompra` de `Product`

`Product.precioCompra` existe hoy. Al agregar un producto en líneas de compra, `costoUnitario` se pre-rellena con `precioCompra` del catálogo. El usuario puede modificarlo.

---

## 17. Control presupuestal y centros de costo

### Fase 1 — Solo campos informativos

```typescript
// En OrdenCompra, ComprobanteCompra y LineaCompra:
centroCosto?: string;          // Texto libre
presupuesto?: string;          // Texto libre
observacionPresupuestal?: string;
```

No hay catálogo, no hay validación, no hay bloqueo. Los campos son opcionales y se usan para referencia o exportación a Excel.

### Fase 2 — Catálogo configurable

- Crear `CatalogoCentrosCosto` en Configuración.
- Selector de centro de costo en formularios de Compras.
- Filtro por centro de costo en listados.
- Reporte de gastos agrupado por centro de costo.

### Fase 3 — Control informativo

- `PresupuestoAnual` por centro de costo y período.
- Campo calculado: `montoComprometido` (suma de OC/CC activas por centro/período).
- Vista de: presupuesto asignado vs. comprometido vs. ejecutado.
- Alerta visual si se supera el presupuesto (no bloquea).

### Fase 4 — Control bloqueante

- Validación al registrar OC/CC: no permite avanzar si supera presupuesto.
- Flujo de excepción: solicitar aprobación especial por exceso de presupuesto.
- Aprobación por rol (gerencia, finanzas).

---

## 18. Tributación de compras

El modelo de Compras debe contemplar los siguientes conceptos tributarios. No todos deben implementarse visualmente en Fase 1, pero el modelo (`ComprobanteCompra`, `LineaCompra`, `TotalesCompra`) debe tener campos preparados:

| Concepto | Campo | Fase |
|---|---|---|
| Base imponible gravada | `subtotal` | 1 |
| Base exonerada | `subtotalExonerado` | 1 |
| Base inafecta | `subtotalInafecto` | 1 |
| IGV (18% estándar) | `igv`, `tipoAfectacion = 'gravado'` | 1 |
| IGV 10% | `tasaIgv = 0.10` | 1 |
| Exonerado / Inafecto | `tipoAfectacion = 'exonerado' / 'inafecto'` | 1 |
| Descuentos por línea y globales | `descuentoUnitario`, `descuentoTotal` | 1 |
| Tipo de comprobante proveedor | `tipoComprobanteProveedor` (código SUNAT) | 1 |
| Serie y número del proveedor | `serieProveedor`, `numeroProveedor` | 1 |
| Detracción | `DatosDetraccionCompra` en CC | 1 — preparado en modelo |
| Percepción | `DatosPercepcionCompra` en CC | 1 — preparado en modelo |
| Retención | `DatosRetencionCompra` en CC | 1 — preparado en modelo |
| Moneda y tipo de cambio | `moneda`, `tipoCambio` | 1 |

```typescript
interface DatosDetraccionCompra {
  codigoCatalogo54: string;
  descripcion: string;
  porcentaje: number;
  montoBase: number;
  montoDetraccion: number;
  cuentaDeposito?: string;
  fechaDeposito?: string;
}

interface DatosPercepcionCompra {
  tasaPercepcion: number;
  montoPercepcion: number;
  totalConPercepcion: number;
}

interface DatosRetencionCompra {
  tasaRetencion: number;
  montoRetencion: number;
  netoAPagar: number;
}
```

El motor de cálculo de detracción (`shared/catalogos-sunat/calculo-detraccion.ts`) es reutilizable directamente para compras.

---

## 19. Trazabilidad documental

### Cadena completa del ciclo de compra

```
RequerimientoCompra (Fase 2)
  └─ ordenCompraOrigenId → OrdenCompra
                             └─ comprobanteCompraOrigenId → ComprobanteCompra
                                                              └─ cuentaPorPagarId → CuentaPorPagar
                                                              └─ notaIngresoIds → NotaIngreso (Inventario)
                                                              └─ movimientosInventarioRelacionados → MovimientoStock
                             └─ pagoCompraIds → PagoCompra → MovimientoCaja (Egreso)
```

### Implementación de trazabilidad

- Cada documento tiene un campo `trazabilidad: TrazabilidadCompra` que registra los IDs de todos los documentos relacionados en la cadena.
- Al generar un documento hijo (CC desde OC), el mapeador `mapeadorOCaCC.ts` copia los IDs relevantes y actualiza ambos documentos.
- Se emite evento DOM `'compras_changed'` tras cada operación que afecte trazabilidad, para que los contextos se resincroniccen.
- El `DrawerDetalleOC.tsx` muestra la cadena de trazabilidad completa de forma visual.

---

## 20. Adjuntos y sustentos

### Tipos de adjunto en `AdjuntoCompra`

| Tipo | Uso habitual |
|---|---|
| `factura_proveedor` | Imagen/PDF del comprobante físico recibido |
| `cotizacion_proveedor` | Propuesta económica del proveedor (Fase 2) |
| `guia_remision` | GRE del proveedor que acompaña la mercadería |
| `voucher_pago` | Constancia de transferencia bancaria |
| `contrato` | Contrato de suministro o servicio |
| `orden_compra_firmada` | OC firmada y devuelta por el proveedor |
| `otro` | Cualquier otro documento de sustento |

### Almacenamiento en prototipo

En el prototipo funcional, los adjuntos se almacenan como `base64` o `blob URL` en el campo `urlLocal`. En el backend oficial, esto se reemplazará por una URL pública (S3, Supabase Storage, etc.). El campo `urlLocal` debe renombrarse a `urlArchivo` cuando se migre al backend para que el contrato sea limpio.

---

## 21. Preparación para backend futuro

### Principio de separabilidad

Aunque el prototipo use localStorage, la estructura debe ser portable. Para eso:

1. **Los repositorios** (`repositorioOrdenesCompra.ts`, etc.) son la única capa que toca localStorage. Al migrar al backend, solo se reescriben los repositorios — la lógica de servicios y la UI no cambian.
2. **Los mapeadores** (`mapeadorOCaCC.ts`, `mapeadorCCaNI.ts`, etc.) transforman tipos entre entidades de la misma forma que los DTOs en el backend.
3. **Los modelos** en `modelos/` son interfaces puras sin imports de React — portables directamente.
4. **Los servicios** (`servicioOrdenCompra.ts`, etc.) solo conocen modelos y repositorios — sin lógica de almacenamiento.

### Entidades del contrato backend

| Entidad frontend | Tabla backend esperada |
|---|---|
| `OrdenCompra` | `purchase_orders` |
| `ComprobanteCompra` | `purchase_invoices` |
| `LineaCompra` | `purchase_invoice_lines` / `purchase_order_lines` |
| `CuentaPorPagar` | `accounts_payable` |
| `CuotaCuentaPorPagar` | `payable_installments` |
| `PagoCompra` | `purchase_payments` |
| `MedioPagoCompra` | `purchase_payment_lines` |
| `AdjuntoCompra` | `purchase_attachments` |
| `TrazabilidadCompra` | Campo JSONB en la entidad principal o tabla `purchase_traceability` |
| `EventoHistorialCompras` | `purchase_history_events` |
| `RequerimientoCompra` | `purchase_requisitions` (Fase 2) |

### Endpoints referenciales esperados

```
# Órdenes de Compra
GET    /api/compras/ordenes                           Listar con filtros y paginación
POST   /api/compras/ordenes                           Crear OC
GET    /api/compras/ordenes/:id                       Obtener por ID
PUT    /api/compras/ordenes/:id                       Actualizar (solo borrador)
POST   /api/compras/ordenes/:id/registrar             Cambiar de borrador a registrado
POST   /api/compras/ordenes/:id/enviar-aprobacion     Enviar al flujo de aprobación
POST   /api/compras/ordenes/:id/aprobar               Aprobar (requiere permiso)
POST   /api/compras/ordenes/:id/rechazar              Rechazar con motivo
POST   /api/compras/ordenes/:id/cerrar                Cerrar OC
POST   /api/compras/ordenes/:id/anular                Anular con motivo
POST   /api/compras/ordenes/:id/duplicar              Crear copia en borrador
GET    /api/compras/ordenes/:id/trazabilidad          Ver cadena documental

# Comprobantes de Compra
GET    /api/compras/comprobantes                      Listar
POST   /api/compras/comprobantes                      Registrar CC recibido del proveedor
GET    /api/compras/comprobantes/:id                  Obtener por ID
POST   /api/compras/comprobantes/:id/anular           Anular con motivo
POST   /api/compras/comprobantes/:id/generar-nota-ingreso  Generar NI en Inventario
POST   /api/compras/comprobantes/:id/vincular-nota-ingreso Vincular NI existente
GET    /api/compras/comprobantes/:id/trazabilidad     Ver cadena

# Cuentas por Pagar
GET    /api/compras/cuentas-por-pagar                 Listar (con filtros por estado, vencimiento, proveedor)
GET    /api/compras/cuentas-por-pagar/:id             Obtener con cuotas y pagos
GET    /api/compras/cuentas-por-pagar/vencidas        Listar vencidas (alerta)
GET    /api/compras/cuentas-por-pagar/por-vencer      Listar próximas a vencer

# Pagos
GET    /api/compras/pagos                             Listar
POST   /api/compras/pagos                             Registrar pago (múltiples medios)
GET    /api/compras/pagos/:id                         Obtener
POST   /api/compras/pagos/:id/anular                  Anular con motivo

# Requerimientos (Fase 2)
GET    /api/compras/requerimientos
POST   /api/compras/requerimientos
PUT    /api/compras/requerimientos/:id
POST   /api/compras/requerimientos/:id/enviar-aprobacion
POST   /api/compras/requerimientos/:id/aprobar
POST   /api/compras/requerimientos/:id/generar-orden

# Adjuntos
POST   /api/compras/adjuntos/upload                   Subir archivo (multipart)
DELETE /api/compras/adjuntos/:id                      Eliminar adjunto
```

### Claves de localStorage en el prototipo

Todas las claves deben usar `lsKey()` para namespace de empresa:

```typescript
// En constantes/clavesAlmacenamientoCompras.ts:
export const CLAVES_COMPRAS = {
  ORDENES_COMPRA: 'compras_ordenes_compra_v1',
  COMPROBANTES_COMPRA: 'compras_comprobantes_compra_v1',
  CUENTAS_POR_PAGAR: 'compras_cuentas_por_pagar_v1',
  PAGOS: 'compras_pagos_v1',
  COLUMNAS_OC: 'compras_oc_columnas_v1',
  COLUMNAS_CC: 'compras_cc_columnas_v1',
  COLUMNAS_CPP: 'compras_cxp_columnas_v1',
  COLUMNAS_PAGOS: 'compras_pagos_columnas_v1',
} as const;

// Uso: lsKey(CLAVES_COMPRAS.ORDENES_COMPRA, empresaId)
```

---

## 22. Riesgos técnicos actualizados

| # | Riesgo | Evidencia | Impacto | Mitigación |
|---|---|---|---|---|
| **R-01** | Reutilizar `CartItem` directamente en `LineaCompra` | `CartItem` acoplado a POS, descuentos de venta, `igvType` de venta | **Alto** | Crear `LineaCompra` propia con misma estructura pero campos propios |
| **R-02** | Copiar `FormularioDocumentoComercial.tsx` sin abstraer secciones | Reutilizar el componente entero genera acoplamiento imposible de mantener | **Alto** | Seguir el patrón de secciones, crear componentes nuevos en `componentes/formularios/` |
| **R-03** | Usar `DocumentosComercialesContext` para OC | Mezcla ventas con compras, estados colisionan | **Alto** | `ContextoOrdenesCompra.tsx` separado e independiente |
| **R-04** | Estado único `estado` en lugar de estados por dimensión | Ya demostrado en ventas: genera migraciones de datos al agregar nuevas dimensiones | **Alto** | Implementar desde Fase 0 los 5 campos de estado separados |
| **R-05** | No implementar `cantidadRecibida / cantidadIngresadaInventario` en Fase 1 | Sin estos campos, se pierde control de recepciones parciales y doble ingreso | **Alto** | Incluir todos los campos de cantidad en `LineaCompra` desde el inicio |
| **R-06** | No preparar `modalidadInventario` desde el inicio | Si se agrega después, requiere migración de datos de CC ya registradas | **Medio** | Campo obligatorio en `ComprobanteCompra` desde Fase 1 |
| **R-07** | `features/compras/pages/` (en inglés) ya existe como stub | Si se crea estructura nueva en español (`paginas/`), hay dos carpetas para lo mismo | **Bajo** | En Fase 0 renombrar `pages/` a `paginas/` o eliminar el stub |
| **R-08** | `gestion-clientes/models/compra.types.ts` causa confusión de naming | Archivo con historial de compras del cliente nombrado igual que el módulo | **Bajo** | Renombrar en P1 (verificar imports antes de ejecutar) |
| **R-09** | Tipos de documento `'orden_compra'` y `'comprobante_compra'` no registrados en el catálogo `DocumentType` de Series | Sin esto, la numeración no funciona | **Medio** | Tarea P0: agregar al catálogo en `configuracion-sistema/` |
| **R-10** | No definir `permisosCompras.*` en el sistema de roles antes de registrar rutas | Las rutas no tendrán guards funcionales | **Medio** | Tarea P0: agregar permisos en `tiposRolesPermisos.ts` |
| **R-11** | Duplicar la lógica de `installments.ts` para cuotas de CxP | Mismo motor de cuotas ya existe en Cobranzas | **Bajo** | Reutilizar `gestion-cobranzas/utils/installments.ts` directamente |
| **R-12** | Cálculo de `cantidadPendiente*` dentro del componente en lugar del servicio | Lógica en UI = difícil de testear y reutilizar | **Bajo** | Lógica derivada en `utilidades/calcularCantidadesPendientes.ts` |

---

## 23. Recomendaciones P0, P1 y P2 actualizadas

### P0 — Obligatorio antes de empezar (Fase 0)

1. **Agregar tipos de documento de Compras** al catálogo `DocumentType` en `configuracion-sistema/modelos/Series.ts`: `'orden_compra'` y `'comprobante_compra'`.

2. **Definir permisos de Compras** en `configuracion-sistema/roles/tiposRolesPermisos.ts`:
   `compras.ordenes.ver`, `compras.ordenes.crear`, `compras.ordenes.editar`, `compras.ordenes.aprobar`, `compras.ordenes.anular`, `compras.comprobantes.registrar`, `compras.comprobantes.anular`, `compras.cuentas_por_pagar.ver`, `compras.pagos.registrar`, `compras.pagos.anular`.

3. **Registrar rutas de Compras** en `privateRoutes.tsx`:
   `/compras`, `/compras/ordenes/nuevo`, `/compras/ordenes/editar/:id`, `/compras/comprobantes/nuevo`, `/compras/comprobantes/nuevo/desde-oc/:ocId`.

4. **Agregar ítem en `SideNav.tsx`** con permiso `compras.ordenes.ver`.

5. **Crear `compras/modelos/LineaCompra.ts`** con todos los campos de cantidad separados.

6. **Crear `compras/constantes/clavesAlmacenamientoCompras.ts`** con claves definidas y documentadas.

7. **Eliminar o renombrar el stub `features/compras/pages/`** para no tener estructura duplicada.

8. **Verificar `npm run lint` + `npm run build` → 0 errores** después de cada cambio de Fase 0.

---

### P1 — Recomendable para implementar limpio

9. **Crear la estructura de carpetas en español** completa (vacía pero organizada) antes de codificar la primera pantalla.

10. **Crear `compras/modelos/OrdenCompra.ts`** con todos los tipos e interfaces definidos (sin implementación funcional).

11. **Crear `compras/constantes/permisosCompras.ts`** con constantes de nombres de permisos para evitar strings sueltos.

12. **Crear `compras/mapeadores/`** con esqueletos vacíos de `mapeadorOCaCC.ts` y `mapeadorCCaNI.ts`.

13. **Renombrar `gestion-clientes/models/compra.types.ts`** a `historialCompras.types.ts` — verificar todos los imports antes de ejecutar.

14. **Cambiar label "Clientes"** a "Clientes y Proveedores" en `SideNav.tsx`.

---

### P2 — Mejora futura (no bloquea el desarrollo)

15. Agregar `comprobanteCompraOrigenId` en el modelo `NotaIngreso` de Inventario para trazabilidad bidireccional.

16. Evaluar extraer componente `TablaDocumentos` genérica en `shared/ui/` para evitar la 4ta reimplementación de tabla con filtros.

17. Implementar evento DOM `'compras_changed'` con patrón equivalente a `'documentos_comerciales_changed'`.

18. Documentar en código (comentario breve en archivos clave de Compras) qué función se conectará al backend en cada repositorio.

---

## 24. Fases de desarrollo actualizadas

### Fase 0 — Preparación técnica y documental

**Objetivo:** Dejar el proyecto listo para empezar a implementar sin improvisación.

**Entregables:**
- Documento de auditoría actualizado (este archivo).
- Permisos de Compras registrados.
- Rutas registradas.
- Tipos de documento de Compras en catálogo Series.
- Estructura de carpetas en español creada (con archivos vacíos o con tipos base).
- Modelos: `OrdenCompra.ts`, `ComprobanteCompra.ts`, `CuentaPorPagar.ts`, `PagoCompra.ts`, `LineaCompra.ts`, `TrazabilidadCompra.ts`, `AdjuntoCompra.ts`.
- Constantes: claves localStorage, permisos, motivos, tipos de doc. proveedor.
- Repositorios: esqueletos con firmas de funciones.
- Servicios: esqueletos con firmas de funciones.
- Mapeadores: esqueletos.
- Sin flujo funcional completo.

**Riesgos:** Bajo. Solo estructura.
**Validación:** `npm run lint` + `npm run build` → 0 errores.

---

### Fase 1 — Compras base funcional

**Objetivo:** Flujo completo y funcional de OC → CC → CxP → Pago → Inventario.

**Entregables:**
- Órdenes de compra: crear, editar borrador, registrar, enviar a aprobación, aprobar, rechazar, anular, duplicar, cerrar.
- Aprobación básica de OC: flujo de aprobación con usuario y fecha.
- Comprobantes de compra: crear borrador, registrar (genera CxP), anular.
- Tres modalidades de inventario: `con_nota_ingreso`, `ingreso_automatico`, `no_afecta_inventario`.
- Generación automática de NI en Inventario (mapeador CC → NI).
- Vinculación de NI existente desde Inventario.
- Cuentas por pagar: generación automática, visualización de saldo y cuotas.
- Pagos: registro con múltiples medios, anulación, impacto en Caja como Egreso.
- Proveedores: selector filtrado, alta rápida desde formulario.
- Adjuntos: carga y visualización en OC, CC y Pago.
- Trazabilidad: cadena OC → CC → CxP → Pago → NI.
- Estados separados por dimensión.
- Listados con filtros, columnas configurables y exportación básica.
- Drawers de detalle para OC, CC, CxP.

**Archivos probables:**
Toda la estructura `features/compras/` según §5.

**Integraciones:**
- `gestion-clientes/` → selector de proveedor.
- `gestion-inventario/services/notaIngreso.service.ts` → generación de NI.
- `control-caja/context/CajaContext.tsx` → Movimiento Egreso.
- `shared/tenant/index.ts` → lsKey().
- `gestion-cobranzas/utils/installments.ts` → cuotas de CxP.

**Riesgos:** Medio. Cuidado con mezcla de contextos y doble ingreso de stock.
**Validación:** Flujo completo OC → CC → CxP → Pago sin errores. Stock actualizado. Caja refleja egresos. `npm run lint` + `npm run build` → 0 errores.

---

### Fase 2 — Compras avanzadas

**Objetivo:** Completar integraciones avanzadas y mejorar la operativa diaria.

**Entregables:**
- Requerimientos de compra (solicitante, área, aprobación).
- Conversión Requerimiento → OC.
- Cotizaciones de proveedores como adjunto comparativo.
- Pago aplicado a varias CxP simultáneamente (`AplicacionPagoMultiple`).
- Catálogo configurable de centros de costo.
- Filtros avanzados en todos los listados.
- Exportación completa a Excel (OC, CC, CxP, Pagos).
- Indicadores básicos de compras (total período, CxP vencida, pagos del mes).
- Integración `indicadores-negocio/` para indicadores de compras.

---

### Fase 3 — ERP avanzado

**Objetivo:** Operativa completa con documentos de ajuste y devoluciones.

**Entregables:**
- Nota de crédito de compra (NC recibida del proveedor — reduce CxP).
- Nota de débito de compra (ND recibida del proveedor — aumenta CxP).
- Devolución al proveedor (gestión desde Inventario, vinculada a Compras).
- Control presupuestal informativo (presupuesto por centro/período).
- Módulo básico de Activos Fijos (ficha + vinculación a CC).
- Reporte de antigüedad de CxP.

---

### Fase 4 — ERP extendido

**Objetivo:** Control avanzado y gestión de capital.

**Entregables:**
- Control presupuestal bloqueante (no permite registrar OC/CC si excede presupuesto).
- Aprobación por monto, rol o centro de costo.
- Módulo completo de Activos Fijos: depreciación, vida útil, ficha técnica, bajas.
- Análisis avanzado de proveedores (lead time, cumplimiento, precios históricos).

---

## 25. Checklist final antes de implementar

### Preparación documental ✅

- [ ] Este documento leído y comprendido por el equipo de desarrollo.
- [ ] Decisiones funcionales (§2) confirmadas por el product owner.
- [ ] Fases de desarrollo (§24) acordadas y priorizadas.

### Fase 0 técnica

- [ ] Agregar `'orden_compra'` y `'comprobante_compra'` al catálogo `DocumentType` en `configuracion-sistema/modelos/Series.ts`.
- [ ] Crear permisos `compras.*` en `configuracion-sistema/roles/tiposRolesPermisos.ts`.
- [ ] Registrar rutas `/compras` y sub-rutas en `privateRoutes.tsx`.
- [ ] Agregar ítem "Compras" en `SideNav.tsx`.
- [ ] Cambiar label "Clientes" a "Clientes y Proveedores" en `SideNav.tsx`.
- [ ] Eliminar o renombrar stub `features/compras/pages/` → `features/compras/paginas/`.
- [ ] Crear estructura completa de carpetas en español (vacía).
- [ ] Crear `compras/modelos/LineaCompra.ts` con campos de cantidad separados.
- [ ] Crear `compras/constantes/clavesAlmacenamientoCompras.ts`.
- [ ] Crear `compras/constantes/permisosCompras.ts`.
- [ ] Crear esqueletos de repositorios (firmas de funciones, sin implementar).
- [ ] Crear esqueletos de servicios (firmas de funciones, sin implementar).
- [ ] Crear esqueletos de mapeadores.
- [ ] `npm run lint` → 0 errores.
- [ ] `npm run build` → 0 errores TypeScript.

### Fase 1 — Antes de codificar cada entidad

- [ ] Modelo completo de la entidad definido en `compras/modelos/`.
- [ ] Repositorio con CRUD local implementado.
- [ ] Servicio con lógica de negocio implementado.
- [ ] Contexto con estado y eventos DOM implementado.
- [ ] Componentes de formulario, listado y detalle implementados.
- [ ] Validaciones de la sección §10 implementadas.
- [ ] Integración con módulos externos verificada.
- [ ] `npm run lint` + `npm run build` → 0 errores después de cada entidad.

---

## 26. Conclusión y veredicto

### ¿Se puede desarrollar Compras sobre la base actual?

**Sí, con confianza alta**, pero con disciplina en la separación de responsabilidades. La base existe: cobranzas espejable, inventario con NI lista, proveedores nativos, caja con egresos, catálogo de productos con `precioCompra`. No se requiere refactor masivo previo.

### ¿Qué se debe preparar primero?

La **Fase 0** es obligatoria. Sin ella, el primer formulario funcional ya tendrá deuda técnica acumulada (tipos incorrectos, estados mal modelados, claves de storage ad-hoc, falta de permisos).

### ¿Qué no conviene hacer?

1. Copiar `FormularioDocumentoComercial.tsx` y renombrarlo.
2. Usar `CartItem` como `LineaCompra`.
3. Mezclar `OrdenCompra` en `DocumentosComercialesContext`.
4. Usar un solo campo `estado` en lugar de estados separados por dimensión.
5. Omitir `cantidadRecibida` / `cantidadIngresadaInventario` en `LineaCompra`.
6. Omitir `modalidadInventario` en `ComprobanteCompra`.
7. Mover la Nota de Ingreso fuera de Inventario.
8. Crear un módulo separado de Proveedores.

### ¿Cuál es el camino más seguro?

1. **Fase 0** primero (1-2 días de preparación técnica).
2. **Modelos propios e independientes** en español, con todos los campos previstos.
3. **Repositorios separados** por entidad, con `lsKey()` en todas las claves.
4. **Servicios sin React** que contengan la lógica de negocio.
5. **Contextos propios** sin mezclar con Ventas.
6. **Reutilización solo de helpers compartidos** y patrón visual.
7. **Una entidad a la vez** con lint + build limpio al finalizar cada una.

El módulo de Compras puede quedar limpio, bien integrado y sin deuda técnica si se respetan estas decisiones desde el primer commit.

---

*Documento de planificación — ningún archivo de código funcional fue modificado.*
*Última actualización: 2026-06-30*
