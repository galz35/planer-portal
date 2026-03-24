import 'dart:developer';

import '../../../core/network/cache_store.dart';
import '../domain/agenda_models.dart';
import 'agenda_remote_data_source.dart';

/// Repositorio con soporte offline:
/// 1) Intenta obtener datos del servidor.
/// 2) Si tiene éxito, guarda en SQLite (kv_cache).
/// 3) Si falla (sin internet), responde desde caché local.
class AgendaRepository {
  final AgendaRemoteDataSource _remote;

  AgendaRepository({AgendaRemoteDataSource? remote})
      : _remote = remote ?? AgendaRemoteDataSource();

  /// Carga la agenda del día con fallback a cache offline.
  Future<AgendaResponse> getMiDia(String fecha) async {
    final cacheKey = 'agenda_mi_dia_$fecha';

    try {
      // 1) Intentar desde servidor
      final response = await _remote.getMiDia(fecha);

      // 2) Guardar en cache local para uso offline
      await _saveToCache(cacheKey, response);

      return response;
    } catch (e, stack) {
      log(
        '⚠️ [AgendaRepository] Falló carga remota para $fecha. Usando cache.',
        name: 'AgendaRepository',
        error: e,
        stackTrace: stack,
      );

      // 3) Intentar desde cache local
      final cached = await _loadFromCache(cacheKey);
      if (cached != null) {
        return cached;
      }

      // 4) Si no hay cache, re-lanzar error original
      rethrow;
    }
  }

  Future<void> saveCheckin(Map<String, dynamic> data) async {
    await _remote.saveCheckin(data);
  }

  Future<void> completeTask(int taskId) async {
    await _remote.completeTask(taskId);
  }

  Future<void> discardTask(int taskId) async {
    await _remote.discardTask(taskId);
  }

  // ─── Cache helpers ─────────────────────────────────

  Future<void> _saveToCache(String key, AgendaResponse response) async {
    try {
      final map = _agendaResponseToMap(response);
      await CacheStore.instance.save(key, map);
    } catch (e) {
      log('⚠️ Error al guardar cache de agenda: $e', name: 'AgendaRepository');
    }
  }

  Future<AgendaResponse?> _loadFromCache(String key) async {
    try {
      final map = await CacheStore.instance.getMap(key);
      if (map == null || map.isEmpty) return null;
      return AgendaResponse.fromJson(map);
    } catch (e) {
      log('⚠️ Error al leer cache de agenda: $e', name: 'AgendaRepository');
      return null;
    }
  }

  /// Serializa AgendaResponse a Map para guardar en kv_cache
  Map<String, dynamic> _agendaResponseToMap(AgendaResponse response) {
    return {
      'checkinHoy': response.checkinHoy != null
          ? _checkinToMap(response.checkinHoy!)
          : null,
      'tareasSugeridas':
          response.tareasSugeridas.map((t) => t.toJson()).toList(),
      'backlog': response.backlog.map((t) => t.toJson()).toList(),
      'bloqueosActivos':
          response.bloqueosActivos.map((b) => _bloqueoToMap(b)).toList(),
      'bloqueosMeCulpan':
          response.bloqueosMeCulpan.map((b) => _bloqueoToMap(b)).toList(),
    };
  }

  Map<String, dynamic> _checkinToMap(Checkin checkin) {
    return {
      'idCheckin': checkin.idCheckin,
      'fecha': checkin.fecha,
      'entregableTexto': checkin.entregableTexto,
      'nota': checkin.nota,
      'estadoAnimo': checkin.estadoAnimo,
      'energia': checkin.energia,
      'tareas': checkin.tareas
          .map((ct) => {
                'tipo': ct.tipo,
                'idTarea': ct.idTarea,
                'tarea': ct.tarea?.toJson(),
              })
          .toList(),
    };
  }

  Map<String, dynamic> _bloqueoToMap(Bloqueo b) {
    return {
      'idBloqueo': b.idBloqueo,
      'idTarea': b.idTarea,
      'motivo': b.motivo,
      'destinoTexto': b.destinoTexto,
      'tarea': b.tarea?.toJson(),
    };
  }
}
