const EMAIL = 'gustavo.lira@claro.com.ni';
const PASSWORD = '123456';
const CARNET = '500708';

const BACKENDS = [
    { name: 'Rust', url: 'http://localhost:3200/api', token: '' },
    { name: 'Nest', url: 'http://localhost:3000/api', token: '' }
];

async function fetchWithTimeout(url, options, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
}

async function testBackend(backend) {
    console.log(`\n--- Probando Backend: ${backend.name} (${backend.url}) ---`);
    
    // 1. Login
    try {
        const loginRes = await fetch(`${backend.url}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: EMAIL, password: PASSWORD })
        });
        
        const loginData = await loginRes.json();
        if (!loginRes.ok) {
            console.error(`❌ Login fallido en ${backend.name}:`, loginRes.status, loginData);
            return null;
        }
        
        backend.token = loginData.data?.access_token || loginData.access_token;
        console.log(`✅ Login OK (Token: ${backend.token.substring(0, 15)}...)`);
    } catch (e) {
        console.error(`❌ Error de red en Login ${backend.name}:`, e.message);
        return null;
    }

    const commonEndpoints = [
        '/auth/config',
        `/planning/workload?carnet=${CARNET}`,
        `/planning/pending?carnet=${CARNET}`,
        `/planning/approvals?carnet=${CARNET}`,
        `/planning/team?carnet=${CARNET}`,
        `/planning/my-projects?carnet=${CARNET}`,
        `/proyectos?carnet=${CARNET}`,
        `/visita-campo/agenda?carnet=${CARNET}`,
        '/visita-admin/dashboard',
        '/admin/stats',
        '/admin/usuarios',
        '/tareas/mias',
        '/reports/agenda-compliance'
    ];

    const results = {};

    for (const endpoint of commonEndpoints) {
        try {
            const start = Date.now();
            const res = await fetchWithTimeout(`${backend.url}${endpoint}`, {
                headers: { 'Authorization': `Bearer ${backend.token}` }
            });
            const duration = Date.now() - start;
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch(e) { data = { msg: text.substring(0, 50) }; }
            
            let message = data.message || data.msg || '';
            if (Array.isArray(message)) message = message.join(', ');
            
            results[endpoint] = {
                status: res.status,
                ok: res.ok,
                duration,
                dataLength: text.length,
                message: String(message)
            };
            
            const statusIcon = res.ok ? '✅' : '❌';
            const msgInfo = res.ok ? '' : ` -> ${results[endpoint].message}`;
            console.log(`${statusIcon} ${endpoint} [${res.status}] (${duration}ms)${msgInfo}`);
        } catch (e) {
            console.log(`❌ ${endpoint} Error: ${e.message}`);
            results[endpoint] = { error: e.message };
        }
    }
    return results;
}

async function runFullAudit() {
    console.log('🚀 Iniciando Auditoria Comparativa Rust vs Nest (Final)');
    console.log(`Email: ${EMAIL} | Carnet: ${CARNET}`);
    
    const rustResults = await testBackend(BACKENDS[0]);
    const nestResults = await testBackend(BACKENDS[1]);
    
    if (!rustResults || !nestResults) {
        console.error('\n⚠️ No se pudo completar la comparacion.');
        return;
    }

    console.log('\n📊 COMPARATIVA FINAL');
    console.log('========================================================================================================');
    console.log(`| ${'Endpoint'.padEnd(41)} | ${'Rust'.padEnd(14)} | ${'Nest'.padEnd(14)} | ${'Obs'.padEnd(20)} |`);
    console.log('--------------------------------------------------------------------------------------------------------');
    
    const endpoints = Object.keys(rustResults);
    for (const ep of endpoints) {
        const r = rustResults[ep];
        const n = nestResults[ep];
        
        let rStr = r.error ? 'ERROR' : `${r.status} (${r.duration}ms)`;
        let nStr = n.error ? 'ERROR' : `${n.status} (${n.duration}ms)`;
        
        let diff = '';
        if (r.status !== n.status) {
            diff = '⚠️ STATUS';
            if (n.status >= 400) diff += ` (Nest: ${n.message.substring(0, 10)}...)`;
        }
        else if (Math.abs(r.dataLength - n.dataLength) > 500) diff = '⚠️ SIZE';
        
        console.log(`| ${ep.padEnd(41)} | ${rStr.padEnd(14)} | ${nStr.padEnd(14)} | ${diff.padEnd(20)} |`);
    }
    console.log('========================================================================================================');
}

runFullAudit();
