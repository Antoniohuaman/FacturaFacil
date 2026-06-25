# Auditoría Extrema Exclusiva — Órdenes de Venta

---

## 1. Información de la auditoría

| Campo | Valor |
|---|---|
| Fecha | 2026-06-24 |
| Rama | RevisionCotizacion |
| Commit HEAD | c982946e "Cotizacion" |
| Estado git | Limpio (2 archivos .ts/.tsx modificados de sesión anterior de COT, 4 MD sin rastrear) |
| Build | ✅ `✓ built in 15.57s` — 0 errores TypeScript |
| ESLint | ✅ Salida sin errores ni warnings |
| Alcance | `documentos-comerciales/`, `shared/documentosComerciales/postEmisionOrdenVenta.ts`, `gestion-inventario/services/notaSalida.service.ts`, `gestion-inventario/hooks/useNotasSalida.ts`, `gestion-inventario/repositories/notaSalida.repository.ts`, `comprobantes-electronicos/hooks/useComprobanteActions.tsx`, `comprobantes-electronicos/lista-comprobantes/pages/ListaComprobantes.tsx`, `shared/inventory/stockGateway` |
| Metodología | Lectura completa de archivos + trazado de cadenas de llamada hasta persistencia. Sin ejecución en runtime. |
| Limitación principal | No se puede verificar comportamiento real en browser. Todos los hallazgos marcados explícitamente: **Trazabilidad estática confirmada** / **Inferido** / **No verificable en runtime** |

---

## 2. Resumen ejecutivo

| Severidad | Cantidad | Descripción |
|---|---|---|
| P0 — Bloqueante crítico | 0 | — |
| P1 — Alto | 6 | Trazabilidad rota, inconsistencia de stock, creditTerms perdidos, reversión incompleta |
| P2 — Medio | 5 | Referencia scalar NS, estados legacy en filtros, fecha antigua en comprobante, anulación silenciosa de línea, TODO activo |
| P3 — Bajo | 3 | Normalización incompleta en carga, any anotado, código muerto legacy |

**Veredicto preliminar: 🔴** — Seis hallazgos P1 que afectan integridad de ciclo de vida, trazabilidad y stock en escenarios de uso normal.

---

## 3. Criterio de aprobación

- 🟢: 0 P0 y 0 P1 (o todos P1 documentados como conscientemente diferidos)
- 🟡: 0 P0 y ≤ 2 P1 menores sin impacto de datos
- 🔴: Cualquier P0, o ≥ 3 P1, o P1 que afecte integridad de stock o trazabilidad

---

## 4. Inventario técnico

| Archivo | Responsabilidad OV | Exclusivo OV | Modifica stock | Modifica storage |
|---|---|---|---|---|
| `documentos-comerciales/models/documentoComercial.types.ts` | Define `EstadoOrdenVenta`, `ReservaStockItem`, `DocumentoComercial` | No (compartido) | No | No |
| `documentos-comerciales/models/documentoComercial.constants.ts` | Define `ESTADOS_ORDEN_VENTA`, `STORAGE_KEYS` | No | No | No |
| `documentos-comerciales/hooks/useDocumentoComercialActions.ts` | `generarDocumento`, `generarDesdeBorrador`, `actualizarDocumento`, `anularDocumento` | No (compartido) | Sí (via servicioReservaStock) | Sí (via context→useEffect) |
| `documentos-comerciales/utils/servicioReservaStock.ts` | `validarStockParaOrden`, `reservarStockOrden`, `liberarReservaOrden` | No (NV también) | Sí (Zustand) | No |
| `documentos-comerciales/utils/convertirOVaComprobante.ts` | `validarOVParaConversion`, `construirCargaConversionDesdeOV` | Sí + parcial NV/COT | No | No |
| `documentos-comerciales/contexts/DocumentosComercialesContext.tsx` | Reducer + useEffect→localStorage | No | No | Sí (localStorage) |
| `documentos-comerciales/utils/documentoComercial.storage.ts` | `cargarDocumentosDesdeStorage`, `guardarDocumentosEnStorage` | No | No | Sí (localStorage) |
| `documentos-comerciales/components/ListadoDocumentosComerciales.tsx` | Guards UI: `puedeAnular`, `puedeEditar`, `puedeConvertir`, `puedeGenerarNS` | No | No | No |
| `shared/documentosComerciales/postEmisionOrdenVenta.ts` | Post-emisión OV, post-NS, restauración, liberación reservas | Sí (core OV) | Sí (Zustand) | Sí (localStorage directo) |
| `gestion-inventario/services/notaSalida.service.ts` | `generarNSEnInventario`, `anularNSEnInventario` | No | Sí (InventoryService) | No |
| `gestion-inventario/hooks/useNotasSalida.ts` | Orquestación NS: generar + anular + vinculación OV | No | Sí (via service + Zustand) | Sí (repository) |
| `gestion-inventario/repositories/notaSalida.repository.ts` | CRUD NSes en localStorage | No | No | Sí (localStorage) |
| `comprobantes-electronicos/hooks/useComprobanteActions.tsx` | `createComprobante` — post-emisión OV | No | Sí (InventoryService) | Sí (sessionStorage lectura) |
| `comprobantes-electronicos/lista-comprobantes/pages/ListaComprobantes.tsx` | Anulación comprobante + restauración COT/NV | No | No (solo restauración cotizacion/NV) | Sí (via postEmision*) |

---

## 5. Arquitectura y fuentes de verdad

| Dato | Fuente de verdad | Mecanismo de sincronización |
|---|---|---|
| Lista de OVs | `localStorage[documentos_comerciales_v1]` | useReducer → useEffect → `guardarDocumentosEnStorage` |
| Estado de OV | Campo `estado` en el mismo entry de localStorage | `actualizarEnContext` → dispatch → useEffect |
| Número de OV | `correlativo` calculado en `generarCorrelativoSeguro` | In-memory + persiste en documento |
| Reserva de stock | `stockReservadoPorAlmacen` en Zustand (`useProductStore`) | No persiste en localStorage de documentos; persiste en store de productos (separado) |
| Stock real | `stockPorAlmacen` en Zustand (`useProductStore`) | `InventoryService.registerAdjustment` + `recalcularTotalesStock` + `updateProduct` |
| Trazabilidad OV | `trazabilidad.documentoDestinoId/Tipo/Numero` en el documento | Escrito en `actualizarOrdenVentaPostEmision` y `postEmisionOrdenVenta.ts` |
| Cuotas de crédito | `creditTerms` en `DocumentoComercial` | Persiste en documento; NO se transfiere a comprobante vía `construirCargaConversionDesdeOV` |
| Despachos acumulados | `despachado[]` en documento OV | `sumarDespachos` en `atenderOrdenVentaPostNSDirecta` |
| Estado NS | `estado` en `NotaSalida` en `localStorage[notas_salida_*]` | `agregarOActualizarNS` → `guardarNotasSalida` |
| Vínculo OV→NS | `notaSalidaId` (scalar) en documento OV en localStorage | `vincularDocumentoComercialNS` |

**Observación arquitectural crítica**: El módulo opera en dos capas de persistencia desacopladas — Zustand (stock real/reservado) y localStorage (documentos). No existe transacción atómica entre ambas. Cualquier fallo entre escrituras deja estado inconsistente.

---

## 6. Build, TypeScript, ESLint y artefactos de deuda

| Comando | Resultado | Errores | Warnings |
|---|---|---|---|
| `npm run build --workspace=apps/senciyo` | ✅ `built in 15.57s` | 0 | 1 chunk > 3 MB (no relacionado a OV) |
| `npm run lint --workspace=apps/senciyo` | ✅ Sin salida | 0 | 0 |
| `tsc` (implícito en build) | ✅ | 0 | 0 |

**TODOs / FIXMEs en alcance OV:**

| Archivo | Línea | Contenido |
|---|---|---|
| `ListaComprobantes.tsx` | ~960 | `// TODO: Abrir panel de filtros` |
| `ListaComprobantes.tsx` | ~964 | `console.log('Atajo de exportar activado')` |
| `postEmisionOrdenVenta.ts` | múltiple | 6 usos de `any` con `// eslint-disable-next-line @typescript-eslint/no-explicit-any` — anotados, no silenciados |

---

## 7. Mapa funcional completo

### 7.1 Crear OV desde cero

```
Usuario llena FormularioDocumentoComercial (tipo=orden_venta)
→ generarDocumento(datos) [useDocumentoComercialActions.ts:149]
  → validarDatos() [verifica serie, cliente, items, precios]
  → validarStockParaOrden(items, almacenes, establecimientoId) [servicioReservaStock.ts:60]
     → Para cada bien de catálogo: busca por codigo, verifica stockDataRegistrado,
       calcula summarizeProductStock, compara totalAvailable vs qtyEnUnidadMinima
     → Si falla: return { exito: false, error }  ← NO hay side effects hasta aquí
  → generarCorrelativoSeguro(serie, state.documentos, configSeries)  ← correlativo asignado
  → reservarStockOrden(items, almacenes, establecimientoId) [servicioReservaStock.ts:124]
     → resolvealmacenesForSaleFIFO → allocateSaleAcrossalmacenes(respectReservations=true)
     → Para cada allocacion: getState().updateProduct(id, { stockReservadoPorAlmacen: ... })  ← ZUSTAND
     → Retorna ReservaStockItem[]
  → Construye DocumentoComercial { estado: 'Reservada', reservasStock, ... }
  → agregarDocumento(documento)  ← dispatch React
     → reducer: { documentos: [nuevo, ...resto] }
     → useEffect([state.documentos]) → guardarDocumentosEnStorage(documentos)  ← LOCALSTORAGE
→ return { exito: true, documento }
```

### 7.2 Crear OV desde borrador

Idéntico a 7.1 con diferencia: reemplaza el borrador existente vía `actualizarEnContext`. El borrador NO reserva stock (verificado en `guardarComoBorrador`: no llama `reservarStockOrden`).

### 7.3 Convertir OV → Comprobante

```
ListadoDocumentosComerciales: botón "Generar Comprobante" (puedeConvertir=true solo si Reservada)
→ validarOVParaConversion(ov) [convertirOVaComprobante.ts:217]
   → Verifica tipo=orden_venta, estado=Reservada, numero, cliente, items, reserva por item
→ construirCargaConversionDesdeOV(ov, { almacenes, establecimientoId }) [convertirOVaComprobante.ts:266]
   → refrescarStockItem() por cada ítem  ← stock en tiempo real, no congelado de OV
   → Construye InstantaneaDocumentoComercial
   → IMPORTANTE: terminosCredito: null  ← creditTerms de OV NO se transfiere
   → sessionStorage.setItem('conversionSourceId', ov.id)
   → sessionStorage.setItem('conversionSourceType', 'orden_venta')
→ navigate('/comprobantes/nuevo', { state: { fromConversion: true, conversionData } })
→ Usuario confirma en formulario de comprobante
→ createComprobante(data) [useComprobanteActions.tsx]
   → Crea comprobante, si desde OV: usa reservas OV como fuente exacta de allocations
   → registerAdjustment(SALIDA) por almacén  ← descuenta stock real en Zustand
   → agregarDocumento(nuevoComprobante)  ← React + localStorage comprobantes
   → actualizarOrdenVentaPostEmision(ovId, { modoDescuentoStock }) [postEmisionOrdenVenta.ts:352]
      → Lee documentos desde localStorage
      → Si modo != nota_salida: liberarReservasDeOV(ov.reservasStock)  ← Zustand
      → OV.estado = modo=nota_salida ? 'Pendiente de salida' : 'Atendida'
      → OV.trazabilidad.documentoDestinoId = numeroComprobante
      → Guarda en localStorage, dispara 'documentos_comerciales_changed'
```

### 7.4 Anular OV

```
puedeAnular(doc) [ListadoDocumentosComerciales.tsx:~175]
   → OV Atendida: false
   → Demás estados: !esBorrador && estado !== 'Anulada' && estado !== 'Convertida'
   → Permite: Reservada, Pendiente de salida, Atendida parcialmente, Vencida, Borrador
→ anularDocumento(id, motivo) [useDocumentoComercialActions.ts:523]
   → Si estado ∈ {Reservada, Pendiente de salida, Atendida parcialmente} y reservasStock.length:
      → calcularReservasPendientes(reservasStock, despachado ?? [])
      → liberarReservaOrden(aLiberar)  ← Zustand
   → DocumentoComercial.estado = 'Anulada'
   → Busca cotizacionVinculada (documentoDestinoId === id): restaura → Aceptada  ← solo cotización
   → actualizarEnContext(actualizado)  ← React + localStorage
```

### 7.5 Nota de Salida directa desde OV (modo Reservada)

```
puedeGenerarNS(doc) → true si OV en Reservada o Atendida parcialmente con pendiente
→ useNotasSalida.generarNS(nota) [useNotasSalida.ts:~110]
   → generarNSEnInventario(nota, ...) [notaSalida.service.ts:150]
      → Si origen=OrdenVenta: obtenerReservasDeOV(ordenVentaOrigenId) ← lee de localStorage OV
      → Valida: cantidad ≤ reserva pendiente OV (min(ovOriginal, reservadoAlmacen))
      → registerAdjustment(SALIDA) por almacén → stockPorAlmacen--
      → Retorna { notaActualizada, productosActualizados, movimientos }
   → agregarOActualizarNS(notaActualizada)  ← localStorage NSes
   → updateProduct(prod.id, prod) por cada productosActualizados  ← Zustand
   → liberarReservasDeOV(aLiberar)  ← libera solo lo despachado en esta NS
   → atenderOrdenVentaPostNSDirecta(ovId, { aLiberar }) [postEmisionOrdenVenta.ts:233]
      → Acumula despachado, calcula pendientes, OV.estado = Atendida|Atendida parcialmente
      → Guarda localStorage, dispara evento recarga
   → vincularDocumentoComercialNS(ovId, nsId, fecha)  ← notaSalidaId = nsId (SCALAR, sobreescribe)
```

### 7.6 Nota de Salida desde Comprobante vinculado a OV (modo Pendiente de salida)

```
→ generarNSEnInventario(nota donde comprobanteOrigenId + ordenVentaOrigenId)
   → Misma validación y descuento que 7.5
→ atenderOrdenVentaPostNS(ovId, { aLiberar }) [postEmisionOrdenVenta.ts:586]
   → Acepta OV en 'Pendiente de salida' o 'Atendida parcialmente'
   → Acumula despachado, calcula pendientes → Atendida|Atendida parcialmente
```

### 7.7 Anular Nota de Salida

```
→ anularNSEnInventario(nota, ...) [notaSalida.service.ts:413]
   → Solo si estado=Generada (no Entregada, no Anulada)
   → registerAdjustment(AJUSTE_POSITIVO) por linea y almacen (linea.almacenId ?? nota.almacenOrigenId)
→ Si origen=OrdenVenta y ordenVentaOrigenId:
   → restaurarOVPostAnulacionNSDirecta(ovId, { aRestaurar })
      → restaurarReservasDeOV(aRestaurar)  ← Zustand: stockReservadoPorAlmacen++
      → restarDespachos → nuevoEstado = Reservada|Atendida parcialmente|Atendida
      → notaSalidaGenerada = (nuevoEstado !== 'Reservada')
      → notaSalidaId = undefined ← desvincula
```

### 7.8 Anular Comprobante generado desde OV

```
ListaComprobantes.tsx: botón anular
→ Actualiza comprobante → estado: 'anulado'
→ Busca cotizacionId: llama restaurarCotizacionPostAnulacion(...)  ← restaura cotización
→ Busca nvId: llama restaurarNVPostAnulacionComprobante(...)  ← restaura NV
→ NO busca ni restaura OV  ← OV queda en 'Atendida' permanentemente
```

---

## 8. Auditoría del listado

- **Carga**: `cargarDocumentosDesdeStorage()` al montar + evento `'documentos_comerciales_changed'` para recarga cross-module. ✅
- **Filtros**: por `tipo`, `estado`, `fechaDesde`, `fechaHasta`, `moneda`, `busqueda`. ✅
- **Estados en filtros**: `ESTADOS_ORDEN_VENTA` (constants.ts:64-72) excluye los estados legacy `'Generada'`, `'Atendida parcial'`, `'Atendida total'`, `'Convertida'`. Documentos en esos estados existen en el tipo pero no aparecen en el picker de filtros. ⚠️ P2
- **Columnas default**: `['numero', 'cliente', 'documentoCliente', 'fecha', 'moneda', 'total', 'estado', 'acciones']`. ✅
- **Guards UI** (verificados en `ListadoDocumentosComerciales.tsx`):
  - `puedeConvertir`: solo `estado === 'Reservada' && !esBorrador` ✅
  - `puedeGenerarNS`: para OV: `'Reservada'` (true) o `'Atendida parcialmente'` con pendiente. ✅
  - `puedeEditar`: OV en `'Reservada'` → false; OV en `'Atendida parcialmente'` → true ⚠️ (P1-002)
  - `puedeAnular`: OV en `'Atendida'` → false; resto → catch-all true ⚠️ (P1-001)

---

## 9. Creación directa

- **Validaciones previas**: serie, cliente (obligatorio para OV), items (mínimo 1), precio>0 y cantidad>0. ✅
- **Validación stock**: `validarStockParaOrden` — verifica existencia en catálogo, stock registrado, disponible ≥ solicitado. Sin side effects hasta este punto. ✅
- **Correlativos**: `generarCorrelativoSeguro` calcula `max(baseCorrelativo, maxUsado) + 1`. Se asigna ANTES de la reserva. ✅
- **Reserva**: `reservarStockOrden` después del correlativo. Sin rollback si el paso siguiente falla. ⚠️ P1-005
- **Estado inicial**: siempre `'Reservada'`. ✅
- **Borrador OV**: NO reserva stock (`guardarComoBorrador` no llama `reservarStockOrden`). ✅

---

## 10. Creación desde Cotización

- `FormularioDocumentoComercial.tsx` recibe `prefillFrom` con datos de la COT.
- `formaPago` y `creditTerms` de COT se hidrátan vía `useCreditTermsConfigurator` (corrección implementada en sesión previa).
- Conversión COT→OV sigue el mismo path que 9 (Creación directa). ✅
- El estado de la COT pasa a `'Convertida'` vía `vincularDocumentoConCotizacion`. ✅

---

## 11. Crédito y cuotas

- OV permite `formaPago` crédito y `creditTerms` (campo presente en `DocumentoComercial.types.ts:143`).
- `creditTerms` se persiste en el documento al crear OV. ✅
- **Al convertir OV → Comprobante**: `construirCargaConversionDesdeOV` (línea 340): `terminosCredito: null` — HARDCODEADO. **Las cuotas de la OV NO se transfieren al Comprobante**. El usuario debe reconfigurar el crédito manualmente. ⚠️ **P1-003** — Trazabilidad estática confirmada.
- Contraste: `construirCargaConversionDesdeCotizacion` (línea 179): `terminosCredito: cotizacion.creditTerms ?? null` — SÍ transfiere.

---

## 12. Reserva de stock

- **Cuándo**: al generar la OV (no al guardar como borrador). ✅
- **Cómo**: `reservarStockOrden` → FIFO via `resolvealmacenesForSaleFIFO` + `allocateSaleAcrossalmacenes(respectReservations: true)` → incrementa `stockReservadoPorAlmacen` en Zustand.
- **Dónde persiste**: Zustand (`useProductStore`), **no en el localStorage de documentos** (solo el detalle `reservasStock[]` queda en el documento).
- **Fórmula disponible**: `totalAvailable = summarizeProductStock(...)` = `Σ(real − reservado) por almacén`. ✅
- **Liberación**: en `anularDocumento` (liberarReservaOrden), en `actualizarOrdenVentaPostEmision` si modo≠nota_salida (liberarReservasDeOV), en `generarNSEnInventario` vía NS.
- **FIFO multi-almacén**: ✅ — `resolvealmacenesForSaleFIFO` ordena por prioridad del establecimiento.
- **Escenario concurrencia (dos OVs simultáneas)**: `reservarStockOrden` llama `getState()` en cada iteración de allocación para obtener el producto actualizado. Evita overwrite dentro de un solo lote. Sin embargo, dos llamadas en paralelo (dos pestañas/usuarios) podrían leer el mismo estado antes de que la primera escriba → posible sobre-reserva. **No verificable en runtime**.
- **Stock negativo**: `liberarReservaOrden` usa `Math.max(0, reservadoActual - cantidad)` — nunca negativo. ✅

---

## 13. Atomicidad documento-stock

### Orden de operaciones en `generarDocumento` (OV):

```
1. validarDatos()              ← sin side effects
2. validarStockParaOrden()     ← sin side effects
3. generarCorrelativoSeguro()  ← in-memory, sin persistencia
4. reservarStockOrden()        ← ESCRIBE Zustand
5. construye DocumentoComercial
6. agregarDocumento()          ← dispatch React → useEffect → localStorage
```

**Punto de falla entre pasos 4 y 6**:
- Si el dispatch falla (error en reducer — prácticamente imposible con este reducer simple), Zustand tiene la reserva pero no hay documento en localStorage.
- Si `guardarDocumentosEnStorage` falla por cuota de localStorage: el contexto React tiene el documento (visible en UI), pero no persiste. Al recargar, el documento desaparece y la reserva en Zustand permanece hasta recarga/nuevo init.
- **No hay rollback de `reservarStockOrden` si `agregarDocumento` falla**. ⚠️ **P1-005** — Inferido (no hay try/catch en `generarDocumento` que llame `liberarReservaOrden` en caso de error).

### Operaciones en `actualizarOrdenVentaPostEmision` (post-emisión comprobante):

```
1. liberarReservasDeOV()    ← ESCRIBE Zustand (si modo≠nota_salida)
2. documentos[idx] = {...}  ← ESCRIBE localStorage
3. dispatchEvent(recarga)   ← React recarga
```

Si el localStorage falla en paso 2 después del paso 1: reserva liberada pero OV sigue en 'Reservada' en localStorage. Al recarga, la OV aparece convertible de nuevo aunque el stock ya no está reservado. ⚠️ P1-005 (mismo patrón).

---

## 14. Estados y transiciones de OV

| Estado | Cómo se llega | Editar | Anular | Generar comprobante | Generar NS | Próximo estado tras acción |
|---|---|---|---|---|---|---|
| `Borrador` | `guardarComoBorrador` | ✅ | N/A (eliminar) | No | No | `Reservada` (al generar) |
| `Reservada` | `generarDocumento` / `generarDesdeBorrador` | ❌ (`puedeEditar`=false) | ✅ → `Anulada` + libera reserva | ✅ → `Pendiente de salida` o `Atendida` | ✅ → `Atendida parcialmente` o `Atendida` | — |
| `Pendiente de salida` | `actualizarOrdenVentaPostEmision` (modo=nota_salida) | ✅ (guard no bloquea) ⚠️ | ✅ → `Anulada` + libera reserva ⚠️ P1-001 | ❌ | ✅ (desde comprobante) → `Atendida` | — |
| `Atendida parcialmente` | `atenderOrdenVentaPostNS*` | ✅ (guard no bloquea) ⚠️ P1-002 | ✅ → `Anulada` (libera pendiente) | ❌ (puedeConvertir=false) | ✅ | `Atendida parcialmente` o `Atendida` |
| `Atendida` | `actualizarOrdenVentaPostEmision` (modo≠nota_salida) o `atenderOrdenVentaPostNS*` total | ❌ | ❌ (`puedeAnular`=false) | ❌ | ❌ | Terminal |
| `Anulada` | `anularDocumento` | ❌ | ❌ | ❌ | ❌ | Terminal |
| `Vencida` | (no hay lógica de vencimiento automático de OV implementada) | ✅ | ✅ | ❌ | ❌ | — |

**Estados legacy** en tipo (`'Generada'`, `'Atendida parcial'`, `'Atendida total'`, `'Convertida'`): presentes en `EstadoOrdenVenta` pero excluidos de `ESTADOS_ORDEN_VENTA`. No aparecen en filtros. `puedeAnular`, `puedeEditar` etc. los tratan según la lógica catch-all.

---

## 15. Edición

- **OV en `Reservada`**: `puedeEditar` = false. El guard UI bloquea correctamente. ✅
- **OV en `Atendida parcialmente`**: `puedeEditar` = true. `actualizarDocumento` aplica spread `{...documentoExistente, ...datos}` sin ajustar `reservasStock` ni llamar `liberarReservaOrden/reservarStockOrden`. **Si el usuario cambia cantidades, la reserva en Zustand no refleja el cambio**. ⚠️ **P1-002** — Trazabilidad estática confirmada.
- **OV en `Pendiente de salida`**: mismo problema que `Atendida parcialmente`, además de SP-1 (comprobante activo). ⚠️
- **OV Borrador**: edición libre, sin impacto de stock. ✅
- **Campos bloqueados en edición**: no hay campo específico bloqueado por código en `actualizarDocumento` — es responsabilidad del formulario. No verificable sin runtime.

---

## 16. Conversión OV → Comprobante

Trazado completo en sección 7.3.

**Hallazgo crítico — `terminosCredito: null`** (línea 340 de `convertirOVaComprobante.ts`):
```typescript
camposComerciales: {
  ...
  terminosCredito: null,   // ← hardcodeado
  ...
}
```
Contraste con cotización (línea 179):
```typescript
terminosCredito: cotizacion.creditTerms ?? null,  // ← sí transfiere
```
Las cuotas de crédito configuradas en la OV NO se transfieren al formulario de comprobante. ⚠️ **P1-003**

**Fecha del comprobante**: `fechaEmision: ov.fechaEmision` (línea 295). Si la OV lleva días, el comprobante abrirá con la fecha de la OV, no la de hoy. El usuario puede editarla, pero es comportamiento implícito diferente al de NV (misma lógica). ⚠️ P2-004

---

## 17. Modos de control de stock en OV

| Modo | ¿Aplica a OV? | Qué hace al generar OV | Al generar Comprobante | Al anular OV |
|---|---|---|---|---|
| `automatico` (NV) | No — OV tiene su propio mecanismo de reserva | Reserva stock (`stockReservadoPorAlmacen`) | Descuenta stock real + libera reserva | Libera reserva |
| `nota_salida` | Aplica a OV vía comprobante | Reserva stock | Estado OV → `Pendiente de salida`, reserva NO liberada | Libera reserva (incluso en `Pendiente de salida`) |
| `sin_control` | No aplicable a OV | — | — | — |

**Nota**: OV siempre reserva stock al generarse, independientemente de `modoDescuentoStock`. El modo afecta qué ocurre POST-emisión del comprobante.

---

## 18. Anulación de Comprobante generado desde OV

Trazado completo en sección 7.8.

```
ListaComprobantes.tsx (líneas 884-935):
  → restaurarCotizacionPostAnulacion(cotizacionId, ...)  ← ✅ si origen=cotizacion
  → restaurarNVPostAnulacionComprobante(nvId, ...)       ← ✅ si origen=nota_venta
  → NINGUNA llamada para origen=orden_venta              ← ⚠️ BRECHAS P1-004
```

**Consecuencias confirmadas**:
1. OV queda en estado `'Atendida'` permanentemente — no hay transición de regreso.
2. `puedeAnular` para OV `'Atendida'` = false — no se puede limpiar vía anulación.
3. `validarOVParaConversion` requiere `'Reservada'` — no se puede reconvertir.
4. La OV queda atascada en `'Atendida'` con comprobante anulado como única evidencia de qué ocurrió.
5. El campo `trazabilidad.documentoDestinoId` sigue apuntando al comprobante anulado.

⚠️ **P1-004** — Trazabilidad estática confirmada.

---

## 19. Estado "Pendiente de salida"

**Qué es**: OV cuyo comprobante fue emitido en modo `nota_salida`, donde la mercadería aún no salió físicamente. La reserva de stock se mantiene hasta que se genere la Nota de Salida.

**Acciones disponibles** (según guards UI):
- `puedeGenerarNS`: false para `'Pendiente de salida'` directamente desde OV. La NS se genera desde el Comprobante.
- `puedeConvertir`: false (no está en `'Reservada'`).
- `puedeAnular`: **true** (catch-all — SP-1 CONFIRMADO).
- `puedeEditar`: **true** (catch-all).

**SP-1 — Anulación de OV en "Pendiente de salida" con Comprobante activo**:
- `puedeAnular` devuelve `true` para este estado. ← confirmado por código.
- `anularDocumento` acepta `doc.estado === 'Pendiente de salida'` y libera la reserva.
- No hay verificación de que exista un comprobante activo vinculado.
- Resultado: OV = `'Anulada'`, reserva liberada, comprobante sigue activo con `documentoOrigenId` apuntando a OV anulada. Trazabilidad inconsistente.
- ⚠️ **P1-001** — Trazabilidad estática confirmada.

---

## 20. Generación de Nota de Salida

Trazado completo en sección 7.5. Puntos críticos:

**Orden de operaciones en `useNotasSalida.generarNS`**:
```
1. generarNSEnInventario()  → valida + descuenta stock (Zustand + InventoryService)
2. agregarOActualizarNS()   → localStorage NSes
3. updateProduct() por cada productoActualizado  ← IMPORTANTE: ANTES de liberarReservas
4. liberarReservasDeOV(aLiberar)  ← Zustand
5. atenderOrdenVentaPostNSDirecta() o atenderOrdenVentaPostNS()  ← localStorage OV
6. vincularDocumentoComercialNS()  ← escribe notaSalidaId (scalar)
```

El comentario del código (línea 127 en useNotasSalida.ts) explica la razón del orden 3→4: `productosActualizados` es snapshot previo a `liberarReservasDeOV`; si se libera primero, `updateProduct` sobreescribiría con el valor anterior. ✅ Correcto.

**Validación pre-generación**: verifica reserva pendiente de OV antes de descontar. Si la NS pide más de lo reservado, lanza `Error`. ✅

---

## 21. Despachos parciales y totales

- `atenderOrdenVentaPostNSDirecta` / `atenderOrdenVentaPostNS`: acumulan en `despachado[]` vía `sumarDespachos` (clave: `sku__almacenId`). ✅
- `calcularReservasPendientes(reservasOriginales, nuevoDespachado)`: calcula pendiente por diferencia. ✅
- Estado OV resultante: `'Atendida parcialmente'` si `pendientes.length > 0`, `'Atendida'` si `pendientes.length === 0`. ✅
- **NSes sucesivas**: despachos se acumulan correctamente. `puedeGenerarNS` verifica pendiente antes de habilitar nueva NS. ✅

---

## 22. Anulación de Nota de Salida

Trazado completo en sección 7.7.

**Silencio en líneas sin almacén** (notaSalida.service.ts:438-440):
```typescript
const resolvedAlmId = linea.almacenId ?? nota.almacenOrigenId;
if (!resolvedAlmId) continue;  // ← salta silenciosamente
```
Si `linea.almacenId` y `nota.almacenOrigenId` son ambos undefined, la línea no se revierte. El historial de la NS no registra qué líneas se saltaron. ⚠️ **P2-003**

**Restauración de OV**: solo para `origen === 'OrdenVenta'` (NS directa). Para NS desde Comprobante (`origen !== 'OrdenVenta'`), no hay código de restauración de OV. El historial de OV no tiene registro de la NS desde comprobante que fue anulada. ⚠️ Inferido — P2 (la OV seguiría en `'Atendida'` porque ese flujo ya la marcó así, y la restauración del stock físico sí ocurre).

---

## 23. Anulación de Orden de Venta

**Matriz de anulación por estado**:

| Estado OV | `puedeAnular` UI | `anularDocumento` acepta | Libera reserva | Restaura cotización origen | Comprobante |
|---|---|---|---|---|---|
| `Borrador` | — (usa eliminarBorrador) | ❌ (`if (doc.esBorrador)`) | — | — | — |
| `Reservada` | ✅ | ✅ | ✅ (completa) | ✅ si existe COT vinculada | Sin comprobante |
| `Pendiente de salida` | ✅ ⚠️ | ✅ | ✅ (completa) | ✅ si existe COT vinculada | **Comprobante activo queda huérfano** |
| `Atendida parcialmente` | ✅ | ✅ | ✅ (solo pendiente, via calcularReservasPendientes) | ✅ | Sin comprobante (NS directa) |
| `Atendida` | ❌ | No ejecutado | — | — | — |
| `Anulada` | ❌ | No ejecutado | — | — | — |
| `Convertida` | ❌ (catch-all `!== 'Convertida'`) | No ejecutado | — | — | — |

**Cascada de cotización al anular**: `anularDocumento` (líneas 585-613) busca la cotización que apunta a esta OV y la restaura a `'Aceptada'`. ✅

---

## 24. Cálculos y totales

- `calcularTotalesItems` (useDocumentoComercialActions.ts:47): suma `price * quantity * (1 - descuentoItem/100)`, desglosa por tipo IGV, redondea `Math.round(v * 100) / 100`. ✅
- `calcularDesgloseTributos` (helpers.ts:136): precio neto con descuento → base imponible = neto/(1+rate), IGV = neto - base. ✅
- **NaN/Infinity**: `toNum` en `servicioReservaStock.ts` y `postEmisionOrdenVenta.ts` convierte a 0 cualquier valor no finito. ✅
- **Moneda**: almacenada en `Currency = CurrencyCode` — no se valida conversión de moneda mixta en items. Inferido: si items son en PEN y el documento en USD, `calcularTotalesItems` suma sin conversión. No verificable sin runtime.

---

## 25. Trazabilidad

**Campos disponibles en `TrazabilidadDocumentoComercial`** (types.ts:69-76):
```typescript
documentoOrigenId?: string;
documentoOrigenTipo?: TipoDocumentoComercial;
documentoOrigenNumero?: string;
documentoDestinoId?: string;
documentoDestinoTipo?: TipoDocumentoComercial | 'comprobante';
documentoDestinoNumero?: string;
```

**Un solo destino posible**: `documentoDestinoId` es campo scalar — una OV solo puede apuntar a UN destino. ✅ para el flujo normal (OV → Comprobante o OV → NS). Potencialmente incompleto si el diseño futuro contempla múltiples Notas de Salida con trazabilidad individual.

**`notaSalidaId` también es scalar**: Una OV con múltiples NSes (despacho parcial repetido) sobreescribe `notaSalidaId` con la última NS. No hay array de NSes en el modelo. ⚠️ **P2-002**

**Referencias potencialmente rotas**:
- OV anulada mientras Comprobante activo: `trazabilidad.documentoDestinoId` apunta a comprobante activo desde OV `'Anulada'`. ⚠️
- Comprobante anulado mientras OV en `'Atendida'`: `trazabilidad.documentoDestinoId` en OV apunta a comprobante anulado, sin limpieza. ⚠️ (P1-004)

---

## 26. Guía de Remisión

- `camposOpcionales.guiaRemision?: string` existe en el modelo. ✅
- El campo se transfiere a la Nota de Salida vía `construirCargaConversionDesdeOV` (línea 333: `guiaRemision: ov.camposOpcionales?.guiaRemision ?? null`). ✅
- No hay validación de formato de número de guía. Inferido: campo libre de texto.
- No hay módulo de Guía de Remisión separado en el alcance auditado. La integración es solo el campo textual.

---

## 27. Cobranzas y Caja

- La OV NO genera registros en módulo de cobranzas directamente.
- El comprobante generado desde OV sí puede integrar con cobranzas (fuera del alcance de este módulo).
- No existe campo de "monto cobrado" o "saldo pendiente" en `DocumentoComercial` para OV.

---

## 28. Borradores

- OV Borrador: guardado vía `guardarComoBorrador` → `agregarDocumento`. Estado `'Borrador'`, `esBorrador: true`.
- **No reserva stock**. ✅
- `reservasStock: undefined` — explícito.
- El borrador de OV se guarda en `localStorage[documentos_comerciales_v1]` igual que los borradores de COT/NV.
- Al generar desde borrador: `generarDesdeBorrador` filtra el borrador de la lista para calcular correlativos (`otrosDocs = state.documentos.filter(d => d.id !== id)`). ✅
- Borrador **no** lanza autosave en progreso (eso es la capa `useBorradorEnProgreso` para el formulario en edición, que sí existe pero no tiene stock side-effects). ✅

---

## 29. Persistencia y concurrencia

- **Dos pestañas**: ambas comparten localStorage. La segunda pestaña recibe el evento `'documentos_comerciales_changed'` y recarga. Sin embargo, la primera pestaña puede ya haber comprometido el correlativo localmente. En navegación simultánea, dos usuarios podrían obtener el mismo correlativo si ambos estaban en el formulario al mismo tiempo. ⚠️ Inferido — no verificable en runtime.
- **Stock Zustand**: Zustand es in-memory por pestaña. Dos pestañas del mismo navegador tienen Zustand independiente — reservas de una no son visibles en otra en tiempo real. ⚠️ Inferido.
- **localStorage atómico**: `localStorage.setItem` en JavaScript es síncrono dentro de una misma pestaña, no entre pestañas. Cross-pestaña hay risk de sobreescritura.

---

## 30. Empresa, establecimiento y almacenes

- `establecimientoId: activeEstablecimientoId ?? undefined` — OV se vincula al establecimiento activo al generarse. ✅
- `resolvealmacenForSale({ almacenes, EstablecimientoId })` filtra por establecimiento en validación.
- `resolvealmacenesForSaleFIFO` ordena por establecimiento. ✅
- Cambio de establecimiento post-generación: `establecimientoId` queda fijado en el documento. El stock reservado queda en los almacenes del establecimiento original. ✅ (correcto — no debería cambiar).

---

## 31. Permisos y seguridad

- **Guard de ruta**: No se auditó la configuración de rutas de React Router (fuera del alcance encontrado en lectura de archivos). No verificable en esta auditoría.
- **Guards UI**: En `ListadoDocumentosComerciales.tsx` — basados en estado del documento, no en roles de usuario. ⚠️ Inferido: si el sistema de permisos es solo por estado (no por rol), un usuario sin permiso puede ejecutar acciones si accede directamente a las funciones de acción.
- **Manipulación de URL**: el formulario recibe `prefillFrom` vía props/navigation state, no por query param. El `conversionSourceId` y `conversionSourceType` se leen de `sessionStorage`. Un usuario malicioso en la misma sesión podría setear `sessionStorage` directamente para ejecutar post-emisión con un ID falso. No verificable en impacto real.
- **Validación central**: `validarDatos` y `validarStockParaOrden` están en la acción (no solo UI). ✅

---

## 32. Experiencia de usuario

- **Estados visibles**: `EstadoBadge` renderiza color por estado. `obtenerColorEstado` en helpers.ts: `'Pendiente de salida'` → naranja, `'Reservada'` → amarillo, `'Atendida parcialmente'` → amarillo, `'Atendida'` → verde. ✅
- **Confirmaciones antes de anular**: hay modal de confirmación con campo de motivo. ✅
- **Doble clic**: no auditado sin runtime.
- **Pérdida de cambios**: el formulario tiene borrador-en-progreso (autosave). No se verificó si aplica a OV específicamente sin runtime.
- **TODO activo en ListaComprobantes**: atajos de teclado (f, e) no implementados pero no afectan OV directamente. ⚠️ P2-005

---

## 33. Matriz de pruebas

| # | Caso | Datos | Esperado | Evidencia estática | Estado |
|---|---|---|---|---|---|
| PT-01 | Crear OV con stock suficiente | Bien de catálogo, disponible=10, pedido=5 | `Reservada`, `reservasStock[{qty:5}]`, `stockReservadoPorAlmacen` += 5 | `generarDocumento` l.161-213 | NO VERIFICABLE runtime |
| PT-02 | Crear OV con stock insuficiente | disponible=3, pedido=5 | Falla con mensaje, sin correlativo, sin reserva | `validarStockParaOrden` l.104-113 | NO VERIFICABLE runtime |
| PT-03 | Crear OV con ítem de servicio | `tipoBienServicio='servicio'` | No valida stock, `Reservada` | `debeControlarStock` l.31 | NO VERIFICABLE runtime |
| PT-04 | Convertir OV → Comprobante (modo automático) | OV Reservada, cliente=RUC | Comprobante factura, OV=Atendida, reserva liberada | `actualizarOrdenVentaPostEmision` l.377-418 | NO VERIFICABLE runtime |
| PT-05 | Convertir OV → Comprobante (modo nota_salida) | OV Reservada, modo=nota_salida | Comprobante, OV=Pendiente de salida, reserva MANTENIDA | `actualizarOrdenVentaPostEmision` l.375-418 | NO VERIFICABLE runtime |
| PT-06 | creditTerms de OV al Comprobante | OV con 2 cuotas, crédito 30/60 días | Campo terminosCredito en comprobante con las cuotas | `construirCargaConversionDesdeOV` l.340 | **FALLA** — hardcodeado null |
| PT-07 | Generar NS directa desde OV Reservada (parcial) | OV con 10 unidades, NS con 4 | OV=Atendida parcialmente, despachado=[{qty:4}], reserva pendiente=6 | `atenderOrdenVentaPostNSDirecta` l.250-252 | NO VERIFICABLE runtime |
| PT-08 | Segunda NS desde OV Atendida parcialmente | Continúa PT-07, NS con 6 | OV=Atendida, despachado=[{qty:10}], reserva 0 | Acumulación en sumarDespachos | NO VERIFICABLE runtime |
| PT-09 | Anular NS + restaurar OV | NS=Generada, OV=Atendida parcialmente | OV=Reservada, stock repuesto, notaSalidaId=undefined | `restaurarOVPostAnulacionNSDirecta` l.289-344 | NO VERIFICABLE runtime |
| PT-10 | Anular Comprobante generado desde OV | Comprobante factura, OV=Atendida | OV debería → Reservada | `ListaComprobantes.tsx` l.884-935 | **FALLA** — no hay restauración OV |
| PT-11 | Anular OV en Pendiente de salida | Comprobante activo, OV=Pendiente de salida | Debería bloquear o advertir | `puedeAnular` catch-all | **FALLA** — permite sin warning |
| PT-12 | Editar OV Atendida parcialmente cambiando cantidad | qty original=10, editar→qty=12 | stockReservadoPorAlmacen debe aumentar | `actualizarDocumento` l.472-520 | **FALLA** — no ajusta reserva |
| PT-13 | Anular OV Reservada con COT origen | COT=Convertida, OV=Reservada | OV=Anulada, COT=Aceptada, reserva liberada | `anularDocumento` l.585-613 | PASA (estático) |
| PT-14 | notaSalidaId con múltiples NSes | OV con 2 NSes sucesivas | notaSalidaId = última NS | `vincularDocumentoComercialNS` sobreescribe | **INFORMATIVO** — por diseño pero sin historial |
| PT-15 | Stock en comprobante desde OV (tiempo real) | OV con reserva, comprobante nuevo | Stock visible = disponible actual (real−reservado), no el de OV | `refrescarStockItem` l.50-76 | PASA (estático) |

---

## 34. Flujos no verificables en esta auditoría

Los siguientes escenarios requieren ejecución en browser y no pueden verificarse con análisis estático:

1. Timing de React batching entre `setExternalCreditTerms` y el efecto del configurador (COT→OV).
2. Comportamiento con dos pestañas simultáneas (correlativos duplicados, Zustand independiente).
3. Overflow de localStorage quota y comportamiento de recuperación.
4. Doble clic en botón "Generar" (posible doble reserva si no hay guard de `procesando`).
5. Vencimiento automático de OV (no hay lógica de vencimiento automático para OV como la hay para COT).
6. Rendimiento del listado con >1000 documentos en localStorage.
7. Comportamiento con almacén sin prioridad configurada.
8. Sesión expirada durante la conversión (sessionStorage queda sucio).

---

## 35. Confirmación o descarte de sospechas previas

| ID | Sospecha | Resultado | Evidencia | Severidad |
|---|---|---|---|---|
| SP-1 | OV "Pendiente de salida" puede anularse mientras Comprobante sigue vigente | **CONFIRMADO** | `puedeAnular` catch-all, `anularDocumento` acepta ese estado, sin guard de comprobante | P1-001 |
| SP-2 | Editar OV "Atendida parcialmente" no ajusta reserva de stock | **CONFIRMADO** | `actualizarDocumento` (l.472-520) no llama `liberarReservaOrden`/`reservarStockOrden` | P1-002 |
| SP-3 | OV→Comprobante no preserva creditTerms/cuotas | **CONFIRMADO** | `construirCargaConversionDesdeOV` l.340: `terminosCredito: null` hardcodeado | P1-003 |
| SP-4 | Anular Comprobante desde OV no restaura OV | **CONFIRMADO** | `ListaComprobantes.tsx` l.884-935: restaura COT y NV, ninguna llamada para OV | P1-004 |
| SP-5 | Estados legacy aparecen en filtros | **CONFIRMADO parcial** | Legacy estados en tipo pero no en `ESTADOS_ORDEN_VENTA` — no aparecen en filtros | P2-001 |
| SP-6 | Validaciones solo en UI | **DESCARTADO** | `validarDatos` y `validarStockParaOrden` están en `useDocumentoComercialActions` (acción central) | — |
| SP-7 | Trazabilidad no soporta múltiples NSes | **CONFIRMADO** | `notaSalidaId?: string` — scalar. `vincularDocumentoComercialNS` sobreescribe | P2-002 |
| SP-8 | Documento y stock no son atómicos | **CONFIRMADO** | `reservarStockOrden` (Zustand) antes de `agregarDocumento` (React+localStorage), sin rollback | P1-005 |

---

## 36. Hallazgos consolidados

### OV-P1-001 — Anulación de OV en "Pendiente de salida" con Comprobante activo

**Severidad**: P1 — Alto  
**Flujo**: OV generada en modo `nota_salida` → comprobante emitido → OV = `Pendiente de salida` → usuario anula OV  
**Evidencia**:
- `puedeAnular` (ListadoDocumentosComerciales.tsx:~175): para OV `'Pendiente de salida'`, la condición `doc.tipo === 'orden_venta' && doc.estado === 'Atendida'` es false → cae al catch-all que devuelve `true`.
- `anularDocumento` (useDocumentoComercialActions.ts:540): acepta estados `'Reservada' || 'Pendiente de salida' || 'Atendida parcialmente'` → libera reserva.
- No hay verificación de `trazabilidad.documentoDestinoId` ni consulta al estado del comprobante.
**Impacto**: OV = `'Anulada'`, reserva liberada, comprobante activo en estado `'Aceptado'` con `documentoOrigenId` → OV anulada. Trazabilidad inconsistente. Si luego se genera NS desde ese comprobante, `obtenerReservasDeOV(ovId)` retorna `[]` (OV anulada no tiene reservas pendientes), potencialmente permitiendo NS sin stock reservado que la respalde.  
**Método de confirmación**: Trazabilidad estática completa.

---

### OV-P1-002 — Edición de OV "Atendida parcialmente" no ajusta reserva de stock

**Severidad**: P1 — Alto  
**Flujo**: OV `Atendida parcialmente` → usuario edita cantidades en UI → `actualizarDocumento`  
**Evidencia**:
- `puedeEditar` (ListadoDocumentosComerciales.tsx:~165): `'Atendida parcialmente'` incluido como editable.
- `actualizarDocumento` (useDocumentoComercialActions.ts:472-520): spread `{...documentoExistente, ...datos}`. No llama `liberarReservaOrden` ni `reservarStockOrden`. `reservasStock` queda con los valores originales aunque las cantidades cambien.  
**Impacto**: Si el usuario aumenta cantidad en edición, `stockReservadoPorAlmacen` no refleja el aumento. La siguiente NS puede intentar despachar más de lo que está reservado. Si el usuario disminuye, la reserva queda inflada.  
**Método de confirmación**: Trazabilidad estática completa.

---

### OV-P1-003 — creditTerms de OV no se transfiere al Comprobante

**Severidad**: P1 — Alto  
**Flujo**: OV con crédito y cuotas configuradas → Convertir a Comprobante  
**Evidencia**:
- `construirCargaConversionDesdeOV` (convertirOVaComprobante.ts:340): `terminosCredito: null` — literal hardcodeado.
- Contraste: `construirCargaConversionDesdeCotizacion` (misma clase, línea 179): `terminosCredito: cotizacion.creditTerms ?? null` — sí transfiere.  
**Impacto**: El usuario que configuró cuotas de crédito en la OV debe reconfigurarlas manualmente al emitir el comprobante. Inconsistencia entre el trato de COT y OV en el mismo módulo.  
**Método de confirmación**: Trazabilidad estática completa.

---

### OV-P1-004 — No existe restauración de OV al anular su Comprobante

**Severidad**: P1 — Alto  
**Flujo**: OV `Reservada` → Comprobante emitido → OV = `Atendida` → Comprobante anulado → OV queda en `Atendida`  
**Evidencia**:
- `ListaComprobantes.tsx` (líneas 884-935): restaura `cotizacionId` → `restaurarCotizacionPostAnulacion(...)`. Restaura `nvId` → `restaurarNVPostAnulacionComprobante(...)`. No tiene bloque equivalente para `orden_venta`.
- `postEmisionOrdenVenta.ts`: tiene `restaurarCotizacionPostAnulacion` y `restaurarNVPostAnulacionComprobante` pero NO `restaurarOVPostAnulacionComprobante`.  
**Impacto**: OV queda en `'Atendida'` permanentemente. No puede ser reconvertida (`validarOVParaConversion` requiere `'Reservada'`). No puede ser anulada (`puedeAnular` para `'Atendida'` = false). La OV queda en estado terminal incorrecto tras anulación del comprobante.  
**Método de confirmación**: Trazabilidad estática completa.

---

### OV-P1-005 — Atomicidad rota entre reserva de stock (Zustand) y documento (localStorage)

**Severidad**: P1 — Alto  
**Flujo**: `generarDocumento` / `generarDesdeBorrador` → OV  
**Evidencia**:
- `useDocumentoComercialActions.ts` (l.207-276): orden: `reservarStockOrden()` → construye documento → `agregarDocumento()`.
- `guardarDocumentosEnStorage` (documentoComercial.storage.ts:39-46): `try { localStorage.setItem(...) } catch { /* ignorar cuota */ }`. El catch es silencioso.
- Si localStorage está lleno: `reservarStockOrden` ya ejecutó (`stockReservadoPorAlmacen++`), pero el documento no se persiste. Al refrescar la página, el stock vuelve al estado del store (que sí persiste), pero el documento OV no existe → stock reservado sin documento rastreable.  
**Impacto**: Stock reservado "fantasma" que permanece hasta que el store de productos sea reiniciado. Reduce disponibilidad sin OV visible.  
**Método de confirmación**: Inferido (lógica de manejo de errores confirmada estáticamente; el escenario concreto requiere runtime).

---

### OV-P1-006 — Edición de OV "Atendida parcialmente" sin protección de reservasStock

**Severidad**: P1 — Alto (cubre SP-2, complemento de P1-002)  
**Flujo**: OV `Atendida parcialmente` → editar → cambiar items → guardar  
**Evidencia**:
- `actualizarDocumento` no tiene guard específico para OV: aplica spread genérico.
- Si `datos.items` incluye el array modificado y se ejecuta `{...documentoExistente, ...datos}`, el campo `reservasStock` queda inalterado (no está en `DatosFormularioDocumentoComercial`).
- El campo `despachado` también queda inalterado → `calcularReservasPendientes` usará reservas originales vs despachos originales, ignorando las nuevas cantidades.  
**Nota**: Este hallazgo consolida SP-2 + la brecha del formulario.  
**Método de confirmación**: Trazabilidad estática completa.

---

### OV-P2-001 — Estados legacy de OV excluidos de filtros del listado

**Severidad**: P2 — Medio  
**Evidencia**: `ESTADOS_ORDEN_VENTA` (constants.ts:64-72) omite: `'Generada'`, `'Atendida parcial'`, `'Atendida total'`, `'Convertida'`. Estos estados existen en `EstadoOrdenVenta` (types.ts:34-45) como legacy. Documentos con esos estados no aparecen en el picker de filtros por estado.  
**Impacto**: Documentos legacy inencontrables vía filtro de estado. `normalizarDocumentoCargado` en storage solo normaliza cotizaciones — OVs legacy no se normalizan.

---

### OV-P2-002 — `notaSalidaId` es scalar: múltiples NSes sobreescriben la referencia

**Severidad**: P2 — Medio  
**Evidencia**: `DocumentoComercial.notaSalidaId?: string` (types.ts:153). `vincularDocumentoComercialNS` sobreescribe `notaSalidaId` con cada nueva NS. El campo `despachado[]` acumula correctamente los despachos, pero la referencia a NSes individuales se pierde.  
**Impacto**: Para OV con múltiples despachos parciales, solo la última NS es rastreable por `notaSalidaId`. El historial textual en `historial[]` sí registra cada NS, pero no hay campo estructurado.

---

### OV-P2-003 — `anularNSEnInventario` salta líneas sin almacén silenciosamente

**Severidad**: P2 — Medio  
**Evidencia**: `notaSalida.service.ts` (l.438-440):
```typescript
const resolvedAlmId = linea.almacenId ?? nota.almacenOrigenId;
if (!resolvedAlmId) continue;
```
Si ambos son undefined, la línea se omite. No se registra en el historial de la NS.  
**Impacto**: Stock no se revierte para esas líneas al anular la NS. El total de movimientos reportados (`${movimientos.length} línea(s)`) no refleja las omitidas.

---

### OV-P2-004 — `construirCargaConversionDesdeOV` usa `ov.fechaEmision` como fecha del comprobante

**Severidad**: P2 — Medio  
**Evidencia**: `convertirOVaComprobante.ts` (l.295): `fechaEmision: ov.fechaEmision`. Si la OV tiene 5 días, el formulario de comprobante abre con la fecha de la OV.  
**Impacto**: UX — el usuario debe corregir la fecha manualmente. En SUNAT, emitir un comprobante con fecha anterior puede tener implicaciones de declaración. El usuario debe estar atento.

---

### OV-P2-005 — TODO activo en ListaComprobantes + console.log en prod

**Severidad**: P2 — Medio  
**Evidencia**: `ListaComprobantes.tsx` (~l.960-965): `// TODO: Abrir panel de filtros` y `console.log('Atajo de exportar activado')`.  
**Impacto**: Funcionalidad incompleta (atajos de teclado) y ruido en consola de producción.

---

### OV-P3-001 — `normalizarDocumentoCargado` no normaliza estados legacy de OV

**Severidad**: P3 — Bajo  
**Evidencia**: `documentoComercial.storage.ts:5-19`: solo normaliza `tipo === 'cotizacion'`. OVs con estados `'Generada'`, `'Atendida parcial'`, `'Atendida total'` se cargan tal cual.  
**Impacto**: Documentos legacy de OV se muestran con estado legacy en la UI.

---

### OV-P3-002 — `any` explícito en `postEmisionOrdenVenta.ts`

**Severidad**: P3 — Bajo  
**Evidencia**: 6 usos de `// eslint-disable-next-line @typescript-eslint/no-explicit-any` + `any[]` en funciones que parsean JSON de localStorage. Están comentados con razonamiento.  
**Impacto**: No afecta comportamiento en runtime, pero reduce type-safety en el parsing de documentos.

---

### OV-P3-003 — Código muerto en `obtenerColorEstado`

**Severidad**: P3 — Bajo  
**Evidencia**: `documentoComercial.helpers.ts` (l.220): `case 'Atendida total': return 'green'`. `'Atendida total'` no está en `ESTADOS_ORDEN_VENTA` ni en constantes activas.  
**Impacto**: Código muerto de compatibilidad legacy.

---

## 37. Plan de corrección recomendado

### Antes de entrega (P1 — bloqueantes):

1. **OV-P1-001** — Agregar guard en `puedeAnular` para OV en `'Pendiente de salida'`: retornar `false` o verificar que no existe comprobante activo antes de permitir anulación. Alternativamente, agregar advertencia explícita y confirmación doble.

2. **OV-P1-004** — Crear `restaurarOVPostAnulacionComprobante(ovId, info)` en `postEmisionOrdenVenta.ts` siguiendo el mismo patrón de `restaurarNVPostAnulacionComprobante`. Llamarla en `ListaComprobantes.tsx` cuando `tipoDocumentoFuente === 'orden_venta'`. La OV debería volver a `'Reservada'` y limpiar `trazabilidad.documentoDestinoId`.

3. **OV-P1-003** — En `construirCargaConversionDesdeOV` (línea 340): cambiar `terminosCredito: null` a `terminosCredito: ov.creditTerms ?? null`. Mismo patrón que cotizaciones.

4. **OV-P1-002 / OV-P1-006** — Bloquear edición de OV en estados `'Pendiente de salida'` y `'Atendida parcialmente'` en `puedeEditar` (agregar guards similares al de `'Reservada'`). Si la edición es un requisito de negocio, agregar recalculo de reserva en `actualizarDocumento`.

5. **OV-P1-005** — Envolver `reservarStockOrden` + `agregarDocumento` con manejo de error: si `agregarDocumento` falla, llamar `liberarReservaOrden(reservasStock)`. Mínimo: no silenciar el error de quota.

### Necesarios antes de producción (P2):

6. **OV-P2-001** — Agregar normalización de estados OV legacy en `normalizarDocumentoCargado`. Incluir estados legacy en `ESTADOS_ORDEN_VENTA` o añadir capa de normalización en carga.

7. **OV-P2-002** — Considerar `notaSalidasIds?: string[]` en lugar de `notaSalidaId?: string`. `vincularDocumentoComercialNS` debería acumular en lugar de sobreescribir.

8. **OV-P2-003** — Registrar en historial de NS las líneas omitidas por falta de `almacenId`. Mínimo: advertencia en la respuesta de `anularNSEnInventario`.

9. **OV-P2-004** — En `construirCargaConversionDesdeOV`: usar `obtenerFechaHoyISO()` o dejar el campo en null para que el formulario de comprobante use su propia fecha por defecto.

10. **OV-P2-005** — Implementar o eliminar los atajos de teclado pendientes. Remover `console.log`.

### Mejoras posteriores (P3):

11. **OV-P3-001** — Normalizar OV legacy en `normalizarDocumentoCargado`.
12. **OV-P3-002** — Tipar el parsing de localStorage con `unknown` + type guard en lugar de `any`.
13. **OV-P3-003** — Eliminar `case 'Atendida total'` en `obtenerColorEstado`.

---

## 38. Riesgos de integración con backend

| Riesgo | Descripción | Área |
|---|---|---|
| **Correlativos duplicados** | El sistema genera correlativos in-memory y en localStorage. Al integrar con backend, debe haber un mecanismo server-side de asignación de correlativos para evitar colisiones. | Creación OV |
| **Reserva de stock en backend** | `stockReservadoPorAlmacen` vive en Zustand (in-memory + localStorage de productos). Al migrar a backend, la reserva debe ser una transacción atómica (check-and-reserve). El patrón optimista actual no es aceptable en multiusuario real. | Stock |
| **Trazabilidad OV→Comprobante** | Los IDs de comprobante actualmente son los números (ej. "F001-00000001"). En backend, deberían ser UUIDs. El campo `documentoDestinoId` almacena números, no UUIDs internos. | Trazabilidad |
| **postEmisionOrdenVenta.ts accede a localStorage directamente** | Este módulo bypassa el contexto React y escribe directo a localStorage. En una arquitectura backend, esto debe reemplazarse por llamadas API. | Persistencia |
| **Evento DOM 'documentos_comerciales_changed'** | Mecanismo de sincronización cross-módulo vía CustomEvent del DOM. En SSR o React Server Components, esto no existiría. | Sync |

---

## 39. Checklist final

| Criterio | Estado | Evidencia |
|---|---|---|
| Build 0 errores TypeScript | ✅ CUMPLE | `built in 15.57s`, 0 errores |
| ESLint 0 errores | ✅ CUMPLE | Lint salida vacía |
| Estado inicial OV = Reservada | ✅ CUMPLE | `useDocumentoComercialActions.ts:196` |
| Borrador OV no reserva stock | ✅ CUMPLE | `guardarComoBorrador` sin `reservarStockOrden` |
| Validación stock en acción central (no solo UI) | ✅ CUMPLE | `validarStockParaOrden` en actions hook |
| FIFO multi-almacén en reserva | ✅ CUMPLE | `resolvealmacenesForSaleFIFO` + `allocateSaleAcrossalmacenes` |
| Liberación de reserva al anular OV Reservada | ✅ CUMPLE | `anularDocumento` l.540-554 |
| Cascada COT→Aceptada al anular OV | ✅ CUMPLE | `anularDocumento` l.585-613 |
| Despachos parciales acumulan correctamente | ✅ CUMPLE | `sumarDespachos` en `atenderOrdenVentaPostNSDirecta` |
| puedeEditar=false para OV Reservada | ✅ CUMPLE | `puedeEditar` (ListadoDocumentosComerciales.tsx) |
| puedeConvertir solo para Reservada | ✅ CUMPLE | `puedeConvertir` = `estado === 'Reservada'` |
| creditTerms OV→Comprobante | ❌ NO CUMPLE | `terminosCredito: null` hardcodeado |
| Restaurar OV al anular Comprobante | ❌ NO CUMPLE | Sin `restaurarOVPostAnulacionComprobante` |
| Anulación OV Pendiente de salida bloqueada si comprobante activo | ❌ NO CUMPLE | `puedeAnular` catch-all permite |
| Edición OV Atendida parcialmente ajusta reserva | ❌ NO CUMPLE | `actualizarDocumento` sin lógica de stock |
| Atomicidad Zustand + localStorage | ❌ PARCIAL | `reservarStockOrden` sin rollback si localStorage falla |
| Estados legacy visibles en filtros | ❌ NO CUMPLE | Excluidos de `ESTADOS_ORDEN_VENTA` |
| notaSalidaId soporta múltiples NSes | ❌ NO CUMPLE | Campo scalar, sobreescritura |
| Anulación NS revierte stock completo (con almacenId) | ✅ CUMPLE | `anularNSEnInventario` itera líneas expandidas |
| Anulación NS sin almacenId salta silenciosamente | ❌ PARCIAL | `if (!resolvedAlmId) continue` sin log |

---

## 40. Veredicto final

## 🔴 ÓRDENES DE VENTA NO LISTO PARA ENTREGA

### Razón técnica concreta

Existen **6 hallazgos P1** confirmados por trazabilidad estática completa:

1. **OV-P1-001**: Se puede anular una OV que tiene un Comprobante activo vinculado. El comprobante queda huérfano con trazabilidad rota.
2. **OV-P1-002 / OV-P1-006**: Editar una OV en `Atendida parcialmente` no recalcula la reserva de stock — las cantidades en la OV y las reservas en Zustand se dessincronizan.
3. **OV-P1-003**: `terminosCredito: null` hardcodeado en `construirCargaConversionDesdeOV` — las cuotas de crédito de la OV no se transfieren al Comprobante (comportamiento inconsistente vs Cotizaciones).
4. **OV-P1-004**: No existe `restaurarOVPostAnulacionComprobante` — cuando se anula el Comprobante generado desde una OV, la OV queda en `Atendida` permanentemente sin posibilidad de reconversión ni anulación.
5. **OV-P1-005**: Atomicidad rota entre `reservarStockOrden` (Zustand) y `agregarDocumento` (localStorage). Fallo de cuota silenciado puede dejar stock reservado sin documento rastreable.

### Respuestas a preguntas de veredicto

| Pregunta | Respuesta |
|---|---|
| ¿Build y lint pasan? | ✅ Sí |
| ¿El estado inicial de OV es correcto? | ✅ Reservada |
| ¿La reserva de stock es funcional? | ✅ Para creación; ⚠️ P1 para escenarios de edición y anulación de comprobante |
| ¿La anulación de OV libera stock? | ✅ Sí, pero permite anular en estados donde no debería |
| ¿La conversión a Comprobante transfiere datos? | ⚠️ Parcial — creditTerms hardcodeado null (P1-003) |
| ¿Existe reversión al anular el Comprobante? | ❌ No para OV (solo para COT y NV) — P1-004 |
| ¿Los despachos parciales acumulan correctamente? | ✅ Sí |
| ¿La Nota de Salida valida correctamente la reserva? | ✅ Sí, usa reservas pendientes |
| ¿La trazabilidad OV→NS soporta múltiples NSes? | ⚠️ Parcial — `notaSalidaId` scalar |
| ¿Hay estados incoherentes alcanzables? | ✅ OV `Atendida` permanente si Comprobante anulado |
| ¿Los filtros cubren todos los estados? | ⚠️ Excluyen legacy |
| ¿Hay atomicidad entre Zustand y localStorage? | ⚠️ Sin rollback |
| ¿El módulo es entregable con workarounds documentados? | ❌ P1-001 y P1-004 pueden reproducirse en flujo normal sin workaround |

---

*Auditoría realizada por análisis estático completo de código fuente. Ningún archivo de código fue modificado durante esta auditoría.*
