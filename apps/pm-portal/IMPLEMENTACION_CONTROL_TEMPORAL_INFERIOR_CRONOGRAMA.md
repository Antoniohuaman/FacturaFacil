# Implementación del control temporal inferior del cronograma

## 1. Qué se cambió

- Se reemplazó la UI previa tipo popover flotante por un control inferior inline, expandible en la misma fila del footer del cronograma.
- Se mantuvo la lógica temporal existente y solo se corrigió la presentación para que el patrón se sienta más cercano a Jira y más coherente con la instrucción de producto.
- El control ahora se despliega horizontalmente a la izquierda de un ícono discreto, sin invadir el lienzo ni crear otra franja visual.

## 2. Qué se movió o reemplazó respecto a "Vista temporal"

- El selector "Vista temporal" dejó de renderizarse dentro del panel de filtros.
- El selector de trimestre también salió del panel de filtros.
- El selector de año se consolidó dentro del control temporal inferior para evitar duplicidad visual de la temporalidad principal.

## 3. Qué componente nuevo se creó

- Se creó `ControlTemporalCronograma.tsx`.
- El componente encapsula:
  - estado expandido/colapsado,
  - cierre con Escape,
  - cierre por click externo,
  - cambio entre vista anual y trimestral,
  - selección compacta de año,
  - selección compacta de trimestre cuando aplica.

## 4. Cómo quedó la semántica temporal visible

- La temporalidad dejó de verse como filtro de dataset.
- El control visible del footer gobierna la misma semántica existente:
  - `anio`
  - `trimestre`
  - año seleccionado
  - trimestre seleccionado
- No se alteró el cálculo de rango visible, la línea de HOY, la construcción de columnas ni el scroll horizontal.

## 5. Qué riesgos se evitaron

- Se eliminó la duplicidad entre filtros y navegación temporal.
- Se evitó superponer un panel flotante sobre barras o contenido del timeline.
- Se mantuvo el footer compacto, sin agregar una nueva fila estructural ni aumentar el alto del bloque del cronograma.
- Se preservó la semántica temporal y no se duplicó lógica.

## 6. Qué validaciones se ejecutaron

- `npm run dev` en la raíz del monorepo.
- `npm run dev:sin-abrir -w portal-pm` para validar específicamente el portal PM.
- `npm run lint` en la raíz del monorepo.
- `npm run build` en la raíz del monorepo.

Resultado final de validación:

- Lint: quedó limpio después de retirar una dependencia innecesaria de `useMemo` en `PaginaCronogramaRoadmap.tsx`.
- Build: completó correctamente en `senciyo` y en `portal-pm`.
- Advertencia observada en build: Vite reportó chunks grandes en `portal-pm` después de minificación. No está relacionada con este cambio estético y no bloqueó la compilación.

## 7. Qué quedó preparado para futuras fases

- El control quedó listo para crecer con nuevas variantes temporales sin reintroducir un patrón de filtro redundante.
- La UI de temporalidad quedó desacoplada del panel de filtros.
- La estructura permite incorporar después acciones como `Hoy` o futuras escalas adicionales con una expansión inline consistente.