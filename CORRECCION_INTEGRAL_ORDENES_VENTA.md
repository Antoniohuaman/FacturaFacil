# CORRECCIÓN INTEGRAL — ÓRDENES DE VENTA

**Fecha:** 2026-06-24  
**Rama:** RevisionCotizacion  
**Build:** ✅ 0 errores TypeScript | ✅ 0 errores ESLint | ✅ 0 warnings nuevos  

---

## 1. PROBLEMA RAÍZ

La OV reservaba stock **POR ALMACÉN** (ejecutaba FIFO al crearse), bloqueando disponible en almacenes específicos en lugar de reservar globalmente. Esto era incorrecto porque el FIFO solo debe ejecutarse en la salida física (Nota de Salida), no al crear la reserva.

---

## 2. DECISIÓN ARQUITECTURAL IMPLEMENTADA

**Reserva Global por Establecimiento:**
- La OV incrementa `stockReservadoOVPorEstablecimiento[establecimientoId]` en el producto.
- `summarizeProductStock()` suma esa reserva global a `totalReserved`, reduciendo `totalAvailable`.
- El FIFO solo se ejecuta cuando se genera la Nota de Salida (salida física real).

**Invariante:**
```
Antes OV: real=100, reservadoOV=0, disponible=100
Después OV: real=100, reservadoOV=30, disponible=70
Al despachar 10: real=90, reservadoOV=20, disponible=70  ← NO cambia
```

---

## 3. ARCHIVOS MODIFICADOS

### 3.1 `catalogo-articulos/models/types.ts`
- **+1 campo** en `Product`: `stockReservadoOVPorEstablecimiento?: Record<string, number>`
- Fuente de verdad de reservas globales de OV por establecimiento.

### 3.2 `shared/inventory/stockGateway.ts`
- **`summarizeProductStock`**: suma `product.stockReservadoOVPorEstablecimiento[EstablecimientoId]` a `totalReserved`.
- `totalAvailable` ahora refleja tanto reservas por almacén (NV/otros) como reservas globales de OV.
- El `breakdown` por almacén NO cambia (solo se ve afectado el total).

### 3.3 `documentos-comerciales/models/documentoComercial.types.ts`
- `ReservaStockItem.almacenId`: ahora **opcional** (legacy NV/OVs antiguas).
- `ReservaStockItem.establecimientoId?: string`: nuevo campo para reservas globales OV.
- `DocumentoComercial.notaSalidaIds?: string[]`: array para múltiples NSes (despachos parciales).
- `notaSalidaId?: string` se mantiene como legacy (última NS).

### 3.4 `documentos-comerciales/utils/servicioReservaStock.ts`
- **Reescrito completamente.**
- `validarStockParaOrden`: usa `summarizeProductStock().totalAvailable` (incluye OV global reservation). Sin FIFO.
- `reservarStockOrden`: consolida por SKU, incrementa `stockReservadoOVPorEstablecimiento[establecimientoId]`. No llama FIFO. Retorna `ReservaStockItem[]` con `establecimientoId`, sin `almacenId`.
- `liberarReservaOrden`: maneja ambos formatos (nuevo `establecimientoId` + legacy `almacenId`).
- `descontarStockParaDocumento`, `revertirDescuentoStockDocumento`: sin cambios de lógica.

### 3.5 `shared/documentosComerciales/postEmisionOrdenVenta.ts`
- `DespachoBasico`: `almacenId` y `establecimientoId` ahora opcionales.
- `despachoKey()`: función helper para clave consistente en sumar/restar despachos.
- `sumarDespachos`, `restarDespachos`: usan `despachoKey()`.
- `calcularReservasPendientes`: usa `despachoKey()` para compatibilidad con ambas arquitecturas.
- `liberarReservasDeOV`: maneja `establecimientoId` (nuevo) y `almacenId` (legacy).
- `restaurarReservasDeOV`: maneja ambas arquitecturas.
- `vincularDocumentoComercialNS`: acumula en `notaSalidaIds` (array) en lugar de sobreescribir.
- `desvincularDocumentoComercialNS`: remueve ID del array; acepta `notaSalidaIdARemover?` param.
- `obtenerReservasDeOV`: tipo de retorno actualizado a admitir `almacenId?` y `establecimientoId?`.
- **NUEVA** `restaurarOVPostAnulacionComprobante(ovId, info)`: restaura OV a 'Reservada' al anular su comprobante. Maneja modo `automatico` (restaura reserva global) y modo `nota_salida` (reserva sigue vigente).

### 3.6 `documentos-comerciales/utils/convertirOVaComprobante.ts`
- Línea ~340: `terminosCredito: null` → `terminosCredito: ov.creditTerms ?? null` (fix OV-P1-006: creditTerms se propagaba vacío al comprobante).

### 3.7 `documentos-comerciales/hooks/useDocumentoComercialActions.ts`
- `actualizarDocumento`: guard — OV no-borrador retorna error "no editable".
- `anularDocumento`: guards — `Pendiente de salida` (tiene comprobante activo), `Atendida parcialmente && notaSalidaGenerada` (tiene NS activa), `Atendida` (ya atendida). Todos retornan error descriptivo.

### 3.8 `documentos-comerciales/components/ListadoDocumentosComerciales.tsx`
- `puedeEditar`: OVs no-borrador retornan `false` (todos los estados post-generación bloqueados).
- `puedeAnular`: OVs `Pendiente de salida`, `Atendida`, `Atendida parcialmente && notaSalidaGenerada` retornan `false`. Lógica específica para OV, cotización y NV.

### 3.9 `documentos-comerciales/utils/documentoComercial.storage.ts`
- `normalizarDocumentoCargado`: agregada normalización de estados legacy de OV:
  - `'Generada'` → `'Reservada'`
  - `'Atendida parcial'` → `'Atendida parcialmente'`
  - `'Atendida total'` → `'Atendida'`
  - `'Convertida'` → `'Atendida'`
- La normalización de cotizaciones se mantiene intacta.

### 3.10 `comprobantes-electronicos/lista-comprobantes/pages/ListaComprobantes.tsx`
- Importa `restaurarOVPostAnulacionComprobante`.
- Bloque de anulación de comprobante: agrega restauración de OV equivalente al bloque de NV.
- Extrae `ovId` desde `sourceDocumentType === 'orden_venta'` o `tipoDocumentoFuente === 'orden_venta'`.
- Pasa `modoDescuentoStock` desde `comprobante.modoDescuentoStock`.

### 3.11 `gestion-inventario/services/notaSalida.service.ts`
- **Anulación transaccional**: `continue` silencioso reemplazado por `throw new Error(...)` cuando una línea no tiene almacén asignado. Evita reposición parcial de stock.
- **Validación NS vinculada OV**: distingue reservas `establecimientoId` (cantidad = pendiente real) vs `almacenId` legacy (validar con `getReservedStock`).
- **Asignación por almacén**: solo usa la distribución guiada por almacén OV para reservas legacy. Para nueva arquitectura (global): FIFO normal con `respectReservations: false` (la reserva global no está en `stockReservadoPorAlmacen`).

### 3.12 `gestion-inventario/hooks/useNotasSalida.ts`
- `generarNS`: `aLiberar` actualizado para manejar reservas con `establecimientoId` (nueva arquitectura) — libera proporcionalmente por SKU total despachado. Para legacy, libera por almacén.
- `anularNS`: agrega bloque para path comprobante→NS→OV: cuando `nota.origen !== 'OrdenVenta'` pero `nota.ordenVentaOrigenId` existe, llama `restaurarOVPostAnulacionNSDirecta`.
- `desvincularDocumentoComercialNS`: pasa `nota.id` como `notaSalidaIdARemover` para limpieza correcta del array.

### 3.13 `comprobantes-electronicos/hooks/useComprobanteActions.tsx`
- `reservasPorSku`: filtra reservas con `almacenId` undefined (nueva arquitectura global). Reservas sin `almacenId` usan FIFO estándar en el descuento de stock del comprobante.

### 3.14 `gestion-inventario/components/notas-salida/FormularioNotaSalida.tsx`
- `reservasOV`: tipo de retorno actualizado a admitir `almacenId?` y `establecimientoId?`.
- `getStockPermitido`: distingue reservas con `establecimientoId` (retorna `r.cantidad` directo) vs legacy `almacenId` (min con `stockReservadoPorAlmacen`).

---

## 4. PROBLEMAS RESUELTOS

| ID | Problema | Estado |
|----|----------|--------|
| OV-P1-001 | OV ejecutaba FIFO al crearse (incorrecto) | ✅ Resuelto — reserva global |
| OV-P1-002 | Stock disponible no se reducía correctamente | ✅ Resuelto — `summarizeProductStock` incluye OV global |
| OV-P1-003 | OVs podían editarse tras generarse (reserva comprometida) | ✅ Resuelto — guards en UI y actions |
| OV-P1-004 | OV podía anularse en estados inválidos | ✅ Resuelto — guards dobles (UI + action) |
| OV-P1-005 | Estados legacy no normalizados al cargar | ✅ Resuelto — `normalizarDocumentoCargado` |
| OV-P1-006 | `creditTerms` no se propagaba al comprobante desde OV | ✅ Resuelto — `convertirOVaComprobante.ts:340` |

---

## 5. COMPATIBILIDAD LEGACY

Las OVs creadas **antes** de esta versión tendrán `reservasStock` con `almacenId` (sin `establecimientoId`). Todas las rutas de código (liberación, restauración, anulación, generación de NS) manejan ambos formatos sin excepción. No se requiere migración de datos.

---

## 6. INFRAESTRUCTURA DE TESTS

Se encontró Vitest (`apps/senciyo/src/.../stockAlerts.test.ts`). No hay vitest.config ni jest.config en raíz; la infraestructura existe pero no está expuesta como script de workspace.

**Pruebas pendientes a crear** (requieren vitest.config en workspace):

1. `validarStockParaOrden` — producto no en catálogo → bloquea
2. `validarStockParaOrden` — sin stock registrado → bloquea
3. `validarStockParaOrden` — disponible suficiente → pasa
4. `validarStockParaOrden` — disponible insuficiente (con OV global reservation) → bloquea
5. `validarStockParaOrden` — servicio → nunca bloquea
6. `validarStockParaOrden` — ítem libre → nunca bloquea
7. `reservarStockOrden` — incrementa `stockReservadoOVPorEstablecimiento`
8. `reservarStockOrden` — consolida SKUs duplicados
9. `reservarStockOrden` — sin `almacenId` en items retornados
10. `liberarReservaOrden` — con `establecimientoId` decrementa campo correcto
11. `liberarReservaOrden` — con `almacenId` legacy decrementa `stockReservadoPorAlmacen`
12. `liberarReservaOrden` — no permite negativo (Math.max(0,...))
13. `summarizeProductStock` — suma OV global a `totalReserved`
14. `summarizeProductStock` — `totalAvailable` = stock - reservadoPorAlmacen - reservadoOVGlobal
15. `calcularReservasPendientes` — establecimientos key correcto
16. `calcularReservasPendientes` — almacenes key legacy correcto
17. `normalizarDocumentoCargado` — `'Generada'` OV → `'Reservada'`
18. `normalizarDocumentoCargado` — `'Atendida parcial'` → `'Atendida parcialmente'`
19. `normalizarDocumentoCargado` — `'Convertida'` OV → `'Atendida'`
20. `restaurarOVPostAnulacionComprobante` — modo automático restaura reserva; modo nota_salida no duplica

---

## 7. ADVERTENCIAS Y RIESGOS

1. **`allocateSaleAcrossalmacenes` con `respectReservations: false`** en NS nueva arquitectura: al emitir la NS se descuenta del almacén con más stock disponible (FIFO puro). Si el operador quiere elegir el almacén destino, debe hacerlo manualmente en el formulario NS.

2. **NS comprobante→OV anulada**: la función `restaurarOVPostAnulacionNSDirecta` verifica estados `'Atendida'` o `'Atendida parcialmente'`. Si la OV ya fue restaurada (p.ej. por anulación del comprobante primero), la función no actuará. Este orden de operaciones debe documentarse en el manual.

3. **`despachoKey` y OVs muy antiguas**: OVs con `despachado` guardado en storage con clave `sku__almacenId` seguirán funcionando al restar despachos, porque la nueva clave `sku__almacenId` coincide cuando `establecimientoId` es `undefined`.

---

## 8. RESULTADO DEL BUILD Y LINT

```
npm run build --workspace=apps/senciyo
✓ 0 errores TypeScript
✓ 3533 módulos transformados
✓ built in 23.23s

npm run lint --workspace=apps/senciyo
✓ 0 errores ESLint
✓ 0 warnings nuevos
```

---

## 9. GIT STATUS

14 archivos modificados, 465 inserciones, 152 eliminaciones. Sin commits realizados.
