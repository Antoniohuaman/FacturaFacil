# IMPLEMENTACIÓN — EXTRACCIÓN DE FORMULARIOS REUTILIZABLES DEL ROADMAP

## 1. Objetivo ejecutado

Se implementó la FASE A para extraer reutilización real de formularios/modales de roadmap sin cambiar la UX visible ni el comportamiento actual de las páginas host.

Se mantuvo intacto:

- el flujo actual de crear, ver y editar en Objetivos, Iniciativas y Entregables
- la semántica temporal existente
- la validación jerárquica actual en frontend y en capa de aplicación
- la navegación actual del módulo
- la vista Cronograma, sin cambios funcionales ni visuales

## 2. Qué se extrajo

Se creó una capa reutilizable específica para roadmap en:

- `src/presentacion/paginas/roadmap/componentes/tiposModalRoadmap.ts`
- `src/presentacion/paginas/roadmap/componentes/auxiliaresFormulariosRoadmap.ts`
- `src/presentacion/paginas/roadmap/componentes/ModalObjetivoRoadmap.tsx`
- `src/presentacion/paginas/roadmap/componentes/ModalIniciativaRoadmap.tsx`
- `src/presentacion/paginas/roadmap/componentes/ModalEntregaRoadmap.tsx`

### 2.1. Tipo compartido de modo modal

Se centralizó el modo de operación en `ModoModalRoadmap` con los tres estados ya usados por las páginas:

- `crear`
- `ver`
- `editar`

Esto evita repetir tipos locales y facilita que futuros hosts, incluido Cronograma, reutilicen exactamente la misma convención.

### 2.2. Helpers de inicialización y normalización

Se extrajeron a `auxiliaresFormulariosRoadmap.ts`:

- `crearValoresInicialesObjetivoRoadmap(...)`
- `crearValoresInicialesIniciativaRoadmap(...)`
- `crearValoresInicialesEntregaRoadmap(...)`
- `normalizarImpactoFormularioIniciativa(...)`
- `opcionesImpactoIniciativaRoadmap`

Con esto, la lógica de defaults dejó de vivir incrustada en cada página y pasó a ser reutilizable por cualquier host futuro.

## 3. Componentes reutilizables creados

### 3.1. ModalObjetivoRoadmap

Responsabilidad:

- renderizar el formulario/modal de objetivo
- respetar `crear`, `ver` y `editar`
- conservar los mismos campos, textos y affordances visibles

La página host sigue controlando:

- apertura/cierre
- submit
- persistencia
- recarga posterior

### 3.2. ModalIniciativaRoadmap

Responsabilidad:

- renderizar el formulario/modal de iniciativa
- reutilizar los catálogos ya cargados por la página host
- mantener el bloque visual de RICE y los mismos campos operativos
- mantener la validación reactiva de fechas por campo dentro del formulario reutilizable

La página host sigue controlando:

- `useForm`
- cálculo del RICE observado
- selección de objetivo padre
- submit y recarga
- barrera de validación jerárquica previa al guardado

### 3.3. ModalEntregaRoadmap

Responsabilidad:

- renderizar el formulario/modal de entrega
- mantener selección de iniciativa, ventanas, fechas y estado
- conservar la visualización de `fecha_completado` en modo lectura/edición cuando aplica
- mantener la validación reactiva de fechas por campo dentro del formulario reutilizable

La página host sigue controlando:

- `useForm`
- selección de iniciativa padre
- submit y recarga
- validación jerárquica previa al guardado

## 4. Adaptación de las páginas host

Se adaptaron las páginas existentes para seguir siendo host del flujo completo:

- `src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx`
- `src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx`
- `src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx`

### 4.1. Qué cambió en las páginas

- dejaron de renderizar internamente el JSX completo del modal/formulario
- ahora importan y montan el componente reutilizable correspondiente
- ahora reutilizan helpers compartidos para reset/default values

### 4.2. Qué no cambió en las páginas

- siguen siendo responsables de cargar datos y catálogos
- siguen siendo responsables de `handleSubmit(...)`
- siguen ejecutando los mismos casos de uso
- siguen recargando información del mismo modo después de guardar
- siguen mostrando los errores de negocio del mismo modo que antes

Esto cumple el objetivo de extracción real sin introducir una segunda arquitectura todavía.

## 5. Decisiones de diseño aplicadas

Se eligió un diseño host-preserving, no una migración agresiva.

Razón:

- era la forma más segura de obtener reutilización real sin romper UX ni reescribir el módulo
- deja a Cronograma listo para un futuro host contextual sin duplicar formularios
- evita sobrecargar aún más al cronograma en esta fase

En concreto:

- no se movió la lógica de persistencia a los componentes reutilizables
- no se creó un nuevo store global
- no se creó un hook genérico sobrediseñado para las tres entidades
- no se tocaron casos de uso, repositorios ni SQL

## 6. Integridad funcional preservada

Se verificó que la extracción mantiene:

- los mismos campos por entidad
- los mismos modos `crear` / `ver` / `editar`
- los mismos límites jerárquicos reactivos por fecha en Iniciativas y Entregables
- el mismo cierre y recarga al guardar
- la misma semántica de validación antes de persistir

No se modificó:

- Cronograma
- filtros de cronograma
- layout del roadmap
- reglas temporales previas

## 7. Validación ejecutada

Se ejecutó en `apps/pm-portal`:

- `npm run dev`
- `npm run lint`
- `npm run build`

Resultado:

- `dev`: arranque correcto en Vite sobre el puerto 5181
- `lint`: correcto
- `build`: correcto

Observación de build:

- se mantuvo una advertencia preexistente de chunk grande en Vite/Rollup, pero no bloquea la compilación ni está causada por esta extracción

## 8. Resultado arquitectónico

Después de esta implementación, el módulo queda en un estado mejor preparado para la siguiente fase:

- ya existen formularios/modales reutilizables reales por entidad
- las páginas actuales siguen funcionando como host estable
- el futuro cronograma podrá montar estas mismas piezas sin duplicar formularios incrustados

## 9. Conclusión

La FASE A quedó implementada con un alcance deliberadamente controlado:

- reutilización real conseguida
- UX actual preservada
- cronograma no alterado
- validación y persistencia existentes preservadas
- módulo listo para una futura fase de superficie operativa contextual