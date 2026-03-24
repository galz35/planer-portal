class AgendaResponse {
  final Checkin? checkinHoy;
  final List<Tarea> tareasSugeridas;
  final List<Tarea> backlog;
  final List<Bloqueo> bloqueosActivos;
  final List<Bloqueo> bloqueosMeCulpan;

  AgendaResponse({
    this.checkinHoy,
    required this.tareasSugeridas,
    required this.backlog,
    required this.bloqueosActivos,
    required this.bloqueosMeCulpan,
  });

  factory AgendaResponse.fromJson(Map<String, dynamic> json) {
    return AgendaResponse(
      checkinHoy: json['checkinHoy'] != null
          ? Checkin.fromJson(json['checkinHoy'])
          : null,
      tareasSugeridas: (json['tareasSugeridas'] as List?)
              ?.map((e) => Tarea.fromJson(e))
              .toList() ??
          [],
      backlog:
          (json['backlog'] as List?)?.map((e) => Tarea.fromJson(e)).toList() ??
              [],
      bloqueosActivos: (json['bloqueosActivos'] as List?)
              ?.map((e) => Bloqueo.fromJson(e))
              .toList() ??
          [],
      bloqueosMeCulpan: (json['bloqueosMeCulpan'] as List?)
              ?.map((e) => Bloqueo.fromJson(e))
              .toList() ??
          [],
    );
  }
}

class Checkin {
  final int idCheckin;
  final String fecha;
  final String? entregableTexto;
  final String? nota;
  final String? estadoAnimo;
  final int? energia;
  final List<CheckinTarea> tareas;

  Checkin({
    required this.idCheckin,
    required this.fecha,
    this.entregableTexto,
    this.nota,
    this.estadoAnimo,
    this.energia,
    this.tareas = const [],
  });

  factory Checkin.fromJson(Map<String, dynamic> json) {
    return Checkin(
      idCheckin: json['idCheckin'] ?? 0,
      fecha: json['fecha'] ?? '',
      entregableTexto: json['entregableTexto'],
      nota: json['nota'],
      estadoAnimo: json['estadoAnimo'],
      energia: json['energia'],
      tareas: (json['tareas'] as List?)
              ?.map((e) => CheckinTarea.fromJson(e))
              .toList() ??
          [],
    );
  }
}

class CheckinTarea {
  final String tipo; // 'Entrego' | 'Avanzo' | 'Extra'
  final int idTarea;
  final Tarea? tarea;

  CheckinTarea({
    required this.tipo,
    required this.idTarea,
    this.tarea,
  });

  factory CheckinTarea.fromJson(Map<String, dynamic> json) {
    return CheckinTarea(
      tipo: json['tipo'] ?? 'Extra',
      idTarea: json['idTarea'] ?? 0,
      tarea: json['tarea'] != null ? Tarea.fromJson(json['tarea']) : null,
    );
  }
}

class Tarea {
  final int idTarea;
  final String titulo;
  final String? descripcion;
  final String estado; // Pendiente, EnCurso, Hecha, etc.
  final String prioridad; // Alta, Media, Baja
  final int? idProyecto;
  final String? proyectoNombre;
  final String? fechaObjetivo;
  final int progreso;
  final int orden;
  // Campos de responsable (Bloque A - Punto 2)
  final String? responsableNombre;
  final String? responsableCarnet;
  // Campos de atraso (Bloque A - Punto 3)
  final int diasAtraso;
  final bool esAtrasada;

  Tarea({
    required this.idTarea,
    required this.titulo,
    this.descripcion,
    required this.estado,
    required this.prioridad,
    this.idProyecto,
    this.proyectoNombre,
    this.fechaObjetivo,
    required this.progreso,
    required this.orden,
    this.responsableNombre,
    this.responsableCarnet,
    this.diasAtraso = 0,
    this.esAtrasada = false,
  });

  factory Tarea.fromJson(Map<String, dynamic> json) {
    // Resolver titulo: el backend puede enviar 'titulo' o 'nombre'
    final rawTitulo = json['titulo'] ?? json['nombre'] ?? 'Sin Título';

    return Tarea(
      idTarea: json['idTarea'] ?? 0,
      titulo: rawTitulo is String ? rawTitulo : rawTitulo.toString(),
      descripcion: json['descripcion'],
      estado: (json['estado'] ?? 'Pendiente').toString().trim(),
      prioridad: json['prioridad'] ?? 'Media',
      idProyecto: json['idProyecto'],
      proyectoNombre: json['proyectoNombre'],
      fechaObjetivo: json['fechaObjetivo'],
      progreso: json['progreso'] ?? json['porcentaje'] ?? 0,
      orden: json['orden'] ?? 0,
      responsableNombre: json['responsableNombre'],
      responsableCarnet: json['responsableCarnet'],
      diasAtraso: json['diasAtraso'] ?? 0,
      esAtrasada: (json['esAtrasada'] == 1 || json['esAtrasada'] == true),
    );
  }

  /// Convierte a Map para usar con TaskDetailSheet y cache offline
  Map<String, dynamic> toJson() {
    return {
      'idTarea': idTarea,
      'titulo': titulo,
      'descripcion': descripcion,
      'estado': estado,
      'prioridad': prioridad,
      'idProyecto': idProyecto,
      'proyectoNombre': proyectoNombre,
      'fechaObjetivo': fechaObjetivo,
      'fechaVencimiento': fechaObjetivo,
      'progreso': progreso,
      'orden': orden,
      'responsableNombre': responsableNombre,
      'responsableCarnet': responsableCarnet,
      'diasAtraso': diasAtraso,
      'esAtrasada': esAtrasada,
    };
  }
}

class Bloqueo {
  final int idBloqueo;
  final int? idTarea;
  final String motivo;
  final String? destinoTexto;
  final Tarea? tarea;

  Bloqueo({
    required this.idBloqueo,
    this.idTarea,
    required this.motivo,
    this.destinoTexto,
    this.tarea,
  });

  factory Bloqueo.fromJson(Map<String, dynamic> json) {
    return Bloqueo(
      idBloqueo: json['idBloqueo'] ?? 0,
      idTarea: json['idTarea'],
      motivo: json['motivo'] ?? '',
      destinoTexto: json['destinoTexto'],
      tarea: json['tarea'] != null ? Tarea.fromJson(json['tarea']) : null,
    );
  }
}
