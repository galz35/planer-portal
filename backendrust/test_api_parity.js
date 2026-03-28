
const axios = require('axios');

/**
 * Comparador de API: Rust vs NestJS
 * Este script valida que los endpoints críticos devuelvan estructuras compatibles.
 */

async function compareData(label, rustData, nestData) {
    console.log(`\n--- [DIFF] ${label} ---`);
    if (!nestData) {
        console.log('⚠️ NestJS data missing, skipping side-by-side diff.');
        return;
    }

    const rustKeys = Object.keys(rustData || {});
    const nestKeys = Object.keys(nestData || {});

    console.log(`   NestJS keys count: ${nestKeys.length}`);
    console.log(`   Rust keys count: ${rustKeys.length}`);

    const missingInRust = nestKeys.filter(k => !rustKeys.includes(k));
    const extraInRust = rustKeys.filter(k => !nestKeys.includes(k));

    if (missingInRust.length > 0) console.log(`   ❌ Missing in Rust: ${missingInRust.join(', ')}`);
    if (extraInRust.length > 0) console.log(`   ➕ Extra in Rust: ${extraInRust.join(', ')}`);
    if (missingInRust.length === 0) console.log(`   ✅ Paridad de campos completa.`);
}

async function runComparison() {
    const RUST_URL = 'http://localhost:3200/api';
    const NEST_URL = 'http://localhost:3000/api';

    const credentials = {
        correo: 'gustavo.lira@claro.com.ni',
        password: '123456'
    };

    console.log('🚀 Iniciando Comparación Directa: NESTJS (3000) vs RUST (3200)\n');

    try {
        console.log('--- [1] Auth Login ---');
        let rustToken, nestToken, rustUser, nestUser;

        try {
            const r = await axios.post(`${RUST_URL}/auth/login`, credentials);
            rustToken = (r.data.data || r.data).access_token;
            rustUser = (r.data.data || r.data).user;
            console.log('✅ Rust Login OK');
        } catch (e) { console.error('❌ Rust Login Fail:', e.message); }

        try {
            const n = await axios.post(`${NEST_URL}/auth/login`, credentials);
            nestToken = (n.data.data || n.data).access_token;
            nestUser = (n.data.data || n.data).user || n.data.user;
            console.log('✅ Nest Login OK');
        } catch (e) { console.error('❌ Nest Login Fail:', e.message); }

        if (rustUser && nestUser) {
            await compareData('Login User Structure', rustUser, nestUser);
        }

        // Check Endpoints
        const endpoint = 'proyectos';
        console.log(`\n--- [2] Endpoint: /${endpoint} ---`);

        let rustProj, nestProj;
        try {
            const r = await axios.get(`${RUST_URL}/${endpoint}`, { headers: { Authorization: `Bearer ${rustToken}` } });
            rustProj = (r.data.items || r.data)[0];
        } catch (e) { console.error('❌ Rust Proyectos Fail'); }

        try {
            const n = await axios.get(`${NEST_URL}/${endpoint}`, { headers: { Authorization: `Bearer ${nestToken}` } });
            nestProj = (n.data.items || n.data)[0];
        } catch (e) { console.error('❌ Nest Proyectos Fail'); }

        if (rustProj && nestProj) {
            await compareData('Project Item (First)', rustProj, nestProj);
        }

        console.log('\n--- Comparación Finalizada ---');
    } catch (error) {
        console.error('❌ Error general:', error.message);
    }
}

runComparison();
