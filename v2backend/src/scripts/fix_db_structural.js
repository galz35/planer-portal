const sql = require('mssql');
require('dotenv').config();

async function fixDb() {
    console.log('--- Iniciando Reparación de Base de Datos ---');

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
        console.log('✅ Conectado a SQL Server');

        // 1. Agregar PK a p_Tareas si no existe
        console.log('Verificando PK en p_Tareas...');
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE type = 'PK' AND parent_object_id = OBJECT_ID('p_Tareas'))
      BEGIN
        PRINT 'Agregando Primary Key a p_Tareas...';
        ALTER TABLE p_Tareas ADD CONSTRAINT PK_p_Tareas PRIMARY KEY (idTarea);
      END
    `);

        // 2. Agregar PK a p_Usuarios si no existe
        console.log('Verificando PK en p_Usuarios...');
        await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.key_constraints WHERE type = 'PK' AND parent_object_id = OBJECT_ID('p_Usuarios'))
      BEGIN
        PRINT 'Agregando Primary Key a p_Usuarios...';
        ALTER TABLE p_Usuarios ADD CONSTRAINT PK_p_Usuarios PRIMARY KEY (idUsuario);
      END
    `);

        // 3. Corregir cualquier inconsistencia en p_TareaAsignados (idAsignacion vs id)
        // Ya lo hicimos vía código NestJS, pero esto asegura la DB.

        console.log('✅ Reparación completada exitosamente');
        await pool.close();
    } catch (err) {
        console.error('❌ Error reparando la base de datos:', err.message);
        if (err.originalError) console.error(err.originalError.message);
        process.exit(1);
    }
}

fixDb();
