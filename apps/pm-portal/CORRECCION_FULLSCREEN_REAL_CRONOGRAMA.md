# Corrección del fullscreen real del cronograma

## 1. Qué estaba mal antes

- El botón existente no usaba fullscreen real del navegador.
- Solo agrandaba el bloque dentro del layout del portal.
- Eso no ocultaba el shell normal ni el chrome del navegador.

## 2. Qué se corrigió

- Se reemplazó la expansión local por fullscreen real usando la Fullscreen API.
- El estado visual del botón ahora refleja el fullscreen real, no una simulación por CSS.

## 3. Qué contenedor entra ahora a fullscreen

- El contenedor raíz local del cronograma que incluye:
  - buscador del cronograma
  - acciones del bloque
  - panel izquierdo de jerarquía
  - timeline derecho
  - leyenda
  - controles internos del cronograma

## 4. Uso de Fullscreen API

- `requestFullscreen()` para entrar
- `exitFullscreen()` para restaurar
- `fullscreenchange` para sincronizar estado e interfaz

## 5. Cómo se comporta al salir con `Esc`

- Si el usuario presiona `Esc`, el navegador sale de fullscreen.
- El listener de `fullscreenchange` actualiza el estado React y el tooltip vuelve a `Expandir cronograma`.

## 6. Qué no se tocó

- buscador
- crear
- resumen
- filtros
- tooltips
- barras del timeline
- alineación
- layout normal fuera del fullscreen
- backend
- modales
- leyenda
- splitter

## 7. Validaciones ejecutadas

- `npm run dev`
- `npm run lint`
- `npm run build`

## 8. Limitaciones reales detectadas

- El fullscreen depende del soporte y política del navegador, y debe dispararse por gesto del usuario.
- Fuera de esa restricción estándar del navegador, no se detectó impedimento técnico adicional.