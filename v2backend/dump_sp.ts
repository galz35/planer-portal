import { ejecutarQuery } from './src/db/base.repo';

async function run() {
    try {
        const res = await ejecutarQuery(`EXEC sp_helptext 'sp_Checkin_Upsert_v2'`);
        if (res && res.length) {
            console.log(res.map((r: any) => r.Text).join(''));
        } else {
            console.log('SP not found or empty');
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
run();
