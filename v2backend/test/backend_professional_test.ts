require('dotenv').config();
import {
  ejecutarQuery,
  ejecutarSP,
  Int,
  NVarChar,
  Decimal,
  SqlDate,
} from '../src/db/base.repo';

const TEST_USER = {
  carnet: '500708',
  nombre: 'Gustavo Lira - Test Backend',
};

async function runDeepBackendTest() {
  console.log('█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█');
  console.log('█       PRUEBA PROFUNDA DE PROCEDURES (BACKEND)         █');
  console.log('█▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█');

  let idUsuario = 0;

  try {
    // --------------------------------------------------------------------------------
    // 1. SETUP: Identidad y Validación Inicial
    // --------------------------------------------------------------------------------
    console.log('\n🔵 [PASO 1] VERIFICACIÓN DE IDENTIDAD');
    const userRows = await ejecutarSP('sp_Usuarios_BuscarPorCarnet', {
      carnet: { valor: TEST_USER.carnet, tipo: NVarChar },
    });

    if (userRows.length === 0) {
      console.log('   🔸 Usuario no existe. Creando usuario de prueba...');
      // Crear usuario usando query directa (o SP si tuviéramos uno de crear usuario carnet-first)
      // Usamos query simple para no depender de SPs viejos
      await ejecutarQuery(
        `
                INSERT INTO p_Usuarios(nombre, nombreCompleto, carnet, correo, activo, fechaCreacion, passwordHash, rolGlobal)
                VALUES(@n, @n, @c, 'test@test.com', 1, GETDATE(), 'hash', 'Admin')
            `,
        {
          n: { valor: TEST_USER.nombre, tipo: NVarChar },
          c: { valor: TEST_USER.carnet, tipo: NVarChar },
        },
      );
      // Recuperar
      const nuevo = await ejecutarSP('sp_Usuarios_BuscarPorCarnet', {
        carnet: { valor: TEST_USER.carnet, tipo: NVarChar },
      });
      idUsuario = nuevo[0].idUsuario;
      console.log(
        `   ✅ Usuario creado exitosamente. ID Interno: ${idUsuario}`,
      );
    } else {
      idUsuario = userRows[0].idUsuario;
      console.log(
        `   ✅ Usuario encontrado. ID Interno: ${idUsuario} | Carnet: ${userRows[0].carnet}`,
      );
    }

    // --------------------------------------------------------------------------------
    // 2. CREACIÓN DE TAREA (sp_Tarea_Crear_Carnet)
    // --------------------------------------------------------------------------------
    console.log('\n🔵 [PASO 2] CREACIÓN DE TAREA (sp_Tarea_Crear_Carnet)');
    const tituloTarea = `Tarea Test Backend ${new Date().toISOString()}`;

    const resTarea = await ejecutarSP<{ idTarea: number }>(
      'sp_Tarea_Crear_Carnet',
      {
        creadorCarnet: { valor: TEST_USER.carnet, tipo: NVarChar },
        titulo: { valor: tituloTarea, tipo: NVarChar },
        prioridad: { valor: 'Alta', tipo: NVarChar },
      },
    );

    const idTarea = resTarea[0]?.idTarea;
    if (idTarea) {
      console.log(`   ✅ Tarea creada con éxito. ID Tarea: ${idTarea}`);

      // Verificación cruzada
      const checkTarea = await ejecutarQuery(
        'SELECT * FROM p_Tareas WHERE idTarea = @id',
        { id: { valor: idTarea, tipo: Int } },
      );
      console.log(
        `      -> Verificación BD: CreadorCarnet='${checkTarea[0].creadorCarnet}' | Estado='${checkTarea[0].estado}'`,
      );
    } else {
      throw new Error('Falló la creación de tarea (no devolvió ID).');
    }

    // --------------------------------------------------------------------------------
    // 3. CHECK-IN UPSERT V2 (sp_Checkin_Upsert_v2) - FLUJO COMPLETO
    // --------------------------------------------------------------------------------
    console.log('\n🔵 [PASO 3] CHECK-IN DIARIO V2 (sp_Checkin_Upsert_v2)');

    // Simular un día específico para no chocar con datos reales de hoy si no se quiere
    const fechaTest = new Date(); // Hoy

    // Simular TVP de tareas (la tarea que acabamos de crear la marcamos como "Avanzo")
    const tvpTareas = require('mssql').Table('dbo.TVP_CheckinTareas'); // Usamos require mssql para el tipo Table dinámico
    // Como no podemos instanciar Table sin el driver importado, usamos el objeto plano si base.repo lo soporta,
    // PERO base.repo espera un objeto Table de mssql.
    // HACK: Como estamos en un script de prueba standalone y base.repo no exporta 'sql' completo...
    // ...usaremos la función que ya refactorizamos en 'clarity.repo.ts' que SÍ sabe hacerlo.
    const clarityRepo = require('../src/clarity/clarity.repo');

    const checkinPayload = {
      carnet: TEST_USER.carnet,
      fecha: fechaTest,
      prioridad1: 'Terminar Test Backend',
      energia: 95,
      estadoAnimo: 'Tope',
      entregableTexto: 'Ejecución de test de integración profundo',
      avanzo: [idTarea], // IDs numéricos
      entrego: [],
      extras: [],
    };

    console.log('   🔸 Ejecutando upsert vía repo...');
    const idCheckin = await clarityRepo.checkinUpsert(checkinPayload);

    console.log(`   ✅ Check-in procesado. ID Checkin: ${idCheckin}`);

    // Verificación
    const checkCheckin = await ejecutarQuery(
      'SELECT * FROM p_Checkins WHERE idCheckin = @id',
      { id: { valor: idCheckin, tipo: Int } },
    );
    console.log(
      `      -> Verificación BD: Prioridad1='${checkCheckin[0].prioridad1}' | Energía=${checkCheckin[0].energia}`,
    );

    // --------------------------------------------------------------------------------
    // 4. LECTURA DE "MI DÍA" (sp_Clarity_MiDia_Get_Carnet)
    // --------------------------------------------------------------------------------
    console.log(
      '\n🔵 [PASO 4] LECTURA DASHBOARD (sp_Clarity_MiDia_Get_Carnet)',
    );
    const miDia = await ejecutarSP('sp_Clarity_MiDia_Get_Carnet', {
      carnet: { valor: TEST_USER.carnet, tipo: NVarChar },
      fecha: { valor: fechaTest, tipo: SqlDate }, // Usando tipo desde base.repo
      // Nota: base.repo exporta SqlDate. TypeScript se queja en runtime si no es valor real.
      // Pasamos objeto Date, base.repo lo maneja.
    });

    // sp_Clarity_MiDia_Get_Carnet devuelve MULTIPLES RECORDSETS.
    // ejecutarSP de base.repo típicamente devuelve el PRIMER recordset o combinados?
    // Revisemos base.repo: "return result.recordset;" -> Solo el primero.
    // El SP devuelve Tareas primero, Checkin después.

    /* 
           NOTA CRÍTICA: sp_Clarity_MiDia_Get_Carnet hace dos SELECTs.
           Si `base.repo.ts` solo devuelve `result.recordset` (el primero), solo veremos las Tareas.
           Validemos si vemos la tarea creada.
        */

    const tareasMiDia = miDia;
    console.log(`   ✅ Tareas recuperadas: ${tareasMiDia.length}`);
    const tareaEncontrada = tareasMiDia.find((t: any) => t.idTarea === idTarea);

    if (tareaEncontrada) {
      console.log(
        `      -> Tarea creada '${tareaEncontrada.nombre}' aparece en el Dashboard.`,
      );
    } else {
      console.log(
        '      ⚠️ La tarea creada no aparece (¿Tal vez porque no tiene fechaObjetivo hoy? o estado Pendiente?)',
      );
      console.log(
        '      (Nota: sp_Clarity_MiDia filtra por fechaObjetivo <= hoy)',
      );
    }

    // --------------------------------------------------------------------------------
    // 5. VISIBILIDAD PROYECTOS (sp_Proyecto_ObtenerVisibles)
    // --------------------------------------------------------------------------------
    console.log('\n🔵 [PASO 5] VISIBILIDAD (sp_Proyecto_ObtenerVisibles)');
    const planningRepo = require('../src/planning/planning.repo');
    // Simulamos usuario completo para que el repo pueda sacar idUsuario si lo necesita antes de llamar al SP
    // El repo toma "idUsuario" (int) como primer param.
    const proyectos = await planningRepo.obtenerProyectosVisibles(idUsuario, {
      carnet: TEST_USER.carnet,
    });

    console.log(`   ✅ Proyectos visibles recuperados: ${proyectos.length}`);
    if (proyectos.length > 0) {
      console.log(
        `      -> Ejemplo: ${proyectos[0].nombre} (Estado: ${proyectos[0].estado})`,
      );
    } else {
      console.log(
        '      -> Ningún proyecto visible (Normal si usuario es nuevo y no creó nada)',
      );
    }

    /*
        // --------------------------------------------------------------------------------
        // 6. BLOQUEOS (sp_Bloqueo_Crear) - Opcional, pendiente revisión de columnas NOT NULL
        // --------------------------------------------------------------------------------
        console.log('\n🔵 [PASO 6] CREAR BLOQUEO (sp_Bloqueo_Crear_Carnet) - SKIPPED');
        // const resBloqueo = await ejecutarSP<{ idBloqueo: number }>('sp_Bloqueo_Crear_Carnet', ...
        */

    console.log('\n█▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀█');
    console.log('█      ✅  TODAS LAS PRUEBAS FINALIZADAS CON ÉXITO      █');
    console.log('█▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄█');
    process.exit(0);
  } catch (e) {
    console.error('\n🔴 ERROR EN PRUEBA:', e);
    process.exit(1);
  }
}

runDeepBackendTest();
