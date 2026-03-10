# SQL Fase 2 Portal PM: Discovery

Ejecutar en Supabase SQL Editor despues de los scripts base del portal y despues de Fase 1 de estrategia/trazabilidad.

## 1) Modulo nuevo en catalogo

```sql
insert into public.pm_catalogo_modulos (codigo, nombre, descripcion, orden, activo)
values ('discovery', 'Discovery', 'Insights, problemas, investigaciones, segmentos e hipotesis discovery', 37, true)
on conflict (codigo)
do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  orden = excluded.orden,
  activo = excluded.activo,
  updated_at = now();
```

## 2) Tablas principales de discovery

```sql
create table if not exists public.pm_segmentos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text null,
  necesidades text null,
  dolores text null,
  contexto text null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pm_insights (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descripcion text not null,
  fuente text not null,
  tipo text not null,
  relevancia prioridad_registro not null default 'media',
  modulo_codigo text null references public.pm_catalogo_modulos (codigo) on delete set null,
  segmento_id uuid null references public.pm_segmentos (id) on delete set null,
  evidencia_url text null,
  estado estado_registro not null default 'pendiente',
  owner text null,
  fecha_hallazgo date not null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pm_problemas_oportunidades (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  titulo text not null,
  descripcion text not null,
  impacto text not null,
  prioridad prioridad_registro not null default 'media',
  segmento_id uuid null references public.pm_segmentos (id) on delete set null,
  modulo_codigo text null references public.pm_catalogo_modulos (codigo) on delete set null,
  estado estado_registro not null default 'pendiente',
  owner text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_pm_problemas_oportunidades_tipo
    check (tipo in ('problema', 'oportunidad'))
);

create table if not exists public.pm_investigaciones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  tipo_investigacion text not null,
  fecha_investigacion date not null,
  segmento_id uuid null references public.pm_segmentos (id) on delete set null,
  participantes_resumen text not null,
  resumen text not null,
  hallazgos text not null,
  conclusion text not null,
  evidencia_url text null,
  estado estado_registro not null default 'pendiente',
  owner text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pm_hipotesis_discovery (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  problema_id uuid null references public.pm_problemas_oportunidades (id) on delete set null,
  hipotesis text not null,
  cambio_propuesto text not null,
  resultado_esperado text not null,
  criterio_exito text not null,
  prioridad prioridad_registro not null default 'media',
  estado estado_registro not null default 'pendiente',
  owner text null,
  evidencia_url text null,
  notas text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 3) Tablas relacionales nuevas

```sql
create table if not exists public.pm_rel_insight_problema (
  id uuid primary key default gen_random_uuid(),
  insight_id uuid not null references public.pm_insights (id) on delete cascade,
  problema_oportunidad_id uuid not null references public.pm_problemas_oportunidades (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_pm_rel_insight_problema unique (insight_id, problema_oportunidad_id)
);

create table if not exists public.pm_rel_investigacion_insight (
  id uuid primary key default gen_random_uuid(),
  investigacion_id uuid not null references public.pm_investigaciones (id) on delete cascade,
  insight_id uuid not null references public.pm_insights (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_pm_rel_investigacion_insight unique (investigacion_id, insight_id)
);

create table if not exists public.pm_rel_hipotesis_discovery_iniciativa (
  id uuid primary key default gen_random_uuid(),
  hipotesis_discovery_id uuid not null references public.pm_hipotesis_discovery (id) on delete cascade,
  iniciativa_id uuid not null references public.iniciativas (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_pm_rel_hipotesis_discovery_iniciativa unique (hipotesis_discovery_id, iniciativa_id)
);

create table if not exists public.pm_rel_problema_objetivo_estrategico (
  id uuid primary key default gen_random_uuid(),
  problema_oportunidad_id uuid not null references public.pm_problemas_oportunidades (id) on delete cascade,
  objetivo_estrategico_id uuid not null references public.pm_objetivos_estrategicos (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_pm_rel_problema_objetivo_estrategico unique (problema_oportunidad_id, objetivo_estrategico_id)
);

create table if not exists public.pm_rel_insight_decision (
  id uuid primary key default gen_random_uuid(),
  insight_id uuid not null references public.pm_insights (id) on delete cascade,
  decision_id uuid not null references public.pm_decisiones (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_pm_rel_insight_decision unique (insight_id, decision_id)
);
```

## 4) Indices de consulta

```sql
create index if not exists idx_pm_segmentos_activo_nombre
  on public.pm_segmentos (activo, nombre);

create index if not exists idx_pm_insights_fecha_estado
  on public.pm_insights (fecha_hallazgo desc, estado, relevancia);

create index if not exists idx_pm_insights_segmento
  on public.pm_insights (segmento_id);

create index if not exists idx_pm_insights_modulo
  on public.pm_insights (modulo_codigo);

create index if not exists idx_pm_problemas_oportunidades_tipo_estado
  on public.pm_problemas_oportunidades (tipo, estado, prioridad);

create index if not exists idx_pm_problemas_oportunidades_segmento
  on public.pm_problemas_oportunidades (segmento_id);

create index if not exists idx_pm_problemas_oportunidades_modulo
  on public.pm_problemas_oportunidades (modulo_codigo);

create index if not exists idx_pm_investigaciones_fecha_estado
  on public.pm_investigaciones (fecha_investigacion desc, estado);

create index if not exists idx_pm_investigaciones_segmento
  on public.pm_investigaciones (segmento_id);

create index if not exists idx_pm_hipotesis_discovery_estado_prioridad
  on public.pm_hipotesis_discovery (estado, prioridad);

create index if not exists idx_pm_hipotesis_discovery_problema
  on public.pm_hipotesis_discovery (problema_id);

create index if not exists idx_pm_rel_insight_problema_insight
  on public.pm_rel_insight_problema (insight_id);

create index if not exists idx_pm_rel_insight_problema_problema
  on public.pm_rel_insight_problema (problema_oportunidad_id);

create index if not exists idx_pm_rel_investigacion_insight_investigacion
  on public.pm_rel_investigacion_insight (investigacion_id);

create index if not exists idx_pm_rel_investigacion_insight_insight
  on public.pm_rel_investigacion_insight (insight_id);

create index if not exists idx_pm_rel_hipotesis_discovery_iniciativa_hipotesis
  on public.pm_rel_hipotesis_discovery_iniciativa (hipotesis_discovery_id);

create index if not exists idx_pm_rel_hipotesis_discovery_iniciativa_iniciativa
  on public.pm_rel_hipotesis_discovery_iniciativa (iniciativa_id);

create index if not exists idx_pm_rel_problema_objetivo_estrategico_problema
  on public.pm_rel_problema_objetivo_estrategico (problema_oportunidad_id);

create index if not exists idx_pm_rel_problema_objetivo_estrategico_objetivo
  on public.pm_rel_problema_objetivo_estrategico (objetivo_estrategico_id);

create index if not exists idx_pm_rel_insight_decision_insight
  on public.pm_rel_insight_decision (insight_id);

create index if not exists idx_pm_rel_insight_decision_decision
  on public.pm_rel_insight_decision (decision_id);
```

## 5) Triggers `updated_at`

```sql
drop trigger if exists trg_pm_segmentos_updated_at on public.pm_segmentos;
create trigger trg_pm_segmentos_updated_at
before update on public.pm_segmentos
for each row execute procedure establecer_updated_at();

drop trigger if exists trg_pm_insights_updated_at on public.pm_insights;
create trigger trg_pm_insights_updated_at
before update on public.pm_insights
for each row execute procedure establecer_updated_at();

drop trigger if exists trg_pm_problemas_oportunidades_updated_at on public.pm_problemas_oportunidades;
create trigger trg_pm_problemas_oportunidades_updated_at
before update on public.pm_problemas_oportunidades
for each row execute procedure establecer_updated_at();

drop trigger if exists trg_pm_investigaciones_updated_at on public.pm_investigaciones;
create trigger trg_pm_investigaciones_updated_at
before update on public.pm_investigaciones
for each row execute procedure establecer_updated_at();

drop trigger if exists trg_pm_hipotesis_discovery_updated_at on public.pm_hipotesis_discovery;
create trigger trg_pm_hipotesis_discovery_updated_at
before update on public.pm_hipotesis_discovery
for each row execute procedure establecer_updated_at();
```

## 6) RLS y policies

```sql
alter table public.pm_segmentos enable row level security;
alter table public.pm_insights enable row level security;
alter table public.pm_problemas_oportunidades enable row level security;
alter table public.pm_investigaciones enable row level security;
alter table public.pm_hipotesis_discovery enable row level security;
alter table public.pm_rel_insight_problema enable row level security;
alter table public.pm_rel_investigacion_insight enable row level security;
alter table public.pm_rel_hipotesis_discovery_iniciativa enable row level security;
alter table public.pm_rel_problema_objetivo_estrategico enable row level security;
alter table public.pm_rel_insight_decision enable row level security;

create policy pm_segmentos_select
on public.pm_segmentos for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_segmentos_write_editor_admin
on public.pm_segmentos for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_insights_select
on public.pm_insights for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_insights_write_editor_admin
on public.pm_insights for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_problemas_oportunidades_select
on public.pm_problemas_oportunidades for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_problemas_oportunidades_write_editor_admin
on public.pm_problemas_oportunidades for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_investigaciones_select
on public.pm_investigaciones for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_investigaciones_write_editor_admin
on public.pm_investigaciones for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_hipotesis_discovery_select
on public.pm_hipotesis_discovery for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_hipotesis_discovery_write_editor_admin
on public.pm_hipotesis_discovery for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_rel_insight_problema_select
on public.pm_rel_insight_problema for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_rel_insight_problema_write_editor_admin
on public.pm_rel_insight_problema for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_rel_investigacion_insight_select
on public.pm_rel_investigacion_insight for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_rel_investigacion_insight_write_editor_admin
on public.pm_rel_investigacion_insight for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_rel_hipotesis_discovery_iniciativa_select
on public.pm_rel_hipotesis_discovery_iniciativa for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_rel_hipotesis_discovery_iniciativa_write_editor_admin
on public.pm_rel_hipotesis_discovery_iniciativa for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_rel_problema_objetivo_estrategico_select
on public.pm_rel_problema_objetivo_estrategico for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_rel_problema_objetivo_estrategico_write_editor_admin
on public.pm_rel_problema_objetivo_estrategico for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_rel_insight_decision_select
on public.pm_rel_insight_decision for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_rel_insight_decision_write_editor_admin
on public.pm_rel_insight_decision for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));
```

## 7) Validaciones rapidas post-migracion

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'pm_segmentos',
    'pm_insights',
    'pm_problemas_oportunidades',
    'pm_investigaciones',
    'pm_hipotesis_discovery',
    'pm_rel_insight_problema',
    'pm_rel_investigacion_insight',
    'pm_rel_hipotesis_discovery_iniciativa',
    'pm_rel_problema_objetivo_estrategico',
    'pm_rel_insight_decision'
  )
order by table_name;

select codigo, nombre, orden
from public.pm_catalogo_modulos
where codigo = 'discovery';
```

## 8) Notas operativas

- Todas las relaciones son opcionales: no bloquean Roadmap, Estrategia ni Decisiones.
- La trazabilidad sigue siendo best effort desde la aplicacion y usa `pm_historial_cambios` existente.
- El script no modifica destructivamente tablas previas ni elimina policies existentes.