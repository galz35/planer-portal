
import { ejecutarQuery } from './src/db/base.repo';
import * as fs from 'fs';

async function run() {
    try {
        const res = await ejecutarQuery(`SELECT OBJECT_DEFINITION(OBJECT_ID('sp_Tareas_ObtenerPorUsuario')) as code`);
        if (res.length > 0) fs.writeFileSync('sp_Tareas_ObtenerPorUsuario.sql', res[0].code);

        // find triggers
        const triggers = await ejecutarQuery(`SELECT name, OBJECT_DEFINITION(object_id) as def FROM sys.triggers WHERE parent_id = OBJECT_ID('p_Tareas')`);
        for (const trg of triggers) {
            console.log("Trigger:", trg.name);
            console.log(trg.def.substring(0, 500));
        }
    } catch (e) {
        console.error("DB Script Error", e);
    }
}
run();
