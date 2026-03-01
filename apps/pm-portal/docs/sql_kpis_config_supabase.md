# SQL de configuración KPI para Portal PM

Ejecutar manualmente en Supabase SQL Editor.

## 1) Tabla de configuración de KPIs

```sql
create table if not exists public.kpis_config (
  id uuid primary key default gen_random_uuid(),
  clave_kpi text not null unique,
  nombre text not null,
  unidad text not null check (unidad in ('conteo', 'porcentaje')),
  meta_7 numeric null,
  meta_30 numeric null,
  meta_90 numeric null,
  umbral_ok numeric null,
  umbral_atencion numeric null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_kpis_config_updated_at
before update on public.kpis_config
for each row
execute procedure establecer_updated_at();
```

## 2) Activar RLS

```sql
alter table public.kpis_config enable row level security;
```

## 3) Policies RLS

Lectura para `lector`, `editor`, `admin`:

```sql
create policy lectura_kpis_config_lector_o_superior
on public.kpis_config
for select
using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));
```

Escritura para `editor` y `admin`:

```sql
create policy escritura_kpis_config_editor_o_admin
on public.kpis_config
for all
using (public.rol_actual_usuario() in ('editor', 'admin'))
with check (public.rol_actual_usuario() in ('editor', 'admin'));
```

## 4) Seed opcional de claves existentes (sin inventar eventos)

```sql
insert into public.kpis_config (
  clave_kpi,
  nombre,
  unidad,
  meta_7,
  meta_30,
  meta_90,
  umbral_ok,
  umbral_atencion,
  activo
)
values
  ('activacion_porcentaje', 'Activación', 'porcentaje', null, null, null, null, null, true),
  ('ventas_completadas', 'Ventas completadas', 'conteo', null, null, null, null, null, true),
  ('productos_creados', 'Productos creados', 'conteo', null, null, null, null, null, true),
  ('clientes_creados', 'Clientes creados', 'conteo', null, null, null, null, null, true),
  ('importacion_realizada', 'Importación realizada', 'conteo', null, null, null, null, null, true),
  ('usuarios_activos', 'Usuarios activos', 'conteo', null, null, null, null, null, true)
on conflict (clave_kpi)
do update set
  nombre = excluded.nombre,
  unidad = excluded.unidad,
  activo = excluded.activo,
  updated_at = now();
```

## 5) Nota de despliegue en Cloudflare Pages (Functions)

Configurar secretos en el proyecto `pm-portal`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POSTHOG_HOST`
- `POSTHOG_PROJECT_ID`
- `POSTHOG_PERSONAL_API_KEY`
