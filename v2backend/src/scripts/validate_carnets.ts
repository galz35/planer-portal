import * as dotenv from 'dotenv';
dotenv.config();

import { ejecutarQuery } from '../db/base.repo';

async function main() {
  console.log('--- Validación de Integridad de Carnets ---');

  try {
    // 1. Verificar Nulos o Vacíos
    const nulos = await ejecutarQuery(`
            SELECT idUsuario, nombre, correo 
            FROM p_Usuarios 
            WHERE carnet IS NULL OR carnet = ''
            AND activo = 1
        `);

    if (nulos.length > 0) {
      console.error(
        `❌ ALERTA: Se encontraron ${nulos.length} usuarios activos sin carnet:`,
      );
      console.table(nulos);
    } else {
      console.log('✅ No hay usuarios activos sin carnet.');
    }

    // 2. Verificar Duplicados
    const duplicados = await ejecutarQuery(`
            SELECT carnet, COUNT(*) as cantidad, STRING_AGG(nombre, ', ') as usuarios
            FROM p_Usuarios
            WHERE activo = 1 AND carnet IS NOT NULL AND carnet <> ''
            GROUP BY carnet
            HAVING COUNT(*) > 1
        `);

    if (duplicados.length > 0) {
      console.error(
        `❌ ALERTA: Se encontraron ${duplicados.length} carnets duplicados:`,
      );
      console.table(duplicados);
    } else {
      console.log('✅ No hay carnets duplicados entre usuarios activos.');
    }

    // 3. Resumen Total
    const total = await ejecutarQuery(
      `SELECT COUNT(*) as c FROM p_Usuarios WHERE activo = 1`,
    );
    console.log(`\nTotal de usuarios activos verificados: ${total[0].c}`);
  } catch (error) {
    console.error('Error en validación:', error);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
