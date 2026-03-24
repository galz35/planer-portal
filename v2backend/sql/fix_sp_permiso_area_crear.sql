-- =================================================================
-- FIX: sp_PermisoArea_Crear - Agregar nombre_area y tipo_acceso
-- La tabla p_permiso_area tiene nombre_area y tipo_nivel
-- pero el SP no los recibe. Esto impide el match por nombre de área
-- cuando se calcula la visibilidad.
-- =================================================================

ALTER PROCEDURE dbo.sp_PermisoArea_Crear
  @otorga      NVARCHAR(100) = NULL,
  @recibe      NVARCHAR(100),
  @idorg       BIGINT = 0,
  @alcance     NVARCHAR(50) = N'SUBARBOL',
  @motivo      NVARCHAR(500) = NULL,
  @fecha_fin   NVARCHAR(50) = NULL,
  @tipo_acceso NVARCHAR(20) = N'ALLOW',
  @nombre_area NVARCHAR(255) = NULL,
  @tipo_nivel  NVARCHAR(50) = N'GERENCIA'
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @r NVARCHAR(100) = LTRIM(RTRIM(ISNULL(@recibe, N'')));
  IF (@r = N'')
  BEGIN
    RAISERROR('carnet_recibe requerido.', 16, 1);
    RETURN;
  END

  DECLARE @ff DATETIME = TRY_CONVERT(DATETIME, @fecha_fin);

  -- Si no se proporcionó nombre_area y tenemos un idorg válido, buscarlo
  IF @nombre_area IS NULL AND @idorg > 0
  BEGIN
    SELECT @nombre_area = descripcion FROM p_organizacion_nodos WHERE idorg = @idorg;
  END

  INSERT INTO dbo.p_permiso_area
    (carnet_otorga, carnet_recibe, idorg_raiz, alcance, motivo, activo, creado_en, fecha_fin, nombre_area, tipo_nivel)
  VALUES
    (NULLIF(LTRIM(RTRIM(@otorga)), N''), @r, @idorg, @alcance, @motivo, 1, GETDATE(), @ff,
     NULLIF(LTRIM(RTRIM(@nombre_area)), ''), ISNULL(@tipo_nivel, 'GERENCIA'));

  SELECT SCOPE_IDENTITY() AS id;
END;
GO
