# Corrección del fullscreen real del cronograma

## 1. Qué estaba mal antes

- La implementación previa solo agrandaba el bloque dentro del layout normal del portal.
- No usaba fullscreen real del navegador.
- Seguían viéndose el shell del portal y el chrome normal de la ventana.

## 2. Qué se corrigió

- Se reemplazó la expansión por clases CSS por fullscreen real usando la Fullscreen API.
- El estado del botón ahora se sincroniza con `fullscreenchange`.
- El tooltip sigue alternando entre `Expandir cronograma` y `Restaurar cronograma` según el estado real.

## 3. Qué contenedor entra ahora a fullscreen

- Entra a fullscreen el contenedor raíz local del cronograma que agrupa:
  - buscador del cronograma
  - acciones del bloque
  - panel izquierdo de jerarquía
  - timeline derecho
  - leyenda y controles internos del cronograma

- No entra a fullscreen el portal completo como aplicación; entra a fullscreen el contenedor del cronograma, que visualmente pasa a ocupar toda la pantalla.

## 4. Uso de Fullscreen API

- Se usa `requestFullscreen()` sobre el contenedor raíz del cronograma.
- Se usa `document.exitFullscreen()` para restaurar.
- Se escucha `fullscreenchange` para mantener sincronizado el estado React.

## 5. Comportamiento al salir con `Esc`

- Si el usuario sale con `Esc`, el evento `fullscreenchange` actualiza el estado local.
- El ícono y el tooltip vuelven a estado normal automáticamente.

## 6. Qué no se tocó

- filtros
- buscador y acciones del cronograma, salvo el botón ya existente
- leyenda
- tooltips
- barras
- alineación de filas
- splitter de jerarquía
- semántica temporal
- modales y menús contextuales
- backend

## 7. Cómo se validó que no rompió layout ni scroll

- Se mantuvo el contenedor del timeline con su mismo scroll interno y sincronización izquierda/derecha.
- Se verificó que el modo fullscreen reutiliza la misma estructura del cronograma y solo amplía el área visible del bloque en pantalla completa real.
- Se ejecutaron validaciones de desarrollo, lint y build.

## 8. Confirmación de alcance técnico

- La implementación fue solo front-end.
- No se introdujo dependencia de backend ni persistencia obligatoria.

## 9. Limitaciones reales detectadas

- La Fullscreen API depende de que el navegador permita la solicitud en respuesta a un gesto del usuario.
- Si el navegador o su política bloquean fullscreen, la UI no se rompe y simplemente no cambia de estado.