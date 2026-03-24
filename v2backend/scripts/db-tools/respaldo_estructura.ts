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
    options: { encrypt: true, trustServerCertificate: true, requestTimeout: 120000 }
};

const OUTPUT_FILE = path.join('d:\\planificacion', 'respaldo sql server', '1_ESTRUCTURA_REAL.sql');

async function exportSchema() {
    const stream = fs.createWriteStream(OUTPUT_FILE, { encoding: 'utf8' });
    try {
        console.log('🚀 Extrayendo Estructura (DDL)...');
        const pool = await sql.connect(config);
        stream.write(`-- ESTRUCTURA COMPLETA\nUSE [${config.database}];\nGO\n\n`);

        // Tablas
        const tables = await pool.request().query("SELECT s.name as esq, o.name as nom FROM sys.objects o JOIN sys.schemas s ON s.schema_id = o.schema_id WHERE o.type = 'U' AND o.is_ms_shipped = 0");
        for (const t of tables.recordset) {
            console.log(`  Tabla: ${t.nom}`);
            const resCols = await pool.request().input('e', t.esq).input('n', t.nom).query(`
                SELECT c.name, t.name as tipo, c.max_length, c.precision, c.scale, c.is_nullable, c.is_identity, ic.seed_value, ic.increment_value, dc.definition as def, cc.definition as comp
                FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id LEFT JOIN sys.identity_columns ic ON ic.object_id = c.object_id AND ic.column_id = c.column_id LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id LEFT JOIN sys.computed_columns cc ON cc.object_id = c.object_id AND cc.column_id = c.column_id
                WHERE OBJECT_SCHEMA_NAME(c.object_id) = @e AND OBJECT_NAME(c.object_id) = @n ORDER BY c.column_id
            `);
            let cols = resCols.recordset.map(r => {
                if (r.comp) return `    [${r.name}] AS ${r.comp}`;
                let type = r.tipo.toLowerCase();
                let fmt = (['varchar', 'char', 'varbinary', 'binary'].includes(type)) ? `${r.tipo}(${r.max_length === -1 ? 'max' : r.max_length})` : (['nvarchar', 'nchar'].includes(type) ? `${r.tipo}(${r.max_length === -1 ? 'max' : r.max_length / 2})` : (['decimal', 'numeric'].includes(type) ? `${r.tipo}(${r.precision},${r.scale})` : r.tipo));
                return `    [${r.name}] ${fmt}${r.is_identity ? ` IDENTITY(${r.seed_value},${r.increment_value})` : ''} ${r.is_nullable ? 'NULL' : 'NOT NULL'}${r.def ? ' DEFAULT ' + r.def : ''}`;
            });
            const resPk = await pool.request().input('e', t.esq).input('n', t.nom).query("SELECT col.name FROM sys.key_constraints kc JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id JOIN sys.columns col ON col.object_id = ic.object_id AND col.column_id = ic.column_id WHERE kc.type = 'PK' AND OBJECT_SCHEMA_NAME(kc.parent_object_id) = @e AND OBJECT_NAME(kc.parent_object_id) = @n");
            if (resPk.recordset.length > 0) cols.push(`    PRIMARY KEY (${resPk.recordset.map(r => `[${r.name}]`).join(', ')})`);
            stream.write(`CREATE TABLE [${t.esq}].[${t.nom}] (\n${cols.join(',\n')}\n);\nGO\n\n`);
        }

        // Módulos (Vistas, Procs, Funciones)
        const modules = await pool.request().query("SELECT s.name as esq, o.name as nom, o.type_desc FROM sys.objects o JOIN sys.schemas s ON s.schema_id = o.schema_id WHERE o.type IN ('V','P','FN','IF','TF') AND o.is_ms_shipped = 0");
        for (const m of modules.recordset) {
            console.log(`  ${m.type_desc}: ${m.nom}`);
            const res = await pool.request().input('e', m.esq).input('n', m.nom).query("SELECT definition FROM sys.sql_modules WHERE object_id = OBJECT_ID(@e + '.' + @n)");
            if (res.recordset[0]?.definition) stream.write(`${res.recordset[0].definition}\nGO\n\n`);
        }

        await pool.close();
        stream.end();
        console.log('✅ Estructura guardada en 1_ESTRUCTURA_REAL.sql');
    } catch (e) { console.error(e); stream.end(); }
}
exportSchema();
