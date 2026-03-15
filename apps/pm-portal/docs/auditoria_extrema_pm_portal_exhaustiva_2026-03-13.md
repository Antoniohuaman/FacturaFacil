# AUDITORÍA EXTREMA DEL PM PORTAL

## 1. Resumen ejecutivo

### 1.1 Qué es hoy el PM Portal según la evidencia

El PM Portal es una aplicación React + TypeScript del monorepo que opera como portal interno de Product Management con alcance transversal. La evidencia directa en navegación, router, modelos, casos de uso, repositorios y documentos SQL muestra que hoy no se limita a roadmap: cubre estrategia, discovery, requerimientos, validación, lanzamientos, operación, analítica, decisiones, auditorías, trazabilidad y ajustes.

Hecho observado:

- La navegación principal expone 14 áreas funcionales: Tablero, Roadmap, Matriz de valor, Validación, Estrategia, Discovery, Requerimientos, Lanzamientos, Operación, Analítica, Decisiones, Auditorías, Ajustes y Trazabilidad.
- El router implementa rutas para todas esas áreas y subáreas.
- El dominio del front define entidades específicas para cada una de esas áreas, no solo vistas genéricas.
- Los documentos SQL del módulo muestran una evolución por fases: estrategia/trazabilidad, discovery, requerimientos, lanzamientos, operación y analítica.

### 1.2 Madurez percibida

Madurez funcional percibida: media-alta en cobertura, media en orden conceptual.

Hecho observado:

- Existe CRUD real para una gran cantidad de entidades.
- Existen relaciones explícitas M2M o de referencia entre módulos estratégicos, discovery, delivery, lanzamientos y operación.
- Existe trazabilidad de cambios y controles de rol básicos.
- Existen vistas resumen por módulo y vistas tabulares operativas.

Inferencia:

- El portal ya supera un MVP básico; está más cerca de un sistema PM amplio pero todavía con taxonomía en tensión.

### 1.3 Consistencia estructural

La estructura técnica es consistente. La estructura conceptual es parcialmente consistente.

Hecho observado:

- El patrón arquitectónico es estable: `presentacion -> aplicacion/casos-uso -> infraestructura/repositorios -> dominio/modelos`.
- Las vistas CRUD repiten patrones coherentes: `useForm` + Zod, `EstadoVista`, `ModalPortal`, `PaginacionTabla`, filtros client-side, `useSearchParams` en muchas pantallas, exportación CSV en múltiples módulos.
- Las rutas de crear/editar/detalle rara vez son rutas propias; el patrón dominante es listado + modal.

Inferencia:

- La UI está organizada con disciplina técnica, pero el sistema de conceptos creció por capas y eso generó superposiciones semánticas.

### 1.4 Claridad para usarlo como sistema de gestión de producto

Hoy el portal es potente para registrar artefactos PM, pero no completamente claro para decidir dónde debe nacer cada artefacto.

Hecho observado:

- Existen dos familias de objetivos: `objetivos` del roadmap y `pm_objetivos_estrategicos` en estrategia.
- Existen dos familias de hipótesis: `pm_hipotesis` en estrategia y `pm_hipotesis_discovery` en discovery.
- Existen varias familias de KPI: `pm_kpis_estrategicos`, `pm_kpis_ejecutivos`, `pm_kpis_config` y `pm_health_scores`.
- Existen entregas y además releases como conceptos separados, pero relacionados opcionalmente.

Conclusión de claridad:

- Claro en cobertura funcional.
- Menos claro en frontera semántica entre estrategia, roadmap, discovery, delivery, release y operación.

### 1.5 Hallazgos de alto nivel

1. El portal sí soporta hoy artefactos reales de estrategia, discovery, delivery, lanzamiento y operación.
2. El portal usa mayoritariamente listados con modales; no se evidencian páginas standalone de detalle, creación o edición para la mayoría de las entidades.
3. La trazabilidad entre módulos existe, pero es desigual: algunas relaciones se gestionan explícitamente y otras solo como referencias opcionales.
4. La taxonomía actual contiene duplicidades semánticas fuertes: objetivos, hipótesis y KPIs son los casos más notorios.
5. Lanzamientos ya es un concepto real del sistema; marcha blanca no aparece como entidad o taxonomía explícita.

### 1.6 Riesgos conceptuales principales

- Riesgo de crear información en el lugar incorrecto por coexistencia de artefactos similares en módulos distintos.
- Riesgo de trazar de forma incompleta porque muchas relaciones son opcionales.
- Riesgo de mezclar estrategia con ejecución y delivery con operación al usar el portal sin criterio taxonómico fuerte.
- Riesgo de considerar “detalle” o “flujo profundo” algo que en realidad está modelado como modal local y no como entidad navegable.

### 1.7 Recomendación general de ordenamiento conceptual

Sin proponer implementación, la recomendación conceptual general es esta:

- Tratar el portal como un sistema ya dividido en capas, pero hoy todavía con fronteras débiles entre ellas.
- Evaluar futuras altas de información con una separación explícita entre: estrategia, discovery, delivery/roadmap, release/lanzamiento, operación y gobierno.
- No seguir creando nuevos artefactos en el portal sin fijar antes el locus taxonómico de: objetivo, iniciativa, entrega, release, hipótesis, KPI y seguimiento post-lanzamiento.

## 2. Inventario completo del portal

### 2.1 Inventario maestro de módulos y submódulos

| Módulo | Submódulo | Propósito aparente | Tipo de vista | Acciones disponibles | Estado de completitud percibido | Evidencia encontrada |
| --- | --- | --- | --- | --- | --- | --- |
| Tablero | Sin submódulo | Dashboard inicial del portal | Resumen | Ver, filtrar métricas en tablero | Operativo | `src/presentacion/navegacion/menuPortal.ts`, `src/aplicacion/enrutador/enrutador.tsx` |
| Roadmap | Resumen | Vista global de objetivos, iniciativas, entregas y señales asociadas | Resumen jerárquico | Ver, navegar, filtrar por ventana/etapa, abrir creación | Operativo | `src/presentacion/paginas/roadmap/PaginaRoadmap.tsx` |
| Roadmap | Objetivos | Gestión de objetivos roadmap base | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx` |
| Roadmap | Iniciativas | Gestión de iniciativas con RICE | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx` |
| Roadmap | Entregas | Gestión de entregas vinculadas a iniciativas | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx` |
| Matriz de valor | Sin submódulo | Priorización comparativa por valor/esfuerzo/riesgo | Listado + visual | Crear, ver, editar, eliminar, filtrar | Operativo | `src/presentacion/paginas/matriz-valor/PaginaMatrizValor.tsx` |
| Validación | Resumen | Vista global de validaciones | Resumen | Ver | Operativo | `src/presentacion/paginas/validacion/PaginaValidacion.tsx` |
| Validación | Por módulo | Gestión de planes y plantillas de validación | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/validacion/por-modulo/PaginaValidacionPorModulo.tsx` |
| Validación | Ejecuciones | Gestión de ejecuciones de validación | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/validacion/ejecuciones/PaginaEjecucionesValidacion.tsx` |
| Estrategia | Resumen estratégico | Vista global de períodos, objetivos, KPIs e hipótesis | Resumen | Ver | Operativo | `src/presentacion/paginas/estrategia/PaginaResumenEstrategico.tsx` |
| Estrategia | Períodos | Administración de períodos estratégicos | Tabla + modal | Crear, ver, editar, eliminar | Operativo | `src/presentacion/paginas/estrategia/periodos/PaginaPeriodosEstrategicos.tsx`, `src/presentacion/paginas/estrategia/GestionPeriodosEstrategicos.tsx` |
| Estrategia | OKRs | Gestión de objetivos estratégicos y KR | Doble tabla + modales | Crear, ver, editar, eliminar, filtrar | Operativo | `src/presentacion/paginas/estrategia/okrs/PaginaOkrs.tsx` |
| Estrategia | KPIs | Gestión de KPIs estratégicos | Listado + modal | Crear, ver, editar, eliminar, filtrar | Operativo | `src/presentacion/paginas/estrategia/kpis/PaginaKpisEstrategicos.tsx` |
| Estrategia | Hipótesis | Gestión de hipótesis estratégicas | Listado + modal | Crear, ver, editar, eliminar, filtrar | Operativo | `src/presentacion/paginas/estrategia/hipotesis/PaginaHipotesis.tsx` |
| Discovery | Resumen discovery | Vista agregada de discovery | Resumen | Ver | Operativo | `src/presentacion/paginas/discovery/PaginaResumenDiscovery.tsx` |
| Discovery | Insights | Gestión de insights y sus vínculos | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV, vincular | Operativo | `src/presentacion/paginas/discovery/insights/PaginaInsights.tsx` |
| Discovery | Problemas y oportunidades | Gestión de problemas/oportunidades y vínculos | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV, vincular | Operativo | `src/presentacion/paginas/discovery/problemas/PaginaProblemasOportunidades.tsx` |
| Discovery | Investigaciones | Gestión de investigaciones y vínculos a insights | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV, vincular | Operativo | `src/presentacion/paginas/discovery/investigaciones/PaginaInvestigaciones.tsx` |
| Discovery | Segmentos | Gestión de segmentos | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/discovery/segmentos/PaginaSegmentos.tsx` |
| Discovery | Hipótesis discovery | Gestión de hipótesis discovery y vínculos a iniciativas | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV, vincular | Operativo | `src/presentacion/paginas/discovery/hipotesis/PaginaHipotesisDiscovery.tsx` |
| Requerimientos | Resumen | Vista general de historias, casos, reglas y RNF | Resumen | Ver | Operativo | `src/presentacion/paginas/requerimientos/PaginaResumenRequerimientos.tsx` |
| Requerimientos | Historias de usuario | Gestión de historias y criterios de aceptación | Listado + modal + submodal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/requerimientos/historias/PaginaHistoriasUsuario.tsx`, `GestionCriteriosAceptacion.tsx` |
| Requerimientos | Casos de uso | Gestión de casos de uso | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/requerimientos/casos-uso/PaginaCasosUso.tsx` |
| Requerimientos | Reglas de negocio | Gestión de reglas de negocio | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/requerimientos/reglas/PaginaReglasNegocio.tsx` |
| Requerimientos | No funcionales | Gestión de RNF | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/requerimientos/no-funcionales/PaginaRequerimientosNoFuncionales.tsx` |
| Lanzamientos | Resumen | Vista agregada de releases y seguimiento | Resumen | Ver | Operativo | `src/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos.tsx` |
| Lanzamientos | Releases | Gestión de releases y checklist de salida | Listado + modal + subgestor | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/lanzamientos/releases/PaginaReleases.tsx`, `GestionChecklistSalida.tsx` |
| Lanzamientos | Seguimiento post-lanzamiento | Seguimiento de estabilización | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/lanzamientos/seguimiento/PaginaSeguimientoLanzamientos.tsx` |
| Operación | Resumen | Vista global de bugs, mejoras, deudas, bloqueos y lecciones | Resumen | Ver | Operativo | `src/presentacion/paginas/operacion/PaginaResumenOperacion.tsx` |
| Operación | Bugs | Gestión de bugs | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/operacion/bugs/PaginaBugs.tsx` |
| Operación | Mejoras | Gestión de mejoras | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/operacion/mejoras/PaginaMejoras.tsx` |
| Operación | Deuda técnica | Gestión de deuda técnica | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/operacion/deuda-tecnica/PaginaDeudaTecnica.tsx` |
| Operación | Bloqueos | Gestión de bloqueos | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/operacion/bloqueos/PaginaBloqueos.tsx` |
| Operación | Lecciones aprendidas | Gestión de lecciones aprendidas | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/operacion/lecciones/PaginaLeccionesAprendidas.tsx` |
| Analítica | Resumen analítico | Vista ejecutiva transversal | Resumen | Ver | Operativo | `src/presentacion/paginas/analitica/PaginaResumenAnalitico.tsx` |
| Analítica | KPIs | Gestión de KPIs ejecutivos | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/analitica/kpis/PaginaKpis.tsx` |
| Analítica | Portafolio | Vista por dominio/módulo | Tabla analítica | Ver, exportar CSV | Operativo | `src/presentacion/paginas/analitica/portafolio/PaginaPortafolio.tsx` |
| Analítica | Tendencias | Vista temporal comparativa | Tabla analítica | Ver, exportar CSV | Operativo | `src/presentacion/paginas/analitica/tendencias/PaginaTendencias.tsx` |
| Analítica | Health scores | Gestión de health scores | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/analitica/health-scores/PaginaHealthScores.tsx` |
| Decisiones | Sin submódulo | Registro de decisiones PM | Listado + modal | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/decisiones/PaginaDecisiones.tsx` |
| Auditorías | Sin submódulo | Gestión de auditorías y hallazgos | Doble listado + modales | Crear, ver, editar, eliminar, buscar, filtrar, exportar CSV | Operativo | `src/presentacion/paginas/auditorias/PaginaAuditorias.tsx` |
| Ajustes | Sin submódulo | Catálogos y configuración global | Formularios + tablas | Crear, editar, eliminar, guardar configuración | Operativo | `src/presentacion/paginas/ajustes/PaginaAjustes.tsx` |
| Trazabilidad | Sin submódulo | Historial transversal de cambios | Tabla + modal JSON | Filtrar, ver JSON | Operativo para admin | `src/presentacion/paginas/trazabilidad/PaginaTrazabilidad.tsx` |

### 2.2 Hallazgo estructural relevante

Hecho observado:

- Para la mayoría de las entidades no existen rutas separadas de detalle, creación o edición.
- El patrón predominante es `listado + modal` con modos `crear`, `ver`, `editar`.

Diagnóstico:

- Sí existen vistas de listado y de “detalle” en sentido funcional, pero casi siempre el detalle está embebido en modal y no como página navegable propia.

## 3. Mapa de navegación y jerarquía

### 3.1 Jerarquía funcional real

Árbol textual basado en `menuPortal.ts` y `enrutador.tsx`:

```text
PM Portal
├── Tablero
├── Roadmap
│   ├── Resumen
│   ├── Objetivos
│   ├── Iniciativas
│   └── Entregas
├── Matriz de valor
├── Validación
│   ├── Resumen
│   ├── Por módulo
│   └── Ejecuciones
├── Estrategia
│   ├── Resumen estratégico
│   ├── Períodos
│   ├── OKRs
│   ├── KPIs
│   └── Hipótesis
├── Discovery
│   ├── Resumen discovery
│   ├── Insights
│   ├── Problemas y oportunidades
│   ├── Investigaciones
│   ├── Segmentos
│   └── Hipótesis discovery
├── Requerimientos
│   ├── Resumen de requerimientos
│   ├── Historias de usuario
│   ├── Casos de uso
│   ├── Reglas de negocio
│   └── Requerimientos no funcionales
├── Lanzamientos
│   ├── Resumen de lanzamientos
│   ├── Releases
│   └── Seguimiento post-lanzamiento
├── Operación
│   ├── Resumen operativo
│   ├── Bugs
│   ├── Mejoras
│   ├── Deuda técnica
│   ├── Bloqueos
│   └── Lecciones aprendidas
├── Analítica
│   ├── Resumen analítico
│   ├── KPIs
│   ├── Portafolio
│   ├── Tendencias
│   └── Health scores
├── Decisiones
├── Auditorías
├── Ajustes
└── Trazabilidad
```

### 3.2 Lectura funcional de la jerarquía

Hecho observado:

- Roadmap actúa como base de planificación táctica.
- Estrategia modela período, objetivo estratégico, KR, KPI estratégico e hipótesis estratégica.
- Discovery modela insumos de aprendizaje previos o paralelos a delivery.
- Requerimientos modela especificación funcional y no funcional.
- Lanzamientos y Operación son capas posteriores al delivery base.
- Decisiones, Auditorías, Ajustes y Trazabilidad funcionan como capas de gobierno o soporte.
- Analítica consolida lectura transversal.

Inferencia:

- Núcleo PM: Roadmap, Estrategia, Discovery, Requerimientos, Lanzamientos, Operación.
- Soporte/gobierno: Validación, Decisiones, Auditorías, Ajustes, Trazabilidad.
- Capa analítica: Tablero y Analítica.

## 4. Catálogo de entidades funcionales del portal

### 4.1 Entidades observadas en código y documentos SQL

| Entidad | Propósito | Atributos principales | Relaciones evidenciadas | Pantallas donde aparece | Acciones | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| Objetivo roadmap | Objetivo base del roadmap | nombre, descripcion, estado, prioridad | Padre de iniciativas; vínculo con KR por `pm_rel_objetivo_roadmap_kr` | Roadmap resumen, Objetivos, Estrategia resumen, OKRs | CRUD | `src/dominio/modelos.ts`, `PaginaObjetivosRoadmap.tsx`, `estrategia.ts` |
| Iniciativa | Unidad principal de planificación | objetivo_id, ventana_planificada_id, etapa_id, nombre, RICE, estado, prioridad | Relación con objetivo roadmap, entregas, KR, hipótesis estrategia, hipótesis discovery, release, operación | Roadmap resumen, Iniciativas, Matriz valor, Releases, Operación, Requerimientos | CRUD | `src/dominio/modelos.ts`, `PaginaIniciativasRoadmap.tsx` |
| Entrega | Artefacto de delivery | iniciativa_id, ventana planificada/real, fechas, estado, prioridad | Relación con iniciativa, release, historias, casos, RNF, operación | Roadmap resumen, Entregas, Releases, Requerimientos, Operación | CRUD | `src/dominio/modelos.ts`, `PaginaEntregasRoadmap.tsx` |
| Matriz de valor | Evaluación comparativa | iniciativa_id, valor_negocio, esfuerzo, riesgo, puntaje_valor | Depende de iniciativa | Matriz de valor | CRUD | `src/dominio/modelos.ts`, `PaginaMatrizValor.tsx` |
| Plantilla de validación | Plantilla reusable | modulo_id, nombre, criterios, evidencias_esperadas, activo | Alimenta planes | Validación por módulo | CRUD | `src/dominio/modelos.ts`, `PaginaValidacionPorModulo.tsx` |
| Plan de validación | Plan específico | modulo_id, plantilla_id, owner, estado_codigo, fechas | Relación con módulo, plantilla y ejecuciones | Validación por módulo, Resumen validación | CRUD | `src/dominio/modelos.ts`, `PaginaValidacionPorModulo.tsx` |
| Ejecución de validación | Ejecución registrada | plan_validacion_id, modulo_id, fecha_ejecucion, resultado, hallazgos, evidencia_url, estado_codigo | Relación con plan, módulo, decisiones y hallazgos | Ejecuciones, Resumen validación, Decisiones, Auditorías | CRUD | `src/dominio/modelos.ts`, `PaginaEjecucionesValidacion.tsx` |
| Período estratégico | Marco temporal | nombre, descripcion, fecha_inicio, fecha_fin, activo | Padre de objetivos estratégicos, KPIs estratégicos e hipótesis estratégicas | Estrategia resumen, Períodos, OKRs, KPIs, Hipótesis | CRUD | `src/dominio/modelos.ts`, `GestionPeriodosEstrategicos.tsx` |
| Objetivo estratégico | Objetivo de estrategia | periodo_id, codigo, titulo, descripcion, prioridad, estado | Padre de KR; relación con objetivos roadmap y problemas | Estrategia resumen, OKRs, Discovery problemas | CRUD | `src/dominio/modelos.ts`, `PaginaOkrs.tsx` |
| Key Result | Resultado clave | objetivo_estrategico_id, nombre, metrica, unidad, baseline, meta, valor_actual, frecuencia | Relación con objetivo estratégico, objetivos roadmap, iniciativas | Estrategia resumen, OKRs, Roadmap objetivos, Roadmap iniciativas | CRUD | `src/dominio/modelos.ts`, `PaginaOkrs.tsx`, `estrategia.ts` |
| KPI estratégico | KPI de estrategia | periodo_id, definicion, formula, fuente, meta, tendencia, estado | Relación con período estratégico | Estrategia resumen, KPIs | CRUD | `src/dominio/modelos.ts`, `PaginaKpisEstrategicos.tsx` |
| Hipótesis estratégica | Hipótesis de estrategia | periodo_id, problema, hipotesis, impacto_esperado, criterio_exito | Relación con iniciativas por `pm_rel_iniciativa_hipotesis` | Estrategia resumen, Hipótesis, Roadmap iniciativas | CRUD | `src/dominio/modelos.ts`, `PaginaHipotesis.tsx`, `estrategia.ts` |
| Segmento discovery | Segmentación de usuarios/contexto | nombre, descripcion, necesidades, dolores, contexto, activo | Padre de insights, problemas e investigaciones | Discovery resumen, Segmentos, Insights, Problemas, Investigaciones | CRUD | `src/dominio/modelos.ts`, `PaginaSegmentos.tsx` |
| Insight | Hallazgo de discovery | fuente, tipo, relevancia, modulo_codigo, segmento_id, evidencia_url, estado, fecha_hallazgo | Relación con problemas y decisiones | Discovery resumen, Insights, Decisiones | CRUD + vinculación | `src/dominio/modelos.ts`, `PaginaInsights.tsx`, `discovery.ts` |
| Problema u oportunidad | Problema/u oportunidad de discovery | tipo, impacto, prioridad, segmento_id, modulo_codigo, estado | Relación con insights y objetivos estratégicos | Discovery resumen, Problemas | CRUD + vinculación | `src/dominio/modelos.ts`, `PaginaProblemasOportunidades.tsx`, `discovery.ts` |
| Investigación | Registro de investigación | tipo_investigacion, fecha_investigacion, segmento_id, participantes_resumen, resumen, hallazgos, conclusion | Relación con insights | Discovery resumen, Investigaciones | CRUD + vinculación | `src/dominio/modelos.ts`, `PaginaInvestigaciones.tsx`, `discovery.ts` |
| Hipótesis discovery | Hipótesis de experimentación | problema_id, hipotesis, cambio_propuesto, resultado_esperado, criterio_exito, prioridad, estado | Relación con iniciativas | Discovery resumen, Hipótesis discovery, Iniciativas | CRUD + vinculación | `src/dominio/modelos.ts`, `PaginaHipotesisDiscovery.tsx`, `discovery.ts` |
| Historia de usuario | Requerimiento funcional base | codigo, como_usuario, quiero, para, prioridad, estado, owner | Relación con iniciativa, entrega, hipótesis discovery y criterios | Requerimientos resumen, Historias | CRUD | `src/dominio/modelos.ts`, `PaginaHistoriasUsuario.tsx` |
| Criterio de aceptación | Criterio de validación funcional | historia_usuario_id, descripcion, orden, obligatorio, estado_validacion | Depende de historia | Historias | CRUD embebido | `src/dominio/modelos.ts`, `GestionCriteriosAceptacion.tsx` |
| Caso de uso | Caso de uso formal | actor_principal, precondiciones, flujo_principal, postcondiciones, estado | Relación con iniciativa, entrega, historia | Requerimientos resumen, Casos de uso | CRUD | `src/dominio/modelos.ts`, `PaginaCasosUso.tsx` |
| Regla de negocio | Regla de negocio | categoria, criticidad, modulo_codigo, iniciativa_id, historia_usuario_id, decision_id | Relación con módulo, iniciativa, historia y decisión | Requerimientos resumen, Reglas de negocio, Decisiones | CRUD | `src/dominio/modelos.ts`, `PaginaReglasNegocio.tsx` |
| Requerimiento no funcional | RNF | tipo, criterio_medicion, prioridad, estado, iniciativa_id, entrega_id | Relación con iniciativa y entrega | Requerimientos resumen, No funcionales | CRUD | `src/dominio/modelos.ts`, `PaginaRequerimientosNoFuncionales.tsx` |
| Release | Unidad formal de lanzamiento | tipo_release, estado, fechas, iniciativa_id, entrega_id, decision_id, rollback, comunicación | Relación con iniciativa, entrega, decisión, checklist, seguimiento y operación | Resumen lanzamientos, Releases, Roadmap resumen, Operación | CRUD | `src/dominio/modelos.ts`, `PaginaReleases.tsx`, `sql_fase_4_lanzamientos_supabase.md` |
| Checklist de salida | Lista de salida del release | release_id, tipo_item, descripcion, obligatorio, completado, evidencia, orden | Depende de release | Releases | CRUD embebido | `GestionChecklistSalida.tsx`, `sql_fase_4_lanzamientos_supabase.md` |
| Seguimiento release | Seguimiento post-lanzamiento | release_id, fecha_registro, estado_estabilizacion, observaciones, incidencias_detectadas, decision_requerida | Depende de release | Resumen lanzamientos, Seguimiento post-lanzamiento | CRUD | `src/dominio/modelos.ts`, `PaginaSeguimientoLanzamientos.tsx` |
| Bug | Incidente operativo | estado, prioridad, owner, fechas, modulo, iniciativa, entrega, release, auditoria, hallazgo | Relación con launch, auditoría y delivery | Resumen operación, Bugs, Analítica, Roadmap resumen | CRUD | `src/dominio/modelos.ts`, `PaginaBugs.tsx`, `sql_fase_5_operacion_supabase.md` |
| Mejora | Mejora operativa/funcional | estado, prioridad, owner, fechas, modulo, iniciativa, entrega, insight, hipotesis_discovery | Relación con discovery y delivery | Resumen operación, Mejoras, Analítica, Roadmap resumen | CRUD | `src/dominio/modelos.ts`, `PaginaMejoras.tsx` |
| Deuda técnica | Deuda técnica | estado, prioridad, owner, fechas, modulo, iniciativa, entrega, release, impacto_tecnico | Relación con release y delivery | Resumen operación, Deuda técnica, Analítica, Roadmap resumen | CRUD | `src/dominio/modelos.ts`, `PaginaDeudaTecnica.tsx` |
| Bloqueo | Bloqueo operativo | estado, prioridad, owner, responsable_desbloqueo, fechas, release, decision_id | Relación con decisión, release y delivery | Resumen operación, Bloqueos, Analítica, Roadmap resumen | CRUD | `src/dominio/modelos.ts`, `PaginaBloqueos.tsx` |
| Lección aprendida | Aprendizaje operativo | contexto, aprendizaje, accion_recomendada, estado, fechas | Relación con release, auditoría y delivery | Resumen operación, Lecciones, Analítica, Roadmap resumen | CRUD | `src/dominio/modelos.ts`, `PaginaLeccionesAprendidas.tsx` |
| KPI ejecutivo | KPI analítico | categoria, modulo, formula_texto, valor/meta, tendencia, estado | Relación opcional con módulo | Resumen analítico, KPIs analítica | CRUD | `src/dominio/modelos.ts`, `PaginaKpis.tsx` |
| Health score | Métrica de salud | ambito, modulo, peso, umbrales, estado | Relación opcional con módulo | Resumen analítico, Health scores | CRUD | `src/dominio/modelos.ts`, `PaginaHealthScores.tsx` |
| Decisión | Decisión PM | titulo, contexto, decision, alternativas, impacto, estado_codigo, fecha, links, tags | Relación con iniciativa, entrega, ejecución, insights, releases, bloqueos y reglas | Decisiones, Discovery insights, Operación, Lanzamientos | CRUD | `src/dominio/modelos.ts`, `PaginaDecisiones.tsx` |
| Auditoría | Auditoría PM | tipo_auditoria_codigo, alcance, checklist, evidencias, estado_codigo, fecha | Padre de hallazgos | Auditorías, Operación | CRUD | `src/dominio/modelos.ts`, `PaginaAuditorias.tsx` |
| Hallazgo de auditoría | Hallazgo | auditoria_id, severidad_codigo, estado_codigo, modulo_id, decision_id, ejecucion_validacion_id | Relación con auditoría, módulo, decisión, ejecución y bugs | Auditorías, Operación, Analítica | CRUD | `src/dominio/modelos.ts`, `PaginaAuditorias.tsx` |
| Historial de cambios | Trazabilidad transversal | modulo_codigo, entidad, entidad_id, accion, actor, antes_json, despues_json, metadata_json | Cruza todo el sistema | Trazabilidad | Ver/filtrar | `src/dominio/modelos.ts`, `PaginaTrazabilidad.tsx`, `sql_fase_1_estrategia_trazabilidad.md` |

## 5. Auditoría exhaustiva de formularios

### 5.1 Hallazgo global de formularios

Hecho observado:

- Los formularios usan `react-hook-form` + `zodResolver`.
- La mayoría vive en modales incrustados en páginas de listado.
- No se evidencian rutas `create`, `edit` o `detail` para la mayoría de las entidades.
- La validación principal está centralizada en `src/compartido/validacion/esquemas.ts`.

### 5.2 Detalle por formulario

#### F01. Ingreso
- Módulo: acceso.
- Propósito: autenticación al portal.
- Tipo: único formulario de ingreso.
- Campos: `correo` (email, obligatorio, validación email), `contrasena` (password, obligatorio, mínimo 6).
- Valores por defecto: no evidenciados en este informe más allá de vacío en `defaultValues`.
- Relación: sesión de usuario.

#### F02. Objetivo roadmap
- Módulo: Roadmap > Objetivos.
- Tipo: crear, ver y editar en modal.
- Campos: `nombre` (texto, obligatorio, min 3 max 120), `descripcion` (textarea, obligatoria, min 5 max 500), `estado` (select enum `pendiente|en_progreso|completado`), `prioridad` (select enum `baja|media|alta`).
- Default evidenciado: `estado='pendiente'`, `prioridad='media'`.
- Relación: puede vincularse estratégicamente a KR en la tabla, no desde el formulario base.

#### F03. Iniciativa
- Módulo: Roadmap > Iniciativas.
- Tipo: crear, ver y editar en modal.
- Campos: `objetivo_id` (select opcional), `ventana_planificada_id` (select opcional), `etapa_id` (select opcional), `nombre`, `descripcion`, `alcance` (number entero >= 0), `impacto` (select numérico cerrado `0.25|0.5|1|2|3`), `confianza` (number 0-100), `esfuerzo` (number >= 0.5), `estado`, `prioridad`.
- Defaults evidenciados: `alcance=10`, `impacto=1`, `confianza=70`, `esfuerzo=1`, `estado='pendiente'`, `prioridad='media'`.
- Dependencias: cálculo RICE visible en pantalla; el score no se captura manualmente.
- Relaciones: objetivo roadmap, ventana, etapa, KR, hipótesis estrategia, hipótesis discovery, entregas.

#### F04. Entrega
- Módulo: Roadmap > Entregas.
- Tipo: crear, ver y editar en modal.
- Campos: `iniciativa_id`, `ventana_planificada_id`, `ventana_real_id`, `nombre`, `descripcion`, `fecha_objetivo`, `fecha_completado`, `estado`, `prioridad`.
- Relaciones: iniciativa, ventanas, release, historias, casos, RNF y artefactos operativos.
- Validaciones: texto y estados; fechas opcionales.

#### F05. Matriz de valor
- Módulo: Matriz de valor.
- Tipo: crear, ver y editar en modal.
- Campos: `iniciativa_id` (obligatorio), `titulo`, `valor_negocio` (1-100), `esfuerzo` (1-100), `riesgo` (1-100), `estado`, `prioridad`.
- Comportamiento: `puntaje_valor` no se ingresa en UI; se deriva.

#### F06. Plantilla de validación
- Módulo: Validación > Por módulo.
- Tipo: crear, ver y editar.
- Campos: `modulo_id`, `nombre`, `criterios`, `evidencias_esperadas`, `activo`.
- Relaciones: catálogo de módulos.

#### F07. Plan de validación
- Módulo: Validación > Por módulo.
- Tipo: crear, ver y editar.
- Campos: `modulo_id`, `plantilla_id` opcional, `nombre`, `criterios`, `evidencias_esperadas`, `owner`, `estado_codigo`, `fecha_inicio`, `fecha_fin`, `notas`.
- Relaciones: módulo, plantilla y luego ejecuciones.
- Observación: `estado_codigo` usa catálogo dinámico, no enum del dominio base.

#### F08. Ejecución de validación
- Módulo: Validación > Ejecuciones.
- Tipo: crear, ver y editar.
- Campos: `plan_validacion_id`, `modulo_id`, `fecha_ejecucion`, `rango_desde`, `rango_hasta`, `resultado`, `hallazgos`, `evidencia_url`, `aprobador`, `estado_codigo`.
- Relaciones: plan, módulo, decisiones y hallazgos posteriores.

#### F09. Período estratégico
- Módulo: Estrategia > Períodos.
- Tipo: crear y editar.
- Campos: `nombre`, `descripcion`, `fecha_inicio`, `fecha_fin`, `activo`.
- Validación destacada: `fecha_inicio <= fecha_fin`.

#### F10. Objetivo estratégico
- Módulo: Estrategia > OKRs.
- Tipo: crear, ver y editar.
- Campos: `periodo_id`, `codigo`, `titulo`, `descripcion`, `prioridad`, `estado`, `owner`, `notas`.
- Relaciones: período; los vínculos a roadmap/KR se observan en el módulo de OKRs, no en otra pantalla separada.

#### F11. Key Result
- Módulo: Estrategia > OKRs.
- Tipo: crear, ver y editar.
- Campos: `objetivo_estrategico_id`, `nombre`, `metrica`, `unidad`, `baseline`, `meta`, `valor_actual`, `frecuencia`, `estado`, `owner`.
- Relaciones: objetivo estratégico; adicionalmente sincroniza vínculos con objetivos roadmap e iniciativas.

#### F12. KPI estratégico
- Módulo: Estrategia > KPIs.
- Tipo: crear, ver y editar.
- Campos: `periodo_id`, `nombre`, `definicion`, `formula`, `fuente`, `unidad`, `meta`, `umbral_bajo`, `umbral_alto`, `valor_actual`, `tendencia`, `estado`, `owner`.

#### F13. Hipótesis estratégica
- Módulo: Estrategia > Hipótesis.
- Tipo: crear, ver y editar.
- Campos: `periodo_id`, `titulo`, `problema`, `hipotesis`, `impacto_esperado`, `criterio_exito`, `estado`, `prioridad`, `owner`, `evidencia_url`, `notas`.
- Relaciones: puede vincularse a iniciativas vía sincronización en casos de uso.

#### F14. Segmento discovery
- Módulo: Discovery > Segmentos.
- Tipo: crear, ver y editar.
- Campos: `nombre`, `descripcion`, `necesidades`, `dolores`, `contexto`, `activo`.

#### F15. Insight
- Módulo: Discovery > Insights.
- Tipo: crear, ver y editar.
- Campos: `titulo`, `descripcion`, `fuente`, `tipo`, `relevancia`, `modulo_codigo`, `segmento_id`, `evidencia_url`, `estado`, `owner`, `fecha_hallazgo`, `notas`.
- Dependencias: select de módulo y segmento.
- Relaciones adicionales: selección múltiple de problemas/oportunidades y decisiones mediante `SelectorRelaciones`.
- Guardado: sincroniza relaciones insight-problema e insight-decisión.

#### F16. Problema u oportunidad
- Módulo: Discovery > Problemas y oportunidades.
- Tipo: crear, ver y editar.
- Campos: `tipo`, `titulo`, `descripcion`, `impacto`, `prioridad`, `segmento_id`, `modulo_codigo`, `estado`, `owner`.
- Relaciones adicionales: selección múltiple de insights y objetivos estratégicos.
- Guardado: sincroniza relaciones problema-insight y problema-objetivo estratégico.

#### F17. Investigación
- Módulo: Discovery > Investigaciones.
- Tipo: crear, ver y editar.
- Campos: `titulo`, `tipo_investigacion`, `fecha_investigacion`, `segmento_id`, `participantes_resumen`, `resumen`, `hallazgos`, `conclusion`, `evidencia_url`, `estado`, `owner`.
- Relaciones adicionales: selección múltiple de insights.

#### F18. Hipótesis discovery
- Módulo: Discovery > Hipótesis discovery.
- Tipo: crear, ver y editar.
- Campos: `titulo`, `problema_id`, `hipotesis`, `cambio_propuesto`, `resultado_esperado`, `criterio_exito`, `prioridad`, `estado`, `owner`, `evidencia_url`, `notas`.
- Relaciones adicionales: selección múltiple de iniciativas.

#### F19. Historia de usuario
- Módulo: Requerimientos > Historias.
- Tipo: crear, ver y editar.
- Campos: `codigo`, `titulo`, `como_usuario`, `quiero`, `para`, `descripcion`, `prioridad`, `estado`, `owner`, `iniciativa_id`, `entrega_id`, `hipotesis_discovery_id`, `notas`.
- Relaciones: iniciativa, entrega, hipótesis discovery.
- Subgestión: criterios de aceptación asociados.

#### F20. Criterio de aceptación
- Módulo: Requerimientos > Historias.
- Tipo: CRUD embebido.
- Campos: `historia_usuario_id`, `descripcion`, `orden`, `obligatorio`, `estado_validacion`, `notas`.

#### F21. Caso de uso
- Módulo: Requerimientos > Casos de uso.
- Tipo: crear, ver y editar.
- Campos: `codigo`, `titulo`, `actor_principal`, `actores_secundarios`, `precondiciones`, `flujo_principal`, `flujos_alternos`, `postcondiciones`, `prioridad`, `estado`, `iniciativa_id`, `entrega_id`, `historia_usuario_id`, `owner`, `notas`.

#### F22. Regla de negocio
- Módulo: Requerimientos > Reglas de negocio.
- Tipo: crear, ver y editar.
- Campos: `codigo`, `nombre`, `descripcion`, `categoria`, `criticidad`, `modulo_codigo`, `estado`, `iniciativa_id`, `historia_usuario_id`, `decision_id`, `owner`, `notas`.

#### F23. Requerimiento no funcional
- Módulo: Requerimientos > No funcionales.
- Tipo: crear, ver y editar.
- Campos: `codigo`, `nombre`, `tipo`, `descripcion`, `criterio_medicion`, `prioridad`, `estado`, `iniciativa_id`, `entrega_id`, `owner`, `notas`.

#### F24. Release
- Módulo: Lanzamientos > Releases.
- Tipo: crear, ver y editar.
- Campos: `codigo`, `nombre`, `descripcion`, `tipo_release`, `estado`, `fecha_programada`, `fecha_lanzamiento_real`, `iniciativa_id`, `entrega_id`, `owner`, `responsable_aprobacion`, `decision_id`, `rollback_preparado`, `rollback_descripcion`, `rollback_responsable`, `comunicacion_requerida`, `comunicacion_descripcion`, `audiencia_objetivo`, `notas`.
- Defaults evidenciados: `tipo_release='mvp'`, `estado='borrador'`, `fecha_programada=hoy`, `rollback_preparado=false`, `comunicacion_requerida=false`.
- Dependencias entre campos: `rollback_*` y `comunicacion_*` dependen lógicamente de los booleanos; el formulario observa esos valores con `watch`.
- Relaciones: iniciativa, entrega, decisión, checklist, seguimiento y operación.

#### F25. Checklist de salida
- Módulo: Lanzamientos > Releases.
- Tipo: CRUD embebido dentro del release.
- Campos: `tipo_item`, `descripcion`, `obligatorio`, `completado`, `evidencia`, `orden`.
- Observación: no es modal aparte; se gestiona con un mini-editor dentro del modal del release.

#### F26. Seguimiento post-lanzamiento
- Módulo: Lanzamientos > Seguimiento.
- Tipo: crear, ver y editar.
- Campos: `release_id`, `fecha_registro`, `estado_estabilizacion`, `observaciones`, `incidencias_detectadas`, `metrica_clave`, `decision_requerida`, `owner`.
- Relevancia conceptual: es la pieza más cercana a marcha blanca/post-lanzamiento, pero no usa esa taxonomía.

#### F27. Bug
- Módulo: Operación > Bugs.
- Tipo: crear, ver y editar.
- Campos: `codigo`, `titulo`, `descripcion`, `estado`, `prioridad`, `owner`, `fecha_reporte`, `fecha_resolucion`, `modulo_codigo`, `iniciativa_id`, `entrega_id`, `release_id`, `auditoria_id`, `hallazgo_id`, `impacto_operativo`, `causa_raiz`, `notas`.
- Validación destacada: fecha de resolución no puede ser menor que fecha de reporte.

#### F28. Mejora
- Módulo: Operación > Mejoras.
- Tipo: crear, ver y editar.
- Campos: `codigo`, `titulo`, `descripcion`, `estado`, `prioridad`, `owner`, `fecha_solicitud`, `fecha_cierre`, `modulo_codigo`, `iniciativa_id`, `entrega_id`, `insight_id`, `hipotesis_discovery_id`, `beneficio_esperado`, `criterio_exito`, `notas`.

#### F29. Deuda técnica
- Módulo: Operación > Deuda técnica.
- Tipo: crear, ver y editar.
- Campos: `codigo`, `titulo`, `descripcion`, `estado`, `prioridad`, `owner`, `fecha_identificacion`, `fecha_objetivo`, `modulo_codigo`, `iniciativa_id`, `entrega_id`, `release_id`, `impacto_tecnico`, `plan_remediacion`, `notas`.

#### F30. Bloqueo
- Módulo: Operación > Bloqueos.
- Tipo: crear, ver y editar.
- Campos: `codigo`, `titulo`, `descripcion`, `estado`, `prioridad`, `owner`, `responsable_desbloqueo`, `fecha_reporte`, `fecha_resolucion`, `modulo_codigo`, `iniciativa_id`, `entrega_id`, `release_id`, `decision_id`, `impacto_operativo`, `proximo_paso`, `notas`.

#### F31. Lección aprendida
- Módulo: Operación > Lecciones aprendidas.
- Tipo: crear, ver y editar.
- Campos: `codigo`, `titulo`, `contexto`, `aprendizaje`, `accion_recomendada`, `estado`, `owner`, `fecha_leccion`, `modulo_codigo`, `iniciativa_id`, `entrega_id`, `release_id`, `auditoria_id`, `notas`.

#### F32. KPI ejecutivo
- Módulo: Analítica > KPIs.
- Tipo: crear, ver y editar.
- Campos: `codigo`, `nombre`, `descripcion`, `categoria`, `modulo_codigo`, `formula_texto`, `unidad`, `meta_valor`, `valor_actual`, `valor_anterior`, `tendencia`, `estado`, `owner`, `fecha_corte`, `notas`.

#### F33. Health score
- Módulo: Analítica > Health scores.
- Tipo: crear, ver y editar.
- Campos: `codigo`, `nombre`, `ambito`, `modulo_codigo`, `descripcion`, `peso`, `valor_actual`, `umbral_saludable`, `umbral_atencion`, `estado`, `owner`, `fecha_corte`, `notas`.
- Validación destacada: `umbral_saludable > umbral_atencion`.

#### F34. Decisión
- Módulo: Decisiones.
- Tipo: crear, ver y editar.
- Campos UI: `titulo`, `contexto`, `decision`, `alternativas`, `impacto`, `estado_codigo`, `owner`, `fecha_decision`, `iniciativa_id`, `entrega_id`, `ejecucion_validacion_id`, `links_texto`, `tags_texto`.
- Campos de dominio persistidos: `links[]` y `tags[]` se derivan desde los textos separados por coma.
- Relaciones: iniciativa, entrega, ejecución; además la pantalla muestra dependencias con insights, releases, bloqueos y reglas.

#### F35. Auditoría
- Módulo: Auditorías.
- Tipo: crear, ver y editar.
- Campos: `tipo_auditoria_codigo`, `alcance`, `checklist`, `evidencias`, `responsable`, `estado_codigo`, `fecha_auditoria`.

#### F36. Hallazgo de auditoría
- Módulo: Auditorías.
- Tipo: crear, ver y editar.
- Campos: `auditoria_id`, `titulo`, `descripcion`, `severidad_codigo`, `estado_codigo`, `modulo_id`, `decision_id`, `ejecucion_validacion_id`, `evidencia_url`.

#### F37. Catálogo de módulos
- Módulo: Ajustes.
- Tipo: crear y editar.
- Campos: `codigo`, `nombre`, `descripcion`, `orden`, `activo`.

#### F38. Catálogo de severidades
- Módulo: Ajustes.
- Tipo: crear y editar.
- Campos: `codigo`, `nombre`, `nivel`, `descripcion`, `activo`.

#### F39. Catálogo de ventanas
- Módulo: Ajustes.
- Tipo: crear y editar.
- Campos: `etiqueta_visible`, `tipo`, `anio`, `orden`, `fecha_inicio`, `fecha_fin`, `activo`.
- Validación destacada: `fecha_fin >= fecha_inicio`.

#### F40. Catálogo de etapas
- Módulo: Ajustes.
- Tipo: crear y editar.
- Campos: `etiqueta_visible`, `orden`, `activo`.

#### F41. KPI config
- Módulo: Ajustes.
- Tipo: crear y editar.
- Campos: `clave_kpi`, `nombre`, `unidad`, `meta_7`, `meta_30`, `meta_90`, `umbral_ok`, `umbral_atencion`, `activo`.

#### F42. Integración
- Módulo: Ajustes.
- Tipo: crear y editar.
- Campos UI: `clave`, `nombre`, `descripcion`, `habilitado`, `configuracion_texto`.
- Persistencia: `configuracion_publica` se deriva desde JSON parseado.

#### F43. Configuración RICE
- Módulo: Ajustes.
- Tipo: guardar configuración global.
- Campos: `alcance_periodo`, `esfuerzo_unidad`.

### 5.3 Tabla maestra de formularios

| Formulario | Módulo | Campos | Relaciones | Comentarios |
| --- | --- | --- | --- | --- |
| Ingreso | Acceso | 2 | Sesión | No es entidad de negocio PM |
| Objetivo roadmap | Roadmap | 4 | KR vía relación externa | Modal |
| Iniciativa | Roadmap | 10 | Objetivo, ventana, etapa, KR, hipótesis | Incluye cálculo RICE |
| Entrega | Roadmap | 9 | Iniciativa, ventanas, release | Modal |
| Matriz de valor | Priorización | 7 | Iniciativa | Puntaje derivado |
| Plantilla validación | Validación | 5 | Módulo | Modal |
| Plan validación | Validación | 10 | Módulo, plantilla | Modal |
| Ejecución validación | Validación | 10 | Plan, módulo | Modal |
| Período estratégico | Estrategia | 5 | Padre de entidades estratégicas | Modal |
| Objetivo estratégico | Estrategia | 8 | Período, KR | Modal |
| Key Result | Estrategia | 10 | Objetivo estratégico, roadmap, iniciativas | Modal con relaciones |
| KPI estratégico | Estrategia | 13 | Período | Modal |
| Hipótesis estratégica | Estrategia | 11 | Iniciativas | Modal |
| Segmento | Discovery | 6 | Insights, problemas, investigaciones | Modal |
| Insight | Discovery | 11 | Problemas, decisiones, segmento, módulo | Modal con selección múltiple |
| Problema/oportunidad | Discovery | 9 | Insights, objetivos estratégicos, segmento | Modal con selección múltiple |
| Investigación | Discovery | 11 | Insights, segmento | Modal con selección múltiple |
| Hipótesis discovery | Discovery | 11 | Problema, iniciativas | Modal con selección múltiple |
| Historia usuario | Requerimientos | 13 | Iniciativa, entrega, hipótesis discovery | Modal |
| Criterio aceptación | Requerimientos | 6 | Historia | CRUD embebido |
| Caso de uso | Requerimientos | 15 | Iniciativa, entrega, historia | Modal |
| Regla negocio | Requerimientos | 12 | Módulo, iniciativa, historia, decisión | Modal |
| RNF | Requerimientos | 11 | Iniciativa, entrega | Modal |
| Release | Lanzamientos | 20 | Iniciativa, entrega, decisión, checklist | Modal complejo |
| Checklist salida | Lanzamientos | 6 | Release | CRUD embebido |
| Seguimiento release | Lanzamientos | 8 | Release | Modal |
| Bug | Operación | 17 | Release, auditoría, hallazgo, entrega, iniciativa | Modal |
| Mejora | Operación | 16 | Insight, hipótesis discovery, entrega, iniciativa | Modal |
| Deuda técnica | Operación | 15 | Release, entrega, iniciativa | Modal |
| Bloqueo | Operación | 16 | Decisión, release, entrega, iniciativa | Modal |
| Lección aprendida | Operación | 14 | Release, auditoría, entrega, iniciativa | Modal |
| KPI ejecutivo | Analítica | 15 | Módulo | Modal |
| Health score | Analítica | 12 | Módulo | Modal |
| Decisión | Gobierno | 12 UI / 12 dominio | Iniciativa, entrega, ejecución, insights, releases, bloqueos | Links y tags transformados |
| Auditoría | Gobierno | 7 | Hallazgos | Modal |
| Hallazgo auditoría | Gobierno | 9 | Auditoría, módulo, decisión, ejecución | Modal |
| Catálogo módulo | Ajustes | 5 | Reutilizado por múltiples entidades | Modal |
| Catálogo severidad | Ajustes | 5 | Hallazgos | Modal |
| Catálogo ventana | Ajustes | 7 | Iniciativas y entregas | Modal |
| Catálogo etapa | Ajustes | 3 | Iniciativas | Modal |
| KPI config | Ajustes | 9 | Analítica configurativa | Modal |
| Integración | Ajustes | 5 UI / 5 dominio | Integraciones técnicas | JSON textual |
| Configuración RICE | Ajustes | 2 | Iniciativas | Formulario simple |

## 6. Relaciones entre módulos y entidades

### 6.1 Matriz resumida de relaciones

| Desde | Hacia | Tipo de relación | Estado |
| --- | --- | --- | --- |
| Objetivo roadmap | Iniciativa | 1:N | Explícita |
| Iniciativa | Entrega | 1:N | Explícita |
| Objetivo roadmap | KR | M:N | Explícita |
| Iniciativa | KR | M:N | Explícita |
| Iniciativa | Hipótesis estratégica | M:N | Explícita |
| Problema/oportunidad | Objetivo estratégico | M:N | Explícita |
| Insight | Problema/oportunidad | M:N | Explícita |
| Investigación | Insight | M:N | Explícita |
| Hipótesis discovery | Iniciativa | M:N | Explícita |
| Insight | Decisión | M:N | Explícita |
| Historia | Iniciativa/Entrega/Hipótesis discovery | N:1 opcional | Explícita |
| Caso de uso | Iniciativa/Entrega/Historia | N:1 opcional | Explícita |
| Regla de negocio | Módulo/Iniciativa/Historia/Decisión | N:1 opcional | Explícita |
| RNF | Iniciativa/Entrega | N:1 opcional | Explícita |
| Release | Iniciativa/Entrega/Decisión | N:1 opcional | Explícita |
| Checklist salida | Release | 1:N | Explícita |
| Seguimiento release | Release | 1:N | Explícita |
| Bug | Release/Auditoría/Hallazgo/Entrega/Iniciativa | N:1 opcional | Explícita |
| Mejora | Insight/Hipótesis discovery/Entrega/Iniciativa | N:1 opcional | Explícita |
| Deuda técnica | Release/Entrega/Iniciativa | N:1 opcional | Explícita |
| Bloqueo | Decisión/Release/Entrega/Iniciativa | N:1 opcional | Explícita |
| Lección aprendida | Release/Auditoría/Entrega/Iniciativa | N:1 opcional | Explícita |

### 6.2 Narrativa de relaciones

Hecho observado:

- El eje táctico principal es `objetivo roadmap -> iniciativa -> entrega`.
- El eje estratégico principal es `período -> objetivo estratégico -> key result`, acompañado por `KPI estratégico` e `hipótesis estratégica`.
- Discovery no solo documenta insumos: también enlaza problemas con objetivos estratégicos, insights con decisiones e hipótesis discovery con iniciativas.
- Requerimientos enlaza artefactos funcionales directamente con iniciativa, entrega o hipótesis discovery.
- Lanzamientos aparece después de delivery base: `release` cuelga opcionalmente de iniciativa y/o entrega.
- Operación se apoya opcionalmente en release, auditoría, hallazgo, decisión, insight o hipótesis discovery según entidad.

### 6.3 Consistencia conceptual observada

Fortalezas:

- Existe intención clara de trazabilidad cruzada real.
- Discovery no está aislado; puede desembocar en decisiones e iniciativas.
- Launch y operación no están forzados a existir, pero sí están conectables.

Tensiones:

- Varias relaciones críticas son opcionales, por lo que la trazabilidad depende mucho de disciplina de uso.
- Existen conceptos paralelos en capas distintas con nombres próximos.

## 7. Modelado actual de información

### 7.1 Capas de modelado observadas

| Capa | Evidencia | Observación |
| --- | --- | --- |
| Interfaces y types | `src/dominio/modelos.ts` | Modelo de dominio amplio y explícito |
| Schemas Zod | `src/compartido/validacion/esquemas.ts` | Validación centralizada para entradas |
| Casos de uso | `src/aplicacion/casos-uso/*.ts` | Orquestan CRUD y, en algunos módulos, sincronización de relaciones |
| Repositorios | `src/infraestructura/repositorios/*.ts` | Acceso Supabase por agregado funcional |
| Hooks utilitarios | `usePaginacion`, sesión, tema | No se evidencian stores globales de dominio tipo Zustand/Redux |
| Stores | No evidenciados | El estado es mayoritariamente local por página |

### 7.2 Hallazgos de modelado

1. El dominio del front sí modela entidades y enums suficientes para operar un sistema PM amplio.
2. Hay mezcla entre enums de front rígidos y catálogos dinámicos en base de datos.
3. Algunas entidades de negocio comparten nombre conceptual con otras distintas.
4. El modelado de relaciones M2M está bien evidenciado en estrategia y discovery.
5. No se evidencian adaptadores complejos ni stores de agregación cliente persistentes; predomina carga local por página.

## 8. Auditoría de tablas, listados y vistas

### 8.1 Tablas y columnas visibles evidenciadas

| Pantalla | Columnas visibles evidenciadas | Filtros visibles | Acciones por fila | Exportación |
| --- | --- | --- | --- | --- |
| Objetivos roadmap | Nombre, Estado, Prioridad, Vínculo estratégico, Acciones | búsqueda, estado, prioridad | ver, editar, eliminar | CSV |
| Iniciativas roadmap | Iniciativa, Objetivo, Planificación, RICE, Estado, Acciones | búsqueda, objetivo, ventana, etapa, estado, prioridad | ver, editar, eliminar | CSV |
| Entregas roadmap | Entrega, Iniciativa, Ventanas, Fecha objetivo, Fecha completado, Estado, Acciones | búsqueda, estado, prioridad, ventana | ver, editar, eliminar | CSV |
| Matriz de valor | Título, Iniciativa, Planificación, Puntaje, Estado, Acciones | búsqueda, iniciativa, estado | ver, editar, eliminar | No evidenciado en esta lectura |
| Validación por módulo | Plan, Módulo, Estado, Owner, Acciones | búsqueda, módulo, estado | ver, editar, eliminar | CSV |
| Ejecuciones validación | Fecha, Plan, Módulo, Estado, Acciones | búsqueda, módulo, estado, fecha desde/hasta | ver, editar, eliminar | CSV |
| OKRs objetivos | Objetivo, Periodo, Estado, Acciones | período, estado, prioridad | ver, editar, eliminar | No evidenciado |
| OKRs KR | KR, Avance, Vínculos, Acciones | período, estado | ver, editar, eliminar | No evidenciado |
| KPIs estratégicos | KPI, Periodo, Valor/Meta, Semáforo, Acciones | período, estado, owner | ver, editar, eliminar | No evidenciado |
| Hipótesis estratégicas | Hipótesis, Periodo, Estado, Vínculos, Acciones | período, estado, prioridad | ver, editar, eliminar | No evidenciado |
| Segmentos | Segmento, Necesidades y dolores, Estado, Acciones | búsqueda, activo | ver, editar, eliminar | CSV |
| Insights | Insight, Contexto, Estado, Fecha, Acciones | búsqueda, tipo, estado, relevancia, módulo, segmento, fecha | ver, editar, eliminar | CSV |
| Problemas/oportunidades | Registro, Contexto, Estado, Acciones | búsqueda, tipo, prioridad, estado, segmento, módulo | ver, editar, eliminar | CSV |
| Investigaciones | Investigación, Segmento, Estado, Acciones | búsqueda, estado, segmento | ver, editar, eliminar | CSV |
| Hipótesis discovery | Hipótesis, Problema, Estado, Acciones | búsqueda, estado, prioridad, problema | ver, editar, eliminar | CSV |
| Historias | Historia, Vínculos, Estado, Acciones | búsqueda, prioridad, estado, owner, iniciativa, entrega | ver, editar, eliminar, gestionar criterios | CSV |
| Casos de uso | Caso de uso, Vínculos, Estado, Acciones | búsqueda, estado, prioridad | ver, editar, eliminar | CSV |
| Reglas de negocio | Regla, Contexto, Estado, Acciones | búsqueda, criticidad, estado, categoría, módulo | ver, editar, eliminar | CSV |
| RNF | RNF, Vínculos, Estado, Acciones | búsqueda, tipo, estado, prioridad | ver, editar, eliminar | CSV |
| Releases | Release, Plan, Vínculos, Checklist de salida, Acciones | búsqueda, tipo, estado, owner, iniciativa, entrega, decisión, desde/hasta | ver, editar, eliminar | CSV |
| Seguimiento release | Release, Fecha, Estabilización, Owner, Acciones | búsqueda, estado_estabilizacion | ver, editar, eliminar | CSV |
| Bugs | Bug, Estado, Prioridad, Contexto, Fechas, Acciones | búsqueda, estado, prioridad, módulo, owner, release, auditoría, fechas | ver, editar, eliminar | CSV |
| Mejoras | Mejora, Estado, Prioridad, Origen, Fechas, Acciones | búsqueda, estado, prioridad, módulo, owner, insight, hipótesis | ver, editar, eliminar | CSV |
| Deuda técnica | Deuda, Estado, Prioridad, Contexto, Fechas, Acciones | búsqueda, estado, prioridad, módulo, owner | ver, editar, eliminar | CSV |
| Bloqueos | Bloqueo, Estado, Prioridad, Contexto, Fechas, Acciones | búsqueda, estado, prioridad, módulo, owner | ver, editar, eliminar | CSV |
| Lecciones | Lección, Estado, Contexto, Fecha, Acciones | búsqueda, estado, módulo, owner | ver, editar, eliminar | CSV |
| KPIs analítica | KPI, Categoría, Valor/Meta, Tendencia, Estado, Corte, Acciones | búsqueda, categoría, estado | ver, editar, eliminar | CSV |
| Portafolio | Dominio, Iniciativas, Entregas, Releases, Bugs, Bloqueos, Deuda, Mejoras, Hallazgos, Health | sin filtros evidenciados | ver | CSV |
| Tendencias | Periodo, Releases, Bugs reportados, Bugs resueltos, Mejoras, Deuda técnica, Validaciones, Decisiones, Hallazgos | no evidenciado | ver | CSV |
| Decisiones | Título, Estado, Fecha, Owner, Acciones | búsqueda, estado, desde/hasta | ver, editar, eliminar | CSV |
| Auditorías | auditoría/hallazgo según tab | filtros por tipo/estado/severidad según tab | ver, editar, eliminar | CSV |
| Trazabilidad | Fecha, Módulo, Entidad, Acción, Actor, Resumen, Detalle | módulo, entidad, acción, actor, fechas | ver JSON | No evidenciado |

## 9. Mapa actual del sistema de Product Management

### 9.1 Qué artefactos de PM existen hoy

Hecho observado:

- Estrategia: períodos, objetivos estratégicos, KR, KPIs estratégicos, hipótesis estratégicas.
- Discovery: segmentos, insights, problemas/oportunidades, investigaciones, hipótesis discovery.
- Delivery/roadmap: objetivos roadmap, iniciativas, entregas, matriz de valor.
- Validación/gobierno de entrega: planes, plantillas, ejecuciones de validación, decisiones, auditorías, hallazgos.
- Lanzamiento: releases, checklist de salida, seguimiento post-lanzamiento.
- Operación: bugs, mejoras, deuda técnica, bloqueos, lecciones aprendidas.
- Analítica: KPIs ejecutivos, portafolio, tendencias, health scores.

### 9.2 Qué partes parecen bien encaminadas

- Discovery y estrategia sí tienen entidades propias y relaciones reales.
- Launch y operación sí existen como capas diferenciadas del roadmap.
- Requerimientos sí está separado del roadmap base.
- Gobierno y trazabilidad sí están explícitamente modelados.

### 9.3 Qué partes están mezcladas o con frontera débil

- Objetivo roadmap vs objetivo estratégico.
- Hipótesis estrategia vs hipótesis discovery.
- KPI estratégico vs KPI ejecutivo vs KPI config vs health score.
- Entrega vs release como artefactos cercanos pero no equivalentes.

### 9.4 Distribución por fase PM

| Fase PM | Evidencia en el portal |
| --- | --- |
| Estrategia | Fuerte |
| Discovery | Fuerte |
| Delivery | Fuerte |
| Lanzamiento | Media-alta |
| Operación | Fuerte |
| Analítica | Media-alta |

## 10. Evaluación conceptual de orden y taxonomía

### 10.1 Solapamientos y duplicidades

1. `objetivos` vs `pm_objetivos_estrategicos`.
2. `pm_hipotesis` vs `pm_hipotesis_discovery`.
3. `pm_kpis_estrategicos` vs `pm_kpis_ejecutivos` vs `pm_kpis_config` vs `pm_health_scores`.
4. Entrega y release como conceptos relacionados pero no equivalentes.

### 10.2 Ambigüedades

- No queda completamente autoevidente dónde debe crearse un objetivo nuevo sin decidir primero si es estratégico o roadmap.
- No queda completamente autoevidente cuándo una hipótesis es estratégica y cuándo es discovery.
- No queda completamente autoevidente si una salida relevante debe modelarse como entrega, release o ambas.

### 10.3 Mezclas detectadas

- Estrategia y ejecución: el resumen analítico mezcla señales de estrategia, delivery, validación y operación en una sola lectura ejecutiva.
- Resultado y ejecución: los KPI conviven con salud operativa y backlog funcional en analítica.
- Discovery y delivery: hipótesis discovery pueden vincularse a iniciativas, lo cual es útil, pero exige criterio semántico disciplinado.

## 11. Qué existe hoy para organizar lanzamiento y marcha blanca

### 11.1 Dónde encajaría hoy una iniciativa de lanzamiento

Hecho observado:

- Existe entidad `Iniciativa` en roadmap.
- Existe entidad `Release` en lanzamientos, con vínculo opcional a iniciativa y entrega.

Diagnóstico:

- Una iniciativa de lanzamiento podría registrarse hoy como `Iniciativa` si se quiere tratar como unidad táctica de roadmap.
- El acto formal de salida a producción ya tiene entidad específica: `Release`.
- Por lo tanto, el sistema separa parcialmente iniciativa de lanzamiento y release.

### 11.2 Dónde encajaría hoy una marcha blanca

Hecho observado:

- No existe entidad llamada `marcha blanca`.
- Sí existe `Seguimiento post-lanzamiento` con `estado_estabilizacion`, `observaciones`, `incidencias_detectadas`, `decision_requerida`.

Diagnóstico:

- Como concepto explícito, marcha blanca no está evidenciada.
- Como capacidad parcial, el sistema sí tiene un contenedor operativo para seguimiento posterior a un release.
- Por lo tanto, hoy la marcha blanca sería representable solo de forma indirecta, no como taxonomía formal.

### 11.3 Si existen releases como concepto real

Sí. Es un concepto real, con modelo, esquema, caso de uso, repositorio, SQL propio, checklist de salida y seguimiento post-lanzamiento.

### 11.4 Si el sistema soporta hitos

Hecho observado:

- Hay fechas programadas y reales en release.
- Hay ventanas planificadas/reales en entregas.
- Hay fechas en planes, ejecuciones, bugs, mejoras, bloqueos, lecciones y seguimiento release.

Diagnóstico:

- Soporta hitos por fechas y estados, pero no existe entidad general de “hito” como tal.

### 11.5 Si objetivos, iniciativas y entregas alcanzan para modelar bien lanzamiento

Diagnóstico:

- Alcanzan para modelar planificación y delivery base.
- No alcanzan por sí solos para modelar correctamente lanzamiento porque el sistema ya necesitó crear `Release`, `Checklist de salida` y `Seguimiento post-lanzamiento`.

### 11.6 Limitaciones conceptuales actuales

- Marcha blanca no es concepto explícito.
- Release depende de relaciones opcionales, por lo que puede quedar desacoplado de iniciativa/entrega si se usa sin disciplina.
- No existe una taxonomía explícita de hito, hito de despliegue o fase de lanzamiento.

## 12. Hallazgos priorizados

| Severidad | Título | Descripción | Impacto | Evidencia | Módulo afectado | Tipo |
| --- | --- | --- | --- | --- | --- | --- |
| Crítico | Doble taxonomía de objetivos | Coexisten objetivo roadmap y objetivo estratégico con semánticas cercanas | Riesgo alto de registrar objetivos en locus incorrecto | `modelos.ts`, `PaginaObjetivosRoadmap.tsx`, `PaginaOkrs.tsx` | Roadmap / Estrategia | Taxonomía |
| Crítico | Doble taxonomía de hipótesis | Existen hipótesis estratégicas y discovery separadas | Riesgo alto de mezclar hipótesis de negocio con hipótesis de experimento | `modelos.ts`, `PaginaHipotesis.tsx`, `PaginaHipotesisDiscovery.tsx` | Estrategia / Discovery | Taxonomía |
| Alto | KPI fragmentado en cuatro conceptos | KPI estratégico, KPI ejecutivo, KPI config y health score conviven como familias distintas | Riesgo de reporting inconsistente | `modelos.ts`, `PaginaKpisEstrategicos.tsx`, `PaginaKpis.tsx`, `PaginaAjustes.tsx`, `PaginaHealthScores.tsx` | Estrategia / Analítica / Ajustes | Consistencia |
| Alto | Detalle/crear/editar mayoritariamente no navegables | El patrón dominante es listado + modal | Baja profundidad navegable y menor claridad de “pantallas de detalle” | `enrutador.tsx`, páginas CRUD | Transversal | Navegación |
| Alto | Release y entrega no están delimitados por sí solos | El sistema necesita ambos conceptos y la relación es opcional | Riesgo de modelado inconsistente de delivery vs lanzamiento | `modelos.ts`, `PaginaEntregasRoadmap.tsx`, `PaginaReleases.tsx` | Roadmap / Lanzamientos | Conceptual |
| Alto | Marcha blanca no existe como concepto formal | Solo existe seguimiento post-lanzamiento | Riesgo de documentar marcha blanca de forma dispersa | `PaginaSeguimientoLanzamientos.tsx`, `sql_fase_4_lanzamientos_supabase.md` | Lanzamientos | Vacío conceptual |
| Medio | Trazabilidad fuerte pero dependiente del uso | Muchas relaciones críticas son opcionales | Puede haber registros valiosos sin conexión transversal | modelos y formularios operativos | Transversal | Trazabilidad |
| Medio | Catálogos y enums mezclados | Algunos estados son enums rígidos y otros catálogos dinámicos | Riesgo de gobernanza desigual de estados | `modelos.ts`, `esquemas.ts`, `PaginaAjustes.tsx` | Transversal | Consistencia |
| Medio | Resumen analítico mezcla capas muy distintas | Estrategia, delivery, gobierno y operación se leen en un mismo tablero | Buena visión ejecutiva, pero semánticamente heterogénea | `PaginaResumenAnalitico.tsx` | Analítica | Conceptual |
| Bajo | Sin store de dominio central | Predomina estado local por pantalla | Redundancia de cargas y lectura fragmentada, aunque funcional | páginas y casos de uso | Transversal | Arquitectura front |

## 13. Conclusión final

El PM Portal hoy sí es entendible como plataforma PM amplia y técnicamente consistente. También es suficientemente usable para registrar trabajo de PM en varias capas del ciclo de producto. Sin embargo, no está completamente ordenado para decidir sin ambigüedad dónde deben vivir futuros objetivos, iniciativas, entregas, releases e hipótesis.

La principal urgencia no parece ser técnica sino taxonómica. El sistema ya tiene suficiente cobertura funcional para que seguir cargando información sin ordenar primero la semántica de objetivos, hipótesis, KPI, entrega y release incremente la confusión futura.

Conclusión sintetizada:

- Entendibilidad técnica: alta.
- Cobertura funcional: alta.
- Claridad taxonómica: media.
- Preparación para seguir creciendo sin ordenar conceptos primero: insuficiente.

## 14. Anexo técnico de evidencia

### 14.1 Archivos estructurales

- `src/presentacion/navegacion/menuPortal.ts`
- `src/aplicacion/enrutador/enrutador.tsx`
- `src/presentacion/layout/PlantillaPortal.tsx`

### 14.2 Modelos y validaciones

- `src/dominio/modelos.ts`
- `src/compartido/validacion/esquemas.ts`

### 14.3 Casos de uso y trazabilidad

- `src/aplicacion/casos-uso/estrategia.ts`
- `src/aplicacion/casos-uso/discovery.ts`
- `src/aplicacion/casos-uso/requerimientos.ts`
- `src/aplicacion/casos-uso/lanzamientos.ts`
- `src/aplicacion/casos-uso/operacion.ts`
- `src/aplicacion/casos-uso/analitica.ts`
- `src/aplicacion/casos-uso/historialCambios.ts`

### 14.4 Páginas clave de evidencia

- `src/presentacion/paginas/roadmap/PaginaRoadmap.tsx`
- `src/presentacion/paginas/roadmap/objetivos/PaginaObjetivosRoadmap.tsx`
- `src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx`
- `src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx`
- `src/presentacion/paginas/matriz-valor/PaginaMatrizValor.tsx`
- `src/presentacion/paginas/validacion/por-modulo/PaginaValidacionPorModulo.tsx`
- `src/presentacion/paginas/validacion/ejecuciones/PaginaEjecucionesValidacion.tsx`
- `src/presentacion/paginas/estrategia/okrs/PaginaOkrs.tsx`
- `src/presentacion/paginas/estrategia/kpis/PaginaKpisEstrategicos.tsx`
- `src/presentacion/paginas/estrategia/hipotesis/PaginaHipotesis.tsx`
- `src/presentacion/paginas/discovery/insights/PaginaInsights.tsx`
- `src/presentacion/paginas/discovery/problemas/PaginaProblemasOportunidades.tsx`
- `src/presentacion/paginas/discovery/investigaciones/PaginaInvestigaciones.tsx`
- `src/presentacion/paginas/discovery/segmentos/PaginaSegmentos.tsx`
- `src/presentacion/paginas/discovery/hipotesis/PaginaHipotesisDiscovery.tsx`
- `src/presentacion/paginas/requerimientos/historias/PaginaHistoriasUsuario.tsx`
- `src/presentacion/paginas/requerimientos/historias/GestionCriteriosAceptacion.tsx`
- `src/presentacion/paginas/requerimientos/casos-uso/PaginaCasosUso.tsx`
- `src/presentacion/paginas/requerimientos/reglas/PaginaReglasNegocio.tsx`
- `src/presentacion/paginas/requerimientos/no-funcionales/PaginaRequerimientosNoFuncionales.tsx`
- `src/presentacion/paginas/lanzamientos/PaginaResumenLanzamientos.tsx`
- `src/presentacion/paginas/lanzamientos/releases/PaginaReleases.tsx`
- `src/presentacion/paginas/lanzamientos/releases/GestionChecklistSalida.tsx`
- `src/presentacion/paginas/lanzamientos/seguimiento/PaginaSeguimientoLanzamientos.tsx`
- `src/presentacion/paginas/operacion/PaginaResumenOperacion.tsx`
- `src/presentacion/paginas/operacion/bugs/PaginaBugs.tsx`
- `src/presentacion/paginas/operacion/mejoras/PaginaMejoras.tsx`
- `src/presentacion/paginas/operacion/deuda-tecnica/PaginaDeudaTecnica.tsx`
- `src/presentacion/paginas/operacion/bloqueos/PaginaBloqueos.tsx`
- `src/presentacion/paginas/operacion/lecciones/PaginaLeccionesAprendidas.tsx`
- `src/presentacion/paginas/analitica/PaginaResumenAnalitico.tsx`
- `src/presentacion/paginas/analitica/kpis/PaginaKpis.tsx`
- `src/presentacion/paginas/analitica/portafolio/PaginaPortafolio.tsx`
- `src/presentacion/paginas/analitica/tendencias/PaginaTendencias.tsx`
- `src/presentacion/paginas/analitica/health-scores/PaginaHealthScores.tsx`
- `src/presentacion/paginas/decisiones/PaginaDecisiones.tsx`
- `src/presentacion/paginas/auditorias/PaginaAuditorias.tsx`
- `src/presentacion/paginas/ajustes/PaginaAjustes.tsx`
- `src/presentacion/paginas/trazabilidad/PaginaTrazabilidad.tsx`

### 14.5 Documentos SQL leídos

- `docs/sql_fase_1_estrategia_trazabilidad.md`
- `docs/sql_fase_2_discovery_supabase.md`
- `docs/sql_fase_3_requerimientos_supabase.md`
- `docs/sql_fase_4_lanzamientos_supabase.md`
- `docs/sql_fase_5_operacion_supabase.md`
- `docs/sql_fase_6_analitica_supabase.md`

### 14.6 Notas metodológicas finales

- Auditoría realizada en solo lectura.
- No se hicieron cambios funcionales al portal.
- Cuando algo no quedó confirmado directamente por código leído, se indicó como inferencia o vacío conceptual.
- La evaluación se basó en estructura real, modelos, formularios, navegación, casos de uso, repositorios y SQL documentado del propio módulo.
