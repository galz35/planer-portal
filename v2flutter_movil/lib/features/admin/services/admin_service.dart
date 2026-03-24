import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import 'package:intl/intl.dart';

class AdminService {
  final Dio _dio = ApiClient.dio;

  Future<List<dynamic>> getInactiveUsers(DateTime? date) async {
    try {
      final String dateStr =
          DateFormat('yyyy-MM-dd').format(date ?? DateTime.now());
      final response = await _dio.get(
        '/admin/usuarios-inactivos',
        queryParameters: {'fecha': dateStr},
      );
      // Backend returns directly array or inside data object
      if (response.data is List) {
        return response.data;
      } else if (response.data['data'] is List) {
        return response.data['data'];
      }
      return [];
    } catch (e) {
      throw Exception('Error fetching inactive users: $e');
    }
  }
}
