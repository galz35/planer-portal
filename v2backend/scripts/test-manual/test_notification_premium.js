
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const mssql = require('mssql');

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

        if (result.recordset.length === 0) {
            console.log('No se encontró token para el usuario 23');
            return;
        }

        const token = result.recordset[0].tokenFCM;

        // 3. Send "Premium" Push
        const message = {
            token: token,
            notification: {
                title: '⚡ Nueva Tarea: "Dashboard Inteligente"',
                body: '⏰ Vence hoy a las 5:00 PM\n👤 Asignada por: IA de Planner\n🎯 Prioridad: ESTRATÉGICO',
            },
            android: {
                priority: 'high',
                notification: {
                    imageUrl: 'https://images.unsplash.com/photo-1551288049-bbbda536ad31?q=80&w=400', // Imagen de dashboard
                    sound: 'default',
                    channelId: 'high_importance_channel',
                    clickAction: 'FLUTTER_NOTIFICATION_CLICK'
                }
            },
            data: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                id: '123',
                tipo: 'tarea'
            }
        };

        const response = await admin.messaging().send(message);
        console.log('Successfully sent premium message:', response);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mssql.close();
    }
}

test();
