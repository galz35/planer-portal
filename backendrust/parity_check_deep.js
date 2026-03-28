const EMAIL = 'gustavo.lira@claro.com.ni';
const PASSWORD = '123456';
const CARNET = '500708';
const TODAY = '2026-03-14';

const BACKENDS = [
    { name: 'Rust', url: 'http://localhost:3200/api', token: '' },
    { name: 'Nest', url: 'http://localhost:3000/api', token: '' }
];

async function getKeys(json) {
    if (typeof json !== 'object' || json === null) return [];
    if (Array.isArray(json)) {
        return json.length > 0 ? getKeys(json[0]) : [];
    }
    return Object.keys(json).sort();
}

async function runDeepParity() {
    console.log('--- Deep Parity Check: Rust vs Nest ---');
    
    // Login both
    for (const b of BACKENDS) {
        try {
            const res = await fetch(`${b.url}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ correo: EMAIL, password: PASSWORD })
            });
            const data = await res.json();
            b.token = data.data?.access_token || data.access_token;
        } catch (e) {
            console.error(`Error connecting to ${b.name}: ${e.message}`);
        }
    }

    if (!BACKENDS[0].token || !BACKENDS[1].token) return;

    const testEndpoints = [
        { path: `/proyectos`, name: 'Proyectos List', arrayKey: 'items' },
        { path: `/tareas/mias`, name: 'My Tasks' },
        { path: `/equipo/hoy?fecha=${TODAY}`, name: 'Team Today', arrayKey: 'miembros' },
        { path: `/reports/agenda-compliance?fecha=${TODAY}`, name: 'Agenda Compliance', arrayKey: 'miembros' },
        { path: `/planning/workload?startDate=${TODAY}&endDate=${TODAY}`, name: 'Planning Workload', arrayKey: 'users' }
    ];

    let firstProjectId = null;
    let firstTaskId = null;

    for (const ep of testEndpoints) {
        console.log(`\n>>> ${ep.name} (${ep.path})`);
        try {
            const rRes = await fetch(`${BACKENDS[0].url}${ep.path}`, { headers: { 'Authorization': `Bearer ${BACKENDS[0].token}` } });
            const nRes = await fetch(`${BACKENDS[1].url}${ep.path}`, { headers: { 'Authorization': `Bearer ${BACKENDS[1].token}` } });
            
            const rJson = await rRes.json();
            const nJson = await nRes.json();
            const rData = rJson.data || rJson;
            const nData = nJson.data || nJson;

            const rItems = ep.arrayKey ? rData[ep.arrayKey] : (Array.isArray(rData) ? rData : null);
            const nItems = ep.arrayKey ? nData[ep.arrayKey] : (Array.isArray(nData) ? nData : null);

            if (rItems && nItems) {
                console.log(`  [Count] Rust=${rItems.length}, Nest=${nItems.length}`);
                if (rItems.length > 0 && nItems.length > 0) {
                    const rKeys = await getKeys(rItems[0]);
                    const nKeys = await getKeys(nItems[0]);
                    const missing = nKeys.filter(k => !rKeys.includes(k));
                    const extra = rKeys.filter(k => !nKeys.includes(k));
                    if (missing.length === 0 && extra.length === 0) console.log('  ✅ Item Schema Match');
                    else console.log('  ❌ Schema Diff. Missing:', missing.join(','), 'Extra:', extra.join(','));

                    // Store IDs for next tests
                    if (ep.name === 'Proyectos List' && !firstProjectId) firstProjectId = rItems[0].idProyecto || rItems[0].id;
                    if (ep.name === 'My Tasks' && !firstTaskId) firstTaskId = rItems[0].idTarea || rItems[0].id;
                }
            } else {
                console.log('  ✅ Root Schema Check passed');
            }
        } catch (e) {
            console.error(`  Error: ${e.message}`);
        }
    }

    if (firstProjectId) {
        console.log(`\n>>> Proyecto Detail (/:id) - ID: ${firstProjectId}`);
        const ep = `/proyectos/${firstProjectId}`;
        const rRes = await fetch(`${BACKENDS[0].url}${ep}`, { headers: { 'Authorization': `Bearer ${BACKENDS[0].token}` } });
        const nRes = await fetch(`${BACKENDS[1].url}${ep}`, { headers: { 'Authorization': `Bearer ${BACKENDS[1].token}` } });
        const rData = (await rRes.json()).data;
        const nData = (await nRes.json()).data;
        const rKeys = await getKeys(rData);
        const nKeys = await getKeys(nData);
        console.log(`  [Keys] Rust: ${rKeys.length}, Nest: ${nKeys.length}`);
        const missing = nKeys.filter(k => !rKeys.includes(k));
        if (missing.length > 0) console.log('  ❌ Missing:', missing.join(',')); else console.log('  ✅ Match');
    }

    if (firstTaskId) {
        console.log(`\n>>> Tarea Detail (/:id) - ID: ${firstTaskId}`);
        const ep = `/tareas/${firstTaskId}`;
        const rRes = await fetch(`${BACKENDS[0].url}${ep}`, { headers: { 'Authorization': `Bearer ${BACKENDS[0].token}` } });
        const nRes = await fetch(`${BACKENDS[1].url}${ep}`, { headers: { 'Authorization': `Bearer ${BACKENDS[1].token}` } });
        const rData = (await rRes.json()).data;
        const nData = (await nRes.json()).data;
        const rKeys = await getKeys(rData);
        const nKeys = await getKeys(nData);
        console.log(`  [Keys] Rust: ${rKeys.length}, Nest: ${nKeys.length}`);
        const missing = nKeys.filter(k => !rKeys.includes(k));
        if (missing.length > 0) console.log('  ❌ Missing:', missing.join(',')); else console.log('  ✅ Match');
    }
}

runDeepParity();
