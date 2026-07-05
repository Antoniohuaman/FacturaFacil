# Auditoría funcional exhaustiva — Módulo Compras (SenciYo)

**Fecha:** 2026-07-02
**Alcance:** Auditoría de campos, columnas, acciones, estados, totales, relaciones, exportables, filtros y validaciones del módulo `features/compras/` contrastado contra el alcance funcional esperado (inspirado en "Compras y Pagos" de Negocios Online, sin copiar su diseño visual).
**Tipo de tarea:** Solo auditoría. No se modificó código funcional.
**Base revisada:** `apps/senciyo/src/pages/Private/features/compras/` completo (paginas, componentes, contexto, modelos, servicios, repositorios, mapeadores, logica, utilidades, constantes) + rutas, sidebar, permisos, configuración de series/monedas/medios de pago/unidades/impuestos/cajas, gestión de clientes/proveedores, catálogo de productos, inventario/almacenes.

**Convenciones de estado:**
- ✅ Existe completo
- 🟡 Existe parcial / incompleto
- ❌ No existe
- ⚠️ Existe pero mal aplicado
- N/A No aplica en SenciYo nuevo

**Convenciones de prioridad:** P0 bloqueante · P1 importante · P2 mejora

---

## Actualización Etapa 2.1 (2026-07-02) — Cierre de integridad pendiente

Corrección quirúrgica posterior a esta auditoría, sin tocar el puente Nota de Ingreso/Inventario ni permisos granulares. El veredicto general de la sección 20 **se mantiene** (❌ NO APROBADO): BR-01 (Inventario) y los permisos granulares del ítem 1.25 siguen pendientes tal como se documentó.

**Brechas cerradas:**
- **Regla nueva:** todo Comprobante de Compra registrado genera Cuenta por Pagar, sea contado o crédito — contado ya no marca `estadoPago:'pagado'` automáticamente ni salta la generación de CxP. El pago sigue siendo 100% manual desde Cuentas por Pagar (`servicios/servicioCuentaPorPagar.ts`, `mapeadores/mapeadorCCaCuentaPorPagar.ts`, `contexto/ContextoCompras.tsx`).
- **BR-02** (generar CC desde OC no aprobada): `registrarComprobanteCompra` ahora revalida `puedeGenerarCCDesdeOC` en el contexto, no solo en la UI.
- **BR-03** (sobrefacturación OC→CC): conectadas `calcularEstadoFacturacion` (antes huérfana en `utilidades/calcularEstadosCompra.ts`) y nuevas `validarCantidadesFacturablesDesdeOC`/`aplicarFacturacionALineasOC` en `logica/reglasCompras.ts`; `estadoFacturacion` de la OC ya no se fija a `'completa'` de forma incondicional, y se bloquea generar un CC si la OC ya está facturada por completo o si la cantidad facturada supera lo pendiente por línea.
- **BR-08** (asimetría de validaciones CC vs OC): `validarLineasCompra` (única fuente para OC y CC) ahora valida también cantidad&gt;0, costo&gt;=0 y descripción obligatoria en líneas libres; se eliminó el chequeo duplicado que solo existía en `servicioOrdenCompra.ts`. `servicioComprobanteCompra.ts` ahora exige moneda y forma de pago, igual que OC.
- **BR-14** (pago &gt; saldo sin bloqueo de servicio): nueva `validarPagoNoExcedeSaldo` en `servicioPagoCompra.ts`, invocada desde `registrarPagoCompra` antes de tocar caja/CxP.
- **BR-07** (caja cerrada al anular pago): `anularPagoCompra` bloquea la anulación completa si el pago impactó caja y esta está cerrada, en vez de omitir la compensación en silencio.
- **BR-15** (cuenta bancaria sin filtrar por moneda): `ModalRegistrarPagoCompra.tsx` ahora solo ofrece cuentas bancarias en la moneda del documento y bloquea el registro si un medio bancario no tiene ninguna cuenta compatible.

**Pendiente residual no cubierto por esta etapa:** el módulo compartido de Caja (`control-caja/context/CajaContext.tsx`) puede resolver `agregarMovimiento` sin lanzar excepción cuando el usuario no tiene el permiso `caja.movimientos.registrar` (a diferencia del caso "caja cerrada", que sí queda cubierto por los chequeos de `estadoCaja` ya existentes). Corregirlo requeriría tocar ese contexto compartido con otros módulos (Cobranzas, POS), fuera del alcance quirúrgico de esta etapa.

---

## 1. MÓDULO GENERAL COMPRAS

**Submódulo:** Página principal · **Pantalla:** `paginas/PaginaCompras.tsx`

| # | Ítem esperado | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 1.1 | Página principal Compras | ✅ | `paginas/PaginaCompras.tsx` + `ComprasLayout` proveyendo `ComprasProvider` | — | — |
| 1.2 | Tab Órdenes de Compra | ✅ | `PaginaCompras.tsx:39-44` (`tabs`), contenido `173-207` | — | — |
| 1.3 | Tab Comprobantes de Compra | ✅ | ídem | — | — |
| 1.4 | Tab Cuentas por Pagar | ✅ | ídem | — | — |
| 1.5 | Tab Pagos | ✅ | ídem | — | — |
| 1.6 | Contadores por tab | 🟡 | `PaginaCompras.tsx:137-140` calcula badge para OC, CC y CxP (pendientes) | Falta contador en tab "Pagos" (sin rama `if (tab.id==='pagos')`) | P2 |
| 1.7 | Búsqueda general por número/proveedor/RUC | ✅ | Implementada por tab, no global: `TablaOrdenesCompra.tsx:124-133`, `TablaComprobantesCompra.tsx:106-115`, `TablaCuentasPorPagar.tsx:108-117`, `TablaPagosCompra.tsx:94-103`, lógica en `logica/filtrosCompras.ts` | — | — |
| 1.8 | Filtros por estado | ✅ | Un select por tabla (`TablaOrdenesCompra.tsx:134-149`, etc.) | — | — |
| 1.9 | Filtros por fecha | 🟡 | Tipos `FiltrosOC/CC/CxP/Pagos` soportan `fechaDesde/fechaHasta` y `filtrarX` los aplica (`logica/filtrosCompras.ts`), pero **ningún** `Tabla*.tsx` renderiza un input de fecha para setearlos | Agregar inputs de rango de fecha en las 4 tablas — la lógica ya existe, solo falta la UI | P1 |
| 1.10 | Filtros por vencimiento | ✅ (solo CxP, correcto por alcance) | `TablaCuentasPorPagar.tsx:134-148` vigente/por_vencer/vencida | — | — |
| 1.11 | Botón "Nueva OC" | ✅ | `TablaOrdenesCompra.tsx:150-156` | — | — |
| 1.12 | Botón "Registrar CC" | ✅ | `TablaComprobantesCompra.tsx:126-132` | — | — |
| 1.13 | Botón "Registrar Pago" | 🟡 | No es botón de cabecera; es acción por fila/detalle desde CxP (`TablaCuentasPorPagar.tsx:271-277`, pie de `PanelDetalleCuentaPorPagar`) | Diseño válido (el pago requiere elegir CxP primero), no requiere corrección | — |
| 1.14 | Empty states | ✅ | Presentes en las 4 tablas, con variante "sin datos" vs "filtro sin resultados" | — | — |
| 1.15 | Paginación | ❌ | Ninguna de las 4 tablas pagina; se renderiza el array filtrado completo, solo hay contador de texto "Mostrando X de Y" | Implementar paginación real (offset/limit) en las 4 tablas | P1 |
| 1.16 | Selector de filas por página | ❌ | Consecuencia directa de 1.15 | — | P2 |
| 1.17 | Acciones por fila | ✅ | Menú contextual `MoreHorizontal` en las 4 tablas | — | — |
| 1.18 | Detalle lateral/drawer | ✅ | Las 4 entidades usan el componente compartido `@/shared/ui/drawer/Drawer` | — | — |
| 1.19 | Exportación de listados | ❌ | Cero funciones/botones de exportación en todo el árbol `compras/` (grep exhaustivo sin resultados) | Implementar exportación (CSV/Excel) para las 4 tablas | P1 |
| 1.20 | Impresión o descarga | ❌ | Ninguna referencia real a imprimir/descargar/PDF en el módulo | Ver sección 16 | P1 |
| 1.21 | Envío por correo | ❌ | Ninguna referencia real | Ver sección 16 | P2 |
| 1.22 | Trazabilidad entre documentos (visible en UI) | 🟡 | Los datos de relación existen en los modelos, pero ningún panel de detalle los muestra (ver sección 17) | Exponer relaciones OC↔CC↔CxP↔Pago en los detalles | P1 |

**Submódulo:** Navegación / Permisos

| # | Ítem | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 1.23 | Ruta `/compras` registrada | ✅ | `routes/privateRoutes.tsx:138-144`, envuelta en `ComprasLayout` | — | — |
| 1.24 | Guard de permiso en la ruta | 🟡 | Solo `compras.ordenes.ver` protege toda la página (`privateRoutes.tsx:142`); los otros tabs no tienen guard de ruta propio | Aceptable si el control es a nivel de tab; ver 1.25 para el problema real | P2 |
| 1.25 | Permisos granulares por acción | ⚠️ | Catálogo define 12 permisos (`configuracion-sistema/roles/catalogoPermisos.ts:355-424`: `compras.ordenes.{ver,crear,editar,aprobar,anular}`, `compras.comprobantes.{ver,registrar,anular}`, `compras.cuentas_por_pagar.ver`, `compras.pagos.{ver,registrar,anular}`) pero **solo los 4 `.ver` se usan** (route guard + sidebar + roles por defecto). Los 8 restantes (crear/editar/aprobar/anular OC, registrar/anular CC, registrar/anular pago) están definidos pero **nunca se verifican** en ningún componente/contexto de Compras | Aplicar `usePermiso`/`tienePermiso` en los botones y en `ContextoCompras` antes de aprobar/rechazar/anular OC, anular CC, registrar/anular pago. Hoy cualquier usuario con acceso a ver el módulo puede ejecutar todas las acciones | **P0** |
| 1.26 | Compras en el sidebar | ✅ | `layouts/components/SideNav.tsx:120-123,182-187,216` | — | — |

---

## 2. ÓRDENES DE COMPRA — LISTADO

**Submódulo:** Órdenes de Compra · **Pantalla:** `componentes/listados/TablaOrdenesCompra.tsx`

### Columnas

| # | Columna | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 2.1 | Checkbox de selección | ❌ | No existe en toda la tabla (líneas 172-233) | Sin selección múltiple no hay acciones masivas | P2 |
| 2.2 | N° Documento/Orden | ✅ | `TablaOrdenesCompra.tsx:175,191` | — | — |
| 2.3 | RUC/DNI | 🟡 | Se muestra como subtexto bajo el proveedor (línea 196), sin columna/etiqueta propia | — | P2 |
| 2.4 | Proveedor | ✅ | `TablaOrdenesCompra.tsx:176,192-196` | — | — |
| 2.5 | Fecha Documento | ✅ | `TablaOrdenesCompra.tsx:177,198` | — | — |
| 2.6 | Fecha Registro | ❌ | Modelo tiene `fechaCreacion` (`OrdenCompra.ts:107`) pero no hay columna | Agregar columna | P2 |
| 2.7 | Comprador | ❌ | Modelo tiene `compradorNombre` (`OrdenCompra.ts:73`) pero no se muestra en la tabla | Agregar columna o al menos filtro (ver 2.15) | P1 |
| 2.8 | Estado (documento) | ✅ | `TablaOrdenesCompra.tsx:179,203-209` | — | — |
| 2.9 | Estado de aprobación | ✅ | `TablaOrdenesCompra.tsx:180,210-219` | — | — |
| 2.10 | Estado de recepción | ❌ | Sin columna ni referencia a `oc.estadoRecepcion` | Bloqueado hasta que exista flujo de recepción real (ver sección 12) | P2 |
| 2.11 | Estado de facturación | ❌ | Sin columna ni referencia a `oc.estadoFacturacion` | — | P1 |
| 2.12 | Estado de inventario | ❌ | Sin columna ni referencia a `oc.estadoInventario` | — | P2 |
| 2.13 | Moneda | 🟡 | Sufijo pequeño junto al total (línea 201), no columna propia | — | P2 |
| 2.14 | Total | ✅ | `TablaOrdenesCompra.tsx:178,199-202` | — | — |
| 2.15 | Acciones | 🟡 | Menú contextual `MoreHorizontal`, no botones directos (decisión de diseño válida) | — | — |

### Funciones de listado

| # | Función | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 2.16 | Buscar por número de OC | ✅ | `filtrosCompras.ts:20-29` | — | — |
| 2.17 | Buscar por proveedor | ✅ | ídem | — | — |
| 2.18 | Buscar por RUC/DNI | ✅ | ídem | — | — |
| 2.19 | Filtro por estado | 🟡 | Solo `estadoDocumento` (4 opciones fijas); `FiltrosOC.estadoAprobacion` existe en lógica (`filtrosCompras.ts:13,31`) pero **sin `<select>` en la UI** | Agregar select de estado de aprobación | P1 |
| 2.20 | Filtro por fecha | ❌ | Soportado en lógica, sin UI (ver 1.9) | — | P1 |
| 2.21 | Filtro por comprador | ❌ | Ni en `FiltrosOC` ni en UI | — | P2 |
| 2.22 | Paginación | ❌ | Ver 1.15 | — | P1 |
| 2.23 | Selector de filas por página | ❌ | — | — | P2 |
| 2.24 | Botón Nueva OC | ✅ | `TablaOrdenesCompra.tsx:150-156` | — | — |
| 2.25 | Exportar listado | ❌ | — | — | P1 |
| 2.26 | Ver detalle | ✅ | Click en fila + menú "Ver detalle" | — | — |
| 2.27 | Editar | ❌ | `puedeEditarOC` (`logica/reglasCompras.ts:8-10`) está **definida pero huérfana** — cero consumidores en toda la UI | Implementar edición de OC en estado borrador/registrado sin derivados, o documentar como pendiente explícito | P1 |
| 2.28 | Duplicar | ❌ | Sin ninguna referencia en el módulo | Fase futura | P2 |
| 2.29 | Anular | ✅ | Menú "Anular OC" + `ModalAnularCompra`, gateado por `puedeAnularOC`/`motivoBloqueoAnulacionOC` | — | — |
| 2.30 | Aprobar | ✅ | Menú "Aprobar/Rechazar" + `ModalAprobarRechazarOC`, gateado por `puedeAprobarOC` en la UI | Ver 1.25 y sección 19 (falta re-validación de servicio) | P0 (por el gap de servicio) |
| 2.31 | Desaprobar/Rechazar | ✅ | Mismo modal combinado | Igual observación que 2.30 | P0 |
| 2.32 | Generar Comprobante Compra | ✅ | Menú "Generar comprobante", gateado por `puedeGenerarCCDesdeOC` | Ver sección 19: no bloquea generar un **segundo** CC desde la misma OC | P0 |
| 2.33 | Generar Nota de Ingreso/vincular Inventario | ❌ | Sin botón ni acción en toda la tabla/menú | Ver sección 12 | P1 |
| 2.34 | Imprimir/descargar | ❌ | — | Ver sección 16 | P1 |
| 2.35 | Enviar por correo | ❌ | — | Ver sección 16 | P2 |

### Estados esperados vs. implementados

| Dimensión | Valores implementados | Cobertura vs. esperado |
|---|---|---|
| `EstadoDocumentoOC` (`modelos/OrdenCompra.ts:7`) | `borrador \| registrado \| cerrado \| anulado` | 🟡 `'borrador'` es **inalcanzable**: `registrarOrdenCompra` siempre crea con `'registrado'` (`ContextoCompras.tsx:330`), no hay botón "Guardar borrador" |
| `EstadoAprobacionOC` (`:8`) | `no_requiere \| pendiente \| aprobada \| rechazada` | ✅ cubre Por aprobar/Aprobado/Rechazado |
| `EstadoRecepcionOC` (`:9`) | `pendiente \| parcial \| completa \| no_aplica` | 🟡 tipado completo, pero congelado en `'pendiente'` para siempre (nunca se actualiza, ver sección 12) |
| `EstadoFacturacionOC` (`:10`) | `pendiente \| parcial \| completa \| no_aplica` | ⚠️ se fuerza a `'completa'` de forma incondicional al generar cualquier CC (`ContextoCompras.tsx:499`), sin comparar cantidades — `'parcial'` nunca se alcanza en la práctica |
| `EstadoInventarioOC` (`:11`) | `pendiente \| parcial \| completo \| automatico \| no_aplica` | 🟡 congelado en `'pendiente'` (mismo problema que recepción) |

---

## 3. ÓRDENES DE COMPRA — FORMULARIO

**Submódulo:** Órdenes de Compra · **Pantalla:** `componentes/formularios/FormularioOrdenCompra.tsx`

### Cabecera / documento

| # | Campo | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 3.1 | Documento tipo (A5/interno) | ❌ | `tipoDocumento:'orden_compra'` es constante fija (`OrdenCompra.ts:52`) | N/A si se acepta que OC siempre es un único tipo interno | — |
| 3.2 | Serie | ✅ | `FormularioOrdenCompra.tsx:56-58,74,417-436` desde `config.series` | — | — |
| 3.3 | Número/correlativo | 🟡 | Autogenerado (`ContextoCompras.tsx:176-183,321-322`), no se previsualiza en el formulario | Mostrar preview del próximo número, como sí se hace en Pago | P2 |
| 3.4 | Tipo de operación | ❌ | No existe en modelo ni formulario | Fase futura (alineado con Ventas si se requiere) | P2 |
| 3.5 | Fecha documento/emisión | ✅ | `FormularioOrdenCompra.tsx:75-77,492-500` | — | — |
| 3.6 | Fecha registro | ✅ (autogenerada, correcto) | `ContextoCompras.tsx:344` | — | — |
| 3.7 | Comprador | 🟡 | Texto fijo = usuario de sesión, no seleccionable (`FormularioOrdenCompra.tsx:470-476`) | Decisión ya documentada: no existe selector de usuarios en el sistema, correcto no inventarlo | — |
| 3.8 | Método de envío | ❌ | No existe en modelo ni formulario | Fase futura | P2 |
| 3.9 | Fecha envío previsto | ✅ | `FormularioOrdenCompra.tsx:79-81,513-522` | — | — |
| 3.10 | Fecha vencimiento | ✅ | `FormularioOrdenCompra.tsx:78,502-511` | — | — |
| 3.11 | Moneda | ✅ | `FormularioOrdenCompra.tsx:82,438-452` | — | — |
| 3.12 | Tipo de cambio | ✅ | `FormularioOrdenCompra.tsx:83,454-468`, condicional a moneda≠base | — | — |
| 3.13 | Requiere aprobación | ✅ | `FormularioOrdenCompra.tsx:87-89,549-558` | — | — |
| 3.14 | Cargo (del comprador) | ❌ | No existe | Fase futura | P2 |
| 3.15 | Observaciones | ✅ | `FormularioOrdenCompra.tsx:92,561-570` | — | — |
| 3.16 | Adjuntos | ✅ | `FormularioOrdenCompra.tsx:93,848-858` vía `AdjuntosCompra` | — | — |

### Proveedor

| # | Campo | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 3.17 | Proveedor / RUC-DNI / Razón social | ✅ | `BuscadorProveedor.tsx` integrado | — | — |
| 3.18 | Dirección facturación | ✅ | `FormularioOrdenCompra.tsx:68-70,388-397` | — | — |
| 3.19 | Dirección envío/entrega | ✅ | `FormularioOrdenCompra.tsx:71-73,398-407` | — | — |
| 3.20 | Contacto | ❌ | `proveedorContactoId` existe en modelo (`OrdenCompra.ts:69`) sin UI; `Cliente` no tiene estructura de contactos | Fase futura, requiere modelo de contactos en Gestión de Clientes | P2 |
| 3.21 | Teléfono/correo del contacto | ❌ | No existe | Depende de 3.20 | P2 |
| 3.22 | Crear proveedor si no existe | ✅ | `BuscadorProveedor.tsx:111-159` (consulta SUNAT/RENIEC) + `persistirProveedorSiEsNuevo` (`servicios/servicioProveedorCompras.ts`) llamado tras registrar OC/CC — corregido en Etapa 2 (antes quedaba como "proveedor fantasma") | — | — |
| 3.23 | Autocompletado de datos | ✅ | `BuscadorProveedor.tsx:56-73` debounce 250ms | — | — |

### Condiciones comerciales

| # | Campo | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 3.24 | Forma de pago | ✅ | `FormularioOrdenCompra.tsx:84-86,479-489` | — | — |
| 3.25 | Condición de crédito | 🟡 | Solo binario contado/crédito; `condicionesPago?:string` existe en modelo (`OrdenCompra.ts:79`) sin campo de captura en el formulario | Agregar campo o documentar como no aplicable a Fase 1 | P2 |
| 3.26 | Plazo | ❌ | No existe explícito (solo fecha de vencimiento manual) | — | P2 |
| 3.27 | Cuotas | ❌ | Sin soporte de cronograma en OC | Fase 2 (ya coincide con diseño de CxP de cuota única) | P2 |
| 3.28 | Centro de costo | ✅ (como campo) / ❌ (como catálogo) | `FormularioOrdenCompra.tsx:90,524-534`, input libre, comentario explícito "sin fuente de verdad definida aún" | Definir catálogo si se requiere control presupuestal real | P2 |
| 3.29 | Presupuesto | ✅ (como campo) / ❌ (como catálogo) | `FormularioOrdenCompra.tsx:91,536-546`, mismo patrón | — | P2 |
| 3.30 | Moneda / Tipo de cambio | ✅ | Ver 3.11-3.12 | — | — |

### Ítems de OC

| # | Campo | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 3.31 | Producto (catálogo) | ✅ | Vía `ProductSelector` compartido con Ventas | — | — |
| 3.32 | Código/SKU | ✅ | `FormularioOrdenCompra.tsx:636-638` | — | — |
| 3.33 | Descripción | ✅ | `FormularioOrdenCompra.tsx:628-635` | — | — |
| 3.34 | Cantidad | ✅ | `FormularioOrdenCompra.tsx:654-665` | — | — |
| 3.35 | Unidad de medida | ✅ | Select desde `config.units` (corregido en Etapa 2 — antes era texto libre) | — | — |
| 3.36 | Almacén destino | 🟡 | Visible solo si `afectaInventario=true`; no hay bloqueo visual previo al submit si falta (la validación real vive en el servicio) | Feedback de campo antes del submit | P2 |
| 3.37 | Precio/costo unitario | ✅ | `FormularioOrdenCompra.tsx:666-677` | — | — |
| 3.38 | Descuento unitario | ✅ | `FormularioOrdenCompra.tsx:751-766` | — | — |
| 3.39 | Descuento total (por línea) | ❌ | Modelo tiene `descuentoTotal?` (`LineaCompra.ts:51`) pero no se calcula/muestra por línea, solo el agregado | — | P2 |
| 3.40 | Afectación/impuesto | ✅ | Select Grav./Exon./Inaf. | — | — |
| 3.41 | IGV (por línea) | 🟡 | Se calcula pero no se muestra columna de IGV por línea en el formulario | — | P2 |
| 3.42 | ISC | ❌ | `TipoAfectacionCompra` no contempla ISC | Fase futura si aplica a compras con ISC | P2 |
| 3.43 | No gravado | 🟡 | Cubierto implícitamente por inafecto/exonerado, sin categoría propia | — | P2 |
| 3.44 | Total de línea | ✅ | `FormularioOrdenCompra.tsx:691-693` | — | — |
| 3.45 | Clasificación (producto/servicio/gasto/suministro/activo_fijo) | ✅ | Select con las 5 opciones | — | — |
| 3.46 | Afecta inventario | ✅ | Checkbox, deshabilitado si activo_fijo | — | — |
| 3.47 | Stock disponible informativo | ❌ | Ninguna visualización de stock al seleccionar producto | — | P2 |
| 3.48 | Selección múltiple (catálogo) | ✅ | `ProductSelector.onAddProducts` soporta arreglo | — | — |
| 3.49 | Histórico de productos | ❌ | Sin referencia a historial de compras por producto/proveedor | Fase futura | P2 |
| 3.50 | Agregar / Eliminar / Editar línea | ✅ | Completo | — | — |
| 3.51 | Línea libre para gasto/servicio | ✅ | Botón "Línea libre" | — | — |

### Totales de OC

| # | Total | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 3.52 | Base imponible/monto imponible | ✅ | "Subtotal" | — | — |
| 3.53 | Descuentos | ✅ | Condicional si &gt;0 | — | — |
| 3.54 | ISC | ❌ | Sin cálculo en `calcularTotalesLineas` | Fase futura | P2 |
| 3.55 | Impuesto/IGV | ✅ | — | — | — |
| 3.56 | Exonerado | ✅ | — | — | — |
| 3.57 | Inafecto | ✅ | — | — | — |
| 3.58 | Exportación | ❌ | No existe tipo de afectación "exportación" | — | P2 |
| 3.59 | No gravados | 🟡 | Cubierto por inafecto/exonerado combinados | — | P2 |
| 3.60 | OTC | ❌ | Sin referencia | N/A a menos que se defina alcance | P2 |
| 3.61 | IVAP / Monto Imponible IVAP | ❌ | Sin referencia | N/A a menos que aplique al rubro del negocio | P2 |
| 3.62 | R.CONS.10% | ❌ | Sin referencia | N/A salvo necesidad tributaria específica | P2 |
| 3.63 | Total | ✅ | — | — | — |

### Botones y validaciones

| # | Ítem | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 3.64 | Generar/Registrar OC | ✅ | `handleSubmit` → `registrarOrdenCompra` | — | — |
| 3.65 | Guardar borrador | ❌ | Sin botón; `'borrador'` inalcanzable | Implementar o eliminar el estado del tipo si no se usará | P2 |
| 3.66 | Cancelar | ✅ | — | — | — |
| 3.67 | Validaciones (proveedor, serie, fecha, ítems, cantidad, costo, vencimiento, envío, almacén, estados) | Ver detalle completo en sección 19 | — | — | — |

---

## 4. ÓRDENES DE COMPRA — DETALLE

**Submódulo:** Órdenes de Compra · **Pantalla:** `componentes/detalle/PanelDetalleOrdenCompra.tsx` (Drawer, tabs General/Ítems/Adjuntos/Historial)

| # | Ítem | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 4.1 | Cabecera con 5 badges de estado | ✅ | `PanelDetalleOrdenCompra.tsx:87-97` — único lugar de la app que muestra los 5 juntos | — | — |
| 4.2 | Datos principales (proveedor, comprador, fechas, moneda, forma pago, centro costo, direcciones, observaciones) | ✅ | Tab General, líneas 134-212 | — | — |
| 4.3 | Ítems: almacén, producto, código, unidad, cantidad, costo, total | 🟡 | Código y unidad como subtexto, no columnas propias | Cosmético | P2 |
| 4.4 | Ítems: cantidad recibida | ❌ | Campo existe en modelo (`LineaCompra.ts:38`) pero no se renderiza | Central para auditar recepción parcial — ver sección 12 | P1 |
| 4.5 | Ítems: cantidad facturada | ❌ | Campo existe (`LineaCompra.ts:39`), no se renderiza | — | P1 |
| 4.6 | Ítems: cantidad pendiente (recepción/facturación/inventario) | ❌ | 3 campos existen (`LineaCompra.ts:42-46`), ninguno se renderiza | — | P1 |
| 4.7 | Ítems: afectación tributaria por línea | ❌ | Solo se muestra "Clasificación" (campo distinto) | — | P2 |
| 4.8 | Ítems: IGV por línea | ❌ | Solo IGV agregado en el resumen | — | P2 |
| 4.9 | Totales (subtotal, exonerado, inafecto, descuentos, IGV, total) | ✅ | Tab Ítems, resumen | — | — |
| 4.10 | Adjuntos: subir/eliminar desde el detalle | ❌ | Montado sin `onAgregar`/`onEliminar` → modo solo lectura forzado | Decisión de diseño razonable para un panel de "ver", pero impide adjuntar tras registrar la OC | P2 |
| 4.11 | Adjuntos: ver / formatos / límites | ✅ | Lista completa, máx. 5 archivos, pdf/jpg/jpeg/png, 5MB | — | — |
| 4.12 | Historial: creación, aprobación, rechazo, anulación, generación de CC | ✅ | Todos los eventos se registran correctamente | — | — |
| 4.13 | Historial: generación/vinculación de NI | ❌ | No existe flujo de NI (ver sección 12) | — | P1 |
| 4.14 | Historial: cierre de orden | ❌ | No existe función `cerrarOrdenCompra` (aunque `puedeCerrarOC` está definida y huérfana) | Implementar o retirar el estado `'cerrado'` si no aplica a Fase 1 | P2 |
| 4.15 | Documentos relacionados: CC relacionados | ❌ | `comprobantesCompraRelacionados` se puebla en el modelo (`ContextoCompras.tsx:500-503`) pero **no se muestra** en el panel | Exponer lista/enlace — dato ya existe, solo falta UI | P1 |
| 4.16 | Documentos relacionados: NI relacionadas | ❌ | Campo nunca se puebla (ver sección 12) | — | P1 |
| 4.17 | Documentos relacionados: CxP relacionadas | ❌ | Relación indirecta vía CC no expuesta desde OC | — | P2 |
| 4.18 | Documentos relacionados: pagos relacionados | ❌ | No expuesta desde OC | — | P2 |
| 4.19 | Acción Editar (desde detalle) | ❌ | El panel es 100% de solo lectura, sin footer de acciones | Ver 2.27 | P1 |
| 4.20 | Acción Duplicar | ❌ | — | — | P2 |
| 4.21 | Acción Aprobar/Rechazar (desde detalle) | ❌ | Solo disponible desde el menú de la tabla, no desde el drawer | Mover o replicar acciones al footer del drawer para evitar que el usuario deba cerrar el detalle | P1 |
| 4.22 | Acción Anular (desde detalle) | ❌ | Igual que 4.21 | — | P1 |
| 4.23 | Acción Cerrar (orden) | ❌ | No implementada | Ver 4.14 | P2 |
| 4.24 | Acción Generar CC (desde detalle) | ❌ | Solo desde tabla | — | P1 |
| 4.25 | Acción Generar NI/vincular inventario | ❌ | No existe en ningún lugar | Ver sección 12 | P1 |
| 4.26 | Imprimir/Descargar/Enviar correo | ❌ | — | Ver sección 16 | P1 |

---

## 5. COMPROBANTES DE COMPRA — LISTADO

**Submódulo:** Comprobantes de Compra · **Pantalla:** `componentes/listados/TablaComprobantesCompra.tsx`

### Columnas

| # | Columna | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 5.1 | Tipo Comprobante | ❌ | No hay columna para `tipoComprobanteProveedor` | Agregar columna (Factura/Boleta/etc.) | P1 |
| 5.2 | N° Comprobante | 🟡 | Muestra `{serieProveedor}-{numeroProveedor}` (documento del proveedor); **no existe numeración interna propia** del CC (a diferencia de OC) | Confirmar si se requiere correlativo interno; si no, documentar la decisión | P2 |
| 5.3 | Orden Compra relacionada | ❌ | Sin columna ni referencia a `ordenCompraOrigenId` | Ver sección 17 | P1 |
| 5.4 | RUC/DNI | ✅ | Subtexto bajo proveedor | — | — |
| 5.5 | Razón Social/Proveedor | ✅ | — | — | — |
| 5.6 | Fecha Documento (emisión proveedor) | ✅ | — | — | — |
| 5.7 | Fecha Registro | ✅ | — | — | — |
| 5.8 | Fecha Vencimiento | ❌ | No hay columna (sí en detalle) | — | P2 |
| 5.9 | Estado (documento) | ✅ | — | — | — |
| 5.10 | Estado pago | ✅ | — | — | — |
| 5.11 | Estado inventario | ❌ | No se muestra en la tabla | — | P2 |
| 5.12 | Moneda | ✅ | — | — | — |
| 5.13 | Total | ✅ | — | — | — |
| 5.14 | Acciones | 🟡 | Menú solo con "Ver detalle" y "Anular" — faltan generar pago, generar/vincular NI, imprimir, correo, ver OC | Ver ítems siguientes | P1 |

### Funciones

| # | Función | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 5.15 | Buscar por número comprobante | 🟡 | Input combinado (número+proveedor+RUC en una sola búsqueda) | Funcional pero no es "buscar por número" aislado | P2 |
| 5.16 | Buscar por proveedor | 🟡 | Mismo input combinado | — | P2 |
| 5.17 | Buscar por RUC/DNI | 🟡 | Mismo input combinado | — | P2 |
| 5.18 | Filtro por estado (documento) | ❌ | Solo existe filtro de `estadoPago`; `estadoDocumento` está en la lógica (`filtrosCompras.ts:41,63`) sin `<select>` en UI | — | P1 |
| 5.19 | Filtro por estado pago | ✅ | — | — | — |
| 5.20 | Filtro por fecha | ❌ | Ver 1.9 | — | P1 |
| 5.21 | Filtro por moneda | ❌ | No existe en lógica ni UI | — | P2 |
| 5.22 | Filtro por OC relacionada | ❌ | No existe | — | P2 |
| 5.23 | Paginación | ❌ | Ver 1.15 | — | P1 |
| 5.24 | Exportar | ❌ | — | — | P1 |
| 5.25 | Nuevo/Registrar CC | ✅ | — | — | — |
| 5.26 | Ver detalle | ✅ | — | — | — |
| 5.27 | Anular | ✅ | Gateado por `puedeAnularCC` | — | — |
| 5.28 | Generar pago (desde CC) | ❌ | Flujo solo existe desde la pestaña Cuentas por Pagar, no desde CC directamente | Aceptable como diseño (CC genera CxP automáticamente), documentar la relación | P2 |
| 5.29 | Generar/vincular NI | ❌ | Ver sección 12 | — | P1 |
| 5.30 | Imprimir/descargar | ❌ | Ver sección 16 | — | P1 |
| 5.31 | Enviar por correo | ❌ | Ver sección 16 | — | P2 |

### Estados

| Dimensión | Implementado | Observación |
|---|---|---|
| `EstadoDocumentoCC` | `borrador \| registrado \| anulado` | 🟡 `'borrador'` inalcanzable (siempre se crea `'registrado'`) |
| `EstadoPagoCC` | `pendiente \| parcial \| pagado` | ✅ cobertura completa |
| `EstadoInventarioCC` | `pendiente \| parcial \| completo \| automatico \| no_aplica` | 🟡 se asigna una sola vez al crear y nunca se actualiza; `parcial`/`completo`/`automatico` son inalcanzables |
| `ModalidadInventarioCC` | `con_nota_ingreso \| ingreso_automatico \| no_afecta_inventario` | 🟡 `ingreso_automatico` deshabilitado explícitamente en el formulario (comentario "hasta Fase 2") — decisión documentada, no bug |

---

## 6. COMPROBANTES DE COMPRA — FORMULARIO

**Submódulo:** Comprobantes de Compra · **Pantalla:** `componentes/formularios/FormularioComprobanteCompra.tsx`

### Documento proveedor

| # | Campo | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 6.1 | Tipo comprobante | ✅ | Select desde `TIPOS_DOCUMENTO_PROVEEDOR` (Factura, Boleta, NC, ND, Rec. Honorarios, Rec. Arrendamiento, Percepción, Retención, No domiciliado) | — | — |
| 6.2 | Serie proveedor | ✅ | — | — | — |
| 6.3 | Número proveedor | ✅ | — | — | — |
| 6.4 | Botón validar SUNAT (del comprobante) | ❌ | No existe validación del comprobante en sí; solo existe consulta RUC/DNI del **proveedor** | Fase futura si se requiere validar comprobante contra SUNAT | P2 |
| 6.5 | Fecha emisión proveedor | ✅ | — | — | — |
| 6.6 | Fecha registro | ✅ (autogenerada) | — | — | — |
| 6.7 | Fecha vencimiento | ✅ | — | — | — |
| 6.8 | Tipo de operación | ❌ | No existe en modelo ni formulario | — | P2 |
| 6.9 | Moneda | ✅ | — | — | — |
| 6.10 | Tipo de cambio | ✅ | — | — | — |
| 6.11 | Forma de pago | ✅ | — | — | — |
| 6.12 | Comprador | 🟡 | Solo lectura, autocompletado con sesión | — | — |

### Proveedor

| # | Campo | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 6.13 | RUC/DNI, razón social | ✅ | `BuscadorProveedor` | — | — |
| 6.14 | Dirección facturación/envío | 🟡 | Un único campo de dirección de texto libre, sin distinguir facturación vs. entrega (a diferencia de OC) | Alinear con el patrón de OC si se requiere | P2 |
| 6.15 | Contacto/teléfono/correo | ❌ | No existe | Ver 3.20 | P2 |
| 6.16 | Crear proveedor si no existe | ✅ | Igual que en OC, corregido en Etapa 2 | — | — |
| 6.17 | Autocompletado | ✅ | — | — | — |

### Relación con OC

| # | Campo | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 6.18 | OC origen (mostrada) | 🟡 | Solo texto en el header ("Desde OC: {numero}"), sin sección/tab dedicada | — | P2 |
| 6.19 | Número OC | 🟡 | Igual que arriba | — | — |
| 6.20 | Líneas pendientes de OC | ❌ | `extraerDatosOCParaCC` copia **todas** las líneas asumiendo facturación total (`cantidadPendienteFacturacion:0` siempre) — sin lógica de facturación parcial | Implementar cálculo real de pendiente por línea | **P0** |
| 6.21 | Validación "no facturar más de lo pendiente" | ❌ | No existe en ningún punto del flujo | Ver sección 19, hallazgo crítico #1 (sobrefacturación) | **P0** |

### Condiciones / clasificación

| # | Campo | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 6.22 | Centro de costo / Presupuesto | ✅ (campo) / ❌ (catálogo) | Igual que OC | — | P2 |
| 6.23 | Suministro | 🟡 | No es checkbox independiente; es una opción más del select de clasificación | Consistente con decisión de "suministro como clasificación, no tab" (ya documentada) | — |
| 6.24 | Base Imponible Compra | 🟡 | Se calcula pero sin etiqueta explícita "base imponible" | — | P2 |
| 6.25 | Modalidad inventario: con_nota_ingreso | ✅ | — | — | — |
| 6.26 | Modalidad inventario: no_afecta_inventario | ✅ | — | — | — |
| 6.27 | Modalidad inventario: ingreso_automatico | ❌ (deshabilitado a propósito) | Comentario explícito "hasta Fase 2" | N/A para Fase 1 | — |

### Ítems

| # | Campo | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 6.28 | Producto/código/descripción/cantidad/unidad | ✅ | — | — | — |
| 6.29 | Almacén/cambiar almacén | ✅ | — | — | — |
| 6.30 | Stock disponible | ❌ | Sin referencia a stock en el formulario | — | P2 |
| 6.31 | Precio/costo/total | ✅ | — | — | — |
| 6.32 | Descuento | ✅ | — | — | — |
| 6.33 | Clasificación (5 valores) | ✅ | — | — | — |
| 6.34 | Afecta inventario | ✅ | — | — | — |
| 6.35 | Afectación tributaria | 🟡 | Solo gravado/exonerado/inafecto, sin "exportación" | — | P2 |

### Totales

| # | Total | Estado | Qué falta | Prioridad |
|---|---|---|---|---|
| 6.36 | Monto imponible | ✅ | — | — |
| 6.37 | Descuentos | ✅ | — | — |
| 6.38 | Exonerado/Inafecto | ✅ | — | — |
| 6.39 | Exportación | ❌ | Sin categoría | P2 |
| 6.40 | IGV | ✅ | — | — |
| 6.41 | Monto Imponible IVAP / IVAP / R.CONS.10% | ❌ | Sin referencias | N/A salvo necesidad tributaria |
| 6.42 | Detracción/Retención/Percepción (captura) | ❌ | **Campos "fantasma"**: modelados (`ComprobanteCompra.ts:91-93`) e incluso con renderizado condicional read-only en el detalle, pero **sin ningún input de captura** en el formulario ni cálculo real | Implementar captura si el negocio requiere detracciones en compras, o eliminar los campos muertos del modelo/detalle | P1 |
| 6.43 | Total | ✅ | — | — |

### Adjuntos

| # | Tipo | Estado | Evidencia |
|---|---|---|---|
| 6.44 | Factura proveedor, guía remisión, cotización, contrato, otro | ✅ | `tiposPermitidos` correctos |
| 6.45 | Voucher | N/A en este formulario (correcto — pertenece al flujo de Pago) | — |

### Botones

| # | Botón | Estado |
|---|---|---|
| 6.46 | Generar/Registrar CC | ✅ |
| 6.47 | Guardar borrador | ❌ (mismo patrón que OC) |
| 6.48 | Cancelar | ✅ |

### Validaciones — asimetrías CC vs OC (detalle completo en sección 19)

| # | Validación | Estado | Qué falta | Prioridad |
|---|---|---|---|---|
| 6.49 | Cantidad &gt; 0 en línea de CC | ❌ | `validarComprobanteCompraBasico` no repite el chequeo que sí tiene OC | **P0** |
| 6.50 | Costo &gt;= 0 en línea de CC | ❌ | Igual asimetría | **P0** |
| 6.51 | Moneda obligatoria en CC | ❌ | `validarComprobanteCompraBasico` no valida `!cc.moneda` (OC sí lo hace) | P1 |
| 6.52 | Forma de pago obligatoria en CC | ❌ | No se exige explícitamente | P1 |
| 6.53 | OC aprobada antes de generar CC | ❌ | Servicio no revalida `estadoAprobacion`, solo la UI oculta el botón | **P0** |

---

## 7. COMPROBANTES DE COMPRA — DETALLE

**Submódulo:** Comprobantes de Compra · **Pantalla:** `componentes/detalle/PanelDetalleComprobanteCompra.tsx`

| # | Ítem | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 7.1 | Cabecera: proveedor, título, número, estado, moneda, total | 🟡 | Proveedor/moneda/total solo dentro del tab General, no en la cabecera del Drawer | Cosmético | P2 |
| 7.2 | Botones PDF/imprimir/correo/más opciones | ❌ | `Drawer` soporta `accionesEncabezado` pero el panel no las usa | Ver sección 16 | P1 |
| 7.3 | Botón Cerrar | ✅ | Provisto por `Drawer` genérico | — | — |
| 7.4 | Tab/sección OC relacionada (proveedor, N° OC, total) | ❌ | `ordenCompraOrigenId` nunca se lee en el panel — **relación invisible pese a estar persistida** | Agregar sección/tab de "Orden de Compra origen" | P1 |
| 7.5 | Datos del comprobante (tipo, estado, forma pago, fechas, comprador, dirección, serie/número proveedor) | ✅ | Tab General | — | — |
| 7.6 | Tipo comprobante mostrado como nombre (no código) | 🟡 | Muestra el código crudo ("01") en vez de "Factura" | Usar `getNombreTipoDocumentoProveedor` | P2 |
| 7.7 | Tipo de operación | ❌ | Campo inexistente | — | P2 |
| 7.8 | Modalidad inventario | ✅ | — | — | — |
| 7.9 | Ítems: cantidad mostrada | ⚠️ | `cantidadFacturada \|\| cantidadSolicitada` — el OR lógico cae mal cuando `cantidadFacturada` es legítimamente 0 | Corregir a comparación explícita | P1 |
| 7.10 | Ítems: almacén, producto, código, unidad, costo, total, afectación, IGV | ✅ | — | — | — |
| 7.11 | Totales | ✅ | Incluye render condicional de detracción/retención (aunque inalcanzable, ver 6.42) | — | — |
| 7.12 | Adjuntos | ✅ (solo lectura) | Mismo patrón que OC | — | — |
| 7.13 | Historial: registro, pago aplicado, anulación | ✅ | — | — | — |
| 7.14 | Historial: NI vinculada | ❌ | No existe flujo | Ver sección 12 | P1 |
| 7.15 | Historial: cambios/ediciones | ❌ | No existe edición de CC | N/A si no se requiere editar CC registrados | — |
| 7.16 | Documentos relacionados: OC origen | ❌ | Ver 7.4 | — | P1 |
| 7.17 | Documentos relacionados: CxP generada | ❌ | `cuentaPorPagarId` se asigna pero nunca se muestra/enlaza desde el detalle del CC | Agregar enlace "Ver CxP" | P1 |
| 7.18 | Documentos relacionados: pagos | 🟡 | Solo mencionados en texto de historial, sin lista/enlaces navegables | — | P2 |
| 7.19 | Documentos relacionados: NI/movimiento inventario | ❌ | Campos nunca poblados | Ver sección 12 | P1 |
| 7.20 | Acción Anular (desde detalle) | ❌ | Solo desde el menú del listado, no desde el drawer | Igual observación que en OC (4.21-4.22) | P1 |
| 7.21 | Acción Generar Pago | ❌ | No existe desde CC (flujo pasa por CxP) | — | P2 |
| 7.22 | Acción Generar NI | ❌ | — | Ver sección 12 | P1 |
| 7.23 | Imprimir/Descargar/Correo | ❌ | Ver sección 16 | — | P1 |
| 7.24 | Ver OC relacionada (acción) | ❌ | Ver 7.4 | — | P1 |
| 7.25 | Adjuntar (desde detalle) | ❌ | Modo solo lectura forzado | — | P2 |

---

## 8. CUENTAS POR PAGAR — LISTADO

**Submódulo:** Cuentas por Pagar · **Pantalla:** `componentes/listados/TablaCuentasPorPagar.tsx`

### Columnas

| # | Columna | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 8.1 | RUC/DNI | 🟡 | Subtexto bajo Proveedor | — | P2 |
| 8.2 | Razón Social | ✅ | — | — | — |
| 8.3 | Comprobante de Pago (tipo origen) | 🟡 | Subtexto bajo "Comprobante", no columna propia | — | P2 |
| 8.4 | N° Comprobante | ✅ | — | — | — |
| 8.5 | Fecha E. Comprobante/emisión | ❌ | Modelo tiene `fechaEmision` pero no hay columna en el listado (sí en detalle) | — | P2 |
| 8.6 | Fecha vencimiento | ✅ | Columna "Vencimiento" | — | — |
| 8.7 | Forma de Pago | 🟡 | Subtexto bajo badge de Estado | — | P2 |
| 8.8 | Saldo Pendiente | ✅ | — | — | — |
| 8.9 | Cuotas Pendientes | ❌ | Sin columna ni indicador (ver también 8.15, cuotas es de fachada) | — | P2 |
| 8.10 | Total | ✅ | — | — | — |
| 8.11 | Pagado | ❌ | Solo visible en el detalle, no en el listado | — | P2 |
| 8.12 | Estado pago | ✅ | — | — | — |
| 8.13 | Estado vencimiento | ✅ | — | — | — |
| 8.14 | Acciones | ✅ | Ver detalle + Registrar pago (condicional) | — | — |

### Control de vencimiento / cuotas

| # | Ítem | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 8.15 | N° de cuota / cronograma multi-cuota | ⚠️ | Estructura `CuotaCuentaPorPagar[]` existe, pero `generarCuotasDesdeCC` **solo crea una cuota única** (comentario explícito: "Fase 1 no soporta fraccionamiento") | Es de fachada — documentar claramente como Fase 2, no presentar como funcionalidad completa | P1 |
| 8.16 | Días crédito | 🟡 | Campo `diasCredito?` opcional en el modelo, **nunca se asigna** | — | P2 |
| 8.17 | Días vencido (contador) | ❌ | Solo existe el estado categórico (vigente/por_vencer/vencida), no un contador numérico de días | — | P2 |
| 8.18 | Fecha vencimiento / Saldo pendiente (a nivel cuota) | ✅ | — | — | — |
| 8.19 | Importe pago (a nivel cuota) | 🟡 | Solo sincroniza cuota única | Ligado a 8.15 | P2 |

### Funciones

| # | Función | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 8.20 | Buscar por proveedor/RUC-DNI/comprobante | ✅ | Un solo input combinado | — | — |
| 8.21 | Filtro por estado pago | ✅ | — | — | — |
| 8.22 | Filtro por vencimiento | ✅ | — | — | — |
| 8.23 | Filtro por fecha | ❌ | Soportado en lógica, sin UI (ver 1.9) | — | P1 |
| 8.24 | Paginación | ❌ | Ver 1.15 | — | P1 |
| 8.25 | Exportar | ❌ | — | — | P1 |
| 8.26 | Ver detalle | ✅ | — | — | — |
| 8.27 | Registrar pago | ✅ | Condicionado por `puedeRegistrarPago` | — | — |
| 8.28 | Ver comprobante origen (navegación) | ❌ | Solo texto, sin acción de navegación | — | P1 |
| 8.29 | Ver pagos relacionados (desde listado) | ❌ | Solo disponible en el detalle | — | P2 |

### Estados

| Dimensión | Implementado | Cobertura |
|---|---|---|
| `estadoPago` | `pendiente \| parcial \| pagada \| anulada` | ✅ coincide exactamente con lo esperado |
| `estadoVencimiento` | `vigente \| por_vencer \| vencida` | ✅ coincide exactamente |

---

## 9. CUENTAS POR PAGAR — DETALLE

**Submódulo:** Cuentas por Pagar · **Pantalla:** `componentes/detalle/PanelDetalleCuentaPorPagar.tsx`

| # | Ítem | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 9.1 | Proveedor / RUC-DNI | ✅ | — | — | — |
| 9.2 | Comprobante origen | ✅ | Tipo + número, título del drawer | — | — |
| 9.3 | Fecha emisión / vencimiento | ✅ | — | — | — |
| 9.4 | Moneda / Total / Total pagado / Saldo pendiente | ✅ | Con barra de progreso | — | — |
| 9.5 | Forma de pago | ✅ | — | — | — |
| 9.6 | Cuotas | 🟡 | Sección solo puede mostrar 0-1 elementos en la práctica (Fase 1 cuota única) | Ver 8.15 | P1 |
| 9.7 | Estado pago / Estado vencimiento | ✅ | Badges | — | — |
| 9.8 | Pagos relacionados | ✅ | Con número, fecha, monto, badge de estado | — | — |
| 9.9 | Historial | ✅ | — | — | — |
| 9.10 | Acción registrar pago | ✅ | En el pie del drawer | — | — |
| 9.11 | Acción ver comprobante (navegación) | ❌ | Solo texto | — | P1 |
| 9.12 | Acción exportar/descargar | ❌ | — | — | P2 |
| 9.13 | Adjuntos | ❌ | El panel de CxP **no tiene tab de adjuntos** (a diferencia de OC/CC/Pago) | Evaluar si CxP necesita adjuntos propios o si basta con los del CC origen | P2 |

---

## 10. EMISIÓN / REGISTRO DE PAGOS

**Submódulo:** Pagos · **Pantalla:** `componentes/modales/ModalRegistrarPagoCompra.tsx`

| # | Ítem | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 10.1 | Checkbox selección de CxP (multi) | ❌ | El modal solo acepta **una** CxP por props; `PagoCompra.cuentasPorPagarAplicadas` admite array pero el comentario en el modelo dice explícitamente "Fase 1: solo una; Fase 2: múltiples" | Documentado como Fase 2, no presentar como pendiente de Fase 1 | — |
| 10.2 | N° comprobante / Fecha comprobante | 🟡 | N° sí se muestra; fecha de emisión del comprobante **no** se muestra en el modal | — | P2 |
| 10.3 | Forma de pago (del CxP) | ❌ | No se repite en el modal | — | P2 |
| 10.4 | N° cuota / Días crédito / Días vencido / Fecha vencimiento | ❌ | Ninguno se muestra en el modal (el pago siempre aplica al total de la CxP) | Ligado a que no hay multi-cuota real | P2 |
| 10.5 | Saldo pendiente | ✅ | — | — | — |
| 10.6 | Importe pago | ✅ | Por medio de pago | — | — |
| 10.7 | Documento sustentatorio (tipo/serie/número) | ✅ | Campos libres, correcto (no deben validarse contra catálogo, es un documento externo) | — | — |
| 10.8 | Tipo doc PG / Serie desde config | ✅ | `seriePG` desde `config.series`, bloquea con error claro si no existe (corregido en Etapa 2: eliminado el fallback `'PG01'`) | — | — |
| 10.9 | Número correlativo (preview) | ✅ | `siguienteNumeroPago` | — | — |
| 10.10 | Total a pagar / Moneda | 🟡 | Moneda se hereda de la CxP, no es seleccionable — correcto por diseño (un pago no puede cambiar la moneda del documento que salda) | — | — |
| 10.11 | Tipo de cambio | ✅ | Condicional a moneda≠base | — | — |
| 10.12 | Fecha de pago | ✅ | — | — | — |
| 10.13 | Medio de pago | ✅ | 100% desde `config.paymentMethods` (corregido en Etapa 2: eliminado el fallback hardcodeado Efectivo/Depósito/Transferencia) | — | — |
| 10.14 | Serie-número (del medio, p.ej. cheque) | ❌ | No existe campo específico; solo `referenciaOperacion` genérico | — | P2 |
| 10.15 | Cuenta bancaria | ✅ | Desde `useBankAccounts`, filtrada por `isVisible` | Falta filtrar por moneda coincidente (ver sección 18) | P1 |
| 10.16 | Caja destino (selector explícito) | 🟡 | No hay selector; la caja activa se resuelve implícitamente vía `useCaja()` | Aceptable si el sistema solo maneja una caja activa por sesión/usuario | P2 |
| 10.17 | Referencia/N° operación | ✅ | Obligatoria para medios bancarios | — | — |
| 10.18 | Concepto | ✅ | Prellenado | — | — |
| 10.19 | Adjuntos | ✅ | Tipos `voucher_pago`/`otro` | — | — |
| 10.20 | Observaciones | ✅ | — | — | — |
| 10.21 | Medios de pago: múltiples en un pago | ✅ | — | — | — |
| 10.22 | Validación suma medios = total | ✅ | Por construcción (el total es la suma de líneas) + validación redundante en servicio | — | — |
| 10.23 | Validación pago &lt;= saldo | ⚠️ | Solo existe en el modal (UI); **no hay bloqueo a nivel de servicio** — si se invoca `registrarPagoCompra` sin pasar por el modal, `aplicarPagoACuentaPorPagar` capa el saldo en 0 silenciosamente sin error | Agregar el chequeo a `validarPagoCompraBasico` como defensa en profundidad | P1 |
| 10.24 | Si efectivo → caja obligatoria | ✅ | Bloquea (no solo advierte), en UI y en `ContextoCompras` | — | — |
| 10.25 | Si banco → cuenta obligatoria | ✅ | — | — | — |
| 10.26 | Si banco → referencia obligatoria | ✅ | — | — | — |
| 10.27 | Botones Guardar/Cancelar/Cerrar | ✅ | — | — | — |
| 10.28 | Pago parcial/total | ✅ | — | — | — |
| 10.29 | Actualizar saldo CxP y estado pago (CxP y CC) | ✅ | — | — | — |
| 10.30 | Generar movimiento de caja (egreso) | ✅ | Se intenta antes de comprometer el pago (corregido en Etapa 2) | — | — |
| 10.31 | Anular pago | ✅ | — | — | — |
| 10.32 | Revertir saldo al anular | ✅ | — | — | — |
| 10.33 | Revertir/compensar caja al anular | ⚠️ | Si la caja está **cerrada** al momento de anular, la compensación se omite silenciosamente (sin error) y la anulación prosigue igual — puede dejar descuadre contable real | Bloquear la anulación de pagos en efectivo si la caja está cerrada, o encolar la compensación para cuando se abra | **P0** |
| 10.34 | Registrar historial | ✅ | — | — | — |

---

## 11. PAGOS — LISTADO / HISTORIAL

**Submódulo:** Pagos · **Pantalla:** `componentes/listados/TablaPagosCompra.tsx` y `componentes/detalle/PanelDetallePagoCompra.tsx`

### Columnas del listado

| # | Columna | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 11.1 | Tipo Doc origen | ❌ | No se muestra | — | P2 |
| 11.2 | N° Doc origen | ❌ | No se muestra en ninguna columna | — | P1 |
| 11.3 | R. Social | ✅ | Columna "Proveedor" | — | — |
| 11.4 | Total Doc (origen) | ❌ | No se muestra | — | P2 |
| 11.5 | Fecha documento (origen) | ❌ | No se muestra | — | P2 |
| 11.6 | F. Pago | ✅ | — | — | — |
| 11.7 | Tipo Doc pago | 🟡 | Implícito (todos son PG), sin columna explícita | — | P2 |
| 11.8 | N° Doc pago | ✅ | — | — | — |
| 11.9 | M. Pago/Medio de pago | ✅ | Múltiples badges | — | — |
| 11.10 | Amortizado | ❌ | Sin cálculo/columna | — | P2 |
| 11.11 | Moneda | 🟡 | Concatenada al total, no columna propia | — | P2 |
| 11.12 | Estado | ✅ | — | — | — |
| 11.13 | Acciones | ✅ | Ver detalle + Anular | — | — |

### Funciones

| # | Función | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 11.14 | Buscar | ✅ | Por número y proveedor | — | — |
| 11.15 | Nuevo pago (botón en este listado) | ❌ | No existe; mensaje explícito "Los pagos se registran desde las cuentas por pagar" | Diseño intencional, correcto | — |
| 11.16 | Paginación | ❌ | — | — | P1 |
| 11.17 | Exportar | ❌ | — | — | P1 |
| 11.18 | Ver detalle | ✅ | — | — | — |
| 11.19 | Anular pago | ✅ | Gateado por `puedeAnularPago` | — | — |
| 11.20 | Ver comprobante origen | ❌ | Sin navegación desde el listado de pagos | — | P1 |
| 11.21 | Ver CxP relacionada | ❌ | Sin navegación (funciona solo en sentido inverso: CxP → pagos) | — | P1 |

### Detalle de pago

| # | Ítem | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 11.22 | Documento (N°, proveedor, fecha, moneda, TC, monto) | ✅ | — | — | — |
| 11.23 | Documento sustentatorio | ✅ | — | — | — |
| 11.24 | Medios de pago detallados | ✅ | Con cuenta bancaria y referencia | — | — |
| 11.25 | CxP/comprobante aplicado (mostrado/enlazado) | ❌ | `cuentasPorPagarAplicadas`/`comprobantesCompraAplicados` existen en el modelo pero **no se muestran** en el panel | Agregar sección "Aplicado a" con enlace a la CxP | P1 |
| 11.26 | Adjuntos | ✅ | — | — | — |
| 11.27 | Historial | ✅ | — | — | — |
| 11.28 | Acción exportar/descargar constancia | ❌ | — | Ver sección 16 | P1 |
| 11.29 | Acción anular (desde el detalle) | ❌ | El drawer no tiene pie con acciones; solo se anula desde el menú del listado | — | P2 |

---

## 12. NOTAS DE INGRESO

**Regla de diseño confirmada:** NI vive en Inventario, no como tab de Compras. Compras solo debería poder vincular/generar y reflejar el estado.

**Submódulo:** Puente Compras↔Inventario

| # | Ítem | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 12.1 | Acción "Generar Nota de Ingreso" desde OC aprobada | ❌ | Cero botones/acciones con ese label en toda la UI de Compras | Implementar la acción y su conexión con Inventario | **P0** (bloqueante para el ciclo completo Compra→Stock) |
| 12.2 | Acción "Generar Nota de Ingreso" desde CC | ❌ | Igual | — | **P0** |
| 12.3 | Mapeador de datos OC/CC → NI | ⚠️ | `mapeadores/mapeadorCCaNI.ts` (`prepararDatosNIDesdeCC`) está **completamente implementado pero huérfano** — cero invocadores en todo el repo | Conectar el mapeador ya existente a una acción real | **P0** |
| 12.4 | Relación OC/CC con NI (persistencia) | ❌ | `notasIngresoRelacionadas` (en OC y CC) y `movimientosInventarioRelacionados` (en CC) nunca se escriben en ningún punto del código | — | **P0** |
| 12.5 | Visualización de NI relacionada | ❌ | Consecuencia directa de 12.4 — no hay nada que mostrar | — | P1 |
| 12.6 | Estado "pendiente de ingreso" | 🟡 | Existe el valor (`estadoInventario:'pendiente'`) pero queda congelado para siempre | Depende de 12.1-12.4 | P1 |
| 12.7 | Estado "ingresado parcial" | ❌ | Valor `'parcial'` tipado pero inalcanzable en la práctica | — | P1 |
| 12.8 | Estado "ingresado completo" | ❌ | Valor `'completo'` tipado pero inalcanzable | — | P1 |
| 12.9 | Validación para no duplicar ingresos | ❌ | No aplica hoy porque no existe el flujo de generación | — | P1 |
| 12.10 | Calculadoras de estado ya escritas (`utilidades/calcularEstadosCompra.ts`) | ⚠️ | `calcularEstadoRecepcion`, `calcularEstadoFacturacion`, `calcularEstadoInventarioOC`, `calcularEstadoInventarioCC` están **correctamente implementadas pero sin ningún invocador real** — código muerto de alta calidad esperando integración | Conectarlas a `ContextoCompras` en vez de los valores hardcodeados actuales (`estadoFacturacion:'completa'` fijo, etc.) | **P0** |

**Conclusión de la sección:** la integración Compras↔Inventario es una fachada. El modelo de datos, el mapeador y las calculadoras de estado están completos y bien escritos, pero **ningún flujo de UI los invoca**. Es la brecha más severa detectada en toda la auditoría porque bloquea el ciclo funcional completo (Orden → Comprobante → Ingreso a almacén → Stock disponible).

---

## 13. SUMINISTROS

| # | Ítem | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 13.1 | Clasificación de línea como "suministro" | ✅ | `ClasificacionLineaCompra` incluye `'suministro'`, seleccionable en OC y CC | — | — |
| 13.2 | Checkbox/indicador en CC (patrón antiguo) | N/A | Reemplazado correctamente por el select de clasificación (decisión ya documentada: "suministro como clasificación, no tab") | — | — |
| 13.3 | Tratamiento contable/inventario diferenciado | ❌ | `suministro` se comporta **idéntico** a `servicio`/`gasto`: `afectaInventario` no se autoactiva, sin campos ni validaciones propias | Definir si Fase 2 requiere tratamiento contable distinto | P2 (Fase futura) |
| 13.4 | Listado o submódulo propio | N/A | Correcto no tenerlo — está descartado explícitamente en las decisiones del proyecto | — | — |
| 13.5 | Relación con productos/servicios/gastos | ✅ | Convive en el mismo modelo `LineaCompra` sin fricción | — | — |

**Veredicto de la sección:** el modelo está preparado (campo de clasificación existe y es seleccionable); el tratamiento diferenciado queda para una fase futura, correctamente no implementado en Fase 1.

---

## 14. ACTIVOS FIJOS

| # | Ítem | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 14.1 | Línea clasificada como activo fijo | ✅ | `ClasificacionLineaCompra` incluye `'activo_fijo'` | — | — |
| 14.2 | Comprobante de compra con activo fijo | ✅ | Seleccionable en `FormularioComprobanteCompra.tsx` | — | — |
| 14.3 | No impactar inventario como producto común | ✅ | Checkbox "Afecta inventario" deshabilitado forzosamente cuando `clasificacion==='activo_fijo'` | — | — |
| 14.4 | Descripción del activo | ✅ | Campo `descripcionActivo` (condicional a la clasificación) | — | — |
| 14.5 | Responsable / ubicación del activo | ✅ (extra no solicitado, útil) | Campos `responsableActivo`, `ubicacionActivo` | — | — |
| 14.6 | Valor de adquisición (campo dedicado) | ❌ | Se reutiliza implícitamente `costoUnitario` genérico; sin campo propio de "valor de adquisición" | Aceptable para Fase 1 si el costo de línea basta | P2 |
| 14.7 | Fecha de adquisición (campo dedicado) | ❌ | No existe fecha a nivel de línea; solo la fecha del documento completo | — | P2 |
| 14.8 | Proveedor / documento origen | ✅ (heredado del documento) | El CC/OC completo ya trae proveedor y es en sí el documento origen | — | — |
| 14.9 | Relación futura con módulo de Activos Fijos | ❌ | No existe módulo de Activos Fijos en el sistema; sin puente definido | Fase futura (Fase 3 según roadmap ya documentado) | P2 |

**Veredicto de la sección:** mejor preparado de lo esperado para no estar en el alcance de las capturas antiguas — ya tiene clasificación, bloqueo de inventario y campos descriptivos básicos. Faltan valor/fecha de adquisición dedicados, correctamente diferidos a fase futura.

---

## 15. ADJUNTOS

**Submódulo:** Compartido — `componentes/adjuntos/AdjuntosCompra.tsx`, `modelos/AdjuntoCompra.ts`

| # | Ítem | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 15.1 | Subir archivo | ✅ (editable) | `AdjuntosCompra.tsx:60-98` | — | — |
| 15.2 | Ver archivos cargados | ✅ | Ambos modos | — | — |
| 15.3 | Eliminar archivo | ✅ (condicional a `onEliminar`) | — | — | — |
| 15.4 | Formatos permitidos | ✅ | `pdf, jpg, jpeg, png` | — | — |
| 15.5 | Límite de cantidad | ✅ | 5 archivos | — | — |
| 15.6 | Límite de tamaño | ✅ | 5 MB | — | — |
| 15.7 | Tipo: cotización proveedor | ✅ | `AdjuntoCompra.ts:1-8` | — | — |
| 15.8 | Tipo: factura proveedor | ✅ | — | — | — |
| 15.9 | Tipo: guía remisión | ✅ | — | — | — |
| 15.10 | Tipo: voucher pago | ✅ | — | — | — |
| 15.11 | Tipo: contrato | ✅ | — | — | — |
| 15.12 | Tipo: orden compra firmada | ✅ | — | — | — |
| 15.13 | Tipo: otro | ✅ | — | — | — |
| 15.14 | Persistencia real (no solo local) | ⚠️ | Los archivos se guardan como **data URL en el propio registro local** (comentario explícito: "sin subida a la nube") | Migrar a almacenamiento real (storage/backend) antes de producción — riesgo de tamaño de payload en localStorage | P1 |
| 15.15 | Wiring en Formulario OC | ✅ | Editable | — | — |
| 15.16 | Wiring en Formulario CC | ✅ | Editable | — | — |
| 15.17 | Wiring en Modal Pago | ✅ | Editable | — | — |
| 15.18 | Wiring en Detalle OC | ✅ (solo lectura) | — | — | — |
| 15.19 | Wiring en Detalle CC | ✅ (solo lectura) | — | — | — |
| 15.20 | Wiring en Detalle Pago | ✅ (solo lectura) | — | — | — |
| 15.21 | Wiring en Detalle CxP | ❌ | `PanelDetalleCuentaPorPagar.tsx` no tiene tab de adjuntos | Evaluar necesidad — la CxP nace de un CC que ya tiene sus adjuntos | P2 |

---

## 16. EXPORTABLES / IMPRESIÓN / CORREO

**Resultado global: ❌ NO EXISTE ninguna funcionalidad real de exportar, imprimir, generar PDF o enviar por correo en todo el módulo Compras.** Verificado por grep exhaustivo de labels/handlers reales (`Exportar`, `Imprimir`, `generarPDF`, `Descargar`, `<Download`, `<Printer`, `<Mail`, `sendEmail`, etc.) — cero coincidencias funcionales en `compras/componentes/**`.

| # | Entidad | Ítem | Estado | Prioridad |
|---|---|---|---|---|
| 16.1 | Órdenes de Compra | Exportar listado | ❌ | P1 |
| 16.2 | Órdenes de Compra | Imprimir OC | ❌ | P1 |
| 16.3 | Órdenes de Compra | Descargar PDF OC | ❌ | P1 |
| 16.4 | Órdenes de Compra | Enviar OC por correo | ❌ | P2 |
| 16.5 | Órdenes de Compra | Vista previa | ❌ | P2 |
| 16.6 | Comprobantes de Compra | Exportar listado | ❌ | P1 |
| 16.7 | Comprobantes de Compra | Imprimir detalle | ❌ | P1 |
| 16.8 | Comprobantes de Compra | Descargar PDF/archivo | ❌ | P1 |
| 16.9 | Comprobantes de Compra | Enviar por correo | ❌ | P2 |
| 16.10 | Comprobantes de Compra | Ver documento proveedor adjunto | ✅ | — |
| 16.11 | Cuentas por Pagar | Exportar listado | ❌ | P1 |
| 16.12 | Cuentas por Pagar | Reporte de vencimientos | ❌ | P2 |
| 16.13 | Cuentas por Pagar | Reporte de saldos | ❌ | P2 |
| 16.14 | Pagos | Exportar listado | ❌ | P1 |
| 16.15 | Pagos | Imprimir constancia de pago | ❌ | P1 |
| 16.16 | Pagos | Descargar documento de pago | ❌ | P1 |
| 16.17 | Pagos | Enviar comprobante de pago por correo | ❌ | P2 |

**Nota de reutilización:** se confirmó (sin auditar en profundidad) que `comprobantes-electronicos` ya tiene patrones de post-emisión/PDF/impresión/correo (`shared/modales/PostIssueOptionsModal.tsx`, `PreviewModal.tsx`) y `gestion-cobranzas` también referencia funcionalidad similar (`CobranzaDetailModal.tsx`). Estos patrones son candidatos directos a extender hacia Compras en vez de construir desde cero.

---

## 17. TRAZABILIDAD

| # | Relación | Estado | Evidencia | Riesgo | Prioridad |
|---|---|---|---|---|---|
| 17.1 | OC → CC | ✅ (datos) / 🟡 (UI) | Vínculo bidireccional persistido (`ContextoCompras.tsx:494-517`), pero invisible en ambos detalles (OC y CC) | Ver 17.1b | P1 |
| 17.1b | OC → CC (control de sobrefacturación) | ⚠️ | `estadoFacturacion` se fuerza a `'completa'` sin comparar cantidades; `puedeGenerarCCDesdeOC` no verifica si ya existen CC relacionados | Se puede generar múltiples CC completos desde la misma OC sin bloqueo | **P0** |
| 17.2 | OC → NI | ❌ | `notasIngresoRelacionadas` nunca se puebla | Ciclo Compra→Stock roto (ver sección 12) | **P0** |
| 17.3 | CC → CxP | ✅ | Enlace bidireccional completo y correcto | — | — |
| 17.4 | CC → Pago | ✅ | `pagosRelacionados` se actualiza correctamente | — | — |
| 17.5 | CC → NI | ❌ | Mismo problema que 17.2; mapeador huérfano | Ver sección 12 | **P0** |
| 17.6 | CxP → Pago | ✅ | `aplicarPagoACuentaPorPagar` correcto | — | — |
| 17.7 | Pago → Caja (registro) | ✅ (camino feliz) / ⚠️ (edge case) | Movimiento de caja se intenta antes de comprometer el pago (orden correcto), **pero** `agregarMovimiento` no siempre lanza excepción cuando falla (p.ej. sin permiso de caja, o caja recién cerrada por otro proceso) — en esos casos el pago se persiste igual sin que el egreso haya ocurrido realmente | Descuadre de caja silencioso | **P0** |
| 17.8 | Pago → Caja (anulación) | ⚠️ | Si la caja está cerrada al anular, la compensación (ingreso) se omite sin bloquear la anulación | Descuadre contable real, no solo teórico | **P0** |
| 17.9 | CC/NI → Inventario | ❌ | No existe ningún camino real donde registrar un CC afecte stock | Ver sección 12 | **P0** |
| 17.10 | Anulación de pago → reversión de saldo en CxP | ✅ | `revertirPagoDeCuentaPorPagar` correcto matemáticamente | Riesgo menor: no contempla si la CxP ya estaba `'anulada'` por otra vía, podría pisar ese estado | P2 |
| 17.11 | Anulación de CC → reversión de CxP/pagos/inventario | 🟡 | Bloquea correctamente si el CC ya tiene pagos aplicados (`estadoPago !== 'pendiente'`); el bloqueo por NI/inventario relacionado es inalcanzable porque esos campos nunca se llenan | — | P2 |
| 17.12 | Anulación de OC → bloqueo si ya tiene derivados | ✅ | Bloquea si tiene CC relacionado; la condición de NI relacionada es inalcanzable (mismo motivo) | — | — |

---

## 18. FUENTES DE VERDAD

| # | Campo | Fuente correcta | Implementación actual | Veredicto | Qué falta | Prioridad |
|---|---|---|---|---|---|---|
| 18.1 | Series (OC/PG) | `configuracion-sistema` `Series` | Filtros correctos por `documentType.code`+`status`+`isActive` en ambos flujos | ✅ CUMPLE | — | — |
| 18.2 | Monedas (moneda base) | `config.currencies` + `currencyManager` | `.find(isBaseCurrency)` reimplementado en 4 archivos en vez de reusar `useCurrencyManager` | ✅ CUMPLE (con duplicación evitable) | Refactor de reutilización, no correctivo urgente | P2 |
| 18.3 | Formas de pago | No existe catálogo en todo el sistema | Unión hardcodeada `'contado'\|'credito'` | ❌ NO CUMPLE (gap sistémico, no exclusivo de Compras) | Definir si se requiere catálogo configurable | P2 |
| 18.4 | Medios de pago | `config.paymentMethods` | Filtro correcto por `isActive`+`isVisible`, orden por `displayOrder`, clasificación bancaria por `type` | ✅ CUMPLE | — | — |
| 18.5 | Cuentas bancarias | `useBankAccounts` | Filtra `isVisible`, pero **no valida que la moneda de la cuenta coincida con la moneda del pago** | 🟡 PARCIAL | Agregar filtro/advertencia de moneda | P1 |
| 18.6 | Unidades | `config.units` | Filtra activas/visibles; el `.find(isDefault)` no desambigua por categoría (`isDefault` puede repetirse por familia de unidad) | 🟡 PARCIAL | Elegir explícitamente la categoría "unidad genérica" al buscar el default | P2 |
| 18.7 | Impuestos (IGV) | `config.taxes` | `.find(isDefault && isActive)` sin filtrar `category==='PURCHASE'` (Ventas sí filtra `category==='SALES'`) | 🟡 PARCIAL | Alinear con el patrón de Ventas | P1 |
| 18.8 | Config. tributaria (tipo operación/detracción/leyendas) | N/A (existe parcialmente en Ventas) | 0 uso de tipoOperacion/leyenda; detracción es campo muerto (ver 6.42) | ❌ NO CUMPLE | Definir alcance para Compras | P2 |
| 18.9 | Cajas | `useCaja` (`control-caja`) | Uso correcto de `status`, `agregarMovimiento`, mapeo de medio de pago | ✅ CUMPLE | — | — |
| 18.10 | Proveedores | `gestion-clientes` tipo Proveedor/Cliente-Proveedor | Filtro de negocio correcto, **pero dos fuentes de datos no sincronizadas**: `ContextoCompras` lee `localStorage` directo (`dev_clientes`) mientras `BuscadorProveedor` usa `useClientes`/`fetchClientes` en vivo | 🟡 PARCIAL | Unificar en una sola fuente (usar el hook en ambos lados) | P1 |
| 18.11 | Productos | `catalogo-articulos` vía `ProductSelector` compartido | Reutiliza el mismo componente que Ventas, sin reimplementar | ✅ CUMPLE | — | — |
| 18.12 | Almacenes | `config.almacenes` | Filtro `estaActivoAlmacen`, asignación correcta por línea (no global) | ✅ CUMPLE | — | — |
| 18.13 | Centros de costo | No existe catálogo en todo el sistema | Input de texto libre, auto-documentado en el código como "sin fuente de verdad definida aún" | ❌ NO CUMPLE (por diseño, transparente) | Definir catálogo si se requiere control presupuestal real | P2 |
| 18.14 | Presupuestos | No existe catálogo en todo el sistema | Mismo patrón que centro de costo | ❌ NO CUMPLE (por diseño, transparente) | — | P2 |

---

## 19. VALIDACIONES

### Orden de Compra

| # | Validación | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 19.1 | Proveedor requerido | ✅ | `servicioOrdenCompra.ts:9-11` | — | — |
| 19.2 | Serie requerida | 🟡 | Solo en UI (`FormularioOrdenCompra.tsx:260-261`), no en `validarOrdenCompraBasica` | Agregar al servicio para no depender solo de la UI | P1 |
| 19.3 | Fecha requerida | ❌ | No validada en servicio (mitigado porque la UI siempre precarga fecha) | — | P2 |
| 19.4 | Ítems requeridos | ✅ | — | — | — |
| 19.5 | Cantidades válidas (&gt;0) | ✅ | — | — | — |
| 19.6 | Costo válido (&gt;=0) | ✅ | — | — | — |
| 19.7 | Reglas de aprobación/rechazo aplicadas en servicio | ⚠️ | `aprobarOrdenCompra`/`rechazarOrdenCompra` en `ContextoCompras.tsx` **no invocan** `puedeAprobarOC`/`puedeRechazarOC` — solo la UI oculta el botón | Se puede aprobar/rechazar por llamada directa una OC en estado inválido | **P0** |
| 19.8 | Reglas de anulación (bloqueo con derivados) | ✅ | `motivoBloqueoAnulacionOC`, invocada correctamente en el contexto | — | — |

### Comprobante de Compra

| # | Validación | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 19.9 | Proveedor requerido | ✅ | — | — | — |
| 19.10 | Tipo documento requerido | 🟡 | Validado en servicio, pero inalcanzable desde la UI (select siempre tiene valor por defecto) | — | P2 |
| 19.11 | Serie/número proveedor requerido | ✅ | — | — | — |
| 19.12 | Duplicado de comprobante | ✅ | `validarComprobanteCompraDuplicado`/`generarClaveUnicaCC` | — | — |
| 19.13 | Fecha requerida | 🟡 | Solo en lógica de servicio, mitigado por default de UI | — | P2 |
| 19.14 | Forma de pago | ❌ | `validarComprobanteCompraBasico` no la exige (asimetría con OC) | Agregar chequeo | P1 |
| 19.15 | Moneda | ❌ | Igual asimetría con OC | Agregar chequeo | P1 |
| 19.16 | Ítems | ✅ | — | — | — |
| 19.17 | Cantidad &gt; 0 | ❌ | No se repite el chequeo de OC en CC | — | **P0** |
| 19.18 | Costo &gt;= 0 | ❌ | Igual | — | **P0** |
| 19.19 | Almacén si afecta inventario | ✅ | Regla compartida con OC | — | — |
| 19.20 | OC aprobada si viene de OC | ❌ | Servicio no revalida `estadoAprobacion` | — | **P0** |
| 19.21 | No facturar más que lo pendiente de OC | ❌ | Sin ningún control de cantidades vs. OC | — | **P0** |

### Cuenta por Pagar

| # | Validación/comportamiento | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 19.22 | Generación automática al registrar CC a crédito | ✅ | — | — | — |
| 19.23 | Saldo correcto | ✅ | `aplicarPagoACuentaPorPagar` | — | — |
| 19.24 | Vencimiento correcto | ✅ | `calcularEstadoVencimiento` | — | — |
| 19.25 | Cuotas correctas | 🟡 | Solo cuota única (Fase 1 documentada) | Ver 8.15 | P1 |
| 19.26 | Estado pago correcto | ✅ | `recalcularEstadoCuentaPorPagar` | — | — |

### Pago

| # | Validación | Estado | Evidencia | Qué falta | Prioridad |
|---|---|---|---|---|---|
| 19.27 | Monto &gt; 0 | ✅ | `validarPagoCompraBasico` | — | — |
| 19.28 | Monto &lt;= saldo | ⚠️ | Solo en UI del modal, sin bloqueo de servicio | Agregar a `validarPagoCompraBasico` | P1 |
| 19.29 | Suma medios = monto | ✅ | — | — | — |
| 19.30 | Caja si efectivo | ✅ | Bloquea (no advierte) | — | — |
| 19.31 | Cuenta bancaria si transferencia/depósito | ✅ (con nota) | `TIPOS_MEDIO_BANCARIO=['TRANSFER','CHECK']`; no se confirmó si existe un tipo "DEPOSIT" separado en `PaymentMethod.type` que quedaría fuera de esta lista | Verificar el enum completo de `PaymentMethod.type` en Configuración | P1 |
| 19.32 | Referencia si aplica | ✅ | — | — | — |
| 19.33 | Serie PG | ✅ | Bloquea con error claro, sin fallback hardcodeado (corregido en Etapa 2) | — | — |
| 19.34 | Anulación (reglas de bloqueo) | ⚠️ | `motivoBloqueoAnulacionPago` **solo** bloquea si ya está anulado — no considera cierre de caja/periodo, ni estado de la CxP/CC asociada | Fortalecer las reglas de bloqueo | P1 |

### Inventario (desde Compras)

| # | Validación | Estado | Qué falta | Prioridad |
|---|---|---|---|---|
| 19.35 | No duplicar ingreso | N/A hoy | No aplica porque no existe flujo de generación de NI (ver sección 12) | **P0** (bloqueante indirecto) |
| 19.36 | No marcar ingreso automático falso | ✅ (por omisión) | `ingreso_automatico` está deshabilitado en la UI, evitando el riesgo por ahora | — |
| 19.37 | Relación con NI | ❌ | Ver sección 12 | **P0** |

---

## 20. RESULTADO FINAL DEL INFORME

### 1. Veredicto general

# ❌ NO APROBADO (con avances significativos ya corregidos en Etapas 1 y 2)

La Fase 1 de Compras tiene una base sólida: los 4 flujos principales (OC → CC → CxP → Pago) funcionan de punta a punta, y las correcciones de Etapa 1 (integridad documental) y Etapa 2 (campos críticos, eliminación de hardcodes de serie PG/medios de pago/caja, proveedor fantasma) ya cerraron una parte importante de los riesgos P0 originales. Sin embargo, subsisten **brechas P0 no corregidas** que impiden aprobar la fase sin reservas: la más severa es que **el puente Compras↔Inventario es una fachada completa** (modelo, mapeador y calculadoras de estado existen, cero wiring real), seguida de controles de integridad ausentes en la capa de servicio (sobrefacturación de OC vía CC, CC sin re-validar aprobación de OC, permisos de acción no aplicados, movimientos de caja no atómicos en escenarios reales de falla).

### 2. Resumen cuantitativo

| Categoría | Cantidad aproximada |
|---|---|
| **Campos/columnas/totales/estados auditados** | ~215 |
| ✅ Completos | ~120 |
| 🟡 Parciales | ~65 |
| ❌ Faltantes | ~30 |
| **Funciones/acciones/filtros/validaciones auditadas** | ~185 |
| ✅ Completas | ~95 |
| 🟡 Parciales | ~35 |
| ❌ Faltantes | ~55 |
| **Total de hallazgos priorizados (tabla de brechas)** | 62 |
| 🔴 P0 (bloqueante) | 17 |
| 🟠 P1 (importante) | 33 |
| 🟢 P2 (mejora) | 12 |

*(Conteo aproximado por naturaleza cualitativa de la auditoría; la evidencia exacta de cada ítem individual está en el detalle fila por fila de las secciones 1-19.)*

### 3. Tabla de brechas priorizadas (top P0/P1 — ver detalle completo en secciones 1-19)

| ID | Submódulo | Brecha | Impacto | Prioridad | Archivo sugerido | Acción recomendada |
|---|---|---|---|---|---|---|
| BR-01 | Compras↔Inventario | No existe acción real "Generar NI" desde OC/CC; mapeador y calculadoras de estado están escritos pero sin invocador | Ciclo Compra→Stock roto; `estadoInventario`/`estadoRecepcion` quedan congelados para siempre | P0 | `mapeadores/mapeadorCCaNI.ts`, `utilidades/calcularEstadosCompra.ts`, `contexto/ContextoCompras.tsx`, `gestion-inventario/` | Conectar el mapeador ya existente a un botón real "Generar NI" en OC/CC, y usar las funciones ya escritas en `calcularEstadosCompra.ts` en vez de valores hardcodeados |
| BR-02 | Comprobantes de Compra | Se puede generar CC desde una OC no aprobada; el servicio no revalida `estadoAprobacion` | Documentos financieros generados sin control de aprobación | P0 | `contexto/ContextoCompras.tsx` (`registrarComprobanteCompra`) | Agregar chequeo de `oc.estadoAprobacion` antes de crear el CC |
| BR-03 | Órdenes de Compra ↔ Comprobantes | Se puede generar múltiples CC completos desde la misma OC (sobrefacturación) | Duplicación/sobrefacturación de compras sin bloqueo | P0 | `logica/reglasCompras.ts` (`puedeGenerarCCDesdeOC`), `mapeadores/mapeadorOCaCC.ts` | Calcular cantidades pendientes reales por línea y bloquear cuando ya no quede saldo por facturar |
| BR-04 | Órdenes de Compra | `aprobarOrdenCompra`/`rechazarOrdenCompra` no revalidan reglas de negocio en el contexto (solo en UI) | Aprobación/rechazo de OC en estados inválidos vía llamada directa | P0 | `contexto/ContextoCompras.tsx` | Invocar `puedeAprobarOC`/`puedeRechazarOC` dentro de las funciones de contexto, no solo en la UI |
| BR-05 | Permisos | 8 de 12 permisos de Compras definidos pero nunca verificados (crear/editar/aprobar/anular OC, registrar/anular CC, registrar/anular pago) | Cualquier usuario con acceso al módulo puede ejecutar todas las acciones sin importar su rol | P0 | `contexto/ContextoCompras.tsx`, `componentes/listados/*`, `componentes/modales/*` | Aplicar verificación de permisos antes de cada acción mutadora |
| BR-06 | Pagos ↔ Caja | Movimiento de caja no siempre lanza error si falla (p.ej. sin permiso de caja); pago se persiste igual sin el egreso real | Descuadre de caja silencioso | P0 | `contexto/ContextoCompras.tsx` (`registrarMovimientosCajaPorMedios`), `control-caja/context/CajaContext.tsx` | Asegurar que todo fallo real de `agregarMovimiento` propague una excepción que `registrarPagoCompra` capture y aborte |
| BR-07 | Pagos ↔ Caja (anulación) | Si la caja está cerrada al anular un pago, la compensación se omite sin bloquear la anulación | Descuadre contable real al reabrir caja | P0 | `contexto/ContextoCompras.tsx` (`anularPagoCompra`) | Bloquear la anulación de pagos con medio de caja si la caja está cerrada, o generar una compensación diferida |
| BR-08 | Comprobantes de Compra | Validaciones de cantidad&gt;0 y costo&gt;=0 no se repiten para CC (sí existen para OC) | Líneas de CC con datos inválidos pueden persistirse | P0 | `servicios/servicioComprobanteCompra.ts` | Alinear `validarComprobanteCompraBasico` con `validarOrdenCompraBasica` |
| BR-09 | Comprobantes de Compra | No hay validación de "no facturar más de lo pendiente de la OC" | Sobrefacturación silenciosa | P0 | `mapeadores/mapeadorOCaCC.ts`, `logica/reglasCompras.ts` | Calcular pendiente real por línea de OC y bloquear el exceso en el submit del CC |
| BR-10 | Módulo general | Sin paginación en las 4 tablas | Riesgo de rendimiento con volumen real de datos | P1 | `componentes/listados/Tabla*.tsx` | Implementar paginación |
| BR-11 | Módulo general | Sin exportación de listados en ninguna entidad | Usuarios no pueden auditar/reportar fuera del sistema | P1 | `componentes/listados/Tabla*.tsx` | Implementar exportar CSV/Excel |
| BR-12 | Módulo general | Filtros de fecha soportados en lógica pero sin UI en las 4 tablas | Funcionalidad de filtrado inalcanzable | P1 | `componentes/listados/Tabla*.tsx` | Agregar inputs de rango de fecha |
| BR-13 | Detalle OC/CC | Documentos relacionados (CC↔OC, CxP, pagos, NI) no se muestran pese a estar persistidos | Usuario no puede navegar la trazabilidad real del documento | P1 | `componentes/detalle/PanelDetalle*.tsx` | Agregar secciones de "Documentos relacionados" con enlaces |
| BR-14 | Pagos | Monto de pago &gt; saldo pendiente sin bloqueo de servicio (solo UI) | Sobrepago silencioso si se bypasea el modal | P1 | `servicios/servicioPagoCompra.ts` | Agregar validación en `validarPagoCompraBasico` |
| BR-15 | Fuentes de verdad | Cuenta bancaria en el pago no valida coincidencia de moneda | Pago con cuenta en moneda distinta a la CxP | P1 | `componentes/modales/ModalRegistrarPagoCompra.tsx` | Filtrar/advertir por `currencyCode` |
| BR-16 | Fuentes de verdad | Proveedores: doble fuente de datos (localStorage directo en `ContextoCompras` vs. `useClientes` en `BuscadorProveedor`) | Riesgo de listas desincronizadas | P1 | `contexto/ContextoCompras.tsx` (`cargarProveedores`) | Unificar en `useClientes` |
| BR-17 | Impresión/correo | Sin exportables/impresión/correo en ninguna entidad | Gap funcional visible frente al sistema anterior | P1 | Nuevo módulo compartido, reutilizando patrones de `comprobantes-electronicos` | Priorizar al menos PDF/impresión de OC y constancia de pago |

### 4. Plan recomendado de implementación

**Etapa 1 — P0 funcionales (bloqueantes, previos a cualquier avance de fase):**
BR-01 a BR-09: conectar el puente Inventario, cerrar los huecos de re-validación de servicio (aprobación de OC, sobrefacturación OC→CC, cantidad/costo en CC), aplicar permisos granulares, y corregir la atomicidad de los movimientos de caja al pagar/anular.

**Etapa 2 — Campos y validaciones faltantes críticas:**
Alinear validaciones CC vs OC (moneda, forma de pago); agregar validación de servicio "pago ≤ saldo"; exponer cantidades recibida/facturada/pendiente en el detalle de OC; mostrar documentos relacionados (OC↔CC↔CxP↔Pago) en los 4 paneles de detalle; fortalecer `motivoBloqueoAnulacionPago`.

**Etapa 3 — Listados, exportables y detalles:**
Paginación real en las 4 tablas; filtros de fecha en UI (la lógica ya existe); exportación CSV/Excel; impresión/PDF/correo de OC, CC y constancia de pago (reutilizando patrones de `comprobantes-electronicos`); acciones (aprobar/rechazar/anular/generar CC) también accesibles desde los paneles de detalle, no solo desde el menú de la tabla.

**Etapa 4 — Mejoras / futuro (Fase 2-3 ya identificadas en el roadmap del proyecto):**
Multi-cuota real en CxP; pago aplicado a múltiples CxP; centro de costo/presupuesto como catálogo real; contacto de proveedor; tratamiento diferenciado de suministros; campos de valor/fecha de adquisición para activos fijos; edición/duplicado de OC; control presupuestal bloqueante.

### 5. Conclusión clara

**Qué falta para aprobar Fase 1:** cerrar las brechas P0 (BR-01 a BR-09), con foco especial en BR-01 (puente Inventario) por ser la que más compromete el ciclo funcional completo del módulo, y en BR-05 (permisos) por ser un riesgo de control de acceso transversal a todas las acciones mutadoras.

**Qué NO debe implementarse todavía:** exportación/impresión/correo completos (Etapa 3, no bloqueante para el ciclo transaccional), multi-cuota y pago multi-CxP (ya decidido como Fase 2), centro de costo/presupuesto como catálogo real, módulo de Activos Fijos completo, tratamiento contable diferenciado de suministros.

**Qué corresponde a fase futura:** todo lo señalado como P2 en las tablas anteriores — son mejoras de UX/completitud (columnas adicionales, ISC/IVAP/OTC, histórico de productos, stock informativo en línea, guardar borrador) que no bloquean el uso funcional de Fase 1 una vez cerrados los P0/P1 críticos.
