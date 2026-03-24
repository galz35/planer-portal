import { ejecutarQuery } from './src/db/base.repo';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    try {
        const res = await ejecutarQuery(`SELECT name FROM sys.objects WHERE type = 'P' AND name LIKE '%Usuarios%'`);
        console.log(JSON.stringify(res, null, 2));
    } catch (e) {
        console.error(e);
    }
    await app.close();
    process.exit(0);
}

run();
