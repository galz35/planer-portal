
const axios = require('axios');

async function testOverdueEmail() {
    const url = 'http://localhost:3000/api/notifications/test-overdue-redesign';
    console.log(`🚀 Iniciando prueba de diseño de correo atrasado...`);
    console.log(`🔗 URL: ${url}`);

    try {
        const response = await axios.get(url);
        console.log('✅ Respuesta del servidor:', JSON.stringify(response.data, null, 2));
        console.log('\n📧 Por favor, revisa tu bandeja de entrada: gustavo.lira@claro.com.ni');
    } catch (error) {
        console.error('❌ Error al ejecutar la prueba:', error.message);
        if (error.response) {
            console.error('Detalles del error:', error.response.data);
        } else {
            console.log('Asegúrate de que el backend esté corriendo en el puerto 3000.');
        }
    }
}

testOverdueEmail();
