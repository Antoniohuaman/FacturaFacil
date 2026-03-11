# SQL Fase 5 Portal PM: Operación

Ejecutar en Supabase SQL Editor después de Fase 1, Fase 2, Fase 3, Fase 4 y la base de validaciones/catálogos del portal.

## Objetivo

Agregar el módulo autónomo `operacion` al Portal PM con cinco tablas nuevas orientadas a gestión operativa continua:

- `pm_bugs`
- `pm_mejoras`
- `pm_deuda_tecnica`
- `pm_bloqueos`
- `pm_lecciones_aprendidas`

Las relaciones hacia roadmap, lanzamientos, decisiones, auditorías, hallazgos y discovery son opcionales para no romper la adopción por fases.

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
  'operacion',
  'Operación',
  'Bugs, mejoras, deuda técnica, bloqueos y lecciones aprendidas',
  9,
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
create table if not exists public.pm_bugs (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  titulo text not null,
  descripcion text not null,
  estado text not null,
  prioridad text not null,
  owner text null,
  fecha_reporte date not null,
  fecha_resolucion date null,
  modulo_codigo text null references public.pm_catalogo_modulos (codigo) on delete set null,
  iniciativa_id uuid null references public.iniciativas (id) on delete set null,
  entrega_id uuid null references public.entregas (id) on delete set null,
  release_id uuid null references public.pm_releases (id) on delete set null,
  auditoria_id uuid null references public.pm_auditorias (id) on delete set null,
  hallazgo_id uuid null references public.pm_hallazgos_auditoria (id) on delete set null,
  impacto_operativo text null,
  causa_raiz text null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_bugs_codigo_unico unique (codigo),
  constraint pm_bugs_estado_check check (estado in ('nuevo', 'triage', 'en_progreso', 'resuelto', 'cerrado')),
  constraint pm_bugs_prioridad_check check (prioridad in ('baja', 'media', 'alta')),
  constraint pm_bugs_codigo_check check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_bugs_titulo_check check (char_length(trim(titulo)) between 3 and 160),
  constraint pm_bugs_descripcion_check check (char_length(trim(descripcion)) between 5 and 4000),
  constraint pm_bugs_fecha_resolucion_check check (
    fecha_resolucion is null or fecha_resolucion >= fecha_reporte
  )
);

create table if not exists public.pm_mejoras (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  titulo text not null,
  descripcion text not null,
  estado text not null,
  prioridad text not null,
  owner text null,
  fecha_solicitud date not null,
  fecha_cierre date null,
  modulo_codigo text null references public.pm_catalogo_modulos (codigo) on delete set null,
  iniciativa_id uuid null references public.iniciativas (id) on delete set null,
  entrega_id uuid null references public.entregas (id) on delete set null,
  insight_id uuid null references public.pm_insights (id) on delete set null,
  hipotesis_discovery_id uuid null references public.pm_hipotesis_discovery (id) on delete set null,
  beneficio_esperado text not null,
  criterio_exito text null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_mejoras_codigo_unico unique (codigo),
  constraint pm_mejoras_estado_check check (estado in ('backlog', 'priorizada', 'en_progreso', 'implementada', 'cerrada')),
  constraint pm_mejoras_prioridad_check check (prioridad in ('baja', 'media', 'alta')),
  constraint pm_mejoras_codigo_check check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_mejoras_titulo_check check (char_length(trim(titulo)) between 3 and 160),
  constraint pm_mejoras_descripcion_check check (char_length(trim(descripcion)) between 5 and 4000),
  constraint pm_mejoras_beneficio_check check (char_length(trim(beneficio_esperado)) between 5 and 4000),
  constraint pm_mejoras_fecha_cierre_check check (
    fecha_cierre is null or fecha_cierre >= fecha_solicitud
  )
);

create table if not exists public.pm_deuda_tecnica (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  titulo text not null,
  descripcion text not null,
  estado text not null,
  prioridad text not null,
  owner text null,
  fecha_identificacion date not null,
  fecha_objetivo date null,
  modulo_codigo text null references public.pm_catalogo_modulos (codigo) on delete set null,
  iniciativa_id uuid null references public.iniciativas (id) on delete set null,
  entrega_id uuid null references public.entregas (id) on delete set null,
  release_id uuid null references public.pm_releases (id) on delete set null,
  impacto_tecnico text not null,
  plan_remediacion text null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_deuda_tecnica_codigo_unico unique (codigo),
  constraint pm_deuda_tecnica_estado_check check (estado in ('identificada', 'priorizada', 'en_progreso', 'resuelta', 'descartada')),
  constraint pm_deuda_tecnica_prioridad_check check (prioridad in ('baja', 'media', 'alta')),
  constraint pm_deuda_tecnica_codigo_check check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_deuda_tecnica_titulo_check check (char_length(trim(titulo)) between 3 and 160),
  constraint pm_deuda_tecnica_descripcion_check check (char_length(trim(descripcion)) between 5 and 4000),
  constraint pm_deuda_tecnica_impacto_check check (char_length(trim(impacto_tecnico)) between 5 and 4000),
  constraint pm_deuda_tecnica_fecha_objetivo_check check (
    fecha_objetivo is null or fecha_objetivo >= fecha_identificacion
  )
);

create table if not exists public.pm_bloqueos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  titulo text not null,
  descripcion text not null,
  estado text not null,
  prioridad text not null,
  owner text null,
  responsable_desbloqueo text null,
  fecha_reporte date not null,
  fecha_resolucion date null,
  modulo_codigo text null references public.pm_catalogo_modulos (codigo) on delete set null,
  iniciativa_id uuid null references public.iniciativas (id) on delete set null,
  entrega_id uuid null references public.entregas (id) on delete set null,
  release_id uuid null references public.pm_releases (id) on delete set null,
  decision_id uuid null references public.pm_decisiones (id) on delete set null,
  impacto_operativo text not null,
  proximo_paso text null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_bloqueos_codigo_unico unique (codigo),
  constraint pm_bloqueos_estado_check check (estado in ('abierto', 'en_seguimiento', 'escalado', 'resuelto')),
  constraint pm_bloqueos_prioridad_check check (prioridad in ('baja', 'media', 'alta')),
  constraint pm_bloqueos_codigo_check check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_bloqueos_titulo_check check (char_length(trim(titulo)) between 3 and 160),
  constraint pm_bloqueos_descripcion_check check (char_length(trim(descripcion)) between 5 and 4000),
  constraint pm_bloqueos_impacto_check check (char_length(trim(impacto_operativo)) between 5 and 4000),
  constraint pm_bloqueos_fecha_resolucion_check check (
    fecha_resolucion is null or fecha_resolucion >= fecha_reporte
  )
);

create table if not exists public.pm_lecciones_aprendidas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  titulo text not null,
  contexto text not null,
  aprendizaje text not null,
  accion_recomendada text not null,
  estado text not null,
  owner text null,
  fecha_leccion date not null,
  modulo_codigo text null references public.pm_catalogo_modulos (codigo) on delete set null,
  iniciativa_id uuid null references public.iniciativas (id) on delete set null,
  entrega_id uuid null references public.entregas (id) on delete set null,
  release_id uuid null references public.pm_releases (id) on delete set null,
  auditoria_id uuid null references public.pm_auditorias (id) on delete set null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_lecciones_aprendidas_codigo_unico unique (codigo),
  constraint pm_lecciones_aprendidas_estado_check check (estado in ('capturada', 'validada', 'aplicada', 'archivada')),
  constraint pm_lecciones_aprendidas_codigo_check check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_lecciones_aprendidas_titulo_check check (char_length(trim(titulo)) between 3 and 160),
  constraint pm_lecciones_aprendidas_contexto_check check (char_length(trim(contexto)) between 5 and 4000),
  constraint pm_lecciones_aprendidas_aprendizaje_check check (char_length(trim(aprendizaje)) between 5 and 4000),
  constraint pm_lecciones_aprendidas_accion_check check (char_length(trim(accion_recomendada)) between 5 and 4000)
);
```

## 3) Índices de consulta

```sql
create index if not exists idx_pm_bugs_estado_fecha on public.pm_bugs (estado, fecha_reporte desc);
create index if not exists idx_pm_bugs_modulo on public.pm_bugs (modulo_codigo);
create index if not exists idx_pm_bugs_iniciativa on public.pm_bugs (iniciativa_id);
create index if not exists idx_pm_bugs_release on public.pm_bugs (release_id);
create index if not exists idx_pm_bugs_auditoria on public.pm_bugs (auditoria_id);
create index if not exists idx_pm_bugs_hallazgo on public.pm_bugs (hallazgo_id);
create index if not exists idx_pm_bugs_entrega on public.pm_bugs (entrega_id);

create index if not exists idx_pm_mejoras_estado_fecha on public.pm_mejoras (estado, fecha_solicitud desc);
create index if not exists idx_pm_mejoras_modulo on public.pm_mejoras (modulo_codigo);
create index if not exists idx_pm_mejoras_iniciativa on public.pm_mejoras (iniciativa_id);
create index if not exists idx_pm_mejoras_insight on public.pm_mejoras (insight_id);
create index if not exists idx_pm_mejoras_hipotesis on public.pm_mejoras (hipotesis_discovery_id);
create index if not exists idx_pm_mejoras_entrega on public.pm_mejoras (entrega_id);

create index if not exists idx_pm_deuda_tecnica_estado_fecha on public.pm_deuda_tecnica (estado, fecha_identificacion desc);
create index if not exists idx_pm_deuda_tecnica_modulo on public.pm_deuda_tecnica (modulo_codigo);
create index if not exists idx_pm_deuda_tecnica_iniciativa on public.pm_deuda_tecnica (iniciativa_id);
create index if not exists idx_pm_deuda_tecnica_release on public.pm_deuda_tecnica (release_id);
create index if not exists idx_pm_deuda_tecnica_entrega on public.pm_deuda_tecnica (entrega_id);

create index if not exists idx_pm_bloqueos_estado_fecha on public.pm_bloqueos (estado, fecha_reporte desc);
create index if not exists idx_pm_bloqueos_modulo on public.pm_bloqueos (modulo_codigo);
create index if not exists idx_pm_bloqueos_iniciativa on public.pm_bloqueos (iniciativa_id);
create index if not exists idx_pm_bloqueos_decision on public.pm_bloqueos (decision_id);
create index if not exists idx_pm_bloqueos_release on public.pm_bloqueos (release_id);
create index if not exists idx_pm_bloqueos_entrega on public.pm_bloqueos (entrega_id);

create index if not exists idx_pm_lecciones_aprendidas_estado_fecha on public.pm_lecciones_aprendidas (estado, fecha_leccion desc);
create index if not exists idx_pm_lecciones_aprendidas_modulo on public.pm_lecciones_aprendidas (modulo_codigo);
create index if not exists idx_pm_lecciones_aprendidas_iniciativa on public.pm_lecciones_aprendidas (iniciativa_id);
create index if not exists idx_pm_lecciones_aprendidas_release on public.pm_lecciones_aprendidas (release_id);
create index if not exists idx_pm_lecciones_aprendidas_auditoria on public.pm_lecciones_aprendidas (auditoria_id);
create index if not exists idx_pm_lecciones_aprendidas_entrega on public.pm_lecciones_aprendidas (entrega_id);
```

## 4) Triggers `updated_at`

```sql
drop trigger if exists trg_pm_bugs_updated_at on public.pm_bugs;
create trigger trg_pm_bugs_updated_at
before update on public.pm_bugs
for each row
execute procedure establecer_updated_at();

drop trigger if exists trg_pm_mejoras_updated_at on public.pm_mejoras;
create trigger trg_pm_mejoras_updated_at
before update on public.pm_mejoras
for each row
execute procedure establecer_updated_at();

drop trigger if exists trg_pm_deuda_tecnica_updated_at on public.pm_deuda_tecnica;
create trigger trg_pm_deuda_tecnica_updated_at
before update on public.pm_deuda_tecnica
for each row
execute procedure establecer_updated_at();

drop trigger if exists trg_pm_bloqueos_updated_at on public.pm_bloqueos;
create trigger trg_pm_bloqueos_updated_at
before update on public.pm_bloqueos
for each row
execute procedure establecer_updated_at();

drop trigger if exists trg_pm_lecciones_aprendidas_updated_at on public.pm_lecciones_aprendidas;
create trigger trg_pm_lecciones_aprendidas_updated_at
before update on public.pm_lecciones_aprendidas
for each row
execute procedure establecer_updated_at();
```

## 5) Activar RLS

```sql
alter table public.pm_bugs enable row level security;
alter table public.pm_mejoras enable row level security;
alter table public.pm_deuda_tecnica enable row level security;
alter table public.pm_bloqueos enable row level security;
alter table public.pm_lecciones_aprendidas enable row level security;
```

## 6) Policies de lectura y escritura

```sql
drop policy if exists lectura_pm_bugs on public.pm_bugs;
drop policy if exists escritura_pm_bugs on public.pm_bugs;
drop policy if exists lectura_pm_mejoras on public.pm_mejoras;
drop policy if exists escritura_pm_mejoras on public.pm_mejoras;
drop policy if exists lectura_pm_deuda_tecnica on public.pm_deuda_tecnica;
drop policy if exists escritura_pm_deuda_tecnica on public.pm_deuda_tecnica;
drop policy if exists lectura_pm_bloqueos on public.pm_bloqueos;
drop policy if exists escritura_pm_bloqueos on public.pm_bloqueos;
drop policy if exists lectura_pm_lecciones_aprendidas on public.pm_lecciones_aprendidas;
drop policy if exists escritura_pm_lecciones_aprendidas on public.pm_lecciones_aprendidas;

create policy lectura_pm_bugs
on public.pm_bugs
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_bugs
on public.pm_bugs
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_pm_mejoras
on public.pm_mejoras
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_mejoras
on public.pm_mejoras
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_pm_deuda_tecnica
on public.pm_deuda_tecnica
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_deuda_tecnica
on public.pm_deuda_tecnica
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_pm_bloqueos
on public.pm_bloqueos
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_bloqueos
on public.pm_bloqueos
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_pm_lecciones_aprendidas
on public.pm_lecciones_aprendidas
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_lecciones_aprendidas
on public.pm_lecciones_aprendidas
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));
```

## 7) Validaciones post migración

```sql
select codigo, nombre, orden, activo
from public.pm_catalogo_modulos
where codigo = 'operacion';

select tablename
from pg_tables
where schemaname = 'public'
  and tablename in (
    'pm_bugs',
    'pm_mejoras',
    'pm_deuda_tecnica',
    'pm_bloqueos',
    'pm_lecciones_aprendidas'
  )
order by tablename;

select constraint_name, table_name
from information_schema.table_constraints
where table_schema = 'public'
  and table_name in (
    'pm_bugs',
    'pm_mejoras',
    'pm_deuda_tecnica',
    'pm_bloqueos',
    'pm_lecciones_aprendidas'
  )
order by table_name, constraint_name;

select trigger_name, event_object_table
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in (
    'pm_bugs',
    'pm_mejoras',
    'pm_deuda_tecnica',
    'pm_bloqueos',
    'pm_lecciones_aprendidas'
  )
order by event_object_table, trigger_name;

select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in (
    'pm_bugs',
    'pm_mejoras',
    'pm_deuda_tecnica',
    'pm_bloqueos',
    'pm_lecciones_aprendidas'
  )
order by tablename, policyname;

select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'pm_bugs',
    'pm_mejoras',
    'pm_deuda_tecnica',
    'pm_bloqueos',
    'pm_lecciones_aprendidas'
  )
order by tablename, indexname;
```