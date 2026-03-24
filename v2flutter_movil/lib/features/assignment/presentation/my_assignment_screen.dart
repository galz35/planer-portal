import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

import '../../../core/network/api_client.dart';
import '../../common/data/offline_resource_service.dart';
import '../../tasks/presentation/task_detail_sheet.dart';
import '../../../core/theme/app_theme.dart';

/// ============================================
/// MI ASIGNACIÓN - Vista de Tareas Asignadas
/// ============================================
/// Diseño Premium con agrupación por proyecto, KPIs detallados y acciones rápidas.
class MyAssignmentScreen extends StatefulWidget {
  const MyAssignmentScreen({super.key});

  @override
  State<MyAssignmentScreen> createState() => _MyAssignmentScreenState();
}

class _MyAssignmentScreenState extends State<MyAssignmentScreen> {
  static const _cacheKey = 'assignment_my_v2';
  static const _offline = OfflineResourceService();

  late Future<OfflineMapResult> _future;

  // State for expanded projects (Project ID -> boolean)
  final Map<int, bool> _expandedProjects = {};

  @override
  void initState() {
    super.initState();
    _future = _fetchData();
  }

  Future<OfflineMapResult> _fetchData() {
    return _offline.loadMap(
      cacheKey: _cacheKey,
      remote: () async {
        // Matches React endpoint: clarityService.getMiAsignacion('pendientes')
        final response = await ApiClient.dio.get('planning/mi-asignacion',
            queryParameters: {'estado': 'pendientes'});
        final rawData = response.data as Map<String, dynamic>;
        // La API envuelve en { success: true, data: { proyectos, resumen } }
        if (rawData.containsKey('data') &&
            rawData['data'] is Map<String, dynamic>) {
          return rawData['data'] as Map<String, dynamic>;
        }
        return rawData;
      },
    );
  }

  Future<void> _refresh() async {
    final result = await _fetchData();
    if (mounted) {
      setState(() {
        _future = Future.value(result);
        _expandedProjects.clear(); // Reset expansion on refresh
      });
    }
  }

  void _toggleProject(int projectId) {
    setState(() {
      _expandedProjects[projectId] = !(_expandedProjects[projectId] ?? false);
    });
  }

  Future<void> _markDone(Map<String, dynamic> task) async {
    final id = task['idTarea'] ?? task['id'];
    if (id == null) return;

    try {
      await ApiClient.dio.patch('tareas/$id', data: {'estado': 'Hecha'});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text('¡Tarea completada!'),
              ],
            ),
            backgroundColor: Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
          ),
        );
        _refresh(); // Reload data to update UI
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo actualizar la tarea')),
        );
      }
    }
  }

  void _openTaskDetail(Map<String, dynamic> task) {
    // Map backend structure to format expected by TaskDetailSheet if necessary
    // Providing basic map, hoping TaskDetailSheet handles it or we adapt keys
    final taskForSheet = {
      'id': task['idTarea'],
      'titulo': task['titulo'],
      'descripcion':
          task['descripcion'] ?? '', // API might not return desc in summary
      'estado': task['estado'],
      'prioridad': task['prioridad'],
      'progreso': task['progreso'],
      'fechaObjetivo': task['fechaObjetivo'],
      'linkEvidencia': task['linkEvidencia'],
      // Add other fields if available
    };

    TaskDetailSheet.show(
      context,
      taskForSheet,
      onUpdated: _refresh,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded,
              color: Color(0xFF64748B)),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Mi Asignación',
          style: TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w800,
            color: Color(0xFF0F172A),
            fontSize: 18,
          ),
        ),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(CupertinoIcons.refresh, color: Color(0xFF64748B)),
            onPressed: _refresh,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE2E8F0), height: 1),
        ),
      ),
      body: FutureBuilder<OfflineMapResult>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return ListView(
              padding: const EdgeInsets.all(16),
              children: const [
                Row(
                  children: [
                    Expanded(
                        child: ShimmerBox(
                            width: double.infinity, height: 100, radius: 16)),
                    SizedBox(width: 12),
                    Expanded(
                        child: ShimmerBox(
                            width: double.infinity, height: 100, radius: 16)),
                  ],
                ),
                SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                        child: ShimmerBox(
                            width: double.infinity, height: 100, radius: 16)),
                    SizedBox(height: 12),
                    Expanded(
                        child: ShimmerBox(
                            width: double.infinity, height: 100, radius: 16)),
                  ],
                ),
                SizedBox(height: 24),
                ShimmerBox(width: double.infinity, height: 150, radius: 16),
                SizedBox(height: 16),
                ShimmerBox(width: double.infinity, height: 150, radius: 16),
                SizedBox(height: 16),
                ShimmerBox(width: double.infinity, height: 150, radius: 16),
                SizedBox(height: 16),
              ],
            );
          }

          if (snapshot.hasError || !snapshot.hasData) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(CupertinoIcons.wifi_slash,
                      size: 48, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  const Text('No se pudieron cargar las asignaciones'),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () => setState(() => _future = _fetchData()),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }

          final data = snapshot.data!.data;
          final resumen = data['resumen'] ?? {};
          final proyectos = (data['proyectos'] as List?) ?? [];

          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Offline Banner
                if (snapshot.data!.fromCache)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(bottom: 16),
                    padding:
                        const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF7ED),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFFED7AA)),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.cloud_off,
                            size: 16, color: Color(0xFFF97316)),
                        SizedBox(width: 8),
                        Text(
                          'Modo Offline - Datos cacheados',
                          style: TextStyle(
                              fontSize: 12,
                              color: Color(0xFF9A3412),
                              fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),

                // KPIs Dashboard
                _buildKpiSection(resumen),
                const SizedBox(height: 24),

                // Project List
                if (proyectos.isEmpty)
                  _buildEmptyState()
                else
                  ...proyectos.map((p) => _buildProjectCard(p)),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildKpiSection(Map<String, dynamic> resumen) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _KpiCard(
                label: 'Pendientes',
                value: '${resumen['totalTareas'] ?? 0}',
                icon: CupertinoIcons.list_bullet,
                color: const Color(0xFF6366F1), // Indigo
                bgColor: const Color(0xFFEEF2FF),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _KpiCard(
                label: 'Atrasadas',
                value: '${resumen['tareasAtrasadas'] ?? 0}',
                icon: CupertinoIcons.exclamationmark_triangle,
                color: const Color(0xFFE11D48), // Rose
                bgColor: const Color(0xFFFFF1F2),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _KpiCard(
                label: 'Para Hoy',
                value: '${resumen['tareasHoy'] ?? 0}',
                icon: CupertinoIcons.clock,
                color: const Color(0xFFD97706), // Amber
                bgColor: const Color(0xFFFFFBEB),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _KpiCard(
                label: 'Completas',
                value: '${resumen['tareasCompletadas'] ?? 0}',
                icon: CupertinoIcons.check_mark_circled,
                color: const Color(0xFF059669), // Emerald
                bgColor: const Color(0xFFECFDF5),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildProjectCard(Map<String, dynamic> proyecto) {
    final int id = _parseInt(proyecto['idProyecto']) ?? 0;
    final String nombre = proyecto['nombre'] ?? 'Sin Nombre';
    final List tareas = (proyecto['misTareas'] as List?) ?? [];
    final double progreso =
        _parseDouble(proyecto['progresoProyecto']).clamp(0.0, 100.0);
    final bool isExpanded = _expandedProjects[id] ?? false;
    // esAtrasada viene como int (0/1) del SQL, no como bool
    final bool hasAtraso = tareas.any((t) => _isTruthy(t['esAtrasada']));

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: isExpanded ? const Color(0xFFF8FAFC) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
            color: isExpanded
                ? const Color(0xFF6366F1).withValues(alpha: 0.2)
                : const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Project Header
          InkWell(
            onTap: () => _toggleProject(id),
            borderRadius: BorderRadius.vertical(
              top: const Radius.circular(16),
              bottom: isExpanded ? Radius.zero : const Radius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: hasAtraso
                              ? const Color(0xFFFFF1F2)
                              : const Color(0xFFEEF2FF),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          isExpanded
                              ? CupertinoIcons.chevron_down
                              : CupertinoIcons.chevron_right,
                          size: 16,
                          color: hasAtraso
                              ? const Color(0xFFE11D48)
                              : const Color(0xFF6366F1),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              nombre,
                              style: const TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(CupertinoIcons.folder,
                                    size: 12, color: Color(0xFF94A3B8)),
                                const SizedBox(width: 4),
                                Text(
                                  '${tareas.length} TAREAS',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF94A3B8),
                                  ),
                                ),
                                if (hasAtraso) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFFF1F2),
                                      borderRadius: BorderRadius.circular(4),
                                      border: Border.all(
                                          color: const Color(0xFFFECDD3)),
                                    ),
                                    child: const Text(
                                      'ATENCIÓN',
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFFE11D48),
                                      ),
                                    ),
                                  ),
                                ]
                              ],
                            ),
                          ],
                        ),
                      ),
                      // Circular Progress
                      Stack(
                        alignment: Alignment.center,
                        children: [
                          SizedBox(
                            width: 36,
                            height: 36,
                            child: CircularProgressIndicator(
                              value: progreso / 100,
                              strokeWidth: 4,
                              backgroundColor: const Color(0xFFF1F5F9),
                              valueColor: const AlwaysStoppedAnimation<Color>(
                                  Color(0xFF6366F1)),
                            ),
                          ),
                          Text(
                            '${progreso.round()}%',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Task List (Expanded)
          if (isExpanded)
            Container(
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
              ),
              child: Column(
                children: [
                  for (var i = 0; i < tareas.length; i++)
                    _buildTaskItem(tareas[i], i == tareas.length - 1),

                  // Footer Action
                  InkWell(
                    onTap: () {
                      // Navigate to full project details if implemented
                    },
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: const BoxDecoration(
                        color: Color(0xFFF8FAFC),
                        borderRadius:
                            BorderRadius.vertical(bottom: Radius.circular(16)),
                      ),
                      child: const Center(
                        child: Text(
                          'Ver Proyecto Completo →',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF6366F1),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildTaskItem(Map<String, dynamic> task, bool isLast) {
    final String titulo = task['titulo'] ?? 'Sin Título';
    final String estado = task['estado'] ?? 'Pendiente';
    final String prioridad = task['prioridad'] ?? 'Media';
    final String? fechaObjetivo = task['fechaObjetivo']?.toString();
    // esAtrasada viene como int (0/1) del SQL, no como bool
    final bool esAtrasada = _isTruthy(task['esAtrasada']);
    final int diasAtraso = _parseInt(task['diasAtraso']) ?? 0;
    final double progreso = _parseDouble(task['progreso']).clamp(0.0, 100.0);
    final bool isDone =
        estado == 'Hecha' || estado == 'Terminada' || estado == 'Completada';

    // Parse Date
    String dateStr = 'Sin Fecha';
    if (fechaObjetivo != null) {
      try {
        final date = DateTime.parse(fechaObjetivo);
        // FIX CRASH: Manual format
        dateStr =
            "${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}";
      } catch (_) {}
    }

    return Container(
      decoration: BoxDecoration(
        color: esAtrasada
            ? const Color(0xFFFFF1F2).withValues(alpha: 0.3)
            : Colors.white,
        border: Border(
          bottom: BorderSide(
            color: isLast ? Colors.transparent : const Color(0xFFF1F5F9),
          ),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _openTaskDetail(task),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Priority Indicator
                Container(
                  width: 4,
                  height: 40,
                  decoration: BoxDecoration(
                    color: _getPriorityColor(prioridad),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 12),

                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        titulo,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isDone
                              ? const Color(0xFF94A3B8)
                              : const Color(0xFF1E293B),
                          decoration:
                              isDone ? TextDecoration.lineThrough : null,
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Row(
                        children: [
                          // Status Badge
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: _getStatusColor(estado)
                                  .withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              estado.toUpperCase(),
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: _getStatusColor(estado),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Date
                          Icon(CupertinoIcons.calendar,
                              size: 10,
                              color: esAtrasada
                                  ? const Color(0xFFE11D48)
                                  : const Color(0xFF64748B)),
                          const SizedBox(width: 4),
                          Text(
                            dateStr,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: esAtrasada
                                  ? const Color(0xFFE11D48)
                                  : const Color(0xFF64748B),
                            ),
                          ),
                          if (esAtrasada) ...[
                            const SizedBox(width: 8),
                            Text(
                              '$diasAtraso DÍAS ATRASO',
                              style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFFE11D48),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 8),
                      // Progress Bar
                      Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(2),
                              child: LinearProgressIndicator(
                                value: progreso / 100,
                                backgroundColor: const Color(0xFFF1F5F9),
                                color: const Color(0xFF6366F1)
                                    .withValues(alpha: 0.5),
                                minHeight: 4,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '${progreso.round()}%',
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF94A3B8),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Action Button
                if (!isDone)
                  IconButton(
                    onPressed: () => _markDone(task),
                    icon: const Icon(CupertinoIcons.circle,
                        color: Color(0xFFCBD5E1)),
                  )
                else
                  const IconButton(
                    onPressed: null,
                    icon: Icon(CupertinoIcons.check_mark_circled_solid,
                        color: Color(0xFF10B981)),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: Color(0xFFECFDF5),
              shape: BoxShape.circle,
            ),
            child: const Icon(CupertinoIcons.check_mark,
                size: 48, color: Color(0xFF059669)),
          ),
          const SizedBox(height: 24),
          const Text(
            '¡Todo al día!',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'No tienes asignaciones pendientes.',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 15,
              color: Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    final s = status.toLowerCase();
    if (s.contains('hecha') || s.contains('termin')) {
      return const Color(0xFF10B981);
    }
    if (s.contains('curso') || s.contains('ejecucion')) {
      return const Color(0xFF3B82F6);
    }
    if (s.contains('bloq') || s.contains('deten')) {
      return const Color(0xFFEF4444);
    }
    return const Color(0xFFF59E0B);
  }

  Color _getPriorityColor(String priority) {
    switch (priority) {
      case 'Alta':
        return const Color(0xFFEF4444);
      case 'Media':
        return const Color(0xFFF59E0B);
      case 'Baja':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF64748B);
    }
  }

  double _parseDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  int? _parseInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }

  /// Convierte valores truthy del backend (1, true, '1', 'true') a bool.
  /// SQL devuelve 0/1 para campos CASE, no true/false.
  bool _isTruthy(dynamic value) {
    if (value == null) return false;
    if (value is bool) return value;
    if (value is num) return value != 0;
    if (value is String) return value == '1' || value.toLowerCase() == 'true';
    return false;
  }
}

class _KpiCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final Color bgColor;

  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.bgColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: color,
                  fontFamily: 'Inter',
                  height: 1.0,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label.toUpperCase(),
                style: const TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF94A3B8),
                  fontFamily: 'Inter',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
