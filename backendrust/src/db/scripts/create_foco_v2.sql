-- Create p_FocoDiario_v2
IF OBJECT_ID('[dbo].[p_FocoDiario_v2]', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[p_FocoDiario_v2] (
        [idFoco] int IDENTITY(1,1) NOT NULL,
        [idUsuario] int NOT NULL,
        [idTarea] int NOT NULL,
        [fecha] date NOT NULL,
        [esEstrategico] bit DEFAULT (0),
        [completado] bit DEFAULT (0),
        [orden] int DEFAULT (0),
        [creadoEn] datetime DEFAULT (getdate()),
        CONSTRAINT [PK_p_FocoDiario_v2] PRIMARY KEY ([idFoco]),
        CONSTRAINT [FK_p_FocoDiario_v2_Usuarios] FOREIGN KEY ([idUsuario]) REFERENCES [dbo].[p_Usuarios] ([idUsuario]),
        CONSTRAINT [FK_p_FocoDiario_v2_Tareas] FOREIGN KEY ([idTarea]) REFERENCES [dbo].[p_Tareas] ([idTarea])
    );
END
GO
