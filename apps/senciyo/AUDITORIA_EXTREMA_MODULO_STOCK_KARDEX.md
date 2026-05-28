# Auditoría extrema del módulo de Stock / Inventario / Kardex

> **Fecha de auditoría:** 2026-05-28  
> **Auditor:** Claude Sonnet 4.6 — Arquitecto senior / Auditor funcional-técnico  
> **Proyecto:** FacturaFacil — App `senciyo`  
> **Rama auditada:** `main`  
> **Alcance:** Módulo completo de stock/inventario, sus integraciones y dependencias

---

## 1. Resumen ejecutivo

El módulo de gestión de inventario de senciyo es un **inventario operativo parcial de frontend** con persistencia exclusiva en `localStorage`. Cuenta con una arquitectura bien organizada (Service → Repository → Hook → UI), tipos TypeScript correctamente modelados, y varias funcionalidades visualmente completas. Sin embargo, **no existe ningún backend real** que respalde los datos: no hay tablas Supabase para stock ni movimientos, no hay Cloudflare Functions para inventario, y hay un comentario `// TODO: reemplazar por API cuando el backend esté disponible` explícito en el código.

Los riesgos más críticos para producción son:
1. **Los datos de stock viven solo en el navegador del usuario.** Limpiar caché o abrir en otro dispositivo = stock en cero.
2. **Anular un comprobante no restaura el stock.** Las unidades descontadas en la venta quedan permanentemente perdidas.
3. **Las notas de crédito no generan entrada de stock.** Las devoluciones de clientes son invisibles para el inventario.
4. **No existe módulo de compras.** La única forma de registrar ingresos es mediante ajuste manual.
5. **No es un Kardex.** No hay valorización, ni costos, ni saldo anterior/posterior por operación en un libro contable persistente.

Nivel de madurez actual: **Prototipo avanzado / Inventario básico de frontend**. No apto para uso productivo con clientes reales sin backend.

---

## 2. Alcance revisado

### Módulos revisados

| Módulo | Ruta base |
|--------|-----------|
| Gestión de Inventario (principal) | `src/pages/Private/features/gestion-inventario/` |
| Shared Inventory | `src/shared/inventory/` |
| Catálogo de Artículos (store de productos) | `src/pages/Private/features/catalogo-articulos/` |
| Punto de Venta / Comprobantes | `src/pages/Private/features/comprobantes-electronicos/` |
| Configuración del sistema (almacenes) | `src/pages/Private/features/configuracion-sistema/` |
| Backend (Cloudflare Functions) | `functions/api/` |
| Base de datos (Supabase migrations) | `apps/senciyo/supabase/sql/` |

### Archivos clave revisados

```
gestion-inventario/
├── api/inventory.facade.ts
├── services/inventory.service.ts
├── repositories/stock.repository.ts
├── models/inventory.types.ts
├── models/disponibilidad.types.ts
├── hooks/useInventory.ts
├── hooks/useInventarioDisponibilidad.ts
├── stores/usePreferenciasDisponibilidad.ts
├── pages/InventoryPage.tsx
├── components/disponibilidad/DisponibilidadTable.tsx
├── components/disponibilidad/DisponibilidadKPIs.tsx
├── components/disponibilidad/DisponibilidadToolbar.tsx
├── components/disponibilidad/InventarioSituacionPage.tsx
├── components/modals/AdjustmentModal.tsx
├── components/modals/TransferModal.tsx
├── components/modals/MassUpdateModal.tsx
├── components/tables/MovementsTable.tsx
├── components/panels/AlertsPanel.tsx
├── components/panels/SummaryCards.tsx
└── utils/stockAlerts.ts / inventory.helpers.ts

shared/inventory/
├── stockGateway.ts
├── accionesStock.ts
└── unitConversion.ts

catalogo-articulos/
├── hooks/useProductStore.tsx
├── models/types.ts (Product interface)
└── utils/catalogStorage.ts

comprobantes-electronicos/
├── hooks/useComprobanteActions.tsx
└── lista-comprobantes/pages/ListaComprobantes.tsx

configuracion-sistema/modelos/Almacen.ts
functions/api/ (sin endpoints de stock)
supabase/sql/ (sin tablas de stock)
```

---

## 3. Mapa funcional actual del módulo

### Ruta principal
`/inventario` → `InventoryPage.tsx`

### Vistas disponibles (tabs)

| Tab | Componente | Función real |
|-----|-----------|--------------|
| Situación Actual | `InventarioSituacionPage` → `DisponibilidadTable` | Muestra stock real, reservado, disponible por producto/almacén. Edición inline de umbrales min/max. KPIs. Filtros. Exportación. |
| Movimientos | `MovementsTable` | Lista histórica de movimientos en localStorage. Columnas: fecha, producto, tipo, motivo, almacén, cantidad, stock anterior/nuevo, usuario, documento referencia. |
| Alertas | `AlertsPanel` | Clasifica productos por estado (CRÍTICO/BAJO/EXCESO). Permite "generar orden de compra" como archivo `.txt`. No conecta con proveedores ni módulo de compras. |
| Resumen | `SummaryCards` | Estadísticas agregadas: total de productos, valor de inventario estimado, productos con alerta, movimientos recientes. |

### Acciones disponibles para el usuario

| Acción | Modal | Implementado | Persistencia |
|--------|-------|-------------|--------------|
| Ajuste de stock (+/-) | `AdjustmentModal` | Sí | localStorage |
| Transferencia entre almacenes | `TransferModal` | Sí | localStorage |
| Actualización masiva | `MassUpdateModal` | Sí | localStorage |
| Generar orden de compra | Dentro de AlertsPanel | Parcial (genera .txt) | No persiste |
| Editar umbrales min/max inline | `DisponibilidadTable` | Sí | localStorage via updateProduct |

---

## 4. Mapa técnico actual

### Componentes principales

```
InventoryPage
└── useInventory() [hook maestro]
    ├── useProductStore() → allProducts (Zustand)
    ├── useConfigurationContext() → almacenes, establecimientos
    ├── StockRepository.getMovements() → localStorage
    ├── InventoryService.generateAlerts()
    ├── AdjustmentModal ← handleStockAdjustment()
    ├── TransferModal ← handleStockTransfer()
    └── MassUpdateModal ← handleMassStockUpdate()

InventarioSituacionPage
└── useInventarioDisponibilidad() [hook de disponibilidad]
    ├── useProductStore() → allProducts
    ├── useConfigurationContext() → almacenes
    └── DisponibilidadTable (edición inline min/max)
```

### Hooks

| Hook | Archivo | Responsabilidad |
|------|---------|-----------------|
| `useInventory` | `hooks/useInventory.ts` | Maestro: movimientos, alertas, modales, handlers |
| `useInventarioDisponibilidad` | `hooks/useInventarioDisponibilidad.ts` | Vista de situación: filtros, paginación, disponibilidad |

### Stores (Zustand)

| Store | Archivo | Datos | Persistencia |
|-------|---------|-------|--------------|
| `useProductStore` | `catalogo-articulos/hooks/useProductStore.tsx` | Todos los productos (con campos de stock) | localStorage: `{tenantId}:catalog_products` |
| `usePreferenciasDisponibilidad` | `gestion-inventario/stores/usePreferenciasDisponibilidad.ts` | Preferencias UI de tabla | localStorage: `inventario-disponibilidad-preferencias` |

### Servicios y helpers

| Clase/Función | Archivo | Tipo |
|---------------|---------|------|
| `InventoryService` | `services/inventory.service.ts` | Clase estática. Lógica pura. Sin async. Sin HTTP. |
| `StockRepository` | `repositories/stock.repository.ts` | Clase estática. 100% localStorage. |
| `useInventoryFacade` | `api/inventory.facade.ts` | Hook facade. Wrapper de compatibilidad. Sin HTTP. |
| `summarizeProductStock` | `shared/inventory/stockGateway.ts` | Función pura. Cálculos de disponibilidad. |
| `allocateSaleAcrossalmacenes` | `shared/inventory/stockGateway.ts` | Asignación FIFO. Función pura. |
| `registrarAjusteDeStock` | `shared/inventory/accionesStock.ts` | Función pura. TODO: backend pendiente. |
| `convertToUnidadMinima` | `shared/inventory/unitConversion.ts` | Conversión de unidades. Función pura. |

### Modelos / Tipos

| Interface/Tipo | Archivo | Uso |
|----------------|---------|-----|
| `MovimientoStock` | `models/inventory.types.ts` | Registro de movimiento de Kardex |
| `MovimientoTipo` | `models/inventory.types.ts` | ENTRADA, SALIDA, AJUSTE_POSITIVO, AJUSTE_NEGATIVO, DEVOLUCION, MERMA, TRANSFERENCIA |
| `MovimientoMotivo` | `models/inventory.types.ts` | COMPRA, VENTA, AJUSTE_INVENTARIO, DEVOLUCION_CLIENTE, etc. |
| `StockAlert` | `models/inventory.types.ts` | Alerta de umbral |
| `EstadoAlerta` | `models/inventory.types.ts` | CRITICO, BAJO, NORMAL, EXCESO |
| `DisponibilidadItem` | `models/disponibilidad.types.ts` | Vista de stock disponible |
| `Product` | `catalogo-articulos/models/types.ts` | Producto con campos de stock embebidos |
| `Almacen` | `configuracion-sistema/modelos/Almacen.ts` | Almacén con configuración de stock |

### APIs / Backend

| Sistema | Estado |
|---------|--------|
| Supabase (tablas de stock) | **No existe.** No hay migrations para inventario. |
| Cloudflare Functions (endpoints de stock) | **No existe.** No hay functions para inventario. |
| Llamadas HTTP en gestion-inventario | **No existe.** Grep sin resultados de `fetch`, `axios`, `supabase`. |
| Comentario explícito en código | `accionesStock.ts:28 // TODO: reemplazar por API cuando el backend esté disponible.` |

### Persistencia real

| Clave localStorage | Contenido | Alcance |
|--------------------|-----------|---------|
| `{tenantId}:catalog_products` | Array de `Product[]` con `stockPorAlmacen` embebido | Por empresa |
| `{tenantId}:facturafacil_stock_movements` | Array de `MovimientoStock[]` | Por empresa |
| `inventario-disponibilidad-preferencias` | `PreferenciasDisponibilidad` | Por empresa |

---

## 5. Quién consume stock

| Módulo | Archivo / Componente | Tipo de consumo | Lee stock | Modifica stock | Genera movimiento | Observación |
|--------|---------------------|-----------------|-----------|----------------|-------------------|-------------|
| Gestión Inventario | `useInventory.ts` | Lectura + escritura | ✅ | ✅ | ✅ | Vía ajuste/transferencia manual |
| Situación Actual | `useInventarioDisponibilidad.ts` | Solo lectura | ✅ | ❌ | ❌ | Calcula disponible = real - reservado |
| Alertas | `AlertsPanel.tsx` | Solo lectura | ✅ | ❌ | ❌ | Genera alertas visuales. Sin escritura. |
| Resumen | `SummaryCards.tsx` | Solo lectura | ✅ | ❌ | ❌ | Estadísticas agregadas |
| Punto de Venta | `useCart.tsx` | Lectura + validación | ✅ | ❌ | ❌ | Solo valida stock antes de agregar al carrito |
| Comprobantes | `useComprobanteActions.tsx` | Lectura + escritura | ✅ | ✅ | ✅ | Descuenta stock al emitir factura/boleta |
| Comprobantes disponibles | `useAvailableProducts.tsx` | Solo lectura | ✅ | ❌ | ❌ | Filtra productos con stock > 0 |
| Catálogo artículos | `useProductStore.tsx` | Fuente de verdad | ✅ | ✅ | ❌ | No genera movimientos al modificar producto |
| Configuración almacenes | `ConfiguracionAlmacenes.tsx` | Metadata | ❌ | ❌ | ❌ | Solo configura almacén. No toca stock. |

---

## 6. Quién actualiza stock

| Acción | Módulo origen | Archivo | Impacta stock real | Impacta reservado | Impacta disponible | Genera trazabilidad | Estado actual | Riesgo |
|--------|--------------|---------|-------------------|-------------------|--------------------|---------------------|---------------|--------|
| Emitir factura/boleta | Comprobantes | `useComprobanteActions.tsx` | ✅ (SALIDA) | ❌ | ✅ | ✅ (movimiento) | Funciona | Solo localStorage |
| Ajuste manual positivo | Inventario | `useInventory.ts` → `InventoryService` | ✅ | ❌ | ✅ | ✅ | Funciona | Solo localStorage |
| Ajuste manual negativo | Inventario | `useInventory.ts` → `InventoryService` | ✅ | ❌ | ✅ | ✅ | Funciona | Solo localStorage |
| Transferencia entre almacenes | Inventario | `useInventory.ts` → `InventoryService` | ✅ (ambos) | ❌ | ✅ | ✅ (2 movimientos) | Funciona | Solo localStorage |
| Actualización masiva | Inventario | `useInventory.ts` → `InventoryService` | ✅ | ❌ | ✅ | ✅ | Funciona | Solo localStorage |
| Anular comprobante | Comprobantes | `ListaComprobantes.tsx` → `confirmVoid()` | ❌ | ❌ | ❌ | ❌ | **ROTO** | Stock perdido permanentemente |
| Nota de crédito | Comprobantes | `useComprobanteActions.tsx` | ❌ | ❌ | ❌ | ❌ | **ROTO** | Devolución sin entrada de stock |
| Registro de compra/ingreso | No existe | — | ❌ | ❌ | ❌ | ❌ | **NO IMPLEMENTADO** | Sin módulo de compras |
| Reservar stock en carrito | POS | `useCart.tsx` | ❌ | ❌ | ❌ | ❌ | **NO IMPLEMENTADO** | No modifica stockReservado |
| Liberar reserva al cancelar carrito | POS | — | ❌ | ❌ | ❌ | ❌ | **NO IMPLEMENTADO** | Reservas no existen |
| Editar comprobante emitido | Comprobantes | `useComprobanteActions.tsx` | Sin reversión | ❌ | Sin ajuste | Parcial | **RIESGO** | Duplicaría impacto |

---

## 7. Flujo actual de stock

### 7.1 Flujo de ingreso (ajuste manual)

```
Usuario abre AdjustmentModal (tipo ENTRADA / AJUSTE_POSITIVO)
→ useInventory.handleStockAdjustment(data)
→ InventoryService.registerAdjustment(product, almacen, data, usuario)
  → Calcula nuevoStock = stockActual + cantidad
  → Retorna Product actualizado (stockPorAlmacen[almacenId] = nuevoStock)
  → StockRepository.addMovement(movimiento) → localStorage
→ useProductStore.updateProduct(id, productoActualizado) → localStorage
→ UI reactiva via Zustand
```
**Estado:** Funciona. Solo en localStorage.

### 7.2 Flujo de salida por venta

```
Usuario confirma venta en comprobantes (factura/boleta)
→ useComprobanteActions.createComprobante()
→ resolvealmacenesForSaleFIFO() → ordena almacenes FIFO
→ allocateSaleAcrossalmacenes() → distribuye cantidades por almacén
→ Para cada producto-almacén:
   addMovimientoStock(productId, 'SALIDA', 'VENTA', cantidad, ..., almacenId)
→ useInventoryFacade.addMovimiento()
   → InventoryService.updateStock(product, almacenId, cantidadNueva)
   → useProductStore.updateProduct()  → localStorage
   → StockRepository.addMovement()    → localStorage
```
**Estado:** Funciona con FIFO. Solo en localStorage.

### 7.3 Flujo de anulación de comprobante

```
Usuario anula comprobante en ListaComprobantes
→ confirmVoid()
  → dispatch({ type: 'UPDATE_COMPROBANTE', payload: { status: 'Anulado' } })
  → registrarComprobanteEstadoActualizado() [analítica]
  → devLocalIndicadoresStore.marcarVentaAnulada()
  
❌ NO SE GENERA MOVIMIENTO DE STOCK
❌ NO SE RESTAURA stockPorAlmacen
❌ EL STOCK DESCONTADO SE PIERDE PERMANENTEMENTE
```
**Estado: CRÍTICO. Bug de integridad de datos.**

### 7.4 Flujo de nota de crédito

```
Usuario crea nota de crédito
→ useComprobanteActions.createComprobante()
→ const isNoteCredit = tipoComprobante === 'nota_credito' → true
→ if (!isNoteCredit) { // BLOQUE SALTEADO
     // Descuento de stock → NO SE EJECUTA
  }
  
❌ NO SE GENERA MOVIMIENTO DE TIPO ENTRADA/DEVOLUCIÓN
❌ EL STOCK NO SE RESTAURA POR LA DEVOLUCIÓN DEL CLIENTE
```
**Estado: CRÍTICO. Devoluciones invisibles para el inventario.**

### 7.5 Flujo de compra / ingreso de mercancía

```
❌ NO EXISTE MÓDULO DE COMPRAS
❌ NO EXISTE INTERFAZ DE RECEPCIÓN DE MERCANCÍA
❌ NO EXISTE INTEGRACIÓN CON PROVEEDORES

El motivo 'COMPRA' existe en los tipos pero no tiene UI de creación.
Único workaround: ajuste manual positivo.
```
**Estado: NO IMPLEMENTADO.**

### 7.6 Flujo de transferencia entre almacenes

```
Usuario abre TransferModal
→ useInventory.handleStockTransfer(data)
→ InventoryService.registerTransfer(product, origen, destino, data, usuario)
  → Valida stockOrigen >= cantidad (lanza error si no hay suficiente)
  → nuevoStockOrigen = stockOrigen - cantidad
  → nuevoStockDestino = stockDestino + cantidad
  → Crea 2 movimientos (SALIDA origen + ENTRADA destino) con transferenciaId compartido
  → StockRepository.addMovement() x2 → localStorage
→ useProductStore.updateProduct() → localStorage
```
**Estado:** Funciona. Solo en localStorage.

### 7.7 Flujo de reserva de stock

```
useCart valida disponibilidad (summarizeProductStock)
→ Compara totalAvailable con cantidad pedida
→ Si insuficiente: muestra alerta al usuario
→ Si suficiente (o allowNegativeStock=true): permite agregar al carrito

❌ NO SE MODIFICA stockReservadoPorAlmacen
❌ EL STOCK RESERVADO ES SOLO UN CAMPO EN EL MODELO - NO SE ACTUALIZA AUTOMÁTICAMENTE
❌ NO HAY FLUJO DE LIBERAR RESERVA
```
**Estado: PARCIAL. La validación existe, la reserva real no.**

### 7.8 Flujo de ajuste masivo

```
Usuario sube archivo en MassUpdateModal
→ useInventory.handleMassStockUpdate(data)
→ InventoryService.processMassUpdate(products, almacenes, data, usuario)
  → Itera por producto/almacén
  → Aplica ajustes individuales
  → Registra movimiento por cada uno
→ updateProduct() masivo → localStorage
```
**Estado:** Funciona. Solo en localStorage.

---

## 8. Evaluación de cálculos

### Stock real (`stockPorAlmacen[almacenId]`)
- **¿Cómo se calcula?** Es un campo directo en el objeto `Product`. Se establece mediante `InventoryService.updateStock()`.
- **¿Está bien calculado?** Sí, para operaciones que lo modifican. Pero no se restaura en anulaciones.
- **¿Es persistente?** Solo en localStorage.

### Stock reservado (`stockReservadoPorAlmacen[almacenId]`)
- **¿Cómo se calcula?** Es un campo en el objeto `Product`. Solo se usa en lectura.
- **¿Se actualiza automáticamente?** ❌ No. Ningún flujo activo escribe en `stockReservadoPorAlmacen`. Es un campo muerto que puede existir si fue seteado manualmente, pero no hay lógica de reserva real.
- **¿Es real o visual?** Solo visual/estructural. No hay lógica de reserva activa.

### Stock disponible (`disponible = real - reservado`)
- **¿Cómo se calcula?** `summarizeProductStock()` en `stockGateway.ts`: `available = stock <= reserved ? 0 : stock - reserved`.
- **¿Está bien calculado?** La fórmula es correcta. El problema es que `reservado` siempre es 0 en la práctica.
- **En DisponibilidadTable:** `disponible = item.real - item.reservado`.

### Stock mínimo / máximo (`stockMinimoPorAlmacen`, `stockMaximoPorAlmacen`)
- **¿Cómo se configuran?** Edición inline en `DisponibilidadTable` o mediante `InventoryService.updateThresholds()`.
- **¿Están bien implementados?** Sí, se guardan en el producto. La lógica de alertas los usa correctamente.

### Estado del stock (situación)
```
SituacionStock:
- 'Crítico' → stock < stockMinimo * 0.5
- 'Bajo'    → stock < stockMinimo
- 'OK'      → stock >= stockMinimo (y <= stockMaximo si existe)
- 'Sin stock'→ stock === 0
```
- **¿Está bien calculado?** Sí. La lógica en `stockAlerts.ts` es coherente.

### Alertas
- **¿Están bien calculadas?** Sí. `InventoryService.generateAlerts()` itera correctamente.
- **¿Son en tiempo real?** Solo se actualizan cuando el store Zustand cambia (reactivo).

### Resumen (SummaryCards)
- **¿Está bien calculado?** Solo cuenta alertas y productos. No hay valorización.
- **Valor de inventario:** Si existe, es estimativo (precio × cantidad), no costo real.

---

## 9. Evaluación contra Kardex real

### ¿Esto actualmente es un Kardex real?
**PARCIAL — Aproximadamente 30% de las capacidades de un Kardex operativo.**

### ¿Por qué?
Un Kardex real requiere: libro contable persistente en servidor, trazabilidad completa de todos los movimientos con origen comprobable, valorización (costo promedio, FIFO o LIFO), saldo anterior + movimiento + saldo posterior por cada línea, y asociación bidireccional con documentos de origen. Este módulo tiene la estructura de tipos correcta y la lógica de movimientos, pero todo vive en `localStorage` del navegador, los movimientos de anulación y devolución no se generan, y no hay valorización.

### Capacidades de Kardex que YA EXISTEN

| Capacidad | Estado |
|-----------|--------|
| Registro de movimiento con tipo | ✅ Existe (7 tipos) |
| Registro de motivo del movimiento | ✅ Existe (12 motivos) |
| Fecha y hora del movimiento | ✅ Existe |
| Usuario responsable | ✅ Existe |
| Documento de referencia (número de comprobante) | ✅ Existe |
| Cantidad anterior y nueva | ✅ Existe (`cantidadAnterior`, `cantidadNueva`) |
| Cantidad del movimiento | ✅ Existe |
| Almacén origen/destino en transferencias | ✅ Existe |
| Observaciones | ✅ Existe |
| Movimientos vinculados (transferencia) | ✅ Existe (`movimientoRelacionadoId`) |
| Filtro por producto, almacén, fecha | ✅ Existe (en repositorio) |
| Stock por almacén | ✅ Existe |
| Stock por establecimiento | ✅ Existe (parcial) |
| Stock mínimo y máximo por almacén | ✅ Existe |
| Transferencias entre almacenes | ✅ Existe |
| Ajustes positivos y negativos | ✅ Existe |
| Conversión de unidades de medida | ✅ Existe |
| Asignación FIFO multi-almacén | ✅ Existe |
| Alertas de umbral | ✅ Existe |

### Capacidades que FALTAN

| Capacidad | Estado |
|-----------|--------|
| Persistencia en backend/base de datos | ❌ No existe |
| Reversión de stock al anular comprobante | ❌ No existe |
| Entrada de stock por nota de crédito/devolución | ❌ No existe |
| Módulo de compras/ingresos | ❌ No existe |
| Valorización (precio de costo) | ❌ No existe |
| Costo promedio ponderado | ❌ No existe |
| Método FIFO/LIFO para costos | ❌ No existe |
| Kardex valorizado (columnas de valor monetario) | ❌ No existe |
| Saldo valorizado por movimiento | ❌ No existe |
| Stock reservado funcional (carrito → reserva real) | ❌ No existe |
| Liberación de reserva | ❌ No existe |
| Lotes / series | ❌ No existe |
| Fechas de vencimiento | ❌ No existe |
| Multi-empresa real (no solo multi-tenant localStorage) | ❌ No existe |
| Reportes exportables de Kardex | ❌ Parcial (exporta disponibilidad, no Kardex) |
| Inventario físico / toma de inventario | ❌ No existe |
| Aprobación de movimientos (configurado pero sin flujo) | ❌ No existe |

### ¿Qué tan lejos está de ser un Kardex productivo?
**Muy lejos en términos de confiabilidad**, aunque la arquitectura de tipos es un buen punto de partida. El problema central no es la UI ni los tipos: es la falta de backend. Sin persistencia en servidor, cualquier Kardex que se construya sobre esta base no es confiable para uso productivo.

### Cambios mínimos para Kardex operativo

1. Migrar `StockRepository` a Supabase (tabla `movimientos_stock`).
2. Migrar `stockPorAlmacen` del producto a una tabla `stock_por_almacen`.
3. Implementar reversión de stock al anular comprobante.
4. Implementar entrada de stock al crear nota de crédito.
5. Crear interfaz mínima de ingresos/compras (sin proveedor completo).

### Cambios ideales para Kardex robusto

Todo lo anterior más: valorización con costo promedio ponderado, módulo completo de compras con proveedores, toma de inventario físico, lotes/series, inventario inicial, reportes de Kardex valorizado, aprobación de movimientos configurada, y auditoría de usuario completa en servidor.

---

## 10. Problemas detectados

| ID | Severidad | Problema | Evidencia técnica | Impacto funcional | Recomendación |
|----|-----------|---------|-------------------|-------------------|---------------|
| P-01 | **CRÍTICO** | Stock no se restaura al anular comprobante | `ListaComprobantes.tsx: confirmVoid()` solo cambia `status: 'Anulado'`. Sin movimiento de stock. | Las unidades vendidas quedan permanentemente descontadas aunque el comprobante sea nulo. El stock es incorrecto desde la primera anulación. | Implementar movimiento `ENTRADA/DEVOLUCION_CLIENTE` al anular, con referencia al comprobante anulado. |
| P-02 | **CRÍTICO** | Nota de crédito no genera entrada de stock | `useComprobanteActions.tsx`: bloque completo de stock dentro de `if (!isNoteCredit)`. Sin entrada al crear NC. | Devoluciones de clientes no recuperan stock. El inventario no refleja la realidad tras devoluciones. | Implementar movimiento `ENTRADA/DEVOLUCION_CLIENTE` al emitir nota de crédito. |
| P-03 | **CRÍTICO** | Todo el inventario vive en localStorage del navegador | `stock.repository.ts`: 100% `localStorage`. Sin tablas Supabase. Sin Cloudflare Functions para stock. | Pérdida total de datos si el usuario limpia la caché. No funciona en múltiples dispositivos/usuarios. Inviable para producción real. | Crear tablas en Supabase: `movimientos_stock`, `stock_por_almacen`. Migrar repositorio a API. |
| P-04 | **CRÍTICO** | No existe módulo de compras | `features/` no tiene carpeta de compras. Motivo `'COMPRA'` existe en tipos pero sin UI. | La única manera de ingresar stock es ajuste manual. Sin trazabilidad de compras con proveedores. | Implementar módulo mínimo de ingresos de mercancía con documento de referencia. |
| P-05 | **ALTO** | Stock reservado no se actualiza en ningún flujo real | `stockReservadoPorAlmacen` definido en Product pero sin ningún flujo que lo modifique. `useCart` valida disponibilidad pero no reserva. | El campo `reservado` siempre es 0 salvo que sea seteado manualmente. La columna "Reservado" en la UI es siempre 0. | Implementar flujo: al agregar al carrito → `stockReservadoPorAlmacen++`. Al confirmar/cancelar venta → ajustar reserva. |
| P-06 | **ALTO** | Error de stock silencioso al emitir comprobante | `useComprobanteActions.tsx` líneas ~590-605: `catch (stockError) { console.error(); toast.warning() }`. El comprobante se emite aunque falle el descuento de stock. | Stock puede quedar desincronizado respecto a ventas sin que el usuario lo note fácilmente. | El fallo de stock debería ser bloqueante o al menos registrar el incidente para reconciliación posterior. |
| P-07 | **ALTO** | No hay valorización ni costos | Ningún campo de costo en `MovimientoStock` ni en `Product.stockPorAlmacen`. | Imposible calcular el valor del inventario real, costo de ventas, o rentabilidad por producto. | Agregar `costoUnitario` al movimiento y calcular costo promedio ponderado al registrar entradas. |
| P-08 | **ALTO** | Editar un comprobante emitido duplicaría impacto en stock | `useComprobanteActions.tsx`: no hay lógica de reversión de stock anterior al editar. Si se navega con `edit: invoice`, descuenta nuevamente sin revertir el anterior. | Doble descuento de stock si se edita cantidades de un comprobante ya emitido. | Implementar reversión completa del impacto anterior antes de aplicar el nuevo. |
| P-09 | **ALTO** | Stock negativo permitido globalmente por defecto sin control claro | `allowNegativeStock` viene de `useConfigurationContext`. Si es `true`, el stock puede ir a negativo sin ninguna alerta visual en el POS. | Se puede vender más unidades de las disponibles sin aviso claro. | Mostrar alerta bloqueante por defecto. Permitir stock negativo solo con confirmación explícita del supervisor. |
| P-10 | **MEDIO** | Movimiento de stock puede fallar silenciosamente en venta sin reintento | Error en `addMovimientoStock()` es capturado y solo muestra toast. No hay mecanismo de reintento ni reconciliación. | Ventas sin movimiento de stock correspondiente. Datos de inventario desincronizados. | Implementar cola de movimientos pendientes o al menos registro de movimientos fallidos para reconciliación. |
| P-11 | **MEDIO** | `MassUpdateModal` tiene TODO explícito de cálculo de stock | `MassUpdateModal.tsx:701: // TODO: Calcular stock cuando se implemente gestión de inventario`. | Parte de la actualización masiva podría no calcular stock correctamente. | Revisar y completar el cálculo antes de uso productivo. |
| P-12 | **MEDIO** | `reservarStock` y `liberarReserva` no existen | No hay funciones de reserva en `InventoryService`, `stockGateway.ts` ni en ningún store. | El stock disponible no refleja unidades en proceso de venta (carrito activo). | Implementar reserva temporal al agregar al carrito, liberada si se cancela la venta. |
| P-13 | **MEDIO** | `configuracionInventarioAlmacen.requiereAprobacionMovimientos` no tiene flujo | Definido en `Almacen` interface pero sin ningún componente/hook que lo implemente. | Configuración decorativa. No hay flujo de aprobación real. | Implementar flujo de aprobación o eliminar la opción de la UI para evitar confusión. |
| P-14 | **BAJO** | Datos de migración legacy en StockRepository sin TTL | `stock.repository.ts` migra clave legacy a clave con tenant. Sin limpieza de clave migrada. | Basura en localStorage de claves antiguas. Sin impacto funcional inmediato. | Limpiar clave legacy después de migración exitosa. |
| P-15 | **BAJO** | `cantidad` en Product es campo legacy sin deprecar explícitamente | `Product.cantidad?: number` coexiste con `stockPorAlmacen`. `stockGateway.ts` lo usa como fallback. | Ambigüedad en la fuente de verdad del stock. Posible inconsistencia si algún flujo usa `cantidad` y otro usa `stockPorAlmacen`. | Deprecar explícitamente `cantidad`. Migrar todos los usos a `stockPorAlmacen`. |

---

## 11. Brechas funcionales

| Funcionalidad esperada | Existe actualmente | Estado | Qué falta | Prioridad |
|------------------------|-------------------|--------|-----------|-----------|
| Persistencia en backend/BD | No | ❌ Ausente | Tablas Supabase + API endpoints | **Crítica** |
| Reversión de stock al anular comprobante | No | ❌ Ausente | Lógica en `confirmVoid()` + movimiento ENTRADA | **Crítica** |
| Entrada de stock por nota de crédito | No | ❌ Ausente | Bloque de entrada en `createComprobante` para NC | **Crítica** |
| Módulo de compras / ingresos de mercancía | No | ❌ Ausente | Módulo completo con proveedor, documento, items | **Crítica** |
| Stock reservado funcional | No (campo existe, lógica no) | ⚠️ Incompleto | Flujo reserva en carrito, liberación al confirmar/cancelar | **Alta** |
| Valorización del inventario | No | ❌ Ausente | Campo costo + cálculo costo promedio ponderado | **Alta** |
| Kardex valorizado (costo por movimiento) | No | ❌ Ausente | Columnas de valor en movimiento + totales | **Alta** |
| Inventario físico / toma de inventario | No | ❌ Ausente | Módulo de conteo físico con ajuste de diferencia | **Alta** |
| Reportes de Kardex exportables | Parcial | ⚠️ Incompleto | Exportar tabla de movimientos con valorización | **Media** |
| Registro de compras con proveedor | No | ❌ Ausente | Módulo de proveedores + órdenes de compra | **Media** |
| Lotes y números de serie | No | ❌ Ausente | Campo lote/serie en MovimientoStock + UI | **Media** |
| Fechas de vencimiento | No | ❌ Ausente | Campo vencimiento + alerta de vencimiento próximo | **Media** |
| Aprobación de movimientos | Configurado, sin flujo | ⚠️ Incompleto | Hook de aprobación + estados pendiente/aprobado | **Media** |
| Inventario inicial (saldo inicial) | Parcial (ajuste masivo) | ⚠️ Incompleto | Movimiento tipo `SALDO_INICIAL` diferenciado | **Media** |
| Trazabilidad bidireccional (comprobante → movimiento) | Parcial | ⚠️ Incompleto | `documentoReferencia` existe pero no hay enlace navegable | **Baja** |
| Costeo FIFO/LIFO | No | ❌ Ausente | Implementación de método de valuación | **Baja** |
| Stock por ubicación física dentro del almacén | Parcial (campo `ubicacion`) | ⚠️ Incompleto | UI de ubicaciones físicas (estante, pasillo, etc.) | **Baja** |
| Orden de compra integrada a recepción | No | ❌ Ausente | Flujo OC → recepción → entrada de stock | **Baja** |

---

## 12. Brechas técnicas

| Área técnica | Problema | Riesgo | Recomendación | Prioridad |
|-------------|---------|--------|---------------|-----------|
| Persistencia | Todo en localStorage. Sin backend. | **Crítico**: pérdida total de datos, sin multi-dispositivo, sin backup | Migrar a Supabase. Crear tablas `movimientos_stock`, `stock_por_almacen`. Cloudflare Function para movimientos. | **Crítica** |
| Anulación sin reversión | `confirmVoid()` no genera movimiento inverso | **Crítico**: integridad de inventario rota desde la primera anulación | Agregar lógica de reversión en `confirmVoid()` usando `inventory.facade.addMovimiento` | **Crítica** |
| Nota de crédito sin entrada | `isNoteCredit` saltea todo el bloque de stock | **Crítico**: devoluciones invisibles | Implementar bloque `ENTRADA/DEVOLUCION_CLIENTE` para NC | **Crítica** |
| Error silencioso en descuento de stock | `catch (stockError)` en venta: solo toast, sigue el flujo | **Alto**: comprobantes sin movimiento de stock correspondiente | Hacer el fallo de stock bloqueante o implementar cola de reconciliación | **Alta** |
| Campo `cantidad` legacy sin deprecar | Dos fuentes de verdad: `cantidad` y `stockPorAlmacen` | **Alto**: inconsistencias si flujos distintos usan campos distintos | Deprecar `cantidad`, migrar todo a `stockPorAlmacen` | **Alta** |
| Stock reservado sin lógica activa | `stockReservadoPorAlmacen` definido, nunca modificado automáticamente | **Alto**: la columna "Reservado" siempre es 0 | Implementar ciclo de vida de reserva en POS | **Alta** |
| Cálculos en múltiples capas | `summarizeProductStock`, `InventoryService.getStock`, `DisponibilidadTable`, `useInventarioDisponibilidad` todos calculan stock | **Medio**: riesgo de divergencia si la fuente cambia | Centralizar lectura de stock en `stockGateway.ts` exclusivamente | **Media** |
| `TODO` explícito en `accionesStock.ts` | `// TODO: reemplazar por API cuando el backend esté disponible` | **Alto**: confirma que el backend no está implementado | Implementar el reemplazo con API | **Crítica** |
| `TODO` explícito en `MassUpdateModal.tsx` | `// TODO: Calcular stock cuando se implemente gestión de inventario` | **Medio**: función incompleta en producción | Completar el cálculo | **Media** |
| Transacciones atómicas inexistentes | Al actualizar producto + movimiento, si falla en medio, queda estado parcial | **Alto**: inconsistencia entre el historial de movimientos y el stock real | Con backend: usar transacciones de BD. Sin backend: al menos validar antes de mutar. | **Alta** |
| Sin sincronización multi-usuario | Dos usuarios en el mismo tenant pueden sobrescribir stock sin conflictos detectables | **Alto**: condición de carrera en entornos reales | Solo resolvible con backend y bloqueos a nivel de BD | **Alta** |
| Hardcodeo de key de localStorage sin constante centralizada | `'facturafacil_stock_movements'` en repositorio y en tests | **Bajo**: riesgo de typo o inconsistencia | Centralizar en constante exportada | **Baja** |
| Deuda técnica: `configuracionInventarioAlmacen` incompleta | `permiteStockNegativoAlmacen`, `controlEstrictoStock`, `requiereAprobacionMovimientos` definidos pero sin flujo | **Medio**: configuraciones decorativas que generan expectativas falsas | Implementar o eliminar opciones no funcionales | **Media** |

---

## 13. Riesgos para producción

1. **Pérdida de datos irreversible.** Si un cliente borra caché del navegador, historial completo de movimientos y stock actual desaparece. No hay backup. No hay recuperación posible.

2. **Inventario desincronizado desde la primera anulación.** Cada comprobante anulado deja el stock incorrecto para siempre. En un negocio con anulaciones frecuentes (lo habitual), el inventario se vuelve inútil en días.

3. **Devoluciones sin impacto en stock.** Las notas de crédito no restauran stock. El cliente puede devolver mercancía, el stock no lo refleja. Decisiones de reabasto basadas en datos incorrectos.

4. **Sin módulo de compras.** No hay forma de registrar el reabastecimiento de mercancía. El inventario solo puede decrecer por ventas; el único incremento es un ajuste manual. Esto hace el sistema inútil como Kardex desde el día 1.

5. **Stock reservado siempre en 0.** El campo existe, la lógica no. Si un negocio tiene múltiples operadores, pueden vender el mismo stock simultáneamente sin que el sistema lo detecte antes de confirmar.

6. **Sin multi-dispositivo.** Un negocio con dos computadoras (caja + administración) tendrá dos inventarios diferentes que nunca se sincronizan. La fuente de verdad es el navegador, no un servidor compartido.

7. **Error silencioso en descuento de stock.** Si `addMovimientoStock()` falla al emitir un comprobante, el comprobante se emite y el stock no se descuenta. No hay alerta suficiente. El negocio nunca sabrá qué ventas no se aplicaron al inventario.

8. **No soporta auditoría fiscal.** Sin persistencia en servidor, sin firmas de integridad, sin usuario/fecha garantizados por backend: un Kardex basado en localStorage no tiene valor probatorio ante SUNAT u otros entes fiscales.

9. **Riesgo de stock negativo sin control.** Si `allowNegativeStock=true` en configuración, se puede vender indefinidamente sin stock. No hay alerta bloqueante clara en el POS.

10. **Sin lotes/series/vencimientos.** Para negocios que manejan productos perecederos o con número de serie, el sistema es completamente insuficiente.

---

## 14. Recomendaciones de mejora

### Correcciones urgentes (antes de cualquier uso productivo)

1. **Migrar persistencia a Supabase.** Crear tablas `movimientos_stock` y `stock_por_almacen`. Actualizar `StockRepository` para consumir API. Esta es la condición mínima para que el sistema sea confiable.

2. **Implementar reversión de stock al anular comprobante.** En `ListaComprobantes.tsx: confirmVoid()`, agregar llamada a `addMovimientoStock` con tipo `ENTRADA`, motivo `DEVOLUCION_CLIENTE`, referenciando el comprobante anulado, por cada producto de la venta.

3. **Implementar entrada de stock en nota de crédito.** En `useComprobanteActions.tsx`, agregar bloque para `isNoteCredit === true` que genere movimiento `ENTRADA/DEVOLUCION_CLIENTE` por cada ítem de la NC.

4. **Hacer el error de descuento de stock bloqueante.** Si `addMovimientoStock()` falla, mostrar error claro y no continuar o al menos registrar el evento para reconciliación.

### Mejoras necesarias (para inventario operativo básico)

5. **Implementar módulo mínimo de ingresos.** Sin necesidad de proveedores completos: una interfaz que permita registrar una entrada de stock con número de documento, productos y cantidades. Motivo: `COMPRA`.

6. **Implementar stock reservado real.** Al agregar al carrito en POS: incrementar `stockReservadoPorAlmacen`. Al confirmar venta: convertir reserva en salida real. Al cancelar carrito: liberar reserva.

7. **Deprecar campo `cantidad` legacy.** Migrar todos los usos a `stockPorAlmacen`. Eliminar la ambigüedad de dos fuentes de verdad.

8. **Completar o eliminar opciones de configuración de almacén no funcionales.** `requiereAprobacionMovimientos`, `controlEstrictoStock`: implementar o remover de la UI.

### Mejoras para Kardex completo

9. **Agregar campo `costoUnitario` a `MovimientoStock`.** Calcular `costoPromedioPonderado` al registrar entradas. Mostrar valorización en la tabla de movimientos.

10. **Implementar inventario físico / toma de inventario.** Módulo de conteo físico que compara stock real con stock teórico y genera ajustes automáticos con el diferencial.

11. **Kardex valorizado por producto.** Vista de Kardex real con: saldo anterior + cantidad entrada + costo entrada + cantidad salida + costo salida + saldo final + valor saldo final.

12. **Crear enlace navegable comprobante → movimiento.** Desde `documentoReferencia` en el movimiento, navegar directamente al comprobante correspondiente.

### Mejoras futuras

13. Lotes y números de serie con trazabilidad individual.
14. Fechas de vencimiento con alertas configurables.
15. Órdenes de compra integradas con flujo de recepción.
16. Módulo de proveedores.
17. Exportación de Kardex valorizado (Excel/PDF).
18. Dashboard de indicadores de rotación de inventario.
19. Inventario por punto de venta físico con cierre de período.

---

## 15. Roadmap sugerido para convertirlo en Kardex

### Fase 1: Estabilización del stock actual (semanas 1-3)

**Objetivo:** Que el stock sea confiable y no se corrompa.

- [ ] Crear tablas Supabase: `movimientos_stock`, `stock_por_almacen` (con `producto_id`, `almacen_id`, `cantidad_real`, `cantidad_reservada`, `stock_minimo`, `stock_maximo`).
- [ ] Migrar `StockRepository` de localStorage a llamadas a Supabase.
- [ ] Migrar `stockPorAlmacen` del objeto `Product` a la tabla `stock_por_almacen`.
- [ ] Crear Cloudflare Function `/api/inventario/movimiento` para registrar movimientos.
- [ ] Implementar reversión de stock al anular comprobante.
- [ ] Implementar entrada de stock al emitir nota de crédito.
- [ ] Hacer el error de descuento de stock bloqueante en la venta.
- [ ] Deprecar campo `cantidad` legacy.

**Resultado:** Stock confiable, multi-dispositivo, con backup, sin pérdida de datos.

### Fase 2: Movimientos y trazabilidad (semanas 4-6)

**Objetivo:** Que todas las operaciones generen movimientos correctos y trazables.

- [ ] Implementar módulo mínimo de ingresos de mercancía (sin proveedor completo).
- [ ] Implementar stock reservado funcional en el carrito del POS.
- [ ] Agregar enlace navegable entre movimiento y comprobante/documento de origen.
- [ ] Completar flujo de aprobación de movimientos (si `requiereAprobacion=true`).
- [ ] Agregar motivo `INVENTARIO_INICIAL` para la carga inicial de stock.
- [ ] Exportar tabla de movimientos a Excel/CSV.

**Resultado:** Trazabilidad completa de entradas, salidas, transferencias y ajustes.

### Fase 3: Kardex operativo (semanas 7-10)

**Objetivo:** Kardex real con saldo anterior, movimiento, saldo posterior.

- [ ] Agregar `costoUnitario` (precio de compra) al movimiento de stock.
- [ ] Calcular y persistir `costoPromedioPonderado` al registrar entradas.
- [ ] Vista de Kardex por producto: tabla con saldo anterior + entradas + salidas + saldo final por fecha.
- [ ] Implementar inventario físico con módulo de conteo y ajuste.
- [ ] Módulo básico de proveedores (RUC, nombre, contacto) vinculado a ingresos.

**Resultado:** Kardex funcional para auditoría y control de costos básico.

### Fase 4: Kardex valorizado y reportes (semanas 11-16)

**Objetivo:** Kardex con valor monetario y reportes exportables.

- [ ] Kardex valorizado: columnas de costo unitario, valor de entrada, valor de salida, valor de saldo.
- [ ] Reporte de costo de ventas por período.
- [ ] Reporte de rotación de inventario.
- [ ] Soporte opcional para FIFO (costeo por lote de compra).
- [ ] Lotes y números de serie.
- [ ] Fechas de vencimiento y alertas.
- [ ] Exportación de Kardex a Excel/PDF con formato estándar.
- [ ] Dashboard de indicadores: días de inventario, rotación, stock en riesgo.

**Resultado:** Kardex robusto, apto para presentación a contadores y entidades fiscales.

---

## 16. Conclusión final

El módulo de stock de senciyo se clasifica como:

> **Prototipo avanzado / Inventario básico de frontend**

Tiene una arquitectura técnica bien diseñada: tipos correctamente modelados, separación de responsabilidades (Service/Repository/Hook/UI), lógica FIFO para distribución de ventas, alertas de umbral, transferencias entre almacenes, y una UI completa con múltiples vistas. Es el trabajo de un equipo que sabe a dónde quiere llegar.

Sin embargo, en su estado actual **no es apto para uso productivo** por los siguientes motivos fundamentales:

1. **No tiene backend.** Todo el stock vive en `localStorage` del navegador. Un comprobante de stock que desaparece al limpiar caché no tiene valor para ningún negocio.

2. **Dos flujos críticos están rotos.** Anular un comprobante no restaura el stock. Las notas de crédito tampoco. Esto significa que el stock diverge de la realidad desde el primer día de operación real.

3. **No es un Kardex.** No tiene valorización, no tiene costo de ventas, no tiene saldo valorizado por movimiento, no tiene inventario físico. Es un libro de movimientos de cantidades, no un Kardex contable.

El camino hacia un Kardex operativo existe y está bien trazado en el código (los tipos, la arquitectura, los TODOs). La prioridad inmediata es implementar el backend (Fase 1 del roadmap) y corregir los dos bugs críticos de anulación y notas de crédito. Sin eso, no hay inventario: hay una lista de números que no puede ser confiada.

---

*Informe generado por auditoría de código estático. No se modificó ningún archivo del proyecto. Todas las afirmaciones están referenciadas a evidencia de código real.*
