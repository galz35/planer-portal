
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as mssql from 'mssql';

dotenv.config();

async function test() {
    // 1. Firebase Init
    const credPath = path.resolve(process.cwd(), process.env.FIREBASE_CREDENTIALS_PATH || '');
    const serviceAccount = require(credPath);

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }

    // 2. DB Fetch Token
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
        const token = result.recordset[0].tokenFCM;
        console.log('Token recuperado (Largo:', token.length, '):', token);

        // 3. Send Push
        const message = {
            token: token,
            notification: {
                title: '¡PRUEBA FINAL EXITOSA!',
                body: 'Si ves esto, todo el sistema (App + Backend + Firebase) está 100% alineado.',
            },
        };

        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mssql.close();
    }
}

test();
