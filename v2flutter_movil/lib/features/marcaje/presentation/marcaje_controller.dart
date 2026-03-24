import 'package:flutter/foundation.dart';

import '../../campo/services/gps_service.dart';
import '../data/marcaje_api.dart';

/// Controller para el marcaje de asistencia (entrada/salida/extra/compensada).
///
/// Flujo completo:
///   1. init() → carga resumen del día desde el backend (con flags)
///   2. marcar(tipo) → obtiene GPS + registra en backend
///   3. actualizarCronometro → llamado cada 1 segundo desde UI
///
/// El backend NUNCA rechaza marcajes. Solo los registra con WARN
/// si hay problemas (fuera de zona, anti-spam, etc.)
class MarcajeController extends ChangeNotifier {
  // ── Estado Principal ──
  String _estado = 'SIN_MARCAR'; // SIN_MARCAR, ENTRADA, SALIDA
  String? _horaEntrada;
  String? _horaSalida;
  List<Map<String, dynamic>> _historial = [];
  String? _error;
  bool _cargando = false;
  Duration _tiempoTranscurrido = Duration.zero;

  // ── Flags del Backend (Igual que React) ──
  bool isClockedIn = false;
  bool isOvertimeActive = false;
  bool isCompensatedActive = false;
  bool staleShift = false;
  String? lastCheckIn;
  String? lastCheckOut;
  String? lastRecordTimestamp;
  String? lastRecordType;

  // ── Tab Activo ──
  String activeTab = 'normal'; // normal, extra, compensada

  // Getters
  String get estado => _estado;
  String? get horaEntrada => _horaEntrada;
  String? get horaSalida => _horaSalida;
  List<Map<String, dynamic>> get historial => _historial;
  String? get error => _error;
  bool get cargando => _cargando;
  Duration get tiempoTranscurrido => _tiempoTranscurrido;

  // ── Estado según Tab Activo ──
  bool get isActiveForTab {
    if (activeTab == 'normal') return isClockedIn;
    if (activeTab == 'extra') return isOvertimeActive;
    if (activeTab == 'compensada') return isCompensatedActive;
    return false;
  }

  String? get sinceForTab {
    if (activeTab == 'normal') return lastCheckIn;
    if (activeTab == 'extra') return lastRecordTimestamp;
    if (activeTab == 'compensada') return lastRecordTimestamp;
    return null;
  }

  String get enterTypeForTab {
    if (activeTab == 'extra') return 'INICIO_EXTRA';
    if (activeTab == 'compensada') return 'INICIO_COMPENSADA';
    return 'ENTRADA';
  }

  String get exitTypeForTab {
    if (activeTab == 'extra') return 'FIN_EXTRA';
    if (activeTab == 'compensada') return 'FIN_COMPENSADA';
    return 'SALIDA';
  }

  String get tiempoFormateado {
    final h = _tiempoTranscurrido.inHours;
    final m = _tiempoTranscurrido.inMinutes % 60;
    final s = _tiempoTranscurrido.inSeconds % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  void changeTab(String tab) {
    activeTab = tab;
    notifyListeners();
  }

  /// Inicializar — cargar resumen del día con flags completos.
  Future<void> init() async {
    _cargando = true;
    _error = null;
    notifyListeners();

    try {
      final data = await MarcajeApi.obtenerResumen();

      // ── Parsear Flags (Igual que React) ──
      final flags = data['flags'];
      if (flags is Map<String, dynamic>) {
        isClockedIn = flags['isClockedIn'] == true;
        isOvertimeActive = flags['isOvertimeActive'] == true;
        isCompensatedActive = flags['isCompensatedActive'] == true;
        staleShift = flags['staleShift'] == true;
        lastCheckIn = flags['lastCheckIn']?.toString();
        lastCheckOut = flags['lastCheckOut']?.toString();
        lastRecordTimestamp = flags['lastRecordTimestamp']?.toString();
        lastRecordType = flags['lastRecordType']?.toString();
      }

      // ── Compatibilidad: campos directos (legacy del mobile compat) ──
      _horaEntrada = data['hora_entrada']?.toString() ?? lastCheckIn;
      _horaSalida = data['hora_salida']?.toString() ?? lastCheckOut;

      // ── Determinar estado principal basado en flags ──
      if (isClockedIn) {
        _estado = 'ENTRADA';
        final entrada = DateTime.tryParse(_horaEntrada ?? '');
        if (entrada != null) {
          _tiempoTranscurrido = DateTime.now().difference(entrada);
        }
      } else if (_horaEntrada != null && _horaSalida != null) {
        _estado = 'SALIDA';
        final entrada = DateTime.tryParse(_horaEntrada!);
        final salida = DateTime.tryParse(_horaSalida!);
        if (entrada != null && salida != null) {
          _tiempoTranscurrido = salida.difference(entrada);
        }
      } else {
        _estado = 'SIN_MARCAR';
        _tiempoTranscurrido = Duration.zero;
      }

      // ── Historial del día ──
      final hist = data['historial'] ?? data['dailyHistory'];
      if (hist is List) {
        _historial = List<Map<String, dynamic>>.from(
          hist.whereType<Map<String, dynamic>>(),
        );
      }
    } catch (e) {
      debugPrint('[MarcajeController] Error cargando resumen: $e');
      _error = 'Error al cargar marcaje. Verifica tu conexión.';
    } finally {
      _cargando = false;
      notifyListeners();
    }
  }

  /// Marcar cualquier tipo (entrada/salida/extra/compensada).
  Future<bool> marcar(String tipoMarcaje) async {
    _cargando = true;
    _error = null;
    notifyListeners();

    try {
      // 1. GPS
      final permisos = await GpsService.solicitarPermisos();
      if (!permisos) {
        _error = 'Se necesitan permisos de ubicación para marcar';
        _cargando = false;
        notifyListeners();
        return false;
      }

      final pos = await GpsService.obtenerPosicionActual();
      if (pos == null) {
        _error =
            'No se pudo obtener la ubicación. Verifica que el GPS esté activo.';
        _cargando = false;
        notifyListeners();
        return false;
      }

      // 2. Registrar en backend
      final result = await MarcajeApi.marcar(
        tipo: tipoMarcaje,
        lat: pos.latitude,
        lon: pos.longitude,
        accuracy: pos.accuracy,
        source: 'APP',
      );

      // 3. Verificar respuesta
      final estado = result['estado']?.toString();
      if (estado == 'ACEPTADA') {
        final motivo = result['motivo'];
        if (motivo != null) {
          debugPrint('[MarcajeController] Marcaje con warnings: $motivo');
        }

        // Recargar estado completo desde backend
        await init();
        return true;
      } else {
        _error = result['mensaje']?.toString() ?? 'Error inesperado al marcar';
      }

      _cargando = false;
      notifyListeners();
      return estado == 'ACEPTADA';
    } catch (e) {
      debugPrint('[MarcajeController] Error al marcar: $e');
      _error = 'Error al marcar. Verifica tu conexión.';
      _cargando = false;
      notifyListeners();
      return false;
    }
  }

  /// Shortcuts para compatibility con código existente
  Future<bool> marcarEntrada() => marcar('ENTRADA');
  Future<bool> marcarSalida() => marcar('SALIDA');

  /// Marcar según tab activo
  Future<bool> marcarSegunTab() {
    final tipo = isActiveForTab ? exitTypeForTab : enterTypeForTab;
    return marcar(tipo);
  }

  /// Deshacer último checkout.
  Future<bool> deshacerUltimo() async {
    _cargando = true;
    _error = null;
    notifyListeners();

    try {
      final result = await MarcajeApi.deshacerUltimo();
      final ok = result['ok'] == true;
      if (ok) {
        await init();
      } else {
        _error = result['mensaje']?.toString() ?? 'No se pudo deshacer';
        _cargando = false;
        notifyListeners();
      }
      return ok;
    } catch (e) {
      _error = 'Error al deshacer: $e';
      _cargando = false;
      notifyListeners();
      return false;
    }
  }

  /// Solicitar corrección de asistencia.
  Future<bool> solicitarCorreccion(String motivo) async {
    _cargando = true;
    _error = null;
    notifyListeners();

    try {
      await MarcajeApi.solicitarCorreccion(
        asistenciaId: 0,
        tipo: 'CORRECCION_ASISTENCIA',
        motivo: motivo,
      );
      _cargando = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = 'Error al enviar solicitud: $e';
      _cargando = false;
      notifyListeners();
      return false;
    }
  }

  /// Actualiza el cronómetro (llamar desde Timer periódico en la UI).
  void actualizarCronometro() {
    if (isActiveForTab) {
      final since = sinceForTab;
      if (since != null) {
        final start = DateTime.tryParse(since);
        if (start != null) {
          _tiempoTranscurrido = DateTime.now().difference(start);
          notifyListeners();
        }
      }
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
