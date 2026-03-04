# SQL Planificación Portal PM

Ejecutar en Supabase SQL Editor en el orden indicado.

## 1) Catálogos de planificación

```sql
create table if not exists public.pm_catalogo_ventanas (
  id uuid primary key default gen_random_uuid(),
  etiqueta_visible text not null,
  tipo text not null default 'custom',
  anio integer null,
  orden integer not null default 100,
  fecha_inicio date null,
  fecha_fin date null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ck_pm_catalogo_ventanas_rango_fechas
    check (fecha_inicio is null or fecha_fin is null or fecha_inicio <= fecha_fin)
);

create table if not exists public.pm_catalogo_etapas (
  id uuid primary key default gen_random_uuid(),
  etiqueta_visible text not null,
  orden integer not null default 100,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 2) Extensión retrocompatible de tablas existentes

```sql
alter table public.iniciativas
  add column if not exists ventana_planificada_id uuid null references public.pm_catalogo_ventanas(id) on delete set null,
  add column if not exists etapa_id uuid null references public.pm_catalogo_etapas(id) on delete set null;

alter table public.entregas
  add column if not exists ventana_planificada_id uuid null references public.pm_catalogo_ventanas(id) on delete set null,
  add column if not exists ventana_real_id uuid null references public.pm_catalogo_ventanas(id) on delete set null,
  add column if not exists fecha_completado timestamptz null;
```

## 3) Índices para filtros y reportes

```sql
create index if not exists idx_pm_catalogo_ventanas_activo_orden
  on public.pm_catalogo_ventanas (activo, orden asc);

create index if not exists idx_pm_catalogo_ventanas_tipo_anio_orden
  on public.pm_catalogo_ventanas (tipo, anio, orden asc);

create index if not exists idx_pm_catalogo_ventanas_fechas
  on public.pm_catalogo_ventanas (fecha_inicio, fecha_fin);

create index if not exists idx_pm_catalogo_etapas_activo_orden
  on public.pm_catalogo_etapas (activo, orden asc);

create index if not exists idx_iniciativas_ventana_planificada
  on public.iniciativas (ventana_planificada_id);

create index if not exists idx_iniciativas_etapa
  on public.iniciativas (etapa_id);

create index if not exists idx_entregas_ventana_planificada
  on public.entregas (ventana_planificada_id);

create index if not exists idx_entregas_ventana_real
  on public.entregas (ventana_real_id);

create index if not exists idx_entregas_fecha_completado
  on public.entregas (fecha_completado);
```

## 4) Triggers `updated_at` para catálogos

```sql
drop trigger if exists trg_pm_catalogo_ventanas_updated_at on public.pm_catalogo_ventanas;
create trigger trg_pm_catalogo_ventanas_updated_at
before update on public.pm_catalogo_ventanas
for each row execute procedure establecer_updated_at();

drop trigger if exists trg_pm_catalogo_etapas_updated_at on public.pm_catalogo_etapas;
create trigger trg_pm_catalogo_etapas_updated_at
before update on public.pm_catalogo_etapas
for each row execute procedure establecer_updated_at();
```

## 5) Función derivadora por fecha y trigger de consistencia (opcional recomendado)

```sql
create or replace function public.pm_obtener_ventana_por_fecha(p_fecha timestamptz)
returns uuid
language sql
stable
as $$
  select v.id
  from public.pm_catalogo_ventanas v
  where v.activo = true
    and v.fecha_inicio is not null
    and v.fecha_fin is not null
    and (p_fecha at time zone 'utc')::date between v.fecha_inicio and v.fecha_fin
  order by coalesce(v.anio, 999999) asc, v.orden asc
  limit 1
$$;

create or replace function public.pm_entregas_autocompletar_real()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'completado' and new.fecha_completado is null then
    new.fecha_completado = now();
  end if;

  if new.estado = 'completado' and new.ventana_real_id is null and new.fecha_completado is not null then
    new.ventana_real_id = public.pm_obtener_ventana_por_fecha(new.fecha_completado);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_pm_entregas_autocompletar_real on public.entregas;
create trigger trg_pm_entregas_autocompletar_real
before insert or update on public.entregas
for each row execute procedure public.pm_entregas_autocompletar_real();
```

## 6) RLS y policies de catálogos (solo admin escribe)

```sql
alter table public.pm_catalogo_ventanas enable row level security;
alter table public.pm_catalogo_etapas enable row level security;

create policy pm_catalogo_ventanas_select
on public.pm_catalogo_ventanas for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_catalogo_ventanas_write_admin
on public.pm_catalogo_ventanas for all
using (public.rol_actual_usuario() = 'admin')
with check (public.rol_actual_usuario() = 'admin');

create policy pm_catalogo_etapas_select
on public.pm_catalogo_etapas for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy pm_catalogo_etapas_write_admin
on public.pm_catalogo_etapas for all
using (public.rol_actual_usuario() = 'admin')
with check (public.rol_actual_usuario() = 'admin');
```

## 7) Validaciones rápidas post-migración

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'iniciativas'
  and column_name in ('ventana_planificada_id', 'etapa_id');

select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'entregas'
  and column_name in ('ventana_planificada_id', 'ventana_real_id', 'fecha_completado');
```

## 8) Seed opcional mínimo (no obligatorio)

Preferible crear catálogos desde la UI de Ajustes para evitar acoplar etiquetas iniciales.