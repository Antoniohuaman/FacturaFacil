  # SQL Validaciones Portal PM

  Ejecutar en Supabase SQL Editor.

  ## Tablas de catálogo y operación

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

  create table if not exists public.pm_catalogo_estados (
    id uuid primary key default gen_random_uuid(),
    ambito text not null,
    codigo text not null,
    nombre text not null,
    orden integer not null default 1,
    activo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (ambito, codigo)
  );

  create table if not exists public.pm_plantillas_validacion (
    id uuid primary key default gen_random_uuid(),
    modulo_id uuid not null references public.pm_catalogo_modulos (id) on delete restrict,
    nombre text not null,
    criterios text not null,
    evidencias_esperadas text not null,
    activo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table if not exists public.pm_planes_validacion (
    id uuid primary key default gen_random_uuid(),
    modulo_id uuid not null references public.pm_catalogo_modulos (id) on delete restrict,
    plantilla_id uuid null references public.pm_plantillas_validacion (id) on delete set null,
    nombre text not null,
    criterios text not null,
    evidencias_esperadas text not null,
    owner text null,
    estado_codigo text not null,
    fecha_inicio date null,
    fecha_fin date null,
    notas text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create table if not exists public.pm_ejecuciones_validacion (
    id uuid primary key default gen_random_uuid(),
    plan_validacion_id uuid not null references public.pm_planes_validacion (id) on delete cascade,
    modulo_id uuid not null references public.pm_catalogo_modulos (id) on delete restrict,
    fecha_ejecucion date not null,
    rango_desde date null,
    rango_hasta date null,
    resultado text not null,
    hallazgos text not null,
    evidencia_url text null,
    aprobador text null,
    estado_codigo text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );

  create index if not exists idx_pm_planes_validacion_modulo on public.pm_planes_validacion (modulo_id);
  create index if not exists idx_pm_planes_validacion_estado on public.pm_planes_validacion (estado_codigo);
  create index if not exists idx_pm_ejecuciones_validacion_plan on public.pm_ejecuciones_validacion (plan_validacion_id);
  create index if not exists idx_pm_ejecuciones_validacion_modulo on public.pm_ejecuciones_validacion (modulo_id);
  create index if not exists idx_pm_ejecuciones_validacion_estado on public.pm_ejecuciones_validacion (estado_codigo);
  ```

  ## Triggers `updated_at`

  ```sql
  create trigger trg_pm_catalogo_modulos_updated_at
  before update on public.pm_catalogo_modulos
  for each row execute procedure establecer_updated_at();

  create trigger trg_pm_catalogo_estados_updated_at
  before update on public.pm_catalogo_estados
  for each row execute procedure establecer_updated_at();

  create trigger trg_pm_plantillas_validacion_updated_at
  before update on public.pm_plantillas_validacion
  for each row execute procedure establecer_updated_at();

  create trigger trg_pm_planes_validacion_updated_at
  before update on public.pm_planes_validacion
  for each row execute procedure establecer_updated_at();

  create trigger trg_pm_ejecuciones_validacion_updated_at
  before update on public.pm_ejecuciones_validacion
  for each row execute procedure establecer_updated_at();
  ```

  ## RLS y políticas

  ```sql
  alter table public.pm_catalogo_modulos enable row level security;
  alter table public.pm_catalogo_estados enable row level security;
  alter table public.pm_plantillas_validacion enable row level security;
  alter table public.pm_planes_validacion enable row level security;
  alter table public.pm_ejecuciones_validacion enable row level security;

  create policy pm_catalogo_modulos_select
  on public.pm_catalogo_modulos for select
  using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

  create policy pm_catalogo_modulos_write_admin
  on public.pm_catalogo_modulos for all
  using (public.rol_actual_usuario() = 'admin')
  with check (public.rol_actual_usuario() = 'admin');

  create policy pm_catalogo_estados_select
  on public.pm_catalogo_estados for select
  using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

  create policy pm_catalogo_estados_write_admin
  on public.pm_catalogo_estados for all
  using (public.rol_actual_usuario() = 'admin')
  with check (public.rol_actual_usuario() = 'admin');

  create policy pm_plantillas_validacion_select
  on public.pm_plantillas_validacion for select
  using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

  create policy pm_plantillas_validacion_write_editor_admin
  on public.pm_plantillas_validacion for all
  using (public.rol_actual_usuario() in ('editor', 'admin'))
  with check (public.rol_actual_usuario() in ('editor', 'admin'));

  create policy pm_planes_validacion_select
  on public.pm_planes_validacion for select
  using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

  create policy pm_planes_validacion_write_editor_admin
  on public.pm_planes_validacion for all
  using (public.rol_actual_usuario() in ('editor', 'admin'))
  with check (public.rol_actual_usuario() in ('editor', 'admin'));

  create policy pm_ejecuciones_validacion_select
  on public.pm_ejecuciones_validacion for select
  using (public.rol_actual_usuario() in ('lector', 'editor', 'admin'));

  create policy pm_ejecuciones_validacion_write_editor_admin
  on public.pm_ejecuciones_validacion for all
  using (public.rol_actual_usuario() in ('editor', 'admin'))
  with check (public.rol_actual_usuario() in ('editor', 'admin'));
  ```

  ## Seed base de catálogos

  ```sql
  insert into public.pm_catalogo_modulos (codigo, nombre, descripcion, orden, activo)
  values
    ('roadmap', 'Roadmap', 'Planificación estratégica y entregables', 10, true),
    ('matriz_valor', 'Matriz de valor', 'Priorización por valor/esfuerzo', 20, true),
    ('validacion', 'Validación', 'Hipótesis y resultados', 30, true),
    ('decisiones', 'Decisiones', 'Registro de decisiones PM/arquitectura', 40, true),
    ('auditorias', 'Auditorías', 'Evaluaciones de calidad y cumplimiento', 50, true),
    ('ajustes', 'Ajustes', 'Configuración operativa del portal PM', 60, true)
  on conflict (codigo)
  do update set
    nombre = excluded.nombre,
    descripcion = excluded.descripcion,
    orden = excluded.orden,
    activo = excluded.activo,
    updated_at = now();

  insert into public.pm_catalogo_estados (ambito, codigo, nombre, orden, activo)
  values
    ('validacion_plan', 'pendiente', 'Pendiente', 10, true),
    ('validacion_plan', 'en_progreso', 'En progreso', 20, true),
    ('validacion_plan', 'completado', 'Completado', 30, true),
    ('validacion_ejecucion', 'pendiente', 'Pendiente', 10, true),
    ('validacion_ejecucion', 'aprobado', 'Aprobado', 20, true),
    ('validacion_ejecucion', 'observado', 'Observado', 30, true),
    ('decision', 'propuesta', 'Propuesta', 10, true),
    ('decision', 'aprobada', 'Aprobada', 20, true),
    ('decision', 'deprecada', 'Deprecada', 30, true),
    ('auditoria', 'programada', 'Programada', 10, true),
    ('auditoria', 'en_curso', 'En curso', 20, true),
    ('auditoria', 'cerrada', 'Cerrada', 30, true),
    ('hallazgo', 'abierto', 'Abierto', 10, true),
    ('hallazgo', 'mitigado', 'Mitigado', 20, true),
    ('hallazgo', 'cerrado', 'Cerrado', 30, true)
  on conflict (ambito, codigo)
  do update set
    nombre = excluded.nombre,
    orden = excluded.orden,
    activo = excluded.activo,
    updated_at = now();
  ```
