
const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST,
    database: process.env.MSSQL_DATABASE,
    options: {
        encrypt: process.env.MSSQL_ENCRYPT === 'true',
        trustServerCertificate: process.env.MSSQL_TRUST_CERT === 'true'
    }
};

async function checkUsers() {
    try {
        console.log(`Conectando a ${config.server}/${config.database}...`);
        let pool = await sql.connect(config);

        console.log("\n--- USUARIOS Y ROLES ---");
        const result = await pool.request().query(`
            SELECT TOP 20
                u.idUsuario,
                u.carnet,
                u.nombre,
                u.correo,
                u.activo,
                r.nombre as rol,
                u.jefeCarnet
            FROM p_Usuarios u
            LEFT JOIN p_Roles r ON u.idRol = r.idRol
            ORDER BY u.idUsuario DESC
        `);

        console.table(result.recordset);

        console.log("\n--- CONFIGURACIÓN DE MENÚ (p_UsuariosConfig) ---");
        const configResult = await pool.request().query(`
            SELECT TOP 10 idUsuario, menuPersonalizado, agendaConfig
            FROM p_UsuariosConfig
        `);
        console.table(configResult.recordset);

        await pool.close();
    } catch (err) {
        console.error("Error:", err.message);
    }
}

checkUsers();
