# Auditoría Final — Guías de Remisión SenciYo

**Fecha:** 2026-08-07
**Alcance:** Frontend `apps/senciyo` (React 19 + TypeScript). Auditoría de solo lectura — no se modificó código productivo.
**Método:** Lectura exhaustiva de archivos fuente (no solo grep), verificación cruzada de 6 sub-auditorías especializadas + verificación directa de las citas más críticas por el auditor principal, ejecución real de `build`/`lint`/`test`.

---

## 1. Veredicto ejecutivo

### ⚠️ APROBADO CON OBSERVACIONES

| Dimensión | Resultado |
|---|---|
| Cierre prototipo frontend | 🟡 **Parcial** — flujo principal (crear→borrador→editar→emitir→listar→detalle→anular→imprimir) funciona de extremo a extremo y con datos reales, pero quedan 6 hallazgos P1 concretos por cerrar |
| Preparación backend | 🟢 **Buena** — modelos, contratos de datasource (`IGuiasRemisionDataSource`, `IConductoresDataSource`, `IVehiculosDataSource`) y separación por `empresaId` están listos para sustituir `localStorage` por API sin rehacer el módulo |
| Preparación producción/SUNAT | 🔴 **No lista** — sin XML/UBL, sin firma digital, sin cliente API SUNAT/OSE, sin QR/CDR (dependencias de backend, no defectos de frontend) |
| P0 encontrados | **0** |
| P1 encontrados | **6** |
| P2 encontrados | **12** |
| P3 encontrados | **5** |

No se declara ✅ APROBADO PARA CIERRE porque existen 6 hallazgos P1 dentro del alcance actual (numeración/series desincronizada, gate de credenciales solo en UI, permisos sin efecto en acciones de fila, validación de cantidad ausente, bug de tipo al editar GRE Transportista, configuración de stock fantasma). Ninguno de ellos rompe el flujo principal hoy, por eso tampoco se declara ❌ NO APROBADO.

---

## 2. Resumen ejecutivo

El módulo GRE es, en términos de arquitectura, el más maduro de los módulos "nuevos" del sistema: reutiliza el catálogo real de productos, el datasource real de conductores/vehículos de Configuración → Transporte, los catálogos SUNAT centralizados (`catalogosGRE.ts`), el sistema de diseño de impresión de Comprobantes, y aísla correctamente por empresa en los tres datasources involucrados (GRE, Transporte, Conexión SUNAT). Build, lint y la suite de tests completa del monorepo pasan en verde (1697/1697 tests, 0 errores TS, 0 errores ESLint).

Sin embargo, quedan seis brechas P1 concretas: (1) al editar un borrador de GRE Transportista, la UI de series y motivos se calcula con el tipo equivocado por un bug de derivación desde la URL; (2) el correlativo de GRE se calcula de forma totalmente desacoplada del contador oficial de Configuración → Series, lo que permite eliminar una serie "en uso" sin advertencia real; (3) el bloqueo de emisión por credenciales SUNAT incompletas vive solo en el atributo `disabled` de un botón React, nunca en la función de dominio que persiste la emisión; (4) las acciones Anular/Eliminar borrador/Duplicar no verifican ningún permiso, solo el estado del documento; (5) no se valida que las cantidades de los bienes sean positivas antes de emitir; (6) la opción de configuración "Descuento de stock por Guía de Remisión" existe en la UI pero no tiene ningún consumidor en el código — es una opción fantasma.

La integración con Inventario es inexistente por diseño actual (GRE nunca descuenta stock, sin riesgo de doble descuento, pero tampoco ninguna conexión real con Nota de Salida ni con comprobantes). El envío real a SUNAT (XML, firma, API, CDR) no existe y es correctamente una dependencia de backend, no un defecto de este frontend. No existe ni un solo test automatizado para GRE o Configuración de Transporte.

---

## 3. Alcance auditado

**Carpetas completas leídas (no solo grep):**

- `apps/senciyo/src/pages/Private/features/guias-remision/` — modelos, api, contexto, lógica, componentes (forma, lista, modales, detalle, compartido), páginas, impresión.
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/components/transporte/` — modales, tablas, sección datos transportista, helpers.
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/components/catalogos-gre/` — catálogos SUNAT de solo lectura.
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/components/conexion-sunat/` — credenciales SOL/GRE.
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/datos/catalogosGRE.ts`, `modelos/Transporte.ts`, `api/fuenteDatosTransporte.ts`, `api/fuenteDatosConexionSunat.ts`, `paginas/ConfiguracionTransporte.tsx`.
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/roles/` (permisos y roles).
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/components/series/TarjetaSerie.tsx` y modelo `Series.ts` (contraste con numeración GRE).
- `apps/senciyo/src/pages/Private/features/configuracion-sistema/contexto/ContextoConfiguracion.tsx` (config de stock, incluido `stockDescuentoGuiaRemision`).
- `apps/senciyo/src/routes/privateRoutes.tsx`, `apps/senciyo/src/layouts/components/SideNav.tsx`.
- `apps/senciyo/src/shared/impresion/` (`ServicioImpresionComprobante.ts`, `ResolverDisenoImpresion.ts`) como dependencia de la impresión GRE.

**Búsquedas dirigidas (Grep/Glob) en todo `apps/senciyo/src`** para: referencias cruzadas GRE↔Inventario/Kardex/Nota de Salida; navegación hacia `/guias-remision` desde otros módulos; duplicación de catálogos de motivo/modalidad fuera de `catalogosGRE.ts`; `Date.now()`/`Math.random()`/mocks/TODO/FIXME; librerías de PDF; generadores XML/UBL; wildcards de permisos; código legacy referenciado en documentación previa.

**Documentos históricos revisados y contrastados contra el código actual** (no tomados como verdad vigente): `AUDITORIA_GRE.md` (raíz, 2026-06-29) y `guias-remision/AUDITORIA_GRE_IMPRESION_XML_PDF.md` (2026-06-29).

**Verificaciones técnicas ejecutadas:** `npm run build -w senciyo`, `npm run lint -w senciyo`, `npm run test -w senciyo`.

**No verificado (fuera de alcance de este repositorio):** cualquier backend/API real, comportamiento en runtime del navegador (esta auditoría es de código estático, no hay ejecución de la app ni capturas de pantalla).

---

## 4. Mapa actual de la implementación

| Área | Archivos principales | Responsabilidad | Fuente de verdad | Estado |
|---|---|---|---|---|
| Modelo de datos GRE | `modelos/GuiaRemision.ts` | Tipos `GuiaRemision`, `BienGRE`, `TransportePrivado/Publico`, `EventoGRE`, `EstadoGRE` | Única | ✅ |
| Reglas por tipo+motivo | `logica/reglasFlujoGRE.ts` | Actor principal/secundario, obligatoriedad de punto de llegada, especificación | Única, consumida por validación y UI | ✅ |
| Validación de emisión | `logica/validacionGRE.ts` | Campos mínimos obligatorios | Consume `reglasFlujoGRE` | 🟡 (no valida cantidad de bienes) |
| Persistencia GRE | `api/fuenteDatosGRE.ts` | CRUD + `nextCorrelativo` por `empresaId` | Única para el documento GRE | 🟡 (correlativo desacoplado de Series) |
| Estado global GRE | `contexto/ContextoGuiasRemision.tsx` | `useReducer` + datasource + `tenantId` | — | ✅ |
| Formulario | `paginas/FormularioGREPage.tsx` + `components/forma/*` | Alta/edición/emisión | — | 🟡 (bug de `tipo` al editar Transportista) |
| Listado/filtros/columnas | `paginas/GuiasRemision.tsx`, `logica/filtrosGRE.ts`, `logica/columnasGRE.ts`, `components/lista/*` | Listado, borradores, filtros avanzados, columnas configurables | — | ✅ |
| Detalle | `components/detalle/DrawerDetalleGRE.tsx` + ruta `/guias-remision/:id` | Drawer con 5 tabs sobre el listado (no página independiente) | — | ✅ (sin manejo de "id no encontrado") |
| Estados/transiciones | `logica/estadosGRE.ts` | Labels, badges, `puedeAnularGRE/EditarGRE/EliminarBorradorGRE` | Única | 🟡 (4 de 7 estados inalcanzables sin backend) |
| Configuración Transporte | `configuracion-sistema/.../transporte/*`, `api/fuenteDatosTransporte.ts` | CRUD conductores/vehículos/datos transportista | Única, **compartida** con el formulario GRE | ✅ |
| Catálogos SUNAT | `configuracion-sistema/datos/catalogosGRE.ts` | Motivos, modalidad, unidades, entidades D.37, bienes normalizados, doc. relacionados | Única, solo lectura en Configuración | ✅ |
| Credenciales SUNAT | `configuracion-sistema/.../conexion-sunat/*`, `api/fuenteDatosConexionSunat.ts` | SOL + GRE (clientId/secret) | Única por empresa | 🟡 (gate solo en UI) |
| Series/numeración | `configuracion-sistema/modelos/Series.ts`, `TarjetaSerie.tsx` vs `fuenteDatosGRE.nextCorrelativo` | Series T001/V001 vs correlativo real | **Duplicada / desincronizada** | 🟡 |
| Permisos | `roles/catalogoPermisos.ts`, `roles/rolesDelSistema.ts`, `utilidades/permisos.ts`, `routes/PermisoGuard.tsx` | `ventas.gre.ver/emitir`, `config.transporte.gestionar` | Única para rutas; sin gating a nivel de acciones de fila | 🟡 |
| Impresión A4 | `impresion/imprimirGuiaGRE.ts`, `impresion/RepresentacionImpresaGRE.tsx` | Render + `ServicioImpresionComprobante` | Integrada al diseño centralizado de Comprobantes | ✅ |
| PDF/XML/SUNAT real | — | No existe | — | ❌ (dependencia de backend/decisión de arquitectura) |
| Inventario/Stock | — | No existe ninguna conexión | `stockDescuentoGuiaRemision` es config fantasma | ❌ (por diseño actual) |

---

## 5. Arquitectura y fuentes de verdad

- **Tipo de GRE (Remitente/Transportista):** se persiste en `guia.tipo` (fuente correcta). Pero en `FormularioGREPage.tsx` la variable local `tipo` usada para calcular `codigoDocumento`, `seriesDisponibles`, el título y el filtro de motivos en `SeccionDatosGenerales` se deriva de `tipoParam` de la URL (`FormularioGREPage.tsx:516,522`), no de `guia.tipo`. La ruta de edición (`/guias-remision/editar/:id`) no tiene segmento `:tipoParam`, así que esa variable local siempre cae en `'remitente'` al editar (ver **GRE-P1-001**).
- **Series:** fuente de verdad real es `configState.series` (`ConfigurationContext`, alimentado por Configuración → Series), filtrado por `documentType.code` (`'09'` remitente / `'31'` transportista) — confirmado en `Series.ts` (`SUNAT_DOCUMENT_TYPES`) que asigna prefijos `T`/`V` diferenciados. Esto es correcto y real.
- **Correlativo:** fuente de verdad es el propio `fuenteDatosGRE.ts` (`nextCorrelativo`), que escanea el máximo correlativo entre las GRE ya emitidas para esa serie — **completamente desacoplado** de `Series.correlativeNumber`/`statistics.documentsIssued` que usa la pantalla de Configuración → Series (ver **GRE-P1-002**).
- **Catálogos SUNAT** (motivos, modalidad, unidades, entidades D.37, bienes normalizados, tipos de documento de conductor, configuraciones vehiculares): única fuente, `configuracion-sistema/datos/catalogosGRE.ts`, con comentario explícito de cabecera "fuente autoritativa única — no duplicar". Confirmado sin duplicación en todo el repo. Se persiste siempre el **código**, nunca el label.
- **Conductores/Vehículos/Datos del transportista:** única fuente, `configuracion-sistema/api/fuenteDatosTransporte.ts`. El formulario GRE (`SeccionTransporte.tsx`) importa exactamente el mismo datasource que `ConfiguracionTransporte.tsx` — confirmado por import directo, no por duplicación ni mock. Un conductor/vehículo editado en Configuración aparece de inmediato en el formulario GRE porque ambos leen la misma clave de `localStorage` vía el mismo objeto singleton.
- **Credenciales SUNAT (SOL + GRE):** única fuente, `fuenteDatosConexionSunat.ts`, por `empresaId`. El estado derivado (`credencialesCompletas`) se calcula en `useEstadoConfiguracionGRE.ts` a partir de esos campos reales — no es un valor simulado. Pero esa fuente de verdad solo se consulta en la capa de presentación del botón, no dentro de la función de dominio `emitir()` (ver **GRE-P1-003**).
- **Diseño de impresión (logo/marca de agua/pie de página):** única fuente, el mismo sistema centralizado que usan los Comprobantes (`AlmacenamientoDisenoComprobante` / `ResolverDisenoImpresion` / `ServicioImpresionComprobante`), consumido por GRE vía `imprimirGuiaGRE.ts` sin duplicar HTML propio desconectado (a diferencia de lo que documentaba la auditoría de 2026-06-29, ya superado).
- **Permisos:** única fuente para el guard de rutas (`catalogoPermisos.ts` + `rolesDelSistema.ts` + `utilidades/permisos.ts`). Existe un segundo mecanismo (`UserSessionContext.hasPermission`, con wildcard `'*'`) pero está acotado a pantallas de gestión de usuarios y **no interviene** en las rutas de GRE/Transporte.
- **Inventario/Stock:** no existe ninguna fuente de verdad compartida con GRE. El campo `stockDescuentoGuiaRemision` en `ContextoConfiguracion.tsx` no tiene ningún lector fuera del propio módulo de configuración (ver **GRE-P1-008**).

---

## 6. GRE Remitente

**Estado: COMPLETA** (dentro del alcance frontend), con una salvedad menor.

- Motivos de traslado exclusivos de Remitente (01,02,04,05,06,07,08,09,14,17,18,19) filtrados correctamente en `SeccionDatosGenerales.tsx:93-97` cuando la variable `tipo` es correcta (caso de creación).
- Reglas por motivo (`reglasFlujoGRE.ts`) verificadas de forma cruzada contra validación y UI para los motivos '02' (Compra), '03' (Venta con entrega a terceros), '13' (Otros) y '18' (Emisor itinerante): en los cuatro casos la regla declarada coincide exactamente con lo que exige `validacionGRE.ts` y con lo que muestra/oculta `SeccionDatosGenerales.tsx`.
- Ciclo completo verificado: crear → guardar borrador (`guardarBorrador()`) → listar (tab Borradores) → editar (`getById` re-hidrata el objeto completo) → emitir (`emitir()`, correlativo real, historial, modal de éxito) → anular (`ModalAnularGRE` + `puedeAnularGRE`). Todas las funciones son reales, conectadas a datasource, no decorativas.
- Bienes: reutiliza el catálogo real de productos (`useProductStore`, `ProductModal`), con snapshot correcto de campos normativos y columnas de solo lectura en vivo contra el catálogo para lo informativo.

**Salvedad:** cuando se edita un borrador de GRE Remitente, el bug de la sección 5 no tiene efecto observable porque el tipo por defecto de la URL (`'remitente'`) coincide con el tipo real — el bug solo se manifiesta al editar Transportista (sección 7).

---

## 7. GRE Transportista

**Estado: PARCIAL** — el formulario y el modelo de datos están completos y correctamente diferenciados de Remitente (no es una copia visual con otro título: motivos exclusivos 20/21/22, actor principal "Remitente" en vez de variable por motivo, sección de transporte público con campos propios de transportista), pero la edición de borradores está afectada por **GRE-P1-001**.

- Al editar un borrador de tipo Transportista (`/guias-remision/editar/:id`), la variable local `tipo` en `FormularioGREPage.tsx` no puede leerse de la URL (esa ruta no tiene `:tipoParam`) y cae por defecto en `'remitente'`. Esto hace que:
  - El título muestre "Editar GRE Remitente" en vez de "Editar GRE Transportista" (línea 728).
  - `seriesDisponibles` se filtre por código `'09'` en vez de `'31'` (línea 562-572) — las series V001 correctas pueden no aparecer disponibles para reselección.
  - El `<select>` de motivos en `SeccionDatosGenerales` se filtre con las reglas de Remitente, pudiendo excluir u ofrecer motivos que no corresponden al tipo real de la guía (línea 776, prop `tipo`).
- La validación real de campos obligatorios (`validarGREParaEmitir`, que usa `guia.tipo`, no la variable local) **no** se ve afectada — un borrador Transportista con datos ya guardados puede seguir emitiéndose correctamente si el usuario no toca el motivo/serie durante la edición. El riesgo es de UI/UX incorrecta (mostrar controles del tipo equivocado), no de corrupción del documento persistido.
- Fuera de esta salvedad, el resto del ciclo (crear, guardar, listar, emitir, anular, imprimir, detalle) funciona igual y correctamente para ambos tipos, confirmado por el mismo camino de código que Remitente (no hay una segunda implementación paralela).

---

## 8. Series y correlativos

- **Serie:** real, gobernada por Configuración → Series, con prefijos diferenciados `T001` (código SUNAT `09`, Remitente) y `V001` (código `31`, Transportista) — `Series.ts` (`SUNAT_DOCUMENT_TYPES`). No es un campo de texto libre.
- **Correlativo:** `fuenteDatosGRE.ts:69-79` (`nextCorrelativo`) escanea las GRE ya emitidas (`!g.esBorrador && g.correlativo`) de esa serie y devuelve `max + 1`, `padStart(8,'0')`. **No usa `Date.now()`, `Math.random()` ni UUID como número visible** — el hallazgo de la auditoría de 2026-06-29 sobre `Date.now().slice(-8)` está **cerrado**; hoy el correlativo es secuencial real respecto a sí mismo.
- **Hallazgo (GRE-P1-002):** ese contador es una segunda fuente de verdad, totalmente desacoplada de `Series.correlativeNumber`/`statistics.documentsIssued`, que es lo que la pantalla de Configuración → Series usa para decidir si una serie está "en uso" y si se puede eliminar (`TarjetaSerie.tsx:151,158,310,339,384-403`). Una serie T001 usada activamente por GRE aparecerá en Configuración como "Serie sin usar" con correlativo `00000001`, y **puede eliminarse desde esa pantalla sin ninguna advertencia real**.
- **Borradores:** no consumen ni reservan correlativo — `guardarBorrador()` nunca llama a `nextCorrelativo`; el número solo se asigna dentro de `emitir()`. No hay riesgo de "huecos" de numeración por borradores descartados.
- **Concurrencia:** sin lock/transacción, dos emisiones casi simultáneas de la misma serie desde dos pestañas podrían leer el mismo máximo antes de que la primera persista → correlativos duplicados (riesgo teórico de baja probabilidad, mitigado en una sola pestaña por `disabled={guardando}` en el botón Emitir).
- **Conclusión:** el correlativo es confiable *dentro de su propio silo* (GRE), pero **no está listo para backend/SUNAT sin resolver la desincronización con Series**, porque cualquier operación de administración de series (eliminar, resetear, reasignar) ignora por completo el uso real que GRE le está dando.

---

## 9. Catálogos SUNAT y motivos de traslado

Todos los catálogos usados por GRE (`MOTIVOS_TRASLADO`, `MODALIDADES_TRANSPORTE`, `BIENES_NORMALIZADOS`, `DOCUMENTOS_RELACIONADOS_GRE`, `ENTIDADES_AUTORIZADORAS_D37`, `TIPOS_DOCUMENTO_CONDUCTOR_GRE`, `CONFIGURACIONES_VEHICULARES`) viven exclusivamente en `configuracion-sistema/datos/catalogosGRE.ts`. Verificado por grep en todo el repo: ninguno está redefinido ni duplicado en otro archivo.

| Catálogo | Fuente | Valor almacenado | Label UI | Hardcode | Estado |
|---|---|---|---|---|---|
| Motivos de traslado | `catalogosGRE.ts` | Código SUNAT | Descripción del catálogo | No | ✅ |
| Modalidad de transporte | `catalogosGRE.ts` | `'01'`/`'02'` | Descripción | No | ✅ |
| Unidades de medida | `configState.units` (Configuración) | Código | `getUnitDisplayForUI` | No | ✅ |
| Entidades autorizadoras D.37 | `catalogosGRE.ts` | Código | Nombre/abreviatura | No | ✅ |
| Bienes normalizados (BNES) | `catalogosGRE.ts` | Código SUNAT + subpartida | Descripción | No | ✅ |
| Documentos relacionados (catálogo de tipos) | `catalogosGRE.ts` | Código | Descripción | No | ✅ |
| Tipos doc. conductor | `catalogosGRE.ts` | Código SUNAT | DNI/CE/Pasaporte | No | ✅ |

- La pantalla "Configuración → Transporte → Catálogos SUNAT" (`SeccionCatalogosGRE.tsx` y sus 3 tablas) es **explícitamente de solo lectura** ("Datos oficiales de solo lectura") — no hay ningún `onChange`/CRUD sobre esos arrays. Esto elimina el riesgo de "Configuración muestra A pero GRE consume B", porque no hay forma de editarlos desde la UI; ambos leen literalmente la misma constante importada.
- **Motivo de traslado** verificado en profundidad (sección 6/7): reglas por motivo viven únicamente en `reglasFlujoGRE.ts`, consumidas de forma idéntica por `validacionGRE.ts` y por los componentes de formulario. Única fisura menor: `SeccionPuntosTraslado.tsx` compara `motivoTraslado === '01'/'02'` directamente (fuera de `reglasFlujoGRE.ts`) para decidir qué lado es partida y cuál es llegada — no contradice la regla oficial, pero es una tercera fuente de decisión por motivo fuera del archivo declarado como única fuente de verdad (**GRE-P2-008**).
- Persistencia por código (no por label) confirmada en el modelo y en los selectores (`SeccionBienes.tsx`, `SeccionDocumentosRelacionados.tsx`).

---

## 10. Configuración de Transporte

**Estado: funcional y realmente integrada con el formulario GRE — no es una pantalla aislada.**

### Datos del transportista
- RUC/razón social: read-only desde `Company` (Datos de Empresa), con texto explícito en la UI aclarando que no se editan ahí (`SeccionDatosTransportista.tsx:126-144`).
- "Estado operativo": el propio componente aclara explícitamente que **no representa una certificación oficial del MTC ni de SUNAT** (línea 180-182) — sin riesgo de confusión.
- `codigoEntidadAutorizadora`/`numeroAutorizacion` sí se consumen downstream (impresión GRE, `ModalConfiguracionGRE`). `numeroRegistroMTC` y `estado` se capturan y persisten pero **no tienen ningún consumidor** en el flujo de emisión de GRE (**GRE-P2-007**).
- Persistencia aislada por empresa (`facturafacil_transportista_${empresaId}`).

### Conductores y Vehículos
- CRUD real contra `fuenteDatosTransporte.ts` (no estado local efímero), con validaciones de duplicado (licencia, documento, placa), bloqueo de eliminación si hay relaciones activas (verificado dos veces: al abrir modal y al confirmar), y aislamiento por empresa en cada método.
- **Integración real confirmada con GRE:** `SeccionTransporte.tsx` importa directamente `conductoresDataSource`/`vehiculosDataSource` del mismo módulo de Configuración — no hay mock ni copia separada. Un conductor/vehículo creado o editado en Configuración aparece de inmediato disponible en el formulario GRE, y viceversa (el formulario GRE puede crear conductores/vehículos inline reutilizando los mismos modales de Configuración).
- La relación se guarda por **ID estable** (`conductoresIds`/`vehiculosIds`), no por texto — excepto en el caso de vehículos M1/L, donde se guarda solo la placa como string suelto (`placaVehiculoM1L`), consistente con que SUNAT exige datos simplificados para esa categoría, pero con el efecto secundario de que un cambio posterior de placa no se refleja en guías ya guardadas (**GRE-P3-002**).

### Catálogos SUNAT (dentro de Configuración → Transporte)
Ver sección 9 — solo lectura, fuente única, sin riesgo de desincronización porque no son editables.

---

## 11. Credenciales SUNAT

- **Fuente de verdad real, no simulada:** `useEstadoConfiguracionGRE.ts` calcula `solCompleto`/`greCompleto` a partir de 4 campos persistidos reales (`usuarioSOL`, `claveSOL`, `clientId`, `clientSecret`), por empresa, vía `fuenteDatosConexionSunat.ts`.
- **Refresco automático correcto:** al guardar el modal de configuración, se invoca `refrescar()` y el banner/estado se recalcula sin recargar la página, tanto en el listado como en el formulario.
- **Se puede guardar vacío** (decisión intencional, documentada en la auditoría previa) — al limpiar credenciales, el banner "faltan credenciales" reaparece correctamente.
- **Multiempresa:** el hook recalcula correctamente al cambiar `tenantId`. Hallazgo secundario no bloqueante: el formulario de Configuración → Conexión SUNAT (no el modal del flujo GRE) podría no resetear su estado visual si se cambia de empresa mientras esa pantalla está montada y la nueva empresa no tiene credenciales — no verificado en runtime, solo por lectura de código.
- **Hallazgo central (GRE-P1-003):** el bloqueo de emisión por credenciales incompletas **vive únicamente en el atributo `disabled` del botón "Emitir GRE"** (`FormularioGREPage.tsx:544,936`). La función de dominio `emitir()` (líneas 673-702) nunca lee `puedeEmitirPorConfiguracion` ni `credencialesCompletas` — solo valida `validarGREParaEmitir(guia)` y `tenantId`. Hoy no existe ningún camino de UI que invoque `emitir()` sin pasar por ese botón (no hay bypass explotable en el estado actual del código), pero no hay defensa en profundidad: es exactamente el patrón "la UI dice que algo es obligatorio, pero la regla de dominio permite saltárselo" que esta auditoría buscaba detectar explícitamente.

---

## 12. Formularios y validaciones

Campos realmente obligatorios para emitir, según `validarGREParaEmitir()` (`validacionGRE.ts`): serie; destinatario (si `regla.actorPrincipal.obligatorio`); comprador (si `regla.actorSecundario?.obligatorio`, motivo '03'); especificación de motivo (si `regla.requiereEspecificacion`, motivo '13'); al menos un bien; peso total > 0; dirección de punto de partida; dirección de punto de llegada (si `regla.puntoLlegadaObligatorio`); datos de transporte según modalidad (vehículo/conductor o transportista según privado/público, salvo M1/L).

- El botón Emitir se deshabilita **en tiempo real** (`useMemo` sobre `guia`), no solo al hacer click.
- Re-hidratación de un borrador al editar: `getById` reemplaza el objeto `guia` completo — no se detectó pérdida de datos en esa operación.
- **Huecos de validación confirmados:**
  - Cantidad de un bien puede ser `0` o negativa (el `<input type="number" min={0}>` no bloquea negativos al escribir directamente; `validacionGRE.ts` solo exige `bienes.length > 0`, nunca valida `bien.cantidad`) — **GRE-P1-005**.
  - No hay detección de productos duplicados al agregar bienes (se puede agregar el mismo producto N veces como líneas separadas) — **GRE-P2-003**.
  - `handlePesoTotalChange` sí maneja `NaN`/negativos correctamente (fallback explícito).
- Bienes: reutiliza el catálogo real de productos, no permite bienes "manuales" sin producto de catálogo por ningún camino de UI expuesto, mantiene snapshot correcto de campos normativos (descripción, unidad, peso, códigos SUNAT) independiente de cambios futuros en el catálogo maestro, mientras que las columnas informativas (nombre, imagen, stock) sí reflejan el catálogo en vivo — diseño intencional y correcto, no una inconsistencia.
- **Documentos relacionados:** el toggle "Interno/Externo" sugiere que un documento "Interno" debería enlazar a un comprobante real del sistema, pero en la práctica **todos los campos son de texto libre** (serie, número, fecha, RUC emisor tecleados a mano) — el campo del modelo `documentoInternoId` nunca se lee ni se asigna en ningún componente (**GRE-P2-001**).

---

## 13. Bienes, productos e inventario

- Selección de productos: reutiliza `useProductStore`/`ProductModal` del catálogo real de artículos — no hay copia local ni mock.
- Snapshot correcto de campos normativos vs. columnas informativas en vivo (ver sección 12) — diseño correcto.
- Columna "Stock" en `SeccionBienes.tsx` es **puramente informativa**: no valida disponibilidad, no bloquea agregar más cantidad de la que hay en stock, no reserva nada.
- **Emitir una GRE NO mueve stock.** Confirmado en `emitir()` (`FormularioGREPage.tsx:673-702`): no hay ninguna llamada a servicios de inventario/kardex.
- **Guardar un borrador NO mueve stock** (mismo argumento, `guardarBorrador()`).
- **No se genera Nota de Salida desde una GRE, ni viceversa.** Grep de `notaSalida|NotaSalida|kardex|Kardex|movimientoStock|descontarStock` dentro de toda la carpeta `guias-remision` → cero resultados.
- **No existe riesgo de doble descuento** involucrando GRE, porque GRE nunca descuenta bajo ninguna configuración.
- **Configuración fantasma (GRE-P1-008):** existe el campo `stockDescuentoGuiaRemision` en `PreferenciasVentas` (`ContextoConfiguracion.tsx`), editable desde la UI de Configuración → Inventario, con valor por defecto `'automatico'` — pero **ningún archivo de GRE, Comprobantes, Documentos Comerciales o Inventario lee ese valor**. El usuario puede "configurarlo" sin ningún efecto observable.
- **Documentos comerciales → GRE:** completamente aislados hoy. Ningún módulo (`comprobantes-electronicos`, `documentos-comerciales`, `gestion-inventario`) navega a `/guias-remision` ni importa nada del módulo. Factura/Boleta/Nota de Venta/Orden de Venta/Nota de Ingreso tienen un campo de texto libre `camposOpcionales.guiaRemision` que es solo una anotación manual, sin `guiaRemisionId`, sin selector, sin validación cruzada contra guías reales (**GRE-P2-009**).
- La fuente de verdad real del movimiento físico de inventario en el sistema (Kardex Valorizado, Nota de Salida) es completamente ajena a GRE y no se ve afectada por este módulo.

---

## 14. Listado, filtros y borradores

- Todos los filtros declarados (`filtrosGRE.ts`, `DrawerFiltrosGRE.tsx`) operan sobre campos reales del objeto `GuiaRemision` — sin filtros decorativos: estado, tipo, motivo, modalidad, destinatario, serie, rango de peso, rango de fechas, búsqueda libre (serie-correlativo, destinatario, documento).
- "Limpiar filtros" funciona; el conteo de resultados es real (`guiasFiltradas.length` sobre el array ya filtrado).
- Columnas configurables (14 columnas), persistidas por tenant (`gre_listado_columnas_${tenantId}`).
- Paginación real client-side (15 registros/página).
- El tab "Borradores" usa el **mismo componente** que "Listado" con un filtro booleano (`esBorrador`) sobre el mismo array ya cargado — no hay mezcla de datos porque `esBorrador` y `estado` se actualizan atómicamente en la misma operación de emisión; no se detectó ninguna ventana donde una GRE emitida siga apareciendo como borrador.
- Ciclo de borradores reconstruido y verificado end-to-end: crear → `guardarBorrador()` → listar → `getById()` → editar → `guardarBorrador()`/`emitir()` → `eliminarGuia()` (botón real conectado en `TablaGuias.tsx` y `DrawerDetalleGRE.tsx`, gated por `puedeEliminarBorradorGRE`).
- **Hallazgo (GRE-P2-005):** el `delete()`/`save()` del datasource **no valida** `esBorrador`/`estado` — toda la protección "no editar/eliminar una GRE emitida" vive solo en que los componentes ocultan los botones correspondientes. No hay guardia a nivel de dominio/persistencia.
- Multiempresa: los datos llegan pre-filtrados por empresa desde la carga (clave de `localStorage` namespaced por `empresaId`), no hay filtrado client-side sobre un pool global.

---

## 15. Detalle, emisión y estados

**Detalle:** no existe una página de detalle independiente — la ruta `/guias-remision/:id` renderiza el mismo componente de listado (`GuiasRemision.tsx`), que detecta el `id` de la URL y abre el drawer si la guía existe en `state.guias` (ya filtrado por empresa). Si el `id` no existe (o pertenece a otra empresa), **no hay mensaje de error ni redirección** — el usuario queda viendo el listado normal sin ninguna indicación (**GRE-P2-004**). El refresh directo de la URL funciona porque el drawer depende del estado recargado desde `localStorage`, no de estado efímero de navegación.

**Flujo de emisión reconstruido (UI → dominio → persistencia → feedback):**
```
Click "Emitir GRE"
 → setIntentoEmitir(true)
 → validarGREParaEmitir(guia) — si hay errores, return (sin persistir)
 → guiasRemisionDataSource.nextCorrelativo(tenantId, guia.serie)  [B. Guarda localmente]
 → construir EventoGRE de historial
 → { ...guia, esBorrador:false, estado:'Pendiente', correlativo }
 → actualizarGuia()/agregarGuia() → contexto → datasource.save() → localStorage
 → ModalEmisionExitosaGRE (feedback real: número de guía, imprimir, ver detalle, nueva GRE)
```
Es **(B) Guarda localmente como emitida**. No genera estructura electrónica (C), no llama backend (D), no llama SUNAT (E). No debe llamarse "integración SUNAT" — es correcto llamarlo prototipo funcional local.

**Estados** (`estadosGRE.ts`): `Borrador`, `Pendiente` (label "Enviado"), `Emitida`, `Aceptada`, `Observada`, `Rechazada`, `Anulada`. Transiciones realmente implementadas en código (verificado por grep exhaustivo de asignaciones `estado: '...'`):

```
Borrador ──(guardarBorrador)──► Borrador
Borrador ──(emitir)───────────► Pendiente
Pendiente ─(anular)───────────► Anulada
```

`Emitida`, `Aceptada`, `Observada`, `Rechazada` **nunca se asignan en ningún punto del código** — son estados reservados para cuando exista integración real con SUNAT (dependencia de backend, no un defecto). No hay transición de salida de `Pendiente` distinta de `Anulada` — no se puede "corregir" una GRE emitida, solo anularla, lo cual es coherente con la normativa (una GRE emitida no se edita).

Reglas de habilitación (`puedeAnularGRE`/`puedeEditarGRE`/`puedeEliminarBorradorGRE`) verificadas correctamente conectadas en `TablaGuias.tsx` y `DrawerDetalleGRE.tsx` — no hay botones visuales sin lógica real detrás.

---

## 16. Documentos relacionados

Ver también sección 12/13. `SeccionDocumentosRelacionados.tsx` permite declarar documentos relacionados (tipo, número, fecha, RUC emisor si es externo) pero **no** ofrece ningún selector real de comprobantes emitidos por el sistema — es anotación de texto libre en ambos casos (interno/externo), a pesar de que el propio `<select>` de origen sugiere una distinción funcional que no existe en la práctica. El campo del modelo pensado para el enlace real (`documentoInternoId`) está muerto — nunca se lee ni se escribe.

En sentido inverso, Factura/Boleta/Nota de Venta/Orden de Venta/Nota de Ingreso tienen un campo de texto libre "guía de remisión" que tampoco enlaza con el módulo GRE real. **No existe hoy ningún flujo end-to-end donde un documento comercial genere una GRE con datos precargados**, ni donde una GRE se vincule verificablemente a un documento comercial real.

---

## 17. PDF / representación electrónica

**Estado muy superior al documentado en la auditoría de 2026-06-29** — varios hallazgos de esa fecha están cerrados:

| Elemento | Estado 2026-06-29 | Estado actual (2026-08-07) |
|---|---|---|
| Impresión A4 usa diseño centralizado (logo/marca de agua/pie) | ❌ HTML hardcodeado | ✅ **Cerrado** — `imprimirGuiaGRE.ts` usa `ServicioImpresionComprobante`/`ResolverDisenoImpresion` |
| Bug estado crudo en `ModalEmisionExitosaGRE` | 🔴 Bug confirmado | ✅ **Cerrado** — usa `getEstadoGRELabel()` |
| Campos SUNAT de bienes (código, subpartida, GTIN) en impresión | ❌ Ausentes | ✅ **Cerrado** — se imprimen los 3 |
| Indicadores de transporte (transbordo, retorno vacío, retorno envases) en impresión | ❌ Ausentes | ✅ **Cerrado** |
| Ubigeo (destinatario, partida, llegada) en impresión | ❌ Ausente | ✅ **Cerrado** |
| Comprador (motivo 03) / especificación (motivo 13) en impresión | ❌ Ausentes | ✅ **Cerrado** |
| Tab Bienes del drawer sin subpartida/GTIN | 🟡 Parcial | ✅ **Cerrado** |

**Sigue sin existir:**
- Librería de generación de PDF (`jsPDF`/`react-pdf`/`pdf-lib`) — no está en `package.json`; solo `window.print()` vía iframe. Sin botón "Descargar PDF" en ningún punto (**GRE-P2-010**).
- Representación en formato Ticket para GRE — `imprimirGuiaGRE.ts` fija `formato:'A4'` de forma hardcodeada; decisión de negocio pendiente (**GRE-P3-004**).
- Generador XML/UBL — no existe ninguna carpeta/archivo relacionado (dependencia de backend, sección 18/29).
- QR/código de verificación SUNAT — no existe (depende de tener XML/CDR real).

---

## 18. Permisos y seguridad funcional

Permisos existentes: `ventas.gre.ver`, `ventas.gre.emitir`, `config.transporte.gestionar` (`catalogoPermisos.ts:88,95,372`). Rutas correctamente alineadas (`privateRoutes.tsx:159-162,196`) y consistentes con `SideNav.tsx:150-153`.

- **Sin wildcard bypass en GRE/Transporte:** existe un wildcard `'*'` en `UserSessionContext.hasPermission`, pero el guard real de estas rutas (`PermisoGuard` → `tienePermiso`/`utilidades/permisos.ts`) **no contempla** ese wildcard — es estrictamente granular. El wildcard está acotado a 3 pantallas de gestión de usuarios, no interviene aquí.
- **Sin fuga multiempresa:** los tres datasources (`fuenteDatosGRE.ts`, `fuenteDatosTransporte.ts`, `fuenteDatosConexionSunat.ts`) namespacean la clave de `localStorage` por `empresaId` — no hay ningún método que lea un pool global y filtre después.
- **Hallazgo real (GRE-P1-004):** dentro de la página `/guias-remision` (que solo exige `ventas.gre.ver`), las acciones Anular, Eliminar borrador y Duplicar (`TablaGuias.tsx`, `GuiasRemision.tsx`) están condicionadas **únicamente** por el estado del documento (`puedeAnularGRE`, etc.), nunca por `ventas.gre.emitir` ni ningún otro permiso. Con los 3 roles de sistema actuales esto no se explota (Vendedor tiene ambos permisos, Contador no tiene ninguno), pero rompe el modelo granular del catálogo para cualquier rol personalizado que otorgue solo "ver".
- `FormularioGREPage.tsx`, `ConfiguracionTransporte.tsx` y las tablas de conductores/vehículos no usan gating interno de permisos, pero como cada una de esas pantallas está protegida por un único permiso que cubre toda su funcionalidad interna, no hay gap de granularidad ahí (a diferencia del caso anterior).

---

## 19. Multiempresa y establecimientos

Sin hallazgos de fuga. Los tres datasources relevantes namespacean físicamente la clave de `localStorage` con `empresaId` (`facturafacil_guias_remision_v1_${empresaId}`, `facturafacil_conductores_${empresaId}`, `facturafacil_vehiculos_${empresaId}`, `facturafacil_transportista_${empresaId}`, `facturafacil_conexion_sunat_${empresaId}`) — no existe una clave global compartida entre empresas ni un método que lea "todo" sin filtrar.

`ContextoGuiasRemision.tsx` tiene guardas `if (!tenantId) return` en las cuatro operaciones expuestas — sin `tenantId` activo, la operación simplemente no ocurre (fallo silencioso, no una fuga).

Navegar a `/guias-remision/:id` de otra empresa no expone datos: como esa GRE nunca se carga en `state.guias` (namespacing físico), el drawer simplemente no encuentra el registro y no se abre — es un "nunca se cargó", no un "se encontró pero se mostró igual".

El filtrado por establecimiento activo (`activeEstablecimientoId`) se aplica correctamente al calcular `seriesDisponibles` en el formulario.

---

## 20. Persistencia y migraciones

- Persistencia 100% `localStorage`, namespaced por empresa, coherente con el resto del prototipo (Conexión SUNAT, Transporte usan el mismo patrón).
- **Hallazgo (GRE-P2-002):** `fuenteDatosGRE.ts` (`load()`) tiene un `try/catch` que ante un JSON corrupto devuelve `[]` **sin loguear ni reportar el error**. Si esto ocurre y el usuario luego guarda una nueva GRE, `persist()` sobrescribirá la clave con solo `[nuevo, ...[]]`, perdiendo de forma silenciosa cualquier dato que hubiera en el JSON corrupto. Mismo patrón (de menor impacto, solo afecta configuración de columnas) en `columnasGRE.ts`.
- No se detectaron migraciones de esquema para `GuiaRemision` (el modelo ha evolucionado — `pesoTotal` cambió de unidad hace ~40 días según memoria de proyecto — sin un mecanismo de migración de datos antiguos; fuera del alcance verificable de este repositorio sin datos reales de usuario).
- Contratos de datasource (`IGuiasRemisionDataSource`, `IConductoresDataSource`, `IVehiculosDataSource`) están bien definidos con `empresaId` explícito en cada método — buena base para sustituir `localStorage` por una API real sin rehacer el módulo (ver sección 29/30-B).

---

## 21. Código duplicado, legacy y hardcodes

- **Sin código legacy detectado.** Los 6 archivos/componentes referenciados en documentación de hace ~40 días (`configuracionMotivos.ts`, `motorCondicional.ts`, `SelectorParticipante.tsx`, `SelectorBienesGRE.tsx`, `SeccionParticipantes.tsx`, `DetalleGREPage.tsx`) ya no existen y no dejan referencias colgantes en código — fueron reemplazados por una arquitectura más simple (reglas inline en `reglasFlujoGRE.ts`, drawer de detalle en vez de página independiente). Es documentación desactualizada, no deuda técnica real.
- **Sin duplicación de catálogos** fuera de `catalogosGRE.ts` (verificado en todo el repo).
- **Hardcodes menores identificados** (no funcionales, de mantenibilidad):
  - `TIPO_GRE_CODIGO_DOCUMENTO` (constante exportada) no se usa en producción; `FormularioGREPage.tsx:562` reimplementa el mismo mapeo `'09'/'31'` a mano (**GRE-P3-001**).
  - `SeccionPuntosTraslado.tsx` compara motivo `'01'/'02'` como string literal fuera de `reglasFlujoGRE.ts` (**GRE-P2-008**, ya descrito en sección 9).
  - Orden de presentación de modalidades de transporte fijado en código en `SeccionTransporte.tsx` (**GRE-P3-005**).
- **Sin `Date.now()`/`Math.random()` usados como identificador visible** en ningún archivo de GRE o Transporte — solo `crypto.randomUUID()` para IDs internos (uso legítimo).
- **Sin `TODO`/`FIXME`/`mock`/`dummy`** encontrados en los archivos auditados del módulo.

---

## 22. Matriz end-to-end

| Flujo | UI | Validación | Persistencia | Integración | Tests | Resultado |
|---|---|---|---|---|---|---|
| Crear GRE Remitente | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ Funcional |
| Guardar borrador Remitente | ✅ | ⚪ | ✅ | ✅ | ❌ | ✅ Funcional |
| Editar borrador Remitente | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ Funcional |
| Emitir Remitente | ✅ | 🟡 (sin validar cantidad) | ✅ | 🟡 (correlativo desacoplado de Series) | ❌ | 🟡 Parcial |
| Ver detalle Remitente | ✅ | ⚪ | ✅ | ✅ | ❌ | ✅ Funcional |
| GRE Transportista | 🟡 (bug de tipo al editar) | ✅ (valida con `guia.tipo`) | ✅ | ✅ | ❌ | 🟡 Parcial |
| Series | ✅ (T001/V001 reales) | ⚪ | ✅ | 🟡 (desacoplada de `correlativeNumber`) | ❌ | 🟡 Parcial |
| Motivos de traslado | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ Funcional |
| Conductores | ✅ | ✅ | ✅ (CRUD real) | ✅ (misma fuente que GRE) | ❌ | ✅ Funcional |
| Vehículos | ✅ | ✅ | ✅ (CRUD real) | ✅ (misma fuente que GRE) | ❌ | ✅ Funcional |
| Config. transportista | ✅ | 🟡 (MTC/estado sin consumidor) | ✅ | 🟡 | ❌ | 🟡 Parcial |
| Credenciales SUNAT | ✅ | 🟡 (gate solo en UI, no en dominio) | ✅ | 🟡 | ❌ | 🟡 Parcial |
| Productos/bienes | ✅ (catálogo real) | 🟡 (sin cantidad/duplicados) | ✅ (snapshot correcto) | ✅ | ❌ | 🟡 Parcial |
| Integración inventario | ⚪ | ⚪ | ⚪ | ❌ (config fantasma) | ❌ | ❌ No implementado (por diseño) |
| PDF/impresión | ✅ (A4 + diseño centralizado) | ⚪ | ⚪ | ✅ | ❌ | 🟡 Parcial (sin PDF/Ticket/XML) |
| Permisos | ✅ (rutas) | 🟡 (acciones de fila sin gating) | ⚪ | 🟡 | ❌ | 🟡 Parcial |
| Multiempresa | ✅ | ✅ | ✅ (namespaced) | ✅ | ❌ | ✅ Funcional |

---

## 23. Cobertura de pruebas

**Cero tests automatizados para Guías de Remisión y para Configuración de Transporte.** Confirmado por `Glob` de `**/guias-remision/**/*.test.*` y `**/*ransporte*/**/*.test.*` → sin resultados en ambos casos.

Por contraste, el resto del monorepo sí tiene disciplina de testing real: la suite completa (`npm run test -w senciyo`) ejecuta **85 archivos de test / 1697 tests**, todos en verde, cubriendo Inventario/Kardex, Compras, Gastos, Comprobantes, Permisos (`catalogoPermisos.test.ts`, `permisos.test.ts`), Series, etc. La ausencia total de tests específicos de GRE es una brecha de calidad real y contrastante con el estándar del resto del proyecto — flujos críticos como `validarGREParaEmitir`, `nextCorrelativo`, `reglasFlujoGRE`, `aplicarFiltrosGRE`, `puedeAnularGRE`/`puedeEditarGRE`/`puedeEliminarBorradorGRE` no tienen ninguna prueba unitaria (**GRE-P2-011**).

---

## 24. Resultados técnicos

Comandos ejecutados desde `package.json` real del workspace `senciyo` (no inventados):

| Comando | Resultado | Detalle |
|---|---|---|
| `npm run build -w senciyo` (`tsc -b && vite build`) | ✅ **Éxito** | 3744 módulos transformados, build completo en 16.05s, 0 errores de TypeScript |
| `npm run lint -w senciyo` (`eslint .`) | ✅ **Éxito** | 0 errores, 0 warnings |
| `npm run test -w senciyo` (`vitest run`) | ✅ **Éxito** | **85 archivos de test, 1697 tests, 0 fallos**, duración 22.92s. Ninguno de estos tests pertenece a `guias-remision` ni a `configuracion-sistema/components/transporte` (ver sección 23) |

No se ejecutó `typecheck:functions` (Cloudflare Functions) por ser ajeno al alcance de este módulo frontend.

---

## 25. Hallazgos P0

Ninguno. No se encontró pérdida/corrupción de datos activa, fuga multiempresa, emisión incorrecta, movimiento de stock incorrecto, correlativos gravemente inseguros ni funcionalidad principal rota dentro del alcance auditado.

---

## 26. Hallazgos P1

### GRE-P1-001 — Bug de tipo desincronizado al editar un borrador de GRE Transportista

**Severidad:** P1
**Área:** Formulario / GRE Transportista
**Archivo(s):** `guias-remision/paginas/FormularioGREPage.tsx:516,522,562,728,776`
**Evidencia:**
```ts
const tipo: TipoGRE = esTipoValido(tipoParam) ? tipoParam : 'remitente';
// ...
const codigoDocumento = tipo === 'remitente' ? '09' : '31';
```
La ruta `/guias-remision/editar/:id` (`privateRoutes.tsx:161`) no tiene segmento `:tipoParam`, por lo que `tipoParam` es siempre `undefined` en edición.
**Comportamiento actual:** al editar un borrador Transportista, el título, el filtro de series (`seriesDisponibles`) y el filtro de motivos en `SeccionDatosGenerales` se calculan como si fuera Remitente.
**Comportamiento esperado:** estos tres cálculos deben derivarse de `guia.tipo` (el tipo real cargado), no de la URL.
**Impacto:** el usuario puede ver series/motivos incorrectos al editar un borrador Transportista; riesgo de reselección de una serie inválida para ese tipo de documento.
**Causa raíz:** `tipo` se computa antes de que `guia` se cargue vía `getById`, y nunca se recalcula desde `guia.tipo` tras la carga.
**Recomendación:** derivar `codigoDocumento`/filtros/título de `guia.tipo` en todo el componente, reservando `tipoParam` solo para inicializar el `GUIA_REMISION_BORRADOR` en modo creación.
**Bloquea cierre:** Sí (afecta directamente el flujo de edición de GRE Transportista, que es alcance explícito de esta auditoría).

### GRE-P1-002 — Correlativo de GRE desincronizado de la fuente oficial de Series

**Severidad:** P1
**Área:** Series y numeración
**Archivo(s):** `guias-remision/api/fuenteDatosGRE.ts:69-79` vs. `configuracion-sistema/components/series/TarjetaSerie.tsx:151,158,310,339,384-403`
**Evidencia:** `nextCorrelativo()` calcula `max+1` escaneando únicamente las GRE ya persistidas; nunca lee ni actualiza `Series.correlativeNumber`/`statistics.documentsIssued`.
**Comportamiento actual:** Configuración → Series puede mostrar una serie T001/V001 activamente usada por GRE como "Serie sin usar" con correlativo `00000001`, y permitir eliminarla sin advertencia real de uso.
**Comportamiento esperado:** el contador de uso de una serie debe reflejar el uso real, sin importar qué módulo la consuma, o al menos impedir su eliminación si GRE tiene documentos emitidos con ella.
**Impacto:** riesgo de eliminar/reconfigurar una serie en uso, con consecuencias de numeración inconsistente si se reutiliza.
**Causa raíz:** GRE fue implementado con su propio contador local en vez de integrar el servicio/contador de Series ya existente en Configuración.
**Recomendación:** antes de permitir eliminar una serie en `TarjetaSerie.tsx`, consultar también si existen GRE emitidas con esa serie (o, mejor, hacer que `nextCorrelativo` incremente el contador oficial de la serie).
**Bloquea cierre:** Sí.

### GRE-P1-003 — Bloqueo de emisión por credenciales SUNAT solo en la capa de UI, no en el dominio

**Severidad:** P1
**Área:** Credenciales SUNAT / Emisión
**Archivo(s):** `guias-remision/paginas/FormularioGREPage.tsx:544,673-702,936`
**Evidencia:** `emitir()` nunca referencia `puedeEmitirPorConfiguracion`/`credencialesCompletas`; el único gate es `disabled={guardando || !puedeEmitir}` en el botón.
**Comportamiento actual:** si en el futuro cualquier código (atajo, emisión en lote, cambio del atributo `disabled`, test) invoca `emitir()` sin pasar por ese botón específico, la GRE se emite sin ninguna verificación de credenciales SUNAT.
**Comportamiento esperado:** `emitir()` debe rechazar la operación por sí misma si `!puedeEmitirPorConfiguracion`, independientemente de cómo se invoque.
**Impacto:** sin explotación posible hoy (no existe otro camino de UI), pero es una brecha arquitectónica real de "validación de UI sin efecto de dominio" — exactamente el patrón que esta auditoría pidió detectar explícitamente.
**Causa raíz:** el chequeo de configuración se implementó como condición de renderizado del botón, no como precondición de la función de negocio.
**Recomendación:** agregar `if (!puedeEmitirPorConfiguracion) return;` al inicio de `emitir()`.
**Bloquea cierre:** Sí (es un requisito explícito del criterio de cierre: "configuración obligatoria" debe tener efecto real, no solo visual).

### GRE-P1-004 — Acciones Anular / Eliminar borrador / Duplicar sin verificación de permiso

**Severidad:** P1
**Área:** Permisos
**Archivo(s):** `guias-remision/components/lista/TablaGuias.tsx:223-288`, `guias-remision/paginas/GuiasRemision.tsx:95-165`
**Evidencia:** los botones/handlers solo están condicionados por `puedeAnularGRE(guia)`/`puedeEditarGRE(guia)`/`puedeEliminarBorradorGRE(guia)` (estado del documento), nunca por `ventas.gre.emitir` ni ningún otro permiso.
**Comportamiento actual:** cualquier rol con únicamente `ventas.gre.ver` puede anular GRE emitidas y eliminar/duplicar borradores desde la misma página `/guias-remision`.
**Comportamiento esperado:** estas acciones deberían exigir `ventas.gre.emitir` (o un permiso dedicado), igual que crear/editar.
**Impacto:** con los 3 roles de sistema actuales (Administrador, Vendedor, Contador) no se explota, porque Vendedor tiene ambos permisos y Contador ninguno — pero rompe el modelo granular para cualquier rol personalizado futuro que otorgue solo "ver".
**Causa raíz:** el gating de estas acciones se implementó solo a nivel de reglas de negocio del documento, sin considerar permisos de usuario.
**Recomendación:** envolver los tres botones/handlers con la verificación de `ventas.gre.emitir` (o crear `ventas.gre.anular`/`ventas.gre.eliminar` si se quiere granularidad más fina).
**Bloquea cierre:** Sí.

### GRE-P1-005 — Sin validación de cantidad positiva en los bienes al emitir

**Severidad:** P1
**Área:** Formulario / Validación
**Archivo(s):** `guias-remision/logica/validacionGRE.ts:36-38`, `guias-remision/components/forma/SeccionBienes.tsx:464`
**Evidencia:** `validarGREParaEmitir` solo exige `bienes.length > 0`; nunca valida `bien.cantidad`. El input de cantidad acepta valores negativos al escribir directamente (`parseFloat(e.target.value) || 0`, que no convierte `-5` a `0`).
**Comportamiento actual:** una GRE puede emitirse con una línea de bien en cantidad `0` o negativa.
**Comportamiento esperado:** cada línea de bien debe tener `cantidad > 0` para poder emitir — es un requisito normativo básico de un documento de traslado.
**Impacto:** documentos con datos inválidos podrían quedar "emitidos" localmente, y de existir integración SUNAT real, serían rechazados o generarían inconsistencia.
**Causa raíz:** la validación de emisión se enfocó en la presencia de campos, no en la calidad de cada línea de bien.
**Recomendación:** agregar a `validarGREParaEmitir` una verificación de que todo `bien.cantidad > 0`, y bloquear valores negativos directamente en el input.
**Bloquea cierre:** Sí.

### GRE-P1-008 — Configuración "Descuento de stock por Guía de Remisión" sin ningún efecto real

**Severidad:** P1
**Área:** Inventario / Configuración
**Archivo(s):** `configuracion-sistema/contexto/ContextoConfiguracion.tsx` (campo `stockDescuentoGuiaRemision`), sin consumidor en `guias-remision/` ni en `gestion-inventario/`
**Evidencia:** grep del identificador `stockDescuentoGuiaRemision` en todo `apps/senciyo/src` solo devuelve coincidencias dentro del propio módulo de configuración que lo define y edita.
**Comportamiento actual:** el usuario puede configurar esta opción en Configuración → Inventario, dando la impresión de que gobierna algún comportamiento de descuento de stock al emitir una GRE — pero no tiene ningún efecto.
**Comportamiento esperado:** o bien esta opción se conecta a un comportamiento real (si se decide que GRE debe poder afectar stock), o se retira de la UI hasta que exista esa integración.
**Impacto:** confunde al usuario, quien puede asumir que está controlando un comportamiento que en realidad no existe.
**Causa raíz:** campo de configuración adelantado a una integración GRE↔Inventario que nunca se implementó.
**Recomendación:** ocultar temporalmente el control en la UI de Configuración → Inventario, o documentar explícitamente que es una función futura, hasta que se implemente su consumidor.
**Bloquea cierre:** Sí (es "configuración sin efecto", criterio explícito de P1).

---

## 27. Hallazgos P2

### GRE-P2-001 — Documentos relacionados "Interno" sin enlace real a documentos del sistema
**Severidad:** P2 · **Área:** Documentos relacionados · **Archivo(s):** `guias-remision/components/forma/SeccionDocumentosRelacionados.tsx`
**Evidencia:** todos los campos (serie, número, fecha, RUC) son de texto libre incluso cuando `origen === 'INTERNO'`; `documentoInternoId` del modelo nunca se lee/escribe.
**Comportamiento esperado:** un documento "Interno" debería poder seleccionarse de una lista real de comprobantes emitidos, precargando sus datos.
**Impacto:** datos tecleados manualmente, sin garantía de consistencia con el documento real.
**Recomendación:** implementar un selector real contra el datasource de comprobantes/documentos comerciales, o retirar la distinción Interno/Externo si no va a tener efecto.
**Bloquea cierre:** No (mejora funcional de una sección secundaria del formulario).

### GRE-P2-002 — Errores de parseo de localStorage silenciados sin log
**Severidad:** P2 · **Área:** Persistencia · **Archivo(s):** `guias-remision/api/fuenteDatosGRE.ts:26-39`
**Evidencia:** `catch { return []; }` sin ningún log ni reporte.
**Impacto:** un JSON corrupto para una empresa se trata como "sin GRE", y un guardado posterior sobrescribe la clave, perdiendo cualquier dato irrecuperable del JSON corrupto.
**Recomendación:** loguear el error (aunque sea a consola) y evitar sobrescribir la clave corrupta sin antes advertir al usuario.
**Bloquea cierre:** No (requiere una condición externa de corrupción de datos poco frecuente en operación normal).

### GRE-P2-003 — Sin detección de productos duplicados en bienes
**Severidad:** P2 · **Área:** Formulario / Bienes · **Archivo(s):** `guias-remision/components/forma/SeccionBienes.tsx` (`agregarDesdeProducto`, `agregarSeleccionados`)
**Impacto:** se puede agregar el mismo producto varias veces como líneas separadas sin ninguna advertencia.
**Recomendación:** advertir (no necesariamente bloquear) cuando se intenta agregar un producto ya presente en la lista.
**Bloquea cierre:** No.

### GRE-P2-004 — Ruta `/guias-remision/:id` con id inexistente no informa al usuario
**Severidad:** P2 · **Área:** Detalle / Navegación · **Archivo(s):** `guias-remision/paginas/GuiasRemision.tsx:59-66`
**Impacto:** el usuario ve el listado normal sin ninguna indicación de que el registro solicitado no existe o no le pertenece.
**Recomendación:** mostrar un toast/mensaje si `idParam` no se encuentra tras cargar `state.guias`.
**Bloquea cierre:** No.

### GRE-P2-005 — Guardas de estado (no editar/eliminar una GRE emitida) solo en la capa UI
**Severidad:** P2 · **Área:** Arquitectura / Persistencia · **Archivo(s):** `guias-remision/api/fuenteDatosGRE.ts` (`delete`, `save`)
**Impacto:** ningún código futuro que llame directamente al datasource tiene protección contra editar/eliminar una GRE ya emitida.
**Recomendación:** mover la validación de `esBorrador`/`estado` al contexto (`ContextoGuiasRemision.tsx`) o al datasource.
**Bloquea cierre:** No (sin explotación posible hoy).

### GRE-P2-006 — `numeroRegistroMTC` y `estado` del transportista sin consumidor downstream
**Severidad:** P2 · **Área:** Configuración de Transporte · **Archivo(s):** `configuracion-sistema/modelos/Transporte.ts`, `guias-remision/logica/useEstadoConfiguracionGRE.ts`
**Impacto:** el usuario llena y guarda estos campos sin que tengan ningún efecto visible en la emisión o impresión de GRE.
**Recomendación:** mostrar `numeroRegistroMTC` en la representación impresa de GRE Transportista, o documentar que es informativo.
**Bloquea cierre:** No.

### GRE-P2-007 — Regla de partida/llegada por motivo hardcodeada fuera de `reglasFlujoGRE.ts`
**Severidad:** P2 · **Área:** Arquitectura / Motivo de traslado · **Archivo(s):** `guias-remision/components/forma/SeccionPuntosTraslado.tsx:386,479,484`
**Impacto:** una tercera fuente de decisión por motivo (aunque no contradice a `reglasFlujoGRE.ts`) dificulta el mantenimiento futuro si las reglas por motivo cambian.
**Recomendación:** mover esa decisión (qué lado es partida/llegada según motivo) a `ReglaFlujoGRE`.
**Bloquea cierre:** No.

### GRE-P2-008 — Race condition teórica de correlativo en emisión multi-pestaña
**Severidad:** P2 · **Área:** Series y numeración · **Archivo(s):** `guias-remision/api/fuenteDatosGRE.ts:69-79`
**Impacto:** dos emisiones casi simultáneas desde pestañas distintas para la misma serie podrían generar correlativos duplicados.
**Recomendación:** documentado como limitación conocida de un datasource `localStorage` sin backend; se resuelve naturalmente al migrar a un contador atómico en servidor.
**Bloquea cierre:** No (riesgo de baja probabilidad, inherente a la arquitectura de prototipo).

### GRE-P2-009 — Campo de texto libre "guía de remisión" en otros documentos sin enlace real
**Severidad:** P2 · **Área:** Integración cross-módulo · **Archivo(s):** `comprobantes-electronicos/shared/form-core/components/CompactDocumentForm.tsx`, `documentos-comerciales/components/FormularioHeaderComercial.tsx`, `gestion-inventario/components/notas-ingreso/FormularioNotaIngreso.tsx`
**Impacto:** el usuario puede teclear cualquier texto sin relación con una GRE real del sistema, dando una falsa sensación de trazabilidad.
**Recomendación:** si se decide integrar, reemplazar por un selector real contra `guiasRemisionDataSource`; si no está en el alcance actual, es deuda futura (sección 32), no un defecto de GRE en sí.
**Bloquea cierre:** No.

### GRE-P2-010 — Sin "Descargar PDF" en ningún punto de la UI de GRE
**Severidad:** P2 · **Área:** Impresión · **Archivo(s):** `guias-remision/components/modales/ModalEmisionExitosaGRE.tsx`, `guias-remision/components/detalle/DrawerDetalleGRE.tsx`, `guias-remision/components/lista/TablaGuias.tsx`
**Impacto:** el usuario solo puede imprimir vía diálogo del navegador (que sí permite "Guardar como PDF" manualmente); no hay un botón dedicado de descarga.
**Recomendación:** decidir la estrategia (cliente vs. backend) antes de implementar; mientras tanto no bloquea el uso operativo básico.
**Bloquea cierre:** No.

### GRE-P2-011 — Cero tests automatizados para GRE y Configuración de Transporte
**Severidad:** P2 · **Área:** Calidad / Tests · **Archivo(s):** todo `guias-remision/` y `configuracion-sistema/components/transporte/`
**Impacto:** funciones críticas de negocio (`validarGREParaEmitir`, `nextCorrelativo`, `reglasFlujoGRE`, `aplicarFiltrosGRE`, predicados de estado) no tienen ninguna prueba unitaria, a diferencia del estándar del resto del monorepo (1697 tests en otros módulos).
**Recomendación:** priorizar tests unitarios para `validacionGRE.ts`, `reglasFlujoGRE.ts` y `fuenteDatosGRE.nextCorrelativo`.
**Bloquea cierre:** No (no es un defecto funcional, es una brecha de calidad/mantenibilidad).

### GRE-P2-012 — Formulario de Conexión SUNAT podría no resetear estado al cambiar de empresa sin credenciales previas
**Severidad:** P2 · **Área:** Multiempresa / Credenciales · **Archivo(s):** `configuracion-sistema/components/conexion-sunat/FormularioAccesoSOL.tsx:27-46`, `FormularioCredencialesGRE.tsx:27-46`
**Evidencia:** el `useEffect` solo actualiza `form`/`configurado` dentro de `if (conexion?.accesoSOL)`/`if (conexion?.credencialesGRE)`; si la nueva empresa no tiene credenciales, ese bloque no se ejecuta.
**Impacto potencial:** el formulario de Configuración → Conexión SUNAT (no el modal del flujo GRE, que sí tiene fallback correcto) podría mostrar brevemente/persistentemente datos de la empresa anterior.
**Nota:** no verificado en runtime (solo lectura de código) — se reporta como plausible, no confirmado.
**Recomendación:** agregar un `else` explícito que limpie `form`/`configurado` cuando la empresa no tiene credenciales guardadas.
**Bloquea cierre:** No.

---

## 28. Hallazgos P3

### GRE-P3-001 — Constante `TIPO_GRE_CODIGO_DOCUMENTO` sin uso real
**Archivo(s):** `guias-remision/modelos/GuiaRemision.ts:151-154`, `guias-remision/paginas/FormularioGREPage.tsx:562`. Mapeo `'09'/'31'` reimplementado a mano en vez de usar la constante ya exportada. **Bloquea cierre:** No.

### GRE-P3-002 — Placa M1/L guardada como snapshot de texto, no como referencia estable
**Archivo(s):** `guias-remision/modelos/GuiaRemision.ts:60,76` (`placaVehiculoM1L`). Un cambio posterior de placa en Configuración no se refleja en guías ya guardadas con esa placa. Consistente con la simplificación normativa SUNAT para M1/L, pero vale la pena documentarlo. **Bloquea cierre:** No.

### GRE-P3-003 — Ambigüedad visual entre los estados "Emitida" y "Pendiente"
**Archivo(s):** `guias-remision/logica/estadosGRE.ts:26-27`. Mismo color de badge (azul) para ambos estados, heredado de la auditoría de 2026-06-29 y aún no resuelto; de bajo impacto porque `Emitida` nunca se asigna hoy en código. **Bloquea cierre:** No.

### GRE-P3-004 — Sin representación en formato Ticket para GRE
Decisión de negocio pendiente, no un defecto — la GRE tiene demasiados campos normativos para un ticket térmico legible. **Bloquea cierre:** No.

### GRE-P3-005 — Orden de modalidades de transporte fijado en código
**Archivo(s):** `guias-remision/components/forma/SeccionTransporte.tsx:40-44` (`OPCIONES_MODALIDAD`). Decisión de presentación de UI congelada en código, no configurable — impacto cosmético únicamente. **Bloquea cierre:** No.

---

## 29. Dependencias legítimas de backend/SUNAT

Estas NO son defectos de este frontend — son requisitos que necesariamente viven fuera de `apps/senciyo` para una operación real con SUNAT:

| Elemento | Estado | Clasificación |
|---|---|---|
| Generación de XML/UBL para GRE | No existe | ⚪ Backend |
| Firma digital (certificado X.509) | No existe | ⚪ Backend/PKI |
| Cliente API SUNAT/OSE | No existe | ⚪ Backend |
| Recepción y almacenamiento de CDR | No existe | ⚪ Backend |
| Transición real `Pendiente → Aceptada/Rechazada/Observada` | No implementable sin lo anterior | ⚪ Backend |
| Consulta de estado SUNAT | No existe | ⚪ Backend |
| Reintentos / contingencia ante caída de SUNAT | No existe | ⚪ Backend |
| Almacenamiento seguro de credenciales SUNAT (hoy en `localStorage` en texto plano, con disclaimer visible al usuario) | Prototipo sin backend | ⚪ Backend (seguridad de credenciales en servidor) |
| Contador de correlativo con locking atómico multi-sesión | Hoy mitigado parcialmente en una sola pestaña | ⚪ Backend (resuelve GRE-P2-008 de raíz) |

Los contratos de datasource actuales (`IGuiasRemisionDataSource`, `IConductoresDataSource`, `IVehiculosDataSource`) están diseñados de forma que sustituir la implementación `localStorage` por una implementación HTTP no debería requerir cambios en los componentes de UI — es una buena base para la integración backend futura.

---

## 30. Qué falta exactamente para cerrar

1. Corregir **GRE-P1-001**: derivar `codigoDocumento`, filtro de series y filtro de motivos de `guia.tipo` en vez de `tipoParam` durante la edición.
2. Corregir **GRE-P1-002**: conectar (o al menos advertir) el uso real de una serie por GRE antes de permitir su eliminación en Configuración → Series.
3. Corregir **GRE-P1-003**: agregar el chequeo de `puedeEmitirPorConfiguracion` dentro de la función `emitir()`, no solo en el `disabled` del botón.
4. Corregir **GRE-P1-004**: exigir `ventas.gre.emitir` (o un permiso dedicado) para Anular, Eliminar borrador y Duplicar.
5. Corregir **GRE-P1-005**: validar `bien.cantidad > 0` en `validarGREParaEmitir` y bloquear valores negativos en el input.
6. Resolver **GRE-P1-008**: conectar `stockDescuentoGuiaRemision` a un comportamiento real, o retirar el control de la UI hasta que exista esa integración.
7. Agregar al menos pruebas unitarias básicas para `validacionGRE.ts`, `reglasFlujoGRE.ts` y `fuenteDatosGRE.nextCorrelativo` (**GRE-P2-011**) — no bloquea el cierre funcional, pero se recomienda antes de considerar el módulo "production-ready" desde el punto de vista de calidad.

Los hallazgos P2 restantes (GRE-P2-001, 002, 003, 004, 005, 006, 007, 009, 010, 012) y todos los P3 son mejoras recomendadas que no bloquean el cierre del alcance actual.

---

## 31. Elementos ya correctamente implementados

- Separación real Remitente/Transportista mediante `reglasFlujoGRE.ts` como fuente única, consumida coherentemente por validación y UI condicional (verificado en 4 motivos distintos).
- Motivo de traslado: catálogo único, códigos persistidos (nunca labels), reglas condicionales correctamente conectadas.
- Bienes: reutiliza el catálogo real de productos (no una copia ni mock), snapshot correcto de campos normativos independiente del catálogo maestro.
- Configuración de Transporte (conductores/vehículos/datos transportista): CRUD real, **misma fuente de datos consumida por el formulario GRE** (integración real confirmada, no solo visual), validaciones de duplicado, aislamiento multiempresa correcto.
- Catálogos SUNAT: fuente única en `catalogosGRE.ts`, sin duplicación en todo el repo, solo lectura en Configuración (sin riesgo de desincronización porque no son editables).
- Series: diferenciación real T001 (código 09, Remitente) / V001 (código 31, Transportista) desde Configuración → Series.
- Correlativo: secuencial real (no `Date.now()`/`Math.random()`), sin reserva de números por borradores descartados.
- Multiempresa: namespacing físico de `localStorage` por `empresaId` en los tres datasources involucrados — sin fuga confirmada.
- Permisos: rutas y SideNav correctamente alineados; wildcard `'*'` del sistema no interviene en GRE/Transporte.
- Ciclo de borradores completo y funcional de extremo a extremo, todas las acciones conectadas a funciones reales (no UI decorativa).
- Impresión A4 integrada al sistema de diseño centralizado de Comprobantes (logo, marca de agua, pie de página), con todos los campos normativos verificados (código SUNAT, subpartida, GTIN, indicadores de transporte, ubigeo, comprador, especificación) — cierra por completo los hallazgos de impresión de la auditoría de 2026-06-29.
- Bug histórico de estado crudo en `ModalEmisionExitosaGRE` corregido.
- Botón Emitir reactivo en tiempo real ante cambios del formulario.
- Sin código legacy ni componentes huérfanos detectados en el árbol de GRE/Transporte.
- Calidad técnica: build ✅ 0 errores, lint ✅ 0 errores/warnings, 1697/1697 tests del monorepo en verde.

---

## 32. Deuda futura / fuera de alcance

- Envío real a SUNAT (XML/UBL, firma digital, cliente API OSE/SUNAT, CDR, consulta de estado, reintentos/contingencia) — requiere backend y credenciales seguras en servidor.
- Descarga de PDF real (librería cliente o servicio backend) — decisión de arquitectura pendiente, no bloquea el uso operativo actual (impresión vía navegador funciona).
- Representación en formato Ticket para GRE — decisión de negocio pendiente.
- QR/código de verificación SUNAT en la representación impresa — depende de tener XML/CDR real primero.
- Integración GRE↔Inventario/Nota de Salida — hoy inexistente por diseño; si el negocio decide que emitir una GRE deba reservar/descontar stock, es un diseño nuevo a construir, no una corrección de algo roto.
- Generación de GRE con precarga desde Factura/Boleta/Nota de Venta/Orden de Venta, y enlace real del campo "guía de remisión" de esos documentos — hoy son módulos aislados por diseño actual, no hay evidencia de que esté en el alcance de esta fase.
- Migración de `localStorage` a backend real para los datasources de GRE, Transporte y Conexión SUNAT — los contratos actuales están preparados para ello.
- Resolución de fondo de la numeración (GRE-P1-002) mediante un contador atómico único compartido entre Series y GRE, idealmente en backend.

---

## 33. Veredicto final

### ⚠️ APROBADO CON OBSERVACIONES

El módulo de Guías de Remisión es funcionalmente sólido como prototipo frontend: el flujo completo (crear, guardar borrador, editar, emitir, listar, filtrar, ver detalle, anular, duplicar, imprimir) funciona de extremo a extremo con datos reales, reutiliza correctamente el catálogo de productos, el datasource de transporte y el sistema de diseño de impresión del resto del ERP, aísla correctamente por empresa, y pasa build/lint/tests en verde sin errores. No se encontró ningún hallazgo P0.

Sin embargo, existen 6 hallazgos P1 concretos y verificables por código — numeración desincronizada de Series, gate de credenciales solo en la UI, permisos sin efecto en acciones de fila, validación de cantidad ausente, un bug de tipo al editar borradores Transportista, y una opción de configuración de stock sin ningún efecto — que impiden declarar el cierre pleno. Ninguno rompe el flujo principal hoy, pero todos son corregibles con cambios acotados y deberían cerrarse antes de considerar el módulo listo para producción. El envío real a SUNAT y la integración con Inventario son correctamente dependencias fuera del alcance de este frontend, no defectos de la implementación actual.
