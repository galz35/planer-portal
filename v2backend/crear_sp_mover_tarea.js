require('dotenv').config();
const sql = require('mssql');

async function run() {
    try {
        const pool = await sql.connect({
            user: process.env.MSSQL_USER,
            password: process.env.MSSQL_PASSWORD,
            database: process.env.MSSQL_DATABASE,
            server: process.env.MSSQL_HOST,
            port: parseInt(process.env.MSSQL_PORT),
            options: { encrypt: false, trustServerCertificate: true }
        });

        const sqlText = `
CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_MoverAProyecto]
    @idTarea           INT,
    @idProyectoDestino INT,
    @idUsuarioEjecutor INT,
    @moverSubtareas    BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idProyectoOrigen INT;
    DECLARE @nombreTarea      NVARCHAR(200);
    DECLARE @nombreProyectoO  NVARCHAR(200);
    DECLARE @nombreProyectoD  NVARCHAR(200);
    DECLARE @carnetEjecutor   NVARCHAR(100);

    -- 1. Validaciones Iniciales
    SELECT @idProyectoOrigen = idProyecto, @nombreTarea = nombre 
    FROM p_Tareas WHERE idTarea = @idTarea;
    
    IF @idProyectoOrigen IS NULL 
    BEGIN
        RAISERROR('La tarea no existe o no tiene un proyecto asignado.', 16, 1);
        RETURN;
    END

    IF @idProyectoOrigen = @idProyectoDestino
    BEGIN
        RAISERROR('La tarea ya pertenece al proyecto destino.', 16, 2);
        RETURN;
    END

    -- 2. Validar que el proyecto destino esté activo
    SELECT @nombreProyectoD = nombre FROM p_Proyectos WHERE idProyecto = @idProyectoDestino AND estado = 'Activo';
    IF @nombreProyectoD IS NULL
    BEGIN
        RAISERROR('El proyecto destino no existe o no está activo.', 16, 3);
        RETURN;
    END

    SELECT @nombreProyectoO = nombre FROM p_Proyectos WHERE idProyecto = @idProyectoOrigen;
    SELECT @carnetEjecutor = carnet FROM p_Usuarios WHERE idUsuario = @idUsuarioEjecutor;

    BEGIN TRANSACTION;
    BEGIN TRY
        -- 3. Si la tarea tiene un padre, rompemos el vínculo (ya que el padre está en otro proyecto)
        UPDATE p_Tareas 
        SET idTareaPadre = NULL 
        WHERE idTarea = @idTarea;

        -- 4. Mover la tarea principal
        UPDATE p_Tareas
        SET idProyecto = @idProyectoDestino,
            fechaActualizacion = GETDATE()
        WHERE idTarea = @idTarea;

        -- 5. Mover subtareas recursivamente
        IF @moverSubtareas = 1
        BEGIN
            ;WITH Jerarquia AS (
                SELECT idTarea FROM p_Tareas WHERE idTareaPadre = @idTarea
                UNION ALL
                SELECT t.idTarea FROM p_Tareas t
                INNER JOIN Jerarquia j ON t.idTareaPadre = j.idTarea
            )
            UPDATE p_Tareas
            SET idProyecto = @idProyectoDestino,
                fechaActualizacion = GETDATE()
            FROM p_Tareas t
            INNER JOIN Jerarquia j ON t.idTarea = j.idTarea;
        END

        -- 6. Registro de Auditoría (Manual en la tabla de logs para asegurar persistencia atómica)
        -- Nota: El AuditService de NestJS también lo registrará, pero esto es un backup de integridad.
        IF EXISTS (SELECT * FROM sys.tables WHERE name = 'p_Auditoria')
        BEGIN
            INSERT INTO p_Auditoria (idUsuario, carnet, accion, entidad, entidadId, datosAnteriores, datosNuevos, fecha)
            VALUES (
                @idUsuarioEjecutor, 
                @carnetEjecutor, 
                'TAREA_MOVIDA_PROYECTO', 
                'Tarea', 
                CAST(@idTarea AS NVARCHAR(50)),
                JSON_OBJECT('idProyecto': @idProyectoOrigen, 'nombreProyecto': @nombreProyectoO),
                JSON_OBJECT('idProyecto': @idProyectoDestino, 'nombreProyecto': @nombreProyectoD),
                GETDATE()
            );
        END

        COMMIT TRANSACTION;
        SELECT 1 as success, @nombreTarea as nombreTarea, @nombreProyectoO as proyectoOrigen, @nombreProyectoD as proyectoDestino;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrorMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMsg, 16, 1);
    END CATCH
END
`;
        await pool.request().query(sqlText);
        console.log('✅ SP [sp_Tarea_MoverAProyecto] creado exitosamente.');
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
}

run();
