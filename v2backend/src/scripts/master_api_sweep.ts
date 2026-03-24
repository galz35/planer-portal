import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
const CREDENTIALS = {
  correo: 'gustavo.lira@claro.com.ni',
  password: '123456',
};

async function runMasterTest() {
  console.log('🚀 === INICIANDO BARRIDO MAESTRO DE API CLARITY ===');
  const start = Date.now();

  try {
    // --- ETAPA 1: AUTENTICACIÓN ---
    console.log('\n🔐 [AUTH] Validando acceso...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, CREDENTIALS);
    const token = loginRes.data.data.access_token;
    const user = loginRes.data.data.user;
    console.log(
      `✅ Login Exitoso. Identificado como: ${user.nombre} (${user.carnet})`,
    );

    const config = { headers: { Authorization: `Bearer ${token}` } };
    const hoy = new Date().toISOString().split('T')[0];

    // --- ETAPA 2: DASHBOARD PERSONAL ---
    console.log('\n👤 [PERSONAL] Consultando tableros individuales...');
    const personalTests = [
      { id: 'MI_DIA', name: 'Mi Día', url: `${BASE_URL}/mi-dia?fecha=${hoy}` },
      { id: 'MIS_TAREAS', name: 'Mis Tareas', url: `${BASE_URL}/tareas/mias` },
      { id: 'NOTAS', name: 'Mis Notas', url: `${BASE_URL}/notas` },
      {
        id: 'AGENDA_REC',
        name: 'Agenda Recurrente',
        url: `${BASE_URL}/agenda-recurrente?fecha=${hoy}`,
      },
    ];

    for (const test of personalTests) {
      try {
        const res = await axios.get(test.url, config);
        const count = Array.isArray(res.data.data)
          ? res.data.data.length
          : res.data.data
            ? 1
            : 0;
        console.log(`✅ ${test.name.padEnd(17)} | OK | Info: ${count} item(s)`);
      } catch (e: any) {
        console.error(
          `❌ ${test.name.padEnd(17)} | ERROR: [${e.response?.status}] - ${e.response?.data?.message || e.message}`,
        );
      }
    }

    // --- ETAPA 3: EQUIPO Y ESTRATEGIA (KPIs) ---
    console.log('\n📊 [EQUIPO/KPI] Consultando métricas grupales...');
    const teamTests = [
      {
        id: 'DASHBOARD',
        name: 'KPI Dashboard',
        url: `${BASE_URL}/kpis/dashboard`,
      },
      {
        id: 'EQUIPO_HOY',
        name: 'Equipo Hoy',
        url: `${BASE_URL}/equipo/hoy?fecha=${hoy}`,
      },
      {
        id: 'WORKLOAD',
        name: 'Carga Laboral',
        url: `${BASE_URL}/planning/workload`,
      },
      {
        id: 'BLOQUEOS',
        name: 'Bloqueos Equipo',
        url: `${BASE_URL}/equipo/bloqueos?fecha=${hoy}`,
      },
    ];

    for (const test of teamTests) {
      try {
        const res = await axios.get(test.url, config);
        console.log(
          `✅ ${test.name.padEnd(17)} | OK | Detalle: ${JSON.stringify(res.data.data).substring(0, 50)}...`,
        );
      } catch (e: any) {
        console.error(
          `❌ ${test.name.padEnd(17)} | ERROR: [${e.response?.status}] - ${e.response?.data?.message || e.message}`,
        );
      }
    }

    // --- ETAPA 4: PROYECTOS ---
    console.log('\n📂 [PROYECTOS] Validando listado y detalle...');
    try {
      const res = await axios.get(`${BASE_URL}/proyectos`, config);
      console.log(
        `✅ Proyectos Listar | OK | Total: ${res.data.data?.length ?? 0}`,
      );
      if (res.data.data && res.data.data.length > 0) {
        const pid = res.data.data[0].idProyecto;
        const resDet = await axios.get(
          `${BASE_URL}/proyectos/${pid}/tareas`,
          config,
        );
        console.log(
          `✅ Tareas Proyecto  | OK | Tareas en P-${pid}: ${resDet.data.data?.length ?? 0}`,
        );
      }
    } catch (e: any) {
      console.error(`❌ Proyectos       | ERROR: [${e.response?.status}]`);
    }

    // --- ETAPA 5: VISIBILIDAD ---
    console.log('\n👁️ [VISIBILIDAD] Validando motor de permisos...');
    try {
      const res = await axios.get(
        `${BASE_URL}/visibilidad/${user.carnet}`,
        config,
      );
      console.log(
        `✅ Carnets Visibles | OK | Total: ${res.data.data?.length ?? 0}`,
      );
      const resEmpl = await axios.get(
        `${BASE_URL}/visibilidad/${user.carnet}/empleados`,
        config,
      );
      console.log(
        `✅ Empleados Visib. | OK | Total: ${resEmpl.data.data?.length ?? 0}`,
      );
    } catch (e: any) {
      console.error(`❌ Visibilidad     | ERROR: [${e.response?.status}]`);
    }

    // --- ETAPA 6: PLANNING ---
    console.log('\n🗺️ [PLANNING] Consultando planes y estadísticas...');
    const planTests = [
      { id: 'TEAM', name: 'Planning Team', url: `${BASE_URL}/planning/team` },
      {
        id: 'STATS',
        name: 'Planning Stats',
        url: `${BASE_URL}/planning/stats?mes=${new Date().getMonth() + 1}&anio=${new Date().getFullYear()}`,
      },
      {
        id: 'MY_PROJ',
        name: 'My Projects Plan',
        url: `${BASE_URL}/planning/my-projects`,
      },
    ];

    for (const test of planTests) {
      try {
        const res = await axios.get(test.url, config);
        console.log(`✅ ${test.name.padEnd(15)} | OK`);
      } catch (e: any) {
        console.error(
          `❌ ${test.name.padEnd(15)} | ERROR: [${e.response?.status}]`,
        );
      }
    }

    const duration = (Date.now() - start) / 1000;
    console.log('\n✨ === BARRIDO COMPLETADO EN ' + duration + 's ===');
  } catch (error: any) {
    console.error('\n🛑 FALLO CRÍTICO EN EL BARRIDO:', error.message);
  }
}

runMasterTest();
