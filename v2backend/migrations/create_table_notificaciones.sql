
CREATE TABLE p_Notificaciones_Enviadas (
    idNotificacion INT IDENTITY(1,1) PRIMARY KEY,
    idUsuario INT NULL,
    carnet NVARCHAR(50) NULL,
    correo NVARCHAR(255) NOT NULL,
    tipo NVARCHAR(100) NOT NULL,
    asunto NVARCHAR(500) NOT NULL,
    idEntidad NVARCHAR(50) NULL,
    estado NVARCHAR(50) NOT NULL, -- 'ENVIADO', 'FALLIDO'
    error NVARCHAR(MAX) NULL,
    fechaEnvio DATETIME DEFAULT GETDATE()
);

-- Indices para búsqueda rápida
CREATE INDEX IX_Notificaciones_Carnet ON p_Notificaciones_Enviadas(carnet);
CREATE INDEX IX_Notificaciones_Fecha ON p_Notificaciones_Enviadas(fechaEnvio);
CREATE INDEX IX_Notificaciones_Tipo ON p_Notificaciones_Enviadas(tipo);
