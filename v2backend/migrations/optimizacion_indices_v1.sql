/*
    OPTIMIZACIÓN URGENTE DE ÍNDICES V1
    Objetivo: Eliminar Table Scans en tablas principales.
    Fecha: 2026-01-26
*/

USE [Bdplaner];
GO
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
GO

-- 1. TareasAsignados (Corrección): La relación Responsable está en otra tabla
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_p_TareaAsignados_Carnet_Tarea' AND object_id = OBJECT_ID('p_TareaAsignados'))
BEGIN
    CREATE INDEX IX_p_TareaAsignados_Carnet_Tarea
    ON p_TareaAsignados (carnet, idTarea)
    INCLUDE (esResponsable);
    PRINT 'Creado IX_p_TareaAsignados_Carnet_Tarea';
END

-- 2. Tareas: Estado y Fechas (Para dashboards)
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_p_Tareas_Estado_FechaObjetivo' AND object_id = OBJECT_ID('p_Tareas'))
BEGIN
    CREATE INDEX IX_p_Tareas_Estado_FechaObjetivo
    ON p_Tareas (estado, fechaObjetivo)
    INCLUDE (idProyecto, activo, nombre); 
    PRINT 'Creado IX_p_Tareas_Estado_FechaObjetivo';
END

-- 3. Checkins: Búsqueda por Usuario y Fecha (Evita scan en p_Checkins)
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_p_Checkins_Usuario_Fecha' AND object_id = OBJECT_ID('p_Checkins'))
BEGIN
    CREATE INDEX IX_p_Checkins_Usuario_Fecha
    ON p_Checkins (usuarioCarnet, fecha); -- Clave compuesta
    PRINT 'Creado IX_p_Checkins_Usuario_Fecha';
END

-- 4. Usuarios: Búsqueda por Carnet (Fundamental para Auth y Visibilidad)
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_p_Usuarios_Carnet' AND object_id = OBJECT_ID('p_Usuarios'))
BEGIN
    -- Nota: Si carnet ya es UNIQUE, esto sobra. Pero por si acaso.
    CREATE INDEX IX_p_Usuarios_Carnet
    ON p_Usuarios (carnet)
    INCLUDE (idUsuario, nombre, correo, idRol, activo);
    PRINT 'Creado IX_p_Usuarios_Carnet';
END

-- 5. Proyectos: Ordenamiento por Fecha (Paginación)
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_p_Proyectos_FechaCreacion' AND object_id = OBJECT_ID('p_Proyectos'))
BEGIN
    CREATE INDEX IX_p_Proyectos_FechaCreacion
    ON p_Proyectos (fechaCreacion DESC)
    INCLUDE (nombre, descripcion, estado);
    PRINT 'Creado IX_p_Proyectos_FechaCreacion';
END

-- 6. Auditoría: Consultas recientes (Baja prioridad pero útil si crece)
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_p_Auditoria_Fecha' AND object_id = OBJECT_ID('p_Auditoria'))
BEGIN
    CREATE INDEX IX_p_Auditoria_Fecha
    ON p_Auditoria (fecha DESC);
    PRINT 'Creado IX_p_Auditoria_Fecha';
END

PRINT '✅ Optimización de índices completada.';
GO
