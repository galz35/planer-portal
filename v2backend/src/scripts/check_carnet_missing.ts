import 'dotenv/config';
import { ejecutarQuery, NVarChar } from '../db/base.repo';

async function checkCarnet() {
  const tables = [
    'p_Notas',
    'p_PlanesTrabajo',
    'p_Bloqueos',
    'p_CheckinTareas',
    'p_Tareas',
    'p_TareaAsignados',
  ];
  console.log('--- REVISIÓN DE CAMPO CARNET ---');
  for (const table of tables) {
    try {
      const cols = await ejecutarQuery<any>(
        `
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = @table AND COLUMN_NAME = 'carnet'
            `,
        { table: { valor: table, tipo: NVarChar } },
      );

      if (cols.length > 0) {
        console.log(`[OK] ${table} ya tiene columna 'carnet'`);
      } else {
        console.log(`[MISSING] ${table} NO tiene columna 'carnet'`);
      }
    } catch (e: any) {
      console.log(`Error: ${e.message}`);
    }
  }
  process.exit(0);
}

checkCarnet();
