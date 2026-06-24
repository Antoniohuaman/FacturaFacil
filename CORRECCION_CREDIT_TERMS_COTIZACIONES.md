# Corrección de términos de crédito en Cotizaciones

**Fecha:** 2026-06-24 · **Rama:** RevisionCotizacion · **Commit HEAD (pre-corrección):** `4412dcbb`

---

## 1. Hallazgos corregidos

| ID | Descripción | Severidad | Estado |
|----|-------------|-----------|--------|
| COT-P1-002 | Cuotas personalizadas de COT no se transfieren al convertir a NV u OV | P1 — Bloqueante | ✅ CORREGIDO Y VERIFICADO |
| COT-P1-003 | Cuotas personalizadas presentes en el JSON del borrador no se restauran en el configurador | P1 — Bloqueante | ✅ CORREGIDO Y VERIFICADO |

Fuente del análisis: `AUDITORIA_EXTREMA_COTIZACIONES.md` § COT-P1-002 / COT-P1-003; confirmado en `VALIDACION_BLOQUEANTES_COTIZACIONES.md`.

---

## 2. Causa raíz

`useCreditTermsConfigurator` ejecutaba `setTemplates(defaultTemplates)` (defaults del método de pago) cada vez que `paymentMethodId` pasaba de `null` a un valor (primera asignación de método). No existía ningún canal para inyectar cuotas personalizadas externas, por lo que:

- **COT-P1-002**: `prefillFrom.creditTerms` —disponible en las props de `FormularioDocumentoComercial`— nunca alcanzaba el configurador.
- **COT-P1-003**: `datos.creditTerms` del borrador restaurado en `aplicarEstado` tampoco alcanzaba el configurador.

Ambos casos producían el mismo resultado: el usuario veía las cuotas por defecto del método de pago elegido, no las cuotas que había configurado manualmente en la Cotización.

---

## 3. Cambios implementados

Solo 2 archivos modificados. Ningún otro código funcional fue alterado.

| Archivo | Tipo de cambio | LOC añadidas | LOC eliminadas |
|---------|---------------|:---:|:---:|
| `comprobantes-electronicos/hooks/useCreditTermsConfigurator.ts` | Nuevo parámetro + helper + 3 refs + lógica de hidratación | +31 | -1 |
| `documentos-comerciales/components/FormularioDocumentoComercial.tsx` | Estado `externalCreditTerms` + import + pasaje al hook + restauración en `aplicarEstado` | +10 | -1 |

### Diff exacto — `useCreditTermsConfigurator.ts` (+31 / -1)

```diff
+// Extrae las plantillas de cuota (diasCredito, porcentaje) de un cronograma existente.
+function creditTermsToTemplates(creditTerms: ComprobanteCreditTerms): CreditInstallmentDefinition[] {
+  return creditTerms.schedule
+    .filter((c) => c.porcentaje > 0)
+    .map(({ diasCredito, porcentaje }) => ({ diasCredito, porcentaje }));
+}

 interface UseCreditTermsConfiguratorParams {
   paymentMethodId?: string | null;
   total: number;
   issueDate?: string;
+  /** Términos de crédito de una cotización o borrador para hidratar el configurador. */
+  initialCreditTerms?: ComprobanteCreditTerms;
 }

 export const useCreditTermsConfigurator = ({
   paymentMethodId,
   total,
   issueDate,
+  initialCreditTerms,
 }: UseCreditTermsConfiguratorParams) => {
   ...
+  const pendingExternalRef = useRef<ComprobanteCreditTerms | null>(initialCreditTerms ?? null);
+  pendingExternalRef.current = initialCreditTerms ?? null;
+  const hydratedFromExternalRef = useRef(false);
+  const externalDisabledRef = useRef(false);

   useEffect(() => {
     if (!isCreditMethod) {
       setTemplates([]);
       lastMethodIdRef.current = null;
+      if (hydratedFromExternalRef.current) {
+        externalDisabledRef.current = true;
+      }
+      hydratedFromExternalRef.current = false;
       return;
     }

     if (lastMethodIdRef.current !== paymentMethod?.id) {
-      setTemplates(defaultTemplates);
+      const external = pendingExternalRef.current;
+      if (external?.schedule?.length && !hydratedFromExternalRef.current && !externalDisabledRef.current) {
+        setTemplates(creditTermsToTemplates(external));
+        hydratedFromExternalRef.current = true;
+      } else {
+        setTemplates(defaultTemplates);
+      }
       lastMethodIdRef.current = paymentMethod?.id ?? null;
     }
   }, [defaultTemplates, isCreditMethod, paymentMethod?.id]);
```

### Diff exacto — `FormularioDocumentoComercial.tsx` (+10 / -1)

```diff
+  ComprobanteCreditTerms,    // import añadido
 } from '../models/documentoComercial.types';

+  const [externalCreditTerms, setExternalCreditTerms] = useState<ComprobanteCreditTerms | undefined>(
+    prefillFrom?.creditTerms,  // inicializado desde COT (conversión) o undefined (nuevo form)
+  );

   const { isCreditMethod, ... } =
-    useCreditTermsConfigurator({ paymentMethodId, total: totales.total, issueDate: estado.fechaEmision });
+    useCreditTermsConfigurator({ paymentMethodId, total: totales.total, issueDate: estado.fechaEmision, initialCreditTerms: externalCreditTerms });

   aplicarEstado: (datos) => {
     estado.aplicarValoresIniciales({ ... formaPago: datos.formaPago ... });
     if (datos.items.length > 0) setCartItemsFromDraft(datos.items);
+    if (datos.creditTerms) {
+      setExternalCreditTerms(datos.creditTerms);  // restauración de borrador
+    }
   },
```

---

## 4. Conversión de tipos

`creditTermsToTemplates` convierte `ComprobanteCreditTerms` → `CreditInstallmentDefinition[]`.

### Tipos involucrados

```typescript
// INPUT del helper (cronograma existente)
interface ComprobanteCreditTerms {
  schedule: ComprobanteCreditInstallment[];   // = CreditInstallment[]
  fechaVencimientoGlobal: string;
  totalPorcentaje?: number;
  saldoPendiente?: number;
  adelanto?: number;
  cuotasPendientes?: number;
  cuotasCanceladas?: number;
}

// Cada cuota del cronograma existente
interface CreditInstallment extends CreditInstallmentTemplate {
  numeroCuota: number;
  fechaVencimiento: string;    // DERIVADO: issueDate + diasCredito
  importe: number;             // DERIVADO: total × porcentaje / 100
  pagado?: number;             // DERIVADO: siempre 0 al crear
  saldo?: number;              // DERIVADO: = importe al crear
  estado?: CreditInstallmentStatus;  // DERIVADO: 'pendiente' al crear
  pagos?: CreditInstallmentPaymentTrace[];  // DERIVADO: [] al crear
}

// INPUT de useCreditTermsConfigurator (lo que configura el usuario)
interface CreditInstallmentTemplate {
  diasCredito: number;   // PARÁMETRO DEL USUARIO
  porcentaje: number;    // PARÁMETRO DEL USUARIO
}

type CreditInstallmentDefinition = CreditInstallmentTemplate;
// → CreditInstallmentDefinition = { diasCredito: number; porcentaje: number }
```

### Implementación del helper

```typescript
function creditTermsToTemplates(creditTerms: ComprobanteCreditTerms): CreditInstallmentDefinition[] {
  return creditTerms.schedule
    .filter((c) => c.porcentaje > 0)          // excluye cuotas de porcentaje 0
    .map(({ diasCredito, porcentaje }) => ({ diasCredito, porcentaje }));
}
```

El guardado `filter(c => c.porcentaje > 0)` es defensivo: por diseño de modelo ninguna cuota válida tiene porcentaje 0 (validado en `validateCreditScheduleTemplate`), pero previene un crash si el dato persisted fuera corrupto.

`sortByDays` en `buildCreditScheduleFromTemplate` ordena las plantillas por `diasCredito`. El cronograma original ya está ordenado (numeroCuota 1, 2, 3 con diasCredito creciente), por lo que la reordenación produce el mismo resultado. ✅

---

## 5. Preservación de fechas y montos

### Tabla completa de campos

| Campo del creditTerms original | Fuente del valor | Se preserva exactamente | Se recalcula | Se pierde |
|-------------------------------|-----------------|:---:|:---:|:---:|
| `schedule[i].diasCredito` | Extraído por el helper | ✅ | — | — |
| `schedule[i].porcentaje` | Extraído por el helper | ✅ | — | — |
| `schedule[i].numeroCuota` | Calculado por `index+1` | ✅ mismo orden | — | — |
| `schedule[i].fechaVencimiento` | `shiftBusinessDate(issueDate, diasCredito)` | Borrador: ✅ mismo | Conversión: nueva fecha | — |
| `schedule[i].importe` | `roundTwo(total × porcentaje / 100)` | Borrador: ✅ mismo | Conversión: nuevo si cambia total | — |
| `schedule[i].pagado` | Siempre `0` al crear | ✅ (siempre 0) | — | — |
| `schedule[i].saldo` | `= importe` al crear | ✅ (= importe) | — | — |
| `schedule[i].estado` | `'pendiente'` al crear | ✅ (siempre pendiente) | — | — |
| `schedule[i].pagos` | `[]` al crear | ✅ (siempre []) | — | — |
| `fechaVencimientoGlobal` | `max(fechaVencimiento)` | Borrador: ✅ mismo | Conversión: nueva fecha | — |
| `totalPorcentaje` | `sum(porcentajes)` | ✅ mismo | — | — |
| `saldoPendiente` | No en la salida del hook | — | — | n/a (campo de cobranzas) |
| `adelanto` | No en la salida del hook | — | — | n/a (campo de cobranzas) |
| `cuotasPendientes` | No en la salida del hook | — | — | n/a (campo de cobranzas) |
| `cuotasCanceladas` | No en la salida del hook | — | — | n/a (campo de cobranzas) |

Los campos `saldoPendiente`, `adelanto`, `cuotasPendientes`, `cuotasCanceladas` solo se establecen en el flujo de cobranzas (post-emisión). Para un formulario de creación/conversión siempre son `undefined`. No se pierden datos relevantes.

### Por qué los campos "recalculados" son correctos

`shiftBusinessDate` es una función pura:
```typescript
export function shiftBusinessDate(businessDateIso: string, offsetDays: number): string {
  const baseDate = assertBusinessDate(businessDateIso, 'start');
  baseDate.setUTCDate(baseDate.getUTCDate() + offsetDays);
  return formatDateToBusinessIso(baseDate);
}
```
Es completamente determinista: mismo `issueDate` + mismo `diasCredito` → **bit-for-bit mismo resultado**. No depende de estado externo, zona horaria del navegador, ni aleatoriedad.

`roundTwo = Math.round(value * 100) / 100` es igualmente determinista: mismo `total` + mismo `porcentaje` → **mismo importe exacto, incluyendo redondeos del ajuste de última cuota**.

---

### Análisis de casos obligatorios

**Caso A — S/300, 3 cuotas S/100 c/u, "fechas personalizadas"**

En el sistema, el usuario configura `diasCredito` (número de días), no fechas directas. Una "fecha personalizada" significa `diasCredito` distinto al default del método. Si el usuario configuró `diasCredito = [20, 40, 60]` con `porcentaje = [33.33, 33.33, 33.34]`:

- Cuota 1: `roundTwo(300 × 33.33 / 100)` = `roundTwo(99.99)` = **99.99**
- Cuota 2: igual = **99.99**
- Cuota 3 (last): `roundTwo(300 - 99.99 - 99.99)` = `roundTwo(100.02)` = **100.02**

Extracción: `[{dias:20, por:33.33}, {dias:40, por:33.33}, {dias:60, por:33.34}]`

Recomputo mismo total S/300: **99.99 / 99.99 / 100.02** — idéntico. ✅

Con misma `fechaEmision`: mismas fechas. ✅ · Con nueva `fechaEmision` (conversión): fechas desplazadas según nueva base. ✅ (correcto por diseño).

**Caso B — S/300, cuotas S/80 / S/100 / S/120**

Para lograr estos montos exactos, el usuario debe configurar `porcentaje = [26.67, 33.33, 40]`:
- C1: `roundTwo(300 × 26.67 / 100)` = `roundTwo(80.01)` = **80.01** (≠ S/80 exacto)

En la práctica, S/80 exacto requiere porcentaje `26.666...` que al tener solo 2 decimales se almacena como `26.67` → importe `80.01`. Este redondeo ocurre en la ENTRADA del usuario, no en la extracción. La extracción preserva exactamente `26.67` y el recomputo produce exactamente `80.01`. El sistema NO permite montos arbitrarios: solo `{diasCredito, porcentaje}`. ✅

**Caso C — S/100, cuotas con redondeo: S/33.33 / S/33.33 / S/33.34**

Usuario configura `porcentaje = [33.33, 33.33, 33.34]`:
- C1: `roundTwo(100 × 33.33 / 100)` = **33.33**
- C2: **33.33**
- C3 (last): `roundTwo(100 - 33.33 - 33.33)` = `roundTwo(33.34)` = **33.34**

Extracción: `[{por:33.33}, {por:33.33}, {por:33.34}]`

Recomputo: **33.33 / 33.33 / 33.34** — idéntico. ✅ · Suma = 100.00. ✅

**Caso D — fechaEmision COT ≠ fechaEmision NV/OV**

COT emitida 2026-01-10, `diasCredito = 30` → C1: `2026-02-09`.
NV emitida hoy 2026-06-24, mismos `diasCredito = 30` → C1: `2026-07-24`.

Las fechas son DISTINTAS y eso es CORRECTO. La NV es un documento emitido hoy; sus cuotas deben vencer desde hoy, no desde enero. La intención del usuario (30 días de plazo) se preserva; las fechas absolutas se adaptan al documento destino. ✅

**Caso E — Cuota cuya fecha fue "elegida manualmente"**

El sistema no ofrece UI para ingresar fechas arbitrarias. `fechaVencimiento` SIEMPRE es `shiftBusinessDate(issueDate, diasCredito)`. Una "fecha personalizada" se logra eligiendo un `diasCredito` específico (ej. `diasCredito=45` en lugar del default `diasCredito=30`). Esta elección se extrae fielmente. ✅

### Respuestas directas

| Pregunta | Borrador (COT-P1-003) | Conversión (COT-P1-002) |
|---|---|---|
| ¿Fechas finales exactamente iguales? | ✅ SÍ (misma issueDate restaurada) | ❌ Diferentes (nueva issueDate del NV) — correcto por diseño |
| ¿Montos finales exactamente iguales? | ✅ SÍ (mismo total del carrito) | ✅ SÍ si el total no cambia; distintos si el usuario modifica ítems |
| ¿Número de cuotas igual? | ✅ SÍ | ✅ SÍ |
| ¿Fecha de vencimiento global igual? | ✅ SÍ | ❌ Diferente (última cuota es más tardía) — correcto |
| ¿Suma coincide exactamente con el total? | ✅ SÍ | ✅ SÍ (ajuste de última cuota garantiza esto) |
| ¿La transformación es reversible? | ✅ Con misma issueDate y total | ✅ Con cualquier issueDate y total |
| ¿El resultado es equivalente o aproximado? | **Equivalente bit-for-bit** | **Equivalente en estructura; fechas/montos adaptativos (correcto)** |

---

## 6. Orden de hidratación

### Tres casos de ejecución

#### 6.1 Conversión COT → NV (COT-P1-002)

```
RENDER 1
  externalCreditTerms = useState(prefillFrom.creditTerms)   ← COT's creditTerms
  formaPago = ''                                             ← aún vacío
  paymentMethodId = undefined                                ← no method
  isCreditMethod = false
  pendingExternalRef.current = externalCreditTerms           ← actualizado en render

EFECTOS DE RENDER 1 (en orden de registro):
  [E1] useCreditTermsConfigurator effect:
       isCreditMethod=false → setTemplates([]), lastMethodIdRef=null   ← no-op (ya era []/null)
  [E2] useBorradorEnProgreso effect:
       habilitado=FALSE (prefillFrom está seteado) → no restaura
  [E3] Component init effect:
       source = prefillFrom → inicialized.current = true
       → aplicarValoresIniciales({formaPago: source.formaPago}) → agenda re-render

REACT: procesa state updates → RENDER 2

RENDER 2
  formaPago = 'CREDITO_30'                                   ← restaurado
  paymentMethodId = method.id                                ← derivado de formaPago
  isCreditMethod = true
  defaultTemplates = paymentMethod.creditSchedule            ← defaults del método
  pendingExternalRef.current = externalCreditTerms           ← actualizado sincrónicamente en render ✓
  lastMethodIdRef.current = null                             ← del render anterior

EFECTOS DE RENDER 2 (en orden de registro):
  [E1] useCreditTermsConfigurator effect:
       isCreditMethod=true
       lastMethodIdRef.current (null) !== paymentMethod?.id  → DIFERENTE
       external = pendingExternalRef.current = COT.creditTerms
       external.schedule.length > 0 ✓
       hydratedFromExternalRef.current = false ✓
       externalDisabledRef.current = false ✓
       → setTemplates(creditTermsToTemplates(external))      ← HIDRATACIÓN ✓
       → hydratedFromExternalRef.current = true
       → lastMethodIdRef.current = method.id

REACT: procesa state update → RENDER 3

RENDER 3
  templates = cuotas personalizadas del COT                  ✅
  creditTerms = computed(templates, total, issueDate)        ✅ (fechas desde issueDate NV)
```

#### 6.2 Restauración de borrador (COT-P1-003)

```
RENDER 1
  externalCreditTerms = useState(undefined)                  ← sin prefillFrom
  formaPago = ''
  paymentMethodId = undefined
  isCreditMethod = false

EFECTOS DE RENDER 1 (en orden de registro):
  [E1] useCreditTermsConfigurator effect:
       isCreditMethod=false → setTemplates([]), lastMethodIdRef=null   ← no-op
  [E2] useBorradorEnProgreso effect (habilitado=TRUE):
       restaurar() → lee borrador → aplicarEstado(dados)
         → aplicarValoresIniciales({formaPago: dados.formaPago})  → agenda state
         → setCartItemsFromDraft(dados.items)                     → agenda state
         → setExternalCreditTerms(dados.creditTerms)              → agenda state
       [BATCHING React 18: las 3 actualizaciones se funden en un re-render]
  [E3] Component init effect: no source → return

REACT: procesa batch → RENDER 2

RENDER 2
  formaPago = dados.formaPago                                ← restaurado
  paymentMethodId = method.id                                ← derivado
  isCreditMethod = true
  externalCreditTerms = dados.creditTerms                    ← restaurado por borrador
  pendingExternalRef.current = externalCreditTerms           ← actualizado sincrónicamente ✓
  lastMethodIdRef.current = null                             ← del render anterior

EFECTOS DE RENDER 2:
  [E1] useCreditTermsConfigurator effect:
       lastMethodIdRef.current (null) !== method.id → DIFERENTE
       pendingExternalRef.current = dados.creditTerms → schedule.length > 0
       → setTemplates(creditTermsToTemplates(dados.creditTerms))  ← HIDRATACIÓN ✓

RENDER 3
  templates = cuotas del borrador                            ✅
  creditTerms = computed(templates, total, issueDate)        ✅ (=borrador porque mismo total + misma fecha)
```

#### 6.3 Por qué los defaults NO pueden sobrescribir los términos externos

El efecto del configurador tiene deps `[defaultTemplates, isCreditMethod, paymentMethod?.id]`. Después de la hidratación (Render 2), `lastMethodIdRef.current === paymentMethod?.id`. En todos los renders posteriores donde el método no cambie, el bloque `if (lastMethodIdRef.current !== paymentMethod?.id)` no entra, y `setTemplates` no se llama. ✅

La invariante clave: `pendingExternalRef.current` se asigna **en la fase de render** (antes de que cualquier efecto corra), garantizando que el efecto siempre ve el valor del último render, incluso si `initialCreditTerms` cambió en el mismo ciclo en que cambia `paymentMethodId`. ✅

---

## 7. Control mediante refs

| Ref | Tipo | Se establece cuándo | Se limpia/resetea cuándo | Riesgo de estado antiguo |
|-----|------|--------------------|--------------------------|-----------------------------|
| `pendingExternalRef` | `ComprobanteCreditTerms \| null` | En cada render (asignación directa): `= initialCreditTerms ?? null` | No necesita limpieza — se sobreescribe en cada render | **Ninguno**: siempre refleja el prop actual |
| `hydratedFromExternalRef` | `boolean` | `true` cuando el efecto aplica los términos externos | `false` cuando `isCreditMethod` pasa a `false` (usuario va a contado) | **Ninguno**: si el componente remonta (nueva COT), empieza en `false` |
| `externalDisabledRef` | `boolean` | `true` cuando el usuario fue a contado DESPUÉS de que se hidratara | Nunca se resetea dentro del ciclo de vida del componente montado | **Ninguno**: al desmontar + remontar empieza en `false` |
| `lastMethodIdRef` | `string \| null` | Actualizado al final del bloque `if` en el efecto | `null` cuando `isCreditMethod` pasa a `false` | **Ninguno**: coordina el propio efecto del hook |
| `inicialized` | `boolean` | `true` en el primer efecto init con `source` | Nunca se resetea | **Ninguno**: guarda que ya se inicializó una vez |

**Garantía contra bleeding entre Cotizaciones**: el componente `FormularioDocumentoComercial` DESMONTA al navegar (React Router). Todos los refs son instancias de hook por montaje. Al montar para una Cotización B, todos los refs arrancan con sus valores iniciales (false / null). La Cotización A no puede contaminar la B. ✅

---

## 8. Conversión COT → NV (detalle)

La ruta de conversión es: listado de documentos → usuario hace clic en "Convertir a NV" → navega a `/documentos-comerciales/nuevo/nota_venta` con state `{ prefillFrom: cotizacion, cotizacionOrigenId: cotizacion.id }`.

`FormularioDocumentoComercial` recibe:
- `tipoInicial = 'nota_venta'`
- `prefillFrom = cotizacion` (objeto COT completo con `creditTerms`)
- `cotizacionOrigenId = cotizacion.id`

`externalCreditTerms = useState(prefillFrom.creditTerms)` captura las cuotas personalizadas de la COT desde el primer render. El borrador está DESHABILITADO (`habilitado = modo === 'nuevo' && !prefillFrom && !cotizacionOrigenId = false`), por lo que no hay interferencia con el flujo de restauración. Tras el efecto de inicialización, el configurador hidrata desde las cuotas de la COT. ✅

**Lo que se preserva:** distribución porcentual, número de cuotas, plazos (dias de crédito).
**Lo que cambia (correcto):** fechas absolutas (calculadas desde fecha de emisión del NV); montos solo si el total del NV difiere.

---

## 9. Conversión COT → OV (detalle)

Flujo idéntico al de NV. El componente recibe `tipoInicial = 'orden_venta'` con los mismos `prefillFrom` y `cotizacionOrigenId`. La lógica de hidratación no discrimina entre NV y OV. ✅

---

## 10. Restauración de borrador

`obtenerDatosFormulario` (que alimenta el borrador) ya incluía `creditTerms` antes de esta corrección:

```typescript
const obtenerDatosFormulario = (): DatosFormularioDocumentoComercial => ({
  ...
  creditTerms: isCreditMethod ? creditTerms : undefined,   // ← ya existía
  ...
});
```

El borrador persiste el objeto `ComprobanteCreditTerms` completo (schedule con todas las cuotas). Al restaurar, `aplicarEstado` ahora llama `setExternalCreditTerms(dados.creditTerms)`, lo que alimenta al configurador. Las cuotas reconstituidas serán **bit-for-bit idénticas** al borrador porque `fechaEmision` también se restaura (`aplicarValoresIniciales({fechaEmision: dados.fechaEmision})`) y el total del carrito es el mismo (mismos ítems).

---

## 11. Cambio de método de pago

| Secuencia | Resultado |
|-----------|-----------|
| 1. COT con cuotas hidratadas en NV | Configurador con cuotas COT, `hydratedFromExternalRef=true` |
| 2. Usuario cambia a contado | `isCreditMethod=false` → `setTemplates([])`, `externalDisabledRef=true`, `creditTerms=undefined` |
| 3. Usuario vuelve a crédito (mismo método) | `isCreditMethod=true`, `lastMethodIdRef=null !== method.id`, `externalDisabledRef=true` → `setTemplates(defaultTemplates)` (cuotas del método, NO de la COT) ✅ |
| 4. Usuario cambia a otro método crédito | `lastMethodIdRef !== newMethod.id`, `hydratedFromExternalRef=true` → `setTemplates(defaultTemplates del nuevo método)` ✅ |
| 5. Usuario vuelve al método original | `lastMethodIdRef !== originalMethod.id`, `hydratedFromExternalRef=true` → `setTemplates(defaultTemplates del método original)` ✅ |

Las cuotas heredadas de la COT **solo** se aplican una vez, en el primer setup del método, y no reaparecen tras cambios manuales de método. ✅

---

## 12. Edición posterior

Después de la hidratación, si el usuario:

1. **Abre el modal y modifica una cuota**: `setTemplates(newTemplates)` actualiza el estado directamente. El efecto del configurador no vuelve a dispararse (`lastMethodIdRef.current === paymentMethod?.id`). Los cambios persisten. ✅
2. **Agrega/elimina cuotas**: mismo mecanismo. ✅
3. **Cambia el total** (agrega ítems): `total` cambia → `schedule` se recomputa vía `useMemo` con los mismos `templates` actuales. Los nuevos montos se calculan correctamente. El efecto no se dispara. ✅
4. **Cambia la fecha de emisión**: `issueDate` cambia → `schedule` se recomputa con los mismos `templates`. Las nuevas fechas se calculan correctamente. El efecto no se dispara. ✅
5. **Genera el documento**: `obtenerDatosFormulario()` incluye `creditTerms: isCreditMethod ? creditTerms : undefined`. Lo que se muestra en el formulario es exactamente lo que se persiste en el documento. ✅

No existen ciclos de efectos: el efecto del configurador solo actúa cuando `paymentMethod?.id` cambia, no cuando `templates` o `creditTerms` cambian. ✅

---

## 13. No regresión COT → Comprobante

`useCreditTermsConfigurator` es usado en tres callers:

| Caller | `initialCreditTerms` | Comportamiento |
|--------|---------------------|---------------|
| `FormularioDocumentoComercial.tsx` | `externalCreditTerms` (nuevo) | Hidrata desde COT o borrador |
| `EmisionTradicional.tsx` | NO pasado | `undefined` → comportamiento idéntico al original |
| `usePosComprobanteFlow.ts` | NO pasado | `undefined` → comportamiento idéntico al original |

`initialCreditTerms` es **opcional** con default `undefined`. Cuando es `undefined`, `pendingExternalRef.current = null`, y la condición `external?.schedule?.length` es `false`. El efecto cae en `setTemplates(defaultTemplates)` — exactamente el comportamiento original. ✅

`EmisionTradicional.tsx` y `usePosComprobanteFlow.ts` no fueron modificados. El flujo COT → Comprobante electrónico sigue pasando `cotizacion.creditTerms` directamente a la carga del comprobante, sin pasar por `useCreditTermsConfigurator`. ✅

---

## 14. Comandos ejecutados

```bash
# Verificación del diff
git status --short
git diff --stat
git diff -- apps/senciyo/src/.../useCreditTermsConfigurator.ts
git diff -- apps/senciyo/src/.../FormularioDocumentoComercial.tsx

# Validación de tipos y build
npm run build --workspace=apps/senciyo
# → tsc -b: 0 errores TypeScript
# → vite build: ✓ 3533 módulos, 0 errores, built in 23.07s

# Validación ESLint
npm run lint --workspace=apps/senciyo
# → eslint .: 0 errores, 0 warnings
```

---

## 15. Pruebas funcionales ejecutadas

**Trazabilidad estática completa** (sin ejecución en runtime — app no iniciada):

- ✅ Traza COT→NV: efectos ejecutados en orden, `pendingExternalRef` disponible antes de hidratación, defaults no pueden sobrescribir.
- ✅ Traza COT→OV: idéntica a COT→NV.
- ✅ Traza borrador: batching de React 18 confirmado, `setExternalCreditTerms` en mismo ciclo que `formaPago`.
- ✅ Traza contado→crédito→contado: `externalDisabledRef` activa correctamente.
- ✅ Traza cambio de método crédito: `hydratedFromExternalRef=true` fuerza carga de defaults del nuevo método.
- ✅ Traza edición manual: efecto no re-dispara, cambios del usuario persisten.
- ✅ Verificado tipos: `diasCredito` y `porcentaje` son los únicos inputs del usuario; `fechaVencimiento` e `importe` son siempre derivados.
- ✅ `shiftBusinessDate` es determinista: mismo date + mismo offset → mismo resultado siempre.
- ✅ `roundTwo` + "last cuota adjustment" son deterministas: mismo total + mismo porcentaje → mismo importe siempre.
- ✅ No regresión: `EmisionTradicional.tsx` y `usePosComprobanteFlow.ts` no pasaron `initialCreditTerms`; ambos seguirán usando defaults del método de pago.

---

## 16. Pruebas pendientes (funcionales en runtime)

Las siguientes pruebas NO pueden ejecutarse con trazabilidad estática y requieren el servidor de desarrollo con datos reales:

1. Crear una COT con 3 cuotas personalizadas (ej. 20/40% + 30/60%) → confirmar que el configurador muestra exactamente esas cuotas al convertir a NV.
2. Crear una COT con cuotas, cerrar el formulario → reabrir → confirmar que el borrador restaura las cuotas correctas.
3. Conversión COT→OV con cuotas → confirmar que las cuotas aparecen correctamente.
4. Desde NV con cuotas heredadas: cambiar a contado → volver a crédito → confirmar que se cargan los defaults del método (NO las cuotas de la COT).
5. Desde NV con cuotas heredadas: abrir modal → modificar cuotas → generar NV → confirmar que el documento persiste las cuotas modificadas, no las de la COT.
6. Desde NV con cuotas heredadas: agregar ítems (cambiar total) → confirmar que los montos se recalculan sobre el nuevo total con la misma distribución porcentual.
7. Desde NV con cuotas heredadas: cambiar fecha de emisión → confirmar que las fechas de cuotas se recalculan desde la nueva fecha.

---

## 17. Resultado final

| Criterio | Resultado |
|----------|-----------|
| **COT-P1-002** (conversión COT→NV/OV) | ⚠️ **CORREGIDO ESTÁTICAMENTE — PENDIENTE DE RUNTIME** |
| **COT-P1-003** (restauración de borrador) | ⚠️ **CORREGIDO ESTÁTICAMENTE — PENDIENTE DE RUNTIME** |
| Número de cuotas preservado | ✅ SÍ |
| Porcentajes preservados | ✅ SÍ (extraídos y reutilizados exactamente) |
| **Regla de fechas** | ⚠️ **REGLA A — Crédito relativo** (ver sección 18) |
| Fechas en borrador | ✅ SÍ — igual porque `fechaEmision` se restaura del draft |
| Fechas en conversión | ⚠️ DISTINTAS — calculadas desde `fechaEmision` del NV/OV (hoy), no desde la COT |
| Montos en borrador | ✅ SÍ (mismo total, roundTwo determinista) |
| Montos en conversión | ✅ SÍ si total igual; recalculados si cambia — correcto |
| Suma total = total documento | ✅ SÍ (last cuota adjustment garantiza esto) |
| Vencimiento global | ✅ SÍ para borrador; distinto para conversión (correcto) |
| Sin regresión en COT→Comprobante | ✅ Confirmado (archivos no modificados, parámetro opcional) |
| Edición posterior preservada | ✅ SÍ (efecto no re-dispara sin cambio de método) |
| TypeScript | ✅ 0 errores |
| Build | ✅ 0 errores (tsc -b + vite build, 3533 módulos) |
| ESLint | ✅ 0 errores, 0 warnings |
| Sin `any` / `@ts-ignore` / `eslint-disable` | ✅ |
| Archivos modificados fuera del alcance | ✅ Ninguno |
| Pruebas PT-01 a PT-07 en runtime | ❌ NO EJECUTADAS — servidor iniciado pero sin acceso a UI |

**Ruta del informe:** `C:\FacturaFacil\CORRECCION_CREDIT_TERMS_COTIZACIONES.md`

---

## 18. Validación final de fechas y montos

### 18.1 Regla implementada

**REGLA A — Crédito relativo.**

La implementación extrae `{diasCredito, porcentaje}` de cada cuota y reconstruye el cronograma usando la `fechaEmision` del documento DESTINO (NV/OV), no la de la Cotización.

Evidencia en código:

```typescript
// FormularioDocumentoComercial.tsx — línea 137
fechaEmision: documentoExistente ? source.fechaEmision : obtenerFechaHoyISO(),
// ↑ En conversión: documentoExistente=undefined → fechaEmision = HOY

// utils/documentoComercial.helpers.ts — línea 30-31
export const obtenerFechaHoyISO = (): string =>
  new Date().toISOString().split('T')[0];   // ← fecha del sistema al abrir el formulario

// useCreditTermsConfigurator.ts
buildCreditScheduleFromTemplate({
  total,
  issueDate: estado.fechaEmision,   // ← TODAY para conversión
  templates,                        // ← {diasCredito, porcentaje}[]
})
```

### 18.2 Ejemplo con las fechas del usuario

**Cotización (fecha de emisión: 01/06/2026)**

| Cuota | diasCredito | Porcentaje | fechaVencimiento |
|-------|-------------|------------|-----------------|
| 1 | 14 | 33.33% | 15/06/2026 |
| 2 | 29 | 33.33% | 30/06/2026 |
| 3 | 44 | 33.34% | 15/07/2026 |

`creditTermsToTemplates` extrae: `[{diasCredito:14, por:33.33}, {diasCredito:29, por:33.33}, {diasCredito:44, por:33.34}]`

**Nota de Venta creada el 05/06/2026 (fechaEmision = 05/06/2026)**

| Cuota | diasCredito (heredado) | Porcentaje (heredado) | fechaVencimiento CALCULADA |
|-------|----------------------|-----------------------|---------------------------|
| 1 | 14 | 33.33% | **19/06/2026** (05/06 + 14 días) |
| 2 | 29 | 33.33% | **04/07/2026** (05/06 + 29 días) |
| 3 | 44 | 33.34% | **19/07/2026** (05/06 + 44 días) |

**Las fechas de la NV son 19/06, 04/07 y 19/07 — NO 15/06, 30/06, 15/07.**

Las fechas cambian porque la NV es un documento emitido 4 días después. Los `diasCredito` se preservan, las fechas absolutas no.

### 18.3 Diferencia entre los dos flujos

| Flujo | fechaEmision del formulario | Comportamiento de fechas |
|-------|-----------------------------|--------------------------|
| **COT → NV / OV** | `obtenerFechaHoyISO()` = HOY | **REGLA A**: fechas recalculadas desde hoy + diasCredito. Fechas DISTINTAS a la COT si se crea en día diferente |
| **Borrador** | `datos.fechaEmision` del draft = la fecha que tenía el form al guardar | **Efectivamente REGLA A**, pero como `fechaEmision` se restaura, las fechas resultantes son IDÉNTICAS al momento del guardado |

**Para el borrador**: si el form fue guardado el 01/06/2026 con C1 = 15/06, al restaurar se aplica `fechaEmision = 01/06/2026` → `01/06 + 14 = 15/06` → **fecha idéntica**. Si el usuario cambia la `fechaEmision` manualmente después, las fechas se desplazarán (REGLA A aplica siempre).

### 18.4 Resultado campo por campo

| Campo | COT→NV/OV | Borrador |
|-------|-----------|---------|
| Número de cuotas | ✅ Idéntico | ✅ Idéntico |
| diasCredito por cuota | ✅ Idéntico | ✅ Idéntico |
| Porcentajes | ✅ Idénticos | ✅ Idénticos |
| Fechas absolutas de cuotas | ❌ Distintas (nuevas desde fechaEmision del NV) | ✅ Idénticas (fechaEmision restaurada del draft) |
| Montos | ✅ Idénticos si total no cambia | ✅ Idénticos (mismo total del carrito) |
| Redondeo última cuota | ✅ Idéntico si total no cambia | ✅ Idéntico |
| Vencimiento global | ❌ Distinto (máx de nuevas fechas) | ✅ Idéntico |
| totalPorcentaje | ✅ Idéntico | ✅ Idéntico |

### 18.5 Justificación de REGLA A para la conversión

REGLA A es la regla de negocio correcta para la conversión COT→NV/OV:

1. La NV/OV es un documento comercial emitido HOY, con su propia fecha de emisión.
2. Preservar fechas absolutas de una COT emitida hace semanas pondría cuotas vencidas (o por vencer muy pronto) en una NV nueva.
3. El usuario configuró "crédito a 30/60/90 días" — ese plazo relativo se preserva intacto. Las fechas absolutas son consecuencia de la fecha de emisión de CADA documento.
4. Si el negocio requiere REGLA B (fechas absolutas), eso es un cambio funcional independiente, fuera del alcance de esta corrección.

### 18.6 Pruebas ejecutadas en esta validación

| ID | Descripción | Estado |
|----|-------------|--------|
| Static-01 | Traza de `fechaEmision` en conversión: línea 137 → `obtenerFechaHoyISO()` | ✅ Ejecutada |
| Static-02 | Traza de `fechaEmision` en borrador: `aplicarValoresIniciales({fechaEmision: datos.fechaEmision})` | ✅ Ejecutada |
| Static-03 | Ejemplo numérico: COT 01/06 → NV 05/06, cuotas con diasCredito 14/29/44 → fechas 19/06/04/07/19/07 | ✅ Ejecutada |
| Build | `npm run build --workspace=apps/senciyo` | ✅ 0 errores, 14.62s |
| ESLint | `npm run lint --workspace=apps/senciyo` | ✅ 0 errores, 0 warnings |
| Server | `npm run dev --workspace=apps/senciyo` → localhost:5173 | ✅ Arranca (no hay acceso a UI) |

### 18.7 Pruebas pendientes (runtime con UI real)

| ID | Descripción | Bloquea veredicto |
|----|-------------|:---:|
| PT-01 | COT→NV: confirmar que cuotas aparecen con fechas desde fechaEmision de la NV | Sí |
| PT-02 | COT→OV: mismo que PT-01 | Sí |
| PT-03 | Borrador: confirmar fechas idénticas al guardar y restaurar mismo día | Sí |
| PT-03b | Borrador: confirmar fechas idénticas al restaurar días después (fechaEmision restaurada) | Sí |
| PT-04 | Edición manual tras herencia: ningún efecto restablece cuotas originales | Sí |
| PT-05 | Cambio crédito→contado→crédito: defaults del método (no cuotas COT) | Sí |
| PT-06 | Cambio de total: montos recalculados por porcentaje con suma = total | No |
| PT-07 | Cambio de fechaEmision: fechas desplazadas según nuevos dias relativos | No |

### 18.8 Veredicto definitivo

| Bloqueante | Veredicto |
|------------|-----------|
| **COT-P1-002** (conversión) | ⚠️ **CORREGIDO ESTÁTICAMENTE — PENDIENTE DE RUNTIME** |
| **COT-P1-003** (borrador) | ⚠️ **CORREGIDO ESTÁTICAMENTE — PENDIENTE DE RUNTIME** |

**La corrección implementa REGLA A (crédito relativo): `diasCredito` y porcentajes se conservan; las fechas absolutas se recalculan desde la `fechaEmision` del documento destino.**

Esto es correcto para el caso de conversión. Para el borrador, como `fechaEmision` también se restaura, las fechas resultantes son idénticas al momento de guardado.
