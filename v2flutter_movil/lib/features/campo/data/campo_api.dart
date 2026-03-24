import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';

/// API client para el módulo de campo (visitas a clientes + tracking GPS).
class CampoApi {
  static final Dio _dio = ApiClient.dio;

  // ── CLIENTES ──

  /// Obtiene la lista de todos los clientes activos.
  static Future<List<dynamic>> obtenerClientes() async {
    final res = await _dio.get('visita-campo/clientes');
    final data = res.data;
    if (data is List) return data;
    if (data is Map && data['data'] is List) return data['data'] as List;
    return [];
  }

  /// Obtiene historial de visitas de un cliente.
  static Future<List<dynamic>> obtenerVisitasCliente(int clienteId) async {
    final res = await _dio.get('visita-campo/clientes/$clienteId/visitas');
    final data = res.data;
    if (data is List) return data;
    if (data is Map && data['data'] is List) return data['data'] as List;
    return [];
  }

  // ── AGENDA ──

  /// Obtiene la agenda del día (clientes asignados para visitar).
  static Future<List<dynamic>> obtenerAgenda({
    String? fecha,
    double? lat,
    double? lon,
  }) async {
    final params = <String, dynamic>{};
    if (fecha != null) params['fecha'] = fecha;
    if (lat != null) params['lat'] = lat;
    if (lon != null) params['lon'] = lon;
    final res = await _dio.get('visita-campo/agenda', queryParameters: params);
    final data = res.data;
    if (data is List) return data;
    if (data is Map && data['data'] is List) return data['data'] as List;
    return [];
  }

  // ── CHECK-IN / CHECK-OUT ──

  /// Registra check-in en un cliente.
  static Future<Map<String, dynamic>> checkin({
    required int clienteId,
    required double lat,
    required double lon,
    double? accuracy,
    String? offlineId,
    String? timestamp,
    int? agendaId,
  }) async {
    final res = await _dio.post('visita-campo/checkin', data: {
      'cliente_id': clienteId,
      'lat': lat,
      'lon': lon,
      'accuracy': accuracy,
      'offline_id': offlineId,
      'timestamp': timestamp,
      if (agendaId != null) 'agenda_id': agendaId,
    });
    return res.data is Map<String, dynamic>
        ? res.data as Map<String, dynamic>
        : {};
  }

  static Future<Map<String, dynamic>> checkout({
    required int visitaId,
    required double lat,
    required double lon,
    double? accuracy,
    String? observacion,
    String? fotoPath,
    String? timestamp,
  }) async {
    dynamic payload;
    if (fotoPath != null && fotoPath.isNotEmpty) {
      payload = FormData.fromMap({
        'visita_id': visitaId,
        'lat': lat,
        'lon': lon,
        if (accuracy != null) 'accuracy': accuracy,
        if (observacion != null) 'observacion': observacion,
        if (timestamp != null) 'timestamp': timestamp,
        'foto': await MultipartFile.fromFile(fotoPath,
            filename: 'checkout_photo.jpg'),
      });
    } else {
      payload = {
        'visita_id': visitaId,
        'lat': lat,
        'lon': lon,
        'accuracy': accuracy,
        'observacion': observacion,
        'timestamp': timestamp,
      };
    }

    final res = await _dio.post('visita-campo/checkout', data: payload);
    return res.data is Map<String, dynamic>
        ? res.data as Map<String, dynamic>
        : {};
  }

  // ── TRACKING GPS ──

  /// Envía batch de puntos GPS al servidor.
  static Future<Map<String, dynamic>> enviarTrackingBatch(
      List<Map<String, dynamic>> puntos) async {
    final res = await _dio.post('campo/recorrido/puntos-batch', data: {
      'puntos': puntos,
    });
    return res.data is Map<String, dynamic>
        ? res.data as Map<String, dynamic>
        : {};
  }

  // ── RUTAS RECORRIDOS (Nuevo Módulo) ──

  static Future<Map<String, dynamic>> iniciarRecorrido({
    double? lat,
    double? lon,
  }) async {
    final res = await _dio.post('campo/recorrido/iniciar', data: {
      'lat': lat,
      'lon': lon,
    });
    return res.data is Map<String, dynamic> ? res.data : {};
  }

  static Future<Map<String, dynamic>> finalizarRecorrido({
    double? lat,
    double? lon,
    String? notas,
  }) async {
    final res = await _dio.post('campo/recorrido/finalizar', data: {
      'lat': lat,
      'lon': lon,
      'notas': notas,
    });
    return res.data is Map<String, dynamic> ? res.data : {};
  }

  // ── RESUMEN / KPIs ──

  /// Obtiene resumen del día (visitas, km, tiempo).
  static Future<Map<String, dynamic>> obtenerResumen({String? fecha}) async {
    final params = <String, dynamic>{};
    if (fecha != null) params['fecha'] = fecha;
    final res = await _dio.get('visita-campo/resumen', queryParameters: params);
    return res.data is Map<String, dynamic>
        ? res.data as Map<String, dynamic>
        : {};
  }

  /// Calcula km recorridos del día.
  static Future<Map<String, dynamic>> calcularKm({String? fecha}) async {
    final params = <String, dynamic>{};
    if (fecha != null) params['fecha'] = fecha;
    final res =
        await _dio.get('visita-campo/stats/km', queryParameters: params);
    return res.data is Map<String, dynamic>
        ? res.data as Map<String, dynamic>
        : {};
  }
}
