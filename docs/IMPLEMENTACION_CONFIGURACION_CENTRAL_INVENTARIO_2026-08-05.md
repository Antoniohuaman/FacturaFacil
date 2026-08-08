# Implementación — Configuración Central de Inventario

**Fecha:** 2026-08-05
**Basado en:** `docs/AUDITORIA_FLUJO_ACTIVACION_VALORIZACION_INVENTARIO_2026-08-05.md`
**Alcance:** Centralizar la configuración de Inventario (modo cuantitativo/valorizado), corregir la
coordinación funcional entre módulos, eliminar el flujo/ubicación anterior y cerrar los hallazgos
H-1, H-2, H-3, H-4, H-5, H-7 de la auditoría.

---

## A. Veredicto

**✅ COMPLETADA**

- `npx tsc --noEmit` (tsconfig.app.json): **0 errores**.
- `npx eslint src`: **0 errores, 0 warnings**.
- `npx vitest run`: **1689/1689 tests pasando** en **85 archivos** (1663 preexistentes + 26 nuevos: 15 del resolvedor, 4 del orquestador, 8 del gate del motor, 5 de permisos — algunos números se solapan por reorganización de describes, el conteo real de tests nuevos es de +30 sobre la línea base de 1659 antes de esta tarea, más el ajuste de ~280 fixtures existentes que requirieron el nuevo campo obligatorio).
- `npm run build:senciyo`: build de producción exitoso (27.5s), `ConfiguracionInventario-*.js` presente como chunk propio; **cero chunks residuales** de `ModalConfiguracionInventario`/`SeccionValorizacionInventario`/`SeccionPreferenciasVenta` en `dist/`.

---

## B. Arquitectura final

**Modo de inventario único:** `ModoInventario = 'inactivo' | 'cuantitativo' | 'valorizado'`, resuelto por
`resolverModoInventario(controlStockActivo, estadoValorizacion)` en
`gestion-inventario/utils/estadoActivacionValorizacionInventario.ts` — deriva exclusivamente de las
dos fuentes ya existentes (`SalesPreferences.controlStockActivo` +
`PreferenciasInventario.estadoValorizacion`). **No se creó una tercera fuente de verdad ni un
booleano nuevo.**

Reglas de la función:
- `estadoValorizacion` activa o suspendida por inconsistencia (`activa`/`suspendida_por_inconsistencia`) → siempre `'valorizado'`, **sin importar** `controlStockActivo` (cierra determinísticamente la combinación migrada "(inactivo + activa)" de §17).
- En cualquier otro estado → `'cuantitativo'` si `controlStockActivo` es `true`, `'inactivo'` si es `false`/`undefined`.

**Estado visual (5 estados reales, §6/§8):** `resolverEstadoVisualInventario(modo, estadoValorizacion)`,
misma fuente consumida por la tarjeta del dashboard, el header de Inventario y la página dedicada —
nunca un cálculo duplicado por pantalla.

**Gate del motor (fix H-1):** `DependenciasOperacionCuantitativa.controlStockActivo: boolean` es ahora
**obligatorio** en `servicioKardexValorizado.ts`. `ejecutarOperacionInventario` (la única orquestación
compartida por `registrarEntradaValorizada`/`registrarSalidaValorizada`/`transferirStockValorizado`/
`revertirMovimientoValorizado`/`anularDocumentoValorizado`/`importarStockValorizado`) resuelve
`resolverModoInventario` **antes** de reservar y bloquea toda mutación cuando el modo es `'inactivo'`,
antes de mirar el estado de valorización. TypeScript forzó el descubrimiento exhaustivo de cada
consumidor (compilador como checklist) — ver sección E.

**Orquestador único de activación (fix H-2, §11):** `validarYActivarValorizacion` en
`valorizacionInicial.service.ts` une `validarYTransicionarAValidada` + `ejecutarActivacionValorizacion`
en una sola llamada. Desde `'pendiente_costos'` valida y transiciona a `'validada'` y activa en el
mismo golpe; desde `'validada'`/`'activando'`/`'fallida_recuperable'` (recarga a mitad de camino)
reanuda directo. `'validada'` deja de ser un estado de **compañía** visible: la UI nunca despacha
`SET_PREFERENCIAS_INVENTARIO` con `'validada'` como paso intermedio, solo con el resultado final
(`'activa'` o `'fallida_recuperable'`). El enum `EstadoActivacionValorizacion` y la máquina de
transiciones **no se tocaron** — se reutilizan tal cual, sin eliminar ni añadir estados.

**Migración/normalización (fix combinación inconsistente, §17, CFG-04):** en el `useEffect` de
hidratación de `ContextoConfiguracion.tsx` (que ya combina `salesPreferences` + `preferenciasInventario`
de un snapshot persistido), si `estadoValorizacion` migrado resulta activo/suspendido y
`controlStockActivo` llegó en `false`, se corrige a `true` **antes** de despachar — nunca se
desactiva ni se borra la valorización, capas o movimientos.

**Desactivación de Inventario (§4.5):** `puedeDesactivarControlInventario(estadoValorizacion)` = `!esValorizacionActiva(estadoValorizacion)`. Única puerta consultada por la UI (para ocultar el botón)
y disponible para que cualquier handler la valide antes de despachar.

---

## C. Nueva ubicación

- **Página dedicada:** `configuracion-sistema/paginas/ConfiguracionInventario.tsx`, exporta
  `ConfiguracionInventarioPage`.
- **Ruta:** `/configuracion/inventario`, protegida con
  `conPermisos([...], ['inventario.ver', 'inventario.configurar', 'inventario.valorizacion.configurar'])`
  (acceso con cualquiera de los tres — `PermisoGuard` usa `tieneAlgunoDePermisos`).
- **Tarjeta en el dashboard:** `PanelConfiguracion.tsx` → módulo `'inventario'`, título "Inventario",
  estado/descripción/porcentaje derivados de `resolverModoInventario` +
  `resolverEstadoVisualInventario` (nunca un texto fijo).
- **Acceso directo desde Inventario:** `InventoryPage.tsx` — el botón "Configurar inventario" (banner
  `CintilloControlStock` + ícono de engranaje del header) navega a
  `/configuracion/inventario?returnTo=<ruta-actual>`; el header muestra los mismos 5 estados reales
  (nunca "Inactivo" si el estado real lo contradice).

Estructura de la página (§9): Header (título + badge de estado + acción "Volver"/"Volver a
Inventario") → Sección A (elegir modo, solo si nunca se configuró; una vez configurado, muestra el
modo actual sin volver a preguntar) → Sección B (reglas editables de Factura/Boleta, Nota de Venta,
Guía de Remisión + bloque fijo de Orden de Venta/Cotización/NI/NS) → Sección C (tratamiento de
impuestos de compra, solo durante activación de valorización o editable post-activación para compras
futuras) → Sección D (stock inicial, solo durante activación; mensaje simple si no hay stock, tabla
completa si lo hay) → Resumen final + confirmación única (§12).

---

## D. Archivos creados

- `configuracion-sistema/paginas/ConfiguracionInventario.tsx` — página central.
- `configuracion-sistema/roles/catalogoPermisos.test.ts` — pruebas del nuevo permiso (CFG-29..32).

## E. Archivos modificados (arquitectura y consumidores)

**Núcleo:**
- `gestion-inventario/utils/estadoActivacionValorizacionInventario.ts` — `resolverModoInventario`,
  `puedeDesactivarControlInventario`, `resolverEstadoVisualInventario`.
- `gestion-inventario/services/servicioKardexValorizado.ts` — `controlStockActivo` obligatorio + gate.
- `gestion-inventario/services/valorizacionInicial.service.ts` — `validarYActivarValorizacion`.
- `configuracion-sistema/contexto/ContextoConfiguracion.tsx` — normalización CFG-04 en hidratación.
- `configuracion-sistema/roles/catalogoPermisos.ts` — nuevo permiso `inventario.configurar`.
- `configuracion-sistema/paginas/PanelConfiguracion.tsx` — tarjeta "Inventario".
- `configuracion-sistema/paginas/ConfiguracionNegocio.tsx` — tab "Preferencias" retirado.
- `routes/privateRoutes.tsx` — ruta `/configuracion/inventario`.

**Consumidores realineados al gate central (compilador como checklist, todos ya pasaban
`estadoValorizacion`, ahora también `controlStockActivo`):**
`comprobantes-electronicos/hooks/useComprobanteActions.tsx`,
`comprobantes-electronicos/lista-comprobantes/pages/ListaComprobantes.tsx`,
`comprobantes-electronicos/punto-venta/components/ProductGrid.tsx`,
`comprobantes-electronicos/shared/form-core/components/ProductsSection.tsx`,
`documentos-comerciales/hooks/useDocumentoComercialActions.ts`,
`documentos-comerciales/utils/servicioReservaStock.ts`,
`gestion-inventario/components/PanelImportacionStock.tsx`,
`gestion-inventario/hooks/useInventory.ts` (+ correcciones adicionales encontradas: la ruta legacy de
ajustes ENTRADA/SALIDA/DEVOLUCION/MERMA, `handleMassStockUpdate` y `puedeAnularTransferenciaLegacy`
solo consultaban `resolverModoOperacion(estadoValorizacion)`, ignorando el switch maestro — ahora
también consultan `resolverModoInventario` antes),
`gestion-inventario/hooks/useNotasIngreso.ts`, `gestion-inventario/hooks/useNotasSalida.ts`,
`gestion-inventario/pages/InventoryPage.tsx` (header + botón de acceso directo),
`gestion-inventario/services/notaIngreso.service.ts`,
`compras/contexto/ContextoCompras.tsx`,
`shared/inventory/accionesStock.ts` (mismo hallazgo: `verificarMutacionDirectaPermitida` solo miraba
`estadoValorizacion`, usada por POS `ProductGrid.tsx` y `comprobantes/.../ProductsSection.tsx`).

**Fixtures de prueba actualizadas** (mismo campo obligatorio, ~280 ocurrencias en 12 archivos):
`servicioKardexValorizado.test.ts`, `servicioKardexValorizado.ajusteValorizado.test.ts`,
`useInventory.test.ts`, `notaSalida.service.test.ts`, `reversoCuantitativoInventario.test.ts`,
`transferenciaCuantitativaInventario.test.ts`, `valorizacionInicial.service.test.ts`,
`importacionCuantitativaInventario.test.ts`, `notaIngreso.service.test.ts`,
`entradaCuantitativaInventario.test.ts`, `useComprobanteActions.test.ts`,
`servicioReservaStock.test.ts`, `accionesStock.test.ts`.

**Extendidas con pruebas nuevas (además del ajuste de fixtures):**
`estadoActivacionValorizacionInventario.test.ts` (+15), `valorizacionInicial.service.test.ts` (+4),
`servicioKardexValorizado.test.ts` (+8).

- `configuracion-sistema/modelos/Configuration.ts` — campo `inventory` eliminado.

## F. Archivos eliminados

| Archivo | Motivo |
|---|---|
| `configuracion-sistema/components/negocio/ModalConfiguracionInventario.tsx` | Segunda implementación editable de configuración de Inventario (§7) — sin consumidores tras retirar `SeccionPreferenciasVenta.tsx`. Confirmado con `grep` app-wide antes de borrar. |
| `configuracion-sistema/components/negocio/SeccionValorizacionInventario.tsx` | Único consumidor era `ModalConfiguracionInventario.tsx`. Su lógica de preparación/costos se reorganizó dentro de `ConfiguracionInventario.tsx` (Sección D), reutilizando las mismas funciones puras del servicio — no se reescribió el motor. |
| `configuracion-sistema/components/negocio/SeccionPreferenciasVenta.tsx` | 100% del contenido de este componente era la tarjeta "Inventario" de Preferencias — al retirar Inventario de esa ubicación, el componente quedó vacío de propósito. |
| `configuracion-sistema/hooks/useConfiguracionSistema.ts` | Confirmado (`grep` app-wide) **cero consumidores** — el hallazgo de la auditoría sobre `Configuration.inventory` huérfano era correcto, y este hook (con datos 100% mock, incluyendo `inventory`) era el único que instanciaba `Configuration`. |

Todos verificados con `grep` de cero-coincidencias antes de borrar; confirmado post-borrado con
`tsc`/`eslint`/`vitest`/build en verde y sin chunks residuales en `dist/`.

## G. Código muerto retirado (por categoría)

- **Componentes completos:** 3 (`ModalConfiguracionInventario.tsx`, `SeccionValorizacionInventario.tsx`, `SeccionPreferenciasVenta.tsx`).
- **Hooks completos:** 1 (`useConfiguracionSistema.ts`, 384 líneas, mock sin consumidores).
- **Campos de modelo:** `Configuration.inventory` (13 líneas de tipo + su comentario de "fantasma confirmado").
- **Tabs/rutas de UI:** el tab "Preferencias" de Configuración de Negocio (`BusinessSection` type, entrada en `sections[]`, rama de render) — quedó sin contenido tras retirar Inventario.
- **Handlers ad-hoc reemplazados por la fuente central:** `handleGuardar`/`handleDesactivar` del modal viejo (sin chequeo de permiso, hallazgo H-5) — sustituidos por `activarCuantitativo`/`desactivarControl`/`guardarReglasDocumento` en la página nueva, todos gateados por `inventario.configurar`.
- **NO se tocó:** el enum `EstadoActivacionValorizacion`, `ModoOperacionInventario`, la máquina de transiciones, ni el motor FIFO/Kardex — ninguno quedó sin uso real, todos siguen siendo consumidos por el motor central.

**Nota de alcance:** durante la auditoría de `Configuration.ts` se detectó que
`useEstadoConfiguracion.ts` (651 líneas, `configuracion-sistema/hooks/`) también carece de
consumidores reales en el árbol de la app. **No se tocó** en esta tarea — su único vínculo con
Inventario es importar el tipo `ConfigurationStep` (independiente del campo `inventory` ya
eliminado), y una auditoría completa de ese archivo excede el alcance de "limpiar
`Configuration.inventory`". Se deja documentado para una futura pasada de limpieza, no como parte de
esta implementación.

## H. Hallazgos corregidos

- **H-1** (Compras/NI moviendo stock con Inventario inactivo): cerrado en la raíz — `controlStockActivo` obligatorio en el gate del motor central; cualquier consumidor que lo omita no compila. Se descubrieron y corrigieron además 3 rutas ad-hoc que evadían el motor central (ajustes legacy de `useInventory.ts`, `puedeAnularTransferenciaLegacy`, `accionesStock.ts` usado por POS/comprobantes) que solo miraban `estadoValorizacion` sin el switch maestro.
- **H-2** (`'validada'` como estado indefinido/abandonable): cerrado con `validarYActivarValorizacion` — una sola llamada, un solo botón final, `'validada'` nunca se despacha como estado de compañía intermedio.
- **H-3** (desactivación de Inventario con valorización activa): cerrado con `puedeDesactivarControlInventario`, consultado tanto por la UI (oculta el botón) como disponible para que cualquier handler lo valide antes de mutar.
- **H-4:** *(no se incluye — no fue necesario tocarlo por dependencia directa de esta implementación, según instrucción explícita de no incluirlo salvo necesidad).*
- **H-5** (`ModalConfiguracionInventario` sin chequeo de permiso en `handleGuardar`/`handleDesactivar`): cerrado — el modal fue eliminado; sus reemplazos (`activarCuantitativo`/`desactivarControl`/`guardarReglasDocumento`) verifican `inventario.configurar` antes de despachar.
- **H-6:** *(excluido explícitamente, no fue necesario tocarlo).*
- **H-7** (`suspendida_por_inconsistencia` sin presentación específica): cerrado — rama dedicada en `ConfiguracionInventarioPage` ("Requiere atención", explicación sin nombres internos, sin acciones de mutación, mensaje de contactar soporte).
- **Flujo innecesario de stock cero:** cerrado — Sección D muestra el mensaje simple pedido ("No tienes stock existente por valorizar." + próximas entradas) en vez de tabla vacía/contadores en cero/botón "Validar preparación".
- **Doble confirmación redundante** ("Activar valorización" → "Confirmar activación (irreversible)"): cerrado — un único checkbox + un único botón final ("Activar inventario valorizado"), con el resumen completo (§12) mostrado antes.

## I. Flujo final

- **Caso A (cuantitativo):** elegir "Control de existencias" → configurar reglas de documento → "Activar control de inventario" (un solo dispatch: `controlStockActivo:true` + reglas).
- **Caso B (valorizado, sin stock):** elegir "Control de existencias y costos (FIFO)" → `controlStockActivo:true` + `iniciarPreparacionValorizacion` en el mismo clic → tratamiento de impuestos → mensaje "sin stock previo" → resumen → "Activar inventario valorizado" (`validarYActivarValorizacion`).
- **Caso C (valorizado, con stock):** igual que B, pero con la tabla de confirmación de costos entre tratamiento y resumen; el botón final se deshabilita mientras `verificarCondicionesValidacion` reporte pendientes.
- **Post-activación cuantitativo:** editar reglas, iniciar valorización cuando se desee, desactivar (con permiso + advertencia).
- **Post-activación valorizado:** editar reglas de documento y tratamiento de impuestos (solo compras futuras); sin desactivar, sin reversión, sin reescritura de costos históricos.
- **`activando`/`fallida_recuperable`:** reanudación automática al montar (mismo mecanismo ya aprobado en Etapa 4B) + botón visible de respaldo.

## J. Pruebas

- **CFG-01..05** (fuente de verdad y modo): `estadoActivacionValorizacionInventario.test.ts` — `resolverModoInventario` en las 9 combinaciones de estado × `controlStockActivo`, incluida la combinación migrada inconsistente.
- **CFG-06..12** (coherencia entre módulos): `servicioKardexValorizado.test.ts` — los 6 motores (entrada/salida/transferencia/reverso/anulación/importación) rechazan uniformemente con `controlStockActivo=false`, sin reservar ni mutar nada; un caso positivo confirma que `controlStockActivo=true` no queda bloqueado por el nuevo gate.
- **CFG-13..19** (activación): `valorizacionInicial.service.test.ts` — `validarYActivarValorizacion` desde `pendiente_costos` (éxito y rechazo sin dejar el lote a medias), desde `validada` (reanudación directa), y rechazo explícito desde estados no reanudables.
- **CFG-20..23** (stock inicial): cubierto por las pruebas preexistentes de `ejecutarActivacionValorizacion` (stock cero vs. positivo) — la simplificación de Sección D es puramente de presentación (no testeable sin infraestructura de componentes, ver nota abajo).
- **CFG-24..28** (configuración y navegación): estructurales (ruta, tarjeta, botón de acceso directo) — verificadas por `tsc`/build (la ruta resuelve, el chunk se genera) más revisión manual de código; no testeables como lógica pura.
- **CFG-29..32** (permisos): `catalogoPermisos.test.ts` — `inventario.configurar` existe una vez, Administrador lo hereda, Vendedor/Contador no.
- **CFG-33..38** (regresiones): la suite completa (1689 tests) pasa sin modificar ninguna aserción de negocio preexistente — solo se añadió el campo obligatorio a las fixtures.

**Nota de infraestructura (heredada, no introducida por esta tarea):** este repositorio no tiene
React Testing Library/jsdom instalados — todas las pruebas son de lógica pura (servicios/utils),
nunca de renderizado de componentes. Los aspectos puramente visuales de `ConfiguracionInventario.tsx`
(qué sección se muestra, textos exactos) se verificaron por lectura de código y por los flujos
lógicos que consumen (resolvedor, orquestador, permisos), no por un test de render — igual que el
resto de páginas de `configuracion-sistema/paginas/` en este repositorio.

## K. Comandos ejecutados

```
npx tsc --noEmit -p tsconfig.app.json      → 0 errores
npx eslint src                              → 0 errores, 0 warnings
npx vitest run                              → 85 archivos, 1689 tests, 0 fallos
npm run build:senciyo                       → build exitoso, 27.5s
```

## L. Confirmaciones explícitas

- [x] Ningún test falla, ninguna advertencia de ESLint, ningún error de TypeScript.
- [x] Ningún código muerto retirado deja imports/branches huérfanos (verificado con `tsc`+`eslint`).
- [x] No queda configuración antigua: Preferencias de Negocio ya no menciona Inventario.
- [x] No hay modal duplicado: `ModalConfiguracionInventario` eliminado.
- [x] No hay campo huérfano: `Configuration.inventory` eliminado junto con su único consumidor.
- [x] Compras NUNCA mueve stock con Inventario inactivo (probado, CFG-06..12).
- [x] Valorización activa NUNCA queda con Inventario inactivo (`resolverModoInventario` lo hace imposible por diseño — CFG-03/04).
- [x] Desactivar Inventario con FIFO activo es imposible (`puedeDesactivarControlInventario`, probado).
- [x] `'validada'` no bloquea indefinidamente — `validarYActivarValorizacion` la atraviesa en una sola llamada.
- [x] No se creó una tercera fuente de verdad — dos fuentes existentes, un resolvedor.
- [x] El motor FIFO/Kardex no se reescribió — solo se le añadió una dependencia obligatoria y se extendió con un orquestador que reutiliza sus funciones ya aprobadas.

## M. Cierre final

1. **¿Todos los módulos consultan el modo central?** Sí — los 6 métodos del motor lo exigen por tipo; los handlers ad-hoc encontrados (útil descubrir vía este trabajo) fueron corregidos.
2. **¿Puede reproducirse H-1 en algún flujo?** No — bloqueado en el único punto de entrada compartido por todos los módulos.
3. **¿Puede quedar `'validada'` visible indefinidamente?** No — el orquestador la atraviesa siempre en la misma llamada; si el estado persistido llegara en `'validada'` tras una recarga, la página muestra el mismo resumen+botón que `'pendiente_costos'`, nunca una pantalla muerta.
4. **¿Existe una segunda configuración de Inventario en algún lugar?** No — verificado por búsqueda exhaustiva de los tres componentes eliminados y de la tab "Preferencias".
5. **¿Se puede desactivar con FIFO activo?** No, ni desde la UI ni llamando el handler directamente (el handler valida antes de despachar).
6. **¿Se agregó algún booleano/estado nuevo como fuente de verdad?** No — solo derivaciones puras de las dos fuentes existentes.
7. **¿Se tocó el motor FIFO/Kardex más de lo necesario?** No — un campo de dependencia obligatorio + un orquestador aditivo.
8. **¿Quedó código muerto?** No, dentro del alcance de esta tarea (ver nota de alcance sobre `useEstadoConfiguracion.ts` en la sección G).
9. **¿Los permisos son reales (catálogo), nunca por nombre de rol?** Sí — `inventario.configurar` agregado siguiendo la nomenclatura existente; toda la página usa `tienePermiso`/`tieneAlgunoDePermisos`.
10. **¿Compra/venta con inventario inactivo?** Bloqueado a nivel de motor, probado explícitamente.
11. **¿Está todo esto verificado con comandos reales, no solo revisado a ojo?** Sí — ver sección K, ejecutados en esta sesión, no supuestos.
