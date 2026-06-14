# Auditoría Técnica: Tab Transferencias — Inventario / Kardex

**Proyecto:** SenciYo / FacturaFacil  
**Branch:** TransferenciaAlmacenes  
**Fecha de auditoría:** 2026-06-14  
**Auditor:** Claude Sonnet 4.6 (análisis estático de código, sin modificaciones)  
**Lint/Build:** No ejecutado (solo auditoría, sin cambios de código)

---

## Resumen Ejecutivo

El tab Transferencias tiene una arquitectura sólida y bien estructurada. Los flujos principales (INTRA y INTER establecimiento) están implementados con estados, Kardex dual y anulación con reversión. Sin embargo, existen **tres brechas críticas** que comprometen la integridad de datos en escenarios multi-establecimiento y con stock reservado, y **varias brechas menores** de UX, exportación y permisos que deben resolverse antes de considerar el módulo cerrado.

**Veredicto general: Opción C — El tab Transferencias requiere corrección funcional antes de considerarse completo.**

---

## Archivos Auditados

| Archivo | Ruta |
|---|---|
| `transferencia.types.ts` | `gestion-inventario/models/` |
| `inventory.types.ts` | `gestion-inventario/models/` |
| `inventory.service.ts` | `gestion-inventario/services/` |
| `transferencia.repository.ts` | `gestion-inventario/repositories/` |
| `stock.repository.ts` | `gestion-inventario/repositories/` |
| `useInventory.ts` | `gestion-inventario/hooks/` |
| `TransferenciasPanel.tsx` | `gestion-inventario/components/transferencias/` |
| `TransferModal.tsx` | `gestion-inventario/components/modals/` |
| `DetalleTransferencia.tsx` | `gestion-inventario/components/transferencias/` |
| `ConfirmacionAnulacion.tsx` | `gestion-inventario/components/transferencias/` |
| `inventory.helpers.ts` | `gestion-inventario/utils/` |
| `InventoryPage.tsx` | `gestion-inventario/pages/` |
| `types.ts` (Product) | `catalogo-articulos/models/` |

---

## Arquitectura General del Módulo

### Modelo de Datos

```
Transferencia {
  id: TRF-YYYYMMDD-HHmmss
  estado: PENDIENTE | EN_TRANSITO | CONFIRMADA | RECIBIDA | CANCELADA | ANULADA
  tipoTransferencia: INTRA_ESTABLECIMIENTO | INTER_ESTABLECIMIENTO
  productoId, productoCodigo, productoNombre
  almacenOrigenId/Nombre, establecimientoOrigenId/Nombre
  almacenDestinoId/Nombre, establecimientoDestinoId/Nombre
  cantidad
  documentoReferencia?, observaciones?
  usuario
  movimientoSalidaId?, movimientoEntradaId?
  fechaDespacho?, fechaRecepcion?, fechaAnulacion?
}
```

### Flujos de Estados

```
INTRA_ESTABLECIMIENTO:
  Crear → CONFIRMADA (stock mueve inmediatamente, 2 movimientos Kardex)

INTER_ESTABLECIMIENTO:
  Crear → PENDIENTE (sin stock)
  PENDIENTE → Despachar → EN_TRANSITO (SALIDA en origen, stock baja)
  EN_TRANSITO → Recibir → RECIBIDA (ENTRADA en destino, stock sube)
  PENDIENTE → Cancelar → CANCELADA (sin impacto de stock)

Anulación:
  EN_TRANSITO → ANULADA (revierte solo SALIDA: ENTRADA en origen)
  CONFIRMADA/RECIBIDA → ANULADA (revierte ambos: SALIDA en destino + ENTRADA en origen)
```

### Persistencia

- `localStorage: facturafacil_transferencias` → entidades `Transferencia`
- `localStorage: facturafacil_stock_movements` → `MovimientoStock[]`
- Ambas con aislamiento por tenant vía `lsKey()`

---

## Respuestas a las 36 Preguntas Clave

### Preguntas 1–5: Completitud general

| # | Pregunta | Respuesta | Detalle |
|---|---|---|---|
| 1 | ¿Funcional completo? | **Parcialmente** | Flujos base completos; brechas críticas en disponibilidad y stock reservado |
| 2 | ¿Permite INTRA? | **Sí** | Inmediato, estado CONFIRMADA, 2 movimientos |
| 3 | ¿Permite INTER? | **Sí** | 3 fases: PENDIENTE→EN_TRANSITO→RECIBIDA |
| 4 | ¿Diferencia origen/destino? | **Sí** | Almacén origen limitado al establecimiento activo; destino abierto a todos |
| 5 | ¿Producto desde catálogo? | **Sí** | `allProducts` desde `useProductStore`; excluye SERVICIOS |

### Preguntas 6–10: Validaciones de producto y stock

| # | Pregunta | Respuesta | Detalle |
|---|---|---|---|
| 6 | ¿Valida producto disponible en origen? | **No** | `TransferModal` NO llama `isProductEnabledForEstablecimiento`. Ver BRECHA-01 |
| 7 | ¿Valida/habilita producto en destino? | **No** | No se verifica ni actualiza `establecimientoIds` del producto. Ver BRECHA-01 |
| 8 | ¿Valida stock suficiente en origen? | **Sí (en servicio)** | `InventoryService.registerTransfer` valida `real − reservado` |
| 9 | ¿Evita transferir más del disponible? | **Parcialmente** | Servicio sí. Modal muestra `stockPorAlmacen` (bruto) sin restar reservado. Ver BRECHA-02 |
| 10 | ¿Evita origen = destino? | **Sí** | `almacenOrigenId === almacenDestinoId` validado en modal y servicio |

### Preguntas 11–17: Stock y Kardex

| # | Pregunta | Respuesta | Detalle |
|---|---|---|---|
| 11 | ¿Actualiza stock origen? | **Sí** | `updateStock(product, almacenOrigenId, stockOrigen - cantidad)` |
| 12 | ¿Actualiza stock destino? | **Sí (según flujo)** | INTRA: inmediato. INTER: al recibir |
| 13 | ¿Actualiza stock total? | **Sí** | `cantidad = getTotalStock(updatedProduct)` |
| 14 | ¿Actualiza Stock Actual? | **Parcialmente** | `stockPorEstablecimiento` solo se sincroniza si ya existe en el producto. Ver BRECHA-03 |
| 15 | ¿Registra movimiento SALIDA? | **Sí** | `tipo: 'SALIDA', motivo: 'TRANSFERENCIA_ALMACEN'` en almacén origen |
| 16 | ¿Registra movimiento ENTRADA? | **Sí** | `tipo: 'ENTRADA', motivo: 'TRANSFERENCIA_ALMACEN'` en almacén destino |
| 17 | ¿Se ve en Kardex? | **Sí** | Movimientos visibles en tab Movimientos con `esTransferencia: true` |

### Preguntas 18–26: Detalle de Kardex y estados

| # | Pregunta | Respuesta |
|---|---|---|
| 18 | ¿Kardex distingue salida y entrada? | **Sí** — campos `tipo: SALIDA/ENTRADA`, `esTransferencia: true`, `transferenciaId` |
| 19 | ¿Referencia correcta? | **Sí** — se guarda en `documentoReferencia` y se muestra en lista y detalle |
| 20 | ¿Observaciones correctas? | **Sí** — guardadas y mostradas |
| 21 | ¿Estados claros? | **Parcialmente** — CONFIRMADA y RECIBIDA tienen el mismo badge verde |
| 22 | ¿Qué significa Confirmada? | Transferencia INTRA completada. Stock ya movido en ambos almacenes |
| 23 | ¿Qué significa Recibida? | Transferencia INTER completada. Destino confirmó recepción. Stock en destino |
| 24 | ¿Diferencia INTRA vs INTER? | **Sí** — badge de tipo: "Mismo estab." / "Entre estab." |
| 25 | ¿INTER requiere recepción? | **Sí** — flujo PENDIENTE→EN_TRANSITO→RECIBIDA |
| 26 | ¿INTRA confirma inmediato? | **Sí** — va directamente a CONFIRMADA |

### Preguntas 27–36: Riesgos y funcionalidades adicionales

| # | Pregunta | Respuesta |
|---|---|---|
| 27 | ¿Riesgo de duplicar movimientos? | **Bajo** — `setMovimientos` redundante pero harmless; listener recarga desde storage |
| 28 | ¿Riesgo de stock negativo? | **Bajo** — `updateStock` usa `Math.max(0, qty)` por defecto; anulación valida stock destino |
| 29 | ¿Riesgo de stock fantasma en destino? | **Alto** — ver BRECHA-01 |
| 30 | ¿Riesgo de producto vacío si no disponibilizado? | **Alto** — ver BRECHA-01 |
| 31 | ¿Se puede anular? | **Sí** — estados CONFIRMADA, RECIBIDA, EN_TRANSITO |
| 32 | ¿Anulación revierte stock y Kardex? | **Sí** — genera movimientos inversos vinculados |
| 33 | ¿Listado entendible? | **Parcialmente** — falta unidad, filtro de fecha, columna de establecimiento separada |
| 34 | ¿Detalle muestra trazabilidad? | **Sí** — muestra IDs de movimientos Kardex (salida/entrada) |
| 35 | ¿Excel existe y es consistente? | **No** — no hay exportación Excel en tab Transferencias. Ver BRECHA-04 |
| 36 | ¿Qué falta para considerarlo completo? | Ver sección Brechas y Recomendaciones |

---

## Hallazgos por Categoría

### BRECHAS CRÍTICAS

---

#### BRECHA-01 — Disponibilidad del producto en establecimiento destino no validada

**Archivo:** `TransferModal.tsx:85–90`, `TransferModal.tsx:235`  
**Severidad:** CRÍTICA  

**Problema:**  
El formulario muestra todos los almacenes activos como destino posible, sin verificar si el producto está disponible en el establecimiento de ese almacén. La función `isProductEnabledForEstablecimiento` existe en `catalogo-articulos/models/types.ts` pero no se utiliza en el TransferModal.

```tsx
// TransferModal.tsx línea 235 — destino: todos los activos filtrados por ≠ origen
{almacenes.filter(wh => wh.id !== almacenOrigenId).map((wh) => (
  <option key={wh.id} value={wh.id}>
    {wh.codigoAlmacen} - {wh.nombreAlmacen}
    {wh.nombreEstablecimientoDesnormalizado ...}
  </option>
))}
```

**Impacto:**  
Si el producto tiene `disponibleEnTodos: false` y `establecimientoIds: ['est-A']`, el usuario puede transferir 50 unidades al Almacén-X del Establecimiento-B. Resultado:
- `product.stockPorAlmacen['almacen-X'] = 50` ✅ (stock actualizado)
- `product.establecimientoIds` sigue siendo `['est-A']` ❌ (producto NO disponible en B)
- En Establecimiento-B, el producto no aparece en catálogo ni en inventario normal
- Stock físico existe pero el sistema lo ignora → **stock fantasma**

**Regla recomendada:**  
Opción **C** (advertencia + bloqueo suave): Si el producto no está habilitado en el establecimiento destino, mostrar alerta clara y preguntar si desea continuar (habilitando automáticamente el producto para ese establecimiento) o cancelar. La habilitación automática es la más coherente con el flujo de transferencia real de negocio: si se envía el producto físicamente, el establecimiento debe poder operarlo.

---

#### BRECHA-02 — Stock reservado no se resta en la validación del modal

**Archivo:** `TransferModal.tsx:72`  
**Severidad:** CRÍTICA  

**Problema:**  
El modal calcula el stock disponible para mostrar al usuario como:
```tsx
const stockDisponibleOrigen = selectedProduct?.stockPorAlmacen?.[almacenOrigenId] ?? 0;
// Línea 72 — usa stock REAL, no disponible (real − reservado)
```

El servicio (`inventory.service.ts:205-209`) valida correctamente con:
```ts
const reservedOrigen = this.getReservedStock(product, data.almacenOrigenId);
const disponible = Math.max(0, stockOrigen - reservedOrigen);
if (disponible < data.cantidad) throw new Error(...)
```

**Impacto:**  
- El modal muestra "Disponible: 100" cuando hay 30 reservados (disponible real = 70)
- El usuario ingresa 90, el modal lo acepta
- El servicio rechaza con error "Stock insuficiente"
- Experiencia de usuario degradada: se lanza un `alert()` de error después de que el usuario creyó que era posible

**Además:** el `alert()` nativo en `handleSubmit` (líneas 93-117) es inconsistente con el sistema de feedback (`useFeedback`) usado en el resto del módulo.

---

#### BRECHA-03 — `stockPorEstablecimiento` no se sincroniza para productos sin ese campo

**Archivo:** `useInventory.ts:34–48`  
**Severidad:** CRÍTICA (datos)  

**Problema:**  
```ts
function syncEstablecimientoStock(product: Product, affectedEstIds: string[], almacenes: Almacen[]): Product {
  if (!product.stockPorEstablecimiento) return product; // ← SILENTLY SKIPS
  ...
}
```

Si un producto nunca tuvo `stockPorEstablecimiento` inicializado (productos anteriores a la feature o importados sin ese campo), la sincronización se salta silenciosamente.

**Impacto:**  
- `product.stockPorEstablecimiento` no refleja el stock real por establecimiento
- Stock Actual puede mostrar 0 por establecimiento aunque haya unidades en almacenes
- Reportes de Stock Actual por establecimiento son incorrectos para esos productos
- Las transferencias se ejecutan correctamente a nivel de almacén, pero el nivel de establecimiento queda desincronizado

---

### BRECHAS MODERADAS

---

#### BRECHA-04 — Sin exportación Excel en tab Transferencias

**Archivo:** `TransferenciasPanel.tsx`, `InventoryPage.tsx:357`  
**Severidad:** MODERADA  

El botón "Exportar Excel" del `InventoryPage` está oculto cuando la vista activa es `'transferencias'`:
```tsx
{selectedView !== 'situacion' && selectedView !== 'transferencias' && ... && (
  <button onClick={handleExportToExcel}>Exportar Excel</button>
)}
```

El export de **movimientos** sí incluye campos de transferencia (Transferencia ID, Tipo, Almacén Origen, Destino), pero solo es accesible desde el tab Movimientos, no desde el tab Transferencias.

No existe un export específico que exporte las entidades `Transferencia` con sus estados, fechas de ciclo (despacho, recepción, anulación) y trazabilidad completa.

**Impacto:** Imposible exportar el listado de transferencias para auditoría, reporte o conciliación.

---

#### BRECHA-05 — Permiso de anulación no diferenciado

**Archivo:** `useInventory.ts:463` (comentario explícito del código)  
**Severidad:** MODERADA  

```ts
// Usa 'inventario.transferir' como guardia de permiso (no existe permiso específico de anulación aún).
```

Anular una transferencia (operación destructiva con impacto de stock) usa el mismo permiso que crear una. Un usuario con permisos de transferir puede anular transferencias de cualquier monto sin restricción adicional.

---

#### BRECHA-06 — generateTransferId puede colisionar en el mismo segundo

**Archivo:** `inventory.helpers.ts:150–156`  
**Severidad:** MODERADA  

```ts
export const generateTransferId = (): string => {
  const now = new Date();
  // Formato: TRF-YYYYMMDD-HHmmss
  // ← Resolución de 1 segundo. Dos transferencias en el mismo segundo → mismo ID
};
```

Si un usuario crea dos transferencias en menos de un segundo (doble click, por ejemplo), obtendrán el mismo ID. El repositorio usa `upsert` (busca por id), por lo que la segunda sobreescribiría la primera.

---

#### BRECHA-07 — CONFIRMADA y RECIBIDA tienen el mismo badge visual

**Archivo:** `TransferenciasPanel.tsx:27-28`  
**Severidad:** MODERADA (UX)  

```tsx
CONFIRMADA: { label: 'Confirmada', cls: 'bg-green-100 text-green-700 ...' },
RECIBIDA:   { label: 'Recibida',   cls: 'bg-green-100 text-green-700 ...' },
```

Ambos estados usan exactamente las mismas clases CSS. Para un usuario no es posible distinguir visualmente una transferencia INTRA completada de una INTER completada solo por el color del badge.

---

#### BRECHA-08 — `setMovimientos` redundante en handleCreateTransfer / handleDespacharTransfer

**Archivo:** `useInventory.ts:243, 355`  
**Severidad:** BAJA (técnica)  

```ts
// En handleCreateTransfer (INTRA):
setMovimientos(prev => [...result.movements, ...prev]); // ← Redundante

// En handleDespacharTransfer:
setMovimientos(prev => [result.movement, ...prev]); // ← Redundante
```

`StockRepository.addMovements/addMovement` ya dispara `STOCK_MOVEMENTS_CHANGED_EVENT` que actualiza `movimientos` vía el listener del useEffect. La llamada explícita provoca dos re-renders: uno con el prepend manual y otro con la recarga desde storage. El resultado final es correcto (no hay duplicación en pantalla porque el listener sobreescribe con los datos reales), pero es código innecesario que puede confundir en el futuro.

---

### BRECHAS MENORES (UX)

---

#### BRECHA-09 — Validaciones del modal usan `alert()` nativo

**Archivo:** `TransferModal.tsx:93–117`  
**Severidad:** MENOR  

Todas las validaciones en `handleSubmit` usan `alert()` nativo del browser, inconsistente con el sistema `useFeedback` usado en el resto del módulo.

---

#### BRECHA-10 — Falta filtro por rango de fechas en el listado

**Archivo:** `TransferenciasPanel.tsx`  
**Severidad:** MENOR (UX)  

El panel solo tiene filtros por Estado y Tipo. En un negocio activo con decenas de transferencias, no hay forma de ver "transferencias de esta semana" o "transferencias del mes pasado" desde el tab Transferencias. (El tab Movimientos sí tiene filtro por período).

---

#### BRECHA-11 — Unidad del producto no se muestra en el listado

**Archivo:** `TransferenciasPanel.tsx:238–240`  
**Severidad:** MENOR (UX)  

La columna "Cant." muestra solo el número sin la unidad (`{t.cantidad}`). Para productos con unidades no estándar (kg, litros, cajas), el listado no permite entender la magnitud de la transferencia sin abrir el detalle.

---

#### BRECHA-12 — Sin ordenamiento de columnas en la tabla

**Archivo:** `TransferenciasPanel.tsx`  
**Severidad:** MENOR (UX)  

Las columnas no son ordenables. No hay `onClick` en los headers de la tabla para ordenar por fecha, estado, cantidad u otro campo.

---

#### BRECHA-13 — No hay filtro de fecha en la carga inicial de transferencias

**Archivo:** `useInventory.ts:76–78`  
**Severidad:** MENOR (rendimiento)  

```ts
useEffect(() => {
  setTransferencias(TransferenciaRepository.getAll()); // Carga TODAS sin filtro
}, []);
```

Con muchas transferencias históricas, esto puede ser lento. Actualmente sin paginación del lado del repositorio.

---

#### BRECHA-14 — Detalle no permite imprimir ni exportar PDF

**Archivo:** `DetalleTransferencia.tsx`  
**Severidad:** MENOR  

El modal de detalle solo tiene botón "Cerrar". No hay opción de imprimir o exportar como PDF para adjuntar a guías de remisión u otros documentos.

---

#### BRECHA-15 — inferirTransferenciasDesdeMovimientos asigna CONFIRMADA a cualquier legacy

**Archivo:** `inventory.helpers.ts:227`  
**Severidad:** MENOR (datos legacy)  

```ts
estado: 'CONFIRMADA' as const,
```

Al inferir transferencias desde movimientos legacy (pre-tab), todas se marcan como CONFIRMADA independientemente de si ambos movimientos (SALIDA + ENTRADA) están presentes. Una transferencia INTER con solo SALIDA registrada (EN_TRANSITO) sería incorrectamente marcada como CONFIRMADA.

---

## Respuestas sobre Estados

### ¿Confirmada ya movió stock?
**Sí.** CONFIRMADA = transferencia INTRA completada. Ambos almacenes ya tienen el stock actualizado en el momento de creación.

### ¿Recibida ya movió stock?
**Sí.** RECIBIDA = transferencia INTER completada. El stock de destino se actualizó al momento del `handleRecibirTransfer`.

### ¿Hay doble movimiento si pasa de Confirmada a Recibida?
**No.** CONFIRMADA es estado exclusivo de INTRA. RECIBIDA es estado exclusivo del final del flujo INTER. No existe transición CONFIRMADA→RECIBIDA en el código.

### ¿Entre establecimientos primero sale y luego se recibe?
**Sí, correctamente.** PENDIENTE (sin stock) → EN_TRANSITO (SALIDA origen) → RECIBIDA (ENTRADA destino).

### ¿Mismo establecimiento se confirma directamente?
**Sí.** INTRA va directo a CONFIRMADA generando los dos movimientos Kardex en el mismo acto.

---

## Análisis de Stock

### Escenario INTRA (correcto)
```
Antes:   Almacén A: 100 | Almacén B: 20 | Total: 120
Transfer: 30
Después: Almacén A: 70  | Almacén B: 50 | Total: 120 ✅
```
Ambas actualizaciones se hacen en `registerTransfer`:
```ts
let updatedProduct = this.updateStock(product, data.almacenOrigenId, stockOrigen - data.cantidad);
updatedProduct = this.updateStock(updatedProduct, data.almacenDestinoId, stockDestino + data.cantidad);
```
El total global se mantiene.

### Escenario INTER (correcto en flujo completo)
```
Antes:   Est-A/Almacén-A: 100 | Est-B/Almacén-B: 0 | Total: 100
Despacho: Salida 30 → Est-A/Almacén-A: 70 | Total: 70
Recepción: Entrada 30 → Est-B/Almacén-B: 30 | Total: 100 ✅
```

### Escenario INTER EN_TRANSITO (temporal correcto)
```
En tránsito: Est-A/Almacén-A: 70 | Est-B/Almacén-B: 0 | Total: 70
```
Durante el tránsito, los 30 "existen" físicamente pero no están contabilizados en ningún almacén virtual. No hay un "almacén en tránsito". Esto es aceptable para el diseño actual (sin almacén de tránsito), pero el total global temporalmente no refleja la existencia física de las unidades.

### Escenario ANULACIÓN EN_TRANSITO (correcto)
```
Antes:   Est-A: 70 (30 en tránsito)
Anulación: ENTRADA en origen +30 → Est-A: 100 ✅
```
Solo revierte la SALIDA. Correcto porque ENTRADA en destino nunca ocurrió.

### Escenario ANULACIÓN CONFIRMADA/RECIBIDA (correcto + guardado)
```
Antes:   Origen: 70 | Destino: 30
Anulación: SALIDA destino -30 | ENTRADA origen +30
Después: Origen: 100 | Destino: 0 ✅
Valida: stockDestino >= cantidad antes de revertir ✅
```

---

## Consistencia con Otros Módulos

### Notas de Ingreso / Notas de Salida
Los movimientos de NI y NS usan el mismo `StockRepository` y el mismo campo `almacenId`. Las transferencias generan movimientos con `motivo: 'TRANSFERENCIA_ALMACEN'` y `esTransferencia: true`, lo que permite diferenciarlos en el tab Movimientos. La consistencia es **correcta**.

### Stock Actual (Situación)
Stock Actual lee `product.stockPorAlmacen` que sí se actualiza en todas las operaciones de transferencia. La consistencia es **correcta** a nivel de almacén. A nivel de establecimiento, depende de que `stockPorEstablecimiento` esté inicializado (ver BRECHA-03).

### Movimientos / Kardex
Los movimientos de transferencia están vinculados por `transferenciaId` y `movimientoRelacionadoId`. El tab Movimientos puede mostrar ambos movimientos. Sin embargo, no existe una vista Kardex formal tipo "tarjeta por producto" que agrupe entradas y salidas con saldo acumulado. Los movimientos en el tab Movimientos son la representación más cercana al Kardex.

### Catálogo de Productos
El formulario de transferencia lee `allProducts` del `useProductStore` y excluye `tipoExistencia === 'SERVICIOS'`. Correcto. Sin embargo, no filtra por `isProductEnabledForEstablecimiento` (BRECHA-01).

---

## Matriz de Cumplimiento

| Criterio | Estado actual | Cumple | Evidencia en código | Riesgo | Recomendación |
|---|---|---|---|---|---|
| Producto viene de catálogo | Implementado | ✅ | `useProductStore`, excluye SERVICIOS | Bajo | — |
| Disponibilidad por establecimiento (origen) | No implementado | ❌ | Sin `isProductEnabledForEstablecimiento` en TransferModal | **Alto** | Validar en formulario |
| Disponibilidad por establecimiento (destino) | No implementado | ❌ | Almacenes destino sin filtro de disponibilidad | **Alto** | Alertar/habilitar en destino |
| Origen válido (est. activo) | Implementado | ✅ | `almacenesOrigen` filtrado por `currentEstablecimientoId` | Bajo | — |
| Destino válido (≠ origen) | Implementado | ✅ | `almacenes.filter(wh => wh.id !== almacenOrigenId)` | Bajo | — |
| Stock suficiente en servicio | Implementado | ✅ | `registerTransfer` valida real − reservado | Bajo | — |
| Stock disponible en modal (correcto) | Incompleto | ❌ | Modal usa `stockPorAlmacen` bruto, no resta reservado | **Alto** | Restar `stockReservadoPorAlmacen` en modal |
| Transferencia INTRA | Implementado | ✅ | CONFIRMADA inmediata, 2 movimientos | Bajo | — |
| Transferencia INTER | Implementado | ✅ | 3 fases, 2 movimientos diferidos | Bajo | — |
| Actualiza stock almacén origen | Implementado | ✅ | `updateStock(product, origenId, ...)` | Bajo | — |
| Actualiza stock almacén destino | Implementado | ✅ | `updateStock(product, destinoId, ...)` | Bajo | — |
| Mantiene total global | Implementado | ✅ | `getTotalStock(updatedProduct)` | Bajo | — |
| Actualiza stockPorEstablecimiento | Parcial | ⚠️ | Solo si el campo ya existe | **Medio** | Inicializar si null |
| Genera movimiento SALIDA | Implementado | ✅ | `tipo: 'SALIDA', motivo: 'TRANSFERENCIA_ALMACEN'` | Bajo | — |
| Genera movimiento ENTRADA | Implementado | ✅ | `tipo: 'ENTRADA', motivo: 'TRANSFERENCIA_ALMACEN'` | Bajo | — |
| Movimientos vinculados | Implementado | ✅ | `transferenciaId` + `movimientoRelacionadoId` | Bajo | — |
| Kardex visible | Sí (movimientos) | ✅ | Tab Movimientos con filtro por tipo | Bajo | Considerar vista Kardex formal |
| Referencia | Implementado | ✅ | `documentoReferencia` en modal, lista y detalle | Bajo | — |
| Observaciones | Implementado | ✅ | `observaciones` en modal, lista y detalle | Bajo | — |
| Estados (6) | Implementado | ✅ | PENDIENTE/EN_TRANSITO/CONFIRMADA/RECIBIDA/CANCELADA/ANULADA | Bajo | Diferencias visuales CONFIRMADA vs RECIBIDA |
| Detalle con trazabilidad | Implementado | ✅ | Muestra IDs Kardex, fechas de ciclo, usuario | Bajo | Agregar link a movimiento |
| Anulación con reversión | Implementado | ✅ | Movimientos inversos, valida stock destino | Bajo | Permiso diferenciado |
| Excel exportación | **No existe** | ❌ | Botón oculto en vista transferencias | **Medio** | Implementar export de entidades Transferencia |
| Fechas locales | Implementado | ✅ | `new Date()` local, `formatBusinessDateTimeForTicket` | Bajo | — |
| UX listado | Parcial | ⚠️ | Sin filtro fecha, sin ordenamiento, sin unidad | Medio | Agregar filtros |
| UX formulario | Parcial | ⚠️ | `alert()` nativo, stock no resta reservado | Medio | Consistencia con useFeedback |
| Permiso anulación diferenciado | No existe | ⚠️ | Usa `inventario.transferir` para todo | Bajo | Crear permiso específico |
| ID único sin colisión | Vulnerable | ⚠️ | Resolución 1 segundo en generateTransferId | Bajo | Agregar ms o random suffix |

---

## Riesgos Identificados

### Riesgos Críticos

| # | Riesgo | Probabilidad | Impacto | Estado |
|---|---|---|---|---|
| R-01 | Stock fantasma en establecimiento destino sin disponibilidad | Alta (multi-estab.) | Alto | Sin mitigación |
| R-02 | Error de servicio tras validación visual incorrecta en modal | Alta (si hay reservas) | Medio | Sin mitigación |
| R-03 | stockPorEstablecimiento desincronizado para productos legacy | Media | Alto | Sin mitigación |

### Riesgos Moderados

| # | Riesgo | Probabilidad | Impacto | Estado |
|---|---|---|---|---|
| R-04 | Colisión de ID de transferencia en el mismo segundo | Baja | Medio | Sin mitigación |
| R-05 | Imposibilidad de auditar transferencias sin Excel | Alta | Medio | Sin mitigación |
| R-06 | Anulación no autorizada por roles | Baja | Medio | Sin mitigación |

### Riesgos Bajos / Ya Mitigados

| # | Riesgo | Estado |
|---|---|---|
| R-07 | Stock negativo en anulación | Mitigado — valida `stockDestino >= cantidad` |
| R-08 | Doble movimiento en INTRA | Mitigado — listener sobreescribe con storage real |
| R-09 | Transferencia mismo almacén | Mitigado — validado en modal y servicio |
| R-10 | Transferencia sin permiso | Mitigado — `tienePermiso` en todas las acciones |
| R-11 | Leakage cross-tenant | Mitigado — `lsKey()` en ambos repositorios |
| R-12 | Cancelar transferencia en tránsito | Mitigado — cancelación solo aplica a PENDIENTE |

---

## Recomendaciones por Prioridad

### Prioridad 1 — Correcciones críticas (antes de cerrar el módulo)

**P1-A: Corregir stockDisponibleOrigen en TransferModal**  
Archivo: `TransferModal.tsx:72`  
```tsx
// Actual (incorrecto):
const stockDisponibleOrigen = selectedProduct?.stockPorAlmacen?.[almacenOrigenId] ?? 0;

// Correcto:
const stockRealOrigen = selectedProduct?.stockPorAlmacen?.[almacenOrigenId] ?? 0;
const stockReservadoOrigen = selectedProduct?.stockReservadoPorAlmacen?.[almacenOrigenId] ?? 0;
const stockDisponibleOrigen = Math.max(0, stockRealOrigen - stockReservadoOrigen);
```
También: reemplazar `alert()` con `useFeedback` o algún sistema de validación visual inline.

**P1-B: Validar disponibilidad del producto en establecimiento destino**  
Archivo: `TransferModal.tsx`  
Al seleccionar almacén destino, verificar `isProductEnabledForEstablecimiento(selectedProduct, almacenDestino.establecimientoId)`. Si no está habilitado, mostrar advertencia con opción de continuar (habilitando automáticamente el producto en ese establecimiento) o bloquear.

**P1-C: Inicializar stockPorEstablecimiento en syncEstablecimientoStock**  
Archivo: `useInventory.ts:39`  
```ts
// Actual:
if (!product.stockPorEstablecimiento) return product;

// Correcto: inicializar si es null/undefined
const base = product.stockPorEstablecimiento ?? {};
```

### Prioridad 2 — Mejoras funcionales importantes

**P2-A: Implementar exportación Excel en tab Transferencias**  
Agregar botón "Exportar Excel" en `TransferenciasPanel.tsx` que exporte las entidades `Transferencia` con todos sus campos (código, fechas del ciclo, estados, producto, almacenes, establecimientos, usuario, referencia, observaciones).

**P2-B: Diferenciar badges CONFIRMADA vs RECIBIDA**  
Dar a RECIBIDA un tono diferente (ej. `bg-teal-100 text-teal-700`) para distinguirla visualmente de CONFIRMADA.

**P2-C: Agregar permiso específico `inventario.anular_transferencia`**  
Crear permiso granular para la acción de anulación, separado de `inventario.transferir`.

**P2-D: Corregir generateTransferId para evitar colisiones**  
Agregar milisegundos o un sufijo aleatorio:
```ts
return `TRF-${date}-${time}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
```

### Prioridad 3 — Mejoras de UX

- Agregar filtro de rango de fechas en `TransferenciasPanel`
- Mostrar unidad junto a cantidad en la columna "Cant."
- Agregar ordenamiento por columna (al menos Fecha, Estado, Cantidad)
- Agregar botón de impresión en `DetalleTransferencia`
- Eliminar las llamadas redundantes a `setMovimientos` en `handleCreateTransfer` y `handleDespacharTransfer`
- Revisar `inferirTransferenciasDesdeMovimientos` para asignar EN_TRANSITO cuando solo hay SALIDA sin ENTRADA

---

## Respuesta a Relación con Productos y Disponibilidad

El módulo Productos define disponibilidad por establecimiento mediante:
- `disponibleEnTodos: boolean`
- `establecimientoIds: string[]`

**Para Transferencias, la regla recomendada es:**

```
Origen:
  Mostrar solo productos habilitados en el establecimiento activo.
  → isProductEnabledForEstablecimiento(product, currentEstablecimientoId)
  → Actualmente NO se valida.

Destino:
  Si el producto ya está habilitado en el establecimiento destino → transferencia normal.
  Si NO está habilitado → Opción C: Advertir y ofrecer auto-habilitar.
  → Al confirmar la transferencia con auto-habilitación:
    product.establecimientoIds = [...product.establecimientoIds, estDestinoId]
    product.stockPorEstablecimiento[estDestinoId] = 0 (se sumará en sync)
```

Esta opción es la más coherente con la realidad operacional: si un producto se traslada físicamente a otro establecimiento, ese establecimiento debe poder operarlo.

---

## Conclusión y Recomendación Final

### Veredicto: **Opción C**

> El tab Transferencias **requiere corrección funcional** antes de considerarse completo.

**Justificación:**

El flujo técnico principal es sólido: estados bien definidos, lógica correcta de Kardex dual, anulación con reversión, permisos por establecimiento, persistencia segura con aislamiento multi-tenant. La arquitectura demuestra madurez y pensamiento correcto.

Sin embargo, existen tres brechas que no son opcionales:

1. **BRECHA-01** es un bug funcional real en escenarios multi-establecimiento: permite crear stock fantasma permanente. Para empresas con un solo establecimiento no impacta, pero el sistema está diseñado para multi-establecimiento.

2. **BRECHA-02** es un bug de UX que causa errores confusos cuando hay stock reservado por ventas pendientes.

3. **BRECHA-03** puede generar reportes de stock por establecimiento incorrectos para productos legacy.

Una vez resueltas estas tres brechas críticas (P1-A, P1-B, P1-C) y la exportación Excel (P2-A), el módulo puede considerarse **funcionalmente completo**. Las demás mejoras son deseables pero no bloquean el cierre del inventario.

---

## Checklist de Cierre del Módulo

- [ ] P1-A: stockDisponibleOrigen resta reservado en TransferModal
- [ ] P1-B: Validación disponibilidad producto en establecimiento destino
- [ ] P1-C: syncEstablecimientoStock inicializa si es null
- [ ] P2-A: Excel export de entidades Transferencia
- [ ] P2-B: Badge visual diferenciado CONFIRMADA vs RECIBIDA
- [ ] P2-C: Permiso `inventario.anular_transferencia`
- [ ] P2-D: generateTransferId sin colisión en el mismo segundo
- [ ] P3: Filtro de fechas, unidad en columna, ordenamiento

---

*Fin del informe. No se modificó ningún archivo del proyecto durante esta auditoría.*
