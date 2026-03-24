# Guía de Pase a Producción (Cambios a Base de Datos)
**Fecha de corte:** 01 de Marzo de 2026
**De:** Entorno Test (`Bdplaner_Test`) **A:** Entorno Producción (`ClarityDB` u homólogo)

Esta es la recopilación exhaustiva de todos los ajustes, parches y scripts que se han validado exitosamente en el entorno de pruebas y que **deben replicarse en la Base de Datos de Producción** para garantizar el correcto funcionamiento de V2.

---

## 📌 1. Actualización de Vistas / Stored Procedures (SQL)
Se debe actualizar el siguiente Procedimiento Almacenado. Este cambio soluciona un Bug Crítico donde los Gerentes / Jefes no podían ver los proyectos creados por sus subordinados bajo el modo de visibilidad "Jerarquía" si el proyecto no poseía tareas en estado "Activo".

### 📄 Script a ejecutar en SQL Server (Producción):

```sql
ALTER PROCEDURE [dbo].[sp_Proyecto_ObtenerVisibles]
    @idUsuario INT,
    @idsEquipo dbo.TVP_IntList READONLY,
    @nombre    NVARCHAR(200) = NULL,
    @estado    NVARCHAR(50)  = NULL,
    @gerencia  NVARCHAR(100) = NULL,
    @area      NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT p.*,
           creadorNombre = COALESCE(u1.nombre, u2.nombre),
           responsableNombre = ur.nombre,
           progreso = ISNULL((
               SELECT ROUND(AVG(CAST(CASE WHEN t.estado = 'Hecha' THEN 100 
                    ELSE ISNULL(t.porcentaje, 0) END AS FLOAT)), 0)
               FROM p_Tareas t
               WHERE t.idProyecto = p.idProyecto 
                 AND t.idTareaPadre IS NULL AND t.activo = 1
                 AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
           ), 0)
    FROM p_Proyectos p
    LEFT JOIN p_Usuarios u1 ON p.idCreador = u1.idUsuario
    LEFT JOIN p_Usuarios u2 ON p.creadorCarnet = u2.carnet
    LEFT JOIN p_Usuarios ur ON p.responsableCarnet = ur.carnet
    WHERE (
        -- 1. Acceso Directo: Admin o creador/responsable directo
        p.idCreador = @idUsuario
        OR p.idResponsable = @idUsuario

        -- 2. Modo JERARQUIA: visible si alguien del equipo es parte del proyecto
        OR (
            p.modoVisibilidad IN ('JERARQUIA', 'JERARQUIA_COLABORADOR')
            AND (
                -- Tiene tareas activas asignadas a alguien de mi equipo
                EXISTS (
                    SELECT 1
                    FROM dbo.p_Tareas t
                    INNER JOIN dbo.p_TareaAsignados ta ON ta.idTarea = t.idTarea
                    INNER JOIN @idsEquipo team ON team.Id = ta.idUsuario
                    WHERE t.idProyecto = p.idProyecto AND t.activo = 1
                )
                -- O el Creador pertenece a mi equipo (ESTE FUE EL FIX)
                OR p.idCreador IN (SELECT Id FROM @idsEquipo)
                -- O el Responsable pertenece a mi equipo (ESTE FUE EL FIX)
                OR p.idResponsable IN (SELECT Id FROM @idsEquipo)
            )
        )

        -- 3. Modo COLABORADOR explicito
        OR (
            p.modoVisibilidad IN ('COLABORADOR', 'JERARQUIA_COLABORADOR')
            AND EXISTS (
                SELECT 1
                FROM dbo.p_ProyectoColaboradores pc
                WHERE pc.idProyecto = p.idProyecto
                  AND pc.idUsuario = @idUsuario
                  AND pc.activo = 1
            )
        )
    )
    AND (@nombre IS NULL OR p.nombre LIKE '%' + @nombre + '%')
    AND (@estado IS NULL OR p.estado = @estado)
    ORDER BY p.fechaCreacion DESC;
END
GO
```

---

## 📌 2. Saneamiento de Datos: Rescate de Tareas Huérfanas
Dado que en Producción existen proyectos que tienen cientos de tareas flotando en el "limbo" sin un Usuario Asignado (motivado por fallos de migración pasados), es necesario ejecutar el Script de Node.js que creamos para rescatar esas tareas y asignárselas obligatoriamente al **Responsable del Proyecto** (o al Creador del mismo en su defecto). 

### 📄 Pasos para ejecutar en Servidor Producción:
1. Asegúrate de que el backend de Node (`v2backend`) apunte temporal o directamente a la base de datos de producción a través de las variables del `.env` (`MSSQL_DATABASE`, `MSSQL_HOST`, etc.).
2. En la terminal del servidor de producción, ejecuta:
```bash
node reparar_tareas_huerfanas.js
```
*En Base de datos Test, logramos rescatar satisfactoriamente 489 tareas con este mismo script.*

---

## 📌 3. Confirmación de Modificaciones a Nivel Código (Backend)
Hicimos ajustes críticos en el Backend de la API debido a inconsistencias estructurales con la Base de datos, no es necesario que alteres la Base de datos para esto, pero es **vital** que se despliegue el código actual de Node.js para que estos módulos funcionen en producción:

1. **Evitar Errores 500 (`Invalid column 'activo'` en `p_Proyectos`):** 
   - Eliminamos las referencias que hacían un `UPDATE p_Proyectos SET activo = 1` en los repositorios de `planning.repo.ts` y `admin.repo.ts` porque esa tabla en SQL Server *NO POSEE* columna de activo. Si subíamos el código viejo la app habría crasheado. Ahora se fundamenta puramente en el estatus explícito (`estado = 'Cancelado'`).


### Conclusión
Si ejecutas el `ALTER PROCEDURE` del paso 1 en el SQL Server de producción, y luego corres `node reparar_tareas_huerfanas.js` en el servidor backend, la base de datos de Producción estará **100% sincronizada** con los últimos avances y fixes desarrollados en estas jornadas de pruebas.
