import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_utils.dart';
import '../../common/data/offline_resource_service.dart';
import '../../home/presentation/home_shell.dart'; // MomentusAppBar
import '../../tasks/presentation/task_detail_sheet.dart';
import '../../../core/theme/app_theme.dart';

class PendingScreen extends StatefulWidget {
  const PendingScreen({super.key});

  @override
  State<PendingScreen> createState() => _PendingScreenState();
}

class _PendingScreenState extends State<PendingScreen> {
  static const _cacheKey = 'pending_my';
  static const _offline = OfflineResourceService();

  late Future<OfflineListResult> _future;
  String _filterDate = 'Todas';
  String _query = '';

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<OfflineListResult> _load() {
    return _offline.loadList(
      cacheKey: _cacheKey,
      remote: () async {
        final response = await ApiClient.dio
            .get('tareas/mias', queryParameters: {'estado': 'Pendiente'});
        return unwrapApiList(response.data);
      },
    );
  }

  Future<void> _refresh() async {
    final result = await _load();
    if (mounted) {
      setState(() => _future = Future.value(result));
    }
  }

  List<Map<String, dynamic>> _filter(List<dynamic> items) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final weekEnd = today.add(const Duration(days: 7));

    return items.map((e) => (e as Map).cast<String, dynamic>()).where((task) {
      if (_query.isNotEmpty) {
        final titulo = (task['titulo'] ?? '').toString().toLowerCase();
        final desc = (task['descripcion'] ?? '').toString().toLowerCase();
        if (!titulo.contains(_query.toLowerCase()) &&
            !desc.contains(_query.toLowerCase())) {
          return false;
        }
      }

      if (_filterDate == 'Todas') return true;

      final fechaStr =
          (task['fechaVencimiento'] ?? task['fecha_vencimiento'] ?? '')
              .toString();
      if (fechaStr.isEmpty) return _filterDate == 'Todas';

      final fecha = DateTime.tryParse(fechaStr);
      if (fecha == null) return false;

      final fechaDate = DateTime(fecha.year, fecha.month, fecha.day);

      if (_filterDate == 'Hoy') {
        return fechaDate.isAtSameMomentAs(today);
      } else if (_filterDate == 'Esta semana') {
        return fechaDate.isAfter(today.subtract(const Duration(days: 1))) &&
            fechaDate.isBefore(weekEnd);
      } else if (_filterDate == 'Atrasadas') {
        return fechaDate.isBefore(today);
      }

      return true;
    }).toList();
  }

  Future<void> _markDone(Map<String, dynamic> task) async {
    final id = task['idTarea'] ?? task['id'];
    if (id == null) return;

    final previousFuture = _future;
    setState(() {
      _future = _future.then((data) {
        final newItems = List<dynamic>.from(data.items)
          ..removeWhere((t) => (t['idTarea'] ?? t['id']) == id);
        return OfflineListResult(items: newItems, fromCache: data.fromCache);
      });
    });

    try {
      await ApiClient.dio.patch('tareas/$id', data: {'estado': 'Hecha'});
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text('Tarea completada'),
              ],
            ),
            backgroundColor: MomentusTheme.slate900,
            behavior: SnackBarBehavior.floating,
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (_) {
      setState(() => _future = previousFuture);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No se pudo actualizar la tarea')),
        );
      }
    }
  }

  void _openTaskDetail(Map<String, dynamic> task) {
    TaskDetailSheet.show(
      context,
      task,
      onUpdated: _refresh,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      // Usamos MomentusAppBar para header consistente y menú de perfil
      appBar: const MomentusAppBar(
        title: 'Mis Pendientes',
        subtitle: 'Gestión personal de tareas',
      ),
      body: FutureBuilder<OfflineListResult>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return _buildSkeleton();
          }

          final data = snapshot.data;

          if (data == null && snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          if (data == null) {
            return const Center(child: CircularProgressIndicator());
          }

          final pending = _filter(data.items);

          return Column(
            children: [
              Container(
                color: Colors.white,
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: Column(
                  children: [
                    TextField(
                      onChanged: (v) => setState(() => _query = v),
                      style: const TextStyle(fontFamily: 'Inter'),
                      decoration: InputDecoration(
                        hintText: 'Buscar tarea...',
                        hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
                        prefixIcon: const Icon(CupertinoIcons.search,
                            color: Color(0xFF94A3B8), size: 20),
                        filled: true,
                        fillColor: const Color(0xFFF1F5F9),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: [
                          _buildFilterChip('Todas'),
                          const SizedBox(width: 8),
                          _buildFilterChip('Hoy'),
                          const SizedBox(width: 8),
                          _buildFilterChip('Esta semana'),
                          const SizedBox(width: 8),
                          _buildFilterChip('Atrasadas'),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 1),
              Expanded(
                child: pending.isEmpty
                    ? const _PendingEmptyState()
                    : RefreshIndicator(
                        onRefresh: _refresh,
                        color: MomentusTheme.primary,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: pending.length,
                          itemBuilder: (_, i) => _buildTaskItem(pending[i]),
                        ),
                      ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildFilterChip(String label) {
    final isSelected = _filterDate == label;
    return InkWell(
      onTap: () => setState(() => _filterDate = label),
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color:
                isSelected ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  Widget _buildTaskItem(Map<String, dynamic> item) {
    final titulo = (item['titulo'] ?? 'Sin título').toString();
    final proyecto = item['proyecto']?['nombre'] ?? item['nombreProyecto'];
    final prioridad = (item['prioridad'] ?? '').toString().toLowerCase();
    final fechaRaw =
        (item['fechaVencimiento'] ?? item['fecha_vencimiento'] ?? '')
            .toString();
    String? fechaFmt;
    bool isOverdue = false;

    if (fechaRaw.isNotEmpty) {
      final date = DateTime.tryParse(fechaRaw);
      if (date != null) {
        fechaFmt = '${date.day}/${date.month}';
        final today = DateTime.now();
        isOverdue = date.isBefore(DateTime(today.year, today.month, today.day));
      }
    }

    // Color accent based on priority/overdue
    Color accentColor;
    if (isOverdue) {
      accentColor = const Color(0xFFEF4444); // Red for overdue
    } else if (prioridad == 'alta') {
      accentColor = const Color(0xFFF59E0B); // Amber for high priority
    } else if (prioridad == 'media') {
      accentColor = const Color(0xFF3B82F6); // Blue for medium
    } else {
      accentColor = const Color(0xFF10B981); // Emerald for normal/low
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: IntrinsicHeight(
          child: Row(
            children: [
              // Colored accent strip
              Container(
                width: 4,
                decoration: BoxDecoration(
                  color: accentColor,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    bottomLeft: Radius.circular(16),
                  ),
                ),
              ),
              Expanded(
                child: InkWell(
                  onTap: () => _openTaskDetail(item),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 24,
                          height: 24,
                          child: Checkbox(
                            value: false,
                            onChanged: (_) => _markDone(item),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(6)),
                            fillColor:
                                WidgetStateProperty.resolveWith((states) {
                              if (states.contains(WidgetState.selected)) {
                                return MomentusTheme.primary;
                              }
                              return Colors.transparent;
                            }),
                            side: BorderSide(
                                color: accentColor.withValues(alpha: 0.5),
                                width: 2),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                titulo,
                                style: const TextStyle(
                                  fontFamily: 'Inter',
                                  fontSize: 15,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF1E293B),
                                ),
                              ),
                              if (proyecto != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  proyecto.toString(),
                                  style: const TextStyle(
                                    fontFamily: 'Inter',
                                    fontSize: 12,
                                    color: Color(0xFF64748B),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                              if (fechaFmt != null) ...[
                                const SizedBox(height: 6),
                                Row(
                                  children: [
                                    Icon(CupertinoIcons.calendar,
                                        size: 12,
                                        color: isOverdue
                                            ? const Color(0xFFEF4444)
                                            : const Color(0xFF94A3B8)),
                                    const SizedBox(width: 4),
                                    Text(
                                      fechaFmt,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isOverdue
                                            ? const Color(0xFFEF4444)
                                            : const Color(0xFF94A3B8),
                                        fontWeight: isOverdue
                                            ? FontWeight.w700
                                            : FontWeight.w400,
                                      ),
                                    ),
                                    if (isOverdue) ...[
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 6, vertical: 1),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFEF2F2),
                                          borderRadius:
                                              BorderRadius.circular(4),
                                        ),
                                        child: const Text(
                                          'ATRASADA',
                                          style: TextStyle(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFFDC2626),
                                            letterSpacing: 0.5,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ],
                            ],
                          ),
                        ),
                        const Icon(CupertinoIcons.chevron_right,
                            size: 16, color: Color(0xFFCBD5E1)),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSkeleton() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: const [
        ShimmerBox(width: double.infinity, height: 50, radius: 12),
        SizedBox(height: 16),
        ShimmerBox(width: double.infinity, height: 40, radius: 20),
        SizedBox(height: 24),
        _SkeletonItem(),
        _SkeletonItem(),
        _SkeletonItem(),
        _SkeletonItem(),
        _SkeletonItem(),
      ],
    );
  }
}

class _PendingEmptyState extends StatelessWidget {
  const _PendingEmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: const BoxDecoration(
              color: MomentusTheme.slate50,
              shape: BoxShape.circle,
            ),
            child: const Icon(CupertinoIcons.check_mark,
                size: 48, color: MomentusTheme.slate300),
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
            'No hay tareas pendientes en este filtro.',
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
}

class _SkeletonItem extends StatelessWidget {
  const _SkeletonItem();

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: const Row(children: [
        ShimmerBox(width: 24, height: 24, radius: 6),
        SizedBox(width: 16),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          ShimmerBox(width: 180, height: 16),
          SizedBox(height: 8),
          ShimmerBox(width: 100, height: 12),
        ]))
      ]),
    );
  }
}
