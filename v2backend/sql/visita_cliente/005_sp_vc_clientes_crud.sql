-- ============================================================
-- STORED PROCEDURES ADMIN: CRUD CLIENTES (VISITA A CLIENTE)
-- ============================================================

SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- SP: sp_vc_cliente_crear
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_cliente_crear
    @codigo       VARCHAR(50),
    @nombre       NVARCHAR(200),
    @direccion    NVARCHAR(500) = NULL,
    @telefono     VARCHAR(20) = NULL,
    @contacto     NVARCHAR(100) = NULL,
    @lat          DECIMAL(10,7) = NULL,
    @long         DECIMAL(10,7) = NULL,
    @radio_metros INT = 100,
    @zona         NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM vc_clientes WHERE codigo = @codigo)
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'El código de cliente ya existe' AS mensaje;
        RETURN;
    END

    INSERT INTO vc_clientes (codigo, nombre, direccion, telefono, contacto, lat, long, radio_metros, zona, activo)
    VALUES (@codigo, @nombre, @direccion, @telefono, @contacto, @lat, @long, @radio_metros, @zona, 1);

    SELECT CAST(1 AS BIT) AS ok, 'Cliente creado exitosamente' AS mensaje, SCOPE_IDENTITY() AS id;
END;
GO

-- ============================================================
-- SP: sp_vc_cliente_actualizar
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_cliente_actualizar
    @id           INT,
    @codigo       VARCHAR(50),
    @nombre       NVARCHAR(200),
    @direccion    NVARCHAR(500) = NULL,
    @telefono     VARCHAR(20) = NULL,
    @contacto     NVARCHAR(100) = NULL,
    @lat          DECIMAL(10,7) = NULL,
    @long         DECIMAL(10,7) = NULL,
    @radio_metros INT = 100,
    @zona         NVARCHAR(100) = NULL,
    @activo       BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM vc_clientes WHERE id = @id)
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'El cliente no existe' AS mensaje;
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM vc_clientes WHERE codigo = @codigo AND id <> @id)
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'El código ya está en uso por otro cliente' AS mensaje;
        RETURN;
    END

    UPDATE vc_clientes
    SET codigo = @codigo,
        nombre = @nombre,
        direccion = @direccion,
        telefono = @telefono,
        contacto = @contacto,
        lat = @lat,
        long = @long,
        radio_metros = @radio_metros,
        zona = @zona,
        activo = @activo
    WHERE id = @id;

    SELECT CAST(1 AS BIT) AS ok, 'Cliente actualizado exitosamente' AS mensaje;
END;
GO

-- ============================================================
-- SP: sp_vc_cliente_eliminar
-- Baja lógica (activo = 0)
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_vc_cliente_eliminar
    @id INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM vc_clientes WHERE id = @id)
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'El cliente no existe' AS mensaje;
        RETURN;
    END

    UPDATE vc_clientes SET activo = 0 WHERE id = @id;

    SELECT CAST(1 AS BIT) AS ok, 'Cliente desactivado exitosamente (Soft Delete)' AS mensaje;
END;
GO

PRINT '✅ Stored Procedures de CRUD de CLIENTES creados exitosamente';
GO
