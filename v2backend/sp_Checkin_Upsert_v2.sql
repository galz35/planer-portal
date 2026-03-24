
            CREATE PROCEDURE dbo.sp_Checkin_Upsert_v2
            (
                @usuarioCarnet   NVARCHAR(50),
                @fecha           DATE,
                @prioridad1      NVARCHAR(255) = NULL,
                @prioridad2      NVARCHAR(255) = NULL,
                @prioridad3      NVARCHAR(255) = NULL,
                @entregableTexto NVARCHAR(MAX) = NULL,
                @nota            NVARCHAR(MAX) = NULL,
                @linkEvidencia   NVARCHAR(1000) = NULL,
                @estadoAnimo     NVARCHAR(50) = NULL,
                @energia         INT = NULL,
                @idNodo          INT = NULL,
                @tareas          dbo.TVP_CheckinTareas READONLY 
            )
            AS
            BEGIN
                SET NOCOUNT ON;
                SET XACT_ABORT ON;

                DECLARE @idUsuario INT;
                SELECT @idUsuario = idUsuario FROM dbo.p_Usuarios WHERE carnet = @usuarioCarnet;

                IF @idUsuario IS NULL
                BEGIN
                    THROW 50001, 'Usuario no encontrado por carnet.', 1;
                END

                BEGIN TRY
                    BEGIN TRAN;

                    DECLARE @idCheckin INT;

                    SELECT @idCheckin = idCheckin 
                    FROM dbo.p_Checkins WITH (UPDLOCK, HOLDLOCK)
                    WHERE idUsuario = @idUsuario AND CAST(fecha AS DATE) = @fecha;

                    IF @idCheckin IS NULL
                    BEGIN
                        INSERT INTO dbo.p_Checkins(
                            idUsuario, usuarioCarnet, fecha, 
                            prioridad1, prioridad2, prioridad3, 
                            entregableTexto, nota, linkEvidencia, 
                            estadoAnimo, energia, idNodo
                        )
                        VALUES(
                            @idUsuario, @usuarioCarnet, @fecha,
                            @prioridad1, @prioridad2, @prioridad3,
                            @entregableTexto, @nota, @linkEvidencia,
                            @estadoAnimo, @energia, @idNodo
                        );
                        SET @idCheckin = SCOPE_IDENTITY();
                    END
                    ELSE
                    BEGIN
                        UPDATE dbo.p_Checkins
                        SET 
                            prioridad1 = @prioridad1,
                            prioridad2 = @prioridad2,
                            prioridad3 = @prioridad3,
                            entregableTexto = @entregableTexto,
                            nota = @nota,
                            linkEvidencia = @linkEvidencia,
                            estadoAnimo = @estadoAnimo,
                            energia = @energia,
                            idNodo = @idNodo
                        WHERE idCheckin = @idCheckin;
                    END

                    -- SIEMPRE limpiar las tareas del checkin y re-insertar las nuevas
                    -- (FIX: Antes no borraba si el TVP estaba vacio)
                    DELETE FROM dbo.p_CheckinTareas WHERE idCheckin = @idCheckin;
                    
                    IF EXISTS (SELECT 1 FROM @tareas)
                    BEGIN
                        INSERT INTO dbo.p_CheckinTareas(idCheckin, idTarea, tipo)
                        SELECT @idCheckin, t.idTarea, t.tipo
                        FROM @tareas t
                        INNER JOIN dbo.p_Tareas pt ON pt.idTarea = t.idTarea
                        WHERE pt.activo = 1;
                    END

                    COMMIT;
                    SELECT @idCheckin as idCheckin;

                END TRY
                BEGIN CATCH
                    IF @@TRANCOUNT > 0 ROLLBACK;
                    THROW;
                END CATCH
            END
        