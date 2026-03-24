
# Plan Detallado de Migración Automatizada (JS)

Este plan utiliza un **script personalizado de Node.js/TypeScript** (`migrate_rds_to_linux.ts`) para mover la base de datos `Bdplaner` de AWS RDS a su servidor Linux local. Este enfoque ofrece control total y permite mantener los IDs autoincrementales sin problemas.

## 1. Prerequisitos

### Datos de Conexión
El script ya está pre-configurado con las credenciales que proporcionó:
*   **Origen:** AWS RDS (Usuario `plan`, DB `Bdplaner`, Puerto 1433)
*   **Destino:** Servidor Linux `190.56.16.85` (Usuario `sa`, Password `TuPasswordFuerte!2026`)
*   Se usará la propiedad `TrustServerCertificate: true` para conectar exitosamente al servidor Linux.

### Entorno
*   El script corre en el entorno actual del backend (`d:\planificacion\backend`).
*   Usa las librerías `mssql` y `dotenv` ya instaladas en el proyecto.

---

## 2. Lógica del Script de Migración (`migrate_rds_to_linux.ts`)

El script realiza la migración en 5 fases automatizadas:

### Fase 1: Conexión y Setup
1.  Se conecta al **Origen** (RDS) para leer metadatos.
2.  Se conecta al **Destino** (Linux/master) para verificar si existe la base de datos `Bdplaner`.
3.  Si no existe, la crea automáticamente (`CREATE DATABASE [Bdplaner]`).

### Fase 2: Lectura de Estructura
1.  Extrae la lista de todas las tablas (`INFORMATION_SCHEMA.TABLES`).
2.  Para cada tabla, inspecciona sus columnas, tipos de datos y nulabilidad.
3.  Detecta si la tabla tiene una columna **IDENTITY** (Auto Incremental).

### Fase 3: Migración de Tablas (Ciclo por cada Tabla)
1.  **DDL Dinámico:** Genera un `CREATE TABLE` en el destino basado en la estructura del origen.
2.  **IDENTITY Handling:**
    *   Si la tabla tiene columna Identity (ej: `idUsuario`), el script activa `SET IDENTITY_INSERT [Tabla] ON` antes de insertar.
    *   Esto garantiza que los IDs del destino sean **EXACTAMENTE IGUALES** a los del origen (ej: Usuario 5 seguirá siendo 5).
3.  **Transferencia de Datos:**
    *   Lee los datos del origen en modo *Streaming* (para no saturar memoria RAM).
    *   Inserta en lotes de 1000 registros en el destino.
    *   Muestra una barra de progreso en consola.

### Fase 4: Migración de Lógica (Stored Procedures / Views)
1.  Lee el código fuente de todos los procedimientos almacenados, vistas, funciones y triggers desde `sys.sql_modules` del origen.
2.  Los re-crea en el destino.
    *   *Nota:* Este paso puede generar advertencias si hay dependencias desordenadas, pero intentará crear todos los objetos.

---

## 3. Instrucciones de Ejecución

Como el script está escrito en TypeScript, debe ejecutarlo usando `ts-node` (o compilarlo). Siga estos pasos en su terminal:

1.  **Navegar al directorio:**
    ```powershell
    cd d:\planificacion\backend
    ```

2.  **Ejecutar la migración:**
    ```powershell
    npx ts-node scripts/migrate_rds_to_linux.ts
    ```

3.  **Monitorear el proceso:**
    *   Verá logs en tiempo real: `🔄 Procesando [dbo].[p_Usuarios]...`
    *   Si ocurre algún error en una tabla específica, el script lo reportará pero intentará continuar con las siguientes.

---

## 4. Post-Migración (Validación)

Una vez que el script diga "🎉 MIGRACIÓN FINALIZADA CORRECTAMENTE":

1.  **Cambiar `.env`:** Actualice su archivo `.env` para apuntar al nuevo servidor (Host `190.56.16.85`).
2.  **Probar Backend:** Inicie su servidor (`npm run dev`) y verifique que conecta.
3.  **Verificar IDs Clave:** Haga queries simples para confirmar que IDs importantes (como su usuario Admin) son los correctos:
    ```sql
    SELECT idUsuario, correo, carnet FROM p_Usuarios WHERE idUsuario = [SuID];
    ```

## 5. Rollback (Si falla)

Si algo sale mal, simplemente no cambie el archivo `.env`. Su aplicación seguirá conectada al AWS RDS original sin interrupción. Puede borrar la base de datos en el servidor Linux (`DROP DATABASE Bdplaner`) y volver a correr el script corregido.
