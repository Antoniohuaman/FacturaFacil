# Validación concluyente de bloqueantes de Cotizaciones

> Informe complementario a `AUDITORIA_EXTREMA_COTIZACIONES.md`.
> No modifica ni reemplaza ese documento ni `AUDITORIA_EXTREMA_DOCUMENTOS_COMERCIALES.md`.

---

## 1. Información de la validación

| Campo | Valor |
|---|---|
| **Fecha** | 2026-06-24 |
| **Rama** | `RevisionCotizacion` |
| **Commit HEAD** | `4412dcbb` |
| **Estado Git** | Limpio (sin cambios no confirmados) |
| **Build** | ✅ Pasa (22.22 s, advertencia de chunk size — sin errores) |
| **ESLint** | ✅ Pasa (0 errores, 0 advertencias) |
| **TypeScript** | ✅ Sin errores de tipos en lectura estática |
| **Tests** | ❌ 0 tests en el módulo (no ejecutables) |
| **Runtime** | ❌ Aplicación no iniciada — flujos funcionales: NO VERIFICABLE |

### Archivos leídos completamente en esta validación

| Archivo | Propósito |
|---|---|
| `useCreditTermsConfigurator.ts` | Motor de crédito/cuotas |
| `useDocumentoComercialDrafts.ts` | Borrador en progreso (wrapper) |
| `useBorradorEnProgreso.ts` | Motor genérico de borradores |
| `FormularioDocumentoComercial.tsx` | Formulario principal completo |
| `useDocumentoComercialState.ts` | Estado del formulario |
| `useDocumentoComercialActions.ts` | Acciones de negocio (completo) |
| `documentoComercial.storage.ts` | Persistencia |
| `DocumentosComercialesContext.tsx` | Contexto y reducer |
| `postEmisionOrdenVenta.ts` | Escrituras post-emisión |
| `shared/tenant/index.ts` | Construcción de claves LS |
| `documentoComercial.constants.ts` | Constantes del módulo |
| `ListadoDocumentosComerciales.tsx` | Listado + filtrado |

### Limitaciones

- Sin ejecución en runtime: todos los flujos calificados "Confirmado mediante trazabilidad estática completa" o "No verificable".
- Se excluyó explícitamente la modificación de código.

---

## 2. Resumen ejecutivo

| Punto | Resultado | Severidad original | Severidad final | Bloquea entrega |
|---|---|---|---|---|
| COT-P1-001 Sincronización inversa | **CONFIRMADO — RECLASIFICADO** | P1 | **P2** | No |
| COT-P1-002 Crédito en COT→NV/OV | **CONFIRMADO** | P1 | **P1** | Sí |
| COT-P1-003 Crédito en borrador | **CONFIRMADO** | P1 | **P1** | Sí |
| Claves localStorage post-emisión | **DESCARTADO como P1/P2** | P2 (§23) | P3 (naming) | No |
| Filtrado por establecimiento | **CONFIRMADO** | P3-003 | P3-003 | No |
| Guards de negocio | **CONFIRMADO** | P3-001 | P3-001 | No |

**Hallazgos P1 restantes: 2 (COT-P1-002, COT-P1-003)**

**Veredicto actualizado: 🔴 COTIZACIONES NO LISTO PARA ENTREGA**

---

## 3. Validación COT-P1-001: Sincronización inversa desde NV/OV hacia Cotización convertida

### 3.1 Cadena completa de llamadas

```
handleGenerar() [FormularioDocumentoComercial.tsx:266-274]
  └─ actions.actualizarDocumento(documentoExistente.id, datos)
       └─ si resultado.exito && modo==='editar' && !esBorradorEdicion
            && documentoExistente.tipo !== 'cotizacion'
            && documentoExistente.trazabilidad?.documentoOrigenId
          → actions.sincronizarCotizacionDesdeDocumento(documentoExistente.id)
               └─ [useDocumentoComercialActions.ts:912-943]
                    1. Busca doc en state por docId
                    2. Lee doc.trazabilidad.documentoOrigenId (id de la COT)
                    3. Busca la COT en state: tipo='cotizacion' && estado='Convertida'
                    4. Si no la encuentra → RETURN (guard por estado 'Convertida')
                    5. actualizarEnContext({
                         ...cotizacion,           ← spread del COT original
                         cliente:      doc.cliente,
                         items:        doc.items,
                         totales:      doc.totales,
                         observaciones: doc.observaciones,
                         formaPago:    doc.formaPago,
                         moneda:       doc.moneda,
                         fechaActualizacion: ahora,
                         historial: [
                           ...cotizacion.historial,
                           crearEvento('Datos comerciales sincronizados desde documento relacionado',
                                       session?.userName,
                                       `Sincronizado desde: ${doc.numero ?? doc.id}`)
                         ]
                       })
```

**Confirmado mediante trazabilidad estática completa.**

### 3.2 Campos modificados vs preservados

| Campo | ¿Modificado? | Valor resultante |
|---|---|---|
| `cliente` | ✅ SÍ | Del documento NV/OV |
| `items` | ✅ SÍ | Del documento NV/OV |
| `totales` | ✅ SÍ | Del documento NV/OV |
| `observaciones` | ✅ SÍ | Del documento NV/OV |
| `formaPago` | ✅ SÍ | Del documento NV/OV |
| `moneda` | ✅ SÍ | Del documento NV/OV |
| `fechaActualizacion` | ✅ SÍ | Timestamp actual |
| `historial` | ✅ SÍ (append) | Agrega evento "Datos comerciales sincronizados..." |
| `creditTerms` | ❌ NO | Preservado del COT original |
| `trazabilidad` | ❌ NO | Preservado (trazabilidad.documentoDestinoId intacto) |
| `estado` | ❌ NO | Sigue en 'Convertida' |
| `camposOpcionales` | ❌ NO | Preservado del COT original (vía spread ...cotizacion) |
| `id`, `numero`, `serie`, `tipo` | ❌ NO | Preservados |

### 3.3 Corrección de error del informe de auditoría previo

> **El informe de auditoría previa (`AUDITORIA_EXTREMA_COTIZACIONES.md`) declaró en §22.1: "Sin aviso al usuario" y en §22.2: "creditTerms NOT touched" (correcta) y en §6 "Prueba T-17: COT-P1-001 — Sobreescribe sin aviso".**

**Corrección técnica confirmada**: la auditoría previa **NO mencionó que `sincronizarCotizacionDesdeDocumento` SÍ agrega un evento al historial**. El historial recibe el evento `'Datos comerciales sincronizados desde documento relacionado'` con el nombre del documento destino. La afirmación de que la operación "no queda registrada" en el historial era incorrecta.

### 3.4 Carácter intencional de la sincronización

El código contiene el comentario explícito en `FormularioDocumentoComercial.tsx:266`:
```typescript
// Regla 7: al editar una NV/OV generada desde cotización, sincronizar datos comerciales
```

Y la función está documentada en su JSDoc en `useDocumentoComercialActions.ts:115-117`:
```typescript
/** Sincroniza datos comerciales (cliente, ítems, totales, observaciones) de una NV/OV
 *  a la cotización origen cuando el documento relacionado es editado. */
```

**La sincronización en edición del destino ES una decisión arquitectural intencional**, no un bug.

### 3.5 Comparación con flujo de conversión inicial

Durante la **conversión inicial** (COT→NV, primera vez), si el usuario cambia datos:
- Se muestra el modal de cambios comerciales con el texto: *"Al confirmar, estos cambios también quedarán reflejados en la cotización de origen."*
- El usuario debe hacer clic en "Confirmar y guardar"
- Solo entonces `vincularDocumentoConCotizacion` se llama con `dadosComerciais`
- El historial registra "Datos comerciales actualizados en conversión"

Durante la **edición posterior** de la NV/OV (modo=`'editar'`):
- No hay modal de confirmación previa
- `sincronizarCotizacionDesdeDocumento` se ejecuta directamente
- El historial SÍ registra "Datos comerciales sincronizados desde documento relacionado"

**La diferencia es la ausencia de confirmación previa en el flujo de edición**, pero la operación no es silenciosa en términos de trazabilidad.

### 3.6 Escenarios reconstruidos

**Escenario A — Editar NV generada desde COT:**

| Paso | Acción | Estado COT |
|---|---|---|
| 1 | COT creada con Cliente A, 5 ítems | Vigente |
| 2 | COT marcada Aceptada | Aceptada |
| 3 | COT convertida a NV | Convertida (trazabilidad → NV) |
| 4 | NV editada: cambia cliente, ítems, moneda | — (solo NV en edición) |
| 5 | NV guardada (`modo='editar'`) | — |
| 6 | `sincronizarCotizacionDesdeDocumento` ejecutada | **Convertida** — cliente/ítems/moneda sobreescritos con datos de NV; historial: "Datos comerciales sincronizados..." |

**Escenario B — Editar OV generada desde COT**: comportamiento idéntico.

### 3.7 Regla funcional pendiente de decisión

Existen dos modelos igualmente válidos. Esta decisión requiere confirmación del dueño del producto:

**Opción 1 — COT histórica inmutable tras convertirse**
- La COT preserva exactamente lo que fue cotizado originalmente
- La NV/OV puede ser editada libremente sin afectar la COT
- Ventaja: integridad histórica del acuerdo comercial original
- Riesgo: divergencia entre lo cotizado y lo facturado (dificulta auditorías)
- Efecto trazabilidad: la trazabilidad apunta al documento destino pero los datos divergen
- Efecto anulación: la COT restaurada a 'Aceptada' conservaría los datos originales
- **Recomendación técnica**: eliminar la llamada a `sincronizarCotizacionDesdeDocumento` en modo edición del destino

**Opción 2 — COT sincronizada con el documento destino (comportamiento actual)**
- La COT refleja siempre el estado actual del documento destino
- El historial del COT registra cada sincronización
- Ventaja: la COT actúa como "vista viva" del acuerdo final; facilita seguimiento
- Riesgo: el acuerdo original se pierde; no hay rollback si la edición fue un error
- Efecto trazabilidad: coherente con la idea de que COT = resumen del proceso comercial
- Efecto anulación: la COT restaurada a 'Aceptada' tendrá los datos del último destino editado
- **Recomendación técnica**: agregar modal de confirmación en modo edición del destino (para equiparar la UX con el flujo de conversión inicial)

### 3.8 Clasificación final COT-P1-001

| | |
|---|---|
| **Resultado** | CONFIRMADO — RECLASIFICADO |
| **Severidad anterior** | P1 |
| **Severidad final** | **P2** |
| **Justificación** | La sincronización es intencional ("Regla 7"), documentada y registrada en historial. El riesgo es real pero requiere una decisión funcional (no es un bug de código). Sin confirmación de usuario solo en el path de edición del destino, que contrasta con el path de conversión inicial donde sí se muestra modal. |
| **Bloquea entrega** | No (depende de decisión funcional sobre Regla 7) |

---

## 4. Validación COT-P1-002: Crédito y cuotas en COT→NV / COT→OV

### 4.1 Cadena completa de crédito

**Paso 1 — Cotización: cómo se genera `creditTerms`**

```typescript
// FormularioDocumentoComercial.tsx:91-97
const paymentMethodId = useMemo(() => {
  if (!estado.formaPago) return undefined;
  return configState.paymentMethods.find((m) => m.name === estado.formaPago)?.id ?? undefined;
}, [estado.formaPago, configState.paymentMethods]);

const { isCreditMethod, templates, setTemplates, creditTerms, ... } =
  useCreditTermsConfigurator({ paymentMethodId, total: totales.total, issueDate: estado.fechaEmision });
```

```typescript
// useCreditTermsConfigurator.ts:16-95
const paymentMethod = state.paymentMethods.find((method) => method.id === paymentMethodId);
const isCreditMethod = paymentMethod?.code === 'CREDITO';
const defaultTemplates = (isCreditMethod && paymentMethod?.creditSchedule ? paymentMethod.creditSchedule : []);
const [templates, setTemplates] = useState<CreditInstallmentDefinition[]>(defaultTemplates);
// creditTerms se calcula desde templates (no desde prefillFrom.creditTerms)
const creditTerms: ComprobanteCreditTerms | undefined = useMemo(() => {
  if (!isCreditMethod || !schedule) return undefined;
  return { schedule: schedule.cuotas, fechaVencimientoGlobal, totalPorcentaje };
}, [isCreditMethod, schedule]);
```

**Paso 2 — El COT guardado incluye `creditTerms`**

```typescript
// useDocumentoComercialActions.ts generarDocumento (línea aprox. 400-402):
creditTerms: datos.creditTerms,
```

```typescript
// obtenerDatosFormulario (FormularioDocumentoComercial.tsx:151-165):
creditTerms: isCreditMethod ? creditTerms : undefined,
```

✅ `DatosFormularioDocumentoComercial.creditTerms` está incluido y se persiste en el documento.

**Paso 3 — Conversión COT→NV: inicialización del formulario**

```typescript
// FormularioDocumentoComercial.tsx:117-149 (efecto de inicialización one-shot)
estado.aplicarValoresIniciales({
  tipoDocumento: tipoInicial,
  fechaEmision: ...,
  cliente: source.cliente ?? null,
  moneda: source.moneda,
  formaPago: source.formaPago ?? '',          // ← formaPago TRANSFERIDO ✅
  camposOpcionales: source.camposOpcionales ?? {},
  observaciones: source.observaciones ?? '',
  notaInterna: source.notaInterna ?? '',
  modoProductos: source.modoItems,
  // creditTerms: NO incluido ❌
});
```

**Paso 4 — `useCreditTermsConfigurator` inicializa con templates DEFAULT**

```typescript
// useCreditTermsConfigurator.ts:30-44
const [templates, setTemplates] = useState<CreditInstallmentDefinition[]>(defaultTemplates);
useEffect(() => {
  if (lastMethodIdRef.current !== paymentMethod?.id) {
    setTemplates(defaultTemplates);  // ← usa defaultTemplates, no prefillFrom.creditTerms
    lastMethodIdRef.current = paymentMethod?.id ?? null;
  }
}, [defaultTemplates, isCreditMethod, paymentMethod?.id]);
```

**No existe ningún mecanismo alternativo** (props, useEffect, contexto, estado de navegación) que transfiera `prefillFrom.creditTerms` al configurador de crédito.

### 4.2 Matriz de transferencia por ruta

#### Ruta A: COT → NV (nota_venta)

| Campo | COT origen | Mecanismo de transferencia | NV destino | ¿Transferido? |
|---|---|---|---|---|
| Forma de pago (nombre) | `formaPago = 'Crédito 30d'` | `aplicarValoresIniciales.formaPago` | `formaPago = 'Crédito 30d'` | ✅ Sí |
| ¿Es método de crédito? | `isCreditMethod = true` | Derivado de formaPago en `paymentMethodId` | `isCreditMethod = true` | ✅ Sí |
| Templates DEFAULT del método | `paymentMethod.creditSchedule` | `useCreditTermsConfigurator defaultTemplates` | Cargados | ✅ Sí |
| Templates PERSONALIZADOS | Cuotas customizadas en COT | ❌ No hay mecanismo | `defaultTemplates` del método | ❌ **NO** |
| Número de cuotas (custom) | 3 (personalizado) | — | N (default del método) | ❌ **NO** |
| Fechas de cuotas (custom) | Fechas específicas | — | Recalculadas desde issueDate | ❌ **NO** |
| Montos de cuotas (custom) | Montos negociados | — | Recalculados desde total/default | ❌ **NO** |
| `creditTerms` completo | Objeto serializado en COT | ❌ No aplicado a configurador | Objeto recalculado desde defaults | ❌ **NO** (si custom) |
| Valor persistido al generar NV | — | `obtenerDatosFormulario().creditTerms` | De `useCreditTermsConfigurator.creditTerms` | ⚠️ Default, no custom |

#### Ruta B: COT → OV (orden_venta)

Idéntica a Ruta A. Mismo mecanismo, mismo resultado.

#### Ruta C: COT → Comprobante (factura/boleta)

```typescript
// convertirOVaComprobante.ts construirCargaConversionDesdeCotizacion
terminosCredito: cotizacion.creditTerms ?? null,  // ← directo del COT
```

| Campo | COT origen | NV destino | ¿Transferido? |
|---|---|---|---|
| `creditTerms` completo | Objeto serializado | `terminosCredito` en payload | ✅ Sí (todos los campos) |
| Cuotas personalizadas | 3 cuotas custom | 3 cuotas custom | ✅ Sí |

### 4.3 Distinción entre pérdida en default vs. custom

| Escenario | ¿Se pierden creditTerms? |
|---|---|
| COT con formaPago contado, sin crédito | No aplica |
| COT con formaPago crédito + templates DEFAULT sin modificar | NO — el configurador reconstruye desde los mismos defaults |
| COT con formaPago crédito + templates PERSONALIZADOS | **SÍ — los templates custom se pierden silenciosamente** |

**El caso crítico es exactamente el uso avanzado del módulo**: un usuario que configura cuotas personalizadas en la cotización y luego convierte a NV/OV. Las cuotas custom se reemplazan por los defaults del método de pago.

### 4.4 Verificación de mecanismos alternativos

Se revisaron los siguientes mecanismos potenciales para transferir `creditTerms`:

| Mecanismo | ¿Existe? | ¿Transfiere creditTerms? |
|---|---|---|
| Props directas a `useCreditTermsConfigurator` | No — solo `paymentMethodId`, `total`, `issueDate` | ❌ No |
| `useEffect` en `FormularioDocumentoComercial` | El one-shot init no incluye creditTerms | ❌ No |
| Contexto React | El contexto no gestiona creditTerms del formulario | ❌ No |
| Estado de navegación (`location.state`) | `prefillFrom.creditTerms` existe pero nunca se usa para inicializar templates | ❌ No |
| `useCreditTermsConfigurator.setTemplates` | Expuesto, pero nunca llamado con `prefillFrom.creditTerms` | ❌ No se llama |
| Hook de pagos (`usePayment`) | Solo calcula totales | ❌ No |
| Modal de cuotas | Solo modifica templates post-init | ❌ No auto-carga |

**Conclusión**: No existe ningún mecanismo que transfiera los templates personalizados. La pérdida es estructural.

### 4.5 Clasificación final COT-P1-002

| | |
|---|---|
| **Resultado** | CONFIRMADO |
| **Severidad** | **P1** |
| **Condición de pérdida** | Solo cuando el usuario personaliza el cronograma de cuotas respecto al template default del método de pago |
| **Detectabilidad** | Baja — no hay aviso; el formulario NV/OV muestra cuotas (del default) aparentemente válidas |
| **Bloquea entrega** | Sí |

---

## 5. Validación COT-P1-003: Crédito y cuotas en borradores de Cotización

### 5.1 Cadena completa del borrador

**¿Qué serializa el borrador?**

```typescript
// useDocumentoComercialDrafts.ts:53
convertirAStorage: (estado) => estado,   // función identidad
```

```typescript
// extraerEstado = obtenerDatosFormulario (FormularioDocumentoComercial.tsx:151-165):
const obtenerDatosFormulario = useCallback((): DatosFormularioDocumentoComercial => ({
  tipo: estado.tipoDocumento,
  ...
  creditTerms: isCreditMethod ? creditTerms : undefined,  // ← INCLUIDO ✅
  items: cartItems,
  ...
}), [estado, cartItems, isCreditMethod, creditTerms]);
```

**El borrador SÍ serializa `creditTerms` completo al localStorage.** El JSON guardado bajo la clave del borrador INCLUYE el campo `creditTerms` con las cuotas personalizadas.

**¿Qué restaura el callback `aplicarEstado`?**

```typescript
// FormularioDocumentoComercial.tsx:173-189
aplicarEstado: (datos) => {
  estado.aplicarValoresIniciales({
    tipoDocumento: datos.tipo,
    serieSeleccionada: datos.serie,
    fechaEmision: datos.fechaEmision,
    cliente: datos.cliente ?? null,
    moneda: datos.moneda,
    formaPago: datos.formaPago ?? 'contado',   // ← formaPago restaurado ✅
    camposOpcionales: datos.camposOpcionales ?? {},
    observaciones: datos.observaciones ?? '',
    notaInterna: datos.notaInterna ?? '',
    modoProductos: datos.modoItems,
    // creditTerms: NUNCA aplicado ❌
  });
  if (datos.items.length > 0) setCartItemsFromDraft(datos.items);
  // setTemplates(datos.creditTerms) NO existe aquí ❌
},
```

**`datos.creditTerms` existe en el borrador restaurado pero NUNCA se pasa a `useCreditTermsConfigurator`.**

### 5.2 Flujo de restauración paso a paso

| Paso | Acción | Estado creditTerms |
|---|---|---|
| 1 | COT nueva con 3 cuotas custom | `creditTerms = {schedule: [c1,c2,c3]}` en estado del hook |
| 2 | Auto-save del borrador (debounce 500ms) | JSON escrito en LS: `{ ..., creditTerms: {schedule:[c1,c2,c3]} }` |
| 3 | Usuario cierra o recarga la página | Estado React perdido |
| 4 | Usuario regresa, oferta de restaurar borrador | — |
| 5 | `restaurar()` → `aplicarDesdeStorage(borrador.datos)` | `datos.creditTerms = {schedule:[c1,c2,c3]}` disponible en `datos` |
| 6 | `aplicarEstado(datos)` ejecutado | `formaPago` = valor guardado → `paymentMethodId` derivado → `useCreditTermsConfigurator` inicializado con `defaultTemplates` |
| 7 | `creditTerms` del estado del hook | `{schedule: [d1,d2,d3,d4]}` (4 cuotas default del método) |
| 8 | El usuario ve el formulario | 4 cuotas default; las 3 custom han desaparecido |
| 9 | Si genera sin revisar | Cotización guardada con 4 cuotas default, NO con las 3 originales |

### 5.3 Diferencias entre guardar y restaurar

| Momento | creditTerms |
|---|---|
| Antes de guardar borrador | `{schedule:[c1,c2,c3]}` — personalizado |
| JSON en localStorage | `{schedule:[c1,c2,c3]}` — CORRECTO |
| Después de restaurar (estado del hook) | `{schedule:[d1,d2,d3,d4]}` — DEFAULT del método |
| Documento generado post-restaurar | `{schedule:[d1,d2,d3,d4]}` — DEFAULT, no personalizado |

**Pérdida silenciosa confirmada**: el dato está en el JSON, pero el proceso de restauración no lo aplica.

### 5.4 Clasificación final COT-P1-003

| | |
|---|---|
| **Resultado** | CONFIRMADO |
| **Severidad** | **P1** |
| **Condición de pérdida** | Solo cuando el usuario personalizó las cuotas (no usó el template default del método) |
| **Detectabilidad** | Muy baja — el formulario muestra cuotas de crédito (del default); no hay indicador de que se perdió la personalización |
| **Bloquea entrega** | Sí |

---

## 6. Validación de claves de persistencia (Punto 4)

### 6.1 Tabla de claves exactas por operación

| Operación | Archivo | Función | Clave leída / escrita |
|---|---|---|---|
| Carga inicial documentos | `documentoComercial.storage.ts` | `cargarDocumentosDesdeStorage` | `tryLsKey('documentos_comerciales_v1') ?? 'documentos_comerciales_v1'` |
| Guardar documentos | `documentoComercial.storage.ts` | `guardarDocumentosEnStorage` | `tryLsKey('documentos_comerciales_v1') ?? 'documentos_comerciales_v1'` |
| Crear/Editar COT | `DocumentosComercialesContext.tsx` | useEffect → `guardarDocumentosEnStorage` | Idéntica a arriba |
| Actualizar COT post-emisión comprobante | `postEmisionOrdenVenta.ts` | `actualizarCotizacionPostEmision` | `tryLsKey('documentos_comerciales_v1') ?? 'documentos_comerciales_v1'` |
| Restaurar COT post-anulación comprobante | `postEmisionOrdenVenta.ts` | `restaurarCotizacionPostAnulacion` | `tryLsKey('documentos_comerciales_v1') ?? 'documentos_comerciales_v1'` |
| Recarga del contexto | `DocumentosComercialesContext.tsx` | `recargarDesdeStorage` → `cargarDocumentosDesdeStorage` | `tryLsKey('documentos_comerciales_v1') ?? 'documentos_comerciales_v1'` |
| Columnas del listado (lectura) | `ListadoDocumentosComerciales.tsx` | `leerColumnasDeStorage` | `tryLsKey('documentos_comerciales_columnas_{tipo}') ?? 'documentos_comerciales_columnas_{tipo}'` |
| Columnas del listado (escritura) | `ListadoDocumentosComerciales.tsx` | `guardarColumnasEnStorage` | `tryLsKey('documentos_comerciales_columnas_{tipo}') ?? 'documentos_comerciales_columnas_{tipo}'` |
| Borrador en progreso | `useBorradorEnProgreso.ts` | `guardarBorradorEnProgreso` | Clave construida por `crearClaveBorradorEnProgreso` (incluye tenantId + establecimientoId) |

### 6.2 Resolución de `tryLsKey`

```typescript
// shared/tenant/index.ts:113-117
export function tryLsKey(base: string, empresaId?: string): string | null {
  const id = tryEnsureEmpresaId(empresaId);
  if (!id) return null;
  return `${id}:${base}`;
}
```

`tryEnsureEmpresaId` lee de `globalThis.__FF_ACTIVE_WORKSPACE_ID` (variable global seteada por TenantProvider) o de `localStorage['ff_active_workspace_id']`.

**Resultado final de clave de documentos:**
- Con tenant activo: `{empresaId}:documentos_comerciales_v1`
- Sin tenant activo: `documentos_comerciales_v1` (fallback)

**Ambas rutas (`documentoComercial.storage.ts` y `postEmisionOrdenVenta.ts`) usan EXACTAMENTE el mismo patrón con el MISMO valor base**:
- Constante en `documentoComercial.constants.ts`: `STORAGE_KEYS.DOCUMENTOS = 'documentos_comerciales_v1'`
- Constante local en `postEmisionOrdenVenta.ts`: `const STORAGE_KEY_DOCUMENTOS = 'documentos_comerciales_v1'`

**Las claves son funcionalmente idénticas en runtime.**

### 6.3 Escenarios de consistencia

| Escenario | Clave usada por contexto/storage | Clave usada por postEmision | ¿Coinciden? |
|---|---|---|---|
| Un tenant activo (uuid) | `uuid:documentos_comerciales_v1` | `uuid:documentos_comerciales_v1` | ✅ Sí |
| Sin tenant (app sin login) | `documentos_comerciales_v1` | `documentos_comerciales_v1` | ✅ Sí |
| Dos tenants (A y B) | `A:documentos_comerciales_v1` | `A:documentos_comerciales_v1` | ✅ Sí |
| Cambio de tenant (A→B) | `B:documentos_comerciales_v1` | `B:documentos_comerciales_v1` | ✅ Sí |
| Post-emisión desde comprobante | Lee la misma clave del tenant activo | Lee la misma clave del tenant activo | ✅ Sí |

### 6.4 Sobre el evento DOM

```typescript
// postEmisionOrdenVenta.ts:20
const EVENTO_RECARGA = 'documentos_comerciales_changed';

// DocumentosComercialesContext.tsx:69-71
window.addEventListener('documentos_comerciales_changed', handleExternal);
```

El nombre del evento es idéntico. El contexto escucha este evento y recarga desde storage.

**Limitación conocida**: `window.dispatchEvent` solo notifica a la MISMA pestaña del navegador. El evento `storage` nativo de JavaScript (que cruza pestañas) NO está siendo escuchado. Esto es una limitación arquitectural multi-tab ya documentada como COT-P2-003.

### 6.5 Nuevo hallazgo: NO aplica COT-P1-004

**La preocupación sobre diferencia de claves entre `postEmisionOrdenVenta.ts` y el contexto es DESCARTADA como P1 o P2.**

La diferencia existente es únicamente de **nombre de constante** (no de valor). Si en el futuro alguien cambia `STORAGE_KEYS.DOCUMENTOS` en el constants file sin actualizar la copia en `postEmisionOrdenVenta.ts`, podría desincronizarse. Esto es un riesgo de mantenibilidad.

**Clasificación**: P3 (duplicación de constante sin centralizar, riesgo de divergencia futura).

No se crea hallazgo COT-P1-004.

---

## 7. Validación por establecimiento (Punto 5)

### 7.1 Expresión exacta de filtrado en el listado

```typescript
// ListadoDocumentosComerciales.tsx:369-385
const documentosFiltrados = useMemo(() => {
  let lista = state.documentos.filter((d) => d.tipo === tipo);
  if (busqueda.trim()) {
    const q = busqueda.toLowerCase();
    lista = lista.filter((d) =>
      d.cliente?.nombre?.toLowerCase().includes(q) ||
      d.cliente?.numeroDocumento?.includes(q) ||
      d.numero?.toLowerCase().includes(q) ||
      d.serie?.toLowerCase().includes(q) ||
      d.vendedor?.toLowerCase().includes(q),
    );
  }
  if (estadosFiltro.length > 0) lista = lista.filter((d) => estadosFiltro.includes(d.estado));
  if (fechaDesde) lista = lista.filter((d) => d.fechaEmision >= fechaDesde);
  if (fechaHasta) lista = lista.filter((d) => d.fechaEmision <= fechaHasta);
  return lista.sort(...);
}, [state.documentos, tipo, busqueda, estadosFiltro, fechaDesde, fechaHasta]);
```

**No existe ningún filtro por `establecimientoId` ni `empresaId` en `documentosFiltrados`.**

### 7.2 Expresión de conteo en badge del tab

```typescript
// DocumentosComerciales.tsx:34
const contarPorTipo = (tipo: TipoDocumentoComercial): number =>
  ctxState.documentos.filter((d) => d.tipo === tipo).length;
```

**No existe ningún filtro por `establecimientoId` en el conteo del badge.**

### 7.3 Aislamiento por tenant vs. establecimiento

```typescript
// DocumentosComercialesContext.tsx — carga inicial
const documentos = cargarDocumentosDesdeStorage(); // lee clave con prefijo de tenant
```

El aislamiento ES por **tenant** (empresa). Dentro de un tenant, todos los documentos de todos los establecimientos se comparten en el mismo contexto.

```typescript
// generarDocumento / guardarComoBorrador — al crear documentos
establecimientoId: activeEstablecimientoId ?? undefined,
```

Cada documento guarda su `establecimientoId` pero **no se filtra por él al listar**.

### 7.4 Tabla de elementos y filtros

| Elemento | Filtra empresa | Filtra establecimiento | Evidencia |
|---|---|---|---|
| Listado documentos | Indirectamente (via clave LS tenant) | ❌ No | `documentosFiltrados` solo filtra por `tipo` |
| Badge del tab | Indirectamente (via clave LS tenant) | ❌ No | `contarPorTipo` solo filtra por `tipo` |
| Búsqueda | Indirectamente (via clave LS tenant) | ❌ No | Solo busca en nombre/número |
| Excel export | Indirectamente (via clave LS tenant) | ❌ No | Usa `documentosFiltrados` |
| Detalle (drawer) | Indirectamente (via clave LS tenant) | ❌ No | Busca por id en `state.documentos` |
| Conversión a NV/OV | Usa `activeEstablecimientoId` | ✅ Sí (stock) | `refrescarStockItem` y `navigate` |
| Borradores (clave) | ✅ Sí (tenantId) | ✅ Sí (establecimientoId en clave) | Clave incluye ambos |
| Series disponibles | ✅ Sí | ✅ Sí (via `useDocumentoComercialType`) | Filtradas por establecimiento |

### 7.5 Conclusión

**COT-P3-003 CONFIRMADO**: el listado y el badge NO filtran por `establecimientoId`. El `activeEstablecimientoId` se usa para stock (conversión) y borradores, pero no para visibilidad de documentos.

**Requiere decisión funcional**: ¿es correcto que un usuario del Establecimiento B vea cotizaciones del Establecimiento A del mismo tenant? Si la respuesta es NO, el filtro debe agregarse en `documentosFiltrados` y `contarPorTipo`.

**Clasificación**: P3 — no bloquea la entrega hasta que se defina la regla funcional. Si la multi-establecimiento es un requisito activo, la severidad puede subir a P2.

---

## 8. Validación de guards de negocio (Punto 6)

### 8.1 Matriz completa de guards por acción

| Acción | Guard UI | Guard handler | Guard capa de acción | Guard persistencia | Riesgo llamada directa |
|---|---|---|---|---|---|
| **Editar COT** | `puedeEditar` (lista estados editables) | — | `actualizarDocumento`: **NO** tiene guard de estado; re-evalúa pero no bloquea | — | Puede editar 'Convertida', 'Anulada', etc. |
| **Anular COT** | `puedeAnular` (terminales excluidos) | `handleConfirmarAccion`: requiere motivo | `anularDocumento`: verifica esBorrador + motivo no vacío; **NO** verifica estado terminal | — | Puede anular 'Anulada' (doble anulación) o 'Convertida' (rompe cascade) |
| **Aprobar COT** | `puedeAprobar` (solo Pendiente aprobación) | `handleConfirmarAccion` | `aprobarCotizacion`: verifica tipo='cotizacion' + estado='Pendiente aprobación' | — | ✅ Guard en acción |
| **No Aprobar COT** | `puedeNoAprobar` | `handleConfirmarAccion`: **NO** valida motivo | `rechazarCotizacion`: verifica tipo + estado='Pendiente aprobación' | — | ✅ Guard en acción; motivo opcionalidad es COT-P2-008 |
| **Marcar Aceptada** | `puedeMarcarAceptada` | directo | `marcarComoAceptada`: verifica tipo + `['Vigente','Aprobada']` | — | ✅ Guard en acción |
| **Cerrar Perdida** | `puedeCerrarPerdida` | requiere motivo | `cerrarCotizacionComoPerdida`: verifica tipo + `['Vigente','Aprobada','Aceptada']` + motivo | — | ✅ Guard en acción |
| **Convertir COT→NV/OV** | `puedeConvertirCotizacion` (solo Aceptada) | — | `vincularDocumentoConCotizacion`: verifica tipo='cotizacion' | — | ⚠️ No verifica estado='Aceptada' en acción |
| **Sincronizar COT** | — (automático en edit destino) | condicional en `handleGenerar` | `sincronizarCotizacionDesdeDocumento`: verifica `d.estado === 'Convertida'` | — | ✅ Guard en acción |
| **Anular cascade** | `cotizacionVinculadaAlAnular` | informativo | `anularDocumento` → busca COT vinculada → `actualizarEnContext` | — | ✅ Funciona correctamente |

### 8.2 Detalle de guards faltantes en capa de acción

**`actualizarDocumento`**: No tiene guard de estado. Puede actualizar cualquier documento sin restricción de estado. El único efecto automático es la re-evaluación del estado para cotizaciones editables.

```typescript
const actualizarDocumento = useCallback(
  (id: string, datos: Partial<DatosFormularioDocumentoComercial>): ResultadoAccionDocumento => {
    const documentoExistente = state.documentos.find((d) => d.id === id);
    if (!documentoExistente) return { exito: false, error: 'Documento no encontrado.' };
    // ← SIN verificación de estado permitido
    // ...aplica los datos directamente
  }
);
```

**`anularDocumento`**: No verifica estados terminales (podría anular una COT ya 'Anulada').

```typescript
const anularDocumento = useCallback(
  (id: string, motivo: string): ResultadoAccionDocumento => {
    const doc = state.documentos.find((d) => d.id === id);
    if (!doc) return { exito: false, error: '...' };
    if (doc.esBorrador) return { exito: false, error: '...' };
    if (!motivo || motivo.trim() === '') return { exito: false, error: '...' };
    // ← SIN verificación de estado terminal
  }
);
```

### 8.3 Riesgo real por contexto de uso

Dado que:
- El módulo es una SPA sin API REST expuesta
- No existe acceso programático externo a los hooks
- Los guards de UI son exhaustivos y correctos
- Una llamada directa requeriría acceso al código fuente de la aplicación

El riesgo práctico es bajo en el contexto actual. El riesgo crece si se agrega:
- Una API REST que llame a las acciones directamente
- Integración con otros módulos que llamen `actualizarDocumento` sin pasar por las guards de UI
- Tests de integración que prueben edge cases de estado

### 8.4 Reclasificación de COT-P3-001

**MANTENIDO EN P3**: El riesgo es real pero limitado al contexto actual. Las guards de UI son completas. Las acciones más críticas (`aprobar`, `rechazar`, `cerrar`, `marcar aceptada`, `sincronizar`) SÍ tienen guards en la capa de acción. Los faltantes (`actualizarDocumento`, `anularDocumento`) tienen consecuencias limitadas en la práctica:
- Doble-anulación: idempotente en estado
- Editar 'Convertida': posible pero requeriría acceso directo al hook

**No se eleva a P1 ni P2** porque no hay vectores de ataque realistas en la arquitectura actual.

---

## 9. Comandos ejecutados

| Comando | Resultado | Duración |
|---|---|---|
| `npm run build --workspace=apps/senciyo` | ✅ Pasa. Advertencia de chunk size (`xlsx-*.js` y `index-*.js` > 3000 kB). Sin errores. | 22.22 s |
| `npm run lint --workspace=apps/senciyo` | ✅ Pasa. 0 errores, 0 advertencias. | ~10 s |

---

## 10. Pruebas funcionales ejecutadas

**Ninguna.** La aplicación no fue iniciada en runtime. No se ejecutaron pruebas funcionales en ejecución.

Todo el análisis de flujos se realizó mediante trazabilidad estática completa de la cadena de llamadas.

---

## 11. Validaciones estáticas

| Validación | Método | Resultado |
|---|---|---|
| `sincronizarCotizacionDesdeDocumento` — campos modificados | Lectura `useDocumentoComercialActions.ts:912-943` | ✅ Verificado |
| `sincronizarCotizacionDesdeDocumento` — historial generado | Lectura `useDocumentoComercialActions.ts:932-940` | ✅ Verificado (historial SÍ existe; error de auditoría previa) |
| `useCreditTermsConfigurator` — inicialización de templates | Lectura `useCreditTermsConfigurator.ts:30-44` | ✅ Verificado |
| `aplicarEstado` en borrador — ausencia de creditTerms | Lectura `FormularioDocumentoComercial.tsx:173-189` | ✅ Verificado |
| `obtenerDatosFormulario` — serialización de creditTerms | Lectura `FormularioDocumentoComercial.tsx:151-165` | ✅ Verificado |
| Claves de localStorage — postEmision vs context | Lectura `postEmisionOrdenVenta.ts:19`, `constants.ts:81`, `tenant/index.ts:113-117` | ✅ Verificado (idénticas) |
| Filtrado por establecimiento — listado | Lectura `ListadoDocumentosComerciales.tsx:369-385` | ✅ Verificado (no filtra) |
| Filtrado por establecimiento — badge | Lectura `DocumentosComerciales.tsx:34` | ✅ Verificado (no filtra) |
| Guard `actualizarDocumento` | Lectura `useDocumentoComercialActions.ts:472-521` | ✅ Verificado (sin guard de estado) |
| Guard `anularDocumento` | Lectura `useDocumentoComercialActions.ts:523-...` | ✅ Verificado (sin check de terminal) |
| Guards en acciones específicas (cerrar, aceptar, rechazar, vincular) | Lectura de cada función | ✅ Verificado (guards presentes) |
| `vincularDocumentoConCotizacion` — campos sync con dadosComerciais | Lectura `useDocumentoComercialActions.ts:763-825` | ✅ Verificado |
| Modal de cambios en conversión inicial | Lectura `FormularioDocumentoComercial.tsx:534-604` | ✅ Verificado (existe) |
| Modal de cambios en edición de destino | Lectura completa del componente | ✅ Verificado (NO existe para edit) |

---

## 12. Casos no verificables

| ID | Comportamiento | Razón |
|---|---|---|
| NV-01 | `useCreditTermsConfigurator` — comportamiento real al recibir templates default | Requiere runtime con datos reales |
| NV-02 | Pérdida visible de cuotas en UI al convertir COT con cuotas custom | Requiere ejecución visual |
| NV-03 | Borrador: visualización post-restauración de cuotas | Requiere ejecución con localStorage real |
| NV-04 | `sincronizarCotizacionDesdeDocumento` — verificación de qué campos el usuario ve cambiar | Requiere runtime |
| NV-05 | Multi-tab — correlativos duplicados | Requiere dos pestañas simultáneas |
| NV-06 | Que `globalThis.__FF_ACTIVE_WORKSPACE_ID` esté correctamente seteado en el momento de `actualizarCotizacionPostEmision` | Requiere trazado en runtime |
| NV-07 | Cuota de localStorage al límite | Requiere dataset de prueba |
| NV-08 | Permisos de ruta / guards de router | No se encontró implementación |

---

## 13. Hallazgos confirmados

| ID | Descripción | Severidad |
|---|---|---|
| **COT-P1-002** | `creditTerms` (cuotas personalizadas) no transferidos en COT→NV ni COT→OV. Solo afecta templates personalizados; defaults se preservan. | **P1** |
| **COT-P1-003** | `creditTerms` no restaurados desde borrador. El JSON del borrador SÍ los contiene, pero `aplicarEstado` no los aplica al configurador. | **P1** |
| **COT-P2-001** (renombrado) | `sincronizarCotizacionDesdeDocumento` — intencional ("Regla 7"), con historial registrado, pero sin confirmación previa en path de edición del destino. Reclasificado desde P1. | **P2** |
| **COT-P2-008** | "No Aprobar" no valida motivo en `handleConfirmarAccion`, a diferencia de "Anular" y "Cerrar Perdida". | **P2** |
| **COT-P2-009** | `Vencida` no puede cerrarse como "Perdida". | **P2** |
| **COT-P3-003** | Listado y badge del tab no filtran por `establecimientoId`. Requiere decisión funcional. | **P3** |
| **COT-P3-001** | `actualizarDocumento` y `anularDocumento` sin guard de estado en la capa de acción. | **P3** |

---

## 14. Hallazgos descartados

| ID | Descripción | Razón |
|---|---|---|
| **COT-P1-004** (hipotético) | Inconsistencia de claves de localStorage entre `postEmisionOrdenVenta.ts` y el contexto | Ambos usan `tryLsKey('documentos_comerciales_v1') ?? 'documentos_comerciales_v1'`. Claves idénticas en runtime. |
| **P2 sobre diferencia de claves** | `postEmisionOrdenVenta.ts` podría escribir en clave equivocada | Descartado: el fallback pattern es idéntico en ambos archivos |

---

## 15. Hallazgos reclasificados

| ID | Descripción | Severidad original | Severidad nueva | Justificación |
|---|---|---|---|---|
| **COT-P1-001** → **COT-P2-001** | `sincronizarCotizacionDesdeDocumento` — sobreescritura de datos históricos de la COT Convertida al editar destino | P1 | **P2** | La sincronización es intencional ("Regla 7"), documentada en JSDoc y comentarios. SÍ genera evento en historial ("Datos comerciales sincronizados desde documento relacionado"). El error en el informe previo: se afirmó que no se creaba historial, lo cual es incorrecto. El riesgo sigue siendo real (sin confirmación del usuario en path de edición), pero es una decisión funcional, no un bug. |

---

## 16. Archivos que requerirán modificación

**NO se modifica código en esta validación.**

| Hallazgo | Archivo | Función/Sección | Cambio conceptual requerido |
|---|---|---|---|
| COT-P1-002 | `FormularioDocumentoComercial.tsx` | Efecto de inicialización (líneas 117-149) + `useDocumentoComercialDrafts` config | Tras aplicar `formaPago`, llamar `setTemplates` con `prefillFrom.creditTerms`-derived templates si existen |
| COT-P1-002 | `useCreditTermsConfigurator.ts` | Parámetros del hook | Agregar parámetro opcional `initialTemplates?: CreditInstallmentDefinition[]` para sobreescribir `defaultTemplates` en inicialización |
| COT-P1-003 | `FormularioDocumentoComercial.tsx` | `aplicarEstado` callback (línea 173-189) | Tras restaurar `formaPago`, extraer templates desde `datos.creditTerms` y llamar `setTemplates` |
| COT-P1-003 | `useCreditTermsConfigurator.ts` | Igual que P1-002 | Mismo parámetro `initialTemplates` |
| COT-P2-001 (ex P1-001) | `FormularioDocumentoComercial.tsx` | Bloque "Regla 7" (línea 266-274) | Según decisión funcional: (a) eliminar la sincronización, o (b) agregar modal de confirmación previo en path de edición, o (c) dejar como está |

---

## 17. Orden recomendado de corrección

1. **COT-P1-002 + COT-P1-003** (mismo root cause, corregir juntos): Agregar `initialTemplates` a `useCreditTermsConfigurator` y aplicarlo desde `prefillFrom.creditTerms` y desde `datos.creditTerms` en el borrador. Estos dos hallazgos comparten la misma causa raíz y se resuelven con el mismo cambio.

2. **COT-P2-001**: Esperar decisión funcional sobre "Regla 7". Si se decide mantener la sincronización en edición, agregar modal de confirmación previo (consistente con el modal de conversión inicial). Si se decide eliminar, remover el bloque de la línea 266.

3. **COT-P2-008**: Agregar validación de motivo en `handleConfirmarAccion` para `tipo === 'no_aprobar'`.

4. **COT-P2-009**: Agregar `'Vencida'` a `estadosCierrePerdida` en `cerrarCotizacionComoPerdida`.

5. **COT-P3-003**: Esperar decisión funcional sobre visibilidad multi-establecimiento.

---

## 18. Pruebas obligatorias posteriores a la corrección

| ID | Prueba | Tipo | Descripción |
|---|---|---|---|
| PT-01 | COT crédito con cuotas custom → NV | Funcional | Crear COT con 3 cuotas personalizadas. Convertir a NV. Verificar que las 3 cuotas aparecen en el formulario NV. Generar NV. Verificar que el documento guardado tiene las 3 cuotas. |
| PT-02 | COT crédito con cuotas default → NV | Funcional | Mismo flujo con template sin personalizar. Verificar que no hay regresión. |
| PT-03 | COT crédito con cuotas custom → OV | Funcional | Idéntico a PT-01 con OV. |
| PT-04 | COT crédito con cuotas custom → Comprobante | Funcional | Verificar que el comprobante sigue recibiendo correctamente `terminosCredito`. No debe romperse. |
| PT-05 | Borrador COT con cuotas custom | Funcional | Configurar 3 cuotas. Esperar auto-save. Recargar. Restaurar borrador. Verificar 3 cuotas en UI. Generar. Verificar documento guardado. |
| PT-06 | Edición NV generada desde COT | Funcional | Verificar que el historial de la COT registra la sincronización al editar la NV. Verificar modal de "Regla 7" si se agrega. |
| PT-07 | Anulación NV → cascade COT | Funcional | Verificar que la COT vuelve a 'Aceptada' tras anulación de NV. No debe afectarse por cambios de P1-002/P1-003. |
| PT-08 | COT contado → NV | Funcional | Verificar que la ausencia de `creditTerms` no genera errores. |
| PT-09 | localStorage en localStorage completo | Funcional | Verificar que el error de cuota sigue siendo silencioso (no rompe el flujo). |
| PT-10 | Build y lint tras cambios | Automático | Debe pasar sin errores. |

---

## 19. Veredicto actualizado de Cotizaciones

### Hallazgos por severidad tras validación

| Severidad | Cantidad original | Cambios | Cantidad final |
|---|---|---|---|
| P0 | 0 | — | 0 |
| P1 | 3 | COT-P1-001 reclasificado a P2 | **2** |
| P2 | 12 | +1 por reclasificación | **13** |
| P3 | 6 | — | 6 |

### Hallazgos P1 que permanecen

| ID | Descripción |
|---|---|
| **COT-P1-002** | Términos de crédito (cuotas personalizadas) no transferidos en COT→NV y COT→OV. Pérdida silenciosa confirmada por trazabilidad estática completa. |
| **COT-P1-003** | Términos de crédito (cuotas personalizadas) no restaurados desde borrador. El dato está en el JSON del borrador pero no se aplica al configurador. |

### Justificación del veredicto

- COT-P1-002 y COT-P1-003 comparten la misma causa raíz: `useCreditTermsConfigurator` no acepta un parámetro de templates iniciales externos.
- Ambos pueden manifestarse en operación normal para cualquier usuario que configure cuotas personalizadas.
- La pérdida es silenciosa en ambos casos: el formulario muestra cuotas (del default), no indica que se perdieron las personalizadas.
- COT-P1-001 fue reclasificado a P2 tras confirmar que (1) la sincronización es intencional, (2) sí genera evento en historial, (3) el riesgo requiere decisión funcional, no corrección de bug.

---

# 🔴 COTIZACIONES NO LISTO PARA ENTREGA

**Motivo**: 2 hallazgos P1 confirmados (COT-P1-002, COT-P1-003) con pérdida silenciosa de términos de crédito personalizados en conversión y restauración de borrador.

**Condición de aprobación**: Corrección de COT-P1-002 y COT-P1-003 (ambos con el mismo mecanismo de fix) y re-verificación funcional mediante PT-01 a PT-05.

**Cambio respecto a auditoría previa**: COT-P1-001 reclasificado de P1 a P2. La auditoría previa tenía un error: `sincronizarCotizacionDesdeDocumento` SÍ genera evento en historial. El flujo es intencional ("Regla 7") pero requiere decisión funcional sobre el modal de confirmación en edición de destino.
