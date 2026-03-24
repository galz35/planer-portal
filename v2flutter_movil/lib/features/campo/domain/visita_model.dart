/// Modelo de visita (check-in / check-out).
class VisitaModel {
  final int? id;
  final String offlineId;
  final int? clienteId;
  final String? clienteNombre;
  final String estado; // EN_CURSO, FINALIZADA, CANCELADA
  // Check-in
  final double? checkinLat;
  final double? checkinLon;
  final double? checkinAccuracy;
  final double? distanciaCliente;
  final bool? dentroGeocerca;
  final String? checkinTimestamp;
  // Check-out
  final double? checkoutLat;
  final double? checkoutLon;
  final double? checkoutAccuracy;
  final String? checkoutTimestamp;
  final String? observacion;
  final String? fotoPath;
  final int? duracionMin;
  // Sync
  final bool sincronizado;

  const VisitaModel({
    this.id,
    required this.offlineId,
    this.clienteId,
    this.clienteNombre,
    this.estado = 'EN_CURSO',
    this.checkinLat,
    this.checkinLon,
    this.checkinAccuracy,
    this.distanciaCliente,
    this.dentroGeocerca,
    this.checkinTimestamp,
    this.checkoutLat,
    this.checkoutLon,
    this.checkoutAccuracy,
    this.checkoutTimestamp,
    this.observacion,
    this.fotoPath,
    this.duracionMin,
    this.sincronizado = false,
  });

  bool get enCurso => estado == 'EN_CURSO';
  bool get finalizada => estado == 'FINALIZADA';

  VisitaModel copyWith({
    int? id,
    String? estado,
    double? checkoutLat,
    double? checkoutLon,
    double? checkoutAccuracy,
    String? checkoutTimestamp,
    String? observacion,
    String? fotoPath,
    int? duracionMin,
    bool? sincronizado,
  }) {
    return VisitaModel(
      id: id ?? this.id,
      offlineId: offlineId,
      clienteId: clienteId,
      clienteNombre: clienteNombre,
      estado: estado ?? this.estado,
      checkinLat: checkinLat,
      checkinLon: checkinLon,
      checkinAccuracy: checkinAccuracy,
      distanciaCliente: distanciaCliente,
      dentroGeocerca: dentroGeocerca,
      checkinTimestamp: checkinTimestamp,
      checkoutLat: checkoutLat ?? this.checkoutLat,
      checkoutLon: checkoutLon ?? this.checkoutLon,
      checkoutAccuracy: checkoutAccuracy ?? this.checkoutAccuracy,
      checkoutTimestamp: checkoutTimestamp ?? this.checkoutTimestamp,
      observacion: observacion ?? this.observacion,
      fotoPath: fotoPath ?? this.fotoPath,
      duracionMin: duracionMin ?? this.duracionMin,
      sincronizado: sincronizado ?? this.sincronizado,
    );
  }

  factory VisitaModel.fromJson(Map<String, dynamic> json) {
    return VisitaModel(
      id: json['id'] as int?,
      offlineId: (json['offline_id'] ?? json['offlineId'] ?? '') as String,
      clienteId: json['cliente_id'] as int?,
      clienteNombre: json['cliente_nombre'] as String?,
      estado: (json['estado'] ?? 'EN_CURSO') as String,
      checkinLat: (json['checkin_lat'] as num?)?.toDouble(),
      checkinLon: (json['checkin_lon'] as num?)?.toDouble(),
      checkinAccuracy: (json['checkin_accuracy'] as num?)?.toDouble(),
      distanciaCliente: (json['distancia_inicio_m'] as num?)?.toDouble(),
      dentroGeocerca:
          json['dentro_geocerca'] == true || json['dentro_geocerca'] == 1,
      checkinTimestamp: json['checkin_fecha'] as String?,
      checkoutLat: (json['checkout_lat'] as num?)?.toDouble(),
      checkoutLon: (json['checkout_lon'] as num?)?.toDouble(),
      checkoutAccuracy: (json['checkout_accuracy'] as num?)?.toDouble(),
      checkoutTimestamp: json['checkout_fecha'] as String?,
      observacion: json['observacion'] as String?,
      fotoPath: json['foto_path'] as String?,
      duracionMin: json['duracion_min'] as int?,
      sincronizado: true,
    );
  }

  Map<String, dynamic> toCheckinJson() => {
        'cliente_id': clienteId,
        'lat': checkinLat,
        'lon': checkinLon,
        'accuracy': checkinAccuracy,
        'offline_id': offlineId,
        'timestamp': checkinTimestamp,
      };

  Map<String, dynamic> toCheckoutJson() => {
        'visita_id': id,
        'lat': checkoutLat,
        'lon': checkoutLon,
        'accuracy': checkoutAccuracy,
        'observacion': observacion,
        if (fotoPath != null) 'foto_path': fotoPath,
        'timestamp': checkoutTimestamp,
      };

  Map<String, dynamic> toCheckinDb() => {
        'offline_id': offlineId,
        'cliente_id': clienteId,
        'cliente_nombre': clienteNombre,
        'lat': checkinLat,
        'lon': checkinLon,
        'accuracy': checkinAccuracy,
        'distancia_cliente': distanciaCliente,
        'dentro_geocerca': (dentroGeocerca ?? false) ? 1 : 0,
        'timestamp': checkinTimestamp,
        'sincronizado': sincronizado ? 1 : 0,
      };

  Map<String, dynamic> toCheckoutDb() => {
        'visita_id': id,
        'offline_checkin_id': offlineId,
        'lat': checkoutLat,
        'lon': checkoutLon,
        'accuracy': checkoutAccuracy,
        'observacion': observacion,
        'foto_path': fotoPath,
        'timestamp': checkoutTimestamp,
        'sincronizado': sincronizado ? 1 : 0,
      };
}
