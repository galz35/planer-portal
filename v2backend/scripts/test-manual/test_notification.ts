
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function test() {
    const credPath = path.resolve(process.cwd(), process.env.FIREBASE_CREDENTIALS_PATH || '');
    const serviceAccount = require(credPath);

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    }

    const token = 'fC_WEwUwRHuAOZ07_p9DIK:APA91bGuGnTAo5J3axU1tDR0vpJOL1QWjTJIF_nnKyvE3pJE';

    const message = {
        token: token,
        notification: {
            title: '¡PRUEBA FINAL EXITOSA!',
            body: 'Si ves esto, todo el sistema (App + Backend + Firebase) está 100% alineado.',
        },
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

test();
