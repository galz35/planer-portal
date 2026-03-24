class SessionUser {
  final int id;
  final String nombre;
  final String correo;
  final String gerencia;
  final String departamento;

  const SessionUser({
    required this.id,
    required this.nombre,
    required this.correo,
    this.gerencia = '',
    this.departamento = '',
  });
}
