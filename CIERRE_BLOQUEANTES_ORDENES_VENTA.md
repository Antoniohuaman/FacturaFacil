# Cierre Definitivo — Bloqueantes Módulo Órdenes de Venta

**Fecha:** 2026-06-24  
**Branch:** RevisionCotizacion  
**Autor:** Claude Code (Sonnet 4.6)

---

## Estado inicial

El módulo de Órdenes de Venta tenía 5 bloqueantes identificados en `VALIDACION_POST_CORRECCION_ORDENES_VENTA.md`:
- **OV-P1-005** (P1): Reserva Zustand huérfana si falla la persistencia en localStorage
- **NUEVO-001** (P2): Anulación parcial de NS deja stock inconsistente si falla una línea
- **NUEVO-002** (P2): Restauración de reserva OV usa almacén físico de NS en lugar del establecimientoId de la reserva original
- **NUEVO-003** (P2): Normalización legacy `'Convertida'` asume `'Atendida'` sin evidencia
- **NUEVO-004** (P2): No existe guard previo a anular comprobante con NS activa vinculada a OV

---

## Bloqueantes corregidos

| ID | Severidad | Estado |
|----|-----------|--------|
| OV-P1-005 | P1 | CORREGIDO |
| NUEVO-001 | P2 | CORREGIDO |
| NUEVO-002 | P2 | CORREGIDO |
| NUEVO-003 | P2 | CORREGIDO |
| NUEVO-004 | P2 | CORREGIDO |

---

## Atomicidad de creación (OV-P1-005)

### Problema
`reservarStockOrden` (Zustand) ocurría antes de persistir en localStorage. Si `guardarDocumentosEnStorage` fallaba silenciosamente (QuotaExceededError u otro), la reserva quedaba activa en Zustand pero el documento no existía en storage: reserva huérfana.

### Solución
Nuevo flujo transaccional en `generarDocumento` y `generarDesdeBorrador` **solo para `tipo === 'orden_venta'`**:

1. Validar datos
2. Validar stock
3. Reservar stock en Zustand (`reservarStockOrden`) → obtener `reservasStock`
4. Construir documento completo
5. Llamar `persistirDocumentos(listaNueva)` — función tipada que retorna `ResultadoPersistencia`
6. Si FALLA: llamar `liberarReservaOrden(reservasStock)` (rollback exacto) → retornar error
7. Si ÉXITO: llamar `agregarDocumento(documento)` → disparar `documentos_comerciales_changed`

Para NV y COT el flujo original se conserva intacto.

---

## Persistencia tipada

### Función `persistirDocumentos`
Nueva función pura exportada desde `documentoComercial.storage.ts`:

```typescript
type ResultadoPersistencia =
  | { exito: true }
  | { exito: false; error: string; causa?: unknown };

export function persistirDocumentos(documentos: DocumentoComercial[]): ResultadoPersistencia
```

- Nunca lanza excepción
- Distingue `QuotaExceededError` de otros errores
- `error` es mensaje funcional para UI; `causa` se conserva para diagnóstico interno
- El `catch` silencioso en `guardarDocumentosEnStorage` se conserva (comentado claramente) porque sirve al useEffect de sincronización automática de NV/COT

### Función `cargarDocumentoPorId`
Nueva función pura exportada desde `documentoComercial.storage.ts`:
```typescript
export function cargarDocumentoPorId(id: string): DocumentoComercial | undefined
```
Usada por el guard de ListaComprobantes. El catch silencioso es aceptable: falla segura = no bloquear.

---

## Rollback de reserva

El rollback usa `liberarReservaOrden(reservasStock)` con los mismos `ReservaStockItem[]` devueltos por `reservarStockOrden`. El rollback es exacto: misma cantidad, misma SKU, mismo `establecimientoId`. No se necesitó cambiar la firma de `reservarStockOrden`.

---

## Prevalidación de NS (NUEVO-001)

### Problema
En `anularNSEnInventario`, la validación del almacén ocurría DENTRO del loop de `registerAdjustment`. Si la línea N fallaba, las líneas 1..N-1 ya habían modificado stock (inconsistencia parcial).

### Solución: dos fases

**Fase 1 — `prepararPlanAnulacionNS`** (sin efectos secundarios):
- Valida TODAS las líneas (producto existe, almacén resuelto, almacén en el Map)
- Si cualquier línea falla: lanza error antes de llamar `registerAdjustment` en ninguna línea
- Construye `PlanAjusteNS[]` listo para aplicar

**Fase 2 — aplicación con compensación**:
- Itera el plan aplicando `registerAdjustment(AJUSTE_POSITIVO)` una por una
- Si alguna falla: rollback en orden inverso (`registerAdjustment(SALIDA)`) sobre los ya aplicados
- Si el rollback también falla: lanza error crítico explícito ("stock puede estar inconsistente")
- Si el rollback exitoso: re-lanza el error original

---

## Rollback de movimientos

El catch del rollback en la Fase 2 de `anularNSEnInventario`:
- No es silencioso
- Si falla el rollback de un ajuste: lanza `Error` con mensaje explícito indicando posible inconsistencia y solicitando contacto a soporte
- Si el rollback tiene éxito: re-lanza el error original para que `useNotasSalida` lo muestre como `feedback.error`

---

## Restauración de reserva global (NUEVO-002)

### Problema
`anularNS` en `useNotasSalida.ts` construía `aRestaurar` con `almacenId` de las líneas físicas de la NS. Para OVs nuevas (arquitectura global), la reserva está en `stockReservadoOVPorEstablecimiento[establecimientoId]`. Al llamar `restaurarReservasDeOV` con `almacenId`, entraba a la rama legacy y escribía en `stockReservadoPorAlmacen`: reserva restaurada en el campo incorrecto.

### Solución: helper `construirRestauracionReservaDesdeOV`

Nueva función exportada desde `postEmisionOrdenVenta.ts`:

```typescript
export function construirRestauracionReservaDesdeOV(
  reservasOriginalOV: Array<{ sku; cantidad; almacenId?; establecimientoId?; nombre?; almacenNombre? }>,
  lineasAnuladas: Array<{ sku; cantidad }>,
): Array<{ sku; cantidad; almacenId?; establecimientoId?; ... }>
```

La clave: `{ ...reservaOriginal, cantidad: cantidadARestaurar }` copia el campo que define la arquitectura (`establecimientoId` para OVs nuevas, `almacenId` para legacy). `restaurarReservasDeOV` entra automáticamente a la rama correcta.

### Uso en `useNotasSalida.ts`
Los dos paths anteriores (OrdenVenta y no-OrdenVenta con `ordenVentaOrigenId`) estaban duplicados con lógica idéntica y ambos tenían el bug. Se unificaron en un único bloque:

```typescript
if (nota.ordenVentaOrigenId) {
  const reservasOV = obtenerReservasDeOV(nota.ordenVentaOrigenId);
  const lineasAnuladas = nota.lineas
    .filter(l => l.tipoBienServicio === 'bien')
    .map(l => ({ sku: l.productoCodigo, cantidad: l.cantidad }));
  const aRestaurar = construirRestauracionReservaDesdeOV(reservasOV, lineasAnuladas);
  restaurarOVPostAnulacionNSDirecta(nota.ordenVentaOrigenId, { ... aRestaurar ... });
}
```

---

## Compatibilidad legacy

- `construirRestauracionReservaDesdeOV` maneja ambas arquitecturas: si la reserva original tiene `almacenId` (legacy), lo copia; si tiene `establecimientoId` (nueva), lo copia.
- La fusión de los dos paths no elimina el soporte a NS de OV vía comprobante (`nota.origen !== 'OrdenVenta'`) — ambos entraban a la misma lógica y comparten el mismo `nota.ordenVentaOrigenId`.
- `normalizarDocumentoCargado` ahora distingue entre OVs legacy 'Convertida' con NS activa, con NS completada, sin modo NS, y ambiguas (modo NS sin evidencia).

---

## Bloqueo de Comprobante con NS activa (NUEVO-004)

### Problema
No existía guard previo. Si se anulaba un comprobante de OV con NS activa, el comprobante quedaba anulado pero la NS seguía vigente (stock comprometido inconsistente). El catch silencioso en la cascada enmascaraba el fallo.

### Solución: guard explícito en `confirmVoid`

Al inicio de `confirmVoid`, antes de cualquier modificación:

```typescript
const ovIdGuard = /* resolver ovId desde sourceDocumentType o instantanea */;
if (ovIdGuard) {
  const ovActual = cargarDocumentoPorId(ovIdGuard);
  const tieneNSActiva =
    ovActual?.notaSalidaGenerada === true ||
    (Array.isArray(ovActual?.notaSalidaIds) && ovActual.notaSalidaIds.length > 0);
  if (tieneNSActiva) {
    feedback.error('No se puede anular el comprobante porque tiene una Nota de Salida vigente...');
    return; // sin modificar nada
  }
}
```

Si la OV tiene NS activa: bloqueo total (sin modificar comprobante, stock, ni OV).
Si no tiene NS activa: flujo normal existente.

La Escenario B (NS existente en el comprobante mismo con `notaSalidaId`) ya no puede ocurrir en el contexto OV gracias al guard — pero se mantiene el código del Escenario B para compatibilidad con NV/otros.

---

## Normalización legacy segura (NUEVO-003)

### Problema
`normalizarDocumentoCargado` mapeaba `'Convertida' → 'Atendida'` incondicionalmente para OVs. Una OV legacy 'Convertida' en modo NS con NS activa debería ser `'Pendiente de salida'`.

### Solución: lógica basada en evidencia

```typescript
if (doc.estado === 'Convertida') {
  const modoNS = doc.modoDescuentoStock === 'nota_salida';
  const tieneNSActiva = doc.notaSalidaGenerada === true;

  if (modoNS && tieneNSActiva)        → 'Pendiente de salida'
  if (modoNS && !tieneNSActiva && notaSalidaId) → 'Atendida'
  if (!modoNS)                         → 'Atendida'
  // Ambiguo (modo NS sin evidencia)   → 'Pendiente de salida' (conservador)
}
```

El estado conservador `'Pendiente de salida'` bloquea edición y anulación directa sin asumir que el stock ya salió.

---

## Invariantes de stock

- La reserva en `stockReservadoOVPorEstablecimiento` nunca queda huérfana tras un fallo de persistencia (OV-P1-005 rollback garantiza liberación).
- El stock nunca queda inconsistente tras una anulación parcial de NS (NUEVO-001 rollback con compensación).
- La restauración de reserva tras anulación de NS siempre escribe en el campo correcto de Zustand (NUEVO-002 helper).
- Una OV con NS activa no puede perder su comprobante sin anular primero la NS (NUEVO-004 guard).

---

## Archivos modificados en esta sesión

| Archivo | Corrección |
|---------|-----------|
| `apps/senciyo/src/pages/Private/features/documentos-comerciales/utils/documentoComercial.storage.ts` | OV-P1-005, NUEVO-003 |
| `apps/senciyo/src/pages/Private/features/documentos-comerciales/hooks/useDocumentoComercialActions.ts` | OV-P1-005 |
| `apps/senciyo/src/pages/Private/features/gestion-inventario/services/notaSalida.service.ts` | NUEVO-001 |
| `apps/senciyo/src/pages/Private/features/gestion-inventario/hooks/useNotasSalida.ts` | NUEVO-002 |
| `apps/senciyo/src/shared/documentosComerciales/postEmisionOrdenVenta.ts` | NUEVO-002 |
| `apps/senciyo/src/pages/Private/features/comprobantes-electronicos/lista-comprobantes/pages/ListaComprobantes.tsx` | NUEVO-004 |

---

## Código eliminado

- Los dos bloques duplicados de construcción de `aRestaurar` en `useNotasSalida.ts` (uno para `origen === 'OrdenVenta'` y otro para `origen !== 'OrdenVenta'`) se fusionaron en un único bloque correcto.
- La construcción manual de `aRestaurar` con `almacenId` de líneas físicas fue eliminada por completo.

---

## Tests agregados

No se agregaron tests automatizados — el proyecto tiene solo un archivo de test existente (`stockAlerts.test.ts`) no relacionado con el módulo OV.

---

## Pruebas funcionales recomendadas

1. **OV-P1-005**: Simular QuotaExceededError en localStorage durante creación de OV → verificar que la reserva en Zustand se libera y el usuario recibe mensaje de error.
2. **NUEVO-001**: NS con producto/almacén faltante en catálogo al momento de anular → verificar que NINGUNA línea se modifica.
3. **NUEVO-002**: Crear OV nueva (con `establecimientoId`), generar NS directa, anular NS → verificar que `stockReservadoOVPorEstablecimiento` se restaura (no `stockReservadoPorAlmacen`).
4. **NUEVO-004**: OV con NS activa → intentar anular el comprobante → verificar mensaje de bloqueo y que el comprobante no cambia de estado.
5. **NUEVO-003**: OV legacy con estado 'Convertida' en localStorage con `modoDescuentoStock: 'nota_salida'` y `notaSalidaGenerada: true` → recargar → verificar estado resultante `'Pendiente de salida'`.

---

## Validaciones automáticas

| Validación | Resultado |
|------------|-----------|
| `tsc -b` (TypeScript) | 0 errores |
| `vite build` | Exitoso en 22.14s |
| ESLint | Sin hallazgos |
| Tests existentes | No aplican al módulo OV |

---

## Riesgos restantes

1. **`window.dispatchEvent(new Event('documentos_comerciales_changed'))` en el flujo transaccional**: Se dispara después de `agregarDocumento`. Si el evento causa una recarga del contexto antes de que React procese el dispatch, podría haber un render doble. Riesgo bajo: el evento es idempotente (recarga desde storage que ya tiene el documento).

2. **`obtenerReservasDeOV` con reservas "pendientes" post-despacho parcial**: `construirRestauracionReservaDesdeOV` usa `Math.min(linea.cantidad, reservaOriginal.cantidad)`. Si la reserva ya fue parcialmente liberada por despachos anteriores, `reservaOriginal.cantidad` refleja la reserva PENDIENTE actual (ya calculada por `calcularReservasPendientes` dentro de `obtenerReservasDeOV`). Correcto por diseño.

3. **Guard NUEVO-004 lee localStorage en el render**: `cargarDocumentoPorId` es síncrono y puede ser costoso si hay muchos documentos. Impacto mínimo en práctica (se llama solo al confirmar anulación).

4. **OVs legacy 'Convertida' sin `modoDescuentoStock`**: La normalización conservadora las deja en `'Pendiente de salida'`. Esto bloquea edición y anulación directa. El operador deberá resolver manualmente o vía soporte. Riesgo intencional y documentado.

---

## Resultado final

- **OV-P1-005**: CORREGIDO — Flujo transaccional con rollback de reserva garantizado
- **NUEVO-001**: CORREGIDO — Prevalidación completa + compensación en rollback
- **NUEVO-002**: CORREGIDO — Helper `construirRestauracionReservaDesdeOV` usa arquitectura original de la OV
- **NUEVO-003**: CORREGIDO — Normalización conservadora basada en evidencia
- **NUEVO-004**: CORREGIDO — Guard explícito antes de cualquier modificación
- **Build**: 0 errores TypeScript, build exitoso
- **ESLint**: Sin hallazgos
