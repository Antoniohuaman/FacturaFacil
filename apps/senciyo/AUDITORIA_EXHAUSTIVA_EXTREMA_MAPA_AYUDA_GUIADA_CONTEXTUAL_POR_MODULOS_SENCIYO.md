# Auditoria exhaustiva extrema - Mapa de ayuda guiada contextual por modulos en SenciYo

## 1. Resumen ejecutivo

SenciYo ya tiene una base funcional de ayuda guiada contextual, pero hoy esa base esta aplicada solo a una porcion reducida del producto y todavia no existe un criterio transversal estable para decidir donde debe aparecer un disparador visible de ayuda y donde no.

La conclusion principal de esta auditoria es la siguiente:

- El producto no necesita un Ver guia en todos los modulos.
- El producto si necesita un patron consistente de ayuda contextual visible en superficies operativas, secuenciales, de alto riesgo o de alta ambiguedad.
- La ayuda visible debe concentrarse en formularios complejos, flujos de cobro, venta, configuracion critica y pantallas con varios bloques funcionales o varios tabs con una logica poco obvia.
- Los listados, dashboards de consulta, modales de confirmacion, vistas placeholder y superficies autoexplicativas no deben llenarse con ayuda visible porque eso diluye el valor del sistema.

La mejor forma de escalar este sistema en SenciYo es trabajar con cuatro niveles:

1. Sin ayuda visible: superficies simples, consultivas o transitorias.
2. Microayuda local: tooltips, helperText, textos de apoyo y ayudas incrustadas.
3. Ver guia con lectura: superficies de complejidad media donde hace falta orientacion conceptual pero no un tour fuerte.
4. Ver guia con lectura + video + tour in-app: superficies operativas criticas donde el usuario ejecuta un flujo secuencial y puede equivocarse con impacto real.

La base tecnica actual sirve para seguir creciendo, pero no esta lista para un despliegue indiscriminado en todo el producto sin antes corregir temas de segmentacion por tenant/usuario, catalogo central de superficies elegibles y estandarizacion del modo lectura-only.

## 2. Inventario de modulos actuales

Durante la auditoria se revisaron rutas, shells, pantallas principales, formularios y modales de los modulos privados actuales. El mapa funcional observado es este:

| Modulo | Superficies principales observadas |
| --- | --- |
| Comprobantes electronicos | Lista de comprobantes, borradores, selector de modo, Emision Tradicional, Punto de Venta, cobranza, cronograma de credito, vista previa |
| Catalogo de articulos | Listado de productos/servicios, modal de producto, importacion, categorias, configuracion de campos |
| Lista de precios | Productos, columnas, paquetes, importacion, reglas de valorizacion y visibilidad |
| Inventario | Stock actual, resumen, alertas, movimientos, configuracion de vista, ajustes, transferencias, exportacion |
| Control de caja | Apertura, cierre, movimientos, historial, configuracion, reportes y tabs operativas |
| Gestion de cobranzas | Dashboard, tabs de cuentas por cobrar, historial, detalles, registro de cobro, asignacion a cuotas |
| Documentos comerciales | Tabs de documentos, formularios de cotizacion y nota de venta, detalle de productos, condiciones comerciales |
| Gestion de clientes | Listado, formularios de cliente, importacion, historial de compras, direcciones, contactos, datos SUNAT |
| Indicadores | Resumen, reportes, filtros, notificaciones de indicadores, modales analiticos |
| Configuracion del sistema | Dashboard, empresa, establecimientos, almacenes, series, negocio, usuarios, cajas, diseno de comprobantes |
| Administrar empresas | Vista lista/tarjetas, seleccion de empresa, crear/editar, favorita, activacion |
| Notificaciones | Placeholder de historial de notificaciones |

Ademas de esas superficies, se observaron ayudas locales ya existentes en:

- ProductModal del catalogo.
- ImportarClientesPage.
- SelectorModoEmision.
- ColumnManagement de lista de precios.
- InventarioSituacionPage.
- Diversos formularios de configuracion con helperText y textos de apoyo.

## 3. Evaluacion modulo por modulo

### 3.1 Comprobantes electronicos

Base observada: existe ayuda guiada real en Emision Tradicional y en CobranzaModal. El selector de modo ya trae una seccion explicativa integrada. El sistema ya esta montado globalmente en Header, PrivateLayout, AccesoGuiaContextual, usarTour, TourFlotante y ProveedorAyudaGuiada.

| Superficie | Criticidad | Complejidad | Frecuencia | Recomendacion | Ubicacion sugerida | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Lista de comprobantes / borradores | Alta | Media | Alta | Sin ayuda visible | Ninguna | No conviene agregar Ver guia aqui. Es una superficie de consulta y gestion, no el flujo nuclear de aprendizaje. |
| Selector de modo de emision | Media | Media | Media | Mantener ayuda incrustada actual | Sin nuevo boton visible | Ya explica diferencias entre Emision Tradicional y POS. Agregar otro trigger seria redundante. |
| Emision Tradicional | Muy alta | Muy alta | Muy alta | Ver guia con lectura + video + tour in-app | En la misma fila de acciones del formulario, junto a + Campos | Si, maxima prioridad. Ya es el patron mas correcto del producto. |
| CobranzaModal | Muy alta | Alta | Alta | Ver guia con lectura + video + tour in-app | Header del modal | Si, maxima prioridad. El modal completa una accion monetaria sensible y ya tiene patron valido. |
| Cronograma de credito / modales secundarios de pago | Alta | Media | Media | Lectura breve contextual solo si el soporte lo exige | En el header del modal o bloque de credito | No como rollout inicial. Primero basta con microcopy y la guia de cobranza. |
| Vista previa, modal de exito, confirmaciones | Media | Baja | Alta | Sin ayuda visible | Ninguna | No deben cargar ruido. Son superficies transitorias. |

### 3.2 Punto de venta

Base observada: PuntoVenta es una pantalla operacional compacta con cabecera propia, grilla de productos y panel de checkout. Es un flujo de alta frecuencia y alta velocidad, pero con impacto directo en caja, cobro y emision.

| Superficie | Criticidad | Complejidad | Frecuencia | Recomendacion | Ubicacion sugerida | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard de POS | Media | Baja | Media | Sin ayuda visible | Ninguna | Es una superficie de orientacion, no de ejecucion compleja. |
| Pantalla principal de Punto de Venta | Muy alta | Muy alta | Muy alta | Ver guia con lectura + video + tour in-app | Header superior de POS, junto a las acciones derechas | Si, maxima prioridad. Es una superficie de aprendizaje critico y flujo secuencial. |
| Checkout, cobro y medios de pago dentro de POS | Muy alta | Alta | Muy alta | Cubrir desde la guia principal y reutilizar ayuda de cobranza | Sin duplicar triggers internos al inicio | Conviene una sola entrada fuerte para no saturar el checkout. |
| Vista completa de formulario desde POS | Alta | Media | Media | Derivar a la guia de Emision Tradicional | No crear una guia nueva | La complejidad ya existe y ya tiene superficie propia. |

### 3.3 Catalogo de articulos

Base observada: el catalogo tiene complejidad real en el modal de producto y ya usa tooltips, configuracion de campos y ayudas por seccion. El listado principal es mas convencional.

| Superficie | Criticidad | Complejidad | Frecuencia | Recomendacion | Ubicacion sugerida | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Listado principal de productos/servicios | Media | Media | Alta | Sin ayuda visible | Ninguna | Es CRUD estandar con baja necesidad de guia persistente. |
| ProductModal nuevo/editar | Alta | Alta | Alta | Ver guia con lectura + video | Header del modal, junto a + Mas campos | Si, prioridad media-alta. Tiene muchos bloques, configuraciones y dependencias. |
| Configuracion de campos / FieldsConfigPanel | Media | Media | Media | Microayuda local | Mantener tooltips y textos cortos | No necesita trigger visible propio. |
| Importacion de productos | Alta | Alta | Media | Mejorar ayuda local existente antes de crear nuevo trigger | Integrar video o lectura dentro del panel/pagina de importacion | No agregaria Ver guia visible en fase 1. Primero consolidar la ayuda del flujo de importacion. |
| Modal de categorias | Baja | Baja | Media | Sin ayuda visible | Ninguna | Es un CRUD pequeno y autoexplicativo. |

### 3.4 Lista de precios

Base observada: este modulo tiene mayor complejidad conceptual que visual. Las pestañas, las columnas personalizadas, las reglas fijas vs por cantidad y la importacion generan una curva de aprendizaje superior a la de un listado normal.

| Superficie | Criticidad | Complejidad | Frecuencia | Recomendacion | Ubicacion sugerida | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Shell principal del modulo | Alta | Alta | Media | Ver guia con lectura + video | PageHeader o barra principal de acciones | Si, prioridad alta. El usuario necesita entender el modelo de trabajo antes de tocar columnas y paquetes. |
| ColumnManagement | Alta | Alta | Media | Mantener ayuda textual local; sin segundo trigger fuerte al inicio | Dentro de la tabla y modales ya existentes | La microayuda actual resuelve bien el detalle operativo. |
| Configuracion de columnas y reglas | Alta | Alta | Media | Lectura breve opcional si soporte detecta friccion | Header del modal, no en cada campo | Fase 2, no fase 1. |
| Importacion de precios | Alta | Alta | Baja-media | Cubrir desde la guia del modulo y apoyo local en la pestana | Dentro de la pestana de importacion | No abrir un segundo frente de guias en la primera iteracion. |
| Paquetes y tablas de productos | Media | Media | Media | Sin ayuda visible | Ninguna | Mejor usar microcopy y defaults correctos. |

### 3.5 Inventario

Base observada: Inventario combina lectura operativa con acciones sensibles como ajustar, transferir, actualizar umbrales y exportar. La superficie principal ya usa mensajes de apoyo y tooltips de umbrales.

| Superficie | Criticidad | Complejidad | Frecuencia | Recomendacion | Ubicacion sugerida | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Vista principal de stock actual | Alta | Alta | Alta | Ver guia con lectura + video | Toolbar superior o encabezado del modulo | Si, prioridad media-alta. Hay filtros, columnas, densidad, almacenes y acciones sensibles. |
| Resumen, alertas y movimientos | Media | Media | Media | Sin ayuda visible | Ninguna | Son mas analiticas o de consulta que secuenciales. |
| Transferencia de stock | Muy alta | Alta | Media | Ver guia con lectura | Header del modal o panel de transferencia | Si, pero solo lectura inicial. Es sensible, aunque no requiere tour largo en primera fase. |
| Ajuste de stock | Muy alta | Media | Media | Ver guia con lectura | Header del modal | Si, misma logica que transferencia. |
| Configuracion de vista / exportacion / acciones masivas | Media | Media | Baja-media | Microayuda local | Tooltips y helperText | No conviene un trigger visible adicional. |

### 3.6 Control de caja

Base observada: es uno de los dominios mas sensibles del producto. Tiene varios tabs, estados de caja, apertura, cierre y movimientos. El error del usuario puede tener impacto monetario y operativo inmediato.

| Superficie | Criticidad | Complejidad | Frecuencia | Recomendacion | Ubicacion sugerida | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Shell principal del modulo / Home | Muy alta | Alta | Muy alta | Ver guia con lectura + video | Header del modulo | Si, maxima prioridad. El usuario necesita entender el flujo general de caja. |
| Apertura de caja | Muy alta | Media | Alta | Cubrir desde la guia del modulo y agregar lectura local si hace falta | En el panel de apertura, no duplicar si el modulo ya la explica bien | No abrir dos triggers iniciales salvo evidencia de soporte. |
| Cierre de caja | Muy alta | Alta | Alta | Cubrir desde la guia del modulo y agregar lectura local si hace falta | En el panel de cierre | Mismo criterio que apertura. |
| Registrar movimiento | Muy alta | Alta | Media | Ver guia con lectura si soporte muestra errores frecuentes | Header del formulario/modal | Prioridad media. Es sensible, pero puede esperar a la segunda ola. |
| Historial, reportes y configuracion | Media | Media | Media | Sin ayuda visible | Ninguna | Son superficies mas comprensibles por inspeccion. |

### 3.7 Gestion de cobranzas

Base observada: el dashboard de cobranzas es denso, tabulado y con operaciones financieras. Ademas se conecta conceptualmente con el CobranzaModal ya auditado.

| Superficie | Criticidad | Complejidad | Frecuencia | Recomendacion | Ubicacion sugerida | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard principal de cobranzas | Muy alta | Alta | Alta | Ver guia con lectura + video | PageHeader o barra principal del dashboard | Si, maxima prioridad. El modulo tiene relacion entre cuentas, pagos, cuotas y estados. |
| Registro de cobro desde dashboard | Muy alta | Alta | Alta | Reutilizar la ayuda del CobranzaModal | Header del modal | No duplicar otra guia distinta. |
| Detalles de cuenta, historial y vistas de consulta | Media | Media | Media | Sin ayuda visible | Ninguna | Son superficies de lectura o inspeccion. |
| Distribucion de cuotas / subflujos de credito | Alta | Alta | Media | Lectura breve bajo demanda | Dentro del modal o bloque especializado | Fase 2 si la asignacion genera friccion recurrente. |

### 3.8 Documentos comerciales

Base observada: los formularios de cotizacion y nota de venta reutilizan patrones complejos del dominio de comprobantes. La parte dificil no esta en el listado sino en la construccion del documento.

| Superficie | Criticidad | Complejidad | Frecuencia | Recomendacion | Ubicacion sugerida | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Tabs/listado principal de documentos | Media | Media | Media | Sin ayuda visible | Ninguna | El valor no esta en la lista sino en el flujo de crear/editar. |
| Formulario de cotizacion | Alta | Alta | Media | Ver guia con lectura + video | Misma zona de acciones del formulario | Si, prioridad media-alta. Tiene curva de aprendizaje similar a Emision Tradicional. |
| Formulario de nota de venta | Alta | Alta | Media | Ver guia con lectura + video | Misma zona de acciones del formulario | Si, prioridad media-alta. |
| Modales de detalle, confirmacion y apoyo | Media | Baja-media | Media | Sin ayuda visible | Ninguna | No deben fragmentar mas el sistema. |

### 3.9 Gestion de clientes

Base observada: el formulario de cliente es grande, con tabs, persistencia local, direcciones, contactos, datos SUNAT y configuracion comercial. La importacion ya tiene panel de Ayuda y varios tooltips.

| Superficie | Criticidad | Complejidad | Frecuencia | Recomendacion | Ubicacion sugerida | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Listado principal de clientes | Media | Media | Alta | Sin ayuda visible | Ninguna | Es una tabla operativa relativamente estandar. |
| ClienteForm nuevo/editar | Alta | Muy alta | Alta | Ver guia con lectura + video + tour in-app ligero | Header del formulario o drawer | Si, maxima prioridad. Tiene demasiados bloques para confiar solo en tooltips. |
| Importar clientes | Alta | Alta | Media | Mantener y fortalecer la ayuda lateral actual; no sumar trigger visible en fase 1 | Dentro del panel Ayuda existente | No agregaria otro Ver guia ahora. Ya existe una superficie de ayuda contextual fuerte. |
| Historial de compras y detalles consultivos | Media | Baja-media | Media | Sin ayuda visible | Ninguna | Son superficies de consulta. |

### 3.10 Indicadores

Base observada: es un modulo mayormente analitico y de lectura. Tiene filtros, KPIs, reportes y un modal de notificaciones, pero el usuario no ejecuta un flujo secuencial comparable a vender o cobrar.

| Superficie | Criticidad | Complejidad | Frecuencia | Recomendacion | Ubicacion sugerida | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Resumen de indicadores | Media | Media | Alta | Sin ayuda visible | Ninguna | Debe mantenerse limpio y orientado a lectura. |
| ReportsHub / reportes | Media | Alta | Media | Microayuda localizada si hace falta | Tooltips o textos de seccion | No conviene un Ver guia persistente. |
| Configuracion de notificaciones de indicadores | Media | Media | Baja-media | Lectura breve solo si soporte la requiere | Dentro del modal | Baja prioridad. |

### 3.11 Configuracion del sistema

Base observada: es el dominio con mayor necesidad de orientacion estructural. No solo hay formularios, tambien hay dependencias entre modulos y un orden implicito de configuracion que hoy solo se deduce por experiencia.

| Superficie | Criticidad | Complejidad | Frecuencia | Recomendacion | Ubicacion sugerida | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Dashboard de configuracion | Muy alta | Alta | Media | Ver guia con lectura + video | Header del dashboard | Si, maxima prioridad. Debe explicar el orden de puesta en marcha del sistema. |
| Datos de empresa | Muy alta | Media | Baja-media | Ver guia con lectura + video | Header de la pagina | Si, prioridad alta. Es critica por implicancias fiscales y de identidad. |
| Establecimientos | Alta | Media | Baja-media | Ver guia con lectura | Header de la pagina | Si, pero sin video inicial. |
| Almacenes | Alta | Media | Baja-media | Ver guia con lectura | Header de la pagina | Si, misma logica que establecimientos. |
| Series de comprobantes | Muy alta | Alta | Baja-media | Ver guia con lectura + video | Header de la pagina | Si, maxima prioridad dentro de configuracion. La logica tributaria y correlativa no es obvia. |
| Configuracion de negocio | Muy alta | Alta | Media | Ver guia con lectura + video | Header de la pagina | Si, maxima prioridad. Tiene tabs y dependencias funcionales importantes. |
| Usuarios y roles | Muy alta | Alta | Baja-media | Ver guia con lectura + video | Header de la pagina | Si, prioridad alta. Los permisos son delicados y faciles de configurar mal. |
| Cajas | Alta | Media | Baja-media | Ver guia con lectura | Header de la pagina | Si, pero sin tour fuerte en primera fase. |
| Diseno de comprobantes | Alta | Muy alta | Baja | Ver guia con lectura + video | Header de la pagina, junto a Exportar/Importar/Restaurar | Si, prioridad media-alta. Es una superficie compleja aunque menos frecuente. |
| Subcomponentes internos de negocio, impuestos, cuentas, etc. | Alta | Media | Media | Cubrir desde la guia de la pagina principal | Sin triggers por seccion al inicio | Evitar proliferacion de botones internos. |

### 3.12 Administrar empresas

Base observada: aunque tiene filtros, cambio de modo y gestion de workspaces, la superficie es relativamente directa y no ejecuta un flujo tecnico denso.

| Superficie | Criticidad | Complejidad | Frecuencia | Recomendacion | Ubicacion sugerida | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Administrar empresas | Media | Baja-media | Baja-media | Sin ayuda visible | Ninguna | No justifica un Ver guia persistente. Basta con textos cortos y buenos estados vacios. |

### 3.13 Notificaciones

Base observada: NotificationsCenterPage es hoy una pantalla placeholder, no un modulo funcional completo.

| Superficie | Criticidad | Complejidad | Frecuencia | Recomendacion | Ubicacion sugerida | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Centro de notificaciones | Baja | Baja | Baja | Sin ayuda visible | Ninguna | No se debe disenar ayuda guiada sobre una superficie aun no implementada. |

## 4. Clasificacion transversal de superficies por necesidad real de ayuda

### Grupo A - Deben tener Ver guia con lectura + video + tour in-app

- Emision Tradicional.
- CobranzaModal.
- Pantalla principal de Punto de Venta.
- ClienteForm nuevo/editar.

Estas superficies cumplen los cuatro criterios duros al mismo tiempo: alto impacto, varios pasos, riesgo de error y aprendizaje secuencial.

### Grupo B - Deben tener Ver guia con lectura + video, pero no necesariamente tour fuerte inicial

- Dashboard de configuracion.
- Datos de empresa.
- Series de comprobantes.
- Configuracion de negocio.
- Usuarios y roles.
- Dashboard principal de cobranzas.
- Shell principal de control de caja.
- Shell principal de lista de precios.
- Vista principal de inventario.
- Formulario de cotizacion.
- Formulario de nota de venta.
- Diseno de comprobantes.
- ProductModal del catalogo.

Aqui la complejidad es alta, pero no siempre existe un recorrido secuencial tan estable como para justificar un tour agresivo en la primera fase.

### Grupo C - Deben tener solo lectura contextual

- Establecimientos.
- Almacenes.
- Cajas de configuracion.
- Transferencia de stock.
- Ajuste de stock.
- Registrar movimiento de caja, si soporte detecta error recurrente.

Son superficies sensibles, pero mas acotadas. Una lectura clara suele ser suficiente.

### Grupo D - No deben tener ayuda visible persistente

- Listados generales y tabs consultivas.
- Dashboards puramente analiticos.
- Historiales y vistas de detalle.
- Modales de exito, confirmacion o preview.
- Placeholder de notificaciones.
- Administrar empresas.
- Importar clientes, mientras se conserve y fortalezca su panel de Ayuda actual.
- Selector de modo de emision, porque ya trae explicacion visible integrada.

## 5. Ubicacion sugerida del disparador contextual

Para mantener coherencia visual y evitar ruido, el disparador de ayuda debe ubicarse solo en uno de estos puntos canonicos:

| Tipo de superficie | Ubicacion correcta | Regla |
| --- | --- | --- |
| Pantalla con PageHeader y flujo complejo | Lado derecho del PageHeader, junto a acciones secundarias | No crear filas nuevas debajo del titulo si no es necesario |
| Formulario denso con barra de acciones propia | En la misma fila de acciones que Vista previa, + Campos o acciones equivalentes | Debe convivir con las acciones operativas, no aparecer suelto encima del formulario |
| Modal complejo y operativo | Header del modal, alineado con acciones secundarias | No esconderlo al pie del modal |
| Pestana con ayuda lateral ya existente | Integrado dentro de ese panel de ayuda | No duplicar boton mas panel |
| Dashboard o listado simple | No agregar disparador | Si la necesidad aparece, resolver con microayuda |

Ubicaciones recomendadas mas importantes:

- Emision Tradicional: exactamente en la fila de acciones de CompactDocumentForm, junto a + Campos.
- CobranzaModal: header del modal.
- Punto de Venta: header superior de la pagina, junto a las acciones derechas.
- ClienteForm: header del formulario o drawer.
- Configuracion del sistema: PageHeader de cada pagina compleja.
- Lista de precios: PageHeader o barra principal de acciones.
- Inventario: toolbar superior del stock actual.
- Control de caja y cobranzas: header principal del modulo.

## 6. Priorizacion recomendada de implementacion

### Prioridad 1

- Emision Tradicional.
- CobranzaModal.
- Punto de Venta.
- ClienteForm.
- Dashboard de configuracion.
- Series de comprobantes.
- Configuracion de negocio.
- Dashboard de cobranzas.
- Control de caja.

Motivo: concentran dinero, operacion diaria, curva de aprendizaje real y probabilidad de error con impacto.

### Prioridad 2

- ProductModal.
- Inventario principal.
- Transferencia y ajuste de stock.
- Formularios de cotizacion y nota de venta.
- Datos de empresa.
- Usuarios y roles.
- Diseno de comprobantes.
- Establecimientos, almacenes y cajas de configuracion.

Motivo: son importantes, pero no necesariamente el primer cuello de botella del usuario nuevo.

### Prioridad 3

- Lista de precios.
- Importaciones especializadas.
- Subflujos de credito.
- Pantallas de lectura analitica.

Motivo: conviene activarlas despues de medir soporte, adopcion y friccion real en produccion.

## 7. Patron coherente recomendado para todo el producto

El patron correcto para SenciYo no es llenar el sistema de ayuda, sino aplicar una logica unica:

1. El Header global debe conservar solo el switch de Ayuda guiada.
2. Cada superficie local compleja debe decidir si expone o no su propio Ver guia.
3. El switch global solo controla visibilidad y disponibilidad de esos disparadores locales.
4. El punto principal de lanzamiento debe ser la superficie contextual, no el menu global.
5. La ayuda debe abrirse desde un CTA unico y estable: Ver guia.
6. Si la superficie amerita solo lectura, el CTA debe abrir una experiencia de lectura breve y no un tour vacio.
7. Si la superficie amerita lectura + video + tour, el mismo CTA puede ofrecer esas tres capas dentro de una experiencia unica.
8. No se deben crear triggers por cada campo, por cada tab ni por cada modal pequeno.

En otras palabras, el sistema debe quedarse con pocos disparadores, pero muy bien ubicados y con alto valor.

## 8. Problemas y limites detectados en la arquitectura actual

### 8.1 Persistencia no segmentada realmente por tenant y usuario

almacenTour.ts sabe construir claves con tenantId y usuarioId, pero ProveedorAyudaGuiada lee y guarda sin pasar identidad real. Ademas, en main.tsx el ProveedorAyudaGuiada se monta antes de TenantProvider. En la practica, la persistencia hoy queda globalizada mas de lo deseable.

Impacto:

- Un mismo navegador puede compartir estado de ayuda entre empresas o contextos que no deberian contaminarse.
- La escalabilidad por workspace multiempresa queda debil.

### 8.2 El modelo actual esta mas preparado para tours que para lectura-only estandarizada

AccesoGuiaContextual permite onClick, pero el sistema fuerte actual esta centrado en usarTour + TourFlotante. Eso resuelve muy bien tours secuenciales, pero todavia no define de forma canonica una ayuda contextual solo de lectura para docenas de superficies medianas.

Impacto:

- Si se intenta expandir sin un patron lectura-only, cada modulo puede improvisar su propia ayuda y romper coherencia.

### 8.3 Runtime parcialmente fragmentado

Existe overlay global en PrivateLayout y tambien casos locales como CobranzaModal con uso local de usarTour y TourFlotante. El patron funciona, pero la gobernanza aun no esta completamente unificada.

Impacto:

- Escala, pero con riesgo de divergencia de implementacion entre modulos.

### 8.4 El contenido actual aun tiene rasgos temporales

contenidoAyudaTemporal.ts y los textos actuales resuelven una necesidad inmediata, pero no constituyen todavia un catalogo editorial estable por modulo.

Impacto:

- El sistema existe, pero la capa de contenido aun no esta industrializada.

### 8.5 Falta un catalogo central de superficies elegibles

Hoy no existe un mapa oficial del tipo: modulo, superficie, prioridad, tipo de ayuda, ubicacion canonica, owner funcional.

Impacto:

- Sin ese inventario, la expansion puede terminar siendo oportunista y desigual.

### 8.6 Heterogeneidad de shells visuales

No todas las pantallas usan el mismo patron: algunas usan PageHeader, otras toolbars propias, otras headers internos, otras modales con layouts particulares.

Impacto:

- El sistema de ayuda necesita reglas de insercion muy claras para no terminar visualmente inconsistente.

### 8.7 Fragilidad inherente de tours por selector

Los tours dependen de data-tour y selectores DOM estables. Eso es razonable, pero obliga a disciplina de mantenimiento.

Impacto:

- Cualquier refactor visual puede romper pasos si no se incluye la actualizacion del tour como parte del cambio.

### 8.8 Centro de ayuda global aun no resuelto

UserDropdown conserva un item Centro de ayuda como placeholder via alert. Eso muestra que la ayuda guiada contextual y un eventual centro de ayuda global todavia no estan articulados como una sola estrategia.

## 9. Fortalezas reales del sistema actual

Pese a los limites, la base ya tiene varias piezas correctas y reutilizables:

- El Header ya quedo reducido a switch global, que es el comportamiento mas sano.
- AccesoGuiaContextual ya respeta ayudaActivada y permite lanzamiento contextual real.
- TourFlotante ya soporta lectura, video embebido, expandir/reducir y control local del modo de ayuda.
- usarTour ya respeta el switch global y corta la ayuda cuando corresponde.
- ProveedorAyudaGuiada ya maneja activacion, completado, omitido y versionado de tours.
- Emision Tradicional ya demostro una ubicacion correcta del CTA contextual.
- CobranzaModal ya demostro que el patron tambien funciona dentro de un modal operativo.
- El producto ya usa muchas microayudas locales, lo cual facilita una estrategia de capas en vez de una estrategia unica para todo.

La conclusion tecnica es clara: la base no debe rehacerse; debe ordenarse y extenderse con criterio.

## 10. Conclusion final

SenciYo si debe expandir la ayuda contextual visible, pero solo en superficies donde exista una necesidad real de orientacion operativa. La expansion correcta no es horizontal ni uniforme; es selectiva.

Donde si debe haber Ver guia visible:

- Venta y cobro.
- POS.
- Formularios documentales complejos.
- Formularios complejos de cliente.
- Configuracion critica del sistema.
- Modulos operativos con varias capas conceptuales como cobranzas, inventario y lista de precios.

Donde no debe haber Ver guia visible:

- Listados generales.
- Dashboards de lectura.
- Modales transitorios.
- Pantallas placeholder.
- Superficies que ya tienen una ayuda incrustada suficiente.

Mi recomendacion final es esta:

1. Mantener el header solo como switch global.
2. Usar Ver guia solo como CTA local en superficies complejas.
3. Reservar tour in-app fuerte para muy pocos flujos realmente secuenciales.
4. Resolver antes de escalar la segmentacion por tenant/usuario y el patron canonico de lectura-only.
5. Implementar por oleadas segun prioridad funcional, no por modulo completo.

## 11. Anexo tecnico - Evidencia base auditada

Archivos nucleares del sistema de ayuda observados:

- apps/senciyo/src/main.tsx
- apps/senciyo/src/layouts/PrivateLayout.tsx
- apps/senciyo/src/layouts/components/Header.tsx
- apps/senciyo/src/layouts/components/UserDropdown.tsx
- apps/senciyo/src/shared/tour/ProveedorAyudaGuiada.tsx
- apps/senciyo/src/shared/tour/almacenTour.ts
- apps/senciyo/src/shared/tour/usarAyudaGuiada.ts
- apps/senciyo/src/shared/tour/usarTour.ts
- apps/senciyo/src/shared/tour/AccesoGuiaContextual.tsx
- apps/senciyo/src/shared/tour/TourFlotante.tsx
- apps/senciyo/src/shared/tour/contenidoAyudaTemporal.ts

Superficies con ayuda guiada ya integrada o parcialmente integrada:

- apps/senciyo/src/pages/Private/features/comprobantes-electronicos/pages/EmisionTradicional.tsx
- apps/senciyo/src/pages/Private/features/comprobantes-electronicos/shared/form-core/components/CompactDocumentForm.tsx
- apps/senciyo/src/pages/Private/features/comprobantes-electronicos/tour/tourPrimeraVenta.ts
- apps/senciyo/src/pages/Private/features/comprobantes-electronicos/shared/modales/CobranzaModal.tsx

Superficies con microayuda local relevante auditadas:

- apps/senciyo/src/pages/Private/features/comprobantes-electronicos/pages/SelectorModoEmision.tsx
- apps/senciyo/src/pages/Private/features/catalogo-articulos/components/ProductModal.tsx
- apps/senciyo/src/pages/Private/features/gestion-clientes/pages/ImportarClientesPage.tsx
- apps/senciyo/src/pages/Private/features/lista-precios/components/ColumnManagement.tsx
- apps/senciyo/src/pages/Private/features/gestion-inventario/components/disponibilidad/InventarioSituacionPage.tsx

Pantallas principales revisadas para clasificacion funcional:

- apps/senciyo/src/pages/Private/features/catalogo-articulos/pages/CatalogoArticulosMain.tsx
- apps/senciyo/src/pages/Private/features/lista-precios/pages/ListaPrecios.tsx
- apps/senciyo/src/pages/Private/features/gestion-inventario/pages/InventoryPage.tsx
- apps/senciyo/src/pages/Private/features/control-caja/pages/Home.tsx
- apps/senciyo/src/pages/Private/features/gestion-cobranzas/pages/CobranzasDashboard.tsx
- apps/senciyo/src/pages/Private/features/Documentos-negociacion/pages/DocumentosTabs.tsx
- apps/senciyo/src/pages/Private/features/Documentos-negociacion/components/FormularioCotizacion.tsx
- apps/senciyo/src/pages/Private/features/comprobantes-electronicos/punto-venta/pages/PuntoVenta.tsx
- apps/senciyo/src/pages/Private/features/gestion-clientes/pages/ClientesPage.tsx
- apps/senciyo/src/pages/Private/features/gestion-clientes/components/ClienteFormNew.tsx
- apps/senciyo/src/pages/Private/features/indicadores-negocio/pages/IndicadoresPage.tsx
- apps/senciyo/src/pages/Private/features/configuracion-sistema/paginas/PanelConfiguracion.tsx
- apps/senciyo/src/pages/Private/features/configuracion-sistema/paginas/ConfiguracionSeries.tsx
- apps/senciyo/src/pages/Private/features/configuracion-sistema/paginas/ConfiguracionNegocio.tsx
- apps/senciyo/src/pages/Private/features/configuracion-sistema/paginas/ConfiguracionDisenoComprobante.tsx
- apps/senciyo/src/pages/Private/features/administracion-empresas/paginas/AdministrarEmpresas.tsx
- apps/senciyo/src/pages/Private/features/notifications/pages/NotificationsCenterPage.tsx

Juicio final del anexo:

- La arquitectura actual es suficiente para una expansion dirigida.
- La arquitectura actual no es suficiente para una colonizacion indiscriminada de todo el producto sin una capa adicional de gobierno funcional y tecnico.