# Cierre Final — Guías de Remisión SenciYo

**Fecha:** 2026-08-08 (corrección definitiva de GRE-P1-008: mismo día, segunda pasada)
**Base:** `AUDITORIA_FINAL_GUIAS_REMISION.md` (2026-08-07) — 0 P0, 6 P1, 12 P2, 5 P3.
**Alcance de esta tarea:** cerrar los 6 P1 y agregar pruebas de regresión (GRE-P2-011). No se rehizo el módulo; no se ampliaron funcionalidades no solicitadas.
**Nota de revisión:** la primera pasada de este cierre resolvió GRE-P1-008 retirando la configuración `stockDescuentoGuiaRemision` en vez de conectarla a un comportamiento real. Esa solución fue rechazada por revisión posterior ("una configuración sin efecto es incorrecta; eliminarla no implementa la funcionalidad") y GRE-P1-008 se reabrió. Esta versión del documento refleja la corrección definitiva: integración real con el motor central de Inventario. Ver sección 9.

---

## 1. Veredicto

### ✅ APROBADO PARA CIERRE

---

## 2. Resumen de implementación

Se corrigieron los 6 hallazgos P1 en su causa raíz, reutilizando en todos los casos fuentes de verdad ya existentes en el ERP (Series/`useSeriesCommands` de Gastos-Cobranzas, `tienePermiso`/`utilidades/permisos.ts`, `TIPO_GRE_CODIGO_DOCUMENTO` del propio modelo, y — en la corrección definitiva de GRE-P1-008 — `ServicioKardexValorizado`, el mismo motor central de Inventario que ya usan Factura/Boleta y Nota de Salida). No se creó ningún motor paralelo, ningún segundo sistema de permisos, ninguna sincronización ad-hoc, ni un segundo Kardex. La configuración de stock de Guía de Remisión (`stockDescuentoGuiaRemision`) existe de nuevo en Configuración → Inventario y tiene efecto real: "Automático al emitir" dispara una salida real (cuantitativa o valorizada FIFO según el modo de la empresa) mediante el mismo `ServicioKardexValorizado`; "Mediante Nota de Salida" no descuenta automáticamente. Se agregaron 90 pruebas nuevas (9 archivos) sobre la lógica pura del módulo y sobre la integración real con el motor de Inventario — antes había cero. Build, lint y la suite completa del monorepo (`1787/1787` tests) pasan en verde.

---

## 3. Archivos modificados

| Archivo | Por qué fue necesario | Responsabilidad que cambió |
|---|---|---|
| `guias-remision/paginas/FormularioGREPage.tsx` | P1-001, P1-002, P1-003 | `guia.tipo` (no `tipoParam`) como única fuente del tipo tras cargar; `serieActiva`/`incrementSeriesCorrelative` como fuente real de correlativo; `emitir()` rechaza por credenciales incompletas |
| `guias-remision/logica/validacionGRE.ts` | P1-005 | Valida `bien.cantidad > 0` y finita para cada línea |
| `guias-remision/components/forma/SeccionBienes.tsx` | P1-005 | El input de cantidad ya no acepta negativos ni valores no finitos |
| `guias-remision/api/fuenteDatosGRE.ts` | P1-002 | Se elimina `nextCorrelativo` (código muerto tras P1-002; la fuente real es Series) |
| `guias-remision/contexto/ContextoGuiasRemision.tsx` | P1-004 | `agregarGuia`/`actualizarGuia`/`eliminarGuia` exigen `ventas.gre.emitir` en el dominio, no solo en la UI |
| `guias-remision/paginas/GuiasRemision.tsx` | P1-004 | Calcula `puedeGestionarGRE` y lo pasa a listado/drawer |
| `guias-remision/components/lista/TablaGuias.tsx` | P1-004 | Botones Anular/Eliminar borrador/Duplicar combinan estado **y** permiso |
| `guias-remision/components/detalle/DrawerDetalleGRE.tsx` | P1-004 | Idéntico combinado estado+permiso en el drawer |
| `guias-remision/logica/useEstadoConfiguracionGRE.ts` | P1-003 | Se extrae `derivarEstadoConfiguracionGRE` (lógica pura, sin React) para que `emitir()` y la UI lean el mismo cálculo y sea unit-testeable |
| `shared/series/guiaRemisionSeries.ts` (nuevo) | P1-002 | `getNextGuiaRemisionDocument`/`formatGuiaRemisionCorrelative` — mismo patrón que `expenseSeries.ts`/`collectionSeries.ts` |
| `configuracion-sistema/paginas/ConfiguracionInventario.tsx` | P1-008 | La tarjeta "Guía de Remisión" existe de nuevo en Configuración → Inventario, con efecto real |
| `configuracion-sistema/contexto/ContextoConfiguracion.tsx` | P1-008 | `stockDescuentoGuiaRemision` existe de nuevo en `SalesPreferences` (tipo, default, migración, dirty-check) |
| `guias-remision/logica/inventarioGRE.ts` (nuevo) | P1-008 | Adaptador GRE → `ServicioKardexValorizado`: construye el contrato de salida/anulación, nunca ejecuta stock por sí mismo |
| `gestion-inventario/models/inventory.types.ts` | P1-008 | Se agrega `'guia_remision'` a `TipoDocumentoOrigenMovimiento` (aditivo) |
| `gestion-inventario/models/operacionIdempotenteInventario.types.ts` | P1-008 | Se agregan `'guia_remision_salida'`/`'guia_remision'` a los tipos idempotentes (aditivo) |
| `gestion-inventario/utils/operacionCuantitativaInventarioComun.ts` | P1-008 | Se agrega `'guia_remision'` a `TIPOS_DOCUMENTO_ORIGEN_MOVIMIENTO` (aditivo) |
| `gestion-inventario/utils/salidaCuantitativaInventario.ts` | P1-008 | Se agrega el caso `'guia_remision_salida'` al switch de `MovimientoTipo` y al set de operaciones valorizables (aditivo) |
| 9 archivos `*.test.ts` (nuevos/ampliados) | GRE-P2-011 | Pruebas de regresión — ver sección 10 |

---

## 4. GRE-P1-001 — Bug de tipo al editar GRE Transportista

**Causa raíz:** `FormularioGREPage.tsx` calculaba una variable local `tipo` desde `tipoParam` (parámetro de ruta). La ruta `/guias-remision/editar/:id` no tiene segmento `:tipoParam`, así que esa variable caía siempre en `'remitente'`, sin importar el tipo real de la guía cargada por `getById`. Título, `codigoDocumento` (→ filtro de series) y la prop `tipo` de `SeccionDatosGenerales` (→ filtro de motivos) usaban esa variable local en vez de `guia.tipo`.

**Solución:** se eliminó la variable local `tipo` como fuente de verdad. Se renombró a `tipoInicial` y se restringió su único uso al inicializador de `useState` (`GUIA_REMISION_BORRADOR(tipoInicial)`), exactamente como pide la corrección: *"`tipoParam` solo debe servir para inicializar una guía NUEVA"*. Todos los demás puntos (título, `codigoDocumento`, selector visual Remitente/Transportista, prop `tipo` de `SeccionDatosGenerales`) se recalculan desde `guia.tipo`. Como bono, `codigoDocumento` ahora reutiliza la constante `TIPO_GRE_CODIGO_DOCUMENTO` (ya existente en el modelo, antes sin consumidor real) en vez de reimplementar el mapeo `'09'/'31'` a mano — cierra también **GRE-P3-001**.

Durante la carga (`cargando === true`) el componente no renderiza el formulario, así que no hay ninguna ventana donde se muestre el tipo incorrecto ni siquiera transitoriamente.

**Evidencia:** `FormularioGREPage.tsx:528` (`tipoInicial` solo en el inicializador), `:568` (`codigoDocumento` desde `guia.tipo`), `:757` (título), `:780-787` (selector), `:794` (prop de `SeccionDatosGenerales`).

**Pruebas:** `modelos/GuiaRemision.test.ts` (contrato de `TIPO_GRE_CODIGO_DOCUMENTO`, ahora la única fuente reutilizada).

---

## 5. GRE-P1-002 — Correlativo desincronizado de Series

**Causa raíz:** `fuenteDatosGRE.ts#nextCorrelativo` calculaba `max+1` escaneando las GRE ya persistidas — un silo propio, totalmente desconectado de `Series.correlativeNumber`/`statistics.documentsIssued`, que es lo que Configuración → Series usa para decidir si una serie "está en uso" y si puede eliminarse.

**Investigación previa a modificar (obligatoria por instrucción):** se auditó cómo Factura/Boleta y Documentos Comerciales obtienen su número — **ninguno de los dos usa el mecanismo central**: Factura/Boleta genera un número con `Math.random()` (ajeno a Series); Documentos Comerciales escanea documentos existentes exactamente como GRE hoy. El **único patrón que sí lee y escribe `Series.correlativeNumber`/`statistics.documentsIssued`** es el usado por **Gastos y Cobranzas**, vía `shared/series/expenseSeries.ts`/`collectionSeries.ts` (previsualización pura `correlative = series.correlativeNumber + 1`) + `useSeriesCommands().incrementSeriesCorrelative` (confirmación real, solo al persistir el documento).

**Solución:** se replicó exactamente ese patrón para GRE — **no** el de Factura/Boleta (que está igual de roto que GRE hoy y no es "el patrón oficial", sino otro defecto fuera del alcance de este cierre):

1. Nuevo `shared/series/guiaRemisionSeries.ts` — `getNextGuiaRemisionDocument(series)`, previsualización pura, mismo cálculo que `getNextExpenseDocument`.
2. `FormularioGREPage.tsx` resuelve `serieActiva` (el objeto `Series` real, no solo el código string) y, en `emitir()`, llama a `useSeriesCommands().incrementSeriesCorrelative(serieActiva.id, correlative)` **después** de persistir la GRE emitida — mismo orden que Gastos/Cobranzas.
3. Se eliminó `fuenteDatosGRE.ts#nextCorrelativo` (código muerto, sin más consumidores).

**Fuente de verdad final:** `Series.correlativeNumber` / `Series.statistics.documentsIssued` (mismo objeto que lee `TarjetaSerie.tsx`/`useSeries.ts` para "en uso"/bloqueo de borrado) — **sin tocar `TarjetaSerie.tsx`**, porque ese componente ya generaliza sobre `statistics.documentsIssued` para cualquier documento. Al hacer que GRE incremente ese mismo campo, una serie usada por GRE queda automáticamente marcada "en uso" y bloqueada para borrado, sin ningún cambio en la pantalla de Series.

**Casos cubiertos:** Remitente y Transportista son series independientes (`documentType.code` distinto); borradores nunca llaman a `incrementSeriesCorrelative` (`guardarBorrador()` no fue tocado); dos empresas nunca comparten el mismo objeto `Series` (aislamiento ya garantizado por `ContextoConfiguracion`, namespaced por tenant).

**Riesgo residual documentado, no nuevo:** la race de doble pestaña (GRE-P2-008) sigue siendo teórica y de la misma naturaleza que antes (lectura-luego-escritura sin lock) — no se agrava ni se resuelve; sigue siendo P2 no bloqueante, inherente a `localStorage` sin backend.

**Pruebas:** `shared/series/guiaRemisionSeries.test.ts` (8 casos: cálculo puro, no-mutación, series independientes por tipo, aislamiento por empresa, y el contrato con `statistics.documentsIssued` que prueba algebraicamente que emitir GRE deja la serie "en uso").

---

## 6. GRE-P1-003 — Credenciales SUNAT solo en la UI

**Causa raíz:** `puedeEmitirPorConfiguracion` (derivado de `useEstadoConfiguracionGRE`) solo se leía en el atributo `disabled` del botón "Emitir GRE". La función de dominio `emitir()` nunca lo consultaba.

**Solución:** se agregó `if (!puedeEmitirPorConfiguracion) return;` al inicio de `emitir()` (después de validar campos y `tenantId`, antes de tocar el datasource). Siguiendo la instrucción de no duplicar la lógica que calcula el estado de configuración, **no se reescribió el cálculo** — se extrajo la parte pura del hook existente (`derivarEstadoConfiguracionGRE`, sin `useState`/`useEffect`/`useTenant`) para que sea la única fuente, consumida tanto por la UI (banner, botón, tooltip) como, en principio, por cualquier punto de dominio. El hook `useEstadoConfiguracionGRE` ahora es un envoltorio delgado: fetch + `setState(derivarEstadoConfiguracionGRE(...))`.

**Dónde vive ahora la precondición de emisión:** dentro de `emitir()` mismo (`FormularioGREPage.tsx`), leyendo el resultado de `derivarEstadoConfiguracionGRE` — la misma función, no un cálculo paralelo. Cualquier código futuro (atajo, emisión en lote, test) que invoque `emitir()` sin pasar por el botón queda igual de protegido.

**Se mantuvo intacto:** banner de credenciales incompletas, estado visual del botón/tooltip, refresco tras configurar credenciales (`refrescar()`), aislamiento por empresa (el hook sigue dependiendo de `tenantId`).

**Pruebas:** `logica/useEstadoConfiguracionGRE.test.ts` (7 casos): sin ninguna credencial → rechaza; solo SOL completo → rechaza; solo GRE completo → rechaza; valores en blanco cuentan como incompletos; ambas completas → permite continuar; derivación de autorización especial del emisor.

---

## 7. GRE-P1-004 — Permisos de acciones internas

**Causa raíz:** Anular/Eliminar borrador/Duplicar (`TablaGuias.tsx`, `GuiasRemision.tsx`, `DrawerDetalleGRE.tsx`) solo estaban condicionados por predicados de **estado del documento** (`puedeAnularGRE`, etc.), nunca por permiso de usuario. `ventas.gre.ver` (el único permiso que exige la ruta `/guias-remision`) bastaba para ejecutar acciones que deberían requerir `ventas.gre.emitir`.

**Investigación previa:** se confirmó que `ventas.gre.emitir` ("Crear, editar y emitir guías de remisión electrónica") es funcionalmente el permiso correcto para estas acciones — con los 3 roles de sistema actuales (Vendedor tiene ambos permisos GRE, Contador ninguno) no hay necesidad demostrable de un permiso más granular (`ventas.gre.anular` separado de `ventas.gre.emitir`, por ejemplo). Siguiendo la instrucción explícita de la tarea, se **reutilizó `ventas.gre.emitir`** en vez de crear permisos nuevos.

**Solución (permiso + estado, en dos capas):**
1. **Dominio** — `ContextoGuiasRemision.tsx`: se agregó `verificarPermisoGRE()` (mismo patrón que `ContextoGastos.tsx#verificarPermisoGasto`) invocado dentro de `agregarGuia`, `actualizarGuia` y `eliminarGuia` — los tres comandos reales que ejecutan cualquier mutación de GRE (crear, editar, emitir, anular, eliminar borrador, duplicar). Esto protege la operación sin importar qué componente la invoque, no solo el botón visible.
2. **UI** — `GuiasRemision.tsx` calcula `puedeGestionarGRE` (vía `tienePermiso`, la misma función central que usa `PermisoGuard`) y lo pasa a `TablaGuias`/`DrawerDetalleGRE`, que ahora muestran los botones combinando **permiso Y estado** (`puedeAnularGRE(guia) && puedeGestionar`, etc.) — nunca solo uno de los dos.

**No se tocó** el gating de Crear/Editar borrador/Emitir (ya protegidos por el guard de rutas con `ventas.gre.emitir`) ni Configuración → Transporte (fuera del hallazgo).

**Matriz permiso/acción:**

| Acción | Permiso requerido | Dónde se exige |
|---|---|---|
| Ver listado/detalle | `ventas.gre.ver` | `PermisoGuard` (ruta) |
| Crear / Editar borrador / Emitir | `ventas.gre.emitir` | `PermisoGuard` (ruta) + `ContextoGuiasRemision` (dominio) |
| Anular | `ventas.gre.emitir` + estado (`puedeAnularGRE`) | `ContextoGuiasRemision` (dominio) + UI |
| Eliminar borrador | `ventas.gre.emitir` + estado (`puedeEliminarBorradorGRE`) | `ContextoGuiasRemision` (dominio) + UI |
| Duplicar | `ventas.gre.emitir` | `ContextoGuiasRemision` (dominio) + UI |

**Pruebas:** 4 casos nuevos en `configuracion-sistema/utilidades/permisos.test.ts` (mismo archivo/patrón ya usado por otros módulos, no un archivo nuevo): solo `ventas.gre.ver` → sin `ventas.gre.emitir`; con `ventas.gre.emitir` → autorizado; roles predeterminados (Vendedor autorizado, Contador no) conservan su comportamiento; retirar el permiso de un rol personalizado bloquea de inmediato.

---

## 8. GRE-P1-005 — Cantidad de bienes inválida

**Causa raíz:** `validarGREParaEmitir` solo exigía `bienes.length > 0`, nunca `bien.cantidad`. El input de cantidad usaba `parseFloat(e.target.value) || 0`, que no convierte `-5` a `0` (solo `NaN`/`0`/`''` caen al `|| 0`).

**Solución en dos capas, como exige la instrucción:**
1. **Validación de negocio** (`validacionGRE.ts`): se agregó, dentro de la rama donde ya hay al menos un bien, `guia.bienes.find((b) => !Number.isFinite(b.cantidad) || b.cantidad <= 0)`. El mensaje identifica el bien afectado por su descripción.
2. **UX/input** (`SeccionBienes.tsx`): el `onChange` del input de cantidad ahora usa `Number.isFinite(parsed) && parsed >= 0 ? parsed : 0` — bloquea negativos, `NaN` e `Infinity` directamente al escribir, sin cambiar el comportamiento de decimales (`step="any"` intacto) ni de unidad de medida.

**Casos límite verificados (con test):** `1` válido; `2.5` (decimal positivo) válido; `0` inválido; `-5` inválido; `NaN` inválido; `Infinity` inválido; `-Infinity` inválido; con varios bienes, uno solo inválido rechaza la emisión completa.

**No se agregó** ninguna regla adicional no solicitada (no se tocó decimales→enteros, no se tocó unidad de medida, no se agregó detección de duplicados — eso es GRE-P2-003, fuera de alcance).

**Pruebas:** `logica/validacionGRE.test.ts` (16 casos: 8 sobre cantidad + 8 sobre las validaciones ya existentes, para fijar también el comportamiento que debía mantenerse intacto).

---

## 9. Corrección definitiva GRE-P1-008

### Estado anterior incorrecto

La primera pasada de este cierre encontró que `stockDescuentoGuiaRemision` (`SalesPreferences`) se mostraba y editaba en Configuración → Inventario sin ningún consumidor real, y resolvió el hallazgo **eliminando el campo y su tarjeta de UI**. Esa solución fue rechazada en revisión: retirar una configuración para que deje de estar "sin efecto" no implementa la funcionalidad — solo hace desaparecer el síntoma. GRE-P1-008 se reabrió con el mandato explícito de integrar GRE a la arquitectura central de Inventario ya existente.

### Causa raíz

La configuración existía porque el modelo de preferencias de Ventas se diseñó simétricamente para los tres documentos que pueden afectar stock (Factura/Boleta, Nota de Venta, Guía de Remisión), pero solo los dos primeros llegaron a tener un consumidor real (`useComprobanteActions.tsx`). GRE quedó con la preferencia declarada pero sin que `FormularioGREPage.tsx` la leyera nunca — un caso de "configuración adelantada a su integración", no un campo inventado sin propósito.

### Arquitectura encontrada

Se reconstruyó la arquitectura real de Inventario (sin asumir nombres, siguiendo las llamadas reales):

- **Switch maestro + modo:** `resolverModoInventario(controlStockActivo, estadoValorizacion)` → `'inactivo' | 'cuantitativo' | 'valorizado'` (`gestion-inventario/utils/estadoActivacionValorizacionInventario.ts`).
- **Gate único:** `ejecutarOperacionInventario` (privado, dentro de `servicioKardexValorizado.ts`) — valida contrato, resuelve el modo, **rechaza toda mutación si el modo es `'inactivo'`**, reserva idempotencia real por `(empresaId, clave)` vía `reservarOperacionIdempotente`, prepara y confirma en una sola unidad de trabajo atómica.
- **API pública reutilizable:** `ServicioKardexValorizado.registrarSalidaValorizada`/`anularDocumentoValorizado` — genéricas sobre `tipoDocumento`/`tipoOperacion`; ya usadas por Factura/Boleta, Nota de Salida, ajustes y transferencias. **Ninguna de las dos funciones públicas fue reescrita** — solo se extendieron dos listas cerradas internas para reconocer a GRE como un origen más (ver "Fuentes de verdad finales").
- **Patrón de referencia para "cómo un documento decide su modo":** `useComprobanteActions.tsx` (Factura/Boleta) — lee `controlStockActivo` + `stockDescuentoFacturaYBoleta`; en modo `'automatico'` resuelve almacenes por `resolvealmacenesForSaleFIFO`/`allocateSaleAcrossalmacenes` (FIFO por `prioridadSalida`, nunca "el primer almacén") y llama a `registrarSalidaValorizada`; en modo `'nota_salida'` no descuenta él mismo.
- **Clasificación inventariable:** `esProductoInventariable` (`shared/inventory/clasificacionInventario.ts`) — su propio comentario de cabecera ya mencionaba "Guías de Remisión" como consumidor previsto, antes de que existiera la integración.
- **Reversión:** `ServicioKardexValorizado.anularDocumentoValorizado` — localiza los movimientos ORIGINALES por `documentoOrigenId`/`tipoDocumentoOrigen`/`claveIdempotencia` (nunca recalcula), mismo patrón que `notaSalida.service.ts#prepararAnulacionNS`.

**Extensión mínima y aditiva al núcleo** (dos listas cerradas, verificadas exhaustivamente por TypeScript, sin alterar ningún caso existente):

| Archivo | Cambio | Por qué es seguro |
|---|---|---|
| `gestion-inventario/models/inventory.types.ts` | `+ 'guia_remision'` en `TipoDocumentoOrigenMovimiento` | Solo agrega un literal a una unión; ningún código existente compara contra "todos menos uno" |
| `gestion-inventario/models/operacionIdempotenteInventario.types.ts` | `+ 'guia_remision_salida'` en `TipoOperacionIdempotenteInventario`, `+ 'guia_remision'` en `ReferenciaDocumentoTipoOperacionIdempotente` | Mismo criterio — GRE se suma como un origen documental más, análogo a `nota_salida`/`venta_salida` |
| `gestion-inventario/utils/operacionCuantitativaInventarioComun.ts` | `+ 'guia_remision'` en `TIPOS_DOCUMENTO_ORIGEN_MOVIMIENTO` | Lista usada solo por el type-guard `esTipoDocumentoOrigenMovimiento` |
| `gestion-inventario/utils/salidaCuantitativaInventario.ts` | `+ case 'guia_remision_salida': return 'SALIDA';` en el switch de `MovimientoTipo`; `+ 'guia_remision_salida'` en `TIPOS_OPERACION_SALIDA_VALORIZABLES` | El switch ya lanzaba explícitamente para cualquier `tipoOperacion` no reconocido — sin este caso, GRE no podría emitir en absoluto; los casos existentes (`nota_salida`, `venta_salida`, `ajuste_negativo`, `transferencia`) no cambian |

`mapearAReferenciaDocumento` (usado por `anularDocumentoValorizado`) no necesitó cambios: ya hace un passthrough genérico para todo tipo compartido entre ambas uniones, y `'guia_remision'` pasó a serlo. `validarContrato`, `prepararOperacionSalidaInventario`, `confirmarOperacionSalidaInventario`, el consumo de capas FIFO y los reversos son genéricos sobre `tipoDocumento`/`tipoOperacion` — **cero cambios** en esas piezas.

### Fuente de verdad

`stockDescuentoGuiaRemision` (`SalesPreferences`, `ContextoConfiguracion.tsx`) — exactamente el mismo campo, mismo tipo (`StockDescuentoDocumento`), mismo default (`'automatico'`), misma persistencia por tenant que ya usan Factura/Boleta y Nota de Venta. No se creó una segunda preferencia ni una abstracción nueva de "reglas por documento". La UI vive de nuevo en Configuración → Inventario → Reglas por documento, sin ninguna sección ni pantalla nueva.

### Archivo nuevo: `guias-remision/logica/inventarioGRE.ts` — por qué era necesario

Ningún archivo existente era responsable de "cómo habla GRE con el motor de Inventario" (a diferencia de `notaSalida.service.ts`, que cumple ese rol para NS). Su única responsabilidad es **adaptar, nunca ejecutar**:

- `debeDescontarStockAutomaticamenteGRE(controlStockActivo, stockDescuentoGuiaRemision)` — predicado puro que decide si corresponde disparar la salida.
- `motivoTrasladoAMotivoKardex(motivo)` — traduce el motivo de traslado SUNAT a un `MovimientoMotivo` ya existente (nunca agrega una categoría).
- `esBienGREInventariable(bien, productsMap)` — delega en `esProductoInventariable`, la fuente central.
- `construirLineasSalidaGRE(guia, productsMap, almacenesOrdenados)` — cálculo puro: filtra bienes inventariables y distribuye cada cantidad **FIFO real** (`allocateSaleAcrossalmacenes`, la misma función que usa Factura/Boleta) entre los almacenes activos del establecimiento. Fail-closed: si el disponible no cubre la cantidad exacta de un bien, rechaza la operación completa — nunca una asignación parcial silenciosa. No contiene ninguna lógica FIFO propia; solo llama a la función central.
- `construirDatosOperacionSalidaGRE(...)` — construye el contrato `DatosOperacionSalidaCuantitativa` (mismo tipo que usan NS/Factura), derivando `modoOperacion` de `resolverModoOperacion(estadoValorizacion)` — nunca forzado desde la UI.
- `prepararAnulacionGRE(...)` — localiza los movimientos originales de la GRE (por `documentoOrigenId`+`tipoDocumentoOrigen`+`claveIdempotencia`) y arma el contrato de anulación, o devuelve `null` si la GRE nunca produjo movimiento — nunca inventa una reversión.

### Flujo automático

```
Configuración → Inventario → Reglas por documento → Guía de Remisión = "Automático al emitir"
                                        │
                        FormularioGREPage.tsx#emitir()
             debeDescontarStockAutomaticamenteGRE(controlStockActivo, regla) === true
                                        │
        resolvealmacenesForSaleFIFO(almacenes activos del establecimiento activo)
                                        │
   construirLineasSalidaGRE(guia, catálogo, almacenes)  ←  FIFO real, solo bienes inventariables
                                        │
           construirDatosOperacionSalidaGRE(...)  →  DatosOperacionSalidaCuantitativa
                                        │
      ServicioKardexValorizado.registrarSalidaValorizada(datos, dependencias)
     (reserva idempotente → valida → prepara → [consume capas FIFO si valorizado] → confirma)
                                        │
                          MovimientoStock (SALIDA) + stock actualizado
                                        │
              sincronizarInventarioTrasConfirmacion() (rehidrata UI, evento Kardex)
                                        │
        recién AHORA: correlativo de Series + persistencia de la GRE emitida
```

El descuento ocurre **antes** de asignar correlativo/persistir: una emisión que falla por stock insuficiente nunca consume numeración de Series ni queda registrada como emitida (`FormularioGREPage.tsx`, bloque `try` dedicado con `feedback.error(...)` y `return` temprano).

### Flujo mediante Nota de Salida

Cuando la regla es `'nota_salida'` (o Inventario está inactivo, o el switch maestro está apagado), `debeDescontarStockAutomaticamenteGRE` devuelve `false` y **ningún código de `inventarioGRE.ts` se invoca** — `emitir()` simplemente no entra al bloque de stock. GRE queda exactamente igual que hoy: un documento de traslado que no mueve inventario por sí mismo. El despacho físico se registra mediante el flujo normal y ya existente de Nota de Salida, fuera de GRE. No se investigó ni se encontró ningún mecanismo real de vínculo documental GRE↔NS (a diferencia de Comprobante↔NS, que sí existe vía `comprobanteOrigenId`/evento `facturafacil:comprobante-ns-generada`) — siguiendo la instrucción explícita de no inventar uno solo para aparentar integración, esta modalidad se cierra documentando la separación, no fabricando un enlace. Vincular GRE↔NS documentalmente queda como mejora futura explícita (no bloqueante, no existía antes de este cierre tampoco).

### Cuantitativo

`estadoValorizacion` distinto de `'activa'` → `resolverModoOperacion` resuelve `'cuantitativo_libre'` (u otro modo cuantitativo) → `construirDatosOperacionSalidaGRE` fija `modoOperacion: 'cuantitativo'` → el motor descuenta `stockPorAlmacen` sin crear capas ni consumos, byte a byte igual que Factura/Boleta/NS en el mismo modo. Verificado con test de integración real contra `ServicioKardexValorizado` (sección Tests).

### Valorizado FIFO

`estadoValorizacion === 'activa'` → `resolverModoOperacion` resuelve `'valorizado_exclusivo'` → `construirDatosOperacionSalidaGRE` fija `modoOperacion: 'valorizado'` → el motor consume capas FIFO reales (`CapaCostoInventario`) del almacén asignado, crea sus `ConsumoCapaCostoInventario`, y actualiza `cantidadDisponible` — todo dentro de `ServicioKardexValorizado`. **`inventarioGRE.ts` no contiene ninguna línea de consumo FIFO ni de cálculo de costo** — solo construye el contrato y deja que el motor decida cómo ejecutarlo, exactamente como pide la instrucción ("GRE solo debe solicitar/provocar la operación documental adecuada"). Verificado con test de integración real (capa sembrada, consumo generado, `cantidadDisponible` correcta).

### Borradores

`guardarBorrador()` no fue tocado en esta corrección — sigue sin ninguna referencia a inventario. Guardar, editar y duplicar un borrador de GRE nunca llegan a `emitir()`, así que nunca pueden invocar `inventarioGRE.ts`. El único punto de entrada al motor central es `emitir()`, y solo después de pasar la validación de campos y credenciales.

### Idempotencia

Reutilizada íntegramente, sin ningún mecanismo propio. La clave es `claveIdempotenciaGRE(guia.id)` = `` `guia_remision:${guia.id}` `` — estable porque `guia.id` se genera una sola vez (`GUIA_REMISION_BORRADOR`) y nunca cambia entre borrador y emitida. El motor central (`reservarOperacionIdempotente`, por `(empresaId, clave)`) es quien decide si una invocación es "nueva", "repetida" (mismo hash → no vuelve a mutar stock, devuelve el resultado ya confirmado) o "ambigua". No existe ningún `if (guia.stockProcesado)` ni booleano de sincronización propio de GRE — verificado con un test que invoca `registrarSalidaValorizada` dos veces con los mismos datos y confirma que el stock solo se descuenta una vez y que la segunda invocación resuelve `'repetida'` con cero movimientos nuevos.

### Anulación

`GuiasRemision.tsx#handleConfirmarAnulacion` ahora, antes de marcar la GRE como `'Anulada'`: lee los movimientos persistidos de la empresa, llama a `prepararAnulacionGRE(guia, ...)` para localizar (nunca recalcular) los movimientos originales de esa GRE específica, y si existen, invoca `ServicioKardexValorizado.anularDocumentoValorizado` (con `valorizacionHabilitada: true` — la fuente de si hay que restaurar capas es la operación original, nunca el `estadoValorizacion` actual, mismo criterio que `useNotasSalida.ts#anularNS`) seguido de `sincronizarInventarioTrasConfirmacion()`. Si `prepararAnulacionGRE` devuelve `null` (la GRE nunca produjo movimiento — modalidad Nota de Salida, Inventario inactivo en el momento de emitir, o solo bienes no inventariables), no se invoca al motor y no se inventa ninguna reversión. Repetir la anulación resuelve `'repetida'` en el motor — verificado con test que anula dos veces y confirma que el stock no se restaura por duplicado.

### Establecimiento/almacén

**Sin campo nuevo en `GuiaRemision`.** Se reutiliza `activeEstablecimientoId` (`useTenant()`), el mismo establecimiento activo que `FormularioGREPage.tsx` ya usa para filtrar `seriesDisponibles` — es el establecimiento operativo de la sesión en el momento de emitir, el mismo concepto que Factura/Boleta resuelve como `data.EstablecimientoId || session?.currentEstablecimientoId`. A partir de ahí, el almacén **nunca se hardcodea ni se elige "el primero"**: `resolvealmacenesForSaleFIFO` ordena los almacenes activos de ese establecimiento por `prioridadSalida` (1 = mayor prioridad; el almacén principal si no hay prioridad explícita) y `allocateSaleAcrossalmacenes` reparte la cantidad de cada bien entre ellos respetando el stock realmente disponible — mismas dos funciones centrales que usa Factura/Boleta, sin ninguna variante propia de GRE.

### Multiempresa

`ServicioKardexValorizado` namespacea todo por `empresaId` (recibido explícitamente en cada llamada, nunca inferido). Verificado con test de integración que siembra stock idéntico en dos empresas, descuenta solo en una, y confirma que la otra permanece intacta.

### Por qué no existe doble descuento

Porque la única vía de entrada al motor es `emitir()` → `claveIdempotenciaGRE(guia.id)`, una clave estable por documento; un reintento (doble clic, re-render, volver a invocar `emitir()`, error después de confirmar) siempre golpea la misma `(empresaId, clave)` y el motor central resuelve `'repetida'` sin volver a mutar stock — la misma garantía que ya protege a Factura/Boleta y Nota de Salida, no una nueva.

---

## 10. Tests agregados

| Archivo de test | Casos | Resultado |
|---|---:|---|
| `guias-remision/logica/validacionGRE.test.ts` (nuevo) | 16 | ✅ |
| `guias-remision/logica/reglasFlujoGRE.test.ts` (nuevo) | 9 | ✅ |
| `guias-remision/logica/estadosGRE.test.ts` (nuevo) | 5 | ✅ |
| `guias-remision/logica/useEstadoConfiguracionGRE.test.ts` (nuevo) | 7 | ✅ |
| `guias-remision/modelos/GuiaRemision.test.ts` (nuevo) | 5 | ✅ |
| `guias-remision/api/fuenteDatosGRE.test.ts` (nuevo) | 8 | ✅ |
| `shared/series/guiaRemisionSeries.test.ts` (nuevo) | 8 | ✅ |
| `configuracion-sistema/utilidades/permisos.test.ts` (ampliado, +4 casos GRE) | 30 (4 nuevos) | ✅ |
| `guias-remision/logica/inventarioGRE.test.ts` (nuevo — GRE-P1-008) | 28 | ✅ |

**Casos cubiertos por `inventarioGRE.test.ts`:** lógica pura (`motivoTrasladoAMotivoKardex`, `esBienGREInventariable`, `construirLineasSalidaGRE` con FIFO real/fail-closed/omisión de no-inventariables, `construirDatosOperacionSalidaGRE`, `prepararAnulacionGRE`, `debeDescontarStockAutomaticamenteGRE`) **y** 9 pruebas de integración real contra `ServicioKardexValorizado` (sin mocks del motor): emisión cuantitativa descuenta exactamente una vez en el almacén/tenant correctos; aislamiento multiempresa; idempotencia ante reintento; Inventario inactivo rechaza sin crear movimiento; modo valorizado consume capas FIFO reales; anulación revierte una vez y repetirla no duplica la reversión; una GRE sin movimiento no genera una reversión inventada.

**Total de tests nuevos para GRE:** 90 (86 en archivos nuevos + 4 agregados a un archivo existente). El monorepo pasó de 1697 a **1787** tests, todos en verde.

---

## 11. Verificación de no regresión

Flujos comprobados por lectura de código tras cada cambio + ejecución real de la suite completa (no solo los archivos tocados):

- Crear GRE Remitente y Transportista — sin cambios de comportamiento salvo la corrección propia de P1-001/P1-002.
- Guardar borrador — confirmado que no consume correlativo ni permiso adicional (mismo `ventas.gre.emitir` que ya exigía la ruta).
- Editar borrador (ambos tipos) — el bug de P1-001 ya no puede reproducirse por construcción.
- Emitir — flujo completo revisado línea por línea (sección 9 de este documento).
- Anular / Eliminar borrador / Duplicar — mismo comportamiento visible para Vendedor/Administrador (tienen `ventas.gre.emitir`); Contador (sin ese permiso) ahora correctamente no ve esos botones, un cambio de comportamiento **deseado** (era el hallazgo P1-004).
- Listado, filtros, columnas, paginación, drawer de detalle, impresión — ningún archivo de esas responsabilidades fue tocado.
- Configuración de Transporte, conductores, vehículos, catálogos SUNAT — sin cambios.
- Configuración → Series — sin cambios en `TarjetaSerie.tsx`/`useSeries.ts`; se verificó que ambos ya generalizan sobre `statistics.documentsIssued`, por lo que GRE se integra sin tocarlos.
- Configuración → Inventario — se verificó que Factura/Boleta y Nota de Venta conservan exactamente su comportamiento (mismos estados `localFyB`/`localNV`, mismos dispatches); la tercera columna de GRE existe de nuevo con efecto real, sin alterar las otras dos.
- Compras, Gastos, Comprobantes, Nota de Salida — ningún archivo de esos módulos fue modificado; la suite completa de sus tests (parte de los 1787) sigue en verde.
- Kardex/Inventario (motor central) — solo se extendieron dos listas cerradas de forma aditiva (sección 9); los 1697 tests preexistentes del motor (Compras, Ventas, NS, Ajustes, Transferencias, Valorización) siguen pasando sin ningún cambio de expectativa.
- Multiempresa — `ContextoGuiasRemision.tsx` sigue namespaciendo por `tenantId` en las tres operaciones; la nueva integración de inventario namespacea por `empresaId` en cada llamada a `ServicioKardexValorizado`, verificado con test dedicado.

---

## 12. Calidad técnica

| Verificación | Resultado |
|---|---|
| TypeScript (`tsc -b`) | ✅ 0 errores |
| ESLint (`eslint .`) | ✅ 0 errores, 0 warnings |
| Tests (`vitest run`) | ✅ 1787/1787 (93 archivos) |
| Build de producción (`vite build`) | ✅ 3746 módulos, sin errores |

---

## 13. Hallazgos cerrados

| ID | Antes | Después | Estado |
|---|---|---|---|
| GRE-P1-001 | Editar GRE Transportista mostraba título/series/motivos de Remitente | `guia.tipo` es la única fuente tras cargar; imposible por construcción | ✅ |
| GRE-P1-002 | Correlativo de GRE desacoplado de `Series.correlativeNumber`; una serie usada podía "verse" sin uso y eliminarse | Correlativo y "en uso" vienen de `Series` (mismo patrón que Gastos/Cobranzas) | ✅ |
| GRE-P1-003 | Gate de credenciales solo en `disabled` del botón | `emitir()` rechaza por sí mismo (`derivarEstadoConfiguracionGRE`) | ✅ |
| GRE-P1-004 | Anular/Eliminar/Duplicar sin chequeo de permiso | `ventas.gre.emitir` exigido en el dominio (`ContextoGuiasRemision`) y en la UI | ✅ |
| GRE-P1-005 | Cantidad de bien podía ser 0/negativa/NaN/Infinity | Validado en `validacionGRE.ts` + input bloqueado en `SeccionBienes.tsx` | ✅ |
| GRE-P1-008 | Config. de stock GRE sin ningún efecto | "Automático" dispara salida real vía `ServicioKardexValorizado` (cuantitativo y valorizado FIFO); "Mediante Nota de Salida" no descuenta; idempotente, reversible, sin fuga multiempresa | ✅ |
| GRE-P2-011 | Cero tests de GRE/Transporte | 90 tests nuevos sobre la lógica corregida, incluida integración real con el motor de Inventario | ✅ |
| GRE-P3-001 (cierre natural) | `TIPO_GRE_CODIGO_DOCUMENTO` sin uso real | Reutilizada por `FormularioGREPage.tsx` al corregir P1-001 | ✅ |

---

## 14. No regresión de GRE-P1-001 a GRE-P1-005

Verificado explícitamente tras la corrección definitiva de GRE-P1-008 (ninguno de estos cinco archivos/lógicas fue tocado por la integración de inventario, salvo donde se indica):

| Hallazgo | Verificación | Evidencia |
|---|---|---|
| GRE-P1-001 | `guia.tipo` sigue siendo la única fuente del tipo al editar | `FormularioGREPage.tsx` — la sección de inventario agregada en `emitir()` no lee ni depende de `tipo`/`tipoParam` en ningún punto |
| GRE-P1-002 | Series/correlativo siguen usando `serieActiva`/`incrementSeriesCorrelative` sin cambios | El bloque de inventario se ejecuta **antes** del bloque de correlativo, sin modificarlo; `shared/series/guiaRemisionSeries.ts` no fue tocado y sigue sin contador propio (ver sección 16, "Revisión especial de Series") |
| GRE-P1-003 | La precondición de credenciales sigue protegida en `emitir()`, fuera de la UI | `if (!puedeEmitirPorConfiguracion) return;` se ejecuta antes del bloque de inventario — una GRE sin credenciales completas nunca llega a intentar descontar stock |
| GRE-P1-004 | Los permisos siguen protegidos en `ContextoGuiasRemision` (dominio) y combinados con estado en la UI | `ContextoGuiasRemision.tsx` no fue modificado en esta corrección; la matriz permiso/acción de la sección 7 se mantiene íntegra — reutilizar `ventas.gre.emitir` para anular/eliminar/duplicar sigue siendo la misma decisión ya justificada, no "todo boolean único sin semántica" (ver sección 17, "Revisión especial de permisos") |
| GRE-P1-005 | La cantidad de bienes sigue siendo finita y `> 0` para poder emitir | `validacionGRE.ts` no fue tocado; además `construirLineasSalidaGRE` (`inventarioGRE.ts`) vuelve a redondear/validar la cantidad a la precisión del motor (`PRECISION_CANTIDAD_UNIDAD_MINIMA`), como defensa adicional independiente, nunca como sustituto de la validación de dominio |

Confirmado con la suite completa: los tests específicos de estos cinco hallazgos (`validacionGRE.test.ts`, `guiaRemisionSeries.test.ts`, `useEstadoConfiguracionGRE.test.ts`, los 4 casos de GRE en `permisos.test.ts`, `GuiaRemision.test.ts`) siguen pasando sin ninguna modificación.

---

## 15. Hallazgos P2/P3 que permanecen

No bloqueantes, no tratados en este cierre (fuera del alcance explícito):

- GRE-P2-001 — Documentos relacionados "Interno" sin selector real.
- GRE-P2-002 — Errores de parseo de `localStorage` silenciados sin log.
- GRE-P2-003 — Sin detección de productos duplicados en bienes.
- GRE-P2-004 — `/guias-remision/:id` con id inexistente no informa al usuario.
- GRE-P2-005 — Guardas de estado (no editar/eliminar GRE emitida) solo en la UI, no en el datasource.
- GRE-P2-006 — `numeroRegistroMTC`/`estado` del transportista sin consumidor downstream.
- GRE-P2-007 — Regla de partida/llegada por motivo hardcodeada fuera de `reglasFlujoGRE.ts`.
- GRE-P2-008 — Race condition teórica de correlativo en emisión multi-pestaña (misma naturaleza que antes; no agravada).
- GRE-P2-009 — Campo de texto libre "guía de remisión" en otros documentos sin enlace real.
- GRE-P2-010 — Sin "Descargar PDF" en la UI de GRE.
- GRE-P2-012 — Formulario de Conexión SUNAT podría no resetear estado al cambiar de empresa sin credenciales previas.
- GRE-P3-002 — Placa M1/L como snapshot de texto, no referencia estable.
- GRE-P3-003 — Ambigüedad visual entre "Emitida" y "Pendiente".
- GRE-P3-004 — Sin representación en formato Ticket.
- GRE-P3-005 — Orden de modalidades de transporte fijado en código.

---

## 16. Código eliminado o consolidado

- `fuenteDatosGRE.ts#nextCorrelativo` (interfaz `IGuiasRemisionDataSource` y su implementación) — el silo de numeración propio de GRE que causaba GRE-P1-002; reemplazado por el consumo real de `Series`.
- Mapeo manual `tipo === 'remitente' ? '09' : '31'` en `FormularioGREPage.tsx` — reemplazado por la constante ya exportada `TIPO_GRE_CODIGO_DOCUMENTO` (cierra GRE-P3-001 de paso).
- El campo `stockDescuentoGuiaRemision` y su tarjeta de UI, retirados en la primera pasada de este cierre, **fueron restaurados** en la corrección definitiva (sección 9) — no quedó ningún rastro de la eliminación (ni comentarios, ni código muerto, ni una versión paralela): el campo volvió exactamente al mismo lugar, tipo y patrón que ya usan Factura/Boleta y Nota de Venta.

**Revisión especial de Series (instrucción explícita de esta reapertura):** se verificó que `shared/series/guiaRemisionSeries.ts` sigue siendo, como máximo, una adaptación hacia la fuente central — `getNextGuiaRemisionDocument` es una previsualización pura (`correlative = series.correlativeNumber + 1`) que **no muta la serie recibida** (confirmado por test) y **no mantiene ningún contador, `statistics` ni persistencia propia**. La confirmación real sigue viviendo exclusivamente en `useSeriesCommands().incrementSeriesCorrelative` (código central compartido con Gastos/Cobranzas), invocada una sola vez desde `FormularioGREPage.tsx#emitir()`. No se detectó ninguna duplicidad — GRE-P1-002 permanece cerrado sin cambios.

**Revisión especial de permisos (instrucción explícita de esta reapertura):** se verificó que `ContextoGuiasRemision.tsx` (no tocado en esta corrección) exige `ventas.gre.emitir` para **todas** las mutaciones (crear, editar borrador, emitir, anular, eliminar borrador, duplicar) porque las seis son, hoy, la misma capacidad funcional bajo los tres roles de sistema existentes — no una simplificación que pierda semántica, sino la reutilización explícitamente pedida por el hallazgo original GRE-P1-004 ("si `ventas.gre.emitir` es funcionalmente el permiso que corresponde, reutilizarlo"). La autorización efectiva de cada acción sigue siendo **permiso + estado del documento**, nunca solo uno de los dos (ver matriz de la sección 7) — no se convirtió en un único booleano ciego: `puedeAnularGRE(guia)`/`puedeEliminarBorradorGRE(guia)`/`puedeEditarGRE(guia)` (estado) se siguen evaluando junto con `puedeGestionarGRE` (permiso) en `TablaGuias.tsx`/`DrawerDetalleGRE.tsx`, y el propio `ContextoGuiasRemision` vuelve a exigir el permiso independientemente del estado. No se encontró necesidad funcional real de permisos más granulares (`ventas.gre.anular` separado de `ventas.gre.emitir`, por ejemplo) — de existir en el futuro un rol personalizado que sí la requiera, es un cambio aditivo al catálogo, no una corrección de lo ya implementado.

---

## 17. Fuentes de verdad finales

| Concepto | Fuente definitiva |
|---|---|
| Tipo GRE (una vez cargada la guía) | `guia.tipo` |
| Series (catálogo, código T001/V001) | `ContextoConfiguracion` → `configState.series` |
| Correlativo GRE | `Series.correlativeNumber` (confirmado vía `useSeriesCommands().incrementSeriesCorrelative`, mismo mecanismo que Gastos/Cobranzas) |
| "Serie en uso" / bloqueo de borrado | `Series.statistics.documentsIssued > 0` (sin cambios en `TarjetaSerie.tsx`/`useSeries.ts`) |
| Motivos de traslado | `catalogosGRE.ts` (`MOTIVOS_TRASLADO`) + `reglasFlujoGRE.ts` (reglas por tipo+motivo) |
| Transporte (conductores/vehículos/datos transportista) | `configuracion-sistema/api/fuenteDatosTransporte.ts` |
| Credenciales SUNAT | `fuenteDatosConexionSunat.ts`; regla de negocio derivada en `derivarEstadoConfiguracionGRE` (pura, sin React) |
| Permisos | `catalogoPermisos.ts` + `rolesDelSistema.ts` + `utilidades/permisos.ts#tienePermiso` — el mismo guard para rutas (`PermisoGuard`) y para comandos de dominio (`ContextoGuiasRemision`) |
| Regla de stock GRE | `SalesPreferences.stockDescuentoGuiaRemision` (`ContextoConfiguracion.tsx`) — mismo campo/tipo/patrón que Factura-Boleta y Nota de Venta |
| Decisión de disparar el descuento | `debeDescontarStockAutomaticamenteGRE` (`guias-remision/logica/inventarioGRE.ts`) — función pura, única, sin duplicados |
| Establecimiento/almacén de origen | `activeEstablecimientoId` (`useTenant()`) + `resolvealmacenesForSaleFIFO`/`allocateSaleAcrossalmacenes` (`shared/inventory/stockGateway.ts`) — mismas funciones que Factura/Boleta, sin variante propia de GRE |
| Clasificación inventariable | `esProductoInventariable` (`shared/inventory/clasificacionInventario.ts`) — misma fuente que Ventas/NI/NS/Transferencias |
| Movimiento de stock (ejecución real) | `ServicioKardexValorizado` (`gestion-inventario/services/servicioKardexValorizado.ts`) — mismo motor para GRE, Factura/Boleta, Nota de Salida, Ajustes y Transferencias |
| Idempotencia de la salida/anulación de GRE | `claveIdempotenciaGRE(guia.id)` → `reservarOperacionIdempotente(empresaId, clave)` (motor central) — ningún mecanismo propio |

---

## 18. Veredicto final

**¿Podemos considerar CERRADO el módulo de Guías de Remisión dentro del alcance actual del prototipo frontend de SenciYo?**

### ✅ APROBADO PARA CIERRE

Los 6 hallazgos P1 están cerrados en su causa raíz. GRE-P1-008, tras su reapertura, quedó cerrado mediante integración real con la arquitectura central de Inventario: la configuración `stockDescuentoGuiaRemision` existe de nuevo y tiene efecto real — "Automático" dispara `ServicioKardexValorizado.registrarSalidaValorizada` (mismo motor que Factura/Boleta y Nota de Salida, cuantitativo o valorizado FIFO según el modo de la empresa, con idempotencia y reversión reales), "Mediante Nota de Salida" no descuenta automáticamente. La extensión del núcleo del motor fue mínima y puramente aditiva (dos listas cerradas ampliadas en 4 archivos, ningún caso existente alterado), sin crear un segundo Kardex, sin FIFO propio de GRE, sin almacén hardcodeado y sin fuga multiempresa. Los cinco hallazgos ya cerrados (P1-001 a P1-005) se verificaron intactos explícitamente. Se agregaron 90 pruebas de regresión sobre código antes sin ninguna cobertura, incluidas 9 pruebas de integración real contra el motor de Inventario (sin mocks). TypeScript, ESLint, la suite completa (1787/1787) y el build de producción pasan en verde. No apareció ningún P0 ni P1 nuevo durante la implementación.
