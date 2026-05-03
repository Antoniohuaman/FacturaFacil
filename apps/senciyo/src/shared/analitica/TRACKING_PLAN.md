# Tracking Plan – SenciYo

## 1. Objetivo

Este documento define los eventos adicionales y las reglas de evolucion de la analitica de producto de SenciYo.

El README tecnico de esta carpeta documenta lo que ya esta implementado hoy en codigo. Este tracking plan no duplica ese contenido. Su funcion es dejar definidos:

- los eventos adicionales pendientes de instrumentacion que forman parte del plan oficial de producto,
- los ajustes aprobados sobre eventos existentes,
- las exclusiones de instrumentacion,
- los criterios obligatorios para pasar eventos al codigo,
- y la relacion esperada entre estos eventos y los dashboards de producto.

## 2. Alcance

Este documento cubre exclusivamente:

- eventos adicionales definidos para completar la analitica global del producto,
- ajustes aprobados sobre eventos existentes,
- exclusiones oficiales de instrumentacion,
- criterios obligatorios para pasar eventos al codigo,
- relacion con dashboards de producto.

Los eventos ya implementados actualmente se mantienen documentados en el README tecnico de analitica. Este documento los complementa y no los repite.

## 3. Principios obligatorios de medicion

- Medir hitos de negocio, no clicks sueltos.
- Medir valor real, friccion real y uso recurrente.
- No crear eventos por cada pantalla, boton o pestana.
- Las variantes van como propiedades, no como eventos separados.
- Todo payload debe enviarse en snake_case.
- El unico entorno analitico permitido es `entorno = demo | produccion`.
- No enviar PII ni datos sensibles.
- No enviar RUC, razon social, nombre comercial, nombres personales, correos, telefonos, direcciones, textos libres, observaciones, payload tributario ni montos exactos salvo justificacion explicita aprobada.
- No implementar eventos de modulos inexistentes.
- Un evento solo pasa al codigo cuando exista el modulo, el flujo real y el punto de disparo confiable.
- Todo evento debe responder una pregunta concreta de producto.

## 3.1 Regla temporal del prototipo funcional

Este repo es un prototipo funcional. Algunos eventos ya implementados pueden seguir activos para validar la instrumentacion actual aunque hoy dependan de `sessionStorage`, stores locales, mocks o flujos simulados.

En esos casos aplican estas reglas:

- el evento no debe presentarse como verdad final de backend,
- la documentacion debe explicitar la fuente provisional,
- y el repositorio oficial debe reemplazar el disparo por una confirmacion real de backend o API.

Hoy aplica a:

- `primera_venta_completada`, que en emision y POS se deduplica por sesion del navegador.
- `comprobante_estado_actualizado` con `estado = aceptado`, que hoy depende de la transicion mock del flujo OSE.
- `caja_abierta_exitoso`, `movimiento_caja_registrado` y `caja_cerrada_exitoso`, mientras caja siga operando con simulacion frontend.
- `producto_creado_exitoso` e `importacion_completada` para `entidad = productos`, mientras el catalogo siga dependiendo de store/local persistence.

## 4. Eventos adicionales definidos

Los siguientes son los unicos eventos adicionales definidos para la evolucion de la analitica global del producto. No deben agregarse al codigo hasta que el modulo y el flujo real existan y el punto de disparo sea confiable.

| Evento | Area / modulo | Objetivo | Cuando se debe disparar | Propiedades obligatorias | Pregunta de producto que responde |
|---|---|---|---|---|---|
| `cobranza_registrada` | Cobranzas / comprobantes / caja | Medir cobros efectivos y evolucion de cuentas por cobrar | Cuando una cobranza se registra correctamente y queda persistida | `origen_cobranza`, `medio_pago`, `estado_cuenta_resultante`, `tiene_caja_asociada` | ¿Como evoluciona la adopcion de cobranzas y desde que flujo se concretan los cobros? |
| `ajuste_stock_registrado` | Inventario | Medir correcciones operativas de stock | Cuando un ajuste de stock se confirma correctamente | `tipo_ajuste`, `origen`, `cantidad_items_rango` | ¿Con que frecuencia el producto requiere ajustes de stock y desde que origen operativo ocurren? |
| `transferencia_stock_completada` | Inventario | Medir movimiento real de stock entre ubicaciones | Cuando una transferencia de stock se completa correctamente | `origen`, `cantidad_items_rango`, `intra_establecimiento` | ¿Existe operacion real de transferencia de stock y con que nivel de complejidad? |
| `documento_comercial_creado_exitoso` | Documentos comerciales | Hacer visible el uso de cotizaciones y notas de venta | Cuando una cotizacion o nota de venta se crea correctamente | `tipo_documento`, `origen` | ¿Que nivel de adopcion tienen los documentos comerciales previos a la venta final? |
| `reporte_exportado` | Reportes / modulos exportables | Medir salida de informacion con valor de negocio | Cuando una exportacion se completa correctamente | `modulo`, `formato` | ¿Que modulos generan valor de consulta y extraccion de datos para el usuario? |
| `usuario_creado_exitoso` | Configuracion / usuarios y roles | Medir adopcion multiusuario | Cuando un usuario interno queda creado correctamente | `rol_base`, `tiene_establecimiento_asignado` | ¿El producto esta siendo adoptado de forma individual o colaborativa? |
| `error_operacion_detectado` | Transversal / errores controlados | Medir friccion operativa clasificada con valor de producto | Cuando ocurre un error controlado, clasificado y relevante para producto | `modulo`, `flujo`, `tipo_error`, `severidad` | ¿En que flujos existe friccion real y cual es su severidad operativa? |

Aclaracion obligatoria para `error_operacion_detectado`:

- No reemplaza logs tecnicos.
- No debe enviar mensajes libres de error, stack traces, payloads completos ni datos sensibles.
- Debe usarse solo para errores controlados y clasificados con valor de producto.

## 5. Ajustes definidos sobre eventos existentes

Los siguientes ajustes estan definidos sobre eventos existentes. No requieren crear eventos nuevos. Se implementaran como propiedades adicionales cuando el flujo real permita llenarlas con datos confiables.

| Evento existente | Ajuste definido | Objetivo | Condicion para implementarlo |
|---|---|---|---|
| `venta_completada` | Agregar `tipo_comprobante`, `documento_origen`, `cobranza_inmediata` | Mejorar la lectura del tipo de venta, su procedencia y si el cobro quedo resuelto en el mismo flujo | Cuando el flujo entregue estos datos de forma real y consistente |
| `primera_venta_completada` | Agregar `tipo_comprobante`, `documento_origen` | Mejorar el analisis de activacion y tiempo a primer valor | Cuando la primera venta pueda clasificarse sin inferencias fragiles |
| `movimiento_caja_registrado` | Agregar `origen_operacion` | Distinguir mejor movimientos manuales de movimientos originados por ventas o cobranzas | Cuando el origen operativo del movimiento sea identificable de forma confiable |
| `caja_cerrada_exitoso` | Agregar `resultado_cierre`, `descuadre_rango` | Medir calidad operativa del cierre y no solo su ocurrencia | Cuando el flujo de cierre produzca esta clasificacion en rangos seguros |
| `borrador_accion_realizada` | Agregar `modulo`, `tipo_documento` y usar `accion = reanudado` cuando exista flujo real de reanudacion | Hacer trazable el uso transversal de borradores sin crear eventos paralelos | Cuando exista un flujo real de reanudacion y el contexto del borrador sea consistente |
| `ayuda_consultada` | Agregar `modulo`, `recurso` o `tour_id` cuando aplique | Distinguir mejor que superficie de ayuda aporta valor | Cuando la ayuda exponga referencias estables y reutilizables |

## 6. Criterios obligatorios para pasar un evento al codigo

Un evento solo puede pasar del tracking plan al codigo cuando cumpla todos estos criterios:

1. El modulo existe.
2. El flujo real existe.
3. El punto de disparo es claro y confiable.
4. El evento representa valor real, friccion real o uso recurrente.
5. El payload se puede llenar con datos reales.
6. No requiere datos sensibles.
7. Se puede validar en staging o produccion.
8. La pregunta de producto no puede resolverse mejor con un evento existente y propiedades.

Si uno de estos criterios no se cumple, el evento no debe implementarse todavia en codigo.

## 7. Exclusiones de instrumentacion

Las siguientes reglas son obligatorias para la evolucion de la analitica de producto:

- No instrumentar vistas de pantalla como eventos core.
- No instrumentar clicks sueltos.
- No instrumentar botones, tabs o navegacion simple.
- No duplicar eventos por estados que ya son propiedades.
- No duplicar eventos por forma de pago.
- No instrumentar configuracion SUNAT ni credenciales tributarias como eventos de producto.
- No instrumentar edicion simple de cliente o producto como evento core.
- No instrumentar eventos que envien PII o datos sensibles.
- No instrumentar eventos tecnicos internos como KPIs de producto.

Equivalencias correctas de instrumentacion:

- Estados de comprobante: se miden con `comprobante_estado_actualizado.estado`, no con eventos separados como `comprobante_aceptado` o `comprobante_rechazado`.
- Forma de pago: se mide con `venta_completada.forma_pago`, no con eventos separados como `venta_contado_registrada` o `venta_credito_registrada`.
- Modulo de origen: debe modelarse como propiedad especifica del evento, no como evento por pantalla o vista de modulo.
- Errores: deben modelarse con `error_operacion_detectado` solo cuando sean controlados, clasificados y utiles para producto.
- Configuracion SUNAT: no debe instrumentarse como evento de producto; la medicion debe centrarse en la operacion real mediante ventas, comprobantes y estados.

## 8. Relacion con dashboards de producto

Los dashboards de producto deben construirse sobre eventos de negocio y propiedades estables. Deben responder, como minimo, estas preguntas:

- ¿Cual es el tiempo a primera venta?
- ¿Cual es el nivel de uso recurrente del producto?
- ¿Que modulos muestran mayor adopcion?
- ¿En que flujos existe mayor friccion?
- ¿Como evolucionan los estados de comprobante?
- ¿Que tan operativa es la caja?
- ¿Como evoluciona la adopcion de cobranzas cuando exista el evento?
- ¿Como evoluciona la adopcion de inventario cuando existan los eventos?
- ¿Como evoluciona la adopcion de documentos comerciales cuando exista el evento?
- ¿Que valor generan los reportes y exportaciones?
- ¿Que errores operativos controlados aparecen con mayor frecuencia?

Reglas para dashboards:

- No incluir eventos automaticos de Amplitude como parte del dashboard principal de producto.
- No incluir eventos tecnicos internos como parte del dashboard principal de producto.
- Priorizar analisis de activacion, recurrencia, friccion y valor operativo real.

## 9. Conclusion

Los eventos implementados actuales quedan documentados en el README tecnico de analitica.

Este documento define los eventos adicionales y las reglas de evolucion de la analitica de producto.

Los 7 eventos adicionales definidos cubren las brechas funcionales principales sin inflar el contrato con eventos innecesarios.

No se deben crear mas eventos salvo que exista una nueva pregunta de producto que no pueda resolverse con los eventos definidos y sus propiedades.