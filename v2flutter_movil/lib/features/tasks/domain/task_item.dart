class TaskItem {
  final int? id;
  final String titulo;
  final String descripcion;
  final String estado;
  final DateTime fechaCreacion;
  final DateTime? fechaActualizacion;
  final bool synced;

  // New fields
  final String prioridad;
  final String tipo;
  final DateTime? fechaObjetivo;
  final int? responsableId;
  final String? responsableNombre;
  final String? proyectoNombre;

  const TaskItem({
    this.id,
    required this.titulo,
    required this.descripcion,
    required this.estado,
    required this.fechaCreacion,
    this.fechaActualizacion,
    this.synced = false,
    this.prioridad = 'Media',
    this.tipo = 'Administrativa',
    this.fechaObjetivo,
    this.responsableId,
    this.responsableNombre,
    this.proyectoNombre,
  });

  TaskItem copyWith({
    int? id,
    String? titulo,
    String? descripcion,
    String? estado,
    DateTime? fechaCreacion,
    DateTime? fechaActualizacion,
    bool? synced,
    String? prioridad,
    String? tipo,
    DateTime? fechaObjetivo,
    int? responsableId,
    String? responsableNombre,
    String? proyectoNombre,
  }) {
    return TaskItem(
      id: id ?? this.id,
      titulo: titulo ?? this.titulo,
      descripcion: descripcion ?? this.descripcion,
      estado: estado ?? this.estado,
      fechaCreacion: fechaCreacion ?? this.fechaCreacion,
      fechaActualizacion: fechaActualizacion ?? this.fechaActualizacion,
      synced: synced ?? this.synced,
      prioridad: prioridad ?? this.prioridad,
      tipo: tipo ?? this.tipo,
      fechaObjetivo: fechaObjetivo ?? this.fechaObjetivo,
      responsableId: responsableId ?? this.responsableId,
      responsableNombre: responsableNombre ?? this.responsableNombre,
      proyectoNombre: proyectoNombre ?? this.proyectoNombre,
    );
  }

  Map<String, Object?> toMap() {
    return {
      'id': id,
      'titulo': titulo,
      'descripcion': descripcion,
      'estado': estado,
      'fecha_creacion': fechaCreacion.toIso8601String(),
      'fecha_actualizacion': fechaActualizacion?.toIso8601String(),
      'synced': synced ? 1 : 0,
      'prioridad': prioridad,
      'tipo': tipo,
      'fecha_objetivo': fechaObjetivo?.toIso8601String(),
      'responsable_id': responsableId,
      'responsable_nombre': responsableNombre,
      'proyecto_nombre': proyectoNombre,
    };
  }

  factory TaskItem.fromMap(Map<String, Object?> map) {
    return TaskItem(
      id: map['id'] as int?,
      titulo: map['titulo'] as String? ?? 'Sin Título',
      descripcion: map['descripcion'] as String? ?? '',
      estado: map['estado'] as String? ?? 'Pendiente',
      fechaCreacion: map['fecha_creacion'] != null
          ? DateTime.parse(map['fecha_creacion'] as String)
          : DateTime.now(),
      fechaActualizacion: map['fecha_actualizacion'] == null
          ? null
          : DateTime.parse(map['fecha_actualizacion'] as String),
      synced: (map['synced'] as int? ?? 0) == 1,
      prioridad: map['prioridad'] as String? ?? 'Media',
      tipo: map['tipo'] as String? ?? 'Administrativa',
      fechaObjetivo: map['fecha_objetivo'] != null
          ? DateTime.parse(map['fecha_objetivo'] as String)
          : null,
      responsableId: map['responsable_id'] as int?,
      responsableNombre: map['responsable_nombre'] as String?,
      proyectoNombre: map['proyecto_nombre'] as String?,
    );
  }
}
