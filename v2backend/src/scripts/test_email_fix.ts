import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { NotificationService } from '../common/notification.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const notificationService = app.get(NotificationService);

    console.log('--- Probando envío de correo de asignación ---');
    try {
        await notificationService.sendTaskAssignmentEmail('gustavo.lira@claro.com.ni', {
            nombre: 'Gustavo Lira',
            asignadoPor: 'Sistema de Pruebas',
            titulo: 'Validación de Notificaciones',
            descripcion: 'Si recibes este correo, las plantillas PUG ya funcionan correctamente en dist.',
            prioridad: 'Alta',
            fechaLimite: '2026-02-28',
            proyecto: 'Pruebas Internas',
            enlace: 'https://planner-ef.com'
        });
        console.log('✅ Correo enviado exitosamente (revisa el spam si no llega)');
    } catch (error) {
        console.error('❌ Error enviando correo:', error);
    }

    await app.close();
}

bootstrap();
