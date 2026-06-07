# Auditoría para implementación de Nota de Salida

**Fecha:** 2026-06-07  
**Módulo objetivo:** Nota de Salida — Control de Stock  
**Referencia arquitectural:** Nota de Ingreso (módulo estable)  
**Alcance:** Solo auditoría. Sin cambios de código.

---

## 1. Resumen ejecutivo

El módulo **Nota de Ingreso** está completamente estable y funcional. Su arquitectura es limpia, bien separada en capas (componentes / hook / servicio / repositorio / modelos) y se puede usar como referencia directa para construir **Nota de Salida** sin copiarla.

La Nota de Salida es funcionalmente simétrica a la Nota de Ingreso: donde NI **suma** stock, NS **resta** stock. Ambas producen movimientos en el Kardex, ambas tienen el ciclo Borrador → Generada → Anulada, y ambas viven como tabs dentro de `InventoryPage`.

**La viabilidad técnica es alta.** El módulo puede construirse siguiendo exactamente el mismo patrón de 9 archivos que NI, con cambios semánticos bien localizados. El riesgo de romper NI es bajo si se respeta la separación de archivos.

**Veredicto:** Conviene construir Nota de Salida ahora. La estructura de NI es la plantilla perfecta. No hay deuda técnica bloqueante. Se requieren exactamente **9 archivos nuevos** y **2 modificaciones menores** a archivos existentes.

---

## 2. Estado actual de Nota de Ingreso

### Ubicación del módulo

```
apps/senciyo/src/pages/Private/features/gestion-inventario/
```

### Arquitectura por capas

| Capa | Archivos NI | Patrón |
|------|-------------|--------|
| Componentes UI | 3 archivos | Panel + Formulario + Detalle |
| Hook de orquestación | 1 archivo | useNotasIngreso.ts |
| Servicio de negocio | 1 archivo | notaIngreso.service.ts |
| Servicio de impresión | 1 archivo | notaIngreso.print.ts |
| Repositorio | 1 archivo | notaIngreso.repository.ts |
| Modelos / Tipos | 1 archivo | notaIngreso.types.ts |
| Constantes / Catálogos | 1 archivo | notaIngreso.constants.ts |
| **Total** | **9 archivos** | |

### Montaje en InventoryPage

Nota de Ingreso vive como tab número 7 dentro de `InventoryPage.tsx`.  
El tab usa `selectedView === 'notas-ingreso'` como valor discriminante.  
El componente raíz `<NotasIngresoPanel />` se monta sin props.  
La barra de toolbar superior se oculta para este tab (línea 288 de InventoryPage).

### Estado de persistencia

- Toda la persistencia es **localStorage** con clave tenantizada `notas_ingreso_v1`.
- Sincronización entre pestañas con el evento `facturafacil:notas-ingreso-changed`.
- Sin backend API. Sin Zustand. Solo React state + localStorage.

### Funcionalidades implementadas

| Funcionalidad | Estado |
|---------------|--------|
| Listado con búsqueda | ✅ Completo |
| Filtros avanzados (estado, fecha, tipo, proveedor, almacén) | ✅ Completo |
| Paginación (15 items/página) | ✅ Completo |
| Exportación Excel (13 columnas) | ✅ Completo |
| Formulario nueva nota | ✅ Completo |
| Guardar borrador | ✅ Completo |
| Generar nota (descuenta stock) | ✅ Completo |
| Anular nota (revierte stock) | ✅ Completo |
| Duplicar nota | ✅ Completo |
| Eliminar borrador | ✅ Completo |
| Panel lateral de detalle | ✅ Completo |
| Historial de eventos | ✅ Completo |
| Impresión PDF (window.open) | ✅ Completo |
| Selector de proveedor (SUNAT/RENIEC) | ✅ Completo |
| Multi-almacén destino | ✅ Completo |
| Selector de productos | ✅ Completo |
| Cálculo tributario por tasa | ✅ Completo |
| Integración Kardex | ✅ Completo |

---

## 3. Archivos identificados de Nota de Ingreso

### `components/notas-ingreso/NotasIngresoPanel.tsx`
- **Responsabilidad:** Panel principal. Contiene el listado de notas, búsqueda, filtros avanzados, paginación, exportación Excel y gestión de vistas (Lista / Nueva / Editar).
- **Líneas:** ~554
- **Específico de NI:** Sí. Textos, columnas Excel, acciones, labels.
- **Reutilizable para NS:** No directamente. El patrón (estructura de vistas + lista + filtros) sí es reutilizable como referencia.
- **Riesgo de modificar:** Medio. Cualquier cambio podría romper NI.
- **Recomendación:** No modificar. Crear `NotasSalidaPanel.tsx` espejado.

### `components/notas-ingreso/FormularioNotaIngreso.tsx`
- **Responsabilidad:** Formulario completo de creación/edición de Nota de Ingreso. Incluye: selector de proveedor, lookup SUNAT/RENIEC, selector multi-almacén destino, tabla de productos, cálculo tributario, botones guardar/generar.
- **Líneas:** ~1158
- **Específico de NI:** Sí. Usa `tipoIngreso`, `proveedorId`, `almacenDestino`, lookup proveedor.
- **Reutilizable para NS:** No directamente. La estructura visual sí es reutilizable como plantilla. NS usa cliente en lugar de proveedor, `tipoSalida`, `almacenOrigen`.
- **Riesgo de modificar:** Alto. Es el formulario más complejo del módulo.
- **Recomendación:** No modificar. Crear `FormularioNotaSalida.tsx` siguiendo la misma estructura.

### `components/notas-ingreso/DetalleNotaIngreso.tsx`
- **Responsabilidad:** Panel lateral (drawer) con detalle completo de una NI. Tabs: General (datos, productos, anulación) e Historial (timeline). Acciones: imprimir, duplicar, anular.
- **Líneas:** ~496
- **Específico de NI:** Sí. Tipos, textos, campos del panel.
- **Reutilizable para NS:** No directamente. El patrón de 2 tabs (General / Historial) con acciones superiores sí es reutilizable como referencia.
- **Riesgo de modificar:** Medio.
- **Recomendación:** No modificar. Crear `DetalleNotaSalida.tsx` con el mismo patrón.

### `hooks/useNotasIngreso.ts`
- **Responsabilidad:** Hook React de orquestación. Carga notas desde localStorage, expone funciones `guardarBorrador`, `generarNI`, `anularNI`, `eliminarNI`. Gestiona feedback al usuario. Sincroniza entre pestañas.
- **Líneas:** ~189
- **Específico de NI:** Sí. Clave de storage, eventos, nombres de funciones, lógica específica de NI.
- **Reutilizable para NS:** No directamente. El patrón de hook es reutilizable como plantilla.
- **Riesgo de modificar:** Alto. Cambiar este hook rompe NI.
- **Recomendación:** No modificar. Crear `useNotasSalida.ts` análogo.

### `services/notaIngreso.service.ts`
- **Responsabilidad:** Lógica de negocio de NI. Funciones: `generarNIEnInventario`, `anularNIEnInventario`, `generarCorrelativoNI`, `mapTipoIngresoAMotivo`, `resolveIgvRate`, `calcularDesgloseTributario`, `prepararDuplicado`.
- **Líneas:** ~299
- **Específico de NI:** Sí. La función `generarNIEnInventario` usa `ENTRADA` para stock. La función `anularNIEnInventario` valida `EstadoNotaIngreso === 'Generada'`. El mapeo `mapTipoIngresoAMotivo` es específico de tipos de ingreso.
- **Reutilizable para NS:** Las funciones `resolveIgvRate`, `calcularDesgloseTributario` y `prepararDuplicado` son candidatas a extracción compartida. El resto es propio de NI.
- **Riesgo de modificar:** Muy alto. Contiene la lógica de stock de NI.
- **Recomendación:** No modificar. Crear `notaSalida.service.ts` con lógica simétrica (SALIDA en lugar de ENTRADA).

### `services/notaIngreso.print.ts`
- **Responsabilidad:** Generación de impresión HTML para NI. Función `imprimirNotaIngreso`. Abre `window.open` con HTML estructurado.
- **Líneas:** ~194
- **Específico de NI:** Sí. Textos, labels, estructura del documento.
- **Reutilizable para NS:** El patrón (window.open + HTML) es reutilizable. Los contenidos no.
- **Riesgo de modificar:** Bajo (solo afecta impresión de NI).
- **Recomendación:** No modificar. Crear `notaSalida.print.ts` con la misma estructura.

### `repositories/notaIngreso.repository.ts`
- **Responsabilidad:** Acceso a localStorage. Funciones: `cargarNotasIngreso`, `guardarNotasIngreso`, `agregarOActualizarNI`. Dispara evento `facturafacil:notas-ingreso-changed`.
- **Líneas:** ~45
- **Específico de NI:** Sí. Clave `notas_ingreso_v1`, nombre del evento.
- **Reutilizable para NS:** El patrón es idéntico para NS pero con clave y evento propios.
- **Riesgo de modificar:** Medio.
- **Recomendación:** No modificar. Crear `notaSalida.repository.ts` análogo con clave `notas_salida_v1` y evento `facturafacil:notas-salida-changed`.

### `models/notaIngreso.types.ts`
- **Responsabilidad:** Tipos TypeScript: `EstadoNotaIngreso`, `TipoIngreso`, `LineaNotaIngreso`, `NotaIngreso`, `EventoHistorialNI`.
- **Líneas:** ~105
- **Específico de NI:** Sí. El tipo `tipoDocumento: 'nota_ingreso'`, los campos `almacenDestino*`, `proveedor*`, `tipoIngreso`.
- **Reutilizable para NS:** `EventoHistorialNI` podría compartirse o usarse como referencia. El resto debe ser propio de NS.
- **Riesgo de modificar:** Alto. Cambiar tipos de NI puede propagar errores de TS.
- **Recomendación:** No modificar. Crear `notaSalida.types.ts` con tipos propios de NS.

### `models/notaIngreso.constants.ts`
- **Responsabilidad:** Catálogos: `TIPOS_INGRESO` (14 tipos), `TIPOS_INGRESO_CON_PROVEEDOR`, `FORMAS_PAGO_NI`, `ESTADO_NI_BADGE`, `STORAGE_KEY_NOTAS_INGRESO`, `CORRELATIVO_DIGITOS_NI`.
- **Líneas:** ~75
- **Específico de NI:** Sí. Los tipos de ingreso son propios de NI. Los badges también.
- **Reutilizable para NS:** `FORMAS_PAGO_NI` podría replicarse o extraerse si se generaliza. El resto debe ser propio de NS.
- **Riesgo de modificar:** Medio (solo afecta NI).
- **Recomendación:** No modificar. Crear `notaSalida.constants.ts` con los 38 tipos de salida y sus propios catálogos.

### `models/inventory.types.ts` ← archivo compartido, modificar solo lo indicado
- **Responsabilidad:** Tipos globales del módulo de inventario: `MovimientoTipo`, `MovimientoMotivo`, `MovimientoStock`, `InventoryView`, `StockAdjustmentData`, etc.
- **Líneas:** ~190
- **Específico de NI:** No. Es compartido por todo el módulo de inventario.
- **Relevante para NS:** La línea 145 define `InventoryView` y actualmente incluye `'notas-ingreso'`. Para NS se debe agregar `'notas-salida'` a este union type.
- **Riesgo de modificar:** Bajo si solo se agrega un valor al union type.
- **Recomendación:** Modificar solo para agregar `'notas-salida'` a `InventoryView`. Sin cambios en `MovimientoTipo` ni `MovimientoMotivo`.

### `pages/InventoryPage.tsx` ← archivo compartido, modificar solo lo indicado
- **Responsabilidad:** Página contenedora de todos los tabs del módulo de inventario. Actualmente tiene 7 tabs: Stock Actual, Movimientos, Transferencias, Alertas, Importar stock, Notas de Ingreso.
- **Líneas:** ~418
- **Específico de NI:** No. El tab de NI es una sección dentro de este archivo.
- **Relevante para NS:** Se debe agregar el tab "Notas de Salida" y su sección de contenido renderizando `<NotasSalidaPanel />`.
- **Riesgo de modificar:** Bajo si solo se añade el nuevo tab y la condición de renderizado. No modificar el tab de NI.
- **Recomendación:** Modificar para agregar tab de NS cuando se implemente.

---

## 4. Componentes reutilizables

### A. Reutilizables directamente (sin cambios)

Estos elementos no necesitan extracción ni modificación para ser usados por NS:

| Elemento | Ubicación | Motivo |
|----------|-----------|--------|
| `inventory.service.ts` — `registerAdjustment()` | `services/inventory.service.ts` | NS llama a este servicio para registrar movimiento tipo `SALIDA` en Kardex, exactamente igual que NI con `ENTRADA`. |
| `inventory.service.ts` — `recalcularTotalesStock()` | `services/inventory.service.ts` | Recalcula stock total del producto tras el movimiento. Neutral a dirección. |
| `inventory.types.ts` — `MovimientoTipo` | `models/inventory.types.ts` | Ya incluye `'SALIDA'` y `'AJUSTE_POSITIVO'` (para revertir al anular). |
| `inventory.types.ts` — `MovimientoMotivo` | `models/inventory.types.ts` | Todos los motivos necesarios existen: `VENTA`, `DEVOLUCION_PROVEEDOR`, `MERMA`, `PRODUCCION`, `TRANSFERENCIA_ALMACEN`, `AJUSTE_INVENTARIO`, `OTRO`. |
| `inventory.types.ts` — `StockAdjustmentData` | `models/inventory.types.ts` | El DTO de ajuste es genérico y sirve para NS. |
| Patrón de evento `facturafacil:*-changed` | `repositories/notaIngreso.repository.ts` | Solo el nombre del evento cambia. El patrón es idéntico. |
| `useClientes()` hook externo | Compartido | NS usará este hook para buscar clientes, al igual que NI lo usa para buscar proveedores. |
| `useConfigurationContext()` | Compartido | NS necesita series de tipo `NS`, almacenes, establecimiento. Mismo hook. |
| `useProductStore()` | Compartido | NS necesita el catálogo de productos. Mismo store. |
| `useFeedback()` | Compartido | Notificaciones UI. Igual para NS. |
| `useTenant()` | Compartido | Establecimiento activo. Igual para NS. |

### B. Reutilizables con extracción mínima (candidatos a compartir)

Estos elementos podrían extraerse a archivos compartidos, pero **solo si** el beneficio supera el riesgo. Por ahora se recomienda que NS los re-implemente con ligeras variaciones para no tocar NI.

| Elemento | Justificación para extracción | Riesgo si se extrae ahora |
|----------|-------------------------------|---------------------------|
| `resolveIgvRate()` | Función pura que parsea la tasa de IGV de un string. Sin estado. Idéntica para NS. | Bajo. Pero requiere mover el archivo, actualizar imports en NI. Solo vale si hay más módulos que la usen. |
| `calcularDesgloseTributario()` | Agrupa líneas por tasa de IGV. Genérico si se parametriza el tipo de línea. | Medio. Requiere ajustar el tipo de línea para que sea genérico. |
| `prepararDuplicado()` | Crea copia de cualquier documento de inventario con estado Borrador, IDs nuevos, historial vacío. | Bajo. Pero el tipo de retorno es específico de NI. Habría que generalizarlo con genéricos TypeScript. |
| `FORMAS_PAGO_NI` | NS puede usar las mismas formas de pago. | Muy bajo. Se puede copiar el array literalmente sin riesgo. Extracción real no es urgente. |
| `ESTADO_*_BADGE` pattern | El patrón de badge por estado es idéntico en concepto (Borrador/Generada/Anulada). | Bajo. Pero los colores y textos exactos se pueden repetir. Extracción solo si hay un tercer módulo. |
| `EventoHistorialNI` interface | El historial es idéntico para NS: fecha, usuario, acción, detalle. | Bajo. Pero renombrarlo implica tocar NI. Mejor duplicar la interfaz como `EventoHistorialNS`. |

**Recomendación:** No extraer todavía. NI está estable. Duplicar con buen nombre es más seguro que extraer y arriesgarse a romper NI. Si en el futuro aparece un tercer módulo (ej. Nota de Transferencia), ahí sí conviene crear un archivo `inventarioDocumentos.shared.ts`.

### C. No reutilizables / específicos de NI

Estos elementos NO deben reutilizarse directamente para NS. Su lógica es semánticamente opuesta o específica:

| Elemento | Por qué NO reutilizar |
|----------|----------------------|
| `generarNIEnInventario()` | Registra `ENTRADA` en Kardex. NS debe registrar `SALIDA`. Lógica inversa. |
| `anularNIEnInventario()` | Revierte con `AJUSTE_NEGATIVO`. NS debe revertir con `AJUSTE_POSITIVO`. |
| `mapTipoIngresoAMotivo()` | Mapea 14 tipos de ingreso. NS tiene 38 tipos de salida con motivos distintos. |
| `generarCorrelativoNI()` | Usa la serie de NI y el prefijo de NI. NS tiene su propia serie y prefijo. |
| `TIPOS_INGRESO` catálogo | 14 tipos de entrada. NS tiene 38 tipos de salida completamente distintos. |
| `TIPOS_INGRESO_CON_PROVEEDOR` | Lógica específica de si el tipo de ingreso requiere proveedor. NS equivalente sería `TIPOS_SALIDA_CON_CLIENTE`. |
| `STORAGE_KEY_NOTAS_INGRESO` | Clave de localStorage de NI. NS debe tener su propia clave. |
| `NotaIngreso` interface | Tiene `almacenDestino*`, `proveedor*`, `tipoIngreso`, `fechaIngresoAlmacen`. NS tiene `almacenOrigen*`, `cliente*`, `tipoSalida`, `fechaEntregaPrevista`. |
| Textos del formulario NI | "Proveedor", "Almacén destino", "Fecha ingreso almacén", etc. NS tiene terminología de salida. |
| Textos del PDF de NI | Encabezado "NOTA DE INGRESO". NS tiene "NOTA DE SALIDA". |

---

## 5. Componentes y lógica específica que NO debe reutilizarse directamente

### Lógica de negocio que debe ser propia de NS

```
generarNSEnInventario()   ← simétrico a generarNIEnInventario pero SALIDA
anularNSEnInventario()    ← simétrico a anularNIEnInventario pero AJUSTE_POSITIVO
mapTipoSalidaAMotivo()    ← mapa propio de los 38 tipos de salida
generarCorrelativoNS()    ← correlativo propio de serie NS
```

### Tipos que deben ser propios de NS

```typescript
type TipoSalida = '01' | '04' | '06' | '07' | ... (38 valores)
type EstadoNotaSalida = 'Borrador' | 'Generada' | 'Entregada' | 'Anulada'
interface LineaNotaSalida { ... }
interface NotaSalida { 
  tipoDocumento: 'nota_salida'
  almacenOrigenId: string
  clienteId?: string | number
  tipoSalida: TipoSalida
  fechaEntregaPrevista?: string
  ... 
}
```

### Constantes que deben ser propias de NS

```
TIPOS_SALIDA[]                   ← 38 entradas
TIPO_SALIDA_LABEL                ← Record<TipoSalida, string>
TIPOS_SALIDA_CON_CLIENTE[]       ← tipos que requieren cliente (ej: VENTA, CONSIGNACIÓN)
STORAGE_KEY_NOTAS_SALIDA         ← 'notas_salida_v1'
CORRELATIVO_DIGITOS_NS           ← 8 (igual que NI)
ESTADO_NS_BADGE                  ← incluye estado 'Entregada' además de Borrador/Generada/Anulada
```

---

## 6. Reglas funcionales propuestas para Nota de Salida

### Ciclo de estados

```
Borrador
  → Generada    (al generar: descuenta stock, genera Kardex SALIDA)
    → Entregada (estado logístico: mercancía entregada físicamente)
    → Anulada   (revierte stock con AJUSTE_POSITIVO, solo desde Generada)
```

### Reglas por estado

**Borrador:**
- No descuenta stock.
- Editable libremente.
- Se puede eliminar.
- Puede duplicarse.

**Generada:**
- **Descuenta stock real** en el almacén de origen por cada línea marcada como `bien`.
- Genera movimiento Kardex tipo `SALIDA` con motivo mapeado del `tipoSalida`.
- Ya no se edita libremente. Solo se puede anular o marcar como entregada.
- Se puede imprimir/descargar PDF.
- Se puede duplicar (genera nuevo borrador).

**Entregada:**
- Estado operativo/logístico: la mercancía salió físicamente.
- **No vuelve a descontar stock** (ya fue descontado en la generación).
- **No genera nuevo movimiento Kardex.**
- No se edita.
- Puede imprimirse.
- Puede duplicarse.

**Anulada:**
- Solo desde estado `Generada` (no desde `Entregada` sin revisión especial).
- **Revierte el stock**: por cada línea de bien, registra `AJUSTE_POSITIVO` en el almacén de origen.
- Requiere motivo de anulación.
- Se registra en historial con fecha, usuario y motivo.
- No puede pasarse a otro estado.

### Validación de stock antes de generar

```
POR CADA LÍNEA de tipo 'bien':
  stockActual[almacenOrigenId] >= cantidad
  → si no hay stock suficiente: bloquear generación, mostrar error por producto/almacén
```

Esta validación es crítica para NS. No existe en NI porque NI siempre suma stock.

---

## 7. Campos requeridos para Nota de Salida

### Cabecera

| Campo | Tipo | Obligatorio | Observación |
|-------|------|-------------|-------------|
| `tipoDocumento` | `'nota_salida'` | Sí | Literal discriminante |
| `serie` | `string` | Sí | Serie de tipo `NS` desde configuración |
| `correlativo` | `string?` | No | Asignado al generar |
| `numero` | `string?` | No | `SERIE-CORRELATIVO` |
| `estado` | `EstadoNotaSalida` | Sí | Borrador por defecto |
| `esBorrador` | `boolean` | Sí | |
| `fechaDocumento` | `string` (ISO) | Sí | Defecto: hoy |
| `fechaEntregaPrevista` | `string?` | No | Fecha de envío previsto |
| `tipoSalida` | `TipoSalida` | Sí | Del catálogo de 38 tipos |
| `almacenOrigenId` | `string` | Sí | Almacén desde donde sale el stock |
| `almacenOrigenNombre` | `string` | Sí | |
| `almacenOrigenCodigo` | `string` | Sí | |
| `encargadoAlmacen` | `string?` | No | Auto-completado con usuario actual |
| `encargadoAlmacenId` | `string?` | No | |
| `clienteId` | `string \| number?` | Condicional | Requerido según `tipoSalida` |
| `clienteNombre` | `string?` | Condicional | |
| `tipoDocumentoCliente` | `string?` | No | RUC/DNI |
| `numeroDocumentoCliente` | `string?` | No | |
| `impuestoSelva` | `boolean?` | No | Campo observado en sistema anterior |
| `direccionFacturacion` | `string?` | No | |
| `direccionEnvio` | `string?` | No | |
| `contacto` | `string?` | No | |
| `cargo` | `string?` | No | |
| `moneda` | `'PEN' \| 'USD'` | Sí | Defecto: PEN |
| `metodoPago` | `string?` | No | |
| `metodoEnvio` | `string?` | No | |
| `documentoOrigen` | `string?` | No | Tipo de documento origen (OV, NV, etc.) |
| `numeroDocumentoOrigen` | `string?` | No | |
| `lineas` | `LineaNotaSalida[]` | Sí | |
| `baseImponible` | `number` | Sí | |
| `impuesto` | `number` | Sí | |
| `total` | `number` | Sí | |
| `observaciones` | `string?` | No | |
| `esFacuturado` | `boolean?` | No | Estado de facturación (de sistema anterior) |
| `origen` | `string?` | No | Origen del documento (manual, OV, NV, etc.) |

### Línea de detalle (`LineaNotaSalida`)

| Campo | Tipo | Obligatorio | Observación |
|-------|------|-------------|-------------|
| `id` | `string` | Sí | UUID |
| `productoId` | `string` | Sí | |
| `productoCodigo` | `string` | Sí | |
| `productoNombre` | `string` | Sí | |
| `tipoBienServicio` | `'bien' \| 'servicio'` | Sí | Solo bienes afectan stock |
| `unidad` | `string` | Sí | |
| `unidadCodigo` | `string` | Sí | |
| `impuesto` | `string?` | No | Tasa IGV o exonerado/inafecto |
| `almacenId` | `string?` | No | Si difiere del almacén cabecera |
| `almacenNombre` | `string?` | No | |
| `cantidad` | `number` | Sí | > 0 |
| `pvUnitario` | `number` | Sí | Precio de venta unitario |
| `subtotal` | `number` | Sí | cantidad × pvUnitario |
| `igv` | `number` | Sí | subtotal × tasa IGV |
| `total` | `number` | Sí | subtotal + igv |

---

## 8. Estados propuestos

### Estados del documento

```typescript
type EstadoNotaSalida = 'Borrador' | 'Generada' | 'Entregada' | 'Anulada';
```

NS tiene **4 estados** vs los 3 de NI. El estado `Entregada` es nuevo y representa la confirmación logística de la salida física de mercancía.

### Badges propuestos

| Estado | Color sugerido |
|--------|----------------|
| Borrador | Gris (igual que NI) |
| Generada | Verde (igual que NI) |
| Entregada | Azul |
| Anulada | Rojo (igual que NI) |

### Transiciones válidas

```
Borrador  →  Generada   (al generar)
Generada  →  Entregada  (confirmación de entrega)
Generada  →  Anulada    (anulación con motivo)
```

Las transiciones `Entregada → Anulada` y `Anulada → cualquier estado` no deben permitirse sin proceso especial.

---

## 9. Relación con documentos origen

La Nota de Salida puede generarse de cuatro formas. En esta auditoría se documenta el patrón para implementación futura.

### Casos de origen

| Origen | Descripción | Fase |
|--------|-------------|------|
| Manual / Independiente | NS creada directamente, sin documento origen | Fase 1 |
| Desde Orden de Venta | NS generada automáticamente a partir de OV | Fase 2 |
| Desde Nota de Venta | NS generada a partir de NV aprobada | Fase 2 |
| Desde Comprobante | NS generada a partir de factura/boleta | Fase 3 (con restricción) |

### Archivos a revisar en fases futuras

Para la integración con documentos origen, los módulos a auditar son:

- `features/documentos-comerciales/` — Órdenes de Venta y Notas de Venta
- `features/comprobantes/` — Facturas y boletas
- `gestion-inventario/services/inventory.service.ts` — Configuración de descuento automático de stock
- `gestion-inventario/stores/` — Estado global del módulo de inventario
- Configuración de negocio: si el comprobante descuenta stock automáticamente

### Regla crítica de doble descuento

> **Desde un Comprobante solo puede generarse una Nota de Salida si ese comprobante NO descontó stock automáticamente.** Si el comprobante ya descontó stock por configuración de negocio, el sistema debe bloquear la generación de NS desde ese comprobante para evitar doble descuento.

Esta regla **no debe implementarse en Fase 1**. Solo debe documentarse aquí para que la arquitectura de NS desde el inicio incluya el campo `origen` y `documentoOrigenId` que permitan validarla en fases posteriores.

---

## 10. Catálogo de tipos de salida

### Estado actual

**No existe** un catálogo de tipos de salida en el codebase. El archivo `notaIngreso.constants.ts` solo contiene tipos de ingreso.

### Donde debe vivir

El catálogo de tipos de salida debe vivir en:

```
apps/senciyo/src/pages/Private/features/gestion-inventario/models/notaSalida.constants.ts
```

**No debe ir** en un archivo compartido con NI. Cada módulo tiene su propio catálogo.

### Naturaleza del catálogo

Este catálogo es una **constante local** basada en la tabla 13 de la normativa de Libros Electrónicos SUNAT (catálogo de motivos de salida). No es editable por el usuario. No es un catálogo configurable. Es un array de `{ codigo: string; descripcion: string }` igual al patrón de `TIPOS_INGRESO`.

### Tipos de salida propuestos

```typescript
export type TipoSalida =
  | '01' | '04' | '06' | '07' | '08' | '09' | '10' | '11'
  | '12' | '13' | '14' | '15' | '17' | '23' | '25' | '27'
  | '28' | '30' | '32' | '33' | '34' | '35' | '36' | '37'
  | '38';

export const TIPOS_SALIDA = [
  { codigo: '01', descripcion: 'Venta nacional' },
  { codigo: '04', descripcion: 'Consignación entregada' },
  { codigo: '06', descripcion: 'Devolución entregada' },
  { codigo: '07', descripcion: 'Bonificación' },
  { codigo: '08', descripcion: 'Premio' },
  { codigo: '09', descripcion: 'Donación' },
  { codigo: '10', descripcion: 'Salida a producción' },
  { codigo: '11', descripcion: 'Salida por transferencia entre almacenes' },
  { codigo: '12', descripcion: 'Retiro' },
  { codigo: '13', descripcion: 'Mermas' },
  { codigo: '14', descripcion: 'Desmedros' },
  { codigo: '15', descripcion: 'Destrucción' },
  { codigo: '17', descripcion: 'Exportación' },
  { codigo: '23', descripcion: 'Salida por identificación errónea' },
  { codigo: '25', descripcion: 'Salida por devolución al proveedor' },
  { codigo: '27', descripcion: 'Salida por servicio de producción' },
  { codigo: '28', descripcion: 'Ajuste por diferencia de inventario' },
  { codigo: '30', descripcion: 'Salida de bienes en préstamo' },
  { codigo: '32', descripcion: 'Salida de bienes en custodia' },
  { codigo: '33', descripcion: 'Muestras médicas' },
  { codigo: '34', descripcion: 'Publicidad' },
  { codigo: '35', descripcion: 'Gastos de representación' },
  { codigo: '36', descripcion: 'Retiro para entrega a trabajadores' },
  { codigo: '37', descripcion: 'Retiro por convenio colectivo' },
  { codigo: '38', descripcion: 'Retiro por sustitución de bien siniestrado' },
];
```

### Tipos de salida que requieren cliente

Los siguientes tipos de salida deben requerir cliente identificado (equivalente a `TIPOS_INGRESO_CON_PROVEEDOR`):

```typescript
export const TIPOS_SALIDA_CON_CLIENTE: TipoSalida[] = [
  '01', // Venta nacional
  '04', // Consignación entregada
  '06', // Devolución entregada
  '09', // Donación
  '30', // Bienes en préstamo
  '32', // Bienes en custodia
  '33', // Muestras médicas
];
```

### Mapeo TipoSalida → MovimientoMotivo (Kardex)

```typescript
// Propuesta de mapeo para notaSalida.service.ts
function mapTipoSalidaAMotivo(tipo: TipoSalida): MovimientoMotivo {
  const mapa: Record<TipoSalida, MovimientoMotivo> = {
    '01': 'VENTA',                    // Venta nacional
    '04': 'OTRO',                     // Consignación entregada
    '06': 'DEVOLUCION_PROVEEDOR',     // Devolución entregada
    '07': 'VENTA',                    // Bonificación
    '08': 'OTRO',                     // Premio
    '09': 'OTRO',                     // Donación
    '10': 'PRODUCCION',               // Salida a producción
    '11': 'TRANSFERENCIA_ALMACEN',    // Transferencia entre almacenes
    '12': 'OTRO',                     // Retiro
    '13': 'MERMA',                    // Mermas
    '14': 'MERMA',                    // Desmedros
    '15': 'PRODUCTO_DAÑADO',          // Destrucción
    '17': 'VENTA',                    // Exportación
    '23': 'AJUSTE_INVENTARIO',        // Identificación errónea
    '25': 'DEVOLUCION_PROVEEDOR',     // Devolución al proveedor
    '27': 'PRODUCCION',               // Servicio de producción
    '28': 'AJUSTE_INVENTARIO',        // Ajuste por diferencia de inventario
    '30': 'OTRO',                     // Bienes en préstamo
    '32': 'OTRO',                     // Bienes en custodia
    '33': 'OTRO',                     // Muestras médicas
    '34': 'OTRO',                     // Publicidad
    '35': 'OTRO',                     // Gastos de representación
    '36': 'OTRO',                     // Entrega a trabajadores
    '37': 'OTRO',                     // Convenio colectivo
    '38': 'OTRO',                     // Sustitución siniestro
  };
  return mapa[tipo] ?? 'OTRO';
}
```

---

## 11. Impacto esperado en stock / Kardex

### Al generar Nota de Salida

```
POR CADA LÍNEA cuyo tipoBienServicio === 'bien':
  1. Obtener stockActual del almacenOrigenId del producto
  2. Validar: stockActual >= cantidad  → si no, BLOQUEAR
  3. nuevoStock = stockActual - cantidad
  4. Llamar inventory.service.registerAdjustment({
       productoId,
       almacenId: almacenOrigenId,
       tipo: 'SALIDA',
       motivo: mapTipoSalidaAMotivo(tipoSalida),
       cantidad,
       observaciones: `NS ${serie}-${numero} - ${observaciones}`,
       documentoReferencia: `NS-${serie}-${correlativo}`,
     })
  5. Llamar inventory.service.recalcularTotalesStock(productoId)
  6. Actualizar producto en store
```

### Al anular Nota de Salida

```
POR CADA LÍNEA cuyo tipoBienServicio === 'bien':
  1. Obtener stockActual del almacenOrigenId del producto
  2. nuevoStock = stockActual + cantidad  (reposición)
  3. Llamar inventory.service.registerAdjustment({
       productoId,
       almacenId: almacenOrigenId,
       tipo: 'AJUSTE_POSITIVO',
       motivo: mapTipoSalidaAMotivo(tipoSalida),
       cantidad,
       observaciones: `ANULACIÓN NS ${serie}-${numero} - ${motivoAnulacion}`,
       documentoReferencia: `NS-${serie}-${correlativo}`,
     })
  4. Recalcular totales
  5. Actualizar producto en store
```

### Diferencias críticas respecto a NI

| Aspecto | Nota de Ingreso | Nota de Salida |
|---------|----------------|----------------|
| Tipo de movimiento al generar | `ENTRADA` | `SALIDA` |
| Tipo de movimiento al anular | `AJUSTE_NEGATIVO` | `AJUSTE_POSITIVO` |
| Validación de stock al generar | No aplica (siempre suma) | **Obligatoria** (puede no haber stock) |
| Validación de stock al anular | Verifica que haya stock para restar | No aplica (siempre suma al revertir) |
| Campo de almacén en cabecera | `almacenDestinoId` | `almacenOrigenId` |

---

## 12. Propuesta de arquitectura mínima

La arquitectura propuesta espeja exactamente la de NI. Una carpeta nueva bajo `components/`, un hook, un service, un repository, dos archivos de modelos. Sin abstracciones extra.

### Árbol de archivos nuevo

```
apps/senciyo/src/pages/Private/features/gestion-inventario/
├── components/
│   └── notas-salida/                        ← nueva carpeta
│       ├── NotasSalidaPanel.tsx              ← nuevo
│       ├── FormularioNotaSalida.tsx          ← nuevo
│       └── DetalleNotaSalida.tsx             ← nuevo
├── hooks/
│   └── useNotasSalida.ts                    ← nuevo
├── models/
│   ├── notaSalida.types.ts                  ← nuevo
│   └── notaSalida.constants.ts              ← nuevo
├── repositories/
│   └── notaSalida.repository.ts             ← nuevo
└── services/
    ├── notaSalida.service.ts                ← nuevo
    └── notaSalida.print.ts                  ← nuevo
```

### Archivos existentes a modificar (solo 2)

```
models/inventory.types.ts        ← agregar 'notas-salida' a InventoryView
pages/InventoryPage.tsx           ← agregar tab + renderizado NotasSalidaPanel
```

### Principios de la arquitectura

1. **Cero acoplamiento entre NI y NS.** Cada módulo tiene sus propios tipos, constantes, servicio, repositorio y hook. No se importan entre sí.
2. **Ambos consumen el mismo `inventory.service.ts`** para la capa de stock/Kardex. Ese archivo no se modifica.
3. **Ambos conviven en `InventoryPage.tsx`** como tabs independientes. El estado `selectedView` discrimina cuál se muestra.
4. **Persistencia independiente.** NI usa `notas_ingreso_v1`, NS usa `notas_salida_v1`. Sin riesgo de colisión.
5. **El hook `useNotasSalida`** sigue el mismo contrato que `useNotasIngreso`: expone funciones `guardarBorrador`, `generarNS`, `anularNS`, `eliminarNS`, `cambiarAEntregada`.

---

## 13. Archivos nuevos recomendados

| Archivo | Responsabilidad | Líneas estimadas |
|---------|----------------|-----------------|
| `components/notas-salida/NotasSalidaPanel.tsx` | Panel principal: listado, búsqueda, filtros, paginación, exportación Excel, gestión de vistas | ~500 |
| `components/notas-salida/FormularioNotaSalida.tsx` | Formulario de creación/edición: cliente, tipo de salida, almacén origen, productos, tributos | ~900 |
| `components/notas-salida/DetalleNotaSalida.tsx` | Panel lateral de detalle: tabs General/Historial, acciones (anular, entregar, imprimir, duplicar) | ~450 |
| `hooks/useNotasSalida.ts` | Hook React de orquestación: CRUD, generación, anulación, feedback | ~200 |
| `services/notaSalida.service.ts` | Lógica de negocio: `generarNSEnInventario`, `anularNSEnInventario`, `mapTipoSalidaAMotivo`, `generarCorrelativoNS`, `prepararDuplicadoNS`, tributario | ~280 |
| `services/notaSalida.print.ts` | Impresión HTML de Nota de Salida | ~180 |
| `repositories/notaSalida.repository.ts` | Persistencia localStorage con clave `notas_salida_v1` y evento propio | ~50 |
| `models/notaSalida.types.ts` | Tipos: `TipoSalida`, `EstadoNotaSalida`, `LineaNotaSalida`, `NotaSalida`, `EventoHistorialNS` | ~120 |
| `models/notaSalida.constants.ts` | Catálogos: `TIPOS_SALIDA`, `TIPOS_SALIDA_CON_CLIENTE`, `STORAGE_KEY_NOTAS_SALIDA`, `ESTADO_NS_BADGE`, `FORMAS_PAGO_NS` | ~100 |
| **Total** | | **~2780 líneas** |

---

## 14. Archivos existentes a modificar

### `models/inventory.types.ts` — cambio mínimo

**Línea 145** actualmente:
```typescript
export type InventoryView = 'situacion' | 'movimientos' | 'transferencias' | 'alertas' | 'importar' | 'notas-ingreso';
```

Debe quedar:
```typescript
export type InventoryView = 'situacion' | 'movimientos' | 'transferencias' | 'alertas' | 'importar' | 'notas-ingreso' | 'notas-salida';
```

**Riesgo:** Muy bajo. Solo se amplía un union type. TypeScript marcará en InventoryPage si falta un case.

### `pages/InventoryPage.tsx` — cambio mínimo

Se deben agregar exactamente 3 bloques:

1. **Import** al inicio:
```typescript
import NotasSalidaPanel from '../components/notas-salida/NotasSalidaPanel';
```

2. **Tab button** después del tab de Notas de Ingreso (línea ~283):
```tsx
<button onClick={() => setSelectedView('notas-salida')} ...>
  <svg .../>
  <span>Notas de Salida</span>
</button>
```

3. **Condición de toolbar** en línea 288, agregar `'notas-salida'`:
```tsx
selectedView !== 'notas-ingreso' && selectedView !== 'notas-salida'
```

4. **Renderizado del contenido** en la sección de contenido principal (después de línea 393):
```tsx
{selectedView === 'notas-salida' && (
  <NotasSalidaPanel />
)}
```

5. **Condición de padding** en línea 348, agregar `'notas-salida'`:
```tsx
selectedView === 'notas-ingreso' || selectedView === 'notas-salida'
```

**Riesgo:** Bajo. Son adiciones puras. No se modifica lógica existente.

---

## 15. Archivos que NO deben tocarse

Estos archivos deben permanecer **completamente intactos** durante la implementación de Nota de Salida:

| Archivo | Razón |
|---------|-------|
| `components/notas-ingreso/NotasIngresoPanel.tsx` | Componente estable de NI |
| `components/notas-ingreso/FormularioNotaIngreso.tsx` | Formulario estable de NI |
| `components/notas-ingreso/DetalleNotaIngreso.tsx` | Detalle estable de NI |
| `hooks/useNotasIngreso.ts` | Hook estable de NI |
| `services/notaIngreso.service.ts` | Lógica de stock de NI |
| `services/notaIngreso.print.ts` | Impresión de NI |
| `repositories/notaIngreso.repository.ts` | Persistencia de NI |
| `models/notaIngreso.types.ts` | Tipos de NI |
| `models/notaIngreso.constants.ts` | Catálogos de NI |
| `services/inventory.service.ts` | Servicio compartido de stock — solo consumir |
| `repositories/stock.repository.ts` | Repositorio compartido de stock — solo consumir |
| Cualquier archivo de Kardex / Movimientos | No tocar la capa de movimientos |
| Cualquier archivo de Transferencias | Módulo independiente |
| Cualquier archivo de POS | Módulo independiente |
| Cualquier archivo de Comprobantes | Módulo independiente |
| Cualquier archivo de Documentos Comerciales | Módulo independiente |

---

## 16. Riesgos técnicos

### Riesgo 1 — Stock negativo en generación
**Probabilidad:** Alta  
**Impacto:** Alto  
**Descripción:** Si al generar una NS el stock del almacén de origen es insuficiente, puede dejarse el stock en negativo si no se valida correctamente.  
**Mitigación:** Implementar validación de stock disponible ANTES de registrar ningún movimiento Kardex. Validar línea por línea y por almacén. Si falla una línea, abortar toda la operación.

### Riesgo 2 — Acoplamiento accidental con NI
**Probabilidad:** Media  
**Impacto:** Alto  
**Descripción:** Al seguir la misma estructura que NI, existe el riesgo de importar tipos o funciones de NI en NS, creando una dependencia no deseada.  
**Mitigación:** Revisión explícita de imports en cada archivo de NS. Ningún archivo de `notas-salida/` debe importar de `notas-ingreso/`.

### Riesgo 3 — Colisión de localStorage
**Probabilidad:** Baja  
**Impacto:** Muy alto  
**Descripción:** Si por error NS usa la misma clave de localStorage que NI (`notas_ingreso_v1`), los datos se mezclan o sobreescriben.  
**Mitigación:** La constante `STORAGE_KEY_NOTAS_SALIDA = 'notas_salida_v1'` debe estar definida en `notaSalida.constants.ts` y usarse exclusivamente en `notaSalida.repository.ts`.

### Riesgo 4 — Estado `Entregada` sin restricciones
**Probabilidad:** Media  
**Impacto:** Medio  
**Descripción:** Si la transición `Generada → Entregada` no está bien protegida, podría marcarse como entregada una nota que nunca salió físicamente.  
**Mitigación:** La transición debe requerir confirmación del usuario. Documentar que `Entregada` es un estado terminal que no genera movimiento de stock adicional.

### Riesgo 5 — Anulación post-Entregada
**Probabilidad:** Baja  
**Impacto:** Alto  
**Descripción:** Anular una nota ya marcada como `Entregada` es un proceso complejo porque la mercancía ya salió. Hay implicancias contables.  
**Mitigación:** En Fase 1, bloquear la anulación desde `Entregada`. Solo permitir anulación desde `Generada`. Documentar esto explícitamente en el formulario de anulación.

### Riesgo 6 — Doble descuento desde Comprobante
**Probabilidad:** Alta si no se implementa la validación  
**Impacto:** Muy alto  
**Descripción:** Si un comprobante ya descontó stock automáticamente y el usuario genera NS desde ese comprobante, el stock se descuenta dos veces.  
**Mitigación:** No implementar la integración con comprobantes hasta que exista la validación anti doble descuento (Fase 3).

### Riesgo 7 — Tipo de salida `11` (transferencia entre almacenes)
**Probabilidad:** Media  
**Impacto:** Medio  
**Descripción:** El tipo `11 - Salida por transferencia entre almacenes` es semánticamente similar a lo que ya hace el módulo de Transferencias. Puede generar confusión o doble descuento.  
**Mitigación:** En Fase 1, incluir el tipo en el catálogo pero documentar en el tooltip que para transferencias formales se recomienda el módulo de Transferencias. En Fase 2 se puede establecer si este tipo debe bloquearse o redirigir.

### Riesgo 8 — Crecimiento del tab en InventoryPage
**Probabilidad:** Media  
**Impacto:** Bajo  
**Descripción:** InventoryPage ya tiene 7 tabs. Al agregar NS serán 8. En pantallas pequeñas el tab bar podría necesitar scroll horizontal.  
**Mitigación:** Revisar el diseño responsivo del tab bar. Si hay 8 o más tabs, considerar agrupar NI y NS bajo un submenú de "Notas".

---

## 17. Recomendación por fases

### Fase 1 — Módulo base Nota de Salida independiente

**Objetivo:** NS funcional de forma autónoma. Sin integración con documentos origen.  
**Duración estimada:** 3-4 días de desarrollo  
**Entregables:**
- Los 9 archivos nuevos de NS
- Las 2 modificaciones a `inventory.types.ts` e `InventoryPage.tsx`
- Flujo completo: crear borrador → generar → entregar/anular
- Validación de stock antes de generar
- Movimientos Kardex tipo SALIDA
- Impresión PDF de NS
- Exportación Excel del listado
- Filtros: estado, fecha, tipo de salida, cliente, almacén

**Alcance NO incluido en Fase 1:**
- Integración con OV/NV/Comprobantes
- Estado `Facturado`
- Campo `Origen` como campo funcional
- Impuesto selva
- Envío por correo

---

### Fase 2 — Integración con documentos origen

**Objetivo:** Generar NS desde Orden de Venta o Nota de Venta.  
**Prerrequisitos:** Fase 1 completa. Auditoría de módulos OV y NV.  
**Entregables:**
- Botón "Generar Nota de Salida" desde OV aprobada
- Botón "Generar Nota de Salida" desde NV
- Campo `origen` funcional en NS (OV, NV, Manual)
- Trazabilidad: desde NS se puede ver el documento origen
- Desde OV/NV se puede ver la(s) NS generadas

---

### Fase 3 — Integración con Comprobantes + Anti doble descuento

**Objetivo:** Generar NS desde Comprobante cuando no descuenta stock automáticamente.  
**Prerrequisitos:** Fase 2 completa. Auditoría de módulo de Comprobantes. Auditoría de configuración de descuento automático.  
**Entregables:**
- Lectura de configuración: `comprobante.descontaStockAutomaticamente`
- Bloqueo de generación de NS si el comprobante ya descontó stock
- Mensaje claro al usuario cuando está bloqueado
- Campo `facturado` en NS (vinculado a comprobante)
- Campo `origen: 'Comprobante'` en NS

---

### Fase 4 — Refinamiento de exportables, impresión y correo

**Objetivo:** Mejoras de calidad y experiencia en la exportación de NS.  
**Prerrequisitos:** Fase 1 completa.  
**Entregables:**
- PDF con diseño mejorado (logo empresa, membrete)
- Envío de NS por correo (si el patrón existe en otros módulos)
- Impuesto selva en formulario y cálculo
- Configuración de columnas exportables en Excel
- Vista previa de impresión antes de descargar

---

## 18. Conclusión

### Conveniencia de construir Nota de Salida ahora

**Sí conviene.** La arquitectura de Nota de Ingreso está completamente estable, documentada y es perfectamente aplicable como plantilla. No hay deuda técnica bloqueante. La simetría funcional entre NI y NS es clara: los mismos 9 archivos, el mismo patrón de capas, el mismo ciclo de estados, el mismo motor de stock (pero en sentido inverso).

### Resumen de archivos

| Categoría | Cantidad | Acción |
|-----------|----------|--------|
| Archivos nuevos | 9 | Crear desde cero siguiendo el patrón de NI |
| Archivos a modificar mínimamente | 2 | `inventory.types.ts` + `InventoryPage.tsx` |
| Archivos que NO deben tocarse | 9 + todos los demás módulos | Intocables durante NS |

### Advertencias principales

1. **La validación de stock suficiente es obligatoria** antes de generar NS. No existe en NI. Es la diferencia más crítica.
2. **El catálogo de tipos de salida no existe** aún en el codebase. Debe crearse como constante local en `notaSalida.constants.ts`.
3. **No importar nada de `notas-ingreso/` dentro de `notas-salida/`**. El acoplamiento accidental es el riesgo más común al seguir una plantilla.
4. **No implementar integración con comprobantes en Fase 1** para evitar el problema de doble descuento.
5. **El tipo `'notas-salida'`** debe agregarse al union `InventoryView` antes o junto con la implementación de NS.
6. **El estado `Entregada`** no existe en NI. Es nuevo para NS. Su ausencia en la infraestructura compartida no es un problema porque NS tiene sus propios tipos.

### Estimación de esfuerzo Fase 1

| Archivo | Esfuerzo estimado |
|---------|------------------|
| `notaSalida.types.ts` + `notaSalida.constants.ts` | 2h |
| `notaSalida.repository.ts` | 30min |
| `notaSalida.service.ts` | 4h |
| `notaSalida.print.ts` | 2h |
| `useNotasSalida.ts` | 2h |
| `FormularioNotaSalida.tsx` | 8h |
| `NotasSalidaPanel.tsx` | 6h |
| `DetalleNotaSalida.tsx` | 4h |
| Modificaciones a `inventory.types.ts` + `InventoryPage.tsx` | 30min |
| **Total estimado** | **~29h / ~3.5 días** |

---

*Auditoría generada el 2026-06-07. No se modificó ningún archivo del codebase durante esta auditoría.*
