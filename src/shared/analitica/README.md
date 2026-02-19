# Analítica de hitos (frontend)

Esta carpeta centraliza la analítica del frontend con enfoque en hitos de negocio.

## Principios

- Solo se registran hitos (acciones completas), no clicks sueltos.
- No se envían eventos en entorno local o desarrollo.
- Si PostHog no está inicializado, la capa es no-op.
- No se captura PII.

## Eventos disponibles

- inicio_sesion_exitoso
- venta_iniciada
- venta_completada
- primera_venta_completada
- ruc_actualizado_exitoso
- pase_a_produccion_iniciado
- pase_a_produccion_completado
- certificado_digital_activado
- producto_creado_exitoso
- cliente_creado_exitoso
- importacion_completada
- caja_abierta_exitoso
- caja_cerrada_exitoso
- modulo_visitado
- bloqueo_mostrado
- error_critico

## Exclusiones de privacidad

No capturar RUC, razón social, nombres, correos, teléfonos, direcciones, datos bancarios ni textos libres.
