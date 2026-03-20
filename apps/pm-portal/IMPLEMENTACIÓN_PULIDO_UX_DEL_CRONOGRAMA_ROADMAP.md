# IMPLEMENTACIÓN — PULIDO UX DEL CRONOGRAMA ROADMAP

## 1. Resumen ejecutivo
- Se refinó el hover sincronizado entre panel izquierdo y timeline para que la fila activa se lea mejor como una sola entidad visual.
- Se aplicó una compactación fina adicional reduciendo altura mínima, padding vertical, separación interna e indentación por nivel sin afectar legibilidad.
- Se reforzó la diferencia visual entre filas expandibles y filas terminales mediante un affordance más claro para chevrons y un marcador terminal neutro no clickeable.
- No se tocaron lógica temporal, persistencia, backend, modelos, reglas de negocio, filtros funcionales, barras, línea de HOY, scroll, sticky, tooltips ni botones superiores.
- La compatibilidad funcional se preservó porque los cambios son visuales, locales al render y sin alterar la estructura de datos ni la expansión.

## 2. Archivos modificados

| Archivo | Motivo | Tipo de cambio |
| --- | --- | --- |
| apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx | Refinar hover de fila completa, compactación fina y claridad expandible vs terminal | Ajuste UX/UI visual no funcional |
| apps/pm-portal/IMPLEMENTACIÓN_PULIDO_UX_DEL_CRONOGRAMA_ROADMAP.md | Documentar implementación, alcance y verificaciones | Documentación |

## 3. Problema anterior
- El hover sincronizado existía, pero todavía se sentía tenue y no terminaba de vincular con suficiente claridad la jerarquía izquierda con el renglón temporal derecho.
- La densidad visual aún permitía una compactación adicional en padding, altura mínima y separación entre control, texto y badges.
- La diferencia entre expandibles y terminales dependía demasiado de la ausencia de chevron, lo que hacía menos inmediata la lectura jerárquica en escaneos rápidos.
- La lectura general del panel izquierdo podía pulirse para que la jerarquía se perciba más limpia y la relación con el timeline sea más evidente sin introducir ruido visual.

## 4. Solución implementada
- Se refinó `obtenerClaseFila()` para que el estado activo use una señal más cohesionada: fondo sutil, acento lateral y contorno interno moderado según el tipo de fila.
- En el timeline se agregó una capa de realce horizontal suave y una marca de arranque en el borde izquierdo de la banda temporal activa, reforzando la relación visual entre título y carril temporal.
- Se redujo la altura mínima de fila de 52 a 48 px y se ajustaron padding vertical, gap interno e indentación por nivel para lograr una compactación fina adicional sin sensación de amontonamiento.
- Se reajustaron levemente las posiciones verticales de las bandas temporales para mantener equilibrio visual con la nueva densidad.
- Se creó un affordance más claro para filas expandibles con chevrons más definidos y estados activos coherentes con el hover.
- Las filas terminales dejaron de apoyarse solo en un hueco vacío y ahora usan un marcador vertical neutro, reservado y no interactivo, evitando que parezcan casi expandibles.
- Se refinó la tipografía del título por nivel para que objetivo, iniciativa y entrega tengan una jerarquía visual más rápida de leer.

## 5. Compatibilidad y no regresión
- Se preservó el cálculo temporal del cronograma, la construcción de segmentos, la medición de alturas, el expand/collapse y la sincronización entre jerarquía y timeline.
- No se modificaron `useState`, `useMemo` ni estructuras de datos vinculadas a filtros, persistencia o timeline.
- La línea de HOY sigue en su capa independiente por encima del realce de fila, por lo que no se ve afectada.
- Los tooltips continúan operando sobre sus anclas previas y el hover agregado no introduce interceptores nuevos sobre barras ni sobre HOY.
- El scroll horizontal, el scroll interno vertical, el sticky visual entre paneles y el resize de la columna izquierda permanecen intactos.

## 6. Limpieza técnica
- No se agregaron imports muertos ni variables sin usar.
- No se introdujo código muerto ni helpers huérfanos; los nuevos helpers se integraron directamente al render existente.
- Los cambios se concentraron en el archivo de la vista para evitar refactors laterales innecesarios.

## 7. Verificaciones técnicas
- `npm run dev`
- `npm run lint`
- `npm run build`
- Verificación visual del render correcto del cronograma.
- Verificación de hover sincronizado entre panel izquierdo y timeline.
- Verificación de jerarquía más clara entre expandibles y terminales.
- Verificación de compactación más fina sin pérdida de legibilidad.

## 8. Riesgos residuales
- La intensidad exacta del hover puede seguir calibrándose con feedback visual real en datasets muy extensos o en monitores con distinta densidad.
- Si en el futuro se agregan más badges o metadata visible por fila, convendrá revisar nuevamente la compactación alcanzada para no reintroducir saturación.

## 9. Recomendación siguiente
- La siguiente mejora UX natural sería incorporar un modo de enfoque opcional para filas activas por teclado o foco accesible, reutilizando la misma semántica visual ya aplicada al hover.