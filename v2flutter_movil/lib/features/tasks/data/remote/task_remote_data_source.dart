import 'package:dio/dio.dart';

import '../../../../core/config/app_config.dart';

class TaskRemoteDataSource {
  final Dio _dio;

  TaskRemoteDataSource({Dio? dio})
      : _dio = dio ?? Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl));

  Future<void> pushTaskEvent({
    required String operacion,
    required Map<String, dynamic> payload,
  }) async {
    // Endpoint sugerido para sincronización eventual desde cola local.
    await _dio.post('mobile/sync/tasks', data: {
      'operation': operacion,
      'payload': payload,
    });
  }
}
