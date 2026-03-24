import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../config/app_config.dart';

/// Cliente HTTP central de la app móvil.
///
/// Responsabilidades:
/// 1) Config baseURL/timeouts/headers.
/// 2) Inyectar access token en cada request.
/// 3) Intentar refresh token en respuestas 401.
/// 4) Repetir la request original si refresh fue exitoso.
class ApiClient {
  ApiClient._();

  static const _storage = FlutterSecureStorage();
  static const _keyAccess = 'momentus_access_token';
  static const _keyRefresh = 'momentus_refresh_token';

  static final Dio dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      sendTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ),
  )..interceptors.add(
      InterceptorsWrapper(
        // ==========================================
        // REQUEST
        // ==========================================
        onRequest: (options, handler) async {
          final access = await _storage.read(key: _keyAccess);
          if (access != null && access.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $access';
          }
          handler.next(options);
        },

        // ==========================================
        // ERROR / REFRESH TOKEN FLOW
        // ==========================================
        onError: (error, handler) async {
          if (error.response?.statusCode != 401) {
            handler.next(error);
            return;
          }

          final request = error.requestOptions;

          // Evita loop en refresh endpoint
          if (request.path.contains('/auth/refresh')) {
            handler.next(error);
            return;
          }

          // Evita reintentar múltiples veces la misma request
          if (request.extra['retried'] == true) {
            handler.next(error);
            return;
          }

          final refresh = await _storage.read(key: _keyRefresh);
          if (refresh == null || refresh.isEmpty) {
            handler.next(error);
            return;
          }

          try {
            final refreshResponse =
                await dio.post('auth/refresh', data: {'refreshToken': refresh});
            final data = refreshResponse.data as Map<String, dynamic>;
            final payload = (data['data'] ?? data) as Map<String, dynamic>;
            final newAccess = (payload['access_token'] ??
                payload['accessToken'] ??
                payload['token'] ??
                '') as String;
            final newRefresh = (payload['refresh_token'] ??
                payload['refreshToken'] ??
                refresh) as String;

            if (newAccess.isEmpty) {
              handler.next(error);
              return;
            }

            await _storage.write(key: _keyAccess, value: newAccess);
            await _storage.write(key: _keyRefresh, value: newRefresh);

            request.extra['retried'] = true;
            request.headers['Authorization'] = 'Bearer $newAccess';

            final retryResponse = await dio.fetch(request);
            handler.resolve(retryResponse);
          } catch (_) {
            handler.next(error);
          }
        },
      ),
    );
}
