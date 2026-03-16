-- =============================================================================
-- MIGRACIÓN FASE 1 — BASE TEMPORAL ROADMAP
-- Descripción: Agrega soporte de fechas opcionales a objetivos e iniciativas
-- Tabla objetivos: fecha_inicio, fecha_fin
-- Tabla iniciativas: fecha_inicio, fecha_fin
-- Tipo: Retrocompatible. Columnas nullables sin default destructivo.
-- Requiere backfill: NO. Los registros existentes quedan con NULL.
-- =============================================================================

ALTER TABLE objetivos
  ADD COLUMN IF NOT EXISTS fecha_inicio DATE NULL,
  ADD COLUMN IF NOT EXISTS fecha_fin DATE NULL;

ALTER TABLE iniciativas
  ADD COLUMN IF NOT EXISTS fecha_inicio DATE NULL,
  ADD COLUMN IF NOT EXISTS fecha_fin DATE NULL;

-- =============================================================================
-- VERIFICACIÓN (ejecutar después para confirmar)
-- =============================================================================

-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name IN ('objetivos', 'iniciativas')
--   AND column_name IN ('fecha_inicio', 'fecha_fin')
-- ORDER BY table_name, column_name;
