# AUDITORIA EXHAUSTIVA — RELACION RELEASE, ROADMAP Y CASCADA

## 1. Resumen ejecutivo

La revision del sistema confirma que el dominio actual de `ReleasePm` no esta modelado para relacionarse directamente con `Objetivo`. La entidad `ReleasePm` solo tiene relaciones opcionales con `iniciativa_id`, `entrega_id` y `decision_id`. No existe `objetivo_id` en el modelo, en el esquema de validacion, en la persistencia SQL, en el repositorio ni en el formulario de creacion o edicion.

La fuente principal de la incoherencia funcional actual no es que falte `objetivo_id`, sino esta combinacion de hechos reales:

- el modulo `Releases` permite crear releases sin ningun vinculo con Roadmap;
- el formulario actual expone `Iniciativa` y `Entrega` como selects independientes y opcionales;
- no existe validacion que fuerce relacion con Roadmap;
- no existe validacion que garantice coherencia entre la iniciativa elegida y la entrega elegida;
- el Roadmap y el Cronograma solo consideran como releases relacionados los que llegan por `iniciativa_id` o `entrega_id`.

La conclusion funcional mas coherente con el sistema actual es la siguiente:

- la relacion canonica de `Release` con Roadmap hoy debe mantenerse en `Iniciativa` y `Entrega`;
- `Objetivo` puede servir como ayuda de UX para filtrar o encadenar la seleccion, pero no como relacion persistida canonica;
- una cascada `Objetivo -> Iniciativa -> Entrega` solo tiene sentido como asistente de formulario, no como reflejo literal del modelo actual;
- agregar `objetivo_id` al modelo duplicaria semantica y abriria inconsistencias, porque el propio Roadmap admite iniciativas sin objetivo y entregas sin iniciativa.

Veredicto ejecutivo:

- relacion directa correcta actual: `Release -> Iniciativa` y/o `Release -> Entrega`;
- relacion a `Objetivo`: solo inferida, no nativa;
- cascada por objetivo: coherente como UX opcional de apoyo, no como nueva verdad de dominio;
- recomendacion final: mantener `iniciativa_id` y `entrega_id` como campos persistidos, y si se desea mejorar la UX agregar `Objetivo` solo como selector derivado o filtro, sin persistirlo en `ReleasePm`.

## 2. Modelo actual de ReleasePm

### 2.1 Campos reales de la entidad

Evidencia principal:

- `src/dominio/modelos.ts`
- `src/compartido/validacion/esquemas.ts`
- `docs/sql_fase_4_lanzamientos_supabase.md`

`ReleasePm` tiene hoy estos campos relevantes para relacionarse con el dominio:

- `iniciativa_id: string | null`
- `entrega_id: string | null`
- `decision_id: string | null`

Y no tiene:

- `objetivo_id`

Esto se ve de forma consistente en tres capas:

1. Dominio:
   - `src/dominio/modelos.ts` define `ReleasePm` sin `objetivo_id`.
2. Validacion:
   - `src/compartido/validacion/esquemas.ts` define `releaseSchema` con `iniciativa_id`, `entrega_id` y `decision_id`, sin `objetivo_id`.
3. Persistencia:
   - `docs/sql_fase_4_lanzamientos_supabase.md` crea `pm_releases` con columnas `iniciativa_id`, `entrega_id` y `decision_id`, sin columna `objetivo_id`.

### 2.2 Semantica real de relacion

El modelo actual presupone que el release se asocia a capas operativas mas cercanas a la ejecucion, no a la capa mas alta del roadmap.

Esto implica:

- `Iniciativa` representa un contenedor de trabajo del roadmap mas cercano al plan ejecutable.
- `Entrega` representa el nivel mas concreto de salida o compromiso temporal.
- `ReleasePm` se cuelga de esas capas concretas, no del objetivo estrategico.

### 2.3 Como puede inferirse el objetivo

El objetivo hoy solo puede inferirse de forma indirecta:

- si el release tiene `iniciativa_id`, entonces el objetivo se infiere por `Iniciativa.objetivo_id`;
- si el release tiene `entrega_id`, entonces el objetivo solo puede inferirse por la cadena `Entrega.iniciativa_id -> Iniciativa.objetivo_id`.

Limitacion importante del dominio actual:

- `Entrega.iniciativa_id` es nullable;
- `Iniciativa.objetivo_id` es nullable.

Por lo tanto, el objetivo no siempre es inferible.

## 3. Flujo actual del formulario Release

### 3.1 Que permite hoy el formulario

Evidencia principal:

- `src/presentacion/paginas/lanzamientos/releases/PaginaReleases.tsx`

El formulario de Release:

- no tiene campo `Objetivo`;
- si tiene `Iniciativa`;
- si tiene `Entrega`;
- si tiene `Decision`;
- envia directamente `valores` al caso de uso `crearRelease` o `editarRelease`.

### 3.2 ¿Hoy el formulario permite elegir Objetivo?

No.

No existe control de UI para `objetivo_id` en el formulario de release.

La unica relacion con Roadmap que el formulario permite capturar explicitamente es:

- `iniciativa_id`
- `entrega_id`

### 3.3 ¿Hoy el formulario solo permite elegir Iniciativa y Entrega?

Si.

Los selects visibles del formulario son:

- `Iniciativa`
- `Entrega`
- `Decision`

Como estan cargados:

- `PaginaReleases.tsx` llama `listarIniciativas()` y `listarEntregas()` en la carga inicial.
- luego pinta ambas listas completas en los selects.

Como funcionan hoy:

- son independientes;
- no existe filtrado en cascada;
- no existe filtrado de entregas por iniciativa elegida;
- no existe filtrado de iniciativas por objetivo, porque no hay objetivo en el formulario.

### 3.4 ¿Hoy el usuario puede crear un Release sin iniciativa y sin entrega?

Si.

Evidencia de frontend:

- `PaginaReleases.tsx` inicializa `iniciativa_id: null` y `entrega_id: null` en `defaultValues`.
- el select de iniciativa ofrece `Sin iniciativa`.
- el select de entrega ofrece `Sin entrega`.
- el submit llama `crearRelease(valores, checklistEdicion)` sin agregar una validacion de obligatoriedad sobre roadmap.

Evidencia de validacion:

- `releaseSchema` declara `iniciativa_id` y `entrega_id` con `uuidOpcionalSchema`.
- no existe `superRefine` que fuerce al menos uno de los dos.

Evidencia de backend/persistencia:

- `repositorioLanzamientos.crearRelease()` inserta la entrada recibida sin validacion extra de roadmap.
- `pm_releases` declara `iniciativa_id uuid null` y `entrega_id uuid null`.

Conclusión:

- hoy el sistema permite releases huerfanos respecto al roadmap;
- esa posibilidad no es accidental: esta habilitada por frontend, validacion y SQL.

### 3.5 Ambiguedad adicional del formulario actual

La ambiguedad funcional mas seria no es solo la posibilidad de huerfanos.
Tambien existe esta incoherencia potencial:

- el usuario puede seleccionar una `iniciativa_id` y una `entrega_id` sin que el sistema verifique que esa entrega pertenezca a esa iniciativa.

Evidencia:

- los selects son independientes en `PaginaReleases.tsx`;
- `releaseSchema` no valida consistencia entre ambas referencias;
- `crearRelease` y `editarRelease` no ejecutan validacion de integridad de jerarquia;
- `pm_releases` solo define foreign keys individuales, no una restriccion cruzada entre ambas.

## 4. Relacion real entre Release y Roadmap

### 4.1 Jerarquia real del roadmap

Evidencia principal:

- `src/dominio/modelos.ts`
- `src/aplicacion/casos-uso/iniciativas.ts`
- `src/aplicacion/casos-uso/entregas.ts`
- `src/aplicacion/validaciones/contencionJerarquicaRoadmap.ts`
- `src/presentacion/paginas/roadmap/componentes/ModalIniciativaRoadmap.tsx`
- `src/presentacion/paginas/roadmap/componentes/ModalEntregaRoadmap.tsx`

La jerarquia nominal del sistema es:

- `Objetivo`
  - `Iniciativa`
    - `Entrega`

Pero no es una jerarquia totalmente obligatoria.

El propio sistema admite:

- iniciativas sin objetivo;
- entregas sin iniciativa.

Evidencia concreta:

- `ModalIniciativaRoadmap.tsx` muestra la opcion `Sin objetivo`.
- `ModalEntregaRoadmap.tsx` muestra la opcion `Sin iniciativa`.
- `iniciativaSchema` admite `objetivo_id` nullable.
- `entregaSchema` admite `iniciativa_id` nullable.
- `crearIniciativa()` solo valida contencion temporal si existe objetivo padre.
- `crearEntrega()` solo valida contencion temporal si existe iniciativa padre.

### 4.2 Como Roadmap considera un release relacionado

Evidencia principal:

- `src/presentacion/paginas/roadmap/PaginaRoadmap.tsx`
- `src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`

`PaginaRoadmap.tsx` considera un release relacionado al roadmap cuando ocurre cualquiera de estas dos condiciones:

- `release.iniciativa_id` pertenece al conjunto de iniciativas filtradas;
- `release.entrega_id` pertenece al conjunto de entregas filtradas.

No usa `objetivo_id` porque no existe.

`PaginaCronogramaRoadmap.tsx` sigue la misma semantica de base:

- carga releases con `listarReleases()`;
- los conecta al roadmap a traves de iniciativa o entrega;
- agrupa y cuenta releases por iniciativa;
- tambien suma releases ligados a entrega;
- la fecha visual del release se calcula desde `fecha_lanzamiento_real ?? fecha_programada`.

### 4.3 Si objetivo se puede inferir o no

Si, pero solo en ciertos casos.

Casos donde si puede inferirse:

- release ligado a iniciativa con `objetivo_id` informado;
- release ligado a entrega cuya iniciativa esta informada y cuya iniciativa tiene `objetivo_id`.

Casos donde no puede inferirse con seguridad:

- release huerfano sin iniciativa ni entrega;
- release ligado a entrega sin iniciativa;
- release ligado a iniciativa sin objetivo.

Evidencia funcional adicional:

- `PaginaCronogramaRoadmap.tsx` crea la fila `Sin iniciativa asignada` y maneja tambien el pseudo objetivo `FILA_SIN_OBJETIVO`.

Esto confirma que el dominio real no exige completitud jerarquica absoluta.

## 5. Evaluacion de la propuesta en cascada

## 5.1 Propuesta evaluada

La propuesta funcional revisada es esta:

- campo 1: `Objetivo`
- al elegir objetivo: filtrar iniciativas de ese objetivo
- al elegir iniciativa: filtrar entregas de esa iniciativa
- entrega opcional

### 5.2 ¿Eso seria coherente con el dominio actual?

Parcialmente.

Seria coherente como ayuda de UX para releases que se quieren vincular al roadmap de forma mas guiada.
No seria coherente como representacion obligatoria de todo el dominio actual.

Razones:

- el modelo `ReleasePm` no tiene `objetivo_id`;
- el roadmap permite iniciativas sin objetivo;
- el roadmap permite entregas sin iniciativa;
- el modulo Releases permite releases sin vinculo con roadmap.

Por lo tanto:

- una cascada obligatoria desde objetivo forzaria una jerarquia que el dominio hoy no exige en todos los casos;
- una cascada opcional como asistente visual si seria coherente para el subconjunto de releases roadmap.

### 5.3 ¿Eso requeriria solo frontend o tambien backend?

Depende del alcance.

#### Caso 1. Objetivo solo como ayuda de UX no persistida

Requeriria principalmente frontend.

Ejemplos:

- selector de `Objetivo` solo para filtrar iniciativas;
- selector de `Iniciativa` para filtrar entregas;
- no guardar `objetivo_id` en `ReleasePm`.

En este caso no haria falta tocar SQL ni modelo de release.

#### Caso 2. Querer hacer obligatoria la consistencia entre iniciativa y entrega

Requeriria frontend y backend.

Razones:

- hoy el frontend deja escoger ambas referencias de forma independiente;
- hoy el backend no valida que la entrega pertenezca a la iniciativa;
- si esa regla pasa a ser de negocio, debe validarse tambien en esquema y casos de uso, no solo en UI.

#### Caso 3. Agregar `objetivo_id` a `ReleasePm`

Requeriria frontend, validacion, dominio, repositorio, SQL y migracion.

Capas afectadas:

- `src/dominio/modelos.ts`
- `src/compartido/validacion/esquemas.ts`
- `src/presentacion/paginas/lanzamientos/releases/PaginaReleases.tsx`
- `src/aplicacion/casos-uso/lanzamientos.ts`
- `src/infraestructura/repositorios/repositorioLanzamientos.ts`
- `docs/sql_fase_4_lanzamientos_supabase.md` y migracion real equivalente
- consumidores de roadmap y cronograma

### 5.4 ¿Eso chocaria con el modelo actual de ReleasePm?

Si, si se intenta convertir `Objetivo` en relacion persistida principal.

No chocaria si `Objetivo` se usa solo como filtro o ayuda de seleccion en el formulario.

El choque aparece porque:

- `ReleasePm` hoy esta anclado en capas operativas inferiores;
- `Objetivo` es un nivel mas alto y derivable solo en algunos casos;
- persistir ambas cosas duplicaria informacion inferible y podria quedar desalineada.

### 5.5 ¿Eso obligaria a agregar `objetivo_id` al modelo?

No, si la cascada se usa solo para UX.

Si se pretendiera que el release quede relacionado directamente a objetivo de forma canonica, entonces si haria falta agregar `objetivo_id`.

### 5.6 ¿O el objetivo puede inferirse sin guardarlo explicitamente?

Puede inferirse en muchos casos, pero no en todos.

Conclusión precisa:

- como ayuda visual: si, muchas veces;
- como atributo de negocio universal derivable: no, porque el propio roadmap admite nodos incompletos.

## 6. Riesgos de cada alternativa

### 6.1 Opcion A — Mantener solo `iniciativa_id` y `entrega_id`

Ventajas:

- respeta exactamente el dominio persistido actual;
- no exige migracion;
- es consistente con Roadmap y Cronograma actuales;
- evita duplicar `objetivo_id`.

Riesgos:

- el formulario actual sigue siendo ambiguo;
- pueden existir releases huerfanos;
- pueden existir combinaciones incoherentes entre iniciativa y entrega si no se valida la pareja.

### 6.2 Opcion B — Agregar `objetivo`, `iniciativa` y `entrega` persistidos en cascada

Ventajas:

- parece mas guiado a primera vista.

Riesgos reales:

- duplicidad de semantica;
- migracion de datos;
- nueva superficie de inconsistencia entre `objetivo_id`, `iniciativa_id` y `entrega_id`;
- choca con iniciativas sin objetivo y entregas sin iniciativa;
- complejiza backend y consumidores.

Es la opcion menos coherente con el dominio actual.

### 6.3 Opcion C — Agregar solo `objetivo_id` y derivar el resto

Ventajas:

- simplifica visualmente la captura en la capa mas alta.

Riesgos reales:

- `ReleasePm` perderia precision operativa, porque el cronograma y el roadmap trabajan tambien a nivel de iniciativa y entrega;
- no serviria para diferenciar una salida ligada a una entrega concreta dentro de una iniciativa;
- obligaria a reintroducir derivaciones posteriores para recuperar granularidad.

No es coherente con la semantica actual del modulo Releases.

### 6.4 Opcion D — Mantener campos persistidos actuales y agregar cascada solo como ayuda UX

Ventajas:

- respeta el dominio actual;
- evita migracion de modelo;
- mejora la usabilidad del formulario;
- permite filtrar iniciativas por objetivo y entregas por iniciativa;
- permite seguir dejando `Objetivo` como dato derivado, no duplicado.

Riesgos:

- si no se acompaña con validacion de negocio, la UI puede mejorar pero seguir permitiendo incoherencias por otros caminos;
- requiere decidir como tratar iniciativas sin objetivo y entregas sin iniciativa.

Es la alternativa mas coherente con el sistema actual.

## 7. Recomendacion final

### 7.1 Que haria en este sistema

La recomendacion es la opcion D:

- mantener `iniciativa_id` y `entrega_id` como relaciones persistidas canonicas del release;
- no agregar `objetivo_id` a `ReleasePm`;
- usar `Objetivo` solo como ayuda de seleccion o filtro en el formulario, no como dato persistido;
- reforzar coherencia entre iniciativa y entrega cuando ambas se informen.

### 7.2 Como deberia comportarse el formulario

Campos persistidos recomendados:

- `iniciativa_id`
- `entrega_id`
- `decision_id`

Campo de apoyo UX no persistido recomendado:

- `objetivo` solo para filtrar iniciativas cuando aplique.

Obligatoriedad recomendada:

- `entrega_id`: opcional;
- `iniciativa_id`: opcional a nivel global del modulo Releases, porque hoy el modulo admite lanzamientos no ligados al roadmap;
- pero para releases que se quieran mostrar en Roadmap/Cronograma, deberia exigirse o al menos advertirse que se necesita `iniciativa_id` o `entrega_id`.

Regla recomendada si ambas se informan:

- `entrega_id` debe pertenecer a la `iniciativa_id` seleccionada, salvo que el dominio defina explicitamente otro caso.

### 7.3 Como deberia comportarse luego el Cronograma

El Cronograma deberia seguir consumiendo releases relacionados al roadmap por:

- `iniciativa_id`, o
- `entrega_id`

`Objetivo` deberia seguir tratandose como inferencia, no como FK directa del release.

Tratamiento funcional recomendado:

- release con iniciativa o entrega relacionadas: aparece en la banda del cronograma;
- release sin relacion roadmap: no aparece en esa banda, o aparece solo si en el futuro se crea una vista global de lanzamientos no ligados;
- el sistema debe comunicar esa diferencia al usuario en el flujo de creacion.

### 7.4 Respuesta cerrada a la pregunta principal

No, en este sistema la relacion correcta del release no deberia empezar por `Objetivo` como dato persistido principal.

La relacion correcta hoy es:

- directamente por `Iniciativa`, y/o
- directamente por `Entrega`.

`Objetivo` puede usarse como capa de ayuda para navegar la jerarquia, pero no como relacion canonica del modelo actual.

## Evidencia principal utilizada

- `src/dominio/modelos.ts`
- `src/compartido/validacion/esquemas.ts`
- `src/aplicacion/casos-uso/lanzamientos.ts`
- `src/infraestructura/repositorios/repositorioLanzamientos.ts`
- `src/presentacion/paginas/lanzamientos/releases/PaginaReleases.tsx`
- `src/presentacion/paginas/roadmap/PaginaRoadmap.tsx`
- `src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx`
- `src/presentacion/paginas/roadmap/componentes/ModalIniciativaRoadmap.tsx`
- `src/presentacion/paginas/roadmap/componentes/ModalEntregaRoadmap.tsx`
- `src/aplicacion/casos-uso/iniciativas.ts`
- `src/aplicacion/casos-uso/entregas.ts`
- `src/aplicacion/validaciones/contencionJerarquicaRoadmap.ts`
- `docs/sql_fase_4_lanzamientos_supabase.md`