/// Punto GPS para tracking de recorrido.
class PuntoGpsModel {
  final int? id;
  final double lat;
  final double lon;
  final double? accuracy;
  final double? velocidad;
  final String timestamp;
  final String fuente; // GPS, NETWORK
  final int? bateria;
  final bool mock;
  final bool sincronizado;

  const PuntoGpsModel({
    this.id,
    required this.lat,
    required this.lon,
    this.accuracy,
    this.velocidad,
    required this.timestamp,
    this.fuente = 'GPS',
    this.bateria,
    this.mock = false,
    this.sincronizado = false,
  });

  Map<String, dynamic> toDbMap() => {
        'lat': lat,
        'lon': lon,
        'accuracy': accuracy,
        'velocidad': velocidad,
        'timestamp': timestamp,
        'fuente': fuente,
        'bateria': bateria,
        'mock': mock ? 1 : 0,
        'sincronizado': sincronizado ? 1 : 0,
      };

  factory PuntoGpsModel.fromDb(Map<String, dynamic> row) {
    return PuntoGpsModel(
      id: row['id'] as int?,
      lat: (row['lat'] as num).toDouble(),
      lon: (row['lon'] as num).toDouble(),
      accuracy: (row['accuracy'] as num?)?.toDouble(),
      velocidad: (row['velocidad'] as num?)?.toDouble(),
      timestamp: row['timestamp'] as String,
      fuente: (row['fuente'] ?? 'GPS') as String,
      bateria: row['bateria'] as int?,
      mock: (row['mock'] ?? 0) == 1,
      sincronizado: (row['sincronizado'] ?? 0) == 1,
    );
  }

  Map<String, dynamic> toApiJson() => {
        'lat': lat,
        'lon': lon,
        'accuracy': accuracy,
        'velocidad': velocidad,
        'timestamp': timestamp,
        'fuente': fuente,
        'bateria': bateria,
        'mock': mock,
      };
}
