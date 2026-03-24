
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
    },
    pool: {
        max: 1,
        min: 0,
        idleTimeoutMillis: 30000,
    }
};

async function runDiagnostics() {
    try {
        const pool = await sql.connect(config);
        console.log('--- DB CONNECTED ---');

        console.log('\n--- BLOCKED SESSIONS ---');
        const blocks = await pool.request().query(`
      SELECT 
        blocking_session_id AS BlockingSessionID,
        session_id AS BlockedSessionID,
        wait_duration_ms AS DurationMS,
        wait_type AS WaitType,
        resource_description AS Resource
      FROM sys.dm_os_waiting_tasks
      WHERE blocking_session_id IS NOT NULL;
    `);
        console.table(blocks.recordset);

        console.log('\n--- ACTIVE QUERIES (TOP 10 BY DURATION) ---');
        const active = await pool.request().query(`
      SELECT TOP 10
        s.session_id,
        r.status,
        r.cpu_time,
        r.total_elapsed_time,
        r.logical_reads,
        r.writes,
        r.wait_type,
        r.wait_time,
        r.last_wait_type,
        st.text AS query_text
      FROM sys.dm_exec_requests r
      JOIN sys.dm_exec_sessions s ON r.session_id = s.session_id
      CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) st
      WHERE s.is_user_process = 1
      ORDER BY r.total_elapsed_time DESC;
    `);
        console.table(active.recordset.map(r => ({
            sid: r.session_id,
            status: r.status,
            elapsed: r.total_elapsed_time,
            text: r.query_text.substring(0, 100)
        })));

        console.log('\n--- SLOW QUERIES TABLE (LAST 10) ---');
        try {
            const slow = await pool.request().query(`
          SELECT TOP 10 * FROM dbo.p_SlowQueries ORDER BY fecha DESC;
        `);
            console.table(slow.recordset);
        } catch (e) {
            console.log('p_SlowQueries table not found or error accessing it.');
        }

        await pool.close();
    } catch (err) {
        console.error('DIAGNOSTICS FAILED:', err);
    }
}

runDiagnostics();
