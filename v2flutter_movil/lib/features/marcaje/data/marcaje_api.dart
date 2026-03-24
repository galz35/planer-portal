import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';

/// API client para el módulo de marcaje (entrada/salida).
///
/// IMPORTANTE: El backend envuelve toda respuesta REST en:
///   { success: true, data: { ... }, statusCode: 200, ... }
/// Este client desenvuelve automáticamente el campo 'data' para
/// que los controllers reciban la info directamente.
class MarcajeApi {
  static final Dio _dio = ApiClient.dio;

  /// Helper: desenvuelve la respuesta del TransformInterceptor.
  static Map<String, dynamic> _unwrap(dynamic responseData) {
    if (responseData is Map<String, dynamic>) {
      // Si el backend envolvió en {success, data, ...}, extraer 'data'
      if (responseData.containsKey('data') &&
          responseData.containsKey('success')) {
        final inner = responseData['data'];
        if (inner is Map<String, dynamic>) return inner;
      }
      return responseData;
    }
    return {};
  }

  /// Marcar entrada o salida.
  static Future<Map<String, dynamic>> marcar({
    required String tipo, // ENTRADA, SALIDA
    required double lat,
    required double lon,
    double? accuracy,
    String? deviceUuid,
    String? deviceModel,
    String? source, // WEB, APP
  }) async {
    final res = await _dio.post('marcaje/mark', data: {
      'tipo': tipo,
      'lat': lat,
      'lon': lon,
      'accuracy': accuracy,
      'device_uuid': deviceUuid,
      'device_model': deviceModel,
      'source': source ?? 'APP',
    });
    return _unwrap(res.data);
  }

  /// Obtener resumen del día (estado actual, marcajes de hoy).
  static Future<Map<String, dynamic>> obtenerResumen() async {
    final res = await _dio.get('marcaje/summary');
    return _unwrap(res.data);
  }

  /// Deshacer último checkout.
  static Future<Map<String, dynamic>> deshacerUltimo() async {
    final res = await _dio.post('marcaje/undo-last');
    return _unwrap(res.data);
  }

  /// Solicitar corrección de un marcaje.
  static Future<Map<String, dynamic>> solicitarCorreccion({
    required int asistenciaId,
    required String tipo,
    required String motivo,
  }) async {
    final res = await _dio.post('marcaje/correccion', data: {
      'asistencia_id': asistenciaId,
      'tipo': tipo,
      'motivo': motivo,
    });
    return _unwrap(res.data);
  }
}
