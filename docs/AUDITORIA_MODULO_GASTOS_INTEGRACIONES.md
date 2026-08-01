# Auditoría del Módulo Gastos e Integraciones

Auditoría de solo lectura. No se modificó, refactorizó ni implementó código. Rama auditada: `Gastos`. Baseline verificado: `git status --short` limpio, `git diff --check` sin errores, TypeScript limpio, lint 0/0, builds SenciYo y Portal PM exitosos, 1245 pruebas en verde (ver §28 y resultados exactos en el pie de este documento).

---

## 1. Veredicto ejecutivo

- **¿Debe existir un módulo Gastos?** Sí. No existe hoy ningún lugar del sistema que reconozca un gasto operativo (alquiler, luz, honorarios, etc.) de forma independiente de una compra de mercadería. Compras/CxP/Pagos están diseñados y tipados específicamente para `ComprobanteCompra` (ver §13, evidencia de acoplamiento).
- **¿Qué tabs tendrá?** Dos en el primer alcance: **Gastos** y **Categorías**. "Recurrentes" **no** entra en el primer alcance (ver §10 y §6) — no existe infraestructura de tareas programadas en todo el repositorio (confirmado, ver §10).
- **¿Cuáles son gestionables?** Gastos (crear/editar/anular/pagar/adjuntar) y Categorías (crear/editar/desactivar). Ninguna otra vista requiere gestión propia.
- **¿Qué son resúmenes?** "Gastos del periodo", "Pendiente", "Pagado" y "Categoría principal" son tarjetas informativas dentro del tab Gastos — nunca tabs, nunca un dashboard aparte (mismo criterio ya aplicado en Cobranzas, único módulo con precedente real de tarjetas resumen, ver §5).
- **¿Qué módulos reutiliza?** Caja (`useCaja`/`agregarMovimiento`, patrón ya usado por Compras y Cobranzas), el mecanismo de aplicar/revertir pago de Cuentas por Pagar (funciones genéricas ya existentes), Proveedores (= Clientes con `type:'Proveedor'`, sin catálogo nuevo), medios de pago (`paymentMeans.ts`), `ColumnsManager`, `exportDatasetToExcel`, Reports Hub/AutoExport, `currencyManager`, adjuntos (patrón de `AdjuntosCompra.tsx`), series (catálogo de Configuración → Series, mismo mecanismo ad-hoc que ya usan RC/OC/Pagos).
- **¿Qué no debe duplicarse?** El motor tributario de Compras, el exportador Excel, ColumnsManager, el catálogo de Clientes/Proveedores, el mecanismo de aplicar pagos a una CxP, y el servicio de Rentabilidad de Ventas (`consultaRentabilidadVentas.service.ts` no se toca — Gastos alimenta una Utilidad Operativa nueva y separada, ver §18).
- **¿Existe algún bloqueante?** Uno de proceso, no de arquitectura: el sistema de permisos granular está definido (`catalogoPermisos.ts`, roles) pero **no tiene efecto real en runtime hoy** porque `SessionInitializer.tsx` asigna `permissions: ['*']` a cualquier usuario autenticado, bypaseando el guard de rutas (`PermisoGuard.tsx:26`). Esto es un hallazgo preexistente, no introducido por esta auditoría ni causado por Gastos — se documenta en §27 como hallazgo, no se corrige aquí.

---

## 2. Alcance revisado

Se auditó, con evidencia directa (lectura de código fuente, no solo tests), lo siguiente:
- Modelos y servicios de `CuentaPorPagar` y `PagoCompra` (`apps/senciyo/src/pages/Private/features/compras/modelos/`, `.../servicios/`).
- Módulo Caja completo (`apps/senciyo/src/pages/Private/features/control-caja/`).
- Fuente de Proveedores (`gestion-clientes/`), selector `BuscadorProveedor.tsx`.
- Series y numeración (Compras, Pagos, catálogo de Series en Configuración).
- Permisos (`catalogoPermisos.ts`, `PermisoGuard.tsx`, `SessionInitializer.tsx`).
- Medios de pago, bancos/cuentas (`shared/payments/`, `configuracion-sistema/modelos/BankAccount.ts`).
- Motor tributario de Compras (`shared/catalogos-sunat/resolucionTributaria.ts`), tipos de documento, detracción/percepción/retención.
- Adjuntos (`AdjuntosCompra.tsx`, `AttachmentsSection.tsx`, `fileSerialization.ts`).
- Patrones UX de Compras, Cobranzas, Caja, Inventario, Clientes, Documentos Comerciales.
- Infraestructura de automatización/tareas programadas en todo el repositorio (incluyendo `functions/api/` y `.github/workflows/`).
- Rentabilidad de Ventas (`consultaRentabilidadVentas.service.ts`, `IndicadoresPage.tsx`, `reportDefinitions.ts`) — implementación propia, revisada por conocimiento directo del trabajo ya construido en esta misma rama, sin modificarla.
- Deuda técnica (hardcodes, tenancy, `eslint-disable`, `any`, TODO) en Compras/Caja/Clientes.
- Inventario de pruebas existentes.

No se revisó a fondo: `configuracion-sistema` en su totalidad (solo lo relevante a monedas/series/permisos/impuestos), Documentos Comerciales en detalle interno más allá de su patrón UX, ni el backend de `functions/api/` más allá de confirmar que no ejecuta lógica de negocio programada.

---

## 3. Responsabilidad funcional de Gastos

Gastos debe:
1. Registrar el reconocimiento de un gasto operativo (con o sin documento del proveedor) en la fecha en que se incurre, **independiente de cuándo se paga**.
2. Clasificarlo por categoría (§9) y opcionalmente asociarlo a un proveedor/beneficiario (§11) y a un establecimiento.
3. Generar una obligación de pago (Cuenta por Pagar) cuando la condición es "crédito", reutilizando la mecánica ya genérica de aplicar/revertir pagos (§13).
4. Permitir registrar su pago (total o parcial) a través del **mismo** formulario central de pagos que hoy usa Compras, nunca un segundo formulario/servicio/historial (§14).
5. Afectar Caja únicamente cuando el pago usa un medio de caja (efectivo), replicando el patrón exacto ya usado por Compras y Cobranzas (§12).
6. Permitir anulación con las mismas reglas de bloqueo que ya existen para Comprobante de Compra (no se puede anular con pagos activos sin anular antes el pago) (§7).
7. Alimentar un nuevo indicador de Utilidad Operativa en Indicadores, sin tocar el servicio de Rentabilidad de Ventas ya implementado (§18).
8. Exponer un reporte único ("Gastos operativos") en el Reports Hub, reutilizando `ColumnsManager`/`exportDatasetToExcel`/AutoExport (§19).

Gastos **no** debe: recalcular impuestos con un motor propio, duplicar el catálogo de proveedores, duplicar Caja, duplicar el exportador Excel, ni convertir cada gasto en un `ComprobanteCompra`.

---

## 4. Diferencia entre gasto, pago y egreso

**Regla validada contra el precedente ya construido en Compras** (evidencia: `ContextoCompras.tsx` separa `registrarComprobanteCompra`/anulación del comprobante — el reconocimiento — de `registrarPagoCompra`/`anularPagoCompra` — el evento de caja; líneas 2312 y 2458 respectivamente, agente CxP/Pagos). Gastos debe replicar exactamente esta separación de tres capas:

| Capa | Qué es | Cuándo nace | Ejemplo |
|---|---|---|---|
| **Gasto (reconocimiento)** | El hecho económico: "se incurrió en un gasto" | Al registrar el gasto, con su propia fecha | Factura de internet de junio |
| **Cuenta por Pagar (obligación)** | Solo si `condicionPago = credito` | Al registrar el gasto, derivada 1:1 | Saldo pendiente de esa factura |
| **Pago (evento de caja/banco)** | El movimiento de dinero que cancela la obligación | Cuando el usuario paga, en su propia fecha | Pago de esa factura en julio |

**Ejemplo obligatorio resuelto:** registrar la factura de internet crea el Gasto (y su CxP si es crédito) — el gasto ya quedó reconocido en junio. Pagarla en julio **no crea un segundo gasto**: solo aplica un Pago contra la CxP existente (misma mecánica que `aplicarPagoACuentaPorPagar`, genérica y ya probada con 17 tests, agente CxP/Pagos). El gasto reconocido permanece en junio; el pago se refleja en julio. Esto es exactamente cómo Compras ya evita el doble reconocimiento entre `ComprobanteCompra` y `PagoCompra` — Gastos no necesita inventar una regla nueva, solo replicar la misma.

**Separación explícita de lo que NO es un gasto** (y por qué, con evidencia):
- **Compra de mercadería**: ya tiene su propio pipeline completo (`ComprobanteCompra` → `CuentaPorPagar` → Kardex valorizado vía `CapaCostoInventario`). Un gasto operativo nunca debe generar una entrada de inventario.
- **Pago de una cuenta por pagar**: es la capa 3 de la tabla de arriba, no el gasto en sí — un Pago nunca "vuelve a reconocer" el gasto (ver ejemplo).
- **Transferencia entre cajas**: `Movimiento.tipo` ya incluye `'Transferencia'` como categoría distinta de `'Egreso'` en el propio modelo de Caja (`control-caja/models/Caja.ts`, agente Caja) — un gasto siempre es `'Egreso'`, nunca `'Transferencia'`.
- **Retiro del propietario / préstamo recibido / pago de capital de un préstamo**: no existe hoy ningún modelo de patrimonio/pasivo financiero en el repositorio (no verificable con la evidencia actual que exista un concepto de "capital"/"deuda financiera" fuera de CxP comercial). Gastos **no debe** absorber estos conceptos como una categoría más — quedan fuera de alcance hasta que exista un módulo de tesorería/patrimonio.
- **Compra de un activo fijo**: conceptualmente no es un gasto del periodo (se deprecia) — el propio §18 exige no llamar "utilidad neta" al resultado mientras no exista depreciación; por consistencia, Gastos no debe capturar activos fijos como gasto corriente en esta fase.
- **Consumo valorizado de inventario**: ya tiene su propio motor (`consumirCapasFIFO`, `ConsumoCapaCostoInventario`) — el punto de integración futuro es Suministros (§17), no una captura manual duplicada.
- **Devolución de dinero / depósito bancario**: son movimientos de caja/banco sin contrapartida de gasto — si Gastos necesitara registrarlos, usaría `Movimiento.tipo: 'Ingreso'` directamente (mismo patrón que la reversión de un pago anulado, ya visto en `anularPagoCompra`), nunca como un "gasto negativo".

---

## 5. Estructura UX recomendada

**Ningún módulo actual tiene un patrón único y consolidado** (evidencia agente UX): 3 mecanismos de tabs distintos, 4-6 modales de confirmación distintos, 2 patrones de detalle (Drawer vs. modal), 2 componentes `PageHeader` distintos. Se recomienda una combinación deliberada, no la copia de un solo módulo:

| Elemento | Recomendación | Evidencia/justificación |
|---|---|---|
| Encabezado | `PageHeader` de `@/contasis/layout/PageHeader/PageHeader.tsx` | Usado por Cobranzas, Caja y Clientes (3 de 6 módulos revisados) — mayoría, y Cobranzas es el par funcional más cercano (dinero por cobrar/pagar) |
| Tabs | Query param (`?tab=gastos\|categorias`) vía `useSearchParams` | Mismo mecanismo que Caja (`control-caja/pages/Home.tsx`) y el mismo principio ya corregido en Indicadores esta sesión (historial navegable, Atrás/Adelante funcionan) — evita repetir el problema de estado-local-no-bookmarkeable de Compras/Cobranzas |
| Tarjetas resumen | Sí, 4 tarjetas informativas | Precedente directo: `gestion-cobranzas/components/ResumenCards.tsx` (4 tarjetas: pendientes, saldo pendiente, saldo vencido, cobrado) — mismo patrón visual, adaptado a Gastos |
| Filtros | Popover "Filtros" + Periodo + Establecimiento + Buscador | Patrón ya probado en `TablaComprobantesCompra.tsx` y en Rentabilidad de Ventas |
| Tabla | `ColumnsManager` + paginación | Estándar ya usado en 5 tablas de Compras y en Rentabilidad de Ventas |
| Detalle | **Drawer** (`@/shared/ui/drawer/Drawer`) | Compras (el par funcional más cercano: documento de proveedor + pago) usa Drawer, no modal |
| Confirmación de anulación | `useFeedback().openConfirm` | Es el ÚNICO mecanismo genuinamente compartido (`shared/feedback/`), aunque hoy solo lo usan 4 archivos de Inventario — Gastos debe ser el segundo consumidor real en vez de crear un 5º/6º modal de confirmación bespoke |
| Adjuntos | Patrón de `AdjuntosCompra.tsx` (base64 dataURL, no un componente nuevo desde cero) | Ver §22 |
| Exportar | `exportDatasetToExcel` + botón único | Mismo estándar que Rentabilidad de Ventas y Compras |

**No crear un dashboard dentro del módulo** — las 4 tarjetas son el único elemento "de resumen"; nunca gráficos dentro de Gastos (esos, si existieran, viven en Indicadores → Rentabilidad operativa, §18).

Vista conceptual (validada contra la propuesta del enunciado, con ajustes):

```
Gastos
[ Gastos ]  [ Categorías ]

[ Gastos del periodo ]  [ Pendiente ]  [ Pagado ]  [ Categoría principal ]

[ Periodo ] [ Establecimiento ]                    [ Filtros ]
[ Buscar................................ ]  [ Columnas ] [ Exportar ] [ Nuevo gasto ]

| Fecha | Descripción | Categoría | Proveedor | Total | Estado | Medio de pago | Ver |

« Anterior   Página 1 de N   Siguiente »
```

Columnas por defecto: Fecha, Descripción, Categoría, Proveedor/Beneficiario, Total, Estado. Opcionales (apagadas por defecto, mismo criterio que Rentabilidad de Ventas): Moneda original, Tipo de cambio, Establecimiento, Tipo de documento, Serie/Número documento, Condición de pago, Medio de pago, Cuenta por Pagar relacionada, Adjuntos (cantidad). Fijas: Descripción y "Ver" (nunca configurables, mismo criterio que Documento/Producto/Ver en Rentabilidad de Ventas).

**Móvil:** toolbar reordenado en filas (`flex-wrap`, mismo patrón ya usado en Rentabilidad de Ventas y Compras), tabla con `overflow-x-auto`, tarjetas resumen en `grid-cols-2` en móvil / `grid-cols-4` en escritorio (mismo patrón que las tarjetas de KpiCards en Indicadores).

---

## 6. Tabs definitivos

**Recomendación única: dos tabs — Gastos y Categorías.** "Recurrentes" queda explícitamente fuera del primer alcance (justificación completa en §10 y §15 del enunciado).

- **Tab Gastos**: listado, crear, ver/editar (solo en estado `borrador`/`pendiente`, nunca si ya tiene pagos), anular, registrar pago, ver pagos aplicados, adjuntar sustento, filtrar, columnas, exportar. Responsabilidad completa según §3.
- **Tab Categorías**: crear, editar, desactivar (nunca eliminar si tiene gastos asociados — mismo principio que ya aplica `motivoBloqueoAnulacionCC` para no anular un comprobante con pagos activos). Semilla editable por empresa (ver §9).
- **Estados (Pendiente/Pagado/Parcial/Anulado): son filtros dentro del tab Gastos, nunca tabs.** Evidencia directa de que este es el patrón ya establecido: `CuentaPorPagar.estadoPago` (`pendiente|parcial|pagada|anulada`) se consume como columna+filtro en `TablaCuentasPorPagar.tsx`, nunca como tabs separados dentro de Compras.

---

## 7. Ciclo de vida y estados

Estados mínimos necesarios (ninguno "por colocar"):

`borrador → registrado → (pendiente | pagado) → [parcial] → pagado` con salida a `anulado` desde cualquier estado previo a `pagado` completo.

| Momento | Qué ocurre | Evidencia/precedente |
|---|---|---|
| Nace el gasto | Al guardar el formulario (estado `registrado`) | Mismo momento que `registrarComprobanteCompra` reconoce la compra |
| Afecta Rentabilidad (Utilidad Operativa) | Desde que está `registrado` (no anulado), **según `fechaReconocimiento`, nunca según fecha de pago** | Instrucción explícita del enunciado (§18), consistente con cómo Rentabilidad de Ventas ya reconoce la venta en su propia fecha independientemente de cuándo se cobra |
| Afecta Caja | Solo cuando se registra un Pago con medio de caja | Mismo patrón que `registrarPagoCompra` → `registrarMovimientosCajaPorMedios` |
| Genera Cuenta por Pagar | Si `condicionPago = credito`, al registrar el gasto | Mismo momento que `generarCuentaPorPagar(cc, id)` para Compras |
| Puede editarse | Mientras esté en `borrador`/`registrado` sin pagos aplicados | Análogo a que un CC no puede anularse con pagos activos (`motivoBloqueoAnulacionCC`) — por extensión, tampoco debería editarse con pagos aplicados |
| Queda inmutable | Desde que tiene al menos un pago aplicado (los campos económicos no cambian; solo estado/pagos) | Mismo principio de integridad ya aplicado a `ComprobanteCompra` |
| Se anula | Vía `motivoBloqueoAnulacionCC`-equivalente: bloqueado si `estadoPago !== 'pendiente'` | Debe reutilizar `motivoBloqueoAnulacionCC`/`anularCuentaPorPagarPorComprobante` generalizados (ver §13), no reinventar la regla |
| Tiene pagos y se intenta anular | Bloqueado — primero debe anularse cada pago | Mismo bloqueo ya implementado para CC (`reglasCompras.ts`) |
| Se revierte un pago | Vía `revertirPagoDeCuentaPorPagar` (ya genérica) + movimiento de caja compensatorio (`Ingreso`) | Mismo patrón que `anularPagoCompra` |
| Se evita duplicar reconocimiento | El Pago nunca crea un Gasto nuevo; solo aplica contra la CxP ya existente | Ver ejemplo obligatorio en §4 |

**8 ejemplos obligatorios — comportamiento esperado:**
1. **Pagado inmediatamente en efectivo**: Gasto `registrado` con `condicionPago=contado` → no genera CxP → se registra un Pago inmediato con medio Efectivo → `agregarMovimiento(tipo:'Egreso')` (requiere caja abierta) → estado final `pagado`.
2. **Al crédito**: Gasto `registrado`, `condicionPago=credito` → genera CxP `pendiente` → no afecta Caja hasta que se pague.
3. **Pago parcial**: Pago aplicado por un monto menor al total → `aplicarPagoACuentaPorPagar` recalcula `estadoPago='parcial'` (misma función genérica, ya probada con casos de pago parcial en `servicioCuentaPorPagar.test.ts`).
4. **Pago total posterior**: nuevo Pago que cubre el saldo restante → `estadoPago='pagada'`.
5. **Gasto anulado antes de pagar**: bloqueo verificado con `estadoPago==='pendiente'` (sin pagos) → anulación permitida directamente.
6. **Gasto anulado con pagos existentes**: bloqueado — debe anularse cada Pago primero (mismo patrón `motivoBloqueoAnulacionCC`).
7. **Pago anulado**: `anularPagoCompra`-equivalente → revierte aplicación en la CxP → si usó caja, exige caja abierta para el ingreso compensatorio, si no, bloquea la anulación (mismo comportamiento ya confirmado en `ContextoCompras.tsx:2470-2474`).
8. **Recurrente convertido en real**: fuera de alcance en fase 1 (§10) — cuando exista, la conversión sería una acción manual explícita ("Generar gasto desde plantilla"), nunca automática.

---

## 8. Formulario de gasto

| Campo | Obligatorio/Opcional/Condicional | Fuente a auditar/reutilizar |
|---|---|---|
| Fecha de emisión | Obligatorio | Input de fecha simple |
| Fecha de reconocimiento | Obligatorio (puede igualar a emisión por defecto) | Es el campo que alimenta Rentabilidad (§7, §18) |
| Fecha de vencimiento | Condicional (solo si `condicionPago=credito`) | Mismo patrón que `CuentaPorPagar.fechaVencimiento?` |
| Categoría | Obligatorio | Nuevo catálogo `CategoriaGasto` (§9) |
| Proveedor / Beneficiario | Opcional (ver §11) | `BuscadorProveedor.tsx` adaptado |
| Tipo de documento | Opcional | Reutilizar `TIPOS_DOCUMENTO_PROVEEDOR` (¡no duplicar el array!) — hoy es una lista fija en `compras/constantes/tiposDocumentoProveedor.ts`, no configurable; Gastos debe importarla, no copiarla |
| Serie / Número (del proveedor) | Opcional | Campos de texto libre, igual que `ComprobanteCompra.serieProveedor/numeroProveedor` |
| Descripción | Obligatorio | — |
| Subtotal / Impuesto / Total | Obligatorio (impuesto puede ser 0) | Nunca hardcodear IGV — reutilizar `resolverTratamientoTributarioProducto`/`resolverRecuperabilidadImpuesto` SOLO si el gasto tiene línea de producto/servicio gravado; para gastos simples basta con capturar el total y un flag recuperable/no-recuperable (política, no monto — ver §16, esa granularidad de monto tampoco existe hoy en Compras) |
| Moneda | Obligatorio | `currencyManager` (nunca hardcodear PEN — ver hallazgo de que Caja sí lo hace, §16/§27) |
| Tipo de cambio | Condicional (si moneda ≠ base) | Mismo patrón de TC histórico ya usado por Rentabilidad de Ventas (nunca el TC vigente) |
| Establecimiento | Obligatorio (o "General" si aplica a toda la empresa) | Mismo selector ya usado en Reports Hub/Rentabilidad |
| Centro de costo | **No incluir** | No existe ningún concepto real de centro de costo en el repositorio (no verificable con la evidencia actual) |
| Condición de pago | Obligatorio (`contado`/`credito`) | Mismo enum que `CuentaPorPagar.formaPago` |
| Medio de pago | Condicional (solo si se paga en el mismo acto) | `getConfiguredPaymentMeans()` (`shared/payments/paymentMeans.ts`) |
| Caja | Condicional (si medio de pago es efectivo) | `useCaja()` |
| Banco y cuenta | Condicional (si medio de pago es bancario) | `BankAccount` (solo referencial, ver §15) |
| Adjuntos | Opcional | Patrón de `AdjuntosCompra.tsx` (§22) |
| Observaciones | Opcional | — |

**No hardcodear** (confirmado como riesgo real, no hipotético — ver §27): IGV, PEN, S/, tipos de documento como lista cerrada sin fuente única, medios de pago como campos nombrados (patrón que Caja SÍ comete, ver §15), bancos, categorías, series, establecimientos.

---

## 9. Categorías

Estructura mínima: `id`, `empresaId`, `nombre`, `descripcion?`, `estado` (activa/inactiva), `orden`. **Categoría padre: no incluir** — no hay evidencia de una necesidad real de jerarquía en ningún catálogo similar del repositorio (Categorías de producto tampoco tienen padre, según `Category` en `configuracion-sistema/contexto/ContextoConfiguracion.tsx` revisado en trabajo previo de esta rama).

Categorías iniciales (Alquileres, Servicios básicos, Publicidad, Movilidad, Comisiones, Mantenimiento, Honorarios, Limpieza, Suscripciones, Otros) deben ser **semilla editable por empresa**, no catálogo fijo — mismo criterio que ya usa `Category` (configurable, con `productCount` que impide huérfanos) en Configuración → Categorías, evitando repetir el error de `TIPOS_DOCUMENTO_PROVEEDOR` (lista fija sin mecanismo de extensión, marcado como hallazgo en §27).

Evitar eliminar una categoría con gastos asociados: reutilizar el mismo principio que ya usa `Category.productCount` (bloquear/advertir si `productCount > 0`) — para Gastos, un conteo de gastos asociados por categoría antes de permitir eliminar (no solo desactivar).

Orden y color: **no incluir en fase 1** — no aportan valor funcional comprobado (el enunciado mismo los marca como "únicamente si aportan valor real"; no hay evidencia de que Categorías de producto los usen de forma que justifique replicarlo aquí).

---

## 10. Gastos recurrentes

**Recomendación: NO incluir en el primer alcance.** Evidencia decisiva (agente UX/automatización): no existe en todo `apps/senciyo/src` ningún mecanismo de tareas programadas, cron, cola de trabajo, Service Worker o backend con lógica de negocio ejecutable sin que el usuario tenga la app abierta. El único cron real del repositorio es un heartbeat de infraestructura en GitHub Actions (`.github/workflows/supabase-heartbeat.yml`) que solo hace un `curl` a Supabase — no ejecuta lógica de dominio. Las funciones de Cloudflare Pages (`functions/api/`) son handlers HTTP por petición, sin `onSchedule`. Incluso `NotificacionIndicadorModal`/`useNotificacionesIndicador` (el precedente más cercano a "algo programado" en Indicadores) solo hace CRUD de configuración contra una API externa — el motor real de disparo, si existe, vive fuera de este repositorio.

**Comparación de las 4 opciones del enunciado:**
- A. Generación automática: **descartada** — no hay infraestructura real que la ejecute (confirmado, no supuesto).
- B. Generación bajo confirmación: viable, pero requiere que ALGO dispare la propuesta (un cron o un chequeo al abrir la app) — parcialmente viable solo como "chequeo al montar la página" (igual que `useNotificacionesIndicador` hace `autoLoad` al montar), nunca en segundo plano real.
- C. Recordatorio para crear el gasto: mismo problema que B, requiere un disparador.
- D. Plantilla manual reutilizable: **la única 100% realista con la arquitectura actual** (frontend + localStorage, sin backend de negocio).

**Recomendación única: Opción D, con un matiz de B** — una plantilla de gasto reutilizable ("Duplicar gasto" o "Crear desde plantilla"), con generación **siempre bajo confirmación manual explícita del usuario al abrir el módulo** (nunca automática ni silenciosa), implementada como una simple comprobación de "próxima fecha vencida" evaluada solo cuando el usuario visita la página — no como tab separado en fase 1, sino como una acción disponible desde el tab Gastos ("Nuevo gasto desde plantilla"). Cuando el negocio lo requiera, "Recurrentes" puede promoverse a tab propio en una fase 2, reutilizando el mismo modelo de plantilla ya construido.

Campos de la plantilla (para cuando se implemente, no ahora): periodicidad, próxima fecha, fecha final, importe (fijo o estimado), moneda, proveedor, categoría, establecimiento, estado (activo/pausado/finalizado), historial de gastos generados (referencia inversa `gastoRecurrenteId` en cada Gasto generado), y edición futura que nunca reescribe periodos ya generados (mismo principio de inmutabilidad histórica ya usado en NC de Rentabilidad de Ventas: "nunca reescribe el periodo de la venta original").

---

## 11. Integración con proveedores

**No crear otro catálogo de proveedores.** Confirmado: "Proveedor" no es un modelo separado — es un `Cliente` con `type: 'Proveedor' | 'Cliente-Proveedor'` (`gestion-clientes/models/cliente.types.ts:18,66-130`). El modelo `Cliente` ya incluye `formaPago` y `monedaPreferida` (líneas 185-191), reutilizables directamente por el formulario de gasto para prellenar condición de pago/moneda.

Gastos debe reutilizar tal cual:
- **Selector**: `BuscadorProveedor.tsx` (`compras/componentes/BuscadorProveedor.tsx`), ya usado en 3 formularios de Compras, filtra por `type==='Proveedor'||'Cliente-Proveedor'` y no tiene estado propio (usa `useClientes`).
- **Creación rápida**: hoy es únicamente vía consulta RUC/DNI externa (`persistirProveedorSiEsNuevo`, `servicioProveedorCompras.ts:17-37`) — no existe un modal manual de "crear proveedor". Gastos debe ofrecer la misma vía, sin construir un formulario de alta paralelo.

**Beneficiario vs. Proveedor**: deben ser la **misma relación funcional**, no un campo distinto. `DocumentType` ya incluye `'SIN_DOCUMENTO'` (usado hoy para "Cliente Varios" en Ventas) — Gastos puede usar el mismo catálogo de Clientes/Proveedores para un beneficiario sin RUC, en vez de inventar un segundo campo de texto libre "beneficiario". Hallazgo importante: **hoy `BuscadorProveedor.tsx` no expone ningún atajo para seleccionar/crear un proveedor `SIN_DOCUMENTO`** (su flujo exige 8 u 11 dígitos válidos) — si Gastos necesita "gasto sin proveedor formal" (ej. propina, taxi sin boleta), **debe generalizarse el selector** para permitir un modo "sin documento" (una adaptación acotada, no un catálogo nuevo).

**Gasto sin proveedor**: debe permitirse dejando `proveedorId` vacío y usando solo el campo de texto libre `descripcion`/`beneficiario` — no debe exigirse proveedor en el modelo.

---

## 12. Integración con Caja

**Patrón exacto a replicar** (evidencia: `ContextoCompras.tsx:2283-2554`, mismo patrón en `CobranzasContext.tsx`):

1. Un pago con medio de caja llama a `useCaja().agregarMovimiento({ tipo:'Egreso', concepto, medioPago:'Efectivo', paymentMeanCode, paymentMeanLabel, monto, referencia, usuarioId, usuarioNombre })` **antes** de comprometer el pago (mismo orden ya documentado en el código: "si falla, no queda un pago fantasma sin su contraparte en caja").
2. **Requiere caja abierta**: validación manual `if (estadoCaja !== 'abierta') throw new Error(...)` **antes** de intentar el movimiento — no existe un guard genérico reutilizable (`requireCajaAbierta()`); cada consumidor repite el chequeo. Gastos debe repetir el mismo chequeo explícito, no inventar un guard nuevo ni asumir que Caja lo bloquea por sí sola (Caja solo muestra un toast y hace `return` silencioso si `agregarMovimiento` se llama sin caja abierta).
3. **Caja usada**: la resuelta por `resolveActiveCajaForEstablecimiento` (empresa + establecimiento del gasto), no por usuario.
4. **Referencia**: `Movimiento.referencia` es texto libre (no hay FK tipado a documento origen) — Gastos debe pasar un identificador legible (ej. número interno del gasto) igual que Compras pasa el número de pago.
5. **Anulación del gasto/pago**: nunca se anula/borra el `Movimiento` original — se registra un **nuevo** movimiento `tipo:'Ingreso'` compensatorio, exactamente como `anularPagoCompra` hace hoy. Si la caja está cerrada al momento de anular, la anulación completa se bloquea (mismo comportamiento confirmado en `ContextoCompras.tsx:2470-2474`).
6. **Cierre**: un `CierreCaja` es un registro histórico inmutable; un movimiento compensatorio posterior simplemente cae en la sesión (`aperturaId`) que esté abierta en ese momento — no hay recálculo retroactivo de un cierre ya hecho.
7. **Pago que excede el efectivo disponible**: no existe ninguna validación de "saldo suficiente" en el código de Caja ni de Compras (no verificable con la evidencia actual que exista un bloqueo por sobregiro) — Gastos heredaría esta misma ausencia de control si replica el patrón tal cual; se documenta como brecha ya existente, no exclusiva de Gastos.

**Riesgo heredado (documentado, no corregido aquí):** `agregarMovimiento` **no es idempotente** (`id: mov-${Date.now()}`) — un doble clic o reintento en el formulario de pago de Gastos podría duplicar el egreso, exactamente como ya podría ocurrir hoy en Compras/Cobranzas. No hay ningún guard de Caja que lo impida; el único mecanismo mitigante visto es un flag de UI (`enviando`/`setEnviando(true)`) responsabilidad del formulario consumidor, no de Caja.

**No crear otra Caja dentro de Gastos.** **No registrar el gasto como un movimiento manual sin trazabilidad** — el movimiento de caja debe nacer siempre del flujo de Pago, nunca de un formulario libre de "registrar egreso" dentro de Gastos.

---

## 13. Integración con Cuentas por Pagar

Auditado en profundidad (`CuentaPorPagar.ts`, `servicioCuentaPorPagar.ts`, `PagoCompra.ts`, `ContextoCompras.tsx`). Conclusión con evidencia exacta:

**A. Reutilizable directamente, sin tocar nada:**
- `aplicarPagoACuentaPorPagar(cxp, montoAplicado, pagoId, fechaPago, usuario?, asignaciones?)` (`servicioCuentaPorPagar.ts:185`)
- `revertirPagoDeCuentaPorPagar(...)` (línea 224)
- `recalcularEstadoCuentaPorPagar(total, totalPagado)` (línea 175)
- `calcularEstadoVencimiento`, `calcularDiasVencidos`, `calcularDiasCredito`

Estas funciones operan solo sobre montos, ids de cuota y el objeto `CuentaPorPagar` ya construido — no importan ni asumen `ComprobanteCompra` en ningún punto de su firma o cuerpo.

**B. Acoplado específicamente a Comprobante de Compra (no reutilizable sin cambios):**
- `CuentaPorPagar.comprobanteCompraId: string` y `tipoComprobanteOrigen: string` son campos **obligatorios**, no genéricos (`CuentaPorPagar.ts:37,39`).
- `generarCuentaPorPagar(cc: ComprobanteCompra, id: string)` está tipada directamente a `ComprobanteCompra` (`servicioCuentaPorPagar.ts:18`) — es la única función constructora existente.
- `anularCuentaPorPagarPorComprobante` es la única vía de anulación de CxP, invocada exclusivamente desde `anularComprobanteCompra` — no existe una ruta de anulación de CxP independiente de un CC.
- `AplicacionPagoCompra.comprobanteCompraId: string` (requerido) y `PagoCompra.comprobantesCompraAplicados: string[]` — el nombre del campo mismo asume Compras.
- `PanelDetalleCuentaPorPagar.tsx` exige prop `comprobantes: ComprobanteCompra[]` (acoplamiento también en UI).

**C. Recomendación: generalizar mediante un origen documental, sin duplicar CxP.**

Se valida la opción C del enunciado. Añadir a `CuentaPorPagar` (modificación acotada, no reescritura):
```
documentoOrigenId: string       // reemplaza semánticamente a comprobanteCompraId
tipoOrigen: 'compra' | 'gasto'  // reemplaza/generaliza tipoComprobanteOrigen
```
manteniendo `comprobanteCompraId`/`tipoComprobanteOrigen` como alias derivados solo cuando `tipoOrigen==='compra'` (evita romper el código existente de Compras — no se toca ningún consumidor actual). Se crearía una función paralela `generarCuentaPorPagarDesdeGasto(gasto, id)` (nueva, no modifica `generarCuentaPorPagar`) y una función paralela `anularCuentaPorPagarPorGasto` (misma lógica que `anularCuentaPorPagarPorComprobante`, pero disparada desde la anulación del Gasto). Esto es evaluación de diseño, **no implementación** — queda para la etapa de construcción.

**D. No forzar Gastos dentro de Compras.** Gastos debe vivir como módulo propio que **consume** las funciones genéricas de (A) y **extiende** el modelo de CxP según (C) — nunca debe registrar un gasto como si fuera un `ComprobanteCompra` disfrazado solo para heredar código gratis.

---

## 14. Integración con Pagos

**Recomendación: un único formulario central de pago, generalizado.** Evaluadas las 4 opciones del enunciado — la correcta es la explícita: "Gastos ofrece la acción 'Registrar pago', abre/reutiliza el formulario central, el pago queda visible en el historial general, la fuente conserva que nació desde un gasto."

Evidencia de por qué es viable con una generalización acotada (no una reescritura):
- `FormularioPagoCompra.tsx` + `useFormularioPagoCompra.ts` ya separan claramente: selección de documentos a pagar (`BuscadorDocumentoOrigenPago.tsx` — **este componente en particular ya es genérico, opera solo sobre `CuentaPorPagar[]`, sin importar `ComprobanteCompra`**), edición de medios de pago (`EditorMediosPagoCompra.tsx`, ya genérico sobre `MedioPagoCompra[]`), validación (`validarAplicacionesPagoCompra`, ya genérica).
- El acoplamiento real está en el **modelo** `PagoCompra`/`AplicacionPagoCompra.comprobanteCompraId` (nombre y campo), no en la UI de selección/edición.

**Recomendación concreta**: generalizar `PagoCompra` → `Pago` (o mantener el nombre y solo generalizar `AplicacionPagoCompra.comprobanteCompraId` → `documentoOrigenId` + `tipoOrigen`, análogo a §13-C), de forma que UN solo pago pueda aplicar contra CxP de origen `compra` o `gasto` indistintamente, en el MISMO historial, con la MISMA numeración de series (`PG01-...`, ver §21), evitando exactamente lo que el enunciado prohíbe: dos registros de pago, dos numeraciones, dos servicios, dos historiales, dos formularios divergentes.

**Impacto en Caja/banco/transferencias/Yape-Plin/depósito/parciales/múltiples/moneda extranjera/anulaciones**: ninguno adicional — todo ese comportamiento ya vive en `EditorMediosPagoCompra`/`servicioPagoCompra.ts` de forma genérica (medios de pago como array dinámico, no cerrado) y se hereda sin cambios al generalizar solo el campo de origen documental.

---

## 15. Bancos y medios de pago

**Catálogo de medios de pago**: existe y es real — `PAYMENT_MEANS_CATALOG` (Catálogo 59 SUNAT, `shared/payments/paymentMeans.ts:12-35`), configurable por empresa vía `PaymentMeansPreferences` (localStorage tenantizado). **Reutilizar tal cual, nunca duplicar.**

**Qué afecta Caja de verdad**: solo códigos `008`/`009` (Efectivo) — `isCash: true` en el catálogo, verificado por `esMedioDeCaja()` (`servicioPagoCompra.ts:25-27`), único punto de verdad.

**Bancos/cuentas — limitación real que debe documentarse, no ocultarse**: `BankAccount` (`configuracion-sistema/modelos/BankAccount.ts:5-19`) es **puramente referencial** — no tiene ningún campo de saldo. No existe libro bancario, movimiento bancario ni conciliación en ningún punto del repositorio (confirmado por búsqueda negativa). **Un pago de gasto por transferencia/depósito quedará registrado como dato (banco, cuenta, número de operación) pero no actualizará ningún saldo bancario real, porque el sistema no lo controla hoy.** Esto no debe presentarse al usuario como "saldo actualizado" — es solo un registro de referencia.

**Selector reutilizable**: `EditorMediosPagoCompra.tsx` ya filtra cuentas bancarias por moneda y exige referencia cuando corresponde — reutilizable directamente por el formulario de pago generalizado (§14).

---

## 16. Impuestos y documentos sustentatorios

**No duplicar el motor tributario de Compras.** `resolverTratamientoTributarioProducto()`/`resolverRecuperabilidadImpuesto()` (`shared/catalogos-sunat/resolucionTributaria.ts:111-171`) ya resuelven gravado/exonerado/inafecto y recuperable/no-recuperable/según-afectación. Reutilizar **solo si** el gasto tiene una línea de producto/servicio con impuesto estructurado — para un gasto simple (ej. recibo de luz), basta con capturar `subtotal`/`impuesto`/`total` y un flag de política (recuperable/no recuperable), sin invocar el motor completo.

**Limitación real a documentar**: el concepto recuperable/no-recuperable existe como **política** (`TratamientoImpuestoCompra`), pero el **monto** `importeRecuperable`/`importeNoRecuperable` **no está calculado en ningún punto del código actual** (confirmado explícitamente en comentarios del propio archivo) — Gastos no debe prometer ese desglose de monto en fase 1, solo la política.

**Tipos de documento**: `TIPOS_DOCUMENTO_PROVEEDOR` (`compras/constantes/tiposDocumentoProveedor.ts:7-17`) es una lista fija de 9 tipos, no configurable por empresa. Gastos debe **importar esta misma constante**, no copiarla ni crear una lista paralela — si en el futuro se necesita generalizar (configurable por empresa), es un trabajo transversal que beneficia a ambos módulos, no algo que Gastos deba resolver solo.

**Detracción/percepción/retención**: solo **Retención** está implementada (exclusivamente para documentos RH, tasa ingresada manualmente, sin catálogo de tasas — confirmado, "no existe todavía un catálogo de tasas de retención en Configuración"). Percepción y Detracción tienen tipos de datos definidos pero **cero UI/cálculo** del lado de Compras. Gastos no debe implementar estos tres mecanismos desde cero — si un gasto los necesitara, dependería de que Compras los complete primero (fuera de alcance de esta auditoría y de la futura implementación de Gastos).

---

## 17. Integración futura con suministros

No se audita ni se rediseña Suministros. Punto de integración futuro, con la brecha exacta documentada:

`Suministro con stock → Nota de Ingreso → Inventario valorizado (CapaCostoInventario) → Nota de Salida por consumo interno → Gasto operativo`

**Brecha confirmada**: el motor de Kardex valorizado no tiene hoy un `motivo` de consumo para "consumo interno". `MotivoConsumoCapaCosto` (`gestion-inventario/models/consumoCapaCostoInventario.types.ts:8`) solo admite `'salida' | 'transferencia'`. `TipoDocumentoOrigenCapa` (`capaCostoInventario.types.ts:20-26`) tampoco tiene una variante `consumo_interno`/`gasto`. Para que el costo de un consumo interno se convierta en Gasto **sin duplicarse**, se necesitaría (cuando se construya Suministros):
1. Generalizar `MotivoConsumoCapaCosto` agregando `'consumo_interno'` (extensión aditiva del enum, no rompe los 2 valores existentes).
2. Un Gasto generado desde este flujo debe **leer** el `costoUnitarioBaseMonedaBase` ya calculado por el consumo (mismo principio que Rentabilidad de Ventas nunca recalcula costo, solo lo consume vía `ConsumoCapaCostoInventario.valorConsumidoMonedaBase`) — **nunca** un nuevo cálculo de costo paralelo.
3. El Gasto resultante debe marcarse con un origen distintivo (ej. `origenId` apuntando al movimiento de salida) para que nunca se capture manualmente por duplicado.

No implementar ni rediseñar Suministros ahora — este punto queda como contrato de integración documentado.

---

## 18. Rentabilidad operativa

**No se modifica** `consultaRentabilidadVentas.service.ts`, `IndicadoresPage.tsx` ni `reportDefinitions.ts` en esta auditoría (confirmado: `git status --short` limpio antes y después de la investigación).

`IndicadoresRentabilidadVentas` ya expone: `ventaNetaTotal`, `costoVentaCubierto`, `utilidadBrutaCubierta`, `margenBrutoCubierto`, `coberturaPorcentaje`, `lineasSinCosto`, `lineasNoInventariables`, `lineasTipoCambioNoDisponible`, `totalLineas` (`consultaRentabilidadVentas.service.ts:186-196`). Utilidad Operativa debe construirse como un **indicador nuevo y separado** que combina `utilidadBrutaCubierta` (ya calculada) menos una nueva agregación de Gastos — nunca insertando campos de Gastos dentro de `FilaRentabilidadVenta` (que es y debe seguir siendo exclusivamente de ventas).

Definiciones recomendadas, replicando exactamente las reglas ya validadas para Rentabilidad de Ventas:
- **Qué gastos se incluyen**: solo `estado !== 'anulado'` (mismo criterio que anulados en ventas — excluidos por defecto, visibles solo con filtro explícito).
- **Fecha usada**: `fechaReconocimiento` del gasto, **no** la fecha de pago (instrucción explícita del enunciado, consistente con cómo Rentabilidad de Ventas ya reconoce la venta en su propia fecha).
- **Moneda base y TC histórico**: mismo patrón — nunca asumir TC=1, usar el TC del propio gasto, marcar "tipo de cambio no disponible" cuando falte (mismo enum `EstadoCostoRentabilidad`-equivalente ya usado, para no inventar un segundo léxico de estados).
- **Gastos pendientes vs. pagados**: ambos cuentan para Utilidad Operativa (el reconocimiento no depende del pago, §7) — pero deben poder filtrarse/desglosarse igual que Rentabilidad de Ventas separa `con_costo`/`sin_costo_registrado`.
- **Gastos sin documento**: se incluyen igual (el reconocimiento no depende de tener un comprobante formal).
- **Distribución por establecimiento vs. gastos generales**: un gasto sin `establecimientoId` (aplica a toda la empresa) debe tratarse como una fila "general", nunca prorrateado automáticamente entre establecimientos (evita inventar una regla de asignación no solicitada).
- **Fórmulas**:
  ```
  Utilidad bruta − Gastos operativos reconocidos = Utilidad operativa
  Margen operativo = Utilidad operativa / Venta neta (cubierta o total, según se defina — pendiente de decisión de producto, ver §35)
  ```
- **Nunca llamarlo "utilidad neta"** mientras no existan depreciación, intereses, impuestos empresariales u otros resultados financieros — instrucción explícita, y consistente con que el repositorio no tiene ningún modelo de depreciación/activo fijo (confirmado, no verificable su existencia).

---

## 19. Reportes y Excel

**Recomendación: un único reporte, "Gastos operativos", bajo una nueva categoría "Gastos" en el Reports Hub** — mismo patrón exacto que Rentabilidad de Ventas (`reportDefinitions.ts`: `reportCategories` + una entrada en `reportDefinitions`, cero cambios de código en `ReportsHub.tsx`, comprobado por precedente: agregar la categoría "Rentabilidad" no requirió tocar `ReportsHub.tsx`).

No crear reportes separados por categoría/establecimiento/proveedor/evolución mensual — se resuelven con **filtros + agrupaciones + columnas**, exactamente como Rentabilidad de Ventas resuelve "por producto/vendedor/cliente/establecimiento/periodo" con un único `AgrupacionRentabilidad` (`'sin_agrupar'|'producto'|'vendedor'|'cliente'|'establecimiento'|'periodo'`, adaptado a `'categoria'|'proveedor'|'establecimiento'|'periodo'` para Gastos).

- **Granularidad**: fila = un gasto (sin agrupar) o un grupo agregado (por categoría/proveedor/establecimiento/periodo) — mismo patrón que `FilaRentabilidadVenta`/`GrupoRentabilidadVenta`.
- **Columnas por defecto**: Fecha, Descripción, Categoría, Proveedor, Total, Estado.
- **Columnas opcionales**: moneda original, TC, establecimiento, condición de pago, medio de pago, tipo de documento.
- **Filtros**: Periodo, Establecimiento, Categoría, Proveedor, Estado, Con/sin documento.
- **Agrupaciones**: Sin agrupar, Categoría, Proveedor, Establecimiento, Periodo.
- **Tarjetas del reporte**: Gastos operativos totales, Pendiente, Pagado — mismas 4 tarjetas del módulo, no nuevas.
- **Excel**: `exportDatasetToExcel` tal cual — nombre de archivo `gastos_operativos_<desde>_<hasta>.xlsx`, hoja `Gastos`, mismas reglas de formato (`Date` real, números con `numFmt`, nunca texto para montos) ya aplicadas en Rentabilidad de Ventas.
- **ColumnsManager**: sí, mismo componente compartido.
- **Exporta todas las filas filtradas**: sí, nunca solo la página visible — mismo principio ya aplicado.
- **AutoExport**: reutilizar `useAutoExportRequest`/`REPORTS_HUB_PATH` tal cual.

---

## 20. Permisos

Catálogo centralizado confirmado: `configuracion-sistema/roles/catalogoPermisos.ts` (`CATALOGO_PERMISOS`). Permisos análogos ya existentes: `compras.comprobantes.ver/registrar/anular`, `compras.pagos.ver/registrar/anular`, `compras.cuentas_por_pagar.ver`, `caja.ver/abrir/cerrar/movimientos.registrar`, `indicadores.ver` (único, sin granularidad por reporte).

**Permisos recomendados para Gastos** (agrupados coherentemente, sin uno por botón — mismo criterio que Compras ya aplica: no hay un permiso separado por cada acción de UI, sino por operación de negocio):
- `gastos.ver`
- `gastos.crear` (incluye editar mientras esté en borrador/pendiente — no se separa `gastos.editar`, mismo criterio de agrupación que el enunciado pide evaluar)
- `gastos.anular`
- `gastos.pagar`
- `gastos.categorias.gestionar` (crear/editar/desactivar categorías, un solo permiso, mismo patrón que `config.series.gestionar`)

**No se recomienda** `gastos.configurar_recurrentes` — Recurrentes queda fuera del alcance (§10), y si se implementara como acción simple desde el tab Gastos (no como tab propio), no justifica un permiso dedicado todavía.

**Hallazgo transversal a documentar (no corregir aquí)**: el rol Administrador se calcula dinámicamente como `CATALOGO_PERMISOS.map(p => p.id)` (`rolesDelSistema.ts:8`) — cualquier permiso `gastos.*` agregado al catálogo será heredado automáticamente por ese rol sin tocar el archivo. Pero **el guard real de rutas no aplica hoy ningún permiso granular**, porque `SessionInitializer.tsx` asigna `permissions: ['*']` a todo usuario autenticado y `PermisoGuard.tsx:26` deja pasar apenas encuentra el wildcard. Los permisos de Gastos quedarían correctamente definidos y coherentes con el diseño, pero sin efecto restrictivo real hasta que ese hallazgo preexistente se corrija (fuera de alcance de esta auditoría).

---

## 21. Series y numeración

**Gasto sí necesita un número interno** (ej. `GS01-00000001`), por paralelismo directo con Pagos (`PG01-00000001`) y por consistencia de UI (aparece en tabla/Excel/detalle).

**No existe una infraestructura de series genérica y centralizada** (confirmado: búsqueda de `series.repository`/`SeriesRepository`/`servicioSeries`/`generarCorrelativo` sin resultados). Lo que existe es:
1. Un **catálogo de definición de series** por tipo de documento en Configuración → Series (`config.series`, con `documentType.code`), ya usado para `'PG'` (Pagos).
2. Un patrón ad-hoc repetido 3 veces (`siguienteCorrelativoRC`, `siguienteCorrelativoOC`, `siguienteNumeroPago`) — cada uno calcula el máximo existente en el arreglo en memoria + 1, sin locking ni transacción.

**Recomendación**: Gastos debe seguir el mismo patrón ad-hoc (no hay infraestructura mejor que reutilizar), agregando un nuevo `documentType.code` (ej. `'GS'`) al catálogo de Series en Configuración — esto es **configuración**, no código nuevo de infraestructura — y una función `siguienteNumeroGasto` análoga a `siguienteNumeroPago`, en un archivo propio de Gastos (no reutilizando literalmente la de Pagos, que está tipada a pagos).

**Diferenciar claramente 3 numeraciones, nunca mezclarlas**: número interno del Gasto (`GS01-...`, generado por el sistema) ≠ serie/número del comprobante del proveedor (texto libre, ej. "F001-12345", capturado tal cual lo emitió el proveedor) ≠ número del Pago (`PG01-...`, ya existente, reutilizado sin cambios si se generaliza según §14).

**Riesgo heredado, no exclusivo de Gastos**: el patrón ad-hoc no previene colisiones bajo concurrencia (dos pestañas registrando simultáneamente) — confirmado como limitación estructural de la arquitectura actual (localStorage puro, sin transacción atómica), no algo que Gastos deba resolver de forma distinta a como ya vive en Compras.

---

## 22. Adjuntos y auditoría

**No crear otro sistema de adjuntos.** Dos implementaciones existentes, ninguna 100% genérica hoy:
- `AdjuntosCompra.tsx` (Compras): persiste el archivo completo como base64 dataURL dentro del propio JSON en localStorage (`leerArchivoComoDataUrl`), límites `5 archivos`/`5MB`/`pdf,jpg,jpeg,png` hardcodeados en el componente, con link de descarga (`<a download>`) pero **sin visor de previsualización**. Ya reutilizado en Orden de Compra, Comprobante de Compra y Pago de Compra — es el precedente más maduro.
- `AttachmentsSection.tsx` (Cobranzas): solo `File[]` en memoria — **no persiste el binario**, solo metadata (`name`,`size`,`type`); se pierde al recargar. **No apto para Gastos** (un sustento de gasto debe sobrevivir el recargo de página).

**Recomendación**: reutilizar el **patrón** de `AdjuntosCompra.tsx` (base64 dataURL, mismos límites por defecto), generalizando su tipo `TipoAdjuntoCompra` a un tipo compartido (ej. `TipoAdjunto` con variante `factura_gasto`/`voucher_pago`/`otro`) en vez de duplicar el componente completo — una adaptación acotada, no una reescritura ni un componente nuevo desde cero. **No existe ningún visor de previsualización en ningún módulo del repositorio hoy** (confirmado) — si Gastos lo necesitara, sería una mejora nueva que beneficiaría a ambos módulos, no algo exclusivo de Gastos.

**Auditoría a conservar** (mismo nivel que ya captura `PagoCompra`: `creadoPor?`, `fechaCreacion`, `motivoAnulacion?`, `fechaAnulacion?`, `anuladoPor?`, `historial: EventoHistorialCompras[]`): usuario creador, fecha de creación, usuario que modificó (si se generaliza edición), usuario que anuló, motivo de anulación, y la lista de pagos relacionados (mismo campo `pagosRelacionados: string[]` que ya tiene `CuentaPorPagar`).

---

## 23. Reutilización técnica

| Necesidad | Componente/servicio actual | Reutilizable | Adaptación necesaria | Riesgo de acoplamiento |
|---|---|---|---|---|
| Encabezado de página | `@/contasis/layout/PageHeader/PageHeader.tsx` | Sí | Ninguna | Ninguno |
| Tabs | Patrón `useSearchParams` de `control-caja/pages/Home.tsx` | Sí (como patrón, no componente) | Reimplementar 2 tabs (no extraer un componente compartido — solo 1 consumidor) | Ninguno |
| Tarjetas resumen | `gestion-cobranzas/components/ResumenCards.tsx` | Sí (como patrón visual) | Nuevo componente con las 4 tarjetas de Gastos (contenido distinto) | Ninguno |
| Filtros / Periodo / Establecimiento | Patrón de `TablaComprobantesCompra.tsx` y de Rentabilidad de Ventas | Sí | Ninguna | Ninguno |
| DateRangePicker | `indicadores-negocio/components/DateRangePicker.tsx` | Sí | Ninguna | Ninguno |
| Selector de proveedor | `compras/componentes/BuscadorProveedor.tsx` | Sí | Generalizar para permitir modo "sin documento" | Bajo (componente ya desacoplado de `ComprobanteCompra`) |
| Selector de moneda | `currencyManager` | Sí | Ninguna | Ninguno |
| Selector de medio de pago | `paymentMeans.ts` / `EditorMediosPagoCompra.tsx` | Sí | Ninguna para el catálogo; el editor de UI podría necesitar generalizarse si se separa de `MedioPagoCompra` | Bajo |
| Selector de banco/cuenta | `BankAccount` (referencial) | Sí | Ninguna (documentar que no hay saldo real) | Ninguno |
| Formulario de pago | `FormularioPagoCompra.tsx` + `useFormularioPagoCompra.ts` | Parcial | Generalizar el campo de origen documental (§13-C, §14) | **Alto** — es el componente más acoplado a "Compra" en nombre y en el modelo subyacente |
| Cronograma/cuotas | `CuotaCuentaPorPagar` | Sí | Ninguna | Ninguno |
| Tabla | `TablaCuentasPorPagar.tsx`/`TablaPagosCompra.tsx` (patrón, no componente) | Sí (como patrón) | Nueva tabla propia de Gastos | Ninguno |
| ColumnsManager | `@/shared/columns/ColumnsManager.tsx` | Sí | Ninguna | Ninguno |
| Paginación | Patrón inline ya usado en Rentabilidad de Ventas | Sí | Ninguna | Ninguno |
| Drawer/modal | `@/shared/ui/drawer/Drawer` | Sí | Ninguna | Ninguno |
| Adjuntos | `AdjuntosCompra.tsx` | Parcial | Generalizar tipo de adjunto (§22) | Medio (tipos nombrados `TipoAdjuntoCompra`) |
| Confirmación | `useFeedback().openConfirm` | Sí | Ninguna (subutilizado hoy, buena oportunidad) | Ninguno |
| exportDatasetToExcel | `@/shared/export/exportToExcel.ts` | Sí | Ninguna | Ninguno |
| Reports Hub | `reportDefinitions.ts` + `ReportsHub.tsx` | Sí | Solo agregar categoría+entrada (0 cambios en `ReportsHub.tsx`) | Ninguno |
| AutoExport | `useAutoExportRequest`/`autoExportParams.ts` | Sí | Ninguna | Ninguno |
| currencyManager | `@/shared/currency` | Sí | Ninguna | Ninguno |
| Formatos (fecha/moneda) | `businessTime`, `formatMoney` | Sí | Ninguna | Ninguno |
| Permisos | `catalogoPermisos.ts` | Sí | Agregar 5 entradas nuevas (§20) | Ninguno (pero ver hallazgo del bypass `'*'`) |
| Series | Patrón ad-hoc de `siguienteNumeroPago` | Sí (como patrón) | Nueva función propia + nueva entrada de `documentType` en config | Ninguno |
| Caja | `useCaja()` de `control-caja/context/CajaContext.tsx` | Sí | Ninguna en Caja misma; el consumidor repite el guard manual | Ninguno en Caja; el patrón heredado no es idempotente (documentado en §12) |
| Cuentas por Pagar (motor) | `servicioCuentaPorPagar.ts` (funciones genéricas) | Parcial | Generalizar origen documental (§13-C) | Medio — acoplamiento real mapeado con precisión |

---

## 24. Modelo de datos conceptual

| Campo | Tipo conceptual | Obligatorio | Fuente | Observación |
|---|---|---|---|---|
| id | string | Sí | Generado | Identificador interno |
| empresaId | string | Sí | Tenant (`getTenantEmpresaId()`) | Mismo patrón `lsKey` que todo el repositorio |
| establecimientoId | string \| null | No | Selector de establecimiento | `null` = gasto general de la empresa |
| numeroInterno | string | Sí | `siguienteNumeroGasto` (§21) | Fuente de verdad propia, no derivable |
| fechaEmision | string (ISO) | Sí | Input | Fecha del documento del proveedor |
| fechaReconocimiento | string (ISO) | Sí | Input (default = fechaEmision) | Alimenta Rentabilidad Operativa (§18) |
| fechaVencimiento | string (ISO) \| null | Condicional | Input | Solo si `condicionPago=credito` |
| categoriaId | string | Sí | `CategoriaGasto` (§9) | — |
| proveedorId | string \| null | No | `Cliente.id` (§11) | `null` si es beneficiario libre |
| beneficiario | string \| null | No | Texto libre | Solo si no hay `proveedorId` |
| descripcion | string | Sí | Input | — |
| tipoDocumento | string \| null | No | `TIPOS_DOCUMENTO_PROVEEDOR` (reutilizado) | — |
| serieDocumento / numeroDocumento | string \| null | No | Input | Documento del proveedor, no numeración propia |
| moneda | string | Sí | `currencyManager` | Nunca hardcodear |
| tipoCambio | number \| null | Condicional | TC histórico | Solo si `moneda !== monedaBase` |
| subtotal / impuesto / total | number | Sí | Input/cálculo simple | `total` es fuente de verdad, no derivado en cada lectura |
| condicionPago | `'contado'\|'credito'` | Sí | Input | — |
| estado | enum (§7) | Sí (derivado) | Servicio | Nunca editado manualmente |
| cuentaPorPagarId | string \| null | Derivado | Generado si `condicionPago=credito` | Referencia, no duplica datos de la CxP |
| gastoRecurrenteId | string \| null | No (fase 2) | Plantilla (§10) | Ausente en fase 1 |
| observaciones | string \| null | No | Input | — |
| adjuntos | Adjunto[] | No | `AdjuntosCompra`-generalizado (§22) | Array embebido, igual que `AdjuntoCompra[]` |
| auditoria | objeto | Sí (derivado) | Servicio | creadoPor, fechaCreacion, anuladoPor?, fechaAnulacion?, motivoAnulacion? |

**Derivados que NO deben persistirse**: `estadoVencimiento` (calculable en lectura, igual que `CuentaPorPagar.estadoVencimiento` ya se recalcula, no se guarda como fuente de verdad separada de `fechaVencimiento`), `saldoPendiente` (derivable de `total` menos pagos aplicados, mismo principio que `CuentaPorPagar.saldoPendiente` sí persiste hoy por conveniencia — decisión de producto pendiente, §35, sobre si Gastos debe replicar esa persistencia o calcularlo en lectura).

---

## 25. Matriz de integraciones

| Operación | Gastos | Caja | CxP | Pagos | Rentabilidad |
|---|---|---|---|---|---|
| Registrar gasto al contado (efectivo) | Crea Gasto `registrado` | `agregarMovimiento(Egreso)` inmediato | No se crea | Se crea 1 Pago inmediato | Afecta desde `fechaReconocimiento` |
| Registrar gasto al crédito | Crea Gasto `registrado` | Sin efecto hasta pagar | Se crea CxP `pendiente` | No se crea aún | Afecta desde `fechaReconocimiento` (no espera el pago) |
| Pago parcial | Sin cambio | `agregarMovimiento(Egreso)` si es caja | `aplicarPagoACuentaPorPagar` → `parcial` | Se crea 1 Pago | Sin cambio (ya estaba reconocido) |
| Pago total posterior | Sin cambio | `agregarMovimiento(Egreso)` si es caja | → `pagada` | Se crea 1 Pago | Sin cambio |
| Anular gasto sin pagos | → `anulado` | Sin efecto | Se anula CxP si existía | N/A | Se excluye desde la fecha de anulación (visible solo con filtro explícito) |
| Anular gasto con pagos | **Bloqueado** | Sin efecto | Sin efecto | N/A | Sin cambio hasta resolver bloqueo |
| Anular un pago | Sin cambio de estado del gasto en sí | `agregarMovimiento(Ingreso)` compensatorio si afectó caja | `revertirPagoDeCuentaPorPagar` → recalcula estado | Pago → `anulado` | Sin cambio (el reconocimiento no depende del pago) |
| Gasto recurrente (fase 2) | Genera Gasto real bajo confirmación manual | Igual que gasto normal | Igual que gasto normal | Igual que gasto normal | Igual que gasto normal |

---

## 26. Casos funcionales

Los 20 casos del enunciado siguen exactamente las reglas ya descritas en §7, §12, §13, §18 y la matriz de §25 — no se repiten en extenso para evitar redundancia; se listan solo las particularidades no cubiertas arriba:

- **11 (moneda extranjera)**: mismo tratamiento que Rentabilidad de Ventas — TC histórico obligatorio, nunca asumido en 1; si falta, el gasto se marca "tipo de cambio no disponible" y se excluye de Utilidad Operativa (mismo criterio que una venta sin TC se excluye del margen).
- **12 (sin proveedor)**: `proveedorId=null`, usa `beneficiario` libre (§11).
- **13 (sin comprobante)**: `tipoDocumento=null`; el gasto es igualmente válido y reconocible — no depender de un documento formal para afectar Rentabilidad.
- **14/15 (impuesto recuperable/no recuperable)**: captura solo la política (§16), nunca el monto desglosado (no calculado aún en ningún punto del sistema).
- **16 (recurrente)**: ver §10 — acción manual "generar desde plantilla", nunca automática.
- **17/18 (con/sin establecimiento)**: fila normal vs. fila "general" en Rentabilidad Operativa (§18), nunca prorrateada automáticamente.
- **19 (caja cerrada)**: el pago con medio de caja se bloquea antes de ejecutarse (mismo guard manual de §12); el gasto en sí puede registrarse igual (el reconocimiento no depende de la caja).
- **20 (duplicado por doble clic/reintento)**: **riesgo real heredado, no mitigado hoy en ningún punto del sistema** (§12) — debe documentarse como brecha conocida, no asumir que "no pasará".

---

## 27. Hallazgos

| Severidad | Hallazgo | Evidencia | Impacto | Recomendación |
|---|---|---|---|---|
| **Bloqueante** | Sistema de permisos granular sin efecto real: `SessionInitializer.tsx` asigna `permissions:['*']` a todo usuario autenticado; `PermisoGuard.tsx:26` deja pasar por el wildcard antes de evaluar permisos reales | `contexts/SessionInitializer.tsx:62-73`, `routes/PermisoGuard.tsx:26` | Cualquier permiso `gastos.*` nuevo quedará bien definido pero sin restricción real en runtime | No corregir en esta auditoría (fuera de alcance); documentar como deuda preexistente antes de prometer control de acceso real en Gastos |
| **Importante** | `CuentaPorPagar`/`PagoCompra` acoplados estructuralmente a `ComprobanteCompra` (campos obligatorios, no solo nombres) | `CuentaPorPagar.ts:37,39`; `servicioCuentaPorPagar.ts:18`; `PagoCompra.ts:49,98` | Bloquea reutilización directa sin generalización (§13, §14) | Generalizar `tipoOrigen`/`documentoOrigenId` antes de construir Gastos, sin tocar el camino de Compras existente |
| **Importante** | `agregarMovimiento` de Caja no es idempotente (`id: mov-${Date.now()}`), sin guard contra doble registro | `control-caja/context/CajaContext.tsx:433` | Riesgo real de egresos duplicados por doble clic/reintento, heredado por cualquier consumidor nuevo (Gastos incluido) | Documentar como riesgo conocido; no corregir aquí (afecta también a Compras/Cobranzas hoy) |
| **Importante** | Control de Caja es monomoneda PEN de forma estructural (tipo, formatters, templates) | `control-caja/utils/formatters.ts:6-9` (`` `S/ ${value.toFixed(2)}` ``); `Movimiento` sin campo `moneda` | Si Gastos necesita pagar en moneda extranjera vía caja, Caja no lo soporta hoy | Documentar como limitación; Gastos debe restringir "pago en efectivo" a la moneda base mientras Caja no generalice |
| **Importante** | Medios de pago de Caja hardcodeados como campos nombrados (`montoInicialEfectivo/Tarjeta/Yape/Otros`), no un array genérico pese a existir `mediosPagoPermitidos` aparentemente configurable | `control-caja/models/Caja.ts:15-18,29-32,43-46` | Un medio de pago nuevo (ej. Plin) no puede añadirse sin tocar el modelo de Caja | Documentar; no es bloqueante porque Gastos solo necesita "Efectivo" para afectar Caja (§15) |
| **Importante** | localStorage no tenantizado en datos reales de clientes/proveedores (contactos, direcciones) | `gestion-clientes/utils/contactosCliente.ts:3,46`; `direccionesCliente.ts:6,52,58` | Riesgo de fuga de datos entre empresas si coinciden ids/documentos | Fuera de alcance de Gastos; documentar como hallazgo transversal de Proveedores |
| **Importante** | Cero pruebas automatizadas en `control-caja/` y en `gestion-clientes/` completos | Confirmado por 2 agentes independientes, búsqueda de `*.test.ts` sin resultados en ambas carpetas | Cualquier integración de Gastos con Caja o Proveedores se construye sin red de seguridad de tests en esos módulos | Recomendar (no ejecutar) que la futura implementación de Gastos incluya tests de integración con Caja, ya que Caja mismo no los tiene |
| **Mejora** | Numeración (series) es un patrón ad-hoc repetido 3 veces (RC/OC/Pagos), sin servicio central de correlativos | `formatearCompras.ts:32-40`; `ContextoCompras.tsx:253-269` | Gastos repetiría el mismo patrón por 4ª vez | Aceptable para fase 1 (mismo nivel de riesgo ya asumido); una futura unificación beneficiaría a todo el sistema, no solo a Gastos |
| **Mejora** | Fragmentación de patrones UX (3 mecanismos de tabs, 2 `PageHeader`, ~5 modales de confirmación distintos) | Ver tabla §5 | Gastos podría sumar una 4ª/6ª variante si no se decide explícitamente | Resuelto en esta auditoría con una recomendación única por elemento (§5) |
| **Mejora** | `AttachmentsSection.tsx` de Cobranzas no persiste el contenido del archivo (solo metadata) | `CobranzaModal.tsx:104-111` | No es un riesgo para Gastos si se usa `AdjuntosCompra.tsx` en su lugar (§22) | No usar ese componente como base para Gastos |
| **Sin impacto real** | IGV mostrado como "18%" hardcodeado en un label de UI de solo lectura | `gestion-clientes/components/DetalleCompraModal.tsx:179` | Cosmético, en un módulo que Gastos no toca | Documentado, sin acción requerida en Gastos |
| **Sin impacto real** | `MovimientosCaja.tsx` recalcula totales dentro del componente en vez de `utils/calculations.ts` | `control-caja/pages/MovimientosCaja.tsx:24-26` | No afecta a Gastos directamente (Gastos no construye esa página) | Documentado, sin acción requerida en Gastos |

---

## 28. Cobertura de pruebas

| Área | Archivo(s) | Cantidad | Cobertura | Reutilizable para Gastos |
|---|---|---|---|---|
| Cuentas por Pagar (servicio) | `servicioCuentaPorPagar.test.ts` | 17 | Recalcular estado, aplicar/revertir pago (total/parcial/multi-documento/por cuota) | Alta — mismas funciones se reutilizarían tal cual |
| Pagos (validación) | `servicioPagoCompra.test.ts` | 10 | Validación de aplicaciones (documento único/múltiple, monedas/proveedores distintos, montos inválidos) | Alta |
| Pagos (modelo) | `PagoCompra.test.ts` | 3 | Solo etiquetas de estado | Baja |
| Compras (reglas transversales) | `reglasCompras.test.ts` | 46 | Bloqueos de anulación, resolución tributaria, relaciones CxP↔Pago↔CC | Media — varias reglas de bloqueo son el modelo a replicar, no el código en sí |
| Compras (mapeo CC↔NI) | `mapeadorCCaNI.test.ts` | 31 | Fuera del alcance directo de Gastos | Ninguna |
| Compras (contexto) | `ContextoCompras.ni.test.ts` | 21 | Integración NI↔CC | Ninguna |
| Compras (estados) | `calcularEstadosCompra.test.ts` | 10 | Cálculo de estados de documentos | Media (patrón, no código) |
| Impuestos | `Tax.test.ts` (7), `opcionesTratamientoImpuestoCompra.test.ts` (5) | 12 | Modelo de impuesto y política recuperable | Alta si Gastos reutiliza el motor tributario para líneas gravadas |
| **Caja** | — | **0** | **Ninguna** — apertura, cierre, movimientos, anulaciones sin cobertura | Ninguna — brecha heredada |
| **Proveedores/Clientes** | — | **0** | **Ninguna** — `useClientes`, `clientesClient`, formularios, contactos/direcciones sin cobertura | Ninguna — brecha heredada |
| Adjuntos | — | 0 | Ninguna | Ninguna |
| ColumnsManager | — | 0 | Ninguna (en ningún módulo revisado) | Ninguna |
| Permisos | — | 0 | Ninguna (`tienePermiso` sin test dedicado) | Ninguna |
| Series/numeración | — | 0 | Ninguna | Ninguna |
| Reportes/Rentabilidad | `reportDefinitions.test.ts` (4), `consultaRentabilidadVentas.service.test.ts` (46) | 50 | Alta, ya construida en esta rama | Sirve de plantilla directa para las pruebas futuras del reporte de Gastos |

**Necesidad futura de pruebas de integración** (no crear ahora): Gastos↔Caja (dado que Caja no tiene ninguna prueba propia), Gastos↔CxP generalizada (verificar que la generalización de §13-C no rompe los 17 tests existentes de Compras), Gastos↔Rentabilidad Operativa (mismo rigor que los 46 tests de Rentabilidad de Ventas).

---

## 29. Archivos previstos

**Reutilizados (sin modificar):**
`useCaja`/`CajaContext.tsx`, `aplicarPagoACuentaPorPagar`/`revertirPagoDeCuentaPorPagar`/`recalcularEstadoCuentaPorPagar` (`servicioCuentaPorPagar.ts`), `BuscadorDocumentoOrigenPago.tsx`, `EditorMediosPagoCompra.tsx`, `paymentMeans.ts`, `BankAccount.ts`, `BuscadorProveedor.tsx` (uso directo, sin el modo "sin documento"), `currencyManager`, `ColumnsManager.tsx`, `exportToExcel.ts`, `ReportsHub.tsx`, `useAutoExportRequest.ts`, `autoExportParams.ts`, `useFeedback` (`openConfirm`), `Drawer` (`@/shared/ui/drawer`), `PageHeader` (`@/contasis`), `resolverTratamientoTributarioProducto`/`resolverRecuperabilidadImpuesto`, `TIPOS_DOCUMENTO_PROVEEDOR`.

**Modificados (generalización acotada, decisión de producto pendiente — §35):**
`CuentaPorPagar.ts` (+`documentoOrigenId`/`tipoOrigen`), `PagoCompra.ts`/`AplicacionPagoCompra` (+`documentoOrigenId`/`tipoOrigen` o rename a `Pago`), `reportDefinitions.ts` (+categoría "Gastos" +1 entrada), `catalogoPermisos.ts` (+5 permisos), `privateRoutes.tsx` (+1 ruta), `AdjuntoCompra.ts`/`AdjuntosCompra.tsx` (generalizar tipo de adjunto).

**Nuevos (futura implementación, NO creados en esta auditoría):**
`gastos/modelos/Gasto.ts`, `gastos/modelos/CategoriaGasto.ts`, `gastos/servicios/servicioGasto.ts` (estados, validaciones, bloqueo de anulación), `gastos/servicios/servicioCategoriaGasto.ts`, `gastos/repositorios/repositorioGastos.ts`, `gastos/repositorios/repositorioCategoriasGasto.ts`, `gastos/contexto/ContextoGastos.tsx`, `gastos/componentes/TablaGastos.tsx`, `gastos/componentes/FormularioGasto.tsx` (+ `useFormularioGasto.ts`), `gastos/componentes/DrawerDetalleGasto.tsx`, `gastos/componentes/PanelCategoriasGasto.tsx`, `gastos/paginas/PaginaGastos.tsx`, `gastos/servicios/siguienteNumeroGasto.ts`, `gastos/servicios/consultaGastosOperativos.service.ts` (proyección para el reporte, mismo patrón que `consultaRentabilidadVentas.service.ts`), y (fuera de fase 1) `gastos/modelos/GastoRecurrente.ts`.

**No tocados:** Kardex valorizado, motor de valorización de inventario, POS, Documentos Comerciales, `consultaRentabilidadVentas.service.ts` (Rentabilidad de Ventas), Compras (comprobantes/OC/RC — solo CxP/Pago se generalizan, sin romper su camino actual).

---

## 30. Presupuesto de archivos

Orientativo para la futura implementación (no vinculante, depende de decisiones de producto pendientes en §35): **10 a 14 archivos productivos nuevos** en fase 1 (Gastos + Categorías, sin Recurrentes) — modelo, servicio y repositorio de Gasto y de Categoría (6), contexto (1), tabla+formulario+drawer+panel de categorías (4), página (1), servicio de numeración y de proyección de reporte (2) — más las modificaciones acotadas de §29 (que no cuentan como archivos nuevos). Esta cifra es significativamente mayor al límite de "4 archivos productivos" usado en la implementación de Rentabilidad de Ventas porque Gastos es un módulo CRUD completo con generalización de infraestructura ajena, no un reporte de solo lectura sobre datos ya existentes.

---

## 31. Qué está listo para reutilizar

`useCaja`/patrón de registrar-antes-de-comprometer, `aplicarPagoACuentaPorPagar`/`revertirPagoDeCuentaPorPagar`/`recalcularEstadoCuentaPorPagar` (ya genéricas), `BuscadorDocumentoOrigenPago.tsx` (ya genérico), catálogo de medios de pago (`paymentMeans.ts`), `BuscadorProveedor.tsx` (con la salvedad de §11), motor tributario básico, `TIPOS_DOCUMENTO_PROVEEDOR`, `ColumnsManager`, `exportDatasetToExcel`, Reports Hub/AutoExport, `currencyManager`, `useFeedback().openConfirm`, `Drawer`, `PageHeader` de `@/contasis`, catálogo de Series (como definición, no como generador de correlativo), `AdjuntosCompra.tsx` como patrón.

---

## 32. Qué debe generalizarse

`CuentaPorPagar` (origen documental genérico, §13-C), `PagoCompra`/`AplicacionPagoCompra` (mismo origen documental, §14), `AdjuntoCompra`/`TipoAdjuntoCompra` (tipo de adjunto genérico, §22), `BuscadorProveedor.tsx` (modo "sin documento", §11). Ninguna de estas generalizaciones requiere romper el camino actual de Compras — todas son adiciones (nuevo campo opcional + nueva función paralela), no reescrituras.

---

## 33. Qué falta crear

Todo el módulo Gastos en sí (modelo, servicio, repositorio, contexto, UI, página, ruta — listado completo en §29), el catálogo `CategoriaGasto`, la función de numeración `siguienteNumeroGasto`, la entrada de Reports Hub, los 5 permisos nuevos, y (fuera de fase 1) el modelo de Gasto Recurrente y su acción de generación manual.

---

## 34. Riesgos antes de implementar

1. El sistema de permisos no restringe nada en runtime hoy (§20, §27) — cualquier control de acceso prometido para Gastos sería nominal hasta que se corrija ese hallazgo preexistente.
2. La generalización de `CuentaPorPagar`/`PagoCompra` toca modelos con 30 pruebas existentes (17+10+3) — debe hacerse de forma estrictamente aditiva y verificarse que esas pruebas sigan pasando sin cambios.
3. Cero cobertura de pruebas en Caja y en Proveedores/Clientes — cualquier integración se construye sin red de seguridad en esos dos módulos.
4. No hay idempotencia en `agregarMovimiento` de Caja — un doble clic en "Registrar pago" desde Gastos puede duplicar el egreso, igual que ya podría pasar hoy en Compras.
5. Caja es monomoneda PEN estructural — Gastos en moneda extranjera pagado en efectivo requiere una decisión de producto (§35) sobre si se bloquea o si primero se generaliza Caja.
6. No existe control de "saldo suficiente" antes de pagar — ni en Caja ni en Compras hoy.

---

## 35. Decisiones pendientes de producto

1. ¿Se acepta que Utilidad Operativa use `Venta neta cubierta` o `Venta neta total` como denominador del margen operativo? (§18 lo deja explícitamente abierto en el enunciado).
2. ¿`saldoPendiente` de un Gasto se persiste (como hoy hace `CuentaPorPagar`) o se calcula siempre en lectura? (§24).
3. ¿Se autoriza tocar `PagoCompra`/`CuentaPorPagar` (generalización aditiva) en la implementación de Gastos, o se prefiere que Gastos duplique un modelo de Pago propio en una primera versión y se unifique después? Esta auditoría recomienda generalizar, pero es una decisión de alcance/tiempo, no solo técnica.
4. ¿Cuándo se promueve "Recurrentes" a tab propio — con qué disparador real (chequeo al abrir la app, o se acepta esperar a tener backend)?
5. ¿Se corrige el hallazgo de permisos (`SessionInitializer.tsx` con `['*']`) antes o después de Gastos? No es responsabilidad de este módulo, pero condiciona si "gastos.anular"/"gastos.pagar" restringen algo real.

---

## 36. Recomendación final

Construir Gastos como módulo propio con **dos tabs** (Gastos, Categorías — sin Recurrentes en fase 1), reutilizando **sin cambios** Caja/medios de pago/proveedores/ColumnsManager/Excel/Reports Hub/permisos-catálogo, y generalizando de forma **aditiva y acotada** únicamente `CuentaPorPagar` y `PagoCompra` (nuevo campo de origen documental `tipoOrigen`/`documentoOrigenId`) para poder aplicar/revertir pagos de gasto con el mismo motor y el mismo historial que ya usa Compras — sin tocar `ComprobanteCompra`, sin duplicar Caja, sin crear un segundo sistema de adjuntos, y sin modificar `consultaRentabilidadVentas.service.ts` (Rentabilidad de Ventas), que permanece intacto mientras se construye, en paralelo, un indicador nuevo y separado de Utilidad Operativa. El único hallazgo que condiciona la promesa de seguridad del módulo (no su funcionalidad) es el bypass de permisos ya preexistente en `SessionInitializer.tsx`, documentado pero fuera de alcance de esta auditoría.

---

### Resultados de validaciones de solo lectura (§28 del enunciado)

- `npx tsc -b --noEmit`: limpio.
- `npm run lint` (senciyo + pm): 0 errores, 0 warnings.
- `npm run build` (senciyo + pm): ambos exitosos.
- `npx vitest run`: 1245/1245 pruebas en verde (62 archivos).
- `npm ls vitest`: `vitest@3.2.7`, sin cambios.
- `git diff --check`: sin errores.
- `git status --short`: sin cambios (working tree limpio antes y después de la auditoría).

No se corrigió ningún problema encontrado — todos quedaron documentados en §27. No se modificaron dependencias.
