const BASE_URL = 'http://localhost:3200/api';
const EMAIL = 'gustavo.lira@claro.com.ni';
const PASSWORD = '123456';
const CARNET = '500708';

let authToken = '';

async function fetchApi(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(url, { ...options, headers });
        const data = await response.json().catch(() => null);

        return {
            status: response.status,
            ok: response.ok,
            data
        };
    } catch (error) {
        return {
            status: 'NETWORK_ERROR',
            ok: false,
            error: error.message
        };
    }
}

async function runTests() {
    console.log(`\n🚀 Iniciando pruebas profundas de la API Rust (${BASE_URL})`);
    console.log('===========================================================');

    // 1. AUTH: Login
    console.log('\n🔐 [AUTH] Iniciando sesión...');
    const loginRes = await fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ correo: EMAIL, password: PASSWORD })
    });

    if (!loginRes.ok || !loginRes.data?.data?.access_token) {
        console.error('❌ Error en Login:', loginRes.status, loginRes.data);
        console.log('Asegúrate de que la API en Rust esté corriendo (cargo run) y el correo/contraseña sean correctos.');
        return;
    }

    authToken = loginRes.data.data.access_token;
    console.log(`✅ Login Exitoso! Token obtenido (Largo: ${authToken.length})`);

    // 2. AUTH: Get Config
    console.log('\n⚙️  [AUTH] Obteniendo configuración de usuario...');
    const configRes = await fetchApi('/auth/config');
    console.log(configRes.ok ? '✅ OK' : '❌ Error', configRes.status, configRes.data);

    // 3. PLANNING
    console.log('\n📊 [PLANNING] Probando endpoints de carga laboral y pendientes...');
    const planningTests = [
        { name: 'Workload', url: `/planning/workload?carnet=${CARNET}` },
        { name: 'Pending', url: `/planning/pending?carnet=${CARNET}` },
        { name: 'Approvals', url: `/planning/approvals?carnet=${CARNET}` },
        { name: 'Team', url: `/planning/team?carnet=${CARNET}` },
        { name: 'My Projects', url: `/planning/my-projects?carnet=${CARNET}` },
    ];

    for (const test of planningTests) {
        process.stdout.write(`   ➡️ Probando ${test.name}... `);
        const res = await fetchApi(test.url);
        if (res.ok) {
            const count = res.data?.data?.items ? `${res.data.data.items.length} items` : 'OK';
            console.log(`✅ ${count}`);
        } else {
            console.log(`❌ Error ${res.status}`, res.data || res.error);
        }
    }

    // 4. PROYECTOS
    console.log('\n🏗️  [PROYECTOS] Probando gestión de proyectos...');
    const listProyectosRes = await fetchApi(`/proyectos?carnet=${CARNET}`);
    let testProjectId = 1;
    if (listProyectosRes.ok && listProyectosRes.data?.data?.items?.length > 0) {
        testProjectId = listProyectosRes.data.data.items[0].idProyecto;
        console.log(`   ➡️ Lista Proyectos: ✅ ${listProyectosRes.data.data.items.length} items (Usando ID ${testProjectId} para tests detalle)`);
    } else {
        console.log(`   ➡️ Lista Proyectos: ⚠️ No se encontraron proyectos`);
    }

    const proyectosTests = [
        { name: `Detalle Proyecto (${testProjectId})`, url: `/proyectos/${testProjectId}` },
        { name: `Tareas Proyecto (${testProjectId})`, url: `/proyectos/${testProjectId}/tareas` },
        { name: `Colaboradores (${testProjectId})`, url: `/proyectos/${testProjectId}/colaboradores` },
        { name: `Historial (${testProjectId})`, url: `/proyectos/${testProjectId}/historial` },
    ];

    for (const test of proyectosTests) {
        process.stdout.write(`   ➡️ Probando ${test.name}... `);
        const res = await fetchApi(test.url);
        if (res.ok) {
            const count = res.data?.data?.items ? `${res.data.data.items.length} items` :
                res.data?.data?.timeline ? `${res.data.data.timeline.length} events` :
                    res.data?.data?.colaboradores ? `${res.data.data.colaboradores.length} collabs` : 'OK';
            console.log(`✅ ${count}`);
        } else {
            console.log(`❌ Error ${res.status}`, res.data || res.error);
        }
    }

    // 5. VISITAS
    console.log('\n🚶‍♂️ [VISITAS] Probando endpoints de georeferencia y visitas...');
    const visitasTests = [
        { name: 'Agenda Hoy', url: `/visita-campo/agenda?carnet=${CARNET}` },
        { name: 'Dashboard Admin', url: `/visita-admin/dashboard` },
        { name: 'Todas las Visitas', url: `/visita-admin/visitas` },
        { name: 'Resumen Día', url: `/visita-campo/resumen?carnet=${CARNET}` },
    ];

    for (const test of visitasTests) {
        process.stdout.write(`   ➡️ Probando ${test.name}... `);
        const res = await fetchApi(test.url);
        if (res.ok) {
            const count = res.data?.data?.items ? `${res.data.data.items.length} items` : 'OK';
            console.log(`✅ ${count}`);
        } else {
            console.log(`❌ Error ${res.status}`, res.data || res.error);
        }
    }

    // 6. ADMIN / ORGANIZACION
    console.log('\n🏢 [ADMIN / ACCESO] Probando organización y estadísticas...');
    const adminTests = [
        { name: 'Organigrama', url: `/acceso/organizacion/tree` },
        { name: 'Admin Stats', url: `/admin/stats` },
        { name: 'Lista Usuarios', url: `/admin/usuarios` },
    ];

    for (const test of adminTests) {
        process.stdout.write(`   ➡️ Probando ${test.name}... `);
        const res = await fetchApi(test.url);
        if (res.ok) {
            const count = res.data?.data?.items ? `${res.data.data.items.length} items` : 'OK';
            console.log(`✅ ${count}`);
        } else {
            console.log(`❌ Error ${res.status}`, res.data || res.error);
        }
    }

    // 7. TAREAS
    console.log('\n📝 [TAREAS] Probando endpoints de Clarity...');
    const tareasTests = [
        { name: 'Solicitud Cambio Pendientes', url: `/tareas/solicitud-cambio/pendientes` },
        { name: 'Instancias Tarea (101)', url: `/tareas/101/instancias` },
        { name: 'Recurrencia Config (101)', url: `/tareas/101/recurrencia` },
    ];

    for (const test of tareasTests) {
        process.stdout.write(`   ➡️ Probando ${test.name}... `);
        const res = await fetchApi(test.url);
        console.log(res.ok ? '✅ OK' : `❌ Error ${res.status}`);
    }

    // 8. EXTRA: Agenda Compliance
    console.log('\n📅 [EXTRA] Probando Agenda Compliance...');
    try {
        const agendaRes = await fetchApi('/reports/agenda-compliance');
        console.log(agendaRes.ok ? '✅ OK' : `❌ Error ${agendaRes.status}`, agendaRes.data);
    } catch (e) {
        console.error('❌ Error inesperado en Agenda:', e);
    }

    console.log('\n🎉 ===========================================================');
    console.log('✅ Finalizado el ciclo de pruebas.');
    console.log('==============================================================\n');
}

runTests();
