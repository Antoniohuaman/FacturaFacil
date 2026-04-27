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
- venta_completada
- primera_venta_completada
- producto_creado_exitoso
- cliente_creado_exitoso
- importacion_completada

## Exclusiones de privacidad

No capturar RUC, razón social, nombres, correos, teléfonos, direcciones, datos bancarios ni textos libres.
