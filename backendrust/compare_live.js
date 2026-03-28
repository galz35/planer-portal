
const axios = require('axios');

const CREDENTIALS = {
  correo: 'gustavo.lira@claro.com.ni',
  password: '123456'
};

const RUST_URL = 'http://localhost:3200/api';
const NEST_URL = 'http://localhost:3000/api';

async function testEndpoint(name, path, tokenRust, tokenNest) {
  process.stdout.write(`   ➡️ ${name.padEnd(25)}... `);
  const start = Date.now();
  
  try {
    const [resRust, resNest] = await Promise.all([
      axios.get(`${RUST_URL}${path}`, { headers: { Authorization: `Bearer ${tokenRust}` } }).catch(e => e.response),
      axios.get(`${NEST_URL}${path}`, { headers: { Authorization: `Bearer ${tokenNest}` } }).catch(e => e.response)
    ]);

    const durRust = Date.now() - start;
    
    const statusRust = resRust?.status || 'ERR';
    const statusNest = resNest?.status || 'ERR';

    // 1. Comparar Status
    if (statusRust !== statusNest) {
      console.log(`❌ STATUS DIFF [Rust: ${statusRust}, Nest: ${statusNest}]`);
      return false;
    }

    // 2. Comparar Estructura Base (Envelope)
    const bodyRust = resRust?.data;
    const bodyNest = resNest?.data;

    if (bodyRust?.success !== bodyNest?.success) {
      console.log(`❌ ENVELOPE DIFF (success) [Rust: ${bodyRust?.success}, Nest: ${bodyNest?.success}]`);
      return false;
    }

    if (statusRust === 200) {
      // Comparar llaves de DATA
      const keysRust = Object.keys(bodyRust?.data || {}).sort();
      const keysNest = Object.keys(bodyNest?.data || {}).sort();
      
      if (JSON.stringify(keysRust) !== JSON.stringify(keysNest)) {
        console.log(`⚠️ KEYS DIFF IN DATA [Rust: ${keysRust.join(',')}, Nest: ${keysNest.join(',')}]`);
        // No retornamos false aquí todavía, solo advertimos
      } else {
        console.log(`✅ OK [Rust: ${durRust}ms]`);
      }
      return true;
    }
  } catch (e) {
    console.log(`❌ ERROR: ${e.message}`);
    return false;
  }
}

async function start() {
  console.log(`\n🚀 COMPARACIÓN EN TIEMPO REAL: RUST (3200) vs NEST.JS (3000)`);
  console.log(`⏰ Hora de prueba: ${new Date().toLocaleString()}`);
  console.log(`===========================================================\n`);

  try {
    console.log(`🔐 [AUTH] Autenticando en ambos backends...`);
    const [authRust, authNest] = await Promise.all([
      axios.post(`${RUST_URL}/auth/login`, CREDENTIALS),
      axios.post(`${NEST_URL}/auth/login`, CREDENTIALS)
    ]);

    const tokenRust = authRust.data.data.access_token || authRust.data.data.token;
    const tokenNest = authNest.data.data.access_token;
    
    console.log(`✅ Login Exitoso en ambos sistemas.\n`);

    const carnet = '500708';

    console.log(`📊 [PLANNING / CORE]`);
    await testEndpoint('Workload', `/planning/workload?carnet=${carnet}`, tokenRust, tokenNest);
    await testEndpoint('Pending Requests', `/planning/pending?carnet=${carnet}`, tokenRust, tokenNest);
    await testEndpoint('Approvals', `/planning/approvals?carnet=${carnet}`, tokenRust, tokenNest);
    await testEndpoint('My Team', `/planning/team?carnet=${carnet}`, tokenRust, tokenNest);
    await testEndpoint('My Projects', `/planning/my-projects?carnet=${carnet}`, tokenRust, tokenNest);
    await testEndpoint('Dashboard Alerts', `/planning/dashboard/alerts`, tokenRust, tokenNest);

    console.log(`\n🏗️  [PROYECTOS]`);
    // Quitamos carnet= de proyectos porque Nest no lo soporta en el DTO
    await testEndpoint('List Proyectos', `/proyectos`, tokenRust, tokenNest);
    await testEndpoint('Detalle Proyecto 201', `/proyectos/201`, tokenRust, tokenNest);
    await testEndpoint('Tareas Proyecto 201', `/proyectos/201/tareas`, tokenRust, tokenNest);
    await testEndpoint('Colaboradores 201', `/proyectos/201/colaboradores`, tokenRust, tokenNest);

    console.log('\n📝 [TAREAS]');
    await testEndpoint('Mis Tareas', `/tareas/mias`, tokenRust, tokenNest);
    await testEndpoint('Detalle Tarea 2084', `/tareas/2084`, tokenRust, tokenNest);
    await testEndpoint('Histórico (30 días)', `/tareas/historico/${carnet}?dias=30`, tokenRust, tokenNest);
    await testEndpoint('Solicitudes Pendientes', `/tareas/solicitud-cambio/pendientes`, tokenRust, tokenNest);

    console.log('\n🏢 [ADMIN / ACCESO]');
    await testEndpoint('Organigrama Tree', `/acceso/organizacion/tree`, tokenRust, tokenNest);
    await testEndpoint('Lista Usuarios', `/admin/usuarios`, tokenRust, tokenNest);
    await testEndpoint('Acceso Empleados', `/acceso/empleados`, tokenRust, tokenNest);
    await testEndpoint('Stats Globales', `/planning/stats`, tokenRust, tokenNest);

    console.log('\n📅 [REPORTES]');
    const today = new Date().toISOString().split('T')[0];
    await testEndpoint('Agenda Compliance', `/reports/agenda-compliance?fecha=${today}`, tokenRust, tokenNest);
    await testEndpoint('Productividad', `/reportes/productividad`, tokenRust, tokenNest);

    console.log(`\n🎉 ===========================================================`);
    console.log(`🏁 Ciclo de comparación finalizado.`);
    console.log(`==============================================================\n`);

  } catch (e) {
    console.error(`\n❌ FALLO CRÍTICO EN LA PRUEBA:`, e.response?.data || e.message);
  }
}

start();
