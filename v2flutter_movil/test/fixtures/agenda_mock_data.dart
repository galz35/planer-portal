import 'package:flutter_movil/features/agenda/domain/agenda_models.dart';

AgendaResponse getAgendaMockData() {
  return AgendaResponse(
    bloqueosActivos: [],
    bloqueosMeCulpan: [],
    tareasSugeridas: [
      Tarea(
        idTarea: 101,
        titulo: 'Revisión de Diseño Mobile',
        proyectoNombre: 'Momentus App 2.0',
        prioridad: 'Alta',
        estado: 'Pendiente',
        progreso: 0,
        orden: 1,
        descripcion: 'Validar nuevos componentes M3 y navegación.',
        fechaObjetivo: DateTime.now().toIso8601String(),
      ),
      Tarea(
        idTarea: 102,
        titulo: 'Sincronización Offline',
        proyectoNombre: 'Ingeniería',
        prioridad: 'Media',
        estado: 'EnCurso',
        progreso: 45,
        orden: 2,
        descripcion: 'Implementar worker de sincronización en segundo plano.',
      ),
    ],
    backlog: [
      Tarea(
        idTarea: 201,
        titulo: 'Actualizar Dependencias',
        proyectoNombre: 'Mantenimiento',
        prioridad: 'Baja',
        estado: 'Pendiente',
        progreso: 0,
        orden: 3,
      ),
      Tarea(
        idTarea: 202,
        titulo: 'Limpieza de Logs',
        proyectoNombre: 'Mantenimiento',
        prioridad: 'Baja',
        estado: 'Hecha',
        progreso: 100,
        orden: 4,
      ),
    ],
  );
}
