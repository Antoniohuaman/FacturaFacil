# Auditoría Fase 2 Nota de Salida — Documentos Origen

**Fecha:** 2026-06-07  
**Módulo objetivo:** Nota de Salida Fase 2 — Integración con documentos origen  
**Alcance:** Solo auditoría. Sin cambios de código.  
**Referencia Fase 1:** `NotaSalida` independiente, operativa y validada.

---

## 1. Resumen ejecutivo

La **Fase 2 de Nota de Salida** —que conecta NS con OV, NV y Comprobantes— es técnicamente viable pero requiere trabajo sustancial en 4 de los 5 módulos auditados.

**Hallazgo crítico:** El sistema **no tiene** un switch "descuento automático on/off" para comprobantes. Sólo existe `salesPreferences.allowNegativeStock` (booleano global), que controla si se puede quedar en stock negativo, pero el descuento de stock **siempre ocurre** al emitir un comprobante. Esto invalida el escenario "comprobante sin descuento automático → generar NS" tal como fue planteado en el brief funcional. Este hallazgo debe revisarse con el equipo de producto antes de diseñar Fase 2.

**Otros hallazgos principales:**

| Módulo | Datos para NS | Acción NS | Anti-doble descuento | Trazabilidad bidireccional |
|---|---|---|---|---|
| Nota de Salida (Fase 1) | Parcial | N/A | No | No |
| Orden de Venta | Sí | No | No | Unidireccional |
| Nota de Venta | Parcial | No | No | Mínima |
| Comprobante | Parcial | No | No | Unidireccional |
| Config descuento | Parcial (solo `allowNegativeStock`) | N/A | Parcial | N/A |

**Veredicto:** No se debe iniciar Fase 2 sin antes resolver el hallazgo crítico del switch de descuento automático y sin agregar al modelo de NS los campos de trazabilidad bidireccional.

---

## 2. Reglas funcionales esperadas

Según el brief, las reglas funcionales de Fase 2 son:

```
NV generada → Generar NS → NS carga datos de NV → valida stock → descuenta.

OV reservada → Generar NS → NS consume reserva → descuenta stock real → libera reserva → genera Kardex.

OV → Comprobante (descuento automático activo) → NO debe permitir NS.

OV → Comprobante (descuento automático inactivo) → puede generar NS.

Comprobante directo (auto activo) → no aparece NS.
Comprobante directo (auto inactivo) → puede generar NS.

Cotización → NO genera NS nunca.

Anulación encadenada: anular origen → anular NS → reponer stock.
```

El análisis de cada regla contra el estado actual se detalla en las secciones 8–13.

---

## 3. Estado actual de Nota de Salida

**Archivos relevantes:**
- `gestion-inventario/models/notaSalida.types.ts`
- `gestion-inventario/services/notaSalida.service.ts`
- `gestion-inventario/hooks/useNotasSalida.ts`

### Campos de origen actuales

```typescript
documentoOrigen?: string           // string libre, sin tipo
numeroDocumentoOrigen?: string     // número legible, sin id tipado
origen?: 'Manual'                  // solo acepta 'Manual'
```

**Falta para Fase 2:**

| Campo requerido | Estado |
|---|---|
| `documentoOrigenId?: string` | NO EXISTE — sólo hay `documentoOrigen` (nombre libre) |
| `documentoOrigenTipo?: 'orden_venta' \| 'nota_venta' \| 'comprobante'` | NO EXISTE |
| `reservaConsumida?: boolean` | NO EXISTE |
| `comprobanteDescontóStock?: boolean` | NO EXISTE |
| `origen` tipado más allá de `'Manual'` | NO EXISTE |

### Capacidades actuales

- ✅ Valida stock suficiente (transaccional) antes de generar
- ✅ Descuenta stock real al generar (tipo `SALIDA` en Kardex)
- ✅ Repone stock al anular (tipo `AJUSTE_POSITIVO`)
- ✅ Descuenta por `almacenId` de cada línea
- ✅ Tiene `lineas` con `almacenId`, `cantidad`, `productoId`
- ❌ No puede recibir líneas prellenadas desde documento origen
- ❌ No consume/libera reservas de OV
- ❌ No guarda referencia tipada al documento origen
- ❌ No existe reverse-link: ningún origen guarda `notaSalidaId`

### Modelo de servicio

`generarNSEnInventario()` recibe la NS ya construida. Para Fase 2 necesitará:
1. Recibir un modo adicional: `origen: 'OV' | 'NV' | 'Comprobante'`
2. Para OV: aceptar y consumir `reservasStock` antes de descontar stock libre
3. Para Comprobante: verificar que `allowNegativeStock` no indica que ya descontó

---

## 4. Estado actual de Orden de Venta

**Archivos relevantes:**
- `documentos-comerciales/models/documentoComercial.types.ts`
- `documentos-comerciales/services/useDocumentoComercialActions.ts`
- `documentos-comerciales/services/servicioReservaStock.ts`
- `documentos-comerciales/services/convertirOVaComprobante.ts`
- `documentos-comerciales/components/ListadoDocumentosComerciales.tsx`

### Estados de OV

```
Borrador → Generada → Reservada → Atendida parcial → Atendida total → Anulada / Vencida
                                                     → Convertida (legado)
```

### Reserva de stock

El modelo de OV guarda:
```typescript
reservasStock?: ReservaStockItem[]
// Donde ReservaStockItem = { sku, nombre, cantidad, almacenId, almacenNombre? }
```

El producto guarda en paralelo:
```typescript
product.stockReservadoPorAlmacen[almacenId] += cantidad
```

- ✅ Reserva existe por producto/almacén/cantidad
- ✅ `liberarReservaOrden()` se llama al anular OV
- ✅ La conversión OV→Comprobante respeta reservas con `respectReservations: true`

### Trazabilidad

```typescript
trazabilidad?: TrazabilidadDocumentoComercial
// Campos:
documentoOrigenId?: string
documentoOrigenTipo?: TipoDocumentoComercial
documentoOrigenNumero?: string
documentoDestinoId?: string
documentoDestinoTipo?: TipoDocumentoComercial | 'comprobante'
documentoDestinoNumero?: string
```

- ✅ OV puede registrar destino (`documentoDestinoTipo = 'comprobante'`)
- ❌ OV no actualiza `documentoDestinoTipo = 'nota_salida'` porque esa acción no existe aún
- ❌ OV no guarda `notaSalidaRelacionadaId` ni `notasGeneradas: []`

### Menú de acciones actual

Acciones disponibles cuando OV está en `Reservada`:
- Ver detalle
- Duplicar
- Imprimir A4 / Ticket / Compartir
- **Generar comprobante** (existe, navega a `/comprobantes/emision`)
- Anular

**NO existe** "Generar Nota de Salida" en el menú de OV.

### Conversión OV → Comprobante

`construirCargaConversionDesdeOV()` en `convertirOVaComprobante.ts`:
- Usa stock actual (no congelado de la OV)
- Pasa `documentoOrigenId: ov.id` y `documentoOrigenTipo: 'orden_venta'` al comprobante
- **No actualiza la OV con el comprobante generado** — la trazabilidad es unidireccional

---

## 5. Estado actual de Nota de Venta

**Archivos relevantes:**
- `Documentos-negociacion/models/documento.types.ts`
- `Documentos-negociacion/` (componentes y hooks)

### Modelo de NV

```typescript
interface Documento {
  type: string           // 'Nota de Venta' | 'Cotización'
  status: string
  items?: any[]          // productos — tipado débil (any[])
  relatedDocumentId?: string
  relatedDocumentType?: string
}
```

### Estados de NV

```
Borrador → Pendiente → Aprobado → Facturado → Anulado
```

### Confirmaciones

- ✅ NV **no reserva stock**
- ✅ NV **no descuenta stock**
- ✅ NV tiene `items` (productos)
- ✅ NV tiene `relatedDocumentId`/`relatedDocumentType` (para destino simple)

### Problemas para Fase 2

| Campo requerido | Estado |
|---|---|
| `almacenId` por línea de producto | ❌ NO EXISTE — `items?: any[]` no tiene estructura tipada |
| `cantidad` por línea | ⚠️ Probable en `items` pero no tipado explícitamente |
| Precio de venta unitario por línea | ⚠️ Probable en `items` pero no tipado |
| `notaSalidaRelacionadaId` | ❌ NO EXISTE |
| "Más acciones" con NS | ❌ NO EXISTE |
| Tipado fuerte de `items` | ❌ `any[]` — riesgo de errores en integración |

**Riesgo alto:** El tipado débil de `items` en NV significa que al construir NS prellenada desde NV, el servicio de integración tendría que asumir la forma de los objetos o hacer casting inseguro.

---

## 6. Estado actual de Comprobantes

**Archivos relevantes:**
- `comprobantes-electronicos/models/comprobante.types.ts`
- `comprobantes-electronicos/hooks/useComprobanteActions.tsx`
- `comprobantes-electronicos/services/instantaneaDocumentoComercial.ts`

### Descuento automático de stock

> **⚠️ Hallazgo crítico**

El brief funcional asume que existe un switch "descuento automático de stock on/off". **No existe ese switch**.

Lo que existe es:

```typescript
// SalesPreferences en ContextoConfiguracion.tsx
salesPreferences.allowNegativeStock: boolean
```

Este campo controla si se **permite quedar en stock negativo** cuando no hay suficiente. **No es un toggle de "auto-descuento"**.

El descuento de stock **siempre ocurre** al emitir un comprobante (Factura o Boleta):
- `allowNegativeStock = false` → si no hay stock, lanza error y **bloquea la emisión**
- `allowNegativeStock = true` → si no hay stock, descuenta igual y permite negativo

**Conclusión:** No existe el escenario "comprobante emitido sin descuento de stock" en la arquitectura actual. Todo comprobante emitido ya descontó stock o falló al intentarlo.

### ¿El comprobante sabe que ya descontó stock?

```typescript
// En el tipo Comprobante
// NO existe ninguno de estos campos:
stockDescontado?: boolean
kardexGenerado?: boolean
movimientosStockIds?: string[]
```

Los movimientos se crean en el Kardex (inventory store) pero **no hay back-reference en el comprobante** que diga "este comprobante generó movimiento X". Para saber si un comprobante descontó stock, habría que buscar en el Kardex por `documentoReferencia`.

### Trazabilidad origen OV

El comprobante guarda en `InstantaneaDocumentoComercial.relaciones`:
```typescript
documentoOrigenId: string | null
documentoOrigenTipo: string | null     // 'orden_venta' si viene de OV
idDocumentoFuente: string | null
tipoDocumentoFuente: string | null
```

- ✅ El comprobante sabe si vino de OV
- ❌ La OV **no sabe** qué comprobante fue generado desde ella
- ❌ No hay `notaSalidaRelacionadaId` en el comprobante
- ❌ No hay "Más acciones" → "Generar NS" en la UI de comprobantes

### Anulación de comprobante

- ✅ Existe acción de anulación/cancelación
- ❌ La anulación **no reversa movimientos de stock automáticamente** (requiere NS Anulación separada o ajuste manual)
- ❌ La anulación **no verifica** si hay NS relacionada

### Aplica a

El descuento automático aplica únicamente a Factura y Boleta. NV, OV y Cotización tienen sus propias mecánicas (OV reserva, NV y COT no tocan stock).

---

## 7. Estado actual de configuración de descuento automático

**Archivo:** `configuracion-sistema/contexto/ContextoConfiguracion.tsx` (línea ~65)

```typescript
export type SalesPreferences = {
  allowNegativeStock: boolean;
  pricesIncludeTax: boolean;
};
```

### Análisis del campo `allowNegativeStock`

| Aspecto | Resultado |
|---|---|
| Nombre semántico | "¿Permitir stock negativo?" — no "¿Descuento automático?" |
| Aplica a Factura/Boleta | ✅ Sí |
| Aplica a POS | ✅ Sí (misma función `addMovimientoStock`) |
| Aplica a OV | ❌ No — OV valida estrictamente disponible sin importar este flag |
| Aplica a NV | ❌ No |
| Aplica a Cotización | ❌ No |
| ¿Puede desactivar el descuento? | ❌ No — sólo controla si se permite negativo, el descuento siempre ocurre |
| ¿Hay campo "descuento automático"? | ❌ No existe |

### Separación semántica necesaria para Fase 2

Para implementar los escenarios del brief, habría que introducir:

```typescript
// Propuesta — no implementar todavía
SalesPreferences.autoDescuentoStockComprobante: boolean
// true  → comprobante descuenta stock automáticamente (hoy: siempre)
// false → comprobante NO descuenta; se gestiona vía NS
```

Sin este campo, la lógica "NS después de comprobante" no tiene ancla técnica. El equipo de producto debe decidir si realmente quiere este comportamiento o si el flujo correcto es siempre NS-primero y comprobante-segundo.

---

## 8. Validación de NV → NS

### Datos disponibles

| Dato necesario en NS | Disponible en NV | Problema |
|---|---|---|
| `clienteNombre` / id | ✅ Probablemente en NV | Tipado débil (`any[]`) |
| `lineas[].productoId` | ⚠️ En `items` | No tipado explícitamente |
| `lineas[].cantidad` | ⚠️ En `items` | No tipado explícitamente |
| `lineas[].pvUnitario` | ⚠️ En `items` | No tipado explícitamente |
| `almacenOrigenId` por línea | ❌ NO EXISTE en NV | Habría que pedir al usuario |
| `tipoSalida` | ❌ No aplica a NV | Habría que elegir uno por defecto |

### Acción "Generar NS" en NV

- ❌ No existe en la UI de NV
- ❌ No existe función en el servicio/hook de NV

### Anti-doble descuento

- ❌ No existe `notaSalidaRelacionadaId` en NV
- ❌ No existe chequeo "ya tiene NS generada"
- ❌ Posible generar múltiples NS desde la misma NV si no se agrega control

### Estado

| Aspecto | Estado |
|---|---|
| Datos suficientes para prellenar NS | Parcial (tipado débil, sin almacén) |
| Acción en UI | No existe |
| Validación stock | NS ya lo hace (reutilizable) |
| Anti-doble descuento | No existe |
| Trazabilidad bidireccional | No existe |

**Veredicto Escenario NV → NS:** Desalineado. Requiere: tipado fuerte de `items` en NV, campo `almacenOrigenId` en NV (o elegir almacén en el formulario NS), acción "Generar NS" en UI de NV, campo `notaSalidaRelacionadaId` en NV.

---

## 9. Validación de OV → NS

### Datos disponibles

| Dato necesario en NS | Disponible en OV | Problema |
|---|---|---|
| `clienteNombre` / id | ✅ Sí | — |
| `lineas[].productoId` | ✅ Sí (reservasStock) | — |
| `lineas[].cantidad` | ✅ Sí (reservasStock[].cantidad) | — |
| `lineas[].almacenId` | ✅ Sí (reservasStock[].almacenId) | — |
| `tipoSalida` | ❌ No | Habría que elegir uno por defecto |
| Mecanismo para consumir reserva | ✅ `liberarReservaOrden()` existe | No está integrado en NS |

### Flujo requerido para OV → NS

```
1. NS prellenada desde reservasStock de OV
2. Validar que OV está en estado 'Reservada'
3. Al generar NS:
   a. Descontar stock real (tipo SALIDA) — ya existe
   b. Llamar liberarReservaOrden(ovId) — existe pero no integrado en NS
4. Actualizar OV: estado → 'Atendida total' o 'Atendida parcial'
5. Guardar trazabilidad: NS.documentoOrigenId = ov.id
6. Guardar reverse-link: OV.trazabilidad.documentoDestinoId = ns.id
```

### Anti-doble descuento

- ❌ OV no guarda `notaSalidaRelacionadaId`
- ❌ Si OV ya pasó a 'Atendida total' puede ser suficiente como guarda, pero no está implementado
- ❌ Posible generar NS desde OV que ya fue convertida a comprobante (doble salida)

### Riesgo de reserva colgada

Si NS se genera desde OV pero `liberarReservaOrden()` falla o no se llama:
- El stock quedaría **reservado y descontado a la vez** (doble retención)
- `product.stockReservadoPorAlmacen[almacenId]` no se libera
- `product.stockPorAlmacen[almacenId]` ya fue descontado por la NS

**Veredicto Escenario OV → NS:** Parcialmente alineado. Los datos existen. La lógica de liberación existe pero no está integrada en NS. Falta: integración de `liberarReservaOrden`, control de estado OV post-NS, trazabilidad bidireccional, guard anti-doble.

---

## 10. Validación de OV → Comprobante → NS

### Situación actual

Cuando OV → Comprobante:
- `construirCargaConversionDesdeOV()` usa stock actual (no congelado)
- El comprobante guarda `documentoOrigenId = ov.id`
- El comprobante descuenta stock con `respectReservations: true` (usa reserva de OV)
- **La OV NO sabe que fue convertida** (trazabilidad no actualizada automáticamente)

### Escenario con "descuento automático activo"

Dado que el descuento **siempre ocurre** en comprobantes:
- El comprobante ya descontó el stock al emitirse
- **No hay campo `stockDescontado = true`** en el comprobante
- Para saber si el comprobante descontó stock, habría que:
  - Buscar movimientos Kardex donde `documentoReferencia = comprobante.numero`
  - O introducir un campo nuevo

**Resultado:** No hay forma directa de saber si un comprobante ya generó Kardex sin consultar el inventario.

### Escenario con "descuento automático inactivo"

**No existe** este escenario en el sistema actual (ver Sección 7). El campo para controlarlo no existe.

### Riesgo

Si se implementara NS después de comprobante sin verificar el Kardex:
- Habría **doble descuento** del mismo stock
- Kardex tendría dos movimientos tipo SALIDA para el mismo comprobante

**Veredicto Escenario OV → Comprobante → NS:** Desalineado. El switch de descuento automático no existe. No hay forma actual de saber si el comprobante ya descontó. Requiere decisión de producto antes de diseñar.

---

## 11. Validación de Comprobante → NS

### Escenario "descuento automático activo"

- ❌ No existe campo `stockDescontado` en comprobante
- ❌ No se puede ocultar/deshabilitar "Generar NS" porque esa acción no existe aún
- ❌ No hay mecanismo para detectar "ya generó Kardex"

### Escenario "descuento automático inactivo"

- ❌ El escenario no existe (ver Sección 7)
- ❌ No hay switch para desactivar el descuento

### Lo que sí está disponible en comprobante

- ✅ `documentoOrigenId` / `documentoOrigenTipo` — sabe si viene de OV
- ✅ Tiene productos con cantidades
- ✅ Existe anulación
- ❌ No tiene `almacenOrigenId` por línea de forma explícita en el tipo NS

**Veredicto Escenario Comprobante → NS:** Desalineado. Requiere decisión fundamental de producto sobre si existe o no el toggle de descuento automático.

---

## 12. Validación de Cotización

### Confirmaciones

- ✅ Cotización (`COT`) no tiene lógica de stock en ningún servicio
- ✅ No llama a `addMovimientoStock`, `reservarStockOrden` ni `generarNSEnInventario`
- ✅ Comparte módulo con NV (`Documentos-negociacion`) pero sus paths son independientes
- ✅ Su serie COT1 no se mezcla con NS01

### Riesgo

- ❌ Bajo. No hay riesgo inmediato de mezcla con flujos de salida
- ⚠️ Comparte tipo `Documento` con NV — si se agrega "Generar NS" a NV, cuidar que `type === 'Cotización'` esté excluido explícitamente

**Veredicto Cotización:** Alineado con la regla "no genera NS".

---

## 13. Anulaciones y documentos relacionados

### ¿Existe relación documento origen ↔ NS hoy?

| Link | Existe | Campo |
|---|---|---|
| NS → origen (nombre) | ✅ | `documentoOrigen` (string libre) |
| NS → origen (id tipado) | ❌ | No existe `documentoOrigenId` |
| OV → NS | ❌ | No existe |
| NV → NS | ❌ | No existe |
| Comprobante → NS | ❌ | No existe |

### ¿Pueden anularse los documentos origen?

| Documento | Anulación existe | Reversa stock |
|---|---|---|
| OV | ✅ Sí (`anularDocumento`) | ✅ Libera reserva |
| NV | ✅ Sí (estado `Anulado`) | ✅ No aplica (no afecta stock) |
| Comprobante | ✅ Sí | ❌ No reversa Kardex automáticamente |
| NS | ✅ Sí (`anularNS`) | ✅ Repone stock |

### Anulación encadenada

Para implementar "anular origen → anular NS → reponer stock":

**Lo que falta:**
1. Campo `notaSalidaRelacionadaId` (o `notasSalida: string[]`) en OV, NV y Comprobante
2. Lógica de búsqueda de NS por `documentoOrigenId` antes de anular origen
3. Diálogo de advertencia antes de anular si hay NS relacionada
4. Llamada a `anularNS()` en cascada con motivo automático

**Recomendación:** La anulación encadenada es funcional en aislamiento (NS puede anularse sola y repone stock correctamente). La cascada desde el origen es complejidad adicional. Se recomienda **dejar para Fase 3**.

---

## 14. Riesgos de doble descuento

### Escenarios de riesgo

| Escenario | Riesgo actual | Mecanismo de protección existente |
|---|---|---|
| Comprobante emitido + NS desde mismo comprobante | **CRÍTICO** | Ninguno — comprobante ya descontó, NS descontaría de nuevo |
| OV → Comprobante + OV → NS separada | **ALTO** | Ninguno — no hay guard que detecte OV ya atendida vía comprobante |
| NV con NS ya generada + nueva NS | **ALTO** | Ninguno — NV no guarda `notaSalidaRelacionadaId` |
| OV con NS ya generada + nueva NS | **ALTO** | Parcial — si OV queda en `Atendida total` podría filtrarse, pero no está implementado |
| NS generada + misma NS generada de nuevo | **Bajo** | ✅ `generarNSEnInventario` lanza error si estado ya es `Generada` |

### Mecanismos requeridos

```typescript
// En OV:
notasSalidaIds?: string[]          // lista de NS generadas
estadoDespacho?: 'Pendiente' | 'Parcial' | 'Completo'

// En Comprobante:
notaSalidaId?: string
stockDescontadoViaComprobante?: boolean

// En NV:
notaSalidaId?: string
```

---

## 15. Riesgos de reservas colgadas

### Escenarios

| Escenario | Riesgo |
|---|---|
| OV → NS generada sin llamar `liberarReservaOrden` | **CRÍTICO** — stock reservado + descontado = doble retención |
| OV → Comprobante → comprobante anulado → reserva no restaurada | **ALTO** — el comprobante no restaura reserva OV |
| OV → NS → NS anulada sin restaurar reserva | **MEDIO** — la NS repone stock real pero ¿restaura la reserva de OV? |

### Estado actual

`liberarReservaOrden()` en `servicioReservaStock.ts`:
- ✅ Existe y funciona
- ✅ Se llama en anulación de OV
- ❌ **No se llama al generar NS** desde OV (porque esta integración no existe aún)
- ❌ **No se llama en la anulación de NS** generada desde OV (no hay link OV↔NS)

**Recomendación:** En Fase 2, al generar NS desde OV, `liberarReservaOrden` debe ser parte de la misma transacción que `generarNSEnInventario`. Si una falla, la otra no debe ejecutarse.

---

## 16. Riesgos de stock negativo

### Escenarios

| Escenario | Riesgo |
|---|---|
| NS intenta descontar más de lo disponible | **Bajo** — ✅ NS ya valida stock (transaccional) antes de generar |
| Comprobante con `allowNegativeStock = true` + NS posterior | **CRÍTICO** — comprobante puede llevar stock a negativo, NS posterior falla o empeora la situación |
| OV reservó 25 unidades pero stock real bajó a 15 antes de generar NS | **ALTO** — NS validará contra stock real disponible (no reservado), puede fallar aunque OV tenía reserva válida |

### Nota sobre OV y stock disponible

Al reservar OV, el stock "disponible para nuevas ventas" se calcula como:
```
stock_libre = stockPorAlmacen - stockReservadoPorAlmacen
```

Si NS valida contra `stockPorAlmacen` (total) en lugar de `stockPorAlmacen - stockReservadoPorAlmacen` (libre), la validación es incorrecta para el escenario OV→NS. La NS debería validar que la reserva existe y es suficiente, **no** que hay stock libre adicional.

Verificar en `generarNSEnInventario` qué stock consulta: `InventoryService.getStock()` devuelve `product.stockPorAlmacen?.[almacenId] ?? 0` (total, incluyendo reservado). Para OV→NS, la validación correcta es: `reserva.cantidad <= reservaStockOV.cantidad`, no comparar contra stock total.

---

## 17. Campos/trazabilidad faltante

### En `NotaSalida`

```typescript
// Agregar en notaSalida.types.ts:
documentoOrigenId?: string               // id tipado del documento origen
documentoOrigenTipo?: 'orden_venta' | 'nota_venta' | 'comprobante' | 'manual'
reservaOVConsumida?: boolean             // si se liberó la reserva de OV
```

### En `DocumentoComercial` (OV)

```typescript
// Agregar en documentoComercial.types.ts:
notasSalidaIds?: string[]               // lista de NS generadas desde esta OV
estadoDespacho?: 'Pendiente' | 'Parcial' | 'Completo'
```

### En `Documento` (NV)

```typescript
// Agregar en documento.types.ts:
notaSalidaId?: string                   // NS generada desde esta NV
almacenId?: string                      // almacén por defecto para NS
// Tipar items fuertemente (hoy es any[])
```

### En `Comprobante`

```typescript
// Agregar en comprobante.types.ts:
notaSalidaId?: string                   // NS generada desde este comprobante
stockDescontadoViaComprobante?: boolean // true si el comprobante ya descontó
```

### En `SalesPreferences` (configuración)

```typescript
// Sólo si producto decide introducir el toggle:
autoDescuentoStockEnComprobante?: boolean
```

---

## 18. Qué ya está alineado

| Capacidad | Módulo | Descripción |
|---|---|---|
| Validación de stock antes de generar NS | NS | Transaccional, bloquea si insuficiente |
| Descuento de stock por almacén específico | NS | `lineas[].almacenId` |
| Reposición de stock al anular NS | NS | AJUSTE_POSITIVO en Kardex |
| Reserva de stock por almacén | OV | `reservasStock[].almacenId/cantidad` |
| Liberación de reserva al anular OV | OV | `liberarReservaOrden()` llamado |
| OV tiene datos suficientes para prellenar NS | OV | `reservasStock` tiene sku/cantidad/almacén |
| Trazabilidad OV → Comprobante (unidireccional) | OV | `trazabilidad.documentoDestinoTipo` |
| Comprobante guarda origen OV | Comprobante | `relaciones.documentoOrigenId` |
| Cotización no afecta stock | COT | Confirmado |
| NV no afecta stock | NV | Confirmado |
| NS no se puede generar dos veces | NS | Guard en `generarNSEnInventario` |
| Series NS01 configuradas | Config | NS01 disponible en Configuración → Series |

---

## 19. Qué está parcialmente alineado

| Capacidad | Módulo | Problema |
|---|---|---|
| Trazabilidad NS → origen | NS | `documentoOrigen` existe como string pero no como ID tipado |
| Relación OV ↔ comprobante | OV/Comp | Unidireccional; OV no sabe qué comprobante generó |
| Consumo de reservas OV | NS/servicioReservaStock | `liberarReservaOrden` existe pero no integrada en NS |
| Estado OV post-NS | OV | No actualiza a `Atendida` al generar NS |
| Items en NV | NV | Existen pero tipado como `any[]` — inseguro |
| `allowNegativeStock` como control de descuento | Config | Controla negatividad pero no habilita/deshabilita el descuento |

---

## 20. Qué está desalineado

| Capacidad | Estado | Descripción |
|---|---|---|
| Switch "descuento automático on/off" en comprobantes | ❌ NO EXISTE | Solo existe `allowNegativeStock`. El descuento siempre ocurre. |
| Campo `stockDescontado` en comprobante | ❌ NO EXISTE | No hay forma de saber si un comprobante ya generó Kardex |
| Acción "Generar NS" en OV | ❌ NO EXISTE | Falta en menú de OV |
| Acción "Generar NS" en NV | ❌ NO EXISTE | Falta en menú de NV |
| Acción "Generar NS" en Comprobante | ❌ NO EXISTE | Falta en menú de comprobantes |
| `documentoOrigenId` tipado en NS | ❌ NO EXISTE | Solo string libre `documentoOrigen` |
| `notaSalidaRelacionadaId` en OV | ❌ NO EXISTE | OV no sabe si ya generó NS |
| `notaSalidaRelacionadaId` en NV | ❌ NO EXISTE | NV no sabe si ya generó NS |
| `notaSalidaRelacionadaId` en Comprobante | ❌ NO EXISTE | Comprobante no sabe si ya generó NS |
| Anulación encadenada origen → NS | ❌ NO EXISTE | NS solo puede anularse independientemente |
| Validación OV→NS respeta reserva | ❌ NO IMPLEMENTADO | NS validaría contra stock total, no contra reserva |

---

## 21. Archivos que probablemente requerirán cambios

| Archivo | Cambio requerido | Riesgo |
|---|---|---|
| `gestion-inventario/models/notaSalida.types.ts` | Añadir `documentoOrigenId`, `documentoOrigenTipo`, `reservaOVConsumida` | Bajo |
| `gestion-inventario/services/notaSalida.service.ts` | Modo OV: integrar `liberarReservaOrden`, modo Comprobante: verificar `stockDescontado` | Medio |
| `gestion-inventario/hooks/useNotasSalida.ts` | Añadir `generarNSDesdeOV`, `generarNSDesdeNV`, `generarNSDesdeComprobante` | Medio |
| `gestion-inventario/components/notas-salida/FormularioNotaSalida.tsx` | Aceptar `notaInicial` prellenada desde origen | Bajo (ya existe prop) |
| `documentos-comerciales/models/documentoComercial.types.ts` | Añadir `notasSalidaIds`, `estadoDespacho` | Bajo |
| `documentos-comerciales/components/ListadoDocumentosComerciales.tsx` | Añadir "Generar NS" en el menú de OV Reservada | Medio |
| `documentos-comerciales/services/useDocumentoComercialActions.ts` | Actualizar OV tras generar NS | Medio |
| `Documentos-negociacion/models/documento.types.ts` | Tipar `items`, añadir `notaSalidaId`, `almacenId` | Medio-Alto (impacta NV y COT) |
| `Documentos-negociacion/` (UI/hooks) | Añadir "Generar NS" en menú de NV | Medio |
| `comprobantes-electronicos/hooks/useComprobanteActions.tsx` | Añadir `stockDescontadoViaComprobante` al crear comprobante | Medio |
| `comprobantes-electronicos/` (UI) | Añadir "Generar NS" en menú de comprobante (si producto decide el toggle) | Medio |
| `configuracion-sistema/contexto/ContextoConfiguracion.tsx` | Añadir `autoDescuentoStockEnComprobante` (si producto decide) | Alto (afecta config global) |

---

## 22. Archivos que NO deberían tocarse

| Archivo | Razón |
|---|---|
| `gestion-inventario/services/inventory.service.ts` | Motor de stock — estable, no modificar |
| `gestion-inventario/components/notas-ingreso/` | Módulo NI — no tiene relación con Fase 2 |
| `configuracion-sistema/modelos/Series.ts` | Series ya configuradas, NS01 existe |
| `configuracion-sistema/utilidades/catalogoSeries.ts` | Ya actualizado con `STOCK_EXIT` |
| `configuracion-sistema/utilidades/seriesPredeterminadas.ts` | Ya actualizado |
| `documentos-comerciales/services/servicioReservaStock.ts` | Reutilizar `liberarReservaOrden`, no modificar la función |
| `documentos-comerciales/services/convertirOVaComprobante.ts` | No tocar la conversión OV→Comprobante existente |
| `comprobantes-electronicos/models/comprobante.types.ts` | Solo agregar campos opcionales si es necesario — no renombrar existentes |

---

## 23. Recomendación técnica

### Decisión bloqueante previa a Fase 2

**Antes de escribir una sola línea de código de Fase 2, el equipo de producto debe responder:**

> ¿Existe o no un toggle "descuento automático de stock en comprobantes"?

**Opción A — No existe, el comprobante siempre descuenta stock.**

En este caso:
- El flujo OV → Comprobante → NS **nunca debe existir** (el comprobante ya descontó)
- El flujo Comprobante directo → NS **nunca debe existir**
- Fase 2 se simplifica a: solo **OV → NS** y **NV → NS**

**Opción B — Se introduce el toggle.**

En este caso:
- Hay que agregar `autoDescuentoStockEnComprobante: boolean` a `SalesPreferences`
- Hay que agregar `stockDescontadoViaComprobante: boolean` al tipo Comprobante
- Hay que modificar `createComprobante()` para respetar el toggle
- Esto es un cambio de mayor impacto que toda la lógica de NS

**Recomendación del arquitecto: Opción A**. Es más simple, más correcta funcionalmente y evita doble descuento por diseño. El comprobante ya es la salida contable; la NS es la salida física. Si el proceso del negocio es "primero la salida física (NS), luego el comprobante contable", entonces NS siempre va antes del comprobante y nunca después.

---

## 24. Recomendación por fases

### Fase 2A — Fundación de trazabilidad (baja complejidad)

**Objetivo:** Preparar modelos para soportar integración sin agregar lógica todavía.

```
1. Agregar campos opcionales a NotaSalida.types.ts:
   documentoOrigenId, documentoOrigenTipo, reservaOVConsumida

2. Agregar campos opcionales a documentoComercial.types.ts:
   notasSalidaIds, estadoDespacho

3. Agregar almacenId y tipar items en documento.types.ts (NV)

4. Lint + build — 0 errores
```

No hay cambios de lógica. Riesgo: mínimo.

### Fase 2B — OV → NS (alta prioridad, alta viabilidad)

**Objetivo:** Permitir generar NS desde una OV reservada.

```
1. Acción "Generar NS" en menú de OV Reservada
2. Precargar formulario NS con datos de OV (reservasStock)
3. En generarNSDesdeOV:
   a. Validar OV en estado Reservada
   b. Validar que OV no tiene notasSalidaIds aún
   c. Generar NS usando reserva (no stock libre)
   d. Llamar liberarReservaOrden(ovId)
   e. Actualizar OV.notasSalidaIds y OV.estadoDespacho
   f. Actualizar NS.documentoOrigenId = ovId
```

Riesgo: medio. La función `liberarReservaOrden` es el punto de mayor cuidado.

### Fase 2C — NV → NS (media prioridad, requiere refactoring previo)

**Prerequisito:** Tipar `items` en el modelo de NV (`Documento`).

```
1. Tipar items de NV (no es trivial, puede afectar COT)
2. Agregar almacenId por defecto en NV (o selección en formulario NS)
3. Acción "Generar NS" en menú de NV Aprobada/Generada
4. En generarNSDesdeNV:
   a. Validar que NV no tiene notaSalidaId
   b. Generar NS usando items de NV
   c. Actualizar NV.notaSalidaId
```

Riesgo: medio-alto (impacto en tipado de NV y posiblemente COT).

### Fase 2D — Comprobante → NS (baja prioridad, requiere decisión de producto)

**Prerequisito:** Resolver la decisión sobre el toggle de descuento automático (Sección 23).

No iniciar hasta tener respuesta.

### Fase 3 — Anulaciones encadenadas

```
1. Al anular OV que tiene notasSalidaIds → advertir
2. Al anular Comprobante que tiene notaSalidaId → advertir
3. Anulación en cascada con reponer stock
```

Riesgo: alto. Dejar para fase independiente.

---

## 25. Pruebas manuales recomendadas

### Prueba 1 — Confirmar que comprobante siempre descuenta

1. Crear producto con stock 10 en Almacén 1
2. Emitir Factura por 3 unidades
3. Ir a Control de Stock → Movimientos
4. Confirmar que aparece movimiento SALIDA de 3 unidades
5. Confirmar stock = 7

### Prueba 2 — Confirmar que `allowNegativeStock` no desactiva descuento

1. Desactivar `allowNegativeStock` en Configuración
2. Producto con stock 5
3. Intentar emitir Factura por 10 unidades
4. Resultado esperado: error "stock insuficiente"
5. Stock debe seguir en 5

### Prueba 3 — OV reserva y libera

1. Crear OV con 10 unidades de producto A
2. Generar OV → estado Reservada
3. Confirmar `stockReservadoPorAlmacen` del producto tiene 10
4. Anular OV
5. Confirmar `stockReservadoPorAlmacen` volvió a 0

### Prueba 4 — NS no doble genera

1. Generar NS desde almacén con stock
2. Intentar generar la misma NS de nuevo
3. Resultado esperado: error de servicio "ya fue generada"

### Prueba 5 — NS valida stock insuficiente

1. Crear NS con 100 unidades de producto con stock 5
2. Intentar generar NS
3. Resultado esperado: bloqueo con mensaje específico por producto
4. Stock debe permanecer en 5

---

## 26. Conclusión

| Pregunta | Respuesta |
|---|---|
| ¿Qué reglas ya se cumplen? | NS valida stock, descuenta, repone. OV reserva y libera. Series NS01 configuradas. |
| ¿Qué reglas no se cumplen? | No existe toggle descuento automático. No existe acción "Generar NS" en OV/NV/Comprobante. No existe anti-doble descuento. |
| ¿Qué está parcialmente implementado? | Trazabilidad unidireccional OV→Comprobante. Campos de origen en NS como string libre. |
| ¿Qué campos faltan? | `documentoOrigenId` tipado, `notasSalidaIds` en OV/NV, `stockDescontadoViaComprobante` en Comprobante, tipado fuerte de `items` en NV. |
| ¿Qué trazabilidad falta? | Bidireccional en todos los pares. Back-link de NS en documentos origen. |
| ¿Qué módulos habría que tocar? | NS types/service, OV types/UI, NV types/UI, Comprobante (si aplica). |
| ¿Qué módulos NO tocar? | NI, inventory.service, catalogoSeries, convertirOVaComprobante, servicioReservaStock. |
| ¿Riesgo de doble descuento? | **CRÍTICO** si Comprobante → NS se implementa sin verificar si comprobante ya descontó. |
| ¿Riesgo de reserva colgada? | **ALTO** si OV → NS no llama `liberarReservaOrden` transaccionalmente. |
| ¿Riesgo de stock negativo? | **ALTO** si NS desde OV valida contra stock total en lugar de reserva de OV. |
| ¿Qué implementar primero? | Fase 2A (trazabilidad en modelos) + Fase 2B (OV→NS). Son los de mayor valor y menor riesgo. |
| ¿Qué dejar para después? | Comprobante→NS (decisión de producto pendiente). Anulación encadenada (Fase 3). |

---

## Tabla de cumplimiento

| Escenario | Datos disponibles | Acción existe | Valida stock | Evita doble descuento | Maneja reserva | Trazabilidad | Estado |
|---|---|---|---|---|---|---|---|
| NV → NS | Parcial (`items` no tipado, sin almacénId) | No | Sí (NS lo hace) | No | No aplica | No | **Desalineado** |
| OV → NS | Sí (`reservasStock` completo) | No | Sí (NS lo hace, pero validación incorrecta para reserva) | No | No (falta liberar reserva) | Parcial (unidireccional) | **Parcial** |
| Comprobante → NS | Parcial (sin `stockDescontado`) | No | Sí (NS lo hace) | No (sin campo `stockDescontado`) | No aplica | Parcial | **Desalineado** |
| OV → Comprobante → NS | Parcial (sin toggle de descuento automático) | No | Sí | No | No | Parcial | **Desalineado** |
| Anulación origen con NS | Parcial (NS anula sola, sin link bidireccional) | No (sin cascada) | No aplica | No | No | No | **Desalineado** |

---

*Auditoría generada el 2026-06-07 — Sólo lectura, sin cambios de código.*
