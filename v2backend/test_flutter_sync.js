
const axios = require('axios');

async function testBackend() {
    const baseUrl = 'https://www.rhclaroni.com/api';
    const credentials = {
        correo: 'gustavo.lira@claro.com.ni',
        password: '123456'
    };

    console.log(`--- Iniciando Test para ${credentials.correo} ---`);

    try {
        // 1. Login
        console.time('Login Time');
        const loginRes = await axios.post(`${baseUrl}/auth/login`, credentials);
        console.timeEnd('Login Time');

        const data = loginRes.data.data || loginRes.data;
        const token = data.access_token;
        console.log('✅ Login exitoso');

        const endpoints = ['tasks/me', 'tareas/mias', 'mi-dia', 'planning/mi-asignacion'];

        for (const ep of endpoints) {
            console.log(`\n--- Probando Endpoint: /${ep} ---`);
            console.time(`Time ${ep}`);
            try {
                const res = await axios.get(`${baseUrl}/${ep}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.timeEnd(`Time ${ep}`);
                const tasks = res.data.data ?? res.data;
                const count = Array.isArray(tasks) ? tasks.length : (tasks.tareasSugeridas?.length || 'Object');
                console.log(`✅ [${ep}] Éxito. Resultado:`, typeof tasks === 'object' ? 'Objeto/Lista' : tasks);
                console.log(`   Conteo/Info: ${count}`);
            } catch (err) {
                console.timeEnd(`Time ${ep}`);
                console.error(`❌ [${ep}] Falló:`, err.response?.data?.message || err.message);
            }
        }

    } catch (error) {
        console.error('❌ Error crítico en el test:', error.response?.data || error.message);
    }
}

testBackend();
