const axios = require('axios');
const fs = require('fs');

const RUST_URL = 'http://localhost:3200/api';
const NEST_URL = 'http://localhost:3000/api';
const EMAIL = 'gustavo.lira@claro.com.ni';
const PASSWORD = '123456';

async function getTokens() {
    let tokens = { rust: null, nest: null };
    try {
        const r = await axios.post(`${RUST_URL}/auth/login`, { correo: EMAIL, password: PASSWORD });
        tokens.rust = r.data.data.access_token;
    } catch (e) { console.error('Error Login Rust:', e.message); }
    try {
        const n = await axios.post(`${NEST_URL}/auth/login`, { correo: EMAIL, password: PASSWORD });
        tokens.nest = n.data.data.access_token;
    } catch (e) { console.error('Error Login Nest:', e.message); }
    return tokens;
}

async function runParity() {
    const tokens = await getTokens();
    if (!tokens.rust || !tokens.nest) {
        console.error('No se pudieron obtener ambos tokens. Abortando.');
        return;
    }

    const endpoints = [
        { name: 'Workload', url: '/planning/workload' },
        { name: 'PendingTasks', url: '/planning/pending' },
        { name: 'FocoDiario', url: '/foco?fecha=2026-03-15' },
        { name: 'KPIsDashboard', url: '/kpis/dashboard' },
        { name: 'Organigrama', url: '/acceso/organizacion/tree' },
        { name: 'Recordatorios', url: '/recordatorios' },
        { name: 'Config', url: '/config' }
    ];

    let results = [];

    for (const ep of endpoints) {
        console.log(`Probando ${ep.name}...`);
        let res = { endpoint: ep.name, url: ep.url, rust: null, nest: null, diff: [] };
        
        try {
            const r = await axios.get(`${RUST_URL}${ep.url}`, { headers: { Authorization: `Bearer ${tokens.rust}` } });
            res.rust = r.data;
        } catch (e) { res.rust = { error: e.message }; }

        try {
            const n = await axios.get(`${NEST_URL}${ep.url}`, { headers: { Authorization: `Bearer ${tokens.nest}` } });
            res.nest = n.data;
        } catch (e) { res.nest = { error: e.message }; }

        // Comparar llaves de data
        const rustData = res.rust?.data || res.rust;
        const nestData = res.nest?.data || res.nest;

        if (rustData && nestData && typeof rustData === 'object' && typeof nestData === 'object') {
            const rKeys = Object.keys(Array.isArray(rustData) ? (rustData[0] || {}) : rustData);
            const nKeys = Object.keys(Array.isArray(nestData) ? (nestData[0] || {}) : nestData);
            res.diff = nKeys.filter(k => !rKeys.includes(k));
        }

        results.push(res);
    }

    fs.writeFileSync('parity_results.json', JSON.stringify(results, null, 2));
    console.log('Paridad guardada en parity_results.json');
}

runParity();
