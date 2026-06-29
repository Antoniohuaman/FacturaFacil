# Auditoría técnica y funcional — Guías de Remisión Electrónica (GRE)

**Proyecto:** SenciYo · FacturaFacil  
**Fecha:** 2026-06-29  
**Branch:** develop · Commit base: `aa7c16d0`  
**Scope:** Comparativa GRE vs Comprobantes Electrónicos · Propuesta de implementación por fases

---

## Resumen ejecutivo

| Categoría | Cantidad |
|---|---|
| Piezas sólidas (sin reescritura) | 8 |
| Gaps mayores (faltan para igualar Comprobantes) | 11 |
| **Críticos / Bloqueantes** | **4** |

### 🔴 Bugs críticos — el módulo está roto sin estos

1. **Ruta `/guias-remision/:id` no registrada.** `TablaGuias.tsx:224` navega a `/guias-remision/${guia.id}` pero esa ruta no existe en `privateRoutes.tsx`. El botón «Ver detalle» lanza un error de navegación. `DetalleGREPage.tsx` tampoco existe como archivo.

2. **Post-emisión vacía: sin modal, sin PDF, sin feedback.** Al presionar «Emitir GRE» el sistema guarda silenciosamente y redirige al listado. No hay confirmación, no hay acceso a imprimir, ni se presentan opciones al usuario.

3. **Correlativo no secuencial.** `FormularioGREPage.tsx` genera el correlativo como `String(Date.now()).slice(-8)`. Produce colisiones y no es un número de serie válido para SUNAT.

4. **Eliminar borrador no expuesto en UI.** El contexto tiene `eliminarGuia()` pero ninguna fila del listado ni del tab Borradores ofrece la acción de eliminación.

---

## Archivos revisados

### Módulo GRE (fuente auditada)

| Archivo | Líneas | Estado | Observación clave |
|---|---|---|---|
| `paginas/GuiasRemision.tsx` | 83 | ✓ Base | Tabs Listado/Borradores. Sin stats, sin filtros a nivel página. |
| `paginas/FormularioGREPage.tsx` | ~812 | ⚠ Incompleto | Formulario funcional. Emitir no tiene modal, correlativo inválido. |
| `paginas/DetalleGREPage.tsx` | — | ✗ No existe | Archivo ausente. Ruta tampoco registrada en privateRoutes. |
| `components/lista/TablaGuias.tsx` | 293 | ⚠ Básico | 7 columnas, búsqueda simple, filtro estado. Sin drawer, bulk, columnas configurables. |
| `contexto/ContextoGuiasRemision.tsx` | 139 | ✓ Sólido | useReducer + DataSource + tenant. Bien estructurado. |
| `api/fuenteDatosGRE.ts` | 71 | ✓ Sólido | Interfaz IGuiasRemisionDataSource, localStorage. Sin historial. |
| `modelos/GuiaRemision.ts` | 179 | ⚠ Incompleto | Sin `historial[]`, sin `erroresSUNAT`. `pesoTotal` ya en kg (actualizado 2026-06-29). |
| `paginas/GuiasRemisionLayout.tsx` | 10 | ✓ Sólido | Solo envuelve con Provider. Correcto. |

### Comprobantes revisados como referencia

| Componente | Patrón que aporta | ¿Acoplado? |
|---|---|---|
| `ListaComprobantes.tsx` | Orquestador: filtros, bulk, drawer, stats, columnas | Muy acoplado |
| `InvoiceListTable.tsx` | Tabla rica, density, skeleton, portal menu, bulk selection | Muy acoplado |
| `FilterPanel.tsx` | Drawer lateral de filtros avanzados, multi-select, temp state | **Extraíble** |
| `SuccessModal.tsx` | Modal post-emisión: imprimir, compartir, nueva venta | **Adaptable** |
| `PostIssueOptionsModal.tsx` | Modal: ¿qué deseas hacer? imprimir/descargar | **Adaptable** |
| `DraftsTable.tsx` | Borradores con vencimiento, bulk, columnas config | Acoplado a mock |
| `VoidInvoiceModal.tsx` | Modal de anulación con confirmación formal | **Adaptable** |
| `StatsCards.tsx` | Tarjetas de conteo por estado | **Adaptable** |

---

## A · Listado de Guías de Remisión

### Columnas actuales (7)

- ✓ N° Guía (serie + correlativo)
- ✓ Tipo (Remitente / Transportista)
- ✓ Destinatario (nombre + doc)
- ✓ Motivo de traslado
- ✓ Fecha de emisión
- ✓ Estado (badge con colores)
- ✓ Acciones (menú MoreHorizontal)

### Columnas faltantes

- ⚠ Modalidad (Privado / Público)
- ⚠ Fecha inicio de traslado
- ⚠ Transportista (para GRE Transportista)
- ✗ Selección de filas (checkboxes)
- ✗ Ordenamiento por columna
- ✗ Columnas configurables

### Otras brechas

- ✗ No hay stats cards (conteo por estado: Borrador / Pendiente / Emitida / etc.)
- ✗ Empty state sin ícono ni CTA — solo texto plano. Comprobantes tiene ícono + descripción + botón de acción.
- ⚠ Menú de acciones usa `onBlur` para cerrar — no funciona bien al hacer click fuera. Comprobantes usa portal + posición relativa al anchor.
- ℹ Paginación básica presente: 15 registros/página, anterior/siguiente. Es suficiente para MVP.

### Propuesta columnas

**Fijas:** N° Guía · Tipo · Destinatario · F. Emisión · Estado · Acciones  
**Configurables:** Motivo · Modalidad · F. Inicio Traslado · Transportista · Peso Bruto · Observaciones

---

## B · Filtros y búsqueda

### Implementados

- ✓ Búsqueda por destinatario, N° doc, serie-correlativo
- ✓ Filtro por estado (select dropdown, uno a la vez)

### Faltantes

- ✗ Filtro por tipo GRE (Remitente / Transportista)
- ✗ Rango de fechas de emisión
- ✗ Filtro por motivo de traslado
- ✗ Filtro por modalidad (Privado / Público)
- ⚠ Drawer de filtros avanzados
- ⚠ Botón «Limpiar filtros»
- ⚠ Chips de filtros activos
- ⚠ Búsqueda por serie exacta, correlativo

### Reutilización: `FilterPanel.tsx` de Comprobantes

El componente acepta `availableOptions` como props. Crear `FiltrosAvanzadosGRE.tsx` que adapte los campos: `tiposGRE`, `estados`, `motivos`, `modalidades`, `rangoFechas`. Sin re-implementar la lógica de drawer.

---

## C · Borradores

> **Tab Borradores usa el mismo componente que Listado.** Se pasa `soloBorradores=true` a `TablaGuias`. Cualquier cambio en el listado afecta también el tab de borradores. Genera acoplamiento implícito.

- ✓ Filtro `esBorrador === true` correcto, separación funcionando
- ✓ Acción «Editar» visible solo para borradores
- ✗ Acción «Eliminar borrador» no expuesta en UI (existe en contexto, ausente en tabla)
- ✗ No hay stats de borradores (cuántos, cuántos por vencer)
- ⚠ No hay vencimiento de borrador (`DraftsTable` de Comprobantes muestra días restantes)
- ⚠ Acción «Emitir desde borrador» no disponible directamente en el tab
- ⚠ No hay acciones bulk (seleccionar todos y eliminar o emitir varios)
- ℹ El tab Borradores sí está visible y diferenciado — la base existe

---

## D · Flujo de emisión

### Estado actual del flujo al presionar «Emitir GRE»

```typescript
// FormularioGREPage.tsx:594–616 — flujo actual
const emitida: GuiaRemision = {
  ...guia,
  esBorrador: false,
  estado: 'Pendiente',
  correlativo: String(Date.now()).slice(-8),  // ← NO SECUENCIAL, puede colisionar
};
await agregarGuia(emitida);
navigate('/guias-remision');  // ← sin modal, sin PDF, sin confirmación
```

### Checklist

- ✓ Valida que haya destinatario antes de emitir
- ✓ Cambia estado a «Pendiente» y `esBorrador: false`
- ✓ Funciona tanto para crear como editar (`modoEdicion`)
- ✗ Correlativo generado con `Date.now().slice(-8)` — no es secuencial ni válido para SUNAT
- ✗ No hay modal de confirmación post-emisión
- ✗ No hay opción de imprimir/descargar PDF tras emitir
- ✗ No hay validación de campos GRE obligatorios (bienes, puntos de traslado, transporte)
- ⚠ No hay toast ni feedback visual (solo redirección silenciosa)
- ⚠ No hay opción de «ver detalle» automáticamente tras emitir

### Flujo correcto propuesto (MVP)

1. Validar campos obligatorios (destinatario, al menos un bien, serie) → mostrar errores inline.
2. Generar correlativo secuencial desde el DataSource (leer máximo actual + 1).
3. Guardar con estado «Pendiente».
4. Abrir `ModalConfirmacionEmisionGRE` (adaptar `PostIssueOptionsModal`).
5. Ofrecer: ver detalle · imprimir · volver al listado.

---

## E · Drawer / panel de detalle

> **🔴 `DetalleGREPage.tsx` no existe. La ruta tampoco está registrada.**
>
> `privateRoutes.tsx` registra: `/guias-remision`, `/guias-remision/nuevo/:tipoParam`, `/guias-remision/editar/:id`.  
> **No hay `/guias-remision/:id`.**  
> `TablaGuias.tsx:224` llama `navigate('/guias-remision/${guia.id}')` → ruta no definida → error de navegación.

### Propuesta: Drawer en lugar de página completa

Comprobantes no tiene una página de detalle separada — muestra un panel lateral (drawer) sobre el listado. Para GRE se recomienda el mismo patrón: abre el drawer sin abandonar el listado.

### Tabs propuestos para `DrawerDetalleGRE`

1. **General** — Serie/correlativo, estado, fechas, destinatario, motivo, modalidad
2. **Bienes** — Tabla compacta: código, nombre, cantidad, unidad, peso, normalizado
3. **Transporte** — Modalidad, vehículos, conductores, transportista. Condicional por tipo GRE y modalidad
4. **Documentos relacionados** — Tabla de documentos relacionados (internos y externos)
5. **Historial** — Log de eventos (creación, edición, emisión, cambios de estado, impresión)

> **Condicionalidad:** El tab «Transporte» muestra datos distintos: GRE Remitente + privado → vehículos y conductores. GRE Remitente + público → datos del transportista externo. GRE Transportista → propia estructura. La lógica ya existe en `VistaPrevia` dentro de `FormularioGREPage` y puede extraerse.

---

## F · Acciones por guía

| Acción | Estado | Condición | Prioridad |
|---|---|---|---|
| Ver detalle | 🔴 Roto | Siempre | MVP |
| Editar | ✓ | Solo si `esBorrador` | — |
| Anular | ⚠ `confirm()` nativo | Estado ≠ Anulada | MVP |
| Eliminar borrador | ✗ Ausente en UI | Solo borradores | MVP |
| Duplicar | ✗ No existe | Siempre | MVP |
| Imprimir | ✗ No existe | Estado ≠ Borrador | MVP |
| Descargar PDF | ✗ No existe | Estado ≠ Borrador | MVP |
| Emitir desde borrador | ⚠ Solo via Editar | Solo borradores | Fase 2 |
| Compartir (enlace) | ✗ No existe | Emitida | Fase 2 |
| Consultar estado SUNAT | — Futuro | Emitida/Pendiente | Fase 3 |
| Ver XML / CDR | — Futuro | Aceptada | Fase 3 |

> **Anular usa `confirm()` nativo.** `TablaGuias.tsx:83`: `if (!confirm('¿Anular esta guía de remisión?')) return;` — no cumple el estándar UX del sistema. Adaptar `VoidInvoiceModal.tsx` de Comprobantes.

---

## G · PDF e impresión

> **Sin ninguna implementación de PDF o impresión en el módulo GRE.** El formulario tiene una `VistaPrevia` útil como base para el PDF, pero no hay ningún mecanismo de impresión o exportación.

### Comprobantes usa `imprimirComprobante()`

Ubicado en `@/shared/impresion/ServicioImpresionComprobante`. Para GRE el formato A4 es el correcto — no ticket.

### Estructura propuesta del PDF GRE (A4)

1. Encabezado: logo empresa, nombre, RUC, tipo GRE, N° guía, fecha emisión
2. Datos del destinatario: nombre, tipo doc, N° doc, dirección
3. Motivo de traslado + modalidad + fecha inicio traslado
4. Puntos: dirección de partida y de llegada (con ubigeo)
5. Documentos relacionados (tabla)
6. Bienes a transportar (tabla: código, descripción, cantidad, unidad, peso por línea)
7. Peso bruto total + unidad de peso
8. Sección transporte (condicional: vehículos, conductores, transportista, MTC)
9. Observaciones
10. Código QR o representación textual (para futuro XML/CDR)

### Estrategia recomendada para Fase 1

Crear `ImpresionGRE.tsx` como componente React que renderiza el PDF usando `window.print()` con CSS `@media print`. La `VistaPrevia` existente ya tiene el 70% del contenido — refactorizarla como el template imprimible. **No acoplar a `ServicioImpresionComprobante`.**

---

## H · Historial de eventos

> **El modelo `GuiaRemision` no tiene campo `historial[]`.** No es posible rastrear retroactivamente cambios de estado, emisiones o impresiones.

### Propuesta de campo historial

```typescript
// Agregar a GuiaRemision.ts
interface EventoGRE {
  id: string;
  tipo: 'creacion' | 'edicion' | 'emision' | 'cambio_estado' | 'impresion' | 'anulacion';
  descripcion: string;
  fecha: Date;
  usuario?: string;
  estadoAnterior?: EstadoGRE;
  estadoNuevo?: EstadoGRE;
}

// En GuiaRemision:
historial?: EventoGRE[];
```

### Eventos a registrar

- Creación de borrador
- Edición de borrador
- Emisión (Borrador → Pendiente)
- Cambio de estado (futuro: respuesta SUNAT)
- Impresión / descarga PDF
- Anulación
- Error de envío (fase 3)

---

## I · Estados del documento

| Estado | Tipo | ¿Existe en modelo? | ¿Badge implementado? | Nota |
|---|---|---|---|---|
| Borrador | Interno | ✓ | ✓ | Separado por `esBorrador` |
| Pendiente | Interno | ✓ | ✓ | Estado post-emisión local |
| Emitida | Interno | ✓ | ✓ | Para futuro: enviada a SUNAT |
| Aceptada | SUNAT | ✓ | ✓ | Requiere backend CDR |
| Observada | SUNAT | ✓ | ✓ | Requiere backend CDR |
| Rechazada | SUNAT | ✓ | ✓ | Requiere backend CDR |
| Anulada | Interno/SUNAT | ✓ | ✓ | Interno disponible; SUNAT requiere CDR anulación |
| Error de envío | Interno | ✗ | ✗ | Agregar al modelo para Fase 3 |

Los estados del modelo están bien definidos. El problema no es el modelo sino que no hay mecanismo para transitarlos (no hay conexión SUNAT). Para el MVP los estados útiles son: `Borrador → Pendiente → Anulada`.

---

## J · Arquitectura y reutilización

### Estructura de archivos propuesta

```
guias-remision/
├── api/fuenteDatosGRE.ts                    ← sin cambios
├── contexto/ContextoGuiasRemision.tsx        ← sin cambios
├── modelos/GuiaRemision.ts                   ← agregar EventoGRE + historial[]
├── logica/motorCondicional.ts                ← sin cambios
├── components/
│   ├── forma/                                ← sin cambios (formulario)
│   ├── lista/
│   │   ├── TablaGuias.tsx                    ← refactor: columnas config, portal menu
│   │   └── StatsCardsGRE.tsx                 ← NUEVO: tarjetas conteo por estado
│   ├── detalle/
│   │   └── DrawerDetalleGRE.tsx              ← NUEVO: panel lateral con 5 tabs
│   ├── filtros/
│   │   └── FiltrosAvanzadosGRE.tsx           ← NUEVO: adaptar FilterPanel
│   ├── modales/
│   │   ├── ModalConfirmacionEmisionGRE.tsx   ← NUEVO: post-emisión
│   │   ├── ModalAnularGRE.tsx                ← NUEVO: adaptar VoidInvoiceModal
│   │   └── ModalImpresionGRE.tsx             ← NUEVO: print / PDF formato A4
│   └── impresion/
│       └── DocumentoImpresionGRE.tsx         ← NUEVO: template A4 imprimible
└── paginas/
    ├── GuiasRemision.tsx                     ← agregar: filtros, stats cards
    ├── FormularioGREPage.tsx                 ← agregar: modal post-emisión, validaciones
    └── GuiasRemisionLayout.tsx               ← sin cambios
```

### Qué NO duplicar de Comprobantes

- **`InvoiceListTable.tsx`** — muy acoplada a tipos de Comprobantes. No heredar, reescribir `TablaGuias` con el mismo patrón.
- **`DraftsTable.tsx`** — usa `Draft` mock con campos inexistentes en GRE. Inspirarse en el patrón visual, no importar el componente.
- **`ListaComprobantes.tsx`** — demasiado acoplada. Crear orquestador propio en `GuiasRemision.tsx`.

### Qué SÍ reutilizar / adaptar

- ✓ **`FilterPanel.tsx`** — misma interfaz, distintos campos. Adaptar con props GRE.
- ✓ **`PostIssueOptionsModal.tsx`** — casi directo. Cambiar textos y props. Sin lógica de moneda.
- ✓ **`VoidInvoiceModal.tsx`** — adaptar para `ModalAnularGRE`.
- ✓ **`ConfigurationCard.tsx`** — ya se usa en `SeccionBienes`, extender a otros puntos.
- ✓ **`Tooltip` de `@/shared/ui`** — ya disponible.
- ✓ **`VistaPrevia` de `FormularioGREPage`** — extraer como base de `DocumentoImpresionGRE`.

---

## Plan de implementación por fases

### Fase 1 — Bugs críticos + MVP funcional

> **Bloqueante · El módulo está roto sin esto**

- Crear `DrawerDetalleGRE.tsx` con tabs básicos (General + Bienes + Transporte)
- Registrar ruta `/guias-remision/:id` o cambiar «Ver detalle» para abrir drawer — eliminar la navegación rota
- Crear `ModalConfirmacionEmisionGRE.tsx` (adaptar `PostIssueOptionsModal`) — abre tras emitir
- Crear `ModalAnularGRE.tsx` (adaptar `VoidInvoiceModal`) — reemplaza `confirm()` nativo
- Exponer acción «Eliminar borrador» en `TablaGuias` (llama al `eliminarGuia()` ya existente)
- Corregir generación de correlativo: leer max actual del datasource + 1, por serie
- Validación básica pre-emisión: al menos un bien, serie válida, destinatario

### Fase 2 — Experiencia al nivel de Comprobantes

> **Alta prioridad · Define si el módulo es usable o básico**

- Crear `DocumentoImpresionGRE.tsx` (formato A4) + acción imprimir/descargar PDF en menú fila y modal post-emisión
- Agregar `EventoGRE[]` al modelo + registrar eventos en creación, emisión, anulación, impresión
- Tab «Historial» en `DrawerDetalleGRE` con timeline de eventos
- Crear `FiltrosAvanzadosGRE.tsx`: tipo GRE, motivo, modalidad, rango fechas + chips de filtros activos + botón limpiar
- Crear `StatsCardsGRE.tsx`: conteo por estado (Pendiente, Emitida, Anulada, Borrador)
- Acción «Duplicar» en menú de fila
- Acción «Emitir» en tab Borradores (sin pasar por el formulario completo)
- Empty states ricos (ícono + descripción + CTA) para listado vacío y borradores vacíos
- Refactor menú de acciones: portal + posicionamiento correcto (no `onBlur`)

### Fase 3 — Integración SUNAT *(requiere backend)*

> **No implementar sin backend/firma disponible**

- Generación y firma de XML GRE-2.1 (SUNAT)
- Envío a SUNAT y lectura de CDR (Aceptada / Rechazada / Observada)
- Transiciones de estado `Pendiente → Aceptada/Rechazada` via CDR
- Consultar estado SUNAT (acción en menú de fila)
- Ver XML / CDR descargable
- Estado «Error de envío» en modelo y UI
- Envío por email real
- Numeración oficial SUNAT (serie T001/V001 según tipo)

---

## Riesgos técnicos detectados

| # | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| R1 | Ruta `/guias-remision/:id` no registrada → «Ver detalle» rompe la navegación | 🔴 Crítico | Registrar ruta O cambiar navegación a drawer. Inmediato. |
| R2 | Correlativo `Date.now().slice(-8)` — colisiones y no válido SUNAT | 🔴 Crítico | Leer max correlativo por serie desde el DataSource y generar n+1. |
| R3 | Sin `historial[]` en modelo — cambios de estado no rastreables retroactivamente | 🟠 Alto | Agregar campo opcional en Fase 1/2. Dato perdido antes del cambio no recuperable. |
| R4 | Tab Borradores usa mismo componente que Listado — acoplamiento implícito | 🟠 Alto | Separar en `TablaBorradoresGRE` en Fase 2. Por ahora documentar la dependencia. |
| R5 | `confirm()` nativo para anular — inconsistente con UX del sistema | 🟠 Alto | Reemplazar con `ModalAnularGRE` en Fase 1. |
| R6 | `VistaPrevia` dentro de `FormularioGREPage` — duplicará lógica con `DrawerDetalleGRE` | 🟡 Medio | Extraer lógica de vista como componente compartido en Fase 2 al crear el drawer. |
| R7 | `pesoTotal` convertido a kg hoy — borradores guardados antes (en TNE) mostrarán valores incorrectos | 🟡 Medio | Agregar nota en release. Datos de borradores antiguos deberán re-ingresarse. |

---

## Recomendación final

El módulo GRE tiene el formulario de creación completo y funcional, pero la gestión posterior está incompleta o rota. Cuatro problemas hacen el flujo inutilizable en producción: la ruta de detalle no existe, el post-emisión no da feedback, el correlativo no es válido, y los borradores no se pueden eliminar desde la UI.

**Fase 1 (7 ítems) debería resolverse en una sola tarea enfocada** — son todos interdependientes y los primeros dos son urgentes. Fase 2 (9 ítems) puede dividirse en sub-tareas: PDF/impresión, filtros avanzados, historial y borradores. Fase 3 se planifica cuando haya backend disponible.

> **No se recomienda hacer Fase 2 antes de cerrar Fase 1** — mejorar la experiencia sobre una navegación rota genera deuda técnica visual.
