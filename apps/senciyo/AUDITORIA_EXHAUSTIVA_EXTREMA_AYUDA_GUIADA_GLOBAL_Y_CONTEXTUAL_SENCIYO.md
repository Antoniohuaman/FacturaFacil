# Auditoria exhaustiva extrema - Estado actual de ayuda guiada global y contextual en SenciYo

## 1. Resumen ejecutivo

- Estado actual general: SenciYo si tiene un subsistema real de ayuda guiada, pero hoy no implementa todavia el patron de producto esperado de control global en header + acceso visible contextual por modulo. Lo que existe es una combinacion de preferencia global persistida, disparo manual desde el header para una sola pantalla, autoarranque en superficies puntuales y ayudas locales sueltas no conectadas al mismo sistema.
- Nivel de madurez: implementacion parcial funcional, centrada sobre todo en `comprobantes/emision` y en un caso especial dentro de `CobranzaModal`, no un patron consolidado y reusable para todos los modulos.
- Conclusion breve: el header controla una preferencia global real y algunos call sites la respetan, pero no existe hoy una visibilidad contextual por modulo bien modelada ni una sola fuente de verdad que gobierne de extremo a extremo el sistema.
- Coherencia general: media-baja. La idea de negocio es entendible, pero el codigo actual esta a medio camino entre un tour puntual de una pantalla, un popup de ayuda en header y varias ayudas locales independientes que no pertenecen al mismo flujo.

## 2. Inventario de piezas involucradas

### 2.1 Nucleo de ayuda guiada

| Archivo | Rol actual | Observacion |
| --- | --- | --- |
| `src/main.tsx` | Monta `ProveedorAyudaGuiada` | Lo monta globalmente antes de `TenantProvider` (`main.tsx:92-96`) |
| `src/shared/tour/ContextoAyudaGuiada.ts` | Contrato del contexto | Solo modela preferencia global e historial, no el tour activo |
| `src/shared/tour/ProveedorAyudaGuiada.tsx` | Estado global persistido | Gestiona `ayudaActivada`, tours completados, omitidos y versionado |
| `src/shared/tour/usarAyudaGuiada.ts` | Hook de acceso al contexto | Fuente de lectura/escritura del estado global |
| `src/shared/tour/almacenTour.ts` | Persistencia en localStorage | Usa una clave unica base `senciyo_ayuda_guiada_v1` |
| `src/shared/tour/motorTour.ts` | Event bus y utilidades DOM | Dispara `senciyo:tour`, busca selectores, hace scroll y resalta |
| `src/shared/tour/usarTour.ts` | Runtime del tour activo | Mantiene estado local del tour, escucha el evento global y avanza pasos |
| `src/shared/tour/registroTours.ts` | Registro en memoria | Solo registra tours globales por `id` |
| `src/shared/tour/TourFlotante.tsx` | Overlay visual del tour | Renderiza tooltip, navegacion del tour y ayuda enriquecida |
| `src/shared/tour/index.ts` | Barrel del modulo | Reexporta provider, hooks, overlay, registro y utilidades |

### 2.2 Shell, header y entry points visibles

| Archivo | Rol actual | Observacion |
| --- | --- | --- |
| `src/layouts/components/Header.tsx` | Punto de control visible principal | Contiene icono de ayuda, switch global y boton `Ver guia de esta pantalla` |
| `src/layouts/PrivateLayout.tsx` | Shell privado | Monta el `Header` y el overlay global del tour |
| `src/layouts/components/UserDropdown.tsx` | Menu de usuario activo | Tiene otra entrada `Centro de ayuda`, hoy solo placeholder con `alert` |
| `src/contasis/layout/UserMenu/UserMenu.tsx` | Artefacto paralelo legacy | Tiene otra entrada `Centro de ayuda`, pero no forma parte del shell activo |

### 2.3 Pantallas y tours con implementacion real

| Archivo | Rol actual | Observacion |
| --- | --- | --- |
| `src/routes/privateRoutes.tsx` | Routing privado | Declara `/comprobantes/emision` (`privateRoutes.tsx:67`) y `/cobranzas` (`privateRoutes.tsx:86`) |
| `src/pages/Private/features/comprobantes-electronicos/tour/tourPrimeraVenta.ts` | Tour global registrado | Es el unico tour que hoy entra al registro global (`tourPrimeraVenta.ts:96`) |
| `src/pages/Private/features/comprobantes-electronicos/pages/EmisionTradicional.tsx` | Pantalla con tour real | Importa `tourPrimeraVenta`, usa `usarAyudaGuiada` y autoarranca el tour |
| `src/pages/Private/features/comprobantes-electronicos/shared/form-core/components/CompactDocumentForm.tsx` | Targets del tour | Marca `data-tour="primera-venta-cliente"` |
| `src/pages/Private/features/comprobantes-electronicos/shared/form-core/components/ProductsSection.tsx` | Targets del tour | Marca `data-tour` de buscador, lista y totales |
| `src/pages/Private/features/comprobantes-electronicos/shared/modales/CobranzaModal.tsx` | Caso especial contextual | Define un tour local y renderiza un `TourFlotante` propio dentro del modal |

### 2.4 Ayudas locales no integradas al sistema de tours

| Archivo | Tipo de ayuda | Observacion |
| --- | --- | --- |
| `src/pages/Private/features/gestion-clientes/pages/ImportarClientesPage.tsx` | Tooltips y panel lateral `Ayuda` | No usa `usarAyudaGuiada`; no depende del switch global |
| `src/pages/Private/features/catalogo-articulos/components/product-modal/ProductBasicsSection.tsx` | Tooltips sobre campos | No usa `usarAyudaGuiada`; no pertenece al sistema de tours |

## 3. Como esta construido hoy

### 3.1 Arquitectura actual detectada

El sistema actual esta partido en tres capas distintas:

1. Capa global persistida.
   `ProveedorAyudaGuiada` guarda `ayudaActivada`, tours completados, tours omitidos y `versionPorTour` (`ProveedorAyudaGuiada.tsx:28-95`).

2. Capa runtime del tour activo.
   `usarTour.ts` mantiene `const [estado, setEstado] = useState<EstadoTourActivo | null>(null)` (`usarTour.ts:40`). Ese estado no vive en contexto global; vive dentro de cada llamada al hook.

3. Capa visual.
   `TourFlotante.tsx` muestra el paso actual, el resaltado contextual y la ayuda enriquecida con lectura/video (`TourFlotante.tsx:148-422`).

### 3.2 Fuente de verdad real

Hoy no hay una unica fuente de verdad del sistema completo.

- Para preferencia global e historial, la fuente de verdad es `ProveedorAyudaGuiada`.
- Para el tour activo en pantalla, la fuente de verdad es cada instancia local de `usarTour()`.
- Para el disparo manual, el header usa `solicitarInicioTour()` con un evento global (`motorTour.ts:15-24`).
- Para el caso de cobranza, el modal evita el bus global y usa `iniciarTour(TOUR_COBRANZA_MODAL)` en su propia instancia local (`CobranzaModal.tsx:1183-1191`).

Concluson tecnica: existe una fuente de verdad global para la preferencia, pero no para el runtime activo del tour.

### 3.3 Flujo real actual

#### Flujo A - Desde el header a la pantalla de emision

1. El usuario abre el menu de ayuda del header en `Header.tsx`.
2. Si `ayudaActivada` es `true`, puede pulsar `Ver guia de esta pantalla` (`Header.tsx:472-479`).
3. `handleVerGuiaPantalla()` solo contempla la ruta exacta `/comprobantes/emision` (`Header.tsx:140-150`).
4. Si la ruta coincide, ejecuta `solicitarInicioTour('primera-venta')` (`Header.tsx:145`).
5. `motorTour.ts` guarda `window.__senciyoTourPendiente` y lanza el evento `senciyo:tour` (`motorTour.ts:3-24`).
6. La instancia de `usarTour()` montada en `PrivateLayout.tsx` escucha ese evento y llama `iniciarTour(definicion)` si el tour esta registrado (`usarTour.ts:138-163`).
7. `TourGlobalOverlays()` en `PrivateLayout.tsx` renderiza `TourFlotante` con esa instancia (`PrivateLayout.tsx:102-124`).

#### Flujo B - Autoarranque en emision tradicional

1. `EmisionTradicional.tsx` importa `tourPrimeraVenta` (`EmisionTradicional.tsx:91-92`).
2. Ese import registra el tour por side effect porque `tourPrimeraVenta.ts` ejecuta `registrarTour(tourPrimeraVenta)` (`tourPrimeraVenta.ts:96`).
3. Un `useEffect` en `EmisionTradicional.tsx` revisa `ayudaActivada`, `estaTourCompletado` y `estaTourOmitido` (`EmisionTradicional.tsx:228-239`).
4. Si la ayuda esta activa y el tour no fue completado ni omitido, dispara `solicitarInicioTour(tourPrimeraVenta.id)` (`EmisionTradicional.tsx:238`).

#### Flujo C - Autoarranque especial en CobranzaModal

1. `CobranzaModal.tsx` define `TOUR_COBRANZA_MODAL` localmente (`CobranzaModal.tsx:41-96`).
2. El modal crea su propia instancia de `usarTour()` (`CobranzaModal.tsx:299-313`).
3. Un `useEffect` revisa `ayudaActivada`, `estaTourCompletado`, `estaTourOmitido`, `isOpen`, `mode === 'contado'` y `tourActivo` (`CobranzaModal.tsx:1160-1222`).
4. Si los elementos del modal existen en DOM, llama `iniciarTour(TOUR_COBRANZA_MODAL)` directamente (`CobranzaModal.tsx:1183-1191`).
5. El modal renderiza su propio `TourFlotante` local (`CobranzaModal.tsx:1650-1659`).

Conclusion funcional: hoy conviven dos pipelines distintos. Uno global basado en registro + evento + overlay del layout, y otro local especial dentro de `CobranzaModal`.

## 4. Control global desde el header

### 4.1 Implementacion actual

El control global visible de ayuda guiada vive en `src/layouts/components/Header.tsx`.

- `usarAyudaGuiada()` se consume en `Header.tsx:44`.
- El estado visual del menu se guarda localmente como `mostrarMenuAyuda` (`Header.tsx:28`).
- El switch usa `cambiarAyudaActivada(!ayudaActivada)` (`Header.tsx:451-452`).
- El boton de ayuda visible es el icono `HelpCircle` que abre un dropdown (`Header.tsx:428-439`).

### 4.2 Que controla realmente

El switch del header controla de verdad estas cosas:

- La bandera global `ayudaActivada` dentro de `ProveedorAyudaGuiada`.
- La persistencia de esa bandera en localStorage mediante `guardarEstadoAyudaGuiada()`.
- La habilitacion/deshabilitacion del boton `Ver guia de esta pantalla` en el propio menu (`Header.tsx:472-483`).
- El autoarranque del tour en `EmisionTradicional` porque ese `useEffect` revisa `ayudaActivada` (`EmisionTradicional.tsx:228-239`).
- El autoarranque del tour en `CobranzaModal` porque su `useEffect` tambien revisa `ayudaActivada` (`CobranzaModal.tsx:1167-1175`).

### 4.3 Que no controla

El switch del header no controla de forma central estas cosas:

- No gobierna el runtime del tour desde un unico lugar; `usarTour.ts` no lee `ayudaActivada` antes de iniciar o renderizar un tour.
- No muestra ni oculta entradas visibles por modulo tipo `Ver guia`, `Aprender` o `Como se usa`, porque ese patron no existe hoy.
- No conoce un catalogo de ayudas por modulo ni por ruta.
- No controla las ayudas locales independientes de otros modulos como `ImportarClientesPage` o los tooltips de catalogo.

Esto significa que `ayudaActivada` hoy es una preferencia global respetada por algunos call sites, no un controlador global autoritativo del sistema completo.

### 4.4 Coherencia UX del control global

La UX del header hoy es parcialmente clara, pero todavia limitada y ambigua.

- Clara porque el usuario si ve un icono de ayuda, un switch y una accion manual.
- Limitada porque `Ver guia de esta pantalla` solo sirve para una ruta exacta y en las demas muestra `Guias disponibles proximamente` (`Header.tsx:140-150`).
- Ambigua porque existe otra entrada `Centro de ayuda` en `UserDropdown.tsx:127`, pero hoy solo dispara un `alert` placeholder (`UserDropdown.tsx:36`).
- Poco escalable porque el menu no modela recursos por modulo, sino acciones hardcodeadas.

## 5. Ayuda contextual por modulo

### 5.1 Que existe hoy

Hoy no existe una entrada visible por modulo tipo `Ver guia`, `Aprender` o `Como se usa` conectada al sistema de tours.

Lo que si existe es esto:

- En `EmisionTradicional.tsx`, el tour se autoarranca en segundo plano si la ayuda global esta activa y el usuario no lo completo ni omitio (`EmisionTradicional.tsx:228-239`).
- En `CobranzaModal.tsx`, el tour se autoarranca cuando el modal esta abierto, el modo es `contado`, la ayuda global esta activa y el modal ya renderizo sus targets (`CobranzaModal.tsx:1160-1222`).
- En la UI de la pantalla, los puntos del tour estan marcados con `data-tour` en componentes internos (`CompactDocumentForm.tsx:803`, `ProductsSection.tsx:1675`, `1688`, `1779`, `EmisionTradicional.tsx:1497`, `1597`, `CobranzaModal.tsx:1313`, `1382`, `1613`, `1638`).

### 5.2 Que no existe hoy

No existe hoy:

- un boton local visible por modulo conectado al sistema de ayuda guiada,
- un componente compartido para renderizar ese acceso contextual,
- una condicion de render tipo `if ayudaActivada then mostrar acceso contextual`,
- un mapa modulo -> tour,
- un contrato reusable para enganchar nuevas pantallas al mismo patron.

### 5.3 Como se visualiza hoy la ayuda contextual

La ayuda contextual actual se visualiza como overlay flotante sobre el elemento objetivo, no como acceso local previo.

- `TourFlotante.tsx` renderiza un `dialog` flotante (`TourFlotante.tsx:278`) con navegacion, lectura y video.
- El overlay aparece solo despues de que alguna pieza ya disparo el runtime del tour.
- No hay una affordance local persistente en la pantalla que anuncie al usuario que existe una guia contextual disponible.

### 5.4 Como se dispara hoy

- Manualmente: desde el menu del header, solo para `/comprobantes/emision`.
- Automaticamente: en `EmisionTradicional`.
- Automaticamente: en `CobranzaModal`.

No existe un disparo contextual visible y reusable por modulo.

### 5.5 Dependencia correcta del estado global

La dependencia del estado global es parcial.

- Si, en los dos autoarranques reales, porque ambos revisan `ayudaActivada`.
- No, en terminos de visibilidad contextual por modulo, porque no hay entradas visibles que ocultar o mostrar.
- No, en las ayudas locales independientes de otros modulos, porque estas no usan `usarAyudaGuiada`.

Ejemplo claro: `ImportarClientesPage.tsx` tiene tooltips y un panel lateral `Ayuda` (`ImportarClientesPage.tsx:1272-1467`), pero no consulta `ayudaActivada`. El switch del header no lo gobierna.

## 6. Relacion entre control global y ayudas locales

### 6.1 Conexion real

La conexion real hoy es esta:

- El header cambia `ayudaActivada` global.
- `EmisionTradicional` y `CobranzaModal` leen esa bandera y deciden si autoarrancan un tour.
- El header tambien puede disparar manualmente el tour `primera-venta` solo en una ruta hardcodeada.

### 6.2 Consistencia real

No hay consistencia completa entre global y local.

- El header si influye sobre el autoarranque de algunas superficies.
- Pero no existe todavia una visibilidad contextual por modulo dependiente del header.
- El sistema no sigue el flujo deseado de negocio `header habilita visibilidad -> modulo muestra acceso -> acceso dispara guia contextual`.
- Hoy el flujo real es mas bien `header habilita preferencia -> algunas superficies autoarrancan -> header manual dispara una sola pantalla`.

### 6.3 Desacoplamientos y riesgos

- `usarTour()` no es compartido globalmente. `PrivateLayout.tsx` tiene una instancia; `CobranzaModal.tsx` tiene otra.
- `tourPrimeraVenta` entra al sistema por registro global; `TOUR_COBRANZA_MODAL` no.
- Hay ayudas locales en otros modulos que no pertenecen al mismo sistema y no obedecen el switch global.

Resultado: el sistema actual no expresa un patron unico y escalable de ayuda guiada global + contextual.

## 7. Evaluacion de consistencia

### 7.1 Consistencia conceptual

La consistencia conceptual es baja.

- El header habla de `Ayuda` y `Ayuda guiada`.
- El boton manual dice `Ver guia de esta pantalla`.
- El dropdown de usuario habla de `Centro de ayuda`.
- Otros modulos muestran `Ayuda` como tooltip o panel independiente.

No hay una taxonomia unica de producto para decirle al usuario que forma parte del sistema de ayuda guiada y que no.

### 7.2 Consistencia funcional

La consistencia funcional es baja.

- Solo una ruta se puede lanzar manualmente desde el header.
- Una pantalla autoarranca por evento global.
- Un modal autoarranca con un runtime local distinto.
- Otros modulos muestran ayudas locales no ligadas al sistema.

Esto no es un flujo funcional uniforme.

### 7.3 Consistencia tecnica

La consistencia tecnica es fragil.

- El provider global guarda preferencia e historial.
- El runtime activo es local por hook.
- El disparo global usa evento + variable global `window.__senciyoTourPendiente`.
- La cobertura por pantallas depende de imports, rutas hardcodeadas y selectores `data-tour` dispersos.

### 7.4 Consistencia UX

La UX hoy se siente parcial y algo oculta.

- El usuario ve el icono del header, pero no ve guias contextuales visibles por modulo.
- Si no entra al menu del header, no necesariamente descubre que existe ayuda guiada.
- Si cae en `EmisionTradicional` o en `CobranzaModal`, puede ver autoarranque, pero eso no construye una regla clara reusable para todo el sistema.
- La presencia de `Centro de ayuda` en el menu de usuario agrega otra ruta de ayuda no resuelta.

### 7.5 Consistencia para escalabilidad futura

El estado actual no sirve todavia como patron limpio para todo el producto.

- No existe un registro por modulo o ruta para ayudas contextuales.
- No existe un componente base de acceso local por modulo.
- No existe una fuente de verdad unica del runtime del tour.
- No existe gobierno del switch global sobre todas las ayudas visibles del producto.

Escalar esto hoy tenderia a reproducir excepciones y hardcodes, no un modelo ordenado.

## 8. Problemas detectados

### Problema 1 - El switch global no gobierna centralmente el runtime del tour

- Descripcion: `ayudaActivada` vive en el contexto global, pero `usarTour.ts` mantiene su propio estado local del tour activo y no bloquea `iniciarTour()` si la ayuda esta desactivada.
- Evidencia en codigo: `ContextoAyudaGuiada.ts` solo expone `ayudaActivada` e historial; `usarTour.ts:40` crea `estado` local; `usarTour.ts:68-125` maneja inicio, avance, omision y finalizacion sin consultar `ayudaActivada`.
- Impacto: el cumplimiento del switch global depende de que cada caller recuerde respetarlo. No esta garantizado por el runtime.
- Severidad: critica.

### Problema 2 - El header solo puede lanzar manualmente una pantalla hardcodeada

- Descripcion: `handleVerGuiaPantalla()` solo contempla la ruta exacta `/comprobantes/emision` y el tour `primera-venta`.
- Evidencia en codigo: `Header.tsx:140-150`, especialmente `Header.tsx:144-145`.
- Impacto: el control visible del header no escala a otros modulos y no representa un sistema global de ayuda contextual.
- Severidad: alta.

### Problema 3 - No existe hoy un acceso contextual visible por modulo conectado al sistema

- Descripcion: el patron deseado de negocio `header habilita visibilidad` + `modulo muestra entrada contextual` no esta implementado.
- Evidencia en codigo: las busquedas de `Ver guia`, `Aprender`, `Como se usa` dentro de `src/pages/Private/**` no encuentran entradas conectadas al sistema de tours; solo el header tiene `Ver guia de esta pantalla` (`Header.tsx:479`). `EmisionTradicional.tsx` y `CobranzaModal.tsx` disparan tours automaticamente, no mediante CTA local visible.
- Impacto: el usuario no tiene una affordance contextual clara dentro de los modulos; la ayuda guiada sigue oculta detras del header o del autoarranque.
- Severidad: critica.

### Problema 4 - Existen dos runtimes del tour activos y no una sola fuente de verdad

- Descripcion: `PrivateLayout.tsx` monta una instancia global de `usarTour()`, mientras `CobranzaModal.tsx` crea otra instancia independiente.
- Evidencia en codigo: `PrivateLayout.tsx:102-124`, `CobranzaModal.tsx:299-313`, `CobranzaModal.tsx:1650-1659`.
- Impacto: la relacion entre control global y ayuda contextual local queda fragmentada; el sistema no tiene un runtime unificado.
- Severidad: critica.

### Problema 5 - Solo un tour esta registrado globalmente; cobranza sigue otro pipeline

- Descripcion: `tourPrimeraVenta` usa el registro global y el evento `senciyo:tour`; `TOUR_COBRANZA_MODAL` no se registra y se inicia localmente.
- Evidencia en codigo: `tourPrimeraVenta.ts:96`; `CobranzaModal.tsx:41-96`; `CobranzaModal.tsx:1183-1191`.
- Impacto: no hay un mecanismo uniforme para descubrir, listar o disparar ayudas por modulo.
- Severidad: alta.

### Problema 6 - El switch global no gobierna las ayudas locales independientes de otros modulos

- Descripcion: existen ayudas locales en otras superficies que no dependen de `usarAyudaGuiada`.
- Evidencia en codigo: `ImportarClientesPage.tsx:1272-1467` contiene tooltips y un bloque `Ayuda`; `ProductBasicsSection.tsx:81` y componentes vecinos usan tooltips con `aria-label="Ayuda: ..."`; ninguno consulta `ayudaActivada`.
- Impacto: la promesa de un control global del header no se cumple para todo lo que visualmente parece ayuda dentro del producto.
- Severidad: alta.

### Problema 7 - Persistencia global no segmentada por tenant ni usuario

- Descripcion: `almacenTour.ts` define una construccion de clave con `tenantId` y `usuarioId`, pero en lectura y escritura siempre llama `construirClaveAlmacen()` sin identidad.
- Evidencia en codigo: `almacenTour.ts:3-18`, `almacenTour.ts:73`, `almacenTour.ts:93`; ademas `ProveedorAyudaGuiada` se monta antes de `TenantProvider` (`main.tsx:92-96`).
- Impacto: el estado de ayuda puede contaminarse entre usuarios o empresas que compartan navegador.
- Severidad: alta.

### Problema 8 - La activacion real depende de rutas, imports y side effects

- Descripcion: el tour de emision solo existe globalmente porque `EmisionTradicional.tsx` importa `tourPrimeraVenta`, y ese archivo registra el tour por side effect.
- Evidencia en codigo: `EmisionTradicional.tsx:91-92`; `tourPrimeraVenta.ts:96`.
- Impacto: el sistema no tiene bootstrap central de ayudas; escalarlo exige recordar imports y side effects por pantalla.
- Severidad: media-alta.

### Problema 9 - Redundancia conceptual de entradas de ayuda

- Descripcion: el producto ofrece varias superficies con naming de ayuda distinto y comportamiento desigual.
- Evidencia en codigo: menu de ayuda del header (`Header.tsx:439-494`), `Centro de ayuda` placeholder en `UserDropdown.tsx:127` con `alert` en `UserDropdown.tsx:36`, ayudas locales propias en `ImportarClientesPage.tsx:1467`.
- Impacto: el usuario no recibe una regla clara sobre donde vive la ayuda real ni que tipo de ayuda esta usando.
- Severidad: media-alta.

### Problema 10 - Reiniciar la ayuda tambien reactiva la ayuda guiada

- Descripcion: `reiniciarAyudaGuiada()` no solo limpia historial; tambien fuerza `ayudaActivada: true`.
- Evidencia en codigo: `ProveedorAyudaGuiada.tsx:68-76`.
- Impacto: puede sorprender al usuario que esperaba solo reiniciar progreso, no volver a activar la experiencia automaticamente.
- Severidad: media.

### Problema 11 - Cerrar el overlay equivale a omitir el tour

- Descripcion: el boton de cierre del `TourFlotante` llama `onOmitir`, y `omitir()` marca el tour como omitido para esa version.
- Evidencia en codigo: `TourFlotante.tsx:283`; `usarTour.ts:117-123`.
- Impacto: una interaccion de cierre puede suprimir futuras apariciones, lo que reduce descubribilidad y puede degradar la experiencia contextual.
- Severidad: media.

### Problema 12 - El sistema sigue excesivamente centrado en una sola pantalla

- Descripcion: la unica implementacion globalmente reusable hoy es `primera-venta` en `/comprobantes/emision`; el resto del producto no sigue ese mismo patron.
- Evidencia en codigo: `privateRoutes.tsx:67` para emision, `Header.tsx:144-145` hardcodeando esa ruta, `registrarTour()` solo usado en `tourPrimeraVenta.ts:96`.
- Impacto: la solucion actual todavia no demuestra ser un patron transversal del sistema.
- Severidad: alta.

## 9. Huecos y faltantes

- Falta una abstraccion de acceso contextual visible por modulo.
- Falta un registro formal de ayudas por ruta o por modulo.
- Falta una sola fuente de verdad para el runtime del tour activo.
- Falta una forma consistente de conectar el header con accesos locales por modulo.
- Falta una taxonomia unificada entre `Ayuda`, `Ayuda guiada`, `Ver guia de esta pantalla` y `Centro de ayuda`.
- Falta gobierno del switch global sobre todas las ayudas visibles del producto.
- Falta aislamiento real por tenant/usuario en persistencia.
- Falta bootstrap central de tours y evitar side effects por import.

## 10. Que esta bien resuelto hoy

- Existe una implementacion real de ayuda guiada, no un mock.
- El header si tiene un control visible y funcional de `Ayuda guiada` (`Header.tsx:447-459`).
- La preferencia global si se persiste y se recuerda entre sesiones (`ProveedorAyudaGuiada.tsx` + `almacenTour.ts`).
- El sistema si maneja versionado y diferencia entre tour completado y omitido (`ProveedorAyudaGuiada.tsx:36-66`).
- El overlay visual del tour esta suficientemente desacoplado como componente reutilizable (`TourFlotante.tsx`).
- `EmisionTradicional` y `CobranzaModal` respetan `ayudaActivada` y el historial antes de autoarrancar, lo cual demuestra una base funcional parcial.
- Los targets del tour estan marcados explicitamente con `data-tour`, lo que hace trazable el recorrido actual.

## 11. Conclusion final

El estado actual real de SenciYo no corresponde todavia a un sistema maduro de ayuda guiada global y contextual por modulo. Lo que existe hoy es una base funcional parcial compuesta por:

- una preferencia global real en el header,
- un tour global real para `comprobantes/emision`,
- una excepcion contextual local en `CobranzaModal`,
- y varias ayudas locales independientes en otros modulos.

Eso significa que el codigo actual esta mas cerca de un piloto funcional avanzado que de un patron consolidado para todo el producto.

En terminos de entendibilidad, el sistema se deja seguir pero transmite varios modelos a la vez: ayuda guiada, centro de ayuda, tooltips de ayuda y paneles laterales de ayuda. En terminos de mantenibilidad, la base todavia es fragil porque mezcla estado global persistido con runtime local, rutas hardcodeadas, side effects por import y una cobertura excesivamente centrada en una sola pantalla.

En terminos de escalabilidad, el estado actual no demuestra estar listo para extenderse al resto de modulos sin introducir mas excepciones. La idea de negocio es alcanzable desde esta base, pero el codigo presente todavia no la implementa de manera consistente ni la modela como patron transversal.

## 12. Anexo tecnico

### 12.1 Rutas y superficies principales

- Ruta principal del tour global actual: `/comprobantes/emision` (`privateRoutes.tsx:67`).
- Ruta del modulo de cobranzas: `/cobranzas` (`privateRoutes.tsx:86`).
- Shell que monta header y overlay global: `PrivateLayout.tsx:55-76` y `PrivateLayout.tsx:102-124`.

### 12.2 Handlers y estados clave

- `Header.tsx:44` consume `ayudaActivada`, `cambiarAyudaActivada`, `reiniciarAyudaGuiada`.
- `Header.tsx:140-150` define `handleVerGuiaPantalla()`.
- `ProveedorAyudaGuiada.tsx:28-68` define cambios de preferencia, completado, omitido y reset.
- `usarTour.ts:68-125` define `iniciarTour`, `avanzar`, `saltarPaso`, `retroceder`, `omitir`, `finalizar`.

### 12.3 localStorage y persistencia

- Clave base: `senciyo_ayuda_guiada_v1` (`almacenTour.ts:3`).
- Lectura: `leerEstadoAyudaGuiada()` (`almacenTour.ts:68-85`).
- Escritura: `guardarEstadoAyudaGuiada()` (`almacenTour.ts:88-99`).
- Segmentacion potencial no utilizada: `construirClaveAlmacen(identidad?)` (`almacenTour.ts:10-18`).

### 12.4 Condiciones reales de activacion

- Header manual: solo si `ayudaActivada` y `location.pathname === '/comprobantes/emision'`.
- EmisionTradicional auto: solo si `ayudaActivada`, no completado y no omitido.
- CobranzaModal auto: solo si `isOpen`, `mode === 'contado'`, `ayudaActivada`, no completado, no omitido, `tourActivo` nulo y targets listos.

### 12.5 Observaciones finas

- `reiniciarAyudaGuiada()` reactiva la ayuda aunque el usuario la hubiera desactivado antes.
- `TourFlotante` usa `role="dialog"` (`TourFlotante.tsx:278`), pero el cierre llama `onOmitir` (`TourFlotante.tsx:283`) y la omision se persiste.
- `solicitarInicioTour()` usa tanto un evento global como `window.__senciyoTourPendiente` (`motorTour.ts:15-24`), lo que mezcla dos mecanismos de coordinacion.
- `CobranzaModal` ya no depende del overlay global para mostrarse, pero precisamente por eso confirma que el runtime del tour no es unico sino duplicado por superficie.
- Las ayudas de `ImportarClientesPage` y de tooltips en catalogo muestran que el producto ya usa la palabra `Ayuda` en otros contextos, pero sin integracion semantica ni tecnica con la ayuda guiada.