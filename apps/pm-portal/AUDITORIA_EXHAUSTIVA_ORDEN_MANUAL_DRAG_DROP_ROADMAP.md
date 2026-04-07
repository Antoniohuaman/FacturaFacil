# AUDITORIA EXHAUSTIVA EXTREMA - ORDEN MANUAL PERSISTENTE EN ROADMAP

## 1. Resumen ejecutivo

La evidencia de codigo confirma que hoy el orden de Objetivos, Iniciativas y Entregas en Roadmap no es manual ni persistente: las tres entidades se listan desde Supabase con `updated_at desc` en [src/infraestructura/repositorios/repositorioObjetivos.ts](src/infraestructura/repositorios/repositorioObjetivos.ts#L10), [src/infraestructura/repositorios/repositorioIniciativas.ts](src/infraestructura/repositorios/repositorioIniciativas.ts#L14) y [src/infraestructura/repositorios/repositorioEntregas.ts](src/infraestructura/repositorios/repositorioEntregas.ts#L10). Cronograma y las vistas CRUD luego filtran esos arreglos, pero en general no los reordenan antes de renderizar. El resultado practico es simple: quien edita un registro refresca la lista y el registro reaparece arriba o cambia de posicion porque su `updated_at` acaba de cambiar.

No existe hoy ningun campo persistido de orden manual para Objetivos, Iniciativas o Entregas. Eso se comprueba en los modelos [src/dominio/modelos.ts](src/dominio/modelos.ts#L6), [src/dominio/modelos.ts](src/dominio/modelos.ts#L18), [src/dominio/modelos.ts](src/dominio/modelos.ts#L38), en los esquemas [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L44), [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L63), [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L89), y en las tablas base [docs/sql_supabase_portal_pm.md](docs/sql_supabase_portal_pm.md#L34), [docs/sql_supabase_portal_pm.md](docs/sql_supabase_portal_pm.md#L44), [docs/sql_supabase_portal_pm.md](docs/sql_supabase_portal_pm.md#L60). El sistema si tiene precedentes de orden persistido en otras zonas: catalogos de ventanas y etapas con `orden` en [src/dominio/modelos.ts](src/dominio/modelos.ts#L60), [src/dominio/modelos.ts](src/dominio/modelos.ts#L71) y queries ordenadas por `orden asc` en [src/infraestructura/repositorios/repositorioAjustes.ts](src/infraestructura/repositorios/repositorioAjustes.ts#L109), [src/infraestructura/repositorios/repositorioAjustes.ts](src/infraestructura/repositorios/repositorioAjustes.ts#L159), asi como reordenamiento real en checklists y criterios en [src/aplicacion/casos-uso/lanzamientos.ts](src/aplicacion/casos-uso/lanzamientos.ts#L143) y [src/aplicacion/casos-uso/requerimientos.ts](src/aplicacion/casos-uso/requerimientos.ts#L141).

Conclusiones duras:

- Hoy un objetivo, iniciativa o entrega puede moverse tras editarse porque el orden real es recencia de modificacion, no posicion de usuario.
- No hay base persistida para drag and drop en las tres entidades del Roadmap.
- Resolverlo bien no es frontend-only: requiere frontend, modelo, persistencia, queries, casos de uso y reglas de alcance jerarquico.
- La estructura correcta del futuro orden no es una sola lista plana: debe ser orden global de objetivos, orden de iniciativas dentro de cada objetivo, y orden de entregables dentro de cada iniciativa, con tratamiento explicito para huerfanos.

## 2. Como se ordena hoy cada nivel

### 2.1 Objetivos

La fuente primaria del orden es el repositorio. `listar()` hace `.order('updated_at', { ascending: false })` en [src/infraestructura/repositorios/repositorioObjetivos.ts](src/infraestructura/repositorios/repositorioObjetivos.ts#L10). No hay orden por nombre, fecha de inicio, fecha de fin, prioridad ni estado en esa consulta.

La vista de Objetivos no cambia ese orden: carga la lista, la guarda tal cual con `setObjetivos(data)` en [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L47) y luego solo aplica `.filter(...)` en `objetivosFiltrados` en [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L60). La paginacion consume `items: objetivosFiltrados` en [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L81), por lo que conserva el orden que ya traia el arreglo.

En Cronograma pasa lo mismo. Se cargan objetivos con `listarObjetivos()` en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1181), se guardan con `setObjetivos(objetivosData)` en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1190), y `objetivosVisibles` solo filtra sobre `objetivos` en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1524). Luego `filasCronograma` recorre `objetivosCronograma.forEach(...)` en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1841), de modo que el orden visual final sigue el arreglo base.

Diagnostico exacto de Objetivos hoy: orden por `updated_at desc` desde backend y conservacion de ese orden en frontend salvo widgets analiticos del Resumen.

### 2.2 Iniciativas

La consulta base usa exactamente el mismo patron: `.order('updated_at', { ascending: false })` en [src/infraestructura/repositorios/repositorioIniciativas.ts](src/infraestructura/repositorios/repositorioIniciativas.ts#L14). No hay query por `rice`, `nombre`, `fecha_inicio`, `fecha_fin`, `prioridad` o `estado` como orden canonico.

La vista de Iniciativas tampoco reordena la lista principal. Carga con `listarIniciativas()` en [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L89), persiste en estado con `setIniciativas(listaIniciativas)` en [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L100) y luego solo filtra en `iniciativasFiltradas` en [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L148). La paginacion vuelve a respetar ese mismo orden en [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L175).

En Cronograma, `iniciativasFiltradas` se construye filtrando sobre `iniciativas` en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1473), `iniciativasVisibles` vuelve a filtrar sobre `iniciativas` en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1512), y `filasCronograma` recorre `iniciativasObjetivo.forEach(...)` dentro del orden ya recibido en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1931).

Solo hay un orden alternativo en un widget analitico del Resumen: `topIniciativasRice` ordena por estado y luego por `rice desc` en [src/presentacion/paginas/roadmap/PaginaRoadmap.tsx](src/presentacion/paginas/roadmap/PaginaRoadmap.tsx#L216). Ese sort no gobierna la lista canonica del modulo; solo gobierna la tarjeta Top 5.

Diagnostico exacto de Iniciativas hoy: orden canonico por `updated_at desc`, con un orden secundario analitico por RICE solo en el widget resumido.

### 2.3 Entregables / Entregas

La entidad Entrega tambien entra por recencia. `listar()` usa `.order('updated_at', { ascending: false })` en [src/infraestructura/repositorios/repositorioEntregas.ts](src/infraestructura/repositorios/repositorioEntregas.ts#L10).

La vista de Entregas tampoco cambia ese orden canonico. Carga con `listarEntregas()` en [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L98), guarda con `setEntregas(listaEntregas)` en [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L111), y luego solo filtra en `entregasFiltradas` en [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L224). La paginacion usa `items: entregasFiltradas` en [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L303).

En Cronograma, `entregasFiltradas` filtra sobre el arreglo `entregas` en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1490). Luego se agrupan por iniciativa y por el bucket sintetico `Sin iniciativa asignada`, pero sin reordenar la lista fuente, en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1567), [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1579) y [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1968).

Solo en el Resumen hay un widget alternativo: `proximasEntregas` ordena por `fecha_objetivo asc` en [src/presentacion/paginas/roadmap/PaginaRoadmap.tsx](src/presentacion/paginas/roadmap/PaginaRoadmap.tsx#L255). Igual que con RICE, eso no define el orden canonico de Entregas; solo ordena la tarjeta de proximidad temporal.

Diagnostico exacto de Entregas hoy: orden canonico por `updated_at desc`, con una vista resumida secundaria por `fecha_objetivo asc` para proximidad.

## 3. Causa real del reordenamiento al editar

La causa esta completamente trazada y no es vaga:

1. La base define la funcion `establecer_updated_at()` que hace `new.updated_at = now();` en [docs/sql_supabase_portal_pm.md](docs/sql_supabase_portal_pm.md#L9).
2. Las tablas `objetivos`, `iniciativas` y `entregas` tienen trigger `before update` en [docs/sql_supabase_portal_pm.md](docs/sql_supabase_portal_pm.md#L95), [docs/sql_supabase_portal_pm.md](docs/sql_supabase_portal_pm.md#L100) y [docs/sql_supabase_portal_pm.md](docs/sql_supabase_portal_pm.md#L105).
3. Los casos de uso de edicion llaman a `repositorio*.editar(...)` sin tocar ninguna posicion: [src/aplicacion/casos-uso/objetivos.ts](src/aplicacion/casos-uso/objetivos.ts#L22), [src/aplicacion/casos-uso/iniciativas.ts](src/aplicacion/casos-uso/iniciativas.ts#L35), [src/aplicacion/casos-uso/entregas.ts](src/aplicacion/casos-uso/entregas.ts#L33).
4. Los repositorios hacen `.update(entrada)` y luego devuelven el registro actualizado en [src/infraestructura/repositorios/repositorioObjetivos.ts](src/infraestructura/repositorios/repositorioObjetivos.ts#L32), [src/infraestructura/repositorios/repositorioIniciativas.ts](src/infraestructura/repositorios/repositorioIniciativas.ts#L36), [src/infraestructura/repositorios/repositorioEntregas.ts](src/infraestructura/repositorios/repositorioEntregas.ts#L30).
5. Los gestores de modal, despues de crear o editar, llaman `await alGuardado()` en [src/presentacion/paginas/roadmap/componentes/GestorModalObjetivoRoadmap.tsx](src/presentacion/paginas/roadmap/componentes/GestorModalObjetivoRoadmap.tsx#L57), [src/presentacion/paginas/roadmap/componentes/GestorModalIniciativaRoadmap.tsx](src/presentacion/paginas/roadmap/componentes/GestorModalIniciativaRoadmap.tsx#L161), [src/presentacion/paginas/roadmap/componentes/GestorModalEntregaRoadmap.tsx](src/presentacion/paginas/roadmap/componentes/GestorModalEntregaRoadmap.tsx#L108).
6. Las pantallas conectan `alGuardado` con una recarga completa de listas: [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L317), [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L560), [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L758), [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L3177).
7. Esa recarga vuelve a pedir el listado por `updated_at desc`.

La respuesta exacta a la pregunta principal es esta: hoy el registro “sube” o cambia de posicion despues de editarse porque la edicion actualiza `updated_at`, la pantalla vuelve a cargar la lista, y la lista viene ordenada por recencia de modificacion. No hay ningun mecanismo competidor de orden manual que conserve la posicion previa.

## 4. Estado actual del modelo y persistencia

### 4.1 Modelos, DTOs y tablas

No existe hoy un campo equivalente a `orden`, `posicion`, `sort_order`, `display_order`, `indice` o `ranking` en las tres entidades auditadas.

| Capa | Objetivos | Iniciativas | Entregas | Evidencia |
| --- | --- | --- | --- | --- |
| Modelo dominio | No | No | No | [src/dominio/modelos.ts](src/dominio/modelos.ts#L6), [src/dominio/modelos.ts](src/dominio/modelos.ts#L18), [src/dominio/modelos.ts](src/dominio/modelos.ts#L38) |
| Schema validacion | No | No | No | [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L44), [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L63), [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L89) |
| SQL tabla base | No | No | No | [docs/sql_supabase_portal_pm.md](docs/sql_supabase_portal_pm.md#L34), [docs/sql_supabase_portal_pm.md](docs/sql_supabase_portal_pm.md#L44), [docs/sql_supabase_portal_pm.md](docs/sql_supabase_portal_pm.md#L60) |
| Repositorio | No | No | No | [src/infraestructura/repositorios/repositorioObjetivos.ts](src/infraestructura/repositorios/repositorioObjetivos.ts), [src/infraestructura/repositorios/repositorioIniciativas.ts](src/infraestructura/repositorios/repositorioIniciativas.ts), [src/infraestructura/repositorios/repositorioEntregas.ts](src/infraestructura/repositorios/repositorioEntregas.ts) |
| UI modal | No | No | No | [src/presentacion/paginas/roadmap/componentes/ModalObjetivoRoadmap.tsx](src/presentacion/paginas/roadmap/componentes/ModalObjetivoRoadmap.tsx), [src/presentacion/paginas/roadmap/componentes/ModalIniciativaRoadmap.tsx](src/presentacion/paginas/roadmap/componentes/ModalIniciativaRoadmap.tsx), [src/presentacion/paginas/roadmap/componentes/ModalEntregaRoadmap.tsx](src/presentacion/paginas/roadmap/componentes/ModalEntregaRoadmap.tsx) |

### 4.2 Relaciones jerarquicas reales

La jerarquia existe, pero es parcialmente opcional:

- `Iniciativa.objetivo_id` es nullable en [src/dominio/modelos.ts](src/dominio/modelos.ts#L20) y en [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L65).
- `Entrega.iniciativa_id` es nullable en [src/dominio/modelos.ts](src/dominio/modelos.ts#L40) y en [src/compartido/validacion/esquemas.ts](src/compartido/validacion/esquemas.ts#L91).
- SQL respalda esa opcion con `on delete set null` en [docs/sql_supabase_portal_pm.md](docs/sql_supabase_portal_pm.md#L46) y [docs/sql_supabase_portal_pm.md](docs/sql_supabase_portal_pm.md#L62).

Eso significa que el sistema admite de forma nativa:

- iniciativas sin objetivo,
- entregas sin iniciativa,
- y por lo tanto buckets huerfanos reales en Cronograma.

Cronograma lo confirma con las filas sinteticas `FILA_SIN_OBJETIVO` y `FILA_SIN_INICIATIVA` en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L157) y [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L158).

### 4.3 Precedentes reales dentro del sistema

El portal ya conoce el patron de orden persistido, pero en otras entidades:

- Ventanas y etapas tienen `orden` en [src/dominio/modelos.ts](src/dominio/modelos.ts#L60) y [src/dominio/modelos.ts](src/dominio/modelos.ts#L71).
- Sus queries ordenan por `orden asc` en [src/infraestructura/repositorios/repositorioAjustes.ts](src/infraestructura/repositorios/repositorioAjustes.ts#L109) y [src/infraestructura/repositorios/repositorioAjustes.ts](src/infraestructura/repositorios/repositorioAjustes.ts#L159).
- Criterios de aceptacion y checklist de releases tienen casos de uso explicitos de reordenamiento en [src/aplicacion/casos-uso/requerimientos.ts](src/aplicacion/casos-uso/requerimientos.ts#L141) y [src/aplicacion/casos-uso/lanzamientos.ts](src/aplicacion/casos-uso/lanzamientos.ts#L143).

Conclusion: no existe base de orden manual en Objetivos/Iniciativas/Entregas, pero el sistema ya tiene patrones tecnicos validos para implementarlo en otras entidades.

## 5. Alcance correcto del orden manual por jerarquia

La estructura correcta no es un solo orden plano global para todo. La estructura correcta, consistente con el dominio actual, es esta:

### 5.1 Objetivos

Debe existir un orden global de objetivos del Roadmap. Es la capa raiz de la jerarquia y hoy no tiene padre.

### 5.2 Iniciativas

El orden correcto de iniciativas no deberia ser un solo orden global sin contexto. Deberia ser un orden por contenedor padre:

- orden de iniciativas dentro de cada objetivo,
- y un orden separado para iniciativas sin objetivo.

La razon es estructural: `objetivo_id` ya define el contenedor semantico y el Cronograma las renderiza agrupadas por objetivo en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1915).

### 5.3 Entregas

El orden correcto de entregas debe ser por iniciativa padre:

- orden de entregas dentro de cada iniciativa,
- y un orden separado para entregas sin iniciativa.

La restriccion importante aqui es de dominio, no de UX: como `Entrega` no tiene `objetivo_id`, una entrega sin iniciativa no puede quedar ordenada “dentro de un objetivo real”. En el modelo actual solo puede vivir en el bucket huerfano global que Cronograma renderiza como `Sin objetivo asignado -> Sin iniciativa asignada` en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1986).

### 5.4 Casos edge obligatorios

- Iniciativas sin objetivo: deben tener un orden propio dentro del bucket huerfano.
- Entregas sin iniciativa: deben tener un orden propio dentro del bucket huerfano de entregas sin iniciativa.
- Elementos filtrados: el filtro no debe reescribir posiciones; solo ocultar temporalmente elementos.
- Agrupaciones por estado o por ventana: esas vistas pueden seguir usando orden analitico si su proposito es analitico, no secuencial.
- Archivados: no existe hoy campo ni estado de archivado para estas tres entidades; por tanto no hay comportamiento actual que auditar en ese frente. La evidencia del modelo muestra solo `estado`, `prioridad`, fechas y relaciones en [src/dominio/modelos.ts](src/dominio/modelos.ts#L6), [src/dominio/modelos.ts](src/dominio/modelos.ts#L18), [src/dominio/modelos.ts](src/dominio/modelos.ts#L38).
- Cambio de padre: si una iniciativa cambia de objetivo o una entrega cambia de iniciativa, deja de estar en el mismo scope de orden y debe tratarse como movimiento entre contenedores, no como simple edicion textual.

## 6. Impacto en vistas del Roadmap

### 6.1 Vistas reales del modulo

La navegacion real de Roadmap expone cinco vistas en [src/presentacion/paginas/roadmap/NavegacionRoadmap.tsx](src/presentacion/paginas/roadmap/NavegacionRoadmap.tsx): Resumen, Cronograma, Objetivos, Iniciativas y Entregas. El router las confirma en [src/aplicacion/enrutador/enrutador.tsx](src/aplicacion/enrutador/enrutador.tsx#L196).

### 6.2 Vistas que si deberian respetar el orden manual

Estas vistas deberian respetarlo de forma directa porque representan el trabajo operativo del roadmap:

- Cronograma.
- Objetivos.
- Iniciativas.
- Entregas.

Justificacion:

- Objetivos, Iniciativas y Entregas hoy muestran listas planas derivadas de los arreglos cargados y filtrados en [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L60), [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L148), [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L224).
- Cronograma construye la jerarquia completa y es donde la expectativa de “mi orden” es mas fuerte, en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx#L1841).

En las vistas planas, si el orden futuro es jerarquico, la regla consistente deberia ser:

- en Objetivos: orden global de objetivos,
- en Iniciativas: primero el orden del objetivo padre, luego el orden interno de la iniciativa dentro de ese objetivo, y al final el bucket sin objetivo,
- en Entregas: primero el orden del objetivo derivado, luego el de la iniciativa derivada, luego el orden interno de la entrega; al final las entregas sin iniciativa.

### 6.3 Vistas que no necesariamente deben respetarlo de forma literal

Resumen no deberia imponerse como lista secuencial pura en todos sus widgets, porque hoy ya usa ordenes analiticos deliberados:

- Top 5 iniciativas por RICE en [src/presentacion/paginas/roadmap/PaginaRoadmap.tsx](src/presentacion/paginas/roadmap/PaginaRoadmap.tsx#L216).
- Proximas entregas por `fecha_objetivo asc` en [src/presentacion/paginas/roadmap/PaginaRoadmap.tsx](src/presentacion/paginas/roadmap/PaginaRoadmap.tsx#L255).
- Progreso por objetivo ordenado por estado y puntaje de actividad en [src/presentacion/paginas/roadmap/roadmapProgreso.ts](src/presentacion/paginas/roadmap/roadmapProgreso.ts#L77) y [src/presentacion/paginas/roadmap/roadmapProgreso.ts](src/presentacion/paginas/roadmap/roadmapProgreso.ts#L124).

Por tanto, en Resumen la regla correcta no es “todo debe seguir el orden manual”, sino esta:

- vistas operativas y jerarquicas: si,
- widgets analiticos y de priorizacion: no necesariamente.

### 6.4 Impacto indirecto fuera de la navegacion principal de Roadmap

Matriz de Valor no esta dentro de la navegacion de Roadmap, pero carga iniciativas con `listarIniciativas()` en [src/presentacion/paginas/matriz-valor/PaginaMatrizValor.tsx](src/presentacion/paginas/matriz-valor/PaginaMatrizValor.tsx#L101) y las guarda con `setIniciativas(listaIniciativas)` en [src/presentacion/paginas/matriz-valor/PaginaMatrizValor.tsx](src/presentacion/paginas/matriz-valor/PaginaMatrizValor.tsx#L107). Si se busca coherencia transversal, sus selects y filtros podrian beneficiarse del mismo orden base. En cambio su ranking Top 3 por puntaje debe seguir siendo analitico en [src/presentacion/paginas/matriz-valor/PaginaMatrizValor.tsx](src/presentacion/paginas/matriz-valor/PaginaMatrizValor.tsx#L257).

## 7. Factibilidad UX del drag and drop

### 7.1 Evaluacion de opciones

**Handle visible siempre**

Ventaja: maxima descubribilidad.

Costo: en Cronograma agregaria ruido a una superficie que ya tiene expand/collapse, bandas de releases, tooltips, resize horizontal y mucha densidad visual en [src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx](src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx).

**Handle visible solo en hover**

Ventaja: interfaz mas limpia.

Costo: peor descubribilidad y peor comportamiento en touch o teclado si se hace de forma ingenua.

**Drag desde la fila completa**

No es la mejor opcion aqui. En Cronograma chocaria con expandir, seleccionar texto, abrir acciones, hover de tooltips y scroll horizontal. En tablas CRUD chocaria con clics normales de lectura/edicion.

**Drag solo desde un icono discreto**

Es la opcion mas coherente con el sistema actual. Permite dejar intacta la interaccion principal de cada fila y acota el gesto de arrastre a una zona pequena y explicita.

**Reordenamiento por nivel**

Debe ser obligatorio. El minimo correcto no es arrastrar libremente entre niveles, sino:

- objetivo con objetivo,
- iniciativa con iniciativa dentro del mismo contenedor,
- entrega con entrega dentro del mismo contenedor.

Eso protege la jerarquia actual y evita que el drag and drop se convierta en una edicion implícita de relaciones padre-hijo.

### 7.2 Opcion recomendada

La opcion mas limpia, minima y coherente para este sistema es:

- drag solo desde un handle discreto,
- reordenamiento restringido por nivel,
- sin usar la fila completa como zona de arrastre,
- manteniendo el layout actual y sin introducir columnas grandes ni affordances pesadas.

En Cronograma, el handle deberia vivir en el gutter jerarquico, no sobre las barras temporales. En listas CRUD, deberia vivir cerca del nombre, pero sin desplazar la lectura principal.

### 7.3 Factibilidad tecnica UX real hoy

Hoy no hay infraestructura de drag and drop instalada en el paquete del portal: la lista de dependencias de [package.json](package.json) no incluye librerias tipo `dnd-kit`, `react-beautiful-dnd`, `@hello-pangea/dnd` o similares. Tampoco aparecio logica de `drag`, `drop`, `reorder` o `sortable` en el arbol de Roadmap durante la busqueda directa del modulo. Eso significa que la UX es factible, pero parte desde cero en frontend.

## 8. Riesgos y restricciones

### 8.1 Riesgos funcionales

- Conflicto con el orden actual por `updated_at`: si se agrega orden manual pero no se cambian las queries canonicas, el problema va a seguir vivo.
- Conflicto entre orden manual y widgets analiticos: Resumen ya ordena por RICE, proximidad temporal y actividad. No conviene mezclar ambos sin criterio.
- Ambiguedad en vistas planas: una jerarquia ordenada por padre puede verse incoherente si una vista plana intenta presentar una sola lista global sin ordenar por padre antes.
- Huerfanos: hoy existen iniciativas sin objetivo y entregas sin iniciativa. Si no se define explicitamente su bucket de orden, quedaran “al final” de manera arbitraria.
- Cambio de padre: mover una iniciativa a otro objetivo o una entrega a otra iniciativa cambia el scope del orden. Si eso no se trata como movimiento entre contenedores, aparecera desorden.
- Filtros: reordenar dentro de una lista filtrada puede dar al usuario una percepcion falsa de estar moviendo contra la lista total cuando solo ve un subconjunto.
- Persistencia parcial: si el guardado del reordenamiento es item por item y falla a mitad de lote, el orden puede quedar inconsistente.

### 8.2 Riesgos de UX

- Drag desde fila completa romperia clics normales y discoverability de otras acciones.
- Un handle demasiado visible ensuciaria especialmente Cronograma.
- Un handle solo hover sin reserva de espacio puede hacer “saltar” el layout.
- Permitir arrastre entre niveles generaria una UX engañosa: pareceria que reordenas, pero en realidad estarias cambiando jerarquia.

### 8.3 Riesgos de persistencia y consistencia entre vistas

- El orden debe sobrevivir a recarga, navegacion y edicion. Si la edicion sigue refrescando por `updated_at desc`, el problema persistira.
- Las listas CRUD usan paginacion cliente en [src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx](src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx#L80), [src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx](src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx#L174), [src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx](src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx#L302). Eso ayuda, porque hoy todo el orden se resuelve client-side despues de cargar la lista completa, pero obliga a que el orden base devuelto por backend ya sea el correcto.
- No existe hoy ningun campo de archivado en estas entidades. Si en el futuro aparece archivado, habra que decidir si conserva posicion, si sale del conteo visible o si ocupa un bucket separado.

### 8.4 Complejidad real

Esto no es solo frontend. La implementacion correcta implicaria:

- frontend,
- backend/persistencia en Supabase,
- migraciones de tabla,
- cambios de modelos y schemas,
- cambios de repositorios y sorting,
- cambios de casos de uso,
- validaciones de alcance por contenedor,
- y pruebas de consistencia entre vistas.

La complejidad real es media-alta, pero acotada. No es una reescritura del modulo; si es un cambio transversal de ordenacion.

## 9. Recomendacion final

La forma mas correcta y minima de implementar orden manual persistente en este sistema no es intentar “recordar” el orden en frontend ni confiar en `updated_at`. La estrategia correcta es introducir un orden persistido propio para las tres capas del Roadmap y convertirlo en el criterio canonico de lectura para las vistas operativas.

La estructura correcta del orden es esta:

- objetivos: orden global,
- iniciativas: orden dentro de cada objetivo, mas un bucket para iniciativas sin objetivo,
- entregas: orden dentro de cada iniciativa, mas un bucket para entregas sin iniciativa.

Con el modelo actual, las entregas sin iniciativa no pueden ordenarse “dentro de un objetivo real” porque la entidad no tiene `objetivo_id`; deben vivir en su propio bucket huerfano. Esa es una restriccion real del dominio actual, no un detalle de interfaz.

La recomendacion de UX mas coherente es un handle discreto por fila y reordenamiento restringido por nivel. No recomiendo drag desde fila completa ni un sistema que permita mover entre niveles como gesto implicito.

La recomendacion de implementacion minima, sin ensuciar el sistema, es:

1. Definir un criterio persistido de orden canonico para Objetivos, Iniciativas y Entregas en sus tablas base.
2. Cambiar las queries operativas del Roadmap para ordenar por ese criterio, dejando `updated_at` solo como fallback tecnico, no como orden principal.
3. Mantener los widgets analiticos del Resumen con sus propios sorts de negocio cuando correspondan.
4. Persistir reordenamientos por scope jerarquico, no como lista plana global.
5. Tratar huerfanos y cambios de padre como casos explicitos desde el primer dia.

Respuesta consolidada a las preguntas clave:

- Hoy se mueven tras editarse porque el orden real es `updated_at desc` y editar actualiza `updated_at`.
- No existe campo persistido de orden manual.
- Si se agrega, debe vivir en las tablas base de Objetivos, Iniciativas y Entregas, con alcance jerarquico coherente con sus padres reales.
- Las vistas que si deben respetarlo son Cronograma, Objetivos, Iniciativas y Entregas.
- Resumen no debe obedecerlo ciegamente en widgets analiticos como Top RICE, Proximas Entregas o Progreso por objetivo.
- El patron UX correcto es handle discreto y reordenamiento por nivel.
- La complejidad real es frontend + persistencia + queries + casos de uso + validaciones; no es solo UI.

En resumen: la causa del problema actual esta totalmente identificada, y la solucion correcta existe, pero requiere convertir el orden en un dato de dominio persistido, no en un efecto visual temporal.