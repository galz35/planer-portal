const axios = require('axios');
const fs = require('fs');

const API_BASE = 'http://localhost:3000/api';
// Backdoor Master Password
const PASS = '123456';

async function runTest() {
    console.log('🚀 Iniciando Test Masivo de API Usuaria por Usuaria...\n');

    // 1. Obtener lista de usuarios (usando un carnet conocido para entrar al admin si es posible, 
    // o asumiendo que el primer login nos da acceso para listar si somos admin)
    // Para este script, intentaremos loguear con un usuario admin común o el que nos digas.
    // Intentaremos con un carnet genérico para obtener la lista.
    const TEST_USER = 'GLIRA';
    let token = '';

    try {
        console.log(`🔑 Intentando login inicial con carnet: ${TEST_USER}`);
        const loginRes = await axios.post(`${API_BASE}/auth/login`, {
            correo: TEST_USER,
            password: PASS
        });
        token = loginRes.data.access_token;
        console.log('✅ Login inicial exitoso.\n');
    } catch (e) {
        console.error('❌ Error en login inicial:', e.message);
        return;
    }

    // 2. Obtener todos los usuarios para testear uno por uno
    console.log('📋 Obteniendo lista de usuarios...');
    let usuarios = [];
    try {
        const usersRes = await axios.get(`${API_BASE}/admin/usuarios`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        usuarios = usersRes.data.datos || [];
        console.log(`✅ Se encontraron ${usuarios.length} usuarios.\n`);
    } catch (e) {
        console.error('❌ Error al obtener usuarios:', e.message);
        // Fallback: Si no podemos listar, testeamos solo al actual
        usuarios = [{ carnet: TEST_USER, nombre: 'Usuario Actual' }];
    }

    const resultados = [];

    for (const user of usuarios) {
        const identifier = user.carnet || user.correo;
        console.log(`--- Testeando Usuario: ${user.nombre} (${identifier}) ---`);

        let userToken = '';
        const userStatus = {
            usuario: user.nombre,
            carnet: identifier,
            login: 'PENDIENTE',
            endpoints: []
        };

        // A. Test Login
        try {
            const uLogin = await axios.post(`${API_BASE}/auth/login`, {
                correo: identifier,
                password: PASS
            });
            userToken = uLogin.data.access_token;
            userStatus.login = 'OK';
            console.log('  ✅ Login OK');
        } catch (e) {
            userStatus.login = `FAIL (${e.response?.status || e.message})`;
            console.log(`  ❌ Login FAIL: ${userStatus.login}`);
            resultados.push(userStatus);
            continue;
        }

        const headers = { Authorization: `Bearer ${userToken}` };

        // B. Test Endpoints Base de todo usuario
        const testEndpoints = [
            { name: 'Configuración', url: '/auth/config', method: 'get' },
            { name: 'Mis Proyectos', url: '/proyectos', method: 'get' },
            { name: 'Mi Día', url: `/planning/my-day?fecha=${new Date().toISOString().split('T')[0]}`, method: 'get' },
            { name: 'Notificaciones', url: '/notifications', method: 'get' },
            { name: 'KPIs Personales', url: '/kpis/personal', method: 'get' }
        ];

        for (const ep of testEndpoints) {
            try {
                if (ep.method === 'get') {
                    await axios.get(`${API_BASE}${ep.url}`, { headers });
                }
                userStatus.endpoints.push({ name: ep.name, status: 'OK' });
                console.log(`  ✅ ${ep.name} OK`);
            } catch (e) {
                const status = e.response?.status || 'ERR';
                userStatus.endpoints.push({ name: ep.name, status: `FAIL (${status})` });
                console.log(`  ❌ ${ep.name} FAIL: ${status}`);
            }
        }

        resultados.push(userStatus);
        console.log('\n');
    }

    // 3. Generar Reporte
    const total = resultados.length;
    const exitosos = resultados.filter(u => u.login === 'OK').length;

    console.log('=========================================');
    console.log('🏁 TEST FINALIZADO');
    console.log(`Total Usuarios: ${total}`);
    console.log(`Logins Exitosos: ${exitosos}`);
    console.log(`Logins Fallidos: ${total - exitosos}`);
    console.log('=========================================');

    fs.writeFileSync('reporte_test_usuarios.json', JSON.stringify(resultados, null, 2));
    console.log('📄 Reporte detallado guardado en: reporte_test_usuarios.json');
}

runTest();
