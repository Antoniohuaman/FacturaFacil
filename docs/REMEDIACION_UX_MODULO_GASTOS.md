# Remediación de Experiencia de Usuario y Consistencia Funcional — Módulo de Gastos

**Alcance:** simplificación de UX y corrección de inconsistencias funcionales puntuales del módulo de Gastos, preservando íntegramente la arquitectura financiera ya aprobada (Gasto → CxP → Pago → Caja/Banco) y las fuentes de verdad centrales confirmadas en `docs/AUDITORIA_FUENTES_VERDAD_GASTOS.md`. No se reabrió la auditoría funcional integral (`docs/AUDITORIA_FUNCIONAL_MODULO_GASTOS.md`), solo se corrigieron los puntos que esta tarea de remediación identificó explícitamente.

---

## 1. Estado inicial

El código ya reflejaba varias rondas de corrección previas (comentarios `§X de la corrección`/`corrección técnica final`), no documentadas en un MD específico de UX. Al leer el código actual antes de tocar nada, se confirmó que varios puntos del pedido de remediación **ya estaban resueltos**:

- Previsualización del correlativo en alta (nunca un número fabricado para un borrador).
- Documento sustentatorio con divulgación progresiva real (los campos de fecha/serie/número solo aparecen si hay tipo de documento).
- Terminología Forma de pago / Medio de pago / Condición de pago ya separada y consistente en las pantallas de Gastos.
- Exportación a Excel ya sin residuos (serie/número vacíos sin documento, PG vacío sin pagos, usuario siempre humano).
- Botón "Anular gasto" con pagos activos: ya anticipa el bloqueo (navega directo a la pestaña Pagos con aviso), no un clic muerto.
- "Duplicar gasto" ya existe (`datosParaDuplicarGasto`).

El resto de esta remediación se concentró en lo que **sí** seguía pendiente.

---

## 2. Cambios realizados

### Formulario de registro (`FormularioGasto.tsx`)
- **Categoría sin default arbitrario**: ya no preselecciona la primera categoría del catálogo; el selector abre en "Selecciona una categoría" (sigue siendo obligatoria).
- **"Aplica a" → "Establecimiento"**: label más explícito, mismo modelo/opción "Toda la empresa".
- **Checkbox de proveedor**: "Sin proveedor (movilidad, propinas, gastos sin documento)" → "Sin proveedor formal" + ayuda corta "Para movilidad, propinas u otros pagos a personas." (separa el concepto de proveedor del de documento, que se resuelve en su propia sección).
- **Tipo de documento filtrado contextualmente**: el selector ya no muestra los 9 códigos del catálogo central de Compras — solo Factura, Boleta de Venta y Recibo por Arrendamiento (ver §4 más abajo). Un gasto histórico con un código fuera de ese subconjunto conserva su opción visible (mismo patrón ya usado para series).
- **Impuesto aplicable filtrado**: con tratamiento "Recuperable", solo se ofrecen impuestos Gravados; nunca se ofrecen impuestos de monto fijo (tipo `FIXED_AMOUNT`, ej. ICBPER).
- **Resumen con divulgación progresiva real**: "Sin desglose" muestra solo "Total del gasto"; "No recuperable" muestra Subtotal/IGV/Total; "Recuperable" agrega "Gasto considerado" (el único caso donde difiere del Total). Mientras el tratamiento exige impuesto y el usuario no eligió ninguno, se muestra "—"/"Selecciona un impuesto" en vez de "S/ 0.00".
- **Una sola decisión para pagar**: se eliminó el menú desplegable "Registrar gasto ▼ → Registrar y pagar". Ahora hay un único botón: dice "Registrar gasto" si la sección de pago está cerrada, y "Registrar y pagar" si está abierta (con permiso `gastos.pagar`). La sección "+ Agregar datos del pago" ahora solo se muestra a quien tiene ese permiso.
- **Adjuntos con default contextual**: el tipo preseleccionado al abrir la sección es "Factura del proveedor" solo si ya hay un tipo de documento elegido; si no, "Otro" (nunca "Factura del proveedor" en un gasto "Sin documento").

### Drawer de detalle (`DrawerGasto.tsx`)
- Eliminado el botón duplicado "+ Registrar pago" dentro de la pestaña Pagos — la acción del encabezado ya está disponible desde cualquier pestaña.
- "Importe que afecta la rentabilidad" → "Gasto considerado" (mismo dato, lenguaje más cercano).
- "Aplica a" → "Establecimiento".
- **Corrección de trazabilidad**: `anularGasto`, `descartarBorradorGasto` y `anularPagoGasto` se invocaban sin el usuario actual — el campo `anuladoPor`/el evento de historial quedaban sin atribución. Ahora se pasa el nombre visible del usuario (misma fuente que ya usa el formulario al registrar/editar).

### Listado (`PaginaGastos.tsx`)
- Misma corrección de trazabilidad en `anularGasto`/`descartarBorradorGasto` (mismo bug, mismo fix).
- La primera columna ahora muestra el **concepto** como línea principal y la referencia interna como dato secundario debajo — antes solo mostraba la referencia, aunque la columna ya se llamaba "Gasto / referencia".
- Filtro "Proveedor" → "Proveedor / beneficiario"; filtro y columna "Aplica a" → "Establecimiento"; columna/encabezado de Excel "Importe que afecta la rentabilidad" → "Gasto considerado".

### Dominio (`servicioGasto.ts`, `servicioImpuestoGasto.ts`, `Gasto.ts`)
- Nuevo subconjunto **contextual** `TIPOS_DOCUMENTO_SUSTENTATORIO_GASTO_COMPATIBLES` (Factura/Boleta/Recibo por Arrendamiento) sobre el catálogo central `TIPOS_DOCUMENTO_PROVEEDOR` de Compras — **el catálogo central no se modificó**.
- Nueva validación de dominio (no solo UI): un documento formal compatible exige proveedor identificable — nunca se acepta con un beneficiario de texto libre. Vive en `validarGastoBasico`, así que el comando la exige igual si se invocara directamente.
- `listarImpuestosConfiguradosGasto`/`resolverImpuestoGasto` ahora exigen `tax.type === 'PERCENTAGE'` (nunca tratan un impuesto de monto fijo como fracción) y, con tratamiento "recuperable", filtran además por `affectationCode === '10'` (Gravado) usando el metadato real de `Tax`, nunca comparando nombres.
- Corregido un comentario contradictorio en `Gasto.ts` que describía `estadoDocumento` como "nunca borrador" (falso, y contradecía el resto del propio archivo).

### Componentes compartidos (usados también por Compras — cambios mínimos y retrocompatibles)
- `AdjuntosCompra.tsx`: nueva prop opcional `tipoInicial` (si se omite, comportamiento idéntico al actual — Compras no la usa).
- `CreditScheduleSummaryCard.tsx` / `CreditInstallmentsTable.tsx`: dos fechas que se mostraban en formato ISO crudo (`2026-09-15`) ahora usan `formatearFecha` (DD/MM/AAAA); la columna de días de atraso decía "Vencidos" (ambiguo, mostraba un número de días) y ahora dice "Días de atraso".

---

## 3. Por qué se hicieron (decisiones clave documentadas)

### Tipos de documento — GAS-FUENTE-P2-001/§14-17
La auditoría de fuentes de verdad ya había detectado que Recibo por Honorarios dispara una retención real en Compras (reduce el neto a pagar) que Gastos no replica, y que Nota de Crédito/Débito, Comprobante de Percepción/Retención y "No domiciliado" son labels sin ningún efecto funcional en **ningún** módulo del sistema. Mostrarlos en Gastos como opciones normales sugeriría un tratamiento tributario que el módulo no ofrece. Se decidió **filtrar contextualmente en Gastos** (nunca tocar el catálogo central, que es correcto y normativo tal como está) y **no copiar la lógica de retención de Compras dentro de Gastos** (evita un mini-módulo tributario fuera de alcance). Un gasto histórico con uno de estos códigos conserva su documento tal cual — esta regla solo afecta lo que se ofrece hacia adelante.

### Impuestos — §19-21
El filtro por `tax.type` cierra un riesgo real (aunque hoy inalcanzable con la configuración semilla): si un usuario activara ICBPER/ISC manualmente, Gastos lo habría tratado como 0.5% en vez de S/ 0.50 fijo. El filtro por `affectationCode` en "recuperable" usa el metadato normativo ya existente en `Tax` (Catálogo N° 07 SUNAT) en vez de inventar una regla tributaria nueva — evita ofrecer "Impuesto recuperable" junto a un impuesto que por definición tiene tasa 0%.

### Pago inmediato — §29
Existían dos caminos para la misma intención ("+ Agregar datos del pago" y luego, por separado, un menú "Registrar gasto ▼ → Registrar y pagar"). Se unificó en una sola decisión: la acción del botón principal refleja siempre el estado real de la sección de pago.

### Pantalla "Registrar pago" — decisión de alcance
`PaginaRegistrarPagoGasto.tsx` no tiene formulario propio: delega enteramente en `FormularioPagoCompra.tsx`/`useFormularioPagoCompra.ts`, el mismo componente que usa Compras. Los pedidos de simplificación del resumen del pago, el label "Medios registrados", el campo "Concepto (opcional)" y la reducción de protagonismo de "Serie PG"/"Tipo de documento Pago" (§40-43) viven ahí — es decir, tocarlos habría modificado la pantalla de pago de **Compras** también, sin la cobertura de pruebas de UI dedicada que un cambio de ese tamaño amerita, y excede el criterio de esta tarea de no convertir la remediación en un rediseño de alcance mayor. **Se decidió no tocar ese componente en esta pasada** — ver pendientes.

### Toast "Movimiento registrado" — decisión de alcance
Ese mensaje lo emite `CajaContext.tsx#agregarMovimiento`, compartido por Ventas/Compras/Cobranzas/Gastos y por los movimientos manuales de Caja. Gastos **ya tiene** su propio mensaje contextual ("Pago {número} registrado correctamente. Caja actualizada.", en `useFormularioPagoCompra.ts`). Silenciar o cambiar el toast de Caja habría sido un cambio transversal a todo el sistema, no específico de Gastos — se decidió no tocarlo.

---

## 4. Qué NO se tocó

- El motor de CxP/Pago/Caja/cuotas/idempotencia/reversión — sin cambios, sigue siendo el mismo de Compras reutilizado.
- El catálogo central `TIPOS_DOCUMENTO_PROVEEDOR`, `Tax`/`PERU_TAX_TYPES`, `PaymentMethod`, `PAYMENT_MEANS_CATALOG`, `BankAccount`, `CategoriaGasto`, `Series` — ninguna fuente central se modificó.
- Configuración de Negocio, Compras, Ventas — sin cambios salvo las 3 correcciones puntuales en componentes genuinamente **compartidos** (AdjuntosCompra, CreditScheduleSummaryCard, CreditInstallmentsTable), todas retrocompatibles y verificadas contra la suite completa de Compras.
- Header global, menú lateral, sistema de diseño — sin cambios.
- Ninguna capacidad existente se eliminó: borrador, edición por niveles, anulación con reversión, permisos, multiempresa, trazabilidad, filtros, columnas personalizables, exportación — todo se conserva igual.

---

## 5. Pruebas agregadas

- `servicioGasto.test.ts` (+4 tests, 103→107): documento formal compatible + beneficiario libre rechazado (recorre los 3 códigos compatibles); documento formal + proveedor identificado aceptado; "sin documento" o un código no compatible (ej. histórico '12') nunca rechaza un beneficiario libre; `TIPOS_DOCUMENTO_SUSTENTATORIO_GASTO_COMPATIBLES` contiene exactamente `['01','03','14']`.
- `servicioImpuestoGasto.test.ts` (+4 tests, 12→16): un impuesto de monto fijo nunca se resuelve como fracción (`resolverImpuestoGasto`); `listarImpuestosConfiguradosGasto` excluye impuestos `FIXED_AMOUNT`; sin tratamiento "recuperable" no filtra por afectación; con "recuperable" solo ofrece impuestos Gravados (afectación '10').

No se agregaron tests para el fix de trazabilidad (usuario en anulación/descarte) ni para los ajustes puramente de presentación (labels, formato de fecha, resumen dinámico, botón único de pago): son cambios de UI/call-site sin lógica de dominio nueva que probar de forma aislada, y el proyecto no tiene infraestructura de tests de componente/UI (brecha preexistente, ya señalada en `AUDITORIA_FUNCIONAL_MODULO_GASTOS.md`, no introducida por esta tarea).

---

## 6. Resultado de verificación

```
Tests:       2048 passed (97 test files) — incluye los 11 archivos de Gastos (313 tests) y toda la suite de Compras/Caja/Configuración/Inventario/etc.
TypeScript:  npx tsc -b → 0 errores
ESLint:      npx eslint . → 0 errores, 0 warnings
Build:       npm run build → exitoso
```

---

## 7. Pendientes reales (no implementados en esta pasada)

1. **Pantalla "Registrar pago" (§40-43)**: simplificación del resumen del pago, renombrar "Medios registrados", evaluar el campo "Concepto (opcional)" del pago, reducir protagonismo de "Serie PG"/"Tipo de documento Pago" — todo vive en el componente compartido `FormularioPagoCompra.tsx`/`useFormularioPagoCompra.ts` (también usado por Compras). Requiere una remediación aparte con QA cruzado Compras+Gastos, no un cambio incidental dentro de esta tarea.
2. **Adjuntos — límite conocido**: el default contextual (`tipoInicial`) solo se aplica al montar el formulario; si el usuario cambia el tipo de documento después de haber abierto la sección de Adjuntos, el default ya inicializado no se resincroniza. Bajo impacto (el selector sigue siendo editable manualmente); se documenta en vez de resolverse con un `useEffect` adicional que agregaría complejidad desproporcionada a un default cosmético.
3. **Tests de componente/UI**: brecha preexistente (0 tests de renderizado/interacción en Gastos), no introducida por esta remediación — sigue pendiente como se señaló en la auditoría funcional previa.

**Verificado sin necesidad de cambio** (por lectura de código y de los tests de integración existentes, no requirió intervención):
- Crédito + pago total inmediato (§30): el estado de las cuotas se deriva correctamente de la CxP tras el pago; sin confusión detectada.
- Edición de cronograma con pagos activos (§33): ya bloqueada correctamente — el botón de configurar cuotas vive dentro del `fieldset` que `nivelEdicionGasto === 'limitada'` ya deshabilita por completo.
