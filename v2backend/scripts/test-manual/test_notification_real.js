
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const mssql = require('mssql');

dotenv.config();

async function test() {
    const credPath = path.resolve(process.cwd(), process.env.FIREBASE_CREDENTIALS_PATH || '');
    const serviceAccount = require(credPath);

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }

    const config = {
        user: process.env.MSSQL_USER,
        password: process.env.MSSQL_PASSWORD,
        server: process.env.MSSQL_HOST,
        database: process.env.MSSQL_DATABASE,
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    };

    try {
        await mssql.connect(config);
        const result = await mssql.query`SELECT TOP 1 tokenFCM FROM p_Dispositivos WHERE idUsuario = 23 ORDER BY fechaRegistro DESC`;

        if (result.recordset.length === 0) {
            console.log('No se encontró token');
            return;
        }

        const token = result.recordset[0].tokenFCM;

        const message = {
            token: token,
            notification: {
                title: '🔔 PRUEBA 4: Notificación Estándar',
                body: 'Enviando mensaje simple para validar estabilidad. (21:40)',
            }
        };

        const response = await admin.messaging().send(message);
        console.log('Successfully sent Prueba 4:', response);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mssql.close();
    }
}

test();
