const fs = require('fs');

async function check() {
    console.log("Checking errors directly...");
    const loginRes = await fetch("http://localhost:3200/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: "gustavo.lira@claro.com.ni", password: "123456" })
    });
    const { data } = await loginRes.json();
    const token = data.access_token;

    const eps = [
        "/api/planning/workload?carnet=500708",
        "/api/visita-admin/agenda/500708",
        "/api/visita-admin/metas",
        "/api/acceso/empleado/500708",
        "/api/admin/usuarios",
        "/api/admin/logs",
        "/api/admin/audit-logs",
        "/api/admin/organigrama"
    ];

    for (let ep of eps) {
        let res = await fetch(`http://localhost:3200${ep}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        let body = await res.text();
        console.log(`\n=== ${ep} ===`);
        console.log(`Status: ${res.status}`);
        console.log(body);
    }
}
check();
