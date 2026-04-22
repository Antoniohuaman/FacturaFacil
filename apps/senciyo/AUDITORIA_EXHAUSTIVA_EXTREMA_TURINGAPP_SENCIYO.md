# Auditoria exhaustiva extrema - Estado actual de TuringApp en SenciYo

## 1. Resumen ejecutivo

- Estado general actual: en el codigo fuente inspeccionado no existe ninguna entidad, modulo, provider, ruta, servicio ni UI nombrada como `TuringApp`. Lo implementado hoy es un subsistema casero de `ayuda guiada` basado en tours por selectores DOM.
- Nivel de madurez: prototipo funcional parcial, no un modulo de ayuda/TuringApp consolidado.
- Diagnostico general: existe una implementacion real y operativa para un tour de `primera-venta` en la ruta de emision tradicional, pero la arquitectura global es inconsistente, la evolucion a un ecosistema de ayuda es rigida y una extension importante en cobranza queda tecnicamente desacoplada del overlay visible.
- Conclusion breve sobre consistencia: el estado actual no es consistente ni como `TuringApp` ni como futuro centro de ayuda escalable. Es una base parcial de tours guiados, con valor puntual en una pantalla, pero con fragilidades estructurales claras.

## 2. Inventario de archivos y piezas involucradas

### 2.1 Nucleo global de ayuda guiada

| Archivo | Rol actual | Relacion real |
| --- | --- | --- |
| `src/main.tsx` | Monta `ProveedorAyudaGuiada` | Lo monta globalmente antes de `TenantProvider` |
| `src/shared/tour/index.ts` | Barrel del modulo | Reexporta provider, hook, overlay API y tipos |
| `src/shared/tour/ContextoAyudaGuiada.ts` | Contrato del contexto de ayuda | Solo guarda activacion/completado/omitido, no controla tour activo |
| `src/shared/tour/ProveedorAyudaGuiada.tsx` | Persistencia y estado global de ayuda | Mantiene `ayudaActivada`, completados, omitidos y versiones |
| `src/shared/tour/usarAyudaGuiada.ts` | Hook del contexto | Da acceso al estado persistido |
| `src/shared/tour/tiposTour.ts` | Tipos base | Define `DefinicionTour`, `PasoTour`, `EstadoAyudaGuiada` |
| `src/shared/tour/almacenTour.ts` | LocalStorage | Persiste estado bajo una clave unica |
| `src/shared/tour/motorTour.ts` | Motor imperativo DOM/evento | Dispara eventos globales y resalta elementos por selector |
| `src/shared/tour/usarTour.ts` | Hook runtime del tour | Controla paso activo, avance, omision y escucha eventos globales |
| `src/shared/tour/TourFlotante.tsx` | Overlay visible del tour | Renderiza tooltip flotante y backdrop |
| `src/shared/tour/registroTours.ts` | Registro en memoria | Almacena tours registrados por `id` |

### 2.2 Shell, header y entry points

| Archivo | Rol actual | Relacion real |
| --- | --- | --- |
| `src/layouts/PrivateLayout.tsx` | Shell privado | Instancia `usarTour()` y renderiza `TourFlotante` global |
| `src/layouts/components/Header.tsx` | Header principal vivo del producto | Renderiza icono `HelpCircle`, dropdown de ayuda y disparo manual del tour |
| `src/layouts/components/UserDropdown.tsx` | Dropdown de perfil usado por el header | Contiene otra entrada de `Centro de ayuda`, hoy solo con `alert` placeholder |
| `src/routes/privateRoutes.tsx` | Routing privado | Define la ruta `/comprobantes/emision` donde vive la guia real |

### 2.3 Superficies funcionales cubiertas por tours

| Archivo | Rol actual | Relacion real |
| --- | --- | --- |
| `src/pages/Private/features/comprobantes-electronicos/tour/tourPrimeraVenta.ts` | Definicion del tour registrado `primera-venta` | Registra por side effect el tour global |
| `src/pages/Private/features/comprobantes-electronicos/pages/EmisionTradicional.tsx` | Pantalla real de emision | Autoarranca `primera-venta` y expone targets DOM |
| `src/pages/Private/features/comprobantes-electronicos/shared/form-core/components/CompactDocumentForm.tsx` | Formulario compacto | Marca target `primera-venta-cliente` |
| `src/pages/Private/features/comprobantes-electronicos/shared/form-core/components/ProductsSection.tsx` | Busqueda/lista/totales | Marca targets de productos y totales |
| `src/pages/Private/features/comprobantes-electronicos/shared/modales/CobranzaModal.tsx` | Modal de cobranza | Define un tour propio `cobranza_modal`, pero no lo registra globalmente |

### 2.4 Piezas encontradas pero no conectadas al shell actual

- Existe una rama `contasis/layout/TopBar` y `contasis/layout/UserMenu` con soporte de ayuda, pero no se encontraron imports activos desde el shell actual; no forman parte del flujo vigente inspeccionado.

## 3. Arquitectura actual detectada

### 3.1 Como esta armado hoy

La implementacion actual no modela un producto llamado TuringApp. Modela otra cosa: un sistema minimo de tours guiados con dos capas separadas:

1. Capa persistida de preferencias y estado historico.
2. Capa runtime local del tour activo.

La primera vive en `ProveedorAyudaGuiada` y persiste en localStorage si la ayuda esta activada y que tours quedaron completos u omitidos. La segunda vive en `usarTour`, pero no esta en contexto ni en store compartido; cada componente que llama `usarTour()` crea su propia instancia con su propio `useState`.

### 3.2 Componentes principales y dependencias

- `ProveedorAyudaGuiada` en `src/main.tsx` monta la persistencia global.
- `Header.tsx` usa `usarAyudaGuiada()` para leer/escribir `ayudaActivada` y para reiniciar historial.
- `Header.tsx` dispara manualmente `solicitarInicioTour('primera-venta')` solo cuando la ruta exacta es `/comprobantes/emision`.
- `EmisionTradicional.tsx` importa `tourPrimeraVenta`, lo que ejecuta `registrarTour(tourPrimeraVenta)` por side effect, y ademas autoarranca ese tour si ayuda esta activada y el usuario no lo completo ni omitio.
- `PrivateLayout.tsx` usa `usarTour()` para renderizar `TourFlotante` global.
- `CobranzaModal.tsx` tambien usa `usarTour()`, pero como hook independiente, no como controlador compartido.

### 3.3 Flujo de responsabilidades

#### Estado persistido

- `src/shared/tour/almacenTour.ts` define la clave base `senciyo_ayuda_guiada_v1`.
- `src/shared/tour/ProveedorAyudaGuiada.tsx` guarda `ayudaActivada`, `toursCompletados`, `toursOmitidos`, `versionPorTour`, `fechaUltimaActualizacion`.

#### Estado runtime del tour

- `src/shared/tour/usarTour.ts` resuelve pasos por selector DOM.
- `src/shared/tour/motorTour.ts` desplaza el elemento con `scrollIntoView()` y aplica resaltado via estilos inline.
- `src/shared/tour/TourFlotante.tsx` muestra el paso actual, sin store central y sin bloqueo fuerte de la UI subyacente.

### 3.4 Hallazgo estructural critico

La arquitectura mezcla un contexto compartido para preferencias con un hook local para el tour activo. Eso significa que `usarAyudaGuiada()` si es global, pero `usarTour()` no lo es. Este detalle rompe la idea de un runtime unico del tour y explica por que la extension de cobranza no queda realmente alineada con el overlay global.

## 4. Punto de entrada desde el header

### 4.1 Implementacion actual

El icono de ayuda del header vive en `src/layouts/components/Header.tsx`. Renderiza un `HelpCircle` y controla un dropdown local con `mostrarMenuAyuda`.

Evidencia directa:

- `Header.tsx:28` crea `mostrarMenuAyuda`.
- `Header.tsx:140-150` concentra la logica de `handleVerGuiaPantalla`.
- `Header.tsx:144-145` hardcodea la ruta `/comprobantes/emision` y dispara `solicitarInicioTour('primera-venta')`.
- `Header.tsx:149` muestra `feedback.info('Guias disponibles proximamente', 'Ayuda')` para cualquier otro caso.
- `Header.tsx:447-494` monta inline todo el menu de ayuda.

### 4.2 Comportamiento actual

Hoy el menu de ayuda del header solo expone tres cosas:

1. Toggle `Ayuda guiada`.
2. Accion `Ver guia de esta pantalla`.
3. Accion `Reiniciar ayuda guiada`.

No hay:

- opcion visible llamada `TuringApp`,
- acceso a materiales digitales,
- acceso a videos,
- recursos de ayuda generales,
- listado de guias por pantalla,
- selector dinamico de ayudas disponibles.

### 4.3 Estado real de la opcion relacionada con TuringApp

No existe una opcion llamada TuringApp. Lo mas cercano es `Ayuda guiada` y `Ver guia de esta pantalla`. Si el negocio entiende TuringApp como un contenedor o asistente con identidad propia, eso no esta representado en el codigo actual.

### 4.4 Consistencia con el objetivo futuro del menu de ayuda

La consistencia es baja.

- El menu esta acoplado a handlers inline dentro de `Header.tsx`.
- No existe un modelo de items, categorias o recursos.
- No existe una capa de composicion de `help resources`.
- No existe una abstraccion que permita enchufar materiales, videos, recursos o TuringApp como opciones hermanas.

Adicionalmente, `UserDropdown.tsx` expone otra entrada `Centro de ayuda` que hoy solo dispara un `alert` placeholder en `UserDropdown.tsx:36`. Eso duplica el entry point y mezcla dos nociones distintas de ayuda.

## 5. Flujo funcional actual de TuringApp

## 5.1 Flujo real existente desde el header

Paso a paso:

1. El usuario hace click en el icono de ayuda del header.
2. `Header.tsx` abre el dropdown local controlado por `mostrarMenuAyuda`.
3. Si activa el switch `Ayuda guiada`, `cambiarAyudaActivada(!ayudaActivada)` persiste el nuevo valor.
4. Si pulsa `Ver guia de esta pantalla`:
   - si `ayudaActivada` es `false`, el boton esta deshabilitado;
   - si la ruta exacta es `/comprobantes/emision`, se dispara `solicitarInicioTour('primera-venta')`;
   - en cualquier otra ruta, solo aparece el mensaje `Guias disponibles proximamente`.
5. `solicitarInicioTour()` en `motorTour.ts`:
   - guarda `window.__senciyoTourPendiente = idTour`;
   - despacha un `CustomEvent` global `senciyo:tour`.
6. La instancia de `usarTour()` montada en `PrivateLayout.tsx` escucha ese evento y busca la definicion por `id` en `REGISTRO_TOURS`.
7. Si encuentra la definicion, `resolverPasoDisponible()` busca el primer selector existente en DOM.
8. `TourFlotante` se renderiza sobre el layout global y resalta el target.

## 5.2 Flujo automatico actual en emision tradicional

Existe un autoarranque adicional en `EmisionTradicional.tsx`:

- `EmisionTradicional.tsx:225-238` auto dispara `solicitarInicioTour(tourPrimeraVenta.id)` cuando:
  - el tour aun no se lanzo en esta instancia,
  - `ayudaActivada` es `true`,
  - el tour `primera-venta` no figura como completado ni omitido.

Eso significa que la experiencia puede comenzar sin usar el header. El header no es el unico entry point real del tour actual.

## 5.3 Tour registrado real: `primera-venta`

El unico tour registrado globalmente es `primera-venta`.

Evidencia:

- `tourPrimeraVenta.ts:5` define `id: "primera-venta"`.
- `tourPrimeraVenta.ts:53` ejecuta `registrarTour(tourPrimeraVenta)`.

Sus targets reales hoy son:

- `EmisionTradicional.tsx:1497` -> `data-tour="primera-venta-caja"`
- `CompactDocumentForm.tsx:803` -> `data-tour="primera-venta-cliente"`
- `ProductsSection.tsx:1675` -> `data-tour="primera-venta-productos-buscar"`
- `ProductsSection.tsx:1688` -> `data-tour="primera-venta-productos-lista"`
- `ProductsSection.tsx:1779` -> `data-tour="primera-venta-totales"`
- `EmisionTradicional.tsx:1597` -> `data-tour="primera-venta-emitir"`

Cobertura real hoy: una sola pantalla principal de emision tradicional.

## 5.4 Como avanza, se cierra y se persiste

### Avance

- `usarTour.ts` usa `resolverPasoDisponible()` para buscar el siguiente selector existente.
- Si no encuentra siguiente paso, marca el tour como completado.

### Retroceso

- Usa el mismo resolvedor hacia atras.

### Salto

- `Saltar` no salta semanticamente el paso y lo deja pendiente; simplemente busca el siguiente target.
- Si ya no hay siguiente paso, marca el tour como completado.

### Cierre

- El boton `X` del overlay llama `onOmitir`.
- La tecla `Escape` tambien llama `onOmitir`.
- `onOmitir` termina marcando el tour como omitido.

Esto significa que cerrar no es neutral: cerrar equivale a omitir.

### Persistencia

- `almacenTour.ts:3` usa la clave `senciyo_ayuda_guiada_v1`.
- `ProveedorAyudaGuiada.tsx:22-68` mantiene el estado persistido.
- Se guarda automaticamente en localStorage desde `ProveedorAyudaGuiada.tsx:25`.

Se persiste:

- `ayudaActivada`
- `toursCompletados`
- `toursOmitidos`
- `versionPorTour`
- `fechaUltimaActualizacion`

No se persiste:

- paso actual,
- ultima pantalla guiada,
- contexto de ruta,
- progreso parcial por tour,
- identidad efectiva por usuario o tenant.

## 5.5 Dependencias y condiciones del flujo

- Depende de `window` y `document`.
- Depende de selectores CSS estables.
- Depende de que el archivo del tour haya sido importado y registrado.
- Depende del orden de montaje de componentes que usan `usarTour()`.
- Depende del pathname exacto `/comprobantes/emision` para el disparo manual desde header.

## 5.6 Flujo del modal de cobranza

El modal define otro tour real: `TOUR_COBRANZA_MODAL`.

Evidencia:

- `CobranzaModal.tsx:40-69` define el tour `cobranza_modal`.
- `CobranzaModal.tsx:1270`, `1339`, `1570`, `1595` marcan targets `data-tour`.

Pero su comportamiento no sigue el mismo pipeline que `primera-venta`:

- no se registra en `registroTours`;
- no se dispara por `solicitarInicioTour()`;
- `CobranzaModal.tsx:271` llama `usarTour()` localmente;
- `CobranzaModal.tsx:1148` llama `iniciarTour(TOUR_COBRANZA_MODAL)` directamente.

Como `usarTour()` no es compartido por contexto, ese inicio ocurre en la instancia local del modal, no en la instancia global que renderiza `TourFlotante` desde `PrivateLayout.tsx`.

Diagnostico directo: el tour de cobranza esta definido, sus selectores existen, pero su controlador esta desacoplado del overlay visible global.

## 6. Evaluacion de consistencia

### 6.1 Consistencia conceptual

La consistencia conceptual es baja.

- El negocio habla de TuringApp.
- El codigo habla de `ayuda guiada`, `tour`, `guia de esta pantalla`.
- No existe un objeto conceptual que conecte `Ayuda`, `Centro de ayuda`, `TuringApp` y `recursos` dentro de un mismo modelo.

Resultado: la intencion de negocio y el lenguaje del codigo no estan alineados.

### 6.2 Consistencia funcional

Es inconsistente.

- `primera-venta` usa registro global + evento global + overlay global.
- `cobranza_modal` usa definicion local + hook local + sin registro.
- el header solo sabe lanzar un tour y una sola ruta.
- el autoarranque de emision respeta estado completado/omitido;
- el disparo manual del header no lo respeta y relanza igual.

No hay un contrato funcional uniforme para todos los tours.

### 6.3 Consistencia tecnica

Es fragil.

- El estado persistido si esta centralizado.
- El estado runtime del tour activo no esta centralizado.
- El sistema mezcla event bus global, variable global `window.__senciyoTourPendiente`, registro en memoria y hooks locales.
- La persistencia anticipa identidad por tenant/usuario, pero nunca la usa.

### 6.4 Consistencia visual y UX

Es parcial.

- El icono `HelpCircle` comunica ayuda generica, no una opcion llamada TuringApp.
- El menu no explica que es la ayuda guiada ni que cubre.
- El overlay es visualmente entendible, pero el backdrop usa `pointer-events-none`, asi que no hay bloqueo real del contexto subyacente.
- El boton `X` y `Escape` equivalen a omitir el tour, lo que puede ser sorprendente para el usuario.
- Existe otra entrada `Centro de ayuda` en el dropdown de perfil que no hace lo mismo.

### 6.5 Consistencia para escalabilidad futura

Es baja.

- No hay modelo de recursos de ayuda.
- No hay registro por pantalla o catalogo de ayudas.
- No hay composicion de menu por items configurables.
- No hay separacion entre `contenedor de ayuda` y `guia guiada`.
- No hay lugar tecnico claro para materiales, videos o TuringApp como opcion independiente.

## 7. Problemas detectados

### Problema 1 - Runtime del tour no compartido entre componentes

- Descripcion: `usarTour()` es un hook con `useState` local, no un contexto ni store compartido. Cada llamada crea una instancia distinta del runtime del tour.
- Evidencia en codigo:
  - `src/shared/tour/usarTour.ts:40` crea `const [estado, setEstado] = useState<EstadoTourActivo | null>(null)`.
  - `src/layouts/PrivateLayout.tsx:113` usa una instancia de `usarTour()` para renderizar `TourFlotante`.
  - `src/pages/Private/features/comprobantes-electronicos/shared/modales/CobranzaModal.tsx:271` usa otra instancia distinta.
- Impacto: rompe la nocion de un controlador unico del tour y deja comportamientos desalineados entre quien dispara el tour y quien lo pinta.
- Severidad: critica.

### Problema 2 - El tour de cobranza esta desacoplado del overlay global visible

- Descripcion: `CobranzaModal` inicia `TOUR_COBRANZA_MODAL` en su propia instancia local de `usarTour()`, pero el overlay visible se pinta en `PrivateLayout` con otra instancia.
- Evidencia en codigo:
  - `CobranzaModal.tsx:271` -> `const { tourActivo, iniciarTour, cerrarTour } = usarTour();`
  - `CobranzaModal.tsx:1148` -> `iniciarTour(TOUR_COBRANZA_MODAL);`
  - `PrivateLayout.tsx:102-116` es el unico lugar donde se renderiza `TourFlotante`.
- Impacto: la extension de cobranza no tiene una base fiable para mostrarse al usuario; queda en estado de implementacion incompleta o desconectada.
- Severidad: critica.

### Problema 3 - Persistencia global no aislada por tenant ni usuario

- Descripcion: el almacen define identidad opcional por tenant/usuario, pero nunca la usa. Todo se guarda bajo una sola clave base por navegador.
- Evidencia en codigo:
  - `almacenTour.ts:3` -> `const CLAVE_BASE = "senciyo_ayuda_guiada_v1"`.
  - `almacenTour.ts:10` define `construirClaveAlmacen(identidad?)`.
  - `almacenTour.ts:73` y `93` llaman `construirClaveAlmacen()` sin argumentos.
  - `main.tsx:92-93` monta `ProveedorAyudaGuiada` antes de `TenantProvider`, por lo que ni siquiera tiene acceso a contexto tenant en ese punto.
- Impacto: el historial de ayuda puede contaminarse entre empresas, usuarios o sesiones de trabajo distintas en el mismo navegador.
- Severidad: alta.

### Problema 4 - El header solo resuelve una ruta y un tour hardcodeado

- Descripcion: `Ver guia de esta pantalla` no consulta un registro por pantalla; solo compara pathname exacto y dispara `primera-venta`.
- Evidencia en codigo:
  - `Header.tsx:144` -> `if (location.pathname === '/comprobantes/emision')`.
  - `Header.tsx:145` -> `solicitarInicioTour('primera-venta');`
  - `Header.tsx:149` -> para cualquier otro caso muestra `Guias disponibles proximamente`.
- Impacto: no existe un sistema real de ayuda por pantalla; existe una excepcion hardcodeada.
- Severidad: alta.

### Problema 5 - No existe TuringApp como entidad implementada

- Descripcion: el producto puede nombrar esta capacidad como TuringApp, pero el codigo no expresa esa entidad ni en naming ni en UI ni en arquitectura.
- Evidencia en codigo:
  - no se encontraron coincidencias `TuringApp`, `turingapp` o `Turing App` en `apps/senciyo/src/**`.
  - el menu del header usa `Ayuda`, `Ayuda guiada` y `Ver guia de esta pantalla`.
- Impacto: deuda conceptual inmediata. Otro desarrollador no encontrara un modulo TuringApp, sino un sistema de tours casero. La evolucion de producto queda semanticamente desenfocada.
- Severidad: alta.

### Problema 6 - Duplicidad e incoherencia de entry points de ayuda

- Descripcion: el shell tiene un dropdown de ayuda real en el header y otra entrada `Centro de ayuda` en el dropdown de usuario que hoy es solo un placeholder con `alert`.
- Evidencia en codigo:
  - `Header.tsx:427-494` implementa el menu real de ayuda.
  - `UserDropdown.tsx:127` muestra `Centro de ayuda`.
  - `UserDropdown.tsx:36` solo lanza `alert('Redirigiendo a Centro de Ayuda...')`.
- Impacto: experiencia inconsistente, mensaje ambiguo para el usuario y riesgo de duplicar implementaciones de ayuda por caminos distintos.
- Severidad: alta.

### Problema 7 - Registro de tours mezclado y poco explicito

- Descripcion: `primera-venta` se registra por side effect al importar el archivo, mientras que `cobranza_modal` ni siquiera se registra. No hay un bootstrap central de tours.
- Evidencia en codigo:
  - `tourPrimeraVenta.ts:53` -> `registrarTour(tourPrimeraVenta)`.
  - `EmisionTradicional.tsx:92` importa `tourPrimeraVenta`, activando implicitamente ese side effect.
  - `CobranzaModal.tsx:40-69` define `TOUR_COBRANZA_MODAL`, pero no llama `registrarTour`.
- Impacto: el alta de tours depende de imports y patrones dispares; esto dificulta mantenimiento y descubrimiento del sistema.
- Severidad: media-alta.

### Problema 8 - Los pasos faltantes se omiten silenciosamente

- Descripcion: el motor recorre pasos hasta encontrar un selector disponible y salta los que no existan sin feedback, log ni diagnostico.
- Evidencia en codigo:
  - `usarTour.ts:21-33` define `resolverPasoDisponible()`.
  - `usarTour.ts:27` entra en un `while` sobre pasos.
  - `usarTour.ts:29` prueba `buscarElementoPaso(paso.selector)`.
  - `usarTour.ts:33` incrementa indice y sigue.
- Impacto: la cobertura real del tour puede degradarse sin señal clara; una pantalla puede parecer soportada aunque varios pasos ya no existan.
- Severidad: media.

### Problema 9 - Cerrar equivale a omitir definitivamente

- Descripcion: cerrar con `X` o con `Escape` no solo oculta el overlay; marca el tour como omitido para esa version.
- Evidencia en codigo:
  - `TourFlotante.tsx:143` el boton `X` llama `onClick={onOmitir}`.
  - `TourFlotante.tsx:105-110` la tecla `Escape` dispara `onOmitir()`.
  - `usarTour.ts:121-123` `omitir` llama `marcarTourOmitido(...)`.
- Impacto: UX engañosa. Un cierre rapido o accidental cambia persistencia funcional, no solo estado visual.
- Severidad: media.

### Problema 10 - Overlay no bloquea la UI ni maneja foco

- Descripcion: el backdrop es visual, pero no bloquea interaccion subyacente y no hay focus trap ni gestion de accesibilidad avanzada.
- Evidencia en codigo:
  - `TourFlotante.tsx:133` usa `pointer-events-none` en el backdrop.
  - `TourFlotante.tsx:139` solo declara `role="dialog"` y `aria-label`, sin foco inicial ni atrapado.
- Impacto: la experiencia puede sentirse inestable; el usuario puede interactuar con elementos ajenos mientras el tour pretende guiarlo.
- Severidad: media.

### Problema 11 - Estilo del resaltado acoplado y hardcodeado

- Descripcion: el motor modifica inline `outline`, `boxShadow` y `borderRadius` del target con un violeta fijo.
- Evidencia en codigo:
  - `motorTour.ts:53` -> `outline = "2px solid #7c3aed"`
  - `motorTour.ts:54` -> `boxShadow = "0 0 0 4px rgba(124, 58, 237, 0.2)"`
  - `motorTour.ts:49-51` almacena estilos previos en `dataset`.
- Impacto: acoplamiento visual, posible choque con componentes, temas o futuros estilos del producto.
- Severidad: media.

### Problema 12 - No hay pruebas ni telemetria dedicadas del sistema de ayuda

- Descripcion: no se encontraron pruebas especificas del subsistema de ayuda/tours ni eventos analiticos propios para medir arranque, abandono o completitud de las guias.
- Evidencia en codigo:
  - no se encontraron archivos de test vinculados a `ProveedorAyudaGuiada`, `usarTour`, `TourFlotante` o `solicitarInicioTour`.
  - no se encontraron referencias del sistema de ayuda en `src/shared/analitica/**`.
- Impacto: baja observabilidad y baja seguridad para evolucionarlo sin regresiones.
- Severidad: media.

## 8. Huecos y faltantes

- Falta una entidad clara de producto para TuringApp. Hoy no existe ni como nombre ni como modulo.
- Falta una arquitectura de `help hub` o `resource hub` que agrupe guias, materiales, videos y recursos.
- Falta un registro por pantalla o por feature para resolver ayudas desde el header sin hardcodes.
- Falta un runtime compartido del tour activo.
- Falta aislamiento real por tenant/usuario en persistencia.
- Falta soporte multi-ruta o multi-contexto desde el header.
- Falta un mecanismo explicito para relanzar o listar tours disponibles por contexto.
- Falta tratamiento de errores o diagnostico cuando un selector desaparece.
- Falta coherencia entre `Ayuda`, `Centro de ayuda` y la futura identidad TuringApp.
- Falta cobertura de pruebas y observabilidad.

## 9. Riesgos tecnicos y de producto

- Riesgo de construir un futuro `menu de ayuda` encima de un header rigido, con items inline y handlers hardcodeados.
- Riesgo de contaminar estado de ayuda entre usuarios/empresas que compartan navegador.
- Riesgo de que el equipo asuma que cobranza ya esta guiada cuando su implementacion esta desconectada del overlay visible.
- Riesgo de naming debt: el negocio puede hablar de TuringApp mientras el codigo siga hablando de `ayuda guiada`, dificultando continuidad.
- Riesgo de regresiones silenciosas: si cambia un selector, el tour simplemente saltara pasos.
- Riesgo UX por entry points duplicados: el usuario puede no entender si debe ir al icono de ayuda o al `Centro de ayuda` del perfil.
- Riesgo de conflicto entre tours: el header solo piensa en `primera-venta`, incluso si el usuario esta dentro de un modal que necesita otra ayuda contextual.

## 10. Que esta bien resuelto hoy

- Existe una implementacion real, no simulada, del tour `primera-venta` con targets DOM concretos en la pantalla de emision tradicional.
- El sistema ya maneja versionado por tour via `versionPorTour`.
- El proveedor normaliza bien el estado persistido y resiste JSON invalido con fallback a estado vacio.
- Hay accion de reinicio global de ayuda y toggle persistente de activacion.
- Los archivos inspeccionados no muestran errores estaticos activos en el editor (`Header.tsx`, `PrivateLayout.tsx`, `UserDropdown.tsx`, `EmisionTradicional.tsx`, `CobranzaModal.tsx`, `tourPrimeraVenta.ts`).

## 11. Conclusion final

El estado actual real no es el de una funcionalidad TuringApp consolidada. Lo que existe hoy es un subsistema parcial de ayuda guiada, centrado casi por completo en la experiencia de `primera-venta` dentro de emision tradicional, con una extension en cobranza que en codigo queda tecnicamente desacoplada del overlay global.

Como base de entendibilidad, el codigo se deja seguir, pero transmite dos modelos a la vez: un estado global persistido y un runtime local no compartido. Esa mezcla reduce mantenibilidad y vuelve ambigua la responsabilidad de cada pieza. Para otro desarrollador, la intencion de negocio no queda clara: encontrara `ayuda guiada`, `tour`, `centro de ayuda`, un placeholder con `alert`, y cero referencias a TuringApp.

Como base para evolucionar hacia un ecosistema de ayuda con materiales, videos, recursos y acceso a TuringApp, el estado actual no esta preparado. Puede servir como prototipo local de una guia contextual puntual, pero no como fundamento solido de un centro de ayuda empresarial escalable sin correcciones estructurales previas.

## 12. Anexo tecnico

### 12.1 Rutas y entry points

- Ruta real auditada: `/comprobantes/emision` en `src/routes/privateRoutes.tsx:67`.
- Entry point del header: `src/layouts/components/Header.tsx:427-494`.
- Disparo manual del tour: `Header.tsx:145`.
- Autoarranque en pantalla: `EmisionTradicional.tsx:225-238`.

### 12.2 Claves, eventos y globals

- LocalStorage: `senciyo_ayuda_guiada_v1` en `src/shared/tour/almacenTour.ts:3`.
- Evento global: `senciyo:tour` en `src/shared/tour/motorTour.ts:3`.
- Global temporal: `window.__senciyoTourPendiente` en `src/shared/tour/motorTour.ts:7` y `usarTour.ts:138-144`.

### 12.3 Hooks, providers y controladores

- Provider persistido: `ProveedorAyudaGuiada` en `src/shared/tour/ProveedorAyudaGuiada.tsx:21-97`.
- Hook de preferencias: `usarAyudaGuiada` en `src/shared/tour/usarAyudaGuiada.ts`.
- Hook runtime local: `usarTour` / `useTourGuiado` en `src/shared/tour/usarTour.ts`.
- Overlay visible: `TourFlotante` en `src/shared/tour/TourFlotante.tsx`.

### 12.4 Tours y targets encontrados

#### Tour registrado globalmente

- Tour: `primera-venta`
- Archivo: `src/pages/Private/features/comprobantes-electronicos/tour/tourPrimeraVenta.ts`
- Registro: `tourPrimeraVenta.ts:53`
- Targets:
  - `primera-venta-caja`
  - `primera-venta-cliente`
  - `primera-venta-productos-buscar`
  - `primera-venta-productos-lista`
  - `primera-venta-totales`
  - `primera-venta-emitir`

#### Tour local no registrado globalmente

- Tour: `cobranza_modal`
- Archivo: `src/pages/Private/features/comprobantes-electronicos/shared/modales/CobranzaModal.tsx`
- Targets:
  - `cobranza-medios`
  - `cobranza-monto`
  - `cobranza-totales`
  - `cobranza-cobrar`

### 12.5 Fragmentos relevantes

#### Provider montado antes de tenant

```tsx
<ThemeProvider>
  <FeedbackProvider>
    <ProveedorAyudaGuiada>
      <TenantProvider>
        <App />
      </TenantProvider>
    </ProveedorAyudaGuiada>
  </FeedbackProvider>
</ThemeProvider>
```

Lectura: el provider de ayuda no recibe contexto tenant/usuario en su montaje actual.

#### Header hardcodeado a una sola pantalla

```tsx
const handleVerGuiaPantalla = () => {
  if (!ayudaActivada) return;
  if (location.pathname === '/comprobantes/emision') {
    solicitarInicioTour('primera-venta');
    return;
  }
  feedback.info('Guias disponibles proximamente', 'Ayuda');
};
```

Lectura: no hay resolucion dinamica de ayuda por pantalla.

#### Cobranza con instancia local de tour

```tsx
const { tourActivo, iniciarTour, cerrarTour } = usarTour();

// ...

if (elementosListos) {
  iniciarTour(TOUR_COBRANZA_MODAL);
}
```

Lectura: este inicio se hace sobre la instancia local del modal, no sobre la instancia global que renderiza `TourFlotante`.

#### Overlay con cierre que omite y backdrop no bloqueante

```tsx
<div className="fixed inset-0 bg-slate-900/10 pointer-events-none z-[70]" />

<button type="button" onClick={onOmitir}>×</button>
```

Lectura: el cierre no es neutral y el backdrop no inmoviliza la UI subyacente.

### 12.6 Observaciones finas

- `reiniciarAyudaGuiada()` vuelve a dejar `ayudaActivada: true`; no solo limpia historial.
- El sistema no usa ninguna libreria externa tipo `react-joyride`, `shepherd` o `driver.js`; el motor es completamente casero.
- El menu de ayuda del header no es un `popover` reutilizable ni un modulo propio; esta escrito inline dentro del header.
- La existencia de `Centro de ayuda` en el dropdown de usuario sugiere que la taxonomia de ayuda todavia no esta cerrada.