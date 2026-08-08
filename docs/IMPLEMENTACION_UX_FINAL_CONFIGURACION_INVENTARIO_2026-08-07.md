# Implementación — Corrección final UX del flujo de configuración de Inventario

**Fecha:** 2026-08-07
**Basado en:** `docs/AUDITORIA_UX_FLUJO_CONFIGURACION_INVENTARIO_ACTUAL_2026-08-07.md`
**Alcance:** Corrección de comportamiento y texto de `/configuracion/inventario` — sin reescribir el motor FIFO/Kardex, sin crear wizard/modal/pantallas nuevas, manteniendo la página dedicada, la tarjeta del dashboard y el acceso directo desde Inventario.

---

## A. Veredicto

## ✅ FLUJO UX FINAL COMPLETADO

- `npx tsc --noEmit -p tsconfig.app.json`: **0 errores**.
- `npx eslint src`: **0 errores, 0 warnings**.
- `npx vitest run`: **1697/1697 tests pasando** en **85 archivos**.
- `npm run build:senciyo`: build de producción exitoso, chunk `ConfiguracionInventario-*.js` presente.
- El callejón sin salida (UX-INV-P0-001) se cerró **en la raíz** (máquina de estados + nuevo dato de ciclo de vida), no con una condición de render aislada — y quedó probado con una prueba de regresión dedicada (§J).

---

## B. Flujo final

### Caso A — Primera configuración, Control de existencias

```
Pendiente de configurar
  → clic "Control de existencias" (SOLO selecciona — sin dispatch, sin efecto)
  → Reglas por documento (borrador local) + resumen
  → clic "Activar inventario" (ÚNICA activación real: controlStockActivo=true + reglas + inventarioConfiguradoAlgunaVez=true)
  → Activo · Control de existencias
```

### Caso B — Primera configuración, Control de existencias y costos (FIFO)

```
Pendiente de configurar
  → clic "Control de existencias y costos (FIFO)" (abre un borrador de costeo — SIN activar nada;
    reutiliza el lote técnico de detección de stock, imprescindible para poder confirmar costos)
  → Reglas por documento (borrador local) + Tratamiento de impuestos (autosave) + Stock inicial
  → Resumen + advertencia de irreversibilidad + checkbox
  → clic "Activar inventario valorizado" (ÚNICA activación real: controlStockActivo=true +
    reglas + estadoValorizacion="activa" + inventarioConfiguradoAlgunaVez=true, todo en una llamada)
  → Activo · Valorizado FIFO
```

### Caso C — Ya cuantitativo activo, sumar costeo FIFO sin interrumpir

```
Activo · Control de existencias
  → clic "Activar costeo FIFO" (abre el borrador — controlStockActivo sigue en true, Inventario
    SIGUE operando en cuantitativo, sin interrupción — §22)
  → mismas secciones que el Caso B, con el badge de estado mostrando "Activo · Control de
    existencias" durante TODO el proceso (nunca "Configuración en curso")
  → clic "Activar inventario valorizado"
  → Activo · Valorizado FIFO
```

### Caso D — Inactivo (ya configurado antes)

```
Inactivo
  → configuración preservada (reglas por documento) visible y editable (autosave)
  → clic "Activar inventario" (reactiva controlStockActivo=true — no vuelve a preguntar modalidad)
  → Activo · Control de existencias
```

---

## C. Estados visibles finales

`EstadoVisualInventario` ahora tiene exactamente 5 valores (`gestion-inventario/utils/estadoActivacionValorizacionInventario.ts:94-99`) — **se eliminó `'configuracion_en_curso'`** y **se agregó `'inactivo'`**:

| Estado | Fuente | Significado |
|---|---|---|
| `pendiente` | `modo==='inactivo' && !inventarioConfiguradoAlgunaVez` | Nunca se activó nada |
| `inactivo` | `modo==='inactivo' && inventarioConfiguradoAlgunaVez` | Se activó alguna vez, hoy está apagado — conserva su configuración |
| `cuantitativo_activo` | `modo==='cuantitativo'` | Activo, cantidades — **sin importar si hay un borrador de FIFO en curso** (§22) |
| `valorizado_activo` | `modo==='valorizado' && estado==='activa'` | FIFO activo, terminal |
| `requiere_atencion` | `estado==='suspendida_por_inconsistencia'` | Inconsistencia técnica real (hoy inalcanzable desde la UI, igual que antes de esta corrección) |

Un borrador de valorización en curso (`en_preparacion`/`pendiente_costos`/`validada`/`activando`/`fallida_recuperable`) **ya no es un estado visual operativo** — es un detalle interno de la página de configuración, expuesto únicamente como una nota discreta ("Configuración de costos pendiente") cuando `modo==='cuantitativo'`. El header de Inventario y la tarjeta del dashboard nunca lo muestran como el estado principal (§22 del encargo).

---

## D. Persistencia

| Dato | ¿Es borrador o se persiste? | ¿Cuándo se activa/persiste de verdad? |
|---|---|---|
| Modalidad elegida (tarjeta) | Borrador **puramente local** (`borradorCuantitativoElegido`, un solo booleano de UI) mientras nunca se activó nada | Nunca por sí sola — se consolida en el CTA final |
| Reglas por documento, antes de la primera activación | Borrador local (`localFyB`/`localNV`/`localGR`, ya existía) | En el mismo dispatch del CTA final ("Activar inventario" / "Activar inventario valorizado") |
| Reglas por documento, después de la primera activación (incluye "Inactivo") | — | **Autosave inmediato** en cada cambio — ya no existe el botón "Guardar cambios" en ningún caso |
| Tratamiento de impuestos de compra | — | Autosave inmediato (sin cambios respecto a antes — ya era coherente) |
| Lote de detección de stock/costos FIFO | Técnicamente persistido (repositorio propio) desde que se elige FIFO — **necesario** para detectar stock y confirmar costos | La persistencia del lote NO es la activación de Inventario — `controlStockActivo` solo se enciende en el CTA final |
| `controlStockActivo` | — | Solo en "Activar inventario" o "Activar inventario valorizado" |
| `estadoValorizacion` | — | `'activa'` solo tras el CTA final; cancelar en cualquier punto anterior regresa a `'no_iniciada'` |
| `inventarioConfiguradoAlgunaVez` (nuevo) | — | Se enciende una sola vez, en la primera activación exitosa (cuantitativa o FIFO); nunca se apaga |

No existe ningún botón "Guardar cambios" en la página, en ningún estado. No hay mezcla de autosave/guardado explícito entre controles equivalentes: **antes** de la primera activación todo es borrador consolidado por el CTA; **después**, todo autosalva.

---

## E. UX-INV-P0-001 — cómo se corrigió de raíz

**Causa raíz original:** `estadoValorizacion` podía quedar en `'cancelada_antes_activacion'` tras cancelar una preparación, y la condición de render que mostraba las tarjetas de selección exigía `estadoValorizacion==='no_iniciada'` — un valor al que esa transición nunca regresaba.

**Corrección aplicada (no es un parche de render):**
1. **Se eliminó el estado `'cancelada_antes_activacion'` de la máquina.** `cancelarPreparacion` (`valorizacionInicial.service.ts:248-263`) ahora transiciona **directo** a `'no_iniciada'` — `TRANSICIONES_PERMITIDAS` (`estadoActivacionValorizacionInventario.ts:165-174`) ya no tiene ese estado. Es seguro: antes de `'activa'` nunca existe ninguna capa ni movimiento que una cancelación pueda poner en riesgo — el lote conserva su propio `estado: 'cancelada'` para auditoría (tipo separado, `EstadoLoteValorizacionInicial`), independiente del estado de la empresa.
2. **Se agregó `inventarioConfiguradoAlgunaVez`** (`PreferenciasInventario`, `ContextoConfiguracion.tsx`) — un dato de ciclo de vida monótono que NUNCA se apaga. Distingue "nunca configurado" (`pendiente`) de "configurado alguna vez, hoy apagado" (`inactivo`) — la ambigüedad real que producía el callejón sin salida.
3. **La pantalla de "Inactivo" siempre tiene una acción disponible** ("Activar inventario") — no depende de `estadoValorizacion`, así que nunca puede quedar sin salida.
4. **Se bloqueó desactivar mientras haya un borrador de FIFO abierto** (`desactivarControl`, `ConfiguracionInventario.tsx:262-278`) — evita que se cree jamás la combinación que originó el bug (borrador de FIFO + desactivación simultánea).

**Prueba de regresión dedicada:** `estadoActivacionValorizacionInventario.test.ts`, describe `UXCFG-28`, reproduce la secuencia exacta del bug original (Control de existencias → iniciar FIFO → cancelar → desactivar) usando las funciones puras reales de la máquina, y confirma que el resultado final es `estadoVisual==='inactivo'`, nunca `'pendiente'`.

---

## F. Archivos creados

Ninguno. La página `ConfiguracionInventario.tsx` ya existía (sin comitear, de la centralización previa) — esta tarea la reescribió en el mismo archivo, sin crear una ubicación nueva.

## G. Archivos modificados

| Archivo | Cambio |
|---|---|
| `gestion-inventario/models/estadoActivacionValorizacion.types.ts` | Elimina `'cancelada_antes_activacion'` del enum (8 estados, antes 9) |
| `gestion-inventario/utils/estadoActivacionValorizacionInventario.ts` | `TRANSICIONES_PERMITIDAS` simplificada (cancelar→`no_iniciada` directo); `EstadoVisualInventario` con `'inactivo'` y sin `'configuracion_en_curso'`; `resolverEstadoVisualInventario` recibe `inventarioConfiguradoAlgunaVez` como tercer parámetro; nueva función `estaPreparandoValorizacion` |
| `gestion-inventario/services/valorizacionInicial.service.ts` | `cancelarPreparacion` transiciona a `no_iniciada`; `iniciarPreparacionValorizacion` ya no acepta `'cancelada_antes_activacion'` como estado de origen (solo `'no_iniciada'`) |
| `configuracion-sistema/contexto/ContextoConfiguracion.tsx` | Nuevo campo `inventarioConfiguradoAlgunaVez` en `PreferenciasInventario`; default, migración (`migratePreferenciasInventario`) y retro-cómputo en la hidratación (mismo patrón que la corrección CFG-04 previa); incluido en el chequeo de "hasMeaningfulConfig" del autosave |
| `configuracion-sistema/paginas/ConfiguracionInventario.tsx` | Reescritura completa — ver §B/§D/§E |
| `configuracion-sistema/paginas/PanelConfiguracion.tsx` | Tarjeta "Inventario": nuevo estado `inactivo` (bucket `complete`, no 60% artificial), sin `configuracion_en_curso` |
| `gestion-inventario/pages/InventoryPage.tsx` | Header: nuevo estado `inactivo`; pasa `inventarioConfiguradoAlgunaVez` al resolvedor y al banner |
| `gestion-inventario/components/CintilloControlStock.tsx` | Nueva prop `yaConfiguradoAntes` — distingue copy/CTA "Configurar inventario" (Pendiente) de "Activar inventario" (Inactivo) |
| `configuracion-sistema/components/negocio/opcionesTratamientoImpuestoCompra.ts` | Textos actualizados (§17 del encargo) — mismos 3 valores persistidos, sin cambios de comportamiento |
| Tests: `estadoActivacionValorizacionInventario.test.ts`, `valorizacionInicial.service.test.ts`, `servicioKardexValorizado.test.ts`, `useInventory.test.ts`, `opcionesTratamientoImpuestoCompra.test.ts`, `migratePreferenciasInventario.test.ts` | Actualizados por el cambio de enum/firma; extendidos con los nuevos casos (§J) |

## H. Archivos eliminados

Ninguno de producción. (Se creó y se eliminó, dentro de esta misma sesión, un archivo de prueba duplicado propio — `ContextoConfiguracion.test.ts` — al descubrir que ya existía `migratePreferenciasInventario.test.ts` cubriendo la misma función; sus casos nuevos se fusionaron ahí. No queda ningún artefacto de esa duplicación.)

## I. Código muerto eliminado

- Estado `'cancelada_antes_activacion'` completo: valor del enum, su rama en `resolverModoOperacion`, su entrada en `TRANSICIONES_PERMITIDAS`, y toda referencia en 4 archivos de test.
- Estado visual `'configuracion_en_curso'` (ya no es parte de `EstadoVisualInventario`).
- Botón "Guardar cambios" y su handler `guardarReglasDocumento` (reemplazados por borrador local + autosave, según fase).
- Las ramas de activación inmediata desde las tarjetas de selección (`activarCuantitativo`/`iniciarValorizado` ya no se llaman desde el clic de la tarjeta con efecto de activación — la tarjeta ahora solo cambia estado local o abre un borrador sin tocar `controlStockActivo`).
- El override visual `!bg-red-600` del botón final de activación FIFO (ahora `variant="primary"` simple, sin color de advertencia en el CTA — el color de advertencia queda reservado al bloque de texto de irreversibilidad).
- El texto "Esta activación es irreversible" en la tarjeta de selección inicial (eliminado — la advertencia vive únicamente en el resumen final).

## J. Pruebas agregadas/actualizadas

- **`estadoActivacionValorizacionInventario.test.ts`** (33→34 tests): actualizado el recorrido de transiciones (cancelar→`no_iniciada`); reescrito el describe de `resolverEstadoVisualInventario` con el nuevo tercer parámetro y los 5 estados reales (incluye `UXCFG-24/25/26` para pendiente vs. inactivo); nuevo describe `estaPreparandoValorizacion`; **nuevo describe `UXCFG-28`** — regresión end-to-end del P0 original con las piezas puras de la máquina.
- **`valorizacionInicial.service.test.ts`** (89 tests): `cancelarPreparacion` ahora se prueba regresando a `no_iniciada` (antes `cancelada_antes_activacion`); `iniciarPreparacionValorizacion` probado reiniciando desde el resultado real de la cancelación; referencias a `cancelada_antes_activacion` en `puedeIniciarActivacion`/`puedeReanudarOIniciarActivacion` retiradas (cobertura ya redundante con `no_iniciada`).
- **`servicioKardexValorizado.test.ts`** (60 tests): 2 valores literales de prueba sustituidos por otro estado no-activo representativo (mismo gate probado, sin depender del estado eliminado).
- **`useInventory.test.ts`** (27 tests): 1 aserción sobre `cancelada_antes_activacion` retirada (cobertura ya redundante con `no_iniciada` en la misma prueba).
- **`opcionesTratamientoImpuestoCompra.test.ts`** (5 tests): actualizado el label de la tercera opción tributaria.
- **`migratePreferenciasInventario.test.ts`** (6→11 tests): **nuevo describe** con 5 pruebas de `inventarioConfiguradoAlgunaVez` (ausente→false, corrupto→false, booleano explícito preservado en ambos sentidos, monotonía).

**Nota de infraestructura (heredada, no introducida aquí):** este repositorio no tiene React Testing Library/jsdom — todo lo anterior son pruebas de lógica pura sobre la máquina de estados y el servicio. Los aspectos puramente de render (qué sección exacta se muestra, si dos CTA primarios coexisten, textos exactos) se verificaron por lectura de código línea por línea, no por un test de componente — mismo criterio que el resto de `configuracion-sistema/paginas/`.

## K. Validación manual

Realizada por lectura exhaustiva del componente final (no hay infraestructura de render en este repo, ver nota en §J) para cada uno de los 8 casos del encargo:

| Caso | Resultado |
|---|---|
| 1 — Nueva empresa, elige y cambia de opción | Confirmado por código: elegir una tarjeta solo cambia `borradorCuantitativoElegido`/crea el borrador FIFO (sin dispatch de activación); cambiar de FIFO→cuantitativo usa "Cancelar activación de costos FIFO"; cambiar de cuantitativo→FIFO usa "Prefiero calcular costos también (FIFO)" — ambos disponibles sin fricción antes de activar |
| 2 — FIFO sin stock | Confirmado: `detallesConStock.length===0` muestra el mensaje de una línea (sin tabla, sin contadores en cero); irreversibilidad solo en el resumen final; un único CTA final |
| 3 — FIFO con stock | Confirmado: costos visibles y corregibles (`Confirmar`/`Recalcular`); `disabled` del CTA final incluye `motivosBloqueo.length > 0` |
| 4 — Cuantitativo activo | Confirmado: reglas editables con autosave; "Activar costeo FIFO" abre el borrador sin tocar `controlStockActivo` (badge permanece "Activo · Control de existencias") |
| 5 — Cancelar FIFO | Confirmado: `handleCancelarPreparacion` transiciona a `no_iniciada`, vuelve a mostrar el estado previo (cuantitativo activo o las 2 tarjetas), sin "Configuración en curso" en ningún lugar |
| 6 — Desactivar cuantitativo | Confirmado: queda `estadoVisual==='inactivo'` (nunca `'pendiente'`), conserva reglas, botón "Activar inventario" disponible |
| 7 — FIFO activo | Confirmado: sin botones de desactivar/volver/reiniciar/preparar/validar; solo reglas e impuestos futuros editables |
| 8 — P0 anterior | Confirmado por código Y por la prueba automatizada `UXCFG-28` (§E) — reproducido exactamente y verificado que ya no ocurre |

## L. Comandos ejecutados

```
cd apps/senciyo
npx tsc --noEmit -p tsconfig.app.json      → 0 errores
npx eslint src                              → 0 errores, 0 warnings
npx vitest run                              → 85 archivos, 1697 tests, 0 fallos
cd ../..
npm run build:senciyo                       → build exitoso (~17s), chunk ConfiguracionInventario-*.js presente
```

## M. Confirmaciones expresas

- [x] Seleccionar una tarjeta NO activa Inventario — verificado: ninguna función invocada desde el clic de las tarjetas despacha `SET_SALES_PREFERENCES`.
- [x] Seleccionar FIFO NO activa FIFO — `iniciarValorizado` solo crea el borrador (`SET_PREFERENCIAS_INVENTARIO` con el nuevo `estadoValorizacion`, nunca `'activa'`).
- [x] La configuración inicial ocurre en una sola vista — sin nuevas rutas, sin wizard, sin modal.
- [x] No existe botón "Guardar cambios" en la configuración inicial — ni en ningún otro estado de la página.
- [x] No existe mezcla confusa de autosave y guardado — un solo patrón por fase (borrador local antes de activar, autosave después).
- [x] El usuario puede cambiar de decisión antes de activar — en ambas direcciones, sin desactivar/reentrar.
- [x] Pendiente e Inactivo son distintos — `inventarioConfiguradoAlgunaVez` los diferencia de forma monótona y persistida.
- [x] Inactivo conserva configuración — nunca se borra `stockDescuentoFacturaYBoleta`/`NotaVenta`/`GuiaRemision` al desactivar.
- [x] El P0 del callejón sin salida no existe — cerrado en la máquina de estados, probado con `UXCFG-28`.
- [x] "Irreversible" solo aparece inmediatamente antes de activar FIFO — retirado de la tarjeta de selección.
- [x] FIFO activo no puede regresar a cuantitativo — `TRANSICIONES_PERMITIDAS.activa = []`, sin cambios (ya era así).
- [x] Configurar FIFO desde cuantitativo no interrumpe el Inventario operativo — `controlStockActivo` nunca se toca al abrir el borrador; el badge permanece "Activo · Control de existencias".
- [x] No se modificó el motor FIFO/Kardex — solo se tocó la capa de configuración/estado de compañía y la página; `servicioKardexValorizado.ts`, capas, consumos, transferencias y anulaciones quedaron intactos.
- [x] No existe hardcode — ningún IGV/porcentaje fijo, ninguna recomendación tributaria silenciosa.
- [x] No existe duplicidad — un único bloque de secciones de valorización (`seccionesValorizacion`) reutilizado en las dos ramas que lo necesitan; un único componente de reglas por documento (`reglasDocumento`).
- [x] No existe redundancia — se corrigió además, durante la revisión final, un riesgo real de dos CTA primarios simultáneos (permitir iniciar FIFO desde "Inactivo"), restringiéndolo a solo cuantitativo activo.
- [x] No existe código muerto — verificado por `eslint` (no-unused-vars) + grep exhaustivo de `cancelada_antes_activacion`/`configuracion_en_curso`/`Guardar cambios` en todo `src`.
- [x] No existen warnings — `eslint src` limpio.
- [x] Tests, lint, TypeScript y build están en verde — comandos y resultados en §L.

## N. Cierre final

1. **¿Puede el usuario seleccionar sin activar?** Sí — confirmado por código: ninguna tarjeta despacha una activación.
2. **¿Puede corregir cualquier decisión antes de activar?** Sí — cambiar de modalidad en cualquier dirección es un solo clic, sin desactivar ni reentrar.
3. **¿Existe una sola vista?** Sí — `/configuracion/inventario`, sin rutas nuevas, sin wizard, sin modal.
4. **¿Está claro cuándo se activa Inventario?** Sí — únicamente al presionar "Activar inventario".
5. **¿Está claro cuándo se activa FIFO?** Sí — únicamente al presionar "Activar inventario valorizado", tras el resumen y el checkbox.
6. **¿Pendiente e Inactivo están diferenciados correctamente?** Sí — mediante `inventarioConfiguradoAlgunaVez`, un dato de ciclo de vida monótono, persistido, sin duplicar el modo.
7. **¿Existe algún callejón sin salida?** No — cerrado en la raíz y probado con una regresión automatizada.
8. **¿Existe algún guardado ambiguo?** No — un solo patrón por fase, sin botón "Guardar cambios" en ningún caso.
9. **¿Queda algún flujo antiguo?** No — verificado por grep exhaustivo de los textos y funciones retirados.
10. **¿Queda código muerto?** No, dentro del alcance de esta tarea.
11. **¿La experiencia de configuración de Inventario puede considerarse definitivamente cerrada?** Sí, con la salvedad honesta de que ningún aspecto puramente visual pudo verificarse por render automatizado (este repositorio no tiene esa infraestructura, igual que el resto de páginas de Configuración) — la verificación fue por lectura de código exhaustiva más la suite completa de lógica pura en verde.
