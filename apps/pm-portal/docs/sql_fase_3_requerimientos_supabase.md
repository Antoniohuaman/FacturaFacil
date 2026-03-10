# SQL Fase 3 Requerimientos para Portal PM

Este script se ejecuta manualmente en Supabase SQL Editor después de Fase 1 y Fase 2.

## Objetivo

Agregar el módulo autónomo `requerimientos` al Portal PM con cinco tablas nuevas y relaciones opcionales hacia discovery, roadmap, decisiones y catálogo de módulos.

Tablas nuevas:

- `pm_historias_usuario`
- `pm_criterios_aceptacion`
- `pm_casos_uso`
- `pm_reglas_negocio`
- `pm_requerimientos_no_funcionales`

## 1) Alta del módulo en catálogo

insert into public.pm_catalogo_modulos (codigo, nombre, descripcion, orden, activo)
values (
  'requerimientos',
  'Requerimientos',
  'Historias de usuario, criterios de aceptacion, casos de uso, reglas de negocio y requerimientos no funcionales',
  7,
  true
)
on conflict (codigo) do update
set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  orden = excluded.orden,
  activo = excluded.activo,
  updated_at = now();

## 2) Tablas principales

create table if not exists public.pm_historias_usuario (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  titulo text not null,
  como_usuario text not null,
  quiero text not null,
  para text not null,
  descripcion text null,
  prioridad prioridad_registro not null default 'media',
  estado estado_registro not null default 'pendiente',
  owner text null,
  iniciativa_id uuid null references public.iniciativas (id) on delete set null,
  entrega_id uuid null references public.entregas (id) on delete set null,
  hipotesis_discovery_id uuid null references public.pm_hipotesis_discovery (id) on delete set null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_historias_usuario_codigo_unico unique (codigo),
  constraint pm_historias_usuario_codigo_check check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_historias_usuario_titulo_check check (char_length(trim(titulo)) between 3 and 160)
);

create table if not exists public.pm_criterios_aceptacion (
  id uuid primary key default gen_random_uuid(),
  historia_usuario_id uuid not null references public.pm_historias_usuario (id) on delete cascade,
  descripcion text not null,
  orden integer not null,
  obligatorio boolean not null default true,
  estado_validacion estado_registro null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_criterios_aceptacion_orden_check check (orden between 1 and 9999),
  constraint pm_criterios_aceptacion_descripcion_check check (char_length(trim(descripcion)) between 3 and 2000),
  constraint pm_criterios_aceptacion_orden_unico unique (historia_usuario_id, orden)
);

create table if not exists public.pm_casos_uso (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  titulo text not null,
  actor_principal text not null,
  actores_secundarios text null,
  precondiciones text not null,
  flujo_principal text not null,
  flujos_alternos text null,
  postcondiciones text not null,
  prioridad prioridad_registro not null default 'media',
  estado estado_registro not null default 'pendiente',
  iniciativa_id uuid null references public.iniciativas (id) on delete set null,
  entrega_id uuid null references public.entregas (id) on delete set null,
  historia_usuario_id uuid null references public.pm_historias_usuario (id) on delete set null,
  owner text null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_casos_uso_codigo_unico unique (codigo),
  constraint pm_casos_uso_codigo_check check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_casos_uso_titulo_check check (char_length(trim(titulo)) between 3 and 160)
);

create table if not exists public.pm_reglas_negocio (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nombre text not null,
  descripcion text not null,
  categoria text not null,
  criticidad prioridad_registro not null default 'media',
  modulo_codigo text null references public.pm_catalogo_modulos (codigo) on delete set null,
  estado estado_registro not null default 'pendiente',
  iniciativa_id uuid null references public.iniciativas (id) on delete set null,
  historia_usuario_id uuid null references public.pm_historias_usuario (id) on delete set null,
  decision_id uuid null references public.pm_decisiones (id) on delete set null,
  owner text null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_reglas_negocio_codigo_unico unique (codigo),
  constraint pm_reglas_negocio_codigo_check check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_reglas_negocio_nombre_check check (char_length(trim(nombre)) between 3 and 160)
);

create table if not exists public.pm_requerimientos_no_funcionales (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nombre text not null,
  tipo text not null,
  descripcion text not null,
  criterio_medicion text not null,
  prioridad prioridad_registro not null default 'media',
  estado estado_registro not null default 'pendiente',
  iniciativa_id uuid null references public.iniciativas (id) on delete set null,
  entrega_id uuid null references public.entregas (id) on delete set null,
  owner text null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_rnf_codigo_unico unique (codigo),
  constraint pm_rnf_tipo_check check (tipo in ('seguridad', 'rendimiento', 'disponibilidad', 'auditoria', 'accesibilidad', 'mantenibilidad')),
  constraint pm_rnf_codigo_check check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_rnf_nombre_check check (char_length(trim(nombre)) between 3 and 160)
);

## 3) Índices de consulta

create index if not exists idx_pm_historias_usuario_estado on public.pm_historias_usuario (estado);
create index if not exists idx_pm_historias_usuario_prioridad on public.pm_historias_usuario (prioridad);
create index if not exists idx_pm_historias_usuario_iniciativa on public.pm_historias_usuario (iniciativa_id);
create index if not exists idx_pm_historias_usuario_entrega on public.pm_historias_usuario (entrega_id);
create index if not exists idx_pm_historias_usuario_hipotesis on public.pm_historias_usuario (hipotesis_discovery_id);
create index if not exists idx_pm_historias_usuario_owner on public.pm_historias_usuario (owner);

create index if not exists idx_pm_criterios_aceptacion_historia on public.pm_criterios_aceptacion (historia_usuario_id, orden);
create index if not exists idx_pm_criterios_aceptacion_estado_validacion on public.pm_criterios_aceptacion (estado_validacion);

create index if not exists idx_pm_casos_uso_estado on public.pm_casos_uso (estado);
create index if not exists idx_pm_casos_uso_prioridad on public.pm_casos_uso (prioridad);
create index if not exists idx_pm_casos_uso_iniciativa on public.pm_casos_uso (iniciativa_id);
create index if not exists idx_pm_casos_uso_entrega on public.pm_casos_uso (entrega_id);
create index if not exists idx_pm_casos_uso_historia on public.pm_casos_uso (historia_usuario_id);
create index if not exists idx_pm_casos_uso_actor on public.pm_casos_uso (actor_principal);

create index if not exists idx_pm_reglas_negocio_estado on public.pm_reglas_negocio (estado);
create index if not exists idx_pm_reglas_negocio_criticidad on public.pm_reglas_negocio (criticidad);
create index if not exists idx_pm_reglas_negocio_categoria on public.pm_reglas_negocio (categoria);
create index if not exists idx_pm_reglas_negocio_modulo on public.pm_reglas_negocio (modulo_codigo);
create index if not exists idx_pm_reglas_negocio_iniciativa on public.pm_reglas_negocio (iniciativa_id);
create index if not exists idx_pm_reglas_negocio_historia on public.pm_reglas_negocio (historia_usuario_id);
create index if not exists idx_pm_reglas_negocio_decision on public.pm_reglas_negocio (decision_id);

create index if not exists idx_pm_rnf_estado on public.pm_requerimientos_no_funcionales (estado);
create index if not exists idx_pm_rnf_prioridad on public.pm_requerimientos_no_funcionales (prioridad);
create index if not exists idx_pm_rnf_tipo on public.pm_requerimientos_no_funcionales (tipo);
create index if not exists idx_pm_rnf_iniciativa on public.pm_requerimientos_no_funcionales (iniciativa_id);
create index if not exists idx_pm_rnf_entrega on public.pm_requerimientos_no_funcionales (entrega_id);

## 4) Triggers updated_at

drop trigger if exists trg_pm_historias_usuario_updated_at on public.pm_historias_usuario;
create trigger trg_pm_historias_usuario_updated_at
before update on public.pm_historias_usuario
for each row
execute procedure establecer_updated_at();

drop trigger if exists trg_pm_criterios_aceptacion_updated_at on public.pm_criterios_aceptacion;
create trigger trg_pm_criterios_aceptacion_updated_at
before update on public.pm_criterios_aceptacion
for each row
execute procedure establecer_updated_at();

drop trigger if exists trg_pm_casos_uso_updated_at on public.pm_casos_uso;
create trigger trg_pm_casos_uso_updated_at
before update on public.pm_casos_uso
for each row
execute procedure establecer_updated_at();

drop trigger if exists trg_pm_reglas_negocio_updated_at on public.pm_reglas_negocio;
create trigger trg_pm_reglas_negocio_updated_at
before update on public.pm_reglas_negocio
for each row
execute procedure establecer_updated_at();

drop trigger if exists trg_pm_rnf_updated_at on public.pm_requerimientos_no_funcionales;
create trigger trg_pm_rnf_updated_at
before update on public.pm_requerimientos_no_funcionales
for each row
execute procedure establecer_updated_at();

## 5) Activar RLS

alter table public.pm_historias_usuario enable row level security;
alter table public.pm_criterios_aceptacion enable row level security;
alter table public.pm_casos_uso enable row level security;
alter table public.pm_reglas_negocio enable row level security;
alter table public.pm_requerimientos_no_funcionales enable row level security;

## 6) Policies de lectura y escritura

Primero elimina policies previas si estás reejecutando el script.

drop policy if exists lectura_pm_historias_usuario on public.pm_historias_usuario;
drop policy if exists escritura_pm_historias_usuario on public.pm_historias_usuario;
drop policy if exists lectura_pm_criterios_aceptacion on public.pm_criterios_aceptacion;
drop policy if exists escritura_pm_criterios_aceptacion on public.pm_criterios_aceptacion;
drop policy if exists lectura_pm_casos_uso on public.pm_casos_uso;
drop policy if exists escritura_pm_casos_uso on public.pm_casos_uso;
drop policy if exists lectura_pm_reglas_negocio on public.pm_reglas_negocio;
drop policy if exists escritura_pm_reglas_negocio on public.pm_reglas_negocio;
drop policy if exists lectura_pm_rnf on public.pm_requerimientos_no_funcionales;
drop policy if exists escritura_pm_rnf on public.pm_requerimientos_no_funcionales;

create policy lectura_pm_historias_usuario
on public.pm_historias_usuario
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_historias_usuario
on public.pm_historias_usuario
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_pm_criterios_aceptacion
on public.pm_criterios_aceptacion
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_criterios_aceptacion
on public.pm_criterios_aceptacion
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_pm_casos_uso
on public.pm_casos_uso
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_casos_uso
on public.pm_casos_uso
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_pm_reglas_negocio
on public.pm_reglas_negocio
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_reglas_negocio
on public.pm_reglas_negocio
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_pm_rnf
on public.pm_requerimientos_no_funcionales
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_rnf
on public.pm_requerimientos_no_funcionales
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

## 7) Validaciones post migración

select codigo, nombre, orden, activo
from public.pm_catalogo_modulos
where codigo = 'requerimientos';

select tablename
from pg_tables
where schemaname = 'public'
  and tablename in (
    'pm_historias_usuario',
    'pm_criterios_aceptacion',
    'pm_casos_uso',
    'pm_reglas_negocio',
    'pm_requerimientos_no_funcionales'
  )
order by tablename;

select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in (
    'pm_historias_usuario',
    'pm_criterios_aceptacion',
    'pm_casos_uso',
    'pm_reglas_negocio',
    'pm_requerimientos_no_funcionales'
  )
order by tablename, policyname;

## Notas

- El flujo de criterios de aceptacion asume reordenamiento por actualización de `orden` y unicidad por `(historia_usuario_id, orden)`.
- Todas las relaciones cruzadas son opcionales y usan `on delete set null`, excepto criterios sobre historias, que usan `on delete cascade`.
- Las policies reutilizan `public.rol_actual_usuario()` definido en la base del portal.