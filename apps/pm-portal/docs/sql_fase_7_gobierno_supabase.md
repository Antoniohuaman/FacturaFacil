# SQL Fase 7 Portal PM: Gobierno

Ejecutar en Supabase SQL Editor después de Fase 1, Fase 2, Fase 3, Fase 4, Fase 5, Fase 6 y la base de validaciones/catálogos del portal.

## Objetivo

Agregar el módulo autónomo `gobierno` al Portal PM con persistencia propia para:

- `pm_stakeholders`
- `pm_riesgos`
- `pm_dependencias`

El resumen de gobierno se resuelve por consolidación en vivo sobre estas tres tablas, sin snapshots adicionales.

## 0) Compatibilidad mínima requerida

Este bloque evita fallas en entornos donde aún no existe la columna `orden` del catálogo de módulos.

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
  'gobierno',
  'Gobierno',
  'Stakeholders, riesgos, dependencias y resumen ejecutivo de gobierno del portafolio PM',
  35,
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
create table if not exists public.pm_stakeholders (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  nombre text not null,
  tipo text not null,
  area text not null,
  organizacion text null,
  cargo text null,
  influencia text not null,
  interes text not null,
  estado text not null,
  owner text null,
  correo text null,
  contacto_referencia text null,
  modulo_codigo text null references public.pm_catalogo_modulos (codigo) on delete set null,
  iniciativa_id uuid null references public.iniciativas (id) on delete set null,
  entrega_id uuid null references public.entregas (id) on delete set null,
  decision_id uuid null references public.pm_decisiones (id) on delete set null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_stakeholders_codigo_unico unique (codigo),
  constraint pm_stakeholders_tipo_check
    check (tipo in ('sponsor', 'decisor', 'usuario_clave', 'cliente', 'aliado', 'proveedor', 'interno')),
  constraint pm_stakeholders_influencia_check
    check (influencia in ('baja', 'media', 'alta')),
  constraint pm_stakeholders_interes_check
    check (interes in ('bajo', 'medio', 'alto')),
  constraint pm_stakeholders_estado_check
    check (estado in ('activo', 'en_seguimiento', 'inactivo')),
  constraint pm_stakeholders_codigo_check
    check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_stakeholders_nombre_check
    check (char_length(trim(nombre)) between 3 and 160),
  constraint pm_stakeholders_area_check
    check (char_length(trim(area)) between 2 and 120),
  constraint pm_stakeholders_correo_check
    check (
      correo is null
      or position('@' in correo) > 1
    )
);

create table if not exists public.pm_riesgos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  titulo text not null,
  descripcion text not null,
  categoria text not null,
  probabilidad text not null,
  impacto text not null,
  criticidad text not null,
  estado text not null,
  owner text null,
  fecha_identificacion date not null,
  fecha_objetivo date null,
  trigger_riesgo text null,
  plan_mitigacion text null,
  modulo_codigo text null references public.pm_catalogo_modulos (codigo) on delete set null,
  iniciativa_id uuid null references public.iniciativas (id) on delete set null,
  entrega_id uuid null references public.entregas (id) on delete set null,
  release_id uuid null references public.pm_releases (id) on delete set null,
  decision_id uuid null references public.pm_decisiones (id) on delete set null,
  auditoria_id uuid null references public.pm_auditorias (id) on delete set null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_riesgos_codigo_unico unique (codigo),
  constraint pm_riesgos_categoria_check
    check (categoria in ('negocio', 'tecnico', 'operativo', 'regulatorio', 'adopcion', 'dependencia')),
  constraint pm_riesgos_probabilidad_check
    check (probabilidad in ('baja', 'media', 'alta')),
  constraint pm_riesgos_impacto_check
    check (impacto in ('bajo', 'medio', 'alto')),
  constraint pm_riesgos_criticidad_check
    check (criticidad in ('baja', 'media', 'alta', 'critica')),
  constraint pm_riesgos_estado_check
    check (estado in ('identificado', 'en_mitigacion', 'monitoreo', 'cerrado')),
  constraint pm_riesgos_codigo_check
    check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_riesgos_titulo_check
    check (char_length(trim(titulo)) between 3 and 160),
  constraint pm_riesgos_descripcion_check
    check (char_length(trim(descripcion)) between 5 and 4000),
  constraint pm_riesgos_fechas_check
    check (fecha_objetivo is null or fecha_objetivo >= fecha_identificacion)
);

create table if not exists public.pm_dependencias (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  titulo text not null,
  descripcion text not null,
  tipo_dependencia text not null,
  estado text not null,
  criticidad text not null,
  owner text null,
  responsable_externo text null,
  fecha_identificacion date not null,
  fecha_objetivo date null,
  impacto_si_falla text not null,
  proximo_paso text null,
  modulo_codigo text null references public.pm_catalogo_modulos (codigo) on delete set null,
  iniciativa_id uuid null references public.iniciativas (id) on delete set null,
  entrega_id uuid null references public.entregas (id) on delete set null,
  release_id uuid null references public.pm_releases (id) on delete set null,
  decision_id uuid null references public.pm_decisiones (id) on delete set null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_dependencias_codigo_unico unique (codigo),
  constraint pm_dependencias_tipo_check
    check (tipo_dependencia in ('equipo', 'sistema', 'proveedor', 'aprobacion', 'datos', 'infraestructura', 'negocio')),
  constraint pm_dependencias_estado_check
    check (estado in ('abierta', 'en_seguimiento', 'resuelta', 'bloqueante')),
  constraint pm_dependencias_criticidad_check
    check (criticidad in ('baja', 'media', 'alta', 'critica')),
  constraint pm_dependencias_codigo_check
    check (char_length(trim(codigo)) between 2 and 40),
  constraint pm_dependencias_titulo_check
    check (char_length(trim(titulo)) between 3 and 160),
  constraint pm_dependencias_descripcion_check
    check (char_length(trim(descripcion)) between 5 and 4000),
  constraint pm_dependencias_impacto_check
    check (char_length(trim(impacto_si_falla)) between 5 and 4000),
  constraint pm_dependencias_fechas_check
    check (fecha_objetivo is null or fecha_objetivo >= fecha_identificacion)
);
```

## 3) Índices de consulta

```sql
create index if not exists idx_pm_stakeholders_tipo_estado
  on public.pm_stakeholders (tipo, estado);

create index if not exists idx_pm_stakeholders_modulo
  on public.pm_stakeholders (modulo_codigo);

create index if not exists idx_pm_stakeholders_iniciativa
  on public.pm_stakeholders (iniciativa_id);

create index if not exists idx_pm_stakeholders_entrega
  on public.pm_stakeholders (entrega_id);

create index if not exists idx_pm_stakeholders_decision
  on public.pm_stakeholders (decision_id);

create index if not exists idx_pm_riesgos_categoria_estado
  on public.pm_riesgos (categoria, estado);

create index if not exists idx_pm_riesgos_criticidad_estado
  on public.pm_riesgos (criticidad, estado);

create index if not exists idx_pm_riesgos_modulo
  on public.pm_riesgos (modulo_codigo);

create index if not exists idx_pm_riesgos_iniciativa
  on public.pm_riesgos (iniciativa_id);

create index if not exists idx_pm_riesgos_entrega
  on public.pm_riesgos (entrega_id);

create index if not exists idx_pm_riesgos_release
  on public.pm_riesgos (release_id);

create index if not exists idx_pm_riesgos_decision
  on public.pm_riesgos (decision_id);

create index if not exists idx_pm_riesgos_auditoria
  on public.pm_riesgos (auditoria_id);

create index if not exists idx_pm_riesgos_fecha_identificacion
  on public.pm_riesgos (fecha_identificacion desc);

create index if not exists idx_pm_dependencias_tipo_estado
  on public.pm_dependencias (tipo_dependencia, estado);

create index if not exists idx_pm_dependencias_criticidad_estado
  on public.pm_dependencias (criticidad, estado);

create index if not exists idx_pm_dependencias_modulo
  on public.pm_dependencias (modulo_codigo);

create index if not exists idx_pm_dependencias_iniciativa
  on public.pm_dependencias (iniciativa_id);

create index if not exists idx_pm_dependencias_entrega
  on public.pm_dependencias (entrega_id);

create index if not exists idx_pm_dependencias_release
  on public.pm_dependencias (release_id);

create index if not exists idx_pm_dependencias_decision
  on public.pm_dependencias (decision_id);

create index if not exists idx_pm_dependencias_fecha_identificacion
  on public.pm_dependencias (fecha_identificacion desc);
```

## 4) Triggers `updated_at`

```sql
drop trigger if exists trg_pm_stakeholders_updated_at on public.pm_stakeholders;
create trigger trg_pm_stakeholders_updated_at
before update on public.pm_stakeholders
for each row
execute procedure establecer_updated_at();

drop trigger if exists trg_pm_riesgos_updated_at on public.pm_riesgos;
create trigger trg_pm_riesgos_updated_at
before update on public.pm_riesgos
for each row
execute procedure establecer_updated_at();

drop trigger if exists trg_pm_dependencias_updated_at on public.pm_dependencias;
create trigger trg_pm_dependencias_updated_at
before update on public.pm_dependencias
for each row
execute procedure establecer_updated_at();
```

## 5) Activar RLS

```sql
alter table public.pm_stakeholders enable row level security;
alter table public.pm_riesgos enable row level security;
alter table public.pm_dependencias enable row level security;
```

## 6) Policies de lectura y escritura

```sql
drop policy if exists lectura_pm_stakeholders on public.pm_stakeholders;
drop policy if exists escritura_pm_stakeholders on public.pm_stakeholders;
drop policy if exists lectura_pm_riesgos on public.pm_riesgos;
drop policy if exists escritura_pm_riesgos on public.pm_riesgos;
drop policy if exists lectura_pm_dependencias on public.pm_dependencias;
drop policy if exists escritura_pm_dependencias on public.pm_dependencias;

create policy lectura_pm_stakeholders
on public.pm_stakeholders
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_stakeholders
on public.pm_stakeholders
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_pm_riesgos
on public.pm_riesgos
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_riesgos
on public.pm_riesgos
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_pm_dependencias
on public.pm_dependencias
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_pm_dependencias
on public.pm_dependencias
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));
```

## 7) Validaciones post migración

```sql
select codigo, nombre, orden, activo
from public.pm_catalogo_modulos
where codigo = 'gobierno';

select tablename
from pg_tables
where schemaname = 'public'
  and tablename in (
    'pm_stakeholders',
    'pm_riesgos',
    'pm_dependencias'
  )
order by tablename;

select constraint_name, table_name
from information_schema.table_constraints
where table_schema = 'public'
  and table_name in (
    'pm_stakeholders',
    'pm_riesgos',
    'pm_dependencias'
  )
order by table_name, constraint_name;

select trigger_name, event_object_table
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in (
    'pm_stakeholders',
    'pm_riesgos',
    'pm_dependencias'
  )
order by event_object_table, trigger_name;

select policyname, tablename
from pg_policies
where schemaname = 'public'
  and tablename in (
    'pm_stakeholders',
    'pm_riesgos',
    'pm_dependencias'
  )
order by tablename, policyname;
```
