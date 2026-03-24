import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';

class TasksRemoteDataSource {
  final Dio _dio;

  TasksRemoteDataSource({Dio? dio}) : _dio = dio ?? ApiClient.dio;

  /// Crear tarea con campos mínimos (compatibilidad)
  Future<void> createTask({
    required String title,
    DateTime? date,
    String? description,
    int? assignedToUserId,
  }) async {
    try {
      final data = {
        'titulo': title,
        if (date != null) 'fechaObjetivo': date.toIso8601String(),
        if (description != null) 'descripcion': description,
        if (assignedToUserId != null) 'idResponsable': assignedToUserId,
        'prioridad': 'Media',
        'esfuerzo': 'M',
      };

      await _dio.post('tasks', data: data);
    } catch (e) {
      if (e is DioException) {
        throw Exception('Error al crear tarea: ${e.message}');
      }
      rethrow;
    }
  }

  /// Crear tarea con todos los campos
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
      final data = {
        'titulo': title,
        'fechaObjetivo': date.toIso8601String(),
        'tipo': tipo,
        'prioridad': prioridad,
        'esfuerzo': esfuerzo,
        if (descripcion != null && descripcion.isNotEmpty)
          'descripcion': descripcion,
        if (assignedToUserId != null) 'idResponsable': assignedToUserId,
        if (projectId != null) 'idProyecto': projectId,
        'comportamiento': 'SIMPLE', // Valor por defecto
      };

      await _dio.post('tareas/rapida', data: data);
    } catch (e) {
      if (e is DioException) {
        throw Exception('Error al crear tarea: ${e.message}');
      }
      rethrow;
    }
  }
}
