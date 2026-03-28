const fs = require('fs');

async function diag() {
    const out = [];
    const log = (msg) => { console.log(msg); out.push(msg); };

    // Login
    const login = await fetch('http://127.0.0.1:3200/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: 'gustavo.lira@claro.com.ni', password: '123456' })
    });
    const lj = await login.json();
    log(`LOGIN: ${login.status}`);
    const tk = lj.data?.access_token;
    if (!tk) { log('NO TOKEN - ABORT'); fs.writeFileSync('diag_result.txt', out.join('\n')); return; }
    log(`TOKEN OK: ${tk.substring(0, 30)}...`);

    const h = { 'Authorization': 'Bearer ' + tk, 'Content-Type': 'application/json' };

    const endpoints = [
        '/api/proyectos?page=1&limit=10',
        '/api/proyectos/119/tareas',
        '/api/equipo/hoy?fecha=2026-03-09',
        '/api/planning/workload',
        '/api/planning/stats?mes=3&anio=2026',
        '/api/planning/my-projects',
        '/api/mi-dia?fecha=2026-03-09',
        '/api/tareas/mias',
        '/api/planning/team',
        '/api/organizacion/estructura-usuarios',
        '/api/planning/dashboard/alerts',
        '/api/kpis/dashboard',
        '/api/planning/supervision',
        '/api/planning/mi-asignacion',
    ];

    for (const ep of endpoints) {
        try {
            const r = await fetch('http://127.0.0.1:3200' + ep, { headers: h });
            const t = await r.text();
            let parsed;
            try { parsed = JSON.parse(t); } catch { parsed = t; }

            // Count items
            let itemCount = '?';
            if (parsed?.data?.items) itemCount = parsed.data.items.length;
            else if (parsed?.items) itemCount = parsed.items.length;
            else if (Array.isArray(parsed?.data)) itemCount = parsed.data.length;
            else if (Array.isArray(parsed)) itemCount = parsed.length;

            const preview = JSON.stringify(parsed).substring(0, 200);
            log(`\n${ep}`);
            log(`  STATUS: ${r.status} | ITEMS: ${itemCount}`);
            log(`  PREVIEW: ${preview}`);
        } catch (e) {
            log(`\n${ep}`);
            log(`  ERROR: ${e.message}`);
        }
    }

    fs.writeFileSync('diag_result.txt', out.join('\n'));
    log('\n=== DONE - saved to diag_result.txt ===');
}
diag();
