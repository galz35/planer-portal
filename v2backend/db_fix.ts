import { ejecutarQuery } from './src/db/base.repo';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    try {
        console.log("Actualizando sp_Tarea_Clonar...");
        await ejecutarQuery(`
      CREATE OR ALTER PROCEDURE [dbo].[sp_Tarea_Clonar]
          @idTareaFuente INT,
          @ejecutorCarnet NVARCHAR(50)
      AS
      BEGIN
          SET NOCOUNT ON;
          DECLARE @NewId INT;
          DECLARE @idEjecutor INT;
          SELECT @idEjecutor = idUsuario FROM p_Usuarios WHERE carnet = @ejecutorCarnet;

          -- 1. CLONAR PADRE
          INSERT INTO p_Tareas (
              nombre, descripcion, idProyecto, estado, prioridad, esfuerzo, tipo,
              fechaInicioPlanificada, fechaObjetivo, idCreador, creadorCarnet,
              fechaCreacion, porcentaje, comportamiento, linkEvidencia, activo, idPlan,
              idTareaPadre, idPadre, orden
          )
          SELECT 
              nombre + ' (Copia)', descripcion, idProyecto, 'Pendiente', prioridad, esfuerzo, tipo,
              fechaInicioPlanificada, fechaObjetivo, ISNULL(@idEjecutor, idCreador), ISNULL(@ejecutorCarnet, creadorCarnet),
              GETDATE(), 0, comportamiento, linkEvidencia, 1, idPlan,
              NULL, NULL, 
              (SELECT ISNULL(MIN(orden),0) - 1 FROM p_Tareas WHERE idProyecto = (SELECT idProyecto FROM p_Tareas WHERE idTarea = @idTareaFuente) AND idTareaPadre IS NULL AND activo = 1)
          FROM p_Tareas
          WHERE idTarea = @idTareaFuente;

          SET @NewId = SCOPE_IDENTITY();

          -- 2. Clonar asignados al padre
          INSERT INTO p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
          SELECT @NewId, idUsuario, carnet, tipo, GETDATE()
          FROM p_TareaAsignados
          WHERE idTarea = @idTareaFuente;

          -- 3. CLONAR SUBTAREAS (solo 1 nivel es necesario para la mayoría de casos)
          -- Para copiar los asignados de las subtareas usamos una variable de tabla
          DECLARE @MapTable TABLE (OldId INT, NewId INT);

          MERGE INTO p_Tareas AS Target
          USING (
              SELECT idTarea, nombre, descripcion, idProyecto, prioridad, esfuerzo, tipo,
                     fechaInicioPlanificada, fechaObjetivo, comportamiento, linkEvidencia, idPlan, orden
              FROM p_Tareas
              WHERE idTareaPadre = @idTareaFuente AND activo = 1
          ) AS Source
          ON 1 = 0
          WHEN NOT MATCHED THEN
              INSERT (
                  nombre, descripcion, idProyecto, estado, prioridad, esfuerzo, tipo,
                  fechaInicioPlanificada, fechaObjetivo, idCreador, creadorCarnet,
                  fechaCreacion, porcentaje, comportamiento, linkEvidencia, activo, idPlan,
                  idTareaPadre, idPadre, orden
              )
              VALUES (
                  Source.nombre, Source.descripcion, Source.idProyecto, 'Pendiente', Source.prioridad, Source.esfuerzo, Source.tipo,
                  NULL, NULL, ISNULL(@idEjecutor, 1), ISNULL(@ejecutorCarnet, ''),
                  GETDATE(), 0, Source.comportamiento, Source.linkEvidencia, 1, Source.idPlan,
                  @NewId, @NewId, Source.orden
              )
          OUTPUT Source.idTarea, inserted.idTarea INTO @MapTable(OldId, NewId);

          -- 4. Clonar asignados de las subtareas
          INSERT INTO p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
          SELECT m.NewId, ta.idUsuario, ta.carnet, ta.tipo, GETDATE()
          FROM p_TareaAsignados ta
          INNER JOIN @MapTable m ON ta.idTarea = m.OldId;

          SELECT @NewId as idTarea;
      END;
    `);
        console.log("SP actualizado con éxito.");
    } catch (e) {
        console.error(e);
    }
    await app.close();
    process.exit(0);
}

run();
