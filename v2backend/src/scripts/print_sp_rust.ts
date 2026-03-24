import * as sql from 'mssql';
import * as dotenv from 'dotenv';
dotenv.config();

const config = {
    server: process.env.MSSQL_HOST || '',
    user: process.env.MSSQL_USER || '',
    password: process.env.MSSQL_PASSWORD || '',
    database: process.env.MSSQL_DATABASE || '',
    options: { encrypt: true, trustServerCertificate: true },
};

async function run() {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT definition FROM sys.sql_modules WHERE object_id = OBJECT_ID('sp_Tarea_ObtenerDetalle_rust')");
    if (result.recordset[0]) {
        require('fs').writeFileSync('sp_definition.txt', result.recordset[0].definition);
        console.log("Written to sp_definition.txt");
    } else {
        console.log("NOT FOUND");
    }
    await pool.close();
}
run();
