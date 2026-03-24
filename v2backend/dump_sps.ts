
import { ejecutarQuery } from './src/db/base.repo';
import * as fs from 'fs';

async function run() {
    try {
        const res2 = await ejecutarQuery(`SELECT OBJECT_DEFINITION(OBJECT_ID('sp_Checkin_Upsert')) as code`);
        if (res2.length > 0) fs.writeFileSync('sp_Checkin_Upsert.sql', res2[0].code);

        const res3 = await ejecutarQuery(`SELECT OBJECT_DEFINITION(OBJECT_ID('sp_Tarea_CrearCompleta_v2')) as code`);
        if (res3.length > 0) fs.writeFileSync('sp_Tarea_CrearCompleta_v2.sql', res3[0].code);

        const res4 = await ejecutarQuery(`SELECT OBJECT_DEFINITION(OBJECT_ID('sp_Checkin_AgregarTarea')) as code`);
        if (res4 && res4.length > 0 && res4[0].code) fs.writeFileSync('sp_Checkin_AgregarTarea.sql', res4[0].code);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
