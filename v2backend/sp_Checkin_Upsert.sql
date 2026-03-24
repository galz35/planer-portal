
/* =========================================================
   2) SP Mejorado: sp_Checkin_Upsert
   ========================================================= */
CREATE   PROCEDURE dbo.sp_Checkin_Upsert
(
    @idUsuario        INT,
    @fecha            DATE,
    @entregableTexto  NVARCHAR(4000),
    @nota             NVARCHAR(4000) = NULL,
    @linkEvidencia    NVARCHAR(1000) = NULL,
    @estadoAnimo      NVARCHAR(50) = NULL,
    @idNodo           INT = NULL,
    @tareas           dbo.TVP_CheckinTareas READONLY
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON; 

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @idCheckin INT;

        SELECT @idCheckin = c.idCheckin
        FROM dbo.p_Checkins c WITH (UPDLOCK, HOLDLOCK)
        WHERE c.idUsuario = @idUsuario AND c.fecha = @fecha;

        IF @idCheckin IS NULL
        BEGIN
            INSERT INTO dbo.p_Checkins(idUsuario, fecha, entregableTexto, nota, linkEvidencia, estadoAnimo, idNodo)
            VALUES(@idUsuario, @fecha, @entregableTexto, @nota, @linkEvidencia, @estadoAnimo, @idNodo);

            SET @idCheckin = SCOPE_IDENTITY();
        END
        ELSE
        BEGIN
            UPDATE dbo.p_Checkins
            SET entregableTexto = @entregableTexto,
                nota = @nota,
                linkEvidencia = @linkEvidencia,
                estadoAnimo = @estadoAnimo,
                idNodo = @idNodo
            WHERE idCheckin = @idCheckin;
        END

        DELETE FROM dbo.p_CheckinTareas WHERE idCheckin = @idCheckin;

        INSERT INTO dbo.p_CheckinTareas(idCheckin, idTarea, tipo)
        SELECT
            @idCheckin,
            x.idTarea,
            x.tipo
        FROM (
            SELECT DISTINCT idTarea, tipo
            FROM @tareas
        ) x
        INNER JOIN dbo.p_Tareas t ON t.idTarea = x.idTarea
        WHERE t.activo = 1;

        COMMIT;

        SELECT @idCheckin AS idCheckin;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
