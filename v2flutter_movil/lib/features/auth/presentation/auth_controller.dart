import 'package:flutter/foundation.dart';

import '../../../core/services/push_notification_service.dart';
import '../../../core/services/team_cache_service.dart';
import '../data/auth_repository.dart';
import '../domain/session_user.dart';

class AuthController extends ChangeNotifier {
  AuthController({AuthRepository? repository})
      : _repository = repository ?? AuthRepository();

  final AuthRepository _repository;

  SessionUser? user;
  bool loading = false;
  bool initialized = false;
  String? error;

  bool get isAuthenticated => user != null;

  Future<void> initialize() async {
    loading = true;
    notifyListeners();

    try {
      user = await _repository.restoreSession();
      // Si restauramos sesión, registrar token FCM
      if (user != null) {
        _registerFcmToken();
        // Pre-cargar equipo en cache SQLite
        TeamCacheService.instance.preload();
      }
    } catch (_) {
      user = null;
    } finally {
      loading = false;
      initialized = true;
      notifyListeners();
    }
  }

  Future<bool> login(String correo, String password) async {
    loading = true;
    error = null;
    notifyListeners();

    try {
      user = await _repository.login(correo: correo, password: password);
      // Registrar token FCM con el backend después del login exitoso
      _registerFcmToken();
      // Pre-cargar equipo en cache SQLite
      TeamCacheService.instance.preload();
      return true;
    } catch (e) {
      error = 'No se pudo iniciar sesión. Verifica tus credenciales.';
      return false;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _repository.logout();
    TeamCacheService.instance.clear();
    user = null;
    notifyListeners();
  }

  /// Registra el token FCM con el backend de forma asíncrona (fire-and-forget)
  void _registerFcmToken() {
    PushNotificationService.instance.registerTokenWithBackend().catchError((_) {
      // Silenciar errores de FCM para no afectar flujo de login
    });
  }
}
