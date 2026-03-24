/// Modelo de cliente georreferenciado para visitas en campo.
class ClienteModel {
  final int id;
  final String? codigo;
  final String nombre;
  final String? direccion;
  final String? telefono;
  final String? contacto;
  final double lat;
  final double lon;
  final int radioMetros;
  final String? zona;
  final String? ultimaVisita;
  final bool sincronizado;

  const ClienteModel({
    required this.id,
    this.codigo,
    required this.nombre,
    this.direccion,
    this.telefono,
    this.contacto,
    required this.lat,
    required this.lon,
    this.radioMetros = 100,
    this.zona,
    this.ultimaVisita,
    this.sincronizado = true,
  });

  factory ClienteModel.fromJson(Map<String, dynamic> json) {
    return ClienteModel(
      id: json['id'] as int,
      codigo: json['codigo'] as String?,
      nombre: (json['nombre'] ?? '') as String,
      direccion: json['direccion'] as String?,
      telefono: json['telefono'] as String?,
      contacto: json['contacto'] as String?,
      lat: (json['lat'] as num).toDouble(),
      lon: (json['lon'] as num).toDouble(),
      radioMetros: (json['radio_metros'] ?? 100) as int,
      zona: json['zona'] as String?,
      ultimaVisita: json['ultima_visita'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'codigo': codigo,
        'nombre': nombre,
        'direccion': direccion,
        'telefono': telefono,
        'contacto': contacto,
        'lat': lat,
        'lon': lon,
        'radio_metros': radioMetros,
        'zona': zona,
      };

  Map<String, dynamic> toDbMap() => {
        'id': id,
        'codigo': codigo,
        'nombre': nombre,
        'direccion': direccion,
        'telefono': telefono,
        'contacto': contacto,
        'lat': lat,
        'lon': lon,
        'radio_metros': radioMetros,
        'zona': zona,
        'ultima_visita': ultimaVisita,
        'sincronizado': sincronizado ? 1 : 0,
      };

  factory ClienteModel.fromDb(Map<String, dynamic> row) {
    return ClienteModel(
      id: row['id'] as int,
      codigo: row['codigo'] as String?,
      nombre: (row['nombre'] ?? '') as String,
      direccion: row['direccion'] as String?,
      telefono: row['telefono'] as String?,
      contacto: row['contacto'] as String?,
      lat: (row['lat'] as num).toDouble(),
      lon: (row['lon'] as num).toDouble(),
      radioMetros: (row['radio_metros'] ?? 100) as int,
      zona: row['zona'] as String?,
      ultimaVisita: row['ultima_visita'] as String?,
      sincronizado: (row['sincronizado'] ?? 1) == 1,
    );
  }
}
