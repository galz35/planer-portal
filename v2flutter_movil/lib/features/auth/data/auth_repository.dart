import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/network/api_client.dart';
import '../domain/session_user.dart';

class AuthRepository {
  AuthRepository({Dio? dio, FlutterSecureStorage? storage})
      : _dio = dio ?? ApiClient.dio,
        _storage = storage ?? const FlutterSecureStorage();

  final Dio _dio;
  final FlutterSecureStorage _storage;

  static const _keyAccess = 'momentus_access_token';
  static const _keyRefresh = 'momentus_refresh_token';
  static const _keyUserId = 'momentus_user_id';
  static const _keyUserName = 'momentus_user_name';
  static const _keyUserMail = 'momentus_user_mail';
  static const _keyGerencia = 'momentus_user_gerencia';
  static const _keyDepto = 'momentus_user_depto';

  Future<SessionUser> login(
      {required String correo, required String password}) async {
    final response = await _dio.post('auth/login', data: {
      'correo': correo,
      'password': password,
    });

    final rawData = response.data as Map<String, dynamic>;

    // La API envuelve la respuesta en { success: true, data: {...} }
    final data = (rawData['data'] ?? rawData) as Map<String, dynamic>;

    // La API usa snake_case: access_token, refresh_token
    final accessToken = (data['access_token'] ??
        data['accessToken'] ??
        data['token'] ??
        '') as String;
    final refreshToken =
        (data['refresh_token'] ?? data['refreshToken'] ?? '') as String;
    final usuario = (data['user'] ?? data['usuario'] ?? <String, dynamic>{})
        as Map<String, dynamic>;

    final user = SessionUser(
      id: (usuario['idUsuario'] ?? usuario['id'] ?? 0) as int,
      nombre: (usuario['nombre'] ?? 'Usuario') as String,
      correo: (usuario['correo'] ?? correo) as String,
      gerencia: (usuario['gerencia'] ?? usuario['orgGerencia'] ?? '') as String,
      departamento: (usuario['departamento'] ??
          usuario['orgDepartamento'] ??
          usuario['area'] ??
          '') as String,
    );

    await _storage.write(key: _keyAccess, value: accessToken);
    await _storage.write(key: _keyRefresh, value: refreshToken);
    await _storage.write(key: _keyUserId, value: user.id.toString());
    await _storage.write(key: _keyUserName, value: user.nombre);
    await _storage.write(key: _keyUserMail, value: user.correo);
    await _storage.write(key: _keyGerencia, value: user.gerencia);
    await _storage.write(key: _keyDepto, value: user.departamento);

    ApiClient.dio.options.headers['Authorization'] = 'Bearer $accessToken';
    return user;
  }

  Future<SessionUser?> restoreSession() async {
    final accessToken = await _storage.read(key: _keyAccess);
    final userId = await _storage.read(key: _keyUserId);
    if (accessToken == null || userId == null) return null;

    final user = SessionUser(
      id: int.tryParse(userId) ?? 0,
      nombre: (await _storage.read(key: _keyUserName)) ?? 'Usuario',
      correo: (await _storage.read(key: _keyUserMail)) ?? '',
      gerencia: (await _storage.read(key: _keyGerencia)) ?? '',
      departamento: (await _storage.read(key: _keyDepto)) ?? '',
    );

    ApiClient.dio.options.headers['Authorization'] = 'Bearer $accessToken';
    return user;
  }

  Future<Map<String, dynamic>> getUserConfig() async {
    final response = await _dio.get('auth/config');
    final rawData = response.data as Map<String, dynamic>;
    return (rawData['data'] ?? rawData) as Map<String, dynamic>;
  }

  Future<void> updateUserConfig(Map<String, dynamic> config) async {
    await _dio.post('auth/config', data: config);
  }

  Future<void> logout() async {
    await _storage.delete(key: _keyAccess);
    await _storage.delete(key: _keyRefresh);
    await _storage.delete(key: _keyUserId);
    await _storage.delete(key: _keyUserName);
    await _storage.delete(key: _keyUserMail);
    await _storage.delete(key: _keyGerencia);
    await _storage.delete(key: _keyDepto);
    ApiClient.dio.options.headers.remove('Authorization');
  }
}
