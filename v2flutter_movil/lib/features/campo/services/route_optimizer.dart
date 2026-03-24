import 'package:geolocator/geolocator.dart';
import '../domain/parada_ruta_model.dart';

/// Optimizador de ruta usando nearest-neighbor.
/// Reordena las paradas de la ruta para minimizar la distancia total.
class RouteOptimizer {
  RouteOptimizer._();

  /// Optimiza el orden de las paradas usando nearest-neighbor greedy.
  ///
  /// [paradas] — lista de paradas a reordenar.
  /// [miLat], [miLon] — ubicación actual del usuario (punto de inicio).
  ///
  /// Retorna la lista reordenada (con campo [orden] actualizado).
  static List<ParadaRutaModel> optimizar(
    List<ParadaRutaModel> paradas, {
    required double miLat,
    required double miLon,
  }) {
    if (paradas.length <= 1) return paradas;

    final pendientes = List<ParadaRutaModel>.from(paradas);
    final resultado = <ParadaRutaModel>[];
    double currentLat = miLat;
    double currentLon = miLon;

    while (pendientes.isNotEmpty) {
      // Encontrar la parada más cercana al punto actual
      int closestIdx = 0;
      double closestDist = double.infinity;

      for (int i = 0; i < pendientes.length; i++) {
        final p = pendientes[i];
        if (p.clienteLat == null || p.clienteLon == null) continue;

        final dist = Geolocator.distanceBetween(
          currentLat,
          currentLon,
          p.clienteLat!,
          p.clienteLon!,
        );

        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
        }
      }

      final next = pendientes.removeAt(closestIdx);
      resultado.add(next.copyWith(orden: resultado.length));

      // Moverse al punto de la parada seleccionada
      if (next.clienteLat != null && next.clienteLon != null) {
        currentLat = next.clienteLat!;
        currentLon = next.clienteLon!;
      }
    }

    return resultado;
  }

  /// Calcula la distancia total de una ruta ordenada (en km).
  static double distanciaTotalKm(
    List<ParadaRutaModel> paradas, {
    required double miLat,
    required double miLon,
  }) {
    double total = 0;
    double currentLat = miLat;
    double currentLon = miLon;

    for (final p in paradas) {
      if (p.clienteLat == null || p.clienteLon == null) continue;
      total += Geolocator.distanceBetween(
        currentLat,
        currentLon,
        p.clienteLat!,
        p.clienteLon!,
      );
      currentLat = p.clienteLat!;
      currentLon = p.clienteLon!;
    }

    return total / 1000.0; // metros → km
  }

  /// Calcula tiempo estimado de recorrido (asume 30km/h promedio en ciudad).
  static Duration tiempoEstimado(
    List<ParadaRutaModel> paradas, {
    required double miLat,
    required double miLon,
    double velocidadPromedioKmh = 30,
  }) {
    final km = distanciaTotalKm(paradas, miLat: miLat, miLon: miLon);
    final horas = km / velocidadPromedioKmh;
    final minutos = (horas * 60).round();
    return Duration(minutes: minutos);
  }
}
