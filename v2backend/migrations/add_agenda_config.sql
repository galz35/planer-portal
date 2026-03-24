IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[p_UsuariosConfig]') AND name = 'agendaConfig')
BEGIN
    ALTER TABLE [dbo].[p_UsuariosConfig] ADD [agendaConfig] NVARCHAR(MAX) NULL;
END
GO
