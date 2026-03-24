
import { ejecutarQuery } from './src/db/base.repo';

async function run() {
    const res = await ejecutarQuery(`SELECT CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='p_Checkins' AND COLUMN_NAME='entregableTexto'`);
    console.log('LEN:' + res[0].CHARACTER_MAXIMUM_LENGTH);
    process.exit(0);
}
run();
