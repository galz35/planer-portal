
import { checkinUpsert } from './src/clarity/clarity.repo';

async function run() {
    try {
        const tareas = [1762, 1763, 1764, 1765, 1766, 1767]; // 6 tasks we created earlier
        console.log("Adding 6 tasks to checkin para hoy...");
        const idCheckin = await checkinUpsert({
            carnet: '500708',
            fecha: new Date('2026-03-05'),
            entregableTexto: "Prueba 6 tareas",
            entrego: tareas, // 6 tasks in Entrego
        });
        console.log("Exitoso! idCheckin:", idCheckin);
        process.exit(0);
    } catch (e) {
        console.error("Falló:", e);
        process.exit(1);
    }
}
run();
