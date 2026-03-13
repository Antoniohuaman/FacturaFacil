# Informe de auditoría extrema — Validaciones normativas de Nota de Crédito

**Repositorio:** `C:\FacturaFacil\apps\senciyo`
**Rama auditada:** `feature/nota-credito`
**Fecha de auditoría:** 2026-03-12
**Auditor:** Revisión arquitectónica exhaustiva — solo lectura, sin modificaciones
**Alcance:** Frontend React/TypeScript — comprobante tipo Nota de Crédito para Factura y Boleta (SUNAT Perú, UBL 2.1)

---

## 1. Resumen ejecutivo

### Nivel de cumplimiento actual

| Categoría normativa | Estado global |
|---|---|
| Estructura base mínima (tipo 07, serie, código, motivo, doc. relacionado) | **Parcial-Alto** |
| Documento que modifica (tipo 01/03, BillingReference) | **Parcial** |
| Serie y numeración | **Cumple** |
| Catálogo de códigos 01–13 | **Parcial** |
| Motivo / descripción | **Parcial** |
| Fecha de emisión vs. documento origen | **No cumple** |
| Moneda alineada al documento origen | **No cumple** |
| Límite de monto vs. documento origen | **No cumple** |
| Estado del comprobante origen (solo Aceptado) | **No cumple — falla crítica** |
| Código 13 — reglas especiales | **No cumple** |
| Diferencias Factura vs. Boleta en validaciones | **No cumple** |
| Preparación estructural para backend / UBL conceptual | **Parcial-Alto** |

### Riesgos principales

1. **RIESGO CRÍTICO**: El sistema permite emitir Nota de Crédito sobre comprobantes en estado **"Enviado"**, que es el único estado real que el sistema asigna en este momento. Esto contradice la regla normativa fundamental: solo comprobantes **"Aceptados"** por SUNAT/OSE pueden ser modificados con NC.

2. **RIESGO ALTO**: No existe ninguna validación de que la fecha de emisión de la NC sea mayor o igual a la del documento origen. Una NC con fecha anterior al comprobante que modifica es inválida según SUNAT.

3. **RIESGO ALTO**: No existe ninguna validación de que la moneda de la NC coincida con la moneda del documento modificado. Para Facturas esto es especialmente sensible porque SUNAT puede rechazarlas.

4. **RIESGO ALTO**: No existe ninguna validación de que el total de la NC no exceda el total del documento modificado.

5. **RIESGO MEDIO**: El código 13 (Corrección de monto neto pendiente y/o fechas de vencimiento) no tiene ningún tratamiento especial. Se puede seleccionar sobre documentos que no tienen términos de crédito, lo cual es normativamente incorrecto.

6. **RIESGO BAJO-MEDIO**: No existe coherencia mínima entre el código seleccionado y el motivo ingresado. El sistema acepta cualquier texto libre sin ninguna guía semántica.

### ¿Está listo normativamente hoy?

**No.** Existen fallas críticas y faltantes estructurales que impedirían que una NC emitida desde este frontend sea normativamente consistente al momento de conectar con el backend/SUNAT/OSE. El núcleo estructural está bien construido (tipos, series, catálogo de códigos, flujo de origen), pero las reglas de negocio de validación normativa están incompletas.

---

## 2. Flujo funcional actual de Nota de Crédito

### 2.1 Desde la lista de comprobantes

**Archivo:** `lista-comprobantes/pages/ListaComprobantes.tsx` — líneas 61–79

El usuario llega a la lista de comprobantes ya emitidos. Cada fila tiene una acción contextual. La función que determina si se puede generar NC sobre un comprobante es:

```
canGenerateCreditNote(invoice):
  → tipo debe ser 'factura' o 'boleta'
  → el status NO debe incluir 'anulado'
  → cualquier otro estado (incluido 'Enviado') pasa como válido
```

La acción `handleGenerateCreditNote` usa la instantánea del comprobante (`instantaneaDocumentoComercial`) para construir el estado de navegación hacia el formulario de emisión.

### 2.2 Carga del documento origen

La función `crearDatosNotaCreditoDesdeInstantanea` (archivo `instantaneaDocumentoComercial.ts`, línea 530) extrae del comprobante origen:
- `tipoComprobanteOrigen` (factura o boleta)
- `tipoDocumentoCodigoOrigen` ('01' o '03')
- `serie`, `numero`, `numeroCompleto`
- `id` del documento

Genera un `DatosNotaCredito` inicial con `codigo: ''` y `motivo: ''`.

### 2.3 Formulario (EmisionTradicional.tsx)

Al detectar `location.state.noteCredit` con la guard `esCargaReutilizacionDocumentoComercial`:
- El tipo de comprobante se fuerza a `'nota_credito'` (no editable por el usuario).
- Las series se filtran con `documentType.code === '07'` y con prefijo F o B según el tipo de origen.
- El usuario ve los campos: Código NC (dropdown 01–13), Motivo (texto libre), referencia del documento origen (solo display, no editable).
- El carrito puede recibir productos (los del documento origen se cargan como referencia para edición).

### 2.4 Validaciones antes de emitir

Se ejecutan dos funciones:
1. `validateComprobanteNormativa` — valida campos base: tipo, serie, cliente (con reglas de boleta), forma de pago (exonerada en NC), fecha, moneda, productos, y los tres campos NC: código, motivo, documentoRelacionado.
2. `validateComprobanteData` — valida en el hook de acciones: carrito no vacío, tipo de comprobante, campos NC (código, motivo, numeroCompleto del documento relacionado), serie, total > 0, precios y cantidades válidos.

### 2.5 Emisión

La función `createComprobante` (useComprobanteActions.tsx):
- No descuenta stock (correcto para NC).
- No procesa cobranza (correcto para NC).
- Construye `InstantaneaDocumentoComercial` con todos los campos incluyendo `relaciones.datosNotaCredito`.
- Asigna status `'Enviado'` y `statusColor: 'blue'` al nuevo comprobante NC.
- El número se genera como `${serie}-${random padded 8 dígitos}` (simulación, sin backend real).

### 2.6 Representación / preparación documental

El objeto `Comprobante` resultante contiene:
- `noteCreditData` (código, motivo, documentoRelacionado)
- `relatedDocumentId`, `relatedDocumentType` (número completo y tipo del documento modificado)
- `sourceDocumentId`, `sourceDocumentType`
- `instantaneaDocumentoComercial` completa

Está disponible en el contexto global y en la exportación Excel. La preparación conceptual para el backend es razonablemente completa, aunque le faltan datos de validación que solo el backend puede confirmar.

---

## 3. Hallazgos por archivo

### 3.1 `lista-comprobantes/pages/ListaComprobantes.tsx`

**Responsabilidad:** Punto de entrada para generar NC desde un comprobante existente. Define las reglas de habilitación de acciones.

**Qué hace:**
- `resolveTipoComprobante(label)` — infiere tipo desde etiqueta legible (línea 61).
- `canGenerateCreditNote(invoice)` — determina si se puede generar NC (línea 75).
- `handleGenerateCreditNote` — construye y navega con el estado de NC.

**Qué no hace (impacto normativo):**

| Faltante | Impacto |
|---|---|
| La función `canGenerateCreditNote` solo excluye el estado `'Anulado'`. No exige que el estado sea `'Aceptado'`. | **FALLA CRÍTICA**: se puede generar NC sobre cualquier comprobante en estado 'Enviado', 'Rechazado', 'Por corregir'. |
| No compara fecha del comprobante origen para validarla contra la fecha NC al momento de seleccionar | Impacto diferido (la comparación debería hacerse también en el form) |
| No transforma ni extrae la moneda del origen para pasarla como obligatoria al formulario | La moneda puede diferir libremente |

**Línea exacta del problema crítico:**
```
línea 75–79:
const canGenerateCreditNote = (invoice: Comprobante): boolean => {
  const tipo = resolveTipoComprobante(invoice.type);
  const status = String(invoice.status || '').toLowerCase();
  return (tipo === 'factura' || tipo === 'boleta') && !status.includes('anulado');
};
```

---

### 3.2 `lista-comprobantes/contexts/ComprobantesListContext.tsx`

**Responsabilidad:** Estado global de comprobantes en memoria (sin backend real).

**Qué hace:**
- Define el tipo `Comprobante` con campo `status: string` (línea 23) — sin enum, sin type safety.
- Acciones: ADD, SET, UPDATE, DELETE.

**Qué no hace (impacto normativo):**

| Faltante | Impacto |
|---|---|
| No define un tipo enum/union para `status`. Los estados posibles son un string libre. | No hay type safety que garantice que los estados sean los normativamente definidos |
| No existe transición de estados (Enviado → Aceptado → etc.). | El sistema nunca puede llegar al estado 'Aceptado' desde el frontend actual |
| No hay acción `UPDATE_STATUS` dedicada. | Las transiciones de estado son ad hoc via UPDATE_COMPROBANTE |

---

### 3.3 `hooks/useComprobanteActions.tsx`

**Responsabilidad:** Creación y procesamiento de comprobantes.

**Qué hace:**
- Valida datos NC (código, motivo, numeroCompleto del doc. relacionado).
- Construye la instantánea completa.
- Asigna status `'Enviado'` y color `'blue'` a todo comprobante nuevo (línea 732–733).
- Excluye correctamente la NC de: descuento de stock, cobranza, indicadores de venta.

**Qué no hace (impacto normativo):**

| Faltante | Impacto |
|---|---|
| Todo comprobante nuevo, sin excepción, nace con `status: 'Enviado'`. | Nunca habrá un comprobante en estado 'Aceptado' que permita generar NC de forma normativamente correcta |
| No valida que `totals.total` de la NC sea ≤ `totals.total` del documento origen | NC puede exceder el monto del comprobante modificado |
| No valida coherencia de moneda NC vs. moneda origen | Fallo normativo para Facturas especialmente |
| No valida que la fecha de emisión de la NC sea ≥ a la fecha del documento origen | NC puede tener fecha anterior |
| `documentoOrigenId` en relaciones toma `data.noteCreditData?.documentoRelacionado?.id` que puede ser `undefined` para comprobantes sin `id` explícito | La trazabilidad backend puede perderse |

---

### 3.4 `shared/core/comprobanteValidation.ts`

**Responsabilidad:** Validaciones normativas del frontend antes de emitir.

**Qué hace:**
- Valida que para NC: código, motivo y documentoRelacionado (tipoComprobanteOrigen, tipoDocumentoCodigoOrigen, serie, numero) estén presentes.
- Exonera a la NC de requerir forma de pago.
- Valida umbral de cliente para boleta (S/ 700).

**Qué no hace (impacto normativo):**

| Faltante | Impacto |
|---|---|
| No valida que el código NC pertenezca al catálogo 01–13 (solo verifica que sea no vacío) | Un código corrupto puede pasar la validación |
| No valida que fecha de NC ≥ fecha del documento origen | Fallo normativo |
| No valida moneda NC = moneda origen | Fallo normativo |
| No valida total NC ≤ total origen | Fallo normativo |
| No valida reglas especiales del código 13 | Fallo normativo para ese código específico |
| No diferencia reglas de validación entre Factura y Boleta | Aplica el mismo mínimo a ambos |
| No valida el estado del comprobante origen | Esta validación recibe los datos de NC pero no tiene acceso al comprobante origen para verificar su estado |

---

### 3.5 `models/comprobante.types.ts`

**Responsabilidad:** Tipos TypeScript del sistema.

**Qué hace bien:**
- `DocumentoRelacionadoNotaCredito` con `tipoDocumentoCodigoOrigen: '01' | '03'` — type safety correcto para Factura/Boleta.
- `DatosNotaCredito` con código, motivo y documentoRelacionado estructurado.
- `TipoComprobante = 'boleta' | 'factura' | 'nota_credito'` — union type correcto.

**Qué no hace (impacto normativo):**

| Faltante | Impacto |
|---|---|
| El campo `status` en el tipo `Comprobante` del contexto es `string`, no un union type | Sin garantía de tipo en compilación para los estados válidos |
| No existe un tipo para los estados normativos: `'Enviado' | 'Aceptado' | 'Rechazado' | 'Por corregir' | 'Anulado'` | La comparación de estados es frágil y depende de strings literales |
| `DatosNotaCredito.codigo` es `string`, no `'01'|'02'|...|'13'` | No hay type safety para los códigos SUNAT |

---

### 3.6 `models/constants.ts`

**Responsabilidad:** Catálogo de constantes normativas.

**Qué hace bien:**
- `CODIGOS_NOTA_CREDITO_SUNAT` tiene los 13 códigos correctamente definidos (01–13) con descripción corta y larga.
- `TIPO_COMPROBANTE_CODIGOS_SUNAT.nota_credito = '07'` — código SUNAT correcto.
- Mapeo factura → '01', boleta → '03' en `TIPO_COMPROBANTE_CODIGOS_SUNAT`.

**Qué no hace (impacto normativo):**

| Faltante | Impacto |
|---|---|
| No hay ninguna anotación o metadato sobre restricciones por código (cuáles requieren crédito, cuáles aplican a exportación, etc.) | El frontend no puede guiar al usuario sobre cuándo es aplicable cada código |
| El código 13 no tiene ningún flag o metadato especial | No se puede implementar la validación especial sin refactorizar esta constante |

---

### 3.7 `models/instantaneaDocumentoComercial.ts`

**Responsabilidad:** Modelo snapshot completo del documento comercial.

**Qué hace bien:**
- `crearDatosNotaCreditoDesdeInstantanea` construye correctamente el documentoRelacionado con código SUNAT ('01'/'03'), etiqueta y número completo.
- `RelacionesDocumentoComercial` incluye `datosNotaCredito`, `documentoOrigenId`, `documentoOrigenTipo` — trazabilidad correcta.
- La función `esCargaReutilizacionDocumentoComercial` es una guard type-safe correcta.

**Qué no hace (impacto normativo):**

| Faltante | Impacto |
|---|---|
| La instantánea no preserva el `status` del comprobante origen | Al construir la NC, el frontend no tiene acceso al estado del documento que modifica dentro de la instantánea |
| No hay campo `fechaOrigen` explícito en `RelacionesDocumentoComercial` | Se puede inferir de `identidad.fechaEmision` si se accede a la instantánea completa, pero no es directamente accesible en el payload relacionado |

---

### 3.8 `shared/form-core/hooks/useDocumentType.tsx`

**Responsabilidad:** Gestión de tipo de comprobante y series disponibles.

**Qué hace bien:**
- Para `nota_credito`, filtra series con `documentType.code === '07'`.
- Aplica prefijo 'F' si el origen es factura, 'B' si es boleta.
- El tipo es forzado a `'nota_credito'` cuando viene de un flujo NC (no se puede cambiar).

**Qué no hace (impacto normativo):**

| Faltante | Impacto |
|---|---|
| No valida que la serie NC seleccionada sea del prefijo correcto en tiempo real (solo filtra la lista inicial) | Si el contexto de configuración cambia, podría haber inconsistencias transitorias |

---

### 3.9 `configuracion-sistema/utilidades/catalogoSeries.ts`

**Responsabilidad:** Catálogo y reglas de validación de series.

**Qué hace bien:**
- `validateSeriesCodeForVoucherType('CREDIT_NOTE', code)` — regex `/^[FB][A-Z0-9]{3}$/` — correcto para NC.
- `isCreditNoteSeriesCode` — mismo regex.
- `CREDIT_NOTE_DEFAULT_SERIES_CODES = ['FNC1', 'BNC1']` — sugerencias válidas.
- La función `repairMisclassifiedDefaultInvoiceAndReceiptSeries` tiene buena lógica para corregir series mal clasificadas durante el onboarding.

**Observación sobre el regex de NC:**
El regex `/^[FB][A-Z0-9]{3}$/` permite cualquier serie de 4 caracteres que empiece en F o B. Esto es correcto para SUNAT. Sin embargo, no valida que la serie NC tenga el prefijo consistente con el tipo del documento que modifica (F para factura, B para boleta) — esto se hace en `getSeriesParaTipo`, no aquí, lo cual es una separación de responsabilidades razonable.

---

### 3.10 `pages/EmisionTradicional.tsx`

**Responsabilidad:** Orquestación del formulario de emisión, incluyendo flujo NC.

**Qué hace bien:**
- Detecta el flujo NC con `esCargaReutilizacionDocumentoComercial`.
- Fuerza `tipoComprobante = 'nota_credito'`.
- Deshabilita la selección de tipos al usuario en flujo NC (`tiposHabilitados={['nota_credito']}`).
- Inicializa `datosNotaCredito` desde el state de navegación.
- `noteCreditRequiredFieldsPending` deshabilita el botón de emisión si código o motivo están pendientes.
- Pasa `noteCreditData` al `createComprobante`.

**Qué no hace (impacto normativo):**

| Faltante | Impacto |
|---|---|
| No extrae la moneda del documento origen para usarla como moneda por defecto/forzada de la NC | El usuario puede cambiar libremente la moneda |
| No tiene lógica de comparación de fecha de emisión NC vs. fecha del documento origen | Puede emitir NC con fecha anterior |
| No tiene validación del estado del comprobante origen al momento de iniciar el flujo | Cualquier comprobante no-anulado llega al formulario |
| No pasa el total del documento origen al formulario para validar el techo de monto | No hay limitante de importe |

---

## 4. Contraste exhaustivo contra checklist normativo

### A. Base mínima estructural

| # | Ítem | Estado | Evidencia | Observaciones | Solución recomendada |
|---|---|---|---|---|---|
| 1 | Tipo de documento correcto: **07 – Nota de Crédito** | ✅ Cumple | `constants.ts:44` — `nota_credito: '07'`. La instantánea resuelve `codigoSunat: '07'` automáticamente. | Correcto y completo | — |
| 2 | Serie propia de NC configurada | ✅ Cumple | `catalogoSeries.ts:20` — `CREDIT_NOTE_DEFAULT_SERIES_CODES = ['FNC1', 'BNC1']`. Series con `documentType.code === '07'`. Onboarding las crea automáticamente. | El filtro por `documentType.code === '07'` garantiza que solo series NC sean seleccionables | — |
| 3 | Código de NC obligatorio | ✅ Cumple | `comprobanteValidation.ts:153–157` — error si código es vacío. `useComprobanteActions.tsx:175–180` — segunda validación redundante. | Doble validación es correcto | Añadir validación de que el código esté en el rango '01'–'13' |
| 4 | Motivo obligatorio | ✅ Cumple | `comprobanteValidation.ts:160–164`. | Correcto | — |
| 5 | Documento relacionado obligatorio | ✅ Cumple | `comprobanteValidation.ts:167–178` — valida `tipoComprobanteOrigen`, `tipoDocumentoCodigoOrigen`, `serie`, `numero`. | Correcto | — |
| 6 | NC generada desde documento existente y no "desde cero" | ✅ Cumple | La ruta de acceso a NC es exclusivamente desde `handleGenerateCreditNote` en la lista, que requiere un comprobante existente. No existe endpoint de "nueva NC en blanco". | Flujo correcto — no se puede generar NC sin seleccionar un comprobante origen | — |

### B. Documento que modifica

| # | Ítem | Estado | Evidencia | Observaciones | Solución recomendada |
|---|---|---|---|---|---|
| 7 | Referencia correcta (BillingReference / InvoiceDocumentReference / ID / tipo) | ⚠️ Parcial | Los datos están estructurados en el payload: `documentoRelacionado.numeroCompleto` (para el ID), `tipoDocumentoCodigoOrigen` ('01'/'03'). El mapeo a los elementos UBL exactos (`cac:BillingReference`, `cac:InvoiceDocumentReference`, `cbc:DocumentTypeCode`) es responsabilidad del backend. | El frontend transporta la información correcta estructuralmente. Falta confirmar que el backend los mapea exactamente a los elementos UBL correctos. | Definir contrato de API explícito con el backend sobre cómo recibe estos datos |
| 8 | Si modifica Factura → tipo '01' | ✅ Cumple | `comprobante.types.ts:303` — `tipoDocumentoCodigoOrigen: '01' \| '03'`. La función `crearDatosNotaCreditoDesdeInstantanea:551` asigna '01' para factura. | Correcto | — |
| 9 | Si modifica Boleta → tipo '03' | ✅ Cumple | Misma evidencia que el punto 8. Asigna '03' para boleta. | Correcto | — |
| 10 | Diferencia correctamente Factura vs. Boleta según serie/origen | ✅ Cumple | `useDocumentType.tsx:100` — `requiredPrefix = notaCreditoTipoOrigen === 'factura' ? 'F' : 'B'`. La serie NC se filtra por prefijo según el tipo de origen. | Correcto | — |

### C. Serie y numeración del documento modificado

| # | Ítem | Estado | Evidencia | Observaciones | Solución recomendada |
|---|---|---|---|---|---|
| 11 | Formato del documento que modifica es válido | ✅ Cumple | El número del documento origen se extrae de la instantánea real del comprobante (`instantaneaDocumentoComercial.ts:541–543`). Como el comprobante origen ya existe en el sistema, su número es el que fue generado y aceptado. | Si el número origen fue generado por el mismo sistema, el formato es consistente. No se valida externamente. | Para backend: validar que el número origen cumpla el formato SUNAT |
| 12 | Lógica F para Factura, B para Boleta | ✅ Cumple | `useDocumentType.tsx:100–116` — prefix 'F' para facturas, 'B' para boletas al filtrar series NC. `catalogoSeries.ts:177` — el regex para CREDIT_NOTE acepta `[FB][A-Z0-9]{3}`. | Correcto — el sistema fuerza el prefijo correcto en la serie NC según el tipo de documento modificado | — |
| 13 | Sin referencia inválida o inconsistente entre serie y tipo | ✅ Cumple | El tipo del documento se preserva en `tipoDocumentoCodigoOrigen` y la serie NC se filtra por prefijo correspondiente. No puede haber inconsistencia si el usuario no puede elegir manualmente la combinación. | La consistencia está garantizada por el flujo, no por validación explícita. Correcto para este entorno. | — |

### D. Código de tipo de Nota de Crédito

| # | Ítem | Estado | Evidencia | Observaciones | Solución recomendada |
|---|---|---|---|---|---|
| 14 | Código en catálogo 01–13 | ⚠️ Parcial | `constants.ts:59–73` — los 13 códigos están definidos y son los que el dropdown muestra. Pero la validación solo verifica que el código sea no vacío, no que pertenezca al catálogo. | Un valor corrupto podría pasar si se manipulara el DOM. En uso normal el dropdown lo garantiza. | Agregar validación: `CODIGOS_NOTA_CREDITO_SUNAT.some(c => c.codigo === codigo)` |
| 15 | Código alineado con el motivo | ❌ No cumple | No existe ninguna validación de coherencia entre código y motivo. El usuario puede escribir cualquier texto libre en motivo sin relación con el código seleccionado. | Texto libre total — no hay guía semántica | Mínimo: mostrar sugerencia de motivo predeterminado por código. Opcionalmente: validar que el motivo no esté vacío del todo (ya se valida) |
| 16 | Validación funcional o normativa del código | ❌ No cumple | Solo existe la validación de "es requerido" (no vacío). No hay validación de que el código sea apropiado según el tipo de documento modificado, ni según las condiciones del comprobante origen. | Libre elección visual de los 13 códigos — ninguno bloqueado contextualmente | Implementar restricciones contextuales: código 11 solo para exportación, código 13 solo para facturas con crédito, etc. |
| 17 | Códigos con restricciones especiales | ❌ No cumple | Ningún código tiene restricciones o metadatos especiales implementados. El código 13 es tratado igual que el código 04. | Todos los códigos son igualmente seleccionables | Ver punto sobre código 13 en sección 7 |

### E. Motivo / descripción

| # | Ítem | Estado | Evidencia | Observaciones | Solución recomendada |
|---|---|---|---|---|---|
| 18 | El motivo existe | ✅ Cumple | `comprobanteValidation.ts:160–164` — validación de obligatoriedad del motivo. | Correcto | — |
| 19 | El motivo viaja al documento | ✅ Cumple | `useComprobanteActions.tsx:715` — `datosNotaCredito: data.noteCreditData ?? null` en relaciones de la instantánea. `noteCreditData.motivo` está en el payload. | La estructura del payload transporta correctamente el motivo | — |
| 20 | Coherencia mínima entre código y motivo | ❌ No cumple | Texto libre sin ninguna guía. El sistema no sugiere ni valida nada sobre el motivo basándose en el código. | Solo se valida que no sea vacío | Mínimo: sugerencia de texto base por código en el UI |

### F. Fecha

| # | Ítem | Estado | Evidencia | Observaciones | Solución recomendada |
|---|---|---|---|---|---|
| 21 | Fecha NC ≥ fecha del documento que modifica | ❌ No cumple | No existe ninguna comparación entre `fechaEmision` de la NC y `fechaEmision` del documento origen. La instantánea del origen tiene `identidad.fechaEmision`, pero no se compara con la fecha de la NC en ningún punto del flujo. | Fallo normativo. SUNAT puede rechazar una NC con fecha anterior al comprobante que modifica. | En `comprobanteValidation.ts` o en `EmisionTradicional.tsx`, comparar `fechaEmision` de la NC con `noteCreditState?.instantaneaDocumentoComercial.identidad.fechaEmision` |
| 22 | Regla implementada actualmente | ❌ No cumple | La regla no existe en ningún archivo del repositorio auditado. | — | Implementar la regla |

### G. Moneda

| # | Ítem | Estado | Evidencia | Observaciones | Solución recomendada |
|---|---|---|---|---|---|
| 23 | Moneda NC = moneda del documento modificado | ❌ No cumple | `EmisionTradicional.tsx` pasa la moneda actual (`currentCurrency`) al formulario, pero no la fuerza ni la inicializa desde la moneda del comprobante origen. El usuario puede cambiarla libremente. | La instantánea del origen tiene `identidad.moneda`, pero no se usa para inicializar ni validar la moneda de la NC. | Inicializar `moneda` de la NC desde `noteCreditState?.instantaneaDocumentoComercial.identidad.moneda`. Añadir validación en `comprobanteValidation.ts` si la moneda de la NC difiere de la del origen. |
| 24 | Importante para Factura | ❌ No cumple | Para facturas (especialmente en USD), el mismatch de moneda puede causar rechazo SUNAT. No hay ninguna lógica diferencial para facturas. | Mayor riesgo normativo en facturas | Aplicar validación estricta de moneda para facturas al menos |
| 25 | Para Boleta — salvedades | ❌ No cumple | Las boletas generalmente son en PEN y el mismatch puede ser observación o error según la OSE. No hay ninguna lógica de este tipo. | Menor riesgo que facturas pero igualmente relevante | Aplicar validación o al menos advertencia |
| 26 | El frontend respeta consistencia de moneda | ❌ No cumple | No existe ningún mecanismo de consistencia de moneda entre NC y documento origen. | — | — |

### H. Montos

| # | Ítem | Estado | Evidencia | Observaciones | Solución recomendada |
|---|---|---|---|---|---|
| 27 | NC no excede el total del documento modificado | ❌ No cumple | No existe ninguna validación de techo de monto. El total de la NC se calcula libremente desde el carrito sin compararlo con el total del documento origen. | La instantánea del origen tiene `totales.total`, pero no se pasa ni se valida contra el total de la NC. | En `validateComprobanteData` de `useComprobanteActions`, comparar `data.totals.total` con el total del documento origen (necesita que el total origen se pase como parte del context de NC) |
| 28 | Separación de análisis Factura vs. Boleta | ❌ No cumple | No existe distinción de validación de monto entre facturas y boletas. | — | Implementar para ambos casos |
| 29 | Validación actual de montos vs. origen | ❌ No cumple | La validación de `total > 0` en `useComprobanteActions:209–215` solo verifica que la NC tenga un total positivo, no que sea menor o igual al origen. | Solo se valida que el total sea > 0, no el límite máximo | Implementar techo máximo |

### I. Estados del comprobante origen

| # | Ítem | Estado | Evidencia | Observaciones | Solución recomendada |
|---|---|---|---|---|---|
| 30 | Solo NC si estado = Aceptado | ❌ No cumple | `ListaComprobantes.tsx:75–79` — `canGenerateCreditNote` solo excluye `'anulado'`. **FALLA CRÍTICA** | Ver detalle en sección 6 | Cambiar la condición para exigir `status === 'Aceptado'` |
| 31 | Bloqueado para Enviado/Rechazado/Por corregir/Anulado | ❌ No cumple | Solo 'Anulado' está bloqueado. | Ver sección 6 | — |
| 32 | Dónde existe hoy la lógica | ⚠️ Solo parcialmente | `canGenerateCreditNote` en `ListaComprobantes.tsx:75`. La lógica de acciones contextuales está en `InvoiceListTable.tsx` que recibe esta función como prop. | La lógica está centralizada en un solo lugar, lo que facilita corregirla | Corregir la función `canGenerateCreditNote` |
| 33 | Dónde debería implementarse si no existe | — | Ya existe el punto de implementación correcto. Solo hay que cambiar la condición. | — | — |

### J. Código 13

| # | Ítem | Estado | Evidencia | Observaciones | Solución recomendada |
|---|---|---|---|---|---|
| 34 | Reglas especiales del código 13 | ❌ No cumple | El código 13 está en `CODIGOS_NOTA_CREDITO_SUNAT` como cualquier otro código. No tiene ningún metadato especial, ninguna restricción de habilitación ni validación adicional. | Ver sección 7 | — |
| 35 | Solo cuando corresponde | ❌ No cumple | Se puede seleccionar en cualquier NC, incluyendo sobre boletas de contado o facturas de contado sin términos de pago. | — | — |
| 36 | Factura al crédito | ❌ No cumple | No se verifica si el documento modificado tiene `formaPago === 'credito'` o si tiene `creditTerms` definidos. | La instantánea del origen tiene `camposComerciales.terminosCredito` y `formaPagoId`, pero no se evalúan para restringir el código 13. | Verificar en el momento de selección del código 13: si `noteCreditState?.instantaneaDocumentoComercial.camposComerciales.terminosCredito` es null, bloquear o advertir |
| 37 | Términos de pago, cuotas, fechas de vencimiento | ❌ No cumple | No existe ninguna validación ni verificación de estas condiciones para el código 13. | — | — |

### K. Diferencias entre Factura y Boleta

| # | Ítem | Estado | Evidencia | Observaciones | Solución recomendada |
|---|---|---|---|---|---|
| 39 | Reglas iguales para ambos | — | Las reglas de: código requerido, motivo requerido, documento relacionado requerido, son iguales para ambos tipos. Correcto. | — | — |
| 40 | Reglas con diferencias | ❌ No implementado | Diferencias no implementadas: (a) moneda: más estricta en factura; (b) código 13: solo para facturas al crédito; (c) códigos 11 y 12: restricciones específicas (exportación, IVAP). El sistema aplica exactamente las mismas reglas a factura y boleta. | — | Ver secciones de moneda, código 13 y restricciones por código |
| 41 | El sistema distingue correctamente | ⚠️ Parcial | A nivel de **serie y código SUNAT** (01 vs 03): sí distingue. A nivel de **validaciones de negocio**: no distingue. | La distinción es estructural pero no normativa | — |

### L. Estructura XML / UBL esperada

| # | Ítem | Estado | Evidencia | Observaciones |
|---|---|---|---|---|
| 42 | `cbc:ID` | ✅ Cumple conceptualmente | `identidad.numeroCompleto` = serie-correlativo de la NC | Disponible en payload |
| 42 | `cbc:IssueDate` | ✅ Cumple conceptualmente | `identidad.fechaEmision` | Disponible |
| 42 | `cbc:IssueTime` | ✅ Cumple conceptualmente | `identidad.horaEmision` | Disponible |
| 42 | `cbc:DocumentCurrencyCode` | ⚠️ Parcial | `identidad.moneda` disponible, pero puede diferir de la moneda del documento origen (ver punto G) | Riesgo si moneda difiere |
| 42 | `cac:DiscrepancyResponse` | ✅ Cumple conceptualmente | `relaciones.datosNotaCredito.codigo` (ResponseCode) + `motivo` (Description) + `documentoRelacionado.numeroCompleto` (ReferenceID) | Todos los datos presentes |
| 42 | `cac:BillingReference / InvoiceDocumentReference` | ✅ Cumple conceptualmente | `documentoRelacionado.numeroCompleto` (ID) + `tipoDocumentoCodigoOrigen` (DocumentTypeCode) | Disponible para que el backend construya el elemento |
| 42 | Detalle de líneas (`CreditNoteLine`) | ✅ Cumple conceptualmente | `detalle.items` = array de `CartItem` con precio, cantidad, tipo IGV, unidad de medida | Suficientemente estructurado |
| 42 | Totales (`TaxTotal`, `LegalMonetaryTotal`) | ✅ Cumple conceptualmente | `totales = { subtotal, igv, total, taxBreakdown }` | Disponible |
| 42 | Emisor (`AccountingSupplierParty`) | ✅ Cumple conceptualmente | `empresa = { ruc, razonSocial, nombreComercial }` | Disponible |
| 42 | Adquirente (`AccountingCustomerParty`) | ✅ Cumple conceptualmente | `cliente = { numeroDocumento, codigoSunatDocumento, nombre, direccion }` | Disponible |
| 43 | Firma digital / certificado | — | No aplica en frontend. Responsabilidad del backend/OSE. | Correcto no tenerlo en frontend |

### M. Preparación para backend

| # | Ítem | Estado | Evidencia | Observaciones |
|---|---|---|---|---|
| 44 | Frontend preparado para conexión backend | ⚠️ Parcial | La `InstantaneaDocumentoComercial` es una estructura rica y bien tipada. El payload de NC está completo estructuralmente. Las reglas de negocio críticas (estado, fecha, moneda, monto máximo) no están implementadas. | El backend puede recibir datos correctos, pero puede generar documentos con inconsistencias normativas | |
| 45 | Qué validaciones deben vivir en frontend | — | Ver sección 8 | — |

---

## 5. Diferencias entre Factura y Boleta

### Lo que está igual en la implementación actual (y debería estarlo)

- Tipo de documento NC → código SUNAT '07' para ambos.
- Catálogo de códigos (01–13) disponible para ambos.
- Validación de campos: código, motivo, documentoRelacionado — mismo tratamiento.
- Flujo de emisión — mismo formulario, misma validación.
- Restricción de forma de pago — NC no requiere forma de pago para ninguno de los dos.

### Lo que cambia (y el sistema no lo diferencia)

| Diferencia | Para Factura | Para Boleta | Estado actual |
|---|---|---|---|
| **Moneda** | Aplica estrictamente. NC en USD debe modificar factura en USD. Rechazo SUNAT si difiere. | Boletas son generalmente PEN. El mismatch puede ser observación o error según OSE. | ❌ No diferenciado |
| **Código 13** | Solo aplica si la factura es al crédito con cuotas o fecha de vencimiento. | No aplica a boletas (boletas son siempre contado). | ❌ No diferenciado. El código 13 se puede seleccionar en NC de boleta. |
| **Código 11** (Ajustes de operaciones de exportación) | Aplica solo si la factura es de exportación (cliente extranjero, sin IGV, tipo de operación exportación). | No aplica a boletas. | ❌ No diferenciado |
| **Código 12** (Ajustes IVAP) | Puede aplicar según tipo de operación agraria. | Aplicable pero más raro. | ❌ No diferenciado |
| **RUC del receptor** | Para NC de factura, el receptor debe tener RUC (persona jurídica o natural con RUC). | Para NC de boleta, el receptor puede tener DNI u otro doc. | ✅ Parcialmente correcto — el tipo del receptor se hereda del documento origen, que ya tiene esta restricción |
| **Salvedades de validación SUNAT** | SUNAT es más estricta con facturas. Las observaciones en facturas frecuentemente se convierten en rechazos. | Para boletas hay más tolerancia normativa en algunos aspectos. | ❌ No diferenciado en frontend |

### Conclusión de diferencias

El sistema distingue correctamente a nivel **estructural** (tipo de documento SUNAT, prefijo de serie) pero no a nivel **normativo de validación de negocio**. Un operador podría generar una NC con código 13 sobre una boleta de contado, que es normativamente incorrecto, y el sistema lo permitiría sin advertencia.

---

## 6. Regla de estados del comprobante origen

### Estados detectados en el repositorio

El sistema actualmente solo tiene implementado **un estado real**: `'Enviado'`.

**Evidencia:**
- `useComprobanteActions.tsx:732` — `status: 'Enviado', statusColor: 'blue'` — hardcodeado en la creación de todo comprobante.
- `ListaComprobantes.tsx:649` — cuando se anula un comprobante, se asigna `status: 'Anulado', statusColor: 'red'`.
- `ComprobantesListContext.tsx:23` — `status: string` — tipo libre, sin enum.

El sistema **nunca** asigna los estados `'Aceptado'`, `'Rechazado'`, ni `'Por corregir'` a ningún comprobante. No existe ninguna función o flujo que transite a esos estados porque no hay integración con SUNAT/OSE.

### Análisis de la función crítica

```
ListaComprobantes.tsx — líneas 75–79:

const canGenerateCreditNote = (invoice: Comprobante): boolean => {
  const tipo = resolveTipoComprobante(invoice.type);
  const status = String(invoice.status || '').toLowerCase();
  return (tipo === 'factura' || tipo === 'boleta') && !status.includes('anulado');
};
```

**Consecuencia directa:** Como todo comprobante tiene `status = 'Enviado'`, y `'Enviado'` no incluye `'anulado'`, **TODOS los comprobantes Factura y Boleta emitidos permiten generar NC inmediatamente**, incluso recién emitidos y sin confirmación SUNAT.

### Lo que falta

1. **Definición del ciclo de vida de estados**: `'Enviado' → 'Aceptado' | 'Rechazado' | 'Por corregir'` y eventualmente `'Anulado'`.
2. **Transición de estados**: Una acción o mecanismo que actualice el estado del comprobante basándose en la respuesta de SUNAT/OSE.
3. **Cambio de la regla en `canGenerateCreditNote`**: La condición correcta es que `status.toLowerCase() === 'aceptado'`.

### Dónde implementar la restricción

La restricción debe implementarse en **dos capas**:
1. **`canGenerateCreditNote`** en `ListaComprobantes.tsx` — primer punto de control (habilitación del botón).
2. **`comprobanteValidation.ts`** — validación programática antes de emitir (en caso de que el estado cambie entre selección y emisión). Requeriría pasar el estado del comprobante origen como parte del contexto de validación NC.

### Consideración importante para el entorno actual (sin backend)

Dado que el backend no existe, todos los comprobantes son `'Enviado'` y nunca llegarán a `'Aceptado'`. Esto significa que implementar la regla `status === 'Aceptado'` correctamente haría **imposible** generar NC en el entorno actual de desarrollo/demo.

**Solución pragmática recomendada** (sin que sea un parche): Implementar la regla correcta pero con un **flag de configuración de entorno** (ej: `SUNAT_STATUS_ENFORCEMENT_ENABLED = false` en mock, `true` en producción), que permita saltar la validación en el entorno de desarrollo mientras el backend no existe. Esto deja la regla correcta implementada y lista para producción.

---

## 7. Regla especial del código 13

### Estado actual

El código 13 en `constants.ts:72` está definido como:
```
{
  codigo: '13',
  descripcion: 'Corrección o modificación del monto neto pendiente de pago y/o la(s) fechas(s) de vencimiento del pago único o de las cuotas y/o los montos correspondientes a cada cuota, de ser el caso',
  descripcionCorta: 'Corrección de monto o vencimiento'
}
```

No hay ninguna diferencia de tratamiento entre el código 13 y cualquier otro código en el sistema. Se puede seleccionar libremente.

### Qué implica normativamente el código 13

El código 13 es un caso muy especial:
1. **Solo aplica a facturas** (no a boletas, que son siempre de contado).
2. **Solo aplica a facturas emitidas al crédito** — con términos de pago (cuotas y/o fecha de vencimiento única).
3. No modifica el importe total del comprobante original, solo modifica las condiciones de pago (fechas, cuotas, montos de cuotas).
4. En UBL 2.1, este tipo de NC tiene restricciones especiales en el elemento `PaymentTerms` o `PaymentMeans`.
5. El sistema modificado debe haberse emitido con la sección de términos de pago completa.

### Qué faltaría exactamente

Para implementar correctamente el código 13 se necesitaría:

1. **Verificar que el documento origen tiene crédito**: `noteCreditState?.instantaneaDocumentoComercial.camposComerciales.terminosCredito !== null`.
2. **Verificar que el documento origen es una Factura** (no Boleta).
3. **Bloquear la selección del código 13** si el origen no cumple las condiciones.
4. **Adaptar el formulario NC** cuando se selecciona código 13: el importe de la NC puede no ser el total del comprobante sino una diferencia de condición de pago, no necesariamente un monto de devolución.
5. **Validación de la nueva condición de pago** propuesta: que el total de las nuevas cuotas/fecha sea coherente.

**Evidencia de lo que está disponible pero no se usa:**
- `noteCreditState?.instantaneaDocumentoComercial.camposComerciales.terminosCredito` — disponible y tipado.
- `noteCreditState?.instantaneaDocumentoComercial.camposComerciales.formaPagoId` — disponible.

Toda la información necesaria para validar el código 13 está presente en la instantánea, pero no se evalúa.

---

## 8. Preparación del frontend para backend futuro

### Qué está bien preparado

| Elemento | Estado | Detalle |
|---|---|---|
| Estructura del payload NC | ✅ Bien preparado | `InstantaneaDocumentoComercial` + `DatosNotaCredito` + `relaciones` contiene todo lo necesario para construir un XML UBL 2.1 de NC |
| Tipo de documento (07) | ✅ Bien preparado | Hardcoded correctamente, no depende de lógica dinámica |
| Código y motivo NC | ✅ Bien preparado | Campos tipados, validados, en el payload |
| Referencia al documento origen (ID, tipo) | ✅ Bien preparado | `tipoDocumentoCodigoOrigen`, `serie`, `numero`, `numeroCompleto` — todos presentes |
| Datos de emisor (empresa, establecimiento) | ✅ Bien preparado | Se toman de la sesión activa |
| Datos del receptor (cliente) | ✅ Bien preparado | Se heredan del documento origen |
| Detalle de ítems | ✅ Bien preparado | `CartItem` con precio, cantidad, tipo IGV, unidad de medida, código SUNAT de producto |
| Totales e IGV | ✅ Bien preparado | `taxBreakdown` disponible por tipo de afectación |
| Distinción factura/boleta en el payload | ✅ Bien preparado | `tipoDocumentoCodigoOrigen: '01' | '03'` — correcto |

### Qué no está bien preparado

| Elemento | Estado | Detalle |
|---|---|---|
| Estado del comprobante origen en el payload de NC | ❌ No preparado | El estado del comprobante origen no viaja al formulario de NC ni se valida al momento de emitir |
| Moneda forzada desde el origen | ❌ No preparado | La moneda de la NC no se inicializa desde la moneda del documento origen |
| Total máximo del documento origen | ❌ No preparado | El total del origen no se pasa al contexto de la NC para validar el techo |
| Fecha mínima del documento origen | ❌ No preparado | La fecha del documento origen no se usa para validar la fecha mínima de la NC |

### Qué validaciones deben vivir en frontend (independientemente del backend)

Estas reglas deben estar en el frontend porque son reglas de negocio que mejoran la experiencia del usuario y previenen errores antes de llegar al backend:

| Regla | Justificación |
|---|---|
| Estado del comprobante origen = Aceptado | UX: el usuario no debe esperar la respuesta del backend para saber que no puede emitir NC sobre un comprobante no aceptado |
| Fecha NC ≥ fecha origen | UX: error inmediato antes de enviar |
| Moneda NC = moneda origen | UX: error o advertencia inmediata |
| Total NC ≤ total origen | UX: error inmediato |
| Código 13 solo con documento de crédito | UX: advertencia contextual al seleccionar el código |
| Código pertenecer al rango 01–13 | Seguridad mínima contra manipulación de DOM |

### Qué validaciones solo se cierran con backend/SUNAT/OSE

| Regla | Por qué es del backend |
|---|---|
| Verificación de que el comprobante origen realmente fue aceptado por SUNAT | El frontend solo conoce el estado local en memoria |
| Validación de que no exista ya una NC que cubra el total del documento origen | Requiere consultar el historial de NC del backend |
| Firma digital del XML | Exclusivamente backend/OSE |
| Validación cruzada contra el XML real enviado a SUNAT | Solo backend/OSE |
| Numeración correlativa real | Exclusivamente backend |
| Verificación de que el RUC del emisor y del receptor estén activos en SUNAT | Solo backend via API SUNAT |

---

## 9. Solución recomendada

SIN IMPLEMENTARLA. Solo el orden y la naturaleza de los ajustes recomendados.

### Prioridad 1 — Correcciones críticas (bloquean la corrección normativa más importante)

1. **Definir un tipo union para estados de comprobante** (`'Enviado' | 'Aceptado' | 'Rechazado' | 'Por corregir' | 'Anulado'`) en `ComprobantesListContext.tsx`. Esto da type safety para las comparaciones de estado.

2. **Corregir `canGenerateCreditNote`** en `ListaComprobantes.tsx`: cambiar la condición para que solo permita NC cuando `status === 'Aceptado'`. Agregar un flag de entorno para saltarse esta restricción en modo de desarrollo/mock.

3. **Pasar la moneda, el total y la fecha del documento origen** al contexto de navegación NC (`CargaReutilizacionDocumentoComercial`), para que estén disponibles en el formulario como parámetros de validación.

### Prioridad 2 — Validaciones normativas faltantes

4. **Validar fecha NC ≥ fecha origen** en `comprobanteValidation.ts` o en `EmisionTradicional.tsx` al momento de calcular `noteCreditRequiredFieldsPending`.

5. **Validar moneda NC = moneda origen** en `comprobanteValidation.ts`. Inicializar la moneda de la NC desde la moneda del origen en `EmisionTradicional.tsx` (no permitir cambio de moneda en flujo NC).

6. **Validar total NC ≤ total origen** en `validateComprobanteData` de `useComprobanteActions.tsx`. Requiere que el total del origen esté disponible.

7. **Validar que el código NC pertenezca al catálogo 01–13** en `comprobanteValidation.ts`.

### Prioridad 3 — Código 13 y diferencias Factura/Boleta

8. **Agregar metadato a `CODIGOS_NOTA_CREDITO_SUNAT`** en `constants.ts`: flags de restricción por código (p.ej. `requiereCredito`, `soloFactura`, `soloExportacion`, `soloIVAP`).

9. **Implementar restricción del código 13**: si se selecciona código 13, verificar que el documento origen tiene `terminosCredito` no nulo y es una Factura. Mostrar advertencia o error si no cumple.

10. **Implementar advertencia para código 11** (solo exportación) y **código 12** (solo IVAP) — verificar tipo de operación del documento origen.

11. **Bloquear código 13 en NC de Boleta** — regla estricta.

### Prioridad 4 — Calidad normativa y UX

12. **Sugerencias de motivo predeterminado** por código seleccionado — mejorar la guía al usuario sin restringir texto libre.

13. **Agregar estado `'Aceptado'`** como transición posible desde el backend cuando esté disponible — diseñar el mecanismo de actualización de estado desde respuesta SUNAT/OSE.

---

## 10. Archivos exactos que habría que tocar después

| Archivo | Motivo del cambio |
|---|---|
| `lista-comprobantes/contexts/ComprobantesListContext.tsx` | Agregar union type para `status` del comprobante. Definir los 5 estados normativos. |
| `lista-comprobantes/pages/ListaComprobantes.tsx` | Corregir `canGenerateCreditNote` para exigir `status === 'Aceptado'`. Agregar flag de entorno. |
| `models/comprobante.types.ts` | Agregar tipo union para `ComprobanteStatus`. Considerar tipo union para `DatosNotaCredito.codigo`. |
| `models/constants.ts` | Agregar metadatos de restricción a `CODIGOS_NOTA_CREDITO_SUNAT` (requiereCredito, soloFactura, etc.). |
| `models/instantaneaDocumentoComercial.ts` | Agregar `monedaOrigen`, `totalOrigen`, `fechaEmisionOrigen` y `estadoOrigen` a `CargaReutilizacionDocumentoComercial` o a `RelacionesDocumentoComercial`. |
| `shared/core/comprobanteValidation.ts` | Agregar validaciones: fecha NC ≥ fecha origen; moneda NC = moneda origen; total NC ≤ total origen; código en rango 01–13; código 13 requiere crédito + factura. |
| `hooks/useComprobanteActions.tsx` | Agregar validación de techo de monto (total NC ≤ total origen) en `validateComprobanteData`. Revisar el campo `documentoOrigenId` para garantizar que siempre tenga valor real. |
| `pages/EmisionTradicional.tsx` | Inicializar moneda desde la moneda del comprobante origen en flujo NC. Pasar restricción de moneda al formulario. Considerar bloqueo de cambio de moneda en flujo NC. |
| `shared/form-core/components/CompactDocumentForm.tsx` | Agregar advertencia contextual cuando se selecciona código 13 sin condiciones de crédito. Deshabilitar cambio de moneda en flujo NC. |

---

*Fin del informe de auditoría extrema.*
*Ningún archivo fue modificado durante esta auditoría.*
