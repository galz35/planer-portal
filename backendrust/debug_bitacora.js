
const axios = require('axios');

async function testBitacora() {
    const API_URL = 'http://127.0.0.1:3200/api';
    const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOjIzLCJjb3JyZW8iOiJndXN0YXZvLmxpcmFAY2xhcm8uY29tLm5pIiwidXNlcklkIjoyMywiY2FybmV0IjoiNTAwNzA4Iiwibm9tYnJlIjoiR1VTVEFWTyBBRE9MRk8gTElSQSBTQUxBWkFSIiwiaWRSb2wiOjEsInJvbCI6IkFkbWluIiwicGFpcyI6Ik5JIiwiZXhwIjoxNzc0MjA4MjkxfQ.3ixjHt2iRPOBFC6tHMJYTkoAdaZ-SxnLkAPoInuq2aI';
    const userId = 23;
    const carnet = '500708';
    
    console.log(`Using provided token for User ${userId}, Carnet ${carnet}`);
    
    const config = {
        headers: { Authorization: `Bearer ${token}` }
    };
    
    try {
        // Test /equipo/miembro/:idUsuario/tareas
        console.log(`Testing /equipo/miembro/${userId}/tareas...`);
        const res1 = await axios.get(`${API_URL}/equipo/miembro/${userId}/tareas`, config);
        console.log(`Response length: ${Array.isArray(res1.data) ? res1.data.length : 'not an array'}`);
        if (Array.isArray(res1.data) && res1.data.length > 0) {
            console.log('First task sample:', JSON.stringify(res1.data[0], null, 2));
        } else {
            console.log('Full response 1:', JSON.stringify(res1.data, null, 2));
        }

        // Test /tareas/historico/:carnet
        console.log(`\nTesting /tareas/historico/${carnet}...`);
        const res2 = await axios.get(`${API_URL}/tareas/historico/${carnet}?dias=30`, config);
        console.log(`Response status: ${res2.status}`);
        const data2 = res2.data;
        console.log(`Response length: ${Array.isArray(data2.data) ? data2.data.length : 'not an array'}`);
        if (data2.success && Array.isArray(data2.data)) {
            console.log(`Items found: ${data2.data.length}`);
            if (data2.data.length > 0) {
                console.log('First historic sample:', JSON.stringify(data2.data[0], null, 2));
            }
        } else {
            console.log('Full response 2:', JSON.stringify(data2, null, 2));
        }

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testBitacora();
