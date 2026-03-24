import * as dotenv from 'dotenv';
dotenv.config();

import { ejecutarQuery } from '../db/base.repo';

async function main() {
  console.log('Verificando columna activo en p_Tareas...');
  try {
    const result = await ejecutarQuery(`
            SELECT 1 FROM sys.columns 
            WHERE Name = N'activo' 
            AND Object_ID = Object_ID(N'dbo.p_Tareas')
        `);

    if (result.length > 0) {
      console.log('La columna activo ya existe.');
    } else {
      console.log('La columna activo NO existe. Agregándola...');
      await ejecutarQuery(`
                ALTER TABLE dbo.p_Tareas 
                ADD activo BIT NOT NULL DEFAULT 1 WITH VALUES;
            `);
      console.log('Columna activo agregada correctamente.');
    }
  } catch (error) {
    console.error('Error verificando/creando columna:', error);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
