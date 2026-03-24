-- 1. TABLA DE ROLES
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='p_RolesColaboracion' and xtype='U')
BEGIN
    CREATE TABLE p_RolesColaboracion (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(50) NOT NULL UNIQUE,
        permisos NVARCHAR(MAX) NOT NULL,
        esSistema BIT DEFAULT 0,
        orden INT NOT NULL DEFAULT 0
    );

    INSERT INTO p_RolesColaboracion (nombre, permisos, esSistema, orden) VALUES
    ('Dueño', '["*"]', 1, 6),
    ('Administrador', '["VIEW_PROJECT","EDIT_PROJECT","VIEW_TASKS","CREATE_TASK","EDIT_ANY_TASK","DELETE_ANY_TASK","ASSIGN_SELF","ASSIGN_OTHERS","REASSIGN","INVITE","MANAGE_COLLABORATORS","EXPORT","VIEW_HISTORY"]', 1, 5),
    ('Colaborador', '["VIEW_PROJECT","VIEW_TASKS","CREATE_TASK","EDIT_OWN_TASK","DELETE_OWN_TASK","ASSIGN_SELF"]', 1, 4),
    ('Editor', '["VIEW_PROJECT","VIEW_TASKS","EDIT_ANY_TASK"]', 1, 3),
    ('Revisor', '["VIEW_PROJECT","VIEW_TASKS","VIEW_HISTORY"]', 1, 2),
    ('Observador', '["VIEW_PROJECT","VIEW_TASKS"]', 1, 1);
END
GO

-- 2. TABLA DE COLABORADORES
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='p_ProyectoColaboradores' and xtype='U')
BEGIN
    CREATE TABLE p_ProyectoColaboradores (
        id INT IDENTITY(1,1) PRIMARY KEY,
        idProyecto INT NOT NULL FOREIGN KEY REFERENCES p_Proyectos(idProyecto),
        idUsuario INT NOT NULL FOREIGN KEY REFERENCES p_Usuarios(idUsuario),
        rolColaboracion NVARCHAR(50) NOT NULL FOREIGN KEY REFERENCES p_RolesColaboracion(nombre),
        permisosCustom NVARCHAR(MAX) NULL,
        fechaInvitacion DATETIME DEFAULT GETDATE(),
        invitadoPor INT NOT NULL FOREIGN KEY REFERENCES p_Usuarios(idUsuario),
        fechaExpiracion DATETIME NULL,
        activo BIT DEFAULT 1,
        notas NVARCHAR(MAX) NULL,
        CONSTRAINT UQ_ProyectoColaborador UNIQUE (idProyecto, idUsuario)
    );
END
GO

-- 3. SP sp_ProyectoColaboradores_Listar
CREATE OR ALTER PROCEDURE sp_ProyectoColaboradores_Listar
    @idProyecto INT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @sql NVARCHAR(MAX);
    DECLARE @nombreCol NVARCHAR(100) = 'u.correo';
    DECLARE @invNombreCol NVARCHAR(100) = 'inv.correo';
    DECLARE @cargoCol NVARCHAR(100) = 'NULL';
    
    IF COL_LENGTH('p_Usuarios', 'nombreCompleto') IS NOT NULL
    BEGIN
        SET @nombreCol = 'u.nombreCompleto';
        SET @invNombreCol = 'inv.nombreCompleto';
    END
    ELSE IF COL_LENGTH('p_Usuarios', 'nombres') IS NOT NULL AND COL_LENGTH('p_Usuarios', 'apellidos') IS NOT NULL
    BEGIN
        SET @nombreCol = 'u.nombres + '' '' + u.apellidos';
        SET @invNombreCol = 'inv.nombres + '' '' + inv.apellidos';
    END
    ELSE IF COL_LENGTH('p_Usuarios', 'nombre') IS NOT NULL
    BEGIN
        SET @nombreCol = 'u.nombre';
        SET @invNombreCol = 'inv.nombre';
    END
    
    IF COL_LENGTH('p_Usuarios', 'cargo') IS NOT NULL
    BEGIN
        SET @cargoCol = 'u.cargo';
    END
    
    SET @sql = '
    SELECT 
        c.id,
        c.idProyecto,
        c.idUsuario,
        c.rolColaboracion,
        c.permisosCustom,
        c.fechaInvitacion,
        c.fechaExpiracion,
        c.activo,
        c.notas,
        ' + @nombreCol + ' as nombreUsuario,
        u.correo,
        u.carnet,
        ' + @cargoCol + ' as cargo,
        c.invitadoPor,
        ' + @invNombreCol + ' as invitadoPorNombre
    FROM p_ProyectoColaboradores c
    INNER JOIN p_Usuarios u ON c.idUsuario = u.idUsuario
    LEFT JOIN p_Usuarios inv ON c.invitadoPor = inv.idUsuario
    WHERE c.idProyecto = @idProyecto AND c.activo = 1
    ORDER BY c.fechaInvitacion DESC;
    ';
    
    EXEC sp_executesql @sql, N'@idProyecto INT', @idProyecto = @idProyecto;
END
GO

-- 4. SP sp_ProyectoColaboradores_Invitar
CREATE OR ALTER PROCEDURE sp_ProyectoColaboradores_Invitar
    @idProyecto INT,
    @idUsuario INT,
    @rolColaboracion NVARCHAR(50),
    @invitadoPor INT,
    @fechaExpiracion DATETIME = NULL,
    @notas NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM p_ProyectoColaboradores WHERE idProyecto = @idProyecto AND idUsuario = @idUsuario)
    BEGIN
        UPDATE p_ProyectoColaboradores
        SET activo = 1,
            rolColaboracion = @rolColaboracion,
            fechaExpiracion = @fechaExpiracion,
            notas = @notas
        WHERE idProyecto = @idProyecto AND idUsuario = @idUsuario;
    END
    ELSE
    BEGIN
        INSERT INTO p_ProyectoColaboradores 
        (idProyecto, idUsuario, rolColaboracion, invitadoPor, fechaExpiracion, notas, activo, fechaInvitacion)
        VALUES 
        (@idProyecto, @idUsuario, @rolColaboracion, @invitadoPor, @fechaExpiracion, @notas, 1, GETDATE());
    END
    
    EXEC sp_ProyectoColaboradores_Listar @idProyecto = @idProyecto;
END
GO

-- 5. SP sp_ProyectoColaboradores_Actualizar
CREATE OR ALTER PROCEDURE sp_ProyectoColaboradores_Actualizar
    @idProyecto INT,
    @idUsuario INT,
    @rolColaboracion NVARCHAR(50) = NULL,
    @permisosCustom NVARCHAR(MAX) = NULL,
    @fechaExpiracion DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p_ProyectoColaboradores
    SET rolColaboracion = ISNULL(@rolColaboracion, rolColaboracion),
        permisosCustom = COALESCE(@permisosCustom, permisosCustom),
        fechaExpiracion = COALESCE(@fechaExpiracion, fechaExpiracion)
    WHERE idProyecto = @idProyecto AND idUsuario = @idUsuario;
END
GO

-- 6. SP sp_ProyectoColaboradores_Revocar
CREATE OR ALTER PROCEDURE sp_ProyectoColaboradores_Revocar
    @idProyecto INT,
    @idUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p_ProyectoColaboradores
    SET activo = 0
    WHERE idProyecto = @idProyecto AND idUsuario = @idUsuario;
END
GO

-- 7. SP sp_ProyectoColaboradores_VerificarPermiso
CREATE OR ALTER PROCEDURE sp_ProyectoColaboradores_VerificarPermiso
    @idProyecto INT,
    @idUsuario INT,
    @permisoRequerido NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @tienePermiso INT = 0;
    DECLARE @rolAsignado NVARCHAR(50) = NULL;
    DECLARE @permisosRol NVARCHAR(MAX) = NULL;
    DECLARE @permisosCustom NVARCHAR(MAX) = NULL;
    DECLARE @esDueno BIT = 0;

    -- Verificar si es creador o responsable
    IF EXISTS (SELECT 1 FROM p_Proyectos p WHERE p.idProyecto = @idProyecto AND (p.idCreador = @idUsuario OR p.responsableCarnet = (SELECT carnet FROM p_Usuarios WHERE idUsuario = @idUsuario)))
    BEGIN
        SET @esDueno = 1;
        SET @tienePermiso = 1;
        SET @rolAsignado = 'Dueño';
    END

    -- Sino, verificar en tabla colaboradores
    IF @esDueno = 0
    BEGIN
        SELECT TOP 1
            @rolAsignado = c.rolColaboracion,
            @permisosCustom = c.permisosCustom
        FROM p_ProyectoColaboradores c
        WHERE c.idProyecto = @idProyecto 
          AND c.idUsuario = @idUsuario 
          AND c.activo = 1 
          AND (c.fechaExpiracion IS NULL OR c.fechaExpiracion > GETDATE());

        IF @rolAsignado IS NOT NULL
        BEGIN
            -- Obtener permisos del rol
            SELECT TOP 1 @permisosRol = permisos FROM p_RolesColaboracion WHERE nombre = @rolAsignado;
            
            -- Lógica simplificada JSON-like match
            IF @permisosRol LIKE '%"*"%' OR @permisosRol LIKE '%' + @permisoRequerido + '%'
            BEGIN
                SET @tienePermiso = 1;
            END
            ELSE IF @permisosCustom IS NOT NULL AND (@permisosCustom LIKE '%"*"%' OR @permisosCustom LIKE '%' + @permisoRequerido + '%')
            BEGIN
                SET @tienePermiso = 1;
            END
        END
    END
    
    SELECT @tienePermiso as tienePermiso, @rolAsignado as rolColaboracion;
END
GO

-- 8. SP sp_ProyectoColaboradores_LimpiarExpirados
CREATE OR ALTER PROCEDURE sp_ProyectoColaboradores_LimpiarExpirados
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @RowCnt INT;
    
    UPDATE p_ProyectoColaboradores
    SET activo = 0
    WHERE activo = 1 AND fechaExpiracion IS NOT NULL AND fechaExpiracion <= GETDATE();
    
    SET @RowCnt = @@ROWCOUNT;
    SELECT @RowCnt as colaboradoresDesactivados;
END
GO
