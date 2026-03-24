-- ============================================================
-- SP: sp_vc_importar_clientes
-- Recibe un JSON de clientes y hace un MERGE (Upsert)
-- ============================================================

SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER PROCEDURE dbo.sp_vc_importar_clientes
    @clientes_json NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- Usamos OpenJSON para mapear la tabla temporal
    ;WITH NuevosClientes AS (
        SELECT 
            JSON_VALUE(value, '$.codigo') AS codigo,
            JSON_VALUE(value, '$.nombre') AS nombre,
            JSON_VALUE(value, '$.direccion') AS direccion,
            JSON_VALUE(value, '$.telefono') AS telefono,
            JSON_VALUE(value, '$.contacto') AS contacto,
            CAST(JSON_VALUE(value, '$.lat') AS DECIMAL(10,7)) AS lat,
            CAST(JSON_VALUE(value, '$.long') AS DECIMAL(10,7)) AS [long],
            ISNULL(CAST(JSON_VALUE(value, '$.radio_metros') AS INT), 100) AS radio_metros,
            JSON_VALUE(value, '$.zona') AS zona
        FROM OPENJSON(@clientes_json)
    )
    MERGE vc_clientes AS target
    USING NuevosClientes AS source
    ON (target.codigo = source.codigo)
    WHEN MATCHED THEN
        UPDATE SET 
            nombre = source.nombre,
            direccion = source.direccion,
            telefono = source.telefono,
            contacto = source.contacto,
            lat = source.lat,
            [long] = source.[long],
            radio_metros = source.radio_metros,
            zona = source.zona,
            activo = 1,
            importado_en = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (codigo, nombre, direccion, telefono, contacto, lat, [long], radio_metros, zona, activo, importado_en, creado_en)
        VALUES (source.codigo, source.nombre, source.direccion, source.telefono, source.contacto, source.lat, source.[long], source.radio_metros, source.zona, 1, GETDATE(), GETDATE());

    SELECT @@ROWCOUNT AS procesados;
END;
GO
