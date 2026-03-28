USE [master]
GO
/****** Object:  Database [Bdplaner]    Script Date: 14/3/2026 22:45:58 ******/
CREATE DATABASE [Bdplaner]
 CONTAINMENT = NONE
 ON  PRIMARY 
( NAME = N'Bdplaner', FILENAME = N'/var/opt/mssql/data/Bdplaner.mdf' , SIZE = 73728KB , MAXSIZE = UNLIMITED, FILEGROWTH = 65536KB )
 LOG ON 
( NAME = N'Bdplaner_log', FILENAME = N'/var/opt/mssql/data/Bdplaner_log.ldf' , SIZE = 204800KB , MAXSIZE = 2048GB , FILEGROWTH = 65536KB )
 WITH CATALOG_COLLATION = DATABASE_DEFAULT, LEDGER = OFF
GO
ALTER DATABASE [Bdplaner] SET COMPATIBILITY_LEVEL = 160
GO
IF (1 = FULLTEXTSERVICEPROPERTY('IsFullTextInstalled'))
begin
EXEC [Bdplaner].[dbo].[sp_fulltext_database] @action = 'enable'
end
GO
ALTER DATABASE [Bdplaner] SET ANSI_NULL_DEFAULT OFF 
GO
ALTER DATABASE [Bdplaner] SET ANSI_NULLS OFF 
GO
ALTER DATABASE [Bdplaner] SET ANSI_PADDING OFF 
GO
ALTER DATABASE [Bdplaner] SET ANSI_WARNINGS OFF 
GO
ALTER DATABASE [Bdplaner] SET ARITHABORT OFF 
GO
ALTER DATABASE [Bdplaner] SET AUTO_CLOSE OFF 
GO
ALTER DATABASE [Bdplaner] SET AUTO_SHRINK OFF 
GO
ALTER DATABASE [Bdplaner] SET AUTO_UPDATE_STATISTICS ON 
GO
ALTER DATABASE [Bdplaner] SET CURSOR_CLOSE_ON_COMMIT OFF 
GO
ALTER DATABASE [Bdplaner] SET CURSOR_DEFAULT  GLOBAL 
GO
ALTER DATABASE [Bdplaner] SET CONCAT_NULL_YIELDS_NULL OFF 
GO
ALTER DATABASE [Bdplaner] SET NUMERIC_ROUNDABORT OFF 
GO
ALTER DATABASE [Bdplaner] SET QUOTED_IDENTIFIER OFF 
GO
ALTER DATABASE [Bdplaner] SET RECURSIVE_TRIGGERS OFF 
GO
ALTER DATABASE [Bdplaner] SET  ENABLE_BROKER 
GO
ALTER DATABASE [Bdplaner] SET AUTO_UPDATE_STATISTICS_ASYNC OFF 
GO
ALTER DATABASE [Bdplaner] SET DATE_CORRELATION_OPTIMIZATION OFF 
GO
ALTER DATABASE [Bdplaner] SET TRUSTWORTHY OFF 
GO
ALTER DATABASE [Bdplaner] SET ALLOW_SNAPSHOT_ISOLATION OFF 
GO
ALTER DATABASE [Bdplaner] SET PARAMETERIZATION SIMPLE 
GO
ALTER DATABASE [Bdplaner] SET READ_COMMITTED_SNAPSHOT OFF 
GO
ALTER DATABASE [Bdplaner] SET HONOR_BROKER_PRIORITY OFF 
GO
ALTER DATABASE [Bdplaner] SET RECOVERY FULL 
GO
ALTER DATABASE [Bdplaner] SET  MULTI_USER 
GO
ALTER DATABASE [Bdplaner] SET PAGE_VERIFY CHECKSUM  
GO
ALTER DATABASE [Bdplaner] SET DB_CHAINING OFF 
GO
ALTER DATABASE [Bdplaner] SET FILESTREAM( NON_TRANSACTED_ACCESS = OFF ) 
GO
ALTER DATABASE [Bdplaner] SET TARGET_RECOVERY_TIME = 60 SECONDS 
GO
ALTER DATABASE [Bdplaner] SET DELAYED_DURABILITY = DISABLED 
GO
ALTER DATABASE [Bdplaner] SET ACCELERATED_DATABASE_RECOVERY = OFF  
GO
EXEC sys.sp_db_vardecimal_storage_format N'Bdplaner', N'ON'
GO
ALTER DATABASE [Bdplaner] SET QUERY_STORE = ON
GO
ALTER DATABASE [Bdplaner] SET QUERY_STORE (OPERATION_MODE = READ_WRITE, CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30), DATA_FLUSH_INTERVAL_SECONDS = 900, INTERVAL_LENGTH_MINUTES = 60, MAX_STORAGE_SIZE_MB = 1000, QUERY_CAPTURE_MODE = AUTO, SIZE_BASED_CLEANUP_MODE = AUTO, MAX_PLANS_PER_QUERY = 200, WAIT_STATS_CAPTURE_MODE = ON)
GO
USE [Bdplaner]
GO
/****** Object:  User [candida]    Script Date: 14/3/2026 22:46:00 ******/
CREATE USER [candida] FOR LOGIN [Candida] WITH DEFAULT_SCHEMA=[dbo]
GO
/****** Object:  UserDefinedTableType [dbo].[TVP_CheckinTareas]    Script Date: 14/3/2026 22:46:00 ******/
CREATE TYPE [dbo].[TVP_CheckinTareas] AS TABLE(
	[idTarea] [int] NOT NULL,
	[tipo] [nvarchar](20) NOT NULL
)
GO
/****** Object:  UserDefinedTableType [dbo].[TVP_IntList]    Script Date: 14/3/2026 22:46:00 ******/
CREATE TYPE [dbo].[TVP_IntList] AS TABLE(
	[Id] [int] NOT NULL
)
GO
/****** Object:  UserDefinedTableType [dbo].[TVP_StringList]    Script Date: 14/3/2026 22:46:00 ******/
CREATE TYPE [dbo].[TVP_StringList] AS TABLE(
	[Item] [nvarchar](max) NULL
)
GO
/****** Object:  UserDefinedFunction [dbo].[fn_haversine_metros]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   FUNCTION [dbo].[fn_haversine_metros](
    @lat1 FLOAT, @lon1 FLOAT,
    @lat2 FLOAT, @lon2 FLOAT
)
RETURNS FLOAT
AS
BEGIN
    -- Radio de la Tierra en metros
    DECLARE @R FLOAT = 6371000.0;

    -- Diferencias en radianes
    DECLARE @dLat FLOAT = RADIANS(@lat2 - @lat1);
    DECLARE @dLon FLOAT = RADIANS(@lon2 - @lon1);

    -- FÃ³rmula Haversine
    DECLARE @a FLOAT =
        SIN(@dLat / 2.0) * SIN(@dLat / 2.0) +
        COS(RADIANS(@lat1)) * COS(RADIANS(@lat2)) *
        SIN(@dLon / 2.0) * SIN(@dLon / 2.0);

    DECLARE @c FLOAT = 2.0 * ATN2(SQRT(@a), SQRT(1.0 - @a));

    RETURN @R * @c;
END;
GO
/****** Object:  UserDefinedFunction [dbo].[fn_SplitCsv_NVarChar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/* =========================
   Helper: split CSV -> tabla
   ========================= */
CREATE   FUNCTION [dbo].[fn_SplitCsv_NVarChar]
(
  @csv NVARCHAR(MAX)
)
RETURNS TABLE
AS
RETURN
(
  SELECT DISTINCT LTRIM(RTRIM(value)) AS item
  FROM STRING_SPLIT(ISNULL(@csv, N''), N',')
  WHERE LTRIM(RTRIM(value)) <> N''
);
GO
/****** Object:  Table [dbo].[campo_recorrido_puntos]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[campo_recorrido_puntos](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[id_recorrido] [int] NOT NULL,
	[lat] [decimal](10, 7) NOT NULL,
	[lon] [decimal](10, 7) NOT NULL,
	[accuracy] [decimal](8, 2) NULL,
	[velocidad_kmh] [decimal](6, 2) NULL,
	[timestamp_gps] [datetime2](7) NOT NULL,
	[tipo] [nvarchar](20) NULL,
	[id_cliente] [int] NULL,
	[notas] [nvarchar](200) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[campo_recorridos]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[campo_recorridos](
	[id_recorrido] [int] IDENTITY(1,1) NOT NULL,
	[carnet] [nvarchar](20) NOT NULL,
	[fecha] [date] NOT NULL,
	[hora_inicio] [datetime2](7) NOT NULL,
	[hora_fin] [datetime2](7) NULL,
	[estado] [nvarchar](20) NOT NULL,
	[km_total] [decimal](8, 2) NULL,
	[duracion_min] [int] NULL,
	[total_paradas] [int] NULL,
	[notas] [nvarchar](500) NULL,
	[creado_en] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id_recorrido] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[marcaje_asignacion]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[marcaje_asignacion](
	[id_asignacion] [int] IDENTITY(1,1) NOT NULL,
	[carnet] [nvarchar](20) NOT NULL,
	[id_patron] [int] NOT NULL,
	[fecha_inicio] [date] NOT NULL,
	[fecha_fin] [date] NULL,
	[activo] [bit] NOT NULL,
	[creado_en] [datetime2](7) NULL,
	[actualizado_en] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id_asignacion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[marcaje_asistencias]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[marcaje_asistencias](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[carnet] [varchar](20) NOT NULL,
	[lat] [decimal](10, 7) NULL,
	[long] [decimal](10, 7) NULL,
	[accuracy] [decimal](10, 2) NULL,
	[ip] [varchar](50) NULL,
	[user_agent] [nvarchar](500) NULL,
	[device_uuid] [varchar](100) NULL,
	[tipo_device] [varchar](20) NOT NULL,
	[tipo_marcaje] [varchar](30) NOT NULL,
	[fecha] [datetime2](7) NOT NULL,
	[estado] [varchar](20) NOT NULL,
	[motivo] [nvarchar](max) NULL,
	[offline_id] [varchar](100) NULL,
	[creado_en] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[marcaje_config_usuario]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[marcaje_config_usuario](
	[carnet] [varchar](20) NOT NULL,
	[permitir_movil] [bit] NOT NULL,
	[permitir_escritorio] [bit] NOT NULL,
	[gps_background] [bit] NOT NULL,
	[activo] [bit] NOT NULL,
	[actualizado_en] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[carnet] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[marcaje_devices]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[marcaje_devices](
	[uuid] [varchar](100) NOT NULL,
	[carnet] [varchar](20) NOT NULL,
	[user_agent] [nvarchar](500) NULL,
	[last_login] [datetime2](7) NULL,
	[ip_ultimo] [varchar](50) NULL,
	[estado] [varchar](20) NOT NULL,
	[codigo_activacion] [varchar](10) NULL,
	[fecha_activacion] [datetime2](7) NULL,
	[activo] [bit] NOT NULL,
	[creado_en] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[uuid] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[marcaje_gps_tracking]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[marcaje_gps_tracking](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[carnet] [varchar](20) NOT NULL,
	[lat] [decimal](10, 7) NOT NULL,
	[long] [decimal](10, 7) NOT NULL,
	[accuracy] [decimal](10, 2) NULL,
	[timestamp] [datetime2](7) NOT NULL,
	[fuente] [varchar](20) NULL,
	[creado_en] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[marcaje_horarios]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[marcaje_horarios](
	[id_horario] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
	[hora_entrada] [time](7) NOT NULL,
	[hora_salida] [time](7) NOT NULL,
	[duracion_horas] [decimal](4, 2) NOT NULL,
	[es_nocturno] [bit] NOT NULL,
	[tolerancia_min] [int] NOT NULL,
	[descanso_min] [int] NOT NULL,
	[activo] [bit] NOT NULL,
	[creado_en] [datetime2](7) NULL,
	[actualizado_en] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id_horario] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[marcaje_ip_whitelist]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[marcaje_ip_whitelist](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](200) NOT NULL,
	[cidr] [varchar](50) NOT NULL,
	[activo] [bit] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[marcaje_patrones]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[marcaje_patrones](
	[id_patron] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
	[total_dias] [int] NOT NULL,
	[descripcion] [nvarchar](500) NULL,
	[activo] [bit] NOT NULL,
	[creado_en] [datetime2](7) NULL,
	[actualizado_en] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id_patron] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[marcaje_patrones_detalle]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[marcaje_patrones_detalle](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[id_patron] [int] NOT NULL,
	[nro_dia] [int] NOT NULL,
	[id_horario] [int] NULL,
	[etiqueta] [nvarchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_patron_dia] UNIQUE NONCLUSTERED 
(
	[id_patron] ASC,
	[nro_dia] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[marcaje_sites]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[marcaje_sites](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](200) NOT NULL,
	[lat] [decimal](10, 7) NOT NULL,
	[long] [decimal](10, 7) NOT NULL,
	[radio_metros] [int] NOT NULL,
	[accuracy_max] [int] NOT NULL,
	[activo] [bit] NOT NULL,
	[creado_en] [datetime2](7) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[marcaje_solicitudes]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[marcaje_solicitudes](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[carnet] [varchar](20) NOT NULL,
	[asistencia_id] [int] NULL,
	[tipo_solicitud] [varchar](50) NOT NULL,
	[motivo] [nvarchar](max) NOT NULL,
	[estado] [varchar](20) NOT NULL,
	[admin_comentario] [nvarchar](500) NULL,
	[creado_en] [datetime2](7) NOT NULL,
	[resuelto_en] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[marcaje_usuario_geocercas]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[marcaje_usuario_geocercas](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[carnet] [nvarchar](20) NOT NULL,
	[id_site] [int] NOT NULL,
	[activo] [bit] NOT NULL,
	[creado_en] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_AuditLog]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_AuditLog](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NULL,
	[accion] [nvarchar](100) NOT NULL,
	[entidad] [nvarchar](100) NULL,
	[entidadId] [nvarchar](50) NULL,
	[datosAnteriores] [nvarchar](max) NULL,
	[datosNuevos] [nvarchar](max) NULL,
	[fecha] [datetime] NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_Auditoria]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_Auditoria](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NULL,
	[accion] [nvarchar](100) NOT NULL,
	[entidad] [nvarchar](100) NULL,
	[entidadId] [nvarchar](50) NULL,
	[datosAnteriores] [nvarchar](max) NULL,
	[datosNuevos] [nvarchar](max) NULL,
	[fecha] [datetime] NULL,
	[carnet] [nvarchar](50) NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_Bloqueos]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_Bloqueos](
	[idBloqueo] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NOT NULL,
	[descripcion] [nvarchar](max) NOT NULL,
	[fechaCreacion] [datetime] NULL,
	[fechaResolucion] [datetime] NULL,
	[estado] [nvarchar](50) NULL,
	[resolucion] [nvarchar](max) NULL,
	[idResueltoPor] [int] NULL,
	[prioridad] [nvarchar](20) NULL,
	[categoria] [nvarchar](50) NULL,
	[idTarea] [int] NULL,
	[creadoEn] [datetime] NULL,
	[idOrigenUsuario] [int] NULL,
	[idDestinoUsuario] [int] NULL,
	[destinoTexto] [nvarchar](200) NULL,
	[motivo] [nvarchar](1000) NULL,
	[accionMitigacion] [nvarchar](1000) NULL,
	[origenCarnet] [nvarchar](50) NULL,
	[destinoCarnet] [nvarchar](50) NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_Checkins]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_Checkins](
	[idCheckin] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NOT NULL,
	[fecha] [date] NOT NULL,
	[prioridad1] [nvarchar](500) NULL,
	[prioridad2] [nvarchar](500) NULL,
	[prioridad3] [nvarchar](500) NULL,
	[estado] [nvarchar](50) NULL,
	[energia] [int] NULL,
	[creadoEn] [datetime] NULL,
	[comentarios] [nvarchar](max) NULL,
	[entregableTexto] [nvarchar](max) NULL,
	[nota] [nvarchar](max) NULL,
	[linkEvidencia] [nvarchar](max) NULL,
	[estadoAnimo] [nvarchar](50) NULL,
	[idNodo] [int] NULL,
	[fechaCreacion] [datetime] NULL,
	[usuarioCarnet] [nvarchar](50) NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_CheckinTareas]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_CheckinTareas](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idCheckin] [int] NOT NULL,
	[idTarea] [int] NULL,
	[descripcion] [nvarchar](500) NULL,
	[completado] [bit] NULL,
	[orden] [int] NULL,
	[tipo] [nvarchar](50) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_delegacion_visibilidad]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_delegacion_visibilidad](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[carnet_delegante] [nvarchar](100) NOT NULL,
	[carnet_delegado] [nvarchar](100) NOT NULL,
	[activo] [bit] NULL,
	[fecha_inicio] [date] NULL,
	[fecha_fin] [date] NULL,
	[motivo] [nvarchar](300) NULL,
	[creado_en] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_Dispositivos]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_Dispositivos](
	[idDispositivo] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NOT NULL,
	[tokenFCM] [nvarchar](500) NOT NULL,
	[plataforma] [nvarchar](50) NULL,
	[fechaRegistro] [datetime] NULL,
	[ultimoUso] [datetime] NULL,
	[activo] [bit] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_FocoDiario]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_FocoDiario](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NOT NULL,
	[fecha] [date] NOT NULL,
	[foco] [nvarchar](500) NOT NULL,
	[completado] [bit] NULL,
	[creadoEn] [datetime] NULL,
	[carnet] [nvarchar](50) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_FocoDiario_v2]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_FocoDiario_v2](
	[idFoco] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NOT NULL,
	[idTarea] [int] NOT NULL,
	[fecha] [date] NOT NULL,
	[esEstrategico] [bit] NULL,
	[completado] [bit] NULL,
	[orden] [int] NULL,
	[creadoEn] [datetime] NULL,
 CONSTRAINT [PK_p_FocoDiario_v2] PRIMARY KEY CLUSTERED 
(
	[idFoco] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_Logs]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_Logs](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NULL,
	[accion] [nvarchar](100) NOT NULL,
	[entidad] [nvarchar](100) NULL,
	[entidadId] [nvarchar](50) NULL,
	[datos] [nvarchar](max) NULL,
	[ip] [nvarchar](50) NULL,
	[fecha] [datetime] NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_LogSistema]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_LogSistema](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NULL,
	[accion] [nvarchar](100) NOT NULL,
	[entidad] [nvarchar](100) NULL,
	[entidadId] [nvarchar](50) NULL,
	[datos] [nvarchar](max) NULL,
	[ip] [nvarchar](50) NULL,
	[fecha] [datetime] NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_Notas]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_Notas](
	[idNota] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NOT NULL,
	[titulo] [nvarchar](300) NULL,
	[contenido] [nvarchar](max) NULL,
	[fechaCreacion] [datetime] NULL,
	[fechaModificacion] [datetime] NULL,
	[tipo] [nvarchar](50) NULL,
	[fechaActualizacion] [datetime] NULL,
	[etiquetas] [nvarchar](500) NULL,
	[procesado] [bit] NULL,
	[carnet] [nvarchar](50) NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_Notificaciones_Enviadas]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_Notificaciones_Enviadas](
	[idNotificacion] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NULL,
	[carnet] [nvarchar](50) NULL,
	[correo] [nvarchar](255) NOT NULL,
	[tipo] [nvarchar](100) NOT NULL,
	[asunto] [nvarchar](500) NOT NULL,
	[idEntidad] [nvarchar](50) NULL,
	[estado] [nvarchar](50) NOT NULL,
	[error] [nvarchar](max) NULL,
	[fechaEnvio] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[idNotificacion] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_organizacion_nodos]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_organizacion_nodos](
	[idorg] [bigint] NOT NULL,
	[padre] [bigint] NULL,
	[descripcion] [nvarchar](100) NULL,
	[tipo] [nvarchar](50) NULL,
	[estado] [nvarchar](50) NULL,
	[nivel] [nvarchar](200) NULL,
	[updated_at] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_OrganizacionNodos]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_OrganizacionNodos](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](200) NOT NULL,
	[tipo] [nvarchar](50) NULL,
	[idPadre] [int] NULL,
	[orden] [int] NULL,
	[activo] [bit] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_permiso_area]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_permiso_area](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[carnet_otorga] [nvarchar](100) NULL,
	[carnet_recibe] [nvarchar](100) NOT NULL,
	[idorg_raiz] [bigint] NULL,
	[alcance] [nvarchar](20) NULL,
	[activo] [bit] NULL,
	[fecha_inicio] [date] NULL,
	[fecha_fin] [date] NULL,
	[motivo] [nvarchar](300) NULL,
	[creado_en] [datetime] NULL,
	[nombre_area] [nvarchar](255) NULL,
	[tipo_nivel] [nvarchar](50) NULL,
	[tipo_acceso] [nvarchar](20) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_permiso_empleado]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_permiso_empleado](
	[id] [bigint] IDENTITY(1,1) NOT NULL,
	[carnet_otorga] [nvarchar](100) NULL,
	[carnet_recibe] [nvarchar](100) NOT NULL,
	[carnet_objetivo] [nvarchar](100) NOT NULL,
	[activo] [bit] NULL,
	[fecha_inicio] [date] NULL,
	[fecha_fin] [date] NULL,
	[motivo] [nvarchar](300) NULL,
	[creado_en] [datetime] NULL,
	[tipo_acceso] [nvarchar](20) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_PlanesTrabajo]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_PlanesTrabajo](
	[idPlan] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NOT NULL,
	[mes] [int] NOT NULL,
	[anio] [int] NOT NULL,
	[estado] [nvarchar](50) NULL,
	[fechaCreacion] [datetime] NULL,
	[fechaAprobacion] [datetime] NULL,
	[idAprobador] [int] NULL,
	[observaciones] [nvarchar](max) NULL,
	[fechaActualizacion] [datetime] NULL,
	[comentarios] [nvarchar](max) NULL,
	[carnet] [nvarchar](50) NULL,
	[objetivos] [nvarchar](max) NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_ProyectoColaboradores]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_ProyectoColaboradores](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idProyecto] [int] NOT NULL,
	[idUsuario] [int] NOT NULL,
	[rolColaboracion] [nvarchar](50) NOT NULL,
	[permisosCustom] [nvarchar](max) NULL,
	[invitadoPor] [int] NOT NULL,
	[fechaInvitacion] [datetime] NULL,
	[fechaExpiracion] [datetime] NULL,
	[activo] [bit] NULL,
	[notas] [nvarchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_ProyColab_Usuario] UNIQUE NONCLUSTERED 
(
	[idProyecto] ASC,
	[idUsuario] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_Proyectos]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_Proyectos](
	[idProyecto] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](300) NOT NULL,
	[descripcion] [nvarchar](max) NULL,
	[idNodoDuenio] [int] NULL,
	[fechaCreacion] [datetime] NULL,
	[pais] [nvarchar](10) NULL,
	[tipo] [nvarchar](50) NULL,
	[estado] [nvarchar](50) NULL,
	[requiereAprobacion] [bit] NULL,
	[enllavado] [bit] NULL,
	[fechaInicio] [datetime] NULL,
	[fechaFin] [datetime] NULL,
	[area] [nvarchar](200) NULL,
	[subgerencia] [nvarchar](200) NULL,
	[gerencia] [nvarchar](200) NULL,
	[idCreador] [int] NULL,
	[idResponsable] [int] NULL,
	[prioridad] [nvarchar](20) NULL,
	[fechaActualizacion] [datetime] NULL,
	[creadorCarnet] [nvarchar](50) NULL,
	[responsableCarnet] [nvarchar](50) NULL,
	[modoVisibilidad] [nvarchar](30) NOT NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_Roles]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_Roles](
	[idRol] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
	[descripcion] [nvarchar](500) NULL,
	[esSistema] [bit] NULL,
	[reglas] [nvarchar](max) NULL,
	[defaultMenu] [nvarchar](max) NULL,
	[fechaActualizacion] [datetime] NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_RolesColaboracion]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_RolesColaboracion](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](50) NOT NULL,
	[permisos] [nvarchar](max) NOT NULL,
	[esSistema] [bit] NULL,
	[orden] [int] NULL,
	[fechaCreacion] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[nombre] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_SeguridadPerfiles]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_SeguridadPerfiles](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](100) NOT NULL,
	[permisos] [nvarchar](max) NULL,
	[activo] [bit] NULL,
	[fechaActualizacion] [datetime] NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_SlowQueries]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_SlowQueries](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[fecha] [datetime] NULL,
	[duracionMS] [int] NOT NULL,
	[sqlText] [nvarchar](max) NOT NULL,
	[parametros] [nvarchar](max) NULL,
	[tipo] [nvarchar](50) NULL,
	[origen] [nvarchar](200) NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_SolicitudCambios]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_SolicitudCambios](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idTarea] [int] NOT NULL,
	[idSolicitante] [int] NOT NULL,
	[tipo] [nvarchar](50) NOT NULL,
	[descripcion] [nvarchar](max) NULL,
	[estado] [nvarchar](50) NULL,
	[fechaSolicitud] [datetime] NULL,
	[fechaRespuesta] [datetime] NULL,
	[idResponsable] [int] NULL,
	[respuesta] [nvarchar](max) NULL,
	[carnetSolicitante] [nvarchar](50) NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_SolicitudesCambio]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_SolicitudesCambio](
	[idSolicitud] [int] IDENTITY(1,1) NOT NULL,
	[idTarea] [int] NOT NULL,
	[idUsuarioSolicitante] [int] NOT NULL,
	[campo] [nvarchar](50) NOT NULL,
	[valorAnterior] [nvarchar](max) NULL,
	[valorNuevo] [nvarchar](max) NULL,
	[motivo] [nvarchar](max) NULL,
	[estado] [nvarchar](20) NULL,
	[fechaSolicitud] [datetime] NULL,
	[fechaResolucion] [datetime] NULL,
	[idUsuarioResolutor] [int] NULL,
	[comentarioResolucion] [nvarchar](max) NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_TareaAsignacionLog]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_TareaAsignacionLog](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idTarea] [int] NOT NULL,
	[idUsuarioAnterior] [int] NULL,
	[idUsuarioNuevo] [int] NULL,
	[idEjecutor] [int] NOT NULL,
	[tipoAccion] [nvarchar](50) NOT NULL,
	[motivo] [nvarchar](500) NULL,
	[fecha_inicio] [datetime] NULL,
	[fecha_fin] [datetime] NULL,
	[activo] [bit] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_TareaAsignados]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_TareaAsignados](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idTarea] [int] NOT NULL,
	[idUsuario] [int] NOT NULL,
	[esResponsable] [bit] NULL,
	[fechaAsignacion] [datetime] NULL,
	[tipo] [nvarchar](50) NULL,
	[carnet] [nvarchar](50) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_TareaAvanceMensual]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_TareaAvanceMensual](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idTarea] [int] NOT NULL,
	[mes] [int] NOT NULL,
	[anio] [int] NOT NULL,
	[porcentajeMes] [decimal](18, 0) NOT NULL,
	[comentario] [nvarchar](max) NULL,
	[idUsuarioActualizador] [int] NOT NULL,
	[fechaActualizacion] [datetime] NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_TareaAvances]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_TareaAvances](
	[idLog] [int] IDENTITY(1,1) NOT NULL,
	[idTarea] [int] NOT NULL,
	[idUsuario] [int] NOT NULL,
	[progreso] [int] NULL,
	[comentario] [nvarchar](max) NULL,
	[fecha] [datetime] NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_TareaInstancia]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_TareaInstancia](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idTarea] [int] NOT NULL,
	[idRecurrencia] [int] NULL,
	[fechaProgramada] [date] NOT NULL,
	[fechaEjecucion] [date] NULL,
	[estadoInstancia] [nvarchar](30) NULL,
	[comentario] [nvarchar](max) NULL,
	[idUsuarioEjecutor] [int] NULL,
	[fechaRegistro] [datetime] NULL,
	[fechaReprogramada] [date] NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_TareaRecordatorios]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_TareaRecordatorios](
	[idRecordatorio] [int] IDENTITY(1,1) NOT NULL,
	[idTarea] [int] NOT NULL,
	[idUsuario] [int] NOT NULL,
	[fechaHoraRecordatorio] [datetime] NOT NULL,
	[nota] [nvarchar](200) NULL,
	[enviado] [bit] NULL,
	[creadoEn] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[idRecordatorio] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_TareaRecurrencia]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_TareaRecurrencia](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idTarea] [int] NOT NULL,
	[tipoRecurrencia] [nvarchar](20) NOT NULL,
	[diasSemana] [nvarchar](20) NULL,
	[diaMes] [int] NULL,
	[fechaInicioVigencia] [date] NOT NULL,
	[fechaFinVigencia] [date] NULL,
	[activo] [bit] NULL,
	[fechaCreacion] [datetime] NULL,
	[idCreador] [int] NOT NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_Tareas]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_Tareas](
	[idTarea] [int] IDENTITY(1,1) NOT NULL,
	[idProyecto] [int] NULL,
	[nombre] [nvarchar](500) NOT NULL,
	[descripcion] [nvarchar](max) NULL,
	[estado] [nvarchar](50) NULL,
	[prioridad] [nvarchar](20) NULL,
	[fechaCreacion] [datetime] NULL,
	[fechaObjetivo] [datetime] NULL,
	[fechaCompletado] [datetime] NULL,
	[porcentaje] [int] NULL,
	[idPadre] [int] NULL,
	[orden] [int] NULL,
	[esHito] [bit] NULL,
	[idAsignado] [int] NULL,
	[tipoTarea] [nvarchar](50) NULL,
	[fechaActualizacion] [datetime] NULL,
	[idCreador] [int] NULL,
	[fechaInicioPlanificada] [datetime] NULL,
	[tipo] [nvarchar](50) NULL,
	[esfuerzo] [nvarchar](20) NULL,
	[fechaInicioReal] [datetime] NULL,
	[fechaFinReal] [datetime] NULL,
	[comportamiento] [nvarchar](20) NULL,
	[idGrupo] [int] NULL,
	[numeroParte] [int] NULL,
	[linkEvidencia] [nvarchar](max) NULL,
	[activo] [bit] NOT NULL,
	[motivoDeshabilitacion] [nvarchar](max) NULL,
	[deshabilitadoPor] [int] NULL,
	[fechaDeshabilitacion] [datetime] NULL,
	[idTareaPadre] [int] NULL,
	[requiereEvidencia] [bit] NULL,
	[idEntregable] [int] NULL,
	[creadorCarnet] [nvarchar](50) NULL,
	[asignadoCarnet] [nvarchar](50) NULL,
	[idPlan] [int] NULL,
	[semana] [int] NULL,
 CONSTRAINT [PK_p_Tareas] PRIMARY KEY CLUSTERED 
(
	[idTarea] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_UsuarioCredenciales]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_UsuarioCredenciales](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NOT NULL,
	[passwordHash] [nvarchar](500) NOT NULL,
	[ultimoCambio] [datetime] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_Usuarios]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_Usuarios](
	[idUsuario] [int] IDENTITY(1,1) NOT NULL,
	[nombre] [nvarchar](200) NULL,
	[nombreCompleto] [nvarchar](300) NULL,
	[correo] [nvarchar](200) NOT NULL,
	[activo] [bit] NULL,
	[rolGlobal] [nvarchar](50) NULL,
	[idRol] [int] NULL,
	[carnet] [nvarchar](50) NULL,
	[cargo] [nvarchar](200) NULL,
	[departamento] [nvarchar](200) NULL,
	[orgDepartamento] [nvarchar](200) NULL,
	[orgGerencia] [nvarchar](200) NULL,
	[idOrg] [nvarchar](50) NULL,
	[jefeCarnet] [nvarchar](50) NULL,
	[jefeNombre] [nvarchar](200) NULL,
	[jefeCorreo] [nvarchar](200) NULL,
	[fechaIngreso] [datetime] NULL,
	[genero] [nvarchar](20) NULL,
	[primer_nivel] [nvarchar](200) NULL,
	[gerencia] [nvarchar](200) NULL,
	[ogerencia] [nvarchar](200) NULL,
	[subgerencia] [nvarchar](200) NULL,
	[pais] [nvarchar](10) NULL,
	[telefono] [nvarchar](50) NULL,
	[fechaCreacion] [datetime] NULL,
	[username] [nvarchar](100) NULL,
	[cedula] [nvarchar](50) NULL,
	[area] [nvarchar](200) NULL,
	[direccion] [nvarchar](max) NULL,
	[empresa] [nvarchar](200) NULL,
	[ubicacion] [nvarchar](200) NULL,
	[tipo_empleado] [nvarchar](100) NULL,
	[tipo_contrato] [nvarchar](100) NULL,
	[fuente_datos] [nvarchar](50) NULL,
	[segundo_nivel] [nvarchar](200) NULL,
	[tercer_nivel] [nvarchar](200) NULL,
	[cuarto_nivel] [nvarchar](200) NULL,
	[quinto_nivel] [nvarchar](200) NULL,
	[sexto_nivel] [nvarchar](200) NULL,
	[carnet_jefe2] [nvarchar](50) NULL,
	[carnet_jefe3] [nvarchar](50) NULL,
	[carnet_jefe4] [nvarchar](50) NULL,
	[fechaActualizacion] [datetime] NULL,
	[eliminado] [bit] NOT NULL,
 CONSTRAINT [PK_p_Usuarios] PRIMARY KEY CLUSTERED 
(
	[idUsuario] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_Usuarios_OLD]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_Usuarios_OLD](
	[idUsuario] [int] NULL,
	[carnet] [nvarchar](100) NULL,
	[nombre] [nvarchar](255) NULL,
	[correo] [nvarchar](255) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_UsuariosConfig]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_UsuariosConfig](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NOT NULL,
	[menuPersonalizado] [nvarchar](max) NULL,
	[temasPreferidos] [nvarchar](500) NULL,
	[notificaciones] [bit] NULL,
	[fechaActualizacion] [datetime] NULL,
	[idioma] [nvarchar](10) NULL,
	[tema] [nvarchar](20) NULL,
	[agendaConfig] [nvarchar](max) NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_UsuariosCredenciales]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_UsuariosCredenciales](
	[idCredencial] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NOT NULL,
	[passwordHash] [nvarchar](500) NOT NULL,
	[ultimoCambio] [datetime] NULL,
	[ultimoLogin] [datetime] NULL,
	[refreshTokenHash] [nvarchar](500) NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[p_UsuariosOrganizacion]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[p_UsuariosOrganizacion](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[idUsuario] [int] NOT NULL,
	[idNodo] [int] NOT NULL,
	[esResponsable] [bit] NULL
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[vc_agenda_dia]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[vc_agenda_dia](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[carnet] [varchar](20) NOT NULL,
	[cliente_id] [int] NOT NULL,
	[fecha] [date] NOT NULL,
	[orden] [int] NOT NULL,
	[estado] [varchar](20) NULL,
	[notas] [nvarchar](500) NULL,
	[visita_id] [int] NULL,
	[creado_en] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[vc_clientes]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[vc_clientes](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[codigo] [varchar](50) NOT NULL,
	[nombre] [nvarchar](200) NOT NULL,
	[direccion] [nvarchar](500) NULL,
	[telefono] [varchar](20) NULL,
	[contacto] [nvarchar](100) NULL,
	[lat] [decimal](10, 7) NULL,
	[long] [decimal](10, 7) NULL,
	[radio_metros] [int] NOT NULL,
	[zona] [nvarchar](100) NULL,
	[activo] [bit] NOT NULL,
	[importado_en] [datetime2](7) NULL,
	[creado_en] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[codigo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[vc_formularios_respuestas]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[vc_formularios_respuestas](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[visita_id] [int] NOT NULL,
	[campo_id] [varchar](50) NOT NULL,
	[campo_label] [nvarchar](200) NOT NULL,
	[valor] [nvarchar](max) NULL,
	[tipo] [varchar](20) NOT NULL,
	[creado_en] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[vc_metas]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[vc_metas](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[carnet] [varchar](20) NOT NULL,
	[periodo] [varchar](10) NOT NULL,
	[meta_visitas] [int] NOT NULL,
	[meta_km] [decimal](10, 2) NULL,
	[costo_km] [decimal](10, 4) NULL,
	[vigente_desde] [date] NOT NULL,
	[vigente_hasta] [date] NULL,
	[activo] [bit] NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[vc_tracking_gps]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[vc_tracking_gps](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[carnet] [varchar](20) NOT NULL,
	[lat] [decimal](10, 7) NOT NULL,
	[long] [decimal](10, 7) NOT NULL,
	[accuracy] [decimal](10, 2) NULL,
	[velocidad] [decimal](10, 2) NULL,
	[timestamp] [datetime2](7) NOT NULL,
	[valido] [bit] NOT NULL,
	[fuente] [varchar](20) NULL,
	[creado_en] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[vc_visitas]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[vc_visitas](
	[id] [int] IDENTITY(1,1) NOT NULL,
	[carnet] [varchar](20) NOT NULL,
	[cliente_id] [int] NOT NULL,
	[agenda_id] [int] NULL,
	[lat_inicio] [decimal](10, 7) NULL,
	[long_inicio] [decimal](10, 7) NULL,
	[accuracy_inicio] [decimal](10, 2) NULL,
	[timestamp_inicio] [datetime2](7) NOT NULL,
	[distancia_inicio_m] [int] NULL,
	[valido_inicio] [bit] NOT NULL,
	[lat_fin] [decimal](10, 7) NULL,
	[long_fin] [decimal](10, 7) NULL,
	[accuracy_fin] [decimal](10, 2) NULL,
	[timestamp_fin] [datetime2](7) NULL,
	[duracion_minutos]  AS (datediff(minute,[timestamp_inicio],[timestamp_fin])) PERSISTED,
	[estado] [varchar](20) NOT NULL,
	[observacion] [nvarchar](max) NULL,
	[foto_path] [nvarchar](500) NULL,
	[firma_path] [nvarchar](500) NULL,
	[motivo_fuera_zona] [nvarchar](300) NULL,
	[offline_id] [varchar](100) NULL,
	[sincronizado] [bit] NOT NULL,
	[creado_en] [datetime2](7) NULL,
PRIMARY KEY CLUSTERED 
(
	[id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
UNIQUE NONCLUSTERED 
(
	[offline_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Index [IX_rp_recorrido]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_rp_recorrido] ON [dbo].[campo_recorrido_puntos]
(
	[id_recorrido] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_recorrido_carnet]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_recorrido_carnet] ON [dbo].[campo_recorridos]
(
	[carnet] ASC,
	[fecha] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_asig_carnet_fecha]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_asig_carnet_fecha] ON [dbo].[marcaje_asignacion]
(
	[carnet] ASC,
	[fecha_inicio] ASC,
	[fecha_fin] ASC
)
WHERE ([activo]=(1))
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_marcaje_asistencias_carnet_fecha]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_marcaje_asistencias_carnet_fecha] ON [dbo].[marcaje_asistencias]
(
	[carnet] ASC,
	[fecha] DESC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_marcaje_gps_tracking_carnet]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_marcaje_gps_tracking_carnet] ON [dbo].[marcaje_gps_tracking]
(
	[carnet] ASC,
	[timestamp] DESC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_ug_carnet]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_ug_carnet] ON [dbo].[marcaje_usuario_geocercas]
(
	[carnet] ASC
)
WHERE ([activo]=(1))
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Notificaciones_Carnet]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_Notificaciones_Carnet] ON [dbo].[p_Notificaciones_Enviadas]
(
	[carnet] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Notificaciones_Fecha]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_Notificaciones_Fecha] ON [dbo].[p_Notificaciones_Enviadas]
(
	[fechaEnvio] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_Notificaciones_Tipo]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_Notificaciones_Tipo] ON [dbo].[p_Notificaciones_Enviadas]
(
	[tipo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ProyColab_Proyecto]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_ProyColab_Proyecto] ON [dbo].[p_ProyectoColaboradores]
(
	[idProyecto] ASC
)
WHERE ([activo]=(1))
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_ProyColab_Usuario]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_ProyColab_Usuario] ON [dbo].[p_ProyectoColaboradores]
(
	[idUsuario] ASC
)
WHERE ([activo]=(1))
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_Recordatorios_Pendientes]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_Recordatorios_Pendientes] ON [dbo].[p_TareaRecordatorios]
(
	[fechaHoraRecordatorio] ASC,
	[enviado] ASC
)
WHERE ([enviado]=(0))
WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_vc_agenda_unica]    Script Date: 14/3/2026 22:46:00 ******/
CREATE UNIQUE NONCLUSTERED INDEX [IX_vc_agenda_unica] ON [dbo].[vc_agenda_dia]
(
	[carnet] ASC,
	[cliente_id] ASC,
	[fecha] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, IGNORE_DUP_KEY = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_vc_clientes_zona]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_vc_clientes_zona] ON [dbo].[vc_clientes]
(
	[zona] ASC,
	[activo] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_vc_tracking_carnet]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_vc_tracking_carnet] ON [dbo].[vc_tracking_gps]
(
	[carnet] ASC,
	[timestamp] DESC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
SET ANSI_PADDING ON
GO
/****** Object:  Index [IX_vc_visitas_carnet_fecha]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_vc_visitas_carnet_fecha] ON [dbo].[vc_visitas]
(
	[carnet] ASC,
	[timestamp_inicio] DESC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
/****** Object:  Index [IX_vc_visitas_cliente]    Script Date: 14/3/2026 22:46:00 ******/
CREATE NONCLUSTERED INDEX [IX_vc_visitas_cliente] ON [dbo].[vc_visitas]
(
	[cliente_id] ASC,
	[timestamp_inicio] DESC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, SORT_IN_TEMPDB = OFF, DROP_EXISTING = OFF, ONLINE = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
GO
ALTER TABLE [dbo].[campo_recorrido_puntos] ADD  DEFAULT (getdate()) FOR [timestamp_gps]
GO
ALTER TABLE [dbo].[campo_recorrido_puntos] ADD  DEFAULT ('RUTA') FOR [tipo]
GO
ALTER TABLE [dbo].[campo_recorridos] ADD  DEFAULT (CONVERT([date],getdate())) FOR [fecha]
GO
ALTER TABLE [dbo].[campo_recorridos] ADD  DEFAULT (getdate()) FOR [hora_inicio]
GO
ALTER TABLE [dbo].[campo_recorridos] ADD  DEFAULT ('EN_CURSO') FOR [estado]
GO
ALTER TABLE [dbo].[campo_recorridos] ADD  DEFAULT ((0)) FOR [km_total]
GO
ALTER TABLE [dbo].[campo_recorridos] ADD  DEFAULT ((0)) FOR [duracion_min]
GO
ALTER TABLE [dbo].[campo_recorridos] ADD  DEFAULT ((0)) FOR [total_paradas]
GO
ALTER TABLE [dbo].[campo_recorridos] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[marcaje_asignacion] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[marcaje_asignacion] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[marcaje_asignacion] ADD  DEFAULT (getdate()) FOR [actualizado_en]
GO
ALTER TABLE [dbo].[marcaje_asistencias] ADD  DEFAULT ('ACEPTADA') FOR [estado]
GO
ALTER TABLE [dbo].[marcaje_asistencias] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[marcaje_config_usuario] ADD  DEFAULT ((1)) FOR [permitir_movil]
GO
ALTER TABLE [dbo].[marcaje_config_usuario] ADD  DEFAULT ((1)) FOR [permitir_escritorio]
GO
ALTER TABLE [dbo].[marcaje_config_usuario] ADD  DEFAULT ((0)) FOR [gps_background]
GO
ALTER TABLE [dbo].[marcaje_config_usuario] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[marcaje_config_usuario] ADD  DEFAULT (getdate()) FOR [actualizado_en]
GO
ALTER TABLE [dbo].[marcaje_devices] ADD  DEFAULT ('PENDING') FOR [estado]
GO
ALTER TABLE [dbo].[marcaje_devices] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[marcaje_devices] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[marcaje_gps_tracking] ADD  DEFAULT ('BACKGROUND') FOR [fuente]
GO
ALTER TABLE [dbo].[marcaje_gps_tracking] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[marcaje_horarios] ADD  DEFAULT ((8)) FOR [duracion_horas]
GO
ALTER TABLE [dbo].[marcaje_horarios] ADD  DEFAULT ((0)) FOR [es_nocturno]
GO
ALTER TABLE [dbo].[marcaje_horarios] ADD  DEFAULT ((10)) FOR [tolerancia_min]
GO
ALTER TABLE [dbo].[marcaje_horarios] ADD  DEFAULT ((60)) FOR [descanso_min]
GO
ALTER TABLE [dbo].[marcaje_horarios] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[marcaje_horarios] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[marcaje_horarios] ADD  DEFAULT (getdate()) FOR [actualizado_en]
GO
ALTER TABLE [dbo].[marcaje_ip_whitelist] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[marcaje_patrones] ADD  DEFAULT ((7)) FOR [total_dias]
GO
ALTER TABLE [dbo].[marcaje_patrones] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[marcaje_patrones] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[marcaje_patrones] ADD  DEFAULT (getdate()) FOR [actualizado_en]
GO
ALTER TABLE [dbo].[marcaje_sites] ADD  DEFAULT ((200)) FOR [radio_metros]
GO
ALTER TABLE [dbo].[marcaje_sites] ADD  DEFAULT ((100)) FOR [accuracy_max]
GO
ALTER TABLE [dbo].[marcaje_sites] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[marcaje_sites] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[marcaje_solicitudes] ADD  DEFAULT ('PENDIENTE') FOR [estado]
GO
ALTER TABLE [dbo].[marcaje_solicitudes] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[marcaje_usuario_geocercas] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[marcaje_usuario_geocercas] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[p_FocoDiario_v2] ADD  DEFAULT ((0)) FOR [esEstrategico]
GO
ALTER TABLE [dbo].[p_FocoDiario_v2] ADD  DEFAULT ((0)) FOR [completado]
GO
ALTER TABLE [dbo].[p_FocoDiario_v2] ADD  DEFAULT ((0)) FOR [orden]
GO
ALTER TABLE [dbo].[p_FocoDiario_v2] ADD  DEFAULT (getdate()) FOR [creadoEn]
GO
ALTER TABLE [dbo].[p_Notificaciones_Enviadas] ADD  DEFAULT (getdate()) FOR [fechaEnvio]
GO
ALTER TABLE [dbo].[p_ProyectoColaboradores] ADD  DEFAULT ('Colaborador') FOR [rolColaboracion]
GO
ALTER TABLE [dbo].[p_ProyectoColaboradores] ADD  DEFAULT (getdate()) FOR [fechaInvitacion]
GO
ALTER TABLE [dbo].[p_ProyectoColaboradores] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[p_Proyectos] ADD  CONSTRAINT [DF_Proyectos_ModoVisibilidad]  DEFAULT ('JERARQUIA') FOR [modoVisibilidad]
GO
ALTER TABLE [dbo].[p_RolesColaboracion] ADD  DEFAULT ((0)) FOR [esSistema]
GO
ALTER TABLE [dbo].[p_RolesColaboracion] ADD  DEFAULT ((0)) FOR [orden]
GO
ALTER TABLE [dbo].[p_RolesColaboracion] ADD  DEFAULT (getdate()) FOR [fechaCreacion]
GO
ALTER TABLE [dbo].[p_TareaRecordatorios] ADD  DEFAULT ((0)) FOR [enviado]
GO
ALTER TABLE [dbo].[p_TareaRecordatorios] ADD  DEFAULT (getdate()) FOR [creadoEn]
GO
ALTER TABLE [dbo].[vc_agenda_dia] ADD  DEFAULT ((1)) FOR [orden]
GO
ALTER TABLE [dbo].[vc_agenda_dia] ADD  DEFAULT ('PENDIENTE') FOR [estado]
GO
ALTER TABLE [dbo].[vc_agenda_dia] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[vc_clientes] ADD  DEFAULT ((100)) FOR [radio_metros]
GO
ALTER TABLE [dbo].[vc_clientes] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[vc_clientes] ADD  DEFAULT (getdate()) FOR [importado_en]
GO
ALTER TABLE [dbo].[vc_clientes] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[vc_formularios_respuestas] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[vc_metas] ADD  DEFAULT ((10)) FOR [meta_visitas]
GO
ALTER TABLE [dbo].[vc_metas] ADD  DEFAULT ((0.15)) FOR [costo_km]
GO
ALTER TABLE [dbo].[vc_metas] ADD  DEFAULT ((1)) FOR [activo]
GO
ALTER TABLE [dbo].[vc_tracking_gps] ADD  DEFAULT ((1)) FOR [valido]
GO
ALTER TABLE [dbo].[vc_tracking_gps] ADD  DEFAULT ('FOREGROUND') FOR [fuente]
GO
ALTER TABLE [dbo].[vc_tracking_gps] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[vc_visitas] ADD  DEFAULT ((1)) FOR [valido_inicio]
GO
ALTER TABLE [dbo].[vc_visitas] ADD  DEFAULT ('EN_CURSO') FOR [estado]
GO
ALTER TABLE [dbo].[vc_visitas] ADD  DEFAULT ((1)) FOR [sincronizado]
GO
ALTER TABLE [dbo].[vc_visitas] ADD  DEFAULT (getdate()) FOR [creado_en]
GO
ALTER TABLE [dbo].[campo_recorrido_puntos]  WITH CHECK ADD  CONSTRAINT [FK_rp_recorrido] FOREIGN KEY([id_recorrido])
REFERENCES [dbo].[campo_recorridos] ([id_recorrido])
GO
ALTER TABLE [dbo].[campo_recorrido_puntos] CHECK CONSTRAINT [FK_rp_recorrido]
GO
ALTER TABLE [dbo].[marcaje_asignacion]  WITH CHECK ADD  CONSTRAINT [FK_asig_patron] FOREIGN KEY([id_patron])
REFERENCES [dbo].[marcaje_patrones] ([id_patron])
GO
ALTER TABLE [dbo].[marcaje_asignacion] CHECK CONSTRAINT [FK_asig_patron]
GO
ALTER TABLE [dbo].[marcaje_patrones_detalle]  WITH CHECK ADD  CONSTRAINT [FK_patdet_horario] FOREIGN KEY([id_horario])
REFERENCES [dbo].[marcaje_horarios] ([id_horario])
GO
ALTER TABLE [dbo].[marcaje_patrones_detalle] CHECK CONSTRAINT [FK_patdet_horario]
GO
ALTER TABLE [dbo].[marcaje_patrones_detalle]  WITH CHECK ADD  CONSTRAINT [FK_patdet_patron] FOREIGN KEY([id_patron])
REFERENCES [dbo].[marcaje_patrones] ([id_patron])
GO
ALTER TABLE [dbo].[marcaje_patrones_detalle] CHECK CONSTRAINT [FK_patdet_patron]
GO
ALTER TABLE [dbo].[marcaje_usuario_geocercas]  WITH CHECK ADD  CONSTRAINT [FK_ug_site] FOREIGN KEY([id_site])
REFERENCES [dbo].[marcaje_sites] ([id])
GO
ALTER TABLE [dbo].[marcaje_usuario_geocercas] CHECK CONSTRAINT [FK_ug_site]
GO
ALTER TABLE [dbo].[p_FocoDiario_v2]  WITH CHECK ADD  CONSTRAINT [FK_p_FocoDiario_v2_Tareas] FOREIGN KEY([idTarea])
REFERENCES [dbo].[p_Tareas] ([idTarea])
GO
ALTER TABLE [dbo].[p_FocoDiario_v2] CHECK CONSTRAINT [FK_p_FocoDiario_v2_Tareas]
GO
ALTER TABLE [dbo].[p_FocoDiario_v2]  WITH CHECK ADD  CONSTRAINT [FK_p_FocoDiario_v2_Usuarios] FOREIGN KEY([idUsuario])
REFERENCES [dbo].[p_Usuarios] ([idUsuario])
GO
ALTER TABLE [dbo].[p_FocoDiario_v2] CHECK CONSTRAINT [FK_p_FocoDiario_v2_Usuarios]
GO
ALTER TABLE [dbo].[p_TareaRecordatorios]  WITH CHECK ADD  CONSTRAINT [FK_Recordatorio_Tarea] FOREIGN KEY([idTarea])
REFERENCES [dbo].[p_Tareas] ([idTarea])
GO
ALTER TABLE [dbo].[p_TareaRecordatorios] CHECK CONSTRAINT [FK_Recordatorio_Tarea]
GO
ALTER TABLE [dbo].[p_TareaRecordatorios]  WITH CHECK ADD  CONSTRAINT [FK_Recordatorio_Usuario] FOREIGN KEY([idUsuario])
REFERENCES [dbo].[p_Usuarios] ([idUsuario])
GO
ALTER TABLE [dbo].[p_TareaRecordatorios] CHECK CONSTRAINT [FK_Recordatorio_Usuario]
GO
ALTER TABLE [dbo].[p_Proyectos]  WITH CHECK ADD  CONSTRAINT [CK_Proyectos_ModoVisibilidad] CHECK  (([modoVisibilidad]='JERARQUIA_COLABORADOR' OR [modoVisibilidad]='COLABORADOR' OR [modoVisibilidad]='JERARQUIA'))
GO
ALTER TABLE [dbo].[p_Proyectos] CHECK CONSTRAINT [CK_Proyectos_ModoVisibilidad]
GO
/****** Object:  StoredProcedure [dbo].[sp_Acceso_ObtenerArbol]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE    PROCEDURE [dbo].[sp_Acceso_ObtenerArbol]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id AS idorg, nombre, tipo, idPadre AS padre, orden, activo 
    FROM p_OrganizacionNodos WHERE activo = 1;
END;

GO
/****** Object:  StoredProcedure [dbo].[sp_ActualizarTarea]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[sp_ActualizarTarea] 
    @idTarea INT, 
    @titulo NVARCHAR(500) = NULL, 
    @descripcion NVARCHAR(MAX) = NULL, 
    @estado NVARCHAR(50) = NULL, 
    @prioridad NVARCHAR(50) = NULL, 
    @progreso INT = NULL, 
    @fechaObjetivo DATETIME = NULL, 
    @fechaInicioPlanificada DATETIME = NULL, 
    @linkEvidencia NVARCHAR(MAX) = NULL,
    @idTareaPadre INT = NULL
AS 
BEGIN 
    SET NOCOUNT ON; 
    DECLARE @fechaActual DATETIME = GETDATE(); 
    
    UPDATE p_Tareas SET 
        nombre = COALESCE(@titulo, nombre), 
        descripcion = COALESCE(@descripcion, descripcion), 
        estado = CASE WHEN @estado IS NOT NULL THEN @estado WHEN @progreso = 100 THEN 'Hecha' ELSE estado END, 
        prioridad = COALESCE(@prioridad, prioridad), 
        porcentaje = CASE WHEN @progreso IS NOT NULL THEN @progreso WHEN @estado = 'Hecha' THEN 100 ELSE porcentaje END, 
        fechaObjetivo = COALESCE(@fechaObjetivo, fechaObjetivo), 
        fechaInicioPlanificada = COALESCE(@fechaInicioPlanificada, fechaInicioPlanificada), 
        linkEvidencia = COALESCE(@linkEvidencia, linkEvidencia), 
        idTareaPadre = COALESCE(@idTareaPadre, idTareaPadre),
        idPadre = COALESCE(@idTareaPadre, idPadre),
        fechaActualizacion = @fechaActual, 
        fechaCompletado = CASE 
            WHEN (@estado = 'Hecha' OR @progreso = 100) AND fechaCompletado IS NULL THEN @fechaActual 
            WHEN (@estado IS NOT NULL AND @estado != 'Hecha' AND @progreso != 100) THEN NULL 
            ELSE fechaCompletado 
        END 
    WHERE idTarea = @idTarea; 
END
GO
/****** Object:  StoredProcedure [dbo].[sp_ActualizarTarea_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_ActualizarTarea_rust]
    @titulo nvarchar(500) = NULL,
    @descripcion nvarchar(MAX) = NULL,
    @estado nvarchar(50) = NULL,
    @prioridad nvarchar(50) = NULL,
    @progreso int = NULL,
    @fechaObjetivo datetime = NULL,
    @fechaInicioPlanificada datetime = NULL,
    @linkEvidencia nvarchar(MAX) = NULL,
    @idTareaPadre int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ActualizarTarea @titulo, @descripcion, @estado, @prioridad, @progreso, @fechaObjetivo, @fechaInicioPlanificada, @linkEvidencia, @idTareaPadre;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Admin_RecycleBin_Listar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO
CREATE PROCEDURE [dbo].[sp_Admin_RecycleBin_Listar_rust] AS BEGIN SET NOCOUNT ON; SELECT 'Tarea' as tipo, idTarea as id, nombre, fechaCreacion as creadoEn, asignadoCarnet as eliminadoPor FROM p_Tareas WHERE activo = 0 ORDER BY fechaCreacion DESC; END

GO
/****** Object:  StoredProcedure [dbo].[sp_Admin_ReporteInactividad]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sp_Admin_ReporteInactividad]
    @Fecha DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @Fecha IS NULL SET @Fecha = CAST(GETDATE() AS DATE);

    SELECT 
        u.idUsuario,
        u.nombreCompleto,
        u.carnet,
        u.correo,
        u.cargo,
        u.area,
        u.subgerencia,
        u.activo
    FROM p_Usuarios u
    WHERE u.activo = 1
    AND NOT EXISTS (
        -- Verificar logins/actividad en p_Auditoria
        SELECT 1 FROM p_Auditoria a
        WHERE a.idUsuario = u.idUsuario
        AND CAST(a.fecha AS DATE) = @Fecha
    )
    AND NOT EXISTS (
        -- Verificar checkins
        SELECT 1 FROM p_Checkins c
        WHERE c.idUsuario = u.idUsuario
        AND c.fecha = @Fecha
    )
    -- Remover filtro p_Logs original si causa problemas o usarlo con cuidado
    AND NOT EXISTS (
        SELECT 1 FROM p_Logs l
        WHERE l.idUsuario = u.idUsuario
        AND CAST(l.fecha AS DATE) = @Fecha
    )
    ORDER BY u.nombreCompleto;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Admin_Security_UsersAccess_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO
CREATE PROCEDURE [dbo].[sp_Admin_Security_UsersAccess_rust] AS BEGIN SET NOCOUNT ON; SELECT u.idUsuario, u.carnet, u.nombre, u.correo, u.cargo, u.fechaActualizacion as ultimo_acceso, u.activo as estado, u.idRol FROM p_Usuarios u WHERE u.activo = 1 ORDER BY u.nombre; END

GO
/****** Object:  StoredProcedure [dbo].[sp_Admin_Usuario_Crear]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Admin_Usuario_Crear]
    @nombre    NVARCHAR(200),
    @correo    NVARCHAR(200),
    @carnet    NVARCHAR(50) = NULL,
    @cargo     NVARCHAR(100) = NULL,
    @telefono  NVARCHAR(50) = NULL,
    @rol       NVARCHAR(50) = 'Colaborador'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- 1. Validaciones
    IF EXISTS (SELECT 1 FROM dbo.p_Usuarios WHERE correo = @correo)
    BEGIN
        RAISERROR('El correo electrÃ³nico ya estÃ¡ registrado.', 16, 1);
        RETURN;
    END

    IF @carnet IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.p_Usuarios WHERE carnet = @carnet)
    BEGIN
        RAISERROR('El carnet ya estÃ¡ registrado por otro usuario.', 16, 1);
        RETURN;
    END

    -- 2. Obtener idRol basado en el nombre del rol (opcional, fallback a rolGlobal)
    DECLARE @idRol INT = NULL;
    SELECT TOP 1 @idRol = idRol FROM dbo.p_Roles WHERE nombre = @rol OR nombre = 'Empleado';

    BEGIN TRAN;
        INSERT INTO dbo.p_Usuarios (
            nombre, 
            correo, 
            carnet, 
            cargo, 
            telefono, 
            rolGlobal, 
            idRol, 
            activo, 
            fechaCreacion,
            pais
        )
        VALUES (
            @nombre, 
            @correo, 
            @carnet, 
            @cargo, 
            @telefono, 
            @rol, 
            @idRol, 
            1, 
            GETDATE(),
            'NI'
        );

        DECLARE @newId INT = SCOPE_IDENTITY();

        -- 3. Crear registro de configuraciÃ³n bÃ¡sica
        IF NOT EXISTS (SELECT 1 FROM dbo.p_UsuariosConfig WHERE idUsuario = @newId)
        BEGIN
            INSERT INTO dbo.p_UsuariosConfig (idUsuario, fechaActualizacion)
            VALUES (@newId, GETDATE());
        END

        -- 4. Si el password no se maneja aquÃ­ (se asume reset despuÃ©s), 
        -- podrÃ­amos insertar un hash temporal o dejar que el sistema pida reset.
        -- Por ahora, p_UsuariosCredenciales se inicializa con password vacÃ­o o nulo
        -- para que el usuario use la opciÃ³n de "olvidÃ© mi contraseÃ±a" o el admin le asigne una.

    COMMIT TRAN;

    -- Retornar el usuario creado
    SELECT * FROM dbo.p_Usuarios WHERE idUsuario = @newId;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Admin_Usuario_Crear_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Admin_Usuario_Crear_rust]
    @nombre nvarchar(200) = NULL,
    @correo nvarchar(200) = NULL,
    @carnet nvarchar(50) = NULL,
    @cargo nvarchar(100) = NULL,
    @telefono nvarchar(50) = NULL,
    @rol nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Admin_Usuario_Crear @nombre, @correo, @carnet, @cargo, @telefono, @rol;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Admin_Usuario_Eliminar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Admin_Usuario_Eliminar]
    @idUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    -- Verificar si existe la columna eliminado antes de updatear (por seguridad si falla el alter)
    IF EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'eliminado' AND Object_ID = Object_ID(N'dbo.p_Usuarios'))
    BEGIN
        UPDATE dbo.p_Usuarios 
        SET eliminado = 1, 
            activo = 0, 
            fechaActualizacion = GETDATE()
        WHERE idUsuario = @idUsuario;
    END
    ELSE
    BEGIN
        -- Fallback si no hay columna eliminado
        UPDATE dbo.p_Usuarios 
        SET activo = 0, 
            fechaActualizacion = GETDATE()
        WHERE idUsuario = @idUsuario;
    END
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Admin_Usuario_Eliminar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Admin_Usuario_Eliminar_rust]
    @idUsuario int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Admin_Usuario_Eliminar @idUsuario;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Admin_Usuario_RemoverNodo]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Admin_Usuario_RemoverNodo]
    @idUsuario INT,
    @idNodo INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.p_UsuariosOrganizacion 
    WHERE idUsuario = @idUsuario AND idNodo = @idNodo;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Admin_Usuarios_Inactivos_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO
CREATE PROCEDURE [dbo].[sp_Admin_Usuarios_Inactivos_rust] @dias INT = 30 AS BEGIN SET NOCOUNT ON; SELECT idUsuario, carnet, nombre, correo, cargo, fechaActualizacion as ultimo_acceso FROM p_Usuarios WHERE activo = 1 ORDER BY fechaActualizacion ASC; END

GO
/****** Object:  StoredProcedure [dbo].[sp_AgregarFaseGrupo]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- 5.3 SP: Agregar Fase a Grupo (Plan de Trabajo)
CREATE   PROCEDURE [dbo].[sp_AgregarFaseGrupo]
    @idGrupo INT,
    @idTareaNueva INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @n INT;
    SELECT @n = ISNULL(MAX(numeroParte), 0) + 1
    FROM p_Tareas WHERE idGrupo = @idGrupo;

    UPDATE p_Tareas
    SET idGrupo = @idGrupo, numeroParte = @n
    WHERE idTarea = @idTareaNueva;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_AgregarFaseGrupo_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_AgregarFaseGrupo_rust]
    @idGrupo int = NULL,
    @idTareaNueva int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_AgregarFaseGrupo @idGrupo, @idTareaNueva;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Auditoria_Equipo_PorCarnet]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sp_Auditoria_Equipo_PorCarnet]
(
    @carnetSolicitante VARCHAR(20),
    @page              INT = 1,
    @pageSize          INT = 50
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

    -- Sanitización
    SET @carnetSolicitante = LTRIM(RTRIM(@carnetSolicitante));

    IF @page < 1 SET @page = 1;
    IF @pageSize < 1 SET @pageSize = 50;
    IF @pageSize > 500 SET @pageSize = 500;

    -- Equipo visible
    CREATE TABLE #Equipo (
        carnet VARCHAR(20) NOT NULL PRIMARY KEY
    );

    INSERT INTO #Equipo (carnet)
    EXEC dbo.sp_Visibilidad_ObtenerCarnets @carnetSolicitante = @carnetSolicitante;

    IF NOT EXISTS (SELECT 1 FROM #Equipo)
        INSERT INTO #Equipo (carnet) VALUES (@carnetSolicitante);

    -- Query principal (rápida)
    SELECT
        a.id             AS idAuditLog,
        a.carnet,
        u.nombreCompleto AS usuario,
        u.correo         AS correoUsuario,
        a.accion,
        a.entidad        AS recurso,
        a.entidadId      AS recursoId,
        a.datosAnteriores,
        a.datosNuevos,
        a.fecha
    FROM dbo.p_Auditoria a
    INNER JOIN #Equipo e ON e.carnet = a.carnet
    LEFT JOIN dbo.p_Usuarios u ON u.carnet = a.carnet
    ORDER BY a.fecha DESC
    OFFSET (@page - 1) * @pageSize ROWS
    FETCH NEXT @pageSize ROWS ONLY
    OPTION (RECOMPILE);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Auditoria_Equipo_PorCarnet_Contar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

            CREATE   PROCEDURE [dbo].[sp_Auditoria_Equipo_PorCarnet_Contar]
            (
                @carnetSolicitante VARCHAR(20),
                @searchTerm        NVARCHAR(100) = NULL
            )
            AS
            BEGIN
                SET NOCOUNT ON;
                SET @carnetSolicitante = LTRIM(RTRIM(@carnetSolicitante));
                SET @searchTerm = NULLIF(LTRIM(RTRIM(@searchTerm)), '');

                CREATE TABLE #Equipo (
                    carnet VARCHAR(20) NOT NULL PRIMARY KEY
                );

                INSERT INTO #Equipo (carnet)
                EXEC dbo.sp_Visibilidad_ObtenerCarnets @carnetSolicitante = @carnetSolicitante;

                IF NOT EXISTS (SELECT 1 FROM #Equipo)
                BEGIN
                    INSERT INTO #Equipo (carnet)
                    VALUES (@carnetSolicitante);
                END

                SELECT COUNT(*) as total
                FROM dbo.p_Auditoria a
                INNER JOIN #Equipo e ON e.carnet = a.carnet
                LEFT JOIN dbo.p_Usuarios u ON a.carnet = u.carnet
                WHERE
                    @searchTerm IS NULL
                    OR u.nombreCompleto LIKE '%' + @searchTerm + '%' 
                    OR a.accion LIKE '%' + @searchTerm + '%'
                    OR a.entidadId LIKE '%' + @searchTerm + '%'
                    OR a.carnet LIKE '%' + @searchTerm + '%'
                OPTION (RECOMPILE);
            END
        
GO
/****** Object:  StoredProcedure [dbo].[sp_Auditoria_Equipo_PorCarnet_FAST]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

            CREATE   PROCEDURE [dbo].[sp_Auditoria_Equipo_PorCarnet_FAST]
            (
                @carnetSolicitante VARCHAR(20),
                @searchTerm        NVARCHAR(100) = NULL,
                @page              INT = 1,
                @pageSize          INT = 50
            )
            AS
            BEGIN
                SET NOCOUNT ON;
                SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

                -- 1. Inputs y Equipo
                SET @carnetSolicitante = LTRIM(RTRIM(@carnetSolicitante));
                SET @searchTerm = NULLIF(LTRIM(RTRIM(@searchTerm)), '');

                IF @page < 1 SET @page = 1;
                IF @pageSize < 1 SET @pageSize = 500; -- Permitir mas filas si piden

                CREATE TABLE #Equipo (carnet VARCHAR(20) NOT NULL PRIMARY KEY);
                INSERT INTO #Equipo (carnet) EXEC dbo.sp_Visibilidad_ObtenerCarnets @carnetSolicitante = @carnetSolicitante;
                IF NOT EXISTS (SELECT 1 FROM #Equipo) INSERT INTO #Equipo VALUES (@carnetSolicitante);

                -- 2. Identificar IDs Paginados (Lógica Filtro + Paginación)
                --    Esto es lo único pesado, el resto es ligero.
                
                CREATE TABLE #PagedIds (id BIGINT PRIMARY KEY, rowNum INT);

                IF @searchTerm IS NULL
                BEGIN
                    INSERT INTO #PagedIds (id, rowNum)
                    SELECT id, ROW_NUMBER() OVER (ORDER BY a.fecha DESC)
                    FROM dbo.p_Auditoria a
                    INNER JOIN #Equipo e ON e.carnet = a.carnet
                    WHERE a.accion <> 'USUARIO_LOGIN'
                    ORDER BY a.fecha DESC
                    OFFSET (@page - 1) * @pageSize ROWS
                    FETCH NEXT @pageSize ROWS ONLY;
                END
                ELSE
                BEGIN
                    -- Lógica dinámica incrustada para máximo performance
                    DECLARE @entidadIdNum BIGINT = TRY_CONVERT(BIGINT, @searchTerm);
                    
                    INSERT INTO #PagedIds (id, rowNum)
                    SELECT a.id, ROW_NUMBER() OVER (ORDER BY a.fecha DESC)
                    FROM dbo.p_Auditoria a
                    INNER JOIN #Equipo e ON e.carnet = a.carnet
                    WHERE a.accion <> 'USUARIO_LOGIN'
                    AND (
                        (@entidadIdNum IS NOT NULL AND a.entidadId = @entidadIdNum)
                        OR 
                        (@entidadIdNum IS NULL AND (
                             (LEN(@searchTerm) <= 20 AND a.carnet = @searchTerm)
                             OR a.accion LIKE '%' + @searchTerm + '%' 
                             OR a.entidad LIKE '%' + @searchTerm + '%'
                        ))
                    )
                    ORDER BY a.fecha DESC
                    OFFSET (@page - 1) * @pageSize ROWS
                    FETCH NEXT @pageSize ROWS ONLY;
                END

                -- 3. Enriquecimiento Final (JOINs solo para las N filas encontradas)
                SELECT 
                    a.id AS idAuditLog,
                    a.carnet,
                    u.nombreCompleto AS usuario,
                    a.accion,
                    a.entidad AS recurso,
                    a.entidadId AS recursoId,
                    LEFT(a.datosNuevos, 500) AS datosNuevos,
                    -- Columnas separadas para UX
                    CASE WHEN a.entidad = 'Tarea' THEN t.nombre ELSE NULL END as tareaTitulo,
                    COALESCE(pt.nombre, p.nombre) as proyectoTitulo
                FROM #PagedIds pi
                INNER JOIN dbo.p_Auditoria a ON a.id = pi.id
                LEFT JOIN dbo.p_Usuarios u ON u.carnet = a.carnet
                
                -- JOIN Tareas y su Proyecto padre
                LEFT JOIN dbo.p_Tareas t ON a.entidad = 'Tarea' AND t.idTarea = TRY_CAST(a.entidadId AS BIGINT)
                LEFT JOIN dbo.p_Proyectos pt ON t.idProyecto = pt.idProyecto 
                
                -- JOIN Proyectos directos
                LEFT JOIN dbo.p_Proyectos p ON a.entidad = 'Proyecto' AND p.idProyecto = TRY_CAST(a.entidadId AS BIGINT)
                
                ORDER BY pi.rowNum;

                DROP TABLE #Equipo;
                DROP TABLE #PagedIds;
            END
        
GO
/****** Object:  StoredProcedure [dbo].[sp_Bloqueo_Crear]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/* =========================================================
   3) SP Mejorado: sp_Bloqueo_Crear
   ========================================================= */
CREATE   PROCEDURE [dbo].[sp_Bloqueo_Crear]
(
    @idTarea          INT,
    @idOrigenUsuario  INT,
    @idDestinoUsuario INT = NULL,
    @destinoTexto     NVARCHAR(200) = NULL,
    @motivo           NVARCHAR(1000),
    @accionMitigacion NVARCHAR(1000) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @idBloqueo INT;

        SELECT TOP (1) @idBloqueo = b.idBloqueo
        FROM dbo.p_Bloqueos b WITH (UPDLOCK, HOLDLOCK)
        WHERE b.idTarea = @idTarea AND b.estado <> 'Resuelto'
        ORDER BY b.creadoEn DESC;

        IF @idBloqueo IS NULL
        BEGIN
            INSERT INTO dbo.p_Bloqueos
            (idTarea, idOrigenUsuario, idDestinoUsuario, destinoTexto, motivo, accionMitigacion, creadoEn, estado)
            VALUES
            (@idTarea, @idOrigenUsuario, @idDestinoUsuario, @destinoTexto, @motivo, @accionMitigacion, GETDATE(), 'Activo');

            SET @idBloqueo = SCOPE_IDENTITY();
        END

        SELECT @idBloqueo AS idBloqueo;
        
        -- Actualizar estado tarea (fuera del INSERT para asegurar que se ejecute incluso si devolvimos bloqueo existente, aunque la regla de negocio podria variar)
        -- En este caso, aseguramos que la tarea se marque bloqueada.
        UPDATE dbo.p_Tareas
        SET estado = 'Bloqueada'
        WHERE idTarea = @idTarea
          AND activo = 1
          AND estado NOT IN ('Hecha', 'Archivada');

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Bloqueo_Crear_Carnet]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Bloqueo_Crear_Carnet]
(
    @idTarea          INT,
    @origenCarnet     NVARCHAR(50),
    @destinoCarnet    NVARCHAR(50) = NULL,
    @destinoTexto     NVARCHAR(200) = NULL,
    @motivo           NVARCHAR(1000),
    @accionMitigacion NVARCHAR(1000) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    -- 1. Resolver IDs
    DECLARE @idOrigen INT;
    DECLARE @idDestino INT = NULL;

    SELECT @idOrigen = idUsuario FROM dbo.p_Usuarios WHERE carnet = @origenCarnet;
    
    IF @idOrigen IS NULL 
    BEGIN
        THROW 50001, 'Usuario Origen no encontrado por carnet.', 1;
    END

    IF @destinoCarnet IS NOT NULL
    BEGIN
        SELECT @idDestino = idUsuario FROM dbo.p_Usuarios WHERE carnet = @destinoCarnet;
    END

    BEGIN TRY
        BEGIN TRAN;

        DECLARE @idBloqueo INT;

        -- Evitar duplicados activos
        SELECT TOP (1) @idBloqueo = b.idBloqueo
        FROM dbo.p_Bloqueos b WITH (UPDLOCK, HOLDLOCK)
        WHERE b.idTarea = @idTarea AND b.estado <> 'Resuelto'
        ORDER BY b.creadoEn DESC;

        IF @idBloqueo IS NULL
        BEGIN
            INSERT INTO dbo.p_Bloqueos
            (idTarea, idOrigenUsuario, idDestinoUsuario, origenCarnet, destinoCarnet, destinoTexto, motivo, accionMitigacion, creadoEn, estado)
            VALUES
            (@idTarea, @idOrigen, @idDestino, @origenCarnet, @destinoCarnet, @destinoTexto, @motivo, @accionMitigacion, GETDATE(), 'Activo');

            SET @idBloqueo = SCOPE_IDENTITY();
        END
        
        -- Actualizar Tarea a 'Bloqueada'
        UPDATE dbo.p_Tareas
        SET estado = 'Bloqueada', fechaActualizacion = GETDATE()
        WHERE idTarea = @idTarea
          AND activo = 1
          AND estado NOT IN ('Hecha', 'Archivada');

        COMMIT;
        SELECT @idBloqueo AS idBloqueo;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO
/****** Object:  StoredProcedure [dbo].[sp_campo_finalizar_recorrido]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SP: sp_campo_finalizar_recorrido
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE   PROCEDURE [dbo].[sp_campo_finalizar_recorrido]
    @carnet     NVARCHAR(20),
    @lat        DECIMAL(10,7) = NULL,
    @lon        DECIMAL(10,7) = NULL,
    @notas      NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @id INT;
    SELECT @id = id_recorrido FROM campo_recorridos
    WHERE carnet = @carnet AND estado = 'EN_CURSO';

    IF @id IS NULL
    BEGIN
        SELECT 0 AS id_recorrido, 'SIN_RECORRIDO' AS estado,
            'No hay recorrido activo' AS mensaje;
        RETURN;
    END

    -- Registrar punto final
    IF @lat IS NOT NULL AND @lon IS NOT NULL
    BEGIN
        INSERT INTO campo_recorrido_puntos (id_recorrido, lat, lon, tipo)
        VALUES (@id, @lat, @lon, 'FIN');
    END

    -- Calcular estadÃ­sticas
    DECLARE @totalPuntos INT, @totalParadas INT, @duracion INT;

    SELECT @totalPuntos = COUNT(*) FROM campo_recorrido_puntos WHERE id_recorrido = @id;
    SELECT @totalParadas = COUNT(*) FROM campo_recorrido_puntos WHERE id_recorrido = @id AND tipo IN ('PARADA', 'VISITA');

    SELECT @duracion = DATEDIFF(MINUTE, hora_inicio, GETDATE()) FROM campo_recorridos WHERE id_recorrido = @id;

    -- Calcular km total (sumar distancias entre puntos consecutivos)
    DECLARE @km DECIMAL(8,2) = 0;
    ;WITH puntos_ord AS (
        SELECT lat, lon, ROW_NUMBER() OVER (ORDER BY timestamp_gps) AS rn
        FROM campo_recorrido_puntos WHERE id_recorrido = @id
    )
    SELECT @km = ISNULL(SUM(
        SQRT(
            POWER((p2.lat - p1.lat) * 111.32, 2) +
            POWER((p2.lon - p1.lon) * 111.32 * COS(RADIANS(p1.lat)), 2)
        )
    ), 0)
    FROM puntos_ord p1
    INNER JOIN puntos_ord p2 ON p2.rn = p1.rn + 1;

    -- Actualizar recorrido
    UPDATE campo_recorridos SET
        estado = 'FINALIZADO',
        hora_fin = GETDATE(),
        km_total = @km,
        duracion_min = @duracion,
        total_paradas = @totalParadas,
        notas = @notas
    WHERE id_recorrido = @id;

    SELECT @id AS id_recorrido, 'FINALIZADO' AS estado,
        CAST(@km AS NVARCHAR) + ' km recorridos en ' + CAST(@duracion AS NVARCHAR) + ' min, ' + CAST(@totalParadas AS NVARCHAR) + ' paradas' AS mensaje,
        @km AS km_total,
        @duracion AS duracion_min,
        @totalParadas AS total_paradas;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_campo_finalizar_recorrido_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_campo_finalizar_recorrido_rust]
    @carnet nvarchar(20) = NULL,
    @lat decimal = NULL,
    @lon decimal = NULL,
    @notas nvarchar(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_campo_finalizar_recorrido @carnet, @lat, @lon, @notas;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_campo_iniciar_recorrido]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SP: sp_campo_iniciar_recorrido
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE   PROCEDURE [dbo].[sp_campo_iniciar_recorrido]
    @carnet     NVARCHAR(20),
    @lat        DECIMAL(10,7) = NULL,
    @lon        DECIMAL(10,7) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Verificar si ya tiene un recorrido en curso
    DECLARE @existente INT;
    SELECT @existente = id_recorrido FROM campo_recorridos
    WHERE carnet = @carnet AND estado = 'EN_CURSO';

    IF @existente IS NOT NULL
    BEGIN
        SELECT @existente AS id_recorrido, 'YA_EN_CURSO' AS estado,
            'Ya tienes un recorrido activo' AS mensaje;
        RETURN;
    END

    -- Crear nuevo recorrido
    INSERT INTO campo_recorridos (carnet) VALUES (@carnet);
    DECLARE @id INT = SCOPE_IDENTITY();

    -- Registrar punto inicial si hay coordenadas
    IF @lat IS NOT NULL AND @lon IS NOT NULL
    BEGIN
        INSERT INTO campo_recorrido_puntos (id_recorrido, lat, lon, tipo)
        VALUES (@id, @lat, @lon, 'INICIO');
    END

    SELECT @id AS id_recorrido, 'INICIADO' AS estado,
        'Recorrido iniciado correctamente' AS mensaje;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_campo_iniciar_recorrido_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_campo_iniciar_recorrido_rust]
    @carnet nvarchar(20) = NULL,
    @lat decimal = NULL,
    @lon decimal = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_campo_iniciar_recorrido @carnet, @lat, @lon;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_campo_registrar_punto]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SP: sp_campo_registrar_punto
-- Registra un punto GPS en el recorrido activo
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE   PROCEDURE [dbo].[sp_campo_registrar_punto]
    @carnet         NVARCHAR(20),
    @lat            DECIMAL(10,7),
    @lon            DECIMAL(10,7),
    @accuracy       DECIMAL(8,2) = NULL,
    @velocidad_kmh  DECIMAL(6,2) = NULL,
    @tipo           NVARCHAR(20) = 'RUTA',
    @id_cliente     INT = NULL,
    @notas          NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @id INT;
    SELECT @id = id_recorrido FROM campo_recorridos
    WHERE carnet = @carnet AND estado = 'EN_CURSO';

    IF @id IS NULL
    BEGIN
        SELECT 0 AS ok, 'No hay recorrido activo' AS mensaje;
        RETURN;
    END

    INSERT INTO campo_recorrido_puntos (id_recorrido, lat, lon, accuracy, velocidad_kmh, tipo, id_cliente, notas)
    VALUES (@id, @lat, @lon, @accuracy, @velocidad_kmh, @tipo, @id_cliente, @notas);

    SELECT 1 AS ok, 'Punto registrado' AS mensaje, @id AS id_recorrido;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_campo_registrar_punto_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_campo_registrar_punto_rust]
    @carnet nvarchar(20) = NULL,
    @lat decimal = NULL,
    @lon decimal = NULL,
    @accuracy decimal = NULL,
    @velocidad_kmh decimal = NULL,
    @tipo nvarchar(20) = NULL,
    @id_cliente int = NULL,
    @notas nvarchar(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_campo_registrar_punto @carnet, @lat, @lon, @accuracy, @velocidad_kmh, @tipo, @id_cliente, @notas;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Checkin_Crear]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sp_Checkin_Crear]
    @idUsuario INT,
    @fecha DATE,
    @entregableTexto NVARCHAR(MAX),
    @nota NVARCHAR(MAX) = NULL,
    @linkEvidencia NVARCHAR(MAX) = NULL,
    @estadoAnimo NVARCHAR(50) = NULL,
    @idNodo INT = NULL,
    @energia INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Upsert simple: Si ya existe checkin para ese usuario/fecha, actualizar. Si no, insertar.
    MERGE p_Checkins AS target
    USING (SELECT @idUsuario, @fecha) AS source (idUsuario, fecha)
    ON (target.idUsuario = source.idUsuario AND target.fecha = source.fecha)
    WHEN MATCHED THEN
        UPDATE SET 
            entregableTexto = @entregableTexto,
            nota = @nota,
            linkEvidencia = @linkEvidencia,
            estadoAnimo = @estadoAnimo,
            idNodo = @idNodo,
            energia = @energia,
            fechaCreacion = GETDATE() -- o fechaActualizacion si existiera
    WHEN NOT MATCHED THEN
        INSERT (idUsuario, fecha, entregableTexto, nota, linkEvidencia, estadoAnimo, idNodo, energia, fechaCreacion)
        VALUES (@idUsuario, @fecha, @entregableTexto, @nota, @linkEvidencia, @estadoAnimo, @idNodo, @energia, GETDATE());
    
    -- Devolver ID (si insertó) o buscarlo
    SELECT idCheckin FROM p_Checkins WHERE idUsuario = @idUsuario AND fecha = @fecha;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Checkin_Upsert]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/* =========================================================
   2) SP Mejorado: sp_Checkin_Upsert
   ========================================================= */
CREATE   PROCEDURE [dbo].[sp_Checkin_Upsert]
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
GO
/****** Object:  StoredProcedure [dbo].[sp_Checkin_Upsert_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Checkin_Upsert_rust]
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
    @idNodo          INT = NULL
    -- SIN @tareas TVP: Rust insertarÃ¡ las tareas por separado en la misma transacciÃ³n
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

        -- Limpiar tareas anteriores (Rust re-insertarÃ¡ las nuevas despuÃ©s)
        DELETE FROM dbo.p_CheckinTareas WHERE idCheckin = @idCheckin;

        COMMIT;
        SELECT @idCheckin AS idCheckin;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Checkin_Upsert_v2]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

            CREATE PROCEDURE [dbo].[sp_Checkin_Upsert_v2]
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
        
GO
/****** Object:  StoredProcedure [dbo].[sp_Checkins_ObtenerPorEquipoFecha]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sp_Checkins_ObtenerPorEquipoFecha]
    @carnetsList NVARCHAR(MAX),
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;
    CREATE TABLE #Carnets (carnet NVARCHAR(50) COLLATE DATABASE_DEFAULT PRIMARY KEY);
    INSERT INTO #Carnets (carnet)
    SELECT DISTINCT LTRIM(RTRIM(value))
    FROM STRING_SPLIT(@carnetsList, ',')
    WHERE LTRIM(RTRIM(value)) <> N'';

    DECLARE @inicio DATETIME = CAST(@fecha AS DATETIME);
    DECLARE @fin    DATETIME = DATEADD(DAY, 1, @inicio);

    SELECT
        c.idCheckin, c.usuarioCarnet, c.fecha, c.estadoAnimo, c.nota, c.entregableTexto,
        c.prioridad1, c.prioridad2, c.prioridad3, c.energia, c.linkEvidencia
    FROM dbo.p_Checkins c
    JOIN #Carnets x ON x.carnet = c.usuarioCarnet
    WHERE c.fecha >= @inicio
      AND c.fecha <  @fin
    OPTION (RECOMPILE);
    DROP TABLE #Carnets;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Checkins_ObtenerPorEquipoFecha_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Checkins_ObtenerPorEquipoFecha_rust]
    @carnetsList nvarchar(MAX) = NULL,
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Checkins_ObtenerPorEquipoFecha @carnetsList, @fecha;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Checkins_ObtenerPorEquipoFecha_test]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/*--------------------------------------------------------------
  sp_Checkins_ObtenerPorEquipoFecha_test
  Mejora:
  - Evita join directo a STRING_SPLIT sin TRIM.
  - Maneja si fecha en p_Checkins es DATETIME (rango por día).
--------------------------------------------------------------*/
CREATE   PROCEDURE [dbo].[sp_Checkins_ObtenerPorEquipoFecha_test]
    @carnetsList NVARCHAR(MAX),
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;

    CREATE TABLE #Carnets (carnet NVARCHAR(50) COLLATE DATABASE_DEFAULT PRIMARY KEY);

    INSERT INTO #Carnets (carnet)
    SELECT DISTINCT LTRIM(RTRIM(value))
    FROM STRING_SPLIT(@carnetsList, ',')
    WHERE LTRIM(RTRIM(value)) <> N'';

    DECLARE @inicio DATETIME = CAST(@fecha AS DATETIME);
    DECLARE @fin    DATETIME = DATEADD(DAY, 1, @inicio);

    SELECT
        c.idCheckin, c.usuarioCarnet, c.fecha, c.estadoAnimo, c.nota, c.entregableTexto,
        c.prioridad1, c.prioridad2, c.prioridad3, c.energia, c.linkEvidencia
    FROM dbo.p_Checkins c
    JOIN #Carnets x ON x.carnet = c.usuarioCarnet
    WHERE c.fecha >= @inicio
      AND c.fecha <  @fin
    OPTION (RECOMPILE);

    DROP TABLE #Carnets;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Checkins_ObtenerPorUsuarioFecha]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- Para reemplazar query inline con CAST. Recibe DATETIME pero busca por día exacto.
CREATE   PROCEDURE [dbo].[sp_Checkins_ObtenerPorUsuarioFecha]
    @carnet NVARCHAR(50),
    @fecha DATETIME
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @fechaDia DATE = CAST(@fecha AS DATE);
    DECLARE @inicio DATETIME = CAST(@fechaDia AS DATETIME);
    DECLARE @fin DATETIME = DATEADD(DAY, 1, @inicio);

    -- Busca rango >= inicio AND < fin para usar índice de fecha correctamente
    SELECT TOP (1) *
    FROM dbo.p_Checkins
    WHERE usuarioCarnet = @carnet
      AND fecha >= @inicio 
      AND fecha < @fin;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Clarity_CrearTareaRapida]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE    PROCEDURE [dbo].[sp_Clarity_CrearTareaRapida]
    @titulo NVARCHAR(200),
    @idUsuario INT,
    @prioridad NVARCHAR(50) = 'Media',
    @tipo NVARCHAR(50) = 'Administrativa'
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO p_Tareas (nombre, idCreador, estado, prioridad, tipo, fechaCreacion, fechaActualizacion)
    VALUES (@titulo, @idUsuario, 'Pendiente', @prioridad, @tipo, GETDATE(), GETDATE());
    SELECT SCOPE_IDENTITY() AS idTarea;
END;


GO
/****** Object:  StoredProcedure [dbo].[sp_Clarity_MiDia_Get]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sp_Clarity_MiDia_Get]
(
  @IdUsuario INT,
  @Fecha     DATE
)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  -- Buscamos el ID del último check-in anterior para los arrastrados (Solución para fines de semana)
  DECLARE @IdUltimoCheckin INT;
  SELECT TOP (1) @IdUltimoCheckin = idCheckin
  FROM dbo.p_Checkins
  WHERE idUsuario = @IdUsuario AND fecha < @Fecha
  ORDER BY fecha DESC, creadoEn DESC;

  -----------------------------------------------------------------------
  -- 1) Check-in hoy (Datos de la jornada actual)
  -----------------------------------------------------------------------
  SELECT TOP (1)
      c.idCheckin,
      c.fecha,
      c.entregableTexto,
      c.nota,
      c.creadoEn AS fechaCreacion -- Alias para el frontend
  FROM dbo.p_Checkins c
  WHERE c.idUsuario = @IdUsuario
    AND c.fecha     = @Fecha
  ORDER BY c.creadoEn DESC;

  -----------------------------------------------------------------------
  -- 2) Arrastrados (Tareas de la jornada anterior no finalizadas)
  -----------------------------------------------------------------------
  SELECT
      t.idTarea,
      t.nombre AS Titulo, -- Mapeamos 'nombre' a 'Titulo' para el Front
      t.estado,
      t.prioridad,
      t.esfuerzo,
      ISNULL(t.fechaActualizacion, t.fechaCreacion) AS fechaActualizacion,
      t.fechaObjetivo,
      t.idProyecto
  FROM dbo.p_Tareas t
  INNER JOIN dbo.p_CheckinTareas ct ON ct.idTarea = t.idTarea
  WHERE ct.idCheckin = @IdUltimoCheckin
    AND t.estado NOT IN ('Hecha','Descartada')
  ORDER BY
      CASE t.estado 
        WHEN 'EnCurso' THEN 1 
        WHEN 'Bloqueada' THEN 2 
        WHEN 'Revision' THEN 3 
        ELSE 4 END,
      CASE t.prioridad -- Orden lógico: Alta, Media, Baja
        WHEN 'Alta' THEN 1 
        WHEN 'Media' THEN 2 
        WHEN 'Baja' THEN 3 
        ELSE 4 END,
      ISNULL(t.fechaObjetivo, '9999-12-31') ASC;

  -----------------------------------------------------------------------
  -- 3) Mis bloqueos activos
  -----------------------------------------------------------------------
  SELECT
      b.idBloqueo,
      b.idTarea,
      t.nombre AS Tarea,
      b.descripcion AS Motivo,
      u.nombre AS BloqueadoPor,
      b.fechaCreacion,
      b.estado
  FROM dbo.p_Bloqueos b
  LEFT JOIN dbo.p_Usuarios u ON u.idUsuario = b.idUsuario
  LEFT JOIN dbo.p_Tareas   t ON t.idTarea   = b.idTarea
  WHERE b.idUsuario = @IdUsuario
    AND b.estado = 'Activo'
  ORDER BY b.fechaCreacion DESC;

  -----------------------------------------------------------------------
  -- 4) Selector de tareas pendientes (Backlog)
  -----------------------------------------------------------------------
  SELECT
      t.idTarea,
      t.nombre AS Titulo,
      t.estado,
      t.prioridad,
      t.esfuerzo,
      ISNULL(p.nombre, '(Personal)') AS Proyecto,
      t.fechaObjetivo,
      t.idProyecto
  FROM dbo.p_Tareas t
  INNER JOIN dbo.p_TareaAsignados ta ON ta.idTarea = t.idTarea
  LEFT  JOIN dbo.p_Proyectos p       ON p.idProyecto = t.idProyecto
  WHERE ta.idUsuario = @IdUsuario
    AND t.estado IN ('Pendiente','EnCurso','Bloqueada','Revision')
  ORDER BY
      CASE t.estado WHEN 'EnCurso' THEN 1 WHEN 'Bloqueada' THEN 2 ELSE 3 END,
      CASE t.prioridad WHEN 'Alta' THEN 1 WHEN 'Media' THEN 2 ELSE 3 END,
      ISNULL(t.fechaObjetivo, '9999-12-31') ASC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Clarity_MiDia_Get_Carnet]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 3.3 sp_Clarity_MiDia_Get_Carnet
CREATE   PROCEDURE [dbo].[sp_Clarity_MiDia_Get_Carnet]
    @carnet NVARCHAR(50),
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM dbo.p_Usuarios WHERE carnet = @carnet;

    -- CORRECCION: Usamos 'fechaCompletado' en lugar de 'fechaFinalizacion'
    -- Y agregamos ISNULL para evitar fallos si fechaCompletado es nulo
    SELECT t.*, p.nombre as nombreProyecto
    FROM dbo.p_Tareas t
    LEFT JOIN dbo.p_Proyectos p ON p.idProyecto = t.idProyecto
    WHERE t.idCreador = @idUsuario
      AND t.activo = 1
      AND (
          (t.estado NOT IN ('Hecha', 'Archivada') AND cast(t.fechaObjetivo as date) <= @fecha)
          OR
          (t.estado = 'Hecha' AND cast(t.fechaCompletado as date) = @fecha)
      )
    ORDER BY t.prioridad DESC, t.fechaObjetivo ASC;

    SELECT * FROM dbo.p_Checkins WHERE idUsuario = @idUsuario AND cast(fecha as date) = @fecha;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_CrearGrupoInicial]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- 5.2 SP: Crear Grupo Inicial (Plan de Trabajo)
CREATE   PROCEDURE [dbo].[sp_CrearGrupoInicial]
    @idTarea INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p_Tareas
    SET idGrupo = @idTarea, numeroParte = 1
    WHERE idTarea = @idTarea AND (idGrupo IS NULL OR idGrupo = 0);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_CrearGrupoInicial_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_CrearGrupoInicial_rust]
    @idTarea int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_CrearGrupoInicial @idTarea;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Dashboard_Kpis]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sp_Dashboard_Kpis]
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idUsuario INT = NULL;
    SELECT TOP (1) @idUsuario = u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.carnet = @carnet;

    -- 1) Resumen Global
    SELECT
        COUNT_BIG(*) as total,
        SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as hechas,
        SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso') THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN t.estado = 'Bloqueada' THEN 1 ELSE 0 END) as bloqueadas,
        AVG(CAST(COALESCE(t.porcentaje, 0) AS FLOAT)) as promedioAvance
    FROM dbo.p_Tareas t
    LEFT JOIN dbo.p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE t.activo = 1
      AND (
            (@idUsuario IS NOT NULL AND t.idCreador = @idUsuario)
            OR ta.carnet = @carnet
          )
    OPTION (RECOMPILE);

    -- 2) Resumen por Proyecto
    SELECT
        p.nombre as proyecto,
        p.area,
        COUNT_BIG(t.idTarea) as total,
        SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as hechas
    FROM dbo.p_Tareas t
    JOIN dbo.p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN dbo.p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE t.activo = 1
      AND (
            (@idUsuario IS NOT NULL AND t.idCreador = @idUsuario)
            OR ta.carnet = @carnet
          )
    GROUP BY p.nombre, p.area
    OPTION (RECOMPILE);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Dashboard_Kpis_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Dashboard_Kpis_rust]
    @carnet nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Dashboard_Kpis @carnet;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Dashboard_Kpis_test]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/*--------------------------------------------------------------*/
CREATE   PROCEDURE [dbo].[sp_Dashboard_Kpis_test]
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idUsuario INT = NULL;
    SELECT TOP (1) @idUsuario = u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.carnet = @carnet;

    -- 1) Resumen Global
    SELECT
        COUNT_BIG(*) as total,
        SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as hechas,
        SUM(CASE WHEN t.estado IN ('Pendiente', 'EnCurso') THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN t.estado = 'Bloqueada' THEN 1 ELSE 0 END) as bloqueadas,
        AVG(CAST(COALESCE(t.porcentaje, 0) AS FLOAT)) as promedioAvance
    FROM dbo.p_Tareas t
    LEFT JOIN dbo.p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE t.activo = 1
      AND (
            (@idUsuario IS NOT NULL AND t.idCreador = @idUsuario)
            OR ta.carnet = @carnet
          )
    OPTION (RECOMPILE);

    -- 2) Resumen por Proyecto
    SELECT
        p.nombre as proyecto,
        p.area,
        COUNT_BIG(t.idTarea) as total,
        SUM(CASE WHEN t.estado = 'Hecha' THEN 1 ELSE 0 END) as hechas
    FROM dbo.p_Tareas t
    JOIN dbo.p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN dbo.p_TareaAsignados ta ON t.idTarea = ta.idTarea
    WHERE t.activo = 1
      AND (
            (@idUsuario IS NOT NULL AND t.idCreador = @idUsuario)
            OR ta.carnet = @carnet
          )
    GROUP BY p.nombre, p.area
    OPTION (RECOMPILE);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_DelegacionVisibilidad_Crear]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_DelegacionVisibilidad_Crear]
  @delegante NVARCHAR(50),
  @delegado  NVARCHAR(50),
  @motivo    NVARCHAR(500) = NULL,
  @fecha_inicio NVARCHAR(50) = NULL,
  @fecha_fin    NVARCHAR(50) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @d1 NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@delegante, N'')));
  DECLARE @d2 NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@delegado,  N'')));

  IF (@d1 = N'' OR @d2 = N'')
  BEGIN
    RAISERROR('Delegante/Delegado requerido.', 16, 1);
    RETURN;
  END

  DECLARE @fi DATETIME = TRY_CONVERT(DATETIME, @fecha_inicio);
  DECLARE @ff DATETIME = TRY_CONVERT(DATETIME, @fecha_fin);

  INSERT INTO dbo.p_delegacion_visibilidad
    (carnet_delegante, carnet_delegado, motivo, activo, creado_en, fecha_inicio, fecha_fin)
  VALUES
    (@d1, @d2, @motivo, 1, GETDATE(), @fi, @ff);

  SELECT SCOPE_IDENTITY() AS id;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_DelegacionVisibilidad_Crear_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_DelegacionVisibilidad_Crear_rust]
    @delegante nvarchar(50) = NULL,
    @delegado nvarchar(50) = NULL,
    @motivo nvarchar(500) = NULL,
    @fecha_inicio nvarchar(50) = NULL,
    @fecha_fin nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_DelegacionVisibilidad_Crear @delegante, @delegado, @motivo, @fecha_inicio, @fecha_fin;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_DelegacionVisibilidad_Desactivar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_DelegacionVisibilidad_Desactivar]
  @id BIGINT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE dbo.p_delegacion_visibilidad
  SET activo = 0
  WHERE id = @id;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_DelegacionVisibilidad_ListarActivas]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_DelegacionVisibilidad_ListarActivas]
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM dbo.p_delegacion_visibilidad
  WHERE activo = 1
  ORDER BY creado_en DESC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_DelegacionVisibilidad_ListarPorDelegante]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_DelegacionVisibilidad_ListarPorDelegante]
  @carnetDelegante NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @c NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@carnetDelegante, N'')));

  SELECT *
  FROM dbo.p_delegacion_visibilidad
  WHERE LTRIM(RTRIM(carnet_delegante)) = @c
  ORDER BY creado_en DESC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_DelegacionVisibilidad_ObtenerActivas]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/* ============================================
   DELEGACIÓN VISIBILIDAD
   ============================================ */

CREATE   PROCEDURE [dbo].[sp_DelegacionVisibilidad_ObtenerActivas]
  @carnetDelegado NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @c NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@carnetDelegado, N'')));

  SELECT *
  FROM dbo.p_delegacion_visibilidad
  WHERE LTRIM(RTRIM(carnet_delegado)) = @c
    AND activo = 1
    AND (fecha_inicio IS NULL OR fecha_inicio <= GETDATE())
    AND (fecha_fin    IS NULL OR fecha_fin    >= GETDATE())
  ORDER BY creado_en DESC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_DelegacionVisibilidad_ObtenerActivas_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_DelegacionVisibilidad_ObtenerActivas_rust]
    @carnetDelegado nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_DelegacionVisibilidad_ObtenerActivas @carnetDelegado;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Dispositivos_ObtenerPorUsuario]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

    CREATE PROCEDURE [dbo].[sp_Dispositivos_ObtenerPorUsuario]
      @idUsuario INT
    AS
    BEGIN
      SET NOCOUNT ON;
      SELECT tokenFCM, plataforma
      FROM p_Dispositivos
      WHERE idUsuario = @idUsuario
        AND activo = 1
        AND tokenFCM IS NOT NULL
        AND tokenFCM != ''
      ORDER BY ultimoUso DESC;
    END
  
GO
/****** Object:  StoredProcedure [dbo].[sp_Dispositivos_ObtenerPorUsuario_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Dispositivos_ObtenerPorUsuario_rust]
    @idUsuario int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Dispositivos_ObtenerPorUsuario @idUsuario;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Dispositivos_Registrar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE PROCEDURE [dbo].[sp_Dispositivos_Registrar]
    @idUsuario INT,
    @tokenFCM NVARCHAR(500),
    @plataforma NVARCHAR(50) = 'android'
AS
BEGIN
    SET NOCOUNT ON;

    IF OBJECT_ID('p_Dispositivos', 'U') IS NULL
    BEGIN
        CREATE TABLE p_Dispositivos (
            idDispositivo INT IDENTITY(1,1) PRIMARY KEY,
            idUsuario INT NOT NULL,
            tokenFCM NVARCHAR(500) NOT NULL,
            plataforma NVARCHAR(50) DEFAULT 'android',
            fechaRegistro DATETIME DEFAULT GETDATE(),
            ultimoUso DATETIME DEFAULT GETDATE(),
            activo BIT DEFAULT 1
        );
        CREATE UNIQUE INDEX UQ_Dispositivo_Token ON p_Dispositivos(tokenFCM);
    END

    MERGE p_Dispositivos AS target
    USING (SELECT @tokenFCM AS token) AS source
    ON (target.tokenFCM = source.token)
    WHEN MATCHED THEN
        UPDATE SET idUsuario = @idUsuario, ultimoUso = GETDATE(), activo = 1, plataforma = @plataforma
    WHEN NOT MATCHED THEN
        INSERT (idUsuario, tokenFCM, plataforma) VALUES (@idUsuario, @tokenFCM, @plataforma);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Dispositivos_Registrar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Dispositivos_Registrar_rust]
    @idUsuario int = NULL,
    @tokenFCM nvarchar(500) = NULL,
    @plataforma nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Dispositivos_Registrar @idUsuario, @tokenFCM, @plataforma;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Equipo_ObtenerHoy]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Equipo_ObtenerHoy]
    @carnetsList NVARCHAR(MAX),
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @d0 DATETIME2(0) = CONVERT(DATETIME2(0), @fecha);
    DECLARE @d1 DATETIME2(0) = DATEADD(DAY, 1, @d0);

    CREATE TABLE #Carnets ( carnet VARCHAR(20) NOT NULL PRIMARY KEY );
    INSERT INTO #Carnets(carnet) 
    SELECT DISTINCT CONVERT(VARCHAR(20), LTRIM(RTRIM(s.value))) 
    FROM STRING_SPLIT(@carnetsList, ',') s 
    WHERE LTRIM(RTRIM(s.value)) <> '';

    ;WITH UsuariosFiltrados AS (
        SELECT u.idUsuario, u.carnet
        FROM p_Usuarios u
        INNER JOIN #Carnets c ON c.carnet = u.carnet
    ),
    TareasVisibles AS (
        -- Consolidamos todas las tareas que cada usuario debe gestionar
        -- Usamos la misma lógica de visibilidad que en el popup detallado
        SELECT uf.idUsuario, t.idTarea, t.estado, t.fechaObjetivo, t.fechaCompletado, t.fechaActualizacion
        FROM UsuariosFiltrados uf
        INNER JOIN p_Tareas t ON t.activo = 1
        WHERE (
            -- 1. Asignado explícitamente (vía Carnet o ID)
            EXISTS (SELECT 1 FROM p_TareaAsignados ta WHERE ta.idTarea = t.idTarea AND (ta.carnet = uf.carnet OR ta.idUsuario = uf.idUsuario))
            
            -- 2. Creador de la tarea (si no tiene asignados)
            OR ( (t.creadorCarnet = uf.carnet OR t.idCreador = uf.idUsuario) AND NOT EXISTS (SELECT 1 FROM p_TareaAsignados ta WHERE ta.idTarea = t.idTarea) )
            
            -- 3. Dueño/Creador del proyecto al que pertenece la tarea
            OR EXISTS (
                SELECT 1 FROM p_Proyectos p 
                WHERE t.idProyecto = p.idProyecto 
                AND (p.responsableCarnet = uf.carnet OR p.creadorCarnet = uf.carnet OR (p.idCreador = uf.idUsuario AND p.creadorCarnet IS NULL))
            )
        )
    )
    SELECT 
        uf.idUsuario, 
        uf.carnet,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision') AND t.fechaObjetivo < @d0 THEN 1 ELSE 0 END) AS retrasadas,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision') AND (t.fechaObjetivo >= @d0 OR t.fechaObjetivo IS NULL) THEN 1 ELSE 0 END) AS planificadas,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'Hecha' AND COALESCE(t.fechaCompletado, t.fechaActualizacion) >= @d0 AND COALESCE(t.fechaCompletado, t.fechaActualizacion) < @d1 THEN 1 ELSE 0 END) AS hechas,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'EnCurso' THEN 1 ELSE 0 END) AS enCurso,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'Bloqueada' THEN 1 ELSE 0 END) AS bloqueadas,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'Descartada' AND t.fechaActualizacion >= @d0 AND t.fechaActualizacion < @d1 THEN 1 ELSE 0 END) AS descartadas
    FROM UsuariosFiltrados uf
    LEFT JOIN TareasVisibles t ON t.idUsuario = uf.idUsuario
    GROUP BY uf.idUsuario, uf.carnet
    OPTION (RECOMPILE);

    DROP TABLE #Carnets;
END
        
GO
/****** Object:  StoredProcedure [dbo].[sp_Equipo_ObtenerHoy_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Equipo_ObtenerHoy_rust]
    @carnetsList nvarchar(MAX) = NULL,
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Equipo_ObtenerHoy @carnetsList, @fecha;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Equipo_ObtenerHoy2]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/**
 * SP: sp_Equipo_ObtenerHoy (OPTIMIZADO)
 * Claves de rendimiento:
 *  - Parsear @carnetsList a #Carnets (PK) para joins rápidos
 *  - Quitar CAST(col AS DATE) (mata índices) y usar rangos [@d0, @d1)
 *  - Filtrar Hecha/Descartada solo para el día (reduce lectura)
 *  - OPTION(RECOMPILE) para evitar planes malos por tamaños variables de lista
 *
 * Índices recomendados (si no existen):
 *  1) p_TareaAsignados:  IX_p_TareaAsignados_Carnet_IdTarea (carnet, idTarea)
 *  2) p_Tareas:          IX_p_Tareas_Activo_Estado_FechaObj (activo, estado, fechaObjetivo) INCLUDE(idTarea)
 *  3) p_Tareas:          IX_p_Tareas_Hecha_FechaComp        (estado, fechaCompletado) INCLUDE(activo, idTarea)
 *  4) p_Tareas:          IX_p_Tareas_Desc_FechaAct          (estado, fechaActualizacion) INCLUDE(activo, idTarea)
 *  5) p_Usuarios:        UX/IX_p_Usuarios_Carnet            (carnet) INCLUDE(idUsuario)
 */
create PROCEDURE [dbo].[sp_Equipo_ObtenerHoy2]
    @carnetsList NVARCHAR(MAX),
    @fecha       DATE
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @d0 DATETIME2(0) = CONVERT(DATETIME2(0), @fecha);
    DECLARE @d1 DATETIME2(0) = DATEADD(DAY, 1, @d0);

    -- 1) Lista de carnets a una tabla temporal con índice (rápido para JOIN)
    CREATE TABLE #Carnets
    (
        carnet VARCHAR(20) NOT NULL PRIMARY KEY
    );

    INSERT INTO #Carnets(carnet)
    SELECT DISTINCT CONVERT(VARCHAR(20), LTRIM(RTRIM(s.value)))
    FROM STRING_SPLIT(@carnetsList, ',') s
    WHERE LTRIM(RTRIM(s.value)) <> '';

    -- 2) Base de usuarios (para devolver 0s aunque no tengan tareas)
    ;WITH UsuariosFiltrados AS
    (
        SELECT u.idUsuario, u.carnet
        FROM p_Usuarios u
        INNER JOIN #Carnets c ON c.carnet = u.carnet
    )
    SELECT
        uf.idUsuario,
        uf.carnet,

        -- Retrasadas: estados activos con fechaObjetivo < hoy
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision')
                 AND t.fechaObjetivo < @d0
                THEN 1 ELSE 0
            END) AS retrasadas,

        -- Planificadas: estados activos con fechaObjetivo >= hoy
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision')
                 AND t.fechaObjetivo >= @d0
                THEN 1 ELSE 0
            END) AS planificadas,

        -- Hechas HOY
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado = 'Hecha'
                 AND t.fechaCompletado >= @d0
                 AND t.fechaCompletado <  @d1
                THEN 1 ELSE 0
            END) AS hechas,

        -- EnCurso (histórico activo)
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado = 'EnCurso'
                THEN 1 ELSE 0
            END) AS enCurso,

        -- Bloqueadas (histórico activo)
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado = 'Bloqueada'
                THEN 1 ELSE 0
            END) AS bloqueadas,

        -- Descartadas HOY
        SUM(CASE
                WHEN t.idTarea IS NOT NULL
                 AND t.estado = 'Descartada'
                 AND t.fechaActualizacion >= @d0
                 AND t.fechaActualizacion <  @d1
                THEN 1 ELSE 0
            END) AS descartadas

    FROM UsuariosFiltrados uf
    LEFT JOIN p_TareaAsignados ta
        ON ta.carnet = uf.carnet
    LEFT JOIN p_Tareas t
        ON t.idTarea = ta.idTarea
       AND t.activo = 1
       AND (
            t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision')
            OR (t.estado = 'Hecha'       AND t.fechaCompletado   >= @d0 AND t.fechaCompletado   < @d1)
            OR (t.estado = 'Descartada'  AND t.fechaActualizacion>= @d0 AND t.fechaActualizacion< @d1)
       )
    GROUP BY uf.idUsuario, uf.carnet
    OPTION (RECOMPILE);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Equipo_ObtenerInforme]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Equipo_ObtenerInforme]
    @carnetsList NVARCHAR(MAX),
    @fecha DATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @d0 DATETIME2(0) = CONVERT(DATETIME2(0), @fecha);
    DECLARE @d1 DATETIME2(0) = DATEADD(DAY, 1, @d0);

    CREATE TABLE #Carnets ( carnet VARCHAR(20) NOT NULL PRIMARY KEY );
    INSERT INTO #Carnets(carnet) 
    SELECT DISTINCT CONVERT(VARCHAR(20), LTRIM(RTRIM(s.value))) 
    FROM STRING_SPLIT(@carnetsList, ',') s 
    WHERE LTRIM(RTRIM(s.value)) <> '';

    ;WITH UsuariosFiltrados AS (
        SELECT u.idUsuario, u.carnet
        FROM p_Usuarios u
        INNER JOIN #Carnets c ON c.carnet = u.carnet
    ),
    TareasVisibles AS (
        -- Consolidamos todas las tareas que cada usuario debe gestionar
        -- Usamos la misma lógica de visibilidad que en el popup detallado
        SELECT uf.idUsuario, t.idTarea, t.estado, t.fechaObjetivo, t.fechaCompletado, t.fechaActualizacion
        FROM UsuariosFiltrados uf
        INNER JOIN p_Tareas t ON t.activo = 1
        WHERE (
            -- 1. Asignado explícitamente (vía Carnet o ID)
            EXISTS (SELECT 1 FROM p_TareaAsignados ta WHERE ta.idTarea = t.idTarea AND (ta.carnet = uf.carnet OR ta.idUsuario = uf.idUsuario))
            
            -- 2. Creador de la tarea (si no tiene asignados)
            OR ( (t.creadorCarnet = uf.carnet OR t.idCreador = uf.idUsuario) AND NOT EXISTS (SELECT 1 FROM p_TareaAsignados ta WHERE ta.idTarea = t.idTarea) )
            
            -- 3. Dueño/Creador del proyecto al que pertenece la tarea
            OR EXISTS (
                SELECT 1 FROM p_Proyectos p 
                WHERE t.idProyecto = p.idProyecto 
                AND (p.responsableCarnet = uf.carnet OR p.creadorCarnet = uf.carnet OR (p.idCreador = uf.idUsuario AND p.creadorCarnet IS NULL))
            )
        )
    )
    SELECT 
        uf.idUsuario, 
        uf.carnet,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision') AND t.fechaObjetivo < @d0 THEN 1 ELSE 0 END) AS retrasadas,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado IN ('Pendiente','EnCurso','Pausa','Bloqueada','Revision') AND (t.fechaObjetivo >= @d0 OR t.fechaObjetivo IS NULL) THEN 1 ELSE 0 END) AS planificadas,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'Hecha' AND COALESCE(t.fechaCompletado, t.fechaActualizacion) >= @d0 AND COALESCE(t.fechaCompletado, t.fechaActualizacion) < @d1 THEN 1 ELSE 0 END) AS hechas,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'EnCurso' THEN 1 ELSE 0 END) AS enCurso,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'Bloqueada' THEN 1 ELSE 0 END) AS bloqueadas,
        SUM(CASE WHEN t.idTarea IS NOT NULL AND t.estado = 'Descartada' AND t.fechaActualizacion >= @d0 AND t.fechaActualizacion < @d1 THEN 1 ELSE 0 END) AS descartadas
    FROM UsuariosFiltrados uf
    LEFT JOIN TareasVisibles t ON t.idUsuario = uf.idUsuario
    GROUP BY uf.idUsuario, uf.carnet
    OPTION (RECOMPILE);

    DROP TABLE #Carnets;
END
        
GO
/****** Object:  StoredProcedure [dbo].[sp_Equipo_ObtenerInforme_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Equipo_ObtenerInforme_rust]
    @carnetsList nvarchar(MAX) = NULL,
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Equipo_ObtenerInforme @carnetsList, @fecha;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Equipo_ObtenerInforme_test]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/*--------------------------------------------------------------*/
CREATE   PROCEDURE [dbo].[sp_Equipo_ObtenerInforme_test]
    @carnetsList NVARCHAR(MAX),
    @fecha DATETIME
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @fechaDate DATE = CAST(@fecha AS DATE);

    CREATE TABLE #Carnets (carnet NVARCHAR(50) COLLATE DATABASE_DEFAULT PRIMARY KEY);

    INSERT INTO #Carnets (carnet)
    SELECT DISTINCT LTRIM(RTRIM(value))
    FROM STRING_SPLIT(@carnetsList, ',')
    WHERE LTRIM(RTRIM(value)) <> N'';

    SELECT
        c.carnet,
        ISNULL(SUM(CASE WHEN t.estado IN ('Pendiente','EnCurso','Bloqueada','Revision')
                        AND t.fechaObjetivo IS NOT NULL
                        AND CAST(t.fechaObjetivo AS DATE) < @fechaDate
                        THEN 1 ELSE 0 END), 0) as retrasadas,

        ISNULL(SUM(CASE WHEN t.estado IN ('Pendiente','EnCurso','Bloqueada','Revision','Pausa')
                        AND (t.fechaObjetivo IS NULL OR CAST(t.fechaObjetivo AS DATE) >= @fechaDate)
                        THEN 1 ELSE 0 END), 0) as planificadas,

        ISNULL(SUM(CASE WHEN t.estado = 'Hecha'
                        AND t.fechaCompletado IS NOT NULL
                        AND CAST(t.fechaCompletado AS DATE) = @fechaDate
                        THEN 1 ELSE 0 END), 0) as hechas,

        ISNULL(SUM(CASE WHEN t.estado = 'EnCurso' THEN 1 ELSE 0 END), 0) as enCurso,
        ISNULL(SUM(CASE WHEN t.estado = 'Bloqueada' THEN 1 ELSE 0 END), 0) as bloqueadas,

        ISNULL(SUM(CASE WHEN t.estado = 'Descartada'
                        AND t.fechaActualizacion IS NOT NULL
                        AND CAST(t.fechaActualizacion AS DATE) = @fechaDate
                        THEN 1 ELSE 0 END), 0) as descartadas
    FROM #Carnets c
    LEFT JOIN dbo.p_TareaAsignados ta ON ta.carnet = c.carnet
    LEFT JOIN dbo.p_Tareas t ON t.idTarea = ta.idTarea AND t.activo = 1
    GROUP BY c.carnet
    OPTION (RECOMPILE);

    DROP TABLE #Carnets;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_jornada_resolver]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STORED PROCEDURE: sp_jornada_resolver
-- Dado un carnet y una fecha, retorna el horario esperado
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
CREATE   PROCEDURE [dbo].[sp_jornada_resolver]
    @carnet     NVARCHAR(20),
    @fecha      DATE = NULL         -- NULL = hoy
AS
BEGIN
    SET NOCOUNT ON;

    -- Fecha de consulta
    DECLARE @fechaConsulta DATE = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    -- 1. Buscar asignaciÃ³n activa para este carnet en la fecha consultada
    DECLARE @id_patron INT, @fecha_inicio DATE, @total_dias INT;

    SELECT TOP 1
        @id_patron = a.id_patron,
        @fecha_inicio = a.fecha_inicio,
        @total_dias = p.total_dias
    FROM marcaje_asignacion a
    INNER JOIN marcaje_patrones p ON p.id_patron = a.id_patron AND p.activo = 1
    WHERE a.carnet = @carnet
      AND a.activo = 1
      AND a.fecha_inicio <= @fechaConsulta
      AND (a.fecha_fin IS NULL OR a.fecha_fin >= @fechaConsulta)
    ORDER BY a.fecha_inicio DESC;

    -- Sin asignaciÃ³n â†’ reportar como "sin horario definido"
    IF @id_patron IS NULL
    BEGIN
        SELECT
            'SIN_ASIGNACION' AS estado,
            @fechaConsulta AS fecha,
            NULL AS id_horario,
            NULL AS nombre_horario,
            NULL AS hora_entrada,
            NULL AS hora_salida,
            0 AS es_nocturno,
            0 AS es_dia_libre,
            NULL AS nro_dia_ciclo,
            NULL AS nombre_patron,
            NULL AS total_dias_ciclo;
        RETURN;
    END

    -- 2. Calcular en quÃ© dÃ­a del ciclo estamos
    DECLARE @diasDiff INT = DATEDIFF(DAY, @fecha_inicio, @fechaConsulta);
    DECLARE @diaActual INT = (@diasDiff % @total_dias) + 1;

    -- 3. Obtener el detalle del patrÃ³n para este dÃ­a
    SELECT
        CASE
            WHEN d.id_horario IS NULL THEN 'DIA_LIBRE'
            ELSE 'DIA_LABORAL'
        END AS estado,
        @fechaConsulta AS fecha,
        h.id_horario,
        h.nombre AS nombre_horario,
        h.hora_entrada,
        h.hora_salida,
        ISNULL(h.es_nocturno, 0) AS es_nocturno,
        CASE WHEN d.id_horario IS NULL THEN 1 ELSE 0 END AS es_dia_libre,
        @diaActual AS nro_dia_ciclo,
        p.nombre AS nombre_patron,
        p.total_dias AS total_dias_ciclo,
        h.duracion_horas,
        h.tolerancia_min,
        h.descanso_min,
        d.etiqueta AS etiqueta_dia
    FROM marcaje_patrones_detalle d
    INNER JOIN marcaje_patrones p ON p.id_patron = d.id_patron
    LEFT JOIN marcaje_horarios h ON h.id_horario = d.id_horario
    WHERE d.id_patron = @id_patron
      AND d.nro_dia = @diaActual;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_jornada_resolver_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_jornada_resolver_rust]
    @carnet nvarchar(20) = NULL,
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_jornada_resolver @carnet, @fecha;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_jornada_semana]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO


-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- STORED PROCEDURE: sp_jornada_semana
-- Retorna los horarios de toda la semana para un carnet
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
CREATE   PROCEDURE [dbo].[sp_jornada_semana]
    @carnet     NVARCHAR(20),
    @fecha      DATE = NULL         -- Cualquier fecha de la semana deseada, NULL = hoy
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @fechaBase DATE = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    -- Calcular inicio de semana (lunes)
    DECLARE @lunes DATE = DATEADD(DAY, -(DATEPART(WEEKDAY, @fechaBase) + @@DATEFIRST - 2) % 7, @fechaBase);

    -- Generar tabla de 7 dÃ­as
    DECLARE @dias TABLE (fecha DATE, nro INT);
    INSERT INTO @dias VALUES
        (@lunes, 1),
        (DATEADD(DAY, 1, @lunes), 2),
        (DATEADD(DAY, 2, @lunes), 3),
        (DATEADD(DAY, 3, @lunes), 4),
        (DATEADD(DAY, 4, @lunes), 5),
        (DATEADD(DAY, 5, @lunes), 6),
        (DATEADD(DAY, 6, @lunes), 7);

    -- Buscar asignaciÃ³n vigente
    DECLARE @id_patron INT, @fecha_inicio DATE, @total_dias INT;

    SELECT TOP 1
        @id_patron = a.id_patron,
        @fecha_inicio = a.fecha_inicio,
        @total_dias = p.total_dias
    FROM marcaje_asignacion a
    INNER JOIN marcaje_patrones p ON p.id_patron = a.id_patron AND p.activo = 1
    WHERE a.carnet = @carnet
      AND a.activo = 1
      AND a.fecha_inicio <= DATEADD(DAY, 6, @lunes)
      AND (a.fecha_fin IS NULL OR a.fecha_fin >= @lunes)
    ORDER BY a.fecha_inicio DESC;

    IF @id_patron IS NULL
    BEGIN
        SELECT
            dd.fecha,
            DATENAME(WEEKDAY, dd.fecha) AS dia_semana,
            'SIN_ASIGNACION' AS estado,
            NULL AS nombre_horario,
            NULL AS hora_entrada,
            NULL AS hora_salida,
            0 AS es_nocturno,
            1 AS es_dia_libre
        FROM @dias dd
        ORDER BY dd.nro;
        RETURN;
    END

    -- Para cada dÃ­a, resolver el horario
    SELECT
        dd.fecha,
        DATENAME(WEEKDAY, dd.fecha) AS dia_semana,
        CASE
            WHEN det.id_horario IS NULL THEN 'DIA_LIBRE'
            ELSE 'DIA_LABORAL'
        END AS estado,
        h.nombre AS nombre_horario,
        h.hora_entrada,
        h.hora_salida,
        ISNULL(h.es_nocturno, 0) AS es_nocturno,
        CASE WHEN det.id_horario IS NULL THEN 1 ELSE 0 END AS es_dia_libre,
        (DATEDIFF(DAY, @fecha_inicio, dd.fecha) % @total_dias) + 1 AS nro_dia_ciclo,
        det.etiqueta AS etiqueta_dia,
        h.duracion_horas,
        h.tolerancia_min
    FROM @dias dd
    LEFT JOIN marcaje_patrones_detalle det
        ON det.id_patron = @id_patron
       AND det.nro_dia = (DATEDIFF(DAY, @fecha_inicio, dd.fecha) % @total_dias) + 1
    LEFT JOIN marcaje_horarios h ON h.id_horario = det.id_horario
    ORDER BY dd.nro;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_jornada_semana_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_jornada_semana_rust]
    @carnet nvarchar(20) = NULL,
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_jornada_semana @carnet, @fecha;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_admin_crud_ip]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ============================================================
-- SP 8: sp_marcaje_admin_crud_ip
-- CRUD para marcaje_ip_whitelist
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_marcaje_admin_crud_ip]
    @accion  VARCHAR(20),   -- 'CREAR' | 'ELIMINAR'
    @id      INT = NULL,
    @nombre  NVARCHAR(200) = NULL,
    @cidr    VARCHAR(50) = NULL,
    @activo  BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF @accion = 'CREAR'
    BEGIN
        INSERT INTO marcaje_ip_whitelist (nombre, cidr, activo)
        VALUES (@nombre, @cidr, @activo);

        SELECT CAST(1 AS BIT) AS ok, 'IP agregada' AS mensaje, SCOPE_IDENTITY() AS id;
    END
    ELSE IF @accion = 'ELIMINAR'
    BEGIN
        DELETE FROM marcaje_ip_whitelist WHERE id = @id;
        SELECT CAST(1 AS BIT) AS ok, 'IP eliminada' AS mensaje, @id AS id;
    END
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_admin_crud_site]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ============================================================
-- SP 7: sp_marcaje_admin_crud_site
-- CRUD genérico para marcaje_sites
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_marcaje_admin_crud_site]
    @accion       VARCHAR(20),   -- 'CREAR' | 'EDITAR' | 'ELIMINAR'
    @id           INT = NULL,
    @nombre       NVARCHAR(200) = NULL,
    @lat          DECIMAL(10,7) = NULL,
    @lon          DECIMAL(10,7) = NULL,
    @radio_metros INT = 200,
    @accuracy_max INT = 100,
    @activo       BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF @accion = 'CREAR'
    BEGIN
        INSERT INTO marcaje_sites (nombre, lat, long, radio_metros, accuracy_max, activo)
        VALUES (@nombre, @lat, @lon, @radio_metros, @accuracy_max, @activo);

        SELECT CAST(1 AS BIT) AS ok, 'Site creado' AS mensaje, SCOPE_IDENTITY() AS id;
    END
    ELSE IF @accion = 'EDITAR'
    BEGIN
        UPDATE marcaje_sites
        SET nombre = ISNULL(@nombre, nombre),
            lat = ISNULL(@lat, lat),
            long = ISNULL(@lon, long),
            radio_metros = ISNULL(@radio_metros, radio_metros),
            accuracy_max = ISNULL(@accuracy_max, accuracy_max),
            activo = @activo
        WHERE id = @id;

        SELECT CAST(1 AS BIT) AS ok, 'Site actualizado' AS mensaje, @id AS id;
    END
    ELSE IF @accion = 'ELIMINAR'
    BEGIN
        DELETE FROM marcaje_sites WHERE id = @id;
        SELECT CAST(1 AS BIT) AS ok, 'Site eliminado' AS mensaje, @id AS id;
    END
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_admin_crud_site_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_admin_crud_site_rust]
    @accion varchar(20) = NULL,
    @id int = NULL,
    @nombre nvarchar(200) = NULL,
    @lat decimal = NULL,
    @lon decimal = NULL,
    @radio_metros int = NULL,
    @accuracy_max int = NULL,
    @activo bit = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_admin_crud_site @accion, @id, @nombre, @lat, @lon, @radio_metros, @accuracy_max, @activo;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_admin_device]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ============================================================
-- SP 9: sp_marcaje_admin_device
-- Aprobar o bloquear dispositivo
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_marcaje_admin_device]
    @uuid   VARCHAR(100),
    @estado VARCHAR(20)    -- 'ACTIVE' | 'BLOCKED'
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE marcaje_devices
    SET estado = @estado,
        fecha_activacion = CASE WHEN @estado = 'ACTIVE' THEN GETDATE() ELSE fecha_activacion END
    WHERE uuid = @uuid;

    IF @@ROWCOUNT = 0
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'Dispositivo no encontrado' AS mensaje;
        RETURN;
    END

    SELECT CAST(1 AS BIT) AS ok,
           CONCAT('Dispositivo ', @estado) AS mensaje,
           @uuid AS uuid;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_admin_device_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_admin_device_rust]
    @uuid varchar(100) = NULL,
    @estado varchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_admin_device @uuid, @estado;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_admin_eliminar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ============================================================
-- SP 4: sp_marcaje_admin_eliminar
-- Admin elimina un marcaje específico
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_marcaje_admin_eliminar]
    @asistencia_id INT,
    @admin_carnet  VARCHAR(20),
    @motivo        NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Verificar que existe
    IF NOT EXISTS (SELECT 1 FROM marcaje_asistencias WHERE id = @asistencia_id)
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'Marcaje no encontrado' AS mensaje;
        RETURN;
    END

    -- Obtener info antes de borrar (para log)
    DECLARE @carnet_borrado VARCHAR(20);
    DECLARE @tipo_borrado VARCHAR(30);
    DECLARE @fecha_borrada DATETIME2;

    SELECT @carnet_borrado = carnet,
           @tipo_borrado = tipo_marcaje,
           @fecha_borrada = fecha
    FROM marcaje_asistencias WHERE id = @asistencia_id;

    -- Eliminar
    DELETE FROM marcaje_asistencias WHERE id = @asistencia_id;

    SELECT CAST(1 AS BIT) AS ok,
           CONCAT('Marcaje eliminado: ', @tipo_borrado, ' de ', @carnet_borrado,
                  ' del ', CONVERT(VARCHAR(19), @fecha_borrada, 120)) AS mensaje,
           @asistencia_id AS id_eliminado,
           @admin_carnet AS eliminado_por;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_admin_eliminar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_admin_eliminar_rust]
    @asistencia_id int = NULL,
    @admin_carnet varchar(20) = NULL,
    @motivo nvarchar(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_admin_eliminar @asistencia_id, @admin_carnet, @motivo;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Marcaje_Admin_ObtenerIps_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Marcaje_Admin_ObtenerIps_rust]
AS
BEGIN
    SELECT * FROM marcaje_ip_whitelist ORDER BY id ASC
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Marcaje_Admin_ObtenerSites_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Marcaje_Admin_ObtenerSites_rust]
AS
BEGIN
    SELECT * FROM marcaje_sites ORDER BY id ASC
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Marcaje_Admin_ObtenerSolicitudes_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Marcaje_Admin_ObtenerSolicitudes_rust]
AS
BEGIN
    SELECT TOP 200 s.*, u.nombreCompleto as colaborador_nombre
    FROM marcaje_solicitudes s
    LEFT JOIN p_Usuarios u ON u.carnet = s.carnet
    ORDER BY s.creado_en DESC
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_admin_reiniciar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ============================================================
-- SP 5: sp_marcaje_admin_reiniciar
-- Forzar cierre de turno abierto para un empleado
-- Inserta una SALIDA forzada con motivo administrativo
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_marcaje_admin_reiniciar]
    @carnet       VARCHAR(20),
    @admin_carnet VARCHAR(20),
    @motivo       NVARCHAR(500) = 'Reinicio administrativo por error del empleado'
AS
BEGIN
    SET NOCOUNT ON;

    -- Verificar que tiene turno abierto
    DECLARE @ultimo_tipo VARCHAR(30);
    DECLARE @ultima_fecha DATETIME2;

    SELECT TOP 1 @ultimo_tipo = tipo_marcaje, @ultima_fecha = fecha
    FROM marcaje_asistencias
    WHERE carnet = @carnet AND estado = 'ACEPTADA'
    ORDER BY fecha DESC;

    IF @ultimo_tipo IS NULL
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'No se encontraron marcajes para este empleado' AS mensaje;
        RETURN;
    END

    IF @ultimo_tipo NOT IN ('ENTRADA', 'INICIO_EXTRA', 'INICIO_COMPENSADA')
    BEGIN
        SELECT CAST(0 AS BIT) AS ok,
               CONCAT('El empleado no tiene turno abierto. Último tipo: ', @ultimo_tipo) AS mensaje;
        RETURN;
    END

    -- Determinar tipo de salida según tipo de entrada
    DECLARE @tipo_salida VARCHAR(30) = CASE
        WHEN @ultimo_tipo = 'ENTRADA' THEN 'SALIDA'
        WHEN @ultimo_tipo = 'INICIO_EXTRA' THEN 'FIN_EXTRA'
        WHEN @ultimo_tipo = 'INICIO_COMPENSADA' THEN 'FIN_COMPENSADA'
        ELSE 'SALIDA'
    END;

    -- Insertar SALIDA forzada
    INSERT INTO marcaje_asistencias (
        carnet, tipo_marcaje, tipo_device, fecha, estado, motivo
    )
    VALUES (
        @carnet,
        @tipo_salida,
        'DESKTOP',
        GETDATE(),
        'ACEPTADA',
        CONCAT('ADMIN_RESET: ', @motivo, ' (por admin ', @admin_carnet, ')')
    );

    SELECT CAST(1 AS BIT) AS ok,
           CONCAT('Estado reiniciado. Se registró ', @tipo_salida, ' forzada.') AS mensaje,
           SCOPE_IDENTITY() AS nuevo_id,
           @tipo_salida AS tipo_insertado,
           @admin_carnet AS reiniciado_por;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_admin_reiniciar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_admin_reiniciar_rust]
    @carnet varchar(20) = NULL,
    @admin_carnet varchar(20) = NULL,
    @motivo nvarchar(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_admin_reiniciar @carnet, @admin_carnet, @motivo;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_dashboard_kpis]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ============================================================
-- SP 2: sp_marcaje_dashboard_kpis
-- KPIs agregados del día para el panel admin
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_marcaje_dashboard_kpis]
    @fecha DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @fecha = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    DECLARE @inicio DATETIME2 = CAST(@fecha AS DATETIME2);
    DECLARE @fin DATETIME2 = DATEADD(DAY, 1, @inicio);

    -- Conteos
    DECLARE @total_marcajes INT = 0;
    DECLARE @total_entradas INT = 0;
    DECLARE @total_salidas INT = 0;
    DECLARE @empleados_marcaron INT = 0;
    DECLARE @total_warnings INT = 0;
    DECLARE @total_fuera_zona INT = 0;

    SELECT
        @total_marcajes = COUNT(*),
        @total_entradas = SUM(CASE WHEN tipo_marcaje = 'ENTRADA' THEN 1 ELSE 0 END),
        @total_salidas = SUM(CASE WHEN tipo_marcaje = 'SALIDA' THEN 1 ELSE 0 END),
        @empleados_marcaron = COUNT(DISTINCT carnet),
        @total_warnings = SUM(CASE WHEN motivo IS NOT NULL THEN 1 ELSE 0 END),
        @total_fuera_zona = SUM(CASE WHEN motivo LIKE '%Fuera de zona%' THEN 1 ELSE 0 END)
    FROM marcaje_asistencias
    WHERE fecha >= @inicio AND fecha < @fin
      AND estado = 'ACEPTADA';

    -- Empleados con turno abierto (último marcaje fue ENTRADA sin SALIDA posterior)
    DECLARE @turnos_abiertos INT = 0;

    ;WITH ultimo_por_empleado AS (
        SELECT carnet, tipo_marcaje, fecha,
               ROW_NUMBER() OVER (PARTITION BY carnet ORDER BY fecha DESC) AS rn
        FROM marcaje_asistencias
        WHERE estado = 'ACEPTADA'
    )
    SELECT @turnos_abiertos = COUNT(*)
    FROM ultimo_por_empleado
    WHERE rn = 1 AND tipo_marcaje = 'ENTRADA';

    -- Stale shifts (> 20 horas sin salida)
    DECLARE @stale_shifts INT = 0;

    ;WITH ultimo_entrada AS (
        SELECT carnet, tipo_marcaje, fecha,
               ROW_NUMBER() OVER (PARTITION BY carnet ORDER BY fecha DESC) AS rn
        FROM marcaje_asistencias
        WHERE estado = 'ACEPTADA'
    )
    SELECT @stale_shifts = COUNT(*)
    FROM ultimo_entrada
    WHERE rn = 1
      AND tipo_marcaje = 'ENTRADA'
      AND DATEDIFF(HOUR, fecha, GETDATE()) > 20;

    -- Solicitudes pendientes
    DECLARE @solicitudes_pendientes INT = 0;
    SELECT @solicitudes_pendientes = COUNT(*)
    FROM marcaje_solicitudes
    WHERE estado = 'PENDIENTE';

    SELECT
        @fecha AS fecha,
        @total_marcajes AS total_marcajes,
        @total_entradas AS total_entradas,
        @total_salidas AS total_salidas,
        @empleados_marcaron AS empleados_marcaron,
        @total_warnings AS total_warnings,
        @total_fuera_zona AS total_fuera_zona,
        @turnos_abiertos AS turnos_abiertos,
        @stale_shifts AS stale_shifts,
        @solicitudes_pendientes AS solicitudes_pendientes;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_dashboard_kpis_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_dashboard_kpis_rust]
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_dashboard_kpis @fecha;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_deshacer_ultimo]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- SP 3: sp_marcaje_deshacer_ultimo
-- Elimina el Ãºltimo marcaje del tipo especificado
-- Solo se permite deshacer SALIDA/FIN_EXTRA/FIN_COMPENSADA
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_marcaje_deshacer_ultimo]
    @carnet VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @id INT;
    DECLARE @tipo VARCHAR(30);

    SELECT TOP 1 @id = id, @tipo = tipo_marcaje
    FROM marcaje_asistencias
    WHERE carnet = @carnet AND estado = 'ACEPTADA'
    ORDER BY fecha DESC;

    -- Solo se puede deshacer salidas (no entradas, para evitar estado incoherente)
    IF @tipo IN ('SALIDA', 'FIN_EXTRA', 'FIN_COMPENSADA')
    BEGIN
        DELETE FROM marcaje_asistencias WHERE id = @id;
        SELECT CAST(1 AS BIT) AS ok, 'Ãšltimo registro eliminado' AS mensaje, @tipo AS tipo_eliminado;
    END
    ELSE
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'Solo se puede deshacer una salida, no una entrada' AS mensaje, @tipo AS tipo_actual;
    END
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_deshacer_ultimo_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_deshacer_ultimo_rust]
    @carnet varchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_deshacer_ultimo @carnet;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_geocercas_usuario]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SP: sp_marcaje_geocercas_usuario
-- Listar geocercas asignadas a un usuario
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE   PROCEDURE [dbo].[sp_marcaje_geocercas_usuario]
    @carnet     NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ug.id,
        ug.id_site,
        s.nombre,
        s.lat,
        s.long AS lon,
        s.radio_metros,
        s.accuracy_max,
        ug.activo,
        ug.creado_en
    FROM marcaje_usuario_geocercas ug
    INNER JOIN marcaje_sites s ON s.id = ug.id_site
    WHERE ug.carnet = @carnet
    ORDER BY ug.activo DESC, s.nombre;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_geocercas_usuario_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_geocercas_usuario_rust]
    @carnet nvarchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_geocercas_usuario @carnet;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_gps_batch]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- SP 5: sp_marcaje_gps_batch
-- Inserta mÃºltiples puntos GPS de tracking en lote
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_marcaje_gps_batch]
    @carnet VARCHAR(20),
    @puntos NVARCHAR(MAX)  -- JSON array: [{"lat":12.1,"lon":-86.2,"accuracy":10,"timestamp":"2026-...","fuente":"BACKGROUND"},...]
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO marcaje_gps_tracking (carnet, lat, long, accuracy, timestamp, fuente)
    SELECT
        @carnet,
        JSON_VALUE(p.value, '$.lat'),
        JSON_VALUE(p.value, '$.lon'),
        JSON_VALUE(p.value, '$.accuracy'),
        JSON_VALUE(p.value, '$.timestamp'),
        ISNULL(JSON_VALUE(p.value, '$.fuente'), 'BACKGROUND')
    FROM OPENJSON(@puntos) AS p;

    SELECT @@ROWCOUNT AS insertados;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_gps_batch_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_gps_batch_rust]
    @carnet varchar(20) = NULL,
    @puntos nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_gps_batch @carnet, @puntos;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_monitor_dia]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ============================================================
-- SP 1: sp_marcaje_monitor_dia
-- Ver todos los marcajes del día con nombre del empleado
-- Para la pantalla de "Monitor en Tiempo Real"
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_marcaje_monitor_dia]
    @fecha DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @fecha = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    DECLARE @inicio DATETIME2 = CAST(@fecha AS DATETIME2);
    DECLARE @fin DATETIME2 = DATEADD(DAY, 1, @inicio);

    -- Result Set 1: Marcajes del día
    SELECT
        a.id,
        a.carnet,
        c.Colaborador AS nombre_empleado,
        a.tipo_marcaje,
        a.tipo_device,
        a.fecha,
        a.estado,
        a.motivo,
        a.lat,
        a.long,
        a.accuracy,
        a.ip,
        a.device_uuid,
        a.offline_id,
        CASE WHEN a.motivo IS NOT NULL THEN 1 ELSE 0 END AS tiene_warn
    FROM marcaje_asistencias a
    LEFT JOIN rrhh.Colaboradores c ON c.Carnet = a.carnet
    WHERE a.fecha >= @inicio
      AND a.fecha < @fin
      AND a.estado = 'ACEPTADA'
    ORDER BY a.fecha DESC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_monitor_dia_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_monitor_dia_rust]
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_monitor_dia @fecha;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_registrar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- SP 1: sp_marcaje_registrar
-- Registra un marcaje (entrada/salida/extras/compensada)
-- REGLA DE ORO: NUNCA rechazar. Si hay irregularidad â†’ WARN en motivo.
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_marcaje_registrar]
    @carnet          VARCHAR(20),
    @tipo_marcaje    VARCHAR(30),      -- ENTRADA | SALIDA | INICIO_EXTRA | FIN_EXTRA | INICIO_COMPENSADA | FIN_COMPENSADA
    @tipo_device     VARCHAR(20),      -- MOBILE | DESKTOP
    @lat             DECIMAL(10,7) = NULL,
    @lon             DECIMAL(10,7) = NULL,
    @accuracy        DECIMAL(10,2) = NULL,
    @ip              VARCHAR(50) = NULL,
    @user_agent      NVARCHAR(500) = NULL,
    @device_uuid     VARCHAR(100) = NULL,
    @timestamp_marca DATETIME2 = NULL,
    @offline_id      VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ahora DATETIME2 = ISNULL(@timestamp_marca, GETDATE());
    DECLARE @motivo NVARCHAR(500) = NULL;
    DECLARE @estado VARCHAR(20) = 'ACEPTADA';

    -- ========================================
    -- 1. IDEMPOTENCIA: Si ya existe este offline_id, retornar el existente
    -- ========================================
    IF @offline_id IS NOT NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM marcaje_asistencias WHERE offline_id = @offline_id)
        BEGIN
            SELECT * FROM marcaje_asistencias WHERE offline_id = @offline_id;
            RETURN;
        END
    END

    -- ========================================
    -- 2. ANTI-SPAM: Ãºltimos 60 segundos
    -- ========================================
    DECLARE @ultimo_marcaje DATETIME2;
    SELECT TOP 1 @ultimo_marcaje = fecha
    FROM marcaje_asistencias
    WHERE carnet = @carnet AND estado = 'ACEPTADA'
    ORDER BY fecha DESC;

    IF @ultimo_marcaje IS NOT NULL AND DATEDIFF(SECOND, @ultimo_marcaje, @ahora) < 60
    BEGIN
        -- NO rechazar, registrar con WARN
        SET @motivo = CONCAT('WARN: Anti-spam activo (', DATEDIFF(SECOND, @ultimo_marcaje, @ahora), 's desde Ãºltimo marcaje)');
    END

    -- ========================================
    -- 3. VALIDAR PERMISOS DE DISPOSITIVO
    -- ========================================
    DECLARE @permitir_movil BIT = 1;
    DECLARE @permitir_escritorio BIT = 1;

    SELECT @permitir_movil = permitir_movil,
           @permitir_escritorio = permitir_escritorio
    FROM marcaje_config_usuario
    WHERE carnet = @carnet AND activo = 1;

    IF @tipo_device = 'MOBILE' AND @permitir_movil = 0
    BEGIN
        SET @motivo = ISNULL(@motivo + ' | ', '') + 'WARN: Marcaje mÃ³vil no autorizado para este usuario';
    END

    IF @tipo_device = 'DESKTOP' AND @permitir_escritorio = 0
    BEGIN
        SET @motivo = ISNULL(@motivo + ' | ', '') + 'WARN: Marcaje escritorio no autorizado para este usuario';
    END

    -- ========================================
    -- 4. VALIDACIÃ“N GEOFENCE (solo si tiene GPS)
    -- ========================================
    IF @lat IS NOT NULL AND @lon IS NOT NULL
    BEGIN
        DECLARE @min_distancia FLOAT = NULL;
        DECLARE @zona_cercana NVARCHAR(200) = NULL;

        SELECT TOP 1
            @min_distancia = dbo.fn_haversine_metros(@lat, @lon, lat, long),
            @zona_cercana = nombre
        FROM marcaje_sites
        WHERE activo = 1
        ORDER BY dbo.fn_haversine_metros(@lat, @lon, lat, long) ASC;

        -- Verificar si estÃ¡ dentro de alguna zona
        IF @min_distancia IS NOT NULL
        BEGIN
            DECLARE @dentro_zona BIT = 0;

            IF EXISTS (
                SELECT 1 FROM marcaje_sites
                WHERE activo = 1
                  AND dbo.fn_haversine_metros(@lat, @lon, lat, long) <= radio_metros
                  AND (@accuracy IS NULL OR @accuracy <= accuracy_max)
            )
            BEGIN
                SET @dentro_zona = 1;
            END

            IF @dentro_zona = 0
            BEGIN
                SET @motivo = ISNULL(@motivo + ' | ', '') +
                    CONCAT('WARN: Fuera de zona (mÃ¡s cercana: ', @zona_cercana,
                           ' a ', CAST(CAST(@min_distancia AS INT) AS VARCHAR), 'm)');
            END
        END
    END

    -- ========================================
    -- 5. VALIDACIÃ“N IP WHITELIST (solo DESKTOP)
    -- ========================================
    IF @tipo_device = 'DESKTOP' AND @ip IS NOT NULL
    BEGIN
        DECLARE @hay_whitelist BIT = 0;
        IF EXISTS (SELECT 1 FROM marcaje_ip_whitelist WHERE activo = 1)
            SET @hay_whitelist = 1;

        IF @hay_whitelist = 1
        BEGIN
            -- ValidaciÃ³n simplificada: match exacto del primer octeto de CIDR
            -- Para producciÃ³n usar fn_ip_in_cidr con conversiones binarias
            DECLARE @ip_autorizada BIT = 0;

            IF EXISTS (
                SELECT 1 FROM marcaje_ip_whitelist
                WHERE activo = 1
                  AND @ip LIKE REPLACE(REPLACE(cidr, '.0/8', '.%'), '.0.0/16', '.%')
            )
                SET @ip_autorizada = 1;

            -- Fallback: match exacto
            IF @ip_autorizada = 0 AND EXISTS (
                SELECT 1 FROM marcaje_ip_whitelist
                WHERE activo = 1 AND cidr = @ip
            )
                SET @ip_autorizada = 1;

            IF @ip_autorizada = 0
            BEGIN
                SET @motivo = ISNULL(@motivo + ' | ', '') +
                    CONCAT('WARN: IP no autorizada (', @ip, ')');
            END
        END
    END

    -- ========================================
    -- 6. STALE SHIFT CHECK (> 20 horas sin salida)
    -- ========================================
    IF @tipo_marcaje = 'ENTRADA'
    BEGIN
        DECLARE @ultima_entrada DATETIME2;
        SELECT TOP 1 @ultima_entrada = fecha
        FROM marcaje_asistencias
        WHERE carnet = @carnet
          AND tipo_marcaje = 'ENTRADA'
          AND estado = 'ACEPTADA'
          AND NOT EXISTS (
              SELECT 1 FROM marcaje_asistencias sub
              WHERE sub.carnet = @carnet
                AND sub.tipo_marcaje = 'SALIDA'
                AND sub.estado = 'ACEPTADA'
                AND sub.fecha > marcaje_asistencias.fecha
          )
        ORDER BY fecha DESC;

        IF @ultima_entrada IS NOT NULL AND DATEDIFF(HOUR, @ultima_entrada, @ahora) > 20
        BEGIN
            SET @motivo = ISNULL(@motivo + ' | ', '') +
                CONCAT('WARN: Turno anterior abierto sin salida desde ',
                       CONVERT(VARCHAR(19), @ultima_entrada, 120));
        END
    END

    -- ========================================
    -- 7. INSERTAR MARCAJE
    -- ========================================
    INSERT INTO marcaje_asistencias (
        carnet, lat, long, accuracy, ip, user_agent, device_uuid,
        tipo_device, tipo_marcaje, fecha, estado, motivo, offline_id
    )
    VALUES (
        @carnet, @lat, @lon, @accuracy, @ip, @user_agent, @device_uuid,
        @tipo_device, @tipo_marcaje, @ahora, @estado, @motivo, @offline_id
    );

    -- Retornar el registro insertado
    SELECT * FROM marcaje_asistencias WHERE id = SCOPE_IDENTITY();
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_registrar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_registrar_rust]
    @carnet varchar(20) = NULL,
    @tipo_marcaje varchar(30) = NULL,
    @tipo_device varchar(20) = NULL,
    @lat decimal = NULL,
    @lon decimal = NULL,
    @accuracy decimal = NULL,
    @ip varchar(50) = NULL,
    @user_agent nvarchar(500) = NULL,
    @device_uuid varchar(100) = NULL,
    @timestamp_marca datetime2 = NULL,
    @offline_id varchar(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_registrar @carnet, @tipo_marcaje, @tipo_device, @lat, @lon, @accuracy, @ip, @user_agent, @device_uuid, @timestamp_marca, @offline_id;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_reporte_asistencia]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO
CREATE   PROCEDURE [dbo].[sp_marcaje_reporte_asistencia]
    @fecha_inicio DATE,
    @fecha_fin    DATE,
    @carnet       VARCHAR(20) = NULL  -- NULL = todos
AS
BEGIN
    SET NOCOUNT ON;

    WITH Numerados AS (
        SELECT 
            carnet,
            CAST(fecha AS DATE) AS dia,
            lat,
            long,
            tipo_marcaje,
            ROW_NUMBER() OVER(PARTITION BY carnet, CAST(fecha AS DATE), tipo_marcaje ORDER BY fecha ASC) as rn_asc,
            ROW_NUMBER() OVER(PARTITION BY carnet, CAST(fecha AS DATE), tipo_marcaje ORDER BY fecha DESC) as rn_desc
        FROM marcaje_asistencias
        WHERE CAST(fecha AS DATE) BETWEEN @fecha_inicio AND @fecha_fin
          AND estado = 'ACEPTADA'
          AND (@carnet IS NULL OR carnet = @carnet)
    )
    SELECT
        c.Carnet AS carnet,
        c.Colaborador AS nombre_empleado,
        CAST(a.fecha AS DATE) AS dia,
        MIN(CASE WHEN a.tipo_marcaje = 'ENTRADA' THEN a.fecha END) AS primera_entrada,
        MAX(CASE WHEN a.tipo_marcaje = 'SALIDA' THEN a.fecha END) AS ultima_salida,
        DATEDIFF(MINUTE,
            MIN(CASE WHEN a.tipo_marcaje = 'ENTRADA' THEN a.fecha END),
            MAX(CASE WHEN a.tipo_marcaje = 'SALIDA' THEN a.fecha END)
        ) AS minutos_jornada,
        SUM(CASE WHEN a.tipo_marcaje = 'ENTRADA' THEN 1 ELSE 0 END) AS total_entradas,
        SUM(CASE WHEN a.tipo_marcaje = 'SALIDA' THEN 1 ELSE 0 END) AS total_salidas,
        SUM(CASE WHEN a.tipo_marcaje = 'INICIO_EXTRA' THEN 1 ELSE 0 END) AS sesiones_extra,
        SUM(CASE WHEN a.tipo_marcaje = 'INICIO_COMPENSADA' THEN 1 ELSE 0 END) AS sesiones_compensada,
        SUM(CASE WHEN a.motivo IS NOT NULL THEN 1 ELSE 0 END) AS total_warnings,
        SUM(CASE WHEN a.motivo LIKE '%Fuera de zona%' THEN 1 ELSE 0 END) AS fuera_geofence,
        COUNT(*) AS total_marcajes,
        -- Obtenemos coordenadas lat y long de la primera entrada del dia
        (SELECT TOP 1 n.lat FROM Numerados n WHERE n.carnet = a.carnet AND n.dia = CAST(a.fecha AS DATE) AND n.tipo_marcaje = 'ENTRADA' AND n.rn_asc = 1) AS lat,
        (SELECT TOP 1 n.long FROM Numerados n WHERE n.carnet = a.carnet AND n.dia = CAST(a.fecha AS DATE) AND n.tipo_marcaje = 'ENTRADA' AND n.rn_asc = 1) AS long
    FROM marcaje_asistencias a
    LEFT JOIN rrhh.Colaboradores c ON c.Carnet = a.carnet
    WHERE CAST(a.fecha AS DATE) BETWEEN @fecha_inicio AND @fecha_fin
      AND a.estado = 'ACEPTADA'
      AND (@carnet IS NULL OR a.carnet = @carnet)
    GROUP BY c.Carnet, c.Colaborador, CAST(a.fecha AS DATE), a.carnet
    ORDER BY dia DESC, c.Colaborador;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_reporte_asistencia_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_reporte_asistencia_rust]
    @fecha_inicio date = NULL,
    @fecha_fin date = NULL,
    @carnet varchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_reporte_asistencia @fecha_inicio, @fecha_fin, @carnet;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_resolver_solicitud]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ============================================================
-- SP 3: sp_marcaje_resolver_solicitud
-- Admin aprueba o rechaza una solicitud de corrección
-- Si aprobada + tipo ELIMINAR_SALIDA → elimina el marcaje
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_marcaje_resolver_solicitud]
    @solicitud_id     INT,
    @accion           VARCHAR(20),       -- 'APROBADA' | 'RECHAZADA'
    @admin_comentario NVARCHAR(500) = NULL,
    @admin_carnet     VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    -- Verificar que la solicitud existe y está pendiente
    DECLARE @estado_actual VARCHAR(20);
    DECLARE @tipo_solicitud VARCHAR(50);
    DECLARE @asistencia_id INT;

    SELECT @estado_actual = estado,
           @tipo_solicitud = tipo_solicitud,
           @asistencia_id = asistencia_id
    FROM marcaje_solicitudes
    WHERE id = @solicitud_id;

    IF @estado_actual IS NULL
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'Solicitud no encontrada' AS mensaje;
        RETURN;
    END

    IF @estado_actual <> 'PENDIENTE'
    BEGIN
        SELECT CAST(0 AS BIT) AS ok,
               CONCAT('La solicitud ya fue resuelta: ', @estado_actual) AS mensaje;
        RETURN;
    END

    -- Actualizar solicitud
    UPDATE marcaje_solicitudes
    SET estado = @accion,
        admin_comentario = @admin_comentario,
        resuelto_en = GETDATE()
    WHERE id = @solicitud_id;

    -- Si fue APROBADA y tipo = ELIMINAR_SALIDA, eliminar el marcaje referenciado
    IF @accion = 'APROBADA' AND @tipo_solicitud = 'ELIMINAR_SALIDA' AND @asistencia_id IS NOT NULL
    BEGIN
        DELETE FROM marcaje_asistencias WHERE id = @asistencia_id;
    END

    -- Retornar resultado
    SELECT CAST(1 AS BIT) AS ok,
           CONCAT('Solicitud ', @accion, ' correctamente') AS mensaje,
           @solicitud_id AS solicitud_id,
           @accion AS accion,
           @admin_carnet AS resuelta_por;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_resolver_solicitud_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_resolver_solicitud_rust]
    @solicitud_id int = NULL,
    @accion varchar(20) = NULL,
    @admin_comentario nvarchar(500) = NULL,
    @admin_carnet varchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_resolver_solicitud @solicitud_id, @accion, @admin_comentario, @admin_carnet;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_resumen_diario]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- SP 2: sp_marcaje_resumen_diario
-- Retorna el estado completo del dÃ­a para un empleado
-- Multiple result sets: historial + flags + timestamps
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_marcaje_resumen_diario]
    @carnet VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @hoy DATE = CAST(GETDATE() AS DATE);
    DECLARE @inicio_dia DATETIME2 = CAST(@hoy AS DATETIME2);
    DECLARE @fin_dia DATETIME2 = DATEADD(DAY, 1, @inicio_dia);

    -- ========================================
    -- RESULT SET 1: Historial del dÃ­a
    -- ========================================
    SELECT
        id, carnet, tipo_marcaje, tipo_device, fecha, estado, motivo,
        lat, long, accuracy, ip, device_uuid, offline_id
    FROM marcaje_asistencias
    WHERE carnet = @carnet
      AND fecha >= @inicio_dia
      AND fecha < @fin_dia
      AND estado = 'ACEPTADA'
    ORDER BY fecha ASC;

    -- ========================================
    -- CÃ¡lculos de estado
    -- ========================================
    DECLARE @ultimo_tipo VARCHAR(30) = NULL;
    DECLARE @ultima_fecha DATETIME2 = NULL;

    -- Ãšltimo marcaje global (no solo de hoy, para staleShift de ayer)
    SELECT TOP 1
        @ultimo_tipo = tipo_marcaje,
        @ultima_fecha = fecha
    FROM marcaje_asistencias
    WHERE carnet = @carnet AND estado = 'ACEPTADA'
    ORDER BY fecha DESC;

    -- Flags de estado
    DECLARE @isClockedIn BIT = 0;
    DECLARE @isOvertimeActive BIT = 0;
    DECLARE @isCompensatedActive BIT = 0;
    DECLARE @staleShift BIT = 0;

    -- Determinar isClockedIn: Ãºltima fue ENTRADA y no hay SALIDA despuÃ©s
    IF @ultimo_tipo = 'ENTRADA' SET @isClockedIn = 1;

    -- Determinar isOvertimeActive: Ãºltimo fue INICIO_EXTRA sin FIN_EXTRA despuÃ©s
    IF @ultimo_tipo = 'INICIO_EXTRA' SET @isOvertimeActive = 1;

    -- Determinar isCompensatedActive: Ãºltimo fue INICIO_COMPENSADA sin FIN_COMPENSADA
    IF @ultimo_tipo = 'INICIO_COMPENSADA' SET @isCompensatedActive = 1;

    -- StaleShift: si estÃ¡ clockedIn y han pasado > 20 horas
    IF @isClockedIn = 1 AND @ultima_fecha IS NOT NULL
    BEGIN
        IF DATEDIFF(HOUR, @ultima_fecha, GETDATE()) > 20
            SET @staleShift = 1;
    END

    -- TambiÃ©n verificar si staleShift aplica a overtime
    IF @isOvertimeActive = 1 AND @ultima_fecha IS NOT NULL
    BEGIN
        IF DATEDIFF(HOUR, @ultima_fecha, GETDATE()) > 20
            SET @staleShift = 1;
    END

    -- Timestamps clave
    DECLARE @lastCheckIn DATETIME2 = NULL;
    DECLARE @lastCheckOut DATETIME2 = NULL;

    SELECT TOP 1 @lastCheckIn = fecha
    FROM marcaje_asistencias
    WHERE carnet = @carnet AND tipo_marcaje = 'ENTRADA' AND estado = 'ACEPTADA'
      AND fecha >= @inicio_dia AND fecha < @fin_dia
    ORDER BY fecha DESC;

    SELECT TOP 1 @lastCheckOut = fecha
    FROM marcaje_asistencias
    WHERE carnet = @carnet AND tipo_marcaje = 'SALIDA' AND estado = 'ACEPTADA'
      AND fecha >= @inicio_dia AND fecha < @fin_dia
    ORDER BY fecha DESC;

    -- ========================================
    -- RESULT SET 2: Flags de estado
    -- ========================================
    SELECT
        @isClockedIn        AS isClockedIn,
        @isOvertimeActive   AS isOvertimeActive,
        @isCompensatedActive AS isCompensatedActive,
        @staleShift         AS staleShift,
        @lastCheckIn        AS lastCheckIn,
        @lastCheckOut       AS lastCheckOut,
        @ultima_fecha       AS lastRecordTimestamp,
        @ultimo_tipo        AS lastRecordType;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_resumen_diario_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_resumen_diario_rust]
    @carnet varchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_resumen_diario @carnet;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_solicitar_correccion]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- SP 4: sp_marcaje_solicitar_correccion
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_marcaje_solicitar_correccion]
    @carnet          VARCHAR(20),
    @asistencia_id   INT = NULL,
    @tipo_solicitud  VARCHAR(50),
    @motivo          NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO marcaje_solicitudes (carnet, asistencia_id, tipo_solicitud, motivo, estado)
    VALUES (@carnet, @asistencia_id, @tipo_solicitud, @motivo, 'PENDIENTE');

    SELECT * FROM marcaje_solicitudes WHERE id = SCOPE_IDENTITY();
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_solicitar_correccion_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_solicitar_correccion_rust]
    @carnet varchar(20) = NULL,
    @asistencia_id int = NULL,
    @tipo_solicitud varchar(50) = NULL,
    @motivo nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_solicitar_correccion @carnet, @asistencia_id, @tipo_solicitud, @motivo;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_validar_geocerca]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- SP: sp_marcaje_validar_geocerca
-- Valida si un usuario estÃ¡ dentro de alguna de sus
-- geocercas. Retorna resultado pero NO bloquea el marcaje.
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE   PROCEDURE [dbo].[sp_marcaje_validar_geocerca]
    @carnet     NVARCHAR(20),
    @lat        DECIMAL(10,7),
    @lon        DECIMAL(10,7)
AS
BEGIN
    SET NOCOUNT ON;

    -- Si no tiene geocercas asignadas â†’ sin restricciÃ³n
    IF NOT EXISTS (
        SELECT 1 FROM marcaje_usuario_geocercas
        WHERE carnet = @carnet AND activo = 1
    )
    BEGIN
        SELECT
            1 AS dentro_geocerca,
            'SIN_RESTRICCION' AS estado,
            NULL AS site_cercano,
            NULL AS distancia_metros,
            'Usuario sin geocercas asignadas' AS mensaje;
        RETURN;
    END

    -- Calcular distancia a cada geocerca del usuario
    -- FÃ³rmula Haversine simplificada (aprox 111km por grado)
    DECLARE @resultados TABLE (
        id_site INT, nombre NVARCHAR(200),
        radio_metros INT, distancia_metros FLOAT
    );

    INSERT INTO @resultados
    SELECT
        s.id, s.nombre, s.radio_metros,
        -- Distancia aprox en metros (Haversine simplificado)
        SQRT(
            POWER((@lat - s.lat) * 111320, 2) +
            POWER((@lon - s.long) * 111320 * COS(RADIANS(@lat)), 2)
        ) AS distancia_metros
    FROM marcaje_usuario_geocercas ug
    INNER JOIN marcaje_sites s ON s.id = ug.id_site AND s.activo = 1
    WHERE ug.carnet = @carnet AND ug.activo = 1;

    -- Â¿EstÃ¡ dentro de ALGUNA geocerca?
    DECLARE @dentro BIT = 0;
    IF EXISTS (SELECT 1 FROM @resultados WHERE distancia_metros <= radio_metros)
        SET @dentro = 1;

    -- Retornar el site mÃ¡s cercano
    SELECT TOP 1
        @dentro AS dentro_geocerca,
        CASE
            WHEN @dentro = 1 THEN 'DENTRO_GEOCERCA'
            ELSE 'FUERA_GEOCERCA'
        END AS estado,
        nombre AS site_cercano,
        CAST(distancia_metros AS INT) AS distancia_metros,
        CASE
            WHEN @dentro = 1 THEN 'Marcaje dentro de zona: ' + nombre
            ELSE 'Marcaje FUERA de zona. MÃ¡s cercano: ' + nombre + ' (' + CAST(CAST(distancia_metros AS INT) AS NVARCHAR) + 'm)'
        END AS mensaje
    FROM @resultados
    ORDER BY distancia_metros ASC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_marcaje_validar_geocerca_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_marcaje_validar_geocerca_rust]
    @carnet nvarchar(20) = NULL,
    @lat decimal = NULL,
    @lon decimal = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_marcaje_validar_geocerca @carnet, @lat, @lon;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Nota_Actualizar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 10. SP para Actualizar Nota
CREATE   PROCEDURE [dbo].[sp_Nota_Actualizar]
    @idNota INT,
    @titulo NVARCHAR(200),
    @contenido NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p_Notas 
    SET titulo = @titulo, 
        contenido = @contenido, 
        fechaModificacion = GETDATE()
    WHERE idNota = @idNota;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Nota_Crear]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 7. SP para Crear Nota
CREATE   PROCEDURE [dbo].[sp_Nota_Crear]
    @carnet NVARCHAR(50),
    @titulo NVARCHAR(200),
    @contenido NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnet;

    IF @idUsuario IS NULL RETURN;

    INSERT INTO p_Notas(idUsuario, titulo, contenido, fechaCreacion, fechaModificacion)
    VALUES(@idUsuario, @titulo, @contenido, GETDATE(), GETDATE());
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Nota_Eliminar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 11. SP para Eliminar Nota
CREATE   PROCEDURE [dbo].[sp_Nota_Eliminar]
    @id INT -- idNota
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM p_Notas WHERE idNota = @id;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Notas_Obtener]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sp_Notas_Obtener]
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT = NULL;
    SELECT TOP (1) @idUsuario = idUsuario
    FROM dbo.p_Usuarios
    WHERE carnet = @carnet;

    SELECT *
    FROM dbo.p_Notas
    WHERE idUsuario = @idUsuario
    ORDER BY fechaModificacion DESC, fechaCreacion DESC
    OPTION (RECOMPILE);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Notas_Obtener_test]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/*--------------------------------------------------------------*/
CREATE   PROCEDURE [dbo].[sp_Notas_Obtener_test]
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idUsuario INT = NULL;
    SELECT TOP (1) @idUsuario = idUsuario
    FROM dbo.p_Usuarios
    WHERE carnet = @carnet;

    SELECT *
    FROM dbo.p_Notas
    WHERE idUsuario = @idUsuario
    ORDER BY fechaModificacion DESC, fechaCreacion DESC
    OPTION (RECOMPILE);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_ObtenerProyectos]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

-- 1. Actualizar sp_ObtenerProyectos (Usuario)
CREATE   PROCEDURE [dbo].[sp_ObtenerProyectos]
    @carnet NVARCHAR(50),
    @filtroNombre NVARCHAR(100) = NULL,
    @filtroEstado NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnet;

    SELECT DISTINCT 
        p.*,
        responsableNombre = uR.nombre,
        creadorNombre = COALESCE(uC.nombre, uC2.nombre),
        porcentaje = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t2.estado = 'Hecha' THEN 100 ELSE ISNULL(t2.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        totalTareas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        tareasCompletadas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado = 'Hecha'
        ), 0)
    FROM p_Proyectos p
    LEFT JOIN p_Tareas t ON p.idProyecto = t.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea 
    LEFT JOIN p_Usuarios uR ON p.responsableCarnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON p.idCreador = uC.idUsuario
    LEFT JOIN p_Usuarios uC2 ON p.creadorCarnet = uC2.carnet AND p.idCreador IS NULL
    LEFT JOIN p_ProyectoColaboradores pc ON p.idProyecto = pc.idProyecto AND pc.activo = 1 AND pc.idUsuario = @idUsuario AND (pc.fechaExpiracion IS NULL OR pc.fechaExpiracion > GETDATE())
    WHERE (
        p.creadorCarnet = @carnet 
        OR p.responsableCarnet = @carnet
        OR ta.carnet = @carnet
        OR p.idCreador = @idUsuario
        OR pc.idProyecto IS NOT NULL -- ES COLABORADOR
    )
    AND (@filtroNombre IS NULL OR p.nombre LIKE '%' + @filtroNombre + '%')
    AND (@filtroEstado IS NULL OR p.estado = @filtroEstado)
    ORDER BY p.fechaCreacion DESC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_ObtenerProyectos_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_ObtenerProyectos_rust] @carnet nvarchar(50), @filtroNombre nvarchar(100) = NULL, @filtroEstado nvarchar(50) = NULL AS BEGIN SET NOCOUNT ON; EXEC dbo.sp_ObtenerProyectos @carnet, @filtroNombre, @filtroEstado; END;

GO
/****** Object:  StoredProcedure [dbo].[sp_ObtenerProyectos_test]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/*--------------------------------------------------------------
  sp_ObtenerProyectos_test
  Mejora:
  - Resuelve @idUsuario 1 vez.
  - Evita subquery repetida.
--------------------------------------------------------------*/
CREATE   PROCEDURE [dbo].[sp_ObtenerProyectos_test]
    @carnet NVARCHAR(50),
    @filtroNombre NVARCHAR(100) = NULL,
    @filtroEstado NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idUsuario INT = NULL;
    SELECT TOP (1) @idUsuario = u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.carnet = @carnet;

    ;WITH ProyectosBase AS (
        SELECT p.idProyecto
        FROM dbo.p_Proyectos p
        WHERE p.creadorCarnet = @carnet
           OR p.responsableCarnet = @carnet
           OR (@idUsuario IS NOT NULL AND p.idCreador = @idUsuario)

        UNION

        SELECT DISTINCT p2.idProyecto
        FROM dbo.p_Proyectos p2
        JOIN dbo.p_Tareas t ON t.idProyecto = p2.idProyecto AND t.activo = 1
        JOIN dbo.p_TareaAsignados ta ON ta.idTarea = t.idTarea
        WHERE ta.carnet = @carnet
    )
    SELECT p.*
    FROM dbo.p_Proyectos p
    JOIN ProyectosBase b ON b.idProyecto = p.idProyecto
    WHERE (@filtroNombre IS NULL OR p.nombre LIKE N'%' + @filtroNombre + N'%')
      AND (@filtroEstado IS NULL OR p.estado = @filtroEstado)
    ORDER BY p.fechaCreacion DESC
    OPTION (RECOMPILE);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_ObtenerResumenDiarioEquipo]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE   PROCEDURE [dbo].[sp_ObtenerResumenDiarioEquipo]
    @CarnetsCsv NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);


    SELECT 
        p.idProyecto,
        p.nombre AS proyectoNombre,
        t.idTarea,
        t.nombre AS tareaTitulo,
        t.estado AS estadoActual,
        t.porcentaje AS progresoActual,
        u.nombre AS usuarioNombre,
        u.carnet AS usuarioCarnet,
        t.fechaInicioReal,
        t.fechaFinReal,
        t.esfuerzo,
        -- Diferencia para sacar las horas reales aproximadas
        DATEDIFF(HOUR, t.fechaInicioReal, t.fechaFinReal) AS horasReales,
        -- Indicador
        CASE 
            WHEN CAST(t.fechaFinReal AS DATE) = @Hoy THEN 'COMPLETADA'
            ELSE 'AVANCE'
        END AS tipoAccion
    FROM p_Tareas t
    INNER JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    INNER JOIN p_Usuarios u ON t.asignadoCarnet = u.carnet
    INNER JOIN STRING_SPLIT(@CarnetsCsv, ',') eq ON eq.value = u.carnet
    WHERE 
        (CAST(t.fechaFinReal AS DATE) = @Hoy)
        OR 
        t.idTarea IN (
            -- Tareas que tuvieron al menos un avance guardado HOY por alguien del equipo
            SELECT a.idTarea 
            FROM p_TareaAvances a
            INNER JOIN p_Usuarios ua ON a.idUsuario = ua.idUsuario
            INNER JOIN STRING_SPLIT(@CarnetsCsv, ',') eqa ON eqa.value = ua.carnet
            WHERE CAST(a.fecha AS DATE) = @Hoy
        )
    ORDER BY p.nombre, tipoAccion DESC, u.nombre;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Organizacion_BuscarNodoPorId]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Organizacion_BuscarNodoPorId]
  @idorg BIGINT
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP 1
    id          AS idorg,
    nombre,
    tipo,
    idPadre     AS padre,
    orden,
    activo
  FROM dbo.p_OrganizacionNodos
  WHERE id = @idorg;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Organizacion_BuscarNodos]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Organizacion_BuscarNodos] @termino NVARCHAR(200) AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @t NVARCHAR(210) = N'%' + ISNULL(@termino, N'') + N'%';

  -- Buscar areas unicas directamente de p_Usuarios
  SELECT DISTINCT
    'AREA' AS idorg,
    nombre AS nombre,
    nombre AS descripcion,
    tipo
  FROM (
    SELECT DISTINCT gerencia AS nombre, 'GERENCIA' AS tipo FROM p_Usuarios WHERE activo=1 AND gerencia IS NOT NULL AND gerencia<>'' AND gerencia<>'NO APLICA' AND LOWER(gerencia) LIKE LOWER(@t)
    UNION
    SELECT DISTINCT subgerencia, 'SUBGERENCIA' FROM p_Usuarios WHERE activo=1 AND subgerencia IS NOT NULL AND subgerencia<>'' AND subgerencia<>'NO APLICA' AND LOWER(subgerencia) LIKE LOWER(@t)
    UNION
    SELECT DISTINCT primer_nivel, 'COORDINACION' FROM p_Usuarios WHERE activo=1 AND primer_nivel IS NOT NULL AND primer_nivel<>'' AND primer_nivel<>'NO APLICA' AND LOWER(primer_nivel) LIKE LOWER(@t)
  ) areas
  ORDER BY tipo, nombre;
END;

GO
/****** Object:  StoredProcedure [dbo].[sp_Organizacion_ContarEmpleadosNodoDirecto]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Organizacion_ContarEmpleadosNodoDirecto]
  @idOrg INT
AS
BEGIN
  SET NOCOUNT ON;

  SELECT COUNT(*) AS total
  FROM dbo.p_Usuarios u
  WHERE u.activo = 1
    AND u.idOrg = @idOrg;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Organizacion_ContarEmpleadosPorNodo]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Organizacion_ContarEmpleadosPorNodo]
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    CAST(u.idOrg AS NVARCHAR(50)) AS idOrg,
    COUNT(*) AS [count]
  FROM dbo.p_Usuarios u
  WHERE u.activo = 1
    AND u.idOrg IS NOT NULL
  GROUP BY u.idOrg;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Organizacion_ObtenerArbol]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sp_Organizacion_ObtenerArbol]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id as idorg, nombre, tipo, idPadre as padre, orden, activo 
    FROM p_OrganizacionNodos 
    WHERE activo = 1;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Organizacion_ObtenerCatalogo]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sp_Organizacion_ObtenerCatalogo]
AS
BEGIN
    SET NOCOUNT ON;
    -- SE ELIMINAN LTRIM/RTRIM del WHERE para permitir uso de índice
    SELECT DISTINCT 
        LTRIM(RTRIM(ogerencia)) AS ogerencia,
        LTRIM(RTRIM(subgerencia)) AS subgerencia,
        LTRIM(RTRIM(area)) AS area
    FROM dbo.p_Usuarios
    WHERE activo = 1
      AND ogerencia IS NOT NULL AND ogerencia <> ''
      AND subgerencia IS NOT NULL AND subgerencia <> ''
      AND area IS NOT NULL AND area <> ''
    ORDER BY 1, 2, 3
    OPTION (RECOMPILE);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Organizacion_ObtenerCatalogo_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO
CREATE   PROCEDURE [dbo].[sp_Organizacion_ObtenerCatalogo_rust] AS BEGIN SET NOCOUNT ON; SELECT DISTINCT ISNULL(LTRIM(RTRIM(ogerencia)), '') AS ogerencia, ISNULL(LTRIM(RTRIM(subgerencia)), '') AS subgerencia, ISNULL(LTRIM(RTRIM(area)), '') AS area FROM dbo.p_Usuarios WHERE activo = 1 AND ogerencia IS NOT NULL AND ogerencia <> '' ORDER BY 1, 2, 3; END
GO
/****** Object:  StoredProcedure [dbo].[sp_Organizacion_ObtenerEmpleadosNodoDirecto]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Organizacion_ObtenerEmpleadosNodoDirecto]
  @idOrg INT,
  @limite INT = 50
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP (@limite)
    u.idUsuario, u.carnet, u.nombre, u.nombreCompleto, u.correo,
    u.cargo, u.departamento, u.orgDepartamento, u.orgGerencia,
    u.idOrg, u.jefeCarnet, u.jefeNombre, u.jefeCorreo, u.activo,
    u.gerencia, u.subgerencia, u.idRol, u.rolGlobal
  FROM dbo.p_Usuarios u
  WHERE u.activo = 1
    AND u.idOrg = @idOrg
  ORDER BY u.nombreCompleto;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Organizacion_ObtenerEstructura]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sp_Organizacion_ObtenerEstructura]
AS
BEGIN
    SET NOCOUNT ON;
    -- Agrupamos por columnas RAW para aprovechar índice
    SELECT
        LTRIM(RTRIM(ISNULL(ogerencia, '')))      AS gerencia,
        LTRIM(RTRIM(ISNULL(subgerencia, '')))    AS subgerencia,
        LTRIM(RTRIM(ISNULL(primer_nivel, '')))   AS area
    FROM dbo.p_Usuarios
    WHERE activo = 1
    GROUP BY
        ogerencia, subgerencia, primer_nivel
    ORDER BY 1,2,3
    OPTION (RECOMPILE);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Organizacion_ObtenerEstructura_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Organizacion_ObtenerEstructura_rust] AS BEGIN SET NOCOUNT ON; EXEC dbo.sp_Organizacion_ObtenerEstructura; END;

GO
/****** Object:  StoredProcedure [dbo].[sp_Organizacion_SubarbolContarEmpleados]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Organizacion_SubarbolContarEmpleados]
  @idOrgRaiz NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @id NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@idOrgRaiz, N'')));
  IF (@id = N'')
  BEGIN
    SELECT CAST(0 AS INT) AS total;
    RETURN;
  END

  ;WITH NodosSub AS
  (
    SELECT CAST(id AS NVARCHAR(50)) AS idorg
    FROM dbo.p_OrganizacionNodos
    WHERE CAST(id AS NVARCHAR(50)) = @id

    UNION ALL

    SELECT CAST(n.id AS NVARCHAR(50))
    FROM dbo.p_OrganizacionNodos n
    JOIN NodosSub ns ON CAST(n.idPadre AS NVARCHAR(50)) = ns.idorg
  )
  SELECT COUNT(*) AS total
  FROM dbo.p_Usuarios u
  JOIN NodosSub ns ON CAST(u.idOrg AS NVARCHAR(50)) = ns.idorg
  WHERE u.activo = 1;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Organizacion_SubarbolPreviewEmpleados]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Organizacion_SubarbolPreviewEmpleados]
  @idOrgRaiz NVARCHAR(50),
  @limite INT = 50
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @id NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@idOrgRaiz, N'')));
  IF (@id = N'')
  BEGIN
    SELECT TOP 0 * FROM dbo.p_Usuarios;
    RETURN;
  END

  ;WITH NodosSub AS
  (
    SELECT CAST(id AS NVARCHAR(50)) AS idorg
    FROM dbo.p_OrganizacionNodos
    WHERE CAST(id AS NVARCHAR(50)) = @id

    UNION ALL

    SELECT CAST(n.id AS NVARCHAR(50))
    FROM dbo.p_OrganizacionNodos n
    JOIN NodosSub ns ON CAST(n.idPadre AS NVARCHAR(50)) = ns.idorg
  )
  SELECT TOP (@limite)
    u.idUsuario, u.carnet, u.nombre, u.nombreCompleto, u.correo,
    u.cargo, u.departamento, u.orgDepartamento, u.orgGerencia,
    u.idOrg, u.jefeCarnet, u.jefeNombre, u.jefeCorreo, u.activo,
    u.gerencia, u.subgerencia, u.idRol, u.rolGlobal
  FROM dbo.p_Usuarios u
  JOIN NodosSub ns ON CAST(u.idOrg AS NVARCHAR(50)) = ns.idorg
  WHERE u.activo = 1
  ORDER BY u.nombreCompleto;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_PermisoArea_Crear]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO
-- =================================================================
-- FIX: sp_PermisoArea_Crear - Agregar nombre_area y tipo_acceso
-- La tabla p_permiso_area tiene nombre_area y tipo_nivel
-- pero el SP no los recibe. Esto impide el match por nombre de Ã¡rea
-- cuando se calcula la visibilidad.
-- =================================================================

CREATE PROCEDURE [dbo].[sp_PermisoArea_Crear]
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

  -- Si no se proporcionÃ³ nombre_area y tenemos un idorg vÃ¡lido, buscarlo
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
/****** Object:  StoredProcedure [dbo].[sp_PermisoArea_Desactivar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_PermisoArea_Desactivar]
  @id BIGINT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE dbo.p_permiso_area
  SET activo = 0
  WHERE id = @id;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_PermisoArea_ListarActivos]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_PermisoArea_ListarActivos]
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM dbo.p_permiso_area
  WHERE activo = 1
  ORDER BY creado_en DESC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_PermisoArea_ListarActivos_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_PermisoArea_ListarActivos_rust] AS BEGIN SET NOCOUNT ON; SELECT * FROM p_permiso_area WHERE activo = 1 ORDER BY creado_en DESC; END;

GO
/****** Object:  StoredProcedure [dbo].[sp_PermisoArea_ObtenerActivosPorRecibe]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/* ============================================
   PERMISO ÁREA
   ============================================ */

CREATE   PROCEDURE [dbo].[sp_PermisoArea_ObtenerActivosPorRecibe]
  @carnetRecibe NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @c NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@carnetRecibe, N'')));

  SELECT *
  FROM dbo.p_permiso_area
  WHERE LTRIM(RTRIM(carnet_recibe)) = @c
    AND activo = 1
  ORDER BY creado_en DESC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_PermisoEmpleado_Crear]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_PermisoEmpleado_Crear]
  @otorga  NVARCHAR(50) = NULL,
  @recibe  NVARCHAR(50),
  @objetivo NVARCHAR(50),
  @tipo    NVARCHAR(50) = N'ALLOW',
  @motivo  NVARCHAR(500) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @r NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@recibe, N'')));
  DECLARE @o NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@objetivo, N'')));

  IF (@r = N'' OR @o = N'')
  BEGIN
    RAISERROR('carnet_recibe y carnet_objetivo requeridos.', 16, 1);
    RETURN;
  END

  INSERT INTO dbo.p_permiso_empleado
    (carnet_otorga, carnet_recibe, carnet_objetivo, tipo_acceso, motivo, activo, creado_en)
  VALUES
    (NULLIF(LTRIM(RTRIM(@otorga)), N''), @r, @o, @tipo, @motivo, 1, GETDATE());

  SELECT SCOPE_IDENTITY() AS id;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_PermisoEmpleado_Desactivar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_PermisoEmpleado_Desactivar]
  @id BIGINT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE dbo.p_permiso_empleado
  SET activo = 0
  WHERE id = @id;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_PermisoEmpleado_ListarActivos]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_PermisoEmpleado_ListarActivos]
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM dbo.p_permiso_empleado
  WHERE activo = 1
  ORDER BY creado_en DESC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_PermisoEmpleado_ListarActivos_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_PermisoEmpleado_ListarActivos_rust] AS BEGIN SET NOCOUNT ON; SELECT * FROM p_permiso_empleado WHERE activo = 1 ORDER BY creado_en DESC; END;

GO
/****** Object:  StoredProcedure [dbo].[sp_PermisoEmpleado_ObtenerActivosPorRecibe]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/* ============================================
   PERMISO EMPLEADO
   ============================================ */

CREATE   PROCEDURE [dbo].[sp_PermisoEmpleado_ObtenerActivosPorRecibe]
  @carnetRecibe NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @c NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@carnetRecibe, N'')));

  SELECT *
  FROM dbo.p_permiso_empleado
  WHERE LTRIM(RTRIM(carnet_recibe)) = @c
    AND activo = 1
  ORDER BY creado_en DESC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Planning_ObtenerPlanes]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sp_Planning_ObtenerPlanes]
    @carnet NVARCHAR(50),
    @mes INT,
    @anio INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idUsuario INT = NULL;
    SELECT TOP (1) @idUsuario = u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.carnet = @carnet;

    DECLARE @idPlan INT = NULL;

    SELECT TOP (1) @idPlan = pt.idPlan
    FROM dbo.p_PlanesTrabajo pt
    WHERE pt.carnet = @carnet AND pt.mes = @mes AND pt.anio = @anio;

    IF (@idPlan IS NULL AND @idUsuario IS NOT NULL)
    BEGIN
        SELECT TOP (1) @idPlan = pt.idPlan
        FROM dbo.p_PlanesTrabajo pt
        WHERE pt.idUsuario = @idUsuario AND pt.mes = @mes AND pt.anio = @anio;
    END

    IF (@idPlan IS NULL)
    BEGIN
        SELECT NULL as idPlan;
        RETURN;
    END

    SELECT * FROM dbo.p_PlanesTrabajo WHERE idPlan = @idPlan;

    SELECT t.*, p.nombre as proyectoNombre, p.tipo as proyectoTipo
    FROM dbo.p_Tareas t
    LEFT JOIN dbo.p_Proyectos p ON t.idProyecto = p.idProyecto
    WHERE t.idPlan = @idPlan
    ORDER BY t.orden ASC
    OPTION (RECOMPILE);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Planning_ObtenerPlanes_test]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/*--------------------------------------------------------------*/
CREATE   PROCEDURE [dbo].[sp_Planning_ObtenerPlanes_test]
    @carnet NVARCHAR(50),
    @mes INT,
    @anio INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idUsuario INT = NULL;
    SELECT TOP (1) @idUsuario = u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.carnet = @carnet;

    DECLARE @idPlan INT = NULL;

    SELECT TOP (1) @idPlan = pt.idPlan
    FROM dbo.p_PlanesTrabajo pt
    WHERE pt.carnet = @carnet AND pt.mes = @mes AND pt.anio = @anio;

    IF (@idPlan IS NULL AND @idUsuario IS NOT NULL)
    BEGIN
        SELECT TOP (1) @idPlan = pt.idPlan
        FROM dbo.p_PlanesTrabajo pt
        WHERE pt.idUsuario = @idUsuario AND pt.mes = @mes AND pt.anio = @anio;
    END

    IF (@idPlan IS NULL)
    BEGIN
        SELECT NULL as idPlan;
        RETURN;
    END

    SELECT * FROM dbo.p_PlanesTrabajo WHERE idPlan = @idPlan;

    SELECT t.*, p.nombre as proyectoNombre, p.tipo as proyectoTipo
    FROM dbo.p_Tareas t
    LEFT JOIN dbo.p_Proyectos p ON t.idProyecto = p.idProyecto
    WHERE t.idPlan = @idPlan
    ORDER BY t.orden ASC
    OPTION (RECOMPILE);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Planning_ObtenerProyectosAsignados]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Planning_ObtenerProyectosAsignados]
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- Using a CTE for progress to avoid repeated subquery for each project
    WITH ProgresoCTE AS (
        SELECT 
            t.idProyecto,
            AVG(CAST(CASE WHEN t.estado = 'Hecha' THEN 100 ELSE ISNULL(t.porcentaje, 0) END AS FLOAT)) as progreso
        FROM p_Tareas t
        WHERE t.activo = 1 
          AND t.idTareaPadre IS NULL
          AND t.estado NOT IN ('Descartada', 'Eliminada')
        GROUP BY t.idProyecto
    )
    SELECT DISTINCT
        p.idProyecto,
        p.nombre,
        p.estado,
        p.tipo,
        p.gerencia,
        p.subgerencia,
        p.area,
        p.fechaInicio,
        p.fechaFin,
        progresoProyecto = ISNULL(pcte.progreso, 0)
    FROM p_Proyectos p
    INNER JOIN p_Tareas t ON p.idProyecto = t.idProyecto
    INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    LEFT JOIN ProgresoCTE pcte ON p.idProyecto = pcte.idProyecto
    WHERE ta.carnet = @carnet
      AND t.activo = 1
      AND p.estado = 'Activo'
    ORDER BY p.fechaFin ASC;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Planning_ObtenerProyectosAsignados_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Planning_ObtenerProyectosAsignados_rust]
    @carnet nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Planning_ObtenerProyectosAsignados @carnet;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Proyecto_Eliminar_V2]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ========================================================
-- MIGRACIÓN CLARITY: ELIMINACIÓN SEGURA DE PROYECTOS V4
-- Fecha: 2026-01-28
-- Corrección: Manejo de SolicitudesCambio, Jerarquía Dual (idPadre/idTareaPadre)
-- ========================================================

CREATE   PROCEDURE [dbo].[sp_Proyecto_Eliminar_V2]
    @idProyecto INT,
    @forceCascade BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @fechaCreacion DATE;
    DECLARE @nombreProyecto NVARCHAR(200);
    
    SELECT @fechaCreacion = CAST(fechaCreacion AS DATE), @nombreProyecto = nombre 
    FROM p_Proyectos WHERE idProyecto = @idProyecto;

    IF @fechaCreacion IS NULL
    BEGIN
        -- Idempotente: si no existe, terminar con éxito
        RETURN;
    END

    -- Regla de Negocio: 
    -- 1. Si se creó hoy, se permite borrado completo (fue un error de captura).
    -- 2. Si es de días anteriores, solo se permite si no tiene tareas activas O si se fuerza la cascada.
    
    DECLARE @esHoy BIT = 0;
    IF @fechaCreacion = CAST(GETDATE() AS DATE) SET @esHoy = 1;

    IF @esHoy = 0 AND @forceCascade = 0
    BEGIN
        -- Verificar si tiene tareas activas
        IF EXISTS (SELECT 1 FROM p_Tareas WHERE idProyecto = @idProyecto AND activo = 1)
        BEGIN
            RAISERROR('El proyecto "%s" tiene tareas activas y no fue creado el día de hoy. Borre las tareas primero o use forceCascade=1 para limpieza total.', 16, 1, @nombreProyecto);
            RETURN;
        END
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        -- Obtener lista de tareas a eliminar
        DECLARE @tareas TABLE (idTarea INT);
        INSERT INTO @tareas (idTarea)
        SELECT idTarea FROM p_Tareas WHERE idProyecto = @idProyecto;

        -- 1. Solicitudes de Cambio
        DELETE FROM p_SolicitudesCambio WHERE idTarea IN (SELECT idTarea FROM @tareas);

        -- 2. CheckinTareas
        DELETE FROM p_CheckinTareas WHERE idTarea IN (SELECT idTarea FROM @tareas);

        -- 3. TareaAvances
        DELETE FROM p_TareaAvances WHERE idTarea IN (SELECT idTarea FROM @tareas);

        -- 4. Bloqueos
        DELETE FROM p_Bloqueos WHERE idTarea IN (SELECT idTarea FROM @tareas);

        -- 5. TareaAsignados
        DELETE FROM p_TareaAsignados WHERE idTarea IN (SELECT idTarea FROM @tareas);

        -- 6. Recurrencia e Instancias
        DELETE FROM p_TareaInstancia WHERE idTarea IN (SELECT idTarea FROM @tareas);
        DELETE FROM p_TareaRecurrencia WHERE idTarea IN (SELECT idTarea FROM @tareas);

        -- 7. Romper jerarquía de tareas internas (ambas columnas legacy y nuevas)
        UPDATE p_Tareas SET idTareaPadre = NULL, idPadre = NULL WHERE idProyecto = @idProyecto;

        -- 8. Tareas
        DELETE FROM p_Tareas WHERE idProyecto = @idProyecto;

        -- 9. Finalmente, el Proyecto
        DELETE FROM p_Proyectos WHERE idProyecto = @idProyecto;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Proyecto_Listar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Proyecto_Listar_rust]
    @carnet NVARCHAR(50) = NULL,
    @nombre NVARCHAR(100) = NULL,
    @estado NVARCHAR(50) = NULL,
    @gerencia NVARCHAR(100) = NULL,
    @subgerencia NVARCHAR(100) = NULL,
    @area NVARCHAR(100) = NULL,
    @tipo NVARCHAR(50) = NULL,
    @pageNumber INT = 1,
    @pageSize INT = 2000
AS
BEGIN
    SET NOCOUNT ON;
    -- Si el carnet es Admin, usamos sp_Proyectos_Listar (Admin)
    -- Si no, usamos sp_ObtenerProyectos (Usuario)
    DECLARE @idRol INT;
    SELECT @idRol = idRol FROM p_Usuarios WHERE carnet = @carnet;

    IF @idRol = 1 -- Admin
    BEGIN
        EXEC dbo.sp_Proyectos_Listar @nombre, @estado, @gerencia, @subgerencia, @area, @tipo, @pageNumber, @pageSize;
    END
    ELSE
    BEGIN
        EXEC dbo.sp_ObtenerProyectos @carnet, @nombre, @estado;
    END
END;

GO
/****** Object:  StoredProcedure [dbo].[sp_Proyecto_ObtenerDetalle_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Proyecto_ObtenerDetalle_rust]
    @idProyecto INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        p.*,
        responsableNombre = uR.nombre,
        creadorNombre = COALESCE(uC.nombre, uC2.nombre),
        porcentaje = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t2.estado = 'Hecha' THEN 100 ELSE ISNULL(t2.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        totalTareas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        tareasCompletadas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado = 'Hecha'
        ), 0)
    FROM p_Proyectos p
    LEFT JOIN p_Usuarios uR ON p.responsableCarnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON p.idCreador = uC.idUsuario
    LEFT JOIN p_Usuarios uC2 ON p.creadorCarnet = uC2.carnet AND p.idCreador IS NULL
    WHERE p.idProyecto = @idProyecto;
END;

GO
/****** Object:  StoredProcedure [dbo].[sp_Proyecto_ObtenerVisibles]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

-- 2. Actualizar sp_Proyecto_ObtenerVisibles (JerarquÃ­a)
CREATE   PROCEDURE [dbo].[sp_Proyecto_ObtenerVisibles]
    @idUsuario INT,
    @idsEquipo dbo.TVP_IntList READONLY, 
    @nombre    NVARCHAR(100) = NULL,
    @estado    NVARCHAR(50) = NULL,
    @gerencia  NVARCHAR(100) = NULL,
    @area      NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT 
        p.*,
        responsableNombre = uR.nombre,
        creadorNombre = COALESCE(uC.nombre, uC2.nombre),
        porcentaje = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t2.estado = 'Hecha' THEN 100 ELSE ISNULL(t2.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        totalTareas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        tareasCompletadas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t2
            WHERE t2.idProyecto = p.idProyecto 
              AND t2.idTareaPadre IS NULL 
              AND t2.activo = 1
              AND t2.estado = 'Hecha'
        ), 0)
    FROM dbo.p_Proyectos p
    LEFT JOIN p_Usuarios uR ON p.responsableCarnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON p.idCreador = uC.idUsuario
    LEFT JOIN p_Usuarios uC2 ON p.creadorCarnet = uC2.carnet AND p.idCreador IS NULL
    WHERE 
        (
            p.idCreador = @idUsuario  -- Es mi proyecto
            OR EXISTS (   -- Alguien de mi equipo fue asignado a una tarea de este proyecto
                SELECT 1
                FROM dbo.p_Tareas t
                INNER JOIN dbo.p_TareaAsignados ta ON ta.idTarea = t.idTarea
                INNER JOIN @idsEquipo team ON team.Id = ta.idUsuario
                WHERE t.idProyecto = p.idProyecto
            )
            OR EXISTS (  -- Yo o alguien de mi equipo es colaborador explÃ­cito del proyecto
                SELECT 1
                FROM dbo.p_ProyectoColaboradores pc
                INNER JOIN @idsEquipo team ON team.Id = pc.idUsuario
                WHERE pc.idProyecto = p.idProyecto AND pc.activo = 1 AND (pc.fechaExpiracion IS NULL OR pc.fechaExpiracion > GETDATE())
            )
            OR EXISTS (  -- Yo soy colaborador explÃ­cito
                SELECT 1 
                FROM dbo.p_ProyectoColaboradores pc
                WHERE pc.idProyecto = p.idProyecto AND pc.idUsuario = @idUsuario AND pc.activo = 1 AND (pc.fechaExpiracion IS NULL OR pc.fechaExpiracion > GETDATE())
            )
        )
        AND (@nombre IS NULL OR p.nombre LIKE '%' + @nombre + '%')
        AND (@estado IS NULL OR p.estado = @estado)
        AND (@gerencia IS NULL OR p.gerencia = @gerencia)
        AND (@area IS NULL OR p.area = @area)
    ORDER BY p.fechaCreacion DESC;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_ProyectoColaboradores_Actualizar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- 5. SP sp_ProyectoColaboradores_Actualizar
CREATE   PROCEDURE [dbo].[sp_ProyectoColaboradores_Actualizar]
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
/****** Object:  StoredProcedure [dbo].[sp_ProyectoColaboradores_Actualizar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_ProyectoColaboradores_Actualizar_rust]
    @idProyecto int = NULL,
    @idUsuario int = NULL,
    @rolColaboracion nvarchar(50) = NULL,
    @permisosCustom nvarchar(MAX) = NULL,
    @fechaExpiracion datetime = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ProyectoColaboradores_Actualizar @idProyecto, @idUsuario, @rolColaboracion, @permisosCustom, @fechaExpiracion;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_ProyectoColaboradores_Invitar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- 4. SP sp_ProyectoColaboradores_Invitar
CREATE   PROCEDURE [dbo].[sp_ProyectoColaboradores_Invitar]
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
/****** Object:  StoredProcedure [dbo].[sp_ProyectoColaboradores_Invitar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_ProyectoColaboradores_Invitar_rust]
    @idProyecto int = NULL,
    @idUsuario int = NULL,
    @rolColaboracion nvarchar(50) = NULL,
    @invitadoPor int = NULL,
    @fechaExpiracion datetime = NULL,
    @notas nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ProyectoColaboradores_Invitar @idProyecto, @idUsuario, @rolColaboracion, @invitadoPor, @fechaExpiracion, @notas;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_ProyectoColaboradores_LimpiarExpirados]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- 8. SP sp_ProyectoColaboradores_LimpiarExpirados
CREATE   PROCEDURE [dbo].[sp_ProyectoColaboradores_LimpiarExpirados]
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
/****** Object:  StoredProcedure [dbo].[sp_ProyectoColaboradores_Listar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- 3. SP sp_ProyectoColaboradores_Listar
CREATE   PROCEDURE [dbo].[sp_ProyectoColaboradores_Listar]
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
/****** Object:  StoredProcedure [dbo].[sp_ProyectoColaboradores_Listar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_ProyectoColaboradores_Listar_rust]
    @idProyecto int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ProyectoColaboradores_Listar @idProyecto;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_ProyectoColaboradores_Revocar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- 6. SP sp_ProyectoColaboradores_Revocar
CREATE   PROCEDURE [dbo].[sp_ProyectoColaboradores_Revocar]
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
/****** Object:  StoredProcedure [dbo].[sp_ProyectoColaboradores_Revocar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_ProyectoColaboradores_Revocar_rust]
    @idProyecto int = NULL,
    @idUsuario int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_ProyectoColaboradores_Revocar @idProyecto, @idUsuario;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_ProyectoColaboradores_VerificarPermiso]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- 7. SP sp_ProyectoColaboradores_VerificarPermiso
CREATE   PROCEDURE [dbo].[sp_ProyectoColaboradores_VerificarPermiso]
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
/****** Object:  StoredProcedure [dbo].[sp_Proyectos_Gestion]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Proyectos_Gestion]
    @Accion NVARCHAR(50),
    @idProyecto INT = NULL,
    @nombre NVARCHAR(255) = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @idNodoDuenio INT = NULL,
    @area NVARCHAR(255) = NULL,
    @subgerencia NVARCHAR(255) = NULL,
    @gerencia NVARCHAR(255) = NULL,
    @fechaInicio DATETIME = NULL,
    @fechaFin DATETIME = NULL,
    @idCreador INT = NULL,
    @creadorCarnet NVARCHAR(50) = NULL,
    @responsableCarnet NVARCHAR(50) = NULL,
    @tipo NVARCHAR(100) = NULL,
    @estado NVARCHAR(50) = NULL,
    @UpdatesJSON NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        IF @Accion = 'CREAR'
        BEGIN
            INSERT INTO p_Proyectos (nombre, descripcion, idNodoDuenio, area, subgerencia, gerencia, fechaInicio, fechaFin, fechaCreacion, idCreador, creadorCarnet, responsableCarnet, estado, tipo)
            OUTPUT INSERTED.idProyecto
            VALUES (@nombre, @descripcion, @idNodoDuenio, @area, @subgerencia, @gerencia, @fechaInicio, @fechaFin, GETDATE(), @idCreador, @creadorCarnet, @responsableCarnet, ISNULL(@estado, 'Activo'), ISNULL(@tipo, 'administrativo'));
            
            RETURN;
        END

        IF @Accion = 'ACTUALIZAR'
        BEGIN
            -- Actualizaciones dinÃ¡micas vÃ­a JSON para no perder la capacidad de setear un campo a NULL
            -- Si un campo existe en el JSON, se actualiza (incluso a null). Si no existe, no se toca.
            IF @UpdatesJSON IS NOT NULL
            BEGIN
                UPDATE p_Proyectos
                SET 
                    nombre = CASE WHEN JSON_QUERY(@UpdatesJSON, '$.nombre') IS NOT NULL OR JSON_VALUE(@UpdatesJSON, '$.nombre') IS NOT NULL THEN JSON_VALUE(@UpdatesJSON, '$.nombre') ELSE nombre END,
                    descripcion = CASE WHEN JSON_QUERY(@UpdatesJSON, '$.descripcion') IS NOT NULL OR JSON_VALUE(@UpdatesJSON, '$.descripcion') IS NOT NULL THEN JSON_VALUE(@UpdatesJSON, '$.descripcion') ELSE descripcion END,
                    idNodoDuenio = CASE WHEN JSON_QUERY(@UpdatesJSON, '$.idNodoDuenio') IS NOT NULL OR JSON_VALUE(@UpdatesJSON, '$.idNodoDuenio') IS NOT NULL THEN CAST(JSON_VALUE(@UpdatesJSON, '$.idNodoDuenio') AS INT) ELSE idNodoDuenio END,
                    area = CASE WHEN JSON_QUERY(@UpdatesJSON, '$.area') IS NOT NULL OR JSON_VALUE(@UpdatesJSON, '$.area') IS NOT NULL THEN JSON_VALUE(@UpdatesJSON, '$.area') ELSE area END,
                    subgerencia = CASE WHEN JSON_QUERY(@UpdatesJSON, '$.subgerencia') IS NOT NULL OR JSON_VALUE(@UpdatesJSON, '$.subgerencia') IS NOT NULL THEN JSON_VALUE(@UpdatesJSON, '$.subgerencia') ELSE subgerencia END,
                    gerencia = CASE WHEN JSON_QUERY(@UpdatesJSON, '$.gerencia') IS NOT NULL OR JSON_VALUE(@UpdatesJSON, '$.gerencia') IS NOT NULL THEN JSON_VALUE(@UpdatesJSON, '$.gerencia') ELSE gerencia END,
                    fechaInicio = CASE WHEN JSON_QUERY(@UpdatesJSON, '$.fechaInicio') IS NOT NULL OR JSON_VALUE(@UpdatesJSON, '$.fechaInicio') IS NOT NULL THEN CAST(JSON_VALUE(@UpdatesJSON, '$.fechaInicio') AS DATETIME) ELSE fechaInicio END,
                    fechaFin = CASE WHEN JSON_QUERY(@UpdatesJSON, '$.fechaFin') IS NOT NULL OR JSON_VALUE(@UpdatesJSON, '$.fechaFin') IS NOT NULL THEN CAST(JSON_VALUE(@UpdatesJSON, '$.fechaFin') AS DATETIME) ELSE fechaFin END,
                    tipo = CASE WHEN JSON_QUERY(@UpdatesJSON, '$.tipo') IS NOT NULL OR JSON_VALUE(@UpdatesJSON, '$.tipo') IS NOT NULL THEN JSON_VALUE(@UpdatesJSON, '$.tipo') ELSE tipo END,
                    estado = CASE WHEN JSON_QUERY(@UpdatesJSON, '$.estado') IS NOT NULL OR JSON_VALUE(@UpdatesJSON, '$.estado') IS NOT NULL THEN JSON_VALUE(@UpdatesJSON, '$.estado') ELSE estado END
                WHERE idProyecto = @idProyecto;
            END

            RETURN;
        END

        IF @Accion = 'ELIMINAR'
        BEGIN
            -- Eliminar es Soft Delete (estado = Cancelado)
            UPDATE p_Proyectos 
            SET estado = 'Cancelado'
            WHERE idProyecto = @idProyecto;

            RETURN;
        END

        IF @Accion = 'RESTAURAR'
        BEGIN
            UPDATE p_Proyectos 
            SET estado = 'Activo'
            WHERE idProyecto = @idProyecto;

            RETURN;
        END
        
        ;THROW 51000, 'Accion no reconocida en sp_Proyectos_Gestion', 1;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();

        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Proyectos_Gestion_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Proyectos_Gestion_rust]
    @Accion nvarchar(50) = NULL,
    @idProyecto int = NULL,
    @nombre nvarchar(255) = NULL,
    @descripcion nvarchar(MAX) = NULL,
    @idNodoDuenio int = NULL,
    @area nvarchar(255) = NULL,
    @subgerencia nvarchar(255) = NULL,
    @gerencia nvarchar(255) = NULL,
    @fechaInicio datetime = NULL,
    @fechaFin datetime = NULL,
    @idCreador int = NULL,
    @creadorCarnet nvarchar(50) = NULL,
    @responsableCarnet nvarchar(50) = NULL,
    @tipo nvarchar(100) = NULL,
    @estado nvarchar(50) = NULL,
    @UpdatesJSON nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Proyectos_Gestion @Accion, @idProyecto, @nombre, @descripcion, @idNodoDuenio, @area, @subgerencia, @gerencia, @fechaInicio, @fechaFin, @idCreador, @creadorCarnet, @responsableCarnet, @tipo, @estado, @UpdatesJSON;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Proyectos_Listar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- 1. Actualizar sp_Proyectos_Listar (Admin)
CREATE   PROCEDURE [dbo].[sp_Proyectos_Listar]
    @nombre NVARCHAR(100) = NULL,
    @estado NVARCHAR(50) = NULL,
    @gerencia NVARCHAR(100) = NULL,
    @subgerencia NVARCHAR(100) = NULL,
    @area NVARCHAR(100) = NULL,
    @tipo NVARCHAR(50) = NULL,
    @pageNumber INT = 1,
    @pageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @offset INT = (@pageNumber - 1) * @pageSize;

    SELECT 
        p.idProyecto, p.nombre, p.descripcion, p.estado, p.prioridad, 
        p.fechaInicio, p.fechaFin, p.fechaCreacion, p.area, p.gerencia, p.subgerencia, 
        p.responsableCarnet, 
        responsableNombre = uR.nombre,
        p.creadorCarnet,
        creadorNombre = COALESCE(uC.nombre, uC2.nombre),
        p.tipo,
        p.modoVisibilidad,
        porcentaje = ISNULL((
            SELECT ROUND(AVG(CAST(CASE WHEN t.estado = 'Hecha' THEN 100 ELSE ISNULL(t.porcentaje, 0) END AS FLOAT)), 0)
            FROM p_Tareas t
            WHERE t.idProyecto = p.idProyecto 
              AND t.idTareaPadre IS NULL 
              AND t.activo = 1
              AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        totalTareas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t
            WHERE t.idProyecto = p.idProyecto 
              AND t.idTareaPadre IS NULL 
              AND t.activo = 1
              AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
        ), 0),
        tareasCompletadas = ISNULL((
            SELECT COUNT(*)
            FROM p_Tareas t
            WHERE t.idProyecto = p.idProyecto 
              AND t.idTareaPadre IS NULL 
              AND t.activo = 1
              AND t.estado = 'Hecha'
        ), 0)
    FROM p_Proyectos p
    LEFT JOIN p_Usuarios uR ON p.responsableCarnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON p.idCreador = uC.idUsuario
    LEFT JOIN p_Usuarios uC2 ON p.creadorCarnet = uC2.carnet AND p.idCreador IS NULL
    WHERE 
        (@nombre IS NULL OR p.nombre LIKE '%' + @nombre + '%')
        AND (@estado IS NULL OR p.estado = @estado)
        AND (@gerencia IS NULL OR p.gerencia = @gerencia)
        AND (@subgerencia IS NULL OR p.subgerencia = @subgerencia)
        AND (@area IS NULL OR p.area = @area)
        AND (@tipo IS NULL OR p.tipo = @tipo)
    ORDER BY p.fechaCreacion DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    OPTION (RECOMPILE);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Proyectos_Listar_test]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/*--------------------------------------------------------------*/
CREATE   PROCEDURE [dbo].[sp_Proyectos_Listar_test]
    @nombre NVARCHAR(100) = NULL,
    @estado NVARCHAR(50) = NULL,
    @gerencia NVARCHAR(100) = NULL,
    @subgerencia NVARCHAR(100) = NULL,
    @area NVARCHAR(100) = NULL,
    @tipo NVARCHAR(50) = NULL,
    @pageNumber INT = 1,
    @pageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @offset INT = (@pageNumber - 1) * @pageSize;

    SELECT
        p.idProyecto,
        p.nombre,
        p.descripcion,
        p.estado,
        p.prioridad,
        p.fechaInicio,
        p.fechaFin,
        p.fechaCreacion,
        p.area,
        p.gerencia,
        p.subgerencia,
        p.responsableCarnet,
        p.creadorCarnet,
        p.tipo,
        porcentaje = (
            SELECT AVG(CAST(t.porcentaje AS FLOAT))
            FROM dbo.p_Tareas t
            WHERE t.idProyecto = p.idProyecto
              AND t.activo = 1
        )
    FROM dbo.p_Proyectos p
    WHERE (@nombre IS NULL OR p.nombre LIKE N'%' + @nombre + N'%')
      AND (@estado IS NULL OR p.estado = @estado)
      AND (@gerencia IS NULL OR p.gerencia = @gerencia)
      AND (@subgerencia IS NULL OR p.subgerencia = @subgerencia)
      AND (@area IS NULL OR p.area = @area)
      AND (@tipo IS NULL OR p.tipo = @tipo)
    ORDER BY p.fechaCreacion DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    OPTION (RECOMPILE);
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_Actualizar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Tarea_Actualizar_rust]
    @idTarea INT,
    @titulo NVARCHAR(200) = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @estado NVARCHAR(50) = NULL,
    @prioridad NVARCHAR(50) = NULL,
    @progreso INT = NULL,
    @idProyecto INT = NULL,
    @idResponsable INT = NULL,
    @fechaObjetivo DATETIME = NULL,
    @fechaInicioPlanificada DATETIME = NULL,
    @linkEvidencia NVARCHAR(MAX) = NULL,
    @idTareaPadre INT = NULL,
    @tipo NVARCHAR(50) = NULL,
    @esfuerzo NVARCHAR(50) = NULL,
    @comportamiento NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE p_Tareas
    SET nombre = ISNULL(@titulo, nombre),
        descripcion = ISNULL(@descripcion, descripcion),
        estado = ISNULL(@estado, estado),
        prioridad = ISNULL(@prioridad, prioridad),
        porcentaje = ISNULL(@progreso, porcentaje),
        idProyecto = ISNULL(NULLIF(@idProyecto, 0), idProyecto),
        fechaObjetivo = ISNULL(@fechaObjetivo, fechaObjetivo),
        fechaInicioPlanificada = ISNULL(@fechaInicioPlanificada, fechaInicioPlanificada),
        linkEvidencia = ISNULL(@linkEvidencia, linkEvidencia),
        idTareaPadre = ISNULL(NULLIF(@idTareaPadre, 0), idTareaPadre),
        tipoTarea = ISNULL(@tipo, tipoTarea),
        esfuerzo = ISNULL(@esfuerzo, esfuerzo),
        comportamiento = ISNULL(@comportamiento, comportamiento),
        fechaActualizacion = GETDATE()
    WHERE idTarea = @idTarea;

    IF @idResponsable IS NOT NULL AND @idResponsable > 0
    BEGIN
        DELETE FROM p_TareaAsignados WHERE idTarea = @idTarea AND tipo = 'Responsable';
        INSERT INTO p_TareaAsignados (idTarea, idUsuario, tipo, carnet, fechaAsignacion)
        SELECT @idTarea, idUsuario, 'Responsable', carnet, GETDATE() FROM p_Usuarios WHERE idUsuario = @idResponsable;
    END
END;

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_AgregarColaborador]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE   PROCEDURE [dbo].[sp_Tarea_AgregarColaborador] (
    @idTarea INT,
    @idUsuario INT
) AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @carnet NVARCHAR(50);
    SELECT @carnet = carnet FROM dbo.p_Usuarios WHERE idUsuario = @idUsuario;
    
    IF NOT EXISTS(SELECT 1 FROM dbo.p_TareaAsignados WHERE idTarea = @idTarea AND idUsuario = @idUsuario)
    BEGIN
        INSERT INTO dbo.p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion, esResponsable)
        VALUES (@idTarea, @idUsuario, @carnet, 'Colaborador', GETDATE(), 0);
    END
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_AsignarResponsable]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 2. SP para Asignar Responsable (Usa Carnet)
CREATE   PROCEDURE [dbo].[sp_Tarea_AsignarResponsable]
    @idTarea INT,
    @carnetUsuario NVARCHAR(50),
    @tipo NVARCHAR(20) = 'Responsable',
    @esReasignacion BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Necesitamos el ID para mantener integridad FK si la columna idUsuario es NOT NULL
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM p_Usuarios WHERE carnet = @carnetUsuario;
    
    IF @idUsuario IS NULL RETURN;

    IF @esReasignacion = 1
    BEGIN
        DELETE FROM p_TareaAsignados WHERE idTarea = @idTarea AND tipo = 'Responsable';
    END

    IF NOT EXISTS (SELECT 1 FROM p_TareaAsignados WHERE idTarea = @idTarea AND carnet = @carnetUsuario)
    BEGIN
        -- Insertamos TANTO el ID como el CARNET para mantener consistencia
        INSERT INTO p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
        VALUES (@idTarea, @idUsuario, @carnetUsuario, @tipo, GETDATE());
    END
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_AsignarResponsable_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Tarea_AsignarResponsable_rust]
    @idTarea int = NULL,
    @carnetUsuario nvarchar(50) = NULL,
    @tipo nvarchar(20) = NULL,
    @esReasignacion bit = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_AsignarResponsable @idTarea, @carnetUsuario, @tipo, @esReasignacion;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_Bloquear]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- =============================================
-- MIGRACIÓN CLARITY: PAQUETE 2 (CORREGIDO V2 - CAMPOS CARNET NATIVOS)
-- Fecha: 2026-01-25
-- =============================================

-- 4. SP para Bloquear Tarea
CREATE   PROCEDURE [dbo].[sp_Tarea_Bloquear]
    @idTarea INT,
    @carnetOrigen NVARCHAR(50),
    @carnetDestino NVARCHAR(50) = NULL,
    @motivo NVARCHAR(255),
    @destinoTexto NVARCHAR(255) = NULL,
    @accionMitigacion NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @idOrigen INT, @idDestino INT;
    SELECT @idOrigen = idUsuario FROM p_Usuarios WHERE carnet = @carnetOrigen;
    
    IF @carnetDestino IS NOT NULL
        SELECT @idDestino = idUsuario FROM p_Usuarios WHERE carnet = @carnetDestino;

    IF @idOrigen IS NULL RETURN; 

    IF EXISTS (SELECT 1 FROM p_Bloqueos WHERE idTarea = @idTarea AND estado != 'Resuelto')
    BEGIN
        SELECT idBloqueo, 1 as yaExistia FROM p_Bloqueos WHERE idTarea = @idTarea AND estado != 'Resuelto';
        RETURN;
    END

    -- Insert
    INSERT INTO p_Bloqueos(idTarea, idOrigenUsuario, idDestinoUsuario, destinoTexto, motivo, accionMitigacion, creadoEn, estado)
    VALUES(@idTarea, @idOrigen, @idDestino, @destinoTexto, @motivo, @accionMitigacion, GETDATE(), 'Activo');

    UPDATE p_Tareas SET estado = 'Bloqueada' WHERE idTarea = @idTarea;
    SELECT SCOPE_IDENTITY() as idBloqueo, 0 as yaExistia;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_Bloquear_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Tarea_Bloquear_rust]
    @idTarea int = NULL,
    @carnetOrigen nvarchar(50) = NULL,
    @carnetDestino nvarchar(50) = NULL,
    @motivo nvarchar(255) = NULL,
    @destinoTexto nvarchar(255) = NULL,
    @accionMitigacion nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_Bloquear @idTarea, @carnetOrigen, @carnetDestino, @motivo, @destinoTexto, @accionMitigacion;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_Clonar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

      CREATE   PROCEDURE [dbo].[sp_Tarea_Clonar]
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
    
GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_Clonar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Tarea_Clonar_rust]
    @idTareaFuente int = NULL,
    @ejecutorCarnet nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_Clonar @idTareaFuente, @ejecutorCarnet;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_Crear]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sp_Tarea_Crear]
    @nombre NVARCHAR(200),
    @idUsuario INT,
    @idProyecto INT = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @estado NVARCHAR(50) = 'Pendiente',
    @prioridad NVARCHAR(50) = 'Media',
    @esfuerzo NVARCHAR(20) = NULL,
    @tipo NVARCHAR(50) = 'Administrativa',
    @fechaInicioPlanificada DATETIME = NULL,
    @fechaObjetivo DATETIME = NULL,
    @porcentaje INT = 0,
    @orden INT = 0
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO p_Tareas (
        nombre, idCreador, idProyecto, descripcion, estado, prioridad, esfuerzo, tipo,
        fechaInicioPlanificada, fechaObjetivo, porcentaje, orden, fechaCreacion, fechaActualizacion
    )
    VALUES (
        @nombre, @idUsuario, @idProyecto, @descripcion, @estado, @prioridad, @esfuerzo, @tipo,
        @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden, GETDATE(), GETDATE()
    );

    SELECT SCOPE_IDENTITY() AS idTarea;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_Crear_Carnet]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 3.2 sp_Tarea_Crear_Carnet
CREATE   PROCEDURE [dbo].[sp_Tarea_Crear_Carnet]
(
    @creadorCarnet NVARCHAR(50),
    @titulo NVARCHAR(255),
    @descripcion NVARCHAR(MAX) = NULL,
    @idProyecto INT = NULL,
    @prioridad NVARCHAR(50) = 'Media',
    @fechaObjetivo DATETIME = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idUsuario INT;
    SELECT @idUsuario = idUsuario FROM dbo.p_Usuarios WHERE carnet = @creadorCarnet;

    IF @idUsuario IS NULL THROW 50001, 'Creador no encontrado.', 1;

    INSERT INTO dbo.p_Tareas(
        nombre, descripcion, idProyecto, 
        idCreador, creadorCarnet, 
        prioridad, fechaObjetivo, 
        estado, fechaCreacion, activo
    )
    VALUES(
        @titulo, @descripcion, @idProyecto,
        @idUsuario, @creadorCarnet,
        @prioridad, ISNULL(@fechaObjetivo, GETDATE()),
        'Pendiente', GETDATE(), 1
    );

    SELECT SCOPE_IDENTITY() as idTarea;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_Crear_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Tarea_Crear_rust]
    @nombre nvarchar(200) = NULL,
    @idUsuario int = NULL,
    @idProyecto int = NULL,
    @descripcion nvarchar(MAX) = NULL,
    @estado nvarchar(50) = NULL,
    @prioridad nvarchar(50) = NULL,
    @esfuerzo nvarchar(20) = NULL,
    @tipo nvarchar(50) = NULL,
    @fechaInicioPlanificada datetime = NULL,
    @fechaObjetivo datetime = NULL,
    @porcentaje int = NULL,
    @orden int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_Crear @nombre, @idUsuario, @idProyecto, @descripcion, @estado, @prioridad, @esfuerzo, @tipo, @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_CrearCompleta]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 3. Actualizar la versiÃ³n legacy por si acaso
CREATE   PROCEDURE [dbo].[sp_Tarea_CrearCompleta]
(
    @nombre NVARCHAR(255),
    @idUsuario INT,
    @idProyecto INT = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @estado NVARCHAR(50) = 'Pendiente',
    @prioridad NVARCHAR(50) = 'Media',
    @esfuerzo NVARCHAR(50) = NULL,
    @tipo NVARCHAR(50) = 'Administrativa',
    @fechaInicioPlanificada DATETIME = NULL,
    @fechaObjetivo DATETIME = NULL,
    @porcentaje INT = 0,
    @orden INT = 0,
    @comportamiento NVARCHAR(50) = NULL,
    @idTareaPadre INT = NULL,
    @idResponsable INT = NULL,
    @requiereEvidencia BIT = 0,
    @idEntregable INT = NULL
)
AS
BEGIN
    -- Llamar a la v2 para centralizar lÃ³gica
    EXEC dbo.sp_Tarea_CrearCompleta_v2 
        @nombre, @idUsuario, @idProyecto, @descripcion, @idTareaPadre, @idResponsable,
        @estado, @prioridad, @esfuerzo, @tipo, @fechaInicioPlanificada, @fechaObjetivo,
        @porcentaje, @orden, @comportamiento, @requiereEvidencia, @idEntregable;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_CrearCompleta_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Tarea_CrearCompleta_rust]
    @nombre nvarchar(255) = NULL,
    @idUsuario int = NULL,
    @idProyecto int = NULL,
    @descripcion nvarchar(MAX) = NULL,
    @idTareaPadre int = NULL,
    @idResponsable int = NULL,
    @estado nvarchar(50) = NULL,
    @prioridad nvarchar(50) = NULL,
    @esfuerzo nvarchar(50) = NULL,
    @tipo nvarchar(50) = NULL,
    @fechaInicioPlanificada datetime = NULL,
    @fechaObjetivo datetime = NULL,
    @porcentaje int = NULL,
    @orden int = NULL,
    @comportamiento nvarchar(50) = NULL,
    @requiereEvidencia bit = NULL,
    @idEntregable int = NULL,
    @semana int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_CrearCompleta_v2 @nombre, @idUsuario, @idProyecto, @descripcion, @idTareaPadre, @idResponsable, @estado, @prioridad, @esfuerzo, @tipo, @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden, @comportamiento, @requiereEvidencia, @idEntregable, @semana;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_CrearCompleta_v2]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 2. Actualizar sp_Tarea_CrearCompleta_v2
CREATE   PROCEDURE [dbo].[sp_Tarea_CrearCompleta_v2]
(
    @nombre NVARCHAR(255),
    @idUsuario INT,
    @idProyecto INT = NULL,
    @descripcion NVARCHAR(MAX) = NULL,
    @idTareaPadre INT = NULL,
    @idResponsable INT = NULL,
    @estado NVARCHAR(50) = 'Pendiente',
    @prioridad NVARCHAR(50) = 'Media',
    @esfuerzo NVARCHAR(50) = NULL,
    @tipo NVARCHAR(50) = 'Administrativa',
    @fechaInicioPlanificada DATETIME = NULL,
    @fechaObjetivo DATETIME = NULL,
    @porcentaje INT = 0,
    @orden INT = 0,
    @comportamiento NVARCHAR(50) = NULL,
    @requiereEvidencia BIT = 0,
    @idEntregable INT = NULL,
    @semana INT = NULL
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;
        
        -- Resolve Responsable Carnet
        DECLARE @responsableCarnet NVARCHAR(50) = NULL;
        IF @idResponsable IS NOT NULL
            SELECT @responsableCarnet = carnet FROM dbo.p_Usuarios WHERE idUsuario = @idResponsable;

        -- Resolve Creator Carnet
        DECLARE @creadorCarnet NVARCHAR(50) = NULL;
        SELECT @creadorCarnet = carnet FROM dbo.p_Usuarios WHERE idUsuario = @idUsuario;

        -- Defaults
        IF @fechaObjetivo IS NULL SET @fechaObjetivo = GETDATE();
        
        -- ValidaciÃ³n %
        IF @porcentaje < 0 OR @porcentaje > 100
             THROW 50020, 'El porcentaje debe estar entre 0 y 100.', 1;

        -- NormalizaciÃ³n Hecha
        IF @estado = 'Hecha' SET @porcentaje = 100;

        -- Validaciones de Padre
        IF @idTareaPadre IS NOT NULL
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM dbo.p_Tareas WHERE idTarea = @idTareaPadre AND activo = 1)
                THROW 50021, 'La tarea padre no existe o no estÃ¡ activa.', 1;
        END

        INSERT INTO dbo.p_Tareas (
            nombre, idCreador, creadorCarnet, idProyecto, descripcion, estado, prioridad, esfuerzo, tipo,
            fechaInicioPlanificada, fechaObjetivo, porcentaje, orden, comportamiento,
            idTareaPadre, requiereEvidencia, idEntregable, fechaCreacion, activo, semana,
            idAsignado, asignadoCarnet
        )
        VALUES (
            @nombre, @idUsuario, @creadorCarnet, @idProyecto, @descripcion, @estado, @prioridad, @esfuerzo, @tipo,
            @fechaInicioPlanificada, @fechaObjetivo, @porcentaje, @orden, @comportamiento,
            @idTareaPadre, @requiereEvidencia, @idEntregable, GETDATE(), 1, @semana,
            @idResponsable, @responsableCarnet
        );

        DECLARE @idTarea INT = SCOPE_IDENTITY();

        -- AsignaciÃ³n Responsable (ALWAYS insert if provided, to ensure visibility in joined views)
        IF @idResponsable IS NOT NULL
        BEGIN
            -- Avoid duplicate assignment if some trigger or other logic already did it
            IF NOT EXISTS (SELECT 1 FROM dbo.p_TareaAsignados WHERE idTarea = @idTarea AND idUsuario = @idResponsable AND tipo = 'Responsable')
            BEGIN
                INSERT INTO dbo.p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
                VALUES (@idTarea, @idResponsable, @responsableCarnet, 'Responsable', GETDATE());
            END
        END

        COMMIT;
        SELECT @idTarea AS idTarea;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_DescartarConSubtareas]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Tarea_DescartarConSubtareas]
    @idTarea INT,
    @carnet   NVARCHAR(100) = NULL,
    @motivo   NVARCHAR(MAX) = 'Descarte manual'
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Iniciar transacción para asegurar atomicidad
    BEGIN TRANSACTION;
    BEGIN TRY
        -- 1. Descartar la tarea principal (Soft Delete)
        UPDATE p_Tareas 
        SET activo = 0, 
            estado = 'Descartada', 
            fechaActualizacion = GETDATE(),
            descripcion = ISNULL(descripcion, '') + CHAR(13) + CHAR(10) + 'Motivo descarte: ' + @motivo
        WHERE idTarea = @idTarea;

        -- 2. Identificar y descartar recursivamente todas las subtareas vivas
        -- Usamos un Common Table Expression (CTE) para navegar el árbol de tareas
        ;WITH Jerarquia AS (
            SELECT idTarea 
            FROM p_Tareas 
            WHERE idTareaPadre = @idTarea
            
            UNION ALL
            
            SELECT t.idTarea 
            FROM p_Tareas t
            INNER JOIN Jerarquia j ON t.idTareaPadre = j.idTarea
        )
        UPDATE p_Tareas
        SET activo = 0,
            estado = 'Descartada',
            fechaActualizacion = GETDATE()
        FROM p_Tareas t
        INNER JOIN Jerarquia j ON t.idTarea = j.idTarea
        WHERE t.activo = 1;

        COMMIT TRANSACTION;
        SELECT 1 as success;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @ErrorMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMsg, 16, 1);
    END CATCH
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_DescartarConSubtareas_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Tarea_DescartarConSubtareas_rust]
    @idTarea int = NULL,
    @carnet nvarchar(100) = NULL,
    @motivo nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_DescartarConSubtareas @idTarea, @carnet, @motivo;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_Eliminar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 3. SP para Eliminar Tarea
CREATE   PROCEDURE [dbo].[sp_Tarea_Eliminar]
    @idTarea INT,
    @carnetSolicitante NVARCHAR(50),
    @motivo NVARCHAR(255) = 'Eliminación manual'
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @carnetCreador NVARCHAR(50);
    DECLARE @fechaCreacion DATETIME;
    DECLARE @idSolicitante INT; 

    -- Obtener usando JOIN a usuarios para estar seguros del creador
    SELECT @carnetCreador = u.carnet, @fechaCreacion = t.fechaCreacion 
    FROM p_Tareas t
    JOIN p_Usuarios u ON t.idCreador = u.idUsuario
    WHERE t.idTarea = @idTarea;
    
    -- Resolver ID sol (para logs de auditoria si piden ID)
    SELECT @idSolicitante = idUsuario FROM p_Usuarios WHERE carnet = @carnetSolicitante;

    IF @carnetCreador IS NULL RETURN; 

    -- SIEMPRE Soft Delete (Inactivación)
    -- Se elimina lógica de borrado físico para preservar historial y auditoría.
    
    UPDATE p_Tareas 
    SET activo = 0,
        deshabilitadoPor = @idSolicitante, -- Mantener ID aqui si la columna es FK int
        fechaDeshabilitacion = GETDATE(),
        motivoDeshabilitacion = @motivo
    WHERE idTarea = @idTarea;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_Eliminar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Tarea_Eliminar_rust]
    @idTarea int = NULL,
    @carnetSolicitante nvarchar(50) = NULL,
    @motivo nvarchar(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_Eliminar @idTarea, @carnetSolicitante, @motivo;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_MoverAProyecto]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Tarea_MoverAProyecto]
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

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_MoverAProyecto_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Tarea_MoverAProyecto_rust]
    @idTarea int = NULL,
    @idProyectoDestino int = NULL,
    @idUsuarioEjecutor int = NULL,
    @moverSubtareas bit = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_MoverAProyecto @idTarea, @idProyectoDestino, @idUsuarioEjecutor, @moverSubtareas;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_ObtenerDetalle_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Tarea_ObtenerDetalle_rust]
    @idTarea INT
AS
BEGIN
    EXEC dbo.sp_Tareas_ObtenerPorId_rust @idTarea;
END;

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_ObtenerHistorico_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Tarea_ObtenerHistorico_rust] 
    @carnet nvarchar(50), 
    @dias INT = 30 
AS 
BEGIN 
    SET NOCOUNT ON; 
    SELECT DISTINCT
        t.idTarea, t.idProyecto,
        t.nombre as titulo,
        t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipoTarea as tipo,
        t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado as fechaHecha,
        t.porcentaje as progreso,
        t.orden, t.idCreador, t.fechaInicioPlanificada,
        t.fechaActualizacion as fechaUltActualizacion,
        p.nombre as proyectoNombre,
        CAST(c.fecha AS DATE) as fechaTrabajada,
        ct.tipo as tipoCheckin,
        COALESCE(c.fecha, t.fechaCreacion) as fechaOrden
    FROM p_Tareas t
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN p_CheckinTareas ct ON t.idTarea = ct.idTarea
    LEFT JOIN p_Checkins c ON ct.idCheckin = c.idCheckin
    WHERE (t.creadorCarnet = @carnet OR ta.carnet = @carnet)
        AND t.activo = 1
        AND (
        c.fecha >= DATEADD(day, -@dias, GETDATE())
        OR t.fechaCreacion >= DATEADD(day, -@dias, GETDATE())
        OR t.fechaCompletado >= DATEADD(day, -@dias, GETDATE())
        )
    ORDER BY fechaOrden DESC; 
END;

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_RecalcularJerarquia_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Tarea_RecalcularJerarquia_rust]
    @idTareaInicio int = NULL,
    @idPadreDirecto int = NULL,
    @maxDepth int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tarea_RecalcularJerarquia_v2 @idTareaInicio, @idPadreDirecto, @maxDepth;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_RecalcularJerarquia_v2]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- =============================================
-- 1. sp_Tarea_RecalcularJerarquia_v2
-- =============================================
CREATE   PROCEDURE [dbo].[sp_Tarea_RecalcularJerarquia_v2]
(
    @idTareaInicio INT = NULL,
    @idPadreDirecto INT = NULL,
    @maxDepth INT = 10
)
AS
BEGIN
    SET NOCOUNT ON;
    
    -- El indice filtrado requiere estas opciones seteadas
    -- SET QUOTED_IDENTIFIER ON (Ya seteado al crear)
    -- SET ANSI_NULLS ON (Ya seteado al crear)
    
    DECLARE @idActual INT;
    DECLARE @nivel INT = 0;
    
    IF @idPadreDirecto IS NOT NULL
        SET @idActual = @idPadreDirecto;
    ELSE
        SELECT @idActual = idTareaPadre FROM dbo.p_Tareas WHERE idTarea = @idTareaInicio;

    -- Si no tiene padre, salir rapido
    IF @idActual IS NULL RETURN;

    -- BEGIN TRY -- Simplificado para debug, reactivar manejo errores completo en prod si se desea, 
    -- pero el core logic es el mismo. Mantenemos estructura original.
    BEGIN TRY
        -- Usar transaccion explicita solo si no hay una activa, o gestionarla con cuidado
        DECLARE @localTran BIT = 0;
        IF @@TRANCOUNT = 0 
        BEGIN
            BEGIN TRAN;
            SET @localTran = 1;
        END

        WHILE @idActual IS NOT NULL AND @nivel < @maxDepth
        BEGIN
             -- 1. Bloquear padre
            DECLARE @idPadreDeActual INT;
            DECLARE @estadoActual NVARCHAR(50);
            DECLARE @porcentajeActual INT;

            SELECT 
                @idPadreDeActual = idTareaPadre,
                @estadoActual = estado,
                @porcentajeActual = porcentaje
            FROM dbo.p_Tareas WITH (UPDLOCK, HOLDLOCK)
            WHERE idTarea = @idActual;

            If @@ROWCOUNT = 0 BREAK; -- Padre borrado o inexistente

            -- 2. Calcular hijos
            DECLARE @total INT = 0;
            DECLARE @sumNorm FLOAT = 0; -- Float para precision
            DECLARE @totalHechas INT = 0;

            -- CTE o Consulta directa
            SELECT 
                @total = COUNT(1),
                @sumNorm = SUM(
                    CASE 
                        WHEN estado = 'Hecha' THEN 100.0
                        ELSE ISNULL(CAST(porcentaje AS FLOAT), 0)
                    END
                ),
                @totalHechas = SUM(CASE WHEN estado = 'Hecha' THEN 1 ELSE 0 END)
            FROM dbo.p_Tareas 
            WHERE idTareaPadre = @idActual
              AND activo = 1 
              AND estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada');

            IF @total = 0 
            BEGIN
                -- Padre sin hijos validos (hijos borrados?). No recalcular.
                SET @idActual = @idPadreDeActual;
                SET @nivel += 1;
                CONTINUE; 
            END

            -- 3. Nuevos valores
            DECLARE @nuevoPromedio INT = ROUND(@sumNorm / @total, 0);
            IF @nuevoPromedio > 100 SET @nuevoPromedio = 100;

            DECLARE @nuevoEstado NVARCHAR(50) = 'Pendiente';
            
            IF @totalHechas = @total 
                SET @nuevoEstado = 'Hecha';
            ELSE IF @sumNorm > 0 OR EXISTS(SELECT 1 FROM dbo.p_Tareas WHERE idTareaPadre = @idActual AND estado = 'EnCurso')
                SET @nuevoEstado = 'EnCurso';

            -- 4. Update
            IF @porcentajeActual <> @nuevoPromedio OR @estadoActual <> @nuevoEstado
            BEGIN
                UPDATE dbo.p_Tareas
                SET porcentaje = @nuevoPromedio,
                    estado = @nuevoEstado
                WHERE idTarea = @idActual;
            END

            -- 5. Subir
            SET @idActual = @idPadreDeActual;
            SET @nivel += 1;
        END

        IF @localTran = 1 COMMIT TRAN;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 AND @localTran = 1 ROLLBACK TRAN;
        THROW;
    END CATCH
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_RemoverColaborador]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE   PROCEDURE [dbo].[sp_Tarea_RemoverColaborador] (
    @idTarea INT,
    @idUsuario INT
) AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.p_TareaAsignados 
    WHERE idTarea = @idTarea AND idUsuario = @idUsuario AND tipo = 'Colaborador';
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tarea_ValidarNoCiclo]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ==============================================================================
-- 2. PROCEDIMIENTOS DE VALIDACIÃ“N E INSERCIÃ“N
-- ==============================================================================

-- 2.1 ValidaciÃ³n Anti-Ciclos (Profunda)
-- Detecta si al asignar un nuevo padre se crearÃ­a un ciclo indirecto (A->B->A)
CREATE   PROCEDURE [dbo].[sp_Tarea_ValidarNoCiclo]
(
    @idTarea INT,
    @idNuevoPadre INT
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Caso trivial
    IF @idTarea = @idNuevoPadre
        THROW 50010, 'Ciclo detectado: una tarea no puede ser su propio padre.', 1;

    DECLARE @found BIT = 0;

    -- CTE Recursivo para verificar si @idNuevoPadre es descendiente de @idTarea
    ;WITH SubArbol AS (
        SELECT t.idTarea
        FROM dbo.p_Tareas t
        WHERE t.idTarea = @idTarea

        UNION ALL

        SELECT h.idTarea
        FROM dbo.p_Tareas h
        INNER JOIN SubArbol s ON h.idTareaPadre = s.idTarea
        WHERE h.activo = 1
    )
    SELECT TOP 1 @found = 1 FROM SubArbol WHERE idTarea = @idNuevoPadre;

    IF @found = 1
        THROW 50011, 'Ciclo detectado: el nuevo padre es descendiente de la tarea actual.', 1;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Tareas_ObtenerMultiplesUsuarios]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sp_Tareas_ObtenerMultiplesUsuarios] @carnetsList NVARCHAR(MAX) AS BEGIN SET NOCOUNT ON; SELECT t.idTarea, t.nombre as titulo, t.descripcion, t.estado, t.prioridad, t.fechaInicioPlanificada, t.fechaObjetivo, t.porcentaje, t.idProyecto, ta.carnet as usuarioCarnet FROM p_Tareas t INNER JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea INNER JOIN STRING_SPLIT(@carnetsList, ',') as L ON ta.carnet = L.value WHERE t.activo = 1; END
GO
/****** Object:  StoredProcedure [dbo].[sp_Tareas_ObtenerMultiplesUsuarios_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Tareas_ObtenerMultiplesUsuarios_rust]
    @carnetsList nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tareas_ObtenerMultiplesUsuarios @carnetsList;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tareas_ObtenerPorId_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Tareas_ObtenerPorId_rust]
    @idTarea INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        t.*,
        t.porcentaje as progreso, -- Alias para paridad
        responsableNombre = uR.nombre,
        responsableCarnet = uR.carnet,
        creadorNombre = uC.nombre,
        proyectoNombre = p.nombre
    FROM p_Tareas t
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
    LEFT JOIN p_Usuarios uR ON ta.carnet = uR.carnet
    LEFT JOIN p_Usuarios uC ON t.idCreador = uC.idUsuario
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    WHERE t.idTarea = @idTarea;
END;

GO
/****** Object:  StoredProcedure [dbo].[sp_Tareas_ObtenerPorProyecto]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Tareas_ObtenerPorProyecto]
    @idProyecto INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        t.idTarea, t.idProyecto,
        t.nombre as titulo,
        t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipo,
        t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado,
        t.porcentaje as progreso,
        t.orden, t.idCreador, t.fechaInicioPlanificada,
        t.comportamiento, t.idGrupo, t.numeroParte,
        t.fechaActualizacion as fechaUltActualizacion,
        t.idTareaPadre,
        p.nombre as proyectoNombre,
        ta.idUsuario as idResponsable,
        u.nombreCompleto as responsableNombre,
        u.carnet as responsableCarnet
    FROM p_Tareas t
    LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto
    LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea AND ta.tipo = 'Responsable'
    LEFT JOIN p_Usuarios u ON ta.idUsuario = u.idUsuario
    WHERE t.idProyecto = @idProyecto
      AND t.activo = 1
      AND t.estado NOT IN ('Descartada', 'Eliminada', 'Anulada', 'Cancelada')
    ORDER BY t.orden ASC, t.fechaObjetivo ASC;
END
    
GO
/****** Object:  StoredProcedure [dbo].[sp_Tareas_ObtenerPorProyecto_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Tareas_ObtenerPorProyecto_rust]
    @idProyecto int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tareas_ObtenerPorProyecto @idProyecto;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tareas_ObtenerPorUsuario]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO
CREATE PROCEDURE [dbo].[sp_Tareas_ObtenerPorUsuario] @carnet NVARCHAR(50), @estado NVARCHAR(50) = NULL, @idProyecto INT = NULL, @query NVARCHAR(100) = NULL, @startDate DATETIME = NULL, @endDate DATETIME = NULL AS BEGIN SET NOCOUNT ON; SELECT DISTINCT t.*, t.nombre as titulo, p.nombre as proyectoNombre, (SELECT TOP 1 u.nombre FROM p_TareaAsignados tas INNER JOIN p_Usuarios u ON tas.carnet = u.carnet WHERE tas.idTarea = t.idTarea AND tas.tipo = 'Responsable') as responsableNombre, (SELECT TOP 1 tas.carnet FROM p_TareaAsignados tas WHERE tas.idTarea = t.idTarea AND tas.tipo = 'Responsable') as responsableCarnet FROM p_Tareas t LEFT JOIN p_Proyectos p ON t.idProyecto = p.idProyecto LEFT JOIN p_TareaAsignados ta ON t.idTarea = ta.idTarea WHERE (ta.carnet = @carnet OR (t.creadorCarnet = @carnet AND NOT EXISTS (SELECT 1 FROM p_TareaAsignados tasub WHERE tasub.idTarea = t.idTarea AND tasub.tipo = 'Responsable'))) AND (@estado IS NULL OR t.estado = @estado) AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto) AND (@query IS NULL OR (t.nombre LIKE '%' + @query + '%' OR t.descripcion LIKE '%' + @query + '%')) AND ((@startDate IS NULL OR @endDate IS NULL) OR (t.fechaObjetivo >= @startDate AND t.fechaObjetivo <= @endDate)) AND t.activo = 1 AND NOT EXISTS (SELECT 1 FROM p_Tareas s WHERE s.idTareaPadre = t.idTarea AND s.activo = 1) ORDER BY t.fechaObjetivo ASC; END
GO
/****** Object:  StoredProcedure [dbo].[sp_Tareas_ObtenerPorUsuario_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Tareas_ObtenerPorUsuario_rust]
    @carnet nvarchar(50) = NULL,
    @estado nvarchar(50) = NULL,
    @idProyecto int = NULL,
    @query nvarchar(100) = NULL,
    @startDate datetime = NULL,
    @endDate datetime = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Tareas_ObtenerPorUsuario @carnet, @estado, @idProyecto, @query, @startDate, @endDate;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Tareas_ObtenerPorUsuario_test]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/*--------------------------------------------------------------
  sp_Tareas_ObtenerPorUsuario_test
  Mejora:
  - Evita MERGE (#IdsTareas) y usa INSERT NOT EXISTS (más estable).
  - Resuelve idUsuario 1 vez.
--------------------------------------------------------------*/
CREATE   PROCEDURE [dbo].[sp_Tareas_ObtenerPorUsuario_test]
    @carnet     NVARCHAR(50),
    @estado     NVARCHAR(50) = NULL,
    @idProyecto INT         = NULL,
    @query      NVARCHAR(100)= NULL,
    @startDate  DATETIME    = NULL,
    @endDate    DATETIME    = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF (@query IS NOT NULL AND LTRIM(RTRIM(@query)) = N'') SET @query = NULL;

    DECLARE @idUsuario INT = NULL;
    SELECT TOP (1) @idUsuario = u.idUsuario
    FROM dbo.p_Usuarios u
    WHERE u.carnet = @carnet;

    CREATE TABLE #IdsTareas(
        idTarea INT NOT NULL PRIMARY KEY
    );

    -- 1) creadas por carnet
    INSERT INTO #IdsTareas (idTarea)
    SELECT t.idTarea
    FROM dbo.p_Tareas t
    WHERE t.activo = 1
      AND t.creadorCarnet = @carnet
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (
            @query IS NULL OR
            (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%')
          )
      AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
      AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
    OPTION (RECOMPILE);

    -- 2) asignadas por carnet
    INSERT INTO #IdsTareas (idTarea)
    SELECT t.idTarea
    FROM dbo.p_TareaAsignados ta
    JOIN dbo.p_Tareas t ON t.idTarea = ta.idTarea
    WHERE t.activo = 1
      AND ta.carnet = @carnet
      AND (@estado IS NULL OR t.estado = @estado)
      AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
      AND (
            @query IS NULL OR
            (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%')
          )
      AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
      AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
      AND NOT EXISTS (SELECT 1 FROM #IdsTareas x WHERE x.idTarea = t.idTarea)
    OPTION (RECOMPILE);

    -- 3) fallback legacy por idCreador
    IF (@idUsuario IS NOT NULL)
    BEGIN
        INSERT INTO #IdsTareas (idTarea)
        SELECT t.idTarea
        FROM dbo.p_Tareas t
        WHERE t.activo = 1
          AND t.idCreador = @idUsuario
          AND (@estado IS NULL OR t.estado = @estado)
          AND (@idProyecto IS NULL OR t.idProyecto = @idProyecto)
          AND (
                @query IS NULL OR
                (t.nombre LIKE N'%' + @query + N'%' OR t.descripcion LIKE N'%' + @query + N'%')
              )
          AND (@startDate IS NULL OR t.fechaObjetivo >= @startDate)
          AND (@endDate   IS NULL OR t.fechaObjetivo <= @endDate)
          AND NOT EXISTS (SELECT 1 FROM #IdsTareas x WHERE x.idTarea = t.idTarea)
        OPTION (RECOMPILE);
    END

    SELECT
        t.idTarea, t.idProyecto,
        t.nombre AS titulo,
        t.descripcion, t.estado, t.prioridad, t.esfuerzo, t.tipo,
        t.fechaCreacion, t.fechaObjetivo, t.fechaCompletado,
        t.porcentaje AS progreso,
        t.orden, t.idCreador, t.fechaInicioPlanificada,
        t.comportamiento, t.idGrupo, t.numeroParte,
        t.fechaActualizacion AS fechaUltActualizacion,
        t.idTareaPadre,
        t.idPlan,
        p.nombre AS proyectoNombre
    FROM #IdsTareas x
    JOIN dbo.p_Tareas t ON t.idTarea = x.idTarea
    LEFT JOIN dbo.p_Proyectos p ON p.idProyecto = t.idProyecto
    ORDER BY t.fechaObjetivo ASC, t.idTarea ASC
    OPTION (RECOMPILE);

    DROP TABLE #IdsTareas;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Tareas_Reasignar_PorCarnet]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- 4. SP: Reasignar Tareas masivamente
CREATE   PROCEDURE [dbo].[sp_Tareas_Reasignar_PorCarnet]
    @taskIdsCsv NVARCHAR(MAX),
    @toCarnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @idDestino INT;
    SELECT @idDestino = idUsuario FROM p_Usuarios WHERE carnet = @toCarnet;

    IF @idDestino IS NULL RETURN;

    -- Eliminar asignaciones previas de tipo 'Responsable'
    DELETE FROM p_TareaAsignados 
    WHERE idTarea IN (SELECT value FROM STRING_SPLIT(@taskIdsCsv, ','))
      AND tipo = 'Responsable';

    -- Insertar nuevas asignaciones
    INSERT INTO p_TareaAsignados (idTarea, idUsuario, carnet, tipo, fechaAsignacion)
    SELECT CAST(value AS INT), @idDestino, @toCarnet, 'Responsable', GETDATE()
    FROM STRING_SPLIT(@taskIdsCsv, ',');
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_UpsertAvanceMensual]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
-- ============================================================
-- 5. STORED PROCEDURES
-- ============================================================

-- 5.1 SP: Upsert Avance Mensual (Plan de Trabajo)
CREATE   PROCEDURE [dbo].[sp_UpsertAvanceMensual]
    @idTarea INT,
    @anio INT,
    @mes INT,
    @porcentajeMes DECIMAL(5,2),
    @comentario NVARCHAR(MAX) = NULL,
    @idUsuario INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRAN;

    MERGE p_TareaAvanceMensual AS t
    USING (SELECT @idTarea idTarea, @anio anio, @mes mes) AS s
    ON (t.idTarea = s.idTarea AND t.anio = s.anio AND t.mes = s.mes)
    WHEN MATCHED THEN
        UPDATE SET porcentajeMes = @porcentajeMes,
                   comentario = @comentario,
                   idUsuarioActualizador = @idUsuario,
                   fechaActualizacion = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (idTarea, anio, mes, porcentajeMes, comentario, idUsuarioActualizador)
        VALUES (@idTarea, @anio, @mes, @porcentajeMes, @comentario, @idUsuario);

    -- Marca completada si acumulado >= 100
    DECLARE @acum DECIMAL(6,2);
    SELECT @acum = ISNULL(SUM(porcentajeMes), 0)
    FROM p_TareaAvanceMensual
    WHERE idTarea = @idTarea;

    -- Actualiza el porcentaje global en p_Tareas
    UPDATE p_Tareas 
    SET porcentaje = CASE WHEN @acum > 100 THEN 100 ELSE @acum END,
        estado = CASE WHEN @acum >= 100 THEN 'Hecha' ELSE estado END,
        fechaCompletado = CASE WHEN @acum >= 100 AND estado <> 'Hecha' THEN GETDATE() ELSE fechaCompletado END
    WHERE idTarea = @idTarea;

    COMMIT;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_UpsertAvanceMensual_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_UpsertAvanceMensual_rust]
    @idTarea int = NULL,
    @anio int = NULL,
    @mes int = NULL,
    @porcentajeMes decimal = NULL,
    @comentario nvarchar(MAX) = NULL,
    @idUsuario int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_UpsertAvanceMensual @idTarea, @anio, @mes, @porcentajeMes, @comentario, @idUsuario;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Usuarios_Buscar]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Usuarios_Buscar]
  @termino NVARCHAR(200),
  @limite  INT = 10
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @t NVARCHAR(210) = N'%' + ISNULL(@termino, N'') + N'%';

  SELECT TOP (@limite) *
  FROM dbo.p_Usuarios
  WHERE activo = 1
    AND (
         LOWER(nombreCompleto) LIKE LOWER(@t)
      OR LTRIM(RTRIM(carnet)) LIKE LTRIM(RTRIM(@t))
      OR LOWER(correo) LIKE LOWER(@t)
    )
  ORDER BY nombreCompleto;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Usuarios_Buscar_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Usuarios_Buscar_rust]
    @termino NVARCHAR(100),
    @limite INT = 10
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @t NVARCHAR(260) = '%' + ISNULL(@termino,'') + '%';
    SELECT TOP (@limite) *
    FROM dbo.p_Usuarios
    WHERE activo = 1
      AND (
           LOWER(nombreCompleto) LIKE LOWER(@t) OR
           carnet LIKE @t OR
           LOWER(correo) LIKE LOWER(@t)
      )
    ORDER BY nombreCompleto ASC;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Usuarios_BuscarPorCarnet]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Usuarios_BuscarPorCarnet]
  @carnet NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @c NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@carnet, N'')));

  SELECT TOP 1 *
  FROM dbo.p_Usuarios
  WHERE LTRIM(RTRIM(carnet)) = @c;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Usuarios_BuscarPorCarnet_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Usuarios_BuscarPorCarnet_rust]
    @carnet nvarchar(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Usuarios_BuscarPorCarnet @carnet;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Usuarios_BuscarPorCorreo]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Usuarios_BuscarPorCorreo]
  @correo NVARCHAR(200)
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @c NVARCHAR(200) = LOWER(LTRIM(RTRIM(ISNULL(@correo, N''))));

  SELECT TOP 1 *
  FROM dbo.p_Usuarios
  WHERE LOWER(LTRIM(RTRIM(correo))) = @c;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Usuarios_ListarActivos]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Usuarios_ListarActivos]
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM dbo.p_Usuarios
  WHERE activo = 1
  ORDER BY nombreCompleto;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Usuarios_ObtenerCarnetPorId]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_Usuarios_ObtenerCarnetPorId]
  @idUsuario INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1 u.carnet
  FROM dbo.p_Usuarios u
  WHERE u.idUsuario = @idUsuario;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Usuarios_ObtenerDetallesPorCarnets]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/* ============================================
   USUARIOS
   ============================================ */

CREATE   PROCEDURE [dbo].[sp_Usuarios_ObtenerDetallesPorCarnets]
  @CarnetsCsv NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    u.idUsuario,
    u.carnet,
    u.nombre,
    u.nombreCompleto,
    u.correo,
    u.cargo,
    u.departamento,
    u.orgDepartamento,
    u.orgGerencia,
    u.idOrg,
    u.jefeCarnet,
    u.jefeNombre,
    u.jefeCorreo,
    u.activo,
    u.gerencia,
    u.subgerencia,
    u.idRol,
    u.rolGlobal,
    r.nombre AS rolNombre
  FROM dbo.p_Usuarios u
  LEFT JOIN dbo.p_Roles r ON r.idRol = u.idRol
  JOIN dbo.fn_SplitCsv_NVarChar(@CarnetsCsv) s
    ON LTRIM(RTRIM(u.carnet)) = s.item
  ORDER BY u.nombreCompleto;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Usuarios_ObtenerDetallesPorCarnets_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Usuarios_ObtenerDetallesPorCarnets_rust]
    @CarnetsCsv nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Usuarios_ObtenerDetallesPorCarnets @CarnetsCsv;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_Usuarios_ObtenerIdPorCarnet]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

/* ========================================================================
   2. SP UTILITARIOS (Resolución ID <-> Carnet)
   ======================================================================== */

CREATE   PROCEDURE [dbo].[sp_Usuarios_ObtenerIdPorCarnet]
    @carnet NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    -- CORRECCION: Usamos 'rolGlobal' en vez de 'rol'
    SELECT idUsuario, nombreCompleto, correo, rolGlobal as rol
    FROM dbo.p_Usuarios 
    WHERE carnet = @carnet;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Usuarios_ObtenerPorLista]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[sp_Usuarios_ObtenerPorLista]
    @carnetsList NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    CREATE TABLE #Carnets (carnet NVARCHAR(50) COLLATE DATABASE_DEFAULT PRIMARY KEY);
    INSERT INTO #Carnets (carnet)
    SELECT DISTINCT LTRIM(RTRIM(value))
    FROM STRING_SPLIT(@carnetsList, ',')
    WHERE LTRIM(RTRIM(value)) <> N'';

    SELECT
        u.idUsuario, u.nombre, u.nombreCompleto, u.correo, u.carnet, u.idRol, u.cargo,
        r.nombre as rolNombre
    FROM dbo.p_Usuarios u
    LEFT JOIN dbo.p_Roles r ON u.idRol = r.idRol
    JOIN #Carnets L ON u.carnet = L.carnet
    WHERE u.activo = 1
    OPTION (RECOMPILE);
    DROP TABLE #Carnets;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_Usuarios_ObtenerPorLista_test]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
/*--------------------------------------------------------------*/
CREATE   PROCEDURE [dbo].[sp_Usuarios_ObtenerPorLista_test]
    @carnetsList NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    CREATE TABLE #Carnets (carnet NVARCHAR(50) COLLATE DATABASE_DEFAULT PRIMARY KEY);

    INSERT INTO #Carnets (carnet)
    SELECT DISTINCT LTRIM(RTRIM(value))
    FROM STRING_SPLIT(@carnetsList, ',')
    WHERE LTRIM(RTRIM(value)) <> N'';

    SELECT
        u.idUsuario,
        u.nombre,
        u.nombreCompleto,
        u.correo,
        u.carnet,
        u.idRol,
        u.cargo,
        r.nombre as rolNombre
    FROM dbo.p_Usuarios u
    LEFT JOIN dbo.p_Roles r ON u.idRol = r.idRol
    JOIN #Carnets L ON u.carnet = L.carnet
    WHERE u.activo = 1
    OPTION (RECOMPILE);

    DROP TABLE #Carnets;
END
GO
/****** Object:  StoredProcedure [dbo].[sp_vc_agenda_hoy]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- SP 4: sp_vc_agenda_hoy
-- Retorna la agenda del dÃ­a para un tÃ©cnico
-- Ordenada por distancia al GPS actual (si se proporciona)
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_vc_agenda_hoy]
    @carnet     VARCHAR(20),
    @lat_actual DECIMAL(10,7) = NULL,
    @lon_actual DECIMAL(10,7) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @hoy DATE = CAST(GETDATE() AS DATE);

    SELECT
        a.id AS agenda_id,
        a.orden,
        a.estado AS agenda_estado,
        a.notas,
        a.visita_id,
        c.id AS cliente_id,
        c.codigo,
        c.nombre AS cliente_nombre,
        c.direccion,
        c.telefono,
        c.contacto,
        c.lat AS cliente_lat,
        c.long AS cliente_lon,
        c.radio_metros,
        c.zona,
        -- Distancia calculada al GPS actual
        CASE
            WHEN @lat_actual IS NOT NULL AND c.lat IS NOT NULL
            THEN CAST(dbo.fn_haversine_metros(@lat_actual, @lon_actual, c.lat, c.long) AS INT)
            ELSE NULL
        END AS distancia_actual_m,
        -- Info de la visita si ya se hizo
        v.timestamp_inicio AS visita_inicio,
        v.timestamp_fin AS visita_fin,
        v.duracion_minutos,
        v.estado AS visita_estado,
        v.valido_inicio,
        v.foto_path,
        v.firma_path
    FROM vc_agenda_dia a
    JOIN vc_clientes c ON c.id = a.cliente_id
    LEFT JOIN vc_visitas v ON v.id = a.visita_id
    WHERE a.carnet = @carnet
      AND a.fecha = @hoy
      AND c.activo = 1
    ORDER BY
        -- Primero las pendientes, luego en curso, luego finalizadas
        CASE a.estado
            WHEN 'PENDIENTE' THEN 1
            WHEN 'EN_CURSO' THEN 2
            WHEN 'FINALIZADA' THEN 3
            ELSE 4
        END,
        -- Dentro de pendientes, ordenar por distancia si hay GPS
        CASE
            WHEN @lat_actual IS NOT NULL AND c.lat IS NOT NULL
            THEN dbo.fn_haversine_metros(@lat_actual, @lon_actual, c.lat, c.long)
            ELSE a.orden * 1000.0   -- Fallback: usar orden manual
        END ASC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_vc_agenda_hoy_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_vc_agenda_hoy_rust]
    @carnet varchar(20) = NULL,
    @lat_actual decimal = NULL,
    @lon_actual decimal = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_agenda_hoy @carnet, @lat_actual, @lon_actual;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_vc_calculo_km_dia]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- SP 3: sp_vc_calculo_km_dia
-- Calcula km totales del dÃ­a filtrando ruido GPS
-- Algoritmo:
--   1. Ordenar puntos por timestamp
--   2. Descartar precisiÃ³n > 50m
--   3. Descartar saltos > 1km en < 30 seg (velocidad irreal > 120 km/h)
--   4. Sumar distancias Haversine consecutivas
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_vc_calculo_km_dia]
    @carnet VARCHAR(20),
    @fecha  DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SET @fecha = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    DECLARE @inicio DATETIME2 = CAST(@fecha AS DATETIME2);
    DECLARE @fin    DATETIME2 = DATEADD(DAY, 1, @inicio);

    -- Puntos vÃ¡lidos del dÃ­a ordenados por timestamp
    -- Combinar tracking GPS + puntos de check-in/out
    ;WITH puntos_raw AS (
        -- Puntos de tracking GPS
        SELECT lat, long AS lon, accuracy, timestamp, fuente, ROW_NUMBER() OVER (ORDER BY timestamp) AS rn
        FROM vc_tracking_gps
        WHERE carnet = @carnet
          AND timestamp >= @inicio
          AND timestamp < @fin
          AND valido = 1
        UNION ALL
        -- Puntos de check-in
        SELECT lat_inicio, long_inicio, accuracy_inicio, timestamp_inicio, 'CHECK_IN', 0
        FROM vc_visitas
        WHERE carnet = @carnet
          AND timestamp_inicio >= @inicio
          AND timestamp_inicio < @fin
        UNION ALL
        -- Puntos de check-out
        SELECT lat_fin, long_fin, accuracy_fin, timestamp_fin, 'CHECK_OUT', 0
        FROM vc_visitas
        WHERE carnet = @carnet
          AND timestamp_fin >= @inicio
          AND timestamp_fin < @fin
          AND lat_fin IS NOT NULL
    ),
    -- Filtrar y reordenar
    puntos_filtrados AS (
        SELECT lat, lon, accuracy, timestamp,
               ROW_NUMBER() OVER (ORDER BY timestamp) AS seq
        FROM puntos_raw
        WHERE lat IS NOT NULL
          AND lon IS NOT NULL
          AND (accuracy IS NULL OR accuracy <= 50)  -- Descartar precisiÃ³n baja
    ),
    -- Calcular distancias entre puntos consecutivos
    segmentos AS (
        SELECT
            p1.seq,
            p1.lat AS lat1, p1.lon AS lon1, p1.timestamp AS ts1,
            p2.lat AS lat2, p2.lon AS lon2, p2.timestamp AS ts2,
            dbo.fn_haversine_metros(p1.lat, p1.lon, p2.lat, p2.lon) AS distancia_m,
            DATEDIFF(SECOND, p1.timestamp, p2.timestamp) AS segundos
        FROM puntos_filtrados p1
        JOIN puntos_filtrados p2 ON p2.seq = p1.seq + 1
    ),
    -- Filtrar segmentos con velocidad irreal
    segmentos_validos AS (
        SELECT *,
            CASE
                WHEN segundos > 0
                THEN (distancia_m / segundos) * 3.6  -- m/s â†’ km/h
                ELSE 0
            END AS velocidad_kmh
        FROM segmentos
        WHERE segundos > 0               -- Evitar div/0
          AND distancia_m <= 1000         -- No mÃ¡s de 1km entre puntos
          AND (distancia_m / NULLIF(segundos, 0)) * 3.6 <= 130  -- No mÃ¡s de 130 km/h
    )
    SELECT
        @carnet AS carnet,
        @fecha AS fecha,
        ISNULL(SUM(distancia_m) / 1000.0, 0) AS km_total,
        COUNT(*) AS segmentos_validos,
        (SELECT COUNT(*) FROM puntos_raw) AS puntos_totales,
        (SELECT COUNT(*) FROM puntos_filtrados) AS puntos_validos_accuracy,
        (SELECT COUNT(*) FROM segmentos) - COUNT(*) AS segmentos_descartados_velocidad
    FROM segmentos_validos;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_vc_calculo_km_dia_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_vc_calculo_km_dia_rust]
    @carnet varchar(20) = NULL,
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_calculo_km_dia @carnet, @fecha;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_vc_checkin]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- SP 1: sp_vc_checkin
-- Registra la llegada del tÃ©cnico al cliente
-- Valida geofence y calcula distancia al centro del cliente
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_vc_checkin]
    @carnet      VARCHAR(20),
    @cliente_id  INT,
    @lat         DECIMAL(10,7),
    @lon         DECIMAL(10,7),
    @accuracy    DECIMAL(10,2) = NULL,
    @timestamp   DATETIME2 = NULL,
    @agenda_id   INT = NULL,
    @offline_id  VARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ahora DATETIME2 = ISNULL(@timestamp, GETDATE());

    -- ========================================
    -- 1. IDEMPOTENCIA: Si offline_id ya existe â†’ retornar existente
    -- ========================================
    IF @offline_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM vc_visitas WHERE offline_id = @offline_id
    )
    BEGIN
        SELECT v.*, c.nombre AS cliente_nombre, c.zona AS cliente_zona
        FROM vc_visitas v
        JOIN vc_clientes c ON c.id = v.cliente_id
        WHERE v.offline_id = @offline_id;
        RETURN;
    END

    -- ========================================
    -- 2. VERIFICAR QUE NO HAY VISITA ABIERTA AL MISMO CLIENTE HOY
    -- ========================================
    IF EXISTS (
        SELECT 1 FROM vc_visitas
        WHERE carnet = @carnet
          AND cliente_id = @cliente_id
          AND estado = 'EN_CURSO'
          AND CAST(timestamp_inicio AS DATE) = CAST(@ahora AS DATE)
    )
    BEGIN
        -- Retornar la visita existente en vez de crear duplicado
        SELECT v.*, c.nombre AS cliente_nombre, c.zona AS cliente_zona,
               CAST(0 AS BIT) AS nueva, 'Visita ya en curso para este cliente hoy' AS mensaje
        FROM vc_visitas v
        JOIN vc_clientes c ON c.id = v.cliente_id
        WHERE v.carnet = @carnet
          AND v.cliente_id = @cliente_id
          AND v.estado = 'EN_CURSO'
          AND CAST(v.timestamp_inicio AS DATE) = CAST(@ahora AS DATE);
        RETURN;
    END

    -- ========================================
    -- 3. OBTENER DATOS DEL CLIENTE
    -- ========================================
    DECLARE @cli_lat DECIMAL(10,7);
    DECLARE @cli_lon DECIMAL(10,7);
    DECLARE @cli_radio INT;
    DECLARE @cli_nombre NVARCHAR(200);

    SELECT @cli_lat = lat, @cli_lon = long,
           @cli_radio = radio_metros, @cli_nombre = nombre
    FROM vc_clientes
    WHERE id = @cliente_id AND activo = 1;

    IF @cli_lat IS NULL
    BEGIN
        -- Cliente sin GPS configurado â†’ aceptar sin validaciÃ³n
        INSERT INTO vc_visitas (
            carnet, cliente_id, agenda_id,
            lat_inicio, long_inicio, accuracy_inicio,
            timestamp_inicio, distancia_inicio_m, valido_inicio,
            estado, offline_id
        )
        VALUES (
            @carnet, @cliente_id, @agenda_id,
            @lat, @lon, @accuracy,
            @ahora, NULL, 1,
            'EN_CURSO', @offline_id
        );

        -- Actualizar agenda si aplica
        IF @agenda_id IS NOT NULL
            UPDATE vc_agenda_dia SET estado = 'EN_CURSO', visita_id = SCOPE_IDENTITY()
            WHERE id = @agenda_id;

        SELECT v.*, c.nombre AS cliente_nombre, c.zona AS cliente_zona,
               CAST(1 AS BIT) AS nueva, 'Check-in registrado (cliente sin GPS)' AS mensaje
        FROM vc_visitas v
        JOIN vc_clientes c ON c.id = v.cliente_id
        WHERE v.id = SCOPE_IDENTITY();
        RETURN;
    END

    -- ========================================
    -- 4. CALCULAR DISTANCIA Y VALIDAR GEOFENCE
    -- ========================================
    DECLARE @distancia_m INT;
    SET @distancia_m = CAST(dbo.fn_haversine_metros(@lat, @lon, @cli_lat, @cli_lon) AS INT);

    DECLARE @valido BIT = 1;
    DECLARE @motivo_fuera NVARCHAR(300) = NULL;

    IF @distancia_m > @cli_radio
    BEGIN
        SET @valido = 0;
        SET @motivo_fuera = CONCAT('Fuera de zona: ', @distancia_m, 'm del centro (radio: ', @cli_radio, 'm)');
    END

    -- ========================================
    -- 5. INSERTAR VISITA
    -- ========================================
    INSERT INTO vc_visitas (
        carnet, cliente_id, agenda_id,
        lat_inicio, long_inicio, accuracy_inicio,
        timestamp_inicio, distancia_inicio_m, valido_inicio,
        estado, motivo_fuera_zona, offline_id
    )
    VALUES (
        @carnet, @cliente_id, @agenda_id,
        @lat, @lon, @accuracy,
        @ahora, @distancia_m, @valido,
        'EN_CURSO', @motivo_fuera, @offline_id
    );

    DECLARE @new_id INT = SCOPE_IDENTITY();

    -- Actualizar agenda si aplica
    IF @agenda_id IS NOT NULL
        UPDATE vc_agenda_dia SET estado = 'EN_CURSO', visita_id = @new_id
        WHERE id = @agenda_id;

    -- ========================================
    -- 6. RETORNAR RESULTADO
    -- ========================================
    SELECT v.*, c.nombre AS cliente_nombre, c.zona AS cliente_zona,
           CAST(1 AS BIT) AS nueva,
           CASE WHEN @valido = 1
                THEN CONCAT('Check-in vÃ¡lido (', @distancia_m, 'm del centro)')
                ELSE CONCAT('Check-in registrado FUERA de zona (', @distancia_m, 'm, radio: ', @cli_radio, 'm)')
           END AS mensaje
    FROM vc_visitas v
    JOIN vc_clientes c ON c.id = v.cliente_id
    WHERE v.id = @new_id;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_vc_checkin_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_vc_checkin_rust]
    @carnet varchar(20) = NULL,
    @cliente_id int = NULL,
    @lat decimal = NULL,
    @lon decimal = NULL,
    @accuracy decimal = NULL,
    @timestamp datetime2 = NULL,
    @agenda_id int = NULL,
    @offline_id varchar(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_checkin @carnet, @cliente_id, @lat, @lon, @accuracy, @timestamp, @agenda_id, @offline_id;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_vc_checkout]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- SP 2: sp_vc_checkout
-- Cierra una visita: registra GPS final, evidencia, observaciÃ³n
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_vc_checkout]
    @visita_id    INT,
    @carnet       VARCHAR(20),
    @lat          DECIMAL(10,7) = NULL,
    @lon          DECIMAL(10,7) = NULL,
    @accuracy     DECIMAL(10,2) = NULL,
    @timestamp    DATETIME2 = NULL,
    @observacion  NVARCHAR(MAX) = NULL,
    @foto_path    NVARCHAR(500) = NULL,
    @firma_path   NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ahora DATETIME2 = ISNULL(@timestamp, GETDATE());

    -- ========================================
    -- 1. VERIFICAR QUE LA VISITA EXISTE Y ESTÃ EN CURSO
    -- ========================================
    DECLARE @estado_actual VARCHAR(20);
    DECLARE @carnet_visita VARCHAR(20);
    DECLARE @agenda_id INT;

    SELECT @estado_actual = estado, @carnet_visita = carnet, @agenda_id = agenda_id
    FROM vc_visitas
    WHERE id = @visita_id;

    IF @estado_actual IS NULL
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'Visita no encontrada' AS mensaje;
        RETURN;
    END

    IF @carnet_visita <> @carnet
    BEGIN
        SELECT CAST(0 AS BIT) AS ok, 'No tienes permiso para cerrar esta visita' AS mensaje;
        RETURN;
    END

    IF @estado_actual <> 'EN_CURSO'
    BEGIN
        SELECT CAST(0 AS BIT) AS ok,
               CONCAT('La visita ya estÃ¡ en estado: ', @estado_actual) AS mensaje;
        RETURN;
    END

    -- ========================================
    -- 2. ACTUALIZAR VISITA CON DATOS DE CIERRE
    -- ========================================
    UPDATE vc_visitas
    SET lat_fin = @lat,
        long_fin = @lon,
        accuracy_fin = @accuracy,
        timestamp_fin = @ahora,
        observacion = @observacion,
        foto_path = @foto_path,
        firma_path = @firma_path,
        estado = 'FINALIZADA'
    WHERE id = @visita_id;

    -- Actualizar agenda si aplica
    IF @agenda_id IS NOT NULL
        UPDATE vc_agenda_dia SET estado = 'FINALIZADA' WHERE id = @agenda_id;

    -- ========================================
    -- 3. RETORNAR RESULTADO
    -- ========================================
    SELECT v.*, c.nombre AS cliente_nombre, c.zona AS cliente_zona,
           CAST(1 AS BIT) AS ok,
           CONCAT('Visita finalizada. DuraciÃ³n: ', v.duracion_minutos, ' minutos') AS mensaje
    FROM vc_visitas v
    JOIN vc_clientes c ON c.id = v.cliente_id
    WHERE v.id = @visita_id;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_vc_importar_clientes]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE   PROCEDURE [dbo].[sp_vc_importar_clientes]
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
/****** Object:  StoredProcedure [dbo].[sp_vc_importar_clientes_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_vc_importar_clientes_rust]
    @clientes_json nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_importar_clientes @clientes_json;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_vc_resumen_dia]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- SP 5: sp_vc_resumen_dia
-- KPIs del dÃ­a para el dashboard del tÃ©cnico
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_vc_resumen_dia]
    @carnet VARCHAR(20),
    @fecha  DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SET @fecha = ISNULL(@fecha, CAST(GETDATE() AS DATE));

    DECLARE @inicio DATETIME2 = CAST(@fecha AS DATETIME2);
    DECLARE @fin    DATETIME2 = DATEADD(DAY, 1, @inicio);

    -- Conteos de visitas
    DECLARE @completadas INT = 0;
    DECLARE @pendientes INT = 0;
    DECLARE @en_curso INT = 0;
    DECLARE @total_agenda INT = 0;
    DECLARE @duracion_total INT = 0;
    DECLARE @fuera_zona INT = 0;

    SELECT
        @completadas = SUM(CASE WHEN estado = 'FINALIZADA' THEN 1 ELSE 0 END),
        @en_curso = SUM(CASE WHEN estado = 'EN_CURSO' THEN 1 ELSE 0 END),
        @duracion_total = ISNULL(SUM(CASE WHEN duracion_minutos IS NOT NULL THEN duracion_minutos ELSE 0 END), 0),
        @fuera_zona = SUM(CASE WHEN valido_inicio = 0 THEN 1 ELSE 0 END)
    FROM vc_visitas
    WHERE carnet = @carnet
      AND timestamp_inicio >= @inicio
      AND timestamp_inicio < @fin;

    SELECT @total_agenda = COUNT(*),
           @pendientes = SUM(CASE WHEN estado = 'PENDIENTE' THEN 1 ELSE 0 END)
    FROM vc_agenda_dia
    WHERE carnet = @carnet AND fecha = @fecha;

    -- Meta
    DECLARE @meta_visitas INT = 10;
    DECLARE @costo_km DECIMAL(10,4) = 0.15;

    SELECT @meta_visitas = ISNULL(meta_visitas, 10),
           @costo_km = ISNULL(costo_km, 0.15)
    FROM vc_metas
    WHERE carnet = @carnet AND activo = 1
      AND vigente_desde <= @fecha
      AND (vigente_hasta IS NULL OR vigente_hasta >= @fecha);

    -- Km del dÃ­a (ejecutar cÃ¡lculo inline para evitar SP anidado)
    DECLARE @km_total DECIMAL(10,2) = 0;

    -- Calcular km con la misma lÃ³gica de sp_vc_calculo_km_dia pero inline
    ;WITH puntos_filtrados AS (
        SELECT lat, long AS lon, timestamp,
               ROW_NUMBER() OVER (ORDER BY timestamp) AS seq
        FROM vc_tracking_gps
        WHERE carnet = @carnet
          AND timestamp >= @inicio
          AND timestamp < @fin
          AND valido = 1
          AND (accuracy IS NULL OR accuracy <= 50)
    ),
    segmentos AS (
        SELECT
            dbo.fn_haversine_metros(p1.lat, p1.lon, p2.lat, p2.lon) AS distancia_m,
            DATEDIFF(SECOND, p1.timestamp, p2.timestamp) AS segundos
        FROM puntos_filtrados p1
        JOIN puntos_filtrados p2 ON p2.seq = p1.seq + 1
    )
    SELECT @km_total = ISNULL(SUM(distancia_m) / 1000.0, 0)
    FROM segmentos
    WHERE segundos > 0
      AND distancia_m <= 1000
      AND (distancia_m / NULLIF(segundos, 0)) * 3.6 <= 130;

    -- Retornar resultado
    SELECT
        @carnet AS carnet,
        @fecha AS fecha,
        ISNULL(@completadas, 0) AS visitas_completadas,
        ISNULL(@en_curso, 0) AS visitas_en_curso,
        ISNULL(@pendientes, 0) AS visitas_pendientes,
        @total_agenda AS total_agenda,
        @meta_visitas AS meta_visitas,
        CASE WHEN @meta_visitas > 0
             THEN CAST((ISNULL(@completadas, 0) * 100.0 / @meta_visitas) AS DECIMAL(5,1))
             ELSE 0
        END AS cumplimiento_pct,
        @duracion_total AS duracion_total_min,
        @km_total AS km_total,
        CAST(@km_total * @costo_km AS DECIMAL(10,2)) AS costo_estimado,
        @costo_km AS costo_km_config,
        ISNULL(@fuera_zona, 0) AS visitas_fuera_zona;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_vc_resumen_dia_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_vc_resumen_dia_rust]
    @carnet varchar(20) = NULL,
    @fecha date = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_resumen_dia @carnet, @fecha;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_vc_tracking_batch]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

-- ============================================================
-- SP 6: sp_vc_tracking_batch
-- Inserta mÃºltiples puntos GPS en lote (sync offline)
-- ============================================================
CREATE   PROCEDURE [dbo].[sp_vc_tracking_batch]
    @carnet VARCHAR(20),
    @puntos NVARCHAR(MAX)  -- JSON array
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO vc_tracking_gps (carnet, lat, long, accuracy, velocidad, timestamp, fuente)
    SELECT
        @carnet,
        CAST(JSON_VALUE(p.value, '$.lat') AS DECIMAL(10,7)),
        CAST(JSON_VALUE(p.value, '$.lon') AS DECIMAL(10,7)),
        CAST(JSON_VALUE(p.value, '$.accuracy') AS DECIMAL(10,2)),
        CAST(JSON_VALUE(p.value, '$.velocidad') AS DECIMAL(10,2)),
        CAST(JSON_VALUE(p.value, '$.timestamp') AS DATETIME2),
        ISNULL(JSON_VALUE(p.value, '$.fuente'), 'FOREGROUND')
    FROM OPENJSON(@puntos) AS p;

    SELECT @@ROWCOUNT AS insertados;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_vc_tracking_batch_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_vc_tracking_batch_rust]
    @carnet varchar(20) = NULL,
    @puntos nvarchar(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_tracking_batch @carnet, @puntos;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_vc_tracking_por_dia]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE   PROCEDURE [dbo].[sp_vc_tracking_por_dia]
    @carnet VARCHAR(20),
    @fecha DATETIME = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @fecha IS NULL
        SET @fecha = CAST(GETDATE() AS DATE);
    ELSE
        SET @fecha = CAST(@fecha AS DATE);

    SELECT 
        id,
        CAST(lat AS FLOAT) AS lat,
        CAST(long AS FLOAT) AS lon,
        CAST(accuracy AS FLOAT) AS accuracy,
        CAST(velocidad AS FLOAT) AS velocidad,
        -- ConversiÃ³n de m/s a km/h
        CAST(velocidad * 3.6 AS FLOAT) AS velocidad_estimada_kmh,
        timestamp,
        fuente
    FROM vc_tracking_gps
    WHERE carnet = @carnet 
      AND CAST(timestamp AS DATE) = @fecha
    ORDER BY timestamp ASC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_vc_tracking_por_dia_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_vc_tracking_por_dia_rust]
    @carnet varchar(20) = NULL,
    @fecha datetime = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_vc_tracking_por_dia @carnet, @fecha;
END

GO
/****** Object:  StoredProcedure [dbo].[sp_vc_usuarios_con_tracking]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO
CREATE   PROCEDURE [dbo].[sp_vc_usuarios_con_tracking]
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        t.carnet,
        ISNULL(u.nombre, t.carnet) AS nombre_empleado,
        MAX(t.timestamp) AS ultimo_punto,
        COUNT(t.id) AS total_puntos
    FROM vc_tracking_gps t
    LEFT JOIN p_Usuarios u ON t.carnet = CAST(u.carnet AS VARCHAR(MAX))
    GROUP BY t.carnet, u.nombre
    ORDER BY MAX(t.timestamp) DESC;
END;
GO
/****** Object:  StoredProcedure [dbo].[sp_Visibilidad_ObtenerCarnets]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Visibilidad_ObtenerCarnets] @carnetSolicitante NVARCHAR(50) AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @c NVARCHAR(50) = LTRIM(RTRIM(ISNULL(@carnetSolicitante, N'')));
    IF @c = '' RETURN;

    DECLARE @esAdmin BIT = 0;
    SELECT @esAdmin = CASE WHEN rolGlobal IN ('Admin','Administrador','SuperAdmin') THEN 1 ELSE 0 END
    FROM p_Usuarios WHERE LTRIM(RTRIM(carnet)) = @c AND activo = 1;

    IF @esAdmin = 1
    BEGIN
        SELECT DISTINCT LTRIM(RTRIM(carnet)) AS carnet FROM p_Usuarios WHERE activo = 1 AND carnet IS NOT NULL AND carnet <> '';
        RETURN;
    END;

    CREATE TABLE #vis (carnet NVARCHAR(50) COLLATE SQL_Latin1_General_CP1_CI_AS PRIMARY KEY);
    INSERT INTO #vis VALUES (@c);

    ;WITH Sub AS (
        SELECT LTRIM(RTRIM(carnet)) AS carnet FROM p_Usuarios WHERE LTRIM(RTRIM(ISNULL(jefeCarnet,''))) = @c AND activo=1 AND carnet IS NOT NULL AND carnet<>''
        UNION ALL
        SELECT LTRIM(RTRIM(u.carnet)) FROM p_Usuarios u INNER JOIN Sub s ON LTRIM(RTRIM(ISNULL(u.jefeCarnet,''))) = s.carnet COLLATE SQL_Latin1_General_CP1_CI_AS WHERE u.activo=1 AND u.carnet IS NOT NULL AND u.carnet<>''
    )
    INSERT INTO #vis SELECT DISTINCT carnet FROM Sub WHERE carnet COLLATE SQL_Latin1_General_CP1_CI_AS NOT IN (SELECT carnet FROM #vis) OPTION(MAXRECURSION 5);

    INSERT INTO #vis SELECT DISTINCT LTRIM(RTRIM(pe.carnet_objetivo)) FROM p_permiso_empleado pe
    WHERE LTRIM(RTRIM(pe.carnet_recibe)) = @c COLLATE SQL_Latin1_General_CP1_CI_AS AND pe.activo=1 AND pe.tipo_acceso='ALLOW'
    AND pe.carnet_objetivo IS NOT NULL AND pe.carnet_objetivo<>''
    AND LTRIM(RTRIM(pe.carnet_objetivo)) COLLATE SQL_Latin1_General_CP1_CI_AS NOT IN (SELECT carnet FROM #vis);

    INSERT INTO #vis SELECT DISTINCT LTRIM(RTRIM(u.carnet)) FROM p_permiso_area pa
    INNER JOIN p_Usuarios u ON u.activo=1 AND u.carnet IS NOT NULL AND u.carnet<>''
    AND (LTRIM(RTRIM(ISNULL(u.primer_nivel,''))) = LTRIM(RTRIM(ISNULL(pa.nombre_area,''))) COLLATE SQL_Latin1_General_CP1_CI_AS
      OR LTRIM(RTRIM(ISNULL(u.subgerencia,''))) = LTRIM(RTRIM(ISNULL(pa.nombre_area,''))) COLLATE SQL_Latin1_General_CP1_CI_AS
      OR LTRIM(RTRIM(ISNULL(u.gerencia,''))) = LTRIM(RTRIM(ISNULL(pa.nombre_area,''))) COLLATE SQL_Latin1_General_CP1_CI_AS)
    WHERE LTRIM(RTRIM(pa.carnet_recibe)) = @c COLLATE SQL_Latin1_General_CP1_CI_AS AND pa.activo=1
    AND LTRIM(RTRIM(u.carnet)) COLLATE SQL_Latin1_General_CP1_CI_AS NOT IN (SELECT carnet FROM #vis);

    INSERT INTO #vis SELECT DISTINCT LTRIM(RTRIM(u.carnet)) FROM p_delegacion_visibilidad dv
    INNER JOIN p_Usuarios u ON LTRIM(RTRIM(ISNULL(u.jefeCarnet,''))) = LTRIM(RTRIM(dv.carnet_delegante)) COLLATE SQL_Latin1_General_CP1_CI_AS AND u.activo=1
    WHERE LTRIM(RTRIM(dv.carnet_delegado)) = @c COLLATE SQL_Latin1_General_CP1_CI_AS AND dv.activo=1 AND (dv.fecha_fin IS NULL OR dv.fecha_fin>=GETDATE())
    AND u.carnet IS NOT NULL AND u.carnet<>''
    AND LTRIM(RTRIM(u.carnet)) COLLATE SQL_Latin1_General_CP1_CI_AS NOT IN (SELECT carnet FROM #vis);

    DELETE v FROM #vis v WHERE EXISTS(
      SELECT 1 FROM p_permiso_empleado pe
      WHERE LTRIM(RTRIM(pe.carnet_recibe)) = @c COLLATE SQL_Latin1_General_CP1_CI_AS
      AND LTRIM(RTRIM(pe.carnet_objetivo)) = v.carnet COLLATE SQL_Latin1_General_CP1_CI_AS
      AND pe.activo=1 AND pe.tipo_acceso='DENY'
    );

    SELECT carnet FROM #vis ORDER BY carnet;
    DROP TABLE #vis;
END;

GO
/****** Object:  StoredProcedure [dbo].[sp_Visibilidad_ObtenerCarnets_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

CREATE PROCEDURE [dbo].[sp_Visibilidad_ObtenerCarnets_rust] @carnetSolicitante nvarchar(50) = NULL AS BEGIN SET NOCOUNT ON; EXEC dbo.sp_Visibilidad_ObtenerCarnets @carnetSolicitante; END;

GO
/****** Object:  StoredProcedure [dbo].[sp_Visibilidad_ObtenerMiEquipo]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Visibilidad_ObtenerMiEquipo]
(
    @idUsuario INT = NULL,
    @carnet    VARCHAR(20) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @carnetSolicitante VARCHAR(20) = NULLIF(LTRIM(RTRIM(@carnet)), '');

    IF @carnetSolicitante IS NULL AND @idUsuario IS NOT NULL
    BEGIN
        SELECT TOP (1) @carnetSolicitante = NULLIF(LTRIM(RTRIM(u.carnet)), '')
        FROM dbo.p_Usuarios u WHERE u.idUsuario = @idUsuario;
    END

    IF @carnetSolicitante IS NULL
    BEGIN
        SELECT CAST(NULL AS INT) AS idUsuario WHERE 1 = 0;
        RETURN;
    END

    IF OBJECT_ID('tempdb..#UsuariosActivos') IS NOT NULL DROP TABLE #UsuariosActivos;
    CREATE TABLE #UsuariosActivos (
        idUsuario INT NOT NULL, carnet VARCHAR(20) NOT NULL PRIMARY KEY, nombreCompleto NVARCHAR(200),
        correo NVARCHAR(200), cargo NVARCHAR(200), gerencia NVARCHAR(200), orgGerencia NVARCHAR(200),
        ogerencia NVARCHAR(200), subgerencia NVARCHAR(200), orgDepartamento NVARCHAR(200),
        departamento NVARCHAR(200), area NVARCHAR(200), idOrgBigInt BIGINT NULL, jefeCarnet VARCHAR(20),
        carnet_jefe2 VARCHAR(20), carnet_jefe3 VARCHAR(20), carnet_jefe4 VARCHAR(20),
        rolGlobal NVARCHAR(200), primer_nivel NVARCHAR(200)
    );

    INSERT INTO #UsuariosActivos
    SELECT u.idUsuario, NULLIF(LTRIM(RTRIM(u.carnet)), '') AS carnet, u.nombreCompleto, u.correo,
           u.cargo, u.gerencia, u.orgGerencia, u.ogerencia, u.subgerencia, u.orgDepartamento,
           u.departamento, u.area, TRY_CONVERT(BIGINT, u.idOrg), NULLIF(LTRIM(RTRIM(u.jefeCarnet)), ''),
           NULLIF(LTRIM(RTRIM(u.carnet_jefe2)), ''), NULLIF(LTRIM(RTRIM(u.carnet_jefe3)), ''),
           NULLIF(LTRIM(RTRIM(u.carnet_jefe4)), ''), u.rolGlobal, u.primer_nivel
    FROM dbo.p_Usuarios u WHERE u.activo = 1 AND NULLIF(LTRIM(RTRIM(u.carnet)), '') IS NOT NULL;

    -- ADMIN CHECK
    IF EXISTS (SELECT 1 FROM #UsuariosActivos u WHERE u.carnet = @carnetSolicitante AND (u.rolGlobal = 'Admin' OR u.rolGlobal LIKE '%Admin%'))
    BEGIN
        SELECT u.idUsuario, u.carnet, u.nombreCompleto, u.correo, u.cargo, u.gerencia,
               COALESCE(u.orgGerencia, u.ogerencia, u.gerencia) AS orgGerencia, u.subgerencia, u.area AS Area,
               COALESCE(u.orgDepartamento, u.subgerencia, u.departamento) AS orgDepartamento,
               COALESCE(u.area, u.departamento) AS departamento, u.idOrgBigInt AS idOrg, u.jefeCarnet,
               1 AS nivel, 'ADMIN' AS fuente
        FROM #UsuariosActivos u WHERE u.carnet <> @carnetSolicitante ORDER BY u.nombreCompleto;
        RETURN;
    END

    IF OBJECT_ID('tempdb..#Carnets') IS NOT NULL DROP TABLE #Carnets;
    CREATE TABLE #Carnets (carnet VARCHAR(20) NOT NULL, nivel INT NULL, fuente VARCHAR(30) NOT NULL, CONSTRAINT PK_#Carnets PRIMARY KEY (carnet, fuente));

    -- Raices (solicitante + delegantes)
    IF OBJECT_ID('tempdb..#Raices') IS NOT NULL DROP TABLE #Raices;
    CREATE TABLE #Raices (carnetRaiz VARCHAR(20) NOT NULL PRIMARY KEY, fuente VARCHAR(30) NOT NULL);
    INSERT INTO #Raices VALUES (@carnetSolicitante, 'SOLICITANTE');
    INSERT INTO #Raices SELECT DISTINCT NULLIF(LTRIM(RTRIM(dv.carnet_delegante)), ''), 'DELEGACION'
    FROM dbo.p_delegacion_visibilidad dv WHERE dv.activo = 1 AND NULLIF(LTRIM(RTRIM(dv.carnet_delegado)), '') = @carnetSolicitante
    AND NOT EXISTS (SELECT 1 FROM #Raices r WHERE r.carnetRaiz = NULLIF(LTRIM(RTRIM(dv.carnet_delegante)), ''));

    -- JERARQUIA DIRECTA (Recursiva)
    ;WITH SubordinadosCTE AS (
        SELECT LTRIM(RTRIM(u.carnet)) AS carnet, 1 AS nivel FROM #UsuariosActivos u
        INNER JOIN #Raices r ON LTRIM(RTRIM(ISNULL(u.jefeCarnet, ''))) = r.carnetRaiz 
        WHERE u.carnet <> @carnetSolicitante
        UNION ALL
        SELECT LTRIM(RTRIM(u.carnet)) AS carnet, s.nivel + 1 AS nivel FROM #UsuariosActivos u
        INNER JOIN SubordinadosCTE s ON LTRIM(RTRIM(ISNULL(u.jefeCarnet, ''))) = s.carnet
        WHERE u.carnet <> @carnetSolicitante
    )
    INSERT INTO #Carnets(carnet, nivel, fuente) SELECT DISTINCT carnet, MIN(nivel), 'JERARQUIA' FROM SubordinadosCTE GROUP BY carnet OPTION (MAXRECURSION 5);

    -- PERMISOS EMPLEADO (ALLOW) - Usar carnet_objetivo en lugar de carnet_otorga
    INSERT INTO #Carnets(carnet, nivel, fuente)
    SELECT DISTINCT NULLIF(LTRIM(RTRIM(pe.carnet_objetivo)), ''), 1, 'PERMISO_EMPLEADO'
    FROM dbo.p_permiso_empleado pe INNER JOIN #Raices r ON NULLIF(LTRIM(RTRIM(pe.carnet_recibe)), '') = r.carnetRaiz
    WHERE pe.activo = 1 AND ISNULL(pe.tipo_acceso, 'ALLOW') = 'ALLOW'
      AND NULLIF(LTRIM(RTRIM(pe.carnet_objetivo)), '') IS NOT NULL AND pe.carnet_objetivo <> @carnetSolicitante;

    -- PERMISOS AREA - Corregido para no usar p_organizacion_nodos sino machear nombre_area directamente como hicimos arriba
    INSERT INTO #Carnets(carnet, nivel, fuente)
    SELECT DISTINCT u.carnet, 1, 'PERMISO_AREA'
    FROM dbo.p_permiso_area pa
    INNER JOIN #Raices r ON NULLIF(LTRIM(RTRIM(pa.carnet_recibe)), '') = r.carnetRaiz
    INNER JOIN #UsuariosActivos u ON 
      LTRIM(RTRIM(ISNULL(pa.nombre_area,''))) = LTRIM(RTRIM(ISNULL(u.primer_nivel,''))) COLLATE SQL_Latin1_General_CP1_CI_AS
      OR LTRIM(RTRIM(ISNULL(pa.nombre_area,''))) = LTRIM(RTRIM(ISNULL(u.subgerencia,''))) COLLATE SQL_Latin1_General_CP1_CI_AS
      OR LTRIM(RTRIM(ISNULL(pa.nombre_area,''))) = LTRIM(RTRIM(ISNULL(u.gerencia,''))) COLLATE SQL_Latin1_General_CP1_CI_AS
      OR (pa.idorg_raiz > 0 AND u.idOrgBigInt = pa.idorg_raiz)
    WHERE pa.activo = 1 AND ISNULL(pa.tipo_acceso, 'ALLOW') = 'ALLOW' AND u.carnet <> @carnetSolicitante;

    -- DENY POR EMPLEADO
    DELETE c FROM #Carnets c WHERE EXISTS (
        SELECT 1 FROM dbo.p_permiso_empleado pe INNER JOIN #Raices r ON NULLIF(LTRIM(RTRIM(pe.carnet_recibe)), '') = r.carnetRaiz
        WHERE pe.activo = 1 AND pe.tipo_acceso = 'DENY' AND NULLIF(LTRIM(RTRIM(pe.carnet_objetivo)), '') = c.carnet COLLATE SQL_Latin1_General_CP1_CI_AS
    );

    -- Resultado Final, removiendo duplicados priorizando la misma forma
    ;WITH Unicos AS (
        SELECT c.carnet, c.nivel, c.fuente, ROW_NUMBER() OVER (
            PARTITION BY c.carnet ORDER BY CASE c.fuente WHEN 'JERARQUIA' THEN 1 WHEN 'PERMISO_EMPLEADO' THEN 2 WHEN 'PERMISO_AREA' THEN 3 ELSE 9 END, ISNULL(c.nivel, 999)
        ) AS rn FROM #Carnets c
    )
    SELECT u.idUsuario, u.carnet, u.nombreCompleto, u.correo, u.cargo, u.gerencia,
           COALESCE(u.orgGerencia, u.ogerencia, u.gerencia) AS orgGerencia, u.subgerencia, u.area AS Area,
           COALESCE(u.orgDepartamento, u.subgerencia, u.departamento) AS orgDepartamento,
           u.departamento AS departamento, u.idOrgBigInt AS idOrg, u.jefeCarnet, x.nivel, x.fuente
    FROM Unicos x INNER JOIN #UsuariosActivos u ON u.carnet = x.carnet COLLATE SQL_Latin1_General_CP1_CI_AS
    WHERE x.rn = 1 ORDER BY u.nombreCompleto;
END;

GO
/****** Object:  StoredProcedure [dbo].[sp_Visibilidad_ObtenerMiEquipo_rust]    Script Date: 14/3/2026 22:46:00 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER OFF
GO

CREATE PROCEDURE [dbo].[sp_Visibilidad_ObtenerMiEquipo_rust]
    @idUsuario int = NULL,
    @carnet varchar(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.sp_Visibilidad_ObtenerMiEquipo @idUsuario, @carnet;
END

GO
USE [master]
GO
ALTER DATABASE [Bdplaner] SET  READ_WRITE 
GO
