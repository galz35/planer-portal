import * as dotenv from 'dotenv';
dotenv.config();

import { ejecutarQuery, eliminarTarea } from '../clarity/clarity.repo';
import { Int, NVarChar } from '../db/base.repo';

async function main() {
  console.log('--- Verificando Soft Delete ---');
  const idUsuario = 1;
  const carnet = '300042';

  // 1. Test Physical Delete (Created Today + Creator)
  console.log('1. Probando Borrado Físico (Creada Hoy + Mismo Usuario)...');
  const res1 = await ejecutarQuery<{ idTarea: number }>(
    `
        INSERT INTO p_Tareas (nombre, creadorCarnet, fechaCreacion, estado, activo)
        OUTPUT INSERTED.idTarea
        VALUES ('Tarea Test Fisica', @c, GETDATE(), 'Pendiente', 1)
    `,
    { c: { valor: carnet, tipo: NVarChar } },
  );
  const id1 = res1[0].idTarea;
  console.log(`   Tarea creada: ${id1}`);

  await eliminarTarea(id1, carnet);

  const check1 = await ejecutarQuery(
    `SELECT * FROM p_Tareas WHERE idTarea = @id`,
    { id: { valor: id1, tipo: Int } },
  );
  if (check1.length === 0) {
    console.log('   ✅ Borrado Físico Exitoso (No encontrada en DB)');
  } else {
    console.error('   ❌ Falló Borrado Físico. Tarea aún existe:', check1[0]);
  }

  // 2. Test Soft Delete (Created in Past)
  console.log('\n2. Probando Soft Delete (Creada Pasado)...');
  const res2 = await ejecutarQuery<{ idTarea: number }>(
    `
        INSERT INTO p_Tareas (nombre, creadorCarnet, fechaCreacion, estado, activo)
        OUTPUT INSERTED.idTarea
        VALUES ('Tarea Test Soft', @c, DATEADD(day, -5, GETDATE()), 'Pendiente', 1)
    `,
    { c: { valor: carnet, tipo: NVarChar } },
  );
  const id2 = res2[0].idTarea;
  console.log(`   Tarea creada (pasada): ${id2}`);

  await eliminarTarea(id2, carnet);

  const check2 = await ejecutarQuery(
    `SELECT * FROM p_Tareas WHERE idTarea = @id`,
    { id: { valor: id2, tipo: Int } },
  );
  if (check2.length > 0) {
    if (check2[0].activo === false || check2[0].activo === 0) {
      console.log('   ✅ Soft Delete Exitoso (activo = 0)');
    } else {
      console.error('   ❌ Falló Soft Delete. Activo es:', check2[0].activo);
    }
  } else {
    console.error('   ❌ Falló Soft Delete. Tarea fue borrada físicamente!');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
