
import * as sql from 'mssql';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve('d:/planificacion/v2sistema/v2backend/.env') });

const config = {
    server: process.env.MSSQL_HOST || 'localhost',
    port: parseInt(process.env.MSSQL_PORT || '1433'),
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE,
    options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true',
        enableArithAbort: true,
    }
};

async function checkSizes() {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query(`
      SELECT 
          t.NAME AS TableName,
          p.rows AS RowCounts
      FROM 
          sys.tables t
      INNER JOIN      
          sys.indexes i ON t.OBJECT_ID = i.object_id
      INNER JOIN 
          sys.partitions p ON i.object_id = p.OBJECT_ID AND i.index_id = p.index_id
      WHERE 
          t.NAME LIKE 'p_%' AND i.index_id < 2
      ORDER BY 
          p.rows DESC
    `);
        console.table(result.recordset);

        console.log('\n--- INDEX FRAGMENTATION ---');
        const frag = await pool.request().query(`
      SELECT 
        OBJECT_NAME(object_id) AS TableName,
        avg_fragmentation_in_percent
      FROM sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'DETACHED')
      WHERE avg_fragmentation_in_percent > 30;
    `);
        console.table(frag.recordset);

        await pool.close();
    } catch (err) {
        console.error(err);
    }
}
checkSizes();
