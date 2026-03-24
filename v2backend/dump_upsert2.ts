
import { ejecutarQuery } from './src/db/base.repo';
import * as fs from 'fs';

async function run() {
    try {
        const res = await ejecutarQuery(`SELECT OBJECT_DEFINITION(OBJECT_ID('sp_Checkin_Upsert_v2')) as code`);
        if (res.length > 0) fs.writeFileSync('sp_Checkin_Upsert_v2.sql', res[0].code);

        const res2 = await ejecutarQuery(`
            SELECT name, OBJECT_DEFINITION(object_id) as def 
            FROM sys.objects 
            WHERE type IN ('P', 'TR', 'FN') 
              AND OBJECT_DEFINITION(object_id) LIKE '%5 %' OR OBJECT_DEFINITION(object_id) LIKE '%>5%' OR OBJECT_DEFINITION(object_id) LIKE '%5.%'
        `);
        for (const row of res2) {
            if (row.name.toLowerCase().includes('tarea') || row.name.toLowerCase().includes('checkin') || row.name.toLowerCase().includes('agenda')) {
                console.log("Check: " + row.name);
            }
        }
    } catch (e) {
        console.error("DB Script Error", e);
    }
}
run();
