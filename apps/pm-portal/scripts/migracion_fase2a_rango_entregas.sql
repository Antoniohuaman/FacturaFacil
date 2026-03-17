-- =============================================================================
-- MIGRACIÓN FASE 2A — RANGO TEMPORAL ENTREGAS
-- Descripción: Agrega soporte de fechas opcionales a entregas (rango inicio-fin)
-- Tabla entregas: fecha_inicio, fecha_fin
-- Tipo: Retrocompatible. Columnas nullables sin default destructivo.
-- Requiere backfill: NO. Los registros existentes quedan con NULL.
-- =============================================================================

ALTER TABLE entregas
  ADD COLUMN IF NOT EXISTS fecha_inicio DATE NULL,
  ADD COLUMN IF NOT EXISTS fecha_fin DATE NULL;

-- =============================================================================
-- VERIFICACIÓN (ejecutar después para confirmar)
-- =============================================================================

-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'entregas'
--   AND column_name IN ('fecha_inicio', 'fecha_fin')
-- ORDER BY column_name;
