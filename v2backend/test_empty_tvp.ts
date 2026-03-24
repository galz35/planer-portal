import { ejecutarSP, NVarChar, SqlDate, Int } from './src/db/base.repo';
import * as sql from 'mssql';
import { Console } from 'console';

async function run() {
    try {
        const tvpTareas = new sql.Table('dbo.TVP_CheckinTareas');
        tvpTareas.columns.add('idTarea', sql.Int);
        tvpTareas.columns.add('tipo', sql.NVarChar(20));

        // Note: passing NO rows to TVP to simulate the error.
        console.log('Test executing SP with empty TVP...');
        const res = await ejecutarSP<{ idCheckin: number }>('sp_Checkin_Upsert_v2', {
            usuarioCarnet: { valor: 'GLIRA', tipo: NVarChar },
            fecha: { valor: new Date(), tipo: SqlDate },
            entregableTexto: { valor: 'TEST EMPTY', tipo: NVarChar },
            prioridad1: { valor: null, tipo: NVarChar },
            prioridad2: { valor: null, tipo: NVarChar },
            prioridad3: { valor: null, tipo: NVarChar },
            nota: { valor: null, tipo: NVarChar },
            linkEvidencia: { valor: null, tipo: NVarChar },
            estadoAnimo: { valor: 'Bien', type: NVarChar },
            energia: { valor: 8, tipo: Int },
            idNodo: { valor: null, tipo: Int },
            tareas: tvpTareas
        });

        console.log('Success:', res);
    } catch (e) {
        console.error('Test Failed:', e);
    }
    process.exit(0);
}
run();
