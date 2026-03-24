const sql = require('mssql');
const fs = require('fs');
require('dotenv').config();

async function getSpText() {
    const config = {
        server: process.env.MSSQL_HOST || 'localhost',
        port: parseInt(process.env.MSSQL_PORT || '1433'),
        user: process.env.MSSQL_USER,
        password: process.env.MSSQL_PASSWORD,
        database: process.env.MSSQL_DATABASE,
        options: {
            encrypt: true,
            trustServerCertificate: true,
        },
    };

    try {
        const pool = await sql.connect(config);
        const res = await pool.request().query("EXEC sp_helptext 'sp_Visibilidad_ObtenerMiEquipo'");
        const text = res.recordset.map(r => r.Text).join('');
        fs.writeFileSync('sp_text_visibilidad.sql', text);
        console.log('SP saved to sp_text_visibilidad.sql');
        await pool.close();
    } catch (err) {
        console.error(err);
    }
}

getSpText();
