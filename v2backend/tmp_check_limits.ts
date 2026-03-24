
import { ejecutarQuery } from './src/db/base.repo';

async function run() {
    try {
        const res = await ejecutarQuery(`
            SELECT OBJECT_NAME(object_id) as ErrorObject, OBJECT_DEFINITION(object_id) as ObjectCode 
            FROM sys.objects 
            WHERE OBJECT_DEFINITION(object_id) LIKE '%5%'
            AND type IN ('P', 'FN', 'TF', 'IF', 'TR')
        `);
        console.log("Checking objects for limit 5...");
        for (const r of res) {
            if (r.ObjectCode.toLowerCase().includes('límite') || r.ObjectCode.includes(' 5 ') || r.ObjectCode.includes('> 5') || r.ObjectCode.includes('MAX')) {
                console.log(`Potential match in: ${r.ErrorObject}`);
                // if it looks relevant, print a snippet
                const lowerCode = r.ObjectCode.toLowerCase();
                if (lowerCode.includes('tarea') || lowerCode.includes('agenda')) {
                    console.log(`--- CODE ---`);
                    console.log(r.ObjectCode.substring(0, 1000));
                }
            }
        }

        console.log("-------------------");
        console.log("Checking sp_Checkin_Upsert...");
        const res2 = await ejecutarQuery(`SELECT OBJECT_DEFINITION(OBJECT_ID('sp_Checkin_Upsert')) as code`);
        if (res2.length > 0) console.log(res2[0].code.substring(0, 2000));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
