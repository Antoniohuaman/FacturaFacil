# Auditoría — Trazabilidad y Navegación de Documentos Relacionados (Compras)

**Módulo:** Compras — SenciYo (`apps/senciyo/src/pages/Private/features/compras`)
**Cadena auditada:** Orden de Compra (OC) → Comprobante de Compra (CC) → Cuenta por Pagar (CxP) → Pago de Compra (PG)
**Tipo de tarea:** Auditoría exclusiva. No se modificó ningún archivo funcional.
**Metodología:** Lectura directa del código fuente real (modelos, contexto, servicios, mapeadores, tablas, drawers, componente `Drawer` compartido) y verificación cruzada de cada relación por `grep` de sus sitios de escritura y lectura reales. Ningún hallazgo se basa solo en el nombre de un campo o tipo.

---

## 1. Resumen ejecutivo

El módulo Compras **sí implementa** una cadena documental real y navegable OC → CC → CxP → PG, con enlaces clicables funcionales en la mayoría de los puntos de la matriz. Las relaciones de **ida** (documento origen → documento derivado) están bien resueltas y, en su mayoría, usan una fuente de verdad clara.

Sin embargo, la auditoría encontró tres categorías de problemas reales, verificados en código:

1. **No existe ningún mecanismo de navegación con memoria.** El componente `Drawer` compartido no tiene pila, breadcrumb ni "volver": es un panel único gobernado por un solo valor de estado (`vista` en `PaginaCompras.tsx`). Cerrar (`X`) **siempre** regresa al listado (`{ tipo: 'lista' }`), sin importar cuántos niveles de documentos relacionados haya recorrido el usuario. No hay retorno "nivel por nivel".
2. **Dos relaciones están modeladas pero no se usan para navegación real**, y una tercera relación se resuelve por dos caminos distintos (redundancia sin desincronización *hoy*, pero sin una razón funcional para mantener ambos).
3. **Un estado derivado de la OC no se revierte cuando el documento que lo originó se anula**, dejando una OC marcada "Convertida" (y bloqueada para anularse) de forma permanente aunque su único CC esté anulado.

No se encontró navegación hacia documentos incorrectos, ni relaciones cruzadas entre proveedores distintos, ni fabricación de series/números falsos. La cadena documental **es de solo lectura tanto en integridad como en presentación**: el drawer nunca permite editar el documento relacionado desde dentro de otro.

## 2. Veredicto general

**Aprobado con observaciones.**

La trazabilidad de ida funciona y es verificable por código en el 100% de los pares de documentos que realmente pueden relacionarse. La trazabilidad de **retorno contextual** (recordar de dónde vino el usuario y poder deshacer el camino paso a paso) **no existe** como mecanismo — solo existe un efecto colateral parcial (las tablas de listado no se desmontan al abrir un drawer, así que el filtro/búsqueda/página del tab de origen sobrevive), que no debe confundirse con navegación con historial.

## 3. Arquitectura actual de relaciones

Toda la orquestación vive en un único componente de página, `PaginaCompras.tsx`, que mantiene:

- `tabActivo: 'ordenes' | 'comprobantes' | 'cuentas_por_pagar' | 'pagos'` — pestaña principal.
- `vista: Vista` — unión discriminada de **un solo valor activo a la vez** (`{ tipo: 'lista' }`, `{ tipo: 'detalle_oc'; ocId }`, `{ tipo: 'detalle_cc'; ccId }`, `{ tipo: 'detalle_cxp'; cxpId }`, `{ tipo: 'detalle_pago'; pagoId }`, más las vistas de formulario).

Los cuatro drawers (`PanelDetalleOrdenCompra`, `PanelDetalleComprobanteCompra`, `PanelDetalleCuentaPorPagar`, `PanelDetallePagoCompra`) se renderizan como **hermanos condicionales** (`{ocDetalle && <PanelDetalleOrdenCompra .../>}`, etc.), nunca anidados. Cuando `vista.tipo` cambia de `'detalle_oc'` a `'detalle_cc'`, el primer drawer se desmonta (animación de salida) y el segundo se monta (animación de entrada): **es un reemplazo, no un apilamiento**.

Cada documento relacionado se resuelve **en el momento de renderizar**, buscando en los arrays completos del contexto (`state.ordenes`, `state.comprobantes`, `state.cuentasPorPagar`, `state.pagos`), nunca desde una copia local cacheada. Esto es correcto: cada vez que se abre un documento relacionado se ve su estado más reciente.

El componente compartido `Drawer` (`shared/ui/drawer/Drawer.tsx`) no tiene ningún concepto de historial: sus únicas props de navegación son `abierto`, `alCerrar` y `accionesEncabezado`. No expone pila, ni `onVolver`, ni breadcrumb.

## 4. Diagrama textual de la cadena documental

```
Orden de Compra (OC)
  │  oc.comprobantesCompraRelacionados: string[]   (escrito, casi no leído — ver hallazgo H-03)
  │  comprobantes.filter(cc => cc.ordenCompraOrigenId === oc.id)   (fuente REAL usada por listado y drawer)
  ▼
Comprobante de Compra (CC)
  │  cc.ordenCompraOrigenId?: string                (FK real hacia OC — usada consistentemente)
  │  cc.cuentaPorPagarId?: string                    (FK real hacia CxP)
  │  cc.pagosRelacionados?: string[]                 (escrito, NUNCA leído — ver hallazgo H-01)
  ▼
Cuenta por Pagar (CxP)
  │  cxp.comprobanteCompraId: string                 (FK real hacia CC, obligatorio)
  │  cxp.pagosRelacionados: string[]                  (FK real hacia Pagos — fuente REAL usada)
  ▼
Pago de Compra (PG)
     pago.cuentasPorPagarAplicadas: string[]          (FK real hacia CxP — usada por PanelDetallePagoCompra)
     pago.comprobantesCompraAplicados: string[]       (FK redundante hacia CC — usada solo por PanelDetalleComprobanteCompra, ver H-01)
```

`OC → CxP` y `OC → Pago` **no existen como relación directa en el modelo** (correcto: no deben inventarse). Se derivan legítimamente en dos saltos (OC→CC→CxP, OC→CC→CxP→Pago), y así es exactamente como los recorre el código real (ver matriz).

## 5. Inventario de archivos auditados

**Modelos:** `modelos/OrdenCompra.ts`, `modelos/ComprobanteCompra.ts`, `modelos/CuentaPorPagar.ts`, `modelos/PagoCompra.ts`, `modelos/LineaCompra.ts`.

**Contexto y servicios:** `contexto/ContextoCompras.tsx` (completo — reducers, `registrarComprobanteCompra`, `generarCxPYEnlaceCC`, `anularComprobanteCompra`, `registrarPagoCompra`, `anularPagoCompra`, `actualizarOrdenCompra`, `propagarActualizacionOCaCC`), `servicios/servicioOrdenCompra.ts`, `servicios/servicioComprobanteCompra.ts`, `servicios/servicioCuentaPorPagar.ts`, `servicios/servicioPagoCompra.ts`, `mapeadores/mapeadorOCaCC.ts`, `mapeadores/mapeadorCCaCuentaPorPagar.ts`.

**Lógica de dominio:** `logica/reglasCompras.ts`, `logica/filtrosCompras.ts`.

**Listados:** `componentes/listados/TablaOrdenesCompra.tsx`, `TablaComprobantesCompra.tsx`, `TablaCuentasPorPagar.tsx`, `TablaPagosCompra.tsx`.

**Drawers:** `componentes/detalle/PanelDetalleOrdenCompra.tsx`, `PanelDetalleComprobanteCompra.tsx`, `PanelDetalleCuentaPorPagar.tsx`, `PanelDetallePagoCompra.tsx`.

**Formularios (acciones que abren/generan documentos derivados):** `componentes/formularios/FormularioOrdenCompra.tsx`, `FormularioComprobanteCompra.tsx`.

**Orquestación:** `paginas/PaginaCompras.tsx`.

**Componentes compartidos transversales:** `shared/ui/drawer/Drawer.tsx`, `constantes/estadosCompras.ts`, `utilidades/formatearCompras.ts`.

No se auditó Cobranzas, POS, Caja, Inventario ni comprobantes electrónicos: la cadena de Compras no los referencia directamente (dominio correctamente desacoplado — ver sección 11).

## 6. Fuentes de verdad de cada relación

| Relación | Campo(s) que la sostienen | Tipo de fuente | Verificado en |
|---|---|---|---|
| CC → OC | `cc.ordenCompraOrigenId?: string` | FK directa, única fuente real | `ComprobanteCompra.ts:116`; consumida en `TablaComprobantesCompra.tsx:372`, `PanelDetalleComprobanteCompra.tsx:194`, `ContextoCompras.tsx` (bloqueo/propagación) |
| OC → CC (listado de generados) | `comprobantes.filter(c => c.ordenCompraOrigenId === oc.id)` | Derivada (reconstruida por búsqueda), **no** usa `oc.comprobantesCompraRelacionados` | `TablaOrdenesCompra.tsx:396`, `PanelDetalleOrdenCompra.tsx:199` |
| OC → CC (estado "Convertida"/bloqueo de anulación) | `oc.comprobantesCompraRelacionados?: string[]` | Array persistido, **solo se usa para dos cálculos de estado**, nunca para listar/navegar | `reglasCompras.ts:18,93`; escrito en `ContextoCompras.tsx:296` |
| CC → CxP | `cc.cuentaPorPagarId?: string` | FK directa | Escrita en `ContextoCompras.tsx` (`generarCxPYEnlaceCC`), consumida en el formulario y en `actualizarComprobanteCompra` |
| CxP → CC (drawer de CC) | `cuentasPorPagar.find(c => c.comprobanteCompraId === cc.id)` | Derivada por búsqueda inversa, **no usa `cc.cuentaPorPagarId`** aunque ese campo existe y sería la ruta directa | `PanelDetalleComprobanteCompra.tsx:195` |
| CxP → CC (listado de CxP) | `comprobantes.find(c => c.id === cxp.comprobanteCompraId)` | FK directa (`cxp.comprobanteCompraId`, obligatorio) | `TablaCuentasPorPagar.tsx:725`, `PanelDetalleCuentaPorPagar.tsx:111` |
| CxP → Pago | `cxp.pagosRelacionados: string[]` | Array persistido, única fuente real, mantenido por `aplicarPagoACuentaPorPagar`/`revertirPagoDeCuentaPorPagar` | `servicioCuentaPorPagar.ts:209,248`; consumido en `TablaCuentasPorPagar.tsx:354`, `PanelDetalleCuentaPorPagar.tsx:110,299-334` |
| Pago → CxP | `pago.cuentasPorPagarAplicadas: string[]` | FK directa | `PanelDetallePagoCompra.tsx`, `TablaPagosCompra.tsx:701` |
| Pago → CC (directa) | `pago.comprobantesCompraAplicados: string[]` | FK directa, redundante con la ruta indirecta (Pago→CxP→CC) | Escrita una sola vez en `useFormularioPagoCompra.ts:285` como `[cxp.comprobanteCompraId]`; **su único consumidor es `PanelDetalleComprobanteCompra.tsx:197`** |
| CC → Pago (drawer de CC) | `pagos.filter(p => p.comprobantesCompraAplicados.includes(cc.id))` | Usa la FK directa de arriba | `PanelDetalleComprobanteCompra.tsx:197` |
| CC → Pago (campo `cc.pagosRelacionados`) | `cc.pagosRelacionados?: string[]` | Array persistido, **sin ningún consumidor de UI** | Escrito en `ContextoCompras.tsx:1616,1708` (registrar/anular pago); ningún componente lo lee |
| Pago → CC (drawer de Pago) | `cuentasPorPagar.find(c => pago.cuentasPorPagarAplicadas.includes(c.id))` → `comprobantes.find(c => c.id === cxp.comprobanteCompraId)` | Derivada en dos saltos vía CxP — **no usa `pago.comprobantesCompraAplicados`**, la otra FK directa que sí existe | `PanelDetallePagoCompra.tsx` |
| Pago → OC / OC → Pago | Derivada en cadena completa (Pago→CxP→CC→OC) | Legítima, no persistida directamente (correcto: no debe existir un atajo) | `PanelDetallePagoCompra.tsx` (recibe `ordenes` y deriva `ocOrigen` desde el `comprobanteOrigen`) |

**Ningún nombre, serie o correlativo se fabrica**: todas las etiquetas mostradas (`formatearNumeroCompra`, `formatearNumeroComprobanteCompra`, `cxp.comprobanteCompraNumero`) provienen de campos reales o de una función central de formateo, nunca de texto libre ni de coincidencia de proveedor/nombre.

## 7. Auditoría por documento

### 7.1 Orden de Compra

- **Listado** (`TablaOrdenesCompra.tsx`): columna configurable `documentoRelacionado` (label "Documento relacionado", corto "Doc. Relacionado"), oculta por defecto salvo que el usuario la active — de hecho **está en las columnas visibles por defecto** (`COLUMNAS_VISIBLES_DEFAULT_OC`). Si hay un solo CC relacionado, muestra un botón clicable con `serieProveedor-numeroProveedor`; si hay más de uno, muestra `"{n} comprobantes"` como texto **no clicable**, con un `title` (tooltip nativo) que lista todos los números separados por coma. **No hay forma de abrir un comprobante específico desde la celda cuando son varios** — solo se ve el conteo.
- **Drawer** (`PanelDetalleOrdenCompra.tsx`): pestaña "Documentos relacionados" (ícono `Link2`) lista **todos** los comprobantes generados (`comprobantes.filter(c => c.ordenCompraOrigenId === oc.id)`), cada uno como fila clicable con número + total, sin límite — aquí sí se puede abrir cualquiera de los varios CC.
- **Historial:** eventos propios de la OC (`'Orden de compra registrada'`, `'Orden de compra actualizada'`, `'Orden duplicada'`, etc.), sin mezclar eventos de CC/CxP/Pago.
- **Acciones que abren documentos derivados:** "Generar comprobante" (crea, no navega a uno existente); en el drawer, la fila de cada CC relacionado en la pestaña "Documentos relacionados".

### 7.2 Comprobante de Compra

- **Listado** (`TablaComprobantesCompra.tsx`): columna configurable `documentoRelacionado` ("Documento relacionado" / "Doc. Relacionado"), visible por defecto, muestra la OC origen como botón clicable con `formatearNumeroCompra`, o `—` si no proviene de OC. Esta columna **es 1:1** (un CC solo puede tener una OC origen), por lo que no aplica el problema de "varios documentos" que sí afecta a OC/Pagos.
- **Drawer** (`PanelDetalleComprobanteCompra.tsx`): pestaña "Documentos relacionados" con tres secciones en orden: "Orden de compra origen" (fila clicable o mensaje "no proviene de una orden de compra"), "Cuenta por pagar" (fila clicable con saldo + badge de estado, o mensaje si no existe), "Pagos (N)" (lista de filas clicables, cada una con número, monto y badge de estado del pago).
- **Historial:** eventos propios (`'Comprobante registrado'`, `'Comprobante de compra actualizado'`, incluyendo el evento de propagación `"Por actualización de la Orden de Compra origen"`).

### 7.3 Cuenta por Pagar

- **Listado** (`TablaCuentasPorPagar.tsx`): columna fija "Comprobante" (no configurable, siempre visible) con el número de CC como botón clicable. Columna configurable "Último pago" (oculta por defecto) muestra solo el número del pago más reciente, sin navegación (texto plano).
- **Drawer** (`PanelDetalleCuentaPorPagar.tsx`): sección "Documento origen" en el tab General (fila clicable hacia el CC), y tab separado "Pagos relacionados" con todas las filas de pago (número, fecha, medios, monto, badge de estado), cada una clicable. **No existe una fila/sección para navegar directamente a la OC** desde este drawer — es coherente con el modelo (CxP no tiene FK a OC), pero el usuario debe pasar primero por el CC para llegar a la OC (dos saltos, correcto conceptualmente, pero sin atajo directo).
- **Historial:** eventos propios (`'Cuenta por pagar generada'`, `'Pago registrado'`, `'Pago anulado'`, `'Cuenta por pagar resincronizada'`).

### 7.4 Pago de Compra

- **Listado** (`TablaPagosCompra.tsx`): **no tiene una columna fija "Doc. Relacionado"** como OC/CC. En su lugar tiene dos columnas configurables independientes: `documentoOrigen` (texto plano con `cxp?.comprobanteCompraNumero`, **no clicable** en la tabla) y `cxpRelacionada` (botón clicable, mismo texto, invoca `onVerCuentaPorPagar`). Ambas están en el conjunto configurable; solo `documentoOrigen` viene visible por defecto. Esto es una inconsistencia de nomenclatura/patrón frente a OC y CC (ver hallazgo H-05).
- **Drawer** (`PanelDetallePagoCompra.tsx`): tab "Documentos relacionados" con cuatro secciones: "Cuenta por pagar" (clicable), "Comprobante de Compra" (clicable), "Orden de Compra" (clicable u "este pago no proviene de una orden de compra"), "Caja" (**no navegable, solo texto** — indicador derivado de `pago.cajaId`/`tieneMedioDeCaja`, documentado en rondas previas como límite real de infraestructura, no un enlace roto).
- **Historial:** eventos propios (`'Pago registrado'`, `'Pago anulado'`).

## 8. Auditoría de navegación de ida y retorno

Verificado leyendo `Drawer.tsx` completo y las 4 llamadas a `<PanelDetalleX .../>` en `PaginaCompras.tsx`:

| Pregunta | Respuesta verificada |
|---|---|
| ¿Abre en el drawer correcto? | Sí — cada `onVerX` mapea a un `setVista({ tipo: 'detalle_X', ... })` distinto y sin ambigüedad. |
| ¿Reemplaza el drawer actual? | Sí. `vista` es un único valor; el drawer anterior se desmonta al cambiar `vista.tipo`. |
| ¿Abre uno encima de otro? | No. Los 4 `<PanelDetalleX>` son ramas mutuamente excluyentes de un mismo `if`/render condicional. |
| ¿Cierra el anterior? | Sí, automáticamente (efecto del reemplazo de `vista`), pero como una consecuencia del re-render, no como una transición "cerrar A, abrir B" explícita ni animada en conjunto. |
| ¿Cambia de tab principal? | **No, nunca**, en ninguna navegación cruzada entre documentos relacionados (`onVerComprobante`, `onVerOrdenCompra`, `onVerCuentaPorPagar`, `onVerPago` no llaman `setTabActivo`). Sí cambia en los `onExito` de los formularios de creación/edición. |
| ¿Cambia la URL? | No, para toda la navegación entre drawers (estado de React puro). Sí cambia para "Registrar pago" (`navigate('/compras/pagos/nuevo?...')`, una ruta real separada). |
| ¿Usa navegación interna, contexto, estado local o rutas? | Estado local de componente (`useState<Vista>`) para toda la trazabilidad; rutas reales solo para el flujo de registrar pago. |
| ¿Queda registrado de qué documento vino el usuario? | **No.** `Vista` no guarda ningún origen ni pila. Cada `setVista` reemplaza el valor anterior sin dejar rastro. |
| ¿Existe una acción "Volver"? | No existe ningún botón "Volver" en ningún drawer. Solo existe "X" (cerrar) y los tabs de cada drawer (que no son navegación entre documentos, son vistas del mismo documento). |
| ¿El botón volver retorna al documento anterior? | No aplica — no existe ese botón. |
| ¿La "X" cierra todo el recorrido o solo el actual? | **Cierra todo el recorrido.** El `onCerrar` de los 4 drawers en `PaginaCompras.tsx` es, sin excepción, `() => setVista({ tipo: 'lista' })`. No hay diferencia entre haber abierto el drawer directamente desde el listado o haber llegado allí tras 3 saltos. |
| ¿Se puede recorrer OC → CC → CxP → Pago? | Sí, verificado: cada drawer intermedio expone la acción de navegación necesaria (`onVerComprobante` en OC, `onVerCuentaPorPagar` en CC, `onVerPago` en CxP). |
| ¿Se puede regresar Pago → CxP → CC → OC nivel por nivel? | **No.** Solo se puede **avanzar** hacia esos documentos otra vez (por ejemplo, desde el drawer de Pago volver a abrir la CxP vía su propia sección "Cuenta por pagar"), lo cual es navegación hacia adelante repetida, no un "volver" real. Cerrar en cualquier punto salta directo al listado. |
| ¿Riesgo de ciclo OC → CC → OC → CC...? | Técnicamente posible (nada lo impide), pero **sin riesgo técnico**: no hay pila que crezca; cada salto solo reemplaza el único valor `vista`. Es un problema de UX potencial (bucle repetitivo), no de estabilidad. |
| ¿Protección contra pila infinita? | No es necesaria dado el diseño (no hay pila), pero por la misma razón tampoco hay protección contra navegación circular porque no hay "historial" que pueda desbordarse. |
| ¿Botón atrás del navegador? | **Inconsistente.** Como ninguna transición de `vista`/`tabActivo` empuja una entrada al historial del navegador, el botón "Atrás" ignora por completo los drawers y tabs, y navega a la página que estaba abierta *antes* de entrar a Compras. |
| ¿Cerrar devuelve al listado desde el que empezó? | Devuelve al **tab** desde el que empezó (ver sección 9), pero no al documento específico ni al filtro de esa apertura puntual si hubo varios saltos. |

**Conclusión de la sección:** no existe pila, breadcrumb ni historial contextual de ningún tipo. La única "memoria" que existe es indirecta: como las tablas de listado nunca se desmontan mientras se navega entre drawers (ver sección 9), el usuario vuelve a ver el tab y los filtros de origen, pero **nunca** un camino de regreso explícito por los documentos intermedios.

## 9. Conservación del contexto del listado

Verificado en `PaginaCompras.tsx`: los bloques `{tabActivo === 'ordenes' && <TablaOrdenesCompra .../>}` (y análogos) son hermanos de los bloques `{ocDetalle && <PanelDetalleOrdenCompra .../>}`. Abrir un drawer **no desmonta** la tabla del tab activo, porque ninguna navegación entre documentos relacionados llama `setTabActivo`.

| Elemento | ¿Se conserva? | Motivo verificado |
|---|---|---|
| Tab principal | **Sí**, mientras la navegación sea solo entre drawers relacionados | `onVerX` nunca llama `setTabActivo`; solo lo hacen los `onExito` de formularios |
| Texto de búsqueda | Sí | Vive en `useState<Filtros...>` interno de cada `TablaXCompra`, que no se desmonta |
| Filtros activos | Sí | Mismo motivo |
| Rango y campo de fecha | Sí | Mismo motivo |
| Columnas personalizadas | Sí | Persistidas además en `localStorage` por tabla (`STORAGE_KEY_COLUMNAS_*`), sobreviven incluso a un refresh completo |
| Ordenamiento | No aplica | Ninguna tabla de Compras implementa ordenamiento por columna (no es una funcionalidad existente, no un defecto de esta auditoría) |
| Página actual | Sí (en CxP y Pagos, que sí paginan) | `paginaActual` es `useState` local, componente no se desmonta |
| Filas por página | No configurable | Ninguna tabla expone selector de tamaño de página (tamaño fijo por constante) |
| Scroll vertical/horizontal | **No verificable por código** — depende del navegador real; el contenedor no fuerza un `scrollTo(0,0)` explícito, pero tampoco hay evidencia de que se preserve el scroll exacto |
| Documento previamente seleccionado | **No.** Al volver a `{tipo:'lista'}` no hay resaltado, ni scroll automático hasta la fila del documento que se estaba viendo |

**Importante:** esta conservación de contexto es un **efecto colateral de la arquitectura de montaje**, no un mecanismo de navegación deliberado. Si en el futuro alguna navegación cruzada agrega un `setTabActivo` (por ejemplo, para "saltar" al tab correcto al abrir un documento de otro tipo), este comportamiento se rompe silenciosamente sin que exista ninguna prueba o contrato que lo proteja.

## 10. Relaciones múltiples

### 10.1 OC con varios CC (facturación parcial)

- Columna "Doc. Relacionado" del listado de OC: si `relacionados.length > 1`, muestra `"{n} comprobantes"` como **texto no clicable** con tooltip nativo (`title`) listando los números. El usuario **no puede** abrir un comprobante específico desde el listado de OC cuando hay más de uno — debe entrar al drawer de la OC y usar la pestaña "Documentos relacionados", que sí lista todos con acceso individual.
- El contador (`relacionados.length`) es correcto porque se deriva en tiempo real (`comprobantes.filter(...)`), no de un array persistido que pudiera quedar desactualizado.
- El estado "Convertida" (`calcularEstadoPrincipalOC`) se activa con el primer CC generado y **no distingue** facturación parcial de total: una OC con 2 de 3 líneas facturadas se ve exactamente igual ("Convertida") que una totalmente facturada. La única señal de facturación parcial vive en `oc.estadoFacturacion` (`'parcial'` vs `'completa'`), mostrado en el drawer bajo "Estados operativos secundarios" — separado del badge principal, fácil de pasar por alto.

### 10.2 CxP con varios pagos

- Tab "Pagos relacionados" del drawer de CxP lista todos los pagos aplicados (`cxp.pagosRelacionados`), incluyendo pagos anulados (no se filtran, se muestran con su badge "Anulado" en rojo). Orden de presentación: **el orden natural del array** `cxp.pagosRelacionados` (orden de aplicación), no hay reordenamiento explícito por fecha.
- Cada fila es individualmente clicable y navegable.
- Columna "Último pago" del listado de CxP (`ultimoPago`) sí ordena por fecha (`.sort((a,b) => a.fechaPago < b.fechaPago ? 1 : -1)`) para mostrar el más reciente, pero esa celda **no es clicable**.

### 10.3 CC con CxP y varios pagos: ¿doble presentación?

Confirmado: el drawer de CC muestra los pagos **directamente** (tab "Documentos relacionados" → sección "Pagos (N)", vía `pago.comprobantesCompraAplicados`) **y también** permite llegar a ellos indirectamente abriendo primero la CxP y luego su tab de pagos. Ambas rutas llevan al mismo `PanelDetallePagoCompra` con el mismo `pagoId`, así que **no hay inconsistencia de destino**. Esta duplicación de acceso es funcionalmente razonable para un documento de auditoría (ver un pago sin salir del CC es más rápido que CC→CxP→Pago), pero implica mantener **dos relaciones para el mismo hecho** (`pago.comprobantesCompraAplicados` de un lado, `cxp.pagosRelacionados` + `cxp.comprobanteCompraId` del otro) sin que ninguna las reconcilie si llegaran a divergir.

## 11. Estados vacíos y documentos anulados

- **Listados:** las 4 tablas distinguen correctamente "cargando" (skeleton), "error de carga" (mensaje + Reintentar), "sin datos reales" y "sin resultados por filtro" (con botón "Limpiar filtros") — patrón uniforme y ya verificado en rondas anteriores de este mismo módulo.
- **Documentos anulados en relaciones:** el drawer de CxP muestra pagos anulados sin ocultarlos (correcto, es historial real). El drawer de CC muestra la OC origen aunque esté anulada (no se bloquea el enlace ni se advierte visualmente que la OC de destino está anulada — el usuario solo lo descubre al abrirla y ver el badge rojo "Anulada" allí). Ningún drawer previene navegar hacia un documento anulado; tampoco debería bloquearlo (es información real), pero **no hay ninguna advertencia previa** ("este documento relacionado está anulado") antes de hacer clic.
- **CxP saldada:** al llegar a "pagada", la CxP normalmente sale de la bandeja operativa (`soloPendientes` por defecto en el filtro), pero sigue siendo accesible por navegación directa desde el CC (`onVerCuentaPorPagar`), mostrando correctamente su badge "Pagada".

## 12. Matriz bidireccional completa

| Documento actual | Documento relacionado | Dirección | Fuente de la relación | Se muestra | Es clicable | Destino correcto | Permite retornar | Observación |
|---|---|---|---|---|---|---|---|---|
| OC | CC | OC→CC | Derivada (`cc.ordenCompraOrigenId === oc.id`) | Sí (listado col. + drawer tab) | Solo si hay 1; si hay varios, listado no navega (drawer sí) | Sí | No (cierra a listado) | H-02 |
| CC | OC | CC→OC | FK directa `cc.ordenCompraOrigenId` | Sí (listado col. + drawer tab) | Sí | Sí | No | — |
| CC | CxP | CC→CxP | Derivada inversa (`cxp.comprobanteCompraId === cc.id`), ignora la FK directa `cc.cuentaPorPagarId` | Sí (drawer tab) | Sí | Sí | No | H-04 |
| CxP | CC | CxP→CC | FK directa `cxp.comprobanteCompraId` | Sí (listado col. fija + drawer) | Sí | Sí | No | — |
| CxP | Pago | CxP→Pago | Array persistido `cxp.pagosRelacionados`, única fuente real | Sí (listado col. opcional "Último pago" no clicable + drawer tab, todas clicables) | Parcial (listado no, drawer sí) | Sí | No | H-06 |
| Pago | CxP | Pago→CxP | FK directa `pago.cuentasPorPagarAplicadas` | Sí (listado col. + drawer) | Sí | Sí | No | — |
| CC | Pago | CC→Pago | FK directa `pago.comprobantesCompraAplicados` (redundante) | Sí (drawer tab "Pagos") | Sí | Sí | No | H-01 |
| Pago | CC | Pago→CC | Derivada en 2 saltos vía CxP, **no usa** `pago.comprobantesCompraAplicados` | Sí (listado col. + drawer) | Sí | Sí | No | H-01 |
| OC | CxP | OC→CxP (cuando corresponde) | Derivada en 2 saltos (OC→CC→CxP), no persistida directa | **No se muestra en ningún lado** (ni listado ni drawer de OC ofrecen ir directo a la CxP) | — | — | — | H-07 |
| CxP | OC | CxP→OC (cuando corresponde) | Derivada en 2 saltos (CxP→CC→OC), no persistida directa | **No se muestra** en el drawer de CxP | — | — | — | H-07 |
| OC | Pago | OC→Pago (cuando corresponde) | Derivada en 3 saltos, no persistida | No se muestra (correcto: no inventar un atajo) | — | — | — | Correcto por diseño |
| Pago | OC | Pago→OC (cuando corresponde) | Derivada en 3 saltos vía CC | Sí (drawer de Pago, sección "Orden de Compra") | Sí | Sí | No | — |

Leyenda de tipos de relación usados arriba: **FK directa** = campo con el id real del documento relacionado; **Derivada** = se reconstruye por búsqueda en un array completo usando otro campo como filtro (legítimo); **Redundante** = existe más de un camino válido para el mismo hecho.

## 13. Hallazgos

### H-01 — P1 — Dos rutas distintas resuelven la relación Pago ↔ CC, cada drawer usa una distinta

- **Documento afectado:** Comprobante de Compra, Pago de Compra.
- **Archivo/componente:** `PanelDetalleComprobanteCompra.tsx:197` (usa `pago.comprobantesCompraAplicados`) vs. `PanelDetallePagoCompra.tsx` (usa `cuentasPorPagarAplicadas` → `cxp.comprobanteCompraId`).
- **Comportamiento actual:** el mismo hecho de negocio ("este pago pertenece a este comprobante") se lee de dos campos distintos según qué drawer pregunta.
- **Comportamiento esperado:** una única fuente de verdad para "pagos de un CC" / "CC de un pago", consumida igual desde ambos lados.
- **Causa raíz:** `pago.comprobantesCompraAplicados` se agregó al modelo (probablemente pensando en pagos multi-CxP futuros) y se pobló, pero la navegación desde el lado del Pago nunca se migró a usarlo; siguió resolviendo vía CxP.
- **Riesgo:** hoy nulo (ambas rutas coinciden porque se escriben en el mismo instante), pero si en el futuro se soporta un pago que aplique a más de una CxP/CC, ambas rutas podrían divergir sin que nada lo detecte.
- **Recomendación conceptual:** decidir una única fuente (probablemente `comprobantesCompraAplicados`, ya que es la más directa) y que ambos drawers la consuman igual; no mantener las dos.
- **Alcance estimado:** bajo (cambiar una expresión de derivación en un componente).
- **Dependencias:** ninguna.
- **Tipo de cambio:** solo presentación (cambia qué campo lee el componente, no el modelo).

### H-02 — P1 — El listado de OC no permite abrir un comprobante específico cuando hay varios

- **Documento afectado:** Orden de Compra.
- **Archivo/componente:** `TablaOrdenesCompra.tsx`, función `renderCeldaColumna`, caso `'documentoRelacionado'`.
- **Comportamiento actual:** con más de un CC relacionado, la celda muestra `"{n} comprobantes"` como texto plano con `title` (tooltip); no hay clic posible.
- **Comportamiento esperado:** poder abrir cualquiera de los comprobantes desde el propio listado (menú desplegable, o al menos navegar al drawer de la OC donde sí es posible).
- **Causa raíz:** la celda fue diseñada para el caso 1:1 y no se extendió para el caso 1:N.
- **Riesgo:** bajo — el drawer de la OC sí resuelve el acceso completo, así que no hay pérdida de información, solo un paso adicional.
- **Recomendación conceptual:** reutilizar el mismo patrón de menú contextual (`⋯`) que ya existe en la tabla para acciones, aplicado a la lista de comprobantes cuando `relacionados.length > 1`.
- **Alcance estimado:** bajo.
- **Dependencias:** ninguna.
- **Tipo de cambio:** UI únicamente.

### H-03 — P1 — `oc.comprobantesCompraRelacionados` no se limpia al anular el único CC relacionado

- **Documento afectado:** Orden de Compra, Comprobante de Compra.
- **Archivo/componente:** `ContextoCompras.tsx`, función `anularComprobanteCompra` (líneas 1446-1482); `logica/reglasCompras.ts:18,93`.
- **Comportamiento actual:** `anularComprobanteCompra` anula el CC y, en cascada, su CxP — pero nunca toca `oc.comprobantesCompraRelacionados`. Como `calcularEstadoPrincipalOC` y `motivoBloqueoAnulacionOC` solo miran `.length > 0` (sin filtrar por `estadoDocumento` del CC), la OC sigue mostrando el badge "Convertida" y sigue **bloqueada para anularse directamente** aunque su único comprobante esté anulado.
- **Comportamiento esperado:** si todos los CC relacionados están anulados, la OC no debería considerarse "Convertida" a efectos de bloqueo de anulación (aunque conservar el badge histórico "tuvo una conversión" podría ser una decisión de negocio válida, pero entonces el bloqueo de anulación debería revisarse específicamente).
- **Causa raíz:** el estado derivado de la OC nunca considera el estado actual de los documentos que "cuentan" para derivarlo.
- **Riesgo:** una OC queda en un limbo funcional: no puede anularse ni tiene ya ningún comprobante activo.
- **Recomendación conceptual:** que `calcularEstadoPrincipalOC`/`motivoBloqueoAnulacionOC` filtren por CC con `estadoDocumento !== 'anulado'` al evaluar `comprobantesCompraRelacionados`, en vez de solo `.length`.
- **Alcance estimado:** medio (toca una función de estado central usada en varios lugares; requiere revisar todos sus consumidores).
- **Dependencias:** ninguna nueva; reutiliza funciones existentes.
- **Tipo de cambio:** lógica de dominio (`reglasCompras.ts`), no solo presentación.

### H-04 — P2 — La relación CC→CxP se resuelve por búsqueda inversa en vez de usar la FK directa ya existente

- **Documento afectado:** Comprobante de Compra.
- **Archivo/componente:** `PanelDetalleComprobanteCompra.tsx:195`.
- **Comportamiento actual:** `cuentasPorPagar.find(c => c.comprobanteCompraId === cc.id)`, ignorando que `cc.cuentaPorPagarId` ya apunta directamente a la CxP.
- **Comportamiento esperado:** usar `cuentasPorPagar.find(c => c.id === cc.cuentaPorPagarId)`.
- **Causa raíz:** probablemente escrito antes de que `cc.cuentaPorPagarId` existiera de forma confiable, y nunca actualizado.
- **Riesgo:** hoy nulo (ambos campos se escriben en el mismo instante en `generarCxPYEnlaceCC`), pero es una duplicidad de fuente sin necesidad.
- **Recomendación conceptual:** usar la FK directa; ambas expresiones son equivalentes hoy, pero solo una es la fuente real declarada en el modelo.
- **Alcance estimado:** trivial.
- **Dependencias:** ninguna.
- **Tipo de cambio:** solo presentación.

### H-05 — P2 — El listado de Pagos no sigue el mismo patrón de columna "Doc. Relacionado" que OC y CC

- **Documento afectado:** Pago de Compra.
- **Archivo/componente:** `TablaPagosCompra.tsx`.
- **Comportamiento actual:** existen dos columnas configurables distintas (`documentoOrigen`, texto plano; `cxpRelacionada`, clicable) para relaciones que en OC/CC se resuelven con una sola columna fija "Doc. Relacionado" clicable.
- **Comportamiento esperado:** no se exige que Pagos muestre exactamente lo mismo (tiene más de una relación relevante: CC y CxP), pero si se muestran ambas, ambas deberían ser clicables o ninguna, para no confundir sobre cuál es la "oficial".
- **Causa raíz:** las columnas se diseñaron en momentos distintos del desarrollo del submódulo, sin una convención compartida de "cuál columna de relación es la navegable".
- **Riesgo:** bajo, es una inconsistencia de affordance (el usuario no sabe por qué una columna es azul/clicable y la otra no, si ambas muestran el mismo número de comprobante).
- **Recomendación conceptual:** unificar: si se muestran ambas, que `documentoOrigen` también navegue (al CC, no a la CxP), o consolidar en una sola columna con el patrón ya usado en OC/CC.
- **Alcance estimado:** bajo.
- **Dependencias:** ninguna.
- **Tipo de cambio:** UI únicamente.

### H-06 — P2 — La columna "Último pago" del listado de CxP no es clicable

- **Documento afectado:** Cuenta por Pagar.
- **Archivo/componente:** `TablaCuentasPorPagar.tsx`, `renderCeldaColumna`, caso `'ultimoPago'`.
- **Comportamiento actual:** muestra el número de pago como texto plano.
- **Comportamiento esperado:** siendo una columna que ya resuelve la relación real (`cxp.pagosRelacionados`), sería consistente que también navegara, como sí lo hace la columna "Comprobante" de la misma tabla.
- **Causa raíz:** la columna se diseñó como informativa, no como acceso directo.
- **Riesgo:** bajo — el acceso completo sigue disponible en el drawer.
- **Recomendación conceptual:** hacerla clicable reutilizando `onVerPago` si ese callback llega a estar disponible en esta tabla (hoy `TablaCuentasPorPagar` no recibe `onVerPago`, solo el drawer lo recibe).
- **Alcance estimado:** bajo, pero requiere agregar una prop nueva al componente.
- **Dependencias:** `PaginaCompras.tsx` tendría que pasar el callback.
- **Tipo de cambio:** UI + una prop nueva (no un cambio de modelo).

### H-07 — P2 — No existe atajo directo OC→CxP ni CxP→OC, aunque la relación es derivable

- **Documento afectado:** Orden de Compra, Cuenta por Pagar.
- **Archivo/componente:** `PanelDetalleOrdenCompra.tsx`, `PanelDetalleCuentaPorPagar.tsx`.
- **Comportamiento actual:** para ir de una OC a su CxP (o viceversa) el usuario debe pasar obligatoriamente por el CC intermedio.
- **Comportamiento esperado:** esto es **correcto conceptualmente** (no existe una FK directa OC↔CxP y no debe inventarse una), pero desde el punto de vista de experiencia de auditoría, un atajo (derivado, no persistido) podría ahorrar un salto.
- **Causa raíz:** decisión de diseño consistente con "no acoplar documentos que no se relacionan directamente" — no es un defecto, es una omisión de conveniencia.
- **Riesgo:** ninguno (no es un enlace roto, es una ruta más larga mediante datos correctos).
- **Recomendación conceptual:** si se decide agregar el atajo, debe seguir siendo una **derivación en el momento** (buscar el CC vía `cxp.comprobanteCompraId` y luego su `ordenCompraOrigenId`), nunca una FK nueva persistida en OC o CxP — para no crear una tercera fuente de la misma relación.
- **Alcance estimado:** bajo si se decide implementar.
- **Dependencias:** ninguna.
- **Tipo de cambio:** UI únicamente (una derivación adicional, reutilizando datos ya cargados).

### H-08 — P1 — No existe ningún mecanismo de retorno contextual (pila, breadcrumb o historial)

- **Documento afectado:** Los cuatro (transversal).
- **Archivo/componente:** `PaginaCompras.tsx` (estado `vista`), `shared/ui/drawer/Drawer.tsx`.
- **Comportamiento actual:** cerrar cualquier drawer, sin importar cuántos niveles de relación se hayan recorrido, ejecuta `setVista({ tipo: 'lista' })`.
- **Comportamiento esperado (documentado por el propio encargo):** poder recorrer OC→CC→CxP→Pago y regresar Pago→CxP→CC→OC nivel por nivel, con una acción "Volver" real.
- **Causa raíz:** `Vista` es un valor único sin historial; el `Drawer` compartido no fue diseñado con soporte de pila.
- **Riesgo:** el usuario pierde el hilo de auditoría al cerrar accidentalmente; para retomar debe volver a buscar cada documento manualmente desde el listado o repetir la cadena hacia adelante.
- **Recomendación conceptual:** introducir una pila de navegación (`vista: Vista[]`, o un historial paralelo) gestionada centralmente en `PaginaCompras.tsx`, con "Volver" = desapilar, "X" = vaciar la pila y volver al listado. Esto es un cambio de **arquitectura de navegación**, no de modelo de datos ni de relaciones — no debe fusionar la lógica de negocio de los documentos, solo la orquestación de qué se muestra.
- **Alcance estimado:** medio-alto (afecta la orquestación central, pero no los modelos ni servicios).
- **Dependencias:** ninguna externa; es contenible dentro de `PaginaCompras.tsx`.
- **Tipo de cambio:** navegación / arquitectura de la página, no modelo ni contexto de negocio.

### H-09 — P2 — El botón "Atrás" del navegador no es coherente con la navegación interna

- **Documento afectado:** Los cuatro (transversal).
- **Archivo/componente:** `PaginaCompras.tsx`.
- **Comportamiento actual:** ninguna transición de `vista`/`tabActivo` usa el router; "Atrás" del navegador abandona la página de Compras por completo.
- **Comportamiento esperado:** al menos una expectativa mínima de que "Atrás" cierre el drawer actual en vez de salir de la página.
- **Causa raíz:** decisión arquitectónica de usar estado local en vez de rutas para la navegación de documentos.
- **Riesgo:** bajo, pero puede sorprender a usuarios acostumbrados a que "Atrás" deshaga la última acción visual.
- **Recomendación conceptual:** si se implementa H-08 (pila propia), evaluar si además conviene sincronizar con `history.pushState` para que "Atrás" cierre un nivel; **no es obligatorio** y depende de la decisión de producto.
- **Alcance estimado:** medio, si se decide abordar.
- **Dependencias:** depende de H-08 si se quiere resolver en conjunto.
- **Tipo de cambio:** navegación.

### H-10 — P2 — Sin advertencia previa antes de navegar a un documento relacionado anulado

- **Documento afectado:** Los cuatro.
- **Archivo/componente:** todos los drawers, secciones de "Documentos relacionados".
- **Comportamiento actual:** una fila de documento relacionado anulado se ve visualmente igual a una activa hasta que se abre (recién ahí se ve el badge "Anulado"/"Anulada" en rojo dentro del drawer de destino).
- **Comportamiento esperado:** una señal visual en la propia fila (antes de hacer clic) cuando el documento relacionado está anulado.
- **Causa raíz:** las filas de "Documentos relacionados" muestran número y monto, pero no siempre el badge de estado del documento relacionado (el de CC→OC y CC→CxP sí llevan badge en algunos casos; el de OC→CC y CxP→CC no).
- **Riesgo:** bajo — es un tema de claridad, no de integridad (el dato mostrado dentro sigue siendo correcto).
- **Recomendación conceptual:** agregar el badge de estado también en las filas de "Orden de compra origen" (drawer CC) y "Comprobantes de compra generados" (drawer OC), igual que ya lo hace la sección de "Pagos" en ambos drawers.
- **Alcance estimado:** bajo.
- **Dependencias:** ninguna.
- **Tipo de cambio:** solo presentación.

## 14. Riesgos de acoplamiento o duplicación

- **Compras no importa nada de Cobranzas, POS ni Inventario** para resolver estas relaciones — confirmado por inspección de imports en los 4 drawers, las 4 tablas y `ContextoCompras.tsx`. El dominio está correctamente aislado.
- **Cada tabla implementa su propia navegación** (callbacks `onVerX` recibidos como props desde `PaginaCompras.tsx`), no hay un "controlador central de selección de documentos" más allá de `PaginaCompras.tsx` mismo, que ya actúa como ese punto único. No se detectó lógica de navegación duplicada entre tablas — todas siguen el mismo patrón (`onClick` → callback recibido por prop → `setVista` en el padre).
- **No se comparan textos visibles en vez de identificadores** en ningún punto de resolución de relaciones (todas usan `.id` o FKs reales, nunca `nombreProveedor ===` ni comparación de números formateados).
- **Riesgo real de función gigante:** `PaginaCompras.tsx` ya concentra el `Vista` de 8 variantes, 8 handlers de navegación cruzada y 3 modales — es manejable hoy, pero si se implementa H-08 (pila de navegación) sin extraer esa responsabilidad a un hook propio (p. ej. `useNavegacionCompras`), el archivo crecerá más. La recomendación conceptual es extraer el estado de navegación a un hook dedicado **dentro del mismo módulo Compras**, no fusionarlo con `ContextoCompras.tsx` (que es estado de negocio, no de navegación).
- **`ContextoCompras.tsx` no reconstruye estructuras de otros dominios** ni Pago reconstruye manualmently estructuras de OC: toda propagación de datos heredados (rondas anteriores) reutiliza mapeadores existentes (`extraerDatosOCParaCC`) en vez de duplicar lógica.

## 15. Casos que requieren pruebas manuales

Todo lo reportado en este documento fue **verificado por código** (lectura directa de archivos + `grep` de sitios de lectura/escritura de cada relación) o **verificado mediante los tipos** (TypeScript de los modelos). Ningún caso fue "probado" en navegador durante esta auditoría. Los siguientes escenarios de la lista del encargo requieren validación manual antes de considerarse cerrados operativamente:

1. Navegación real OC → CC → CxP → Pago y cierre del drawer en cada nivel (para confirmar visualmente que siempre regresa al listado, tal como predice el código).
2. Comportamiento visual exacto al reemplazar un drawer por otro (si la animación de salida/entrada se superponen o generan parpadeo).
3. Verificación visual de que los filtros/columnas/página de la tabla de origen realmente se ven intactos al volver, en los 4 tabs.
4. Scroll vertical/horizontal tras volver del drawer (no verificable por código).
5. Comportamiento real del botón "Atrás" del navegador estando dentro de un drawer de Compras.
6. Caso OC con 3+ comprobantes relacionados: confirmar en pantalla que el tooltip de la celda del listado muestra todos los números legibles (riesgo de overflow visual con muchos comprobantes).
7. Caso de OC cuyo único CC fue anulado (H-03): confirmar en pantalla que el badge sigue mostrando "Convertida" y que el intento de anular la OC sigue bloqueado con el mensaje actual.
8. Accesibilidad por teclado: navegar las filas clicables de "Documentos relacionados" solo con teclado (Tab + Enter) en los 4 drawers.

## 16. Propuesta conceptual de experiencia objetivo

No se implementa nada de esto en esta auditoría; se documenta como referencia para una fase posterior:

- Mantener el reemplazo de drawer como comportamiento base (es simple y ya funciona), pero agregar una **pila de navegación** visible como una breadcrumb compacta en la cabecera del drawer (ej. "OC01-00000001 › FE01-123 › Pago") con cada segmento clicable para saltar directamente a ese nivel, y un botón "Volver" que desapila un nivel. La "X" seguiría vaciando toda la pila.
- Unificar la columna de relación principal en los 4 listados bajo un mismo patrón visual y de nomenclatura (aunque el contenido de cada uno sea distinto, como ya pide el encargo no forzar el mismo contenido).
- Cuando una relación tenga más de un documento (OC→CC, CxP→Pago), ofrecer siempre acceso individual desde el listado (menú `⋯` con cada documento), no solo desde el drawer.
- Badge de estado visible en toda fila de "Documentos relacionados" que apunte a un documento potencialmente anulado, antes del clic.

## 17. Orden recomendado de implementación posterior

1. H-03 (estado "Convertida"/bloqueo de anulación no revierte con CC anulado) — es el único hallazgo con efecto funcional real sobre una acción bloqueada permanentemente.
2. H-08 (pila de navegación) — es el cambio de mayor impacto en experiencia, y condiciona cómo se resuelven H-02 y H-06 (si hay pila, "abrir el segundo comprobante" ya no rompe el contexto).
3. H-01 y H-04 (unificar fuente de relación Pago↔CC y CC↔CxP) — limpieza de deuda técnica, bajo riesgo, hacerlo antes de tocar más esas pantallas.
4. H-02, H-05, H-06, H-10 (mejoras de acceso y consistencia visual en listados/drawers).
5. H-07, H-09 (mejoras opcionales dependientes de decisión de producto).

---

## Tabla resumen

| Categoría | Correcto | Parcial | Faltante | Riesgo |
|---|---:|---:|---:|---|
| Relaciones OC ↔ CC | ✔ | — | — | Bajo (columna de listado no navega con varios CC — H-02) |
| Relaciones CC ↔ CxP | ✔ (funcional) | Fuente redundante | — | Bajo (H-04, sin desincronización hoy) |
| Relaciones CxP ↔ Pago | ✔ | Columna "Último pago" no navega | — | Bajo (H-06) |
| Navegación hacia adelante | ✔ | — | — | Ninguno — todos los saltos documentados funcionan |
| Navegación de retorno | — | — | ✔ Falta por completo | **Alto** — no existe pila/breadcrumb (H-08) |
| Conservación de contexto | Parcial (efecto colateral, no diseñado) | ✔ | — | Medio — funciona hoy, frágil ante cambios futuros |
| Relaciones múltiples | Parcial | ✔ | — | Medio (H-02, estado "Convertida" no distingue parcial/total) |
| Consistencia visual | Parcial | ✔ | — | Bajo (H-05, H-10) |
| Desacoplamiento | ✔ | — | — | Ninguno — dominios correctamente aislados |

### Conclusión explícita

- **Qué funciona realmente hoy:** todas las relaciones directas persistidas (`cc.ordenCompraOrigenId`, `cc.cuentaPorPagarId`, `cxp.comprobanteCompraId`, `cxp.pagosRelacionados`, `pago.cuentasPorPagarAplicadas`) se navegan de ida correctamente, hacia el documento correcto, sin fabricar datos.
- **Qué existe solo de forma visual/modelada sin uso real:** `cc.pagosRelacionados` (escrito, nunca leído); `oc.comprobantesCompraRelacionados` solo alimenta dos cálculos de estado, nunca la lista de navegación real (que se deriva por búsqueda).
- **Qué relaciones no son bidireccionales con retorno contextual:** las 4 — se puede ir hacia adelante en toda la cadena, pero **ninguna** permite "volver" al nivel anterior salvo cerrando todo y empezando de nuevo desde el listado.
- **Qué documentos no permiten regresar correctamente:** los 4, por el mismo motivo estructural (H-08) — no es un problema de un documento en particular, es la ausencia de un mecanismo compartido.
- **Dónde se pierde el contexto:** al cerrar cualquier drawer después de más de un salto de navegación, se pierde el documento específico que se estaba viendo (aunque el tab y sus filtros sobreviven).
- **Qué debe corregirse antes de considerar cerrada la trazabilidad documental:** H-03 (estado inconsistente tras anulación) por ser el único con efecto funcional bloqueante, y H-08 (pila de navegación) por ser el requisito explícito del encargo que hoy no se cumple.
