require('dotenv').config();
const { ejecutarQuery } = require('./dist/src/db/base.repo');

async function testProyectos() {
    const res = await ejecutarQuery(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'p_ProyectoColaboradores'`);
    console.log(res);
}

testProyectos().catch(console.error);
