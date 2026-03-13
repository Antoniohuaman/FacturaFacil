# Informe de auditoría extrema — Panel lateral de detalle documental

> Fecha: 2026-03-12 | Módulo primario: Comprobantes Electrónicos | Solo lectura — sin cambios.

---

## 1. Resumen ejecutivo

### Qué conviene hacer

Implementar un **panel lateral tipo Drawer** reutilizable para mostrar el detalle en modo lectura de documentos comerciales (comprobantes, cotizaciones, notas de venta, notas de crédito). El Drawer debe abrirse sobre la lista sin abandonarla, mostrando el documento seleccionado completo. Para el enlace de documento relacionado, la acción debe abrir el mismo Drawer filtrado por ese ID, en lugar de navegar a una ruta inexistente.

### Por qué

El sistema ya tiene el componente `Drawer` de `@/shared/ui` con tamaños configurables (sm / md / lg / xl / full), animaciones, manejo de foco y overlay. No hay que construir el primitivo desde cero. El módulo de Clientes ya usa este patrón con éxito. Lo que falta es aplicarlo al dominio documental con un visor específico para documentos comerciales.

### Severidad del problema actual

| Problema | Severidad |
|---|---|
| `onNavigateToDocuments` navega a `/documentos`, ruta que no existe | **CRÍTICA** — acción rota, produce error de routing |
| `PreviewModal` abre con `cartItems=[]` hardcodeado | **ALTA** — el modal de "ver detalle" muestra un documento vacío de productos |
| `totals` calculados con `igv: 0` y sin desglose | **ALTA** — la información tributaria es incorrecta en el modal de preview |
| No existe panel lateral de detalle, solo modal incompleto | **ALTA** — UX degradada, no hay modo lectura real |
| La solución de vista previa es específica a comprobantes, no reutilizable | **MEDIA** — deuda técnica que crece si se replica para cotizaciones/notas de venta |

### Oportunidad arquitectónica

Este es el momento correcto para diseñar el patrón de "visor de documento comercial en modo lectura" de forma genérica, antes de que el sistema crezca con más tipos de documentos (cotizaciones, notas de venta). Hacerlo bien ahora cuesta igual que hacerlo mal y evita duplicación futura.

---

## 2. Diagnóstico del estado actual

### Lista de comprobantes

- Componente principal: `InvoiceListDashboard` en `ListaComprobantes.tsx`.
- Usa `ComprobantesListContext` como almacenamiento en memoria (solo sesión actual).
- La tabla está construida en `InvoiceListTable.tsx` con columnas configurables, densidad variable, filtros avanzados y paginación en cliente.
- Las acciones disponibles por fila son: Ver detalle, Imprimir, Compartir, Duplicar, Editar, Generar NC, Anular, Generar cobranza.
- La lista tiene exportación Excel con 23 columnas, incluyendo `relatedDocumentId` y `relatedDocumentType`.

### Enlace de documento relacionado

- **Dónde está**: `InvoiceListTable.tsx`, líneas 511–522.
- **Qué hace**: Renderiza un `<button>` visible solo cuando `invoice.relatedDocumentId` tiene valor. El texto muestra `← {invoice.relatedDocumentId}`.
- **Qué dispara**: Llama al callback `onNavigateToDocuments` que es prop del componente.
- **Qué hace `onNavigateToDocuments`**: En `ListaComprobantes.tsx`, línea 1154: `() => navigate('/documentos')`.
- **La ruta `/documentos` no existe** en `privateRoutes.tsx`. Las rutas definidas son: `/`, `/comprobantes`, `/comprobantes/nuevo`, `/comprobantes/emision`, `/comprobantes/pos`, y otras de módulos distintos. `/documentos` nunca fue registrada.
- **Conclusión**: Este enlace es un placeholder o deuda técnica. Navega a una ruta inexistente para todos los usuarios que tienen notas de crédito emitidas. La acción es completamente no funcional.

### Detalle actual disponible

- Al hacer clic en "Ver detalle" (ícono ojo), se abre `PreviewModal`.
- `PreviewModal` recibe estos datos desde `handleViewDetails`:
  - `cartItems={[]}` — **hardcodeado como array vacío** (línea 1236, comentario: `// TODO: Convertir invoice a cartItems si es necesario`)
  - `documentType` — parseado como `'factura'` o `'boleta'` (no maneja `'nota_credito'`)
  - `series` — parseado de `invoice.id?.split('-')[0]` — frágil, asume formato `SERIE-NUMERO`
  - `totals` — construido como `{ subtotal: total, igv: 0, total }` — sin desglose real
  - `currency`, `paymentMethod`, `observations`, `internalNotes` — sí disponibles si existen en el objeto
  - `notaCredito` — **no se pasa** aunque `invoice.noteCreditData` existe en la interfaz
- El resultado es un modal que muestra un documento sin productos, con totales incorrectos, sin datos de nota de crédito, y sin detalles del documento origen.

### Limitaciones actuales

1. `PreviewModal` fue diseñado para el flujo de emisión (vista previa antes de emitir), no para modo lectura post-emisión. Recibe datos de carrito activo, no de un comprobante archivado.
2. Los productos (`cartItems`, `items`, `productos`) solo están disponibles en `ComprobantesListContext` para comprobantes emitidos en la **sesión actual**. Para comprobantes de sesiones anteriores, estos campos son `undefined`.
3. No existe un fetch por ID al backend — el sistema es 100% en memoria para la lista.
4. `SidePreviewPane` existe en el módulo de emisión pero está acoplado al formulario activo de edición, no a un comprobante archivado.
5. No existe ningún componente de "modo lectura de comprobante" reutilizable.

---

## 3. Hallazgos por archivo

### `ListaComprobantes.tsx`
- **Ruta**: `src/.../lista-comprobantes/pages/ListaComprobantes.tsx`
- **Responsabilidad**: Página principal de la lista. Orquesta filtros, tabla, paginación, acciones, modales.
- **Qué aporta**: Toda la lógica de orchestración. Tiene `handleViewDetails` y `handlePrint` que ya leen el objeto `Comprobante` con toda la información disponible.
- **Qué limita**: `handleViewDetails` abre un modal (`PreviewModal`) con datos incompletos. `onNavigateToDocuments` navega a ruta inexistente.
- **Impacto**: Este archivo es donde se añadiría el estado del drawer (`selectedDocumentoParaDetalle`, `showDetalleDrawer`) y el handler `handleOpenDetalle`. La deuda es baja — la lógica de apertura de modales ya existe como patrón.

### `InvoiceListTable.tsx`
- **Ruta**: `src/.../lista-comprobantes/components/lista-comprobantes/InvoiceListTable.tsx`
- **Responsabilidad**: Tabla con filas de comprobantes. Delega todas las acciones como callbacks.
- **Qué aporta**: Props bien tipadas para callbacks (`onViewDetails`, `onNavigateToDocuments`, etc.). El botón de documento relacionado está en líneas 511–522.
- **Qué limita**: `onNavigateToDocuments` es una prop de tipo `() => void` — no recibe el `relatedDocumentId` específico. Para abrir el detalle del documento relacionado habría que cambiar la firma a `(relatedId: string) => void`.
- **Impacto**: Requiere cambio de firma del callback `onNavigateToDocuments` → `onVerDocumentoRelacionado(id: string)`.

### `ComprobantesListContext.tsx`
- **Ruta**: `src/.../lista-comprobantes/contexts/ComprobantesListContext.tsx`
- **Responsabilidad**: Estado global en memoria de la lista de comprobantes.
- **Qué aporta**: Interface `Comprobante` con todos los campos disponibles en lista, incluyendo `relatedDocumentId`, `instantaneaDocumentoComercial`, `noteCreditData`, `items`, `cartItems`, `productos`, `totals`.
- **Qué limita**: Es solo de sesión. Los campos `items`, `cartItems`, `productos`, `instantaneaDocumentoComercial` solo estarán presentes para comprobantes emitidos en la sesión actual. Para comprobantes históricos cargados desde API, estos campos serán `undefined`.
- **Impacto crítico**: Esto determina que el modo lectura deberá manejar dos estados: **con datos ricos** (sesión) y **con datos básicos** (histórico). No puede asumir que siempre habrá `cartItems`. El visor debe degradarse con gracia.

### `instantaneaDocumentoComercial.ts`
- **Ruta**: `src/.../models/instantaneaDocumentoComercial.ts`
- **Responsabilidad**: Modelo canónico de snapshot documental. Contiene empresa, establecimiento, vendedor, cliente, campos comerciales, detalle de ítems, totales y relaciones documentales.
- **Qué aporta**: Función `convertirComprobanteListadoAInstantaneaDocumentoComercial()` que convierte un `Comprobante` de lista en una `InstantaneaDocumentoComercial`. Función `crearDatosNotaCreditoDesdeInstantanea()` para extraer datos de NC.
- **Qué limita**: La conversión `convertirComprobanteListadoAInstantaneaDocumentoComercial()` depende de los datos disponibles en el `Comprobante`. Si no hay `cartItems`, el `detalle` del snapshot quedará vacío. No hay fetch de backend.
- **Impacto**: Este archivo es la **fuente de datos ideal** para el visor. La `InstantaneaDocumentoComercial` es el modelo más completo y estructurado. El visor debería trabajar con ella.

### `PreviewModal.tsx`
- **Ruta**: `src/.../shared/modales/PreviewModal.tsx`
- **Responsabilidad**: Modal de vista previa diseñado para el flujo de emisión (pre-emisión).
- **Qué aporta**: Renderizado visual de un documento para pre-vista antes de emitir.
- **Qué limita**: No está diseñado para modo lectura post-emisión. Recibe `cartItems` del carrito activo, no de un comprobante archivado. No muestra datos de nota de crédito. No tiene estructura de secciones (cliente, comercial, tributario). Solo renderiza el documento como hoja de impresión.
- **Impacto**: **No debe reutilizarse para el panel de detalle**. El panel de detalle tiene una función diferente — informar al usuario sobre un documento ya emitido — y requiere una estructura de presentación diferente (secciones con etiquetas y valores, no una hoja de impresión).

### `SidePreviewPane.tsx`
- **Ruta**: `src/.../shared/side-preview/SidePreviewPane.tsx`
- **Responsabilidad**: Panel lateral resizable para vista previa en tiempo real durante emisión.
- **Qué aporta**: Patrón de split view con handle arrastrable, toggle A4/TICKET, debounce.
- **Qué limita**: Está diseñado para preview de carrito activo durante edición. Es un componente de emisión, no de consulta. No tiene estructura de detalle documental.
- **Impacto**: Aporta el **patrón de split view** como referencia conceptual de que el equipo ya maneja paneles laterales. No debe ser el componente base para el detalle en modo lectura — ese rol lo debe cumplir el `Drawer` de `@/shared/ui`.

### `Drawer.tsx` (`@/shared/ui`)
- **Ruta**: `src/shared/ui/drawer/Drawer.tsx`
- **Responsabilidad**: Primitivo de drawer accesible. Maneja animación de entrada/salida, focus trap, Escape, overlay, bloqueo de scroll body.
- **Qué aporta**: Soporte para tamaños `sm` (320px), `md` (384px), `lg` (640px), `xl` (768px), `full`. Soporte para lado (derecha/izquierda). Props: `titulo`, `subtitulo`, `accionesEncabezado`, `pie`. Portal al body. Ya en uso en Clientes.
- **Qué limita**: Tamaño máximo actual es `xl` = 768px. Para documentos ricos que necesiten 40–50% del ancho en pantallas grandes (1440px+), 768px puede quedarse corto. Sin embargo, `claseContenedor` permite inyectar clases personalizadas para override de ancho.
- **Impacto**: **Este es el componente correcto** para el panel de detalle. Ya existe, ya funciona, ya está en el sistema de diseño.

### `ClientesPage.tsx`
- **Ruta**: `src/.../gestion-clientes/pages/ClientesPage.tsx`
- **Responsabilidad**: Página principal de gestión de clientes con Drawer para create/view/edit.
- **Qué aporta**: El patrón de referencia. `DrawerMode = 'create' | 'view' | 'edit'`, `selectedClient`, `handleViewClient(client)`, tabs de secciones, `renderReadOnlyTabContent()`.
- **Qué limita**: El patrón está incrustado directamente en `ClientesPage.tsx` (más de 1700 líneas). El contenido del drawer en modo lectura está hardcodeado dentro de la página, no en un componente extraído. No es directamente reutilizable.
- **Impacto**: Aporta el patrón de interacción. Para documentos comerciales el visor debe ser un **componente separado** (no inline en la página de lista), porque la información a mostrar es más densa y se reutilizará en múltiples módulos.

---

## 4. Evaluación de patrones posibles

### Ruta tradicional (navegación)

**Descripción**: Navegar a `/comprobantes/:id` para ver el detalle.

**Ventajas**: URL compartible, profundidad de historial natural, SEO (si aplica).

**Desventajas en este contexto**:
- El sistema es en memoria — no existe backend endpoint por ID. Una ruta `/comprobantes/:id` resolvería a vacío para comprobantes históricos.
- El usuario pierde el contexto de la lista (filtros activos, posición en tabla, selección).
- Para volver a la lista habría que presionar "Atrás" con el riesgo de perder el estado de filtros.
- Ya se intentó algo parecido con `/documentos` — no funciona porque la ruta no existe.

**Veredicto**: Descartada para el estado actual del sistema. Podría revisitarse cuando exista API de detalle por ID.

---

### Modal

**Descripción**: `showDetalleModal` + `selectedComprobante` + renderizar un modal centrado.

**Ventajas**: Simple de implementar. Ya existe el patrón con `PreviewModal`.

**Desventajas**:
- Bloquea la lista completamente — el usuario no puede comparar filas mientras lee el detalle.
- Un documento comercial rico (con muchos productos, secciones, NC, cuotas) requiere scroll vertical extenso dentro del modal. La UX es degradada en documentos largos.
- Los modales actuales ya están siendo usados para acciones destructivas (anulación), cobranzas, compartir. Agregar otro modal grande para detalle genera conflicto visual y de z-index.
- `PreviewModal` actual ya muestra las limitaciones de este enfoque.

**Veredicto**: Descartado como patrón principal para detalle. Podría mantenerse para casos específicos como vista previa de impresión.

---

### Drawer (panel lateral deslizante)

**Descripción**: Usar `Drawer` de `@/shared/ui` — ya implementado. Abre desde la derecha con overlay. El usuario puede leer el detalle mientras la lista queda parcialmente visible detrás del overlay.

**Ventajas**:
- Ya existe el componente. Ya funciona en Clientes.
- No abandona la pantalla. El usuario mantiene el contexto de dónde está.
- Permite secciones verticales con scroll independiente del panel.
- Tamaño `xl` (768px) o con override CSS para 40–50% del ancho.
- Fácil de extender con tabs (como en Clientes) para separar: resumen / ítems / relaciones / acciones.
- Se puede añadir `accionesEncabezado` para botones de acción (imprimir, duplicar, NC).

**Desventajas**:
- No permite ver la lista y el detalle simultáneamente (hay overlay). Si se quiere comparar múltiples comprobantes habría que abrir y cerrar.
- En pantallas pequeñas ocupa todo el ancho (`max-w-full`).

**Veredicto**: **Recomendado como patrón principal** para la mayoría de los casos de uso.

---

### Panel lateral fijo / Splitter

**Descripción**: Dividir la pantalla en dos paneles persistentes: lista a la izquierda, detalle a la derecha. Ancho ajustable con handle.

**Ventajas**:
- El usuario puede ver lista y detalle simultáneamente.
- Experiencia tipo "master-detail" clásica (Outlook, Gmail, Linear).
- Permite navegar entre comprobantes en la lista mientras el panel derecho actualiza el detalle.
- `SidePreviewPane` ya demuestra que el equipo puede construir este patrón.

**Desventajas**:
- Requiere cambios en el layout de la página (la lista debe tener ancho dinámico).
- La tabla comprimida a 50–60% del ancho puede volverse difícil de leer si tiene muchas columnas visibles.
- Más complejo de implementar correctamente (estado de ancho, persistencia de preferencias de usuario, responsive).
- Si el usuario no tiene ningún comprobante seleccionado, el panel derecho queda vacío — hay que manejar ese estado.

**Veredicto**: Excelente para experiencia avanzada en segundo paso. Más complejo. Recomendado como evolución después del Drawer.

---

### Recomendación argumentada

**Fase 1 (inmediata)**: Implementar el panel usando `Drawer` con tamaño `xl` (768px) o con override para llegar a ~50% del ancho en pantallas anchas. Es la decisión que minimiza riesgo, reutiliza el primitivo existente, es consistente con Clientes, y resuelve el problema sin nuevas dependencias.

**Fase 2 (evolutiva)**: Si el feedback de usuarios indica que necesitan comparar filas mientras leen el detalle, evolucionar a un splitter de tipo master-detail. El contenido del visor ya estaría extraído como componente propio, por lo que el cambio de contenedor (Drawer → SplitPane) sería de bajo impacto.

La clave de la buena arquitectura aquí es **desacoplar el visor del contenedor**. El componente `VisorDocumentoComercial` debe ser agnóstico de si está dentro de un Drawer, un SplitPane, o una ruta separada.

---

## 5. Arquitectura recomendada

### Principio central

```
Contenedor (Drawer | SplitPane | Route)
  └── VisorDocumentoComercial
        ├── VisorEncabezado
        ├── VisorCliente
        ├── VisorCamposComerciales
        ├── VisorDetalle (ítems)
        ├── VisorTotales
        ├── VisorRelaciones (NC, documento origen)
        └── VisorAcciones (acciones secundarias)
```

El `VisorDocumentoComercial` recibe un único modelo canónico: `InstantaneaDocumentoComercial`. No recibe `Comprobante` de lista directamente. La conversión ocurre en el punto de llamada (en la página de lista).

---

### Piezas comunes (shared)

**`VisorDocumentoComercial`** — Componente raíz del visor.
- Ubicación propuesta: `src/.../comprobantes-electronicos/shared/visor/VisorDocumentoComercial.tsx`
- Recibe: `InstantaneaDocumentoComercial | null`, props de estado de carga, callbacks de acciones.
- Orquesta las secciones. Maneja el estado vacío (sin datos de ítems) con gracia.
- No sabe si está en un Drawer o en otra cosa.

**Secciones del visor** — Componentes presentacionales puros:
- `VisorEncabezado` — tipo de doc, serie/número, estado, fecha emisión, moneda
- `VisorCliente` — nombre, documento, tipo, correo, dirección
- `VisorCamposComerciales` — forma de pago, fecha vencimiento, vendedor, OC, guía, centro de costo, dirección envío
- `VisorDetalle` — tabla de ítems (código, nombre, cantidad, precio, descuento, total)
- `VisorTotales` — subtotal, descuentos, IGV, total, cuotas de crédito si aplica
- `VisorRelaciones` — documento origen (para NC), documento relacionado (para facturas con NC asociada), datos de NC (código, motivo)
- `VisorObservaciones` — observaciones y nota interna

**`useVisorDocumento`** — Hook que convierte `Comprobante` (lista) a `InstantaneaDocumentoComercial`.
- Llama `convertirComprobanteListadoAInstantaneaDocumentoComercial()`.
- Centraliza la lógica de conversión.
- Puede manejar el caso de datos faltantes devolviendo una instantánea parcial en lugar de null.

---

### Piezas específicas por módulo

**`DetalleComprobanteDrawer`** — Wrapper de Drawer para comprobantes.
- Ubicación: `src/.../lista-comprobantes/components/DetalleComprobanteDrawer.tsx`
- Recibe: `comprobante: Comprobante | null`, `isOpen: boolean`, `onClose: () => void`, callbacks de acciones.
- Internamente convierte el `Comprobante` a `InstantaneaDocumentoComercial` y renderiza `VisorDocumentoComercial` dentro del `Drawer`.
- Pasa al Drawer `accionesEncabezado` con los botones de acción (imprimir, duplicar, NC).

**`DetalleDocumentoDrawer`** (futuro, genérico) — Si se implementan cotizaciones/notas de venta:
- El `VisorDocumentoComercial` ya sería reutilizable tal cual.
- Solo habría que crear un adaptador de cotización → `InstantaneaDocumentoComercial` (o un modelo equivalente).
- El `DetalleDocumentoDrawer` de ese módulo sería análogo al de comprobantes.

---

### Desacoplamiento del enlace de documento relacionado

El callback `onNavigateToDocuments` en `InvoiceListTable` debe cambiar de firma.

**Actual** (roto): `onNavigateToDocuments: () => void` → navega a `/documentos`.

**Correcto**: `onVerDocumentoRelacionado: (relatedDocumentId: string) => void` → abre el Drawer con el comprobante que tiene ese ID.

En `ListaComprobantes.tsx`:
```
const handleVerDocumentoRelacionado = (relatedId: string) => {
  const comprobante = comprobantes.find(c => c.id === relatedId);
  if (comprobante) {
    setSelectedDocumentoParaDetalle(comprobante);
    setShowDetalleDrawer(true);
  }
  // Si no se encuentra (comprobante de sesión anterior), mostrar indicador de "no disponible"
};
```

Nota: El `relatedDocumentId` en la interfaz `Comprobante` almacena el ID del documento de origen de la NC. La búsqueda en memoria solo encontrará el comprobante si fue emitido en la sesión actual.

---

### Preparación para cotización / nota de venta / otros

El modelo `InstantaneaDocumentoComercial` es el modelo canónico de transferencia. Para reutilizar el visor en otros tipos de documentos:

1. Cada módulo (cotizaciones, notas de venta) necesita una función de conversión `convertirDocumentoAInstantanea()` que mapee su propio modelo al modelo canónico.
2. El `VisorDocumentoComercial` permanece igual.
3. Se agrega un wrapper `DetalleXxxDrawer` para cada módulo.

Esto es análogo al patrón que ya existe con `construirCargaReutilizacionDocumentoComercial()` para el flujo de duplicación.

---

## 6. Fuente de datos recomendada

### Fuente primaria: `InstantaneaDocumentoComercial`

La `InstantaneaDocumentoComercial` es el modelo más completo y estructurado del sistema. Contiene empresa, establecimiento, vendedor, cliente, campos comerciales, detalle de ítems, totales y relaciones. Debe ser la fuente de verdad para el visor.

**Conversión**: `convertirComprobanteListadoAInstantaneaDocumentoComercial(comprobante)` ya existe y produce una `InstantaneaDocumentoComercial` a partir de un `Comprobante` de lista. Esta función ya es usada por `handleGenerateCreditNote` y `handleDuplicate`. El visor debe usar el mismo camino.

---

### Para comprobantes de la sesión actual

Si el `Comprobante` tiene `instantaneaDocumentoComercial` ya almacenada (campo opcional en la interfaz), usar esa directamente — es la más rica porque fue capturada en el momento de emisión con todos los datos de empresa, productos y totales exactos.

Si no tiene snapshot propio pero tiene `cartItems` o `productos`, la función de conversión puede construir una instantánea razonablemente completa.

---

### Para comprobantes históricos (sin datos de ítems)

Si el `Comprobante` viene de sesiones anteriores o de API sin datos de carrito, los campos `items`, `cartItems`, `productos` serán `undefined`. El visor debe mostrar:

- Todos los campos disponibles (cliente, fechas, serie/número, totales, forma de pago, campos opcionales).
- La sección de detalle de ítems con un indicador neutro: "Detalle de productos no disponible en esta sesión" o similar.
- Nunca un error o pantalla rota — solo degradación elegante.

---

### Qué NO usar como fuente

- **`cartItems={[]}` hardcodeado** como en `PreviewModal` actual — produce documentos incompletos sin indicación al usuario.
- **La ruta `/documentos`** — no existe y debe eliminarse.
- **Estado del formulario de emisión** — el `SidePreviewPane` de `EmisionTradicional` es para el carrito activo, no para documentos archivados.
- **Fetch por ID al backend** como fuente única — el sistema actualmente no tiene este endpoint. Si se agrega en el futuro, debe ser una mejora incremental, no un requisito del visor.

---

## 7. Estructura funcional propuesta del modo lectura

### Secciones obligatorias

```
┌─────────────────────────────────────────┐
│  ENCABEZADO DEL DOCUMENTO               │
│  Tipo | Serie-Número | Estado | Fecha   │
│  Moneda | Empresa | Establecimiento     │
├─────────────────────────────────────────┤
│  CLIENTE                                │
│  Nombre | Tipo doc | Nro doc            │
│  Correo | Dirección fiscal              │
├─────────────────────────────────────────┤
│  DATOS COMERCIALES                      │
│  Forma de pago | Fecha vencimiento      │
│  Vendedor | Orden de compra             │
│  Guía de remisión | Centro de costo     │
│  Dirección de envío                     │
├─────────────────────────────────────────┤
│  DETALLE DE ÍTEMS                       │
│  Tabla: Código | Nombre | Cant | PU     │
│         Desc | Total | IGV              │
│  [si no disponible → indicador neutro]  │
├─────────────────────────────────────────┤
│  TOTALES Y FORMA DE PAGO                │
│  Subtotal | Descuentos | IGV | Total    │
│  Cuotas de crédito (si aplica)          │
├─────────────────────────────────────────┤
│  RELACIONES DOCUMENTALES                │
│  (visible solo si aplica)               │
│  Nota de crédito: código + motivo       │
│  Documento origen: Serie-Número + tipo  │
│  Documento relacionado (enlace activo)  │
├─────────────────────────────────────────┤
│  OBSERVACIONES                          │
│  Observaciones generales                │
│  Nota interna (si aplica)               │
└─────────────────────────────────────────┘
```

### Comportamiento de secciones

- **Todas las secciones se muestran** independientemente de si tienen datos, excepto "Relaciones documentales" que es contextual (solo para NC o documentos con NC asociadas).
- Los valores vacíos se muestran como `—` (guión largo) o campo en blanco, nunca se ocultan arbitrariamente.
- La sección de ítems muestra el indicador neutro cuando `detalle.items` está vacío, en lugar de una tabla vacía o un error.
- Las cuotas de crédito solo aparecen dentro de "Totales" cuando `creditTerms` tiene datos.
- "Nota interna" solo es visible si el usuario tiene permiso para verla (se puede controlar con una prop `mostrarNotaInterna`).

### Acciones desde el encabezado del Drawer

Las acciones se ubican en `accionesEncabezado` del Drawer (ya soportado por el componente). Propuesta:

| Acción | Condición de visibilidad |
|---|---|
| Imprimir | Siempre |
| Duplicar | Si tiene permiso `ventas.comprobantes.emitir` |
| Generar NC | Si `canGenerateCreditNote(comprobante)` |
| Compartir | Siempre |
| Ver en detalle completo | Futuro (cuando exista ruta por ID) |

### Crecimiento futuro

- Agregar **tabs** si el documento se vuelve muy largo: "Resumen" / "Ítems" / "Relaciones" / "Historial".
- Agregar **impresión directa desde el panel** usando `imprimirComprobante()` que ya existe.
- El modelo `InstantaneaDocumentoComercial` ya tiene `version: 1` — permite evolución versionada.

---

## 8. Archivos que habría que tocar después

| Archivo | Motivo |
|---|---|
| `ListaComprobantes.tsx` | Agregar estado `selectedDocumentoParaDetalle`, `showDetalleDrawer`. Agregar `handleOpenDetalle`. Cambiar `onNavigateToDocuments` por `onVerDocumentoRelacionado`. Renderizar `DetalleComprobanteDrawer`. |
| `InvoiceListTable.tsx` | Cambiar prop `onNavigateToDocuments: () => void` por `onVerDocumentoRelacionado: (id: string) => void`. Pasar el ID correcto al hacer clic en el badge de documento relacionado. |
| **NUEVO** `DetalleComprobanteDrawer.tsx` | Wrapper del Drawer para comprobantes. Convierte `Comprobante` a `InstantaneaDocumentoComercial` y renderiza `VisorDocumentoComercial`. |
| **NUEVO** `VisorDocumentoComercial.tsx` | Componente raíz del visor. Orquesta todas las secciones. |
| **NUEVO** `VisorEncabezado.tsx` | Sección de encabezado documental. |
| **NUEVO** `VisorCliente.tsx` | Sección de cliente. |
| **NUEVO** `VisorCamposComerciales.tsx` | Sección de datos comerciales opcionales. |
| **NUEVO** `VisorDetalle.tsx` | Sección de ítems con estado vacío elegante. |
| **NUEVO** `VisorTotales.tsx` | Sección de totales, desglose, cuotas. |
| **NUEVO** `VisorRelaciones.tsx` | Sección de relaciones documentales (NC, origen). |
| **NUEVO** `VisorObservaciones.tsx` | Sección de observaciones y nota interna. |
| `privateRoutes.tsx` | Eliminar cualquier referencia a `/documentos` si existe, o simplemente no agregar esa ruta. (Ya no existe — solo asegurarse de no agregarla.) |
| `instantaneaDocumentoComercial.ts` | No necesita cambios. Ya tiene la función de conversión. Posiblemente agregar utilidades de presentación (formateo de campos para display). |

---

## 9. Riesgos y regresiones a cuidar

### UX

| Riesgo | Descripción | Mitigación |
|---|---|---|
| Drawer muy estrecho para documentos largos | Documentos con muchos ítems pueden necesitar más ancho | Usar tamaño `xl` o override CSS para pantallas anchas. Permitir scroll vertical dentro del panel. |
| Usuario confundido cuando "documento relacionado" no se puede abrir | Si el comprobante origen no está en memoria, el click no abre nada | Mostrar notificación: "Comprobante de sesiones anteriores no disponible para vista detallada" en lugar de silencio. |
| Estado vacío no comunicado | Panel abre mostrando ítems vacíos sin explicación | Usar indicadores neutros explícitos, no tablas vacías. |
| Tabs en Drawer si el contenido crece | Demasiadas secciones sin tabs = mucho scroll | Preparar la estructura para tabs desde el inicio aunque no se implementen de inmediato. |

### Performance

| Riesgo | Descripción | Mitigación |
|---|---|---|
| Conversión a `InstantaneaDocumentoComercial` en cada apertura | La función `convertirComprobanteListadoAInstantaneaDocumentoComercial()` se llama por cada clic | Es una transformación pura en memoria — no hay red. El costo es despreciable. No es un riesgo real. |
| Re-renders de la lista mientras el Drawer está abierto | Si el contexto de comprobantes muta mientras el Drawer está abierto, la lista re-renderiza | El Drawer debe tener su propio estado local de `documentoActivo`, no depender del contexto directamente. Así los cambios de contexto no afectan el panel abierto. |
| Portal del Drawer al body | El Drawer usa `createPortal(_, document.body)` — safe | Sin riesgo, es el comportamiento correcto para overlays. |

### Routing

| Riesgo | Descripción | Mitigación |
|---|---|---|
| Acoplamiento a `/documentos` | Ya existe y está roto | Eliminar el handler `onNavigateToDocuments` y reemplazarlo con `onVerDocumentoRelacionado(id)`. |
| Crear una ruta `/comprobantes/:id` prematuramente | Sin API de detalle por ID, la ruta no puede mostrar datos reales | No crear esta ruta todavía. El Drawer con datos de sesión es la solución correcta ahora. |
| Pérdida de estado de filtros al navegar | Si se usara navegación clásica, los filtros se perderían | El Drawer evita este problema completamente. |

### Preview e impresión

| Riesgo | Descripción | Mitigación |
|---|---|---|
| Duplicar lógica de `handlePrint` | El visor tendrá su propio botón de imprimir | El botón de imprimir del Drawer debe llamar al mismo `handlePrint(comprobante)` de `ListaComprobantes`. No duplicar la función. Pasar el callback como prop. |
| Confusión entre `PreviewModal` (pre-emisión) y `VisorDocumentoComercial` (post-emisión) | Son dos cosas diferentes con propósitos distintos | No reutilizar `PreviewModal` para el Drawer. Mantener la distinción clara: `PreviewModal` = preview de carrito activo, `VisorDocumentoComercial` = detalle de documento archivado. |
| `PreviewModal` siendo llamado desde el Drawer | Si el usuario hace "imprimir" desde el Drawer podría abrir otro modal | Usar `imprimirComprobante()` directamente para imprimir, no `PreviewModal`. |

### Lista

| Riesgo | Descripción | Mitigación |
|---|---|---|
| Overlay del Drawer bloquea interacción con la lista | No se puede cambiar filtros mientras el Drawer está abierto | Es el comportamiento esperado del Drawer con overlay. Si se necesita interacción simultánea, evolucionar a SplitPane en fase 2. |
| Selección masiva mientras Drawer abierto | El usuario podría perder la selección | Cerrar el Drawer antes de iniciar selección masiva, o simplemente tolerarlo como limitación de UX v1. |
| Rendimiento de tabla al comprimir en splitter (fase 2) | Tabla con muchas columnas comprimida a 60% del ancho | En fase de splitter, ocultar columnas menos importantes cuando el panel está abierto. |

### Reutilización futura

| Riesgo | Descripción | Mitigación |
|---|---|---|
| Hacer el visor demasiado específico a comprobantes | Si `VisorDocumentoComercial` depende de `Comprobante` de lista, no sirve para cotizaciones | Diseñar el visor para que opere únicamente con `InstantaneaDocumentoComercial`, no con el tipo `Comprobante`. |
| Modelo canónico insuficiente para otros documentos | `InstantaneaDocumentoComercial` tiene campos propios de comprobantes (tipo SUNAT, códigos) | Auditar qué campos de cotización no encajan en el modelo antes de extenderlo. Puede requerir un campo `metadatos: Record<string, unknown>` en el modelo o una variante. |
| Inconsistencia entre el Drawer de Clientes y el de Comprobantes | Si se diseñan independientemente acabarán con UX inconsistente | Reutilizar el mismo primitivo `Drawer`. Definir un patrón de headers, secciones y estados vacíos compartido a nivel de sistema de diseño. |
| Duplicar el visor para cada tipo de documento | Un `VisorFactura`, un `VisorCotizacion`, un `VisorNotaVenta` por separado | Usar un único `VisorDocumentoComercial` alimentado por adaptadores de conversión específicos por tipo de documento. El visor no sabe qué tipo es — el adaptador sí. |

---

*Fin del informe. Ningún archivo fue modificado. Ningún código fue escrito.*
