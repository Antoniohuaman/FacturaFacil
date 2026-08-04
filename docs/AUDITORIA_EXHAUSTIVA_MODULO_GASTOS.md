# Auditoría exhaustiva del módulo de Gastos

Auditoría de solo lectura. No se modificó, refactorizó ni implementó código de producción. Rama auditada: `develop` / `RevisionGastos`. `git status --short` verificado limpio antes y después de la auditoría.

Metodología: descubrimiento completo del módulo (agente Explore), lectura completa (no por fragmentos) de todos los archivos de dominio de `gastos/` y de sus puntos de integración en `compras/`, `control-caja/`, `indicadores-negocio/` y `configuracion-sistema/` mediante 6 agentes especializados de solo lectura, cada uno con instrucción explícita de citar archivo:línea y de no asumir funcionamiento sin evidencia. Se ejecutaron además las 4 validaciones técnicas completas (`tsc`, `eslint`, `vitest`, `build`) sobre el árbol de trabajo real, sin modificar dependencias.

---

## 1. Resumen ejecutivo

Se revisó el módulo de Gastos completo de SenciYo (`apps/senciyo/src/pages/Private/features/gastos/`, 24 archivos productivos + 9 archivos de test) y sus cuatro puntos de integración: Caja, Cuentas por Pagar/Pagos (compartidos con Compras), Indicadores/Rentabilidad Operativa, y Configuración (series, permisos, categorías). Es una implementación real y funcionalmente extensa: 3 estados documentales con transiciones correctamente bloqueadas en código, numeración por serie configurada (no hardcodeada), anulación lógica con reversión de CxP, formulario de pago reutilizado del motor genérico de Compras, y un indicador nuevo de "Utilidad Operativa" en Indicadores con fórmulas centralizadas, sin duplicidad de importes y con guards correctos contra división por cero.

**Validaciones técnicas**: build ✅, TypeScript ✅ (0 errores), ESLint ✅ (0 errores/warnings), 1550/1550 tests pasando en 80 archivos (86 tests son de `servicioGasto.test.ts`, 56 de `consultaGastosOperativos.service.test.ts`, más 6 archivos de test adicionales exclusivos de Gastos y 3 archivos de test de integración cruzada en Compras). Ningún fallo de build/lint/tsc pertenece ni afecta al módulo de Gastos.

**No se encontró** doble contabilización entre Gastos, Compras, Cuentas por Pagar y Pagos (verificado con evidencia de código en dos agentes independientes); tampoco se encontraron hardcodes funcionales que alteren cálculos (moneda, IGV, series, categorías vienen todas de configuración real).

**Sí se encontraron 4 hallazgos P1 (Crítico)** que impiden certificar el cierre con seguridad total:
1. El sistema de permisos granular no tiene efecto real en runtime (hallazgo preexistente y sistémico, no introducido por Gastos, pero que sigue vigente y afecta directamente el checklist de este módulo).
2. Las rutas de Gastos, incluso ignorando el bypass anterior, solo exigen el permiso genérico `gastos.ver` para crear/editar/anular/pagar, sin aplicar la granularidad de permisos ya definida en el catálogo — esto sí es específico de la implementación de Gastos.
3. La idempotencia de pago está desactivada de facto en el flujo independiente "Registrar pago" (a diferencia de "Registrar y pagar", que sí la implementa correctamente) — riesgo real de pago/movimiento de caja duplicado ante un reintento.
4. Un gasto en moneda extranjera pagado en efectivo se registra en Caja sin conversión (Caja no tiene campo de moneda y asume soles de forma implícita), sin ningún guard que lo impida o lo restrinja, pese a que la auditoría de diseño previa ya había recomendado esa restricción.

Además se documentan 10 hallazgos P2 (Importante) y 4 hallazgos P3 (Mejora), ninguno de los cuales por sí solo bloquea el uso del módulo.

**¿Puede cerrarse el módulo?** No en este momento, por la presencia de hallazgos P1 reales y verificados (ver veredicto §2). El núcleo funcional (registro, estados, numeración, anulación, integración con Indicadores) está sólido y bien probado; los 4 hallazgos P1 son acotados y corregibles sin rediseño.

**Conteo de hallazgos**: P0 = 0 · P1 = 4 · P2 = 10 · P3 = 4.

---

## 2. Veredicto

## ❌ NO APROBADO

**Razón**: no existen hallazgos P0 (no hay corrupción de datos, pérdida, duplicación financiera confirmada en el flujo normal, ni acceso cruzado entre empresas), y el núcleo funcional del módulo (registro, estados, numeración por serie, edición con niveles, anulación con reversión de CxP, integración con Rentabilidad Operativa) está implementado correctamente y con buena cobertura de pruebas. Sin embargo, existen **4 hallazgos P1 verificados con evidencia de código exacta** (permisos sin efecto real + granularidad de rutas no aplicada; idempotencia de pago desactivada de facto en un flujo real; ausencia de guard para gasto en moneda extranjera pagado en efectivo). La regla de esta auditoría es explícita: "APROBADO PARA CIERRE" exige la ausencia total de P0 **y** P1. Al existir P1, el veredicto no puede ser de aprobación, ni siquiera con observaciones menores, porque por definición un hallazgo P1 es "funcionalidad principal incompleta o inconsistente que impide cerrar el módulo con seguridad".

Ninguno de los 4 hallazgos P1 requiere rediseñar el módulo: los tres primeros son ajustes acotados (propagar `claveIdempotencia` al flujo de "Registrar pago"; afinar los permisos exigidos por ruta; corregir/activar el guard de permisos global, que es un fix transversal ya identificado desde la auditoría de diseño previa). El cuarto requiere una decisión de producto (bloquear pago en efectivo en moneda extranjera para Gastos, o generalizar Caja) que ya estaba prevista en el documento de diseño previo y no se implementó.

---

## 3. Alcance revisado

**Rutas**: `/gastos`, `/gastos/nuevo`, `/gastos/:id/editar`, `/gastos/:id/pagar` (`routes/privateRoutes.tsx:206-209`), guard `routes/PermisoGuard.tsx`.

**Páginas**: `GastosLayout.tsx`, `PaginaGastos.tsx`, `PaginaFormularioGasto.tsx`, `PaginaRegistrarPagoGasto.tsx`.

**Componentes**: `FormularioGasto.tsx`, `DrawerGasto.tsx`, `SeccionCategoriasGasto.tsx` (Configuración → Negocio).

**Contexto/hooks**: `ContextoGastos.tsx`, `useContextoGastos.ts`, `useCategoriasGasto.ts`.

**Modelos**: `Gasto.ts`, `CategoriaGasto.ts`.

**Servicios**: `servicioGasto.ts`, `servicioCategoriaGasto.ts`, `servicioCuentaPorPagarGasto.ts`, `servicioImpuestoGasto.ts`, `servicioImpresionGasto.ts`, `consultaGastosOperativos.service.ts`.

**Repositorios**: `repositorioGastos.ts`, `repositorioCategoriasGasto.ts` (localStorage tenantizado).

**Constantes**: `motivosAnulacionGasto.ts`.

**Integraciones auditadas con evidencia de código**:
- Caja: `control-caja/context/CajaContext.tsx`, `control-caja/models/Caja.ts`.
- Cuentas por Pagar / Pagos (compartido con Compras): `compras/modelos/CuentaPorPagar.ts`, `compras/modelos/PagoCompra.ts`, `compras/servicios/servicioCuentaPorPagar.ts`, `compras/servicios/servicioPagoCompra.ts`, `compras/repositorios/repositorioCuentasPorPagar.ts`, `compras/repositorios/repositorioPagosCompra.ts`, `compras/hooks/useFormularioPagoCompra.ts`, `compras/componentes/formularios/FormularioPagoCompra.tsx`.
- Indicadores/Rentabilidad: `indicadores-negocio/pages/RentabilidadVentasPage.tsx`, `indicadores-negocio/services/consultaRentabilidadVentas.service.ts`, `indicadores-negocio/pages/IndicadoresPage.tsx`, `indicadores-negocio/models/reportDefinitions.ts`.
- Series/numeración: `shared/series/expenseSeries.ts`, `configuracion-sistema/utilidades/catalogoSeries.ts`, `seriesPredeterminadas.ts`.
- Permisos: `contexts/SessionInitializer.tsx`, `routes/PermisoGuard.tsx`, `configuracion-sistema/roles/catalogoPermisos.ts`, `rolesDelSistema.ts`, `layouts/components/SideNav.tsx`.

**Tests leídos íntegramente**: los 9 archivos de test de `gastos/`, más `aislamientoOrigenCxPyPagos.test.ts`, `consultaRentabilidadVentas.service.test.ts` (bloque de Utilidad Operativa), `reportDefinitions.test.ts`.

**Backend**: se confirmó que `functions/api/` no contiene ninguna referencia a "gasto" (búsqueda exhaustiva sin resultados) — el módulo es 100% frontend + `localStorage`, sin excepción.

**No revisado en profundidad** (fuera del foco de integración con Gastos): `AdjuntosCompra.tsx` (límites de tamaño/tipo de archivo, se asumió su comportamiento documentado en la auditoría de diseño previa), `TenantProvider`/`TenantContext.tsx` (pertenencia usuario↔empresa, mencionado como riesgo abierto en §17), motor tributario completo de retención/detracción/percepción (confirmado sin cambios respecto a Compras, fuera de alcance de Gastos).

---

## 4. Arquitectura actual del módulo

```
gastos/
├── modelos/         Gasto.ts, CategoriaGasto.ts
├── repositorios/     repositorioGastos.ts, repositorioCategoriasGasto.ts   (localStorage tenantizado)
├── servicios/         servicioGasto.ts (reglas de estado/validación/numeración)
│                      servicioCategoriaGasto.ts
│                      servicioCuentaPorPagarGasto.ts  → genera CxP reutilizando compras/servicios/servicioCuentaPorPagar.ts
│                      servicioImpuestoGasto.ts        → reutiliza motor tributario de compras/logica/reglasCompras.ts
│                      servicioImpresionGasto.ts        → reutiliza @/shared/impresion/ServicioImpresionComprobante
│                      consultaGastosOperativos.service.ts → proyección de lectura (listado, Excel, Reports Hub, Rentabilidad)
├── contexto/          ContextoGastos.tsx (reducer + comandos: registrar/editar/anular/pagar/anular pago)
├── hooks/             useCategoriasGasto.ts
├── constantes/        motivosAnulacionGasto.ts (reutiliza MOTIVOS_ANULACION_PAGO de Compras para pagos)
├── componentes/       FormularioGasto.tsx, DrawerGasto.tsx
└── paginas/           GastosLayout.tsx, PaginaGastos.tsx, PaginaFormularioGasto.tsx, PaginaRegistrarPagoGasto.tsx
```

**Dependencias externas reutilizadas sin duplicar** (confirmado por imports reales, no solo por diseño previsto): `PageHeader`/`Breadcrumb` (`@/contasis`), `ColumnsManager`, `useFeedback`, `Drawer` (`@/shared/ui`), `ModalAnularDocumento`, `BuscadorProveedor`, `EditorMediosPagoCompra`, `AdjuntosCompra`, `FormularioPagoCompra` + `useFormularioPagoCompra` (Compras), `CreditScheduleModal`/`CreditPaymentMethodModal` (`@/shared/payments`), `currencyManager`, `exportDatasetToExcel`, `useAutoExportRequest`, `useCaja()`/`agregarMovimiento` (Caja), `aplicarPagoACuentaPorPagar`/`revertirPagoDeCuentaPorPagar`/`recalcularEstadoCuentaPorPagar` (motor genérico de CxP).

**Sin implementaciones duplicadas ni abandonadas**: confirmado por el agente de descubrimiento — una sola carpeta `gastos/`, sin variantes `-old`/`-legacy`/`-v2`, sin componentes comentados.

---

## 5. Flujo funcional encontrado

1. **Borrador** (opcional): `guardarBorradorGasto` con validación mínima (`validarMinimoBorradorGasto`), sin exigir serie ni fecha de vencimiento.
2. **Registro**: `registrarGasto` (o conversión de borrador vía `convertirBorradorEnRegistrado`) — valida campos mínimos, resuelve número de serie mediante `getNextExpenseDocument` (patrón preview + confirmación: primero calcula el correlativo, solo lo consume con `incrementSeriesCorrelative` si el resto de la operación tiene éxito), y si la condición es crédito genera una Cuenta por Pagar (`generarCuentaPorPagarDesdeGasto`) en el almacén compartido de Compras filtrado por `tipoOrigen: 'gasto'`.
3. **"Registrar y pagar"**: variante que registra el gasto y en la misma operación aplica un pago inmediato (valida que la suma de medios de pago iguale el total, registra movimiento de Caja por cada medio de caja usado, y sí propaga correctamente una `claveIdempotencia`).
4. **"Registrar pago" independiente**: desde el listado o el Drawer, abre `PaginaRegistrarPagoGasto` → reutiliza el formulario central de pagos de Compras (`FormularioPagoCompra`), con `tipoOrigen: 'gasto'` inyectado por dependencias. Aquí es donde se detectó que `claveIdempotencia` nunca se asigna (hallazgo P1, ver §10).
5. **Edición**: el nivel de edición depende de si hay pagos activos (`nivelEdicionGasto`): completa (borrador o registrado sin pagos), limitada (solo observaciones/adjuntos si hay pagos activos), bloqueada (anulado).
6. **Anulación**: bloqueada si el gasto tiene pagos activos (debe anularse cada pago primero) o si ya está anulado; si procede, anula también la CxP asociada y registra motivo + historial. Es lógica, nunca física.
7. **Anulación de un pago**: revierte la CxP (`revertirPagoDeCuentaPorPagar`) y registra un movimiento de Caja `Ingreso` compensatorio (nunca modifica el movimiento original), bloqueando la operación si la caja está cerrada.
8. **Consumo en Rentabilidad Operativa**: `consultaGastosOperativos.service.ts` proyecta cada gasto no anulado según su `fechaReconocimiento`, filtra por período/establecimiento, convierte a moneda base con TC histórico (excluyendo si falta), y `consultaRentabilidadVentas.service.ts` combina el total con la utilidad bruta ya calculada para producir Utilidad y Margen Operativo estimados.

---

## 6. Matriz de funcionalidades

| Funcionalidad | Implementada | Funciona correctamente | Evidencia | Observación |
|---|---|---|---|---|
| Listado con carga y estado vacío | Sí | Sí | `PaginaGastos.tsx:636-638` | Sin estado de "cargando" explícito (carga síncrona desde contexto) |
| Buscador (concepto/proveedor/documento/N° pago) | Sí | Sí, coincide con el placeholder | `consultaGastosOperativos.service.ts:188-204`, `PaginaGastos.tsx:492` | También busca por referencia interna, no anunciado en el placeholder (cobertura extra, no error) |
| Filtro por fechas | Sí | Sí, con "Ver todas las fechas" | `PaginaGastos.tsx:501-517` | No persiste entre recargas |
| Filtros adicionales (8: establecimiento, categoría, proveedor, condición de pago, estado documental, estado de pago, moneda, documento) | Sí | Sí | `PaginaGastos.tsx:526-589` | Sin botón único "Limpiar todos" (P2) |
| Configuración de columnas | Sí | Sí, persiste en localStorage | `PaginaGastos.tsx:99-119` (`ColumnsManager`) | Ninguna columna verdaderamente fija/bloqueada |
| Exportación a Excel | Sí | Sí, exporta todo lo filtrado | `PaginaGastos.tsx:404-415` | AutoExport (Reports Hub) excluye anulados por defecto; el botón manual no — asimetría documentada en código, no oculta |
| Ordenamiento de columnas | No | No aplica | — | Ausente, no bloqueante |
| Paginación | Sí, fija en 25 | Sí | `PaginaGastos.tsx:83` | Tamaño no configurable |
| Registro de gasto (borrador y completo) | Sí | Sí | `servicioGasto.ts:104-133`, `ContextoGastos.tsx:237-475` | Ver validaciones faltantes en §10 |
| Numeración por serie configurada | Sí | Sí, correlativo real (no hardcodeado) | `shared/series/expenseSeries.ts:46-56` | Sin lock ante concurrencia real (P2, heredado) |
| Edición con niveles (completa/limitada/bloqueada) | Sí | Sí | `servicioGasto.ts:411-433` | Doble enforcement (servicio + UI) |
| Anulación con reversión de CxP | Sí | Sí | `ContextoGastos.tsx:551-583` | Idempotente ante doble intento (bloquea explícitamente) |
| Registrar pago (independiente) | Sí | Parcial | `PaginaRegistrarPagoGasto.tsx`, `ContextoGastos.tsx:653-670` | Idempotencia de Pago no propagada (P1) |
| Registrar y pagar (inmediato) | Sí | Sí | `ContextoGastos.tsx:327-475` | Sí propaga idempotencia correctamente |
| Anular pago | Sí | Sí | `ContextoGastos.tsx:722-785` | Bloquea si caja cerrada, revierte CxP y Caja correctamente |
| Integración con Caja (efectivo) | Sí | Sí, en flujo normal | `ContextoGastos.tsx:657` | Sin guard de moneda extranjera (P1) |
| Integración con CxP/Pagos (aislamiento por origen) | Sí | Sí, con test dedicado | `aislamientoOrigenCxPyPagos.test.ts` | Sin doble contabilización verificada |
| Integración con Rentabilidad Operativa | Sí | Sí | `consultaRentabilidadVentas.service.ts:771-787` | No se refresca reactivamente sin remontar la página (P2) |
| Categorías (CRUD, semilla editable) | Sí | Sí | `CategoriaGasto.ts:22-33`, `useCategoriasGasto.ts` | Sin validación de nombres duplicados (P2) |
| Permisos por acción | Definidos en catálogo | No, sin efecto real | `catalogoPermisos.ts:453-481`, `SessionInitializer.tsx:71` | P1 (bypass sistémico + rutas no granulares) |
| Adjuntos | Sí (reutiliza `AdjuntosCompra`) | No verificado en detalle (fuera de alcance) | `FormularioGasto.tsx:629-636` | — |
| Impresión | Sí, genera HTML real vía motor compartido | Sí | `servicioImpresionGasto.ts:75-174`, consumido en `PaginaGastos.tsx:267`, `DrawerGasto.tsx:113` | Alias `descargarPdfGasto` sin consumidor (P3) |
| Historial/auditoría | Sí, con datos reales de sesión | Sí | `ContextoGastos.tsx:190,443,525,576,690,759,776` | Sin backend, por lo que no es a prueba de manipulación local (documentado, no aplica corregir en frontend) |

---

## 7. Integración con Caja

**Regla implementada**: solo los medios de pago marcados como caja (`esMedioDeCaja`, únicamente códigos SUNAT `008`/`009` "Efectivo") generan un movimiento en `useCaja().agregarMovimiento`. Transferencia, tarjeta, Yape, depósito, etc. nunca tocan Caja (`ContextoGastos.tsx:655`, `:739`, `:401` — todos con `continue`/skip explícito para medios no efectivo).

**Caja abierta**: exigida con **tres capas de guard** — en el hook de UI (`useFormularioPagoCompra.ts:388-390`, bloquea el submit), en el servicio de dominio (`ContextoGastos.tsx:635-637`, lanza excepción real), y dentro de `agregarMovimiento` mismo (`CajaContext.tsx:410-415`, pero este último nivel **retorna silenciosamente** sin lanzar excepción — es una debilidad de defensa en profundidad, mitigada en la práctica por las dos capas anteriores, documentada como P2 en §10).

**Un movimiento por medio de caja usado**: verificado — se recorre `mediosPago` y se llama `agregarMovimiento` una vez por cada línea de efectivo (no hay duplicación en el camino normal).

**Anulación de pago revierte Caja**: verificado — genera un `Ingreso` compensatorio (nunca modifica/borra el movimiento original), con `claveIdempotencia: reversion-${pagoId}` determinística que protege contra doble reversión, y bloquea la operación completa si la caja está cerrada en ese momento (`ContextoGastos.tsx:731-733`).

**Riesgo real detectado — moneda**: `Movimiento` (`control-caja/models/Caja.ts:50-75`) no tiene campo `moneda`; los toasts de Caja usan el prefijo `"S/"` hardcodeado (`CajaContext.tsx:339,460`). Un gasto en moneda extranjera pagado en efectivo pasa su `monto` sin conversión a `agregarMovimiento` — el número entra a Caja como si fueran soles. No existe ningún guard que lo bloquee o convierta. **Hallazgo P1** (§10, GAS-P1-004).

**Riesgo real detectado — idempotencia de Pago**: el flujo "Registrar pago" (vía `FormularioPagoCompra`/`useFormularioPagoCompra`) nunca asigna `claveIdempotencia` al construir `DatosPagoFormularioCentral` (`useFormularioPagoCompra.ts:454-469`), por lo que `buscarPagoPorClaveIdempotencia` siempre retorna `undefined` para ese flujo — la protección de idempotencia de Pago está desactivada de facto ahí (aunque el guard de doble-clic de UI, `enviando`, sí sigue activo). **Hallazgo P1** (§10, GAS-P1-003).

**agregarMovimiento no es idempotente por `id`** (usa `Date.now()`), pero la deduplicación real es por `claveIdempotencia` comparada contra movimientos existentes — mecanismo correcto cuando la clave se propaga (caso "Registrar y pagar"), inexistente cuando no se propaga (caso "Registrar pago").

**Establecimiento**: correctamente resuelto — la caja usada es la del establecimiento del gasto vía `resolveActiveCajaForEstablecimiento` (no por usuario), verificado como correcto.

---

## 8. Integración con Indicadores y rentabilidad

**Fórmula exacta** (`consultaRentabilidadVentas.service.ts:771-787`, transcrita literalmente por el agente auditor):

```ts
const utilidadOperativaEstimada = redondear(
  indicadoresRentabilidad.utilidadBrutaCubierta - indicadoresGastos.gastosOperativosReconocidos
);
const margenOperativoEstimado = indicadoresRentabilidad.ventaNetaCubierta !== 0
  ? utilidadOperativaEstimada / indicadoresRentabilidad.ventaNetaCubierta
  : null;
const esCompleto = indicadoresRentabilidad.coberturaPorcentaje === 100
  &amp;&amp; indicadoresGastos.lineasSinTipoCambio === 0;
```

Está **centralizada en un único lugar** (`calcularResultadoOperativo`), consumida sin reimplementar por `RentabilidadVentasPage.tsx`. "Gastos operativos reconocidos" viene, sin transformación adicional, de `calcularIndicadoresGastosOperativos` (`consultaGastosOperativos.service.ts:218-233`), que suma `importeReconocidoBase` calculado exclusivamente desde `Gasto.subtotal`/`Gasto.total` — nunca desde `CuentaPorPagar` ni `PagoCompra` (confirmado explícitamente, sin riesgo de doble conteo).

**Fuente de los importes**: exclusivamente el propio objeto `Gasto` (repositorio `repositorioGastos.ts`). CxP/Pagos de origen "gasto" se usan solo para exponer columnas informativas (saldo pendiente, número de pago), nunca se suman al total.

**Filtros aplicados y verificados con evidencia**:
- **Período**: filtra por `fechaReconocimiento` (nunca fecha de pago/emisión), comparación de strings ISO truncados a `YYYY-MM-DD` (`consultaGastosOperativos.service.ts:104-107`) — sin riesgo de desfase de zona horaria.
- **Establecimiento**: un gasto sin establecimiento (general) se excluye al filtrar por uno específico, y solo se incluye con el filtro "Todos" — nunca prorrateado automáticamente (`consultaGastosOperativos.service.ts:108`, con test dedicado).
- **Anulados**: excluidos de forma explícita y doblemente reforzada — `RentabilidadVentasPage.tsx:343-348` pasa `estadoDocumento: 'registrado'`, y además `proyectarFilasGastosOperativos` fuerza `importeReconocidoBase = 0` para `anulado`/`borrador` como salvaguarda adicional.
- **Moneda**: usa moneda base real (`currencyManager`), y tipo de cambio **histórico del propio gasto**, nunca el vigente ni asumido en 1. Si falta el TC, la línea se excluye del total y se cuenta en `lineasSinTipoCambio` (nunca produce un cálculo incorrecto silencioso).
- **Venta neta = 0**: el margen operativo retorna `null` explícitamente (nunca `Infinity`/`NaN`), con test dedicado (`consultaRentabilidadVentas.service.test.ts:750-756`) y manejo correcto en la UI (`'—'`).
- **Decimales**: redondeo consistente vía `round2`/`redondear` (mismo algoritmo `Math.round((n + Number.EPSILON) * 100) / 100`, duplicado en dos módulos pero idéntico — sin riesgo de discrepancia).
- **Cambio de filtro (período/establecimiento)**: sí dispara recálculo real vía cadena de `useMemo` con dependencias correctas, verificado.

**Tratamiento de anulaciones**: correcto y verificado — un gasto anulado nunca aparece en el cálculo, en ningún escenario.

**Riesgo real detectado**: `RentabilidadVentasPage.tsx:319-320` usa `useMemo(() => cargarGastos(), [])` con **arreglo de dependencias vacío** — el cálculo solo se relee al montar el componente, no ante cambios reactivos de `repositorioGastos` (no hay listener del evento `gastos_cambiados`). Si el usuario edita un gasto y vuelve a Rentabilidad sin que la página se desmonte, verá datos obsoletos hasta que se remonte (mitigado en la práctica por el comportamiento normal de React Router al cambiar de ruta, pero no garantizado explícitamente en el código). **Hallazgo P2** (§10, GAS-P2-003).

**Cobertura de pruebas**: ambos archivos de test (`consultaGastosOperativos.service.test.ts`, 56 tests; bloque de Utilidad Operativa en `consultaRentabilidadVentas.service.test.ts`) cubren explícitamente período, establecimiento, anulados, moneda extranjera sin TC y venta neta cero — sin solapamiento innecesario entre ambos (responsabilidad única respetada).

---

## 9. Relación con Compras, Cuentas por Pagar y Pagos

**Frontera funcional**: un Gasto es una entidad propia (`Gasto.ts`), nunca un `ComprobanteCompra` disfrazado. Cuando la condición de pago es crédito, genera una única Cuenta por Pagar (`generarCuentaPorPagarDesdeGasto`) en el **mismo almacén compartido** que usa Compras, distinguida por el campo `tipoOrigen: 'gasto'` (vs `'compra'`). Lo mismo aplica a Pagos (`tipoOrigen` en `PagoCompra`/`AplicacionPagoCompra`).

**Test dedicado de aislamiento**: `compras/repositorios/aislamientoOrigenCxPyPagos.test.ts` prueba explícitamente que filtrar por `'compra'` excluye las CxP/Pagos de `'gasto'` y viceversa, incluyendo el caso de totales agregados (`totalPendiente` filtrado por `'compra'` no incluye el saldo de una CxP de gasto) y la normalización de datos legacy sin `tipoOrigen` (se asumen `'compra'` por retrocompatibilidad). Esto es evidencia directa contra doble contabilización a nivel de agregados.

**¿Existe riesgo de doble contabilización?** **No, verificado con evidencia de código en dos agentes independientes** (integración Caja/CxP e Indicadores): `consultaGastosOperativos.service.ts` lee el importe reconocido exclusivamente de `Gasto.total`/`Gasto.subtotal`; la CxP y los pagos asociados se usan solo para exponer estado/columnas informativas, nunca se suman al monto del gasto. Un mismo desembolso no puede contarse como CxP y como gasto independiente porque son la misma entidad (relación 1:1 vía `cuentaPorPagarId`).

**Límite explícito documentado en el propio código y en la auditoría de diseño previa**: Gastos nunca genera una entrada de inventario (`LineaCompra` clasifica `'gasto'` como tipo no inventariable en el motor de Compras), y un consumo de inventario para uso interno (Suministros) no está integrado hoy con Gastos — queda fuera de alcance, documentado como brecha futura, no como error actual.

**No verificable dentro del alcance de esta auditoría**: si algún otro reporte fuera de los archivos leídos suma en paralelo `PagoCompra.montoTotalPagado` de origen `'gasto'` además de `Gasto.total` — no se encontró tal camino en los archivos auditados, pero no se revisó el 100% de los reportes del sistema.

---

## 10. Hallazgos

| ID | Severidad | Tipo | Hallazgo | Evidencia | Impacto | Corrección recomendada |
|---|---|---|---|---|---|---|
| GAS-P1-001 | P1 | Seguridad | Los permisos granulares de Gastos (`gastos.ver/crear/anular/pagar/categorias.gestionar`) no tienen efecto real en runtime: todo usuario autenticado recibe `permissions: ['*']` y el guard de rutas deja pasar por wildcard antes de evaluar el permiso real | `contexts/SessionInitializer.tsx:71`, `routes/PermisoGuard.tsx:26-28` | Cualquier usuario autenticado puede ver/crear/editar/anular/pagar gastos y gestionar categorías, sin importar su rol asignado | Corregir el guard para que evalúe permisos reales incluso si existe wildcard, o eliminar la asignación incondicional de `['*']` en `SessionInitializer.tsx`. Es un fix transversal (afecta a todos los módulos), no exclusivo de Gastos |
| GAS-P1-002 | P1 | Seguridad | Las 4 rutas de Gastos exigen únicamente `gastos.ver`, ignorando los permisos más finos (`gastos.crear`, `gastos.anular`, `gastos.pagar`) que sí existen en el catálogo | `routes/privateRoutes.tsx:206-209` | Incluso si se corrige GAS-P1-001, un usuario con permiso de solo "ver" gastos podría crear/editar/anular/pagar por URL directa | Aplicar `conPermisos(['gastos.crear'])`/`['gastos.anular']`/`['gastos.pagar']` a cada ruta según corresponda, en vez de `['gastos.ver']` para las 4 |
| GAS-P1-003 | P1 | Integración (Caja/Pagos) | La idempotencia de Pago está desactivada de facto en el flujo "Registrar pago" independiente: `claveIdempotencia` nunca se asigna al construir los datos del pago en ese flujo, por lo que la búsqueda de pago existente siempre retorna `undefined` | `compras/hooks/useFormularioPagoCompra.ts:454-469`, `gastos/contexto/ContextoGastos.tsx:616` | Riesgo real de duplicar un Pago y su movimiento de Caja asociado ante un reintento (recarga, doble envío que sortee el flag de UI). El guard de doble-clic de UI (`enviando`) sigue mitigando el caso más común, pero no es una defensa a nivel de dominio | Propagar una `claveIdempotencia` estable (generada una vez por sesión de formulario, igual que ya se hace en `FormularioGasto.tsx`) al construir `DatosPagoFormularioCentral` en `useFormularioPagoCompra.ts` |
| GAS-P1-004 | P1 | Integración (Caja) | Un gasto en moneda extranjera pagado en efectivo se registra en Caja sin conversión: `Movimiento` no tiene campo `moneda`, Caja asume soles de forma implícita (`"S/"` hardcodeado en toasts), y no existe ningún guard que bloquee o convierta el monto antes de `agregarMovimiento` | `control-caja/models/Caja.ts:50-75`, `gastos/contexto/ContextoGastos.tsx:403-414,656-667` | El saldo de Caja quedaría descuadrado (monto numérico tratado como soles cuando en realidad es otra moneda) | Restringir "pago en efectivo" a la moneda base mientras Caja no generalice multi-moneda (recomendación ya prevista en la auditoría de diseño previa, no implementada), o bloquear explícitamente ese combo con un mensaje de validación |
| GAS-P2-001 | P2 | Deuda técnica (heredada) | La numeración de gasto no tiene lock/transacción real ante concurrencia: dos registros simultáneos contra la misma serie podrían leer el mismo `correlativeNumber` y colisionar | `shared/series/expenseSeries.ts:46-56`, `gastos/contexto/ContextoGastos.tsx:267,287` | Colisión de número de gasto bajo uso concurrente real (dos pestañas/usuarios). Mismo patrón ya aceptado en RC/OC/Pagos de Compras | Documentar como riesgo conocido (no exclusivo de Gastos); una solución real requeriría un servicio central de correlativos con bloqueo, fuera del alcance de este módulo |
| GAS-P2-002 | P2 | Robustez | `agregarMovimiento` retorna silenciosamente (sin excepción) si no hay caja abierta, en vez de propagar el fallo al llamador | `control-caja/context/CajaContext.tsx:410-415` | Defensa en profundidad débil: si los dos guards previos (UI y servicio de Gastos) no capturaran correctamente el estado de la caja, el pago/CxP se daría por completado sin que el movimiento de Caja realmente exista | Documentar como riesgo heredado (afecta también a Compras/Cobranzas); idealmente `agregarMovimiento` debería lanzar/retornar un resultado que el llamador pueda verificar |
| GAS-P2-003 | P2 | Integración (Indicadores) | El cálculo de Rentabilidad Operativa no se recalcula reactivamente si se edita un gasto sin que `RentabilidadVentasPage` se desmonte (`useMemo` con dependencias vacías, sin listener del evento de cambio de Gastos) | `indicadores-negocio/pages/RentabilidadVentasPage.tsx:319-320` | Datos potencialmente obsoletos si el componente permanece montado tras editar un gasto en otra pestaña/ventana | Agregar dependencia real o suscripción al evento `gastos_cambiados` para forzar recálculo |
| GAS-P2-004 | P2 | Validación / UX | Los campos "Tipo de cambio" e "Impuesto aplicable" se marcan visualmente como obligatorios (`*`) en el formulario, pero no existe validación real que bloquee el envío si quedan vacíos | `FormularioGasto.tsx:594,600`, ausencia en `servicioGasto.ts` (`calcularErroresGasto`/`validarGastoBasico`) | Inconsistencia entre la UI y las reglas de negocio; permite guardar un gasto sin TC pese a marcarlo obligatorio (mitigado parcialmente porque Rentabilidad excluye esas líneas del cálculo en vez de calcular mal) | Agregar la validación real correspondiente en `servicioGasto.ts`, o quitar el asterisco visual si la regla de negocio es intencionalmente opcional |
| GAS-P2-005 | P2 | UX | No existe un botón único "Limpiar todos los filtros"; ningún filtro (búsqueda, fechas, categoría, proveedor, etc.) persiste entre recargas de página; no hay ordenamiento de columnas ni tamaño de página configurable (fijo en 25) | `PaginaGastos.tsx` (líneas 83, 194-195, 501-589) | Fricción de UX, no bloqueante | Agregar reseteo global de filtros y considerar persistencia ligera (ej. en `sessionStorage`) |
| GAS-P2-006 | P2 | Validación | No existe validación de tipo de cambio al **registrar** un gasto en moneda extranjera (solo se valida al momento de pagar) — confirmado como decisión de diseño explícita en el propio test, pero es una brecha real en el punto de entrada | `gastos/contexto/ContextoGastos.tsx:237-475` (ausencia), `servicioGasto.test.ts:659-665` | Permite crear (e incluso "Registrar y pagar") un gasto en USD sin TC; Rentabilidad lo excluye correctamente del cálculo (no hay cálculo incorrecto), pero el dato queda incompleto sin aviso en el momento del registro | Evaluar agregar la misma validación de TC ya existente para el pago (`validarTipoCambioRequerido`) también al registrar, si el negocio lo requiere |
| GAS-P2-007 | P2 | Categorías | No existe validación de nombres de categoría duplicados (ni exacta ni case-insensitive) | `servicioCategoriaGasto.ts:38-61`, `SeccionCategoriasGasto.tsx:30` | Es posible crear "Alquileres" y "alquileres " como categorías distintas | Agregar comparación normalizada (`trim().toLowerCase()`) antes de crear/editar |
| GAS-P2-008 | P2 | Calidad de pruebas | El test de idempotencia de pago (`idempotenciaPagoGasto.integration.test.ts`) corre en `environment: 'node'` (localStorage siempre vacío) y usa una reimplementación manual (`simularRegistrarPagoGasto`) en vez de ejercitar el hook/contexto real — por eso los 10 tests pasan en verde sin detectar el hallazgo GAS-P1-003 | `gastos/contexto/idempotenciaPagoGasto.integration.test.ts:14-24,84-121` | Falsa sensación de cobertura: "tests en verde" no implica que el flujo real de "Registrar pago" esté cubierto | Agregar un test que monte el `GastosProvider` real y ejercite `PaginaRegistrarPagoGasto`/`useFormularioPagoCompra` con jsdom, para detectar huecos como GAS-P1-003 |
| GAS-P2-009 | P2 | Validación | No existe validación explícita de `NaN` en `total`; mitigado indirectamente porque el único formulario productor normaliza `Number(monto) || 0` antes de enviar | `servicioGasto.ts:119-121`, `FormularioGasto.tsx:267` | Bajo impacto práctico hoy (un solo punto de entrada), pero es una brecha real si en el futuro otro consumidor construye `DatosNuevoGasto` sin pasar por el formulario | Agregar `Number.isFinite(datos.total)` a la validación central |
| GAS-P2-010 | P2 | Validación | El motivo de anulación no valida contenido no vacío a nivel de servicio (`anularGasto` acepta cualquier string, incluida cadena vacía) | `gastos/contexto/ContextoGastos.tsx:551-583`, `useContextoGastos.ts:62` | Bajo impacto si la UI ya exige el campo (no auditado en detalle), pero el servicio no lo garantiza por sí mismo | Agregar `motivo.trim()` no vacío en `anularGasto` |
| GAS-P3-001 | P3 | Código muerto | `descargarPdfGasto` (alias de `imprimirGasto`) está exportado pero no tiene ningún consumidor en el resto del código | `servicios/servicioImpresionGasto.ts:176` | Ninguno | Eliminar el alias si se confirma que no se usará, o documentar su propósito futuro |
| GAS-P3-002 | P3 | Calidad de código | `agregarOActualizarGasto` muta directamente el array devuelto por `cargarGastos()` en vez de crear una copia inmutable | `repositorios/repositorioGastos.ts:46-55` | Bajo riesgo práctico (el array es recién parseado de JSON, sin referencia compartida con el estado de React) | Usar `[...gastos]`/`.map()` para mantener el patrón inmutable declarado en los comentarios del propio código |
| GAS-P3-003 | P3 | Calidad de código | La función de redondeo (`round2`/`redondear`) está duplicada textualmente en dos módulos distintos (`compras/logica/reglasCompras.ts` e `indicadores-negocio/services/consultaRentabilidadVentas.service.ts`) | `reglasCompras.ts:1228-1230`, `consultaRentabilidadVentas.service.ts:228-230` | Ninguno funcional (implementaciones idénticas), solo mantenibilidad | Extraer a una única utilidad compartida si se desea reducir duplicación |
| GAS-P3-004 | P3 | Calidad de código | `console.error` en el catch de exportación a Excel (Gastos y Rentabilidad) | `PaginaGastos.tsx:410`, `RentabilidadVentasPage.tsx:531` | Ninguno (manejo de error legítimo, no un log de depuración olvidado) | Ninguna acción requerida |

---

## 11. Código muerto, warnings y deuda técnica

- **Código muerto confirmado**: `descargarPdfGasto` (GAS-P3-001), sin otro caso detectado en los 24 archivos productivos auditados de `gastos/`.
- **Warnings de build/lint**: 0 (ver §13).
- **`eslint-disable`**: ninguno dentro de `gastos/`. Existe uno en `control-caja/context/CajaContext.tsx:1` (`react-refresh/only-export-components`), preexistente y fuera del módulo de Gastos.
- **`TODO`/`FIXME`/`HACK`**: ninguno real dentro de `gastos/` (solo falsos positivos de la palabra española "todo/TODOS" en comentarios). Sí existen 2 `TODO` reales preexistentes en `control-caja/context/CajaContext.tsx:331,389`, ajenos a Gastos.
- **`any`/`@ts-ignore`/`@ts-expect-error`**: ninguno en `gastos/`.
- **`console.log`**: ninguno. `console.error`/`console.warn` legítimos en manejo de errores (catch de exportación en Gastos y Rentabilidad; catch de carga/persistencia de historial en Caja, preexistente).
- **Mutación directa de arrays**: un caso de bajo impacto (GAS-P3-002).
- **Catch funcionalmente vacíos**: 2 casos preexistentes en Compras (`repositorioCuentasPorPagar.ts:34-36`, `repositorioPagosCompra.ts:28-30`, "ignorar cuota de almacenamiento"), no específicos de Gastos.
- **Duplicación de lógica**: función de redondeo duplicada (GAS-P3-003); patrón ad-hoc de numeración por serie repetido una cuarta vez (GAS-P2-001, heredado y ya aceptado como riesgo conocido desde la auditoría de diseño previa).

---

## 12. Hardcodes y fuentes de verdad

| Hardcode encontrado | Ubicación | Clasificación |
|---|---|---|
| IDs de categoría semilla (`catgasto-semilla-${indice}`) | `repositorioCategoriasGasto.ts:25` | Dato semilla legítimo (determinístico, documentado) |
| `Date.now()-Math.random()` para IDs internos (categoría nueva, medio de pago, clave de idempotencia) | `useCategoriasGasto.ts:39`, `ContextoGastos.tsx:69`, `FormularioGasto.tsx:89,246` | Valor de fallback válido (mismo patrón usado en todo el código base) |
| `'PEN'`, "18%", `'GTO-00000001'`/`'PG01-...'` | Exclusivamente en archivos `*.test.ts` (fixtures) | Sin impacto real — no aparecen en código de producción; el código real usa `config.taxes`, `currencyManager` y series configuradas |
| `"S/"` en toasts de Caja | `control-caja/context/CajaContext.tsx:339,460` | Hardcode funcional incorrecto en el contexto de Gastos en moneda extranjera — parte de GAS-P1-004, no cosmético en ese escenario específico |
| Motivos de anulación de Gasto (5 strings fijos) | `constantes/motivosAnulacionGasto.ts:7-13` | Dato semilla/lista fija aceptada — mismo patrón ya usado en Compras (4 listas fijas equivalentes), no configurable en ningún módulo del sistema, decisión de diseño consistente |
| Tamaño de página fijo (25) | `PaginaGastos.tsx:83` | Valor de fallback válido, no configurable (mejora, no error) |

**No se encontraron** hardcodes de: series (`G001`), establecimiento (`0001`), IGV en cálculo real, moneda en cálculo real, categorías como string literal en lógica de negocio, ni usuario/empresa fijos. Todos estos provienen de configuración real (catálogo de Series, `currencyManager`, `config.taxes`, catálogo de categorías, sesión activa).

---

## 13. Resultados de comandos técnicos

| Comando | Resultado | Errores | Warnings | Observación |
|---|---|---|---|---|
| `npx tsc -b --noEmit` (desde `apps/senciyo`) | ✅ Limpio | 0 | 0 | Salida vacía (sin diagnósticos) |
| `npx eslint .` (desde `apps/senciyo`) | ✅ Limpio | 0 | 0 | Salida vacía (sin diagnósticos) |
| `npm run build` (desde `apps/senciyo`, `tsc -b && vite build`) | ✅ Exitoso | 0 | 0 | 3746 módulos transformados, build en 26.85s. Chunks de Gastos generados correctamente (`PaginaGastos`, `PaginaFormularioGasto`, `GastosLayout`, `consultaGastosOperativos.service`, etc.) |
| `npx vitest run` (desde `apps/senciyo`) | ✅ 1550/1550 pasando | 0 | 0 (1 mensaje de log esperado de un test de Kardex, no relacionado a Gastos) | 80 archivos de test, incluyendo 9 exclusivos de Gastos (`servicioGasto.test.ts`: 86, `consultaGastosOperativos.service.test.ts`: 56, más 7 archivos adicionales) y 3 de integración cruzada (`aislamientoOrigenCxPyPagos.test.ts`, `consultaRentabilidadVentas.service.test.ts`, `reportDefinitions.test.ts`) |
| `git status --short` (antes y después) | ✅ Limpio | — | — | Ningún archivo modificado durante la auditoría |

Ninguna validación falló ni pertenece parcialmente al módulo de Gastos — todas están 100% limpias. Esto certifica que el hallazgo P1-003 (idempotencia) **no es detectado por la suite de tests actual** (ver GAS-P2-008): "tests en verde" en este módulo no equivale a "todos los flujos reales verificados".

---

## 14. Casos de prueba

| Caso | Resultado | Evidencia | Observación |
|---|---|---|---|
| 1. Registrar gasto pagado en moneda base | Aprobada | `registrarGastoConPagoInmediato.integration.test.ts` (14 tests) | — |
| 2. Registrar gasto pendiente (crédito) | Aprobada | `servicioGasto.test.ts`, `registrarGastoSerie.integration.test.ts` | Genera CxP `pendiente` |
| 3. Registrar gasto con importe decimal | Aprobada | `servicioImpuestoGasto.ts` (`round2`) | Redondeo consistente a 2 decimales |
| 4. Registrar gasto con total cero | Aprobada (bloqueado correctamente) | `servicioGasto.ts:119-121` | Mensaje "El total debe ser mayor a 0" |
| 5. Registrar gasto con total negativo | Aprobada (bloqueado correctamente) | `servicioGasto.ts:119-121` (misma condición `&lt;=0`) | — |
| 6. Registrar dos gastos consecutivos y validar correlativo | Aprobada (en flujo secuencial normal) | `registrarGastoSerie.integration.test.ts` | No probado el caso de concurrencia real (ver GAS-P2-001) |
| 7. Editar importe | Aprobada (con reglas de nivel) | `servicioGasto.test.ts:377-382` | Solo en nivel "completa" (sin pagos activos) |
| 8. Editar fecha | Aprobada | `ContextoGastos.tsx:517` (`crearGasto` reconstruye) | — |
| 9. Editar categoría | Aprobada | Igual mecanismo que 7-8 | — |
| 10. Anular gasto | Aprobada | `servicioGasto.test.ts:614-619` | Bloqueado si hay pagos activos |
| 11. Intentar anularlo nuevamente | Aprobada (bloqueado correctamente) | `servicioGasto.ts:475` | "Este gasto ya fue anulado." |
| 12. Validar listado después de recargar | Aprobada | `repositorioGastos.ts` (localStorage persistente) | — |
| 13. Buscar por concepto | Aprobada | `consultaGastosOperativos.service.ts:188-204` | — |
| 14. Buscar por proveedor | Aprobada | Igual función | — |
| 15. Buscar por número | Aprobada | Igual función (serie/documento/N° pago) | — |
| 16. Filtrar por fecha | Aprobada | `PaginaGastos.tsx:501-517`, `consultaGastosOperativos.service.ts:104-107` | — |
| 17. Exportar | Aprobada | `PaginaGastos.tsx:404-415` | Exporta todas las filas filtradas |
| 18. Cambiar columnas | Aprobada | `ColumnsManager`, persistencia localStorage | — |
| 19. Validar paginación | Aprobada (con limitación) | `PaginaGastos.tsx:83,706-708` | Tamaño fijo en 25 (GAS-P2-005) |
| 20. Validar impacto en Caja | Aprobada | `ContextoGastos.tsx:653-670` | Un movimiento por medio de caja |
| 21. Validar reversión en Caja | Aprobada | `ContextoGastos.tsx:722-785` | Ingreso compensatorio, bloquea si caja cerrada |
| 22. Validar impacto en Indicadores | Aprobada | `consultaRentabilidadVentas.service.test.ts:737-748` | — |
| 23. Validar reversión en Indicadores | Aprobada | Exclusión de anulados doblemente reforzada | — |
| 24. Validar filtro por establecimiento | Aprobada | `consultaGastosOperativos.service.ts:108` con test dedicado | — |
| 25. Validar gasto en otra moneda | Fallida (parcial) | GAS-P1-004, GAS-P2-006 | Sin conversión en Caja; sin validación de TC al registrar |
| 26. Validar usuario sin permiso | Fallida | GAS-P1-001, GAS-P1-002 | Permisos sin efecto real; rutas no granulares |
| 27. Validar error de persistencia/API | No aplica | Sin backend real (100% localStorage) | El manejo de error cubre el catch de exportación; no hay llamadas de red que fallar |
| 28. Validar doble clic en guardar | Aprobada (registro) / Fallida (pago independiente) | `FormularioGasto.tsx:747,759,767,801` (flag `enviando`) vs GAS-P1-003 | Registro de gasto sí previene doble envío; el flujo "Registrar pago" carece de idempotencia de dominio (solo UI) |
| 29. Validar recarga durante el registro | No ejecutable | No hay entorno de navegador real disponible en esta auditoría para reproducir manualmente | Evaluado por lectura de código: la clave de idempotencia de "Registrar y pagar" mitigaría un reintento tras recarga si el usuario reenvía con la misma clave; el flujo "Registrar pago" no |
| 30. Validar que no exista doble contabilización con Compras/Pagos | Aprobada | `aislamientoOrigenCxPyPagos.test.ts`, `consultaGastosOperativos.service.ts` (fuente única `Gasto.total`) | Verificado con evidencia de código en dos agentes independientes |

---

## 15. Archivos críticos revisados

| Archivo | Responsabilidad |
|---|---|
| `gastos/modelos/Gasto.ts` | Modelo de dominio, estados documentales/de pago, tipos de adjunto |
| `gastos/modelos/CategoriaGasto.ts` | Modelo y semilla de categorías |
| `gastos/servicios/servicioGasto.ts` | Reglas puras: validación, creación, niveles de edición, bloqueo de anulación, resolución de estado de pago |
| `gastos/servicios/servicioCategoriaGasto.ts` | CRUD puro de categorías, conteo de uso |
| `gastos/servicios/servicioCuentaPorPagarGasto.ts` | Mapeo Gasto → CuentaPorPagar (cronograma de cuotas) |
| `gastos/servicios/servicioImpuestoGasto.ts` | Motor tributario del gasto (reutiliza reglas de Compras) |
| `gastos/servicios/servicioImpresionGasto.ts` | Representación imprimible del gasto (HTML real) |
| `gastos/servicios/consultaGastosOperativos.service.ts` | Proyección de lectura (listado/Excel/Reports Hub/Rentabilidad) |
| `gastos/repositorios/repositorioGastos.ts` | Persistencia localStorage tenantizada de gastos |
| `gastos/repositorios/repositorioCategoriasGasto.ts` | Persistencia localStorage tenantizada de categorías |
| `gastos/contexto/ContextoGastos.tsx` | Orquestación de comandos (registrar/editar/anular/pagar/anular pago), reducer de estado |
| `gastos/contexto/useContextoGastos.ts` | Definición de contexto y tipos de estado |
| `gastos/hooks/useCategoriasGasto.ts` | Hook CRUD de categorías con sincronización por evento |
| `gastos/constantes/motivosAnulacionGasto.ts` | Motivos fijos de anulación (reutiliza los de Pago de Compras) |
| `gastos/componentes/FormularioGasto.tsx` | Formulario de alta/edición completo |
| `gastos/componentes/DrawerGasto.tsx` | Panel de detalle de solo lectura (4 tabs) |
| `gastos/paginas/PaginaGastos.tsx` | Listado, filtros, columnas, exportación |
| `gastos/paginas/PaginaFormularioGasto.tsx` | Wrapper de ruta para alta/edición |
| `gastos/paginas/PaginaRegistrarPagoGasto.tsx` | Wrapper de ruta que reutiliza `FormularioPagoCompra` |
| `gastos/paginas/GastosLayout.tsx` | Layout de rutas anidadas con `GastosProvider` |
| `shared/series/expenseSeries.ts` | Resolución de correlativo de serie para Gasto |
| `control-caja/context/CajaContext.tsx` | `agregarMovimiento`, guard de caja abierta |
| `control-caja/models/Caja.ts` | Modelo de `Movimiento` (sin campo moneda) |
| `compras/servicios/servicioCuentaPorPagar.ts` | Motor genérico de aplicar/revertir pago (reutilizado sin cambios) |
| `compras/servicios/servicioPagoCompra.ts` | Validación de pagos, `esMedioDeCaja`, idempotencia por clave |
| `compras/hooks/useFormularioPagoCompra.ts` | Hook de formulario de pago central (usado por Gastos vía inyección) |
| `compras/repositorios/aislamientoOrigenCxPyPagos.test.ts` | Test dedicado de aislamiento CxP/Pagos por origen |
| `indicadores-negocio/pages/RentabilidadVentasPage.tsx` | Consumo de Gastos para Utilidad Operativa |
| `indicadores-negocio/services/consultaRentabilidadVentas.service.ts` | Fórmula de Utilidad/Margen Operativo |
| `configuracion-sistema/roles/catalogoPermisos.ts` | Catálogo de los 5 permisos de Gastos |
| `contexts/SessionInitializer.tsx` | Origen del bypass de permisos (`['*']`) |
| `routes/PermisoGuard.tsx` | Guard de rutas afectado por el bypass |
| `routes/privateRoutes.tsx` | Cableado de rutas y permisos de Gastos |

---

## 16. Archivos posiblemente obsoletos o duplicados

**No se encontró ningún archivo duplicado, legacy o abandonado** en `gastos/` (confirmado por el agente de descubrimiento con múltiples patrones de búsqueda). El único elemento "posiblemente obsoleto" es de alcance muy acotado:

- `servicios/servicioImpresionGasto.ts:176` — el export `descargarPdfGasto` (alias de `imprimirGasto`) no tiene ningún import en el resto de `apps/senciyo/src`. Parece un remanente de una API pensada para descarga directa de PDF que terminó no usándose (la impresión real usa el diálogo nativo del navegador vía `imprimirGasto`). No se recomienda eliminarlo sin confirmar con el equipo si está previsto para uso futuro — se documenta como hallazgo P3, no como acción a tomar unilateralmente.

---

## 17. Riesgos pendientes

**Riesgos funcionales**:
- Gasto en moneda extranjera sin TC puede registrarse (incluso "Registrar y pagar") sin aviso en el momento de creación (GAS-P2-006); se excluye correctamente de Rentabilidad, pero el usuario no es advertido de inmediato.
- Permisos de Gastos no restringen nada en runtime (GAS-P1-001, GAS-P1-002).

**Riesgos técnicos**:
- Colisión de numeración de serie bajo concurrencia real, no cubierta por tests (GAS-P2-001), heredada del mismo patrón usado en Compras/Pagos.
- Idempotencia de Pago desactivada de facto en un flujo real (GAS-P1-003), no detectada por la suite de tests actual (GAS-P2-008).
- `agregarMovimiento` falla silenciosamente sin caja abierta en su capa más interna (GAS-P2-002), dependiendo de las capas superiores para no dejar estado inconsistente.

**Riesgos de datos**:
- Todo el módulo persiste en `localStorage` sin backend — no hay control de acceso de servidor, ni respaldo distinto al del navegador del usuario. El log de auditoría (historial, `creadoPor`, `anuladoPor`) es real en el sentido de que se llena con datos verdaderos de sesión, pero no es inmutable ni a prueba de manipulación del lado del cliente (limitación arquitectónica general del sistema, no exclusiva de Gastos).
- Mutación directa de array en el repositorio (GAS-P3-002), de bajo riesgo práctico actual.

**Riesgos de integración**:
- Gasto en moneda extranjera pagado en efectivo descuadra Caja (GAS-P1-004), por ausencia de campo de moneda en `Movimiento`.
- Rentabilidad Operativa no se refresca reactivamente sin remontar la página (GAS-P2-003).

**Riesgos de seguridad**:
- Bypass de permisos sistémico (GAS-P1-001), agravado en Gastos por falta de granularidad en las rutas (GAS-P1-002).
- Aislamiento entre empresas depende íntegramente de que el `localStorage` esté correctamente namespaced por tenant activo (`tryLsKey`) y de que el usuario no pueda fijar manualmente un tenant ajeno — no se verificó en profundidad la capa de `TenantProvider`/pertenencia usuario↔empresa (fuera del alcance leído en esta auditoría); no se encontró evidencia de que sea explotable hoy, pero tampoco existe una segunda validación de dominio (`if (gasto.empresaId !== tenantActivo)`) que actúe como defensa en profundidad.

---

## 18. Plan de corrección recomendado

No se implementa en esta auditoría. Orden sugerido:

**1. Bloqueantes**: no aplica — no se identificó ningún P0.

**2. Críticas (P1)**:
1. GAS-P1-001 — Corregir el guard de permisos (`PermisoGuard.tsx`) y/o la asignación incondicional de `['*']` en `SessionInitializer.tsx`. Es un fix transversal que beneficia a todos los módulos, no solo a Gastos; debe coordinarse con el equipo dueño de sesión/autenticación.
2. GAS-P1-002 — Ajustar `privateRoutes.tsx` para exigir el permiso específico de cada ruta de Gastos (`gastos.crear`, `gastos.anular`, `gastos.pagar`) en vez de `gastos.ver` uniformemente.
3. GAS-P1-003 — Propagar `claveIdempotencia` en `useFormularioPagoCompra.ts` (o en el punto donde `PaginaRegistrarPagoGasto` inyecta dependencias) para que el flujo "Registrar pago" tenga la misma protección que "Registrar y pagar".
4. GAS-P1-004 — Decidir y aplicar: restringir pago en efectivo a la moneda base en el formulario de pago de Gastos, o agregar conversión/campo de moneda en `Movimiento` de Caja (impacto transversal, requiere decisión de producto).

**3. Importantes (P2)**: GAS-P2-001 a GAS-P2-010, en el orden de impacto sugerido: primero validaciones de formulario (GAS-P2-004, GAS-P2-006, GAS-P2-009, GAS-P2-007, GAS-P2-010) por ser cambios acotados y de bajo riesgo; luego reactividad de Rentabilidad (GAS-P2-003); luego robustez de Caja (GAS-P2-002); luego cobertura de test real del flujo de pago (GAS-P2-008); la numeración concurrente (GAS-P2-001) y la UX de filtros/paginación (GAS-P2-005) quedan como mejoras de mayor esfuerzo relativo.

**4. Mejoras (P3)**: GAS-P3-001 a GAS-P3-004, sin urgencia.

---

## 19. Checklist para cierre

- [x] Registro completo (borrador + registrado, con validaciones reales de campos obligatorios, total &gt; 0)
- [x] Edición consistente (niveles completa/limitada/bloqueada, con doble enforcement servicio+UI)
- [x] Anulación consistente (lógica, con reversión de CxP, idempotente ante doble intento)
- [x] Numeración desde fuente de verdad (catálogo de Series, correlativo real, se conserva al editar/anular)
- [ ] Integración correcta con Caja — **parcial**: correcta en flujo normal (efectivo, un movimiento por medio, reversión con Ingreso compensatorio), pero con 2 hallazgos P1 (idempotencia de pago no propagada, sin guard de moneda extranjera)
- [x] Integración correcta con Indicadores (fórmulas correctas, centralizadas, sin división por cero, anulados excluidos; con una brecha P2 de reactividad, no de corrección del cálculo)
- [x] Sin doble contabilización (verificado con evidencia de código y test dedicado)
- [ ] Permisos validados — **no**: sin efecto real en runtime (GAS-P1-001) y sin granularidad aplicada en rutas (GAS-P1-002)
- [x] Filtros validados (8 filtros + búsqueda + fechas, funcionan correctamente; falta botón de limpieza global, P2)
- [x] Exportación validada (exporta todas las filas filtradas, no solo la página visible)
- [ ] Moneda y tipo de cambio validados — **parcial**: correctos en el cálculo de Rentabilidad (excluye sin TC), pero sin validación al registrar (P2) y sin guard en Caja (P1)
- [x] Build correcto (0 errores)
- [x] TypeScript correcto (0 errores)
- [x] Lint correcto (0 errores/warnings)
- [x] Sin P0
- [ ] Sin P1 — **existen 4** (ver §10)

---

## 20. Conclusión final

1. **¿El módulo de Gastos está completo?** Funcionalmente sí, en su alcance previsto (registro, edición por niveles, anulación, categorías, numeración por serie, integración con pagos e indicadores). No están implementados "Recurrentes" ni un desglose monetario de impuesto recuperable — ambos estaban explícitamente fuera del alcance de fase 1 según la auditoría de diseño previa, por lo que no se marcan como faltantes sino como "Fuera del alcance" confirmado.
2. **¿Está correctamente integrado con Caja?** Parcialmente. El flujo normal (pago en efectivo, en moneda base, reversión al anular) funciona correctamente y con guards reales. Existen dos brechas verificadas y no triviales: idempotencia de pago no propagada en el flujo "Registrar pago" (GAS-P1-003) y ausencia de guard para moneda extranjera pagada en efectivo (GAS-P1-004).
3. **¿Está correctamente integrado con Indicadores?** Sí. Fórmulas centralizadas, correctas, con exclusión doblemente reforzada de anulados, conversión con TC histórico (nunca asumido), y guard explícito contra división por cero. Única salvedad: falta de recálculo reactivo si la página no se remonta (GAS-P2-003, no afecta la corrección del cálculo, solo su frescura en un escenario específico).
4. **¿Los gastos se descuentan correctamente de la rentabilidad?** Sí, verificado con evidencia de código y tests: se incluyen desde `fechaReconocimiento` (no la de pago), respetando período y establecimiento, excluyendo anulados y líneas sin tipo de cambio.
5. **¿Existe doble contabilización con Compras o Pagos?** No, verificado. El monto se lee una única vez, directamente de `Gasto.total`/`Gasto.subtotal`; CxP y Pagos de origen "gasto" se usan solo para presentación, con un test dedicado de aislamiento por origen.
6. **¿Existen hardcodes o parches?** No se encontraron hardcodes funcionales que alteren cálculos de producción. El único hardcode con impacto real es el prefijo `"S/"` en Caja, relevante solo en el escenario de moneda extranjera (parte de GAS-P1-004).
7. **¿Existe código muerto o deuda técnica?** Mínima: un alias sin consumidor (`descargarPdfGasto`), una mutación de array no estrictamente inmutable, y una función de redondeo duplicada entre dos módulos — ninguna con impacto funcional.
8. **¿Puede darse por cerrado?** No todavía. El núcleo funcional es sólido y está bien probado, pero existen 4 hallazgos P1 verificados con evidencia exacta que, por definición de esta auditoría, impiden certificar el cierre con seguridad.
9. **¿Qué correcciones exactas son obligatorias antes de cerrarlo?** Las 4 de §18-2: (a) restaurar el efecto real del guard de permisos o la asignación de `SessionInitializer.tsx` (fix transversal), (b) aplicar los permisos específicos por ruta de Gastos en `privateRoutes.tsx`, (c) propagar `claveIdempotencia` en el flujo "Registrar pago" (`useFormularioPagoCompra.ts`), y (d) decidir e implementar una restricción o conversión para gasto en moneda extranjera pagado en efectivo en Caja.

---

# Revalidación posterior a las correcciones

Auditoría de solo lectura seguida de implementación real (esta sí modifica código, a diferencia de la auditoría original de arriba). Alcance: corregir exclusivamente los 4 hallazgos P1 (GAS-P1-001 a GAS-P1-004), GAS-P2-003, y alinear las validaciones de UI/dominio señaladas en el encargo (tipo de cambio, impuesto aplicable, total, motivo de anulación, categorías duplicadas). No se tocó ningún otro P2/P3, no se rediseñó el módulo, no se agregaron dependencias nuevas, no se modificó el lockfile.

**Nota sobre `git status`**: al iniciar esta corrección el árbol estaba limpio salvo por este mismo informe (`docs/AUDITORIA_EXHAUSTIVA_MODULO_GASTOS.md`), ya creado en la auditoría previa. Al terminar, el árbol de trabajo **no está limpio**: contiene 21 archivos de código/tests modificados y 1 archivo de test nuevo, todos deliberados y parte de esta corrección (detalle exacto en "Archivos creados" y en el listado de "Correcciones implementadas" de abajo). "Sin modificaciones funcionales" describe la auditoría original; ya no describe el estado actual del repositorio, que sí tiene modificaciones funcionales — las de esta tarea.

## Correcciones implementadas

| Hallazgo | Estado | Archivos modificados | Solución aplicada |
|---|---|---|---|
| GAS-P1-001 | Corregido | `contexts/SessionInitializer.tsx`, `routes/PermisoGuard.tsx`, `configuracion-sistema/utilidades/permisos.ts` | `SessionInitializer.tsx` ya no asigna `permissions: ['*']` de forma incondicional: `resolverPermisosSesion` calcula los permisos reales del usuario a partir de sus roles asignados (`obtenerPermisosDeUsuario`), y solo agrega `'*'` cuando esos permisos cubren el 100% de `CATALOGO_PERMISOS` (`tieneAccesoTotalCatalogo`) — sin hardcodear ningún id/nombre de rol. `PermisoGuard.tsx` ya no confía en el wildcard de sesión: resuelve `usuarioActual` en cada render y evalúa `tieneAlgunoDePermisos` contra `state.users`/`rolesConfigurados` en tiempo real; si el usuario aún no está aprovisionado (instante posterior al login), espera (`return null`) en vez de denegar falsamente. |
| GAS-P1-002 | Corregido | `routes/privateRoutes.tsx`, `gastos/contexto/ContextoGastos.tsx`, `gastos/hooks/useCategoriasGasto.ts`, `gastos/paginas/PaginaGastos.tsx`, `gastos/componentes/DrawerGasto.tsx`, `gastos/componentes/FormularioGasto.tsx` | Rutas: `/gastos/nuevo` y `/gastos/:id/editar` ahora exigen `gastos.crear` (antes `gastos.ver`); `/gastos/:id/pagar` exige `gastos.pagar`. Render/habilitación: los botones de crear/editar/duplicar, pagar y anular en `PaginaGastos.tsx`/`DrawerGasto.tsx`/`FormularioGasto.tsx` se ocultan según el permiso real del usuario (misma fuente `tienePermiso`). Comando: cada función de `ContextoGastos.tsx` (`registrarGasto`, `guardarBorradorGasto`, `descartarBorradorGasto`, `editarGasto` → `gastos.crear`; `registrarGastoConPagoInmediato` → `gastos.crear` + `gastos.pagar`; `anularGasto` → `gastos.anular`; `registrarPagoGastoCentral`, `anularPagoGasto` → `gastos.pagar`) verifica el permiso ANTES de ejecutar, y `useCategoriasGasto.ts` exige `gastos.categorias.gestionar` en crear/editar/desactivar/reactivar — rechazando la operación aunque se invoque el comando directamente, sin pasar por la UI. |
| GAS-P1-003 | Corregido | `compras/hooks/useFormularioPagoCompra.ts`, `gastos/contexto/idempotenciaPagoGasto.integration.test.ts` | `useFormularioPagoCompra.ts` genera `claveIdempotencia` una sola vez por sesión del formulario (`useState(() => generarClaveIdempotenciaPago())`), la propaga al payload real (`construirDatosPagoCentral`, extraída como función pura y exportada) y la renueva solo tras un registro exitoso — nunca dentro de cada intento. Compras no se ve afectado: no consume `claveIdempotencia` en `registrarPagoCompra`, así que el campo adicional es inerte para ese origen. El test de idempotencia ya no reimplementa la construcción del payload: llama a `construirDatosPagoCentral` (la función real) y agrega un caso de regresión explícito que reproduce el bug original (clave `undefined` → nunca se detecta el reintento). |
| GAS-P1-004 | Corregido | `gastos/servicios/servicioGasto.ts`, `gastos/contexto/ContextoGastos.tsx`, `compras/hooks/useFormularioPagoCompra.ts`, `compras/componentes/formularios/FormularioPagoCompra.tsx`, `gastos/paginas/PaginaRegistrarPagoGasto.tsx`, `gastos/componentes/FormularioGasto.tsx` | Nueva regla pura `motivoBloqueoEfectivoMonedaExtranjera(moneda, monedaBase, mediosPago)` (usa `esMedioDeCaja`, la misma función ya usada en Caja/Compras — no una lista de medios propia). Se aplica en dominio en AMBOS comandos de pago de Gasto (`registrarGastoConPagoInmediato`, `registrarPagoGastoCentral`) antes de comprometer cualquier movimiento/Pago/CxP. En UI: `useFormularioPagoCompra.ts` gana un hook opcional `validarRestriccionesOrigen` (Compras no lo usa, cero cambio de comportamiento para Compras) que Gastos inyecta en `PaginaRegistrarPagoGasto.tsx`; el mensaje se muestra de inmediato en un banner en `FormularioPagoCompra.tsx`. "Registrar y pagar" (`FormularioGasto.tsx`) muestra el mismo aviso en cuanto se expande la sección de pago. Ningún caso persiste Pago/CxP/movimiento antes de la validación (verificado leyendo el orden exacto del código). |
| GAS-P2-003 | Corregido | `indicadores-negocio/pages/RentabilidadVentasPage.tsx` | `gastos`/`cuentasPorPagarGasto` pasaron de `useMemo(() => cargarGastos(), [])` (congelado al montar) a `useState` actualizado por un listener del evento real `EVENTO_GASTOS_CAMBIADOS` (el mismo que ya usa `useCategoriasGasto.ts`) — sin polling ni intervalos. La cadena de `useMemo` existente (`filasGastosOperativos` → `indicadoresGastos` → `resultadoOperativo`) no se tocó: ya dependía correctamente de `gastos`/`cuentasPorPagarGasto`, así que recalcula sola en cuanto esos estados cambian. Filtros de periodo/establecimiento, exclusión de anulados/borradores, TC histórico y el guard de venta neta cero quedaron intactos. |
| Validaciones de tipo de cambio, total, motivo y categorías | Corregido | `gastos/servicios/servicioGasto.ts`, `gastos/servicios/servicioCategoriaGasto.ts`, `gastos/contexto/ContextoGastos.tsx`, `gastos/componentes/FormularioGasto.tsx`, `configuracion-sistema/components/negocio/SeccionCategoriasGasto.tsx` | **Tipo de cambio** (GAS-P2-004/006): `validarGastoBasico` ahora recibe `monedaBase` y exige un TC finito y `> 0` cuando la moneda del gasto difiere de ella (un borrador sigue sin exigirlo). **Total** (GAS-P2-009): la validación usa `Number.isFinite` explícito (además de `<=0`), rechazando también `Infinity`/`-Infinity`, no solo `NaN`/`0`/negativos. **Impuesto aplicable** (GAS-P2-004): con tratamiento recuperable/no-recuperable, `impuestoId` pasa a ser obligatorio en dominio (antes solo llevaba el asterisco visual sin validación real) — "sin desglose" sigue sin exigirlo. **Motivo de anulación**: nueva función `normalizarMotivoAnulacion` (rechaza vacío/solo-espacios/`undefined`, devuelve el texto recortado) usada por `anularGasto` y `anularPagoGasto`; `SeccionCategoriasGasto.tsx`/`ModalAnularDocumento` ya manejaban el `throw` mediante su mecanismo de error existente. **Categorías duplicadas** (GAS-P2-007): `existeNombreCategoriaGastoDuplicado` (trim + case-insensitive) usada por `crearCategoriaGasto`/`editarCategoriaGasto`, excluyendo la propia categoría al editar; `ModalCategoriaGasto` captura el error y lo muestra inline. |

## Pruebas agregadas o corregidas

| Prueba | Archivo | Resultado | Qué comportamiento real verifica |
|---|---|---|---|
| 15 casos (usuario solo-ver/crear/anular/pagar/categorías, acceso total sin hardcodear rol, resolución por establecimiento, acceso directo por URL) | `configuracion-sistema/utilidades/permisos.test.ts` (nuevo) | ✅ 15/15 | `tienePermiso`/`tieneAlgunoDePermisos`/`tieneAccesoTotalCatalogo`/`resolverPermisosSesion` reales — el mismo motor que usan `PermisoGuard` y `ContextoGastos.tsx` |
| 3 casos de propagación de `claveIdempotencia` (payload siempre la incluye, dos envíos con la misma clave producen la misma clave, regresión con clave `undefined`) | `gastos/contexto/idempotenciaPagoGasto.integration.test.ts` (corregido, +3 sobre los 10 existentes) | ✅ 13/13 | `construirDatosPagoCentral` real (no reimplementada); falla si se vuelve a omitir `claveIdempotencia` en el payload |
| 8 casos de `motivoBloqueoEfectivoMonedaExtranjera` (moneda base+efectivo, extranjera+efectivo, extranjera+transferencia, mezcla con/sin efectivo, monto 0, mensaje sin moneda hardcodeada, sin monedaBase resuelta) | `gastos/servicios/servicioGasto.test.ts` (+8) | ✅ | Regla real de bloqueo de efectivo en moneda extranjera |
| 4 casos de `normalizarMotivoAnulacion` (vacío, solo espacios, `undefined`, válido recortado) | `gastos/servicios/servicioGasto.test.ts` (+4) | ✅ | Motivo de anulación nunca vacío, siempre recortado |
| 5 casos de TC/impuesto en `validarGastoBasico` (NaN/Infinity, extranjera sin TC, TC=0, TC válido, moneda base sin TC, recuperable sin impuesto, sin_desglose sin impuesto) | `gastos/servicios/servicioGasto.test.ts` (+7) | ✅ | Validaciones de dominio nuevas de TC/total/impuesto |
| 5 casos de categorías duplicadas (detección case-insensitive/espacios, no-duplicado contra sí misma al editar, rechazo al crear/editar) | `gastos/servicios/servicioCategoriaGasto.test.ts` (+6) | ✅ | `existeNombreCategoriaGastoDuplicado`/`crearCategoriaGasto`/`editarCategoriaGasto` reales |
| 3 casos de reactividad (registrar, editar, anular un gasto y volver a proyectar con el arreglo fresco) | `gastos/servicios/consultaGastosOperativos.service.test.ts` (+3) | ✅ | `proyectarFilasGastosOperativos`/`calcularIndicadoresGastosOperativos` reales, reproduciendo exactamente lo que produce `cargarGastos()` tras el evento `gastos_cambiados` |

Total incremental: **+44 tests** (1550 → 1594), todos en verde.

## Validaciones técnicas

| Comando | Resultado | Errores | Warnings |
|---|---|---|---|
| `npx tsc -b --noEmit` (desde `apps/senciyo`) | ✅ Limpio | 0 | 0 |
| `npx eslint .` (desde `apps/senciyo`) | ✅ Limpio (tras corregir 1 warning propio de `react-hooks/exhaustive-deps` tomando el enfoque de estado + listener en vez de `useMemo` con dependencia artificial) | 0 | 0 |
| `npx vitest run` (desde `apps/senciyo`, suite completa) | ✅ 1594/1594 | 0 | — |
| `npm run build` (desde `apps/senciyo`) | ✅ Exitoso, 28.36s | 0 | 0 |
| `git diff --check` | ✅ Sin errores de espacios en blanco | — | — |

No se ocultó ningún error de test modificando la aserción para forzar verde: los 9 tests que fallaron tras fortalecer `validarGastoBasico`/agregar `impuestoId` obligatorio fallaron porque sus fixtures quedaron incompletas frente a una regla nueva y correcta — se corrigieron los fixtures (agregando `impuestoId`/`monedaBase` reales), nunca la regla ni la aserción.

## Archivos creados

- `apps/senciyo/src/pages/Private/features/configuracion-sistema/utilidades/permisos.test.ts` — **indispensable**: no existía ningún archivo de test para `permisos.ts`, la única fuente de verdad de resolución de permisos reales (`tienePermiso`, `tieneAlgunoDePermisos`, y las funciones nuevas `obtenerPermisosDeUsuario`/`tieneAccesoTotalCatalogo`/`resolverPermisosSesion`). Sin este archivo, la corrección de GAS-P1-001/002 habría quedado sin ninguna prueba automatizada — no hay otro archivo existente cuya responsabilidad sea "probar la resolución de permisos", y crear uno nuevo con un único propósito claro (probar ese módulo) es exactamente el criterio que justifica un archivo nuevo.

Ningún otro archivo nuevo fue necesario: `construirDatosPagoCentral` y `motivoBloqueoEfectivoMonedaExtranjera` se agregaron a archivos ya existentes (`useFormularioPagoCompra.ts`, `servicioGasto.ts`) porque esa es su responsabilidad natural y ya tenían consumidores reales ahí.

## Deuda no bloqueante pendiente

- **Concurrencia de series con `localStorage`** (GAS-P2-001): sin lock/transacción real ante dos registros simultáneos contra la misma serie — heredado del mismo patrón ad-hoc que ya usan Compras/Pagos, fuera del alcance de esta corrección.
- **Caja multimoneda futura**: deliberadamente NO implementada en esta corrección (instrucción explícita del encargo) — la mitigación fue restringir el combo "efectivo + moneda extranjera" en Gastos, no generalizar Caja.
- **Mejoras de filtros/paginación** (GAS-P2-005): sin botón "Limpiar todos", sin persistencia de filtros, sin ordenamiento de columnas, tamaño de página fijo — explícitamente fuera de alcance de esta tarea.
- **`agregarMovimiento` retorna silenciosamente sin caja abierta** (GAS-P2-002): defensa en profundidad débil en `CajaContext.tsx`, mitigada por los guards de capas superiores ya existentes — no se tocó Caja en esta corrección (fuera de alcance explícito).
- Otros P2/P3 sin relación con el cierre (alias `descargarPdfGasto` sin consumidor, mutación de array en `repositorioGastos.ts`, duplicación de la función `round2`/`redondear` entre módulos, UX de filtros) permanecen exactamente como se documentaron en la auditoría original — no afectan la integridad del flujo ni fueron parte del encargo de esta corrección.

## Veredicto posterior

## ✅ APROBADO PARA CIERRE

Los 4 hallazgos P1 (GAS-P1-001 a GAS-P1-004) quedaron corregidos con evidencia de código y prueba automatizada; no apareció ningún P0 ni P1 nuevo. Los permisos de Gastos ahora se resuelven desde el rol real asignado al usuario (nunca un wildcard incondicional), con enforcement en ruta, render y comando. La idempotencia del flujo "Registrar pago" se probó contra la función real que construye el payload de producción (`construirDatosPagoCentral`), incluyendo un caso de regresión explícito del defecto original. El pago en efectivo de un gasto en moneda extranjera queda bloqueado tanto en la interfaz (banner inmediato) como en el dominio (ambos comandos de pago), sin tocar el comportamiento de Compras. Los indicadores de Rentabilidad Operativa se actualizan reactivamente ante el evento real de cambio de Gastos, sin polling. No se introdujo doble contabilización (el aislamiento por `tipoOrigen` y la fuente única de importe en `Gasto.total` se mantuvieron intactos, verificado por los tests existentes de aislamiento). TypeScript, ESLint, la suite completa de 1594 pruebas y el build de producción terminan en verde.
