require('dotenv').config();
const { ejecutarQuery } = require('./dist/src/db/base.repo');
const fs = require('fs');

async function processUsers() {
    try {
        const content = fs.readFileSync('../docs/filtered_RRHH1.csv', 'utf8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);

        const carnetsEnCSV = [];
        const datosCSV = {};

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const cols = line.split(',');
            const carnet = cols[5];
            if (carnet && carnet.trim() !== '') {
                carnetsEnCSV.push(carnet);
                datosCSV[carnet] = {
                    nombreCompleto: cols[7],
                    correo: cols[8],
                    cargo: cols[9],
                    estado: "CSV_ACTIVO"
                };
            }
        }

        const queryActivos = `SELECT idUsuario, carnet, nombre, correo, activo FROM p_Usuarios WHERE activo = 1 AND carnet IS NOT NULL AND carnet != ''`;
        const usuariosActivosDb = await ejecutarQuery(queryActivos);

        const aDesactivar = [];
        for (const u of usuariosActivosDb) {
            if (!carnetsEnCSV.includes(u.carnet)) {
                aDesactivar.push(u);
            }
        }

        const dbCarnets = usuariosActivosDb.map(u => u.carnet);
        const aRegistrar = [];
        for (const c of carnetsEnCSV) {
            if (!dbCarnets.includes(c)) {
                aRegistrar.push({ carnet: c, ...datosCSV[c] });
            }
        }

        fs.writeFileSync('reporte_usuarios.json', JSON.stringify({
            csvTotal: carnetsEnCSV.length,
            dbTotalActivos: usuariosActivosDb.length,
            aDesactivar: aDesactivar,
            aRegistrar: aRegistrar
        }, null, 2));

        console.log("Generado reporte_usuarios.json");
    } catch (e) { console.error(e) }
}
processUsers().then(() => process.exit(0));
