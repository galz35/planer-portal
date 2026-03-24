
-- ========================================================
-- SP: ASIGNAR TAREAS HUÉRFANAS A SUS CREADORES (MANTENIMIENTO)
-- Fecha: 2026-03-02
-- Descripción: Identifica tareas que no tienen un responsable 
--              asignado y las asigna automáticamente al idCreador.
-- ========================================================

-- Primero, una consulta para ver cuántas hay (informativo)
/*
SELECT t.idTarea, t.nombre, t.idCreador, u.nombre as creador
FROM p_Tareas t
LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
LEFT JOIN p_Usuarios u ON t.idCreador = u.idUsuario
WHERE t.activo = 1 
  AND ta.idUsuario IS NULL
  AND t.idCreador IS NOT NULL;
*/

-- Ejecutar corrección
INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, fechaAsignacion, carnet)
SELECT 
    t.idTarea, 
    t.idCreador, 
    'Responsable', 
    GETDATE(),
    u.carnet
FROM p_Tareas t
LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
INNER JOIN p_Usuarios u ON t.idCreador = u.idUsuario
WHERE t.activo = 1 
  AND ta.idUsuario IS NULL
  AND t.idCreador IS NOT NULL;

GO
