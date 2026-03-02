# SQL Auditorías Portal PM

Ejecutar en Supabase SQL Editor.

## Catálogo de tipos de auditoría

```sql
create table if not exists public.pm_catalogo_tipos_auditoria (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  descripcion text null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## Tablas operativas de auditoría y hallazgos

```sql
create table if not exists public.pm_auditorias (
  id uuid primary key default gen_random_uuid(),
  tipo_auditoria_codigo text not null,
  alcance text not null,
  checklist text not null,
  evidencias text not null,
  responsable text null,
  estado_codigo text not null,
  fecha_auditoria date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_auditorias_tipo_fk
    foreign key (tipo_auditoria_codigo)
    references public.pm_catalogo_tipos_auditoria (codigo)
    deferrable initially immediate
);

create table if not exists public.pm_hallazgos_auditoria (
  id uuid primary key default gen_random_uuid(),
  auditoria_id uuid not null references public.pm_auditorias (id) on delete cascade,
  titulo text not null,
  descripcion text not null,
  severidad_codigo text not null,
  estado_codigo text not null,
  modulo_id uuid null references public.pm_catalogo_modulos (id) on delete set null,
  decision_id uuid null references public.pm_decisiones (id) on delete set null,
  ejecucion_validacion_id uuid null references public.pm_ejecuciones_validacion (id) on delete set null,
  evidencia_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pm_hallazgos_auditoria_severidad_fk
    foreign key (severidad_codigo)
    references public.pm_catalogo_severidades (codigo)
    deferrable initially immediate
);

create index if not exists idx_pm_auditorias_fecha on public.pm_auditorias (fecha_auditoria desc);
create index if not exists idx_pm_auditorias_estado on public.pm_auditorias (estado_codigo);
create index if not exists idx_pm_hallazgos_auditoria_auditoria on public.pm_hallazgos_auditoria (auditoria_id);
create index if not exists idx_pm_hallazgos_auditoria_severidad on public.pm_hallazgos_auditoria (severidad_codigo);
create index if not exists idx_pm_hallazgos_auditoria_estado on public.pm_hallazgos_auditoria (estado_codigo);
```

## Triggers `updated_at`

```sql
create trigger trg_pm_catalogo_tipos_auditoria_updated_at
before update on public.pm_catalogo_tipos_auditoria
for each row execute procedure establecer_updated_at();

create trigger trg_pm_auditorias_updated_at
before update on public.pm_auditorias
for each row execute procedure establecer_updated_at();

create trigger trg_pm_hallazgos_auditoria_updated_at
before update on public.pm_hallazgos_auditoria
for each row execute procedure establecer_updated_at();
```

## RLS y políticas

```sql
alter table public.pm_catalogo_tipos_auditoria enable row level security;
alter table public.pm_auditorias enable row level security;
alter table public.pm_hallazgos_auditoria enable row level security;

create policy pm_catalogo_tipos_auditoria_select
on public.pm_catalogo_tipos_auditoria for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_catalogo_tipos_auditoria_write_admin
on public.pm_catalogo_tipos_auditoria for all
using (public.rol_actual_usuario() = 'admin')
with check (public.rol_actual_usuario() = 'admin');

create policy pm_auditorias_select
on public.pm_auditorias for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_auditorias_write_editor_admin
on public.pm_auditorias for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy pm_hallazgos_auditoria_select
on public.pm_hallazgos_auditoria for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_hallazgos_auditoria_write_editor_admin
on public.pm_hallazgos_auditoria for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));
```

## Seed base de tipos

```sql
insert into public.pm_catalogo_tipos_auditoria (codigo, nombre, descripcion, activo)
values
  ('funcional', 'Funcional', 'Cobertura funcional del módulo', true),
  ('ux', 'UX', 'Evaluación de experiencia de usuario', true),
  ('seguridad', 'Seguridad', 'Revisión de controles y riesgos de seguridad', true),
  ('performance', 'Performance', 'Revisión de rendimiento y tiempos de respuesta', true),
  ('datos', 'Datos', 'Revisión de calidad y consistencia de datos', true)
on conflict (codigo)
do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  activo = excluded.activo,
  updated_at = now();
```
