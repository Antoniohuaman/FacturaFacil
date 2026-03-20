# IMPLEMENTACIÓN — REFUERZO DE CONTENCIÓN JERÁRQUICA FUERA DEL FRONTEND

## 1. Resumen ejecutivo

Se corrigió el riesgo de depender solo del frontend para impedir que una iniciativa quede fuera del rango de su objetivo o que una entrega quede fuera del rango de su iniciativa.

El riesgo era real porque la regla vivía en `min` / `max`, validación de formulario y chequeos defensivos en submit, pero no existía una segunda barrera equivalente antes de persistir en la capa de aplicación.

La nueva protección quedó en la capa de aplicación, dentro del flujo de casos de uso de create/edit para iniciativas y entregas, antes de llamar a los repositorios de persistencia.

No se tocó cronograma, layout, scroll, filtros, tooltips, KPIs, semántica temporal del timeline ni UX visual.

## 2. Archivos modificados

| Archivo | Motivo | Tipo de cambio |
| --- | --- | --- |
| `apps/pm-portal/src/aplicacion/validaciones/contencionJerarquicaRoadmap.ts` | Centralizar la validación de negocio reutilizable y el error tipado | Nuevo archivo |
| `apps/pm-portal/src/aplicacion/casos-uso/iniciativas.ts` | Validar contención contra el objetivo padre antes de crear/editar | Refuerzo de lógica de aplicación |
| `apps/pm-portal/src/aplicacion/casos-uso/entregas.ts` | Validar contención contra la iniciativa padre antes de crear/editar | Refuerzo de lógica de aplicación |
| `apps/pm-portal/src/infraestructura/repositorios/repositorioObjetivos.ts` | Permitir leer el objetivo padre por id desde aplicación | Extensión mínima de repositorio |
| `apps/pm-portal/src/infraestructura/repositorios/repositorioIniciativas.ts` | Permitir leer la iniciativa padre por id desde aplicación | Extensión mínima de repositorio |

## 3. Estado anterior

Antes de este cambio, la validación de contención jerárquica vivía en:

- límites `min` / `max` de inputs tipo fecha
- helper compartido de frontend
- validación defensiva en submit de formularios

Eso era insuficiente porque cualquier nuevo punto de escritura que llamara directo a los casos de uso o repositorios podía persistir datos fuera del rango jerárquico sin pasar por la UI actual.

## 4. Solución implementada

La nueva defensa se implementó en capa de aplicación.

### Cómo se validan iniciativas

Antes de `crearIniciativa` y `editarIniciativa`, el caso de uso lee el objetivo padre cuando `objetivo_id` existe.

Luego invoca una validación compartida que aplica estas reglas:

- si el objetivo no tiene rango completo y válido, no bloquea por jerarquía
- si la iniciativa no tiene fechas, no inventa reglas nuevas
- si el objetivo sí tiene rango válido, bloquea cuando `fecha_inicio` y/o `fecha_fin` de la iniciativa quedan fuera del rango

### Cómo se validan entregables

Antes de `crearEntrega` y `editarEntrega`, el caso de uso lee la iniciativa padre cuando `iniciativa_id` existe.

Luego aplica la misma estrategia:

- si la iniciativa no tiene rango completo y válido, no bloquea por jerarquía
- si la entrega no tiene fechas, no inventa reglas nuevas
- si la iniciativa sí tiene rango válido, bloquea cuando `fecha_inicio` y/o `fecha_fin` de la entrega quedan fuera del rango

### Cómo se consulta al padre

Se agregaron métodos `obtenerPorId` en los repositorios de objetivos e iniciativas usando `maybeSingle()`, sin alterar los métodos existentes de listar/crear/editar/eliminar.

## 5. Manejo de errores

La validación nueva lanza un error tipado de negocio con mensajes claros:

- `La iniciativa debe estar dentro del rango del objetivo`
- `La entrega debe estar dentro del rango de la iniciativa`

La UI actual ya captura `error.message` en los formularios de iniciativas y entregas, así que el error llega limpio a la interfaz sin introducir un rediseño de UX ni una capa nueva de traducción.

Se mantuvo la consistencia con el sistema actual porque no se cambiaron componentes visuales ni el patrón existente de manejo de errores en pantalla.

## 6. Compatibilidad y no regresión

Se mantuvo intacto:

- el frontend de formularios
- la validación visual existente
- cronograma completo
- navegación y modales existentes
- persistencia principal de roadmap fuera de este refuerzo

No se rompió `create/edit` actual porque los formularios siguen llamando a los mismos casos de uso; la diferencia es que ahora esos casos de uso validan la regla de negocio antes de persistir.

Confirmación de cronograma: no se tocó ningún comportamiento ni archivo visual del cronograma en esta fase.

Caso 5 documentado: si existe un registro histórico inválido y se intenta editar manteniendo fechas fuera del rango de un padre válido, la persistencia ahora se bloquea hasta corregir esas fechas. No se oculta el problema.

## 7. Limpieza técnica

- no quedaron imports muertos
- no quedaron helpers sin uso
- la lógica reutilizable quedó concentrada en un helper de aplicación con nombre de dominio entendible
- no se agregó código temporal ni comentarios basura

## 8. Verificaciones técnicas

- `npm run dev`
  - el portal PM inició correctamente en `http://localhost:5181/`
- `npm run lint`
  - sin errores
- `npm run build`
  - compilación correcta
  - se mantiene una advertencia preexistente de Vite por tamaño de chunk, no introducida por este cambio

### Resultado de validación operativa

- la aplicación arranca correctamente
- no se introdujeron errores nuevos de TypeScript, lint o build
- la UI de iniciativas y entregas sigue usando los mismos casos de uso y el mismo patrón de manejo de errores
- no se realizó una prueba manual autenticada end-to-end de creación/edición desde navegador dentro de esta sesión, así que esa verificación funcional queda inferida por el mantenimiento del flujo actual y la validación técnica verde, no por una interacción manual completa

## 9. Riesgos residuales

- la validación visual del frontend sigue siendo la primera barrera, pero ya no es la única
- todavía no existe enforcement equivalente confirmado en backend o SQL cross-table
- un cliente externo que escriba directo a la base fuera de estos casos de uso seguiría necesitando una capa adicional de protección en el futuro

## 10. Recomendación siguiente

El siguiente paso prudente es mover esta misma regla a una capa backend o a una política de persistencia controlada por servidor, pero solo después de diseñar una estrategia segura para validaciones cross-table sin introducir fragilidad operativa ni complejidad SQL innecesaria.