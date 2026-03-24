import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

import 'package:flutter/services.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../common/data/offline_resource_service.dart';
import '../../home/presentation/home_shell.dart'; // MomentusAppBar
import 'project_detail_screen.dart';
import 'create_project_sheet.dart';
import 'project_collaborators_sheet.dart';

class ProjectsScreen extends StatefulWidget {
  const ProjectsScreen({super.key});

  @override
  State<ProjectsScreen> createState() => _ProjectsScreenState();
}

class _ProjectsScreenState extends State<ProjectsScreen> {
  static const _cacheKey = 'projects_my';
  static const _offline = OfflineResourceService();

  late Future<OfflineListResult> _future;
  String _searchQuery = '';
  String _statusFilter = 'Todos';

  @override
  void initState() {
    super.initState();
    _fetchProjects();
  }

  void _fetchProjects() {
    setState(() {
      _future = _offline.loadList(
        cacheKey: _cacheKey,
        remote: () async {
          final response = await ApiClient.dio.get('proyectos?limit=2000');
          return unwrapApiList(response.data);
        },
      );
    });
  }

  Future<void> _refresh() async {
    _fetchProjects();
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      // Usamos MomentusAppBar para header consistente y menú de perfil
      appBar: MomentusAppBar(
        title: 'Proyectos',
        subtitle: 'Gestión y seguimiento de proyectos',
        actions: [
          IconButton(
            icon: const Icon(CupertinoIcons.add_circled,
                color: Color(0xFF059669), size: 28),
            onPressed: () {
              HapticFeedback.lightImpact();
              CreateProjectSheet.show(context, onCreated: _fetchProjects);
            },
          ),
        ],
      ),
      body: FutureBuilder<OfflineListResult>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return _buildSkeleton();
          }

          final data = snapshot.data;
          if (data == null) {
            return Center(
              child: ElevatedButton(
                onPressed: _fetchProjects,
                child: const Text('Reintentar'),
              ),
            );
          }

          final allItems = data.items;
          final items = allItems.where((p) {
            // 1. Filter out deleted/cancelled projects
            final estado = (p['estado'] ?? '').toString().toLowerCase();
            if (estado == 'cancelado' ||
                estado == 'eliminado' ||
                estado == 'inactivo') {
              return false;
            }

            // 2. Search Query
            final q = _searchQuery.toLowerCase();
            if (q.isEmpty) return true;

            final nombre =
                (p['nombre'] ?? p['titulo'] ?? '').toString().toLowerCase();
            final desc = (p['descripcion'] ?? '').toString().toLowerCase();
            final area = (p['area'] ?? '').toString().toLowerCase();
            final gerencia = (p['gerencia'] ?? '').toString().toLowerCase();
            final creador = (p['creadorNombre'] ?? '').toString().toLowerCase();
            // estado already lowercase

            return nombre.contains(q) ||
                desc.contains(q) ||
                area.contains(q) ||
                gerencia.contains(q) ||
                creador.contains(q) ||
                estado.contains(q);
          }).where((p) {
            // 3. Status filter
            if (_statusFilter == 'Todos') return true;
            final estado = (p['estado'] ?? '').toString();
            if (_statusFilter == 'En Riesgo') {
              return _isProjectAtRisk(p);
            }
            return estado.toLowerCase() == _statusFilter.toLowerCase();
          }).toList();

          return Column(
            children: [
              if (data.fromCache)
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(vertical: 10, horizontal: 20),
                  color: const Color(0xFFFFF7ED),
                  child: const Row(
                    children: [
                      Icon(Icons.wifi_off_rounded,
                          size: 18, color: Color(0xFFEA580C)),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Trabajando con datos locales (Offline)',
                          style: TextStyle(
                            fontSize: 13,
                            color: Color(0xFF9A3412),
                            fontWeight: FontWeight.w700,
                            fontFamily: 'Inter',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

              // Buscador Premium
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
                child: CupertinoSearchTextField(
                  placeholder: 'Buscar proyectos...',
                  style: const TextStyle(fontFamily: 'Inter', fontSize: 15),
                  onChanged: (value) {
                    setState(() {
                      _searchQuery = value;
                    });
                  },
                ),
              ),

              // Filtros de estado
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: SizedBox(
                  height: 36,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      'Todos',
                      'Activo',
                      'Pausado',
                      'Completado',
                      'En Riesgo'
                    ].map((f) => _buildFilterChip(f)).toList(),
                  ),
                ),
              ),
              const SizedBox(height: 8),

              if (items.isEmpty && _searchQuery.isNotEmpty)
                const Expanded(
                  child: Center(
                    child: Text('No hay coincidencias con la búsqueda',
                        style: TextStyle(
                            color: Color(0xFF94A3B8), fontFamily: 'Inter')),
                  ),
                )
              else if (items.isEmpty)
                const Expanded(child: _ProjectsEmptyState())
              else
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _refresh,
                    color: const Color(0xFF059669),
                    child: ListView.builder(
                      padding: const EdgeInsets.all(20),
                      itemCount: items.length,
                      itemBuilder: (_, i) {
                        final p = (items[i] as Map).cast<String, dynamic>();
                        return _buildProjectCard(p);
                      },
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildProjectCard(Map<String, dynamic> p) {
    final nombre = (p['nombre'] ?? p['titulo'] ?? 'Sin Nombre').toString();
    final desc = (p['descripcion'] ?? 'Sin descripción').toString();
    final estado = (p['estado'] ?? 'ACTIVO').toString().toUpperCase();
    // Robust progress extraction - handle null, string, num
    final avance = _extractProgress(p);

    // Hierarchy
    final area = (p['area'] ?? 'N/A').toString();
    final gerencia = (p['gerencia'] ?? '').toString();
    final subgerencia = (p['subgerencia'] ?? '').toString();

    // Metadata
    final tipo = (p['tipo'] ?? 'General').toString();
    final creador =
        (p['creadorNombre'] ?? p['creadorCarnet'] ?? 'N/A').toString();
    final responsable =
        (p['responsableNombre'] ?? p['responsableCarnet'] ?? 'N/A').toString();

    // Dates Logic
    final start = p['fechaInicio'] != null
        ? DateTime.parse(p['fechaInicio'].toString())
        : null;
    final end =
        p['fechaFin'] != null ? DateTime.parse(p['fechaFin'].toString()) : null;
    double atraso = 0.0;

    // FIX: Replicar lógica exacta de React calculateDelay()
    if (start != null && end != null && avance < 100) {
      // Skip delay for completed/terminated projects
      final estadoLower = estado.toLowerCase();
      final isFinished = estadoLower.contains('termin') ||
          estadoLower.contains('final') ||
          estadoLower.contains('complet') ||
          estadoLower == 'hecha' ||
          estadoLower == 'cerrado';

      if (!isFinished) {
        final now = DateTime.now();
        if (now.isAfter(start)) {
          final totalDuration = end.difference(start).inMilliseconds;
          final elapsed = now.difference(start).inMilliseconds;

          if (totalDuration > 0) {
            // FIX CRÍTICO: Cap expectedProgress at 100% (como React)
            final expectedProgress =
                ((elapsed / totalDuration) * 100).clamp(0.0, 100.0);
            if (expectedProgress > avance) {
              // Cap atraso at 100% max
              atraso = (expectedProgress - avance).clamp(0.0, 100.0);
            }
          } else if (now.isAfter(end)) {
            atraso = (100 - avance).clamp(0.0, 100.0);
          }
        }
      }
    }

    final fechaInicio = start != null ? start.toString().split(' ')[0] : 'N/A';
    final fechaFin = end != null ? end.toString().split(' ')[0] : 'N/A';

    // Status Colors
    Color statusColor = const Color(0xFF10B981); // Emerald
    Color statusBg = const Color(0xFFECFDF5);
    IconData statusIcon = CupertinoIcons.check_mark_circled;

    if (estado == 'CERRADO' || estado == 'TERMINADO' || estado == 'HECHA') {
      statusColor = const Color(0xFF64748B);
      statusBg = const Color(0xFFF1F5F9);
      statusIcon = CupertinoIcons.archivebox;
    } else if (estado == 'DETENIDO' ||
        estado == 'PAUSADO' ||
        estado == 'BLOQUEADA') {
      statusColor = const Color(0xFFEF4444);
      statusBg = const Color(0xFFFEF2F2);
      statusIcon = CupertinoIcons.pause_circle;
    } else if (estado == 'BORRADOR') {
      statusColor = const Color(0xFFF59E0B);
      statusBg = const Color(0xFFFFFBEB);
      statusIcon = CupertinoIcons.pencil_circle;
    } else {
      // Activo / En Curso
      statusIcon = CupertinoIcons.play_circle;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: InkWell(
        onTap: () async {
          HapticFeedback.selectionClick();
          await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => ProjectDetailScreen(project: p)),
          );
          _refresh();
        },
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Icon + Name + Pct
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: statusBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(statusIcon, color: statusColor, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(
                                nombre,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF0F172A),
                                  fontFamily: 'Inter',
                                  height: 1.2,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: statusBg,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                        color:
                                            statusColor.withValues(alpha: 0.2)),
                                  ),
                                  child: Text(
                                    '${avance.round()}%',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                      color: statusColor,
                                      fontFamily: 'Inter',
                                    ),
                                  ),
                                ),
                                if (atraso > 15) ...[
                                  const SizedBox(height: 4),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFEF2F2),
                                      borderRadius: BorderRadius.circular(4),
                                      border: Border.all(
                                          color: const Color(0xFFFCA5A5)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Text(
                                          '⚠️ ',
                                          style: TextStyle(fontSize: 8),
                                        ),
                                        Text(
                                          '${atraso.round()}% atraso',
                                          style: const TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFFDC2626),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ]
                              ],
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              icon: const Icon(Icons.more_vert,
                                  color: Color(0xFF64748B), size: 18),
                              onPressed: () => _showProjectActions(p),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              visualDensity: VisualDensity.compact,
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        // Hierarchy Breadcrumbs
                        if (gerencia.isNotEmpty)
                          Text(
                            subgerencia.isNotEmpty
                                ? '$gerencia > $subgerencia > $area'
                                : '$gerencia > $area',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF64748B),
                              fontFamily: 'Inter',
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          )
                        else
                          Text(
                            area,
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF64748B),
                              fontFamily: 'Inter',
                            ),
                          ),

                        if (p['totalTareas'] != null &&
                            p['totalTareas'] > 0) ...[
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(CupertinoIcons.list_bullet,
                                  size: 10, color: Color(0xFF6366F1)),
                              const SizedBox(width: 4),
                              Text(
                                '${p['tareasCompletadas'] ?? 0} / ${p['totalTareas']} Tareas',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF6366F1),
                                  fontFamily: 'Inter',
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),

              if (desc.isNotEmpty && desc != 'Sin descripción') ...[
                const SizedBox(height: 12),
                Text(
                  desc,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                    fontFamily: 'Inter',
                    height: 1.5,
                  ),
                ),
              ],

              const SizedBox(height: 12),

              // Progress Bar
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: avance / 100,
                  backgroundColor: const Color(0xFFF1F5F9),
                  color: statusColor,
                  minHeight: 6,
                ),
              ),

              const SizedBox(height: 12),

              // Key Value Grid
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFF1F5F9)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: _ProjectMetaCol(
                        label: 'CREADOR',
                        value: creador.split(' ')[0], // First name only usually
                      ),
                    ),
                    Container(
                        width: 1, height: 24, color: const Color(0xFFE2E8F0)),
                    Expanded(
                      child: Padding(
                        padding: const EdgeInsets.only(left: 12),
                        child: _ProjectMetaCol(
                          label: 'RESPONSABLE',
                          value: responsable.split(' ')[0],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 8),

              // Tags & Dates Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      tipo.toUpperCase(),
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF475569),
                        fontFamily: 'Inter',
                      ),
                    ),
                  ),
                  Text(
                    '$fechaInicio - $fechaFin',
                    style: const TextStyle(
                      fontSize: 10,
                      color: Color(0xFF94A3B8),
                      fontFamily: 'Inter',
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSkeleton() {
    Widget box(double w, double h) => Container(
          width: w,
          height: h,
          decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(8)),
        );

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 4,
      itemBuilder: (_, i) => Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFF1F5F9)),
        ),
        child: Column(
          children: [
            Row(children: [
              box(40, 40),
              const SizedBox(width: 12),
              Expanded(child: box(150, 20))
            ]),
            const SizedBox(height: 12),
            box(double.infinity, 40),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label) {
    final isSelected = _statusFilter == label;
    Color chipColor;
    switch (label) {
      case 'Activo':
        chipColor = const Color(0xFF10B981);
        break;
      case 'Pausado':
        chipColor = const Color(0xFFF59E0B);
        break;
      case 'Completado':
        chipColor = const Color(0xFF3B82F6);
        break;
      case 'En Riesgo':
        chipColor = const Color(0xFFEF4444);
        break;
      default:
        chipColor = const Color(0xFF64748B);
    }
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: FilterChip(
        label: Text(label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: isSelected ? Colors.white : chipColor,
            )),
        selected: isSelected,
        onSelected: (_) => setState(() => _statusFilter = label),
        backgroundColor: Colors.white,
        selectedColor: chipColor,
        side:
            BorderSide(color: isSelected ? chipColor : const Color(0xFFE2E8F0)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        showCheckmark: false,
        visualDensity: VisualDensity.compact,
        padding: const EdgeInsets.symmetric(horizontal: 8),
      ),
    );
  }

  bool _isProjectAtRisk(Map<String, dynamic> p) {
    final avance = _extractProgressLocal(p);
    if (avance >= 100) return false;
    // Skip risk for completed/terminated projects
    final estado = (p['estado'] ?? '').toString().toLowerCase();
    if (estado.contains('termin') ||
        estado.contains('final') ||
        estado.contains('complet') ||
        estado == 'cerrado') {
      return false;
    }
    final fechaFinStr =
        p['fechaFin']?.toString() ?? p['fechaObjetivo']?.toString();
    final fechaInicioStr = p['fechaInicio']?.toString();
    if (fechaFinStr == null || fechaInicioStr == null) return false;
    final fechaFin = DateTime.tryParse(fechaFinStr);
    final fechaInicio = DateTime.tryParse(fechaInicioStr);
    if (fechaFin == null || fechaInicio == null) return false;
    final now = DateTime.now();
    final totalDias = fechaFin.difference(fechaInicio).inDays;
    if (totalDias <= 0) return false;
    final diasTranscurridos = now.difference(fechaInicio).inDays;
    final progresoEsperado =
        (diasTranscurridos / totalDias * 100).clamp(0.0, 100.0);
    return (progresoEsperado - avance) > 15;
  }

  double _extractProgressLocal(Map<String, dynamic> p) {
    for (final key in ['avance', 'progreso', 'porcentaje']) {
      final raw = p[key];
      if (raw == null) continue;
      if (raw is num) return raw.toDouble();
      if (raw is String) {
        final parsed = double.tryParse(raw);
        if (parsed != null) return parsed;
      }
    }
    return 0.0;
  }

  void _showProjectActions(Map<String, dynamic> p) {
    final nombre = p['nombre'] ?? p['titulo'] ?? 'Proyecto';

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
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
              child: Text(
                nombre,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Inter',
                  color: Color(0xFF0F172A),
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            _buildActionItem(
              icon: Icons.edit_outlined,
              label: 'Editar Proyecto',
              color: const Color(0xFF64748B),
              onTap: () {
                Navigator.pop(context);
                CreateProjectSheet.show(context,
                    project: p, onCreated: _fetchProjects);
              },
            ),
            _buildActionItem(
              icon: Icons.copy_rounded,
              label: 'Clonar Proyecto',
              color: const Color(0xFF64748B),
              onTap: () {
                Navigator.pop(context);
                _confirmClone(p);
              },
            ),
            _buildActionItem(
              icon: Icons.people_outline_rounded,
              label: 'Ver/Gestionar Colaboradores',
              color: const Color(0xFF64748B),
              onTap: () {
                Navigator.pop(context);
                ProjectCollaboratorsSheet.show(context, project: p);
              },
            ),
            const Divider(height: 1),
            _buildActionItem(
              icon: Icons.delete_outline_rounded,
              label: 'Eliminar Proyecto',
              color: const Color(0xFFEF4444),
              onTap: () {
                Navigator.pop(context);
                _confirmDelete(p);
              },
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _buildActionItem({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon, color: color),
      title: Text(
        label,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: color,
          fontFamily: 'Inter',
        ),
      ),
      onTap: onTap,
    );
  }

  void _confirmClone(Map<String, dynamic> p) {
    final nombre = p['nombre'] ?? p['titulo'] ?? 'Proyecto';
    final ctrl = TextEditingController(text: 'Copia de $nombre');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clonar Proyecto'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
                'Se creará una copia de este proyecto y todas sus tareas.'),
            const SizedBox(height: 16),
            TextField(
              controller: ctrl,
              decoration: const InputDecoration(
                labelText: 'Nombre del nuevo proyecto',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _cloneProject(p['idProyecto'] ?? p['id'], ctrl.text);
            },
            child: const Text('Clonar'),
          ),
        ],
      ),
    );
  }

  Future<void> _cloneProject(int id, String nuevoNombre) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ApiClient.dio
          .post('proyectos/$id/clonar', data: {'nombre': nuevoNombre});
      if (mounted) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Proyecto clonado con éxito'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
      _fetchProjects();
    } catch (e) {
      if (mounted) {
        messenger.showSnackBar(
          SnackBar(
              content: Text('Error al clonar: $e'),
              backgroundColor: Colors.red),
        );
      }
    }
  }

  void _confirmDelete(Map<String, dynamic> p) {
    final id = p['idProyecto'] ?? p['id'];
    final nombre = p['nombre'] ?? p['titulo'] ?? 'Proyecto';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Eliminar Proyecto?',
            style: TextStyle(color: Colors.red)),
        content: Text(
            'Se eliminará "$nombre" y todas sus tareas asociadas. Esta acción no se puede deshacer.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _deleteProject(id);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child:
                const Text('Eliminar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteProject(int id) async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ApiClient.dio.delete('proyectos/$id');
      if (mounted) {
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Proyecto eliminado'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
      _fetchProjects();
    } catch (e) {
      if (mounted) {
        messenger.showSnackBar(
          SnackBar(
              content: Text('Error al eliminar: $e'),
              backgroundColor: Colors.red),
        );
      }
    }
  }
}

/// Extrae el progreso del proyecto de forma robusta.
/// Los SPs devuelven 'porcentaje', React lo mapea a 'progreso',
/// y a veces viene como 'avance'. Cualquiera puede ser null explícito.
double _extractProgress(Map<String, dynamic> p) {
  // Intentar en orden de prioridad
  for (final key in ['avance', 'progreso', 'porcentaje']) {
    final raw = p[key];
    if (raw == null) continue;
    if (raw is num) return raw.toDouble();
    if (raw is String) {
      final parsed = double.tryParse(raw);
      if (parsed != null) return parsed;
    }
  }
  return 0.0;
}

class _ProjectMetaCol extends StatelessWidget {
  final String label;
  final String value;
  const _ProjectMetaCol({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.w800,
            color: Color(0xFF94A3B8),
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: Color(0xFF334155),
          ),
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}

class _ProjectsEmptyState extends StatelessWidget {
  const _ProjectsEmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(CupertinoIcons.folder_open, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          const Text(
            'No tienes proyectos asignados',
            style: TextStyle(
              fontFamily: 'Inter',
              fontWeight: FontWeight.w600,
              fontSize: 16,
              color: Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }
}
