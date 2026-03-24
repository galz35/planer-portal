import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../../common/presentation/user_search_sheet.dart';
import '../../common/domain/empleado.dart';

class ProjectCollaboratorsSheet extends StatefulWidget {
  final Map<String, dynamic> project;
  final VoidCallback? onUpdated;

  const ProjectCollaboratorsSheet({
    super.key,
    required this.project,
    this.onUpdated,
  });

  static Future<void> show(BuildContext context,
      {required Map<String, dynamic> project, VoidCallback? onUpdated}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.8,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) => ProjectCollaboratorsSheet(
          project: project,
          onUpdated: onUpdated,
        ),
      ),
    );
  }

  @override
  State<ProjectCollaboratorsSheet> createState() =>
      _ProjectCollaboratorsSheetState();
}

class _ProjectCollaboratorsSheetState extends State<ProjectCollaboratorsSheet> {
  List<dynamic> _colaboradores = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchColaboradores();
  }

  Future<void> _fetchColaboradores() async {
    try {
      final id = widget.project['idProyecto'] ?? widget.project['id'];
      final res = await ApiClient.dio.get('proyectos/$id/colaboradores');
      if (mounted) {
        setState(() {
          _colaboradores = res.data ?? [];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _addColaborador(int idUsuario) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final id = widget.project['idProyecto'] ?? widget.project['id'];
      await ApiClient.dio.post('proyectos/$id/colaboradores', data: {
        'idUsuario': idUsuario,
        'rolColaboracion': 'Colaborador',
      });
      _fetchColaboradores();
      widget.onUpdated?.call();
    } catch (e) {
      if (mounted) {
        messenger.showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _removeColaborador(int idUsuario) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final id = widget.project['idProyecto'] ?? widget.project['id'];
      await ApiClient.dio.delete('proyectos/$id/colaboradores/$idUsuario');
      _fetchColaboradores();
      widget.onUpdated?.call();
    } catch (e) {
      if (mounted) {
        messenger.showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Colaboradores',
                      style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A)),
                    ),
                    Text(
                      'Personas con acceso al proyecto',
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: () async {
                    final result = await UserSearchSheet.show(context,
                        title: 'Añadir Colaborador');
                    if (result != null && result is Empleado) {
                      _addColaborador(result.idUsuario);
                    }
                  },
                  icon: const Icon(Icons.add_circle_outline,
                      color: Color(0xFF6366F1), size: 28),
                ),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _colaboradores.isEmpty
                    ? const Center(
                        child: Text('No hay colaboradores adicionales'))
                    : ListView.builder(
                        itemCount: _colaboradores.length,
                        itemBuilder: (context, index) {
                          final c = _colaboradores[index];
                          final nombre =
                              c['usuario']?['nombreCompleto'] ?? 'Usuario';
                          final cargo = c['usuario']?['cargo'] ?? 'Colaborador';
                          final idUsr = c['idUsuario'];

                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: const Color(0xFFEDE9FE),
                              child: Text(
                                nombre[0].toUpperCase(),
                                style: const TextStyle(
                                    color: Color(0xFF7C3AED),
                                    fontWeight: FontWeight.bold),
                              ),
                            ),
                            title: Text(nombre,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600, fontSize: 14)),
                            subtitle: Text('$cargo • ${c['rolColaboracion']}',
                                style: const TextStyle(fontSize: 12)),
                            trailing: IconButton(
                              icon: const Icon(Icons.remove_circle_outline,
                                  color: Colors.red, size: 20),
                              onPressed: () => _removeColaborador(idUsr),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
