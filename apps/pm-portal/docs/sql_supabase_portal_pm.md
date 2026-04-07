# SQL base para Portal PM en Supabase

Este script se ejecuta manualmente en Supabase SQL Editor.

## 1) Tipos y funciones auxiliares

```sql
create type rol_usuario as enum ('lector', 'editor', 'admin');
create type estado_registro as enum ('pendiente', 'en_progreso', 'completado');
create type prioridad_registro as enum ('baja', 'media', 'alta');

create or replace function establecer_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

## 2) Tablas

```sql
create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  correo text not null unique,
  rol rol_usuario not null default 'lector',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.objetivos (
  id uuid primary key default gen_random_uuid(),
  orden integer not null default 0,
  nombre text not null,
  descripcion text not null,
  estado estado_registro not null default 'pendiente',
  prioridad prioridad_registro not null default 'media',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.iniciativas (
  id uuid primary key default gen_random_uuid(),
  orden integer not null default 0,
  objetivo_id uuid references public.objetivos (id) on delete set null,
  nombre text not null,
  descripcion text not null,
  alcance numeric not null check (alcance > 0),
  impacto numeric not null check (impacto > 0),
  confianza numeric not null check (confianza > 0),
  esfuerzo numeric not null check (esfuerzo > 0),
  rice numeric not null default 0,
  estado estado_registro not null default 'pendiente',
  prioridad prioridad_registro not null default 'media',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entregas (
  id uuid primary key default gen_random_uuid(),
  orden integer not null default 0,
  iniciativa_id uuid references public.iniciativas (id) on delete set null,
  nombre text not null,
  descripcion text not null,
  fecha_objetivo date,
  estado estado_registro not null default 'pendiente',
  prioridad prioridad_registro not null default 'media',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.matriz_valor (
  id uuid primary key default gen_random_uuid(),
  iniciativa_id uuid not null references public.iniciativas (id) on delete cascade,
  titulo text not null,
  valor_negocio numeric not null check (valor_negocio > 0),
  esfuerzo numeric not null check (esfuerzo > 0),
  riesgo numeric not null check (riesgo > 0),
  puntaje_valor numeric not null default 0,
  estado estado_registro not null default 'pendiente',
  prioridad prioridad_registro not null default 'media',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 2.1) Migracion de orden manual roadmap

```sql
alter table public.objetivos add column if not exists orden integer not null default 0;
alter table public.iniciativas add column if not exists orden integer not null default 0;
alter table public.entregas add column if not exists orden integer not null default 0;

with objetivos_ordenados as (
  select id, row_number() over (order by updated_at desc, created_at desc, id) * 10 as nuevo_orden
  from public.objetivos
)
update public.objetivos objetivo
set orden = objetivos_ordenados.nuevo_orden
from objetivos_ordenados
where objetivos_ordenados.id = objetivo.id
  and coalesce(objetivo.orden, 0) = 0;

with iniciativas_ordenadas as (
  select id, row_number() over (partition by objetivo_id order by updated_at desc, created_at desc, id) * 10 as nuevo_orden
  from public.iniciativas
)
update public.iniciativas iniciativa
set orden = iniciativas_ordenadas.nuevo_orden
from iniciativas_ordenadas
where iniciativas_ordenadas.id = iniciativa.id
  and coalesce(iniciativa.orden, 0) = 0;

with entregas_ordenadas as (
  select id, row_number() over (partition by iniciativa_id order by updated_at desc, created_at desc, id) * 10 as nuevo_orden
  from public.entregas
)
update public.entregas entrega
set orden = entregas_ordenadas.nuevo_orden
from entregas_ordenadas
where entregas_ordenadas.id = entrega.id
  and coalesce(entrega.orden, 0) = 0;

create index if not exists idx_objetivos_orden on public.objetivos (orden);
create index if not exists idx_iniciativas_objetivo_orden on public.iniciativas (objetivo_id, orden);
create index if not exists idx_entregas_iniciativa_orden on public.entregas (iniciativa_id, orden);
```

## 3) Triggers updated_at

```sql
create trigger trg_perfiles_updated_at
before update on public.perfiles
for each row
execute procedure establecer_updated_at();

create trigger trg_objetivos_updated_at
before update on public.objetivos
for each row
execute procedure establecer_updated_at();

create trigger trg_iniciativas_updated_at
before update on public.iniciativas
for each row
execute procedure establecer_updated_at();

create trigger trg_entregas_updated_at
before update on public.entregas
for each row
execute procedure establecer_updated_at();

create trigger trg_matriz_valor_updated_at
before update on public.matriz_valor
for each row
execute procedure establecer_updated_at();
```

## 4) Funciones RLS por rol

```sql
create or replace function public.rol_actual_usuario()
returns rol_usuario
language sql
stable
as $$
  select p.rol
  from public.perfiles p
  where p.id = auth.uid()
$$;
```

## 5) Activar RLS

```sql
alter table public.perfiles enable row level security;
alter table public.objetivos enable row level security;
alter table public.iniciativas enable row level security;
alter table public.entregas enable row level security;
alter table public.matriz_valor enable row level security;
```

## 6) Policies base por tabla

### Perfiles

```sql
create policy perfiles_select_propios
on public.perfiles
for select
using (id = auth.uid());

create policy perfiles_update_admin
on public.perfiles
for update
using (public.rol_actual_usuario() = 'admin')
with check (public.rol_actual_usuario() = 'admin');
```

### Objetivos, iniciativas, entregas, matriz_valor

```sql
create policy lectura_rol_lector_o_superior_objetivos
on public.objetivos
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_rol_editor_o_admin_objetivos
on public.objetivos
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_rol_lector_o_superior_iniciativas
on public.iniciativas
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_rol_editor_o_admin_iniciativas
on public.iniciativas
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_rol_lector_o_superior_entregas
on public.entregas
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_rol_editor_o_admin_entregas
on public.entregas
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));

create policy lectura_rol_lector_o_superior_matriz_valor
on public.matriz_valor
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

create policy escritura_rol_editor_o_admin_matriz_valor
on public.matriz_valor
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));
```

## 7) Crear primer usuario admin

1. Registrar usuario por Auth en Supabase (correo y contraseña).
2. Buscar su UUID en tabla auth.users.
3. Ejecutar:

```sql
insert into public.perfiles (id, correo, rol)
values ('UUID_DEL_USUARIO', 'correo@empresa.com', 'admin')
on conflict (id) do update set rol = excluded.rol;
```
