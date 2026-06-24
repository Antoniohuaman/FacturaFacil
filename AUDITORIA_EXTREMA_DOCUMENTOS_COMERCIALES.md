# Auditoría extrema del módulo Documentos Comerciales

---

## 1. Información de la auditoría

| Campo | Valor |
|---|---|
| Fecha | 2026-06-24 |
| Rama | `RevisionCotizacion` |
| Commit actual | `4412dcbb` — ORDEN DE TABS |
| Estado de Git | Limpio (working tree clean) |
| Entorno | Windows 11, Node/npm, Vite 7, TypeScript ~5.8 |

### Comandos ejecutados

| Comando | Resultado | Errores | Warnings |
|---|---|---|---|
| `npm run build` | ✅ Éxito (21.6 s) | 0 errores TypeScript | 1 warning: chunk index.js = 3 343 KB > 3 000 KB |
| `npm run lint` | ✅ Éxito — sin output | 0 errores ESLint | 0 warnings ESLint del código propio |
| Tests unitarios | No existen para el módulo | — | — |
| Tests integración | No existen | — | — |
| Tests E2E | No existen | — | — |

### Limitaciones

- La aplicación no se pudo levantar en este entorno para pruebas funcionales interactivas. Toda la auditoría es estática.
- Las validaciones de stock (`validarStockParaOrden`) dependen de `useProductStore` (Zustand). El comportamiento real con productos específicos no es verificable sin datos de prueba.
- La integración con el módulo de Comprobantes Electrónicos fue trazada estativamente a través de `postEmisionOrdenVenta.ts` y los hooks de comprobantes; no se verificó la emisión real.

---

## 2. Resumen ejecutivo

### Estado general

El módulo Documentos Comerciales es un prototipo frontend-only bien estructurado, con un estado de negocio razonablemente completo para Cotizaciones. Las Órdenes de Venta y Notas de Venta tienen flujos funcionales pero con brechas de integridad importantes que deben cerrarse antes de integrar con backend.

### Veredicto

🔴 **NO LISTO PARA ENTREGA** — existen hallazgos P1 que afectan integridad de datos entre módulos (stock, comprobantes, concurrencia de correlativos).

### Conteo de hallazgos

| Severidad | Cantidad |
|---|---|
| P0 – BLOQUEANTE | 0 |
| P1 – ALTO | 5 |
| P2 – MEDIO | 11 |
| P3 – BAJO | 4 |
| **Total** | **20** |

### Principales riesgos

1. OV en estado `'Pendiente de salida'` puede anularse sin revertir el comprobante (violación de integridad entre módulos).
2. Editar una OV en `'Atendida parcialmente'` no ajusta reservas de stock.
3. Generación de correlativos no atómica: múltiples pestañas producirían duplicados.
4. `postEmisionOrdenVenta.ts` parsea localStorage sin validación de esquema (`any[]` masivo).
5. Cero tests para el módulo completo.

### Principales fortalezas

- Build limpio y TypeScript sin errores.
- Lógica de estados de Cotización completa y bien auditada (normalización lazy, guards consistentes, reversiones de cascada).
- Separación clara de responsabilidades: modelo, contexto, acciones, helpers, almacenamiento.
- La reserva de stock en OVs sigue el patrón FIFO correcto.
- El historial de eventos y la trazabilidad están bien implementados.
- El patrón de evento DOM para sincronización entre módulos (`documentos_comerciales_changed`) funciona correctamente.

### Conclusión ejecutiva

El módulo tiene una base sólida. Los flujos de Cotización son los más maduros. Los flujos de OV y NV tienen implementación funcional pero les falta: (a) cerrar la brecha de anulación de OV en 'Pendiente de salida', (b) proteger la edición de OV con stock comprometido, (c) confirmar la atomicidad del correlativo. Estos tres puntos son los bloqueantes reales.

---

## 3. Criterio de aprobación

| Estado | Condición |
|---|---|
| 🟢 LISTO | Build/lint/typecheck ✅ + 0 P0 + 0 P1 + flujos principales completos + stock consistente + trazabilidad correcta |
| 🟡 LISTO CON OBSERVACIONES | 0 P0 + 0 P1 + P2/P3 documentados y aceptados |
| 🔴 NO LISTO | Cualquier P0 o P1 pendiente |

---

## 4. Inventario técnico

### Archivos del módulo propio

| Archivo | Responsabilidad | Tab/Flujo | Exclusivo/Compartido | Dependencias clave |
|---|---|---|---|---|
| `models/documentoComercial.types.ts` | Tipos: DocumentoComercial, estados, trazabilidad, ítems | Global | Compartido (re-exporta comprobante.types) | `comprobante.types.ts` |
| `models/documentoComercial.constants.ts` | ESTADOS_*, STORAGE_KEYS, COLUMNAS_DEFAULT, labels | Global | Exclusivo | Tipos propios |
| `utils/documentoComercial.helpers.ts` | Generadores de ID/correlativo, formateadores, cálculo tributos, normalización estados | Global | Exclusivo | `constants.ts`, `Series` |
| `utils/documentoComercial.storage.ts` | Carga/guarda/migra documentos en localStorage | Global | Exclusivo | `tenant`, `constants.ts` |
| `utils/servicioReservaStock.ts` | Validar, reservar, liberar, descontar, revertir stock | OV / NV | Exclusivo | `stockGateway`, `useProductStore`, `InventoryService` |
| `utils/convertirOVaComprobante.ts` | Validar y construir carga de conversión para OV, NV, Cotización → Comprobante | Todos | Exclusivo | `comprobante.types`, `stockGateway`, `useProductStore` |
| `contexts/DocumentosComercialesContext.tsx` | Estado global + persistencia + event listener DOM | Global | Exclusivo | `storage.ts` |
| `hooks/useDocumentoComercialActions.ts` | CRUD de documentos, estados, reservas, cascadas | Global | Exclusivo | contexto, servicioReservaStock, postEmisionOrdenVenta |
| `hooks/useDocumentoComercialState.ts` | Estado local del formulario (campo a campo) | Formulario | Exclusivo | Tipos propios |
| `hooks/useDocumentoComercialType.ts` | Series filtradas por tipo y establecimiento | Formulario | Exclusivo | `ContextoConfiguracion`, `useTenant` |
| `hooks/useDocumentoComercialFieldsConfig.ts` | Configuración de campos opcionales en formulario | Formulario | Exclusivo | `localStorage`, `constants.ts` |
| `hooks/useDocumentoComercialDrafts.ts` | Borrador en progreso (auto-save) | Formulario | Exclusivo | `useBorradorEnProgreso` |
| `components/ListadoDocumentosComerciales.tsx` | Tabla, filtros, drawer detalle, acciones, exportación, conversiones | Global (todos los tabs) | Compartido entre 3 tabs | Casi todos los módulos |
| `components/FormularioDocumentoComercial.tsx` | Formulario de creación/edición | Formulario | Compartido entre 3 tipos | useCart, useCurrency, usePayment, useCreditTerms |
| `components/FormularioHeaderComercial.tsx` | Header del formulario (cliente, serie, fecha, moneda) | Formulario | Exclusivo | Contextos de config |
| `components/EstadoDocumentoBadge.tsx` | Badge de estado visual | Global | Exclusivo | helpers.ts |
| `components/DocumentoComercialPrintView.tsx` | Vista de impresión | Global | Exclusivo | helpers.ts |
| `pages/DocumentosComerciales.tsx` | Página principal (tabs) | Global | Exclusivo | contexto, ListadoDocumentosComerciales |
| `pages/DocumentosComercialesLayout.tsx` | Layout que provee el contexto | Global | Exclusivo | Contexto |
| `pages/FormularioDocumentoComercialPage.tsx` | Router wrapper del formulario | Formulario | Exclusivo | FormularioDocumentoComercial |

### Archivos compartidos relacionados

| Archivo | Responsabilidad | Módulos que lo usan |
|---|---|---|
| `shared/documentosComerciales/postEmisionOrdenVenta.ts` | Actualización de OV/NV/COT post-emisión de comprobante/NS; liberación de stock | Comprobantes, Inventario (NS) |
| `shared/documentosComerciales/comparadorComercial.ts` | Comparación de snapshots para detectar cambios en conversión | FormularioDocComercial, EmisionTradicional |

### Archivos externos con acoplamiento relevante

| Archivo | Relación |
|---|---|
| `comprobantes-electronicos/hooks/useComprobanteActions.tsx` | Llama `actualizarOrdenVentaPostEmision`, `actualizarCotizacionPostEmision`, `actualizarNVPostEmision` |
| `gestion-inventario/hooks/useNotasSalida.ts` | Llama `vincularDocumentoComercialNS`, `atenderOrdenVentaPostNS/NSDirecta`, `restaurarOVPostAnulacionNSDirecta` |
| `gestion-inventario/components/notas-salida/NotasSalidaPanel.tsx` | Recibe `fromOrdenVenta`/`fromNotaVenta` del state de navegación |
| `comprobantes-electronicos/models/instantaneaDocumentoComercial.ts` | Define el contrato de conversión hacia comprobante |

---

## 5. Arquitectura global

```
DocumentosComercialesLayout (Provider)
│
├── DocumentosComerciales (Tabs: COT | OV | NV)
│   └── ListadoDocumentosComerciales[tipo] ← COMPONENTE MONOLÍTICO (1488 líneas)
│       ├── filtros + tabla + paginación
│       ├── drawer detalle (Detalle | Historial | Seguimiento)
│       ├── menú acciones (CRUD, conversiones, NS, impresión)
│       └── modales de confirmación
│
└── FormularioDocumentoComercialPage
    └── FormularioDocumentoComercial
        ├── FormularioHeaderComercial (cliente, serie, fecha, moneda)
        ├── ProductsSection (compartido con Comprobantes)
        ├── NotesSection
        ├── CreditScheduleModal / CreditScheduleSummaryCard
        └── ActionButtonsSection

CONTEXTO (DocumentosComercialesContext)
  └── reducer + localStorage (lectura inicial + escucha evento 'documentos_comerciales_changed')

ACCIONES (useDocumentoComercialActions)
  ├── CRUD documentos (generarDocumento, actualizarDocumento, anularDocumento, ...)
  ├── Acciones cotización (aprobar, rechazar, aceptar, cerrarPerdida, vencimiento)
  ├── Stock (delegado a servicioReservaStock.ts)
  └── Cascadas de estado entre documentos

PERSISTENCIA DUAL (problema de arquitectura):
  ├── Vía normal: Context reducer → guardarDocumentosEnStorage (sinc tras cada cambio de estado)
  └── Vía post-emisión: postEmisionOrdenVenta.ts → localStorage directo + dispatchEvent DOM
      ← Contexto escucha el evento y recarga
```

### Fuentes de verdad por concepto

| Concepto | Fuente autoritativa | Problema |
|---|---|---|
| Lista de documentos | `DocumentosComercialesContext.state.documentos` | Dual-write: postEmision escribe directamente en LS |
| Stock real (por almacén) | `useProductStore` (Zustand) | OK — mismo store en todos los módulos |
| Stock reservado | `useProductStore.stockReservadoPorAlmacen` | OK — mismo store |
| Correlativos usados | `state.documentos` en memoria | ❌ No atómico con múltiples pestañas |
| Estado de cotización | `DocumentoComercial.estado` | OK |
| Estado de OV | `DocumentoComercial.estado` | Desincronizable con 'Pendiente de salida' (ver DC-OV-P1-001) |
| Trazabilidad | `DocumentoComercial.trazabilidad` | Solo muestra destino; origen no visible en listado NV/OV |

### Acoplamiento entre módulos

| Acoplamiento | Tipo | Riesgo |
|---|---|---|
| Comprobantes → postEmisionOrdenVenta | Import directo | Cambiar LSkeys en DC rompe Comprobantes |
| Inventario (NS) → postEmisionOrdenVenta | Import directo | Igual |
| DC → servicioReservaStock → useProductStore | Import directo (hook getState) | Correcto en Zustand; no migrable sin cambio |
| DC → comprobante.types (CartItem, PaymentTotals) | Re-export | Dependencia funcional justificada |

### Riesgos arquitectónicos

1. **Dual-write con `any[]`**: el path `postEmisionOrdenVenta → localStorage → evento DOM → context reload` no tiene validación de esquema en ningún punto. Un error en el JSON resultaría en pérdida silenciosa del documento.
2. **Componente monolítico**: `ListadoDocumentosComerciales` tiene lógica de negocio (acciones, conversiones, stock) mezclada con presentación. Imposible testear unitariamente sin renderizar todo el árbol.
3. **Retirar cualquier tab NO rompería los otros** — la lógica es compartida por tipo, no hardcodeada por tab. Los tabs son una variable pasada al mismo componente.

---

## 6. Resultados de build, lint, TypeScript y tests

| Validación | Comando | Resultado | Detalles |
|---|---|---|---|
| Build producción | `npm run build` | ✅ PASA | Sin errores TS. Warning: chunk 3 343 KB |
| TypeScript | Integrado en build (`tsc -b`) | ✅ 0 errores | — |
| ESLint | `npm run lint` | ✅ 0 errores | 4 `eslint-disable` justificados en el código |
| Tests unitarios | No existe script de tests | ❌ NO EXISTEN | 0 archivos .test o .spec en el módulo |
| Tests integración | No existe | ❌ NO EXISTEN | — |
| Tests E2E | No existe | ❌ NO EXISTEN | — |

### Búsqueda de patrones problemáticos (resultado)

| Patrón | Módulo DC | Shared postEmision |
|---|---|---|
| `console.log` | 0 | 0 |
| `console.error` | 0 | 8 (en catch blocks — apropiados) |
| `debugger` | 0 | 0 |
| `@ts-ignore` | 0 | 0 |
| `@ts-expect-error` | 0 | 0 |
| `eslint-disable` | 4 (react-hooks/exhaustive-deps + react-refresh) | 11 (`@typescript-eslint/no-explicit-any`) |
| `any` explícito | 0 en DC | 10+ en postEmision (con eslint-disable) |
| `TODO/FIXME/HACK` | 0 | 0 |
| Código comentado | 0 | 0 |
| `key={idx}` (React) | 2 (historial, comentarios) | 0 |
| Código muerto | `COLUMNAS_DEFAULT_LISTADO`, `BORRADOR_APP`, 'Reservada'/'Aprobada' en array puedeEditar | 0 |

---

## 7. Auditoría de Cotizaciones

### 7.1 Flujo funcional encontrado

```
Nuevo → Formulario → [Borrador auto-guardado]
  ↓
Generar Cotización
  ├─ requiereAprobacion=false → estado: Vigente
  └─ requiereAprobacion=true  → estado: Pendiente aprobación

Vigente / Aprobada → Marcar como Aceptada → Aceptada
Aceptada → Convertir a:
  ├─ Nota de Venta  → navigate(nuevo NV, prefillFrom=cotización)
  ├─ Orden de Venta → navigate(nuevo OV, prefillFrom=cotización)
  └─ Comprobante    → navigate(emision, conversionData)
  [Cotización queda Convertida, trazabilidad apunta al destino]

Pendiente aprobación → Aprobar → Aprobada
Pendiente aprobación → No aprobar → No aprobada
Vigente/Aprobada/Aceptada → Cerrar como perdida → Cerrada perdida
Cualquier estado activo → Anular → Anulada
Vencida (auto) → evaluarVencimientosCotizaciones al entrar al tab
```

### 7.2 Matriz de estados y acciones — Cotización

| Estado | Editar | Anular | Aprobar | Marcar aceptada | Convertir | Cerrar perdida |
|---|---|---|---|---|---|---|
| Borrador | ✅ | — (borrar) | ❌ | ❌ | ❌ | ❌ |
| Vigente | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| Pendiente aprobación | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Aprobada | ❌ | ✅ | — | ✅ | ❌ | ✅ |
| Aceptada | ✅ (warning, invalida) | ✅ | — | — | ✅ (NV, OV, Comprobante) | ✅ |
| Vencida | ✅ | ✅ | ❌ | — | ❌ | ❌ |
| No aprobada | ❌ | ❌ | — | — | ❌ | ❌ |
| Cerrada perdida | ❌ | ❌ | — | — | ❌ | — |
| Convertida | ❌ | ❌ | — | — | ❌ | — |
| Anulada | ❌ | — | — | — | ❌ | — |
| Generada (legacy) | ✅ | ✅ | — | ✅ | ✅ | ✅ |

> **Confirmado**: Los guards son consistentes entre `ListadoDocumentosComerciales` (funciones `puedeEditar`, `puedeAnular`, etc.) y `useDocumentoComercialActions` (validaciones internas en cada función).

### 7.3 Conversiones desde Cotización

| Destino | Validaciones previas | Trazabilidad | Estado origen post-conversión | Estado origen si se anula destino |
|---|---|---|---|---|
| Nota de Venta | Solo Aceptada. El estado lo valida `puedeConvertirCotizacion` | Destino registrado en COT. Origen registrado en NV | Convertida | Restaura a Aceptada (cascade en `anularDocumento`) |
| Orden de Venta | Solo Aceptada. Ídem | Ídem | Convertida | Restaura a Aceptada |
| Comprobante | Solo Aceptada (`validarCotizacionParaConversion`). Requiere número asignado y cliente | Via `postEmisionOrdenVenta.actualizarCotizacionPostEmision` | Convertida | Restaura a Aceptada (`restaurarCotizacionPostAnulacion`) |

> **Detección de doble conversión**: Cotización en estado 'Convertida' no puede volver a convertirse — `puedeConvertirCotizacion` requiere estado 'Aceptada'.

> **Cancelar modal/formulario**: Si el usuario navega al formulario de NV/OV (conversión) y cancela con `handleCancelar`, la cotización NO queda Convertida porque `vincularDocumentoConCotizacion` solo se llama DESPUÉS de `actions.generarDocumento` con resultado exitoso.

### 7.4 Reversiones

| Evento | Comportamiento | Implementado en |
|---|---|---|
| Anulación de NV/OV generada desde COT | COT → 'Aceptada' + limpieza de trazabilidad | `useDocumentoComercialActions.anularDocumento` (cascada) |
| Anulación de Comprobante generado desde COT | COT → 'Aceptada' + limpieza de trazabilidad | `postEmisionOrdenVenta.restaurarCotizacionPostAnulacion` |

> Nota: Las cascadas solo buscan `trazabilidad.documentoDestinoId === id`. Si existen dos documentos destino (no posible hoy por guard), la reversión solo alcanzaría el primero que encuentre.

### 7.5 Integraciones

- **Cliente**: campo opcional para Borrador, obligatorio para generar. Se valida en `validarDatos`. Dirección se muestra si existe.
- **Productos**: CartItem heredado de módulo Comprobantes. Sin validación de stock en cotización (correcto).
- **Precios**: Precio almacenado al momento de creación en `CartItem.price`. No hay mecanismo de actualización si el precio cambia.
- **Crédito/cuotas**: Soportado via `creditTerms`. Se transfiere en conversión a Comprobante y NV. No se transfiere en conversión a OV (`terminosCredito: null` en `construirCargaConversionDesdeOV`).
- **Cobranzas**: No hay integración directa. La cotización no genera cuentas por cobrar.

### 7.6 Hallazgos — Cotización

#### DC-COT-P1-004 — Vencimiento batch genera N re-renders

**Severidad**: P1 | **Categoría**: Rendimiento / Arquitectura

**Descripción**: `evaluarVencimientosCotizaciones` llama `actualizarEnContext` una vez por cada cotización vencida dentro de un `forEach`. Cada llamada despacha un action al reducer, que triggerea un re-render y un `guardarDocumentosEnStorage` (via useEffect). Con N cotizaciones vencidas, se generan N escrituras al localStorage y N ciclos de re-render en cadena.

**Evidencia**: `useDocumentoComercialActions.ts:852-878`, `DocumentosComercialesContext.tsx:73-75`.

**Flujo afectado**: Tab de Cotizaciones (al montarse).

**Comportamiento actual**: N actualizaciones individuales secuenciales.

**Comportamiento esperado**: Un solo dispatch con todos los documentos actualizados (`ESTABLECER_DOCUMENTOS`).

**Impacto funcional**: Con 20+ cotizaciones vencidas, el tab carga notablemente más lento.

**Impacto técnico**: Deuda de rendimiento. No corrupción de datos.

**Riesgo de regresión**: Bajo — el resultado final es correcto, solo ineficiente.

**Recomendación**: Cambiar `forEach` + `actualizarEnContext` individual por un único dispatch de tipo `ESTABLECER_DOCUMENTOS` con el arreglo completo actualizado.

**Bloquea entrega**: No.

---

#### DC-COT-P2-007 — Sincronización silenciosa de cotización al editar NV/OV

**Severidad**: P2 | **Categoría**: Comportamiento no documentado / UX

**Descripción**: Al guardar una edición a una NV u OV que tiene `trazabilidad.documentoOrigenId` apuntando a una cotización, `sincronizarCotizacionDesdeDocumento` sobreescribe en la cotización: `cliente`, `items`, `totales`, `observaciones`, `formaPago`, `moneda`. Este cambio se hace silenciosamente sin ningún mensaje al usuario.

**Evidencia**: `FormularioDocumentoComercial.tsx:266-274`, `useDocumentoComercialActions.ts:912-943`.

**Flujo afectado**: Edición de NV/OV generadas desde cotización.

**Comportamiento actual**: La cotización 'Convertida' recibe los datos del documento destino sin notificación.

**Comportamiento esperado**: Al menos notificar al usuario o hacer la sincronización opt-in.

**Impacto funcional**: El historial de la cotización mostrará "Datos comerciales sincronizados" pero el usuario de NV/OV no recibe confirmación.

**Bloquea entrega**: No. Pero debe comunicarse como comportamiento conocido.

---

#### DC-COT-P2-010 — "Doc. relacionado" no visible para NV/OV origen

**Severidad**: P2 | **Categoría**: UX / Trazabilidad

**Descripción**: `resolverDocumentoRelacionadoNumero` (línea 244 de Listado) solo retorna `trazabilidad.documentoDestinoNumero`. Una NV o una OV generada desde cotización tiene su origen en `trazabilidad.documentoOrigenNumero`, no en `documentoDestinoNumero`. La columna "Doc. relacionado" en el listado de NV y OV no muestra la cotización de origen.

**Evidencia**: `ListadoDocumentosComerciales.tsx:244-246`. La función solo lee `documentoDestinoNumero`.

**Flujo afectado**: Listado de NV y OV cuando provienen de una cotización.

**Comportamiento actual**: Columna muestra '—' hasta que se genera un comprobante.

**Comportamiento esperado**: Mostrar el número de cotización origen cuando existe.

**Bloquea entrega**: No. Pero reduce visibilidad operativa.

---

### 7.7 Veredicto del tab — Cotizaciones

**🟡 LISTO CON OBSERVACIONES**

Los estados, transiciones, conversiones y reversiones están correctamente implementados. Los dos hallazgos de Cotización son P1 de rendimiento y P2 de UX, no de integridad. Se puede integrar si se acepta DC-COT-P1-004 como deuda a corregir pronto.

---

## 8. Auditoría de Órdenes de Venta

### 8.1 Flujo funcional encontrado

```
Nuevo / Desde Cotización → Formulario
  ↓ Generar
Validar stock (por cada bien de catálogo)
  ├─ Stock insuficiente → Error, no genera
  └─ Stock suficiente  → Reservar stock + estado: 'Reservada'

Reservada → Generar Comprobante → Comprobante emitido
  ├─ modo 'automatico' / 'sin_control' → OV queda 'Atendida' + reserva liberada
  └─ modo 'nota_salida'               → OV queda 'Pendiente de salida' + reserva mantenida

Pendiente de salida → Generar Nota de Salida → OV 'Atendida' o 'Atendida parcialmente'
Reservada           → Generar Nota de Salida → OV 'Atendida' o 'Atendida parcialmente'
```

### 8.2 Matriz de estados y acciones — Orden de Venta

| Estado | Editar | Anular | Generar Comprobante | Generar NS |
|---|---|---|---|---|
| Borrador | ✅ | — (borrar) | ❌ | ❌ |
| Reservada | ❌ | ✅ | ✅ | ✅ |
| Pendiente de salida | ❌ | ✅ ⚠️ | ❌ | ✅ |
| Atendida parcialmente | ✅ ⚠️ | ✅ | ❌ | ✅ (saldo pendiente) |
| Atendida | ❌ | ❌ | ❌ | ❌ |
| Anulada | ❌ | — | ❌ | ❌ |
| Vencida | (ver P3-002) | ✅ | ❌ | ❌ |

> ⚠️ Marcas de problemas detectados — ver hallazgos.

### 8.3 Reserva y liberación de stock

| Operación | Comportamiento | Archivo |
|---|---|---|
| Generar OV | Valida → reserva en `stockReservadoPorAlmacen` FIFO | `servicioReservaStock.reservarStockOrden` |
| Anular OV (Reservada) | Libera toda la reserva | `useDocumentoComercialActions.anularDocumento` |
| Anular OV (Pendiente de salida) | Libera la reserva **pendiente** (original − despachado) | `anularDocumento` + `calcularReservasPendientes` |
| Anular OV (Atendida parcialmente) | Libera la reserva pendiente | Idem |
| Generar Comprobante modo auto | Libera reserva, OV → 'Atendida' | `postEmision.actualizarOrdenVentaPostEmision` |
| Generar Comprobante modo nota_salida | Mantiene reserva, OV → 'Pendiente de salida' | Idem |
| Generar NS directa desde OV | Descuenta stock real, libera reserva proporcional, OV → 'Atendida'/'Parcialmente' | `postEmision.atenderOrdenVentaPostNSDirecta` |
| Anular NS directa | Repone stock real, restaura reserva proporcional, OV → 'Reservada'/'Parcialmente' | `postEmision.restaurarOVPostAnulacionNSDirecta` |

**Hallazgo positivo**: La lógica de despacho parcial (`despachado[]`) y `calcularReservasPendientes` está correctamente implementada.

**Hallazgo negativo**: Ver DC-OV-P1-001 y DC-OV-P1-002.

### 8.4 Conversiones y documentos posteriores

| Destino | Estado OV requerido | Post-conversión | Reversión |
|---|---|---|---|
| Comprobante | Reservada | Atendida o Pendiente de salida | OV no se revierte automáticamente al anular comprobante (solo la cotización origen, si aplica) |
| Nota de Salida directa | Reservada o Atendida parcialmente | Atendida o Atendida parcialmente | Anular NS → restaurar OV |
| Nota de Salida (via Comprobante) | Pendiente de salida o Atendida parcialmente | Atendida o Atendida parcialmente | Anular NS → restaurar OV |

### 8.5 Integraciones

- **Stock**: Completamente implementado via `servicioReservaStock` y `postEmisionOrdenVenta`.
- **Comprobantes**: Integración funcional via estado de navegación + `postEmision`.
- **Notas de Salida**: Integración funcional via estado de navegación + `postEmision`.
- **Cobranzas**: No genera cuentas por cobrar directamente; las genera el comprobante.
- **Crédito/cuotas**: La OV guarda `creditTerms` pero `construirCargaConversionDesdeOV` pasa `terminosCredito: null` al comprobante. Las cuotas de la OV no se transfieren al comprobante.

### 8.6 Hallazgos — Orden de Venta

#### DC-OV-P1-001 — Anulación de OV en 'Pendiente de salida' sin revertir el comprobante

**Severidad**: P1 | **Categoría**: Integridad entre módulos

**Descripción**: Una OV en estado `'Pendiente de salida'` significa que ya se emitió un comprobante electrónico desde ella y está esperando la Nota de Salida. `puedeAnular` permite anular esta OV (solo excluye `'Atendida'`). Al anularse, la reserva de stock se libera. El comprobante emitido queda vigente en el módulo de Comprobantes sin ninguna vinculación activa.

**Evidencia**: 
- `ListadoDocumentosComerciales.tsx:167-175` — `puedeAnular` no excluye `'Pendiente de salida'`.
- `useDocumentoComercialActions.ts:539-554` — La anulación libera stock de OVs en 'Pendiente de salida'.
- `postEmisionOrdenVenta.ts:367` — Al emitir comprobante en modo `nota_salida`, OV → 'Pendiente de salida'.

**Pasos para reproducir**: 
1. Crear OV con bien de inventario.
2. Configurar modo stock = 'nota_salida'.
3. Generar comprobante desde OV.
4. OV queda 'Pendiente de salida'. Comprobante emitido válido.
5. Anular la OV desde el menú de acciones.

**Comportamiento actual**: OV queda 'Anulada'. Stock liberado. Comprobante sigue emitido y válido.

**Comportamiento esperado**: No permitir anular OV en 'Pendiente de salida' (o requerir anular primero el comprobante).

**Impacto funcional**: Inconsistencia: hay un comprobante electrónico válido entregado al cliente, pero la OV que lo originó está anulada y el stock está liberado sin haberse despachado.

**Impacto técnico**: Integridad entre módulos rota. Al integrar con backend, el servidor rechazaría esta secuencia.

**Riesgo de regresión**: Alto.

**Recomendación**: Agregar `'Pendiente de salida'` a la lista de estados terminales (no anulables) en `puedeAnular`, o mostrar un error explicativo si el usuario intenta anularla.

**Bloquea entrega**: **Sí**.

---

#### DC-OV-P1-002 — Editar OV en 'Atendida parcialmente' no ajusta reservas de stock

**Severidad**: P1 | **Categoría**: Integridad de inventario

**Descripción**: `puedeEditar` retorna `true` para OV en estado `'Atendida parcialmente'` (línea 163 del Listado). Sin embargo, `actualizarDocumento` en `useDocumentoComercialActions.ts` no contiene ninguna lógica de ajuste de stock para OVs. Si el usuario edita cantidades o agrega/quita ítems a una OV parcialmente atendida, la reserva de stock (`reservasStock[]`) queda sin actualizar.

**Evidencia**:
- `ListadoDocumentosComerciales.tsx:161-164` — `puedeEditar` incluye 'Atendida parcialmente'.
- `useDocumentoComercialActions.ts:472-521` — `actualizarDocumento` no tiene lógica de stock.
- `servicioReservaStock.ts` — No tiene función de "ajustar reserva".

**Comportamiento actual**: El documento se actualiza con nuevos ítems/cantidades pero `reservasStock[]` queda con los valores originales.

**Comportamiento esperado**: La edición de una OV en cualquier estado con stock comprometido debe ajustar (aumentar/disminuir/liberar) las reservas correspondientes.

**Impacto**: `disponible = real - reservado` queda incorrecto para los productos afectados.

**Recomendación**: Bloquear edición de OV en 'Atendida parcialmente' (como lo hace para 'Reservada'), o implementar lógica de ajuste de reserva en `actualizarDocumento`.

**Bloquea entrega**: **Sí**.

---

#### DC-OV-P2-008 — Dead code en `puedeEditar` para tipos no-cotización

**Severidad**: P2 | **Categoría**: Calidad de código

**Descripción**: La función `puedeEditar` (línea 153-165 del Listado) incluye `'Reservada'` y `'Aprobada'` en el array del else-return para tipos no-cotización. `'Reservada'` para OV ya fue interceptado por el guard anterior (retorna false), por lo que esa entrada es código muerto. `'Aprobada'` no es un estado válido de OV o NV según `ESTADOS_ORDEN_VENTA` ni `ESTADOS_NOTA_VENTA`.

**Evidencia**: `ListadoDocumentosComerciales.tsx:160-164`.

**Recomendación**: Limpiar el array. Separar explícitamente la lógica para OV y NV.

**Bloquea entrega**: No.

---

#### DC-OV-P3-002 — Estados legacy de OV excluidos de filtros

**Severidad**: P3 | **Categoría**: Completitud

**Descripción**: `ESTADOS_ORDEN_VENTA` (constantes, línea 64-72) excluye `'Generada'`, `'Atendida parcial'`, `'Atendida total'`, `'Convertida'` y `'Vencida'`. Documentos OV legacy en esos estados no se pueden filtrar en la UI aunque estén en localStorage.

**Evidencia**: `documentoComercial.constants.ts:64-72`, `documentoComercial.types.ts:34-45`.

**Bloquea entrega**: No (afecta solo datos legacy).

---

### 8.7 Veredicto del tab — Órdenes de Venta

**🔴 NO LISTO**

Dos hallazgos P1 bloquean la entrega: la anulación de OV en 'Pendiente de salida' rompe la integridad con Comprobantes, y la edición de OV en 'Atendida parcialmente' deja el stock desincronizado.

---

## 9. Auditoría de Notas de Venta

### 9.1 Flujo funcional encontrado

```
Nuevo / Desde Cotización → Formulario
  ↓ Generar
Si controlStockActivo:
  ├─ modo 'automatico' → Validar stock → Descontar stock real → NV: 'Generada'
  ├─ modo 'nota_salida' → NV: 'Generada' (sin descontar; NS pendiente)
  └─ modo 'sin_control' → NV: 'Generada' (sin stock)
Si !controlStockActivo → NV: 'Generada'

Generada → Generar Comprobante → NV: 'Convertida'
Generada → Generar Nota de Salida (modo nota_salida) → NV vinculada a NS
Generada → Anular → NV: 'Anulada'
  └─ Si tiene NS vinculada → anular NS primero (cascade)
  └─ Si modo='automatico' → revertir descuento de stock
```

### 9.2 Matriz de estados y acciones — Nota de Venta

| Estado | Editar | Anular | Generar Comprobante | Generar NS |
|---|---|---|---|---|
| Borrador | ✅ | — (borrar) | ❌ | ❌ |
| Generada | ✅ | ✅ | ✅ | ✅ (modo nota_salida) |
| Convertida | ❌ | ❌ | ❌ | ❌ |
| Anulada | ❌ | — | ❌ | ❌ |

> La NV tiene el modelo de estados más simple de los tres tipos.

### 9.3 Conversión a comprobante

**Validación**: `validarNVParaConversion` — requiere tipo='nota_venta', no borrador, estado='Generada', número asignado, cliente, ítems. Correcto.

**Datos transferidos**: cliente, dirección, ítems, totales, moneda, observaciones (con ref NV), creditTerms.

**Post-emisión**: `actualizarNVPostEmision` en `postEmisionOrdenVenta.ts` → NV queda 'Convertida', trazabilidad hacia comprobante.

**Reversión**: Si se anula el comprobante, `restaurarNVPostAnulacionComprobante` restaura NV a 'Generada'.

**Prevención de doble conversión**: `puedeConvertirNV` requiere estado='Generada'. Si ya es 'Convertida', no muestra el botón. ✓

**Cancelar modal**: Si el usuario navega al formulario de Comprobante (conversión desde NV) y cancela, la NV no queda 'Convertida' porque `actualizarNVPostEmision` solo se llama tras la emisión exitosa del comprobante.

### 9.4 Inventario, caja y cobranzas

| Aspecto | Implementación |
|---|---|
| Stock modo 'automatico' | Descuenta al generar, revierte al anular — Funcional |
| Stock modo 'nota_salida' | NS se genera separado; `vincularDocumentoComercialNS` vincula — Funcional |
| Stock modo 'sin_control' | No toca stock — Correcto |
| Caja | No tiene integración directa (la genera el comprobante) |
| Cobranzas | No tiene integración directa (la genera el comprobante) |
| Crédito/cuotas | Se transfiere en conversión a Comprobante via `terminosCredito` |

**Editar NV en 'Generada'**: Si la NV tiene modo 'automatico' y stock ya descontado, editar las cantidades NO ajusta el stock descontado (mismo problema que OV — `actualizarDocumento` no tiene lógica de stock para NV).

### 9.5 Integraciones

- **Cotización origen**: Si NV vino de cotización, al anularla cascade en `anularDocumento` restaura la cotización a 'Aceptada'. ✓
- **Comprobante**: Conversión funcional.
- **Nota de Salida**: Integración funcional (modo nota_salida).
- **Stock**: Funcional en modo automático. El `revertirDescuentoStockDocumento` en anulación genera movimiento Kardex AJUSTE_POSITIVO.

### 9.6 Hallazgos — Notas de Venta

#### DC-NV-P2-NV001 — Editar NV en 'Generada' con modo 'automatico' no ajusta stock

**Severidad**: P2 | **Categoría**: Integridad de inventario

**Descripción**: Si una NV fue generada en modo 'automatico' (stock ya descontado), el usuario puede editarla (`puedeEditar` retorna true para 'Generada'). Al guardar la edición con cantidades diferentes, `actualizarDocumento` actualiza ítems y totales pero NO ajusta el stock descontado (`reservasStock[]`).

**Evidencia**: `ListadoDocumentosComerciales.tsx:161-164`, `useDocumentoComercialActions.ts:472-521`.

**Comportamiento actual**: Stock descontado queda con la cantidad original. El documento muestra cantidades nuevas.

**Comportamiento esperado**: Ajustar el stock descontado por la diferencia.

**Impacto**: Discrepancia entre ítems del documento y movimiento Kardex asociado.

**Bloquea entrega**: No (P2, porque afecta solo si modo='automatico' Y el usuario edita post-generación, que es un caso de uso menos común).

---

### 9.7 Veredicto del tab — Notas de Venta

**🟡 LISTO CON OBSERVACIONES**

Los flujos principales (generar, convertir, anular, modo stock) están implementados correctamente. El único hallazgo relevante (DC-NV-P2-NV001) es P2 y afecta un escenario poco frecuente. Si el equipo puede vivir con esa brecha o bloquea la edición de NV en modo automático con stock activo, el tab puede considerarse entregable.

---

## 10. Auditoría de componentes compartidos

### `ListadoDocumentosComerciales.tsx` — 1488 líneas

**Estado**: Funcional. Monolítico. Las principales responsabilidades mezcladas son:
- Filtros y tabla (presentación)
- Acciones de negocio (conversiones, generación NS, anulaciones)
- Drawer de detalle con 3 tabs
- Modal de confirmación
- Exportación Excel
- Impresión

Esto dificulta el testing y el mantenimiento. Sin embargo, no hay bugs directamente causados por el tamaño.

### `FormularioDocumentoComercial.tsx`

**Estado**: Bien estructurado. Delega correctamente a hooks especializados. Los `eslint-disable react-hooks/exhaustive-deps` en líneas 114 y 149 son intencionales y justificados por el patrón de inicialización única.

### `DocumentosComercialesContext.tsx`

**Estado**: Correcto. Patrón useReducer + localStorage. El `eslint-disable react-refresh/only-export-components` tiene una nota "split diferido" — deuda técnica conocida aceptada.

### `useDocumentoComercialActions.ts`

**Estado**: Complejo pero bien organizado. Centraliza correctamente todas las mutaciones de documentos.

### `servicioReservaStock.ts`

**Estado**: Implementación sólida. El patrón de leer `useProductStore.getState()` dentro del loop (en lugar de capturar el snapshot una vez) es correcto y necesario para evitar sobrescribir reservas anteriores del mismo ciclo.

### `postEmisionOrdenVenta.ts` (shared)

**Estado**: Funciona correctamente pero tiene 752 líneas de código con `any[]` masivo. Necesita un zod/schema de validación antes de producción.

### `convertirOVaComprobante.ts`

**Estado**: Correcto. Las funciones de construcción de `InstantaneaDocumentoComercial` son completas. Un gap menor: OV no transfiere `creditTerms` al comprobante (`terminosCredito: null`).

### `comparadorComercial.ts`

**Estado**: Correcto. La comparación de ítems por `llavesItems` (sort + join) es robusta ante reordenamiento.

### `EstadoDocumentoBadge.tsx`

**Estado**: Correcto. Aplica normalización via `normalizarEstadoParaDisplay`. Funciona para todos los estados documentados.

---

## 11. Matriz comparativa de los tres tabs

| Funcionalidad | Cotización | Orden de Venta | Nota de Venta | Compartido |
|---|---|---|---|---|
| Listado con filtros | ✅ Completo | ✅ Completo | ✅ Completo | ✅ ListadoDocCom |
| Búsqueda | ✅ | ✅ | ✅ | ✅ |
| Filtro fecha | ✅ | ✅ | ✅ | ✅ |
| Filtro estado | ✅ | ✅ (excluye legacy) | ✅ | ✅ |
| Configuración columnas | ✅ (incluye Req. aprobación) | ✅ | ✅ | ✅ |
| Persistencia columnas | ✅ (por tipo) | ✅ | ✅ | ✅ |
| Exportación Excel | ✅ | ✅ | ✅ | ✅ |
| Creación nueva | ✅ | ✅ | ✅ | ✅ FormularioDC |
| Creación desde otro doc | ✅ (N/A) | ✅ (desde COT) | ✅ (desde COT) | ✅ navigate+state |
| Edición | ✅ (Vigente, Pendiente, Aceptada, Vencida) | ⚠️ (Atendida parcialmente — stock gap) | ✅ | ✅ FormularioDC |
| Borrador auto-save | ✅ | ✅ | ✅ | ✅ useDrafts |
| Detalle / Drawer | ✅ | ✅ | ✅ | ✅ |
| Historial | ✅ | ✅ | ✅ | ✅ |
| Seguimiento (comentarios) | ✅ | ✅ | ✅ | ✅ |
| Impresión A4 y Ticket | ✅ | ✅ | ✅ | ✅ |
| Compartir | ✅ | ✅ | ✅ | ✅ |
| Copiar enlace | ✅ | ✅ | ✅ | ✅ |
| Anulación | ✅ | ⚠️ (P. salida sin guardia) | ✅ (cascade NS) | ✅ |
| Duplicar | ✅ | ✅ | ✅ | ✅ |
| Estados completos | ✅ 10 estados | ⚠️ (5 en UI, 9 en tipo) | ✅ 4 estados | — |
| Conversión | ✅ → NV, OV, Comprobante | ✅ → Comprobante | ✅ → Comprobante | — |
| Trazabilidad | ✅ | ✅ | ✅ (origen no visible en listado) | — |
| Crédito / Cuotas | ✅ | ✅ (no se transfiere a Comprobante) | ✅ | ✅ CreditSchedule |
| Reserva de stock | ❌ (no aplica) | ✅ (funcional) | ❌ (no aplica) | — |
| Salida de stock | ❌ | ✅ (NS) | ✅ (modo auto/NS) | — |
| Guía de Remisión | ⚠️ (campo opcional en camposOpcionales, no integración real) | ⚠️ (ídem) | ⚠️ (ídem) | — |
| Permisos / Roles | No verificable (no hay guards de ruta) | Idem | Idem | No verificable |

---

## 12. Matriz integral de flujos

| Flujo | Existe | Completo | Parcial | No verificable | Evidencia | Riesgo |
|---|---|---|---|---|---|---|
| Crear cotización | ✅ | ✅ | — | — | `generarDocumento` | — |
| Editar cotización | ✅ | ✅ | — | — | `actualizarDocumento` | — |
| Estados cotización | ✅ | ✅ | — | — | `useDocumentoComercialActions` | — |
| Conversión COT→NV | ✅ | ✅ | — | — | `handleConvertirCotANV` | — |
| Conversión COT→OV | ✅ | ✅ | — | — | `handleConvertirCotAOV` | — |
| Conversión COT→Comprobante | ✅ | ✅ | — | — | `construirCargaConversionDesdeCotizacion` | — |
| Reversión COT tras anular NV/OV | ✅ | ✅ | — | — | `anularDocumento` cascade | — |
| Reversión COT tras anular Comprobante | ✅ | ✅ | — | — | `restaurarCotizacionPostAnulacion` | — |
| Crear OV con reserva stock | ✅ | ✅ | — | — | `servicioReservaStock` | — |
| Anular OV Reservada | ✅ | ✅ | — | — | `anularDocumento` | — |
| Anular OV Pendiente de salida | ✅ | ⚠️ | — | — | `puedeAnular` sin guardia | **ALTO** |
| Editar OV Atendida parcialmente | ✅ | — | ⚠️ | — | `actualizarDocumento` sin stock | **ALTO** |
| OV → Comprobante | ✅ | ✅ | — | — | `construirCargaConversionDesdeOV` | — |
| OV → Nota Salida directa | ✅ | ✅ | — | — | `atenderOrdenVentaPostNSDirecta` | — |
| Parcial OV con NS múltiples | ✅ | ✅ | — | — | `sumarDespachos` + `calcularReservasPendientes` | — |
| Anular NS directa → restaurar OV | ✅ | ✅ | — | — | `restaurarOVPostAnulacionNSDirecta` | — |
| Crear NV modo automático | ✅ | ✅ | — | — | `descontarStockParaDocumento` | — |
| Crear NV modo nota_salida | ✅ | ✅ | — | — | `generarDocumento` + `vincularDocumentoComercialNS` | — |
| Anular NV modo automático | ✅ | ✅ | — | — | `revertirDescuentoStockDocumento` | — |
| Anular NV con NS vinculada | ✅ | ✅ | — | — | cascade en `handleConfirmarAccion` | — |
| NV → Comprobante | ✅ | ✅ | — | — | `construirCargaConversionDesdeNV` | — |
| Reversión NV tras anular Comprobante | ✅ | ✅ | — | — | `restaurarNVPostAnulacionComprobante` | — |
| Editar NV modo automático + stock | ✅ | — | ⚠️ | — | `actualizarDocumento` sin stock | Medio |
| Borrador en progreso (auto-save) | ✅ | ✅ | — | — | `useDocumentoComercialDrafts` | — |
| Migración legacy Generada→Vigente | ✅ | ✅ | — | — | `normalizarDocumentoCargado` | — |
| Permisos de rol | — | — | — | ❌ | No hay guards en rutas DC | No verificable |
| Múltiples establecimientos | — | — | — | ❌ | `establecimientoId` en documento pero sin filtro en listado | Riesgo de mezcla |

---

## 13. Integraciones con otros módulos

| Módulo | Tipo de integración | Estado |
|---|---|---|
| **Comprobantes Electrónicos** | Conversión via `location.state` + `InstantaneaDocumentoComercial` + `postEmisionOrdenVenta` | ✅ Funcional |
| **Gestión de Inventario (NS)** | Conversión via `location.state` + `postEmisionOrdenVenta` para atender OV/NV | ✅ Funcional |
| **Catálogo de Artículos** | `useProductStore.getState()` para validar/reservar/descontar stock | ✅ Funcional |
| **Configuración del Sistema** | Series, almacenes, salesPreferences via `useConfigurationContext` | ✅ Funcional |
| **Cobranzas** | No hay integración directa. Las CxC son generadas por Comprobantes. | N/A |
| **Caja** | No hay integración directa. | N/A |
| **Guías de Remisión** | `guiaRemision` es un campo de texto libre en `CamposOpcionalesDocumentoComercial`, no hay módulo integrado. | ⚠️ Parcial |
| **Clientes** | Datos copiados en el momento de creación (snapshot). No hay referencia por ID al registro de cliente. | ⚠️ Sin actualización automática |

---

## 14. Calidad del código

### Duplicaciones

| Código duplicado | Ubicación | Impacto |
|---|---|---|
| `obtenerFechaHoraISO()` | `helpers.ts:33` y `postEmisionOrdenVenta.ts:41` | Bajo — strings idénticos |
| Template string columnas | `ListadoDocCom.tsx:229,239` vs `STORAGE_KEYS.COLUMNAS_PREFIJO` | Bajo — inconsistencia de constante |

### Código muerto

| Elemento | Archivo | Línea |
|---|---|---|
| `COLUMNAS_DEFAULT_LISTADO` | `documentoComercial.constants.ts` | 91-101 |
| `STORAGE_KEYS.BORRADOR_APP` | `documentoComercial.constants.ts` | 84 |
| `'Reservada'` en array puedeEditar | `ListadoDocumentosComerciales.tsx` | 163 |
| `'Aprobada'` en array puedeEditar | `ListadoDocumentosComerciales.tsx` | 163 |

### Hardcodeos relevantes

| Valor | Ubicación | Justificación |
|---|---|---|
| `'documentos_comerciales_v1'` | `postEmisionOrdenVenta.ts:19` y `constants.ts:81` | Aceptable como clave de versión; no alineada con constante en postEmision |
| `'documentos_comerciales_changed'` | `postEmisionOrdenVenta.ts:20` y `DocumentosComercialesContext.tsx:66` | Aceptable pero no centralizado; si difieren, el evento no llega |
| `0.001` en `calcularDesgloseTributos` | `helpers.ts:176` | Valor mágico de filtro de tributos |
| `14` (TTL borradores días) | `constants.ts:89` | Constante nombrada — OK |

### Deuda técnica conocida

| Deuda | Archivo | Nota en código |
|---|---|---|
| Provider/hook en mismo archivo | `DocumentosComercialesContext.tsx:1` | `// split diferido` |
| Suppressores exhaustive-deps | `FormularioDocCom.tsx:114,149`, `FormularioHeader.tsx:138`, `DocumentosCom.tsx:32` | Intencionales y documentados |
| `any[]` masivo | `postEmisionOrdenVenta.ts` | 10+ instancias con `eslint-disable` |

### Complejidad

| Componente | Líneas | Responsabilidades | Testabilidad |
|---|---|---|---|
| `ListadoDocumentosComerciales` | 1488 | ~12 | Muy baja |
| `useDocumentoComercialActions` | 964 | ~16 acciones | Media (pura lógica, sin JSX) |
| `postEmisionOrdenVenta` | 752 | ~10 funciones | Baja (any[], localStorage) |
| `FormularioDocumentoComercial` | ~450 | ~8 | Media |

---

## 15. Seguridad y aislamiento de datos

| Aspecto | Estado | Riesgo |
|---|---|---|
| Datos en consola | Solo `console.error` en catch — sin PII expuesta | Bajo |
| Tokens/credenciales hardcodeadas | No se encontraron | — |
| Filtro por establecimiento | `establecimientoId` se guarda en el documento pero **no se filtra en el listado** | Medio |
| Filtro por empresa | No verificable sin datos multi-empresa en localStorage | No verificable |
| Acciones protegidas solo visualmente | Los guards están en frontend. Sin backend, no hay RBAC real | Medio (conocido) |
| Manipulación de IDs | Sin backend, cualquier ID puede modificarse en localStorage | Bajo (prototipo) |
| Datos corruptos en localStorage | `cargarDocumentosDesdeStorage` retorna `[]` ante JSON inválido — seguro | — |
| Inyección HTML | Los datos se renderizan como texto, no como HTML | Bajo |
| Datos multi-establecimiento en contexto | El contador de tabs no filtra por establecimiento | Bajo (UI confusa) |

---

## 16. Experiencia de usuario y accesibilidad

| Aspecto | Estado |
|---|---|
| Estado de carga inicial | Sincrónico (localStorage) — sin spinner necesario |
| Estado de carga operaciones | Sin loading state visible en formulario. Operaciones son síncronas (localStorage) — riesgo de doble clic bajo. |
| Mensajes de error comprensibles | ✅ El módulo de `useFeedback` proporciona toast errors/warnings |
| Confirmaciones antes de anular | ✅ Modal de confirmación con campo de motivo obligatorio |
| Protección ante doble guardado | Aceptable — navegación inmediata post-guardado, no hay async gap |
| Pérdida de cambios | ✅ Borrador auto-save previene pérdida |
| Cancelación de formulario | ✅ `handleCancelar` limpia borrador y navega |
| Estado vacío | ✅ Mensaje y botón de acción |
| Tablas en resolución pequeña | `overflow-x-auto` aplicado — OK |
| Labels en campos | Verificable solo en runtime |
| Consistencia visual entre tabs | ✅ Mismo componente `ListadoDocumentosComerciales` |
| Botones disponibles pero no funcionales | No detectados |
| `key={idx}` en listas React | Historial (idx 1330) y comentarios (idx 1390) — bajo riesgo para listas append-only |

---

## 17. Cobertura de pruebas

### Pruebas existentes

| Módulo | Archivos de test |
|---|---|
| Documentos Comerciales | **0** |
| gestion-inventario | `stockAlerts.test.ts` (1 archivo, no relacionado) |
| Resto del proyecto | 0 adicionales encontrados |

### Casos no cubiertos (sin tests)

- Estados y transiciones de cotización
- Validaciones del formulario
- Cálculo de tributos (`calcularDesgloseTributos`)
- Reserva de stock (flujo completo)
- Correlativo seguro (incluyendo race condition)
- Cascadas de anulación
- Normalización de estados legacy
- Comparador comercial

### Pruebas manuales recomendadas antes de integrar

1. ✅ Crear COT, marcar Aceptada, convertir a NV → verificar trazabilidad bidireccional
2. ✅ Crear OV con stock insuficiente → verificar rechazo correcto
3. ✅ Crear OV, generar comprobante (modo nota_salida), generar NS → verificar OV queda 'Atendida'
4. ⚠️ Crear OV, generar comprobante (modo nota_salida), intentar anular OV → verificar si se bloquea (actualmente NO se bloquea — DC-OV-P1-001)
5. ✅ Crear NV modo automático, anularla → verificar que el stock se repone en el catálogo
6. ✅ Crear COT, convertir a OV, anular la OV → verificar que COT vuelve a 'Aceptada'
7. ✅ Abrir el módulo en 2 pestañas simultáneamente y crear documentos → verificar si hay correlativos duplicados (DC-GLOBAL-P1-003)
8. ✅ Crear COT con fecha de vencimiento pasada → verificar que al entrar al tab aparece como 'Vencida'
9. ✅ Crear documento, recargar la página → verificar que los datos persisten correctamente
10. ✅ Borrador: rellenar formulario, salir, volver → verificar restauración del borrador

---

## 18. Hallazgos consolidados

### P1 — Alto (5)

---

**DC-OV-P1-001** | Tab: Orden de Venta | Anulación de OV en 'Pendiente de salida' sin revertir comprobante emitido

*Evidencia*: `ListadoDocumentosComerciales.tsx:167-175` (puedeAnular), `useDocumentoComercialActions.ts:539-554` (anularDocumento libera stock de 'Pendiente de salida'), `postEmisionOrdenVenta.ts:413-418` (estado 'Pendiente de salida' definido).

*Flujo*: OV → Comprobante → OV queda 'Pendiente de salida' → Anular OV → Stock liberado, comprobante sigue emitido.

*Comportamiento actual*: Anulación permitida sin advertencia.

*Comportamiento esperado*: Bloquear anulación o alertar que hay un comprobante emitido que debe anularse primero.

*Recomendación*: Agregar `'Pendiente de salida'` a la lista de estados no anulables en `puedeAnular`.

**Bloquea entrega: SÍ**

---

**DC-OV-P1-002** | Tab: Orden de Venta | Editar OV en 'Atendida parcialmente' no actualiza reservas de stock

*Evidencia*: `ListadoDocumentosComerciales.tsx:161-164` (puedeEditar), `useDocumentoComercialActions.ts:472-521` (actualizarDocumento sin lógica stock para OV).

*Flujo*: OV parcialmente atendida → editar cantidades → guardar → stock reservado queda con valores originales.

*Recomendación*: Bloquear edición de OV en 'Atendida parcialmente' (como se hace con 'Reservada') o implementar lógica de ajuste de reserva.

**Bloquea entrega: SÍ**

---

**DC-GLOBAL-P1-003** | Global | Correlativo no atómico — riesgo de duplicados con múltiples pestañas

*Evidencia*: `useDocumentoComercialActions.ts:186-191` (`generarCorrelativoSeguro` lee `state.documentos` en memoria), `documentoComercial.helpers.ts:41-64`.

*Comportamiento*: Dos pestañas en el mismo instante calcularían el mismo correlativo máximo y ambas generarían el mismo número.

*Recomendación*: En la fase frontend-only es difícil de resolver sin un backend. Documentar como limitación conocida o agregar un timestamp al correlativo temporal.

**Bloquea entrega: Sí** (en contexto de uso real con múltiples usuarios).

---

**DC-GLOBAL-P1-004** | Shared postEmision | `any[]` masivo sin validación de esquema en localStorage

*Evidencia*: `postEmisionOrdenVenta.ts:131-132, 176-177, 205-206, 241-242, 297-298, 361-362, 461-462, 523-524, 595-596, 651-652, 706-707` — 10+ instancias de `const documentos: any[] = JSON.parse(raw)`.

*Riesgo*: Si el formato de los documentos en localStorage cambia (nueva propiedad, tipo diferente), las funciones aplican actualizaciones sobre estructura desconocida. Un catch solo previene la excepción, no la corrupción parcial.

*Recomendación*: Aplicar validación Zod o similar al parsear el array, o al menos verificar que el elemento encontrado tenga las propiedades mínimas esperadas antes de mutarlo.

**Bloquea entrega: Sí** (riesgo de producción si el schema evoluciona).

---

**DC-COT-P1-004** | Tab: Cotización | N re-renders y N escrituras localStorage al evaluar vencimientos

*Evidencia*: `useDocumentoComercialActions.ts:851-878` — `forEach` con `actualizarEnContext` individual. `DocumentosComercialesContext.tsx:73-75` — `useEffect` que escribe en LS ante cada cambio de estado.

*Recomendación*: Procesar todas las cotizaciones vencidas en un único dispatch `ESTABLECER_DOCUMENTOS`.

**Bloquea entrega: No** (degradación de rendimiento, no pérdida de datos).

---

### P2 — Medio (11)

| ID | Descripción | Archivo | Línea | Bloquea |
|---|---|---|---|---|
| DC-GLOBAL-P2-001 | 4 supresores `eslint-disable react-hooks/exhaustive-deps` sin documentación de todas las omisiones | FormularioDC:114,149; FormularioHeader:138; DocComerciales:32 | — | No |
| DC-GLOBAL-P2-002 | `obtenerFechaHoraISO()` duplicada | helpers.ts:33 y postEmision.ts:41 | — | No |
| DC-GLOBAL-P2-003 | `COLUMNAS_DEFAULT_LISTADO` sin uso (dead code) | constants.ts:91-101 | — | No |
| DC-GLOBAL-P2-004 | `STORAGE_KEYS.COLUMNAS_PREFIJO` no usado en Listado (literal en su lugar) | constants.ts:83 vs Listado:229 | — | No |
| DC-GLOBAL-P2-005 | `ListadoDocumentosComerciales` monolítico (1488 líneas) | ListadoDC.tsx | 1-1488 | No |
| DC-GLOBAL-P2-006 | `key={idx}` en listas de historial y comentarios | ListadoDC.tsx:1330, 1390 | — | No |
| DC-COT-P2-007 | `sincronizarCotizacionDesdeDocumento` sobreescribe cotización silenciosamente | useActions.ts:912-943 | — | No |
| DC-OV-P2-008 | Dead code en array `puedeEditar` ('Reservada', 'Aprobada' para no-COT) | ListadoDC.tsx:163 | — | No |
| DC-GLOBAL-P2-009 | `STORAGE_KEYS.BORRADOR_APP` no usado directamente | constants.ts:84 | — | No |
| DC-NV-P2-010 | Columna "Doc. relacionado" no muestra cotización origen de NV/OV | ListadoDC.tsx:244-246 | — | No |
| DC-GLOBAL-P2-011 | Chunk 3 343 KB — warning de build | dist/ | — | No |

### P3 — Bajo (4)

| ID | Descripción | Archivo | Bloquea |
|---|---|---|---|
| DC-GLOBAL-P3-001 | Cero tests unitarios para el módulo completo | Todos | No |
| DC-OV-P3-002 | Estados legacy OV excluidos de filtros de UI | constants.ts:64-72 | No |
| DC-GLOBAL-P3-003 | `BORRADOR_EN_PROGRESO_VERSION=1` sin lógica de migración de schema | constants.ts:87 | No |
| DC-GLOBAL-P3-004 | `contarPorTipo` no filtra por establecimiento activo | DocumentosComerciales.tsx:34-35 | No |

---

## 19. Plan de corrección recomendado

### Bloqueantes antes de entregar

1. **DC-OV-P1-001** — Agregar `'Pendiente de salida'` a los estados terminales de anulación en `puedeAnular` para OV. Una línea de cambio en `ListadoDocumentosComerciales.tsx`.

2. **DC-OV-P1-002** — Bloquear edición de OV en 'Atendida parcialmente'. Modificar `puedeEditar` para excluir ese estado de forma explícita.

3. **DC-GLOBAL-P1-003** — Documentar la limitación del correlativo multi-pestaña como restricción conocida del prototipo frontend, o agregar un mecanismo de exclusión mútua básico (timestamp de sesión).

4. **DC-GLOBAL-P1-004** — Agregar validación mínima de esquema en `postEmisionOrdenVenta.ts` (verificar que el elemento es un objeto con `tipo`, `id` y `estado` antes de mutarlo).

### Necesarias antes de producción

5. **DC-COT-P1-004** — Refactorizar `evaluarVencimientosCotizaciones` para un único dispatch batch.
6. **DC-NV-P2-010** — Actualizar `resolverDocumentoRelacionadoNumero` para mostrar origen o destino según cuál esté disponible.
7. **DC-GLOBAL-P2-004** — Usar la constante `STORAGE_KEYS.COLUMNAS_PREFIJO` en `leerColumnasDeStorage` y `guardarColumnasEnStorage`.
8. Eliminar `COLUMNAS_DEFAULT_LISTADO` y `STORAGE_KEYS.BORRADOR_APP` no usados.

### Mejoras posteriores

9. **DC-GLOBAL-P2-005** — Dividir `ListadoDocumentosComerciales` en componentes más pequeños.
10. **DC-GLOBAL-P3-001** — Crear suite de tests unitarios para `helpers.ts`, `calcularDesgloseTributos`, `generarCorrelativoSeguro`, `evaluarVencimientosCotizaciones`, estados de acciones.
11. **DC-COT-P2-007** — Hacer `sincronizarCotizacionDesdeDocumento` opt-in o al menos notificarlo al usuario.
12. Aplicar validación Zod al parseo completo de documentos en `postEmisionOrdenVenta.ts`.

---

## 20. Riesgos de integración

| Riesgo | Severidad | Descripción |
|---|---|---|
| Correlativos duplicados | Alto | El backend real asignará su propio correlativo; los números generados en frontend no serán los definitivos. Sin embargo, si el frontend envía el número como referencia, pueden colisionar. |
| `any[]` en postEmision | Alto | Al refactorizar para API real, el JSON del backend puede diferir del schema actual de localStorage. Las funciones `actualizarOrdenVentaPostEmision` etc. necesitarán adaptadores tipados. |
| Dual-write con evento DOM | Medio | En producción, el flujo de "contexto escucha evento DOM" debe reemplazarse por invalidación de caché de API o subscripciones. El evento `documentos_comerciales_changed` no existe en el mundo de APIs REST. |
| Stock via Zustand store | Alto | El inventario actualmente vive en Zustand (`useProductStore`). Con backend real, el stock vendrá de una API. Toda la lógica de `servicioReservaStock.ts` deberá migrar a llamadas de API; los `getState()` inline no funcionarán. |
| localStorage como DB | Alto | Todo el módulo usa localStorage. Con backend, los `cargarDocumentosDesdeStorage` / `guardarDocumentosEnStorage` son la capa a reemplazar. La arquitectura del contexto (useReducer + storage) está bien preparada para este reemplazo. |
| Clientes sin ID referenciado | Medio | El `clienteId` en `ClienteDocumentoComercial` es opcional. Si el backend requiere un ID válido de cliente, los documentos generados sin clienteId válido necesitarán migración. |
| Crédito/cuotas no transferido a OV→Comprobante | Bajo | `construirCargaConversionDesdeOV` pasa `terminosCredito: null`. Si el proceso de negocio requiere que las cuotas de la OV se hereden al comprobante, esto debe corregirse. |

---

## 21. Checklist final de preparación

| Criterio | Estado | Evidencia |
|---|---|---|
| Build de producción sin errores | ✅ CUMPLE | `npm run build` pasa (21.6 s) |
| TypeScript sin errores | ✅ CUMPLE | `tsc -b` pasa |
| ESLint sin errores | ✅ CUMPLE | `npm run lint` pasa |
| Sin console.log innecesarios | ✅ CUMPLE | 0 en módulo DC |
| Sin código comentado | ✅ CUMPLE | — |
| Flujo COT completo e íntegro | ✅ CUMPLE | — |
| Flujo OV completo e íntegro | ❌ NO CUMPLE | DC-OV-P1-001, DC-OV-P1-002 |
| Flujo NV completo e íntegro | 🟡 PARCIAL | DC-NV-P2-NV001 (P2) |
| Reservas de stock consistentes | 🟡 PARCIAL | OV 'Atendida parcialmente' editable sin ajuste |
| Trazabilidad correcta (COT) | ✅ CUMPLE | — |
| Trazabilidad correcta (OV/NV) | 🟡 PARCIAL | Origen COT no visible en columna listado |
| Sin datos mock en lógica real | ✅ CUMPLE | — |
| Correlativo único (multi-tab) | ❌ NO CUMPLE | DC-GLOBAL-P1-003 |
| Validación de schema en persistencia | ❌ NO CUMPLE | DC-GLOBAL-P1-004 (any[] sin schema) |
| Integración COT→Comprobante funcional | ✅ CUMPLE | — |
| Integración OV→Comprobante funcional | ✅ CUMPLE | — |
| Integración NV→Comprobante funcional | ✅ CUMPLE | — |
| Integración OV→NS funcional | ✅ CUMPLE | — |
| Integración NV→NS funcional (nota_salida) | ✅ CUMPLE | — |
| Reversión COT tras anular Comprobante | ✅ CUMPLE | `restaurarCotizacionPostAnulacion` |
| Reversión COT tras anular NV/OV | ✅ CUMPLE | cascade en `anularDocumento` |
| Reversión NV tras anular Comprobante | ✅ CUMPLE | `restaurarNVPostAnulacionComprobante` |
| Tests unitarios | ❌ NO CUMPLE | 0 archivos de test |
| Permisos/roles verificados | ❌ NO VERIFICABLE | Sin guards de ruta implementados |
| Filtrado por establecimiento en listado | ❌ NO CUMPLE | `contarPorTipo` sin filtro |
| Componentes de tamaño manejable | 🟡 PARCIAL | Listado: 1488 líneas |

---

## 22. Veredicto final

### 🔴 NO LISTO PARA ENTREGA E INTEGRACIÓN

---

### Respuestas a las preguntas obligatorias

**1. ¿Cotizaciones está listo?**

🟡 **Listo con observaciones**. Los estados, transiciones, conversiones y reversiones son correctos. Los únicos hallazgos son P1 de rendimiento (batch vencimientos — DC-COT-P1-004) y P2 de UX. Si se acepta el P1 como deuda inmediata, Cotizaciones puede entregarse.

**2. ¿Órdenes de Venta está listo?**

🔴 **No listo**. Dos P1 bloquean:
- DC-OV-P1-001: OV en 'Pendiente de salida' puede anularse sin revertir el comprobante.
- DC-OV-P1-002: Editar OV en 'Atendida parcialmente' no ajusta reservas de stock.

**3. ¿Notas de Venta está listo?**

🟡 **Listo con observaciones**. El flujo principal (generar, convertir, anular, modos de stock) está implementado correctamente. El hallazgo P2 de stock en edición (DC-NV-P2-NV001) es de baja frecuencia. Puede entregarse si se documenta la limitación.

**4. ¿Los componentes compartidos están listos?**

🟡 **Mayormente sí**. El formulario, el contexto, los hooks de acciones y de estado son correctos. `postEmisionOrdenVenta.ts` necesita validación de schema (P1). `ListadoDocumentosComerciales` es funcional pero monolítico (P2).

**5. ¿El módulo completo está desacoplado?**

🟡 **Parcialmente**. La separación modelo/contexto/acciones/helpers es buena. El acoplamiento fuerte con `useProductStore` (Zustand) y la arquitectura de evento DOM (`documentos_comerciales_changed`) crean dependencias que deberán refactorizarse al integrar con backend real.

**6. ¿Puede entregarse al desarrollador sin ajustes previos?**

🔴 **No**. Requiere al menos cerrar DC-OV-P1-001 y DC-OV-P1-002 antes de entregar OV, y documentar DC-GLOBAL-P1-003 y DC-GLOBAL-P1-004.

**7. ¿Qué puntos bloquean la entrega?**

1. OV en 'Pendiente de salida' anulable sin revertir comprobante (DC-OV-P1-001).
2. Edición de OV 'Atendida parcialmente' sin ajuste de stock (DC-OV-P1-002).
3. Correlativo no atómico (DC-GLOBAL-P1-003) — documentar o mitigar.
4. `any[]` sin validación de schema en `postEmisionOrdenVenta.ts` (DC-GLOBAL-P1-004).

**8. ¿Qué riesgos podrían aparecer al integrarlo con el backend oficial?**

- Toda la lógica de stock (Zustand `getState()`) deberá migrarse a llamadas API.
- El dual-write via evento DOM deberá reemplazarse por invalidación de caché.
- Los correlativos generados por el frontend son temporales y serán reemplazados por los del backend.
- El `any[]` de `postEmisionOrdenVenta` necesita ser reemplazado por DTOs tipados provenientes de la API.

**9. ¿Qué pruebas manuales siguen pendientes?**

- Verificar bloqueo de anulación de OV en 'Pendiente de salida' (una vez corregido DC-OV-P1-001).
- Probar la reserva de stock con múltiples OVs sobre el mismo producto.
- Probar vencimiento automático de cotizaciones con 20+ documentos.
- Probar apertura simultánea en dos pestañas y verificar correlativos (documentar el comportamiento actual).
- Probar migración de documentos legacy ('Generada' → 'Vigente') cargando datos viejos en localStorage.

**10. ¿Cuál es la recomendación final?**

Corregir DC-OV-P1-001 y DC-OV-P1-002 (cambios de 1-3 líneas cada uno), documentar DC-GLOBAL-P1-003 como limitación conocida del prototipo, y agregar validación mínima de schema en `postEmisionOrdenVenta.ts`. Con esos cuatro puntos cerrados, el módulo puede entregarse para integración con las advertencias documentadas de esta auditoría.
