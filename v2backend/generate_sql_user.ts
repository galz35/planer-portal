
import { ejecutarQuery } from './src/db/base.repo';

async function run() {
    try {
        const dbName = process.env.MSSQL_DATABASE || 'Bdplaner';
        console.log(`Generando comandos para la base de datos: ${dbName}`);

        // 1. Crear el Login y el Usuario
        let sql = `
-- 1. CREAR LOGIN EN EL SERVIDOR
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'candida')
BEGIN
    CREATE LOGIN candida WITH PASSWORD = 'Candida123';
END
GO

-- 2. CREAR USUARIO EN LA BASE DE DATOS
USE [${dbName}];
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'candida')
BEGIN
    CREATE USER candida FOR LOGIN candida;
END
GO

-- 3. REMOVER ROLES POR DEFECTO (SEGURIDAD)
ALTER ROLE db_datareader DROP MEMBER candida;
ALTER ROLE db_datawriter DROP MEMBER candida;
GO

-- 4. ASIGNAR PERMISOS SELECT A TODAS LAS TABLAS QUE EMPIECEN CON p_
`;

        // Obtener las tablas p_
        const tables = await ejecutarQuery(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME LIKE 'p_%' AND TABLE_TYPE = 'BASE TABLE'
        `);

        if (tables.length === 0) {
            console.log("No se encontraron tablas que empiecen con p_");
        } else {
            tables.forEach(t => {
                sql += `GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[${t.TABLE_NAME}] TO candida;\n`;
            });
        }

        console.log("\n--- COPIA Y PEGA ESTOS COMANDOS EN SQL SERVER MANAGEMENT STUDIO ---\n");
        console.log(sql);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
