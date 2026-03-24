import 'dart:convert';

import '../../domain/task_item.dart';
import '../local/task_local_data_source.dart';
import '../remote/task_remote_data_source.dart';

class TaskRepository {
  final TaskLocalDataSource _local;
  final TaskRemoteDataSource _remote;

  TaskRepository({
    TaskLocalDataSource? local,
    TaskRemoteDataSource? remote,
  })  : _local = local ?? TaskLocalDataSource(),
        _remote = remote ?? TaskRemoteDataSource();

  Future<List<TaskItem>> getTasks() => _local.getAll();

  Future<int> createTask({
    required String titulo,
    required String descripcion,
  }) {
    final task = TaskItem(
      titulo: titulo,
      descripcion: descripcion,
      estado: 'pendiente',
      fechaCreacion: DateTime.now(),
      fechaActualizacion: DateTime.now(),
      synced: false,
    );
    return _local.insert(task);
  }

  Future<void> completeTask(TaskItem task) {
    return _local.update(
      task.copyWith(
        estado: 'completada',
        fechaActualizacion: DateTime.now(),
        synced: false,
      ),
    );
  }

  Future<int> syncPendingEvents() async {
    final queue = await _local.getPendingSyncEvents();
    var synced = 0;

    for (final event in queue) {
      final queueId = event['id'] as int;
      final entidadId = event['entidad_id'] as int?;
      final operacion = event['operacion'] as String;
      final payload = jsonDecode(event['payload'] as String) as Map<String, dynamic>;
      final attempts = (event['sync_attempts'] as int? ?? 0) + 1;

      try {
        await _remote.pushTaskEvent(operacion: operacion, payload: payload);
        await _local.removeSyncEvent(queueId);
        if (entidadId != null) await _local.markAsSynced(entidadId);
        synced++;
      } catch (e) {
        await _local.markSyncEventFailed(
          queueId: queueId,
          attempts: attempts,
          error: e.toString(),
        );
      }
    }

    return synced;
  }
}
