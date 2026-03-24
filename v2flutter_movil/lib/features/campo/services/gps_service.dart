import 'dart:async';

import 'package:geolocator/geolocator.dart';
import '../data/campo_local_db.dart';
import '../domain/punto_gps_model.dart';
import '../domain/recorrido_state.dart';
import 'gps_validator.dart';

/// Servicio de tracking GPS en foreground.
/// Captura puntos con intervalos configurables mientras el recorrido está activo.
/// - Modo activo: 30 segundos (tracking de visita)
/// - Modo ruta: 5 minutos (grabación de ruta del día)
class GpsService {
  GpsService._();

  static Timer? _timer;
  static StreamSubscription<Position>? _positionStream;
  static Position? _lastPosition;
  static bool _tracking = false;

  /// Intervalo estándar de captura (segundos).
  static int _intervalSeconds = 30;

  /// Distancia mínima en metros para registrar un nuevo punto.
  /// Evita guardar puntos duplicados si el usuario no se mueve.
  static const double _minDistanceMetros = 10.0;

  /// Callback para notificar nuevo punto (para actualizar UI).
  static void Function(PuntoGpsModel punto)? onNuevoPunto;

  /// Callback para notificar cambio de estado.
  static void Function(RecorridoState estado)? onEstadoChanged;

  /// Solicita permisos de ubicación.
  static Future<bool> solicitarPermisos() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return false;
    }
    if (permission == LocationPermission.deniedForever) return false;
    return true;
  }

  /// Obtiene la posición actual una sola vez.
  static Future<Position?> obtenerPosicionActual() async {
    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
    } catch (_) {
      return null;
    }
  }

  /// Inicia el tracking GPS (foreground).
  /// [intervaloSegundos]: 30 para tracking activo, 300 para ruta pasiva.
  static Future<void> iniciarTracking({int intervaloSegundos = 30}) async {
    if (_tracking) return;

    final permisos = await solicitarPermisos();
    if (!permisos) return;

    _tracking = true;
    _intervalSeconds = intervaloSegundos;

    // Capturar posición según intervalo configurado
    _timer = Timer.periodic(Duration(seconds: _intervalSeconds), (_) async {
      await _capturarPunto();
    });

    // También capturar primer punto inmediatamente
    await _capturarPunto();
  }

  /// Detiene el tracking GPS.
  static void detenerTracking() {
    _tracking = false;
    _timer?.cancel();
    _timer = null;
    _positionStream?.cancel();
    _positionStream = null;
  }

  /// Captura un punto GPS y lo almacena localmente.
  static Future<void> _capturarPunto() async {
    if (!_tracking) return;

    try {
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );

      // Filtro de distancia: no guardar si no se ha movido lo suficiente
      if (_lastPosition != null) {
        final distFromLast = Geolocator.distanceBetween(
          _lastPosition!.latitude,
          _lastPosition!.longitude,
          position.latitude,
          position.longitude,
        );
        if (distFromLast < _minDistanceMetros) return;
      }

      final punto = PuntoGpsModel(
        lat: position.latitude,
        lon: position.longitude,
        accuracy: position.accuracy,
        velocidad: position.speed * 3.6, // m/s → km/h
        timestamp: DateTime.now().toIso8601String(),
        fuente: 'GPS',
        mock: position.isMocked,
      );

      // Validar punto (anti-spoofing)
      if (GpsValidator.isLowAccuracy(position)) return;
      if (_lastPosition != null) {
        if (GpsValidator.isImpossibleJump(_lastPosition!, position)) return;
        if (GpsValidator.isImpossibleSpeed(_lastPosition!, position)) return;
      }

      // Guardar en SQLite
      await CampoLocalDb.insertarPuntoGps(punto);

      // Actualizar km acumulado
      if (_lastPosition != null) {
        final distMetros = Geolocator.distanceBetween(
          _lastPosition!.latitude,
          _lastPosition!.longitude,
          position.latitude,
          position.longitude,
        );

        final recorrido = await CampoLocalDb.obtenerRecorrido();
        final nuevoKm = recorrido.kmAcumulado + (distMetros / 1000);
        final nuevoEstado = recorrido.copyWith(
          kmAcumulado: nuevoKm,
          ultimoLat: position.latitude,
          ultimoLon: position.longitude,
          ultimoTimestamp: DateTime.now().toIso8601String(),
        );
        await CampoLocalDb.actualizarRecorrido(nuevoEstado);
        onEstadoChanged?.call(nuevoEstado);
      }

      _lastPosition = position;
      onNuevoPunto?.call(punto);
    } catch (_) {
      // GPS no disponible momentáneamente — silenciar
    }
  }

  /// ¿Está el tracking activo?
  static bool get isTracking => _tracking;

  /// Última posición conocida.
  static Position? get lastPosition => _lastPosition;

  /// Verifica si una posición está dentro del radio de una geocerca.
  /// Retorna true si está FUERA del radio (excepción/alerta).
  static bool fueraDeGeocerca({
    required double userLat,
    required double userLon,
    required double targetLat,
    required double targetLon,
    double radioMetros = 100,
  }) {
    final dist = Geolocator.distanceBetween(
      userLat,
      userLon,
      targetLat,
      targetLon,
    );
    return dist > radioMetros;
  }

  /// Calcula distancia en metros entre 2 coordenadas (Haversine).
  static double haversineMetros(
      double lat1, double lon1, double lat2, double lon2) {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
  }
}
