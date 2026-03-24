import 'package:flutter/foundation.dart';
import '../network/api_client.dart';
import '../network/api_utils.dart';
import '../network/cache_store.dart';

/// Servicio singleton que pre-carga y cachea la lista de miembros del equipo.
/// Se invoca al hacer login/restore y queda disponible instantáneamente
/// para cualquier pantalla que necesite asignar tareas (TaskDetail, QuickCreate, etc.)
class TeamCacheService {
  TeamCacheService._();
  static final TeamCacheService instance = TeamCacheService._();

  static const _cacheKey = 'team_members';

  List<Map<String, dynamic>> _members = [];
  bool _loaded = false;

  /// Lista de miembros ya cargados (vacía si no se ha cargado aún)
  List<Map<String, dynamic>> get members => _members;
  bool get isLoaded => _loaded;

  /// Pre-carga el equipo desde API y lo guarda en SQLite.
  /// Se llama una vez al login/restore. Fire-and-forget.
  Future<void> preload() async {
    try {
      final response = await ApiClient.dio.get('planning/team');
      final list = unwrapApiList(response.data);
      _members = list.cast<Map<String, dynamic>>();
      _loaded = true;

      // Persistir en SQLite para offline
      await CacheStore.instance.save(_cacheKey, _members);
      debugPrint(
          '✅ TeamCache: ${_members.length} miembros cargados y cacheados');
    } catch (e) {
      debugPrint(
          '⚠️ TeamCache: Error cargando equipo desde API, intentando cache local: $e');
      // Fallback a cache local
      await _loadFromCache();
    }
  }

  /// Carga desde cache local (SQLite) — usado como fallback offline
  Future<void> _loadFromCache() async {
    try {
      final cached = await CacheStore.instance.getList(_cacheKey);
      _members = cached.cast<Map<String, dynamic>>();
      _loaded = _members.isNotEmpty;
      if (_loaded) {
        debugPrint(
            '📦 TeamCache: ${_members.length} miembros restaurados desde cache');
      }
    } catch (e) {
      debugPrint('❌ TeamCache: Error leyendo cache local: $e');
    }
  }

  /// Fuerza una recarga desde la API
  Future<void> refresh() async => preload();

  /// Limpia el cache (para logout)
  void clear() {
    _members = [];
    _loaded = false;
  }
}
