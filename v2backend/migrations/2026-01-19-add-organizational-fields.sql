-- Migración: Agregar campos organizacionales a Planes de Trabajo
-- Fecha: 2026-01-19

-- Agregar columnas organizacionales a p_PlanesTrabajo
ALTER TABLE "p_PlanesTrabajo" 
ADD COLUMN IF NOT EXISTS "area" VARCHAR(200),
ADD COLUMN IF NOT EXISTS "subgerencia" VARCHAR(200),
ADD COLUMN IF NOT EXISTS "gerencia" VARCHAR(200);

-- Comentarios para documentación
COMMENT ON COLUMN "p_PlanesTrabajo"."area" IS 'Área organizacional (primernivel del RRHH)';
COMMENT ON COLUMN "p_PlanesTrabajo"."subgerencia" IS 'Subgerencia organizacional (segundo_nivel del RRHH)';
COMMENT ON COLUMN "p_PlanesTrabajo"."gerencia" IS 'Gerencia organizacional (tercer_nivel del RRHH)';

-- Nota: La columna 'tipo' ya existe en p_Tareas desde la creación inicial
-- Si no existe, descomentar la siguiente línea:
-- ALTER TABLE "p_Tareas" ADD COLUMN IF NOT EXISTS "tipo" VARCHAR(50) DEFAULT 'Administrativa';
