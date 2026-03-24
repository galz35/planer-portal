import * as sql from 'mssql';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '.env') });

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || '54.146.235.205',
    database: process.env.MSSQL_DATABASE || 'Bdplaner',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        requestTimeout: 300000 // 5 minutos
    },
    connectionTimeout: 60000, // 1 minuto
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

async function manualBackup() {
    const backupDir = path.join('d:\\planificacion', 'respaldo sql server');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `manual_backup_${config.database}_${timestamp}.sql`;
    const filePath = path.join(backupDir, fileName);
    const stream = fs.createWriteStream(filePath);

    try {
        console.log(`Iniciando respaldo manual en: ${filePath}`);
        const pool = await sql.connect(config);

        // 1. Get all tables
        const tablesResult = await pool.request().query("SELECT name FROM sys.tables ORDER BY name");
        let tables = tablesResult.recordset.map(r => r.name);

        stream.write(`-- Manual Backup for ${config.database}\n`);
        stream.write(`-- Date: ${new Date().toISOString()}\n\n`);

        for (const table of tables) {
            console.log(`Procesando tabla: ${table}...`);
            stream.write(`-- Table: ${table}\n`);

            // Get columns
            const columnsResult = await pool.request().query(`
                SELECT COLUMN_NAME, DATA_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '${table}'
                ORDER BY ORDINAL_POSITION
            `);
            const columns = columnsResult.recordset.map(c => c.COLUMN_NAME);

            // Get data
            const dataResult = await pool.request().query(`SELECT * FROM [${table}]`);

            if (dataResult.recordset.length > 0) {
                // Check if table has identity
                const hasIdentity = await pool.request().query(`
                    SELECT OBJECTPROPERTY(OBJECT_ID('${table}'), 'TableHasIdentity') as hasIdentity
                `);

                const setIdentity = hasIdentity.recordset[0].hasIdentity === 1;

                if (setIdentity) {
                    stream.write(`SET IDENTITY_INSERT [${table}] ON;\n`);
                }

                for (const row of dataResult.recordset) {
                    const values = columns.map(col => {
                        const val = row[col];
                        if (val === null) return 'NULL';
                        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                        if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                        if (typeof val === 'boolean') return val ? 1 : 0;
                        if (typeof val === 'object' && Buffer.isBuffer(val)) return `0x${val.toString('hex')}`;
                        return val;
                    });

                    stream.write(`INSERT INTO [${table}] (${columns.map(c => `[${c}]`).join(', ')}) VALUES (${values.join(', ')});\n`);
                }

                if (setIdentity) {
                    stream.write(`SET IDENTITY_INSERT [${table}] OFF;\n`);
                }
            }
            stream.write(`GO\n\n`);
        }

        // 2. Get Stored Procedures
        console.log(`Procesando Stored Procedures...`);
        const procsResult = await pool.request().query(`
            SELECT sm.definition 
            FROM sys.sql_modules sm
            JOIN sys.objects o ON sm.object_id = o.object_id
            WHERE o.type = 'P'
        `);

        stream.write(`-- STORED PROCEDURES\n`);
        for (const proc of procsResult.recordset) {
            stream.write(`GO\n${proc.definition}\nGO\n`);
        }

        // 3. Get Functions
        console.log(`Procesando Funciones...`);
        const funcsResult = await pool.request().query(`
            SELECT sm.definition 
            FROM sys.sql_modules sm
            JOIN sys.objects o ON sm.object_id = o.object_id
            WHERE o.type IN ('FN', 'IF', 'TF')
        `);

        stream.write(`\n-- FUNCTIONS\n`);
        for (const func of funcsResult.recordset) {
            stream.write(`GO\n${func.definition}\nGO\n`);
        }

        // 4. Get Views
        console.log(`Procesando Views...`);
        const viewsResult = await pool.request().query(`
            SELECT sm.definition 
            FROM sys.sql_modules sm
            JOIN sys.objects o ON sm.object_id = o.object_id
            WHERE o.type = 'V'
        `);

        stream.write(`\n-- VIEWS\n`);
        for (const view of viewsResult.recordset) {
            stream.write(`GO\n${view.definition}\nGO\n`);
        }

        await pool.close();
        stream.end();
        console.log(`✅ Respaldo completado exitosamente: ${fileName}`);

    } catch (err) {
        console.error('❌ Error durante el respaldo:', err);
        stream.end();
    }
}

manualBackup();
