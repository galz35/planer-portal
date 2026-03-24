
-- 1. Agregar carnet a p_PlanesTrabajo (Legacy compatibility)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('p_PlanesTrabajo') AND name = 'carnet')
BEGIN
    ALTER TABLE p_PlanesTrabajo ADD carnet NVARCHAR(50);
END
GO

-- Sincronizar carnet en p_PlanesTrabajo
UPDATE pt
SET pt.carnet = u.carnet
FROM p_PlanesTrabajo pt
JOIN p_Usuarios u ON pt.idUsuario = u.idUsuario
WHERE pt.carnet IS NULL OR pt.carnet = '';
GO

-- 2. Agregar creadorCarnet y responsableCarnet a p_Proyectos
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('p_Proyectos') AND name = 'creadorCarnet')
BEGIN
    ALTER TABLE p_Proyectos ADD creadorCarnet NVARCHAR(50);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('p_Proyectos') AND name = 'responsableCarnet')
BEGIN
    ALTER TABLE p_Proyectos ADD responsableCarnet NVARCHAR(50);
END
GO

-- Sincronizar carnets en p_Proyectos
UPDATE p
SET p.creadorCarnet = u.carnet
FROM p_Proyectos p
JOIN p_Usuarios u ON p.idCreador = u.idUsuario
WHERE p.creadorCarnet IS NULL OR p.creadorCarnet = '';
GO

UPDATE p
SET p.responsableCarnet = u.carnet
FROM p_Proyectos p
JOIN p_Usuarios u ON p.idResponsable = u.idUsuario
WHERE p.responsableCarnet IS NULL OR p.responsableCarnet = '';
GO

-- 3. Asegurar carnet en p_TareaAsignados esté lleno
UPDATE ta
SET ta.carnet = u.carnet
FROM p_TareaAsignados ta
JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
WHERE ta.carnet IS NULL OR ta.carnet = '';
GO
