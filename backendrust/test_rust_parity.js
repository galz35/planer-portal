const axios = require('axios');

const API_URL = 'http://localhost:3201/api';
const credentials = {
    correo: 'gustavo.lira@claro.com.ni',
    password: '123456'
};

async function testRustBackend() {
    console.log('🚀 Iniciando Prueba de Integración: Rust Backend');
    console.log(`📍 URL Base: ${API_URL}`);
    console.log(`📧 Usuario: ${credentials.correo}`);
    console.log('--------------------------------------------------');

    try {
        // 1. LOGIN
        console.log('🔑 Paso 1: Intentando Login...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, credentials);
        console.log('DEBUG: Login Response Data:', JSON.stringify(loginRes.data, null, 2));

        if (!loginRes.data || !loginRes.data.access_token) {
            throw new Error('No se recibió access_token en el login');
        }

        const token = loginRes.data.access_token;
        const user = loginRes.data.user;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        console.log('✅ Login Exitoso!');
        console.log(`👤 Usuario: ${user.nombre} | Carnet: ${user.carnet}`);
        console.log('--------------------------------------------------');

        // 2. PRUEBA ENDPOINT EQUIPO (Uno de los nuevos que implementamos)
        console.log('👥 Paso 2: Probando endpoint /equipo/hoy...');
        const hoy = new Date().toISOString().split('T')[0];
        const equipoRes = await axios.get(`${API_URL}/equipo/hoy?fecha=${hoy}`, config);

        console.log(`✅ Resultado /equipo/hoy: ${Array.isArray(equipoRes.data.miembros) ? 'OK' : 'Error'}`);
        console.log(`📊 Miembros encontrados: ${equipoRes.data.miembros?.length || 0}`);
        console.log('--------------------------------------------------');

        // 3. PRUEBA ENDPOINT FOCO
        console.log('🎯 Paso 3: Probando endpoint /foco (Mis Objetivos)...');
        const focoRes = await axios.get(`${API_URL}/foco?fecha=${hoy}`, config);
        console.log(`✅ Resultado /foco: ${Array.isArray(focoRes.data) ? 'OK' : 'Error'}`);
        console.log(`📝 Items en el foco: ${focoRes.data.length || 0}`);
        console.log('--------------------------------------------------');

        // 4. PRUEBA ENDPOINT KPI
        console.log('📈 Paso 4: Probando endpoint /kpis/dashboard...');
        const kpiRes = await axios.get(`${API_URL}/kpis/dashboard`, config);
        console.log('✅ Resultado /kpis/dashboard:', JSON.stringify(kpiRes.data.resumen, null, 2));
        console.log('--------------------------------------------------');

        console.log('✨ TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO');

    } catch (error) {
        console.error('❌ ERROR DURANTE LA PRUEBA:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testRustBackend();
