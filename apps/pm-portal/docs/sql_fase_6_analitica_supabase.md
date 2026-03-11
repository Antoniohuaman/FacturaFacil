# SQL Fase 6 Portal PM: Analítica

Ejecutar en Supabase SQL Editor después de Fase 1, Fase 2, Fase 3, Fase 4, Fase 5 y la base de validaciones/catálogos del portal.

## Objetivo

Agregar el módulo autónomo `analitica` al Portal PM con persistencia propia solo para:

- `pm_kpis_ejecutivos`
- `pm_health_scores`

Las vistas de resumen analítico, portafolio y tendencias deben resolverse por consolidación en vivo desde módulos existentes, sin duplicar datos ni crear snapshots innecesarios.

## 0) Compatibilidad mínima requerida

Este bloque evita fallas por ausencia del catálogo de módulos en entornos donde aún no se ejecutó el SQL de validaciones.

```sql
create table if not exists public.pm_catalogo_modulos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  descripcion text null,
  orden integer not null default 1,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pm_catalogo_modulos
  add column if not exists orden integer;

update public.pm_catalogo_modulos
set orden = coalesce(orden, 999)
where orden is null;

alter table public.pm_catalogo_modulos
  alter column orden set default 1;

alter table public.pm_catalogo_modulos
  alter column orden set not null;

create index if not exists pm_catalogo_modulos_orden_idx
  on public.pm_catalogo_modulos (orden);
```

## 1) Alta del módulo en catálogo

```sql
insert into public.pm_catalogo_modulos (codigo, nombre, descripcion, orden, activo)
values (
  'analitica',
  'Analítica',
  'Resumen ejecutivo transversal, KPIs, portafolio, tendencias y health scores',
  10,
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
create table if not exists public.pm_kpis_ejecutivos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nombre text not null,
  descripcion text not null,
  categoria text not null,
  modulo_codigo text null references public.pm_catalogo_modulos (codigo) on delete set null,
  formula_texto text not null,
  unidad text not null,
  meta_valor numeric null,
  valor_actual numeric null,
  valor_anterior numeric null,
  tendencia text not null,
  estado text not null,
  owner text null,
  fecha_corte date not null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_kpis_ejecutivos_codigo_unico unique (codigo),
  constraint pm_kpis_ejecutivos_categoria_check
    check (categoria in ('estrategia', 'delivery', 'validacion', 'lanzamiento', 'operacion', 'calidad')),
  constraint pm_kpis_ejecutivos_tendencia_check
    check (tendencia in ('sube', 'estable', 'baja')),
  constraint pm_kpis_ejecutivos_estado_check
    check (estado in ('saludable', 'atencion', 'riesgo')),
  constraint pm_kpis_ejecutivos_codigo_check
    check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_kpis_ejecutivos_nombre_check
    check (char_length(trim(nombre)) between 3 and 160),
  constraint pm_kpis_ejecutivos_descripcion_check
    check (char_length(trim(descripcion)) between 5 and 4000),
  constraint pm_kpis_ejecutivos_formula_check
    check (char_length(trim(formula_texto)) between 2 and 4000),
  constraint pm_kpis_ejecutivos_unidad_check
    check (char_length(trim(unidad)) between 1 and 60)
);

create table if not exists public.pm_health_scores (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nombre text not null,
  ambito text not null,
  modulo_codigo text null references public.pm_catalogo_modulos (codigo) on delete set null,
  descripcion text not null,
  peso numeric not null,
  valor_actual numeric null,
  umbral_saludable numeric null,
  umbral_atencion numeric null,
  estado text not null,
  owner text null,
  fecha_corte date not null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_health_scores_codigo_unico unique (codigo),
  constraint pm_health_scores_ambito_check
    check (ambito in ('portafolio', 'roadmap', 'validacion', 'lanzamiento', 'operacion')),
  constraint pm_health_scores_estado_check
    check (estado in ('saludable', 'atencion', 'riesgo')),
  constraint pm_health_scores_codigo_check
    check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_health_scores_nombre_check
    check (char_length(trim(nombre)) between 3 and 160),
  constraint pm_health_scores_descripcion_check
    check (char_length(trim(descripcion)) between 5 and 4000),
  constraint pm_health_scores_peso_check
    check (peso >= 0),
  constraint pm_health_scores_umbrales_check
    check (
      umbral_saludable is null
      or umbral_atencion is null
      or umbral_saludable > umbral_atencion
    )
);
```

## 3) Índices de consulta

```sql
create index if not exists idx_pm_kpis_ejecutivos_categoria_estado
  on public.pm_kpis_ejecutivos (categoria, estado);

create index if not exists idx_pm_kpis_ejecutivos_modulo
  on public.pm_kpis_ejecutivos (modulo_codigo);

create index if not exists idx_pm_kpis_ejecutivos_owner
  on public.pm_kpis_ejecutivos (owner);

create index if not exists idx_pm_kpis_ejecutivos_fecha_corte
  on public.pm_kpis_ejecutivos (fecha_corte desc);

create index if not exists idx_pm_health_scores_ambito_estado
  on public.pm_health_scores (ambito, estado);

create index if not exists idx_pm_health_scores_modulo
  on public.pm_health_scores (modulo_codigo);

create index if not exists idx_pm_health_scores_owner
  on public.pm_health_scores (owner);

create index if not exists idx_pm_health_scores_fecha_corte
  on public.pm_health_scores (fecha_corte desc);
```

## 4) Triggers `updated_at`

```sql
drop trigger if exists trg_pm_kpis_ejecutivos_updated_at on public.pm_kpis_ejecutivos;
create trigger trg_pm_kpis_ejecutivos_updated_at
before update on public.pm_kpis_ejecutivos
for each row
execute procedure establecer_updated_at();

drop trigger if exists trg_pm_health_scores_updated_at on public.pm_health_scores;
create trigger trg_pm_health_scores_updated_at
before update on public.pm_health_scores
for each row
execute procedure establecer_updated_at();
```

## 5) Activar RLS

```sql
alter table public.pm_kpis_ejecutivos enable row level security;
alter table public.pm_health_scores enable row level security;
```

## 6) Policies de lectura y escritura

```sql
drop policy if exists lectura_pm_kpis_ejecutivos on public.pm_kpis_ejecutivos;
drop policy if exists escritura_pm_kpis_ejecutivos on public.pm_kpis_ejecutivos;
drop policy if exists lectura_pm_health_scores on public.pm_health_scores;
drop policy if exists escritura_pm_health_scores on public.pm_health_scores;

create policy lectura_pm_kpis_ejecutivos
on public.pm_kpis_ejecutivos
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_kpis_ejecutivos
on public.pm_kpis_ejecutivos
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_pm_health_scores
on public.pm_health_scores
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_health_scores
on public.pm_health_scores
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));
```

## 7) Validaciones post migración

```sql
select codigo, nombre, orden, activo
from public.pm_catalogo_modulos
where codigo = 'analitica';

select tablename
from pg_tables
where schemaname = 'public'
  and tablename in (
    'pm_kpis_ejecutivos',
    'pm_health_scores'
  )
order by tablename;

select constraint_name, table_name
from information_schema.table_constraints
where table_schema = 'public'
  and table_name in (
    'pm_kpis_ejecutivos',
    'pm_health_scores'
  )
order by table_name, constraint_name;

select trigger_name, event_object_table
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in (
    'pm_kpis_ejecutivos',
    'pm_health_scores'
  )
order by event_object_table, trigger_name;

select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in (
    'pm_kpis_ejecutivos',
    'pm_health_scores'
  )
order by tablename, policyname;

select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'pm_kpis_ejecutivos',
    'pm_health_scores'
  )
order by tablename, indexname;
```