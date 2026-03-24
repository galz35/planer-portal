import { obtenerMiEquipoPorCarnet } from '../acceso/acceso.repo';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const targetCarnet = '400103';
  console.log(`Debuggeando Equipo para Carnet: ${targetCarnet}`);

  try {
    const equipo = await obtenerMiEquipoPorCarnet(targetCarnet);
    console.log(`Total miembros encontrados: ${equipo.length}`);

    console.table(
      equipo.map((u: any) => ({
        id: u.idUsuario,
        carnet: u.carnet,
        nombre: u.nombre,
        jefe: u.jefeCarnet,
      })),
    );
  } catch (error) {
    console.error('Error obteniendo equipo:', error);
  }
}

run();
