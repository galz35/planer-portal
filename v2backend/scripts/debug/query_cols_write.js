require('dotenv').config();
const { ejecutarQuery } = require('./dist/src/db/base.repo');

async function doIt() {
    const res = await ejecutarQuery(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_ProyectoColaboradores'`);
    require('fs').writeFileSync('cols_proper.txt', JSON.stringify(res, null, 2), 'utf8');
}
doIt().catch(console.error);
