import 'dart:async';
import 'dart:convert';
import 'dart:developer';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../features/tasks/data/local/task_local_data_source.dart';
import '../../features/tasks/domain/task_item.dart';
import '../../features/campo/data/campo_sync_service.dart';
import '../config/app_config.dart';

/// Worker que procesa la cola de sincronización en segundo plano
/// cuando hay conexión a internet disponible.
class SyncWorker {
  SyncWorker._();
  static final SyncWorker instance = SyncWorker._();

  final _localSource = TaskLocalDataSource();
  final _storage = const FlutterSecureStorage();
  final _connectivity = Connectivity();

  StreamSubscription? _subscription;
  bool _isSyncing = false;

  /// Inicia el worker de sincronización
  void initialize() {
    log('🔄 SyncWorker: Inicializando...', name: 'Sync');

    try {
      // 1. Intentar sincronizar al inicio si hay red
      // Usamos un Future.microtask para no bloquear el hilo principal durante el arranque
      Future.microtask(() => _checkAndSync().catchError((e) {
            log('⚠️ Error inicial en SyncWorker check: $e', name: 'Sync');
          }));

      // 2. Escuchar cambios de red
      _subscription = _connectivity.onConnectivityChanged.listen((result) {
        try {
          if (result.contains(ConnectivityResult.mobile) ||
              result.contains(ConnectivityResult.wifi)) {
            log('🌐 SyncWorker: Conexión detectada, iniciando sync...',
                name: 'Sync');
            _checkAndSync();
          }
        } catch (e) {
          log('⚠️ Error procesando cambio de red: $e', name: 'Sync');
        }
      });
    } catch (e) {
      log('❌ Error FATAL inicializando SyncWorker: $e', name: 'Sync');
      // No re-lanzamos para no tumbar la app
    }
  }

  void dispose() {
    _subscription?.cancel();
  }

  /// Stream para notificar cuando hay datos nuevos disponibles
  final _onSyncCompleteController = StreamController<void>.broadcast();
  Stream<void> get onSyncComplete => _onSyncCompleteController.stream;

  /// Procesa la cola de sincronización y luego refresca datos del servidor
  Future<void> _checkAndSync() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      // === FASE 1: PUSH (Subir cambios locales) ===
      final pendingEvents = await _localSource.getPendingSyncEvents();

      final token = await _storage.read(key: 'momentus_access_token');
      if (token == null) {
        log('⚠️ SyncWorker: No hay token, abortando sync', name: 'Sync');
        _isSyncing = false;
        return;
      }

      final dio = Dio();
      dio.options.baseUrl = AppConfig.apiBaseUrl;
      dio.options.headers['Authorization'] = 'Bearer $token';

      if (pendingEvents.isNotEmpty) {
        log('🔄 SyncWorker: Procesando ${pendingEvents.length} eventos pendientes...',
            name: 'Sync');

        for (final event in pendingEvents) {
          final id = event['id'] as int;
          final attempts = (event['sync_attempts'] as int? ?? 0) + 1;

          try {
            await _processEvent(dio, event);
            await _localSource.removeSyncEvent(id);
            log('✅ Evento $id sincronizado exitosamente', name: 'Sync');
          } catch (e) {
            log('❌ Error sincronizando evento $id: $e', name: 'Sync');
            await _localSource.markSyncEventFailed(
              queueId: id,
              attempts: attempts,
              error: e.toString(),
            );
          }
        }
      }

      // === FASE 1.5: PUSH CAMPO (Check-ins, Checkouts, GPS) ===
      await _syncCampoData(dio);

      // === FASE 2: PULL (Descargar datos nuevos del servidor) ===
      log('⬇️ SyncWorker: Descargando datos frescos del servidor...',
          name: 'Sync');
      await _pullFreshData(dio);

      // Notificar a los listeners que hay datos nuevos
      _onSyncCompleteController.add(null);
      log('✅ SyncWorker: Sincronización completa (Push + Pull)', name: 'Sync');
    } catch (e) {
      log('❌ Error general en SyncWorker: $e', name: 'Sync');
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _pullFreshData(Dio dio) async {
    try {
      final response = await dio.get('tareas/mias');

      if (response.statusCode == 200) {
        final tasksRaw = response.data as List<dynamic>? ?? [];
        log('⬇️ Recibidas ${tasksRaw.length} tareas del servidor',
            name: 'Sync');

        final List<TaskItem> tasksToSync = [];

        for (final raw in tasksRaw) {
          try {
            final item = raw as Map<String, dynamic>;
            tasksToSync.add(TaskItem(
              id: item['id'] ?? item['idTarea'],
              titulo: item['titulo'] ?? item['nombre'] ?? 'Sin Título',
              descripcion: item['descripcion'] ?? '',
              estado: (item['estado'] ?? 'Pendiente').toString().trim(),
              fechaCreacion: item['fechaCreacion'] != null
                  ? DateTime.tryParse(item['fechaCreacion'].toString()) ??
                      DateTime.now()
                  : DateTime.now(),
              fechaObjetivo: item['fechaObjetivo'] != null
                  ? DateTime.tryParse(item['fechaObjetivo'].toString())
                  : null,
              synced: true,
              prioridad: item['prioridad'] ?? 'Media',
              tipo: item['tipo'] ?? 'Administrativa',
              proyectoNombre:
                  item['proyectoNombre'] ?? item['proyecto']?['nombre'],
            ));
          } catch (e) {
            log('⚠️ Error mapeando tarea remota ${raw['id']}: $e',
                name: 'Sync');
          }
        }

        if (tasksToSync.isNotEmpty) {
          await _localSource.bulkInsertSynced(tasksToSync);
          log('✅ Sync masivo completado: ${tasksToSync.length} tareas actualizadas.',
              name: 'Sync');
        }
      }
    } catch (e) {
      log('⚠️ Error en Pull (Modo Offline o Timeout): $e (no crítico)',
          name: 'Sync');
    }
  }

  Future<void> _processEvent(Dio dio, Map<String, dynamic> event) async {
    final entidad = event['entidad'] as String;
    final operacion = event['operacion'] as String;
    final payload =
        jsonDecode(event['payload'] as String) as Map<String, dynamic>;

    // Mapeo de operaciones a endpoints
    if (entidad == 'task') {
      if (operacion == 'create') {
        // Filtrar payload para evitar errores 400 por campos no permitidos (strict validation)
        final allowedKeys = [
          'titulo',
          'prioridad',
          'esfuerzo',
          'tipo',
          'descripcion',
          'idProyecto',
          'idResponsable',
          'fechaObjetivo',
          'comportamiento',
          'fechaInicioPlanificada',
          'idTareaPadre',
          'linkEvidencia',
          'idUsuario'
        ];
        final cleanPayload = Map<String, dynamic>.from(payload)
          ..removeWhere((key, value) => !allowedKeys.contains(key));

        await dio.post('tasks', data: cleanPayload);
      } else if (operacion == 'update') {
        final id = event['entidad_id'];

        // Filtrar payload para update
        final allowedKeys = [
          'titulo',
          'estado',
          'prioridad',
          'progreso',
          'esfuerzo',
          'tipo',
          'fechaInicioPlanificada',
          'fechaObjetivo',
          'descripcion',
          'motivo',
          'motivoBloqueo',
          'alcance',
          'comentario',
          'linkEvidencia',
          'idTareaPadre',
          'idResponsable'
        ];
        final cleanPayload = Map<String, dynamic>.from(payload)
          ..removeWhere((key, value) => !allowedKeys.contains(key));

        await dio.put('tasks/$id', data: cleanPayload);
      }
    }
    // Agregar más entidades aquí si es necesario
  }

  /// Sincroniza datos del módulo Campo: check-ins, check-outs y GPS tracking
  Future<void> _syncCampoData(Dio dio) async {
    try {
      log('📍 SyncWorker: Iniciando sincronización de Campo...', name: 'Sync');
      final resultados = await CampoSyncService.sincronizar();
      log('✅ SyncWorker: Sincronización de Campo completada: $resultados',
          name: 'Sync');
    } catch (e) {
      log('❌ Error general sync Campo: $e', name: 'Sync');
    }
  }
}
