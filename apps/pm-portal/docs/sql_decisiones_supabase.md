# SQL Decisiones Portal PM

Ejecutar en Supabase SQL Editor.

## Tabla de decisiones (ADR PM)

```sql
create table if not exists public.pm_decisiones (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  contexto text not null,
  decision text not null,
  alternativas text not null,
  impacto text not null,
  estado_codigo text not null,
  owner text null,
  fecha_decision date not null,
  links text[] not null default '{}',
  tags text[] not null default '{}',
  iniciativa_id uuid null references public.iniciativas (id) on delete set null,
  entrega_id uuid null references public.entregas (id) on delete set null,
  ejecucion_validacion_id uuid null references public.pm_ejecuciones_validacion (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_pm_decisiones_estado on public.pm_decisiones (estado_codigo);
create index if not exists idx_pm_decisiones_fecha on public.pm_decisiones (fecha_decision desc);
create index if not exists idx_pm_decisiones_iniciativa on public.pm_decisiones (iniciativa_id);
create index if not exists idx_pm_decisiones_entrega on public.pm_decisiones (entrega_id);
create index if not exists idx_pm_decisiones_ejecucion_validacion on public.pm_decisiones (ejecucion_validacion_id);
```

## Trigger `updated_at`

```sql
create trigger trg_pm_decisiones_updated_at
before update on public.pm_decisiones
for each row execute procedure establecer_updated_at();
```

## RLS y políticas

```sql
alter table public.pm_decisiones enable row level security;

create policy pm_decisiones_select
on public.pm_decisiones for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_decisiones_write_editor_admin
on public.pm_decisiones for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));
```
