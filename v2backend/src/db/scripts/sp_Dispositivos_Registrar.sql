IF OBJECT_ID('sp_Dispositivos_Registrar', 'P') IS NULL
BEGIN
    EXEC('CREATE PROCEDURE sp_Dispositivos_Registrar AS BEGIN SET NOCOUNT ON; END')
END
GO
ALTER PROCEDURE sp_Dispositivos_Registrar
    @idUsuario INT,
    @tokenFCM NVARCHAR(500),
    @plataforma NVARCHAR(50) = 'android'
AS
BEGIN
    SET NOCOUNT ON;

    -- Validar tabla de dispositivos p_Dispositivos
    IF OBJECT_ID('p_Dispositivos', 'U') IS NULL
    BEGIN
        CREATE TABLE p_Dispositivos (
            idDispositivo INT IDENTITY(1,1) PRIMARY KEY,
            idUsuario INT NOT NULL,
            tokenFCM NVARCHAR(500) NOT NULL,
            plataforma NVARCHAR(50) DEFAULT 'android',
            fechaRegistro DATETIME DEFAULT GETDATE(),
            ultimoUso DATETIME DEFAULT GETDATE(),
            activo BIT DEFAULT 1,
            CONSTRAINT UQ_Dispositivo_Token UNIQUE (tokenFCM)
        );
        CREATE INDEX IX_Dispositivos_Usuario ON p_Dispositivos(idUsuario);
    END

    -- Upsert del token
    MERGE p_Dispositivos AS target
    USING (SELECT @tokenFCM AS token) AS source
    ON (target.tokenFCM = source.token)
    WHEN MATCHED THEN
        UPDATE SET 
            idUsuario = @idUsuario,
            ultimoUso = GETDATE(),
            activo = 1,
            plataforma = @plataforma
    WHEN NOT MATCHED THEN
        INSERT (idUsuario, tokenFCM, plataforma, fechaRegistro, ultimoUso, activo)
        VALUES (@idUsuario, @tokenFCM, @plataforma, GETDATE(), GETDATE(), 1);
END
