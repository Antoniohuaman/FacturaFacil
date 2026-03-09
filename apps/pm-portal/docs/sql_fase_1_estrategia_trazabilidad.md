# SQL Fase 1 Portal PM: Estrategia y Trazabilidad

Ejecutar en Supabase SQL Editor, idealmente despues de los scripts base del portal, planificacion, validaciones, decisiones, auditorias y ajustes.

## 1) Modulo nuevo en catalogo

```sql
insert into public.pm_catalogo_modulos (codigo, nombre, descripcion, orden, activo)
values ('estrategia', 'Estrategia', 'OKRs, KPIs e hipotesis conectadas al roadmap', 35, true)
on conflict (codigo)
do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  orden = excluded.orden,
  activo = excluded.activo,
  updated_at = now();
```

## 2) Trazabilidad transversal

```sql
create table if not exists public.pm_historial_cambios (
  id uuid primary key default gen_random_uuid(),
  modulo_codigo text not null,
  entidad text not null,
  entidad_id uuid not null,
  accion text not null,
  resumen text not null,
  actor_user_id uuid null references auth.users (id) on delete set null,
  actor_email text null,
  antes_json jsonb null,
  despues_json jsonb null,
  metadata_json jsonb null,
  created_at timestamptz not null default now(),
  constraint ck_pm_historial_accion
    check (accion in ('crear', 'editar', 'eliminar'))
);

create index if not exists idx_pm_historial_cambios_fecha
  on public.pm_historial_cambios (created_at desc);

create index if not exists idx_pm_historial_cambios_modulo_fecha
  on public.pm_historial_cambios (modulo_codigo, created_at desc);

create index if not exists idx_pm_historial_cambios_entidad_fecha
  on public.pm_historial_cambios (entidad, created_at desc);

create index if not exists idx_pm_historial_cambios_entidad_id
  on public.pm_historial_cambios (entidad_id);

create index if not exists idx_pm_historial_cambios_actor_email
  on public.pm_historial_cambios (actor_email);
```

## 3) Tablas de estrategia

```sql
create table if not exists public.pm_periodos_estrategicos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text null,
  fecha_inicio date not null,
  fecha_fin date not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_pm_periodos_estrategicos_rango
    check (fecha_inicio <= fecha_fin)
);

create table if not exists public.pm_objetivos_estrategicos (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null references public.pm_periodos_estrategicos (id) on delete cascade,
  codigo text not null,
  titulo text not null,
  descripcion text not null,
  prioridad prioridad_registro not null default 'media',
  estado estado_registro not null default 'pendiente',
  owner text null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_pm_objetivos_estrategicos_periodo_codigo unique (periodo_id, codigo)
);

create table if not exists public.pm_key_results (
  id uuid primary key default gen_random_uuid(),
  objetivo_estrategico_id uuid not null references public.pm_objetivos_estrategicos (id) on delete cascade,
  nombre text not null,
  metrica text not null,
  unidad text not null,
  baseline numeric null,
  meta numeric null,
  valor_actual numeric null,
  frecuencia text not null,
  estado estado_registro not null default 'pendiente',
  owner text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_pm_key_results_frecuencia
    check (frecuencia in ('semanal', 'mensual', 'trimestral'))
);

create table if not exists public.pm_kpis_estrategicos (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null references public.pm_periodos_estrategicos (id) on delete cascade,
  nombre text not null,
  definicion text not null,
  formula text not null,
  fuente text not null,
  unidad text not null,
  meta numeric null,
  umbral_bajo numeric null,
  umbral_alto numeric null,
  valor_actual numeric null,
  tendencia text not null default 'estable',
  estado estado_registro not null default 'pendiente',
  owner text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_pm_kpis_estrategicos_tendencia
    check (tendencia in ('sube', 'estable', 'baja'))
);

create table if not exists public.pm_hipotesis (
  id uuid primary key default gen_random_uuid(),
  periodo_id uuid not null references public.pm_periodos_estrategicos (id) on delete cascade,
  titulo text not null,
  problema text not null,
  hipotesis text not null,
  impacto_esperado text not null,
  criterio_exito text not null,
  estado estado_registro not null default 'pendiente',
  prioridad prioridad_registro not null default 'media',
  owner text null,
  evidencia_url text null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 4) Relaciones entre estrategia y roadmap

```sql
create table if not exists public.pm_rel_objetivo_roadmap_kr (
  id uuid primary key default gen_random_uuid(),
  objetivo_roadmap_id uuid not null references public.objetivos (id) on delete cascade,
  objetivo_estrategico_id uuid not null references public.pm_objetivos_estrategicos (id) on delete cascade,
  key_result_id uuid not null references public.pm_key_results (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_pm_rel_objetivo_roadmap_kr unique (objetivo_roadmap_id, key_result_id)
);

create table if not exists public.pm_rel_iniciativa_kr (
  id uuid primary key default gen_random_uuid(),
  iniciativa_id uuid not null references public.iniciativas (id) on delete cascade,
  key_result_id uuid not null references public.pm_key_results (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_pm_rel_iniciativa_kr unique (iniciativa_id, key_result_id)
);

create table if not exists public.pm_rel_iniciativa_hipotesis (
  id uuid primary key default gen_random_uuid(),
  iniciativa_id uuid not null references public.iniciativas (id) on delete cascade,
  hipotesis_id uuid not null references public.pm_hipotesis (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_pm_rel_iniciativa_hipotesis unique (iniciativa_id, hipotesis_id)
);
```

## 5) Indices de consulta

```sql
create index if not exists idx_pm_periodos_estrategicos_activo_fechas
  on public.pm_periodos_estrategicos (activo, fecha_inicio desc, fecha_fin desc);

create index if not exists idx_pm_objetivos_estrategicos_periodo_estado
  on public.pm_objetivos_estrategicos (periodo_id, estado, prioridad);

create index if not exists idx_pm_key_results_objetivo_estado
  on public.pm_key_results (objetivo_estrategico_id, estado);

create index if not exists idx_pm_kpis_estrategicos_periodo_estado
  on public.pm_kpis_estrategicos (periodo_id, estado);

create index if not exists idx_pm_hipotesis_periodo_estado
  on public.pm_hipotesis (periodo_id, estado, prioridad);

create index if not exists idx_pm_rel_objetivo_roadmap_kr_objetivo_roadmap
  on public.pm_rel_objetivo_roadmap_kr (objetivo_roadmap_id);

create index if not exists idx_pm_rel_objetivo_roadmap_kr_key_result
  on public.pm_rel_objetivo_roadmap_kr (key_result_id);

create index if not exists idx_pm_rel_iniciativa_kr_iniciativa
  on public.pm_rel_iniciativa_kr (iniciativa_id);

create index if not exists idx_pm_rel_iniciativa_kr_key_result
  on public.pm_rel_iniciativa_kr (key_result_id);

create index if not exists idx_pm_rel_iniciativa_hipotesis_iniciativa
  on public.pm_rel_iniciativa_hipotesis (iniciativa_id);

create index if not exists idx_pm_rel_iniciativa_hipotesis_hipotesis
  on public.pm_rel_iniciativa_hipotesis (hipotesis_id);
```

## 6) Triggers `updated_at`

```sql
drop trigger if exists trg_pm_periodos_estrategicos_updated_at on public.pm_periodos_estrategicos;
create trigger trg_pm_periodos_estrategicos_updated_at
before update on public.pm_periodos_estrategicos
for each row execute procedure establecer_updated_at();

drop trigger if exists trg_pm_objetivos_estrategicos_updated_at on public.pm_objetivos_estrategicos;
create trigger trg_pm_objetivos_estrategicos_updated_at
before update on public.pm_objetivos_estrategicos
for each row execute procedure establecer_updated_at();

drop trigger if exists trg_pm_key_results_updated_at on public.pm_key_results;
create trigger trg_pm_key_results_updated_at
before update on public.pm_key_results
for each row execute procedure establecer_updated_at();

drop trigger if exists trg_pm_kpis_estrategicos_updated_at on public.pm_kpis_estrategicos;
create trigger trg_pm_kpis_estrategicos_updated_at
before update on public.pm_kpis_estrategicos
for each row execute procedure establecer_updated_at();

drop trigger if exists trg_pm_hipotesis_updated_at on public.pm_hipotesis;
create trigger trg_pm_hipotesis_updated_at
before update on public.pm_hipotesis
for each row execute procedure establecer_updated_at();
```

## 7) RLS y policies

```sql
alter table public.pm_historial_cambios enable row level security;
alter table public.pm_periodos_estrategicos enable row level security;
alter table public.pm_objetivos_estrategicos enable row level security;
alter table public.pm_key_results enable row level security;
alter table public.pm_kpis_estrategicos enable row level security;
alter table public.pm_hipotesis enable row level security;
alter table public.pm_rel_objetivo_roadmap_kr enable row level security;
alter table public.pm_rel_iniciativa_kr enable row level security;
alter table public.pm_rel_iniciativa_hipotesis enable row level security;

create policy pm_historial_cambios_select_admin
on public.pm_historial_cambios for select
using (public.rol_actual_usuario() = 'admin');

create policy pm_historial_cambios_insert_editor_admin
on public.pm_historial_cambios for insert
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_periodos_estrategicos_select
on public.pm_periodos_estrategicos for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_periodos_estrategicos_write_editor_admin
on public.pm_periodos_estrategicos for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_objetivos_estrategicos_select
on public.pm_objetivos_estrategicos for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_objetivos_estrategicos_write_editor_admin
on public.pm_objetivos_estrategicos for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_key_results_select
on public.pm_key_results for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_key_results_write_editor_admin
on public.pm_key_results for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_kpis_estrategicos_select
on public.pm_kpis_estrategicos for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_kpis_estrategicos_write_editor_admin
on public.pm_kpis_estrategicos for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_hipotesis_select
on public.pm_hipotesis for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_hipotesis_write_editor_admin
on public.pm_hipotesis for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_rel_objetivo_roadmap_kr_select
on public.pm_rel_objetivo_roadmap_kr for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_rel_objetivo_roadmap_kr_write_editor_admin
on public.pm_rel_objetivo_roadmap_kr for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_rel_iniciativa_kr_select
on public.pm_rel_iniciativa_kr for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_rel_iniciativa_kr_write_editor_admin
on public.pm_rel_iniciativa_kr for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_rel_iniciativa_hipotesis_select
on public.pm_rel_iniciativa_hipotesis for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_rel_iniciativa_hipotesis_write_editor_admin
on public.pm_rel_iniciativa_hipotesis for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));
```

## 8) Validaciones rapidas post-migracion

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'pm_historial_cambios',
    'pm_periodos_estrategicos',
    'pm_objetivos_estrategicos',
    'pm_key_results',
    'pm_kpis_estrategicos',
    'pm_hipotesis',
    'pm_rel_objetivo_roadmap_kr',
    'pm_rel_iniciativa_kr',
    'pm_rel_iniciativa_hipotesis'
  )
order by table_name;

select codigo, nombre, orden
from public.pm_catalogo_modulos
where codigo = 'estrategia';
```

## 9) Nota operativa

`pm_historial_cambios` es un registro funcional de cambios y no reemplaza `pm_auditorias`. Se usa para trazabilidad transversal best effort desde la aplicacion.