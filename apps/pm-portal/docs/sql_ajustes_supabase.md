# SQL Ajustes Portal PM

Ejecutar en Supabase SQL Editor.

## Catálogo de severidades y configuración de integraciones

```sql
create table if not exists public.pm_catalogo_severidades (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  nivel integer not null,
  descripcion text null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pm_integraciones_config (
  id uuid primary key default gen_random_uuid(),
  clave text not null unique,
  nombre text not null,
  descripcion text null,
  habilitado boolean not null default false,
  configuracion_publica jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pm_catalogo_severidades_nivel on public.pm_catalogo_severidades (nivel asc);
create index if not exists idx_pm_integraciones_config_habilitado on public.pm_integraciones_config (habilitado);
```

## Triggers `updated_at`

```sql
create trigger trg_pm_catalogo_severidades_updated_at
before update on public.pm_catalogo_severidades
for each row execute procedure establecer_updated_at();

create trigger trg_pm_integraciones_config_updated_at
before update on public.pm_integraciones_config
for each row execute procedure establecer_updated_at();
```

## RLS y políticas (admin escritura / lectura general)

```sql
alter table public.pm_catalogo_severidades enable row level security;
alter table public.pm_integraciones_config enable row level security;

create policy pm_catalogo_severidades_select
on public.pm_catalogo_severidades for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_catalogo_severidades_write_admin
on public.pm_catalogo_severidades for all
using (public.rol_actual_usuario() = 'admin')
with check (public.rol_actual_usuario() = 'admin');

create policy pm_integraciones_config_select
on public.pm_integraciones_config for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_integraciones_config_write_admin
on public.pm_integraciones_config for all
using (public.rol_actual_usuario() = 'admin')
with check (public.rol_actual_usuario() = 'admin');
```

## Seed base de severidades e integraciones

```sql
insert into public.pm_catalogo_severidades (codigo, nombre, nivel, descripcion, activo)
values
  ('p0', 'P0', 0, 'Crítico: bloqueo o riesgo severo', true),
  ('p1', 'P1', 1, 'Alto: impacto operativo relevante', true),
  ('p2', 'P2', 2, 'Medio: mejora priorizable', true)
on conflict (codigo)
do update set
  nombre = excluded.nombre,
  nivel = excluded.nivel,
  descripcion = excluded.descripcion,
  activo = excluded.activo,
  updated_at = now();

insert into public.pm_integraciones_config (clave, nombre, descripcion, habilitado, configuracion_publica)
values
  ('posthog', 'PostHog', 'Métricas de producto para tablero PM', true, '{"modo":"server"}'::jsonb),
  ('github', 'GitHub', 'Resumen y trazabilidad de cambios', false, '{"modo":"server"}'::jsonb),
  ('jira', 'Jira', 'Sincronización futura de issues y épicas', false, '{"modo":"placeholder"}'::jsonb)
on conflict (clave)
do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  habilitado = excluded.habilitado,
  configuracion_publica = excluded.configuracion_publica,
  updated_at = now();
```

## Nota sobre `kpis_config`

La gestión de KPIs ya está en [sql_kpis_config_supabase.md](sql_kpis_config_supabase.md). Este documento solo agrega catálogos de Ajustes adicionales.

## Configuración persistente de estándar RICE

```sql
create table if not exists public.configuracion_rice (
  id uuid primary key default gen_random_uuid(),
  scope text not null default 'global' unique,
  alcance_periodo text not null check (alcance_periodo in ('semana', 'mes', 'trimestre')),
  esfuerzo_unidad text not null check (esfuerzo_unidad in ('persona_dia', 'persona_semana')),
  updated_at timestamptz not null default now()
);

create trigger trg_configuracion_rice_updated_at
before update on public.configuracion_rice
for each row execute procedure establecer_updated_at();

alter table public.configuracion_rice enable row level security;

create policy configuracion_rice_select
on public.configuracion_rice for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy configuracion_rice_write_admin
on public.configuracion_rice for all
using (public.rol_actual_usuario() = 'admin')
with check (public.rol_actual_usuario() = 'admin');

insert into public.configuracion_rice (scope, alcance_periodo, esfuerzo_unidad)
values ('global', 'mes', 'persona_semana')
on conflict (scope)
do update set
  alcance_periodo = excluded.alcance_periodo,
  esfuerzo_unidad = excluded.esfuerzo_unidad,
  updated_at = now();
```
