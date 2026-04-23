# Checklist tecnica ejecutable - Fase 1 de ayuda guiada contextual en SenciYo

## 1. Resumen ejecutivo

El objetivo de Fase 1 es consolidar un patron reutilizable y seguro para ayuda guiada contextual en cuatro superficies de alto valor operativo:

- Emision Tradicional.
- CobranzaModal.
- Punto de Venta.
- ClienteForm.

El criterio general de Fase 1 no es reescribir el sistema actual, sino cerrar tres frentes concretos antes de seguir expandiendo:

- separar el contenido de ayuda de la UI,
- estabilizar el patron reusable sobre las superficies ya mas maduras,
- extenderlo solo a las dos superficies nuevas de la fase sin abrir variantes inconsistentes.

Decision operativa central:

- El header global sigue siendo solo el switch de ayuda guiada.
- El acceso visible local sigue siendo un unico CTA canonico: Ver guia.
- La UI no decide textos, video ni disponibilidad de la experiencia.
- La capa de contenido decide que se muestra; la UI solo lo monta y lo renderiza.

Al cerrar Fase 1, SenciYo debe quedar con un patron estable de ayuda contextual para pagina, modal y drawer, sin hardcodes de video dentro de componentes y sin duplicar logica por modulo.

## 2. Modelo tecnico recomendado para la capa de contenido

### 2.1 Criterio de arquitectura

La capa de ayuda debe separarse en dos piezas, no en una sola:

1. Configuracion de superficie.
2. Definicion de tour.

La configuracion de superficie describe la experiencia contextual del modulo o vista.
La definicion de tour describe los pasos, selectores y contenido paso a paso.

Esto permite que una superficie tenga:

- solo lectura,
- lectura + video,
- lectura + video + tour,
- o lectura + tour sin video real todavia,

sin obligar a que todo pase por una unica forma de contenido.

### 2.2 Artefactos tecnicos recomendados

Fase 1 debe dejar definidos estos artefactos, aunque inicialmente vivan en codigo versionado y no en un CMS:

- Un registro de superficies de ayuda.
- Un registro de tours reutilizando el mecanismo actual de registro de tours.
- Un resolvedor de contenido por superficie.
- Un contrato de visibilidad y ubicacion del CTA.
- Una politica explicita para video temporal o ausente.

No hace falta una plataforma nueva. Basta una capa de contenido en codigo fuera de los componentes de UI.

### 2.3 Contrato recomendado para configuracion de superficie

| Campo | Obligatorio | Proposito | Observacion de Fase 1 |
| --- | --- | --- | --- |
| `surfaceId` | Si | Identificador unico de la superficie | Debe ser estable y legible. Ejemplos: `emision-tradicional`, `cobranza-modal`, `punto-venta`, `cliente-form`. |
| `moduleId` | Si | Agrupa la superficie por dominio funcional | Ejemplos: `comprobantes`, `clientes`. |
| `surfaceType` | Si | Define el tipo de contenedor | Valores recomendados: `page`, `modal`, `drawer`, `form`. |
| `status` | Si | Estado editorial del contenido | Valores recomendados: `draft`, `ready`, `disabled`. |
| `priority` | Si | Prioridad funcional de la superficie | Fase 1 usa `P1` para las cuatro superficies objetivo. |
| `ctaLabel` | Si | Etiqueta visible del disparador | En Fase 1 debe mantenerse `Ver guia`. |
| `ctaPlacementKey` | Si | Token de ubicacion del CTA | No deben guardarse clases CSS en contenido. Usar tokens como `document-actions-inline`, `modal-header-actions`, `page-header-actions`, `drawer-header-actions`. |
| `requiresGlobalHelpEnabled` | Si | Indica que el CTA depende del switch global | Debe ser `true` en Fase 1. |
| `runtimeVisibilityRules` | No | Reglas extra para mostrar el CTA | Ejemplo clave: CobranzaModal solo en `mode=contado`. |
| `supportsReading` | Si | Define si la superficie expone lectura | Debe ser explicito, no inferido por UI. |
| `supportsVideo` | Si | Define si la superficie expone video | Debe ser explicito, no inferido por UI. |
| `supportsTour` | Si | Define si la superficie expone tour in-app | Debe ser explicito. |
| `readingTitle` | No | Titulo de la lectura de superficie | Recomendado para superficies nuevas o cuando se quiera una introduccion breve previa al tour. |
| `readingItems` | No | Lista de puntos de lectura de superficie | No reemplaza el contenido por paso del tour. |
| `videoTitle` | No | Titulo visible del video | Debe vivir en contenido, no en UI. |
| `videoUrl` | No | URL configurable del video de la superficie | Puede usar temporalmente el mismo link de referencia, pero solo desde esta capa. |
| `videoStatus` | Si | Estado del video configurado | Valores recomendados: `real`, `temporal`, `missing`. |
| `fallbackBehaviorWithoutVideo` | Si | Politica cuando no haya video real o no haya URL | Recomendado: ocultar la opcion de video y dejar lectura/tour activos. |
| `tourId` | No | Referencia al tour asociado | Debe existir solo si `supportsTour=true`. |
| `ownerComponent` | Si | Componente donde vive el CTA o donde arranca la experiencia | Sirve para mantenimiento y trazabilidad. |
| `ownerContainer` | No | Componente padre que provee el header real | Importante para drawer y modal. |
| `relatedSurfaces` | No | Superficies relacionadas | Ejemplo: POS relacionado con `cobranza-modal`. |
| `notes` | No | Restricciones o decisiones operativas | Ejemplo: `no usar tour cross-tab en Fase 1`. |

### 2.4 Contrato recomendado para definicion de tour

La definicion de tour puede seguir reutilizando el esquema actual de `DefinicionTour` y `PasoTour`, pero Fase 1 debe dejarle una disciplina clara.

| Campo | Obligatorio | Proposito | Regla de Fase 1 |
| --- | --- | --- | --- |
| `tourId` | Si | Identificador unico del tour | Debe coincidir con la referencia de la superficie. |
| `version` | Si | Version funcional del tour | Debe subir cuando cambian pasos o semantica. |
| `stepId` | Si | Id estable de cada paso | No usar ids genericos o efimeros. |
| `selector` | Si | Selector del objetivo | Debe apuntar a anchors estables por `data-tour`. |
| `title` | Si | Titulo del paso | Contenido editorial. |
| `description` | Si | Descripcion corta del paso | No esconder logica de negocio aqui. |
| `position` | No | Posicion del tooltip | Reutiliza el enum actual. |
| `readingItems` | No | Lectura del paso | Debe salir de la capa de contenido del tour, no del componente de UI. |
| `videoUrl` | No | Video por paso o fallback de la superficie | Debe venir de contenido, no del componente. |
| `videoTitle` | No | Titulo del video por paso | Debe venir de contenido. |
| `videoButtonLabel` | No | Etiqueta visible del boton de video | Si no existe, la UI debe usar una etiqueta canonica. |

### 2.5 Responsabilidades por capa

| Capa | Responsabilidad | No debe hacer |
| --- | --- | --- |
| Configuracion de superficie | Decide si una superficie tiene lectura, video, tour, CTA y donde se monta | No debe conocer clases CSS ni manipular DOM |
| Registro de tours | Define pasos, selectores, orden y contenido por paso | No debe decidir si el CTA se muestra o no |
| UI reusable | Renderiza CTA, modal flotante y estados de ayuda | No debe hardcodear textos, videos ni prioridades |
| Hooks/providers actuales | Controlan activacion global, apertura, cierre y progreso del tour | No deben contener contenido editorial |
| Superficie funcional | Inserta el CTA en el slot correcto y declara sus anchors estables | No debe inventar un patron distinto de ayuda |

### 2.6 Politica obligatoria para video temporal y video ausente

- El link temporal de referencia puede seguir existiendo en Fase 1, pero solo dentro de la capa de contenido.
- Ningun componente de UI debe decidir una URL por defecto.
- Si una superficie soporta video pero todavia no tiene video real, debe quedar marcada como `videoStatus=temporal`.
- Si una superficie todavia no debe mostrar video, debe quedar marcada como `videoStatus=missing` y la UI debe ocultar la opcion de video sin romper lectura ni tour.
- La UI solo consume `supportsVideo`, `videoUrl` y `fallbackBehaviorWithoutVideo`.

### 2.7 Surface ids recomendados para Fase 1

| Surface id | Superficie real | Observacion |
| --- | --- | --- |
| `emision-tradicional` | Formulario principal de Emision Tradicional | Usa CTA en acciones de `CompactDocumentForm`. |
| `cobranza-modal` | Modal de cobranza reutilizado | Se usa desde Emision, POS y Cobranzas. |
| `punto-venta` | Pantalla principal de POS | El CTA debe vivir en el header propio de la pagina. |
| `cliente-form` | Formulario de cliente en modo drawer | En Fase 1 el caso real es drawer en `ClientesPage`. |

## 3. Checklist tecnica por superficie

### 3.1 Emision Tradicional

#### Estado actual

- [x] Ya existe `AccesoGuiaContextual` insertado desde `EmisionTradicional` mediante `accionContextual` en `CompactDocumentForm`.
- [x] Ya existe un tour funcional: `tourPrimeraVenta`.
- [x] El tour se monta usando el overlay global de `TourFlotante` desde `PrivateLayout`.
- [x] La superficie ya tiene anchors `data-tour` en puntos criticos del flujo.
- [x] La experiencia actual ya soporta lectura y video embebido.
- [ ] El contenido de ayuda todavia esta acoplado a la definicion actual del tour y al helper temporal.
- [ ] La superficie todavia no consume un registro formal de contenido por `surfaceId`.

#### Reutilizacion inmediata

- Reutilizar `AccesoGuiaContextual` sin cambiar su patron visual.
- Reutilizar `CompactDocumentForm` y su slot `accionContextual`.
- Reutilizar el tour ya registrado.
- Reutilizar `TourFlotante`, `usarTour` y `ProveedorAyudaGuiada` sin reescribirlos en Fase 1.

#### Tipo de ayuda final esperado

- Lectura.
- Video.
- Tour in-app.

Emision Tradicional es la superficie patron de Fase 1. Debe quedar como la referencia canonica para formularios complejos de pagina.

#### Ubicacion exacta de Ver guia

- Debe permanecer en la fila de acciones de `CompactDocumentForm`.
- Debe convivir con `Vista previa` y `+ Campos`.
- No debe moverse al `PageHeader`.
- No debe abrir una fila nueva encima del formulario.

Justificacion:

- El usuario necesita la guia en el mismo lugar donde decide configurar y emitir.
- Ya existe un slot reusable correcto y probado.
- Moverlo a otro lugar romperia el patron ya validado.

#### Dependencias tecnicas

- `EmisionTradicional.tsx` como owner del CTA.
- `CompactDocumentForm.tsx` como slot de insercion.
- `tourPrimeraVenta.ts` como base del tour existente.
- `AccesoGuiaContextual.tsx` para la visibilidad condicionada por switch global.
- `TourFlotante.tsx` y `usarTour.ts` para la ejecucion global del tour.
- Nueva entrada en el registro de superficie `emision-tradicional`.
- Nueva estrategia de resolucion de contenido de video/lectura desde capa de contenido.

#### Checklist ejecutable

- [ ] Crear la entrada de configuracion `emision-tradicional` en la capa de contenido.
- [ ] Declarar en esa entrada `supportsReading=true`, `supportsVideo=true`, `supportsTour=true`.
- [ ] Declarar `ctaPlacementKey=document-actions-inline`.
- [ ] Mover el video temporal de referencia a la capa de contenido de esta superficie.
- [ ] Revisar si el contenido de lectura debe vivir a nivel de superficie, por paso o en ambos niveles.
- [ ] Mantener `tourPrimeraVenta` como tour registrado del flujo principal.
- [ ] Evitar crear un segundo origen de verdad para el mismo tour.
- [ ] Mantener intacto el contrato de `CompactDocumentForm`; no abrir un patron nuevo solo para ayuda.
- [ ] Dejar explicitado que el flujo de nota de credito no debe contaminar la ayuda de venta base en Fase 1.

#### Validaciones

- [ ] Con switch global apagado, `Ver guia` no se muestra.
- [ ] Con switch global encendido, `Ver guia` aparece sin desplazar `Vista previa` ni `+ Campos`.
- [ ] El CTA lanza el tour correcto de Emision Tradicional.
- [ ] El contenido de lectura y video llega desde la capa de contenido y no desde el componente.
- [ ] Si el video queda temporal, se muestra el temporal configurado sin hardcode en la UI.
- [ ] Si el video se marca como ausente, la UI conserva lectura y tour sin errores.
- [ ] El tour sigue encontrando todos los `data-tour` criticos.
- [ ] El overlay global sigue cerrando correctamente al apagar el switch global.

#### Riesgos

- Riesgo de duplicar contenido entre la configuracion de superficie y `tourPrimeraVenta`.
- Riesgo de dejar el fallback temporal todavia oculto en helpers dispersos.
- Riesgo de mezclar ayuda de primera venta con flujos de nota de credito o variantes de emision.
- Riesgo de romper el layout si el CTA cambia de ancho o estilo fuera del patron actual.

### 3.2 CobranzaModal

#### Estado actual

- [x] Ya existe `AccesoGuiaContextual` en el header del modal.
- [x] Ya existe un tour funcional local: `TOUR_COBRANZA_MODAL`.
- [x] Ya existe `handleVerGuiaCobranza`.
- [x] El modal usa `usarTour` y `TourFlotante` localmente.
- [x] El CTA solo aparece cuando `mode === contado`.
- [x] El modal se reutiliza desde Emision, POS y Cobranzas.
- [ ] El tour sigue definido dentro del propio componente.
- [ ] El contenido de lectura/video sigue dependiendo del helper temporal.
- [ ] No existe todavia una configuracion de superficie central para `cobranza-modal`.

#### Reutilizacion inmediata

- Reutilizar el CTA en el header del modal.
- Reutilizar el runtime local de `usarTour` y `TourFlotante` del modal en Fase 1.
- Reutilizar el comportamiento actual de visibilidad solo en modo contado.
- Reutilizar el modal desde sus tres consumidores sin abrir variantes nuevas.

#### Tipo de ayuda final esperado

- Lectura.
- Video.
- Tour in-app.

CobranzaModal debe quedar como el patron canonico para ayuda guiada en modal operativo reutilizable.

#### Ubicacion exacta de Ver guia

- Debe permanecer en el header del modal.
- Debe convivir con el boton de cierre.
- Debe vivir en la zona de acciones derechas del header.
- No debe bajar al footer ni mezclarse con el boton `Cobrar`.

Justificacion:

- El header es el punto estable del modal sin invadir la operacion monetaria.
- Llevarlo al cuerpo o footer lo mezclaria con decisiones transaccionales.

#### Dependencias tecnicas

- `CobranzaModal.tsx` como owner directo de la experiencia.
- `usarTour.ts` y `TourFlotante.tsx` en modo local.
- `AccesoGuiaContextual.tsx` para la visibilidad condicionada.
- Consumidores actuales: Emision Tradicional, Punto de Venta, CobranzasDashboard, ListaComprobantes.
- Nueva entrada en el registro de superficie `cobranza-modal`.
- Extraccion del tour local a una fuente externa al componente.
- Regla de runtime `mode=contado` como parte del contrato de visibilidad.

#### Checklist ejecutable

- [ ] Crear la entrada de configuracion `cobranza-modal`.
- [ ] Declarar `supportsReading=true`, `supportsVideo=true`, `supportsTour=true`.
- [ ] Declarar `ctaPlacementKey=modal-header-actions`.
- [ ] Declarar `runtimeVisibilityRules` que preserven la condicion `mode=contado`.
- [ ] Sacar `TOUR_COBRANZA_MODAL` del componente y moverlo a una fuente de contenido/tour versionada.
- [ ] Mantener en Fase 1 el runtime local del modal para no reabrir riesgos de stacking y clipping.
- [ ] Documentar que la misma configuracion de superficie debe servir para Emision, POS y Cobranzas.
- [ ] Evitar crear una version distinta del modal por cada contexto.

#### Validaciones

- [ ] Con switch global apagado, no se muestra `Ver guia` en el header del modal.
- [ ] Con switch global encendido, `Ver guia` aparece solo cuando el modal esta en modo contado.
- [ ] El CTA no desplaza ni rompe el boton de cierre.
- [ ] El tour local se abre correctamente y resalta anchors del modal.
- [ ] El modal no pierde foco ni z-index cuando abre `TourFlotante`.
- [ ] El mismo contenido de ayuda se mantiene coherente desde Emision, POS y Cobranzas.
- [ ] Si no hay video real aun, el modal usa solo el video resuelto por contenido o esconde el modo video.

#### Riesgos

- Riesgo de duplicar contenido si cada consumidor intenta personalizar la ayuda del mismo modal.
- Riesgo de divergencia entre runtime global y runtime local si se mezcla sin criterio.
- Riesgo de UX si el CTA aparece en contextos donde el modo no es contado.
- Riesgo de stacking visual por overlay dentro de un modal reutilizable.

### 3.3 Punto de Venta

#### Estado actual

- [x] La pagina tiene header propio, distinto del header global del sistema.
- [x] La pagina ya reutiliza `CobranzaModal`.
- [x] El dominio de POS ya convive con la ayuda de cobranza cuando se abre el modal.
- [ ] No existe `Ver guia` para la superficie principal de POS.
- [ ] No existe tour de POS registrado para la pantalla principal.
- [ ] No existen anchors de tour explicitamente definidos para una experiencia contextual de POS.
- [ ] No existe configuracion de superficie `punto-venta`.

#### Reutilizacion inmediata

- Reutilizar `AccesoGuiaContextual`.
- Reutilizar `TourFlotante` global montado desde `PrivateLayout`.
- Reutilizar el mecanismo global de registro de tours como en Emision Tradicional.
- Reutilizar `CobranzaModal` sin tocar su patron.

#### Tipo de ayuda final esperado

- Lectura.
- Video.
- Tour in-app.

POS debe quedar como el patron canonico de ayuda para una pagina operacional de alta velocidad con dos paneles principales.

#### Ubicacion exacta de Ver guia

- Debe insertarse en el grupo de acciones derechas del header propio de POS.
- Debe convivir con el boton que navega al dashboard de POS.
- Debe ubicarse antes del boton de dashboard dentro del grupo derecho.
- No debe agregarse en la grilla de productos ni dentro del panel de checkout.

Justificacion:

- El header es el ancla estable de la pagina.
- El CTA debe ser visible sin competir con acciones de cobro.
- Ponerlo dentro del checkout mezclaria orientacion con ejecucion transaccional.

#### Dependencias tecnicas

- `PuntoVenta.tsx` como owner del CTA.
- `AccesoGuiaContextual.tsx` como CTA reusable.
- `TourFlotante.tsx` y `usarTour.ts` en modo global.
- Nueva definicion de tour para POS.
- Anchors estables sobre bloques visibles de POS.
- Entrada nueva en el registro de superficie `punto-venta`.
- Relacion funcional con `cobranza-modal`, pero sin fusionar ambas ayudas.

#### Checklist ejecutable

- [ ] Crear la entrada de configuracion `punto-venta`.
- [ ] Declarar `supportsReading=true`, `supportsVideo=true`, `supportsTour=true`.
- [ ] Declarar `ctaPlacementKey=page-header-actions`.
- [ ] Montar `Ver guia` en el grupo derecho del header de POS.
- [ ] Crear un tour especifico de POS usando registro global, no runtime local nuevo.
- [ ] Definir anchors de tour solo sobre bloques visibles y estables del flujo principal.
- [ ] Separar el tour de POS del tour de `cobranza-modal`.
- [ ] Mantener el modal de cobranza con su propia ayuda, sin duplicar CTAs internos en el checkout principal.
- [ ] Usar video configurado por superficie y no por componente.

#### Validaciones

- [ ] Con switch global apagado, el header de POS no muestra `Ver guia`.
- [ ] Con switch global encendido, el CTA aparece sin romper la alineacion del header.
- [ ] El CTA abre el tour correcto de POS y no el de Emision ni el de Cobranza.
- [ ] El tour funciona en desktop y no pierde anchors por el layout de dos columnas.
- [ ] El CTA del modal de cobranza sigue funcionando cuando POS abre ese modal.
- [ ] No aparecen dos ayudas contradictorias para el mismo momento del flujo.
- [ ] Si no hay video real, el comportamiento sigue la politica central de contenido.

#### Riesgos

- Riesgo de mezclar ayuda de pagina con ayuda del modal de cobranza.
- Riesgo de anchors inestables por cambios de layout entre desktop y viewport reducido.
- Riesgo de sobrecargar el header si se agregan mas acciones futuras sin mantener jerarquia.
- Riesgo de crear un tour demasiado largo para una superficie de alta velocidad.

### 3.4 ClienteForm

#### Estado actual

- [x] `ClienteFormNew` existe y concentra la complejidad funcional del formulario.
- [x] En el flujo real actual, `ClienteFormNew` se monta dentro de un `Drawer` desde `ClientesPage`.
- [x] En modo drawer, el header real pertenece al `Drawer`, no al componente del formulario.
- [x] El formulario tiene tabs y bloques complejos.
- [ ] No existe `Ver guia` hoy.
- [ ] No existe tour registrado para ClienteForm.
- [ ] No existen anchors `data-tour` para ClienteForm.
- [ ] No existe configuracion de superficie `cliente-form`.

#### Reutilizacion inmediata

- Reutilizar `AccesoGuiaContextual`.
- Reutilizar el runtime global de `TourFlotante` y `usarTour`.
- Reutilizar el patron de CTA contextual visible solo con switch global activo.
- Reutilizar el contenedor `Drawer` como punto correcto de insercion del CTA.

#### Tipo de ayuda final esperado

- Lectura.
- Video.
- Tour in-app ligero.

El tour debe ser ligero en Fase 1 porque el formulario tiene tabs y el runtime actual no orquesta cambios de tab automaticamente.

#### Ubicacion exacta de Ver guia

- En Fase 1 debe vivir en `accionesEncabezado` del `Drawer` en `ClientesPage` para create y edit.
- No debe montarse dentro de la hilera de tabs.
- No debe montarse en el cuerpo del formulario.
- No debe depender del header interno de `ClienteFormNew` mientras el uso real siga siendo drawer.

Regla adicional de consistencia:

- Si en el futuro `ClienteFormNew` vuelve a usarse en modo modal, debe respetar el mismo principio: CTA en el header superior de la presentacion, no dentro de tabs ni del contenido.

Justificacion:

- El header real de la experiencia no esta en `ClienteFormNew`, sino en el `Drawer` padre.
- En modo drawer, insertar la ayuda dentro del formulario la volveria menos visible y mas acoplada al layout interno.

#### Dependencias tecnicas

- `ClientesPage.tsx` como owner del header del drawer y de la ubicacion del CTA.
- `ClienteFormNew.tsx` como owner de los anchors de tour y del contenido funcional.
- `AccesoGuiaContextual.tsx` como CTA reusable.
- `TourFlotante.tsx` y `usarTour.ts` en modo global.
- Nueva configuracion de superficie `cliente-form`.
- Nueva definicion de tour de ClienteForm.
- Anchors de tour solo en zonas visibles y seguras del flujo inicial.

#### Checklist ejecutable

- [ ] Crear la entrada de configuracion `cliente-form`.
- [ ] Declarar `supportsReading=true`, `supportsVideo=true`, `supportsTour=true`.
- [ ] Declarar `ctaPlacementKey=drawer-header-actions`.
- [ ] Montar `Ver guia` en el `Drawer` de `ClientesPage` para modos create y edit.
- [ ] No agregar el CTA en modo view; la superficie de Fase 1 es el formulario, no la vista de detalle.
- [ ] Crear un tour ligero que se limite a anchors visibles del flujo inicial.
- [ ] No crear un tour cross-tab mientras el runtime no pueda activar tabs automaticamente.
- [ ] Cubrir tabs secundarias con lectura y video de superficie, no con pasos invisibles.
- [ ] Agregar anchors estables en `ClienteFormNew` solo donde haya permanencia funcional clara.
- [ ] Mantener el formulario reusable sin volverlo dependiente del drawer para su logica de negocio.

#### Validaciones

- [ ] Con switch global apagado, el drawer de create/edit no muestra `Ver guia`.
- [ ] Con switch global encendido, el CTA aparece en el header del drawer y no rompe el layout.
- [ ] El CTA lanza el tour correcto de `cliente-form`.
- [ ] El tour no intenta apuntar a tabs ocultas o contenido no visible.
- [ ] El formulario sigue siendo usable en create y edit sin cambios en sus validaciones de negocio.
- [ ] Si el video esta temporal o ausente, la UI sigue la politica central sin fallback local.
- [ ] Cerrar el drawer o apagar el switch global debe limpiar cualquier tour activo.

#### Riesgos

- Riesgo alto de diseno si se monta el CTA dentro del formulario y no en el drawer.
- Riesgo alto de rotura funcional si el tour intenta navegar tabs sin soporte tecnico.
- Riesgo de duplicacion si el drawer define una ayuda y el formulario intenta definir otra.
- Riesgo de acoplar el formulario a una sola presentacion cuando hoy soporta modal y drawer.

## 4. Orden recomendado de implementacion

La secuencia correcta para Fase 1 es esta:

### Paso 1. Consolidar la capa de contenido

- Definir el contrato de superficie.
- Definir la estrategia de video temporal y video ausente.
- Registrar las cuatro superficies objetivo.
- Dejar separados contenido de superficie y definicion de tour.

Justificacion:

- Si esto no se hace primero, POS y ClienteForm naceran con el mismo hardcode disperso que hoy existe en helpers temporales.
- Emision y Cobranza ya funcionan; conviene usarlas para validar el contrato antes de crecer a otras superficies.

### Paso 2. Migrar Emision Tradicional a la nueva capa sin cambiar UX

- Mantener el CTA donde ya esta.
- Mover la resolucion de lectura/video a la capa de contenido.
- Validar que la superficie patron siga intacta.

Justificacion:

- Es la superficie mas estable y ya tiene el slot correcto.
- Sirve como prueba de que el contrato nuevo no rompe el patron existente.

### Paso 3. Migrar CobranzaModal a la nueva capa sin cambiar su runtime local

- Extraer su contenido y tour fuera del componente.
- Mantener la visibilidad condicionada por `mode=contado`.
- Mantener su runtime local en Fase 1.

Justificacion:

- Cierra el segundo patron ya existente.
- Deja resuelto el caso modal reutilizable antes de tocar POS, que ya lo consume.

### Paso 4. Implementar Punto de Venta usando el patron ya consolidado

- Agregar configuracion de superficie.
- Montar `Ver guia` en el header de POS.
- Crear y registrar el tour de POS.

Justificacion:

- POS comparte dominio con Emision y Cobranza.
- Ya reutiliza `CobranzaModal`, por lo que llega sobre un dominio funcional ya estabilizado.
- Tecnica y visualmente es menos riesgoso que ClienteForm.

### Paso 5. Implementar ClienteForm al final de Fase 1

- Montar `Ver guia` en el header del drawer desde `ClientesPage`.
- Crear el tour ligero con anchors visibles.
- Validar create y edit.

Justificacion:

- Es la superficie mas delicada de la fase por tabs, presentacion en drawer y ausencia total de tour previo.
- Llegar ultimo permite reutilizar el contrato y el aprendizaje de las tres superficies previas.

### Paso 6. Validacion transversal de Fase 1

- Revisar switch global.
- Revisar CTAs visibles solo donde corresponde.
- Revisar comportamiento con video temporal, video ausente y tours activos.
- Revisar consistencia visual entre pagina, modal y drawer.

## 5. Reglas tecnicas obligatorias

- No hardcodear `videoUrl` en componentes de UI.
- No hardcodear titulos, lecturas o disponibilidad del modo video dentro de la UI.
- No crear un patron distinto de `Ver guia` para Fase 1.
- No romper el header global ni devolverle la responsabilidad de lanzar experiencias locales.
- No duplicar la logica de visibilidad del CTA entre componentes hermanos.
- No guardar clases CSS en la capa de contenido; usar tokens de ubicacion.
- No definir tours inline dentro de componentes de Fase 1 una vez migren al patron nuevo.
- No abrir ayudas visibles en listados, dashboards analiticos o pantallas que no son objetivo de Fase 1.
- No mezclar microayuda de campos con ayuda guiada fuerte sin una decision explicita de superficie.
- No usar fallback de video desde la UI; si no hay video, la decision debe venir de contenido.
- No reescribir `usarTour`, `TourFlotante` o `ProveedorAyudaGuiada` salvo que haya un bug bloqueante.
- No convertir ClienteForm en un tour cross-tab hasta tener soporte tecnico para activar tabs.
- No crear una version distinta de ayuda de `CobranzaModal` por cada consumidor.
- No mover `Ver guia` a ubicaciones nuevas si ya existe un slot correcto y probado.
- Toda nueva superficie de Fase 1 debe declarar sus anchors `data-tour` como parte de la implementacion, no como un ajuste posterior.

## 6. Criterios de aceptacion de Fase 1

Fase 1 debe considerarse cerrada solo si se cumple todo lo siguiente:

- Existe una capa de contenido versionada que cubre `emision-tradicional`, `cobranza-modal`, `punto-venta` y `cliente-form`.
- Ninguno de esos cuatro flujos depende de `videoUrl` hardcodeado dentro de componentes de UI.
- Emision Tradicional conserva su CTA en la fila de acciones del formulario.
- CobranzaModal conserva su CTA en el header del modal y solo en contextos elegibles.
- Punto de Venta incorpora `Ver guia` en su header propio sin invadir checkout ni grilla.
- ClienteForm incorpora `Ver guia` en el header del drawer para create y edit.
- Cada superficie tiene definido su tipo de ayuda final.
- Los tours de Fase 1 se abren desde el CTA correcto y no desde el header global.
- Con switch global apagado, no se muestran CTAs ni quedan tours activos.
- Con switch global encendido, cada CTA aparece solo en su superficie y contexto correctos.
- Si no hay video real aun, la experiencia se comporta segun la politica central sin errores visuales ni funcionales.
- Build y lint siguen limpios despues de la implementacion.

## 7. Que quedara preparado para Fase 2

Si Fase 1 se ejecuta con este criterio, quedaran preparadas estas extensiones sin rehacer el sistema:

- agregar nuevas superficies solo registrando contenido y, cuando aplique, un tour nuevo,
- reutilizar el mismo patron en paginas, modales y drawers,
- reemplazar videos temporales por videos reales sin tocar componentes,
- abrir un patron lectura-only para superficies medianas sin inventar otra UI,
- migrar modulos como Lista de precios, Inventario, Configuracion o Control de caja sobre el mismo contrato,
- evaluar luego una capa de segmentacion por tenant/usuario sin mezclarla con la Fase 1,
- evaluar en una fase posterior soporte tecnico para tours cross-tab o cross-panel.

Fase 2 no deberia empezar creando otro patron. Deberia empezar reutilizando exactamente el que Fase 1 deje cerrado.

## 8. Conclusion final

La ejecucion correcta de Fase 1 no consiste en agregar cuatro botones de ayuda. Consiste en dejar un sistema reusable, con una sola logica de CTA, una sola forma de resolver contenido y una sola disciplina para pagina, modal y drawer.

La estrategia correcta es:

1. consolidar primero la capa de contenido,
2. estabilizar Emision y Cobranza sobre esa capa,
3. extender luego a POS,
4. cerrar ClienteForm al final por ser la superficie mas sensible.

Si el equipo respeta esta secuencia, Fase 1 se puede implementar sin improvisacion, sin hardcodes, sin duplicaciones y sin abrir deuda de UX que luego obligue a retroceder.