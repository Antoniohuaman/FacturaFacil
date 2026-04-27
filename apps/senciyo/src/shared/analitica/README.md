# Analítica de hitos (frontend)

Esta carpeta centraliza la analítica del frontend con enfoque en hitos de negocio.

## Principios

- Solo se registran hitos (acciones completas), no clicks sueltos.
- No se envían eventos en entorno local o desarrollo.
- Si PostHog no está inicializado, la capa es no-op.
- No se captura PII.

## Eventos disponibles

- registro_usuario_completado
- registro_empresa_exitoso
- inicio_sesion_exitoso
- caja_abierta_exitoso
- movimiento_caja_registrado
- caja_cerrada_exitoso
- flujo_venta_abandonado: `origen_venta`, `motivo_abandono?`
- comprobante_estado_actualizado: `estado`, `tipo_comprobante?`, `forma_pago?`, `origen_venta?`
- ayuda_consultada: `tipo_ayuda`, `origen`
- borrador_accion_realizada: `accion`, `origen_venta?`
- venta_completada: `entorno`, `origenVenta`, `forma_pago?`
- primera_venta_completada: `entorno`, `origenVenta`, `forma_pago?`
- producto_creado_exitoso
- cliente_creado_exitoso
- importacion_completada

## Exclusiones de privacidad

No capturar RUC, razón social, nombres, correos, teléfonos, direcciones, datos bancarios ni textos libres.
