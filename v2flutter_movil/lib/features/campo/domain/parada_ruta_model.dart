/// Parada planificada en la ruta del día.
class ParadaRutaModel {
  final int? id;
  final String fecha;
  final int clienteId;
  final String? clienteNombre;
  final String? clienteDireccion;
  final double? clienteLat;
  final double? clienteLon;
  final int? clienteRadio;
  final int orden;
  final String estado; // PENDIENTE, VISITADO, SALTADO

  const ParadaRutaModel({
    this.id,
    required this.fecha,
    required this.clienteId,
    this.clienteNombre,
    this.clienteDireccion,
    this.clienteLat,
    this.clienteLon,
    this.clienteRadio,
    required this.orden,
    this.estado = 'PENDIENTE',
  });

  bool get pendiente => estado == 'PENDIENTE';
  bool get visitado => estado == 'VISITADO';
  bool get saltado => estado == 'SALTADO';

  ParadaRutaModel copyWith({int? orden, String? estado}) {
    return ParadaRutaModel(
      id: id,
      fecha: fecha,
      clienteId: clienteId,
      clienteNombre: clienteNombre,
      clienteDireccion: clienteDireccion,
      clienteLat: clienteLat,
      clienteLon: clienteLon,
      clienteRadio: clienteRadio,
      orden: orden ?? this.orden,
      estado: estado ?? this.estado,
    );
  }

  Map<String, dynamic> toDbMap() => {
        'fecha': fecha,
        'cliente_id': clienteId,
        'cliente_nombre': clienteNombre,
        'orden': orden,
        'estado': estado,
      };

  factory ParadaRutaModel.fromDb(Map<String, dynamic> row) {
    return ParadaRutaModel(
      id: row['id'] as int?,
      fecha: row['fecha'] as String,
      clienteId: row['cliente_id'] as int,
      clienteNombre: row['cliente_nombre'] as String?,
      clienteDireccion: row['direccion'] as String?,
      clienteLat: (row['lat'] as num?)?.toDouble(),
      clienteLon: (row['lon'] as num?)?.toDouble(),
      clienteRadio: row['radio_metros'] as int?,
      orden: (row['orden'] ?? 0) as int,
      estado: (row['estado'] ?? 'PENDIENTE') as String,
    );
  }
}
