import 'package:dio/dio.dart';
import '../../../core/error/exceptions.dart';
import '../../../core/network/api_client.dart';
import '../../agenda/domain/agenda_models.dart';

class AgendaRemoteDataSource {
  final Dio _dio;

  // IMPORTANTE: Usar ApiClient.dio por defecto para tener interceptors de Auth
  AgendaRemoteDataSource({Dio? dio}) : _dio = dio ?? ApiClient.dio;

  Future<AgendaResponse> getMiDia(String fecha) async {
    try {
      // Endpoint exacto de React: /mi-dia?fecha=YYYY-MM-DD
      final response =
          await _dio.get('mi-dia', queryParameters: {'fecha': fecha});

      // Asumimos estructura ApiResponse donde data está en 'data' o en raíz si no está envuelto
      final rawData = response.data;

      // Validación defensiva
      if (rawData == null) {
        throw Exception('Respuesta vacía del servidor');
      }

      // Desempaquetar envelope { success: true, data: {...} }
      Map<String, dynamic> data;
      if (rawData is Map<String, dynamic> &&
          rawData.containsKey('data') &&
          rawData['data'] is Map<String, dynamic>) {
        data = rawData['data'] as Map<String, dynamic>;
      } else if (rawData is Map<String, dynamic>) {
        data = rawData;
      } else {
        throw Exception('Formato de respuesta inesperado');
      }

      return AgendaResponse.fromJson(data);
    } catch (e) {
      if (e is DioException) {
        if (e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.receiveTimeout ||
            e.type == DioExceptionType.connectionError ||
            e.message?.contains('SocketException') == true) {
          throw const OfflineException('Sin conexión a internet');
        }
        throw ServerException('Error al obtener agenda: ${e.message}');
      }
      rethrow;
    }
  }

  Future<void> saveCheckin(Map<String, dynamic> checkinData) async {
    try {
      await _dio.post('mi-dia/checkin', data: checkinData);
    } catch (e) {
      throw Exception('Error al guardar check-in: $e');
    }
  }

  Future<void> completeTask(int taskId) async {
    try {
      await _dio.patch('tareas/$taskId', data: {'estado': 'Hecha'});
    } catch (e) {
      throw ServerException('Error al completar tarea: $e');
    }
  }

  Future<void> discardTask(int taskId) async {
    try {
      await _dio.patch('tareas/$taskId', data: {'estado': 'Descartada'});
    } catch (e) {
      throw ServerException('Error al descartar tarea: $e');
    }
  }
}
