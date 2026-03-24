
import * as sql from 'mssql';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Cargar .env
dotenv.config({ path: path.join(__dirname, '.env') });

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || 'localhost',
    database: process.env.MSSQL_DATABASE || 'Bdplaner',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        requestTimeout: 60000
    }
};

const BASE_DIR = 'd:\\planificacion';
const UNIFIED_FILE = path.join(BASE_DIR, 'respaldo sql server', 'ESTRUCTURA_REAL_COMPLETA.sql');
const DDL_EXPORT_DIR = path.join(BASE_DIR, 'ddl_export');

// Asegurar directorios
function ensureDirs() {
    [
        path.dirname(UNIFIED_FILE),
        DDL_EXPORT_DIR,
        path.join(DDL_EXPORT_DIR, 'Tables'),
        path.join(DDL_EXPORT_DIR, 'Views'),
        path.join(DDL_EXPORT_DIR, 'Functions'),
        path.join(DDL_EXPORT_DIR, 'Procedures'),
        path.join(DDL_EXPORT_DIR, 'Triggers')
    ].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });
}

function saveIndividualFile(subfolder: string, filename: string, content: string) {
    const filePath = path.join(DDL_EXPORT_DIR, subfolder, filename);
    fs.writeFileSync(filePath, content, { encoding: 'utf8' });
}

async function exportFullSchema() {
    ensureDirs();
    const stream = fs.createWriteStream(UNIFIED_FILE, { encoding: 'utf8' });

    try {
        console.log(`🚀 Iniciando exportación completa de BD: ${config.database}`);
        const pool = await sql.connect(config);

        const header = `-- ESTRUCTURA COMPLETA DE LA BASE DE DATOS: ${config.database}\n-- Fecha: ${new Date().toISOString()}\n\nUSE [${config.database}];\nGO\n\n`;
        stream.write(header);

        // 1. TABLAS
        console.log('📦 Extrayendo tablas...');
        const tables = await pool.request().query(`
            SELECT s.name as esquema, o.name as nombre 
            FROM sys.objects o JOIN sys.schemas s ON s.schema_id = o.schema_id 
            WHERE o.type = 'U' AND o.is_ms_shipped = 0 ORDER BY o.name
        `);

        for (const table of tables.recordset) {
            const fullName = `[${table.esquema}].[${table.nombre}]`;
            stream.write(`-- ******************************************************\n-- TABLA: ${fullName}\n-- ******************************************************\n`);

            const ddl = await generarScriptTabla(pool, table.esquema, table.nombre);
            stream.write(ddl + '\n\n');
            saveIndividualFile('Tables', `${table.esquema}.${table.nombre}.sql`, ddl);
        }

        // 2. VISTAS
        console.log('👁️ Extrayendo vistas...');
        const views = await pool.request().query(`
            SELECT s.name as esquema, o.name as nombre 
            FROM sys.objects o JOIN sys.schemas s ON s.schema_id = o.schema_id 
            WHERE o.type = 'V' AND o.is_ms_shipped = 0 ORDER BY o.name
        `);
        for (const v of views.recordset) {
            stream.write(`-- VISTA: [${v.esquema}].[${v.nombre}]\n`);
            const ddl = await generarScriptModulo(pool, v.esquema, v.nombre);
            stream.write(ddl + '\n\n');
            saveIndividualFile('Views', `${v.esquema}.${v.nombre}.sql`, ddl);
        }

        // 3. FUNCIONES
        console.log('🔧 Extrayendo funciones...');
        const funcs = await pool.request().query(`
            SELECT s.name as esquema, o.name as nombre 
            FROM sys.objects o JOIN sys.schemas s ON s.schema_id = o.schema_id 
            WHERE o.type IN ('FN', 'IF', 'TF') AND o.is_ms_shipped = 0 ORDER BY o.name
        `);
        for (const f of funcs.recordset) {
            stream.write(`-- FUNCION: [${f.esquema}].[${f.nombre}]\n`);
            const ddl = await generarScriptModulo(pool, f.esquema, f.nombre);
            stream.write(ddl + '\n\n');
            saveIndividualFile('Functions', `${f.esquema}.${f.nombre}.sql`, ddl);
        }

        // 4. PROCEDIMIENTOS
        console.log('⚡ Extrayendo procedimientos...');
        const procs = await pool.request().query(`
            SELECT s.name as esquema, o.name as nombre 
            FROM sys.objects o JOIN sys.schemas s ON s.schema_id = o.schema_id 
            WHERE o.type = 'P' AND o.is_ms_shipped = 0 ORDER BY o.name
        `);
        for (const p of procs.recordset) {
            stream.write(`-- PROCEDIMIENTO: [${p.esquema}].[${p.nombre}]\n`);
            const ddl = await generarScriptModulo(pool, p.esquema, p.nombre);
            stream.write(ddl + '\n\n');
            saveIndividualFile('Procedures', `${p.esquema}.${p.nombre}.sql`, ddl);
        }

        // 5. TRIGGERS
        console.log('🔫 Extrayendo triggers...');
        const triggers = await pool.request().query(`
            SELECT s.name as esquema, o.name as nombre, p.name as tabla_padre
            FROM sys.objects o 
            JOIN sys.schemas s ON s.schema_id = o.schema_id 
            JOIN sys.objects p ON o.parent_object_id = p.object_id
            WHERE o.type = 'TR' AND o.is_ms_shipped = 0 ORDER BY o.name
        `);
        for (const t of triggers.recordset) {
            stream.write(`-- TRIGGER: [${t.esquema}].[${t.nombre}] ON [${t.tabla_padre}]\n`);
            const ddl = await generarScriptModulo(pool, t.esquema, t.nombre);
            stream.write(ddl + '\n\n');
            saveIndividualFile('Triggers', `${t.esquema}.${t.nombre}.sql`, ddl);
        }

        await pool.close();
        stream.end();
        console.log(`\n✅ Archivo UNIFICADO generado: ${UNIFIED_FILE}`);
        console.log(`✅ Archivos INDIVIDUALES generados en: ${DDL_EXPORT_DIR}`);

    } catch (err) {
        console.error('❌ Error:', err);
        stream.end();
        process.exit(1);
    }
}

async function generarScriptModulo(pool: sql.ConnectionPool, esquema: string, nombre: string) {
    const res = await pool.request()
        .input('e', esquema).input('n', nombre)
        .query(`SELECT m.definition FROM sys.sql_modules m JOIN sys.objects o ON o.object_id = m.object_id JOIN sys.schemas s ON s.schema_id = o.schema_id WHERE s.name = @e AND o.name = @n`);

    // Cleanup de "CREATE OR ALTER" si queremos ser puros, o dejarlo.
    // Añadimos GO al final.
    return res.recordset[0]?.definition ? res.recordset[0].definition.trim() + '\nGO' : '-- Definición no disponible';
}

async function generarScriptTabla(pool: sql.ConnectionPool, esquema: string, nombre: string) {
    // Columnas
    const resCols = await pool.request()
        .input('e', esquema).input('n', nombre)
        .query(`
            SELECT c.name as columna, t.name as tipo, c.max_length, c.precision, c.scale, c.is_nullable, c.is_identity, ic.seed_value, ic.increment_value, dc.definition as default_def, cc.definition as computed_def
            FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id LEFT JOIN sys.identity_columns ic ON ic.object_id = c.object_id AND ic.column_id = c.column_id LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id LEFT JOIN sys.computed_columns cc ON cc.object_id = c.object_id AND cc.column_id = c.column_id JOIN sys.objects o ON o.object_id = c.object_id JOIN sys.schemas s ON s.schema_id = o.schema_id
            WHERE s.name = @e AND o.name = @n ORDER BY c.column_id
        `);

    let cols: string[] = [];
    for (const r of resCols.recordset) {
        if (r.computed_def) { cols.push(`    [${r.columna}] AS ${r.computed_def}`); continue; }
        let typeFmt = formatType(r.tipo, r.max_length, r.precision, r.scale);
        let identity = r.is_identity ? ` IDENTITY(${r.seed_value},${r.increment_value})` : '';
        cols.push(`    [${r.columna}] ${typeFmt}${identity} ${r.is_nullable ? 'NULL' : 'NOT NULL'}${r.default_def ? ' DEFAULT ' + r.default_def : ''}`);
    }

    // PK
    const resPk = await pool.request().input('e', esquema).input('n', nombre)
        .query(`SELECT kc.name as pk_name, col.name as col_name 
                FROM sys.key_constraints kc 
                JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id 
                JOIN sys.columns col ON col.object_id = ic.object_id AND col.column_id = ic.column_id 
                WHERE kc.type = 'PK' AND OBJECT_SCHEMA_NAME(kc.parent_object_id) = @e AND OBJECT_NAME(kc.parent_object_id) = @n
                ORDER BY ic.index_column_id`);

    if (resPk.recordset.length > 0) {
        // Agrupar columnas PK
        const pkName = resPk.recordset[0].pk_name;
        const pkCols = resPk.recordset.map(r => `[${r.col_name}]`).join(', ');
        cols.push(`    CONSTRAINT [${pkName}] PRIMARY KEY (${pkCols})`);
    }

    let script = `IF OBJECT_ID('[${esquema}].[${nombre}]', 'U') IS NOT NULL DROP TABLE [${esquema}].[${nombre}]\nGO\n`;
    script += `CREATE TABLE [${esquema}].[${nombre}] (\n${cols.join(',\n')}\n);\nGO\n`;

    // Foreign Keys
    const resFk = await pool.request().input('e', esquema).input('n', nombre)
        .query(`SELECT fk.name as fk_name, s2.name as s_ref, t2.name as t_ref, c1.name as c_orig, c2.name as c_ref 
                FROM sys.foreign_keys fk 
                JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id 
                JOIN sys.tables t1 ON t1.object_id = fk.parent_object_id 
                JOIN sys.columns c1 ON c1.object_id = t1.object_id AND c1.column_id = fkc.parent_column_id 
                JOIN sys.tables t2 ON t2.object_id = fk.referenced_object_id 
                JOIN sys.schemas s2 ON s2.schema_id = t2.schema_id 
                JOIN sys.columns c2 ON c2.object_id = t2.object_id AND c2.column_id = fkc.referenced_column_id 
                WHERE OBJECT_SCHEMA_NAME(t1.object_id) = @e AND t1.name = @n`);

    resFk.recordset.forEach(r => {
        script += `ALTER TABLE [${esquema}].[${nombre}] ADD CONSTRAINT [${r.fk_name}] FOREIGN KEY ([${r.c_orig}]) REFERENCES [${r.s_ref}].[${r.t_ref}] ([${r.c_ref}]);\nGO\n`;
    });

    // Indices (excepto PK)
    const resIdx = await pool.request().input('e', esquema).input('n', nombre)
        .query(`
            SELECT i.name as index_name, i.type_desc, i.is_unique, i.filter_definition,
                   STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal) as cols,
                   STRING_AGG(CASE WHEN ic.is_included_column = 1 THEN c.name ELSE NULL END, ', ') as includes
            FROM sys.indexes i
            JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
            JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            JOIN sys.objects o ON o.object_id = i.object_id
            JOIN sys.schemas s ON s.schema_id = o.schema_id
            WHERE s.name = @e AND o.name = @n AND i.is_primary_key = 0 AND i.type_desc <> 'HEAP'
            GROUP BY i.name, i.type_desc, i.is_unique, i.filter_definition
        `);

    resIdx.recordset.forEach(idx => {
        const unique = idx.is_unique ? 'UNIQUE ' : '';
        const include = idx.includes ? ` INCLUDE (${idx.includes})` : '';
        const filter = idx.filter_definition ? ` WHERE ${idx.filter_definition}` : '';
        script += `CREATE ${unique}NONCLUSTERED INDEX [${idx.index_name}] ON [${esquema}].[${nombre}] (${idx.cols})${include}${filter};\nGO\n`;
    });

    return script;
}

function formatType(tipo: string, max_length: number, precision: number, scale: number) {
    const t = tipo.toLowerCase();
    if (['varchar', 'char', 'varbinary', 'binary'].includes(t)) return `${tipo}(${max_length === -1 ? 'max' : max_length})`;
    if (['nvarchar', 'nchar'].includes(t)) return `${tipo}(${max_length === -1 ? 'max' : max_length / 2})`;
    if (['decimal', 'numeric'].includes(t)) return `${tipo}(${precision},${scale})`;
    return tipo;
}

exportFullSchema();
