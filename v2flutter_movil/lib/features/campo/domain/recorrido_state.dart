/// Estado inmutable del recorrido activo.
class RecorridoState {
  final bool activo;
  final String? inicio;
  final double kmAcumulado;
  final double? ultimoLat;
  final double? ultimoLon;
  final String? ultimoTimestamp;
  final int totalVisitas;
  final int totalPuntos;

  const RecorridoState({
    this.activo = false,
    this.inicio,
    this.kmAcumulado = 0,
    this.ultimoLat,
    this.ultimoLon,
    this.ultimoTimestamp,
    this.totalVisitas = 0,
    this.totalPuntos = 0,
  });

  /// Duración desde inicio hasta ahora.
  Duration get duracion {
    if (inicio == null) return Duration.zero;
    final start = DateTime.tryParse(inicio!);
    if (start == null) return Duration.zero;
    return DateTime.now().difference(start);
  }

  /// Formato legible de duración: "2h 45m"
  String get duracionFormateada {
    final d = duracion;
    if (d.inMinutes < 1) return '0m';
    if (d.inHours < 1) return '${d.inMinutes}m';
    return '${d.inHours}h ${d.inMinutes % 60}m';
  }

  /// Formato de km: "12.5"
  String get kmFormateado => kmAcumulado.toStringAsFixed(1);

  RecorridoState copyWith({
    bool? activo,
    String? inicio,
    double? kmAcumulado,
    double? ultimoLat,
    double? ultimoLon,
    String? ultimoTimestamp,
    int? totalVisitas,
    int? totalPuntos,
  }) {
    return RecorridoState(
      activo: activo ?? this.activo,
      inicio: inicio ?? this.inicio,
      kmAcumulado: kmAcumulado ?? this.kmAcumulado,
      ultimoLat: ultimoLat ?? this.ultimoLat,
      ultimoLon: ultimoLon ?? this.ultimoLon,
      ultimoTimestamp: ultimoTimestamp ?? this.ultimoTimestamp,
      totalVisitas: totalVisitas ?? this.totalVisitas,
      totalPuntos: totalPuntos ?? this.totalPuntos,
    );
  }

  Map<String, dynamic> toDbMap() => {
        'id': 1,
        'inicio': inicio,
        'km_acumulado': kmAcumulado,
        'ultimo_lat': ultimoLat,
        'ultimo_lon': ultimoLon,
        'ultimo_timestamp': ultimoTimestamp,
        'activo': activo ? 1 : 0,
      };

  factory RecorridoState.fromDb(Map<String, dynamic> row) {
    return RecorridoState(
      activo: (row['activo'] ?? 0) == 1,
      inicio: row['inicio'] as String?,
      kmAcumulado: (row['km_acumulado'] as num?)?.toDouble() ?? 0,
      ultimoLat: (row['ultimo_lat'] as num?)?.toDouble(),
      ultimoLon: (row['ultimo_lon'] as num?)?.toDouble(),
      ultimoTimestamp: row['ultimo_timestamp'] as String?,
    );
  }

  static const initial = RecorridoState();
}
