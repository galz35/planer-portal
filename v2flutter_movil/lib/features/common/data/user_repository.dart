import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../../core/network/api_client.dart';
import '../domain/empleado.dart';

class UserRepository {
  final _storage = const FlutterSecureStorage();
  static const _recentsKey = 'user_search_recents';

  /// Search employees by query (API call, requires >= 2 chars)
  Future<List<Empleado>> search(String query) async {
    try {
      final response = await ApiClient.dio.get('acceso/empleados/buscar',
          queryParameters: {'q': query, 'limit': 20});
      final list = (response.data as List)
          .map((e) => e as Map<String, dynamic>)
          .toList();
      return list.map((e) => Empleado.fromJson(e)).toList();
    } catch (e) {
      debugPrint('❌ Error searching users: $e');
      return [];
    }
  }

  /// Get ALL active employees from the backend
  Future<List<Empleado>> getAllEmployees() async {
    try {
      final response = await ApiClient.dio.get('acceso/empleados');
      final list = (response.data as List)
          .map((e) => e as Map<String, dynamic>)
          .toList();
      return list.map((e) => Empleado.fromJson(e)).toList();
    } catch (e) {
      debugPrint('❌ Error getting all employees: $e');
      return [];
    }
  }

  /// Get employees filtered by department/gerencia
  Future<List<Empleado>> getEmployeesByDepartment(String department) async {
    try {
      final response =
          await ApiClient.dio.get('acceso/empleados/gerencia/$department');
      final list = (response.data as List)
          .map((e) => e as Map<String, dynamic>)
          .toList();
      return list.map((e) => Empleado.fromJson(e)).toList();
    } catch (e) {
      debugPrint('❌ Error getting management users: $e');
      return [];
    }
  }

  /// Get recently selected users (local storage)
  Future<List<Empleado>> getRecents() async {
    final str = await _storage.read(key: _recentsKey);
    if (str == null) return [];
    try {
      final List list = jsonDecode(str);
      return list.map((e) => Empleado.fromJson(e)).toList();
    } catch (_) {
      return [];
    }
  }

  /// Save a user as "recently used" (local storage)
  Future<void> saveRecent(Empleado empleado) async {
    final list = await getRecents();
    // Remove if already exists to put at top
    list.removeWhere((e) => e.idUsuario == empleado.idUsuario);
    list.insert(0, empleado);
    // Limit to 5
    if (list.length > 5) list.removeLast();

    final str = jsonEncode(list
        .map((e) => {
              'idUsuario': e.idUsuario,
              'nombreCompleto': e.nombreCompleto,
              'carnet': e.carnet,
              'cargo': e.cargo,
              'area': e.area,
            })
        .toList());

    await _storage.write(key: _recentsKey, value: str);
  }
}
