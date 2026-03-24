import * as sql from 'mssql';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '.env') });

const config: sql.config = {
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

const BASE_OUTPUT_DIR = path.join('d:\\planificacion', 'respaldo sql server', 'ddl_export');

function asegurarCarpeta(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function limpiarNombreArchivo(nombre: string) {
    return nombre.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").trim();
}

async function extractDDL() {
    try {
        console.log('🚀 Iniciando extracción detallada de DDL...');
        const pool = await sql.connect(config);

        // 1. Obtener lista de objetos
        const resultObjetos = await pool.request().query(`
            SELECT 
                s.name AS esquema,
                o.name AS nombre,
                o.type AS tipo_codigo,
                o.type_desc AS tipo_desc
            FROM sys.objects o
            JOIN sys.schemas s ON s.schema_id = o.schema_id
            WHERE o.is_ms_shipped = 0
              AND o.type IN ('U','V','P','FN','IF','TF')
            ORDER BY s.name, o.type_desc, o.name;
        `);

        for (const obj of resultObjetos.recordset) {
            const { esquema, nombre, tipo_codigo } = obj;
            const tlog = getTipoLogico(tipo_codigo);
            const dirTipo = path.join(BASE_OUTPUT_DIR, tlog, esquema);
            asegurarCarpeta(dirTipo);

            const fileName = `${limpiarNombreArchivo(esquema + '.' + nombre)}.sql`;
            const filePath = path.join(dirTipo, fileName);

            console.log(`📦 Procesando [${tlog}] ${esquema}.${nombre}...`);

            let ddl = `-- DDL Generado el ${new Date().toISOString()}\n`;

            if (tlog === 'TABLE') {
                ddl += await generarScriptTabla(pool, esquema, nombre);
            } else {
                ddl += await generarScriptModulo(pool, esquema, nombre, tlog);
            }

            fs.writeFileSync(filePath, ddl, 'utf-8');
        }

        await pool.close();
        console.log(`\n✅ Extracción completada. Archivos en: ${BASE_OUTPUT_DIR}`);

    } catch (err) {
        console.error('❌ Error fatal:', err);
    }
}

function getTipoLogico(codigo: string) {
    switch (codigo.trim()) {
        case 'U': return 'TABLE';
        case 'V': return 'VIEW';
        case 'P': return 'PROCEDURE';
        case 'FN':
        case 'IF':
        case 'TF': return 'FUNCTION';
        default: return 'OTHER';
    }
}

async function generarScriptModulo(pool: sql.ConnectionPool, esquema: string, nombre: string, tlog: string) {
    const res = await pool.request()
        .input('esquema', esquema)
        .input('nombre', nombre)
        .query(`
            SELECT m.definition
            FROM sys.sql_modules m
            JOIN sys.objects o ON o.object_id = m.object_id
            JOIN sys.schemas s ON s.schema_id = o.schema_id
            WHERE s.name = @esquema AND o.name = @nombre;
        `);

    if (res.recordset[0]?.definition) {
        return `\n${res.recordset[0].definition}\nGO\n`;
    }
    return `\n-- Definición no encontrada para ${esquema}.${nombre}\n`;
}

async function generarScriptTabla(pool: sql.ConnectionPool, esquema: string, nombre: string) {
    // 1. Columnas
    const resCols = await pool.request()
        .input('esquema', esquema)
        .input('nombre', nombre)
        .query(`
            SELECT
                c.name AS columna,
                t.name AS tipo,
                c.max_length,
                c.precision,
                c.scale,
                c.is_nullable,
                c.is_identity,
                ic.seed_value,
                ic.increment_value,
                dc.definition AS default_def,
                cc.definition AS computed_def
            FROM sys.columns c
            JOIN sys.types t ON t.user_type_id = c.user_type_id
            LEFT JOIN sys.identity_columns ic ON ic.object_id = c.object_id AND ic.column_id = c.column_id
            LEFT JOIN sys.default_constraints dc ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
            LEFT JOIN sys.computed_columns cc ON cc.object_id = c.object_id AND cc.column_id = c.column_id
            JOIN sys.objects o ON o.object_id = c.object_id
            JOIN sys.schemas s ON s.schema_id = o.schema_id
            WHERE s.name = @esquema AND o.name = @nombre
            ORDER BY c.column_id;
        `);

    let lines: string[] = [];
    for (const r of resCols.recordset) {
        if (r.computed_def) {
            lines.push(`    [${r.columna}] AS ${r.computed_def}`);
            continue;
        }

        let tipoFmt = formatType(r.tipo, r.max_length, r.precision, r.scale);
        let nullTxt = r.is_nullable ? 'NULL' : 'NOT NULL';
        let identityTxt = r.is_identity ? ` IDENTITY(${r.seed_value},${r.increment_value})` : '';
        let defaultTxt = r.default_def ? ` DEFAULT ${r.default_def}` : '';

        lines.push(`    [${r.columna}] ${tipoFmt}${identityTxt} ${nullTxt}${defaultTxt}`);
    }

    // 2. PK
    const resPk = await pool.request()
        .input('esquema', esquema)
        .input('nombre', nombre)
        .query(`
            SELECT kc.name AS nombre_pk, col.name AS columna
            FROM sys.key_constraints kc
            JOIN sys.indexes i ON i.object_id = kc.parent_object_id AND i.index_id = kc.unique_index_id
            JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
            JOIN sys.columns col ON col.object_id = ic.object_id AND col.column_id = ic.column_id
            JOIN sys.objects o ON o.object_id = kc.parent_object_id
            JOIN sys.schemas s ON s.schema_id = o.schema_id
            WHERE kc.type = 'PK' AND s.name = @esquema AND o.name = @nombre
            ORDER BY ic.key_ordinal;
        `);

    if (resPk.recordset.length > 0) {
        const pkName = resPk.recordset[0].nombre_pk;
        const pkCols = resPk.recordset.map(r => `[${r.columna}]`).join(', ');
        lines.push(`    CONSTRAINT [${pkName}] PRIMARY KEY (${pkCols})`);
    }

    let script = `\nCREATE TABLE [${esquema}].[${nombre}] (\n${lines.join(',\n')}\n);\nGO\n`;

    // 3. FKs (Simplificado)
    const resFk = await pool.request()
        .input('esquema', esquema)
        .input('nombre', nombre)
        .query(`
            SELECT fk.name AS nombre_fk,
                   s2.name AS esquema_ref, t2.name AS tabla_ref,
                   c1.name AS col_orig, c2.name AS col_ref
            FROM sys.foreign_keys fk
            JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
            JOIN sys.tables t1 ON t1.object_id = fk.parent_object_id
            JOIN sys.columns c1 ON c1.object_id = t1.object_id AND c1.column_id = fkc.parent_column_id
            JOIN sys.tables t2 ON t2.object_id = fk.referenced_object_id
            JOIN sys.schemas s2 ON s2.schema_id = t2.schema_id
            JOIN sys.columns c2 ON c2.object_id = t2.object_id AND c2.column_id = fkc.referenced_column_id
            JOIN sys.schemas s1 ON s1.schema_id = t1.schema_id
            WHERE s1.name = @esquema AND t1.name = @nombre;
        `);

    if (resFk.recordset.length > 0) {
        const fks: { [key: string]: any } = {};
        resFk.recordset.forEach(r => {
            if (!fks[r.nombre_fk]) fks[r.nombre_fk] = { ref: `[${r.esquema_ref}].[${r.tabla_ref}]`, origCols: [], refCols: [] };
            fks[r.nombre_fk].origCols.push(`[${r.col_orig}]`);
            fks[r.nombre_fk].refCols.push(`[${r.col_ref}]`);
        });

        for (const [name, data] of Object.entries(fks)) {
            script += `ALTER TABLE [${esquema}].[${nombre}] ADD CONSTRAINT [${name}] FOREIGN KEY (${data.origCols.join(', ')}) REFERENCES ${data.ref} (${data.refCols.join(', ')});\nGO\n`;
        }
    }

    return script;
}

function formatType(tipo: string, max_length: number, precision: number, scale: number) {
    const t = tipo.toLowerCase();
    if (['varchar', 'char', 'varbinary', 'binary'].includes(t)) {
        return `${tipo}(${max_length === -1 ? 'max' : max_length})`;
    }
    if (['nvarchar', 'nchar'].includes(t)) {
        return `${tipo}(${max_length === -1 ? 'max' : max_length / 2})`;
    }
    if (['decimal', 'numeric'].includes(t)) {
        return `${tipo}(${precision},${scale})`;
    }
    return tipo;
}

extractDDL();
