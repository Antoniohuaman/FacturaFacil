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

## 7-bis. Compactación y reorganización visual del formulario (segunda remediación, 2026-08-20)

Seguimiento puramente visual — sin tocar CxP, Pago, Caja, series, formas/medios de pago, impuestos ni ninguna fuente de verdad. Antes de cambiar nada se releyó el estado actual del formulario y del listado: gran parte de lo pedido (proporciones de la grilla de "Datos generales", divulgación progresiva del "Documento sustentatorio", proporciones de "Importes", "Forma de pago" compacta, "+ Agregar datos del pago" progresivo, adjuntos en una sola fila) **ya estaba resuelto** por la remediación anterior — no se re-tocó lo que ya cumplía el objetivo, para no introducir cambios sin necesidad.

### Qué se reordenó
- **Listado** (`PaginaGastos.tsx`): la columna combinada "Gasto / referencia" (concepto + referencia apilados) se separó en dos columnas independientes — **"N° Documento"** (solo serie + correlativo, ej. `G001-00000001`) y **"Concepto"** (nueva, visible por defecto). Orden de columnas por defecto: N° Documento, Concepto, Proveedor, Fecha, Categoría, Total, Estado. Cabecera "Proveedor o beneficiario" → **"Proveedor"** (más compacta; el contenido sigue resolviendo proveedor formal o beneficiario libre sin cambios de modelo). Clave de preferencia de columnas del usuario (`localStorage`) migrada de `v4` a `v5` para que "Concepto" aparezca visible por defecto también para usuarios existentes.
- **Formulario — Importes**: "Impuesto aplicable" y "¿El importe incluye IGV?" (antes un bloque aparte debajo de la grilla) ahora comparten la misma fila compacta dentro del mismo grid, apareciendo juntos solo cuando el tratamiento tributario los requiere.

### Qué se compactó
- Label "Concepto / descripción" → **"Concepto"**; placeholder más corto ("Ej. Alquiler del local") que no invita a redactar párrafos — el campo sigue siendo un input de una sola línea, sin cambios en la validación ni en la longitud funcional.
- Espaciado vertical entre tarjetas del formulario reducido (`space-y-5`→`space-y-4`, `gap-6`→`gap-5`, `py-6`→`py-5`) — únicamente en el contenedor propio de Gastos, sin modificar el componente compartido `FormSectionCard` (que sigue usándose igual en Compras y en el resto del sistema).

### Qué quedó condicional (ya lo estaba, confirmado sin regresión)
- "Documento sustentatorio": con "Sin documento" solo se ve el selector; con un tipo elegido aparecen Fecha/Serie/Número en una sola fila.
- "Impuesto aplicable" + "¿Incluye IGV?": solo aparecen con tratamiento distinto de "Sin desglose" (ahora en una sola fila, ver arriba).
- Cronograma de cuotas: solo aparece cuando la forma de pago es de crédito y tiene cuotas configuradas.
- "Datos del pago": solo aparece si el usuario la expande explícitamente (y solo si tiene permiso `gastos.pagar`).
- Adjuntos: selector de tipo + botón de carga + límites ya en una sola fila (`AdjuntosCompra.tsx`, sin cambios — ya cumplía el objetivo).

### Qué NO cambió funcionalmente
CxP, Pago, Caja, cuotas, idempotencia, anulaciones, series, formas de pago, medios de pago, proveedores/beneficiarios, impuestos, documentos soportados, permisos, multiempresa, filtros, exportación — sin cambios. El buscador del listado ya incluía `concepto` en su índice de búsqueda antes de este cambio (`consultaGastosOperativos.service.ts`), así que separar la columna no afecta la búsqueda.

### Resultado de verificación
```
Tests:       2048 passed (97 test files) — sin tests nuevos (cambio puramente visual/de presentación de columnas, sin lógica condicional nueva que requiera prueba aislada)
TypeScript:  npx tsc -b → 0 errores
ESLint:      npx eslint . → 0 errores, 0 warnings
Build:       npm run build → exitoso
```

### Pendiente de esta pasada
Ninguno nuevo — los pendientes siguen siendo los de la sección 7 (pantalla "Registrar pago" compartida con Compras, límite del default de Adjuntos, tests de componente/UI).

---

## 7. Pendientes reales (no implementados en esta pasada)

1. **Pantalla "Registrar pago" (§40-43)**: simplificación del resumen del pago, renombrar "Medios registrados", evaluar el campo "Concepto (opcional)" del pago, reducir protagonismo de "Serie PG"/"Tipo de documento Pago" — todo vive en el componente compartido `FormularioPagoCompra.tsx`/`useFormularioPagoCompra.ts` (también usado por Compras). Requiere una remediación aparte con QA cruzado Compras+Gastos, no un cambio incidental dentro de esta tarea.
2. **Adjuntos — límite conocido**: el default contextual (`tipoInicial`) solo se aplica al montar el formulario; si el usuario cambia el tipo de documento después de haber abierto la sección de Adjuntos, el default ya inicializado no se resincroniza. Bajo impacto (el selector sigue siendo editable manualmente); se documenta en vez de resolverse con un `useEffect` adicional que agregaría complejidad desproporcionada a un default cosmético.
3. **Tests de componente/UI**: brecha preexistente (0 tests de renderizado/interacción en Gastos), no introducida por esta remediación — sigue pendiente como se señaló en la auditoría funcional previa.

**Verificado sin necesidad de cambio** (por lectura de código y de los tests de integración existentes, no requirió intervención):
- Crédito + pago total inmediato (§30): el estado de las cuotas se deriva correctamente de la CxP tras el pago; sin confusión detectada.
- Edición de cronograma con pagos activos (§33): ya bloqueada correctamente — el botón de configurar cuotas vive dentro del `fieldset` que `nivelEdicionGasto === 'limitada'` ya deshabilita por completo.
