import * as sql from 'mssql';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '.env') });

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost',
    database: process.env.MSSQL_DATABASE || 'Bdplaner',
    options: { encrypt: true, trustServerCertificate: true, requestTimeout: 300000 }
};

const OUTPUT_FILE = path.join('d:\\planificacion', 'respaldo sql server', '2_DATOS_REALES.sql');

async function exportData() {
    const stream = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });
    try {
        console.log('🚀 Extrayendo Datos (Registros)...');
        const pool = await sql.connect(config);
        stream.write(`-- RESPALDO DE DATOS\nUSE [${config.database}];\nGO\n\n`);

        const tables = await pool.request().query("SELECT s.name as esq, o.name as nom FROM sys.objects o JOIN sys.schemas s ON s.schema_id = o.schema_id WHERE o.type = 'U' AND o.is_ms_shipped = 0");

        for (const t of tables.recordset) {
            console.log(`  Exportando datos de: ${t.nom}...`);
            stream.write(`-- Tabla: ${t.nom}\n`);

            const hasIdentity = await pool.request().input('n', t.nom).query("SELECT OBJECTPROPERTY(OBJECT_ID(@n), 'TableHasIdentity') as idEN");
            const setID = hasIdentity.recordset[0].idEN === 1;

            const colsRes = await pool.request().input('e', t.esq).input('n', t.nom).query("SELECT name FROM sys.columns WHERE object_id = OBJECT_ID(@e + '.' + @n) AND is_computed = 0");
            const colNames = colsRes.recordset.map(c => `[${c.name}]`);

            const data = await pool.request().query(`SELECT * FROM [${t.esq}].[${t.nom}]`);

            if (data.recordset.length > 0) {
                if (setID) stream.write(`SET IDENTITY_INSERT [${t.esq}].[${t.nom}] ON;\n`);

                for (const row of data.recordset) {
                    const vals = Object.keys(row).map(k => {
                        const v = row[k];
                        if (v === null) return 'NULL';
                        if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
                        if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
                        if (typeof v === 'boolean') return v ? 1 : 0;
                        if (Buffer.isBuffer(v)) return `0x${v.toString('hex')}`;
                        return v;
                    });
                    stream.write(`INSERT INTO [${t.esq}].[${t.nom}] (${colNames.join(', ')}) VALUES (${vals.join(', ')});\n`);
                }

                if (setID) stream.write(`SET IDENTITY_INSERT [${t.esq}].[${t.nom}] OFF;\n`);
                stream.write(`GO\n\n`);
            }
        }

        await pool.close();
        stream.end();
        console.log('✅ Datos guardados en 2_DATOS_REALES.sql');
    } catch (e) { console.error(e); stream.end(); }
}
exportData();
