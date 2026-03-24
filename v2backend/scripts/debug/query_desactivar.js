require('dotenv').config();
const { ejecutarQuery } = require('./dist/src/db/base.repo');

async function desactivar() {
    try {
        await ejecutarQuery(`UPDATE p_Usuarios SET activo = 0 WHERE carnet = '402035'`);
        console.log("JILMA CAROLINA ZELAYA desactivada exitosamente.");
    } catch (e) {
        console.error("Error al desactivar:", e);
    }
}

desactivar().then(() => process.exit(0));
