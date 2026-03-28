const axios = require('axios');
const { performance } = require('perf_hooks');

const API_URL = 'http://localhost:3201/api';
const credentials = {
    correo: 'gustavo.lira@claro.com.ni',
    password: '123456'
};

const TEST_CONFIG = {
    timeout: 10000 // 10 seconds timeout
};

async function testEndpoint(name, method, url, config = {}) {
    const start = performance.now();
    try {
        const response = await axios({
            method,
            url: `${API_URL}${url}`,
            ...config,
            ...TEST_CONFIG
        });
        const end = performance.now();
        const duration = (end - start).toFixed(2);

        let statusEmoji = '✅';
        if (duration > 500) statusEmoji = '⚠️';
        if (duration > 2000) statusEmoji = '🐢';

        console.log(`${statusEmoji} ${name.padEnd(30)} | ${duration.padStart(8)}ms | Status: ${response.status}`);
        return { success: true, duration, data: response.data };
    } catch (error) {
        const end = performance.now();
        const duration = (end - start).toFixed(2);
        console.log(`❌ ${name.padEnd(30)} | ${duration.padStart(8)}ms | Error: ${error.response ? error.response.status : error.message}`);
        return { success: false, duration, error: error.message };
    }
}

async function runFullTest() {
    console.log('🚀 INICIANDO PRUEBA DE RENDIMIENTO Y PARIDAD (RUST)');
    console.log(`📍 URL Base: ${API_URL}`);
    console.log(`📧 Usuario: ${credentials.correo}`);
    console.log('----------------------------------------------------------------------');
    console.log(`${'Endpoint'.padEnd(32)} | ${'Latencia'.padStart(10)} | Resultado`);
    console.log('----------------------------------------------------------------------');

    // 1. LOGIN (Indispensable para obtener el token)
    const loginResult = await testEndpoint('Auth Login', 'POST', '/auth/login', { data: credentials });
    if (!loginResult.success || !loginResult.data.access_token) {
        console.log('🛑 Abortando: Falló el login.');
        return;
    }

    const token = loginResult.data.access_token;
    const carnet = loginResult.data.user.carnet;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    const hoy = new Date().toISOString().split('T')[0];

    // 2. ENDPOINTS DE EQUIPO
    await testEndpoint('Equipo Hoy', 'GET', `/equipo/hoy?fecha=${hoy}`, authHeaders);
    await testEndpoint('Equipo Backlog', 'GET', '/equipo/backlog', authHeaders);
    await testEndpoint('Equipo Bloqueos', 'GET', '/equipo/bloqueos', authHeaders);
    await testEndpoint('Equipo Actividad', 'GET', '/equipo/actividad', authHeaders);

    // 3. ENDPOINTS DE CLARITY EXTRA / FOCO
    await testEndpoint('Foco List', 'GET', `/foco?fecha=${hoy}`, authHeaders);
    await testEndpoint('KPIs Dashboard', 'GET', '/kpis/dashboard', authHeaders);
    await testEndpoint('Estadísticas Foco', 'GET', `/foco/estadisticas?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`, authHeaders);

    // 4. VISIBILIDAD & ACCESO
    await testEndpoint('Visibilidad Carnets', 'GET', `/visibilidad/${carnet}`, authHeaders);
    await testEndpoint('Visibilidad Actores', 'GET', `/visibilidad/${carnet}/actores`, authHeaders);
    await testEndpoint('Visibilidad Empleados', 'GET', `/visibilidad/${carnet}/empleados`, authHeaders);
    await testEndpoint('Acceso Empleados List', 'GET', '/acceso/empleados', authHeaders);
    await testEndpoint('Organización Catálogo', 'GET', '/organizacion/catalogo', authHeaders);

    // 5. PROYECTOS & TAREAS
    await testEndpoint('Proyectos List', 'GET', '/proyectos', authHeaders);
    await testEndpoint('Mis Proyectos (Planning)', 'GET', '/planning/my-projects', authHeaders);
    await testEndpoint('Marcaje Summary', 'GET', '/marcaje/summary', authHeaders);

    // 6. PRUEBAS MASIVAS DE PARIDAD (NUEVOS MÓDULOS)
    console.log('--- Testeando Módulos Planificación, Marcaje, Jornadas y Reportes ---');
    await testEndpoint('Planning Pending', 'GET', '/planning/pending', authHeaders);
    await testEndpoint('Planning Approvals', 'GET', '/planning/approvals?status=Pendiente', authHeaders);
    await testEndpoint('Planning Stats', 'GET', '/planning/stats', authHeaders);
    await testEndpoint('Gerencia Resumen', 'GET', '/gerencia/resumen', authHeaders);
    await testEndpoint('Dashboard Alerts', 'GET', '/planning/dashboard/alerts', authHeaders);
    await testEndpoint('Reportes Bloqueos Trend', 'GET', '/reportes/bloqueos-trend', authHeaders);
    await testEndpoint('Reportes de Productividad', 'GET', '/reportes/productividad', authHeaders);
    await testEndpoint('Tareas Solicitud Cambio', 'GET', '/tareas/solicitud-cambio/pendientes', authHeaders);

    // Módulo Marcaje Administrador (Aunque el usuario sea Admin o no, la ruta debe responder 200 o 403 o [] pero no 404 ni panic)
    await testEndpoint('Marcaje Admin Solicitudes', 'GET', '/marcaje/admin/solicitudes', authHeaders);
    await testEndpoint('Marcaje Admin Sites', 'GET', '/marcaje/admin/sites', authHeaders);

    // Módulos Jornada y Campo
    await testEndpoint('Jornada Horarios', 'GET', '/jornada/horarios', authHeaders);
    await testEndpoint('Jornada Asignaciones', 'GET', '/jornada/asignaciones', authHeaders);
    await testEndpoint('Visita Campo Agenda', 'GET', '/visita-campo/agenda', authHeaders);
    await testEndpoint('Visita Campo Resumen', 'GET', '/visita-campo/resumen', authHeaders);

    // Módulo de Delegaciones
    await testEndpoint('Acceso Delegacion', 'GET', '/acceso/delegacion', authHeaders);
    await testEndpoint('Acceso Permiso Area', 'GET', '/acceso/permiso-area', authHeaders);

    console.log('----------------------------------------------------------------------');
    console.log('✨ RESUMEN DE TIEMPOS:');
    console.log('✅ < 500ms (Excelente/Normal)');
    console.log('⚠️ > 500ms (Base de Datos lenta o query pesada)');
    console.log('🐢 > 2000ms (Review necesario / Posible timeout)');
}

runFullTest();
