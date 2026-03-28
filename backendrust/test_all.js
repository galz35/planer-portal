const fs = require('fs');

const BASE_URL = 'http://localhost:3200';
const API_URL = `${BASE_URL}/api`;

async function testApi() {
    console.log(`\n🚀 Probando API en: ${BASE_URL}\n`);

    try {
        console.log("1. Verificando /health...");
        const healthRes = await fetch(`${BASE_URL}/health`);
        const healthData = await healthRes.json().catch(() => null);
        console.log(`[Health check] Status: ${healthRes.status}`);
        console.log(healthData);

        console.log("\n2. Probando /api/auth/login...");
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: "gustavo.lira@claro.com.ni", password: "123" }) // o 123456
        });
        const loginData = await loginRes.json().catch(() => null);
        console.log(`[Login] Status: ${loginRes.status}`);

        let token = null;
        if (loginData && loginData.data && loginData.data.access_token) {
            token = loginData.data.access_token;
            console.log(`[Login] Éxito! Token obtenido: ${token.substring(0, 15)}...`);
        } else if (loginRes.status === 401 && loginData?.message === "Contraseña incorrecta") {
            console.log("[Login] La contraseña '123' fue incorrecta, intentando '123456'...");
            const retryRes = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo: "gustavo.lira@claro.com.ni", password: "123456" })
            });
            const retryData = await retryRes.json().catch(() => null);
            console.log(`[Login] Reintento Status: ${retryRes.status}`);
            if (retryData && retryData.data && retryData.data.access_token) {
                token = retryData.data.access_token;
                console.log(`[Login] Éxito con 123456! Token obtenido.`);
            } else {
                console.log("[Login] Fallo el reintento:", retryData);
            }
        } else {
            console.log("[Login] Error en login:", loginData);
        }

        if (!token) return;

        // Extraer endpoints
        const content = fs.readFileSync('COMPARACION_API_COMPLETA.txt', 'utf-8');
        const lines = content.split('\n');
        let endpoints = [];

        for (let line of lines) {
            let match = line.match(/^\s*(✅|⚠️|🔸)\s+(GET)\s+([^\s]+)\s+→/);
            if (match) {
                let route = match[3];
                let testRoute = route
                    .replace(':idUsuario', '1')
                    .replace(':idTarea', '1')
                    .replace(':idProyecto', '1')
                    .replace(':idOrg', '1')
                    .replace(':carnetDelegado', '500708') // El carnet de Gustavo Lira (según script anterior)
                    .replace(':carnetDelegante', '500708')
                    .replace(':carnetObjetivo', '500708')
                    .replace(':carnet', '500708')
                    .replace(':idGrupo', '1')
                    .replace(':id_or_carnet', '1')
                    .replace(':id', '1')
                    .replace(':uuid', 'some-device-id')
                    .replace(':nombre', 'TI');

                endpoints.push({ route, testRoute, method: 'GET' });
            }
        }

        console.log(`\n3. Probando ${endpoints.length} endpoints GET...\n`);
        let passed = 0;
        let warnings = 0;
        let failed = 0;

        for (let ep of endpoints) {
            process.stdout.write(`Prueba GET ${ep.testRoute}... `);
            try {
                const res = await fetch(`${API_URL}${ep.testRoute}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    console.log(`✅ [${res.status}] OK`);
                    passed++;
                } else if (res.status >= 400 && res.status < 500) {
                    const data = await res.json().catch(() => null);
                    console.log(`⚠️  [${res.status}] (Esperado) - ${JSON.stringify(data).substring(0, 100)}`);
                    warnings++;
                } else {
                    const data = await res.text().catch(() => null);
                    console.log(`❌ [${res.status}] Fallo - ${data ? data : 'Sin error body'}`);
                    failed++;
                }
            } catch (err) {
                console.log(`❌ Error de conexión: ${err.message}`);
                failed++;
            }
        }

        console.log(`\n=== RESUMEN ===`);
        console.log(`✅ OK: ${passed}`);
        console.log(`⚠️  Warnings (4xx): ${warnings}`);
        console.log(`❌ Fallos (5xx/Err): ${failed}`);
        console.log(`Total probados: ${endpoints.length}`);

    } catch (e) {
        console.error("Excepción en script:", e);
    }
}

testApi();
