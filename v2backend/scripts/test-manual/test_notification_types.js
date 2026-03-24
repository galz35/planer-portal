
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const mssql = require('mssql');

dotenv.config();

async function test(tipo) {
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
        let message;

        if (tipo === 'CRITICO') {
            message = {
                token: token,
                notification: {
                    title: '🚨 TAREA VENCIDA: "Reporte Mensual"',
                    body: 'La tarea ha vencido hace 10 minutos. Por favor revisa el estado urgentemente.',
                },
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'high_importance_channel',
                        priority: 'max',
                    }
                },
                data: {
                    prioridad: 'CRITICO',
                    id: '99',
                    url: 'rhclaroni.com/tareas/99'
                }
            };
        } else {
            message = {
                token: token,
                notification: {
                    title: '👤 Tarea Compartida',
                    body: 'Gustavo ha compartido la tarea "Diseño de Logotipo" contigo.',
                },
                android: {
                    notification: {
                        channelId: 'low_importance_channel',
                    }
                },
                data: {
                    prioridad: 'INFORMATIVO',
                    id: '100',
                }
            };
        }

        const response = await admin.messaging().send(message);
        console.log(`Enviado (${tipo}):`, response);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mssql.close();
    }
}

// Ejecutar ambos para probar
const args = process.argv.slice(2);
const tag = args[0] || 'CRITICO';
test(tag);
