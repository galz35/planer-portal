import 'dotenv/config';
import { ejecutarQuery, NVarChar } from '../db/base.repo';

async function checkSchema() {
  const tables = [
    'p_Notas',
    'p_PlanesTrabajo',
    'p_Bloqueos',
    'p_CheckinTareas',
    'p_Tareas',
    'p_TareaAsignados',
  ];
  console.log('--- ESTRUCTURA DE TABLAS ---');
  for (const table of tables) {
    try {
      const cols = await ejecutarQuery<any>(
        `
                SELECT COLUMN_NAME, DATA_TYPE 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = @table
            `,
        { table: { valor: table, tipo: NVarChar } },
      );
      console.log(`\nTABLA: ${table}`);
      cols.forEach((c) => console.log(` - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
    } catch (e: any) {
      console.log(`Error leyendo ${table}: ${e.message}`);
    }
  }
  process.exit(0);
}

checkSchema();
