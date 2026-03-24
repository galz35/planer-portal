import 'dart:convert';

import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import 'local/task_local_data_source.dart';
import '../domain/task_item.dart';
import 'tasks_remote_data_source.dart';

class TasksRepository {
  final TasksRemoteDataSource _remote;
  final TaskLocalDataSource _local;

  TasksRepository({TasksRemoteDataSource? remote, TaskLocalDataSource? local})
      : _remote = remote ?? TasksRemoteDataSource(),
        _local = local ?? TaskLocalDataSource();

  /// Crear tarea con campos mínimos (compatibilidad)
  Future<void> createTask({
    required String title,
    DateTime? date,
    String? description,
    int? assignedToUserId,
  }) {
    return _remote.createTask(
      title: title,
      date: date,
      description: description,
      assignedToUserId: assignedToUserId,
    );
  }

  /// Crear tarea con todos los campos (nuevo método)
  Future<void> createTaskFull({
    required String title,
    required DateTime date,
    required String tipo,
    required String prioridad,
    required String esfuerzo,
    String? descripcion,
    int? assignedToUserId,
    int? projectId,
  }) async {
    try {
      await _remote.createTaskFull(
        title: title,
        date: date,
        tipo: tipo,
        prioridad: prioridad,
        esfuerzo: esfuerzo,
        descripcion: descripcion,
        assignedToUserId: assignedToUserId,
        projectId: projectId,
      );
    } catch (e) {
      if (_isNetworkError(e)) {
        await _saveLocalTask(
          title: title,
          date: date,
          tipo: tipo,
          prioridad: prioridad,
          esfuerzo: esfuerzo,
          descripcion: descripcion,
          assignedToUserId: assignedToUserId,
          projectId: projectId,
        );
        return;
      }
      rethrow;
    }
  }

  Future<void> _saveLocalTask({
    required String title,
    required DateTime date,
    required String tipo,
    required String prioridad,
    required String esfuerzo,
    String? descripcion,
    int? assignedToUserId,
    int? projectId,
  }) async {
    final task = TaskItem(
      titulo: title,
      descripcion: descripcion ?? '',
      estado: 'Pendiente',
      fechaCreacion: DateTime.now(),
      synced: false,
      prioridad: prioridad,
      tipo: tipo,
      fechaObjetivo: date,
      responsableId: assignedToUserId,
    );

    final payload = {
      'titulo': title,
      'fechaObjetivo': date.toIso8601String(),
      'tipo': tipo,
      'prioridad': prioridad,
      'esfuerzo': esfuerzo,
      if (descripcion != null) 'descripcion': descripcion,
      if (assignedToUserId != null) 'idResponsable': assignedToUserId,
      if (projectId != null) 'idProyecto': projectId,
      'comportamiento': 'SIMPLE',
    };

    await _local.insert(task, additionalPayload: payload);
  }

  // ── MÉTODOS DE LECTURA Y ACTUALIZACIÓN (Migrados de TaskRepository) ──

  Future<List<TaskItem>> getTasks() => _local.getAll();

  Future<void> completeTask(TaskItem task) async {
    // Actualizar localmente inmediatamente (ya encola sync via _enqueueSync)
    final updatedTask = task.copyWith(
      estado: 'completada',
      fechaActualizacion: DateTime.now(),
      synced: false,
    );
    await _local.update(updatedTask);

    // Intentar sincronizar con el servidor
    try {
      final id = task.id;
      if (id != null) {
        await ApiClient.dio.patch('tareas/$id', data: {
          'estado': 'completada',
          'progreso': 100,
        });
        await _local.markAsSynced(id);
      }
    } catch (e) {
      // Si falla por red, no importa — ya está en la cola de sync
      // _local.update ya encoló un evento 'update' en sync_queue
    }
  }

  Future<int> syncPendingEvents() async {
    final queue = await _local.getPendingSyncEvents();
    if (queue.isEmpty) return 0;

    int synced = 0;
    for (final event in queue) {
      final queueId = event['id'] as int;
      final operacion = event['operacion'] as String;
      final payload = event['payload'] as String?;
      final attempts = (event['sync_attempts'] as int?) ?? 0;

      try {
        final data = payload != null
            ? jsonDecode(payload) as Map<String, dynamic>
            : <String, dynamic>{};

        if (operacion == 'create') {
          await _remote.createTaskFull(
            title: data['titulo'] ?? '',
            date: DateTime.tryParse(data['fechaObjetivo'] ?? '') ??
                DateTime.now(),
            tipo: data['tipo'] ?? 'Operativa',
            prioridad: data['prioridad'] ?? 'Media',
            esfuerzo: data['esfuerzo'] ?? 'M',
            descripcion: data['descripcion'],
            assignedToUserId:
                data['idResponsable'] is int ? data['idResponsable'] : null,
            projectId: data['idProyecto'] is int ? data['idProyecto'] : null,
          );
        } else if (operacion == 'update') {
          // Determinar el ID de la tarea del payload
          final taskId = data['id'] ?? event['entidad_id'];
          if (taskId != null) {
            // Extraer solo los campos editables para el PATCH
            final patchData = <String, dynamic>{};
            for (final key in [
              'estado',
              'progreso',
              'prioridad',
              'titulo',
              'descripcion'
            ]) {
              if (data.containsKey(key) && data[key] != null) {
                patchData[key] = data[key];
              }
            }
            if (patchData.isNotEmpty) {
              await ApiClient.dio.patch('tareas/$taskId', data: patchData);
            }
          }
        }

        // Success: remove from queue and mark task as synced
        await _local.removeSyncEvent(queueId);
        final entidadId = event['entidad_id'] as int?;
        if (entidadId != null) {
          await _local.markAsSynced(entidadId);
        }
        synced++;
      } catch (e) {
        await _local.markSyncEventFailed(
          queueId: queueId,
          attempts: attempts + 1,
          error: e.toString(),
        );
      }
    }
    return synced;
  }

  bool _isNetworkError(Object e) {
    if (e is DioException) {
      return e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.connectionError ||
          e.error.toString().contains('SocketException');
    }
    return false;
  }
}
