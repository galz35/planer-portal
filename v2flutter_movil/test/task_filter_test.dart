import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_movil/features/tasks/presentation/task_controller.dart';
import 'package:flutter_movil/features/tasks/domain/task_item.dart';

void main() {
  group('TaskFilter tests', () {
    test('TaskController filters tasks correctly based on TaskFilter enum', () {
      // Usamos el constructor default o sin repo mock si no llama a getTasks() en init
      final controller = TaskController();

      final now = DateTime.now();
      controller.tasks = [
        TaskItem(
            id: 1,
            titulo: 'T1',
            descripcion: '',
            estado: 'Pendiente',
            synced: true,
            prioridad: 'Media',
            tipo: 'T',
            fechaObjetivo: now,
            fechaCreacion: now,
            responsableId: 1),
        TaskItem(
            id: 2,
            titulo: 'T2',
            descripcion: '',
            estado: 'completada',
            synced: true,
            prioridad: 'Media',
            tipo: 'T',
            fechaObjetivo: now,
            fechaCreacion: now,
            responsableId: 1),
        TaskItem(
            id: 3,
            titulo: 'T3',
            descripcion: '',
            estado: 'EnCurso',
            synced: false,
            prioridad: 'Media',
            tipo: 'T',
            fechaObjetivo: now,
            fechaCreacion: now,
            responsableId: 1),
      ];

      controller.setFilter(TaskFilter.all);
      expect(controller.visibleTasks.length, 3);

      controller.setFilter(TaskFilter.pending);
      expect(controller.visibleTasks.length, 2);
      expect(controller.visibleTasks.every((t) => t.estado != 'completada'),
          isTrue);

      controller.setFilter(TaskFilter.completed);
      expect(controller.visibleTasks.length, 1);
      expect(controller.visibleTasks.first.estado, 'completada');

      controller.setFilter(TaskFilter.unsynced);
      expect(controller.visibleTasks.length, 1);
      expect(controller.visibleTasks.first.synced, false);

      // Probar text query adicional
      controller.setFilter(TaskFilter.all);
      controller.setQuery('T2');
      expect(controller.visibleTasks.length, 1);
      expect(controller.visibleTasks.first.titulo, 'T2');
    });
  });
}
