import 'package:geolocator/geolocator.dart';

/// Validador anti-fraude GPS.
/// Detecta mock locations, saltos imposibles, velocidades irreales y baja accuracy.
class GpsValidator {
  GpsValidator._();

  /// Umbral máximo de accuracy aceptable en metros.
  static const double maxAccuracy = 50.0;

  /// Velocidad máxima aceptable en km/h.
  static const double maxVelocidadKmh = 130.0;

  /// Distancia máxima en metros para un salto en menos de 30 segundos.
  static const double maxSaltoMetros = 1000.0;

  /// Tiempo mínimo entre puntos para considerar un salto como imposible.
  static const int minSegundosSalto = 30;

  /// Detecta si la ubicación es mock (GPS falso).
  static bool isMockLocation(Position pos) => pos.isMocked;

  /// Detecta si la accuracy es demasiado baja (>50m).
  static bool isLowAccuracy(Position pos) => pos.accuracy > maxAccuracy;

  /// Detecta si hubo un salto imposible (>1km en <30s).
  static bool isImpossibleJump(Position prev, Position current) {
    final distancia = Geolocator.distanceBetween(
      prev.latitude,
      prev.longitude,
      current.latitude,
      current.longitude,
    );

    final diffMs = current.timestamp.difference(prev.timestamp).inMilliseconds;
    final diffSeg = diffMs / 1000.0;

    if (diffSeg < minSegundosSalto && distancia > maxSaltoMetros) {
      return true;
    }
    return false;
  }

  /// Detecta si la velocidad estimada es imposible (>130 km/h).
  static bool isImpossibleSpeed(Position prev, Position current) {
    final distancia = Geolocator.distanceBetween(
      prev.latitude,
      prev.longitude,
      current.latitude,
      current.longitude,
    );

    final diffMs = current.timestamp.difference(prev.timestamp).inMilliseconds;
    if (diffMs <= 0) return false;

    final diffHoras = diffMs / 3600000.0;
    final velocidadKmh = (distancia / 1000.0) / diffHoras;

    return velocidadKmh > maxVelocidadKmh;
  }

  /// Evalúa si un punto es válido (pasa todas las validaciones).
  static bool isValid(Position pos, {Position? previous}) {
    if (isLowAccuracy(pos)) return false;
    if (previous != null) {
      if (isImpossibleJump(previous, pos)) return false;
      if (isImpossibleSpeed(previous, pos)) return false;
    }
    return true;
  }

  /// Calcula distancia entre un punto GPS y un cliente para validar geocerca.
  static double distanciaACliente(
      double miLat, double miLon, double clienteLat, double clienteLon) {
    return Geolocator.distanceBetween(miLat, miLon, clienteLat, clienteLon);
  }

  /// Verifica si estamos dentro del geocerca del cliente.
  static bool dentroGeocerca(
      double miLat, double miLon, double clienteLat, double clienteLon,
      {int radioMetros = 100}) {
    final distancia = distanciaACliente(miLat, miLon, clienteLat, clienteLon);
    return distancia <= radioMetros;
  }
}
