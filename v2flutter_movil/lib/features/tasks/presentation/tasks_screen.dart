import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../domain/task_item.dart';
import 'task_controller.dart';
import 'quick_create_task_sheet.dart';
import '../../home/presentation/home_shell.dart';
import '../../../core/theme/app_theme.dart';
import 'task_detail_sheet.dart';
// import '../../common/presentation/user_search_sheet.dart'; // Future use

class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TaskController>().loadTasks();
    });
  }

  void _openCreateTask(BuildContext context) {
    QuickCreateTaskSheet.show(context, onCreated: () {
      context.read<TaskController>().loadTasks();
    });
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<TaskController>();
    final items = controller.visibleTasks;
    final total = controller.tasks.length;
    final pending = controller.pendingCount;
    final completed = total - pending;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: const MomentusAppBar(
        title: 'Mis Tareas',
        subtitle: 'Gestión y seguimiento',
        actions: [
          // IconButton not const due to controller.loadTasks
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openCreateTask(context),
        backgroundColor: MomentusTheme.primary,
        child: const Icon(CupertinoIcons.add, color: Colors.white),
      ),
      body: Column(
        children: [
          // KPI Header
          _KpiHeader(
            total: total,
            pending: pending,
            completed: completed,
            unsynced: controller.unsyncedCount,
          ),

          // Search & Filter
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              children: [
                TextField(
                  onChanged: controller.setQuery,
                  style: const TextStyle(fontFamily: 'Inter'),
                  decoration: InputDecoration(
                    prefixIcon: const Icon(CupertinoIcons.search,
                        color: Color(0xFF94A3B8), size: 20),
                    hintText: 'Buscar tarea...',
                    hintStyle: const TextStyle(
                        fontFamily: 'Inter', color: Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: const Color(0xFFF1F5F9),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        vertical: 12, horizontal: 16),
                  ),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _FilterChip(
                        label: 'Todas',
                        selected: controller.filter == TaskFilter.all,
                        onTap: () => controller.setFilter(TaskFilter.all),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'Pendientes',
                        selected: controller.filter == TaskFilter.pending,
                        onTap: () => controller.setFilter(TaskFilter.pending),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'Completadas',
                        selected: controller.filter == TaskFilter.completed,
                        onTap: () => controller.setFilter(TaskFilter.completed),
                      ),
                      const SizedBox(width: 8),
                      _FilterChip(
                        label: 'Sin Sync',
                        selected: controller.filter == TaskFilter.unsynced,
                        onTap: () => controller.setFilter(TaskFilter.unsynced),
                        isWarning: true,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Task List
          Expanded(
            child: controller.loading
                ? const _SkeletonList()
                : items.isEmpty
                    ? _EmptyState(filter: controller.filter)
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, index) {
                          final task = items[index];
                          return _TaskItem(
                            task: task,
                            onToggle: () => controller.markDone(task),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}

class _KpiHeader extends StatelessWidget {
  final int total;
  final int pending;
  final int completed;
  final int unsynced;

  const _KpiHeader({
    required this.total,
    required this.pending,
    required this.completed,
    required this.unsynced,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      child: Row(
        children: [
          Expanded(
            child: _KpiCard(
              label: 'Pendientes',
              value: '$pending',
              icon: CupertinoIcons.clock,
              color: const Color(0xFFF59E0B),
              bgColor: const Color(0xFFFFFBEB),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _KpiCard(
              label: 'Completadas',
              value: '$completed',
              icon: CupertinoIcons.check_mark_circled,
              color: const Color(0xFF10B981),
              bgColor: const Color(0xFFECFDF5),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _KpiCard(
              label: 'Total',
              value: '$total',
              icon: CupertinoIcons.layers_alt,
              color: const Color(0xFF64748B),
              bgColor: const Color(0xFFF1F5F9),
            ),
          ),
        ],
      ),
    );
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
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              const Spacer(),
              Text(
                value,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color.withValues(alpha: 0.8),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final bool isWarning;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.isWarning = false,
  });

  @override
  Widget build(BuildContext context) {
    final activeColor = isWarning
        ? const Color(0xFFEF4444)
        : const Color(0xFF0F172A); // Slate 900
    final activeBg =
        isWarning ? const Color(0xFFFEF2F2) : const Color(0xFF0F172A);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? activeBg : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected ? activeColor : const Color(0xFFE2E8F0),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            color: selected
                ? (isWarning ? activeColor : Colors.white)
                : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }
}

class _TaskItem extends StatefulWidget {
  final dynamic task; // TaskItem
  final Future<void> Function() onToggle;

  const _TaskItem({required this.task, required this.onToggle});

  @override
  State<_TaskItem> createState() => _TaskItemState();
}

class _TaskItemState extends State<_TaskItem> {
  bool _isLoading = false;

  Future<void> _handleToggle() async {
    if (_isLoading) return;
    setState(() => _isLoading = true);

    try {
      // Feedback táctil
      HapticFeedback.lightImpact();
      await widget.onToggle();
      // Si éxito, el padre reconstruirá este widget (desaparece o cambia estado)
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al actualizar: $e'),
            backgroundColor: MomentusTheme.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final task = widget.task;
    final bool isDone = task.estado == 'completada' || task.estado == 'Hecha';
    final bool isSynced = task.synced;
    final bool isHighPriority =
        (task.prioridad as String).toLowerCase() == 'alta';

    String? fechaFmt;
    if (task.fechaObjetivo != null) {
      final fo = task.fechaObjetivo!;
      // FIX CRASH: Manual format
      fechaFmt =
          "${fo.day.toString().padLeft(2, '0')}/${fo.month.toString().padLeft(2, '0')}";
    }

    // Colores según prioridad / estado
    final borderColor = isDone
        ? const Color(0xFFE2E8F0)
        : (isHighPriority ? const Color(0xFFFECACA) : const Color(0xFFE2E8F0));
    final bgColor = isDone
        ? const Color(0xFFF8FAFC)
        : (isHighPriority ? const Color(0xFFFEF2F2) : Colors.white);

    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDone
            ? []
            : [
                BoxShadow(
                  color: const Color(0xFF0F172A).withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
        border: Border.all(color: borderColor),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: () {
            TaskDetailSheet.show(
              context,
              (task as TaskItem).toMap().cast<String, dynamic>(),
              onUpdated: () => context.read<TaskController>().loadTasks(),
            );
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── CHECKBOX CON LOADING ──
                InkWell(
                  onTap: isDone ? null : _handleToggle,
                  borderRadius: BorderRadius.circular(12),
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: _isLoading
                        ? const Padding(
                            padding: EdgeInsets.all(2.0),
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: MomentusTheme.primary,
                            ),
                          )
                        : Container(
                            decoration: BoxDecoration(
                              color: isDone
                                  ? const Color(0xFF10B981)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: isDone
                                    ? const Color(0xFF10B981)
                                    : (isHighPriority
                                        ? const Color(0xFFEF4444)
                                        : const Color(0xFFCBD5E1)),
                                width: 2,
                              ),
                            ),
                            child: isDone
                                ? const Icon(Icons.check,
                                    size: 16, color: Colors.white)
                                : null,
                          ),
                  ),
                ),
                const SizedBox(width: 16),

                // ── CONTENT ──
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              task.titulo,
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize: 15,
                                fontWeight: isHighPriority && !isDone
                                    ? FontWeight.w700
                                    : FontWeight.w600,
                                color: isDone
                                    ? const Color(0xFF94A3B8)
                                    : const Color(0xFF1E293B),
                                decoration:
                                    isDone ? TextDecoration.lineThrough : null,
                              ),
                            ),
                          ),
                          // Alerta visual de prioridad alta
                          if (isHighPriority && !isDone)
                            const Padding(
                              padding: EdgeInsets.only(left: 8),
                              child: Icon(
                                CupertinoIcons.exclamationmark_circle_fill,
                                size: 16,
                                color: Color(0xFFEF4444),
                              ),
                            )
                        ],
                      ),
                      if (task.descripcion.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Text(
                          task.descripcion,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: 'Inter',
                            fontSize: 13,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                      const SizedBox(height: 8),
                      // Meta Row
                      Row(
                        children: [
                          _PriorityBadge(priority: task.prioridad),
                          if (fechaFmt != null) ...[
                            const SizedBox(width: 8),
                            Row(children: [
                              const Icon(CupertinoIcons.calendar,
                                  size: 12, color: Color(0xFF94A3B8)),
                              const SizedBox(width: 4),
                              Text(fechaFmt,
                                  style: const TextStyle(
                                      fontSize: 11, color: Color(0xFF94A3B8))),
                            ]),
                          ],
                          if (!isSynced) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(4),
                                border:
                                    Border.all(color: const Color(0xFFFECACA)),
                              ),
                              child: const Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.cloud_off,
                                      size: 10, color: Color(0xFFEF4444)),
                                  SizedBox(width: 4),
                                  Text('Sync',
                                      style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFFEF4444))),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PriorityBadge extends StatelessWidget {
  final String priority; // Alta, Media, Baja

  const _PriorityBadge({required this.priority});

  @override
  Widget build(BuildContext context) {
    Color color;
    Color bg;

    switch (priority.toLowerCase()) {
      case 'alta':
        color = const Color(0xFFEF4444);
        bg = const Color(0xFFFEF2F2);
        break;
      case 'baja':
        color = const Color(0xFF10B981);
        bg = const Color(0xFFECFDF5);
        break;
      default: // Media
        color = const Color(0xFFF59E0B);
        bg = const Color(0xFFFFFBEB);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Text(
        priority,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

class _SkeletonList extends StatelessWidget {
  const _SkeletonList();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: 6,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (_, __) => Container(
        height: 80,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 150,
                    height: 14,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: 100,
                    height: 10,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final TaskFilter filter;

  const _EmptyState({required this.filter});

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
            child: Icon(
              filter == TaskFilter.completed
                  ? CupertinoIcons.check_mark_circled
                  : CupertinoIcons.doc_text_search,
              size: 48,
              color: MomentusTheme.slate300,
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'No hay tareas',
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _getMessage(),
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 14,
              color: Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }

  String _getMessage() {
    switch (filter) {
      case TaskFilter.pending:
        return '¡Todo listo! No tienes pendientes.';
      case TaskFilter.completed:
        return 'Aún no has completado tareas.';
      case TaskFilter.unsynced:
        return 'Todas tus tareas están sincronizadas.';
      default:
        return 'Crea una nueva tarea para comenzar.';
    }
  }
}
