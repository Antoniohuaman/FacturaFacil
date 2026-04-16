-- Superficie de lectura unificada para la API de retroalimentacion.
-- Mantiene intactas las tablas de escritura y expone un shape comun para consumidores externos.

create or replace view public.v_retroalimentacion_unificada as
  select
    'estado_animo'::text as tipo,
    'estado_animo:' || e.id::text as registro_uid,
    e.id,
    e.created_at,
    e.usuario_id,
    e.usuario_nombre,
    e.empresa_id,
    e.empresa_nombre,
    e.establecimiento_id,
    e.establecimiento_nombre,
    e.modulo,
    e.ruta,
    e.opcion_estado_animo as valor_principal,
    e.comentario_opcional as detalle,
    null::smallint as puntaje,
    e.opcion_estado_animo as estado_animo
  from public.retroalimentacion_estado_animo e

  union all

  select
    'idea'::text as tipo,
    'idea:' || i.id::text as registro_uid,
    i.id,
    i.created_at,
    i.usuario_id,
    i.usuario_nombre,
    i.empresa_id,
    i.empresa_nombre,
    i.establecimiento_id,
    i.establecimiento_nombre,
    i.modulo,
    i.ruta,
    i.contenido_idea as valor_principal,
    null::text as detalle,
    null::smallint as puntaje,
    null::text as estado_animo
  from public.retroalimentacion_ideas i

  union all

  select
    'calificacion'::text as tipo,
    'calificacion:' || c.id::text as registro_uid,
    c.id,
    c.created_at,
    c.usuario_id,
    c.usuario_nombre,
    c.empresa_id,
    c.empresa_nombre,
    c.establecimiento_id,
    c.establecimiento_nombre,
    c.modulo,
    c.ruta,
    c.puntaje::text as valor_principal,
    c.comentario_opcional as detalle,
    c.puntaje,
    null::text as estado_animo
  from public.retroalimentacion_calificaciones c;

comment on view public.v_retroalimentacion_unificada is
  'Vista canonica para lectura unificada de retroalimentacion desde API, dashboards e integraciones futuras.';

comment on column public.v_retroalimentacion_unificada.registro_uid is
  'Identificador unificado compuesto por tipo e id para consumidores de lectura.';

comment on column public.v_retroalimentacion_unificada.valor_principal is
  'Valor principal uniforme del registro: estado_animo, texto de idea o puntaje como texto.';

comment on column public.v_retroalimentacion_unificada.detalle is
  'Detalle secundario del registro, normalmente comentario opcional cuando aplica.';