# IMPLEMENTACION - INTEGRIDAD JERARQUICA DE FECHAS EN ROADMAP

## 1. Resumen ejecutivo

- Se implemento control jerarquico de fechas en formularios de Iniciativas y Entregables.
- La UI ahora limita el calendario con `min` y `max` cuando el padre tiene `fecha_inicio` y `fecha_fin` validas.
- La validacion del formulario ahora rechaza fechas fuera del rango del padre aunque el valor entre por escritura manual o por edicion de un registro existente.
- Antes de guardar se aplica una validacion defensiva adicional para evitar persistir incoherencias nuevas.
- No se tocaron estados, releases, cronograma, fuentes de datos ni CRUD base.
- La funcionalidad existente se preservo y la compatibilidad historica se mantiene cuando el padre no tiene rango completo o valido.
- Riesgo detectado: el build sigue mostrando el warning historico de Vite por tamano de bundle, sin cambios relevantes en esta fase.

## 2. Archivos modificados

| Archivo | Motivo | Tipo de cambio |
| --- | --- | --- |
| `src/compartido/validacion/roadmapJerarquiaFechas.ts` | Centralizar el calculo de limites y la validacion jerarquica para evitar duplicacion | Nuevo helper compartido |
| `src/presentacion/paginas/roadmap/iniciativas/PaginaIniciativasRoadmap.tsx` | Aplicar rango del objetivo padre en UI, validacion y guardado de iniciativas | Ajuste puntual de formulario |
| `src/presentacion/paginas/roadmap/entregas/PaginaEntregasRoadmap.tsx` | Aplicar rango de la iniciativa padre en UI, validacion y guardado de entregables | Ajuste puntual de formulario |

## 3. Regla aplicada en Iniciativas

- El formulario obtiene el objetivo seleccionado desde `react-hook-form` usando `watch('objetivo_id')`.
- Se resuelve el objetivo actual contra un mapa en memoria con las entidades ya cargadas por la pagina.
- Si el objetivo padre tiene `fecha_inicio` y `fecha_fin` validas, el input `fecha_inicio` de la iniciativa usa ese rango como `min` y `max`.
- Si el usuario ya eligio `fecha_inicio`, el input `fecha_fin` usa como `min` la mayor fecha valida entre el inicio del objetivo y la `fecha_inicio` elegida.
- La validacion del formulario muestra mensajes humanos: `La fecha debe estar dentro del rango del objetivo`.
- En el submit se ejecuta la misma regla antes de llamar a `crearIniciativa` o `editarIniciativa`.
- Si el objetivo no tiene rango completo o su rango historico es invalido, no se aplican restricciones nuevas y se conserva el comportamiento anterior.

## 4. Regla aplicada en Entregables

- El formulario obtiene la iniciativa seleccionada desde `react-hook-form` usando `watch('iniciativa_id')`.
- Se resuelve la iniciativa actual contra un mapa en memoria con las entidades ya cargadas por la pagina.
- Si la iniciativa padre tiene `fecha_inicio` y `fecha_fin` validas, el input `fecha_inicio` del entregable usa ese rango como `min` y `max`.
- Si el usuario ya eligio `fecha_inicio`, el input `fecha_fin` usa como `min` la mayor fecha valida entre el inicio de la iniciativa y la `fecha_inicio` elegida.
- La validacion del formulario muestra mensajes humanos: `La fecha debe estar dentro del rango de la iniciativa`.
- En el submit se ejecuta la misma regla antes de llamar a `crearEntrega` o `editarEntrega`.
- Si la iniciativa no tiene rango completo o su rango historico es invalido, no se endurece el comportamiento previo.

## 5. Cambios en validacion

- Se mantuvieron intactas las reglas existentes de `fecha_inicio <= fecha_fin` y de `fecha_objetivo` para entregables.
- Se agrego un helper compartido que valida si `fecha_inicio` o `fecha_fin` quedan fuera del rango del padre.
- Los mensajes mostrados son claros y no tecnicos.
- No se endurecieron estados, releases ni reglas SQL.
- No se volvieron obligatorias fechas que hoy siguen siendo opcionales.

## 6. Cambios en UX de calendario

- Los date inputs de Iniciativas y Entregables ahora usan `min` y `max` cuando el padre tiene rango completo.
- `fecha_fin` ademas respeta la `fecha_inicio` seleccionada como limite inferior cuando esa fecha cae dentro del rango del padre.
- Si el padre no tiene rango, los inputs siguen funcionando como antes.
- Si un registro historico abre con fechas fuera de rango, el formulario muestra el error y no permite guardar hasta corregirlo.

## 7. Compatibilidad y no regresion

- Se preservaron create, edit y view en ambos modulos.
- No se tocaron modelos, repositorios, releases ni cronograma.
- No se altero el significado de estados ni su flujo.
- No se aplicaron restricciones destructivas sobre historicos sin padre o sin fechas del padre.
- La logica comun se extrajo a un helper pequeno para evitar duplicacion innecesaria entre formularios.

## 8. Verificaciones tecnicas

- `npm run dev`: servidor Vite inicia correctamente en `http://localhost:5181/`.
- `npm run lint`: ejecutado sin errores.
- `npm run build`: ejecutado sin errores de TypeScript ni de compilacion.
- Render correcto: la aplicacion abrio correctamente en el navegador integrado.
- Errores runtime: no hubo fallos de arranque; no fue posible inspeccionar consola del navegador desde las herramientas disponibles en esta sesion.
- Observacion: persiste el warning historico de Vite por tamano de chunk, previo y ajeno a esta implementacion.

## 9. Riesgos residuales

- Si existieran padres historicos con rango incoherente (`fecha_inicio > fecha_fin`), la restriccion jerarquica no se activa para no bloquear datos de forma agresiva.
- La proteccion se aplica en UI y submit del frontend; todavia no existe una barrera equivalente en base de datos, lo cual fue deliberadamente evitado en esta fase.
- No se incorporaron mensajes informativos extras de rango visible para no recargar la UX actual.

## 10. Recomendacion siguiente

- Siguiente fase recomendada: agregar una validacion no destructiva de auditoria para detectar padres historicos con rango invalido y listar excepciones a corregir manualmente.
- Todavia no conviene tocar restricciones SQL, releases ni cronograma mientras no se cierre primero la higiene de datos historicos.