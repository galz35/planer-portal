class Empleado {
  final int idUsuario;
  final String nombreCompleto;
  final String? carnet;
  final String? cargo;
  final String? area;

  Empleado({
    required this.idUsuario,
    required this.nombreCompleto,
    this.carnet,
    this.cargo,
    this.area,
  });

  factory Empleado.fromJson(Map<String, dynamic> json) {
    return Empleado(
      idUsuario: json['idUsuario'] ?? json['id'] ?? 0,
      nombreCompleto: json['nombreCompleto'] ?? json['nombre'] ?? '',
      carnet: json['carnet'],
      cargo: json['cargo'],
      area: json['area'] ?? json['departamento'],
    );
  }
}
