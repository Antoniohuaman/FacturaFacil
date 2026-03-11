# SQL Fase 4 Portal PM: Lanzamientos

Ejecutar en Supabase SQL Editor después de Fase 1, Fase 2 y Fase 3.

## Objetivo

Agregar el módulo autónomo `lanzamientos` al Portal PM con tres tablas nuevas, checklist de salida dependiente del release, seguimiento post-lanzamiento, exportación y trazabilidad compatible con el patrón actual.

Tablas nuevas:

- `pm_releases`
- `pm_release_checklist_items`
- `pm_release_seguimiento`

## 1) Alta del módulo en catálogo

```sql
insert into public.pm_catalogo_modulos (codigo, nombre, descripcion, orden, activo)
values (
  'lanzamientos',
  'Lanzamientos',
  'Releases, checklist de salida y seguimiento post-lanzamiento',
  8,
  true
)
on conflict (codigo) do update
set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  orden = excluded.orden,
  activo = excluded.activo,
  updated_at = now();
```

## 2) Tablas principales

```sql
create table if not exists public.pm_releases (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nombre text not null,
  descripcion text not null,
  tipo_release text not null,
  estado text not null,
  fecha_programada date not null,
  fecha_lanzamiento_real date null,
  iniciativa_id uuid null references public.iniciativas (id) on delete set null,
  entrega_id uuid null references public.entregas (id) on delete set null,
  owner text null,
  responsable_aprobacion text null,
  decision_id uuid null references public.pm_decisiones (id) on delete set null,
  rollback_preparado boolean not null default false,
  rollback_descripcion text null,
  rollback_responsable text null,
  comunicacion_requerida boolean not null default false,
  comunicacion_descripcion text null,
  audiencia_objetivo text null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_releases_codigo_unico unique (codigo),
  constraint pm_releases_tipo_check check (tipo_release in ('mvp', 'mejora', 'correccion', 'interno')),
  constraint pm_releases_estado_check check (estado in ('borrador', 'planificado', 'listo_para_salida', 'lanzado', 'revertido', 'cerrado')),
  constraint pm_releases_codigo_check check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_releases_nombre_check check (char_length(trim(nombre)) between 3 and 160),
  constraint pm_releases_descripcion_check check (char_length(trim(descripcion)) between 5 and 4000),
  constraint pm_releases_fecha_real_check check (
    fecha_lanzamiento_real is null or fecha_lanzamiento_real >= fecha_programada
  )
);

create table if not exists public.pm_release_checklist_items (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.pm_releases (id) on delete cascade,
  tipo_item text not null,
  descripcion text not null,
  obligatorio boolean not null default true,
  completado boolean not null default false,
  evidencia text null,
  orden integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_release_checklist_tipo_check check (tipo_item in ('funcional', 'datos', 'validacion', 'comunicacion', 'soporte', 'rollback')),
  constraint pm_release_checklist_descripcion_check check (char_length(trim(descripcion)) between 3 and 2000),
  constraint pm_release_checklist_orden_check check (orden between 1 and 9999),
  constraint pm_release_checklist_orden_unico unique (release_id, orden)
);

create table if not exists public.pm_release_seguimiento (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.pm_releases (id) on delete cascade,
  fecha_registro date not null,
  estado_estabilizacion text not null,
  observaciones text not null,
  incidencias_detectadas text not null,
  metrica_clave text null,
  decision_requerida boolean not null default false,
  owner text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_release_seguimiento_estado_check check (estado_estabilizacion in ('estable', 'observacion', 'alerta')),
  constraint pm_release_seguimiento_observaciones_check check (char_length(trim(observaciones)) between 5 and 4000),
  constraint pm_release_seguimiento_incidencias_check check (char_length(trim(incidencias_detectadas)) between 3 and 4000)
);
```

## 3) Índices de consulta

```sql
create index if not exists idx_pm_releases_estado_fecha
  on public.pm_releases (estado, fecha_programada desc);

create index if not exists idx_pm_releases_tipo_estado
  on public.pm_releases (tipo_release, estado);

create index if not exists idx_pm_releases_iniciativa
  on public.pm_releases (iniciativa_id);

create index if not exists idx_pm_releases_entrega
  on public.pm_releases (entrega_id);

create index if not exists idx_pm_releases_decision
  on public.pm_releases (decision_id);

create index if not exists idx_pm_releases_owner
  on public.pm_releases (owner);

create index if not exists idx_pm_release_checklist_release_orden
  on public.pm_release_checklist_items (release_id, orden);

create index if not exists idx_pm_release_checklist_tipo
  on public.pm_release_checklist_items (tipo_item, completado);

create index if not exists idx_pm_release_seguimiento_release_fecha
  on public.pm_release_seguimiento (release_id, fecha_registro desc);

create index if not exists idx_pm_release_seguimiento_estado
  on public.pm_release_seguimiento (estado_estabilizacion, fecha_registro desc);

create index if not exists idx_pm_release_seguimiento_owner
  on public.pm_release_seguimiento (owner);
```

## 4) Triggers `updated_at`

```sql
drop trigger if exists trg_pm_releases_updated_at on public.pm_releases;
create trigger trg_pm_releases_updated_at
before update on public.pm_releases
for each row
execute procedure establecer_updated_at();

drop trigger if exists trg_pm_release_checklist_items_updated_at on public.pm_release_checklist_items;
create trigger trg_pm_release_checklist_items_updated_at
before update on public.pm_release_checklist_items
for each row
execute procedure establecer_updated_at();

drop trigger if exists trg_pm_release_seguimiento_updated_at on public.pm_release_seguimiento;
create trigger trg_pm_release_seguimiento_updated_at
before update on public.pm_release_seguimiento
for each row
execute procedure establecer_updated_at();
```

## 5) Activar RLS

```sql
alter table public.pm_releases enable row level security;
alter table public.pm_release_checklist_items enable row level security;
alter table public.pm_release_seguimiento enable row level security;
```

## 6) Policies de lectura y escritura

```sql
drop policy if exists lectura_pm_releases on public.pm_releases;
drop policy if exists escritura_pm_releases on public.pm_releases;
drop policy if exists lectura_pm_release_checklist_items on public.pm_release_checklist_items;
drop policy if exists escritura_pm_release_checklist_items on public.pm_release_checklist_items;
drop policy if exists lectura_pm_release_seguimiento on public.pm_release_seguimiento;
drop policy if exists escritura_pm_release_seguimiento on public.pm_release_seguimiento;

create policy lectura_pm_releases
on public.pm_releases
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_releases
on public.pm_releases
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_pm_release_checklist_items
on public.pm_release_checklist_items
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_release_checklist_items
on public.pm_release_checklist_items
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_pm_release_seguimiento
on public.pm_release_seguimiento
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_release_seguimiento
on public.pm_release_seguimiento
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));
```

## 7) Validaciones post migración

```sql
select codigo, nombre, orden, activo
from public.pm_catalogo_modulos
where codigo = 'lanzamientos';

select tablename
from pg_tables
where schemaname = 'public'
  and tablename in (
    'pm_releases',
    'pm_release_checklist_items',
    'pm_release_seguimiento'
  )
order by tablename;

select constraint_name, table_name
from information_schema.table_constraints
where table_schema = 'public'
  and table_name in ('pm_releases', 'pm_release_checklist_items', 'pm_release_seguimiento')
order by table_name, constraint_name;

select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('pm_releases', 'pm_release_checklist_items', 'pm_release_seguimiento')
order by tablename, policyname;
```