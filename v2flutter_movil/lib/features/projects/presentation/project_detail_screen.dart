import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'package:provider/provider.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../common/data/offline_resource_service.dart';

import 'create_project_sheet.dart';
import '../../tasks/presentation/task_detail_sheet.dart';
import '../../tasks/presentation/quick_create_task_sheet.dart';
import 'project_gantt_view.dart';

class ProjectDetailScreen extends StatefulWidget {
  final Map<String, dynamic> project;

  const ProjectDetailScreen({super.key, required this.project});

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen> {
  final _offlineService = const OfflineResourceService();
  @override
  void initState() {
    super.initState();
    _fetchTasks();
  }

  // Estado de Filtros
  String _filterStatus = 'Todas';
  List<dynamic> _allTasks = [];
  List<dynamic> _filteredTasks = [];
  bool _showGantt = false;

  Future<OfflineListResult> _fetchTasks() async {
    final id = widget.project['idProyecto'] ?? widget.project['id'];
    final cacheKey = 'project_tasks_$id';

    final result = await _offlineService.loadList(
      cacheKey: cacheKey,
      remote: () async {
        final response = await ApiClient.dio.get('proyectos/$id/tareas');
        return unwrapApiList(response.data);
      },
    );

    // Guardar referencia local para filtrado
    if (mounted) {
      setState(() {
        _allTasks = result.items;
        _applyFilter();
      });
    }

    return result;
  }

  void _applyFilter() {
    setState(() {
      if (_filterStatus == 'Todas') {
        _filteredTasks = List.from(_allTasks);
      } else if (_filterStatus == 'Atrasadas') {
        final now = DateTime.now();
        _filteredTasks = _allTasks.where((t) {
          final fin = DateTime.tryParse(t['fechaFin']?.toString() ?? '');
          return fin != null && fin.isBefore(now) && t['estado'] != 'Hecha';
        }).toList();
      } else if (_filterStatus == 'En Curso') {
        _filteredTasks = _allTasks
            .where(
                (t) => t['estado'].toString().toLowerCase().contains('curso'))
            .toList();
      } else if (_filterStatus == 'Mis Tareas') {
        final currentUser = context.read<AuthController>().user;
        if (currentUser != null) {
          final myIdStr = currentUser.id.toString();

          _filteredTasks = _allTasks.where((t) {
            // Intento 1: Filtrar por ID de Usuario (Más robusto)
            final assignedId =
                t['usuarioId']?.toString() ?? t['asignadoId']?.toString();
            if (assignedId != null &&
                assignedId != 'null' &&
                assignedId.isNotEmpty) {
              return assignedId == myIdStr;
            }

            // Intento 2: Filtrar por Nombre (Fallback si la API no manda ID)
            final assignedName = t['asignadoNombre']?.toString() ?? '';
            return assignedName
                .toLowerCase()
                .contains(currentUser.nombre.toLowerCase());
          }).toList();
        } else {
          _filteredTasks = [];
        }
      }
    });
  }

  Future<void> _refresh() async {
    final result = await _fetchTasks();
    setState(() {
      _allTasks = result.items;
      _applyFilter();
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.project;
    // Robust progress extraction - handles null, string, num
    final avance = _extractProgress(p);
    final area = p['area'] ?? 'Tecnología'; // Placeholder si no viene
    final responsable = p['responsable'] ?? 'Sin asignar';
    final creador = p['creador'] ?? 'Admin';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(p['nombre'] ?? 'Detalle de Proyecto',
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        centerTitle: false,
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(CupertinoIcons.back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Colors.black),
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            onSelected: (value) {
              if (value == 'edit') {
                CreateProjectSheet.show(
                  context,
                  project: widget.project,
                  onCreated: () => _refresh(),
                );
              } else if (value == 'share') {
                // Compartir
              } else if (value == 'delete') {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text(
                          'No tienes permisos para eliminar este proyecto'),
                      backgroundColor: MomentusTheme.slate900),
                );
              }
            },
            itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
              const PopupMenuItem<String>(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(Icons.edit_outlined, color: MomentusTheme.slate700),
                    SizedBox(width: 12),
                    Text('Editar Proyecto',
                        style: TextStyle(fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              const PopupMenuItem<String>(
                value: 'share',
                child: Row(
                  children: [
                    Icon(Icons.share_outlined, color: MomentusTheme.slate700),
                    SizedBox(width: 12),
                    Text('Compartir',
                        style: TextStyle(fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem<String>(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete_outline, color: MomentusTheme.error),
                    SizedBox(width: 12),
                    Text('Eliminar',
                        style: TextStyle(
                            color: MomentusTheme.error,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. KPI Dashboard Card
              _buildProjectDashboard(p, avance, area, responsable, creador),

              const SizedBox(height: 24),

              // 2. Filtros de Tareas
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    // Toggle List/Gantt
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: MomentusTheme.slate200),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _viewToggle(Icons.list, !_showGantt,
                              () => setState(() => _showGantt = false)),
                          Container(
                              width: 1,
                              height: 24,
                              color: MomentusTheme.slate200),
                          _viewToggle(Icons.date_range, _showGantt,
                              () => setState(() => _showGantt = true)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),

                    _filterChip('Todas'),
                    const SizedBox(width: 8),
                    _filterChip('En Curso'),
                    const SizedBox(width: 8),
                    _filterChip('Atrasadas'),
                    const SizedBox(width: 8),
                    _filterChip('Mis Tareas'),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // 3. Lista de Tareas
              if (_showGantt)
                ProjectGanttView(
                  tasks: _filteredTasks,
                  onTaskTap: (task) => TaskDetailSheet.show(
                    context,
                    task,
                    onUpdated: _refresh,
                  ),
                )
              else if (_filteredTasks.isEmpty)
                _buildEmptyState()
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _filteredTasks.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (_, i) => _buildTaskCard(_filteredTasks[i]),
                ),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final res = await showModalBottomSheet<bool>(
            context: context,
            isScrollControlled: true,
            backgroundColor: Colors.transparent,
            builder: (ctx) => QuickCreateTaskSheet(
              preSelectedProject: widget.project,
            ),
          );
          if (res == true) _refresh();
        },
        backgroundColor: MomentusTheme.primary,
        icon: const Icon(CupertinoIcons.add),
        label: const Text('Nueva Tarea'),
      ),
    );
  }

  Widget _viewToggle(IconData icon, bool isSelected, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected
              ? MomentusTheme.primary.withValues(alpha: 0.1)
              : Colors.transparent,
        ),
        child: Icon(
          icon,
          size: 24, // Aumentado ligeramente también
          color: isSelected ? MomentusTheme.primary : MomentusTheme.slate400,
        ),
      ),
    );
  }

  Widget _filterChip(String label) {
    final isSelected = _filterStatus == label;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) {
          setState(() {
            _filterStatus = label;
            _applyFilter();
          });
        }
      },
      backgroundColor: Colors.white,
      selectedColor: MomentusTheme.green100,
      labelStyle: TextStyle(
        color: isSelected ? MomentusTheme.primary : MomentusTheme.slate600,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: isSelected ? MomentusTheme.primary : MomentusTheme.slate200,
        ),
      ),
      showCheckmark: false,
    );
  }

  Widget _buildProjectDashboard(Map<String, dynamic> p, double avance,
      String area, String responsable, String creador) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          // Fila Superior: Gráfico + Datos Principales
          Row(
            children: [
              // Gráfico Circular de Progreso
              SizedBox(
                height: 80,
                width: 80,
                child: Stack(
                  children: [
                    PieChart(
                      PieChartData(
                        sectionsSpace: 0,
                        centerSpaceRadius: 30,
                        startDegreeOffset: -90,
                        sections: [
                          PieChartSectionData(
                            value: avance,
                            color: MomentusTheme.primary,
                            radius: 8,
                            showTitle: false,
                          ),
                          PieChartSectionData(
                            value: 100 - avance,
                            color: MomentusTheme.slate100,
                            radius: 8,
                            showTitle: false,
                          ),
                        ],
                      ),
                    ),
                    Center(
                      child: Text(
                        '${avance.toInt()}%',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                          color: MomentusTheme.primary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 20),
              // Datos
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _metaRow(CupertinoIcons.layers_alt, 'Área', area),
                    const SizedBox(height: 8),
                    _metaRow(CupertinoIcons.person_crop_circle, 'Lider',
                        responsable),
                    const SizedBox(height: 8),
                    _metaRow(CupertinoIcons.calendar, 'Entrega',
                        _formatDate(p['fechaFin']?.toString())),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const Divider(height: 1),
          const SizedBox(height: 16),
          // Estadísticas Rápidas
          Row(
            children: [
              Expanded(
                  child: _statItem(
                      'Total', '${_allTasks.length}', Colors.black87)),
              const SizedBox(width: 8),
              Expanded(
                  child: _statItem('Atrasadas', '${_countTasks('atrasadas')}',
                      MomentusTheme.error)),
              const SizedBox(width: 8),
              Expanded(
                  child: _statItem('En Curso', '${_countTasks('curso')}',
                      MomentusTheme.warning)),
              const SizedBox(width: 8),
              Expanded(
                  child: _statItem('Hechas', '${_countTasks('hecha')}',
                      MomentusTheme.success)),
            ],
          ),
        ],
      ),
    );
  }

  int _countTasks(String criteria) {
    if (criteria == 'atrasadas') {
      final now = DateTime.now();
      return _allTasks.where((t) {
        final fin = DateTime.tryParse(t['fechaFin']?.toString() ?? '');
        return fin != null && fin.isBefore(now) && t['estado'] != 'Hecha';
      }).length;
    }
    return _allTasks
        .where((t) => t['estado'].toString().toLowerCase().contains(criteria))
        .length;
  }

  Widget _metaRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 16, color: MomentusTheme.slate400),
        const SizedBox(width: 8),
        Text('$label: ',
            style:
                const TextStyle(fontSize: 12, color: MomentusTheme.slate500)),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: MomentusTheme.slate800),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }

  Widget _statItem(String label, String value, Color color) {
    return Container(
      // width: 80, // REMOVED fixed width
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC), // Slate 50
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)), // Slate 200
      ),
      child: Column(
        children: [
          Text(value,
              style: TextStyle(
                  fontSize: 20, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 4),
          Text(label,
              style:
                  const TextStyle(fontSize: 10, color: MomentusTheme.slate500)),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40),
        child: Column(
          children: [
            Icon(CupertinoIcons.doc_text_search,
                size: 48, color: Colors.grey[300]),
            const SizedBox(height: 12),
            const Text(
              'No se encontraron tareas',
              style: TextStyle(color: MomentusTheme.slate500),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskCard(Map<String, dynamic> task) {
    final titulo = task['titulo']?.toString() ?? 'Sin título';
    final estado = task['estado']?.toString() ?? 'Pendiente';
    String asignado = 'Sin asignar';
    // Priority: responsableNombre (from SP) > asignadoNombre > nombreCompleto > nested objects
    if (task['responsableNombre'] != null &&
        task['responsableNombre'].toString().isNotEmpty) {
      asignado = task['responsableNombre'].toString();
    } else if (task['asignadoNombre'] != null &&
        task['asignadoNombre'].toString().isNotEmpty) {
      asignado = task['asignadoNombre'].toString();
    } else if (task['nombreCompleto'] != null &&
        task['nombreCompleto'].toString().isNotEmpty) {
      asignado = task['nombreCompleto'].toString();
    } else if (task['asignado'] != null) {
      if (task['asignado'] is Map) {
        asignado = task['asignado']['nombre'] ??
            task['asignado']['nombreCompleto'] ??
            'Sin asignar';
      } else {
        asignado = task['asignado'].toString();
      }
    } else if (task['responsable'] != null) {
      if (task['responsable'] is Map) {
        asignado = task['responsable']['nombre'] ??
            task['responsable']['nombreCompleto'] ??
            'Sin asignar';
      } else {
        asignado = task['responsable'].toString();
      }
    } else if (task['usuario'] != null && task['usuario'] is Map) {
      asignado = task['usuario']['nombre'] ??
          task['usuario']['nombreCompleto'] ??
          'Sin asignar';
    }
    final fecha = _formatDate(task['fechaFin']?.toString());
    final isLate = _isLate(task['fechaFin']?.toString(), estado);

    Color statusColor = const Color(0xFF64748B); // Slate 500
    if (estado == 'Hecha' || estado == 'Completada') {
      statusColor = MomentusTheme.success; // Negro
    } else if (estado == 'En Curso') {
      statusColor = MomentusTheme.primary; // Rojo
    } else if (isLate) {
      statusColor = MomentusTheme.error;
    } else {
      statusColor = const Color(0xFFF59E0B); // Warning (Pendiente)
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)), // Slate 200
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () async {
            await TaskDetailSheet.show(context, task, onUpdated: _refresh);
          },
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        estado.toUpperCase(),
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: statusColor,
                            letterSpacing: 0.5),
                      ),
                    ),
                    const Spacer(),
                    if (isLate)
                      const Icon(Icons.warning_amber_rounded,
                          size: 16, color: MomentusTheme.error),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  titulo,
                  style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF0F172A), // Slate 900
                      height: 1.3),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 10,
                      backgroundColor: const Color(0xFFF1F5F9),
                      child: Text(
                        asignado.isNotEmpty ? asignado[0].toUpperCase() : '-',
                        style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF64748B)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        asignado,
                        style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w500),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const Icon(Icons.calendar_today_outlined,
                        size: 14, color: Color(0xFF94A3B8)),
                    const SizedBox(width: 4),
                    Text(
                      fecha,
                      style: const TextStyle(
                          fontSize: 11, color: Color(0xFF64748B)),
                    ),
                  ],
                )
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null || dateStr == '-' || dateStr.isEmpty) return '-';
    try {
      final date = DateTime.parse(dateStr);
      return '${date.day}/${date.month}';
    } catch (_) {
      return '-';
    }
  }

  bool _isLate(String? dateStr, String estado) {
    if (dateStr == null || estado == 'Hecha') return false;
    try {
      final date = DateTime.parse(dateStr);
      return date.isBefore(DateTime.now());
    } catch (_) {
      return false;
    }
  }
}

/// Extrae el progreso del proyecto de forma robusta.
/// Los SPs devuelven 'porcentaje', React lo mapea a 'progreso',
/// y a veces viene como 'avance'. Cualquiera puede ser null explícito.
double _extractProgress(Map<String, dynamic> p) {
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
