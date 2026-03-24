
-- 1. Agregar carnet a p_FocoDiario
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('p_FocoDiario') AND name = 'carnet')
BEGIN
    ALTER TABLE p_FocoDiario ADD carnet NVARCHAR(50);
END
GO
UPDATE fd SET fd.carnet = u.carnet FROM p_FocoDiario fd JOIN p_Usuarios u ON fd.idUsuario = u.idUsuario WHERE fd.carnet IS NULL OR fd.carnet = '';
GO

-- 2. Asegurar objetivos en p_PlanesTrabajo
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('p_PlanesTrabajo') AND name = 'objetivos')
BEGIN
    ALTER TABLE p_PlanesTrabajo ADD objetivos NVARCHAR(MAX);
END
GO

-- 3. Asegurar idPlan en p_Tareas (Para que el código no truene)
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('p_Tareas') AND name = 'idPlan')
BEGIN
    ALTER TABLE p_Tareas ADD idPlan INT;
END
GO

-- 4. Asegurar carnet en p_Proyectos ( creador y responsable ya fueron agregados pero por si acaso)
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

-- Sincronización masiva de Carnets
PRINT 'Sincronizando Carnets...';

UPDATE p SET p.creadorCarnet = u.carnet FROM p_Proyectos p JOIN p_Usuarios u ON p.idCreador = u.idUsuario WHERE p.creadorCarnet IS NULL OR p.creadorCarnet = '';
UPDATE p SET p.responsableCarnet = u.carnet FROM p_Proyectos p JOIN p_Usuarios u ON p.idResponsable = u.idUsuario WHERE p.responsableCarnet IS NULL OR p.responsableCarnet = '';

UPDATE t SET t.creadorCarnet = u.carnet FROM p_Tareas t JOIN p_Usuarios u ON t.idCreador = u.idUsuario WHERE t.creadorCarnet IS NULL OR t.creadorCarnet = '';
UPDATE t SET t.asignadoCarnet = u.carnet FROM p_Tareas t JOIN p_Usuarios u ON t.idAsignado = u.idUsuario WHERE t.asignadoCarnet IS NULL OR t.asignadoCarnet = '';

UPDATE b SET b.origenCarnet = u.carnet FROM p_Bloqueos b JOIN p_Usuarios u ON b.idOrigenUsuario = u.idUsuario WHERE b.origenCarnet IS NULL OR b.origenCarnet = '';
UPDATE b SET b.destinoCarnet = u.carnet FROM p_Bloqueos b JOIN p_Usuarios u ON b.idDestinoUsuario = u.idUsuario WHERE b.destinoCarnet IS NULL OR b.destinoCarnet = '';

UPDATE pt SET pt.carnet = u.carnet FROM p_PlanesTrabajo pt JOIN p_Usuarios u ON pt.idUsuario = u.idUsuario WHERE pt.carnet IS NULL OR pt.carnet = '';

GO
