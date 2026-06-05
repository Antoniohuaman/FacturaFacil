# AUDITORÍA TÉCNICA EXHAUSTIVA — NOTA DE INGRESO (INVENTARIO)

> **Proyecto:** SenciYo / FacturaFacil  
> **Fecha:** 2026-06-04  
> **Rama activa:** `DetraccionParte2`  
> **Auditor:** Claude Sonnet 4.6 (Arquitecto Senior Frontend/Funcional)  
> **Estado:** SOLO AUDITORÍA — Ninguna línea de código fue modificada

---

## 1. RESUMEN EJECUTIVO

La **Nota de Ingreso (NI)** es un documento interno de inventario que registra entradas físicas de mercadería al almacén. No es un comprobante SUNAT, no afecta caja, cobranzas ni POS.

La arquitectura actual de `gestion-inventario` está **muy bien preparada** para soportar esta funcionalidad:
- El `InventoryService.registerAdjustment()` con `tipo: 'ENTRADA'` ya realiza la operación de fondo correcta.
- El `StockRepository` con sistema de eventos ya proporciona la infraestructura de persistencia.
- El sistema de series ya contempla documentos internos (NV, COT, OV) y se puede extender para NI.
- Los componentes reutilizables (`exportDatasetToExcel`, `VoidInvoiceModal`, `ServicioImpresionComprobante`) reducen significativamente el trabajo.

**Riesgo principal identificado:** La Nota de Ingreso opera sobre múltiples líneas de productos por documento, mientras que el `InventoryService` actual procesa un producto a la vez. Se necesitará una función de orquestación que procese todas las líneas en transacción atómica.

**Estimación de complejidad:** Media-alta. El modelo de datos, la integración con inventario y el formulario multi-línea son las piezas más complejas.

---

## 2. DÓNDE DEBE VIVIR LA NOTA DE INGRESO

### Ubicación recomendada: Tab nuevo en `gestion-inventario`

**Ruta del módulo:**
```
apps/senciyo/src/pages/Private/features/gestion-inventario/
```

**Ruta de la nueva sección:**
```
apps/senciyo/src/pages/Private/features/gestion-inventario/
  ├── components/
  │   └── notas-ingreso/              ← NUEVA CARPETA
  │       ├── NotasIngresoPanel.tsx   ← Lista/gestión
  │       ├── FormularioNotaIngreso.tsx
  │       ├── DetalleNotaIngreso.tsx
  │       └── HistorialNotaIngreso.tsx
  ├── models/
  │   └── notaIngreso.types.ts        ← NUEVO ARCHIVO
  ├── repositories/
  │   └── notaIngreso.repository.ts   ← NUEVO ARCHIVO
  ├── services/
  │   └── notaIngreso.service.ts      ← NUEVO ARCHIVO (orquestador)
  └── hooks/
      └── useNotasIngreso.ts          ← NUEVO HOOK
```

### ¿Tab o subruta?

**Recomendación: Tab nuevo** (consistente con el patrón actual).

La `InventoryPage.tsx` implementa un sistema de tabs con `selectedView: InventoryView`. Agregar `'notas-ingreso'` al union type extiende el sistema sin romper nada:

```typescript
// models/inventory.types.ts — línea 145 actual:
export type InventoryView = 'situacion' | 'movimientos' | 'transferencias' | 'alertas' | 'importar';

// Propuesta (solo auditoría, no implementar aún):
export type InventoryView = 'situacion' | 'movimientos' | 'transferencias' | 'alertas' | 'importar' | 'notas-ingreso';
```

**Justificación para tab (no subruta):**
- Los demás paneles (Transferencias, Alertas, Importar) son tabs complejos con estado propio, igual que NI.
- Las subrutas implicarían cambiar el router (`privateRoutes.tsx`) y agregar permisos adicionales.
- Los formularios complejos (nuevo/editar NI) pueden abrirse como drawers o páginas dentro del panel, igual que hace `TransferenciasPanel` con `DetalleTransferencia`.

---

## 3. ARQUITECTURA ACTUAL DE INVENTARIO / CONTROL STOCK

### Árbol de componentes activo

```
InventoryPage.tsx                        ← Página principal, orquesta tabs
  ├── [tab: situacion]   → InventarioSituacionPage.tsx
  │     └── DisponibilidadTable.tsx, DisponibilidadToolbarEnhanced.tsx
  ├── [tab: movimientos] → MovementsTable.tsx
  ├── [tab: transferencias] → TransferenciasPanel.tsx
  │     ├── DetalleTransferencia.tsx
  │     └── ConfirmacionAnulacion.tsx
  ├── [tab: alertas]     → AlertsPanel.tsx
  ├── [tab: importar]    → PanelImportacionStock.tsx
  ├── [modal] AdjustmentModal.tsx
  └── [modal] TransferModal.tsx
```

### Hook maestro

`useInventory.ts` (~600 líneas) centraliza:
- Estado de vista activa (`selectedView`)
- Movimientos filtrados
- Transferencias
- Alertas de stock
- Handlers de todas las operaciones (ajuste, transferencia, etc.)
- Permisos RBAC

### Stores

`usePreferenciasDisponibilidad.ts` (Zustand + persist) — preferencias de tabla, columnas, vistas.

### Rutas afectadas

```
/inventario  →  InventoryPage  (privateRoutes.tsx)
Permisos: inventario.ver | inventario.ajustar | inventario.transferir
```

---

## 4. ARQUITECTURA ACTUAL DE MOVIMIENTOS / KARDEX / STOCK REAL

### Flujo de un movimiento de stock

```
[Acción del usuario]
       ↓
useInventory.ts :: handleStockAdjustment(data)
       ↓
InventoryService.registerAdjustment(product, almacen, data, usuario)
       ↓  (calcula nuevo stock)
InventoryService.updateStock(product, almacenId, nuevoStock)
       → Retorna Product con stockPorAlmacen[almacenId] actualizado
       ↓  (crea registro Kardex)
StockRepository.addMovement(movement: MovimientoStock)
       → Persiste en localStorage con clave tenant-aware
       → Emite evento: 'facturafacil:stock-movements-changed'
       ↓
[UI se actualiza escuchando el evento]
```

### Tipos de movimiento existentes

```typescript
// inventory.types.ts líneas 6-13
type MovimientoTipo =
  | 'ENTRADA'          // ← Nota de Ingreso usaría este
  | 'SALIDA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'DEVOLUCION'
  | 'MERMA'
  | 'TRANSFERENCIA';
```

### Motivos de movimiento existentes

```typescript
// inventory.types.ts líneas 18-30
type MovimientoMotivo =
  | 'COMPRA'              // ← Mapea a tipo 02: Compra nacional
  | 'VENTA'
  | 'AJUSTE_INVENTARIO'   // ← Mapea a tipo 28: Ajuste por diferencia
  | 'DEVOLUCION_CLIENTE'  // ← Mapea a tipo 24: Devolución del cliente
  | 'DEVOLUCION_PROVEEDOR'
  | 'PRODUCTO_DAÑADO'
  | 'PRODUCTO_VENCIDO'
  | 'ROBO_PERDIDA'
  | 'TRANSFERENCIA_ALMACEN' // ← Mapea a tipo 21: Transferencia entre almacenes
  | 'PRODUCCION'           // ← Mapea a tipo 19: Entrada de producción
  | 'MERMA'
  | 'OTRO';
```

**Diagnóstico:** Los motivos actuales cubren ~5 de los 14 tipos de ingreso requeridos. El resto necesita motivos nuevos o mapeo al valor `'OTRO'` temporalmente. Se recomienda extender `MovimientoMotivo` con valores específicos para NI.

---

## 5. CÓMO SE CALCULA STOCK REAL, RESERVADO Y DISPONIBLE ACTUALMENTE

### Almacenamiento en el producto

```typescript
// En el modelo Product (catalogo-articulos):
product.stockPorAlmacen: Record<string, number>         // stock REAL por almacén
product.stockReservadoPorAlmacen: Record<string, number> // stock RESERVADO por almacén
```

### Cálculo en InventoryService

```typescript
// inventory.service.ts líneas 26-43
static getStock(product, almacenId): number
  → product.stockPorAlmacen?.[almacenId] ?? 0

static getReservedStock(product, almacenId): number
  → Math.max(0, product.stockReservadoPorAlmacen?.[almacenId] ?? 0)
```

### Cálculo de disponible en useInventarioDisponibilidad

```typescript
// líneas 176-244 (aproximado)
real     = Σ InventoryService.getStock(product, almacenId) por almacén en scope
reservado = Math.min(rawReservado, Math.max(real, 0))   // no puede superar el real
disponible = Math.max(0, real - reservado)
```

**Invariante crítica:** `disponible = real - reservado`. La Nota de Ingreso solo toca `stockPorAlmacen` (real). Nunca toca `stockReservadoPorAlmacen`.

---

## 6. CÓMO DEBE IMPACTAR LA NOTA DE INGRESO

### Al generar (estado: Borrador → Generada)

Para **cada línea de producto** en la NI:

```
stockPorAlmacen[almacenDestinoId] += cantidad
```

Registrar en Kardex:
```typescript
MovimientoStock {
  tipo: 'ENTRADA',
  motivo: // mapeo del tipo de ingreso de la NI
  documentoReferencia: // número NI (ej: "NI01-00000001")
  // ... resto de campos estándar
}
```

### Al anular (estado: Generada → Anulada)

Para **cada línea de producto** en la NI:

```
stockPorAlmacen[almacenDestinoId] -= cantidad  (validando que no quede negativo)
```

Registrar en Kardex:
```typescript
MovimientoStock {
  tipo: 'SALIDA',      // movimiento inverso
  motivo: 'AJUSTE_INVENTARIO',  // o un nuevo motivo 'ANULACION_NI'
  documentoReferencia: "ANULACION NI01-00000001",
  observaciones: motivoAnulacion
}
```

### Lo que NO debe tocar

- `stockReservadoPorAlmacen` — jamás
- Módulo de caja (`control-caja`)
- Módulo de cobranzas (`gestion-cobranzas`)
- Comprobantes electrónicos (`comprobantes-electronicos`)
- POS (`punto-venta`)
- Ningún endpoint SUNAT

---

## 7. SERIES: ESTADO ACTUAL Y CÓMO AGREGAR NI01

### Estado actual del sistema de series

**Archivos clave:**
- `configuracion-sistema/modelos/Series.ts` — interfaz `Series` y `DocumentType`
- `configuracion-sistema/utilidades/catalogoSeries.ts` — catálogo de tipos
- `configuracion-sistema/utilidades/seriesPredeterminadas.ts` — series por defecto
- `configuracion-sistema/hooks/useSeries.ts` — CRUD de series
- `configuracion-sistema/hooks/useComandosSeries.ts` — incremento de correlativo
- `configuracion-sistema/contexto/ContextoConfiguracion.tsx` — estado global
- Clave localStorage: `config_series_v1_{tenantId}`

### Tipos de documento internos existentes

| Código | ID    | Categoría       | Prefijo | Ejemplo    |
|--------|-------|-----------------|---------|------------|
| NV     | 'NV'  | SALES_NOTE      | NV      | NV01-00000001 |
| COT    | 'COT' | QUOTATION       | COT     | COT1-00000001 |
| OV     | 'OV'  | SALE_ORDER      | OV      | OV01-00000001 |
| RC     | 'RC'  | COLLECTION      | C       | C001-00000001 |

### Cómo agregar NI como tipo de documento

1. **Agregar en `DocumentType.category`** (Series.ts línea 69):
   ```typescript
   category: 'INVOICE' | 'RECEIPT' | 'CREDIT_NOTE' | 'DEBIT_NOTE' | 'GUIDE' |
             'QUOTATION' | 'SALES_NOTE' | 'COLLECTION' | 'STOCK_ENTRY' | 'OTHER';
   //                                                      ↑ NUEVO
   ```

2. **Agregar en el catálogo** (catalogoSeries.ts):
   ```typescript
   // Solo auditoría — no implementar aún
   {
     id: 'NI',
     code: 'NI',
     name: 'Nota de Ingreso',
     shortName: 'NI',
     category: 'STOCK_ENTRY',
     properties: {
       affectsTaxes: false,
       requiresCustomerRuc: false,
       requiresCustomerName: false,
       allowsCredit: false,
       requiresPaymentMethod: false,
       canBeVoided: true,
       canHaveCreditNote: false,
       canHaveDebitNote: false,
     },
     sunatConfiguration: {
       isElectronic: false,
       mustReportToSunat: false,
       // ...
     }
   }
   ```

3. **Agregar serie predeterminada** (seriesPredeterminadas.ts):
   ```typescript
   // Por defecto: NI01, correlativo 8 dígitos, autoIncrement true
   ```

4. **Agregar en ConfiguracionSeries.tsx** — un nuevo bloque de configuración para el tipo NI.

5. **Formato del número:** `NI01-00000001` (igual que NV01-00000001, usando `padStart(8, '0')`).

6. **Validación de formato de serie:** 4 caracteres alfanuméricos (regex: `^[A-Z0-9]{4}$`), sin restricción de prefijo obligatorio (igual que Nota de Venta).

### Cómo se incrementa el correlativo

```typescript
// useComandosSeries.ts
incrementSeriesCorrelative(seriesId, nextCorrelative)
  → Actualiza correlativeNumber + statistics
  → Persiste en ContextoConfiguracion
  → Persiste en localStorage
```

---

## 8. COMPONENTES REUTILIZABLES

### Reutilizables directamente (sin modificación)

| Componente / Servicio | Ruta | Uso en NI |
|----------------------|------|-----------|
| `exportDatasetToExcel` | `src/shared/export/exportToExcel.ts` | Exportar lista de NIs a Excel |
| `ServicioImpresionComprobante` | `src/shared/impresion/ServicioImpresionComprobante.ts` | Impresión A4 (ver sección 15) |
| `EstadoDocumentoBadge` | `documentos-comerciales/components/EstadoDocumentoBadge.tsx` | Badge de estado NI |
| `VoidInvoiceModal` (adaptar) | `comprobantes-electronicos/.../VoidInvoiceModal.tsx` | Modal anulación con motivo |
| `usePreferenciasDisponibilidad` (como referencia) | `gestion-inventario/stores/` | Patrón para store de preferencias de tabla |

### Reutilizables con adaptación ligera

| Componente | Adaptación requerida |
|-----------|---------------------|
| `clienteLookupService` (buscar por RUC/DNI) | Adaptar para buscar proveedor, no cliente |
| `useProductSearch` | Reutilizable, limitar a `tipoProducto: 'BIEN'` |
| `ProductSelector` | Reutilizable, filtrar servicios |
| `TablaVentaLibre` (para productos en formulario) | Adaptar columnas: quitar precio venta, agregar costo |
| Selector de almacén (en `AdjustmentModal`) | Extraer como componente independiente |
| Selector de moneda (en comprobantes) | Reutilizable, mismo patrón |
| Filtros de período/almacén (en `InventoryPage`) | Copiar patrón para toolbar de lista NI |

### NO reutilizar (riesgo de acoplamiento con SUNAT)

- `comprobanteValidation.ts` — tiene validaciones SUNAT
- `comprobantePricing.ts` — tiene lógica de IGV/SUNAT
- `SelectorModoEmision` — exclusivo de comprobantes electrónicos
- `PaymentMethodModal` — acoplado a caja/POS
- `CobranzaModal` — acoplado a cobranzas

---

## 9. CAMPOS REQUERIDOS PARA LA LISTA (VISTA LISTADO)

| # | Campo | Tipo | Ordenable | Filtrable |
|---|-------|------|-----------|-----------|
| 1 | N° Nota de Ingreso | string | Sí | Sí |
| 2 | Fecha documento | Date | Sí | Por rango |
| 3 | Fecha ingreso almacén | Date | Sí | Por rango |
| 4 | Tipo de ingreso | string | No | Sí (select) |
| 5 | Almacén destino | string | No | Sí (select) |
| 6 | Proveedor / Nombre | string | No | Sí (texto) |
| 7 | RUC/DNI proveedor | string | No | Sí (texto) |
| 8 | Guía de remisión | string | No | Sí (texto) |
| 9 | Total | number | Sí | No |
| 10 | Estado | badge | No | Sí (select) |
| 11 | Usuario encargado | string | No | No |
| 12 | Acciones | — | — | — |

**Acciones en tabla:**
- Ver detalle
- Editar (solo estado Borrador)
- Generar (solo estado Borrador)
- Duplicar
- Anular (solo estado Generada)
- Imprimir A4
- Exportar fila (opcional)

**Funcionalidades de lista:**
- Buscador general (número, proveedor, guía)
- Filtros: estado, almacén, tipo de ingreso, rango de fechas
- Exportar Excel (columnas visibles + filtros aplicados)
- Columnas configurables (misma arquitectura que `usePreferenciasDisponibilidad`)
- Paginado (itemsPorPagina configurable)

---

## 10. CAMPOS REQUERIDOS PARA EL FORMULARIO

### Cabecera

| Campo | Obligatorio | Fuente |
|-------|-------------|--------|
| Tipo documento (readonly: "Nota de Ingreso") | — | Constante |
| Serie | Sí | Config Series, tipo NI |
| Correlativo (auto) | Sí (auto) | Generado automáticamente |
| Número completo (NI01-00000001) | — | Calculado |
| Fecha documento | Sí | DatePicker |
| Fecha ingreso al almacén | Sí | DatePicker |
| Tipo de ingreso / motivo | Sí | Select (ver catálogo §3) |
| Almacén destino | Sí | Select desde ConfiguracionContext |
| Encargado almacén | No | Input text o select usuarios |

### Proveedor

| Campo | Obligatorio | Regla |
|-------|-------------|-------|
| RUC/DNI proveedor | Condicional* | Requerido para tipos: 02, 03, 18 |
| Nombre proveedor | Condicional* | Requerido cuando hay RUC/DNI |
| Dirección proveedor | No | Opcional |
| Buscar por RUC (SUNAT lookup) | — | Autocompletar |
| Buscar por DNI (RENIEC lookup) | — | Autocompletar |

*Regla: proveedor requerido para tipos de ingreso que implican tercero externo (02-Compra, 03-Consignación, 05-Devolución, 18-Importación, 24-Dev. cliente, 29-Préstamo, 31-Custodia).

### Documento origen

| Campo | Obligatorio | Regla |
|-------|-------------|-------|
| Documento origen | No | Texto libre |
| N° documento origen | No | Texto libre |
| Guía de remisión | No | Texto libre |
| Fecha guía de remisión | No | DatePicker |

### Condiciones comerciales

| Campo | Obligatorio | Nota |
|-------|-------------|------|
| Moneda | Sí (default PEN) | Select PEN/USD |
| Forma de pago | No | Solo referencial, no afecta caja |

### Tabla de productos

| Columna | Obligatorio | Validación |
|---------|-------------|------------|
| Producto (búsqueda) | Sí | Solo tipo BIEN (no servicios) |
| Unidad de medida | Sí | Desde catálogo producto |
| Cantidad | Sí | > 0, entero o decimal según unidad |
| Costo unitario | No* | ≥ 0 si se ingresa |
| Descuento | No | 0-100% o monto |
| Base imponible | — | Calculado |
| ISC | — | Calculado si aplica |
| Impuesto (IGV) | — | Calculado según tipo producto |
| No gravados | — | Calculado |
| Total línea | — | Calculado |

*El costo es referencial para valorización de inventario, no afecta precio de venta.

### Totales (calculados)

- Base imponible total
- Descuento total
- ISC total
- IGV total
- No gravados total
- OTC si aplica
- **TOTAL**

### Pie del formulario

| Campo | Tipo |
|-------|------|
| Observaciones | Textarea |
| Información adicional | Textarea |

### Acciones del formulario

- **Guardar borrador** — Persiste sin generar, sin tocar stock
- **Generar Nota de Ingreso** — Valida, genera, impacta stock, registra Kardex
- **Cancelar** — Descarta cambios (confirm si hay datos)

---

## 11. CAMPOS REQUERIDOS PARA EL DETALLE

### Secciones del detalle (vista de solo lectura)

1. **Encabezado:** Número NI, estado (badge), fecha, almacén, tipo de ingreso
2. **Proveedor:** RUC/DNI, nombre, dirección
3. **Documento origen:** Tipo, número, guía de remisión, fecha guía
4. **Productos:** Tabla completa (producto, unidad, cantidad, costo, total)
5. **Totales:** Desglose completo
6. **Condiciones:** Moneda, forma de pago
7. **Observaciones e información adicional**
8. **Auditoría:** Usuario creación, fecha creación, usuario generación, fecha generación
9. **Motivo anulación** (si estado = Anulada): motivo + usuario + fecha
10. **Historial** (ver §7 formulario)

---

## 12. ESTADOS RECOMENDADOS

### Tres estados base (suficientes)

| Estado | Color | Descripción | Transiciones permitidas |
|--------|-------|-------------|------------------------|
| **Borrador** | Gray | Creada sin impacto en stock | → Generada, → (eliminar) |
| **Generada** | Green | Stock ingresado al almacén | → Anulada |
| **Anulada** | Red | Revertida. Stock devuelto si hay suficiente | — (final) |

**Diagnóstico:** No se justifica agregar más estados por ahora. El flujo Borrador → Generada → Anulada es suficiente y consistente con Nota de Crédito y documentos comerciales del sistema. Un estado `EN_REVISIÓN` sería prematuro y agregaría complejidad sin valor real en este sistema.

### Reglas de transición

```
Borrador  →  Generada  : Requiere validación completa + permisos inventario.ajustar
Borrador  →  (Eliminar): Solo borradores, no genera historial Kardex
Generada  →  Anulada   : Requiere motivo + validar stock revertible + permisos
```

---

## 13. ACCIONES RECOMENDADAS

### En lista

| Acción | Estado requerido | Permiso |
|--------|-----------------|---------|
| Ver detalle | Todos | inventario.ver |
| Editar | Borrador | inventario.ajustar |
| Generar | Borrador | inventario.ajustar |
| Duplicar | Todos | inventario.ajustar |
| Anular | Generada | inventario.ajustar |
| Imprimir A4 | Generada | inventario.ver |
| Exportar Excel (lista) | — | inventario.ver |

### En detalle

- Imprimir A4
- Anular (si Generada)
- Editar (si Borrador)
- Duplicar
- Ver historial

### Duplicar: comportamiento correcto

Al duplicar:
- Copiar todos los datos de cabecera y líneas
- Asignar **nuevo correlativo** de la misma serie
- Estado: **Borrador** (nunca Generada)
- Fecha: fecha actual (no la del original)
- **NO copiar** número de NI original — el correlativo siempre es nuevo

---

## 14. REGLAS DE ANULACIÓN

### Diagnóstico de la pregunta: ¿Se debe revertir el stock?

**Respuesta: SÍ, se debe revertir el stock real, con validación.**

**Justificación:**
1. La NI es el documento que justificó el ingreso. Si se anula el documento, la entrada ya no tiene respaldo documental.
2. El sistema ya lo hace así con Transferencias (`handleAnularTransfer` revierte ambos movimientos).
3. La arquitectura actual (`InventoryService.registerAdjustment`) soporta SALIDA para revertir una ENTRADA.
4. No revertir generaría stock "fantasma" sin respaldo: mayor riesgo de inconsistencia que el de revertir.

### Algoritmo de anulación recomendado

```
Para cada línea de producto en NI:
  1. Obtener stock actual real = product.stockPorAlmacen[almacenId]
  2. Si stock actual < cantidad_ingresada → BLOQUEAR anulación con mensaje:
       "No se puede anular. El producto X tiene menos stock del que ingresó esta NI.
        Stock actual: Y, requerido revertir: Z."
  3. Si stock actual >= cantidad_ingresada → Permitir:
       - Restar cantidad del stock real
       - Registrar MovimientoStock { tipo: 'SALIDA', motivo: 'AJUSTE_INVENTARIO',
           documentoReferencia: 'ANULACION NI01-XXXXXXXX',
           observaciones: motivoAnulacion }
  4. Cambiar estado NI → 'Anulada'
  5. Registrar en historial: usuario + fecha + motivo
```

### Caso borde: anulación parcialmente posible

Si en una NI con N productos, algunos tienen stock suficiente y otros no:
- **Recomendación:** Bloquear toda la anulación si algún producto no tiene stock suficiente. No hacer anulaciones parciales.
- Mostrar listado de productos bloqueantes con stock actual vs. requerido.

### Validación anti-stock-negativo

```typescript
// Antes de anular, verificar por cada producto:
const stockActual = InventoryService.getStock(product, almacenId);
if (stockActual < cantidadIngresada) {
  throw new Error(mensajeClaro);
}
```

---

## 15. IMPRESIÓN Y EXPORTACIÓN

### Motor de impresión actual

**Archivo:** `src/shared/impresion/ServicioImpresionComprobante.ts`

El servicio ya implementa:
- Renderizado en iframe oculto
- Copia de CSS del documento principal
- Inyección de CSS específico para A4 / Ticket 58mm / 80mm
- Llamada a `window.print()`
- Timeout de carga de CSS externo

**Para Nota de Ingreso:**
- Formato recomendado: **A4 únicamente** (Ticket no aplica para NI — es un documento formal de almacén).
- No crear un nuevo servicio de impresión. Usar `ServicioImpresionComprobante` con `formato: 'A4'`.
- Crear un componente de layout HTML para NI: `PlantillaImpresionNotaIngreso.tsx` (como los que existen para comprobantes).
- El layout debe incluir: logo empresa, datos cabecera, tabla productos, totales, firma encargado almacén.

### Exportación Excel — lista de NIs

Reutilizar `exportDatasetToExcel` de `src/shared/export/exportToExcel.ts` directamente:

```typescript
await exportDatasetToExcel({
  rows: notasIngresoPaginadas.map(ni => ({ ... })),
  columns: columnasVisibles.map(c => ({ header: c.label, key: c.key, width: c.width })),
  filename: `notas_ingreso_${fecha}.xlsx`,
  worksheetName: 'Notas de Ingreso'
});
```

Aplicar los mismos filtros que están activos en la vista de lista (fecha, almacén, estado, tipo de ingreso).

---

## 16. MODELO DE DATOS RECOMENDADO

### Interfaz principal `NotaIngreso`

```typescript
// gestion-inventario/models/notaIngreso.types.ts (no implementar aún)

export type EstadoNotaIngreso = 'BORRADOR' | 'GENERADA' | 'ANULADA';

export type TipoIngreso =
  | '02' // Compra nacional
  | '03' // Consignación recibida
  | '05' // Devolución recibida
  | '16' // Saldo inicial
  | '18' // Importación
  | '19' // Entrada de producción
  | '20' // Entrada por devolución de producción
  | '21' // Entrada por transferencia entre almacenes
  | '22' // Entrada por identificación errónea
  | '24' // Entrada por devolución del cliente
  | '26' // Entrada para servicio de producción
  | '28' // Ajuste por diferencia de inventario
  | '29' // Entrada de bienes en préstamo
  | '31'; // Entrada de bienes en custodia

export interface LineaNotaIngreso {
  id: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  unidadMedida: string;
  unidadMedidaCodigo: string;
  cantidad: number;
  costoUnitario: number;
  descuento: number;
  baseImponible: number;
  isc: number;
  igv: number;
  noGravado: number;
  total: number;
  movimientoKardexId?: string; // ID del MovimientoStock generado
  movimientoAnulacionId?: string; // ID del MovimientoStock de reversión
}

export interface NotaIngreso {
  id: string;
  numero: string;           // "NI01-00000001"
  serie: string;            // "NI01"
  correlativo: number;      // 1
  estado: EstadoNotaIngreso;

  fechaDocumento: Date;
  fechaIngresoAlmacen: Date;
  tipoIngreso: TipoIngreso;

  // Almacén
  almacenDestinoId: string;
  almacenDestinoNombre: string;
  almacenDestinoCodigo: string;
  encargadoAlmacen?: string;

  // Proveedor (inline, no hay módulo separado)
  proveedorDocumentoTipo?: 'RUC' | 'DNI' | 'CE' | 'PASAPORTE';
  proveedorDocumentoNumero?: string;
  proveedorNombre?: string;
  proveedorDireccion?: string;

  // Documento origen
  documentoOrigenTipo?: string;
  documentoOrigenNumero?: string;
  guiaRemision?: string;
  fechaGuiaRemision?: Date;

  // Condiciones comerciales (referenciales)
  moneda: 'PEN' | 'USD';
  formaPago?: string;

  // Totales
  subtotal: number;
  descuentoTotal: number;
  baseImponible: number;
  isc: number;
  igv: number;
  noGravado: number;
  total: number;

  // Líneas
  lineas: LineaNotaIngreso[];

  // Información adicional
  observaciones?: string;
  informacionAdicional?: string;

  // Auditoría
  EstablecimientoId: string;
  establecimientoNombre: string;
  creadoPor: string;
  creadoEn: Date;
  generadoPor?: string;
  generadoEn?: Date;
  anuladoPor?: string;
  anuladoEn?: Date;
  motivoAnulacion?: string;

  // Historial
  historial: EventoHistorialNI[];
}

export interface EventoHistorialNI {
  id: string;
  tipo: TipoEventoNI;
  descripcion: string;
  usuario: string;
  fecha: Date;
  detalle?: string;
}

export type TipoEventoNI =
  | 'BORRADOR_CREADO'
  | 'BORRADOR_EDITADO'
  | 'NI_GENERADA'
  | 'STOCK_INGRESADO'
  | 'NI_DUPLICADA'
  | 'NI_ANULADA'
  | 'STOCK_REVERTIDO';
```

### Clave de localStorage

```typescript
// Tenant-aware, igual que otros módulos
const STORAGE_KEY_NI = 'facturafacil_notas_ingreso'; // → lsKey() lo hace tenant-aware
```

### Mapeo TipoIngreso → MovimientoMotivo

```typescript
// Solo auditoría — mapeo propuesto
const TIPO_INGRESO_TO_MOTIVO: Record<TipoIngreso, MovimientoMotivo> = {
  '02': 'COMPRA',
  '03': 'OTRO',            // Consignación — OTRO o agregar 'CONSIGNACION'
  '05': 'DEVOLUCION_PROVEEDOR',
  '16': 'AJUSTE_INVENTARIO', // Saldo inicial
  '18': 'COMPRA',          // Importación (es compra del exterior)
  '19': 'PRODUCCION',
  '20': 'PRODUCCION',
  '21': 'TRANSFERENCIA_ALMACEN',
  '22': 'AJUSTE_INVENTARIO', // Identificación errónea
  '24': 'DEVOLUCION_CLIENTE',
  '26': 'PRODUCCION',
  '28': 'AJUSTE_INVENTARIO',
  '29': 'OTRO',            // Préstamo
  '31': 'OTRO',            // Custodia
};
```

---

## 17. RIESGOS TÉCNICOS

| # | Riesgo | Severidad | Mitigación recomendada |
|---|--------|-----------|----------------------|
| 1 | **Doble ingreso de stock** si el usuario clica "Generar" dos veces | ALTO | Flag `isGenerating` en estado, deshabilitar botón tras primer clic, verificar estado NI antes de procesar |
| 2 | **Duplicar una NI generada** copiando el correlativo original | ALTO | Al duplicar, siempre asignar correlativo nuevo en estado Borrador |
| 3 | **Editar una NI generada** y alterar cantidades | ALTO | Bloquear edición en estado Generada. Solo Borrador es editable |
| 4 | **Anular una NI sin stock suficiente** | ALTO | Validar stock antes de revertir. Bloquear con mensaje claro por producto |
| 5 | **Cantidad cero o negativa** en línea de producto | MEDIO | Validación Zod: `cantidad: z.number().positive()` |
| 6 | **Ingresar servicios** en NI (solo deben ir bienes) | MEDIO | Filtrar búsqueda de productos por `tipoProducto === 'BIEN'` |
| 7 | **No registrar Kardex** si el guardado del producto falla | MEDIO | Operación atómica: producto + Kardex en una función, revertir si alguna falla |
| 8 | **Correlativo duplicado** si dos usuarios generan simultáneamente | MEDIO | Al generarse, releer el máximo correlativo de la serie en ese momento (no confiar solo en el estado inicial) |
| 9 | **Hardcodear tipos de ingreso** en componentes | BAJO | Definir `TIPOS_INGRESO` como constante exportada, nunca inline en JSX |
| 10 | **Mezclar proveedor con cliente** | BAJO | No usar `gestion-clientes` para proveedores. Mantener proveedor inline en NI |
| 11 | **Pérdida de datos en borrador** al recargar página | BAJO | Persistir en localStorage inmediatamente al cambiar cualquier campo (debounce) |
| 12 | **Stock negativo por anulación** | ALTO | Validación obligatoria antes de revertir (ver §14) |
| 13 | **Almacén incorrecto** seleccionado | MEDIO | Mostrar nombre y código del almacén en confirmación antes de generar |

---

## 18. VALIDACIONES MÍNIMAS

### En formulario (antes de Guardar borrador)

- Serie seleccionada (no vacía)
- Fecha documento válida
- Fecha ingreso almacén válida
- Almacén destino seleccionado
- Tipo de ingreso seleccionado
- Al menos una línea de producto

### En formulario (antes de Generar NI)

Todo lo anterior, más:
- Proveedor requerido para tipos: `02, 03, 05, 18, 24, 29, 31`
- Todas las líneas: `cantidad > 0`
- Todas las líneas: `unidadMedida` presente
- Todos los productos son de tipo `BIEN` (no servicios)
- Correlativo único en esa serie (no existe NI con mismo número y serie)
- Moneda seleccionada

### Schema Zod propuesto (estructura, no implementar)

```typescript
// Solo auditoría
const LineaNotaIngresoSchema = z.object({
  productoId: z.string().min(1),
  cantidad: z.number().positive(),
  unidadMedida: z.string().min(1),
  costoUnitario: z.number().min(0),
});

const NotaIngresoSchema = z.object({
  serie: z.string().min(1, 'Serie obligatoria'),
  fechaDocumento: z.date(),
  fechaIngresoAlmacen: z.date(),
  tipoIngreso: z.enum(['02','03','05','16','18','19','20','21','22','24','26','28','29','31']),
  almacenDestinoId: z.string().min(1, 'Almacén obligatorio'),
  lineas: z.array(LineaNotaIngresoSchema).min(1, 'Al menos un producto'),
  moneda: z.enum(['PEN', 'USD']),
});
```

---

## 19. ARCHIVOS QUE PROBABLEMENTE SE TOCARÁN

> Ninguno fue modificado en esta auditoría.

### Nuevos archivos a crear

| Archivo | Motivo |
|---------|--------|
| `gestion-inventario/models/notaIngreso.types.ts` | Tipos e interfaces de NI |
| `gestion-inventario/repositories/notaIngreso.repository.ts` | Persistencia localStorage |
| `gestion-inventario/services/notaIngreso.service.ts` | Lógica de negocio (generar, anular) |
| `gestion-inventario/hooks/useNotasIngreso.ts` | Hook principal del panel |
| `gestion-inventario/components/notas-ingreso/NotasIngresoPanel.tsx` | Lista y gestión |
| `gestion-inventario/components/notas-ingreso/FormularioNotaIngreso.tsx` | Formulario crear/editar |
| `gestion-inventario/components/notas-ingreso/DetalleNotaIngreso.tsx` | Vista detalle |
| `gestion-inventario/components/notas-ingreso/HistorialNotaIngreso.tsx` | Historial eventos |

### Archivos existentes que requieren modificación mínima

| Archivo | Modificación requerida | Riesgo |
|---------|----------------------|--------|
| `gestion-inventario/models/inventory.types.ts` | Agregar `'notas-ingreso'` a `InventoryView` | Mínimo |
| `gestion-inventario/pages/InventoryPage.tsx` | Agregar tab NI + renderizado condicional | Bajo |
| `gestion-inventario/hooks/useInventory.ts` | Agregar `'notas-ingreso'` al estado inicial si aplica | Bajo |
| `configuracion-sistema/modelos/Series.ts` | Agregar `'STOCK_ENTRY'` a `DocumentType.category` | Mínimo |
| `configuracion-sistema/utilidades/catalogoSeries.ts` | Agregar tipo de documento NI | Bajo |
| `configuracion-sistema/utilidades/seriesPredeterminadas.ts` | Agregar serie NI01 por defecto | Bajo |
| `configuracion-sistema/paginas/ConfiguracionSeries.tsx` | Agregar bloque de configuración para NI | Bajo |

### Archivos que pueden necesitar ajuste menor (motivos)

| Archivo | Ajuste posible |
|---------|---------------|
| `gestion-inventario/models/inventory.types.ts` | Extender `MovimientoMotivo` con nuevos valores para NI |
| `gestion-inventario/components/modals/AdjustmentModal.tsx` | Agregar nuevos motivos al mapeo si se amplía `MovimientoMotivo` |

---

## 20. ARCHIVOS QUE NO SE DEBEN TOCAR

| Módulo | Archivos protegidos | Razón |
|--------|--------------------|----|
| Caja | `control-caja/**` | NI no afecta caja |
| Cobranzas | `gestion-cobranzas/**` | NI no genera deuda ni cobro |
| Comprobantes | `comprobantes-electronicos/**` | NI no es comprobante SUNAT |
| POS | `punto-venta/**` | NI no es venta |
| SUNAT | `catalogos-sunat/**`, `shared/sunat/**` | NI no reporta a SUNAT |
| Orden de venta | `documentos-comerciales/` (flujo reserva) | NI no afecta reserva de stock |
| Nota de Crédito | `comprobantes-electronicos/` (NC) | Documento diferente, lógica diferente |
| Clientes | `gestion-clientes/**` | No confundir proveedor con cliente |
| Detracciones | `comprobantes-electronicos/` (detracción) | NI no genera detracción |
| Indicadores | `indicadores-negocio/**` | Afectación futura, no en esta fase |

---

## 21. RECOMENDACIÓN FINAL

### Sobre el modelo de proveedor

**Recomendación: proveedor inline en NI (sin módulo propio).**

No existe módulo de proveedores. Las opciones son:
1. **Inline en NI** ← Recomendada. Guarda nombre + RUC/DNI directamente en el documento. Usa `clienteLookupService` para autocompletar desde SUNAT/RENIEC. No crea acoplamiento con `gestion-clientes`.
2. Reutilizar clientes como "tercero" — crea confusión semántica y mezcla datos.
3. Crear módulo de proveedores — scope demasiado amplio para esta fase.

### Sobre el ticket de impresión

**Recomendación: NO implementar impresión en ticket para Nota de Ingreso.**

La NI es un documento formal de almacén que requiere firma, tabla detallada y datos completos. El ticket 58/80mm no tiene espacio suficiente. Solo A4.

### Sobre la ubicación definitiva

**Tab en InventoryPage, no subruta.** Consistente con el resto del módulo.

### Sobre la estrategia de implementación

Implementar en 3 fases claramente separadas (ver §22).

---

## 22. PLAN DE IMPLEMENTACIÓN POR FASES

### FASE 1 — Modelo, tipos y persistencia (sin UI)
**Objetivo:** Base sin romper nada.

1. Crear `notaIngreso.types.ts` con todos los tipos e interfaces
2. Crear `notaIngreso.repository.ts` (CRUD en localStorage con tenant key)
3. Extender `MovimientoMotivo` en `inventory.types.ts` si se decide agregar nuevos motivos
4. Agregar `'notas-ingreso'` a `InventoryView` en `inventory.types.ts`
5. Agregar tipo documento NI en `catalogoSeries.ts` y `seriesPredeterminadas.ts`
6. Agregar `'STOCK_ENTRY'` a `DocumentType.category` en `Series.ts`
7. Ejecutar `npm run lint` + `npm run build` para confirmar que no hay roturas

### FASE 2 — Servicio de negocio y hook (sin UI)
**Objetivo:** Lógica de negocio aislada, testeable.

1. Crear `notaIngreso.service.ts`:
   - `generarNotaIngreso(ni, productos, usuario)` — orquesta múltiples `InventoryService.registerAdjustment()`
   - `anularNotaIngreso(ni, motivo, productos, usuario)` — valida y revierte
   - `calcularTotales(lineas)` — cálculos de base, IGV, total
2. Crear `useNotasIngreso.ts` — hook principal con estado, acciones, filtros
3. Ejecutar tests y lint

### FASE 3 — UI completa
**Objetivo:** Interfaz funcional completa.

1. Crear `NotasIngresoPanel.tsx` — lista con filtros, paginación, exportar Excel
2. Crear `FormularioNotaIngreso.tsx` — formulario con react-hook-form + Zod
3. Crear `DetalleNotaIngreso.tsx` — vista de detalle completa
4. Crear `HistorialNotaIngreso.tsx` — historial de eventos
5. Agregar tab en `InventoryPage.tsx`
6. Agregar bloque NI en `ConfiguracionSeries.tsx`
7. Crear `PlantillaImpresionNotaIngreso.tsx` — layout de impresión A4
8. Wiring de permisos (agregar `inventario.notas-ingreso.crear`, `inventario.notas-ingreso.generar`, `inventario.notas-ingreso.anular` o reutilizar `inventario.ajustar`)
9. QA: golden path + casos borde + anulación + duplicar

---

## REGLAS DE CALIDAD (Checklist para implementación)

- [ ] Sin hardcodeo de tipos de ingreso — usar constante `TIPOS_INGRESO`
- [ ] Sin lógica duplicada de stock — reutilizar `InventoryService`
- [ ] Sin acoplamiento a caja, cobranzas, SUNAT ni POS
- [ ] Sin modificación del Kardex existente — solo agregar movimientos nuevos
- [ ] Sin acceso a `stockReservadoPorAlmacen` desde NI
- [ ] Sin operaciones atómicas rotas — generar NI y Kardex en una sola función
- [ ] Correlativo validado antes de generar (sin duplicados)
- [ ] Anulación bloqueada si stock insuficiente (con mensaje útil por producto)
- [ ] Solo productos tipo `BIEN` permitidos en NI
- [ ] Proveedor inline, sin acoplamiento a `gestion-clientes`
- [ ] Persistencia tenant-aware con `lsKey()`
- [ ] Evento `STOCK_MOVEMENTS_CHANGED_EVENT` emitido al generar y al anular

---

## VALIDACIÓN TÉCNICA

> Esta sección se completa tras ejecutar los comandos de verificación.

### `npm run lint`

```
> facturafacil-monorepo@0.0.0 lint
> npm run lint:senciyo && npm run lint:pm

> senciyo@0.0.0 lint
> eslint .
(sin errores)

> portal-pm@0.1.0 lint
> eslint .
(sin errores)
```

**Resultado: LIMPIO. 0 errores, 0 advertencias.**

### `npm run build`

```
> senciyo@0.0.0 build
> tsc -b && vite build
✓ 3526 modules transformed.
✓ built in 15.11s
(advertencia preexistente de chunk size >3000 kB — no relacionada con esta auditoría)

> portal-pm@0.1.0 build
> vite build
✓ 317 modules transformed.
✓ built in 4.44s
```

**Resultado: BUILD EXITOSO en ambas apps. La advertencia de chunk size en senciyo es preexistente.**

> El presente archivo `.md` no contiene código fuente ejecutable y no modificó ningún archivo TypeScript ni de configuración. El estado del repositorio permanece intacto.

---

## ARCHIVOS AUDITADOS EN ESTA SESIÓN

| Archivo | Propósito auditado |
|---------|-------------------|
| `gestion-inventario/pages/InventoryPage.tsx` | Estructura de tabs, acciones, exports |
| `gestion-inventario/models/inventory.types.ts` | Tipos existentes de movimiento y stock |
| `gestion-inventario/services/inventory.service.ts` | Lógica de stock real, ajustes, transferencias |
| `gestion-inventario/repositories/stock.repository.ts` | Persistencia localStorage, eventos |
| `gestion-inventario/models/transferencia.types.ts` | Referencia para estados y flujos |
| `gestion-inventario/hooks/useInventory.ts` | Hook maestro, flujo de operaciones |
| `gestion-inventario/hooks/useInventarioDisponibilidad.ts` | Cálculo stock real/reservado/disponible |
| `gestion-inventario/stores/usePreferenciasDisponibilidad.ts` | Patrón store Zustand |
| `gestion-inventario/utils/stockAlerts.ts` | Evaluación de alertas |
| `configuracion-sistema/modelos/Series.ts` | Interfaz Series, DocumentType |
| `configuracion-sistema/hooks/useSeries.ts` | CRUD de series, correlativo |
| `configuracion-sistema/contexto/ContextoConfiguracion.tsx` | Persistencia series |
| `configuracion-sistema/utilidades/catalogoSeries.ts` | Catálogo tipos de documento |
| `documentos-comerciales/models/documentoComercial.types.ts` | Referencia estados, series, correlativo |
| `documentos-comerciales/models/documentoComercial.constants.ts` | Constantes, dígitos correlativo |
| `comprobantes-electronicos/shared/clienteLookup/clienteLookupService.ts` | Búsqueda RUC/DNI |
| `shared/impresion/ServicioImpresionComprobante.ts` | Motor de impresión A4/ticket |
| `shared/export/exportToExcel.ts` | Exportación Excel reutilizable |
| `shared/payments/paymentMeans.ts` | Medios de pago |
| `shared/currency/types.ts` | Monedas |
| `routes/privateRoutes.tsx` | Rutas y permisos actuales |

---

*Auditoría generada el 2026-06-04. Ningún archivo de código fue modificado.*  
*Rama: `DetraccionParte2` — Estado: limpio (sin cambios pendientes).*
