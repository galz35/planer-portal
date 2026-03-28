-- =============================================
-- Migration: Zero Inline SQL - Solicitudes Globales
-- Created: 2026-03-09
-- =============================================

-- 1. [sp_SolicitudCambio_Crear]
CREATE OR ALTER PROCEDURE [dbo].[sp_SolicitudCambio_Crear]
    @idTarea INT,
    @idUsuarioSolicitante INT,
    @campo NVARCHAR(100),
    @valorAnterior NVARCHAR(MAX),
    @valorNuevo NVARCHAR(MAX),
    @motivo NVARCHAR(MAX)
AS
BEGIN
    INSERT INTO p_SolicitudesCambio (idTarea, idUsuarioSolicitante, campo, valorAnterior, valorNuevo, motivo)
    OUTPUT INSERTED.*
    VALUES (@idTarea, @idUsuarioSolicitante, @campo, @valorAnterior, @valorNuevo, @motivo);
END
GO

-- 2. [sp_SolicitudCambio_ObtenerPendientes]
CREATE OR ALTER PROCEDURE [dbo].[sp_SolicitudCambio_ObtenerPendientes]
AS
BEGIN
    SELECT s.idSolicitud, s.idTarea, s.campo, s.valorNuevo, s.motivo, s.estado, s.fechaSolicitud,
           u.nombre as solicitante
    FROM p_SolicitudesCambio s
    LEFT JOIN p_Usuarios u ON s.idUsuarioSolicitante = u.idUsuario
    WHERE s.estado = 'Pendiente'
    ORDER BY s.fechaSolicitud DESC;
END
GO

-- 3. [sp_SolicitudCambio_Resolver]
CREATE OR ALTER PROCEDURE [dbo].[sp_SolicitudCambio_Resolver]
    @idSolicitud INT,
    @estado NVARCHAR(50),
    @idUsuarioResolutor INT,
    @comentarioResolucion NVARCHAR(MAX)
AS
BEGIN
    UPDATE p_SolicitudesCambio 
    SET estado = @estado, 
        idUsuarioResolutor = @idUsuarioResolutor, 
        fechaResolucion = GETDATE(), 
        comentarioResolucion = @comentarioResolucion
    OUTPUT INSERTED.*
    WHERE idSolicitud = @idSolicitud;
END
GO
