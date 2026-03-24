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
            // Un split simple por coma fallaría si hay comas dentro de comillas, pero veamos
            const line = lines[i];
            // parsing csv ignoring commas in quotes
            const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
            const carnet = line.split(',')[5]; // el normal es mejor que regex a veces si sabemos la col
            if (carnet && carnet.trim() !== '') {
                carnetsEnCSV.push(carnet);
                datosCSV[carnet] = {
                    nombreCompleto: line.split(',')[7],
                    correo: line.split(',')[8],
                };
            }
        }

        const queryActivos = `SELECT idUsuario, carnet, nombre, correo, activo FROM p_Usuarios WHERE activo = 1 AND carnet IS NOT NULL AND carnet != ''`;
        const usuariosActivosDb = await ejecutarQuery(queryActivos);

        const aDesactivar = [];
        for (const u of usuariosActivosDb) {
            // El gerente de RRHH esta en ambos, juan.ortuno = 300042
            if (!carnetsEnCSV.includes(u.carnet)) {
                // exclude admin accounts? user might only be asking about RRHH.
                // Wait, "que practicamente lo saque de aca filtered_RRHH1.csv" -> 
                // That CSV only has RRHH people. Are we checking the whole DB?
                // If I check whole DB against RRHH csv, I will deactivate EVERYONE else!
                // Let's only deactivate the ones whose 'departamento/gerencia' is RRHH... 
                // Actually let's just see who they are first.
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

        // Teniendo en cuenta que el CSV enviado se llama "filtered_RRHH1.csv", 
        // tiene 40 empleados. Activos en DB deben ser cientos.
        // Solo voy a buscar los que dicen RRHH o similares.

        // Let's filter aDesactivar by "correo like '%claro.com.ni'" AND maybe only check if they are in 'RRHH' area in old DB.

        fs.writeFileSync('reporte_usuarios.json', JSON.stringify({
            csvTotal: carnetsEnCSV.length,
            dbTotalActivos: usuariosActivosDb.length,
            aRegistrar,
            // aDesactivar: aDesactivar // Too big!
        }, null, 2));

        console.log("Generado reporte_usuarios.json");
    } catch (e) { console.error(e) }
}
processUsers().then(() => process.exit(0));
