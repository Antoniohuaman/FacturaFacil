# Auditoría Exhaustiva del Módulo de Cotizaciones — SenciYo

---

## Metadata

| Campo | Valor |
|---|---|
| Fecha de auditoría | 2026-06-18 |
| Auditor | Claude Sonnet 4.6 |
| Proyecto | FacturaFacil / SenciYo |
| Rama auditada | `reglasProductos` |
| Ruta analizada | `/documentos-comerciales` → tab **Cotizaciones** |
| Módulo evaluado | `documentos-comerciales` (módulo nuevo, reemplaza `documentos-negociacion`) |
| Metodología | Análisis estático de código fuente: 20 archivos (hooks, contexto, acciones, componentes, utils, tipos) |
| Backend | **Sin backend real — 100% localStorage** |

---

## 1. Resumen Ejecutivo

El módulo de Cotizaciones del nuevo sistema `documentos-comerciales` está bien **estructurado arquitectónicamente** y cubre con solidez el ciclo básico de creación, edición, anulación, impresión, duplicación y exportación. El modelo de datos es completo (8 estados definidos, historial de eventos, trazabilidad de documentos, campos opcionales).

Sin embargo, **los flujos de aprobación, rechazo, cierre perdido y conversión están ausentes en la capa de acciones y en la UI**, aunque sus estados están correctamente tipados. Los botones para "Aprobar", "Rechazar", "Cerrar perdida" y "Convertir cotización" no existen en el menú de acciones. El vencimiento automático tampoco está implementado.

- **Avance funcional estimado:** 55 %
- **Avance técnico estimado:** 80 %
- **Recomendación:** No cerrar. El módulo requiere ajustes funcionales importantes antes de poder considerar las cotizaciones completas.

**Principales riesgos:**
1. Cuatro estados visibles en UI que no tienen ninguna acción que los alcance (Aprobada, Rechazada, Cerrada perdida, Convertida para cotizaciones).
2. Cotización editable después de aprobada: viola la integridad del flujo.
3. Cliente no es campo obligatorio en cotizaciones, lo que produce documentos sin destinatario.
4. Vencimiento es solo un campo de fecha libre sin lógica que lo aplique.

---

## 2. Veredicto

### 🟠 Parcial — Requiere ajustes funcionales importantes

**Justificación:** La base técnica es sólida y el flujo básico (crear, generar, editar, anular, duplicar, imprimir, exportar) funciona correctamente. Pero el ciclo de vida completo de una cotización comercial está incompleto: no existe forma de aprobar, rechazar, cerrar como perdida ni convertir una cotización en el módulo nuevo. Estos flujos son el núcleo del valor de negocio de una cotización.

---

## 3. Archivos Revisados

| Archivo | Responsabilidad | Observación |
|---|---|---|
| `documentoComercial.types.ts` | Tipos e interfaces centrales. Define `EstadoCotizacion`, `DocumentoComercial`, `TrazabilidadDocumentoComercial`, `EventoHistorial` | Completo y bien tipado. 8 estados de cotización declarados correctamente |
| `documentoComercial.constants.ts` | Constantes: labels, estados por tipo, storage keys, columnas default | Bien organizado. `ESTADOS_COTIZACION` contiene los 8 estados esperados |
| `DocumentosComercialesContext.tsx` | Proveedor de estado global con `useReducer`. Acciones: agregar, actualizar, eliminar, recargar | Sólido. Sincroniza con `localStorage`. Escucha evento `documentos_comerciales_changed` |
| `useDocumentoComercialActions.ts` | Hook de acciones: generar, guardar borrador, actualizar, anular, duplicar, eliminar borrador | **Brecha crítica: sin `aprobarDocumento`, `rechazarDocumento`, `cerrarPerdidaDocumento`, ni `convertirCotizacion`** |
| `ListadoDocumentosComerciales.tsx` | Componente compartido: tabla, filtros, paginación, menú de acciones, drawer de detalle, modal de anulación | Muy completo para OV/NV. Para cotizaciones **faltan acciones específicas** (aprobar, rechazar, cerrar perdida, convertir) |
| `FormularioDocumentoComercial.tsx` | Formulario de creación/edición compartido para los 3 tipos de documentos | Funcional. Soporte borrador, generación y edición. Sin diferenciación de reglas por tipo para cotizaciones |
| `FormularioHeaderComercial.tsx` | Sección header del formulario: serie, fecha, cliente, moneda, forma de pago, campos opcionales | Bien construido. Búsqueda de clientes integrada. Cliente no obligatorio para cotizaciones |
| `useDocumentoComercialState.ts` | Hook de estado del formulario (useState por campo) | Correcto y bien separado |
| `useDocumentoComercialType.ts` | Filtra series por tipo de documento | Correcto |
| `useDocumentoComercialFieldsConfig.ts` | Configuración dinámica de campos visibles por tipo | Correcto |
| `useDocumentoComercialDrafts.ts` | Persistencia automática de borrador en progreso en localStorage | Funcional. TTL 14 días |
| `documentoComercial.helpers.ts` | Utilidades: IDs, fechas, correlativos, colores de estado, cálculo de tributos, formato de documentos | Completo. `obtenerColorEstado` cubre todos los estados |
| `documentoComercial.storage.ts` | Carga/guarda documentos en localStorage con soporte tenant y migración legacy | Sólido. Manejo de errores silencioso para cuota |
| `EstadoDocumentoBadge.tsx` | Badge visual del estado con color semántico | Correcto y completo |
| `DocumentoComercialPrintView.tsx` | Vista de impresión del documento | Existe. Integrado con sistema de impresión |
| `DocumentosComerciales.tsx` | Página principal con tabs (Cotizaciones / Notas de Venta / Órdenes de Venta) | Funcional. Badge de conteo muestra total del tipo |
| `DocumentosComercialesLayout.tsx` | Layout wrapper | Presente |
| `FormularioDocumentoComercialPage.tsx` | Página de formulario (nuevo / editar) | Presente |
| `convertirOVaComprobante.ts` | Utilidad para conversión de OV a comprobante | Solo para OV. Cotizaciones no tienen equivalente |
| `servicioReservaStock.ts` | Lógica de reserva/descuento de stock para NV/OV | No aplica a cotizaciones (correcto) |

---

## 4. Flujo Funcional Auditado

| Flujo | Estado | Evidencia | Brecha | Prioridad |
|---|---|---|---|---|
| 1. Crear nueva cotización | ✅ Completo | `handleNuevo` → `/documentos-comerciales/nuevo/cotizacion` → `FormularioDocumentoComercial` | — | — |
| 2. Guardar como borrador | ✅ Completo | `handleGuardarBorrador` → `actions.guardarComoBorrador()` | Cliente no obligatorio en borrador | P1 |
| 3. Generar cotización | ✅ Completo | `handleGenerar` → `actions.generarDocumento()` → estado `Generada` | Cliente no es campo obligatorio para cotizaciones | P1 |
| 4. Editar cotización | 🟡 Parcial | `puedeEditar()` → `handleEditar()` → formulario en modo editar | Permite editar en estado `Aprobada`, violando integridad | P0 |
| 5. Ver detalle | ✅ Completo | Drawer lateral con Detalle e Historial | — | — |
| 6. Aprobar cotización | ❌ No existe | Estado `Aprobada` definido en tipos/constants. No hay acción `aprobarDocumento`. No aparece en menú | Ni botón ni función. Estado inalcanzable | P0 |
| 7. Rechazar cotización | ❌ No existe | Estado `Rechazada` definido en tipos/constants. No hay acción `rechazarDocumento`. No aparece en menú | Ni botón ni función. Estado inalcanzable | P0 |
| 8. Anular cotización | ✅ Completo | `puedeAnular()` → modal con motivo → `actions.anularDocumento()` | Permite anular estados ya terminales (Rechazada, Cerrada perdida, Vencida) | P2 |
| 9. Marcar como vencida | ❌ No existe | Estado `Vencida` definido. `camposOpcionales.fechaVencimiento` existe pero sin lógica de transición automática | Sin job/trigger. Solo visual si se añade manualmente | P0 |
| 10. Cerrar como perdida | ❌ No existe | Estado `Cerrada perdida` definido en tipos/constants. No hay acción. No aparece en menú | Ni botón ni función. Estado inalcanzable | P0 |
| 11. Convertir cotización | ❌ No existe | `puedeConvertir()` solo aplica a `orden_venta`. No hay flujo cotización → NV o cotización → comprobante | Sin ruta de conversión para tipo `cotizacion` | P0 |
| 12. Generar nota de venta desde cotización | ❌ No existe | `puedeGenerarNS()` retorna `false` para tipo `cotizacion`. Sin integración | — | P0 |
| 13. Generar comprobante desde cotización | ❌ No existe | `handleGenerarComprobante` solo acepta OVs validadas. Sin equivalente para cotizaciones | — | P0 |
| 14. Duplicar cotización | ✅ Completo | `handleDuplicar()` → `actions.duplicarDocumento()` → borrador nuevo | — | — |
| 15. Imprimir / descargar | ✅ Completo | `handleImprimir()` A4 y Ticket. Usa `ServicioImpresionComprobante` | Sin descarga PDF directa (solo impresión del navegador) | P2 |
| 16. Trazabilidad y usuario | ✅ Completo | `historial: EventoHistorial[]` con fecha, usuario y acción en cada cambio | — | — |
| 17. Exportar Excel | ✅ Completo | `handleExportarExcel()` respeta columnas visibles y filtros | Totales como texto (`.toFixed(2)`), sin subtotal/IGV | P2 |
| 18. Compartir | ✅ Completo | Email, WhatsApp, copiar texto | — | — |

---

## 5. Estados y Transiciones

### 5.1 Matriz de Estados

| Estado | Existe en tipos | Se muestra en UI (badge) | Tiene filtro | Tiene acción que lo alcanza | Transición válida definida | Observación |
|---|---|---|---|---|---|---|
| Borrador | ✅ | ✅ | ✅ | ✅ (guardar como borrador) | ✅ | Funcional |
| Generada | ✅ | ✅ | ✅ | ✅ (generar) | ✅ | Funcional |
| Aprobada | ✅ | ✅ | ✅ | ❌ **No hay acción** | ❌ | Estado inalcanzable vía UI |
| Rechazada | ✅ | ✅ | ✅ | ❌ **No hay acción** | ❌ | Estado inalcanzable vía UI |
| Cerrada perdida | ✅ | ✅ | ✅ | ❌ **No hay acción** | ❌ | Estado inalcanzable vía UI |
| Convertida | ✅ | ✅ | ✅ | ❌ **No hay conversión para cotizaciones** | ❌ | Estado inalcanzable vía UI para tipo cotizacion |
| Anulada | ✅ | ✅ | ✅ | ✅ (anular) | ✅ | Funcional |
| Vencida | ✅ | ✅ | ✅ | ❌ **Solo campo de fecha, sin lógica** | ❌ | Sin transición automática ni manual |

### 5.2 Matriz de Transiciones

| Estado origen | Acción | Estado destino | Implementado | Correcto | Observación |
|---|---|---|---|---|---|
| (nuevo) | Guardar borrador | Borrador | ✅ Sí | ✅ Sí | Funciona correctamente |
| Borrador | Generar | Generada | ✅ Sí | ✅ Sí | Vía `generarDesdeBorrador()` |
| Borrador | Eliminar | (eliminado) | ✅ Sí | ✅ Sí | Solo para borradores |
| (nuevo) | Generar directo | Generada | ✅ Sí | ✅ Sí | Vía `generarDocumento()` |
| Generada | Editar | Generada (actualizada) | ✅ Sí | 🟡 Parcial | Actualiza sin cambiar estado |
| Generada | Aprobar | Aprobada | ❌ No | ❌ No | Falta función y botón |
| Generada | Rechazar | Rechazada | ❌ No | ❌ No | Falta función y botón |
| Generada | Anular | Anulada | ✅ Sí | ✅ Sí | Con motivo obligatorio |
| Generada | Vencimiento automático | Vencida | ❌ No | ❌ No | Solo campo fecha, sin lógica |
| Aprobada | Editar | Aprobada (actualizada) | ✅ Sí | ❌ No | **Bug**: debería bloquearse la edición post-aprobación |
| Aprobada | Convertir | Convertida | ❌ No | ❌ No | `puedeConvertir()` solo para OV |
| Aprobada | Anular | Anulada | ✅ Sí | 🟡 Discutible | Podría aceptarse con flujo de reversión explícita |
| Rechazada | Anular | Anulada | ✅ Sí (permite) | ❌ No | Anular una rechazada es redundante |
| Cerrada perdida | (cualquier) | — | ❌ No | ❌ No | Sin implementación |
| Convertida | Anular | Bloqueado | ✅ Sí | ✅ Sí | `puedeAnular` excluye 'Convertida' |
| Vencida | Anular | Anulada | ✅ Sí (permite) | 🟡 Discutible | Aceptable pero discutible |

---

## 6. Validaciones Encontradas

### Validaciones existentes

| Validación | Implementada en | Observación |
|---|---|---|
| Serie obligatoria | `validarDatos()` en `useDocumentoComercialActions` | Bloquea generación sin serie |
| Ítems no vacíos | `validarDatos()` | Al menos un producto/servicio |
| Precio y cantidad > 0 | `validarDatos()` | Todos los ítems |
| Motivo de anulación obligatorio | `anularDocumento()` | Verificado en modal y en hook |
| No anular borradores | `anularDocumento()` | Retorna error si `esBorrador` |
| No anular convertidas | `puedeAnular()` | Filtrado en UI |
| No editar OV Reservada | `puedeEditar()` | Solo para OV, cotizaciones siguen editables |
| Cálculo correcto de IGV | `calcularDesgloseTributos()` | Soporta gravado 18%/10%, exonerado, inafecto |
| Redondeo de totales | `calcularTotalesItems()` | Redondeo a 2 decimales con `Math.round` |
| Correlativo sin colisiones | `generarCorrelativoSeguro()` | Max del usado vs config + 1 |

### Validaciones ausentes

| Validación ausente | Riesgo | Prioridad |
|---|---|---|
| **Cliente obligatorio para cotizaciones** | Cotización sin destinatario no tiene valor comercial | P1 |
| **Bloquear edición post-aprobación** | Modifica cotización ya aprobada sin trazar el cambio como reversión | P0 |
| **No aprobar cotización con ítems inválidos** | Sin función aprobar, el riesgo es futuro | P0 |
| **Vencimiento automático al pasar fecha** | `Vencida` no se activa nunca automáticamente | P0 |
| **Bloquear conversión sin aprobación previa** | Si se implementa conversión, debe exigir aprobación | P0 |
| **Evitar anular estados ya terminales** | Rechazada/Cerrada perdida no deberían poder anularse | P2 |
| **Validar producto activo al generar** | Sin validación de producto inactivo en cotizaciones | P2 |
| **Validar cliente activo al generar** | Sin validación de cliente inactivo en cotizaciones | P2 |

### Validaciones incorrectas

| Validación incorrecta | Descripción |
|---|---|
| `puedeEditar` incluye `Aprobada` | Una cotización aprobada NO debería ser editable sin reversión del estado |
| `puedeAnular` permite anular `Rechazada` y `Cerrada perdida` | Estados ya terminales no deberían anularse |
| `errorCliente` solo se establece para `orden_venta` | `setErrorCliente(errorValidacion)` está bajo `if (datos.tipo === 'orden_venta')` en `handleGenerar` |

---

## 7. Filtros, Listado y Columnas

### Hallazgos positivos

- Búsqueda por cliente (nombre), número, serie y vendedor — funcional.
- Filtro por rango de fechas (inicio y fin) — funcional.
- Filtro por estado(s) múltiples con chips visuales — funcional.
- Paginación con selector de 10/25/50 registros — funcional.
- Contador de registros `X–Y de Z` — correcto.
- Columnas configurables con persistencia en localStorage por tipo — funcional.
- Reset de columnas a defaults — funcional.
- Empty state con mensaje contextual ("filtros aplicados" vs "primera cotización") — correcto.
- Scroll horizontal en tabla — implementado con `overflow-x-auto`.
- Ordenamiento por `fechaCreacion` descendente — fijo, sin opción de ordenar por otra columna.

### Hallazgos con brecha

| Hallazgo | Detalle | Prioridad |
|---|---|---|
| **Búsqueda sin N° documento cliente** | El filtro no permite buscar por `numeroDocumento` del cliente directamente. Solo busca si `d.cliente?.numeroDocumento?.includes(q)` — pero sin separación del campo | P2 |
| **Badge de tab muestra total, no activos** | `contarPorTipo(tipo)` cuenta todos los documentos del tipo incluyendo borradores, anulados, vencidos | P2 |
| **Sin ordenamiento configurable** | Solo ordena por fecha de creación descendente. Sin click en cabecera para ordenar por otro campo | P2 |
| **Sin búsqueda por número de documento del cliente** | El campo `N° Doc. Cliente` en columna visible no tiene búsqueda directa por ese campo específico | P2 |
| **Filtros no persisten al volver** | Al navegar al formulario y regresar, los filtros se reinician | P2 |

---

## 8. Acciones y Menú "Más Acciones"

| Acción | Existe | Visible en qué estado | Ejecuta lógica real | Cambia estado | Tiene validaciones | Observación |
|---|---|---|---|---|---|---|
| Ver detalle | ✅ | Todos | ✅ (drawer) | No | — | Funcional |
| Editar / Retomar | ✅ | Borrador, Generada, Aprobada | ✅ | No (solo actualiza) | ❌ Permite editar Aprobada | Bug: debería bloquear Aprobada |
| Duplicar | ✅ | Todos | ✅ | No (crea borrador nuevo) | — | Funcional |
| Imprimir A4 | ✅ | Solo no-borradores | ✅ | No | — | Funcional |
| Imprimir Ticket | ✅ | Solo no-borradores | ✅ | No | — | Funcional |
| Compartir (Email/WA/Copiar) | ✅ | Solo no-borradores | ✅ | No | — | Funcional |
| Anular | ✅ | Generada, Aprobada, Rechazada, Cerrada perdida, Vencida | ✅ | Anulada | ✅ Motivo obligatorio | Permite anular estados ya terminales |
| Eliminar borrador | ✅ | Solo borradores | ✅ | (elimina) | ✅ Solo borradores | Funcional |
| **Aprobar** | ❌ | — | ❌ | ❌ | ❌ | **No implementado. Estado inalcanzable** |
| **Rechazar** | ❌ | — | ❌ | ❌ | ❌ | **No implementado. Estado inalcanzable** |
| **Cerrar perdida** | ❌ | — | ❌ | ❌ | ❌ | **No implementado. Estado inalcanzable** |
| **Convertir** (cotización) | ❌ | — | ❌ | ❌ | ❌ | **`puedeConvertir()` solo aplica a OV** |
| **Generar comprobante** (cotización) | ❌ | — | ❌ | ❌ | ❌ | **Sin implementar para tipo cotizacion** |
| **Generar nota de venta** (desde cotización) | ❌ | — | ❌ | ❌ | ❌ | **`puedeGenerarNS()` retorna false para cotizacion** |

**Resumen:** 8 acciones funcionales, 6 acciones ausentes. Las 6 ausentes son las que distinguen comercialmente a una cotización de un simple documento.

---

## 9. Conversión a Otros Documentos

### Estado actual

**La conversión NO está implementada para cotizaciones.**

La función `puedeConvertir()` tiene esta lógica explícita:
```typescript
function puedeConvertir(doc: DocumentoComercial): boolean {
  return doc.tipo === 'orden_venta' && doc.estado === 'Reservada' && !doc.esBorrador;
}
```

Para una cotización, `doc.tipo === 'orden_venta'` es siempre `false`, por lo que nunca puede convertirse.

### Validación de cada flujo de conversión

| Flujo | Estado | Detalle |
|---|---|---|
| Cotización → Nota de Venta | ❌ No existe | Sin botón, sin función, sin utilidad equivalente a `convertirOVaComprobante.ts` |
| Cotización → Comprobante (directo) | ❌ No existe | `handleGenerarComprobante` solo acepta OVs con validación `validarOVParaConversion()` |
| Cotización → Orden de Venta | ❌ No existe | Sin flujo |
| Copia de datos al documento destino | ❌ No aplica | Sin conversión, no hay copia |
| Referencia al documento origen (trazabilidad) | 🟡 Parcial | El modelo soporta `trazabilidad` pero no se usa al convertir |
| Evita conversiones duplicadas | ❌ No aplica | Sin conversión implementada |
| Cambia estado a Convertida | ❌ No aplica | Sin conversión implementada |

---

## 10. Anulación, Rechazo y Cierre Perdido

### Anulación

| Check | Estado | Detalle |
|---|---|---|
| ¿Existe acción? | ✅ Sí | Menú "Más acciones" → Anular |
| ¿Pide confirmación? | ✅ Sí | Modal de confirmación |
| ¿Pide motivo? | ✅ Sí | Textarea obligatorio |
| ¿Cambia estado? | ✅ Sí | → `Anulada` |
| ¿Bloquea futuras acciones? | ✅ Sí | `puedeAnular` excluye `Anulada`; `puedeEditar` no incluye `Anulada` |
| ¿Afecta documentos relacionados? | ✅ Sí (para NV) | Anula NS vinculada si existe. Para cotizaciones no aplica |
| ¿Evita anular si ya fue convertida? | ✅ Sí | `puedeAnular` excluye `Convertida` |
| ¿Evita anular estados ya terminales? | ❌ No | Permite anular `Rechazada`, `Cerrada perdida`, `Vencida` |

### Rechazo

| Check | Estado | Detalle |
|---|---|---|
| ¿Existe acción? | ❌ No | No hay función `rechazarDocumento` ni botón |
| ¿Pide motivo? | ❌ No aplica | Sin implementación |
| ¿Solo aplica a cotizaciones generadas? | ❌ No aplica | Sin implementación |
| ¿Bloquea conversión? | ❌ No aplica | Sin implementación |

### Cerrada Perdida

| Check | Estado | Detalle |
|---|---|---|
| ¿Existe acción? | ❌ No | No hay función `cerrarPerdidaDocumento` ni botón |
| ¿Pide motivo? | ❌ No aplica | Sin implementación |
| ¿Diferencia correctamente de rechazo? | ❌ No aplica | Sin implementación. El estado existe como tipo diferente |
| ¿Tiene sentido funcionalmente? | ✅ Sí (conceptualmente) | Rechazo = el cliente dice no. Cierre perdido = perdemos ante competencia o no hay respuesta |

---

## 11. Vencimiento de Cotizaciones

| Check | Estado | Detalle |
|---|---|---|
| Campo fecha de vencimiento | ✅ Existe | `camposOpcionales.fechaVencimiento` — campo opcional configurable |
| Estado `Vencida` en tipos | ✅ Existe | En `EstadoCotizacion`, `ESTADOS_COTIZACION`, `ESTADOS_POR_TIPO` |
| Cálculo automático al pasar fecha | ❌ No existe | Sin `useEffect`, sin job, sin evaluación al cargar la lista |
| Transición automática al cargar | ❌ No existe | `documentosFiltrados` no aplica lógica de vencimiento |
| Visualización badge `Vencida` | ✅ Existe | `obtenerColorEstado('Vencida')` → naranja |
| Filtro por estado Vencida | ✅ Existe | Chip de filtro disponible |
| Bloqueo de acciones post-vencimiento | ❌ No existe | `puedeEditar()` permite editar `Vencida` (no está en la lista de bloqueados) |
| Posibilidad de renovar / duplicar | ✅ Parcial | Duplicar crea borrador nuevo. No hay "renovar" explícita |

**Conclusión:** El vencimiento es solo un dato estático. Si el usuario pone fecha de vencimiento `2026-06-10` y hoy es `2026-06-18`, la cotización **no** cambiará automáticamente a `Vencida`. Solo puede llegar a ese estado si se implementa una acción manual o lógica de evaluación al cargar.

---

## 12. Exportación Excel

| Check | Estado | Detalle |
|---|---|---|
| Exporta solo cotizaciones filtradas | ✅ Sí | Usa `documentosFiltrados` que ya filtra por `tipo === 'cotizacion'` |
| Respeta filtros aplicados | ✅ Sí | `documentosFiltrados` incluye búsqueda, fechas, estados |
| Respeta columnas visibles | ✅ Sí | Mapeo `columnasDef.filter(c => c.visible)` |
| N° Cotización | ✅ Sí | Campo `numero` con fallback a `formatearNumeroParaBorrador` |
| Cliente | ✅ Sí | Campo `cliente` |
| Tipo doc. cliente | ✅ Sí | Campo `tipoDocCliente` |
| N° doc. cliente | ✅ Sí | Campo `numeroDocCliente` (solo si columna visible) |
| Fecha emisión | ✅ Sí | Campo `fechaEmision` |
| Fecha vencimiento | ✅ Sí | Campo `fechaVencimiento` |
| Forma de pago | ✅ Sí | Campo `formaPago` |
| Moneda | ✅ Sí | Campo `moneda` |
| Total | 🟡 Texto | `.toFixed(2)` → string, no número. No suma en Excel automáticamente |
| Subtotal | ❌ No exporta | Solo el total final |
| IGV | ❌ No exporta | Solo el total final |
| Estado | ✅ Sí | Campo `estado` |
| Usuario | ✅ Sí | Campo `usuario` |
| Método de envío | ✅ Sí (si visible) | Campo opcional |
| F. Envío previsto | ✅ Sí (si visible) | Campo opcional |
| Requiere aprobación | ✅ Sí (si visible) | Sí/No |
| Nombre de archivo | ✅ Sí | `cotización_YYYY-MM-DD` |
| Formato legible | ✅ Sí | `exportDatasetToExcel` con sheetName correcto |
| Fechas como fecha (no texto) | 🟡 Sin verificar | Depende de `exportDatasetToExcel`; probablemente strings ISO |
| Comportamiento sin registros | ✅ Sí | Warning "No hay documentos para exportar" |
| Comportamiento sin columnas visibles | ✅ Sí | Warning "No hay columnas visibles para exportar" |

**Conclusión:** El exportable es funcional y listo para uso básico. El total como texto es el único problema relevante para uso real.

---

## 11. Hallazgos Técnicos

### Arquitectura

- Componente `ListadoDocumentosComerciales` es compartido por los 3 tipos pero tiene lógica específica de OV (reserva de stock en drawer). Para cotizaciones, esta sección simplemente no renderiza, lo que es correcto.
- La separación UI → Hook de acciones → Contexto → Storage es limpia y bien aplicada.
- Los hooks están bien separados por responsabilidad: state, type (series), actions, fields config, drafts.

### Acoplamiento

- El formulario de cotizaciones reutiliza `ProductsSection` y `NotesSection` de comprobantes electrónicos. Esto es apropiado y evita duplicación.
- La función `buildLineasNSDesdeCartItems` dentro de `ListadoDocumentosComerciales.tsx` accede directamente a `useProductStore.getState()` desde fuera de un hook — patrón correcto para acceso imperativo.

### Tipos

- `EstadoCotizacion` tiene 8 estados. Todos bien definidos y usados en `ESTADOS_COTIZACION`.
- `EstadoDocumentoComercial` es unión de los 3 tipos — gestión correcta.
- La interfaz `DocumentoComercial` es extensa pero coherente. Campos de OV (`reservasStock`, `despachado`, `notaSalidaId`) están marcados como opcionales — correcto.

### Servicios

- `useDocumentoComercialActions` no tiene `aprobarDocumento`, `rechazarDocumento`, ni `cerrarPerdidaDocumento`. Estas funciones deben agregarse para cerrar el módulo.
- La validación de stock aplica solo para NV y OV — correcto para cotizaciones.

### Componentes

- `ListadoDocumentosComerciales.tsx` tiene 1024 líneas. Es el componente más grande del módulo. Tiene responsabilidades de listado, menú de acciones, drawer de detalle, historial, modales de confirmación, impresión, exportación y compartir. Candidato a refactor futuro (P2).

### Persistencia

- Todo en localStorage. La clave es multi-tenant via `tryLsKey`. Migración legacy implementada.
- Capacidad estimada: ~2–5 MB por tenant. Riesgo para empresas con muchas cotizaciones a largo plazo.
- Sincronización entre pestañas vía evento `documentos_comerciales_changed`. Implementado correctamente.

### Manejo de Errores

- Todas las funciones del actions hook retornan `{ exito: boolean, error?: string }` — patrón consistente.
- Errores de localStorage son silenciosos (`catch {}`) — aceptable para producción.
- Feedback al usuario (toast) implementado en todos los flujos existentes.

---

## 12. Brechas Funcionales

| # | Brecha | Impacto | Prioridad | Recomendación |
|---|---|---|---|---|
| B-01 | **Sin acción "Aprobar"** — Estado `Aprobada` definido pero inalcanzable | Alto: flujo de aprobación inoperable | P0 | Agregar `aprobarDocumento()` en actions hook + botón en menú para estado `Generada` |
| B-02 | **Sin acción "Rechazar"** — Estado `Rechazada` definido pero inalcanzable | Alto: vendedor no puede registrar rechazo del cliente | P0 | Agregar `rechazarDocumento(id, motivo)` + botón para estado `Generada` o `Aprobada` |
| B-03 | **Sin acción "Cerrar perdida"** — Estado `Cerrada perdida` definido pero inalcanzable | Medio: no se puede registrar cierre por competencia sin pasar por rechazo | P0 | Agregar `cerrarComoPerdida(id, motivo)` + botón con semántica diferenciada |
| B-04 | **Sin conversión de cotización** — `puedeConvertir()` excluye tipo `cotizacion` | Alto: el propósito final de una cotización es convertirse | P0 | Implementar flujo cotización → NV y/o cotización → comprobante. Actualizar `puedeConvertir()` |
| B-05 | **Sin vencimiento automático** — Fecha de vencimiento sin lógica de transición | Medio: la cotización nunca envejece automáticamente | P0 | Agregar evaluación al cargar `documentosFiltrados`: si fecha vencimiento < hoy y estado `Generada`/`Aprobada` → marcar como `Vencida` (o propuesta visual + actualización lazy) |
| B-06 | **Editar cotización aprobada** — `puedeEditar()` devuelve `true` para estado `Aprobada` | Medio: viola integridad del ciclo de aprobación | P0 | Remover `Aprobada` de la lista en `puedeEditar()`. Quien quiera editar debe revertir/anular la aprobación primero |
| B-07 | **Cliente no obligatorio para cotizaciones** | Medio: cotización sin cliente no tiene destinatario comercial | P1 | En `validarDatos()`, agregar validación de cliente para tipo `cotizacion` en modo "generar" |
| B-08 | **Sin generar comprobante desde cotización aprobada** | Alto: imposibilita la conversión al comprobante final sin pasar por OV o NV | P1 | Extender `handleGenerarComprobante` para tipo `cotizacion` con estado `Aprobada` o `Convertida` |
| B-09 | **Sin generar nota de venta desde cotización** | Alto: conversión cotización → NV no disponible | P1 | Extender `handleGenerarNS` o crear `handleConvertirACotizacion` |
| B-10 | **Badge de tab cuenta todos, no solo activos** | Bajo: conteo confuso incluye borradores y anulados | P2 | Filtrar conteo: `ctxState.documentos.filter(d => d.tipo === tipo && !d.esBorrador && d.estado !== 'Anulada')` |
| B-11 | **Total como texto en Excel** | Bajo: dificulta cálculos automáticos en Excel | P2 | Cambiar `total: doc.totales.total.toFixed(2)` a `total: doc.totales.total` (número) |
| B-12 | **Sin subtotal/IGV en exportación Excel** | Bajo: datos contables incompletos en el export | P2 | Agregar columnas `subtotal` e `igv` al mapping de Excel |
| B-13 | **Anular estados ya terminales** | Bajo: semántica confusa | P2 | En `puedeAnular()` excluir `Rechazada`, `Cerrada perdida`, `Vencida` para cotizaciones |
| B-14 | **Sin ordenamiento en tabla** | Bajo: experiencia de usuario degradada con muchos registros | P2 | Agregar sort por clic en cabeceras de columna |
| B-15 | **Filtros no persisten al volver** | Bajo: frustrante en uso real | P2 | Persistir filtros en `sessionStorage` o en URL params |

**Resumen de prioridades:** 6 P0 · 3 P1 · 6 P2

---

## 13. Recomendación Final

### Puede darse por correcto

- Creación, edición y generación de cotizaciones (flujo básico).
- Guardar como borrador con recuperación automática.
- Anulación con motivo y registro en historial.
- Duplicación con apertura directa en formulario.
- Impresión A4 y Ticket.
- Compartir por email, WhatsApp y copiar texto.
- Exportación Excel con columnas configurables y respeto de filtros.
- Drawer de detalle con Historial de eventos.
- Filtros básicos (búsqueda, fecha, estado).
- Columnas configurables con persistencia.
- Paginación y selector de registros.
- Badge de estado visual coherente.

### Falta antes de cerrar (historia de corrección necesaria)

1. Implementar acciones: **Aprobar**, **Rechazar**, **Cerrar perdida** con sus respectivos modales y registro en historial.
2. Implementar conversión: **cotización → nota de venta** y **cotización → comprobante** (definir qué requiere aprobación previa).
3. Implementar vencimiento automático o al menos una evaluación lazy al cargar el listado.
4. Corregir `puedeEditar()` para bloquear cotizaciones en estado `Aprobada`.
5. Agregar validación de cliente obligatorio para generar cotizaciones.

### Debería pasar a una historia aparte (scope futuro)

- Ordenamiento de tabla por columnas.
- Persistencia de filtros en sesión.
- Notificaciones proactivas de cotizaciones próximas a vencer.
- Total como número en Excel + columnas subtotal/IGV.
- Refactor de `ListadoDocumentosComerciales.tsx` para separar drawer y modales.
- Permisos por rol (aprobar, rechazar, convertir).

### No corresponde al alcance de cotizaciones

- Descuento de stock (correcto: las cotizaciones no tocan inventario).
- Reserva de stock (solo aplica a OV).
- Emisión electrónica directa (se delega al módulo de comprobantes).

---

## 14. Checklist Final

| Funcionalidad | Estado |
|---|---|
| Crear cotización | ✅ Completo |
| Editar cotización | 🟡 Parcial (permite editar Aprobada) |
| Generar cotización | ✅ Completo |
| Aprobar | ❌ No implementado |
| Rechazar | ❌ No implementado |
| Anular | ✅ Completo |
| Cerrar perdida | ❌ No implementado |
| Vencer (automático) | ❌ No implementado |
| Convertir (cotización → NV / comprobante) | ❌ No implementado |
| Generar comprobante desde cotización | ❌ No implementado |
| Generar nota de venta desde cotización | ❌ No implementado |
| Exportar Excel | 🟡 Parcial (totales como texto, sin subtotal/IGV) |
| Filtros | ✅ Completo |
| Columnas configurables | ✅ Completo |
| Estados visibles con badge | ✅ Completo |
| Validaciones del formulario | 🟡 Parcial (cliente no obligatorio para cotizaciones) |
| Trazabilidad / Historial | ✅ Completo |
| Duplicar | ✅ Completo |
| Imprimir / Compartir | ✅ Completo |
| Ver detalle | ✅ Completo |
| Borrador en progreso (recuperación) | ✅ Completo |
| Eliminación de borrador | ✅ Completo |

**Totales del checklist:**
- ✅ Completo: 12
- 🟡 Parcial: 3
- ❌ No implementado: 6
