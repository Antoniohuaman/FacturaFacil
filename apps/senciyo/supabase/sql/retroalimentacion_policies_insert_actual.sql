-- Estado reproducible actual de RLS/policies para la escritura de retroalimentación.
--
-- Este archivo refleja el estado funcional validado manualmente en Supabase para:
--   - public.retroalimentacion_estado_animo
--   - public.retroalimentacion_ideas
--   - public.retroalimentacion_calificaciones
--
-- Objetivo:
--   - Mantener RLS activo en las tres tablas.
--   - Permitir INSERT para los roles anon y authenticated con WITH CHECK (true).
--   - Reflejar el estado actual que permite escritura directa desde SenciYo con VITE_SUPABASE_ANON_KEY.
--
-- Alcance y límites:
--   - Este script NO se ejecuta automáticamente desde el repositorio.
--   - Estas policies son deliberadamente abiertas para INSERT y deben endurecerse en el repo oficial
--     si se requiere antiabuso, rate limiting o validaciones más restrictivas.
--   - Este archivo NO habilita SELECT público sobre las tablas de retroalimentación.
--   - La lectura para PM Portal debe mantenerse server-side mediante service role y
--     public.v_retroalimentacion_unificada.
--   - Si el entorno ya tiene policies equivalentes con otros nombres, revisar y consolidar manualmente
--     antes de aplicar este script para evitar duplicidad de reglas INSERT.

alter table if exists public.retroalimentacion_estado_animo enable row level security;
alter table if exists public.retroalimentacion_ideas enable row level security;
alter table if exists public.retroalimentacion_calificaciones enable row level security;

drop policy if exists retroalimentacion_estado_animo_insert_anon on public.retroalimentacion_estado_animo;
create policy retroalimentacion_estado_animo_insert_anon
  on public.retroalimentacion_estado_animo
  for insert
  to anon
  with check (true);

drop policy if exists retroalimentacion_estado_animo_insert_authenticated on public.retroalimentacion_estado_animo;
create policy retroalimentacion_estado_animo_insert_authenticated
  on public.retroalimentacion_estado_animo
  for insert
  to authenticated
  with check (true);

drop policy if exists retroalimentacion_ideas_insert_anon on public.retroalimentacion_ideas;
create policy retroalimentacion_ideas_insert_anon
  on public.retroalimentacion_ideas
  for insert
  to anon
  with check (true);

drop policy if exists retroalimentacion_ideas_insert_authenticated on public.retroalimentacion_ideas;
create policy retroalimentacion_ideas_insert_authenticated
  on public.retroalimentacion_ideas
  for insert
  to authenticated
  with check (true);

drop policy if exists retroalimentacion_calificaciones_insert_anon on public.retroalimentacion_calificaciones;
create policy retroalimentacion_calificaciones_insert_anon
  on public.retroalimentacion_calificaciones
  for insert
  to anon
  with check (true);

drop policy if exists retroalimentacion_calificaciones_insert_authenticated on public.retroalimentacion_calificaciones;
create policy retroalimentacion_calificaciones_insert_authenticated
  on public.retroalimentacion_calificaciones
  for insert
  to authenticated
  with check (true);