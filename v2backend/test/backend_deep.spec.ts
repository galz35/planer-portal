import { initTestApp, closeTestApp, getTestAgent } from './test-config';
import { ejecutarQuery, ejecutarSP, Int, NVarChar } from '../src/db/base.repo';
import * as request from 'supertest';

// Datos del Usuario de Prueba (Gustavo Lira)
const TEST_USER = {
  email: 'gustavo.lira@claro.com.ni',
  password: 'password123', // Dummy, we might bypass auth or simulate token
  carnet: '500708',
  nombre: 'Gustavo Lira',
};

describe('Backend Deep Test Suite - Carnet Identity & Zero Inline', () => {
  let app: any;
  let agent: any;
  let token: string;
  let idUsuario: number;

  beforeAll(async () => {
    // 1. Inicializar App
    // app = await initTestApp();
    // agent = request(app.getHttpServer());

    // 2. Asegurar que el usuario existe en BD (Setup de Datos)
    // Usamos queries directas para preparar el terreno
    const userCheck = await ejecutarQuery(
      'SELECT idUsuario FROM p_Usuarios WHERE carnet = @c',
      { c: { valor: TEST_USER.carnet, tipo: NVarChar } },
    );

    if (userCheck.length === 0) {
      console.log('Creando usuario de prueba...');
      // Insertar usuario si no existe
      await ejecutarQuery(
        `
                INSERT INTO p_Usuarios (nombre, correo, carnet, activo, fechaCreacion, nombreCompleto, passwordHash, rolGlobal) 
                VALUES (@n, @e, @c, 1, GETDATE(), @n, 'HASH_DUMMY', 'Admin')
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
      idUsuario = userCheck[0].idUsuario;
      console.log(`Usuario de prueba existente encontrado (ID: ${idUsuario})`);
    }
  });

  afterAll(async () => {
    // await closeTestApp();
  });

  // ==========================================
  // 1. PRUEBAS DE IDENTIDAD (CARNET)
  // ==========================================
  describe('1. Identidad y Resolución de Carnet', () => {
    it('Debe resolver correctamente ID desde Carnet usando SP', async () => {
      const rows = await ejecutarSP('sp_Usuarios_ObtenerIdPorCarnet', {
        carnet: { valor: TEST_USER.carnet, tipo: NVarChar },
      });
      expect(rows[0].idUsuario).toBe(idUsuario);
      expect(rows[0].correo).toBe(TEST_USER.email);
    });
  });

  // ==========================================
  // 2. PRUEBAS DE CHECK-IN (Escritura Crítica)
  // ==========================================
  describe('2. Check-in V2 (Carnet-First)', () => {
    it('Debe crear un Check-in completo usando solo el Carnet', async () => {
      const fechaHoy = new Date();

      // Importamos dinamicamente el repo para probar la función TS
      const clarityRepo = require('../src/clarity/clarity.repo');

      const checkinData = {
        carnet: TEST_USER.carnet, // Enviar Carnet explícito
        fecha: fechaHoy,
        entregableTexto: 'Test Automático Deep V2',
        prioridad1: 'Prioridad Alta Test',
        prioridad2: 'Prioridad Media Test',
        energia: 80,
        estadoAnimo: 'Bien',
        entrego: [], // IDs de tareas
        avanzo: [],
        extras: [],
      };

      const idCheckin = await clarityRepo.checkinUpsert(checkinData);
      expect(idCheckin).toBeGreaterThan(0);

      // Verificación en BD
      const dbCheckin = await ejecutarQuery(
        'SELECT * FROM p_Checkins WHERE idCheckin = @id',
        { id: { valor: idCheckin, tipo: Int } },
      );

      expect(dbCheckin[0].usuarioCarnet).toBe(TEST_USER.carnet); // Validar Backfill automático
      expect(dbCheckin[0].entregableTexto).toBe('Test Automático Deep V2');
      expect(dbCheckin[0].energia).toBe(80); // Validar nuevos campos
    });
  });

  // ==========================================
  // 3. PRUEBAS DE VISIBILIDAD (Lectura Segura)
  // ==========================================
  describe('3. Visibilidad de Proyectos (Zero Inline SQL)', () => {
    it('Debe listar proyectos visibles usando SP y TVP', async () => {
      const planningRepo = require('../src/planning/planning.repo');

      // Simulamos objeto usuario
      const userObj = { carnet: TEST_USER.carnet };

      const proyectos = await planningRepo.obtenerProyectosVisibles(
        idUsuario,
        userObj,
      );

      expect(Array.isArray(proyectos)).toBe(true);
      // Si el usuario es nuevo, puede estar vacío, pero no debe fallar
      if (proyectos.length > 0) {
        expect(proyectos[0]).toHaveProperty('idProyecto');
        expect(proyectos[0]).toHaveProperty('nombre');
      }
    });
  });
});
