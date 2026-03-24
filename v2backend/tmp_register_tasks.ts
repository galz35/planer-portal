
import { crearTarea } from './src/clarity/tasks.repo';
import { TaskStatus, TaskPriority, TaskType } from './src/common/enums/task.enums';

async function run() {
    const idUsuario = 23;
    const carnet = '500708';
    const today = new Date('2026-03-05');

    const tareas = [
        "Revisión de cronograma de proyectos CENAM",
        "Seguimiento a solicitudes de cotización pendientes",
        "Actualización de tablero Kanban de pedidos",
        "Reunión de alineación con equipo logístico",
        "Auditoría de marcajes del módulo móvil",
        "Revisión de indicadores de desempeño (KPIs)",
        "Validación de nuevas geocercas implementadas",
        "Preparación de reporte semanal de avances",
        "Seguimiento a tickets de soporte de usuario",
        "Revisión de presupuesto trimestral",
        "Optimización de procesos de facturación",
        "Planificación de tareas para la siguiente semana"
    ];

    console.log(`Registrando ${tareas.length} tareas para el usuario ${idUsuario} (${carnet})...`);

    for (const titulo of tareas) {
        try {
            const idTarea = await crearTarea({
                titulo,
                idCreador: idUsuario,
                creadorCarnet: carnet,
                idResponsable: idUsuario,
                estado: TaskStatus.Pendiente,
                prioridad: TaskPriority.Media,
                tipo: TaskType.Administrativa,
                fechaInicioPlanificada: today,
                fechaObjetivo: today,
                descripcion: "Tarea generada para test de agenda"
            });
            console.log(`✅ Tarea creada: [${idTarea}] ${titulo}`);
        } catch (error) {
            console.error(`❌ Error al crear tarea "${titulo}":`, error);
        }
    }

    process.exit(0);
}

run();
