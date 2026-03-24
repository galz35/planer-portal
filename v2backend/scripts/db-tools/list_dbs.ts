import * as sql from 'mssql';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST || '54.146.235.205',
    database: 'master', // Start with master
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function listDbs() {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query("SELECT name FROM sys.databases");
        console.log('Databases:', result.recordset.map(r => r.name));
        await pool.close();
    } catch (err) {
        console.error(err);
    }
}

listDbs();
