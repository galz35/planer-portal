require('dotenv').config();
import {
  ejecutarQuery,
  ejecutarSP,
  Int,
  NVarChar,
  sql,
} from '../src/db/base.repo';
const clarityRepo = require('../src/clarity/clarity.repo');
const planningRepo = require('../src/planning/planning.repo');

const TEST_USER = {
  email: 'gustavo.lira@claro.com.ni',
  carnet: '500708',
  nombre: 'Gustavo Lira',
};

async function runManualTest() {
  console.log('--- INICIANDO TEST MANUAL BACKEND ---');

  try {
    // 1. Setup Usuario
    console.log('[1/3] Verificando Usuario Gustavo Lira...');
    let idUsuario = 0;
    const checkUser = await ejecutarQuery(
      'SELECT idUsuario FROM p_Usuarios WHERE carnet = @c',
      { c: { valor: TEST_USER.carnet, tipo: NVarChar } },
    );

    if (checkUser.length === 0) {
      console.log(' -> Creando usuario...');
      await ejecutarQuery(
        `
                INSERT INTO p_Usuarios (nombre, correo, carnet, activo, fechaCreacion, nombreCompleto, passwordHash, rolGlobal) 
                VALUES (@n, @e, @c, 1, GETDATE(), @n, 'HASH_TEST', 'Admin')
            `,
        {
          n: { valor: TEST_USER.nombre, tipo: NVarChar },
          e: { valor: TEST_USER.email, tipo: NVarChar },
          c: { valor: TEST_USER.carnet, tipo: NVarChar },
        },
      );
      const newUser = await ejecutarQuery(
        'SELECT idUsuario FROM p_Usuarios WHERE carnet = @c',
        { c: { valor: TEST_USER.carnet, tipo: NVarChar } },
      );
      idUsuario = newUser[0].idUsuario;
    } else {
      idUsuario = checkUser[0].idUsuario;
      console.log(` -> Usuario existente (ID: ${idUsuario})`);
    }

    // 2. Test Check-in V2
    console.log('\n[2/3] Probando Check-in V2 (Carnet-First)...');
    const checkinData = {
      carnet: TEST_USER.carnet,
      fecha: new Date(),
      entregableTexto: 'Test Manual Backend V2',
      prioridad1: 'Meta Alta',
      energia: 90,
      estadoAnimo: 'Tope',
      entrego: [],
      avanzo: [],
      extras: [],
    };

    const idCheckin = await clarityRepo.checkinUpsert(checkinData);
    console.log(` -> Check-in creado/actualizado con éxito. ID: ${idCheckin}`);

    // Verificar en BD
    const dbCheckin = await ejecutarQuery(
      'SELECT * FROM p_Checkins WHERE idCheckin = @id',
      { id: { valor: idCheckin, tipo: Int } },
    );
    if (
      dbCheckin[0].usuarioCarnet === TEST_USER.carnet &&
      dbCheckin[0].energia === 90
    ) {
      console.log(' -> VERIFICACIÓN BD: OK (Carnet y Energía guardados)');
    } else {
      console.error(' -> ERROR: Datos en BD no coinciden.', dbCheckin[0]);
    }

    // 3. Test Visibilidad (Zero Inline)
    console.log('\n[3/3] Probando Visibilidad Proyectos (Zero Inline)...');
    // Aseguramos que el usuario pueda ver sus propios proyectos
    await ejecutarQuery(
      `
            IF NOT EXISTS (SELECT 1 FROM p_Proyectos WHERE nombre = 'Proyecto Test' AND idCreador = @id)
            INSERT INTO p_Proyectos (nombre, idCreador, estado, fechaCreacion) VALUES ('Proyecto Test', @id, 'Activo', GETDATE())
        `,
      { id: { valor: idUsuario, tipo: Int } },
    );

    const proyectos = await planningRepo.obtenerProyectosVisibles(idUsuario, {
      carnet: TEST_USER.carnet,
    });
    if (Array.isArray(proyectos) && proyectos.length > 0) {
      console.log(
        ` -> OK: Se obtuvieron ${proyectos.length} proyectos visibles.`,
      );
      console.log(` -> Primer proyecto: ${proyectos[0].nombre}`);
    } else {
      console.log(' -> WARNING: No se encontraron proyectos (¿TVP vacío?).');
    }

    console.log('\n--- TEST FINALIZADO CON ÉXITO ---');
    process.exit(0);
  } catch (error) {
    console.error('\n!!! ERROR FATAL EN TEST !!!', error);
    process.exit(1);
  }
}

runManualTest();
