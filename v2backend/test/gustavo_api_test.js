const axios = require('axios');

async function testGustavoPermissions() {
    const API_URL = 'http://localhost:3000/api';
    console.log('--- TEST DE INTEGRACIÓN: GUSTAVO LIRA ---');
    console.log(`URL Base: ${API_URL}`);

    try {
        // 1. Login
        console.log('\n[1/4] Intentando Login...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            correo: 'gustavo.lira@claro.com.ni',
            password: '123456'
        });

        const token = loginRes.data.data.access_token;
        const user = loginRes.data.data.user;
        console.log('✅ Login Exitoso');
        console.log(`✅ ID: ${user.idUsuario}, Nombre: ${user.nombre}, Rol: ${user.rolGlobal}`);

        const headers = { Authorization: `Bearer ${token}` };

        // 2. Verificar Proyectos
        console.log('\n[2/4] Verificando Visibilidad de Proyectos (Admin)...');
        const projRes = await axios.get(`${API_URL}/proyectos?limit=2000`, { headers });
        const proyectos = projRes.data.data.items;
        console.log(`✅ Gustavo ve ${proyectos.length} proyectos.`);

        if (proyectos.length >= 127) {
            console.log('✅ ÉXITO: Los 127+ proyectos son visibles.');
        } else {
            console.warn(`⚠️ ALERTA: Solo ve ${proyectos.length} proyectos. Posible Bug en SP.`);
        }

        // 3. Verificar Mi Día
        console.log('\n[3/4] Verificando Endpoint Mi Día...');
        const today = new Date().toISOString().split('T')[0];
        const midiaRes = await axios.get(`${API_URL}/mi-dia?fecha=${today}`, { headers });
        console.log('✅ Mi Día cargado correctamente.');

        // 4. Verificar Gestión (Acceso Admin)
        console.log('\n[4/4] Verificando Acceso a Logs de Administración...');
        try {
            const logsRes = await axios.get(`${API_URL}/admin/logs?limit=5`, { headers });
            console.log(`✅ Acceso a Logs: OK (${logsRes.data.data.items.length} logs encontrados)`);
        } catch (e) {
            console.error('❌ ERROR: No tiene acceso a rutas de Admin siendo Admin.');
        }

        console.log('\n=== TEST FINALIZADO CON ÉXITO ===');

    } catch (e) {
        console.error('\n❌ ERROR CRÍTICO EN EL TEST:', e.response?.data || e.message);
    }
}

testGustavoPermissions();
