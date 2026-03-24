
import { ejecutarQuery } from './src/db/base.repo';

async function run() {
    try {
        const dbName = process.env.MSSQL_DATABASE || 'Bdplaner';
        const tables = await ejecutarQuery(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME LIKE 'p_%' AND TABLE_TYPE = 'BASE TABLE'
        `);

        let sql = `-- ------------------------------------------------------------------\n`;
        sql += `-- SQL SCRIPT PARA CREAR USUARIO candida CON ACCESO A TABLAS p_\n`;
        sql += `-- ------------------------------------------------------------------\n\n`;
        sql += `USE [${dbName}];\nGO\n\n`;
        sql += `-- 1. Crear Login en el servidor\n`;
        sql += `IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'candida')\n`;
        sql += `BEGIN\n    CREATE LOGIN candida WITH PASSWORD = 'Candida123';\nEND\nGO\n\n`;
        sql += `-- 2. Crear Usuario en la base de datos\n`;
        sql += `IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'candida')\n`;
        sql += `BEGIN\n    CREATE USER candida FOR LOGIN candida;\nEND\nGO\n\n`;
        sql += `-- 3. Asegurar que no tenga roles por defecto que den acceso extra\n`;
        sql += `IF IS_ROLEMEMBER('db_datareader', 'candida') = 1 ALTER ROLE db_datareader DROP MEMBER candida;\n`;
        sql += `IF IS_ROLEMEMBER('db_datawriter', 'candida') = 1 ALTER ROLE db_datawriter DROP MEMBER candida;\nGO\n\n`;
        sql += `-- 4. Asignar permisos sobre las tablas que empiezan con p_\n`;

        tables.forEach(t => {
            sql += `GRANT SELECT, INSERT, UPDATE, DELETE ON dbo.[${t.TABLE_NAME}] TO candida;\n`;
        });

        console.log(sql);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
