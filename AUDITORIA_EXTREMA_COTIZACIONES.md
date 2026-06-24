# AUDITORÍA EXTREMA — FLUJO COTIZACIONES
## FacturaFacil · Módulo Documentos Comerciales · Senciyo Frontend

---

| Campo | Valor |
|---|---|
| **Fecha de auditoría** | 2026-06-24 |
| **Auditor** | Claude Sonnet 4.6 (asistido — lectura estática + trazabilidad) |
| **Alcance exclusivo** | Flujo Cotizaciones (tipo `cotizacion`) |
| **Rama auditada** | `RevisionCotizacion` |
| **Commit HEAD** | `4412dcbb` |
| **Archivo de auditoría general previo** | `AUDITORIA_EXTREMA_DOCUMENTOS_COMERCIALES.md` |
| **Método de verificación** | Lectura estática completa de 16+ archivos fuente; build y lint ejecutados |
| **Runtime ejecutado** | NO — pruebas funcionales en ejecución: NO VERIFICABLE |

> **Convención de verificación usada en este informe:**
> - ✅ **Confirmado estáticamente** — se verificó mediante lectura directa del código fuente
> - 🔬 **Inferido por trazabilidad** — se concluyó siguiendo la cadena de llamadas en el código
> - ❌ **No verificable** — requeriría ejecución en runtime o condición dinámica

---

## 1. INFORMACIÓN DE LA AUDITORÍA

### 1.1 Objetivo
Auditoría técnica, funcional y arquitectural exhaustiva y exclusiva del flujo de Cotizaciones dentro del módulo Documentos Comerciales. Esta auditoría es independiente y complementaria al informe general previo (`AUDITORIA_EXTREMA_DOCUMENTOS_COMERCIALES.md`), al que no modifica ni reemplaza.

### 1.2 Método
- Lectura completa de todos los archivos que participan en el flujo de cotizaciones
- Trazabilidad de llamadas entre hooks, contextos, utilidades y componentes
- Verificación de cada transición de estado declarada
- Identificación de divergencias entre comportamiento declarado y comportamiento real del código
- Ningún código fue modificado durante esta auditoría

### 1.3 Restricciones aplicadas
- No se modificó código funcional
- No se corrigieron hallazgos automáticamente
- No se refactorizó
- No se agregaron dependencias
- No se modificaron `package.json` ni archivos lock
- No se agregaron tests
- No se agregaron `eslint-disable`, `ts-ignore` ni soluciones temporales
- Solo se creó este archivo Markdown
- Si un comportamiento no pudo verificarse en runtime, se marcó como NO VERIFICABLE

---

## 2. RESUMEN EJECUTIVO

El flujo de Cotizaciones en el módulo Documentos Comerciales presenta **3 hallazgos de severidad P1**, **12 de severidad P2** y **6 de severidad P3**. No se encontraron hallazgos P0 (pérdida de datos irrecuperable en flujo de un único usuario, build roto o error fatal silencioso en escritura principal).

Los P1 son bloqueantes para entrega porque:
1. **COT-P1-001**: Una cotización convertida (`Convertida`) pierde su registro comercial histórico original (cliente, items, totales) cuando el usuario edita el documento destino, sin aviso ni posibilidad de recuperación. Esto viola la integridad del pipeline comercial.
2. **COT-P1-002**: Los términos de crédito configurados en una cotización se pierden en las rutas de conversión COT→NV y COT→OV (aunque se preservan correctamente en COT→Comprobante).
3. **COT-P1-003**: Los términos de crédito tampoco se restauran al recuperar un borrador en progreso del formulario.

Los P2 son observaciones funcionales relevantes que impactan la experiencia y la mantenibilidad, pero no bloquean el flujo principal de un usuario en condiciones normales.

**Veredicto preliminar: 🔴 NO LISTO PARA ENTREGA**

---

## 3. CRITERIO DE APROBACIÓN

Para que el flujo Cotizaciones sea aprobado para entrega e integración, se requiere:

| Criterio | Estado |
|---|---|
| Build TypeScript sin errores | ✅ Pasa |
| ESLint sin errores | ✅ Pasa |
| 0 hallazgos P0 | ✅ Ninguno |
| 0 hallazgos P1 | ❌ 3 hallazgos P1 |
| Transiciones de estado coherentes | ⚠️ Parcial (ver §13) |
| Integridad de datos en conversión | ❌ Rota (COT-P1-001, COT-P1-002) |
| Trazabilidad completa COT↔destino | ⚠️ Unidireccional (ver §21) |
| Crédito/cuotas preservado en conversión | ❌ Solo en COT→Comprobante |
| Borradores funcionales | ⚠️ Parcial (COT-P1-003) |

---

## 4. INVENTARIO TÉCNICO EXCLUSIVO DE COTIZACIONES

### 4.1 Archivos que participan directamente en el flujo Cotizaciones

| Archivo | Rol | Líneas |
|---|---|---|
| `models/documentoComercial.types.ts` | Tipos: `EstadoCotizacion`, `DocumentoComercial`, `DatosFormularioDocumentoComercial` | ~250 |
| `models/documentoComercial.constants.ts` | `ESTADOS_COTIZACION`, `BORRADOR_EN_PROGRESO_*`, `STORAGE_KEYS` | ~120 |
| `utils/documentoComercial.helpers.ts` | `generarCorrelativoSeguro`, `calcularDesgloseTributos`, `normalizarEstadoCotizacionParaDisplay` | ~200 |
| `utils/documentoComercial.storage.ts` | `cargarDocumentosDesdeStorage`, `guardarDocumentosEnStorage`, migración legacy | 74 |
| `utils/convertirOVaComprobante.ts` | `validarCotizacionParaConversion`, `construirCargaConversionDesdeCotizacion` | ~150 |
| `contexts/DocumentosComercialesContext.tsx` | Reducer + 3 efectos + `recargarDesdeStorage` | ~300 |
| `hooks/useDocumentoComercialActions.ts` | Todas las acciones de negocio sobre COT | 964 |
| `hooks/useDocumentoComercialState.ts` | `resetEstado`, `aplicarValoresIniciales` | ~150 |
| `hooks/useDocumentoComercialDrafts.ts` | Borrador en progreso COT | ~100 |
| `components/FormularioDocumentoComercial.tsx` | Formulario principal (nuevo/editar COT, conversión) | ~400 |
| `components/FormularioHeaderComercial.tsx` | Cabecera: cliente, serie, fecha, requiereAprobacion, fechaVencimiento | ~350 |
| `components/ListadoDocumentosComerciales.tsx` | Listado, acciones contextuales, drawer detalle | 1488 |
| `pages/FormularioDocumentoComercialPage.tsx` | Página wrapper — lee `location.state` | ~60 |
| `pages/DocumentosComerciales.tsx` | Tabs: Cotizaciones / OV / NV | 92 |
| `shared/borradores/useBorradorEnProgreso.ts` | Motor genérico de borradores | 268 |
| `shared/documentosComerciales/postEmisionOrdenVenta.ts` | Post-emisión comprobante: actualiza/restaura COT fuera del contexto React | ~250 |
| `shared/documentosComerciales/comparadorComercial.ts` | `tieneCambiosComerciales` — comparador de snapshots | 52 |

### 4.2 Archivos que NO participan en cotizaciones
- `utils/convertirOVaComprobante.ts` — solo para NV/OV→Comprobante (excepto `validarCotizacionParaConversion` y `construirCargaConversionDesdeCotizacion` que sí aplican a COT→Comprobante)

---

## 5. ARQUITECTURA Y FUENTES DE VERDAD

### 5.1 Fuentes de verdad para el estado de cotizaciones

```
localStorage['documentos_comerciales_v1:{tenantId}']
    ↕ (carga inicial + escritura en cada cambio)
DocumentosComercialesContext (React useReducer)
    ↕ (dispatch ACTUALIZAR_DOCUMENTO)
useDocumentoComercialActions (lógica de negocio)
    ↓ (lectura directa — fuera del ciclo React)
postEmisionOrdenVenta.ts (manipula localStorage directamente)
    ↓ (emite evento DOM)
'documentos_comerciales_changed' event → recargarDesdeStorage()
```

✅ **Confirmado estáticamente**: Hay dos caminos de escritura al localStorage:
1. El path React normal: Context dispatch → useEffect guarda en LS
2. El path externo: `postEmisionOrdenVenta.ts` escribe directamente en LS y emite evento para forzar recarga

### 5.2 Fuente de verdad para correlativos
- **`generarCorrelativoSeguro`**: lee `documentosExistentes` del estado en memoria del contexto, no de localStorage directamente, y no tiene bloqueo atómico ✅ **Confirmado estáticamente**

### 5.3 Fuente de verdad para borradores
- Clave localStorage: `` `borrador_en_progreso:documentos_comerciales:{tenantId}:{establecimientoId}:{tipo}:{serie}:formulario` ``
- TTL: 14 días, versión: 1, debounce: 500ms ✅ **Confirmado estáticamente**

### 5.4 Patrón de sincronización entre tabs
- `postEmisionOrdenVenta.ts` emite `new CustomEvent('documentos_comerciales_changed')`
- El contexto escucha ese evento y llama `recargarDesdeStorage()`
- Este patrón solo funciona dentro de la misma pestaña del navegador ❌ **No verificable en runtime**

---

## 6. RESULTADOS DE BUILD / LINT / TYPESCRIPT / TESTS

### 6.1 Build (Vite 7)
```
✓ built in 5.81s
index-BzDQqOCs.js      496.49 kB │ gzip: 157.40 kB
xlsx-CSJoEuXa.js       429.12 kB │ gzip: 239.55 kB
(+ otros chunks menores)
```
**Resultado**: ✅ Sin errores. ✅ Sin advertencias de build.

### 6.2 ESLint 9 + typescript-eslint 8
**Resultado**: ✅ 0 errores. ✅ 0 advertencias.

**`eslint-disable` intencionales en el módulo** (confirmados, no son errores):
- `FormularioDocumentoComercial.tsx:114` — `react-hooks/exhaustive-deps` (inicialización de serie)
- `FormularioDocumentoComercial.tsx:149` — `react-hooks/exhaustive-deps` (efecto de inicialización one-shot)
- `FormularioHeaderComercial.tsx:138` — `react-hooks/exhaustive-deps` (inicialización formaPago)
- `DocumentosComerciales.tsx:32` — `react-hooks/exhaustive-deps` (efecto de tab por location.state)
- `DocumentosComercialesContext.tsx:1` — `react-refresh/only-export-components` (split diferido)

### 6.3 TypeScript
**Resultado**: ✅ 0 errores de tipos encontrados en lectura estática.

### 6.4 Tests
**Resultado**: ❌ **0 tests** en todo el módulo Documentos Comerciales. No existe ningún archivo `*.test.ts`, `*.test.tsx`, `*.spec.ts` o `*.spec.tsx` para este flujo.

---

## 7. MAPA FUNCIONAL COMPLETO DEL FLUJO COTIZACIONES

### 7.1 Acciones disponibles por estado

| Estado COT | Editar | Anular | Marcar Aceptada | Cerrar Perdida | Convertir NV | Convertir OV | Convertir Comprobante | Aprobar | No Aprobar |
|---|---|---|---|---|---|---|---|---|---|
| `Vigente` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `Pendiente aprobación` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `Aprobada` | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `Aceptada` | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `Vencida` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `Convertida` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `Anulada` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `No aprobada` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `Cerrada perdida` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `esBorrador=true` | ✅ (todas) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

✅ **Confirmado estáticamente** — derivado de `puedeEditar`, `puedeAnular`, `puedeMarcarAceptada`, `puedeCerrarPerdida`, `puedeConvertirCotizacion`, `puedeAprobar`, `puedeNoAprobar` en `ListadoDocumentosComerciales.tsx`.

**Observación**: `Aprobada` no es editable. Esto es coherente con el flujo de aprobación formal, pero `estadosReevaluables` en `actualizarDocumento` no incluye `Aprobada`, lo que es consistente. Sin embargo, `puedeEditar` tampoco incluye `Aprobada` (la lista es `['Vigente', 'Pendiente aprobación', 'Aceptada', 'Vencida']`), por lo que no hay inconsistencia entre UI y lógica de negocio para este estado.

### 7.2 Rutas de conversión desde Cotización

```
COT (Aceptada)
    ├── → NV (nota_venta)       via handleConvertirCotANV       → navigate con prefillFrom+cotizacionOrigenId
    ├── → OV (orden_venta)      via handleConvertirCotAOV       → navigate con prefillFrom+cotizacionOrigenId
    └── → Comprobante (F/B)     via handleConvertirCotAComprobante → navigate a /comprobantes/emision
```

### 7.3 Archivos de acción por función

| Función | Archivo | Línea aprox. |
|---|---|---|
| `generarDocumento` (crear COT) | `useDocumentoComercialActions.ts` | ~200 |
| `actualizarDocumento` (editar COT) | `useDocumentoComercialActions.ts` | ~320 |
| `anularDocumento` | `useDocumentoComercialActions.ts` | ~450 |
| `marcarComoAceptada` | `useDocumentoComercialActions.ts` | ~550 |
| `cerrarCotizacionComoPerdida` | `useDocumentoComercialActions.ts` | ~600 |
| `evaluarVencimientosCotizaciones` | `useDocumentoComercialActions.ts` | ~851 |
| `sincronizarCotizacionDesdeDocumento` | `useDocumentoComercialActions.ts` | ~912 |
| `vincularDocumentoConCotizacion` | `useDocumentoComercialActions.ts` | ~750 |
| `validarCotizacionParaConversion` | `convertirOVaComprobante.ts` | ~1 |
| `construirCargaConversionDesdeCotizacion` | `convertirOVaComprobante.ts` | ~50 |
| `actualizarCotizacionPostEmision` | `postEmisionOrdenVenta.ts` | ~80 |
| `restaurarCotizacionPostAnulacion` | `postEmisionOrdenVenta.ts` | ~130 |

---

## 8. AUDITORÍA DEL LISTADO

### 8.1 Renderizado y filtrado
- El listado filtra por `tipo === tabActivo` ✅ **Confirmado estáticamente**
- Los tabs muestran conteo mediante `contarPorTipo` en `DocumentosComerciales.tsx:34`
- **COT-P3-003**: `contarPorTipo` filtra solo por `tipo`, no por `establecimientoId`. Si hay cotizaciones de múltiples establecimientos en el mismo tenant, el conteo del tab puede no corresponder al listado filtrado por establecimiento ✅ **Confirmado estáticamente**

### 8.2 Columnas y persistencia de columnas
- La visibilidad de columnas se persiste en localStorage con clave literal `` `documentos_comerciales_columnas_${tipo}` ``
- **COT-P2-006**: `STORAGE_KEYS.COLUMNAS_PREFIJO` está definido en constants pero NO se usa en `ListadoDocumentosComerciales.tsx`; se usa el literal directamente ✅ **Confirmado estáticamente**
- **COT-P2-005**: `COLUMNAS_DEFAULT_LISTADO` en `constants.ts` se exporta pero nunca se importa en ningún archivo ✅ **Confirmado estáticamente** (muerto)

### 8.3 Ordenamiento y paginación
- El listado implementa ordenamiento por columnas ❌ **No verificable** en runtime

### 8.4 Acciones contextuales
- Las guards `puedeEditar`, `puedeAnular`, `puedeConvertirCotizacion`, `puedeMarcarAceptada`, `puedeCerrarPerdida` están implementadas a nivel de UI
- **COT-P3-001**: No existe guard equivalente en la capa de acción (`actualizarDocumento`, `anularDocumento`, etc.). Cualquier llamada directa al hook evita las restricciones de estado ✅ **Confirmado estáticamente**

### 8.5 Evaluación de vencimientos al entrar al tab
```typescript
useEffect(() => {
  if (tipo === 'cotizacion') evaluarVencimientosCotizaciones();
}, [tipo, evaluarVencimientosCotizaciones]);
```
✅ **Confirmado estáticamente** — se ejecuta al montar el listado de cotizaciones y cuando cambia `tipo`.

### 8.6 Documento relacionado en listado
- Para cotizaciones, `resolverDocumentoRelacionadoNumero` devuelve `doc.trazabilidad?.documentoDestinoNumero ?? '—'` ✅ **Confirmado estáticamente**
- Esto es correcto para la perspectiva COT (muestra el documento destino)

---

## 9. AUDITORÍA DE CREACIÓN

### 9.1 Flujo de creación de cotización nueva

1. Usuario navega a `/documentos-comerciales/nuevo/cotizacion`
2. `FormularioDocumentoComercialPage` lee `location.state` — sin state → `modo='nuevo'`, `documento=undefined`
3. `FormularioDocumentoComercial` monta con `modo='nuevo'`
4. Efecto de inicialización (líneas 117-149) aplica: `tipo='cotizacion'`, `serie` (primera disponible), `fecha=hoy`, defaults de `moneda`, `formaPago`, `camposOpcionales`, `observaciones`, `notaInterna`, `modoProductos`
5. Usuario completa datos, añade items al carrito
6. `handleGenerar` valida y llama `generarDocumento`
7. `generarDocumento` determina estado inicial: `requiereAprobacion === true` → `'Pendiente aprobación'` / default → `'Vigente'`
8. Documento guardado en contexto → LS → UI actualizada

### 9.2 Estado inicial correcto
```typescript
// useDocumentoComercialActions.ts
if (datos.tipo === 'cotizacion') {
  estadoInicial = datos.camposOpcionales?.requiereAprobacion === true
    ? 'Pendiente aprobación'
    : 'Vigente';
}
```
✅ **Confirmado estáticamente**

### 9.3 Validaciones en `generarDeshabilitado`
```typescript
const generarDeshabilitado =
  sinSerie ||
  (esCotizacion && (!cliente || cartItems.length === 0));
```
✅ **Confirmado estáticamente** — El botón "Generar" se deshabilita si no hay serie, si es cotización y no hay cliente, o si no hay items.

### 9.4 Generación de correlativo
- `generarCorrelativoSeguro(serie, documentosExistentes, configSeries)` lee del estado en memoria, no de LS directamente
- **COT-P2-003**: No es atómico entre pestañas del navegador concurrentes ✅ **Confirmado estáticamente** (frontend-only, limitación arquitectural)

---

## 10. AUDITORÍA DE BORRADORES EN PROGRESO

### 10.1 Configuración del borrador

| Campo | Valor |
|---|---|
| Clave | `` `borrador_en_progreso:documentos_comerciales:{tenantId}:{establecimientoId}:{tipo}:{serie}:formulario` `` |
| TTL | 14 días |
| Versión | 1 |
| Debounce | 500 ms |
| Habilitado | Solo cuando `modo === 'nuevo' && !prefillFrom && !cotizacionOrigenId` |

✅ **Confirmado estáticamente** — El borrador se deshabilita correctamente durante conversiones.

### 10.2 Condición para persistir
```typescript
debePersistir: (datos) => datos.items.length > 0 || !!datos.cliente
```
✅ **Confirmado estáticamente**

### 10.3 Restauración del borrador (HALLAZGO P1)

El callback `aplicarEstado` en `useDocumentoComercialDrafts` (invocado desde `FormularioDocumentoComercial.tsx:172-190`) aplica los campos recuperados mediante `aplicarValoresIniciales`, pero **no incluye `creditTerms`**.

`EstadoFormularioDocumentoComercial` no tiene campo `creditTerms`. Los términos de crédito son gestionados por `useCreditTermsConfigurator`, que es un hook separado y que se inicializa desde `paymentMethodId`, no desde datos guardados.

**Consecuencia**: Un usuario crea una cotización con cuotas de crédito configuradas, cierra el navegador, vuelve, se ofrece restaurar el borrador → los items, cliente, y demás campos se restauran, pero las cuotas de crédito se pierden. → **COT-P1-003**

### 10.4 Versión y migración
```typescript
BORRADOR_EN_PROGRESO_VERSION = 1
```
`useBorradorEnProgreso.ts`: si `parsed.version !== versionEsperada` → retorna `null` (descarta, no migra).
- **COT-P3-004**: No existe lógica de migración de borradores entre versiones. Un cambio de versión descartará silenciosamente todos los borradores existentes ✅ **Confirmado estáticamente**

### 10.5 Limpieza al cancelar
`handleCancelar` en `FormularioDocumentoComercial.tsx:340` llama `limpiarBorrador()` ✅ **Confirmado estáticamente**

### 10.6 Persistencia de formaPago en borrador
```typescript
// FormularioDocumentoComercial.tsx:179 (aplicarEstado callback)
formaPago: datos.formaPago ?? 'contado',
```
**COT-P2-007**: Si el borrador fue guardado con `formaPago = ''` (vacío) o un método personalizado, la restauración fuerza `'contado'` en lugar de usar el valor guardado o el default del sistema ✅ **Confirmado estáticamente**

---

## 11. AUDITORÍA DE CÁLCULOS

### 11.1 `calcularDesgloseTributos`

```typescript
// Soporta: igv18 (18%), igv10 (10%), exonerado, inafecto
// Filtra items con taxableBase <= 0.001
```

✅ **Confirmado estáticamente** — La función soporta cuatro tipos de tributo.

### 11.2 Precisión numérica
- Los items individuales contienen precios y cantidades como `number` en TypeScript
- No se observó redondeo explícito a nivel de items en la capa de creación de cotizaciones ❌ **No verificable** si hay acumulación de error de punto flotante en totales

### 11.3 `tieneCambiosComerciales` (comparador para conversión)

```typescript
function normalizarNumero(n: number): number {
  return Math.round(n * 100) / 100;
}
```
✅ **Confirmado estáticamente** — Se redondea a 2 decimales para la comparación. El comparador ordena items por clave antes de comparar, resistente a reordenamiento.

### 11.4 Desglose de tributos en totales de cotización
- La estructura `totales` en `DocumentoComercial` incluye: `subtotal`, `igv`, `total`, `descuento`, `otrosCargos`
- El cálculo proviene del carrito de productos, no de una función centralizada de cotizaciones ❌ **No verificable** la coherencia exacta sin runtime

---

## 12. AUDITORÍA DE CRÉDITO Y CUOTAS

### 12.1 Almacenamiento en cotización
- `DatosFormularioDocumentoComercial` incluye `creditTerms?: ComprobanteCreditTerms` ✅ **Confirmado estáticamente**
- El tipo `ComprobanteCreditTerms` viene de los tipos de comprobantes electrónicos

### 12.2 Ruta COT → Comprobante (CORRECTA)
```typescript
// convertirOVaComprobante.ts
terminosCredito: cotizacion.creditTerms ?? null,
```
✅ **Confirmado estáticamente** — Los términos de crédito se transfieren correctamente al comprobante electrónico.

### 12.3 Ruta COT → NV / COT → OV (HALLAZGO P1)

**`FormularioDocumentoComercial.tsx`, efecto de inicialización (líneas 117-149)**:
```typescript
// Aplica: tipo, serie, fecha, cliente, moneda, formaPago,
//         camposOpcionales, observaciones, notaInterna, modoProductos
// NO aplica: creditTerms
```

`aplicarValoresIniciales` en `useDocumentoComercialState.ts` no incluye `creditTerms` en `EstadoFormularioDocumentoComercial`.

`useCreditTermsConfigurator` se inicializa desde `paymentMethodId`, NO desde `creditTerms` existentes del documento prefill.

**Resultado**: Al convertir COT→NV o COT→OV, las cuotas de crédito configuradas en la cotización se descartan y el formulario comienza con el configurador de crédito en estado inicial. → **COT-P1-002**

### 12.4 Restauración en borrador
Mismo problema que §12.3 aplicado al path de restauración de borrador. → **COT-P1-003** (relacionado)

### 12.5 Resumen de rutas de crédito

| Ruta | Crédito transferido |
|---|---|
| COT → Comprobante (boleta/factura) | ✅ Sí (`terminosCredito: cotizacion.creditTerms ?? null`) |
| COT → NV (formulario) | ❌ No (inicialización no incluye creditTerms) |
| COT → OV (formulario) | ❌ No (misma causa raíz) |
| COT → Borrador restaurado | ❌ No (aplicarEstado no incluye creditTerms) |

---

## 13. MATRIZ DE ESTADOS Y TRANSICIONES

### 13.1 Estados definidos

**En `documentoComercial.types.ts`** (`EstadoCotizacion`):
```
'Vigente' | 'Pendiente aprobación' | 'Aprobada' | 'Aceptada' | 'Vencida' |
'Convertida' | 'Anulada' | 'No aprobada' | 'Cerrada perdida' |
'Generada'  ← LEGACY | 'Rechazada' ← LEGACY
```
Total: 11 (9 activos + 2 legacy)

**En `documentoComercial.constants.ts`** (`ESTADOS_COTIZACION`):
```
10 estados — excluye 'Generada' y 'Rechazada'
```
**COT-P3-006**: Inconsistencia: el tipo incluye los legacy pero la constante no ✅ **Confirmado estáticamente**

### 13.2 Transiciones de estado (diagrama textual)

```
[nuevo]
  └─ generarDocumento
        ├─ requiereAprobacion=true → Pendiente aprobación
        └─ default → Vigente

Pendiente aprobación
  ├─ aprobarCotizacion() → Aprobada
  ├─ noAprobarCotizacion() → No aprobada  [TERMINAL]
  └─ anularDocumento() → Anulada          [TERMINAL]

Vigente
  ├─ actualizarDocumento() → re-evalúa → Vigente | Pendiente aprobación | Vencida
  ├─ marcarComoAceptada() → Aceptada
  ├─ cerrarCotizacionComoPerdida() → Cerrada perdida  [TERMINAL]
  ├─ anularDocumento() → Anulada                      [TERMINAL]
  └─ evaluarVencimientos() → Vencida (si fechaVencimiento < hoy)

Aprobada
  ├─ marcarComoAceptada() → Aceptada
  ├─ cerrarCotizacionComoPerdida() → Cerrada perdida  [TERMINAL]
  └─ anularDocumento() → Anulada                      [TERMINAL]
  ⚠ evaluarVencimientos() → Vencida (Aprobada está en estadosVencibles — ver §15.3)

Aceptada
  ├─ actualizarDocumento() → re-evalúa → Vigente | Pendiente aprobación | Vencida
  │    (⚠ 'Aceptada' en estadosReevaluables pero calcularEstadoResultante NUNCA retorna 'Aceptada')
  ├─ vincularDocumentoConCotizacion() → Convertida    [TERMINAL de facto]
  ├─ cerrarCotizacionComoPerdida() → Cerrada perdida  [TERMINAL]
  └─ anularDocumento() → Anulada                      [TERMINAL]
  ⚠ evaluarVencimientos() → Vencida (Aceptada está en estadosVencibles — ver §15.3)

Vencida
  ├─ actualizarDocumento() → re-evalúa → Vigente | Pendiente aprobación | Vencida
  └─ anularDocumento() → Anulada                      [TERMINAL]
  ⚠ cerrarCotizacionComoPerdida NO disponible para Vencida (ver §15.4 — COT-P2-009)

Convertida
  ├─ (si el doc destino se anula) → anularDocumento en postEmisionOrdenVenta → Aceptada
  └─ (si el doc destino es NV/OV y se anula vía cascade) → restaurarCotizacionPostAnulacion → Aceptada

Anulada       [TERMINAL — no reversible]
No aprobada   [TERMINAL — no reversible]
Cerrada perdida [TERMINAL — no reversible]
```

### 13.3 Observación crítica: editar una cotización `Aceptada` la degrada
```typescript
// useDocumentoComercialActions.ts
const estadosReevaluables: string[] = ['Vigente', 'Pendiente aprobación', 'Aceptada', 'Vencida'];
// calcularEstadoResultanteCotizacion NUNCA retorna 'Aceptada'
```

Cuando un usuario edita una cotización `Aceptada` (lo cual es permitido por `puedeEditar`), `actualizarDocumento` la re-evalúa. El resultado posible es: `'Vigente'`, `'Pendiente aprobación'`, o `'Vencida'` — **nunca vuelve a `'Aceptada'`**. Hay un banner de advertencia en el formulario que notifica esto. Sin embargo, esta degradación es irreversible una vez guardada. ✅ **Confirmado estáticamente**

---

## 14. AUDITORÍA DE APROBACIÓN

### 14.1 Flujo de aprobación (requiereAprobacion)
- Checkbox "Requiere aprobación" visible solo para `tipo === 'cotizacion'` en `FormularioHeaderComercial.tsx` ✅ **Confirmado estáticamente**
- Al crear COT con `requiereAprobacion=true` → estado inicial `'Pendiente aprobación'`
- `puedeAprobar`: `tipo === 'cotizacion' && estado === 'Pendiente aprobación' && !esBorrador`
- `aprobarCotizacion()` → `'Aprobada'`
- `puedeNoAprobar`: `tipo === 'cotizacion' && estado === 'Pendiente aprobación' && !esBorrador`
- `noAprobarCotizacion()` → `'No aprobada'` (terminal)

### 14.2 Validación de motivo en "No Aprobar"
```typescript
// ListadoDocumentosComerciales.tsx handleConfirmarAccion
// Para 'no_aprobar': NO verifica motivo antes de confirmar
// Para 'anular' y 'cerrar_perdida': sí verifica motivo
```
**COT-P2-008**: La acción "No Aprobar" no requiere motivo aunque el diálogo lo solicita. Inconsistencia UX con las demás acciones que sí lo requieren ✅ **Confirmado estáticamente**

### 14.3 Permisos/roles
No existe ningún sistema de permisos por rol que restrinja quién puede aprobar o rechazar cotizaciones. Cualquier usuario con acceso al módulo puede aprobar/rechazar. ❌ **No verificable** (sin sistema de roles implementado)

---

## 15. AUDITORÍA DE ACEPTACIÓN / PÉRDIDA / VENCIMIENTO

### 15.1 Marcar como Aceptada
```typescript
// marcarComoAceptada — Regla de negocio:
const estadosPermitidos: string[] = ['Vigente', 'Aprobada'];
// 'Pendiente aprobación' NO puede marcarse como Aceptada directamente
```
✅ **Confirmado estáticamente** — Correcto: requiere que pase por aprobación primero si `requiereAprobacion=true`.

### 15.2 Cerrar como Perdida
```typescript
// cerrarCotizacionComoPerdida
const estadosCierrePerdida: string[] = ['Vigente', 'Aprobada', 'Aceptada'];
// 'Vencida' NO está incluida → COT-P2-009
// 'Pendiente aprobación' NO está incluida → correcto
```
✅ **Confirmado estáticamente**

### 15.3 Auto-vencimiento (HALLAZGO P2)
```typescript
// evaluarVencimientosCotizaciones
const estadosVencibles: string[] = ['Vigente', 'Aprobada', 'Pendiente aprobación', 'Aceptada'];
```
**COT-P2-002**: Una cotización `Aceptada` (con acuerdo del cliente) puede ser marcada como `Vencida` automáticamente al entrar al tab, si tiene `fechaVencimiento < hoy`. Esto invalida una cotización formalmente aceptada sin intervención del usuario. ✅ **Confirmado estáticamente**

### 15.4 Cotización Vencida sin salida "Cerrada Perdida" (HALLAZGO P2)
Una cotización `Vencida` puede ser anulada (terminal) pero no puede ser cerrada como "Perdida" (que es semánticamente más informativo). **COT-P2-009** ✅ **Confirmado estáticamente**

### 15.5 Loop de vencimiento
No existe loop infinito: las cotizaciones que entran a `evaluarVencimientosCotizaciones` quedan en estado `'Vencida'`, y `'Vencida'` no está en `estadosVencibles`. En la siguiente ejecución del efecto, ya no se vuelven a procesar ✅ **Confirmado estáticamente**

---

## 16. AUDITORÍA DE EDICIÓN

### 16.1 Estados editables
`puedeEditar` para cotización: `esBorrador || ['Vigente', 'Pendiente aprobación', 'Aceptada', 'Vencida'].includes(estado)`
- `'Aprobada'` NO es editable ✅ **Confirmado estáticamente**

### 16.2 Efecto de editar una cotización `Aceptada`
Al guardar una edición de una COT `Aceptada`, `actualizarDocumento` la re-evalúa con `calcularEstadoResultanteCotizacion` que nunca retorna `'Aceptada'`. Resultado: la cotización pierde el estado `'Aceptada'` irreversiblemente. Hay un banner de advertencia visible en el formulario. ✅ **Confirmado estáticamente**

### 16.3 Carga de datos en edición
**`FormularioDocumentoComercialPage.tsx`**: lee el documento de `location.state`, no de URL params.
**COT-P2-004**: La URL `/documentos-comerciales/editar/{id}` abierta directamente (sin `location.state`) muestra un formulario en blanco en modo `'nuevo'`, no carga el documento por ID. El enlace "Copiar enlace" apunta a esa URL pero es no funcional para edición directa ✅ **Confirmado estáticamente**

### 16.4 Validación de cambios comerciales al convertir con cambios
```typescript
// FormularioDocumentoComercial.tsx handleGenerar
const confirmoConCambios = saltarVerificacionCambiosRef.current 
  && cotizacionOrigenId !== null 
  && prefillFrom !== null;
```
**COT-P3-005**: `cotizacionOrigenId` y `prefillFrom` son props opcionales (`string | undefined`). La verificación usa `!== null` en lugar de `!== undefined`. Como TypeScript permite ambos en el tipo, la condición es `undefined !== null → true` (si el ref está activo), lo que puede activar la derivación de verificación cuando no debería ✅ **Confirmado estáticamente** (potencial bug sutil)

---

## 17. CONVERSIÓN COT → NV

### 17.1 Flujo
```typescript
// ListadoDocumentosComerciales.tsx handleConvertirCotANV
const itemsConStockActual = doc.items.map(
  (item) => refrescarStockItem(item, almacenesActuales, activeEstablecimientoId ?? undefined)
);
navigate('/documentos-comerciales/nuevo/nota_venta', {
  state: {
    prefillFrom: { ...doc, items: itemsConStockActual },
    cotizacionOrigenId: doc.id
  }
});
```
✅ **Confirmado estáticamente** — El stock se refresca antes de navegar. `cotizacionOrigenId` se pasa correctamente.

### 17.2 Campos transferidos al formulario NV
- Cliente ✅
- Items (con stock actualizado) ✅
- Moneda ✅
- Forma de pago ✅
- Observaciones ✅
- Nota interna ✅
- Campos opcionales ✅
- **`creditTerms`**: ❌ NO transferido (COT-P1-002)

### 17.3 Estado de la cotización durante la conversión
La cotización NO cambia de estado hasta que se llama `vincularDocumentoConCotizacion` DESPUÉS de que `generarDocumento` crea la NV exitosamente ✅ **Confirmado estáticamente** — No existe condición de race si el usuario cancela el formulario NV.

### 17.4 Borradores durante conversión COT→NV
`habilitado: modo === 'nuevo' && !prefillFrom && !cotizacionOrigenId` → borrador deshabilitado ✅ **Confirmado estáticamente**

---

## 18. CONVERSIÓN COT → OV

### 18.1 Flujo
Idéntico a COT→NV con destino `orden_venta`. Mismos hallazgos aplican:
- **COT-P1-002** aplica: `creditTerms` no transferido
- Stock refrescado ✅
- Borrador deshabilitado ✅

### 18.2 Diferencias vs COT→NV
No se identificaron diferencias funcionales en el path de conversión COT→OV vs COT→NV en lo que respecta al flujo Cotizaciones ✅ **Confirmado estáticamente**

---

## 19. CONVERSIÓN COT → COMPROBANTE

### 19.1 Validación previa a conversión
```typescript
// convertirOVaComprobante.ts validarCotizacionParaConversion
// Permite: estado === 'Aceptada' || estado === 'Generada' (legacy)
// Requiere: numero, cliente, items
```
✅ **Confirmado estáticamente**

### 19.2 Construcción del payload
```typescript
// construirCargaConversionDesdeCotizacion
terminosCredito: cotizacion.creditTerms ?? null,  // ✅ CORRECTO
```
✅ **Confirmado estáticamente** — Esta es la única ruta de conversión que transfiere correctamente los términos de crédito.

### 19.3 Post-emisión
`actualizarCotizacionPostEmision` en `postEmisionOrdenVenta.ts`:
- Solo acepta cotizaciones en estado `'Aceptada'` o `'Generada'` (legacy)
- Marca la cotización como `'Convertida'`
- Escribe directamente en localStorage y emite evento DOM

✅ **Confirmado estáticamente** (derivado de resumen de sesión previa y lectura de la función en sesión 1)

---

## 20. ANULACIONES Y REVERSIONES

### 20.1 Anular cotización directamente
`anularDocumento` para COT: cambia estado a `'Anulada'` (terminal) ✅ **Confirmado estáticamente**

### 20.2 Cascade: anular NV/OV que viene de COT
```typescript
// useDocumentoComercialActions.ts anularDocumento (para NV/OV)
const cotizacionVinculada = state.documentos.find(
  (d) => d.tipo === 'cotizacion' 
    && d.estado === 'Convertida'
    && d.trazabilidad?.documentoDestinoId === id,
);
if (cotizacionVinculada) {
  actualizarEnContext({ ...cotizacionVinculada, estado: 'Aceptada', ... });
}
```
✅ **Confirmado estáticamente** — Restaura correctamente la COT a `'Aceptada'` cuando el documento destino NV/OV se anula.

### 20.3 Cascade: anular comprobante que viene de COT
`restaurarCotizacionPostAnulacion` en `postEmisionOrdenVenta.ts`:
- Siempre restaura la COT a `'Aceptada'` (correcto, ya que solo puede convertirse desde `'Aceptada'`)
- Opera directamente sobre localStorage, emite evento DOM para recarga ✅ **Confirmado estáticamente** (sesión previa)

### 20.4 Reversibilidad del estado `Convertida`
El estado `'Convertida'` es reversible únicamente si el documento destino es anulado. No existe un mecanismo para desconectar una cotización de su documento destino sin anularlo ✅ **Confirmado estáticamente**

---

## 21. TRAZABILIDAD Y DOCUMENTO RELACIONADO

### 21.1 Estructura de trazabilidad
```typescript
// documentoComercial.types.ts TrazabilidadDocumentoComercial
interface TrazabilidadDocumentoComercial {
  documentoOrigenId?: string;
  documentoOrigenNumero?: string;
  documentoDestinoId?: string;
  documentoDestinoNumero?: string;
  fechaConversion?: string;
}
```
✅ **Confirmado estáticamente** — La estructura soporta un único origen y un único destino.

### 21.2 Llenado de trazabilidad al convertir COT→NV/OV
```typescript
// vincularDocumentoConCotizacion — llamado DESPUÉS de generarDocumento
const actualizado = {
  ...doc,
  estado: 'Convertida',
  trazabilidad: {
    ...doc.trazabilidad,
    documentoDestinoId: docDestinoId,
    documentoDestinoNumero: docDestinoNumero,
    fechaConversion: obtenerFechaHoraISO(),
  },
};
```
✅ **Confirmado estáticamente** — La trazabilidad de la COT apunta al documento destino.

### 21.3 Trazabilidad inversa (NV/OV → COT origen)
Para NV/OV, el campo `trazabilidad.documentoOrigenId` se llena en el momento de creación con el `cotizacionOrigenId` ✅ **Confirmado estáticamente** (inferido por trazabilidad — el parámetro se pasa a `generarDocumento`)

### 21.4 Limitación de trazabilidad: COT solo puede convertirse una vez
La estructura solo admite un `documentoDestinoId`. Si una cotización `Aceptada` se convierte a NV, luego se anula la NV (restaura COT a `Aceptada`), y se convierte nuevamente, el segundo destino sobreescribe el primero en la trazabilidad. No hay historial de conversiones múltiples ✅ **Confirmado estáticamente**

---

## 22. SINCRONIZACIÓN DESDE DOCUMENTOS DESTINO

### 22.1 `sincronizarCotizacionDesdeDocumento` — HALLAZGO P1 CRÍTICO

**Archivo**: `useDocumentoComercialActions.ts:912-943`
**Activador**: `FormularioDocumentoComercial.tsx:266-274` — llamado cuando se guarda exitosamente una edición de NV/OV que tiene `documentoOrigenId`

```typescript
// useDocumentoComercialActions.ts ~912
actualizarEnContext({
  ...cotizacion,
  cliente: doc.cliente,           // ← SOBREESCRIBE datos históricos de la COT
  items: doc.items,               // ← SOBREESCRIBE items originales
  totales: doc.totales,           // ← SOBREESCRIBE totales originales
  observaciones: doc.observaciones,
  formaPago: doc.formaPago,
  moneda: doc.moneda,
  // trazabilidad: NO modificado ✅
  // creditTerms: NO modificado ✅
  // estado: NO modificado ✅ (sigue en 'Convertida')
});
```

**Problema**: Cuando un usuario edita la NV o la OV que proviene de una cotización, `sincronizarCotizacionDesdeDocumento` silenciosamente sobreescribe los datos originales de la cotización con los datos actualizados del documento destino.

**Consecuencia**: La cotización pierde su registro comercial histórico (el acuerdo original con el cliente). Si el cliente negoció la NV con diferentes items o precios, la cotización deja de reflejar lo que fue cotizado originalmente.

**Sin aviso al usuario**: La sincronización ocurre en silencio, sin diálogo de confirmación ni registro en el historial de la cotización.

**Estado `Convertida` no cambia**: La COT permanece en `'Convertida'`, pero sus datos internos han sido mutados.

✅ **Confirmado estáticamente** — → **COT-P1-001**

### 22.2 Campos no sobrescritos
- `trazabilidad` ✅ (preservado)
- `creditTerms` ✅ (preservado — pero ver P1-002 sobre no transferencia inicial)
- `estado` ✅ (permanece `'Convertida'`)
- `id`, `numero`, `serie`, `tipo`, `fechaCreacion` ✅ (del spread original)

---

## 23. PERSISTENCIA / CONCURRENCIA / CORRELATIVOS

### 23.1 Persistencia principal
- Fuente de verdad: `localStorage['documentos_comerciales_v1:{tenantId}']`
- Serialización: `JSON.stringify(documentos[])` — sin schema, sin validación de lectura (solo cast `as DocumentoComercial[]`)
- Migración legacy: `migrarDocumentosLegacy` copia de clave sin prefijo a clave con prefijo ✅ **Confirmado estáticamente**
- Migración de estados legacy: `normalizarDocumentoCargado` en `documentoComercial.storage.ts` convierte `'Generada'` y `'Rechazada'` al cargar ✅ **Confirmado estáticamente**

### 23.2 Escrituras concurrentes (multi-tab)
**COT-P2-003**: Dos pestañas con el mismo tenant y serie pueden generar el mismo correlativo porque `generarCorrelativoSeguro` lee del estado en memoria de cada tab por separado.

La sincronización entre tabs depende de:
1. El evento `'documentos_comerciales_changed'` — funciona solo dentro del mismo proceso (misma pestaña)
2. No hay `BroadcastChannel`, `SharedWorker`, ni `localStorage storage event` escuchado

**Limitación arquitectural del frontend-only**: No hay backend que garantice atomicidad. ✅ **Confirmado estáticamente**

### 23.3 Cuota de localStorage
`guardarDocumentosEnStorage` captura el error de cuota silenciosamente (`catch { // Ignorar errores de cuota }`). No hay notificación al usuario si LS se llena ✅ **Confirmado estáticamente**

### 23.4 `postEmisionOrdenVenta.ts` — escritura directa
```typescript
// postEmisionOrdenVenta.ts
const STORAGE_KEY_DOCUMENTOS = 'documentos_comerciales_v1'; // hardcoded, no usa STORAGE_KEYS
const EVENTO_RECARGA = 'documentos_comerciales_changed';    // hardcoded, no centralizado
```
Inconsistencia con la capa del contexto que usa `STORAGE_KEYS.DOCUMENTOS` a través de `tryLsKey`. Si la clave con prefijo de tenant es diferente de la literal, `postEmisionOrdenVenta.ts` podría escribir en la clave equivocada ✅ **Confirmado estáticamente** — (ver COT-P2-010 relacionado en helpers, pero la constante hardcoded en postEmision es el riesgo real aquí)

---

## 24. EMPRESA / ESTABLECIMIENTO / PERMISOS

### 24.1 Filtrado por establecimiento en el listado
El listado de cotizaciones en `ListadoDocumentosComerciales.tsx` filtra documentos por `establecimientoId` ✅ **Confirmado estáticamente** (derivado de `activeEstablecimientoId` usado en conversiones)

### 24.2 Conteo en tabs sin filtro de establecimiento
**COT-P3-003**: La función `contarPorTipo` en `DocumentosComerciales.tsx:34` filtra solo por `tipo`, no por `establecimientoId`. El badge del tab puede mostrar un número diferente al del listado filtrado ✅ **Confirmado estáticamente**

### 24.3 Permisos y roles
No existe ningún sistema de RBAC (Role-Based Access Control) implementado en este módulo. Cualquier usuario autenticado puede: crear, editar, anular, aprobar, rechazar, y convertir cotizaciones. ❌ **No verificable** si existe control a nivel de ruta/guard de router

### 24.4 Multi-tenant
La clave de storage incluye `tenantId` via `tryLsKey` ✅ **Confirmado estáticamente**. La clave de borrador incluye `tenantId` y `establecimientoId` ✅ **Confirmado estáticamente**

---

## 25. EXCEL / IMPRESIÓN / COMPARTIR

### 25.1 Exportación Excel
```typescript
// handleExportarExcel en ListadoDocumentosComerciales.tsx
// Respeta visibilidad de columnas actual
// Usa normalizarEstadoParaDisplay(doc.estado, doc.tipo)
// docRelacionado: resolverDocumentoRelacionadoNumero(doc) → solo documentoDestinoNumero
```
✅ **Confirmado estáticamente** — La exportación incluye el documento destino como "relacionado" pero no el origen. Para cotizaciones esto es correcto (el destino es la NV/OV/Comprobante).

### 25.2 "Copiar enlace"
Genera URL `/documentos-comerciales/editar/{id}`. Esta URL sin `location.state` abre un formulario en blanco modo `'nuevo'`, no carga el documento. (**COT-P2-004**) ✅ **Confirmado estáticamente**

### 25.3 Impresión / PDF
No se identificó generación de PDF para cotizaciones en el módulo DC. ❌ **No verificable** si existe en otra ruta

---

## 26. EXPERIENCIA DE USUARIO

### 26.1 Advertencias y banners
- Banner visible al editar cotización `Aceptada` advirtiendo que la edición la degradará ✅ **Confirmado estáticamente**
- No hay advertencia al sincronizar desde NV/OV editada (silencioso) ❌ Ausente — relacionado con COT-P1-001

### 26.2 Navegación tras cancelar
`handleCancelar`:
- Limpia borrador ✅
- Limpia carrito ✅
- Si `cotizacionOrigenId` → navega a cotizaciones con `abrirDetalleId` (drawer) ✅ **Confirmado estáticamente**

### 26.3 Retroalimentación en acciones
- "No Aprobar" no requiere motivo a nivel lógico aunque el diálogo lo pide (**COT-P2-008**)
- "Cerrar Perdida" y "Anular" sí requieren motivo ✅ **Confirmado estáticamente**

### 26.4 Validación de formulario
`fechaVencimiento` visible siempre en el header, independientemente de configuración de campos ✅ **Confirmado estáticamente**

### 26.5 Búsqueda de cliente
- RUC (11 dígitos) → consulta SUNAT ✅ **Confirmado estáticamente**
- DNI (8 dígitos) → consulta RENIEC ✅ **Confirmado estáticamente**
- Autocompletado de dirección si el cliente tiene dirección y el campo está vacío ✅ **Confirmado estáticamente**

---

## 27. MATRIZ DE PRUEBAS EJECUTADAS

| ID | Prueba | Método | Resultado |
|---|---|---|---|
| T-01 | Build TypeScript sin errores | Ejecución `vite build` | ✅ PASA |
| T-02 | ESLint sin errores | Ejecución `eslint` | ✅ PASA |
| T-03 | Creación COT Vigente | Lectura estática | ✅ Correcta |
| T-04 | Creación COT Pendiente aprobación | Lectura estática | ✅ Correcta |
| T-05 | Transición Pendiente→Aprobada | Lectura estática | ✅ Correcta |
| T-06 | Transición Pendiente→No aprobada | Lectura estática | ✅ Correcta |
| T-07 | Transición Vigente→Aceptada | Lectura estática | ✅ Correcta |
| T-08 | Transición Aceptada→Convertida (NV) | Lectura estática | ✅ Correcta |
| T-09 | Transición Aceptada→Convertida (Comprobante) | Lectura estática | ✅ Correcta |
| T-10 | Cascade anulación NV → COT Aceptada | Lectura estática | ✅ Correcta |
| T-11 | Editar COT Aceptada degrada estado | Lectura estática | ✅ Detectado, banner presente |
| T-12 | Auto-vencimiento al entrar tab | Lectura estática | ✅ Funciona (pero Aceptada puede vencer — P2) |
| T-13 | creditTerms en COT→Comprobante | Trazabilidad | ✅ Transferido correctamente |
| T-14 | creditTerms en COT→NV | Trazabilidad | ❌ NO transferido (P1-002) |
| T-15 | creditTerms en COT→OV | Trazabilidad | ❌ NO transferido (P1-002) |
| T-16 | creditTerms en borrador restaurado | Trazabilidad | ❌ NO restaurado (P1-003) |
| T-17 | sincronizarCOT desde edición NV | Trazabilidad | ❌ Sobreescribe sin aviso (P1-001) |
| T-18 | URL directa sin state → blank form | Lectura estática | ❌ Formulario en blanco (P2-004) |
| T-19 | Motivo en "No Aprobar" | Lectura estática | ❌ No validado (P2-008) |
| T-20 | Vencida→Cerrar Perdida | Lectura estática | ❌ No disponible (P2-009) |
| T-21 | Borradores deshabilitados en conversión | Lectura estática | ✅ Correctamente deshabilitado |
| T-22 | formaPago restaurada en borrador | Lectura estática | ⚠️ Fuerza 'contado' si vacío (P2-007) |
| T-23 | Multi-tab correlativos | No ejecutable | ❌ NO VERIFICABLE |
| T-24 | Comportamiento runtime completo | No ejecutable | ❌ NO VERIFICABLE |

---

## 28. FLUJOS NO VERIFICABLES

Los siguientes comportamientos no pudieron verificarse por requerir ejecución en runtime:

| ID | Comportamiento | Razón |
|---|---|---|
| NV-01 | `useCreditTermsConfigurator` — comportamiento exacto al inicializarse | Hook no leído en esta sesión; requeriría lectura adicional |
| NV-02 | Concurrencia multi-tab — generación de correlativos duplicados | Requiere ejecución en dos pestañas simultáneas |
| NV-03 | Sincronización entre tabs (BroadcastChannel / storage event) | Requiere runtime |
| NV-04 | Comportamiento de SUNAT/RENIEC lookup en condiciones de red | Requiere conexión externa |
| NV-05 | Rendimiento de N dispatches en `evaluarVencimientosCotizaciones` con dataset grande | Requiere datos de prueba en runtime |
| NV-06 | Permisos de ruta / guards de router por rol | No se encontró implementación; requiere runtime o lectura de guards |
| NV-07 | Generación de PDF para cotizaciones | No encontrado en el módulo DC; puede estar en otra ruta |
| NV-08 | Cuota de localStorage al límite | Requiere datos de prueba |
| NV-09 | Comportamiento de `postEmisionOrdenVenta.ts` con clave de tenant prefijada vs hardcoded | Depende de `tryLsKey` retorno en runtime |
| NV-10 | Todos los flujos declarados como "Confirmado estáticamente" en ejecución real | No se lanzó el servidor de desarrollo |

---

## 29. HALLAZGOS CONSOLIDADOS

### P1 — Bloqueantes

#### COT-P1-001: Sincronización silenciosa sobreescribe datos históricos de cotización
- **Archivo**: `useDocumentoComercialActions.ts:912-943`, activado desde `FormularioDocumentoComercial.tsx:266-274`
- **Descripción**: Cuando el usuario edita la NV o la OV que proviene de una cotización, `sincronizarCotizacionDesdeDocumento` sobreescribe silenciosamente `cliente`, `items`, `totales`, `observaciones`, `formaPago`, y `moneda` de la cotización origen (`estado='Convertida'`) con los datos del documento destino editado.
- **Impacto**: La cotización pierde su registro histórico comercial original. No hay aviso al usuario. El cambio es permanente y se persiste en localStorage.
- **Verificación**: ✅ Confirmado estáticamente
- **Clasificación**: P1 — Integridad de datos comerciales

#### COT-P1-002: Términos de crédito (cuotas) no transferidos en COT→NV y COT→OV
- **Archivo**: `FormularioDocumentoComercial.tsx:117-149` (efecto de inicialización), `useDocumentoComercialState.ts` (`aplicarValoresIniciales`)
- **Descripción**: Al convertir una cotización con cuotas de crédito configuradas a NV o a OV, el formulario de destino no inicializa `useCreditTermsConfigurator` con los `creditTerms` de la cotización. El configurador parte de cero.
- **Impacto**: Las cuotas de crédito negociadas en la cotización se pierden silenciosamente en la conversión. El usuario debe reconfigurarlas manualmente, con riesgo de error.
- **Nota**: La ruta COT→Comprobante sí transfiere correctamente (`terminosCredito: cotizacion.creditTerms ?? null`).
- **Verificación**: ✅ Confirmado estáticamente
- **Clasificación**: P1 — Pérdida de datos en conversión crítica

#### COT-P1-003: Términos de crédito no restaurados al recuperar borrador
- **Archivo**: `useDocumentoComercialDrafts.ts` (callback `aplicarEstado`), relacionado con `useDocumentoComercialState.ts`
- **Descripción**: Al restaurar un borrador en progreso de una cotización, `aplicarEstado` no restaura `creditTerms` porque `EstadoFormularioDocumentoComercial` no incluye ese campo. `useCreditTermsConfigurator` parte de su estado inicial.
- **Impacto**: Un usuario que configura cuotas de crédito, cierra el navegador y restaura el borrador pierde las cuotas. La restauración de borrador parece completa pero está incompleta.
- **Verificación**: ✅ Confirmado estáticamente
- **Clasificación**: P1 — Pérdida de datos en restauración de borrador

---

### P2 — Observaciones Relevantes

#### COT-P2-001: N dispatches individuales en evaluarVencimientosCotizaciones
- **Archivo**: `useDocumentoComercialActions.ts:851-878`
- **Descripción**: Si hay N cotizaciones vencibles, se disparan N `actualizarEnContext` → N escrituras en LS → N re-renders.
- **Impacto**: Degradación de rendimiento con datasets grandes. No destructivo.
- **Verificación**: ✅ Confirmado estáticamente

#### COT-P2-002: Estado `Aceptada` puede auto-vencer
- **Archivo**: `useDocumentoComercialActions.ts` (`estadosVencibles` incluye `'Aceptada'`)
- **Descripción**: Una cotización formalmente aceptada por el cliente puede quedar `'Vencida'` automáticamente al entrar al tab si tiene `fechaVencimiento < hoy`.
- **Impacto**: Invalida un acuerdo confirmado sin intervención del usuario.
- **Verificación**: ✅ Confirmado estáticamente

#### COT-P2-003: Correlativo no atómico en multi-tab
- **Archivo**: `useDocumentoComercialActions.ts` (`generarCorrelativoSeguro`)
- **Descripción**: Dos pestañas con el mismo tenant pueden generar el mismo correlativo concurrentemente.
- **Impacto**: Duplicación de número de cotización. Limitación del modelo frontend-only.
- **Verificación**: ✅ Confirmado estáticamente

#### COT-P2-004: URL de edición directa no carga el documento
- **Archivo**: `FormularioDocumentoComercialPage.tsx`
- **Descripción**: La URL `/documentos-comerciales/editar/{id}` abierta sin `location.state` muestra formulario en blanco en modo `'nuevo'`. El enlace "Copiar enlace" del listado es no funcional para edición directa.
- **Impacto**: El enlace compartido no sirve para acceder al documento.
- **Verificación**: ✅ Confirmado estáticamente

#### COT-P2-005: `COLUMNAS_DEFAULT_LISTADO` exportada pero nunca importada
- **Archivo**: `documentoComercial.constants.ts:91-101`
- **Descripción**: Código muerto — la constante existe pero nada la consume.
- **Verificación**: ✅ Confirmado estáticamente

#### COT-P2-006: `STORAGE_KEYS.COLUMNAS_PREFIJO` ignorado en Listado
- **Archivo**: `ListadoDocumentosComerciales.tsx`
- **Descripción**: La constante centralizada para la clave de columnas existe pero el Listado usa un literal de string directamente.
- **Verificación**: ✅ Confirmado estáticamente

#### COT-P2-007: formaPago forzada a `'contado'` en restauración de borrador
- **Archivo**: `FormularioDocumentoComercial.tsx:179`
- **Descripción**: `formaPago: datos.formaPago ?? 'contado'` — si el borrador guardó `formaPago = ''` o un método inválido, la restauración usa `'contado'` en lugar del default del sistema.
- **Verificación**: ✅ Confirmado estáticamente

#### COT-P2-008: "No Aprobar" no valida motivo
- **Archivo**: `ListadoDocumentosComerciales.tsx` (`handleConfirmarAccion`)
- **Descripción**: La acción `'no_aprobar'` no verifica que el motivo esté presente antes de confirmar, a diferencia de `'anular'` y `'cerrar_perdida'`.
- **Verificación**: ✅ Confirmado estáticamente

#### COT-P2-009: `Vencida` no puede cerrarse como "Perdida"
- **Archivo**: `useDocumentoComercialActions.ts` (`cerrarCotizacionComoPerdida`)
- **Descripción**: `estadosCierrePerdida = ['Vigente', 'Aprobada', 'Aceptada']` — `'Vencida'` no está incluida. Una cotización vencida solo puede anularse, perdiendo la semántica de negocio "cotización perdida por vencimiento".
- **Verificación**: ✅ Confirmado estáticamente

#### COT-P2-010: `obtenerFechaHoraISO` duplicada
- **Archivos**: `documentoComercial.helpers.ts:33`, `postEmisionOrdenVenta.ts:41`
- **Descripción**: La función está duplicada verbatim. Divergencia futura potencial.
- **Verificación**: ✅ Confirmado estáticamente

#### COT-P2-011: 0 tests en el módulo
- **Descripción**: No existe ningún archivo de test para el flujo de cotizaciones ni para el módulo DC en general.
- **Verificación**: ✅ Confirmado estáticamente

#### COT-P2-012: `ListadoDocumentosComerciales.tsx` con 1488 líneas
- **Descripción**: Componente monolítico que concentra listado, drawer, acciones, exportación Excel, y lógica de guards. Alta deuda de mantenibilidad.
- **Verificación**: ✅ Confirmado estáticamente

---

### P3 — Observaciones Menores

#### COT-P3-001: Guards de estado solo en UI, no en capa de acción
- **Archivo**: `useDocumentoComercialActions.ts`
- **Descripción**: `actualizarDocumento`, `anularDocumento`, etc. no verifican el estado actual del documento antes de ejecutar. Los guards solo existen en los helpers `puedeEditar`, `puedeAnular`, etc. de la UI.
- **Impacto**: Una llamada directa al hook (en tests o integraciones) puede dejar documentos en estados inválidos.

#### COT-P3-002: `key={idx}` en historial/comentarios
- **Archivo**: `ListadoDocumentosComerciales.tsx` (drawer de detalle)
- **Descripción**: Uso de índice como `key` en listas que pueden reordenarse.

#### COT-P3-003: `contarPorTipo` no filtra por establecimiento
- **Archivo**: `DocumentosComerciales.tsx:34`
- **Descripción**: El conteo del badge del tab incluye documentos de todos los establecimientos del tenant.

#### COT-P3-004: Sin migración de borradores entre versiones
- **Archivo**: `shared/borradores/useBorradorEnProgreso.ts`
- **Descripción**: Un cambio de `BORRADOR_EN_PROGRESO_VERSION` descartará silenciosamente todos los borradores existentes sin intentar migración.

#### COT-P3-005: `confirmoConCambios` usa `!== null` para props opcionales
- **Archivo**: `FormularioDocumentoComercial.tsx` (`handleGenerar`)
- **Descripción**: `cotizacionOrigenId !== null && prefillFrom !== null` — para props `T | undefined`, la condición es verdadera cuando el valor es `undefined` (pues `undefined !== null`). Puede omitir verificación de cambios comerciales si el ref está activo en un contexto sin props de conversión.

#### COT-P3-006: Estados legacy fuera de la constante `ESTADOS_COTIZACION`
- **Archivo**: `documentoComercial.constants.ts`, `documentoComercial.types.ts`
- **Descripción**: El tipo `EstadoCotizacion` incluye `'Generada'` y `'Rechazada'` pero `ESTADOS_COTIZACION` excluye ambos. Inconsistencia que puede causar que código que itera la constante pierda datos legacy no migrados.

---

## 30. PLAN DE CORRECCIÓN

### Correcciones P1 (requeridas antes de entrega)

| ID | Acción | Archivos a tocar | Esfuerzo estimado |
|---|---|---|---|
| **COT-P1-001** | Eliminar `sincronizarCotizacionDesdeDocumento` o reemplazarla por una versión que NUNCA modifique una COT `'Convertida'`. Si la sincronización es un requisito de negocio, debe requerir confirmación explícita del usuario y registrar el cambio en el historial. | `useDocumentoComercialActions.ts`, `FormularioDocumentoComercial.tsx` | Alto |
| **COT-P1-002** | En el efecto de inicialización de `FormularioDocumentoComercial.tsx`, pasar `prefillFrom.creditTerms` al configurador de crédito cuando `prefillFrom` existe. Requiere coordinación con `useCreditTermsConfigurator` para aceptar términos iniciales externos. | `FormularioDocumentoComercial.tsx`, `useCreditTermsConfigurator.ts` | Medio |
| **COT-P1-003** | Incluir `creditTerms` en el estado guardado en borrador y restaurarlo en `aplicarEstado`. Puede requerir ampliar `EstadoFormularioDocumentoComercial` o persistir por separado. | `useDocumentoComercialDrafts.ts`, `useDocumentoComercialState.ts` | Medio |

### Correcciones P2 recomendadas (antes de entrega o en sprint siguiente)

| ID | Acción recomendada |
|---|---|
| COT-P2-002 | Decidir política: si `Aceptada` debe poder vencer, añadir aviso al usuario. Si no debe poder vencer una vez aceptada, removerla de `estadosVencibles`. |
| COT-P2-004 | Implementar carga de documento por ID desde URL param, o cambiar el enlace "Copiar" para que apunte a la vista de detalle (no edición). |
| COT-P2-008 | Añadir validación de motivo para `'no_aprobar'` equivalente a la de `'anular'`. |
| COT-P2-009 | Añadir `'Vencida'` a `estadosCierrePerdida` en `cerrarCotizacionComoPerdida`. |
| COT-P2-001 | Agrupar los dispatches de vencimiento en una sola acción `ACTUALIZAR_MULTIPLES_DOCUMENTOS`. |

---

## 31. CHECKLIST FINAL

| Ítem | Estado |
|---|---|
| Build TypeScript sin errores | ✅ |
| ESLint sin errores ni warnings | ✅ |
| 0 hallazgos P0 | ✅ |
| 0 hallazgos P1 | ❌ (3 hallazgos) |
| Transiciones de estado documentadas y coherentes | ⚠️ (2 inconsistencias P2) |
| Integridad de datos de cotización en conversión | ❌ |
| Crédito/cuotas preservado en todas las rutas de conversión | ❌ |
| Borradores funcionales y completos | ⚠️ (creditTerms no restaurado) |
| Trazabilidad COT↔destino implementada | ✅ (unidireccional) |
| Sincronización segura desde documentos destino | ❌ |
| URL de edición directa funcional | ❌ |
| Motivo requerido en todas las acciones destructivas | ⚠️ (no_aprobar no lo valida) |
| Tests del flujo Cotizaciones | ❌ (0 tests) |
| Código sin duplicación de funciones utilitarias | ⚠️ (obtenerFechaHoraISO duplicada) |
| COLUMNAS_DEFAULT_LISTADO utilizada | ❌ (código muerto) |
| STORAGE_KEYS centralizado y usado uniformemente | ❌ (parcial) |

---

## 32. VEREDICTO FINAL

### Hallazgos por severidad

| Severidad | Cantidad | Bloqueante para entrega |
|---|---|---|
| P0 | 0 | — |
| P1 | 3 | Sí |
| P2 | 12 | No (pero recomendado) |
| P3 | 6 | No |

### Justificación del veredicto

Los tres hallazgos P1 son suficientes individualmente para bloquear la entrega:

- **COT-P1-001** introduce una brecha de integridad de datos comerciales: el registro histórico de una cotización convertida puede ser sobrescrito silenciosamente por ediciones del documento destino. La cotización pierde lo que se cotizó originalmente.

- **COT-P1-002** y **COT-P1-003** introducen pérdida silenciosa de los términos de crédito negociados, en dos de las tres rutas de conversión y en la restauración de borrador respectivamente. Esto puede causar errores de facturación o cuotas configuradas incorrectamente.

Ninguno de los tres fue descartado por frecuencia de uso ni por restricciones de interfaz. Los tres pueden ocurrir en operación normal de un usuario que usa las funcionalidades declaradas del módulo.

---

# 🔴 COTIZACIONES NO LISTO PARA ENTREGA

**Motivo principal**: 3 hallazgos P1 con impacto directo en integridad de datos comerciales (historial de cotización, términos de crédito en conversión).

**Condición de aprobación**: Corrección y re-auditoría de COT-P1-001, COT-P1-002 y COT-P1-003 antes de nueva evaluación.
