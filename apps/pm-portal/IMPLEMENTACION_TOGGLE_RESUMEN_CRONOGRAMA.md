# IMPLEMENTACIÓN — TOGGLE PERSISTENTE DEL RESUMEN EN CRONOGRAMA

## 1. Resumen ejecutivo
- Se implementó un botón secundario Resumen junto al botón Filtros en la cabecera del cronograma.
- La mejora resuelve la pérdida de altura útil causada por la franja fija de tarjetas KPI, permitiendo ocultarla o mostrarla a demanda.
- No se tocaron la lógica temporal, filtros funcionales, tooltips, scroll, jerarquía, línea de HOY, barras ni cálculos internos de KPI.
- Se preservó la compatibilidad porque el cambio quedó encapsulado en la vista y reutiliza el patrón existente de persistencia con localStorage.

## 2. Archivos modificados

| Archivo | Motivo | Tipo de cambio |
| --- | --- | --- |
| apps/pm-portal/src/presentacion/paginas/roadmap/cronograma/PaginaCronogramaRoadmap.tsx | Agregar toggle persistente del resumen KPI y render condicional | Refactor mínimo funcional UX |
| apps/pm-portal/IMPLEMENTACION_TOGGLE_RESUMEN_CRONOGRAMA.md | Documentar la implementación y validaciones | Documentación |

## 3. Estado anterior
- Los cards KPI se mostraban siempre debajo de la barra superior de controles del cronograma.
- Esa franja ocupaba altura constante incluso cuando el usuario prefería concentrarse solo en el lienzo temporal.
- El resultado era menor espacio útil vertical para el cronograma, especialmente en pantallas corporativas medianas o laptops.

## 4. Solución implementada
- Se agregó un botón Resumen junto a Filtros.
- La ubicación elegida fue el bloque derecho de acciones del header superior, manteniendo la jerarquía visual existente.
- Se usó un ícono tipo panel/grid, coherente con tarjetas o layout, evitando un ícono de ojo.
- El texto usado es Resumen.
- El botón alterna en forma inmediata la visibilidad del bloque KPI sin afectar el resto de controles ni el cronograma.

## 5. Persistencia
- Se usó localStorage, consistente con otras preferencias ya persistidas en la misma página.
- La clave usada es pm-portal-roadmap-cronograma-resumen-visible.
- El valor por defecto es oculto cuando no existe preferencia previa.
- La preferencia se recupera en la inicialización del estado React para evitar flicker visible y se vuelve a guardar en cada cambio.

## 6. Render condicional y layout
- El bloque KPI ahora se renderiza solo cuando la preferencia resumenVisible es true.
- Cuando el resumen está oculto, la sección completa no se monta, por lo que no quedan márgenes ni contenedores vacíos.
- El layout se preserva porque no se alteró la estructura del cronograma; simplemente se removió condicionalmente una franja intermedia opcional.

## 7. Compatibilidad y no regresión
- No se tocó la lógica de fechas, segmentos, jerarquías, autoexpansión, sincronización de scroll ni render del timeline.
- No se modificaron cálculos de KPI; solo su visibilidad.
- No se alteró el comportamiento de filtros ni el panel desplegable de filtros.
- No se introdujeron dependencias nuevas ni abstracciones globales.

## 8. Limpieza técnica
- No quedaron imports muertos ni variables sin uso como parte del cambio.
- No se agregó código duplicado fuera del mínimo necesario para el nuevo control e ícono.
- La persistencia sigue el patrón ya existente en la vista, manteniendo legibilidad y consistencia técnica.

## 9. Verificaciones técnicas
- Se debe validar npm run dev.
- Se debe validar npm run lint.
- Se debe validar npm run build.
- Se debe comprobar manualmente que la preferencia persiste al recargar y al navegar fuera del módulo y volver.
- Se debe confirmar que el render del resumen y del cronograma sigue siendo correcto en ambos estados.

## 10. Riesgos residuales
- El único riesgo residual razonable es visual: revisar que el estado activo del botón Resumen se perciba correctamente en light y dark mode.
- Si el proyecto introduce en el futuro una capa centralizada de preferencias UI, esta clave podría migrarse a ese mecanismo sin cambiar el comportamiento.

## 11. Recomendación siguiente
- La siguiente mejora UX natural sería permitir recordar también el estado abierto o cerrado del panel Filtros si el equipo considera útil esa persistencia y mantiene coherencia con el resto del portal.