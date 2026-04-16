-- Persistencia inicial de retroalimentación para SenciYo.
-- Esta fase cubre únicamente estado de ánimo, ideas y calificaciones.
-- No incluye RLS, triggers ni automatismos adicionales.

create table if not exists public.retroalimentacion_estado_animo (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  usuario_id text not null,
  usuario_nombre text not null,
  empresa_id text not null,
  empresa_nombre text not null,
  establecimiento_id text,
  establecimiento_nombre text,
  modulo text not null,
  ruta text not null,
  opcion_estado_animo text not null check (opcion_estado_animo in ('excelente', 'bien', 'neutral', 'agotado', 'frustrado')),
  comentario_opcional text check (comentario_opcional is null or char_length(comentario_opcional) <= 140)
);

comment on table public.retroalimentacion_estado_animo is 'Registra el estado de ánimo diario enviado desde SenciYo.';
comment on column public.retroalimentacion_estado_animo.modulo is 'Primer segmento lógico de la ruta desde donde se envió la retroalimentación.';
comment on column public.retroalimentacion_estado_animo.ruta is 'Ruta completa del frontend al momento del envío.';

create index if not exists idx_retro_estado_animo_created_at
  on public.retroalimentacion_estado_animo (created_at desc);

create index if not exists idx_retro_estado_animo_empresa_id
  on public.retroalimentacion_estado_animo (empresa_id);


create table if not exists public.retroalimentacion_ideas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  usuario_id text not null,
  usuario_nombre text not null,
  empresa_id text not null,
  empresa_nombre text not null,
  establecimiento_id text,
  establecimiento_nombre text,
  modulo text not null,
  ruta text not null,
  contenido_idea text not null check (char_length(trim(contenido_idea)) between 1 and 280)
);

comment on table public.retroalimentacion_ideas is 'Guarda ideas o sugerencias de producto enviadas desde SenciYo.';

create index if not exists idx_retro_ideas_created_at
  on public.retroalimentacion_ideas (created_at desc);

create index if not exists idx_retro_ideas_empresa_id
  on public.retroalimentacion_ideas (empresa_id);


create table if not exists public.retroalimentacion_calificaciones (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  usuario_id text not null,
  usuario_nombre text not null,
  empresa_id text not null,
  empresa_nombre text not null,
  establecimiento_id text,
  establecimiento_nombre text,
  modulo text not null,
  ruta text not null,
  puntaje smallint not null check (puntaje between 1 and 10),
  comentario_opcional text check (comentario_opcional is null or char_length(comentario_opcional) <= 140)
);

comment on table public.retroalimentacion_calificaciones is 'Guarda calificaciones de satisfacción enviadas desde SenciYo.';

create index if not exists idx_retro_calificaciones_created_at
  on public.retroalimentacion_calificaciones (created_at desc);

create index if not exists idx_retro_calificaciones_empresa_id
  on public.retroalimentacion_calificaciones (empresa_id);