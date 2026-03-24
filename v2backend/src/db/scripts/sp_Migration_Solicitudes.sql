-- =============================================
-- MIGRACIÓN CLARITY: SOLICITUDES DE CAMBIO
-- Fecha: 2026-01-25
-- Descripción: Tabla para flujo de aprobación en proyectos estratégicos
-- =============================================

IF OBJECT_ID('p_SolicitudesCambio', 'U') IS NULL
BEGIN
    CREATE TABLE p_SolicitudesCambio (
        idSolicitud INT IDENTITY(1,1) PRIMARY KEY,
        idTarea INT NOT NULL,
        idUsuarioSolicitante INT NOT NULL,
        campo NVARCHAR(50) NOT NULL,
        valorAnterior NVARCHAR(MAX),
        valorNuevo NVARCHAR(MAX),
        motivo NVARCHAR(MAX),
        estado NVARCHAR(20) DEFAULT 'Pendiente', -- Pendiente, Aprobado, Rechazado
        fechaSolicitud DATETIME DEFAULT GETDATE(),
        fechaResolucion DATETIME,
        idUsuarioResolutor INT,
        comentarioResolucion NVARCHAR(MAX),
        
        CONSTRAINT FK_Solicitudes_Tareas FOREIGN KEY (idTarea) REFERENCES p_Tareas(idTarea),
        CONSTRAINT FK_Solicitudes_Usuario FOREIGN KEY (idUsuarioSolicitante) REFERENCES p_Usuarios(idUsuario)
    );
    
    CREATE INDEX IX_Solicitudes_Tarea ON p_SolicitudesCambio(idTarea);
    CREATE INDEX IX_Solicitudes_Estado ON p_SolicitudesCambio(estado);
END
GO
