import 'dart:developer';
import '../../../core/network/api_client.dart';

import 'dashboard_models.dart';

class DashboardRepository {
  Future<DashboardKpiResponse> getKPIs({int? mes, int? anio}) async {
    final now = DateTime.now();
    final m = mes ?? now.month;
    final y = anio ?? now.year;

    try {
      // 1. Intentar obtener estadísticas ricas (Planning Stats)
      log('🔌 [DashboardRepo] Intentando planning/stats para $m/$y...',
          name: 'DashboardRepo');
      final response =
          await ApiClient.dio.get('planning/stats', queryParameters: {
        'mes': m,
        'anio': y,
      });

      if (response.data != null) {
        final data = response.data;
        if (data is Map<String, dynamic> && data['success'] == true) {
          return DashboardKpiResponse.fromJson(data['data']);
        }
      }
    } catch (e) {
      log('⚠️ [DashboardRepo] Falló planning/stats, intentando backup...',
          name: 'DashboardRepo');
    }

    // 2. Backup: Formato simple de KPIs
    try {
      log('🔌 [DashboardRepo] Llamando a backup kpis/dashboard...',
          name: 'DashboardRepo');
      final response = await ApiClient.dio.get('kpis/dashboard');
      final data = response.data;

      if (data is Map<String, dynamic>) {
        if (data.containsKey('data') && data['data'] is Map<String, dynamic>) {
          return DashboardKpiResponse.fromJson(data['data']);
        }
        return DashboardKpiResponse.fromJson(data);
      }
      throw Exception('Formato de respuesta inválido: ${data.runtimeType}');
    } catch (e, stack) {
      log('❌ [DashboardRepo] Error final: $e',
          name: 'DashboardRepo', error: e, stackTrace: stack);
      throw Exception('Error cargando KPIs: $e');
    }
  }
}
