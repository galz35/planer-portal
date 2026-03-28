-- =============================================
-- Migration: Missing SPs for Task Management
-- Target: sp_Tarea_GestionarAvance_rust, sp_Tarea_EliminarAvance_rust, sp_Tarea_ActualizarParticipantes_rust
-- =============================================

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_GestionarAvance_rust')
    DROP PROCEDURE dbo.sp_Tarea_GestionarAvance_rust;
GO

CREATE PROCEDURE dbo.sp_Tarea_GestionarAvance_rust
    @idTarea INT,
    @idUsuario INT,
    @progreso FLOAT,
    @comentario NVARCHAR(MAX),
    @esCompleta BIT
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_GestionarAvance @idTarea, @idUsuario, @progreso, @comentario, @esCompleta;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_EliminarAvance_rust')
    DROP PROCEDURE dbo.sp_Tarea_EliminarAvance_rust;
GO

CREATE PROCEDURE dbo.sp_Tarea_EliminarAvance_rust
    @idLog INT
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_EliminarAvance @idLog;
END;
GO

IF EXISTS (SELECT 1 FROM sys.procedures WHERE name = 'sp_Tarea_ActualizarParticipantes_rust')
    DROP PROCEDURE dbo.sp_Tarea_ActualizarParticipantes_rust;
GO

CREATE PROCEDURE dbo.sp_Tarea_ActualizarParticipantes_rust
    @idTarea INT,
    @participantesCSV NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_ActualizarParticipantes @idTarea, @participantesCSV;
END;
GO
