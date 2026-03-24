import 'package:flutter/material.dart';

import 'package:intl/date_symbol_data_local.dart';

import 'app.dart';
import 'core/services/push_notification_service.dart';
import 'core/sync/sync_worker.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Inicializar datos de fecha para Español (CRÍTICO para Agenda)
  await initializeDateFormatting('es_ES', null);

  // 2. Inicializar Firebase y Push Notifications
  // Usamos un timeout para evitar que la app se quede en blanco si no hay red
  try {
    await PushNotificationService.instance.initialize().timeout(
      const Duration(seconds: 3),
      onTimeout: () {
        debugPrint('⚠️ FCM initialization timed out (continuing app start)');
      },
    );
  } catch (e) {
    debugPrint('⚠️ Firebase no configurado o error: $e');
  }

  // 3. Inicializar Worker de Sincronización
  SyncWorker.instance.initialize();

  runApp(const MomentusMobileApp());
}
