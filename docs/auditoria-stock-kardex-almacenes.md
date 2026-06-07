# Auditoría de Stock, Kardex y Almacenes — SenciYo

> Sistema: FacturaFacil / senciyo — Facturación electrónica SUNAT Perú (React + TypeScript)
> Persistencia: localStorage vía contexto global (`state.almacenes`, `state.catalogo`)
> Fecha de auditoría: 2026-06-06
> Alcance: 13 análisis paralelos del flujo de stock, Kardex y administración de almacenes

---

## 1. Resumen ejecutivo

El sistema de inventario de senciyo está construido sobre un modelo de stock por almacén (`stockPorAlmacen: Record<string, number>` y `stockReservadoPorAlmacen: Record<string, number>`) persistido en localStorage. El motor de salida de stock para ventas (`stockGateway.ts`) está **correctamente implementado** para el requisito funcional central: la función `resolvealmacenesForSaleFIFO` ordena los almacenes por `prioridadSalida` (recientemente migrado desde `esAlmacenPrincipal`), y `allocateSaleAcrossalmacenes` aplica un waterfall FIFO progresivo que descuenta almacén por almacén hasta cubrir la cantidad solicitada. El flujo de comprobantes electrónicos y el POS comparten exactamente el mismo `createComprobante` y consumen correctamente este motor, generando un movimiento de Kardex por almacén afectado y respetando la preferencia `allowNegativeStock`.

Sin embargo, la auditoría detectó **múltiples zonas de desalineación y deuda técnica** que comprometen la consistencia del inventario:

1. **Tres fuentes de verdad de stock coexisten sin sincronización**: `stockPorAlmacen` (fuente actual), `stockPorEstablecimiento` (intermedio) y `cantidad` (legacy). Distintos flujos actualizan unos y no otros, generando inconsistencia silenciosa.
2. **Ajustes manuales, Nota de Ingreso e Importación masiva NO recalculan el campo legacy `cantidad` ni `stockPorEstablecimiento`**, mientras que las Transferencias sí. El campo `cantidad` queda crónicamente desactualizado.
3. **La preferencia "Control de stock en ventas" (`allowNegativeStock`) solo se respeta en Comprobantes y POS.** Documentos comerciales, ajustes de inventario y otros flujos la ignoran por completo. Su valor por defecto es `true` en una capa (permisivo) y `false` en otra, generando ambigüedad.
4. **La Orden de Venta reserva en un solo almacén (el principal)**, ignorando la prioridad FIFO y sin distribuir la reserva entre varios almacenes. Esto contradice el comportamiento progresivo del descuento de venta.
5. **La eliminación de almacenes no valida stock real ni stock reservado en productos.** Solo verifica un flag estático `tieneMovimientosInventario` que nunca se actualiza automáticamente, dejando posibilidad de datos huérfanos.
6. **No hay guard de doble-descuento** explícito entre Orden de Venta y emisión de comprobante; la protección es indirecta vía `respectReservations`.
7. **`projectAvailableAfterMovement` muta `stock` físico junto con `available`**, produciendo proyecciones inconsistentes para ventas (que solo deberían afectar `reserved`).

**Veredicto general:** El núcleo del descuento FIFO multi-almacén está correcto y cumple la regla funcional esperada. Los riesgos se concentran en (a) la falta de una única fuente de verdad de stock total, (b) la integración parcial de la preferencia de control de stock, y (c) la ausencia de validaciones de integridad referencial al eliminar almacenes.

---

## 2. Reglas funcionales esperadas

**Regla A — Descuento progresivo multi-almacén (FIFO por prioridad de salida):**
Venta de 50 unidades con Almacén1=10, Almacén2=20, Almacén3=50 debe descontar:
- 10 de A1 (agota)
- 20 de A2 (agota)
- 20 de A3 (parcial, queda 30)

El sistema **NO debe** buscar un único almacén que alcance a cubrir todo (no debe descontar 50 de A3 solo). Debe ser progresivo (waterfall) siguiendo el orden de `prioridadSalida`.

**Regla B — Control de stock configurable:**
- Si "Control de stock en ventas" está **activado** (`allowNegativeStock = false`): bloquear la venta si el stock disponible es insuficiente.
- Si está **desactivado** (`allowNegativeStock = true`): permitir la venta aunque el stock quede negativo.

**Regla C — Cálculo de disponible:**
Disponible por almacén = `stock − reservado` (nunca negativo a nivel de cálculo: `stock <= reserved ? 0 : stock - reserved`). El total disponible es la suma de los disponibles por almacén, no `stock_total − reservado_total`.

**Regla D — Trazabilidad (Kardex):**
Todo movimiento que altere stock físico debe generar un registro de Kardex (`MovimientoStock`) por almacén afectado, con saldo anterior y posterior.

**Regla E — Integridad de almacenes:**
No se debe poder eliminar un almacén que tenga stock, reservas o movimientos asociados sin un manejo de cascada o bloqueo. Un establecimiento no debe quedar sin almacenes activos.

---

## 3. Archivos revisados

### Motor de stock (compartido)
- `apps/senciyo/src/shared/inventory/stockGateway.ts` — motor FIFO, cálculo de disponible, allocation por almacén
- `apps/senciyo/src/shared/inventory/accionesStock.ts` — acciones compartidas de ajuste

### Catálogo / modelos
- `apps/senciyo/src/pages/Private/features/catalogo-articulos/.../types.ts` — modelo `Product` (líneas 45-51, campos de stock)
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/modelos/Almacen.ts` — modelo `Almacen` y `ConfiguracionInventarioAlmacen`
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/modelos/Configuration.ts`
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/modelos/Establecimiento.ts`

### Gestión de inventario
- `apps/senciyo/src/pages/Private/features/gestion-inventario/models/inventory.types.ts` — `MovimientoStock`, `MovimientoTipo`, `MovimientoMotivo`
- `apps/senciyo/src/pages/Private/features/gestion-inventario/services/inventory.service.ts` — `registerAdjustment`, `registerTransfer`, `updateStock`, `getTotalStock`
- `apps/senciyo/src/pages/Private/features/gestion-inventario/repositories/stock.repository.ts` — persistencia de movimientos
- `apps/senciyo/src/pages/Private/features/gestion-inventario/repositories/notaIngreso.repository.ts`
- `apps/senciyo/src/pages/Private/features/gestion-inventario/repositories/transferencia.repository.ts`
- `apps/senciyo/src/pages/Private/features/gestion-inventario/api/inventory.facade.ts` — escritura de stock y Kardex
- `apps/senciyo/src/pages/Private/features/gestion-inventario/services/notaIngreso.service.ts` — `generarNIEnInventario`, `anularNIEnInventario`
- `apps/senciyo/src/pages/Private/features/gestion-inventario/hooks/useInventory.ts` — `handleStockAdjustment`, `handleCreateTransfer`, etc.
- `apps/senciyo/src/pages/Private/features/gestion-inventario/hooks/useNotasIngreso.ts`
- `apps/senciyo/src/pages/Private/features/gestion-inventario/pages/InventoryPage.tsx` — página Kardex (tabs)
- `apps/senciyo/src/pages/Private/features/gestion-inventario/components/modals/AdjustmentModal.tsx`
- `apps/senciyo/src/pages/Private/features/gestion-inventario/components/modals/TransferModal.tsx`
- `apps/senciyo/src/pages/Private/features/gestion-inventario/components/PanelImportacionStock.tsx` — importación masiva de stock

### Comprobantes / POS
- `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/hooks/useComprobanteActions.tsx` — `createComprobante` (núcleo del descuento)
- `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/hooks/useAvailableProducts.tsx` — campo `stock` visible al cajero
- `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/punto-venta/hooks/useCart.tsx` — validación en carrito
- `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/.../ListaComprobantes.tsx` — anulación
- `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/.../ProductGrid.tsx`, `ProductsSection.tsx`

### Documentos comerciales (OV, nota de venta, cotización)
- `apps/senciyo/src/pages/Private/features/documentos-comerciales/hooks/useDocumentoComercialActions.ts`
- `apps/senciyo/src/pages/Private/features/documentos-comerciales/utils/servicioReservaStock.ts`
- `apps/senciyo/src/pages/Private/features/documentos-comerciales/utils/convertirOVaComprobante.ts`
- `apps/senciyo/src/shared/documentosComerciales/postEmisionOrdenVenta.ts`

### Configuración / preferencias
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion.tsx` — carga/guarda `salesPreferences`
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/components/negocio/SeccionPreferenciasVenta.tsx` — switch UI
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/paginas/ConfiguracionAlmacenes.tsx` — `handleDelete`, `handleToggleStatus`

---

## 4. Modelo actual de stock

### Campos de stock en el modelo `Product` (`types.ts`, líneas 45-51)

Todos opcionales, marcados como "Compatibilidad con módulos de inventario/ventas (no usada en UI de catálogo)":

| Campo | Tipo | Rol |
|---|---|---|
| `cantidad` | `number \| undefined` | Stock global plano. **Campo legacy / fallback**. |
| `stockPorEstablecimiento` | `Record<string, number> \| undefined` | Clave = `establecimientoId`. Nivel intermedio. |
| `stockPorAlmacen` | `Record<string, number> \| undefined` | Clave = `almacenId`. **Fuente de verdad actual.** |
| `stockReservadoPorAlmacen` | `Record<string, number> \| undefined` | Clave = `almacenId`. Reservas por almacén. |
| `stockMinimoPorAlmacen` | `Record<string, number> \| undefined` | Umbral mínimo por almacén. |
| `stockMaximoPorAlmacen` | `Record<string, number> \| undefined` | Umbral máximo por almacén. |

**No existe campo `stockTotal` persistido.** El total se calcula en runtime dentro de `stockGateway.ts` como `ProductStockSummary.totalStock`.

### Jerarquía y relación

```
Empresa (RUC) → Establecimiento → Almacen → Product.stockPorAlmacen[almacenId]
```

- `Product.establecimientoIds: string[]` — vínculo producto↔establecimiento.
- `Product.stockPorEstablecimiento[establecimientoId]` — stock por establecimiento.
- `Product.stockPorAlmacen[almacenId]` — stock por almacén.
- `Almacen.establecimientoId: string` — vincula almacén a establecimiento.

La relación es **por referencia de ID**, no por nesting. Para obtener almacenes de un establecimiento se filtra `Almacen[]` por `almacen.establecimientoId === establecimientoId`.

### Orden de fallback (`stockGateway.ts → pickFallbackStock`)

```
stockPorAlmacen → stockPorEstablecimiento → cantidad
```

`pickFallbackStock` (líneas 48-65, privada) se invoca solo desde `summarizeProductStock` cuando el breakdown queda vacío. Inserta un registro ficticio con `almacenId: EstablecimientoId || 'general'` e `isFallback: true` (líneas 131-140) — esto puede generar un `almacenId` que no corresponde a ningún `Almacen` real.

### Problema raíz: tres fuentes de verdad sin sincronización

`cantidad`, `stockPorEstablecimiento` y `stockPorAlmacen` coexisten en el mismo modelo y **nadie las sincroniza automáticamente de forma consistente**. Solo las transferencias recalculan `cantidad` y `stockPorEstablecimiento`; los ajustes, notas de ingreso e importación masiva NO lo hacen (ver secciones 8, 9, 11).

---

## 5. Modelo actual de almacenes

Archivo: `configuracion-sistema/modelos/Almacen.ts`

### `interface ConfiguracionInventarioAlmacen`

| Campo | Tipo | Obligatorio |
|---|---|---|
| `permiteStockNegativoAlmacen` | `boolean` | sí |
| `controlEstrictoStock` | `boolean` | sí |
| `requiereAprobacionMovimientos` | `boolean` | sí |
| `capacidadMaxima` | `number` | no |
| `unidadCapacidad` | `'units' \| 'm3' \| 'm2'` | no |

### `interface Almacen`

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | `string` | sí | |
| `codigoAlmacen` | `string` | sí | |
| `nombreAlmacen` | `string` | sí | |
| `establecimientoId` | `string` | sí | FK al establecimiento |
| `nombreEstablecimientoDesnormalizado` | `string` | no | |
| `codigoEstablecimientoDesnormalizado` | `string` | no | |
| `descripcionAlmacen` | `string` | no | |
| `ubicacionAlmacen` | `string` | no | |
| `estaActivoAlmacen` | `boolean` | sí | |
| `esAlmacenPrincipal` | `boolean` | sí | |
| `prioridadSalida` | `number` | **no** | FIFO salida: 1 = mayor prioridad; si undefined y principal → 1, sino → 999 |
| `configuracionInventarioAlmacen` | `ConfiguracionInventarioAlmacen` | sí | |
| `creadoElAlmacen` | `Date` | sí | |
| `actualizadoElAlmacen` | `Date` | sí | |
| `creadoPor` | `string` | no | |
| `actualizadoPor` | `string` | no | |
| `tieneMovimientosInventario` | `boolean` | no | Flag de protección contra borrado (estático, no auto-actualizado) |

**Observaciones críticas:**
- `prioridadSalida` es opcional. El fallback en `resolvealmacenesForSaleFIFO` lo deriva de `esAlmacenPrincipal`. Esto garantiza compatibilidad pero introduce ambigüedad si dos almacenes no-principales quedan ambos en 999 (se desempata por `codigoAlmacen → nombreAlmacen → id`).
- `permiteStockNegativoAlmacen` (por almacén) **existe pero NUNCA se consulta** en ningún flujo de venta. Solo se usa la preferencia global `salesPreferences.allowNegativeStock`.
- `controlEstrictoStock` (por almacén) tampoco se integra en la validación de ventas.

---

## 6. Modelo actual de movimientos/Kardex

### `interface MovimientoStock` (`inventory.types.ts`)

```ts
interface MovimientoStock {
  id: string;                          // MOV-{timestamp}-{random}
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  tipo: MovimientoTipo;                // ENTRADA | SALIDA | AJUSTE_POSITIVO | AJUSTE_NEGATIVO | DEVOLUCION | MERMA | TRANSFERENCIA
  motivo: MovimientoMotivo;            // COMPRA | VENTA | AJUSTE_INVENTARIO | DEVOLUCION_CLIENTE | DEVOLUCION_PROVEEDOR | PRODUCTO_DAÑADO | PRODUCTO_VENCIDO | ROBO_PERDIDA | TRANSFERENCIA_ALMACEN | PRODUCCION | MERMA | OTRO
  cantidad: number;
  cantidadAnterior: number;            // saldo antes
  cantidadNueva: number;               // saldo después
  usuario: string;                     // nombre de usuario (NO id)
  observaciones?: string;
  documentoReferencia?: string;
  fecha: Date;
  ubicacion?: string;
  almacenId: string;
  almacenCodigo: string;
  almacenNombre: string;
  EstablecimientoId: string;
  EstablecimientoCodigo: string;
  EstablecimientoNombre: string;
  esTransferencia?: boolean;
  transferenciaId?: string;
  tipoTransferencia?: 'INTRA_ESTABLECIMIENTO' | 'INTER_ESTABLECIMIENTO';
  almacenOrigenId?: string;
  almacenOrigenNombre?: string;
  almacenDestinoId?: string;
  almacenDestinoNombre?: string;
  movimientoRelacionadoId?: string;
}
```

### Puntos de creación

Dos caminos:
- `InventoryService.registerAdjustment()` (`inventory.service.ts` línea 110) → `StockRepository.addMovement()` (línea 161). Usado por NI, ajustes, importación masiva.
- `useInventoryFacade().addMovimiento()` (`inventory.facade.ts` línea 24) → `StockRepository.addMovement()` (línea 132). Usado por Comprobantes, POS, anulación, NC.

### Persistencia

- localStorage, clave con prefijo de tenant: `'{tenantId}_facturafacil_stock_movements'` (`stock.repository.ts` línea 6).
- **No hay reducer ni estado Zustand.** Lectura/escritura directa a localStorage.
- Tras cada escritura se emite el evento DOM `facturafacil:stock-movements-changed`. `useInventory` lo escucha para recargar.

### Página de Kardex — `InventoryPage.tsx`

Tabs: **Stock Actual** (`situacion`), **Movimientos** (`movimientos`, el Kardex funcional vía `MovementsTable` + `MovimientoDetalleModal`), **Transferencias**, **Alertas**, **Importar stock**, **Notas de Ingreso**.

Exportación a Excel: Fecha, Producto, Tipo, Motivo, Fuente, Movimiento, Saldo Anterior, Saldo Final, Almacén, Establecimiento, Usuario, Documento/Ref., Observaciones, datos de transferencia.

**Limitación:** No tiene columna de "Saldo acumulado en tiempo real" tipo Kardex contable clásico. Solo guarda saldo anterior/posterior por registro individual; el saldo acumulado no se recalcula.

### Movimientos por operación

| Operación | # movimientos |
|---|---|
| Venta que afecta 3 almacenes | 3 (uno por almacén) |
| Nota de Ingreso | 1 por línea de producto |
| Ajuste manual | 1 |
| Importación masiva | 1 por celda con cambio |
| Transferencia INTRA | 2 (salida + entrada, vinculados) |
| Transferencia INTER inmediata | 2 |
| Transferencia INTER 2 fases | 1 (despacho) + 1 (recepción) |
| NC devolución (06/07) | 1 por item (ENTRADA/DEVOLUCION_CLIENTE) |
| Anulación de comprobante | 1 por movimiento de salida original (reversión) |

---

## 7. Cálculo actual de stock real, reservado y disponible

### `summarizeProductStock` (`stockGateway.ts` líneas 93-160)

- Calcula **por almacén** individualmente: `available = stock <= reserved ? 0 : stock - reserved` (línea 112).
- `totalStock` = suma de stock de almacenes del establecimiento.
- `totalReserved` = suma de reservados.
- `totalAvailable` = **suma de los `available` por almacén** (no `totalStock − totalReserved`). Esto es correcto: evita que reservas de un almacén descuenten stock de otro.

### Funciones relacionadas

- `getAvailableStockForUnit` (168-188): convierte `totalAvailable` de unidad mínima a la unidad seleccionada vía `convertFromUnidadMinima`. Retorna `availableInUnidadSeleccionada`. **Es el que alimenta el campo `stock` visible al cajero en el POS.**
- `hasSufficientStock` (350-358): `totalAvailable >= requiredCantidadUnidadMinima`. Check booleano simple.
- `getalmacenAvailability` (337-348): lookup en breakdown por `almacenId`; si no se pasa id retorna `breakdown[0]` (sin garantía de cuál es — puede ser el fallback ficticio).
- `calculateRequiredUnidadMinima` (405-417): delega en `convertToUnidadMinima`.
- `projectAvailableAfterMovement` (360-403): proyecta el efecto de un movimiento de salida. **DEFECTO: resta del `stock` físico lo mismo que resta del `available` (líneas 378-383), sin tocar `reserved`.** Para una venta esto es incorrecto: una venta debería afectar `reserved`/disponible, no proyectar reducción del `stock` físico bruto. Genera una proyección de `totalStock` inconsistente.

### Duplicación de la fórmula de disponible

La fórmula `available = stock <= reserved ? 0 : stock - reserved` aparece **idéntica** en:
- `summarizeProductStock` línea 112.
- `allocateSaleAcrossalmacenes` línea 294.

No hay helper común. Riesgo de divergencia futura si solo se modifica uno.

### Funciones que NO existen (pese a referencias esperadas)

- `getProductStockForEstablecimiento` — NO existe en todo el proyecto. Equivalente: `summarizeProductStock`.
- `getProductAvailableStockForEstablecimiento` — NO existe. El cálculo está embebido en `summarizeProductStock`.

---

## 8. Comportamiento actual en Nota de Ingreso

Archivo principal: `notaIngreso.service.ts` (`generarNIEnInventario`, `anularNIEnInventario`), orquestado por `useNotasIngreso.ts`.

| Aspecto | Comportamiento |
|---|---|
| Actualiza `stockPorAlmacen[almacenId]` | **SÍ** (vía `registerAdjustment` → `updateStock`, suma `stockActual + cantidad`) |
| Actualiza `cantidad` (legacy) | **NO** — `registerAdjustment` no recalcula `cantidad`. Queda desactualizado. |
| Actualiza `stockPorEstablecimiento` | **NO** — nunca tocado por NI |
| Actualiza `stockReservadoPorAlmacen` | **NO** (correcto por diseño) |
| Resolución de almacén destino | `linea.almacenId ?? nota.almacenDestinoId` (por línea, con fallback a cabecera). Correcto. |
| Genera Kardex | **SÍ** — `MovimientoStock` tipo `ENTRADA`, motivo mapeado del `tipoIngreso` (ej. `02` → `COMPRA`), `documentoReferencia` = número NI |
| Valida almacén activo antes de ingresar | **NO** — solo valida que el almacén exista en el mapa (`almacenesMap.has(...)`). Se puede ingresar a un almacén inactivo. |
| Anulación revierte stock | **SÍ**, con guard anti-negativo: valida `getStock >= linea.cantidad` antes de generar `AJUSTE_NEGATIVO`. Simétrico y correcto. |
| Aparece en historial | **SÍ** — en `MovementsTable` (movimiento persistido) y en `nota.historial` (`EventoHistorialNI`, acción "Generada"/"Anulada") |
| Validación de duplicados | Correlativo auto vía `generarCorrelativoNI` (máx existente + 1 por serie). **NO** valida duplicados por `numeroDocumentoOrigen` (número de factura del proveedor). Dedup solo por ID interno. |

**Gaps:** (1) no recalcula `cantidad`/`stockPorEstablecimiento`; (2) permite ingreso a almacén inactivo; (3) no previene NI duplicadas por documento de proveedor.

---

## 9. Comportamiento actual en Ajustes de Stock

Archivos: `AdjustmentModal.tsx` (UI, `handleSubmit`), `inventory.service.ts` (`registerAdjustment`), `useInventory.ts` (`handleStockAdjustment`, línea 150).

| Aspecto | Comportamiento |
|---|---|
| Aumenta/disminuye `stockPorAlmacen[almacenId]` | **SÍ**. ENTRADA/AJUSTE_POSITIVO/DEVOLUCION → suma; SALIDA/AJUSTE_NEGATIVO/MERMA → resta. |
| Requiere almacén activo | **SÍ**. `handleStockAdjustment` busca en `almacenesActivos` (filtrado `estaActivoAlmacen`); el modal también filtra (línea 39). |
| Permite stock negativo | **PARCIALMENTE / NO**. `updateStock` aplica `Math.max(0, normalizedQuantity)` por defecto. `registerAdjustment` NO pasa `{ allowNegativeStock: true }`, así que el resultado se fuerza a 0 silenciosamente. **No respeta la preferencia global de ventas.** |
| Genera Kardex | **SÍ** (`MovimientoStock` con cantidadAnterior/cantidadNueva, persistido). |
| Impacta `stockReservadoPorAlmacen` | **NO** (correcto). |
| Validación de permisos | **SÍ** — `tienePermiso({ permisoId: 'inventario.ajustar' })`. Importación masiva usa `'inventario.actualizacion_masiva'`. |
| Tipos de ajuste | ENTRADA, SALIDA, AJUSTE_POSITIVO, AJUSTE_NEGATIVO (más DEVOLUCION, MERMA, TRANSFERENCIA en el tipo). Motivos granulares por tipo. |
| Actualiza `cantidad` / `stockPorEstablecimiento` | **NO** — gap principal. Contrasta con transferencias que sí llaman `syncEstablecimientoStock` + recalculan `cantidad`. |

**Gap crítico:** ajustes simples dejan `cantidad` y `stockPorEstablecimiento` desincronizados respecto a `stockPorAlmacen`. Comportamiento silencioso de "stock forzado a 0" sin advertencia al usuario.

---

## 10. Comportamiento actual en Transferencias

Archivo: `inventory.service.ts` (`registerTransfer`, línea 169), orquestado por `useInventory.handleCreateTransfer`. **Implementado y completamente funcional.**

| Aspecto | Comportamiento |
|---|---|
| Descuenta de origen | **SÍ** (línea 191: `updateStock(product, almacenOrigenId, stockOrigen - cantidad)`) |
| Aumenta en destino | **SÍ** (línea 192) |
| Valida stock suficiente en origen | **SÍ** (líneas 180-182: lanza error si `stockOrigen < cantidad`). También en `registerTransferSalida` (inter, al despachar) y en `TransferModal.tsx` línea 113. |
| Permite transferir entre establecimientos | **SÍ** — `INTER_ESTABLECIMIENTO` con flujo de 3 estados: PENDIENTE → EN_TRANSITO → RECIBIDA. |
| Genera 2 movimientos Kardex | **SÍ**. INTRA: `registerTransfer` genera salida + entrada vinculados por `movimientoRelacionadoId`. INTER: `registerTransferSalida` (despacho) + `registerTransferEntrada` (recepción). |
| Respeta activo/inactivo | **SÍ** — usa exclusivamente `almacenesActivos` (`useInventory.ts` líneas 89-92) y el modal filtra (línea 29). |
| Impacta `stockReservadoPorAlmacen` | **NO** lo toca. **DEFECTO POTENCIAL**: la validación usa `stockPorAlmacen[origenId]` bruto, sin restar reservas. Si hay stock reservado en origen, la transferencia puede mover stock ya comprometido. |
| Recalcula `cantidad` / `stockPorEstablecimiento` | **SÍ** — único flujo que lo hace correctamente (`syncEstablecimientoStock`, `cantidad: getTotalStock(...)`). |

**Componentes:** `transferencia.types.ts`, `transferencia.repository.ts`, 4 métodos de servicio, 5 handlers, `TransferModal.tsx`, `TransferenciasPanel.tsx`, `DetalleTransferencia.tsx`, `ConfirmacionAnulacion.tsx`. Anulación: 1 movimiento si EN_TRANSITO, 2 inversos si CONFIRMADA/RECIBIDA.

**Único defecto:** validación de origen sobre stock bruto, no sobre disponible (`stock − reservado`).

---

## 11. Comportamiento actual en Importación de Stock

Archivo: `PanelImportacionStock.tsx`. Función principal `aplicarImportacion()` (líneas 388-488). Parsers: `parsearFormatoNuevo()` (74-146), `parsearFormatoLegacy()` (154-218). Delega en `InventoryService.registerAdjustment()`.

> Nota: existe también importación masiva de **PRODUCTOS** (catálogo, `ImportPage.tsx`/`ImportModal.tsx`) que **NO toca stock**.

| Aspecto | Comportamiento |
|---|---|
| Carga por almacén o total | **Por almacén** — una columna por almacén activo (`{codigo} - {nombre}`). Usa `stockPorAlmacen[almacenId]`. |
| Recalcula `cantidad` (total) | **NO** — gap menor (igual que ajustes/NI). |
| Reemplaza o suma | **Ambos modos**: "Actualizar stock final" (default, calcula diferencia → ajuste +/−) o "Sumar ingreso" (suma, solo valores ≥ 0). Celda vacía = sin cambio. |
| Genera Kardex | **SÍ** — `AJUSTE_POSITIVO`/`AJUSTE_NEGATIVO`, motivo `AJUSTE_INVENTARIO`, `documentoReferencia` = lote `IMP-YYYYMMDD-HHMMSS`. |
| Valida almacén activo | **PARCIALMENTE** — plantilla solo con `almacenesActivos`; en `aplicarImportacion` línea 415-416, si el ID no es activo la fila se omite **silenciosamente** (`continue`), sin error explícito. |
| Impacta `stockReservadoPorAlmacen` | **NO** (correcto). |
| Validación de formato | Robusta: detección formato nuevo/legacy, valida columna CODIGO, valores numéricos, no-negativos, duplicados (toma primero + warning), columnas desconocidas (warning), archivo vacío (bloqueante), no encontrados (reporte post-import). Botón "Aplicar" deshabilitado si `tieneErroresBloqueantes`. Acepta `.xlsx`, `.xls`, `.csv`, `.txt`. |

---

## 12. Comportamiento actual en Comprobantes

Archivo: `useComprobanteActions.tsx`, función `createComprobante` (línea 268). Bloque de stock: líneas 492-627.

**Flujo de descuento:**
1. Línea 504: `const almacenesOrdered = resolvealmacenesForSaleFIFO({ almacenes, EstablecimientoId });`
2. Por cada item con `requiresStockControl === true` y `tipoDetalle !== 'libre'`:
   - Convierte cantidad a unidad mínima (`calculateRequiredUnidadMinima`).
   - Línea 554: `allocateSaleAcrossalmacenes({ ..., respectReservations: true })` → array `{ almacenId, qtyUnidadMinima }`.
   - Acumula `pendingMovements` (uno por almacén afectado).
3. Línea 564: **BLOQUEO** — `if (!allowNegativeStock && remaining > 0) throw new Error('Stock insuficiente...')`
4. Línea 581: **PERMISO** — `if (allowNegativeStock && remaining > 0)` → empuja el remanente al **primer almacén FIFO** (`almacenesOrdered[0].id`).
5. Línea 593: aplica movimientos vía `addMovimientoStock` → `inventory.facade.ts` → `InventoryService.updateStock` + `updateProduct`.

| Aspecto | Comportamiento |
|---|---|
| Validación de stock | Dentro del bloque de descuento (no separada). Campo: `stockPorAlmacen[almacenId]` − `stockReservadoPorAlmacen[almacenId]`. **Por almacén individual**, comparando suma asignada vs requerido. |
| Lee `allowNegativeStock` | Línea 139 (`allowNegativeStockConfig`), 498 (asignación local), 564 (bloqueo), 581 (permiso). Viene de `salesPreferences.allowNegativeStock`. |
| Funciones de descuento | `resolvealmacenesForSaleFIFO` (504) + `allocateSaleAcrossalmacenes` (554). |
| Descuento por almacén | **SÍ** — un `PendingMovement` por segmento. |
| Genera Kardex por almacén | **SÍ** — un `MovimientoStock` por almacén afectado (`inventory.facade.ts` línea 132). |
| Actualiza `stockPorAlmacen` | `inventory.facade.ts` líneas 98-101 (`stockPorAlmacen`, `cantidad: totalStock`, `fechaActualizacion`) + `updateProduct` (107). **Aquí sí recalcula `cantidad`** (a diferencia de ajustes/NI). |
| Respeta reserva de OV | `respectReservations: true` evita consumir stock reservado, pero **NO libera explícitamente** la reserva de la OV antes de descontar. El descuento va al stock libre. |
| Guard de doble-descuento | **NO existe** explícito. Protección indirecta: `respectReservations` evita consumir reservado. Si la OV solo reservó (no descontó físico), no hay doble descuento físico, pero no hay flag de verificación. |

**Tipos especiales:**
- NC códigos 06/07 (devolución): genera ENTRADA/DEVOLUCION_CLIENTE restaurando stock. **`allowNegativeStock: true` hardcodeado** (líneas 689, 706, 725).
- Anulación (`ListaComprobantes.tsx` línea 734/745): ENTRADA/DEVOLUCION_CLIENTE reversiva, **`allowNegativeStock: true` hardcodeado**.
- NC sin código 06/07, ND y otros: no generan movimiento de stock.

---

## 13. Comportamiento actual en POS

Comparte exactamente `createComprobante` con Comprobantes. Diferencia de entrada: `source: 'pos'`.

**Validación en carrito** — `useCart.tsx`, `validateStockAvailability` (línea 209):
- Si `requiresStockControl === false`: pasa sin validar.
- `summarizeProductStock` → `totalAvailable` (suma de todos los almacenes, **NO FIFO**).
- Convierte cantidad solicitada a unidad mínima; compara.
- Si no alcanza y `!allowNegativeStock`: `alert()` + retorna `false` (bloquea add).
- Si no alcanza y `allowNegativeStock === true`: pasa igual (sin alerta).

| Aspecto | Comportamiento |
|---|---|
| Stock mostrado al cajero | Campo `product.stock` de `POSProduct`, poblado en `useAvailableProducts.tsx` línea 120 con `stockInfo.availableInUnidadSeleccionada` (de `getAvailableStockForUnit`). Leído en `ProductGrid.tsx` línea 504. |
| Validación usa FIFO o total | **Carrito: total** (`summarizeProductStock`). **Confirmación: FIFO** (`resolvealmacenesForSaleFIFO` + `allocateSaleAcrossalmacenes`). |
| Lee `allowNegativeStock` | `useCart.tsx` 135-139 (default `false` si no es booleano); `useComprobanteActions.tsx` 139. |
| Descuento por almacén | **SÍ** (idéntico a comprobantes). |
| Genera Kardex | **SÍ** (idéntico). |
| Respeta prioridad de almacenes | **SÍ** (`prioridadSalida` ASC). |
| Caso 0 stock + `allowNegativeStock=true` | Carrito: detecta insuficiente pero pasa (no bloquea, no alerta). Confirmación: rama `allowNegativeStock && remaining > 0` empuja el restante al primer almacén FIFO; `cantidadNueva` puede quedar **negativo**; Kardex registra negativo. |

**Diferencias POS vs emisión tradicional:** solo permiso (`ventas.pos.vender` vs `ventas.comprobantes.emitir`), campo `origen` (`'pos'` vs `'emision_tradicional'`), analítica, y UX (POS usa `usePosComprobanteFlow` con auto-cobranza). El descuento, Kardex, FIFO y validación de `allowNegativeStock` son **idénticos**.

---

## 14. Comportamiento actual en Cotización

Archivo: `useDocumentoComercialActions.ts`, `generarDocumento` (línea 109).

**La cotización NO afecta el stock de ninguna forma.** No valida, no reserva, no descuenta, no genera Kardex. El bloque de stock está envuelto en `if (datos.tipo === 'orden_venta')`, que excluye a la cotización. Estado inicial `'Generada'`, `reservasStock` queda `undefined`. Documento puramente comercial/administrativo. No lee `allowNegativeStock` ni usa funciones de `stockGateway`.

---

## 15. Comportamiento actual en Nota de Venta

Mismo razonamiento que la cotización. **La nota de venta NO afecta el stock**: el `if (datos.tipo === 'orden_venta')` la excluye. Estado inicial `'Generada'`, `reservasStock` `undefined`. No descuenta, no reserva, no genera Kardex, no lee `allowNegativeStock`, no usa `resolvealmacenesForSaleFIFO`.

**Conversión a comprobante:** `puedeConvertir` (`ListadoDocumentosComerciales.tsx` líneas 94-96) exige `doc.tipo === 'orden_venta' && doc.estado === 'Reservada' && !doc.esBorrador`. **La nota de venta NO puede convertirse a comprobante** vía el flujo de documentos-comerciales. En el módulo legacy `documentos_negociacion` puede haber conversión, pero el post-emisión solo ejecuta `actualizarOrdenVentaPostEmision` si `conversionSourceType === 'orden_venta'`; para otros tipos no toca stock.

**Diferencia crítica Nota de Venta vs Comprobante:**

| Aspecto | Nota de Venta | Comprobante (Factura/Boleta) |
|---|---|---|
| Valida stock | No | Sí (bloquea si `allowNegativeStock=false`) |
| Descuenta stock real | No | Sí (`addMovimientoStock` SALIDA/VENTA) |
| Kardex | No | Sí |
| Resolución almacén | N/A | FIFO multi-almacén |
| Respeta `allowNegativeStock` | N/A | Sí |
| Reserva stock | No | No (descuenta directo) |

Una nota de venta emitida **NO mueve inventario**.

---

## 16. Comportamiento actual en Orden de Venta

Archivos: `useDocumentoComercialActions.ts` (`generarDocumento`, `generarDesdeBorrador`, `anularDocumento`), `servicioReservaStock.ts` (`validarStockParaOrden`, `reservarStockOrden`, `liberarReservaOrden`).

| Aspecto | Comportamiento |
|---|---|
| Reserva stock | **SÍ** — incrementa `stockReservadoPorAlmacen[almacenId]`. NO toca `stockPorAlmacen`. |
| Reserva por almacén o total | **Por un único almacén** — `resolvealmacenForSale()` (singular). `ReservaStockItem` = `{ sku, nombre, cantidad, almacenId, almacenNombre }`. |
| Respeta prioridad FIFO | **NO** — usa `resolvealmacenForSale` (un solo almacén: principal/preferido/primer activo), **NO** `resolvealmacenesForSaleFIFO`. |
| Distribuye reserva multi-almacén | **NO** — solo un almacén. Si no alcanza, `validarStockParaOrden` bloquea. `allocateSaleAcrossalmacenes` no se usa aquí. |
| Valida stock antes de reservar | **SÍ, obligatorio** — `validarStockParaOrden` recorre items, `summarizeProductStock` (`totalAvailable = stock − reservado`); si `totalAvailable < quantity` aborta antes de correlativo/reserva. Bloquea también si producto no existe o sin datos de stock. |
| Respeta `allowNegativeStock` | **NO** — `servicioReservaStock` no lee la preferencia. Siempre bloquea si disponible insuficiente, sin excepción. Usa `respectReservations: true` hardcodeado. |
| Anulación libera reserva | **SÍ** — `liberarReservaOrden` disminuye `stockReservadoPorAlmacen` con `Math.max(0, ...)`. Estado → `'Anulada'`. Stock real no se toca. |
| Genera Kardex | **NO** — ninguna operación de OV genera Kardex. Solo la emisión del comprobante lo hace. |

**Inconsistencia clave:** la OV reserva en UN solo almacén (principal), pero el comprobante descuenta vía FIFO multi-almacén. El almacén reservado por la OV y el(los) almacén(es) descontado(s) por el comprobante pueden no coincidir.

---

## 17. Comportamiento actual en Conversión OV a Comprobante

Archivos: `convertirOVaComprobante.ts`, `postEmisionOrdenVenta.ts`.

**Paso A — Navegación:** `construirCargaConversionDesdeOV()` abre el formulario precargado. Refresca stock visible con `getAvailableStockForUnit()` (stock real − reservado actual). La OV sigue en `'Reservada'`.

**Paso B — Post-emisión:** al emitir, `useComprobanteActions.tsx` detecta `conversionSourceType === 'orden_venta'` y llama `actualizarOrdenVentaPostEmision(ovId, info)`:
1. Libera `stockReservadoPorAlmacen` (`liberarReservasDeOV`).
2. Marca la OV como `'Atendida'`.
3. Agrega eventos al historial.
4. Dispara evento DOM `documentos_comerciales_changed`.

**Descuento real:** ocurre en el flujo normal de emisión del comprobante (FIFO multi-almacén), no en el servicio de OV.

**Riesgo de doble-descuento:** NO hay guard explícito. La protección es indirecta:
- La OV reservó (no descontó físico).
- Al emitir, `respectReservations: true` evita consumir el reservado, pero la liberación de la reserva (`liberarReservasDeOV`) ocurre en post-emisión.
- **Riesgo de timing:** si la reserva está en almacén X (resuelto por `resolvealmacenForSale`) pero el FIFO descuenta de almacén Y, el descuento del comprobante respeta el reservado de X (no lo consume) y descuenta del libre de Y. Luego post-emisión libera el reservado de X. Resultado: el stock reservado en X se libera sin haberse consumido, y el descuento real salió de Y. Coherente en el total, pero la distribución por almacén puede divergir de lo reservado.

---

## 18. Validación de prioridad de salida

**Estado: CORRECTO.**

`resolvealmacenesForSaleFIFO` (`stockGateway.ts` líneas 233-255) ordena por `prioridadSalida` ASC:

```ts
const pa = a.prioridadSalida !== undefined ? a.prioridadSalida : (a.esAlmacenPrincipal ? 1 : 999);
const pb = b.prioridadSalida !== undefined ? b.prioridadSalida : (b.esAlmacenPrincipal ? 1 : 999);
if (pa !== pb) return pa - pb;
return comparealmacenesStable(a, b); // codigoAlmacen → nombreAlmacen → id
```

- 1 = mayor prioridad.
- Fallback: `prioridadSalida` undefined + `esAlmacenPrincipal` → 1; sino → 999.
- Desempate estable por `codigoAlmacen`, luego `nombreAlmacen`, luego `id`.
- Filtra solo activos del establecimiento (`establecimientoId === EstablecimientoId && estaActivoAlmacen !== false`).

Consumido correctamente por Comprobantes (línea 504) y POS. **La migración de `esAlmacenPrincipal` a `prioridadSalida` está bien implementada con fallback retrocompatible.**

**Excepción:** la **Orden de Venta NO respeta `prioridadSalida`** (usa `resolvealmacenForSale` singular). Ver sección 16.

---

## 19. Validación de salida progresiva entre almacenes

**Estado: CORRECTO** (en Comprobantes/POS).

`allocateSaleAcrossalmacenes` (`stockGateway.ts` líneas 274-306) implementa el waterfall FIFO correctamente:

```ts
for (const almacen of almacenesOrdered) {
  if (remaining <= 0) break;
  const stock = toNumber(stockMap[almacen.id]);
  const reserved = toNumber(reservedMap[almacen.id]);
  const available = stock <= reserved ? 0 : stock - reserved;
  if (available <= 0) continue;
  const take = remaining <= available ? remaining : available;
  if (take > 0) {
    allocations.push({ almacenId: almacen.id, qtyUnidadMinima: take });
    remaining -= take;
  }
}
```

- Itera en orden, toma `min(remaining, available)` de cada almacén. **Progresivo, NO busca uno que cubra todo.**
- Si no alcanza, retorna asignación parcial (no inventa stock, no lanza error — el `remaining` se gestiona aguas arriba en `createComprobante`).

**Verificación contra la regla funcional (A1=10, A2=20, A3=50, venta 50):** descuenta 10+20+20 = 50. **Cumple exactamente.**

---

## 20. Validación de almacenes activos/inactivos

| Flujo | Respeta activo/inactivo |
|---|---|
| `resolvealmacenesForSaleFIFO` (ventas) | **SÍ** — filtra `estaActivoAlmacen !== false` |
| Ajustes de stock | **SÍ** — `almacenesActivos`, modal filtra |
| Transferencias | **SÍ** — `almacenesActivos`, modal filtra |
| Importación masiva | **PARCIAL** — plantilla solo activos; fila con almacén inactivo se omite silenciosamente |
| Nota de Ingreso | **NO** — solo valida existencia, no estado activo |
| Inactivación de almacén | **SÍ** — bloquea deshabilitar el único activo del establecimiento; rebalancea prioridades |

**Gap:** Nota de Ingreso permite ingresar a almacén inactivo. Importación omite silenciosamente sin avisar.

---

## 21. Validación de eliminación de almacenes con stock o movimientos

Archivo: `ConfiguracionAlmacenes.tsx`, `handleDelete` (líneas 375-388), `handleToggleStatus` (390-430).

**Validaciones antes de eliminar:** SOLO DOS:
1. Permiso `config.almacenes.gestionar`.
2. Flag `tieneMovimientosInventario === true` → bloquea con toast.

| Verificación | Estado |
|---|---|
| `stockPorAlmacen > 0` | **NO existe** — el modelo `Almacen` ni siquiera tiene ese campo; no se cruza con el catálogo |
| `stockReservadoPorAlmacen > 0` | **NO existe** |
| `tieneMovimientosInventario` | **SÍ** (única guarda real) |
| Auto-actualización del flag | **NO** — flag estático en localStorage; ningún reducer/efecto lo recalcula al registrar movimientos. Integración inexistente. |
| Validación cruzada con catálogo | **NO** — eliminación = `.filter(a => a.id !== id)` |
| Establecimiento sin almacenes tras eliminar | **NO protegido** (en inactivación sí: bloquea el único activo) |

**Consecuencia:** eliminar un almacén con stock real deja `stockPorAlmacen[almacenId]` huérfano en los productos, apuntando a un almacén inexistente. No hay limpieza en cascada. La única protección (`tieneMovimientosInventario`) puede estar en `false` aunque haya stock real, porque nunca se actualiza desde inventario.

`handleToggleStatus` (inactivación) sí rebalancea `prioridadSalida` de los almacenes activos restantes y reasigna `esAlmacenPrincipal = (prioridad === 1)`.

---

## 22. Validación de la preferencia Control de stock en ventas

**Persistencia:** localStorage key `facturaFacilConfig` (prefijo tenant: `<tenantId>:facturaFacilConfig`). Ruta JSON: `salesPreferences.allowNegativeStock` (boolean). Legacy: `sales.allowNegativeStock` (solo lectura). Archivo: `ContextoConfiguracion.tsx` (líneas 93, 838, 1020).

**Tipo:** `SalesPreferences = { allowNegativeStock: boolean; pricesIncludeTax: boolean }`.

**Valor por defecto — INCONSISTENCIA:**
- `ContextoConfiguracion.tsx` línea 798: `allowNegativeStock: true` (permisivo).
- `useConfiguracionSistema.ts` líneas 44/75: `false` (estricto).
- `useCart.tsx`: default `false` si no es booleano.

Esto significa que según el punto de entrada, el comportamiento por defecto difiere.

**Switch UI:** `SeccionPreferenciasVenta.tsx` — "Control de stock en ventas", **invertido**: toggle ON = modo estricto = `allowNegativeStock = false`. Persiste vía `SET_SALES_PREFERENCES`.

**Integración por flujo:**

| Flujo | Conectado |
|---|---|
| Comprobantes (factura/boleta) | **SÍ** — bloquea/permite según flag |
| POS | **SÍ** — valida en carrito y al confirmar |
| NC (devolución) | **NO** — hardcodeado `true` (semánticamente correcto) |
| Anulación de comprobante | **NO** — hardcodeado `true` |
| Orden de Venta | **NO** — no lee la preferencia; siempre bloquea si insuficiente |
| Nota de Venta / Cotización | **NO** — no validan stock |
| Ajustes de inventario | **NO** — fuerza `Math.max(0)` silenciosamente |
| Transferencias | **NO** — usa validación propia |

**Campo paralelo no integrado:** `Almacen.permiteStockNegativoAlmacen` (por almacén) existe pero **nunca se consulta** en ventas; solo se usa la preferencia global.

---

## 23. Casos donde la lógica está alineada

1. **Descuento progresivo FIFO multi-almacén** en Comprobantes/POS (`allocateSaleAcrossalmacenes`): cumple la regla funcional A exactamente.
2. **Ordenamiento por `prioridadSalida`** con fallback retrocompatible (`resolvealmacenesForSaleFIFO`).
3. **Cálculo de disponible por almacén** (`stock − reservado`, nunca negativo a nivel cálculo) sumado al total.
4. **Bloqueo/permiso según `allowNegativeStock`** en Comprobantes y POS (regla B cumplida en esos flujos).
5. **Kardex por almacén afectado** en ventas (un `MovimientoStock` por segmento).
6. **Transferencias completas**: validan origen, generan 2 movimientos vinculados, respetan activos, recalculan `cantidad` y `stockPorEstablecimiento`.
7. **Anulación de Nota de Ingreso** simétrica con guard anti-negativo.
8. **Reserva de OV** valida stock disponible obligatoriamente antes de reservar; libera correctamente al anular y al convertir.
9. **Inactivación de almacén** protege el único activo del establecimiento y rebalancea prioridades.
10. **POS y Comprobantes comparten el mismo motor** (`createComprobante`), garantizando consistencia entre ambos canales de venta.
11. **Importación masiva** con validación de formato robusta y trazabilidad por lote.

---

## 24. Casos donde la lógica está desalineada

1. **Tres fuentes de verdad sin sincronización**: `cantidad`, `stockPorEstablecimiento`, `stockPorAlmacen`. Solo transferencias y comprobantes recalculan `cantidad`.
2. **Ajustes, NI e Importación NO recalculan `cantidad` ni `stockPorEstablecimiento`** → desincronización crónica del stock total.
3. **OV reserva en un solo almacén** (no FIFO, no distribuida) mientras el comprobante descuenta multi-almacén → divergencia de distribución.
4. **`allowNegativeStock` ignorado** en OV, nota de venta, cotización, ajustes y transferencias.
5. **Valor por defecto de `allowNegativeStock` inconsistente** (`true` en una capa, `false` en otra).
6. **Eliminación de almacén sin validar stock/reservas reales**; flag de protección estático nunca auto-actualizado.
7. **Nota de Ingreso permite ingreso a almacén inactivo.**
8. **Transferencia valida origen sobre stock bruto**, no sobre disponible (`stock − reservado`) → puede mover stock reservado.
9. **`projectAvailableAfterMovement` muta `stock` físico** junto con `available` para ventas (incorrecto).
10. **NC y anulación hardcodean `allowNegativeStock: true`** sin documentación de la decisión.
11. **Ajuste fuerza stock a 0 silenciosamente** sin advertir al usuario.
12. **Sin guard explícito de doble-descuento** OV→comprobante.
13. **`pickFallbackStock` puede generar `almacenId` ficticio** (`EstablecimientoId || 'general'`) que no corresponde a ningún almacén real.
14. **`permiteStockNegativoAlmacen` y `controlEstrictoStock` por almacén declarados pero no integrados.**

---

## 25. Riesgos técnicos detectados

| # | Riesgo | Severidad | Ubicación |
|---|---|---|---|
| T1 | Desincronización de `cantidad`/`stockPorEstablecimiento` vs `stockPorAlmacen` | Alta | `registerAdjustment`, `notaIngreso.service.ts`, `PanelImportacionStock` |
| T2 | Fórmula de disponible duplicada (líneas 112 y 294) sin helper | Media | `stockGateway.ts` |
| T3 | `almacenId` ficticio del fallback legacy | Media | `pickFallbackStock`, `summarizeProductStock` |
| T4 | `projectAvailableAfterMovement` muta `stock` físico para ventas | Media | `stockGateway.ts` 378-383 |
| T5 | Datos huérfanos `stockPorAlmacen[almacenId]` tras eliminar almacén | Alta | `ConfiguracionAlmacenes.handleDelete` |
| T6 | Flag `tieneMovimientosInventario` nunca auto-actualizado | Alta | sin integración inventario↔config |
| T7 | Kardex sin saldo acumulado en tiempo real | Baja | `InventoryPage` / `MovementsTable` |
| T8 | Movimientos en localStorage sin reducer (solo evento DOM) | Media | `stock.repository.ts` |
| T9 | `usuario` guarda nombre, no ID (no trazable si cambia el nombre) | Baja | `MovimientoStock` |
| T10 | Default `allowNegativeStock` inconsistente entre capas | Media | `ContextoConfiguracion` vs `useConfiguracionSistema` |
| T11 | NI sin validación de duplicado por documento de proveedor | Media | `notaIngreso.service.ts` |

---

## 26. Riesgos funcionales detectados

| # | Riesgo | Impacto |
|---|---|---|
| F1 | Reportes/UI que lean `cantidad` (legacy) mostrarán stock total incorrecto tras ajustes/NI/importación | Stock total erróneo en reportes |
| F2 | OV reserva en almacén principal pero venta descuenta de otro almacén FIFO → reserva "fantasma" liberada sin consumo, distribución física inesperada | Sobre/sub-venta aparente por almacén |
| F3 | Ajuste manual deja stock negativo forzado a 0 sin avisar → pérdida de información (mermas no reflejadas) | Inventario inflado vs realidad |
| F4 | Eliminar almacén con stock → stock "desaparece" del total disponible, productos con referencias muertas | Pérdida de stock en sistema |
| F5 | NI a almacén inactivo → stock en almacén no operativo, invisible en ventas (FIFO filtra inactivos) | Stock "atrapado" |
| F6 | Transferencia mueve stock reservado → comprobante posterior no encuentra stock para cumplir la OV | Incumplimiento de reserva |
| F7 | `allowNegativeStock` default permisivo (`true`) en una capa → ventas en negativo sin que el tenant lo haya configurado | Venta de stock inexistente |
| F8 | Nota de venta/cotización no validan stock → expectativa comercial sin respaldo de inventario | Comprometer stock no disponible |

---

## 27. Fuente de verdad recomendada

**`stockPorAlmacen` debe ser la ÚNICA fuente de verdad de stock físico.** Recomendaciones:

1. **Deprecar `cantidad` y `stockPorEstablecimiento` como fuentes de escritura.** Convertirlos en valores derivados/computados:
   - `cantidad` (total) = `Σ stockPorAlmacen[almacenId]` para todos los almacenes del producto.
   - `stockPorEstablecimiento[estId]` = `Σ stockPorAlmacen[almacenId]` donde `almacen.establecimientoId === estId`.
2. **Centralizar el recálculo** en un único helper (ej. `recalcularTotalesStock(product)`) llamado por TODOS los flujos de escritura (`registerAdjustment`, NI, importación, transferencias, comprobantes) — no solo por transferencias y comprobantes.
3. **Extraer la fórmula de disponible** a un helper único (`computeAvailable(stock, reserved)`) reutilizado por `summarizeProductStock` y `allocateSaleAcrossalmacenes`.
4. **`stockReservadoPorAlmacen`** sigue siendo la fuente de verdad de reservas (separada del físico). Las transferencias deben validar contra disponible (`stock − reservado`), no contra bruto.
5. **Migración:** script de reconciliación que recalcule `cantidad`/`stockPorEstablecimiento` de todos los productos a partir de `stockPorAlmacen`, y que limpie/reporte `almacenId` huérfanos.

---

## 28. Recomendación de corrección por fases

### Fase 1 — Consistencia de stock total (prioridad alta, bajo riesgo)
- Crear helper `recalcularTotalesStock(product)` y llamarlo en `registerAdjustment`, `generarNIEnInventario`, `anularNIEnInventario`, `aplicarImportacion`.
- Extraer `computeAvailable()` y usarlo en ambos sitios de `stockGateway.ts`.
- Corregir `projectAvailableAfterMovement` para no mutar `stock` físico en proyecciones de venta.

### Fase 2 — Preferencia de control de stock unificada (prioridad alta)
- Unificar el valor por defecto de `allowNegativeStock` (recomendado: `false` / estricto) en todas las capas.
- Integrar la preferencia (o el flag por almacén `permiteStockNegativoAlmacen`) en ajustes de inventario.
- Documentar la decisión de hardcodear `true` en NC/anulación (es semánticamente correcto: una devolución siempre ingresa stock).

### Fase 3 — Integridad de almacenes (prioridad alta)
- En `handleDelete`: cruzar con catálogo y bloquear si algún producto tiene `stockPorAlmacen[id] > 0` o `stockReservadoPorAlmacen[id] > 0`.
- Implementar auto-actualización de `tieneMovimientosInventario` desde el repositorio de movimientos (o reemplazarlo por una consulta en vivo a movimientos).
- Bloquear eliminación del último almacén de un establecimiento.
- Limpieza en cascada o bloqueo de `stockPorAlmacen[almacenId]` huérfano.

### Fase 4 — Alineación de reservas OV con FIFO (prioridad media)
- Migrar `reservarStockOrden` para usar `resolvealmacenesForSaleFIFO` + distribución multi-almacén (espejo de `allocateSaleAcrossalmacenes`).
- Implementar guard explícito de doble-descuento OV→comprobante (flag `ovId` consumido).
- Validar transferencias contra disponible, no contra bruto.

### Fase 5 — Validaciones de borde (prioridad media-baja)
- NI: validar `estaActivoAlmacen` antes de ingresar; advertir o bloquear duplicados por documento de proveedor.
- Importación: reportar explícitamente filas omitidas por almacén inactivo.
- Ajuste: advertir al usuario cuando el resultado se fuerce a 0.

### Fase 6 — Kardex contable (prioridad baja)
- Añadir saldo acumulado en tiempo real en `MovementsTable`.
- Guardar `userId` además de `usuario` (nombre).

---

## 29. Archivos que probablemente requerirán cambios

- `apps/senciyo/src/shared/inventory/stockGateway.ts` — helper `computeAvailable`, corregir `projectAvailableAfterMovement`, revisar fallback ficticio.
- `apps/senciyo/src/pages/Private/features/gestion-inventario/services/inventory.service.ts` — `recalcularTotalesStock` en `registerAdjustment`; integrar preferencia de negativo.
- `apps/senciyo/src/pages/Private/features/gestion-inventario/services/notaIngreso.service.ts` — recálculo de totales, validación de almacén activo, dedup por documento.
- `apps/senciyo/src/pages/Private/features/gestion-inventario/components/PanelImportacionStock.tsx` — recálculo de totales, reporte de filas omitidas.
- `apps/senciyo/src/pages/Private/features/gestion-inventario/hooks/useInventory.ts` — advertencia al forzar 0, integración de preferencia.
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/paginas/ConfiguracionAlmacenes.tsx` — validación cruzada con catálogo en `handleDelete`, bloqueo último almacén.
- `apps/senciyo/src/pages/Private/features/documentos-comerciales/utils/servicioReservaStock.ts` — reserva FIFO multi-almacén.
- `apps/senciyo/src/shared/documentosComerciales/postEmisionOrdenVenta.ts` — guard de doble-descuento.
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion.tsx` — unificar default `allowNegativeStock`.
- `apps/senciyo/src/pages/Private/features/gestion-inventario/repositories/stock.repository.ts` — auto-actualización de `tieneMovimientosInventario` (o nueva consulta).

---

## 30. Archivos que NO deberían tocarse

- `apps/senciyo/src/shared/inventory/stockGateway.ts` → funciones `resolvealmacenesForSaleFIFO` y `allocateSaleAcrossalmacenes`: **están correctas y cumplen la regla funcional.** Solo refactor menor (extraer helper), sin cambiar la lógica de ordenamiento ni el waterfall.
- `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/hooks/useComprobanteActions.tsx` → bloque de descuento (492-627): **lógica de bloqueo/permiso correcta.** No alterar el flujo FIFO ni la evaluación de `allowNegativeStock`.
- `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/punto-venta/hooks/useCart.tsx` → validación de carrito: correcta.
- Módulo de transferencias (`registerTransfer` y handlers): funcional; solo ajustar validación origen a disponible (cambio quirúrgico, no reescritura).
- `inventory.types.ts` (modelo `MovimientoStock`): estable, no requiere cambios estructurales (salvo añadir `userId` opcional en Fase 6).
- Lógica de cotización y nota de venta: correctamente desacopladas del stock por diseño; no tocar.

---

## 31. Pruebas manuales recomendadas

1. **Descuento progresivo:** producto con A1=10, A2=20, A3=50 (prioridades 1,2,3). Vender 50 → verificar Kardex con 3 movimientos (10, 20, 20) y `stockPorAlmacen` final A1=0, A2=0, A3=30.
2. **Control activado:** `allowNegativeStock=false`, total disponible 30, vender 40 → debe bloquear con error "Stock insuficiente".
3. **Control desactivado:** `allowNegativeStock=true`, stock 0, vender 5 → debe permitir; verificar `stockPorAlmacen` negativo y Kardex con `cantidadNueva` negativo.
4. **Almacén inactivo:** A1 activo=0, A2 inactivo=50, A3 activo=20, vender 10 → debe descontar 10 de A3 (no tocar A2 inactivo). Verificar que A2 no aparece en FIFO.
5. **Eliminar almacén con stock:** crear almacén, asignar stock vía ajuste, intentar eliminar → (tras corrección) debe bloquear. Hoy: verificar que queda stock huérfano.
6. **OV con reserva:** A1=10, A2=20, crear OV de 25 → hoy reserva 25 en almacén principal (verificar `stockReservadoPorAlmacen`). Confirmar que `validarStockParaOrden` permite (disponible total 30 ≥ 25). Convertir a comprobante → verificar liberación de reserva y descuento físico FIFO.
7. **Sincronización de `cantidad`:** tras ajuste/NI/importación, comparar `cantidad` con `Σ stockPorAlmacen` → hoy divergen; tras corrección deben coincidir.
8. **Transferencia con reserva:** reservar stock en origen vía OV, luego transferir → verificar si mueve stock reservado (defecto actual).

---

## 32. Conclusión

El **núcleo del motor de salida de stock (FIFO multi-almacén por `prioridadSalida`) está correctamente implementado** y cumple la regla funcional esperada: el descuento es progresivo entre almacenes, respeta la prioridad de salida y filtra almacenes inactivos. Los flujos de Comprobantes y POS consumen este motor de forma consistente, respetan la preferencia `allowNegativeStock` y generan un Kardex por almacén afectado. Las transferencias y la anulación de Nota de Ingreso también son sólidas.

Los problemas no están en el motor FIFO sino en la **periferia de integridad y consistencia**:

- **Múltiples fuentes de verdad de stock total** (`cantidad`, `stockPorEstablecimiento`, `stockPorAlmacen`) sin sincronización uniforme — el riesgo técnico más extendido.
- **Integración parcial de la preferencia de control de stock** — solo Comprobantes y POS la respetan; OV, ajustes, NI y transferencias la ignoran, con un valor por defecto inconsistente entre capas.
- **Falta de validaciones de integridad referencial al eliminar almacenes** — posibilidad de stock huérfano.
- **Reserva de OV en un solo almacén** que no se alinea con el descuento FIFO multi-almacén del comprobante.

La hoja de ruta de 6 fases prioriza primero la consistencia del stock total (Fase 1) y la unificación de la preferencia de control (Fase 2), seguidas de la integridad de almacenes (Fase 3), porque son los riesgos con mayor impacto funcional (stock incorrecto, ventas en negativo no deseadas, pérdida de stock). El motor central (`stockGateway.ts`, `createComprobante`) debe preservarse y solo refactorizarse de forma quirúrgica.

---

## Tabla de cumplimiento por flujo

| Flujo | Muestra stock correcto | Valida stock correcto | Descuenta por prioridad | Distribuye entre almacenes | Genera Kardex correcto | Respeta switch control stock | Estado |
|---|---|---|---|---|---|---|---|
| Comprobantes (factura/boleta) | Sí | Sí | Sí | Sí | Sí | Sí | **ALINEADO** |
| POS | Sí | Sí (carrito: total; confirmación: FIFO) | Sí | Sí | Sí | Sí | **ALINEADO** |
| Nota de Ingreso | Parcial (`cantidad` desincr.) | N/A (ingreso) | N/A | Por línea | Sí | N/A | **PARCIAL** (no recalcula total; permite almacén inactivo) |
| Ajustes de stock | Parcial (`cantidad` desincr.) | Fuerza 0 silencioso | N/A | Por almacén seleccionado | Sí | No (ignora preferencia) | **PARCIAL** |
| Transferencias | Sí (recalcula total) | Sí (pero sobre bruto) | N/A | Origen→destino | Sí (2 movimientos) | No (validación propia) | **CASI ALINEADO** (valida bruto, no disponible) |
| Importación masiva | Parcial (`cantidad` desincr.) | Sí (formato) | N/A | Por almacén (columnas) | Sí | N/A | **PARCIAL** (no recalcula total; omite inactivos en silencio) |
| Cotización | N/A (no toca stock) | No (por diseño) | No | No | No | No | **POR DISEÑO (sin stock)** |
| Nota de Venta | N/A (no toca stock) | No (por diseño) | No | No | No | No | **POR DISEÑO (sin stock)** |
| Orden de Venta | Sí (valida disponible) | Sí (bloquea si insuf.) | **No** (un solo almacén) | **No** (sin distribución) | No (solo reserva) | **No** (ignora preferencia) | **DESALINEADO** (reserva no-FIFO) |
| Conversión OV→Comprobante | Sí (refresca disponible) | Sí (en emisión) | Sí (en emisión) | Sí (en emisión) | Sí (en emisión) | Sí (en emisión) | **ALINEADO con riesgo** (sin guard doble-descuento) |
| Eliminación de almacén | N/A | **No** (solo flag estático) | N/A | N/A | N/A | N/A | **DESALINEADO** (sin validar stock/reservas) |

---

## Casos de prueba evaluados por código

### Caso 1 — Descuento progresivo (A1=10, A2=20, A3=50; venta 50)

**Resultado esperado:** 10 de A1, 20 de A2, 20 de A3.

**Resultado por código:** `resolvealmacenesForSaleFIFO` ordena [A1,A2,A3] por `prioridadSalida`. `allocateSaleAcrossalmacenes`: remaining=50 → A1 available=10, take=10 (remaining=40) → A2 available=20, take=20 (remaining=20) → A3 available=50, take=20 (remaining=0, break). Allocations: `[{A1:10},{A2:20},{A3:20}]`.

**Veredicto: CUMPLE EXACTAMENTE.** Genera 3 movimientos de Kardex. No busca un único almacén que cubra todo.

---

### Caso 2 — Stock insuficiente con control activado (total=30, venta=40)

**`allowNegativeStock = false`.**

**Resultado por código:** `allocateSaleAcrossalmacenes` asigna los 30 disponibles, retorna `remaining = 10 > 0`. En `createComprobante` línea 564: `!allowNegativeStock && remaining > 0` → **`throw new Error('Stock insuficiente para ... Solicitado: 40. Disponible: 30.')`**. La emisión se aborta.

**Veredicto: CUMPLE.** Bloquea correctamente.

---

### Caso 3 — Stock insuficiente con control desactivado (total=0, venta=5)

**`allowNegativeStock = true`.**

**Resultado por código:** `allocateSaleAcrossalmacenes` retorna `[]` (available=0 en todos), `remaining = 5`. Línea 581: `allowNegativeStock && remaining > 0` → empuja `{ qtyUnidadMinima: 5, almacenId: almacenesOrdered[0].id }`. La facade aplica `cantidadNueva = stockActual − 5` (negativo, sin `Math.max(0)` porque `allowNegativeStock=true`). Producto queda con stock negativo; Kardex registra `cantidadNueva` negativo.

**Veredicto: CUMPLE.** Permite la venta en negativo.

---

### Caso 4 — Almacén inactivo (A1 activo=0, A2 inactivo=50, A3 activo=20; venta 10)

**Resultado por código:** `resolvealmacenesForSaleFIFO` filtra `estaActivoAlmacen !== false` → solo [A1, A3] (A2 excluido). `allocateSaleAcrossalmacenes`: A1 available=0 → continue; A3 available=20, take=10 (remaining=0). Allocations: `[{A3:10}]`.

**Veredicto: CUMPLE.** El stock del almacén inactivo (A2=50) NO se considera. Descuenta 10 de A3.

> Nota: el stock en almacenes inactivos queda "atrapado" e invisible en ventas (riesgo F5).

---

### Caso 5 — Eliminar almacén con stock

**Resultado por código:** `handleDelete` valida solo permiso y `tieneMovimientosInventario`. **NO** consulta `stockPorAlmacen` ni `stockReservadoPorAlmacen` de los productos. Si `tieneMovimientosInventario === false` (flag estático posiblemente desactualizado), ejecuta `.filter(a => a.id !== id)` y persiste. El stock en productos para ese `almacenId` queda **huérfano**.

**Veredicto: NO CUMPLE.** Permite eliminar un almacén con stock real sin advertencia ni cascada. Riesgo F4 confirmado.

---

### Caso 6 — OV con reserva distribuida (A1=10, A2=20; OV=25)

**Resultado por código:** `validarStockParaOrden` usa `summarizeProductStock` → `totalAvailable = 30 ≥ 25` → válido. `reservarStockOrden` usa `resolvealmacenForSale` (singular) → resuelve **UN solo almacén** (el principal, ej. A1). Incrementa `stockReservadoPorAlmacen[A1] += 25`. Resultado: A1 reservado=25 sobre stock=10 → disponible A1 = `10 ≤ 25 ? 0 : ...` = **0**, A2 disponible=20. Disponible total tras reserva = 20 (no 5).

**Veredicto: NO CUMPLE la distribución esperada.** La reserva NO se distribuye (10 en A1 + 15 en A2); se concentra toda (25) en el almacén principal, generando una reserva mayor al stock físico de ese almacén. Inconsistencia con el descuento FIFO multi-almacén del comprobante. Riesgo F2 confirmado.

---

*Auditoría generada por análisis paralelo de 13 módulos del código fuente. 14 agentes. 196 herramientas ejecutadas.*
