
import { checkinUpsert } from './src/clarity/clarity.repo';
import { crearTarea } from './src/clarity/tasks.repo';
import { TaskStatus, TaskPriority, TaskType } from './src/common/enums/task.enums';

async function run() {
    try {
        const idUsuario = 23;
        const carnet = '500708';
        const today = new Date();
        const tareasParaHoy = [];

        console.log("Creando 15 tareas...");
        for (let i = 1; i <= 15; i++) {
            const idTarea = await crearTarea({
                titulo: `Tarea de prueba ${i} para Agenda`,
                idCreador: idUsuario,
                creadorCarnet: carnet,
                idResponsable: idUsuario,
                estado: TaskStatus.Pendiente,
                prioridad: TaskPriority.Media,
                tipo: TaskType.Administrativa,
                fechaInicioPlanificada: today,
                fechaObjetivo: today,
            });
            tareasParaHoy.push(idTarea);
        }

        console.log("Registrando tareas en la agenda...");
        const idCheckin = await checkinUpsert({
            carnet,
            fecha: today,
            entregableTexto: "Test 15 tareas principales",
            entrego: tareasParaHoy,
        });

        console.log("Exitoso! idCheckin:", idCheckin);
        process.exit(0);
    } catch (e) {
        console.error("Falló:", e);
        process.exit(1);
    }
}
run();
