# Remediación UX — Formulario compartido "Registrar pago"

**Alcance:** capacidad transversal de registro de pago (`FormularioPagoCompra.tsx` + `useFormularioPagoCompra.ts`), reutilizada sin cambios estructurales por Compras y por Gastos. Un solo formulario, un solo motor — esta remediación es exclusivamente visual/de jerarquía; no se tocó CxP, Pago, Caja, series, medios de pago, cuentas bancarias, cuotas, idempotencia, reversión ni ninguna validación de dominio.

---

## 1. Consumidores identificados

- `PaginaRegistrarPagoCompra.tsx` (Compras) — 1 o varios documentos del mismo proveedor y moneda (selector previo `BuscadorDocumentoOrigenPago`, o acceso directo desde una CxP puntual).
- `PaginaRegistrarPagoGasto.tsx` (Gastos) — siempre exactamente 1 CxP (un gasto = una obligación).

Ambos inyectan `dependencias.registrarPago` (comando propio de su contexto) y `metadatosOrigen` (breadcrumb/título contextual, ya existente antes de esta tarea). Ningún consumidor adicional del formulario existe en el código.

---

## 2. Estado inicial (antes de tocar nada)

Revisado el hook completo, el formulario completo, `EditorMediosPagoCompra.tsx`, `TablaDocumentosPagoCompra.tsx`, `ResumenPagoCompra.tsx` y los dos puntos de entrada. Ya estaba correctamente resuelto y **no se tocó**:

- `EditorMediosPagoCompra.tsx`: los campos bancarios (cuenta + N° operación) ya solo aparecen si el medio elegido lo requiere (`esMedioBancario`/`requiereReferencia`); un solo medio ya se siente simple (fila compacta medio+importe, sin campos extra); "Agregar medio" es explícito y opcional.
- `TablaDocumentosPagoCompra.tsx`: "Documento a pagar" ya es una fila compacta por documento (condición, vencimiento, saldo, importe a aplicar, saldo resultante); las cuotas reales ya se muestran con fecha formateada `DD/MM/AAAA` y la columna "Días de atraso" (renombrada en una remediación anterior de los componentes compartidos de crédito).
- Mensaje de éxito: ya contextual ("Pago {número} registrado correctamente. Caja actualizada.") — no duplica ni compite con el toast interno de Caja.
- Fecha de pago: ya visible y editable desde el primer momento, nunca oculta.

Problemas UX confirmados (los que sí se corrigieron):

- "Tipo de documento = Pago", "Serie PG" y "Próximo número" ocupaban 2 filas de 2 columnas con el MISMO peso visual que "Fecha de pago"/"Moneda"/"Total a pagar" — el número de pago, además, ya se repetía en la cabecera de la página (badge azul), así que en el cuerpo era pura redundancia.
- No existía un elemento "Importe a pagar" prominente junto al medio de pago — el importe solo se veía como una caja gris más entre otras seis.
- El resumen (`ResumenPagoCompra`) mostraba siempre 5 filas con el mismo peso, incluida "Diferencia S/ 0.00" cuando no había ninguna diferencia real.
- "Medios registrados" era un nombre ambiguo para un monto total (no una cantidad).
- El importe/saldo se repetía tres veces con etiquetas distintas: la caja "Total a pagar" del cuerpo, "Importe aplicado"/"Saldo resultante" del resumen, y "Total"/"Saldo resultante" del footer.
- "Concepto (opcional)" no aclaraba qué se espera escribir ahí (se confirmó que sí tiene función real — ver §4).

---

## 3. Nueva jerarquía visual

1. **Documento a pagar** (o "Documentos a pagar" si son varios — nunca por origen, por cantidad real) — sin cambios, ya compacto.
2. **Importe a pagar**, ahora destacado (fondo azul claro, tipografía mayor) justo encima del editor de medios de pago — lo primero que se lee en la sección "Datos del pago".
3. **Medio de pago** — sin cambios (ya simple por defecto, campos bancarios condicionales).
4. **Fecha de pago | Moneda** — agrupados en una fila; moneda secundaria pero visible (no editable, viene de la obligación).
5. Tipo de cambio — igual que antes, solo si la moneda difiere de la base.
6. **Línea discreta** "Pago · Serie {serie} · {próximo número}" — información técnica/automática, ya no compite visualmente con lo anterior.
7. **Nota del pago (opcional)** — antes "Concepto (opcional)", con placeholder que aclara qué escribir.
8. Doc. sustentatorio (tras "+ Campos") — sin cambios, ya progresivo.
9. Observaciones — sin cambios, colapsadas por defecto.
10. Adjuntos — sin cambios, ya compacto (una fila tipo+botón+límites; vacío = una línea de texto).
11. **Resumen**, simplificado: "Saldo después del pago" como única fila principal; "Saldo inicial" y "Total en medios" como contexto secundario (el segundo solo si hay más de un medio); "Diferencia" solo si es distinta de cero.
12. **Footer**: una sola síntesis compacta — "Pago: S/X · Saldo después del pago: S/Y" — nunca una tarjeta completa repetida.

---

## 4. Qué se simplificó (y por qué)

- **Serie PG / Tipo de documento / Próximo número**: agrupados en una línea discreta de texto, sin inputs ni cajas grises con el mismo peso que Importe/Medio de pago. Nunca hubo (ni hay ahora) un selector real de serie: el hook siempre toma la única serie PG activa (`config.series.find(...)`), así que degradar su protagonismo no oculta ninguna decisión que el usuario debiera tomar (§8: "si solo existe una serie aplicable, reducir protagonismo" — exactamente ese caso). El número de pago sigue visible en la cabecera de la página.
- **Resumen**: de 5 filas siempre visibles a 1 fila principal + hasta 2 de contexto + 1 de alerta condicional. "Diferencia S/ 0.00" nunca se muestra — la validación que exige que coincida con cero sigue intacta y sigue bloqueando el registro (`erroresPorCampo.diferencia`), solo cambió si se repite un resultado que ya cuadra.
- **"Medios registrados" → "Total en medios"**: mismo dato (suma de los montos de cada medio), nombre que ya no sugiere una cantidad de líneas. Además, deja de mostrarse cuando solo hay un medio (ahí siempre coincide con el importe a pagar — no aporta).
- **Triple repetición del importe/saldo**: resuelta. Ahora "Importe a pagar" vive una sola vez (cuerpo, junto a medios); "Saldo después del pago" vive una sola vez (resumen); el footer combina ambos en una sola línea de síntesis, como ya pedía el propio patrón de `DocumentFormFooter`.
- **"Concepto (opcional)" → "Nota del pago (opcional)"**: se investigó su función real antes de decidir (ver tabla abajo) — tiene uso real, así que se mantuvo el campo y solo se aclaró el label/placeholder. No se tocó el modelo (`PagoCompra.concepto` sin cambios).

### Investigación del campo "Concepto/Nota del pago"

| Pregunta | Respuesta |
|---|---|
| ¿Dónde se persiste? | `PagoCompra.concepto` (campo ya existente, sin cambios) |
| ¿Dónde se muestra? | `PanelDetallePagoCompra.tsx` (detalle de pago en Compras), `TablaPagosCompra.tsx` (columna), impresión (`servicioPagoCompra.ts`) |
| ¿Se usa en historial/exportación/impresión? | Sí, en impresión de Compras. En Gastos, además, si el usuario lo completa, se usa como concepto del propio movimiento de Caja (en vez del genérico "Pago de gasto: …") |
| ¿Tiene valor distinto al concepto del documento origen? | Sí — el concepto del Gasto/Comprobante ya existe por separado; este campo es una nota específica de ESTE pago (relevante sobre todo con pagos parciales/múltiples) |

Conclusión: función real confirmada → se mantuvo, solo se renombró.

---

## 5. Compras

Sin cambios de comportamiento. Mismo hook, misma validación, mismo comando (`registrarPagoCompra`). Verificado con la suite existente: pago total, parcial, cuotas (`CreditInstallmentsTable` en modo `allocation`), varios documentos del mismo proveedor, efectivo, transferencia — todos los escenarios pasan igual que antes del cambio visual.

## 6. Gastos

Sin cambios de comportamiento. `PaginaRegistrarPagoGasto.tsx` no se tocó — sigue delegando 100% en el mismo componente (`cxps={[cxp]}`, `dependencias.registrarPago = registrarPagoGastoCentral`). La restricción propia de Gastos (bloqueo de efectivo en moneda extranjera, GAS-P1-004, vía `validarRestriccionesOrigen`) sigue intacta y se sigue mostrando en el mismo lugar (banner rojo bajo los errores generales).

## 7. Arquitectura — confirmación expresa

- Sigue existiendo **un solo** formulario compartido (`FormularioPagoCompra.tsx`) y **un solo** hook (`useFormularioPagoCompra.ts`). No existe ni se creó `FormularioPagoGasto`.
- CxP, Pago, saldo: siguen siendo únicos, sin segunda fuente de verdad.
- Caja sigue bloqueante (misma validación de `estadoCaja`/permiso, sin cambios).
- Cuotas: mismo motor (`CreditInstallmentsTable` en modo `allocation`), mismas reglas.
- Idempotencia y reversión: sin cambios (`claveIdempotencia`, mismo ciclo de vida).
- Series (PG), medios de pago (`PAYMENT_MEANS_CATALOG`), `BankAccount`: siguen siendo las mismas fuentes centrales, sin duplicación.
- Multiempresa: sin cambios (el hook no tiene ninguna noción de tenant propia; hereda la del contexto inyectado).
- El único `if (tipoOrigen === 'gasto')` que existe en todo el flujo (`TablaDocumentosPagoCompra.tsx`, para presentar el número de documento de origen — un Comprobante de Compra numera distinto que un Gasto) es **preexistente**, está **centralizado en un solo lugar** (no disperso) y representa una diferencia de datos genuina, no artificial. No se introdujo ningún ternario de origen nuevo en esta remediación.

---

## 8. Archivos modificados

- `apps/senciyo/src/pages/Private/features/compras/componentes/formularios/FormularioPagoCompra.tsx`
- `apps/senciyo/src/pages/Private/features/compras/componentes/pagos/ResumenPagoCompra.tsx`
- Nuevo: `docs/REMEDIACION_UX_FORMULARIO_PAGO_COMPARTIDO.md`

Ningún otro archivo requirió cambios (`useFormularioPagoCompra.ts`, `EditorMediosPagoCompra.tsx`, `TablaDocumentosPagoCompra.tsx`, `PaginaRegistrarPagoCompra.tsx`, `PaginaRegistrarPagoGasto.tsx` — todos revisados, ya conformes o sin necesidad de tocar para este objetivo).

---

## 9. Pruebas

Sin tests nuevos — cambio puramente de presentación (labels, agrupación visual, ocultar una fila cuando su valor no aporta), sin comportamiento condicional de dominio nuevo que amerite una prueba aislada (el proyecto no tiene infraestructura de tests de componente/UI). Se ejecutó la suite completa existente para confirmar cero regresiones:

```
npx vitest run src/pages/.../compras src/pages/.../gastos src/pages/.../control-caja src/shared/payments
→ 23 test files, 509 tests passed (incluye pago total/parcial, cuotas, múltiples documentos, efectivo, transferencia, anulación, Caja, idempotencia)

npx vitest run (suite completa)
→ 97 test files, 2048 tests passed
```

## 10. Verificación

```
TypeScript:  npx tsc -b → 0 errores
ESLint:      npx eslint . → 0 errores, 0 warnings
Build:       npm run build → exitoso
```

## 11. Limpieza

0 hardcodes nuevos · 0 `any` · 0 `@ts-ignore` · 0 `eslint-disable` · 0 TODO/FIXME · 0 `console.log` · 0 código muerto · 0 imports sin uso (se retiró `importeAplicado` de `ResumenPagoCompraProps` al dejar de usarse tras simplificar el resumen) · 0 duplicaciones · 0 ternarios de origen nuevos · 0 warnings.
