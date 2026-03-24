import '../../../core/network/api_client.dart';

class ProjectsRepository {
  Future<void> createProject({
    required String nombre,
    String? descripcion,
    String? tipo,
    String? color,
    String? icono,
    DateTime? fechaInicio,
    DateTime? fechaFin,
    int? clienteId,
  }) async {
    final data = {
      'nombre': nombre,
      'descripcion': descripcion,
      'tipo': tipo,
      'color': color,
      'icono': icono,
      'fechaInicio': fechaInicio?.toIso8601String(),
      'fechaFin': fechaFin?.toIso8601String(),
      'clienteId': clienteId,
    }..removeWhere((key, value) => value == null);
    await ApiClient.dio.post('proyectos', data: data);
  }

  Future<List<Map<String, dynamic>>> search(String query) async {
    try {
      final response =
          await ApiClient.dio.get('proyectos', queryParameters: {'q': query});
      // Asumiendo que devuelve una lista de proyectos o un api response con data
      final data = response.data;
      if (data is List) return List<Map<String, dynamic>>.from(data);
      if (data['data'] is List) {
        return List<Map<String, dynamic>>.from(data['data']);
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  Future<void> updateProject(int id, Map<String, dynamic> data) async {
    await ApiClient.dio.patch('proyectos/$id', data: data);
  }
}
