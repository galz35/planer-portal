import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'campo_api.dart';
import 'campo_local_db.dart';
import '../domain/cliente_model.dart';

/// Servicio de sincronización de datos de campo.
/// Envía colas locales (GPS, check-ins, check-outs) al servidor
/// y descarga clientes actualizados.
class CampoSyncService {
  CampoSyncService._();

  static bool _syncing = false;
  static Timer? _retryTimer;

  /// Callback para notificar progreso de sync.
  static void Function(String mensaje, int pendientes)? onProgreso;

  /// Ejecuta sync completo en orden de prioridad.
  static Future<Map<String, int>> sincronizar() async {
    if (_syncing) return {'total': -1}; // ya en proceso
    _syncing = true;

    final resultados = <String, int>{
      'checkins': 0,
      'checkouts': 0,
      'tracking': 0,
      'errores': 0,
    };

    try {
      // 1. Sync check-ins
      final checkins = await CampoLocalDb.checkinsPendientes();
      for (final ci in checkins) {
        try {
          onProgreso?.call('Enviando check-in...', checkins.length);
          await CampoApi.checkin(
            clienteId: ci['cliente_id'] as int,
            lat: (ci['lat'] as num).toDouble(),
            lon: (ci['lon'] as num).toDouble(),
            accuracy: (ci['accuracy'] as num?)?.toDouble(),
            offlineId: ci['offline_id'] as String?,
            timestamp: ci['timestamp'] as String?,
          );
          await CampoLocalDb.marcarCheckinSync(ci['id'] as int);
          resultados['checkins'] = (resultados['checkins'] ?? 0) + 1;
        } catch (_) {
          resultados['errores'] = (resultados['errores'] ?? 0) + 1;
        }
      }

      // 2. Sync check-outs
      final checkouts = await CampoLocalDb.checkoutsPendientes();
      for (final co in checkouts) {
        try {
          onProgreso?.call('Enviando check-out...', checkouts.length);
          final visitaId = co['visita_id'] as int?;
          if (visitaId == null) continue;
          await CampoApi.checkout(
            visitaId: visitaId,
            lat: (co['lat'] as num).toDouble(),
            lon: (co['lon'] as num).toDouble(),
            accuracy: (co['accuracy'] as num?)?.toDouble(),
            observacion: co['observacion'] as String?,
            fotoPath: co['foto_path'] as String?,
            timestamp: co['timestamp'] as String?,
          );
          await CampoLocalDb.marcarCheckoutSync(co['id'] as int);
          resultados['checkouts'] = (resultados['checkouts'] ?? 0) + 1;
        } catch (_) {
          resultados['errores'] = (resultados['errores'] ?? 0) + 1;
        }
      }

      // 3. Sync tracking GPS (en batch de 50)
      while (true) {
        final puntos = await CampoLocalDb.obtenerPuntosPendientes(limite: 50);
        if (puntos.isEmpty) break;

        try {
          onProgreso?.call(
              'Enviando ${puntos.length} puntos GPS...', puntos.length);
          await CampoApi.enviarTrackingBatch(
            puntos.map((p) => p.toApiJson()).toList(),
          );
          await CampoLocalDb.marcarPuntosSincronizados(
            puntos.map((p) => p.id!).toList(),
          );
          resultados['tracking'] =
              (resultados['tracking'] ?? 0) + puntos.length;
        } catch (_) {
          resultados['errores'] = (resultados['errores'] ?? 0) + 1;
          break; // Dejar de intentar si falla
        }
      }

      // 4. Descargar clientes actualizados
      try {
        onProgreso?.call('Descargando clientes...', 0);
        final clientesJson = await CampoApi.obtenerClientes();
        final clientes = clientesJson
            .map((j) => ClienteModel.fromJson(j as Map<String, dynamic>))
            .toList();
        if (clientes.isNotEmpty) {
          await CampoLocalDb.reemplazarClientes(clientes);
        }
      } catch (_) {
        // No crítico — seguir con cache local
      }

      // 5. Limpiar datos viejos
      await CampoLocalDb.limpiarDatosAntiguos();
    } finally {
      _syncing = false;
      onProgreso?.call('Sincronización completa', 0);
    }

    return resultados;
  }

  static int _consecutiveFailures = 0;

  /// Inicia listener de conectividad para auto-sync.
  static void iniciarAutoSync() {
    Connectivity().onConnectivityChanged.listen((results) {
      final hasConnection = results.any((r) => r != ConnectivityResult.none);
      if (hasConnection) {
        // Sync con delay para no saturar
        _retryTimer?.cancel();
        _retryTimer = Timer(const Duration(seconds: 5), () {
          _attemptSyncWithBackoff();
        });
      }
    });
  }

  static Future<void> _attemptSyncWithBackoff() async {
    final resultados = await sincronizar();
    if (resultados['total'] == -1) return; // ya en proceso

    final errores = resultados['errores'] ?? 0;
    if (errores > 0) {
      _consecutiveFailures++;
      // Máximo 5 intentos de backoff
      if (_consecutiveFailures < 5) {
        final delaySeconds = 5 * (1 << _consecutiveFailures); // 10, 20, 40, 80
        _retryTimer?.cancel();
        _retryTimer =
            Timer(Duration(seconds: delaySeconds), _attemptSyncWithBackoff);
      }
    } else {
      _consecutiveFailures = 0;
    }
  }

  /// Detiene auto-sync.
  static void detenerAutoSync() {
    _retryTimer?.cancel();
    _retryTimer = null;
  }

  /// ¿Está sincronizando ahora?
  static bool get isSyncing => _syncing;
}
