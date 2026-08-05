# Auditoría Integral — Valorización de Inventario y Kardex Valorizado

**Fecha:** 2026-08-04 · **Rama auditada:** `RevisionValorizado` · **Tipo:** auditoría técnica y funcional de solo lectura (sin cambios de código)
**Auditor:** revisión asistida, 6 líneas de verificación independientes sobre código real + ejecución de build/lint/tests + inspección manual dirigida de discrepancias entre agentes.

---

## A. Veredicto ejecutivo

### ❌ NO APROBADO

El **motor central de costeo** (capas de costo FIFO, consumo, reversos, transferencias, unidad de trabajo con diario/replay, control optimista de versión) está **sólidamente diseñado, implementado y probado** — es la parte más madura de todo el alcance auditado, y contradice una auditoría de hace ~3 semanas que lo daba por inexistente (esa auditoría describía una etapa anterior del mismo diseño, ya superada). Sin embargo, existen **3 hallazgos P0 reales**, concentrados en los repositorios *legacy* de Nota de Ingreso/Nota de Salida/Stock que coexisten junto al motor nuevo dentro de la misma carpeta:

1. Fuga de aislamiento multiempresa por clave de `localStorage` sin `empresaId` (fallback a clave global) en los repositorios legacy de NI/NS.
2. Una rutina de migración legacy en `stock.repository.ts` que copia y **borra** una clave compartida entre empresas hacia la primera empresa que abre Inventario en ese navegador.
3. Esos mismos repositorios legacy tragan silenciosamente errores de corrupción/cuota de `localStorage`, arriesgando que una Nota de Ingreso/Salida quede invisible para el usuario aunque el motor de capas sí haya escrito el movimiento.

Ninguno de los tres corrompe las capas de costo o el FIFO en sí (esa parte reconcilia correctamente en todos los escenarios probados), pero sí violan condiciones explícitas de cierre de esta auditoría (aislamiento por empresa, ausencia de pérdida silenciosa de documentos). A esto se suman 9 hallazgos P1 (permisos granulares inexistentes para operaciones de costo, enforcement 100% en cliente sin backend, huecos de idempotencia entre pestañas, ausencia de manejo de cuota en el motor nuevo, ausencia de estrategia de purga, tratamiento tributario "por línea" no realmente diferenciado, cero pruebas de UI/E2E, recálculo retroactivo general no verificable).

**Por diseño explícito de esta auditoría, la existencia de hallazgos P0/P1 impide "APROBADO PARA CIERRE" y también impide "APROBADO CON OBSERVACIONES"** (reservado para el caso sin P0 y con solo P1/P2 menores) — de ahí el veredicto NO APROBADO, pese a que el núcleo de costeo por sí solo probablemente merecería un juicio mucho más favorable.

---

## B. Resumen cuantitativo

| Métrica | Valor |
|---|---|
| P0 | 3 |
| P1 | 9 |
| P2 | 10 |
| Pruebas ejecutadas (`npx vitest run`, workspace `senciyo`) | 846 (36 archivos) |
| Pruebas aprobadas | 846 |
| Pruebas fallidas | 0 |
| Build (`tsc -b && vite build`) | ✅ exitoso |
| Lint (`eslint .`) | ✅ 0 errores/0 warnings |
| Escenarios ESC-01..32 verificados | 26 ✅ · 2 ⚠️ · 4 ⛔ no verificable |
| Escenarios no verificables | ESC-24, ESC-25 (recálculo retroactivo general fuera de la ventana de valorización inicial), y aislamiento estricto en ESC-30 solo parcialmente verificable por los P0 de repos legacy |

---

## C. Mapa de implementación

| Responsabilidad | Archivo/componente | Método o función | Fuente de verdad | Estado |
|---|---|---|---|---|
| Configuración de valorización (activación) | `configuracion-sistema/components/negocio/SeccionValorizacionInventario.tsx` + `orquestacionConfirmacionCosto.ts` | `iniciarPreparacionValorizacion`, `confirmarCostoDetalle`, `validarYTransicionarAValidada`, `ejecutarActivacionValorizacion` | `valorizacionInicial.service.ts` + `estadoActivacionValorizacionInventario.ts` | ✅ Implementado y probado |
| Detección de stock inicial a valorizar | `gestion-inventario/utils/deteccionValorizacionInicial.ts` | `detectarStockPositivoPorProductoAlmacen`, `resolverPropuestaCosto` | `Product.stockPorAlmacen` (lectura), nunca escritura | ✅ |
| Persistencia de capas de costo | `gestion-inventario/repositories/capaCostoInventario.repository.ts` | CRUD tenantizado, sin ordenar/consumir (responsabilidad delegada) | `localStorage` tenantizado por `empresaId` | ✅ (ver VAL-P2-001: sin guard de no-negatividad propio) |
| Motor de entradas valorizadas | `gestion-inventario/utils/entradaCuantitativaInventario.ts` | `construirCapasEntradaValorizada` | Línea de documento origen (NI/ajuste/importación) | ✅ |
| Motor de salidas / consumo FIFO | `gestion-inventario/utils/operacionCuantitativaInventarioComun.ts` | `ordenarCapasFifo`, `consumirCapasFIFO` | `CapaCostoInventario` vigente por producto+almacén | ✅ |
| Orquestador central (idempotencia + unidad de trabajo) | `gestion-inventario/services/servicioKardexValorizado.ts` | `ejecutarOperacionInventario`, `registrarEntradaValorizada`, `registrarSalidaValorizada` | `TransaccionInventario` + `OperacionIdempotenteInventario` | ✅ |
| Transferencias entre almacenes | `gestion-inventario/utils/transferenciaCuantitativaInventario.ts` | plan único de unidad de trabajo (salida+entrada+capas+consumos) | Igual que entradas/salidas | ✅ |
| Reversos/anulaciones | `gestion-inventario/utils/reversoCuantitativoInventario.ts` | `restaurarConsumosDeSalida`, `calcularMovimientoDeReverso` | `movimientoReversoDeId` + mutación de la misma capa/consumo | ✅ |
| Consulta de Kardex / stock valorizado | `gestion-inventario/services/consultaKardexValorizado.service.ts` | `proyectarKardexValorizado`, `calcularValorStockPorProductoAlmacen` | Reconstruido en cada llamada desde capas+consumos, nunca cacheado | ✅ |
| Puente Compras → Nota de Ingreso | `compras/contexto/ContextoCompras.tsx` (`dispararIngresoAutomaticoSiCorresponde`, `procesarGeneracionNIDesdeCC`) + `compras/mapeadores/mapeadorCCaNI.ts` | `construirNotaIngresoDesdeCC`, `calcularCostoValorizableLineaCompra` | `ComprobanteCompra`/`LineaCompra` | ✅ conectado en runtime (auditoría previa que lo daba por huérfano ya no aplica) |
| Persistencia del documento Nota de Ingreso/Salida (encabezado) | `gestion-inventario/repositories/notaIngreso.repository.ts`, `notaSalida.repository.ts` | `cargarNotasIngreso`/`guardarNotasIngreso` (legacy, sin tenant explícito) | `localStorage`, clave con fallback global | ❌ **VAL-P0-001 / VAL-P0-003** |
| Persistencia de movimientos legacy (pre-tenant) | `gestion-inventario/repositories/stock.repository.ts` | migración automática de clave legacy global → clave tenantizada | `localStorage` | ❌ **VAL-P0-002** |
| Idempotencia | `gestion-inventario/utils/idempotenciaInventario.ts` + `repositories/operacionIdempotenteInventario.repository.ts` | `reservarOperacionIdempotente`, hash SHA-256 real (`hashInventario.ts`) | `OperacionIdempotenteInventario` | ✅ (⚠️ VAL-P1-004 en multi-pestaña sin `navigator.locks`) |
| Control de concurrencia | `gestion-inventario/repositories/estadoVersionInventario.repository.ts` | CAS de versión (`actualizarEstadoVersionInventario`) | `EstadoVersionInventario` por empresa | ✅ |
| Recuperación tras fallo | `gestion-inventario/utils/recuperacionInventario.ts` | `completarEscriturasTransaccion` (replay del diario) | `TransaccionInventario` en `confirmando` | ✅ |
| Recálculo retroactivo general | — | no localizado fuera de la ventana de valorización inicial | — | ⛔ No verificable |
| Permisos | `configuracion-sistema/roles/catalogoPermisos.ts` | `inventario.ver/ajustar/transferir/actualizacion_masiva` (genéricos) | Cliente únicamente, sin backend | ⚠️ **VAL-P1-001/002** |

---

## D. Matriz de reglas funcionales

| Regla (sección del encargo) | Implementada | Evidencia | Observación |
|---|---:|---|---|
| 2.1 FIFO real por capas, no solo por almacén | ✅ Sí | `operacionCuantitativaInventarioComun.ts:475-573` (`ordenarCapasFifo`+`consumirCapasFIFO`) | Costo promedio nunca sustituye FIFO (`consultaKardexValorizado.service.ts:12-15`) |
| 2.2 Arquitectura Movimiento/Capa/Consumo trazable | ✅ Sí (normalizada en 3 entidades) | `capaCostoInventario.types.ts`, `consumoCapaCostoInventario.types.ts`, `inventory.types.ts` | Trazabilidad completa requiere JOIN de 3 tablas, no 1 sola fila (decisión de diseño, no defecto) |
| 2.3.A Ingreso automático → NI visible, auto-confirmada, una sola vez | ✅ Sí | `ContextoCompras.tsx:1818-1850` | — |
| 2.3.B Ingreso manual → sin stock hasta confirmar NI, una sola vez | ✅ Sí | `useNotasIngreso.ts:97`, idempotencia `notaIngreso.service.ts:265` | — |
| 2.3.C No afecta inventario → inerte | ✅ Sí | `calcularEstadosCompra.ts:59`, `ContextoCompras.tsx:1677-1679` | — |
| 2.3 Modelo no debe impedir recepción parcial futura | ✅ Sí (bloqueo es de regla de negocio, no de modelo) | `ComprobanteCompra.notasIngresoRelacionadas?: string[]` ya es arreglo; guard en `ContextoCompras.tsx:1680-1682` | Habilitar recepción parcial exige quitar un guard y ajustar sincronización, no rediseñar el modelo |
| 2.3 OC/Requerimiento no afectan stock | ✅ Sí | grep limpio en `servicioOrdenCompra.ts`/`servicioRequerimientoCompra.ts` | — |
| 2.4 Solo líneas inventariables afectan Kardex, fuente única | ✅ Sí | `reglasCompras.ts:1291-1302` → `shared/inventory/clasificacionInventario.ts:54` | Único uso duplicado es un badge cosmético sin efecto de negocio |
| 2.5 Unidad mínima + factor de conversión con snapshot histórico | ✅ Sí | `mapeadorCCaNI.ts:146-151`; test 2 cajas×12=24, costo unitario 10 | — |
| 2.6 Impuestos: excluir recuperable / incluir en costo | ✅ Sí | `resolucionTributaria.ts:157-171` | — |
| 2.6 Impuestos: "definir por cada línea" real | ⚠️ Parcial | `resolucionTributaria.ts:167-169` — `segun_afectacion` siempre resuelve indeterminado/conservador | **VAL-P1-007** |
| 2.6 Snapshot tributario inmutable tras confirmar | ✅ Sí | `notaIngreso.types.ts:59`, nunca recalculado tras crear la capa | Config se lee en vivo al momento de confirmar NI manual, no al registrar CC — **VAL-P2-004** |
| 2.6 Sin IGV hardcodeado al 18% | ✅ Sí | grep limpio en producción de Compras/Inventario | — |
| 2.8 Moneda base no hardcodeada | ✅ Sí | `currencyManager.getSnapshot().baseCurrency.code` en todos los puntos revisados | `'PEN'` solo aparece como fallback de UI, nunca en el cálculo de capa |
| 2.8 TC histórico conservado, capa en moneda base | ✅ Sí | `entradaCuantitativaInventario.ts:284-287` | NI limitada a PEN/USD pese a que `MonedaCompra` admite EUR — **VAL-P2-003** |
| 2.9 `Product.precioCompra` no es fuente oficial del Kardex | ✅ Sí | `consultaKardexValorizado.service.ts:14,178` + test dedicado | Sí se usa como valor por defecto editable en 2 puntos (valorización inicial, línea manual de NI) — uso acotado y documentado, **VAL-P2-006** |
| 2.10 Preparación de stock inicial (detección, propuesta/confirmado, bloqueo, atomicidad, no-duplicación) | ✅ Sí, exhaustivamente probado | `valorizacionInicial.service.ts` + `SeccionValorizacionInventario.tsx` | Ver matriz de escenarios ESC-01 a ESC-05 |
| 2.11 Reserva no consume capas ni genera costo | ✅ Sí | `servicioReservaStock.ts:158-205` — solo contador | — |
| 2.12 Transferencias conservan valor, atómicas | ✅ Sí | `transferenciaCuantitativaInventario.ts:304-338` (test con costo 12.5→12.5) | — |
| 2.13 Anulaciones vía reversa trazable, nunca eliminación | ✅ Sí | `reversoCuantitativoInventario.ts:238,313-341,393` | — |
| 2.13 Devolución física de venta (NC) revierte costo | ✅ Sí (verificado directamente, corrige un hallazgo de auditoría previa) | `useComprobanteActions.tsx:1043-1217` — recupera costo histórico real vía `ConsumoCapaCostoInventario` originales y crea capa vinculada cuando la valorización está activa | Si la reversión de inventario falla tras emitir la NC, el documento comercial ya quedó emitido (con aviso explícito al usuario, no silencioso) — comportamiento de diseño consistente con el resto del sistema, no un hallazgo nuevo |
| 2.14 Idempotencia real (doble confirmación no duplica) | ✅ Sí | `unidadTrabajoInventario.ts:116-119` | Clave siempre determinista (`tipo:documentoId`), nunca aleatoria |
| 2.14 Atomicidad (todo o nada pese a localStorage) | ✅ Sí, mediante diario+replay, no `setItem` único | `unidadTrabajoInventario.ts:10-13,100-243` | Documentado explícitamente como "no hay atomicidad real, la garantía es diario+replay+detección" |
| 2.14 Concurrencia sin condiciones de carrera | ✅ Sí, verificado con `Promise.allSettled` real | `unidadTrabajoInventario.test.ts:272-290` | Salvo la reserva idempotente entre pestañas sin `navigator.locks` — **VAL-P1-004** |
| 2.14 Sin stock negativo / capas negativas | ✅ En el motor FIFO; ⚠️ en un flujo de UI legacy | `operacionCuantitativaInventarioComun.ts:536`; contraejemplo en `AdjustmentModal.tsx` | **VAL-P1-003** |
| 2.15 Fechas retroactivas / recálculo real (no solo flag) | ⚠️ Solo dentro de la ventana de valorización inicial; general ⛔ no verificable | `invalidacionValorizacionInicial.ts` (idempotente en su alcance) | **VAL-P1-009** |
| 2.16 Trazabilidad de 21 campos reconstruible | ✅ 15/21 directos, 6 recuperables por join (diseño normalizado) | `inventory.types.ts` + `capaCostoInventario.types.ts` | Ningún campo perdido, solo distribuido en 3 tablas por diseño |
| Multiempresa (transversal a todas las reglas) | ⚠️ Motor nuevo: sí. Repos legacy NI/NS/stock: no | `coleccionLocalStorageInventario.ts` (correcto) vs `notaIngreso.repository.ts`/`stock.repository.ts` (fuga) | **VAL-P0-001 / VAL-P0-002** |

---

## E. Matriz de escenarios

| Escenario | Resultado esperado | Resultado observado | Estado | Evidencia |
|---|---|---|---|---|
| ESC-01 | Sin stock → no solicita costo, no crea capas | Detección excluye `cantidad<=0` | ✅ | `deteccionValorizacionInicial.ts:31-47` |
| ESC-02 | Stock positivo → exige costo confirmado, 1 capa | Doble gate UI+servicio, capa única probada | ✅ | `valorizacionInicial.service.ts:527-531,978-981` |
| ESC-03 | 2 almacenes → capas independientes | Test con 3 capas para 2 productos/2 almacenes | ✅ | `valorizacionInicial.service.test.ts:821-840` |
| ESC-04 | Línea pendiente de costo bloquea activación | `verificarCondicionesActivacion` lanza; botón oculto | ✅ | `valorizacionInicial.service.ts:509-611` |
| ESC-05 | Repetir validación no duplica | Doble clic y `Promise.all` concurrente → 1 capa | ✅ | test líneas 862-873, 1014-1029 |
| ESC-06 | IGV recuperable excluido del costo | `resolverRecuperabilidadImpuesto` | ✅ | `resolucionTributaria.ts:157-171` |
| ESC-07 | IGV no recuperable incluido en costo | Igual función, rama opuesta | ✅ | ídem |
| ESC-08 | "Definir por línea" con snapshot distinto por línea | `segun_afectacion` siempre indeterminado, no diferencia por línea | ⚠️ Parcial | `resolucionTributaria.ts:167-169` |
| ESC-09 | Moneda extranjera: TC histórico + capa en moneda base | Confirmado, limitado a par PEN/USD | ✅ (con nota) | `mapeadorCCaNI.ts:133-144` |
| ESC-10 | Presentación → unidad mínima con factor histórico | 2 cajas×12=24, costo 10 | ✅ | `mapeadorCCaNI.test.ts:65-73` |
| ESC-11 | Ingreso automático: NI visible/confirmada/una vez | Confirmado | ✅ | `ContextoCompras.tsx:1818-1850` |
| ESC-12 | Ingreso manual: sin stock hasta confirmar | Confirmado | ✅ | `useNotasIngreso.ts:97` |
| ESC-13 | No afecta inventario: inerte | Confirmado | ✅ | `calcularEstadosCompra.ts:59` |
| ESC-14 | Solo línea inventariable ingresa | Fuente única de clasificación | ✅ | `clasificacionInventario.ts:54` |
| ESC-15 | Multi-capa: 10@5+10@8, salida 12→66, quedan 8@8=64 | Test estructuralmente equivalente (10@10+5@12, salida 12→124, quedan 3@12=36) pasa | ✅ (números distintos, misma estructura) | `salidaCuantitativaInventario.test.ts:654-683` |
| ESC-16 | Consumo parcial conserva disponible correcto | Test de capa fraccionaria 1.5→0 exacto | ✅ | `salidaCuantitativaInventario.test.ts:850` |
| ESC-17 | Reserva no consume capas ni genera costo | Solo contador, sin FIFO | ✅ | `servicioReservaStock.ts:158-205` |
| ESC-18 | Liberar reserva sin movimientos artificiales | Confirmado en el mismo plan de escritura | ✅ | `servicioReservaStock.ts` |
| ESC-19 | Transferencia: cantidad+valor conservados, atómica | Un solo plan de unidad de trabajo | ✅ | `transferenciaCuantitativaInventario.ts:473-491` |
| ESC-20 | Anulación NI: reversa trazable | `movimientoReversoDeId`, cero `delete`/`splice` | ✅ | `reversoCuantitativoInventario.ts:238,393` |
| ESC-21 | Anulación salida: restaura cantidad y valor | Misma capa, mismo costo | ✅ | `reversoCuantitativoInventario.ts:313-341` |
| ESC-22 | Repetir confirmación tras timeout no duplica | Hash+clave determinista, cero escrituras en repetición | ✅ | `unidadTrabajoInventario.ts:116-119` |
| ESC-23 | Concurrencia: sin doble consumo ni negativo | `Promise.allSettled`: 1 gana, 1 aborta, versión final=1 | ✅ | `unidadTrabajoInventario.test.ts:272-290` |
| ESC-24 | Retroactivo: identifica necesidad de recálculo, FIFO final coherente | No se localizó mecanismo general fuera de valorización inicial | ⛔ No verificable | — |
| ESC-25 | Recálculo 2 veces sin cambios → idéntico | Solo probado dentro de invalidación de valorización inicial (idempotente en ese alcance limitado) | ⛔ No verificable (alcance general) | `invalidacionValorizacionInicial.test.ts:69-74` |
| ESC-26 | Cambiar precio de compra no altera histórico | `consultaKardexValorizado` nunca lee `precioCompra` | ✅ | `consultaKardexValorizado.service.test.ts:218` |
| ESC-27 | Cambiar factor de presentación no altera histórico | Snapshot congelado, nunca remultiplicado | ✅ | `mapeadorCCaNI.test.ts:90-100` |
| ESC-28 | Cambiar config tributaria no altera costos confirmados | Snapshot inmutable tras crear capa | ✅ (con matiz de timing en modo manual) | **VAL-P2-004** |
| ESC-29 | Cambiar TC no altera capas históricas | `tipoCambioAplicado` congelado en la capa | ✅ | `entradaCuantitativaInventario.ts:284-287` |
| ESC-30 | Dos empresas, monedas base distintas, sin compartir nada | Motor nuevo: aislado. Repos legacy NI/NS/stock: fuga real | ⚠️ Parcial | **VAL-P0-001/002** |
| ESC-31 | Fallo intermedio → rollback completo | Diario+replay recuperable (no rollback literal, pero nunca queda a medias sin camino determinista) | ✅ (por diseño) | `unidadTrabajoInventario.ts:100-243` |
| ESC-32 | Stock Actual / Movimientos / Kardex reconcilian | Reconstruido desde capas+consumos reales, sin caché | ✅ | `consultaKardexValorizado.service.ts:106-204` |

---

## F. Hallazgos detallados

### VAL-P0-001 — Fuga de aislamiento multiempresa en repositorios legacy de Nota de Ingreso/Salida

- **Severidad:** P0
- **Regla afectada:** Aislamiento multiempresa (transversal, sección 2.8/2.16/cierre)
- **Evidencia:** `tryLsKey(STORAGE_KEY_NOTAS_INGRESO) ?? STORAGE_KEY_NOTAS_INGRESO` — si no hay tenant activo resuelto en el momento de la llamada, cae a una clave física sin prefijo de empresa, compartida por todas las empresas del mismo navegador.
- **Archivo(s):** `gestion-inventario/repositories/notaIngreso.repository.ts:9-10`, `gestion-inventario/repositories/notaSalida.repository.ts:9-10`
- **Función, clase o endpoint:** `cargarNotasIngreso`/`guardarNotasIngreso`, equivalentes en NS. Ninguna recibe `empresaId` por parámetro (a diferencia de los 7 repositorios del motor nuevo, que sí lo exigen explícitamente).
- **Comportamiento actual:** si el contexto de tenant no está resuelto al momento de leer/escribir, ambos repositorios usan una clave global sin empresa.
- **Comportamiento esperado:** toda lectura/escritura de datos de negocio debe requerir `empresaId` explícito y nunca degradar a una clave compartida, igual que ya hace `coleccionLocalStorageInventario.ts`.
- **Riesgo funcional:** una empresa puede ver o sobrescribir Notas de Ingreso/Salida de otra empresa que comparta navegador/perfil (soporte, capacitación, ambientes de prueba compartidos).
- **Riesgo técnico:** corrupción cruzada de datos de negocio, imposible de detectar sin auditoría manual.
- **Forma de reproducir:** provocar que el tenant activo no esté resuelto (p. ej. carga inicial antes de hidratar sesión, o llamada desde un contexto sin `TenantProvider`) y confirmar una NI/NS; inspeccionar la clave física resultante en `localStorage`.
- **Recomendación concreta:** exigir `empresaId` como parámetro obligatorio en ambos repositorios (igual patrón que `coleccionLocalStorageInventario.ts`), eliminar el fallback a clave global, y migrar los datos ya guardados bajo la clave global (si existen) a las claves tenantizadas correctas antes de desplegar el fix.
- **Dependencias:** ninguna (aislado a estos 2 archivos y sus llamadores directos).
- **Criterio de corrección:** ningún repositorio de dominio en `gestion-inventario` acepta o produce una clave física sin `empresaId`; test de regresión que verifique rechazo explícito ante tenant no resuelto.

### VAL-P0-002 — Migración legacy destructiva de stock entre empresas

- **Severidad:** P0
- **Regla afectada:** Aislamiento multiempresa, integridad de datos
- **Evidencia:** si la clave tenantizada de movimientos está vacía, el código copia silenciosamente el contenido de una clave legacy global (`STORAGE_KEY_MOVEMENTS` sin empresa) hacia la clave de la empresa actual y **borra el original**.
- **Archivo(s):** `gestion-inventario/repositories/stock.repository.ts:19-45`
- **Función, clase o endpoint:** rutina de migración al leer movimientos (no nombrada explícitamente por el agente, ejecutada en la ruta de lectura de `stock.repository.ts`).
- **Comportamiento actual:** la primera empresa que abre la pantalla de Inventario en un navegador con datos legacy "consume" y destruye esos datos compartidos, dejándolos inaccesibles para cualquier otra empresa que los necesitara.
- **Comportamiento esperado:** una migración de datos legacy nunca debe ser destructiva ni dependiente de qué empresa la dispare primero; debe ejecutarse una sola vez, de forma controlada (script de migración explícito), nunca como efecto colateral de abrir una pantalla.
- **Riesgo funcional:** pérdida irreversible de historial de movimientos de una empresa si otra empresa abre Inventario primero en el mismo navegador.
- **Riesgo técnico:** condición de carrera de "quien primero lee, gana y borra"; no hay forma de deshacer.
- **Forma de reproducir:** poblar la clave legacy `STORAGE_KEY_MOVEMENTS` con datos, iniciar sesión con empresa B (con clave tenantizada vacía) y abrir Inventario; confirmar que los datos migran a B y la clave legacy queda vacía.
- **Recomendación concreta:** eliminar esta migración automática en tiempo de lectura; si aún hay datos reales bajo la clave legacy en producción, migrarlos una sola vez con un script explícito y auditado antes de desactivar la ruta legacy.
- **Dependencias:** debe resolverse antes o junto con VAL-P0-001 (mismo patrón de raíz: repos legacy sin aislamiento estricto).
- **Criterio de corrección:** cero rutas de lectura que muten/borren datos como efecto colateral; cualquier migración de datos legacy es un paso explícito, versionado y ejecutado una sola vez.

### VAL-P0-003 — Pérdida silenciosa de documentos Nota de Ingreso/Salida ante corrupción o cuota excedida

- **Severidad:** P0
- **Regla afectada:** 2.3.A ("Debe generar una Nota de Ingreso visible"), integridad de trazabilidad documental
- **Evidencia:** `guardarNotasIngreso()` envuelve la escritura en `try { ... } catch { /* ignorar cuota */ }`; `cargarNotasIngreso()` envuelve la lectura en `try { ... } catch { return []; }`. `notaSalida.repository.ts` conserva el mismo patrón en sus funciones legacy (`cargarNotasSalida`/`guardarNotasSalida`), aunque ya existe una variante robusta (`persistirNotasSalidaCompleto`) que tipa el error en vez de tragarlo — pero no se usa universalmente.
- **Archivo(s):** `gestion-inventario/repositories/notaIngreso.repository.ts:12-33`, `gestion-inventario/repositories/notaSalida.repository.ts:12-33`
- **Función, clase o endpoint:** `cargarNotasIngreso`, `guardarNotasIngreso`, `cargarNotasSalida`, `guardarNotasSalida`
- **Comportamiento actual:** si `localStorage.setItem` falla (cuota excedida) o el contenido está corrupto, el error se descarta sin aviso al usuario ni al llamador.
- **Comportamiento esperado:** ningún fallo de persistencia de un documento de negocio debe ser silencioso; debe propagarse como error visible (igual que ya hace, de forma ejemplar, `coleccionLocalStorageInventario.ts` para capas/consumos/transacciones).
- **Riesgo funcional:** el motor de capas puede haber escrito correctamente el movimiento+capa mientras el documento NI/NS visible para el usuario nunca se guardó — el usuario ve un Kardex que cambió pero ningún documento que lo explique, exactamente la situación que la regla 2.3.A prohíbe ("no puede existir una actualización silenciosa del stock sin movimiento trazable" — aquí el movimiento existe pero el documento de origen visible no).
- **Riesgo técnico:** divergencia silenciosa entre la colección de documentos y el ledger de movimientos/capas, sin ninguna señal de alerta.
- **Forma de reproducir:** simular `localStorage.setItem` lanzando `QuotaExceededError` (o corromper manualmente la clave JSON) y confirmar una Nota de Ingreso; observar que el toast de éxito aparece pero la NI no persiste.
- **Recomendación concreta:** eliminar los `catch` silenciosos; propagar el error y bloquear/advertir explícitamente al usuario, siguiendo el mismo estándar ya aplicado en los repositorios nuevos del Kardex.
- **Dependencias:** ninguna, cambio aislado a estos 2 archivos.
- **Criterio de corrección:** ningún repositorio de `gestion-inventario` silencia un error de lectura/escritura de `localStorage`; test de regresión que fuerce el error y verifique que se propaga.

### VAL-P1-001 — Sin permisos granulares para operaciones de costo/valorización

- **Severidad:** P1
- **Regla afectada:** Sección 9 (seguridad y permisos)
- **Evidencia:** `catalogoPermisos.ts:172-195` solo define 4 permisos genéricos de inventario (`ver`, `ajustar`, `transferir`, `actualizacion_masiva`); ninguno cubre ver costos, configurar valorización, confirmar costo inicial, ejecutar recálculo, registrar ajuste valorizado, anular movimiento valorizado, o consultar el Kardex valorizado específicamente.
- **Archivo(s):** `configuracion-sistema/roles/catalogoPermisos.ts`
- **Comportamiento actual:** cualquier usuario con `inventario.ver` puede abrir la configuración de valorización, confirmar costos iniciales y activar la valorización irreversible de la empresa.
- **Comportamiento esperado:** cada una de las 7 capacidades listadas en la sección 9 del encargo debe tener su propio permiso verificable.
- **Riesgo funcional:** un rol pensado solo para "ver inventario" puede ejecutar la activación irreversible de valorización o confirmar costos iniciales incorrectos.
- **Riesgo técnico:** ninguno adicional al ya cubierto por VAL-P1-002.
- **Forma de reproducir:** crear un rol con únicamente `inventario.ver` y confirmar que puede acceder a `SeccionValorizacionInventario.tsx` y ejecutar la activación.
- **Recomendación concreta:** añadir permisos específicos (`inventario.costos.ver`, `inventario.valorizacion.configurar`, `inventario.valorizacion.activar`, `inventario.kardex.consultar`, etc.) y aplicarlos como guard en cada acción sensible.
- **Dependencias:** ninguna.
- **Criterio de corrección:** las 7 capacidades de la sección 9 tienen permiso propio, verificado por test.

### VAL-P1-002 — Enforcement de permisos 100% en cliente, sin backend

- **Severidad:** P1
- **Regla afectada:** Sección 9 ("no basta con ocultar botones... comprueba protección en... endpoints... servicios de dominio")
- **Evidencia:** confirmado que no existe backend propio para este módulo (cero uso de Supabase/API en `gestion-inventario`); toda persistencia es `localStorage` del navegador.
- **Archivo(s):** arquitectónico, no un archivo puntual.
- **Comportamiento actual:** cualquier permiso, por bien implementado que esté en el cliente, es evadible modificando `localStorage`/estado de React desde las herramientas de desarrollador del navegador.
- **Comportamiento esperado:** los permisos críticos (activar valorización, anular movimientos, confirmar costos) deberían tener una capa de aplicación fuera del control total del cliente.
- **Riesgo funcional:** en un ERP SaaS multiempresa, un usuario técnico podría manipular directamente sus propios datos de costo/valorización sin pasar por ninguna regla de negocio.
- **Riesgo técnico:** es una limitación arquitectónica de todo el sistema (no exclusiva de Kardex), pero aquí es especialmente sensible porque involucra datos financieros/contables.
- **Forma de reproducir:** editar directamente las claves de `localStorage` de capas/costos desde devtools.
- **Recomendación concreta:** fuera del alcance de una corrección puntual de Kardex — requiere decisión de producto/arquitectura sobre si este módulo necesita backend propio antes de tratarse como financieramente auditable ante terceros (SUNAT, auditores externos).
- **Dependencias:** decisión de arquitectura general del producto.
- **Criterio de corrección:** no aplica una corrección de código aislada; se documenta como riesgo estructural a decidir por Producto/Arquitectura.

### VAL-P1-003 — Ajuste manual de stock permite resultado negativo sin bloqueo duro

- **Severidad:** P1
- **Regla afectada:** 2.14 ("no se permita stock negativo")
- **Evidencia:** el botón de submit no valida `newStock < 0`, solo lo colorea en rojo; `TransferModal.tsx` sí bloquea si la cantidad excede el stock disponible en origen.
- **Archivo(s):** `gestion-inventario/components/modals/AdjustmentModal.tsx` (línea ~487 del submit, validación visual en 400-409) vs. `TransferModal.tsx:451`
- **Comportamiento actual:** un ajuste manual que resulte en stock negativo puede confirmarse desde la UI sin bloqueo (solo advertencia visual de color).
- **Comportamiento esperado:** bloqueo duro igual que en `TransferModal.tsx`.
- **Riesgo funcional:** en empresas que aún no activaron valorización (modo puramente cuantitativo, donde el guard de `resolverModoOperacion` no aplica sobre esta ruta legacy), un ajuste puede dejar stock negativo real.
- **Riesgo técnico:** una vez activada la valorización, el motor FIFO subyacente (`registerAdjustment`) queda bloqueado por `resolverModoOperacion`, por lo que el riesgo real está acotado al modo cuantitativo puro — pero sigue siendo una violación directa de la regla explícita de cierre.
- **Forma de reproducir:** en una empresa sin valorización activa, abrir "Ajustar stock" e ingresar una cantidad que deje el stock resultante en negativo; confirmar.
- **Recomendación concreta:** deshabilitar el botón de confirmar (no solo colorear) cuando el stock resultante sería negativo, igual patrón que `TransferModal.tsx`.
- **Dependencias:** ninguna.
- **Criterio de corrección:** test que confirme que el submit está deshabilitado/bloqueado ante resultado negativo.

### VAL-P1-004 — Reserva de idempotencia no protegida entre pestañas sin `navigator.locks`

- **Severidad:** P1
- **Regla afectada:** 2.14 (concurrencia)
- **Evidencia:** el fallback en memoria documenta explícitamente que "si dos pestañas ejecutan esta misma función... cada una tiene su propio Map y no se bloquean entre sí".
- **Archivo(s):** `gestion-inventario/utils/bloqueoInventario.ts:26-45`
- **Comportamiento actual:** en navegadores sin `navigator.locks` (minoría, pero no cero), dos pestañas de la misma empresa podrían crear la misma operación idempotente dos veces por una ventana de carrera real entre "consultar si existe" y "escribir".
- **Comportamiento esperado:** protección real de concurrencia multi-pestaña independiente del soporte del navegador.
- **Riesgo funcional:** duplicación de una operación de inventario si el usuario tiene dos pestañas abiertas en un navegador antiguo/sin soporte.
- **Riesgo técnico:** el CAS de versión seguiría protegiendo el commit final de datos de dominio, pero la reserva idempotente en sí podría duplicarse en ese escenario degradado.
- **Forma de reproducir:** forzar la ausencia de `navigator.locks` (feature-detection deshabilitada) y disparar la misma operación desde 2 pestañas simultáneamente.
- **Recomendación concreta:** documentar el navegador mínimo soportado, o implementar un mecanismo de fallback real (p. ej. `BroadcastChannel` + protocolo de elección, o forzar un único "tab líder").
- **Dependencias:** ninguna.
- **Criterio de corrección:** test de concurrencia multi-pestaña simulado sin `navigator.locks` que no produzca duplicados.

### VAL-P1-005 — Ningún repositorio del motor nuevo maneja `QuotaExceededError`

- **Severidad:** P1
- **Regla afectada:** 2.10/2.14 (manejo de errores del "servidor"/almacenamiento)
- **Evidencia:** `guardarColeccionTenantizada` (usada por los 6 repositorios del Kardex: capas, consumos, transacciones, operaciones idempotentes, valorización inicial, invalidaciones pendientes) no tiene `try/catch` alrededor de `localStorage.setItem`.
- **Archivo(s):** `gestion-inventario/repositories/coleccionLocalStorageInventario.ts:136-139`, `utils/escrituraLocalStorageInventario.ts:52`
- **Comportamiento actual:** si `setItem` lanza por cuota excedida, la excepción se propaga como `DOMException` cruda, sin mensaje de dominio legible para el usuario.
- **Comportamiento esperado:** un mensaje de error claro y accionable (a diferencia de VAL-P0-003, aquí el fallo SÍ se propaga — el problema es la calidad del mensaje, no la pérdida silenciosa).
- **Riesgo funcional:** el usuario ve un error técnico incomprensible en vez de una guía clara ("el almacenamiento local está lleno, contacte a soporte / exporte y limpie historial").
- **Riesgo técnico:** ninguno adicional (la transacción queda recuperable vía el diario, según lo confirmado en la auditoría de idempotencia/atomicidad).
- **Forma de reproducir:** llenar la cuota de `localStorage` del origen y ejecutar cualquier operación de Kardex.
- **Recomendación concreta:** capturar `QuotaExceededError` específicamente y traducirlo a un mensaje de dominio, sin cambiar el comportamiento de propagación (que ya es correcto).
- **Dependencias:** relacionada con VAL-P1-006 (sin purga, la cuota se alcanza antes).
- **Criterio de corrección:** mensaje de dominio específico ante cuota excedida, verificado por test.

### VAL-P1-006 — Sin estrategia de purga/archivado del historial de Kardex

- **Severidad:** P1
- **Regla afectada:** Preparación para operar en el tiempo sin degradar (transversal a sección 5 y cierre)
- **Evidencia:** capas, consumos, transacciones y operaciones idempotentes son append-only por diseño de auditoría explícito ("los lotes cancelados nunca se eliminan"); `recuperarTransaccionesInterrumpidas()` escanea la colección completa en cada operación.
- **Archivo(s):** `gestion-inventario/models/transaccionInventario.types.ts:8-9`, `repositories/valorizacionInicialInventario.repository.ts:9-11`, `utils/unidadTrabajoInventario.ts:108`
- **Comportamiento actual:** crecimiento indefinido del volumen de datos en `localStorage` (límite físico ~5-10MB por origen), sin archivado en frío ni compactación.
- **Comportamiento esperado:** una estrategia explícita de archivado/paginación antes de que el volumen de datos de una empresa longeva se acerque al límite.
- **Riesgo funcional:** empresas con alto volumen de movimientos eventualmente no podrán registrar nuevas operaciones (cuota excedida), y el rendimiento de lectura se degrada progresivamente (O(n) creciente).
- **Riesgo técnico:** sin mitigación, es cuestión de tiempo/volumen, no de "si ocurre".
- **Forma de reproducir:** simular miles de transacciones y medir tiempo de `recuperarTransaccionesInterrumpidas`/tamaño de la clave.
- **Recomendación concreta:** definir una política de archivado (mover a un almacén frío/exportable, o migrar a backend real) antes de operar a escala con este diseño.
- **Dependencias:** decisión de arquitectura (persistencia real vs. localStorage) — mismo eje que VAL-P1-002.
- **Criterio de corrección:** política de archivado definida y, al menos, alertas de umbral de cuota.

### VAL-P1-007 — Tratamiento tributario "definir por cada línea" no está realmente diferenciado por línea

- **Severidad:** P1
- **Regla afectada:** 2.6 ("La selección por línea realmente exista cuando corresponda")
- **Evidencia:** `segun_afectacion` siempre resuelve `esRecuperable=null`/indeterminado, documentado en el propio comentario como "fuera de alcance"; no hay campo por línea que permita al usuario decidir individualmente pese a que la etiqueta de UI dice "Definir por cada línea de compra".
- **Archivo(s):** `shared/catalogos-sunat/resolucionTributaria.ts:157-171`, `opcionesTratamientoImpuestoCompra.ts:40-43`
- **Comportamiento actual:** seleccionar "definir por línea" produce el mismo resultado conservador (impuesto incluido en costo) para todas las líneas, sin diferenciación real.
- **Comportamiento esperado:** cada línea del comprobante debería poder declarar su propio tratamiento tributario.
- **Riesgo funcional:** discrepancia entre lo que la UI promete (control por línea) y lo que realmente ocurre — puede llevar a un usuario a asumir que configuró algo que no tiene efecto.
- **Riesgo técnico:** ninguno (el efecto es conservador, nunca excluye impuesto sin determinación explícita).
- **Forma de reproducir:** seleccionar "Definir por cada línea", registrar un CC con 2 líneas con distinta afectación esperada, confirmar que ambas reciben el mismo tratamiento.
- **Recomendación concreta:** implementar el campo por línea real, o (más barato) renombrar/ocultar la opción hasta que exista, para no prometer una capacidad inexistente.
- **Dependencias:** ninguna.
- **Criterio de corrección:** dos líneas del mismo comprobante bajo esta opción pueden terminar con `esImpuestoRecuperable` distinto, verificado por test.

### VAL-P1-008 — Cero pruebas de UI (`.test.tsx`) y cero pruebas E2E en todo el módulo

- **Severidad:** P1
- **Regla afectada:** Sección 10
- **Evidencia:** 96 archivos de código vs. 36 archivos `.test.ts` (~35% con test compañero); el 100% de los ~21 componentes de UI de `gestion-inventario` no tiene test propio; `vitest.config.ts` usa `environment:'node'` (sin `jsdom`/`@testing-library/react` instalado); ningún `.spec.ts`/carpeta `e2e`/`cypress`/`playwright` fuera de `node_modules` en todo el repo.
- **Archivo(s):** todo `gestion-inventario/components/**`
- **Comportamiento actual:** las garantías de comportamiento de UI (gating de botones por permiso/estado, bloqueo real de "Validar preparación", no invención de valores "—") están verificadas solo por lectura de código, no por test automatizado.
- **Comportamiento esperado:** al menos cobertura de los flujos críticos de UI (activación de valorización, ajuste, transferencia) con `@testing-library/react`.
- **Riesgo funcional:** una regresión de UI (p. ej. un botón que deja de deshabilitarse) no sería detectada por CI.
- **Riesgo técnico:** la lógica de negocio en sí está exhaustivamente probada (846 tests); el riesgo está acotado a la capa de presentación.
- **Forma de reproducir:** N/A (ausencia estructural).
- **Recomendación concreta:** instalar `jsdom`+`@testing-library/react`, priorizar tests de `SeccionValorizacionInventario.tsx`, `AdjustmentModal.tsx`, `TransferModal.tsx` (los de mayor riesgo funcional ya identificado).
- **Dependencias:** ninguna.
- **Criterio de corrección:** al menos los 3 componentes de mayor riesgo con test de comportamiento real (no solo snapshot).

### VAL-P1-009 — Recálculo retroactivo general no verificado / posiblemente inexistente fuera de la ventana de valorización inicial

- **Severidad:** P1
- **Regla afectada:** 2.15
- **Evidencia:** el flag `requiereRecalculo` y su lógica de invalidación solo se localizaron dentro de `DetalleValorizacionInicial` (ventana de migración a valorizado); ningún agente encontró un motor de recálculo para movimientos retroactivos generales (p. ej. registrar hoy una compra con fecha efectiva anterior a una venta ya confirmada, que en teoría debería reordenar el consumo FIFO).
- **Archivo(s):** no localizado (posible ausencia total).
- **Comportamiento actual:** desconocido — no verificado si el sistema permite siquiera registrar movimientos con fecha efectiva retroactiva fuera del flujo de valorización inicial, y si lo permite, no se encontró lógica de reordenamiento FIFO consecuente.
- **Comportamiento esperado:** según 2.15, debe existir un proceso de recálculo real, seguro e idempotente ante movimientos retroactivos.
- **Riesgo funcional:** si el sistema permite fechas efectivas retroactivas sin recalcular el orden FIFO, el costo de salidas ya confirmadas podría quedar basado en un orden de capas incorrecto.
- **Riesgo técnico:** no cuantificable sin verificación adicional dirigida.
- **Forma de reproducir:** intentar registrar una entrada con fecha efectiva anterior a una salida ya confirmada y observar si el sistema (a) lo permite, (b) marca algo como desactualizado, (c) ofrece recalcular.
- **Recomendación concreta:** sesión de verificación dedicada exclusivamente a este escenario antes de cualquier cierre definitivo.
- **Dependencias:** ninguna, pero requiere tiempo de auditoría adicional no cubierto por esta pasada.
- **Criterio de corrección:** escenario ESC-24/ESC-25 verificado con evidencia concreta (hoy marcado ⛔ No verificable).

### VAL-P2-001 — `cantidadDisponible >= 0` no se valida en el repositorio de capas

- **Severidad:** P2 · **Evidencia:** `capaCostoInventario.repository.ts:21-31` solo valida tipo, no rango · **Archivo:** mismo · **Comportamiento esperado:** defensa en profundidad además del guard en `consumirCapasFIFO`. **Recomendación:** añadir validación de rango en el repositorio como red de seguridad adicional. **Riesgo:** bajo hoy (single-orchestrator), relevante ante un futuro segundo consumidor que escriba capas directamente.

### VAL-P2-002 — `MovimientoStock` no distingue fecha efectiva de fecha de registro

- **Severidad:** P2 · **Evidencia:** un solo campo `fecha` (`inventory.types.ts:59`) · **Recomendación:** separar `fechaEfectiva`/`fechaRegistro` para soportar correctamente el escenario de fechas retroactivas (relacionado con VAL-P1-009).

### VAL-P2-003 — Nota de Ingreso limitada a PEN/USD pese a que Compras admite EUR

- **Severidad:** P2 · **Evidencia:** `ContextoCompras.tsx:366-368` rechaza monedas distintas de PEN/USD vs. `tiposBaseCompras.ts:1` que admite EUR · **Recomendación:** ampliar el soporte de moneda en la generación de NI o restringir la opción EUR en Compras hasta soportarla.

### VAL-P2-004 — Configuración tributaria de compra se resuelve al confirmar la NI manual, no al registrar el CC

- **Severidad:** P2 · **Evidencia:** `ContextoCompras.tsx:1686` lee configuración vigente en el momento de generar la NI · **Recomendación:** decisión de producto — congelar la configuración tributaria vigente al registrar el CC en vez de al confirmar la NI, si el negocio determina que esa es la interpretación correcta de "regla utilizada originalmente".

### VAL-P2-005 — Comentario de código desactualizado sobre alcanzabilidad del modo valorizado

- **Severidad:** P2 · **Evidencia:** `servicioKardexValorizado.ts:127-131` sugiere que el modo es "inalcanzable... solo ejercido por tests", pese a existir un flujo de producción completo · **Recomendación:** actualizar el comentario para no inducir a error a futuros mantenedores/auditores.

### VAL-P2-006 — `Product.precioCompra` prellena costo editable en línea manual de Nota de Ingreso

- **Severidad:** P2 · **Evidencia:** `FormularioNotaIngreso.tsx:401` — `costoUnitario: product.precioCompra ?? 0` · **Riesgo:** bajo (editable antes de confirmar, no vinculante) · **Recomendación:** mantener como está, documentar el comportamiento.

### VAL-P2-007 — Sin distinción visual clara entre costo propuesto/confirmado fuera del wizard de preparación

- **Severidad:** P2 · **Evidencia:** `DisponibilidadTable.tsx:611-617`, `MovimientoDetalleModal.tsx:146-149` muestran solo `formatMoney(...)` sin badge/ícono de estado · **Recomendación:** reutilizar el patrón visual ya usado en `SeccionValorizacionInventario.tsx`.

### VAL-P2-008 — 2 de 4 permisos de inventario sin espejo visual

- **Severidad:** P2 · **Evidencia:** `inventario.ajustar`/`inventario.actualizacion_masiva` no ocultan/deshabilitan el botón correspondiente, solo fallan con toast al hacer clic · **Recomendación:** ocultar/deshabilitar también en UI, consistente con el patrón ya usado para `inventario.transferir`.

### VAL-P2-009 — Escaneo O(n) de transacciones interrumpidas en cada operación

- **Severidad:** P2 · **Evidencia:** `unidadTrabajoInventario.ts:108`, `idempotenciaInventario.ts:273` · **Recomendación:** indexar por estado (`preparada`/`confirmando`) para evitar recorrer toda la colección histórica.

### VAL-P2-010 — Gaps menores de UI

- **Severidad:** P2 · `AdjustmentModal.tsx` no muestra unidad de medida ni moneda en "Costo unitario" (a diferencia de `TransferModal.tsx`); `DisponibilidadTable.tsx:327` columna sticky sin `min-width` con riesgo de solape en nombres largos; export a Excel de Movimientos sin columna de unidad. **Recomendación:** alinear con los patrones ya correctos de `TransferModal.tsx`.

---

## G. Reconciliación del inventario

| Verificación | Cumple | Evidencia numérica |
|---|---|---|
| Stock real = suma de cantidades vigentes | ✅ | `reconciliacionStockInventario.ts` valida esto explícitamente, con test de capa negativa/NaN rechazada |
| Stock real = suma de cantidades disponibles en capas | ✅ | Mismo mecanismo; capas `agotada` fuerzan `cantidadDisponible===0` exacto |
| Valor del inventario = suma del valor remanente de capas | ✅ | `calcularValorStockPorProductoAlmacen` excluye capas revertidas/agotadas, suma `cantidadDisponible × costoUnitarioBaseMonedaBase` |
| Costo de salidas = suma de consumos FIFO | ✅ | Ejemplo verificado: 2 capas (10@10, 5@12), salida de 12 → consume 10+2, costo total **124** (10×10 + 2×12), capa restante 3@12 = **36** |
| Transferencias conservan el valor | ✅ | Ejemplo verificado: capa origen 20@12.5, transfiere 5 → origen queda 15@12.5, destino nueva capa 5@**12.5** (mismo costo, no revalorizado) |
| Reversas conservan trazabilidad | ✅ | Reverso nunca crea capa nueva; recupera cantidad exacta a la MISMA capa/consumo original, marca `revertido/revertida`, nunca borra el original |
| Consultas coinciden con persistencia | ✅ | `consultaKardexValorizado.service.ts` reconstruye en cada llamada desde capas+consumos reales, sin caché ni campo derivado desincronizable |

**Nota:** esta reconciliación aplica al motor nuevo (capas/consumos/transacciones). Los hallazgos P0 de esta auditoría no rompen esta reconciliación numérica — afectan la capa de aislamiento multiempresa y la persistencia del *documento* visible (NI/NS), no el ledger de capas/consumos en sí.

---

## H. Revisión de fuentes de verdad

- **Fuente oficial de cantidades:** `MovimientoStock` (cuantitativo) + `stockPorAlmacen` derivado, reconciliado contra capas.
- **Fuente oficial de costos:** `CapaCostoInventario`/`ConsumoCapaCostoInventario` — nunca `Product.precioCompra`, nunca costo promedio, nunca precio de venta (confirmado por comentario explícito y test dedicado en `consultaKardexValorizado.service.ts`).
- **Fuente oficial de capas:** `capaCostoInventario.repository.ts`, tenantizado correctamente.
- **Fuente oficial de consumos:** `consumoCapaCostoInventario.repository.ts`, tenantizado correctamente.
- **Campos derivados:** `valorTotalStock` en `StockSummary` (declarado, nunca calculado — código muerto, sin riesgo); costo total/valor de capa se derivan de cantidad×costo unitario, nunca almacenados de forma que puedan desincronizarse silenciosamente (recalculados en cada consulta).
- **Datos duplicados:** ninguno crítico detectado en el motor nuevo; `Product.precioCompra` coexiste como costo referencial editable en 2 puntos acotados (valorización inicial y línea manual de NI), documentado y sin sustituir nunca a la capa real.
- **Código legado:** `notaIngreso.repository.ts`/`notaSalida.repository.ts` (funciones legacy) y `stock.repository.ts` — ver VAL-P0-001/002/003. También persisten rutas `@deprecated` (`InventoryService.registerAdjustment`, `inventory.facade.ts`) explícitamente bloqueadas por `resolverModoOperacion` cuando la valorización está activa.
- **Caminos que evitan el Kardex:** no se encontró ningún camino que descuente/incremente stock **mientras la valorización está activa** sin pasar por capas. Las rutas legacy solo operan en modo cuantitativo puro, y quedan bloqueadas (con error, no en silencio) al activar valorización.
- **Uso de mocks/almacenamiento temporal:** toda la persistencia de producción es `localStorage` (no hay backend); esto es una decisión arquitectónica de todo el producto, no un mock accidental — pero implica las limitaciones ya descritas en VAL-P1-002/006.

---

## I. Pruebas y comandos ejecutados

| Comando | Resultado | Observaciones |
|---|---|---|
| `git log --oneline -20` / `git branch -a` / `git diff main --stat` | OK | 535 archivos distintos de `main`, ~134k inserciones; confirma implementación real y extensa en esta rama |
| `find docs -iname "*kardex*" -o -iname "*valoriz*"` | OK | 8 documentos de diseño/auditoría previos localizados y cruzados |
| `cd apps/senciyo && npm run build` (`tsc -b && vite build`) | ✅ Exitoso | Sin errores TypeScript ni de bundling |
| `cd apps/senciyo && npx vitest run --reporter=dot src/pages/Private/features/gestion-inventario` | ✅ 36 archivos, 846/846 pruebas | Un `stderr` esperado (test que ejercita a propósito el camino de fallo de invalidación, no un fallo real) |
| `cd apps/senciyo && npx eslint src/pages/Private/features/gestion-inventario --max-warnings 0` | ✅ 0 errores/0 warnings | — |
| `npx vitest run --coverage` | ❌ No ejecutable | Falta `@vitest/coverage-v8` instalado; se usó conteo manual de archivos `.test.ts` como proxy (~35% con test compañero) |
| Grep dirigido (`supabase`, `precioCompra`, `0.18`/`18%`, `addMovimiento`, `registrarEntradaValorizada`, etc.) | OK | Usado para verificar/objetar cada afirmación de los 6 agentes antes de aceptarla |
| Lectura directa de `useComprobanteActions.tsx:1020-1240` | OK | Verificación manual dirigida que confirmó (contradiciendo una auditoría previa de hace ~1 semana) que la devolución física por Nota de Crédito SÍ revierte costo valorizado hoy |

---

## J. Deuda técnica y cobertura faltante

**Bloqueantes (deben resolverse antes de cualquier cierre):** VAL-P0-001, VAL-P0-002, VAL-P0-003.

**Importantes:** VAL-P1-001 a VAL-P1-009 (permisos granulares, enforcement en backend, ajuste sin bloqueo duro, concurrencia multi-pestaña sin `navigator.locks`, manejo de cuota, purga/archivado, tributación por línea, pruebas de UI/E2E, recálculo retroactivo general).

**Mejoras futuras:** VAL-P2-001 a VAL-P2-010 (defensa en profundidad en repositorio de capas, distinción fecha efectiva/registro, soporte EUR en NI, timing de snapshot tributario, comentario de código obsoleto, distinción visual costo propuesto/confirmado fuera del wizard, espejo visual de permisos, performance O(n), gaps menores de UI).

**Expresamente fuera de alcance de esta auditoría (no reportado como defecto):** utilidad bruta/margen/rentabilidad (no forma parte del encargo de valorización de inventario en sí); flete/seguro/gastos adicionales de compra (fase posterior, sin regla formal implementada que los altere hoy incorrectamente); recepción parcial de compras (explícitamente aceptado como no habilitado en el primer alcance — y verificado que el modelo no obliga a rediseño para habilitarla después).

---

## K. Plan de corrección

1. **Integridad del modelo y persistencia:** unificar los repositorios legacy de NI/NS/stock al mismo estándar de aislamiento tenantizado estricto y manejo de errores explícito ya usado por el motor nuevo (resuelve VAL-P0-001, VAL-P0-002, VAL-P0-003). Sin esto, cualquier trabajo posterior sigue expuesto a fuga/pérdida de datos.
2. **Motor de entradas y capas:** sin cambios bloqueantes — solo mejoras (VAL-P2-001 defensa en profundidad en repositorio de capas).
3. **Motor FIFO de salidas:** sin cambios bloqueantes.
4. **Reversas y recálculo:** cerrar VAL-P1-009 (verificación dedicada de recálculo retroactivo general) antes de certificar la sección 2.15 como cumplida; VAL-P2-002 (separar fecha efectiva/registro) es prerrequisito técnico razonable para lo anterior.
5. **Integraciones:** VAL-P1-007 (tributación por línea real o remover la promesa de UI), VAL-P2-003/004 (moneda EUR, timing de snapshot tributario) — no bloqueantes pero deben decidirse.
6. **Interfaz y permisos:** VAL-P1-001/002 (permisos granulares + decisión de arquitectura sobre backend), VAL-P1-003 (bloqueo duro en `AdjustmentModal`), VAL-P2-007/008/010 (UI menor).
7. **Pruebas:** VAL-P1-008 (UI/E2E), VAL-P1-004/005 (concurrencia multi-pestaña y manejo de cuota, ambos con test de regresión dedicado), VAL-P1-006 (definir y probar política de purga).

---

## L. Conclusión final

1. **¿La configuración de valorización funciona realmente?** Sí — `SeccionValorizacionInventario.tsx` está conectada de extremo a extremo a `valorizacionInicial.service.ts`, con doble gate (UI+servicio), sin duplicación verificada en 3 escenarios distintos de reintento/concurrencia.
2. **¿El stock inicial queda correctamente valorizado?** Sí, incluyendo multi-almacén con capas independientes, bloqueo de costos inválidos/NaN/negativos, y atomicidad vía diario+replay (no un `setItem` único, pero sí determinista y recuperable).
3. **¿Todas las entradas crean capas?** Sí, para Compras (automático y manual), ajustes positivos e importación — con el puente CC→NI totalmente conectado en runtime (contrario a lo que documentaba una auditoría de hace ~3 semanas, ya superada).
4. **¿Todas las salidas consumen FIFO?** Sí, unificado entre Factura/Boleta/POS, Nota de Venta y Nota de Salida — verificado con ejemplo numérico multi-capa pasando en tests reales. La devolución física por Nota de Crédito también revierte costo correctamente cuando la valorización está activa.
5. **¿Existen caminos que cambien stock sin Kardex?** No, mientras la valorización esté activa (las rutas legacy quedan bloqueadas con error). Sí existe un riesgo real y distinto: repositorios legacy de documentos (NI/NS) y de stock que pueden perder aislamiento multiempresa o persistencia silenciosamente — ver P0.
6. **¿Impuestos, moneda y unidades se calculan correctamente?** En general sí (snapshot histórico congelado, sin IGV hardcodeado, sin `Product.precioCompra` como fuente oficial), con dos brechas menores: "definir por línea" no diferencia realmente por línea, y NI limitada a PEN/USD pese a que Compras admite EUR.
7. **¿Las anulaciones y recálculos son confiables?** Las anulaciones sí, exhaustivamente probadas (reversa trazable, protegida contra doble anulación, idempotente). El recálculo retroactivo **general** (fuera de la ventana de valorización inicial) no pudo verificarse — queda explícitamente como pendiente, no como aprobado por inferencia.
8. **¿El sistema conserva trazabilidad histórica?** Sí en el motor nuevo (15/21 campos directos, el resto recuperable por join, por diseño normalizado). No garantizado en los repositorios legacy de documentos NI/NS, que pueden perder el documento en sí sin dejar rastro del fallo.
9. **¿Las pruebas son suficientes?** Para el motor de negocio puro, sí (846 tests, exhaustivos, con aserciones sobre valores reales, no solo llamadas a mocks). Para UI y end-to-end, no — cobertura cero.
10. **¿La valorización puede cerrarse?** No todavía. El núcleo de costeo está listo; los 3 hallazgos P0 (aislamiento multiempresa y persistencia silenciosa en repositorios legacy adyacentes) y los 9 P1 deben resolverse o aceptarse explícitamente como riesgo conocido por Producto antes de declarar el cierre.

---

**Ruta del archivo:** `docs/AUDITORIA_INTEGRAL_KARDEX_VALORIZADO_2026-08-04.md`
