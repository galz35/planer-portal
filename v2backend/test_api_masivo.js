const axios = require('axios');
const fs = require('fs');

/**
 * CONFIGURACIÓN
 */
const API_BASE = 'http://localhost:3000/api';
const MASTER_PASS = '123456';
const CARNET_ADMIN_INICIAL = '500708'; // Usuario con rol Admin comprobado

async function runTest() {
    console.log('🚀 Iniciando Test Masivo de API (Fase: Usuaria por Usuaria)...');
    console.log(`📍 API: ${API_BASE}`);
    console.log(`🔑 Master Password: ${MASTER_PASS}\n`);

    let adminToken = '';
    const resultados = [];

    // 1. LOGIN INICIAL PARA OBTENER LISTA DE TODOS LOS USUARIOS
    try {
        console.log(`[1/3] Autenticando usuario admin (${CARNET_ADMIN_INICIAL})...`);
        const loginRes = await axios.post(`${API_BASE}/auth/login`, {
            correo: CARNET_ADMIN_INICIAL,
            password: MASTER_PASS
        });

        // Estructura tras Interceptor: { success: true, data: { access_token, ... } }
        adminToken = loginRes.data.data.access_token;
        console.log('✅ Login admin exitoso.\n');
    } catch (e) {
        console.error('❌ Error en login inicial:', e.response?.data || e.message);
        console.log('⚠️ Abortando: Sin token admin no se puede listar la base de usuarios.');
        return;
    }

    // 2. OBTENER LISTADO DE USUARIOS
    let usuarios = [];
    try {
        console.log('[2/3] Obteniendo lista completa de usuarios desde la base...');
        const usersRes = await axios.get(`${API_BASE}/admin/usuarios?limit=200`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        // Estructura: { data: { datos: [...] } }
        usuarios = usersRes.data.data.datos || [];
        console.log(`✅ Se encontraron ${usuarios.length} usuarios para validar.\n`);
    } catch (e) {
        console.error('❌ Error al obtener usuarios:', e.response?.data || e.message);
        return;
    }

    // 3. TESTEAR CADA USUARIO
    console.log(`[3/3] Iniciando validación individual (Login + Endpoints base)...`);

    for (let i = 0; i < usuarios.length; i++) {
        const user = usuarios[i];
        const identifier = user.carnet || user.correo;
        const nombre = user.nombre || 'Sin nombre';

        process.stdout.write(`[${i + 1}/${usuarios.length}] Validando ${identifier} (${nombre.substring(0, 20)})... `);

        const userStatus = {
            id: user.idUsuario,
            usuario: nombre,
            carnet: identifier,
            resultadoLogin: 'PENDIENTE',
            endpoints: {}
        };

        try {
            // A. Prueba LOGIN
            const uLogin = await axios.post(`${API_BASE}/auth/login`, {
                correo: identifier,
                password: MASTER_PASS
            });

            const userToken = uLogin.data.data.access_token;
            userStatus.resultadoLogin = 'OK';

            const headers = { Authorization: `Bearer ${userToken}` };

            // B. Prueba ENDPOINTS CRÍTICOS (GET - Solo lectura)
            const hoy = new Date().toISOString().split('T')[0];
            const endpointsToTest = [
                { key: 'Config', url: '/auth/config' },
                { key: 'Proyectos', url: '/proyectos' },
                { key: 'Mis_Proy', url: '/planning/my-projects' },
                { key: 'Mi_Asign', url: '/planning/mi-asignacion' },
                { key: 'Foco', url: `/foco?fecha=${hoy}` },
                { key: 'Team', url: '/planning/team' },
                { key: 'Alertas', url: '/planning/dashboard/alerts' },
                { key: 'KPIs_Dash', url: '/kpis/dashboard' },
                { key: 'Notific_St', url: '/notifications/status' },
                { key: 'Diag_Ping', url: '/diagnostico/ping' }
            ];

            for (const ep of endpointsToTest) {
                try {
                    await axios.get(`${API_BASE}${ep.url}`, { headers, timeout: 5000 });
                    userStatus.endpoints[ep.key] = 'OK';
                } catch (err) {
                    const status = err.response?.status || 'TIMEOUT/ERR';
                    userStatus.endpoints[ep.key] = `FAIL (${status})`;
                    // Si falla un endpoint crítico que debería ser común, lo marcamos
                    if (status === 500) {
                        console.log(`\n    ⚠️  Error 500 en ${ep.key} para ${identifier}`);
                    }
                }
            }
            console.log('✅');
        } catch (e) {
            userStatus.resultadoLogin = `FAIL (${e.response?.status || e.message})`;
            console.log('❌');
        }

        resultados.push(userStatus);
    }

    // 4. GUARDAR REPORTE
    const reporteFinal = {
        fecha: new Date().toISOString(),
        resumen: {
            total: usuarios.length,
            exitosos: resultados.filter(r => r.resultadoLogin === 'OK').length,
            fallidos: resultados.filter(r => r.resultadoLogin !== 'OK').length
        },
        detalles: resultados
    };

    fs.writeFileSync('reporte_masivo_api.json', JSON.stringify(reporteFinal, null, 2));

    console.log('\n=========================================');
    console.log('🏁 TEST COMPLETADO');
    console.log(`✅ Exitosos: ${reporteFinal.resumen.exitosos}`);
    console.log(`❌ Fallidos: ${reporteFinal.resumen.fallidos}`);
    console.log('📄 Reporte guardado en: reporte_masivo_api.json');
    console.log('=========================================');
}

runTest();
